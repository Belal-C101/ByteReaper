export interface HttpStatusItem {
  code: number;
  name: string;
  description: string;
  useCase: string;
}

export const HTTP_STATUS_CODES: HttpStatusItem[] = [
  { code: 100, name: "Continue", description: "Initial request accepted; continue sending body.", useCase: "Large uploads" },
  { code: 101, name: "Switching Protocols", description: "Server switches protocol requested by client.", useCase: "WebSocket upgrade" },
  { code: 200, name: "OK", description: "Request succeeded.", useCase: "Standard GET response" },
  { code: 201, name: "Created", description: "Resource successfully created.", useCase: "POST create endpoint" },
  { code: 202, name: "Accepted", description: "Request accepted for processing.", useCase: "Async job enqueue" },
  { code: 204, name: "No Content", description: "Success with no response body.", useCase: "DELETE responses" },
  { code: 301, name: "Moved Permanently", description: "Resource permanently moved.", useCase: "Canonical redirect" },
  { code: 302, name: "Found", description: "Temporary redirect.", useCase: "Post-auth redirect" },
  { code: 304, name: "Not Modified", description: "Cached resource is still valid.", useCase: "Conditional GET with ETag" },
  { code: 307, name: "Temporary Redirect", description: "Temporary redirect preserving method.", useCase: "Maintenance redirection" },
  { code: 308, name: "Permanent Redirect", description: "Permanent redirect preserving method.", useCase: "HTTP to HTTPS migration" },
  { code: 400, name: "Bad Request", description: "Malformed client request.", useCase: "Validation failures" },
  { code: 401, name: "Unauthorized", description: "Authentication required or invalid.", useCase: "Missing access token" },
  { code: 403, name: "Forbidden", description: "Client lacks authorization.", useCase: "Role-based access denial" },
  { code: 404, name: "Not Found", description: "Resource does not exist.", useCase: "Invalid route ID" },
  { code: 405, name: "Method Not Allowed", description: "HTTP method not supported.", useCase: "POST on read-only endpoint" },
  { code: 409, name: "Conflict", description: "Request conflicts with current state.", useCase: "Duplicate unique record" },
  { code: 410, name: "Gone", description: "Resource intentionally removed.", useCase: "Deprecated endpoint" },
  { code: 422, name: "Unprocessable Content", description: "Semantically invalid payload.", useCase: "Domain-level validation" },
  { code: 429, name: "Too Many Requests", description: "Rate limit exceeded.", useCase: "API throttling" },
  { code: 500, name: "Internal Server Error", description: "Unexpected server failure.", useCase: "Unhandled exception" },
  { code: 501, name: "Not Implemented", description: "Server does not support functionality.", useCase: "Endpoint stub" },
  { code: 502, name: "Bad Gateway", description: "Invalid upstream response.", useCase: "Proxy failure" },
  { code: 503, name: "Service Unavailable", description: "Server unavailable or overloaded.", useCase: "Planned downtime" },
  { code: 504, name: "Gateway Timeout", description: "Upstream timeout.", useCase: "Slow dependency" },
];

export interface MimeTypeItem {
  mime: string;
  extensions: string;
  category: "text" | "image" | "audio" | "video" | "application";
  description: string;
}

export const MIME_TYPES: MimeTypeItem[] = [
  { mime: "text/plain", extensions: ".txt", category: "text", description: "Plain text" },
  { mime: "text/html", extensions: ".html", category: "text", description: "HTML document" },
  { mime: "text/css", extensions: ".css", category: "text", description: "Stylesheet" },
  { mime: "application/javascript", extensions: ".js", category: "application", description: "JavaScript" },
  { mime: "application/json", extensions: ".json", category: "application", description: "JSON data" },
  { mime: "application/xml", extensions: ".xml", category: "application", description: "XML document" },
  { mime: "image/png", extensions: ".png", category: "image", description: "PNG image" },
  { mime: "image/jpeg", extensions: ".jpg, .jpeg", category: "image", description: "JPEG image" },
  { mime: "image/svg+xml", extensions: ".svg", category: "image", description: "SVG image" },
  { mime: "audio/mpeg", extensions: ".mp3", category: "audio", description: "MP3 audio" },
  { mime: "audio/ogg", extensions: ".ogg", category: "audio", description: "Ogg audio" },
  { mime: "video/mp4", extensions: ".mp4", category: "video", description: "MP4 video" },
  { mime: "video/webm", extensions: ".webm", category: "video", description: "WebM video" },
  { mime: "application/pdf", extensions: ".pdf", category: "application", description: "PDF document" },
  { mime: "application/zip", extensions: ".zip", category: "application", description: "ZIP archive" },
  { mime: "application/vnd.ms-excel", extensions: ".xls", category: "application", description: "Legacy Excel" },
  { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensions: ".xlsx", category: "application", description: "Modern Excel" },
  { mime: "application/octet-stream", extensions: "any", category: "application", description: "Generic binary" },
];

