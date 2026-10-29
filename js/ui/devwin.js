'use strict';
// Окна устройств: вкладки Physical / Config / CLI / Desktop / Attributes.

const MODULE_LISTS = {
  isr4: ['NIM-2T', 'NIM-ES2-4', 'NIM-Cover', 'GLC-GE-100FX', 'GLC-LH-SMD', 'GLC-T', 'GLC-TE'],
  isr: ['HWIC-2T', 'HWIC-4ESW', 'HWIC-8A', 'HWIC-1GE-SFP', 'HWIC-AP-AG-B', 'HWIC-1ENET', 'GLC-LH-SMD', 'GLC-T'],
  pc: ['PT-HOST-NM-1AM', 'PT-HOST-NM-1CE', 'PT-HOST-NM-1CFE', 'PT-HOST-NM-1CGE', 'PT-HOST-NM-1FFE', 'PT-HOST-NM-1W', 'PT-HEADPHONE', 'PT-MICROPHONE'],
  laptop: ['PT-LAPTOP-NM-1AM', 'PT-LAPTOP-NM-1CE', 'PT-LAPTOP-NM-1CFE', 'PT-LAPTOP-NM-1CGE', 'PT-LAPTOP-NM-1W'],
};

const DevWin = {
  wins: new Map(),
  key(topo, id) { return (topo === App.sandbox ? 's' : Training.example && topo === Training.example.topo ? 'x' : 't') + '|' + id; },

  open(topo, devId, tab) {
    const key = this.key(topo, devId);
    const ex = this.wins.get(key);
    const dev = topo.devices[devId];
    if (!dev) return;
    if (ex) { ex.win.focus(); if (tab) ex.setTab(tab); return; }
    const isPc = dev.type === 'pc';
    const tabs = dev.type === 'hub' ? ['Physical', 'Attributes'] : isPc ? ['Physical', 'Config', 'Desktop', 'Programming', 'Attributes'] : ['Physical', 'Config', 'CLI', 'Attributes'];
    const win = makeWindow({ title: dev.name, w: 700, h: 560, cls: 'devwin', onClose: () => { st.destroy(); this.wins.delete(key); } });
    const tabbar = h('div', { class: 'tabs' });
    const content = h('div', { class: 'tabcontent' });
    const footer = h('div', { class: 'wfoot' }, h('label', null, h('input', { type: 'checkbox', onchange: (e) => { win.el.classList.toggle('ontop', e.target.checked); } }), ' Top'));
    win.body.appendChild(tabbar); win.body.appendChild(content); win.body.appendChild(footer);
    const st = {
      topo, devId, win, tab: null, views: [], cfgPane: 'settings', app: null, eqLog: [],
      dev() { return topo.devices[devId]; },
      setTab(t) {
        t = (t || 'Physical').toLowerCase();
        if (t === 'programming') { toast('Programming is not available in NetTrainer'); return; }
        this.tab = t;
        $all('.tab', tabbar).forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
        this.renderTab();
      },
      destroy() { for (const v of this.views) v.destroy(); this.views = []; },
      renderTab() {
        this.destroy();
        clear(content);
        const d = this.dev();
        if (!d) return;
        if (this.tab === 'physical') renderPhysTab(this, content);
        else if (this.tab === 'config') renderConfigTab(this, content);
        else if (this.tab === 'cli') renderCliTab(this, content);
        else if (this.tab === 'desktop') renderDesktopTab(this, content);
        else if (this.tab === 'attributes') renderAttrTab(this, content);
      },
      refresh() {
        const d = this.dev();
        if (!d) { win.close(); return; }
        win.setTitle(d.name);
        const ae = document.activeElement;
        const typing = ae && win.el.contains(ae) && (ae.tagName === 'INPUT' || ae.tagName === 'SELECT' || ae.tagName === 'TEXTAREA');
        if (this.tab === 'cli') return;
        if (this.tab === 'desktop' && this.app && this.app !== 'ipconfig') return;
        if (typing) return;
        this.renderTab();
      },
    };
    for (const t of tabs) tabbar.appendChild(h('button', { class: 'tab' + (t === 'Programming' ? ' dis' : ''), dataset: { tab: t.toLowerCase() }, onclick: () => st.setTab(t) }, t));
    this.wins.set(key, { win, st, setTab: (t) => st.setTab(t) });
    st.setTab(tab || (dev.type === 'hub' ? 'physical' : isPc ? 'desktop' : 'cli'));
  },

  close(topo, devId) { const w = this.wins.get(this.key(topo, devId)); if (w) w.win.close(); },
  closeAll() { for (const w of [...this.wins.values()]) w.win.close(); },
  refreshAll() { for (const w of this.wins.values()) w.st.refresh(); },
};

