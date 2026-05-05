import { useState, useEffect } from 'react';
import type { Repository } from '../db/repository';
import type { Question, Card } from '../types';

export function useSchedule(repo: Repository | null) {
  const [dueCount, setDueCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repo) return;
    loadStats();

    async function loadStats() {
      try {
        const due = await repo.getDueCards(Date.now());
        const total = await repo.getTotalQuestionCount();
        setDueCount(due.length);
        setTotalQuestions(total);
      } catch (e) {
        console.error('Failed to load schedule:', e);
      } finally {
        setLoading(false);
      }
    }
  }, [repo]);

  const loadDueCards = async (): Promise<(Question & { card: Card })[]> => {
    if (!repo) return [];
    return repo.getDueCards(Date.now());
  };

  return { dueCount, totalQuestions, loading, loadDueCards };
}
