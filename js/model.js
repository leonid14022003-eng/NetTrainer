'use strict';
// Модель топологии: каталог устройств, порты, кабели, состояние линков.

const IF_TYPES = [
  { full: 'GigabitEthernet', short: 'Gi', min: 'g' },
  { full: 'FastEthernet', short: 'Fa', min: 'f' },
  { full: 'Ethernet', short: 'Eth', min: 'e' },
  { full: 'Serial', short: 'Se', min: 's' },
  { full: 'Vlan', short: 'Vlan', min: 'v' },
  { full: 'Loopback', short: 'Lo', min: 'l' },
  { full: 'Port-channel', short: 'Po', min: 'po' },
];

function rangeNames(prefix, from, to) {
  const out = [];
  for (let i = from; i <= to; i++) out.push(prefix + i);
  return out;
}

const DEVICE_CATALOG = {
  '4331': { type: 'router', group: 'routers', label: '4331', display: 'ISR4331', namePrefix: 'Router', console: 'Console',
    menu: ['USB Console', 'Auxiliary', 'Console'], ports: rangeNames('GigabitEthernet0/0/', 0, 2), hint: T('ISR router, ports Gi0/0/0–0/0/2', 'ISR-роутер, порты Gi0/0/0–0/0/2') },
  '4321': { type: 'router', group: 'routers', label: '4321', display: 'ISR4321', namePrefix: 'Router', console: 'Console',
    menu: ['USB Console', 'Auxiliary', 'Console'], ports: rangeNames('GigabitEthernet0/0/', 0, 1), hint: T('ISR router, ports Gi0/0/0–0/0/1', 'ISR-роутер, порты Gi0/0/0–0/0/1') },
  '1941': { type: 'router', group: 'routers', label: '1941', display: '1941', namePrefix: 'Router', console: 'Console',
    menu: ['Console', 'Auxiliary'], ports: rangeNames('GigabitEthernet0/', 0, 1), hint: T('Router with 2 Gigabit ports', 'Роутер с 2 гигабитными портами') },
  '2901': { type: 'router', group: 'routers', label: '2901', display: '2901', namePrefix: 'Router', console: 'Console',
    menu: ['Console', 'Auxiliary'], ports: rangeNames('GigabitEthernet0/', 0, 1), hint: T('Router with 2 Gigabit ports', 'Роутер с 2 гигабитными портами') },
  '2911': { type: 'router', group: 'routers', label: '2911', display: '2911', namePrefix: 'Router', console: 'Console',
    menu: ['Console', 'Auxiliary'], ports: rangeNames('GigabitEthernet0/', 0, 2), hint: T('Router with 3 Gigabit ports', 'Роутер с 3 гигабитными портами') },
  '2960': { type: 'switch', group: 'switches', label: '2960', display: '2960-24TT', namePrefix: 'Switch', console: 'Console',
    menu: ['Console'], ports: rangeNames('FastEthernet0/', 1, 24).concat(rangeNames('GigabitEthernet0/', 1, 2)),
    hint: T('Switch: 24 FastEthernet + 2 Gigabit ports', 'Свитч: 24 порта FastEthernet + 2 гигабитных') },
  '2950-24': { type: 'switch', group: 'switches', label: '2950-24', display: '2950-24', namePrefix: 'Switch', console: 'Console',
    menu: ['Console'], ports: rangeNames('FastEthernet0/', 1, 24), hint: T('Switch: 24 FastEthernet ports', 'Свитч: 24 порта FastEthernet') },
  '2950T': { type: 'switch', group: 'switches', label: '2950T', display: '2950T-24', namePrefix: 'Switch', console: 'Console',
    menu: ['Console'], ports: rangeNames('FastEthernet0/', 1, 24).concat(rangeNames('GigabitEthernet0/', 1, 2)), hint: T('Switch: 24 FastEthernet + 2 Gigabit ports', 'Свитч: 24 FastEthernet + 2 гигабитных') },
  'PT-Hub': { type: 'hub', group: 'hubs', label: 'PT-Hub', display: 'PT-Hub', namePrefix: 'Hub',
    menu: [], ports: rangeNames('Port ', 0, 5), hint: T('Hub: repeats every frame to all ports', 'Хаб: повторяет каждый кадр во все порты') },
  'PC': { type: 'pc', group: 'end', label: 'PC', display: 'PC-PT', icon: 'pc', namePrefix: 'PC', console: 'RS 232',
    menu: ['RS 232', 'USB0', 'USB1'], ports: ['FastEthernet0'], hint: T('Desktop computer', 'Настольный компьютер') },
  'Laptop': { type: 'pc', group: 'end', label: 'Laptop', display: 'Laptop-PT', icon: 'laptop', namePrefix: 'Laptop', console: 'RS 232',
    menu: ['RS 232', 'USB0', 'USB1'], ports: ['FastEthernet0'], hint: T('Laptop', 'Ноутбук') },
  'Server': { type: 'pc', group: 'end', label: 'Server', display: 'Server-PT', icon: 'server', namePrefix: 'Server', console: 'RS 232',
    menu: ['RS 232', 'USB0'], ports: ['FastEthernet0'], hint: T('Server', 'Сервер') },
  'Printer': { type: 'pc', group: 'end', label: 'Printer', display: 'Printer-PT', icon: 'printer', namePrefix: 'Printer',
    menu: [], ports: ['FastEthernet0'], hint: T('Network printer', 'Сетевой принтер') },
};

