import React, { useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useTranslation } from '../src/i18n/useTranslation';
import { useSettingsStore } from '../src/store/settings';
import { useRouter } from 'expo-router';
import { initDatabase } from '../src/hooks/useDatabase';

function LanguageSelector({
  value, onChange,
}: {
  value: 'en' | 'zh-Hans' | 'zh-Hant';
  onChange: (v: 'en' | 'zh-Hans' | 'zh-Hant') => void;
}) {
  const options: { label: string; value: 'en' | 'zh-Hans' | 'zh-Hant' }[] = [
    { label: 'English', value: 'en' },
    { label: '简体中文', value: 'zh-Hans' },
    { label: '繁體中文', value: 'zh-Hant' },
  ];
  return (
    <View style={styles.optionsRow}>
      {options.map((o) => (
        <TouchableOpacity
          key={o.value}
          style={[styles.optionChip, value === o.value && styles.optionChipActive]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[styles.optionChipText, value === o.value && styles.optionChipTextActive]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ThemeSelector({
  value, onChange,
}: {
  value: 'light' | 'dark';
  onChange: (v: 'light' | 'dark') => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.optionsRow}>
      <TouchableOpacity
        style={[styles.optionChip, value === 'light' && styles.optionChipActive]}
        onPress={() => onChange('light')}
      >
        <Text style={[styles.optionChipText, value === 'light' && styles.optionChipTextActive]}>
            ☀️ {t('settings.light')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.optionChip, value === 'dark' && styles.optionChipActive]}
        onPress={() => onChange('dark')}
      >
        <Text style={[styles.optionChipText, value === 'dark' && styles.optionChipTextActive]}>
            🌙 {t('settings.dark')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsScreen() {
  const {
    apiKey, setApiKey, isConfigured,
    dailyReviewTarget, setDailyReviewTarget,
    questionsPerContent, setQuestionsPerContent,
    questionsPerReview, setQuestionsPerReview,
    theme, setTheme,
    language, setLanguage,
  } = useSettingsStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const router = useRouter();
  const { t } = useTranslation();

  const handleSave = () => {
    if (localKey.trim() && !localKey.startsWith('sk-')) {
      Alert.alert(t('settings.apiKeyWarning'), t('settings.apiKeyWarning'));
      return;
    }
    setApiKey(localKey.trim());
    Alert.alert(t('settings.apiKeySaved'), t('settings.apiKeySaved'), [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const handleClearAll = useCallback(() => {
    Alert.alert(
      t('settings.clearAllTitle'),
      t('settings.clearAllConfirm'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        {
          text: t('settings.clearEverything'),
          style: 'destructive',
          onPress: async () => {
            try {
              const repo = await initDatabase();
              await repo.clearAll();
              Alert.alert(t('settings.clearAllDone'), t('settings.clearAllDone'));
            } catch (e) {
              console.error('Failed to clear all:', e);
              Alert.alert(t('settings.clearAllError'), t('settings.clearAllError'));
            }
          },
        },
      ]
    );
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>{t('settings.title')}</Text>
      <Text style={styles.description}>
        {t('settings.description')}
        Get a key at{' '}
        <Text style={styles.link}>platform.deepseek.com</Text>
      </Text>

      <Text style={styles.label}>{t('settings.apiKey')}</Text>
      <TextInput
        style={styles.input}
        value={localKey}
        onChangeText={setLocalKey}
        placeholder="sk-..."
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isConfigured && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✅ {t('settings.apiKeyConfigured')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, !localKey.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!localKey.trim()}
      >
        <Text style={styles.saveButtonText}>{t('settings.save')}</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{t('settings.appearance')}</Text>

      <Text style={styles.label}>{t('settings.theme')}</Text>
      <ThemeSelector value={theme} onChange={setTheme} />

      <Text style={styles.label}>{t('settings.language')}</Text>
      <LanguageSelector value={language} onChange={setLanguage} />

      <View style={styles.divider} />

      <Text style={styles.sectionTitle}>{t('settings.reviewSettings')}</Text>

      <Text style={styles.label}>{t('settings.dailyTarget')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setDailyReviewTarget(Math.max(1, dailyReviewTarget - 1))}
        >
          <Text style={styles.numberButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.numberValue}>{dailyReviewTarget}</Text>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setDailyReviewTarget(Math.min(30, dailyReviewTarget + 1))}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('settings.questionsPerContent')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setQuestionsPerContent(Math.max(3, questionsPerContent - 1))}
        >
          <Text style={styles.numberButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.numberValue}>{questionsPerContent}</Text>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setQuestionsPerContent(Math.min(20, questionsPerContent + 1))}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.label}>{t('settings.questionsPerReview')}</Text>
      <Text style={styles.hint}>{t('settings.autoHint')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setQuestionsPerReview(Math.max(0, questionsPerReview - 1))}
        >
          <Text style={styles.numberButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.numberValue}>{questionsPerReview === 0 ? t('settings.auto') : questionsPerReview}</Text>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setQuestionsPerReview(Math.min(50, questionsPerReview + 1))}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.manageBtn}
        onPress={() => router.push('/manage')}
      >
        <Text style={styles.manageBtnText}>📂 {t('settings.manage')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dangerBtn}
        onPress={handleClearAll}
      >
        <Text style={styles.dangerBtnText}>🗑️ {t('settings.clearAll')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#333' },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  link: { color: '#4A90D9', textDecorationLine: 'underline' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginTop: 12,
    alignItems: 'center',
  },
  statusText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, color: '#999', marginTop: -4, marginBottom: 4 },
  divider: { height: 1, backgroundColor: '#EEE', marginVertical: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, gap: 20,
  },
  numberButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  numberButtonText: { fontSize: 24, color: '#333', fontWeight: '600' },
  numberValue: { fontSize: 28, fontWeight: '700', color: '#333', minWidth: 40, textAlign: 'center' },
  optionsRow: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  optionChip: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center', backgroundColor: '#F5F5F5',
    borderWidth: 1.5, borderColor: '#E0E0E0',
  },
  optionChipActive: {
    backgroundColor: '#E8E0FF', borderColor: '#6C63FF',
  },
  optionChipText: { fontSize: 14, fontWeight: '500', color: '#666' },
  optionChipTextActive: { color: '#6C63FF', fontWeight: '700' },
  manageBtn: {
    backgroundColor: '#F0EDFF', borderRadius: 10, padding: 14, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: '#D5D0FF',
  },
  manageBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  saveButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerBtn: {
    backgroundColor: '#FFF0F0', borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#FFCDD2',
  },
  dangerBtnText: { color: '#C62828', fontSize: 15, fontWeight: '600' },
});
