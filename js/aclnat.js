'use strict';
// ACL (стандартные и расширенные, нумерованные и именованные) и NAT (static, dynamic, PAT) — как в Cisco IOS / Packet Tracer:
// модель, проверка пакетов на интерфейсах (deliver в net.js вызывает aclPass, natInbound, natOutbound),
// команды IOS, show-выводы, строки running-config, вход на устройство по telnet / ssh с ПК (VTY + access-class).

// ================= ACL =================
const ACL_PORT_NUM = { www: 80, http: 80, ftp: 21, 'ftp-data': 20, telnet: 23, smtp: 25, domain: 53, pop3: 110, tftp: 69, snmp: 161, ntp: 123, bootps: 67, bootpc: 68, echo: 7 };
const ACL_PORT_NAME = { tcp: { 80: 'www', 21: 'ftp', 20: 'ftp-data', 23: 'telnet', 25: 'smtp', 53: 'domain', 110: 'pop3' }, udp: { 53: 'domain', 69: 'tftp', 161: 'snmp', 123: 'ntp', 67: 'bootps', 68: 'bootpc' } };
const ACL_PROTOS = ['ip', 'tcp', 'udp', 'icmp', 'ospf', 'eigrp', 'gre', 'esp', 'ahp'];
const ACL_ICMP_TYPES = ['echo', 'echo-reply', 'unreachable', 'time-exceeded'];

function aclKindOfNumber(n) {
  if ((n >= 1 && n <= 99) || (n >= 1300 && n <= 1999)) return 'std';
  if ((n >= 100 && n <= 199) || (n >= 2000 && n <= 2699)) return 'ext';
  return null;
}
function aclGet(cfg, name) { return (cfg.acls && cfg.acls[String(name)]) || null; }
function aclEnsure(cfg, name, kind, named) {
  cfg.acls = cfg.acls || {};
  const k = String(name);
  if (!cfg.acls[k]) cfg.acls[k] = { kind, named: !!named, entries: [] };
  return cfg.acls[k];
}
function aclRules(acl) { return acl ? acl.entries.filter((e) => e.act !== 'remark') : []; }

// Разбор адреса: any | host A | A [W]. needWild — в расширенном ACL wildcard обязателен.
function aclParseAddr(toks, i, needWild) {
  const t = (toks[i] || '').toLowerCase();
  if (t === 'any') return { a: { any: true }, i: i + 1 };
  if (t === 'host') {
    if (!isIp(toks[i + 1] || '')) return { err: i + 1 };
    return { a: { ip: ipToInt(toks[i + 1]), wild: 0 }, i: i + 2 };
  }
  if (!isIp(toks[i] || '')) return { err: i };
  const ip = ipToInt(toks[i]);
  if (isIp(toks[i + 1] || '')) {
    const wild = ipToInt(toks[i + 1]);
    return { a: { ip: (ip & ~wild) >>> 0, wild }, i: i + 2 };
  }
  if (needWild) return { err: i + 1, incomplete: i + 1 >= toks.length };
  return { a: { ip, wild: 0 }, i: i + 1 };
}
function aclPortVal(s) {
  if (/^\d+$/.test(s)) { const n = Number(s); return n <= 65535 ? n : null; }
  const n = ACL_PORT_NUM[String(s).toLowerCase()];
  return n === undefined ? null : n;
}
function aclParsePort(toks, i) {
  const op = (toks[i] || '').toLowerCase();
  if (!['eq', 'neq', 'gt', 'lt', 'range'].includes(op)) return { i };
  const a = aclPortVal(toks[i + 1] || '');
  if (a === null) return { err: i + 1 };
  if (op !== 'range') return { p: { op, a }, i: i + 2 };
  const b = aclPortVal(toks[i + 2] || '');
  if (b === null) return { err: i + 2 };
  return { p: { op, a, b }, i: i + 3 };
}

// Разбор строки ACE (без "access-list N" и без номера строки): permit|deny … — {e} или {err: индекс токена}
function aclParseAce(toks, kind) {
  const act = (toks[0] || '').toLowerCase();
  if (act !== 'permit' && act !== 'deny') return { err: 0 };
  if (kind === 'std') {
    if (toks.length < 2) return { err: 1, incomplete: true };
    const s = aclParseAddr(toks, 1, false);
    if (s.err !== undefined) return { err: s.err };
    let i = s.i;
    let log = false;
    if ((toks[i] || '').toLowerCase() === 'log') { log = true; i++; }
    if (i < toks.length) return { err: i };
    return { e: { act, src: s.a, log } };
  }
  const proto = (toks[1] || '').toLowerCase();
  if (!toks[1]) return { err: 1, incomplete: true };
  if (!ACL_PROTOS.includes(proto) && !/^\d+$/.test(proto)) return { err: 1 };
  const s = aclParseAddr(toks, 2, true);
  if (s.err !== undefined) return { err: s.err, incomplete: s.incomplete || s.err >= toks.length };
  let i = s.i, sp = null, dp = null;
  if (proto === 'tcp' || proto === 'udp') { const r = aclParsePort(toks, i); if (r.err !== undefined) return { err: r.err }; sp = r.p || null; i = r.i; }
  if (i >= toks.length) return { err: i, incomplete: true };
  const d = aclParseAddr(toks, i, true);
  if (d.err !== undefined) return { err: d.err, incomplete: d.incomplete || d.err >= toks.length };
  i = d.i;
  if (proto === 'tcp' || proto === 'udp') { const r = aclParsePort(toks, i); if (r.err !== undefined) return { err: r.err }; dp = r.p || null; i = r.i; }
  let est = false, icmp = null, log = false;
  while (i < toks.length) {
    const w = toks[i].toLowerCase();
    if (w === 'established' && proto === 'tcp' && !est) { est = true; i++; continue; }
    if (proto === 'icmp' && !icmp && ACL_ICMP_TYPES.includes(w)) { icmp = w; i++; continue; }
    if (w === 'log' && !log) { log = true; i++; continue; }
    return { err: i };
  }
  return { e: { act, proto, src: s.a, sp, dst: d.a, dp, est, icmp, log } };
}

