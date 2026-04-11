export type ToolCategory =
  | "Utilities"
  | "Converters"
  | "Generators"
  | "AI Tools"
  | "API Tools"
  | "Reference";

export type ToolIcon =
  | "Braces"
  | "Regex"
  | "Binary"
  | "KeyRound"
  | "Fingerprint"
  | "Hash"
  | "GitCompare"
  | "Clock3"
  | "Link2"
  | "FileCode2"
  | "Text"
  | "ShieldCheck"
  | "Palette"
  | "Ruler"
  | "LockKeyhole"
  | "CalendarClock"
  | "Calculator"
  | "NotebookPen"
  | "Database"
  | "Rows3"
  | "QrCode"
  | "Image"
  | "PanelsTopLeft"
  | "HardDrive"
  | "Globe"
  | "MapPin"
  | "Waypoints"
  | "ShieldAlert"
  | "PackageSearch"
  | "FlaskConical"
  | "Newspaper"
  | "TrendingUp"
  | "CircleHelp"
  | "CloudCog"
  | "Camera"
  | "GitCommitHorizontal"
  | "BookMarked"
  | "Languages"
  | "Bug"
  | "TableProperties"
  | "ScrollText"
  | "ScanSearch"
  | "BriefcaseBusiness"
  | "Map"
  | "FileClock"
  | "Layers"
  | "Gauge"
  | "Server"
  | "FileType"
  | "GitBranch"
  | "Keyboard"
  | "Blocks"
  | "ChartNoAxesCombined";

export interface ToolDefinition {
  slug: string;
  title: string;
  description: string;
  category: ToolCategory;
  icon: ToolIcon;
  isNew?: boolean;
  featured?: boolean;
}

export const TOOL_CATEGORIES: Array<"All" | ToolCategory> = [
  "All",
  "Utilities",
  "Converters",
  "Generators",
  "AI Tools",
  "API Tools",
  "Reference",
];

