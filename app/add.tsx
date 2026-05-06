import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import AddContentForm from '../src/components/AddContentForm';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import { initDatabase } from '../src/hooks/useDatabase';
import { useSettingsStore } from '../src/store/settings';

export default function AddContentScreen() {
  const router = useRouter();
  const apiClient = useApiClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<{ title: string; count: number } | null>(null);
  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);

  const handleSubmit = async (input: string) => {
    if (!apiClient) {
      router.push('/settings');
      return;
    }

    setIsProcessing(true);

    try {
      // Step 1: Digest the content
      const digest = await digestContent(apiClient, input);

      // Step 2: Generate questions
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title, questionsPerContent);

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
      console.error('Content processing failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  if (success) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Content Added!</Text>
        <Text style={styles.successSubtitle}>"{success.title}"</Text>
        <View style={styles.successCountBox}>
          <Text style={styles.successCountNum}>{success.count}</Text>
          <Text style={styles.successCountLabel}>questions generated</Text>
        </View>
        <TouchableOpacity
          style={styles.reviewButton}
          onPress={() => {
            setSuccess(null);
            router.push('/review');
          }}
        >
          <Text style={styles.reviewButtonText}>Start Review Now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.homeButtonText}>Back to Home</Text>
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
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Add Content</Text>
        <Text style={styles.subtitle}>
          Paste text or a URL, and StickyMem will digest it into spaced-repetition questions.
        </Text>
        <AddContentForm onSubmit={handleSubmit} isProcessing={isProcessing} />
        {isProcessing && (
          <View style={styles.processingBox}>
            <Text style={styles.processingText}>Processing content...</Text>
            <Text style={styles.processingDetail}>
              Your DeepSeek key is being used to generate {questionsPerContent} recall questions. This may take a few seconds.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  title: { fontSize: 24, fontWeight: '700', color: '#333', padding: 20, paddingBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', paddingHorizontal: 20, paddingBottom: 8, lineHeight: 20 },
  processingBox: {
    margin: 20, padding: 16, backgroundColor: '#E3F2FD', borderRadius: 12,
    alignItems: 'center', gap: 8,
  },
  processingText: { fontSize: 16, fontWeight: '600', color: '#1565C0' },
  processingDetail: { fontSize: 13, color: '#666', textAlign: 'center', lineHeight: 18 },
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F5F5', padding: 32,
  },
  successIcon: { fontSize: 64, marginBottom: 16 },
  successTitle: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  successSubtitle: {
    fontSize: 16, color: '#666', textAlign: 'center',
    fontStyle: 'italic', marginBottom: 24, lineHeight: 22,
  },
  successCountBox: {
    backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20,
    alignItems: 'center', marginBottom: 32, width: '100%',
  },
  successCountNum: { fontSize: 48, fontWeight: '800', color: '#2E7D32' },
  successCountLabel: { fontSize: 14, color: '#388E3C', marginTop: 4 },
  reviewButton: {
    backgroundColor: '#4A90D9', borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 48, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  reviewButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  homeButton: {
    paddingVertical: 12, paddingHorizontal: 48, alignItems: 'center',
  },
  homeButtonText: { color: '#888', fontSize: 15, fontWeight: '500' },
});