// Текст ACE так, как его показывают show access-lists и running-config
function aclAddrText(a) { return a.any ? 'any' : a.wild === 0 ? 'host ' + intToIp(a.ip) : intToIp(a.ip) + ' ' + intToIp(a.wild); }
function aclPortText(proto, p) {
  if (!p) return '';
  const nm = (n) => (ACL_PORT_NAME[proto] && ACL_PORT_NAME[proto][n]) || String(n);
  return ' ' + p.op + ' ' + nm(p.a) + (p.op === 'range' ? ' ' + nm(p.b) : '');
}
function aclAceText(e, kind) {
  if (e.act === 'remark') return 'remark ' + e.text;
  if (kind === 'std') return e.act + ' ' + aclAddrText(e.src) + (e.log ? ' log' : '');
  return e.act + ' ' + e.proto + ' ' + aclAddrText(e.src) + aclPortText(e.proto, e.sp) + ' ' + aclAddrText(e.dst) + aclPortText(e.proto, e.dp)
    + (e.icmp ? ' ' + e.icmp : '') + (e.est ? ' established' : '') + (e.log ? ' log' : '');
}

function aclAddrMatch(a, ip) { return a.any || ip === undefined || ip === null ? !!a.any : ((ip ^ a.ip) & ~a.wild) >>> 0 === 0; }
function aclPortMatch(p, v) {
  if (!p) return true;
  if (v === undefined || v === null) return false;
  if (p.op === 'eq') return v === p.a;
  if (p.op === 'neq') return v !== p.a;
  if (p.op === 'gt') return v > p.a;
  if (p.op === 'lt') return v < p.a;
  return v >= p.a && v <= p.b;
}
function aclAceMatch(e, kind, pkt) {
  if (kind === 'std') return aclAddrMatch(e.src, pkt.src);
  if (e.proto !== 'ip' && e.proto !== pkt.proto) return false;
  if (!aclAddrMatch(e.src, pkt.src) || !aclAddrMatch(e.dst, pkt.dst)) return false;
  if (e.proto === 'tcp' || e.proto === 'udp') {
    if (!aclPortMatch(e.sp, pkt.sport) || !aclPortMatch(e.dp, pkt.dport)) return false;
    if (e.est && !pkt.est) return false;
  }
  if (e.icmp) {
    const t = pkt.icmp === 'error' ? 'unreachable' : pkt.icmp;
    if (t !== e.icmp) return false;
  }
  return true;
}

// Проверка ACL: первая совпавшая строка решает; в конце — неявный deny any. Пустой или несуществующий ACL пропускает всё.
// count — увеличить счётчик совпадений (show access-lists: "(N match(es))").
function aclEval(topo, dev, name, pkt, count) {
  const acl = aclGet(dev.cfg, name);
  const rules = aclRules(acl);
  if (!rules.length) return { permit: true, empty: true };
  for (const e of rules) {
    if (!aclAceMatch(e, acl.kind, pkt)) continue;
    if (count) {
      const rt = netRt(topo);
      const d = ((rt.aclHits = rt.aclHits || {})[dev.id] = rt.aclHits[dev.id] || {});
      const a = (d[String(name)] = d[String(name)] || {});
      a[e.seq] = (a[e.seq] || 0) + 1;
    }
    return { permit: e.act === 'permit', seq: e.seq };
  }
  return { permit: false, implicit: true };
}

function aclPass(topo, dev, ifName, dir, pkt, opts) {
  if (dev.type !== 'router' || !dev.cfg.interfaces) return true;
  const ic = dev.cfg.interfaces[ifName];
  const name = ic && (dir === 'in' ? ic.aclIn : ic.aclOut);
  if (!name) return true;
  return aclEval(topo, dev, name, pkt, !(opts && opts.probe)).permit;
}

// ---------- show access-lists ----------
function aclSortedNames(cfg) {
  const names = Object.keys(cfg.acls || {});
  const num = names.filter((n) => /^\d+$/.test(n)).sort((a, b) => Number(a) - Number(b));
  return num.concat(names.filter((n) => !/^\d+$/.test(n)).sort());
}
function iosShowAccessLists(topo, dev, only) {
  const cfg = dev.cfg, hits = ((netRt(topo).aclHits || {})[dev.id]) || {};
  const out = [];
  for (const n of aclSortedNames(cfg)) {
    if (only !== undefined && n !== String(only)) continue;
    const acl = cfg.acls[n];
    out.push((acl.kind === 'std' ? 'Standard' : 'Extended') + ' IP access list ' + n);
    for (const e of aclRules(acl)) {
      const m = (hits[n] || {})[e.seq];
      out.push('    ' + e.seq + ' ' + aclAceText(e, acl.kind) + (m ? ' (' + m + ' match(es))' : ''));
    }
  }
  return out.join('\n');
}

