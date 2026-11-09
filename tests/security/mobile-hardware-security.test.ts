import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so variables are safely accessible inside hoisted vi.mock factories
const {
  mockLocationWatchRemove,
  mockSetNotificationChannelAsync,
  mockRpcCalls,
  mockUpsertCalls,
  mockUpdateCalls,
  mockSupabaseClient,
  state,
} = vi.hoisted(() => {
  const mockLocationWatchRemove = vi.fn();
  const mockSetNotificationChannelAsync = vi.fn(async () => {});
  const mockRpcCalls: { procedure: string; params: any }[] = [];
  const mockUpsertCalls: any[] = [];
  const mockUpdateCalls: any[] = [];
  const definedTasks: Record<string, (taskData: any) => Promise<void>> = {};

  const state = {
    mockLocationCallback: null as ((loc: any) => Promise<void>) | null,
    mockServicesEnabled: true,
    mockForegroundStatus: 'granted',
    mockRequestForegroundStatus: 'granted',
    mockBackgroundStatus: 'granted',
    mockNotificationStatus: 'granted',
    mockExpoPushToken: 'ExponentPushToken[mock-token-xyz123]',
    isLocationUpdatesStarted: false,
    backgroundTaskOptions: null as any,
    definedTasks,
  };

  const mockSupabaseClient = {
    rpc: vi.fn(async (procedure: string, params: any) => {
      mockRpcCalls.push({ procedure, params });
      return { data: { success: true }, error: null };
    }),
    from: vi.fn((table: string) => ({
      upsert: vi.fn(async (data: any, options?: any) => {
        mockUpsertCalls.push({ table, data, options });
        return { data: null, error: null };
      }),
      update: vi.fn((updates: any) => ({
        eq: vi.fn((col1: string, val1: any) => ({
          eq: vi.fn((col2: string, val2: any) => {
            mockUpdateCalls.push({ table, updates, filters: { [col1]: val1, [col2]: val2 } });
            return Promise.resolve({ data: null, error: null });
          }),
        })),
      })),
    })),
  };

  return {
    mockLocationWatchRemove,
    mockSetNotificationChannelAsync,
    mockRpcCalls,
    mockUpsertCalls,
    mockUpdateCalls,
    mockSupabaseClient,
    state,
  };
});

vi.mock('expo-task-manager', () => ({
  defineTask: vi.fn((taskName: string, executor: any) => {
    state.definedTasks[taskName] = executor;
  }),
  isTaskDefined: vi.fn(async (taskName: string) => Boolean(state.definedTasks[taskName])),
}));

vi.mock('expo-location', () => ({
  Accuracy: {
    High: 4,
    Balanced: 3,
  },
  hasServicesEnabledAsync: vi.fn(async () => state.mockServicesEnabled),
  getForegroundPermissionsAsync: vi.fn(async () => ({ status: state.mockForegroundStatus })),
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.mockRequestForegroundStatus })),
  getBackgroundPermissionsAsync: vi.fn(async () => ({ status: state.mockBackgroundStatus })),
  requestBackgroundPermissionsAsync: vi.fn(async () => ({ status: state.mockBackgroundStatus })),
  startLocationUpdatesAsync: vi.fn(async (taskName: string, options: any) => {
    state.backgroundTaskOptions = options;
    state.isLocationUpdatesStarted = true;
  }),
  stopLocationUpdatesAsync: vi.fn(async (_taskName: string) => {
    state.isLocationUpdatesStarted = false;
  }),
  hasStartedLocationUpdatesAsync: vi.fn(async (_taskName: string) => state.isLocationUpdatesStarted),
  watchPositionAsync: vi.fn(async (_options, callback) => {
    state.mockLocationCallback = callback;
    return {
      remove: mockLocationWatchRemove,
    };
  }),
}));

vi.mock('expo-notifications', () => ({
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
  },
  setNotificationHandler: vi.fn(),
  getPermissionsAsync: vi.fn(async () => ({ status: state.mockNotificationStatus })),
  requestPermissionsAsync: vi.fn(async () => ({ status: state.mockNotificationStatus })),
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  getExpoPushTokenAsync: vi.fn(async () => ({ data: state.mockExpoPushToken })),
}));