// ---------- Physical ----------
function renderPhysTab(st, el) {
  const d = st.dev();
  const mods = d.type === 'router' ? (d.model.startsWith('43') ? MODULE_LISTS.isr4 : MODULE_LISTS.isr) : d.model === 'PC' ? MODULE_LISTS.pc : d.model === 'Laptop' ? MODULE_LISTS.laptop : [];
  const desc = h('div', { class: 'pdesc' }, d.type === 'router' ? 'Module installation is not simulated in NetTrainer. Built-in Gigabit Ethernet ports are ready to use. Use the power switch on the rear panel to turn the device off/on.'
    : d.type === 'switch' ? 'The switch is powered on automatically once it is connected with a power cable. There is no power button.' : 'Click the power button to turn the device off or on.');
  const list = h('div', { class: 'modules' }, h('div', { class: 'mhead' }, 'MODULES'),
    mods.map((m) => h('div', { class: 'mod', onclick: () => { desc.textContent = m + ': expansion module (decorative in NetTrainer — not simulated).'; } }, m)));
  let zoom = st.physZoom || 1.6;
  const pimg = h('div', { class: 'pimg' });
  const draw = () => {
    clear(pimg);
    const f = frontPanel(d, st.topo, zoom);
    const s1 = svgEl('svg', { width: f.w + 4, height: f.h + 4, class: 'panel' });
    s1.innerHTML = '<g transform="translate(2 2)">' + f.svg + '</g>';
    pimg.appendChild(h('div', { class: 'plabel2' }, 'Front'));
    pimg.appendChild(s1);
    $all('.pjack', s1).forEach((j) => { j.addEventListener('mouseenter', (e) => showTip(j.dataset.port, e.clientX, e.clientY)); j.addEventListener('mouseleave', hideTip); });
    if (d.type === 'router' || d.type === 'switch' || d.type === 'pc') {
      const r = rearPanel(d, Math.min(zoom, 1.6));
      const s2 = svgEl('svg', { width: r.w + 4, height: r.h + 4, class: 'panel' });
      s2.innerHTML = '<g transform="translate(2 2)">' + r.svg + '</g>';
      pimg.appendChild(h('div', { class: 'plabel2' }, 'Rear'));
      pimg.appendChild(s2);
      const pb = s2.querySelector('.power-btn');
      if (pb) pb.addEventListener('click', () => { d.off = !d.off; App.changed(); draw(); });
    }
  };
  const zbar = h('div', { class: 'pzoom' },
    h('button', { class: 'btn sm', onclick: () => { zoom = Math.min(3, zoom * 1.25); st.physZoom = zoom; draw(); } }, 'Zoom In'),
    h('button', { class: 'btn sm', onclick: () => { zoom = 1.6; st.physZoom = zoom; draw(); } }, 'Original Size'),
    h('button', { class: 'btn sm', onclick: () => { zoom = Math.max(0.8, zoom / 1.25); st.physZoom = zoom; draw(); } }, 'Zoom Out'),
    (d.type === 'router' || d.type === 'pc') ? h('button', { class: 'btn sm', onclick: () => { d.off = !d.off; App.changed(); draw(); } }, d.off ? 'Power ON' : 'Power OFF') : null);
  draw();
  el.appendChild(h('div', { class: 'phystab' }, list, h('div', { class: 'pview' }, h('div', { class: 'pheader' }, 'Physical Device View'), zbar, pimg, desc)));
}

