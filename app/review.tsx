import React, { useEffect, useState, useCallback, useRef, Fragment } from 'react';
import Alert from '../src/utils/alertWrapper';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Animated, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import QuestionCard from '../src/components/QuestionCard';
import { initDatabase } from '../src/hooks/useDatabase';
import type { Question, Card, ReviewRecord } from '../src/types';
import { sm2, calculateNextReview } from '../src/engine/sm2';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';
import { LinearGradient } from 'expo-linear-gradient';
import { marked } from 'marked';

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
  const params = useLocalSearchParams<{ mode?: string }>();
  const isBonus = params.mode === 'bonus';
  const questionsPerDay = useSettingsStore((s) => s.questionsPerDay);
  const dailyReviewTarget = useSettingsStore((s) => s.dailyReviewTarget);
  const c = useColors();

  const [reviewQueue, setReviewQueue] = useState<(Question & { card: Card; contentTitle?: string; contentRawText?: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [todayBaseline, setTodayBaseline] = useState(0);
  const [sessionDone, setSessionDone] = useState(false);
  const [phase, setPhase] = useState<'study' | 'quiz'>('study');
  const repoRef = useRef<Awaited<ReturnType<typeof initDatabase>> | null>(null);
  const [sessionStartTime] = useState(Date.now());
  const [sourceViewerQuestion, setSourceViewerQuestion] = useState<typeof currentQuestion | null>(null);

  // Animated values for end screen
  const statAnim = useRef(new Animated.Value(0)).current;
  const animatingCorrect = useRef(new Animated.Value(0)).current;
  const animatingTotal = useRef(new Animated.Value(0)).current;
  const animatingAccuracy = useRef(new Animated.Value(0)).current;

  // Emoji burst
  const doneEmojis = ['🎯', '🔥', '💪', '⭐', '🌟', '🎉', '✨', '🏆'];
  const doneEmojiAnims = useRef(
    doneEmojis.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

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

  const handleStopForNow = () => {
    Alert.alert(
      t('review.stopForNow'),
      'Your progress has been saved! Come back anytime to continue.',
      [{ text: 'OK', onPress: () => router.back() }]
    );
  };

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const repo = await initDatabase();
      repoRef.current = repo;

      let due = await repo.getDueCards(Date.now());
      const correctToday = await repo.getTodayCorrectCount();
      setTodayBaseline(correctToday);

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

      // Apply questionsPerDay limit (skip in bonus / Review More mode)
      let limit = questionsPerDay > 0 && !isBonus ? questionsPerDay : ordered.length;
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
  }, [questionsPerDay, isBonus]);

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

  // ─── Trigger end-screen animations ─── //
  useEffect(() => {
    if (sessionDone && currentIndex >= reviewQueue.length) {
      // Animate stat counters (stagger: 200ms each)
      Animated.stagger(200, [
        Animated.timing(animatingCorrect, { toValue: stats.correct, duration: 600, useNativeDriver: true }),
        Animated.timing(animatingTotal, { toValue: stats.total, duration: 600, useNativeDriver: true }),
      ]).start();
      // Accuracy animates last
      setTimeout(() => {
        Animated.timing(animatingAccuracy, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }, 600);

      // Emoji burst
      doneEmojiAnims.forEach((anim, i) => {
        const angle = (i / doneEmojis.length) * Math.PI * 2;
        const dist = 60 + Math.random() * 60;
        Animated.parallel([
          Animated.spring(anim.scale, { toValue: 1, friction: 4, tension: 60, useNativeDriver: true, delay: i * 100 }),
          Animated.timing(anim.opacity, { toValue: 1, duration: 200, delay: i * 100, useNativeDriver: true }),
          Animated.spring(anim.x, {
            toValue: Math.cos(angle) * dist, friction: 5, tension: 40, useNativeDriver: true, delay: i * 100,
          }),
          Animated.spring(anim.y, {
            toValue: Math.sin(angle) * dist - 30, friction: 5, tension: 40, useNativeDriver: true, delay: i * 100,
          }),
        ]).start();
      });
    }
  }, [sessionDone, currentIndex, reviewQueue.length]);

  // ─── Render ─── //

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.accent} />
      </View>
    );
  }

  const goHome = () => router.dismissAll();

  if (sessionDone && currentIndex >= reviewQueue.length) {
    const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    const countLabel = stats.total === 1 ? 'concept' : 'concepts';

    // Dynamic encouraging message
    let emoji = '🎉', message = '', subtitle = '';
    if (accuracy === 100) {
      emoji = '🎯'; message = t('review.encouragementPerfect'); subtitle = t('review.encouragementPerfectSub');
    } else if (accuracy >= 90) {
      emoji = '🔥'; message = t('review.encouragementAlmost'); subtitle = t('review.encouragementAlmostSub');
    } else if (accuracy >= 70) {
      emoji = '💪'; message = t('review.encouragementGood'); subtitle = t('review.encouragementGoodSub');
    } else if (accuracy >= 50) {
      emoji = '🧠'; message = t('review.encouragementDecent'); subtitle = t('review.encouragementDecentSub');
    } else {
      emoji = '🌱'; message = t('review.encouragementKeepGoing'); subtitle = t('review.encouragementKeepGoingSub');
    }

    // Session duration
    const sessionSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
    const durationText = sessionSeconds >= 60
      ? `${Math.floor(sessionSeconds / 60)}m ${sessionSeconds % 60}s`
      : `${sessionSeconds}s`;

    return (
      <LinearGradient colors={c.heroGradient} style={[styles.centered, { paddingTop: insets.top }]}>
        {/* Emoji burst particles */}
        {doneEmojiAnims.map((anim, i) => (
          <Animated.Text
            key={i}
            style={[styles.burstEmoji, {
              transform: [
                { translateX: anim.x },
                { translateY: anim.y },
                { scale: anim.scale },
              ],
              opacity: anim.opacity,
            }]}
          >
            {doneEmojis[i]}
          </Animated.Text>
        ))}

        {/* Main emoji */}
        <Text style={styles.doneCelebration}>{emoji}</Text>

        {/* Dynamic message */}
        <Text style={[styles.doneTitle, { color: c.textPrimary }]}>{message}</Text>
        <Text style={[styles.doneSubtitle, { color: c.textOnHero }]}>
          {t('review.sessionSubtitle', { count: stats.total, count_label: countLabel })}
        </Text>

        {/* Animated stats */}
        <View style={styles.doneStatsRow}>
          <View style={[styles.doneStatBox, { backgroundColor: c.cardBg }]}>
            <View style={styles.doneStatNumRow}>
              <Animated.Text style={[styles.doneStatValue, { color: c.accent }]}>
                {animatingCorrect.interpolate({
                  inputRange: [0, stats.correct || 1],
                  outputRange: ['0', String(stats.correct)],
                })}
              </Animated.Text>
              <Text style={[styles.doneStatSlash, { color: c.accent }]}> / </Text>
              <Animated.Text style={[styles.doneStatValue, { color: c.accent }]}>
                {animatingTotal.interpolate({
                  inputRange: [0, stats.total || 1],
                  outputRange: ['0', String(stats.total)],
                })}
              </Animated.Text>
            </View>
            <Text style={[styles.doneStatLabel, { color: c.textSecondary }]}>{t('review.correct')}</Text>
          </View>
          <View style={[styles.doneStatBox, { backgroundColor: c.cardBg }]}>
            <Animated.Text style={[styles.doneStatValue, { color: accuracy >= 80 ? c.cardBorderCorrect : '#FF9800' }]}>
              {animatingAccuracy.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', `${accuracy}%`],
              })}
            </Animated.Text>
            <Text style={[styles.doneStatLabel, { color: c.textSecondary }]}>{t('review.sessionAccuracy')}</Text>
          </View>
        </View>

        {/* Sub-encouragement */}
        <Text style={[styles.doneSubSubtitle, { color: c.textOnHero }]}>
          {subtitle}
        </Text>

        {/* Duration */}
        <Text style={[styles.doneDuration, { color: c.textOnHero }]}>
          🕐 {durationText}
        </Text>

        <TouchableOpacity style={[styles.homeBtn, { backgroundColor: c.accent }]} onPress={goHome}>
          <Text style={styles.homeBtnText}>{t('review.backToHome')}</Text>
        </TouchableOpacity>
      </LinearGradient>
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

  // ─── Study Phase: Question + Answer shown together ─── //
  const StudyCard = () => {
    const studyAnim = useRef(new Animated.Value(400)).current;
    useEffect(() => {
      studyAnim.setValue(400);
      Animated.spring(studyAnim, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }).start();
    }, [currentQuestion.id]);

    const handleStudyNext = () => {
      Animated.timing(studyAnim, { toValue: -400, duration: 200, useNativeDriver: true }).start(() => {
        const next = currentIndex + 1;
        if (next >= reviewQueue.length) {
          // Study done → start quiz
          setPhase('quiz');
          setCurrentIndex(0);
        } else {
          setCurrentIndex(next);
        }
      });
    };

    const isLast = currentIndex === reviewQueue.length - 1;

    return (
      <Animated.View style={{ transform: [{ translateX: studyAnim }] }}>
        <View style={[styles.studyContainer, { backgroundColor: c.cardBg }]}>
          {/* Phase badge */}
          <View style={[styles.phaseBadge, { backgroundColor: c.accent + '20' }]}>
            <Text style={[styles.phaseBadgeText, { color: c.accent }]}>📖 Study {currentIndex + 1}/{reviewQueue.length}</Text>
          </View>

          {/* Question */}
          <Text style={[styles.studyQuestion, { color: c.textPrimary }]}>{currentQuestion.question}</Text>

          {/* Answer */}
          <View style={[styles.studyAnswerBox, { backgroundColor: c.statBoxBg, borderColor: c.cardBorderCorrect }]}>
            <Text style={[styles.studyAnswerLabel, { color: c.cardBorderCorrect }]}>Answer</Text>
            <Text style={[styles.studyAnswerText, { color: c.textPrimary }]}>{currentQuestion.correctAnswer}</Text>
          </View>

          {/* Explanation */}
          {currentQuestion.explanation && (
            <View style={[styles.studyExplanation, { backgroundColor: c.statBoxBg + '80' }]}>
              <Text style={[styles.studyExplanationLabel, { color: c.accent }]}>💡 Explanation:</Text>
              <Text style={[styles.studyExplanationText, { color: c.textSecondary }]}>{currentQuestion.explanation}</Text>
            </View>
          )}

          {/* Next button */}
          <TouchableOpacity style={[styles.studyNextBtn, { backgroundColor: c.accent }]} onPress={handleStudyNext}>
            <Text style={styles.studyNextBtnText}>
              {isLast ? t('review.startQuiz') : t('question.continue')}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // ─── Quiz Phase: Use QuestionCard with 2 options ─── //
  const quizQuestion = phase === 'quiz' && currentQuestion.type === 'multiple_choice' && currentQuestion.options
    ? {
        ...currentQuestion,
        options: (() => {
          const wrongs = currentQuestion.options!.filter(o => o !== currentQuestion.correctAnswer);
          const randomWrong = wrongs[Math.floor(Math.random() * wrongs.length)] || wrongs[0];
          // Shuffle correct + wrong
          return Math.random() > 0.5
            ? [currentQuestion.correctAnswer, randomWrong]
            : [randomWrong, currentQuestion.correctAnswer];
        })(),
      }
    : currentQuestion;

  const showStopBtn = !isBonus && phase === 'quiz';

  return (
    <>
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        {/* Header with back button + phase indicator */}
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: c.bg }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={[styles.backButtonText, { color: c.accent }]}>← {t('review.back')}</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
            {phase === 'study' ? t('review.studyMode') : (isTargetMet ? t('review.bonusRound') : reviewMoreLabel)}
          </Text>
          <Text style={[styles.headerProgress, { color: c.textSecondary }]}>
            {phase === 'quiz' ? todayBaseline + stats.total : 0}/{reviewQueue.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { backgroundColor: c.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${
                    phase === 'study'
                      ? ((currentIndex + 1) / reviewQueue.length) * 100
                      : ((todayBaseline + stats.total) / reviewQueue.length) * 100
                  }%`,
                  backgroundColor: phase === 'study' ? c.accent + '60' : c.accent,
                },
              ]}
            />
          </View>
        </View>

      {/* Source label — tap to view source content */}
      {currentQuestion.contentTitle && (
        <TouchableOpacity
          style={[styles.sourceChip, { backgroundColor: c.statBoxBg }]}
          onPress={() => setSourceViewerQuestion(currentQuestion)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sourceLabel, { color: c.textSecondary }]} numberOfLines={1}>
            📄 {currentQuestion.contentTitle}
          </Text>
          <Text style={[styles.sourceIcon, { color: c.textSecondary }]}> ↗</Text>
        </TouchableOpacity>
      )}

      {phase === 'study' ? (
        <StudyCard />
      ) : (
        <QuestionCard
          key={`quiz-${currentQuestion.id}`}
          question={quizQuestion}
          onGrade={handleRecordGrade}
          onIdk={handleIdk}
          onNext={handleNext}
          onRemove={handleRemove}
          showRemove={true}
          correctAutoAdvanceMs={5000}
        />
      )}

      {showStopBtn && (
        <TouchableOpacity style={styles.stopBtn} onPress={handleStopForNow}>
          <Text style={styles.stopBtnText}>{t('review.stopForNow')}</Text>
        </TouchableOpacity>
      )}

      </View>

      {/* Source viewer modal */}
      <Modal
        visible={!!sourceViewerQuestion}
        animationType="slide"
        onRequestClose={() => setSourceViewerQuestion(null)}
      >
        {sourceViewerQuestion && (
          <View style={[styles.modalContainer, { backgroundColor: c.bg, paddingTop: insets.top }]}>
            {/* Modal header */}
            <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
              <TouchableOpacity onPress={() => setSourceViewerQuestion(null)}>
                <Text style={[styles.modalCloseBtn, { color: c.accent }]}>Close</Text>
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter}>
                <Text style={[styles.modalHeaderTitle, { color: c.textPrimary }]} numberOfLines={1}>
                  {sourceViewerQuestion.contentTitle}
                </Text>
              </View>
              <View style={{ width: 50 }} />
            </View>

            {/* Source content */}
            <WebView
              style={styles.modalBody}
              originWhitelist={['*']}
              source={{
                html: `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    line-height: 1.7;
    padding: 16px;
    margin: 0;
    color: ${c.textPrimary};
    background-color: ${c.bg};
  }
  h1, h2, h3 { font-weight: 700; margin-top: 1.2em; margin-bottom: 0.4em; }
  h1 { font-size: 22px; }
  h2 { font-size: 19px; }
  h3 { font-size: 17px; }
  p { margin: 0 0 0.8em 0; }
  ul, ol { padding-left: 20px; margin: 0 0 0.8em 0; }
  li { margin-bottom: 0.3em; }
  code {
    font-family: 'SF Mono', Menlo, monospace;
    font-size: 14px;
    background-color: ${c.inputBg};
    padding: 2px 6px;
    border-radius: 4px;
  }
  pre {
    background-color: ${c.inputBg};
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 0 0 0.8em 0;
  }
  pre code {
    background: none;
    padding: 0;
  }
  blockquote {
    border-left: 3px solid ${c.accent};
    margin: 0 0 0.8em 0;
    padding: 4px 12px;
    opacity: 0.85;
  }
  a { color: ${c.accent}; }
  img { max-width: 100%; border-radius: 8px; }
  hr { border: none; border-top: 1px solid ${c.border}; margin: 1em 0; }
  table { width: 100%; border-collapse: collapse; margin: 0 0 0.8em 0; }
  th, td { border: 1px solid ${c.border}; padding: 8px; text-align: left; }
  th { font-weight: 600; background-color: ${c.inputBg}; }
</style>
</head>
<body>
${marked.parse(sourceViewerQuestion.contentRawText || '', { async: false }) as string}
</body>
</html>`,
              }}
              scrollEnabled={true}
            />
          </View>
        )}
      </Modal>
    </>
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
  sourceChip: {
    marginHorizontal: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceLabel: { fontSize: 12, fontWeight: '500' },
  sourceIcon: { fontSize: 12, fontWeight: '600' },
  progressBg: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  doneLogo: { width: 100, height: 100, borderRadius: 20, marginBottom: 16 },
  doneTitle: { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  doneCelebration: { fontSize: 56, marginBottom: 12 },
  doneSubtitle: { fontSize: 15, marginBottom: 24, textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },
  doneSubSubtitle: { fontSize: 13, marginBottom: 8, textAlign: 'center', paddingHorizontal: 32, lineHeight: 18, opacity: 0.8 },
  doneDuration: { fontSize: 12, marginBottom: 28, opacity: 0.6 },
  doneStatsRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  doneStatBox: {
    borderRadius: 16, padding: 20, alignItems: 'center',
    minWidth: 120,
  },
  doneStatNumRow: {
    flexDirection: 'row', alignItems: 'baseline',
  },
  doneStatSlash: {
    fontSize: 32, fontWeight: '800', marginHorizontal: 2,
  },
  doneStatValue: { fontSize: 32, fontWeight: '800' },
  doneStatLabel: { fontSize: 13, marginTop: 4 },
  doneFireEmoji: { fontSize: 28, marginBottom: 28 },
  homeBtn: {
    borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14,
  },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  stopBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  stopBtnText: { fontSize: 14, fontWeight: '600', opacity: 0.6 },
  // ─── Study Card ───
  studyContainer: {
    borderRadius: 20, padding: 24,
    marginHorizontal: 16, marginVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  phaseBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: 20, marginBottom: 16,
  },
  phaseBadgeText: { fontSize: 12, fontWeight: '700' },
  studyQuestion: {
    fontSize: 18, fontWeight: '700',
    lineHeight: 26, marginBottom: 20,
  },
  studyAnswerBox: {
    borderRadius: 12, padding: 16,
    borderWidth: 2, marginBottom: 16,
  },
  studyAnswerLabel: {
    fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: 8,
  },
  studyAnswerText: { fontSize: 16, fontWeight: '500', lineHeight: 22 },
  studyExplanation: {
    borderRadius: 10, padding: 14, marginBottom: 20,
  },
  studyExplanationLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  studyExplanationText: { fontSize: 14, lineHeight: 20 },
  studyNextBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  studyNextBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Emoji burst
  burstEmoji: {
    position: 'absolute',
    fontSize: 28,
  },
  // Source viewer modal
  modalContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseBtn: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalHeaderCenter: {
    flex: 1,
    marginHorizontal: 12,
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalBody: {
    flex: 1,
  },
});
