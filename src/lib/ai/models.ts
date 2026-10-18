import 'server-only';

// Live catalog of the free chat models on OpenRouter, newest first.
// https://openrouter.ai/docs/api-reference/list-available-models

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CATALOG_TTL_MS = 60 * 60 * 1000;
const CATALOG_FETCH_TIMEOUT_MS = 10_000;

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;
}

export const DEFAULT_MODEL_ID = 'openrouter/auto';

// The auto router stays pinned to the top of the list; it picks a concrete model per request.
// "openrouter/free" is deliberately left out: it can route to moderation classifiers that
// answer "User Safety: safe" instead of the question.
const ROUTER_MODELS: ModelOption[] = [
  { id: DEFAULT_MODEL_ID, name: 'Auto (Best Available)', provider: 'OpenRouter', supportsVision: true },
];

// Moderation classifiers are listed as free chat models but cannot hold a conversation.
const NON_CHAT_MODEL_PATTERN = /(safety|guard|moderation)/i;

interface OpenRouterModel {
  id: string;
  name?: string;
  created?: number;
  expiration_date?: string | null;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
}

const CATALOG_RETRY_AFTER_FAILURE_MS = 60 * 1000;

let cachedCatalog: { models: ModelOption[]; fetchedAt: number } | null = null;
let catalogRequest: Promise<ModelOption[]> | null = null;
let lastCatalogFailureAt = 0;

function isFreeChatModel(model: OpenRouterModel): boolean {
  const inputs = model.architecture?.input_modalities ?? [];
  const outputs = model.architecture?.output_modalities ?? [];
  const expired = !!model.expiration_date && Date.parse(model.expiration_date) <= Date.now();

  return (
    Number(model.pricing?.prompt) === 0 &&
    Number(model.pricing?.completion) === 0 &&
    inputs.includes('text') &&
    // Text-only output excludes music/image generators that happen to be free
    outputs.length === 1 && outputs[0] === 'text' &&
    !expired &&
    !model.id.startsWith('openrouter/') &&
    !NON_CHAT_MODEL_PATTERN.test(model.id)
  );
}

function toModelOption(model: OpenRouterModel): ModelOption {
  // OpenRouter names look like "NVIDIA: Nemotron 3.5 Super VL (free)"
  const rawName = (model.name || model.id).replace(/\s*\(free\)\s*$/i, '').trim();
  const separator = rawName.indexOf(': ');
  const provider = separator > 0 ? rawName.slice(0, separator) : model.id.split('/')[0];
  const name = separator > 0 ? rawName.slice(separator + 2) : rawName;

  return {
    id: model.id,
    name,
    provider,
    supportsVision: model.architecture?.input_modalities?.includes('image') ?? false,
  };
}

export async function getModelCatalog(): Promise<ModelOption[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CATALOG_TTL_MS) {
    return cachedCatalog.models;
  }
  // After a failure, don't make every chat request wait on another 10s attempt
  if (Date.now() - lastCatalogFailureAt < CATALOG_RETRY_AFTER_FAILURE_MS) {
    return cachedCatalog?.models ?? ROUTER_MODELS;
  }

  // Concurrent requests share one fetch of the (large) catalog
  catalogRequest ??= fetchCatalog().finally(() => {
    catalogRequest = null;
  });
  return catalogRequest;
}

async function fetchCatalog(): Promise<ModelOption[]> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const { data } = (await response.json()) as { data?: OpenRouterModel[] };
    const freeModels = (data ?? [])
      .filter(isFreeChatModel)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .map(toModelOption);

    const models = [...ROUTER_MODELS, ...freeModels];
    cachedCatalog = { models, fetchedAt: Date.now() };
    return models;
  } catch (error) {
    console.error('[ByteReaper] Could not load the OpenRouter model catalog:', error);
    lastCatalogFailureAt = Date.now();
    // Serve the last good list if there is one; the routers always work.
    return cachedCatalog?.models ?? ROUTER_MODELS;
  }
}

/**
 * Maps a client-supplied model id to a catalog entry. Anything outside the catalog
 * (including ids saved by older versions, like "gemini-flash") falls back to the default,
 * so callers can't spend the API key on arbitrary paid models.
 */
export async function resolveModel(requestedId?: string | null): Promise<ModelOption> {
  const catalog = await getModelCatalog();
  const match = catalog.find((model) => model.id === requestedId);
  if (match) return match;

  // A ":free" id is free by definition, so honour it when the catalog is unavailable or
  // just refreshed, instead of silently moving the user onto the paid router
  if (requestedId && /^[\w.-]+\/[\w.:-]+:free$/.test(requestedId)) {
    return { id: requestedId, name: requestedId, provider: requestedId.split('/')[0], supportsVision: false };
  }

  return catalog.find((model) => model.id === DEFAULT_MODEL_ID) ?? ROUTER_MODELS[0];
}

/** Vision-capable model ids to try, in order, when a request includes images. */
export async function getVisionModelIds(preferredId: string): Promise<string[]> {
  const catalog = await getModelCatalog();
  const preferred = catalog.find((model) => model.id === preferredId);
  const newestFreeVision = catalog
    .filter((model) => model.supportsVision && !model.id.startsWith('openrouter/'))
    .slice(0, 3)
    .map((model) => model.id);

  // The user's own pick goes first when it can see images (including "Auto (Best
  // Available)" if they chose it). Fallbacks are free vision models, with the paid router last.
  const ids = [
    ...(preferred?.supportsVision ? [preferred.id] : []),
    ...newestFreeVision,
    DEFAULT_MODEL_ID,
  ];
  return [...new Set(ids)];
}
