import 'server-only';

import mammoth from 'mammoth';
import { searchWeb } from '@/lib/search/duckduckgo';
import { ChatMessage, FileAttachment, SearchResult } from '@/types/chat';
import { DEFAULT_MODEL_ID, getVisionModelIds, resolveModel } from './models';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ─── Remote Attachments ──────────────────────────────────
// Binary attachments arrive as Cloudinary URLs instead of base64 so request bodies stay
// under the hosting platform's 4.5MB limit. They are rehydrated into data URLs here so the
// document parsers and vision payloads below work unchanged.

const MAX_ATTACHMENTS_PER_MESSAGE = 5;
const MAX_REMOTE_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const REMOTE_ATTACHMENT_TIMEOUT_MS = 20_000;

type HydratedAttachment = FileAttachment & { loadError?: string };

function isTrustedAttachmentUrl(rawUrl: string): boolean {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'res.cloudinary.com') return false;
    const cloudNames = [process.env.CLOUDINARY_CLOUD_NAME, process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME]
      .filter((name): name is string => !!name);
    return cloudNames.some((name) => url.pathname.startsWith(`/${name}/`));
  } catch {
    return false;
  }
}

// Reads the body incrementally so an oversized or chunked response is aborted at the
// limit instead of being buffered whole.
async function readBodyWithLimit(response: Response, maxBytes: number): Promise<Buffer> {
  if (Number(response.headers.get('content-length') || 0) > maxBytes) {
    throw new Error(`Attachment exceeds ${Math.round(maxBytes / 1024 / 1024)}MB`);
  }
  if (!response.body) throw new Error('Empty response body');

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error(`Attachment exceeds ${Math.round(maxBytes / 1024 / 1024)}MB`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function hydrateRemoteAttachment(attachment: FileAttachment, maxBytes: number): Promise<HydratedAttachment> {
  if (attachment.content || !attachment.cloudinaryUrl) return attachment;
  if (!isTrustedAttachmentUrl(attachment.cloudinaryUrl)) {
    console.warn(`[ByteReaper] Ignoring untrusted attachment URL for "${attachment.name}"`);
    return { ...attachment, loadError: 'untrusted file location' };
  }

  try {
    const response = await fetch(attachment.cloudinaryUrl, {
      signal: AbortSignal.timeout(REMOTE_ATTACHMENT_TIMEOUT_MS),
      redirect: 'error',
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const buffer = await readBodyWithLimit(response, maxBytes);
    const mimeType = attachment.type || response.headers.get('content-type') || 'application/octet-stream';
    return { ...attachment, content: `data:${mimeType};base64,${buffer.toString('base64')}` };
  } catch (error) {
    console.error(`[ByteReaper] Could not fetch attachment "${attachment.name}":`, error);
    return { ...attachment, loadError: error instanceof Error ? error.message : 'download failed' };
  }
}

// Sequential on purpose: keeps peak memory to one download plus the running total.
async function hydrateRemoteAttachments(attachments: FileAttachment[]): Promise<HydratedAttachment[]> {
  const hydrated: HydratedAttachment[] = [];
  let remainingBytes = MAX_TOTAL_ATTACHMENT_BYTES;

  for (const [index, attachment] of attachments.entries()) {
    if (index >= MAX_ATTACHMENTS_PER_MESSAGE) {
      hydrated.push({ ...attachment, content: undefined, loadError: `only the first ${MAX_ATTACHMENTS_PER_MESSAGE} files in a message are read` });
      continue;
    }
    const needsDownload = !attachment.content && !!attachment.cloudinaryUrl;
    if (needsDownload && remainingBytes <= 0) {
      hydrated.push({ ...attachment, loadError: `the ${MAX_TOTAL_ATTACHMENT_BYTES / 1024 / 1024}MB total size limit for one message was reached` });
      continue;
    }

    const result = await hydrateRemoteAttachment(attachment, Math.min(MAX_REMOTE_ATTACHMENT_BYTES, remainingBytes));
    if (result.content && result !== attachment) {
      // base64 inflates by 4/3; count the decoded size against the budget
      remainingBytes -= Math.floor((result.content.length - result.content.indexOf(',') - 1) * 0.75);
    }
    hydrated.push(result);
  }
  return hydrated;
}

function isImageAttachment(a: FileAttachment): boolean {
  const ext = a.name.split('.').pop()?.toLowerCase() || '';
  return a.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

// Only images whose bytes actually arrived can be sent to a vision model.
function hasLoadedImage(attachments: HydratedAttachment[]): boolean {
  return attachments.some((a) => isImageAttachment(a) && !!a.content?.startsWith('data:image/'));
}

// ─── Feature Flags ───────────────────────────────────────

export interface ChatFeatures {
  webSearch?: boolean;
  thinking?: boolean;
  studyMode?: boolean;
  summarize?: boolean;
  translate?: string; // target language, e.g. 'Arabic', 'Spanish'
  codeReview?: boolean;
  autoSearch?: boolean; // search the web on its own when a message looks like a lookup question
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

const SUMMARIZE_PROMPT = `\n\nIMPORTANT: You are in **Summarize Mode**. For every response:
- Provide a **TL;DR** (1-2 sentences) at the top
- Follow with **Key Points** as a bulleted list
- Keep language concise and scannable
- Highlight the most important information in **bold**
- If code is involved, show only the most critical snippets
- End with a brief **Bottom Line** statement`;

const TRANSLATE_PROMPT_PREFIX = `\n\nIMPORTANT: You are in **Translate Mode**. Translate your ENTIRE response into `;
const TRANSLATE_PROMPT_SUFFIX = `. Keep code blocks, variable names, and technical terms in English, but translate all explanatory text, comments, and descriptions. Maintain the same formatting and structure.`;

const CODE_REVIEW_PROMPT = `\n\nIMPORTANT: You are in **Expert Code Review Mode**. Analyze ALL code with extreme thoroughness:
1. **🔴 Critical Issues**: Security vulnerabilities, data loss risks, crashes
2. **🟡 Warnings**: Performance problems, memory leaks, race conditions
3. **🟢 Suggestions**: Best practices, readability, maintainability
4. **📊 Code Quality Score**: Rate the code 1-10 with justification
5. **✅ Refactored Version**: Provide improved code with inline comments explaining changes
6. Rate each issue severity and provide exact line references where possible.`;

export interface AgentResponse {
  content: string;
  searchResults?: SearchResult[];
  toolUsed?: string;
}

export const STREAM_MODEL_META_PREFIX = '__BYTEREAPER_MODEL__:';

async function callOpenRouter(
  messages: { role: string; content: string }[],
  modelId: string,
  stream = false
) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'ByteReaper',
    },
    body: JSON.stringify({
      model: modelId,
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
  modelId: string = DEFAULT_MODEL_ID,
  features: ChatFeatures = {}
): Promise<AgentResponse> {
  const hydratedAttachments = await hydrateRemoteAttachments(attachments);

  // Detect if user wants to search the web
  const searchIntent = resolveSearchQuery(userMessage, attachments.length > 0, features);
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
  const attachmentContext = await buildAttachmentContextAsync(hydratedAttachments);

  const userContentString = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n${searchContext}\n\nUser: ${userMessage}`;

  const hasImages = hasLoadedImage(hydratedAttachments);
  const finalUserContent: any = hasImages
    ? buildMultimodalContent(userContentString, hydratedAttachments)
    : userContentString;

  // Build system prompt based on features
  const systemPrompt = buildSystemPrompt(features);

  // If using an image, we MUST use a vision-capable model
  const selectedModel = await resolveModel(modelId);
  const activeModelId = hasImages
    ? (await getVisionModelIds(selectedModel.id))[0]
    : selectedModel.id;
  if (activeModelId !== selectedModel.id) {
    console.log(`[ByteReaper] Vision required: Switching from ${selectedModel.id} to ${activeModelId}`);
  }

  try {
    const response = await callOpenRouter([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: finalUserContent },
    ], activeModelId);

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
  let base = SYSTEM_PROMPT;
  
  if (features.studyMode) {
    base = STUDY_MODE_PROMPT;
  }
  
  if (features.thinking) {
    base += THINKING_PROMPT;
  }
  
  if (features.summarize) {
    base += SUMMARIZE_PROMPT;
  }
  
  if (features.translate && features.translate.trim()) {
    base += TRANSLATE_PROMPT_PREFIX + features.translate.trim() + TRANSLATE_PROMPT_SUFFIX;
  }
  
  if (features.codeReview) {
    base += CODE_REVIEW_PROMPT;
  }
  
  return base;
}

function buildMultimodalContent(text: string, attachments: HydratedAttachment[]): any[] {
  const contentArray: any[] = [{ type: 'text', text }];
  for (const a of attachments) {
    if (isImageAttachment(a) && a.content?.startsWith('data:image/')) {
      contentArray.push({ type: 'image_url', image_url: { url: a.content } });
    }
  }
  return contentArray;
}

// Async function to build attachment context with proper async document parsing
async function buildAttachmentContextAsync(attachments: HydratedAttachment[]): Promise<string> {
  if (attachments.length === 0) return '';

  const parts = await Promise.all(attachments.map(async (a) => {
    if (a.loadError) {
      return `[Attachment "${a.name}" could not be loaded (${a.loadError}). You have NOT seen its contents. Tell the user it could not be read and ask them to upload it again; do not guess what it contains.]`;
    }

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

const CONVERSATIONAL_PATTERN = /^(hi|hello|hey|yo|thanks|thank you|thx|ok|okay|cool|nice|great|yes|no|sure)\b/i;
const QUESTION_START_PATTERN = /^(what|who|whom|whose|when|where|which|why|how|is|are|was|were|does|do|did|can|could|should|will|would|has|have|compare|explain|tell me about|difference between|best)\b/i;
const TASK_START_PATTERN = /^(write|create|make|build|generate|fix|debug|refactor|convert|implement|rewrite|translate|optimi[sz]e|review|add|remove|update)\b/i;

// Mirrors how ChatGPT/Claude decide: short questions get a web search for fresh context;
// instructions ("write…", "fix…"), pasted code, attachments, and small talk do not.
function shouldAutoSearch(message: string, hasAttachments: boolean): boolean {
  const text = message.trim();
  if (hasAttachments || text.length < 8 || text.length > 300) return false;
  if (text.includes('```') || /[{};]\s*$/m.test(text)) return false;
  if (CONVERSATIONAL_PATTERN.test(text) || TASK_START_PATTERN.test(text)) return false;
  return text.endsWith('?') || QUESTION_START_PATTERN.test(text);
}

function resolveSearchQuery(message: string, hasAttachments: boolean, features: ChatFeatures): string | null {
  if (features.webSearch) return message;
  const explicitQuery = detectSearchIntent(message);
  if (explicitQuery) return explicitQuery;
  return features.autoSearch && shouldAutoSearch(message, hasAttachments) ? message : null;
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
  modelId: string = DEFAULT_MODEL_ID,
  features: ChatFeatures = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    yield "Error: OPENROUTER_API_KEY not configured. Please check your .env.local file.";
    return;
  }

  const model = await resolveModel(modelId);
  console.log(`[ByteReaper] Using model: ${model.id}`);

  const hydratedAttachments = await hydrateRemoteAttachments(attachments);
  const hasImages = hasLoadedImage(hydratedAttachments);

  // Images need a vision-capable model; try the candidates in order until one answers.
  const candidateModelIds = hasImages ? await getVisionModelIds(model.id) : [model.id];
  if (candidateModelIds[0] !== model.id) {
    console.log(`[ByteReaper] Vision required: Switching to ${candidateModelIds[0]}`);
  }

  // ── Search (if web search enabled or intent detected) ──
  let searchContext = '';
  const searchIntent = resolveSearchQuery(userMessage, attachments.length > 0, features);
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
  const attachmentContext = await buildAttachmentContextAsync(hydratedAttachments);

  const userContentString = `Previous conversation:\n${historyContext || '(New conversation)'}\n${attachmentContext}\n${searchContext}\n\nUser: ${userMessage}`;

  const finalUserContent: any = hasImages
    ? buildMultimodalContent(userContentString, hydratedAttachments)
    : userContentString;

  // Build system prompt based on features
  const systemPrompt = buildSystemPrompt(features);

  let currentModelId = candidateModelIds[0];
  let attemptCount = 0;
  const maxAttempts = candidateModelIds.length;
  let hasContent = false;
  // Thinking toggled off in the UI: ask reasoning models to answer directly (much faster)
  let disableReasoning = features.thinking === false;

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
          ...(disableReasoning ? { reasoning: { enabled: false } } : {}),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();

        // Some models can't turn reasoning off ("Reasoning is mandatory"); retry with it on
        if (disableReasoning && response.status === 400 && /reasoning/i.test(errorBody)) {
          disableReasoning = false;
          continue;
        }

        console.error(`[ByteReaper] API Error ${response.status} with model ${currentModelId}:`, errorBody);

        // Try fallback model for vision tasks
        if (attemptCount < maxAttempts - 1) {
          attemptCount++;
          currentModelId = candidateModelIds[attemptCount];
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

      // SSE events can be split across network chunks; keep the unfinished tail for the next read
      let pending = '';
      let streamError: string | null = null;

      readLoop: while (true) {
        const { done, value } = await reader.read();
        pending += decoder.decode(value, { stream: !done });
        const lines = pending.split('\n');
        pending = done ? '' : lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;

          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }

          if (typeof parsed.model === 'string' && parsed.model.trim() && parsed.model !== resolvedModelId) {
            resolvedModelId = parsed.model;
            yield `${STREAM_MODEL_META_PREFIX}${resolvedModelId}`;
          }

          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            hasContent = true;
            yield content;
          }

          if (parsed.error) {
            console.error(`[ByteReaper] Stream error from ${resolvedModelId}:`, parsed.error);
            streamError = parsed.error.message || 'Unknown error';
            await reader.cancel().catch(() => {});
            break readLoop;
          }
        }

        if (done) break;
      }

      // Free providers usually fail inside a 200 stream; move on if nothing was shown yet
      if (streamError && !hasContent && attemptCount < maxAttempts - 1) {
        attemptCount++;
        currentModelId = candidateModelIds[attemptCount];
        console.log(`[ByteReaper] Retrying with fallback model: ${currentModelId}`);
        continue;
      }

      if (streamError) {
        yield `\n\nError: ${streamError}`;
      } else if (!hasContent) {
        yield "I apologize, but I couldn't generate a response. Please try again or select a different model.";
      }
      return;

    } catch (error: any) {
      console.error('[ByteReaper] Stream error:', error);

      // Only fall back before any text reached the user, otherwise the answers would be merged
      if (!hasContent && attemptCount < maxAttempts - 1) {
        attemptCount++;
        currentModelId = candidateModelIds[attemptCount];
        console.log(`[ByteReaper] Retrying after error with fallback model: ${currentModelId}`);
        continue;
      }

      yield `${hasContent ? '\n\n' : ''}Error: ${error.message || 'Failed to connect to AI service'}`;
      return;
    }
  }
}
