// OpenRouter AI Client - Access to many free models
// https://openrouter.ai/docs

import 'server-only';

// OpenRouter AI Client - Access to many free models
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Available FREE models on OpenRouter - Verified March 2026
// All models have pricing: {"prompt":"0","completion":"0"}
export const AI_MODELS = {
  'auto': {
    id: 'openrouter/auto',
    name: 'Auto (Best Available)',
    description: '🎲 Auto-select',
    provider: 'OpenRouter',
    supportsVision: true,
  },
  'gemini-flash': {
    id: 'google/gemini-2.5-flash-preview:free',
    name: 'Gemini 2.5 Flash',
    description: '👁️ Vision + Fast',
    provider: 'Google',
    supportsVision: true,
  },
  'gemini-flash-lite': {
    id: 'google/gemini-2.5-flash-lite-preview:free',
    name: 'Gemini 2.5 Flash Lite',
    description: '⚡ Fast + Vision',
    provider: 'Google',
    supportsVision: true,
  },
  'nemotron': {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nemotron 3 Super 120B',
    description: '🚀 Powerful',
    provider: 'NVIDIA',
    supportsVision: false,
  },
  'qwen-plus': {
    id: 'qwen/qwen3.6-plus-preview:free',
    name: 'Qwen 3.6 Plus',
    description: '🧠 Reasoning',
    provider: 'Qwen',
    supportsVision: false,
  },
  'minimax': {
    id: 'minimax/minimax-m2.5:free',
    name: 'MiniMax M2.5',
    description: '⚡ Fast',
    provider: 'MiniMax',
    supportsVision: false,
  },
  'liquid': {
    id: 'liquid/lfm-2.5-1.2b-instruct:free',
    name: 'LFM 2.5 Instruct',
    description: '📝 Instruct',
    provider: 'LiquidAI',
    supportsVision: false,
  },
} as const;

export type ModelKey = keyof typeof AI_MODELS;
export const DEFAULT_MODEL: ModelKey = 'auto';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateAnalysis(prompt: string, modelKey: ModelKey = DEFAULT_MODEL): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Please add it to your .env.local file.');
  }

  const model = AI_MODELS[modelKey];

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ByteReaper',
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error('Invalid OpenRouter API key. Please check your configuration.');
      }
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content || content.trim().length === 0) {
      throw new Error('Empty response from AI model');
    }

    return content;
  } catch (error: any) {
    console.error('OpenRouter API error:', error);
    throw new Error(`AI analysis failed: ${error?.message || 'Unknown error'}`);
  }
}

// Chat completion with conversation history
export async function chatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
  modelKey: ModelKey = DEFAULT_MODEL
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  const model = AI_MODELS[modelKey];
  const allMessages: ChatMessage[] = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'ByteReaper',
      },
      body: JSON.stringify({
        model: model.id,
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Chat completion error:', error);
    throw new Error(`Chat failed: ${error?.message || 'Unknown error'}`);
  }
}

// Streaming chat completion with model selection
export async function* streamChatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
  modelKey: ModelKey = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  const model = AI_MODELS[modelKey];
  const allMessages: ChatMessage[] = systemPrompt 
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ByteReaper',
    },
    body: JSON.stringify({
      model: model.id,
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip parse errors
        }
      }
    }
  }
}