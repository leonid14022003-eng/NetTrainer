'use strict';
// Port Security на коммутаторе: какие и сколько MAC-адресов могут работать через access-порт.
// Настройка — в ic.psec (попадает в running-config), выученные динамические адреса и счётчики — в rt.psec (как в RAM).
// Чужой MAC при заполненном лимите — нарушение: shutdown (err-disabled), restrict (отброс + журнал + счётчик) или protect (молча).

function psecCfg(ic) {
  if (!ic.psec) ic.psec = { on: false, max: 1, violation: 'shutdown', sticky: false, macs: [], aging: { time: 0, type: 'absolute', static: false } };
  return ic.psec;
}
function psecRt(topo, devId, port) {
  const rt = netRt(topo);
  const k = devId + '|' + port;
  return rt.psec[k] || (rt.psec[k] = { dyn: [], count: 0, last: null });
}
function psecOn(ic) { return !!(ic && ic.psec && ic.psec.on); }

// Все разрешённые на порту адреса: [{mac, type: 'SecureConfigured' | 'SecureSticky' | 'SecureDynamic'}]
function psecAddrs(topo, sw, port) {
  const ic = sw.cfg.interfaces[port];
  if (!psecOn(ic)) return [];
  const out = ic.psec.macs.map((m) => ({ mac: m.mac, type: m.sticky ? 'SecureSticky' : 'SecureConfigured' }));
  for (const mac of psecRt(topo, sw.id, port).dyn) if (!out.some((x) => x.mac === mac)) out.push({ mac, type: 'SecureDynamic' });
  return out;
}

// Пропустит ли порт кадр с этим MAC (без побочных эффектов — для расчёта достижимости)
function psecAllows(topo, sw, port, mac) {
  const ic = sw.cfg.interfaces[port];
  if (!psecOn(ic) || !mac) return true;
  const list = psecAddrs(topo, sw, port);
  if (list.some((x) => x.mac === mac)) return true;
  return list.length < ic.psec.max;
}

// Порты коммутаторов, в которые попадает кадр от устройства (через хабы тоже)
function psecIngressPorts(topo, devId, ifName, any) {   // any — и через выключенные порты (для объяснений)
  const out = [];
  const seen = new Set();
  const q = [{ dev: devId, port: parentPort(ifName) }];
  while (q.length) {
    const it = q.shift();
    const k = it.dev + '|' + it.port;
    if (seen.has(k)) continue;
    seen.add(k);
    const peer = linkPeer(topo, it.dev, it.port);
    if (!peer || (!any && !portPhysUp(topo, it.dev, it.port))) continue;
    const D = topo.devices[peer.dev];
    if (D.type === 'switch') out.push({ sw: D, port: peer.port });
    else if (D.type === 'hub') for (const p of D.ports) if (p.name !== peer.port && !p.console) q.push({ dev: D.id, port: p.name });
  }
  return out;
}

// Устройство отправило кадр: порт учит адрес или фиксирует нарушение
function psecObserve(topo, devId, ifName) {
  const dev = topo.devices[devId];
  if (!dev || dev.type === 'hub') return;
  const mac = ifMac(dev, ifName);
  if (!mac) return;
  let changed = false;
  for (const { sw, port } of psecIngressPorts(topo, devId, ifName)) {
    const ic = sw.cfg.interfaces[port];
    if (!psecOn(ic) || ic.errdis || ic.shutdown) continue;
    const r = psecRt(topo, sw.id, port);
    const vlan = ic.accessVlan || 1;
    const list = psecAddrs(topo, sw, port);
    if (list.some((x) => x.mac === mac)) continue;
    if (list.length < ic.psec.max) {
      if (ic.psec.sticky) ic.psec.macs.push({ mac, sticky: true });
      else r.dyn.push(mac);
      changed = true;
      continue;
    }
    // нарушение
    const v = ic.psec.violation;
    r.last = mac + ':' + vlan;
    if (v === 'protect') continue;
    r.count++;
    const msg = '%PORT_SECURITY-2-PSECURE_VIOLATION: Security violation occurred, caused by MAC address ' + mac.toLowerCase() + ' on port ' + port + '.';
    if (v === 'restrict') { pushConsole(topo, sw.id, msg); continue; }
    ic.errdis = 'psecure-violation';
    ic.errdisAt = netTime(topo);
    r.dyn = [];
    const sn = ifShort(port);
    pushConsole(topo, sw.id, '%PM-4-ERR_DISABLE: psecure-violation error detected on ' + sn + ', putting ' + sn + ' in err-disable state\n' + msg +
      '\n%LINEPROTO-5-UPDOWN: Line protocol on Interface ' + port + ', changed state to down\n%LINK-3-UPDOWN: Interface ' + port + ', changed state to down');
    const rt = netRt(topo);
    if (rt.lastStates) rt.lastStates[sw.id + '|' + port] = 'down/down';   // чтобы netCommit не повторил сообщения о линке
    changed = true;
  }
  if (changed) touch(topo);
}