export interface GitCommandItem {
  category: "Basics" | "Branching" | "Merging" | "Stashing" | "Remote" | "Undo" | "Config";
  command: string;
  explanation: string;
  example: string;
}

export const GIT_COMMANDS: GitCommandItem[] = [
  { category: "Basics", command: "git status", explanation: "Show working tree status.", example: "git status" },
  { category: "Basics", command: "git add", explanation: "Stage file changes.", example: "git add src/app.tsx" },
  { category: "Basics", command: "git commit", explanation: "Commit staged changes.", example: "git commit -m \"feat: add tools hub\"" },
  { category: "Branching", command: "git branch", explanation: "List or create branches.", example: "git branch feature/tools" },
  { category: "Branching", command: "git switch", explanation: "Switch branches.", example: "git switch main" },
  { category: "Merging", command: "git merge", explanation: "Merge another branch.", example: "git merge feature/tools" },
  { category: "Merging", command: "git rebase", explanation: "Reapply commits on top of another base.", example: "git rebase main" },
  { category: "Stashing", command: "git stash", explanation: "Save uncommitted changes temporarily.", example: "git stash push -m \"wip tools\"" },
  { category: "Stashing", command: "git stash pop", explanation: "Reapply latest stash.", example: "git stash pop" },
  { category: "Remote", command: "git fetch", explanation: "Download objects and refs.", example: "git fetch origin" },
  { category: "Remote", command: "git pull", explanation: "Fetch and merge remote branch.", example: "git pull --rebase" },
  { category: "Remote", command: "git push", explanation: "Upload commits to remote.", example: "git push -u origin feature/tools" },
  { category: "Undo", command: "git restore", explanation: "Discard local file changes.", example: "git restore src/app/page.tsx" },
  { category: "Undo", command: "git reset --soft", explanation: "Move HEAD while keeping staged changes.", example: "git reset --soft HEAD~1" },
  { category: "Config", command: "git config", explanation: "Set Git configuration values.", example: "git config --global user.name \"Your Name\"" },
];

export interface ShortcutItem {
  scope: "VS Code" | "Chrome DevTools" | "Terminal" | "Vim" | "GitHub";
  action: string;
  windows: string;
  mac: string;
}

export const SHORTCUTS: ShortcutItem[] = [
  { scope: "VS Code", action: "Command Palette", windows: "Ctrl+Shift+P", mac: "Cmd+Shift+P" },
  { scope: "VS Code", action: "Quick Open", windows: "Ctrl+P", mac: "Cmd+P" },
  { scope: "VS Code", action: "Format document", windows: "Shift+Alt+F", mac: "Shift+Option+F" },
  { scope: "Chrome DevTools", action: "Toggle DevTools", windows: "Ctrl+Shift+I", mac: "Cmd+Option+I" },
  { scope: "Chrome DevTools", action: "Search in all sources", windows: "Ctrl+Shift+F", mac: "Cmd+Option+F" },
  { scope: "Terminal", action: "Interrupt process", windows: "Ctrl+C", mac: "Ctrl+C" },
  { scope: "Terminal", action: "Clear terminal", windows: "Ctrl+L", mac: "Cmd+K" },
  { scope: "Vim", action: "Save file", windows: ":w", mac: ":w" },
  { scope: "Vim", action: "Quit file", windows: ":q", mac: ":q" },
  { scope: "GitHub", action: "Open file finder", windows: "t", mac: "t" },
  { scope: "GitHub", action: "Toggle blame", windows: "b", mac: "b" },
];

