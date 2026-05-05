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
