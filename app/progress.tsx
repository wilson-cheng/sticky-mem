import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { initDatabase } from '../src/hooks/useDatabase';
import type { DailyStats } from '../src/types';
import ProgressChart from '../src/components/ProgressChart';

export default function ProgressScreen() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error('Failed to load stats:', e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Overall Performance</Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{Math.round(overallAccuracy * 100)}%</Text>
          <Text style={styles.statLabel}>Accuracy</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{totalReviewed}</Text>
          <Text style={styles.statLabel}>Total Reviews</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{stats.length}</Text>
          <Text style={styles.statLabel}>Days Tracked</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Accuracy Trend</Text>
      <View style={styles.chartCard}>
        <ProgressChart data={stats} />
      </View>

      {stats.length === 0 && (
        <Text style={styles.emptyText}>
          Start reviewing content to see your memory retention trend over time.
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 16, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 28, fontWeight: '800', color: '#333' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  chartCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 32, lineHeight: 20 },
});
