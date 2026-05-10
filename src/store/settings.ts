import { Platform } from 'react-native';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
  isHydrated: boolean;
  dailyReviewTarget: number;
  setDailyReviewTarget: (n: number) => void;
  contentCount: number;
  incrementContentCount: () => void;
  questionsPerContent: number;
  setQuestionsPerContent: (n: number) => void;
  questionsPerDay: number;
  setQuestionsPerDay: (n: number) => void;
  lastReviewDate: string;
  setLastReviewDate: (d: string) => void;
  theme: 'light' | 'dark';
  setTheme: (t: 'light' | 'dark') => void;
  language: 'en' | 'zh-Hans' | 'zh-Hant';
  setLanguage: (l: 'en' | 'zh-Hans' | 'zh-Hant') => void;
  multipleChoiceOnly: boolean;
  setMultipleChoiceOnly: (v: boolean) => void;
  hasSeenOnboarding: boolean;
  setHasSeenOnboarding: (v: boolean) => void;
}

// ─── API Key storage (web: localStorage, native: expo-secure-store) ─── //

let _secureApiKey: string | null = null;

async function loadApiKey(): Promise<string> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem('stickymem-apikey') ?? ''; }
    catch { return ''; }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    const key = await SecureStore.getItemAsync('stickymem-apikey');
    return key ?? '';
  } catch { return ''; }
}

async function saveApiKey(key: string): Promise<void> {
  _secureApiKey = key;
  if (Platform.OS === 'web') {
    try { localStorage.setItem('stickymem-apikey', key); }
    catch {}
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync('stickymem-apikey', key);
  } catch {}
}

async function removeApiKey(): Promise<void> {
  _secureApiKey = null;
  if (Platform.OS === 'web') {
    try { localStorage.removeItem('stickymem-apikey'); }
    catch {}
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync('stickymem-apikey');
  } catch {}
}

// ─── Store creation ─── //

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key: string) => {
        set({ apiKey: key, isConfigured: key.trim().length > 0 });
        saveApiKey(key);
      },
      isConfigured: false,
      isHydrated: false,
      dailyReviewTarget: 5,
      setDailyReviewTarget: (n: number) => set({ dailyReviewTarget: n }),
      contentCount: 0,
      incrementContentCount: () => set((s) => ({ contentCount: s.contentCount + 1 })),
      questionsPerContent: 6,
      setQuestionsPerContent: (n: number) => set({ questionsPerContent: n }),
      questionsPerDay: 10,
      setQuestionsPerDay: (n: number) => set({ questionsPerDay: n }),
      lastReviewDate: '',
      setLastReviewDate: (d: string) => set({ lastReviewDate: d }),
      theme: 'light',
      setTheme: (t: 'light' | 'dark') => set({ theme: t }),
      language: 'en',
      setLanguage: (l: 'en' | 'zh-Hans' | 'zh-Hant') => set({ language: l }),
      multipleChoiceOnly: false,
      setMultipleChoiceOnly: (v: boolean) => set({ multipleChoiceOnly: v }),
      hasSeenOnboarding: false,
      setHasSeenOnboarding: (v: boolean) => set({ hasSeenOnboarding: v }),
    }),
    {
      name: 'stickymem-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dailyReviewTarget: state.dailyReviewTarget,
        contentCount: state.contentCount,
        questionsPerContent: state.questionsPerContent,
        questionsPerDay: state.questionsPerDay,
        lastReviewDate: state.lastReviewDate,
        theme: state.theme,
        language: state.language,
        multipleChoiceOnly: state.multipleChoiceOnly,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
      onRehydrateStorage: () => {
        return async (state) => {
          if (state) {
            const key = await loadApiKey();
            (state as any).apiKey = key;
            (state as any).isConfigured = key.trim().length > 0;
            (state as any).isHydrated = true;
          }
        };
      },
    }
  )
);
