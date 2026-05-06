import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import type { Question } from '../types';
import { useTranslation } from '../i18n/useTranslation';

interface Props {
  question: Question;
  /** Called immediately when user answers — records grade but does NOT advance */
  onGrade: (grade: number) => void;
  /** Called when user wants to skip — no grade recorded */
  onIdk: () => void;
  /** Called when user taps Next / Continue, or countdown expires on correct */
  onNext: () => void;
  /** Called when user taps Remove question */
  onRemove: () => void;
  showRemove: boolean;
  correctAutoAdvanceMs: number;
}

type CardState = 'answering' | 'result';

export default function QuestionCard({
  question, onGrade, onIdk, onNext, onRemove, showRemove, correctAutoAdvanceMs,
}: Props) {
  const { t } = useTranslation();
  const [cardState, setCardState] = useState<CardState>('answering');
  const [selected, setSelected] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [isIdk, setIsIdk] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(correctAutoAdvanceMs / 1000));
  const [gradeRecorded, setGradeRecorded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset state when question changes
    setCardState('answering');
    setSelected(null);
    setUserAnswer('');
    setIsCorrect(false);
    setIsIdk(false);
    setGradeRecorded(false);
    setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
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
      // Start countdown timer
      setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
      const interval = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
      timerRef.current = interval;
      // Auto-advance after delay
      autoAdvanceTimerRef.current = setTimeout(() => {
        onNext();
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
        onNext();
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

  const handleNextPress = () => {
    clearTimers();
    onNext();
  };

  // ─── Render ─── //

  const isMC = question.type === 'multiple_choice';

  return (
    <View style={styles.container}>
      {/* Question */}
      <Text style={styles.questionText}>{question.question}</Text>

      {cardState === 'answering' && (
        <>
          {isMC ? (
            <View style={styles.optionsContainer}>
              {(question.options || []).map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.optionButton}
                  onPress={() => handleSelectOption(opt)}
                >
                  <Text style={styles.optionText}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.shortAnswerContainer}>
              <TextInput
                style={styles.input}
                value={userAnswer}
                onChangeText={setUserAnswer}
                placeholder="Type your answer..."
                placeholderTextColor="#999"
                onSubmitEditing={handleSubmitAnswer}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.submitBtn, !userAnswer.trim() && styles.submitBtnDisabled]}
                onPress={handleSubmitAnswer}
                disabled={!userAnswer.trim()}
              >
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* I don't know button */}
          <TouchableOpacity style={styles.idkButton} onPress={handleIdk}>
            <Text style={styles.idkButtonText}>{t('question.iDontKnow')}</Text>
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
            <Text style={styles.bannerText}>
              {isCorrect ? t('question.correct') : isIdk ? 'Answer Revealed' : t('question.incorrect')}
            </Text>
          </View>

          {/* Answer */}
          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>{t('question.correctAnswer')}</Text>
            <Text style={styles.answerText}>{question.correctAnswer}</Text>
          </View>

          {/* Explanation */}
          {question.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Explanation:</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.revealActions}>
            <TouchableOpacity style={[styles.nextButton, isCorrect && styles.nextButtonCorrect]} onPress={handleNextPress}>
              <Text style={styles.nextButtonText}>
                {isCorrect && countdown > 0 ? t('question.next', { countdown }) : t('question.continue')}
              </Text>
            </TouchableOpacity>

            {showRemove && (
              <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
                <Text style={styles.removeButtonText}>{t('question.remove')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    marginHorizontal: 16, marginVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  questionText: {
    fontSize: 18, fontWeight: '700', color: '#333',
    lineHeight: 26, marginBottom: 20,
  },
  optionsContainer: { gap: 10 },
  optionButton: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#E0E0E0',
  },
  optionText: { fontSize: 15, color: '#333' },
  shortAnswerContainer: { gap: 12 },
  input: {
    backgroundColor: '#F5F5F5', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#E0E0E0',
  },
  submitBtn: {
    backgroundColor: '#4A90D9', borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  idkButton: {
    marginTop: 16, paddingVertical: 12, alignItems: 'center', borderRadius: 10,
    borderWidth: 1, borderColor: '#E0E0E0', backgroundColor: '#FAFAFA',
  },
  idkButtonText: { fontSize: 14, color: '#888', fontWeight: '500' },
  resultSection: { gap: 14 },
  resultBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 12, borderRadius: 12,
  },
  correctBanner: { backgroundColor: '#E8F5E9' },
  wrongBanner: { backgroundColor: '#FFEBEE' },
  bannerIcon: { fontSize: 20 },
  bannerText: { fontSize: 16, fontWeight: '700', color: '#333' },
  answerBox: {
    backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14,
  },
  answerLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4 },
  answerText: { fontSize: 15, color: '#333', fontWeight: '500' },
  explanationBox: {
    backgroundColor: '#F0F4FF', borderRadius: 10, padding: 14,
  },
  explanationLabel: { fontSize: 12, fontWeight: '600', color: '#4A90D9', marginBottom: 4 },
  explanationText: { fontSize: 14, color: '#444', lineHeight: 20 },
  revealActions: { gap: 10, marginTop: 4 },
  nextButton: {
    backgroundColor: '#6C63FF', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  nextButtonCorrect: {
    backgroundColor: '#4CAF50',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  removeButton: {
    paddingVertical: 10, alignItems: 'center', borderRadius: 10,
    borderWidth: 1, borderColor: '#FFCDD2',
  },
  removeButtonText: { color: '#C62828', fontSize: 14, fontWeight: '500' },
});
