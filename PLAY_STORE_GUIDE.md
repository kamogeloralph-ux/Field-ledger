# Getting Rovana (Field Ledger) onto the Google Play Store

The approach: package the existing PWA as a **Trusted Web Activity (TWA)** — Google's
official, supported way to publish a PWA on Play. A TWA is a thin native shell that opens
your real website full-screen, with no browser address bar. There is no app-code rewrite:
every future change you deploy to the website appears in the Play Store app automatically,
with no new APK/AAB submission required — you only rebuild the Android package when
something *native* changes (icon, app name, package ID, orientation lock).

This file is the checklist. Steps 1–3 are things I already did in this repo. Steps 4 onward
happen on your machine / in your Google account, since they need a domain, Android build
tools, and a Play Console account that I don't have access to.

---

## What's already done in this repo

- **`client/public/manifest.webmanifest`** — added `id`, `scope`, `categories`, and a proper
  set of `any` + `maskable` icons (see below). This is what Bubblewrap reads to generate the
  Android app.
- **`client/public/icons/`** — `icon-192.png`, `icon-512.png` (regular), and
  `icon-192-maskable.png` / `icon-512-maskable.png` (extra safe-zone padding so the "R" mark
  doesn't get clipped by Android's adaptive-icon shapes).
- **`store-assets/play-store-icon-512.png`** — the 512×512 hi-res icon Play Console asks for
  in the store listing (separate from the in-app manifest icons).
- **`client/public/CNAME`** — placeholder for your custom domain. Replace the placeholder
  text with your real domain once you have one.
- **`client/public/.well-known/assetlinks.json`** — placeholder Digital Asset Links file.
  This is the file that proves to Android "the Play Store app and this website are the same
  thing," which is what makes the address bar disappear. You'll fill in the two
  `REPLACE_WITH_...` values in Step 5.
