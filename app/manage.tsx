import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { initDatabase } from '../src/hooks/useDatabase';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import type { Content } from '../src/types';
import { useSettingsStore } from '../src/store/settings';

export default function ManageContentScreen() {
  const router = useRouter();
  const apiClient = useApiClient();
  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  const loadContents = async () => {
    try {
      const repo = await initDatabase();
      const allContents = await repo.getAllContents();
      setContents(allContents);
    } catch (e) {
      console.error('Failed to load contents:', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadContents();
    }, []),
  );

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      'Delete Content',
      `Delete "${title}" and all its questions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const repo = await initDatabase();
              await repo.deleteQuestionsByContentId(id);
              await repo.deleteContent(id);
              setContents(prev => prev.filter(c => c.id !== id));
            } catch (e) {
              console.error('Failed to delete:', e);
            }
          },
        },
      ],
    );
  };

  const handleRegenerate = async (content: Content) => {
    if (!apiClient) {
      Alert.alert('API Key Required', 'Please set your API key in settings first.');
      router.push('/settings');
      return;
    }
    setRegeneratingId(content.id);
    try {
      const repo = await initDatabase();
      const digest = await digestContent(apiClient, content.rawText);
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title, questionsPerContent);

      // Delete old questions & cards for this content
      await repo.deleteQuestionsByContentId(content.id);

      // Insert new questions with initial cards
      const now = Date.now();
      for (const q of questions) {
        const questionId = `${now}-${Math.random().toString(36).slice(6)}`;
        await repo.insertQuestion({
          id: questionId,
          contentId: content.id,
          type: q.type as 'multiple_choice' | 'short_answer',
          question: q.question,
          correctAnswer: q.correctAnswer,
          options: q.options,
          explanation: q.explanation,
          createdAt: now,
        });
        await repo.upsertCard({
          questionId,
          easiness: 2.5,
          interval: 0,
          repetitions: 0,
          nextReviewAt: now,
          lastReviewAt: 0,
        });
      }

      Alert.alert('Done', `Regenerated ${questions.length} questions for "${content.title}"`);
    } catch (e: any) {
      console.error('Regeneration failed:', e);
      Alert.alert('Error', e.message || 'Failed to regenerate questions');
    } finally {
      setRegeneratingId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Your Content</Text>
      {contents.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📝</Text>
          <Text style={styles.emptyText}>No content yet.</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add')}>
            <Text style={styles.addButtonText}>Add Your First Content</Text>
          </TouchableOpacity>
        </View>
      ) : (
        contents.map((c) => (
          <View key={c.id} style={styles.contentCard}>
            <View style={styles.contentHeader}>
              <Text style={styles.contentTitle} numberOfLines={1}>{c.title}</Text>
              <Text style={styles.contentDate}>
                {new Date(c.createdAt).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.contentActions}>
              <TouchableOpacity
                style={styles.regenerateBtn}
                onPress={() => handleRegenerate(c)}
                disabled={regeneratingId === c.id}
              >
                {regeneratingId === c.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.regenerateBtnText}>🔄 Regenerate</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(c.id, c.title)}
              >
                <Text style={styles.deleteBtnText}>🗑️ Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  title: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center' },
  addButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  contentCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  contentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  contentTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1, marginRight: 8 },
  contentDate: { fontSize: 12, color: '#999' },
  contentActions: { flexDirection: 'row', gap: 10 },
  regenerateBtn: {
    flex: 1, backgroundColor: '#6C63FF', borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  regenerateBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: '#FFEBEE', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  deleteBtnText: { color: '#C62828', fontSize: 14, fontWeight: '600' },
});