// ---------- running-config ----------
function aclRunningGlobal(cfg) {
  const L = [];
  for (const n of aclSortedNames(cfg)) {
    const acl = cfg.acls[n];
    if (!acl.named && /^\d+$/.test(n)) { for (const e of acl.entries) L.push('access-list ' + n + ' ' + aclAceText(e, acl.kind)); continue; }
    L.push('ip access-list ' + (acl.kind === 'std' ? 'standard' : 'extended') + ' ' + n);
    for (const e of acl.entries) L.push(' ' + aclAceText(e, acl.kind));
  }
  if (L.length) L.push('!');
  return L;
}
function aclNatRunningIf(ic) {
  const L = [];
  if (ic.aclIn) L.push(' ip access-group ' + ic.aclIn + ' in');
  if (ic.aclOut) L.push(' ip access-group ' + ic.aclOut + ' out');
  if (ic.nat) L.push(' ip nat ' + ic.nat);
  return L;
}

// ---------- Команды IOS: ACL ----------
IOS_SUFFIX['std-nacl'] = '(config-std-nacl)#';
IOS_SUFFIX['ext-nacl'] = '(config-ext-nacl)#';
for (const m of ['std-nacl', 'ext-nacl']) if (!IOS_CONFIG_SUBMODES.includes(m)) IOS_CONFIG_SUBMODES.push(m);
const NACL = ['std-nacl', 'ext-nacl'];

// Маркер "^" под неверным словом строки: позиция токена idx в исходной строке
function aclInvalid(c, idx) {
  const toks = iosTokenize(c.raw);
  const prompt = iosPrompt(c.topo, c.sess);
  const pos = toks[idx] ? toks[idx].pos : c.raw.length;
  return ' '.repeat(prompt.length + pos) + '^\n% Invalid input detected at \'^\' marker.';
}

// Добавить строку в ACL: seq — явный номер (именованный режим) или следующий кратный 10
function aclAdd(c, acl, e, seq) {
  const rules = acl.entries;
  if (e.act !== 'remark' && rules.some((x) => x.act !== 'remark' && aclAceText(x, acl.kind) === aclAceText(e, acl.kind))) return; // такая строка уже есть
  if (e.act === 'remark') { rules.push(e); return; }
  if (seq === undefined) {
    const max = rules.reduce((m, x) => (x.seq ? Math.max(m, x.seq) : m), 0);
    e.seq = max + 10;
    rules.push(e);
    return;
  }
  if (rules.some((x) => x.seq === seq)) { c.out('% Duplicate sequence number'); return; }
  e.seq = seq;
  const at = rules.findIndex((x) => x.seq && x.seq > seq);
  if (at < 0) rules.push(e); else rules.splice(at, 0, e);
}

// access-list <N> …  (номер определяет тип: 1–99, 1300–1999 стандартный; 100–199, 2000–2699 расширенный)
iosDef(['config'], 'access-list <num> <line>', (c) => {
  const n = c.p[0];
  const kind = aclKindOfNumber(n);
  const all = iosTokenize(c.raw).map((t) => t.t);
  if (!kind) { c.out(aclInvalid(c, 1)); return; }
  const toks = all.slice(2);
  if ((toks[0] || '').toLowerCase() === 'remark') {
    const text = c.raw.slice(iosTokenize(c.raw)[3] ? iosTokenize(c.raw)[3].pos : c.raw.length).trim();
    aclAdd(c, aclEnsure(c.cfg, n, kind, false), { act: 'remark', text });
    return;
  }
  const r = aclParseAce(toks, kind);
  if (r.err !== undefined) { if (r.incomplete) c.out('% Incomplete command.'); else c.out(aclInvalid(c, r.err + 2)); return; }
  aclAdd(c, aclEnsure(c.cfg, n, kind, false), r.e);
});
iosDef(['config'], 'no access-list <num>', (c) => { if (c.cfg.acls) delete c.cfg.acls[String(c.p[0])]; });

