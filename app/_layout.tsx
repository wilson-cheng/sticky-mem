import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSettingsStore } from '../src/store/settings';

const COLORS = {
  light: { bg: '#F5F5F5', headerBg: '#fff', headerTint: '#333' },
  dark:  { bg: '#121212', headerBg: '#1E1E1E', headerTint: '#E0E0E0' },
};

export default function RootLayout() {
  const theme = useSettingsStore((s) => s.theme as 'light' | 'dark');
  const isDark = theme === 'dark';
  const c = isDark ? COLORS.dark : COLORS.light;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.headerBg },
          headerTintColor: c.headerTint,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'StickyMem', headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Add Content', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review', headerBackVisible: false }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </View>
  );
}
