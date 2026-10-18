import 'server-only';

// Live catalog of the free chat models on OpenRouter. Every request the app sends goes to one
// of these models, so the API key is never spent on paid models.
// https://openrouter.ai/docs/api-reference/list-available-models

const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';
const CATALOG_TTL_MS = 60 * 60 * 1000;
const CATALOG_FETCH_TIMEOUT_MS = 10_000;
const CATALOG_RETRY_AFTER_FAILURE_MS = 60 * 1000;
const UNAVAILABLE_MODEL_TTL_MS = 60 * 60 * 1000;
// Free endpoints fail often (rate limits, gated models), so each request gets a few to try
const MAX_MODEL_ATTEMPTS = 5;
// OpenRouter rejects a "models" fallback array longer than this
const OPENROUTER_MAX_FALLBACK_MODELS = 3;

export interface ModelOption {
  id: string;
  name: string;
  provider: string;
  supportsVision: boolean;
}

/**
 * "Auto" is the app's own router, not OpenRouter's: openrouter/auto picks paid models and
 * can't be limited to free ones. This id never reaches OpenRouter; requests that use it go
 * to the best-ranked free models instead.
 */
export const DEFAULT_MODEL_ID = 'auto';

const AUTO_MODEL: ModelOption = {
  id: DEFAULT_MODEL_ID,
  name: 'Auto (Best Free)',
  provider: 'Free models',
  supportsVision: true,
};

// Used only while the catalog can't be loaded. Free models get retired, so the live list wins.
const FALLBACK_FREE_MODEL_IDS = [
  'nvidia/nemotron-3.5-super-vl:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];
const FALLBACK_FREE_VISION_MODEL_IDS = ['nvidia/nemotron-3.5-super-vl:free'];

// Moderation classifiers are listed as free chat models but cannot hold a conversation.
// The openrouter/* routers are excluded too: openrouter/auto bills paid models, and
// openrouter/free can route to a safety classifier that answers "User Safety: safe".
const NON_CHAT_MODEL_PATTERN = /(safety|guard|moderation)/i;
// Free Thinking Machines models answer 403 "only available on agentic harnesses" to web apps
const GATED_MODEL_PATTERN = /^thinkingmachines\//;
const FREE_MODEL_ID_PATTERN = /^[\w.-]+\/[\w.:-]+:free$/;

interface OpenRouterModel {
  id: string;
  name?: string;
  created?: number;
  expiration_date?: string | null;
  pricing?: { prompt?: string; completion?: string };
  architecture?: { input_modalities?: string[]; output_modalities?: string[] };
  benchmarks?: { artificial_analysis?: { intelligence_index?: number | null } | null } | null;
}

interface CatalogModel extends ModelOption {
  created: number;
  intelligence: number | null;
}

let cachedCatalog: { models: CatalogModel[]; fetchedAt: number } | null = null;
let catalogRequest: Promise<CatalogModel[]> | null = null;
let lastCatalogFailureAt = 0;
// Models that refused this key (e.g. gated to "agentic harnesses"); Auto skips them for a while
const unavailableModels = new Map<string, number>();

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
    !NON_CHAT_MODEL_PATTERN.test(model.id) &&
    !GATED_MODEL_PATTERN.test(model.id)
  );
}

function toCatalogModel(model: OpenRouterModel): CatalogModel {
  // OpenRouter names look like "NVIDIA: Nemotron 3.5 Super VL (free)"
  const rawName = (model.name || model.id).replace(/\s*\(free\)\s*$/i, '').trim();
  const separator = rawName.indexOf(': ');
  const provider = separator > 0 ? rawName.slice(0, separator) : model.id.split('/')[0];
  const name = separator > 0 ? rawName.slice(separator + 2) : rawName;
  const intelligence = model.benchmarks?.artificial_analysis?.intelligence_index;

  return {
    id: model.id,
    name,
    provider,
    supportsVision: model.architecture?.input_modalities?.includes('image') ?? false,
    created: model.created ?? 0,
    intelligence: typeof intelligence === 'number' ? intelligence : null,
  };
}

async function getFreeModels(): Promise<CatalogModel[]> {
  if (cachedCatalog && Date.now() - cachedCatalog.fetchedAt < CATALOG_TTL_MS) {
    return cachedCatalog.models;
  }
  // After a failure, don't make every chat request wait on another 10s attempt
  if (Date.now() - lastCatalogFailureAt < CATALOG_RETRY_AFTER_FAILURE_MS) {
    return cachedCatalog?.models ?? [];
  }

  // Concurrent requests share one fetch of the (large) catalog
  catalogRequest ??= fetchCatalog().finally(() => {
    catalogRequest = null;
  });
  return catalogRequest;
}

