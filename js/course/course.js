'use strict';
// Курс по сетям от А до Я — по программе Cisco NetAcad: ITN → SRWE → ENSA (вместе = CCNA 200-301).
// Текст уроков на английском, перевод на русский и иврит. Здесь — карта курса, формат уроков, движок тестов.
// Уроки — в itn_*.js, srwe.js, ensa.js; глоссарий, вопросы для собеседования и тренажёры — в отдельных файлах.

const LESSONS = [];
const QUIZ_SIZE = 6;        // вопросов в мини-тесте урока
const FINAL_SIZE = 15;      // вопросов в итоговом тесте
const QUIZ_PASS = 70;       // проходной балл, %

function lessonDef(spec) { LESSONS.push(spec); }
function lessonGet(id) { return LESSONS.find((l) => l.id === id) || null; }

// --- карта курса: модуль без готового урока показывается как «скоро» ---
function M(n, lesson, en, ru, he) { return { n, lesson, title: T(en, ru, he) }; }
const COURSE = [
  { id: 'itn', code: 'ITN', title: T('Introduction to Networks', 'Введение в сети', 'מבוא לרשתות'), modules: [
    M(1, 'itn01', 'Networking Today', 'Сети сегодня', 'רשתות היום'),
    M(2, 'itn02', 'Basic Switch and End Device Configuration', 'Базовая настройка коммутатора и оконечных устройств', 'הגדרה בסיסית של מתג והתקני קצה'),
    M(3, 'itn03', 'Protocols and Models', 'Протоколы и модели', 'פרוטוקולים ומודלים'),
    M(4, 'itn04', 'Physical Layer', 'Физический уровень', 'השכבה הפיזית'),
    M(5, 'itn05', 'Number Systems', 'Системы счисления', 'שיטות ספירה'),
    M(6, 'itn06', 'Data Link Layer', 'Канальный уровень', 'שכבת קו הנתונים'),
    M(7, 'itn07', 'Ethernet Switching', 'Коммутация Ethernet', 'מיתוג Ethernet'),
    M(8, 'itn08', 'Network Layer', 'Сетевой уровень', 'שכבת הרשת'),
    M(9, 'itn09', 'Address Resolution', 'Разрешение адресов', 'תרגום כתובות'),
    M(10, 'itn10', 'Basic Router Configuration', 'Базовая настройка маршрутизатора', 'הגדרה בסיסית של נתב'),
    M(11, 'itn11', 'IPv4 Addressing', 'IPv4-адресация', 'מיעון IPv4'),
    M(12, 'itn12', 'IPv6 Addressing', 'IPv6-адресация', 'מיעון IPv6'),
    M(13, 'itn13', 'ICMP', 'ICMP', 'ICMP'),
    M(14, 'itn14', 'Transport Layer', 'Транспортный уровень', 'שכבת התעבורה'),
    M(15, 'itn15', 'Application Layer', 'Прикладной уровень', 'שכבת היישום'),
    M(16, 'itn16', 'Network Security Fundamentals', 'Основы сетевой безопасности', 'יסודות אבטחת רשת'),
    M(17, 'itn17', 'Build a Small Network', 'Построение небольшой сети', 'בניית רשת קטנה'),
  ] },
  { id: 'srwe', code: 'SRWE', title: T('Switching, Routing & Wireless Essentials', 'Коммутация, маршрутизация и беспроводные сети', 'יסודות מיתוג, ניתוב ורשתות אלחוטיות'), modules: [
    M(1, 'srwe01', 'Basic Device Configuration', 'Базовая настройка устройств', 'הגדרה בסיסית של התקנים'),
    M(2, 'srwe02', 'Switching Concepts', 'Принципы коммутации', 'עקרונות מיתוג'),
    M(3, 'vlan', 'VLANs', 'VLAN', 'רשתות VLAN'),
    M(4, 'intervlan', 'Inter-VLAN Routing', 'Маршрутизация между VLAN', 'ניתוב בין רשתות VLAN'),
    M(5, 'srwe05', 'STP Concepts', 'Принципы STP', 'עקרונות STP'),
    M(6, 'srwe06', 'EtherChannel', 'EtherChannel', 'EtherChannel'),
    M(7, 'dhcp', 'DHCPv4', 'DHCPv4', 'DHCPv4'),
    M(8, 'srwe08', 'SLAAC and DHCPv6 Concepts', 'SLAAC и DHCPv6', 'עקרונות SLAAC ו-DHCPv6'),
    M(9, 'srwe09', 'FHRP Concepts', 'Протоколы резервирования шлюза (FHRP)', 'עקרונות FHRP'),
    M(10, 'srwe10', 'LAN Security Concepts', 'Безопасность LAN', 'עקרונות אבטחת LAN'),
    M(11, 'srwe11', 'Switch Security Configuration', 'Настройка безопасности коммутатора', 'הגדרת אבטחה במתג'),
    M(12, 'srwe12', 'WLAN Concepts', 'Беспроводные сети (WLAN)', 'עקרונות רשתות אלחוטיות'),
    M(13, 'srwe13', 'WLAN Configuration', 'Настройка WLAN', 'הגדרת רשת אלחוטית'),
    M(14, 'srwe14', 'Routing Concepts', 'Принципы маршрутизации', 'עקרונות ניתוב'),
    M(15, 'static', 'IP Static Routing', 'Статическая маршрутизация', 'ניתוב סטטי'),
    M(16, 'srwe16', 'Troubleshoot Static and Default Routes', 'Неисправности статических маршрутов', 'פתרון תקלות בנתיבים סטטיים'),
  ] },
  { id: 'ensa', code: 'ENSA', title: T('Enterprise Networking, Security & Automation', 'Корпоративные сети, безопасность и автоматизация', 'רשתות ארגוניות, אבטחה ואוטומציה'), modules: [
    M(1, 'ospf', 'Single-Area OSPFv2 Concepts & Configuration', 'OSPFv2 с одной областью: принципы и настройка', 'OSPFv2 באזור יחיד: עקרונות והגדרה'),
    M(2, 'ensa02', 'Single-Area OSPFv2 Configuration (deep dive)', 'Настройка OSPFv2 (углублённо)', 'הגדרת OSPFv2 (העמקה)'),
    M(3, 'ensa03', 'Network Security Concepts', 'Принципы сетевой безопасности', 'עקרונות אבטחת רשת'),
    M(4, 'ensa04', 'ACL Concepts', 'Принципы ACL', 'עקרונות ACL'),
    M(5, 'ensa05', 'ACLs for IPv4 Configuration', 'Настройка ACL для IPv4', 'הגדרת ACL עבור IPv4'),
    M(6, 'ensa06', 'NAT for IPv4', 'NAT для IPv4', 'NAT עבור IPv4'),
    M(7, 'ensa07', 'WAN Concepts', 'Принципы WAN', 'עקרונות WAN'),
    M(8, 'ensa08', 'VPN and IPsec Concepts', 'VPN и IPsec', 'עקרונות VPN ו-IPsec'),
    M(9, 'ensa09', 'QoS Concepts', 'Принципы QoS', 'עקרונות QoS'),
    M(10, 'ensa10', 'Network Management', 'Управление сетью', 'ניהול רשת'),
    M(11, 'ensa11', 'Network Design', 'Проектирование сетей', 'תכנון רשתות'),
    M(12, 'trouble', 'Network Troubleshooting', 'Поиск неисправностей', 'פתרון תקלות ברשת'),
    M(13, 'ensa13', 'Network Virtualization', 'Виртуализация сетей', 'וירטואליזציה של רשתות'),
    M(14, 'ensa14', 'Network Automation', 'Автоматизация сетей', 'אוטומציה של רשתות'),
  ] },
  { id: 'extra', code: '+', title: T('Extra topics', 'Дополнительно', 'נושאים נוספים'), modules: [
    M(1, 'rip', 'RIP (legacy routing protocol)', 'RIP (старый протокол маршрутизации)', 'RIP (פרוטוקול ניתוב ותיק)'),
  ] },
];

