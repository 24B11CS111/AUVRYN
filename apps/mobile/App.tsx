import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { supabase } from './src/lib/supabase';
import { LoginScreen } from './src/screens/LoginScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { BrandIntro } from './src/components/BrandIntro';
import { AUVRYN_COLORS } from '@edu-platform/types';
import type { Session } from '@supabase/supabase-js';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIntro, setShowIntro] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />

      {/* In-app animated opening sequence */}
      {showIntro ? (
        <BrandIntro onComplete={() => setShowIntro(false)} />
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AUVRYN_COLORS.electricBlue} />
        </View>
      ) : session && session.user ? (
        <DashboardScreen
          userId={session.user.id}
          userEmail={session.user.email || ''}
        />
      ) : authView === 'login' ? (
        <LoginScreen onNavigateToRegister={() => setAuthView('register')} />
      ) : (
        <RegisterScreen onNavigateToLogin={() => setAuthView('login')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FB',
  },
});
