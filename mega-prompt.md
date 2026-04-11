# ByteReaper — Full Feature Expansion Prompt

## Context for the Agent

You are working on **ByteReaper**, a Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui web application deployed on Netlify. It uses Firebase Auth (email/password + Google OAuth), Firestore for chat history, OpenRouter for free AI models, DuckDuckGo for free web search, and the GitHub API (Octokit) for repo analysis. The repo is at `https://github.com/Belal-C101/ByteReaper`.

**Hard rules:**
- Every feature must be **100% free** — free APIs, free client-side libraries, or the existing OpenRouter free models.
- No paid APIs. No API keys the user has to pay for. If a feature needs an API, it must have a generous free tier or be fully open.
- Maintain the existing dark/purple cyberpunk aesthetic and branding.
- All new features go under `src/app/tools/[tool-name]/page.tsx` as individual pages, UNLESS they are AI chat enhancements (those go into the existing chat system).
- Add a **Tools Hub** page at `src/app/tools/page.tsx` — a grid/card layout showing all available tools organized by category with icons, descriptions, and links.
- Add a navigation link to "Tools" in the existing navbar/sidebar.
- Every tool page must be **responsive**, **accessible**, and must work fully client-side where possible (no unnecessary API routes).
- Use existing shadcn/ui components wherever possible. Install new shadcn components if needed.
- For any tool that needs a code editor, use **Monaco Editor** (`@monaco-editor/react`) or a simple `<textarea>` with monospace font — your choice based on complexity.
- For AI-powered tools, create a shared utility at `src/lib/ai/tool-helpers.ts` that calls the existing OpenRouter chat API route (`/api/chat`) with a system prompt specific to each tool. Reuse the existing streaming infrastructure.
- Each tool should be a **self-contained page** that works independently — users don't need to be logged in to use utility tools (only AI chat features require auth).
- Write clean, production-quality TypeScript. No `any` types. Add proper error handling and loading states.

---

## PHASE 1 — Developer Utility Tools (Pure Client-Side, No API)

Create each of these as a page under `src/app/tools/`. Each must have a clean UI with input area, output area, copy-to-clipboard button, and clear button.

### 1. JSON Formatter & Validator (`/tools/json-formatter`)
- Paste JSON → format/prettify with adjustable indentation (2/4 spaces, tabs)
- Validate and show line-level error messages
- Minify option
- Tree view toggle to explore JSON structure visually

### 2. Regex Tester (`/tools/regex-tester`)
- Input field for regex pattern and flags (g, i, m, s, u)
- Text area for test string
- Live highlight matches in the test string
- Show capture groups, match index, and match count
- Common regex patterns sidebar (email, URL, IP, phone, etc.)

### 3. Base64 Encoder/Decoder (`/tools/base64`)
- Encode text → Base64
- Decode Base64 → text
- Support file → Base64 (drag and drop)
- Auto-detect if input is Base64

### 4. JWT Decoder (`/tools/jwt-decoder`)
- Paste a JWT token
- Decode and display Header, Payload, and Signature sections
- Show expiration status (expired / valid / no exp)
- Highlight claims with explanations (iat, exp, sub, iss, aud, etc.)
- Do NOT verify signature (no secret needed)

### 5. UUID Generator (`/tools/uuid-generator`)
- Generate UUID v4 (random)
- Bulk generate (user picks count: 1–100)
- Copy individual or all
- Nil UUID option
- UUID validation input

### 6. Hash Generator (`/tools/hash-generator`)
- Input text → generate MD5, SHA-1, SHA-256, SHA-512
- Use the Web Crypto API (`crypto.subtle`) for SHA family
- Use a small client-side lib (like `js-md5`) for MD5
- File hashing via drag-and-drop
- Compare two hashes (match checker)

### 7. Diff Viewer (`/tools/diff-viewer`)
- Two side-by-side text areas (original vs modified)
- Compute and display unified diff with color-coded additions/deletions
- Use `diff` npm package client-side
- Line numbers
- Option to swap sides

