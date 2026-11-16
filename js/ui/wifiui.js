'use strict';
// Wi-Fi и веб в интерфейсе, как в Packet Tracer:
//  • вкладка GUI роутера Linksys WRT300N (тот же интерфейс открывается в Web Browser ПК по адресу роутера, admin/admin);
//  • Config-панели WRT300N (Internet / LAN / Wireless), точки доступа (Port 0 / Port 1) и беспроводной карты ПК (Wireless0);
//  • приложения рабочего стола PC Wireless и Web Browser; вкладка Services сервера (HTTP / HTTPS).

const SEC_CFG = [['disabled', 'Disabled'], ['wep', 'WEP'], ['wpa', 'WPA-PSK'], ['wpa2', 'WPA2-PSK']];
const SEC_GUI = [['disabled', 'Disabled'], ['wep', 'WEP'], ['wpa', 'WPA Personal'], ['wpa2', 'WPA2 Personal']];
const SEC_PCW = { disabled: 'Disabled', wep: 'WEP', wpa: 'WPA-Personal', wpa2: 'WPA2-Personal' };

function wifiKeyError(sec, pass) {
  pass = pass || '';
  if (sec === 'wpa' || sec === 'wpa2') return pass.length >= 8 && pass.length <= 63 ? null : 'The passphrase must be 8–63 characters (пароль WPA/WPA2: от 8 до 63 символов)';
  if (sec === 'wep') return /^([0-9a-fA-F]{10}|[0-9a-fA-F]{26})$/.test(pass) ? null : 'WEP key: 10 or 26 hexadecimal digits (ключ WEP: 10 или 26 шестнадцатеричных цифр)';
  return null;
}

// Общий блок: SSID, канал, аутентификация, ключ, шифрование (Config → Wireless / Port 1 / Wireless0)
function wifiSecBlock(st, w, apply, opts = {}) {
  const box = h('div');
  box.appendChild(field('SSID', w.ssid, (v, inp) => {
    if (!v || v.length > 32) { toast('SSID: 1–32 characters', 'err'); inp.classList.add('bad'); return; }
    apply({ ssid: v });
  }));
  if (opts.channel) {
    const sel = h('select', { class: 'inp' }, Array.from({ length: 11 }, (_, i) => h('option', { value: i + 1, selected: (w.channel || 6) === i + 1 }, String(i + 1))));
    sel.addEventListener('change', () => apply({ channel: Number(sel.value) }));
    box.appendChild(h('div', { class: 'frow' }, h('label', null, '2.4 GHz Channel'), sel));
  }
  const sec = w.security || 'disabled';
  box.appendChild(h('div', { class: 'sub' }, 'Authentication'));
  const nm = 'wsec' + st.devId + (opts.tag || '');
  box.appendChild(h('div', { class: 'frow' }, h('label', null, ''), SEC_CFG.map(([k, label]) => radio(nm, label, sec === k, () => apply({ security: k })))));
  box.appendChild(field(sec === 'wep' ? 'WEP Key' : 'PSK Pass Phrase', w.pass, (v, inp) => {
    const e = wifiKeyError(sec, v);
    if (e) { toast(e, 'err'); inp.classList.add('bad'); return; }
    apply({ pass: v });
  }, { disabled: sec === 'disabled' }));
  box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Encryption Type'),
    h('select', { class: 'inp', disabled: true }, h('option', null, sec === 'disabled' ? 'Disabled' : sec === 'wep' ? '40/64-Bits (10 Hex digits)' : 'AES'))));
  return box;
}

function portStatusRow(checked, onChange) {
  return h('div', { class: 'frow' }, h('label', null, 'Port Status'), h('label', null, h('input', { type: 'checkbox', checked, onchange: (e) => onChange(e.target.checked) }), ' On'));
}

