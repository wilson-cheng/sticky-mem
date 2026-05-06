export interface SM2Input {
  easiness: number;
  interval: number;     // days
  repetitions: number;
}

export interface SM2Output {
  easiness: number;
  interval: number;     // days
  repetitions: number;
}

/**
 * SM-2 algorithm by Piotr Woźniak.
 *
 * Grade scale:
 *   5 — perfect response
 *   4 — correct after hesitation
 *   3 — correct with serious difficulty
 *   2 — incorrect; correct answer seemed easy to recall
 *   1 — incorrect; correct answer remembered upon seeing it
 *   0 — complete blackout
 *
 * Grade >= 3 is considered "correct" for interval progression.
 */
export function sm2(card: SM2Input, grade: number): SM2Output {
  let { easiness, interval, repetitions } = card;

  // Update easiness factor
  easiness = easiness + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
  if (easiness < 1.3) easiness = 1.3;

  if (grade < 3) {
    // Incorrect — reset, but re-appear even sooner (same day)
    repetitions = 0;
    interval = 0;        // ← was 1 (next day); now 0 = same-day re-review
  } else if (grade === 3) {
    // Correct but difficult — treat as first-time review
    repetitions = Math.max(1, repetitions);
    interval = 1;        // Come back tomorrow
  } else {
    // Correct (grade 4-5) — advance interval per SM‑2
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 3;      // ← was 6; shorter early intervals let us re-ask sooner
    } else {
      interval = Math.round(interval * easiness);
    }
  }

  return { easiness, interval, repetitions };
}

/**
 * Calculate the next review timestamp from an interval (in days).
 */
export function calculateNextReview(intervalDays: number, now: number): number {
  if (intervalDays <= 0) return 0;
  return now + intervalDays * 24 * 60 * 60 * 1000;
}
