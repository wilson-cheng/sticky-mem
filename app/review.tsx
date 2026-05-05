import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import QuestionCard from '../src/components/QuestionCard';
import { useReview } from '../src/hooks/useReview';
import { initDatabase } from '../src/hooks/useDatabase';

export default function ReviewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const {
    currentQuestion, currentIndex, totalCount,
    progress, isComplete, startSession, submitGrade,
  } = useReview();

  useEffect(() => {
    loadDueCards();
    async function loadDueCards() {
      try {
        const repo = await initDatabase();
        const due = await repo.getDueCards(Date.now());
        if (due.length > 0) {
          startSession(due);
        }
      } catch (e) {
        console.error('Failed to load due cards:', e);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const handleAnswer = (correct: boolean) => {
    submitGrade(correct);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4A90D9" />
      </View>
    );
  }

  if (totalCount === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>🎉</Text>
        <Text style={styles.emptyTitle}>All caught up!</Text>
        <Text style={styles.emptySubtitle}>
          No questions due for review. Add some content first!
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/add')}>
          <Text style={styles.addButtonText}>Add Content</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isComplete) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyIcon}>✅</Text>
        <Text style={styles.emptyTitle}>Session Complete!</Text>
        <Text style={styles.emptySubtitle}>
          You reviewed {totalCount} questions
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={() => router.back()}>
          <Text style={styles.addButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>
        {currentIndex + 1} / {totalCount}
      </Text>

      {currentQuestion && (
        <QuestionCard
          key={currentQuestion.id}
          question={currentQuestion}
          onAnswer={handleAnswer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 8 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5', padding: 32 },
  progressBar: {
    height: 4, backgroundColor: '#E0E0E0', marginHorizontal: 16, borderRadius: 2,
  },
  progressFill: { height: 4, backgroundColor: '#4A90D9', borderRadius: 2 },
  progressText: { textAlign: 'center', fontSize: 14, color: '#666', marginVertical: 8 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  addButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, paddingHorizontal: 32, paddingVertical: 14,
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