- **`client/public/.nojekyll`** — safety net so GitHub Pages never silently drops the
  `.well-known/` folder (dot-folders get filtered by Jekyll's default processing).
- **`.github/workflows/deploy-pages.yml`** — changed `VITE_BASE_PATH` from `/Field-ledger/`
  to `/`, since the app will now be served from your domain's root rather than a
  `username.github.io/Field-ledger/` subpath.

## Why the custom domain matters

TWAs need `https://YOUR-DOMAIN/.well-known/assetlinks.json` at the **root** of the domain.
GitHub's own `username.github.io/Field-ledger/` project-page URLs can't host anything at
the true root of `username.github.io` unless you separately own that root site — so a
custom domain sidesteps the issue entirely and is the standard approach.

---

## Step 1 — Buy and point the domain

1. Register a domain (e.g. via a registrar you use already). A subdomain works fine too,
   e.g. `app.yourcompany.co.za`.
2. In your DNS provider, point it at GitHub Pages:
   - Apex domain (`yourcompany.co.za`): four `A` records to GitHub Pages' IPs
     (`185.199.108.153`, `.109.153`, `.110.153`, `.111.153`).
   - Subdomain (`app.yourcompany.co.za`): a `CNAME` record pointing to
     `YOUR-GITHUB-USERNAME.github.io`.
3. In the GitHub repo → **Settings → Pages**, enter the custom domain and wait for the DNS
   check to go green, then tick **Enforce HTTPS**.

## Step 2 — Fill in the two placeholders

- `client/public/CNAME` → replace `REPLACE_WITH_YOUR_DOMAIN` with your real domain
  (e.g. `app.yourcompany.co.za`), no `https://`, no trailing slash.
- Push to `main`. The existing GitHub Actions workflow redeploys automatically.
- Visit `https://YOUR-DOMAIN/` and confirm the app loads, and
  `https://YOUR-DOMAIN/manifest.webmanifest` returns the JSON file directly.

## Step 3 — Register your Google Play Console account

Go to [play.google.com/console/signup](https://play.google.com/console/signup), pay the
one-time $25 registration fee, and complete identity verification. This can take anywhere
from a few hours to a couple of days — worth starting now so it's not the bottleneck later.

**Also decide your `applicationId` now** — this is Android's permanent internal name for
the app (like `com.rovana.fleetops`), reverse-domain style. **It can never be changed after
your first Play Store upload**, so pick it deliberately. A reasonable default:
`com.rovana.fleetops` — let me know if you'd rather use something tied to your real domain
once you have it, and I'll note it for Step 5.

## Step 4 — Install Bubblewrap and generate the Android project

This part happens on your own machine (it needs Android SDK / Java tooling I don't have
access to in this sandbox). You'll need [Node.js](https://nodejs.org) and a JDK 17
installed first.

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest=https://YOUR-DOMAIN/manifest.webmanifest
```

Bubblewrap will download the Android SDK components it needs (first run only), then walk
you through prompts — pull the defaults from your manifest, but confirm these specifically:

- **Application ID**: the `com.rovana.fleetops`-style ID you picked in Step 3.
- **App name / launcher name**: "Rovana" is already in the manifest.
- **Display mode**: `standalone` (already set).
- **Signing key**: choose "Create a new one." Bubblewrap will ask for a **keystore
  password** and a **key password** — write both down somewhere safe (a password manager).
  **If you lose this keystore, you can never publish an update to this app again** — Google
  cannot recover or reset it. Back up the generated `.keystore` file itself too, not just
  the passwords.

When it finishes, build the release package:

```bash
bubblewrap build
```

This produces `app-release-bundle.aab` (the file you upload to Play Console) and prints a
**SHA-256 fingerprint** for your signing key — copy that, you need it next.

## Step 5 — Wire up Digital Asset Links

Edit `client/public/.well-known/assetlinks.json` in this repo:

- `package_name` → your `applicationId` from Step 4 (e.g. `com.rovana.fleetops`).
- `sha256_cert_fingerprints` → the fingerprint Bubblewrap printed (keep the array format,
  it can hold more than one if you ever add a second signing key).

Push to `main`, wait for the redeploy, then verify it with Google's checker:
[digital-asset-links generator tool](https://developers.google.com/digital-asset-links/tools/generator) —
paste in your domain and application ID and it'll confirm the link is valid. If it fails,
double check `https://YOUR-DOMAIN/.well-known/assetlinks.json` actually loads that exact
JSON in a browser first (this is the most common trip-up — some static hosts still block
dotfiles even with `.nojekyll` in place).

## Step 6 — Set up the Play Console listing

In your new app's dashboard:

- **Privacy policy** (required): you'll need a hosted page describing what Rovana collects
  — driver names, evidence photos, checklist responses, stored via Supabase. A simple
  static page works; happy to draft one for you if you want.
- **Data safety form**: declare that the app collects *Personal info* (name) and *Photos*,
  processed via a service provider (Supabase), not sold or shared with third parties for
  advertising, and data is encrypted in transit.
- **Content rating questionnaire**: this is an internal business tool with no user-generated
  public content, violence, or mature themes — rates as "Everyone."
- **Target audience**: not directed at children.
- **App category**: Business.
- **Store listing**: app name, short description (30 chars), full description (4000 chars),
  the hi-res icon at `store-assets/play-store-icon-512.png`, a 1024×500 feature graphic
  (I can generate a draft if you'd like), and at least 2 phone screenshots (I can help
  capture these from the running app).

## Step 7 — Testing track, then production

New Play Console accounts currently must run a **closed test with at least 12 testers for
14 continuous days** before Google allows a first release to Production — this is a Google
policy, not something in this repo, and it's worth confirming the exact current requirement
in Play Console when you get there since Google adjusts these thresholds occasionally.
Upload the `.aab` from Step 4 to a Closed testing track, add tester emails, let it run, then
promote the release to Production once eligible.

---

## After that: how updates work

Once this is live, day-to-day app changes (new features, bug fixes) just need a normal
push to `main` — the website updates and everyone's installed Play Store app picks it up
automatically on next load, no new Play Store submission needed. You only touch Bubblewrap
again for native-level changes: a new app icon, renamed app, or changed orientation/display
settings.

---

## Open items I need from you

1. Your actual domain, once registered, to finalize `CNAME` and the Play Console listing.
2. Confirmation on the `applicationId` (default suggestion: `com.rovana.fleetops`).
3. Whether you'd like me to draft the privacy policy page, feature graphic, and/or capture
   store-listing screenshots — say the word and I'll get started on any of those now, they
   don't need to wait on the domain.
