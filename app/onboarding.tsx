import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../src/theme/useColors';
import { useTranslation } from '../src/i18n/useTranslation';
import { useSettingsStore } from '../src/store/settings';

const { width } = Dimensions.get('window');

const slides = [
  {
    key: '1',
    emoji: '🧠',
    titleKey: 'onboarding.title1' as const,
    subtitleKey: 'onboarding.subtitle1' as const,
  },
  {
    key: '2',
    emoji: '🤖',
    titleKey: 'onboarding.title2' as const,
    subtitleKey: 'onboarding.subtitle2' as const,
  },
  {
    key: '3',
    emoji: '⚡',
    titleKey: 'onboarding.title3' as const,
    subtitleKey: 'onboarding.subtitle3' as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { t } = useTranslation();
  const setHasSeenOnboarding = useSettingsStore((s) => s.setHasSeenOnboarding);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isLast = currentIndex === slides.length - 1;

  const handleNext = () => {
    if (!isLast) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleGetStarted = () => {
    setHasSeenOnboarding(true);
    router.replace('/');
  };

  const handleSkip = () => {
    setHasSeenOnboarding(true);
    router.replace('/');
  };

  const onMomentumEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / width);
    setCurrentIndex(idx);
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={[styles.slide, { width }]}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={[styles.title, { color: c.textPrimary }]}>
        {t(item.titleKey)}
      </Text>
      <Text style={[styles.subtitle, { color: c.textSecondary }]}>
        {t(item.subtitleKey)}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Skip button */}
      <TouchableOpacity
        onPress={handleSkip}
        style={[styles.skipButton, { top: insets.top + 12 }]}
      >
        <Text style={[styles.skipText, { color: c.textSecondary }]}>{t('onboarding.skip')}</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        keyExtractor={(item) => item.key}
        bounces={false}
      />

      {/* Dots + Action */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 32 }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentIndex ? c.accent : c.border,
                  width: i === currentIndex ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {isLast ? (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: c.accent }]}
            onPress={handleGetStarted}
          >
            <Text style={[styles.ctaText, { color: '#fff' }]}>
              {t('onboarding.getStarted')}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.ctaButton, { backgroundColor: c.accent }]}
            onPress={handleNext}
          >
            <Text style={[styles.ctaText, { color: '#fff' }]}>
              {t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 16,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  ctaButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
