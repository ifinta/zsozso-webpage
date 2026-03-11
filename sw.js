// Service Worker for zsozso-webpage — offline PWA support.
// Based on the service worker pattern from zsozso-dioxus.
//
// The fetch event listener below is REMOVED by bundle_sw.js and replaced
// with an embedded-asset handler that serves all files from within sw.js.

const CACHE_NAME = 'zsozso-webpage-v0';

// ── SW-side log ring buffer (max 50) ──
const _swLogBuffer = [];
const _SW_LOG_MAX = 50;

function _ts() {
    const d = new Date();
    return d.toLocaleTimeString('en-GB', { hour12: false }) + '.' +
        String(d.getMilliseconds()).padStart(3, '0');
}

const LOG = (...args) => {
    const text = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    const entry = _ts() + ' ' + CACHE_NAME + ' [SW] ' + text;
    _swLogBuffer.push(entry);
    if (_swLogBuffer.length > _SW_LOG_MAX) _swLogBuffer.shift();
    console.log(`[SW ${CACHE_NAME}]`, ...args);
};

LOG('Script evaluated');

self.addEventListener('install', event => {
    LOG('Install event — calling skipWaiting()');
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    LOG('Activate event — claiming clients');
    event.waitUntil(
        caches.keys().then(keys => {
            const old = keys.filter(k => k !== CACHE_NAME);
            LOG('Existing caches:', keys, '| Deleting:', old);
            return Promise.all(old.map(k => caches.delete(k)));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                    }
                    return response;
                })
                .catch(() =>
                    caches.match(event.request)
                        .then(cached => cached || caches.match('index.html'))
                )
        );
        return;
    }

    if (url.origin !== self.location.origin) return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                if (response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
                }
                return response;
            });
        })
    );
});