// ip access-list standard|extended NAME → режим (config-std-nacl)# / (config-ext-nacl)#
for (const [kw, kind, mode] of [['standard', 'std', 'std-nacl'], ['extended', 'ext', 'ext-nacl']]) {
  iosDef(['config'], 'ip access-list ' + kw + ' <word>', (c) => {
    const name = c.p[0];
    if (/^\d+$/.test(name) && aclKindOfNumber(Number(name)) !== kind) { c.out('% Invalid access list name.'); return; }
    const ex = aclGet(c.cfg, name);
    if (ex && ex.kind !== kind) { c.out('% A named ' + (ex.kind === 'std' ? 'standard' : 'extended') + ' IP access list with this name already exists'); return; }
    aclEnsure(c.cfg, name, kind, !/^\d+$/.test(name));
    c.sess.acl = name;
    c.sess.mode = mode;
  });
  iosDef(['config'], 'no ip access-list ' + kw + ' <word>', (c) => { if (c.cfg.acls) delete c.cfg.acls[c.p[0]]; });
}
function naclAdd(c, words, seq) {
  const acl = aclGet(c.cfg, c.sess.acl);
  if (!acl) return;
  const off = seq === undefined ? 0 : 1;
  const r = aclParseAce(words, acl.kind);
  if (r.err !== undefined) { if (r.incomplete) c.out('% Incomplete command.'); else c.out(aclInvalid(c, r.err + off)); return; }
  aclAdd(c, acl, r.e, seq);
}
const naclWords = (c) => iosTokenize(c.raw).map((t) => t.t);
iosDef(NACL, 'permit <line>', (c) => naclAdd(c, naclWords(c)));
iosDef(NACL, 'deny <line>', (c) => naclAdd(c, naclWords(c)));
iosDef(NACL, '<num> <line>', (c) => naclAdd(c, naclWords(c).slice(1), c.p[0]));
iosDef(NACL, 'remark <line>', (c) => { const acl = aclGet(c.cfg, c.sess.acl); if (acl) aclAdd(c, acl, { act: 'remark', text: c.p[0] }); });
iosDef(NACL, 'no <num>', (c) => { const acl = aclGet(c.cfg, c.sess.acl); if (acl) acl.entries = acl.entries.filter((e) => e.seq !== c.p[0]); });
iosDef(NACL, 'no <line>', (c) => {
  const acl = aclGet(c.cfg, c.sess.acl);
  if (!acl) return;
  const words = naclWords(c).slice(1);
  const r = aclParseAce(words, acl.kind);
  if (r.err !== undefined) { c.out(aclInvalid(c, r.err + 1)); return; }
  const t = aclAceText(r.e, acl.kind);
  acl.entries = acl.entries.filter((e) => e.act === 'remark' || aclAceText(e, acl.kind) !== t);
});
iosDef(NACL, 'exit', (c) => { c.sess.mode = 'config'; c.sess.acl = null; }, { ro: true });
iosDef(NACL, 'end', (c) => { c.sess.mode = 'priv'; c.sess.acl = null; }, { ro: true });
iosDef(NACL, 'do <line>', (c) => {
  const saved = c.sess.mode;
  c.sess.mode = 'priv';
  const r = iosRun(c.topo, c.sess, c.p[0], iosPrompt(c.topo, c.sess));
  if (c.sess.mode === 'priv' || c.sess.mode === 'user') c.sess.mode = saved;
  if (r.out) c.out(r.out.replace(/\n$/, ''));
  c.slow = r.slow;
}, { ro: true });

// ACL на интерфейсе и на линиях VTY
for (const dir of ['in', 'out']) {
  iosDef(IFM, 'ip access-group <word> ' + dir, (c) => { for (const { ic } of iosIfaces(c)) ic[dir === 'in' ? 'aclIn' : 'aclOut'] = c.p[0]; }, { dev: 'router' });
  iosDef(IFM, 'no ip access-group <word> ' + dir, (c) => { for (const { ic } of iosIfaces(c)) delete ic[dir === 'in' ? 'aclIn' : 'aclOut']; }, { dev: 'router' });
  iosDef(IFM, 'no ip access-group ' + dir, (c) => { for (const { ic } of iosIfaces(c)) delete ic[dir === 'in' ? 'aclIn' : 'aclOut']; }, { dev: 'router' });
}
iosDef(['line'], 'access-class <word> in', (c) => {
  if (c.sess.lineName !== 'vty') { c.out(iosInvalidHere(c)); return; }
  LINE(c).accessClass = c.p[0];
});
iosDef(['line'], 'no access-class <word> in', (c) => { delete LINE(c).accessClass; });

SHOW('access-lists', (c) => c.out(iosShowAccessLists(c.topo, c.dev)));
SHOW('access-lists <word>', (c) => c.out(iosShowAccessLists(c.topo, c.dev, c.p[0])));
SHOW('ip access-lists', (c) => c.out(iosShowAccessLists(c.topo, c.dev)));
SHOW('ip access-lists <word>', (c) => c.out(iosShowAccessLists(c.topo, c.dev, c.p[0])));
const aclClear = (c) => { const rt = netRt(c.topo); if (!rt.aclHits || !rt.aclHits[c.dev.id]) return; if (c.p[0] === undefined) delete rt.aclHits[c.dev.id]; else delete rt.aclHits[c.dev.id][c.p[0]]; };
iosDef(['priv'], 'clear access-list counters', aclClear, { ro: true });
iosDef(['priv'], 'clear access-list counters <word>', aclClear, { ro: true });

// ================= NAT =================
const NAT_TIMEOUT = { icmp: 60000, udp: 300000, tcp: 86400000, simple: 86400000 };

function natRole(dev, ifName) {
  if (isHomeRouter(dev)) return ifName === 'LAN' ? 'inside' : ifName === 'Internet' ? 'outside' : null;
  const ic = dev.cfg.interfaces && dev.cfg.interfaces[ifName];
  return (ic && ic.nat) || null;
}
function natCfg(dev) {
  if (isHomeRouter(dev)) return { pools: {}, statics: [], rules: [{ list: null, iface: 'Internet', overload: true }] };
  return dev.cfg.nat || { pools: {}, statics: [], rules: [] };
}
function natEnsure(cfg) { cfg.nat = cfg.nat || { pools: {}, statics: [], rules: [] }; return cfg.nat; }

