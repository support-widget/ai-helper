export interface LoadDocsContextOptions {
  /** Fetches an llms.txt file and follows its Markdown links (up to maxPages). */
  llmsTxtUrl?: string;
  /** Extra documentation URLs to fetch. */
  urls?: string[];
  /** Local directory containing .md, .mdx, or .txt files. Node-only. */
  directory?: string;
  /** Total pages fetched from llmsTxtUrl + urls. Defaults to 24. */
  maxPages?: number;
  /** Maximum files read from a directory. Defaults to 200. */
  maxFiles?: number;
  /** Truncate each source to this many characters. Defaults to 500,000. */
  maxCharsPerSource?: number;
  headers?: Record<string, string>;
  /** Injectable fetch for tests or authenticated docs. */
  fetchImpl?: typeof fetch;
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface DocsChunk {
  id: string;
  source: string;
  text: string;
}

export interface DocsSearchResult extends DocsChunk {
  score: number;
}

export interface DocsSearchOptions {
  maxChunks?: number;
}

export interface DocsContextOptions {
  maxChunks?: number;
  maxChars?: number;
}

export interface DocsContext {
  readonly chunkCount: number;
  readonly sourceCount: number;
  search(query: string, options?: DocsSearchOptions): DocsSearchResult[];
  /** Formats the top BM25 matches for injection into a system prompt. */
  getContext(query: string, options?: DocsContextOptions): string;
}

interface SourceDoc {
  source: string;
  text: string;
}

const STOPWORDS = new Set(
  'a an and are as at be been but by can could did do does for from had has have how i if in into is it its me my of on or our so than that the their them then there these they this to was we were what when where which who why will with you your'.split(
    ' ',
  ),
);

function tokenize(value: string): string[] {
  const matches = value.toLowerCase().match(/[a-z0-9][a-z0-9'_+-]*/g) ?? [];
  return matches.filter((term) => term.length > 1 && !STOPWORDS.has(term));
}

function cleanText(value: string): string {
  return value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&#x0*27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const point = Number.parseInt(code, 10);
      try {
        return String.fromCodePoint(point);
      } catch {
        return '';
      }
    });
}

function stripHtml(html: string): string {
  return decodeEntities(
    html
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(?:p|div|section|article|h[1-6]|li|tr|br)>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function looksLikeHtml(contentType: string, text: string): boolean {
  return (
    contentType.includes('text/html') ||
    /^\s*<!doctype html/i.test(text) ||
    /^\s*<html[\s>]/i.test(text)
  );
}

function titleFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const name = pathname.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : new URL(url).hostname;
  } catch {
    return url;
  }
}

async function fetchDoc(
  url: string,
  options: LoadDocsContextOptions,
  fetchImpl: typeof fetch,
): Promise<SourceDoc> {
  const response = await fetchImpl(url, {
    headers: { Accept: 'text/markdown, text/plain, text/html;q=0.9', ...options.headers },
    redirect: 'follow',
  });
  if (!response.ok) {
    throw new Error(`Could not fetch docs (${response.status}) from ${titleFromUrl(url)}`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  const raw = await response.text();
  const text = looksLikeHtml(contentType, raw) ? stripHtml(raw) : raw;
  return {
    source: url,
    text: cleanText(text).slice(0, options.maxCharsPerSource ?? 500_000),
  };
}

function markdownLinks(markdown: string, baseUrl: string): string[] {
  const links = new Set<string>();
  const pattern = /\[[^\]]*\]\(([^)\s]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(markdown)) !== null) {
    const href = match[1];
    if (!href) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') links.add(url.toString());
    } catch {
      // Ignore malformed links.
    }
  }
  return [...links];
}

async function loadDirectory(
  directory: string,
  options: LoadDocsContextOptions,
): Promise<SourceDoc[]> {
  const [{ readFile, readdir, stat }, path] = await Promise.all([
    import('node:fs/promises'),
    import('node:path'),
  ]);
  const root = path.resolve(directory);
  const maxFiles = options.maxFiles ?? 200;
  const maxChars = options.maxCharsPerSource ?? 500_000;
  const files: string[] = [];

  async function walk(current: string): Promise<void> {
    if (files.length >= maxFiles) return;
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= maxFiles) break;
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await walk(fullPath);
      else if (/\.(md|mdx|txt)$/i.test(entry.name)) files.push(fullPath);
    }
  }

  await walk(root);

  const docs: SourceDoc[] = [];
  for (const file of files) {
    const details = await stat(file);
    if (!details.isFile()) continue;
    const content = await readFile(file, 'utf8');
    docs.push({
      source: path.relative(root, file).replace(/\\/g, '/'),
      text: cleanText(content).slice(0, maxChars),
    });
  }
  return docs;
}

