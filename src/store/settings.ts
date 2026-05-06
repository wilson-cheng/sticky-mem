import { Platform } from 'react-native';
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
  questionsPerContent: number;
  setQuestionsPerContent: (n: number) => void;
}

// Cross-platform storage: localStorage on web, expo-file-system on native
function createStorage() {
  if (Platform.OS === 'web') {
    return {
      getItem: (name: string) => {
        try { return localStorage.getItem(name); }
        catch { return null; }
      },
      setItem: (name: string, value: string) => {
        try { localStorage.setItem(name, value); } catch {}
      },
      removeItem: (name: string) => {
        try { localStorage.removeItem(name); } catch {}
      },
    };
  }

  // Native (Expo Go): use expo-file-system (built-in)
  let FileSystem: any = null;
  const SETTINGS_FILE = () => {
    if (!FileSystem) return 'stickymem-settings.json';
    return FileSystem.documentDirectory + 'stickymem-settings.json';
  };

  return {
    getItem: async (_name: string) => {
      try {
        FileSystem = FileSystem || require('expo-file-system');
        const path = FileSystem.documentDirectory + 'stickymem-settings.json';
        const content = await FileSystem.readAsStringAsync(path);
        return content;
      } catch { return null; }
    },
    setItem: async (_name: string, value: string) => {
      try {
        FileSystem = FileSystem || require('expo-file-system');
        const path = FileSystem.documentDirectory + 'stickymem-settings.json';
        await FileSystem.writeAsStringAsync(path, value);
      } catch {}
    },
    removeItem: async (_name: string) => {
      try {
        FileSystem = FileSystem || require('expo-file-system');
        const path = FileSystem.documentDirectory + 'stickymem-settings.json';
        await FileSystem.deleteAsync(path, { idempotent: true });
      } catch {}
    },
  };
}

const storage = createStorage();

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
      questionsPerContent: 6,
      setQuestionsPerContent: (n: number) => set({ questionsPerContent: n }),
    }),
    {
      name: 'stickymem-settings',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        isConfigured: state.isConfigured,
        dailyReviewTarget: state.dailyReviewTarget,
        contentCount: state.contentCount,
        questionsPerContent: state.questionsPerContent,
      }),
    }
  )
);