// ---------- Config ----------
function guiIos(st, cmds) {
  const topo = st.topo, d = st.dev();
  iosRunConfig(topo, d.id, cmds);
  let mode = '(config)#';
  for (const c of cmds) {
    st.eqLog.push(d.cfg.hostname + mode + c);
    if (/^interface /.test(c)) mode = c.includes('.') ? '(config-subif)#' : '(config-if)#';
    else if (/^router /.test(c)) mode = '(config-router)#';
    else if (/^vlan /.test(c)) mode = '(config-vlan)#';
    else if (c === 'exit') mode = '(config)#';
  }
  App.changed();
}

function field(label, value, onCommit, opts = {}) {
  const inp = h('input', { class: 'inp', value: value || '', placeholder: opts.placeholder || '', disabled: opts.disabled });
  const commit = () => {
    const v = inp.value.trim();
    if (v === (value || '')) return;
    if (opts.validate && v && !opts.validate(v)) { inp.classList.add('bad'); return; }
    inp.classList.remove('bad');
    onCommit(v, inp);
  };
  inp.addEventListener('change', commit);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { commit(); inp.blur(); } });
  if (opts.onBlur) inp.addEventListener('blur', () => opts.onBlur(inp));
  return h('div', { class: 'frow' }, h('label', null, label), inp);
}

function renderConfigTab(st, el) {
  const d = st.dev();
  const nav = h('div', { class: 'cnav' });
  const pane = h('div', { class: 'cpane' });
  const items = [];
  items.push(['hdr', 'GLOBAL'], ['settings', 'Settings']);
  if (d.type === 'router') items.push(['hdr', 'ROUTING'], ['static', 'Static'], ['rip', 'RIP']);
  if (d.type === 'switch') items.push(['hdr', 'SWITCHING'], ['vlandb', 'VLAN Database']);
  items.push(['hdr', 'INTERFACE']);
  const ifs = d.type === 'pc' ? ['FastEthernet0'] : d.ports.filter((p) => !p.console).map((p) => p.name).concat(d.type === 'switch' ? Object.keys(d.cfg.interfaces).filter((n) => n.startsWith('Vlan')) : []);
  for (const n of ifs) items.push(['if:' + n, n]);
  for (const [k, label] of items) {
    if (k === 'hdr') { nav.appendChild(h('div', { class: 'chdr' }, label)); continue; }
    nav.appendChild(h('div', { class: 'citem' + (st.cfgPane === k ? ' on' : ''), onclick: () => { st.cfgPane = k; st.renderTab(); } }, label));
  }
  const body = h('div', { class: 'ccol' }, pane);
  if (d.type !== 'pc') {
    const log = h('pre', { class: 'eqlog' }, st.eqLog.join('\n'));
    body.appendChild(h('div', { class: 'eqbox' }, h('div', { class: 'eqhdr' }, 'Equivalent IOS Commands'), log));
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 0);
  }
  el.appendChild(h('div', { class: 'cfgtab' }, nav, body));
  renderConfigPane(st, pane);
}

function configPaneValid(d, k) {
  if (k === 'settings') return true;
  if (k === 'static' || k === 'rip') return d.type === 'router';
  if (k === 'vlandb') return d.type === 'switch';
  if (k.startsWith('if:')) return d.type === 'pc' ? k === 'if:FastEthernet0' : !!d.cfg.interfaces[k.slice(3)];
  return false;
}

