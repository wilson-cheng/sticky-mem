import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useDatabase } from '../src/hooks/useDatabase';
import { useSchedule } from '../src/hooks/useSchedule';
import { useSettingsStore } from '../src/store/settings';

export default function HomeScreen() {
  const router = useRouter();
  const repo = useDatabase();
  const { dueCount, totalQuestions, loading, refresh } = useSchedule(repo);
  const isConfigured = useSettingsStore((s) => s.isConfigured);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>StickyMem</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Review Card */}
        <TouchableOpacity
          style={styles.reviewCard}
          onPress={() => router.push('/review')}
          disabled={dueCount === 0 && !loading}
        >
          <Text style={styles.reviewCardTitle}>Today's Review</Text>
          {loading ? (
            <Text style={styles.reviewCardCount}>...</Text>
          ) : dueCount > 0 ? (
            <>
              <Text style={styles.reviewCardCount}>{dueCount}</Text>
              <Text style={styles.reviewCardLabel}>questions due</Text>
              <TouchableOpacity style={styles.startButton}>
                <Text style={styles.startButtonText}>Start Review</Text>
              </TouchableOpacity>
            </>
          ) : totalQuestions > 0 ? (
            <>
              <Text style={styles.reviewCardCount}>0</Text>
              <Text style={styles.reviewCardLabel}>questions due — you're all caught up! 🎉</Text>
            </>
          ) : (
            <>
              <Text style={styles.reviewCardCount}>0</Text>
              <Text style={styles.reviewCardLabel}>No content yet. Add something to learn!</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalQuestions}</Text>
            <Text style={styles.statLabel}>Total Questions</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{dueCount}</Text>
            <Text style={styles.statLabel}>Due Today</Text>
          </View>
        </View>

        {/* API Key Warning */}
        {!isConfigured && (
          <TouchableOpacity style={styles.warningCard} onPress={() => router.push('/settings')}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              API key not configured. Go to Settings to add your DeepSeek key.
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/add')}>
            <Text style={styles.actionIcon}>📝</Text>
            <Text style={styles.actionText}>Add Content</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/progress')}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 24, marginTop: 8,
  },
  appName: { fontSize: 28, fontWeight: '800', color: '#333' },
  settingsIcon: { fontSize: 24 },
  reviewCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  reviewCardTitle: { fontSize: 18, fontWeight: '600', color: '#666', marginBottom: 8 },
  reviewCardCount: { fontSize: 64, fontWeight: '800', color: '#4A90D9' },
  reviewCardLabel: { fontSize: 14, color: '#888', marginTop: 4, marginBottom: 16 },
  startButton: {
    backgroundColor: '#4A90D9', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12,
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  statBox: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  statNumber: { fontSize: 32, fontWeight: '800', color: '#333' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  warningCard: {
    flexDirection: 'row', backgroundColor: '#FFF3E0', borderRadius: 12, padding: 14,
    alignItems: 'center', gap: 10, marginBottom: 20,
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 20,
    alignItems: 'center', gap: 8,
  },
  actionIcon: { fontSize: 28 },
  actionText: { fontSize: 14, fontWeight: '500', color: '#666' },
});
