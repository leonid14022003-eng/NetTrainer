'use strict';
// Помощники обучения без интерфейса (тестируются в jsc): интервальные повторения карточек, тетрадь ошибок,
// активность по дням и план «Сегодня», пробный экзамен, слияние прогресса между устройствами,
// калькулятор подсетей, разбор ответа на собеседовании.

const DAY_MS = 86400000;

function dayKey(ts) {
  const d = new Date(ts);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// Конец текущего дня: всё, что «к повторению» до полуночи, считается на сегодня.
function dayEnd(ts) { const d = new Date(ts); d.setHours(23, 59, 59, 999); return d.getTime(); }

// ---------- Интервальные повторения (карточки глоссария) ----------
// Коробки 0–3: новая / учу / почти / знаю. Знал — следующая коробка и интервал длиннее; не знал — снова в 0.
const SRS_DAYS = [0, 1, 3, 7];

// Старый формат хранил только номер коробки — переводим в {box, due, t}.
function srsCard(v) {
  if (v && typeof v === 'object') return { box: v.box || 0, due: v.due || 0, t: v.t || 0 };
  return { box: typeof v === 'number' ? v : 0, due: 0, t: 0 };
}

function srsReview(prev, knew, now) {
  const c = srsCard(prev);
  const seen = c.t > 0;
  if (!knew) return { box: 0, due: now, t: now };
  const box = seen ? Math.min(3, c.box + 1) : 1;
  const days = c.box === 3 && box === 3 ? 21 : SRS_DAYS[box];
  return { box, due: now + days * DAY_MS, t: now };
}

// Карточки на сегодня: сначала просроченные (давно не повторяли), потом новые (не больше newMax).
function srsDueIds(cards, allIds, now, newMax = 5) {
  const end = dayEnd(now);
  const due = [], fresh = [];
  for (const id of allIds) {
    const c = cards[id];
    if (!c) { fresh.push(id); continue; }
    const s = srsCard(c);
    if (s.t === 0) fresh.push(id);
    else if (s.due <= end) due.push({ id, due: s.due });
  }
  due.sort((a, b) => a.due - b.due);
  return due.map((x) => x.id).concat(fresh.slice(0, newMax));
}

// ---------- Тетрадь ошибок ----------
const MISTAKE_ACTIVE_MAX = 100;   // активных записей (документ синхронизации ограничен 256 КБ)
const MISTAKE_MASTER = 3;         // правильно подряд — ошибка исправлена

function strHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}

function optKey(o) { return typeof o.t === 'string' ? o.t : o.t.en; }

// Вопрос из теста или тренажёра (формат quizPrepare: {q, code, explain, lesson, options:[{t, correct}]}).
function mistakeIdForQuestion(q) {
  const right = q.options.find((o) => o.correct);
  return 'q' + strHash(q.q.en + '|' + (right ? optKey(right) : '') + '|' + (q.code || ''));
}

function mistakeAddQuestion(book, q, now) {
  const id = mistakeIdForQuestion(q);
  const prev = book[id];
  const keep = { q: q.q, code: q.code || null, explain: q.explain, lesson: q.lesson || null, options: q.options.map((o) => ({ t: o.t, correct: !!o.correct })) };
  book[id] = { id, kind: 'q', lesson: q.lesson || null, q: keep, wrong: (prev && !prev.done ? prev.wrong : 0) + 1, streak: 0, t: now, due: now };
  mistakePrune(book, now);
  return id;
}

// Неудачная проверка задания Training: одна запись на шаблон, с названиями красных проверок.
function mistakeAddTask(book, task, failedLabels, now) {
  const id = 'task:' + task.templateId;
  const prev = book[id] && !book[id].done ? book[id] : null;
  const labels = [];
  for (const l of failedLabels.concat(prev ? prev.labels : [])) if (l && !labels.some((x) => x.en === l.en) && labels.length < 5) labels.push(l);
  book[id] = { id, kind: 'task', templateId: task.templateId, topic: task.topic, title: task.title, labels, wrong: (prev ? prev.wrong : 0) + 1, streak: 0, t: now, due: now };
  mistakePrune(book, now);
  return id;
}

