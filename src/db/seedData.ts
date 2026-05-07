import { Repository } from './repository';

/**
 * Seed sample content for first-run users to demo the app.
 * Pre-made content about spaced repetition itself (meta but useful).
 */
export async function seedDemoContent(repo: Repository): Promise<void> {
  const now = Date.now();
  const contentId = `${now}-seed-demo`;

  // ─── Content ─── //
  await repo.insertContent({
    id: contentId,
    sourceType: 'text',
    title: 'What is Spaced Repetition?',
    rawText: `# Spaced Repetition

Spaced repetition is a learning technique where you review information at increasing intervals over time. Instead of cramming everything at once, you space out your practice sessions so that each review happens just as you're about to forget the material.

## How It Works

- **Review immediately** after learning something new
- **Review again after 1 day**
- **Then after 3 days**
- **Then after 1 week**
- **Then after 1 month**
- And so on, with ever-increasing gaps

This system exploits the **spacing effect** — a psychological phenomenon where we learn more effectively when study sessions are spaced out rather than massed together.

## Why It's Effective

1. **Efficient use of time**: You only review what you're about to forget
2. **Long-term retention**: Information moves from short-term to long-term memory
3. **Reduced cognitive load**: Each review strengthens neural pathways

The SM-2 algorithm, developed by Piotr Wozniak in 1987, is the basis for most modern spaced repetition apps like Anki, Memrise, and — you guessed it — StickyMem!`,
    createdAt: now,
    updatedAt: now,
  });

  // ─── Questions ─── //
  const questions = [
    {
      type: 'multiple_choice' as const,
      question: 'What is spaced repetition?',
      correctAnswer: 'A learning technique that spaces reviews at increasing intervals',
      options: [
        'A learning technique that spaces reviews at increasing intervals',
        'A method of cramming all information at once',
        'A technique for writing better notes',
        'A way to organize your study desk',
      ],
      explanation: 'Spaced repetition specifically works by scheduling reviews at increasing intervals — starting right after learning, then 1 day, 3 days, 1 week, etc.',
    },
    {
      type: 'multiple_choice' as const,
      question: 'Which psychological phenomenon does spaced repetition exploit?',
      correctAnswer: 'The spacing effect',
      options: [
        'The Dunning-Kruger effect',
        'The spacing effect',
        'The Zeigarnik effect',
        'The placebo effect',
      ],
      explanation: 'The spacing effect is the well-documented finding that information is better retained when study sessions are spaced out over time, rather than massed together.',
    },
    {
      type: 'multiple_choice' as const,
      question: 'Who developed the SM-2 algorithm?',
      correctAnswer: 'Piotr Wozniak',
      options: [
        'Piotr Wozniak',
        'Hermann Ebbinghaus',
        'Richard Feynman',
        'Robert Bjork',
      ],
      explanation: 'Piotr Wozniak created the SM-2 algorithm in 1987, which became the foundation for SuperMemo and later influenced Anki and other SRS apps.',
    },
    {
      type: 'short_answer' as const,
      question: 'Name one benefit of spaced repetition.',
      correctAnswer: 'Efficient use of time',
      options: undefined,
      explanation: 'The SM-2 algorithm ensures you only review material just as you\'re about to forget it, making every minute of study count.',
    },
    {
      type: 'multiple_choice' as const,
      question: 'What does the SM-2 interval look like after initial learning?',
      correctAnswer: 'Immediately → 1 day → 3 days → 1 week → 1 month',
      options: [
        'Immediately → 1 day → 3 days → 1 week → 1 month',
        '1 week → 2 weeks → 1 month → 3 months',
        'Every day at the same time',
        'Only when you feel like studying',
      ],
      explanation: 'After initial learning, SM-2 starts with a 1-day interval, then 3 days, then a week, then a month — getting progressively longer.',
    },
  ];

  for (const q of questions) {
    const questionId = `${now}-${Math.random().toString(36).slice(6)}`;
    await repo.insertQuestion({
      id: questionId,
      contentId,
      type: q.type,
      question: q.question,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      createdAt: now,
    });

    // Create SM-2 cards — make some due now (to demo) and some future
    const interval = Math.random() < 0.4 ? 1 : 0; // 40% reviewed once
    await repo.upsertCard({
      questionId,
      easiness: 2.5,
      interval,
      repetitions: interval > 0 ? 1 : 0,
      nextReviewAt: interval > 0 ? now + 86400000 : now, // due now if new, tomorrow if reviewed
      lastReviewAt: interval > 0 ? now - 86400000 : 0,
    });
  }

  // Create a daily stats entry to show progress
  await repo.upsertDailyStats({
    date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    totalReviewed: 2,
    correctCount: 2,
    accuracy: 1.0,
  });
}
