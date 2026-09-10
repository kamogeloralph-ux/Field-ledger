# Cloudflare Migration Checklist

## ✅ Completed Files

This branch includes all necessary files for migrating Rovaya to Cloudflare:

### Core Configuration
- ✅ `wrangler.toml` - Cloudflare Workers configuration
- ✅ `src/worker.ts` - Worker entry point with tRPC & OAuth handling
- ✅ `.github/workflows/deploy-cloudflare.yml` - GitHub Actions CI/CD

### Server-side Adapters for Workers
- ✅ `server/_core/worker-context.ts` - tRPC context for Workers
- ✅ `server/_core/worker-storage-proxy.ts` - R2 storage proxy
- ✅ `server/_core/worker-oauth.ts` - OAuth handler for Workers
- ✅ `server/_core/worker-storage.ts` - R2 upload/download functions
- ✅ `server/_core/env.ts` - Environment configuration (Express & Workers)
- ✅ `server/_core/sdk.ts` - SDK adapted for Workers authentication

### Database & ORM
- ✅ `server/db.ts` - Drizzle ORM with Worker support
- ✅ `server/routers.ts` - tRPC routers compatible with Workers

### Configuration
- ✅ `package.json` - Updated with Wrangler and build scripts
- ✅ `tsconfig.json` - Updated for Cloudflare Workers types

### Documentation & Setup
- ✅ `CLOUDFLARE_MIGRATION.md` - Complete migration guide
- ✅ `scripts/setup-cloudflare.sh` - Setup automation script

---

## 📋 Setup Steps

### 1. Get Credentials
```bash
# Cloudflare Account ID
# Get from: https://dash.cloudflare.com/
```

### 2. Create API Token
Go to https://dash.cloudflare.com/profile/api-tokens
- Permissions: Workers (Edit), KV (Edit), R2 (Edit), Pages (Edit)

### 3. Add GitHub Secrets
```
CLOUDFLARE_API_TOKEN = <token>
CLOUDFLARE_ACCOUNT_ID = <account-id>
```

### 4. Configure Cloudflare Secrets
```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put OAUTH_SERVER_URL
wrangler secret put OWNER_OPEN_ID
```

### 5. Update wrangler.toml
```toml
# Set your actual R2 bucket name
[[r2_buckets]]
bucket_name = "your-r2-bucket-name"

# Set your domain
[env.production]
routes = [{ pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }]
```

### 6. Test Locally
```bash
pnpm install
pnpm dev:worker
# Test: curl http://localhost:8787/api/trpc/auth.me
```

### 7. Deploy
```bash
# Option A: Push to main (GitHub Actions)
git push origin cloudflare-migration:main

# Option B: Manual deploy
pnpm deploy
```

---

## 🚀 Deployment URLs

- **Frontend**: https://rovaya.pages.dev
- **Backend**: https://rovaya.workers.dev (or your custom domain)

---

## 📚 Architecture

```
GitHub (Push)
    ↓
GitHub Actions
    ├→ Build & Test
    ├→ Frontend → Cloudflare Pages (dist/public)
    └→ Backend → Cloudflare Workers (src/worker.ts)
        ├→ Supabase (Database)
        ├→ R2 (File Storage)
        └→ R2 KV (Optional Caching)
```

---

## 🔗 Key Links

- **Cloudflare Dashboard**: https://dash.cloudflare.com/
- **Cloudflare Workers Docs**: https://developers.cloudflare.com/workers/
- **Supabase Dashboard**: https://app.supabase.com/
- **tRPC Docs**: https://trpc.io/docs

---

## ❓ Troubleshooting

### Build fails
Check GitHub Actions logs and verify all environment variables are set.

### API returns 404
Ensure `wrangler.toml` is configured correctly and Worker is deployed.

### Database connection error
Verify `DATABASE_URL` secret is set in Cloudflare dashboard.

### R2 storage not working
Check bucket name in `wrangler.toml` matches your R2 bucket.

For detailed troubleshooting, see `CLOUDFLARE_MIGRATION.md`.

---

## 📝 Next Steps

1. Merge this branch to main when ready
2. Set up GitHub Secrets
3. Add Cloudflare Secrets via Wrangler
4. Update `wrangler.toml` with your details
5. Push to main to trigger first deployment
6. Verify frontend and backend are working
7. Set up custom domain in Cloudflare
8. Monitor deployment in GitHub Actions

Good luck! 🎉
