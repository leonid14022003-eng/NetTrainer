'use strict';
// Коммутация поверх кабелей: EtherChannel (LACP, PAgP, on) и Spanning Tree (PVST+ / Rapid PVST+), защиты BPDU Guard
// и EtherChannel guard. Состояние считается заново после каждого изменения топологии (кэш по topo.rev).
// l2Reach в net.js пропускает кадры только через порты STP в состоянии FWD, а пучок EtherChannel — как один канал.
// Здесь же команды IOS и show-выводы для этих тем.

// ---------- EtherChannel ----------
const EC_PROTO = { active: 'LACP', passive: 'LACP', desirable: 'PAgP', auto: 'PAgP', on: '-' };
const EC_MODES = Object.keys(EC_PROTO);
const EC_L2_KEYS = ['mode', 'accessVlan', 'nativeVlan', 'allowed', 'nonegotiate'];

function poName(group) { return 'Port-channel' + group; }
function poGroup(name) { return Number(name.slice('Port-channel'.length)); }
function portSpeed(name) { return name.startsWith('Gigabit') ? 1000 : name.startsWith('Fast') ? 100 : 10; }
function ecMembers(sw, group) { return sw.ports.filter((p) => { const ic = sw.cfg.interfaces[p.name]; return ic && ic.channel && ic.channel.group === group; }).map((p) => p.name); }

// Согласуются ли режимы двух концов: LACP — хотя бы один active, PAgP — хотя бы один desirable, on — только с on
function ecModesOk(a, b) {
  if (EC_PROTO[a] !== EC_PROTO[b]) return false;
  if (a === 'on') return true;
  return EC_PROTO[a] === 'LACP' ? a === 'active' || b === 'active' : a === 'desirable' || b === 'desirable';
}

function ecSameL2(a, b) { return EC_L2_KEYS.every((k) => JSON.stringify(a[k]) === JSON.stringify(b[k])); }

// Флаги как в show etherchannel summary: P — в пучке, I — работает сам по себе, s — приостановлен, D — не работает;
// M — режим on, а на другой стороне не on (EtherChannel guard выключит такой порт).
function ecCompute(topo) {
  const out = {};   // devId → { groups: { g: { po, proto, up, flags: {port: flag}, partner: 'dev|group' } }, of: {port: g} }
  const cand = {};  // 'dev|port' → 'peerDev|peerGroup'
  const sws = Object.values(topo.devices).filter((d) => d.type === 'switch');
  for (const S of sws) {
    const st = { groups: {}, of: {} };
    out[S.id] = st;
    for (const p of S.ports) {
      const ic = S.cfg.interfaces[p.name];
      if (!ic || !ic.channel) continue;
      const g = ic.channel.group;
      st.of[p.name] = g;
      const G = st.groups[g] || (st.groups[g] = { po: poName(g), proto: EC_PROTO[ic.channel.mode], up: false, flags: {}, partner: null });
      const po = S.cfg.interfaces[G.po];
      let f;
      if ((po && po.shutdown) || !portPhysUp(topo, S.id, p.name)) f = 'D';
      else {
        const peer = linkPeer(topo, S.id, p.name);
        const P = topo.devices[peer.dev];
        const pic = P.type === 'switch' ? P.cfg.interfaces[peer.port] : null;
        const pm = pic && pic.channel ? pic.channel.mode : null;
        if (!pm || !ecModesOk(ic.channel.mode, pm)) f = ic.channel.mode === 'on' ? 'M' : 'I';
        else if (po && !ecSameL2(ic, po)) f = 's';
        else { f = 'C'; cand[S.id + '|' + p.name] = peer.dev + '|' + pic.channel.group; }
      }
      G.flags[p.name] = f;
    }
    // в одном пучке — порты одной скорости и к одному соседу; остальные приостанавливаются
    for (const G of Object.values(st.groups)) {
      const cs = Object.keys(G.flags).filter((n) => G.flags[n] === 'C');
      if (!cs.length) continue;
      const most = (list, key) => { const m = {}; for (const n of list) m[key(n)] = (m[key(n)] || 0) + 1; return Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]; };
      const speed = Number(most(cs, portSpeed));
      const sameSpeed = cs.filter((n) => portSpeed(n) === speed);
      G.partner = most(sameSpeed, (n) => cand[S.id + '|' + n]);
      for (const n of cs) if (portSpeed(n) !== speed || cand[S.id + '|' + n] !== G.partner) G.flags[n] = 's';
    }
  }
  // порт входит в пучок, только если другой конец тоже готов
  for (const S of sws) for (const G of Object.values(out[S.id].groups)) {
    for (const n of Object.keys(G.flags)) {
      if (G.flags[n] !== 'C') continue;
      const peer = linkPeer(topo, S.id, n);
      const pst = out[peer.dev];
      const pg = pst && pst.of[peer.port];
      const pf = pg !== undefined ? pst.groups[pg].flags[peer.port] : null;
      G.flags[n] = pf === 'C' || pf === 'P' ? 'P' : 's';
    }
    G.up = Object.values(G.flags).includes('P');
  }
  return out;
}

