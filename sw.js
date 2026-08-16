/*
 * Service worker for the Video Poker Trainer PWA: caches the whole app shell
 * on install so it works fully offline once loaded once over http(s).
 * Bump CACHE_NAME whenever any cached file changes, to force a refresh.
 */
'use strict';

var CACHE_NAME = 'vpt-cache-v3';
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
        return Promise.all(keys.filter(function (k) { return k !== CACHE_NAME; }).map(function (k) {
          return caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;

  // Navigations (index.html, possibly with ?hand=...&game=... query params)
  // always resolve to the cached app shell page: the app is entirely
  // client-side and reads query params from location.search at runtime, so
  // there's no server-side reason to distinguish them.
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then(function (cached) { return cached || fetch(req); })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    }).catch(function () { return caches.match(req); })
  );
});
