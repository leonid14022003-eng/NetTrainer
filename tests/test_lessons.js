'use strict';
// Курс: карта, три языка, корректность вопросов, генераторы, сборка тестов, глоссарий, собеседование, тренажёры.

function tri(t) { return t && t.en && t.ru && t.he; }

function lessonTexts(lesson) {
  const out = [lesson.title, lesson.goal];
  for (const s of lesson.sections) {
    out.push(s.h);
    for (const b of s.blocks) {
      if (b.t) out.push(b.t);
      if (b.cap) out.push(b.cap);
      if (b.items) out.push(...b.items);
      if (b.head) out.push(...b.head.filter((x) => typeof x !== 'string'));
      if (b.rows) for (const r of b.rows) out.push(...r.filter((x) => typeof x !== 'string'));
    }
  }
  return out;
}

function checkQuestion(q, where, fails) {
  if (!tri(q.q)) fails.push(where + ': question needs en/ru/he');
  if (!tri(q.explain)) fails.push(where + ': explanation needs en/ru/he');
  if (q.options.length < 3) fails.push(where + ': only ' + q.options.length + ' options');
  if (!(q.answer >= 0 && q.answer < q.options.length)) fails.push(where + ': answer index out of range');
  const keys = q.options.map((o) => (typeof o === 'string' ? o : o.en));
  if (new Set(keys).size !== keys.length) fails.push(where + ': duplicate options ' + JSON.stringify(keys));
  for (const o of q.options) if (typeof o !== 'string' && !tri(o)) fails.push(where + ': option needs en/ru/he ' + JSON.stringify(o));
}

test('course: map is complete and points to real lessons', () => {
  eq(COURSE.map((p) => p.modules.length).slice(0, 3), [17, 16, 14], 'ITN 17, SRWE 16, ENSA 14 modules');
  const fails = [];
  for (const part of COURSE) {
    if (!tri(part.title)) fails.push(part.id + ': title needs 3 languages');
    for (const m of part.modules) {
      if (!tri(m.title)) fails.push(part.id + ' M' + m.n + ': title needs 3 languages');
      if (m.lesson && !lessonGet(m.lesson)) fails.push(part.id + ' M' + m.n + ': missing lesson ' + m.lesson);
    }
  }
  for (const l of LESSONS) if (!coursePartOf(l.id)) fails.push(l.id + ': not on the course map');
  for (let i = 1; i <= 17; i++) { const id = 'itn' + String(i).padStart(2, '0'); if (!lessonGet(id)) fails.push('missing ' + id); }
  if (fails.length) throw new Error(fails.join('\n'));
  eq(courseOrder().length, LESSONS.length, 'every lesson in the course order once');
});

test('course: ids unique, topics exist, all texts in three languages', () => {
  const ids = LESSONS.map((l) => l.id);
  eq(new Set(ids).size, ids.length, 'unique ids');
  const fails = [];
  for (const l of LESSONS) {
    if (l.topic && !TASK_TOPICS.find((t) => t.id === l.topic)) fails.push(l.id + ': unknown topic ' + l.topic);
    if (l.drill && !DRILLS.find((d) => d.id === l.drill)) fails.push(l.id + ': unknown drill ' + l.drill);
    if (!l.sections.length) fails.push(l.id + ': no sections');
    for (const t of lessonTexts(l)) if (!tri(t)) fails.push(l.id + ': needs en/ru/he ' + JSON.stringify(t).slice(0, 120));
    if (l.quiz.length < QUIZ_SIZE) fails.push(l.id + ': quiz bank smaller than quiz size');
  }
  if (fails.length) throw new Error(fails.slice(0, 30).join('\n'));
});

test('course: static questions are well-formed', () => {
  const fails = [];
  for (const l of LESSONS) l.quiz.forEach((q, i) => checkQuestion(q, l.id + '#' + i, fails));
  if (fails.length) throw new Error(fails.slice(0, 30).join('\n'));
});

