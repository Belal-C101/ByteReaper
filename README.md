# ByteReaper

ByteReaper is a full-stack AI developer workspace built with Next.js, Firebase, OpenRouter, Cloudinary, and Netlify. It combines a multi-model coding assistant, repository analysis, encrypted private messaging, file-aware chat, and a catalog of 53 developer tools in one authenticated web application.

Live site: https://bytereaber.netlify.app
Repository: https://github.com/Belal-C101/ByteReaper

## What ByteReaper Does

ByteReaper is designed for developers who want one workspace for coding help, source analysis, web research, quick utilities, and private technical communication.

- AI chat with streaming responses, model switching, file context, image understanding, web search, prompt templates, slash commands, saved sessions, archives, and shared chat snapshots.
- GitHub repository analysis with code-quality, security, performance, architecture, documentation, and testing scores.
- Cloudinary-backed uploads for source files, documents, images, audio, and video metadata.
- Firebase Authentication with email/password and Google sign-in.
- Firestore persistence for user profiles, AI chat history, archived chats, shared chats, prompt templates, tool favorites, private messenger profiles, encrypted conversations, and call records.
- Private messenger with client-side encryption, key wrapping, file attachments, voice messages, read receipts, and Agora voice calls.
- Admin dashboard for user management, AI chat review, messenger review, and masked diagnostics.
- Five visual themes: dark, light, ocean, forest, and sunset.
- Protected in-app project documentation at `/docs`.

## AI Model Catalog

The model source of truth is `src/lib/ai/gemini.ts`. All model requests go through OpenRouter.

| Key | Model | Provider | Classification | Vision | Primary role |
| --- | --- | --- | --- | --- | --- |
| `auto` | Auto (Best Available) | OpenRouter | Router | Yes | Default routing when no specialist model is required. |
| `gemini-flash` | Gemini 2.5 Flash | Google | Primary vision model | Yes | Image and screenshot analysis, multimodal prompts, fast coding help. |
| `gemini-flash-lite` | Gemini 2.5 Flash Lite | Google | Lightweight vision fallback | Yes | Fast multimodal fallback for image prompts. |
| `nemotron` | Nemotron 3 Super 120B | NVIDIA | Large reasoning model | No | Deep code reasoning, architecture review, complex explanations. |
| `qwen-plus` | Qwen 3.6 Plus | Qwen | Reasoning-oriented model | No | Structured analysis, planning, and code-heavy reasoning. |
| `minimax` | MiniMax M2.5 | MiniMax | Fast general model | No | Low-latency chat, summaries, and everyday coding assistance. |
| `liquid` | LFM 2.5 Instruct | LiquidAI | Instruction-following model | No | Concise transformations and deterministic utility responses. |

When an uploaded image is present and the selected model does not support vision, ByteReaper automatically switches to Gemini 2.5 Flash. Streaming vision requests can fall back through Gemini 2.5 Flash Lite and Auto.

## Developer Tools

The tools hub is driven by `src/lib/tools/catalog.ts`. Users can search, filter by category, open individual tools, and save favorites locally and in Firestore.

### Utilities

| Tool | Capability |
| --- | --- |
| JSON Formatter & Validator | Formats, minifies, validates, and inspects JSON with tree view. |
| Regex Tester | Tests expressions live with flags, matches, captures, and common pattern presets. |
| JWT Decoder | Decodes JWT header and payload and explains common claims. |
| Hash Generator | Generates MD5, SHA-1, SHA-256, and SHA-512 hashes for text or uploaded files. |
| Diff Viewer | Compares two text inputs and displays a color-coded unified diff. |
| Color Tools | Converts colors, checks contrast, builds palettes, and creates gradients. |
| Chmod Calculator | Calculates Unix permissions in visual, numeric, and symbolic forms. |
| Crontab Translator | Explains cron expressions and previews upcoming run times. |
| Markdown Editor & Preview | Provides split-pane Markdown editing with HTML export. |
| SQL Formatter | Formats SQL across popular dialects. |
| HTML/CSS/JS Playground | Runs a three-pane live playground with console capture. |

### Converters

| Tool | Capability |
| --- | --- |
| Base64 Encoder/Decoder | Encodes and decodes text and files. |
| Unix Timestamp Converter | Converts timestamps to dates and dates back to timestamps with timezone support. |
| URL Encoder/Decoder | Encodes, decodes, and edits URL components. |
| HTML Entity Encoder/Decoder | Converts special characters to named or numeric HTML entities and back. |
| CSS Unit Converter | Converts between px, rem, em, vh, vw, percent, and pt. |
| Number Base Converter | Converts numbers between bases and supports bitwise operations. |
| Data Converter Hub | Converts between JSON, YAML, CSV, XML, and TOML. |
| Image to Base64 | Converts images to Base64 with preview and snippet output. |
| Byte/Unit Converter | Converts storage units and estimates transfer durations. |

