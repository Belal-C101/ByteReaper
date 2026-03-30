import { searchWeb } from '@/lib/search/duckduckgo';
import { ChatMessage, FileAttachment, SearchResult } from '@/types/chat';
import { AI_MODELS, ModelKey, DEFAULT_MODEL } from './gemini';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYSTEM_PROMPT = `You are ByteReaper, an expert AI developer assistant. You help developers with:

1. **Code Analysis**: Review code for bugs, security issues, performance problems, and best practices
2. **Code Explanation**: Explain how code works in clear, simple terms
3. **Code Generation**: Write clean, efficient code with proper error handling
4. **Debugging Help**: Help identify and fix bugs in code
5. **Architecture Advice**: Suggest better design patterns and architectures
6. **Web Search**: Search the web for documentation, tutorials, and solutions
7. **GitHub Analysis**: Analyze public GitHub repositories

When analyzing code:
- Be specific about line numbers and exact issues
- Explain WHY something is a problem
- Provide concrete fixes with code examples
- Rate severity: critical, high, medium, low

When searching the web:
- Summarize key findings
- Include relevant links
- Focus on authoritative sources

Format your responses with markdown for better readability.
Use code blocks with language identifiers for code snippets.
Be concise but thorough.`;

export interface AgentResponse {
  content: string;
  searchResults?: SearchResult[];
  toolUsed?: string;
}

async function callOpenRouter(
  messages: { role: string; content: string }[], 
  modelKey: ModelKey = DEFAULT_MODEL,
  stream = false
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const model = AI_MODELS[modelKey];

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
      messages,
      temperature: 0.7,
      max_tokens: 4096,
      stream,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API error: ${response.status}`);
  }

  return response;
}

export async function processAgentMessage(
  userMessage: string,
  attachments: FileAttachment[] = [],
  conversationHistory: ChatMessage[] = [],
  modelKey: ModelKey = DEFAULT_MODEL
): Promise<AgentResponse> {
  // Detect if user wants to search the web
  const searchIntent = detectSearchIntent(userMessage);
  let searchResults: SearchResult[] | undefined;
  let searchContext = '';

  if (searchIntent) {
    const searchResponse = await searchWeb(searchIntent, 5);
    if (searchResponse.results.length > 0) {
      searchResults = searchResponse.results;
      searchContext = `\n\nWeb search results for "${searchIntent}":\n${
        searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n')
      }\n\nUse these search results to help answer the user's question.`;
    }
  }

  // Build conversation context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  // Build attachment context
  let attachmentContext = '';
  if (attachments.length > 0) {
    attachmentContext = '\n\nAttached files:\n' + attachments.map(a => {
      return `**${a.name}** (${a.type}):\n\`\`\`\n${a.content?.slice(0, 10000) || '[Binary file]'}\n\`\`\``;
    }).join('\n\n');
  }

  const userContent = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n${searchContext}\n\nUser: ${userMessage}`;

  try {
    const response = await callOpenRouter([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ], modelKey);

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    return {
      content,
      searchResults,
      toolUsed: searchResults ? 'search' : undefined,
    };
  } catch (error: any) {
    console.error('Agent error:', error);
    throw new Error(`Failed to process message: ${error.message}`);
  }
}

function detectSearchIntent(message: string): string | null {
  const searchPatterns = [
    /search(?:\s+(?:for|the\s+web|online))?\s+(?:for\s+)?["""]?(.+?)["""]?$/i,
    /(?:look\s+up|find\s+(?:info|information)\s+(?:on|about))\s+(.+)/i,
    /what\s+(?:is|are)\s+(?:the\s+)?(?:latest|newest|current)\s+(.+)/i,
    /how\s+(?:do\s+I|to)\s+(.+?)\s+(?:in\s+\d{4}|latest|now)/i,
  ];

  for (const pattern of searchPatterns) {
    const match = message.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  const searchKeywords = ['search', 'look up', 'find online', 'google', 'latest', 'news about'];
  const lowerMessage = message.toLowerCase();
  
  for (const keyword of searchKeywords) {
    if (lowerMessage.includes(keyword)) {
      const idx = lowerMessage.indexOf(keyword);
      const query = message.slice(idx + keyword.length).trim();
      if (query.length > 3) {
        return query;
      }
    }
  }

  return null;
}

// Streaming version for real-time responses (OpenRouter)
export async function* streamAgentMessage(
  userMessage: string,
  attachments: FileAttachment[] = [],
  conversationHistory: ChatMessage[] = [],
  modelKey: ModelKey = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    yield "Error: OPENROUTER_API_KEY not configured. Please check your .env.local file.";
    return;
  }

  const model = AI_MODELS[modelKey];
  if (!model) {
    yield `Error: Unknown model "${modelKey}". Using default model.`;
    return;
  }

  console.log(`[ByteReaper] Using model: ${model.id}`);

  // Build context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  let attachmentContext = '';
  if (attachments.length > 0) {
    attachmentContext = '\n\nAttached files:\n' + attachments.map(a => {
      return `**${a.name}** (${a.type}):\n\`\`\`\n${a.content?.slice(0, 10000) || '[Binary file]'}\n\`\`\``;
    }).join('\n\n');
  }

  const userContent = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n\nUser: ${userMessage}`;

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[ByteReaper] API Error ${response.status}:`, errorBody);
      yield `Error: API returned ${response.status}. ${errorBody.includes('model') ? 'Model may not be available.' : 'Please try again.'}`;
      return;
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      yield "Error: No response body received from API.";
      return;
    }

    let hasContent = false;

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
              hasContent = true;
              yield content;
            }
            // Check for errors in the response
            if (parsed.error) {
              console.error('[ByteReaper] Stream error:', parsed.error);
              yield `\n\nError: ${parsed.error.message || 'Unknown error'}`;
            }
          } catch {
            // Skip parse errors for incomplete JSON chunks
          }
        }
      }
    }

    if (!hasContent) {
      yield "I apologize, but I couldn't generate a response. Please try again or select a different model.";
    }
  } catch (error: any) {
    console.error('[ByteReaper] Stream error:', error);
    yield `Error: ${error.message || 'Failed to connect to AI service'}`;
  }
}