// DuckDuckGo Search - Free, no API key needed

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface SearchResponse {
  results: SearchResult[];
  query: string;
  error?: string;
}

export async function searchWeb(query: string, maxResults: number = 5): Promise<SearchResponse> {
  try {
    // Use DuckDuckGo HTML lite version
    const encodedQuery = encodeURIComponent(query);
    const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    const html = await response.text();
    const results = parseSearchResults(html, maxResults);

    return { results, query };
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return {
      results: [],
      query,
      error: error instanceof Error ? error.message : 'Search failed',
    };
  }
}

function parseSearchResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];
  
  // Parse result links and snippets
  const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
  
  const links: { url: string; title: string }[] = [];
  const snippets: string[] = [];
  
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = decodeURIComponent(match[1].replace(/.*uddg=/, '').split('&')[0]) || match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (url && title && url.startsWith('http')) {
      links.push({ url, title });
    }
  }
  
  while ((match = snippetRegex.exec(html)) !== null) {
    snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
  }
  
  for (let i = 0; i < Math.min(links.length, maxResults); i++) {
    results.push({
      title: decodeHtmlEntities(links[i].title),
      url: links[i].url,
      snippet: decodeHtmlEntities(snippets[i] || ''),
    });
  }

  return results;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// DuckDuckGo Instant Answer API
export async function instantAnswer(query: string): Promise<{
  abstract: string;
  source: string;
  url: string;
} | null> {
  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1`;
    
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.Abstract) {
      return {
        abstract: data.Abstract,
        source: data.AbstractSource || 'DuckDuckGo',
        url: data.AbstractURL || '',
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}