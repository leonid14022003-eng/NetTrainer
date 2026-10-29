'use strict';
// Логическая рабочая область: устройства, кабели, индикаторы портов, инструменты.

const CABLE_NAMES = { straight: 'Copper Straight-Through', cross: 'Copper Cross-Over', console: 'Console', auto: 'Automatic' };

const Workspace = {
  svg: null, vpG: null,
  drag: null, temp: null, pduSrc: null, selected: null, clipboard: null,
  amber: new Map(),
  hoverTimer: null,

  init() {
    this.svg = document.getElementById('ws');
    this.svg.innerHTML = '';
    const defs = svgEl('defs');
    defs.innerHTML = '<pattern id="gridp" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0 H0 V40" fill="none" stroke="var(--grid)" stroke-width="1"/></pattern>';
    this.svg.appendChild(defs);
    this.bg = svgEl('rect', { class: 'wsbg', x: -5000, y: -5000, width: 10000, height: 10000 });
    this.vpG = svgEl('g', { id: 'vp' });
    this.layers = {};
    for (const n of ['grid', 'shapes', 'links', 'lights', 'devices', 'anim', 'temp']) { this.layers[n] = svgEl('g', { class: 'L-' + n }); this.vpG.appendChild(this.layers[n]); }
    this.layers.grid.appendChild(this.bg);
    this.svg.appendChild(this.vpG);

    const s = this.svg;
    s.addEventListener('mousedown', (e) => this.onDown(e));
    window.addEventListener('mousemove', (e) => this.onMove(e));
    window.addEventListener('mouseup', (e) => this.onUp(e));
    s.addEventListener('contextmenu', (e) => this.onContext(e));
    s.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    s.addEventListener('mouseleave', () => hideTip());
    s.addEventListener('dragover', (e) => { e.preventDefault(); });
    s.addEventListener('drop', (e) => {
      e.preventDefault();
      const model = e.dataTransfer.getData('text/x-model');
      if (model && DEVICE_CATALOG[model]) { const p = this.toWorld(e.clientX, e.clientY); this.placeDevice(model, p.x, p.y); }
    });
    s.addEventListener('dblclick', (e) => {
      const n = e.target.closest('[data-note]');
      if (n) this.editNote(n.dataset.note);
    });
  },

  toWorld(cx, cy) {
    const r = this.svg.getBoundingClientRect();
    const v = App.vpCur();
    return { x: (cx - r.left - v.x) / v.z, y: (cy - r.top - v.y) / v.z };
  },

  cancelTemp() { this.temp = null; this.pduSrc = null; if (this.layers) clear(this.layers.temp); },

  // ---------- Отрисовка ----------
  render() {
    const topo = App.topo();
    if (!topo || !this.svg) return;
    const v = App.vpCur();
    this.vpG.setAttribute('transform', 'translate(' + v.x + ' ' + v.y + ') scale(' + v.z + ')');
    this.bg.setAttribute('fill', App.prefs.grid ? 'url(#gridp)' : 'transparent');
    this.renderShapes(topo);
    this.renderLinks(topo);
    this.renderDevices(topo);
    App.updateHint();
  },

  renderShapes(topo) {
    const L = clear(this.layers.shapes);
    for (const n of topo.notes || []) {
      let el;
      if (n.type === 'note') {
        el = svgEl('text', { x: n.x, y: n.y, class: 'note', 'data-note': n.id });
        String(n.text).split('\n').forEach((line, i) => { const ts = svgEl('tspan', { x: n.x, dy: i ? '1.25em' : 0 }); ts.textContent = line; el.appendChild(ts); });
      } else if (n.type === 'rect') el = svgEl('rect', { x: n.x, y: n.y, width: n.w, height: n.h, fill: n.fill || 'none', stroke: n.stroke || '#000', 'stroke-width': 2, 'data-note': n.id, class: 'shape' });
      else if (n.type === 'ellipse') el = svgEl('ellipse', { cx: n.x + n.w / 2, cy: n.y + n.h / 2, rx: Math.abs(n.w / 2), ry: Math.abs(n.h / 2), fill: n.fill || 'none', stroke: n.stroke || '#000', 'stroke-width': 2, 'data-note': n.id, class: 'shape' });
      else if (n.type === 'line') el = svgEl('line', { x1: n.x, y1: n.y, x2: n.x + n.w, y2: n.y + n.h, stroke: n.stroke || '#000', 'stroke-width': 2, 'data-note': n.id, class: 'shape' });
      else if (n.type === 'free') el = svgEl('polyline', { points: n.points.map((p) => p.join(',')).join(' '), fill: 'none', stroke: n.stroke || '#000', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'data-note': n.id, class: 'shape' });
      if (el) L.appendChild(el);
    }
  },

  linkGeom(topo, l) {
    const A0 = topo.devices[l.a.dev], B0 = topo.devices[l.b.dev];
    const dx = B0.x - A0.x, dy = B0.y - A0.y, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    // параллельные кабели между одними и теми же устройствами (EtherChannel) раздвигаем, чтобы был виден каждый
    const pair = (x) => [x.a.dev, x.b.dev].sort().join('|');
    const same = l.cable === 'console' ? [l] : Object.values(topo.links).filter((x) => x.cable !== 'console' && pair(x) === pair(l)).sort((p, q) => (p.id < q.id ? -1 : 1));
    let off = (same.indexOf(l) - (same.length - 1) / 2) * 16;
    if (l.a.dev > l.b.dev) off = -off; // сдвиг в одну сторону, как бы ни был направлен кабель
    const ox = -uy * off, oy = ux * off;
    return { A: { x: A0.x + ox, y: A0.y + oy }, B: { x: B0.x + ox, y: B0.y + oy }, dx, dy, len, ux, uy };
  },

  renderLinks(topo) {
    const L = clear(this.layers.links), LL = clear(this.layers.lights);
    const now = Date.now();
    for (const l of Object.values(topo.links)) {
      const g = this.linkGeom(topo, l);
      const { A, B } = g;
      let line;
      if (l.cable === 'console') {
        const mx = (A.x + B.x) / 2 - g.uy * 30, my = (A.y + B.y) / 2 + g.ux * 30;
        line = svgEl('path', { d: 'M' + A.x + ' ' + A.y + ' Q' + mx + ' ' + my + ' ' + B.x + ' ' + B.y, class: 'link console' });
      } else {
        line = svgEl('line', { x1: A.x, y1: A.y, x2: B.x, y2: B.y, class: 'link ' + l.cable });
      }
      L.appendChild(line);
      const hit = line.cloneNode();
      hit.setAttribute('class', 'linkhit');
      hit.dataset.link = l.id;
      L.appendChild(hit);
      if (l.cable === 'console') continue;
      for (const [end, dev, sign] of [[l.a, A, 1], [l.b, B, -1]]) {
        const st = linkEndState(topo, l, end);
        let color = st === 'up' || st === 'blocked' ? 'var(--led-up)' : 'var(--led-down)';
        const am = this.amber.get(end.dev + '|' + end.port);
        // оранжевый, как в Packet Tracer: порт только что поднялся или STP / EtherChannel не пускает через него кадры
        if (st === 'blocked' || (st === 'up' && am && am > now)) color = 'var(--led-amber)';
        const d = Math.min(34, g.len * 0.28);
        const px = dev.x + sign * g.ux * d, py = dev.y + sign * g.uy * d;
        const ang = Math.atan2(sign * g.uy, sign * g.ux) * 180 / Math.PI;
        LL.appendChild(svgEl('polygon', { points: '-5,-4.5 5,0 -5,4.5', transform: 'translate(' + px + ' ' + py + ') rotate(' + ang + ')', fill: color, class: 'led' }));
        if (App.prefs.portLabels && g.len > 90) {
          const d2 = Math.min(58, g.len * 0.4);
          const tx = dev.x + sign * g.ux * d2 - g.uy * 9, ty = dev.y + sign * g.uy * d2 + g.ux * 9 + 3;
          const t = svgEl('text', { x: tx, y: ty, class: 'plabel', 'text-anchor': 'middle' });
          t.textContent = ifShort(end.port);
          LL.appendChild(t);
        }
      }
    }
  },

  renderDevices(topo) {
    const L = clear(this.layers.devices);
    for (const d of Object.values(topo.devices)) {
      const [w, hh] = deviceIconSize(d);
      const g = svgEl('g', { class: 'dev' + (d.off ? ' off' : '') + (this.selected === d.id ? ' sel' : '') + (this.pduSrc === d.id ? ' picked' : '') + (this.temp && this.temp.start && this.temp.start.dev === d.id ? ' picked' : ''), 'data-id': d.id, transform: 'translate(' + d.x + ' ' + d.y + ')' });
      g.appendChild(svgEl('rect', { x: -w / 2 - 4, y: -hh / 2 - 4, width: w + 8, height: hh + 8, class: 'devhit', rx: 6 }));
      const u = svgEl('use', { href: '#' + deviceIconId(d), x: -w / 2, y: -hh / 2, width: w, height: hh });
      g.appendChild(u);
      let y = hh / 2 + 12;
      if (App.prefs.modelLabels) { const t1 = svgEl('text', { y, class: 'dlabel model', 'text-anchor': 'middle' }); t1.textContent = DEVICE_CATALOG[d.model].display; g.appendChild(t1); y += 12; }
      const t2 = svgEl('text', { y, class: 'dlabel', 'text-anchor': 'middle' });
      t2.textContent = d.name;
      g.appendChild(t2);
      L.appendChild(g);
    }
  },

  // ---------- Мышь ----------
  devAt(e) { const g = e.target.closest && e.target.closest('.dev'); return g ? g.dataset.id : null; },
  linkAt(e) { const t = e.target; return t && t.dataset && t.dataset.link ? t.dataset.link : null; },
  noteAt(e) { const n = e.target.closest && e.target.closest('[data-note]'); return n ? n.dataset.note : null; },

  onDown(e) {
    if (e.button !== 0) return;
    hideTip(); hideMenu();
    const topo = App.topo();
    const p = this.toWorld(e.clientX, e.clientY);
    const devId = this.devAt(e), linkId = this.linkAt(e), noteId = this.noteAt(e);
    const tool = App.tool;
    if (tool === 'place') { this.placeDevice(App.placeModel, p.x, p.y, e.shiftKey); return; }
    if (tool === 'cable') { if (devId) this.cableClick(devId, e); return; }
    if (tool === 'delete') {
      if (devId) this.deleteDevice(devId);
      else if (linkId) this.deleteLink(linkId);
      else if (noteId) { App.checkpoint(); topo.notes = topo.notes.filter((n) => n.id !== noteId); App.changed(); }
      return;
    }
    if (tool === 'inspect') { if (devId) this.inspectMenu(devId, e.clientX, e.clientY); return; }
    if (tool === 'pdu') {
      if (!devId) return;
      if (!this.pduSrc) { this.pduSrc = devId; this.render(); Bottom.updateStatus(); return; }
      if (devId === this.pduSrc) return;
      Sim.addSimplePdu(this.pduSrc, devId);
      this.pduSrc = null;
      this.render();
      return;
    }
    if (tool === 'note') {
      this.addNote(p.x, p.y);
      return;
    }
    if (['rect', 'ellipse', 'line', 'freeform'].includes(tool)) {
      this.drag = { kind: 'shape', tool, x0: p.x, y0: p.y, points: [[p.x, p.y]] };
      return;
    }
    if (tool === 'resize' && noteId) {
      const n = topo.notes.find((x) => x.id === noteId);
      if (n && n.type !== 'note') { App.checkpoint(); this.drag = { kind: 'resize', note: n, x0: p.x, y0: p.y, w0: n.w, h0: n.h }; }
      return;
    }
    // select
    if (devId) {
      const d = topo.devices[devId];
      this.drag = { kind: 'dev', id: devId, sx: e.clientX, sy: e.clientY, ox: d.x, oy: d.y, moved: false };
      if (this.selected !== devId) { this.selected = devId; App.queueRender(); }
    } else if (noteId) {
      const n = topo.notes.find((x) => x.id === noteId);
      this.drag = { kind: 'note', note: n, sx: e.clientX, sy: e.clientY, ox: n.x, oy: n.y, moved: false, pts: n.points ? n.points.map((q) => q.slice()) : null };
    } else {
      if (this.selected) { this.selected = null; App.queueRender(); } // клик по пустому месту снимает выделение
      const v = App.vpCur();
      this.drag = { kind: 'pan', sx: e.clientX, sy: e.clientY, ox: v.x, oy: v.y };
      this.svg.classList.add('panning');
    }
  },

  onMove(e) {
    if (App.view === 'physical' || !this.svg) return;
    const inSvg = e.target && this.svg.contains(e.target);
    const p = this.toWorld(e.clientX, e.clientY);
    if (inSvg) document.getElementById('coords').textContent = 'x: ' + Math.round(p.x) + ', y: ' + Math.round(p.y);
    const topo = App.topo();
    const d = this.drag;
    if (d) {
      const v = App.vpCur();
      if (d.kind === 'pan') { v.x = d.ox + e.clientX - d.sx; v.y = d.oy + e.clientY - d.sy; this.vpG.setAttribute('transform', 'translate(' + v.x + ' ' + v.y + ') scale(' + v.z + ')'); return; }
      if (d.kind === 'dev') {
        const dx = (e.clientX - d.sx) / v.z, dy = (e.clientY - d.sy) / v.z;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) { App.checkpoint(); d.moved = true; }
        const dev = topo.devices[d.id];
        dev.x = Math.round(d.ox + dx); dev.y = Math.round(d.oy + dy);
        this.renderLinks(topo); this.renderDevices(topo);
        return;
      }
      if (d.kind === 'note') {
        const dx = (e.clientX - d.sx) / v.z, dy = (e.clientY - d.sy) / v.z;
        if (!d.moved && Math.hypot(dx, dy) < 3) return;
        if (!d.moved) { App.checkpoint(); d.moved = true; }
        d.note.x = Math.round(d.ox + dx); d.note.y = Math.round(d.oy + dy);
        if (d.pts) d.note.points = d.pts.map(([x, y]) => [x + dx, y + dy]);
        this.renderShapes(topo);
        return;
      }
      if (d.kind === 'shape') {
        d.x1 = p.x; d.y1 = p.y;
        if (d.tool === 'freeform') d.points.push([p.x, p.y]);
        this.drawTempShape(d);
        return;
      }
      if (d.kind === 'resize') { d.note.w = Math.max(8, d.w0 + p.x - d.x0); d.note.h = Math.max(8, d.h0 + p.y - d.y0); this.renderShapes(topo); return; }
    }
    // временная линия кабеля
    if (this.temp && this.temp.start) {
      const s = topo.devices[this.temp.start.dev];
      clear(this.layers.temp).appendChild(svgEl('line', { x1: s.x, y1: s.y, x2: p.x, y2: p.y, class: 'link temp ' + (App.cableType || '') }));
    }
    // подсказки при наведении
    if (!inSvg) return;
    const devId = this.devAt(e), linkId = this.linkAt(e);
    const key = devId ? 'd' + devId : linkId ? 'l' + linkId : null;
    if (key !== this.hoverKey) {
      this.hoverKey = key;
      hideTip();
      if (devId && App.tool === 'select') showTip(deviceTipEl(topo, devId), e.clientX, e.clientY, 700);
      else if (linkId) showTip(linkTipEl(topo, linkId), e.clientX, e.clientY, 350);
    }
  },

  onUp(e) {
    const d = this.drag;
    this.drag = null;
    this.svg && this.svg.classList.remove('panning');
    if (!d) return;
    const topo = App.topo();
    if (d.kind === 'dev') {
      if (d.moved) App.changed({ noCommit: true });
      else DevWin.open(topo, d.id);
    } else if (d.kind === 'note' && d.moved) App.changed({ noCommit: true });
    else if (d.kind === 'shape') {
      clear(this.layers.temp);
      if (d.x1 === undefined) return;
      App.checkpoint();
      const id = 'n' + topo.seq++;
      const pal = App.prefs.palette || { stroke: '#000000', fill: 'none' };
      let n;
      if (d.tool === 'freeform') n = { id, type: 'free', points: d.points, stroke: pal.stroke, x: d.x0, y: d.y0 };
      else if (d.tool === 'line') n = { id, type: 'line', x: d.x0, y: d.y0, w: d.x1 - d.x0, h: d.y1 - d.y0, stroke: pal.stroke };
      else {
        const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
        n = { id, type: d.tool, x, y, w: Math.abs(d.x1 - d.x0), h: Math.abs(d.y1 - d.y0), stroke: pal.stroke, fill: pal.fill };
      }
      topo.notes = topo.notes || [];
      topo.notes.push(n);
      App.changed({ noCommit: true });
    } else if (d.kind === 'resize') App.changed({ noCommit: true });
  },

  drawTempShape(d) {
    const L = clear(this.layers.temp);
    const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1), w = Math.abs(d.x1 - d.x0), hh = Math.abs(d.y1 - d.y0);
    if (d.tool === 'rect') L.appendChild(svgEl('rect', { x, y, width: w, height: hh, class: 'tempshape' }));
    if (d.tool === 'ellipse') L.appendChild(svgEl('ellipse', { cx: x + w / 2, cy: y + hh / 2, rx: w / 2, ry: hh / 2, class: 'tempshape' }));
    if (d.tool === 'line') L.appendChild(svgEl('line', { x1: d.x0, y1: d.y0, x2: d.x1, y2: d.y1, class: 'tempshape' }));
    if (d.tool === 'freeform') L.appendChild(svgEl('polyline', { points: d.points.map((q) => q.join(',')).join(' '), class: 'tempshape' }));
  },

  onWheel(e) {
    e.preventDefault();
    const v = App.vpCur();
    if (e.ctrlKey || e.metaKey) {
      const r = this.svg.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      const f = Math.exp(-e.deltaY * 0.0022);
      const nz = Math.max(0.3, Math.min(3, v.z * f));
      v.x = mx - (mx - v.x) * (nz / v.z); v.y = my - (my - v.y) * (nz / v.z); v.z = nz;
    } else { v.x -= e.deltaX; v.y -= e.deltaY; }
    this.vpG.setAttribute('transform', 'translate(' + v.x + ' ' + v.y + ') scale(' + v.z + ')');
  },

  onContext(e) {
    e.preventDefault();
    hideTip();
    const topo = App.topo();
    const devId = this.devAt(e), linkId = this.linkAt(e), noteId = this.noteAt(e);
    if (devId) {
      const d = topo.devices[devId];
      const items = [
        { label: 'Open', action: () => DevWin.open(topo, devId) },
        { label: d.type === 'pc' ? 'Desktop' : d.type === 'hub' ? 'Physical' : 'CLI', disabled: d.type === 'hub', action: () => DevWin.open(topo, devId, d.type === 'pc' ? 'desktop' : 'cli') },
        { label: 'Inspect tables...', disabled: d.type === 'hub', action: () => this.inspectMenu(devId, e.clientX, e.clientY) },
        { label: 'Rename...', action: () => this.rename(devId) },
        { label: d.off ? 'Power On' : 'Power Off', disabled: d.type === 'switch' || d.type === 'hub', action: () => { d.off = !d.off; App.changed(); } },
        { sep: true },
        { label: 'Delete Device', action: () => this.deleteDevice(devId) },
      ];
      showMenu(items, e.clientX, e.clientY);
    } else if (linkId) {
      showMenu([
        { label: 'Cable: ' + CABLE_NAMES[topo.links[linkId].cable], disabled: true },
        { label: 'Delete Cable', action: () => this.deleteLink(linkId) },
      ], e.clientX, e.clientY);
    } else if (noteId) {
      showMenu([{ label: 'Edit Note', action: () => this.editNote(noteId) }, { label: 'Delete', action: () => { App.checkpoint(); topo.notes = topo.notes.filter((n) => n.id !== noteId); App.changed(); } }], e.clientX, e.clientY);
    } else {
      const p = this.toWorld(e.clientX, e.clientY);
      showMenu([
        { label: 'Paste', disabled: !this.clipboard, action: () => this.paste(p) },
        { label: 'Place Note', action: () => this.addNote(p.x, p.y) },
        { label: 'Fit all in view', action: () => this.fit() },
      ], e.clientX, e.clientY);
    }
  },

  // ---------- Действия ----------
  placeDevice(model, x, y, keep) {
    if (!model) return;
    const topo = App.topo();
    App.checkpoint();
    const d = addDevice(topo, model, x, y);
    this.selected = d.id;
    if (!keep) App.setTool('select');
    App.changed();
  },

  selectedDevice() { return this.selected && App.topo() ? App.topo().devices[this.selected] || null : null; },

  deleteSelected() {
    const d = this.selectedDevice();
    if (!d) { App.setTool('delete'); return; }
    const name = d.name;
    this.deleteDevice(d.id);
    toast('Deleted ' + name + ' — Undo: ⌘Z (удалено, отменить: ⌘Z)');
  },

  deleteDevice(id) {
    if (this.selected === id) this.selected = null;
    App.checkpoint();
    DevWin.close(App.topo(), id);
    removeDevice(App.topo(), id);
    App.changed();
  },

  deleteLink(id) { App.checkpoint(); removeLink(App.topo(), id); App.changed(); },

  async rename(id) {
    const d = App.topo().devices[id];
    const inp = h('input', { class: 'inp', value: d.name });
    const r = await dialog({ title: 'Rename device', body: h('div', null, h('label', null, 'Display Name: '), inp), buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r || !inp.value.trim()) return;
    App.checkpoint();
    d.name = inp.value.trim();
    App.changed({ noCommit: true });
  },

  async addNote(x, y) {
    const ta = h('textarea', { class: 'inp', rows: 3, style: { width: '100%' } });
    const r = await dialog({ title: 'Place Note', body: ta, buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r || !ta.value.trim()) { App.setTool('select'); return; }
    const topo = App.topo();
    App.checkpoint();
    topo.notes = topo.notes || [];
    topo.notes.push({ id: 'n' + topo.seq++, type: 'note', x, y, text: ta.value });
    App.setTool('select');
    App.changed({ noCommit: true });
  },

  async editNote(id) {
    const topo = App.topo();
    const n = topo.notes.find((x) => x.id === id);
    if (!n || n.type !== 'note') return;
    const ta = h('textarea', { class: 'inp', rows: 3, style: { width: '100%' } }, n.text);
    const r = await dialog({ title: 'Edit Note', body: ta, buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r) return;
    App.checkpoint();
    n.text = ta.value;
    App.changed({ noCommit: true });
  },

  async paletteDialog() {
    const pal = App.prefs.palette || { stroke: '#000000', fill: 'none' };
    const st = h('input', { type: 'color', value: pal.stroke });
    const fl = h('input', { type: 'color', value: pal.fill === 'none' ? '#ffffff' : pal.fill });
    const nofill = h('input', { type: 'checkbox', checked: pal.fill === 'none' });
    const r = await dialog({ title: 'Palette Dialog', body: h('div', { class: 'col' },
      h('label', null, 'Outline color: ', st), h('label', null, nofill, ' No Fill'), h('label', null, 'Fill color: ', fl)), buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r) return;
    App.prefs.palette = { stroke: st.value, fill: nofill.checked ? 'none' : fl.value };
    App.queueSave();
  },

  copySelected() {
    const d = this.selected && App.topo().devices[this.selected];
    if (!d) { toast('First click a device to select it, then Copy (сначала выделите устройство)'); return; }
    this.clipboard = JSON.parse(JSON.stringify({ model: d.model, cfg: d.cfg, x: d.x, y: d.y }));
    toast('Copied ' + d.name + ' — now Paste (скопировано, теперь Paste)');
    App.updateToolbar();
  },

  paste(p) {
    if (!this.clipboard) { toast('Copy a device first (сначала скопируйте устройство)'); return; }
    const topo = App.topo();
    App.checkpoint();
    const c = this.clipboard;
    const d = addDevice(topo, c.model, p ? p.x : c.x + 40, p ? p.y : c.y + 40);
    d.cfg = JSON.parse(JSON.stringify(c.cfg));
    if (d.cfg.dhcpBindings) d.cfg.dhcpBindings = {};
    this.selected = d.id;
    this.clipboard.x += 40; this.clipboard.y += 40; // следующая вставка — рядом, а не поверх
    App.changed();
  },

  fit(bottomInset = 0) {
    const topo = App.topo();
    const ds = Object.values(topo.devices);
    const v = App.vpCur();
    if (!ds.length) { v.x = 0; v.y = 0; v.z = 1; App.queueRender(); return; }
    const xs = ds.map((d) => d.x), ys = ds.map((d) => d.y);
    const minX = Math.min(...xs) - 70, maxX = Math.max(...xs) + 70, minY = Math.min(...ys) - 60, maxY = Math.max(...ys) + 70;
    const r = this.svg.getBoundingClientRect();
    const hh = Math.max(120, r.height - bottomInset); // снизу может лежать панель демонстрации
    const z = Math.max(0.4, Math.min(1.6, Math.min(r.width / (maxX - minX), hh / (maxY - minY))));
    v.z = z; v.x = (r.width - (maxX - minX) * z) / 2 - minX * z; v.y = (hh - (maxY - minY) * z) / 2 - minY * z;
    App.queueRender();
  },

  // ---------- Кабели ----------
  cableClick(devId, e) {
    const topo = App.topo();
    const dev = topo.devices[devId];
    const auto = App.cableType === 'auto';
    if (!this.temp || !this.temp.start) {
      if (auto) {
        const port = firstFreePort(dev, null, false);
        if (!port) { toast(dev.name + ': no free ports'); return; }
        this.temp = { start: { dev: devId, port } };
        this.render();
      } else {
        this.portMenu(dev, e.clientX, e.clientY, (port) => { this.temp = { start: { dev: devId, port } }; this.render(); });
      }
      return;
    }
    const st = this.temp.start;
    if (st.dev === devId) return;
    if (auto) {
      const A = topo.devices[st.dev];
      const prefer = (A.type === 'router' || A.type === 'switch') && dev.type !== 'pc' ? 'Gigabit' : null;
      let port = firstFreePort(dev, prefer, false);
      if (!port) { toast(dev.name + ': no free ports'); return; }
      // перевыбрать порт старта с учётом второго устройства
      let sport = st.port;
      if ((dev.type === 'router' || dev.type === 'switch') && A.type !== 'pc') sport = firstFreePort(A, 'Gigabit', false) || sport;
      this.makeLink(st.dev, sport, devId, port, 'auto');
    } else {
      this.portMenu(dev, e.clientX, e.clientY, (port) => this.makeLink(st.dev, st.port, devId, port, App.cableType));
    }
  },

  portMenu(dev, x, y, cb) {
    const cat = DEVICE_CATALOG[dev.model];
    const wantConsole = App.cableType === 'console';
    const names = [...(cat.menu || []), ...cat.ports];
    const items = names.map((n) => {
      const p = getPort(dev, n);
      const isCon = p && p.console;
      const ok = p && !p.link && !!isCon === wantConsole;
      const color = !p ? '#555' : isCon ? '#2b6f9e' : n.startsWith('Gigabit') ? '#e87f3a' : '#e8c34a';
      return { label: n + (p && p.link ? '  (in use)' : ''), disabled: !ok, icon: '<span class="pdot" style="background:' + color + '"></span>', action: () => cb(n) };
    });
    showMenu(items, x, y, { cls: 'portmenu' });
  },

  makeLink(a, ap, b, bp, cable) {
    const topo = App.topo();
    App.checkpoint();
    const r = addLink(topo, a, ap, b, bp, cable);
    this.temp = null;
    clear(this.layers.temp);
    if (r.error) {
      App.undoStacks[App.topoKey()].pop();
      const msg = { 'port-busy': 'Port is already in use', 'port-type': 'This cable does not fit these ports (console cable: RS 232 ↔ Console)', 'same-device': 'Cannot connect a device to itself' }[r.error] || r.error;
      toast(msg, 'err');
      return;
    }
    const now = Date.now() + 3000;
    for (const end of [r.link.a, r.link.b]) if (topo.devices[end.dev].type === 'switch') this.amber.set(end.dev + '|' + end.port, now);
    setTimeout(() => App.queueRender(), 3100);
    App.changed();
  },

  inspectMenu(devId, x, y) {
    const topo = App.topo();
    const d = topo.devices[devId];
    const items = [];
    if (d.type === 'router') items.push({ label: 'Routing Table', action: () => inspectWin(d, 'Routing Table', iosShowIpRoute(topo, d)) });
    if (d.type === 'switch') items.push({ label: 'MAC Table', action: () => inspectWin(d, 'MAC Table', iosShowMac(topo, d)) });
    if (d.type === 'switch') items.push({ label: 'VLAN Table', action: () => inspectWin(d, 'VLAN Table', iosShowVlanBrief(topo, d)) });
    if (d.type !== 'hub') items.push({ label: 'ARP Table', action: () => inspectWin(d, 'ARP Table', d.type === 'pc' ? pcArpText(topo, d) : iosShowArp(topo, d)) });
    if (d.type === 'router' && Object.keys(d.cfg.dhcpPools).length) items.push({ label: 'DHCP Bindings', action: () => inspectWin(d, 'DHCP Bindings', iosShowDhcpBinding(topo, d)) });
    if (d.type === 'router' && d.cfg.ospf) items.push({ label: 'OSPF Neighbors', action: () => inspectWin(d, 'OSPF Neighbors', iosShowOspfNbr(topo, d)) });
    if (!items.length) items.push({ label: 'No tables', disabled: true });
    showMenu(items, x, y);
  },
};

function inspectWin(d, title, text) {
  const w = makeWindow({ title: d.name + ' — ' + title, w: 620, h: 340 });
  w.body.appendChild(h('pre', { class: 'mono pad scroll' }, text));
}

function pcArpText(topo, d) {
  const t = netRt(topo).arp[d.id] || {};
  const e = Object.entries(t);
  if (!e.length) return 'No ARP Entries Found';
  return 'Internet Address      Physical Address      Type\n' + e.map(([ip, x]) => padR(ip, 22) + padR(x.mac.toLowerCase(), 22) + 'dynamic').join('\n');
}

// Таблица портов при наведении на устройство
function deviceTipEl(topo, id) {
  const d = topo.devices[id];
  const cat = DEVICE_CATALOG[d.model];
  const lines = ['Device Name: ' + d.name, 'Device Model: ' + cat.display];
  if (d.type === 'router' || d.type === 'switch') lines.push('Hostname: ' + d.cfg.hostname);
  if (d.off) lines.push('Power: OFF');
  lines.push('');
  lines.push(padR('Port', 24) + padR('Link', 6) + padR('VLAN', 6) + padR('IP Address', 20) + 'MAC Address');
  const ports = d.ports.filter((p) => !p.console);
  for (const p of ports) {
    const up = portPhysUp(topo, d.id, p.name);
    let vlan = '--', ip = '<not set>';
    if (d.type === 'switch') vlan = String(d.cfg.interfaces[p.name].accessVlan);
    if (d.type === 'pc' && d.cfg.ip) ip = d.cfg.ip + '/' + maskToLen(d.cfg.mask);
    if (d.type === 'router') { const a = ifAddr(d, p.name); if (a) ip = intToIp(a.ip) + '/' + a.len; }
    lines.push(padR(p.name, 24) + padR(up ? 'Up' : 'Down', 6) + padR(vlan, 6) + padR(ip, 20) + (p.mac || ''));
  }
  if (d.type !== 'pc' && d.type !== 'hub') {
    for (const n of Object.keys(d.cfg.interfaces)) {
      if (ifKind(n) === 'phys') continue;
      const a = ifAddr(d, n);
      lines.push(padR(n, 24) + padR(ifUp(topo, d, n) ? 'Up' : 'Down', 6) + padR(ifKind(n) === 'svi' ? n.slice(4) : '--', 6) + padR(a ? intToIp(a.ip) + '/' + a.len : '<not set>', 20) + ifMac(d, n));
    }
  }
  if (d.type === 'pc') lines.push('', 'Gateway: ' + (d.cfg.gateway || '<not set>') + (d.cfg.ipMode === 'dhcp' ? '   (DHCP)' : ''));
  lines.push('', 'Physical Location: Intercity > Home City > Corporate Office > Main Wiring Closet');
  return h('pre', { class: 'mono' }, lines.join('\n'));
}

function linkTipEl(topo, id) {
  const l = topo.links[id];
  const A = topo.devices[l.a.dev], B = topo.devices[l.b.dev];
  const lines = ['Source Device: ' + A.name, 'Source Port: ' + l.a.port, 'Dest. Device: ' + B.name, 'Dest. Port: ' + l.b.port, 'Cable Type: ' + CABLE_NAMES[l.cable]];
  if (l.cable !== 'console' && !linkCableOk(topo, l)) lines.push('', '⚠ Wrong cable type — use ' + CABLE_NAMES[correctCable(A, B)]);
  return h('pre', { class: 'mono' }, lines.join('\n'));
}
