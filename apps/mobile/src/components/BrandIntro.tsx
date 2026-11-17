import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Easing,
} from 'react-native';
import { AUVRYN_COLORS } from '@edu-platform/types';
import { AuvrynLogo } from './AuvrynLogo';

const { width } = Dimensions.get('window');

export interface BrandIntroProps {
  onComplete: () => void;
  durationMs?: number;
}

export const BrandIntro: React.FC<BrandIntroProps> = ({
  onComplete,
  durationMs = 4000,
}) => {
  const [hasFinished, setHasFinished] = useState(false);

  // Animated values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const logoScale = useRef(new Animated.Value(0.75)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const wordmarkTranslateY = useRef(new Animated.Value(12)).current;
  const wordmarkOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const waveTranslateY = useRef(new Animated.Value(30)).current;
  const waveOpacity = useRef(new Animated.Value(0)).current;

  // Staggered bars animation simulation
  const barHeight1 = useRef(new Animated.Value(0)).current;
  const barHeight2 = useRef(new Animated.Value(0)).current;
  const barHeight3 = useRef(new Animated.Value(0)).current;

  const handleFinish = () => {
    if (hasFinished) return;
    setHasFinished(true);

    Animated.timing(containerOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      onComplete();
    });
  };

  useEffect(() => {
    // Stage choreography
    Animated.sequence([
      // 0.0 - 0.5s: Wave and initial container reveal
      Animated.parallel([
        Animated.timing(waveOpacity, {
          toValue: 0.12,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(waveTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
      ]),

      // 1.8 - 2.4s: Analytics Bars rising
      Animated.stagger(120, [
        Animated.timing(barHeight1, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(barHeight2, { toValue: 1, duration: 300, useNativeDriver: false }),
        Animated.timing(barHeight3, { toValue: 1, duration: 300, useNativeDriver: false }),
      ]),

      // 3.5 - 4.2s: Wordmark reveal
      Animated.parallel([
        Animated.timing(wordmarkOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(wordmarkTranslateY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),

      // 4.2 - 4.8s: Tagline & descriptor
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),

      // Hold frame briefly
      Animated.delay(600),
    ]).start(() => {
      handleFinish();
    });

    // Safety timeout: never hang the user
    const timer = setTimeout(() => {
      handleFinish();
    }, durationMs + 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      <SafeAreaView style={styles.safeArea}>
        {/* Skip button in top right */}
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleFinish}
            activeOpacity={0.7}
          >
            <Text style={styles.skipText}>Skip Intro →</Text>
          </TouchableOpacity>
        </View>

        {/* Center Animated Logo Presentation */}
        <View style={styles.centerContent}>
          <Animated.View
            style={{
              transform: [{ scale: logoScale }],
              opacity: logoOpacity,
              alignItems: 'center',
            }}
          >
            <AuvrynLogo
              variant="symbol"
              size="lg"
              style={styles.logoSymbol}
            />

            {/* Rising analytics bars visual indicator */}
            <View style={styles.barsContainer}>
              <Animated.View
                style={[
                  styles.bar,
                  styles.bar1,
                  {
                    height: barHeight1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 16],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.bar,
                  styles.bar2,
                  {
                    height: barHeight2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 24],
                    }),
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.bar,
                  styles.bar3,
                  {
                    height: barHeight3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 32],
                    }),
                  },
                ]}
              />
            </View>
          </Animated.View>

          {/* Wordmark */}
          <Animated.View
            style={{
              opacity: wordmarkOpacity,
              transform: [{ translateY: wordmarkTranslateY }],
              alignItems: 'center',
              marginTop: 18,
            }}
          >
            <View style={styles.titleRow}>
              <Text style={styles.titleText}>AUVRYN</Text>
              <View style={styles.sparkDot} />
            </View>

            {/* Tagline */}
            <Animated.View style={{ opacity: taglineOpacity, alignItems: 'center', marginTop: 6 }}>
              <Text style={styles.descriptorText}>THE INTELLIGENT EDUCATION ECOSYSTEM</Text>
              <Text style={styles.subTagline}>One institution. One intelligent system.</Text>
            </Animated.View>
          </Animated.View>
        </View>

        {/* Decorative Wave at the bottom */}
        <Animated.View
          style={[
            styles.bottomWave,
            {
              opacity: waveOpacity,
              transform: [{ translateY: waveTranslateY }],
            },
          ]}
        />
      </SafeAreaView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 9999,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 12,
    alignItems: 'flex-end',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  skipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoSymbol: {
    marginBottom: 8,
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    gap: 4,
    marginTop: 6,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  bar1: {
    backgroundColor: '#60A5FA',
  },
  bar2: {
    backgroundColor: '#2563EB',
  },
  bar3: {
    backgroundColor: '#1D4ED8',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 3,
    color: AUVRYN_COLORS.primaryNavy,
  },
  sparkDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AUVRYN_COLORS.electricBlue,
    marginLeft: 4,
    marginBottom: 4,
  },
  descriptorText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: AUVRYN_COLORS.electricBlue,
    textTransform: 'uppercase',
  },
  subTagline: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 6,
  },
  bottomWave: {
    height: 18,
    width: width,
    backgroundColor: AUVRYN_COLORS.primaryNavy,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});