// Ответ на повторении: верно — streak+1 и показать позже; неверно — streak 0 и сегодня снова.
// Возвращает 'mastered', когда запись исправлена (остаётся пометка done для синхронизации).
function mistakeAnswer(book, id, correct, now) {
  const r = book[id];
  if (!r || r.done) return null;
  if (!correct) { Object.assign(r, { streak: 0, wrong: r.wrong + 1, due: now, t: now }); return 'again'; }
  r.streak += 1;
  r.t = now;
  if (r.streak >= MISTAKE_MASTER) { book[id] = { id, done: true, t: now }; return 'mastered'; }
  r.due = now + r.streak * DAY_MS;
  return 'later';
}

function mistakeTaskSolved(book, templateId, now) {
  const id = 'task:' + templateId;
  if (book[id] && !book[id].done) { book[id] = { id, done: true, t: now }; return true; }
  return false;
}

function mistakeActive(book) { return Object.values(book).filter((r) => r && !r.done); }

function mistakeDue(book, now) {
  const end = dayEnd(now);
  return mistakeActive(book).filter((r) => r.due <= end).sort((a, b) => a.due - b.due);
}

// Не больше MISTAKE_ACTIVE_MAX активных (старые уходят), пометки done живут 45 дней.
function mistakePrune(book, now) {
  const act = mistakeActive(book).sort((a, b) => b.t - a.t);
  for (const r of act.slice(MISTAKE_ACTIVE_MAX)) delete book[r.id];
  for (const r of Object.values(book)) if (r.done && now - r.t > 45 * DAY_MS) delete book[r.id];
  return book;
}

// ---------- Активность по дням ----------
const ACT_KINDS = ['cards', 'mistakes', 'tasks', 'quiz', 'iv', 'drills', 'exam'];

function actBump(act, kind, now, n = 1) {
  const k = dayKey(now);
  act[k] = act[k] || {};
  act[k][kind] = (act[k][kind] || 0) + n;
  const keys = Object.keys(act).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - 90))) delete act[old];
  return act;
}

function actToday(act, now) { return act[dayKey(now)] || {}; }

// Дни подряд, когда что-то делалось (сегодня ещё можно успеть — тогда считаем со вчера).
function actStreak(act, now, extraDays) {
  const set = new Set(Object.keys(act).filter((k) => Object.values(act[k]).some((v) => v > 0)).concat(extraDays || []));
  const d = new Date(now);
  if (!set.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d.getTime()))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// ---------- План «Сегодня» ----------
// s: {cards, glossaryIds, book, act, nextLesson, weakTopic}. Цели небольшие: ~15 минут в день.
function todayPlan(s, now) {
  const today = actToday(s.act, now);
  const dueCards = srsDueIds(s.cards, s.glossaryIds, now, 5).length;
  const dueMist = mistakeDue(s.book, now).length;
  const cardsGoal = Math.max(1, Math.min(10, dueCards + (today.cards || 0)));
  const mistGoal = Math.min(5, dueMist + (today.mistakes || 0));
  const steps = [
    { id: 'cards', goal: cardsGoal, have: Math.min(cardsGoal, today.cards || 0), left: dueCards },
    { id: 'mistakes', goal: mistGoal, have: Math.min(mistGoal, today.mistakes || 0), left: dueMist },
    { id: 'task', goal: 1, have: Math.min(1, today.tasks || 0), topic: s.weakTopic || null },
    { id: 'lesson', goal: 1, have: Math.min(1, today.quiz || 0), lesson: s.nextLesson || null },
    { id: 'iv', goal: 1, have: Math.min(1, today.iv || 0) },
  ];
  for (const st of steps) st.done = st.have >= st.goal;
  return { steps, done: steps.every((x) => x.done), count: steps.filter((x) => x.done).length };
}

// Слабая тема для задания в симуляторе: где больше всего ошибок в заданиях, иначе — наименее решённая.
function weakTopicOf(book, solved, topics, templates) {
  const score = {};
  for (const t of topics) score[t] = 0;
  for (const r of mistakeActive(book)) if (r.kind === 'task' && score[r.topic] !== undefined) score[r.topic] += 3 * r.wrong;
  for (const tpl of templates) if (score[tpl.topic] !== undefined) score[tpl.topic] -= Math.min(2, (solved && solved[tpl.id]) || 0);
  let best = topics[0], bestScore = -Infinity;
  for (const t of topics) if (score[t] > bestScore) { best = t; bestScore = score[t]; }
  return best;
}

// ---------- Пробный экзамен ----------
const EXAM_PASS = 80;