const CABLES = {
  auto: { label: T('Automatic', 'Автовыбор'), color: '#222' },
  console: { label: T('Console', 'Консольный'), color: '#5fb4e8' },
  straight: { label: T('Copper Straight-Through', 'Прямой (Straight-Through)'), color: '#111' },
  cross: { label: T('Copper Cross-Over', 'Перекрёстный (Cross-Over)'), color: '#111', dash: '6 4' },
};

function ifShort(name) {
  for (const t of IF_TYPES) if (name.startsWith(t.full)) return t.short + name.slice(t.full.length);
  return name;
}

// Разбор имени интерфейса: "g0/0", "gig 0/0.10", "FastEthernet0/1", "vlan 1", "lo0".
function parseIfName(str) {
  if (!str) return null;
  const s = str.replace(/\s+/g, '').toLowerCase();
  const m = s.match(/^([a-z-]+)(\d[\d/.]*)$/);
  if (!m) return null;
  const [, word, num] = m;
  let type = null;
  for (const t of IF_TYPES) {
    if (t.full.toLowerCase().startsWith(word) && word.length >= t.min.length) {
      if (type) { // неоднозначно — уточняем
        if (t.full.toLowerCase() === word) type = t;
        continue;
      }
      type = t;
    }
  }
  // "e" однозначно не Ethernet для коммутаторов Cisco, но формально это Ethernet
  if (!type) return null;
  if (!/^\d+(\/\d+)*(\.\d+)?$/.test(num)) return null;
  return type.full + num;
}

let _macRng = makeRng((Date.now() & 0xffffff) + 7);

function newTopology() {
  return { version: 1, rev: 0, devices: {}, links: {}, notes: [], counters: {}, seq: 1 };
}

function defaultRouterCfg(ports) {
  const interfaces = {};
  for (const p of ports) interfaces[p] = { ip: null, mask: null, shutdown: true, description: '', helpers: [] };
  return {
    hostname: 'Router', enableSecret: null, enablePassword: null, banner: null,
    servicePasswordEncryption: false, domainLookup: true, domainName: null,
    lines: { con: { password: null, login: false, loginLocal: false }, vty: { password: null, login: false, loginLocal: false, transport: null } },
    users: {},
    interfaces, staticRoutes: [], rip: null, ospf: null,
    dhcpPools: {}, dhcpExcluded: [], dhcpBindings: {},
  };
}

function defaultSwitchCfg(ports) {
  const interfaces = {};
  for (const p of ports) {
    interfaces[p] = { shutdown: false, mode: 'dynamic auto', accessVlan: 1, nativeVlan: 1, allowed: 'all', description: '', nonegotiate: false };
  }
  interfaces['Vlan1'] = { ip: null, mask: null, shutdown: true, description: '' };
  return {
    hostname: 'Switch', enableSecret: null, enablePassword: null, banner: null,
    servicePasswordEncryption: false, domainLookup: true, domainName: null,
    lines: { con: { password: null, login: false, loginLocal: false }, vty: { password: null, login: false, loginLocal: false, transport: null } },
    users: {},
    vlans: { 1: { name: 'default' } },
    interfaces, defaultGateway: null, macTable: {},
  };
}

function defaultPcCfg() {
  return { ipMode: 'static', ip: null, mask: null, gateway: null, dns: null, portOn: true, dhcpStatus: null };
}

function addDevice(topo, model, x, y, opts = {}) {
  const cat = DEVICE_CATALOG[model];
  if (!cat) throw new Error('Unknown model ' + model);
  const prefix = cat.namePrefix;
  let name = opts.name;
  if (!name) {
    let n = topo.counters[prefix] || 0;
    const used = new Set(Object.values(topo.devices).map((d) => d.name));
    while (used.has(prefix + n)) n++;
    name = prefix + n;
    topo.counters[prefix] = n + 1;
  }
  let id = opts.id;
  if (!id) { id = 'd' + topo.seq++; while (topo.devices[id]) id = 'd' + topo.seq++; }
  const ports = cat.ports.map((p) => ({ name: p, mac: makeMac(_macRng), link: null }));
  if (cat.console) ports.push({ name: cat.console, mac: null, link: null, console: true });
  let cfg;
  if (cat.type === 'router') cfg = defaultRouterCfg(cat.ports);
  else if (cat.type === 'switch') cfg = defaultSwitchCfg(cat.ports);
  else if (cat.type === 'hub') cfg = {};
  else cfg = defaultPcCfg();
  const dev = { id, model, type: cat.type, name, x: Math.round(x), y: Math.round(y), ports, cfg, startup: null };
  topo.devices[id] = dev;
  return dev;
}

