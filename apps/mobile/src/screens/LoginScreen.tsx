import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AuvrynLogo } from '../components/AuvrynLogo';
import { AUVRYN_COLORS } from '@edu-platform/types';
import { loginSchema } from '@edu-platform/validators';
import { formatMobileAuthError } from '../lib/authErrors';
import { supabaseConfigError } from '../lib/supabase';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!supabase) {
      setErrorMessage(supabaseConfigError);
      return;
    }

    // Validate using shared schema
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      setErrorMessage(validation.error.errors[0]?.message || 'Invalid input');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(formatMobileAuthError(error, 'sign-in'));
      }
    } catch (err) {
      setErrorMessage(formatMobileAuthError(err, 'sign-in'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('Please enter a valid email address to reset password.');
      return;
    }

    if (!supabase) {
      setErrorMessage(supabaseConfigError);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail);
      if (error) {
        setErrorMessage(formatMobileAuthError(error, 'password-reset'));
      } else {
        setResetSent(true);
        setSuccessMessage('A password recovery email has been sent to your address.');
      }
    } catch (err) {
      setErrorMessage(formatMobileAuthError(err, 'password-reset'));
    } finally {
      setIsLoading(false);
    }
  };

  const displayedError = errorMessage ?? supabaseConfigError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <AuvrynLogo variant="stacked" size="lg" showDescriptor={true} showTagline={true} />
        </View>

        {displayedError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{displayedError}</Text>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          {isForgotPassword ? (
            <>
              <Text style={styles.formTitle}>Reset Password</Text>
              <Text style={styles.formSubtitle}>
                Enter your institutional email to receive recovery instructions.
              </Text>

              <Input
                label="Email Address"
                placeholder="user@institution.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {!resetSent ? (
                <Button
                  title="Send Recovery Link"
                  onPress={handleResetPassword}
                  disabled={!supabase}
                  isLoading={isLoading}
                  variant="primary"
                  style={styles.submitBtn}
                />
              ) : null}

              <TouchableOpacity
                onPress={() => {
                  setIsForgotPassword(false);
                  setResetSent(false);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                style={styles.backToSignInBtn}
              >
                <Text style={styles.backToSignInText}>Back to Sign In</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Input
                label="Email Address"
                placeholder="admin@institution.edu"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Input
                label="Password"
                placeholder="••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <View style={styles.forgotPasswordRow}>
                <TouchableOpacity
                  onPress={() => {
                    setIsForgotPassword(true);
                    setResetSent(false);
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              <Button
                title="Sign In"
                onPress={handleLogin}
                disabled={!supabase}
                isLoading={isLoading}
                variant="primary"
                style={styles.submitBtn}
              />

              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={onNavigateToRegister}>
                  <Text style={styles.linkText}>Register here</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    shadowColor: AUVRYN_COLORS.primaryNavy,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  errorBox: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC4545',
    fontSize: 13,
  },
  successBox: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#15803D',
    fontSize: 13,
    fontWeight: '600',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AUVRYN_COLORS.primaryNavy,
    marginBottom: 6,
  },
  formSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  forgotPasswordRow: {
    alignItems: 'flex-end',
    marginTop: -4,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: AUVRYN_COLORS.electricBlue,
  },
  backToSignInBtn: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  backToSignInText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUVRYN_COLORS.electricBlue,
  },
  submitBtn: {
    marginTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
    color: AUVRYN_COLORS.electricBlue,
  },
});
