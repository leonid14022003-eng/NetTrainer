'use strict';
// ENSA 2–14: независимая проверка ответов генераторов (пересчёт по тексту вопроса и коду, без функций уроков).

function e2Samples(lessonId, name, n) {
  const g = lessonGet(lessonId).gen.find((f) => f.name === name);
  ok(g, lessonId + '.' + name + ' exists');
  const out = [];
  for (let s = 1; s <= n; s++) out.push(g(makeRng(s * 6151)));
  return out;
}
function e2Right(q) { const o = q.options[q.answer]; return typeof o === 'string' ? o : o.en; }
function e2Opt(o) { return typeof o === 'string' ? o : o.en; }
function e2Int(ip) { return ipToInt(ip); }

test('ensa: OSPF router ID, DR election and reference-bandwidth cost', () => {
  for (const q of e2Samples('ensa02', 'genRouterId', 300)) {
    const rid = (q.code.match(/router-id ([\d.]+)/) || [])[1];
    const ifs = q.code.split('\n').map((l) => l.match(/^(\S+)\s+([\d.]+)\s+(up|administratively down)$/)).filter(Boolean)
      .map((m) => ({ name: m[1], ip: m[2], up: m[3] === 'up' }));
    const top = (list) => list.slice().sort((a, b) => e2Int(b.ip) - e2Int(a.ip))[0].ip;
    const loops = ifs.filter((i) => i.name.startsWith('Loopback') && i.up);
    eq(e2Right(q), rid || (loops.length ? top(loops) : top(ifs.filter((i) => i.up))), q.code);
  }
  for (const q of e2Samples('ensa02', 'genDrElection', 300)) {
    const role = q.q.en.match(/becomes the (DR|BDR)\?/)[1];
    const rows = q.code.split('\n').slice(1).map((l) => l.trim().split(/\s+/)).map(([name, pri, rid]) => ({ name, pri: Number(pri), rid }));
    const cand = rows.filter((r) => r.pri > 0).sort((a, b) => (b.pri - a.pri) || (e2Int(b.rid) - e2Int(a.rid)));
    eq(e2Right(q), cand[role === 'DR' ? 0 : 1].name, q.code);
  }
  const kbps = { Ethernet: 10000, FastEthernet: 100000, GigabitEthernet: 1000000, TenGigabitEthernet: 10000000, 'Serial T1': 1544 };
  for (const q of e2Samples('ensa02', 'genRefBwCost', 300)) {
    const ref = Number(q.q.en.match(/reference-bandwidth (\d+)/)[1]), ifc = q.q.en.match(/cost of the (.+?) \(/)[1];
    ok(kbps[ifc], 'known interface ' + ifc);
    eq(e2Right(q), String(Math.max(1, Math.trunc(ref * 1000 / kbps[ifc]))), q.q.en);
  }
});

test('ensa: ACL numbers, ACE matching, wildcard ranges and placement', () => {
  for (const q of e2Samples('ensa04', 'genAclNumber', 300)) {
    const n = Number(q.q.en.match(/access-list (\d+)/)[1]);
    const want = (n <= 99 || (n >= 1300 && n <= 1999)) ? 'Standard IPv4 ACL' : (n <= 199 || (n >= 2000 && n <= 2699)) ? 'Extended IPv4 ACL' : null;
    eq(e2Right(q), want, 'access-list ' + n);
  }
  for (const q of e2Samples('ensa04', 'genAceMatch', 300)) {
    const [, net, wc] = q.code.match(/(?:permit|deny) ([\d.]+) ([\d.]+)$/);
    const W = e2Int(wc), N = e2Int(net), not = q.q.en.includes('NOT');
    q.options.forEach((o, i) => {
      const match = ((e2Int(o) | W) >>> 0) === ((N | W) >>> 0);
      eq(match !== not, i === q.answer, q.code + ' / ' + q.q.en + ' option ' + o);
    });
  }
  for (const q of e2Samples('ensa04', 'genAclRange', 300)) {
    const [, A, B] = q.q.en.match(/exactly ([\d.]+) – ([\d.]+)\?/);
    q.options.forEach((o, i) => {
      const [a, w] = o.split(' ').map(e2Int);
      const contiguous = ((w & (w + 1)) >>> 0) === 0, lo = (a & ~w) >>> 0;
      eq(contiguous && lo === e2Int(A) && lo + w === e2Int(B), i === q.answer, q.q.en + ' option ' + o);
    });
  }
  for (const q of e2Samples('ensa04', 'genAclPlacement', 300)) {
    const [, src] = q.q.en.match(/Hosts in ([\d.]+)\/24 must not reach ([\d.]+)\/24/);
    const ext = q.q.en.includes('extended ACL');
    const left = q.code.split('/24')[0], srcR = src === left ? 'R1' : 'R3', dstR = srcR === 'R1' ? 'R3' : 'R1';
    eq(e2Right(q), ext ? srcR + ', G0/0/0 inbound' : dstR + ', G0/0/0 outbound', q.q.en + '\n' + q.code);
  }
});

test('ensa: ACL first match and extended ACE syntax', () => {
  for (const q of e2Samples('ensa05', 'genAclFirstMatch', 300)) {
    const src = e2Int(q.q.en.match(/source ([\d.]+) arrives/)[1]);
    const lines = q.code.split('\n').map((l) => l.match(/^\s+(\d+) (permit|deny)\s+(any|[\d.]+)(?:, wildcard bits ([\d.]+))?$/)).filter(Boolean);
    ok(lines.length >= 3, 'ACL lines parsed');
    let want = 'Denied by the implicit deny at the end';
    for (const [, seq, act, addr, wc] of lines) {
      const W = wc ? e2Int(wc) : 0;
      if (addr === 'any' || ((src | W) >>> 0) === ((e2Int(addr) | W) >>> 0)) { want = (act === 'permit' ? 'Permitted' : 'Denied') + ' by line ' + seq; break; }
    }
    eq(e2Right(q), want, q.q.en + '\n' + q.code);
  }
  const svc = { 'web (HTTP)': 'tcp 80', 'secure web (HTTPS)': 'tcp 443', SSH: 'tcp 22', Telnet: 'tcp 23', FTP: 'tcp 21', 'SMTP e-mail': 'tcp 25', TFTP: 'udp 69', SNMP: 'udp 161', NTP: 'udp 123' };
  for (const q of e2Samples('ensa05', 'genAclExtended', 300)) {
    const [, name, net, srv] = q.q.en.match(/blocks (.+) from ([\d.]+)\/24 to the server ([\d.]+)\?/);
    const [p, port] = svc[name].split(' ');
    ok(new RegExp('^access-list 1\\d\\d deny ' + p + ' ' + net.replace(/\./g, '\\.') + ' 0\\.0\\.0\\.255 host ' + srv.replace(/\./g, '\\.') + ' eq ' + port + '$').test(e2Right(q)), q.q.en + ' → ' + e2Right(q));
  }
});

test('ensa: NAT terms, PAT translations and pool size', () => {
  for (const q of e2Samples('ensa06', 'genNatTerm', 300)) {
    const [, pc, gw, srv, pub, term] = q.q.en.match(/PC ([\d.]+) \(gateway ([\d.]+)\) opens the web server ([\d.]+)\. R1 translates the PC with PAT to ([\d.]+)\. Which address is the (.+) address\?/);
    const want = { 'inside local': pc, 'inside global': pub, 'outside global': srv, 'outside local': srv }[term];
    eq(e2Right(q), want, q.q.en);
    ok(e2Right(q) !== gw, 'gateway is never the answer');
  }
  for (const q of e2Samples('ensa06', 'genPatTranslate', 300)) {
    const [, from, to] = q.q.en.match(/from (\S+) to (\S+)\. Where/);
    const rows = q.code.split('\n').slice(2).map((l) => l.trim().split(/\s+/));
    const hit = rows.filter((r) => r[1] === to && r[4] === from);
    eq(hit.length, 1, 'exactly one translation row');
    eq(e2Right(q), hit[0][2], q.q.en + '\n' + q.code);
  }
  for (const q of e2Samples('ensa06', 'genNatPool', 300)) {
    const [, a, b] = q.code.match(/ip nat pool PUBLIC ([\d.]+) ([\d.]+) netmask/);
    eq(e2Right(q), String(e2Int(b) - e2Int(a) + 1), q.code);
  }
});

test('ensa: WAN links, DSCP, Syslog, oversubscription', () => {
  for (const q of e2Samples('ensa07', 'genMeshLinks', 200)) {
    const n = Number(q.q.en.match(/(\d+) sites/)[1]);
    let links = 0;
    if (q.q.en.includes('full mesh')) { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) links++; } else links = n - 1;
    eq(e2Right(q), String(links), q.q.en);
  }
  // DSCP через биты: AFxy = xxx yy 0, CSn = nnn 000, EF = 101110.
  const bits = (name) => (name === 'EF' ? 0b101110 : name.startsWith('CS') ? Number(name[2]) << 3 : (Number(name[2]) << 3) | (Number(name[3]) << 1));
  for (const q of e2Samples('ensa09', 'genDscp', 300)) {
    const m = q.q.en.match(/DSCP value of (\w+)\?/);
    if (m) { eq(e2Right(q), String(bits(m[1])), q.q.en); continue; }
    const v = Number(q.q.en.match(/DSCP value (\d+)\?/)[1]);
    q.options.forEach((o, i) => eq(bits(e2Opt(o)) === v, i === q.answer, q.q.en + ' option ' + e2Opt(o)));
  }
  const levels = ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'];
  for (const q of e2Samples('ensa10', 'genSyslogLevel', 300)) {
    const m = q.q.en.match(/level number of "(\w+)"/);
    if (m) eq(e2Right(q), String(levels.indexOf(m[1])), q.q.en);
    else eq(e2Right(q), levels[Number(q.q.en.match(/severity level (\d)/)[1])], q.q.en);
  }
  for (const q of e2Samples('ensa10', 'genLoggingTrap', 300)) {
    const kw = q.q.en.match(/logging trap (\w+)"/)[1], n = /^\d$/.test(kw) ? Number(kw) : levels.indexOf(kw);
    ok(n >= 0, 'known level ' + kw);
    q.options.forEach((o, i) => eq(Number(e2Opt(o).match(/^%[A-Z_]+-(\d)-/)[1]) <= n, i === q.answer, q.q.en + ' option ' + e2Opt(o)));
  }
  for (const q of e2Samples('ensa11', 'genOversub', 300)) {
    const m = q.q.en.match(/(\d+) × ([\d.]+) (Gbps|Mbps) user ports and (\d+) × ([\d.]+) (Gbps|Mbps) uplinks/);
    const mb = (v, u) => Number(v) * (u === 'Gbps' ? 1000 : 1);
    const ratio = (Number(m[1]) * mb(m[2], m[3])) / (Number(m[4]) * mb(m[5], m[6]));
    ok(ratio >= 1, 'ratio at least 1:1');
    ok(Math.abs(parseFloat(e2Right(q)) - ratio) < 0.006, q.q.en + ' → ' + e2Right(q) + ' vs ' + ratio);
    ok(q.options.filter((o) => Math.abs(parseFloat(e2Opt(o)) - ratio) < 0.006).length === 1, 'one option equals the ratio');
  }
});

test('ensa: HTTP status codes, REST verbs and JSON paths', () => {
  const codes = { 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden', 404: 'Not Found', 500: 'Internal Server Error' };
  for (const q of e2Samples('ensa14', 'genHttpStatus', 300)) {
    const m = q.q.en.match(/returns HTTP (\d+)\./);
    if (m) ok(e2Right(q).startsWith(codes[m[1]] + ' —'), q.q.en + ' → ' + e2Right(q));
    else {
      const name = q.q.en.match(/means "(.+)"\?/)[1];
      eq(codes[e2Right(q)], name, q.q.en);
    }
  }
  const verbs = { 'create a new resource': 'POST', 'read (retrieve) a resource': 'GET', 'update (replace) a whole resource': 'PUT', 'update only some fields of a resource': 'PATCH', 'delete a resource': 'DELETE' };
  for (const q of e2Samples('ensa14', 'genRestVerb', 200)) {
    const op = q.q.en.match(/use to (.+)\?$/)[1];
    eq(e2Right(q), verbs[op], q.q.en);
    if (verbs[op] === 'PUT' || verbs[op] === 'PATCH') ok(!q.options.includes(verbs[op] === 'PUT' ? 'PATCH' : 'PUT'), 'PUT and PATCH never compete');
  }
  for (const q of e2Samples('ensa14', 'genJsonValue', 300)) {
    const obj = JSON.parse(q.code), m = q.q.en.match(/interfaces\[(\d)\]\.ipv4/);
    if (m) eq(e2Right(q), obj.interfaces[Number(m[1])].ipv4, q.q.en);
    else {
      const off = obj.interfaces.filter((i) => i.enabled === false);
      eq(off.length, 1, 'exactly one disabled interface');
      eq(e2Right(q), off[0].name, q.q.en);
    }
  }
});

test('ensa: all 14 ENSA modules have lessons, drills and glossary', () => {
  const ensa = COURSE.find((p) => p.id === 'ensa');
  eq(ensa.modules.filter((m) => !m.lesson).length, 0, 'no "soon" modules left in ENSA');
  for (const m of ensa.modules) {
    const l = lessonGet(m.lesson);
    ok(l, 'lesson ' + m.lesson);
    ok(l.quiz.length >= 7, m.lesson + ' has at least 7 quiz questions');
    ok(l.sections.length >= 2, m.lesson + ' has sections');
  }
  for (let n = 2; n <= 14; n++) {
    if (n === 12) continue;
    const id = 'ensa' + String(n).padStart(2, '0');
    ok(GLOSSARY.some((g) => g.lesson === id), id + ' has glossary terms');
    ok(INTERVIEW.some((x) => x.lesson === id), id + ' has interview questions');
    ok(lessonGet(id).sections.length >= 4 && lessonGet(id).sections.length <= 6, id + ' has 4–6 sections');
  }
  for (const d of ['acl', 'nat', 'ops']) ok(DRILLS.find((x) => x.id === d), 'drill ' + d);
});
