import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../src/hooks/useDatabase';
import { useSchedule } from '../src/hooks/useSchedule';
import { useSettingsStore } from '../src/store/settings';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';

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

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../assets/icon.png')}
              style={{ width: 36, height: 36, borderRadius: 8 }}
            />
            <Text style={[styles.appName, { color: c.textPrimary }]}>StickyMem</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Review Card */}
        <TouchableOpacity
          style={[styles.reviewCard, { backgroundColor: c.cardBg }]}
          onPress={() => router.push('/review')}
          disabled={dueCount === 0 && !loading}
        >
          <Text style={[styles.reviewCardTitle, { color: c.textSecondary }]}>{t('home.todayReview')}</Text>
          {loading ? (
            <Text style={[styles.reviewCardCount, { color: c.blue }]}>...</Text>
          ) : displayDueCount > 0 ? (
            <>
              <Text style={[styles.reviewCardCount, { color: c.blue }]}>{dueCount}</Text>
              <Text style={[styles.reviewCardLabel, { color: c.textSecondary }]}>
                {dueCount === 1 ? t('home.questionReady') : t('home.questionsReady')}
              </Text>
              {todayReviewed > 0 && (
                <Text style={styles.progressLabel}>
                  {todayReviewed} {t('home.reviewedToday')}{targetMet ? ' ✅' : ''}
                </Text>
              )}
              <Text style={[styles.startButton, { backgroundColor: c.blue }]}>{buttonLabel}</Text>
            </>
          ) : totalQuestions > 0 ? (
            <>
              <Text style={[styles.reviewCardCount, { color: c.blue }]}>0</Text>
              <Text style={[styles.reviewCardLabel, { color: c.textSecondary }]}>
                {targetMet
                  ? t('home.allDone')
                  : todayReviewed > 0
                    ? t('home.allDone')
                    : t('home.noneDue')}
              </Text>
              {todayReviewed > 0 && (
                <Text style={styles.progressLabel}>
                  {todayReviewed} {t('home.reviewedToday')} ✅
                </Text>
              )}
              {targetMet && (
                <Text style={[styles.startButton, { backgroundColor: c.blue }]}>{buttonLabel}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={[styles.reviewCardCount, { color: c.blue }]}>0</Text>
              <Text style={[styles.reviewCardLabel, { color: c.textSecondary }]}>{t('home.noContent')}</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={[styles.statNumber, { color: c.textPrimary }]}>{totalQuestions}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.totalCards')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={[styles.statNumber, { color: c.textPrimary }]}>{displayDueCount}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.readyToReview')}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
            <Text style={[styles.statNumber, { color: c.textPrimary }]}>{todayReviewed}</Text>
            <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('home.reviewedTodayLabel')}</Text>
          </View>
        </View>

        {/* API Key Warning — only show after hydration is complete */}
        {!loading && isHydrated && !isConfigured && (
          <TouchableOpacity style={[styles.warningCard, { backgroundColor: c.warningBg }]} onPress={() => router.push('/settings')}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>{t('home.apiKeyWarning')}</Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.cardBg }]} onPress={() => router.push('/add')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{t('home.addContent')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: c.cardBg }]} onPress={() => router.push('/manage')}>
            <Text style={styles.actionIcon}>📂</Text>
            <Text style={[styles.actionText, { color: c.textSecondary }]}>{t('home.manage')}</Text>
          </TouchableOpacity>
        </View>
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
  appName: { fontSize: 28, fontWeight: '800' },
  settingsIcon: { fontSize: 24 },
  reviewCard: {
    borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  reviewCardTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  reviewCardCount: { fontSize: 64, fontWeight: '800' },
  reviewCardLabel: { fontSize: 14, marginTop: 4, marginBottom: 4 },
  progressLabel: { fontSize: 13, color: '#4CAF50', marginBottom: 12, fontWeight: '500' },
  startButton: {
    borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12,
    color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', overflow: 'hidden',
  },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 32, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  warningCard: {
    flexDirection: 'row', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 10, marginBottom: 20,
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, borderRadius: 14, padding: 20,
    alignItems: 'center', gap: 8,
  },
  actionIcon: { fontSize: 28 },
  actionText: { fontSize: 14, fontWeight: '500' },
});
