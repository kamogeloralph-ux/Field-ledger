# Deploy Field Ledger to GitHub Pages

## 1. Create the repository

Create a GitHub repository for the project, then upload the contents of the ZIP without changing the directory structure. The repository should contain `client/`, `server/`, `supabase/`, `vite.config.ts`, `package.json`, and `.github/workflows/deploy-pages.yml` at its root.

## 2. Enable GitHub Pages

Open the repository on GitHub and go to **Settings → Pages**. Under **Build and deployment**, choose **GitHub Actions** as the source. Do not choose “Deploy from a branch”; the included workflow builds the PWA and publishes `dist/public`.

Push a commit to the repository’s default branch. The workflow will install dependencies, build the project, and deploy the static output. The first deployment may take a few minutes. Check **Actions** for the workflow status.

## 3. Set the repository name correctly

The Vite configuration automatically uses a repository subpath when the GitHub Actions build provides `GITHUB_REPOSITORY`. This keeps JavaScript, CSS, the manifest, the service worker, and both HTML entry points working under a project Pages URL.

The normal driver workspace will be available at:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY/
```

The restricted admin workspace will be available at:

```text
https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY/admin.html
```

## 4. Supabase configuration

The browser client uses the public Supabase project URL and publishable key. If you change projects, update the public frontend values through the deployment environment or the browser-safe client configuration. Never commit a PostgreSQL password, database connection string, Supabase Secret key, or service-role key.

Before testing live data, run the Supabase scripts in the order documented in `SUPABASE_SETUP.md`. Create Auth users and link their UUIDs to `public.drivers` profiles. The `admin.html` page is intended only for a profile with `role = 'admin'`.

## 5. First test after deployment

Test the normal URL with one driver account, one supervisor account, and one admin account. Confirm that drivers see the inspection workflow, supervisors see review areas without inspection actions, and admins can open `admin.html`. Apply `supabase/07_admin_only_policies.sql` before allowing admins to edit or delete fleet and driver records.