// Таблица трансляций устройства (для проверки заданий — копия, чтобы ничего не испортить)
function natState(topo, dev, opts) {
  const rt = netRt(topo);
  const all = (rt.nat = rt.nat || {});
  const real = (all[dev.id] = all[dev.id] || { entries: [], hits: 0, misses: 0, expired: 0, poolMiss: {} });
  natExpire(topo, real);
  if (opts && opts.probe) {
    const sc = (opts.natScratch = opts.natScratch || {});
    if (!sc[dev.id]) sc[dev.id] = { entries: real.entries.map((e) => ({ ...e })), hits: 0, misses: 0, expired: 0, poolMiss: {} };
    return sc[dev.id];
  }
  return real;
}
function natExpire(topo, st) {
  const now = netTime(topo);
  const keep = st.entries.filter((e) => now - e.t <= (e.ext ? NAT_TIMEOUT[e.proto] || NAT_TIMEOUT.tcp : NAT_TIMEOUT.simple));
  st.expired += st.entries.length - keep.length;
  st.entries = keep;
}
const natLport = (pkt) => (pkt.proto === 'icmp' ? pkt.id : pkt.sport);
const natRport = (pkt) => (pkt.proto === 'icmp' ? pkt.id : pkt.dport);
function natSetSrc(pkt, ip, port) { pkt.src = ip; if (port === undefined || port === null) return; if (pkt.proto === 'icmp') pkt.id = port; else pkt.sport = port; }
function natSetDst(pkt, ip, port) { pkt.dst = ip; if (port === undefined || port === null) return; if (pkt.proto === 'icmp') pkt.id = port; else pkt.dport = port; }
function natPoolAddrs(p) { const s = ipToInt(p.start), e = ipToInt(p.end); const out = []; if (s === null || e === null) return out; for (let a = s; a <= e && out.length < 4096; a++) out.push(a >>> 0); return out; }

// Свободный порт (или ICMP id) для PAT на глобальном адресе ig: сначала исходный, иначе следующий свободный
function natPickPort(st, proto, ig, want) {
  const busy = (p) => st.entries.some((e) => e.ext && e.proto === proto && e.ig === ig && e.igp === p);
  if (want !== undefined && want !== null && !busy(want)) return want;
  let p = proto === 'icmp' ? 1 : 1024;
  while (busy(p)) p++;
  return p;
}
function natNewExt(st, topo, pkt, il, ilp, ig, igp) {
  const e = { ext: true, proto: pkt.proto, il, ilp, ig, igp, ol: pkt.dst, olp: natRport(pkt), og: pkt.dst, ogp: natRport(pkt), t: netTime(topo) };
  st.entries.push(e);
  return e;
}

// Изнутри наружу (inside → outside): меняется адрес (и порт при PAT) источника. false — трансляция не удалась (пул пуст).
function natOutbound(topo, D, inIf, outIf, pkt, opts) {
  if (natRole(D, inIf) !== 'inside' || natRole(D, outIf) !== 'outside') return true;
  if (pkt.proto === 'icmp' && pkt.icmp === 'error') return true;
  const cfg = natCfg(D);
  const st = natState(topo, D, opts);
  const now = netTime(topo);
  const lp = natLport(pkt), rp = natRport(pkt);
  // 1. уже есть трансляция этого потока
  let e = st.entries.find((x) => x.ext && x.proto === pkt.proto && x.il === pkt.src && x.ilp === lp && x.og === pkt.dst && x.ogp === rp);
  if (e) { e.t = now; st.hits++; natSetSrc(pkt, e.ig, e.igp); return true; }
  // 2. статическая трансляция
  const s = cfg.statics.find((x) => ipToInt(x.local) === pkt.src && (!x.proto || (x.proto === pkt.proto && x.lport === lp)));
  if (s) {
    const ig = ipToInt(s.global), igp = s.proto ? s.gport : lp;
    natNewExt(st, topo, pkt, pkt.src, lp, ig, igp);
    st.hits++;
    natSetSrc(pkt, ig, igp);
    return true;
  }
  // 3. уже выданный динамический адрес (NAT без overload)
  const simple = st.entries.find((x) => !x.ext && x.il === pkt.src);
  if (simple) {
    simple.t = now;
    natNewExt(st, topo, pkt, pkt.src, lp, simple.ig, lp);
    st.hits++;
    natSetSrc(pkt, simple.ig, lp);
    return true;
  }
  // 4. правило ip nat inside source list … — ACL выбирает, кого транслировать
  for (const rule of cfg.rules) {
    if (rule.list !== null && rule.list !== undefined) {
      const acl = aclGet(D.cfg, rule.list);
      if (!aclRules(acl).length) continue;   // без ACL правило ничего не транслирует
      if (!aclEval(topo, D, rule.list, pkt, !(opts && opts.probe)).permit) continue;
    }
    let ig = null;
    if (rule.iface) { const a = ifAddr(D, rule.iface); if (!a || !ifUp(topo, D, rule.iface)) continue; ig = a.ip; }
    const pool = rule.pool ? cfg.pools[rule.pool] : null;
    if (rule.pool && !pool) { st.misses++; return false; }
    if (rule.overload) {
      if (pool) ig = natPoolAddrs(pool)[0];
      if (ig === null || ig === undefined) return false;
      const igp = natPickPort(st, pkt.proto, ig, lp);
      natNewExt(st, topo, pkt, pkt.src, lp, ig, igp);
      st.misses++;
      natSetSrc(pkt, ig, igp);
      return true;
    }
    const used = new Set(st.entries.filter((x) => !x.ext).map((x) => x.ig));
    for (const x of cfg.statics) used.add(ipToInt(x.global));
    const free = natPoolAddrs(pool).find((a) => !used.has(a));
    if (free === undefined) { st.misses++; st.poolMiss[rule.pool] = (st.poolMiss[rule.pool] || 0) + 1; return false; }   // пул исчерпан — пакет отброшен
    st.entries.push({ ext: false, proto: null, il: pkt.src, ig: free, t: now });
    natNewExt(st, topo, pkt, pkt.src, lp, free, lp);
    st.misses++;
    natSetSrc(pkt, free, lp);
    return true;
  }
  return true;   // не попал ни в одно правило — уходит без трансляции
}

