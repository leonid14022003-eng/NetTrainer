'use strict';
// DOM-помощники: создание элементов, подсказки, контекстные меню, окна, диалоги, хранилище.

function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k === 'value') el.value = v;
      else if (k === 'checked') el.checked = !!v;
      else el.setAttribute(k, v === true ? '' : v);
    }
  }
  appendKids(el, children);
  return el;
}

function appendKids(el, kids) {
  for (const c of kids) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) appendKids(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root) { return [...(root || document).querySelectorAll(sel)]; }
function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
function svgEl(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined) el.setAttribute(k, v);
  return el;
}

// Многоязычный текст: английский, ниже перевод на русский и иврит (иврит — справа налево)
function bi(t, cls) {
  if (!t) return null;
  const ru = App.prefs.ru && t.ru, he = App.prefs.he && t.he;
  const en = App.prefs.en !== false || (!ru && !he); // английский можно скрыть, если виден хотя бы один перевод
  return h('div', { class: 'bi ' + (cls || '') + (en ? '' : ' noen') }, en ? h('div', { class: 'en' }, t.en) : null,
    ru ? h('div', { class: 'ru' }, t.ru) : null,
    he ? h('div', { class: 'he', dir: 'rtl', lang: 'he' }, t.he) : null);
}

// Короткая надпись на включённых языках: «Steps · Шаги · שלבים»
function tri(en, ru, he, sep = ' · ') {
  const parts = [];
  if (App.prefs.en !== false || (!App.prefs.ru && !App.prefs.he)) parts.push(h('span', { class: 'l-en' }, en));
  if (App.prefs.ru && ru) parts.push(h('span', { class: 'l-ru' }, ru));
  if (App.prefs.he && he) parts.push(h('bdi', { class: 'l-he', dir: 'rtl', lang: 'he' }, he));
  const out = [];
  parts.forEach((p, i) => { if (i) out.push(sep); out.push(p); });
  return out;
}
function triText(t, sep = ' — ') {
  if (!t) return '';
  const parts = [];
  if (App.prefs.en !== false || (!App.prefs.ru && !App.prefs.he)) parts.push(t.en);
  if (App.prefs.ru && t.ru) parts.push(t.ru);
  if (App.prefs.he && t.he) parts.push(t.he);
  return parts.join(sep);
}

// Озвучка (Web Speech API): помогает слышать произношение терминов на английском и иврите.
function speak(text, lang) {
  try {
    const synth = window.speechSynthesis;
    if (!synth) { toast('Speech is not available in this browser'); return; }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'he' ? 'he-IL' : lang === 'ru' ? 'ru-RU' : 'en-US';
    const v = synth.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith(u.lang.slice(0, 2)));
    if (v) u.voice = v;
    u.rate = 0.95;
    synth.speak(u);
  } catch (e) { toast('Speech is not available'); }
}
function tt(t) { return t ? t.en + ' — ' + t.ru : ''; }

// ---------- Хранилище (может быть недоступно) ----------
const Store = {
  get(key, def) { try { const v = localStorage.getItem('nettrainer.' + key); return v === null ? def : JSON.parse(v); } catch (e) { return def; } },
  set(key, val) {
    try { localStorage.setItem('nettrainer.' + key, JSON.stringify(val)); } catch (e) { /* хранилище недоступно */ }
    if (typeof Sync !== 'undefined') Sync.touched(key); // прогресс уходит и на другие устройства
  },
};

// ---------- Подсказка ----------
let _tipEl = null, _tipTimer = null;
function showTip(content, x, y, delay = 0) {
  clearTimeout(_tipTimer);
  const show = () => {
    if (!_tipEl) { _tipEl = h('div', { class: 'tip' }); document.body.appendChild(_tipEl); }
    clear(_tipEl);
    if (typeof content === 'string') _tipEl.textContent = content; else _tipEl.appendChild(content);
    _tipEl.style.display = 'block';
    const r = _tipEl.getBoundingClientRect();
    const vx = Math.min(x + 14, window.innerWidth - r.width - 6), vy = y + 18 + r.height > window.innerHeight ? y - r.height - 8 : y + 18;
    _tipEl.style.left = Math.max(4, vx) + 'px';
    _tipEl.style.top = Math.max(4, vy) + 'px';
  };
  if (delay) _tipTimer = setTimeout(show, delay); else show();
}
function hideTip() { clearTimeout(_tipTimer); if (_tipEl) _tipEl.style.display = 'none'; }

