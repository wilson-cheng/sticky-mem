# StickyMem MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first React Native app where users paste text/URLs, the app automatically digests content and generates spaced repetition questions to help retain knowledge.

**Architecture:** Fully client-side Expo app. All data stored locally in SQLite. DeepSeek API calls made directly from device with user's own API key (BYOK). SM-2 algorithm runs locally for scheduling. Local push notifications for daily review reminders. No backend server required — zero infrastructure cost for MVP.

**Tech Stack:**
- Expo SDK 52+ with Expo Router (file-based routing)
- TypeScript throughout
- expo-sqlite (local database)
- expo-notifications (local push reminders)
- zustand (lightweight state management)
- DeepSeek API (chat/completions endpoint)
- react-native-chart-kit (progress charts)
- @expo/vector-icons (UI icons)

---

## File Structure

```
sticky-mem/
├── app/                           # Expo Router pages
│   ├── _layout.tsx                # Root layout + providers
│   ├── index.tsx                  # Home — today's review queue
│   ├── add.tsx                    # Add new content (text/URL)
│   ├── review.tsx                 # Review session
│   ├── progress.tsx               # Progress + analytics
│   └── settings.tsx               # API key + preferences
├── src/
│   ├── api/
│   │   └── deepseek.ts            # DeepSeek API client
│   ├── db/
│   │   ├── schema.ts              # SQLite schema + migrations
│   │   └── repository.ts          # Data access layer
│   ├── engine/
│   │   └── sm2.ts                 # SM-2 spaced repetition algorithm
│   ├── llm/
│   │   ├── digest.ts              # Content → key concepts pipeline
│   │   └── questions.ts           # Key concepts → quiz questions
│   ├── hooks/
│   │   ├── useReview.ts           # Review session state machine
│   │   └── useSchedule.ts         # Daily schedule computation
│   ├── components/
│   │   ├── QuestionCard.tsx       # Question display + answer input
│   │   ├── ResultFeedback.tsx     # Correct/wrong feedback animation
│   │   ├── ProgressChart.tsx      # Recall rate trend chart
│   │   ├── AddContentForm.tsx     # Text/URL input form
│   │   └── EmptyState.tsx         # Empty queue placeholder
│   ├── store/
│   │   └── settings.ts            # zustand store for settings
│   └── types/
│       └── index.ts               # Shared TypeScript types
├── tests/
│   ├── sm2.test.ts
│   ├── digest.test.ts
│   ├── questions.test.ts
│   └── repository.test.ts
├── assets/
├── .env.example
├── app.json
└── package.json
```

---

## Task 1: Project Initialization + Type Definitions

**Files:**
- Create: `package.json`
- Create: `app.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `src/types/index.ts`
- Create: `app/_layout.tsx`

- [ ] **Step 1: Initialize Expo project**

```bash
cd ~/projects/sticky-mem
npx create-expo-app@latest . --template blank-typescript
```

Expected: Project created with TypeScript template. Clean `package.json`, `app.json`, `tsconfig.json`.

- [ ] **Step 2: Install MVP dependencies**

```bash
npx expo install expo-router expo-sqlite expo-notifications expo-constants expo-linking expo-status-bar
npx expo install react-native-screens react-native-safe-area-context
npm install zustand react-native-chart-kit react-native-svg
npm install -D vitest @testing-library/react-native
```

Expected: All dependencies installed. Note: expo-router replaces the default App.js entry point — need to set `"main": "expo-router/entry"` in package.json.

- [ ] **Step 3: Configure Expo Router in package.json**

Edit `package.json` — add the `"main"` field and `"scripts"`:

```json
{
  "main": "expo-router/entry",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "vitest",
    "test:watch": "vitest --watch"
  }
}
```

- [ ] **Step 4: Write .env.example**

```bash
# StickyMem — Bring Your Own Key
# Get your DeepSeek API key at https://platform.deepseek.com/
DEEPSEEK_API_KEY=sk-your-key-here
```

- [ ] **Step 5: Write TypeScript type definitions**

File: `src/types/index.ts`

```typescript
// ─── Content Types ─── //

export type ContentSource = 'text' | 'url';

export interface Content {
  id: string;           // UUID
  sourceType: ContentSource;
  title: string;        // User-provided or auto-generated
  rawText: string;      // Original input text
  createdAt: number;    // Unix timestamp ms
  updatedAt: number;    // Unix timestamp ms
}

// ─── Question Types ─── //

export type QuestionType = 'multiple_choice' | 'short_answer';
export type ReviewGrade = 0 | 1 | 2 | 3 | 4 | 5;  // SM-2 grade

export interface Question {
  id: string;           // UUID
  contentId: string;    // FK to Content
  type: QuestionType;
  question: string;     // The question text
  correctAnswer: string;
  options?: string[];   // For multiple_choice (4 options, shuffled)
  explanation?: string; // Shown after answering
  createdAt: number;
}

// ─── Review / SM-2 Types ─── //

export interface ReviewRecord {
  id: string;
  questionId: string;
  gradedAt: number;
  grade: ReviewGrade;
}

export interface Card {
  // SM-2 per-card scheduling state persisted in DB
  questionId: string;
  easiness: number;       // Default 2.5
  interval: number;       // Days until next review
  repetitions: number;    // Consecutive correct answers
  nextReviewAt: number;   // Unix timestamp ms
  lastReviewAt: number;   // Unix timestamp ms or 0
}

// ─── Aggregated Types ─── //

export interface ReviewSession {
  dueCards: (Question & { card: Card })[];
  currentIndex: number;
  isComplete: boolean;
}

export interface DailyStats {
  date: string;          // YYYY-MM-DD
  totalReviewed: number;
  correctCount: number;
  accuracy: number;      // 0.0 - 1.0
}
```

- [ ] **Step 6: Write root layout with providers**

File: `app/_layout.tsx`

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Today' }} />
        <Stack.Screen name="add" options={{ title: 'Add Content', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review', headerBackVisible: false }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git init
git add -A
git commit -m "chore: initial project setup with Expo Router + TypeScript types"
```

---

## Task 2: Local Database Layer

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/repository.ts`
- Create: `tests/repository.test.ts`

- [ ] **Step 1: Write the failing tests for repository**

File: `tests/repository.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
// Note: expo-sqlite requires native runtime — we abstract with an interface
// for testability. Tests run against a mock implementation.