// Общее состояние коммутации: { ec, stp } — пересчитывается, когда меняется topo.rev
function swState(topo) {
  const rt = netRt(topo);
  if (rt.swCache && rt.swCache.rev === topo.rev) return rt.swCache;
  const cache = { rev: topo.rev, ec: ecCompute(topo), stp: {} };
  rt.swCache = cache;
  cache.stp = stpCompute(topo, cache);
  return cache;
}

function ecFlag(state, sw, port) {
  const st = state.ec[sw.id];
  const g = st && st.of[port];
  return g === undefined ? null : st.groups[g].flags[port];
}

// Логический порт: Port-channelN для порта в пучке, сам порт — если он не в канале (или I); null — порт кадры не передаёт
function swLogicalPort(state, sw, port) {
  const st = state.ec[sw.id];
  const g = st && st.of[port];
  if (g === undefined) return port;
  const f = st.groups[g].flags[port];
  return f === 'P' ? poName(g) : f === 'I' ? port : null;
}

function ecGroupState(topo, sw, group) { const st = swState(topo).ec[sw.id]; return (st && st.groups[group]) || null; }

// Порт, по которому судят о режиме (trunk / access) логического порта: для пучка — первый порт в нём
function swRepPort(topo, sw, lp) {
  if (ifKind(lp) !== 'po') return lp;
  const G = ecGroupState(topo, sw, poGroup(lp));
  const ms = G ? Object.keys(G.flags) : ecMembers(sw, poGroup(lp));
  return (G && ms.find((m) => G.flags[m] === 'P')) || ms[0] || lp;
}
function ecPoUp(topo, sw, po) { const G = ecGroupState(topo, sw, poGroup(po)); return !!(G && G.up); }

// Настройки switchport, введённые на Port-channel, IOS переносит на все порты пучка
function ecSyncMembers(sw, list) {
  for (const { name, ic } of list) {
    if (ifKind(name) !== 'po') continue;
    for (const m of ecMembers(sw, poGroup(name))) for (const k of EC_L2_KEYS) sw.cfg.interfaces[m][k] = JSON.parse(JSON.stringify(ic[k]));
  }
}

function ecNewPo(sw, fromPort) {
  const src = sw.cfg.interfaces[fromPort];
  const po = { shutdown: false, description: '', mode: 'dynamic auto', accessVlan: 1, nativeVlan: 1, allowed: 'all', nonegotiate: false };
  if (src) for (const k of EC_L2_KEYS) po[k] = JSON.parse(JSON.stringify(src[k]));
  return po;
}

// ---------- Spanning Tree ----------
const STP_PRIO_DEFAULT = 32768;
function stpPrio(sw, v) { const p = sw.cfg.stpPrio && sw.cfg.stpPrio[v]; return p === undefined ? STP_PRIO_DEFAULT : p; }
function swBaseMac(sw) { return sw.ports[0].mac; }
function stpBid(sw, v) { return { prio: stpPrio(sw, v) + v, mac: swBaseMac(sw) }; }
function macVal(mac) { return parseInt(mac.replace(/\./g, ''), 16); }
function bidLess(a, b) { return a.prio !== b.prio ? a.prio < b.prio : macVal(a.mac) < macVal(b.mac); }
function stpPortNum(sw, lp) { return lp.startsWith('Port-channel') ? 64 + poGroup(lp) : sw.ports.findIndex((p) => p.name === lp) + 1; }
function stpPortPrio(sw, lp) { const ic = sw.cfg.interfaces[lp]; return ic && ic.stpPortPrio !== undefined ? ic.stpPortPrio : 128; }
function stpPid(sw, lp) { return stpPortPrio(sw, lp) * 1000 + stpPortNum(sw, lp); }

