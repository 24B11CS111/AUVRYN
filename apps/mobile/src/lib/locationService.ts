import * as Location from 'expo-location';
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
}

let locationSubscription: Location.LocationSubscription | null = null;
let currentTrackingState: TrackingStatus = {
  isTracking: false,
  activeJourneyId: null,
  lastLocation: null,
  error: null,
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
 * Checks location service status and requests foreground permissions.
 */
export async function checkAndRequestLocationPermissions(): Promise<{
  granted: boolean;
  servicesEnabled: boolean;
  error?: string;
}> {
  try {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      return {
        granted: false,
        servicesEnabled: false,
        error: 'Location services (GPS) are disabled on this device. Please turn on GPS.',
      };
    }

    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    if (existingStatus === 'granted') {
      return { granted: true, servicesEnabled: true };
    }

    const { status: requestedStatus } = await Location.requestForegroundPermissionsAsync();
    if (requestedStatus === 'granted') {
      return { granted: true, servicesEnabled: true };
    }

    return {
      granted: false,
      servicesEnabled: true,
      error: 'Foreground location permission was denied. Cannot broadcast journey coordinates.',
    };
  } catch (err: any) {
    return {
      granted: false,
      servicesEnabled: false,
      error: err.message || 'Failed to request location permissions',
    };
  }
}

/**
 * Starts real native GPS location tracking for an authorized driver during an active trip.
 * Strictly verifies role, permissions, and active trip parameters before subscribing to GPS updates.
 */
export async function startDriverTripTracking(
  options: TrackingOptions
): Promise<{ success: boolean; error?: string }> {
  // 1. Role Authorization Guard: Students and parents cannot initiate tracking
  if (!isRoleAuthorizedForDriverTracking(options.userRole)) {
    const msg = `Unauthorized: Users with role "${options.userRole}" cannot broadcast transport tracking coordinates.`;
    currentTrackingState.error = msg;
    options.onError?.(msg);
    return { success: false, error: msg };
  }

  // 2. Stop any previous tracking session before starting a new one
  if (locationSubscription) {
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

  try {
    currentTrackingState = {
      isTracking: true,
      activeJourneyId: options.journeyId,
      lastLocation: null,
      error: null,
    };

    // 4. Subscribe to native GPS updates
    locationSubscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000, // Every 10 seconds
        distanceInterval: 10, // Or every 10 meters
      },
      async (location) => {
        const coords = location.coords;

        // Coordinate sanity validation
        if (
          coords.latitude < -90.0 ||
          coords.latitude > 90.0 ||
          coords.longitude < -180.0 ||
          coords.longitude > 180.0
        ) {
          return;
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

        // 5. Transmit telemetry safely to PostgreSQL atomic procedure
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
            // Log but don't break location listener on transient network errors
            console.warn('[LocationService] Failed to transmit location telemetry:', dbErr.message);
          }
        }
      }
    );

    return { success: true };
  } catch (err: any) {
    const errorMsg = err.message || 'Failed to start GPS tracking.';
    currentTrackingState.isTracking = false;
    currentTrackingState.activeJourneyId = null;
    currentTrackingState.error = errorMsg;
    options.onError?.(errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Stops native GPS location acquisition immediately.
 * Called when a trip completes, is cancelled, or the driver loses authorization.
 */
export async function stopDriverTripTracking(): Promise<void> {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  currentTrackingState = {
    isTracking: false,
    activeJourneyId: null,
    lastLocation: null,
    error: null,
  };
}

/**
 * Returns the current live tracking status and active journey reference.
 */
export function getDriverTrackingStatus(): TrackingStatus {
  return { ...currentTrackingState };
}
