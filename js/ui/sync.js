'use strict';
// Общий прогресс для телефона и компьютера: прогресс хранится в личной части базы артефакта
// (data/users/<id>/progress — её видит только сам человек) и сливается с данными этого браузера.

const Sync = {
  ref: null,
  status: 'off',        // off | connecting | on | error
  applying: false,
  remote: null,         // последние данные из базы
  writing: false, pending: false, timer: null,
  announced: false,

  async init() {
    try {
      if (!window.claude || typeof window.claude.use !== 'function') return;
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const uid = await user.id();
      if (!uid) return;
      this.ref = db.doc('data/users/' + uid + '/progress');
    } catch (e) { return; }
    this.status = 'connecting';
    this.badge();
    this.ref.onSnapshot((snap) => this.onRemote(snap), () => { this.status = 'error'; this.badge(); });
  },

  local() {
    const o = {};
    for (const k of PROGRESS_KEYS) { const v = Store.get(k, null); if (v !== null) o[k] = v; }
    return o;
  },

  onRemote(snap) {
    const remote = snap.exists ? (snap.data().data || {}) : {};
    this.remote = remote;
    const local = this.local();
    const merged = mergeProgress(local, remote);
    let changedLocal = false;
    this.applying = true;
    for (const k of PROGRESS_KEYS) {
      if (merged[k] === undefined) continue;
      if (JSON.stringify(merged[k]) !== JSON.stringify(local[k])) { Store.set(k, merged[k]); changedLocal = true; }
    }
    this.applying = false;
    if (changedLocal) this.reloadUi();
    const first = this.status !== 'on';
    this.status = 'on';
    this.badge();
    if (first && snap.exists && changedLocal && !this.announced) {
      this.announced = true;
      toast(triText(T('Progress synced with your other devices', 'Прогресс синхронизирован с другими устройствами', 'ההתקדמות סונכרנה עם המכשירים האחרים')));
    }
    if (JSON.stringify(merged) !== JSON.stringify(mergeProgress({}, remote))) this.schedule(1500);
  },

  // Store.set вызывает это для ключей прогресса.
  touched(key) {
    if (this.applying || !this.ref || !PROGRESS_KEYS.includes(key)) return;
    this.schedule(2500);
  },

  schedule(ms) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.write(), ms);
  },

  async write() {
    if (!this.ref) return;
    if (this.writing) { this.pending = true; return; }
    this.writing = true;
    try {
      const data = mergeProgress(this.local(), this.remote || {});
      let json = JSON.stringify(data);
      // документ базы не больше 256 КБ — при переполнении отдаём старые ошибки
      if (json.length > 230000 && data.mistakes) {
        const keep = Object.values(data.mistakes).sort((a, b) => b.t - a.t).slice(0, 40);
        data.mistakes = Object.fromEntries(keep.map((r) => [r.id, r]));
        json = JSON.stringify(data);
      }
      await this.ref.set({ v: 1, t: Date.now(), data });
      this.remote = data;
      if (this.status !== 'on') { this.status = 'on'; this.badge(); }
    } catch (e) {
      this.status = 'error';
      this.badge();
    } finally {
      this.writing = false;
      if (this.pending) { this.pending = false; this.schedule(1000); }
    }
  },

  // Данные пришли с другого устройства — перечитать их в модулях и перерисовать.
  reloadUi() {
    Learn.reload();
    Training.stats = Store.get('stats', Training.stats);
    if (App.view === 'learn') Learn.render(); else Side.update();
  },

  label() {
    if (this.status === 'on') return { icon: '☁︎✓', t: T('Progress is synced between your devices', 'Прогресс синхронизируется между устройствами', 'ההתקדמות מסונכרנת בין המכשירים') };
    if (this.status === 'connecting') return { icon: '☁︎…', t: T('Connecting to sync…', 'Подключаю синхронизацию…', 'מתחבר לסנכרון…') };
    if (this.status === 'error') return { icon: '☁︎!', t: T('Sync is not available right now — progress is kept in this browser', 'Синхронизация сейчас недоступна — прогресс хранится в этом браузере', 'הסנכרון לא זמין כרגע — ההתקדמות נשמרת בדפדפן הזה') };
    return null;
  },

  badge() {
    const el = document.querySelector('#learn .syncbadge');
    const l = this.label();
    if (!el) return;
    el.hidden = !l;
    if (l) { el.textContent = l.icon; el.title = triText(l.t); el.className = 'syncbadge s-' + this.status; }
  },
};

// ---------- Перенос прогресса без облака: файл или текст ----------
// Нужен там, где нет базы claude.ai (приложение на GitHub Pages, файл с диска), и для переезда между ними.
function progressSummaryText(s) {
  return T(s.lessons + ' lessons passed · ' + s.cards + ' glossary cards · ' + s.interview + ' interview answers · ' + s.tasks + ' tasks solved · ' + s.mistakes + ' mistakes to fix · ' + s.days + ' study days',
    'Уроков сдано: ' + s.lessons + ' · карточек: ' + s.cards + ' · ответов на собеседовании: ' + s.interview + ' · заданий решено: ' + s.tasks + ' · ошибок к исправлению: ' + s.mistakes + ' · дней занятий: ' + s.days,
    'שיעורים שעברו: ' + s.lessons + ' · כרטיסיות: ' + s.cards + ' · תשובות ראיון: ' + s.interview + ' · משימות שנפתרו: ' + s.tasks + ' · טעויות לתיקון: ' + s.mistakes + ' · ימי לימוד: ' + s.days);
}