### Generators

| Tool | Capability |
| --- | --- |
| UUID Generator | Generates and validates UUID values, including bulk output and nil mode. |
| Lorem Ipsum Generator | Produces placeholder copy, including developer-themed text. |
| Password Generator | Creates secure passwords with strength scoring. |
| QR Code Generator | Generates downloadable QR codes with style controls. |

### API Tools

| Tool | Capability |
| --- | --- |
| HTTP Request Tester | Sends API requests with headers, body, response timing, and response inspection. |
| IP & Network Info | Looks up IP geolocation and ISP data with map visualization. |
| DNS Lookup | Inspects DNS records through public resolver APIs. |
| SSL Certificate Checker | Checks issuer, validity, SANs, and certificate chain information. |
| NPM Package Search | Searches npm packages and includes package-size insights. |
| PyPI Package Search | Looks up Python package metadata and project links. |
| Tech News Aggregator | Browses top stories from Hacker News, Dev.to, and Reddit. |
| GitHub Trending | Discovers trending repositories by language and period. |
| StackOverflow Search | Finds relevant questions and accepted answers. |
| Public API Directory | Filters and searches public APIs by category and auth model. |
| Website Screenshot / Preview | Generates site previews and inspects page metadata. |

### AI Tools

| Tool | Capability |
| --- | --- |
| Commit Message Generator | Generates concise commit messages from change descriptions. |
| README Generator | Creates polished README drafts with Markdown preview. |
| Code Translator | Translates code between popular languages while preserving behavior. |
| Error Explainer | Explains stack traces, root causes, and concrete fixes. |
| SQL Generator | Converts natural language and optional schemas into SQL. |
| API Doc Generator | Generates endpoint documentation in Markdown or JSON style. |
| Code Reviewer | Produces structured review feedback grouped by severity. |
| Interview Question Generator | Creates interview questions with model answers. |
| Learning Roadmap Generator | Builds phased roadmaps with milestones and free resources. |
| Changelog Generator | Turns logs into release changelogs. |
| Tech Stack Recommender | Recommends practical, free-first stacks with trade-offs. |
| Code Complexity Analyzer | Estimates complexity and suggests refactoring actions. |

### Reference

| Tool | Capability |
| --- | --- |
| HTTP Status Codes | Searches HTTP codes grouped by response class. |
| MIME Types Reference | Looks up MIME types by extension and category. |
| Git Cheatsheet | Lists common Git commands with examples. |
| Keyboard Shortcuts | References shortcuts for VS Code, Chrome DevTools, Terminal, Vim, and GitHub. |
| Design Patterns | Explains pattern intent, usage guidance, and examples. |
| Big-O Cheatsheet | Compares algorithm and data structure complexity. |

## Core Architecture

```text
src/
  app/                  Next.js App Router pages and API routes
  components/           Chat, tools, admin, report, messenger, shared, and UI components
  contexts/             Firebase auth context
  hooks/                Client hooks such as admin detection
  lib/                  AI, persistence, uploads, GitHub, search, crypto, tools, docs, and utilities
  types/                Shared TypeScript contracts
public/                 Brand assets
scripts/                Migration and maintenance scripts
```

### Runtime Flow

1. `AuthProvider` subscribes to Firebase Auth and exposes the current user.
2. Protected pages use `ProtectedRoute`; admin pages add `useIsAdmin`.
3. Chat requests stream through `/api/chat/stream`.
4. `streamAgentMessage` builds prompt context, adds recent history, handles files, performs optional search, selects the correct model, and streams OpenRouter output.
5. File uploads go directly to Cloudinary where possible.
6. `chat-history.ts` persists compact message pairs in Firestore without storing raw binary attachment content.
7. Tool pages either run locally in the browser, call scoped API routes, or stream AI output through the shared AI tool workbench.

## Source Documentation

The application includes protected project documentation at `/docs`. It covers:

- Product flow across chat, tools, messenger, analysis, reports, and admin.
- Model classification and routing behavior.
- Complete tool catalog grouped by category.
- Curated file-by-file source documentation for routes, API endpoints, components, libraries, persistence, encryption, scripts, and configuration.
- Privacy boundaries for secrets, API keys, Cloudinary credentials, Firebase private keys, and user data.

The documentation is intentionally architectural and source-oriented. It does not include private `.env` values, API keys, user records, or secret material.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 App Router |
| UI | React 19, Tailwind CSS, Radix UI primitives, lucide-react, framer-motion |
| AI | OpenRouter chat completions and streaming |
| Auth | Firebase Authentication |
| Database | Firestore |
| Uploads | Cloudinary browser uploads and server helpers |
| Private chat crypto | libsodium-wrappers-sumo |
| Voice calls | Agora RTC and Agora access tokens |
| Repository access | Octokit and GitHub REST API |
| Search | DuckDuckGo HTML and instant-answer endpoints |
| Deployment | Netlify with `@netlify/plugin-nextjs` |

