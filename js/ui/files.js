'use strict';
// Проекты и картинка схемы. В онлайн-версии (claude.ai) браузер запрещает скачивание и печать,
// поэтому проекты сохраняются прямо в браузере, а вместо печати — картинка, которую можно сохранить.

const AUTOSAVE_NAME = 'Last session (autosave)';

const Projects = {
  all() { return Store.get('projects', {}); },
  put(name, topo) { const p = this.all(); p[name] = { saved: Date.now(), topo: JSON.parse(JSON.stringify(topo)) }; Store.set('projects', p); },
  remove(name) { const p = this.all(); delete p[name]; Store.set('projects', p); },
};

function loadProject(obj, label) {
  if (!obj || typeof obj !== 'object' || !obj.devices) throw new Error('this is not a NetTrainer project');
  if (App.view !== 'logical' && App.view !== 'physical') App.setView('logical');
  App.checkpoint();
  DevWin.closeAll();
  restoreTopoInPlace(App.sandbox, JSON.stringify(obj));
  Workspace.selected = null;
  App.projectName = label;
  App.changed();
  setTimeout(() => Workspace.fit(), 30);
  toast('Opened — открыто: ' + label);
}

function fmtDate(ts) { const d = new Date(ts); return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }

// Копирование в буфер: только внутри клика; если запрещено — показываем текст выделенным.
function copyText(text, fallbackBox) {
  const show = () => { if (!fallbackBox) return; clear(fallbackBox); const ta = h('textarea', { class: 'inp mono projtext', readonly: true }, text); fallbackBox.appendChild(h('p', { class: 'muted' }, 'Copy this text (⌘C / Ctrl+C) — скопируйте текст:')); fallbackBox.appendChild(ta); ta.focus(); ta.select(); };
  try {
    navigator.clipboard.writeText(text).then(() => toast('Copied — скопировано'), show);
  } catch (e) { show(); }
}

function fileSave() {
  const def = App.projectName || (App.view === 'training' && App.training ? 'training-' + App.training.task.templateId : 'network-' + new Date().toISOString().slice(0, 10));
  const inp = h('input', { class: 'inp', id: 'proj-name', value: def });
  const extra = h('div');
  let m = null;
  const text = () => JSON.stringify(App.topo());
  const name = () => (inp.value.trim() || def).replace(/\.ntr(\.json)?$/i, '');
  const body = h('div', { class: 'col projdlg' },
    h('label', { for: 'proj-name' }, 'Project name — название'), inp,
    h('div', { class: 'projbtns' },
      h('button', { class: 'btn primary', onclick: () => {
        const n = name();
        if (Projects.all()[n] && !confirmOverwrite.checked) { confirmRow.hidden = false; return; }
        Projects.put(n, App.topo()); App.projectName = n; m.close(); toast('Saved in this browser — сохранено: ' + n);
      } }, '💾 Save in this browser'),
      h('button', { class: 'btn', onclick: () => { downloadText(name() + '.ntr.json', JSON.stringify(App.topo(), null, 1)); toast('Downloading… In the online version downloads are blocked — use "Save in this browser".'); } }, '⬇ Download file'),
      h('button', { class: 'btn', onclick: () => copyText(text(), extra) }, '📋 Copy as text')),
    h('p', { class: 'muted small' }, 'Your current work is also kept automatically in this browser. Saved projects appear in Open. — Текущая работа и так сохраняется автоматически; сохранённые проекты видны в Open.'),
    extra);
  const confirmOverwrite = h('input', { type: 'checkbox', id: 'proj-over' });
  const confirmRow = h('label', { class: 'projover', for: 'proj-over', hidden: true }, confirmOverwrite, ' A project with this name exists — replace it? (заменить?)');
  body.insertBefore(confirmRow, body.children[2]);
  m = modal('Save project — сохранить проект', body, 520);
  setTimeout(() => { inp.focus(); inp.select(); }, 0);
}

