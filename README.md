# 🦴 ByteReaper - AI Developer Assistant

<div align="center">

![ByteReaper](https://img.shields.io/badge/ByteReaper-AI%20Developer%20Assistant-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![Gemini](https://img.shields.io/badge/Gemini-AI-green?style=for-the-badge)

**Your AI-powered developer companion. Chat, analyze code, search the web, and review repositories.**

[Live Demo](#) • [Features](#features) • [Getting Started](#getting-started) • [API](#api)

</div>

---

## ✨ Features

### 🤖 AI Chat Assistant
- Natural conversation interface
- Context-aware responses
- Code explanation and generation
- Debugging assistance

### 📁 File Upload & Analysis
- Drag & drop file support
- Support for 20+ programming languages
- Instant code review
- Security vulnerability detection

### 🔍 Web Search
- Built-in DuckDuckGo search (free, no API key)
- Search for documentation
- Find tutorials and solutions
- Research best practices

### 📊 GitHub Repository Analysis
- Analyze public repositories
- Code quality scoring
- Architecture review
- Security findings
- Performance recommendations

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Google Gemini API key (free)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/bytereaper.git
cd bytereaper

# Install dependencies
npm install

# Generate source files (if not present)
node generate-source.js
node generate-v2-features.js

# Create environment file
cp .env.example .env.local

# Add your API keys to .env.local
# GEMINI_API_KEY=your_key_here
# GITHUB_TOKEN=your_token_here (optional)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key ([Get free key](https://makersuite.google.com/app/apikey)) |
| `GITHUB_TOKEN` | No | GitHub Personal Access Token (increases rate limits) |

---

## 💬 Usage Examples

### Chat Commands

```
"Explain this code: [paste code]"
"Search for React hooks best practices"
"Analyze github.com/facebook/react"
"Review this file for security issues"
"Help me debug this error: [error message]"
"Write a function that [description]"
```

### File Upload
- Drag and drop files into the chat
- Supports: .js, .ts, .py, .java, .cpp, .go, .rs, .rb, .php, and more
- Image support for diagrams and screenshots

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Google Gemini 1.5 Flash
- **Search**: DuckDuckGo (free)
- **GitHub**: Octokit

---

## 📁 Project Structure

```
bytereaper/
├── src/
│   ├── app/                 # Next.js pages
│   │   ├── api/            # API routes
│   │   │   ├── chat/       # Chat & streaming endpoints
│   │   │   ├── search/     # Web search endpoint
│   │   │   └── analyze/    # Repo analysis endpoint
│   │   ├── analyze/        # Chat interface page
│   │   └── report/         # Analysis report page
│   ├── components/         # React components
│   │   ├── chat/          # Chat interface
│   │   ├── landing/       # Landing page
│   │   ├── report/        # Report components
│   │   └── ui/            # shadcn/ui components
│   ├── lib/               # Core logic
│   │   ├── ai/            # Gemini integration
│   │   ├── search/        # DuckDuckGo search
│   │   ├── github/        # GitHub API
│   │   └── analysis/      # Code analysis
│   └── types/             # TypeScript types
├── public/                # Static assets
└── package.json
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI model
- [DuckDuckGo](https://duckduckgo.com) - Free web search
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Next.js](https://nextjs.org) - React framework

---

<div align="center">

**Built with 💜 by ByteReaper Team**

</div>