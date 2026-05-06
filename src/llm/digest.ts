import type { DeepseekClient } from '../api/deepseek';

export interface DigestResult {
  title: string;
  content: string;
  summary: string;
  keyConcepts: string[];
}

const DIGEST_SYSTEM_PROMPT = `You are a content digest expert. Given a piece of text, extract and organize it.

Output a JSON object with:
- "title": A short (max 60 chars), descriptive title
- "content": The original text preserved verbatim (copy it exactly as given, do not summarize or paraphrase the source)
- "summary": A concise 2-3 sentence summary of the key points
- "keyConcepts": Array of 3-8 key concepts, each 5-15 words

Rules:
- Title must be specific, not generic
- "content" must be the EXACT original text, unchanged
- Key concepts should be the most important takeaways
- Output valid JSON only, no markdown`;

export async function digestContent(
  client: DeepseekClient,
  content: string,
): Promise<DigestResult> {
  const response = await client.chat(
    [{ role: 'user', content }],
    { system: DIGEST_SYSTEM_PROMPT, temperature: 0.3, maxTokens: 4096 },
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
    content: parsed.content || content,
    summary: parsed.summary || '',
    keyConcepts: parsed.keyConcepts.slice(0, 8),
  };
}
