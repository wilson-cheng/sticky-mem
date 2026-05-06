import { useMemo } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useColors } from '../src/theme/useColors';

export default function RootLayout() {
  const c = useColors();
  const isDark = c.bg === '#121212';

  const screenOptions = useMemo(() => ({
    headerStyle: { backgroundColor: c.headerBg },
    headerTintColor: c.textPrimary,
    headerTitleStyle: { fontWeight: '600' },
    contentStyle: { backgroundColor: c.bg },
  }), [c.bg, c.headerBg, c.textPrimary]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'StickyMem', headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Add Content', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review', headerShown: false }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </View>
  );
}
