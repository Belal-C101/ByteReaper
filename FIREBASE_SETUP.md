# 🔥 Firebase Authentication & Chat History Setup Guide

## Overview

ByteReaper now includes complete user authentication and persistent chat history using Firebase!

## Features Added

✅ **User Authentication**
- Email/password signup and login
- Google OAuth sign-in
- Secure session management
- Protected routes (requires login to access chat)

✅ **Persistent Chat History**
- Auto-save every conversation to Firestore
- Chat sessions organized per user
- Never lose your chat history
- Resume conversations anytime

✅ **User Interface**
- Modern login/signup pages
- User info display in navbar
- Sign out functionality
- Protected chat interface

## Setup Instructions

### Quick Setup (Automated)

Run this single command to set up everything:

```bash
node setup-firebase.js
```

This script will:
1. Install Firebase SDK (`npm install firebase`)
2. Generate all authentication UI components
3. Create login and signup pages
4. Set up AuthContext and ProtectedRoute

### Manual Setup (if needed)

If the automated script doesn't work, run these commands:

```bash
# 1. Install Firebase
npm install firebase

# 2. Generate auth components
node generate-firebase-auth.js

# 3. Start the dev server
npm run dev
```

## What Was Created

### Core Firebase Files

1. **`src/lib/firebase.ts`**
   - Firebase initialization
   - Exports: `app`, `auth`, `googleProvider`, `db`
   - Uses your Firebase config

2. **`src/lib/auth.ts`**
   - `signUpWithEmail(email, password)` - Create new account
   - `signInWithEmail(email, password)` - Login with email
   - `signInWithGoogle()` - Google OAuth login
   - `signOut()` - Sign out current user

3. **`src/lib/chat-history.ts`**
   - `createChatSession(userId, title, model)` - Create new chat
   - `getChatSessions(userId)` - Get user's chat history
   - `getSessionMessages(sessionId, userId)` - Load chat messages
   - `saveMessage(sessionId, userId, message)` - Save a message
   - `deleteChatSession(sessionId, userId)` - Delete a chat
   - `updateSessionTitle(sessionId, userId, title)` - Rename chat

### UI Components

4. **`src/contexts/AuthContext.tsx`**
   - React context for authentication state
   - Provides `user`, `loading`, and auth functions
   - Use with: `const { user } = useAuth()`

5. **`src/components/auth/ProtectedRoute.tsx`**
   - Wrapper component for protected pages
   - Redirects to login if not authenticated
   - Shows loading state while checking auth

6. **`src/app/login/page.tsx`**
   - Beautiful login page
   - Email/password form
   - Google sign-in button
   - Link to signup page

7. **`src/app/signup/page.tsx`**
   - Beautiful signup page
   - Email/password registration
   - Google sign-in button
   - Link to login page

### Updated Files

8. **`src/app/layout.tsx`**
   - Wrapped with `<AuthProvider>`
   - Provides auth state to entire app

9. **`src/app/analyze/page.tsx`**
   - Wrapped with `<ProtectedRoute>`
   - Requires login to access chat

10. **`src/components/chat/chat-interface.tsx`**
    - Integrated with Firestore
    - Auto-saves all messages
    - Creates chat sessions automatically

11. **`src/components/shared/navbar.tsx`**
    - Shows user email when logged in
    - Sign out button
    - Login/signup buttons for guests

## Firebase Firestore Structure

```
firestore/
├── users/
│   └── {userId}
│       ├── uid: string
│       ├── email: string
│       ├── displayName: string?
│       ├── photoURL: string?
│       ├── createdAt: timestamp
│       └── lastLogin: timestamp
│
├── chatSessions/
│   └── {sessionId}
│       ├── userId: string
│       ├── title: string
│       ├── model: string
│       ├── createdAt: timestamp
│       ├── updatedAt: timestamp
│       └── messageCount: number
│
└── chatMessages/
    └── {messageId}
        ├── sessionId: string
        ├── userId: string
        ├── role: 'user' | 'assistant'
        ├── content: string
        ├── timestamp: timestamp
        ├── attachments?: FileAttachment[]
        └── searchResults?: SearchResult[]
```

## Firestore Security Rules

**IMPORTANT:** You must add security rules to protect user data!

### How to Add Security Rules

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **bytereaper**
3. Click **Firestore Database** in the left sidebar
4. Click the **Rules** tab
5. Copy the contents of `firestore.rules` file
6. Paste into the rules editor
7. Click **Publish**

The rules ensure:
- Users can only read/write their own data
- All operations require authentication
- Data validation for critical fields

## Testing Your Setup

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Create an Account

- Navigate to http://localhost:3000/signup
- Sign up with email/password OR click "Continue with Google"
- You'll be redirected to the chat interface

### 3. Test Chat Functionality

- Send a message in the chat
- The message is auto-saved to Firestore
- Check Firebase Console → Firestore Database to see your data

### 4. Test Persistence

- Refresh the page
- Your chat history should be preserved (future feature)
- Sign out and sign back in - data persists

### 5. Test Protected Routes

- Sign out (click sign out button in navbar)
- Try to access http://localhost:3000/analyze
- You should be redirected to /login
- Sign in to access the chat

## Troubleshooting

### "Cannot find module 'firebase'"

Run: `npm install firebase`

### "User is null" in useAuth()

Make sure your component is wrapped with `<AuthProvider>` in the component tree.

### Chat messages not saving

1. Check that user is authenticated: `console.log(user)`
2. Check browser console for Firestore errors
3. Verify Firestore security rules are published

### Google Sign-In not working

1. Enable Google sign-in in Firebase Console:
   - Authentication → Sign-in method → Google → Enable
2. Add authorized domains in Firebase Console

### "Permission denied" in Firestore

You need to publish the security rules from `firestore.rules` file.

## Environment Variables

Firebase config is in `src/lib/firebase.ts` (NOT in .env.local).

The config is already set up with your project credentials:
- API Key: AIzaSyBdg5wW7lk-vUgneNYjrKZz8XRjaZ1c4no
- Auth Domain: bytereaper.firebaseapp.com
- Project ID: bytereaper

## Next Steps

### Optional Enhancements

- [ ] Add password reset functionality
- [ ] Add email verification
- [ ] Add chat session list in sidebar
- [ ] Add "New Chat" button
- [ ] Add session title editing
- [ ] Add session deletion UI
- [ ] Add chat export functionality
- [ ] Add user profile settings page

### Deployment

When deploying to production:

1. Update Firestore security rules
2. Add your production domain to Firebase authorized domains
3. Enable Google sign-in for production
4. Consider upgrading Firebase plan if needed (free tier is generous)

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Firebase Console for errors
3. Verify all files were created correctly
4. Ensure Firebase SDK is installed
5. Check that security rules are published

## Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [OpenRouter Models](https://openrouter.ai/models)

---

**Your authentication system is ready! 🎉**

Run `npm run dev` and create your first account!