// ---------- Config: WRT300N и AccessPoint-PT ----------
function renderWifiIfPane(st, pane, n) {
  const d = st.dev(), topo = st.topo;
  const set = (fn) => { App.checkpoint(); fn(); if (isHomeRouter(d)) homeApply(d.cfg); App.changed(); };
  if (isAccessPoint(d)) {
    const w = d.cfg.wifi;
    if (n === 'Port 0') {
      pane.appendChild(portStatusRow(d.cfg.port0On !== false, (v) => set(() => { d.cfg.port0On = v; })));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Bandwidth'), h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Auto  100 Mbps')));
      pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: getPort(d, 'Port 0').mac, disabled: true })));
      return;
    }
    pane.appendChild(portStatusRow(w.radioOn !== false, (v) => set(() => { w.radioOn = v; })));
    pane.appendChild(wifiSecBlock(st, w, (patch) => set(() => Object.assign(w, patch)), { channel: true }));
    pane.appendChild(h('div', { class: 'frow muted' }, h('label', null, 'Clients'), h('span', null, (wifiAssoc(topo).clients[d.id] || []).map((id) => topo.devices[id].name).join(', ') || 'none')));
    return;
  }
  const hc = d.cfg.home, ic = d.cfg.interfaces[n];
  if (n === 'Wireless') {
    pane.appendChild(portStatusRow(hc.radioOn !== false, (v) => set(() => { hc.radioOn = v; hc.mode = v ? 'Mixed' : 'Disabled'; })));
    pane.appendChild(wifiSecBlock(st, hc, (patch) => set(() => Object.assign(hc, patch)), { channel: true }));
    pane.appendChild(h('div', { class: 'frow muted' }, h('label', null, 'Clients'), h('span', null, (wifiAssoc(topo).clients[d.id] || []).map((id) => topo.devices[id].name).join(', ') || 'none')));
    return;
  }
  if (n === 'Internet') {
    pane.appendChild(portStatusRow(!ic.shutdown, (v) => set(() => { ic.shutdown = !v; })));
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: getPort(d, 'Internet').mac, disabled: true })));
    pane.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
    const dhcp = hc.wan !== 'static';
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
      radio('wan' + d.id, 'DHCP', dhcp, () => set(() => { hc.wan = 'dhcp'; })),
      radio('wan' + d.id, 'Static', !dhcp, () => set(() => { hc.wan = 'static'; hc.wanIp = hc.wanIp || ic.ip; hc.wanMask = hc.wanMask || ic.mask; }))));
    const f = (label, key, val, validate) => field(label, val, (v) => set(() => { hc[key] = v || null; }), { validate, disabled: dhcp });
    pane.appendChild(f('IPv4 Address', 'wanIp', dhcp ? ic.ip : hc.wanIp, isIp));
    pane.appendChild(f('Subnet Mask', 'wanMask', dhcp ? ic.mask : hc.wanMask, isMask));
    pane.appendChild(f('Default Gateway', 'wanGw', dhcp ? (d.cfg.staticRoutes[0] || {}).nextHop : hc.wanGw, isIp));
    pane.appendChild(f('DNS Server', 'wanDns', dhcp ? hc.leaseDns : hc.wanDns, isIp));
    if (dhcp && !ic.ip) pane.appendChild(h('div', { class: 'frow muted' }, h('label', null, ''), h('span', null, 'No DHCP lease yet: connect the Internet port to the provider (ISP router with a DHCP pool).')));
    return;
  }
  if (n === 'LAN') {
    pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: ifMac(d, 'LAN'), disabled: true })));
    pane.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
    pane.appendChild(field('IPv4 Address', ic.ip, (v) => set(() => { ic.ip = v; }), { validate: isIp }));
    pane.appendChild(field('Subnet Mask', ic.mask, (v) => set(() => { ic.mask = v; }), { validate: isMask }));
  }
}

// ---------- GUI роутера Linksys WRT300N ----------
const LK_TABS = [
  ['setup', 'Setup', [['basic', 'Basic Setup'], ['ddns', 'DDNS'], ['clone', 'MAC Address Clone'], ['advr', 'Advanced Routing']]],
  ['wireless', 'Wireless', [['wbasic', 'Basic Wireless Settings'], ['wsec', 'Wireless Security'], ['wmac', 'Wireless MAC Filter'], ['wadv', 'Advanced Wireless Settings']]],
  ['security', 'Security', [['fw', 'Firewall'], ['vpnp', 'VPN Passthrough']]],
  ['access', 'Access Restrictions', [['inet', 'Internet Access']]],
  ['apps', 'Applications & Gaming', [['single', 'Single Port Forwarding'], ['range', 'Port Range Forwarding'], ['dmz', 'DMZ']]],
  ['admin', 'Administration', [['mgmt', 'Management'], ['log', 'Log'], ['diag', 'Diagnostics'], ['factory', 'Factory Defaults']]],
  ['status', 'Status', [['router', 'Router'], ['lanst', 'Local Network'], ['wst', 'Wireless Network']]],
];
const LK_PAGES = new Set(['basic', 'wbasic', 'wsec', 'mgmt', 'router', 'lanst', 'wst']);
const LK_EDIT = new Set(['basic', 'wbasic', 'wsec', 'mgmt']);
const LK_MASKS = ['255.255.255.0', '255.255.255.128', '255.255.255.192', '255.255.255.224', '255.255.255.240', '255.255.255.248', '255.255.255.252'];

function homeDraft(d) {
  const hc = d.cfg.home, lan = d.cfg.interfaces.LAN;
  return { wan: hc.wan, wanIp: hc.wanIp || '', wanMask: hc.wanMask || '', wanGw: hc.wanGw || '', wanDns: hc.wanDns || '', lanIp: lan.ip, lanMask: lan.mask,
    dhcpOn: hc.dhcpOn, dhcpStart: String(hc.dhcpStart), dhcpMax: String(hc.dhcpMax), staticDns: hc.staticDns || '', mode: hc.mode || 'Mixed', ssid: hc.ssid,
    channel: hc.channel || 6, broadcast: hc.broadcast !== false, security: hc.security || 'disabled', pass: hc.pass || '', adminPass: hc.adminPass || 'admin', adminPass2: hc.adminPass || 'admin' };
}

