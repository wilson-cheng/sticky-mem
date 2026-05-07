import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { initDatabase } from '../src/hooks/useDatabase';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import ContentEditorModal from '../src/components/ContentEditorModal';
import type { Content } from '../src/types';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';

export default function ManageContentScreen() {
  const router = useRouter();
  const apiClient = useApiClient();
  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);
  const multipleChoiceOnly = useSettingsStore((s) => s.multipleChoiceOnly);
  const c = useColors();
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);

  // Editor modal state
  const [editorVisible, setEditorVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);

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
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title, questionsPerContent, multipleChoiceOnly);

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

  const handleViewContent = (content: Content) => {
    setEditingContent(content);
    setEditorVisible(true);
  };

  const handleSaveContent = async (newMarkdown: string) => {
    if (!editingContent) return;
    const repo = await initDatabase();
    await repo.updateContent(editingContent.id, newMarkdown);
    // Update local state
    setContents(prev => prev.map(c =>
      c.id === editingContent.id ? { ...c, rawText: newMarkdown } : c
    ));
    setEditingContent(prev => prev ? { ...prev, rawText: newMarkdown } : null);
  };

  const handleRegenerateContent = async (newMarkdown: string) => {
    if (!editingContent || !apiClient) return;
    const repo = await initDatabase();
    const digest = await digestContent(apiClient, newMarkdown);
    const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title, questionsPerContent, multipleChoiceOnly);

    await repo.deleteQuestionsByContentId(editingContent.id);

    const now = Date.now();
    for (const q of questions) {
      const questionId = `${now}-${Math.random().toString(36).slice(6)}`;
      await repo.insertQuestion({
        id: questionId,
        contentId: editingContent.id,
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
    // Refresh contents list to show updated data
    await loadContents();
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: c.textPrimary }]}>Your Content</Text>
        {contents.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📝</Text>
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>No content yet.</Text>
            <TouchableOpacity style={[styles.addButton, { backgroundColor: c.blue }]} onPress={() => router.push('/add')}>
              <Text style={styles.addButtonText}>Add Your First Content</Text>
            </TouchableOpacity>
          </View>
        ) : (
          contents.map((item) => (
            <View key={item.id} style={[styles.contentCard, { backgroundColor: c.inputBg, borderColor: c.border }]}>
              {/* Header row */}
              <View style={styles.contentHeader}>
                <Text style={[styles.contentTitle, { color: c.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <Text style={[styles.contentDate, { color: c.textSecondary }]}>
                  {new Date(item.createdAt).toLocaleDateString()}
                </Text>
              </View>

              {/* Preview of content */}
              <Text style={[styles.contentPreview, { color: c.textSecondary }]} numberOfLines={2}>
                {item.rawText?.slice(0, 150) || 'No content'}
              </Text>

              {/* Action buttons row */}
              <View style={[styles.contentActions, { borderTopWidth: 1, borderTopColor: c.border }]}>
                <TouchableOpacity
                  style={[styles.viewBtn, { backgroundColor: c.blue }]}
                  onPress={() => handleViewContent(item)}
                >
                  <Text style={[styles.viewBtnText, { color: '#fff' }]}>📄 View Content</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.regenerateBtn, { backgroundColor: c.blue }]}
                  onPress={() => handleRegenerate(item)}
                  disabled={regeneratingId === item.id}
                >
                  {regeneratingId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={[styles.regenerateBtnText, { color: '#fff' }]}>🔄 Regenerate</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteBtn, { backgroundColor: c.blue }]}
                  onPress={() => handleDelete(item.id, item.title)}
                >
                  <Text style={[styles.deleteBtnText, { color: '#fff' }]}>🗑️ Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Slide-up WYSIWYG editor modal */}
      {editingContent && (
        <ContentEditorModal
          visible={editorVisible}
          onClose={() => {
            setEditorVisible(false);
            setEditingContent(null);
          }}
          contentId={editingContent.id}
          title={editingContent.title}
          markdown={editingContent.rawText}
          onSave={handleSaveContent}
          onRegenerate={handleRegenerateContent}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 20 },
  emptyState: { alignItems: 'center', marginTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 16, textAlign: 'center' },
  addButton: {
    borderRadius: 10, paddingHorizontal: 24, paddingVertical: 14,
  },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  contentCard: {
    borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1.5,
  },
  contentHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4,
  },
  contentTitle: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 8 },
  contentDate: { fontSize: 12 },
  contentPreview: {
    fontSize: 13, lineHeight: 18, marginBottom: 10,
  },
  contentActions: { flexDirection: 'row', gap: 8, paddingTop: 10 },
  viewBtn: {
    borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  viewBtnText: { fontSize: 13, fontWeight: '600' },
  regenerateBtn: {
    flex: 1, borderRadius: 8,
    paddingVertical: 10, alignItems: 'center',
  },
  regenerateBtnText: { fontSize: 14, fontWeight: '600' },
  deleteBtn: {
    borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
});
