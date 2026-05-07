# Pre-Launch Polish Plan — StickyMem

> **For agentic workers:** This is a phased product-polish roadmap. Each phase groups independent tasks that can be worked in parallel. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform StickyMem from a functional prototype into a polished, magical-feeling product before inviting external testers.

**Current State:** Home screen redesigned (empty + normal states), logo/branding updated, basic processing steps on add screen, review session end screen exists, demo content available. Core loop works. Missing: delight, micro-animations, emotional payoff, guided first-run experience.

**Tech Stack:** Expo SDK ~54, expo-router ~6, react-native 0.81.5, react-native-reanimated (available), SQLite (expo-sqlite)

---

## Phase 1: Quick Delight Wins (< 2 hours)

> Each task is 10-30 minutes of focused work.

### Task 1.1: Micro-animations on Home Screen Icons

**Files:**
- Modify: `app/index.tsx` (stats row icons, action button icons, header gear)
- Modify: `src/theme/useColors.ts` (no changes needed — colors already exist)

- [ ] **Step 1: Add gentle bounce animation to stat icon (📚⏰✅) on mount**

In `app/index.tsx`, wrap each stat icon (`styles.statIcon`) in an `Animated.View` with a scale bounce. Use `Animated.spring` with `friction: 6, tension: 60`. Trigger when `statsAnim` fires (already staggered).

```tsx
// Inside each statBox, replace <Text style={styles.statIcon}>📚</Text> with:
<Animated.View style={{ transform: [{ scale: iconScale }] }}>
  <Text style={styles.statIcon}>📚</Text>
</Animated.View>
```

Add refs per stat icon:
```tsx
const statIcon1 = useRef(new Animated.Value(0)).current;
const statIcon2 = useRef(new Animated.Value(0)).current;
const statIcon3 = useRef(new Animated.Value(0)).current;
```

In the stagger effect, chain after statsAnim:
```tsx
Animated.stagger(120, [
  cardAnim, statsAnim, actionsAnim,
]).start(() => {
  // Then bounce stat icons
  Animated.stagger(80, [
    Animated.spring(statIcon1, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    Animated.spring(statIcon2, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    Animated.spring(statIcon3, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
  ]).start();
});
```

- [ ] **Step 2: Add pulse animation to settings gear (⚙️)**

In `app/index.tsx`, wrap gear icon with a subtle rotation animation. Rotate 10° back-and-forth on mount, then stop.

```tsx
const gearRotation = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.sequence([
    Animated.timing(gearRotation, { toValue: 1, duration: 400, useNativeDriver: true }),
    Animated.timing(gearRotation, { toValue: 0, duration: 200, useNativeDriver: true }),
  ]).start();
}, []);

// Style:
const gearSpin = gearRotation.interpolate({
  inputRange: [0, 1], outputRange: ['0deg', '15deg'],
});
```

Replace `<Text style={styles.settingsIcon}>⚙️</Text>` with `<Animated.Text style={[styles.settingsIcon, { transform: [{ rotate: gearSpin }] }]}>⚙️</Animated.Text>`.

- [ ] **Step 3: Add pulse effect to the Get Started / Start Review button CTA**

Target the primary button (`styles.primaryButton`, `styles.getStartedButton`). Add a gentle scale animation on mount that pulses once.

```tsx
const btnScale = useRef(new Animated.Value(0.96)).current;

useEffect(() => {
  Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 80, useNativeDriver: true }).start();
}, []);
```

Wrap button with `Animated.View` and apply `transform: [{ scale: btnScale }]`.

**Verification:**
- Build with `npx expo export -p web`
- Open in browser — stat icons should bounce in sequence after page load
- Gear should twitch slightly on mount
- Button should scale up gently on mount

### Task 1.2: AI Digestion Celebration Transition

**Files:**
- Modify: `app/add.tsx` (processing screen — more cinematic step transitions)
- Modify: `src/i18n/translations.ts` (optional: add more step copy)

- [ ] **Step 1: Make processing steps show progressively and animate between them**

Current state: Steps already animate via `stepOpacity` fade in/out. Add a subtle checkmark on each completed step. When a step transitions, show ✓ next to the previous step.

Add state:
```tsx
const completedSteps = useRef(new Set<number>()).current;
```

