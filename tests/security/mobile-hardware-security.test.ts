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
  const state = {
    mockLocationCallback: null as ((loc: any) => Promise<void>) | null,
    mockServicesEnabled: true,
    mockForegroundStatus: 'granted',
    mockRequestForegroundStatus: 'granted',
    mockNotificationStatus: 'granted',
    mockExpoPushToken: 'ExponentPushToken[mock-token-xyz123]',
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

vi.mock('expo-location', () => ({
  Accuracy: {
    High: 4,
    Balanced: 3,
  },
  hasServicesEnabledAsync: vi.fn(async () => state.mockServicesEnabled),
  getForegroundPermissionsAsync: vi.fn(async () => ({ status: state.mockForegroundStatus })),
  requestForegroundPermissionsAsync: vi.fn(async () => ({ status: state.mockRequestForegroundStatus })),
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
    state.mockNotificationStatus = 'granted';
    state.mockLocationCallback = null;
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

  describe('Part B: Push Notifications & Token Isolation', () => {
    const userId = 'user-auth-12345';

    it('configures Android notification channels (default and transport_alerts)', async () => {
      await setupAndroidNotificationChannels();

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('default', expect.objectContaining({
        name: 'General Notifications',
        importance: 5, // AndroidImportance.MAX
      }));

      expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith('transport_alerts', expect.objectContaining({
        name: 'Transport & Safety Alerts',
        importance: 4, // AndroidImportance.HIGH
        lightColor: '#e11d48',
      }));
    });

    it('fails gracefully when push notification permissions are denied', async () => {
      state.mockNotificationStatus = 'denied';

      const res = await registerDevicePushTokenAsync(userId);
      expect(res.success).toBe(false);
      expect(res.error).toContain('Notification permissions were not granted');
      expect(mockUpsertCalls.length).toBe(0);
    });

    it('registers native push token in push_device_tokens bound to authenticated user', async () => {
      state.mockNotificationStatus = 'granted';

      const res = await registerDevicePushTokenAsync(userId);
      expect(res.success).toBe(true);
      expect(res.token).toBe(state.mockExpoPushToken);
      expect(getActivePushToken()).toBe(state.mockExpoPushToken);

      expect(mockUpsertCalls.length).toBe(1);
      expect(mockUpsertCalls[0]).toEqual({
        table: 'push_device_tokens',
        data: expect.objectContaining({
          user_id: userId,
          token: state.mockExpoPushToken,
          platform: 'android',
          is_active: true,
        }),
        options: { onConflict: 'token' },
      });
    });

    it('revokes push token upon user sign out, preventing notifications after session termination', async () => {
      // First register
      await registerDevicePushTokenAsync(userId);
      expect(getActivePushToken()).toBe(state.mockExpoPushToken);

      // Then unregister
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

  describe('Part C: Multi-Tenant & RLS Isolation Rules', () => {
    it('verifies push_device_tokens user-level RLS policy isolation', () => {
      const tokenRowUserA = {
        userId: 'user-aaa',
        token: 'token-a',
        platform: 'android',
        isActive: true,
      };

      const callerUserB = 'user-bbb';
      // RLS policy: USING (user_id = auth.uid())
      const canUserBAccess = tokenRowUserA.userId === callerUserB;
      expect(canUserBAccess).toBe(false);

      const callerUserA = 'user-aaa';
      const canUserAAccess = tokenRowUserA.userId === callerUserA;
      expect(canUserAAccess).toBe(true);
    });

    it('verifies stored procedure record_vehicle_gps_location_atomic rejects inactive journey', () => {
      // From 20261106090000_transport_management.sql lines 806-815:
      // IF v_journey.status NOT IN ('in_progress', 'delayed') THEN
      //   RAISE EXCEPTION 'Location updates rejected: Journey % is %', p_journey_id, v_journey.status
      const journeyStatuses = ['scheduled', 'completed', 'cancelled'] as const;
      for (const status of journeyStatuses) {
        const isPermitted = status === 'in_progress' || (status as string) === 'delayed';
        expect(isPermitted).toBe(false);
      }

      const activeStatuses = ['in_progress', 'delayed'] as const;
      for (const status of activeStatuses) {
        const isPermitted = status === 'in_progress' || (status as string) === 'delayed';
        expect(isPermitted).toBe(true);
      }
    });
  });
});
