'use strict';
// Помощники обучения: повторения, тетрадь ошибок, план дня, экзамен, слияние прогресса,
// калькулятор подсетей, подсказки CLI, демонстрации, разбор ответа на собеседовании.

const NOW = new Date(2026, 9, 20, 10, 0, 0).getTime();

test('srs: knew moves the card up and later, forgot sends it back today', () => {
  let c = srsReview(undefined, true, NOW);
  eq([c.box, c.due - NOW], [1, DAY_MS], 'first "knew" → box 1, tomorrow');
  c = srsReview(c, true, NOW + DAY_MS);
  eq([c.box, c.due - (NOW + DAY_MS)], [2, 3 * DAY_MS]);
  c = srsReview(c, true, NOW + 4 * DAY_MS);
  eq(c.box, 3);
  const c2 = srsReview(c, true, NOW + 11 * DAY_MS);
  eq([c2.box, c2.due - (NOW + 11 * DAY_MS)], [3, 21 * DAY_MS], 'known cards come back after 3 weeks');
  const f = srsReview(c2, false, NOW + 40 * DAY_MS);
  eq([f.box, f.due], [0, NOW + 40 * DAY_MS]);
  eq(srsCard(2), { box: 2, due: 0, t: 0 }, 'old numeric format is migrated');
});

test('srs: due list puts overdue cards first, then at most N new ones', () => {
  const cards = { a: { box: 1, due: NOW - DAY_MS, t: NOW - 2 * DAY_MS }, b: { box: 2, due: NOW + 5 * DAY_MS, t: NOW - DAY_MS }, c: { box: 1, due: NOW - 3 * DAY_MS, t: NOW - 4 * DAY_MS } };
  const ids = srsDueIds(cards, ['a', 'b', 'c', 'n1', 'n2', 'n3'], NOW, 2);
  eq(ids, ['c', 'a', 'n1', 'n2']);
});

function sampleQuestion(lesson) {
  return quizPrepare(Object.assign({ lesson }, lessonGet(lesson).quiz[0]), makeRng(5));
}

test('mistakes: question is added, repeated wrong answers count, 3 right in a row masters it', () => {
  const book = {};
  const q = sampleQuestion('itn01');
  const id = mistakeAddQuestion(book, q, NOW);
  eq(mistakeAddQuestion(book, q, NOW + 1), id, 'same question → same record');
  eq(book[id].wrong, 2);
  eq(mistakeDue(book, NOW).length, 1);
  eq(mistakeAnswer(book, id, true, NOW), 'later');
  eq(mistakeDue(book, NOW).length, 0, 'answered right → not due today any more');
  eq(mistakeAnswer(book, id, false, NOW + DAY_MS), 'again');
  eq(book[id].streak, 0);
  mistakeAnswer(book, id, true, NOW + 2 * DAY_MS);
  mistakeAnswer(book, id, true, NOW + 3 * DAY_MS);
  eq(mistakeAnswer(book, id, true, NOW + 4 * DAY_MS), 'mastered');
  ok(book[id].done && !book[id].q, 'mastered record keeps only a small tombstone');
  eq(mistakeActive(book).length, 0);
});

test('mistakes: failed training checks are grouped per task and cleared when it is solved', () => {
  const book = {};
  const task = taskCreate('router-2lan', 7);
  const r = taskCheck(taskBuild(task), task);
  const failed = r.items.filter((x) => !x.ok).map((x) => x.label);
  ok(failed.length > 0);
  mistakeAddTask(book, task, failed, NOW);
  mistakeAddTask(book, task, failed, NOW + 5);
  const rec = book['task:router-2lan'];
  eq([rec.kind, rec.wrong, rec.topic], ['task', 2, 'basics']);
  ok(rec.labels.length <= 5 && rec.labels[0].he, 'labels are kept in three languages');
  ok(mistakeTaskSolved(book, 'router-2lan', NOW + 10));
  eq(mistakeActive(book).length, 0);
});

test('mistakes: the notebook never grows past its limit', () => {
  const book = {};
  for (let i = 0; i < MISTAKE_ACTIVE_MAX + 30; i++) {
    const q = quizPrepare(Object.assign({ lesson: 'itn11' }, lessonGet('itn11').gen[0](makeRng(1000 + i))), makeRng(i));
    mistakeAddQuestion(book, q, NOW + i);
  }
  eq(mistakeActive(book).length, MISTAKE_ACTIVE_MAX);
  ok(JSON.stringify(book).length < 200000, 'fits into one sync document');
});