// В netCommit: порт лёг — динамические адреса забываются; errdisable recovery поднимает порт через интервал
function psecCommit(topo) {
  const rt = netRt(topo);
  for (const [k, r] of Object.entries(rt.psec || {})) {
    const [id, port] = k.split('|');
    const sw = topo.devices[id];
    if (!sw || !sw.cfg.interfaces[port]) { delete rt.psec[k]; continue; }
    if (r.dyn.length && !portPhysUp(topo, id, port)) r.dyn = [];
  }
  for (const sw of Object.values(topo.devices)) {
    if (sw.type !== 'switch' || !sw.cfg.errRecovery || !sw.cfg.errRecovery.psecure) continue;
    const every = (sw.cfg.errRecovery.interval || 300) * 1000;
    for (const [n, ic] of Object.entries(sw.cfg.interfaces)) {
      if (ic.errdis !== 'psecure-violation' || netTime(topo) < (ic.errdisAt || 0) + every) continue;
      delete ic.errdis;
      pushConsole(topo, sw.id, '%PM-4-ERR_RECOVER: Attempting to recover from psecure-violation err-disable state on ' + ifShort(n));
      touch(topo);
    }
  }
}

// Через сколько мс ближайшее автоматическое восстановление (для таймера перерисовки)
function psecNextChange(topo) {
  let best = null;
  for (const sw of Object.values(topo.devices)) {
    if (sw.type !== 'switch' || !sw.cfg.errRecovery || !sw.cfg.errRecovery.psecure) continue;
    for (const ic of Object.values(sw.cfg.interfaces)) {
      if (ic.errdis !== 'psecure-violation') continue;
      const t = (ic.errdisAt || 0) + (sw.cfg.errRecovery.interval || 300) * 1000 - netTime(topo);
      if (best === null || t < best) best = Math.max(0, t);
    }
  }
  return best;
}

function psecMac(s) {
  const t = String(s).toLowerCase().replace(/[^0-9a-f]/g, '');
  if (t.length !== 12) return null;
  return (t.slice(0, 4) + '.' + t.slice(4, 8) + '.' + t.slice(8)).toUpperCase();
}

// ---------- running-config ----------
function psecRunningIf(ic) {
  const p = ic.psec;
  if (!p) return [];
  const L = [];
  if (p.on) L.push(' switchport port-security');
  if (p.max !== 1) L.push(' switchport port-security maximum ' + p.max);
  if (p.sticky) L.push(' switchport port-security mac-address sticky');
  for (const m of p.macs) L.push(' switchport port-security mac-address ' + (m.sticky ? 'sticky ' : '') + m.mac.toLowerCase());
  if (p.violation !== 'shutdown') L.push(' switchport port-security violation ' + p.violation);
  if (p.aging.time) L.push(' switchport port-security aging time ' + p.aging.time);
  if (p.aging.type !== 'absolute') L.push(' switchport port-security aging type ' + p.aging.type);
  if (p.aging.static) L.push(' switchport port-security aging static');
  return L;
}
function psecRunningGlobal(cfg) {
  const r = cfg.errRecovery;
  if (!r) return [];
  const L = [];
  if (r.psecure) L.push('errdisable recovery cause psecure-violation');
  if (r.interval && r.interval !== 300) L.push('errdisable recovery interval ' + r.interval);
  return L;
}