// Проверить и применить черновик GUI. Возвращает текст ошибки или null.
function homeSave(topo, d, dr, page) {
  const hc = d.cfg.home, lan = d.cfg.interfaces.LAN;
  if (page === 'basic') {
    if (!isIp(dr.lanIp)) return 'Invalid Local IP Address';
    if (!isMask(dr.lanMask)) return 'Invalid Subnet Mask';
    const st = Number(dr.dhcpStart), mx = Number(dr.dhcpMax);
    if (!(st >= 1 && st <= 254)) return 'Start IP Address: 1–254';
    if (!(mx >= 1 && mx <= 253)) return 'Maximum number of Users: 1–253';
    if (dr.staticDns && !isIp(dr.staticDns)) return 'Invalid Static DNS';
    if (dr.wan === 'static') {
      if (!isIp(dr.wanIp) || !isMask(dr.wanMask)) return 'Invalid Internet IP Address or Subnet Mask';
      if (dr.wanGw && !isIp(dr.wanGw)) return 'Invalid Default Gateway';
      if (dr.wanDns && !isIp(dr.wanDns)) return 'Invalid DNS';
    }
    App.checkpoint();
    Object.assign(hc, { wan: dr.wan, wanIp: dr.wan === 'static' ? dr.wanIp : null, wanMask: dr.wan === 'static' ? dr.wanMask : null, wanGw: dr.wan === 'static' ? dr.wanGw || null : null,
      wanDns: dr.wan === 'static' ? dr.wanDns || null : null, dhcpOn: dr.dhcpOn, dhcpStart: st, dhcpMax: mx, staticDns: dr.staticDns || null });
    lan.ip = dr.lanIp; lan.mask = dr.lanMask;
  } else if (page === 'wbasic') {
    if (!dr.ssid || dr.ssid.length > 32) return 'Network Name (SSID): 1–32 characters';
    App.checkpoint();
    Object.assign(hc, { mode: dr.mode, radioOn: dr.mode !== 'Disabled', ssid: dr.ssid, channel: Number(dr.channel), broadcast: dr.broadcast });
  } else if (page === 'wsec') {
    const e = dr.security === 'disabled' ? null : wifiKeyError(dr.security, dr.pass);
    if (e) return e;
    App.checkpoint();
    Object.assign(hc, { security: dr.security, pass: dr.security === 'disabled' ? '' : dr.pass });
  } else if (page === 'mgmt') {
    if (!dr.adminPass) return 'Router Password cannot be empty';
    if (dr.adminPass !== dr.adminPass2) return 'The passwords do not match (пароли не совпадают)';
    App.checkpoint();
    hc.adminPass = dr.adminPass;
  }
  homeApply(d.cfg);
  App.changed();
  return null;
}

