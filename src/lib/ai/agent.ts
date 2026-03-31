import 'server-only';

import mammoth from 'mammoth';
import { searchWeb } from '@/lib/search/duckduckgo';
import { ChatMessage, FileAttachment, SearchResult } from '@/types/chat';
import { AI_MODELS, ModelKey, DEFAULT_MODEL } from './gemini';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Feature Flags ───────────────────────────────────────

export interface ChatFeatures {
  webSearch?: boolean;
  thinking?: boolean;
  studyMode?: boolean;
}

// ─── System Prompts ──────────────────────────────────────

const SYSTEM_PROMPT = `You are ByteReaper, an expert AI developer assistant. You are highly intelligent, insightful, and thorough. You provide premium-quality responses that impress developers.

## Core Capabilities
1. **Code Analysis**: Review code for bugs, security issues, performance problems, and best practices. Be extremely specific about issues and fixes.
2. **Code Explanation**: Explain how code works in clear, layered terms — first a summary, then deeper details.
3. **Code Generation**: Write clean, efficient, production-ready code with proper error handling, types, and documentation.
4. **Debugging Help**: Systematically identify root causes (not just symptoms) and provide concrete fixes with code examples.
5. **Architecture Advice**: Suggest proven design patterns, explain trade-offs, and provide migration paths.
6. **Web Search Integration**: When search results are provided, synthesize key findings with source links. Focus on authoritative and recent sources.
7. **File Analysis**: When files are attached, analyze them thoroughly — understand their purpose, identify issues, and provide actionable feedback.

## Response Guidelines
- Be **thorough but structured** — use headings, bullet points, and numbered lists.
- Always explain **WHY** something is a problem or a good practice, not just what to do.
- Provide **concrete code examples** for every suggestion.
- Use **markdown formatting** with language-specific code blocks for readability.
- Rate severity of issues: critical, high, medium, low.
- When analyzing files, reference the **filename and relevant sections**.
- For images: describe what you see in the image and analyze its contents visually.
- For Word documents (DOCX/DOC): read and analyze the extracted text content provided.
- For HTML files: analyze structure, accessibility, SEO, and best practices.
- For PDFs and documents: summarize content and extract key points from the provided text.
- **IMPORTANT**: Always analyze the ACTUAL content provided in the file attachments. Do NOT make assumptions or search the web for information unless the user explicitly asks.
- Be concise on simple questions, thorough on complex ones. Match your response length to the question complexity.
- Use analogies and examples to explain complex concepts when appropriate.`;

const THINKING_PROMPT = `\n\nIMPORTANT: Before answering, think step-by-step internally. Break the problem into parts, consider edge cases, evaluate alternatives, then provide a comprehensive, well-reasoned answer. Show your reasoning chain where it helps the user understand.`;

const STUDY_MODE_PROMPT = `You are ByteReaper in **Study & Learning Mode**. You are an exceptional tutor who makes complex topics accessible and memorable.

## Study Mode Behavior
1. **Summarization**: When given content (files, text, topics), create clear, structured summaries with key takeaways highlighted.
2. **Quiz Generation**: Generate thoughtful quiz questions that test understanding at multiple levels:
   - 🟢 Basic recall questions
   - 🟡 Application questions (apply the concept)
   - 🔴 Analysis questions (compare, evaluate, synthesize)
   Format quizzes as:
   **Q1 (🟢 Easy):** [question]
   <details><summary>💡 Answer</summary>[detailed answer with explanation]</details>
3. **Explain Like I'm 5 (ELI5)**: When asked, explain concepts using simple analogies and everyday language.
4. **Socratic Method**: When helping with understanding, ask guiding questions that lead the learner to discover answers.
5. **Flashcard Mode**: When requested, create key-value flashcard pairs for memorization.
6. **Concept Maps**: Describe relationships between concepts in a structured, hierarchical way.

## Study Response Format
- Start with a brief **📋 Overview** of the topic.
- Use **numbered sections** with clear headings.
- Highlight **key terms** in bold.
- End with **📝 Quick Check** — 2-3 questions to test understanding.
- Use encouraging language — learning should feel rewarding.

Always respond in an educational, structured, engaging way. Be thorough and smart, not superficial.`;