function fileOpen() {
  let m = null;
  const list = h('div', { class: 'projlist' });
  const fill = () => {
    clear(list);
    const all = Object.entries(Projects.all()).sort((a, b) => (b[0] === AUTOSAVE_NAME) - (a[0] === AUTOSAVE_NAME) || b[1].saved - a[1].saved);
    if (!all.length) { list.appendChild(h('p', { class: 'muted' }, 'No projects saved in this browser yet. — Пока нет сохранённых проектов.')); return; }
    for (const [n, p] of all) {
      const nd = Object.keys(p.topo.devices || {}).length;
      list.appendChild(h('div', { class: 'projrow' },
        h('div', { class: 'projinfo' }, h('b', null, n), h('span', { class: 'muted small' }, fmtDate(p.saved) + ' · ' + nd + ' devices')),
        h('button', { class: 'btn primary sm', onclick: () => { m.close(); loadProject(p.topo, n); } }, 'Open'),
        h('button', { class: 'btn sm', title: 'Delete this saved project', onclick: () => { Projects.remove(n); fill(); } }, '🗑')));
    }
  };
  fill();
  const paste = h('div');
  const body = h('div', { class: 'col projdlg' },
    h('div', { class: 'sechdr' }, 'Saved in this browser', h('span', { class: 'ru' }, ' · сохранённые проекты')), list,
    h('div', { class: 'projbtns' },
      h('button', { class: 'btn', onclick: async () => {
        const f = await pickFile('.json,.ntr,application/json');
        if (!f) return;
        try { loadProject(JSON.parse(f.text), f.name.replace(/\.ntr(\.json)?$|\.json$/i, '')); m.close(); }
        catch (e) { toast('Cannot read this file: ' + e.message); }
      } }, '📂 Open a file…'),
      h('button', { class: 'btn', onclick: () => {
        clear(paste);
        const ta = h('textarea', { class: 'inp mono projtext', id: 'proj-paste', placeholder: 'Paste the project text here — вставьте текст проекта' });
        paste.appendChild(ta);
        paste.appendChild(h('button', { class: 'btn primary', onclick: () => { try { loadProject(JSON.parse(ta.value), 'pasted project'); m.close(); } catch (e) { toast('This text is not a NetTrainer project'); } } }, 'Open pasted project'));
        ta.focus();
      } }, '📋 Paste text…')),
    paste);
  m = modal('Open project — открыть проект', body, 560);
}

// ---------- Картинка схемы (вместо печати) ----------
const PIC_PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-opacity', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'paint-order', 'visibility', 'display'];

function workspaceSvgText() {
  // только содержимое: заметки/фигуры, кабели, устройства (без огромного фонового прямоугольника)
  const L = Workspace.layers;
  const parts = [L.shapes, L.links, L.lights, L.devices].filter((g) => g && g.childNodes.length);
  if (!parts.length) return null;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const g of parts) { const b = g.getBBox(); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height); }
  const pad = 30, x = x1 - pad, y = y1 - pad, w = x2 - x1 + pad * 2, hgt = y2 - y1 + pad * 2;
  const out = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  for (const g of parts) {
    const clone = g.cloneNode(true);
    const a = [g, ...g.querySelectorAll('*')], b = [clone, ...clone.querySelectorAll('*')];
    for (let i = 0; i < a.length; i++) {
      const cs = getComputedStyle(a[i]);
      b[i].setAttribute('style', PIC_PROPS.map((p) => p + ':' + cs.getPropertyValue(p)).join(';'));
      b[i].removeAttribute('class');
    }
    out.appendChild(clone);
  }
  // значки — символы из спрайта; вместе с ними градиенты и вложенные символы, на которые они ссылаются
  const ids = new Set(), queue = [];
  const scan = (html) => { for (const m of html.matchAll(/(?:href="#|url\(#)([\w-]+)/g)) queue.push(m[1]); };
  scan(new XMLSerializer().serializeToString(out));
  while (queue.length) {
    const id = queue.pop();
    if (ids.has(id)) continue;
    const el = document.getElementById(id);
    if (!el) continue;
    ids.add(id);
    scan(el.outerHTML);
  }
  const defs = [...ids].map((id) => document.getElementById(id).outerHTML).join('');
  const bg = getComputedStyle(document.getElementById('stage')).backgroundColor || '#fff';
  return { w, h: hgt, svg: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + Math.round(w) + '" height="' + Math.round(hgt) + '" viewBox="' + x + ' ' + y + ' ' + w + ' ' + hgt + '"><defs>' + defs + '</defs><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hgt + '" fill="' + bg + '"/>' + new XMLSerializer().serializeToString(out) + '</svg>' };
}

async function exportPicture() {
  if (App.view === 'physical' || App.view === 'learn') App.setView('logical');
  const topo = App.topo();
  if (!Object.keys(topo.devices).length && !(topo.notes || []).length) { toast('The workspace is empty — nothing to draw yet. (Рабочая область пуста.)'); return; }
  const pic = workspaceSvgText();
  if (!pic) { toast('Nothing to draw'); return; }
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(pic.svg);
  let url = svgUrl, png = false;
  try {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = svgUrl; });
    const scale = 2, c = document.createElement('canvas');
    c.width = Math.round(pic.w * scale); c.height = Math.round(pic.h * scale);
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, pic.w, pic.h);
    url = c.toDataURL('image/png'); png = true;
  } catch (e) { /* остаётся SVG-картинка */ }
  const name = (App.projectName || 'network') + (png ? '.png' : '.svg');
  modal('Picture of the network — картинка схемы', h('div', { class: 'col' },
    h('img', { class: 'picimg', src: url, alt: 'Network diagram' }),
    h('p', { class: 'muted small' }, 'Right-click the picture → "Save image as…" (on a phone: press and hold). Printing is blocked in the online version, so this replaces Print. — Нажмите правой кнопкой → «Сохранить картинку» (на телефоне — долгое нажатие).'),
    h('div', { class: 'projbtns' }, h('button', { class: 'btn', onclick: () => { const a = h('a', { href: url, download: name }); document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 300); } }, '⬇ Download ' + (png ? 'PNG' : 'SVG')))), 760);
}
