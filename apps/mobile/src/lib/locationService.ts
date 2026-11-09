import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { supabase } from './supabase';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracyMeters: number;
  recordedAt: string;
}

export interface TrackingOptions {
  institutionId: string;
  vehicleId: string;
  journeyId: string;
  driverStaffId: string;
  userRole: string;
  onLocationUpdate?: (location: LocationCoordinates) => void;
  onError?: (error: string) => void;
}

export interface TrackingStatus {
  isTracking: boolean;
  activeJourneyId: string | null;
  lastLocation: LocationCoordinates | null;
  error: string | null;
  isBackgroundEnabled: boolean;
}

export const LOCATION_BACKGROUND_TASK_NAME = 'BACKGROUND_DRIVER_GPS_TRACKING';

let locationSubscription: Location.LocationSubscription | null = null;
let activeTrackingOptions: TrackingOptions | null = null;

let currentTrackingState: TrackingStatus = {
  isTracking: false,
  activeJourneyId: null,
  lastLocation: null,
  error: null,
  isBackgroundEnabled: false,
};

/**
 * Validates whether the caller role is authorized to broadcast driver telemetry.
 * Students and guardians are strictly prohibited from broadcasting vehicle locations.
 */
export function isRoleAuthorizedForDriverTracking(role: string): boolean {
  const unauthorizedRoles = ['student', 'parent', 'guardian'];
  if (unauthorizedRoles.includes(role.toLowerCase().trim())) {
    return false;
  }
  // Authorized transport roles include staff, faculty, admin, owner
  return true;
}

/**
 * Internal coordinate processing and RPC transmission helper.
 * Used by both foreground watcher and background TaskManager.
 */
async function processAndTransmitLocationFix(
  location: Location.LocationObject,
  options: TrackingOptions
): Promise<LocationCoordinates | null> {
  const coords = location.coords;

  // Coordinate sanity validation
  if (
    coords.latitude < -90.0 ||
    coords.latitude > 90.0 ||
    coords.longitude < -180.0 ||
    coords.longitude > 180.0
  ) {
    return null;
  }

  const speedKmh = Math.max(0, (coords.speed || 0) * 3.6);
  const heading = coords.heading || 0.0;
  const accuracyMeters = coords.accuracy || 5.0;
  const recordedAt = new Date(location.timestamp).toISOString();

  const locData: LocationCoordinates = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    speedKmh: Number(speedKmh.toFixed(2)),
    heading: Number(heading.toFixed(2)),
    accuracyMeters: Number(accuracyMeters.toFixed(2)),
    recordedAt,
  };

  currentTrackingState.lastLocation = locData;
  options.onLocationUpdate?.(locData);

  // Transmit telemetry to PostgreSQL atomic procedure
  const client = supabase;
  if (client) {
    try {
      await client.rpc('record_vehicle_gps_location_atomic', {
        p_institution_id: options.institutionId,
        p_vehicle_id: options.vehicleId,
        p_journey_id: options.journeyId,
        p_latitude: coords.latitude,
        p_longitude: coords.longitude,
        p_speed_kmh: Number(speedKmh.toFixed(2)),
        p_heading: Number(heading.toFixed(2)),
        p_accuracy_meters: Number(accuracyMeters.toFixed(2)),
        p_battery_level: null,
        p_provider: 'driver_mobile_app',
        p_recorded_at: recordedAt,
      });
    } catch (dbErr: any) {
      console.warn('[LocationService] Failed to transmit location telemetry:', dbErr.message);
    }
  }

  return locData;
}

// Register background location task at module scope
TaskManager.defineTask(LOCATION_BACKGROUND_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.warn('[LocationTaskManager] Background location task error:', error.message);
    return;
  }

  if (!currentTrackingState.isTracking || !activeTrackingOptions) {
    // Tracking is not currently active; drop background updates
    return;
  }

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const latestFix = locations[locations.length - 1];
      if (latestFix) {
        await processAndTransmitLocationFix(latestFix, activeTrackingOptions);
      }
    }
  }
});

/**
 * Checks location service status and requests foreground + background permissions.
 */