// part: 'all' | 'itn' | 'srwe' | 'ensa' | 'extra'. Время — как на CCNA: около 72 секунд на вопрос.
function examBuild(part, n, seed) {
  const quiz = quizBuild(part === 'all' ? 'final' : 'final:' + part, seed, n);
  return { id: 'x' + seed.toString(36), part, n: quiz.questions.length, seed, seconds: Math.round(quiz.questions.length * 72), questions: quiz.questions, answers: [], flags: [] };
}

function examGrade(exam) {
  const g = quizGrade(exam, exam.answers);
  const byPart = {}, byLesson = {};
  exam.questions.forEach((q, i) => {
    const part = q.lesson ? coursePartOf(q.lesson) : null;
    const pid = part ? part.id : 'other';
    byPart[pid] = byPart[pid] || { ok: 0, total: 0 };
    byPart[pid].total++;
    if (g.items[i].ok) byPart[pid].ok++;
    if (q.lesson) {
      byLesson[q.lesson] = byLesson[q.lesson] || { lesson: q.lesson, ok: 0, total: 0 };
      byLesson[q.lesson].total++;
      if (g.items[i].ok) byLesson[q.lesson].ok++;
    }
  });
  const weak = Object.values(byLesson).filter((x) => x.ok < x.total).sort((a, b) => (a.ok / a.total) - (b.ok / b.total) || b.total - a.total);
  return Object.assign(g, { passed: g.pct >= EXAM_PASS, byPart, weak });
}

// ---------- Слияние прогресса (телефон ↔ компьютер) ----------
// Каждый ключ сливается по смыслу: «пройдено» — объединение, лучший результат — максимум,
// записи с меткой времени t — берём более свежую.
const PROGRESS_KEYS = ['learn', 'cards', 'ivRate', 'drillBest', 'stats', 'mistakes', 'activity', 'exams'];

// Оценки вопросов собеседования хранятся по id вопроса (iv1, iv2 … по порядку). В версии от 27.10.2026 три новых
// вопроса стояли без своего id в середине списка, и номера с iv14 сдвинулись: iv14–16 были новыми, iv17–75 = прежние iv14–72.
// Оценки, поставленные в той версии (t не раньше IV_SHIFT_FROM и без метки v), переводятся на постоянные id.
const IV_SHIFT_FROM = 1793097677000;
const IV_SHIFT_NEW = ['iv-dhcp-pool', 'iv-dhcp-options', 'iv-l3-ipv6'];
function ivRateFix(rates) {
  const out = {};
  const put = (k, v) => { const c = out[k]; if (!c || (v.t || 0) > (c.t || 0)) out[k] = v; };
  for (const [k, raw] of Object.entries(rates || {})) {
    const v = raw && typeof raw === 'object' ? raw : { r: raw, t: 0 };
    const n = /^iv\d+$/.test(k) ? Number(k.slice(2)) : 0;
    if (v.v || !((v.t || 0) >= IV_SHIFT_FROM) || n < 14 || n > 75) { put(k, v); continue; }
    put(n <= 16 ? IV_SHIFT_NEW[n - 14] : 'iv' + (n - 3), Object.assign({}, v, { v: 2 }));
  }
  return out;
}

function mergeNewest(a, b) {
  const out = Object.assign({}, a || {});
  for (const [k, v] of Object.entries(b || {})) {
    const cur = out[k];
    const tv = v && typeof v === 'object' ? v.t || 0 : 0, tc = cur && typeof cur === 'object' ? cur.t || 0 : 0;
    if (cur === undefined || tv > tc) out[k] = v;
  }
  return out;
}

function mergeMax(a, b) {
  const out = Object.assign({}, a || {});
  for (const [k, v] of Object.entries(b || {})) out[k] = Math.max(out[k] || 0, v || 0);
  return out;
}

