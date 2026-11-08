import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@edu-platform/database';
import {
  inspectMobileSupabaseConfig,
  initializeMobileSupabaseClient,
  resolveMobileSupabaseConfig,
} from './supabaseConfig';

/**
 * Custom storage adapter using Expo SecureStore for iOS/Android
 * and localStorage for Web fallback.
 */
const ExpoSecureStoreAdapter = {
  getItem: (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        return Promise.resolve(localStorage.getItem(key));
      }
      return Promise.resolve(null);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, value);
      }
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const configDiagnostic = inspectMobileSupabaseConfig(supabaseUrl, supabaseAnonKey);

console.info('[Supabase config diagnostic]', {
  EXPO_PUBLIC_SUPABASE_URL: configDiagnostic.urlPresent ? 'present' : 'missing',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: configDiagnostic.anonKeyPresent ? 'present' : 'missing',
  urlValid: configDiagnostic.urlValid,
  anonKeyPublic: configDiagnostic.anonKeyPublic,
});

const configResult = resolveMobileSupabaseConfig(supabaseUrl, supabaseAnonKey);

export const supabaseConfigError = configResult.error;

export const supabase = initializeMobileSupabaseClient(configResult, (url, anonKey) =>
  createClient<Database>(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  })
);
