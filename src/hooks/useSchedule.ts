import { useState, useEffect, useCallback } from 'react';
import type { Repository } from '../db/repository';
import type { Question, Card } from '../types';

export function useSchedule(repo: Repository | null) {
  const [dueCount, setDueCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!repo) return;
    try {
      setLoading(true);
      const due = await repo.getDueCards(Date.now());
      const total = await repo.getTotalQuestionCount();
      setDueCount(due.length);
      setTotalQuestions(total);
    } catch (e) {
      console.error('Failed to load schedule:', e);
    } finally {
      setLoading(false);
    }
  }, [repo]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { dueCount, totalQuestions, loading, refresh: loadStats };
}