// Сравнение кортежей: числа и Bridge ID
function stpLess(a, b) {
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (typeof x === 'object') { if (bidLess(x, y)) return true; if (bidLess(y, x)) return false; continue; }
    if (x !== y) return x < y;
  }
  return false;
}

// Стоимость порта (короткий метод IEEE): 100 Мбит/с — 19, 1 Гбит/с — 4; у пучка — меньше
function stpCostOf(sw, p) {
  const ic = sw.cfg.interfaces[p.lp];
  if (ic && ic.stpCost) return ic.stpCost;
  const sp = portSpeed(p.members[0]), n = p.members.length;
  if (sp >= 1000) return n >= 3 ? 2 : n === 2 ? 3 : 4;
  if (sp >= 100) return n >= 3 ? 9 : n === 2 ? 12 : 19;
  return 100;
}

// Логические порты STP коммутатора: пучки целиком и отдельные работающие порты
function stpPorts(topo, state, sw) {
  const out = [];
  const st = state.ec[sw.id];
  if (st) for (const G of Object.values(st.groups)) {
    if (!G.up) continue;
    const members = Object.keys(G.flags).filter((n) => G.flags[n] === 'P');
    const [pdev, pg] = G.partner.split('|');
    out.push({ lp: G.po, rep: members[0], members, peer: { dev: pdev, lp: poName(Number(pg)) }, kind: 'p2p' });
  }
  for (const p of sw.ports) {
    if (p.console || !portPhysUp(topo, sw.id, p.name)) continue;
    if (swLogicalPort(state, sw, p.name) !== p.name) continue;
    const peer = linkPeer(topo, sw.id, p.name);
    const P = topo.devices[peer.dev];
    const pl = P.type === 'switch' ? swLogicalPort(state, P, peer.port) : null;
    out.push({ lp: p.name, rep: p.name, members: [p.name], peer: pl ? { dev: P.id, lp: pl } : null, kind: P.type === 'hub' ? 'shared' : P.type === 'switch' ? 'p2p' : 'edge' });
  }
  return out;
}