test('today plan: goals, progress and the weak topic', () => {
  const book = {};
  const q = sampleQuestion('itn02');
  mistakeAddQuestion(book, q, NOW);
  const act = {};
  let plan = todayPlan({ cards: {}, glossaryIds: GLOSSARY.map((g) => g.id), book, act, nextLesson: 'itn01', weakTopic: 'vlan' }, NOW);
  eq(plan.steps.map((s) => s.id), ['cards', 'mistakes', 'task', 'lesson', 'iv']);
  eq(plan.steps[0].goal, 5, 'only 5 new cards on an empty deck');
  eq(plan.steps[1].goal, 1);
  eq(plan.count, 0);
  actBump(act, 'cards', NOW, 10); actBump(act, 'tasks', NOW); actBump(act, 'quiz', NOW); actBump(act, 'iv', NOW);
  mistakeAnswer(book, mistakeIdForQuestion(q), true, NOW);
  actBump(act, 'mistakes', NOW);
  plan = todayPlan({ cards: {}, glossaryIds: GLOSSARY.map((g) => g.id), book, act, nextLesson: 'itn01', weakTopic: 'vlan' }, NOW);
  ok(plan.done, 'everything done → plan complete');
  eq(actStreak(act, NOW), 1);
  eq(actStreak({ [dayKey(NOW - DAY_MS)]: { cards: 1 } }, NOW), 1, 'today not started yet — yesterday still counts');
  const topics = TASK_TOPICS.map((t) => t.id);
  const book2 = {};
  mistakeAddTask(book2, taskCreate('ospf', 3), [T('a', 'b', 'c')], NOW);
  eq(weakTopicOf(book2, {}, topics, TASK_TEMPLATES), 'ospf');
});

test('mock exam: 100 different questions, graded by part and lesson', () => {
  const ex = examBuild('all', 100, 4242);
  eq(ex.n, 100);
  eq(ex.seconds, 7200, '72 s per question like CCNA');
  const keys = new Set(ex.questions.map((q) => q.q.en + '|' + (q.code || '')));
  ok(keys.size >= 95, 'questions are almost all different, got ' + keys.size);
  ok(new Set(ex.questions.map((q) => coursePartOf(q.lesson).id)).size >= 3, 'questions come from every part');
  ex.answers = ex.questions.map((q, i) => (i % 2 ? q.options.findIndex((o) => o.correct) : q.options.findIndex((o) => !o.correct)));
  const g = examGrade(ex);
  eq([g.correct, g.pct, g.passed], [50, 50, false]);
  ok(g.weak.length > 0 && g.weak[0].ok < g.weak[0].total);
  const sum = Object.values(g.byPart).reduce((a, x) => a + x.total, 0);
  eq(sum, 100);
  const itn = examBuild('itn', 30, 7);
  ok(itn.questions.every((q) => coursePartOf(q.lesson).id === 'itn'), 'part exam stays in its part');
});

test('sync merge: phone and computer progress are combined, newest wins per item', () => {
  const phone = {
    learn: { cur: 'itn05', passed: { itn01: true }, best: { itn01: 80, itn02: 50 }, days: ['2026-10-18'], open: {}, t: 200 },
    cards: { arp: { box: 2, due: 5, t: 300 }, dns: 1 },
    ivRate: { iv1: { r: 'good', t: 50 } },
    drillBest: { subnet: 7 },
    stats: { solved: { rip: 2 }, total: 2, checks: 9 },
    mistakes: { qa: { id: 'qa', kind: 'q', t: 10 }, qb: { id: 'qb', done: true, t: 90 } },
    activity: { '2026-10-18': { cards: 4 } },
    exams: [{ id: 'x1', date: 1, pct: 70 }],
  };
  const mac = {
    learn: { cur: 'vlan', passed: { itn02: true }, best: { itn01: 60, itn02: 90 }, days: ['2026-10-19'], open: { srwe: true }, t: 100 },
    cards: { arp: { box: 0, due: 1, t: 100 }, ospf: { box: 1, due: 2, t: 10 } },
    ivRate: { iv1: 'no', iv2: { r: 'part', t: 5 } },
    drillBest: { subnet: 3, ports: 4 },
    stats: { solved: { rip: 1, ospf: 1 }, total: 2, checks: 12 },
    mistakes: { qb: { id: 'qb', kind: 'q', t: 20 }, qc: { id: 'qc', kind: 'q', t: 30 } },
    activity: { '2026-10-18': { cards: 2, iv: 1 }, '2026-10-19': { tasks: 1 } },
    exams: [{ id: 'x2', date: 2, pct: 85 }, { id: 'x1', date: 1, pct: 70 }],
  };
  const m = mergeProgress(phone, mac);
  eq(m.learn.passed, { itn01: true, itn02: true });
  eq(m.learn.best, { itn01: 80, itn02: 90 });
  eq(m.learn.days, ['2026-10-18', '2026-10-19']);
  eq(m.learn.cur, 'itn05', 'page position follows the newer device');
  eq(m.cards.arp.t, 300);
  eq(m.cards.dns, { box: 1, due: 0, t: 0 });
  eq(m.cards.ospf.box, 1);
  eq(m.ivRate.iv1.r, 'good');
  eq(m.drillBest, { subnet: 7, ports: 4 });
  eq(m.stats, { solved: { rip: 2, ospf: 1 }, total: 2, checks: 12 });
  ok(m.mistakes.qb.done, 'a mistake fixed on one device stays fixed');
  ok(m.mistakes.qa && m.mistakes.qc);
  eq(m.activity['2026-10-18'], { cards: 4, iv: 1 });
  eq(m.exams.map((x) => x.id), ['x1', 'x2']);
  eq(JSON.stringify(mergeProgress(m, m)), JSON.stringify(m), 'merging twice changes nothing');
  eq(mergeProgress({}, { stats: { total: 1 } }).stats, { total: 1 });
});

