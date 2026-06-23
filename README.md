# Nail Studio application

This is an Astro + TypeScript project created from the existing `nails_done.html` visual baseline. It preserves the original page markup, CSS, animation code, text, image order, and booking demo while moving the page into build-managed files.

## GitHub Pages deployment

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`. On each push to `main`, it installs the locked dependencies, checks and builds the Astro site, then deploys the `dist/` folder to GitHub Pages.

1. Create an empty GitHub repository and push this project's `main` branch to it.
2. In the repository, open **Settings → Pages** and select **GitHub Actions** as the publishing source.
3. The site will deploy at `https://<github-user>.github.io/<repository-name>/`; the workflow derives that repository path at build time, so images and videos work at the project URL.

For a custom domain, add `public/CNAME` containing the domain name, configure that domain in GitHub Pages and DNS, then remove the `base` option from `astro.config.mjs` (custom domains are hosted at the domain root).

### First push

```bash
git add .
git commit -m "Prepare site for GitHub Pages"
git remote add origin https://github.com/<github-user>/<repository-name>.git
git push -u origin main
```

## Run locally

```bash
npm install
npm run dev
```

Use Node.js 22.12 or later. The deployment workflow runs the same version.

## Structure

- `src/pages/index.astro` — preserved one-page site markup.
- `src/styles/site.css` — extracted original styles, bundled and cacheable.
- `src/scripts/site.js` — extracted original interactive behaviour, deferred as a module.
- `public/images` and `public/videos` — copied original assets with stable public URLs.
- `src/lib/contracts.ts` and `src/lib/api/client.ts` — backend integration boundary; not wired into the current demo yet.
- `docs/` — architecture, future API routes, and client-presentation customisation prompt.
- `archive/nail_raw.html` — retained legacy source; never deployed by Astro.
- `docs/architecture.md` — future architecture, dependencies, page map, and AI section prompts.

## Visual preservation rules

Do not change the page markup, animation timing, asset order, or visual tokens without screenshot comparison at desktop and mobile sizes. The original `../nails_done.html` remains available as the baseline.

## Backend transition

The application currently builds as a static site. When a backend host is chosen, add the corresponding Astro adapter and implement the route contracts documented in `docs/api-routes.md`.