function renderConfigPane(st, pane) {
  const d = st.dev(), topo = st.topo;
  if (!configPaneValid(d, st.cfgPane)) st.cfgPane = 'settings';
  const k = st.cfgPane;
  const title = (t) => h('div', { class: 'ptitle' }, t);
  if (k === 'settings') {
    pane.appendChild(title('Global Settings'));
    pane.appendChild(field('Display Name', d.name, (v) => { App.checkpoint(); d.name = v || d.name; App.changed({ noCommit: true }); }));
    if (d.type === 'pc') {
      const c = d.cfg;
      pane.appendChild(h('div', { class: 'sub' }, 'Gateway/DNS IPv4'));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''), radio('gwmode' + d.id, 'DHCP', c.ipMode === 'dhcp', () => setPcMode(st, 'dhcp')), radio('gwmode' + d.id, 'Static', c.ipMode !== 'dhcp', () => setPcMode(st, 'static'))));
      pane.appendChild(field('Default Gateway', c.gateway, (v) => { c.gateway = v || null; App.changed(); }, { validate: isIp, disabled: c.ipMode === 'dhcp' }));
      pane.appendChild(field('DNS Server', c.dns, (v) => { c.dns = v || null; App.changed(); }, { validate: isIp, disabled: c.ipMode === 'dhcp' }));
      return;
    }
    pane.appendChild(field('Hostname', d.cfg.hostname, (v) => guiIos(st, ['hostname ' + v])));
    pane.appendChild(h('div', { class: 'sub' }, 'NVRAM'));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
      h('button', { class: 'btn sm', onclick: () => { d.startup = null; st.eqLog.push(d.cfg.hostname + '#erase startup-config'); toast('startup-config erased'); App.changed({ noCommit: true }); } }, 'Erase'),
      h('button', { class: 'btn sm', onclick: () => { d.startup = deepClone(d.cfg); st.eqLog.push(d.cfg.hostname + '#copy running-config startup-config'); toast('Saved to startup-config'); App.changed({ noCommit: true }); } }, 'Save')));
    pane.appendChild(h('div', { class: 'sub' }, 'Startup Config'));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
      h('button', { class: 'btn sm', onclick: () => { if (!d.startup) { toast('startup-config is not present'); return; } d.cfg = deepClone(d.startup); App.changed(); } }, 'Load'),
      h('button', { class: 'btn sm', onclick: () => downloadText(d.name + '-startup.txt', d.startup ? iosRunningConfig(topo, d, d.startup, true) : '') }, 'Export')));
    pane.appendChild(h('div', { class: 'sub' }, 'Running Config'));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''), h('button', { class: 'btn sm', onclick: () => downloadText(d.name + '-running.txt', iosRunningConfig(topo, d, d.cfg)) }, 'Export')));
    return;
  }
  if (k === 'static') {
    pane.appendChild(title('Static Routes'));
    const net = h('input', { class: 'inp' }), mask = h('input', { class: 'inp' }), nh = h('input', { class: 'inp' });
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Network'), net));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Mask'), mask));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Next Hop'), nh));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''), h('button', { class: 'btn sm', onclick: () => {
      if (!isIp(net.value) || !isMask(mask.value) || !isIp(nh.value)) { toast('Invalid network, mask or next hop', 'err'); return; }
      guiIos(st, ['ip route ' + net.value.trim() + ' ' + mask.value.trim() + ' ' + nh.value.trim()]);
    } }, 'Add')));
    pane.appendChild(h('div', { class: 'sub' }, 'Network Address'));
    for (const s of d.cfg.staticRoutes) {
      const txt = s.net + '/' + maskToLen(s.mask) + ' via ' + (s.nextHop || s.exitIf);
      pane.appendChild(h('div', { class: 'listrow' }, h('span', null, txt), h('button', { class: 'btn sm', onclick: () => guiIos(st, ['no ip route ' + s.net + ' ' + s.mask + ' ' + (s.nextHop || s.exitIf)]) }, 'Remove')));
    }
    return;
  }
  if (k === 'rip') {
    pane.appendChild(title('RIP Routing'));
    const net = h('input', { class: 'inp' });
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Network'), net, h('button', { class: 'btn sm', onclick: () => {
      if (!isIp(net.value)) { toast('Invalid network', 'err'); return; }
      guiIos(st, ['router rip', 'network ' + net.value.trim()]);
    } }, 'Add')));
    pane.appendChild(h('div', { class: 'sub' }, 'Network Address'));
    for (const n of (d.cfg.rip ? d.cfg.rip.networks : [])) pane.appendChild(h('div', { class: 'listrow' }, h('span', null, n), h('button', { class: 'btn sm', onclick: () => guiIos(st, ['router rip', 'no network ' + n]) }, 'Remove')));
    return;
  }
  if (k === 'vlandb') {
    pane.appendChild(title('VLAN Configuration'));
    const num = h('input', { class: 'inp' }), name = h('input', { class: 'inp' });
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'VLAN Number'), num));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'VLAN Name'), name));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
      h('button', { class: 'btn sm', onclick: () => { const v = Number(num.value); if (!(v >= 2 && v <= 4094) || v >= 1002 && v <= 1005) { toast('VLAN number 2–1001 or 1006–4094', 'err'); return; } guiIos(st, ['vlan ' + v, ...(name.value.trim() ? ['name ' + name.value.trim().replace(/\s+/g, '_')] : [])]); } }, 'Add'),
      h('button', { class: 'btn sm', onclick: () => { const v = Number(num.value); if (!v) return; guiIos(st, ['no vlan ' + v]); } }, 'Remove')));
    const tbl = h('table', { class: 'grid' }, h('tr', null, h('th', null, 'VLAN No'), h('th', null, 'VLAN Name')));
    for (const v of Object.keys(d.cfg.vlans).map(Number).sort((a, b) => a - b)) tbl.appendChild(h('tr', { onclick: () => { num.value = v; name.value = d.cfg.vlans[v].name; } }, h('td', null, v), h('td', null, d.cfg.vlans[v].name)));
    for (const [v, n] of [[1002, 'fddi-default'], [1003, 'token-ring-default'], [1004, 'fddinet-default'], [1005, 'trnet-default']]) tbl.appendChild(h('tr', { class: 'muted' }, h('td', null, v), h('td', null, n)));
    pane.appendChild(tbl);
    return;
  }
  if (k.startsWith('if:')) {
    const n = k.slice(3);
    pane.appendChild(title(n));
    if (d.type === 'pc') { renderPcIfPane(st, pane); return; }
    const ic = d.cfg.interfaces[n];
    const port = getPort(d, n);
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Port Status'), h('label', null, h('input', { type: 'checkbox', checked: !ic.shutdown, onchange: (e) => guiIos(st, ['interface ' + n, e.target.checked ? 'no shutdown' : 'shutdown']) }), ' On')));
    if (port) {
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Bandwidth'), h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Auto  ', n.startsWith('Gigabit') ? '1000 Mbps' : '100 Mbps')));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Duplex'), h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Auto  Full Duplex')));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: port.mac, disabled: true })));
    }
    if (d.type === 'switch' && ifKind(n) === 'phys') {
      const modeSel = h('select', { class: 'inp' }, h('option', { value: 'access', selected: ic.mode === 'access' }, 'Access'), h('option', { value: 'trunk', selected: ic.mode === 'trunk' }, 'Trunk'),
        h('option', { value: 'dynamic auto', selected: ic.mode === 'dynamic auto' }, 'Dynamic auto (default)'), h('option', { value: 'dynamic desirable', selected: ic.mode === 'dynamic desirable' }, 'Dynamic desirable'));
      modeSel.addEventListener('change', () => guiIos(st, ['interface ' + n, 'switchport mode ' + modeSel.value]));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Mode'), modeSel));
      const vlans = Object.keys(d.cfg.vlans).map(Number).sort((a, b) => a - b);
      const vsel = h('select', { class: 'inp' }, vlans.map((v) => h('option', { value: v, selected: v === ic.accessVlan }, v + ':' + d.cfg.vlans[v].name)));
      vsel.addEventListener('change', () => guiIos(st, ['interface ' + n, 'switchport access vlan ' + vsel.value]));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Access VLAN'), vsel));
      const nsel = h('select', { class: 'inp' }, vlans.map((v) => h('option', { value: v, selected: v === ic.nativeVlan }, v + ':' + d.cfg.vlans[v].name)));
      nsel.addEventListener('change', () => guiIos(st, ['interface ' + n, 'switchport trunk native vlan ' + nsel.value]));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Native VLAN'), nsel));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Allowed VLANs'), h('span', null, ic.allowed === 'all' ? '1-1005 (all)' : vlanListStr(ic.allowed))));
      pane.appendChild(h('div', { class: 'frow muted' }, h('label', null, 'Operational'), h('span', null, portPhysUp(topo, d.id, n) ? swOperMode(topo, d, n) : 'down')));
      return;
    }
    pane.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
    pane.appendChild(field('IPv4 Address', ic.ip, (v, inp) => {
      if (!v) { guiIos(st, ['interface ' + n, 'no ip address']); return; }
      const m = ic.mask || lenToMask(classfulLen(ipToInt(v)));
      guiIos(st, ['interface ' + n, 'ip address ' + v + ' ' + m]);
    }, { validate: isIp }));
    pane.appendChild(field('Subnet Mask', ic.mask, (v) => { if (ic.ip) guiIos(st, ['interface ' + n, 'ip address ' + ic.ip + ' ' + v]); else toast('Enter the IPv4 address first'); }, { validate: isMask }));
  }
}

