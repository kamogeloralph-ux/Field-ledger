# Rovaya Fleet Inspection PWA

Rovaya is a React/Vite fleet inspection application with a Cloudflare Worker API and Cloudflare Pages frontend.

## Cloudflare deployment

### Pages frontend

Create a Cloudflare Pages project named `rovaya` connected to this GitHub repository, using:

- **Build command:** `pnpm install --frozen-lockfile && pnpm exec vite build`
- **Build output directory:** `dist/public`
- **Root directory:** `/`
- **Production branch:** `main`
- **Node.js version:** `22`

The Pages build uses the default Vite base path `/`, includes the SPA fallback in `client/public/_redirects`, and applies security/cache headers from `client/public/_headers`.

### Worker API

The API Worker is configured in `wrangler.toml` and deployed by `.github/workflows/deploy-worker.yml`. Configure the required GitHub Actions secrets before enabling automatic deployment:

- `CLOUDFLARE_API_TOKEN` with Workers deployment permissions
- `CLOUDFLARE_ACCOUNT_ID`

Set Worker runtime secrets with Wrangler rather than committing them:

```sh
pnpm exec wrangler secret put JWT_SECRET
pnpm exec wrangler secret put SUPABASE_URL
pnpm exec wrangler secret put SUPABASE_ANON_KEY
```

The frontend uses Supabase for the public driver workflow and the Worker handles tRPC, OAuth, and R2 storage proxy routes. Keep production secrets out of the repository.

## Local development

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run check:client
pnpm run build
```
