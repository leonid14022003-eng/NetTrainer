'use strict';
// Режим симуляции и PDU: список событий, проигрывание, анимация конвертов, Simple PDU.

const PROTO_COLORS = { ICMP: '#d26ee8', ARP: '#e8c547', DHCP: '#4fc3e8' };
const PDU_COLORS = ['#e74c3c', '#2ecc71', '#3498db', '#9b59b6', '#f39c12', '#1abc9c', '#e67e22', '#34495e'];

const Sim = {
  pduMap: new WeakMap(),
  events: [], step: -1, playing: false, timer: null, speed: 1, filters: { ARP: true, ICMP: true, DHCP: true },
  pending: null, onDone: null, showPduList: true, scenario: 0,

  init() {
    setNetSimHook((topo, devId) => this.captureFor(topo, devId));
    this.renderScenario();
    this.renderPduList();
  },

  pdus() {
    const t = App.topo();
    let l = this.pduMap.get(t);
    if (!l) { l = []; this.pduMap.set(t, l); }
    return l;
  },

  // Захват событий для текущего действия (ping/DHCP) в режиме симуляции
  captureFor(topo, devId) {
    if (App.mode !== 'simulation' || topo !== App.topo()) return undefined;
    const events = [], stepRef = { v: 0 };
    setTimeout(() => this.load(events), 0);
    return { events, stepRef, done() {} };
  },

  load(events, onDone) {
    if (!events.length) return;
    this.stop();
    this.events = events.slice().sort((a, b) => a.step - b.step);
    this.step = -1;
    this.onDone = onDone || null;
    this.renderPanel();
    this.play();
  },

  visible(e) { return this.filters[e.proto] !== false; },
  maxStep() { return this.events.length ? Math.max(...this.events.map((e) => e.step)) : -1; },

  play() {
    if (!this.events.length) return;
    this.playing = true;
    this.renderPanel();
    const tick = () => {
      if (!this.playing) return;
      if (this.step >= this.maxStep()) { this.finish(); return; }
      this.forward();
      this.timer = setTimeout(tick, 900 / this.speed);
    };
    tick();
  },
  pause() { this.playing = false; clearTimeout(this.timer); this.renderPanel(); },
  stop() { this.pause(); clear(Workspace.layers ? Workspace.layers.anim : h('g')); },
  finish() {
    this.pause();
    if (this.onDone) { const f = this.onDone; this.onDone = null; f(); }
  },
  forward() {
    if (this.step >= this.maxStep()) { this.finish(); return; }
    this.step++;
    while (this.step < this.maxStep() && !this.events.some((e) => e.step === this.step && this.visible(e))) this.step++;
    this.animateStep(this.step);
    this.renderPanel();
  },
  back() {
    if (this.step <= 0) return;
    this.step--;
    this.animateStep(this.step, true);
    this.renderPanel();
  },
  reset() {
    this.stop();
    this.events = []; this.step = -1;
    for (const p of this.pdus()) if (p.status === 'In Progress') p.status = '';
    this.renderPanel(); this.renderPduList();
  },

  animateStep(s, instant) {
    const L = Workspace.layers && Workspace.layers.anim;
    if (!L || App.view === 'physical') return;
    clear(L);
    const topo = App.topo();
    const evs = this.events.filter((e) => e.step === s && this.visible(e));
    const dur = instant ? 1 : 700 / this.speed;
    const items = [];
    for (const e of evs) {
      const A = topo.devices[e.from], B = topo.devices[e.to];
      if (!A || !B) continue;
      if (e.fail) {
        const g = svgEl('g', { transform: 'translate(' + A.x + ' ' + (A.y - 30) + ')' });
        g.innerHTML = '<circle r="11" fill="#fff" stroke="#d33" stroke-width="2"/><path d="M-6 -6 L6 6 M6 -6 L-6 6" stroke="#d33" stroke-width="3"/>';
        L.appendChild(g);
        continue;
      }
      const g = svgEl('g', { class: 'env' });
      g.innerHTML = '<use href="#p-env" x="-12" y="-9" width="24" height="18" style="color:' + (PROTO_COLORS[e.proto] || '#ccc') + '"/>';
      L.appendChild(g);
      items.push({ g, A, B });
    }
    const t0 = performance.now();
    const frame = (now) => {
      const k = Math.min(1, (now - t0) / dur);
      for (const it of items) {
        const x = it.A.x + (it.B.x - it.A.x) * k, y = it.A.y + (it.B.y - it.A.y) * k - 6;
        it.g.setAttribute('transform', 'translate(' + x + ' ' + y + ')');
      }
      if (k < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  },

  // ---------- Simple PDU ----------
  primaryIp(dev) {
    if (dev.type === 'pc') return dev.cfg.ip;
    if (dev.type === 'hub') return null;
    const list = l3Ifaces(dev).filter((i) => ifUp(App.topo(), dev, i.name));
    const any = list.length ? list : l3Ifaces(dev);
    return any.length ? intToIp(any[0].ip) : null;
  },

  addSimplePdu(srcId, dstId) {
    const topo = App.topo();
    const list = this.pdus();
    const dst = topo.devices[dstId];
    const pdu = { id: Date.now(), src: srcId, dst: dstId, ip: this.primaryIp(dst), color: PDU_COLORS[list.length % PDU_COLORS.length], num: list.length + 1, time: Math.floor((Date.now() - App.startTime) / 1000), status: '' };
    list.push(pdu);
    this.fire(pdu);
  },

  fire(pdu) {
    const topo = App.topo();
    if (!topo.devices[pdu.src] || !topo.devices[pdu.dst]) { pdu.status = 'Failed'; this.renderPduList(); return; }
    if (!pdu.ip) { pdu.status = 'Failed'; this.renderPduList(); toast(topo.devices[pdu.dst].name + ' has no IP address', 'err'); return; }
    if (App.mode === 'simulation') {
      const events = [], stepRef = { v: 0 };
      const r = pingOnce(topo, pdu.src, ipToInt(pdu.ip), { arp: true, events, stepRef });
      pdu.status = 'In Progress';
      this.load(events, () => { pdu.status = r.status === 'reply' ? 'Successful' : 'Failed'; this.renderPduList(); });
    } else {
      const r = pingOnce(topo, pdu.src, ipToInt(pdu.ip), { arp: true });
      pdu.status = r.status === 'reply' ? 'Successful' : 'Failed';
    }
    this.renderPduList();
  },

  // ---------- Нижняя панель сценариев ----------
  renderScenario() {
    const el = clear(document.getElementById('scenario'));
    appendKids(el, [
      h('div', { class: 'scrow' }, h('button', { class: 'scinfo', title: 'Scenario Information', onclick: () => toast('Scenario 0: PDUs you add with the envelope tool (сценарий — список отправленных пакетов)') }, h('span', null, 'i')),
        h('select', { class: 'scsel', title: 'Scenario' }, h('option', null, 'Scenario 0'))),
      h('div', { class: 'scrow sc2' }, h('button', { class: 'navybtn', title: 'New scenario (clear PDUs)', onclick: () => { this.pdus().length = 0; this.renderPduList(); } }, 'New'),
        h('button', { class: 'navybtn', title: 'Delete all PDUs', onclick: () => { this.pdus().length = 0; this.reset(); } }, 'Delete')),
      h('div', { class: 'scrow sc2' }, h('button', { class: 'navybtn', onclick: () => { this.showPduList = !this.showPduList; this.renderPduList(); } }, 'Toggle PDU List Window')),
    ]);
  },

  renderPduList() {
    const el = document.getElementById('pdulist');
    if (!el) return;
    clear(el);
    el.style.visibility = this.showPduList ? 'visible' : 'hidden';
    const hdr = ['Fire', 'Last Status', 'Source', 'Destination', 'Type', 'Color', 'Time(sec)', 'Periodic', 'Num', 'Edit', 'Delete'];
    const tbl = h('table', { class: 'pdutbl' }, h('tr', null, hdr.map((x) => h('th', null, x))));
    const topo = App.topo();
    for (const p of this.pdus()) {
      const name = (id) => (topo.devices[id] ? topo.devices[id].name : '?');
      tbl.appendChild(h('tr', null,
        h('td', null, h('span', { class: 'fire', style: { background: p.status === 'Successful' ? '#2ecc71' : p.status === 'Failed' ? '#e74c3c' : '#bbb' }, title: 'Fire again', onclick: () => this.fire(p) })),
        h('td', { class: p.status === 'Failed' ? 'bad' : p.status === 'Successful' ? 'good' : '' }, p.status),
        h('td', null, name(p.src)), h('td', null, name(p.dst)), h('td', null, 'ICMP'),
        h('td', null, h('span', { class: 'swatch', style: { background: p.color } })), h('td', null, String(p.time)), h('td', null, 'N'), h('td', null, String(p.num)),
        h('td', null, h('a', { href: '#', onclick: (e) => { e.preventDefault(); this.fire(p); } }, '(fire)')),
        h('td', null, h('a', { href: '#', onclick: (e) => { e.preventDefault(); const l = this.pdus(); l.splice(l.indexOf(p), 1); this.renderPduList(); } }, '(delete)'))));
    }
    el.appendChild(tbl);
  },

  // ---------- Панель симуляции ----------
  caption() { return simCaption(App.topo(), this.events.filter((e) => e.step === this.step && this.visible(e))); },

  renderPanel() {
    if (typeof DemoUI !== 'undefined') DemoUI.update();
    const el = document.getElementById('simpanel');
    if (!el || App.mode !== 'simulation') return;
    const cap = this.caption();
    clear(el);
    const topo = App.topo();
    const nm = (id) => (topo.devices[id] ? topo.devices[id].name : '?');
    const rows = this.events.filter((e) => this.visible(e) && e.step <= Math.max(this.step, -1)).map((e) => h('tr', { class: e.step === this.step ? 'cur' : '', onclick: () => this.pduInfo(e) },
      h('td', null, h('span', { class: 'swatch', style: { background: e.fail ? '#e74c3c' : PROTO_COLORS[e.proto] } })),
      h('td', null, ((e.step + 1) * 0.001).toFixed(3)), h('td', null, e.fail ? '--' : nm(e.from)), h('td', null, nm(e.to)), h('td', null, e.fail ? e.proto + ' (dropped)' : e.proto)));
    const list = h('div', { class: 'evlist' }, h('table', { class: 'grid' }, h('tr', null, h('th', null, 'Vis.'), h('th', null, 'Time(sec)'), h('th', null, 'Last Device'), h('th', null, 'At Device'), h('th', null, 'Type')), rows));
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 0);
    const btn = (icon, title, fn, on) => h('button', { class: 'pbtn' + (on ? ' on' : ''), title, html: iconUse(icon, 18, 18), onclick: fn });
    appendKids(el, [
      h('div', { class: 'sphead' }, 'Simulation Panel'),
      cap ? h('div', { class: 'simcap' }, h('div', { class: 'clabel' }, '💬 ', tri('What is happening', 'что происходит', 'מה קורה')), bi(cap)) : null,
      h('div', { class: 'sub' }, 'Event List'),
      list,
      h('div', { class: 'sprow' }, h('button', { class: 'btn sm', onclick: () => this.reset() }, 'Reset Simulation'),
        h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Constant Delay'),
        h('span', { class: 'muted' }, 'Captured to: ' + (this.step >= 0 ? ((this.step + 1) * 0.001).toFixed(3) : '0.000'))),
      h('div', { class: 'sub' }, 'Play Controls'),
      h('div', { class: 'sprow' }, btn('p-back', 'Back', () => { this.pause(); this.back(); }), this.playing ? btn('p-pause', 'Pause', () => this.pause(), true) : btn('p-play', 'Play (Auto Capture)', () => this.play()),
        btn('p-fwd', 'Capture / Forward', () => { this.pause(); this.forward(); }),
        h('label', { class: 'speed' }, 'Speed ', h('input', { type: 'range', min: 0.3, max: 3, step: 0.1, value: this.speed, oninput: (e) => { this.speed = Number(e.target.value); } }))),
      h('div', { class: 'sub' }, 'Event List Filters — Visible Events'),
      h('div', { class: 'sprow' }, Object.keys(this.filters).map((p) => h('label', { class: 'filt' }, h('input', { type: 'checkbox', checked: this.filters[p], onchange: (e) => { this.filters[p] = e.target.checked; this.renderPanel(); } }), ' ', h('span', { class: 'swatch', style: { background: PROTO_COLORS[p] } }), ' ' + p))),
      h('div', { class: 'hintbox' }, this.events.length ? 'Click an event to see the PDU details.' : 'Use Add Simple PDU (envelope) or ping from a PC to capture packets. — Добавьте Simple PDU (конверт) или выполните ping с ПК, чтобы увидеть пакеты.'),
    ]);
  },

  pduInfo(e) {
    const topo = App.topo();
    const A = topo.devices[e.from], B = topo.devices[e.to];
    const pa = A && getPort(A, e.fromPort), pb = B && getPort(B, e.toPort);
    const i = e.info || {};
    const lines = ['PDU Information at Device: ' + (B ? B.name : '?'), '', 'Type: ' + e.proto + (i.type ? ' ' + i.type : '') + (i.kind ? ' ' + i.kind : ''), ''];
    if (e.fail) lines.push('The device dropped the packet (no route / next hop not reachable / no reply).');
    else {
      lines.push('In Layers', '  Layer 1: Port ' + (e.toPort || '?'));
      lines.push('  Layer 2: Ethernet II Header  ' + (pa && pa.mac ? pa.mac : '?') + ' >> ' + (e.proto === 'ARP' && i.kind === 'request' ? 'FFFF.FFFF.FFFF' : pb && pb.mac ? pb.mac : '?') + (e.tag ? '   802.1Q tag: VLAN ' + e.tag : ''));
      if (e.proto === 'ARP') lines.push('  Layer 3: ARP ' + (i.kind === 'reply' ? 'Reply' : 'Request') + ' — who has ' + i.target + '?');
      else if (e.proto === 'DHCP') lines.push('  Layer 3: IP 0.0.0.0 >> 255.255.255.255', '  Layer 4: UDP 68 >> 67', '  Layer 7: DHCP ' + (i.type || '') + (i.ip ? ' (' + i.ip + ')' : ''));
      else lines.push('  Layer 3: IP Header Src. IP: ' + (i.src || '?') + ', Dest. IP: ' + (i.dst || '?') + (i.ttl ? ', TTL: ' + i.ttl : ''), '           ICMP Message Type: ' + (i.type === 'Echo Reply' ? '0 (Echo Reply)' : '8 (Echo Request)'));
      lines.push('', 'Out Layers', '  Layer 1: Port ' + (e.fromPort || '?') + ' on ' + (A ? A.name : '?'));
    }
    const w = makeWindow({ title: 'PDU Information at Device: ' + (B ? B.name : '?'), w: 560, h: 320 });
    w.body.appendChild(h('pre', { class: 'mono pad scroll' }, lines.join('\n')));
  },
};