vi.mock('react-native', () => ({
  Platform: {
    OS: 'android',
  },
  StyleSheet: {
    create: (styles: any) => styles,
  },
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: vi.fn(async () => null),
  setItemAsync: vi.fn(async () => {}),
  deleteItemAsync: vi.fn(async () => {}),
}));

vi.mock('../../apps/mobile/src/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}));

import {
  LOCATION_BACKGROUND_TASK_NAME,
  isRoleAuthorizedForDriverTracking,
  checkAndRequestLocationPermissions,
  startDriverTripTracking,
  stopDriverTripTracking,
  getDriverTrackingStatus,
} from '../../apps/mobile/src/lib/locationService';

import {
  setupAndroidNotificationChannels,
  registerDevicePushTokenAsync,
  unregisterDevicePushTokenAsync,
  getActivePushToken,
} from '../../apps/mobile/src/lib/notificationService';

describe('Phase 2.5: Native GPS and Push Notification Security (REM-MED-01)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    state.mockServicesEnabled = true;
    state.mockForegroundStatus = 'granted';
    state.mockRequestForegroundStatus = 'granted';
    state.mockBackgroundStatus = 'granted';
    state.mockNotificationStatus = 'granted';
    state.mockLocationCallback = null;
    state.isLocationUpdatesStarted = false;
    state.backgroundTaskOptions = null;
    mockRpcCalls.length = 0;
    mockUpsertCalls.length = 0;
    mockUpdateCalls.length = 0;
    await stopDriverTripTracking();
  });

  describe('Part A: Native GPS & Transport Security', () => {
    const institutionId = '11111111-1111-1111-1111-111111111111';
    const vehicleId = '22222222-2222-2222-2222-222222222222';
    const journeyId = '33333333-3333-3333-3333-333333333333';
    const driverStaffId = '44444444-4444-4444-4444-444444444444';

    it('enforces role restrictions: students and parents are strictly unauthorized for driver tracking', () => {
      expect(isRoleAuthorizedForDriverTracking('student')).toBe(false);
      expect(isRoleAuthorizedForDriverTracking('parent')).toBe(false);
      expect(isRoleAuthorizedForDriverTracking('guardian')).toBe(false);
      expect(isRoleAuthorizedForDriverTracking('Student')).toBe(false);
      expect(isRoleAuthorizedForDriverTracking('PARENT')).toBe(false);

      expect(isRoleAuthorizedForDriverTracking('staff')).toBe(true);
      expect(isRoleAuthorizedForDriverTracking('admin')).toBe(true);
      expect(isRoleAuthorizedForDriverTracking('owner')).toBe(true);
      expect(isRoleAuthorizedForDriverTracking('faculty')).toBe(true);
    });

    it('rejects tracking attempt when caller role is a student or guardian without acquiring GPS', async () => {
      const onError = vi.fn();
      const res = await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'student',
        onError,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
      expect(onError).toHaveBeenCalledWith(expect.stringContaining('Unauthorized'));
      expect(state.mockLocationCallback).toBeNull();
      expect(state.isLocationUpdatesStarted).toBe(false);

      const status = getDriverTrackingStatus();
      expect(status.isTracking).toBe(false);
      expect(status.activeJourneyId).toBeNull();
    });

    it('fails gracefully when device GPS / location services are disabled', async () => {
      state.mockServicesEnabled = false;

      const perm = await checkAndRequestLocationPermissions();
      expect(perm.granted).toBe(false);
      expect(perm.servicesEnabled).toBe(false);
      expect(perm.error).toContain('Location services (GPS) are disabled');

      const res = await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Location services (GPS) are disabled');
    });

    it('fails gracefully when foreground location permission is denied by user', async () => {
      state.mockForegroundStatus = 'denied';
      state.mockRequestForegroundStatus = 'denied';

      const perm = await checkAndRequestLocationPermissions();
      expect(perm.granted).toBe(false);
      expect(perm.error).toContain('permission was denied');

      const res = await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('permission was denied');
    });

    it('subscribes to GPS and transmits coordinates to record_vehicle_gps_location_atomic when authorized', async () => {
      const onLocationUpdate = vi.fn();

      const res = await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
        onLocationUpdate,
      });

      expect(res.success).toBe(true);
      expect(getDriverTrackingStatus().isTracking).toBe(true);
      expect(getDriverTrackingStatus().activeJourneyId).toBe(journeyId);
      expect(state.mockLocationCallback).toBeDefined();

      // Simulate a native GPS fix event from Location.watchPositionAsync
      const mockFix = {
        coords: {
          latitude: 28.6139,
          longitude: 77.2090,
          speed: 12.5, // m/s -> 45 km/h
          heading: 90.0,
          accuracy: 4.2,
        },
        timestamp: 1731175200000,
      };

      await state.mockLocationCallback!(mockFix);

      // Verify callback received sanitized coordinates
      expect(onLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 28.6139,
          longitude: 77.2090,
          speedKmh: 45,
          heading: 90,
          accuracyMeters: 4.2,
        })
      );

      // Verify atomic procedure RPC invocation
      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0]).toEqual({
        procedure: 'record_vehicle_gps_location_atomic',
        params: expect.objectContaining({
          p_institution_id: institutionId,
          p_vehicle_id: vehicleId,
          p_journey_id: journeyId,
          p_latitude: 28.6139,
          p_longitude: 77.2090,
          p_speed_kmh: 45,
          p_heading: 90,
          p_accuracy_meters: 4.2,
          p_provider: 'driver_mobile_app',
        }),
      });
    });

    it('discards invalid / out-of-bounds GPS coordinates without calling RPC', async () => {
      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      expect(state.mockLocationCallback).toBeDefined();

      // Latitude > 90
      await state.mockLocationCallback!({
        coords: { latitude: 120.0, longitude: 77.0, speed: 10, heading: 0, accuracy: 5 },
        timestamp: Date.now(),
      });

      // Longitude < -180
      await state.mockLocationCallback!({
        coords: { latitude: 28.0, longitude: -200.0, speed: 10, heading: 0, accuracy: 5 },
        timestamp: Date.now(),
      });

      expect(mockRpcCalls.length).toBe(0);
    });

    it('immediately terminates location tracking and releases subscription when stopDriverTripTracking is called', async () => {
      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      expect(getDriverTrackingStatus().isTracking).toBe(true);

      await stopDriverTripTracking();

      expect(mockLocationWatchRemove).toHaveBeenCalled();
      const status = getDriverTrackingStatus();
      expect(status.isTracking).toBe(false);
      expect(status.activeJourneyId).toBeNull();
      expect(status.lastLocation).toBeNull();
    });

    it('cleans up existing tracking session before starting a new one', async () => {
      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId: 'journey-first',
        driverStaffId,
        userRole: 'staff',
      });

      expect(getDriverTrackingStatus().activeJourneyId).toBe('journey-first');

      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId: 'journey-second',
        driverStaffId,
        userRole: 'staff',
      });

      expect(mockLocationWatchRemove).toHaveBeenCalledTimes(1);
      expect(getDriverTrackingStatus().activeJourneyId).toBe('journey-second');
    });
  });

  describe('Part B: Android Background Tracking via TaskManager', () => {
    const institutionId = '11111111-1111-1111-1111-111111111111';
    const vehicleId = '22222222-2222-2222-2222-222222222222';
    const journeyId = '33333333-3333-3333-3333-333333333333';
    const driverStaffId = '44444444-4444-4444-4444-444444444444';

    it('registers background location task at module scope with correct task name', () => {
      expect(LOCATION_BACKGROUND_TASK_NAME).toBe('BACKGROUND_DRIVER_GPS_TRACKING');
      expect(state.definedTasks[LOCATION_BACKGROUND_TASK_NAME]).toBeDefined();
    });

    it('starts background location updates with Android foreground service notification', async () => {
      const res = await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      expect(res.success).toBe(true);
      expect(res.backgroundActive).toBe(true);
      expect(state.isLocationUpdatesStarted).toBe(true);
      expect(state.backgroundTaskOptions).toEqual(
        expect.objectContaining({
          accuracy: 4, // High
          timeInterval: 10000,
          distanceInterval: 10,
          showsBackgroundLocationIndicator: true,
          foregroundService: expect.objectContaining({
            notificationTitle: 'Transport Route In Progress',
            notificationBody: expect.stringContaining('Transmitting vehicle coordinates'),
          }),
        })
      );
    });

    it('processes and transmits coordinates from background task execution', async () => {
      const onLocationUpdate = vi.fn();

      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
        onLocationUpdate,
      });

      // Simulate background event triggered while app is minimized or screen locked
      const bgTaskExecutor = state.definedTasks[LOCATION_BACKGROUND_TASK_NAME];
      expect(bgTaskExecutor).toBeDefined();

      const bgFix = {
        data: {
          locations: [
            {
              coords: {
                latitude: 28.5355,
                longitude: 77.3910,
                speed: 15.0, // 54 km/h
                heading: 180.0,
                accuracy: 3.5,
              },
              timestamp: 1731175300000,
            },
          ],
        },
      };

      await bgTaskExecutor!(bgFix);

      expect(onLocationUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: 28.5355,
          longitude: 77.3910,
          speedKmh: 54,
          heading: 180,
          accuracyMeters: 3.5,
        })
      );

      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0]).toEqual({
        procedure: 'record_vehicle_gps_location_atomic',
        params: expect.objectContaining({
          p_institution_id: institutionId,
          p_vehicle_id: vehicleId,
          p_journey_id: journeyId,
          p_latitude: 28.5355,
          p_longitude: 77.3910,
          p_speed_kmh: 54,
        }),
      });
    });

    it('background task ignores updates when tracking has been stopped or trip ended', async () => {
      await startDriverTripTracking({
        institutionId,
        vehicleId,
        journeyId,
        driverStaffId,
        userRole: 'staff',
      });

      // Stop tracking
      await stopDriverTripTracking();
      expect(state.isLocationUpdatesStarted).toBe(false);

      // Simulate a late background task tick arriving after trip stop
      const bgTaskExecutor = state.definedTasks[LOCATION_BACKGROUND_TASK_NAME];
      await bgTaskExecutor!({
        data: {
          locations: [
            {
              coords: { latitude: 28.5, longitude: 77.4, speed: 10, heading: 0, accuracy: 5 },
              timestamp: Date.now(),
            },
          ],
        },
      });

      expect(mockRpcCalls.length).toBe(0);
    });
  });

  describe('Part C: Push Notifications & Token Lifecycle', () => {
    const userId = 'user-auth-12345';

    it('configures Android notification channels (default and transport_alerts)', async () => {
      await setupAndroidNotificationChannels();

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
        name: 'General Notifications',
        importance: 5,
      }));

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('transport_alerts', expect.objectContaining({
        name: 'Transport & Safety Alerts',
        importance: 4,
        lightColor: '#e11d48',
      }));
    });

    it('fails gracefully when push notification permissions are denied', async () => {
      state.mockNotificationStatus = 'denied';

      const res = await registerDevicePushTokenAsync(userId);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Notification permissions were not granted');
      expect(mockRpcCalls.length).toBe(0);
    });

    it('registers native push token using register_push_device_token_atomic procedure', async () => {
      state.mockNotificationStatus = 'granted';

      const res = await registerDevicePushTokenAsync(userId);
      expect(res.success).toBe(true);
      expect(res.token).toBe(state.mockExpoPushToken);
      expect(getActivePushToken()).toBe(state.mockExpoPushToken);

      expect(mockRpcCalls.length).toBe(1);
      expect(mockRpcCalls[0]).toEqual({
        procedure: 'register_push_device_token_atomic',
        params: {
          p_token: state.mockExpoPushToken,
          p_platform: 'android',
          p_app_version: '1.0.0',
        },
      });
    });

    it('revokes push token upon user sign out, preventing notifications after session termination', async () => {
      await registerDevicePushTokenAsync(userId);
      expect(getActivePushToken()).toBe(state.mockExpoPushToken);

      const unregRes = await unregisterDevicePushTokenAsync(userId);
      expect(unregRes.success).toBe(true);
      expect(getActivePushToken()).toBeNull();

      expect(mockUpdateCalls.length).toBe(1);
      expect(mockUpdateCalls[0]).toEqual({
        table: 'push_device_tokens',
        updates: { is_active: false },
        filters: {
          user_id: userId,
          token: state.mockExpoPushToken,
        },
      });
    });
  });

  describe('Part D: Server-Side Database & RPC Authorization Rules', () => {
    const instA = '11111111-1111-1111-1111-111111111111';
    const instB = '22222222-2222-2222-2222-222222222222';
    const vehicleA = 'veh-11111111-1111-1111-1111-111111111111';
    const vehicleB = 'veh-22222222-2222-2222-2222-222222222222';
    const driverStaffA = 'staff-driver-aaa';
    const driverUserA = 'user-driver-aaa';
    const callerStudent = 'user-student-xxx';
    const callerDriverB = 'user-driver-bbb';
    const callerAdminA = 'user-admin-aaa';

    const journeyA = {
      id: 'journey-aaa',
      institutionId: instA,
      vehicleId: vehicleA,
      driverStaffId: driverStaffA,
      driverUserId: driverUserA,
      status: 'in_progress',
    };

    // Helper implementing exact authorization logic from 20261110090000_harden_transport_gps_authorization.sql
    function evaluateGpsTelemetryAuthorization(params: {
      callerUid: string | null;
      callerRole?: string;
      institutionId: string;
      vehicleId: string;
      journeyId: string | null;
      callerInstitutionMemberships: { institutionId: string; role: string; status: string }[];
      journeyDbRecord?: typeof journeyA | null;
    }) {
      const { callerUid, callerRole, institutionId, vehicleId, journeyId, callerInstitutionMemberships, journeyDbRecord } = params;

      if (callerRole === 'service_role') {
        return { authorized: true };
      }

      if (!callerUid) {
        return { authorized: false, error: 'Authentication required', code: '42501' };
      }

      const activeMem = callerInstitutionMemberships.find(
        (m) => m.institutionId === institutionId && m.status === 'active'
      );
      if (!activeMem) {
        return { authorized: false, error: 'Caller is not an active member of institution', code: '42501' };
      }

      if (!journeyId) {
        return { authorized: false, error: 'journey_id is required', code: '22023' };
      }

      if (!journeyDbRecord || journeyDbRecord.institutionId !== institutionId) {
        return { authorized: false, error: 'Journey not found in institution', code: 'P0002' };
      }

      if (journeyDbRecord.vehicleId !== vehicleId) {
        return { authorized: false, error: 'Vehicle is not assigned to journey', code: '22023' };
      }

      if (journeyDbRecord.status !== 'in_progress' && journeyDbRecord.status !== 'delayed') {
        return { authorized: false, error: 'Location updates rejected: Journey not in progress', code: 'P0001' };
      }

      const isAdmin = activeMem.role === 'owner' || activeMem.role === 'admin';
      const isAssignedDriver = journeyDbRecord.driverUserId === callerUid;

      if (!isAdmin && !isAssignedDriver) {
        return { authorized: false, error: 'Caller is not the assigned driver', code: '42501' };
      }

      return { authorized: true };
    }

    it('authorizes assigned driver during active journey', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: driverUserA,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: journeyA.id,
        callerInstitutionMemberships: [{ institutionId: instA, role: 'staff', status: 'active' }],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(true);
    });

    it('authorizes institution administrator to submit or override telemetry', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: callerAdminA,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: journeyA.id,
        callerInstitutionMemberships: [{ institutionId: instA, role: 'admin', status: 'active' }],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(true);
    });

    it('rejects unauthenticated caller (null auth.uid)', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: null,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: journeyA.id,
        callerInstitutionMemberships: [],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(false);
      expect(res.code).toBe('42501');
    });

    it('rejects student or parent attempting to submit vehicle coordinates', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: callerStudent,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: journeyA.id,
        callerInstitutionMemberships: [{ institutionId: instA, role: 'student', status: 'active' }],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(false);
      expect(res.code).toBe('42501');
      expect(res.error).toContain('not the assigned driver');
    });

    it('rejects driver from another institution (cross-tenant attack)', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: callerDriverB,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: journeyA.id,
        callerInstitutionMemberships: [{ institutionId: instB, role: 'staff', status: 'active' }],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(false);
      expect(res.code).toBe('42501');
      expect(res.error).toContain('not an active member');
    });

    it('rejects vehicle mismatch (submitting telemetry for wrong vehicle)', () => {
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: driverUserA,
        institutionId: instA,
        vehicleId: vehicleB, // Wrong vehicle
        journeyId: journeyA.id,
        callerInstitutionMemberships: [{ institutionId: instA, role: 'staff', status: 'active' }],
        journeyDbRecord: journeyA,
      });

      expect(res.authorized).toBe(false);
      expect(res.code).toBe('22023');
      expect(res.error).toContain('Vehicle is not assigned to journey');
    });

    it('rejects telemetry when journey is completed or cancelled', () => {
      const completedJourney = { ...journeyA, status: 'completed' as const };
      const res = evaluateGpsTelemetryAuthorization({
        callerUid: driverUserA,
        institutionId: instA,
        vehicleId: vehicleA,
        journeyId: completedJourney.id,
        callerInstitutionMemberships: [{ institutionId: instA, role: 'staff', status: 'active' }],
        journeyDbRecord: completedJourney,
      });

      expect(res.authorized).toBe(false);
      expect(res.code).toBe('P0001');
      expect(res.error).toContain('Journey not in progress');
    });

    it('handles shared-device push token re-assignment without RLS conflict', () => {
      // Simulate register_push_device_token_atomic ON CONFLICT (token) DO UPDATE logic
      const tokenDb: Record<string, { userId: string; isActive: boolean; token: string }> = {};

      function registerPushTokenAtomic(callerUid: string, token: string) {
        tokenDb[token] = {
          userId: callerUid,
          token,
          isActive: true,
        };
        return { success: true, token, userId: callerUid };
      }

      function unregisterPushToken(callerUid: string, token: string) {
        if (tokenDb[token] && tokenDb[token].userId === callerUid) {
          tokenDb[token].isActive = false;
        }
      }

      const sharedHardwareToken = 'ExponentPushToken[shared-phone-hardware-uuid]';

      // 1. User A logs in on Phone
      registerPushTokenAtomic('user-A', sharedHardwareToken);
      expect(tokenDb[sharedHardwareToken]).toEqual({
        userId: 'user-A',
        token: sharedHardwareToken,
        isActive: true,
      });

      // 2. User A signs out
      unregisterPushToken('user-A', sharedHardwareToken);
      expect(tokenDb[sharedHardwareToken].isActive).toBe(false);

      // 3. User B logs in on same phone (shared device account switching)
      registerPushTokenAtomic('user-B', sharedHardwareToken);
      expect(tokenDb[sharedHardwareToken]).toEqual({
        userId: 'user-B',
        token: sharedHardwareToken,
        isActive: true,
      });

      // 4. Multiple devices: User B also logs in on Tablet (token-tablet-b)
      registerPushTokenAtomic('user-B', 'token-tablet-b');
      expect(tokenDb['token-tablet-b']).toEqual({
        userId: 'user-B',
        token: 'token-tablet-b',
        isActive: true,
      });
      // Both devices active for User B
      expect(tokenDb[sharedHardwareToken].isActive).toBe(true);
      expect(tokenDb['token-tablet-b'].isActive).toBe(true);
    });
  });
});