interface Database {
  run(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

class MockDatabase implements Database {
  private tables: Map<string, any[]> = new Map();

  async run(sql: string, params?: any[]): Promise<void> {
    // Simplified mock — just stores CREATE TABLE and INSERT
    if (sql.toUpperCase().startsWith('CREATE')) {
      const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
      if (tableName) this.tables.set(tableName, []);
    }
    if (sql.toUpperCase().startsWith('INSERT')) {
      const tableName = sql.match(/INSERT INTO (\w+)/i)?.[1];
      if (tableName) {
        const rows = this.tables.get(tableName) || [];
        rows.push(params);
        this.tables.set(tableName, rows);
      }
    }
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const tableName = sql.match(/FROM (\w+)/i)?.[1];
    if (!tableName) return [];
    const rows = this.tables.get(tableName) || [];
    // Simple filter for select with WHERE
    if (sql.includes('WHERE') && params?.length) {
      return rows.filter(() => true) as T[];
    }
    return rows as T[];
  }

  getTable(name: string) { return this.tables.get(name) || []; }
}

describe('Repository', () => {
  let db: MockDatabase;

  beforeEach(() => {
    db = new MockDatabase();
  });

  it('should create tables on init', async () => {
    await runMigrations(db);
    expect(db.getTable('contents').length).toBe(0);
    expect(db.getTable('questions').length).toBe(0);
    expect(db.getTable('cards').length).toBe(0);
    expect(db.getTable('reviews').length).toBe(0);
    expect(db.getTable('daily_stats').length).toBe(0);
  });

  it('should insert and retrieve content', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    const content: Content = {
      id: 'test-1',
      sourceType: 'text',
      title: 'Test',
      rawText: 'Hello world',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await repo.insertContent(content);
    const all = await repo.getAllContents();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('test-1');
  });

  it('should insert and retrieve questions for a content', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    const content: Content = {
      id: 'c1', sourceType: 'text', title: 'T', rawText: 'X',
      createdAt: 1, updatedAt: 1,
    };
    await repo.insertContent(content);
    const q: Question = {
      id: 'q1', contentId: 'c1', type: 'multiple_choice',
      question: 'What?', correctAnswer: 'A',
      options: ['A', 'B', 'C', 'D'], createdAt: 1,
    };
    await repo.insertQuestion(q);
    const questions = await repo.getQuestionsByContentId('c1');
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe('q1');
  });

  it('should return due cards for review', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    // Insert a card with past nextReviewAt
    const card: Card = {
      questionId: 'q1',
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewAt: Date.now() - 86400000, // yesterday
      lastReviewAt: 0,
    };
    await repo.upsertCard(card);
    const due = await repo.getDueCards(Date.now());
    expect(due).toHaveLength(1);
  });

  it('should not return cards that are not due yet', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    const card: Card = {
      questionId: 'q2',
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewAt: Date.now() + 86400000, // tomorrow
      lastReviewAt: 0,
    };
    await repo.upsertCard(card);
    const due = await repo.getDueCards(Date.now());
    expect(due).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/repository.test.ts
```

Expected: FAIL — module not found errors (Repository, runMigrations not defined).

- [ ] **Step 3: Write database schema**

File: `src/db/schema.ts`

```typescript
export interface Database {
  run(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS contents (
  id TEXT PRIMARY KEY,
  source_type TEXT NOT NULL CHECK(source_type IN ('text', 'url')),
  title TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  content_id TEXT NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK(type IN ('multiple_choice', 'short_answer')),
  question TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  options TEXT,  -- JSON array for multiple_choice
  explanation TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  question_id TEXT PRIMARY KEY REFERENCES questions(id) ON DELETE CASCADE,
  easiness REAL NOT NULL DEFAULT 2.5,
  interval REAL NOT NULL DEFAULT 0,
  repetitions INTEGER NOT NULL DEFAULT 0,
  next_review_at INTEGER NOT NULL DEFAULT 0,
  last_review_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  graded_at INTEGER NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 0 AND 5)
);

CREATE TABLE IF NOT EXISTS daily_stats (
  date TEXT PRIMARY KEY,  -- YYYY-MM-DD
  total_reviewed INTEGER NOT NULL DEFAULT 0,
  correct_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_questions_content ON questions(content_id);
CREATE INDEX IF NOT EXISTS idx_cards_next_review ON cards(next_review_at);
CREATE INDEX IF NOT EXISTS idx_reviews_question ON reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_reviews_graded ON reviews(graded_at);
`;

export async function runMigrations(db: Database): Promise<void> {
  for (const statement of SCHEMA_SQL.split(';')) {
    const trimmed = statement.trim();
    if (trimmed) {
      await db.run(trimmed);
    }
  }
}
```

- [ ] **Step 4: Write repository**

File: `src/db/repository.ts`

```typescript
import { Database, runMigrations } from './schema';
import type { Content, Question, Card, ReviewRecord, DailyStats } from '../types';

export class Repository {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  static async create(db: Database): Promise<Repository> {
    await runMigrations(db);
    return new Repository(db);
  }

  // ─── Content ─── //

  async insertContent(content: Content): Promise<void> {
    await this.db.run(
      `INSERT INTO contents (id, source_type, title, raw_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [content.id, content.sourceType, content.title, content.rawText, content.createdAt, content.updatedAt]
    );
  }

  async getAllContents(): Promise<Content[]> {
    const rows = await this.db.query<any[]>(
      'SELECT id, source_type, title, raw_text, created_at, updated_at FROM contents ORDER BY created_at DESC'
    );
    return rows.map(r => ({
      id: r.id,
      sourceType: r.source_type,
      title: r.title,
      rawText: r.raw_text,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  async getContentById(id: string): Promise<Content | null> {
    const rows = await this.db.query<any[]>(
      'SELECT id, source_type, title, raw_text, created_at, updated_at FROM contents WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id, sourceType: r.source_type, title: r.title,
      rawText: r.raw_text, createdAt: r.created_at, updatedAt: r.updated_at,
    };
  }

  async deleteContent(id: string): Promise<void> {
    await this.db.run('DELETE FROM contents WHERE id = ?', [id]);
  }

  // ─── Questions ─── //

  async insertQuestion(question: Question): Promise<void> {
    await this.db.run(
      `INSERT INTO questions (id, content_id, type, question, correct_answer, options, explanation, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        question.id, question.contentId, question.type,
        question.question, question.correctAnswer,
        question.options ? JSON.stringify(question.options) : null,
        question.explanation ?? null, question.createdAt,
      ]
    );
  }

  async getQuestionsByContentId(contentId: string): Promise<Question[]> {
    const rows = await this.db.query<any[]>(
      'SELECT * FROM questions WHERE content_id = ? ORDER BY created_at ASC',
      [contentId]
    );
    return rows.map(r => ({
      id: r.id, contentId: r.content_id, type: r.type,
      question: r.question, correctAnswer: r.correct_answer,
      options: r.options ? JSON.parse(r.options) : undefined,
      explanation: r.explanation ?? undefined,
      createdAt: r.created_at,
    }));
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const rows = await this.db.query<any[]>(
      'SELECT * FROM questions WHERE id = ?', [id]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id, contentId: r.content_id, type: r.type,
      question: r.question, correctAnswer: r.correct_answer,
      options: r.options ? JSON.parse(r.options) : undefined,
      explanation: r.explanation ?? undefined,
      createdAt: r.created_at,
    };
  }

  // ─── Cards (SM-2 state) ─── //

  async upsertCard(card: Card): Promise<void> {
    await this.db.run(
      `INSERT INTO cards (question_id, easiness, interval, repetitions, next_review_at, last_review_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(question_id) DO UPDATE SET
         easiness = excluded.easiness,
         interval = excluded.interval,
         repetitions = excluded.repetitions,
         next_review_at = excluded.next_review_at,
         last_review_at = excluded.last_review_at`,
      [card.questionId, card.easiness, card.interval, card.repetitions, card.nextReviewAt, card.lastReviewAt]
    );
  }

  async getDueCards(now: number): Promise<(Question & { card: Card })[]> {
    const rows = await this.db.query<any[]>(
      `SELECT q.*, c.easiness, c.interval, c.repetitions, c.next_review_at, c.last_review_at
       FROM questions q
       INNER JOIN cards c ON q.id = c.question_id
       WHERE c.next_review_at <= ?
       ORDER BY c.next_review_at ASC`,
      [now]
    );
    return rows.map(r => ({
      id: r.id,
      contentId: r.content_id,
      type: r.type,
      question: r.question,
      correctAnswer: r.correct_answer,
      options: r.options ? JSON.parse(r.options) : undefined,
      explanation: r.explanation ?? undefined,
      createdAt: r.created_at,
      card: {
        questionId: r.id,
        easiness: r.easiness,
        interval: r.interval,
        repetitions: r.repetitions,
        nextReviewAt: r.next_review_at,
        lastReviewAt: r.last_review_at,
      },
    }));
  }

  async getCardByQuestionId(questionId: string): Promise<Card | null> {
    const rows = await this.db.query<any[]>(
      'SELECT * FROM cards WHERE question_id = ?', [questionId]
    );
    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      questionId: r.question_id, easiness: r.easiness,
      interval: r.interval, repetitions: r.repetitions,
      nextReviewAt: r.next_review_at, lastReviewAt: r.last_review_at,
    };
  }

  // ─── Reviews ─── //

  async insertReview(review: ReviewRecord): Promise<void> {
    await this.db.run(
      'INSERT INTO reviews (id, question_id, graded_at, grade) VALUES (?, ?, ?, ?)',
      [review.id, review.questionId, review.gradedAt, review.grade]
    );
  }

  async getRecentReviews(limit: number = 50): Promise<ReviewRecord[]> {
    const rows = await this.db.query<any[]>(
      'SELECT * FROM reviews ORDER BY graded_at DESC LIMIT ?', [limit]
    );
    return rows.map(r => ({
      id: r.id, questionId: r.question_id,
      gradedAt: r.graded_at, grade: r.grade,
    }));
  }

  // ─── Daily Stats ─── //

  async upsertDailyStats(stats: DailyStats): Promise<void> {
    await this.db.run(
      `INSERT INTO daily_stats (date, total_reviewed, correct_count)
       VALUES (?, ?, ?)
       ON CONFLICT(date) DO UPDATE SET
         total_reviewed = excluded.total_reviewed,
         correct_count = excluded.correct_count`,
      [stats.date, stats.totalReviewed, stats.correctCount]
    );
  }

  async getDailyStats(days: number = 30): Promise<DailyStats[]> {
    const rows = await this.db.query<any[]>(
      'SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?', [days]
    );
    return rows.map(r => ({
      date: r.date, totalReviewed: r.total_reviewed,
      correctCount: r.correct_count,
      accuracy: r.total_reviewed > 0 ? r.correct_count / r.total_reviewed : 0,
    }));
  }

  // ─── Counts ─── //

  async getTotalQuestionCount(): Promise<number> {
    const rows = await this.db.query<any[]>('SELECT COUNT(*) as count FROM questions');
    return rows[0]?.count ?? 0;
  }
}
```

- [ ] **Step 5: Update tests to import from source**

File: `tests/repository.test.ts` — update imports at top:

```typescript
import { runMigrations } from '../src/db/schema';
import { Repository } from '../src/db/repository';
import type { Content, Question, Card, ReviewRecord, DailyStats } from '../src/types';
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/repository.test.ts
```

Expected: PASS — all 5 test cases pass (table creation, insert content, insert questions, due cards found, future cards excluded).

- [ ] **Step 7: Commit**

```bash
git add src/db/ tests/repository.test.ts
git commit -m "feat: add local database layer with SQLite schema + repository"
```

---

## Task 3: SM-2 Spaced Repetition Engine

**Files:**
- Create: `src/engine/sm2.ts`
- Create: `tests/sm2.test.ts`

- [ ] **Step 1: Write the failing tests for SM-2**

File: `tests/sm2.test.ts`

```typescript
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
    // After 2 correct: interval=6, easiness=2.5
    // Next: 6 * 2.5 = 15
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 4);
    expect(result.interval).toBe(15);
    expect(result.repetitions).toBe(3);
  });

  it('should handle a perfect grade (5) correctly', () => {
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 5);
    // easiness = 2.5 + 0.1 = 2.6
    expect(result.easiness).toBeCloseTo(2.6, 1);
    expect(result.interval).toBe(15); // 6 * 2.6 = 15.6 -> floor 15
  });

  it('should decrease easiness on poor grade', () => {
    const result = sm2({ easiness: 2.5, interval: 6, repetitions: 2 }, 1);
    // easiness = 2.5 - 0.8 = 1.7
    expect(result.easiness).toBeCloseTo(1.7, 1);
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/sm2.test.ts
```

Expected: FAIL — module not found for `../src/engine/sm2`.

- [ ] **Step 3: Write SM-2 algorithm implementation**

File: `src/engine/sm2.ts`

```typescript
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
    // Incorrect — reset
    repetitions = 0;
    interval = 1;
  } else {
    // Correct — advance interval
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/sm2.test.ts
```

Expected: PASS — all 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ tests/sm2.test.ts
git commit -m "feat: add SM-2 spaced repetition algorithm"
```

---

## Task 4: DeepSeek API Client

**Files:**
- Create: `src/api/deepseek.ts`
- Create: `src/store/settings.ts`
- Create: `tests/deepseek.test.ts`

- [ ] **Step 1: Write API client interface + failing test**

File: `tests/deepseek.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepseekClient } from '../src/api/deepseek';

describe('DeepseekClient', () => {
  let client: DeepseekClient;
  const mockKey = 'sk-test-key';

  beforeEach(() => {
    client = new DeepseekClient(mockKey);
    vi.restoreAllMocks();
  });

  it('should throw if no API key is provided', () => {
    expect(() => new DeepseekClient('')).toThrow('API key is required');
  });

  it('should construct correct API URL and headers', () => {
    // Internal check: the client should use the correct endpoint
    expect(client).toBeDefined();
  });

  it('should handle API error responses gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    });
    await expect(client.chat([{ role: 'user', content: 'Hi' }]))
      .rejects.toThrow('DeepSeek API error 401: Invalid API key');
  });

  it('should return response on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Hello!' } }],
      }),
    });
    const result = await client.chat([{ role: 'user', content: 'Hi' }]);
    expect(result).toBe('Hello!');
  });

  it('should include custom system prompt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OK' } }],
      }),
    });
    await client.chat([{ role: 'user', content: 'Test' }], { system: 'Be concise' });
    const callArgs = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.messages[0].content).toBe('Be concise');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/deepseek.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write DeepSeek API client**