// Снаружи внутрь (outside → inside): адрес получателя inside global → inside local
function natInbound(topo, D, inIf, pkt, opts) {
  if (natRole(D, inIf) !== 'outside') return;
  const cfg = natCfg(D);
  const st = natState(topo, D, opts);
  const now = netTime(topo);
  if (pkt.proto === 'icmp' && pkt.icmp === 'error') {   // ICMP-ошибка о пакете, который ушёл с адреса inside global
    const e = st.entries.find((x) => x.ig === pkt.dst);
    const s = cfg.statics.find((x) => ipToInt(x.global) === pkt.dst);
    if (e) natSetDst(pkt, e.il); else if (s) natSetDst(pkt, ipToInt(s.local));
    return;
  }
  const rp = natRport(pkt), lp = natLport(pkt);
  const e = st.entries.find((x) => x.ext && x.proto === pkt.proto && x.ig === pkt.dst && x.igp === rp && x.og === pkt.src);
  if (e) { e.t = now; st.hits++; natSetDst(pkt, e.il, e.ilp); return; }
  const s = cfg.statics.find((x) => ipToInt(x.global) === pkt.dst && (!x.proto || (x.proto === pkt.proto && x.gport === rp)));
  if (s) {
    const il = ipToInt(s.local), ilp = s.proto ? s.lport : rp;
    st.entries.push({ ext: true, proto: pkt.proto, il, ilp, ig: pkt.dst, igp: rp, ol: pkt.src, olp: lp, og: pkt.src, ogp: lp, t: now });
    st.hits++;
    natSetDst(pkt, il, ilp);
    return;
  }
  const simple = st.entries.find((x) => !x.ext && x.ig === pkt.dst);
  if (simple) {
    simple.t = now;
    st.entries.push({ ext: true, proto: pkt.proto, il: simple.il, ilp: rp, ig: pkt.dst, igp: rp, ol: pkt.src, olp: lp, og: pkt.src, ogp: lp, t: now });
    st.hits++;
    natSetDst(pkt, simple.il, rp);
  }
}

// Адреса inside global из подсети outside-интерфейса — роутер отвечает за них на ARP (как алиасы NAT в IOS)
function natArpAlias(dev, ifName, ip) {
  if (natRole(dev, ifName) !== 'outside' || isHomeRouter(dev)) return false;
  const a = ifAddr(dev, ifName);
  if (!a || !inSubnet(ip, a.ip, a.len)) return false;
  const cfg = natCfg(dev);
  if (cfg.statics.some((s) => ipToInt(s.global) === ip)) return true;
  return cfg.rules.some((r) => r.pool && cfg.pools[r.pool] && natPoolAddrs(cfg.pools[r.pool]).includes(ip));
}

// ---------- show ip nat translations / statistics ----------
function iosShowNatTranslations(topo, dev) {
  const st = natState(topo, dev);
  const cfg = natCfg(dev);
  const ap = (ip, p) => intToIp(ip) + (p !== undefined && p !== null ? ':' + p : '');
  const row = (pro, a, b, c2, d) => padR(pro, 5) + padR(a, 22) + padR(b, 22) + padR(c2, 22) + d;
  const L = [row('Pro', 'Inside global', 'Inside local', 'Outside local', 'Outside global')];
  for (const e of st.entries.filter((x) => x.ext)) L.push(row(e.proto, ap(e.ig, e.igp), ap(e.il, e.ilp), ap(e.ol, e.olp), ap(e.og, e.ogp)));
  for (const e of st.entries.filter((x) => !x.ext)) L.push(row('---', intToIp(e.ig), intToIp(e.il), '---', '---'));
  for (const s of cfg.statics) L.push(row(s.proto || '---', s.global + (s.proto ? ':' + s.gport : ''), s.local + (s.proto ? ':' + s.lport : ''), '---', '---'));
  return L.length > 1 ? L.join('\n') : '';
}
function iosShowNatStatistics(topo, dev) {
  const st = natState(topo, dev);
  const cfg = natCfg(dev);
  const ifs = (role) => Object.keys(dev.cfg.interfaces).filter((n) => natRole(dev, n) === role);
  const ext = st.entries.filter((e) => e.ext).length, dyn = st.entries.length;
  const L = ['Total translations: ' + (dyn + cfg.statics.length) + ' (' + cfg.statics.length + ' static, ' + dyn + ' dynamic, ' + ext + ' extended)',
    'Outside Interfaces: ' + ifs('outside').join(' , '), 'Inside Interfaces: ' + ifs('inside').join(' , '),
    'Hits: ' + st.hits + '  Misses: ' + st.misses, 'Expired translations: ' + st.expired, 'Dynamic mappings:'];
  if (cfg.rules.length) L.push('-- Inside Source');
  for (const r of cfg.rules) {
    const refs = st.entries.filter((e) => !e.ext || r.overload).length;
    if (r.iface) { L.push('access-list ' + r.list + ' interface ' + r.iface + ' refCount ' + refs); continue; }
    L.push('access-list ' + r.list + ' pool ' + r.pool + ' refCount ' + refs);
    const p = cfg.pools[r.pool];
    if (!p) continue;
    const total = natPoolAddrs(p).length;
    const alloc = r.overload ? (refs ? 1 : 0) : st.entries.filter((e) => !e.ext).length;
    L.push(' pool ' + r.pool + ': netmask ' + p.mask, '       start ' + p.start + ' end ' + p.end,
      '       type generic, total addresses ' + total + ' , allocated ' + alloc + ' (' + (total ? Math.floor(alloc * 100 / total) : 0) + '%), misses ' + (st.poolMiss[r.pool] || 0));
  }
  return L.join('\n');
}

