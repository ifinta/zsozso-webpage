# Copilot Instructions — zsozso-webpage

## Project Overview

Static multi-page website for the **Iceberg Protocol** and **ZSOZSO** utility token on the Stellar blockchain. Deployed to GitHub Pages via Parcel bundler. The site is bilingual (English + Hungarian) with content hard-coded in HTML using anchor-based section separation.

## Build & Dev Commands

```bash
npm ci                # Install dependencies (clean install)
npm run build         # Parcel build → dist/ (all 8 HTML entry points)
npm run deploy        # Build + bundle into offline PWA → deploy/ (2 files)
npm run dev           # Dev server with hot reload (index.html only)
python3 -m http.server 8080  # Alternative: serve static files directly
```

There are no tests or linters configured.

## Architecture

- **Multi-page static site** — 8 separate HTML entry points, not an SPA. Each page is a standalone file with its own copy of the navigation bar.
- **Parcel bundler** (v1.12) compiles SCSS and bundles JS. No custom Parcel config — uses defaults. Output goes to `dist/`.
- **CSS loading order** in every HTML file: `css/normalize.css` → `css/main.css` → `scss/styles.scss` (Parcel-compiled) → `css/my.css` (custom overrides).
- **Bootstrap 5.3** is the CSS/JS framework. `scss/styles.scss` only imports Bootstrap; `js/main.js` only imports Bootstrap JS. All custom styling lives in `css/my.css` or inline `style=` attributes.
- **stellar/stellar.toml** — SEP-1 asset metadata served at `/.well-known/stellar.toml`. The nginx config in `nginx/` sets CORS headers and disables caching for this endpoint.
- **Offline PWA deployment** — `bundle_sw.js` (ported from [zsozso-dioxus](https://github.com/ifinta/zsozso-dioxus)) reads `dist/`, compresses all files, and produces a `deploy/` folder with just `index.html` + `sw.js`. The service worker serves all pages and assets from embedded data — fully offline capable. CI uses `-j` (json-in-html) mode.
- **GitHub Pages deployment** — CI builds on push to `main` via `.github/workflows/deploy.yml` (Node 18, `npm ci`, Parcel build, `bundle_sw.js -j`, deploy from `deploy/`).

## Key Conventions

- **Inline styles over CSS classes** — Pages use inline `style=` attributes extensively for layout and visual styling. Only Bootstrap utility classes are used as CSS classes. Custom class usage is limited to `css/my.css` (nav hover + body defaults).
- **Navigation is duplicated** — Each HTML page contains its own `<nav>` block with the `active` class set on its own link. When adding/renaming pages, update the nav in every HTML file.
- **Bilingual content** — English and Hungarian sections coexist in the same HTML files (e.g., `index.html`, `faq.html`), separated by headings or anchors. There is no i18n framework.
- **2 spaces, UTF-8, LF line endings** — Defined in `.editorconfig`.
- **New HTML pages** must be added to the Parcel `build` script entry points in `package.json` or they won't be included in the `dist/` output.

## Supporting Directories

- `bitcointalk/` — Forum announcement posts in BBCode format (not part of the website build).
- `openscad/` — 3D coin model source (OpenSCAD format, not part of the website build).
- `doc/` — HTML5 Boilerplate template documentation (upstream reference material).
- `nginx/` — Production nginx config for `zsozso.info` with Let's Encrypt SSL and Stellar TOML CORS.
