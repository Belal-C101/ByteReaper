# 🦴 ByteReaper - AI Developer Assistant

<div align="center">

![ByteReaper](https://img.shields.io/badge/ByteReaper-AI%20Developer%20Assistant-purple?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript)
![OpenRouter](https://img.shields.io/badge/OpenRouter-AI-green?style=for-the-badge)
![Firebase](https://img.shields.io/badge/Firebase-Auth-orange?style=for-the-badge&logo=firebase)
[![Netlify Status](https://img.shields.io/badge/Netlify-Ready-00C7B7?style=for-the-badge&logo=netlify)](https://bytereaper.netlify.app)

**Your AI-powered developer companion. Chat with multiple AI models, analyze code, search the web, and review repositories.**

[Live Demo](https://bytereaper.netlify.app) • [Features](#features) • [Getting Started](#getting-started) • [Deploy](#deployment)

</div>

---

## ✨ Features

### 🤖 Multi-Model AI Chat
- **7 Free AI Models** via OpenRouter:
  - 🎲 Auto (recommended) - Automatically routes to best available model
  - ⚡ Nvidia Nemotron 120B - Powerful reasoning
  - 🚀 MiniMax M2.5 - Fast responses
  - 🧠 StepFun 3.5 Flash - Advanced reasoning (196B MoE)
  - 🎨 Arcee Trinity - Creative tasks (400B MoE)
  - 💭 Liquid LFM 1.2B Thinking - Deep reasoning
  - 📝 Liquid LFM 1.2B Instruct - Instruction following
- Switch models on the fly
- Context-aware responses
- Code explanation and generation

### 🔐 User Authentication
- Email/password authentication
- Google OAuth sign-in
- Protected chat interface
- Persistent user sessions
- Secure Firebase backend

### 💾 Chat History
- Auto-save conversations to Firestore
- Chat sessions per user
- Resume previous conversations
- Never lose your work

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
- OpenRouter API key (free)
- Firebase project (free)

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

# Setup Firebase authentication
node setup-firebase.js

# Create environment file
cp .env.example .env.local

# Add your API keys to .env.local
# OPENROUTER_API_KEY=your_key_here
# GITHUB_TOKEN=your_token_here (optional)

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account!

---

## 🔑 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key ([Get free key](https://openrouter.ai/keys)) |
| `GITHUB_TOKEN` | No | GitHub Personal Access Token (increases rate limits) |

**Note:** Firebase configuration is stored in `src/lib/firebase.ts` (not in .env)

---

## 🔥 Firebase Setup

Firebase is used for:
- User authentication (email/password + Google OAuth)
- Firestore database for chat history
- Secure user data isolation

The `setup-firebase.js` script automatically:
1. Installs Firebase SDK
2. Creates authentication UI components
3. Sets up AuthContext and ProtectedRoute
4. Generates login and signup pages

**Firestore Collections:**
- `users` - User profiles (uid, email, displayName, createdAt)
- `chatSessions` - Chat metadata (userId, title, model, timestamp)
- `chatMessages` - Individual messages (sessionId, userId, role, content)

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

### Model Selection
- Click the model selector in the top-right of the chat
- Choose from 7 free AI models
- Models have different strengths (fast, powerful, thinking, creative)
- Default "Auto" mode picks the best available model

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: OpenRouter (7 free models)
- **Auth**: Firebase Authentication
- **Database**: Firestore
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
│   │   ├── analyze/        # Chat interface page (protected)
│   │   ├── login/          # Login page
│   │   ├── signup/         # Signup page
│   │   └── report/         # Analysis report page
│   ├── components/         # React components
│   │   ├── auth/          # Auth components (ProtectedRoute)
│   │   ├── chat/          # Chat interface
│   │   ├── landing/       # Landing page
│   │   ├── report/        # Report components
│   │   └── ui/            # shadcn/ui components
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx # Authentication context
│   ├── lib/               # Core logic
│   │   ├── ai/            # OpenRouter integration
│   │   ├── search/        # DuckDuckGo search
│   │   ├── github/        # GitHub API
│   │   ├── analysis/      # Code analysis
│   │   ├── firebase.ts    # Firebase config
│   │   ├── auth.ts        # Auth functions
│   │   └── chat-history.ts # Firestore operations
│   └── types/             # TypeScript types
├── public/                # Static assets
├── setup-firebase.js      # Firebase setup script
└── package.json
```

---

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `OPENROUTER_API_KEY`
   - `GITHUB_TOKEN` (optional)
4. Deploy!

### Firebase Security Rules

Add these Firestore rules to protect user data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can only read/write their own chat sessions
    match /chatSessions/{sessionId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
    
    // Users can only read/write their own chat messages
    match /chatMessages/{messageId} {
      allow read, write: if request.auth != null && 
                           resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

---

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

---

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai) - Free AI model access
- [Firebase](https://firebase.google.com) - Authentication & Database
- [DuckDuckGo](https://duckduckgo.com) - Free web search
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Next.js](https://nextjs.org) - React framework

---

<div align="center">

**Built with 💜 by ByteReaper Team**

</div>