export interface AgentResponse {
  content: string;
  searchResults?: SearchResult[];
  toolUsed?: string;
}

export const STREAM_MODEL_META_PREFIX = '__BYTEREAPER_MODEL__:';

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
      max_tokens: 8192,
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
  modelKey: ModelKey = DEFAULT_MODEL,
  features: ChatFeatures = {}
): Promise<AgentResponse> {
  // Detect if user wants to search the web
  const searchIntent = features.webSearch ? userMessage : detectSearchIntent(userMessage);
  let searchResults: SearchResult[] | undefined;
  let searchContext = '';

  if (searchIntent) {
    const searchQuery = features.webSearch ? userMessage : searchIntent;
    const searchResponse = await searchWeb(searchQuery, 5);
    if (searchResponse.results.length > 0) {
      searchResults = searchResponse.results;
      searchContext = `\n\nWeb search results for "${searchQuery}":\n${
        searchResults.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n')
      }\n\nUse these search results to help answer the user's question. Cite sources where relevant.`;
    }
  }

  // Build conversation context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  // Build attachment context with proper async document parsing
  const attachmentContext = await buildAttachmentContextAsync(attachments);

  const userContentString = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n${searchContext}\n\nUser: ${userMessage}`;

  let finalUserContent: any = userContentString;
  const hasImages = attachments.some(a => {
    const ext = a.name.split('.').pop()?.toLowerCase() || '';
    return a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  });

  if (hasImages) {
    const contentArray: any[] = [{ type: 'text', text: userContentString }];
    for (const a of attachments) {
      const ext = a.name.split('.').pop()?.toLowerCase() || '';
      const isImage = a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      if (isImage && a.content?.startsWith('data:image/')) {
        contentArray.push({
          type: 'image_url',
          image_url: { url: a.content }
        });
      }
    }
    finalUserContent = contentArray;
  }

  // Build system prompt based on features
  const systemPrompt = buildSystemPrompt(features);

  // If using an image, we MUST use a vision-capable model
  let activeModelKey = modelKey;
  const selectedModel = AI_MODELS[modelKey];
  if (hasImages && !selectedModel?.supportsVision) {
    // Switch to a vision-capable model
    activeModelKey = 'gemini-flash';
    console.log(`[ByteReaper] Vision required: Switching from ${modelKey} to ${activeModelKey}`);
  }

  try {
    const response = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: finalUserContent },
    ], activeModelKey);

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

function buildSystemPrompt(features: ChatFeatures): string {
  if (features.studyMode) {
    return STUDY_MODE_PROMPT + (features.thinking ? THINKING_PROMPT : '');
  }
  return SYSTEM_PROMPT + (features.thinking ? THINKING_PROMPT : '');
}

// Async function to build attachment context with proper document parsing
async function buildAttachmentContextAsync(attachments: FileAttachment[]): Promise<string> {
  if (attachments.length === 0) return '';

  const parts = await Promise.all(attachments.map(async (a) => {
    const fileExt = a.name.split('.').pop()?.toLowerCase() || '';
    const isImage = a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
    const isHTML = fileExt === 'html' || fileExt === 'htm' || a.type === 'text/html';
    const isPDF = fileExt === 'pdf' || a.type === 'application/pdf';
    const isDocx = fileExt === 'docx' || a.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = fileExt === 'doc' || a.type === 'application/msword';
    const isCode = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'json', 'md', 'yaml', 'yml', 'sql', 'sh', 'bash', 'go', 'rs', 'rb', 'php'].includes(fileExt);

    let contentBlock = '';
    const sizeKB = Math.round(a.size / 1024);

    if (isImage) {
      // For multimodal models, the actual image is attached separately.
      contentBlock = `[Image file attached: ${a.name}, Type: ${a.type}, Size: ${sizeKB}KB]\nPlease analyze this image visually.`;
    } else if (isDocx) {
      // Extract text from DOCX using mammoth
      const textContent = await extractDocxText(a.content || '');
      contentBlock = `[Word Document: ${a.name}, Size: ${sizeKB}KB]\nDocument content:\n\`\`\`\n${textContent.slice(0, 15000) || '[Could not extract text from document]'}\n\`\`\``;
    } else if (isDoc) {
      // Old DOC format - try basic extraction
      const textContent = a.content?.startsWith('data:') ? extractTextFromBinary(a.content) : (a.content || '');
      contentBlock = `[Word Document (Legacy): ${a.name}, Size: ${sizeKB}KB]\nExtracted content:\n\`\`\`\n${textContent.slice(0, 15000) || '[Legacy DOC format - limited text extraction]'}\n\`\`\``;
    } else if (isPDF) {
      const textContent = a.content?.startsWith('data:') ? extractTextFromBase64(a.content) : (a.content || '');
      contentBlock = `[PDF Document: ${a.name}, Size: ${sizeKB}KB]\nExtracted content:\n\`\`\`\n${textContent.slice(0, 15000) || '[Could not extract text — PDF may contain only images]'}\n\`\`\``;
    } else if (isHTML) {
      const htmlContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `[HTML File: ${a.name}, Size: ${sizeKB}KB]\nAnalyze this HTML for structure, accessibility, SEO, and best practices:\n\`\`\`html\n${htmlContent.slice(0, 15000)}\n\`\`\``;
    } else if (isCode) {
      const codeContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `[Code File: ${a.name}, Size: ${sizeKB}KB]\n\`\`\`${fileExt}\n${codeContent.slice(0, 15000) || '[No content]'}\n\`\`\``;
    } else {
      // Generic text file
      const textContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `**${a.name}** (${a.type}, ${sizeKB}KB):\n\`\`\`\n${textContent.slice(0, 15000) || '[Binary file — content not readable as text]'}\n\`\`\``;
    }

    return contentBlock;
  }));

  return '\n\n📎 **Attached files:**\n' + parts.join('\n\n');
}