test('subnet calculator: network, broadcast, hosts and binary', () => {
  const s = subnetInfo('192.168.1.100', 26);
  eq([s.network, s.broadcast, s.first, s.last, s.hosts, s.mask, s.wildcard], ['192.168.1.64', '192.168.1.127', '192.168.1.65', '192.168.1.126', 62, '255.255.255.192', '0.0.0.63']);
  eq([s.cls, s.kind, s.block.octet, s.block.size], ['C', 'private', 4, 64]);
  eq(s.bits.ip.slice(24), '01100100');
  eq(subnetInfo('10.1.2.3', 30).hosts, 2);
  eq(subnetInfo('10.1.2.3', 31).hosts, 2);
  eq(subnetInfo('10.1.2.3', 32).hosts, 1);
  eq(subnetInfo('172.20.5.9', 20).network, '172.20.0.0');
  eq(subnetInfo('172.20.5.9', 20).block, { octet: 3, maskValue: 240, size: 16 });
  eq(subnetInfo('8.8.8.8', 8).kind, 'public');
  eq(parseIpPrefix('10.0.0.5 /24'), { ip: '10.0.0.5', len: 24 });
  eq(parseIpPrefix('10.0.0.5 255.255.255.252'), { ip: '10.0.0.5', len: 30 });
  eq(parseIpPrefix('172.16.4.1'), { ip: '172.16.4.1', len: 16 });
  eq(parseIpPrefix('10.0.0.5 255.0.255.0'), null);
  ok(subnetInfo('192.168.1.64', 26).isNetwork && subnetInfo('192.168.1.127', 26).isBroadcast);
});

test('cli hints: modes, next commands and IOS messages explained in 3 languages', () => {
  const topo = newTopology();
  addDevice(topo, '1941', 0, 0, { id: 'R1', name: 'R1' });
  const sess = iosNewSession(topo, 'R1');
  eq(cliHelp(topo.devices.R1, sess, '').mode.en.slice(0, 5), 'Press');
  sess.started = true;
  let hlp = cliHelp(topo.devices.R1, sess, '');
  has(hlp.mode.en, 'User EXEC');
  eq(hlp.next[0], 'enable');
  iosExec(topo, sess, 'enable'); iosExec(topo, sess, 'configure terminal');
  hlp = cliHelp(topo.devices.R1, sess, '');
  eq(hlp.next[0], 'interface Gi0/0', 'suggests a real free interface');
  iosExec(topo, sess, 'interface g0/0');
  hlp = cliHelp(topo.devices.R1, sess, '');
  eq(hlp.next.slice(0, 2), ['ip address ', 'no shutdown']);
  const bad = iosExec(topo, sess, 'ip adress 1.1.1.1 255.0.0.0');
  hlp = cliHelp(topo.devices.R1, sess, bad.out);
  eq(hlp.msg.kind, 'err');
  ok(hlp.msg.text.ru && hlp.msg.text.he);
  iosExec(topo, sess, 'ip address 10.0.0.1 255.255.255.0');
  iosExec(topo, sess, 'no shutdown');
  hlp = cliHelp(topo.devices.R1, sess, '');
  eq(hlp.next[0], 'description ', 'address set and interface on → no more ip/no shutdown hints');
  eq(cliHelp(topo.devices.R1, sess, 'Success rate is 80 percent (4/5)').msg.kind, 'info');
  eq(cliHelp(topo.devices.R1, sess, 'Success rate is 100 percent (5/5)').msg.kind, 'ok');
  for (const [, , t] of CLI_MESSAGES) ok(t.en && t.ru && t.he, 'message needs 3 languages: ' + t.en);
  for (const t of Object.values(CLI_MODE_INFO)) ok(t.en && t.ru && t.he);
});