function radio(name, label, checked, onPick) {
  const r = h('input', { type: 'radio', name, checked });
  r.addEventListener('change', () => { if (r.checked) onPick(); });
  return h('label', { class: 'radio' }, r, ' ' + label);
}

function setPcMode(st, mode) {
  const d = st.dev();
  d.cfg.ipMode = mode;
  if (mode === 'dhcp') {
    st.dhcpMsg = 'Requesting IP Address...';
    st.renderTab && st.tab === 'desktop' && st.renderTab();
    setTimeout(() => {
      const r = pcDhcpRenew(st.topo, d.id, Sim.captureFor(st.topo, d.id));
      st.dhcpMsg = r.ok ? 'DHCP request successful.' : 'DHCP failed. APIPA is being used.';
      App.changed();
      st.renderTab();
    }, 700);
  } else {
    d.cfg.dhcpStatus = null;
    st.dhcpMsg = '';
    if (d.cfg.ip && d.cfg.ip.startsWith('169.254.')) { d.cfg.ip = null; d.cfg.mask = null; }
    App.changed();
  }
}

function renderPcIfPane(st, pane) {
  const d = st.dev(), c = d.cfg;
  pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Port Status'), h('label', null, h('input', { type: 'checkbox', checked: c.portOn !== false, onchange: (e) => { c.portOn = e.target.checked; App.changed(); } }), ' On')));
  pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Bandwidth'), h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Auto  100 Mbps')));
  pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: d.ports[0].mac, disabled: true })));
  pane.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
  ipConfigForm(st, pane);
}

