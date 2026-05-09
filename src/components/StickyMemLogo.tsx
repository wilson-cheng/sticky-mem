import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface Props {
  size?: number;
  accentColor?: string;
}

export default function StickyMemLogo({ size = 48, accentColor = '#7C4DFF' }: Props) {
  const foldSize = size * 0.22;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Main note body */}
      <View style={[
        styles.note,
        {
          width: size,
          height: size,
          borderRadius: size * 0.12,
          backgroundColor: accentColor,
          shadowColor: accentColor,
        },
      ]}>
        {/* Brain icon */}
        <Text style={[styles.brain, { fontSize: size * 0.42 }]}>🧠</Text>
        {/* SM initials */}
        <Text style={[styles.initials, { fontSize: size * 0.11 }]}>SM</Text>
      </View>
      {/* Folded corner */}
      <View style={[
        styles.fold,
        {
          width: foldSize,
          height: foldSize,
          right: 0,
          top: 0,
          borderBottomLeftRadius: size * 0.06,
          backgroundColor: accentColor + '22',
        },
      ]}>
        <View style={[
          styles.foldInner,
          {
            width: foldSize,
            height: foldSize,
            borderBottomLeftRadius: size * 0.06,
            backgroundColor: accentColor,
          },
        ]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  note: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  brain: {
    color: '#fff',
  },
  initials: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: -2,
  },
  fold: {
    position: 'absolute',
  },
  foldInner: {},
});