### 8. Unix Timestamp Converter (`/tools/timestamp`)
- Current timestamp display (live updating)
- Timestamp → Human readable date (with timezone selector)
- Human readable date → Timestamp
- Milliseconds vs seconds toggle
- Relative time display ("3 hours ago")

### 9. URL Encoder/Decoder (`/tools/url-encoder`)
- Encode / decode URL components
- Full URL parser — show protocol, host, port, path, query params (as editable table), fragment
- Build URL from components

### 10. HTML Entity Encoder/Decoder (`/tools/html-entities`)
- Encode special characters to HTML entities
- Decode HTML entities to characters
- Named vs numeric entity options

### 11. Lorem Ipsum Generator (`/tools/lorem-ipsum`)
- Generate paragraphs, sentences, or words
- Adjustable count
- Copy to clipboard
- Option for "developer ipsum" (tech-themed placeholder text)

### 12. Password Generator (`/tools/password-generator`)
- Adjustable length (8–128)
- Toggle: uppercase, lowercase, numbers, symbols
- Exclude ambiguous characters option
- Password strength meter
- Generate multiple at once
- Copy button

### 13. Color Tools (`/tools/color`)
- Color picker with HEX, RGB, HSL conversion
- Contrast ratio checker (WCAG AA/AAA)
- Palette generator (complementary, analogous, triadic, split-complementary)
- CSS gradient builder with live preview
- Tailwind color class lookup

### 14. CSS Unit Converter (`/tools/css-units`)
- Convert between px, rem, em, vh, vw, %, pt
- Adjustable base font size for rem/em calculations

### 15. Chmod Calculator (`/tools/chmod`)
- Toggle permission checkboxes (read/write/execute for owner/group/others)
- Show numeric (755) and symbolic (rwxr-xr-x) notation
- Reverse: input numeric → show checkboxes

### 16. Crontab Translator (`/tools/cron`)
- Input a cron expression
- Output human-readable description (use `cronstrue` library)
- Show next 5 execution times
- Interactive builder with dropdowns
- Common presets (every minute, hourly, daily, weekly, monthly)

### 17. Number Base Converter (`/tools/base-converter`)
- Convert between decimal, binary, octal, hexadecimal
- Arbitrary base (2–36)
- Bitwise operation calculator (AND, OR, XOR, NOT, shifts)

### 18. Markdown Editor & Preview (`/tools/markdown`)
- Split pane: editor on left, rendered preview on right
- Toolbar for common markdown (bold, italic, headers, links, images, code blocks, tables)
- Export as HTML
- Use `react-markdown` + `remark-gfm` for rendering

### 19. SQL Formatter (`/tools/sql-formatter`)
- Paste SQL → format/prettify
- Use `sql-formatter` npm package
- Support MySQL, PostgreSQL, SQLite, T-SQL dialects
- Minify option
- Syntax highlighting

### 20. Data Converter Hub (`/tools/data-converter`)
- Tabs or dropdown: JSON ↔ YAML, JSON ↔ CSV, JSON ↔ XML, YAML ↔ TOML
- Use `js-yaml`, `papaparse`, `fast-xml-parser` client-side
- Error messages for invalid input
- Copy / download output

### 21. QR Code Generator (`/tools/qr-code`)
- Input text/URL → generate QR code
- Use `qrcode` npm package (client-side)
- Adjustable size, error correction level
- Download as PNG/SVG
- Color customization (foreground/background)

### 22. Image to Base64 (`/tools/image-base64`)
- Drag and drop or file select
- Show Base64 string
- Show `<img>` tag and CSS `background-image` snippet
- Preview the image
- Show file size vs Base64 size

### 23. HTML/CSS/JS Playground (`/tools/playground`)
- Three panes: HTML, CSS, JS
- Live preview iframe below
- Auto-run on keystroke (debounced)
- Console output panel (intercept `console.log`)
- Reset and share (encode state in URL hash)
- Preset templates (starter HTML page, Tailwind playground, animation demo)