// ---------- show ----------
function iosShowPortSecurity(topo, sw) {
  const L = ['Secure Port MaxSecureAddr CurrentAddr SecurityViolation Security Action', '               (Count)       (Count)        (Count)',
    '--------------------------------------------------------------------'];
  for (const p of sw.ports) {
    const ic = sw.cfg.interfaces[p.name];
    if (!psecOn(ic)) continue;
    const r = psecRt(topo, sw.id, p.name);
    const act = { shutdown: 'Shutdown', restrict: 'Restrict', protect: 'Protect' }[ic.psec.violation];
    L.push(padL(ifShort(p.name), 13) + padL(String(ic.psec.max), 9) + padL(String(psecAddrs(topo, sw, p.name).length), 11) + padL(String(r.count), 18) + padL(act, 18));
  }
  L.push('----------------------------------------------------------------------');
  const total = sw.ports.reduce((n, p) => n + psecAddrs(topo, sw, p.name).length, 0);
  L.push('Total Addresses in System (excluding one mac per port)     : ' + Math.max(0, total - sw.ports.filter((p) => psecAddrs(topo, sw, p.name).length).length));
  L.push('Max Addresses limit in System (excluding one mac per port) : 1024');
  return L.join('\n');
}

function iosShowPortSecurityIf(topo, sw, port) {
  const ic = sw.cfg.interfaces[port];
  if (!ic || ifKind(port) !== 'phys') return '% Invalid interface';
  const p = psecCfg(ic);
  const r = psecRt(topo, sw.id, port);
  const addrs = psecAddrs(topo, sw, port);
  const status = !p.on ? 'Secure-down' : ic.errdis === 'psecure-violation' ? 'Secure-shutdown' : portPhysUp(topo, sw.id, port) ? 'Secure-up' : 'Secure-down';
  const row = (k, v) => padR(k, 26) + ': ' + v;
  return [
    row('Port Security', p.on ? 'Enabled' : 'Disabled'),
    row('Port Status', status),
    row('Violation Mode', p.violation[0].toUpperCase() + p.violation.slice(1)),
    row('Aging Time', p.aging.time + ' mins'),
    row('Aging Type', p.aging.type === 'inactivity' ? 'Inactivity' : 'Absolute'),
    row('SecureStatic Address Aging', p.aging.static ? 'Enabled' : 'Disabled'),
    row('Maximum MAC Addresses', p.max),
    row('Total MAC Addresses', addrs.length),
    row('Configured MAC Addresses', addrs.filter((x) => x.type === 'SecureConfigured').length),
    row('Sticky MAC Addresses', addrs.filter((x) => x.type === 'SecureSticky').length),
    row('Last Source Address:Vlan', r.last ? r.last.toLowerCase() : (addrs.length ? addrs[addrs.length - 1].mac.toLowerCase() + ':' + (ic.accessVlan || 1) : '0000.0000.0000:0')),
    row('Security Violation Count', r.count),
  ].join('\n');
}

function iosShowPortSecurityAddr(topo, sw) {
  const L = ['               Secure Mac Address Table', '-----------------------------------------------------------------------------',
    'Vlan    Mac Address       Type                          Ports   Remaining Age', '                                                                   (mins)',
    '----    -----------       ----                          -----   -------------'];
  let n = 0;
  for (const p of sw.ports) {
    const ic = sw.cfg.interfaces[p.name];
    for (const a of psecAddrs(topo, sw, p.name)) {
      n++;
      L.push(padL(String(ic.accessVlan || 1), 4) + '    ' + padR(a.mac.toLowerCase(), 18) + padR(a.type, 30) + padR(ifShort(p.name), 8) + (ic.psec.aging.time ? String(ic.psec.aging.time) : '-'));
    }
  }
  L.push('-----------------------------------------------------------------------------', 'Total Addresses in System (excluding one mac per port)     : ' + Math.max(0, n - 1),
    'Max Addresses limit in System (excluding one mac per port) : 1024');
  return L.join('\n');
}

// show interfaces status — видно, какой порт в err-disabled
function iosShowIfStatus(topo, sw) {
  const L = ['Port      Name               Status       Vlan       Duplex  Speed Type'];
  for (const p of sw.ports) {
    if (p.console) continue;
    const ic = sw.cfg.interfaces[p.name];
    const st = ic.shutdown ? 'disabled' : ic.errdis ? 'err-disabled' : portPhysUp(topo, sw.id, p.name) ? 'connected' : 'notconnect';
    const vlan = swOperMode(topo, sw, p.name) === 'trunk' && portPhysUp(topo, sw.id, p.name) ? 'trunk' : String(ic.accessVlan || 1);
    const gig = p.name.startsWith('Gigabit');
    L.push(padR(ifShort(p.name), 10) + padR((ic.description || '').slice(0, 18), 19) + padR(st, 13) + padR(vlan, 11) + padR('auto', 8) + padR('auto', 6) + (gig ? '10/100/1000BaseTX' : '10/100BaseTX'));
  }
  return L.join('\n');
}

