import * as cheerio from 'cheerio';

// Detect gitsite-based tutorial sites (liaoxuefeng, etc.)
function isGitsite(html: string): boolean {
  return html.includes('gs_load_chapter') || html.includes('window.gitsite');
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
};

// Extract structured outline from gitsite sidebar navigation
async function extractGitsiteOutline(html: string, baseUrl: string): Promise<{ title: string; text: string; lessonUrlMap: Record<string, string> }> {
  const $ = cheerio.load(html);
  const rawTitle = $('title').text();
  // Title format: "章节名 - 书名 - 廖雪峰的官方网站"
  const parts = rawTitle.split(' - ');
  const bookTitle = parts.length >= 2 ? parts.slice(1, -1).join(' - ').trim() : rawTitle.trim();

  const parsedUrl = new URL(baseUrl);
  const origin = parsedUrl.origin;
  const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
  // bookBasePath = e.g. "/books/python"
  const bookBasePath = '/' + pathParts.slice(0, 2).join('/');

  // Extract all book links with their text
  interface BookLink { path: string; text: string; depth: number; isChapter: boolean; }
  const seen = new Set<string>();
  const entries: BookLink[] = [];

  $('a').each((_i, el) => {
    let href = $(el).attr('href') || '';
    // Normalize: strip leading slashes duplicates (gitsite uses //books/...)
    href = href.replace(/^\/\//, '/');
    if (!href.startsWith(bookBasePath)) return;
    if (!href.endsWith('.html')) return;
    if (href.includes('#')) return;
    if (seen.has(href)) return;
    seen.add(href);

    // Clean text: remove whitespace/newlines, collapse spaces
    const rawText = $(el).text().replace(/\s+/g, ' ').trim();
    if (!rawText) return;

    // Strip leading number (e.g. "1.2.  Text" → "Text", "5.  基础" → "基础")
    const text = rawText.replace(/^[\d.]+\s+/, '').trim() || rawText;

    const depth = href.split('/').filter(Boolean).length;
    const isChapter = href.endsWith('/index.html');
    entries.push({ path: href, text, depth, isChapter });
  });

  // Keep DOM order (order links appear in the sidebar) — do NOT re-sort
  // The sidebar lists chapters in book order already

  if (entries.length === 0) {
    return { title: bookTitle, text: `课程标题: ${bookTitle}\n来源: ${baseUrl}\n（无法提取章节目录）`, lessonUrlMap: {} };
  }

  const minDepth = Math.min(...entries.map(e => e.depth));
  const lines = [
    `课程标题: ${bookTitle}`,
    `来源: ${baseUrl}`,
    `章节总数: ${entries.length}`,
    '',
    '课程章节目录（缩进代表层级）:',
    ...entries.map(e => {
      const indent = '  '.repeat(Math.max(0, e.depth - minDepth));
      const prefix = e.isChapter ? '▶ ' : '  ';
      return `${indent}${prefix}${e.text}`;
    }),
  ];

  // Build title→URL map for lesson content fetching
  const lessonUrlMap: Record<string, string> = {};
  for (const e of entries) {
    if (!e.isChapter) {
      lessonUrlMap[e.text] = origin + e.path;
    }
  }

  return { title: bookTitle, text: lines.join('\n'), lessonUrlMap };
}

/**
 * Fetch content of a single lesson page.
 * Returns cleaned markdown-like text of the main content area.
 * Designed for gitsite (liaoxuefeng) and generic tutorial sites.
 */
export async function fetchLessonContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return '';
    const html = await res.text();
    const $ = cheerio.load(html);

    // Remove noise
    $('script, style, nav, footer, header, aside, [role="navigation"], .ad, .sidebar, .toc, .navigation, .prev-next').remove();

    // Gitsite: main content is in specific containers
    const gitsiteSelectors = ['.x-wiki-content', '.wiki-content', '#x-content', '.gitbook-page-content'];
    for (const sel of gitsiteSelectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        return cleanText(el.text());
      }
    }

    // Generic content selectors
    const contentSelectors = [
      'article', 'main', '[class*="post-content"]', '[class*="entry-content"]',
      '[class*="article-content"]', '[class*="markdown"]', '[class*="prose"]',
      '.content', '#content', '#main',
    ];
    for (const sel of contentSelectors) {
      const el = $(sel);
      if (el.length && el.text().trim().length > 100) {
        return cleanText(el.text());
      }
    }
    return '';
  } catch {
    return '';
  }
}

function cleanText(text: string): string {
  return text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 8000); // cap at 8k chars per lesson
}

/**
 * Export lesson URL map for a gitsite URL (title → full URL mapping).
 * Returns empty object for non-gitsite URLs.
 */
export async function extractLessonUrlMap(url: string): Promise<Record<string, string>> {
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return {};
    const html = await res.text();
    if (!isGitsite(html)) return {};
    const result = await extractGitsiteOutline(html, url);
    return (result as any).lessonUrlMap ?? {};
  } catch {
    return {};
  }
}

export async function extractUrlText(url: string): Promise<{ title: string; text: string }> {
  const res = await fetch(url, {
    headers: FETCH_HEADERS,
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  const html = await res.text();

  // Special handling for gitsite-based tutorial sites
  if (isGitsite(html)) {
    return await extractGitsiteOutline(html, url);
  }

  const $ = cheerio.load(html);

  // Remove noise
  $('script, style, nav, footer, header, aside, [role="navigation"], .ad, .advertisement, .sidebar, .toc').remove();

  const title = $('title').text().trim() || $('h1').first().text().trim() || url;

  // Extended content selectors including common blog/tutorial patterns
  let text = '';
  const contentSelectors = [
    'article',
    '[class*="post-content"]', '[class*="entry-content"]', '[class*="article-content"]',
    '[class*="blog-content"]', '[class*="page-content"]', '[class*="main-content"]',
    '[class*="content-body"]', '[class*="markdown"]', '[class*="prose"]',
    'main', '.content', '#content', '#main', '.post', '.entry',
    'body'
  ];
  for (const sel of contentSelectors) {
    const el = $(sel);
    if (el.length && el.text().trim().length > 200) {
      text = el.text();
      break;
    }
  }

  // Normalize whitespace
  text = text
    .replace(/\t/g, ' ')
    .replace(/[ ]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!text || text.length < 100) {
    throw new Error('无法从该页面提取足够的文本内容。该页面可能使用了动态渲染（JavaScript SPA），建议尝试复制页面文本后使用「粘贴文本」方式导入。');
  }

  return { title, text };
}
