import type { DeepseekClient } from '../api/deepseek';

export interface DigestResult {
  title: string;
  keyConcepts: string[];
}

const DIGEST_SYSTEM_PROMPT = `You are a content digest expert. Given a piece of text or URL content, extract the key concepts and generate a concise title.

Output a JSON object with:
- "title": A short (max 60 chars), descriptive title
- "keyConcepts": Array of 3-8 key concepts, each 5-15 words

Rules:
- Title must be specific, not generic
- Key concepts should be the most important takeaways
- Output valid JSON only, no markdown`;

export async function digestContent(
  client: DeepseekClient,
  content: string,
): Promise<DigestResult> {
  const response = await client.chat(
    [{ role: 'user', content }],
    { system: DIGEST_SYSTEM_PROMPT, temperature: 0.3, maxTokens: 2048 },
  );

  const cleaned = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Failed to parse LLM response as JSON');
  }

  if (!parsed.title || !Array.isArray(parsed.keyConcepts)) {
    throw new Error('Invalid digest format');
  }

  return {
    title: parsed.title,
    keyConcepts: parsed.keyConcepts.slice(0, 8),
  };
}