// PVST+: для каждого VLAN — корень, стоимость пути до него, роли и состояния портов
function stpCompute(topo, state) {
  const sws = Object.values(topo.devices).filter((d) => d.type === 'switch' && !d.off);
  const all = {};
  for (const S of sws) all[S.id] = stpPorts(topo, state, S);
  const vlans = new Set();
  for (const S of sws) for (const v of Object.keys(S.cfg.vlans)) vlans.add(Number(v));
  const res = {};
  for (const v of [...vlans].sort((a, b) => a - b)) {
    const inV = sws.filter((S) => S.cfg.vlans[v]);
    const lps = {};
    for (const S of inV) lps[S.id] = all[S.id].filter((p) => swEgressTag(topo, S, p.rep, v) !== undefined);
    const find = (devId, lp) => (lps[devId] || []).find((x) => x.lp === lp);
    const nb = (p) => { if (!p.peer) return null; const q = find(p.peer.dev, p.peer.lp); return q ? { dev: topo.devices[p.peer.dev], port: q } : null; };
    res[v] = {};
    const seen = new Set();
    for (const start of inV) {
      if (seen.has(start.id)) continue;
      const comp = [], queue = [start];
      seen.add(start.id);
      while (queue.length) {
        const S = queue.shift();
        comp.push(S);
        for (const p of lps[S.id]) { const n = nb(p); if (n && !seen.has(n.dev.id)) { seen.add(n.dev.id); queue.push(n.dev); } }
      }
      const bid = {};
      for (const S of comp) bid[S.id] = stpBid(S, v);
      let root = comp[0];
      for (const S of comp) if (bidLess(bid[S.id], bid[root.id])) root = S;
      // стоимость до корня: сумма стоимостей входящих портов (Дейкстра)
      const rpc = { [root.id]: 0 }, fixed = new Set();
      for (;;) {
        let cur = null;
        for (const S of comp) if (!fixed.has(S.id) && rpc[S.id] !== undefined && (!cur || rpc[S.id] < rpc[cur.id])) cur = S;
        if (!cur) break;
        fixed.add(cur.id);
        for (const p of lps[cur.id]) {
          const n = nb(p);
          if (!n) continue;
          const c = rpc[cur.id] + stpCostOf(n.dev, n.port);
          if (rpc[n.dev.id] === undefined || c < rpc[n.dev.id]) rpc[n.dev.id] = c;
        }
      }
      // корневой порт: меньшая стоимость → меньший Bridge ID соседа → меньший Port ID соседа → меньший свой Port ID
      for (const S of comp) {
        let best = null;
        if (S !== root) for (const p of lps[S.id]) {
          const n = nb(p);
          if (!n) continue;
          const key = [rpc[n.dev.id] + stpCostOf(S, p), bid[n.dev.id], stpPid(n.dev, n.port.lp), stpPid(S, p.lp)];
          if (!best || stpLess(key, best.key)) best = { key, lp: p.lp };
        }
        res[v][S.id] = { root: root.id, rootBid: bid[root.id], bid: bid[S.id], rpc: rpc[S.id], rootPort: best ? best.lp : null, ports: {} };
      }
      // назначенный порт сегмента — у той стороны, что ближе к корню; остальные — Alternate (BLK)
      for (const S of comp) {
        const info = res[v][S.id];
        for (const p of lps[S.id]) {
          const n = nb(p);
          let role = 'Desg';
          if (p.lp === info.rootPort) role = 'Root';
          else if (n && !stpLess([rpc[S.id], bid[S.id], stpPid(S, p.lp)], [rpc[n.dev.id], bid[n.dev.id], stpPid(n.dev, n.port.lp)])) role = 'Altn';
          const ic = S.cfg.interfaces[p.lp] || {};
          const edge = ic.portfast || (S.cfg.portfastDefault && swOperMode(topo, S, p.rep) === 'access');
          info.ports[p.lp] = { role, sts: role === 'Altn' ? 'BLK' : 'FWD', cost: stpCostOf(S, p), pid: stpPortPrio(S, p.lp) + '.' + stpPortNum(S, p.lp),
            type: p.kind === 'shared' ? 'Shr' : edge ? 'P2p Edge' : 'P2p' };
        }
      }
    }
  }
  return res;
}

function stpBlocks(state, sw, lp, v) {
  const x = state.stp[v] && state.stp[v][sw.id];
  const p = x && x.ports[lp];
  return !!(p && p.sts === 'BLK');
}

// Корень VLAN для коммутатора (id устройства) или null
function stpRootOf(topo, swId, v) { const x = swState(topo).stp[v]; return x && x[swId] ? x[swId].root : null; }
function stpPortInfo(topo, swId, lp, v) { const x = swState(topo).stp[v]; return (x && x[swId] && x[swId].ports[lp]) || null; }

// Индикатор порта на схеме: оранжевый, если линк есть, но кадры не идут (STP BLK, порт пучка приостановлен)
function swPortLed(topo, sw, port) {
  const state = swState(topo);
  const lp = swLogicalPort(state, sw, port);
  if (!lp) return 'blocked';
  let any = false, fwd = false;
  for (const v of Object.keys(state.stp)) {
    const x = state.stp[v][sw.id];
    const p = x && x.ports[lp];
    if (!p) continue;
    any = true;
    if (p.sts === 'FWD') fwd = true;
  }
  return any && !fwd ? 'blocked' : null;
}

// ---------- Защиты: BPDU Guard и EtherChannel guard (порт → err-disabled до shutdown / no shutdown) ----------
function swBpduGuardOn(sw, ic, port, topo) {
  if (ic.bpduguard === true) return true;
  if (ic.bpduguard === false || !sw.cfg.bpduguardDefault) return false;
  return !!ic.portfast || (!!sw.cfg.portfastDefault && swOperMode(topo, sw, port) === 'access');
}