### 24. Byte/Unit Converter (`/tools/bytes`)
- Convert between bytes, KB, MB, GB, TB, PB
- Binary (KiB/MiB/GiB) vs decimal (KB/MB/GB) toggle
- Bandwidth calculator (file size + speed = time)

---

## PHASE 2 — Free API-Powered Tools

### 25. HTTP Request Tester (`/tools/api-tester`)
- Method selector (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- URL input, headers editor (key-value table), body editor (raw JSON, form-data)
- Send request via a Next.js API route (`/api/tools/proxy`) to avoid CORS — the API route forwards the request server-side and returns the response
- Display: status code, response time, response headers, response body (formatted JSON or raw)
- History of recent requests (in-memory, session only)

### 26. IP & Network Info (`/tools/ip-info`)
- Show user's public IP, location, ISP using `https://ipapi.co/json/` (free, 1000/day)
- Manual IP lookup
- Display on a map (use Leaflet + OpenStreetMap, both free)

### 27. DNS Lookup (`/tools/dns-lookup`)
- Input domain → query DNS records via `https://dns.google/resolve?name=DOMAIN&type=TYPE`
- Show A, AAAA, CNAME, MX, TXT, NS, SOA records
- Tabbed display per record type

### 28. SSL Certificate Checker (`/tools/ssl-checker`)
- Input domain
- API route (`/api/tools/ssl`) uses Node.js `tls` module to connect and extract cert info
- Display: issuer, subject, valid from/to, days remaining, SANs, chain

### 29. NPM Package Search (`/tools/npm-search`)
- Search the npm registry API (`https://registry.npmjs.org/-/v1/search?text=QUERY`)
- Show: name, description, version, weekly downloads, last publish date, license
- Link to npm page and GitHub repo
- Bundle size estimate via `https://bundlephobia.com/api/size?package=NAME@VERSION` (free)

### 30. PyPI Package Search (`/tools/pypi-search`)
- Search PyPI JSON API (`https://pypi.org/pypi/PACKAGE/json`)
- Show: name, summary, version, author, license, homepage
- Link to PyPI page

### 31. Tech News Aggregator (`/tools/news`)
- Tabs: Hacker News, Dev.to, Reddit r/programming
- HN: `https://hacker-news.firebaseio.com/v0/topstories.json` → fetch top 30 items
- Dev.to: `https://dev.to/api/articles?per_page=30`
- Reddit: `https://www.reddit.com/r/programming/top.json?limit=30&t=day`
- Show title, points/score, comment count, source link, time ago
- Auto-refresh option

### 32. GitHub Trending (`/tools/github-trending`)
- Scrape or use the unofficial API: `https://api.gitterapp.com/repositories?language=&since=daily`
- Or build a simple API route that fetches `https://github.com/trending` and parses it
- Filter by language and time range (daily/weekly/monthly)
- Show: repo name, description, stars, forks, language, stars today

### 33. StackOverflow Search (`/tools/stackoverflow`)
- Use Stack Exchange API v2.3: `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=QUERY&site=stackoverflow`
- No API key needed (300 requests/day without key)
- Show: title, score, answer count, accepted answer indicator, tags, link
- Click to expand and show the top answer body (fetch via `/questions/{id}/answers` endpoint)

### 34. Public API Directory (`/tools/public-apis`)
- Fetch from `https://api.publicapis.org/entries` (or mirror the GitHub list)
- Search, filter by category, auth type (none, apiKey, OAuth), HTTPS, CORS
- Great for developers looking for free APIs to use

### 35. Website Screenshot / Preview (`/tools/site-preview`)
- Input URL → show screenshot using free `https://api.microlink.io/?url=URL&screenshot=true`
- Show meta tags (title, description, OG image)
- Basic performance info if available

---

## PHASE 3 — AI-Powered Tools (Using Existing OpenRouter Free Models)

For each of these, create a page with a clean input UI. When the user submits, call your existing `/api/chat` route with a **specific system prompt** for that tool. Stream the response back. Create a shared helper in `src/lib/ai/tool-prompts.ts` that exports the system prompt for each tool.

### 36. Commit Message Generator (`/tools/ai/commit-message`)
- Text area for diff/changes description
- Style selector: Conventional Commits, Gitmoji, simple
- Generate button → AI writes the commit message
- Copy button

### 37. README Generator (`/tools/ai/readme-generator`)
- Input: repo URL, project name, description, tech stack (checkboxes), features list
- Generate a professional README with badges, installation, usage, contributing, license sections
- Output in Markdown with live preview

### 38. Code Translator (`/tools/ai/code-translator`)
- Source language dropdown, target language dropdown
- Input code area, output code area
- Translate button
- Support: JS, TS, Python, Java, C++, Go, Rust, Ruby, PHP, C#, Swift, Kotlin

### 39. Error Explainer (`/tools/ai/error-explainer`)
- Paste a stack trace or error message
- Optional: select language/framework
- AI explains what went wrong, why, and how to fix it
- Show fix suggestions as code snippets

### 40. SQL Generator (`/tools/ai/sql-generator`)
- Natural language input: "Show me all users who signed up in the last 30 days and have more than 5 orders"
- Optional: paste your schema (CREATE TABLE statements)
- AI generates the SQL query
- Dialect selector: MySQL, PostgreSQL, SQLite, MSSQL

### 41. API Doc Generator (`/tools/ai/api-docs`)
- Paste an API route / endpoint code
- AI generates OpenAPI/Swagger-style documentation
- Output in Markdown or JSON
- Include: endpoint, method, params, request body, response schema, example

### 42. Code Reviewer (`/tools/ai/code-review`)
- Paste code
- AI reviews for: bugs, security issues, performance, best practices, readability
- Output as a structured report with severity levels (critical, warning, info)
- Suggestion diffs where applicable

### 43. Interview Question Generator (`/tools/ai/interview-questions`)
- Select: role (frontend, backend, fullstack, devops, data), level (junior, mid, senior)
- Select: topics (algorithms, system design, language-specific, behavioral)
- AI generates 10 questions with model answers
- "Generate more" button

### 44. Learning Roadmap Generator (`/tools/ai/roadmap`)
- Input: "I want to learn [topic/skill]"
- Select: current level (beginner, intermediate, advanced)
- AI generates a structured roadmap with phases, resources (free ones), estimated timeframes
- Output as a visual timeline or structured list

### 45. Changelog Generator (`/tools/ai/changelog`)
- Paste git log or list of changes
- Select format: Keep a Changelog, conventional, simple
- AI generates a formatted changelog grouped by type (Added, Changed, Fixed, Removed)

### 46. Tech Stack Recommender (`/tools/ai/tech-stack`)
- Describe your project (type, scale, team size, requirements)
- AI recommends a full stack: frontend, backend, database, hosting, CI/CD, monitoring
- Include pros/cons and alternatives
- Focus on free/open-source options

### 47. Code Complexity Analyzer (`/tools/ai/complexity`)
- Paste code
- AI analyzes: cyclomatic complexity, cognitive complexity, nesting depth
- Suggests refactoring opportunities
- Rates overall maintainability

---

## PHASE 4 — Reference Pages (Static Content, No API)

### 48. HTTP Status Codes (`/tools/ref/http-status`)
- Searchable list of all HTTP status codes
- Group by category (1xx, 2xx, 3xx, 4xx, 5xx)
- Each code shows: number, name, description, common use case
- Click to expand for more detail

### 49. MIME Types Reference (`/tools/ref/mime-types`)
- Searchable table of common MIME types
- Filter by category (text, image, audio, video, application)
- Show: MIME type, extension(s), description

### 50. Git Cheatsheet (`/tools/ref/git`)
- Categorized git commands: basics, branching, merging, stashing, remote, undoing, config
- Search/filter
- Copy command button
- Brief explanation + example for each

### 51. Keyboard Shortcuts Reference (`/tools/ref/shortcuts`)
- Tabs: VS Code, Chrome DevTools, Terminal, Vim, GitHub
- Searchable
- OS toggle (Mac ⌘ vs Windows Ctrl)

### 52. Design Patterns Reference (`/tools/ref/design-patterns`)
- Creational, Structural, Behavioral patterns
- Each pattern: name, intent, when to use, code example (TypeScript), diagram
- Searchable

### 53. Big-O Cheatsheet (`/tools/ref/big-o`)
- Table of common data structures and their operation complexities
- Sorting algorithms comparison
- Visual complexity graph (use a simple chart)
- Space complexity included

---

## PHASE 5 — Chat Enhancements (Modify Existing Chat System)

These features enhance the existing `/analyze` chat page. Modify the existing chat components and API routes.

### 54. Chat Slash Commands
Add these commands that users can type in the chat input:
- `/search <query>` — trigger DuckDuckGo search (already exists, formalize it)
- `/analyze <github-url>` — trigger repo analysis (already exists, formalize it)
- `/translate <source> <target>` — translate code between languages
- `/review` — review the last code block in chat
- `/commit` — generate a commit message from the last code block
- `/explain` — explain the last code block
- `/simplify` — simplify the last code block
- Show a slash command menu/autocomplete when user types `/`

### 55. Chat Code Blocks Enhancement
- Add a "Run" button on JavaScript/TypeScript/HTML code blocks (run in sandboxed iframe)
- Add a "Copy" button on all code blocks
- Add syntax highlighting theme selector
- Add "Send to Playground" button that opens the code in `/tools/playground`

### 56. Chat Export
- Export chat as Markdown (.md)
- Export chat as PDF (use browser print or `html2canvas` + `jspdf`)
- Export chat as JSON
- Share chat via generated link (store in Firestore with a public read rule for shared chats)

### 57. Prompt Templates
- Predefined prompt templates accessible via a button/dropdown in the chat:
  - "Review this code for bugs and security issues"
  - "Explain this code step by step"
  - "Optimize this code for performance"
  - "Write unit tests for this code"
  - "Convert this to TypeScript"
  - "Add error handling to this code"
  - "Document this code with JSDoc comments"
- Users can save custom prompt templates (store in Firestore per user)

---

## PHASE 6 — Tools Hub & Navigation

### 58. Tools Hub Page (`/tools/page.tsx`)
- Grid of cards, each showing: icon (use Lucide icons), tool name, short description, category badge
- Category filter tabs: All, Utilities, Converters, Generators, AI Tools, API Tools, Reference
- Search bar to filter tools
- "New" badge on recently added tools
- Responsive: 3 columns desktop, 2 tablet, 1 mobile

### 59. Navigation Update
- Add "Tools" link to the main navbar between existing links
- Add a mega-menu or dropdown showing tool categories on hover/click
- Mobile: add Tools to the mobile menu

### 60. Landing Page Update (`/`)
- Add a "Developer Tools" section showcasing 6-8 featured tools with icons and links
- Add tool count badge ("50+ Free Developer Tools")
- Update the hero section tagline to reflect the expanded scope

---

## Implementation Order

1. **Phase 6 first** — Tools Hub page and navigation (so new tools have a home)
2. **Phase 1** — Client-side utilities (no API dependencies, fastest to build)
3. **Phase 4** — Reference pages (static content, fast)
4. **Phase 2** — API-powered tools (need API routes)
5. **Phase 3** — AI-powered tools (reuse existing OpenRouter infra)
6. **Phase 5** — Chat enhancements (modifying existing code, most delicate)

## Important Notes
- Run `npm run build` after each phase to catch TypeScript errors.
- Test each tool individually before moving to the next.
- Keep bundle size in mind — lazy load tool pages with `next/dynamic` if they use heavy libraries like Monaco Editor.
- Add proper `<title>` and `<meta description>` tags to every tool page for SEO.
- Add a consistent "back to tools" breadcrumb on every tool page.
- Every tool page should have a brief description at the top explaining what it does.