async function fetchCatalog(): Promise<CatalogModel[]> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL, {
      signal: AbortSignal.timeout(CATALOG_FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const { data } = (await response.json()) as { data?: OpenRouterModel[] };
    const models = (data ?? [])
      .filter(isFreeChatModel)
      .sort((a, b) => (b.created ?? 0) - (a.created ?? 0))
      .map(toCatalogModel);

    cachedCatalog = { models, fetchedAt: Date.now() };
    return models;
  } catch (error) {
    console.error('[ByteReaper] Could not load the OpenRouter model catalog:', error);
    lastCatalogFailureAt = Date.now();
    // Serve the last good list if there is one
    return cachedCatalog?.models ?? [];
  }
}

/** The picker list: Auto first, then every free model, newest first. */
export async function getModelCatalog(): Promise<ModelOption[]> {
  const freeModels = await getFreeModels();
  return [
    AUTO_MODEL,
    ...freeModels.map(({ id, name, provider, supportsVision }) => ({ id, name, provider, supportsVision })),
  ];
}

export const FREE_DAILY_LIMIT_MESSAGE =
  "Today's free AI quota is used up. It resets at midnight UTC, so please try again later.";

/** OpenRouter's account-wide daily cap on free-model requests; every free model is blocked once hit. */
export function isFreeDailyLimitError(status: number, body: string): boolean {
  return status === 429 && body.includes('free-models-per-day');
}

/** A user-facing message for a failed OpenRouter response. */
export async function readOpenRouterError(response: Response): Promise<string> {
  const body = await response.text().catch(() => '');
  if (isFreeDailyLimitError(response.status, body)) return FREE_DAILY_LIMIT_MESSAGE;
  try {
    return JSON.parse(body).error?.message || `API error: ${response.status}`;
  } catch {
    return `API error: ${response.status}`;
  }
}

export function markModelUnavailable(modelId: string): void {
  unavailableModels.set(modelId, Date.now());
}

function isTemporarilyUnavailable(modelId: string): boolean {
  const markedAt = unavailableModels.get(modelId);
  if (markedAt === undefined) return false;
  if (Date.now() - markedAt < UNAVAILABLE_MODEL_TTL_MS) return true;
  unavailableModels.delete(modelId);
  return false;
}

// Strongest first by OpenRouter's Artificial Analysis score; unscored models follow, newest first
function rankForAuto(models: CatalogModel[]): CatalogModel[] {
  return [...models].sort((a, b) => {
    if (a.intelligence !== null && b.intelligence !== null) return b.intelligence - a.intelligence;
    if (a.intelligence !== null) return -1;
    if (b.intelligence !== null) return 1;
    return b.created - a.created;
  });
}

/**
 * The free model ids to try, in order, for one request. The user's own pick goes first (when it
 * can handle the request); the rest are the best-ranked free models, so a failing or gated model
 * falls back to another free one instead of an error. Ids outside the free catalog (including
 * old saved values like "openrouter/auto" or "gemini-flash") are treated as Auto.
 */
export async function getModelIdsForRequest(
  requestedId?: string | null,
  { needsVision = false }: { needsVision?: boolean } = {}
): Promise<string[]> {
  const freeModels = await getFreeModels();
  const picked = freeModels.find((model) => model.id === requestedId);

  let pickedId: string | null = null;
  if (picked) {
    pickedId = (needsVision && !picked.supportsVision) || isTemporarilyUnavailable(picked.id) ? null : picked.id;
  } else if (requestedId && FREE_MODEL_ID_PATTERN.test(requestedId) && !needsVision) {
    // A ":free" id is free by definition, so honour it when the catalog is unavailable or just
    // refreshed instead of silently swapping the user's model
    pickedId = requestedId;
  }

  const ranked = rankForAuto(freeModels)
    .filter((model) => (!needsVision || model.supportsVision) && !isTemporarilyUnavailable(model.id))
    .map((model) => model.id);
  const fallbacks =
    ranked.length > 0 ? ranked : needsVision ? FALLBACK_FREE_VISION_MODEL_IDS : FALLBACK_FREE_MODEL_IDS;

  return [...new Set([...(pickedId ? [pickedId] : []), ...fallbacks])].slice(0, MAX_MODEL_ATTEMPTS);
}

/** Request-body fields that let OpenRouter fall through the given free models in order. */
export function openRouterModelFields(modelIds: string[]): { model: string; models: string[] } {
  return { model: modelIds[0], models: modelIds.slice(0, OPENROUTER_MAX_FALLBACK_MODELS) };
}
