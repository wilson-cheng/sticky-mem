import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Animated,
} from 'react-native';
import type { Question } from '../types';
import { useTranslation } from '../i18n/useTranslation';
import { useColors } from '../theme/useColors';

interface Props {
  question: Question;
  onGrade: (grade: number) => void;
  onIdk: () => void;
  onNext: () => void;
  onRemove: () => void;
  showRemove: boolean;
  correctAutoAdvanceMs: number;
}

type CardState = 'answering' | 'result';

export default function QuestionCard({
  question, onGrade, onIdk, onNext, onRemove, showRemove, correctAutoAdvanceMs,
}: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const [cardState, setCardState] = useState<CardState>('answering');
  const [selected, setSelected] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [isIdk, setIsIdk] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(correctAutoAdvanceMs / 1000));
  const [gradeRecorded, setGradeRecorded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);

  const advanceWithSlide = useCallback(() => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    clearTimers();
    Animated.timing(slideAnim, {
      toValue: -400, duration: 200, useNativeDriver: true,
    }).start(() => {
      onNext();
    });
  }, [clearTimers, onNext, slideAnim]);

  useEffect(() => {
    setCardState('answering');
    setSelected(null);
    setUserAnswer('');
    setIsCorrect(false);
    setIsIdk(false);
    setGradeRecorded(false);
    setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    isTransitioning.current = false;

    // Slide in from right
    slideAnim.setValue(400);
    Animated.spring(slideAnim, {
      toValue: 0, friction: 9, tension: 50, useNativeDriver: true,
    }).start();
  }, [question.id, correctAutoAdvanceMs]);

  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
  }, []);

  const handleSelectOption = (option: string) => {
    if (cardState !== 'answering') return;
    setSelected(option);
    const correct = option === question.correctAnswer;
    setIsCorrect(correct);
    setIsIdk(false);
    setCardState('result');
    setGradeRecorded(true);

    if (correct) {
      setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      timerRef.current = interval;
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceWithSlide();
      }, correctAutoAdvanceMs);
    }

    onGrade(correct ? 5 : 1);
  };

  const handleSubmitAnswer = () => {
    if (cardState !== 'answering' || !userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    setIsCorrect(correct);
    setIsIdk(false);
    setCardState('result');
    setGradeRecorded(true);

    if (correct) {
      setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      timerRef.current = interval;
      autoAdvanceTimerRef.current = setTimeout(() => {
        advanceWithSlide();
      }, correctAutoAdvanceMs);
    }

    onGrade(correct ? 5 : 1);
  };

  const handleIdk = () => {
    if (cardState !== 'answering') return;
    setIsCorrect(false);
    setIsIdk(true);
    setCardState('result');
    setGradeRecorded(false);
    onIdk();
  };

  const handleNextPress = useCallback(() => {
    advanceWithSlide();
  }, [advanceWithSlide]);

  // ─── Render ─── //

  const isMC = question.type === 'multiple_choice';

  return (
    <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
      <View style={[styles.container, { backgroundColor: c.cardBg }]}>
        {/* Question */}
        <Text style={[styles.questionText, { color: c.textPrimary }]}>{question.question}</Text>

        {cardState === 'answering' && (
          <>
            {isMC ? (
              <View style={styles.optionsContainer}>
                {(question.options || []).map((opt, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.optionButton, { backgroundColor: c.statBoxBg, borderColor: c.border }]}
                    onPress={() => handleSelectOption(opt)}
                  >
                    <Text style={[styles.optionText, { color: c.textPrimary }]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.shortAnswerContainer}>
                <TextInput
                  style={[styles.input, { backgroundColor: c.statBoxBg, borderColor: c.border, color: c.textPrimary }]}
                  value={userAnswer}
                  onChangeText={setUserAnswer}
                  placeholder="Type your answer..."
                  placeholderTextColor={c.textSecondary}
                  onSubmitEditing={handleSubmitAnswer}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: c.blue }, !userAnswer.trim() && { opacity: 0.5 }]}
                  onPress={handleSubmitAnswer}
                  disabled={!userAnswer.trim()}
                >
                  <Text style={styles.submitBtnText}>Submit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* I don't know button */}
            <TouchableOpacity style={[styles.idkButton, { borderColor: c.border, backgroundColor: c.statBoxBg }]} onPress={handleIdk}>
              <Text style={[styles.idkButtonText, { color: c.textSecondary }]}>{t('question.iDontKnow')}</Text>
            </TouchableOpacity>
          </>
        )}

        {cardState === 'result' && (
          <View style={styles.resultSection}>
            {/* Result banner */}
            <View style={[
              styles.resultBanner,
              isCorrect ? styles.correctBanner : styles.wrongBanner,
            ]}>
              <Text style={styles.bannerIcon}>
                {isCorrect ? '✅' : isIdk ? '💡' : '❌'}
              </Text>
              <Text style={[styles.bannerText, { color: c.textPrimary }]}>
                {isCorrect ? t('question.correct') : isIdk ? 'Answer Revealed' : t('question.incorrect')}
              </Text>
            </View>

            {/* Answer */}
            <View style={[styles.answerBox, { backgroundColor: c.statBoxBg }]}>
              <Text style={[styles.answerLabel, { color: c.textSecondary }]}>{t('question.correctAnswer')}</Text>
              <Text style={[styles.answerText, { color: c.textPrimary }]}>{question.correctAnswer}</Text>
            </View>

            {/* Explanation */}
            {question.explanation && (
              <View style={[styles.explanationBox, { backgroundColor: c.statBoxBg + '80' }]}>
                <Text style={[styles.explanationLabel, { color: c.blue }]}>Explanation:</Text>
                <Text style={[styles.explanationText, { color: c.textSecondary }]}>{question.explanation}</Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.revealActions}>
              <TouchableOpacity
                style={[styles.nextButton, { backgroundColor: isCorrect ? '#4CAF50' : c.blue }]}
                onPress={handleNextPress}
              >
                <Text style={styles.nextButtonText}>
                  {isCorrect && countdown > 0 ? t('question.next', { countdown }) : t('question.continue')}
                </Text>
              </TouchableOpacity>

              {showRemove && (
                <TouchableOpacity style={[styles.removeButton, { borderColor: '#FFCDD2' }]} onPress={onRemove}>
                  <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20, padding: 24,
    marginHorizontal: 16, marginVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  questionText: {
    fontSize: 18, fontWeight: '700',
    lineHeight: 26, marginBottom: 20,
  },
  optionsContainer: { gap: 10 },
  optionButton: {
    borderRadius: 12, padding: 16,
    borderWidth: 1,
  },
  optionText: { fontSize: 15 },
  shortAnswerContainer: { gap: 12 },
  input: {
    borderRadius: 12, padding: 14,
    fontSize: 15, borderWidth: 1,
  },
  submitBtn: {
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  idkButton: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 10,
    borderWidth: 1,
  },
  idkButtonText: { fontSize: 14, fontWeight: '500' },
  resultSection: { gap: 14 },
  resultBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  correctBanner: { backgroundColor: '#E8F5E9' },
  wrongBanner: { backgroundColor: '#FFEBEE' },
  bannerIcon: { fontSize: 20 },
  bannerText: { fontSize: 16, fontWeight: '700' },
  answerBox: {
    borderRadius: 10, padding: 14,
  },
  answerLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  answerText: { fontSize: 15, fontWeight: '500' },
  explanationBox: {
    borderRadius: 10, padding: 14,
  },
  explanationLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  explanationText: { fontSize: 14, lineHeight: 20 },
  revealActions: { gap: 10, marginTop: 4 },
  nextButton: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  removeButton: {
    paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    borderWidth: 1,
  },
  removeButtonText: { color: '#C62828', fontSize: 14, fontWeight: '500' },
});