function renderLinksysGui(st, host, devId, key) {
  const topo = st.topo, d = topo.devices[devId];
  clear(host);
  if (!d) return;
  if (d.off) { host.appendChild(h('div', { class: 'offmsg' }, 'The device is powered off.')); return; }
  const g = st[key] = st[key] || { top: 'setup', sub: 'basic', draft: null, msg: '' };
  if (!g.draft) g.draft = homeDraft(d);
  const dr = g.draft, hc = d.cfg.home;
  const rerender = () => renderLinksysGui(st, host, devId, key);
  const restructure = () => { const sc = host.scrollTop; rerender(); host.scrollTop = sc; };
  const inp = (k, opts = {}) => h('input', { class: 'lk-inp', value: dr[k] == null ? '' : dr[k], size: opts.size || 16, type: opts.type || 'text', disabled: opts.disabled, oninput: (e) => { dr[k] = e.target.value; } });
  const sel = (k, options, opts = {}) => {
    const s = h('select', { class: 'lk-inp', disabled: opts.disabled }, options.map(([v, label]) => h('option', { value: v, selected: String(dr[k]) === String(v) }, label)));
    s.addEventListener('change', () => { dr[k] = s.value; if (opts.re) restructure(); });
    return s;
  };
  const rad = (k, val, label) => { const r = h('input', { type: 'radio', name: key + devId + k, checked: dr[k] === val }); r.addEventListener('change', () => { if (r.checked) { dr[k] = val; restructure(); } }); return h('label', { class: 'lk-rad' }, r, ' ' + label); };
  const row = (label, ...ctl) => h('div', { class: 'lk-row' }, h('label', null, label), ...ctl);
  const sec = (title, ...rows) => h('div', { class: 'lk-sec' }, h('div', { class: 'lk-sect' }, title), h('div', { class: 'lk-secb' }, rows));
  const val = (v) => h('span', { class: 'lk-val' }, v == null || v === '' ? '0.0.0.0' : String(v));

  const root = h('div', { class: 'lk' });
  root.appendChild(h('div', { class: 'lk-head' }, h('span', { class: 'lk-brand' }, 'LINKSYS'), h('span', { class: 'lk-sub2' }, 'A Division of Cisco Systems, Inc.'), h('span', { class: 'lk-fw' }, 'Firmware Version: v0.93.3')));
  root.appendChild(h('div', { class: 'lk-model' }, h('b', null, (LK_TABS.find((t) => t[0] === g.top) || LK_TABS[0])[1]), h('span', null, 'Wireless-N Broadband Router  WRT300N')));
  root.appendChild(h('div', { class: 'lk-tabs' }, LK_TABS.map(([id, label, subs]) => h('span', { class: 'lk-tab' + (g.top === id ? ' on' : ''), onclick: () => { g.top = id; g.sub = subs[0][0]; g.msg = ''; g.draft = null; rerender(); } }, label))));
  const subs = LK_TABS.find((t) => t[0] === g.top)[2];
  root.appendChild(h('div', { class: 'lk-subtabs' }, subs.map(([id, label]) => h('span', { class: 'lk-subtab' + (g.sub === id ? ' on' : ''), onclick: () => { g.sub = id; g.msg = ''; g.draft = null; rerender(); } }, label))));
  const body = h('div', { class: 'lk-body' });
  root.appendChild(body);
  const lanPrefix = (dr.lanIp || '').split('.').slice(0, 3).join('.') + '.';
  const ic = d.cfg.interfaces.Internet, lan = d.cfg.interfaces.LAN;

  if (!LK_PAGES.has(g.sub)) {
    body.appendChild(sec('', h('div', { class: 'lk-na' }, 'This page is not simulated in NetTrainer. Implemented: Setup → Basic Setup, Wireless → Basic Wireless Settings / Wireless Security, Administration → Management, Status.'),
      h('div', { class: 'lk-na' }, 'Эта страница не моделируется. Работают: Setup → Basic Setup, Wireless → Basic Wireless Settings / Wireless Security, Administration → Management, Status.')));
  } else if (g.sub === 'basic') {
    body.appendChild(sec('Internet Setup',
      row('Internet Connection type', sel('wan', [['dhcp', 'Automatic Configuration - DHCP'], ['static', 'Static IP']], { re: true })),
      dr.wan === 'static' ? [row('Internet IP Address', inp('wanIp')), row('Subnet Mask', inp('wanMask')), row('Default Gateway', inp('wanGw')), row('DNS 1', inp('wanDns'))] : null));
    body.appendChild(sec('Optional Settings', row('Router Name', h('input', { class: 'lk-inp', value: 'WRT300N', disabled: true })), row('MTU', h('select', { class: 'lk-inp', disabled: true }, h('option', null, 'Auto')), h('span', null, 'Size: 1500'))));
    body.appendChild(sec('Network Setup · Router IP', row('IP Address', inp('lanIp')), row('Subnet Mask', sel('lanMask', LK_MASKS.map((m) => [m, m])))));
    const start = Number(dr.dhcpStart) || 0, max = Number(dr.dhcpMax) || 0;
    body.appendChild(sec('DHCP Server Settings',
      row('DHCP Server', rad('dhcpOn', true, 'Enabled'), rad('dhcpOn', false, 'Disabled')),
      row('Start IP Address', h('span', null, lanPrefix), inp('dhcpStart', { size: 4, disabled: !dr.dhcpOn })),
      row('Maximum number of Users', inp('dhcpMax', { size: 4, disabled: !dr.dhcpOn })),
      row('IP Address Range', val(lanPrefix + start + ' - ' + (start + max - 1))),
      row('Client Lease Time', h('input', { class: 'lk-inp', value: '0', size: 4, disabled: true }), h('span', null, 'minutes (0 means one day)')),
      row('Static DNS 1', inp('staticDns', { disabled: !dr.dhcpOn }))));
  } else if (g.sub === 'wbasic') {
    body.appendChild(sec('Wireless',
      row('Network Mode', sel('mode', ['Mixed', 'BG-Mixed', 'Wireless-N Only', 'Wireless-G Only', 'Wireless-B Only', 'Disabled'].map((m) => [m, m]))),
      row('Network Name (SSID)', inp('ssid')),
      row('Radio Band', h('select', { class: 'lk-inp', disabled: true }, h('option', null, 'Auto'))),
      row('Wide Channel', h('select', { class: 'lk-inp', disabled: true }, h('option', null, 'Auto'))),
      row('Standard Channel', sel('channel', Array.from({ length: 11 }, (_, i) => [i + 1, (i + 1) + ' - ' + (2.412 + i * 0.005).toFixed(3) + 'GHz']))),
      row('SSID Broadcast', rad('broadcast', true, 'Enabled'), rad('broadcast', false, 'Disabled'))));
  } else if (g.sub === 'wsec') {
    body.appendChild(sec('Wireless Security',
      row('Security Mode', sel('security', SEC_GUI, { re: true })),
      dr.security === 'wpa' || dr.security === 'wpa2' ? [row('Encryption', h('select', { class: 'lk-inp' }, h('option', null, 'AES'), h('option', null, 'TKIP'))), row('Passphrase', inp('pass', { size: 24 })), row('Key Renewal', h('input', { class: 'lk-inp', value: '3600', size: 6, disabled: true }), h('span', null, 'seconds'))] : null,
      dr.security === 'wep' ? [row('Encryption', h('select', { class: 'lk-inp', disabled: true }, h('option', null, '40/64-Bit (10 hex digits)'))), row('Key 1', inp('pass', { size: 26 }))] : null));
  } else if (g.sub === 'mgmt') {
    body.appendChild(sec('Router Access', row('Router Password', inp('adminPass', { type: 'password' })), row('Re-enter to confirm', inp('adminPass2', { type: 'password' }))));
    body.appendChild(sec('Web Access', row('Web Utility Access', h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' HTTP')), row('Remote Management', h('label', null, h('input', { type: 'radio', checked: true, disabled: true }), ' Disabled'))));
  } else if (g.sub === 'router') {
    const gw = d.cfg.staticRoutes[0];
    body.appendChild(sec('Router Information', row('Firmware Version', val('v0.93.3')), row('MAC Address', val(getPort(d, 'Internet').mac))));
    body.appendChild(sec('Internet', row('Login Type', val(hc.wan === 'static' ? 'Static IP' : 'Automatic Configuration - DHCP')),
      row('IP Address', val(ic.ip)), row('Subnet Mask', val(ic.mask)), row('Default Gateway', val(gw && gw.nextHop)), row('DNS 1', val(hc.wan === 'static' ? hc.wanDns : hc.leaseDns)), row('MTU', val(1500)),
      hc.wan !== 'static' ? row('', h('button', { class: 'lk-btn', onclick: () => { App.checkpoint(); ic.ip = null; ic.mask = null; d.cfg.staticRoutes = []; hc.leaseDns = null; homeApply(d.cfg); App.changed(); setTimeout(rerender, 0); } }, 'IP Address Renew')) : null));
  } else if (g.sub === 'lanst') {
    const pool = d.cfg.dhcpPools.LAN;
    const names = {};
    for (const x of Object.values(topo.devices)) for (const p of x.ports) if (p.mac) names[p.mac] = x.name;
    const tbl = h('table', { class: 'lk-tbl' }, h('tr', null, h('th', null, 'Client Name'), h('th', null, 'IP Address'), h('th', null, 'MAC Address')),
      Object.entries(d.cfg.dhcpBindings || {}).map(([mac, ip]) => h('tr', null, h('td', null, names[mac] || '—'), h('td', null, ip), h('td', null, mac))));
    body.appendChild(sec('Local Network', row('MAC Address', val(ifMac(d, 'LAN'))), row('IP Address', val(lan.ip)), row('Subnet Mask', val(lan.mask)),
      row('DHCP Server', val(hc.dhcpOn ? 'Enabled' : 'Disabled')),
      pool ? [row('Start IP Address', val(lanPrefix + hc.dhcpStart)), row('End IP Address', val(lanPrefix + (hc.dhcpStart + hc.dhcpMax - 1)))] : null));
    body.appendChild(sec('DHCP Clients Table', tbl));
  } else if (g.sub === 'wst') {
    const cl = wifiAssoc(topo).clients[d.id] || [];
    body.appendChild(sec('Wireless Network', row('MAC Address', val(getPort(d, 'Ethernet 1').mac.replace(/.$/, 'f'))), row('Mode', val(hc.mode || 'Mixed')), row('Network Name (SSID)', val(hc.ssid)),
      row('Radio Band', val('Auto')), row('Channel', val(hc.channel || 6)), row('Security', val(SEC_GUI.find((s) => s[0] === (hc.security || 'disabled'))[1])), row('SSID Broadcast', val(hc.broadcast === false ? 'Disabled' : 'Enabled'))));
    body.appendChild(sec('Wireless Clients', cl.length ? h('table', { class: 'lk-tbl' }, h('tr', null, h('th', null, 'Client'), h('th', null, 'IP Address')), cl.map((id) => h('tr', null, h('td', null, topo.devices[id].name), h('td', null, topo.devices[id].cfg.ip || '0.0.0.0')))) : h('span', null, 'No wireless clients')));
  }
  if (g.msg) body.appendChild(h('div', { class: 'lk-msg' + (g.ok ? ' ok' : '') }, g.msg));
  if (LK_EDIT.has(g.sub)) {
    root.appendChild(h('div', { class: 'lk-foot' },
      h('button', { class: 'lk-btn', onclick: () => {
        const err = homeSave(topo, d, dr, g.sub);
        g.ok = !err; g.msg = err || 'Settings are successful.';
        if (!err) g.draft = null;
        rerender();
      } }, 'Save Settings'),
      h('button', { class: 'lk-btn', onclick: () => { g.draft = null; g.msg = ''; rerender(); } }, 'Cancel Changes')));
  }
  host.appendChild(root);
}