function natRunningGlobal(cfg) {
  const n = cfg.nat;
  if (!n) return [];
  const L = [];
  for (const [name, p] of Object.entries(n.pools)) L.push('ip nat pool ' + name + ' ' + p.start + ' ' + p.end + ' netmask ' + p.mask);
  for (const r of n.rules) L.push('ip nat inside source list ' + r.list + (r.iface ? ' interface ' + r.iface : ' pool ' + r.pool) + (r.overload ? ' overload' : ''));
  for (const s of n.statics) L.push('ip nat inside source static ' + (s.proto ? s.proto + ' ' + s.local + ' ' + s.lport + ' ' + s.global + ' ' + s.gport : s.local + ' ' + s.global));
  return L;
}

// ---------- Команды IOS: NAT ----------
for (const role of ['inside', 'outside']) {
  iosDef(IFM, 'ip nat ' + role, (c) => { for (const { ic } of iosIfaces(c)) ic.nat = role; }, { dev: 'router' });
  iosDef(IFM, 'no ip nat ' + role, (c) => { for (const { ic } of iosIfaces(c)) if (ic.nat === role) delete ic.nat; }, { dev: 'router' });
}
function natAddPool(c, name, a, b, mask) {
  if (!isMask(mask)) { c.out('%Invalid netmask'); return; }
  const s = ipToInt(a), e = ipToInt(b), len = maskToLen(mask);
  if (e < s) { c.out('%End address less than start address'); return; }
  if (!inSubnet(s, e, len)) { c.out('%Start and end addresses on different subnets'); return; }
  natEnsure(c.cfg).pools[name] = { start: a, end: b, mask };
}
iosDef(['config'], 'ip nat pool <word> <ip> <ip> netmask <mask>', (c) => natAddPool(c, c.p[0], c.p[1], c.p[2], c.p[3]), { dev: 'router' });
iosDef(['config'], 'ip nat pool <word> <ip> <ip> prefix-length <num>', (c) => {
  if (c.p[3] < 1 || c.p[3] > 32) { c.out(iosInvalidHere(c)); return; }
  natAddPool(c, c.p[0], c.p[1], c.p[2], lenToMask(c.p[3]));
}, { dev: 'router' });
iosDef(['config'], 'no ip nat pool <word>', (c) => { if (c.cfg.nat) delete c.cfg.nat.pools[c.p[0]]; }, { dev: 'router' });
function natAddRule(c, rule) {
  const n = natEnsure(c.cfg);
  n.rules = n.rules.filter((r) => String(r.list) !== String(rule.list));
  n.rules.push(rule);
}
iosDef(['config'], 'ip nat inside source list <word> pool <word>', (c) => natAddRule(c, { list: c.p[0], pool: c.p[1], overload: false }), { dev: 'router' });
iosDef(['config'], 'ip nat inside source list <word> pool <word> overload', (c) => natAddRule(c, { list: c.p[0], pool: c.p[1], overload: true }), { dev: 'router' });
iosDef(['config'], 'ip nat inside source list <word> interface <if> overload', (c) => {
  if (!c.cfg.interfaces[c.p[1]]) { c.out(iosInvalidHere(c)); return; }
  natAddRule(c, { list: c.p[0], iface: c.p[1], overload: true });
}, { dev: 'router' });
const natNoRule = (c) => { if (c.cfg.nat) c.cfg.nat.rules = c.cfg.nat.rules.filter((r) => String(r.list) !== String(c.p[0])); };
iosDef(['config'], 'no ip nat inside source list <word> pool <word>', natNoRule, { dev: 'router' });
iosDef(['config'], 'no ip nat inside source list <word> pool <word> overload', natNoRule, { dev: 'router' });
iosDef(['config'], 'no ip nat inside source list <word> interface <if> overload', natNoRule, { dev: 'router' });
function natAddStatic(c, s) {
  const n = natEnsure(c.cfg);
  if (n.statics.some((x) => x.global === s.global && !x.proto && !s.proto && x.local !== s.local)) { c.out('% ' + s.global + ' already mapped (' + n.statics.find((x) => x.global === s.global).local + ' -> ' + s.global + ')'); return; }
  n.statics = n.statics.filter((x) => !(x.local === s.local && (x.proto || null) === (s.proto || null) && (x.lport || null) === (s.lport || null)));
  n.statics.push(s);
}
iosDef(['config'], 'ip nat inside source static <ip> <ip>', (c) => natAddStatic(c, { local: c.p[0], global: c.p[1] }), { dev: 'router' });
for (const proto of ['tcp', 'udp']) {
  iosDef(['config'], 'ip nat inside source static ' + proto + ' <ip> <num> <ip> <num>', (c) => natAddStatic(c, { proto, local: c.p[0], lport: c.p[1], global: c.p[2], gport: c.p[3] }), { dev: 'router' });
  iosDef(['config'], 'no ip nat inside source static ' + proto + ' <ip> <num> <ip> <num>', (c) => { if (c.cfg.nat) c.cfg.nat.statics = c.cfg.nat.statics.filter((x) => !(x.proto === proto && x.local === c.p[0] && x.lport === c.p[1])); }, { dev: 'router' });
}
iosDef(['config'], 'no ip nat inside source static <ip> <ip>', (c) => { if (c.cfg.nat) c.cfg.nat.statics = c.cfg.nat.statics.filter((x) => !(!x.proto && x.local === c.p[0] && x.global === c.p[1])); }, { dev: 'router' });