function chunkDoc(doc: SourceDoc, size: number, overlap: number, startId: number): DocsChunk[] {
  const chunks: DocsChunk[] = [];
  const text = doc.text.trim();
  if (!text) return chunks;
  let start = 0;
  let id = startId;

  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      const slice = text.slice(start, end);
      const boundary = Math.max(
        slice.lastIndexOf('\n\n'),
        slice.lastIndexOf('\n'),
        slice.lastIndexOf('. '),
        slice.lastIndexOf(' '),
      );
      if (boundary > size * 0.55) end = start + boundary;
    }
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 20) {
      chunks.push({ id: `chunk-${id}`, source: doc.source, text: chunk });
      id += 1;
    }
    if (end >= text.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

/**
 * Load Markdown/HTML docs and build a dependency-free BM25 index.
 * This is intentionally v1-friendly: no embeddings and no vector database.
 */
export async function loadDocsContext(options: LoadDocsContextOptions): Promise<DocsContext> {
  if (!options.llmsTxtUrl && !options.urls?.length && !options.directory) {
    throw new TypeError('loadDocsContext requires llmsTxtUrl, urls, or directory.');
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const selected: SourceDoc[] = [];
  const seen = new Set<string>();
  const maxPages = options.maxPages ?? 24;

  if (options.llmsTxtUrl) {
    const llms = await fetchDoc(options.llmsTxtUrl, options, fetchImpl);
    selected.push(llms);
    seen.add(options.llmsTxtUrl);
    const links = markdownLinks(llms.text, options.llmsTxtUrl);
    for (const link of links) {
      if (selected.length >= maxPages) break;
      if (seen.has(link)) continue;
      try {
        selected.push(await fetchDoc(link, options, fetchImpl));
        seen.add(link);
      } catch {
        // A broken docs link should not prevent the rest of the index loading.
      }
    }
  }

  if (options.urls) {
    for (const url of options.urls) {
      if (selected.length >= maxPages) break;
      if (seen.has(url)) continue;
      try {
        selected.push(await fetchDoc(url, options, fetchImpl));
        seen.add(url);
      } catch (error) {
        if (!options.llmsTxtUrl) throw error;
      }
    }
  }

  if (options.directory) {
    for (const doc of await loadDirectory(options.directory, options)) {
      if (!seen.has(doc.source)) {
        selected.push(doc);
        seen.add(doc.source);
      }
    }
  }

  const chunkSize = Math.max(options.chunkSize ?? 1200, 200);
  const overlap = Math.min(Math.max(options.chunkOverlap ?? 160, 0), chunkSize - 50);
  const chunks: DocsChunk[] = [];
  for (const doc of selected) {
    chunks.push(...chunkDoc(doc, chunkSize, overlap, chunks.length));
  }

  const tokenized = chunks.map((chunk) => tokenize(chunk.text));
  const lengths = tokenized.map((terms) => terms.length);
  const averageLength =
    lengths.length > 0 ? lengths.reduce((sum, value) => sum + value, 0) / lengths.length : 0;
  const documentFrequency = new Map<string, number>();
  const frequencies: Array<Map<string, number>> = tokenized.map((terms) => {
    const counts = new Map<string, number>();
    for (const term of terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
    for (const term of counts.keys()) {
      documentFrequency.set(term, (documentFrequency.get(term) ?? 0) + 1);
    }
    return counts;
  });

  const k1 = 1.5;
  const b = 0.75;
  const total = chunks.length;

  const search: DocsContext['search'] = (query, searchOptions) => {
    const queryTerms = [...new Set(tokenize(query))];
    if (queryTerms.length === 0 || total === 0) return [];
    const maxChunks = Math.max(searchOptions?.maxChunks ?? 4, 1);
    const results: DocsSearchResult[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const terms = frequencies[index];
      const length = lengths[index] ?? 0;
      if (!terms || length === 0) continue;
      let score = 0;
      for (const term of queryTerms) {
        const tf = terms.get(term);
        if (!tf) continue;
        const df = documentFrequency.get(term) ?? 0;
        const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
        score += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (length / averageLength))));
      }
      if (score > 0) {
        const chunk = chunks[index];
        if (chunk) results.push({ ...chunk, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, maxChunks);
  };

  return {
    chunkCount: chunks.length,
    sourceCount: selected.length,
    search,
    getContext(query, contextOptions) {
      const maxChars = contextOptions?.maxChars ?? 6000;
      const results = search(query, { maxChunks: contextOptions?.maxChunks ?? 4 });
      const sections: string[] = [];
      let used = 0;
      for (const result of results) {
        const remaining = maxChars - used;
        if (remaining < 80) break;
        const text =
          result.text.length > remaining ? `${result.text.slice(0, remaining).trim()}…` : result.text;
        const section = `Source: ${result.source}\n${text}`;
        sections.push(section);
        used += section.length;
      }
      return sections.join('\n\n---\n\n');
    },
  };
}