export interface PatternItem {
  category: "Creational" | "Structural" | "Behavioral";
  name: string;
  intent: string;
  whenToUse: string;
  example: string;
  diagram: string;
}

export const DESIGN_PATTERNS: PatternItem[] = [
  {
    category: "Creational",
    name: "Factory Method",
    intent: "Create objects through a common interface without exposing concrete classes.",
    whenToUse: "When object construction depends on runtime conditions.",
    example: "interface Parser { parse(input: string): unknown }\nclass JsonParser implements Parser { parse(input: string) { return JSON.parse(input); } }",
    diagram: "Client -> Factory -> Product",
  },
  {
    category: "Creational",
    name: "Singleton",
    intent: "Ensure a class has one instance and provide global access.",
    whenToUse: "For shared resources like configuration caches.",
    example: "class Config { private static instance: Config; static getInstance() { return this.instance ??= new Config(); } }",
    diagram: "Client -> Singleton (single instance)",
  },
  {
    category: "Structural",
    name: "Adapter",
    intent: "Convert one interface into another expected by clients.",
    whenToUse: "When integrating incompatible third-party APIs.",
    example: "class LegacyAdapter implements ModernAPI { constructor(private legacy: LegacyAPI) {} request() { return this.legacy.fetchData(); } }",
    diagram: "Client -> Adapter -> Legacy Service",
  },
  {
    category: "Structural",
    name: "Facade",
    intent: "Provide a simplified interface to a complex subsystem.",
    whenToUse: "When reducing onboarding complexity for subsystem consumers.",
    example: "class CheckoutFacade { async completeOrder() { await inventory.reserve(); await payment.charge(); await mail.send(); } }",
    diagram: "Client -> Facade -> Subsystem A/B/C",
  },
  {
    category: "Behavioral",
    name: "Observer",
    intent: "Define one-to-many dependency where subscribers react to changes.",
    whenToUse: "Event systems and UI state updates.",
    example: "subject.subscribe(listener); subject.notify(payload);",
    diagram: "Subject -> Observer 1/2/3",
  },
  {
    category: "Behavioral",
    name: "Strategy",
    intent: "Define interchangeable algorithms behind a common interface.",
    whenToUse: "When runtime selection among multiple policies is needed.",
    example: "context.setStrategy(new MergeSortStrategy()); context.execute(data);",
    diagram: "Context -> Strategy interface -> Concrete strategies",
  },
];

export interface BigOItem {
  structure: string;
  access: string;
  search: string;
  insert: string;
  delete: string;
  space: string;
}

export const BIG_O_TABLE: BigOItem[] = [
  { structure: "Array", access: "O(1)", search: "O(n)", insert: "O(n)", delete: "O(n)", space: "O(n)" },
  { structure: "Hash Table", access: "N/A", search: "O(1)", insert: "O(1)", delete: "O(1)", space: "O(n)" },
  { structure: "Binary Search Tree", access: "O(log n)", search: "O(log n)", insert: "O(log n)", delete: "O(log n)", space: "O(n)" },
  { structure: "Heap", access: "O(1)", search: "O(n)", insert: "O(log n)", delete: "O(log n)", space: "O(n)" },
  { structure: "Graph (Adj List)", access: "N/A", search: "O(V+E)", insert: "O(1)", delete: "O(V)", space: "O(V+E)" },
];

export const SORTING_COMPLEXITY = [
  { name: "Bubble", best: 1, average: 2, worst: 2, space: "O(1)" },
  { name: "Insertion", best: 1, average: 2, worst: 2, space: "O(1)" },
  { name: "Merge", best: 1.2, average: 1.2, worst: 1.2, space: "O(n)" },
  { name: "Quick", best: 1.2, average: 1.2, worst: 2, space: "O(log n)" },
  { name: "Heap", best: 1.2, average: 1.2, worst: 1.2, space: "O(1)" },
];
