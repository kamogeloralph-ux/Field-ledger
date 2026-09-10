# Cloudflare Migration Guide

This guide walks you through setting up Rovaya to run completely on Cloudflare infrastructure with Supabase for the database and R2 for file storage.

## Prerequisites

1. **GitHub Account** - Already have your repo
2. **Cloudflare Account** - https://dash.cloudflare.com
3. **Supabase Project** - Already configured
4. **Cloudflare R2 Bucket** - Already configured

## Step 1: Get Cloudflare Credentials

1. Go to https://dash.cloudflare.com/profile/api-tokens
2. Create API Token with these permissions:
   - Account > Cloudflare Workers > Edit
   - Account > Workers KV > Edit
   - Account > R2 > Edit
   - Zone > Pages > Edit

3. Also get your **Account ID**:
   - Go to https://dash.cloudflare.com/
   - Bottom left sidebar shows your Account ID

## Step 2: Add GitHub Secrets

Go to your GitHub repository settings → Secrets and Variables → Actions

Add these secrets:

```
CLOUDFLARE_API_TOKEN = <your-api-token>
CLOUDFLARE_ACCOUNT_ID = <your-account-id>
```

## Step 3: Configure Cloudflare Environment Variables

Add these as Cloudflare Secrets (they won't be exposed to GitHub):

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_ANON_KEY
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put DATABASE_URL
wrangler secret put JWT_SECRET
wrangler secret put OAUTH_SERVER_URL
wrangler secret put OWNER_OPEN_ID
```

## Step 4: Update wrangler.toml

Edit `wrangler.toml` and update:

```toml
[env.production]
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]

[[r2_buckets]]
bucket_name = "rovaya-photos"  # Your actual R2 bucket name

[[kv_namespaces]]
id = "your-actual-kv-namespace-id"  # Get from Cloudflare dashboard
```

## Step 5: Test Locally

```bash
pnpm install
pnpm dev:worker
# Test: curl http://localhost:8787/api/trpc/auth.me
```

## Step 6: Deploy to Cloudflare

### Automatic (GitHub)
```bash
git push origin cloudflare-migration:main
```

### Manual (CLI)
```bash
pnpm deploy
```

## Step 7: Verify Deployment

- Frontend: https://rovaya.pages.dev
- Backend: `curl https://your-worker-url/api/trpc/auth.me`

## Environment Variables

| Variable | Source |
|----------|--------|
| `SUPABASE_URL` | Supabase Dashboard |
| `SUPABASE_ANON_KEY` | Supabase Dashboard |
| `DATABASE_URL` | Supabase Connection String |
| `JWT_SECRET` | Generate: openssl rand -base64 32 |
| `OAUTH_SERVER_URL` | Your OAuth provider |
| `OWNER_OPEN_ID` | Your user's OAuth ID |

For complete instructions, see the comments in `wrangler.toml` and `.github/workflows/deploy-cloudflare.yml`.
