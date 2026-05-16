export interface ModelDoc {
  key: string;
  name: string;
  provider: string;
  modelId: string;
  classification: string;
  bestFor: string;
  vision: boolean;
  notes: string;
}

export interface SourceDocEntry {
  path: string;
  purpose: string;
  keyParts: string[];
  flow: string;
  dataAndPrivacy?: string;
}

export interface SourceDocSection {
  title: string;
  summary: string;
  entries: SourceDocEntry[];
}

export interface FlowDoc {
  title: string;
  summary: string;
  steps: string[];
}

export const MODEL_DOCS: ModelDoc[] = [
  {
    key: "auto",
    name: "Auto (Best Available)",
    provider: "OpenRouter",
    modelId: "openrouter/auto",
    classification: "Router",
    bestFor: "Default chat routing when the user does not need to pick a specialist model.",
    vision: true,
    notes: "Delegates model selection to OpenRouter and is the app default.",
  },
  {
    key: "gemini-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    modelId: "google/gemini-2.5-flash-preview:free",
    classification: "Primary vision model",
    bestFor: "Image and screenshot analysis, multimodal prompts, and fast general coding help.",
    vision: true,
    notes: "ByteReaper automatically switches to this model when an uploaded image requires vision and the selected model cannot inspect images.",
  },
  {
    key: "gemini-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    provider: "Google",
    modelId: "google/gemini-2.5-flash-lite-preview:free",
    classification: "Lightweight vision fallback",
    bestFor: "Fast multimodal responses and backup handling for image prompts.",
    vision: true,
    notes: "Used in the vision fallback chain before returning to automatic routing.",
  },
  {
    key: "nemotron",
    name: "Nemotron 3 Super 120B",
    provider: "NVIDIA",
    modelId: "nvidia/nemotron-3-super-120b-a12b:free",
    classification: "Large reasoning model",
    bestFor: "Deep code reasoning, architecture review, and complex technical explanations.",
    vision: false,
    notes: "Text-only in the current app configuration.",
  },
  {
    key: "qwen-plus",
    name: "Qwen 3.6 Plus",
    provider: "Qwen",
    modelId: "qwen/qwen3.6-plus-preview:free",
    classification: "Reasoning-oriented model",
    bestFor: "Structured analysis, planning, and code-oriented reasoning.",
    vision: false,
    notes: "Text-only in the current app configuration.",
  },
  {
    key: "minimax",
    name: "MiniMax M2.5",
    provider: "MiniMax",
    modelId: "minimax/minimax-m2.5:free",
    classification: "Fast general model",
    bestFor: "Low-latency chat, quick coding answers, summaries, and day-to-day assistance.",
    vision: false,
    notes: "Text-only in the current app configuration.",
  },
  {
    key: "liquid",
    name: "LFM 2.5 Instruct",
    provider: "LiquidAI",
    modelId: "liquid/lfm-2.5-1.2b-instruct:free",
    classification: "Instruction-following model",
    bestFor: "Concise instructions, transformations, and deterministic utility responses.",
    vision: false,
    notes: "Text-only in the current app configuration.",
  },
];

