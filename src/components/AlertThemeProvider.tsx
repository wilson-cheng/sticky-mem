import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useColors } from '../theme/useColors';

/**
 * Syncs @blazejkustra/react-native-alert CSS custom properties
 * with the app's light/dark theme colors on web.
 */
export function AlertThemeProvider() {
  const c = useColors();

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const root = document.documentElement;
    root.style.setProperty('--rn-alert-bg', c.cardBg);
    root.style.setProperty('--rn-alert-fg', c.textPrimary);
    root.style.setProperty('--rn-alert-muted', c.textSecondary);
    root.style.setProperty('--rn-alert-surface', c.inputBg);
    root.style.setProperty('--rn-alert-border', c.border);
    root.style.setProperty('--rn-alert-accent', c.accent);
    root.style.setProperty('--rn-alert-accent-hover', c.accent + 'dd');
    root.style.setProperty('--rn-alert-danger', c.danger);
    root.style.setProperty('--rn-alert-danger-hover', c.danger + 'dd');
    root.style.setProperty('--rn-alert-radius', '12px');
    root.style.setProperty('--rn-alert-radius-sm', '8px');
    root.style.setProperty('--rn-alert-spacing', '20px');
    root.style.setProperty('--rn-alert-spacing-sm', '12px');
    root.style.setProperty('--rn-alert-elev', '0 8px 32px rgba(0,0,0,0.2)');
  }, [c]);

  return null;
}
