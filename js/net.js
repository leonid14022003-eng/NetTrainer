'use strict';
// Сетевой движок: статусы интерфейсов, VLAN/trunk, L2-домены, ARP,
// маршрутизация (connected/static/RIP/OSPF), DHCP, ping/traceroute, события симуляции.

// ---------- Runtime-состояние (не сохраняется в файл) ----------
const _rtMap = new WeakMap();
function netRt(topo) {
  let rt = _rtMap.get(topo);
  if (!rt) {
    rt = { arp: {}, mac: {}, consoles: {}, lastStates: null, lastOspf: null, routeCache: null, listeners: [] };
    _rtMap.set(topo, rt);
  }
  return rt;
}

// ---------- Интерфейсы ----------
function ifKind(name) {
  if (name.startsWith('Vlan')) return 'svi';
  if (name.startsWith('Loopback')) return 'loop';
  if (name.startsWith('Port-channel')) return 'po';
  if (name.includes('.')) return 'sub';
  return 'phys';
}
function parentPort(name) { return name.split('.')[0]; }

function ifCfg(dev, name) {
  if (dev.type === 'pc') return name === 'FastEthernet0' ? dev.cfg : null;
  return dev.cfg.interfaces[name] || null;
}

// IP интерфейса: {ip:int, len} или null
function ifAddr(dev, name) {
  const ic = ifCfg(dev, name);
  if (!ic || !ic.ip || !ic.mask) return null;
  const ip = ipToInt(ic.ip), len = maskToLen(ic.mask);
  if (ip === null || len === null) return null;
  return { ip, len };
}

function ifMac(dev, name) {
  if (dev.type === 'pc') return dev.ports[0].mac;
  const k = ifKind(name);
  if (k === 'svi' || k === 'loop') return dev.ports[0].mac.slice(0, 10) + 'A0' + (name.length % 10) + '1';
  if (k === 'po') { const m = ecMembers(dev, poGroup(name))[0]; return m ? getPort(dev, m).mac : dev.ports[0].mac; }
  const p = getPort(dev, parentPort(name));
  return p ? p.mac : '0000.0000.0000';
}

function swOperMode(topo, sw, port) {
  const ic = sw.cfg.interfaces[port];
  if (!ic) return 'access';
  if (ic.mode === 'access') return 'access';
  if (ic.mode === 'trunk') return 'trunk';
  const peer = linkPeer(topo, sw.id, port);
  if (!peer) return 'access';
  const pd = topo.devices[peer.dev];
  if (pd.type !== 'switch') return 'access';
  const pic = pd.cfg.interfaces[peer.port];
  if (!pic || pic.nonegotiate) return 'access';
  const pm = pic.mode;
  if (ic.mode === 'dynamic desirable' && ['trunk', 'dynamic desirable', 'dynamic auto'].includes(pm)) return 'trunk';
  if (ic.mode === 'dynamic auto' && ['trunk', 'dynamic desirable'].includes(pm)) return 'trunk';
  return 'access';
}

function vlanAllowed(ic, v) {
  if (ic.allowed === 'all') return true;
  return Array.isArray(ic.allowed) && ic.allowed.includes(v);
}

function swVlanExists(sw, v) { return !!sw.cfg.vlans[v]; }

// VLAN кадра, вошедшего в порт свитча (null — кадр отброшен)
function swIngressVlan(topo, sw, port, tag) {
  const ic = sw.cfg.interfaces[port];
  const mode = swOperMode(topo, sw, port);
  let v;
  if (mode === 'access') {
    if (tag !== null) return null;
    v = ic.accessVlan;
  } else {
    v = tag === null ? ic.nativeVlan : tag;
    if (!vlanAllowed(ic, v)) return null;
  }
  return swVlanExists(sw, v) ? v : null;
}

// Тег при выходе из порта (undefined — порт не в этом VLAN)
function swEgressTag(topo, sw, port, vlan) {
  const ic = sw.cfg.interfaces[port];
  if (!ic) return undefined;
  const mode = swOperMode(topo, sw, port);
  if (mode === 'access') return ic.accessVlan === vlan ? null : undefined;
  if (!vlanAllowed(ic, vlan)) return undefined;
  return vlan === ic.nativeVlan ? null : vlan;
}

function swVlanHasActivePort(topo, sw, v) {
  if (!swVlanExists(sw, v)) return false;
  for (const p of sw.ports) {
    if (!portPhysUp(topo, sw.id, p.name)) continue;
    if (swEgressTag(topo, sw, p.name, v) !== undefined) return true;
  }
  return false;
}