## Environment Variables

Only variable names belong in documentation. Never commit real secrets.

| Variable | Required | Used by |
| --- | --- | --- |
| `OPENROUTER_API_KEY` | Yes | Server-side AI chat, streaming, repository analysis, and AI tools. |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes for uploads | Client-side Cloudinary direct uploads. |
| `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` | Yes for uploads | Unsigned Cloudinary browser upload preset. |
| `CLOUDINARY_CLOUD_NAME` | Required for server Cloudinary helpers | Server-side Cloudinary URL signing/admin operations. |
| `CLOUDINARY_API_KEY` | Required for server Cloudinary helpers | Server-side Cloudinary signing/admin operations. |
| `CLOUDINARY_API_SECRET` | Required for server Cloudinary helpers | Server-side Cloudinary signing/admin operations. |
| `CLOUDINARY_UPLOAD_FOLDER` | Optional | Server-side upload folder, defaults to `bytereaper`. |
| `FIREBASE_PROJECT_ID` | Required for admin APIs | Firebase Admin SDK. |
| `FIREBASE_CLIENT_EMAIL` | Required for admin APIs | Firebase Admin SDK service account. |
| `FIREBASE_PRIVATE_KEY` | Required for admin APIs | Firebase Admin SDK service account key. |
| `AGORA_APP_ID` | Required for voice calls | Server-side Agora token generation. |
| `AGORA_APP_CERTIFICATE` | Required for voice calls | Server-side Agora token generation. |
| `NEXT_PUBLIC_AGORA_APP_ID` | Required for voice calls | Client-side Agora SDK. |
| `GITHUB_TOKEN` | Optional | Higher GitHub API rate limits through Octokit. |
| `NEXT_PUBLIC_APP_URL` | Optional | OpenRouter referer header. |
| `NEXT_PUBLIC_BYTEREAPER_DEBUG` | Optional | Client-side debug logging when set to `1`. |

## Cloudinary Behavior

Uploads use `https://api.cloudinary.com/v1_1/<cloud>/auto/upload` so Cloudinary can classify images, videos, audio, PDFs, and raw documents correctly.

- The browser upload path uses a public cloud name and unsigned upload preset.
- Server-side signing and private download helpers use Cloudinary API credentials through environment variables.
- `/api/file-proxy` only accepts Cloudinary hosts and tries safe delivery candidates for inline viewing and downloads.
- Firestore stores hosted links and lightweight metadata, not the binary file payload.

## Firestore Collections

Important collections referenced by the app and security rules:

- `users`: authenticated user profile metadata.
- `chat_session`: active AI chat sessions stored as single documents.
- `archived_chats`: archived AI chat sessions.
- `shared_chats`: intentionally public chat snapshots.
- `user_prompt_templates`: saved prompt templates.
- `user_tool_favorites`: saved tools hub favorites.
- `user_profiles`: messenger profiles and public keys.
- `conversations`: private messenger conversations and encrypted key metadata.
- `conversations/{id}/messages`: encrypted messenger messages.
- `calls`: voice call metadata.
- `private_users`: private messenger password hash/salt records.

## Local Development

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open http://localhost:3000.

Recommended setup checks:

```bash
npm run build
npm run check-deploy
```

On Windows PowerShell, `npm.cmd run build` and `npm.cmd run check-deploy` avoid execution-policy issues.

## Deployment

ByteReaper is configured for Netlify through `netlify.toml`.

- Build command: `npm run build`
- Node version: `20`
- Netlify plugin: `@netlify/plugin-nextjs`
- Security headers: frame, MIME, referrer, permissions, and cross-origin resource policy headers.

Before deployment:

1. Configure required environment variables in Netlify.
2. Add the production domain to Firebase authorized domains.
3. Publish the current Firestore rules.
4. Run `npm.cmd run build` and `npm.cmd run check-deploy`.

## Privacy and Security Notes

- Do not document or commit real values from `.env`, `.env.local`, Netlify environment settings, Firebase service accounts, Cloudinary secrets, Agora certificates, or OpenRouter keys.
- Admin diagnostics must remain masked and should report presence, length, or format only.
- Private messenger content is encrypted before Firestore storage.
- AI chat attachments are uploaded to Cloudinary and persisted as metadata/links, not Firestore binary blobs.
- Shared chats are intentionally public snapshots and should contain only content the user chooses to share.

## License

This repository is private application code unless a separate license file states otherwise.
