import { describe, it, expect } from 'vitest';
import { sm2, calculateNextReview } from '../src/engine/sm2';

describe('SM-2 Algorithm', () => {
  it('should return easiness >= 1.3 after any grade', () => {
    const result = sm2({ easiness: 2.5, interval: 1, repetitions: 0 }, 0);
    expect(result.easiness).toBeGreaterThanOrEqual(1.3);
  });

  it('should reset repetitions on grade < 3', () => {
    const result = sm2({ easiness: 2.5, interval: 7, repetitions: 5 }, 0);
    expect(result.repetitions).toBe(0);
    expect(result.interval).toBe(1);
  });

  it('should set interval to 1 on first correct answer', () => {
    const result = sm2({ easiness: 2.5, interval: 0, repetitions: 0 }, 4);
    expect(result.interval).toBe(1);
    expect(result.repetitions).toBe(1);
  });

  it('should set interval to 6 on second correct answer', () => {
    const result = sm2({ easiness: 2.5, interval: 1, repetitions: 1 }, 4);
    expect(result.interval).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  it('should multiply interval by easiness on 3rd+ correct', () => {
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 4);
    expect(result.interval).toBe(15);
    expect(result.repetitions).toBe(3);
  });

  it('should handle a perfect grade (5) correctly', () => {
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 5);
    // EF' = 2.5 + (0.1 - 0) = 2.6; interval = Math.round(6 * 2.6) = 16
    expect(result.easiness).toBeCloseTo(2.6, 1);
    expect(result.interval).toBe(16);
  });

  it('should decrease easiness on poor grade', () => {
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 1);
    // EF' = 2.5 + (0.1 - 4*(0.08+0.08)) = 2.5 - 0.54 = 1.96
    expect(result.easiness).toBeCloseTo(1.96, 2);
    expect(result.repetitions).toBe(0);
  });
});

describe('calculateNextReview', () => {
  it('should return a timestamp in the future', () => {
    const now = Date.now();
    const next = calculateNextReview(1, now);
    expect(next).toBeGreaterThan(now);
  });

  it('should return exactly interval days later', () => {
    const now = 1000000;
    const next = calculateNextReview(7, now);
    expect(next).toBe(1000000 + 7 * 24 * 60 * 60 * 1000);
  });

  it('should return 0 for interval 0', () => {
    expect(calculateNextReview(0, Date.now())).toBe(0);
  });
});
