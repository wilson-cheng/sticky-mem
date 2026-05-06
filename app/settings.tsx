import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useSettingsStore } from '../src/store/settings';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { apiKey, setApiKey, isConfigured, dailyReviewTarget, setDailyReviewTarget, questionsPerContent, setQuestionsPerContent } = useSettingsStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const router = useRouter();

  const handleSave = () => {
    if (localKey.trim() && !localKey.startsWith('sk-')) {
      Alert.alert('Warning', 'DeepSeek API keys usually start with "sk-". Please verify your key.');
      return;
    }
    setApiKey(localKey.trim());
    Alert.alert('Saved', 'API key has been saved locally.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>API Configuration</Text>
      <Text style={styles.description}>
        StickyMem uses your own DeepSeek API key. No data is sent anywhere else.
        Get a key at{' '}
        <Text style={styles.link}>platform.deepseek.com</Text>
      </Text>

      <Text style={styles.label}>DeepSeek API Key</Text>
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
          <Text style={styles.statusText}>✅ API key configured</Text>
        </View>
      )}

      <Text style={styles.label}>Daily Review Target</Text>
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

      <Text style={styles.label}>Questions per Content</Text>
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

      <TouchableOpacity
        style={styles.manageBtn}
        onPress={() => router.push('/manage')}
      >
        <Text style={styles.manageBtnText}>📂 Manage Content</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.saveButton, !localKey.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!localKey.trim()}
      >
        <Text style={styles.saveButtonText}>Save</Text>
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
  manageBtn: {
    backgroundColor: '#F0EDFF', borderRadius: 10, padding: 14, alignItems: 'center',
    marginTop: 20, borderWidth: 1, borderColor: '#D5D0FF',
  },
  manageBtnText: { color: '#6C63FF', fontSize: 15, fontWeight: '600' },
  saveButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
