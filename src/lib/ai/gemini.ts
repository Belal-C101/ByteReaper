// OpenRouter AI Client - Access to many free models
// https://openrouter.ai/docs

import 'server-only';
import {
  DEFAULT_MODEL_ID,
  FREE_DAILY_LIMIT_MESSAGE,
  getModelIdsForRequest,
  openRouterModelFields,
  readOpenRouterError,
} from './models';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function generateAnalysis(prompt: string, modelId: string = DEFAULT_MODEL_ID): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Please add it to your .env.local file.');
  }

  // Free models only; OpenRouter moves on to the next one if a model is down or rate limited
  const modelIds = await getModelIdsForRequest(modelId);

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
        ...openRouterModelFields(modelIds),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 16384,
        // Reasoning models otherwise spend the whole token budget
        // thinking on large repo prompts and return truncated or empty JSON.
        reasoning: { effort: 'low' },
      }),
    });

    if (!response.ok) {
      const message = await readOpenRouterError(response);
      if (response.status === 429 && message !== FREE_DAILY_LIMIT_MESSAGE) {
        throw new Error('Rate limit exceeded. Please wait a moment and try again.');
      }
      if (response.status === 401) {
        throw new Error('Invalid OpenRouter API key. Please check your configuration.');
      }
      throw new Error(message);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content;

    if (choice?.finish_reason === 'length') {
      throw new Error(`AI response was cut off (token limit reached on ${data.model ?? modelIds[0]})`);
    }
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
  modelId: string = DEFAULT_MODEL_ID
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  // Free models only; OpenRouter moves on to the next one if a model is down or rate limited
  const modelIds = await getModelIdsForRequest(modelId);
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
        ...openRouterModelFields(modelIds),
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      throw new Error(await readOpenRouterError(response));
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
  modelId: string = DEFAULT_MODEL_ID
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured.');
  }

  // Free models only; OpenRouter moves on to the next one if a model is down or rate limited
  const modelIds = await getModelIdsForRequest(modelId);
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
      ...openRouterModelFields(modelIds),
      messages: allMessages,
      temperature: 0.7,
      max_tokens: 4096,
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(await readOpenRouterError(response));
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  // SSE events can be split across network chunks; keep the unfinished tail for the next read
  let pending = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    pending += decoder.decode(value, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop() ?? '';

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