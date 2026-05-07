import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AddContentForm from '../src/components/AddContentForm';
import MarkdownEditor from '../src/components/MarkdownEditor';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import { initDatabase } from '../src/hooks/useDatabase';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';

type Stage = 'input' | 'editing' | 'processing' | 'success';

export default function AddContentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const apiClient = useApiClient();
  const c = useColors();
  const { height: winH } = useWindowDimensions();

  const [stage, setStage] = useState<Stage>('input');
  const [editingContent, setEditingContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<{ title: string; count: number } | null>(null);
  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);
  const multipleChoiceOnly = useSettingsStore((s) => s.multipleChoiceOnly);

  // Step 1: User submitted text/URL → move to editing stage
  const handleSubmit = async (input: string) => {
    setEditingContent(input);
    setStage('editing');
  };

  // Step 2: User finished editing → digest + generate + save
  const handleSaveAndGenerate = async () => {
    if (!apiClient) {
      router.push('/settings');
      return;
    }

    if (!editingContent.trim()) {
      Alert.alert('Empty Content', 'Please add some content before generating questions.');
      return;
    }

    setIsProcessing(true);
    setStage('processing');

    try {
      // Step 2a: Digest the edited content (extract title, summary, concepts)
      const digest = await digestContent(apiClient, editingContent);

      // Step 2b: Generate questions
      const questions = await generateQuestions(
        apiClient, digest.keyConcepts, digest.title,
        questionsPerContent, multipleChoiceOnly
      );

      // Step 2c: Save to database (store the EDITED markdown as rawText)
      const repo = await initDatabase();
      await repo.saveContentWithQuestions({
        sourceType: 'text',
        title: digest.title,
        rawText: editingContent, // ← store the user-edited markdown
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
      setStage('success');
    } catch (e: any) {
      setStage('editing');
      setIsProcessing(false);
      console.error('Content processing failed:', e);
      Alert.alert(
        'Processing Failed',
        `The content was too long or the AI returned an invalid response.\n\n${e.message || 'Unknown error'}`,
        [{ text: 'OK' }],
      );
    }
  };

  const handleBackToInput = () => {
    setStage('input');
    setEditingContent('');
    setIsProcessing(false);
  };

  // ─── Success Screen ─── //
  if (stage === 'success' && success) {
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
            setStage('input');
            router.dismissAll();
            setTimeout(() => router.push('/review'), 50);
          }}
        >
          <Text style={styles.reviewButtonText}>{t('add.startReview')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            setSuccess(null);
            setStage('input');
            router.replace('/');
          }}
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
      <ScrollView
        style={[styles.container, { backgroundColor: c.bg }]}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={stage === 'editing' ? { flexGrow: 1 } : undefined}
      >
        {stage === 'input' && (
          <>
            <Text style={[styles.title, { color: c.textPrimary }]}>{t('add.title')}</Text>
            <Text style={[styles.subtitle, { color: c.textSecondary }]}>
              {t('add.subtitle')}
            </Text>
            <AddContentForm onSubmit={handleSubmit} isProcessing={false} />
          </>
        )}

        {stage === 'editing' && (
          <View style={{ flex: 1, minHeight: winH - 120 }}>
            {/* Header */}
            <View style={styles.editorHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.editorTitle, { color: c.textPrimary }]}>
                  Review & Edit Content
                </Text>
                <Text style={[styles.editorSubtitle, { color: c.textSecondary }]}>
                  Edit your content, then save to generate questions.
                </Text>
              </View>
              <TouchableOpacity onPress={handleBackToInput}>
                <Text style={[styles.cancelBtn, { color: c.blue }]}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {/* Toolbar preview hint */}
            <Text style={[styles.editorHint, { color: c.textSecondary }]}>
              Use the toolbar to format text (bold, headings, lists, etc.)
            </Text>

            {/* Editor */}
            <View style={styles.editorWrapper}>
              <MarkdownEditor
                value={editingContent}
                onChange={setEditingContent}
                placeholder="Edit your content before generating questions..."
                minHeight={Math.max(300, winH - 300)}
              />
            </View>

            {/* Save button */}
            <View style={[styles.saveBar, { borderTopColor: c.border }]}>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: c.blue }]}
                onPress={handleSaveAndGenerate}
              >
                <Text style={styles.saveBtnText}>
                  Save & Generate Questions
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {stage === 'processing' && (
          <View style={styles.processingContainer}>
            <Text style={[styles.processingTitle, { color: c.textPrimary }]}>
              {t('add.processingTitle')}
            </Text>
            <Text style={[styles.processingDetail, { color: c.textSecondary }]}>
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
  // Editor stage
  editorHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 16, paddingBottom: 4,
  },
  editorTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  editorSubtitle: { fontSize: 13, lineHeight: 18 },
  cancelBtn: { fontSize: 15, fontWeight: '500', paddingLeft: 12, paddingTop: 4 },
  editorHint: {
    fontSize: 12, paddingHorizontal: 16, paddingBottom: 4,
    lineHeight: 16,
  },
  editorWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  // Processing
  processingContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  processingTitle: { fontSize: 16, fontWeight: '600' },
  processingDetail: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  // Success
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