function renderHomeGuiTab(st, el) {
  const host = h('div', { class: 'guitab' });
  el.appendChild(host);
  renderLinksysGui(st, host, st.devId, 'gui');
}

// ---------- ПК: Config → Wireless0 ----------
function wifiClientSet(st, patch) {
  const d = st.dev(), topo = st.topo;
  App.checkpoint();
  d.cfg.wifi = { ...(d.cfg.wifi || {}), ...patch };
  touch(topo);
  const ok = !!wifiApOf(topo, d.id);
  if (ok && d.cfg.ipMode === 'dhcp') pcDhcpRenew(topo, d.id, Sim.captureFor(topo, d.id));
  App.changed();
  return ok;
}

function renderPcWirelessIf(st, pane) {
  const d = st.dev(), c = d.cfg;
  pane.appendChild(portStatusRow(c.portOn !== false, (v) => { App.checkpoint(); c.portOn = v; App.changed(); }));
  pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'Bandwidth'), h('label', null, h('input', { type: 'checkbox', checked: true, disabled: true }), ' Auto  300 Mbps')));
  pane.appendChild(h('div', { class: 'frow' }, h('label', null, 'MAC Address'), h('input', { class: 'inp', value: d.ports[0].mac, disabled: true })));
  const ap = wifiApOf(st.topo, d.id);
  pane.appendChild(h('div', { class: 'frow muted' }, h('label', null, 'Association'), h('span', null, ap ? 'Associated with ' + st.topo.devices[ap].name : 'Not associated (SSID / authentication / key do not match any access point)')));
  pane.appendChild(wifiSecBlock(st, c.wifi || {}, (patch) => wifiClientSet(st, patch), { tag: 'c' }));
  pane.appendChild(h('div', { class: 'sub' }, 'IP Configuration'));
  ipConfigForm(st, pane);
}