// Synchronous version for backward compatibility (for non-async contexts)
function buildAttachmentContext(attachments: FileAttachment[]): string {
  if (attachments.length === 0) return '';

  const parts = attachments.map(a => {
    const fileExt = a.name.split('.').pop()?.toLowerCase() || '';
    const isImage = a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
    const isHTML = fileExt === 'html' || fileExt === 'htm' || a.type === 'text/html';
    const isPDF = fileExt === 'pdf' || a.type === 'application/pdf';
    const isDocx = fileExt === 'docx' || a.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    const isDoc = fileExt === 'doc' || a.type === 'application/msword';
    const isCode = ['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'css', 'json', 'md', 'yaml', 'yml', 'sql', 'sh', 'bash', 'go', 'rs', 'rb', 'php'].includes(fileExt);

    let contentBlock = '';
    const sizeKB = Math.round(a.size / 1024);

    if (isImage) {
      contentBlock = `[Image file attached: ${a.name}, Type: ${a.type}, Size: ${sizeKB}KB]\nPlease analyze this image visually.`;
    } else if (isDocx || isDoc) {
      // For sync context, we'll use the pre-extracted content if available
      const textContent = a.content?.startsWith('data:') ? extractDocxTextSync(a.content) : (a.content || '');
      contentBlock = `[Word Document: ${a.name}, Size: ${sizeKB}KB]\nDocument content:\n\`\`\`\n${textContent.slice(0, 15000) || '[Document content - use async method for full extraction]'}\n\`\`\``;
    } else if (isPDF) {
      const textContent = a.content?.startsWith('data:') ? extractTextFromBase64(a.content) : (a.content || '');
      contentBlock = `[PDF Document: ${a.name}, Size: ${sizeKB}KB]\nExtracted content:\n\`\`\`\n${textContent.slice(0, 15000) || '[Could not extract text — PDF may contain only images]'}\n\`\`\``;
    } else if (isHTML) {
      const htmlContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `[HTML File: ${a.name}, Size: ${sizeKB}KB]\nAnalyze this HTML for structure, accessibility, SEO, and best practices:\n\`\`\`html\n${htmlContent.slice(0, 15000)}\n\`\`\``;
    } else if (isCode) {
      const codeContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `[Code File: ${a.name}, Size: ${sizeKB}KB]\n\`\`\`${fileExt}\n${codeContent.slice(0, 15000) || '[No content]'}\n\`\`\``;
    } else {
      const textContent = a.content?.startsWith('data:') ? decodeBase64Content(a.content) : (a.content || '');
      contentBlock = `**${a.name}** (${a.type}, ${sizeKB}KB):\n\`\`\`\n${textContent.slice(0, 15000) || '[Binary file — content not readable as text]'}\n\`\`\``;
    }

    return contentBlock;
  });

  return '\n\n📎 **Attached files:**\n' + parts.join('\n\n');
}

// Extract text from DOCX file using mammoth
async function extractDocxText(dataUrl: string): Promise<string> {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return dataUrl || '';
    }
    
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return '';
    
    const buffer = Buffer.from(base64Part, 'base64');
    const result = await mammoth.extractRawText({ buffer });
    
    return result.value.trim() || '[Document appears to be empty]';
  } catch (error) {
    console.error('DOCX extraction error:', error);
    return '[Could not extract text from DOCX file]';
  }
}

