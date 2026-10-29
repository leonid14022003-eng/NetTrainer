'use strict';
// Новые режимы вкладки Learn: «Сегодня» (план на 15 минут), тетрадь ошибок, пробный экзамен,
// калькулятор подсетей, озвучка урока и ответ на собеседовании голосом.

Object.assign(Learn, {
  ms: { cur: null, chosen: null, order: null },   // тетрадь ошибок: текущий вопрос
  ex: null,                                       // идущий пробный экзамен
  exResult: null,
  examSetup: { part: 'all', n: 50 },
  calc: { text: '192.168.10.77/26' },
  voice: { text: '', rec: null, listening: false, lang: 'en', result: null, busy: false, ctl: null },

  // ---------- общее ----------
  bump(kind, n = 1) {
    this.act = actBump(this.act || {}, kind, Date.now(), n);
    Store.set('activity', this.act);
  },
  addMistakeQ(q) {
    mistakeAddQuestion(this.book, q, Date.now());
    Store.set('mistakes', this.book);
  },
  ivr(id) { const v = this.ivRate[id]; return v && typeof v === 'object' ? v.r : v || null; },
  streakAll() { return actStreak(this.act || {}, Date.now(), this.st.days); },

  // ---------- «Сегодня» ----------
  todayState() {
    const weak = weakTopicOf(this.book, Training.stats && Training.stats.solved, TASK_TOPICS.map((t) => t.id), TASK_TEMPLATES);
    return todayPlan({ cards: this.cards, glossaryIds: GLOSSARY.map((g) => g.id), book: this.book, act: this.act, nextLesson: this.nextLesson(), weakTopic: weak }, Date.now());
  },

  renderTodayNav(list) {
    const plan = this.todayState();
    list.appendChild(h('div', { class: 'lprog' },
      h('div', { class: 'lprogrow' }, h('span', null, tri('Today', 'сегодня', 'היום'), ' ' + plan.count + ' / ' + plan.steps.length), h('span', { title: triText(T('Days in a row', 'Дней подряд', 'ימים ברצף')) }, '🔥 ' + this.streakAll())),
      h('div', { class: 'bar' }, h('div', { style: { width: Math.round(plan.count * 100 / plan.steps.length) + '%' } }))));
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const k = dayKey(d.getTime()), a = (this.act || {})[k] || {};
      const n = ACT_KINDS.reduce((s, x) => s + (a[x] || 0), 0) + (this.st.days.includes(k) ? 1 : 0);
      days.push(h('span', { class: 'wday' + (n ? ' on' : '') + (i === 0 ? ' today' : ''), title: k }, ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]));
    }
    list.appendChild(h('div', { class: 'week' }, days));
    const ms = mistakeActive(this.book).length;
    list.appendChild(h('div', { class: 'muted small lnavnote' }, tri('Mistakes to fix', 'ошибок к исправлению', 'טעויות לתיקון'), ': ' + ms));
  },

  renderToday(page) {
    const plan = this.todayState();
    const d = new Date();
    page.appendChild(h('div', { class: 'badges' }, h('span', { class: 'lvl l1' }, d.toLocaleDateString()), h('span', { class: 'topic', title: triText(T('Days in a row with practice', 'Дней подряд с занятиями', 'ימים ברצף עם תרגול')) }, '🔥 ', tri('Streak', 'серия', 'רצף'), ': ' + this.streakAll())));
    page.appendChild(bi(T('Today — 15 minutes', 'Сегодня — 15 минут', 'היום — 15 דקות'), 'tasktitle'));
    page.appendChild(bi(T('One button plans your day: a few cards, your old mistakes, one task in the simulator, one lesson and one interview question. Do them in any order — each one turns green by itself.',
      'Одна кнопка — и план на день готов: несколько карточек, старые ошибки, одно задание в симуляторе, один урок и один вопрос собеседования. Делайте в любом порядке — каждый пункт сам станет зелёным.',
      'כפתור אחד מתכנן את היום: כמה כרטיסיות, הטעויות הישנות, משימה אחת בסימולטור, שיעור אחד ושאלת ראיון אחת. עושים בכל סדר — כל סעיף נהיה ירוק לבד.'), 'intro'));
    const nl = this.nextLesson() && lessonGet(this.nextLesson());
    const topic = TASK_TOPICS.find((t) => t.id === plan.steps[2].topic);
    const info = {
      cards: { icon: '🃏', t: T('Review cards', 'Повторить карточки', 'חזרה על כרטיסיות'), d: T(plan.steps[0].left + ' cards are due today (new and forgotten terms).', 'Сегодня к повторению: ' + plan.steps[0].left + ' (новые и забытые термины).', 'להיום: ' + plan.steps[0].left + ' כרטיסיות (מונחים חדשים ונשכחים).'),
        go: () => { this.gl.view = 'cards'; this.gl.filter = 'all'; this.gl.q = ''; this.gl.cur = null; this.gl.shown = false; this.setMode('glossary'); } },
      mistakes: { icon: '📕', t: T('Fix old mistakes', 'Исправить старые ошибки', 'לתקן טעויות ישנות'), d: plan.steps[1].goal ? T(plan.steps[1].left + ' questions you got wrong before are waiting.', 'Ждут вопросы, где вы ошиблись: ' + plan.steps[1].left + '.', 'מחכות ' + plan.steps[1].left + ' שאלות שטעיתם בהן.') : T('No mistakes waiting — great!', 'Ошибок к повторению нет — отлично!', 'אין טעויות שמחכות — מצוין!'),
        go: () => this.setMode('mistakes') },
      task: { icon: '🧪', t: T('One task in the simulator', 'Одно задание в симуляторе', 'משימה אחת בסימולטור'), d: topic ? T('Topic: ' + topic.title.en + ' — your weakest right now.', 'Тема: ' + topic.title.ru + ' — сейчас самая слабая.', 'נושא: ' + topic.title.he + ' — החלש ביותר כרגע.') : T('Any topic.', 'Любая тема.', 'כל נושא.'),
        go: () => this.practice(topic ? topic.id : 'all') },
      lesson: { icon: '📚', t: T('One lesson + mini-test', 'Один урок + мини-тест', 'שיעור אחד + מבחן קצר'), d: nl ? T(nl.title.en, nl.title.ru, nl.title.he) : T('All lessons passed — repeat any, or take the mock exam.', 'Все уроки пройдены — повторите любой или сдайте пробный экзамен.', 'כל השיעורים עברו — חזרו על אחד או עשו מבחן ניסיון.'),
        go: () => (nl ? this.open(nl.id) : this.setMode('exam')) },
      iv: { icon: '💼', t: T('One interview question', 'Один вопрос собеседования', 'שאלת ראיון אחת'), d: T('Answer out loud or with the microphone, then compare.', 'Ответьте вслух или в микрофон, потом сравните.', 'ענו בקול או במיקרופון, ואז השוו.'),
        go: () => { this.iv.cur = this.pickIv(); this.iv.shown = false; this.setMode('interview'); } },
    };
    const list = h('div', { class: 'todaylist' });
    plan.steps.forEach((s, i) => {
      const x = info[s.id];
      list.appendChild(h('div', { class: 'todayitem' + (s.done ? ' done' : '') },
        h('span', { class: 'todaynum' }, s.done ? '✓' : String(i + 1)),
        h('span', { class: 'todayicon' }, x.icon),
        h('div', { class: 'todaytxt' }, bi(x.t, 'todayt'), bi(x.d, 'todayd'),
          s.goal > 1 ? h('div', { class: 'bar sm' }, h('div', { style: { width: Math.round(s.have * 100 / s.goal) + '%' } })) : null),
        h('button', { class: 'btn' + (s.done ? '' : ' primary'), onclick: x.go }, s.done ? '↻' : '▶', ' ', s.goal > 1 ? s.have + '/' + s.goal : tri('Go', 'начать', 'קדימה'))));
    });
    page.appendChild(list);
    if (plan.done) page.appendChild(h('div', { class: 'score done' }, bi(T('🎉 Today\'s plan is done! Come back tomorrow — short daily practice works better than a long one once a week.',
      '🎉 План на сегодня выполнен! Возвращайтесь завтра — короткие занятия каждый день работают лучше, чем длинные раз в неделю.',
      '🎉 התוכנית של היום הושלמה! חזרו מחר — תרגול קצר כל יום עובד טוב יותר מתרגול ארוך פעם בשבוע.'))));
    const weakLessons = {};
    for (const r of mistakeActive(this.book)) if (r.lesson) weakLessons[r.lesson] = (weakLessons[r.lesson] || 0) + 1;
    const top = Object.entries(weakLessons).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (top.length) {
      page.appendChild(this.sec(T('Weak spots', 'Слабые места', 'נקודות חלשות')));
      page.appendChild(h('div', { class: 'weaklist' }, top.map(([id, n]) => h('button', { class: 'btn sm', onclick: () => this.open(id) }, '📚 ' + lessonGet(id).title.en + ' · ' + n))));
    }
  },

  // ---------- Тетрадь ошибок ----------
  msPick() {
    const due = mistakeDue(this.book, Date.now()).filter((r) => r.kind === 'q');
    const r = due.find((x) => x.id !== this.ms.last) || due[0] || null;
    if (!r) { this.ms.cur = null; return; }
    this.ms.cur = r.id;
    this.ms.chosen = null;
    const rng = makeRng(Math.floor(Math.random() * 1e9) + 1);
    this.ms.order = rng.shuffle(r.q.options.map((_, i) => i));
  },
  msAnswer(i) {
    const r = this.book[this.ms.cur];
    if (!r || this.ms.chosen !== null) return;
    this.ms.chosen = i;
    const ok = r.q.options[this.ms.order[i]].correct;
    this.ms.result = mistakeAnswer(this.book, r.id, ok, Date.now());
    this.ms.snapshot = r;
    Store.set('mistakes', this.book);
    this.bump('mistakes');
    this.markDay();
    this.render();
  },
  msNext() { this.ms.last = this.ms.cur; this.msPick(); this.render(true); },

  renderMistNav(list) {
    const act = mistakeActive(this.book);
    const due = mistakeDue(this.book, Date.now());
    list.appendChild(h('div', { class: 'lprog' }, h('div', { class: 'lprogrow' }, h('span', null, tri('Due today', 'на сегодня', 'להיום'), ': ' + due.length), h('span', null, tri('total', 'всего', 'סה"כ'), ' ' + act.length))));
    const byLesson = {};
    for (const r of act) { const k = r.kind === 'task' ? 'task' : r.lesson || 'other'; (byLesson[k] = byLesson[k] || []).push(r); }
    for (const [k, rs] of Object.entries(byLesson).sort((a, b) => b[1].length - a[1].length)) {
      const l = lessonGet(k);
      const title = k === 'task' ? T('Simulator tasks', 'Задания в симуляторе', 'משימות בסימולטור') : l ? l.title : T('Other', 'Другое', 'אחר');
      list.appendChild(h('div', { class: 'lrow static' }, h('span', { class: 'lnum' }, String(rs.length)), h('span', { class: 'ltxt' }, h('span', { class: 'len' }, title.en), App.prefs.ru ? h('span', { class: 'lru' }, title.ru) : null)));
    }
  },

  renderMistakes(page) {
    page.appendChild(bi(T('My mistakes', 'Мои ошибки', 'הטעויות שלי'), 'tasktitle'));
    page.appendChild(bi(T('Every wrong answer from tests, drills and the exam lands here, and every red task in Training. A question leaves the notebook after you answer it right 3 times in a row (on different days).',
      'Сюда попадает каждый неверный ответ из тестов, тренажёров и экзамена и каждое красное задание из Training. Вопрос уходит из тетради, когда вы ответите правильно 3 раза подряд (в разные дни).',
      'לכאן נכנסת כל תשובה שגויה מהמבחנים, מהתרגול ומהמבחן הניסיון, וכל משימה אדומה מ-Training. שאלה יוצאת מהמחברת אחרי שעונים עליה נכון 3 פעמים ברצף (בימים שונים).'), 'intro'));
    const tasks = mistakeActive(this.book).filter((r) => r.kind === 'task');
    if (tasks.length) {
      page.appendChild(this.sec(T('Tasks to redo in the simulator', 'Задания, которые нужно переделать', 'משימות לעשות שוב בסימולטור')));
      for (const r of tasks) {
        page.appendChild(h('div', { class: 'mtask' },
          h('div', { class: 'mtaskhead' }, bi(r.title, 'mtt'), h('button', { class: 'btn primary sm', onclick: () => { App.setView('training'); Training.setTask(taskCreate(r.templateId, Math.floor(Math.random() * 1e9) + 1)); } }, '🧪 ', tri('Practice again', 'ещё раз', 'שוב'))),
          h('ul', { class: 'lul' }, r.labels.map((l) => h('li', null, bi(l))))));
      }
    }
    if (!this.ms.cur || !this.book[this.ms.cur] || (this.book[this.ms.cur].done && this.ms.chosen === null)) this.msPick();
    const r = this.ms.cur ? (this.book[this.ms.cur] && !this.book[this.ms.cur].done ? this.book[this.ms.cur] : this.ms.snapshot) : null;
    page.appendChild(this.sec(T('Questions', 'Вопросы', 'שאלות')));
    if (!r || !r.q) {
      const left = mistakeActive(this.book).filter((x) => x.kind === 'q').length;
      page.appendChild(h('div', { class: 'score done' }, bi(left ? T('Nothing is due right now. The other ' + left + ' questions will come back on their day.', 'Сейчас повторять нечего. Остальные вопросы (' + left + ') вернутся в свой день.', 'אין כרגע מה לחזור. שאר השאלות (' + left + ') יחזרו ביום שלהן.')
        : T('The notebook is empty — no mistakes to fix. 🎉', 'Тетрадь пуста — ошибок нет. 🎉', 'המחברת ריקה — אין טעויות לתקן. 🎉'))));
      return;
    }
    const q = r.q, ch = this.ms.chosen;
    const answered = ch !== null;
    const okNow = answered && q.options[this.ms.order[ch]].correct;
    const card = h('div', { class: 'qcard big' + (answered ? (okNow ? ' ok' : ' no') : '') });
    const l = r.lesson && lessonGet(r.lesson);
    card.appendChild(h('div', { class: 'mmeta muted small' }, l ? '📚 ' + l.title.en + ' · ' : '', tri('mistakes', 'ошибок', 'טעויות'), ': ' + r.wrong + ' · ', tri('right in a row', 'верно подряд', 'נכון ברצף'), ': ' + (answered ? this.ms.snapshot.streak || 0 : r.streak) + ' / ' + MISTAKE_MASTER));
    card.appendChild(h('div', { class: 'qhead' }, bi(q.q, 'qtext')));
    if (q.code) card.appendChild(h('pre', { class: 'mono lcode qcode' }, q.code));
    const opts = h('div', { class: 'qopts' });
    this.ms.order.forEach((oi, i) => {
      const o = q.options[oi];
      let cls = 'qopt';
      if (answered) { if (o.correct) cls += ' right'; else if (ch === i) cls += ' wrong'; }
      opts.appendChild(h('button', { class: cls + ' qbtn', onclick: () => this.msAnswer(i), disabled: answered }, h('span', { class: 'qkey' }, String(i + 1)), this.optEl(o.t)));
    });
    card.appendChild(opts);
    if (answered) {
      card.appendChild(h('div', { class: 'qexp' + (okNow ? ' ok' : '') }, bi(q.explain)));
      const msg = this.ms.result === 'mastered' ? T('🎉 Fixed! This question leaves the notebook.', '🎉 Исправлено! Вопрос уходит из тетради.', '🎉 תוקן! השאלה יוצאת מהמחברת.')
        : okNow ? T('Right — it will come back in a few days to make sure.', 'Верно — вопрос вернётся через пару дней для закрепления.', 'נכון — השאלה תחזור בעוד כמה ימים לחיזוק.')
          : T('Not yet — it will come back later today.', 'Пока нет — вопрос вернётся сегодня ещё раз.', 'עדיין לא — השאלה תחזור עוד היום.');
      card.appendChild(bi(msg, 'mresult'));
      card.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn primary big', onclick: () => this.msNext() }, tri('Next', 'дальше', 'הבא'), ' → (Enter)'),
        Tutor.button(() => Tutor.ctxQuestion({ q: q.q, code: q.code, explain: q.explain, lesson: q.lesson, options: this.ms.order.map((oi) => q.options[oi]) }, ch)),
        l ? h('button', { class: 'btn', onclick: () => this.open(l.id) }, '📚 ' + l.title.en) : null));
    }
    page.appendChild(card);
  },

  // ---------- Пробный экзамен ----------
  examStart() {
    const ex = examBuild(this.examSetup.part, this.examSetup.n, Math.floor(Math.random() * 1e9) + 1);
    ex.start = Date.now();
    ex.cur = 0;
    this.ex = ex;
    this.exResult = null;
    this.saveExamRun();
    this.render(true);
    this.examTick();
  },
  saveExamRun() { Store.set('examRun', this.ex); },
  examLeft() { return this.ex ? Math.max(0, Math.round((this.ex.start + this.ex.seconds * 1000 - Date.now()) / 1000)) : 0; },
  examTick() {
    clearInterval(this._exTimer);
    this._exTimer = setInterval(() => {
      if (!this.ex) { clearInterval(this._exTimer); return; }
      const left = this.examLeft();
      const el = document.querySelector('#learn .extimer');
      if (el) { el.textContent = '⏱ ' + fmtClock(left); el.classList.toggle('low', left < 300); }
      if (left <= 0) { clearInterval(this._exTimer); this.examFinish(true); }
    }, 1000);
  },
  examGo(i) { if (!this.ex) return; this.ex.cur = Math.max(0, Math.min(this.ex.questions.length - 1, i)); this.saveExamRun(); this.render(true); },
  examAnswer(oi) { this.ex.answers[this.ex.cur] = oi; this.saveExamRun(); this.render(); },
  examFlag() { const f = this.ex.flags; f[this.ex.cur] = !f[this.ex.cur]; this.saveExamRun(); this.render(); },
  async examFinish(timeUp) {
    const ex = this.ex;
    if (!ex) return;
    const left = ex.questions.length - ex.answers.filter((a) => a !== undefined && a !== null).length;
    if (!timeUp && left) {
      const ok = await dialog({ title: triText(T('Finish the exam?', 'Закончить экзамен?', 'לסיים את המבחן?')), body: bi(T(left + ' questions have no answer — they count as wrong.', 'Без ответа: ' + left + ' — они засчитаются как неверные.', left + ' שאלות בלי תשובה — הן ייחשבו שגויות.')),
        buttons: [{ label: triText(T('Finish', 'Закончить', 'לסיים'), ' · '), primary: true, value: true }, { label: triText(T('Continue', 'Продолжить', 'להמשיך'), ' · '), value: false }] });
      if (!ok) return;
    }
    clearInterval(this._exTimer);
    const g = examGrade(ex);
    const now = Date.now();
    ex.questions.forEach((q, i) => { if (!g.items[i].ok) mistakeAddQuestion(this.book, q, now); });
    Store.set('mistakes', this.book);
    this.exams = (this.exams || []).concat([{ id: ex.id, part: ex.part, n: ex.questions.length, pct: g.pct, passed: g.passed, sec: Math.round((now - ex.start) / 1000), date: now }]).slice(-30);
    Store.set('exams', this.exams);
    this.bump('exam');
    this.markDay();
    this.exResult = { ex, g, timeUp: !!timeUp };
    this.ex = null;
    Store.set('examRun', null);
    if (timeUp) toast(triText(T('Time is up — the exam was submitted', 'Время вышло — экзамен сдан', 'הזמן נגמר — המבחן הוגש')));
    this.render(true);
  },

  renderExamNav(list) {
    list.appendChild(h('div', { class: 'muted small lnavnote' }, tri('Past exams', 'прошлые экзамены', 'מבחנים קודמים')));
    const hist = (this.exams || []).slice().reverse();
    if (!hist.length) list.appendChild(h('div', { class: 'muted small lnavnote' }, '—'));
    for (const x of hist) {
      list.appendChild(h('div', { class: 'lrow static' }, h('span', { class: 'lnum' + (x.passed ? ' ok' : ' no') }, x.pct + '%'),
        h('span', { class: 'ltxt' }, h('span', { class: 'len' }, (x.part === 'all' ? 'CCNA' : x.part.toUpperCase()) + ' · ' + x.n + ' q'), h('span', { class: 'lru' }, new Date(x.date).toLocaleDateString() + ' · ' + fmtClock(x.sec)))));
    }
  },

  renderExam(page) {
    if (this.ex) return this.renderExamRun(page);
    if (this.exResult) return this.renderExamResult(page);
    page.appendChild(bi(T('Mock exam — like the real CCNA', 'Пробный экзамен — как настоящий CCNA', 'מבחן ניסיון — כמו CCNA אמיתי'), 'tasktitle'));
    page.appendChild(bi(T('Questions from all lessons, a timer (72 seconds per question, like CCNA 200-301), one question at a time, and a flag for questions you want to come back to. At the end you see your weak lessons; every wrong answer goes to your Mistakes notebook. Pass mark ' + EXAM_PASS + '%.',
      'Вопросы из всех уроков, таймер (72 секунды на вопрос, как на CCNA 200-301), по одному вопросу на экране и флажок для вопросов, к которым хотите вернуться. В конце — список слабых уроков; каждая ошибка попадает в тетрадь ошибок. Проходной балл ' + EXAM_PASS + '%.',
      'שאלות מכל השיעורים, טיימר (72 שניות לשאלה, כמו CCNA 200-301), שאלה אחת בכל פעם ודגל לשאלות שרוצים לחזור אליהן. בסוף רואים את השיעורים החלשים; כל טעות נכנסת למחברת הטעויות. ציון עובר ' + EXAM_PASS + '%.'), 'intro'));
    const seg = (key, opts) => h('div', { class: 'lseg' }, opts.map(([v, label]) => h('button', { class: 'lsegb' + (this.examSetup[key] === v ? ' on' : ''), onclick: () => { this.examSetup[key] = v; this.render(); } }, label)));
    page.appendChild(h('div', { class: 'exsetup' },
      h('div', { class: 'frow' }, h('label', null, tri('Part', 'часть', 'חלק')), seg('part', [['all', 'All (CCNA)'], ['itn', 'ITN'], ['srwe', 'SRWE'], ['ensa', 'ENSA']])),
      h('div', { class: 'frow' }, h('label', null, tri('Questions', 'вопросов', 'שאלות')), seg('n', [[30, '30'], [50, '50'], [100, '100']])),
      h('div', { class: 'frow' }, h('label', null, tri('Time', 'время', 'זמן')), h('b', null, fmtClock(this.examSetup.n * 72)))));
    page.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn primary big', onclick: () => this.examStart() }, '▶ ', tri('Start the exam', 'начать экзамен', 'להתחיל את המבחן'))));
  },

  renderExamRun(page) {
    const ex = this.ex, i = ex.cur, q = ex.questions[i];
    const answered = ex.answers.filter((a) => a !== undefined && a !== null).length;
    page.appendChild(h('div', { class: 'exbar' },
      h('span', { class: 'extimer' + (this.examLeft() < 300 ? ' low' : '') }, '⏱ ' + fmtClock(this.examLeft())),
      h('span', null, tri('Question', 'вопрос', 'שאלה'), ' ' + (i + 1) + ' / ' + ex.questions.length),
      h('span', { class: 'muted' }, tri('answered', 'отвечено', 'נענו'), ' ' + answered),
      h('button', { class: 'btn sm', onclick: () => this.examFinish(false) }, '🏁 ', tri('Finish', 'закончить', 'לסיים'))));
    const card = h('div', { class: 'qcard big' });
    card.appendChild(h('div', { class: 'qhead' }, h('span', { class: 'qnum' }, String(i + 1)), bi(q.q, 'qtext'),
      h('button', { class: 'qtag' + (ex.flags[i] ? ' flagged' : ''), title: 'Flag', onclick: () => this.examFlag() }, ex.flags[i] ? '🚩' : '⚐')));
    if (q.code) card.appendChild(h('pre', { class: 'mono lcode qcode' }, q.code));
    const opts = h('div', { class: 'qopts' });
    q.options.forEach((o, oi) => opts.appendChild(h('button', { class: 'qopt qbtn' + (ex.answers[i] === oi ? ' sel' : ''), onclick: () => this.examAnswer(oi) }, h('span', { class: 'qkey' }, String(oi + 1)), this.optEl(o.t))));
    card.appendChild(opts);
    page.appendChild(card);
    page.appendChild(h('div', { class: 'lpager' },
      h('button', { class: 'btn', disabled: i === 0, onclick: () => this.examGo(i - 1) }, '← ', tri('Back', 'назад', 'אחורה')),
      i < ex.questions.length - 1 ? h('button', { class: 'btn primary', onclick: () => this.examGo(i + 1) }, tri('Next', 'дальше', 'הבא'), ' →')
        : h('button', { class: 'btn primary', onclick: () => this.examFinish(false) }, '🏁 ', tri('Finish', 'закончить', 'לסיים'))));
    page.appendChild(h('div', { class: 'exgrid' }, ex.questions.map((_, k) => h('button', { class: 'exdot' + (k === i ? ' cur' : '') + (ex.answers[k] !== undefined && ex.answers[k] !== null ? ' ans' : '') + (ex.flags[k] ? ' flag' : ''), onclick: () => this.examGo(k) }, String(k + 1)))));
  },

  renderExamResult(page) {
    const { ex, g, timeUp } = this.exResult;
    page.appendChild(bi(T('Exam result', 'Результат экзамена', 'תוצאת המבחן'), 'tasktitle'));
    page.appendChild(h('div', { class: 'score lscore' + (g.passed ? ' done' : ' fail') },
      h('div', null, h('b', null, (g.passed ? '🎉 ' : '') + g.correct + ' / ' + g.total + ' (' + g.pct + '%) '), tri(g.passed ? 'Passed' : 'Not passed yet', g.passed ? 'сдан' : 'пока не сдан', g.passed ? 'עבר' : 'עדיין לא עבר'), ' · ', tri('pass mark', 'проходной', 'ציון עובר'), ' ' + EXAM_PASS + '%', timeUp ? ' · ⏱' : ''),
      h('div', { class: 'bar' }, h('div', { style: { width: g.pct + '%' } }))));
    page.appendChild(this.sec(T('By part', 'По частям', 'לפי חלק')));
    const partOrder = (pid) => { const i = COURSE.findIndex((p) => p.id === pid); return i < 0 ? 99 : i; };
    page.appendChild(h('div', { class: 'exparts' }, Object.entries(g.byPart).sort((a, b) => partOrder(a[0]) - partOrder(b[0])).map(([pid, x]) => {
      const part = COURSE.find((p) => p.id === pid);
      const pct = Math.round(x.ok * 100 / x.total);
      return h('div', { class: 'expart' }, h('b', null, !part ? pid : part.id === 'extra' ? 'Extra' : part.code), h('div', { class: 'bar' }, h('div', { style: { width: pct + '%' } })), h('span', { class: 'muted' }, x.ok + '/' + x.total + ' · ' + pct + '%'));
    })));
    if (g.weak.length) {
      page.appendChild(this.sec(T('Lessons to review', 'Какие уроки повторить', 'שיעורים לחזור עליהם')));
      page.appendChild(h('div', { class: 'weaklist' }, g.weak.slice(0, 8).map((x) => h('button', { class: 'btn sm', onclick: () => this.open(x.lesson) }, '📚 ' + lessonGet(x.lesson).title.en + ' · ' + x.ok + '/' + x.total))));
    }
    page.appendChild(bi(T('All wrong answers were added to your Mistakes notebook.', 'Все неверные ответы добавлены в тетрадь ошибок.', 'כל התשובות השגויות נוספו למחברת הטעויות.'), 'muted'));
    page.appendChild(h('div', { class: 'tactions' },
      h('button', { class: 'btn primary', onclick: () => this.setMode('mistakes') }, '📕 ', tri('Fix the mistakes', 'разобрать ошибки', 'לתקן את הטעויות')),
      h('button', { class: 'btn', onclick: () => { this.exResult = null; this.render(true); } }, '↻ ', tri('New exam', 'новый экзамен', 'מבחן חדש'))));
    const wrong = ex.questions.map((q, i) => ({ q, i })).filter((x) => !g.items[x.i].ok);
    if (wrong.length) {
      page.appendChild(this.sec(T('Wrong answers', 'Неверные ответы', 'תשובות שגויות')));
      for (const { q, i } of wrong) {
        const it = g.items[i];
        const card = h('details', { class: 'qcard no exreview' }, h('summary', null, h('span', { class: 'qnum' }, String(i + 1)), ' ', q.q.en));
        card.appendChild(bi(q.q, 'qtext'));
        if (q.code) card.appendChild(h('pre', { class: 'mono lcode qcode' }, q.code));
        card.appendChild(h('div', { class: 'qopts' }, q.options.map((o, oi) => h('div', { class: 'qopt' + (o.correct ? ' right' : it.chosen === oi ? ' wrong' : '') }, this.optEl(o.t)))));
        card.appendChild(h('div', { class: 'qexp' }, bi(q.explain)));
        const tb = Tutor.button(() => Tutor.ctxQuestion(q, it.chosen));
        if (tb) card.appendChild(h('div', { class: 'tactions' }, tb));
        page.appendChild(card);
      }
    }
  },

  // ---------- Инструменты: калькулятор подсетей ----------
  renderToolsNav(list) {
    list.appendChild(h('div', { class: 'lrow on static' }, h('span', { class: 'lnum' }, '🧮'), h('span', { class: 'ltxt' }, h('span', { class: 'len' }, 'Subnet calculator'), App.prefs.ru ? h('span', { class: 'lru' }, 'Калькулятор подсетей') : null)));
    list.appendChild(h('div', { class: 'muted small lnavnote' }, bi(T('Type any address — with /prefix or a mask — and see every bit.', 'Введите любой адрес — с /префиксом или маской — и увидите каждый бит.', 'הקלידו כל כתובת — עם ‎/קידומת או מסכה — ותראו כל סיבית.'))));
  },

  renderTools(page) {
    page.appendChild(bi(T('Subnet calculator', 'Калькулятор подсетей', 'מחשבון תת-רשתות'), 'tasktitle'));
    page.appendChild(bi(T('Network bits are blue, host bits are orange. The network address = all host bits 0, broadcast = all host bits 1.', 'Биты сети — синие, биты хоста — оранжевые. Адрес сети = все биты хоста 0, broadcast = все биты хоста 1.', 'סיביות הרשת כחולות, סיביות המארח כתומות. כתובת הרשת = כל סיביות המארח 0, ‏broadcast = כל סיביות המארח 1.'), 'intro'));
    const inp = h('input', { class: 'inp calcinp mono', value: this.calc.text, placeholder: '192.168.1.10/26  ·  10.0.0.5 255.255.255.252', spellcheck: 'false' });
    const out = h('div', { class: 'calcout' });
    const draw = () => {
      clear(out);
      const p = parseIpPrefix(inp.value);
      if (!p) { out.appendChild(bi(T('Type an IPv4 address like 192.168.1.10/26 or 10.0.0.5 255.255.255.252.', 'Введите IPv4-адрес, например 192.168.1.10/26 или 10.0.0.5 255.255.255.252.', 'הקלידו כתובת IPv4, למשל 192.168.1.10/26 או 10.0.0.5 255.255.255.252.'), 'muted')); return; }
      this.calc.text = inp.value;
      out.appendChild(renderSubnet(subnetInfo(p.ip, p.len)));
    };
    inp.addEventListener('input', draw);
    const slider = h('input', { type: 'range', min: 8, max: 32, class: 'calcslider' });
    const p0 = parseIpPrefix(this.calc.text);
    slider.value = p0 ? p0.len : 24;
    slider.addEventListener('input', () => { const p = parseIpPrefix(inp.value) || { ip: '192.168.1.10' }; inp.value = p.ip + '/' + slider.value; draw(); });
    page.appendChild(h('div', { class: 'calcbar' }, inp, h('label', { class: 'muted small' }, '/8 ', slider, ' /32')));
    page.appendChild(out);
    draw();
  },

  // ---------- Озвучка урока ----------
  speechQueue(l, lang) {
    const q = [];
    const push = (t, idx) => {
      const s = typeof t === 'string' ? t : t && t[lang];
      if (!s) return;
      for (const part of String(s).split(/(?<=[.!?:;])\s+/)) if (part.trim()) q.push({ text: part.trim(), idx });
    };
    push(l.title, 'title'); push(l.goal, 'goal');
    l.sections.forEach((s, i) => {
      push(s.h, 's' + i);
      s.blocks.forEach((b, j) => {
        const idx = 's' + i + 'b' + j;
        if (b.k === 'p' || b.k === 'tip') push(b.t, idx);
        else if (b.k === 'ul') b.items.forEach((it) => push(it, idx));
        else if (b.k === 'table') b.rows.forEach((r) => push(r.map((c) => (typeof c === 'string' ? c : c[lang])).join(', '), idx));
      });
    });
    return q;
  },
  audioState() { return this._audio || (this._audio = { playing: false, lesson: null, i: 0, lang: App.prefs.he && !App.prefs.ru ? 'he' : 'en', rate: 1 }); },
  audioStop() {
    const a = this.audioState();
    a.playing = false;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) { /* нет озвучки */ }
    $all('#learn .saying').forEach((x) => x.classList.remove('saying'));
  },
  audioPlay(l) {
    const synth = window.speechSynthesis;
    if (!synth) { toast(triText(T('Speech is not available in this browser', 'Озвучка недоступна в этом браузере', 'הקראה לא זמינה בדפדפן הזה'))); return; }
    const a = this.audioState();
    if (a.lesson !== l.id) { a.lesson = l.id; a.i = 0; }
    a.queue = this.speechQueue(l, a.lang);
    if (a.i >= a.queue.length) a.i = 0;
    a.playing = true;
    const code = { en: 'en-US', ru: 'ru-RU', he: 'he-IL' }[a.lang];
    const voice = synth.getVoices().find((v) => v.lang && v.lang.toLowerCase().startsWith(a.lang));
    if (!voice && a.lang !== 'en') toast(triText(T('No ' + (a.lang === 'he' ? 'Hebrew' : 'Russian') + ' voice on this device — add one in the system settings (Speech / Spoken Content).', 'На устройстве нет голоса для ' + (a.lang === 'he' ? 'иврита' : 'русского') + ' — добавьте его в настройках системы (Речь / Устный контент).', 'אין במכשיר קול ב' + (a.lang === 'he' ? 'עברית' : 'רוסית') + ' — הוסיפו אותו בהגדרות המערכת.')));
    const next = () => {
      if (!a.playing || a.lesson !== l.id) return;
      if (a.i >= a.queue.length) { a.playing = false; a.i = 0; this.renderAudioBar(); $all('#learn .saying').forEach((x) => x.classList.remove('saying')); return; }
      const item = a.queue[a.i];
      $all('#learn .saying').forEach((x) => x.classList.remove('saying'));
      const el = document.querySelector('#learn [data-say="' + item.idx + '"]');
      if (el) { el.classList.add('saying'); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
      const u = new SpeechSynthesisUtterance(item.text);
      u.lang = code; if (voice) u.voice = voice; u.rate = a.rate;
      u.onend = () => { a.i++; next(); };
      u.onerror = () => { a.i++; next(); };
      synth.speak(u);
      this.renderAudioBar();
    };
    synth.cancel();
    next();
  },
  renderAudioBar(l) {
    const host = document.querySelector('#learn .audiobar');
    if (!host) return;
    l = l || lessonGet(this.st.cur);
    if (!l) return;
    const a = this.audioState();
    clear(host);
    const total = this.speechQueue(l, a.lang).length;
    const langs = [['en', 'EN'], ['he', 'עב'], ['ru', 'RU']];
    appendKids(host, [
      h('button', { class: 'btn sm primary', onclick: () => { if (a.playing) { this.audioStop(); this.renderAudioBar(); } else this.audioPlay(l); } }, a.playing ? '⏸' : '🔊', ' ', a.playing ? tri('Pause', 'пауза', 'השהיה') : tri('Listen to the lesson', 'слушать урок', 'להאזין לשיעור')),
      h('button', { class: 'btn sm', title: 'Stop', onclick: () => { this.audioStop(); a.i = 0; this.renderAudioBar(); } }, '⏹'),
      h('div', { class: 'lseg' }, langs.map(([v, lab]) => h('button', { class: 'lsegb' + (a.lang === v ? ' on' : ''), onclick: () => { const was = a.playing; this.audioStop(); a.lang = v; a.i = 0; if (was) this.audioPlay(l); else this.renderAudioBar(); } }, lab))),
      h('select', { class: 'inp sm', onchange: (e) => { a.rate = Number(e.target.value); if (a.playing) { this.audioStop(); this.audioPlay(l); } } }, [0.8, 0.9, 1, 1.15].map((r) => h('option', { value: r, selected: a.rate === r }, '×' + r))),
      h('span', { class: 'muted small' }, (a.lesson === l.id ? Math.min(a.i + 1, total) : 0) + ' / ' + total),
    ]);
  },

  // ---------- Ответ на собеседовании голосом ----------
  voiceSupported() { return !!(window.SpeechRecognition || window.webkitSpeechRecognition); },
  voiceToggle() {
    const v = this.voice;
    if (v.listening) { try { v.rec.stop(); } catch (e) { /* уже остановлено */ } return; }
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) { toast(triText(T('Voice input is not available here — type, or use the system dictation (press Fn twice on a Mac).', 'Голосовой ввод здесь недоступен — печатайте или используйте диктовку системы (на Mac — дважды Fn).', 'הקלטה קולית לא זמינה כאן — הקלידו, או השתמשו בהכתבה של המערכת (ב-Mac לוחצים פעמיים Fn).'))); return; }
    const rec = new R();
    rec.lang = { en: 'en-US', he: 'he-IL', ru: 'ru-RU' }[v.lang];
    rec.continuous = true;
    rec.interimResults = true;
    const base = v.text ? v.text.trim() + ' ' : '';
    rec.onresult = (e) => {
      let txt = '';
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0].transcript;
      v.text = base + txt;
      const ta = document.querySelector('#learn .voicetext');
      if (ta) ta.value = v.text;
    };
    rec.onerror = (e) => {
      v.listening = false;
      const denied = e && (e.error === 'not-allowed' || e.error === 'service-not-allowed');
      toast(triText(denied ? T('The microphone is blocked on this page — type the answer or use the system dictation (Fn Fn on a Mac).', 'Микрофон заблокирован на этой странице — напечатайте ответ или используйте диктовку системы (Fn Fn на Mac).', 'המיקרופון חסום בדף הזה — הקלידו את התשובה או השתמשו בהכתבה של המערכת (Fn Fn ב-Mac).')
        : T('Voice input stopped.', 'Голосовой ввод остановлен.', 'ההקלטה נעצרה.')));
      this.render();
    };
    rec.onend = () => { v.listening = false; this.render(); };
    try { rec.start(); v.rec = rec; v.listening = true; this.render(); } catch (e) { v.listening = false; }
  },
  async voiceCheck(x) {
    const v = this.voice;
    if (!v.text.trim()) { toast(triText(T('Say or type your answer first', 'Сначала скажите или напечатайте ответ', 'קודם אמרו או הקלידו תשובה'))); return; }
    if (v.listening) { try { v.rec.stop(); } catch (e) { /* уже остановлено */ } }
    const local = interviewCheckLocal(x.a.en, v.text, GLOSSARY);
    v.result = Object.assign({ source: 'local' }, local);
    this.iv.shown = true;
    this.render();
    if (!Tutor.ready) return;
    v.busy = true; this.render();
    const lang = Tutor.lang();
    const prompt = 'You check a spoken answer at a junior network engineer job interview (CCNA level). The answer may be in English, Hebrew or Russian and may contain speech-recognition errors — be tolerant.\n' +
      'Question: ' + x.q.en + '\nModel answer: ' + x.a.en + '\nCandidate answer: ' + v.text.slice(0, 4000) + '\n\n' +
      'Reply with only JSON: {"score": 0-100, "covered": [short key points the candidate said], "missed": [important key points missing], "wrong": [statements that are incorrect], "tip": "one sentence how to improve", "better": "a short improved answer in English, max 70 words"}. ' +
      'Write covered, missed, wrong and tip in ' + TUTOR_LANGS[lang] + '.';
    try {
      const r = await Tutor.sample.json(prompt, {});
      if (r && typeof r === 'object') v.result = { source: 'claude', score: Number(r.score) || 0, covered: (r.covered || []).map(String), missed: (r.missed || []).map(String), wrong: (r.wrong || []).map(String), tip: r.tip ? String(r.tip) : '', better: r.better ? String(r.better) : '' };
    } catch (e) { if (e && e.code === 'not_granted') Tutor.ready = false; }
    v.busy = false;
    this.render();
  },

  renderVoice(card, x) {
    const v = this.voice;
    if (v.for !== x.id) { this.voice = Object.assign(this.voice, { for: x.id, text: '', result: null, busy: false }); }
    const box = h('div', { class: 'voicebox' });
    box.appendChild(h('div', { class: 'voicehead' }, h('b', null, '🎙 ', tri('Your answer', 'ваш ответ', 'התשובה שלכם')),
      h('div', { class: 'lseg' }, [['en', 'English'], ['he', 'עברית'], ['ru', 'Русский']].map(([l, lab]) => h('button', { class: 'lsegb' + (v.lang === l ? ' on' : ''), onclick: () => { v.lang = l; this.render(); } }, lab)))));
    const ta = h('textarea', { class: 'inp voicetext', rows: 4, dir: v.lang === 'he' ? 'rtl' : 'auto', placeholder: triText(T('Press the microphone and speak — or type here (on a Mac you can also press Fn twice to dictate).', 'Нажмите на микрофон и говорите — или печатайте здесь (на Mac можно дважды нажать Fn для диктовки).', 'לחצו על המיקרופון ודברו — או הקלידו כאן (ב-Mac אפשר גם ללחוץ פעמיים Fn להכתבה).')) }, v.text);
    ta.addEventListener('input', () => { v.text = ta.value; });
    box.appendChild(ta);
    box.appendChild(h('div', { class: 'tactions' },
      this.voiceSupported() ? h('button', { class: 'btn' + (v.listening ? ' rec' : ''), onclick: () => this.voiceToggle() }, v.listening ? '⏹ ' : '🎙 ', v.listening ? tri('Stop', 'стоп', 'עצור') : tri('Speak', 'говорить', 'לדבר')) : null,
      h('button', { class: 'btn primary', disabled: v.busy, onclick: () => this.voiceCheck(x) }, '✓ ', tri('Check my answer', 'проверить ответ', 'לבדוק את התשובה'))));
    if (v.busy) box.appendChild(h('div', { class: 'muted' }, '🤖 ', tri('Claude is checking…', 'Claude проверяет…', 'Claude בודק…')));
    if (v.result) {
      const r = v.result;
      const chips = (arr, cls) => h('div', { class: 'chips' }, arr.map((s) => h('span', { class: 'chip ' + cls }, s)));
      box.appendChild(h('div', { class: 'score' + (r.score >= 70 ? ' done' : ' fail') }, h('b', null, r.score + '% '), r.source === 'claude' ? '🤖 Claude' : tri('key points found', 'найдено ключевых моментов', 'נקודות מפתח שנמצאו')));
      if (r.covered.length) box.appendChild(h('div', null, h('div', { class: 'clabel' }, '✓ ', tri('You said', 'вы сказали', 'אמרתם')), chips(r.covered, 'ok')));
      if (r.missed.length) box.appendChild(h('div', null, h('div', { class: 'clabel' }, '✗ ', tri('Missing', 'не хватает', 'חסר')), chips(r.missed, 'no')));
      if (r.wrong && r.wrong.length) box.appendChild(h('div', null, h('div', { class: 'clabel' }, '⚠ ', tri('Not correct', 'неверно', 'לא נכון')), chips(r.wrong, 'warn')));
      if (r.tip) box.appendChild(h('div', { class: 'ltip' }, h('span', null, '💡'), h('div', null, r.tip)));
      if (r.better) box.appendChild(h('div', { class: 'voicebetter' }, h('div', { class: 'clabel' }, tri('A stronger answer', 'более сильный ответ', 'תשובה חזקה יותר')), h('div', null, r.better)));
    }
    card.appendChild(box);
  },
});

