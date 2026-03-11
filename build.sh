#!/usr/bin/env bash
# build.sh — build zsozso-webpage and create deployment bundle
#
# Pipeline:
#   1. Run `npm run build` (parcel)
#   2. Copy sw.js + site.webmanifest into dist/
#   3. Stamp a fresh CACHE_NAME into dist/sw.js
#   4. Run bundle_sw.js to create the deployment in deploy/<prefix>/
#
# Usage:
#   ./build.sh          — build + bundle for GitHub Pages (/zsozso-webpage/)
#   ./build.sh -live    — build + bundle for self-hosted (/)
#   ./build.sh -z       — build + bundle (compressed mode)
#   ./build.sh --dry    — print the new CACHE_NAME without building

set -euo pipefail

DRY=false
BUNDLE_FLAG=""
LIVE=false
for arg in "$@"; do
  case "$arg" in
    --dry) DRY=true ;;
    -z|-c|-j|-r) BUNDLE_FLAG="$arg" ;;
    -live) LIVE=true ;;
  esac
done

# Deployment prefix: / for live server, /zsozso-webpage/ for GitHub Pages
if $LIVE; then
  PREFIX=""
else
  PREFIX="zsozso-webpage"
fi

# ── 1. Generate CACHE_NAME ────────────────────────────────────────────────────
BUILD_TS="$(date +%Y%m%d.%H%M)"
GIT_HASH="$(git rev-parse --short=8 HEAD)"
CACHE_NAME="zsozso-webpage-v0.${BUILD_TS}-${GIT_HASH}"

echo "CACHE_NAME → ${CACHE_NAME}"
$DRY && exit 0

# ── 2. Build ──────────────────────────────────────────────────────────────────
echo "Running: npm run build"
npm run build

# ── 3. Stage extra files into dist/ ──────────────────────────────────────────
cp sw.js site.webmanifest dist/

# ── 4. Stamp CACHE_NAME ──────────────────────────────────────────────────────
sed -i "s|^const CACHE_NAME = '.*';|const CACHE_NAME = '${CACHE_NAME}';|" dist/sw.js
echo "Stamped dist/sw.js"

# ── 5. Bundle for deployment ─────────────────────────────────────────────────
if [ -n "$PREFIX" ]; then
  echo "Running: node bundle_sw.js ${BUNDLE_FLAG} -j dist deploy ${PREFIX}"
  node bundle_sw.js ${BUNDLE_FLAG} -j dist deploy "${PREFIX}"
  echo ""
  echo "✓ Build complete — CACHE_NAME: ${CACHE_NAME}"
  echo "  Deploy from: deploy/${PREFIX}/"
  echo "  Test:        npx serve deploy/ -l 8080  →  http://localhost:8080/${PREFIX}/"
else
  echo "Running: node bundle_sw.js ${BUNDLE_FLAG} -j dist deploy"
  node bundle_sw.js ${BUNDLE_FLAG} -j dist deploy
  echo ""
  echo "✓ Build complete — CACHE_NAME: ${CACHE_NAME}"
  echo "  Deploy from: deploy/"
  echo "  Test:        npx serve deploy/ -l 8080  →  http://localhost:8080/"
fi
