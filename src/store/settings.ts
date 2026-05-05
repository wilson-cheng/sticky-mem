import { create } from 'zustand';

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
  dailyReviewTarget: number;
  setDailyReviewTarget: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: '',
  setApiKey: (key: string) => set({ apiKey: key, isConfigured: key.trim().length > 0 }),
  isConfigured: false,
  dailyReviewTarget: 5,
  setDailyReviewTarget: (n: number) => set({ dailyReviewTarget: n }),
}));