export const TOOLS: ToolDefinition[] = [
  { slug: "json-formatter", title: "JSON Formatter & Validator", description: "Format, minify, validate, and inspect JSON with tree view.", category: "Utilities", icon: "Braces", featured: true },
  { slug: "regex-tester", title: "Regex Tester", description: "Live regex matching with flags, captures, and common patterns.", category: "Utilities", icon: "Regex", featured: true },
  { slug: "base64", title: "Base64 Encoder/Decoder", description: "Encode and decode text and files to and from Base64.", category: "Converters", icon: "Binary", featured: true },
  { slug: "jwt-decoder", title: "JWT Decoder", description: "Decode JWT header and payload with claim explanations.", category: "Utilities", icon: "KeyRound" },
  { slug: "uuid-generator", title: "UUID Generator", description: "Generate and validate UUIDs including bulk and nil mode.", category: "Generators", icon: "Fingerprint" },
  { slug: "hash-generator", title: "Hash Generator", description: "Create MD5 and SHA hashes for text or uploaded files.", category: "Utilities", icon: "Hash", featured: true },
  { slug: "diff-viewer", title: "Diff Viewer", description: "Compare two texts and inspect color-coded unified diffs.", category: "Utilities", icon: "GitCompare" },
  { slug: "timestamp", title: "Unix Timestamp Converter", description: "Convert timestamps to dates and back with timezone support.", category: "Converters", icon: "Clock3" },
  { slug: "url-encoder", title: "URL Encoder/Decoder", description: "Encode/decode URLs and edit URL components interactively.", category: "Converters", icon: "Link2" },
  { slug: "html-entities", title: "HTML Entity Encoder/Decoder", description: "Convert special characters to named or numeric entities.", category: "Converters", icon: "FileCode2" },
  { slug: "lorem-ipsum", title: "Lorem Ipsum Generator", description: "Generate placeholder copy including developer-themed text.", category: "Generators", icon: "Text" },
  { slug: "password-generator", title: "Password Generator", description: "Generate secure passwords with strength scoring.", category: "Generators", icon: "ShieldCheck", featured: true },
  { slug: "color", title: "Color Tools", description: "Convert colors, check contrast, build palettes and gradients.", category: "Utilities", icon: "Palette", featured: true },
  { slug: "css-units", title: "CSS Unit Converter", description: "Convert between px, rem, em, vh, vw, %, and pt.", category: "Converters", icon: "Ruler" },
  { slug: "chmod", title: "Chmod Calculator", description: "Visual Unix permission calculator for numeric and symbolic modes.", category: "Utilities", icon: "LockKeyhole" },
  { slug: "cron", title: "Crontab Translator", description: "Translate cron expressions and preview next run times.", category: "Utilities", icon: "CalendarClock" },
  { slug: "base-converter", title: "Number Base Converter", description: "Convert numbers between bases and run bitwise operations.", category: "Converters", icon: "Calculator" },
  { slug: "markdown", title: "Markdown Editor & Preview", description: "Split-pane markdown editing with export to HTML.", category: "Utilities", icon: "NotebookPen" },
  { slug: "sql-formatter", title: "SQL Formatter", description: "Format SQL queries across popular database dialects.", category: "Utilities", icon: "Database" },
  { slug: "data-converter", title: "Data Converter Hub", description: "Convert between JSON, YAML, CSV, XML, and TOML.", category: "Converters", icon: "Rows3" },
  { slug: "qr-code", title: "QR Code Generator", description: "Generate downloadable QR codes with style controls.", category: "Generators", icon: "QrCode" },
  { slug: "image-base64", title: "Image to Base64", description: "Convert images to Base64 with snippets and preview.", category: "Converters", icon: "Image" },
  { slug: "playground", title: "HTML/CSS/JS Playground", description: "Three-pane live coding playground with console capture.", category: "Utilities", icon: "PanelsTopLeft", featured: true },
  { slug: "bytes", title: "Byte/Unit Converter", description: "Convert data units and estimate transfer durations.", category: "Converters", icon: "HardDrive" },
  { slug: "api-tester", title: "HTTP Request Tester", description: "Send API requests with headers, body, and response metrics.", category: "API Tools", icon: "Globe", isNew: true },
  { slug: "ip-info", title: "IP & Network Info", description: "Lookup IP geo and ISP details with map visualization.", category: "API Tools", icon: "MapPin", isNew: true },
  { slug: "dns-lookup", title: "DNS Lookup", description: "Inspect DNS records for domains via public resolver APIs.", category: "API Tools", icon: "Waypoints", isNew: true },
  { slug: "ssl-checker", title: "SSL Certificate Checker", description: "Inspect certificate issuer, validity, SANs, and chain.", category: "API Tools", icon: "ShieldAlert", isNew: true },
  { slug: "npm-search", title: "NPM Package Search", description: "Search npm packages with Bundlephobia size insights.", category: "API Tools", icon: "PackageSearch", isNew: true },
  { slug: "pypi-search", title: "PyPI Package Search", description: "Lookup Python package metadata and project links.", category: "API Tools", icon: "FlaskConical", isNew: true },
  { slug: "news", title: "Tech News Aggregator", description: "Browse top stories from Hacker News, Dev.to, and Reddit.", category: "API Tools", icon: "Newspaper", isNew: true },
  { slug: "github-trending", title: "GitHub Trending", description: "Discover trending repositories by language and period.", category: "API Tools", icon: "TrendingUp", isNew: true },
  { slug: "stackoverflow", title: "StackOverflow Search", description: "Find relevant questions and accepted answers quickly.", category: "API Tools", icon: "CircleHelp", isNew: true },
  { slug: "public-apis", title: "Public API Directory", description: "Filter and search free APIs by auth and category.", category: "API Tools", icon: "CloudCog", isNew: true },
  { slug: "site-preview", title: "Website Screenshot / Preview", description: "Generate page previews and inspect metadata.", category: "API Tools", icon: "Camera", isNew: true },
  { slug: "ai/commit-message", title: "Commit Message Generator", description: "Generate commit messages from changes in multiple styles.", category: "AI Tools", icon: "GitCommitHorizontal", isNew: true },
  { slug: "ai/readme-generator", title: "README Generator", description: "Generate polished README files with markdown preview.", category: "AI Tools", icon: "BookMarked", isNew: true },
  { slug: "ai/code-translator", title: "Code Translator", description: "Translate code between popular programming languages.", category: "AI Tools", icon: "Languages", isNew: true },
  { slug: "ai/error-explainer", title: "Error Explainer", description: "Explain stack traces and provide actionable fixes.", category: "AI Tools", icon: "Bug", isNew: true },
  { slug: "ai/sql-generator", title: "SQL Generator", description: "Create SQL from natural language and optional schemas.", category: "AI Tools", icon: "TableProperties", isNew: true },
  { slug: "ai/api-docs", title: "API Doc Generator", description: "Generate endpoint documentation in markdown or JSON.", category: "AI Tools", icon: "ScrollText", isNew: true },
  { slug: "ai/code-review", title: "Code Reviewer", description: "Get structured code review feedback by severity.", category: "AI Tools", icon: "ScanSearch", isNew: true },
  { slug: "ai/interview-questions", title: "Interview Question Generator", description: "Generate interview questions with model answers.", category: "AI Tools", icon: "BriefcaseBusiness", isNew: true },
  { slug: "ai/roadmap", title: "Learning Roadmap Generator", description: "Build phased learning roadmaps with free resources.", category: "AI Tools", icon: "Map", isNew: true },
  { slug: "ai/changelog", title: "Changelog Generator", description: "Turn logs into formatted changelogs by release type.", category: "AI Tools", icon: "FileClock", isNew: true },
  { slug: "ai/tech-stack", title: "Tech Stack Recommender", description: "Get free-first stack recommendations and trade-offs.", category: "AI Tools", icon: "Layers", isNew: true },
  { slug: "ai/complexity", title: "Code Complexity Analyzer", description: "Estimate complexity and suggest refactoring actions.", category: "AI Tools", icon: "Gauge", isNew: true },
  { slug: "ref/http-status", title: "HTTP Status Codes", description: "Search HTTP status codes grouped by class.", category: "Reference", icon: "Server" },
  { slug: "ref/mime-types", title: "MIME Types Reference", description: "Lookup MIME types by extension and category.", category: "Reference", icon: "FileType" },
  { slug: "ref/git", title: "Git Cheatsheet", description: "Browse common Git commands with examples.", category: "Reference", icon: "GitBranch" },
  { slug: "ref/shortcuts", title: "Keyboard Shortcuts", description: "Reference shortcuts for VS Code, GitHub, and more.", category: "Reference", icon: "Keyboard" },
  { slug: "ref/design-patterns", title: "Design Patterns", description: "Explore pattern intent, usage guidance, and examples.", category: "Reference", icon: "Blocks" },
  { slug: "ref/big-o", title: "Big-O Cheatsheet", description: "Compare algorithm and data structure complexity quickly.", category: "Reference", icon: "ChartNoAxesCombined" },
];

export const TOOL_COUNT = TOOLS.length;