// Общая форма IP-настроек ПК (Config → FastEthernet0 и Desktop → IP Configuration)
function ipConfigForm(st, box, full) {
  const d = st.dev(), c = d.cfg;
  const dis = c.ipMode === 'dhcp';
  box.appendChild(h('div', { class: 'frow' }, h('label', null, ''), radio('ipmode' + d.id + (full ? 'd' : 'c'), 'DHCP', c.ipMode === 'dhcp', () => setPcMode(st, 'dhcp')),
    radio('ipmode' + d.id + (full ? 'd' : 'c'), 'Static', c.ipMode !== 'dhcp', () => setPcMode(st, 'static')),
    st.dhcpMsg ? h('span', { class: 'dhcpmsg' + (/failed/.test(st.dhcpMsg) ? ' bad' : '') }, st.dhcpMsg) : null));
  box.appendChild(field('IPv4 Address', c.ip, (v) => { c.ip = v || null; App.changed(); }, { validate: isIp, disabled: dis,
    onBlur: (inp) => { if (!dis && isIp(inp.value) && !c.mask) { c.mask = lenToMask(classfulLen(ipToInt(inp.value))); App.changed(); st.renderTab(); } } }));
  box.appendChild(field('Subnet Mask', c.mask, (v) => { c.mask = v || null; App.changed(); }, { validate: isMask, disabled: dis }));
  if (full) {
    box.appendChild(field('Default Gateway', c.gateway, (v) => { c.gateway = v || null; App.changed(); }, { validate: isIp, disabled: dis }));
    box.appendChild(field('DNS Server', c.dns, (v) => { c.dns = v || null; App.changed(); }, { validate: isIp, disabled: dis }));
  }
}

