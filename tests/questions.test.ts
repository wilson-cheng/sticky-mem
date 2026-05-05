import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateQuestions } from '../src/llm/questions';
import type { DeepseekClient } from '../src/api/deepseek';

function createMockClient(response: string): DeepseekClient {
  return {
    chat: vi.fn().mockResolvedValue(response),
  } as any;
}

describe('generateQuestions', () => {
  let client: DeepseekClient;

  beforeEach(() => {
    client = createMockClient(JSON.stringify([
      {
        type: 'multiple_choice',
        question: 'What is X?',
        correctAnswer: 'A',
        options: ['A', 'B', 'C', 'D'],
        explanation: 'Because reasons',
      },
      {
        type: 'short_answer',
        question: 'Define Y?',
        correctAnswer: 'Definition',
        explanation: 'Y is defined as...',
      },
    ]));
  });

  it('should return parsed questions array', async () => {
    const result = await generateQuestions(client, ['Concept A'], 'Topic');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('multiple_choice');
    expect(result[1].type).toBe('short_answer');
  });

  it('should throw if multiple_choice does not have 4 options', async () => {
    client = createMockClient(JSON.stringify([
      { type: 'multiple_choice', question: 'Q', correctAnswer: 'A', options: ['A', 'B'] },
    ]));
    await expect(generateQuestions(client, ['C'], 'T')).rejects.toThrow('exactly 4 options');
  });

  it('should throw if question missing required fields', async () => {
    client = createMockClient(JSON.stringify([
      { type: 'multiple_choice' },
    ]));
    await expect(generateQuestions(client, ['C'], 'T')).rejects.toThrow('missing required fields');
  });

  it('should handle empty concepts array', async () => {
    client = createMockClient(JSON.stringify([
      { type: 'short_answer', question: 'Q', correctAnswer: 'A' },
    ]));
    const result = await generateQuestions(client, [], 'T');
    expect(result).toHaveLength(1);
  });

  it('should strip markdown code fences', async () => {
    client = createMockClient('```json\n[{"type": "short_answer", "question": "Q", "correctAnswer": "A"}]\n```');
    const result = await generateQuestions(client, ['C'], 'T');
    expect(result).toHaveLength(1);
  });
});