function swGuards(topo) {
  const sws = () => Object.values(topo.devices).filter((d) => d.type === 'switch' && !d.off);
  for (let round = 0; round < 3; round++) {
    const state = swState(topo);
    const hits = [];
    for (const S of sws()) for (const p of S.ports) {
      const ic = S.cfg.interfaces[p.name];
      if (!ic || ic.errdis || p.console || !portPhysUp(topo, S.id, p.name)) continue;
      const peer = linkPeer(topo, S.id, p.name);
      if (swBpduGuardOn(S, ic, p.name, topo) && topo.devices[peer.dev].type === 'switch') hits.push([S, p.name, 'bpduguard']);
      else if (ecFlag(state, S, p.name) === 'M') hits.push([S, p.name, 'channel-misconfig']);
    }
    if (!hits.length) return;
    for (const [S, n, why] of hits) {
      const ic = S.cfg.interfaces[n];
      ic.errdis = why;
      const sn = ifShort(n);
      pushConsole(topo, S.id, why === 'bpduguard'
        ? '%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port ' + n + ' with BPDU Guard enabled. Disabling port.\n%PM-4-ERR_DISABLE: bpduguard error detected on ' + sn + ', putting ' + sn + ' in err-disable state'
        : '%PM-4-ERR_DISABLE: channel-misconfig (STP) error detected on Po' + ic.channel.group + ', putting ' + sn + ' in err-disable state');
    }
    touch(topo);
  }
}

// ---------- show-выводы ----------
function stpProto(sw) { return sw.cfg.stpMode === 'rapid-pvst' ? 'rstp' : 'ieee'; }

function iosShowStp(topo, dev, only) {
  const state = swState(topo);
  const vlans = Object.keys(state.stp).map(Number).filter((v) => state.stp[v][dev.id] && Object.keys(state.stp[v][dev.id].ports).length && (only === undefined || v === only));
  if (!vlans.length) return only === undefined ? 'No spanning tree instance exists.' : 'Spanning tree instance(s) for vlan ' + only + ' does not exist.';
  const out = [];
  for (const v of vlans) {
    const x = state.stp[v][dev.id];
    const hello = '             Hello Time  2 sec  Max Age 20 sec  Forward Delay 15 sec';
    out.push('VLAN' + String(v).padStart(4, '0'), '  Spanning tree enabled protocol ' + stpProto(dev),
      '  Root ID    Priority    ' + x.rootBid.prio, '             Address     ' + x.rootBid.mac);
    if (x.root === dev.id) out.push('             This bridge is the root');
    else out.push('             Cost        ' + x.rpc, '             Port        ' + stpPortNum(dev, x.rootPort) + '(' + x.rootPort + ')');
    out.push(hello, '', '  Bridge ID  Priority    ' + x.bid.prio + '  (priority ' + stpPrio(dev, v) + ' sys-id-ext ' + v + ')', '             Address     ' + x.bid.mac, hello,
      '             Aging Time  300 sec', '', 'Interface        Role Sts Cost      Prio.Nbr Type', '---------------- ---- --- --------- -------- --------------------------------');
    const names = Object.keys(x.ports).sort((a, b) => stpPortNum(dev, a) - stpPortNum(dev, b));
    for (const n of names) {
      const p = x.ports[n];
      out.push(padR(ifShort(n), 17) + padR(p.role, 5) + padR(p.sts, 4) + padR(p.cost, 10) + padR(p.pid, 9) + p.type);
    }
    out.push('');
  }
  return out.join('\n').replace(/\n+$/, '');
}