// ---------- Desktop → PC Wireless ----------
function signalBars(pct) {
  return h('span', { class: 'sigbar' }, h('span', { style: { width: Math.max(0, Math.min(100, pct)) + '%' } }));
}

function renderPcWirelessApp(st, body) {
  const d = st.dev(), topo = st.topo;
  body.classList.add('pcw');
  if (!isWirelessClient(d)) {
    const mods = WIFI_MODULES[d.model];
    body.appendChild(h('div', { class: 'pad' },
      h('p', null, 'No Linksys wireless card is installed.'),
      h('p', { class: 'muted' }, mods ? 'Physical tab: turn the power off, remove ' + mods.wired + ', install ' + mods.wireless + ', turn the power on.' : 'This device has no wireless card.'),
      h('p', { class: 'muted' }, mods ? 'Вкладка Physical: выключите питание, снимите ' + mods.wired + ', вставьте ' + mods.wireless + ', включите питание.' : 'У этого устройства нет беспроводной карты.')));
    return;
  }
  const pw = st.pw = st.pw || { tab: 'link', sel: null, ask: null, msg: '', newProf: false };
  const redraw = () => { clear(body); renderPcWirelessApp(st, body); };
  body.appendChild(h('div', { class: 'pcw-head' }, h('span', { class: 'lk-brand' }, 'LINKSYS'), h('span', null, d.model === 'Laptop' ? 'Wireless-N Notebook Adapter  WPC300N' : 'Wireless-N PCI Adapter  WMP300N')));
  body.appendChild(h('div', { class: 'pcw-tabs' }, [['link', 'Link Information'], ['connect', 'Connect'], ['profiles', 'Profiles']].map(([id, label]) =>
    h('span', { class: 'pcw-tab' + (pw.tab === id ? ' on' : ''), onclick: () => { pw.tab = id; pw.ask = null; pw.msg = ''; redraw(); } }, label))));
  const box = h('div', { class: 'pcw-body' });
  body.appendChild(box);
  const apId = wifiApOf(topo, d.id);
  const connect = (w) => {
    const ok = wifiClientSet(st, w);
    pw.ask = null; pw.newProf = false;
    pw.msg = ok ? '' : 'Unable to connect to "' + w.ssid + '": check the security mode and the pre-shared key. (Не удалось подключиться: проверьте тип защиты и ключ.)';
    pw.tab = ok ? 'link' : pw.tab;
    redraw();
  };
  if (pw.tab === 'link') {
    if (!apId) {
      box.appendChild(h('p', null, 'There is no wireless connection available. Click the Connect tab to search for an available wireless network.'));
      box.appendChild(h('p', { class: 'muted' }, 'Нет беспроводного подключения. Откройте вкладку Connect и выберите сеть.'));
    } else {
      const ap = topo.devices[apId], w = wifiApCfg(ap), net = wifiScan(topo, d.id).find((n) => n.apId === apId);
      const sig = net ? net.signal : 70;
      const rows = [['Status', 'Connected'], ['Network Name (SSID)', w.ssid], ['Wireless Mode', 'Infrastructure'], ['Security', SEC_PCW[w.security || 'disabled']], ['Channel', w.channel || 6],
        ['IP Address', d.cfg.ip || '0.0.0.0'], ['Subnet Mask', d.cfg.mask || '0.0.0.0'], ['Default Gateway', d.cfg.gateway || '0.0.0.0'], ['DNS', d.cfg.dns || '0.0.0.0'], ['MAC Address', d.ports[0].mac]];
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Signal Strength'), signalBars(sig)));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Link Quality'), signalBars(sig - 6)));
      box.appendChild(h('table', { class: 'grid' }, rows.map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, String(v))))));
    }
  } else if (pw.tab === 'connect') {
    if (pw.ask) {
      const n = pw.ask;
      const key = h('input', { class: 'inp', type: 'password', placeholder: n.security === 'wep' ? '10 hex digits' : '8–63 characters' });
      box.appendChild(h('div', { class: 'sub' }, n.ssid));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Security'), h('select', { class: 'inp', disabled: true }, h('option', null, SEC_PCW[n.security]))));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, n.security === 'wep' ? 'WEP Key 1' : 'Pre-shared Key'), key));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
        h('button', { class: 'btn primary', onclick: () => connect({ ssid: n.ssid, security: n.security, pass: key.value }) }, 'Connect'),
        h('button', { class: 'btn', onclick: () => { pw.ask = null; redraw(); } }, 'Cancel')));
      setTimeout(() => key.focus(), 0);
    } else {
      const nets = wifiScan(topo, d.id);
      const tbl = h('table', { class: 'grid pcw-list' }, h('tr', null, h('th', null, 'Wireless Network Name'), h('th', null, 'CH'), h('th', null, 'Signal')));
      for (const n of nets) {
        tbl.appendChild(h('tr', { class: pw.sel === n.apId ? 'on' : '', onclick: () => { pw.sel = n.apId; redraw(); } }, h('td', null, n.ssid), h('td', null, String(n.ch)), h('td', null, signalBars(n.signal))));
      }
      if (!nets.length) tbl.appendChild(h('tr', null, h('td', { colspan: 3 }, 'No wireless networks found')));
      const cur = nets.find((n) => n.apId === pw.sel);
      box.appendChild(h('div', { class: 'pcw-cols' }, tbl,
        h('div', { class: 'pcw-site' }, h('div', { class: 'sub' }, 'Site Information'),
          cur ? h('table', { class: 'grid' }, [['Wireless Mode', 'Infrastructure'], ['Network Type', 'Mixed B/G/N'], ['Radio Band', 'Auto'], ['Security', SEC_PCW[cur.security]], ['Channel', cur.ch]].map(([k, v]) => h('tr', null, h('th', null, k), h('td', null, String(v)))))
            : h('p', { class: 'muted' }, 'Select a network'))));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
        h('button', { class: 'btn', onclick: () => { pw.msg = ''; redraw(); } }, 'Refresh'),
        h('button', { class: 'btn primary', disabled: !cur, onclick: () => { if (cur.security === 'disabled') connect({ ssid: cur.ssid, security: 'disabled', pass: '' }); else { pw.ask = cur; redraw(); } } }, 'Connect')));
      box.appendChild(h('p', { class: 'muted' }, 'A network whose SSID broadcast is disabled is not listed: create a profile with its SSID on the Profiles tab. (Скрытую сеть добавляйте через Profiles.)'));
    }
  } else {
    const w = d.cfg.wifi || {};
    if (!pw.newProf) {
      box.appendChild(h('table', { class: 'grid' }, h('tr', null, h('th', null, 'Profile'), h('th', null, 'SSID'), h('th', null, 'Security'), h('th', null, 'Status')),
        w.ssid ? h('tr', null, h('td', null, w.ssid), h('td', null, w.ssid), h('td', null, SEC_PCW[w.security || 'disabled']), h('td', null, apId ? 'Connected' : 'Not connected')) : null));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
        h('button', { class: 'btn', onclick: () => { pw.newProf = true; redraw(); } }, 'New'),
        h('button', { class: 'btn', disabled: !w.ssid, onclick: () => connect({ ssid: '', security: 'disabled', pass: '' }) }, 'Delete')));
    } else {
      const ssid = h('input', { class: 'inp', value: '' });
      const secSel = h('select', { class: 'inp' }, Object.entries(SEC_PCW).map(([k, v]) => h('option', { value: k }, v)));
      const key = h('input', { class: 'inp', type: 'password' });
      box.appendChild(h('div', { class: 'sub' }, 'Advanced Setup'));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Wireless Network Name (SSID)'), ssid));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Security'), secSel));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, 'Key / Passphrase'), key));
      box.appendChild(h('div', { class: 'frow' }, h('label', null, ''),
        h('button', { class: 'btn primary', onclick: () => { if (!ssid.value.trim()) { toast('Enter the SSID', 'err'); return; } connect({ ssid: ssid.value.trim(), security: secSel.value, pass: key.value }); } }, 'Connect'),
        h('button', { class: 'btn', onclick: () => { pw.newProf = false; redraw(); } }, 'Cancel')));
    }
  }
  if (pw.msg) box.appendChild(h('div', { class: 'dhcpmsg bad' }, pw.msg));
}

