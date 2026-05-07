import React, { useState, useEffect, useRef } from 'react';
import Alert from '@blazejkustra/react-native-alert';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  KeyboardAvoidingView, Platform, Keyboard, Animated,
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

  const [stage, setStage] = useState<Stage>('input');
  const [editingContent, setEditingContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState<{
    title: string;
    count: number;
    summary: string;
    concepts: string[];
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const questionsPerContent = useSettingsStore((s) => s.questionsPerContent);
  const multipleChoiceOnly = useSettingsStore((s) => s.multipleChoiceOnly);

  // Processing animation
  const processingSteps = [
    t('add.processingStep'),
    t('add.processingStep2'),
    t('add.processingStep3'),
  ];
  const [currentStep, setCurrentStep] = useState(0);
  const stepOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;

  // Emoji burst
  const emojiAnims = useRef(
    Array.from({ length: 8 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;
  const burstEmojis = ['🎉', '✨', '🌟', '⭐', '🔥', '💡', '🧠', '🎯'];

  useEffect(() => {
    if (stage === 'processing') {
      setCurrentStep(0);
      stepOpacity.setValue(1);
    }
  }, [stage]);

  useEffect(() => {
    if (stage !== 'processing') return;
    const timer = setTimeout(() => {
      if (currentStep < processingSteps.length - 1) {
        setCurrentStep((s) => s + 1);
        Animated.sequence([
          Animated.timing(stepOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
          Animated.timing(stepOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]).start();
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [currentStep, stage]);

  useEffect(() => {
    if (stage === 'success') {
      Animated.spring(successScale, {
        toValue: 1, friction: 4, tension: 40, useNativeDriver: true,
      }).start();
      // Emoji burst
      emojiAnims.forEach((anim, i) => {
        const angle = (i / emojiAnims.length) * Math.PI * 2;
        const distance = 80 + Math.random() * 60;
        anim.x.setValue(0);
        anim.y.setValue(0);
        anim.scale.setValue(0);
        anim.opacity.setValue(1);
        Animated.parallel([
          Animated.spring(anim.x, {
            toValue: Math.cos(angle) * distance, friction: 6, tension: 40, useNativeDriver: true,
          }),
          Animated.spring(anim.y, {
            toValue: Math.sin(angle) * distance, friction: 6, tension: 40, useNativeDriver: true,
          }),
          Animated.spring(anim.scale, {
            toValue: 1, friction: 5, tension: 60, delay: 50, useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0, duration: 2000, delay: 1500, useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [stage]);

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

      setSuccess({ title: digest.title, count: questions.length, summary: digest.summary, concepts: digest.keyConcepts });
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
        {emojiAnims.map((anim, i) => (
          <Animated.Text
            key={i}
            style={[styles.burstEmoji, {
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            }]}
          >
            {burstEmojis[i]}
          </Animated.Text>
        ))}
        <Animated.View style={{ transform: [{ scale: successScale }], alignItems: 'center', width: '100%' }}>
          <Text style={styles.successIcon}>🎉</Text>
          <Text style={[styles.successTitle, { color: c.textPrimary }]}>{t('add.successTitle')}</Text>
          <Text style={[styles.successSubtitle, { color: c.textSecondary }]}>"{success.title}"</Text>

          {/* Summary */}
          <View style={[styles.summarySection, { backgroundColor: c.cardBg }]}>
            <Text style={[styles.summaryLabel, { color: c.textSecondary }]}>Summary</Text>
            <Text style={[styles.summaryText, { color: c.textPrimary }]}>{success.summary}</Text>
          </View>

          {/* Concept Pills */}
          {success.concepts.length > 0 && (
            <View style={styles.conceptsRow}>
              {success.concepts.map((concept, i) => (
                <View key={i} style={[styles.conceptPill, { backgroundColor: c.accent + '20' }]}>
                  <Text style={[styles.conceptPillText, { color: c.accent }]}>{concept}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Questions count */}
          <View style={styles.countRow}>
            <Text style={[styles.countNum, { color: c.accent }]}>{success.count}</Text>
            <Text style={[styles.countLabel, { color: c.textSecondary }]}>{t('add.questionsGenerated')}</Text>
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
        </Animated.View>
      </View>
    );
  }

  return (
    <>
      {stage === 'editing' ? (
        /* Editing: flex layout, keyboard handled via marginBottom */
        <View style={[styles.container, { backgroundColor: c.bg, flex: 1, marginBottom: keyboardHeight + 16 }]}>
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

          {/* Editor fills remaining space */}
          <View style={styles.editorFlexWrapper}>
            <MarkdownEditor
              value={editingContent}
              onChange={setEditingContent}
              placeholder="Edit your content before generating questions..."
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
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <ScrollView
            style={[styles.container, { backgroundColor: c.bg }]}
            keyboardShouldPersistTaps="handled"
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

            {stage === 'processing' && (
              <View style={styles.processingContainer}>
                <Text style={styles.processingSpinner}>🧠</Text>
                <Text style={[styles.processingTitle, { color: c.textPrimary }]}>
                  {t('add.processingTitle')}
                </Text>
                <Animated.View style={{ opacity: stepOpacity }}>
                  <Text style={[styles.processingStepText, { color: c.textSecondary }]}>
                    {processingSteps[currentStep]}
                  </Text>
                </Animated.View>
                <View style={styles.timeline}>
                  {processingSteps.map((step, i) => (
                    <View key={i} style={styles.timelineRow}>
                      <View style={styles.timelineNode}>
                        {i < currentStep ? (
                          <Text style={styles.timelineCheck}>✅</Text>
                        ) : i === currentStep ? (
                          <View style={[styles.timelineActive, { backgroundColor: c.accent }]} />
                        ) : (
                          <View style={[styles.timelinePending, { borderColor: c.border }]} />
                        )}
                        {i < processingSteps.length - 1 && (
                          <View style={[styles.timelineLine, { backgroundColor: i < currentStep ? c.accent : c.border }]} />
                        )}
                      </View>
                      <Animated.View style={i === currentStep ? { opacity: stepOpacity } : undefined}>
                        <Text style={[
                          styles.timelineLabel,
                          {
                            color: i <= currentStep ? c.textPrimary : c.textSecondary,
                            fontWeight: i <= currentStep ? '600' : '400',
                          },
                        ]}>
                          {step}
                        </Text>
                      </Animated.View>
                    </View>
                  ))}
                </View>
                <Text style={[styles.processingDetail, { color: c.textSecondary }]}>
                  {t('add.processingDetail', { count: questionsPerContent })}
                </Text>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </>
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
  editorFlexWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  editorWrapper: {
    flex: 1,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  saveBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
    padding: 48,
    alignItems: 'center',
    gap: 16,
  },
  processingSpinner: { fontSize: 48, marginBottom: 4 },
  processingTitle: { fontSize: 18, fontWeight: '700' },
  processingStepText: { fontSize: 15, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },
  processingDots: {
    flexDirection: 'row', gap: 8, alignItems: 'center', marginVertical: 8,
  },
  dot: {
    height: 8, borderRadius: 4,
  },
  processingDetail: { fontSize: 13, textAlign: 'center', lineHeight: 18, opacity: 0.7 },
  // Success
  successContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  successIcon: { fontSize: 72, marginBottom: 16 },
  successTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  successSubtitle: {
    fontSize: 16, textAlign: 'center',
    fontStyle: 'italic', marginBottom: 24, lineHeight: 22,
  },
  successCountBox: {
    borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 32, width: '100%',
  },
  successCountNum: { fontSize: 56, fontWeight: '800', color: '#2E7D32' },
  successCountLabel: { fontSize: 15, color: '#388E3C', marginTop: 4 },
  reviewButton: {
    borderRadius: 12, paddingVertical: 16,
    paddingHorizontal: 48, width: '100%', alignItems: 'center', marginBottom: 12,
  },
  reviewButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  homeButton: {
    paddingVertical: 12, paddingHorizontal: 48, alignItems: 'center',
  },
  homeButtonText: { fontSize: 15, fontWeight: '500' },
  // Emoji burst
  burstEmoji: {
    position: 'absolute',
    fontSize: 28,
  },
  // Timeline
  timeline: {
    marginVertical: 12, paddingHorizontal: 8, alignSelf: 'stretch',
  },
  timelineRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    minHeight: 48,
  },
  timelineNode: {
    width: 28, alignItems: 'center',
  },
  timelineCheck: { fontSize: 16 },
  timelineActive: {
    width: 12, height: 12, borderRadius: 6, marginTop: 2,
  },
  timelinePending: {
    width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginTop: 3,
  },
  timelineLine: {
    position: 'absolute', top: 16, left: 13,
    width: 2, height: 36,
  },
  timelineLabel: { fontSize: 14, lineHeight: 20, flex: 1, marginTop: 1 },
  // Success — summary + concept pills
  summarySection: {
    borderRadius: 16, padding: 16,
    marginHorizontal: 24, marginBottom: 16, alignSelf: 'stretch',
  },
  summaryLabel: {
    fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, marginBottom: 8,
  },
  summaryText: { fontSize: 14, lineHeight: 20 },
  conceptsRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    marginHorizontal: 24, marginBottom: 24, justifyContent: 'center',
  },
  conceptPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  conceptPillText: { fontSize: 13, fontWeight: '500' },
  countRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 24,
  },
  countNum: { fontSize: 32, fontWeight: '800' },
  countLabel: { fontSize: 15 },
});
