#!/usr/bin/env node
/**
 * bundle_sw.js — Bundle all build assets into index.html with a fixed service-worker deployment.
 *
 * Usage:  node bundle_sw.js <source-folder> <deploy-folder> <base-path>
 *
 * Arguments:
 *   source-folder  Build output (e.g. dist/app/)
 *   deploy-folder  Root of deploy tree (e.g. deploy/)
 *   base-path      The sub-path the app is served under, e.g. "app" in i.e. http://<user>.github.io/app/
 *
 * Examples:
 *   node bundle_sw.js dist/app deploy app                    →  json + Dioxus SPA
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── CLI args ─────────────────────────────────────────────────────────────────
const srcFolder    = process.argv[2];
const deployFolder = process.argv[3];
const basePath     = (process.argv[4] || '').replace(/^\/|\/$/g, '');
const basePrefix   = basePath ? '/' + basePath + '/' : '/';

if (!srcFolder || !deployFolder) {
    console.error('Usage: node bundle_sw.js <source-folder> <deploy-folder> [base-path]');
    process.exit(1);
}

if (!fs.existsSync(srcFolder)) {
    console.error(`Error: source folder not found: ${srcFolder}`);
    process.exit(1);
}

// ── Mime type map ────────────────────────────────────────────────────────────
const MIME_BY_EXT = {
    '.html':        'text/html',
    '.css':         'text/css',
    '.js':          'application/javascript',
    '.json':        'application/json',
    '.map':         'application/json',
    '.webmanifest': 'application/manifest+json',
    '.png':         'image/png',
    '.ico':         'image/x-icon',
    '.svg':         'image/svg+xml',
    '.wasm':        'application/wasm',
    '.woff':        'font/woff',
    '.woff2':       'font/woff2',
};

// ── Collect files recursively ────────────────────────────────────────────────
function walkDir(dir, base) {
    let results = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        const rel  = path.join(base, entry.name);
        if (entry.isDirectory()) {
            results = results.concat(walkDir(full, rel));
        } else if (entry.isFile()) {
            results.push(rel);
        }
    }
    return results;
}

// Only skip sw.js — index.html IS embedded so the SW can serve it
const SKIP = new Set(['sw.js']);
const allFiles = walkDir(srcFolder, '')
    .filter(f => !SKIP.has(f));

// ── Build the compressed ASSETS and MIME objects ─────────────────────────────
const compactAssets = {};
const mimeTypes = {};
let totalRaw = 0;
let totalCompact = 0;

for (const relPath of allFiles) {
    const absPath  = path.join(srcFolder, relPath);
    const buf      = fs.readFileSync(absPath);
    const ext      = path.extname(relPath).toLowerCase();
    const mime     = MIME_BY_EXT[ext] || 'application/octet-stream';
    const key      = relPath.split(path.sep).join('/');

    mimeTypes[key] = mime;
    totalRaw      += buf.length;

    const gzBuf = zlib.gzipSync(buf, { level: 9 });
    compactAssets[key] = gzBuf.toString('base64');
    totalCompact += gzBuf.length;
}

// ── Marker used for JSON extraction ──────────────────────────────────────────
const MARKER = '__EMBEDDED_ASSETS_START__';

// ── generate HTML from user's index.html (carries all assets) in the first run
function generateAppIndexHtml(htmlFile, dataSection) {
    const html = fs.readFileSync(path.join(srcFolder, htmlFile), 'utf8');
    const bodyClose = html.lastIndexOf('</body>');
    if (bodyClose === -1) {
        console.error('Error: </body> not found in ' + htmlFile);
        process.exit(1);
    }
    return html.slice(0, bodyClose) + dataSection + '\n' + html.slice(bodyClose);
}

// ── generate Bootloader HTML from dist/index.html (carries only that index.html as asset) in the second run
function generateBootloader(htmlFile, dataSection) {
    var html = fs.readFileSync(path.join(srcFolder,htmlFile), 'utf8');

    // Replace <title>…</title> with loading title
    html = html.replace(/<title>[^<]*<\/title>/, '<title>Loading\u2026</title>');

    // Insert spinner style before </head>
    const spinnerStyle = '<style>.spinner{width:40px;height:40px;border:4px solid #ddd;border-top-color:#00acc1;border-radius:50%;animation:spin .8s linear infinite} @keyframes spin{to{transform:rotate(360deg)}}</style>';
    const headClose = html.lastIndexOf('</head>');
    if (headClose === -1) {
        console.error('Error: </head> not found in ' + htmlFile);
        process.exit(1);
    }
    html = html.slice(0, headClose) + spinnerStyle + '\n' + html.slice(headClose);

    // Insert dataSection + spinner overlay after <body…>
    const bodyOpen = html.match(/<body[^>]*>/);
    if (!bodyOpen) {
        console.error('Error: <body> not found in ' + htmlFile);
        process.exit(1);
    }
    const bodyTag = bodyOpen[0];
    const bodyPos = html.indexOf(bodyTag) + bodyTag.length;
    const spinner = '\n<div style="text-align:center"><div id="spinner" class="spinner" style="margin:0 auto 16px"></div><p>Loading app\u2026</p></div>';
    html = html.slice(0, bodyPos) + spinner + '\n' + dataSection + html.slice(bodyPos);

    // Remove single-line <script ...href=...>...</script> and <link ...as='script'...href=...> tags
    html = html.replace(/^[ \t]*<script\b[^>]*\bhref=[^>]*>.*?<\/script>[^\S\n]*\n?/gm, '');
    html = html.replace(/^[ \t]*<link\b[^>]*\bas=["']script["'][^>]*\bhref=[^>]*\/?>[^\S\n]*\n?/gm, '');

    return html;
}

// ── Output ───────────────────────────────────────────────────────────────────
const outFolder = basePath ? path.join(deployFolder, basePath) : deployFolder;
fs.mkdirSync(outFolder, { recursive: true });

// Level 2: app index.html contains ALL assets (gzip+base64)
const allAssetsJson = JSON.stringify({ assets: compactAssets, mime: mimeTypes });
const appDataSection = `<script type="application/json" id="${MARKER}">\n${allAssetsJson}\n</script>`;
const appIndexHtml = generateAppIndexHtml("index.html", appDataSection);

// Level 1: bootloader contains ONE file — the app index.html (gzip+base64)
const appGz = zlib.gzipSync(Buffer.from(appIndexHtml, 'utf8'), { level: 9 });
const bootPayload = JSON.stringify({
    assets: { 'index.html': appGz.toString('base64') },
    mime:   { 'index.html': 'text/html' }
});
const bootDataSection = `<script type="application/json" id="${MARKER}">\n${bootPayload}\n</script>`;
const outputHtml = generateBootloader("index.html", bootDataSection);

// Copy the fixed sw.js from the source folder
const swSrc = path.join(srcFolder, 'sw.js');
if (!fs.existsSync(swSrc)) {
    console.error(`Error: sw.js not found in ${srcFolder}`);
    process.exit(1);
}
fs.copyFileSync(swSrc, path.join(outFolder, 'sw.js'));
fs.writeFileSync(path.join(outFolder, 'index.html'), outputHtml, 'utf8');

// ── Summary ──────────────────────────────────────────────────────────────────
const swSize   = fs.statSync(path.join(outFolder, 'sw.js')).size;
const htmlSize = Buffer.byteLength(outputHtml, 'utf8');
console.log(`Bundled ${allFiles.length} files — json-in-html + dioxus SPA mode`);
console.log(`  Base path: ${basePath ? '/' + basePath + '/' : '/ (root)'}`);
console.log(`  Raw assets: ${(totalRaw / 1024).toFixed(1)} KB`);
console.log(`  Output sw.js: ${(swSize / 1024).toFixed(1)} KB (copied)`);
console.log(`  Output index.html: ${(htmlSize / 1024).toFixed(1)} KB`);
console.log(`  Compressed assets: ${(totalCompact / 1024).toFixed(1)} KB (${(100 * totalCompact / totalRaw).toFixed(0)}% of raw)`);
console.log(`  Deploy folder: ${outFolder}/`);
console.log('');
for (const relPath of allFiles) {
    const size = fs.statSync(path.join(srcFolder, relPath)).size;
    const mime = mimeTypes[relPath.split(path.sep).join('/')];
    console.log(`  ${relPath} (${(size / 1024).toFixed(1)} KB) → ${mime}`);
}