In the current `setTimeout` callback (line ~68), add:
```tsx
completedSteps.add(currentStep);
```

Render processing steps as a vertical timeline instead of horizontal dots:

```tsx
<View style={styles.processingTimeline}>
  {processingSteps.map((step, i) => (
    <View key={i} style={styles.timelineStep}>
      <View style={[styles.timelineDot, {
        backgroundColor: i <= currentStep ? c.accent : c.border,
      }]}>
        {i < currentStep && completedSteps.has(i) && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
      {i < processingSteps.length - 1 && (
        <View style={[styles.timelineLine, {
          backgroundColor: i < currentStep ? c.accent : c.border,
        }]} />
      )}
    </View>
  ))}
</View>
```

- [ ] **Step 2: Make current step text glow/animate more dramatically**

Replace the simple opacity transition with a combined scale+opacity:

```tsx
<Animated.View style={{
  opacity: stepOpacity,
  transform: [{ scale: stepOpacity.interpolate({
    inputRange: [0, 1], outputRange: [0.8, 1]
  }) }],
}}>
```

- [ ] **Step 3: Success screen transition — enhance the spring animation**

Current: spring on `successScale`. Add a confetti-like emoji burst. At the success moment, show 3 random emoji (✨🎉🌟) that animate upward and fade out.

```tsx
const [burstEmoji, setBurstEmoji] = useState<string[]>([]);
const burstAnims = useRef(Array(3).fill(0).map(() => new Animated.Value(0))).current;

useEffect(() => {
  if (stage === 'success') {
    setBurstEmoji(['✨', '🎉', '🌟']);
    Animated.parallel(
      burstAnims.map((anim, i) =>
        Animated.sequence([
          Animated.delay(i * 100),
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      )
    ).start();
  }
}, [stage]);
```

Render above the success icon:
```tsx
{burstEmoji.map((emoji, i) => (
  <Animated.Text key={i} style={{
    position: 'absolute', fontSize: 32,
    top: burstAnims[i].interpolate({
      inputRange: [0, 1], outputRange: [100, 0],
    }),
    opacity: burstAnims[i].interpolate({
      inputRange: [0, 0.7, 1], outputRange: [0, 1, 0],
    }),
    left: 40 + i * 60,
  }}>{emoji}</Animated.Text>
))}
```

**Verification:**
- Go to Add screen → paste content → process
- Steps appear as vertical timeline with checkmarks
- Current step scales in
- Success screen has emoji burst effect

### Task 1.3: Demo Content Polish

**Files:**
- Modify: `src/db/seedData.ts` (add more interesting demo content)
- Modify: `src/i18n/translations.ts` (better demo-added message)

- [ ] **Step 1: Add 2nd demo content about a generally-interesting topic**

In `seedData.ts`, add a second content entry about a popular non-meta topic (e.g., "How Memory Works" or a productivity technique):