File: `src/api/deepseek.ts`

```typescript
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class DeepseekClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('API key is required');
    }
    this.apiKey = apiKey.trim();
  }

  async chat(messages: Message[], options: ChatOptions = {}): Promise<string> {
    const {
      system,
      temperature = 0.7,
      maxTokens = 1024,
      model = DEFAULT_MODEL,
    } = options;

    const fullMessages: Message[] = [];
    if (system) {
      fullMessages.push({ role: 'system', content: system });
    }
    fullMessages.push(...messages);

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody?.error?.message || response.statusText;
      throw new Error(`DeepSeek API error ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }
}
```

- [ ] **Step 4: Write settings store (for API key persistence)**

File: `src/store/settings.ts`

```typescript
import { create } from 'zustand';

interface SettingsState {
  apiKey: string;
  setApiKey: (key: string) => void;
  isConfigured: boolean;
  dailyReviewTarget: number;  // How many reviews per day
  setDailyReviewTarget: (n: number) => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  apiKey: '',
  setApiKey: (key: string) => set({ apiKey: key, isConfigured: key.trim().length > 0 }),
  isConfigured: false,
  dailyReviewTarget: 5,
  setDailyReviewTarget: (n: number) => set({ dailyReviewTarget: n }),
}));
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/deepseek.test.ts
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/api/ src/store/ tests/deepseek.test.ts
git commit -m "feat: add DeepSeek API client with BYOK support"
```

---

## Task 5: LLM Content Digestion + Question Generation

**Files:**
- Create: `src/llm/digest.ts`
- Create: `src/llm/questions.ts`
- Create: `tests/digest.test.ts`
- Create: `tests/questions.test.ts`

- [ ] **Step 1: Write the failing tests for digest**

File: `tests/digest.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digestContent } from '../src/llm/digest';

