'use strict';
// Вкладка Training: случайные задания на английском с переводом на русский и иврит, проверка, подсказки, решение.

const Training = {
  filters: { topic: 'all', level: 'all' },
  hints: 0,
  example: null, // похожее задание, решаемое по шагам: { task, topo, steps, idx, result, open }

  init() {
    this.filters = Object.assign(this.filters, Store.get('trainFilters', {}));
    this.stats = Store.get('stats', { solved: {}, total: 0, checks: 0 });
    this.initResizer();
  },

  initResizer() {
    const side = document.getElementById('side');
    const grip = document.getElementById('sidegrip');
    const w = Store.get('sideWidth', 470);
    side.style.width = w + 'px';
    grip.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const sx = e.clientX, sw = side.getBoundingClientRect().width;
      const mv = (ev) => { side.style.width = Math.max(300, Math.min(window.innerWidth * 0.6, sw + sx - ev.clientX)) + 'px'; };
      const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); Store.set('sideWidth', side.getBoundingClientRect().width); App.queueRender(); };
      document.addEventListener('mousemove', mv);
      document.addEventListener('mouseup', up);
    });
  },

  ensureTask() { if (!App.training) this.newTask(true); },

  // Переключатели языков EN / RU / HE (хотя бы один всегда включён)
  langToggles() {
    const mk = (key, label, title) => h('label', { class: 'rutoggle', title },
      h('input', { type: 'checkbox', checked: App.prefs[key] !== false, onchange: (e) => {
        App.prefs[key] = e.target.checked;
        if (App.prefs.en === false && !App.prefs.ru && !App.prefs.he) App.prefs.en = true;
        App.queueSave(); this.render();
      } }), ' ' + label);
    return h('span', { class: 'ltoggles' }, mk('en', 'EN', 'English'), mk('ru', 'RU', 'Русский'), mk('he', 'HE', 'עברית'));
  },

  // Задание бросили нерешённым после красной проверки или подсмотрели решение — оно попадает в тетрадь ошибок.
  noteMistake(tr) {
    if (!tr || tr.solvedNow || !tr.failed || !tr.failed.length || tr.noted) return;
    tr.noted = true;
    Learn.book = Store.get('mistakes', {});
    mistakeAddTask(Learn.book, tr.task, tr.failed, Date.now());
    Store.set('mistakes', Learn.book);
  },

  setTask(task) {
    this.noteMistake(App.training);
    if (this.example) this.closeExampleWindows();
    this.example = null;
    if (App.training) for (const [k, w] of DevWin.wins) if (k.startsWith('t|')) w.win.close();
    const topo = taskBuild(task);
    App.training = { task, topo, result: null };
    App.undoStacks.training = []; App.redoStacks.training = [];
    App.vp.training = { x: 0, y: 0, z: 1 };
    this.hints = 0;
    App.saveNow();
    if (App.view === 'training') { this.render(); App.queueRender(); setTimeout(() => Workspace.fit(), 50); }
  },

  newTask(silent) {
    const task = taskRandom(this.filters.topic, this.filters.level);
    if (!task) { toast('No tasks for this filter'); return; }
    this.setTask(task);
    if (!silent) toast('🎲 ' + triText(task.title));
  },

  async restart() {
    if (!App.training) return;
    const ok = await dialog({ title: triText(T('Restart task', 'Начать заново', 'להתחיל מחדש')), body: bi(T('Reset the network to the initial state of this task?', 'Вернуть сеть к начальному состоянию задания?', 'להחזיר את הרשת למצב ההתחלתי של המשימה?')),
      buttons: [{ label: triText(T('Yes', 'Да', 'כן'), ' / '), primary: true, value: true }, { label: triText(T('No', 'Нет', 'לא'), ' / '), value: false }] });
    if (!ok) return;
    const t = App.training.task;
    this.setTask(taskCreate(t.templateId, t.seed));
  },

  pickDialog() {
    const box = h('div', { class: 'picklist' });
    let m = null;
    for (const topic of TASK_TOPICS) {
      const list = TASK_TEMPLATES.filter((t) => t.topic === topic.id);
      box.appendChild(h('div', { class: 'pickhdr' }, triText(topic.title)));
      for (const tpl of list) {
        const sample = taskCreate(tpl.id, 1);
        const solved = this.stats.solved[tpl.id] || 0;
        box.appendChild(h('div', { class: 'pickrow', onclick: () => { m.close(); this.setTask(taskCreate(tpl.id, Math.floor(Math.random() * 1e9) + 1)); } },
          h('span', { class: 'lvl l' + tpl.level }, triText(TASK_LEVELS[tpl.level], ' · ')), bi(sample.title, 'picktitle'), solved ? h('span', { class: 'done' }, ' ✓' + solved) : null));
      }
    }
    m = modal(triText(T('All tasks', 'Все задания', 'כל המשימות')), box, 660);
  },

  check() {
    const tr = App.training;
    if (!tr) return;
    netCommit(tr.topo);
    tr.result = taskCheck(tr.topo, tr.task);
    this.stats.checks++;
    tr.failed = tr.result.items.filter((it) => !it.ok).map((it) => it.label);
    if (tr.result.done && !tr.solvedNow) {
      tr.solvedNow = true;
      this.stats.solved[tr.task.templateId] = (this.stats.solved[tr.task.templateId] || 0) + 1;
      this.stats.total++;
      Learn.book = Store.get('mistakes', {});
      if (mistakeTaskSolved(Learn.book, tr.task.templateId, Date.now())) { Store.set('mistakes', Learn.book); toast('📕 ' + triText(T('Fixed — removed from your Mistakes notebook', 'Исправлено — убрано из тетради ошибок', 'תוקן — הוסר ממחברת הטעויות'))); }
      Learn.bump('tasks');
      Learn.markDay();
    }
    Store.set('stats', this.stats);
    this.render();
    const box = document.querySelector('#trainpanel .results');
    if (box) box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  hint() {
    const tr = App.training;
    if (!tr) return;
    this.hints = Math.min((tr.task.hints || []).length, this.hints + 1);
    this.render();
  },

  async showSolution(asFile) {
    const tr = App.training;
    if (!tr) return;
    if (!tr.solvedNow && !tr.failed) tr.failed = taskCheck(tr.topo, tr.task).items.filter((it) => !it.ok).map((it) => it.label);
    this.noteMistake(tr);
    const text = taskSolutionText(tr.task, tr.topo);
    if (asFile) { downloadText('solution-' + tr.task.templateId + '.txt', text); return; }
    const pre = h('pre', { class: 'mono solution' }, text);
    const r = await dialog({ title: triText(T('Solution', 'Решение', 'פתרון')), w: 640, body: h('div', null,
      tr.task.faults ? h('div', { class: 'faults' }, h('b', null, tri('What was broken', 'Что было сломано', 'מה היה תקול')), tr.task.faults.map((f) => bi(f))) : null,
      h('div', { class: 'muted' }, bi(T('Try to solve it yourself first!', 'Сначала попробуйте решить сами!', 'קודם נסו לפתור לבד!'))), pre),
      buttons: [{ label: triText(T('Apply solution automatically', 'Применить решение', 'להחיל את הפתרון'), ' · '), value: 'apply' }, { label: triText(T('Close', 'Закрыть', 'סגירה'), ' · '), primary: true, value: null }] });
    if (r === 'apply') {
      App.checkpoint();
      taskApplySolution(tr.topo, tr.task);
      App.changed();
      this.check();
    }
  },

  renderTable(body, t) {
    if (!t.table || !t.table.length) return;
    body.appendChild(h('div', { class: 'sechdr' }, tri('Addressing Table', 'Таблица адресации', 'טבלת כתובות')));
    const hasExtra = t.table.some((r) => r.extra);
    body.appendChild(h('div', { class: 'addrwrap' }, h('table', { class: 'grid addr' },
      h('tr', null, h('th', null, 'Device'), h('th', null, 'Interface'), h('th', null, 'IP Address'), h('th', null, 'Subnet Mask'), h('th', null, 'Default Gateway'), hasExtra ? h('th', null, 'Notes') : null),
      t.table.map((r) => h('tr', null, h('td', null, r.dev), h('td', null, r.iface), h('td', null, r.ip), h('td', null, r.mask), h('td', null, r.gw || ''), hasExtra ? h('td', null, r.extra || '') : null)))));
  },

  // Блоки «как сделать»: устройство, где делать (CLI / Desktop / кабель) и строки с пояснениями.
  renderFix(blocks) {
    return h('div', { class: 'cfixbody' }, blocks.map((b) => h('div', { class: 'cfixblock' },
      h('div', { class: 'cfixhead' }, h('b', null, b.dev), b.dev ? ' · ' : '', triText(b.viaLabel || VIA[b.via] || VIA.cli, ' / ')),
      b.lines.map((l) => h('div', { class: 'cline' + (l.text ? '' : ' noteonly') },
        l.text ? h('code', { class: 'mono' }, l.text) : null,
        l.note ? bi(l.note, 'cnote') : null)))));
  },

  // Одна проверка: зелёная — коротко; красная — что не так, почему это важно, как исправить, урок.
  renderCheck(it, task, topo) {
    if (it.ok) return h('div', { class: 'chk ok' }, h('span', { class: 'mark' }, '✓'), h('div', null, bi(it.label)));
    const d = checkDetails(it.check, task, topo);
    const lesson = d && d.lesson ? lessonGet(d.lesson) : null;
    return h('div', { class: 'chk no' }, h('span', { class: 'mark' }, '✗'),
      h('div', { class: 'chkbody' }, bi(it.label),
        it.hint ? h('div', { class: 'why' }, h('div', { class: 'clabel' }, tri('What is wrong', 'что не так', 'מה לא תקין')), bi(it.hint)) : null,
        d && d.why ? h('div', { class: 'cwhy' }, h('div', { class: 'clabel' }, tri('Why it matters', 'почему это важно', 'למה זה חשוב')), bi(d.why)) : null,
        d && d.fix.length ? h('details', { class: 'cfix' }, h('summary', null, '🔧 ', tri('How to fix', 'как исправить (сначала попробуйте сами)', 'איך לתקן (קודם נסו לבד)')), this.renderFix(d.fix)) : null,
        h('div', { class: 'chkbtns' },
          lesson ? h('button', { class: 'btn sm clesson', onclick: () => { App.setView('learn'); Learn.open(lesson.id); } }, '📚 ' + lesson.title.en) : null,
          Tutor.button(() => Tutor.ctxTraining(task, topo, it, d)))));
  },

  // ---------- Похожий пример с пошаговым решением ----------
  closeExampleWindows() { for (const [k, w] of DevWin.wins) if (k.startsWith('x|')) w.win.close(); },
  startExample() {
    const tr = App.training;
    if (!tr) return;
    let task;
    for (let i = 0; i < 5; i++) { task = taskCreate(tr.task.templateId, Math.floor(Math.random() * 1e9) + 1); if (task.seed !== tr.task.seed) break; }
    for (const [k, w] of DevWin.wins) if (k.startsWith('t|')) w.win.close();
    const topo = taskBuild(task);
    this.example = { task, topo, steps: taskSolutionSteps(task), idx: 0, result: taskCheck(topo, task), open: new Set() };
    App.undoStacks.example = []; App.redoStacks.example = [];
    this.render();
    App.queueRender();
    setTimeout(() => Workspace.fit(), 50);
  },
  exitExample() {
    this.closeExampleWindows();
    this.example = null;
    this.render();
    App.queueRender();
    setTimeout(() => Workspace.fit(), 50);
  },
  exampleStep(all) {
    const ex = this.example;
    if (!ex) return;
    do {
      if (ex.idx >= ex.steps.length) break;
      ex.steps[ex.idx].apply(ex.topo);
      ex.idx++;
    } while (all);
    netCommit(ex.topo);
    ex.result = taskCheck(ex.topo, ex.task);
    App.queueRender();
    DevWin.refreshAll();
    this.render();
    const cur = document.querySelector('#trainpanel .exstep.cur, #trainpanel .exdone');
    if (cur) cur.scrollIntoView({ block: 'nearest' });
  },
  exampleReset() {
    const ex = this.example;
    if (!ex) return;
    this.closeExampleWindows();
    ex.topo = taskBuild(ex.task);
    ex.idx = 0;
    ex.open = new Set();
    ex.result = taskCheck(ex.topo, ex.task);
    App.undoStacks.example = []; App.redoStacks.example = [];
    this.render();
    App.queueRender();
  },
  tryAnother() {
    const id = (this.example ? this.example.task : App.training.task).templateId;
    this.setTask(taskCreate(id, Math.floor(Math.random() * 1e9) + 1));
    toast(triText(T('New task with fresh numbers', 'Новое задание с другими данными', 'משימה חדשה עם מספרים אחרים')));
  },

  renderExample(el) {
    const ex = this.example, t = ex.task;
    const scroll = el.querySelector('.tscroll2');
    const keep = scroll ? scroll.scrollTop : 0;
    clear(el);
    el.appendChild(h('div', { class: 'thead exhead' },
      h('div', { class: 'ttitle' }, h('span', { class: 'ticon learn', html: iconUse('v-learn', 18, 18) }), h('span', { class: 'tname' }, tri('Worked example', 'пример с решением', 'דוגמה פתורה')), this.langToggles()),
      h('div', { class: 'tbtns' },
        h('button', { class: 'btn', onclick: () => this.exitExample() }, '← ', tri('Back to my task', 'к моему заданию', 'חזרה למשימה שלי')),
        h('button', { class: 'btn', onclick: () => this.startExample() }, '🎲 ', tri('Another example', 'другой пример', 'דוגמה אחרת')))));
    const body = h('div', { class: 'tscroll2' });
    body.appendChild(h('div', { class: 'exbanner' }, bi(T('The same exercise as yours, but with different numbers. Press "Do this step" and watch the network on the left change. Your own task is saved — go back any time.',
      'То же упражнение, что у вас, но с другими данными. Нажимайте «Выполнить шаг» и смотрите, как меняется сеть слева. Ваше задание сохранено — вернуться можно в любой момент.',
      'אותו תרגיל כמו שלכם, אבל עם מספרים אחרים. לוחצים "לבצע את השלב" ורואים איך הרשת משמאל משתנה. המשימה שלכם שמורה — אפשר לחזור בכל רגע.'))));
    body.appendChild(bi(t.title, 'tasktitle'));
    body.appendChild(bi(t.intro, 'intro'));
    this.renderTable(body, t);
    body.appendChild(h('div', { class: 'sechdr' }, tri('Solution step by step', 'решение по шагам', 'פתרון שלב אחר שלב')));
    const ol = h('div', { class: 'exsteps' });
    ex.steps.forEach((st, i) => {
      const state = i < ex.idx ? 'done' : i === ex.idx ? 'cur' : 'todo';
      const open = state === 'cur' || ex.open.has(i);
      const head = h('button', { class: 'exhead2', onclick: () => { if (state === 'cur') return; if (ex.open.has(i)) ex.open.delete(i); else ex.open.add(i); this.render(); } },
        h('span', { class: 'exnum' }, state === 'done' ? '✓' : String(i + 1)), bi(st.title, 'extitle'));
      const card = h('div', { class: 'exstep ' + state }, head);
      if (open) {
        card.appendChild(bi(st.explain(ex.topo), 'exexplain'));
        card.appendChild(this.renderFix(st.lines(ex.topo).map((b) => Object.assign({ viaLabel: VIA[b.via] }, b))));
        if (state === 'cur') card.appendChild(h('div', { class: 'tactions' },
          h('button', { class: 'btn primary', onclick: () => this.exampleStep(false) }, '▶ ', tri('Do this step', 'выполнить шаг', 'לבצע את השלב')),
          ex.idx < ex.steps.length - 1 ? h('button', { class: 'btn', onclick: () => this.exampleStep(true) }, '⏩ ', tri('Do all', 'все шаги', 'את כל השלבים')) : null));
      }
      ol.appendChild(card);
    });
    body.appendChild(ol);
    const r = ex.result;
    if (ex.idx >= ex.steps.length) {
      body.appendChild(h('div', { class: 'score exdone' + (r.done ? ' done' : '') },
        bi(r.done ? T('🎉 The example is solved. Now do the same in your own task — with your numbers.', '🎉 Пример решён. Теперь сделайте то же самое в своём задании — со своими данными.', '🎉 הדוגמה נפתרה. עכשיו עשו את אותו הדבר במשימה שלכם — עם המספרים שלכם.')
          : T('All steps are done, but some checks are still red — look at them below.', 'Все шаги выполнены, но часть проверок ещё красная — смотрите ниже.', 'כל השלבים בוצעו, אבל חלק מהבדיקות עדיין אדומות — ראו למטה.')),
        h('div', { class: 'tactions' },
          h('button', { class: 'btn primary', onclick: () => this.exitExample() }, '← ', tri('Back to my task', 'к моему заданию', 'חזרה למשימה שלי')),
          h('button', { class: 'btn', onclick: () => this.tryAnother() }, '🎲 ', tri('New similar task for me', 'похожее задание', 'משימה דומה בשבילי')),
          h('button', { class: 'btn', onclick: () => this.exampleReset() }, '↺ ', tri('Watch again', 'посмотреть снова', 'לצפות שוב')))));
    } else body.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn sm', onclick: () => this.exampleReset() }, '↺ ', tri('Start over', 'сначала', 'מההתחלה'))));
    body.appendChild(h('div', { class: 'sechdr' }, tri('Checks', 'проверки', 'בדיקות'), ' ' + r.passed + ' / ' + r.total));
    body.appendChild(h('div', { class: 'results compact' }, r.items.map((it) => h('div', { class: 'chk ' + (it.ok ? 'ok' : 'no') }, h('span', { class: 'mark' }, it.ok ? '✓' : '✗'), h('div', null, bi(it.label))))));
    el.appendChild(body);
    body.scrollTop = keep;
  },

  render() {
    const el = document.getElementById('trainpanel');
    if (!el || App.view !== 'training') return;
    if (this.example) { this.renderExample(el); return; }
    const scroll = el.querySelector('.tscroll2');
    const keepScroll = scroll ? scroll.scrollTop : 0;
    clear(el);
    const tr = App.training;
    const topicSel = h('select', { class: 'inp sm' }, h('option', { value: 'all' }, triText(T('All topics', 'все темы', 'כל הנושאים'))), TASK_TOPICS.map((t) => h('option', { value: t.id, selected: this.filters.topic === t.id }, triText(t.title))));
    topicSel.addEventListener('change', () => { this.filters.topic = topicSel.value; Store.set('trainFilters', this.filters); });
    const lvlSel = h('select', { class: 'inp sm' }, h('option', { value: 'all' }, triText(T('Any level', 'любой уровень', 'כל רמה'))), [1, 2, 3].map((l) => h('option', { value: l, selected: String(this.filters.level) === String(l) }, triText(TASK_LEVELS[l]))));
    lvlSel.addEventListener('change', () => { this.filters.level = lvlSel.value; Store.set('trainFilters', this.filters); });
    const head = h('div', { class: 'thead' },
      h('div', { class: 'ttitle' }, iconUseEl('v-training'), h('span', { class: 'tname' }, tri('Training', 'тренировка', 'אימון')), this.langToggles()),
      h('div', { class: 'tfilters' }, topicSel, lvlSel),
      h('div', { class: 'tbtns' },
        h('button', { class: 'btn primary', onclick: () => this.newTask() }, '🎲 ', tri('New random task', 'новое задание', 'משימה חדשה')),
        h('button', { class: 'btn', onclick: () => this.restart() }, '↺ ', tri('Restart', 'заново', 'מחדש')),
        h('button', { class: 'btn', onclick: () => this.pickDialog() }, '☰ ', tri('All tasks', 'все задания', 'כל המשימות'))));
    el.appendChild(head);
    if (!tr) { el.appendChild(h('div', { class: 'pad' }, 'No task.')); return; }
    const t = tr.task;
    const topic = TASK_TOPICS.find((x) => x.id === t.topic);
    const body = h('div', { class: 'tscroll2' });
    body.appendChild(h('div', { class: 'badges' }, h('span', { class: 'lvl l' + t.level }, tri(TASK_LEVELS[t.level].en, TASK_LEVELS[t.level].ru, TASK_LEVELS[t.level].he)), h('span', { class: 'topic' }, tri(topic.title.en, topic.title.ru, topic.title.he)),
      h('span', { class: 'seed', title: 'Task id (same id = same task)' }, '#' + t.templateId + '-' + t.seed)));
    body.appendChild(bi(t.title, 'tasktitle'));
    body.appendChild(bi(t.intro, 'intro'));
    body.appendChild(h('div', { class: 'sechdr' }, tri('Steps', 'Шаги', 'שלבים')));
    const ol = h('ol', { class: 'steps' });
    for (const s of t.steps) ol.appendChild(h('li', null, bi(s)));
    body.appendChild(ol);
    this.renderTable(body, t);
    body.appendChild(h('div', { class: 'tactions' },
      h('button', { class: 'btn primary big', onclick: () => this.check() }, '✓ ', tri('Check', 'проверить', 'בדיקה')),
      h('button', { class: 'btn', onclick: () => this.hint(), disabled: this.hints >= (t.hints || []).length }, '💡 ', tri('Hint', 'подсказка', 'רמז')),
      h('button', { class: 'btn', onclick: () => this.showSolution() }, tri('Solution', 'решение', 'פתרון')),
      h('button', { class: 'btn', title: triText(T('Same exercise with other numbers, solved step by step', 'То же упражнение с другими данными, решённое по шагам', 'אותו תרגיל עם מספרים אחרים, פתור שלב אחר שלב')), onclick: () => this.startExample() }, '🎓 ', tri('Example', 'пример', 'דוגמה'))));
    if (this.hints) {
      const hb = h('div', { class: 'hints' });
      for (const x of (t.hints || []).slice(0, this.hints)) hb.appendChild(h('div', { class: 'hint' }, '💡 ', bi(x)));
      body.appendChild(hb);
    }
    if (tr.result) {
      const r = tr.result;
      const res = h('div', { class: 'results' });
      res.appendChild(h('div', { class: 'score' + (r.done ? ' done' : '') },
        r.done ? h('div', null, '🎉 ', h('b', null, tri('Task complete!', 'Задание выполнено!', 'המשימה הושלמה!'))) : h('div', null, h('b', null, r.passed + ' / ' + r.total + ' '), tri('checks passed', 'проверок пройдено', 'בדיקות עברו')),
        h('div', { class: 'bar' }, h('div', { style: { width: r.score + '%' } }))));
      for (const it of r.items) res.appendChild(this.renderCheck(it, t, tr.topo));
      if (r.done) res.appendChild(h('button', { class: 'btn primary', onclick: () => this.newTask() }, tri('Next task', 'следующее задание', 'המשימה הבאה'), ' →'));
      else res.appendChild(h('div', { class: 'exoffer' },
        bi(T('Not sure how to do it? Watch the same exercise with different numbers being solved step by step, then come back to yours.',
          'Не понятно, как сделать? Посмотрите, как по шагам решается такое же задание с другими данными, и вернитесь к своему.',
          'לא ברור איך לעשות? צפו איך אותו תרגיל עם נתונים אחרים נפתר שלב אחר שלב, ואז חזרו לשלכם.')),
        h('button', { class: 'btn primary', onclick: () => this.startExample() }, '🎓 ', tri('Similar example, solved step by step', 'похожий пример по шагам', 'דוגמה דומה, שלב אחר שלב'))));
      body.appendChild(res);
    }
    const solvedTotal = this.stats.total || 0;
    body.appendChild(h('div', { class: 'tstats muted' }, tri('Solved', 'решено', 'נפתרו'), ': ' + solvedTotal + ' · ', tri('checks', 'проверок', 'בדיקות'), ': ' + (this.stats.checks || 0)));
    el.appendChild(body);
    body.scrollTop = keepScroll;
  },
};

function iconUseEl(id) { return h('span', { class: 'ticon', html: iconUse(id, 18, 18) }); }