```typescript
const contentId2 = `${now}-seed-demo-2`;
await repo.insertContent({
  id: contentId2,
  sourceType: 'text',
  title: 'The 80/20 Rule (Pareto Principle)',
  rawText: `# The 80/20 Rule\n\nThe Pareto Principle states that roughly 80% of effects come from 20% of causes...`,
  ...
});
```

Add 3-4 more questions for this content with varied types.

- [ ] **Step 2: Make demo-added alert more delightful**

Replace the basic `Alert.alert(t('home.demoAdded'))` with a richer in-app message. Change to a custom toast/modal approach or at minimum add more personality:

In `app/index.tsx`, change `handleSeedDemo`:
```tsx
Alert.alert(
  '🚀 Demo Loaded!',
  'You now have 9 questions ready. Try a review round to see StickyMem in action!',
  [{ text: 'Start Review', onPress: () => router.push('/review') },
   { text: 'Explore', style: 'cancel' }]
);
```

**Verification:**
- Press "Try Demo Content" on empty home
- See loaded alert with "Start Review" action
- After loading, home shows 9 total cards, some due for review

### Task 1.4: Review Session End Screen — Emotional Payoff

**Files:**
- Modify: `app/review.tsx` (session done screen — more celebration)
- Modify: `src/i18n/translations.ts` (add dynamic messages based on accuracy)

- [ ] **Step 1: Add dynamic congratulatory message based on accuracy**

```tsx
const getSessionMessage = (accuracy: number) => {
  if (accuracy >= 90) return 'Outstanding! Your knowledge is razor-sharp! 🧠✨';
  if (accuracy >= 70) return 'Great session! You\'re building real retention. 💪';
  if (accuracy >= 50) return 'Good effort! Keep reviewing and those numbers will climb. 📈';
  return 'Every review strengthens the memory. You\'re making progress! 🌱';
};
```

Replace the static `<Text style={[styles.doneSubtitle...`>` with the dynamic message, and keep the existing sessionSubtitle as secondary text below it.

- [ ] **Step 2: Animate stats boxes with staggered scale-in**

Replace the static `doneStatsRow` with `Animated.View` wrappers. Add staggered spring animations for the stat boxes:

```tsx
// New refs
const statBox1Anim = useRef(new Animated.Value(0)).current;
const statBox2Anim = useRef(new Animated.Value(0)).current;

useEffect(() => {
  if (sessionDone) {
    Animated.stagger(200, [
      Animated.spring(statBox1Anim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
      Animated.spring(statBox2Anim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }),
    ]).start();
  }
}, [sessionDone]);
```

**Verification:**
- Complete a review session
- See congratulatory message matching your accuracy
- Stats boxes bounce in one after another

### Task 1.5: Micro-animation on Review Complete Action

**Files:**
- Modify: `app/review.tsx` (card answer transition)
- Modify: `src/components/QuestionCard.tsx` (spice up the answer reveal)

- [ ] **Step 1: Add card slide-out when advancing to next question**

In `QuestionCard.tsx`, wrap the card content in `Animated.View`. When user answers and taps "Continue" / timer runs out, slide the card left and fade out:

```tsx
const cardSlide = useRef(new Animated.Value(0)).current;

const handleNext = () => {
  Animated.timing(cardSlide, { toValue: -1, duration: 200, useNativeDriver: true }).start(() => {
    onNext();
    cardSlide.setValue(0);
  });
};

// Transform:
transform: [
  { translateX: cardSlide.interpolate({
    inputRange: [0, -1], outputRange: [0, -80],
  }) },
  { opacity: cardSlide.interpolate({
    inputRange: [0, -1], outputRange: [1, 0],
  }) },
],
```

**Verification:**
- Answer a question → tap Continue → card slides left and fades out
- Next card appears instantly at default position

---

## Phase 2: Medium Polish (1-2 days)

> These tasks are larger and may involve new screens or significant modifications.

### Task 2.1: Lightweight Onboarding (2-4 cards)

**Files:**
- Create: `app/onboarding.tsx`
- Create: `src/components/OnboardingCard.tsx`
- Modify: `app/_layout.tsx` (add route)
- Modify: `src/i18n/translations.ts` (onboarding copy)

- [ ] **Step 1: Create onboarding screen with 3 swipeable cards**

Create `app/onboarding.tsx` with a horizontal `ScrollView` (pagingEnabled) containing 3 cards:
1. "Turn what you read into memory" — logo + value prop
2. "AI does the heavy lifting" — paste anything, AI generates questions
3. "Review smart, not hard" — spaced repetition explanation

Each card has a "Next" / "Get Started" button at bottom.

- [ ] **Step 2: Show onboarding only on first launch**

Track in settings store:
```tsx
const hasSeenOnboarding = useSettingsStore((s) => s.hasSeenOnboarding);
```

In `app/index.tsx`, redirect to `/onboarding` if `!hasSeenOnboarding`. After last card → set `hasSeenOnboarding = true` → navigate to home.

- [ ] **Step 3: Add onboarding copy to i18n translations**

```typescript
'onboarding.title1': 'Turn what you read into memory',
'onboarding.subtitle1': 'Paste articles, notes, or links. StickyMem digests the key ideas.',
// ... etc for 3 slides
```

**Verification:**
- Clear app data → reopen → see onboarding flow
- Swipe through 3 cards
- Tap "Get Started" → land on empty home
- Reopen app → onboarding doesn't show again

### Task 2.2: Prettier AI Result Reveal

**Files:**
- Modify: `app/add.tsx` (success screen — show summary, key concepts, questions count per concept)
- Modify: `src/i18n/translations.ts` (add new labels)

- [ ] **Step 1: Store more result metadata in the success state**

Expand `success` state to include `summary` and `keyConcepts`:
```tsx
const [success, setSuccess] = useState<{
  title: string; count: number;
  summary: string; keyConcepts: string[];
} | null>(null);
```

Pass `digest.summary` and `digest.keyConcepts` when setting success.

- [ ] **Step 2: Redesign success screen to show structured reveal**

Instead of a simple `"Content Added!"` screen, show:
- Title of content
- Summary (1-2 lines, `fontStyle: 'italic'`)
- "Key ideas extracted" with a small pill/badge per concept
- "Questions generated: X" as a badge

```tsx
<Text style={...}>📝 Summary</Text>
<Text style={...}>{success.summary}</Text>
<View style={styles.conceptRow}>
  {success.keyConcepts.map(k => (
    <View key={k} style={[styles.conceptPill, { backgroundColor: c.accent + '20' }]}>
      <Text style={[styles.conceptPillText, { color: c.accent }]}>{k}</Text>
    </View>
  ))}
</View>
```

**Verification:**
- Add content → after processing → see structured reveal: title, summary, concept pills, question count
- Each concept pill is tappable (optional: stretches to show related questions)

### Task 2.3: Stateful Home — Adapt to User Maturity

**Files:**
- Modify: `app/index.tsx` (add maturity-based variants)
- Modify: `src/hooks/useSchedule.ts` (expose `isNewUser`, `isReturning` flags)

- [ ] **Step 1: Define user maturity tiers**

```
New: totalQuestions === 0 — empty state (current)
Active: has reviewed today or has >5 reviews total — show streak + motivation
Behind: has questions but hasn't reviewed in 2+ days — show encouraging "catch up" message
```

- [ ] **Step 2: Add "behind" variant to home**

If user has content but `todayReviewed === 0` and last review > 48h ago, show a message:
"You have X questions waiting. A quick 2-minute review keeps your memory fresh! 🧠"

- [ ] **Step 3: Add returning-user content on normal state**

For users with >20 reviews total, add a "Your Memory Health" mini-section showing 7-day accuracy trend.

**Verification:**
- New user → see empty state
- Active user (reviewed today) → see streak + motivation
- Lapsed user (has content, no review >2 days) → see encouraging "catch up" nudge

---

## Phase 3: Future Vision (1 week+)

> Larger structural changes — defer until feedback validates the core.

### Task 3.1: Memory Journey Narrative

- Replace static "reviewed today" with a narrative: "Day 3 of your learning journey"
- Show memory strength as visual (progress rings, brain fill-level)
- Weekly summary: "This week you reinforced 47 memories"

### Task 3.2: Review Micro-interactions

- Card swipe to answer (like Tinder for review)
- Haptic feedback on correct/incorrect
- Card flip animation for short-answer reveal

### Task 3.3: Ambient Delight System

- Random motivational quotes on home
- Streak milestones with celebration effects
- "Memory unlocked" chime on completing daily target
- Dark/light theme transition animations

---

## Status Summary

Phase | Status
------|-------
Phase 1.1 — Icon micro-animations | ❌ Not started
Phase 1.2 — AI digestion celebration | ❌ Not started (partial: basic processing steps exist)
Phase 1.3 — Demo content polish | ❌ Not started (1 content exists, basic alert)
Phase 1.4 — Review end screen payoff | ❌ Not started (basic stats exist)
Phase 1.5 — Card slide-out transition | ❌ Not started
Phase 2.1 — Onboarding | ❌ Not started
Phase 2.2 — Prettier AI reveal | ❌ Not started
Phase 2.3 — Stateful home | ❌ Not started
Phase 3 | ❌ Deferred

## Top 3 Priority (Recommended)

Based on the original discussion, the highest-impact items before inviting testers:

1. **Task 1.4** (Review end screen payoff) — biggest emotional moment in the app
2. **Task 1.2** (AI digestion celebration) — makes the core AI feature feel magical
3. **Task 1.1** (Icon micro-animations) — cheapest way to make the app feel polished
