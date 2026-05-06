import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
  dailyReviewTarget: number;
  setDailyReviewTarget: (n: number) => void;
  contentCount: number;
  incrementContentCount: () => void;
}

const storage = {
  getItem: (name: string) => {
    try {
      const val = localStorage.getItem(name);
      return val;
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {}
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {}
  },
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key: string) => set({ apiKey: key, isConfigured: key.trim().length > 0 }),
      isConfigured: false,
      dailyReviewTarget: 5,
      setDailyReviewTarget: (n: number) => set({ dailyReviewTarget: n }),
      contentCount: 0,
      incrementContentCount: () => set((s) => ({ contentCount: s.contentCount + 1 })),
    }),
    {
      name: 'stickymem-settings',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        isConfigured: state.isConfigured,
        dailyReviewTarget: state.dailyReviewTarget,
        contentCount: state.contentCount,
      }),
    }
  )
);
