import type { DeepseekClient } from '../api/deepseek';
import type { QuestionType } from '../types';

export interface QuestionInput {
  type: QuestionType;
  question: string;
  correctAnswer: string;
  options?: string[];
  explanation?: string;
}

export interface QuestionsResponse {
  questions: QuestionInput[];
}

const QUESTIONS_SYSTEM_PROMPT = (count: number, multipleChoiceOnly: boolean) => `You are a quiz generator. Given key concepts and a topic, generate exactly ${count} questions.

Output a JSON object with a "questions" field containing an array of question objects. Example format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "What is ...?",
      "correctAnswer": "The correct answer",
      "options": ["Correct option", "Wrong 1", "Wrong 2", "Wrong 3"],
      "explanation": "Brief explanation"
    }
  ]
}

Each question object must have:
- "type": "multiple_choice" or "short_answer"
- "question": The question text
- "correctAnswer": The correct answer (string)
- "options": [4 strings] — ONLY for multiple_choice, include correctAnswer as one of them
- "explanation": Brief explanation of the correct answer

Rules:
- Generate EXACTLY ${count} questions
- ${multipleChoiceOnly ? 'ALL questions must be type "multiple_choice"' : 'Mix question types (at least 1 of each)'}
- Questions should test understanding, not trivia
- Wrong options should be plausible
- Output valid JSON only, no markdown`;

export async function generateQuestions(
  client: DeepseekClient,
  keyConcepts: string[],
  topic: string,
  count: number = 6,
  multipleChoiceOnly: boolean = false,
): Promise<QuestionInput[]> {
  const userMessage = `Topic: ${topic}\n\nKey Concepts:\n${keyConcepts.map((c, i) => `${i + 1}. ${c}`).join('\n')}`;

  const response = await client.chat(
    [{ role: 'user', content: userMessage }],
    {
      system: QUESTIONS_SYSTEM_PROMPT(count, multipleChoiceOnly),
      temperature: 0.5,
      maxTokens: 4096,
      responseFormat: 'json_object',
    },
  );

  const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  const questions: any[] = parsed.questions || (Array.isArray(parsed) ? parsed : []);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error('No questions found in response');
  }

  if (multipleChoiceOnly) {
    const filtered = questions.filter((q: any) => q.type === 'multiple_choice');
    if (filtered.length !== questions.length) {
      console.warn(
        `[generateQuestions] LLM returned ${questions.length - filtered.length} non-multiple-choice question(s) — filtered out (multipleChoiceOnly enabled)`,
      );
    }
    if (filtered.length === 0) {
      throw new Error('No valid multiple choice questions after filtering — LLM returned only short_answer questions');
    }
    questions.length = 0;
    questions.push(...filtered);
  }

  for (const q of questions) {
    if (!q.type || !q.question || !q.correctAnswer) {
      throw new Error('Invalid question: missing required fields');
    }
    if (q.type === 'multiple_choice' && (!q.options || q.options.length !== 4)) {
      throw new Error('Multiple choice question must have exactly 4 options');
    }
  }

  return questions;
}
