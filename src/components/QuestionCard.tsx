import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import type { Question } from '../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function QuestionCard({ question, onAnswer }: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const nextCalledRef = useRef(false);

  const isCorrect = question.type === 'multiple_choice'
    ? selectedOption === question.correctAnswer
    : shortAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();

  // Auto-advance after 3s on correct answer
  useEffect(() => {
    if (hasAnswered && isCorrect && !nextCalledRef.current) {
      nextCalledRef.current = true;
      const timer = setTimeout(() => onAnswer(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [hasAnswered, isCorrect, onAnswer]);

  const handleMultipleChoice = (option: string) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    setHasAnswered(true);
  };

  const handleShortAnswer = () => {
    if (hasAnswered || !shortAnswer.trim()) return;
    setHasAnswered(true);
  };

  const handleNext = () => {
    if (nextCalledRef.current) return;
    nextCalledRef.current = true;
    onAnswer(isCorrect);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{question.question}</Text>

      {question.type === 'multiple_choice' && question.options && (
        <View style={styles.optionsContainer}>
          {question.options.map((option, i) => {
            let optionStyle = styles.option;
            let textStyle = styles.optionText;
            if (hasAnswered) {
              if (option === question.correctAnswer) {
                optionStyle = { ...optionStyle, ...styles.optionCorrect };
                textStyle = { ...textStyle, ...styles.optionTextCorrect };
              } else if (option === selectedOption && option !== question.correctAnswer) {
                optionStyle = { ...optionStyle, ...styles.optionWrong };
                textStyle = { ...textStyle, ...styles.optionTextWrong };
              }
            }
            return (
              <TouchableOpacity
                key={i}
                style={optionStyle}
                onPress={() => handleMultipleChoice(option)}
                disabled={hasAnswered}
              >
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {question.type === 'short_answer' && (
        <View style={styles.shortAnswerContainer}>
          <TextInput
            style={styles.shortAnswerInput}
            value={shortAnswer}
            onChangeText={setShortAnswer}
            placeholder="Type your answer..."
            editable={!hasAnswered}
            autoCapitalize="none"
          />
          {!hasAnswered && (
            <TouchableOpacity
              style={[styles.submitAnswerBtn, !shortAnswer.trim() && styles.submitAnswerBtnDisabled]}
              onPress={handleShortAnswer}
              disabled={!shortAnswer.trim()}
            >
              <Text style={styles.submitAnswerText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {hasAnswered && question.explanation && (
        <View style={[styles.explanation, isCorrect ? styles.explanationCorrect : styles.explanationWrong]}>
          <Text style={styles.explanationTitle}>{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
          {!isCorrect && (
            <Text style={styles.correctAnswer}>Correct answer: {question.correctAnswer}</Text>
          )}
        </View>
      )}

      {hasAnswered && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {isCorrect ? 'Next →' : 'Next →'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    marginHorizontal: 16, marginVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  questionText: { fontSize: 18, fontWeight: '600', color: '#333', lineHeight: 26, marginBottom: 20 },
  optionsContainer: { gap: 10 },
  option: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, backgroundColor: '#FAFAFA',
  },
  optionCorrect: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  optionWrong: { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextCorrect: { color: '#2E7D32', fontWeight: '600' },
  optionTextWrong: { color: '#C62828', fontWeight: '600' },
  shortAnswerContainer: { gap: 12 },
  shortAnswerInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
    minHeight: 60,
  },
  submitAnswerBtn: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  submitAnswerBtnDisabled: { backgroundColor: '#CCC' },
  submitAnswerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  explanation: { marginTop: 16, padding: 14, borderRadius: 10 },
  explanationCorrect: { backgroundColor: '#E8F5E9' },
  explanationWrong: { backgroundColor: '#FFEBEE' },
  explanationTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#555', lineHeight: 20 },
  correctAnswer: { fontSize: 14, color: '#C62828', fontWeight: '600', marginTop: 8 },
  nextButton: {
    marginTop: 16, backgroundColor: '#4A90D9', borderRadius: 10,
    padding: 14, alignItems: 'center',
  },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
