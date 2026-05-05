import { describe, it, expect, vi, beforeEach } from 'vitest';
import { digestContent } from '../src/llm/digest';
import type { DeepseekClient } from '../src/api/deepseek';

function createMockClient(response: string): DeepseekClient {
  return {
    chat: vi.fn().mockResolvedValue(response),
  } as any;
}

describe('digestContent', () => {
  let client: DeepseekClient;

  beforeEach(() => {
    client = createMockClient(JSON.stringify({
      title: 'Test Title',
      keyConcepts: ['Concept one', 'Concept two', 'Concept three'],
    }));
  });

  it('should parse valid digest response', async () => {
    const result = await digestContent(client, 'Some text content');
    expect(result.title).toBe('Test Title');
    expect(result.keyConcepts).toHaveLength(3);
  });

  it('should limit key concepts to 8', async () => {
    const manyConcepts = Array.from({ length: 12 }, (_, i) => `Concept ${i + 1}`);
    client = createMockClient(JSON.stringify({ title: 'T', keyConcepts: manyConcepts }));
    const result = await digestContent(client, 'X');
    expect(result.keyConcepts).toHaveLength(8);
  });

  it('should strip markdown code fences from response', async () => {
    client = createMockClient('```json\n{"title": "T", "keyConcepts": ["A"]}\n```');
    const result = await digestContent(client, 'X');
    expect(result.title).toBe('T');
  });

  it('should throw on missing title', async () => {
    client = createMockClient(JSON.stringify({ keyConcepts: ['A'] }));
    await expect(digestContent(client, 'X')).rejects.toThrow('Invalid digest format');
  });

  it('should throw on invalid JSON', async () => {
    client = createMockClient('not json');
    await expect(digestContent(client, 'X')).rejects.toThrow('Failed to parse');
  });
});
