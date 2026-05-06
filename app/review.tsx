import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import QuestionCard from '../src/components/QuestionCard';
import { initDatabase } from '../src/hooks/useDatabase';
import type { Question, Card, ReviewRecord } from '../src/types';
import { sm2, calculateNextReview } from '../src/engine/sm2';
import { useSettingsStore } from '../src/store/settings';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ReviewScreen() {
  const router = useRouter();
  const questionsPerReview = useSettingsStore((s) => s.questionsPerReview);
  const dailyReviewTarget = useSettingsStore((s) => s.dailyReviewTarget);

  const [reviewQueue, setReviewQueue] = useState<(Question & { card: Card })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const repoRef = useRef<Awaited<ReturnType<typeof initDatabase>> | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const repo = await initDatabase();
      repoRef.current = repo;

      let due = await repo.getDueCards(Date.now());
      if (due.length === 0) {
        setReviewQueue([]);
        setLoading(false);
        return;
      }

      // Shuffle
      let shuffled = shuffle(due);

      // Apply questionsPerReview limit
      const limit = questionsPerReview > 0 ? questionsPerReview : shuffled.length;
      if (shuffled.length > limit) {
        shuffled = shuffled.slice(0, limit);
      }

      setReviewQueue(shuffled);
    } catch (e) {
      console.error('Failed to load due cards:', e);
      Alert.alert('Error', 'Failed to load review cards');
    } finally {
      setLoading(false);
    }
  }, [questionsPerReview]);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const advance = useCallback(() => {
    setCurrentIndex((i) => {
      const next = i + 1;
      if (next >= reviewQueue.length) {
        setSessionDone(true);
      }
      return next;
    });
  }, [reviewQueue.length]);

  const handleGrade = useCallback(async (grade: number) => {
    if (!repoRef.current) return;
    const currentCard = reviewQueue[currentIndex];
    if (!currentCard) return;

    try {
      const repo = repoRef.current;
      const now = Date.now();

      // Save review record
      const review: ReviewRecord = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        questionId: currentCard.id,
        gradedAt: now,
        grade: grade as any,
      };
      await repo.insertReview(review);

      // Update SM-2 card
      const result = sm2(currentCard.card, grade);
      await repo.upsertCard({
        questionId: currentCard.id,
        easiness: result.easiness,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReviewAt: calculateNextReview(result.interval, now),
        lastReviewAt: now,
      });

      // Update daily stats
      const today = new Date().toISOString().slice(0, 10);
      const existingStats = await repo.getDailyStats(1);
      const todayStats = existingStats.find((s) => s.date === today);
      await repo.upsertDailyStats({
        date: today,
        totalReviewed: (todayStats?.totalReviewed ?? 0) + 1,
        correctCount: (todayStats?.correctCount ?? 0) + (grade >= 3 ? 1 : 0),
      });

      setStats((s) => ({
        correct: s.correct + (grade >= 3 ? 1 : 0),
        total: s.total + 1,
      }));

      advance();
    } catch (e) {
      console.error('Failed to save grade:', e);
    }
  }, [reviewQueue, currentIndex, advance]);

  const handleIdk = useCallback(() => {
    // Don't save anything — just move to next
    advance();
  }, [advance]);

  const handleRemove = useCallback(async () => {
    if (!repoRef.current) return;
    const currentCard = reviewQueue[currentIndex];
    if (!currentCard) return;

    try {
      const repo = repoRef.current;
      await repo.run('DELETE FROM cards WHERE question_id = ?', [currentCard.id]);
      await repo.run('DELETE FROM questions WHERE id = ?', [currentCard.id]);
      advance();
    } catch (e) {
      console.error('Failed to remove question:', e);
    }
  }, [reviewQueue, currentIndex, advance]);

  // ─── Render ─── //

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (sessionDone && currentIndex >= reviewQueue.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>Session Complete!</Text>
        <Text style={styles.doneStats}>
          {stats.correct} / {stats.total} correct
          {stats.total > 0 ? ` (${Math.round((stats.correct / stats.total) * 100)}%)` : ''}
        </Text>
        <View style={styles.doneButtons}>
          <ReviewButton
            label="Back to Home"
            onPress={() => router.push('/')}
            color="#6C63FF"
          />
        </View>
      </View>
    );
  }

  if (reviewQueue.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>No cards due!</Text>
        <Text style={styles.doneSubtitle}>Come back later for your next review.</Text>
        <View style={styles.doneButtons}>
          <ReviewButton
            label="Back to Home"
            onPress={() => router.push('/')}
            color="#6C63FF"
          />
        </View>
      </View>
    );
  }

  if (sessionDone) {
    return (
      <View style={styles.centered}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>Session Complete!</Text>
        <Text style={styles.doneStats}>
          {stats.correct} / {stats.total} correct
          {stats.total > 0 ? ` (${Math.round((stats.correct / stats.total) * 100)}%)` : ''}
        </Text>
        <View style={styles.doneButtons}>
          <ReviewButton
            label="Back to Home"
            onPress={() => router.push('/')}
            color="#6C63FF"
          />
        </View>
      </View>
    );
  }

  const currentQuestion = reviewQueue[currentIndex];
  if (!currentQuestion) return null;

  return (
    <View style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${((currentIndex) / reviewQueue.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentIndex + 1} / {reviewQueue.length}
        </Text>
      </View>

      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        onGrade={handleGrade}
        onIdk={handleIdk}
        onRemove={handleRemove}
        showRemove={true}
        correctAutoAdvanceMs={5000}
      />
    </View>
  );
}

function ReviewButton({ label, onPress, color }: {
  label: string;
  onPress: () => void;
  color: string;
}) {
  return (
    <View
      style={[styles.reviewActionBtn, { backgroundColor: color }]}
      onTouchEnd={onPress}
    >
      <Text style={styles.reviewActionBtnText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F5F5', padding: 32,
  },
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4,
  },
  progressBg: {
    flex: 1, height: 6, backgroundColor: '#E0E0E0', borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: '#6C63FF', borderRadius: 3,
  },
  progressText: { fontSize: 13, color: '#888', fontWeight: '600' },
  doneIcon: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 8 },
  doneStats: { fontSize: 16, color: '#666', marginBottom: 24 },
  doneSubtitle: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  doneButtons: { flexDirection: 'row', gap: 12 },
  reviewActionBtn: {
    borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14,
  },
  reviewActionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
