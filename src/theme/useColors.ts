import { useSettingsStore } from '../store/settings';

export interface ThemeColors {
  bg: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  textOnPrimary: string;
  accent: string;
  blue: string;
  border: string;
  headerBg: string;
  statBoxBg: string;
  inputBg: string;
  danger: string;
  dangerBg: string;
  successBg: string;
  warningBg: string;
}

const lightColors: ThemeColors = {
  bg: '#F5F5F5',
  cardBg: '#fff',
  textPrimary: '#333',
  textSecondary: '#888',
  textOnPrimary: '#fff',
  accent: '#6C63FF',
  blue: '#4A90D9',
  border: '#E0E0E0',
  headerBg: '#fff',
  statBoxBg: '#fff',
  inputBg: '#F9F9F9',
  danger: '#C62828',
  dangerBg: '#FFF0F0',
  successBg: '#E8F5E9',
  warningBg: '#FFF3E0',
};

const darkColors: ThemeColors = {
  bg: '#121212',
  cardBg: '#1E1E1E',
  textPrimary: '#E0E0E0',
  textSecondary: '#999',
  textOnPrimary: '#fff',
  accent: '#6C63FF',
  blue: '#5BA0E9',
  border: '#333',
  headerBg: '#1E1E1E',
  statBoxBg: '#1E1E1E',
  inputBg: '#2A2A2A',
  danger: '#C62828',
  dangerBg: '#3E1A1A',
  successBg: '#1B3D1B',
  warningBg: '#3D2E1B',
};

export function useColors(): ThemeColors {
  const theme = useSettingsStore((s) => s.theme as 'light' | 'dark');
  const isDark = theme === 'dark';
  return isDark ? darkColors : lightColors;
}