function coursePartOf(lessonId) {
  for (const part of COURSE) for (const m of part.modules) if (m.lesson === lessonId) return part;
  return null;
}
function courseModuleOf(lessonId) {
  for (const part of COURSE) for (const m of part.modules) if (m.lesson === lessonId) return m;
  return null;
}
// Уроки в порядке прохождения курса (без повторов).
function courseOrder() {
  const out = [];
  for (const part of COURSE) for (const m of part.modules) if (m.lesson && lessonGet(m.lesson) && !out.includes(m.lesson)) out.push(m.lesson);
  return out;
}

// --- блоки текста: строка [en, ru, he] ---
function lT(x) { return Array.isArray(x) ? T(x[0], x[1], x[2]) : x; }
function lSec(title, ...blocks) { return { h: lT(title), blocks }; }
function lP(t) { return { k: 'p', t: lT(t) }; }
function lUL(items) { return { k: 'ul', items: items.map(lT) }; }
function lCode(text, cap) { return { k: 'code', text, cap: cap ? lT(cap) : null }; }
function lTip(t) { return { k: 'tip', t: lT(t) }; }
function lTable(head, rows) { return { k: 'table', head: head.map(lT), rows: rows.map((r) => r.map(lT)) }; }

// Вопрос: варианты — строка (одинакова на всех языках) или [en, ru, he]; answer — индекс верного.
function lQ(q, options, answer, explain) {
  return { q: lT(q), options: options.map(lT), answer, explain: lT(explain) };
}

