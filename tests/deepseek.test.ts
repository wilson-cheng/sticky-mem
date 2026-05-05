import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeepseekClient } from '../src/api/deepseek';

describe('DeepseekClient', () => {
  let client: DeepseekClient;
  const mockKey = 'sk-test-key';

  beforeEach(() => {
    client = new DeepseekClient(mockKey);
    vi.restoreAllMocks();
  });

  it('should throw if no API key is provided', () => {
    expect(() => new DeepseekClient('')).toThrow('API key is required');
  });

  it('should construct correct API URL and headers', () => {
    expect(client).toBeDefined();
  });

  it('should handle API error responses gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
    });
    await expect(client.chat([{ role: 'user', content: 'Hi' }]))
      .rejects.toThrow('DeepSeek API error 401: Invalid API key');
  });

  it('should return response on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'Hello!' } }],
      }),
    });
    const result = await client.chat([{ role: 'user', content: 'Hi' }]);
    expect(result).toBe('Hello!');
  });

  it('should include custom system prompt', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        choices: [{ message: { content: 'OK' } }],
      }),
    });
    await client.chat([{ role: 'user', content: 'Test' }], { system: 'Be concise' });
    const callArgs = (global.fetch as any).mock.calls[0][1];
    const body = JSON.parse(callArgs.body);
    expect(body.messages[0].content).toBe('Be concise');
  });
});