test('demos: every demo builds and shows the expected packets', () => {
  ok(DEMOS.length >= 6);
  for (const d of DEMOS) {
    ok(d.title.he && d.intro.he, d.id + ' needs 3 languages');
    for (const l of d.lessons) ok(lessonGet(l), d.id + ': unknown lesson ' + l);
    const topo = demoBuild(d);
    const r = demoRun(topo, d);
    ok(r.events.length > 3, d.id + ': too few events');
    const protos = new Set(r.events.map((e) => e.proto));
    if (d.id === 'dhcp') { ok(protos.has('DHCP'), 'DORA shown'); eq(r.results[0].ok, true); eq(r.results[1].status, 'reply'); }
    else ok(protos.has('ARP') && protos.has('ICMP'), d.id + ': ARP and ICMP shown');
    const last = r.results[r.results.length - 1];
    if (d.id === 'vlan') { eq(r.results[0].status, 'reply'); ok(last.status !== 'reply', 'different VLANs are isolated'); }
    else if (d.id !== 'dhcp') eq(last.status, 'reply', d.id + ': last ping must succeed');
    const steps = r.events.map((e) => e.step);
    ok(steps.every((s, i) => i === 0 || s >= 0), 'steps are numbered');
  }
  eq(demosForLesson('dhcp').map((d) => d.id), ['dhcp']);
});

test('interview: local check finds covered and missed key points', () => {
  const iv = INTERVIEW.find((x) => x.q.en.startsWith('What is the difference between TCP and UDP'));
  const pts = interviewKeyPoints(iv.a.en, GLOSSARY);
  ok(pts.some((p) => p.label === 'TCP') && pts.some((p) => p.label === 'UDP'));
  const r = interviewCheckLocal(iv.a.en, 'TCP is reliable and uses a three-way handshake, UDP is faster. DNS uses UDP.', GLOSSARY);
  ok(r.covered.includes('TCP') && r.covered.includes('UDP') && r.covered.includes('DNS'));
  ok(r.missed.length > 0 && r.score > 0 && r.score < 100);
  const ru = interviewCheckLocal(iv.a.en, 'TCP надёжный, трёхэтапное рукопожатие', GLOSSARY);
  ok(ru.covered.includes('Three-way handshake'), 'Russian term counts too: ' + JSON.stringify(ru));
  eq(interviewCheckLocal(iv.a.en, '', GLOSSARY).score, 0);
});

test('simulation captions: every step of every demo gets a trilingual caption', () => {
  const kinds = new Set();
  for (const d of DEMOS) {
    const topo = demoBuild(d);
    const r = demoRun(topo, d);
    const steps = [...new Set(r.events.map((e) => e.step))];
    for (const s of steps) {
      const evs = r.events.filter((e) => e.step === s);
      const c = simCaption(topo, evs);
      ok(c && c.en && c.ru && c.he, d.id + ' step ' + s + ' has a caption');
      ok(!/undefined|NaN/.test(c.en + c.ru + c.he), d.id + ' step ' + s + ': ' + c.en);
      kinds.add(evs[0].proto + (evs[0].fail ? '-fail' : ''));
    }
  }
  ok(kinds.has('ARP') && kinds.has('ICMP') && kinds.has('DHCP'), [...kinds].join(','));
  eq(simCaption(demoBuild(DEMOS[0]), []), null);
});

test('interview: standards like 802.1Q count as one key point', () => {
  const pts = interviewKeyPoints('A trunk carries many VLANs; frames get an 802.1Q tag with the VLAN ID.', GLOSSARY);
  ok(pts.some((p) => p.label === '802.1Q'), JSON.stringify(pts.map((p) => p.label)));
  ok(!pts.some((p) => p.label === '802' || p.label === 'ID'));
  const r = interviewCheckLocal('A trunk carries many VLANs; frames get an 802.1Q tag with the VLAN ID.', 'the trunk adds a dot1q tag', GLOSSARY);
  ok(r.covered.includes('802.1Q'), JSON.stringify(r));
});

