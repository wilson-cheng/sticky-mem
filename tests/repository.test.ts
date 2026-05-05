import { describe, it, expect, beforeEach } from 'vitest';
import { runMigrations } from '../src/db/schema';
import { Repository } from '../src/db/repository';
import type { Content, Question, Card } from '../src/types';

// ─── Robust MockDatabase ─── //

interface Database {
  run(sql: string, params?: any[]): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
}

const TABLE_COLUMNS: Record<string, string[]> = {
  contents: ['id', 'source_type', 'title', 'raw_text', 'created_at', 'updated_at'],
  questions: ['id', 'content_id', 'type', 'question', 'correct_answer', 'options', 'explanation', 'created_at'],
  cards: ['question_id', 'easiness', 'interval', 'repetitions', 'next_review_at', 'last_review_at'],
  reviews: ['id', 'question_id', 'graded_at', 'grade'],
  daily_stats: ['date', 'total_reviewed', 'correct_count'],
};

class MockDatabase implements Database {
  private tables: Map<string, any[]> = new Map();

  async run(sql: string, params?: any[]): Promise<void> {
    const upper = sql.toUpperCase().trim();

    if (upper.startsWith('CREATE TABLE')) {
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
      if (name && !this.tables.has(name)) {
        this.tables.set(name, []);
      }
    } else if (upper.startsWith('INSERT')) {
      const name = sql.match(/INSERT INTO (\w+)/i)?.[1];
      if (name && params) {
        const rows = this.tables.get(name) || [];
        const cols = TABLE_COLUMNS[name];
        if (cols) {
          const row: Record<string, any> = {};
          cols.forEach((col, i) => {
            row[col] = params[i];
          });
          rows.push(row);
        } else {
          rows.push([...params]);
        }
        this.tables.set(name, rows);
      }
    } else if (upper.startsWith('DELETE')) {
      const name = sql.match(/DELETE FROM (\w+)/i)?.[1];
      if (name) this.tables.set(name, []);
    }
  }

  async query<T>(sql: string, params?: any[]): Promise<T[]> {
    const upper = sql.toUpperCase().trim();

    // Handle JOIN queries (cards + questions)
    if (upper.includes('INNER JOIN')) {
      return this.handleJoin(sql, params);
    }

    const name = sql.match(/FROM\s+(\w+)/i)?.[1];
    if (!name) return [];

    const rows = this.tables.get(name) || [];

    // COUNT queries
    if (upper.startsWith('SELECT COUNT')) {
      return [{ count: rows.length }] as T[];
    }

    // WHERE filtering
    if (upper.includes('WHERE') && params?.length) {
      const whereCol = sql.match(/WHERE\s+(\w+)/i)?.[1];
      if (whereCol) {
        return rows.filter((r: any) => r[whereCol] === params[0]) as T[];
      }
      return rows as T[];
    }

    return rows as T[];
  }

  private handleJoin<T>(sql: string, params?: any[]): T[] {
    const questions = this.tables.get('questions') || [];
    const cards = this.tables.get('cards') || [];

    return cards.map((card: any) => {
      const q = questions.find((q: any) => q.id === card.question_id);
      return {
        ...(q || {}),
        easiness: card.easiness,
        interval: card.interval,
        repetitions: card.repetitions,
        next_review_at: card.next_review_at,
        last_review_at: card.last_review_at,
      } as T;
    }).filter((r: any) => {
      return r.next_review_at <= (params?.[0] || Date.now());
    });
  }

  getTable(name: string) { return this.tables.get(name) || []; }
}

// ─── Tests ─── //

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
    const now = Date.now();
    const content: Content = {
      id: 'test-1',
      sourceType: 'text',
      title: 'Test',
      rawText: 'Hello world',
      createdAt: now,
      updatedAt: now,
    };
    await repo.insertContent(content);
    const all = await repo.getAllContents();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe('test-1');
  });

  it('should insert and retrieve questions for a content', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    await repo.insertContent({
      id: 'c1', sourceType: 'text', title: 'T', rawText: 'X',
      createdAt: 1, updatedAt: 1,
    });
    await repo.insertQuestion({
      id: 'q1', contentId: 'c1', type: 'multiple_choice',
      question: 'What?', correctAnswer: 'A',
      options: ['A', 'B', 'C', 'D'], createdAt: 1,
    });
    const questions = await repo.getQuestionsByContentId('c1');
    expect(questions).toHaveLength(1);
    expect(questions[0].id).toBe('q1');
  });

  it('should return due cards for review', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    await repo.insertContent({
      id: 'c1', sourceType: 'text', title: 'T', rawText: 'X',
      createdAt: 1, updatedAt: 1,
    });
    await repo.insertQuestion({
      id: 'q1', contentId: 'c1', type: 'multiple_choice',
      question: 'What?', correctAnswer: 'A',
      options: ['A', 'B', 'C', 'D'], createdAt: 1,
    });
    await repo.upsertCard({
      questionId: 'q1',
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewAt: Date.now() - 86400000,
      lastReviewAt: 0,
    });
    const due = await repo.getDueCards(Date.now());
    expect(due).toHaveLength(1);
    expect(due[0].id).toBe('q1');
  });

  it('should not return cards that are not due yet', async () => {
    await runMigrations(db);
    const repo = new Repository(db);
    await repo.insertContent({
      id: 'c2', sourceType: 'text', title: 'T', rawText: 'X',
      createdAt: 1, updatedAt: 1,
    });
    await repo.insertQuestion({
      id: 'q2', contentId: 'c2', type: 'multiple_choice',
      question: 'What?', correctAnswer: 'A',
      options: ['A', 'B', 'C', 'D'], createdAt: 1,
    });
    await repo.upsertCard({
      questionId: 'q2',
      easiness: 2.5,
      interval: 1,
      repetitions: 0,
      nextReviewAt: Date.now() + 86400000,
      lastReviewAt: 0,
    });
    const due = await repo.getDueCards(Date.now());
    expect(due).toHaveLength(0);
  });
});