// Synchronous DOCX text extraction (limited - extracts XML text content)
function extractDocxTextSync(dataUrl: string): string {
  try {
    if (!dataUrl || !dataUrl.startsWith('data:')) {
      return dataUrl || '';
    }
    
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return '';
    
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    
    // DOCX is a ZIP file with XML inside - try to find text content
    // Look for <w:t> tags which contain text in Word documents
    const textMatches = decoded.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
    if (textMatches) {
      const text = textMatches
        .map(match => match.replace(/<[^>]+>/g, ''))
        .join(' ')
        .trim();
      return text || '[Document appears to be empty]';
    }
    
    // Fallback: extract any readable ASCII strings
    const textParts = decoded.match(/[\x20-\x7E]{4,}/g);
    return textParts ? textParts.filter(p => !p.includes('xml') && !p.includes('Content')).join(' ').slice(0, 15000) : '';
  } catch {
    return '[Could not extract text from document]';
  }
}

// Extract text from binary files
function extractTextFromBinary(dataUrl: string): string {
  try {
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return '';
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    // Extract readable ASCII strings
    const textParts = decoded.match(/[\x20-\x7E]{4,}/g);
    return textParts ? textParts.join(' ').slice(0, 15000) : '';
  } catch {
    return '';
  }
}

function decodeBase64Content(dataUrl: string): string {
  try {
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return '';
    return Buffer.from(base64Part, 'base64').toString('utf-8');
  } catch {
    return '[Could not decode file content]';
  }
}

