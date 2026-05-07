import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import QuestionCard from '../src/components/QuestionCard';
import { initDatabase } from '../src/hooks/useDatabase';
import type { Question, Card, ReviewRecord } from '../src/types';
import { sm2, calculateNextReview } from '../src/engine/sm2';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
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
  const c = useColors();

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
        { text: t('review.leave'), style: 'destructive', onPress: () => router.back() },
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
        accuracy: ((todayStats?.correctCount ?? 0) + (grade >= 3 ? 1 : 0)) / ((todayStats?.totalReviewed ?? 0) + 1),
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
          accuracy: (todayStats?.correctCount ?? 0) / ((todayStats?.totalReviewed ?? 0) + 1),
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

    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        t('question.remove'),
        t('review.removeConfirm'),
        [
          { text: t('settings.cancel'), style: 'cancel', onPress: () => resolve(false) },
          { text: t('question.remove'), style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
    if (!confirmed) return;

    try {
      const repo = repoRef.current;
      await repo.run('DELETE FROM cards WHERE question_id = ?', [currentCard.id]);
      await repo.run('DELETE FROM questions WHERE id = ?', [currentCard.id]);
      advance();
    } catch (e) {
      console.error('Failed to remove question:', e);
    }
  }, [reviewQueue, currentIndex, advance, t]);

  // ─── Check if daily target is met ─── //
  const isTargetMet = dailyReviewTarget > 0 && stats.total >= dailyReviewTarget;
  const reviewMoreLabel = dailyReviewTarget > 0 && stats.total > 0
    ? `${t('home.reviewMore')} (${stats.total}/${dailyReviewTarget})`
    : t('home.startReview');

  // ─── Render ─── //

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  const goHome = () => router.dismissAll();

  if (sessionDone && currentIndex >= reviewQueue.length) {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const countLabel = stats.total === 1 ? 'concept' : 'concepts';
    return (
      <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: c.bg }]}>
        <Text style={styles.doneCelebration}>🧠</Text>
        <Text style={[styles.doneTitle, { color: c.textPrimary }]}>{t('review.sessionTitle')}</Text>
        <Text style={[styles.doneSubtitle, { color: c.textSecondary }]}>
          {t('review.sessionSubtitle', { count: stats.total, count_label: countLabel })}
        </Text>
        <View style={[styles.doneStatsRow]}>
          <View style={[styles.doneStatBox, { backgroundColor: c.cardBg }]}>
            <Text style={[styles.doneStatValue, { color: c.accent }]}>{stats.correct}/{stats.total}</Text>
            <Text style={[styles.doneStatLabel, { color: c.textSecondary }]}>{t('review.correct')}</Text>
          </View>
          <View style={[styles.doneStatBox, { backgroundColor: c.cardBg }]}>
            <Text style={[styles.doneStatValue, { color: accuracy >= 80 ? '#4CAF50' : '#FF9800' }]}>
              {accuracy}%
            </Text>
            <Text style={[styles.doneStatLabel, { color: c.textSecondary }]}>{t('review.sessionAccuracy')}</Text>
          </View>
        </View>
        <Text style={styles.doneFireEmoji}>
          {accuracy >= 90 ? '🔥🔥🔥' : accuracy >= 70 ? '🔥🔥' : '🔥'}
        </Text>
        <TouchableOpacity style={[styles.homeBtn, { backgroundColor: c.blue }]} onPress={goHome}>
          <Text style={styles.homeBtnText}>{t('review.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (reviewQueue.length === 0) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, backgroundColor: c.bg }]}>
        <Text style={styles.doneCelebration}>✅</Text>
        <Text style={[styles.doneTitle, { color: c.textPrimary }]}>{t('review.noCardsDue')}</Text>
        <Text style={[styles.doneSubtitle, { color: c.textSecondary }]}>{t('review.noCardsSubtitle')}</Text>
        <TouchableOpacity style={[styles.homeBtn, { backgroundColor: c.accent }]} onPress={goHome}>
          <Text style={styles.homeBtnText}>{t('review.backToHome')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentQuestion = reviewQueue[currentIndex];
  if (!currentQuestion) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header with back button */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.bg }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={[styles.backButtonText, { color: c.accent }]}>← {t('review.back')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
          {isTargetMet ? t('review.bonusRound') : reviewMoreLabel}
        </Text>
        <Text style={[styles.headerProgress, { color: c.textSecondary }]}>{currentIndex + 1}/{reviewQueue.length}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBg, { backgroundColor: c.border }]}>
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
  container: { flex: 1 },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backButton: { paddingVertical: 8, paddingRight: 12 },
  backButtonText: { fontSize: 15, fontWeight: '600' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerProgress: { fontSize: 14, fontWeight: '600' },
  progressContainer: { paddingHorizontal: 16, marginBottom: 8 },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#6C63FF', borderRadius: 3 },
  doneCelebration: { fontSize: 72, marginBottom: 12 },
  doneTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  doneSubtitle: { fontSize: 15, marginBottom: 24, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  doneStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  doneStatBox: {
    borderRadius: 16, padding: 20, alignItems: 'center',
    minWidth: 120,
  },
  doneStatValue: { fontSize: 32, fontWeight: '800' },
  doneStatLabel: { fontSize: 13, marginTop: 4 },
  doneFireEmoji: { fontSize: 28, marginBottom: 28 },
  homeBtn: {
    borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14,
  },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
