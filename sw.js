// Change this two rows! No other change in this file is a need.
var MESSAGE_PREFIX = 'ZSOZSOWP';
var __BASE_PREFIX = '/';
// The build.sh replaces it with a real APP_VERSION string...
var APP_VERSION = 'version';
// Cache version — it is only changes, if a need.
const CACHE_NAME = APP_VERSION+'-SW-v0.11';

function _ts() {
    const d = new Date();
    return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' +
    String(d.getMilliseconds()).padStart(3, '0');
}

const LOG = (...args) => {
    const text = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    const entry = _ts() + ' ' + CACHE_NAME + ' [SW] ' + text;
    console.log(`[SW ${CACHE_NAME}]`, ...args);
};

const ERR = (...args) => {
    const text = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    const entry = _ts() + ' ' + CACHE_NAME + ' [SW ERR] ' + text;
    console.error(`[SW ${CACHE_NAME}]`, ...args);
};

LOG('Script evaluated');
LOG('Base prefix:', __BASE_PREFIX);
LOG('Cache name:', CACHE_NAME);

// ── Asset loading infrastructure ─────────────────────────────────────────────

var __ASSETS = null;

function _extractJson(html) {
    LOG('_extractJson: searching for asset tag in', html.length, 'chars');
    var el = html.indexOf('id="__EMBEDDED_ASSETS_START__"');
    if (el === -1) {
        ERR('_extractJson: asset tag not found in HTML');
        throw new Error('Asset tag not found');
    }
    var start = html.indexOf('>', el) + 1;
    var end = html.indexOf('<\/script>', start);
    if (end === -1) end = html.indexOf('</script>', start);
    LOG('_extractJson: parsing JSON from position', start, 'to', end, '(' + (end - start) + ' chars)');
    var result = JSON.parse(html.substring(start, end));
    LOG('_extractJson: parsed OK, keys:', Object.keys(result));
    return result;
}

function _b64ToArrayBuffer(b64) {
    var bin = atob(b64);
    var len = bin.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return bytes.buffer;
}

async function _decompressToText(b64) {
    LOG('_decompressToText: decompressing', b64.length, 'base64 chars');
    var gzBuf = _b64ToArrayBuffer(b64);
    LOG('_decompressToText: gzip buffer size:', gzBuf.byteLength, 'bytes');
    var ds = new DecompressionStream('gzip');
    var writer = ds.writable.getWriter();
    writer.write(new Uint8Array(gzBuf));
    writer.close();
    var text = await new Response(ds.readable).text();
    LOG('_decompressToText: decompressed to', text.length, 'chars');
    return text;
}

async function _loadAssets() {
    if (__ASSETS) {
        LOG('_loadAssets: already loaded, skipping');
        return;
    }
    LOG('_loadAssets: starting two-level load from index.html …');

    // Level 1: fetch bootloader index.html → extract single embedded file (app index.html)
    var fetchUrl = __BASE_PREFIX + 'index.html';
    LOG('_loadAssets: fetching', fetchUrl);
    try {
        var resp = await fetch(fetchUrl, { cache: 'no-cache' });
        LOG('_loadAssets: fetch response status:', resp.status, resp.statusText);
        if (!resp.ok) {
            ERR('_loadAssets: fetch failed with status', resp.status);
            throw new Error('Failed to load index.html: ' + resp.status);
        }
        var bootHtml = await resp.text();
        LOG('_loadAssets: bootloader HTML size:', bootHtml.length, 'chars');
        var level1 = _extractJson(bootHtml);
        var level1Keys = Object.keys(level1.assets);
        LOG('Level 1: extracted', level1Keys.length, 'file(s) from bootloader:', level1Keys);

        // Level 2: decompress app index.html → extract all individual assets
        LOG('_loadAssets: decompressing app index.html …');
        var appHtml = await _decompressToText(level1.assets['index.html']);
        LOG('_loadAssets: app index.html size:', appHtml.length, 'chars');
        __ASSETS = _extractJson(appHtml);
        var assetKeys = Object.keys(__ASSETS.assets);
        LOG('Level 2: extracted', assetKeys.length, 'assets from app index.html');
        LOG('_loadAssets: asset keys:', assetKeys);
        LOG('_loadAssets: complete ✓');
    } catch (e) {
        ERR('_loadAssets: FAILED —', e.message);
        throw e;
    }
}

function _serveEmbedded(key) {
    if (!__ASSETS) {
        ERR('_serveEmbedded: assets not loaded yet, returning null for', key);
        return null;
    }
    var data = __ASSETS.assets[key];
    if (!data) {
        LOG('_serveEmbedded: no asset found for key:', key);
        return null;
    }
    var mime = __ASSETS.mime[key] || 'application/octet-stream';
    LOG('_serveEmbedded: serving', key, '(' + mime + ',', data.length, 'base64 chars)');
    // Decompress: base64 → gzip bytes → DecompressionStream → raw bytes
    var gzBuf = _b64ToArrayBuffer(data);
    var ds = new DecompressionStream('gzip');
    var writer = ds.writable.getWriter();
    writer.write(new Uint8Array(gzBuf));
    writer.close();
    return new Response(ds.readable, {
        status: 200,
        headers: { 'Content-Type': mime }
    });
}

