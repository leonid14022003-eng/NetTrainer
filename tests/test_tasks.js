'use strict';
// Для каждого шаблона и многих seed: старт не решён, эталонное решение решает всё.
test('task templates: start unsolved, solution solves', () => {
  const fails = [];
  for (const tpl of TASK_TEMPLATES) {
    for (let seed = 1; seed <= 25; seed++) {
      let task, topo;
      try {
        task = taskCreate(tpl.id, seed * 7919);
        topo = taskBuild(task);
      } catch (e) { fails.push(tpl.id + '#' + seed + ' build: ' + e.message); continue; }
      const before = taskCheck(topo, task);
      if (before.done) fails.push(tpl.id + '#' + seed + ' solved at start');
      try { taskApplySolution(topo, task); } catch (e) { fails.push(tpl.id + '#' + seed + ' solution: ' + e.message); continue; }
      const after = taskCheck(topo, task);
      if (!after.done) fails.push(tpl.id + '#' + seed + ' not solved: ' + after.items.filter((i) => !i.ok).map((i) => i.label.en + (i.hint ? ' [' + i.hint.en + ']' : '')).join(' | '));
      // тексты на трёх языках: задание, подсказки, проверки и их пояснения
      const texts = [task.title, task.intro, ...task.steps, ...(task.hints || []), ...(task.faults || []), ...task.checks.map((c) => c.label),
        ...before.items.map((i) => i.hint).filter(Boolean)];
      for (const t of texts) if (!t || !t.en || !t.ru || !t.he) { fails.push(tpl.id + '#' + seed + ' missing translation: ' + JSON.stringify(t)); break; }
    }
  }
  if (fails.length) throw new Error(fails.length + ' problems:\n' + fails.slice(0, 25).join('\n'));
});

test('solution text renders', () => {
  for (const tpl of TASK_TEMPLATES) {
    const task = taskCreate(tpl.id, 42);
    const topo = taskBuild(task);
    const txt = taskSolutionText(task, topo);
    ok(txt.length > 10, tpl.id + ' empty solution text');
  }
});

test('topics, levels and solution steps are trilingual', () => {
  for (const t of TASK_TOPICS) ok(t.title.he, 'topic ' + t.id + ' has no Hebrew');
  for (const l of [1, 2, 3]) ok(TASK_LEVELS[l].he, 'level ' + l + ' has no Hebrew');
  for (const tpl of TASK_TEMPLATES) {
    const task = taskCreate(tpl.id, 777);
    const topo = taskBuild(task);
    for (const st of taskSolutionSteps(task)) {
      ok(st.title.he, tpl.id + ' step title without Hebrew');
      const ex = st.explain(topo);
      ok(ex.he, tpl.id + ' step explanation without Hebrew: ' + ex.en);
    }
  }
});
