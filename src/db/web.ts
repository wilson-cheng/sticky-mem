import type { Database } from './schema';

const STORAGE_KEY = 'stickymem-webdb';

const TABLE_COLUMNS: Record<string, string[]> = {
  contents: ['id', 'source_type', 'title', 'raw_text', 'created_at', 'updated_at'],
  questions: ['id', 'content_id', 'type', 'question', 'correct_answer', 'options', 'explanation', 'created_at'],
  cards: ['question_id', 'easiness', 'interval', 'repetitions', 'next_review_at', 'last_review_at'],
  reviews: ['id', 'question_id', 'graded_at', 'grade'],
  daily_stats: ['date', 'total_reviewed', 'correct_count'],
};

function loadPersistedData(): Map<string, any[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const map = new Map<string, any[]>();
      for (const [key, val] of Object.entries(parsed)) {
        map.set(key, val as any[]);
      }
      return map;
    }
  } catch {}
  const map = new Map<string, any[]>();
  map.set('contents', []);
  map.set('questions', []);
  map.set('cards', []);
  map.set('reviews', []);
  map.set('daily_stats', []);
  return map;
}

function persistData(tables: Map<string, any[]>): void {
  try {
    const obj: Record<string, any[]> = {};
    tables.forEach((val, key) => {
      obj[key] = val;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {}
}

class WebDB implements Database {
  private tables: Map<string, any[]>;

  constructor() {
    this.tables = loadPersistedData();
  }

  async run(sql: string, params?: any[]): Promise<void> {
    const upper = sql.toUpperCase().trim();

    if (upper.startsWith('CREATE TABLE')) {
      const name = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)?.[1];
      if (name && !this.tables.has(name)) {
        this.tables.set(name, []);
        persistData(this.tables);
      }
    } else if (upper.startsWith('INSERT')) {
      const name = sql.match(/INSERT INTO (\w+)/i)?.[1];
      if (name && params) {
        const rows = this.tables.get(name) || [];
        const cols = TABLE_COLUMNS[name];
        if (cols) {
          // Check for ON CONFLICT (upsert)
          const conflictCol = sql.match(/ON CONFLICT\((\w+)\)/i)?.[1];
          if (conflictCol) {
            // Try to find existing row by conflict column
            const conflictIdx = cols.indexOf(conflictCol);
            const existingIdx = rows.findIndex(
              (r: any) => conflictIdx >= 0 && r[conflictCol] === params[conflictIdx]
            );
            if (existingIdx >= 0) {
              // Update existing row
              cols.forEach((col, i) => { rows[existingIdx][col] = params[i]; });
            } else {
              // Insert new row
              const row: Record<string, any> = {};
              cols.forEach((col, i) => { row[col] = params[i]; });
              rows.push(row);
            }
          } else {
            const row: Record<string, any> = {};
            cols.forEach((col, i) => { row[col] = params[i]; });
            rows.push(row);
          }
        }
        this.tables.set(name, rows);
        persistData(this.tables);
      }
    } else if (upper.startsWith('DELETE')) {
      const name = sql.match(/DELETE FROM (\w+)/i)?.[1];
      if (name) {
        // Only clear all (no WHERE support for web DB delete)
        if (!sql.toUpperCase().includes('WHERE')) {
          this.tables.set(name, []);
        } else if (params?.length) {
          // DELETE with WHERE: remove matching rows
          const whereCol = sql.match(/WHERE\s+(\w+)/i)?.[1];
          if (whereCol) {
            const rows = (this.tables.get(name) || []).filter(
              (r: any) => r[whereCol] !== params[0]
            );
            this.tables.set(name, rows);
          }
        }
        persistData(this.tables);
      }
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
    if (upper.includes('ORDER BY')) {
      const orderCol = sql.match(/ORDER BY\s+(\w+)/i)?.[1];
      const orderDir = sql.includes('DESC') ? -1 : 1;
      if (orderCol && rows.length > 0) {
        rows.sort((a: any, b: any) => {
          if (a[orderCol] < b[orderCol]) return -1 * orderDir;
          if (a[orderCol] > b[orderCol]) return 1 * orderDir;
          return 0;
        });
      }
    }
    if (upper.includes('LIMIT')) {
      const limit = parseInt(sql.match(/LIMIT\s+(\d+)/i)?.[1] || '0', 10);
      if (limit > 0 && rows.length > limit) {
        rows.splice(limit);
      }
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
    const result = cards.map((card: any) => {
      const q = questions.find((q: any) => q.id === card.question_id);
      return { ...(q || {}), easiness: card.easiness, interval: card.interval, repetitions: card.repetitions, next_review_at: card.next_review_at, last_review_at: card.last_review_at } as T;
    }).filter((r: any) => r.next_review_at <= (params?.[0] || Date.now()));
    return result;
  }
}

export function createWebDatabase(): Database {
  return new WebDB();
}
