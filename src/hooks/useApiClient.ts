import { useMemo } from 'react';
import { DeepseekClient } from '../api/deepseek';
import { useSettingsStore } from '../store/settings';

export function useApiClient(): DeepseekClient | null {
  const apiKey = useSettingsStore((s) => s.apiKey);

  return useMemo(() => {
    if (!apiKey || apiKey.trim() === '') return null;
    return new DeepseekClient(apiKey);
  }, [apiKey]);
}