const PROGRESS_MERGE = {
  learn(a, b) {
    a = a || {}; b = b || {};
    const newer = (b.t || 0) > (a.t || 0) ? b : a;
    const passed = Object.assign({}, a.passed || {});
    for (const [k, v] of Object.entries(b.passed || {})) if (v) passed[k] = true;
    const days = [...new Set((a.days || []).concat(b.days || []))].sort().slice(-120);
    return Object.assign({}, a, b, { cur: newer.cur || 'home', open: newer.open || {}, best: mergeMax(a.best, b.best), passed, days, t: Math.max(a.t || 0, b.t || 0) });
  },
  cards(a, b) {
    const norm = (m) => { const o = {}; for (const [k, v] of Object.entries(m || {})) o[k] = srsCard(v); return o; };
    return mergeNewest(norm(a), norm(b));
  },
  ivRate(a, b) { return mergeNewest(ivRateFix(a), ivRateFix(b)); },
  drillBest: mergeMax,
  stats(a, b) {
    a = a || {}; b = b || {};
    return { solved: mergeMax(a.solved, b.solved), total: Math.max(a.total || 0, b.total || 0), checks: Math.max(a.checks || 0, b.checks || 0) };
  },
  mistakes(a, b) { return mergeNewest(a, b); },
  activity(a, b) {
    const out = {};
    for (const k of new Set(Object.keys(a || {}).concat(Object.keys(b || {})))) out[k] = mergeMax((a || {})[k], (b || {})[k]);
    return out;
  },
  exams(a, b) {
    const map = {};
    for (const x of (a || []).concat(b || [])) if (x && x.id) map[x.id] = x;
    return Object.values(map).sort((x, y) => x.date - y.date).slice(-30);
  },
};

// ---------- Перенос прогресса файлом или текстом (между claude.ai, приложением и устройствами) ----------
function progressPack(data, now) {
  const out = {};
  for (const k of PROGRESS_KEYS) if (data && data[k] !== undefined && data[k] !== null) out[k] = data[k];
  return JSON.stringify({ app: 'NetTrainer', kind: 'progress', v: 1, t: now, data: out });
}

// Текст → данные прогресса; null, если это не файл прогресса NetTrainer
function progressUnpack(text) {
  let o;
  try { o = JSON.parse(String(text || '').trim()); } catch (e) { return null; }
  if (!o || o.app !== 'NetTrainer' || o.kind !== 'progress' || !o.data || typeof o.data !== 'object') return null;
  const out = {};
  for (const k of PROGRESS_KEYS) if (o.data[k] !== undefined && o.data[k] !== null) out[k] = o.data[k];
  return { t: o.t || 0, data: out };
}

// Коротко, что внутри: для подтверждения перед слиянием
function progressSummary(data) {
  const d = data || {};
  const learn = d.learn || {};
  return {
    lessons: Object.keys(learn.passed || {}).filter((k) => learn.passed[k] && !/^final/.test(k)).length,
    cards: Object.keys(d.cards || {}).length,
    interview: Object.keys(d.ivRate || {}).length,
    tasks: (d.stats && d.stats.total) || 0,
    mistakes: Object.values(d.mistakes || {}).filter((r) => r && !r.done).length,
    exams: (d.exams || []).length,
    days: (learn.days || []).length,
  };
}

function mergeProgress(local, remote) {
  const out = {};
  for (const k of PROGRESS_KEYS) {
    const l = local ? local[k] : undefined, r = remote ? remote[k] : undefined;
    if (l === undefined || l === null) { if (r !== undefined && r !== null) out[k] = r; continue; }
    if (r === undefined || r === null) { out[k] = l; continue; }
    out[k] = PROGRESS_MERGE[k](l, r);
  }
  return out;
}

// ---------- Калькулятор подсетей ----------
function parseIpPrefix(text) {
  const s = String(text || '').trim().replace(/\s+/g, ' ');
  let m = s.match(/^(\d+\.\d+\.\d+\.\d+)\s*\/\s*(\d{1,2})$/);
  if (m && isIp(m[1]) && Number(m[2]) <= 32) return { ip: m[1], len: Number(m[2]) };
  m = s.match(/^(\d+\.\d+\.\d+\.\d+)\s+(\d+\.\d+\.\d+\.\d+)$/);
  if (m && isIp(m[1]) && isMask(m[2])) return { ip: m[1], len: maskToLen(m[2]) };
  m = s.match(/^(\d+\.\d+\.\d+\.\d+)$/);
  if (m && isIp(m[1])) return { ip: m[1], len: classfulLen(ipToInt(m[1])) };
  return null;
}

function bits32(n) { return ('00000000000000000000000000000000' + (n >>> 0).toString(2)).slice(-32); }

