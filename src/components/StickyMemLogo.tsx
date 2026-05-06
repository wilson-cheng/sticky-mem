import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface Props {
  size?: number;
}

export default function StickyMemLogo({ size = 48 }: Props) {
  const foldSize = size * 0.22;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {/* Main note body */}
      <View style={[styles.note, { width: size, height: size, borderRadius: size * 0.12 }]}>
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
        },
      ]}>
        <View style={[
          styles.foldInner,
          {
            width: foldSize,
            height: foldSize,
            borderBottomLeftRadius: size * 0.06,
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
    backgroundColor: '#6C63FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6C63FF',
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
    backgroundColor: '#F5F5F5',
  },
  foldInner: {
    backgroundColor: '#5850DB',
  },
});
