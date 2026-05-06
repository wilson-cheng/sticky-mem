import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuestionCard from '../src/components/QuestionCard';
import { initDatabase } from '../src/hooks/useDatabase';
import type { Question, Card, ReviewRecord } from '../src/types';
import { sm2, calculateNextReview } from '../src/engine/sm2';
import { useSettingsStore } from '../src/store/settings';
import { useTranslation } from '../src/i18n/useTranslation';

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const questionsPerReview = useSettingsStore((s) => s.questionsPerReview);
  const dailyReviewTarget = useSettingsStore((s) => s.dailyReviewTarget);

  const [reviewQueue, setReviewQueue] = useState<(Question & { card: Card })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const repoRef = useRef<Awaited<ReturnType<typeof initDatabase>> | null>(null);

  const handleBack = () => {
    Alert.alert(
      t('review.leaveTitle'),
      t('review.leaveMessage'),
      [
        { text: t('settings.cancel'), style: 'cancel' },
        { text: t('review.leave'), style: 'destructive', onPress: () => router.replace('/') },
      ]
    );
  };

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const repo = await initDatabase();
      repoRef.current = repo;

      let due = await repo.getDueCards(Date.now());

      // Sort: prioritize questions with wrong/IDK history
      // Cards with fewer repetitions or longer-ago reviews come first
      due.sort((a, b) => {
        // Lower repetitions = higher priority
        if (a.card.repetitions !== b.card.repetitions) {
          return a.card.repetitions - b.card.repetitions;
        }
        // Lower easiness = higher priority
        if (a.card.easiness !== b.card.easiness) {
          return a.card.easiness - b.card.easiness;
        }
        // Older last review = higher priority
        return (a.card.lastReviewAt ?? 0) - (b.card.lastReviewAt ?? 0);
      });

      // Shuffle within priority bands
      const highPriority: typeof due = [];
      const normalPriority: typeof due = [];
      due.forEach((item) => {
        if (item.card.repetitions <= 1 || item.card.easiness < 2.0) {
          highPriority.push(item);
        } else {
          normalPriority.push(item);
        }
      });

      let ordered = [
        ...shuffle(highPriority),
        ...shuffle(normalPriority),
      ];

      // Apply questionsPerReview limit
      const limit = questionsPerReview > 0 ? questionsPerReview : ordered.length;
      if (ordered.length > limit) {
        ordered = ordered.slice(0, limit);
      }

      setReviewQueue(ordered);
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

  /** Records grade and updates card — does NOT advance */
  const handleRecordGrade = useCallback(async (grade: number) => {
    if (!repoRef.current) return;
    const currentCard = reviewQueue[currentIndex];
    if (!currentCard) return;

    try {
      const repo = repoRef.current;
      const now = Date.now();

      const review: ReviewRecord = {
        id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
        questionId: currentCard.id,
        gradedAt: now,
        grade: grade as any,
      };
      await repo.insertReview(review);

      const result = sm2(currentCard.card, grade);
      await repo.upsertCard({
        questionId: currentCard.id,
        easiness: result.easiness,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReviewAt: calculateNextReview(result.interval, now),
        lastReviewAt: now,
      });

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
    } catch (e) {
      console.error('Failed to save grade:', e);
    }
  }, [reviewQueue, currentIndex]);

  /** Called when user taps Next / Continue, or countdown expires */
  const handleNext = useCallback(() => {
    advance();
  }, [advance]);

  const handleIdk = useCallback(async () => {
    // Record IDK as grade 0 (complete blackout) so SM-2 resets the interval
    if (repoRef.current && reviewQueue[currentIndex]) {
      try {
        const repo = repoRef.current;
        const now = Date.now();
        const currentCard = reviewQueue[currentIndex];
        const review: ReviewRecord = {
          id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
          questionId: currentCard.id,
          gradedAt: now,
          grade: 0,
        };
        await repo.insertReview(review);

        const result = sm2(currentCard.card, 0);
        await repo.upsertCard({
          questionId: currentCard.id,
          easiness: result.easiness,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewAt: calculateNextReview(result.interval, now),
          lastReviewAt: now,
        });

        const today = new Date().toISOString().slice(0, 10);
        const existingStats = await repo.getDailyStats(1);
        const todayStats = existingStats.find((s) => s.date === today);
        await repo.upsertDailyStats({
          date: today,
          totalReviewed: (todayStats?.totalReviewed ?? 0) + 1,
          correctCount: todayStats?.correctCount ?? 0,
        });

        setStats((s) => ({ correct: s.correct, total: s.total + 1 }));
      } catch (e) {
        console.error('Failed to record IDK:', e);
      }
    }
    advance();
  }, [advance, reviewQueue, currentIndex]);

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

  // ─── Check if daily target is met ─── //
  const isTargetMet = dailyReviewTarget > 0 && stats.total >= dailyReviewTarget;
  const reviewMoreLabel = dailyReviewTarget > 0 && stats.total > 0
    ? `${t('home.reviewMore')} (${stats.total}/${dailyReviewTarget})`
    : t('home.startReview');

  // ─── Render ─── //

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  const goHome = () => router.dismissAll();

  if (sessionDone && currentIndex >= reviewQueue.length) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.doneIcon}>🎉</Text>
        <Text style={styles.doneTitle}>{t('review.sessionComplete')}</Text>
        <Text style={styles.doneStats}>
          {stats.correct} / {stats.total} {t('review.correct')}
          {stats.total > 0 ? ` (${Math.round((stats.correct / stats.total) * 100)}%)` : ''}
        </Text>
        <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
          <Text style={styles.homeBtnText}>{t('review.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reviewQueue.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Text style={styles.doneIcon}>✅</Text>
        <Text style={styles.doneTitle}>{t('review.noCardsDue')}</Text>
        <Text style={styles.doneSubtitle}>{t('review.noCardsSubtitle')}</Text>
        <TouchableOpacity style={styles.homeBtn} onPress={goHome}>
          <Text style={styles.homeBtnText}>{t('review.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = reviewQueue[currentIndex];
  if (!currentQuestion) return null;

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← {t('review.back')}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isTargetMet ? t('review.bonusRound') : reviewMoreLabel}
        </Text>
        <Text style={styles.headerProgress}>{currentIndex + 1}/{reviewQueue.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBg}>
          <View
            style={[
              styles.progressFill,
              { width: `${(currentIndex / reviewQueue.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      <QuestionCard
        key={currentQuestion.id}
        question={currentQuestion}
        onGrade={handleRecordGrade}
        onIdk={handleIdk}
        onNext={handleNext}
        onRemove={handleRemove}
        showRemove={true}
        correctAutoAdvanceMs={5000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F5F5F5', padding: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#F5F5F5',
  },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backButtonText: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  headerProgress: { fontSize: 14, color: '#888', fontWeight: '600' },
  progressContainer: { paddingHorizontal: 16, marginBottom: 8 },
  progressBg: { height: 6, backgroundColor: '#E0E0E0', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 3 },
  doneIcon: { fontSize: 64, marginBottom: 16 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#333', marginBottom: 8 },
  doneStats: { fontSize: 16, color: '#666', marginBottom: 24 },
  doneSubtitle: { fontSize: 14, color: '#888', marginBottom: 24, textAlign: 'center' },
  homeBtn: {
    backgroundColor: '#6C63FF', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14,
  },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
