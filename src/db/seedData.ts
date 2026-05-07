import { Repository } from './repository';

/**
 * Seed sample content for first-run users to demo the app.
 * Pre-made content about spaced repetition itself (meta but useful).
 */
export async function seedDemoContent(repo: Repository): Promise<void> {
  const now = Date.now();
  const contentId = `${now}-seed-demo`;
  const contentId2 = `${now}-seed-pareto`;

  // ─── Content 1: Spaced Repetition ─── //
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

  // Questions for Content 1
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

  // ─── Content 2: The Pareto Principle (80/20 Rule) ─── //
  await repo.insertContent({
    id: contentId2,
    sourceType: 'text',
    title: 'The Pareto Principle (80/20 Rule)',
    rawText: `# The Pareto Principle

The Pareto Principle, also known as the 80/20 Rule, states that roughly 80% of effects come from 20% of causes. It was named after Italian economist Vilfredo Pareto, who observed in 1906 that 80% of the land in Italy was owned by 20% of the population.

## Where It Shows Up

- **Business**: 80% of sales come from 20% of customers
- **Software**: 80% of bugs come from 20% of the code
- **Productivity**: 80% of results come from 20% of your effort
- **Learning**: 80% of value comes from 20% of the concepts

## How To Use It

1. **Identify the vital few** — Find the 20% that drives 80% of outcomes
2. **Prioritize ruthlessly** — Focus on high-impact activities
3. **Question the trivial many** — Cut or delegate the 80% that only delivers 20% of value

## The Catch

The exact ratio is rarely precisely 80/20 — it could be 70/30, 90/10, or 95/5. The key insight is that **results are never evenly distributed**. A small number of inputs always drives the majority of outputs.`,
    createdAt: now + 1,
    updatedAt: now + 1,
  });

  const questions2 = [
    {
      type: 'multiple_choice' as const,
      question: 'What does the Pareto Principle state?',
      correctAnswer: 'Roughly 80% of effects come from 20% of causes',
      options: [
        'Roughly 80% of effects come from 20% of causes',
        'Roughly 20% of effects come from 80% of causes',
        'All causes produce equal effects',
        'Effects are completely random',
      ],
      explanation: 'The 80/20 rule describes the uneven distribution of results — a small number of causes produce the majority of effects.',
    },
    {
      type: 'multiple_choice' as const,
      question: 'Who first observed the Pareto Principle?',
      correctAnswer: 'Vilfredo Pareto',
      options: [
        'Vilfredo Pareto',
        'Adam Smith',
        'John Maynard Keynes',
        'Peter Drucker',
      ],
      explanation: 'Italian economist Vilfredo Pareto observed in 1906 that 80% of Italy\'s land was owned by 20% of the population.',
    },
    {
      type: 'multiple_choice' as const,
      question: 'How should you apply the Pareto Principle?',
      correctAnswer: 'Identify the 20% that drives 80% of outcomes and prioritize it',
      options: [
        'Identify the 20% that drives 80% of outcomes and prioritize it',
        'Try to make all inputs equal',
        'Focus only on the 80% of inputs',
        'Ignore the principle entirely',
      ],
      explanation: 'The key application is finding the "vital few" inputs that produce most of your results, then focusing your efforts there.',
    },
    {
      type: 'short_answer' as const,
      question: 'What is the key insight behind the Pareto Principle?',
      correctAnswer: 'Results are never evenly distributed',
      options: undefined,
      explanation: 'Even when the exact ratio isn\'t 80/20, the core truth is that a small number of inputs always drives the majority of outputs.',
    },
  ];

  for (const q of questions2) {
    const questionId = `${now}-pareto-${Math.random().toString(36).slice(6)}`;
    await repo.insertQuestion({
      id: questionId,
      contentId: contentId2,
      type: q.type,
      question: q.question,
      correctAnswer: q.correctAnswer,
      options: q.options,
      explanation: q.explanation,
      createdAt: now + 1,
    });

    const interval = Math.random() < 0.4 ? 1 : 0;
    await repo.upsertCard({
      questionId,
      easiness: 2.5,
      interval,
      repetitions: interval > 0 ? 1 : 0,
      nextReviewAt: interval > 0 ? now + 86400000 : now,
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