// ---------- Контекстное / всплывающее меню ----------
let _menuEl = null, _menuOff = null;
function showMenu(items, x, y, opts = {}) {
  hideMenu();
  _menuEl = h('div', { class: 'ctxmenu' + (opts.cls ? ' ' + opts.cls : '') });
  for (const it of items) {
    if (it.sep) { _menuEl.appendChild(h('div', { class: 'sep' })); continue; }
    const row = h('div', { class: 'item' + (it.disabled ? ' disabled' : '') + (it.checked ? ' checked' : ''), title: it.title || null },
      it.icon ? h('span', { class: 'mi', html: it.icon }) : null, h('span', { class: 'ml' }, it.label), it.right ? h('span', { class: 'mr' }, it.right) : null);
    if (!it.disabled) row.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); hideMenu(); it.action && it.action(); });
    _menuEl.appendChild(row);
  }
  document.body.appendChild(_menuEl);
  const r = _menuEl.getBoundingClientRect();
  _menuEl.style.left = Math.max(2, Math.min(x, window.innerWidth - r.width - 4)) + 'px';
  _menuEl.style.top = Math.max(2, Math.min(y, window.innerHeight - r.height - 4)) + 'px';
  const off = (e) => { if (_menuEl && _menuEl.contains(e.target)) return; hideMenu(); };
  _menuOff = off;
  setTimeout(() => { if (_menuOff === off) document.addEventListener('mousedown', off, true); }, 0);
}
function hideMenu() {
  if (_menuEl) { _menuEl.remove(); _menuEl = null; }
  if (_menuOff) { document.removeEventListener('mousedown', _menuOff, true); _menuOff = null; }
}

// ---------- Плавающие окна ----------
let _zTop = 100;
function makeWindow({ title, w = 640, h: hh = 480, x, y, cls = '', onClose, icon }) {
  const ws = document.getElementById('app').getBoundingClientRect();
  const px = x !== undefined ? x : Math.max(10, (ws.width - w) / 2 + (Math.random() * 60 - 30));
  const py = y !== undefined ? y : Math.max(10, (ws.height - hh) / 2 + (Math.random() * 40 - 20));
  const titleEl = h('span', { class: 'wtitle' }, title);
  const closeBtn = h('button', { class: 'wclose', title: 'Close' }, '×');
  const bar = h('div', { class: 'wbar' }, icon ? h('span', { class: 'wicon', html: icon }) : null, titleEl, closeBtn);
  const body = h('div', { class: 'wbody' });
  const el = h('div', { class: 'win ' + cls, style: { left: px + 'px', top: py + 'px', width: w + 'px', height: hh + 'px', zIndex: ++_zTop } }, bar, body);
  document.getElementById('app').appendChild(el);
  const win = {
    el, body,
    setTitle(t) { titleEl.textContent = t; },
    close() { el.remove(); onClose && onClose(); },
    focus() { el.style.zIndex = ++_zTop; },
  };
  closeBtn.addEventListener('click', () => win.close());
  el.addEventListener('mousedown', () => win.focus());
  bar.addEventListener('mousedown', (e) => {
    if (e.target === closeBtn) return;
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = el.offsetLeft, oy = el.offsetTop;
    const mv = (ev) => {
      const nx = Math.min(window.innerWidth - 80, Math.max(-w + 80, ox + ev.clientX - sx));
      const ny = Math.min(window.innerHeight - 40, Math.max(0, oy + ev.clientY - sy));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
    };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv);
    document.addEventListener('mouseup', up);
  });
  return win;
}

// ---------- Диалоги ----------
function dialog({ title, body, buttons = [{ label: 'OK', primary: true }], w = 420 }) {
  return new Promise((resolve) => {
    const shade = h('div', { class: 'shade' });
    const btns = h('div', { class: 'dlg-btns' });
    const box = h('div', { class: 'dlg', style: { width: w + 'px' } }, h('div', { class: 'dlg-title' }, title), h('div', { class: 'dlg-body' }, body), btns);
    for (const b of buttons) {
      btns.appendChild(h('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: () => { shade.remove(); resolve(b.value !== undefined ? b.value : b.label); } }, b.label));
    }
    shade.appendChild(box);
    document.body.appendChild(shade);
    const first = box.querySelector('input,select,textarea') || box.querySelector('.btn.primary');
    if (first) setTimeout(() => first.focus(), 0);
    shade.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { shade.remove(); resolve(null); }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { const p = buttons.find((b) => b.primary); if (p) { shade.remove(); resolve(p.value !== undefined ? p.value : p.label); } }
    });
  });
}

// Модальное окно без кнопок-результатов (закрывается вызовом close)
function modal(title, body, w = 520) {
  const shade = h('div', { class: 'shade' });
  const box = h('div', { class: 'dlg', style: { width: w + 'px' } }, h('div', { class: 'dlg-title' }, title, h('button', { class: 'wclose', onclick: () => shade.remove() }, '×')), h('div', { class: 'dlg-body' }, body));
  shade.appendChild(box);
  shade.addEventListener('mousedown', (e) => { if (e.target === shade) shade.remove(); });
  document.body.appendChild(shade);
  return { close: () => shade.remove() };
}

function toast(text, kind = '') {
  const el = h('div', { class: 'toast ' + kind }, text);
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 2600);
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: filename });
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

function pickFile(accept) {
  return new Promise((resolve) => {
    const inp = h('input', { type: 'file', accept, style: { display: 'none' } });
    inp.addEventListener('change', () => {
      const f = inp.files[0];
      if (!f) return resolve(null);
      const rd = new FileReader();
      rd.onload = () => resolve({ name: f.name, text: rd.result });
      rd.readAsText(f);
    });
    document.body.appendChild(inp);
    inp.click();
    setTimeout(() => inp.remove(), 60000);
  });
}
