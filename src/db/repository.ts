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

  /** Delete ALL data — contents, questions, cards, reviews, daily_stats */
  async clearAll(): Promise<void> {
    await this.db.run('DELETE FROM reviews');
    await this.db.run('DELETE FROM cards');
    await this.db.run('DELETE FROM questions');
    await this.db.run('DELETE FROM contents');
    await this.db.run('DELETE FROM daily_stats');
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

  async deleteQuestionsByContentId(contentId: string): Promise<void> {
    await this.db.run('DELETE FROM cards WHERE question_id IN (SELECT id FROM questions WHERE content_id = ?)', [contentId]);
    await this.db.run('DELETE FROM questions WHERE content_id = ?', [contentId]);
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

  async getTodayReviewedCount(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.db.query<any[]>(
      'SELECT total_reviewed FROM daily_stats WHERE date = ?', [today]
    );
    return rows[0]?.total_reviewed ?? 0;
  }

  async getTodayCorrectCount(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.db.query<any[]>(
      'SELECT correct_count FROM daily_stats WHERE date = ?', [today]
    );
    return rows[0]?.correct_count ?? 0;
  }

  async saveContentWithQuestions(params: {
    sourceType: string;
    title: string;
    rawText: string;
    summary: string;
    key_concepts: string[];
    questions: { type: string; question: string; correctAnswer: string; options?: string[]; explanation?: string }[];
  }): Promise<void> {
    const now = Date.now();
    const contentId = `${now}-${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2, 5)}`;

    // Save content
    await this.insertContent({
      id: contentId,
      sourceType: params.sourceType,
      title: params.title,
      rawText: params.rawText,
      createdAt: now,
      updatedAt: now,
    });

    // Save each question + initial card
    for (const q of params.questions) {
      const questionId = `${now}-${Math.random().toString(36).slice(6)}`;
      await this.insertQuestion({
        id: questionId,
        contentId,
        type: q.type as 'multiple_choice' | 'short_answer',
        question: q.question,
        correctAnswer: q.correctAnswer,
        options: q.options,
        explanation: q.explanation,
        createdAt: now,
      });

      // Create initial SM-2 card (new = due now for immediate review)
      await this.upsertCard({
        questionId,
        easiness: 2.5,
        interval: 0,
        repetitions: 0,
        nextReviewAt: now,
        lastReviewAt: 0,
      });
    }
  }

  // ─── Raw SQL access (for review remove, etc.) ─── //

  async run(sql: string, params?: any[]): Promise<void> {
    await this.db.run(sql, params);
  }
}
