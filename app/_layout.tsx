import { useMemo } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, TouchableOpacity, Text, Platform } from 'react-native';
import { useColors } from '../src/theme/useColors';
import { AlertThemeProvider } from '../src/components/AlertThemeProvider';

export default function RootLayout() {
  const c = useColors();
  const isDark = c.bg === '#1A1025';

  const screenOptions = useMemo(() => ({
    headerStyle: { backgroundColor: c.headerBg },
    headerTintColor: c.textPrimary,
    headerTitleStyle: { fontWeight: '600' },
    contentStyle: { backgroundColor: c.bg },
  }), [c.bg, c.headerBg, c.textPrimary]);

  const backButton = useMemo(() => (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ marginLeft: Platform.OS === 'web' ? 8 : 0, padding: 4 }}
    >
      <Text style={{ fontSize: 22, color: c.textPrimary, lineHeight: 22 }}>{'✕'}</Text>
    </TouchableOpacity>
  ), [c.textPrimary]);

  return (
    <View style={[
      { flex: 1, backgroundColor: c.bg },
      Platform.OS === 'web' && {
        width: '100%',
        minHeight: '100vh',
        overflowY: 'auto',
        alignItems: 'center',
      },
    ]}>
      <AlertThemeProvider />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={[
        { flex: 1 },
        Platform.OS === 'web' && {
          flex: 0,
          width: '100%',
          maxWidth: 1024,
          minHeight: '100vh',
        },
      ]}>
      <Stack screenOptions={screenOptions}>
        <Stack.Screen name="index" options={{ title: 'StickyMem', headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="add" options={{
          title: 'Add Content',
          presentation: 'modal',
          headerLeft: () => backButton,
        }} />
        <Stack.Screen name="review" options={{ title: 'Review', headerShown: false }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="manage" options={{ title: 'Manage' }} />
      </Stack>
      </View>
    </View>
  );
}