function extractTextFromBase64(dataUrl: string): string {
  try {
    const base64Part = dataUrl.split(',')[1];
    if (!base64Part) return '';
    const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
    // Basic text extraction from PDF — extract readable strings
    const textParts = decoded.match(/[\x20-\x7E\n\r\t]{4,}/g);
    return textParts ? textParts.join(' ').slice(0, 15000) : '';
  } catch {
    return '';
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
  modelKey: ModelKey = DEFAULT_MODEL,
  features: ChatFeatures = {}
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

  const hasImages = attachments.some(a => {
    const ext = a.name.split('.').pop()?.toLowerCase() || '';
    return a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  });

  // Determine the correct model to use
  let activeModelId = model.id;
  let activeModelKey = modelKey;
  
  // If using images and current model doesn't support vision, switch to gemini-flash
  if (hasImages && !model.supportsVision) {
    activeModelKey = 'gemini-flash';
    activeModelId = AI_MODELS['gemini-flash'].id;
    console.log(`[ByteReaper] Vision required: Switching to ${activeModelId}`);
  }

  // ── Search (if web search enabled or intent detected) ──
  let searchContext = '';
  const searchIntent = features.webSearch ? userMessage : detectSearchIntent(userMessage);
  if (searchIntent) {
    try {
      const searchQuery = features.webSearch ? userMessage : searchIntent;
      const searchResponse = await searchWeb(searchQuery, 5);
      if (searchResponse.results.length > 0) {
        searchContext = `\n\nWeb search results for "${searchQuery}":\n${
          searchResponse.results.map((r, i) => `${i + 1}. [${r.title}](${r.url})\n   ${r.snippet}`).join('\n\n')
        }\n\nUse these search results to help answer the user's question. Cite sources where relevant.`;
      }
    } catch (searchError) {
      console.error('[ByteReaper] Search error:', searchError);
    }
  }

  // Build context
  const historyContext = conversationHistory
    .slice(-10)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  // Use async document parsing for proper DOCX support
  const attachmentContext = await buildAttachmentContextAsync(attachments);

  const userContentString = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n${searchContext}\n\nUser: ${userMessage}`;

  let finalUserContent: any = userContentString;

  if (hasImages) {
    const contentArray: any[] = [{ type: 'text', text: userContentString }];
    for (const a of attachments) {
      const ext = a.name.split('.').pop()?.toLowerCase() || '';
      const isImage = a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
      if (isImage && a.content?.startsWith('data:image/')) {
        contentArray.push({
          type: 'image_url',
          image_url: { url: a.content }
        });
      }
    }
    finalUserContent = contentArray;
  }

  // Build system prompt based on features
  const systemPrompt = buildSystemPrompt(features);

  // List of fallback models for vision tasks
  const visionFallbacks = ['gemini-flash', 'gemini-flash-lite', 'auto'];
  let currentModelId = activeModelId;
  let attemptCount = 0;
  const maxAttempts = hasImages ? visionFallbacks.length : 1;

  while (attemptCount < maxAttempts) {
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
          model: currentModelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: finalUserContent },
          ],
          temperature: features.studyMode ? 0.5 : 0.7,
          max_tokens: 8192,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[ByteReaper] API Error ${response.status} with model ${currentModelId}:`, errorBody);
        
        // Try fallback model for vision tasks
        if (hasImages && attemptCount < maxAttempts - 1) {
          attemptCount++;
          const fallbackKey = visionFallbacks[attemptCount] as ModelKey;
          currentModelId = AI_MODELS[fallbackKey]?.id || currentModelId;
          console.log(`[ByteReaper] Retrying with fallback model: ${currentModelId}`);
          continue;
        }
        
        yield `Error: API returned ${response.status}. ${errorBody.includes('model') ? 'Model may not be available. Try selecting a different model.' : 'Please try again.'}`;
        return;
      }

      let resolvedModelId =
        response.headers.get('x-openrouter-model') ||
        response.headers.get('x-model') ||
        currentModelId;

      yield `${STREAM_MODEL_META_PREFIX}${resolvedModelId}`;

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
              if (typeof parsed.model === 'string' && parsed.model.trim() && parsed.model !== resolvedModelId) {
                resolvedModelId = parsed.model;
                yield `${STREAM_MODEL_META_PREFIX}${resolvedModelId}`;
              }

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
      
      // Success - exit the retry loop
      return;
      
    } catch (error: any) {
      console.error('[ByteReaper] Stream error:', error);
      
      // Try fallback model for vision tasks
      if (hasImages && attemptCount < maxAttempts - 1) {
        attemptCount++;
        const fallbackKey = visionFallbacks[attemptCount] as ModelKey;
        currentModelId = AI_MODELS[fallbackKey]?.id || currentModelId;
        console.log(`[ByteReaper] Retrying after error with fallback model: ${currentModelId}`);
        continue;
      }
      
      yield `Error: ${error.message || 'Failed to connect to AI service'}`;
      return;
    }
  }
}