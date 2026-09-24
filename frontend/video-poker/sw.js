/*
 * Service worker for the Video Poker Trainer PWA: caches the whole app shell
 * on install so it works fully offline once loaded once over http(s).
 * Bump CACHE_NAME whenever any cached file changes, to force a refresh.
 */
'use strict';

var CACHE_NAME = 'vpt-cache-v11';
var APP_SHELL = [
  './',
  './index.html',
  './css/gameking.css',
  './js/engine.js',
  './js/trainer.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) { return cache.addAll(APP_SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        // Cache storage is shared by every app on this origin (the multi-line
        // app under multi/ keeps its own vpm-cache-*), so only clear out
        // this app's own old versions.
        return Promise.all(keys.filter(function (k) {
          return k.indexOf('vpt-cache-') === 0 && k !== CACHE_NAME;
        }).map(function (k) {
          return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Navigations to this app's own page (index.html, possibly with
  // ?hand=...&game=... query params) resolve to the cached app shell: the
  // app is entirely client-side and reads query params at runtime. Only
  // this page, though — this worker's scope is the whole site, which also
  // hosts other pages (the multi-line app under multi/, discord.html), and
  // answering those with this app's shell would hijack them.
  if (req.mode === 'navigate') {
    var scopePath = new URL(self.registration.scope).pathname;
    var path = new URL(req.url).pathname;
    if (path === scopePath || path === scopePath + 'index.html') {
      event.respondWith(
        ownCacheMatch('./index.html').then(function (cached) { return cached || fetch(req); })
      );
    }
    return;
  }

  event.respondWith(
    ownCacheMatch(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    }).catch(function () { return ownCacheMatch(req); })
  );
});

// Look only in this app's cache: a bare caches.match() searches every cache
// on the origin, and the multi-line app caches its own copy of the shared
// js/engine.js and css/gameking.css, which can be an older version.
function ownCacheMatch(req) {
  return caches.open(CACHE_NAME).then(function (cache) { return cache.match(req); });
}