test('course: generated questions are well-formed for many seeds', () => {
  const fails = [];
  for (const l of LESSONS) for (const g of (l.gen || [])) {
    for (let seed = 1; seed <= 300; seed++) {
      let q;
      try { q = g(makeRng(seed * 104729)); } catch (e) { fails.push(l.id + '.' + g.name + '#' + seed + ': ' + e.message); continue; }
      checkQuestion(q, l.id + '.' + g.name + '#' + seed, fails);
      if (fails.length > 20) break;
    }
  }
  if (fails.length) throw new Error(fails.slice(0, 20).join('\n'));
});

// Генераторы проверяем независимым пересчётом.
function genSamples(lessonId, name, n) {
  const g = lessonGet(lessonId).gen.find((f) => f.name === name);
  const out = [];
  for (let s = 1; s <= n; s++) out.push(g(makeRng(s * 7919)));
  return out;
}
function rightOpt(q) { const o = q.options[q.answer]; return typeof o === 'string' ? o : o.en; }

test('course: number system answers are correct', () => {
  for (const q of genSamples('itn05', 'genDecToBin', 200)) { const n = Number(q.q.en.match(/What is (\d+) in binary/)[1]); eq(parseInt(rightOpt(q), 2), n, q.q.en); }
  for (const q of genSamples('itn05', 'genBinToDec', 200)) { const b = q.q.en.match(/What is ([01]{8})/)[1]; eq(rightOpt(q), String(parseInt(b, 2)), q.q.en); }
  for (const q of genSamples('itn05', 'genHexToDec', 200)) { const h = q.q.en.match(/0x([0-9A-F]{2})/)[1]; eq(rightOpt(q), String(parseInt(h, 16)), q.q.en); }
  for (const q of genSamples('itn05', 'genDecToHex', 200)) { const n = Number(q.q.en.match(/What is (\d+) in hex/)[1]); eq(parseInt(rightOpt(q), 16), n, q.q.en); }
  for (const q of genSamples('itn05', 'genHexToBin', 200)) { const h = q.q.en.match(/0x([0-9A-F]{2})/)[1]; eq(parseInt(rightOpt(q), 2), parseInt(h, 16), q.q.en); }
});

