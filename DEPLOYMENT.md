# 🚀 Deploying ByteReaper to Netlify

## Prerequisites

- GitHub account
- Netlify account (free tier is sufficient)
- Your code pushed to a GitHub repository

## Quick Deployment Steps

### 1. Prepare Your Repository

Make sure all changes are committed and pushed:

```bash
git add .
git commit -m "Ready for Netlify deployment"
git push origin main
```

### 2. Connect to Netlify

1. Go to [Netlify](https://app.netlify.com/)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** and select your ByteReaper repository
4. Netlify will auto-detect Next.js settings

### 3. Configure Build Settings

Netlify should auto-detect these, but verify:

- **Build command**: `npm run build`
- **Publish directory**: `.next`
- **Node version**: 18 or higher

### 4. Add Environment Variables

In Netlify Dashboard → **Site settings** → **Environment variables**, add:

| Variable | Value | Required |
|----------|-------|----------|
| `OPENROUTER_API_KEY` | `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` | ✅ Yes |
| `GITHUB_TOKEN` | Your GitHub token | ⚠️ Optional |
| `NODE_VERSION` | `18` | ✅ Yes |

**Important**: DO NOT commit API keys to your repository!

### 5. Install Netlify Plugin

Netlify will automatically install `@netlify/plugin-nextjs` based on your `netlify.toml` file.

### 6. Deploy!

Click **"Deploy site"** and wait for the build to complete (2-5 minutes).

Your site will be live at: `https://[random-name].netlify.app`

### 7. Configure Custom Domain (Optional)

To use `bytereaper.netlify.app`:

1. Go to **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Enter: `bytereaper.netlify.app`
4. If available, Netlify will assign it to your site

---

## Firebase Configuration for Production

### Update Firebase Authorized Domains

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **bytereaper**
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add your Netlify domains:
   - `bytereaper.netlify.app`
   - `[your-site-name].netlify.app`

### Update Firestore Security Rules

Ensure your Firestore rules are published (from `firestore.rules` file).

---

## Performance Optimizations

### Already Configured

✅ Static asset caching (1 year)
✅ Security headers
✅ Next.js optimization plugin
✅ Function bundling with esbuild
✅ Firebase externalized (not bundled)

### Additional Optimizations

1. **Enable Netlify Edge Functions** (optional):
   - Faster response times globally
   - Available on Pro plan

2. **Image Optimization**:
   - Next.js Image component automatically optimized
   - Netlify Image CDN enabled via plugin

3. **Build Performance**:
   - Netlify uses build cache automatically
   - Typical rebuild: 1-2 minutes

---

## Troubleshooting

### Build Fails with "Module not found"

**Solution**: Run locally first to ensure all dependencies are in `package.json`:

```bash
npm install
npm run build
```

### Firebase Authentication Not Working

**Solutions**:
1. Verify domain is added to Firebase authorized domains
2. Check environment variables are set in Netlify
3. Ensure Firebase config in `src/lib/firebase.ts` is correct

### API Routes Return 404

**Solution**: Verify `netlify.toml` redirect rules are present (they should be).

### Hydration Errors in Production

The Dark Reader extension issue only affects development. In production:
- Users without Dark Reader won't see errors
- `suppressHydrationWarning` suppresses console warnings
- Functionality is not affected

### Slow Initial Load

**Solutions**:
1. Enable Netlify's "Build plugin" for faster cold starts
2. Consider upgrading to Netlify Pro for Edge Functions
3. Use React lazy loading for heavy components

---

## Monitoring

### Netlify Analytics

Enable in: **Site settings** → **Analytics** (paid feature)

### Firebase Analytics

Already configured! Check Firebase Console → Analytics.

### Error Tracking

Consider adding:
- [Sentry](https://sentry.io) - Error monitoring
- [LogRocket](https://logrocket.com) - Session replay

---

## CI/CD Pipeline

### Automatic Deployments

Netlify automatically deploys when you push to `main` branch.

### Preview Deployments

Every pull request gets a unique preview URL automatically!

### Deploy Hooks

Create webhooks for manual deploys:
- **Site settings** → **Build & deploy** → **Build hooks**

---

## Domain & SSL

### Custom Domain

If you own a custom domain (e.g., `bytereaper.com`):

1. Go to **Domain management** → **Add custom domain**
2. Follow Netlify's DNS configuration instructions
3. SSL certificate is automatically provisioned (free via Let's Encrypt)

### Subdomain

To use a subdomain of your existing domain:
- Add CNAME record pointing to your Netlify site

---

## Checklist Before Going Live

- [ ] All environment variables set in Netlify
- [ ] Firebase authorized domains updated
- [ ] Firestore security rules published
- [ ] Test signup/login on production
- [ ] Test chat functionality
- [ ] Test file upload
- [ ] Verify all API routes work
- [ ] Check mobile responsiveness
- [ ] Test Google OAuth sign-in
- [ ] Review browser console for errors
- [ ] Test with Dark Reader disabled

---

## Post-Deployment

### Update README

Add your live URL to the README:

```markdown
**Live Demo**: [https://bytereaper.netlify.app](https://bytereaper.netlify.app)
```

### Share Your Project

- Add to your GitHub profile README
- Share on LinkedIn
- Add to your portfolio
- Submit to Erasmus/scholarship applications

---

## Cost Estimate

### Free Tier Limits (Netlify)

- ✅ 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Unlimited sites
- ✅ HTTPS included
- ✅ Continuous deployment

### Free Tier Limits (Firebase)

- ✅ 50K reads/day (Firestore)
- ✅ 20K writes/day (Firestore)
- ✅ 10K authentications/month
- ✅ 1GB storage

### When to Upgrade

Only if you exceed free tier limits (unlikely for portfolio projects).

---

## Support Resources

- [Netlify Documentation](https://docs.netlify.com/)
- [Next.js on Netlify](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)

---

## Quick Commands

```bash
# Test production build locally
npm run build
npm start

# Check bundle size
npm run build -- --analyze

# Deploy via Netlify CLI (alternative)
npm install -g netlify-cli
netlify deploy --prod
```

---

**Your app is production-ready!** 🎉

Just push to GitHub and connect to Netlify!