// ---------- CLI ----------
function renderCliTab(st, el) {
  const d = st.dev();
  const box = h('div', { class: 'clibox' });
  el.appendChild(h('div', { class: 'clitab' }, h('div', { class: 'clihdr' }, 'IOS Command Line Interface'), box,
    h('div', { class: 'clibtns' },
      h('button', { class: 'btn sm', onclick: () => { const t = Terminal.state(st.topo, d.id, 'ios').buf; navigator.clipboard && navigator.clipboard.writeText(t).then(() => toast('Copied'), () => toast('Copy failed')); } }, 'Copy'),
      h('button', { class: 'btn sm', onclick: () => Terminal.pasteInto(st.topo, d.id, 'ios') }, 'Paste'),
      Tutor.button(() => Tutor.ctxCli(st.topo, d.id), tri('Explain the output', 'объясни вывод', 'הסבר את הפלט')))));
  if (d.off) { box.appendChild(h('div', { class: 'offmsg' }, 'The device is powered off. Turn it on in the Physical tab.')); return; }
  st.views.push(Terminal.mount(box, st.topo, d.id, 'ios'));
}

// ---------- Desktop ----------
// Иконки рабочего стола как в Packet Tracer (картинки d-* в icons.js); na — приложение не моделируется
const DESKTOP_APPS = [
  ['ipconfig', 'IP Configuration', 'd-ip'], ['dialup', 'Dial-up', 'd-dialup', true], ['terminal', 'Terminal', 'd-terminal'], ['cmd', 'Command Prompt', 'd-cmd'],
  ['web', 'Web Browser', 'd-web', true], ['wireless', 'PC Wireless', 'd-wireless', true], ['vpn', 'VPN', 'd-vpn', true], ['traffic', 'Traffic Generator', 'd-traffic', true],
  ['mib', 'MIB Browser', 'd-mib', true], ['ipcomm', 'IP Communicator', 'd-ipcomm', true], ['email', 'E Mail', 'd-email', true], ['pppoe', 'PPPoE Dialer', 'd-pppoe', true],
  ['text', 'Text Editor', 'd-text', true], ['firewall', 'Firewall', 'd-firewall', true], ['ipv6fw', 'IPv6 Firewall', 'd-ipv6fw', true], ['netflow', 'Netflow Collector', 'd-netflow', true],
];

function renderDesktopTab(st, el) {
  const d = st.dev();
  if (d.off) { el.appendChild(h('div', { class: 'offmsg' }, 'The device is powered off. Turn it on in the Physical tab.')); return; }
  if (st.app) { renderDesktopApp(st, el); return; }
  const grid = h('div', { class: 'desk' });
  for (const [id, label, glyph, na] of DESKTOP_APPS) {
    grid.appendChild(h('div', { class: 'dapp' + (na ? ' na' : ''), title: na ? 'Not available in NetTrainer' : label, onclick: () => { if (na) { toast(label + ' is not simulated'); return; } st.app = id; st.renderTab(); } },
      h('div', { class: 'dicon', html: iconUse(glyph, 58, 58) }), h('div', { class: 'dlbl' }, label)));
  }
  el.appendChild(grid);
}