test('course: subnetting answers are correct', () => {
  for (const q of genSamples('itn11', 'genNetwork', 200)) { const [, ip, len] = q.q.en.match(/of ([\d.]+)\/(\d+)\?/); eq(rightOpt(q), intToIp(netOf(ip, Number(len))), q.q.en); }
  for (const q of genSamples('itn11', 'genBroadcast', 200)) { const [, ip, len] = q.q.en.match(/contains ([\d.]+)\/(\d+)\?/); eq(rightOpt(q), intToIp(broadcastOf(netOf(ip, Number(len)), Number(len))), q.q.en); }
  for (const q of genSamples('itn11', 'genHosts', 100)) { const len = Number(q.q.en.match(/\/(\d+)/)[1]); eq(rightOpt(q), String(Math.pow(2, 32 - len) - 2), q.q.en); }
  for (const q of genSamples('itn11', 'genSameSubnet', 200)) {
    const [, ip, len] = q.q.en.match(/as ([\d.]+)\/(\d+)\?/);
    const L = Number(len), net = netOf(ip, L);
    q.options.forEach((o, i) => eq(inSubnet(o, ip, L) && ipToInt(o) !== net && ipToInt(o) !== broadcastOf(net, L), i === q.answer, q.q.en + ' option ' + o));
  }
  for (const q of genSamples('itn11', 'genPrefixForHosts', 200)) {
    const need = Number(q.q.en.match(/needs (\d+)/)[1]), len = Number(rightOpt(q).slice(1));
    ok(Math.pow(2, 32 - len) - 2 >= need && Math.pow(2, 31 - len) - 2 < need, q.q.en + ' → ' + rightOpt(q));
  }
  for (const q of genSamples('itn11', 'genBorrow', 200)) {
    const [, from, n] = q.q.en.match(/a \/(\d+) network by borrowing (\d+)/).map(Number);
    eq(rightOpt(q), Math.pow(2, n) + ' subnets, ' + (Math.pow(2, 32 - from - n) - 2) + ' hosts each', q.q.en);
  }
  for (const q of genSamples('ospf', 'genWildcard', 100)) { const len = Number(q.q.en.match(/\(\/(\d+)\)/)[1]); eq(wildcardToLen(rightOpt(q)), len, q.q.en); }
  for (const q of genSamples('rip', 'genRipNetwork', 200)) { const ip = q.q.en.match(/address ([\d.]+)\//)[1]; eq(rightOpt(q), 'network ' + intToIp(netOf(ip, classfulLen(ip))), q.q.en); }
});

test('course: DHCP first-lease answers are correct', () => {
  for (const q of genSamples('dhcp', 'genFirstLease', 300)) {
    const [, net, last] = q.q.en.match(/network ([\d.]+)\.0 255\.255\.255\.0, excluded [\d.]+\.1–[\d.]+\.(\d+)\./);
    eq(rightOpt(q), net + '.' + (Number(last) + 1), q.q.en);
  }
});

// Независимая проверка IPv6: разворачиваем короткую запись и сравниваем с полной.
function v6expand(s) {
  const [l, r] = s.includes('::') ? s.split('::') : [s, null];
  const L = l ? l.split(':') : [], R = r ? r.split(':') : [];
  const mid = r === null ? [] : Array(8 - L.length - R.length).fill('0');
  return L.concat(mid, R).map((x) => ('000' + x).slice(-4)).join(':');
}
test('course: IPv6 compress/expand answers are correct', () => {
  for (const q of genSamples('itn12', 'genV6Compress', 300)) {
    const full = q.q.en.match(/of ([0-9a-f:]+)\?/)[1], right = rightOpt(q);
    eq(v6expand(right), full, 'expand(' + right + ')');
    ok((right.match(/::/g) || []).length <= 1, 'one :: only');
    for (const o of q.options) if (o !== right && (o.match(/::/g) || []).length <= 1 && o.split(':').length > 2) ok(o.length >= right.length || v6expand(o) !== full, 'wrong option shorter and valid: ' + o);
  }
  for (const q of genSamples('itn12', 'genV6Expand', 300)) { const short = q.q.en.match(/Write ([0-9a-f:]+) in full/)[1]; eq(rightOpt(q), v6expand(short), q.q.en); }
});

test('course: switch forwarding and ARP answers are correct', () => {
  for (const q of genSamples('itn07', 'genSwitchForward', 300)) {
    const [, inPort, dst] = q.q.en.match(/arrives on (\S+) with destination MAC (\S+)\./);
    const table = q.code.split('\n').slice(1).map((l) => l.trim().split(/\s+/));
    const row = table.find((r) => r[1] === dst);
    const want = dst === 'ffff.ffff.ffff' || !row ? 'Flood it out all ports except ' + inPort : row[3] === inPort ? 'Drop (filter) it' : 'Forward it only out ' + row[3];
    eq(rightOpt(q), want, q.q.en);
  }
  for (const q of genSamples('itn09', 'genArpTarget', 300)) {
    const [, pc, len, gw, dst] = q.q.en.match(/PC1 is ([\d.]+)\/(\d+) with gateway ([\d.]+)\. It sends a packet to ([\d.]+)\./);
    eq(rightOpt(q), inSubnet(dst, pc, Number(len)) ? 'The MAC of ' + dst : 'The MAC of the default gateway ' + gw, q.q.en);
  }
});

test('course: longest-prefix-match answer is the most specific route', () => {
  for (const q of genSamples('static', 'genLongestMatch', 300)) {
    const dest = q.q.en.match(/to ([\d.]+)\?/)[1];
    let best = null;
    for (const line of q.code.split('\n')) {
      const [, net, len, hop] = line.match(/([\d.]+)\/(\d+) via ([\d.]+)/);
      if (inSubnet(dest, net, Number(len)) && (!best || Number(len) > best.len)) best = { len: Number(len), hop };
    }
    eq(rightOpt(q), 'via ' + best.hop, dest + '\n' + q.code);
  }
});

test('quiz: lesson quizzes have distinct questions and exactly one right option', () => {
  for (const l of LESSONS) {
    for (let seed = 1; seed <= 30; seed++) {
      const qz = quizBuild(l.id, seed * 31);
      eq(qz.questions.length, QUIZ_SIZE, l.id + ' size');
      const texts = qz.questions.map((q) => q.q.en + (q.code || ''));
      eq(new Set(texts).size, texts.length, l.id + ' distinct');
      for (const q of qz.questions) eq(q.options.filter((o) => o.correct).length, 1, l.id + ' one right');
      if ((l.gen || []).length) ok(qz.questions.some((q) => q.gen), l.id + ' has a generated question');
    }
  }
});

test('quiz: finals per part and for the whole course', () => {
  eq(JSON.stringify(quizBuild('itn11', 77)), JSON.stringify(quizBuild('itn11', 77)), 'same seed, same quiz');
  for (let seed = 1; seed <= 20; seed++) {
    const all = quizBuild('final', seed);
    eq(all.questions.length, FINAL_SIZE);
    const itn = quizBuild('final:itn', seed, 20);
    eq(itn.questions.length, 20);
    ok(itn.questions.every((q) => coursePartOf(q.lesson).id === 'itn'), 'ITN final only has ITN questions');
    ok(new Set(itn.questions.map((q) => q.lesson)).size >= 15, 'ITN final covers most modules');
  }
});

test('quiz: grading', () => {
  const qz = quizBuild('vlan', 5);
  const right = qz.questions.map((q) => q.options.findIndex((o) => o.correct));
  const all = quizGrade(qz, right);
  eq([all.correct, all.pct, all.passed], [QUIZ_SIZE, 100, true]);
  const wrong = right.map((r, i) => (i < 2 ? (r + 1) % qz.questions[i].options.length : r));
  const g2 = quizGrade(qz, wrong);
  eq([g2.correct, g2.items[0].ok, g2.items[2].ok], [QUIZ_SIZE - 2, false, true]);
  eq(quizGrade(qz, []).passed, false);
});

test('glossary and interview: three languages, linked to lessons', () => {
  ok(GLOSSARY.length >= 120, 'glossary has at least 120 terms (' + GLOSSARY.length + ')');
  ok(INTERVIEW.length >= 30, 'at least 30 interview questions');
  const fails = [];
  const ids = new Set();
  for (const g of GLOSSARY) {
    if (!tri(g.term) || !tri(g.def)) fails.push('glossary ' + g.id + ': needs en/ru/he');
    if (!lessonGet(g.lesson)) fails.push('glossary ' + g.id + ': unknown lesson ' + g.lesson);
    if (ids.has(g.id)) fails.push('glossary duplicate ' + g.id);
    ids.add(g.id);
  }
  for (const x of INTERVIEW) {
    if (!tri(x.q) || !tri(x.a)) fails.push('interview ' + x.id + ': needs en/ru/he');
    if (!lessonGet(x.lesson)) fails.push('interview ' + x.id + ': unknown lesson ' + x.lesson);
  }
  if (fails.length) throw new Error(fails.join('\n'));
});

test('drills: every generator exists and produces valid questions', () => {
  for (const d of DRILLS) {
    ok(tri(d.title), d.id + ' title');
    eq(drillGens(d).length, d.gens.length, d.id + ' all generators found');
    for (let s = 1; s <= 50; s++) {
      const q = drillQuestion(d.id, makeRng(s * 13 + d.id.length));
      eq(q.options.filter((o) => o.correct).length, 1, d.id + ' one right');
    }
  }
  const m = drillQuestion('mixed', makeRng(3));
  ok(m.q && m.options.length >= 3, 'mixed drill works');
});

// --- SRWE (srwe_2.js): каждый генератор проверяем независимым пересчётом ---
function optsEn(q) { return q.options.map((o) => (typeof o === 'string' ? o : o.en)); }
function wrongOpts(q) { return optsEn(q).filter((_, i) => i !== q.answer); }
function tableRows(code) { return code.split('\n').slice(1).map((l) => l.trim().split(/\s+/)); }

test('srwe: switch management and domain counting answers are correct', () => {
  for (const q of genSamples('srwe01', 'genSwitchMgmt', 200)) {
    const [, ip, len, v, gw] = q.q.en.match(/at ([\d.]+)\/(\d+) in VLAN (\d+), gateway ([\d.]+)\./);
    const L = Number(len), mask = intToIp((0xffffffff << (32 - L)) >>> 0);
    eq(rightOpt(q), 'interface vlan ' + v + '\n ip address ' + ip + ' ' + mask + '\n no shutdown\nip default-gateway ' + gw, q.q.en);
    ok(inSubnet(ip, gw, L) && ip !== gw, 'switch and gateway in one subnet: ' + q.q.en);
  }
  for (const q of genSamples('srwe02', 'genDomains', 300)) {
    const lines = q.code.split('\n');
    let coll = 0;
    for (const l of lines) { const m = l.match(/: (\d+) PCs(?: \+ a hub with (\d+) PCs)?$/); coll += Number(m[1]) + 1 + (m[2] ? 1 : 0); }
    eq(rightOpt(q), String(/collision/.test(q.q.en) ? coll : lines.length), q.code);
  }
});

test('srwe: STP root bridge, root port and priority answers are correct', () => {
  for (const q of genSamples('srwe05', 'genRootBridge', 300)) {
    const best = tableRows(q.code).sort((a, b) => Number(a[1]) - Number(b[1]) || parseInt(a[2].replace(/\./g, ''), 16) - parseInt(b[2].replace(/\./g, ''), 16))[0];
    eq(rightOpt(q), best[0], q.code);
  }
  const cost = { '10 Mbps': 100, '100 Mbps': 19, '1 Gbps': 4, '10 Gbps': 2 };
  for (const q of genSamples('srwe05', 'genRootPort', 300)) {
    const [, pA, sA, pB, sB, sC] = q.q.en.match(/through (\S+) \((\d+ [MG]bps)\) and to S2 through (\S+) \((\d+ [MG]bps)\)\. S2 connects to S1 over a (\d+ [MG]bps) link/);
    const cA = cost[sA], cB = cost[sB] + cost[sC];
    ok(cA !== cB, 'no tie: ' + q.q.en);
    eq(rightOpt(q), cA < cB ? pA : pB, q.q.en);
  }
  const validPrio = (n) => n % 4096 === 0 && n >= 0 && n <= 61440;
  for (const q of genSamples('srwe05', 'genBridgePriority', 300)) {
    if (/Which value can you set/.test(q.q.en)) {
      ok(validPrio(Number(rightOpt(q))), 'valid priority ' + rightOpt(q));
      for (const w of wrongOpts(q)) ok(!validPrio(Number(w)), 'invalid priority offered as wrong: ' + w);
    } else {
      const [, v, p] = q.q.en.match(/vlan (\d+) priority (\d+)"/).map(Number);
      eq(Number(rightOpt(q)), p + v, q.q.en);
    }
  }
});

test('srwe: EtherChannel mode answers are correct', () => {
  const forms = { 'active+active': 'LACP', 'active+passive': 'LACP', 'desirable+desirable': 'PAgP', 'auto+desirable': 'PAgP', 'on+on': 'static' };
  const text = { LACP: 'An EtherChannel forms using LACP', PAgP: 'An EtherChannel forms using PAgP', static: 'An EtherChannel forms without negotiation (static)', none: 'No EtherChannel forms' };
  for (const q of genSamples('srwe06', 'genEcMode', 300)) {
    const [, a, b] = q.q.en.match(/mode (\w+)"\. S2: "channel-group 1 mode (\w+)"/);
    eq(rightOpt(q), text[forms[[a, b].sort().join('+')] || 'none'], a + ' + ' + b);
  }
  const mode = { LACP: { START: 'active', RESPOND: 'passive' }, PAgP: { START: 'desirable', RESPOND: 'auto' } };
  for (const q of genSamples('srwe06', 'genEcCommand', 200)) {
    const [, n, proto, role] = q.q.en.match(/Port-channel (\d+) with (LACP|PAgP)\. This switch must (?:only )?(START|RESPOND)/);
    eq(rightOpt(q), 'channel-group ' + n + ' mode ' + mode[proto][role], q.q.en);
  }
});

test('srwe: EUI-64 and RA flag answers are correct', () => {
  for (const q of genSamples('srwe08', 'genEui64', 300)) {
    const b = q.q.en.match(/MAC ([0-9A-F-]{17})/)[1].split('-').map((x) => parseInt(x, 16));
    const bytes = [b[0] ^ 0x02, b[1], b[2], 0xff, 0xfe, b[3], b[4], b[5]];
    const hx = (n) => (n < 16 ? '0' : '') + n.toString(16);
    const id = [0, 2, 4, 6].map((i) => hx(bytes[i]) + hx(bytes[i + 1])).join(':');
    eq(rightOpt(q), id, q.q.en);
  }
  for (const q of genSamples('srwe08', 'genRaFlags', 300)) {
    let kind;
    if (q.code) kind = /managed-config-flag/.test(q.code) ? 'stateful' : /other-config-flag/.test(q.code) ? 'stateless' : 'slaac';
    else { const [, A, O, M] = q.q.en.match(/A=(\d), O=(\d), M=(\d)/).map(Number); kind = M ? 'stateful' : (A && O) ? 'stateless' : 'slaac'; }
    ok(rightOpt(q).startsWith({ slaac: 'SLAAC only', stateless: 'SLAAC for the address', stateful: 'Stateful DHCPv6' }[kind]), kind + ': ' + rightOpt(q));
  }
});

test('srwe: HSRP election and virtual MAC answers are correct', () => {
  for (const q of genSamples('srwe09', 'genHsrpActive', 300)) {
    const best = tableRows(q.code).sort((a, b) => Number(b[1]) - Number(a[1]) || ipToInt(b[2]) - ipToInt(a[2]))[0];
    eq(rightOpt(q), best[0], q.code);
  }
  for (const q of genSamples('srwe09', 'genHsrpMac', 300)) {
    const [, kind, g] = q.q.en.match(/does (HSRP version 1|HSRP version 2|VRRP) group (\d+) use/);
    const h = Number(g).toString(16);
    const want = { 'HSRP version 1': '0000.0c07.ac' + h.padStart(2, '0'), 'HSRP version 2': '0000.0c9f.f' + h.padStart(3, '0'), VRRP: '0000.5e00.01' + h.padStart(2, '0') }[kind];
    eq(rightOpt(q), want, q.q.en);
  }
});

test('srwe: LAN security and port security answers are correct', () => {
  const pairs = [[/macof/, 'Port security'], [/using DTP/, 'Disable DTP'], [/two 802\.1Q tags/, 'Use an unused VLAN as the native VLAN'], [/rogue DHCP/, 'DHCP snooping'],
    [/gratuitous ARP/, 'Dynamic ARP Inspection'], [/never gave it/, 'IP Source Guard'], [/BPDUs with priority 0/, 'BPDU Guard'], [/CDP messages/, 'Disable CDP']];
  for (const q of genSamples('srwe10', 'genAttackMitigation', 200)) {
    const p = pairs.find(([re]) => re.test(q.q.en));
    ok(p && rightOpt(q).startsWith(p[1]), q.q.en + ' → ' + rightOpt(q));
  }
  for (const q of genSamples('srwe11', 'genPortSecurity', 300)) {
    const max = Number(q.code.match(/maximum (\d+)/)[1]), learned = Number(q.q.en.match(/already learned (\d+) secure/)[1]);
    const mode = (q.code.match(/violation (\w+)/) || [null, 'shutdown'])[1];
    const want = learned < max ? 'The frame is forwarded' : { protect: 'The frame is dropped silently', restrict: 'The frame is dropped, a syslog', shutdown: 'The port goes err-disabled' }[mode];
    ok(rightOpt(q).startsWith(want), q.code + ' learned ' + learned + ' → ' + rightOpt(q));
  }
});

test('srwe: Wi-Fi channel and standard answers are correct', () => {
  for (const q of genSamples('srwe12', 'genWifiChannel', 300)) {
    const c = Number(q.q.en.match(/channel (\d+) \(channels/)[1]), r = Number(rightOpt(q));
    ok(r >= 1 && r <= 11 && Math.abs(r - c) >= 5, 'channel ' + r + ' vs ' + c);
    for (const w of wrongOpts(q)) ok(Math.abs(Number(w) - c) < 5, 'wrong option ' + w + ' must overlap ' + c);
  }
  const band = { '802.11a': '5 GHz', '802.11b': '2.4 GHz', '802.11g': '2.4 GHz', '802.11n': '2.4 GHz and 5 GHz', '802.11ac': '5 GHz' };
  const gen = { 'Wi-Fi 4': '802.11n', 'Wi-Fi 5': '802.11ac', 'Wi-Fi 6': '802.11ax' };
  for (const q of genSamples('srwe12', 'genWifiStandard', 300)) {
    const m = q.q.en.match(/frequency band does (802\.11\w+) use/);
    eq(rightOpt(q), m ? band[m[1]] : gen[q.q.en.match(/marketed as (Wi-Fi \d)/)[1]], q.q.en);
  }
});

test('srwe: route selection and routing-table entry answers are correct', () => {
  const ad = { 'Static route': 1, eBGP: 20, EIGRP: 90, OSPF: 110, 'IS-IS': 115, RIP: 120, 'External EIGRP': 170, iBGP: 200 };
  for (const q of genSamples('srwe14', 'genAdWinner', 300)) {
    const names = q.q.en.match(/from: (.+)\. Which/)[1].split(', ');
    eq(rightOpt(q), names.slice().sort((a, b) => ad[a] - ad[b])[0], q.q.en);
  }
  const src = { O: ['OSPF', 110], D: ['EIGRP', 90], R: ['RIP', 120], S: ['Static route', 1] };
  for (const q of genSamples('srwe14', 'genRouteEntry', 300)) {
    const [, code, , , a, metric, nh, iface] = q.code.match(/^(\w)\s+([\d.]+)\/(\d+) \[(\d+)\/(\d+)\] via ([\d.]+)(?:, [\d:]+, (\S+))?$/);
    eq(Number(a), src[code][1], 'AD matches the route code: ' + q.code);
    const field = q.q.en.match(/what is the (.+)\?/)[1];
    const want = { 'administrative distance': a, metric, 'next-hop address': nh, 'exit interface': iface, 'route source': src[code][0] }[field];
    eq(rightOpt(q), want, field + ' of ' + q.code);
  }
});

test('srwe: static route troubleshooting answers are correct', () => {
  for (const q of genSamples('srwe16', 'genNextHop', 300)) {
    const [, ip, len, nh] = q.q.en.match(/G0\/0\/1 is ([\d.]+)\/(\d+) .*ip route [\d.]+ [\d.]+ ([\d.]+)"/);
    const L = Number(len), net = netOf(ip, L), bc = broadcastOf(net, L), n = ipToInt(nh);
    const valid = inSubnet(nh, ip, L) && n !== net && n !== bc && nh !== ip;
    ok(rightOpt(q).startsWith(valid ? 'Yes — the next hop is in a connected subnet' : 'No — the next hop is not reachable'), q.q.en + ' → ' + rightOpt(q));
  }
  const ad = { OSPF: 110, EIGRP: 90, RIP: 120, eBGP: 20 };
  for (const q of genSamples('srwe16', 'genFloatingAd', 300)) {
    const p = q.q.en.match(/via (OSPF|EIGRP|RIP|eBGP)\./)[1], r = Number(rightOpt(q));
    ok(r > ad[p] && r < 255, p + ' backup AD ' + r);
    for (const w of wrongOpts(q)) ok(Number(w) < ad[p], p + ': wrong AD ' + w + ' must be lower');
  }
});
