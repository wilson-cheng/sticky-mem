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
  // Gradient tokens
  heroGradient: readonly [string, string];
  ctaGradient: readonly [string, string];
  ctaTextColor: string;
  statGradient1: readonly [string, string]; // orange
  statGradient2: readonly [string, string]; // cyan
  statGradient3: readonly [string, string]; // green
  featureGradient1: readonly [string, string]; // pink
  featureGradient2: readonly [string, string]; // purple
  featureGradient3: readonly [string, string]; // teal
  featureGradient4: readonly [string, string]; // green
  // Text on gradient/hero backgrounds
  textOnHero: string;
  // Card border colors for review
  cardBorderCorrect: string;
  cardBorderWrong: string;
  cardBorderIdk: string;
}

const lightColors: ThemeColors = {
  bg: '#F5F0FF',
  cardBg: '#FFFFFF',
  textPrimary: '#1A1A2E',
  textSecondary: '#7A7A9A',
  textOnPrimary: '#FFFFFF',
  accent: '#7C4DFF',
  blue: '#5C6BC0',
  border: '#E0D6F2',
  headerBg: '#FFFFFF',
  statBoxBg: '#FFFFFF',
  inputBg: '#F5F0FF',
  danger: '#E53935',
  dangerBg: '#FFF0F0',
  successBg: '#E8F5E9',
  warningBg: '#FFF8E1',
  heroGradient: ['#7C4DFF', '#7E57C2'] as const,
  ctaGradient: ['#FFD54F', '#FFB300'] as const,
  ctaTextColor: '#3d2800',
  statGradient1: ['#FF8A65', '#FF7043'] as const,
  statGradient2: ['#26C6DA', '#00ACC1'] as const,
  statGradient3: ['#43A047', '#2E7D32'] as const,
  featureGradient1: ['#F48FB1', '#EC407A'] as const,
  featureGradient2: ['#CE93D8', '#AB47BC'] as const,
  featureGradient3: ['#26C6DA', '#00897B'] as const,
  featureGradient4: ['#66BB6A', '#43A047'] as const,
  textOnHero: '#FFFFFF',
  cardBorderCorrect: '#43A047',
  cardBorderWrong: '#E53935',
  cardBorderIdk: '#7C4DFF',
};

const darkColors: ThemeColors = {
  bg: '#1A1025',
  cardBg: '#2A1F35',
  textPrimary: '#E8E0F0',
  textSecondary: '#9A8AB0',
  textOnPrimary: '#FFFFFF',
  accent: '#9C6FFF',
  blue: '#7C8BD0',
  border: '#3A2F45',
  headerBg: '#2A1F35',
  statBoxBg: '#2A1F35',
  inputBg: '#1A1025',
  danger: '#EF5350',
  dangerBg: '#3E1A2A',
  successBg: '#1B3D2B',
  warningBg: '#3D2E1B',
  heroGradient: ['#5C2DD5', '#6C3DD5'] as const,
  ctaGradient: ['#C8A732', '#E6A800'] as const,
  ctaTextColor: '#1A1025',
  statGradient1: ['#D96A4E', '#C55A3A'] as const,
  statGradient2: ['#1DA6B8', '#008BA0'] as const,
  statGradient3: ['#36803C', '#256D2A'] as const,
  featureGradient1: ['#C46A8A', '#B85678'] as const,
  featureGradient2: ['#9B6EAF', '#8550A0'] as const,
  featureGradient3: ['#1DA6B8', '#007566'] as const,
  featureGradient4: ['#529655', '#3A7A3D'] as const,
  textOnHero: '#FFFFFF',
  cardBorderCorrect: '#43A047',
  cardBorderWrong: '#EF5350',
  cardBorderIdk: '#9C6FFF',
};

export function useColors(): ThemeColors {
  const theme = useSettingsStore((s) => s.theme as 'light' | 'dark');
  const isDark = theme === 'dark';
  return isDark ? darkColors : lightColors;
}
