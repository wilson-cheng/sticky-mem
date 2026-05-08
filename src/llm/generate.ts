import type { DeepseekClient } from '../api/deepseek';
import type { QuestionType } from '../types';

export interface DigestResult {
  title: string;
  summary: string;
  keyConcepts: string[];
}

export interface QuestionInput {
  type: QuestionType;
  question: string;
  correctAnswer: string;
  options?: string[];
  explanation?: string;
}

export interface GenerateResult {
  digest: DigestResult;
  questions: QuestionInput[];
}

const GENERATE_SYSTEM_PROMPT = (count: number, multipleChoiceOnly: boolean) =>
  `You are a content digest expert and quiz generator.

Given a piece of text, extract key info and generate recall questions in ONE pass.

Output a JSON object with these fields:
- "title": Short (max 60 chars), descriptive title
- "summary": 1-2 sentence key takeaways
- "keyConcepts": Array of 3-8 concepts, each 5-15 words
- "questions": Array of EXACTLY ${count} question objects

Each question object:
- "type": "multiple_choice" or "short_answer"
- "question": The question text
- "correctAnswer": The correct answer (string)
- "options": [4 strings] — ONLY for multiple_choice, include correctAnswer as one
- "explanation": Brief explanation

Rules:
- Questions test understanding, not trivia
- Wrong options must be plausible
- ${multipleChoiceOnly ? 'ALL questions must be "multiple_choice"' : 'Mix types (at least 1 of each)'}
- Output valid JSON only, no markdown formatting`;

export async function generateContent(
  client: DeepseekClient,
  content: string,
  count: number = 6,
  multipleChoiceOnly: boolean = false,
): Promise<GenerateResult> {
  const response = await client.chat(
    [{ role: 'user', content }],
    {
      system: GENERATE_SYSTEM_PROMPT(count, multipleChoiceOnly),
      temperature: 0.3,
      maxTokens: 2048,
    },
  );

  const cleaned = response
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  if (!parsed.title || !Array.isArray(parsed.keyConcepts) || !Array.isArray(parsed.questions)) {
    throw new Error('Invalid response format: missing title, keyConcepts, or questions');
  }

  // Validate questions
  if (multipleChoiceOnly) {
    const filtered = parsed.questions.filter((q: any) => q.type === 'multiple_choice');
    if (filtered.length === 0) {
      throw new Error('No valid multiple choice questions generated — LLM returned only short_answer');
    }
    parsed.questions = filtered;
  }

  for (const q of parsed.questions) {
    if (!q.type || !q.question || !q.correctAnswer) {
      throw new Error('Invalid question: missing required fields');
    }
    if (q.type === 'multiple_choice' && (!q.options || q.options.length !== 4)) {
      throw new Error('Multiple choice question must have exactly 4 options');
    }
  }

  return {
    digest: {
      title: parsed.title,
      summary: parsed.summary || '',
      keyConcepts: parsed.keyConcepts.slice(0, 8),
    },
    questions: parsed.questions,
  };
}
