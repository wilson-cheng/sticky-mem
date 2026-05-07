import React, { useCallback, useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Animated, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../src/hooks/useDatabase';
import { useSchedule } from '../src/hooks/useSchedule';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';
import { seedDemoContent } from '../src/db/seedData';

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const repo = useDatabase();
  const { dueCount, totalQuestions, todayReviewed, loading, refresh } = useSchedule(repo);
  const isConfigured = useSettingsStore((s) => s.isConfigured);
  const isHydrated = useSettingsStore((s) => s.isHydrated);
  const dailyReviewTarget = useSettingsStore((s) => s.dailyReviewTarget);
  const { t } = useTranslation();
  const c = useColors();
  const [seeding, setSeeding] = useState(false);

  const handleSeedDemo = useCallback(async () => {
    if (!repo || seeding) return;
    setSeeding(true);
    try {
      await seedDemoContent(repo);
      Alert.alert(t('home.demoAdded'));
      refresh();
    } catch (e: any) {
      console.error('Failed to seed demo:', e);
      Alert.alert('Error', e.message || 'Failed to load demo content.');
    } finally {
      setSeeding(false);
    }
  }, [repo, seeding, t, refresh]);

  // Animation for empty state
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // Stagger animations for normal state sections
  const cardAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (totalQuestions === 0 && !loading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 600, useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0, duration: 600, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [totalQuestions, loading, fadeAnim, slideAnim]);

  // Stagger animations when content is present
  useEffect(() => {
    if (totalQuestions > 0 && !loading) {
      cardAnim.setValue(0);
      statsAnim.setValue(0);
      actionsAnim.setValue(0);
      Animated.stagger(120, [
        Animated.timing(cardAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(statsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(actionsAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }
  }, [totalQuestions, loading, cardAnim, statsAnim, actionsAnim]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Determine if the daily target has been met
  const targetMet = dailyReviewTarget > 0 && todayReviewed >= dailyReviewTarget;
  const displayDueCount = targetMet ? 0 : dueCount;
  const buttonLabel =
    todayReviewed === 0
      ? t('home.startReview')
      : targetMet
        ? t('home.reviewMore')
        : `${t('home.finishRest')} (${dailyReviewTarget - todayReviewed})`;

  const getAccuracyEmoji = () => {
    if (todayReviewed === 0) return '';
    const accuracy = todayReviewed / Math.max(dailyReviewTarget, 1);
    if (accuracy >= 1) return '🎯';
    if (accuracy >= 0.5) return '🔥';
    return '💪';
  };

  // ─── LOADING STATE ─── //
  if (loading && totalQuestions === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
        <View style={[styles.header, { paddingTop: 0 }]}>
          <View style={styles.headerLeft}>
            <View style={[styles.logoCircle, { backgroundColor: c.accent }]}>
              <Image source={require('../assets/icon.png')} style={styles.logoImage} />
            </View>
            <Text style={[styles.appName, { color: c.textPrimary }]}>StickyMem</Text>
          </View>
        </View>
        <View style={styles.loadingCentered}>
          <ActivityIndicator size="large" color={c.blue} />
        </View>
      </View>
    );
  }

  // ─── EMPTY STATE ─── //
  if (!loading && totalQuestions === 0) {
    return (
      <View style={[styles.container, { backgroundColor: c.bg }]}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={[styles.header, { paddingTop: insets.top }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.logoCircle, { backgroundColor: c.accent }]}>
                <Image source={require('../assets/icon.png')} style={styles.logoImage} />
              </View>
              <Text style={[styles.appName, { color: c.textPrimary }]}>StickyMem</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/settings')}>
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Value Proposition */}
          <Animated.View
            style={[
              styles.heroSection,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={[styles.heroIconContainer, { backgroundColor: c.accent + '15' }]}>
              <Image source={require('../assets/icon.png')} style={styles.heroLogoImage} />
            </View>
            <Text style={[styles.heroTitle, { color: c.textPrimary }]}>
              {t('home.emptyTitle')}
            </Text>
            <Text style={[styles.heroSubtitle, { color: c.textSecondary }]}>
              {t('home.emptySubtitle')}
            </Text>

            {/* How it works */}
            <View style={styles.howItWorksSection}>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
                {t('home.howItWorks')}
              </Text>
              <View style={styles.stepsRow}>
                <View style={[styles.stepCard, { backgroundColor: c.cardBg }]}>
                  <View style={[styles.stepCircle, { backgroundColor: c.accent }]}>
                    <Text style={styles.stepNumber}>1</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: c.textPrimary }]}>📝</Text>
                  <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
                    {t('home.emptyStep1')}
                  </Text>
                  <Text style={[styles.stepSub, { color: c.textSecondary }]}>
                    {t('home.emptyStep1Desc')}
                  </Text>
                </View>
                <View style={[styles.stepArrow]}>
                  <Text style={[styles.arrowText, { color: c.textSecondary }]}>→</Text>
                </View>
                <View style={[styles.stepCard, { backgroundColor: c.cardBg }]}>
                  <View style={[styles.stepCircle, { backgroundColor: c.accent }]}>
                    <Text style={styles.stepNumber}>2</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: c.textPrimary }]}>🤖</Text>
                  <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
                    {t('home.emptyStep2')}
                  </Text>
                  <Text style={[styles.stepSub, { color: c.textSecondary }]}>
                    {t('home.emptyStep2Desc')}
                  </Text>
                </View>
                <View style={[styles.stepArrow]}>
                  <Text style={[styles.arrowText, { color: c.textSecondary }]}>→</Text>
                </View>
                <View style={[styles.stepCard, { backgroundColor: c.cardBg }]}>
                  <View style={[styles.stepCircle, { backgroundColor: c.accent }]}>
                    <Text style={styles.stepNumber}>3</Text>
                  </View>
                  <Text style={[styles.stepTitle, { color: c.textPrimary }]}>✅</Text>
                  <Text style={[styles.stepDesc, { color: c.textSecondary }]}>
                    {t('home.emptyStep3')}
                  </Text>
                  <Text style={[styles.stepSub, { color: c.textSecondary }]}>
                    {t('home.emptyStep3Desc')}
                  </Text>
                </View>
              </View>
            </View>

            {/* CTA */}
            <TouchableOpacity
              style={[styles.getStartedButton, { backgroundColor: c.accent }]}
              onPress={() => router.push('/add')}
            >
              <Text style={styles.getStartedText}>{t('home.getStarted')}</Text>
            </TouchableOpacity>

            {/* Try Demo */}
            <TouchableOpacity
              style={[styles.tryDemoButton, { borderColor: c.border }]}
              onPress={handleSeedDemo}
              disabled={seeding || !repo}
            >
              {seeding ? (
                <ActivityIndicator size="small" color={c.textSecondary} />
              ) : (
                <Text style={[styles.tryDemoText, { color: c.textSecondary }]}>
                  {t('home.tryDemo')}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // ─── NORMAL STATE ─── //
  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.logoCircle, { backgroundColor: c.accent }]}>
              <Image source={require('../assets/icon.png')} style={styles.logoImage} />
            </View>
            <Text style={[styles.appName, { color: c.textPrimary }]}>StickyMem</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Review Card */}
        <Animated.View
          style={{
            opacity: cardAnim,
            transform: [{ translateY: cardAnim.interpolate({
              inputRange: [0, 1], outputRange: [20, 0],
            }) }],
          }}
        >
          <View style={[styles.reviewCard, { backgroundColor: c.cardBg }]}>
            <Text style={[styles.reviewCardTitle, { color: c.textSecondary }]}>
              ⚡ {t('home.todayReview')} {getAccuracyEmoji()}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={c.blue} style={{ marginVertical: 24 }} />
            ) : displayDueCount > 0 ? (
              <>
                {/* Due count in accent circle */}
                <View style={[styles.countCircle, { backgroundColor: c.accent + '18' }]}>
                  <Text style={[styles.countNumber, { color: c.accent }]}>{dueCount}</Text>
                </View>
                <Text style={[styles.reviewCardLabel, { color: c.textSecondary }]}>
                  {dueCount === 1 ? t('home.questionReady') : t('home.questionsReady')}
                </Text>

                {/* Daily target progress bar */}
                {dailyReviewTarget > 0 && todayReviewed > 0 && (
                  <View style={styles.progressSection}>
                    <View style={[styles.progressBarBg, { backgroundColor: c.border }]}>
                      <View style={[
                        styles.progressBarFill,
                        { backgroundColor: c.accent, width: `${Math.min(Math.round((todayReviewed / dailyReviewTarget) * 100), 100)}%` },
                      ]} />
                    </View>
                    <Text style={[styles.progressText, { color: c.textSecondary }]}>
                      {todayReviewed} / {dailyReviewTarget} today
                    </Text>
                  </View>
                )}

                {/* Start Review Button */}
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: c.blue }]}
                  onPress={() => router.push('/review')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>▶  {buttonLabel}</Text>
                </TouchableOpacity>
              </>
            ) : totalQuestions > 0 ? (
              <>
                {/* All done — celebration */}
                <View style={[styles.countCircle, { backgroundColor: c.successBg }]}>
                  <Text style={styles.doneEmoji}>🎉</Text>
                </View>
                <Text style={[styles.reviewCardLabel, { color: c.textSecondary, fontSize: 16, fontWeight: '600', marginTop: 12 }]}>
                  {t('home.allDone')}
                </Text>
                {todayReviewed > 0 && (
                  <Text style={[styles.streakInlineLabel, { color: c.textSecondary }]}>
                    {t('home.streakDays', { count: todayReviewed })}
                  </Text>
                )}
                {targetMet && (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: c.accent }]}
                    onPress={() => router.push('/review')}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.primaryButtonText}>▶  {buttonLabel}</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : null}
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          style={{
            opacity: statsAnim,
            transform: [{ translateY: statsAnim.interpolate({
              inputRange: [0, 1], outputRange: [20, 0],
            }) }],
          }}
        >
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={styles.statIcon}>📚</Text>
            <Text style={[styles.statNumber, { color: c.textPrimary }]}>{totalQuestions}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.totalCards')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={styles.statIcon}>⏰</Text>
            <Text style={[styles.statNumber, { color: displayDueCount > 0 ? c.blue : c.textPrimary }]}>{displayDueCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.readyToReview')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={styles.statIcon}>✅</Text>
            <Text style={[styles.statNumber, { color: c.textPrimary }]}>{todayReviewed}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.reviewedTodayLabel')}</Text>
          </View>
        </View>
        </Animated.View>

        {/* Streak / Motivation Card */}
        {todayReviewed > 0 && (
          <Animated.View
            style={[styles.motivationCard, { backgroundColor: c.cardBg, opacity: statsAnim }]}
          >
            <Text style={styles.motivationEmoji}>🔥</Text>
            <View style={styles.motivationTextSection}>
              <Text style={[styles.motivationLabel, { color: c.textPrimary }]}>
                {t('home.streakDays', { count: todayReviewed })}
              </Text>
              <Text style={[styles.motivationSubtext, { color: c.textSecondary }]}>
                {targetMet
                  ? t('home.onARoll')
                  : `Keep going — ${dailyReviewTarget - todayReviewed} more`}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* API Key Warning — only show after hydration is complete */}
        {!loading && isHydrated && !isConfigured && (
          <TouchableOpacity style={[styles.warningCard, { backgroundColor: c.warningBg }]} onPress={() => router.push('/settings')}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{t('home.apiKeyWarning')}</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <Animated.View
          style={{
            opacity: actionsAnim,
            transform: [{ translateY: actionsAnim.interpolate({
              inputRange: [0, 1], outputRange: [20, 0],
            }) }],
          }}
        >
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.cardBg }]} onPress={() => router.push('/add')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{t('home.addContent')}</Text>
            <Text style={[styles.actionHint, { color: c.textSecondary }]}>Paste text or link</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.cardBg }]} onPress={() => router.push('/manage')}>
            <Text style={styles.actionIcon}>📂</Text>
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{t('home.manage')}</Text>
            <Text style={[styles.actionHint, { color: c.textSecondary }]}>View all content</Text>
          </TouchableOpacity>
        </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoCircle: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  logoEmoji: { fontSize: 20 },
  logoImage: { width: 22, height: 22, borderRadius: 4 },
  appName: { fontSize: 28, fontWeight: '800' },
  settingsIcon: { fontSize: 24 },
  loadingCentered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  // ─── Empty State ─── //
  heroSection: {
    alignItems: 'center', paddingTop: 20,
  },
  heroIconContainer: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  heroEmoji: { fontSize: 40 },
  heroLogoImage: { width: 50, height: 50, borderRadius: 8 },
  heroTitle: {
    fontSize: 24, fontWeight: '800',
    textAlign: 'center', lineHeight: 32,
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 14, textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 16,
    marginBottom: 32,
  },
  howItWorksSection: {
    width: '100%', marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '600',
    textAlign: 'center', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 1,
  },
  stepsRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    width: 90, borderRadius: 14, padding: 12,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  stepCircle: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  stepNumber: { fontSize: 13, fontWeight: '800', color: '#fff' },
  stepTitle: { fontSize: 20, marginBottom: 4 },
  stepDesc: { fontSize: 12, fontWeight: '600' },
  stepSub: { fontSize: 10, marginTop: 2, textAlign: 'center' },
  stepArrow: {
    paddingHorizontal: 6,
  },
  arrowText: { fontSize: 18, fontWeight: '300' },
  getStartedButton: {
    borderRadius: 14, paddingVertical: 16, paddingHorizontal: 48,
    alignItems: 'center', width: '100%',
    shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  getStartedText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  tryDemoButton: {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40,
    alignItems: 'center', width: '100%', marginTop: 12,
    borderWidth: 1.5,
  },
  tryDemoText: { fontSize: 15, fontWeight: '500' },
  // ─── Normal State ─── //
  reviewCard: {
    borderRadius: 20, padding: 28,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  reviewCardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, letterSpacing: 0.3 },
  reviewCardLabel: { fontSize: 14, marginTop: 6, marginBottom: 8 },
  countCircle: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  countNumber: { fontSize: 44, fontWeight: '800' },
  doneEmoji: { fontSize: 44 },
  progressSection: {
    width: '100%', marginTop: 12, marginBottom: 16,
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%', height: 8, borderRadius: 4,
    overflow: 'hidden', marginBottom: 6,
  },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressText: { fontSize: 12, fontWeight: '500' },
  streakInlineLabel: { fontSize: 13, marginTop: 8, fontWeight: '500' },
  primaryButton: {
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 40,
    alignItems: 'center', width: '100%', marginTop: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statNumber: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, fontWeight: '500' },
  motivationCard: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 16, marginBottom: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  motivationEmoji: { fontSize: 28 },
  motivationTextSection: { flex: 1 },
  motivationLabel: { fontSize: 15, fontWeight: '700' },
  motivationSubtext: { fontSize: 12, marginTop: 2 },
  warningCard: {
    flexDirection: 'row', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 10, marginBottom: 16,
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  actionButton: {
    flex: 1, borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  actionIcon: { fontSize: 32 },
  actionText: { fontSize: 15, fontWeight: '600' },
  actionHint: { fontSize: 11, marginTop: 1, opacity: 0.7 },
});