// ---------- команды IOS ----------
// Port Security — только на access-порту (как в IOS: на dynamic auto / trunk команда отклоняется)
const PSEC = (pattern, fn) => iosDef(['if', 'range'], pattern, (c) => {
  const l = iosSwPorts(c);
  if (!l) return;
  for (const x of l) if (ifKind(x.name) !== 'phys') { c.out(iosInvalidHere(c)); return; }
  fn(c, l);
}, { dev: 'switch' });

PSEC('switchport port-security', (c, l) => {
  for (const { name, ic } of l) {
    if (ic.mode !== 'access') { c.out('Command rejected: ' + name + ' is a ' + (ic.mode === 'trunk' ? 'trunk' : 'dynamic') + ' port.'); continue; }
    psecCfg(ic).on = true;
  }
});
PSEC('no switchport port-security', (c, l) => {
  for (const { name, ic } of l) { psecCfg(ic).on = false; psecRt(c.topo, c.dev.id, name).dyn = []; if (ic.errdis === 'psecure-violation') delete ic.errdis; }
});
PSEC('switchport port-security maximum <num>', (c, l) => {
  if (c.p[0] < 1 || c.p[0] > 8192) { c.out(iosInvalidHere(c)); return; }
  for (const { ic } of l) {
    const p = psecCfg(ic);
    if (p.on && p.macs.length > c.p[0]) { c.out('Total secure mac-addresses on interface ' + ifShort(l[0].name) + ' has reached maximum limit.'); continue; }
    p.max = c.p[0];
  }
});
PSEC('no switchport port-security maximum', (c, l) => { for (const { ic } of l) psecCfg(ic).max = 1; });
PSEC('switchport port-security violation shutdown', (c, l) => { for (const { ic } of l) psecCfg(ic).violation = 'shutdown'; });
PSEC('switchport port-security violation restrict', (c, l) => { for (const { ic } of l) psecCfg(ic).violation = 'restrict'; });
PSEC('switchport port-security violation protect', (c, l) => { for (const { ic } of l) psecCfg(ic).violation = 'protect'; });
PSEC('no switchport port-security violation', (c, l) => { for (const { ic } of l) psecCfg(ic).violation = 'shutdown'; });
// sticky: адреса учатся сами и записываются в running-config (уже выученные динамические тоже становятся sticky)
PSEC('switchport port-security mac-address sticky', (c, l) => {
  for (const { name, ic } of l) {
    const p = psecCfg(ic), r = psecRt(c.topo, c.dev.id, name);
    p.sticky = true;
    for (const mac of r.dyn) if (!p.macs.some((m) => m.mac === mac)) p.macs.push({ mac, sticky: true });
    r.dyn = [];
  }
});
PSEC('no switchport port-security mac-address sticky', (c, l) => {
  for (const { name, ic } of l) {
    const p = psecCfg(ic), r = psecRt(c.topo, c.dev.id, name);
    p.sticky = false;
    for (const m of p.macs.filter((x) => x.sticky)) if (!r.dyn.includes(m.mac)) r.dyn.push(m.mac);
    p.macs = p.macs.filter((x) => !x.sticky);
  }
});
const PSEC_ADD = (sticky) => (c, l) => {
  const mac = psecMac(c.p[0]);
  if (!mac) { c.out('% Invalid input detected at \'^\' marker.'); return; }
  for (const { ic } of l) {
    const p = psecCfg(ic);
    if (p.macs.some((m) => m.mac === mac)) continue;
    if (p.macs.length >= p.max) { c.out('Total secure mac-addresses on interface ' + ifShort(l[0].name) + ' has reached maximum limit.'); continue; }
    p.macs.push({ mac, sticky });
  }
};
PSEC('switchport port-security mac-address sticky <word>', PSEC_ADD(true));
PSEC('switchport port-security mac-address <word>', PSEC_ADD(false));
PSEC('no switchport port-security mac-address <word>', (c, l) => {
  const mac = psecMac(c.p[0]);
  for (const { ic } of l) psecCfg(ic).macs = psecCfg(ic).macs.filter((m) => m.mac !== mac);
});
PSEC('switchport port-security aging time <num>', (c, l) => {
  if (c.p[0] > 1440) { c.out(iosInvalidHere(c)); return; }
  for (const { ic } of l) psecCfg(ic).aging.time = c.p[0];
});
PSEC('no switchport port-security aging time', (c, l) => { for (const { ic } of l) psecCfg(ic).aging.time = 0; });
PSEC('switchport port-security aging type absolute', (c, l) => { for (const { ic } of l) psecCfg(ic).aging.type = 'absolute'; });
PSEC('switchport port-security aging type inactivity', (c, l) => { for (const { ic } of l) psecCfg(ic).aging.type = 'inactivity'; });
PSEC('switchport port-security aging static', (c, l) => { for (const { ic } of l) psecCfg(ic).aging.static = true; });
PSEC('no switchport port-security aging static', (c, l) => { for (const { ic } of l) psecCfg(ic).aging.static = false; });

