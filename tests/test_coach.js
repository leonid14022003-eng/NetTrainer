'use strict';
// Наставник: пояснения к командам, разбор ошибок, исправления действительно исправляют, пошаговое решение.

function tri3(t) { return t && t.en && t.ru && t.he; }
function forAllTasks(fn, seeds = 25) {
  for (const tpl of TASK_TEMPLATES) for (let seed = 1; seed <= seeds; seed++) fn(taskCreate(tpl.id, seed * 7919), tpl);
}

test('coach: every solution command has an explanation in three languages', () => {
  const missing = new Set();
  forAllTasks((task) => {
    for (const cmds of Object.values(task.solution.cli || {})) for (const c of cmds.concat(['enable', 'configure terminal', 'end'])) {
      const n = cmdNote(c);
      if (!tri3(n)) missing.add(c);
    }
    for (const cmds of Object.values(task.solution.exec || {})) for (const c of cmds) if (!tri3(cmdNote(c))) missing.add(c);
  });
  if (missing.size) throw new Error('no note for:\n' + [...missing].slice(0, 30).join('\n'));
});

test('coach: every failed check at the start is explained with a fix', () => {
  const fails = [];
  let custom = 0;
  forAllTasks((task, tpl) => {
    const topo = taskBuild(task);
    for (const it of taskCheck(topo, task).items) {
      if (it.ok) continue;
      if (!it.check.kind) { custom++; continue; }
      const d = checkDetails(it.check, task, topo);
      const where = tpl.id + ' / ' + it.label.en;
      if (!tri3(d.why)) fails.push(where + ': no why');
      if (!lessonGet(d.lesson)) fails.push(where + ': unknown lesson ' + d.lesson);
      if (!d.fix.length || d.fix.some((b) => !b.lines.length)) fails.push(where + ': empty fix');
      for (const b of d.fix) for (const l of b.lines) {
        if ((b.via === 'cli' || b.via === 'exec') && !tri3(l.note)) fails.push(where + ': no note for "' + l.text + '"');
        if (!l.text && !l.note) fails.push(where + ': empty line');
      }
    }
  }, 6);
  ok(custom < 30, 'few custom checks without explanation (' + custom + ')');
  if (fails.length) throw new Error([...new Set(fails)].slice(0, 25).join('\n'));
});

// Исправления, которые не зависят от других пунктов, должны сами сделать проверку зелёной.
const SELF_FIXING = ['stpRoot', 'stpBackup', 'portfast', 'bpduguard', 'ifIp', 'vlan', 'access', 'native', 'subif', 'dhcpPool', 'excluded', 'helper', 'ripV2', 'passive', 'routerId', 'hostname', 'enableSecret', 'linePw', 'banner', 'encryption', 'noLookup', 'svi', 'swGateway', 'ssh'];
test('coach: applying "how to fix" turns the check green', () => {
  const fails = [];
  let tried = 0;
  forAllTasks((task, tpl) => {
    const topo = taskBuild(task);
    for (const it of taskCheck(topo, task).items) {
      if (it.ok || !it.check.kind || !SELF_FIXING.includes(it.check.kind)) continue;
      const d = checkDetails(it.check, task, topo);
      if (d.fix.some((b) => b.via !== 'cli')) continue;
      const t2 = Object.assign(newTopology(), JSON.parse(JSON.stringify(topo)));
      touch(t2);
      for (const b of d.fix) iosRunConfig(t2, b.dev, b.lines.map((l) => l.text));
      netCommit(t2);
      tried++;
      const r = it.check.run(t2);
      if (!r.ok) fails.push(tpl.id + ' / ' + it.label.en + ' still fails: ' + (r.hint ? r.hint.en : '') + '\n   fix: ' + d.fix.map((b) => b.dev + ': ' + b.lines.map((l) => l.text).join(' | ')).join(' ;; '));
    }
  }, 8);
  ok(tried > 50, 'enough fixes were tried (' + tried + ')');
  if (fails.length) throw new Error(fails.slice(0, 15).join('\n'));
});

test('coach: solution steps are complete, explained and solve the task one by one', () => {
  const fails = [];
  forAllTasks((task, tpl) => {
    const topo = taskBuild(task);
    const steps = taskSolutionSteps(task);
    if (!steps.length) fails.push(tpl.id + ': no steps');
    for (const st of steps) {
      if (!tri3(st.title)) fails.push(tpl.id + ': step title needs 3 languages: ' + JSON.stringify(st.title));
      const ex = st.explain(topo);
      if (!ex || !ex.en || !ex.ru) fails.push(tpl.id + ': step "' + st.title.en + '" has no explanation');
      const blocks = st.lines(topo);
      if (!blocks.length || blocks.some((b) => !b.lines.length)) fails.push(tpl.id + ': step "' + st.title.en + '" has no lines');
      st.apply(topo);
    }
    const r = taskCheck(topo, task);
    if (!r.done) fails.push(tpl.id + ': not solved after all steps: ' + r.items.filter((i) => !i.ok).map((i) => i.label.en).join(' | '));
  }, 10);
  if (fails.length) throw new Error([...new Set(fails)].slice(0, 20).join('\n'));
});

test('coach: a similar task has different data but the same structure', () => {
  for (const tpl of TASK_TEMPLATES) {
    const a = taskCreate(tpl.id, 1111), b = taskCreate(tpl.id, 2222);
    eq(a.templateId, b.templateId);
    ok(JSON.stringify(a.table) !== JSON.stringify(b.table) || JSON.stringify(a.solution) !== JSON.stringify(b.solution), tpl.id + ' different data');
  }
});

test('coach: ping diagnosis names the device and what is missing', () => {
  const task = taskCreate('router-2lan', 4242);
  const topo = taskBuild(task);
  taskApplySolution(topo, task);
  const pcs = Object.entries(task.solution.pc)[0];
  topo.devices[pcs[0]].cfg.gateway = null;
  netCommit(topo);
  const res = taskCheck(topo, task).items.filter((i) => !i.ok && i.check.kind === 'ping');
  ok(res.length > 0, 'a ping fails without the gateway');
  ok(res.some((i) => i.hint && /gateway/.test(i.hint.en) && i.hint.en.includes(pcs[0])), 'hint mentions the PC and its gateway: ' + res.map((i) => i.hint && i.hint.en).join(' | '));
});