function iosShowStpSummary(topo, dev) {
  const state = swState(topo);
  const vlans = Object.keys(state.stp).map(Number).filter((v) => state.stp[v][dev.id] && Object.keys(state.stp[v][dev.id].ports).length);
  const rootFor = vlans.filter((v) => state.stp[v][dev.id].root === dev.id).map((v) => 'VLAN' + String(v).padStart(4, '0'));
  const out = ['Switch is in ' + (dev.cfg.stpMode || 'pvst') + ' mode', 'Root bridge for: ' + (rootFor.length ? rootFor.join(', ') : 'none'),
    'Extended system ID           is enabled', 'Portfast Default             is ' + (dev.cfg.portfastDefault ? 'enabled' : 'disabled'),
    'PortFast BPDU Guard Default  is ' + (dev.cfg.bpduguardDefault ? 'enabled' : 'disabled'), 'EtherChannel misconfig guard is enabled', '',
    'Name                   Blocking Listening Learning Forwarding STP Active', '---------------------- -------- --------- -------- ---------- ----------'];
  let tb = 0, tf = 0;
  for (const v of vlans) {
    const ps = Object.values(state.stp[v][dev.id].ports);
    const b = ps.filter((p) => p.sts === 'BLK').length, f = ps.length - b;
    tb += b; tf += f;
    out.push(padR('VLAN' + String(v).padStart(4, '0'), 23) + padR(b, 9) + padR(0, 10) + padR(0, 9) + padR(f, 11) + ps.length);
  }
  out.push('---------------------- -------- --------- -------- ---------- ----------', padR(vlans.length + ' vlans', 23) + padR(tb, 9) + padR(0, 10) + padR(0, 9) + padR(tf, 11) + (tb + tf));
  return out.join('\n');
}

function iosShowEtherchannel(topo, dev) {
  const st = swState(topo).ec[dev.id];
  const groups = st ? Object.keys(st.groups).map(Number).sort((a, b) => a - b) : [];
  const out = ['Flags:  D - down        P - in port-channel', '        I - stand-alone s - suspended', '        H - Hot-standby (LACP only)', '        R - Layer3      S - Layer2',
    '        U - in use      f - failed to allocate aggregator', '        u - unsuitable for bundling', '        w - waiting to be aggregated', '        d - default port', '', '',
    'Number of channel-groups in use: ' + groups.length, 'Number of aggregators:           ' + groups.length, '',
    'Group  Port-channel  Protocol    Ports', '------+-------------+-----------+----------------------------------------------', ''];
  for (const g of groups) {
    const G = st.groups[g];
    const ports = Object.keys(G.flags).sort((a, b) => stpPortNum(dev, a) - stpPortNum(dev, b)).map((n) => ifShort(n) + '(' + (G.flags[n] === 'M' ? 'D' : G.flags[n]) + ')');
    out.push(padR(g, 7) + padR('Po' + g + '(S' + (G.up ? 'U' : 'D') + ')', 18) + padR(G.proto, 7) + ports.join(' '));
  }
  return out.join('\n');
}

// ---------- running-config ----------
function swRunningGlobal(cfg) {
  const L = [];
  if (cfg.portfastDefault) L.push('spanning-tree portfast default');
  if (cfg.bpduguardDefault) L.push('spanning-tree portfast bpduguard default');
  for (const v of Object.keys(cfg.stpPrio || {}).map(Number).sort((a, b) => a - b)) L.push('spanning-tree vlan ' + v + ' priority ' + cfg.stpPrio[v]);
  if (cfg.ecLb) L.push('port-channel load-balance ' + cfg.ecLb);
  return L;
}

function swRunningIf(ic) {
  const L = [];
  if (ic.channel) L.push(' channel-group ' + ic.channel.group + ' mode ' + ic.channel.mode);
  if (ic.stpCost) L.push(' spanning-tree cost ' + ic.stpCost);
  if (ic.stpPortPrio !== undefined) L.push(' spanning-tree port-priority ' + ic.stpPortPrio);
  if (ic.bpduguard === true) L.push(' spanning-tree bpduguard enable');
  if (ic.bpduguard === false) L.push(' spanning-tree bpduguard disable');
  return L;
}

// ---------- Команды IOS ----------
const STP_PRIO_LIST = '% Bridge Priority must be in increments of 4096.\n% Allowed values are:\n  0     4096  8192  12288 16384 20480 24576 28672\n  32768 36864 40960 45056 49152 53248 57344 61440';

