import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
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
  const incrementContentCount = useSettingsStore((s) => s.incrementContentCount);

  const handleSubmit = async (input: string) => {
    if (!apiClient) {
      Alert.alert('API Key Required', 'Please configure your DeepSeek API key in Settings first.');
      router.push('/settings');
      return;
    }

    setIsProcessing(true);
    let contentTitle: string | null = null;

    try {
      // Step 1: Digest the content
      const digest = await digestContent(apiClient, input);
      contentTitle = digest.title;

      // Step 2: Generate questions
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title);

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

      incrementContentCount();
      Alert.alert(
        'Done!',
        `"${digest.title}" has been processed.\n${questions.length} questions generated.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to process content. Please try again.');
      console.error('Content processing failed:', e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Add Content</Text>
      <Text style={styles.subtitle}>
        Paste text or a URL, and StickyMem will digest it into spaced-repetition questions.
      </Text>
      <AddContentForm onSubmit={handleSubmit} isProcessing={isProcessing} />
      {isProcessing && (
        <View style={styles.processingBox}>
          <Text style={styles.processingText}>Processing content...</Text>
          <Text style={styles.processingDetail}>
            Your DeepSeek key is being used to generate recall questions. This may take a few seconds.
          </Text>
        </View>
      )}
    </ScrollView>
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
});