export const FLOW_DOCS: FlowDoc[] = [
  {
    title: "Authenticated AI chat",
    summary: "The signed-in chat experience combines model selection, streaming OpenRouter responses, upload handling, web search, and Firestore persistence.",
    steps: [
      "Firebase Auth resolves the current user through AuthProvider and ProtectedRoute gates /analyze.",
      "ChatInterface keeps optimistic UI state, validates files, uploads attachments to Cloudinary, then sends the prompt to /api/chat/stream.",
      "streamAgentMessage builds system prompts, adds recent conversation context, performs optional DuckDuckGo search, selects a vision-capable model when images are attached, and streams chunks back to the client.",
      "After the assistant response is shown, chat-history.ts writes a compact message pair to Firestore without storing binary attachment payloads.",
    ],
  },
  {
    title: "Developer tools hub",
    summary: "The tools area is catalog-driven and mixes local browser utilities, external API helpers, reference pages, and AI workbenches.",
    steps: [
      "src/lib/tools/catalog.ts is the source of truth for tool title, slug, category, icon, featured state, and new badges.",
      "/tools filters the catalog by search, category, and user favorites.",
      "Local tools run in the browser where possible; network tools call scoped API routes such as /api/tools/ssl and /api/tools/proxy.",
      "AI tools reuse AiToolWorkbench and stream model output through /api/chat/stream with purpose-specific prompts.",
    ],
  },
  {
    title: "Private messenger",
    summary: "The private messaging surface uses Firebase for identity and conversation storage, libsodium for client-side encryption, Cloudinary for attachments, and Agora for voice calls.",
    steps: [
      "Users create messenger profiles with public keys and password-protected private keys.",
      "Conversation keys are generated, wrapped for each participant, and stored on conversation documents.",
      "Messages are encrypted before storage and decrypted client-side after the user unlocks their private key.",
      "Voice call tokens are minted server-side through /api/agora/token after participant authorization checks.",
    ],
  },
  {
    title: "Repository analysis",
    summary: "The GitHub analysis path fetches repository metadata and source files, builds an AI prompt, parses the model result, and stores reports for later viewing.",
    steps: [
      "Analyze UI collects a repository URL and sends it to /api/analyze.",
      "GitHub helpers fetch repository metadata, tree entries, and prioritized analyzable files.",
      "analyzer.ts builds a structured analysis request and normalizes model output into scores, findings, recommendations, and tech stack metadata.",
      "Reports are saved locally through the lightweight report database client and displayed at /report/[id].",
    ],
  },
  {
    title: "Admin and diagnostics",
    summary: "Admin surfaces expose user, AI chat, messenger, and diagnostics views only to configured admin email addresses.",
    steps: [
      "useIsAdmin checks the authenticated user's email against the local admin allowlist.",
      "AdminLayout returns notFound for non-admin users.",
      "Admin API routes verify Firebase ID tokens and admin status before returning user or diagnostic data.",
      "Diagnostic output masks environment values and reports presence/shape rather than raw secrets.",
    ],
  },
];

