'use strict';
// Физический вид: «Main Wiring Closet» — стойка с сетевым оборудованием, стол с ПК, кабели.

const Physical = {
  el: null, svg: null, layout: null,

  init() {
    this.el = document.getElementById('phys');
    this.el.addEventListener('mousedown', (e) => this.onDown(e));
    this.el.addEventListener('contextmenu', (e) => this.onContext(e));
    this.el.addEventListener('mousemove', (e) => this.onMove(e));
    this.el.addEventListener('mouseleave', () => hideTip());
    this.el.addEventListener('dragover', (e) => e.preventDefault());
    this.el.addEventListener('drop', (e) => {
      e.preventDefault();
      const model = e.dataTransfer.getData('text/x-model');
      if (model) this.placeDevice(model);
    });
    this.el.addEventListener('wheel', (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      App.vp.physical.z = Math.max(0.5, Math.min(2.5, App.vp.physical.z * Math.exp(-e.deltaY * 0.002)));
      this.render();
    }, { passive: false });
  },

  // Свободное место на логической схеме для нового устройства
  placeDevice(model) {
    const topo = App.topo();
    App.checkpoint();
    const n = Object.keys(topo.devices).length;
    addDevice(topo, model, 120 + (n % 6) * 140, 120 + Math.floor(n / 6) * 130);
    App.setTool('select');
    App.changed();
  },

  computeLayout(topo) {
    const z = App.vp.physical.z;
    const devs = Object.values(topo.devices);
    const rackDevs = devs.filter((d) => d.type !== 'pc' || d.model === 'Server');
    const tableDevs = devs.filter((d) => d.type === 'pc' && d.model !== 'Server');
    const rackX = 30 * z, rackY = 70 * z, innerW = 300 * z;
    const pos = {};
    let y = rackY + 44 * z;
    for (const d of rackDevs) {
      const f = frontPanel(d, topo, z);
      const x = rackX + 18 * z + (innerW - f.w) / 2;
      pos[d.id] = { x, y, f };
      y += f.h + 22 * z;
    }
    const rackH = Math.max(420 * z, y - rackY + 30 * z);
    const tableX = rackX + innerW + 150 * z;
    const perTable = 4;
    const tables = [];
    tableDevs.forEach((d, i) => {
      const ti = Math.floor(i / perTable), k = i % perTable;
      const f = frontPanel(d, topo, z);
      const tx = tableX + ti * 460 * z;
      const ty = rackY + rackH - 150 * z;
      if (!tables[ti]) tables[ti] = { x: tx, y: ty };
      pos[d.id] = { x: tx + 20 * z + k * 105 * z, y: ty - f.h, f };
    });
    const width = Math.max(1100 * z, tableX + Math.max(1, tables.length) * 460 * z + 60, this.el ? this.el.clientWidth : 0);
    const height = Math.max(rackY + rackH + 80 * z, this.el ? this.el.clientHeight - 4 : 0);
    return { z, rackX, rackY, innerW, rackH, pos, tables, width, height };
  },

  render() {
    const topo = App.topo();
    if (!this.el || App.view !== 'physical') return;
    const L = this.layout = this.computeLayout(topo);
    const z = L.z;
    let s = '<svg id="physsvg" width="' + L.width + '" height="' + L.height + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<rect width="100%" height="100%" class="physbg"/>';
    s += '<rect x="0" y="0" width="' + L.width + '" height="' + 26 * z + '" fill="#2b2f33"/><text x="' + 10 * z + '" y="' + 17 * z + '" font-size="' + 10 * z + '" fill="#ddd">&lt;&lt; Cable Conduit to Corporate Office</text>';
    // стойка
    const rx = L.rackX, ry = L.rackY, rw = L.innerW + 36 * z;
    s += '<rect x="' + rx + '" y="' + ry + '" width="' + rw + '" height="' + L.rackH + '" fill="#f7f7f7" stroke="#2d5aa8" stroke-width="' + 2 * z + '"/>';
    s += '<rect x="' + rx + '" y="' + ry + '" width="' + 14 * z + '" height="' + L.rackH + '" fill="#2d5aa8"/><rect x="' + (rx + rw - 14 * z) + '" y="' + ry + '" width="' + 14 * z + '" height="' + L.rackH + '" fill="#2d5aa8"/>';
    s += '<rect x="' + (rx + 14 * z) + '" y="' + ry + '" width="' + 4 * z + '" height="' + L.rackH + '" fill="#8a6a3a"/><rect x="' + (rx + rw - 18 * z) + '" y="' + ry + '" width="' + 4 * z + '" height="' + L.rackH + '" fill="#8a6a3a"/>';
    s += '<text x="' + (rx + rw / 2) + '" y="' + (ry - 6 * z) + '" text-anchor="middle" font-size="' + 10 * z + '" class="ptext">Rack</text>';
    // блок питания (PDU)
    s += '<rect x="' + (rx + 18 * z) + '" y="' + (ry + 8 * z) + '" width="' + L.innerW + '" height="' + 22 * z + '" rx="' + 2 * z + '" fill="#cfd3d6" stroke="#888"/>';
    for (let i = 0; i < 12; i++) s += '<rect x="' + (rx + (30 + i * 23) * z) + '" y="' + (ry + 13 * z) + '" width="' + 12 * z + '" height="' + 11 * z + '" rx="' + 2 * z + '" fill="#555"/>';
    s += '<text x="' + (rx + rw / 2) + '" y="' + (ry + 38 * z) + '" text-anchor="middle" font-size="' + 7 * z + '" class="ptext">Power Distribution Device0</text>';
    // столы
    for (const t of L.tables) {
      s += '<rect x="' + t.x + '" y="' + t.y + '" width="' + 440 * z + '" height="' + 12 * z + '" fill="#1f2a44"/><rect x="' + (t.x + 10 * z) + '" y="' + (t.y + 12 * z) + '" width="' + 420 * z + '" height="' + 8 * z + '" fill="#2d5aa8"/>';
      s += '<rect x="' + (t.x + 14 * z) + '" y="' + (t.y + 20 * z) + '" width="' + 10 * z + '" height="' + 120 * z + '" fill="#2d5aa8"/><rect x="' + (t.x + 416 * z) + '" y="' + (t.y + 20 * z) + '" width="' + 10 * z + '" height="' + 120 * z + '" fill="#2d5aa8"/>';
      s += '<text x="' + (t.x + 220 * z) + '" y="' + (t.y + 19 * z) + '" text-anchor="middle" font-size="' + 7 * z + '" fill="#fff">Table</text>';
    }
    // устройства
    for (const d of Object.values(topo.devices)) {
      const p = L.pos[d.id];
      if (!p) continue;
      s += '<g class="pdev" data-id="' + d.id + '" transform="translate(' + p.x + ' ' + p.y + ')">' + p.f.svg + '</g>';
      s += '<text x="' + (p.x + p.f.w / 2) + '" y="' + (p.y + p.f.h + 10 * z) + '" text-anchor="middle" font-size="' + 8 * z + '" class="ptext">' + escapeHtml(d.name) + '</text>';
    }
    // кабели
    for (const l of Object.values(topo.links)) {
      const a = this.portPos(topo, l.a), b = this.portPos(topo, l.b);
      if (!a || !b) continue;
      const color = l.color || (l.cable === 'console' ? '#5fb4e8' : l.cable === 'cross' ? '#9ccc65' : '#8bc34a');
      let d;
      if (l.managed) {
        const ex = L.rackX + L.innerW + 30 * z;
        d = 'M' + a.x + ' ' + a.y + ' L' + ex + ' ' + a.y + ' L' + ex + ' ' + b.y + ' L' + b.x + ' ' + b.y;
      } else {
        const sag = Math.max(60 * z, Math.abs(a.x - b.x) * 0.35);
        d = 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + (a.y + sag) + ' ' + b.x + ' ' + (b.y + sag) + ' ' + b.x + ' ' + b.y;
      }
      s += '<path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="' + 2.2 * z + '" class="pcable"' + (l.managed ? ' stroke-dasharray="' + 6 * z + ' ' + 3 * z + '"' : '') + '/>';
      s += '<path d="' + d + '" fill="none" stroke="transparent" stroke-width="' + 10 * z + '" class="pcablehit" data-link="' + l.id + '"/>';
    }
    s += '</svg>';
    this.el.innerHTML = s;
    document.getElementById('physpath').textContent = 'Intercity > Home City > Corporate Office > Main Wiring Closet';
  },

  portPos(topo, end) {
    const d = topo.devices[end.dev];
    const p = this.layout.pos[end.dev];
    if (!d || !p) return null;
    const port = p.f.ports.find((x) => x.name === end.port);
    if (port) return { x: p.x + port.x, y: p.y + port.y };
    // консольный порт — с края устройства
    return { x: p.x + p.f.w - 6, y: p.y + p.f.h / 2 };
  },

  devAt(e) { const g = e.target.closest && e.target.closest('.pdev'); return g ? g.dataset.id : null; },
  linkAt(e) { return e.target && e.target.dataset ? e.target.dataset.link || null : null; },

  onDown(e) {
    if (e.button !== 0) return;
    hideTip();
    const devId = this.devAt(e), linkId = this.linkAt(e);
    const topo = App.topo();
    if (App.tool === 'place') { this.placeDevice(App.placeModel); return; }
    if (App.tool === 'cable' && devId) { Workspace.cableClick(devId, e); Bottom.updateStatus(); return; }
    if (App.tool === 'delete') { if (devId) Workspace.deleteDevice(devId); else if (linkId) Workspace.deleteLink(linkId); return; }
    if (App.tool === 'pdu' && devId) {
      if (!Workspace.pduSrc) Workspace.pduSrc = devId;
      else if (devId !== Workspace.pduSrc) { Sim.addSimplePdu(Workspace.pduSrc, devId); Workspace.pduSrc = null; }
      Bottom.updateStatus();
      return;
    }
    if (devId) DevWin.open(topo, devId);
  },

  onMove(e) {
    const devId = this.devAt(e), linkId = this.linkAt(e);
    const topo = App.topo();
    const key = devId ? 'd' + devId : linkId ? 'l' + linkId : null;
    if (key === this.hoverKey) return;
    this.hoverKey = key;
    hideTip();
    if (devId) showTip(deviceTipEl(topo, devId), e.clientX, e.clientY, 600);
    else if (linkId) showTip(linkTipEl(topo, linkId), e.clientX, e.clientY, 250);
  },

  onContext(e) {
    e.preventDefault();
    hideTip();
    const topo = App.topo();
    const devId = this.devAt(e), linkId = this.linkAt(e);
    if (linkId) {
      const l = topo.links[linkId];
      showMenu([
        { label: l.managed ? 'Unmanage Cable' : 'Manage Cable', action: () => { l.managed = !l.managed; App.changed({ noCommit: true }); } },
        { label: 'Color Cable', action: () => this.colorCable(l) },
        { label: 'Delete Cable', action: () => Workspace.deleteLink(linkId) },
      ], e.clientX, e.clientY);
    } else if (devId) {
      const d = topo.devices[devId];
      const mine = Object.values(topo.links).filter((l) => l.a.dev === devId || l.b.dev === devId);
      showMenu([
        { label: 'Inspect Front', action: () => this.inspect(devId, 'front') },
        { label: 'Inspect Rear', disabled: d.type === 'hub' || d.model === 'Laptop' || d.model === 'Printer', action: () => this.inspect(devId, 'rear') },
        { label: 'Delete Device', action: () => Workspace.deleteDevice(devId) },
        { label: 'Manage All Cables on Device', action: () => { mine.forEach((l) => { l.managed = true; }); App.changed({ noCommit: true }); } },
        { label: 'Unmanage All Cables on Device', action: () => { mine.forEach((l) => { l.managed = false; }); App.changed({ noCommit: true }); } },
      ], e.clientX, e.clientY);
    }
  },

  async colorCable(l) {
    const swatches = ['#8bc34a', '#e53935', '#1e88e5', '#fdd835', '#8e24aa', '#fb8c00', '#00acc1', '#000000', '#ffffff', '#6d4c41', '#ec407a', '#43a047'];
    let picked = l.color || '#8bc34a';
    const inp = h('input', { type: 'color', value: picked });
    const grid = h('div', { class: 'swgrid' }, swatches.map((c) => h('span', { class: 'sw', style: { background: c }, onclick: () => { picked = c; inp.value = c; } })));
    const r = await dialog({ title: 'Select Color', body: h('div', null, h('div', { class: 'sub' }, 'Basic colors'), grid, h('div', { class: 'frow' }, h('label', null, 'Custom: '), inp)),
      buttons: [{ label: 'OK', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r) return;
    l.color = inp.value;
    App.changed({ noCommit: true });
  },

  inspect(devId, side) {
    const topo = App.topo();
    const d = topo.devices[devId];
    let zoom = 2;
    const w = makeWindow({ title: d.name + ' — ' + (side === 'front' ? 'Front' : 'Rear'), w: 700, h: 230, cls: 'inspectwin' });
    const holder = h('div', { class: 'pad scroll' });
    const draw = () => {
      clear(holder);
      const p = side === 'front' ? frontPanel(d, topo, zoom) : rearPanel(d, zoom);
      const s = svgEl('svg', { width: p.w + 4, height: p.h + 4 });
      s.innerHTML = '<g transform="translate(2 2)">' + p.svg + '</g>';
      holder.appendChild(s);
      $all('.pjack', s).forEach((j) => { j.addEventListener('mouseenter', (e) => showTip(j.dataset.port, e.clientX, e.clientY)); j.addEventListener('mouseleave', hideTip); });
      const pb = s.querySelector('.power-btn');
      if (pb) pb.addEventListener('click', () => { d.off = !d.off; App.changed(); draw(); });
    };
    w.body.appendChild(h('div', { class: 'pzoom' }, h('button', { class: 'btn sm', onclick: () => { zoom = Math.min(4, zoom * 1.25); draw(); } }, 'Zoom In'), h('button', { class: 'btn sm', onclick: () => { zoom = Math.max(1, zoom / 1.25); draw(); } }, 'Zoom Out'),
      side === 'rear' && (d.type === 'router' || d.type === 'pc') ? h('span', { class: 'muted' }, '  Click the I/O power switch to turn the device off/on.') : null));
    w.body.appendChild(holder);
    draw();
  },
};
