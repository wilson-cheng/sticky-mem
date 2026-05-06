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
  questionsPerReview: number;
  setQuestionsPerReview: (n: number) => void;
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

// ─── Other settings storage (web: localStorage, native: expo-file-system) ─── //

const SETTINGS_FILENAME = 'stickymem-settings.json';

async function loadSettingsBlob(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem('stickymem-settings-blob'); }
    catch { return null; }
  }
  try {
    const FS = await import('expo-file-system');
    const path = FS.documentDirectory + SETTINGS_FILENAME;
    return await FS.readAsStringAsync(path);
  } catch { return null; }
}

async function saveSettingsBlob(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem('stickymem-settings-blob', value); }
    catch {}
    return;
  }
  try {
    const FS = await import('expo-file-system');
    const path = FS.documentDirectory + SETTINGS_FILENAME;
    await FS.writeAsStringAsync(path, value);
  } catch {}
}

async function removeSettingsBlob(): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem('stickymem-settings-blob'); }
    catch {}
    return;
  }
  try {
    const FS = await import('expo-file-system');
    const path = FS.documentDirectory + SETTINGS_FILENAME;
    await FS.deleteAsync(path, { idempotent: true });
  } catch {}
}

// ─── Hybrid storage for zustand persist ─── //

const storage = {
  getItem: async (_name: string): Promise<string | null> => {
    // Load settings blob (excludes apiKey which is stored separately)
    const blob = await loadSettingsBlob();
    if (!blob) return null;
    return blob;
  },
  setItem: async (_name: string, value: string): Promise<void> => {
    await saveSettingsBlob(value);
  },
  removeItem: async (_name: string): Promise<void> => {
    await removeSettingsBlob();
  },
};

// ─── Store creation ─── //

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      apiKey: '',
      setApiKey: (key: string) => {
        set({ apiKey: key, isConfigured: key.trim().length > 0 });
        saveApiKey(key); // fire-and-forget
      },
      isConfigured: false,
      dailyReviewTarget: 5,
      setDailyReviewTarget: (n: number) => set({ dailyReviewTarget: n }),
      contentCount: 0,
      incrementContentCount: () => set((s) => ({ contentCount: s.contentCount + 1 })),
      questionsPerContent: 6,
      setQuestionsPerContent: (n: number) => set({ questionsPerContent: n }),
      questionsPerReview: 0, // 0 = auto (ask all due)
      setQuestionsPerReview: (n: number) => set({ questionsPerReview: n }),
    }),
    {
      name: 'stickymem-settings',
      storage: createJSONStorage(() => storage),
      partialize: (state) => ({
        dailyReviewTarget: state.dailyReviewTarget,
        contentCount: state.contentCount,
        questionsPerContent: state.questionsPerContent,
        questionsPerReview: state.questionsPerReview,
      }),
      // After rehydration, load the API key from SecureStore
      onRehydrateStorage: () => {
        return async (state) => {
          if (state) {
            const key = await loadApiKey();
            (state as any).apiKey = key;
            (state as any).isConfigured = key.trim().length > 0;
          }
        };
      },
    }
  )
);