async function progressImport(text) {
  const p = progressUnpack(text);
  if (!p) { toast(triText(T('This is not a NetTrainer progress file', 'Это не файл прогресса NetTrainer', 'זה לא קובץ התקדמות של NetTrainer')), 'err'); return false; }
  const ok = await dialog({ title: triText(T('Import progress?', 'Загрузить прогресс?', 'לייבא התקדמות?')), w: 480, body: h('div', { class: 'col' },
    p.t ? h('div', { class: 'muted' }, tri('Saved', 'сохранён', 'נשמר'), ': ' + fmtDate(p.t)) : null,
    bi(progressSummaryText(progressSummary(p.data))),
    bi(T('It is added to the progress in this browser — nothing here is deleted. For every item the newer result wins.', 'Он добавится к прогрессу в этом браузере — здесь ничего не удалится. По каждому пункту остаётся более новый результат.', 'הוא יתווסף להתקדמות בדפדפן הזה — שום דבר כאן לא יימחק. בכל פריט נשארת התוצאה החדשה יותר.'), 'muted')),
    buttons: [{ label: triText(T('Import', 'Загрузить', 'לייבא'), ' · '), primary: true, value: true }, { label: triText(T('Cancel', 'Отмена', 'ביטול'), ' · '), value: false }] });
  if (!ok) return false;
  const merged = mergeProgress(Sync.local(), p.data);
  for (const k of PROGRESS_KEYS) if (merged[k] !== undefined) Store.set(k, merged[k]);
  Sync.reloadUi();
  toast('✓ ' + triText(T('Progress imported', 'Прогресс загружен', 'ההתקדמות יובאה')));
  return true;
}

function progressDialog() {
  let m = null;
  const extra = h('div');
  const text = () => progressPack(Sync.local(), Date.now());
  const fname = () => 'nettrainer-progress-' + new Date().toISOString().slice(0, 10) + '.json';
  const done = (r) => { if (r) m.close(); };
  const body = h('div', { class: 'col projdlg' },
    bi(T('Progress (lessons, tests, cards, mistakes, interview, Training) is kept in this browser. To move it to the app or to another device: Export here, then Import there.',
      'Прогресс (уроки, тесты, карточки, ошибки, собеседование, Training) хранится в этом браузере. Чтобы перенести его в приложение или на другое устройство: здесь — Export, там — Import.',
      'ההתקדמות (שיעורים, מבחנים, כרטיסיות, טעויות, ראיון, Training) נשמרת בדפדפן הזה. כדי להעביר אותה לאפליקציה או למכשיר אחר: כאן — Export, ושם — Import.')),
    h('div', { class: 'sechdr' }, tri('Export from here', 'выгрузить отсюда', 'לייצא מכאן')),
    bi(progressSummaryText(progressSummary(Sync.local())), 'muted small'),
    h('div', { class: 'projbtns' },
      h('button', { class: 'btn primary', onclick: () => { downloadText(fname(), text()); toast(triText(T('Downloading… If nothing happens (downloads are blocked on claude.ai), use Copy as text.', 'Скачивается… Если ничего не произошло (на claude.ai скачивание запрещено), используйте Copy as text.', 'מוריד… אם לא קרה כלום (ב-claude.ai הורדות חסומות), השתמשו ב-Copy as text.'))); } }, '⬇ Download file'),
      h('button', { class: 'btn', onclick: () => copyText(text(), extra) }, '📋 Copy as text')),
    extra,
    h('div', { class: 'sechdr' }, tri('Import here', 'загрузить сюда', 'לייבא לכאן')),
    h('div', { class: 'projbtns' },
      h('button', { class: 'btn', onclick: async () => { const f = await pickFile('.json,application/json,text/plain'); if (f) done(await progressImport(f.text)); } }, '📂 Open a file…'),
      h('button', { class: 'btn', onclick: () => {
        clear(paste);
        const ta = h('textarea', { class: 'inp mono projtext', placeholder: triText(T('Paste the progress text here', 'Вставьте текст прогресса', 'הדביקו כאן את טקסט ההתקדמות')) });
        appendKids(paste, [ta, h('button', { class: 'btn primary', onclick: async () => done(await progressImport(ta.value)) }, tri('Import pasted text', 'загрузить вставленный текст', 'לייבא את הטקסט'))]);
        ta.focus();
      } }, '📋 Paste text…')));
  const paste = h('div');
  body.appendChild(paste);
  m = modal('⇅ ' + triText(T('Move progress', 'Перенос прогресса', 'העברת התקדמות')), body, 560);
}