function addrKind(n) {
  const a = n >>> 24, b = (n >>> 16) & 255;
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return 'private';
  if (a === 127) return 'loopback';
  if (a === 169 && b === 254) return 'link-local';
  if (a >= 224 && a <= 239) return 'multicast';
  if (a >= 240 || a === 0) return 'reserved';
  return 'public';
}

function subnetInfo(ipStr, len) {
  const ip = ipToInt(ipStr);
  if (ip === null || !(len >= 0 && len <= 32)) return null;
  const net = netOf(ip, len), bc = broadcastOf(net, len);
  const size = Math.pow(2, 32 - len);
  const hosts = len === 32 ? 1 : len === 31 ? 2 : size - 2;
  const first = len >= 31 ? net : net + 1, last = len >= 31 ? bc : bc - 1;
  // «Интересный» октет — тот, где проходит граница сети, и размер блока в нём
  const oct = len === 32 ? 3 : Math.min(3, Math.floor(len / 8));
  const maskOct = (lenToMaskInt(len) >>> (24 - oct * 8)) & 255;
  const a = ip >>> 24;
  const cls = a < 128 ? 'A' : a < 192 ? 'B' : a < 224 ? 'C' : a < 240 ? 'D' : 'E';
  return {
    ip: intToIp(ip), len, mask: lenToMask(len), wildcard: intToIp((~lenToMaskInt(len)) >>> 0),
    network: intToIp(net), broadcast: intToIp(bc), first: intToIp(first), last: intToIp(last),
    hosts, size, cls, kind: addrKind(ip), isNetwork: ip === net && len < 31, isBroadcast: ip === bc && len < 31,
    bits: { ip: bits32(ip), mask: bits32(lenToMaskInt(len)), network: bits32(net), broadcast: bits32(bc) },
    block: { octet: oct + 1, maskValue: maskOct, size: len % 8 === 0 && len < 32 ? 256 : 256 - maskOct },
  };
}

// ---------- Разбор ответа на собеседовании (без Claude) ----------
// Ключевые моменты образцового ответа: термины глоссария, аббревиатуры, номера портов и префиксы.
function interviewKeyPoints(answerEn, glossary) {
  const text = ' ' + answerEn + ' ';
  const pts = [];
  const add = (label, forms) => { if (pts.length < 12 && !pts.some((p) => p.label.toLowerCase() === label.toLowerCase())) pts.push({ label, forms }); };
  for (const g of glossary || []) {
    const base = g.term.en.replace(/\s*\(.*\)$/, '');
    for (const part of base.split(/\s*\/\s*/)) {
      if (part.length < 3) continue;
      const re = new RegExp('[^A-Za-z0-9]' + part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[^A-Za-z0-9]', 'i');
      if (re.test(text)) add(part, [part, g.term.ru, g.term.he].filter(Boolean).map((x) => x.replace(/\s*\(.*\)$/, '')));
    }
  }
  // стандарты вида 802.1Q / 802.11 — целиком (люди говорят и «dot1q»)
  for (const m of answerEn.match(/\b\d{3}\.\d+[A-Za-z]{0,2}\b/g) || []) add(m, [m, m.replace(/^802\.1/, 'dot1')]);
  const rest = answerEn.replace(/\b\d{3}\.\d+[A-Za-z]{0,2}\b/g, ' ');
  const STOP = ['ID', 'OK', 'IT', 'US', 'PC'];
  for (const m of rest.match(/\b[A-Z][A-Z0-9]{1,}(?:-[A-Z0-9]+)?\b/g) || []) if (!STOP.includes(m)) add(m, [m]);
  for (const m of rest.match(/(?:\/\d{1,2}\b|\b\d{2,5}\b)/g) || []) add(m, [m]);
  return pts;
}

function interviewCheckLocal(answerEn, transcript, glossary) {
  const pts = interviewKeyPoints(answerEn, glossary);
  const said = ' ' + String(transcript || '').toLowerCase() + ' ';
  const hit = (f) => {
    const s = f.toLowerCase();
    if (/^[\d/]+$/.test(s)) return new RegExp('(^|[^0-9])' + s.replace('/', '\\/') + '([^0-9]|$)').test(said);
    return said.includes(s);
  };
  const covered = [], missed = [];
  for (const p of pts) (p.forms.some(hit) ? covered : missed).push(p.label);
  const score = pts.length ? Math.round(covered.length * 100 / pts.length) : 0;
  return { covered, missed, score };
}
