import { describe, it, expect, vi } from 'vitest';
import { generateContent } from '../src/llm/generate';
import type { DeepseekClient } from '../src/api/deepseek';

function createMockClient(response: string): DeepseekClient {
  return {
    chat: vi.fn().mockResolvedValue(response),
  } as any;
}

describe('generateContent (merged digest + questions)', () => {
  it('should return digest and questions from valid response', async () => {
    const client = createMockClient(JSON.stringify({
      title: 'Test Title',
      summary: 'A test summary.',
      keyConcepts: ['Concept one', 'Concept two'],
      questions: [
        {
          type: 'multiple_choice',
          question: 'What is X?',
          correctAnswer: 'A',
          options: ['A', 'B', 'C', 'D'],
          explanation: 'Because reasons',
        },
      ],
    }));
    const result = await generateContent(client, 'Some text', 1);
    expect(result.digest.title).toBe('Test Title');
    expect(result.digest.keyConcepts).toHaveLength(2);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].type).toBe('multiple_choice');
  });

  it('should strip markdown code fences', async () => {
    const client = createMockClient('```json\n{"title": "T", "keyConcepts": ["A"], "summary": "S", "questions": []}\n```');
    const result = await generateContent(client, 'X', 1);
    expect(result.digest.title).toBe('T');
  });

  it('should limit key concepts to 8', async () => {
    const many = Array.from({ length: 12 }, (_, i) => `Concept ${i + 1}`);
    const client = createMockClient(JSON.stringify({
      title: 'T', summary: 'S', keyConcepts: many, questions: [],
    }));
    const result = await generateContent(client, 'X', 1);
    expect(result.digest.keyConcepts).toHaveLength(8);
  });

  it('should filter non-multiple-choice when multipleChoiceOnly', async () => {
    const items = [
      { type: 'multiple_choice', question: 'Q1', correctAnswer: 'A', options: ['A', 'B', 'C', 'D'] },
      { type: 'short_answer', question: 'Q2', correctAnswer: 'B' },
    ];
    const client = createMockClient(JSON.stringify({
      title: 'T', summary: 'S', keyConcepts: ['C'], questions: items,
    }));
    const result = await generateContent(client, 'X', 2, true);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].type).toBe('multiple_choice');
  });

  it('should throw if no multiple_choice remains after filtering', async () => {
    const client = createMockClient(JSON.stringify({
      title: 'T', summary: 'S', keyConcepts: ['C'],
      questions: [{ type: 'short_answer', question: 'Q', correctAnswer: 'A' }],
    }));
    await expect(generateContent(client, 'X', 1, true)).rejects.toThrow(
      'No valid multiple choice questions',
    );
  });

  it('should throw on invalid JSON', async () => {
    const client = createMockClient('not json');
    await expect(generateContent(client, 'X', 1)).rejects.toThrow('Failed to parse');
  });

  it('should throw on malformed question', async () => {
    const client = createMockClient(JSON.stringify({
      title: 'T', summary: 'S', keyConcepts: ['C'],
      questions: [{ type: 'multiple_choice' }],
    }));
    await expect(generateContent(client, 'X', 1)).rejects.toThrow('missing required fields');
  });

  it('should throw on missing required fields at top level', async () => {
    const client = createMockClient(JSON.stringify({ title: 'T' }));
    await expect(generateContent(client, 'X', 1)).rejects.toThrow('Invalid response format');
  });
});
