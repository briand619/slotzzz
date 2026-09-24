/*
 * Service worker for the multi-play trainer PWA (scope: this multi/ folder).
 * Caches the app shell, including the engine and skin it shares with the
 * classic app one level up, so it works fully offline once loaded once.
 * Bump CACHE_NAME whenever any cached file changes, to force a refresh.
 */
'use strict';

// The classic app's worker keeps vpt-cache-*; each app only ever touches
// caches with its own prefix, since cache storage is shared by the origin.
var CACHE_PREFIX = 'vpm-cache-';
var CACHE_NAME = CACHE_PREFIX + 'v2';
var APP_SHELL = [
  './',
  './index.html',
  './css/multi.css',
  './js/multi.js',
  '../css/gameking.css',
  '../js/engine.js',
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
        return Promise.all(keys.filter(function (k) {
          return k.indexOf(CACHE_PREFIX) === 0 && k !== CACHE_NAME;
        }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function ownCacheMatch(req) {
  return caches.open(CACHE_NAME).then(function (cache) { return cache.match(req); });
}

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

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