// ---------- Desktop → Web Browser ----------
function webFetch(topo, pc, url) {
  const m = /^(?:(https?):\/\/)?([^/:\s]+)(?::(\d+))?(\/\S*)?$/i.exec((url || '').trim());
  if (!m) return { kind: 'error', text: 'Invalid URL' };
  const scheme = (m[1] || 'http').toLowerCase(), host = m[2], port = Number(m[3]) || (scheme === 'https' ? 443 : 80);
  if (!isIp(host)) return { kind: 'error', text: 'Host Name Unresolved' };
  if (!pc.cfg.ip || pc.cfg.ip === '0.0.0.0') return { kind: 'error', text: 'Request Timeout' };
  const r = flowOnce(topo, pc.id, ipToInt(host), 'tcp', port, {});
  if (!r.ok) return { kind: 'error', text: 'Request Timeout', why: r.reason && r.reason.code };
  const t = topo.devices[r.dev];
  if (isHomeRouter(t)) {
    const lan = t.cfg.interfaces.LAN, len = maskToLen(lan.mask);
    const fromLan = inSubnet(ipToInt(pc.cfg.ip), netOf(ipToInt(lan.ip), len), len);
    return fromLan && port === 80 ? { kind: 'linksys', devId: t.id } : { kind: 'error', text: 'Request Timeout' };
  }
  if (t.model === 'Server' && ((port === 80 && t.cfg.http !== false) || (port === 443 && t.cfg.https !== false))) return { kind: 'server', devId: t.id, host, scheme };
  return { kind: 'error', text: 'Server Reset Connection' };
}