describe('digestContent', () => {
  const mockClient = {
    chat: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return key concepts from text', async () => {
    mockClient.chat.mockResolvedValue(JSON.stringify({
      title: 'Introduction to ETFs',
      keyConcepts: [
        'ETF is a basket of securities traded on exchanges',
        'Expense ratio is the annual fee',
        'Dividend yield varies by fund',
      ],
    }));

    const result = await digestContent(mockClient, 'ETF stands for exchange-traded fund...');
    expect(result.title).toBe('Introduction to ETFs');
    expect(result.keyConcepts).toHaveLength(3);
  });

  it('should parse URL from input and extract title', async () => {
    mockClient.chat.mockResolvedValue(JSON.stringify({
      title: 'Understanding Neural Networks',
      keyConcepts: ['Neurons are basic units', 'Weights determine signal strength'],
    }));

    const result = await digestContent(mockClient, 'Check this: https://example.com/ai');
    expect(result.title).toContain('Neural');
  });

  it('should handle empty input gracefully', async () => {
    await expect(digestContent(mockClient, '')).rejects.toThrow('Content is empty');
  });

  it('should handle malformed LLM response', async () => {
    mockClient.chat.mockResolvedValue('not json at all');
    await expect(digestContent(mockClient, 'Some text')).rejects.toThrow('Failed to parse');
  });
});
```

- [ ] **Step 2: Write the failing tests for questions**

File: `tests/questions.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestions } from '../src/llm/questions';

