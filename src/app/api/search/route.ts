import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, instantAnswer } from '@/lib/search/duckduckgo';

export async function POST(request: NextRequest) {
  try {
    const { query, maxResults = 5 } = await request.json();

    if (!query?.trim()) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const [searchResults, instant] = await Promise.all([
      searchWeb(query, maxResults),
      instantAnswer(query),
    ]);

    return NextResponse.json({
      success: true,
      results: searchResults.results,
      instant,
      query,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}