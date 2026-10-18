# Migration Guide

## Hosting: Netlify → Vercel

### What changed
- **Host**: Deployed on Vercel (project `bytereaper`, https://bytereaper.vercel.app), Git-connected to `main`. The old Netlify site (bytereaber.netlify.app) no longer builds.
- **Removed**: `netlify.toml` and `@netlify/plugin-nextjs`
- **Headers**: The security and cache headers from `netlify.toml` now live in `next.config.js` `headers()`
- **Node**: `22.x` (`engines.node`)
- **Chat attachments**: Binary or large attachments are sent to `/api/chat/stream` as their Cloudinary URL (`cloudinaryUrl`) instead of base64, and the server fetches them (only from this account's `res.cloudinary.com` path). This keeps request bodies under Vercel's 4.5MB limit while still allowing 20MB files.
- **Reports**: Analysis reports are stored in Firestore (`analysis_reports`, Admin SDK only) instead of process memory, so `/report/[id]` works across serverless instances.

### Required setup
- All env vars from `.env.example` plus `NEXT_PUBLIC_APP_URL=https://bytereaper.vercel.app`, set in Vercel for Production, Preview, and Development
- Add `bytereaper.vercel.app` to Firebase Auth → Settings → Authorized domains

---

## Upload System: Imgur/tmpfiles → Cloudinary-only

### What changed
- **Removed**: All Imgur (`api.imgur.com`) and tmpfiles (`tmpfiles.org`) upload code
- **Single provider**: Cloudinary is now the only upload destination
- **Auth required**: The `/api/upload` route now requires a Firebase ID token (`Authorization: Bearer <token>`)
- **Server SDK**: Uploads use the official `cloudinary` Node.js SDK via `upload_stream`

### Files affected
- `src/lib/cloudinary.ts` — Rewritten; Cloudinary-only, delegates to `src/lib/cloudinary/server.ts`
- `src/app/api/upload/route.ts` — Rewritten; requires Firebase auth, Cloudinary SDK upload
- `src/app/api/upload/sign/route.ts` — **New**; generates signed upload params for direct browser→Cloudinary uploads
- `src/lib/uploads/client.ts` — **New**; client-side `uploadFile()` helper with auth
- `src/lib/cloudinary/server.ts` — **New**; Cloudinary v2 SDK wrapper (server-only)

### Required env vars
```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Breaking changes
- Any code that called `/api/upload` without an `Authorization` header will get a 401
- The `UploadResult.provider` type is now `'cloudinary'` only (was `'cloudinary' | 'imgur' | 'tmpfiles'`)
- Remove any `IMGUR_CLIENT_ID` from your `.env`

---

## Private Chat System (new)

### Overview
WhatsApp-style 1-to-1 private chat with:
- End-to-end encryption (libsodium: X25519 + XSalsa20-Poly1305)
- `@ByteReaper` AI mentions in conversations
- Agora voice calls
- Cloudinary file/image attachments

### New routes
| Route | Purpose |
|---|---|
| `/chat` | Private chat UI page |
| `/api/users/search` | Search users by username/email |
| `/api/conversations` | Create/list conversations |
| `/api/conversations/[id]/messages` | Send/fetch messages |
| `/api/chat/mention` | Handle @ByteReaper AI mentions |
| `/api/agora/token` | Generate Agora RTC tokens |

### New files
- `src/types/private-chat.ts` — TypeScript types for chat data model
- `src/lib/crypto/e2e.ts` — E2E encryption helpers (client-side)
- `src/app/chat/page.tsx` — Full chat UI with sidebar, messages, voice calls

### Firestore collections (new)
- `user_profiles/{uid}` — Username, public key, encryption metadata
- `usernames/{usernameLower}` — Username uniqueness reservation
- `conversations/{conversationId}` — Participant list, wrapped keys, metadata
- `conversations/{conversationId}/messages/{messageId}` — Encrypted messages
- `calls/{callId}` — Voice call signaling

### Required env vars (new)
```
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
AGORA_APP_ID=your-agora-app-id
AGORA_APP_CERTIFICATE=your-agora-certificate
NEXT_PUBLIC_AGORA_APP_ID=your-agora-app-id
```

### Firestore rules
Updated `firestore.rules` with rules for all new collections. Deploy with:
```bash
firebase deploy --only firestore:rules
```

### Headers
Updated security headers (now in `next.config.js`, previously `netlify.toml`):
- `Permissions-Policy`: `camera=(self), microphone=(self)` (was `camera=(), microphone=()`)
- Added `Cross-Origin-Resource-Policy: cross-origin`