// Статус как в "show ip interface brief"
function ifStatus(topo, dev, name) {
  if (dev.type === 'pc' || dev.type === 'hub') {
    if (dev.off) return { status: 'down', protocol: 'down' };
    if (dev.cfg.portOn === false) return { status: 'administratively down', protocol: 'down' };
    const up = portPhysUp(topo, dev.id, name);
    return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' };
  }
  const ic = dev.cfg.interfaces[name];
  if (!ic) return { status: 'deleted', protocol: 'down' };
  const k = ifKind(name);
  if (ic.shutdown) return { status: 'administratively down', protocol: 'down' };
  if (ic.errdis) return { status: 'down', protocol: 'down', errdis: ic.errdis };
  if (k === 'po') { const up = ecPoUp(topo, dev, name); return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' }; }
  if (k === 'phys') {
    const up = portPhysUp(topo, dev.id, name);
    return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' };
  }
  if (k === 'loop') return { status: 'up', protocol: 'up' };
  if (k === 'sub') {
    const ps = ifStatus(topo, dev, parentPort(name));
    if (ps.status === 'administratively down') return { status: 'administratively down', protocol: 'down' };
    const up = ps.protocol === 'up';
    return { status: up ? 'up' : 'down', protocol: up ? 'up' : 'down' };
  }
  // SVI
  const v = Number(name.slice(4));
  return { status: 'up', protocol: swVlanHasActivePort(topo, dev, v) ? 'up' : 'down' };
}

function ifUp(topo, dev, name) {
  const s = ifStatus(topo, dev, name);
  return s.status === 'up' && s.protocol === 'up';
}

// Список L3-интерфейсов с адресом
function l3Ifaces(dev) {
  const out = [];
  if (dev.type === 'hub') return out;
  if (dev.type === 'pc') {
    const a = ifAddr(dev, 'FastEthernet0');
    if (a) out.push({ name: 'FastEthernet0', ...a });
    return out;
  }
  for (const name of Object.keys(dev.cfg.interfaces)) {
    const a = ifAddr(dev, name);
    if (a) out.push({ name, ...a });
  }
  return out;
}

function ownsIpUp(topo, dev, ipInt) {
  for (const i of l3Ifaces(dev)) if (i.ip === ipInt && ifUp(topo, dev, i.name)) return i.name;
  return null;
}

function routerIfForFrame(dev, port, tag) {
  const ics = dev.cfg.interfaces;
  if (tag === null) {
    for (const n of Object.keys(ics)) {
      if (n.startsWith(port + '.') && ics[n].encap && ics[n].encap.native) return n;
    }
    return ics[port] ? port : null;
  }
  for (const n of Object.keys(ics)) {
    if (n.startsWith(port + '.') && ics[n].encap && !ics[n].encap.native && ics[n].encap.vlan === tag) return n;
  }
  return null;
}

function l2Origin(dev, ifName) {
  if (dev.type === 'pc') return { port: ifName, tag: null };
  const k = ifKind(ifName);
  if (k === 'phys') return { port: ifName, tag: null };
  if (k === 'sub') {
    const ic = dev.cfg.interfaces[ifName];
    if (!ic || !ic.encap) return null;
    return { port: parentPort(ifName), tag: ic.encap.native ? null : ic.encap.vlan };
  }
  if (k === 'svi') return { svi: Number(ifName.slice(4)) };
  return null;
}

// Широковещательный домен: все L3-интерфейсы, до которых дойдёт кадр.
function l2Reach(topo, devId, ifName) {
  const dev = topo.devices[devId];
  const origin = l2Origin(dev, ifName);
  if (!origin) return [];
  const results = [];
  const visited = new Set();
  const queue = [];
  const sws = swState(topo); // EtherChannel и STP
  // Из коммутатора кадр уходит через каждый логический порт один раз (пучок EtherChannel — через один свой порт),
  // кроме того, через который пришёл, и кроме портов, заблокированных STP в этом VLAN.
  const emitFromSwitch = (sw, vlan, ingressPort, path) => {
    if (swInStorm(sws, sw, vlan)) return; // широковещательный шторм: в этом VLAN кадры не проходят
    const inLp = ingressPort ? swLogicalPort(sws, sw, ingressPort) : null;
    const used = new Set();
    for (const p of sw.ports) {
      if (p.name === ingressPort) continue;
      if (!portPhysUp(topo, sw.id, p.name)) continue;
      const lp = swLogicalPort(sws, sw, p.name);
      if (!lp || lp === inLp || used.has(lp)) continue;
      used.add(lp);
      if (stpBlocks(sws, sw, lp, vlan)) continue;
      const tag = swEgressTag(topo, sw, p.name, vlan);
      if (tag === undefined) continue;
      queue.push({ dev: sw.id, port: p.name, tag, path });
    }
  };
  if (origin.svi !== undefined) emitFromSwitch(dev, origin.svi, null, []);
  else queue.push({ dev: devId, port: origin.port, tag: origin.tag, path: [] });
  while (queue.length) {
    const it = queue.shift();
    if (!portPhysUp(topo, it.dev, it.port)) continue;
    const peer = linkPeer(topo, it.dev, it.port);
    const key = peer.dev + '|' + peer.port + '|' + it.tag;
    if (visited.has(key)) continue;
    visited.add(key);
    const D = topo.devices[peer.dev];
    const hop = { link: peer.link.id, from: it.dev, to: peer.dev, fromPort: it.port, toPort: peer.port, tag: it.tag };
    if (D.type === 'switch') {
      const lp = swLogicalPort(sws, D, peer.port);
      if (!lp) continue; // порт пучка приостановлен
      const v = swIngressVlan(topo, D, peer.port, it.tag);
      if (v === null) continue;
      if (stpBlocks(sws, D, lp, v)) continue; // порт не в FWD (BLK, LIS, LRN) кадры не передаёт
      if (swInStorm(sws, D, v)) continue;
      hop.vlan = v;
      const path = it.path.concat([hop]);
      const svi = 'Vlan' + v;
      if (D.cfg.interfaces[svi] && ifAddr(D, svi) && ifUp(topo, D, svi)) results.push({ dev: D.id, ifName: svi, path });
      emitFromSwitch(D, v, peer.port, path);
    } else if (D.type === 'hub') {
      const path = it.path.concat([hop]);
      for (const p of D.ports) {
        if (p.name === peer.port || p.console || !portPhysUp(topo, D.id, p.name)) continue;
        queue.push({ dev: D.id, port: p.name, tag: it.tag, path });
      }
    } else if (D.type === 'router') {
      const path = it.path.concat([hop]);
      const ifn = routerIfForFrame(D, peer.port, it.tag);
      if (ifn && ifUp(topo, D, ifn)) results.push({ dev: D.id, ifName: ifn, path });
    } else if (it.tag === null) {
      results.push({ dev: D.id, ifName: peer.port, path: it.path.concat([hop]) });
    }
  }
  return results.filter((r) => !(r.dev === devId && r.ifName === ifName));
}

// ARP: ищем владельца targetIp в домене. proxy — разрешить proxy-ARP роутеров.
function arpResolve(topo, devId, ifName, targetIp, proxy) {
  const reach = l2Reach(topo, devId, ifName);
  for (const r of reach) {
    const D = topo.devices[r.dev];
    const a = ifAddr(D, r.ifName);
    if (a && a.ip === targetIp) return { ...r, mac: ifMac(D, r.ifName), reach };
  }
  if (proxy) {
    for (const r of reach) {
      const D = topo.devices[r.dev];
      if (D.type !== 'router') continue;
      const rl = routeLookup(topo, D, targetIp);
      if (rl && rl.exitIf !== r.ifName) return { ...r, mac: ifMac(D, r.ifName), reach, proxied: true };
    }
  }
  return null;
}

// ---------- Маршрутизация ----------
const AD = { C: 0, L: 0, S: 1, O: 110, R: 120 };

function ripEnabledIfaces(topo, dev) {
  const rip = dev.cfg.rip;
  if (!rip) return [];
  const out = [];
  for (const i of l3Ifaces(dev)) {
    if (!ifUp(topo, dev, i.name)) continue;
    const major = netOf(i.ip, classfulLen(i.ip));
    if (rip.networks.some((n) => ipToInt(n) === major)) out.push(i);
  }
  return out;
}

function ospfIfaceArea(dev, ifName, addr) {
  const ospf = dev.cfg.ospf;
  const ic = dev.cfg.interfaces[ifName];
  if (ic && ic.ospfArea !== undefined && ic.ospfArea !== null) return ic.ospfArea;
  if (!ospf) return null;
  let best = null, bestLen = -1;
  for (const n of ospf.networks) {
    const wl = wildcardToLen(n.wildcard);
    const len = wl === null ? 32 : wl;
    const wild = ipToInt(n.wildcard);
    const m = (~wild) >>> 0;
    if (((addr.ip & m) >>> 0) === ((ipToInt(n.ip) & m) >>> 0) && len > bestLen) { best = n.area; bestLen = len; }
  }
  return best;
}

function ospfEnabledIfaces(topo, dev) {
  if (!dev.cfg.ospf) return [];
  const out = [];
  for (const i of l3Ifaces(dev)) {
    if (!ifUp(topo, dev, i.name)) continue;
    const area = ospfIfaceArea(dev, i.name, i);
    if (area !== null) out.push({ ...i, area });
  }
  return out;
}

function ospfRouterId(topo, dev) {
  const o = dev.cfg.ospf;
  if (!o) return null;
  if (o.routerId) return o.routerId;
  let loopMax = null, anyMax = null;
  for (const i of l3Ifaces(dev)) {
    if (!ifUp(topo, dev, i.name)) continue;
    if (ifKind(i.name) === 'loop') { if (loopMax === null || i.ip > loopMax) loopMax = i.ip; }
    if (anyMax === null || i.ip > anyMax) anyMax = i.ip;
  }
  const v = loopMax !== null ? loopMax : anyMax;
  return v === null ? null : intToIp(v);
}

function ospfCost(dev, ifName) {
  const ic = dev.cfg.interfaces[ifName];
  if (ic && ic.ospfCost) return ic.ospfCost;
  const ref = (dev.cfg.ospf && dev.cfg.ospf.refBw) || 100;
  let bw = 1000;
  if (ifName.startsWith('FastEthernet')) bw = 100;
  if (ifName.startsWith('Ethernet')) bw = 10;
  if (ifName.startsWith('Loopback')) return 1;
  if (ifName.startsWith('Serial')) bw = 1.544;
  return Math.max(1, Math.floor(ref / bw));
}

function isPassive(proto, ifName) {
  return !!proto && Array.isArray(proto.passive) && proto.passive.includes(ifName);
}

// Соседи OSPF: [{dev, nbr, myIf, nbrIf, nbrIp, nbrRid, area}]
function ospfAdjacencies(topo) {
  const adj = [];
  const routers = Object.values(topo.devices).filter((d) => d.type === 'router' && d.cfg.ospf);
  for (const R of routers) {
    const rid = ospfRouterId(topo, R);
    if (!rid) continue;
    for (const i of ospfEnabledIfaces(topo, R)) {
      if (ifKind(i.name) === 'loop' || isPassive(R.cfg.ospf, i.name)) continue;
      for (const r of l2Reach(topo, R.id, i.name)) {
        const N = topo.devices[r.dev];
        if (N.type !== 'router' || !N.cfg.ospf || N.id === R.id) continue;
        if (isPassive(N.cfg.ospf, r.ifName)) continue;
        const na = ifAddr(N, r.ifName);
        if (!na || na.len !== i.len || !inSubnet(na.ip, i.ip, i.len)) continue;
        const nArea = ospfIfaceArea(N, r.ifName, na);
        if (nArea === null || String(nArea) !== String(i.area)) continue;
        const nrid = ospfRouterId(topo, N);
        if (!nrid || nrid === rid) continue;
        adj.push({ dev: R.id, nbr: N.id, myIf: i.name, nbrIf: r.ifName, nbrIp: na.ip, nbrRid: nrid, area: i.area });
      }
    }
  }
  return adj;
}

function staticDefaultExists(topo, dev) {
  return dev.cfg.staticRoutes.some((s) => s.net === '0.0.0.0' && s.mask === '0.0.0.0');
}

function computeRip(topo, connectedMap, staticMap) {
  const routers = Object.values(topo.devices).filter((d) => d.type === 'router' && d.cfg.rip);
  const tables = {};
  const enabled = {};
  for (const R of routers) {
    enabled[R.id] = ripEnabledIfaces(topo, R);
    const t = new Map();
    for (const i of enabled[R.id]) {
      const net = netOf(i.ip, i.len);
      t.set(net + '/' + i.len, { net, len: i.len, metric: 0, nextHop: null, exitIf: i.name, connected: true });
    }
    if (R.cfg.rip.defaultOriginate && (staticMap[R.id] || []).some((r) => r.len === 0)) {
      t.set('0/0', { net: 0, len: 0, metric: 0, nextHop: null, exitIf: null, connected: true, originate: true });
    }
    tables[R.id] = t;
  }
  // соседства
  const nbrs = [];
  for (const R of routers) {
    for (const i of enabled[R.id]) {
      for (const r of l2Reach(topo, R.id, i.name)) {
        const N = topo.devices[r.dev];
        if (N.type !== 'router' || !N.cfg.rip || N.id === R.id) continue;
        const ni = enabled[N.id].find((x) => x.name === r.ifName);
        if (!ni || !inSubnet(ni.ip, i.ip, i.len)) continue;
        nbrs.push({ recv: R, myIf: i, send: N, nIf: ni });
      }
    }
  }
  for (let round = 0; round < 20; round++) {
    let changed = false;
    for (const { recv: R, myIf, send: N, nIf } of nbrs) {
      if (isPassive(N.cfg.rip, nIf.name)) continue;
      const sendV = N.cfg.rip.version || 1;
      const accept = R.cfg.rip.version ? [R.cfg.rip.version] : [1, 2];
      if (!accept.includes(sendV)) continue;
      const summarize = sendV === 1 || N.cfg.rip.autoSummary !== false;
      const nIfMajor = netOf(nIf.ip, classfulLen(nIf.ip));
      for (const route of tables[N.id].values()) {
        if (route.exitIf === nIf.name && !route.connected) continue; // split horizon
        let net = route.net, len = route.len;
        if (len > 0 && summarize && netOf(net, classfulLen(net)) !== nIfMajor) { len = classfulLen(net); net = netOf(net, len); }
        if (len > 0 && sendV === 1 && netOf(net, classfulLen(net)) === nIfMajor) { len = nIf.len; net = netOf(net, len); }
        const metric = route.metric + 1;
        if (metric > 15) continue;
        // классовый суммарный маршрут своей же мажорной сети игнорируем
        if (len === classfulLen(net) && len > 0 && enabled[R.id].some((x) => netOf(x.ip, classfulLen(x.ip)) === net && x.len > len)) continue;
        const key = net + '/' + len;
        const ex = tables[R.id].get(key);
        if (ex && (ex.connected || ex.metric <= metric)) continue;
        tables[R.id].set(key, { net, len, metric, nextHop: nIf.ip, exitIf: myIf.name, connected: false });
        changed = true;
      }
    }
    if (!changed) break;
  }
  const out = {};
  for (const R of routers) {
    out[R.id] = [...tables[R.id].values()].filter((r) => !r.connected).map((r) => ({
      code: r.len === 0 ? 'R*' : 'R', net: r.net, len: r.len, ad: AD.R, metric: r.metric, nextHop: r.nextHop, exitIf: r.exitIf,
    }));
  }
  return out;
}

function computeOspf(topo, staticMap) {
  const routers = Object.values(topo.devices).filter((d) => d.type === 'router' && d.cfg.ospf && ospfRouterId(topo, d));
  const adj = ospfAdjacencies(topo);
  // двусторонние соседства
  const two = adj.filter((a) => adj.some((b) => b.dev === a.nbr && b.nbr === a.dev && b.myIf === a.nbrIf));
  const stubs = {};
  for (const R of routers) {
    stubs[R.id] = ospfEnabledIfaces(topo, R).map((i) => {
      const loop = ifKind(i.name) === 'loop';
      const len = loop ? 32 : i.len;
      return { net: netOf(i.ip, len), len, cost: ospfCost(R, i.name), area: i.area };
    });
  }
  const out = {};
  for (const R of routers) {
    const dist = { [R.id]: 0 };
    const first = { [R.id]: null };
    const done = new Set();
    for (;;) {
      let u = null;
      for (const k of Object.keys(dist)) if (!done.has(k) && (u === null || dist[k] < dist[u])) u = k;
      if (u === null) break;
      done.add(u);
      const U = topo.devices[u];
      for (const e of two.filter((a) => a.dev === u)) {
        const d = dist[u] + ospfCost(U, e.myIf);
        if (dist[e.nbr] === undefined || d < dist[e.nbr]) {
          dist[e.nbr] = d;
          first[e.nbr] = u === R.id ? { nextHop: e.nbrIp, exitIf: e.myIf } : first[u];
        }
      }
    }
    const myAreas = new Set(ospfEnabledIfaces(topo, R).map((i) => String(i.area)));
    const myNets = new Set(l3Ifaces(R).filter((i) => ifUp(topo, R, i.name)).map((i) => netOf(i.ip, i.len) + '/' + i.len));
    const best = new Map();
    for (const X of routers) {
      if (X.id === R.id || dist[X.id] === undefined) continue;
      for (const s of stubs[X.id]) {
        const key = s.net + '/' + s.len;
        if (myNets.has(key)) continue;
        const total = dist[X.id] + s.cost;
        const ex = best.get(key);
        if (!ex || total < ex.metric) {
          best.set(key, { code: myAreas.has(String(s.area)) ? 'O' : 'O IA', net: s.net, len: s.len, ad: AD.O, metric: total, nextHop: first[X.id].nextHop, exitIf: first[X.id].exitIf });
        }
      }
      const o = X.cfg.ospf;
      if (o.defaultOriginate && (o.defaultAlways || (staticMap[X.id] || []).some((r) => r.len === 0))) {
        const ex = best.get('0/0');
        const m = dist[X.id];
        if (!ex || m < ex._d) best.set('0/0', { code: 'O*E2', net: 0, len: 0, ad: AD.O, metric: 1, _d: m, nextHop: first[X.id].nextHop, exitIf: first[X.id].exitIf });
      }
    }
    out[R.id] = [...best.values()];
  }
  return { routes: out, adj: two };
}

function connectedRoutesOf(topo, dev) {
  const out = [];
  for (const i of l3Ifaces(dev)) {
    if (!ifUp(topo, dev, i.name)) continue;
    out.push({ code: 'C', net: netOf(i.ip, i.len), len: i.len, ad: 0, metric: 0, nextHop: null, exitIf: i.name });
    if (i.len < 32) out.push({ code: 'L', net: i.ip, len: 32, ad: 0, metric: 0, nextHop: null, exitIf: i.name });
  }
  return out;
}

function staticRoutesOf(topo, dev, connected) {
  const out = [];
  for (const s of dev.cfg.staticRoutes) {
    const net = ipToInt(s.net), len = maskToLen(s.mask);
    if (net === null || len === null) continue;
    const r = { code: len === 0 ? 'S*' : 'S', net: netOf(net, len), len, ad: s.ad || 1, metric: 0, nextHop: s.nextHop ? ipToInt(s.nextHop) : null, exitIf: s.exitIf || null };
    if (r.exitIf) {
      if (!dev.cfg.interfaces[r.exitIf] || !ifUp(topo, dev, r.exitIf)) continue;
      out.push(r);
    } else if (r.nextHop !== null) {
      r._recursive = true;
      out.push(r);
    }
  }
  return out;
}

function selectBest(routes) {
  const byKey = new Map();
  for (const r of routes) {
    const key = r.net + '/' + r.len + (r.code === 'L' ? 'L' : '');
    const ex = byKey.get(key);
    if (!ex || r.ad < ex.ad || (r.ad === ex.ad && r.metric < ex.metric)) byKey.set(key, r);
  }
  return [...byKey.values()];
}

function lpm(routes, dst, exclude) {
  let best = null;
  for (const r of routes) {
    if (r === exclude) continue;
    if (inSubnet(dst, r.net, r.len) && (!best || r.len > best.len)) best = r;
  }
  return best;
}

// Все таблицы маршрутизации (кешируются по ревизии топологии)
function allRoutes(topo) {
  const rt = netRt(topo);
  if (rt.routeCache && rt.routeCache.rev === topo.rev) return rt.routeCache;
  const routers = Object.values(topo.devices).filter((d) => d.type === 'router');
  const connected = {}, statics = {};
  for (const R of routers) {
    connected[R.id] = connectedRoutesOf(topo, R);
    // статические: валидны, если next-hop достижим через connected (рекурсия ниже)
    statics[R.id] = staticRoutesOf(topo, R, connected[R.id]).filter((r) => !r._recursive || lpm(connected[R.id], r.nextHop));
  }
  const rip = computeRip(topo, connected, statics);
  const ospf = computeOspf(topo, statics);
  const tables = {};
  for (const R of routers) {
    let all = connected[R.id].concat(statics[R.id], rip[R.id] || [], ospf.routes[R.id] || []);
    // рекурсивные статические через динамические маршруты
    const pending = staticRoutesOf(topo, R, connected[R.id]).filter((r) => r._recursive && !lpm(connected[R.id], r.nextHop));
    for (const p of pending) {
      const via = lpm(all, p.nextHop);
      if (via && via.code !== 'L') all.push(p);
    }
    tables[R.id] = selectBest(all);
  }
  rt.routeCache = { rev: topo.rev, tables, ospfAdj: ospf.adj };
  return rt.routeCache;
}

function routesOf(topo, dev) { return allRoutes(topo).tables[dev.id] || []; }

// Поиск маршрута: {exitIf, nextHop, route, proxy}
function routeLookup(topo, dev, dst, depth = 0) {
  const routes = routesOf(topo, dev).filter((r) => r.code !== 'L');
  const best = lpm(routes, dst);
  if (!best) return null;
  if (best.code === 'C') return { exitIf: best.exitIf, nextHop: dst, route: best };
  if (best.nextHop === null && best.exitIf) return { exitIf: best.exitIf, nextHop: dst, route: best, proxy: true };
  if (best.exitIf) return { exitIf: best.exitIf, nextHop: best.nextHop, route: best };
  if (depth > 4) return null;
  const via = routeLookup(topo, dev, best.nextHop, depth + 1);
  if (!via) return null;
  return { exitIf: via.exitIf, nextHop: via.proxy ? best.nextHop : (via.route.code === 'C' ? best.nextHop : via.nextHop), route: best };
}

// Выход для хоста (ПК или свитч с SVI)
function hostEgress(topo, dev, dst) {
  if (dev.type === 'pc') {
    const a = ifAddr(dev, 'FastEthernet0');
    if (!a) return null;
    if (inSubnet(dst, a.ip, a.len)) return { exitIf: 'FastEthernet0', nextHop: dst };
    const gw = dev.cfg.gateway ? ipToInt(dev.cfg.gateway) : null;
    if (gw !== null && inSubnet(gw, a.ip, a.len)) return { exitIf: 'FastEthernet0', nextHop: gw };
    return null;
  }
  if (dev.type === 'switch') {
    for (const i of l3Ifaces(dev)) {
      if (!ifUp(topo, dev, i.name)) continue;
      if (inSubnet(dst, i.ip, i.len)) return { exitIf: i.name, nextHop: dst };
    }
    const gw = dev.cfg.defaultGateway ? ipToInt(dev.cfg.defaultGateway) : null;
    if (gw === null) return null;
    for (const i of l3Ifaces(dev)) {
      if (ifUp(topo, dev, i.name) && inSubnet(gw, i.ip, i.len)) return { exitIf: i.name, nextHop: gw };
    }
  }
  return null;
}

function egressFor(topo, dev, dst) {
  return dev.type === 'router' ? routeLookup(topo, dev, dst) : hostEgress(topo, dev, dst);
}

function initialTtl(dev) { return dev.type === 'pc' ? 128 : 255; }

// ---------- Доставка пакета ----------
// opts: { arp: true|false (учитывать ARP-кэш), events: [], stepRef: {v}, proto, info }
function deliver(topo, srcDevId, dstIp, ttl, opts = {}) {
  const rt = netRt(topo);
  let cur = srcDevId, inIf = null, ttlNow = ttl, first = true, hops = 0;
  const routersPassed = [];
  const fail = (code, at, from) => ({ ok: false, fail: { code, at, from }, ttl: ttlNow, routers: routersPassed });
  for (;;) {
    const D = topo.devices[cur];
    if (ownsIpUp(topo, D, dstIp)) return { ok: true, dev: cur, ifName: ownsIpUp(topo, D, dstIp), ttl: ttlNow, routers: routersPassed };
    let fromIp = null;
    if (!first) {
      if (D.type !== 'router') return fail('drop', cur);
      const a = ifAddr(D, inIf);
      fromIp = a ? a.ip : null;
      ttlNow -= 1;
      if (ttlNow <= 0) return fail('ttl', cur, fromIp);
      routersPassed.push(cur);
    }
    const eg = egressFor(topo, D, dstIp);
    if (!eg) return fail(D.type === 'router' ? 'unreachable' : 'nogw', cur, first ? null : fromIp);
    const r = arpResolve(topo, cur, eg.exitIf, eg.nextHop, eg.proxy);
    if (opts.events) recordArp(topo, opts, cur, eg, r);
    if (!r) return fail('arp', cur, first ? null : fromIp);
    let lost = false;
    if (opts.arp) {
      const cache = (rt.arp[cur] = rt.arp[cur] || {});
      const key = intToIp(eg.nextHop);
      if (!cache[key] || cache[key].mac !== r.mac) {
        cache[key] = { mac: r.mac, ifName: eg.exitIf };
        if (D.type === 'router') lost = true;
      }
      // обратная запись у получателя ARP-запроса
      const srcA = ifAddr(D, eg.exitIf);
      if (srcA) {
        const rc = (rt.arp[r.dev] = rt.arp[r.dev] || {});
        rc[intToIp(srcA.ip)] = { mac: ifMac(D, eg.exitIf), ifName: r.ifName };
      }
    }
    learnMacs(topo, r.path, ifMac(D, eg.exitIf));
    if (lost) return fail('arp-pending', cur);
    if (opts.events) recordPath(opts, r.path, opts.proto || 'ICMP', { ...(opts.info || {}), ttl: ttlNow });
    cur = r.dev; inIf = r.ifName; first = false;
    if (++hops > 64) return fail('loop', cur);
  }
}

function learnMacs(topo, path, srcMac) {
  const rt = netRt(topo);
  for (const h of path) {
    const D = topo.devices[h.to];
    if (D.type !== 'switch') continue;
    const t = (rt.mac[D.id] = rt.mac[D.id] || {});
    t[srcMac] = { vlan: h.vlan, port: h.toPort };
  }
}

function nextStep(opts) { opts.stepRef = opts.stepRef || { v: 0 }; return opts.stepRef.v; }

function recordPath(opts, path, proto, info) {
  const base = nextStep(opts);
  path.forEach((h, i) => opts.events.push({ step: base + i, proto, from: h.from, to: h.to, link: h.link, fromPort: h.fromPort, toPort: h.toPort, tag: h.tag || null, info }));
  opts.stepRef.v = base + path.length;
}

function recordArp(topo, opts, cur, eg, r) {
  const rt = netRt(topo);
  const key = intToIp(eg.nextHop);
  if (opts.arp && rt.arp[cur] && rt.arp[cur][key]) return;
  const reach = r ? r.reach : l2Reach(topo, cur, eg.exitIf);
  const base = nextStep(opts);
  const seen = new Set();
  let maxLen = 0;
  for (const x of reach) {
    x.path.forEach((h, i) => {
      const k = h.link + '>' + h.to;
      if (seen.has(k)) return;
      seen.add(k);
      opts.events.push({ step: base + i, proto: 'ARP', from: h.from, to: h.to, link: h.link, fromPort: h.fromPort, toPort: h.toPort, tag: h.tag || null, info: { kind: 'request', target: key } });
    });
    maxLen = Math.max(maxLen, x.path.length);
  }
  opts.stepRef.v = base + Math.max(1, maxLen);
  if (r) {
    const back = r.path.slice().reverse();
    const b2 = opts.stepRef.v;
    back.forEach((h, i) => opts.events.push({ step: b2 + i, proto: 'ARP', from: h.to, to: h.from, link: h.link, fromPort: h.toPort, toPort: h.fromPort, tag: h.tag || null, info: { kind: 'reply', target: key } }));
    opts.stepRef.v = b2 + back.length;
  } else {
    opts.events.push({ step: opts.stepRef.v, proto: 'ARP', from: cur, to: cur, fail: true, info: { kind: 'fail', target: key } });
    opts.stepRef.v++;
  }
}

// IP-адрес источника для пакета к dst
function sourceIpFor(topo, dev, dst) {
  if (dev.type === 'pc') { const a = ifAddr(dev, 'FastEthernet0'); return a ? a.ip : null; }
  const eg = egressFor(topo, dev, dst);
  if (!eg) return null;
  const a = ifAddr(dev, eg.exitIf);
  return a ? a.ip : null;
}

// Один ICMP echo: {status: 'reply'|'timeout'|'unreachable'|'ttl'|'noip', from, ttl}
function pingOnce(topo, srcDevId, dstIp, opts = {}) {
  const src = topo.devices[srcDevId];
  const srcIp = sourceIpFor(topo, src, dstIp);
  if (srcIp === null && !ownsIpUp(topo, src, dstIp)) {
    if (src.type === 'pc' && !ifAddr(src, 'FastEthernet0')) return { status: 'noip' };
    if (src.type === 'router') return { status: 'timeout', noRoute: true };
    return { status: 'timeout' };
  }
  const info = { type: 'Echo Request', src: intToIp(srcIp || dstIp), dst: intToIp(dstIp) };
  const req = deliver(topo, srcDevId, dstIp, initialTtl(src), { ...opts, proto: 'ICMP', info });
  if (!req.ok) {
    if (opts.events) markFail(opts, req.fail.at, req.fail.code);
    if (req.fail.code === 'unreachable' && req.fail.from !== null && req.fail.from !== undefined) {
      const back = deliver(topo, req.fail.at, srcIp, 255, { arp: opts.arp });
      if (back.ok) return { status: 'unreachable', from: intToIp(req.fail.from) };
    }
    if (req.fail.code === 'ttl' && req.fail.from !== null) {
      const back = deliver(topo, req.fail.at, srcIp, 255, { arp: opts.arp });
      if (back.ok) return { status: 'ttl', from: intToIp(req.fail.from), at: req.fail.at };
    }
    return { status: 'timeout', reason: req.fail };
  }
  const dstDev = topo.devices[req.dev];
  const info2 = { type: 'Echo Reply', src: intToIp(dstIp), dst: intToIp(srcIp) };
  const rep = deliver(topo, req.dev, srcIp, initialTtl(dstDev), { ...opts, proto: 'ICMP', info: info2 });
  if (!rep.ok) {
    if (opts.events) markFail(opts, rep.fail.at, rep.fail.code);
    return { status: 'timeout', reason: rep.fail, replyLeg: true };
  }
  return { status: 'reply', from: intToIp(dstIp), ttl: rep.ttl, hops: req.routers.length };
}

function markFail(opts, at, code) {
  opts.events.push({ step: nextStep(opts), proto: 'ICMP', from: at, to: at, fail: true, info: code ? { code } : {} });
  opts.stepRef.v++;
}

// Проверка достижимости без учёта ARP-потерь (для проверки заданий)
function canReach(topo, srcDevId, dstIp) {
  const ip = typeof dstIp === 'number' ? dstIp : ipToInt(dstIp);
  if (ip === null) return { status: 'timeout' };
  return pingOnce(topo, srcDevId, ip, { arp: false });
}

// Traceroute: [{hop, ip|null}], done
function traceroute(topo, srcDevId, dstIp, maxHops = 30) {
  const src = topo.devices[srcDevId];
  const srcIp = sourceIpFor(topo, src, dstIp);
  const hops = [];
  for (let ttl = 1; ttl <= maxHops; ttl++) {
    if (srcIp === null) { hops.push({ hop: ttl, ip: null }); break; }
    const res = deliver(topo, srcDevId, dstIp, ttl, { arp: false });
    if (res.ok) {
      const back = deliver(topo, res.dev, srcIp, initialTtl(topo.devices[res.dev]), { arp: false });
      hops.push({ hop: ttl, ip: back.ok ? intToIp(dstIp) : null, final: back.ok });
      if (back.ok) return { hops, done: true };
      continue;
    }
    if (res.fail.code === 'ttl' && res.fail.from !== null && res.fail.from !== undefined) {
      const back = deliver(topo, res.fail.at, srcIp, 255, { arp: false });
      hops.push({ hop: ttl, ip: back.ok ? intToIp(res.fail.from) : null });
      continue;
    }
    if (res.fail.code === 'unreachable' && res.fail.from !== null && res.fail.from !== undefined) {
      hops.push({ hop: ttl, ip: intToIp(res.fail.from), unreachable: true });
      return { hops, done: false, unreachable: true };
    }
    hops.push({ hop: ttl, ip: null });
  }
  return { hops, done: false };
}

// ---------- DHCP ----------
function dhcpPoolFor(router, ipInt) {
  for (const [name, p] of Object.entries(router.cfg.dhcpPools)) {
    if (!p.network || !p.mask) continue;
    const len = maskToLen(p.mask);
    if (inSubnet(ipInt, ipToInt(p.network), len)) return { name, pool: p, len };
  }
  return null;
}

function staticIpsInUse(topo) {
  const used = new Set();
  for (const d of Object.values(topo.devices)) {
    if (d.type === 'pc' && d.cfg.ipMode === 'dhcp') continue;
    for (const i of l3Ifaces(d)) used.add(i.ip);
  }
  return used;
}

function dhcpAllocate(topo, router, poolRef, mac) {
  const { pool, len } = poolRef;
  const bindings = router.cfg.dhcpBindings;
  const net = netOf(ipToInt(pool.network), len);
  const bcast = broadcastOf(net, len);
  const excluded = (ip) => router.cfg.dhcpExcluded.some((e) => ip >= ipToInt(e.start) && ip <= ipToInt(e.end || e.start));
  if (bindings[mac]) {
    const ip = ipToInt(bindings[mac]);
    if (ip !== null && inSubnet(ip, net, len) && !excluded(ip)) return ip;
    delete bindings[mac];
  }
  const bound = new Set(Object.values(bindings).map(ipToInt));
  const used = staticIpsInUse(topo);
  const own = new Set(l3Ifaces(router).map((i) => i.ip));
  const gw = pool.defaultRouter ? ipToInt(pool.defaultRouter) : null;
  for (let ip = net + 1; ip < bcast; ip++) {
    if (excluded(ip) || bound.has(ip) || ip === gw) continue;
    // как ping перед OFFER в IOS: занятый вручную адрес попадает в show ip dhcp conflict
    if (used.has(ip)) { if (!own.has(ip)) dhcpNoteConflict(topo, router, ip); continue; }
    bindings[mac] = intToIp(ip);
    return ip;
  }
  return null;
}

function dhcpNoteConflict(topo, router, ip) {
  const rt = netRt(topo);
  const m = ((rt.dhcpConflicts = rt.dhcpConflicts || {})[router.id] = rt.dhcpConflicts[router.id] || {});
  if (!m[intToIp(ip)]) m[intToIp(ip)] = Date.now();
}

// Счётчики для show ip dhcp server statistics (живут до перезагрузки страницы, как до reload роутера)
function dhcpStat(topo, router, key) {
  const rt = netRt(topo);
  const s = ((rt.dhcpStats = rt.dhcpStats || {})[router.id] = rt.dhcpStats[router.id] || { discover: 0, request: 0, release: 0, offer: 0, ack: 0 });
  s[key]++;
}

// Запрос адреса по DHCP. Возвращает {ok, ip, mask, gateway, dns, server}
function dhcpRequest(topo, pcId, opts = {}) {
  const pc = topo.devices[pcId];
  if (!pc || pc.type !== 'pc') return { ok: false };
  const mac = pc.ports[0].mac;
  if (!portPhysUp(topo, pcId, 'FastEthernet0')) return { ok: false, reason: 'link' };
  // широковещательный DISCOVER
  const reach = l2Reach(topo, pcId, 'FastEthernet0');
  if (opts.events) {
    const base = nextStep(opts);
    let maxLen = 0;
    const seen = new Set();
    for (const x of reach) {
      x.path.forEach((h, i) => {
        const k = h.link + '>' + h.to;
        if (seen.has(k)) return;
        seen.add(k);
        opts.events.push({ step: base + i, proto: 'DHCP', from: h.from, to: h.to, link: h.link, fromPort: h.fromPort, toPort: h.toPort, tag: h.tag || null, info: { type: 'DISCOVER' } });
      });
      maxLen = Math.max(maxLen, x.path.length);
    }
    opts.stepRef.v = base + Math.max(1, maxLen);
  }
  for (const r of reach) {
    const R = topo.devices[r.dev];
    if (R.type !== 'router') continue;
    const a = ifAddr(R, r.ifName);
    if (!a) continue;
    let server = null, poolRef = dhcpPoolFor(R, a.ip);
    if (Object.keys(R.cfg.dhcpPools).length) dhcpStat(topo, R, 'discover');
    if (poolRef) server = R;
    else {
      const ic = R.cfg.interfaces[r.ifName];
      for (const h of (ic.helpers || [])) {
        const hip = ipToInt(h);
        if (hip === null) continue;
        const res = deliver(topo, R.id, hip, 255, { arp: false });
        if (!res.ok) continue;
        const S = topo.devices[res.dev];
        if (S.type !== 'router') continue;
        const back = deliver(topo, S.id, a.ip, 255, { arp: false });
        if (!back.ok) continue;
        if (S !== R && Object.keys(S.cfg.dhcpPools).length) dhcpStat(topo, S, 'discover');
        poolRef = dhcpPoolFor(S, a.ip);
        if (poolRef) { server = S; break; }
      }
    }
    if (!server) continue;
    const ip = dhcpAllocate(topo, server, poolRef, mac);
    if (ip === null) continue;
    for (const k of ['offer', 'request', 'ack']) dhcpStat(topo, server, k);
    if (opts.events) {
      const back = r.path.slice().reverse();
      const b2 = opts.stepRef.v;
      back.forEach((h, i) => opts.events.push({ step: b2 + i, proto: 'DHCP', from: h.to, to: h.from, link: h.link, fromPort: h.toPort, toPort: h.fromPort, tag: h.tag || null, info: { type: 'OFFER/ACK', ip: intToIp(ip) } }));
      opts.stepRef.v = b2 + back.length;
    }
    const p = poolRef.pool;
    return { ok: true, ip: intToIp(ip), mask: p.mask, gateway: p.defaultRouter || null, dns: p.dns || null, server: server.id };
  }
  return { ok: false, reason: 'noserver' };
}

// Применить DHCP к ПК (как кнопка DHCP / ipconfig /renew)
function pcDhcpRenew(topo, pcId, opts) {
  const pc = topo.devices[pcId];
  const res = dhcpRequest(topo, pcId, opts);
  if (res.ok) {
    Object.assign(pc.cfg, { ip: res.ip, mask: res.mask, gateway: res.gateway, dns: res.dns, dhcpStatus: 'ok' });
  } else {
    const r = makeRng(parseInt(pc.ports[0].mac.replace(/\./g, '').slice(-6), 16) || 7);
    Object.assign(pc.cfg, { ip: '169.254.' + r.int(1, 254) + '.' + r.int(1, 254), mask: '255.255.0.0', gateway: null, dns: null, dhcpStatus: 'fail' });
  }
  return res;
}

function pcDhcpRelease(topo, pcId) {
  const pc = topo.devices[pcId];
  const mac = pc.ports[0].mac;
  for (const d of Object.values(topo.devices)) {
    if (d.type === 'router' && d.cfg.dhcpBindings[mac]) { delete d.cfg.dhcpBindings[mac]; dhcpStat(topo, d, 'release'); }
  }
  Object.assign(pc.cfg, { ip: '0.0.0.0', mask: '0.0.0.0', gateway: null, dns: null, dhcpStatus: 'released' });
}

function hasValidLease(pc) {
  return pc.cfg.ipMode === 'dhcp' && pc.cfg.dhcpStatus === 'ok' && pc.cfg.ip && !pc.cfg.ip.startsWith('169.254.') && pc.cfg.ip !== '0.0.0.0';
}

// Хук режима симуляции: UI возвращает {events, stepRef, done()} или null
let netSimHook = () => null;
function setNetSimHook(fn) { netSimHook = fn; }

// ---------- Фиксация изменений: ревизия, автo-DHCP, консольные сообщения ----------
function snapshotStates(topo) {
  const st = {};
  for (const d of Object.values(topo.devices)) {
    if (d.type === 'pc' || d.type === 'hub') continue;
    for (const name of Object.keys(d.cfg.interfaces)) {
      const s = ifStatus(topo, d, name);
      st[d.id + '|' + name] = s.status + '/' + s.protocol;
    }
  }
  return st;
}

function pushConsole(topo, devId, text) {
  const rt = netRt(topo);
  if (rt.capture && rt.capture.devId === devId) { rt.capture.lines.push(text); return; }
  (rt.consoles[devId] = rt.consoles[devId] || []).push(text);
  for (const fn of rt.listeners) fn(devId, text);
}

function netCommit(topo) {
  touch(topo);
  const rt = netRt(topo);
  swGuards(topo); // BPDU Guard и EtherChannel guard выключают порты до DHCP и сообщений о линках
  // ПК в режиме DHCP без адреса пытаются получить его снова
  for (const d of Object.values(topo.devices)) {
    if (d.type === 'pc' && d.cfg.ipMode === 'dhcp' && !hasValidLease(d) && d.cfg.dhcpStatus !== 'released') {
      const res = dhcpRequest(topo, d.id);
      if (res.ok) { Object.assign(d.cfg, { ip: res.ip, mask: res.mask, gateway: res.gateway, dns: res.dns, dhcpStatus: 'ok' }); touch(topo); }
    }
  }
  const now = snapshotStates(topo);
  if (rt.lastStates) {
    for (const [key, val] of Object.entries(now)) {
      const prev = rt.lastStates[key];
      if (prev === val || prev === undefined && val.startsWith('administratively')) continue;
      if (prev === undefined && val === 'down/down') continue;
      const [devId, name] = key.split('|');
      const [status, proto] = val.split('/');
      const [pStatus, pProto] = (prev || 'down/down').split('/');
      const lines = [];
      if (status !== pStatus) lines.push('%LINK-5-CHANGED: Interface ' + name + ', changed state to ' + status);
      if (proto !== pProto) lines.push('%LINEPROTO-5-UPDOWN: Line protocol on Interface ' + name + ', changed state to ' + proto);
      if (lines.length) pushConsole(topo, devId, lines.join('\n'));
    }
  }
  rt.lastStates = now;
  // OSPF-соседства
  const adj = allRoutes(topo).ospfAdj.map((a) => a.dev + '|' + a.nbrRid + '|' + a.myIf);
  if (rt.lastOspf) {
    for (const k of adj) if (!rt.lastOspf.includes(k)) {
      const [devId, rid, ifn] = k.split('|');
      const pid = topo.devices[devId].cfg.ospf.pid;
      pushConsole(topo, devId, '%OSPF-5-ADJCHG: Process ' + pid + ', Nbr ' + rid + ' on ' + ifn + ' from LOADING to FULL, Loading Done');
    }
    for (const k of rt.lastOspf) if (!adj.includes(k)) {
      const [devId, rid, ifn] = k.split('|');
      const d = topo.devices[devId];
      if (!d || !d.cfg.ospf) continue;
      pushConsole(topo, devId, '%OSPF-5-ADJCHG: Process ' + d.cfg.ospf.pid + ', Nbr ' + rid + ' on ' + ifn + ' from FULL to DOWN, Neighbor Down: Interface down or detached');
    }
  }
  rt.lastOspf = adj;
}

function netOnConsole(topo, fn) {
  const rt = netRt(topo);
  rt.listeners.push(fn);
  return () => { rt.listeners = rt.listeners.filter((f) => f !== fn); };
}
