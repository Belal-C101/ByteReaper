# 🔥 ByteReaper

<div align="center">

![ByteReaper Logo](https://img.shields.io/badge/🦴-ByteReaper-8B5CF6?style=for-the-badge&labelColor=1F2937)

**AI-Powered Code Analysis for GitHub Repositories**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Google Gemini](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

[Demo](#demo) • [Features](#features) • [Quick Start](#quick-start) • [Architecture](#architecture) • [API](#api)

</div>

---

## 📋 Overview

ByteReaper is an AI Developer Agent that analyzes GitHub repositories and produces professional engineering reports. It helps developers improve their codebases by detecting bugs, security issues, performance bottlenecks, and providing actionable recommendations.

### What ByteReaper Does

1. **Reads & Inspects** - Fetches repository structure and key files
2. **Understands** - Detects tech stack, architecture, and dependencies
3. **Analyzes** - Uses AI to identify issues across 6 categories
4. **Reports** - Generates prioritized findings with severity ratings
5. **Suggests** - Provides specific, actionable fixes

## ✨ Features

### Analysis Dimensions

| Category | What It Checks |
|----------|----------------|
| 🔧 **Code Quality** | Code smells, naming conventions, duplication, error handling |
| 🛡️ **Security** | Hardcoded secrets, injection risks, auth vulnerabilities |
| ⚡ **Performance** | N+1 queries, memory leaks, inefficient algorithms |
| 📦 **Architecture** | Project structure, modularity, separation of concerns |
| 📝 **Documentation** | README quality, code comments, API documentation |
| 🧪 **Testing** | Test coverage indicators, testing best practices |

### Key Features

- ✅ **Health Score** - Overall repository score from 0-100
- ✅ **Severity Ranking** - Critical / High / Medium / Low classifications
- ✅ **Tech Stack Detection** - Languages, frameworks, tools, CI/CD
- ✅ **File-Level Findings** - Specific file and line references
- ✅ **Executive Summary** - Non-technical overview for stakeholders
- ✅ **Dark Mode** - Professional developer aesthetic
- ✅ **Responsive Design** - Works on desktop and mobile
- ✅ **100% Free** - Uses free API tiers

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Google Gemini API key (free)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/bytereaper.git
cd bytereaper

# 2. Generate source files
node generate-source.js

# 3. Install dependencies
npm install

# 4. Setup environment variables
cp .env.example .env.local

# 5. Add your Gemini API key to .env.local
# GEMINI_API_KEY=your_key_here

# 6. Start the development server
npm run dev

# 7. Open http://localhost:3000
```

### Getting API Keys

#### Google Gemini API (Required)

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key to `.env.local`

**Free Tier Limits:**
- 60 requests per minute
- 1 million tokens per day
- No credit card required

#### GitHub Token (Optional)

Without a token: 60 API requests/hour
With a token: 5,000 API requests/hour

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token (classic)
3. Select scope: `public_repo`
4. Copy to `.env.local`

## 🏗️ Architecture

### Tech Stack

| Layer | Technology | Why |
|-------|------------|-----|
| Frontend | Next.js 14 (App Router) | SSR, great DX, easy deployment |
| Styling | Tailwind CSS + shadcn/ui | Beautiful, accessible components |
| AI | Google Gemini 1.5 Flash | Best free tier, good code understanding |
| Database | SQLite (better-sqlite3) | Zero-cost, portable, fast |
| GitHub | Octokit | Official GitHub API client |

### Project Structure

```
bytereaper/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API routes
│   │   ├── analyze/            # Analysis input page
│   │   └── report/[id]/        # Report view page
│   ├── components/
│   │   ├── ui/                 # shadcn/ui components
│   │   ├── landing/            # Landing page components
│   │   ├── analyze/            # Analysis form components
│   │   ├── report/             # Report display components
│   │   └── shared/             # Shared components
│   ├── lib/
│   │   ├── github/             # GitHub API integration
│   │   ├── ai/                 # Gemini AI integration
│   │   ├── analysis/           # Analysis engine
│   │   ├── db/                 # Database layer
│   │   └── utils/              # Utilities
│   └── types/                  # TypeScript types
├── public/                     # Static assets
└── data/                       # SQLite database
```

### Analysis Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   User       │────▶│   GitHub     │────▶│   Parse      │
│   Input URL  │     │   Fetch      │     │   Files      │
└──────────────┘     └──────────────┘     └──────────────┘
                                                 │
                                                 ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Generate   │◀────│   AI         │◀────│   Build      │
│   Report     │     │   Analysis   │     │   Prompt     │
└──────────────┘     └──────────────┘     └──────────────┘
```

## 📡 API

### POST /api/analyze

Start a repository analysis.

**Request:**
```json
{
  "owner": "facebook",
  "repo": "react"
}
```

**Response:**
```json
{
  "success": true,
  "id": "abc123xyz",
  "scores": {
    "overall": 85,
    "codeQuality": 88,
    "security": 82,
    "performance": 84,
    "architecture": 90,
    "documentation": 78,
    "testing": 85
  },
  "findingsCount": 12
}
```

### GET /api/report/[id]

Retrieve a generated report.

**Response:**
```json
{
  "id": "abc123xyz",
  "repoUrl": "https://github.com/facebook/react",
  "repoInfo": { ... },
  "techStack": { ... },
  "scores": { ... },
  "findings": [ ... ],
  "summary": { ... },
  "metadata": { ... }
}
```

## 🎨 Screenshots

### Landing Page
Modern dark theme with gradient effects and clear CTAs.

### Analysis Form
Simple input with example repositories and progress tracking.

### Report Dashboard
- Score ring visualization
- Score breakdown by category
- Tech stack badges
- Expandable findings with severity badges
- Executive summary with strengths/concerns/recommendations

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `GITHUB_TOKEN` | No | GitHub PAT for higher rate limits |
| `NEXT_PUBLIC_APP_URL` | No | App URL (defaults to localhost) |
| `DATABASE_URL` | No | SQLite path (defaults to ./data/bytereaper.db) |

### Analysis Limits

| Limit | Value | Reason |
|-------|-------|--------|
| Max files analyzed | 50 | API token limits |
| Max file size | 100KB | Prevent large binary files |
| Analysis timeout | 2 min | Vercel function limit |

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or use Vercel CLI
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Scoring System

| Score Range | Label | Description |
|-------------|-------|-------------|
| 90-100 | Excellent | Production-ready, follows best practices |
| 80-89 | Good | Minor improvements possible |
| 70-79 | Fair | Some issues need attention |
| 60-69 | Needs Work | Multiple issues to address |
| 40-59 | Poor | Significant problems |
| 0-39 | Critical | Major refactoring needed |

### Score Weights

```
Overall = (
  Code Quality × 30% +
  Security × 25% +
  Architecture × 20% +
  Documentation × 15% +
  Testing × 10%
)
```

## ⚠️ Limitations

- **Public repos only** (in free version)
- **Sampling-based** - Analyzes up to 50 key files
- **AI uncertainty** - Results may vary between runs
- **No code execution** - Static analysis only
- **Rate limits** - GitHub (60/hr) and Gemini (60/min) free tier limits

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Google Gemini](https://ai.google.dev/) - AI analysis
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API

---

<div align="center">

**Built with 💀 by ByteReaper**

[Report Bug](https://github.com/yourusername/bytereaper/issues) • [Request Feature](https://github.com/yourusername/bytereaper/issues)

</div>
