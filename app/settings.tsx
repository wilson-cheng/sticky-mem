import React, { useState, useCallback } from 'react';
import Alert from '../src/utils/alertWrapper';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Switch,
} from 'react-native';
import { useTranslation } from '../src/i18n/useTranslation';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useRouter } from 'expo-router';
import { initDatabase } from '../src/hooks/useDatabase';

function LanguageSelector({
  value, onChange, colors,
}: {
  value: 'en' | 'zh-Hans' | 'zh-Hant';
  onChange: (v: 'en' | 'zh-Hans' | 'zh-Hant') => void;
  colors: ReturnType<typeof useColors>;
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
          style={[
            styles.optionChip,
            { backgroundColor: colors.statBoxBg, borderColor: colors.border },
            value === o.value && { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
          onPress={() => onChange(o.value)}
        >
          <Text style={[
            styles.optionChipText,
            { color: colors.textPrimary },
            value === o.value && { color: '#fff', fontWeight: '700' },
          ]}>
            {o.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function ThemeSelector({
  value, onChange, colors,
}: {
  value: 'light' | 'dark';
  onChange: (v: 'light' | 'dark') => void;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.optionsRow}>
      <TouchableOpacity
        style={[
          styles.optionChip,
          { backgroundColor: colors.statBoxBg, borderColor: colors.border },
          value === 'light' && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
        onPress={() => onChange('light')}
      >
        <Text style={[
          styles.optionChipText,
          { color: colors.textPrimary },
          value === 'light' && { color: '#fff', fontWeight: '700' },
        ]}>
            ☀️ {t('settings.light')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.optionChip,
          { backgroundColor: colors.statBoxBg, borderColor: colors.border },
          value === 'dark' && { backgroundColor: colors.accent, borderColor: colors.accent },
        ]}
        onPress={() => onChange('dark')}
      >
        <Text style={[
          styles.optionChipText,
          { color: colors.textPrimary },
          value === 'dark' && { color: '#fff', fontWeight: '700' },
        ]}>
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
    multipleChoiceOnly, setMultipleChoiceOnly,
    theme, setTheme,
    language, setLanguage,
  } = useSettingsStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const router = useRouter();
  const { t } = useTranslation();
  const c = useColors();

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
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('settings.title')}</Text>
      <Text style={[styles.description, { color: c.textSecondary }]}>
        {t('settings.description')}
        Get a key at{' '}
        <Text style={[styles.link, { color: c.blue }]}>platform.deepseek.com</Text>
      </Text>

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.apiKey')}</Text>
      <TextInput
        style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.border, color: c.textPrimary }]}
        value={localKey}
        onChangeText={setLocalKey}
        placeholder="sk-..."
        placeholderTextColor={c.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isConfigured && (
        <View style={[styles.statusBadge, { backgroundColor: c.successBg }]}>
          <Text style={styles.statusText}>✅ {t('settings.apiKeyConfigured')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveButton, { backgroundColor: c.accent }, !localKey.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!localKey.trim()}
      >
        <Text style={styles.saveButtonText}>{t('settings.save')}</Text>
      </TouchableOpacity>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('settings.appearance')}</Text>

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.theme')}</Text>
      <ThemeSelector value={theme} onChange={setTheme} colors={c} />

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.language')}</Text>
      <LanguageSelector value={language} onChange={setLanguage} colors={c} />

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('settings.reviewSettings')}</Text>

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.dailyTarget')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setDailyReviewTarget(Math.max(1, dailyReviewTarget - 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.numberValue, { color: c.textPrimary }]}>{dailyReviewTarget}</Text>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setDailyReviewTarget(Math.min(30, dailyReviewTarget + 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.questionsPerContent')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setQuestionsPerContent(Math.max(3, questionsPerContent - 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.numberValue, { color: c.textPrimary }]}>{questionsPerContent}</Text>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setQuestionsPerContent(Math.min(20, questionsPerContent + 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: c.textPrimary }]}>{t('settings.questionsPerReview')}</Text>
      <Text style={[styles.hint, { color: c.textSecondary }]}>{t('settings.autoHint')}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setQuestionsPerReview(Math.max(0, questionsPerReview - 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.numberValue, { color: c.textPrimary }]}>{questionsPerReview === 0 ? t('settings.auto') : questionsPerReview}</Text>
        <TouchableOpacity
          style={[styles.numberButton, { backgroundColor: c.inputBg }]}
          onPress={() => setQuestionsPerReview(Math.min(50, questionsPerReview + 1))}
        >
          <Text style={[styles.numberButtonText, { color: c.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.switchRow]}>
        <Text style={[styles.label, { color: c.textPrimary, flex: 1, marginBottom: 0, marginTop: 0 }]}>Multiple Choice Only</Text>
        <Switch
          value={multipleChoiceOnly}
          onValueChange={setMultipleChoiceOnly}
          trackColor={{ false: c.border, true: c.accent + '66' }}
          thumbColor={multipleChoiceOnly ? c.accent : c.textSecondary}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: c.border }]} />

      <TouchableOpacity
        style={[styles.manageBtn, { backgroundColor: c.accent + '1A', borderColor: c.accent + '88' }]}
        onPress={() => router.push('/manage')}
      >
        <Text style={[styles.manageBtnText, { color: c.accent }]}>📂 {t('settings.manage')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.dangerBtn, { backgroundColor: c.dangerBg, borderColor: c.dangerBg }]}
        onPress={handleClearAll}
      >
        <Text style={[styles.dangerBtnText, { color: c.danger }]}>🗑️ {t('settings.clearAll')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 24 },
  link: { textDecorationLine: 'underline' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderRadius: 10,
    padding: 14, fontSize: 16,
  },
  statusBadge: {
    padding: 10, borderRadius: 8, marginTop: 12,
    alignItems: 'center',
  },
  statusText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' },
  hint: { fontSize: 12, marginTop: -4, marginBottom: 4 },
  divider: { height: 1, marginVertical: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, gap: 20,
  },
  numberButton: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  numberButtonText: { fontSize: 24, fontWeight: '600' },
  numberValue: { fontSize: 28, fontWeight: '700', minWidth: 40, textAlign: 'center' },
  optionsRow: {
    flexDirection: 'row', gap: 10, marginTop: 4,
  },
  optionChip: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  optionChipText: { fontSize: 14, fontWeight: '500' },
  manageBtn: {
    borderRadius: 10, padding: 14, alignItems: 'center',
    marginBottom: 12, borderWidth: 1,
  },
  switchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16, paddingVertical: 4,
  },
  manageBtnText: { fontSize: 15, fontWeight: '600' },
  saveButton: {
    borderRadius: 10, padding: 14,
    alignItems: 'center', marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  dangerBtn: {
    borderRadius: 10, padding: 14,
    alignItems: 'center', borderWidth: 1,
  },
  dangerBtnText: { fontSize: 15, fontWeight: '600' },
});
