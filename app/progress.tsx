import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { initDatabase } from '../src/hooks/useDatabase';
import type { DailyStats } from '../src/types';
import { useColors } from '../src/theme/useColors';
import ProgressChart from '../src/components/ProgressChart';
import { useTranslation } from '../src/i18n/useTranslation';

export default function ProgressScreen() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const c = useColors();

  useEffect(() => {
    loadStats();
    async function loadStats() {
      try {
        const repo = await initDatabase();
        const dailyStats = await repo.getDailyStats(30);
        setStats(dailyStats);

        const total = dailyStats.reduce((sum, d) => sum + d.totalReviewed, 0);
        const correct = dailyStats.reduce((sum, d) => sum + d.correctCount, 0);
        setTotalReviewed(total);
        setOverallAccuracy(total > 0 ? correct / total : 0);

        // Calculate streak from daily stats
        let streakCount = 0;
        const today = new Date().toISOString().slice(0, 10);
        for (const day of dailyStats) {
          if (day.date <= today && day.totalReviewed > 0) streakCount++;
          else break;
        }
        setStreak(streakCount);
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: c.bg }]}>
        <ActivityIndicator size="large" color={c.blue} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: c.bg }]} contentContainerStyle={styles.content}>
      {/* Hero */}
      {totalReviewed > 0 && (
        <View style={[styles.heroCard, { backgroundColor: c.cardBg }]}>
          <Text style={styles.heroEmoji}>
            {overallAccuracy >= 0.9 ? '🧠🔥' : overallAccuracy >= 0.7 ? '🧠' : '🌱'}
          </Text>
          <Text style={[styles.heroText, { color: c.textPrimary }]}>
            {t('progress.hero', { accuracy: Math.round(overallAccuracy * 100) })}
          </Text>
          {streak > 0 && (
            <Text style={[styles.streakText, { color: c.textSecondary }]}>
              {t('home.streakDays', { count: streak })}
            </Text>
          )}
        </View>
      )}

      {/* Stats Grid */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
          <Text style={[styles.statNumber, { color: c.textPrimary }]}>{Math.round(overallAccuracy * 100)}%</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('progress.accuracy')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
          <Text style={[styles.statNumber, { color: c.textPrimary }]}>{totalReviewed}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('progress.totalReviews')}</Text>
        </View>
        <View style={[styles.statBox, { backgroundColor: c.statBoxBg }]}>
          <Text style={[styles.statNumber, { color: c.textPrimary }]}>{stats.length}</Text>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>{t('progress.daysTracked')}</Text>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>{t('progress.accuracyTrend')}</Text>
      <View style={[styles.chartCard, { backgroundColor: c.cardBg }]}>
        <ProgressChart data={stats} />
      </View>

      {stats.length === 0 && (
        <Text style={[styles.emptyText, { color: c.textSecondary }]}>
          {t('progress.empty')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCard: {
    borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  heroEmoji: { fontSize: 48, marginBottom: 12 },
  heroText: { fontSize: 18, fontWeight: '700', textAlign: 'center', lineHeight: 26 },
  streakText: { fontSize: 14, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, borderRadius: 14, padding: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '800' },
  statLabel: { fontSize: 12, marginTop: 4 },
  chartCard: {
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyText: { fontSize: 14, textAlign: 'center', marginTop: 32, lineHeight: 20 },
});
