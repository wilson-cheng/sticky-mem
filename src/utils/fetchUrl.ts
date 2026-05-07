/**
 * Fetch URL content and convert to Markdown.
 * Uses Jina Reader API (free, no auth) as primary method.
 * Falls back to direct fetch + turndown if that fails.
 */

import TurndownService from 'turndown';

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

/**
 * Fetch a URL and return its content as Markdown.
 * Primary: Jina Reader API (https://r.jina.ai)
 * Fallback: direct CORS fetch + turndown HTML→Markdown conversion
 */
export async function fetchUrlAsMarkdown(url: string): Promise<string> {
  // Normalize URL
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;

  // Try Jina Reader API first
  try {
    const jinaUrl = `https://r.jina.ai/${encodeURI(normalizedUrl)}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain, text/markdown',
        'X-Return-Format': 'markdown',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const markdown = await response.text();
      if (markdown && markdown.length > 50) {
        return markdown;
      }
    }
  } catch (e) {
    console.warn('[fetchUrl] Jina Reader failed, trying fallback:', e);
  }

  // Fallback: try direct fetch (might fail due to CORS)
  try {
    const response = await fetch(normalizedUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (response.ok) {
      const html = await response.text();
      const markdown = turndownService.turndown(html);
      if (markdown && markdown.length > 20) {
        return markdown;
      }
    }
  } catch (e) {
    console.warn('[fetchUrl] Direct fetch failed:', e);
  }

  // If we got here, both methods failed
  throw new Error(
    `Could not fetch content from "${url}".\n\n` +
    'Make sure the URL is correct and publicly accessible.\n' +
    'You can paste the content manually using the Text tab instead.'
  );
}
