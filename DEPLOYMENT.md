# Deployment Guide for Cakerr

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- Node.js installed
- Git installed
- Vercel account (free at vercel.com)

### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   vercel
   ```

4. **For Production**
   ```bash
   vercel --prod
   ```

### Your Live URL
After deployment, you'll get a URL like:
- `https://cakerr.vercel.app`
- `https://cakerr-username.vercel.app`

---

## Alternative: GitHub + Vercel (Auto-Deploy)

### 1. Push to GitHub

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Cakerr MVP"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/cakerr.git

# Push
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your `cakerr` repository
4. Click "Deploy"

**Benefits:**
- Auto-deploys on every push to `main`
- Preview deployments for branches
- Easy rollbacks

---

## Environment Variables (For Future Backend)

When you integrate Supabase, add these in Vercel Dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

---

## Custom Domain (Optional)

### In Vercel Dashboard:
1. Go to your project settings
2. Click "Domains"
3. Add your domain (e.g., `cakerr.uz`)
4. Follow DNS configuration instructions

---

## Build Settings (Already Configured)

Vercel auto-detects Next.js projects. Default settings:
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

---

## Troubleshooting

### Build Fails
```bash
# Test build locally first
npm run build
```

### Port Issues
Vercel automatically handles ports, no configuration needed.

### Environment Variables
Make sure to add them in Vercel Dashboard, not in `.env` files (for security).

---

## Post-Deployment

1. **Test your live site:** Visit the Vercel URL
2. **Share the link:** Send to friends/clients
3. **Monitor:** Check Vercel dashboard for analytics

---

## Quick Commands Reference

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs
```

---

## Next Steps After Deployment

1. ✅ Test all pages on mobile
2. ✅ Share link with stakeholders
3. ✅ Set up custom domain (optional)
4. ✅ Add analytics (Vercel Analytics)
5. ✅ Integrate backend (Supabase)
