import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import AddContentForm from '../src/components/AddContentForm';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import { initDatabase } from '../src/hooks/useDatabase';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';

export default function AddContentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const apiClient = useApiClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<{ title: string; count: number } | null>(null);
  const [lastInput, setLastInput] = useState<string>('');
  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);
  const multipleChoiceOnly = useSettingsStore((s) => s.multipleChoiceOnly);
  const c = useColors();

  const handleSubmit = async (input: string) => {
    if (!apiClient) {
      router.push('/settings');
      return;
    }

    setLastInput(input);
    setIsProcessing(true);

    try {
      // Step 1: Digest the content
      const digest = await digestContent(apiClient, input);

      // Step 2: Generate questions
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title, questionsPerContent, multipleChoiceOnly);

      // Step 3: Save to database
      const repo = await initDatabase();
      await repo.saveContentWithQuestions({
        sourceType: 'text',
        title: digest.title,
        rawText: digest.content,
        summary: digest.summary,
        key_concepts: digest.keyConcepts,
        questions: questions.map((q) => ({
          type: q.type,
          question: q.question,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
        })),
      });

      setSuccess({ title: digest.title, count: questions.length });
    } catch (e: any) {
      setSuccess(null);
      setIsProcessing(false);
      console.error('Content processing failed:', e);
      Alert.alert(
        'Processing Failed',
        `The content was too long or the AI returned an invalid response.\n\n${e.message || 'Unknown error'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Try Again', onPress: () => handleSubmit(lastInput) },
        ],
      );
      return;
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <View style={[styles.successContainer, { backgroundColor: c.bg }]}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={[styles.successTitle, { color: c.textPrimary }]}>{t('add.successTitle')}</Text>
        <Text style={[styles.successSubtitle, { color: c.textSecondary }]}>"{success.title}"</Text>
        <View style={[styles.successCountBox, { backgroundColor: c.successBg }]}>
          <Text style={styles.successCountNum}>{success.count}</Text>
          <Text style={styles.successCountLabel}>{t('add.questionsGenerated')}</Text>
        </View>
        <TouchableOpacity
          style={[styles.reviewButton, { backgroundColor: c.blue }]}
          onPress={() => {
            setSuccess(null);
            // Dismiss all modals first so review pushes onto clean stack
            router.dismissAll();
            setTimeout(() => router.push('/review'), 50);
          }}
        >
          <Text style={styles.reviewButtonText}>{t('add.startReview')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/')}
        >
          <Text style={[styles.homeButtonText, { color: c.textSecondary }]}>{t('add.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: c.textPrimary }]}>{t('add.title')}</Text>
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          {t('add.subtitle')}
        </Text>
        <AddContentForm onSubmit={handleSubmit} isProcessing={isProcessing} />
        {isProcessing && (
          <View style={[styles.processingBox, { backgroundColor: '#E3F2FD' }]}>
            <Text style={styles.processingText}>{t('add.processingTitle')}</Text>
            <Text style={styles.processingDetail}>
              {t('add.processingDetail', { count: questionsPerContent })}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 14, paddingHorizontal: 20, paddingBottom: 8, lineHeight: 20 },
  processingBox: {
    margin: 20, padding: 16, borderRadius: 12,
    alignItems: 'center', gap: 8,
  },
  processingText: { fontSize: 16, fontWeight: '600', color: '#1565C0' },
  processingDetail: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  successSubtitle: {
    fontSize: 16, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 24, lineHeight: 22,
  },
  successCountBox: {
    borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 32, width: '100%',
  },
  successCountNum: { fontSize: 48, fontWeight: '800', color: '#2E7D32' },
  successCountLabel: { fontSize: 14, color: '#388E3C', marginTop: 4 },
  reviewButton: {
    borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 48, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  reviewButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  homeButton: {
    paddingVertical: 12, paddingHorizontal: 48, alignItems: 'center',
  },
  homeButtonText: { fontSize: 15, fontWeight: '500' },
});