function renderWebBrowserApp(st, body) {
  const d = st.dev(), topo = st.topo;
  const wb = st.web = st.web || { url: 'http://', page: null, auth: {} };
  const url = h('input', { class: 'inp', value: wb.url });
  const view = h('div', { class: 'webview' });
  const draw = () => {
    clear(view);
    const p = wb.page;
    if (!p) { view.appendChild(h('div', { class: 'pad muted' }, 'Enter an address, e.g. http://192.168.1.10  (Введите адрес сервера или роутера.)')); return; }
    if (p.kind === 'error') {
      view.appendChild(h('div', { class: 'pad' }, h('h3', null, p.text),
        h('p', { class: 'muted' }, p.text === 'Host Name Unresolved' ? 'DNS is not simulated in NetTrainer: use the IP address. (DNS не моделируется — вводите IP-адрес.)'
          : p.why === 'acl' ? 'The request was denied by an access list on the path. (Запрос отброшен ACL.)' : 'No HTTP reply: check addressing, routing, NAT, ACL and that the HTTP service is on. (Нет ответа: проверьте адреса, маршруты, NAT, ACL и службу HTTP.)')));
      return;
    }
    if (p.kind === 'server') {
      const srv = topo.devices[p.devId];
      view.appendChild(h('div', { class: 'webpage' }, h('h2', null, 'Cisco Packet Tracer'), h('p', null, 'Welcome! This page is served by ' + (srv ? srv.name : 'the server') + ' over ' + p.scheme.toUpperCase() + '.'),
        h('p', { class: 'muted' }, 'The TCP request reached the server and the reply came back, so routing, NAT and ACLs on the path allow ' + p.scheme.toUpperCase() + '. (Запрос дошёл до сервера и ответ вернулся.)')));
      return;
    }
    if (p.kind === 'linksys') {
      const r = topo.devices[p.devId];
      if (!r) { wb.page = null; draw(); return; }
      if (!wb.auth[p.devId]) {
        const user = h('input', { class: 'inp' }), pass = h('input', { class: 'inp', type: 'password' });
        const login = () => {
          if (user.value === 'admin' && pass.value === (r.cfg.home.adminPass || 'admin')) { wb.auth[p.devId] = true; draw(); } else toast('Authorization failed (admin / admin by default)', 'err');
        };
        pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
        view.appendChild(h('div', { class: 'pad weblogin' }, h('h3', null, 'Authorization'), h('p', null, 'The server ' + wb.url.replace(/^https?:\/\//, '') + ' requires a username and password.'),
          h('div', { class: 'frow' }, h('label', null, 'User Name'), user), h('div', { class: 'frow' }, h('label', null, 'Password'), pass),
          h('div', { class: 'frow' }, h('label', null, ''), h('button', { class: 'btn primary', onclick: login }, 'OK'))));
        setTimeout(() => user.focus(), 0);
        return;
      }
      renderLinksysGui(st, view, p.devId, 'webGui');
    }
  };
  const go = () => { wb.url = url.value.trim(); wb.page = webFetch(topo, d, wb.url); st.webGui = null; App.changed({ noCommit: true }); draw(); };
  url.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  body.classList.add('webapp');
  body.appendChild(h('div', { class: 'webbar' }, h('span', null, 'URL'), url, h('button', { class: 'btn sm', onclick: go }, 'Go'), h('button', { class: 'btn sm', onclick: () => { wb.page = null; draw(); } }, 'Stop')));
  body.appendChild(view);
  draw();
}

// ---------- Server → Services ----------
const SERVER_SERVICES = ['HTTP', 'DHCP', 'DHCPv6', 'TFTP', 'DNS', 'SYSLOG', 'AAA', 'NTP', 'EMAIL', 'FTP', 'IoT', 'VM Management', 'Radius EAP'];

function renderServicesTab(st, el) {
  const d = st.dev(), c = d.cfg;
  const nav = h('div', { class: 'cnav' }, h('div', { class: 'chdr' }, 'SERVICES'),
    SERVER_SERVICES.map((s) => h('div', { class: 'citem' + (s === 'HTTP' ? ' on' : ' na'), title: s === 'HTTP' ? '' : 'Not simulated in NetTrainer', onclick: () => { if (s !== 'HTTP') toast(s + ' service is not simulated'); } }, s)));
  const pane = h('div', { class: 'cpane' }, h('div', { class: 'ptitle' }, 'HTTP'));
  const onoff = (label, key) => h('div', { class: 'frow' }, h('label', null, label),
    radio(key + d.id, 'On', c[key] !== false, () => { App.checkpoint(); c[key] = true; App.changed(); }),
    radio(key + d.id, 'Off', c[key] === false, () => { App.checkpoint(); c[key] = false; App.changed(); }));
  pane.appendChild(onoff('HTTP', 'http'));
  pane.appendChild(onoff('HTTPS', 'https'));
  pane.appendChild(h('div', { class: 'sub' }, 'File Manager'));
  pane.appendChild(h('table', { class: 'grid' }, h('tr', null, h('th', null, 'File Name'), h('th', null, 'Edit'), h('th', null, 'Delete')), h('tr', null, h('td', null, 'index.html'), h('td', { class: 'muted' }, '(edit)'), h('td', { class: 'muted' }, '(delete)'))));
  pane.appendChild(h('p', { class: 'muted' }, 'PC → Desktop → Web Browser → http://<server IP> opens index.html. Use it to test ACLs that filter TCP 80/443 (ACL с eq 80 / eq www).'));
  el.appendChild(h('div', { class: 'cfgtab' }, nav, h('div', { class: 'ccol' }, pane)));
}
