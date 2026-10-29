'use strict';
// Приложение (сборка docs/ для GitHub Pages): офлайн-режим через service worker и плашка «готова новая версия».
// В остальных сборках (claude.ai, файл с диска) ничего не делает: только сборка docs/ получает <link rel="manifest">.

const Pwa = {
  init() {
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol) || !document.querySelector('link[rel="manifest"]')) return;
    let updating = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (updating) location.reload(); });
    navigator.serviceWorker.register('sw.js').then((reg) => {
      const offer = (w) => this.banner(() => { updating = true; App.saveNow(); w.postMessage('skipWaiting'); });
      if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) offer(w); });
      });
      // на телефоне приложение может неделями не перезапускаться — проверяем обновление при каждом возвращении в него
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    }).catch(() => { /* без service worker приложение просто работает онлайн */ });
  },

  banner(apply) {
    if (document.getElementById('pwaupdate')) return;
    const el = h('div', { id: 'pwaupdate' },
      h('span', null, '🆕 ', triText(T('A new version of NetTrainer is ready', 'Готова новая версия NetTrainer', 'גרסה חדשה של NetTrainer מוכנה'))),
      h('button', { class: 'btn primary sm', onclick: apply }, triText(T('Update', 'Обновить', 'לעדכן'), ' · ')),
      h('button', { class: 'btn sm', title: triText(T('Later', 'Позже', 'אחר כך')), onclick: () => el.remove() }, '✕'));
    document.body.appendChild(el);
  },
};
