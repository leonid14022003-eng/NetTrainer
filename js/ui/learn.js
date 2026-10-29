'use strict';
// Вкладка Learn: полный курс (ITN → SRWE → ENSA), тренажёры, глоссарий с карточками, подготовка к собеседованию.
// Слева — навигация режима, справа — страница. Прогресс хранится в браузере (Store).

const Learn = {
  mode: 'today',             // today | course | drills | mistakes | exam | glossary | interview | tools
  st: { cur: 'home', best: {}, passed: {}, days: [], open: {} },
  quizzes: {},               // id → { quiz, answers, grade }
  dr: null,                  // текущий тренажёр
  gl: { filter: 'all', q: '', view: 'cards', cur: null, shown: false },
  iv: { cur: null, shown: false },
  navOpen: false,

  init() {
    this.st = Object.assign(this.st, Store.get('learn', {}));
    if (!this.st.days) this.st.days = [];
    if (!this.st.open) this.st.open = {};
    this.mode = Store.get('learnMode', 'today');
    if (!Learn.MODES.some((m) => m[0] === this.mode)) this.mode = 'today';
    this.loadData();
    if (!this.validPage(this.st.cur)) this.st.cur = 'home';
    const run = Store.get('examRun', null);
    if (run && run.questions && run.start + run.seconds * 1000 > Date.now()) { this.ex = run; this.examTick(); }
    document.addEventListener('keydown', (e) => this.onKey(e));
  },
  // карточки и оценки собеседования переводятся в новый формат (с датой — для слияния между устройствами)
  loadData() {
    const cards = Store.get('cards', {});
    this.cards = {};
    for (const [k, v] of Object.entries(cards)) this.cards[k] = srsCard(v);
    const iv = Store.get('ivRate', {});
    this.ivRate = ivRateFix(iv);
    if (JSON.stringify(this.ivRate) !== JSON.stringify(iv)) Store.set('ivRate', this.ivRate);
    this.drillBest = Store.get('drillBest', {});
    this.book = Store.get('mistakes', {});
    this.act = Store.get('activity', {});
    this.exams = Store.get('exams', []);
  },
  // данные пришли с другого устройства
  reload() {
    this.st = Object.assign(this.st, Store.get('learn', {}));
    if (!this.st.days) this.st.days = [];
    if (!this.st.open) this.st.open = {};
    if (!this.validPage(this.st.cur)) this.st.cur = 'home';
    this.loadData();
  },
  save() { this.st.t = Date.now(); Store.set('learn', this.st); },
  validPage(id) { return id === 'home' || id === 'final' || /^final:/.test(id) || /^soon:/.test(id) || !!lessonGet(id); },

  // --- серия дней занятий ---
  today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  markDay() {
    const t = this.today();
    if (!this.st.days.includes(t)) { this.st.days.push(t); this.st.days = this.st.days.slice(-120); this.save(); }
  },
  streak() { return this.streakAll(); },

  setMode(m) {
    if (this.mode !== m) this.audioStop();
    this.mode = m;
    Store.set('learnMode', m);
    this.navOpen = false;
    this.render(true);
  },
  open(id) {
    if (this.st.cur !== id) this.audioStop();
    this.mode = 'course';
    Store.set('learnMode', 'course');
    this.st.cur = id;
    const part = lessonGet(id) ? coursePartOf(id) : null;
    if (part) this.st.open[part.id] = true;
    this.save();
    this.navOpen = false;
    this.render(true);
  },
  nextLesson() {
    const order = courseOrder();
    return order.find((id) => !this.st.passed[id]) || null;
  },

  quizState(id) {
    if (!this.quizzes[id]) this.quizzes[id] = { quiz: quizBuild(id, Math.floor(Math.random() * 1e9) + 1, id.startsWith('final:') ? 20 : undefined), answers: [], grade: null };
    return this.quizzes[id];
  },
  retake(id) {
    delete this.quizzes[id];
    this.render();
    const el = document.getElementById('lquiz');
    if (el) el.scrollIntoView({ block: 'start' });
  },
  submit(id) {
    const qs = this.quizState(id);
    const left = qs.quiz.questions.length - qs.answers.filter((a) => a !== undefined && a !== null).length;
    if (left) { toast('Answer all questions first — осталось ' + left); return; }
    qs.grade = quizGrade(qs.quiz, qs.answers);
    this.st.best[id] = Math.max(this.st.best[id] || 0, qs.grade.pct);
    if (qs.grade.passed) this.st.passed[id] = true;
    const now = Date.now();
    qs.quiz.questions.forEach((q, i) => { if (!qs.grade.items[i].ok) mistakeAddQuestion(this.book, q, now); });
    Store.set('mistakes', this.book);
    if (qs.grade.passed) this.bump('quiz');
    this.markDay();
    this.save();
    this.render();
    const sc = document.querySelector('#learn .lscore');
    if (sc) sc.scrollIntoView({ block: 'center' });
  },
  practice(topic) {
    Training.filters.topic = topic;
    Store.set('trainFilters', Training.filters);
    App.setView('training');
    Training.newTask();
  },
  startDrill(id) {
    this.mode = 'drills';
    Store.set('learnMode', 'drills');
    this.dr = { id, q: null, chosen: null, n: 0, ok: 0, streak: 0 };
    this.nextDrill();
  },
  nextDrill() {
    if (!this.dr) return;
    this.dr.q = drillQuestion(this.dr.id, makeRng(Math.floor(Math.random() * 1e9) + 1));
    this.dr.chosen = null;
    this.navOpen = false;
    this.render(true);
  },
  answerDrill(i) {
    const d = this.dr;
    if (!d || !d.q || d.chosen !== null || i >= d.q.options.length) return;
    d.chosen = i;
    d.n++;
    if (d.q.options[i].correct) { d.ok++; d.streak++; } else { d.streak = 0; this.addMistakeQ(d.q); }
    this.bump('drills');
    if (d.streak > (this.drillBest[d.id] || 0)) { this.drillBest[d.id] = d.streak; Store.set('drillBest', this.drillBest); }
    this.markDay();
    this.render();
  },
  onKey(e) {
    if (App.view !== 'learn' || e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (this.mode === 'drills' && this.dr && this.dr.q) {
      if (/^[1-4]$/.test(e.key) && this.dr.chosen === null) { e.preventDefault(); this.answerDrill(Number(e.key) - 1); }
      else if (e.key === 'Enter' && this.dr.chosen !== null) { e.preventDefault(); this.nextDrill(); }
    }
    if (this.mode === 'mistakes' && this.ms.cur && this.ms.order) {
      if (/^[1-4]$/.test(e.key) && this.ms.chosen === null && Number(e.key) <= this.ms.order.length) { e.preventDefault(); this.msAnswer(Number(e.key) - 1); }
      else if (e.key === 'Enter' && this.ms.chosen !== null) { e.preventDefault(); this.msNext(); }
    }
    if (this.mode === 'exam' && this.ex) {
      const q = this.ex.questions[this.ex.cur];
      if (/^[1-4]$/.test(e.key) && Number(e.key) <= q.options.length) { e.preventDefault(); this.examAnswer(Number(e.key) - 1); }
      else if (e.key === 'ArrowRight' || e.key === 'Enter') { e.preventDefault(); this.examGo(this.ex.cur + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); this.examGo(this.ex.cur - 1); }
    }
  },

  // --- общие элементы ---
  langToggles() {
    const tog = (key, label, title) => h('label', { class: 'rutoggle', title }, h('input', { type: 'checkbox', checked: App.prefs[key], onchange: (e) => { App.prefs[key] = e.target.checked; App.queueSave(); this.render(); } }), ' ' + label);
    return h('span', { class: 'ltoggles' }, tog('en', 'EN', 'English'), tog('ru', 'RU', 'Russian translation'), tog('he', 'HE', 'Hebrew translation — иврит'));
  },
  sec(t) { return h('div', { class: 'sechdr' }, t.en, App.prefs.ru && t.ru ? h('span', { class: 'ru' }, ' · ' + t.ru) : null, App.prefs.he && t.he ? h('span', { class: 'ru' }, ' · ', h('bdi', { class: 'he', dir: 'rtl' }, t.he)) : null); },
  txt(x, cls) { return typeof x === 'string' ? h('span', { class: cls || '' }, x) : bi(x, cls); },
  say(t) {
    const b = (lang, label) => h('button', { class: 'say', title: 'Listen', onclick: (e) => { e.stopPropagation(); speak(t[lang], lang); } }, '🔊 ' + label);
    return h('span', { class: 'says' }, b('en', 'EN'), t.he && App.prefs.he ? b('he', 'HE') : null, t.ru && App.prefs.ru ? b('ru', 'RU') : null);
  },

  render(toTop) {
    const el = document.getElementById('learn');
    if (!el || App.view !== 'learn') return;
    const old = el.querySelector('.lmain');
    const keep = old && !toTop ? old.scrollTop : 0;
    const navOld = el.querySelector('.llist');
    const navKeep = navOld ? navOld.scrollTop : 0;
    clear(el);
    el.classList.toggle('navopen', this.navOpen);
    el.appendChild(this.renderNav());
    const main = h('div', { class: 'lmain' });
    const page = h('div', { class: 'lpage' });
    page.appendChild(h('button', { class: 'btn sm lnavbtn', onclick: () => { this.navOpen = !this.navOpen; this.render(); } }, '☰ ' + ({ today: 'Today', course: 'Modules', drills: 'Drills', mistakes: 'Mistakes', exam: 'Exam', glossary: 'Glossary', interview: 'Questions', tools: 'Tools' })[this.mode]));
    if (this.mode === 'today') this.renderToday(page);
    else if (this.mode === 'drills') this.renderDrill(page);
    else if (this.mode === 'mistakes') this.renderMistakes(page);
    else if (this.mode === 'exam') this.renderExam(page);
    else if (this.mode === 'tools') this.renderTools(page);
    else if (this.mode === 'glossary') this.renderGlossary(page);
    else if (this.mode === 'interview') this.renderInterview(page);
    else {
      const cur = this.st.cur;
      if (cur === 'home') this.renderHome(page);
      else if (cur === 'final' || cur.startsWith('final:')) this.renderFinal(page, cur);
      else if (cur.startsWith('soon:')) this.renderSoon(page, cur);
      else this.renderLesson(page, lessonGet(cur));
    }
    main.appendChild(page);
    el.appendChild(main);
    main.scrollTop = keep;
    const navNew = el.querySelector('.llist');
    if (navNew) navNew.scrollTop = navKeep;
    Sync.badge();
    if (this.mode === 'course' && lessonGet(this.st.cur)) this.renderAudioBar();
  },

  // --- навигация ---
  renderNav() {
    const nav = h('div', { class: 'lnav' });
    const due = mistakeDue(this.book, Date.now()).length;
    nav.appendChild(h('div', { class: 'lnavhead' },
      h('div', { class: 'ttitle' }, h('span', { class: 'ticon learn', html: iconUse('v-learn', 18, 18) }), h('span', null, 'Learn'), h('span', { class: 'muted' }, ' — обучение'), h('span', { class: 'syncbadge', hidden: true }),
        h('button', { class: 'lio', title: triText(T('Move progress: export / import', 'Перенос прогресса: выгрузить / загрузить', 'העברת התקדמות: ייצוא / ייבוא')), onclick: () => progressDialog() }, '⇅'), this.langToggles()),
      h('div', { class: 'lmodes' }, Learn.MODES.map(([id, ic, en, ru, he]) => h('button', { class: 'lmode' + (this.mode === id ? ' on' : ''), onclick: () => this.setMode(id), title: ru + ' · ' + he },
        h('span', { class: 'lmi' }, ic), h('span', null, en), id === 'mistakes' && due ? h('span', { class: 'lmbadge' }, String(due)) : null)))));
    const list = h('div', { class: 'llist' });
    if (this.mode === 'today') this.renderTodayNav(list);
    else if (this.mode === 'course') this.renderCourseNav(list);
    else if (this.mode === 'drills') this.renderDrillNav(list);
    else if (this.mode === 'mistakes') this.renderMistNav(list);
    else if (this.mode === 'exam') this.renderExamNav(list);
    else if (this.mode === 'tools') this.renderToolsNav(list);
    else if (this.mode === 'glossary') this.renderGlossNav(list);
    else this.renderIvNav(list);
    nav.appendChild(list);
    return nav;
  },

  renderCourseNav(list) {
    const ru = App.prefs.ru;
    const order = courseOrder();
    const passedN = order.filter((id) => this.st.passed[id]).length;
    list.appendChild(h('div', { class: 'lprog' },
      h('div', { class: 'lprogrow' }, h('span', null, 'Passed ' + passedN + ' / ' + order.length + (ru ? ' · пройдено' : '')), h('span', { title: 'Days in a row — дней подряд' }, '🔥 ' + this.streak())),
      h('div', { class: 'bar' }, h('div', { style: { width: Math.round(passedN * 100 / order.length) + '%' } }))));
    list.appendChild(h('button', { class: 'lrow home' + (this.st.cur === 'home' ? ' on' : ''), onclick: () => this.open('home') }, h('span', { class: 'lnum' }, '⌂'), h('span', { class: 'ltxt' }, h('span', { class: 'len' }, 'Start here'), ru ? h('span', { class: 'lru' }, 'Начало и план') : null)));
    for (const part of COURSE) {
      const lessons = part.modules.filter((m) => m.lesson);
      const done = [...new Set(lessons.map((m) => m.lesson))].filter((id) => this.st.passed[id]).length;
      const total = new Set(lessons.map((m) => m.lesson)).size;
      const curPart = lessonGet(this.st.cur) && coursePartOf(this.st.cur) === part;
      const isOpen = this.st.open[part.id] !== undefined ? this.st.open[part.id] : (curPart || part.id === 'itn');
      list.appendChild(h('button', { class: 'lpart' + (isOpen ? ' open' : ''), onclick: () => { this.st.open[part.id] = !isOpen; this.save(); this.render(); } },
        h('span', { class: 'lcode' }, part.code), h('span', { class: 'ltxt' }, h('span', { class: 'len' }, part.title.en), ru ? h('span', { class: 'lru' }, part.title.ru) : null),
        h('span', { class: 'lcount' }, done + '/' + total), h('span', { class: 'caret' }, isOpen ? '▾' : '▸')));
      if (!isOpen) continue;
      for (const m of part.modules) {
        const id = m.lesson || 'soon:' + part.id + ':' + m.n;
        const best = m.lesson ? this.st.best[m.lesson] : undefined;
        const passed = m.lesson && this.st.passed[m.lesson];
        list.appendChild(h('button', { class: 'lrow' + (this.st.cur === id ? ' on' : '') + (m.lesson ? '' : ' soon'), onclick: () => this.open(id) },
          h('span', { class: 'lnum' + (passed ? ' ok' : '') }, passed ? '✓' : String(m.n)),
          h('span', { class: 'ltxt' }, h('span', { class: 'len' }, m.title.en), ru ? h('span', { class: 'lru' }, m.title.ru) : null),
          !m.lesson ? h('span', { class: 'lsoon' }, 'soon') : best !== undefined ? h('span', { class: 'lbest' + (best >= QUIZ_PASS ? ' ok' : '') }, best + '%') : null));
      }
      if (total >= 3) {
        const fid = 'final:' + part.id, fb = this.st.best[fid];
        list.appendChild(h('button', { class: 'lrow final' + (this.st.cur === fid ? ' on' : ''), onclick: () => this.open(fid) },
          h('span', { class: 'lnum' + (this.st.passed[fid] ? ' ok' : '') }, this.st.passed[fid] ? '✓' : '🏁'),
          h('span', { class: 'ltxt' }, h('span', { class: 'len' }, part.code + ' final exam'), ru ? h('span', { class: 'lru' }, 'Итоговый тест ' + part.code) : null),
          fb !== undefined ? h('span', { class: 'lbest' + (fb >= QUIZ_PASS ? ' ok' : '') }, fb + '%') : null));
      }
    }
    const fb = this.st.best.final;
    list.appendChild(h('button', { class: 'lrow final' + (this.st.cur === 'final' ? ' on' : ''), onclick: () => this.open('final') },
      h('span', { class: 'lnum' + (this.st.passed.final ? ' ok' : '') }, this.st.passed.final ? '✓' : '🎓'),
      h('span', { class: 'ltxt' }, h('span', { class: 'len' }, 'Whole course exam'), ru ? h('span', { class: 'lru' }, 'Экзамен по всему курсу') : null),
      fb !== undefined ? h('span', { class: 'lbest' + (fb >= QUIZ_PASS ? ' ok' : '') }, fb + '%') : null));
  },

  renderDrillNav(list) {
    const ru = App.prefs.ru;
    for (const d of DRILLS.concat([{ id: 'mixed', icon: '🎲', title: T('Mixed — everything', 'Всё вперемешку', 'הכול מעורב') }])) {
      const best = this.drillBest[d.id];
      list.appendChild(h('button', { class: 'lrow' + (this.dr && this.dr.id === d.id ? ' on' : ''), onclick: () => this.startDrill(d.id) },
        h('span', { class: 'lnum' }, d.icon), h('span', { class: 'ltxt' }, h('span', { class: 'len' }, d.title.en), ru ? h('span', { class: 'lru' }, d.title.ru) : null),
        best ? h('span', { class: 'lbest ok', title: 'Best streak — лучшая серия' }, '🔥' + best) : null));
    }
  },

  glossParts() { return [['all', T('All terms', 'Все термины', 'כל המונחים')]].concat(COURSE.map((p) => [p.id, p.title])); },
  glossList() {
    const q = this.gl.q.trim().toLowerCase();
    return GLOSSARY.filter((g) => (this.gl.filter === 'all' || coursePartOf(g.lesson).id === this.gl.filter) &&
      (!q || [g.term.en, g.term.ru, g.term.he, g.def.en].some((s) => s.toLowerCase().includes(q))));
  },
  renderGlossNav(list) {
    const ru = App.prefs.ru;
    for (const [id, t] of this.glossParts()) {
      const n = GLOSSARY.filter((g) => id === 'all' || coursePartOf(g.lesson).id === id).length;
      if (!n) continue;
      list.appendChild(h('button', { class: 'lrow' + (this.gl.filter === id ? ' on' : ''), onclick: () => { this.gl.filter = id; this.gl.cur = null; this.gl.shown = false; this.navOpen = false; this.render(true); } },
        h('span', { class: 'ltxt' }, h('span', { class: 'len' }, t.en), ru ? h('span', { class: 'lru' }, t.ru) : null), h('span', { class: 'lcount' }, String(n))));
    }
    const boxes = [0, 1, 2, 3].map((b) => GLOSSARY.filter((g) => srsCard(this.cards[g.id]).box === b).length);
    list.appendChild(h('div', { class: 'lboxes' }, h('div', { class: 'muted' }, 'Cards by level' + (ru ? ' · карточки по уровням' : '')),
      h('div', { class: 'lboxrow' }, boxes.map((n, b) => h('span', { class: 'lbox b' + b, title: ['New / forgotten', 'Learning', 'Almost', 'Known'][b] }, String(n))))));
  },
  renderIvNav(list) {
    const ru = App.prefs.ru;
    INTERVIEW.forEach((x, i) => {
      const r = this.ivr(x.id);
      list.appendChild(h('button', { class: 'lrow' + (this.iv.cur === x.id ? ' on' : ''), onclick: () => { this.iv.cur = x.id; this.iv.shown = false; this.navOpen = false; this.render(true); } },
        h('span', { class: 'lnum' + (r === 'good' ? ' ok' : r === 'part' ? ' mid' : r === 'no' ? ' no' : '') }, r === 'good' ? '✓' : String(i + 1)),
        h('span', { class: 'ltxt' }, h('span', { class: 'len' }, x.q.en), ru ? h('span', { class: 'lru' }, x.q.ru) : null)));
    });
  },

  // --- страница «Начало» ---
  renderHome(page) {
    const ru = App.prefs.ru;
    const next = this.nextLesson();
    page.appendChild(bi(T('Networking from A to Z', 'Сети от А до Я', 'רשתות מא\' ועד ת\''), 'tasktitle'));
    page.appendChild(bi(T('A full course in the order of Cisco NetAcad — ITN, SRWE, ENSA (together they cover CCNA 200-301). Every lesson is in English with Russian and Hebrew translation, so you can explain each topic in all three languages at an interview.',
      'Полный курс в порядке Cisco NetAcad — ITN, SRWE, ENSA (вместе это программа CCNA 200-301). Каждый урок на английском с переводом на русский и иврит, чтобы на собеседовании вы могли объяснить любую тему на трёх языках.',
      'קורס מלא לפי הסדר של Cisco NetAcad — ‏ITN, ‏SRWE, ‏ENSA (ביחד הם מכסים את CCNA 200-301). כל שיעור באנגלית עם תרגום לרוסית ולעברית, כדי שבראיון עבודה תוכלו להסביר כל נושא בשלוש השפות.'), 'intro'));
    page.appendChild(h('div', { class: 'tactions' },
      next ? h('button', { class: 'btn primary big', onclick: () => this.open(next) }, '▶ ' + (Object.keys(this.st.passed).length ? 'Continue' : 'Start') + ': ' + (courseModuleOf(next) ? coursePartOf(next).code + ' ' + courseModuleOf(next).n + ' — ' : '') + lessonGet(next).title.en)
        : h('button', { class: 'btn primary big', onclick: () => this.open('final') }, '🎓 Whole course exam'),
      h('span', { class: 'lstreak' }, '🔥 ' + this.streak() + (ru ? ' дн. подряд' : ' days in a row'))));
    page.appendChild(this.sec(T('How to study', 'Как заниматься', 'איך לומדים')));
    const steps = [
      T('Read one lesson a day. Turn on RU and HE, read the English first, then the translation.', 'Один урок в день. Включите RU и HE, сначала читайте английский, потом перевод.', 'שיעור אחד ביום. הפעילו RU ו-HE, קראו קודם באנגלית ואז את התרגום.'),
      T('Pass the mini-test at the end (70%). Numbers change every time, so you cannot learn the answers by heart.', 'Сдайте мини-тест в конце (70%). Числа каждый раз новые — ответы не выучить наизусть.', 'עברו את המבחן הקצר בסוף (70%). המספרים משתנים בכל פעם, אז אי אפשר לשנן תשובות.'),
      T('Practise: the Practice button opens a Training task in the simulator; the Drills tab gives endless exercises.', 'Практика: кнопка Practice открывает задание Training в симуляторе; вкладка Drills — бесконечные упражнения.', 'תרגול: הכפתור Practice פותח משימת Training בסימולטור; לשונית Drills נותנת תרגילים בלי סוף.'),
      T('Learn the key terms with Glossary cards and listen to how they sound (🔊).', 'Учите ключевые термины по карточкам Glossary и слушайте произношение (🔊).', 'למדו את המונחים בעזרת כרטיסיות ה-Glossary והקשיבו להגייה (🔊).'),
      T('Interview: answer each question out loud in English, then in Hebrew, then compare with the model answer.', 'Interview: отвечайте на вопрос вслух по-английски, затем на иврите, потом сверяйтесь с образцом.', 'ראיון: ענו על כל שאלה בקול באנגלית, אחר כך בעברית, ואז השוו לתשובה לדוגמה.'),
      T('After each part — the final exam of the part. At the end — the whole course exam.', 'После каждой части — итоговый тест части. В конце — экзамен по всему курсу.', 'אחרי כל חלק — מבחן מסכם של החלק. בסוף — מבחן על כל הקורס.'),
    ];
    page.appendChild(h('ol', { class: 'steps lhow' }, steps.map((s) => h('li', null, bi(s)))));
    page.appendChild(this.sec(T('Your progress', 'Ваш прогресс', 'ההתקדמות שלכם')));
    const grid = h('div', { class: 'lparts' });
    for (const part of COURSE) {
      const mods = part.modules.length, ready = part.modules.filter((m) => m.lesson).length;
      const ids = [...new Set(part.modules.filter((m) => m.lesson).map((m) => m.lesson))];
      const done = ids.filter((id) => this.st.passed[id]).length;
      grid.appendChild(h('div', { class: 'lpartcard' },
        h('div', { class: 'lpchead' }, h('span', { class: 'lcode' }, part.code), bi(part.title)),
        h('div', { class: 'bar' }, h('div', { style: { width: (ids.length ? Math.round(done * 100 / ids.length) : 0) + '%' } })),
        h('div', { class: 'muted' }, done + ' / ' + ids.length + ' passed' + (ready < mods ? ' · ' + (mods - ready) + ' modules coming soon' : ''))));
    }
    page.appendChild(grid);
  },

  renderSoon(page, id) {
    const [, partId, n] = id.split(':');
    const part = COURSE.find((p) => p.id === partId);
    const m = part && part.modules.find((x) => String(x.n) === n);
    if (!m) { this.renderHome(page); return; }
    page.appendChild(h('div', { class: 'badges' }, h('span', { class: 'lvl l2' }, part.code + ' · Module ' + m.n), h('span', { class: 'topic' }, 'coming soon')));
    page.appendChild(bi(m.title, 'tasktitle'));
    page.appendChild(bi(T('This module is being written. Meanwhile: repeat earlier lessons, train in Drills and practise interview answers.',
      'Этот модуль ещё пишется. Пока можно повторить прошлые уроки, позаниматься в Drills и потренировать ответы для собеседования.',
      'המודול הזה עדיין בכתיבה. בינתיים: חזרו על שיעורים קודמים, התאמנו ב-Drills ותרגלו תשובות לראיון.'), 'intro'));
    page.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn', onclick: () => this.setMode('drills') }, '🎯 Drills'), h('button', { class: 'btn', onclick: () => this.setMode('interview') }, '💼 Interview')));
  },

  // --- урок ---
  renderBlock(b) {
    if (b.k === 'p') return bi(b.t, 'lp');
    if (b.k === 'ul') return h('ul', { class: 'lul' }, b.items.map((it) => h('li', null, bi(it))));
    if (b.k === 'tip') return h('div', { class: 'ltip' }, h('span', null, '💡'), bi(b.t));
    if (b.k === 'code') return h('figure', { class: 'lfig' }, h('pre', { class: 'mono lcode' }, b.text), b.cap ? h('figcaption', null, bi(b.cap)) : null);
    if (b.k === 'table') {
      return h('div', { class: 'addrwrap' }, h('table', { class: 'grid ltable' },
        h('tr', null, b.head.map((c) => h('th', null, this.txt(c)))),
        b.rows.map((r) => h('tr', null, r.map((c) => h('td', null, this.txt(c)))))));
    }
    return null;
  },

  renderLesson(page, l) {
    const order = courseOrder();
    const idx = order.indexOf(l.id);
    const part = coursePartOf(l.id), mod = courseModuleOf(l.id);
    const topic = TASK_TOPICS.find((t) => t.id === l.topic);
    const drill = DRILLS.find((d) => d.id === l.drill);
    page.appendChild(h('div', { class: 'badges' },
      h('span', { class: 'lvl l1' }, part.code + ' · Module ' + mod.n),
      h('span', { class: 'topic' }, '⏱ ~' + l.minutes + ' min'),
      this.st.passed[l.id] ? h('span', { class: 'done' }, '✓ passed') : null));
    const say = (el, k) => { if (el) el.dataset.say = k; return el; };
    page.appendChild(say(bi(l.title, 'tasktitle'), 'title'));
    page.appendChild(say(bi(l.goal, 'intro'), 'goal'));
    const demos = demosForLesson(l.id);
    page.appendChild(h('div', { class: 'lhelpers' },
      h('div', { class: 'audiobar' }),
      demos.map((d) => h('button', { class: 'btn sm demobtn', title: triText(d.title), onclick: () => DemoUI.start(d) }, '▶ ', tri('Watch live', 'посмотреть вживую', 'לראות בפעולה'), ': ' + d.title.en)),
      Tutor.button(() => Tutor.ctxLesson(l), tri('Ask about this lesson', 'спросить по уроку', 'לשאול על השיעור'))));
    const toc = h('div', { class: 'ltoc' });
    const jump = (id) => () => { const t = document.getElementById(id); if (t) t.scrollIntoView({ block: 'start' }); };
    l.sections.forEach((s, i) => toc.appendChild(h('button', { class: 'lchip', onclick: jump('lsec' + i) }, (i + 1) + '. ' + s.h.en)));
    toc.appendChild(h('button', { class: 'lchip', onclick: jump('lterms') }, '📖 Key terms'));
    toc.appendChild(h('button', { class: 'lchip q', onclick: jump('lquiz') }, '✎ Mini-test'));
    page.appendChild(toc);
    l.sections.forEach((s, i) => {
      const sec = h('section', { class: 'lsec', id: 'lsec' + i }, say(this.sec(T((i + 1) + '. ' + s.h.en, s.h.ru, s.h.he)), 's' + i));
      s.blocks.forEach((b, j) => sec.appendChild(say(this.renderBlock(b), 's' + i + 'b' + j)));
      page.appendChild(sec);
    });
    // ключевые термины
    const terms = GLOSSARY.filter((g) => g.lesson === l.id);
    if (terms.length) {
      const tsec = h('section', { class: 'lsec', id: 'lterms' }, this.sec(T('Key terms', 'Ключевые термины', 'מונחי מפתח')));
      tsec.appendChild(h('div', { class: 'addrwrap' }, h('table', { class: 'grid ltable lterms' },
        h('tr', null, h('th', null, 'English'), App.prefs.ru ? h('th', null, 'Русский') : null, App.prefs.he ? h('th', null, 'עברית') : null, h('th', null, '')),
        terms.map((g) => h('tr', { title: g.def.en },
          h('td', null, h('b', null, g.term.en), h('div', { class: 'muted small' }, g.def.en)),
          App.prefs.ru ? h('td', null, g.term.ru) : null,
          App.prefs.he ? h('td', { class: 'he', dir: 'rtl' }, g.term.he) : null,
          h('td', null, this.say(g.term)))))));
      page.appendChild(tsec);
    } else page.appendChild(h('span', { id: 'lterms' }));
    // вопросы для собеседования по теме
    const ivs = INTERVIEW.filter((x) => x.lesson === l.id);
    if (ivs.length) {
      const isec = h('section', { class: 'lsec' }, this.sec(T('Interview questions on this topic', 'Вопросы на собеседовании по теме', 'שאלות ראיון בנושא')));
      for (const x of ivs) isec.appendChild(h('button', { class: 'livq', onclick: () => { this.mode = 'interview'; Store.set('learnMode', 'interview'); this.iv.cur = x.id; this.iv.shown = false; this.render(true); } }, '💼 ', bi(x.q)));
      page.appendChild(isec);
    }
    page.appendChild(this.renderQuiz(l.id, T('Mini-test', 'Мини-тест', 'מבחן קצר'),
      T(QUIZ_SIZE + ' questions. Pass mark ' + QUIZ_PASS + '%. Numbers change every time.', QUIZ_SIZE + ' вопросов. Проходной балл ' + QUIZ_PASS + '%. Числа каждый раз новые.', QUIZ_SIZE + ' שאלות. ציון עובר ' + QUIZ_PASS + '%. המספרים משתנים בכל פעם.'), topic, drill));
    const prev = lessonGet(order[idx - 1]), next = lessonGet(order[idx + 1]);
    page.appendChild(h('div', { class: 'lpager' },
      prev ? h('button', { class: 'btn', onclick: () => this.open(prev.id) }, '← ' + prev.title.en) : h('span'),
      next ? h('button', { class: 'btn', onclick: () => this.open(next.id) }, next.title.en + ' →') : h('button', { class: 'btn', onclick: () => this.open('final') }, 'Whole course exam →')));
  },

  renderFinal(page, id) {
    const part = id.startsWith('final:') ? COURSE.find((p) => p.id === id.slice(6)) : null;
    const n = part ? 20 : FINAL_SIZE;
    const lessons = finalLessons(id).length;
    page.appendChild(h('div', { class: 'badges' }, h('span', { class: 'lvl l3' }, part ? part.code + ' final exam' : 'Whole course exam'), this.st.passed[id] ? h('span', { class: 'done' }, '✓ passed') : null));
    page.appendChild(bi(part ? T(part.code + ' final exam', 'Итоговый тест ' + part.code, 'מבחן מסכם ' + part.code) : T('Whole course exam', 'Экзамен по всему курсу', 'מבחן על כל הקורס'), 'tasktitle'));
    page.appendChild(bi(T(n + ' questions from ' + lessons + ' lessons. Pass mark ' + QUIZ_PASS + '%. Wrong answers show which lesson to review.',
      n + ' вопросов из ' + lessons + ' уроков. Проходной балл ' + QUIZ_PASS + '%. По ошибкам видно, какой урок повторить.',
      n + ' שאלות מתוך ' + lessons + ' שיעורים. ציון עובר ' + QUIZ_PASS + '%. לפי הטעויות רואים איזה שיעור לחזור עליו.'), 'intro'));
    page.appendChild(this.renderQuiz(id, null, null, null, null));
  },

  renderQuiz(id, title, desc, topic, drill) {
    const ru = App.prefs.ru;
    const qs = this.quizState(id);
    const g = qs.grade;
    const final = id === 'final' || id.startsWith('final:');
    const box = h('div', { class: 'lquiz', id: 'lquiz' });
    if (title) box.appendChild(h('div', { class: 'lquizhead' }, h('div', { class: 'lqtitle' }, '✎ ', bi(title)), desc ? bi(desc, 'lqdesc') : null));
    const counter = h('span', { class: 'muted' });
    const updCounter = () => { counter.textContent = 'Answered ' + qs.answers.filter((a) => a !== undefined && a !== null).length + ' / ' + qs.quiz.questions.length; };
    qs.quiz.questions.forEach((q, qi) => {
      const it = g ? g.items[qi] : null;
      const card = h('div', { class: 'qcard' + (it ? (it.ok ? ' ok' : ' no') : '') });
      const tag = final && q.lesson ? lessonGet(q.lesson) : null;
      card.appendChild(h('div', { class: 'qhead' }, h('span', { class: 'qnum' }, it ? (it.ok ? '✓' : '✗') : String(qi + 1)), bi(q.q, 'qtext'),
        tag ? h('button', { class: 'qtag', title: 'Open this lesson', onclick: () => this.open(tag.id) }, tag.title.en) : null));
      if (q.code) card.appendChild(h('pre', { class: 'mono lcode qcode' }, q.code));
      const opts = h('div', { class: 'qopts' });
      q.options.forEach((o, oi) => {
        let cls = 'qopt';
        if (g) { if (o.correct) cls += ' right'; else if (it.chosen === oi) cls += ' wrong'; } else if (qs.answers[qi] === oi) cls += ' sel';
        const input = h('input', { type: 'radio', name: 'lq-' + id + '-' + qi, checked: qs.answers[qi] === oi, disabled: !!g });
        input.addEventListener('change', () => { qs.answers[qi] = oi; $all('.qopt', opts).forEach((x, xi) => x.classList.toggle('sel', xi === oi)); updCounter(); });
        opts.appendChild(h('label', { class: cls }, input, this.optEl(o.t)));
      });
      card.appendChild(opts);
      if (g) card.appendChild(h('div', { class: 'qexp' + (it.ok ? ' ok' : '') }, bi(q.explain)));
      if (g && !it.ok) { const tb = Tutor.button(() => Tutor.ctxQuestion(q, it.chosen)); if (tb) card.appendChild(h('div', { class: 'qtutor' }, tb)); }
      box.appendChild(card);
    });
    updCounter();
    if (!g) {
      box.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn primary big', onclick: () => this.submit(id) }, '✓ Check answers — проверить'), counter));
    } else {
      const review = final ? [...new Set(qs.quiz.questions.filter((q, i) => !g.items[i].ok).map((q) => q.lesson))].map(lessonGet) : [];
      box.appendChild(h('div', { class: 'score lscore' + (g.passed ? ' done' : ' fail') },
        h('div', null, h('b', null, (g.passed ? '🎉 Passed! ' : 'Not passed yet. ') + g.correct + ' / ' + g.total + ' (' + g.pct + '%)'),
          ru ? h('span', { class: 'ru' }, g.passed ? '  Тест сдан!' : '  Пока не сдан — нужно ' + QUIZ_PASS + '%.') : null),
        h('div', { class: 'bar' }, h('div', { style: { width: g.pct + '%' } })),
        review.length ? h('div', { class: 'lreview' }, h('span', { class: 'muted' }, 'Review: '), review.map((l) => h('button', { class: 'btn sm', onclick: () => this.open(l.id) }, l.title.en))) : null));
      box.appendChild(h('div', { class: 'tactions' },
        h('button', { class: 'btn' + (g.passed ? '' : ' primary'), onclick: () => this.retake(id) }, '↻ New questions — новые вопросы'),
        topic ? h('button', { class: 'btn' + (g.passed ? ' primary' : ''), onclick: () => this.practice(topic.id) }, '🧪 Practice in simulator: ' + topic.title.en) : null,
        drill ? h('button', { class: 'btn' + (g.passed && !topic ? ' primary' : ''), onclick: () => this.startDrill(drill.id) }, drill.icon + ' Drill: ' + drill.title.en) : null));
    }
    if (!g && (topic || drill)) {
      box.appendChild(h('div', { class: 'lpractice muted' }, 'Practice: ',
        topic ? h('button', { class: 'btn sm', onclick: () => this.practice(topic.id) }, '🧪 ' + topic.title.en) : null, ' ',
        drill ? h('button', { class: 'btn sm', onclick: () => this.startDrill(drill.id) }, drill.icon + ' ' + drill.title.en) : null));
    }
    return box;
  },

  optEl(t) {
    if (typeof t === 'string') return t.includes('\n') ? h('pre', { class: 'mono qoptcode' }, t) : h('span', { class: 'qopttxt' }, t);
    return bi(t, 'qopttxt');
  },

  // --- тренажёры ---
  renderDrill(page) {
    const ru = App.prefs.ru;
    if (!this.dr) {
      page.appendChild(bi(T('Drills', 'Тренажёры', 'תרגול'), 'tasktitle'));
      page.appendChild(bi(T('Endless exercises on one skill. Numbers are new every time. Keys 1–4 answer, Enter goes to the next question.',
        'Бесконечные упражнения на один навык. Числа каждый раз новые. Клавиши 1–4 — ответ, Enter — следующий вопрос.',
        'תרגילים בלי סוף על מיומנות אחת. המספרים חדשים בכל פעם. מקשים 1–4 לתשובה, Enter לשאלה הבאה.'), 'intro'));
      const grid = h('div', { class: 'ldrills' });
      for (const d of DRILLS.concat([{ id: 'mixed', icon: '🎲', title: T('Mixed — everything', 'Всё вперемешку', 'הכול מעורב') }])) {
        grid.appendChild(h('button', { class: 'ldrillcard', onclick: () => this.startDrill(d.id) }, h('span', { class: 'ldi' }, d.icon), bi(d.title), this.drillBest[d.id] ? h('span', { class: 'lbest ok' }, '🔥 best ' + this.drillBest[d.id]) : null));
      }
      page.appendChild(grid);
      return;
    }
    const d = this.dr;
    const meta = DRILLS.find((x) => x.id === d.id) || { icon: '🎲', title: T('Mixed — everything', 'Всё вперемешку', 'הכול מעורב') };
    page.appendChild(h('div', { class: 'ldrillhead' }, h('span', { class: 'ldi' }, meta.icon), bi(meta.title, 'tasktitle')));
    page.appendChild(h('div', { class: 'ldstats' },
      h('span', null, '✓ ' + d.ok + ' / ' + d.n), h('span', null, '🔥 ' + d.streak + (ru ? ' подряд' : ' in a row')), h('span', { class: 'muted' }, 'best ' + (this.drillBest[d.id] || 0))));
    const q = d.q;
    const card = h('div', { class: 'qcard big' + (d.chosen === null ? '' : q.options[d.chosen].correct ? ' ok' : ' no') });
    card.appendChild(h('div', { class: 'qhead' }, bi(q.q, 'qtext')));
    if (q.code) card.appendChild(h('pre', { class: 'mono lcode qcode' }, q.code));
    const opts = h('div', { class: 'qopts' });
    q.options.forEach((o, i) => {
      let cls = 'qopt';
      if (d.chosen !== null) { if (o.correct) cls += ' right'; else if (d.chosen === i) cls += ' wrong'; }
      opts.appendChild(h('button', { class: cls + ' qbtn', onclick: () => this.answerDrill(i), disabled: d.chosen !== null }, h('span', { class: 'qkey' }, String(i + 1)), this.optEl(o.t)));
    });
    card.appendChild(opts);
    if (d.chosen !== null) {
      card.appendChild(h('div', { class: 'qexp' + (q.options[d.chosen].correct ? ' ok' : '') }, bi(q.explain)));
      const l = lessonGet(q.lesson);
      card.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn primary big', onclick: () => this.nextDrill() }, 'Next → (Enter)'),
        Tutor.button(() => Tutor.ctxQuestion(q, d.chosen)),
        l ? h('button', { class: 'btn', onclick: () => this.open(l.id) }, '📚 ' + l.title.en) : null));
      if (!q.options[d.chosen].correct) card.appendChild(h('div', { class: 'muted small' }, '📕 ', tri('Added to your Mistakes notebook', 'добавлено в тетрадь ошибок', 'נוסף למחברת הטעויות')));
    }
    page.appendChild(card);
  },

  // --- глоссарий ---
  // сначала карточки, которые пора повторить (интервалы 1 → 3 → 7 → 21 день), потом новые, потом самые слабые
  pickCard(list) {
    if (!list.length) return null;
    const ids = list.map((g) => g.id);
    const due = srsDueIds(this.cards, ids, Date.now(), 1000).filter((id) => id !== this.gl.cur);
    if (due.length) return due[0];
    const minBox = Math.min(...list.map((g) => srsCard(this.cards[g.id]).box));
    const pool = list.filter((g) => srsCard(this.cards[g.id]).box === minBox && g.id !== this.gl.cur);
    const from = pool.length ? pool : list;
    return from[Math.floor(Math.random() * from.length)].id;
  },
  rateCard(id, knew) {
    this.cards[id] = srsReview(this.cards[id], knew, Date.now());
    Store.set('cards', this.cards);
    this.bump('cards');
    this.markDay();
    this.gl.cur = this.pickCard(this.glossList());
    this.gl.shown = false;
    this.render();
  },
  renderGlossary(page) {
    const ru = App.prefs.ru, he = App.prefs.he;
    const list = this.glossList();
    page.appendChild(bi(T('Glossary', 'Глоссарий', 'מילון מונחים'), 'tasktitle'));
    const search = h('input', { class: 'inp lsearch', placeholder: 'Search — поиск — חיפוש', value: this.gl.q });
    search.addEventListener('input', () => { this.gl.q = search.value; this.gl.cur = null; this.render(); const s = document.querySelector('#learn .lsearch'); if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); } });
    page.appendChild(h('div', { class: 'lgltools' }, search,
      h('div', { class: 'lseg' }, h('button', { class: 'lsegb' + (this.gl.view === 'cards' ? ' on' : ''), onclick: () => { this.gl.view = 'cards'; this.render(); } }, '🃏 Cards'),
        h('button', { class: 'lsegb' + (this.gl.view === 'list' ? ' on' : ''), onclick: () => { this.gl.view = 'list'; this.render(); } }, '☰ List'))));
    if (!list.length) { page.appendChild(h('p', { class: 'muted' }, 'Nothing found.')); return; }
    if (this.gl.view === 'list') {
      page.appendChild(h('div', { class: 'addrwrap' }, h('table', { class: 'grid ltable lterms' },
        h('tr', null, h('th', null, 'English'), ru ? h('th', null, 'Русский') : null, he ? h('th', null, 'עברית') : null, h('th', null, 'Meaning')),
        list.map((g) => h('tr', null, h('td', null, h('b', null, g.term.en), this.say(g.term)), ru ? h('td', null, g.term.ru) : null, he ? h('td', { class: 'he', dir: 'rtl' }, g.term.he) : null, h('td', null, bi(g.def)))))));
      return;
    }
    if (!this.gl.cur || !list.find((g) => g.id === this.gl.cur)) this.gl.cur = this.pickCard(list);
    const g = GLOSSARY.find((x) => x.id === this.gl.cur);
    const box = srsCard(this.cards[g.id]).box;
    const dueLeft = srsDueIds(this.cards, list.map((x) => x.id), Date.now(), 5).length;
    page.appendChild(h('div', { class: 'muted small' }, '🗓 ', tri('Due today', 'на сегодня', 'להיום'), ': ' + dueLeft));
    const card = h('div', { class: 'flash' + (this.gl.shown ? ' shown' : ''), onclick: () => { if (!this.gl.shown) { this.gl.shown = true; this.render(); } } },
      h('div', { class: 'flvl b' + box }, ['new', 'learning', 'almost', 'known'][box]),
      h('div', { class: 'flterm' }, g.term.en), this.say(T(g.term.en, g.term.ru, g.term.he)));
    if (!this.gl.shown) card.appendChild(h('div', { class: 'muted fltap' }, 'Say what it means (EN, RU, HE), then tap to check — назовите значение и нажмите'));
    else {
      card.appendChild(h('div', { class: 'fltrans' }, h('div', null, '🇷🇺 ' + g.term.ru), h('div', { class: 'he', dir: 'rtl' }, '🇮🇱 ' + g.term.he)));
      card.appendChild(bi(g.def, 'fldef'));
      const l = lessonGet(g.lesson);
      if (l) card.appendChild(h('button', { class: 'btn sm', onclick: (e) => { e.stopPropagation(); this.open(l.id); } }, '📚 ' + l.title.en));
    }
    page.appendChild(card);
    if (this.gl.shown) page.appendChild(h('div', { class: 'tactions center' },
      h('button', { class: 'btn big lno', onclick: () => this.rateCard(g.id, false) }, '✗ Didn\'t know — не знал'),
      h('button', { class: 'btn big lyes', onclick: () => this.rateCard(g.id, true) }, '✓ Knew it — знал')));
    else page.appendChild(h('div', { class: 'tactions center' }, h('button', { class: 'btn primary big', onclick: () => { this.gl.shown = true; this.render(); } }, 'Show — показать')));
  },

  // --- собеседование ---
  pickIv() {
    const w = (x) => ({ good: 1, part: 3, no: 4 })[this.ivr(x.id)] || 4;
    const pool = INTERVIEW.filter((x) => x.id !== this.iv.cur);
    let r = Math.random() * pool.reduce((a, x) => a + w(x), 0);
    for (const x of pool) { r -= w(x); if (r <= 0) return x.id; }
    return pool[0].id;
  },
  rateIv(id, rate) {
    this.ivRate[id] = { r: rate, t: Date.now(), v: 2 };
    Store.set('ivRate', this.ivRate);
    this.bump('iv');
    this.markDay();
    this.iv.cur = this.pickIv();
    this.iv.shown = false;
    this.render(true);
  },
  renderInterview(page) {
    const ru = App.prefs.ru;
    if (!this.iv.cur) this.iv.cur = this.pickIv();
    const x = INTERVIEW.find((i) => i.id === this.iv.cur);
    const counts = ['good', 'part', 'no'].map((r) => INTERVIEW.filter((i) => this.ivr(i.id) === r).length);
    page.appendChild(bi(T('Interview practice', 'Подготовка к собеседованию', 'הכנה לראיון עבודה'), 'tasktitle'));
    page.appendChild(h('div', { class: 'ldstats' }, h('span', null, '✓ ' + counts[0]), h('span', null, '~ ' + counts[1]), h('span', null, '✗ ' + counts[2]), h('span', { class: 'muted' }, 'of ' + INTERVIEW.length)));
    const card = h('div', { class: 'ivcard' });
    card.appendChild(h('div', { class: 'ivq' }, h('span', { class: 'ivicon' }, '💼'), bi(x.q, 'tasktitle')));
    card.appendChild(this.say(x.q));
    if (!this.iv.shown) {
      card.appendChild(bi(T('Answer out loud for 30–60 seconds: first in English, then in Hebrew (and Russian if you like). Then compare with the model answer.',
        'Ответьте вслух за 30–60 секунд: сначала по-английски, потом на иврите (и по-русски, если хотите). Потом сравните с образцом.',
        'ענו בקול במשך 30–60 שניות: קודם באנגלית, אחר כך בעברית (ואם רוצים גם ברוסית). ואז השוו לתשובה לדוגמה.'), 'intro'));
      this.renderVoice(card, x);
      card.appendChild(h('div', { class: 'tactions' }, h('button', { class: 'btn' + (this.voice.result ? '' : ' primary') + ' big', onclick: () => { this.iv.shown = true; this.render(); } }, 'Show model answer — показать ответ')));
    } else {
      if (this.voice.for === x.id && this.voice.result) this.renderVoice(card, x);
      card.appendChild(h('div', { class: 'ivans' }, bi(x.a)));
      card.appendChild(this.say(x.a));
      const l = lessonGet(x.lesson);
      card.appendChild(h('div', { class: 'tactions' },
        h('button', { class: 'btn big lyes', onclick: () => this.rateIv(x.id, 'good') }, '✓ I knew it'),
        h('button', { class: 'btn big lmid', onclick: () => this.rateIv(x.id, 'part') }, '~ Partly'),
        h('button', { class: 'btn big lno', onclick: () => this.rateIv(x.id, 'no') }, '✗ Didn\'t know'),
        l ? h('button', { class: 'btn', onclick: () => this.open(l.id) }, '📚 ' + l.title.en) : null));
      if (ru) card.appendChild(h('div', { class: 'muted small' }, 'Оценка влияет на то, как часто вопрос будет попадаться снова.'));
    }
    page.appendChild(card);
  },
};

Learn.MODES = [
  ['today', '☀️', 'Today', 'Сегодня', 'היום'],
  ['course', '📚', 'Course', 'Курс', 'קורס'],
  ['drills', '🎯', 'Drills', 'Тренажёры', 'תרגול'],
  ['mistakes', '📕', 'Mistakes', 'Ошибки', 'טעויות'],
  ['exam', '🏁', 'Exam', 'Экзамен', 'מבחן'],
  ['glossary', '📖', 'Glossary', 'Глоссарий', 'מילון'],
  ['interview', '💼', 'Interview', 'Собеседование', 'ראיון'],
  ['tools', '🧮', 'Subnets', 'Подсети', 'תת-רשתות'],
];