SHOW('ip nat translations', (c) => c.out(iosShowNatTranslations(c.topo, c.dev)), { dev: 'router' });
SHOW('ip nat statistics', (c) => c.out(iosShowNatStatistics(c.topo, c.dev)), { dev: 'router' });
iosDef(['priv'], 'clear ip nat translation *', (c) => { const st = natState(c.topo, c.dev); st.entries = []; }, { ro: true, dev: 'router' });
iosDef(['priv'], 'clear ip nat statistics', (c) => { const st = natState(c.topo, c.dev); st.hits = 0; st.misses = 0; st.expired = 0; st.poolMiss = {}; }, { ro: true, dev: 'router' });

Object.assign(IOS_HELP, {
  'access-list': 'Add an access list entry', 'access-group': 'Specify access control for packets', 'access-class': 'Filter connections based on an IP access list',
  'access-lists': 'List access lists', standard: 'Standard Access List', extended: 'Extended Access List', permit: 'Specify packets to forward',
  deny: 'Specify packets to reject', remark: 'Access list entry comment', counters: 'Clear access list counters', nat: 'NAT configuration commands',
  inside: 'Inside interface for address translation', outside: 'Outside interface for address translation', source: 'Source address translation',
  list: 'Specify access list describing local addresses', overload: 'Overload an address translation', static: 'Specify static local->global mapping',
  translations: 'Translation entries', translation: 'Clear dynamic translation', netmask: 'Specify the network mask', 'prefix-length': 'Specify the prefix length',
});

// ================= Вход на устройство по telnet / ssh с ПК =================
// Проверки как у IOS: доступность TCP 23 / 22, transport input, access-class на VTY, login / login local, SSH (домен, RSA, пользователь).
function remoteLogin(topo, pcId, ipStr, kind, user, opts = {}) {
  const ip = ipToInt(ipStr);
  const port = kind === 'ssh' ? 22 : 23;
  const f = flowOnce(topo, pcId, ip, 'tcp', port, opts.probe ? { arp: false, probe: true, natScratch: {} } : { arp: false });
  if (!f.ok) return { lines: kind === 'ssh' ? ['% Connection timed out; remote host not responding'] : ['Trying ' + ipStr + ' ...', '% Connection timed out; remote host not responding'] };
  const D = topo.devices[f.dev];
  const refused = { lines: kind === 'ssh' ? ['% Connection refused by remote host'] : ['Trying ' + ipStr + ' ...', '% Connection refused by remote host'] };
  if (!D || (D.type !== 'router' && D.type !== 'switch') || isHomeRouter(D)) return refused;
  const vty = D.cfg.lines.vty || {};
  const tr = vty.transport || 'all';
  if (tr === 'none' || (!/all/.test(tr) && !tr.split(/\s+/).includes(kind))) return refused;
  if (kind === 'ssh' && (!D.cfg.rsaBits || !D.cfg.domainName)) return refused;
  if (vty.accessClass) {
    const r = aclEval(topo, D, vty.accessClass, { proto: 'tcp', src: f.srcSeen, dst: ip, dport: port }, !opts.probe);
    if (!r.permit) return refused;
  }
  const sess = iosNewSession(topo, D.id);
  sess.started = true;
  sess.mode = 'user';
  sess.vty = { kind, from: f.srcSeen, ip: ipStr };
  const lines = kind === 'ssh' ? [] : ['Trying ' + ipStr + ' ...Open'];
  if (D.cfg.banner) lines.push(D.cfg.banner);
  if (kind === 'ssh') {
    if (!vty.loginLocal || !user || !D.cfg.users[user]) return { lines: ['% Authentication failed'] };
    sess.pending = { kind: 'vty', step: 'pass', user, tries: 0, prompt: 'Password: ', hidden: true };
    return { lines, sess, devId: D.id };
  }
  if (!vty.login && !vty.loginLocal) return { lines: lines.concat(['', 'Password required, but none set', '', '[Connection to ' + ipStr + ' closed by foreign host]']) };
  if (vty.login && !vty.loginLocal && !vty.password) return { lines: lines.concat(['', 'Password required, but none set', '', '[Connection to ' + ipStr + ' closed by foreign host]']) };
  lines.push('', 'User Access Verification', '');
  sess.pending = vty.loginLocal ? { kind: 'vty', step: 'user', tries: 0, prompt: 'Username: ' } : { kind: 'vty', step: 'pass', tries: 0, prompt: 'Password: ', hidden: true };
  return { lines, sess, devId: D.id };
}

// Ввод логина и пароля VTY (pending kind 'vty')
function vtyPending(topo, sess, line) {
  const dev = topo.devices[sess.devId];
  const p = sess.pending;
  const vty = dev.cfg.lines.vty || {};
  if (p.step === 'user') { p.user = line.trim(); p.step = 'pass'; p.prompt = 'Password: '; p.hidden = true; return { out: '' }; }
  let ok;
  if (vty.loginLocal) { const u = dev.cfg.users[p.user]; ok = !!u && (u.secret === line || u.password === line); }
  else ok = !!vty.password && line === vty.password;
  if (ok) { sess.pending = null; return { out: '' }; }
  p.tries++;
  if (p.tries >= 3) { sess.pending = null; sess.started = false; return { out: (vty.loginLocal ? '% Login invalid' : '% Bad passwords') + '\n' }; }
  if (vty.loginLocal) { p.step = 'user'; p.prompt = 'Username: '; p.hidden = false; return { out: '% Login invalid\n\n' }; }
  return { out: '' };
}