function getPort(dev, portName) { return dev.ports.find((p) => p.name === portName) || null; }

function removeDevice(topo, devId) {
  const dev = topo.devices[devId];
  if (!dev) return;
  for (const p of dev.ports) if (p.link) removeLink(topo, p.link);
  delete topo.devices[devId];
}

function deviceClass(dev) { return dev.type === 'switch' || dev.type === 'hub' ? 'S' : 'H'; }

// Правило CCNA: одинаковый класс устройств — кросс, разный — прямой.
function correctCable(devA, devB) { return deviceClass(devA) === deviceClass(devB) ? 'cross' : 'straight'; }

function addLink(topo, aDev, aPort, bDev, bPort, cable) {
  const A = topo.devices[aDev], B = topo.devices[bDev];
  if (!A || !B) return { error: 'no-device' };
  if (aDev === bDev) return { error: 'same-device' };
  const pa = getPort(A, aPort), pb = getPort(B, bPort);
  if (!pa || !pb) return { error: 'no-port' };
  if (pa.link || pb.link) return { error: 'port-busy' };
  if (!!pa.console !== !!pb.console) return { error: 'port-type' };
  if (pa.console) cable = 'console';
  else if (cable === 'console') return { error: 'port-type' };
  if (!cable || cable === 'auto') cable = correctCable(A, B);
  let id = 'l' + topo.seq++;
  while (topo.links[id]) id = 'l' + topo.seq++;
  topo.links[id] = { id, a: { dev: aDev, port: aPort }, b: { dev: bDev, port: bPort }, cable };
  pa.link = id; pb.link = id;
  return { link: topo.links[id] };
}

function removeLink(topo, linkId) {
  const l = topo.links[linkId];
  if (!l) return;
  for (const end of [l.a, l.b]) {
    const d = topo.devices[end.dev];
    if (d) { const p = getPort(d, end.port); if (p && p.link === linkId) p.link = null; }
  }
  delete topo.links[linkId];
}

function linkPeer(topo, devId, portName) {
  const dev = topo.devices[devId];
  const p = dev && getPort(dev, portName);
  if (!p || !p.link) return null;
  const l = topo.links[p.link];
  if (!l) return null;
  const other = l.a.dev === devId && l.a.port === portName ? l.b : l.a;
  return { dev: other.dev, port: other.port, link: l };
}

function firstFreePort(dev, prefer, consoleOnly) {
  const free = dev.ports.filter((p) => !p.link && !!p.console === !!consoleOnly);
  if (!free.length) return null;
  if (prefer) { const f = free.find((p) => p.name.startsWith(prefer)); if (f) return f.name; }
  return free[0].name;
}

// Административно включён ли порт.
function portAdminUp(dev, portName) {
  if (dev.off) return false;
  if (dev.type === 'hub') return true;
  if (dev.type === 'pc') return dev.cfg.portOn !== false;
  const ic = dev.cfg.interfaces[portName];
  return !!ic && !ic.shutdown && !ic.errdis;   // errdis — порт выключен защитой (BPDU Guard, EtherChannel guard)
}

function linkCableOk(topo, link) {
  if (link.cable === 'console') return false;
  const A = topo.devices[link.a.dev], B = topo.devices[link.b.dev];
  return correctCable(A, B) === link.cable;
}

// Консольное подключение ПК (RS 232) → устройство (Console)
function consolePeer(topo, pcId) {
  const pc = topo.devices[pcId];
  const p = pc && pc.ports.find((x) => x.console);
  if (!p || !p.link) return null;
  const l = topo.links[p.link];
  const other = l.a.dev === pcId ? l.b : l.a;
  const D = topo.devices[other.dev];
  return D && (D.type === 'router' || D.type === 'switch') ? D : null;
}

// Физически поднят ли порт (кабель есть, тип правильный, обе стороны включены).
function portPhysUp(topo, devId, portName) {
  const dev = topo.devices[devId];
  if (!dev) return false;
  const p = getPort(dev, portName);
  if (!p || !p.link) return false;
  const l = topo.links[p.link];
  if (!l || !linkCableOk(topo, l)) return false;
  const peer = linkPeer(topo, devId, portName);
  const pd = topo.devices[peer.dev];
  return portAdminUp(dev, portName) && portAdminUp(pd, peer.port);
}

// Состояние конца линка для отрисовки: 'up' | 'down' | 'blocked' (линк есть, но STP или EtherChannel не пускает кадры)
function linkEndState(topo, link, end) {
  if (link.cable === 'console') return 'console';
  if (!portPhysUp(topo, end.dev, end.port)) return 'down';
  const d = topo.devices[end.dev];
  if (d.type === 'switch' && swPortLed(topo, d, end.port) === 'blocked') return 'blocked';
  return 'up';
}

function touch(topo) { topo.rev = (topo.rev || 0) + 1; }

function deviceById(topo, id) { return topo.devices[id] || null; }

function deviceByName(topo, name) {
  return Object.values(topo.devices).find((d) => d.name === name) || null;
}
