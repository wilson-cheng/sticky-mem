import { useState, useCallback } from 'react';
import type { Question, Card, ReviewGrade } from '../types';
import { sm2, calculateNextReview } from '../engine/sm2';

export interface ReviewSessionState {
  questions: (Question & { card: Card })[];
  currentIndex: number;
  results: { questionId: string; correct: boolean; grade: ReviewGrade }[];
  isComplete: boolean;
}

export function useReview() {
  const [state, setState] = useState<ReviewSessionState>({
    questions: [],
    currentIndex: 0,
    results: [],
    isComplete: false,
  });

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const progress = state.questions.length > 0
    ? state.currentIndex / state.questions.length
    : 0;

  const submitGrade = useCallback((correct: boolean) => {
    setState((prev) => {
      const item = prev.questions[prev.currentIndex];
      if (!item) return prev;

      const grade: ReviewGrade = correct ? 4 : 0;
      const updatedCard = sm2(item.card, grade);
      updatedCard.lastReviewAt = Date.now();
      updatedCard.nextReviewAt = calculateNextReview(updatedCard.interval, Date.now());

      const newResults = [...prev.results, { questionId: item.card.questionId, correct, grade }];
      const nextIndex = prev.currentIndex + 1;
      const isComplete = nextIndex >= prev.questions.length;

      return {
        ...prev,
        currentIndex: nextIndex,
        results: newResults,
        isComplete,
        _updatedCards: {
          ...(prev as any)._updatedCards,
          [item.card.questionId]: updatedCard,
        },
      };
    });
  }, []);

  const startSession = useCallback((questions: (Question & { card: Card })[]) => {
    setState({
      questions,
      currentIndex: 0,
      results: [],
      isComplete: false,
    });
  }, []);

  return {
    currentQuestion,
    currentIndex: state.currentIndex,
    totalCount: state.questions.length,
    progress,
    isComplete: state.isComplete,
    startSession,
    submitGrade,
    results: state.results,
    updatedCards: (state as any)._updatedCards as Record<string, Card> | undefined,
  };
}