// Сгенерированный вопрос: верный вариант первым, затем уникальные неверные (не больше 3).
function lGen(q, correct, wrong, explain) {
  const key = (o) => (typeof o === 'string' ? o : o.en);
  const seen = new Set([key(correct)]);
  const opts = [correct];
  for (const w of wrong) {
    if (w === null || w === undefined || seen.has(key(w))) continue;
    seen.add(key(w));
    opts.push(w);
    if (opts.length === 4) break;
  }
  return { q, options: opts, answer: 0, explain, gen: true };
}

function lWild(len) { return intToIp((~lenToMaskInt(len)) >>> 0); }
function lRandHostIp(rng) {
  const f = rng.int(0, 2);
  if (f === 0) return '192.168.' + rng.int(0, 255) + '.' + rng.int(1, 254);
  if (f === 1) return '172.' + rng.int(16, 31) + '.' + rng.int(0, 255) + '.' + rng.int(1, 254);
  return '10.' + rng.int(0, 255) + '.' + rng.int(0, 255) + '.' + rng.int(1, 254);
}

// --- сборка теста ---
function quizPrepare(raw, rng) {
  const order = rng.shuffle(raw.options.map((_, i) => i));
  return { q: raw.q, code: raw.code || null, explain: raw.explain, gen: !!raw.gen, lesson: raw.lesson || null,
    options: order.map((i) => ({ t: raw.options[i], correct: i === raw.answer })) };
}

function lessonPool(lesson, rng, maxGen) {
  const gens = rng.shuffle(lesson.gen || []).slice(0, maxGen);
  return { gen: gens.map((g) => g(rng)), stat: rng.shuffle(lesson.quiz) };
}

// id: id урока, 'final' (весь курс) или 'final:<часть>' (например final:itn).
function quizBuild(id, seed, size) {
  const rng = makeRng(seed);
  if (id === 'final' || id.startsWith('final:')) return quizBuildFinal(id, rng, seed, size || FINAL_SIZE);
  const lesson = lessonGet(id);
  if (!lesson) return null;
  const n = size || QUIZ_SIZE;
  const maxGen = Math.min((lesson.gen || []).length, lesson.genInQuiz || 2);
  const pool = lessonPool(lesson, rng, maxGen);
  const picked = pool.gen.concat(pool.stat).slice(0, n).map((q) => Object.assign({ lesson: id }, q));
  return { lessonId: id, seed, questions: rng.shuffle(picked).map((q) => quizPrepare(q, rng)) };
}

function finalLessons(id) {
  const partId = id.startsWith('final:') ? id.slice(6) : null;
  return courseOrder().filter((lid) => !partId || coursePartOf(lid).id === partId).map(lessonGet);
}

// Итоговый тест: вопросы по очереди из всех уроков (части или всего курса).
function quizBuildFinal(id, rng, seed, n) {
  const pools = rng.shuffle(finalLessons(id)).map((l) => {
    const p = lessonPool(l, rng, Math.min((l.gen || []).length, 1));
    return p.gen.concat(p.stat).map((q) => Object.assign({ lesson: l.id }, q));
  });
  const picked = [];
  for (let round = 0; picked.length < n; round++) {
    let any = false;
    for (const p of pools) {
      if (round < p.length && picked.length < n) { picked.push(p[round]); any = true; }
    }
    if (!any) break;
  }
  return { lessonId: id, seed, questions: rng.shuffle(picked).map((q) => quizPrepare(q, rng)) };
}

// answers[i] — индекс выбранного варианта (или null).
function quizGrade(quiz, answers) {
  const items = quiz.questions.map((q, i) => {
    const chosen = answers[i] === undefined ? null : answers[i];
    const right = q.options.findIndex((o) => o.correct);
    return { ok: chosen === right, chosen, right };
  });
  const correct = items.filter((x) => x.ok).length;
  const pct = Math.round(correct * 100 / items.length);
  return { items, correct, total: items.length, pct, passed: pct >= QUIZ_PASS };
}
