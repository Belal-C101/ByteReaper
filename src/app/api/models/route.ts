import { NextResponse } from 'next/server';
import { DEFAULT_MODEL_ID, getModelCatalog } from '@/lib/ai/models';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const models = await getModelCatalog();
  // Only Auto means the OpenRouter catalog was unreachable; don't cache that
  const isFallbackList = !models.some((model) => model.id !== DEFAULT_MODEL_ID);

  return NextResponse.json(
    { models, defaultModelId: DEFAULT_MODEL_ID },
    {
      headers: {
        // Let the CDN serve the list for an hour so new free models appear without a redeploy
        'Cache-Control': isFallbackList
          ? 'no-store'
          : 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    }
  );
}