export const SOURCE_DOC_SECTIONS: SourceDocSection[] = [
  {
    title: "Application shell and routes",
    summary: "Next.js App Router pages define the public landing flow, protected chat, tools, docs, reports, admin, and messaging surfaces.",
    entries: [
      {
        path: "src/app/layout.tsx",
        purpose: "Root app shell, metadata, global styles, theme provider, auth provider, navbar, and footer.",
        keyParts: ["metadata", "RootLayout"],
        flow: "Every route is rendered inside ThemeProvider and AuthProvider so theme state and Firebase user state are available globally.",
        dataAndPrivacy: "No secrets are read here; metadata is public.",
      },
      {
        path: "src/app/page.tsx",
        purpose: "Public entry page that shows the auth wall and developer tools teaser to signed-out visitors.",
        keyParts: ["HomePage"],
        flow: "Redirects authenticated users to /analyze and keeps signed-out users on the landing experience.",
      },
      {
        path: "src/app/analyze/page.tsx",
        purpose: "Protected AI chat entrypoint.",
        keyParts: ["AnalyzePage", "ProtectedRoute", "ChatInterface"],
        flow: "Wraps the full chat interface in the shared client-side auth gate.",
      },
      {
        path: "src/app/chat/page.tsx",
        purpose: "Private messenger application with encrypted conversations, attachments, read receipts, and voice call UI.",
        keyParts: ["PrivateChatPage", "UsernameSetupModal", "UnlockModal", "NewConversationModal", "MessageBubble", "VoiceCallOverlay", "IncomingCallModal"],
        flow: "Loads messenger profile, unlocks the encrypted private key, subscribes to Firestore conversations/messages, encrypts outbound messages, uploads attachments, and controls Agora call state.",
        dataAndPrivacy: "Private keys are decrypted client-side after password unlock. Stored messages are encrypted payloads plus metadata.",
      },
      {
        path: "src/app/login/page.tsx and src/app/signup/page.tsx",
        purpose: "Authentication forms for email/password and Google sign-in.",
        keyParts: ["LoginPage", "SignUpPage"],
        flow: "Call helpers from auth.ts and redirect authenticated users into the app.",
        dataAndPrivacy: "Passwords are handled through Firebase Auth and are not stored by the app.",
      },
      {
        path: "src/app/tools/page.tsx",
        purpose: "Searchable tools hub with category tabs and persisted favorites.",
        keyParts: ["ToolsHubPage", "sanitizeFavoriteSlugs", "toggleFavorite"],
        flow: "Reads TOOLS, syncs favorites from localStorage and Firestore, and routes cards to /tools/[slug].",
      },
      {
        path: "src/app/tools/*/page.tsx",
        purpose: "Individual utility, converter, generator, API, AI, and reference tools.",
        keyParts: ["ToolPageShell", "AiToolWorkbench", "individual tool page components"],
        flow: "Each page owns its tool-specific state while shared shells provide layout, breadcrumbs, and consistent controls.",
      },
      {
        path: "src/app/report/[id]/page.tsx and src/app/api/report/[id]/route.ts",
        purpose: "Report viewer and report lookup endpoint for repository analysis results.",
        keyParts: ["ReportPage", "GET"],
        flow: "Loads a stored AnalysisResult and renders score, summary, findings, and recommendations.",
      },
      {
        path: "src/app/shared-chat/[id]/page.tsx",
        purpose: "Public read-only rendering of intentionally shared AI chat snapshots.",
        keyParts: ["SharedChatPage"],
        flow: "Looks up a shared chat by id and renders serialized messages when isPublic is true.",
      },
      {
        path: "src/app/admin/layout.tsx and src/app/admin/page.tsx",
        purpose: "Admin gate and admin dashboard tabs.",
        keyParts: ["AdminLayout", "AdminPage"],
        flow: "Checks admin status before rendering user, AI chat, messenger, and diagnostics panels.",
      },
      {
        path: "src/app/not-found.tsx and src/app/favicon.ico/route.ts",
        purpose: "Fallback page and icon response route.",
        keyParts: ["NotFound", "GET"],
        flow: "Provide polish around missing routes and browser icon loading.",
      },
    ],
  },
  {
    title: "API routes",
    summary: "Server routes isolate AI calls, repository analysis, uploads, proxies, admin work, messenger operations, and voice token creation.",
    entries: [
      {
        path: "src/app/api/chat/route.ts and src/app/api/chat/stream/route.ts",
        purpose: "Non-streaming and streaming AI chat endpoints.",
        keyParts: ["POST", "processAgentMessage", "streamAgentMessage"],
        flow: "Accept user message, attachments, model key, and feature flags, then call the OpenRouter agent layer.",
        dataAndPrivacy: "Uses OPENROUTER_API_KEY server-side only.",
      },
      {
        path: "src/app/api/chat/mention/route.ts",
        purpose: "Mention-style assistant endpoint for private conversations.",
        keyParts: ["POST", "chatCompletion"],
        flow: "Loads authorized conversation context and asks the model to respond inside that context.",
      },
      {
        path: "src/app/api/analyze/route.ts",
        purpose: "GitHub repository analysis endpoint.",
        keyParts: ["POST", "analyzeRepository"],
        flow: "Parses repository input, runs the analyzer, and returns a structured report payload.",
      },
      {
        path: "src/app/api/search/route.ts",
        purpose: "Web search endpoint.",
        keyParts: ["POST", "searchWeb", "instantAnswer"],
        flow: "Returns DuckDuckGo search results for chat or tool workflows.",
      },
      {
        path: "src/app/api/file-proxy/route.ts",
        purpose: "Cloudinary-safe file open/download proxy.",
        keyParts: ["sanitizeFilename", "buildCloudinaryFetchCandidates", "fetchFirstWorkingCandidate", "GET"],
        flow: "Validates Cloudinary source URLs, tries raw/signed/private delivery candidates, and returns a response with safe content disposition.",
        dataAndPrivacy: "Host allowlists prevent arbitrary proxying.",
      },
      {
        path: "src/app/api/upload/sign/route.ts",
        purpose: "Signed Cloudinary upload parameter endpoint.",
        keyParts: ["POST"],
        flow: "Generates a Cloudinary signature using server-side API secret when signed uploads are needed.",
        dataAndPrivacy: "Never returns the API secret.",
      },
      {
        path: "src/app/api/conversations/*",
        purpose: "Private messenger conversation, message, deletion, and key bootstrap APIs.",
        keyParts: ["POST /api/conversations", "GET /api/conversations", "DELETE /api/conversations/[id]", "POST and GET messages", "POST bootstrap-key"],
        flow: "Verify Firebase tokens, authorize participants, create conversations, persist encrypted messages, and wrap keys for peers.",
        dataAndPrivacy: "Authorization is checked server-side before conversation data is returned or mutated.",
      },
      {
        path: "src/app/api/agora/token/route.ts",
        purpose: "Agora voice call token minting.",
        keyParts: ["POST", "hashCode"],
        flow: "Checks conversation participation and returns a scoped RTC token for the requested channel.",
        dataAndPrivacy: "Uses AGORA_APP_CERTIFICATE server-side only.",
      },
      {
        path: "src/app/api/admin/users/route.ts and src/app/api/admin/diagnostics/route.ts",
        purpose: "Admin-only user management and production diagnostics.",
        keyParts: ["requireAdmin", "GET", "PATCH", "DELETE", "mask"],
        flow: "Verify token, enforce admin email, then list/update/delete users or return masked configuration diagnostics.",
        dataAndPrivacy: "Diagnostics mask values and report only presence/length/format checks.",
      },
      {
        path: "src/app/api/tools/proxy/route.ts, src/app/api/tools/ip-info/route.ts, and src/app/api/tools/ssl/route.ts",
        purpose: "Network-backed developer tools.",
        keyParts: ["isValidHttpUrl", "getForwardedClientIp", "normalizeDomain", "parseAltNames", "getCertChain"],
        flow: "Support HTTP testing, IP lookup, and SSL inspection without exposing unrestricted server capabilities.",
      },
      {
        path: "src/app/api/users/search/route.ts and src/app/api/health/route.ts",
        purpose: "Messenger user search and simple health check.",
        keyParts: ["GET"],
        flow: "User search finds profile documents for conversation creation; health confirms the API is reachable.",
      },
    ],
  },
  {
    title: "AI, analysis, and search libraries",
    summary: "These modules build prompts, select models, stream responses, parse attachments, analyze repositories, and fetch external context.",
    entries: [
      {
        path: "src/lib/ai/gemini.ts",
        purpose: "OpenRouter model catalog and low-level completion helpers.",
        keyParts: ["AI_MODELS", "DEFAULT_MODEL", "generateAnalysis", "chatCompletion", "streamChatCompletion"],
        flow: "Centralizes model IDs, provider metadata, vision support flags, request headers, and response parsing.",
        dataAndPrivacy: "Reads OPENROUTER_API_KEY on the server only.",
      },
      {
        path: "src/lib/ai/agent.ts",
        purpose: "Main ByteReaper assistant orchestration.",
        keyParts: ["ChatFeatures", "processAgentMessage", "streamAgentMessage", "buildSystemPrompt", "buildAttachmentContextAsync", "detectSearchIntent"],
        flow: "Combines feature prompts, search context, recent history, attachment text extraction, multimodal payload construction, model fallback, and stream metadata.",
      },
      {
        path: "src/lib/ai/prompts.ts",
        purpose: "Repository-analysis prompt construction.",
        keyParts: ["buildAnalysisPrompt"],
        flow: "Turns GitHub repository metadata and selected file contents into the structured AI analysis prompt.",
      },
      {
        path: "src/lib/ai/tool-prompts.ts and src/lib/ai/tool-helpers.ts",
        purpose: "AI developer-tool prompt registry and streaming helper.",
        keyParts: ["AI_TOOL_PROMPTS", "streamToolResponse"],
        flow: "Maps each AI tool to its system behavior and streams model output into AiToolWorkbench.",
      },
      {
        path: "src/lib/analysis/analyzer.ts",
        purpose: "Repository analysis pipeline.",
        keyParts: ["analyzeRepository", "parseAIResponse"],
        flow: "Fetches repository files, calls generateAnalysis, parses JSON-ish model output, and applies fallbacks for missing scores or findings.",
      },
      {
        path: "src/lib/github/client.ts, src/lib/github/fetcher.ts, and src/lib/github/parser.ts",
        purpose: "GitHub API access, file retrieval, and analyzable-file prioritization.",
        keyParts: ["getOctokit", "fetchRepository", "fetchRepositoryTree", "fetchFileContent", "prioritizeFiles", "detectTechStackFromFiles"],
        flow: "Use Octokit with optional token, retrieve repository content, filter code/config files, and infer tech stack signals.",
      },
      {
        path: "src/lib/search/duckduckgo.ts",
        purpose: "Free web search and instant-answer integration.",
        keyParts: ["searchWeb", "instantAnswer", "parseSearchResults", "decodeHtmlEntities"],
        flow: "Calls DuckDuckGo HTML/instant-answer endpoints and normalizes results for chat context.",
      },
    ],
  },
  {
    title: "Persistence, auth, uploads, and encryption",
    summary: "Firebase, Firestore, Cloudinary, local report storage, and libsodium are wrapped behind focused modules.",
    entries: [
      {
        path: "src/contexts/AuthContext.tsx",
        purpose: "Global Firebase user state.",
        keyParts: ["AuthProvider", "useAuth"],
        flow: "Subscribes to Firebase Auth and exposes user/loading state to all client components.",
      },
      {
        path: "src/lib/auth.ts and src/lib/firebase.ts",
        purpose: "Client-side Firebase configuration and auth helpers.",
        keyParts: ["signUpWithEmail", "signInWithEmail", "signInWithGoogle", "signOut", "updateUserProfile"],
        flow: "Handle auth operations and keep user profile documents synchronized in Firestore.",
        dataAndPrivacy: "Firebase public web config is client-side by design; private admin credentials are not used here.",
      },
      {
        path: "src/lib/firebase/admin.ts and src/lib/admin.ts",
        purpose: "Server-side Firebase Admin initialization and admin email check.",
        keyParts: ["getAdminAuth", "getAdminDb", "verifyFirebaseIdTokenDetailed", "verifyFirebaseIdToken", "isAdminEmail"],
        flow: "Lazy-initializes Firebase Admin from environment variables and verifies ID tokens for API routes.",
        dataAndPrivacy: "Private keys stay in environment variables and are never rendered.",
      },
      {
        path: "src/lib/chat-history.ts",
        purpose: "Single-document Firestore storage for AI chat sessions, archives, shared chats, and prompt templates.",
        keyParts: ["createChatSession", "getChatSessions", "getSessionMessages", "saveChatExchange", "renameChatSession", "archiveChatSession", "restoreArchivedChatSession", "deleteChatSession", "createSharedChat", "getSharedChat", "saveUserPromptTemplate"],
        flow: "Stores each AI exchange as a compact user/assistant pair and manages session lifecycle operations.",
        dataAndPrivacy: "Attachment binary content is stripped before Firestore storage; only metadata and hosted links are persisted.",
      },
      {
        path: "src/lib/cloudinary-upload.ts, src/lib/cloudinary.ts, src/lib/cloudinary/server.ts, and src/lib/uploads/*",
        purpose: "Client and server upload helpers for Cloudinary and fallback temporary file upload support.",
        keyParts: ["uploadToCloudinary", "toDownloadUrl", "uploadBufferToCloudinary", "uploadFile", "uploadBufferToTmpfiles"],
        flow: "Direct browser uploads use unsigned Cloudinary presets; server helpers provide signed/admin upload paths where needed.",
        dataAndPrivacy: "Client code uses public Cloudinary cloud/preset values; API key and secret remain server-side.",
      },
      {
        path: "src/lib/crypto/e2e.ts and src/lib/messenger-crypto.ts",
        purpose: "End-to-end encryption, key wrapping, message encryption, and password hashing for messenger profiles.",
        keyParts: ["generateIdentity", "encryptPrivateKey", "decryptPrivateKey", "wrapKeyForPeer", "unwrapKey", "generateConversationKey", "encryptMessage", "decryptMessage", "hashPassword", "verifyPassword"],
        flow: "Creates identity keys, encrypts private keys with password-derived keys, wraps conversation keys, and encrypts message bodies before Firestore writes.",
      },
      {
        path: "src/lib/db/client.ts and src/lib/db/schema.ts",
        purpose: "Local report persistence and report row shape.",
        keyParts: ["saveReport", "getReport", "getRecentReports", "getReportByRepo", "ReportRow"],
        flow: "Stores analysis results for the report viewer and recent-report lookups.",
      },
      {
        path: "src/lib/tool-favorites.ts",
        purpose: "Persisted developer-tool favorites.",
        keyParts: ["getUserToolFavorites", "saveUserToolFavorites"],
        flow: "Uses email-keyed Firestore documents and lazily migrates older UID-keyed favorite records.",
      },
    ],
  },
  {
    title: "UI components",
    summary: "Reusable components provide the chat experience, admin views, reports, landing sections, tool shells, and design-system primitives.",
    entries: [
      {
        path: "src/components/chat/chat-interface.tsx",
        purpose: "Main AI chat UI and interaction controller.",
        keyParts: ["ChatInterface", "ModelSelector", "MessageBubble", "CodeBlock", "EmptyChatState", "file validation helpers", "upload helpers", "slash command handlers"],
        flow: "Manages session lists, prompt templates, model selection, feature toggles, streaming responses, uploads, share links, archive/restore/delete, and Firestore persistence.",
        dataAndPrivacy: "Uploads go to Cloudinary before message persistence; Firestore receives compact metadata and URLs.",
      },
      {
        path: "src/components/chat/Attachment.tsx",
        purpose: "Attachment preview, open, and download rendering.",
        keyParts: ["Attachment", "isImage", "isAudio", "isVideo", "proxyUrl", "blobDownload"],
        flow: "Chooses image/audio/video/document handling and routes Cloudinary files through /api/file-proxy when needed.",
      },
      {
        path: "src/components/analyze/*",
        purpose: "Repository analysis chat/form/progress UI.",
        keyParts: ["ChatInterface", "AnalyzeForm", "AnalysisProgress", "MessageContent"],
        flow: "Collects GitHub URLs, reports progress, and links completed analysis to the report page.",
      },
      {
        path: "src/components/tools/*",
        purpose: "Tools layout, icon rendering, copy button, map view, and AI tool workbench.",
        keyParts: ["ToolPageShell", "ToolIconGlyph", "CopyButton", "LeafletMap", "AiToolWorkbench"],
        flow: "Provides shared UI around the 53 developer tools and streams AI outputs into editable result panes.",
      },
      {
        path: "src/components/shared/* and src/components/providers/theme-provider.tsx",
        purpose: "Global navigation, footer, loading spinner, score ring, profile modal, and theme provider.",
        keyParts: ["Navbar", "Footer", "ProfileModal", "ThemeProvider"],
        flow: "Connect app-wide navigation to auth state, admin link visibility, theme switching, profile actions, and messenger profile access.",
      },
      {
        path: "src/components/admin/*",
        purpose: "Admin panels for users, AI chats, messenger conversations, and admin link visibility.",
        keyParts: ["UsersPanel", "AIChatsPanel", "MessengerPanel", "AdminLink"],
        flow: "Render admin-only data returned by protected API routes or Firestore queries.",
      },
      {
        path: "src/components/messenger/*",
        purpose: "Private messenger profile drawer and voice recorder.",
        keyParts: ["ProfileDrawer", "VoiceRecorder"],
        flow: "Manage messenger profile lifecycle, profile deletion warning, audio recording, and voice message metadata.",
      },
      {
        path: "src/components/report/*",
        purpose: "Repository analysis report presentation.",
        keyParts: ["ReportHeader", "SummaryCard", "ScoreBreakdown", "FindingsList", "TechStackCard"],
        flow: "Render normalized AnalysisResult sections into scannable score, stack, finding, and recommendation blocks.",
      },
      {
        path: "src/components/landing/*",
        purpose: "Signed-out landing and feature preview sections.",
        keyParts: ["AuthWall", "DeveloperToolsSection", "Features", "Hero", "HowItWorks"],
        flow: "Explain the product, route visitors to auth, and preview featured tools.",
      },
      {
        path: "src/components/ui/*",
        purpose: "Reusable Radix/Tailwind UI primitives.",
        keyParts: ["Button", "Card", "Dialog", "AlertDialog", "Tabs", "Tooltip", "Input", "Textarea", "ScrollArea", "Progress", "Badge", "Alert", "Accordion", "Separator", "Skeleton"],
        flow: "Provide consistent styling and accessible base interactions across app surfaces.",
      },
    ],
  },
  {
    title: "Types, constants, scripts, and configuration",
    summary: "Shared types, utility functions, generated setup scripts, Firestore rules, and deployment config keep the app predictable.",
    entries: [
      {
        path: "src/types/*",
        purpose: "Typed contracts for analysis reports, chat messages, GitHub data, private chat, and external wrappers.",
        keyParts: ["AnalysisResult", "Finding", "ChatMessage", "FileAttachment", "GitHubRepo", "Private chat types"],
        flow: "Keep component, API, and library boundaries consistent.",
      },
      {
        path: "src/lib/tools/catalog.ts and src/lib/tools/reference-data.ts",
        purpose: "Developer tool registry and static reference datasets.",
        keyParts: ["TOOLS", "TOOL_CATEGORIES", "TOOL_COUNT", "HTTP statuses", "MIME types", "Git commands", "shortcuts", "patterns", "Big-O data"],
        flow: "Drive the tools hub, landing preview, icons, categories, and reference pages from reusable data.",
      },
      {
        path: "src/lib/utils.ts and src/lib/utils/*",
        purpose: "Class-name merging and formatting/parsing helpers.",
        keyParts: ["cn", "parseGitHubUrl", "formatNumber", "formatBytes", "formatDate", "formatDuration", "getScoreColor", "truncate", "generateId"],
        flow: "Shared low-level helpers used by UI and analysis flows.",
      },
      {
        path: "firestore.rules",
        purpose: "Firestore security policy for user profiles, chats, shared chats, tool favorites, messenger profiles, conversations, messages, calls, and private auth records.",
        keyParts: ["users", "chat_session", "archived_chats", "shared_chats", "user_tool_favorites", "user_profiles", "conversations", "calls", "private_users"],
        flow: "Restricts reads and writes to owners, participants, public shared chats, or admins depending on collection.",
      },
      {
        path: "next.config.js, netlify.toml, tailwind.config.ts, tsconfig.json, postcss.config.js, .eslintrc.json, .npmrc",
        purpose: "Framework, deployment, styling, TypeScript, lint, and package-manager configuration.",
        keyParts: ["Next.js App Router", "Netlify Next plugin", "Tailwind theme", "TypeScript compiler options"],
        flow: "Define build/runtime behavior and visual tokens.",
      },
      {
        path: "setup-firebase.js, generate-firebase-auth.js, generate-source.js, generate-v2-features.js, setup-dirs.js, check-deployment.js, scripts/migrate-attachments.ts",
        purpose: "Setup, generation, deployment verification, and attachment migration scripts.",
        keyParts: ["Firebase setup", "source generation", "feature generation", "deployment checklist", "attachment migration"],
        flow: "Support initial project setup, legacy generation tasks, deployment readiness checks, and migration maintenance.",
      },
      {
        path: "public/brand/bytereaper-mark.svg, src/app/icon.svg, src/app/globals.css",
        purpose: "Brand assets and global styling system.",
        keyParts: ["ByteReaper mark", "favicon/icon", "global CSS variables", "theme classes"],
        flow: "Provide visual identity, dark/light/custom themes, and shared application styling.",
      },
    ],
  },
];

export const SECURITY_DOCUMENTATION_NOTES = [
  "Documentation lists environment variable names, never secret values.",
  "Cloudinary API key/secret, Firebase private key, Agora certificate, OpenRouter key, and user data must remain outside README and rendered docs.",
  "Chat persistence stores compact message pairs and attachment metadata rather than raw uploaded binaries.",
  "Private messenger messages are encrypted before Firestore storage and require participant authorization for API access.",
  "Admin diagnostics must keep masking behavior and should never be expanded to print raw environment values.",
];
