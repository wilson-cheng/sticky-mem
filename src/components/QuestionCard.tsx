import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput,
} from 'react-native';
import type { Question } from '../types';

interface Props {
  question: Question;
  onGrade: (grade: number) => void;
  onIdk: () => void;
  onRemove: () => void;
  showRemove: boolean;
  correctAutoAdvanceMs: number;
}

type CardState = 'answering' | 'revealed' | 'transition';

export default function QuestionCard({
  question, onGrade, onIdk, onRemove, showRemove, correctAutoAdvanceMs,
}: Props) {
  const [cardState, setCardState] = useState<CardState>('answering');
  const [selected, setSelected] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(correctAutoAdvanceMs / 1000));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Reset state when question changes
    setCardState('answering');
    setSelected(null);
    setUserAnswer('');
    setIsCorrect(false);
    setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
    if (timerRef.current) clearInterval(timerRef.current);
  }, [question.id, correctAutoAdvanceMs]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTransition = useCallback(() => {
    setCardState('transition');
    setCountdown(Math.floor(correctAutoAdvanceMs / 1000));
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    timerRef.current = interval;
  }, [correctAutoAdvanceMs]);

  const handleSelectOption = (option: string) => {
    if (cardState !== 'answering') return;
    setSelected(option);
    const correct = option === question.correctAnswer;
    setIsCorrect(correct);
    setCardState('revealed');

    if (correct) {
      // Correct — start auto-advance timer with countdown
      startTransition();
      onGrade(5);
    } else {
      // Wrong — show answer, no auto-advance
      onGrade(1);
    }
  };

  const handleSubmitAnswer = () => {
    if (cardState !== 'answering' || !userAnswer.trim()) return;
    const correct = userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
    setIsCorrect(correct);
    setCardState('revealed');

    if (correct) {
      startTransition();
      onGrade(5);
    } else {
      onGrade(1);
    }
  };

  const handleIdk = () => {
    if (cardState !== 'answering') return;
    setCardState('revealed');
    setIsCorrect(false);
    onIdk();
  };

  const handleRevealNext = () => {
    clearTimer();
    onGrade(isCorrect ? 5 : 1);
  };

  const handleTransitionDone = () => {
    clearTimer();
    onGrade(5);
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
            <Text style={styles.idkButtonText}>🤷 I don't know</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Revealed — show result + explanation */}
      {cardState === 'revealed' && (
        <View style={styles.resultContainer}>
          <View style={[
            styles.resultBanner,
            isCorrect ? styles.correctBanner : styles.wrongBanner,
          ]}>
            <Text style={styles.bannerIcon}>{isCorrect ? '✅' : 
              selected || userAnswer ? '❌' : '💡'}</Text>
            <Text style={styles.bannerText}>
              {isCorrect ? 'Correct!' : selected || userAnswer ? 'Incorrect' : 'Answer revealed'}
            </Text>
          </View>

          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>Answer:</Text>
            <Text style={styles.answerText}>{question.correctAnswer}</Text>
          </View>

          {question.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Explanation:</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}

          {/* After answer, show actions */}
          {cardState === 'revealed' && (
            <View style={styles.revealActions}>
              {isCorrect ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleTransitionDone}>
                  <Text style={styles.nextButtonText}>Next ⏎</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextButton} onPress={handleRevealNext}>
                  <Text style={styles.nextButtonText}>Continue →</Text>
                </TouchableOpacity>
              )}

              {showRemove && (
                <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
                  <Text style={styles.removeButtonText}>🗑️ Remove question</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}

      {/* Transition — auto-advance with countdown (correct only) */}
      {cardState === 'transition' && (
        <View style={styles.transitionContainer}>
          <View style={[styles.resultBanner, styles.correctBanner]}>
            <Text style={styles.bannerIcon}>✅</Text>
            <Text style={styles.bannerText}>Correct!</Text>
          </View>

          <View style={styles.answerBox}>
            <Text style={styles.answerLabel}>Answer:</Text>
            <Text style={styles.answerText}>{question.correctAnswer}</Text>
          </View>

          {question.explanation && (
            <View style={styles.explanationBox}>
              <Text style={styles.explanationLabel}>Explanation:</Text>
              <Text style={styles.explanationText}>{question.explanation}</Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.revealActions}>
            <TouchableOpacity style={styles.nextButton} onPress={handleTransitionDone}>
              <Text style={styles.nextButtonText}>Skip ({countdown}s)</Text>
            </TouchableOpacity>

            {showRemove && (
              <TouchableOpacity style={styles.removeButton} onPress={onRemove}>
                <Text style={styles.removeButtonText}>🗑️ Remove question</Text>
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
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    lineHeight: 26,
    marginBottom: 20,
  },
  // ─── Answering state ─── //
  optionsContainer: { gap: 10 },
  optionButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionText: { fontSize: 15, color: '#333' },
  shortAnswerContainer: { gap: 12 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  submitBtn: {
    backgroundColor: '#4A90D9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  idkButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  idkButtonText: { fontSize: 14, color: '#888', fontWeight: '500' },
  // ─── Revealed state ─── //
  resultContainer: { gap: 14 },
  resultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  correctBanner: { backgroundColor: '#E8F5E9' },
  wrongBanner: { backgroundColor: '#FFEBEE' },
  bannerIcon: { fontSize: 20 },
  bannerText: { fontSize: 16, fontWeight: '700', color: '#333' },
  answerBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 14,
  },
  answerLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 4 },
  answerText: { fontSize: 15, color: '#333', fontWeight: '500' },
  explanationBox: {
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 14,
  },
  explanationLabel: { fontSize: 12, fontWeight: '600', color: '#4A90D9', marginBottom: 4 },
  explanationText: { fontSize: 14, color: '#444', lineHeight: 20 },
  revealActions: { gap: 10, marginTop: 4 },
  nextButton: {
    backgroundColor: '#6C63FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  removeButton: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  removeButtonText: { color: '#C62828', fontSize: 14, fontWeight: '500' },
  // ─── Transition state ─── //
  transitionContainer: { gap: 14 },
});