function stpSetPrio(c, vlans, prio) {
  c.cfg.stpPrio = c.cfg.stpPrio || {};
  for (const v of vlans) { if (prio === null) delete c.cfg.stpPrio[v]; else c.cfg.stpPrio[v] = prio; }
}

iosDef(['config'], 'spanning-tree vlan <vlans> priority <num>', (c) => {
  const prio = c.p[1];
  if (prio > 61440 || prio % 4096) { c.out(STP_PRIO_LIST); return; }
  stpSetPrio(c, c.p[0], prio);
}, { dev: 'switch' });
iosDef(['config'], 'no spanning-tree vlan <vlans> priority', (c) => stpSetPrio(c, c.p[0], null), { dev: 'switch' });
iosDef(['config'], 'no spanning-tree vlan <vlans> root', (c) => stpSetPrio(c, c.p[0], null), { dev: 'switch' });
// root primary: 24576 или на 4096 меньше нынешнего корня; root secondary: 28672 (в конфигурации — обычная priority)
iosDef(['config'], 'spanning-tree vlan <vlans> root primary', (c) => {
  for (const v of c.p[0]) {
    const rootId = stpRootOf(c.topo, c.dev.id, v);
    const R = rootId && c.topo.devices[rootId];
    const rp = R ? stpPrio(R, v) : STP_PRIO_DEFAULT;
    let prio = 24576;
    if (R && R !== c.dev && rp <= 24576) prio = rp - 4096;
    if (R === c.dev && rp <= 24576) prio = rp;
    if (prio < 0) { c.out('% Failed to make the bridge root for vlan ' + v); continue; }
    stpSetPrio(c, [v], prio);
  }
}, { dev: 'switch' });
iosDef(['config'], 'spanning-tree vlan <vlans> root secondary', (c) => stpSetPrio(c, c.p[0], 28672), { dev: 'switch' });
iosDef(['config'], 'spanning-tree portfast default', (c) => {
  c.cfg.portfastDefault = true;
  c.out('%Warning: this command enables portfast by default on all interfaces. You\n should now disable portfast explicitly on switched ports leading to hubs,\n switches and bridges as they may create temporary bridging loops.');
}, { dev: 'switch' });
iosDef(['config'], 'no spanning-tree portfast default', (c) => { c.cfg.portfastDefault = false; }, { dev: 'switch' });
iosDef(['config'], 'spanning-tree portfast bpduguard default', (c) => { c.cfg.bpduguardDefault = true; }, { dev: 'switch' });
iosDef(['config'], 'no spanning-tree portfast bpduguard default', (c) => { c.cfg.bpduguardDefault = false; }, { dev: 'switch' });
for (const lb of ['src-mac', 'dst-mac', 'src-dst-mac', 'src-ip', 'dst-ip', 'src-dst-ip']) {
  iosDef(['config'], 'port-channel load-balance ' + lb, (c) => { c.cfg.ecLb = lb === 'src-mac' ? null : lb; }, { dev: 'switch' });
}

// channel-group на физических портах; Port-channel создаётся сам
for (const mode of EC_MODES) {
  iosDef(['if', 'range'], 'channel-group <num> mode ' + mode, (c) => {
    const g = c.p[0];
    const list = iosIfaces(c);
    if (g < 1 || g > 64 || list.some((x) => ifKind(x.name) !== 'phys')) { c.out(iosInvalidHere(c)); return; }
    const other = ecMembers(c.dev, g).map((n) => c.cfg.interfaces[n].channel.mode).find((m) => EC_PROTO[m] !== EC_PROTO[mode]);
    if (other) { c.out('% Port-channel' + g + ' already uses ' + (EC_PROTO[other] === '-' ? 'mode on' : EC_PROTO[other]) + ' — use the same protocol on all its ports.'); return; }
    const po = poName(g);
    if (!c.cfg.interfaces[po]) { c.cfg.interfaces[po] = ecNewPo(c.dev, list[0].name); c.out('Creating a port-channel interface Port-channel ' + g); }
    for (const { ic } of list) ic.channel = { group: g, mode };
  }, { dev: 'switch' });
}
iosDef(['if', 'range'], 'no channel-group', (c) => { for (const { ic } of iosIfaces(c)) delete ic.channel; }, { dev: 'switch' });
iosDef(['if', 'range'], 'channel-protocol lacp', () => {}, { dev: 'switch' });
iosDef(['if', 'range'], 'channel-protocol pagp', () => {}, { dev: 'switch' });