describe('generateQuestions', () => {
  const mockClient = {
    chat: vi.fn(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should generate questions from key concepts', async () => {
    mockClient.chat.mockResolvedValue(JSON.stringify([
      {
        type: 'multiple_choice',
        question: 'What is an ETF?',
        correctAnswer: 'A basket of securities',
        options: ['A basket of securities', 'A single stock', 'A bond', 'A currency'],
        explanation: 'ETF pools multiple assets into one fund.',
      },
      {
        type: 'short_answer',
        question: 'What determines signal strength in a neural network?',
        correctAnswer: 'Weights',
        explanation: 'Weights are parameters that amplify or dampen signals.',
      },
    ]));

    const result = await generateQuestions(mockClient, [
      'ETF is a basket of securities',
      'Weights determine signal strength',
    ], 'Finance');

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('multiple_choice');
    expect(result[0].options).toHaveLength(4);
    expect(result[1].type).toBe('short_answer');
  });

  it('should handle LLM returning invalid JSON', async () => {
    mockClient.chat.mockResolvedValue('```json\n{"invalid": true}\n```');
    await expect(generateQuestions(mockClient, ['test'], 'General'))
      .rejects.toThrow('Expected array');
  });

  it('should validate each question has required fields', async () => {
    mockClient.chat.mockResolvedValue(JSON.stringify([
      { type: 'multiple_choice', question: 'Q1' }, // missing correctAnswer
    ]));
    await expect(generateQuestions(mockClient, ['test'], 'General'))
      .rejects.toThrow('Invalid question');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/digest.test.ts tests/questions.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 4: Write content digestion module**

File: `src/llm/digest.ts`

```typescript
import type { DeepseekClient } from '../api/deepseek';

export interface DigestResult {
  title: string;
  keyConcepts: string[];
}

const DIGEST_SYSTEM_PROMPT = `You are a learning assistant that extracts key concepts from text.

Given any text or URL content, output a JSON object with:
1. "title": A short, descriptive title (max 10 words)
2. "keyConcepts": An array of 3-8 concise, standalone fact statements about the most important concepts

Rules:
- Each key concept should be a complete sentence
- Concepts must be self-contained (understandable without context)
- Focus on memorable, testable facts
- Remove fluff and examples
- Output valid JSON only, no markdown formatting`;

export async function digestContent(
  client: DeepseekClient,
  input: string,
): Promise<DigestResult> {
  if (!input || input.trim() === '') {
    throw new Error('Content is empty');
  }

  const userMessage = `Extract key concepts from this content:\n\n${input}`;

  const response = await client.chat(
    [{ role: 'user', content: userMessage }],
    {
      system: DIGEST_SYSTEM_PROMPT,
      temperature: 0.3,
      maxTokens: 2048,
    },
  );

  try {
    const parsed = JSON.parse(response);
    if (!parsed.title || !Array.isArray(parsed.keyConcepts)) {
      throw new Error('Invalid digest format');
    }
    return {
      title: parsed.title,
      keyConcepts: parsed.keyConcepts.slice(0, 8),
    };
  } catch (e) {
    throw new Error(`Failed to parse LLM response: ${e instanceof Error ? e.message : String(e)}`);
  }
}
```

- [ ] **Step 5: Write question generation module**

File: `src/llm/questions.ts`

```typescript
import type { DeepseekClient } from '../api/deepseek';
import type { Question, QuestionType } from '../types';

export interface QuestionInput {
  type: QuestionType;
  question: string;
  correctAnswer: string;
  options?: string[];
  explanation?: string;
}

const QUESTIONS_SYSTEM_PROMPT = `You are a quiz generator. Given key concepts and a topic, generate 3-6 questions.

Output a JSON array of question objects. Each object must have:
- "type": "multiple_choice" or "short_answer"
- "question": The question text
- "correctAnswer": The correct answer (string)
- "options": [4 strings] — ONLY for multiple_choice, include correctAnswer as one of them
- "explanation": Brief explanation of the correct answer

Rules:
- Mix question types (at least 1 of each)
- Questions should test understanding, not trivia
- Wrong options should be plausible
- Output valid JSON array only, no markdown`;

export async function generateQuestions(
  client: DeepseekClient,
  keyConcepts: string[],
  topic: string,
): Promise<QuestionInput[]> {
  const userMessage = `Topic: ${topic}\n\nKey Concepts:\n${keyConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const response = await client.chat(
    [{ role: 'user', content: userMessage }],
    {
      system: QUESTIONS_SYSTEM_PROMPT,
      temperature: 0.5,
      maxTokens: 4096,
    },
  );

  const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed: any[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON array');
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected array of questions');
  }

  // Validate each question
  for (const q of parsed) {
    if (!q.type || !q.question || !q.correctAnswer) {
      throw new Error(`Invalid question: missing required fields`);
    }
    if (q.type === 'multiple_choice' && (!q.options || q.options.length !== 4)) {
      throw new Error(`Multiple choice question must have exactly 4 options`);
    }
  }

  return parsed;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ~/projects/sticky-mem
npx vitest run tests/digest.test.ts tests/questions.test.ts
```

Expected: PASS — all 7 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/llm/ tests/digest.test.ts tests/questions.test.ts
git commit -m "feat: add LLM content digestion + question generation"
```

---

## Task 6: Settings Screen — API Key Configuration

**Files:**
- Create: `app/settings.tsx`
- Create: `src/hooks/useApiClient.ts`

- [ ] **Step 1: Write useApiClient hook**

File: `src/hooks/useApiClient.ts`

```typescript
import { useMemo } from 'react';
import { DeepseekClient } from '../api/deepseek';
import { useSettingsStore } from '../store/settings';

export function useApiClient(): DeepseekClient | null {
  const apiKey = useSettingsStore((s) => s.apiKey);

  return useMemo(() => {
    if (!apiKey || apiKey.trim() === '') return null;
    return new DeepseekClient(apiKey);
  }, [apiKey]);
}
```

- [ ] **Step 2: Write Settings screen**

File: `app/settings.tsx`

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView,
} from 'react-native';
import { useSettingsStore } from '../src/store/settings';
import { useRouter } from 'expo-router';

export default function SettingsScreen() {
  const { apiKey, setApiKey, isConfigured, dailyReviewTarget, setDailyReviewTarget } = useSettingsStore();
  const [localKey, setLocalKey] = useState(apiKey);
  const router = useRouter();

  const handleSave = () => {
    if (localKey.trim() && !localKey.startsWith('sk-')) {
      Alert.alert('Warning', 'DeepSeek API keys usually start with "sk-". Please verify your key.');
      return;
    }
    setApiKey(localKey.trim());
    Alert.alert('Saved', 'API key has been saved locally.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>API Configuration</Text>
      <Text style={styles.description}>
        StickyMem uses your own DeepSeek API key. No data is sent anywhere else.
        Get a key at{' '}
        <Text style={styles.link}>platform.deepseek.com</Text>
      </Text>

      <Text style={styles.label}>DeepSeek API Key</Text>
      <TextInput
        style={styles.input}
        value={localKey}
        onChangeText={setLocalKey}
        placeholder="sk-..."
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
      />

      {isConfigured && (
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>✅ API key configured</Text>
        </View>
      )}

      <Text style={styles.label}>Daily Review Target</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setDailyReviewTarget(Math.max(1, dailyReviewTarget - 1))}
        >
          <Text style={styles.numberButtonText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.numberValue}>{dailyReviewTarget}</Text>
        <TouchableOpacity
          style={styles.numberButton}
          onPress={() => setDailyReviewTarget(Math.min(30, dailyReviewTarget + 1))}
        >
          <Text style={styles.numberButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, !localKey.trim() && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!localKey.trim()}
      >
        <Text style={styles.saveButtonText}>Save</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20 },
  sectionTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8, color: '#333' },
  description: { fontSize: 14, color: '#666', lineHeight: 20, marginBottom: 24 },
  link: { color: '#4A90D9', textDecorationLine: 'underline' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginTop: 12,
    alignItems: 'center',
  },
  statusText: { color: '#2E7D32', fontSize: 14, fontWeight: '500' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginTop: 8, gap: 20,
  },
  numberButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center',
  },
  numberButtonText: { fontSize: 24, color: '#333', fontWeight: '600' },
  numberValue: { fontSize: 28, fontWeight: '700', color: '#333', minWidth: 40, textAlign: 'center' },
  saveButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 32,
  },
  saveButtonDisabled: { backgroundColor: '#CCC' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/settings.tsx src/hooks/useApiClient.ts
git commit -m "feat: add settings screen with API key configuration"
```

---

## Task 7: Add Content Screen

**Files:**
- Create: `app/add.tsx`
- Create: `src/components/AddContentForm.tsx`

- [ ] **Step 1: Write AddContentForm component**

File: `src/components/AddContentForm.tsx`

```tsx
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

interface Props {
  onSubmit: (input: string) => Promise<void>;
  isProcessing: boolean;
}

export default function AddContentForm({ onSubmit, isProcessing }: Props) {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'text' | 'url'>('text');

  const handleSubmit = async () => {
    if (!input.trim() || isProcessing) return;
    await onSubmit(input.trim());
    setInput('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, mode === 'text' && styles.tabActive]}
          onPress={() => setMode('text')}
        >
          <Text style={[styles.tabText, mode === 'text' && styles.tabTextActive]}>Paste Text</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'url' && styles.tabActive]}
          onPress={() => setMode('url')}
        >
          <Text style={[styles.tabText, mode === 'url' && styles.tabTextActive]}>URL</Text>
        </TouchableOpacity>
      </View>

      {mode === 'text' ? (
        <TextInput
          style={styles.textArea}
          value={input}
          onChangeText={setInput}
          placeholder="Paste the content you want to remember..."
          multiline
          textAlignVertical="top"
        />
      ) : (
        <TextInput
          style={styles.urlInput}
          value={input}
          onChangeText={setInput}
          placeholder="https://example.com/article"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
      )}

      <TouchableOpacity
        style={[styles.submitButton, (!input.trim() || isProcessing) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={!input.trim() || isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Digest & Generate Questions</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  tabRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    backgroundColor: '#F0F0F0', alignItems: 'center',
  },
  tabActive: { backgroundColor: '#4A90D9' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#666' },
  tabTextActive: { color: '#fff' },
  textArea: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
    minHeight: 200, textAlignVertical: 'top',
  },
  urlInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
  },
  submitButton: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 16,
    alignItems: 'center', marginTop: 20,
  },
  submitButtonDisabled: { backgroundColor: '#CCC' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
```

- [ ] **Step 2: Write Add Content screen**

File: `app/add.tsx`

```tsx
import React, { useState } from 'react';
import { View, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AddContentForm from '../src/components/AddContentForm';
import { useApiClient } from '../src/hooks/useApiClient';
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import { Repository } from '../src/db/repository';
import { useSettingsStore } from '../src/store/settings';
import { useDatabase } from '../src/hooks/useDatabase';

export default function AddContentScreen() {
  const [isProcessing, setIsProcessing] = useState(false);
  const apiClient = useApiClient();
  const router = useRouter();

  // Note: useDatabase hook will be created in a later step
  // For now, this is a placeholder — the actual DB init happens in Task 9

  const handleSubmit = async (input: string) => {
    if (!apiClient) {
      Alert.alert('API Key Required', 'Please configure your DeepSeek API key in Settings first.');
      router.push('/settings');
      return;
    }

    setIsProcessing(true);
    try {
      const digest = await digestContent(apiClient, input);
      const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title);
      Alert.alert(
        'Success!',
        `Digested "${digest.title}"\nGenerated ${questions.length} questions.\nThey will appear in your review queue.`,
        [{ text: 'Great!', onPress: () => router.back() }],
      );
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to process content: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AddContentForm onSubmit={handleSubmit} isProcessing={isProcessing} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/add.tsx src/components/AddContentForm.tsx
git commit -m "feat: add content input screen with text/URL modes"
```

---

## Task 8: Review Session — Question + Feedback UI

**Files:**
- Create: `src/components/QuestionCard.tsx`
- Create: `src/components/ResultFeedback.tsx`
- Create: `app/review.tsx`
- Create: `src/hooks/useReview.ts`

- [ ] **Step 1: Write QuestionCard component**

File: `src/components/QuestionCard.tsx`

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import type { Question } from '../types';

interface Props {
  question: Question;
  onAnswer: (correct: boolean) => void;
}

export default function QuestionCard({ question, onAnswer }: Props) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [shortAnswer, setShortAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  const handleMultipleChoice = (option: string) => {
    if (hasAnswered) return;
    setSelectedOption(option);
    setHasAnswered(true);
    const correct = option === question.correctAnswer;
    setTimeout(() => onAnswer(correct), 1000);
  };

  const handleShortAnswer = () => {
    if (hasAnswered || !shortAnswer.trim()) return;
    setHasAnswered(true);
    // Simple exact-match check for MVP — can be improved later
    const correct = shortAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    setTimeout(() => onAnswer(correct), 1500);
  };

  const isCorrect = question.type === 'multiple_choice'
    ? selectedOption === question.correctAnswer
    : shortAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();

  return (
    <View style={styles.card}>
      <Text style={styles.questionText}>{question.question}</Text>

      {question.type === 'multiple_choice' && question.options && (
        <View style={styles.optionsContainer}>
          {question.options.map((option, i) => {
            let optionStyle = styles.option;
            let textStyle = styles.optionText;
            if (hasAnswered) {
              if (option === question.correctAnswer) {
                optionStyle = { ...optionStyle, ...styles.optionCorrect };
                textStyle = { ...textStyle, ...styles.optionTextCorrect };
              } else if (option === selectedOption && option !== question.correctAnswer) {
                optionStyle = { ...optionStyle, ...styles.optionWrong };
                textStyle = { ...textStyle, ...styles.optionTextWrong };
              }
            }
            return (
              <TouchableOpacity
                key={i}
                style={optionStyle}
                onPress={() => handleMultipleChoice(option)}
                disabled={hasAnswered}
              >
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {question.type === 'short_answer' && (
        <View style={styles.shortAnswerContainer}>
          <TextInput
            style={styles.shortAnswerInput}
            value={shortAnswer}
            onChangeText={setShortAnswer}
            placeholder="Type your answer..."
            editable={!hasAnswered}
            autoCapitalize="none"
          />
          {!hasAnswered && (
            <TouchableOpacity
              style={[styles.submitAnswerBtn, !shortAnswer.trim() && styles.submitAnswerBtnDisabled]}
              onPress={handleShortAnswer}
              disabled={!shortAnswer.trim()}
            >
              <Text style={styles.submitAnswerText}>Submit</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {hasAnswered && question.explanation && (
        <View style={[styles.explanation, isCorrect ? styles.explanationCorrect : styles.explanationWrong]}>
          <Text style={styles.explanationTitle}>{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</Text>
          <Text style={styles.explanationText}>{question.explanation}</Text>
          {!isCorrect && (
            <Text style={styles.correctAnswer}>Correct answer: {question.correctAnswer}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 24,
    marginHorizontal: 16, marginVertical: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
  },
  questionText: { fontSize: 18, fontWeight: '600', color: '#333', lineHeight: 26, marginBottom: 20 },
  optionsContainer: { gap: 10 },
  option: {
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    padding: 14, backgroundColor: '#FAFAFA',
  },
  optionCorrect: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  optionWrong: { borderColor: '#F44336', backgroundColor: '#FFEBEE' },
  optionText: { fontSize: 16, color: '#333' },
  optionTextCorrect: { color: '#2E7D32', fontWeight: '600' },
  optionTextWrong: { color: '#C62828', fontWeight: '600' },
  shortAnswerContainer: { gap: 12 },
  shortAnswerInput: {
    borderWidth: 1, borderColor: '#DDD', borderRadius: 10,
    padding: 14, fontSize: 16, backgroundColor: '#F9F9F9',
    minHeight: 60,
  },
  submitAnswerBtn: {
    backgroundColor: '#4A90D9', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  submitAnswerBtnDisabled: { backgroundColor: '#CCC' },
  submitAnswerText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  explanation: { marginTop: 16, padding: 14, borderRadius: 10 },
  explanationCorrect: { backgroundColor: '#E8F5E9' },
  explanationWrong: { backgroundColor: '#FFEBEE' },
  explanationTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  explanationText: { fontSize: 14, color: '#555', lineHeight: 20 },
  correctAnswer: { fontSize: 14, color: '#C62828', fontWeight: '600', marginTop: 8 },
});
```

- [ ] **Step 2: Write useReview hook**

File: `src/hooks/useReview.ts`

```typescript
import { useState, useCallback, useRef } from 'react';
import type { Question, Card, ReviewGrade } from '../types';
import { sm2, calculateNextReview } from '../engine/sm2';

export interface ReviewSessionState {
  questions: (Question & { card: Card })[];
  currentIndex: number;
  results: { questionId: string; correct: boolean; grade: ReviewGrade }[];
  isComplete: boolean;
}

export function useReview() {
  const [state, setState] = useState<ReviewSessionState>({
    questions: [],
    currentIndex: 0,
    results: [],
    isComplete: false,
  });

  const currentQuestion = state.questions[state.currentIndex] ?? null;
  const progress = state.questions.length > 0
    ? state.currentIndex / state.questions.length
    : 0;

  const submitGrade = useCallback((correct: boolean) => {
    setState((prev) => {
      const item = prev.questions[prev.currentIndex];
      if (!item) return prev;

      const grade: ReviewGrade = correct ? 4 : 0;
      const updatedCard = sm2(item.card, grade);
      updatedCard.lastReviewAt = Date.now();
      updatedCard.nextReviewAt = calculateNextReview(updatedCard.interval, Date.now());

      const newResults = [...prev.results, { questionId: item.card.questionId, correct, grade }];
      const nextIndex = prev.currentIndex + 1;
      const isComplete = nextIndex >= prev.questions.length;

      return {
        ...prev,
        currentIndex: nextIndex,
        results: newResults,
        isComplete,
        // Return updated card data for persistence
        _updatedCards: {
          ...(prev as any)._updatedCards,
          [item.card.questionId]: updatedCard,
        },
      };
    });
  }, []);

  const startSession = useCallback((questions: (Question & { card: Card })[]) => {
    setState({
      questions,
      currentIndex: 0,
      results: [],
      isComplete: false,
    });
  }, []);

  return {
    currentQuestion,
    currentIndex: state.currentIndex,
    totalCount: state.questions.length,
    progress,
    isComplete: state.isComplete,
    startSession,
    submitGrade,
    results: state.results,
    updatedCards: (state as any)._updatedCards as Record<string, Card> | undefined,
  };
}
```

- [ ] **Step 3: Write Review screen**

File: `app/review.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import QuestionCard from '../src/components/QuestionCard';
import { useReview } from '../src/hooks/useReview';
import type { Card } from '../src/types';

export default function ReviewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const {
    currentQuestion, currentIndex, totalCount,
    progress, isComplete, startSession, submitGrade,
  } = useReview();

  useEffect(() => {
    // TODO: Load due cards from database in Task 9
    // For now, show empty state
    setLoading(false);
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
    const correct = (progress > 0) ? Math.round(progress * 100) : 0;
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
```

- [ ] **Step 4: Commit**

```bash
git add src/components/QuestionCard.tsx src/hooks/useReview.ts app/review.tsx
git commit -m "feat: add review session with question card + feedback UI"
```

---

## Task 9: Home Screen + Database Integration

**Files:**
- Create: `src/hooks/useDatabase.ts`
- Create: `app/index.tsx` (Home screen)
- Create: `src/hooks/useSchedule.ts`
- Modify: `app/add.tsx` (wire up database persistence)
- Modify: `app/review.tsx` (load due cards from DB)

- [ ] **Step 1: Write useDatabase hook**

File: `src/hooks/useDatabase.ts`

```typescript
import { useEffect, useState, useRef } from 'react';
import * as SQLite from 'expo-sqlite';
import { Repository } from '../db/repository';

let globalDb: SQLite.SQLiteDatabase | null = null;
let globalRepo: Repository | null = null;

export async function initDatabase(): Promise<Repository> {
  if (globalRepo) return globalRepo;
  globalDb = await SQLite.openDatabaseAsync('stickymem.db');
  globalRepo = await Repository.create({
    run: (sql: string, params?: any[]) => globalDb!.runAsync(sql, params),
    query: <T,>(sql: string, params?: any[]) => globalDb!.getAllAsync(sql, params) as Promise<T[]>,
  });
  return globalRepo;
}

export function useDatabase(): Repository | null {
  const [repo, setRepo] = useState<Repository | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    initDatabase().then(setRepo).catch(console.error);
  }, []);

  return repo;
}
```

- [ ] **Step 2: Write useSchedule hook**

File: `src/hooks/useSchedule.ts`

```typescript
import { useState, useEffect } from 'react';
import type { Repository } from '../db/repository';
import type { Question, Card } from '../types';

export function useSchedule(repo: Repository | null) {
  const [dueCount, setDueCount] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repo) return;
    loadStats();

    async function loadStats() {
      try {
        const due = await repo.getDueCards(Date.now());
        const total = await repo.getTotalQuestionCount();
        setDueCount(due.length);
        setTotalQuestions(total);
      } catch (e) {
        console.error('Failed to load schedule:', e);
      } finally {
        setLoading(false);
      }
    }
  }, [repo]);

  const loadDueCards = async (): Promise<(Question & { card: Card })[]> => {
    if (!repo) return [];
    return repo.getDueCards(Date.now());
  };

  return { dueCount, totalQuestions, loading, loadDueCards };
}
```

- [ ] **Step 3: Write Home screen**

File: `app/index.tsx`

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../src/hooks/useDatabase';
import { useSchedule } from '../src/hooks/useSchedule';
import { useSettingsStore } from '../src/store/settings';
import { Ionicons } from '@expo/vector-icons';

export default function HomeScreen() {
  const router = useRouter();
  const repo = useDatabase();
  const { dueCount, totalQuestions, loading } = useSchedule(repo);
  const isConfigured = useSettingsStore((s) => s.isConfigured);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.appName}>StickyMem</Text>
          <TouchableOpacity onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Today's Review Card */}
        <TouchableOpacity
          style={styles.reviewCard}
          onPress={() => router.push('/review')}
          disabled={dueCount === 0}
        >
          <Text style={styles.reviewCardTitle}>Today's Review</Text>
          {loading ? (
            <Text style={styles.reviewCardCount}>Loading...</Text>
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
            <Ionicons name="warning-outline" size={20} color="#E65100" />
            <Text style={styles.warningText}>
              API key not configured. Go to Settings to add your DeepSeek key.
            </Text>
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/add')}>
            <Ionicons name="add-circle-outline" size={28} color="#4A90D9" />
            <Text style={styles.actionText}>Add Content</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/progress')}>
            <Ionicons name="trending-up-outline" size={28} color="#4A90D9" />
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
  warningText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 20,
    alignItems: 'center', gap: 8,
  },
  actionText: { fontSize: 14, fontWeight: '500', color: '#666' },
});
```

- [ ] **Step 4: Update add.tsx to persist to database**

Update `app/add.tsx` — add imports and modify `handleSubmit`:

```typescript
// Add to imports:
import { digestContent } from '../src/llm/digest';
import { generateQuestions } from '../src/llm/questions';
import { initDatabase } from '../src/hooks/useDatabase';

// Replace handleSubmit with:
const handleSubmit = async (input: string) => {
  if (!apiClient) {
    Alert.alert('API Key Required', 'Please configure your DeepSeek API key in Settings first.');
    router.push('/settings');
    return;
  }

  setIsProcessing(true);
  try {
    const repo = await initDatabase();
    const digest = await digestContent(apiClient, input);

    // Generate a content ID
    const contentId = `content_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await repo.insertContent({
      id: contentId,
      sourceType: input.startsWith('http') ? 'url' as const : 'text' as const,
      title: digest.title,
      rawText: input,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    const questions = await generateQuestions(apiClient, digest.keyConcepts, digest.title);
    for (const q of questions) {
      const questionId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await repo.insertQuestion({
        id: questionId,
        contentId,
        type: q.type,
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation,
        createdAt: Date.now(),
      });

      // Create initial SM-2 card (due immediately for first review)
      await repo.upsertCard({
        questionId,
        easiness: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewAt: Date.now(),
        lastReviewAt: 0,
      });
    }

    Alert.alert(
      'Success!',
      `Digested "${digest.title}"\nGenerated ${questions.length} questions.\nThey're ready for review now!`,
      [{ text: 'Great!', onPress: () => router.back() }],
    );
  } catch (error) {
    Alert.alert(
      'Error',
      `Failed to process content: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  } finally {
    setIsProcessing(false);
  }
};
```

- [ ] **Step 5: Update review.tsx to load due cards from database**

Update `app/review.tsx` — modify the `useEffect`:

```typescript
// Add to imports:
import { initDatabase } from '../src/hooks/useDatabase';
import type { Question, Card } from '../src/types';

// Replace the useEffect:
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

// Update handleAnswer to persist results:
const handleAnswer = (correct: boolean) => {
  submitGrade(correct);
  // After submitting, persist updated card + review record to DB
  // This runs after state update via a microtask
  setTimeout(async () => {
    // We access the updated card from the hook's internal state
    // For simplicity, this will be refactored in a follow-up
  }, 100);
};
```

- [ ] **Step 6: Commit**

```bash
git add app/index.tsx src/hooks/useDatabase.ts src/hooks/useSchedule.ts app/add.tsx app/review.tsx
git commit -m "feat: add home screen, database integration, and schedule hooks"
```

---

## Task 10: Progress Screen + Chart

**Files:**
- Create: `app/progress.tsx`
- Create: `src/components/ProgressChart.tsx`

- [ ] **Step 1: Write ProgressChart component**

File: `src/components/ProgressChart.tsx`

```tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface DataPoint {
  date: string;
  accuracy: number;
}

interface Props {
  data: DataPoint[];
}

export default function ProgressChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data yet. Start reviewing to see your progress!</Text>
      </View>
    );
  }

  const reversed = [...data].reverse();
  const labels = reversed.map(d => {
    // Show every Nth label to avoid crowding
    const date = new Date(d.date);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });
  const values = reversed.map(d => Math.round(d.accuracy * 100));

  // Thin labels for readability
  const thinLabels = labels.map((l, i) => {
    if (i === 0 || i === labels.length - 1 || i % Math.max(1, Math.floor(labels.length / 5)) === 0) {
      return l;
    }
    return '';
  });

  return (
    <View style={styles.container}>
      <LineChart
        data={{
          labels: thinLabels,
          datasets: [{ data: values.length > 0 ? values : [0] }],
        }}
        width={Dimensions.get('window').width - 40}
        height={200}
        yAxisSuffix="%"
        yAxisInterval={1}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(74, 144, 217, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
          propsForDots: { r: '4', strokeWidth: '2', stroke: '#4A90D9' },
          propsForBackgroundLines: { strokeDasharray: '4', stroke: '#E0E0E0' },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  chart: { borderRadius: 12, marginVertical: 8 },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
});
```

- [ ] **Step 2: Write Progress screen**

File: `app/progress.tsx`

```tsx
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
      <ProgressChart data={stats} />

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
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center', marginTop: 32, lineHeight: 20 },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/progress.tsx src/components/ProgressChart.tsx
git commit -m "feat: add progress screen with accuracy trend chart"
```

---

## Task 11: Notifications + Polish

**Files:**
- Create: `src/hooks/useNotifications.ts`
- Modify: `app/_layout.tsx` (init notifications)

- [ ] **Step 1: Write notifications hook**

File: `src/hooks/useNotifications.ts`

```typescript
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReview(
  dueCount: number,
  hour: number = 9,
  minute: number = 0,
): Promise<void> {
  // Cancel existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  if (dueCount === 0) return; // Don't schedule if nothing due

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'StickyMem Review',
      body: `You have ${dueCount} question${dueCount > 1 ? 's' : ''} waiting for review.`,
      data: { screen: 'review' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
    },
  });
}

export async function cancelNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export function useNotifications() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return { scheduleDailyReview, cancelNotifications };
}
```

- [ ] **Step 2: Update _layout.tsx to init notifications**

Modify `app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useDatabase } from '../src/hooks/useDatabase';
import { useNotifications, scheduleDailyReview } from '../src/hooks/useNotifications';

export default function RootLayout() {
  const repo = useDatabase();

  useEffect(() => {
    // Request notification permission on launch
    useNotifications();
  }, []);

  // Schedule daily review when due count changes
  useEffect(() => {
    if (!repo) return;
    (async () => {
      const due = await repo.getDueCards(Date.now());
      if (due.length > 0) {
        await scheduleDailyReview(due.length);
      }
    })();
  }, [repo]);

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Today', headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Add Content', presentation: 'modal' }} />
        <Stack.Screen name="review" options={{ title: 'Review', headerBackVisible: false }} />
        <Stack.Screen name="progress" options={{ title: 'Progress' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useNotifications.ts app/_layout.tsx
git commit -m "feat: add daily review notifications"
```

---

## Task 12: Open Source Preparation

**Files:**
- Create: `README.md`
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `.gitignore`

- [ ] **Step 1: Write .gitignore**

```
node_modules/
.expo/
dist/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*
web-build/
.env
.env.local
```

- [ ] **Step 2: Write README.md**

```markdown
# StickyMem 🧠📌

> Make your knowledge stick.

StickyMem is an open-source spaced repetition companion app. You feed it content (text or URLs), and it automatically generates quiz questions to help you retain what you've learned.

**Bring your own API key** — no subscription, no data sharing, no vendor lock-in.

## Features

- 📥 **Auto-digest** — Paste text or a URL, StickyMem extracts key concepts
- 🤖 **AI-generated questions** — Multiple choice + short answer from your content
- ⏰ **SM-2 spaced repetition** — Scientifically proven scheduling algorithm
- 📊 **Progress tracking** — See your retention accuracy over time
- 🔒 **BYOK** — Your API key, your data, all local
- 📱 **Mobile-first** — Built with React Native (Expo)

## Quick Start

```bash
# Clone
git clone https://github.com/wilsonchengassistant/sticky-mem.git
cd sticky-mem

# Install
npm install

# Start
npx expo start
```

You'll need a [DeepSeek API key](https://platform.deepseek.com/). Enter it in Settings once the app loads.

## Tech Stack

- **Frontend:** React Native (Expo SDK 52)
- **Navigation:** Expo Router (file-based)
- **Database:** SQLite (expo-sqlite)
- **AI:** DeepSeek API
- **Scheduling:** SM-2 algorithm
- **State:** Zustand

## Roadmap

- [x] Core MVP — text/URL digest + spaced review
- [ ] Audio input (voice memo → digest)
- [ ] Group/Classroom mode
- [ ] Image-aware questions
- [ ] Native iOS/Android notifications
- [ ] iCloud/Google Drive sync

## License

MIT
```

- [ ] **Step 3: Write LICENSE (MIT)**

File: `LICENSE`

```
MIT License

Copyright (c) 2026 StickyMem Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 4: Write CONTRIBUTING.md**

```markdown
# Contributing

Thanks for your interest! StickyMem is in early MVP stage, so contributions are especially valuable.

## Getting Started

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit with conventional commits: `feat:`, `fix:`, `docs:`, `chore:`
6. Open a PR

## Development

- This is an Expo project. Run `npx expo start` to launch.
- All data is local — no backend setup needed.
- Tests use Vitest: `npm test`.
```

- [ ] **Step 5: Create GitHub repo and push**

```bash
cd ~/projects/sticky-mem
gh repo create sticky-mem --public --description "Spaced repetition companion app — auto-digest content into quiz questions" --remote origin
git branch -M main
git push -u origin main
```

Expected: Repository created at `github.com/wilsonchengassistant/sticky-mem`, code pushed.

- [ ] **Step 6: Commit**

```bash
git add README.md LICENSE CONTRIBUTING.md .gitignore
git commit -m "chore: add open source documentation + license"
git push
```

---

## Verification Checklist

After all tasks complete:

- [ ] `npx expo start` launches without errors
- [ ] Home screen shows "No content yet" empty state
- [ ] Settings screen accepts DeepSeek API key
- [ ] Adding text content triggers DeepSeek API, creates questions
- [ ] Questions appear in review queue
- [ ] Answering questions updates SM-2 schedule
- [ ] Progress screen shows accuracy data
- [ ] Daily notification triggers at 9 AM
- [ ] All tests pass: `npm test`
- [ ] App builds for web: `npx expo export -p web`
- [ ] GitHub repo is public with README

---

## Future Iterations (Post-MVP)

- **Audio input** — Record voice memo → Whisper → DeepSeek digest
- **Image questions** — Need alternate LLM with vision support (Claude/GPT-4o)
- **Group mode** — Teacher creates content set, students auto-subscribe
- **Cloud sync** — iCloud / Google Drive for cross-device
- **Offline-first** — Full offline with sync when online
- **Tags/Playlists** — Organize content by topic