iosDef(['config'], 'errdisable recovery cause psecure-violation', (c) => { (c.cfg.errRecovery = c.cfg.errRecovery || {}).psecure = true; }, { dev: 'switch' });
iosDef(['config'], 'no errdisable recovery cause psecure-violation', (c) => { if (c.cfg.errRecovery) c.cfg.errRecovery.psecure = false; }, { dev: 'switch' });
iosDef(['config'], 'errdisable recovery interval <num>', (c) => {
  if (c.p[0] < 30 || c.p[0] > 86400) { c.out(iosInvalidHere(c)); return; }
  (c.cfg.errRecovery = c.cfg.errRecovery || {}).interval = c.p[0];
}, { dev: 'switch' });
iosDef(['config'], 'no errdisable recovery interval', (c) => { if (c.cfg.errRecovery) delete c.cfg.errRecovery.interval; }, { dev: 'switch' });

// очистка выученных адресов
const PSEC_CLEAR = (kinds) => (c) => {
  for (const p of c.dev.ports) {
    const ic = c.cfg.interfaces[p.name];
    if (!ic || !ic.psec) continue;
    if (kinds.includes('dynamic')) psecRt(c.topo, c.dev.id, p.name).dyn = [];
    if (kinds.includes('sticky')) ic.psec.macs = ic.psec.macs.filter((m) => !m.sticky);
    if (kinds.includes('configured')) ic.psec.macs = ic.psec.macs.filter((m) => m.sticky);
  }
  touch(c.topo);
};
iosDef(['priv'], 'clear port-security all', PSEC_CLEAR(['dynamic', 'sticky', 'configured']), { dev: 'switch' });
iosDef(['priv'], 'clear port-security dynamic', PSEC_CLEAR(['dynamic']), { dev: 'switch' });
iosDef(['priv'], 'clear port-security sticky', PSEC_CLEAR(['sticky']), { dev: 'switch' });

SHOW('port-security', (c) => c.out(iosShowPortSecurity(c.topo, c.dev)), { dev: 'switch' });
SHOW('port-security interface <if>', (c) => c.out(iosShowPortSecurityIf(c.topo, c.dev, c.p[0])), { dev: 'switch' });
SHOW('port-security address', (c) => c.out(iosShowPortSecurityAddr(c.topo, c.dev)), { dev: 'switch' });
SHOW('interfaces status', (c) => c.out(iosShowIfStatus(c.topo, c.dev)), { dev: 'switch' });

Object.assign(IOS_HELP, {
  'port-security': 'Security related command', maximum: 'Max secure addresses', violation: 'Security violation mode', sticky: 'Configure dynamic secure addresses as sticky',
  aging: 'Port-security aging commands', restrict: 'Security violation restrict mode', protect: 'Security violation protect mode', errdisable: 'Error disable',
  recovery: 'Error disable recovery', 'psecure-violation': 'Enable timer to recover from psecure violation error disable state',
  bandwidth: 'Set bandwidth informational parameter', clock: 'Configure serial interface clock', encapsulation: 'Set encapsulation type for an interface',
  priority: 'Router priority', 'hello-interval': 'Time between HELLO packets', 'dead-interval': 'Interval after which a neighbor is declared dead',
  database: 'Database summary', debug: 'Debugging functions (see also \'undebug\')', undebug: 'Disable debugging functions (see also \'debug\')', adj: 'OSPF adjacency events',
});
