/**
 * Fetch URL content and convert to Markdown.
 *
 * For browser (web app), CORS is the main challenge:
 * 1. Try Jina Reader API directly (works on native/mobile, may fail CORS on web)
 * 2. Try Jina Reader through allorigins CORS proxy (works on web)
 * 3. If all fail, throw a clear error
 */

type FetchFn = () => Promise<string>;

/**
 * Try Jina Reader API directly (no CORS proxy).
 * Works on native mobile; may fail in browser due to missing CORS headers.
 */
const tryJinaDirect: FetchFn = async (url: string) => {
  const jinaUrl = `https://r.jina.ai/${encodeURI(url)}`;
  const response = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/plain, text/markdown',
      'X-Return-Format': 'markdown',
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Jina returned HTTP ${response.status}`);
  const markdown = await response.text();
  if (!markdown || markdown.length < 50) throw new Error('Jina returned empty content');
  return markdown;
};

/**
 * Try Jina Reader through allorigins CORS proxy.
 * allorigins.win wraps the URL, adds CORS headers, and returns JSON.
 * Response: { contents: string, status: { ... } }
 */
const tryJinaViaProxy: FetchFn = async (url: string) => {
  const jinaUrl = `https://r.jina.ai/${encodeURI(url)}`;
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(jinaUrl)}`;
  const response = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`CORS proxy returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.contents || typeof data.contents !== 'string') {
    throw new Error('CORS proxy returned unexpected response');
  }
  return data.contents as string;
};

const tryDirectFetchViaProxy: FetchFn = async (url: string) => {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Direct proxy returned HTTP ${response.status}`);
  const data = await response.json();
  if (!data?.contents || typeof data.contents !== 'string') {
    throw new Error('Direct proxy returned unexpected response');
  }

  // Return raw content scraped by allorigins
  return data.contents as string;
};

/**
 * Fetch a URL and return its content as Markdown.
 * Uses multiple strategies to handle CORS restrictions in the browser.
 */
export async function fetchUrlAsMarkdown(url: string): Promise<string> {
  // Normalize URL
  const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`;

  const lastError: string[] = [];

  // Strategy 1: Jina Reader directly (fastest, works on native)
  try {
    return await tryJinaDirect(normalizedUrl);
  } catch (e: any) {
    lastError.push(`Jina direct: ${e.message || e}`);
  }

  // Strategy 2: Jina Reader through CORS proxy (works on web)
  try {
    return await tryJinaViaProxy(normalizedUrl);
  } catch (e: any) {
    lastError.push(`Jina via proxy: ${e.message || e}`);
  }

  // Strategy 3: Direct fetch through CORS proxy (last resort)
  try {
    return await tryDirectFetchViaProxy(normalizedUrl);
  } catch (e: any) {
    lastError.push(`Direct via proxy: ${e.message || e}`);
  }

  // All strategies failed — throw descriptive error
  throw new Error(
    `Could not fetch content from "${normalizedUrl}".\n\n` +
    `Reasons:\n${lastError.map((s) => `• ${s}`).join('\n')}\n\n` +
    'Try pasting the content manually using Paste Text instead.'
  );
}