function _serve404(pathname) {
    ERR('_serve404: returning 404 for', pathname);
    var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1.0">'
        + '<title>404 — Not Found</title>'
        + '<style>body{display:flex;align-items:center;justify-content:center;height:100vh;margin:0;'
        + 'font-family:sans-serif;background:#f5f5f5;color:#333;text-align:center}'
        + 'h1{font-size:4em;margin:0;color:#dc3545}p{color:#666;margin:8px 0}'
        + 'a{color:#17a2b8;text-decoration:none;font-weight:bold}'
        + '</style></head><body><div>'
        + '<h1>404</h1>'
        + '<p>The requested resource was not found.</p>'
        + '<p style="font-size:0.85em;font-family:monospace;word-break:break-all">' + pathname + '</p>'
        + '<p style="margin-top:24px"><a href="./">← Back to app</a></p>'
        + '</div></body></html>';
    return new Response(html, {
        status: 404,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// ── Lifecycle events ─────────────────────────────────────────────────────────

self.addEventListener('install', event => {
    LOG('Install event — calling skipWaiting()');
    self.skipWaiting();
    LOG('Install: skipWaiting called, now loading assets …');
    event.waitUntil(
        _loadAssets().then(function() {
            LOG('Install: assets loaded successfully ✓');
        }).catch(function(e) {
            ERR('Install: asset loading FAILED —', e.message);
        })
    );
});

self.addEventListener('activate', event => {
    LOG('Activate event — cleaning old caches');
    // 1. Claim clients IMMEDIATELY
    LOG('Activate: claiming clients immediately');
    event.waitUntil(self.clients.claim());

    // 2. Then proceed with cleanup and notifications
    event.waitUntil(
        caches.keys().then(keys => {
            const old = keys.filter(k => k !== CACHE_NAME);
            LOG('Existing caches:', keys, '| Deleting:', old);
            const isUpdate = old.length > 0;
            return Promise.all(old.map(k => {
                LOG('Activate: deleting cache:', k);
                return caches.delete(k);
            })).then(() => isUpdate);
        }).then(isUpdate => {
            LOG('Old caches deleted, calling clients.claim()');
            return self.clients.claim().then(() => isUpdate);
        }).then(isUpdate => {
            // Only notify clients to reload when we actually replaced an older version.
            // On iOS the SW can be terminated and re-activated by the OS —
            // that is NOT an update and must not trigger a reload loop.
            if (isUpdate) {
                return self.clients.matchAll({ type: 'window' }).then(clients => {
                    LOG('Activate: sending update notification to', clients.length, 'client(s)');
                    clients.forEach(c => {
                        c.postMessage({ type: '__'+MESSAGE_PREFIX+'_SW_UPDATED' });
                        LOG('Activate: notified client', c.id);
                    });
                    LOG('Update detected — notified', clients.length, 'client(s) to reload');
                });
            } else {
                LOG('No old caches found — not an update, skipping reload notification');
            }
        })
    );
});

// ── Fetch handler (SPA / Dioxus — all navigation → index.html) ──────────────

self.addEventListener('fetch', function(event) {
    var url = new URL(event.request.url);
    LOG('Fetch:', event.request.mode, url.pathname);

    // Navigation requests → serve index.html (SPA / client-side routing)
    if (event.request.mode === 'navigate') {
        LOG('Fetch: navigation request for', url.pathname, '→ serving index.html');
        event.respondWith(
            _loadAssets().then(function() {
                var resp = _serveEmbedded('index.html');
                if (resp) {
                    LOG('Fetch: navigation → index.html served ✓');
                    return resp;
                }
                ERR('Fetch: navigation → index.html NOT FOUND, returning 404');
                return _serve404(url.pathname);
            }).catch(function(e) {
                ERR('Fetch: navigation FAILED —', e.message);
                return _serve404(url.pathname);
            })
        );
        return;
    }

    // Cross-origin — fall through to normal network fetch
    if (url.origin !== self.location.origin) {
        LOG('Fetch: cross-origin, passing through:', url.href);
        return;
    }

    // Strip the base prefix to get the embedded-asset key.
    // Example: base="/sPWA/", pathname="/sPWA/assets/foo.js" → "assets/foo.js"
    var relative = url.pathname;
    if (__BASE_PREFIX !== '/' && relative.startsWith(__BASE_PREFIX)) {
        relative = relative.substring(__BASE_PREFIX.length);
    } else if (relative.startsWith('/')) {
        relative = relative.substring(1);
    }
    LOG('Fetch: resolved asset key:', relative, '(from', url.pathname + ')');

    event.respondWith(
        _loadAssets().then(function() {
            var resp = _serveEmbedded(relative);
            if (resp) {
                LOG('Fetch: served embedded asset:', relative, '✓');
                return resp;
            }
            ERR('Fetch: asset not found:', relative, '→ 404');
            return _serve404(url.pathname);
        }).catch(function(e) {
            ERR('Fetch: error serving', relative, '—', e.message);
            return _serve404(url.pathname);
        })
    );
});
