import type { Database } from './schema';

/**
 * In-memory web database fallback for environments where expo-sqlite is unavailable.
 * Uses the same MockDatabase approach from tests — stores rows in Maps.
 */
const TABLE_COLUMNS: Record<string, string[]> = {
  contents: ['id', 'source_type', 'title', 'raw_text', 'created_at', 'updated_at'],
  questions: ['id', 'content_id', 'type', 'question', 'correct_answer', 'options', 'explanation', 'created_at'],
  cards: ['question_id', 'easiness', 'interval', 'repetitions', 'next_review_at', 'last_review_at'],
  reviews: ['id', 'question_id', 'graded_at', 'grade'],
  daily_stats: ['date', 'total_reviewed', 'correct_count'],
};

class WebDB implements Database {
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
          cols.forEach((col, i) => { row[col] = params[i]; });
          rows.push(row);
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

    if (upper.includes('INNER JOIN')) {
      return this.handleJoin<T>(sql, params);
    }

    const name = sql.match(/FROM\s+(\w+)/i)?.[1];
    if (!name) return [];
    const rows = this.tables.get(name) || [];

    if (upper.startsWith('SELECT COUNT')) {
      return [{ count: rows.length }] as T[];
    }
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
      return { ...(q || {}), easiness: card.easiness, interval: card.interval, repetitions: card.repetitions, next_review_at: card.next_review_at, last_review_at: card.last_review_at } as T;
    }).filter((r: any) => r.next_review_at <= (params?.[0] || Date.now()));
  }
}

export function createWebDatabase(): Database {
  return new WebDB();
}
