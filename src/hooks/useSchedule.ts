import { useState, useEffect, useCallback, useRef } from 'react';
import type { Repository } from '../db/repository';
import type { Question, Card } from '../types';
import { useSettingsStore } from '../store/settings';

export function useSchedule(repo: Repository | null) {
  const [dueCount, setDueCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [todayCorrect, setTodayCorrect] = useState(0);
  const [loading, setLoading] = useState(true);
  const isInitialLoad = useRef(true);

  const loadStats = useCallback(async () => {
    if (!repo) return;
    try {
      if (isInitialLoad.current) {
        setLoading(true);
      }
      const due = await repo.getDueCards(Date.now());
      const total = await repo.getTotalQuestionCount();
      const reviewed = await repo.getTodayReviewedCount();
      const correct = await repo.getTodayCorrectCount();
      // Cap displayed count by questionsPerReview — home page shows round size, not total due
      const questionsPerReview = useSettingsStore.getState().questionsPerReview;
      const limit = questionsPerReview > 0 ? questionsPerReview : due.length;
      setDueCount(Math.min(due.length, limit));
      setTotalQuestions(total);
      setTodayReviewed(reviewed);
      setTodayCorrect(correct);
    } catch (e) {
      console.error('Failed to load schedule:', e);
    } finally {
      setLoading(false);
      isInitialLoad.current = false;
    }
  }, [repo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { dueCount, totalQuestions, todayReviewed, todayCorrect, loading, refresh: loadStats };
}