test('interview ratings keep their question after the 27.10 shift', () => {
  // прежние 72 вопроса снова iv1–iv72 по порядку, новые — с постоянными id
  const ids = INTERVIEW.map((x) => x.id);
  eq(new Set(ids).size, ids.length, 'ids are unique');
  const numbered = INTERVIEW.filter((x) => /^iv\d+$/.test(x.id));
  eq(numbered.length, 72, 'the numbered questions are exactly the 72 from before 27.10');
  numbered.forEach((x, i) => eq(x.id, 'iv' + (i + 1)));
  eq(INTERVIEW.find((x) => x.id === 'iv14').q.en, 'What is DNS?');
  eq(INTERVIEW.find((x) => x.id === 'iv38').q.en, 'How do you configure SSH on a Cisco switch?', 'srwe_2 questions keep their numbers too');
  ok(/DHCP pool/.test(INTERVIEW.find((x) => x.id === 'iv-dhcp-pool').q.en));
  const S = IV_SHIFT_FROM;
  const fixed = ivRateFix({
    iv14: { r: 'no', t: S - 1000 },     // поставлена до сдвига — номер верный
    iv13: { r: 'good', t: S + 10 },     // до iv14 номера не сдвигались
    iv14x: 'part',
    iv15: { r: 'part', t: S + 20 },     // в версии со сдвигом iv15 = вопрос про опции DHCP
    iv17: { r: 'good', t: S + 30 },     // в версии со сдвигом iv17 = «What is DNS?» → iv14, новее старой оценки
    iv41: { r: 'part', t: S + 35 },     // в версии со сдвигом iv41 = первый вопрос srwe_2 → iv38
    iv20: { r: 'no', t: S + 40, v: 2 }, // уже на постоянных id
  });
  eq(fixed.iv14, { r: 'good', t: S + 30, v: 2 });
  eq(fixed.iv13.r, 'good');
  eq(fixed['iv-dhcp-options'], { r: 'part', t: S + 20, v: 2 });
  eq(fixed.iv38, { r: 'part', t: S + 35, v: 2 });
  eq(fixed.iv20.r, 'no');
  ok(!fixed.iv15 && !fixed.iv17 && !fixed.iv41, 'shifted keys moved');
  eq(fixed.iv14x, { r: 'part', t: 0 });
  eq(JSON.stringify(ivRateFix(fixed)), JSON.stringify(fixed), 'running the fix again changes nothing');
  // телефон ещё со сдвинутыми номерами, компьютер уже исправлен — после слияния всё на постоянных id
  const m = mergeProgress({ ivRate: { iv17: { r: 'part', t: S + 50 } } }, { ivRate: fixed });
  eq(m.ivRate.iv14, { r: 'part', t: S + 50, v: 2 });
  ok(!m.ivRate.iv17, 'no stale shifted key after merge');
});

test('progress export / import: pack, unpack, merge', () => {
  const data = {
    learn: { passed: { itn01: true, 'final:itn': true }, best: { itn01: 90 }, days: ['2026-10-28', '2026-10-29'], t: 10 },
    cards: { arp: { box: 2, due: 5, t: 300 } },
    ivRate: { iv1: { r: 'good', t: 50, v: 2 } },
    stats: { solved: { rip: 2 }, total: 2, checks: 9 },
    mistakes: { qa: { id: 'qa', kind: 'q', t: 10 }, qb: { id: 'qb', done: true, t: 9 } },
    exams: [{ id: 'x1', date: 1, pct: 70 }],
    prefs: { theme: 'dark' },   // не прогресс — в файл не попадает
  };
  const text = progressPack(data, 1234);
  const back = progressUnpack(text);
  eq(back.t, 1234);
  eq(back.data.cards, data.cards);
  ok(!('prefs' in back.data), 'only progress keys are exported');
  eq(progressSummary(back.data), { lessons: 1, cards: 1, interview: 1, tasks: 2, mistakes: 1, exams: 1, days: 2 });
  eq(progressUnpack('{"devices":{}}'), null, 'a network project is not progress');
  eq(progressUnpack('not json'), null);
  eq(progressUnpack('  ' + text + '\n').t, 1234, 'spaces around pasted text are fine');
  // импорт сливается с тем, что уже есть, ничего не теряя
  const here = { learn: { passed: { itn02: true }, best: { itn01: 60 }, days: ['2026-10-29'], t: 20 }, cards: { dns: { box: 1, due: 2, t: 400 } } };
  const m = mergeProgress(here, back.data);
  eq(m.learn.passed, { itn02: true, itn01: true, 'final:itn': true });
  eq(m.learn.best.itn01, 90);
  ok(m.cards.arp && m.cards.dns, 'cards from both sides');
});
