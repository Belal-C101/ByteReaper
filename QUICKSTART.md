# 🚀 Quick Start Guide

## For Local Development

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/bytereaper.git
cd bytereaper
npm install
```

### 2. Setup Firebase Auth

```bash
npm run setup:firebase
```

This will:
- Install Firebase SDK
- Generate auth components
- Create login/signup pages

### 3. Configure Environment

Create `.env.local`:

```env
OPENROUTER_API_KEY=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
GITHUB_TOKEN=your_github_token_here
```

### 4. Run Development Server

```bash
npm run dev
```

Visit: http://localhost:3000

### 5. Create Account

1. Go to http://localhost:3000/signup
2. Sign up with email or Google
3. Start chatting!

---

## For Netlify Deployment

### 1. Check Deployment Readiness

```bash
npm run check-deploy
```

### 2. Push to GitHub

```bash
git add .
git commit -m "Production ready"
git push origin main
```

### 3. Deploy to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Select your GitHub repository
4. Add environment variables:
   - `OPENROUTER_API_KEY`
   - `GITHUB_TOKEN` (optional)
5. Click **"Deploy site"**

### 4. Configure Firebase

In [Firebase Console](https://console.firebase.google.com):

1. **Authentication** → **Settings** → **Authorized domains**
2. Add: `your-site.netlify.app`
3. **Firestore** → **Rules** → Paste from `firestore.rules` → **Publish**

### 5. Done! 🎉

Your app is live at: `https://your-site.netlify.app`

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build            # Build for production
npm start                # Start production server locally

# Setup
npm run setup:firebase   # Setup Firebase authentication
npm run check-deploy     # Check if ready for deployment

# Testing
npm run lint             # Run ESLint
node test-api.js         # Test OpenRouter API
```

---

## Troubleshooting

### "Module not found: 'firebase'"

```bash
npm install firebase
```

### "Cannot find module '@/contexts/AuthContext'"

```bash
npm run setup:firebase
```

### Hydration errors in console

This is caused by browser extensions (Dark Reader). It's harmless and won't affect users without the extension.

### Chat not saving

1. Check Firestore rules are published
2. Verify user is authenticated
3. Check browser console for errors

---

## Documentation

- **[README.md](README.md)** - Project overview
- **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** - Auth setup guide
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Netlify deployment
- **[PRODUCTION_READY.md](PRODUCTION_READY.md)** - Pre-launch summary

---

## Support

- Check the documentation files above
- Review the troubleshooting section
- Check Firebase Console for errors
- Verify environment variables

---

**Ready to deploy?** Run: `npm run check-deploy`
