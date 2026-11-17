import React from 'react';
import { View, Text, Image, StyleSheet, type ViewStyle } from 'react-native';
import { AUVRYN_COLORS } from '@edu-platform/types';

export interface AuvrynLogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol' | 'white';
  size?: 'sm' | 'md' | 'lg';
  showDescriptor?: boolean;
  showTagline?: boolean;
  style?: ViewStyle;
}

export const AuvrynLogo: React.FC<AuvrynLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  showDescriptor = true,
  showTagline = false,
  style,
}) => {
  const isWhite = variant === 'white';

  const sizeDimensions = {
    sm: { icon: 30, text: 16, desc: 6.5 },
    md: { icon: 42, text: 20, desc: 7.5 },
    lg: { icon: 56, text: 26, desc: 9 },
  }[size];

  const iconSource = isWhite
    ? require('../../assets/branding/app-icon.png')
    : require('../../assets/branding/splash-logo.png');

  if (variant === 'symbol') {
    return (
      <View style={[styles.symbolContainer, style]}>
        <Image
          source={iconSource}
          style={{ width: sizeDimensions.icon, height: sizeDimensions.icon, borderRadius: sizeDimensions.icon / 4 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const isStacked = variant === 'stacked';

  return (
    <View style={[isStacked ? styles.stackedContainer : styles.horizontalContainer, style]}>
      <Image
        source={iconSource}
        style={{
          width: sizeDimensions.icon,
          height: sizeDimensions.icon,
          borderRadius: 8,
          marginBottom: isStacked ? 8 : 0,
          marginRight: isStacked ? 0 : 10,
        }}
        resizeMode="contain"
      />

      <View style={isStacked ? styles.stackedTextGroup : styles.horizontalTextGroup}>
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.wordmark,
              {
                fontSize: sizeDimensions.text,
                color: isWhite ? '#FFFFFF' : AUVRYN_COLORS.primaryNavy,
              },
            ]}
          >
            AUVRYN
          </Text>
          <View
            style={[
              styles.dot,
              { backgroundColor: isWhite ? '#60A5FA' : AUVRYN_COLORS.electricBlue },
            ]}
          />
        </View>

        {showDescriptor && (
          <Text
            style={[
              styles.descriptor,
              {
                fontSize: sizeDimensions.desc,
                color: isWhite ? '#93C5FD' : AUVRYN_COLORS.electricBlue,
              },
            ]}
          >
            THE INTELLIGENT EDUCATION ECOSYSTEM
          </Text>
        )}

        {showTagline && (
          <Text style={styles.tagline}>
            One institution. One intelligent system.
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  horizontalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackedContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalTextGroup: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  stackedTextGroup: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginLeft: 3,
    marginBottom: 2,
  },
  descriptor: {
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  tagline: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});