function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return (m >= 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0');
}

// Калькулятор: биты по октетам, синие — сеть, оранжевые — хост.
function renderSubnet(s) {
  const bitRow = (label, bits, hint) => {
    const cells = [];
    for (let i = 0; i < 32; i++) {
      if (i && i % 8 === 0) cells.push(h('span', { class: 'bdot' }, '.'));
      cells.push(h('span', { class: 'bit ' + (i < s.len ? 'n' : 'h') }, bits[i]));
    }
    return h('div', { class: 'bitrow' }, h('span', { class: 'bitlbl' }, label), h('span', { class: 'bits mono' }, cells), h('span', { class: 'bitdec mono' }, hint));
  };
  const kinds = { private: T('private (RFC 1918)', 'частный (RFC 1918)', 'פרטית (RFC 1918)'), public: T('public', 'публичный', 'ציבורית'), loopback: T('loopback', 'loopback', 'loopback'), 'link-local': T('link-local (APIPA)', 'link-local (APIPA)', 'link-local ‏(APIPA)'), multicast: T('multicast', 'multicast', 'multicast'), reserved: T('reserved', 'зарезервирован', 'שמורה') };
  const rows = [
    [T('Network address', 'Адрес сети', 'כתובת רשת'), s.network + '/' + s.len],
    [T('Broadcast', 'Broadcast', 'Broadcast'), s.broadcast],
    [T('Usable hosts', 'Адреса для хостов', 'כתובות למארחים'), s.len >= 31 ? s.first + ' – ' + s.last : s.first + ' – ' + s.last],
    [T('Number of hosts', 'Сколько хостов', 'מספר מארחים'), s.len >= 31 ? String(s.hosts) : '2^' + (32 - s.len) + ' − 2 = ' + s.hosts],
    [T('Subnet mask', 'Маска', 'מסכה'), s.mask + '  (/' + s.len + ')'],
    [T('Wildcard (ACL, OSPF)', 'Wildcard (ACL, OSPF)', 'Wildcard ‏(ACL, OSPF)'), s.wildcard],
    [T('Class / type', 'Класс / тип', 'מחלקה / סוג'), s.cls + ' · ' + triText(kinds[s.kind], ' / ')],
  ];
  const out = h('div', { class: 'col' });
  out.appendChild(h('div', { class: 'bitbox' },
    bitRow('IP', s.bits.ip, s.ip), bitRow('Mask', s.bits.mask, s.mask), bitRow('Network', s.bits.network, s.network), bitRow('Bcast', s.bits.broadcast, s.broadcast)));
  out.appendChild(h('table', { class: 'grid calctable' }, rows.map(([k, v]) => h('tr', null, h('th', null, tri(k.en, k.ru, k.he)), h('td', { class: 'mono' }, v)))));
  if (s.isNetwork) out.appendChild(bi(T('⚠ This is the network address itself — it cannot be given to a host.', '⚠ Это сам адрес сети — его нельзя дать хосту.', '⚠ זו כתובת הרשת עצמה — אי אפשר לתת אותה למארח.'), 'calcwarn'));
  if (s.isBroadcast) out.appendChild(bi(T('⚠ This is the broadcast address — it cannot be given to a host.', '⚠ Это broadcast-адрес — его нельзя дать хосту.', '⚠ זו כתובת ה-broadcast — אי אפשר לתת אותה למארח.'), 'calcwarn'));
  if (s.len > 0 && s.len < 32) {
    const o = s.block.octet;
    out.appendChild(h('div', { class: 'ltip' }, h('span', null, '💡'), bi(T('Quick method: the boundary is in octet ' + o + '. Mask value there = ' + s.block.maskValue + ', block size = 256 − ' + s.block.maskValue + ' = ' + s.block.size + '. Subnets start at multiples of ' + s.block.size + ' in that octet; this address falls into ' + s.network + '.',
      'Быстрый способ: граница в ' + o + '-м октете. Значение маски там = ' + s.block.maskValue + ', размер блока = 256 − ' + s.block.maskValue + ' = ' + s.block.size + '. Подсети начинаются с чисел, кратных ' + s.block.size + ', в этом октете; этот адрес попадает в ' + s.network + '.',
      'שיטה מהירה: הגבול נמצא באוקטט ' + o + '. ערך המסכה שם = ' + s.block.maskValue + ', גודל הגוש = ‎256 − ' + s.block.maskValue + ' = ' + s.block.size + '. תת-הרשתות מתחילות בכפולות של ' + s.block.size + ' באוקטט הזה; הכתובת נופלת ב-' + s.network + '.'))));
  }
  return out;
}
