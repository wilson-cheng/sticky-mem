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
