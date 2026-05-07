import { Platform } from 'react-native';
import AlertBase from '@blazejkustra/react-native-alert';
import { useSettingsStore } from '../store/settings';

/**
 * Wraps @blazejkustra/react-native-alert to inject userInterfaceStyle
 * based on the app's theme setting (light/dark).
 *
 * On iOS: forces the native alert to match the app theme.
 * On Android/Web: passes through unchanged (Android native Alert
 * follows system theme; Web uses AlertThemeProvider CSS variables).
 */
const wrappedAlert: typeof AlertBase.alert = (title, message, buttons, options) => {
  const theme = useSettingsStore.getState().theme;
  AlertBase.alert(title, message, buttons, {
    ...options,
    userInterfaceStyle:
      Platform.OS === 'ios'
        ? (theme === 'dark' ? 'dark' : 'light')
        : undefined,
  });
};

const Alert = {
  ...AlertBase,
  alert: wrappedAlert,
};

export default Alert;
