'use strict';
// «Объясни»: Claude объясняет ошибку простыми словами на русском, иврите или английском.
// Работает только в опубликованной версии на claude.ai (возможность sample); иначе кнопки скрыты.

const TUTOR_LANGS = { ru: 'Russian', he: 'Hebrew (simple modern Hebrew)', en: 'simple English' };

const Tutor = {
  sample: null,
  ready: false,

  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      this.sample = await window.claude.use('sample');
    } catch (e) { this.sample = null; }
    this.ready = !!this.sample;
    if (this.ready) {
      Side.update();
      if (App.view === 'learn') Learn.render();
    }
  },

  lang() {
    const saved = Store.get('tutorLang', null);
    if (saved && TUTOR_LANGS[saved]) return saved;
    return App.prefs.ru ? 'ru' : App.prefs.he ? 'he' : 'en';
  },

  // Кнопка «🤖 Объясни». ctx() строится только при нажатии.
  button(ctx, label) {
    if (!this.ready) return null;
    return h('button', { class: 'btn sm tutorbtn', title: triText(T('Claude explains it in simple words', 'Claude объяснит простыми словами', 'Claude יסביר במילים פשוטות')),
      onclick: (e) => { e.stopPropagation(); this.open(ctx()); } }, '🤖 ', label || tri('Explain', 'объясни', 'הסבר'));
  },

  rules(lang) {
    return 'You are a friendly, patient CCNA tutor inside NetTrainer, a Cisco Packet Tracer–like network simulator. ' +
      'The student is an adult preparing for networking job interviews in Israel; their native language is Russian, and they are also learning English and Hebrew.\n' +
      'Answer in ' + TUTOR_LANGS[lang] + '. Keep IOS commands, protocol names and device output in English, in `code` format.\n' +
      'Be short and concrete: at most about 180 words unless the student asks for more. Use simple words and short sentences.\n' +
      'If the student made a mistake: 1) say what is wrong, 2) why it matters, 3) exactly what to do (commands or clicks), 4) one short tip to remember it.\n' +
      'Use only the facts in the situation below; do not invent device output. If something is unclear, say what to check.';
  },

  // ctx: {title, context, question?, ask?} — ask: сначала дать человеку задать свой вопрос.
  open(ctx) {
    const st = { lang: this.lang(), turns: [], ctl: null, busy: false };
    const ans = h('div', { class: 'tutorans' });
    const note = h('div', { class: 'tutornote muted small' });
    const input = h('textarea', { class: 'inp tutorinp', rows: 2, placeholder: triText(T('Ask a follow-up question…', 'Задайте уточняющий вопрос…', 'שאלו שאלת המשך…')) });
    const askBtn = h('button', { class: 'btn primary', onclick: () => send() }, tri('Ask', 'спросить', 'לשאול'));
    const stopBtn = h('button', { class: 'btn', hidden: true, onclick: () => st.ctl && st.ctl.abort() }, '⏹ ', tri('Stop', 'стоп', 'עצור'));
    const langBtns = h('div', { class: 'lseg' }, Object.keys(TUTOR_LANGS).map((l) => h('button', { class: 'lsegb' + (l === st.lang ? ' on' : ''), dataset: { lang: l },
      onclick: () => { st.lang = l; Store.set('tutorLang', l); $all('.lsegb', langBtns).forEach((b) => b.classList.toggle('on', b.dataset.lang === l)); if (st.turns.length) restart(); } }, { ru: 'Русский', he: 'עברית', en: 'English' }[l])));
    const seen = h('details', { class: 'tutorctx' }, h('summary', { class: 'muted small' }, tri('What Claude sees', 'что видит Claude', 'מה Claude רואה')), h('pre', { class: 'mono' }, ctx.context));
    const chat = h('div', { class: 'tutorchat' });
    const body = h('div', { class: 'tutor col' }, h('div', { class: 'tutortop' }, langBtns, seen), chat, ans, note,
      h('div', { class: 'tutorask' }, input, h('div', { class: 'tutorbtns' }, askBtn, stopBtn)));
    const m = modal('🤖 ' + (ctx.title || 'Claude'), body, 640);

    const firstQuestion = ctx.question || 'Explain simply what is going on here and what I should do.';
    const paint = (el, text) => { el.innerHTML = tutorMarkdown(text); };
    const setBusy = (b) => { st.busy = b; askBtn.disabled = b; stopBtn.hidden = !b; };

    const call = async () => {
      st.ctl = new AbortController();
      setBusy(true);
      note.textContent = '';
      const out = h('div', { class: 'tutormsg bot', dir: st.lang === 'he' ? 'rtl' : 'auto' }, h('span', { class: 'muted' }, triText(T('Thinking…', 'Думаю…', 'חושב…'))));
      chat.appendChild(out);
      out.scrollIntoView({ block: 'nearest' });
      const turns = st.turns.slice();
      turns[0] = { role: 'user', content: this.rules(st.lang) + '\n\n--- Situation ---\n' + ctx.context + '\n\n--- Question ---\n' + turns[0].content };
      try {
        const opts = { signal: st.ctl.signal, onText: ({ text }) => paint(out, text) };
        if (st.turns.length > 1) opts.cache = false; // уточнения в диалоге — всегда новый ответ
        const r = await this.sample(turns, opts);
        paint(out, r.text);
        st.turns.push({ role: 'assistant', content: r.text });
        if (r.truncated) note.textContent = triText(T('The answer was cut short — ask for less at a time.', 'Ответ обрезан — спросите покороче.', 'התשובה נקטעה — שאלו על פחות בכל פעם.'));
      } catch (e) {
        if (e && e.text) paint(out, e.text); else out.remove();
        st.turns.pop();
        const code = e && e.code;
        if (code !== 'cancelled') note.textContent = triText(tutorErrorText(code));
        if (code === 'not_granted' || code === 'sampling_disabled' || code === 'not_declared' || code === 'capability_disabled' || code === 'capability_removed') { this.ready = false; }
      } finally { setBusy(false); }
    };
    const send = () => {
      const q = input.value.trim();
      if (st.busy) return;
      if (!q && st.turns.length) return;
      const text = q || firstQuestion;
      input.value = '';
      chat.appendChild(h('div', { class: 'tutormsg me' }, text === firstQuestion && !q ? triText(T('Explain this to me', 'Объясни мне это', 'תסביר לי את זה')) : text));
      st.turns.push({ role: 'user', content: text });
      call();
    };
    const restart = () => { if (st.ctl) st.ctl.abort(); clear(chat); st.turns = []; send(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
    if (ctx.ask) { setTimeout(() => input.focus(), 30); input.placeholder = triText(T('Your question about this lesson…', 'Ваш вопрос по уроку…', 'השאלה שלכם על השיעור…')); }
    else send();
    return m;
  },

  // ---------- Что показать Claude ----------
  ctxTraining(task, topo, item, details) {
    const L = ['Training task: ' + task.title.en, 'Task: ' + task.intro.en, 'Steps:', ...task.steps.map((s, i) => '  ' + (i + 1) + '. ' + s.en)];
    if (task.table && task.table.length) L.push('Addressing table:', ...task.table.map((r) => '  ' + [r.dev, r.iface, r.ip, r.mask, r.gw, r.extra].filter(Boolean).join(' | ')));
    L.push('', 'FAILED CHECK: ' + item.label.en);
    if (item.hint) L.push('The checker says: ' + item.hint.en);
    if (details && details.why) L.push('Why it matters: ' + details.why.en);
    if (details && details.fix && details.fix.length) L.push('Suggested fix: ' + details.fix.map((b) => b.dev + ' (' + b.via + '): ' + b.lines.map((l) => l.text).filter(Boolean).join('; ')).join(' / '));
    L.push('', 'Student\'s current network:', tutorNetworkText(topo));
    return { title: triText(T('Explain this check', 'Объясни эту проверку', 'הסבר את הבדיקה')), context: L.join('\n').slice(0, 14000), question: 'Why is this check red and what exactly should I do to fix it?' };
  },

  ctxQuestion(q, chosen) {
    const letters = 'ABCDEF';
    const opt = (o) => (typeof o.t === 'string' ? o.t : o.t.en);
    const L = ['Quiz question: ' + q.q.en];
    if (q.code) L.push('Shown with:', q.code);
    q.options.forEach((o, i) => L.push('  ' + letters[i] + ') ' + opt(o) + (o.correct ? '   <- correct' : '') + (i === chosen ? '   <- student chose this' : '')));
    if (q.explain) L.push('Short explanation from the course: ' + q.explain.en);
    const l = q.lesson && lessonGet(q.lesson);
    if (l) L.push('Lesson: ' + l.title.en);
    const wrong = chosen !== null && chosen !== undefined && q.options[chosen] && !q.options[chosen].correct;
    return { title: triText(T('Explain this question', 'Объясни вопрос', 'הסבר את השאלה')), context: L.join('\n'),
      question: wrong ? 'Why is my answer wrong and why is the correct answer right? Help me remember it.' : 'Explain this question and the correct answer simply.' };
  },

  ctxCli(topo, devId) {
    const d = topo.devices[devId];
    const st = Terminal.state(topo, devId, 'ios');
    const lines = st.buf.split('\n').slice(-60).join('\n');
    const L = ['Device: ' + d.name + ' (Cisco ' + DEVICE_CATALOG[d.model].display + ', hostname ' + d.cfg.hostname + ')', 'Current prompt: ' + (iosPrompt(topo, st.sess) || '(not started)'),
      'Last lines of the IOS console:', lines];
    return { title: triText(T('Help with the CLI', 'Помощь с CLI', 'עזרה עם ה-CLI')), context: L.join('\n').slice(0, 12000), question: 'Look at my last commands and the output. What happened, is something wrong, and what should I type next?' };
  },

  ctxLesson(lesson) {
    const L = ['Lesson: ' + lesson.title.en, 'Goal: ' + lesson.goal.en, 'Sections: ' + lesson.sections.map((s) => s.h.en).join('; ')];
    return { title: triText(lesson.title), context: L.join('\n'), ask: true };
  },
};

// Сеть студента коротко: кабели, ПК, конфигурации роутеров и коммутаторов.
function tutorNetworkText(topo) {
  const L = [];
  for (const l of Object.values(topo.links)) {
    const A = topo.devices[l.a.dev], B = topo.devices[l.b.dev];
    L.push('  cable ' + A.name + ' ' + l.a.port + ' <-> ' + B.name + ' ' + l.b.port + ' (' + l.cable + (linkCableOk(topo, l) ? '' : ', WRONG cable type') + ', link ' + (portPhysUp(topo, l.a.dev, l.a.port) ? 'up' : 'down') + ')');
  }
  for (const d of Object.values(topo.devices)) {
    if (d.type === 'pc') L.push('  ' + d.name + ': ' + (d.cfg.ipMode === 'dhcp' ? 'DHCP, got ' : 'static ') + (d.cfg.ip || 'no IP') + ' mask ' + (d.cfg.mask || '-') + ' gateway ' + (d.cfg.gateway || '-'));
  }
  for (const d of Object.values(topo.devices)) {
    if (d.type !== 'router' && d.type !== 'switch') continue;
    const cfg = iosRunningConfig(topo, d, d.cfg).split('\n').filter((x) => x.trim() && x.trim() !== '!' && !/^(no service|service timestamps|version |Building|Current configuration|ip flow-export|spanning-tree mode|line vty 5|end$| duplex auto| speed auto)/.test(x));
    L.push('--- ' + d.name + ' running-config ---', cfg.join('\n').slice(0, 3000));
  }
  return L.join('\n');
}

// Немного Markdown: **жирный**, `код`, списки, блоки кода. Сначала экранируем — текст безопасен.
function tutorMarkdown(text) {
  const esc = escapeHtml(String(text || ''));
  const parts = esc.split(/```(?:[a-z]*)\n?([\s\S]*?)```/g);
  return parts.map((p, i) => {
    if (i % 2) return '<pre class="mono tutorcode">' + p.replace(/\n$/, '') + '</pre>';
    return p.split('\n').map((line) => {
      let s = line.replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
      if (/^\s*([-*•]|\d+[.)])\s+/.test(s)) s = '<div class="tli">' + s.replace(/^\s*[-*•]\s+/, '• ') + '</div>';
      else if (/^#{1,4}\s/.test(s)) s = '<div class="th">' + s.replace(/^#{1,4}\s/, '') + '</div>';
      else s = s ? '<div>' + s + '</div>' : '<div class="tsp"></div>';
      return s;
    }).join('');
  }).join('');
}

function tutorErrorText(code) {
  switch (code) {
    case 'not_granted': return T('Claude was not allowed for this page. You can allow it in the artifact\'s Permissions menu.', 'Для этой страницы Claude не разрешён. Разрешить можно в меню Permissions артефакта.', 'Claude לא אושר לדף הזה. אפשר לאשר בתפריט Permissions של הארטיפקט.');
    case 'rate_limited': return T('Too many questions in a short time or the usage limit is reached. Try again a bit later.', 'Слишком много вопросов подряд или исчерпан лимит. Попробуйте чуть позже.', 'יותר מדי שאלות בזמן קצר או שהמכסה נגמרה. נסו שוב מאוחר יותר.');
    case 'session_expired': return T('Please sign in to claude.ai again.', 'Войдите в claude.ai заново.', 'התחברו מחדש ל-claude.ai.');
    case 'refused': case 'empty_completion': return T('No answer for this — try asking differently.', 'Ответа нет — попробуйте спросить иначе.', 'אין תשובה — נסו לשאול אחרת.');
    case 'prompt_too_large': return T('Too much text for one question.', 'Слишком много текста для одного вопроса.', 'יותר מדי טקסט לשאלה אחת.');
    default: return T('Claude is not available right now. Try again.', 'Claude сейчас недоступен. Попробуйте ещё раз.', 'Claude לא זמין כרגע. נסו שוב.');
  }
}