function renderDesktopApp(st, el) {
  const d = st.dev();
  const name = DESKTOP_APPS.find((a) => a[0] === st.app)[1];
  const body = h('div', { class: 'appbody' });
  el.appendChild(h('div', { class: 'appwin' }, h('div', { class: 'appbar' }, h('span', null, name), h('button', { class: 'wclose', onclick: () => { st.app = null; st.renderTab(); } }, 'X')), body));
  if (st.app === 'ipconfig') {
    body.appendChild(h('div', { class: 'frow' }, h('label', null, 'Interface'), h('select', { class: 'inp' }, h('option', null, 'FastEthernet0'))));
    body.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
    ipConfigForm(st, body, true);
    return;
  }
  if (st.app === 'cmd') {
    body.classList.add('termhost');
    st.views.push(Terminal.mount(body, st.topo, d.id, 'pc'));
    return;
  }
  if (st.app === 'terminal') {
    const peer = consolePeer(st.topo, d.id);
    if (!peer) {
      body.appendChild(h('div', { class: 'pad' }, h('p', null, 'No console connection.'), h('p', { class: 'muted' }, 'Connect this PC (port RS 232) to the Console port of a router or switch using the Console cable (Connections → Console).'),
        h('p', { class: 'muted' }, 'Нет консольного подключения: соедините порт RS 232 этого ПК с портом Console роутера/свитча консольным кабелем.')));
      return;
    }
    if (!st.termOk) {
      const sel = (opts, v) => h('select', { class: 'inp' }, opts.map((o) => h('option', { selected: o === v }, o)));
      body.appendChild(h('div', { class: 'pad termcfg' }, h('div', { class: 'sub' }, 'Port Configuration'),
        h('div', { class: 'frow' }, h('label', null, 'Bits Per Second:'), sel(['1200', '2400', '4800', '9600', '19200', '38400', '57600', '115200'], '9600')),
        h('div', { class: 'frow' }, h('label', null, 'Data Bits:'), sel(['5', '6', '7', '8'], '8')),
        h('div', { class: 'frow' }, h('label', null, 'Parity:'), sel(['None', 'Odd', 'Even', 'Space', 'Mark'], 'None')),
        h('div', { class: 'frow' }, h('label', null, 'Stop Bits:'), sel(['1', '1.5', '2'], '1')),
        h('div', { class: 'frow' }, h('label', null, 'Flow Control:'), sel(['None', 'XON/XOFF', 'Hardware'], 'None')),
        h('div', { class: 'frow' }, h('label', null, ''), h('button', { class: 'btn primary', onclick: () => { st.termOk = true; st.renderTab(); } }, 'OK'))));
      return;
    }
    body.classList.add('termhost');
    if (peer.off) { body.appendChild(h('div', { class: 'offmsg' }, peer.name + ' is powered off.')); return; }
    st.views.push(Terminal.mount(body, st.topo, peer.id, 'ios'));
  }
}

// ---------- Attributes ----------
function renderAttrTab(st, el) {
  const d = st.dev();
  const cat = DEVICE_CATALOG[d.model];
  const rows = [['Device Name', d.name], ['Device Model', cat.display], ['Type', d.type], ['Ethernet ports', d.ports.filter((p) => !p.console).length], ['Console port', cat.console || '—'],
    ['Power', d.off ? 'Off' : 'On'], ['Description', cat.hint.en], ['Описание', cat.hint.ru]];
  el.appendChild(h('div', { class: 'pad' }, h('table', { class: 'grid' }, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, String(v)))))));
}
