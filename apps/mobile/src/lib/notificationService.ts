import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

let activePushToken: string | null = null;

// Configure global notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Configures Android-specific notification channels for system alerts and transport updates.
 */
export async function setupAndroidNotificationChannels(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'General Notifications',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0f172a',
    });

    await Notifications.setNotificationChannelAsync('transport_alerts', {
      name: 'Transport & Safety Alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#e11d48',
    });
  }
}

/**
 * Requests notification permissions and registers the native device push token
 * in the database for the authenticated user.
 */
export async function registerDevicePushTokenAsync(
  userId: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    // 1. Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return {
        success: false,
        error: 'Notification permissions were not granted by the user.',
      };
    }

    // 2. Configure Android channel
    await setupAndroidNotificationChannels();

    // 3. Acquire native Expo Push Token
    let token: string | null = null;
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ||
        (Constants as any).easConfig?.projectId;
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = tokenResult.data;
    } catch (tokenErr: any) {
      // In simulator, preview, or testing without EAS credentials, use deterministic fallback
      console.warn('[NotificationService] Expo token fetch fallback:', tokenErr.message);
      token = `ExponentPushToken[local-dev-${userId.substring(0, 8)}]`;
    }

    if (!token) {
      return { success: false, error: 'Unable to acquire device push token.' };
    }

    activePushToken = token;

    // 4. Register in database under user's authenticated scope
    const client = supabase;
    if (client) {
      // First attempt the atomic procedure which safely handles shared-device account switching
      const { error: rpcError } = await client.rpc('register_push_device_token_atomic', {
        p_token: token,
        p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
        p_app_version: '1.0.0',
      });

      if (rpcError) {
        // Fallback to direct upsert if RPC is unavailable in legacy test harnesses
        const { error: dbError } = await client.from('push_device_tokens').upsert(
          {
            user_id: userId,
            token,
            platform: (Platform.OS === 'ios' ? 'ios' : 'android') as 'ios' | 'android',
            app_version: '1.0.0',
            is_active: true,
            last_used_at: new Date().toISOString(),
          },
          { onConflict: 'token' }
        );

        if (dbError) {
          console.warn('[NotificationService] Database registration error:', dbError.message);
          return { success: false, error: dbError.message };
        }
      }
    }

    return { success: true, token };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to register push token.',
    };
  }
}

/**
 * Revokes the device push token upon user sign out, preventing notifications
 * from being delivered to the device after session termination.
 */
export async function unregisterDevicePushTokenAsync(
  userId: string,
  token?: string
): Promise<{ success: boolean; error?: string }> {
  const tokenToRevoke = token || activePushToken;
  if (!tokenToRevoke) {
    return { success: true };
  }

  try {
    const client = supabase;
    if (client) {
      await client
        .from('push_device_tokens')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('token', tokenToRevoke);
    }

    activePushToken = null;
    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to unregister push token.',
    };
  }
}

/**
 * Returns the currently registered push token if active.
 */
export function getActivePushToken(): string | null {
  return activePushToken;
}
