import React, { useCallback, useEffect, useState, useRef } from 'react';
import Alert from '../src/utils/alertWrapper';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, Platform, Image,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { initDatabase } from '../src/hooks/useDatabase';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';

const { width } = Dimensions.get('window');

// ─── Feature card data ───
const FEATURES = [
  { key: 'chat', emoji: '💬', label: 'Chat & Learn', desc: 'Review with AI-powered flashcards' },
  { key: 'knowledge', emoji: '🧠', label: 'Knowledge Base', desc: 'Your personal content library' },
  { key: 'progress', emoji: '📊', label: 'Progress', desc: 'Track your learning stats' },
  { key: 'cards', emoji: '🃏', label: 'All Cards', desc: 'Browse every flashcard' },
];

export default function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [totalToReview, setTotalToReview] = useState(0);
  const [streakDays, setStreakDays] = useState(0);
  const [totalCards, setTotalCards] = useState(0);
  const [hasContent, setHasContent] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for CTA button
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulseAnim]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, []),
  );

  const loadStats = async () => {
    try {
      const repo = await initDatabase();
      const allContents = await repo.getAllContents();
      setHasContent(allContents.length > 0);

      let dueCount = 0;
      let streakCount = 0;
      let totalCardCount = 0;
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const today = new Date().toISOString().slice(0, 10);

      for (const content of allContents) {
        const questions = await repo.getQuestionsByContentId(content.id);
        totalCardCount += questions.length;
        for (const q of questions) {
          const card = await repo.getCardByQuestionId(q.id);
          if (card && card.nextReviewAt <= Date.now()) {
            dueCount++;
          }
        }
      }

      // Streak from daily stats
      const dailyStats = await repo.getDailyStats(30);
      for (const day of dailyStats) {
        if (day.date <= today && day.totalReviewed > 0) streakCount++;
        else break;
      }

      setTotalToReview(dueCount);
      setStreakDays(streakCount);
      setTotalCards(totalCardCount);
    } catch (e) {
      console.error('Failed to load home stats:', e);
    }
  };

  const handleStartReview = () => {
    if (!hasContent) {
      Alert.alert('No Content Yet', 'Add some content first to start reviewing!');
      router.push('/add');
      return;
    }
    if (totalToReview === 0) {
      Alert.alert('All Caught Up', 'No cards due for review. Add more content to keep learning!');
      return;
    }
    router.push('/review');
  };

  return (
    <View style={[
      { flex: 1, backgroundColor: c.bg },
      Platform.OS === 'web' && { alignItems: 'center' },
    ]}>
      <View style={[
        { flex: 1 },
        Platform.OS === 'web' && { width: '100%', maxWidth: 600 },
      ]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
      >
      {/* ── Hero Card ── */}
      <View style={styles.heroSection}>
        <LinearGradient
          colors={c.heroGradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.heroCard, { borderColor: c.border }]}
        >
          <View style={styles.heroTop}>
            <Image
              source={require('../assets/stickymem-cloud-icon.png')}
              style={styles.heroLogo}
              resizeMode="contain"
            />
            <View style={styles.heroTextBlock}>
              <Text style={styles.heroTitle}>StickyMem</Text>
              <Text style={styles.heroSub}>Learn more, forget less 📚</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{totalCards}</Text>
              <Text style={styles.heroStatLabel}>Cards</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{totalToReview}</Text>
              <Text style={styles.heroStatLabel}>Due Today</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{streakDays}</Text>
              <Text style={styles.heroStatLabel}>Day Streak</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* ── CTA Review Button ── */}
      <Animated.View style={[styles.ctaWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <TouchableOpacity onPress={handleStartReview} activeOpacity={0.85}>
          <View style={styles.ctaButtonClip}>
          <LinearGradient
            colors={c.ctaGradient as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaButton}
          >
            <Text style={[styles.ctaEmoji]}>⭐</Text>
            <Text style={[styles.ctaText, { color: c.ctaTextColor }]}>
              {totalToReview > 0
                ? `Start Review (${totalToReview})`
                : 'Start Review'}
            </Text>
            <Text style={[styles.ctaChevron, { color: c.ctaTextColor }]}>→</Text>
          </LinearGradient>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Quick Stats ── */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <LinearGradient
            colors={c.statGradient1 as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <Text style={styles.statIcon}>🔥</Text>
            <Text style={styles.statValue}>{streakDays}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient
            colors={c.statGradient2 as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <Text style={styles.statIcon}>🧠</Text>
            <Text style={styles.statValue}>{totalCards}</Text>
            <Text style={styles.statLabel}>Total Cards</Text>
          </LinearGradient>
        </View>
        <View style={styles.statCard}>
          <LinearGradient
            colors={c.statGradient3 as [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statCardGradient}
          >
            <Text style={styles.statIcon}>📅</Text>
            <Text style={styles.statValue}>{totalToReview}</Text>
            <Text style={styles.statLabel}>Due Now</Text>
          </LinearGradient>
        </View>
      </View>

      {/* ── Feature Grid ── */}
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Explore</Text>
      <View style={styles.featureGrid}>
        {FEATURES.map((feature, i) => {
          const gradientColors = [c.featureGradient1, c.featureGradient2, c.featureGradient3, c.featureGradient4][i] as [string, string];
          return (
            <TouchableOpacity
              key={feature.key}
              style={styles.featureCard}
              onPress={() => {
                if (feature.key === 'progress') router.push('/progress');
                else if (feature.key === 'knowledge') router.push('/manage');
                else if (feature.key === 'cards') router.push('/review');
                else router.push('/add');
              }}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featureCardGradient}
              >
                <Text style={styles.featureEmoji}>{feature.emoji}</Text>
                <Text style={styles.featureLabel}>{feature.label}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Quick Actions ── */}
      <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Quick Actions</Text>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: c.cardBg, borderColor: c.border }]}
          onPress={() => router.push('/add')}
        >
          <Text style={[styles.actionBtnText, { color: c.textPrimary }]}>➕ Add Content</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: c.cardBg, borderColor: c.border }]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.actionBtnText, { color: c.textPrimary }]}>⚙️ Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },

  // ── Hero ──
  heroSection: { marginBottom: 20 },
  heroCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 0,
    shadowColor: '#7C4DFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 14,
  },
  heroLogo: {
    width: 64,
    height: 64,
  },
  heroTextBlock: {
    flexDirection: 'column',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    textAlign: 'left',
  },
  heroSub: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'left',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatNum: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // ── CTA ──
  ctaWrapper: {
    marginBottom: 24,
    shadowColor: '#FFB300',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaButtonClip: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  ctaButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaEmoji: { fontSize: 22 },
  ctaText: {
    fontSize: 19,
    fontWeight: '800',
  },
  ctaChevron: { fontSize: 20, fontWeight: '700' },

  // ── Stats Row ──
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statCardGradient: {
    padding: 14,
    alignItems: 'center',
    gap: 4,
  },
  statIcon: { fontSize: 22 },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },

  // ── Feature Grid ──
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  featureCard: {
    width: '48%',
    maxWidth: 300,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  featureCardGradient: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
    minHeight: 140,
  },
  featureEmoji: { fontSize: 30 },
  featureLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  featureDesc: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 15,
  },

  // ── Quick Actions ──
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 14, fontWeight: '600' },
});