export async function checkAndRequestLocationPermissions(): Promise<{
  granted: boolean;
  backgroundGranted: boolean;
  servicesEnabled: boolean;
  error?: string;
}> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        granted: false,
        backgroundGranted: false,
        servicesEnabled: false,
        error: 'Location services (GPS) are disabled on this device. Please turn on GPS.',
      };
    }

    // 1. Foreground permissions
    const { status: existingFg } = await Location.getForegroundPermissionsAsync();
    let fgGranted = existingFg === 'granted';

    if (!fgGranted) {
      const { status: requestedFg } = await Location.requestForegroundPermissionsAsync();
      fgGranted = requestedFg === 'granted';
    }

    if (!fgGranted) {
      return {
        granted: false,
        backgroundGranted: false,
        servicesEnabled: true,
        error: 'Foreground location permission was denied. Cannot broadcast journey coordinates.',
      };
    }

    // 2. Background permissions (only requested if foreground is granted)
    let bgGranted = false;
    try {
      const { status: existingBg } = await Location.getBackgroundPermissionsAsync();
      bgGranted = existingBg === 'granted';

      if (!bgGranted) {
        const { status: requestedBg } = await Location.requestBackgroundPermissionsAsync();
        bgGranted = requestedBg === 'granted';
      }
    } catch (bgErr: any) {
      console.warn('[LocationService] Background permission check fallback:', bgErr.message);
    }

    return {
      granted: true,
      backgroundGranted: bgGranted,
      servicesEnabled: true,
    };
  } catch (err: any) {
    return {
      granted: false,
      backgroundGranted: false,
      servicesEnabled: false,
      error: err.message || 'Failed to request location permissions',
    };
  }
}

/**
 * Starts real native GPS location tracking for an authorized driver during an active trip.
 * Configures both foreground watcher and Android foreground-service background TaskManager.
 */
export async function startDriverTripTracking(
  options: TrackingOptions
): Promise<{ success: boolean; error?: string; backgroundActive?: boolean }> {
  // 1. Role Authorization Guard: Students and parents cannot initiate tracking
  if (!isRoleAuthorizedForDriverTracking(options.userRole)) {
    const msg = `Unauthorized: Users with role "${options.userRole}" cannot broadcast transport tracking coordinates.`;
    currentTrackingState.error = msg;
    options.onError?.(msg);
    return { success: false, error: msg };
  }

  // 2. Stop any previous tracking session before starting a new one
  if (locationSubscription || currentTrackingState.isTracking) {
    await stopDriverTripTracking();
  }

  // 3. Request and verify native permissions and GPS status
  const permResult = await checkAndRequestLocationPermissions();
  if (!permResult.granted) {
    const msg = permResult.error || 'Location permissions denied.';
    currentTrackingState.error = msg;
    options.onError?.(msg);
    return { success: false, error: msg };
  }

  activeTrackingOptions = options;
  let bgActive = false;

  try {
    currentTrackingState = {
      isTracking: true,
      activeJourneyId: options.journeyId,
      lastLocation: null,
      error: null,
      isBackgroundEnabled: permResult.backgroundGranted,
    };

    // 4. Start Android Foreground-Service Background Location Updates via TaskManager
    try {
      const isTaskDefined = await TaskManager.isTaskDefined(LOCATION_BACKGROUND_TASK_NAME);
      if (isTaskDefined) {
        const hasStarted = await Location.hasStartedLocationUpdatesAsync(
          LOCATION_BACKGROUND_TASK_NAME
        ).catch(() => false);

        if (hasStarted) {
          await Location.stopLocationUpdatesAsync(LOCATION_BACKGROUND_TASK_NAME).catch(() => {});
        }

        await Location.startLocationUpdatesAsync(LOCATION_BACKGROUND_TASK_NAME, {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000, // 10 seconds
          distanceInterval: 10, // 10 meters
          deferredUpdatesInterval: 10000,
          showsBackgroundLocationIndicator: true,
          foregroundService: {
            notificationTitle: 'Transport Route In Progress',
            notificationBody: 'Transmitting vehicle coordinates for active journey.',
            notificationColor: '#059669',
          },
        });
        bgActive = true;
      }
    } catch (taskErr: any) {
      console.warn('[LocationService] Background location task could not start:', taskErr.message);
    }

    // 5. Subscribe to foreground watcher for responsive in-app driving dashboard updates
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
      },
      async (location) => {
        await processAndTransmitLocationFix(location, options);
      }
    );

    return { success: true, backgroundActive: bgActive };
  } catch (err: any) {
    const errorMsg = err.message || 'Failed to start GPS tracking.';
    await stopDriverTripTracking();
    currentTrackingState.error = errorMsg;
    options.onError?.(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Stops native GPS location acquisition immediately across both foreground and background services.
 * Called when a trip completes, is cancelled, or the driver signs out.
 */
export async function stopDriverTripTracking(): Promise<void> {
  activeTrackingOptions = null;

  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  try {
    const hasStarted = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_BACKGROUND_TASK_NAME
    ).catch(() => false);

    if (hasStarted) {
      await Location.stopLocationUpdatesAsync(LOCATION_BACKGROUND_TASK_NAME).catch(() => {});
    }
  } catch (err: any) {
    console.warn('[LocationService] Error stopping background location updates:', err.message);
  }

  currentTrackingState = {
    isTracking: false,
    activeJourneyId: null,
    lastLocation: null,
    error: null,
    isBackgroundEnabled: false,
  };
}

/**
 * Returns the current live tracking status and active journey reference.
 */
export function getDriverTrackingStatus(): TrackingStatus {
  return { ...currentTrackingState };
}