// spanning-tree на интерфейсах (физических и Port-channel)
const STPIF = (pattern, fn) => iosDef(['if', 'range'], pattern, (c) => { const l = iosSwPorts(c); if (l) fn(c, l); }, { dev: 'switch' });
STPIF('spanning-tree cost <num>', (c, l) => {
  if (c.p[0] < 1 || c.p[0] > 200000000) { c.out(iosInvalidHere(c)); return; }
  l.forEach(({ ic }) => { ic.stpCost = c.p[0]; });
});
STPIF('no spanning-tree cost', (c, l) => l.forEach(({ ic }) => { delete ic.stpCost; }));
STPIF('spanning-tree port-priority <num>', (c, l) => {
  if (c.p[0] > 240 || c.p[0] % 16) { c.out('% Port Priority in increments of 16 is required\n% Allowed values are:\n  0   16  32  48  64  80  96  112 128 144 160 176 192 208 224 240'); return; }
  l.forEach(({ ic }) => { ic.stpPortPrio = c.p[0]; });
});
STPIF('no spanning-tree port-priority', (c, l) => l.forEach(({ ic }) => { delete ic.stpPortPrio; }));
STPIF('spanning-tree bpduguard enable', (c, l) => l.forEach(({ ic }) => { ic.bpduguard = true; }));
STPIF('spanning-tree bpduguard disable', (c, l) => l.forEach(({ ic }) => { ic.bpduguard = false; }));
STPIF('no spanning-tree bpduguard', (c, l) => l.forEach(({ ic }) => { delete ic.bpduguard; }));
STPIF('no spanning-tree portfast', (c, l) => l.forEach(({ ic }) => { ic.portfast = false; }));
STPIF('spanning-tree link-type point-to-point', () => {});

SHOW('spanning-tree', (c) => c.out(iosShowStp(c.topo, c.dev)), { dev: 'switch' });
SHOW('spanning-tree vlan <num>', (c) => c.out(iosShowStp(c.topo, c.dev, c.p[0])), { dev: 'switch' });
SHOW('spanning-tree summary', (c) => c.out(iosShowStpSummary(c.topo, c.dev)), { dev: 'switch' });
SHOW('etherchannel summary', (c) => c.out(iosShowEtherchannel(c.topo, c.dev)), { dev: 'switch' });
SHOW('etherchannel load-balance', (c) => c.out('EtherChannel Load-Balancing Configuration:\n        ' + (c.cfg.ecLb || 'src-mac')), { dev: 'switch' });

Object.assign(IOS_HELP, {
  etherchannel: 'EtherChannel information', summary: 'One-line summary per channel-group', 'channel-group': 'Etherchannel/port bundling configuration',
  'channel-protocol': 'Select the channel protocol (LACP, PAgP)', 'port-channel': 'Ethernet Channel of interfaces', 'load-balance': 'Load Balancing method',
  active: 'Enable LACP unconditionally', passive: 'Enable LACP only if a LACP device is detected', desirable: 'Enable PAgP unconditionally',
  auto: 'Enable PAgP only if a PAgP device is detected', on: 'Enable Etherchannel only', lacp: 'Prepare interface for LACP protocol', pagp: 'Prepare interface for PAgP protocol',
  priority: 'Set the bridge priority for the spanning tree', root: 'Configure switch as root', primary: 'Configure this switch as primary root for this spanning tree',
  secondary: 'Configure switch as secondary root', cost: 'Change an interface\'s spanning tree port path cost', 'port-priority': 'Change an interface\'s spanning tree port priority',
  portfast: 'Spanning tree portfast options', bpduguard: 'Don\'t accept BPDUs on this interface',
  'rapid-pvst': 'Per-Vlan rapid spanning tree mode', pvst: 'Per-Vlan spanning tree mode', 'link-type': 'Specify a link type for spanning tree protocol use',
});
