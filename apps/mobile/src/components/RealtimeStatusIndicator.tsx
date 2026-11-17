import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { RealtimeConnectionState } from '@edu-platform/types';
import { AUVRYN_COLORS } from '@edu-platform/types';

export interface RealtimeStatusIndicatorProps {
  state: RealtimeConnectionState;
  showText?: boolean;
}

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  state,
  showText = true,
}) => {
  const isConnected = state === 'CONNECTED';
  const isConnecting = state === 'CONNECTING' || state === 'RECONNECTING';

  const dotColor = isConnected
    ? AUVRYN_COLORS.success
    : isConnecting
    ? AUVRYN_COLORS.warning
    : AUVRYN_COLORS.mutedText;

  const label = isConnected
    ? 'Live'
    : isConnecting
    ? 'Syncing'
    : 'Offline';

  const textColor = isConnected
    ? '#166534'
    : isConnecting
    ? '#854d0e'
    : AUVRYN_COLORS.secondaryText;

  const bgStyle = isConnected
    ? styles.bgConnected
    : isConnecting
    ? styles.bgConnecting
    : styles.bgOffline;

  return (
    <View style={[styles.container, bgStyle]}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      {showText && <Text style={[styles.text, { color: textColor }]}>{label}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
  },
  bgConnected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  bgConnecting: {
    backgroundColor: '#FEFCE8',
    borderColor: '#FEF08A',
  },
  bgOffline: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
});
