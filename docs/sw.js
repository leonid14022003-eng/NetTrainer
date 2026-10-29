'use strict';
// Офлайн-режим приложения NetTrainer. VERSION подставляет build.py (хэш файлов сайта):
// любое изменение сайта = новая версия, и приложение покажет плашку «Обновить».
const VERSION = '520f193bd37d';
const CACHE = 'nettrainer-' + VERSION;
const FILES = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' — мимо HTTP-кэша, чтобы не сохранить старую копию страницы
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('nettrainer-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Страница просит перейти на новую версию (кнопка «Обновить»)
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') { const page = await c.match('index.html'); if (page) return page; }
    return fetch(req);
  })());
});
