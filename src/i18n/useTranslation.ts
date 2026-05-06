import { useSettingsStore } from '../store/settings';
import { t, type Language } from './translations';

export function useTranslation() {
  const language = useSettingsStore((s) => s.language as Language);
  return {
    t: (key: string, params?: Record<string, string | number>) => t(language, key, params),
    language,
  };
}
