'use strict';
// ENSA 2–11, 13–14: OSPF углублённо, безопасность, ACL, NAT, WAN, VPN/IPsec, QoS, управление сетью,
// проектирование, виртуализация, автоматизация. В конце файла — глоссарий и вопросы для собеседования.
// Загружается после glossary.js и interview.js (нужны G и IV).

// ---------- общие помощники генераторов ENSA ----------
const E2_SPEEDS = [
  { en: 'Ethernet (10 Mbps)', ru: 'Ethernet (10 Мбит/с)', he: 'Ethernet ‏(10 Mbps)', kbps: 10000 },
  { en: 'FastEthernet (100 Mbps)', ru: 'FastEthernet (100 Мбит/с)', he: 'FastEthernet ‏(100 Mbps)', kbps: 100000 },
  { en: 'GigabitEthernet (1 Gbps)', ru: 'GigabitEthernet (1 Гбит/с)', he: 'GigabitEthernet ‏(1 Gbps)', kbps: 1000000 },
  { en: 'TenGigabitEthernet (10 Gbps)', ru: 'TenGigabitEthernet (10 Гбит/с)', he: 'TenGigabitEthernet ‏(10 Gbps)', kbps: 10000000 },
  { en: 'Serial T1 (1.544 Mbps)', ru: 'Serial T1 (1,544 Мбит/с)', he: 'Serial T1 ‏(1.544 Mbps)', kbps: 1544 },
];
function e2Cost(refMbps, kbps) { return Math.max(1, Math.floor(refMbps * 1000 / kbps)); }
function e2Same(n) { return [n, n, n, n].join('.'); }
// Уникальный IP: f() повторяется, пока адрес не новый.
function e2Uniq(used, f) { for (;;) { const a = f(); if (!used.has(a)) { used.add(a); return a; } } }

// ---------------------------------------------------------------
lessonDef({
  id: 'ensa02', topic: 'ospf', drill: 'wildcard', minutes: 18, genInQuiz: 2,
  title: T('OSPFv2 configuration in depth', 'Настройка OSPFv2 углублённо', 'הגדרת OSPFv2 לעומק'),
  goal: T('Set and verify the router ID, enable OSPF with network statements or per interface, make LAN interfaces passive, tune cost and the reference bandwidth, control the DR election, advertise a default route and verify it all.',
    'Задать и проверить router ID, включить OSPF командами network или на интерфейсе, сделать LAN-интерфейсы пассивными, настроить cost и опорную полосу, управлять выборами DR, распространить маршрут по умолчанию и всё проверить.',
    'לקבוע ולבדוק את ה-router ID, להפעיל OSPF בפקודות network או ישירות על הממשק, להפוך ממשקי LAN לפסיביים, לכוונן cost ורוחב פס ייחוס, לשלוט בבחירת ה-DR, להפיץ נתיב ברירת מחדל ולבדוק הכול.'),
  sections: [
    lSec(['The router ID in practice', 'Router ID на практике', 'ה-Router ID בפועל'],
      lP(['Every OSPF router needs a unique 32-bit router ID. It is chosen once, when the OSPF process starts: (1) the router-id command, (2) otherwise the highest IPv4 address of a loopback, (3) otherwise the highest IPv4 address of an active (up) physical interface. The interface does not have to run OSPF.',
        'Каждому роутеру OSPF нужен уникальный 32-битный router ID. Он выбирается один раз, при запуске процесса OSPF: (1) команда router-id, (2) иначе наибольший IPv4-адрес loopback, (3) иначе наибольший IPv4-адрес активного (up) физического интерфейса. Сам интерфейс не обязан участвовать в OSPF.',
        'לכל נתב OSPF צריך router ID ייחודי של 32 סיביות. הוא נבחר פעם אחת, כשתהליך ה-OSPF עולה: (1) הפקודה router-id, (2) אחרת כתובת ה-IPv4 הגבוהה ביותר של loopback, (3) אחרת כתובת ה-IPv4 הגבוהה ביותר של ממשק פיזי פעיל (up). הממשק לא חייב להריץ OSPF.']),
      lCode('R1(config)# router ospf 10\nR1(config-router)# router-id 1.1.1.1\n% OSPF: Reload or use "clear ip ospf process" command, for this to take effect\nR1(config-router)# end\nR1# clear ip ospf process\nReset ALL OSPF processes? [no]: yes\nR1# show ip protocols | include Router ID\n  Router ID 1.1.1.1',
        ['A new router ID takes effect only after the process restarts', 'Новый router ID начинает действовать только после перезапуска процесса', 'router ID חדש נכנס לתוקף רק אחרי הפעלה מחדש של התהליך']),
      lUL([
        ['Set the router ID by hand: it never changes when an interface goes down and is easy to recognise in show output.', 'Задавайте router ID вручную: он не меняется, когда падает интерфейс, и его легко узнать в выводе show.', 'מגדירים router ID ידנית: הוא לא משתנה כשממשק נופל, וקל לזהות אותו בפלט של show.'],
        ['Two routers with the same router ID do not become neighbours, and the log shows "Duplicate router-id".', 'Два роутера с одинаковым router ID не становятся соседями, а в журнале появляется «Duplicate router-id».', 'שני נתבים עם אותו router ID לא נהיים שכנים, וביומן מופיע "Duplicate router-id".'],
      ])),
    lSec(['Enabling OSPF on interfaces', 'Включение OSPF на интерфейсах', 'הפעלת OSPF על ממשקים'],
      lCode('R1(config)# router ospf 10\nR1(config-router)# network 10.1.1.0 0.0.0.255 area 0\nR1(config-router)# network 10.1.12.1 0.0.0.0 area 0\n! or directly on the interface:\nR1(config)# interface g0/0/1\nR1(config-if)# ip ospf 10 area 0'),
      lUL([
        ['network <address> <wildcard> area <id> — every interface whose IP falls in the range runs OSPF, and its subnet is advertised.', 'network <адрес> <wildcard> area <номер> — OSPF запускается на каждом интерфейсе, чей IP попадает в диапазон, и его подсеть объявляется.', 'network <כתובת> <wildcard> area <מספר> — כל ממשק שה-IP שלו נופל בטווח מריץ OSPF, והתת-רשת שלו מפורסמת.'],
        ['Wildcard 0.0.0.0 with the interface IP (network 10.1.12.1 0.0.0.0) selects exactly one interface — precise and safe.', 'Wildcard 0.0.0.0 с IP интерфейса (network 10.1.12.1 0.0.0.0) выбирает ровно один интерфейс — точно и безопасно.', 'Wildcard 0.0.0.0 עם ה-IP של הממשק (network 10.1.12.1 0.0.0.0) בוחר בדיוק ממשק אחד — מדויק ובטוח.'],
        ['ip ospf <process> area <id> on the interface does the same without any wildcard; it takes priority over network statements.', 'ip ospf <процесс> area <номер> на интерфейсе делает то же самое без wildcard и имеет приоритет над командами network.', 'ip ospf <תהליך> area <מספר> על הממשק עושה אותו דבר בלי wildcard, ויש לו עדיפות על פקודות network.'],
      ])),
    lSec(['Passive interfaces', 'Пассивные интерфейсы', 'ממשקים פסיביים'],
      lP(['A passive interface sends and accepts no Hellos, so no neighbour can form there — but its network is still advertised to the other routers. Make every LAN that has only hosts passive: no wasted Hellos, less CPU, and nobody on the LAN can inject fake OSPF routes.',
        'Пассивный интерфейс не отправляет и не принимает Hello, поэтому соседство там не возникает — но его сеть всё равно объявляется другим роутерам. Делайте пассивной каждую LAN, где только хосты: нет лишних Hello, меньше нагрузка на CPU, и никто из LAN не подсунет поддельные маршруты OSPF.',
        'ממשק פסיבי לא שולח ולא מקבל Hello, ולכן לא נוצרת שם שכנות — אבל הרשת שלו עדיין מפורסמת לנתבים האחרים. הופכים לפסיבי כל LAN שיש בו רק מארחים: אין Hello מיותרים, פחות עומס על ה-CPU, ואף אחד ב-LAN לא יכול להזריק נתיבי OSPF מזויפים.']),
      lCode('R1(config-router)# passive-interface g0/0/0\n! or: everything passive, then open the links to routers\nR1(config-router)# passive-interface default\nR1(config-router)# no passive-interface g0/0/1\nR1# show ip protocols\n  ...\n  Passive Interface(s):\n    GigabitEthernet0/0/0\n    Loopback0'),
      lTip(['Never make a link to another OSPF router passive — the adjacency on it goes down.', 'Никогда не делайте пассивным канал к другому роутеру OSPF — соседство на нём пропадёт.', 'אף פעם לא הופכים לפסיבי קישור לנתב OSPF אחר — השכנות עליו תיפול.'])),
    lSec(['Tuning the cost', 'Настройка cost', 'כוונון ה-cost'],
      lP(['cost = reference bandwidth / interface bandwidth, rounded down, at least 1. With the default reference of 100 Mbps, FastEthernet, GigabitEthernet and 10 Gigabit all cost 1, so OSPF cannot prefer the faster link. Raise the reference on EVERY router in the area.',
        'cost = опорная полоса / полоса интерфейса, с округлением вниз, не меньше 1. При опорной полосе по умолчанию 100 Мбит/с FastEthernet, GigabitEthernet и 10 Gigabit стоят 1, и OSPF не может предпочесть более быстрый канал. Увеличьте опорную полосу на КАЖДОМ роутере области.',
        'cost = רוחב פס ייחוס חלקי רוחב הפס של הממשק, מעוגל כלפי מטה, לפחות 1. עם ערך הייחוס של ברירת המחדל, 100 Mbps, ל-FastEthernet, ל-GigabitEthernet ול-10 Gigabit יש cost 1, ו-OSPF לא יכול להעדיף את הקישור המהיר. מעלים את ערך הייחוס בכל נתב באזור.']),
      lTable([['Interface', 'Интерфейс', 'ממשק'], ['ref 100 (default)', 'опорная 100 (по умолчанию)', 'ייחוס 100 (ברירת מחדל)'], ['ref 1000', 'опорная 1000', 'ייחוס 1000'], ['ref 10000', 'опорная 10000', 'ייחוס 10000']], [
        ['FastEthernet', '1', '10', '100'], ['GigabitEthernet', '1', '1', '10'], ['10 GigabitEthernet', '1', '1', '1'], ['Serial T1 (1.544 Mbps)', '64', '647', '6476'],
      ]),
      lCode('R1(config-router)# auto-cost reference-bandwidth 10000\n% OSPF: Reference bandwidth is changed.\n        Please ensure reference bandwidth is consistent across all routers.\nR1(config)# interface g0/0/1\nR1(config-if)# ip ospf cost 30\nR1(config)# interface s0/1/0\nR1(config-if)# bandwidth 64'),
      lUL([
        ['ip ospf cost <n> sets the cost of one interface directly and overrides the formula.', 'ip ospf cost <n> задаёт cost одного интерфейса напрямую и важнее формулы.', 'ip ospf cost <n> קובע ישירות את ה-cost של ממשק אחד וגובר על הנוסחה.'],
        ['bandwidth <kbps> only changes the number used in the formula — the real speed of the link stays the same.', 'bandwidth <кбит/с> меняет только число для формулы — реальная скорость канала не меняется.', 'bandwidth <kbps> משנה רק את המספר שבנוסחה — המהירות האמיתית של הקישור לא משתנה.'],
        ['The cost of a route is the sum of the outgoing interface costs on the way to the destination. Equal-cost paths are load-balanced (4 by default).', 'Cost маршрута — сумма cost выходных интерфейсов на пути к сети. Пути с равным cost балансируются (по умолчанию до 4).', 'ה-cost של נתיב הוא סכום ה-cost של ממשקי היציאה בדרך ליעד. נתיבים עם cost שווה מאוזנים (עד 4 כברירת מחדל).'],
      ])),
    lSec(['Controlling the DR election', 'Управление выборами DR', 'שליטה בבחירת ה-DR'],
      lP(['On a multi-access segment (Ethernet) the routers elect a DR and a BDR. Highest interface priority wins (0–255, default 1), then the highest router ID. Priority 0 = never DR or BDR. The election is not pre-emptive: a better router that comes up later does not take over until the OSPF process is cleared.',
        'В сегменте множественного доступа (Ethernet) роутеры выбирают DR и BDR. Побеждает наибольший приоритет интерфейса (0–255, по умолчанию 1), затем наибольший router ID. Приоритет 0 — никогда не DR и не BDR. Выборы не вытесняющие: лучший роутер, включённый позже, не займёт роль, пока не сбросить процесс OSPF.',
        'בסגמנט multi-access ‏(Ethernet) הנתבים בוחרים DR ו-BDR. העדיפות הגבוהה ביותר של הממשק מנצחת (0–255, ברירת מחדל 1), ואחריה ה-router ID הגבוה ביותר. עדיפות 0 = אף פעם לא DR או BDR. הבחירה לא מקדימה (non-preemptive): נתב טוב יותר שעולה מאוחר יותר לא יחליף את ה-DR עד שמאפסים את תהליך ה-OSPF.']),
      lCode('R1(config)# interface g0/0/0\nR1(config-if)# ip ospf priority 255\nR1# clear ip ospf process\nR1# show ip ospf interface g0/0/0\n  ... Transmit Delay is 1 sec, State DR, Priority 255\n  Designated Router (ID) 1.1.1.1, Interface address 192.168.1.1\n  Backup Designated router (ID) 3.3.3.3, Interface address 192.168.1.3'),
      lUL([
        ['DROTHERs reach FULL only with the DR and BDR; with each other they stay in 2-WAY — that is normal.', 'DROTHER доходят до FULL только с DR и BDR; между собой они остаются в 2-WAY — это нормально.', 'נתבי DROTHER מגיעים ל-FULL רק עם ה-DR וה-BDR; ביניהם הם נשארים ב-2-WAY — וזה תקין.'],
        ['Routers send updates to the DR/BDR at 224.0.0.6; the DR floods them to everyone at 224.0.0.5.', 'Роутеры шлют обновления DR/BDR на 224.0.0.6; DR рассылает их всем на 224.0.0.5.', 'הנתבים שולחים עדכונים ל-DR/BDR בכתובת 224.0.0.6; ה-DR מפיץ אותם לכולם ב-224.0.0.5.'],
        ['On an Ethernet link between just two routers, "ip ospf network point-to-point" skips the election and speeds up adjacency.', 'На Ethernet-канале между двумя роутерами «ip ospf network point-to-point» отключает выборы и ускоряет соседство.', 'בקישור Ethernet בין שני נתבים בלבד, "ip ospf network point-to-point" מבטל את הבחירה ומזרז את השכנות.'],
      ])),
    lSec(['Default route propagation and verification', 'Распространение маршрута по умолчанию и проверка', 'הפצת נתיב ברירת מחדל ובדיקה'],
      lCode('R2(config)# ip route 0.0.0.0 0.0.0.0 209.165.200.225\nR2(config)# router ospf 10\nR2(config-router)# default-information originate\n\nR1# show ip route ospf\nO*E2  0.0.0.0/0 [110/1] via 10.1.12.2, 00:00:12, GigabitEthernet0/0/1\nO     10.1.2.0/24 [110/2] via 10.1.12.2, 00:05:40, GigabitEthernet0/0/1',
        ['The edge router (ASBR) advertises its static default route to the whole area', 'Пограничный роутер (ASBR) объявляет свой статический маршрут по умолчанию всей области', 'נתב הקצה (ASBR) מפרסם את נתיב ברירת המחדל הסטטי שלו לכל האזור']),
      lTable([['Command', 'Команда', 'פקודה'], ['Shows', 'Показывает', 'מציג']], [
        ['show ip ospf neighbor', ['Neighbours, state (FULL, 2-WAY), DR/BDR role, dead timer', 'Соседи, состояние (FULL, 2-WAY), роль DR/BDR, dead-таймер', 'שכנים, מצב (FULL, 2-WAY), תפקיד DR/BDR, טיימר dead']],
        ['show ip protocols', ['Router ID, networks, passive interfaces, routing sources', 'Router ID, сети, пассивные интерфейсы, источники маршрутов', 'Router ID, רשתות, ממשקים פסיביים, מקורות ניתוב']],
        ['show ip ospf interface [brief]', ['Area, cost, state, priority, hello/dead timers per interface', 'Область, cost, состояние, приоритет, таймеры hello/dead по интерфейсам', 'אזור, cost, מצב, עדיפות וטיימרים hello/dead לכל ממשק']],
        ['show ip ospf', ['Process, router ID, reference bandwidth', 'Процесс, router ID, опорная полоса', 'תהליך, router ID, רוחב פס ייחוס']],
        ['show ip route ospf', ['Only OSPF routes: O and O*E2', 'Только маршруты OSPF: O и O*E2', 'רק נתיבי OSPF: ‏O ו-O*E2']],
      ]),
      lTip(['Hello/dead timers (ip ospf hello-interval / dead-interval) must match on both ends, or the neighbour never appears.', 'Таймеры hello/dead (ip ospf hello-interval / dead-interval) должны совпадать с обеих сторон, иначе сосед не появится.', 'טיימרי hello/dead ‏(ip ospf hello-interval / dead-interval) חייבים להתאים בשני הצדדים, אחרת השכן לא יופיע.'])),
  ],
  quiz: [
    lQ(['You type "router-id 2.2.2.2" on a router where OSPF is already running. What else is needed?', 'Вы ввели «router-id 2.2.2.2» на роутере, где OSPF уже работает. Что ещё нужно?', 'הקלדת "router-id 2.2.2.2" בנתב שכבר מריץ OSPF. מה עוד צריך?'],
      [['clear ip ospf process (or a reload)', 'clear ip ospf process (или перезагрузка)', 'clear ip ospf process (או אתחול)'], ['Nothing, it applies at once', 'Ничего, применяется сразу', 'כלום, זה חל מיד'], ['copy running-config startup-config', 'copy running-config startup-config', 'copy running-config startup-config'], ['shutdown on the loopback', 'shutdown на loopback', 'shutdown על ה-loopback']], 0,
      ['The router ID is chosen when the process starts, so the process must restart.', 'Router ID выбирается при запуске процесса, поэтому процесс нужно перезапустить.', 'ה-router ID נבחר כשהתהליך עולה, ולכן צריך להפעיל את התהליך מחדש.']),
    lQ(['What does "passive-interface g0/0/0" do?', 'Что делает «passive-interface g0/0/0»?', 'מה עושה "passive-interface g0/0/0"?'],
      [['Stops Hellos on G0/0/0 but still advertises its network', 'Прекращает Hello на G0/0/0, но сеть по-прежнему объявляется', 'מפסיק Hello ב-G0/0/0 אבל הרשת שלו עדיין מפורסמת'], ['Removes the G0/0/0 network from OSPF', 'Убирает сеть G0/0/0 из OSPF', 'מוציא את הרשת של G0/0/0 מ-OSPF'], ['Blocks all traffic on G0/0/0', 'Блокирует весь трафик на G0/0/0', 'חוסם את כל התעבורה ב-G0/0/0'], ['Makes G0/0/0 a backup link', 'Делает G0/0/0 резервным каналом', 'הופך את G0/0/0 לקישור גיבוי']], 0,
      ['No neighbours on that interface, but the subnet stays in OSPF.', 'Соседей на этом интерфейсе нет, но подсеть остаётся в OSPF.', 'אין שכנים על הממשק הזה, אבל התת-רשת נשארת ב-OSPF.']),
    lQ(['What does "network 10.1.12.1 0.0.0.0 area 0" do?', 'Что делает «network 10.1.12.1 0.0.0.0 area 0»?', 'מה עושה "network 10.1.12.1 0.0.0.0 area 0"?'],
      [['Enables OSPF only on the interface with exactly 10.1.12.1', 'Включает OSPF только на интерфейсе с адресом ровно 10.1.12.1', 'מפעיל OSPF רק על הממשק שכתובתו בדיוק 10.1.12.1'], ['Advertises 10.0.0.0/8', 'Объявляет 10.0.0.0/8', 'מפרסם את 10.0.0.0/8'], ['Enables OSPF on all interfaces', 'Включает OSPF на всех интерфейсах', 'מפעיל OSPF על כל הממשקים'], ['Gives an error: the wildcard cannot be 0.0.0.0', 'Ошибка: wildcard не может быть 0.0.0.0', 'שגיאה: ה-wildcard לא יכול להיות 0.0.0.0']], 0,
      ['Wildcard 0.0.0.0 means every bit must match — one exact address.', 'Wildcard 0.0.0.0 — все биты должны совпасть, то есть ровно один адрес.', 'Wildcard 0.0.0.0 אומר שכל הסיביות חייבות להתאים — כתובת אחת בדיוק.']),
    lQ(['An interface has "ip ospf priority 0". What does that mean?', 'На интерфейсе «ip ospf priority 0». Что это значит?', 'על ממשק מוגדר "ip ospf priority 0". מה המשמעות?'],
      [['The router never becomes DR or BDR on that segment', 'Роутер никогда не станет DR или BDR в этом сегменте', 'הנתב לעולם לא יהיה DR או BDR בסגמנט הזה'], ['The router always becomes DR', 'Роутер всегда станет DR', 'הנתב תמיד יהיה DR'], ['OSPF is disabled on the interface', 'OSPF на интерфейсе выключен', 'OSPF מושבת על הממשק'], ['The interface cost becomes 0', 'Cost интерфейса становится 0', 'ה-cost של הממשק הופך ל-0']], 0,
      ['It still forms adjacencies, it just never wins the election.', 'Соседство он всё равно устанавливает, просто не участвует в выборах.', 'הוא עדיין יוצר שכנויות, הוא פשוט אף פעם לא זוכה בבחירה.']),
    lQ(['Why change "auto-cost reference-bandwidth"?', 'Зачем менять «auto-cost reference-bandwidth»?', 'למה משנים את "auto-cost reference-bandwidth"?'],
      [['So 1 Gbps and 10 Gbps links get lower costs than 100 Mbps links', 'Чтобы каналы 1 и 10 Гбит/с получили меньший cost, чем 100 Мбит/с', 'כדי שקישורי 1 Gbps ו-10 Gbps יקבלו cost נמוך יותר מקישורי 100 Mbps'], ['To speed up convergence', 'Чтобы ускорить сходимость', 'כדי לזרז את ההתכנסות'], ['To change the AD of OSPF', 'Чтобы изменить AD у OSPF', 'כדי לשנות את ה-AD של OSPF'], ['To limit OSPF to one area', 'Чтобы ограничить OSPF одной областью', 'כדי להגביל את OSPF לאזור אחד']], 0,
      ['With 100 Mbps as reference, everything from 100 Mbps up costs 1. Change it on every router.', 'При опорной 100 Мбит/с всё от 100 Мбит/с и выше стоит 1. Менять нужно на всех роутерах.', 'כשהייחוס הוא 100 Mbps, כל מה שמ-100 Mbps ומעלה מקבל cost 1. משנים בכל הנתבים.']),
    lQ(['Which command makes OSPF advertise the edge router\'s static default route?', 'Какая команда заставит OSPF объявлять статический маршрут по умолчанию пограничного роутера?', 'איזו פקודה גורמת ל-OSPF לפרסם את נתיב ברירת המחדל הסטטי של נתב הקצה?'],
      ['default-information originate', 'ip default-gateway', 'network 0.0.0.0 255.255.255.255 area 0', 'redistribute connected'], 0,
      ['It is entered in router ospf mode on the router that has the default route.', 'Вводится в режиме router ospf на роутере, где есть маршрут по умолчанию.', 'מקלידים אותה במצב router ospf בנתב שיש לו את נתיב ברירת המחדל.']),
    lQ(['How does a default route learned through OSPF appear in the routing table?', 'Как маршрут по умолчанию, полученный по OSPF, выглядит в таблице маршрутизации?', 'איך נתיב ברירת מחדל שנלמד דרך OSPF מופיע בטבלת הניתוב?'],
      ['O*E2 0.0.0.0/0', 'S* 0.0.0.0/0', 'C 0.0.0.0/0', 'O IA 0.0.0.0/0'], 0,
      ['O = OSPF, * = candidate default, E2 = external type 2 (its metric does not grow).', 'O — OSPF, * — кандидат в маршрут по умолчанию, E2 — внешний тип 2 (метрика не растёт).', 'O = OSPF, ‏* = מועמד לברירת מחדל, ‏E2 = חיצוני מסוג 2 (המטריקה לא גדלה).']),
    lQ(['Two DROTHER routers on the same LAN — what state do they show for each other?', 'Два DROTHER в одной LAN — какое состояние они показывают друг для друга?', 'שני נתבי DROTHER באותו LAN — באיזה מצב הם מופיעים זה אצל זה?'],
      ['2-WAY', 'FULL', 'INIT', 'EXSTART'], 0,
      ['Only the DR and BDR get FULL adjacencies with everyone.', 'Полное соседство (FULL) со всеми есть только у DR и BDR.', 'רק ל-DR ול-BDR יש שכנות FULL עם כולם.']),
    lQ(['Which command shows the reference bandwidth in use?', 'Какая команда показывает текущую опорную полосу?', 'איזו פקודה מציגה את רוחב פס הייחוס בשימוש?'],
      ['show ip ospf', 'show ip ospf neighbor', 'show ip interface brief', 'show cdp neighbors'], 0,
      ['It prints "Reference bandwidth unit is … mbps".', 'Она выводит «Reference bandwidth unit is … mbps».', 'היא מדפיסה "Reference bandwidth unit is … mbps".']),
    lQ(['An interface has "ip ospf cost 30" and the reference bandwidth was also changed. Which cost is used?', 'На интерфейсе «ip ospf cost 30», и опорная полоса тоже изменена. Какой cost используется?', 'על ממשק מוגדר "ip ospf cost 30" וגם רוחב פס הייחוס שונה. באיזה cost משתמשים?'],
      [['30 — the manual cost wins', '30 — ручной cost важнее', '30 — ה-cost הידני גובר'], ['The calculated cost', 'Вычисленный cost', 'ה-cost המחושב'], ['The sum of both', 'Сумма обоих', 'סכום שניהם'], ['The lower of the two', 'Меньший из двух', 'הנמוך מבין השניים']], 0,
      ['ip ospf cost overrides the formula on that interface.', 'ip ospf cost отменяет формулу на этом интерфейсе.', 'ip ospf cost גובר על הנוסחה בממשק הזה.']),
  ],
  gen: [
    function genRouterId(rng) {
      const used = new Set();
      const kind = rng.int(0, 2); // 0 — router-id, 1 — loopback, 2 — только физические
      const phys = rng.shuffle(['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'Serial0/1/0', 'Serial0/1/1']).slice(0, 3).sort()
        .map((name) => ({ name, ip: e2Uniq(used, () => lRandHostIp(rng)), up: true }));
      if (kind === 2 && rng.chance(0.6)) phys.reduce((a, b) => (ipToInt(a.ip) > ipToInt(b.ip) ? a : b)).up = false;
      const loops = kind === 2 ? [] : Array.from({ length: rng.int(1, 2) }, (_, i) => ({ name: 'Loopback' + i, up: true,
        ip: e2Uniq(used, () => (rng.chance(0.5) ? e2Same(rng.int(1, 9)) : '10.255.' + rng.int(0, 255) + '.' + rng.int(1, 254))) }));
      const rid = kind === 0 ? e2Uniq(used, () => e2Same(rng.int(1, 9))) : null;
      const all = phys.concat(loops);
      const best = (list) => list.reduce((a, b) => (ipToInt(a.ip) > ipToInt(b.ip) ? a : b)).ip;
      const right = rid || (loops.length ? best(loops) : best(phys.filter((p) => p.up)));
      const code = 'R1# show running-config | section router ospf\nrouter ospf 1\n' + (rid ? ' router-id ' + rid + '\n' : '') + ' network 0.0.0.0 255.255.255.255 area 0\nR1# show ip interface brief\n' +
        padR('Interface', 23) + padR('IP-Address', 16) + 'Status\n' + all.map((p) => padR(p.name, 23) + padR(p.ip, 16) + (p.up ? 'up' : 'administratively down')).join('\n');
      const why = kind === 0 ? T('The router-id command (' + rid + ') beats every interface address.', 'Команда router-id (' + rid + ') важнее любых адресов интерфейсов.', 'הפקודה router-id ‏(' + rid + ') גוברת על כל כתובות הממשקים.')
        : kind === 1 ? T('No router-id command → the highest loopback address, ' + right + ', even if a physical address is higher.', 'Нет команды router-id → наибольший адрес loopback, ' + right + ', даже если физический адрес больше.', 'אין פקודת router-id → כתובת ה-loopback הגבוהה ביותר, ' + right + ', גם אם כתובת פיזית גבוהה יותר.')
          : T('No router-id and no loopback → the highest address of an interface that is up: ' + right + '. A shut-down interface does not count.', 'Нет router-id и loopback → наибольший адрес интерфейса в состоянии up: ' + right + '. Выключенный интерфейс не считается.', 'אין router-id ואין loopback → הכתובת הגבוהה ביותר של ממשק שנמצא ב-up: ' + right + '. ממשק מושבת לא נחשב.');
      const q = lGen(T('R1 has just started OSPF with this configuration. What is its router ID?', 'R1 только что запустил OSPF с такой конфигурацией. Какой у него router ID?', 'R1 הרגע הפעיל OSPF עם התצורה הזו. מהו ה-router ID שלו?'),
        right, rng.shuffle(all.map((p) => p.ip).filter((ip) => ip !== right)), why);
      q.code = code;
      return q;
    },
    function genDrElection(rng) {
      const n = rng.int(3, 4), used = new Set(), routers = [];
      for (let i = 1; i <= n; i++) {
        routers.push({ name: 'R' + i, pri: rng.pick([0, 1, 1, 1, 1, 10, 50, 100, 255]),
          rid: e2Uniq(used, () => (rng.chance(0.6) ? e2Same(rng.int(1, 9)) : '10.' + rng.int(0, 9) + '.' + rng.int(0, 9) + '.' + rng.int(1, 9))) });
      }
      while (routers.filter((r) => r.pri > 0).length < 2) rng.pick(routers.filter((r) => r.pri === 0)).pri = 1;
      const ranked = routers.filter((r) => r.pri > 0).sort((a, b) => b.pri - a.pri || ipToInt(b.rid) - ipToInt(a.rid));
      const role = rng.chance(0.65) ? 'DR' : 'BDR';
      const right = role === 'DR' ? ranked[0] : ranked[1];
      const order = ranked.map((r) => r.name).join(' > ');
      const q = lGen(T('These routers share one Ethernet segment and start OSPF at the same moment. Which router becomes the ' + role + '?', 'Эти роутеры в одном Ethernet-сегменте и запускают OSPF одновременно. Какой роутер станет ' + role + '?', 'הנתבים האלה באותו סגמנט Ethernet ומפעילים OSPF באותו רגע. איזה נתב יהיה ה-' + role + '?'),
        right.name, rng.shuffle(routers.filter((r) => r !== right).map((r) => r.name)),
        T('Highest priority wins, then highest router ID; priority 0 never takes part. Ranking: ' + order + '.', 'Побеждает наибольший приоритет, затем наибольший router ID; приоритет 0 не участвует. Порядок: ' + order + '.', 'העדיפות הגבוהה ביותר מנצחת, ואחריה ה-router ID הגבוה ביותר; עדיפות 0 לא משתתפת. הדירוג: ' + order + '.'));
      q.code = padR('Router', 8) + padR('Priority', 10) + 'Router ID\n' + routers.map((r) => padR(r.name, 8) + padR(String(r.pri), 10) + r.rid).join('\n');
      return q;
    },
    function genRefBwCost(rng) {
      const ref = rng.pick([1000, 1000, 10000, 100000]), sp = rng.pick(E2_SPEEDS), right = e2Cost(ref, sp.kbps);
      const wrong = [e2Cost(100, sp.kbps), e2Cost(ref * 10, sp.kbps), e2Cost(ref / 10, sp.kbps), e2Cost(ref, sp.kbps / 10), e2Cost(ref, sp.kbps * 10), Math.round(ref * 1000 / sp.kbps) + 1, 1, 10, 100]
        .map(String).filter((x) => x !== String(right));
      return lGen(T('Every router has "auto-cost reference-bandwidth ' + ref + '". What is the OSPF cost of the ' + sp.en + ' interface?', 'На всех роутерах «auto-cost reference-bandwidth ' + ref + '». Какой OSPF cost у интерфейса ' + sp.ru + '?', 'בכל הנתבים מוגדר "auto-cost reference-bandwidth ' + ref + '". מהו ה-cost של OSPF בממשק ' + sp.he + '?'),
        String(right), wrong,
        T('cost = ' + ref + ' Mbps / ' + sp.kbps / 1000 + ' Mbps → ' + right + ' (rounded down, at least 1).', 'cost = ' + ref + ' Мбит/с / ' + sp.kbps / 1000 + ' Мбит/с → ' + right + ' (вниз, не меньше 1).', 'cost = ‏' + ref + ' Mbps / ' + sp.kbps / 1000 + ' Mbps → ' + right + ' (מעוגל למטה, לפחות 1).'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'ensa03', topic: 'device', minutes: 16,
  title: T('Network security concepts', 'Принципы сетевой безопасности', 'עקרונות אבטחת רשת'),
  goal: T('Who attacks networks and with which tools, malware types, reconnaissance, access and DoS attacks, weaknesses of IP, TCP, UDP, ARP, DNS and DHCP, and how cryptography gives integrity, authentication and confidentiality.',
    'Кто атакует сети и какими инструментами, виды вредоносного ПО, атаки разведки, доступа и DoS, слабые места IP, TCP, UDP, ARP, DNS и DHCP и как криптография обеспечивает целостность, аутентификацию и конфиденциальность.',
    'מי תוקף רשתות ובאילו כלים, סוגי נוזקות, מתקפות איסוף מודיעין, גישה ו-DoS, נקודות התורפה של IP, ‏TCP, ‏UDP, ‏ARP, ‏DNS ו-DHCP, ואיך קריפטוגרפיה נותנת שלמות, אימות וסודיות.'),
  sections: [
    lSec(['Key terms and threat actors', 'Основные термины и злоумышленники', 'מושגי יסוד וגורמי איום'],
      lTable([['Term', 'Термин', 'מונח'], ['Meaning', 'Значение', 'משמעות']], [
        [['Asset', 'Актив', 'נכס (Asset)'], ['Anything of value: data, servers, the network itself', 'Всё ценное: данные, серверы, сама сеть', 'כל דבר בעל ערך: מידע, שרתים, הרשת עצמה']],
        [['Vulnerability', 'Уязвимость', 'פגיעות'], ['A weakness that can be used to harm the asset', 'Слабое место, через которое можно навредить активу', 'חולשה שאפשר לנצל כדי לפגוע בנכס']],
        [['Threat', 'Угроза', 'איום'], ['A possible danger to an asset', 'Возможная опасность для актива', 'סכנה אפשרית לנכס']],
        [['Exploit', 'Эксплойт', 'אקספלויט (Exploit)'], ['The method or code that uses a vulnerability', 'Способ или код, который использует уязвимость', 'השיטה או הקוד שמנצלים פגיעות']],
        [['Risk', 'Риск', 'סיכון'], ['The likelihood that a threat uses a vulnerability, and the impact', 'Вероятность, что угроза использует уязвимость, и последствия', 'הסבירות שאיום ינצל פגיעות, וההשפעה']],
        [['Attack vector', 'Вектор атаки', 'וקטור תקיפה'], ['The path of the attack — from outside or from inside (an employee, an infected laptop)', 'Путь атаки — снаружи или изнутри (сотрудник, заражённый ноутбук)', 'הנתיב של המתקפה — מבחוץ או מבפנים (עובד, מחשב נייד נגוע)']],
      ]),
      lUL([
        ['Threat actors: script kiddies (use ready-made tools), hacktivists (political or social goals), cyber criminals (money), state-sponsored groups (espionage, sabotage).', 'Злоумышленники: скрипт-кидди (готовые инструменты), хактивисты (политические или социальные цели), киберпреступники (деньги), государственные группы (шпионаж, саботаж).', 'גורמי איום: script kiddies (כלים מוכנים), האקטיביסטים (מטרות פוליטיות או חברתיות), פושעי סייבר (כסף), קבוצות בחסות מדינה (ריגול, חבלה).'],
        ['White hat — ethical hacker with permission; black hat — criminal; gray hat — in between (breaks in without permission, then reports).', 'White hat — этичный хакер с разрешением; black hat — преступник; gray hat — посередине (взламывает без разрешения, потом сообщает).', 'White hat — האקר אתי עם אישור; ‏black hat — עבריין; ‏gray hat — באמצע (פורץ בלי אישור ואז מדווח).'],
        ['Their tools are the same tools defenders use for penetration testing: network scanners (Nmap), packet sniffers (Wireshark), password crackers, vulnerability scanners, fuzzers, Kali Linux.', 'Их инструменты — те же, что используют защитники для тестов на проникновение: сканеры сети (Nmap), снифферы (Wireshark), взломщики паролей, сканеры уязвимостей, фаззеры, Kali Linux.', 'הכלים שלהם הם אותם כלים שבהם המגינים משתמשים בבדיקות חדירות: סורקי רשת (Nmap), ‏sniffers ‏(Wireshark), פורצי סיסמאות, סורקי פגיעויות, ‏fuzzers, ‏Kali Linux.'],
      ])),
    lSec(['Malware', 'Вредоносное ПО', 'נוזקות (Malware)'],
      lTable([['Type', 'Тип', 'סוג'], ['What it does', 'Что делает', 'מה זה עושה']], [
        [['Virus', 'Вирус', 'וירוס'], ['Attaches to a file and spreads when a user runs it', 'Прикрепляется к файлу и распространяется, когда пользователь его запускает', 'נצמד לקובץ ומתפשט כשמשתמש מריץ אותו']],
        [['Worm', 'Червь', 'תולעת'], ['Spreads across the network by itself, using a vulnerability', 'Сам распространяется по сети через уязвимость', 'מתפשטת ברשת לבד דרך פגיעות']],
        [['Trojan horse', 'Троян', 'סוס טרויאני'], ['Looks like a useful program, hides malicious code', 'Похож на полезную программу, прячет вредоносный код', 'נראה כמו תוכנה שימושית ומסתיר קוד זדוני']],
        [['Ransomware', 'Вымогатель (ransomware)', 'כופרה (Ransomware)'], ['Encrypts the victim\'s data and demands payment for the key', 'Шифрует данные жертвы и требует выкуп за ключ', 'מצפינה את המידע של הקורבן ודורשת תשלום תמורת המפתח']],
        [['Spyware / adware', 'Шпионское / рекламное ПО', 'רוגלה / אדוור'], ['Secretly collects user activity / shows unwanted ads', 'Тайно собирает действия пользователя / показывает рекламу', 'אוספת בסתר את פעילות המשתמש / מציגה פרסומות לא רצויות']],
        [['Rootkit', 'Руткит', 'Rootkit'], ['Hides deep in the OS and gives the attacker privileged access', 'Прячется глубоко в ОС и даёт злоумышленнику привилегированный доступ', 'מסתתר עמוק במערכת ההפעלה ונותן לתוקף גישה מורשית-על']],
      ])),
    lSec(['Common network attacks', 'Частые сетевые атаки', 'מתקפות רשת נפוצות'],
      lUL([
        ['Reconnaissance — map the target first: public information queries (whois, DNS), ping sweeps, port scans, vulnerability scans.', 'Разведка — сначала изучить цель: открытые источники (whois, DNS), ping sweep, сканирование портов и уязвимостей.', 'איסוף מודיעין — קודם ממפים את המטרה: מידע פומבי (whois, ‏DNS), סריקות ping, סריקות פורטים וסריקות פגיעויות.'],
        ['Access attacks — password attacks (brute force, dictionary), spoofing, trust exploitation, port redirection, man-in-the-middle, buffer overflow.', 'Атаки доступа — подбор паролей (перебор, словарь), подмена адресов, злоупотребление доверием, перенаправление портов, «человек посередине», переполнение буфера.', 'מתקפות גישה — מתקפות סיסמה (כוח גס, מילון), התחזות (spoofing), ניצול יחסי אמון, הפניית פורטים, אדם-באמצע, גלישת חוצץ (buffer overflow).'],
        ['Social engineering — phishing, spear phishing (targeted), pretexting, tailgating (walking in behind someone), shoulder surfing, dumpster diving.', 'Социальная инженерия — фишинг, целевой фишинг (spear phishing), выдуманный предлог, проход «хвостом» за сотрудником, подглядывание через плечо, поиск в мусоре.', 'הנדסה חברתית — פישינג, ‏spear phishing (ממוקד), תואנה בדויה (pretexting), השתחלות אחרי עובד (tailgating), הצצה מעבר לכתף, חיטוט בפחי אשפה.'],
        ['DoS / DDoS — overload a service so real users cannot use it; DDoS uses a botnet of many infected devices controlled by a C&C server.', 'DoS / DDoS — перегрузить сервис, чтобы настоящие пользователи не могли им пользоваться; DDoS — с ботнета из многих заражённых устройств под управлением C&C-сервера.', 'DoS / DDoS — מעמיסים על שירות כך שמשתמשים אמיתיים לא יכולים להשתמש בו; ‏DDoS משתמש ב-botnet של הרבה התקנים נגועים שנשלטים משרת C&C.'],
      ])),
    lSec(['IP, TCP/UDP and service vulnerabilities', 'Уязвимости IP, TCP/UDP и сервисов', 'פגיעויות של IP, ‏TCP/UDP ושירותים'],
      lTable([['Attack', 'Атака', 'מתקפה'], ['How it works', 'Как работает', 'איך זה עובד']], [
        [['ICMP attacks, amplification and reflection', 'Атаки ICMP, усиление и отражение', 'מתקפות ICMP, הגברה והחזרה'], ['Small requests with the victim\'s spoofed source get big replies sent to the victim', 'Маленькие запросы с поддельным адресом жертвы вызывают большие ответы, которые летят жертве', 'בקשות קטנות עם כתובת מקור מזויפת של הקורבן גורמות לתשובות גדולות שנשלחות לקורבן']],
        [['IP address spoofing', 'Подмена IP-адреса', 'זיוף כתובת IP'], ['A forged source IP hides the attacker or impersonates a trusted host', 'Поддельный IP источника скрывает злоумышленника или выдаёт его за доверенный хост', 'כתובת מקור מזויפת מסתירה את התוקף או מתחזה למארח מהימן']],
        [['TCP SYN flood', 'TCP SYN flood', 'TCP SYN flood'], ['Many SYNs, the handshake is never finished — the server\'s half-open session table fills up', 'Много SYN без завершения рукопожатия — таблица полуоткрытых сессий сервера переполняется', 'הרבה SYN בלי לסיים את לחיצת היד — טבלת הסשנים הפתוחים-למחצה של השרת מתמלאת']],
        [['TCP reset / session hijacking', 'TCP reset / перехват сессии', 'TCP reset / חטיפת סשן'], ['A forged RST tears down a session; a hijacker takes over an authenticated one', 'Поддельный RST рвёт сессию; при перехвате злоумышленник захватывает уже аутентифицированную', 'RST מזויף מפיל סשן; בחטיפה התוקף משתלט על סשן שכבר עבר אימות']],
        [['UDP flood', 'UDP flood', 'UDP flood'], ['Floods random ports with UDP; UDP has no handshake to protect it', 'Засыпает случайные порты UDP-пакетами; у UDP нет рукопожатия для защиты', 'מציף פורטים אקראיים ב-UDP; ל-UDP אין לחיצת יד שתגן עליו']],
        [['ARP spoofing (cache poisoning)', 'ARP spoofing (отравление кэша)', 'ARP spoofing (הרעלת מטמון)'], ['Gratuitous ARP replies map the gateway IP to the attacker\'s MAC → man-in-the-middle', 'Самопроизвольные ARP-ответы связывают IP шлюза с MAC злоумышленника → «человек посередине»', 'תשובות ARP יזומות מקשרות את ה-IP של השער ל-MAC של התוקף → אדם-באמצע']],
        [['DNS attacks', 'Атаки на DNS', 'מתקפות DNS'], ['Open resolvers used for amplification, domain shadowing, DNS tunneling to sneak data out', 'Открытые резолверы для усиления, domain shadowing, DNS-туннели для вывода данных', 'שרתי resolver פתוחים להגברה, ‏domain shadowing, מנהור DNS להוצאת מידע']],
        [['DHCP spoofing / starvation', 'DHCP spoofing / истощение', 'DHCP spoofing / הרעבה'], ['A rogue DHCP server hands out a fake gateway or DNS; starvation empties the real pool first', 'Поддельный DHCP-сервер раздаёт ложный шлюз или DNS; истощение сначала опустошает настоящий пул', 'שרת DHCP זדוני מחלק שער או DNS מזויפים; הרעבה מרוקנת קודם את המאגר האמיתי']],
      ]),
      lTip(['Switch features from SRWE stop many of these: DHCP snooping, Dynamic ARP Inspection, port security.', 'Многое из этого останавливают функции коммутатора из SRWE: DHCP snooping, Dynamic ARP Inspection, port security.', 'הרבה מזה נעצר בעזרת יכולות מתג מ-SRWE: ‏DHCP snooping, ‏Dynamic ARP Inspection, ‏port security.'])),
    lSec(['Defense and cryptography', 'Защита и криптография', 'הגנה וקריפטוגרפיה'],
      lP(['Security goals are the CIA triad: Confidentiality (only authorised people read the data), Integrity (the data is not changed) and Availability (the service works when needed). Defense in depth layers VPNs, firewalls (ASA), IPS, email and web security appliances and AAA servers.',
        'Цели безопасности — триада CIA: конфиденциальность (данные читают только те, кому можно), целостность (данные не изменены) и доступность (сервис работает, когда нужен). Эшелонированная защита складывает слои: VPN, межсетевые экраны (ASA), IPS, защиту почты и веба, AAA-серверы.',
        'מטרות האבטחה הן משולש CIA: סודיות (רק מורשים קוראים את המידע), שלמות (המידע לא שונה) וזמינות (השירות עובד כשצריך). הגנה לעומק (Defense in depth) מצרפת שכבות: VPN, חומות אש (ASA), ‏IPS, מערכות אבטחת דואר ו-web ושרתי AAA.']),
      lTable([['Tool', 'Инструмент', 'כלי'], ['Gives', 'Даёт', 'נותן'], ['Examples', 'Примеры', 'דוגמאות']], [
        [['Hash', 'Хеш', 'גיבוב (Hash)'], ['Integrity — any change gives a different fingerprint', 'Целостность — любое изменение даёт другой отпечаток', 'שלמות — כל שינוי נותן טביעת אצבע אחרת'], 'SHA-256, SHA-384 (MD5, SHA-1 = legacy)'],
        ['HMAC', ['Integrity + authentication (hash with a secret key)', 'Целостность + аутентификация (хеш с секретным ключом)', 'שלמות + אימות (גיבוב עם מפתח סודי)'], 'HMAC-SHA-256'],
        [['Symmetric encryption', 'Симметричное шифрование', 'הצפנה סימטרית'], ['Confidentiality; one shared key, fast — for bulk data', 'Конфиденциальность; один общий ключ, быстро — для больших объёмов', 'סודיות; מפתח משותף אחד, מהיר — לכמויות גדולות של מידע'], 'AES (3DES, DES = legacy)'],
        [['Asymmetric encryption', 'Асимметричное шифрование', 'הצפנה אסימטרית'], ['Public/private key pair, slow — key exchange, digital signatures', 'Пара открытый/закрытый ключ, медленно — обмен ключами, цифровые подписи', 'זוג מפתחות ציבורי/פרטי, איטי — החלפת מפתחות, חתימות דיגיטליות'], 'RSA, ECC, Diffie-Hellman'],
      ]),
      lUL([
        ['Data encrypted with someone\'s public key can be read only with their private key (confidentiality). Data signed with your private key is verified with your public key (authentication, non-repudiation).', 'Данные, зашифрованные чьим-то открытым ключом, читаются только его закрытым ключом (конфиденциальность). Подписанное вашим закрытым ключом проверяется вашим открытым (аутентификация, неотказуемость).', 'מידע שהוצפן במפתח הציבורי של מישהו נקרא רק במפתח הפרטי שלו (סודיות). מידע שנחתם במפתח הפרטי שלך נבדק במפתח הציבורי שלך (אימות ואי-התכחשות).'],
        ['Diffie-Hellman lets two peers create the same secret key over an insecure network without ever sending it.', 'Diffie-Hellman позволяет двум сторонам получить одинаковый секретный ключ по незащищённой сети, не передавая его.', 'Diffie-Hellman מאפשר לשני צדדים ליצור את אותו מפתח סודי ברשת לא מאובטחת בלי לשלוח אותו אף פעם.'],
      ])),
  ],
  quiz: [
    lQ(['An attacker sends thousands of TCP SYN segments and never completes the handshake. What is this?', 'Злоумышленник шлёт тысячи TCP SYN и не завершает рукопожатие. Что это?', 'תוקף שולח אלפי מקטעי TCP SYN ולא משלים את לחיצת היד. מה זה?'],
      [['A TCP SYN flood (DoS)', 'TCP SYN flood (DoS)', 'TCP SYN flood ‏(DoS)'], ['A port redirection attack', 'Перенаправление портов', 'מתקפת הפניית פורטים'], ['ARP spoofing', 'ARP spoofing', 'ARP spoofing'], ['A buffer overflow', 'Переполнение буфера', 'גלישת חוצץ']], 0,
      ['Half-open sessions fill the server\'s table so real clients cannot connect.', 'Полуоткрытые сессии заполняют таблицу сервера, и настоящие клиенты не могут подключиться.', 'סשנים פתוחים-למחצה ממלאים את הטבלה של השרת, ולקוחות אמיתיים לא מצליחים להתחבר.']),
    lQ(['A PC sends gratuitous ARP replies saying the gateway\'s IP has its MAC. Which attack is it?', 'ПК рассылает самопроизвольные ARP-ответы, что IP шлюза имеет его MAC. Какая это атака?', 'מחשב שולח תשובות ARP יזומות שאומרות שה-IP של השער שייך ל-MAC שלו. איזו מתקפה זו?'],
      [['ARP cache poisoning (man-in-the-middle)', 'Отравление ARP-кэша («человек посередине»)', 'הרעלת מטמון ARP (אדם-באמצע)'], ['DHCP starvation', 'Истощение DHCP', 'הרעבת DHCP'], ['A UDP flood', 'UDP flood', 'UDP flood'], ['DNS tunneling', 'DNS-туннелирование', 'מנהור DNS']], 0,
      ['Hosts send their traffic to the attacker, who forwards it on and reads it.', 'Хосты отправляют трафик злоумышленнику, а он пересылает его дальше и читает.', 'המארחים שולחים את התעבורה לתוקף, והוא מעביר אותה הלאה וקורא אותה.']),
    lQ(['Which tool guarantees data integrity?', 'Что гарантирует целостность данных?', 'מה מבטיח את שלמות המידע?'],
      [['A hash such as SHA-256', 'Хеш, например SHA-256', 'גיבוב כמו SHA-256'], ['AES encryption', 'Шифрование AES', 'הצפנת AES'], ['A longer password', 'Более длинный пароль', 'סיסמה ארוכה יותר'], ['A VLAN', 'VLAN', 'VLAN']], 0,
      ['If one bit changes, the hash changes. AES gives confidentiality.', 'Изменится один бит — изменится хеш. AES даёт конфиденциальность.', 'אם סיבית אחת משתנה, הגיבוב משתנה. ‏AES נותן סודיות.']),
    lQ(['What does ransomware do?', 'Что делает вымогатель (ransomware)?', 'מה עושה כופרה?'],
      [['Encrypts the victim\'s data and demands payment', 'Шифрует данные жертвы и требует выкуп', 'מצפינה את המידע של הקורבן ודורשת תשלום'], ['Shows advertisements', 'Показывает рекламу', 'מציגה פרסומות'], ['Only scans ports', 'Только сканирует порты', 'רק סורקת פורטים'], ['Speeds up the network', 'Ускоряет сеть', 'מאיצה את הרשת']], 0,
      ['Good, tested, offline backups are the best defense.', 'Лучшая защита — проверенные резервные копии, хранящиеся отдельно (offline).', 'ההגנה הטובה ביותר היא גיבויים בדוקים שנשמרים בנפרד (offline).']),
    lQ(['Which kind of encryption uses the same key to encrypt and decrypt?', 'Какое шифрование использует один и тот же ключ для шифрования и расшифровки?', 'איזו הצפנה משתמשת באותו מפתח להצפנה ולפענוח?'],
      [['Symmetric (AES)', 'Симметричное (AES)', 'סימטרית (AES)'], ['Asymmetric (RSA)', 'Асимметричное (RSA)', 'אסימטרית (RSA)'], ['Hashing (SHA)', 'Хеширование (SHA)', 'גיבוב (SHA)'], ['Diffie-Hellman', 'Diffie-Hellman', 'Diffie-Hellman']], 0,
      ['Symmetric is fast, so VPNs use it for the actual data.', 'Симметричное быстрое, поэтому VPN использует его для самих данных.', 'סימטרית מהירה, ולכן VPN משתמש בה למידע עצמו.']),
    lQ(['A DDoS attack mainly targets which part of the CIA triad?', 'На какую часть триады CIA в основном направлена DDoS-атака?', 'על איזה חלק במשולש CIA מתקפת DDoS מכוונת בעיקר?'],
      [['Availability', 'Доступность', 'זמינות'], ['Confidentiality', 'Конфиденциальность', 'סודיות'], ['Integrity', 'Целостность', 'שלמות'], ['Accounting', 'Учёт', 'חשבונאות (Accounting)']], 0,
      ['The goal is that users cannot reach the service.', 'Цель — чтобы пользователи не могли получить сервис.', 'המטרה היא שמשתמשים לא יוכלו להגיע לשירות.']),
    lQ(['An attacker uses whois and DNS lookups to learn a company\'s IP ranges. This is…', 'Злоумышленник через whois и DNS узнаёт диапазоны IP компании. Это…', 'תוקף משתמש ב-whois ובשאילתות DNS כדי ללמוד את טווחי ה-IP של חברה. זה…'],
      [['Reconnaissance', 'разведка', 'איסוף מודיעין'], ['An access attack', 'атака доступа', 'מתקפת גישה'], ['A DoS attack', 'DoS-атака', 'מתקפת DoS'], ['Social engineering', 'социальная инженерия', 'הנדסה חברתית']], 0,
      ['Information queries come before ping sweeps and port scans.', 'Запросы открытой информации идут до ping sweep и сканирования портов.', 'שאילתות מידע באות לפני סריקות ping ופורטים.']),
    lQ(['What is the goal of a DHCP starvation attack?', 'Какова цель атаки истощения DHCP?', 'מה המטרה של מתקפת הרעבת DHCP?'],
      [['Use up all addresses in the pool so a rogue server can answer clients', 'Занять все адреса пула, чтобы клиентам отвечал поддельный сервер', 'לנצל את כל הכתובות במאגר כדי ששרת זדוני יענה ללקוחות'], ['Crash the router\'s CPU', 'Перегрузить CPU роутера', 'להפיל את ה-CPU של הנתב'], ['Steal the enable password', 'Украсть пароль enable', 'לגנוב את סיסמת ה-enable'], ['Encrypt the DHCP database', 'Зашифровать базу DHCP', 'להצפין את מסד הנתונים של DHCP']], 0,
      ['Starvation is usually step one of DHCP spoofing. DHCP snooping stops both.', 'Истощение — обычно первый шаг DHCP spoofing. DHCP snooping останавливает оба.', 'הרעבה היא בדרך כלל השלב הראשון של DHCP spoofing. ‏DHCP snooping עוצר את שניהם.']),
    lQ(['An employee clicks a link in a fake "IT support" email and types their password. What attack is this?', 'Сотрудник нажал ссылку в поддельном письме «от IT-поддержки» и ввёл пароль. Что это за атака?', 'עובד לחץ על קישור במייל מזויף "מהתמיכה הטכנית" והקליד את הסיסמה שלו. איזו מתקפה זו?'],
      [['Phishing (social engineering)', 'Фишинг (социальная инженерия)', 'פישינג (הנדסה חברתית)'], ['A worm', 'Червь', 'תולעת'], ['A SYN flood', 'SYN flood', 'SYN flood'], ['Tailgating', 'Проход «хвостом»', 'השתחלות (Tailgating)']], 0,
      ['User training and MFA are the main defenses.', 'Главная защита — обучение пользователей и MFA.', 'ההגנות העיקריות הן הדרכת משתמשים ו-MFA.']),
  ],
});

// ---------------------------------------------------------------
// Схема для генератора размещения ACL: R1 — R2 — R3, LAN на краях.
function e2AclTopo(left, right) {
  return left + '/24 ── G0/0/0 [R1] S0/1/0 ── S0/1/0 [R2] S0/1/1 ── S0/1/0 [R3] G0/0/0 ── ' + right + '/24';
}

lessonDef({
  id: 'ensa04', topic: null, drill: 'acl', minutes: 16, genInQuiz: 2,
  title: T('ACL concepts', 'Принципы ACL', 'עקרונות ACL'),
  goal: T('What an ACL is, how a router checks ACEs top-down with an implicit deny, inbound vs outbound, wildcard masks for hosts and ranges, standard vs extended, numbered vs named, and where to place each type.',
    'Что такое ACL, как роутер проверяет ACE сверху вниз и неявный запрет, входящие и исходящие ACL, wildcard-маски для хостов и диапазонов, стандартные и расширенные, нумерованные и именованные, и где размещать каждый тип.',
    'מה זה ACL, איך נתב בודק ACE מלמעלה למטה עם דחייה מרומזת, ‏inbound מול outbound, מסכות wildcard למארחים ולטווחים, סטנדרטי מול מורחב, ממוספר מול עם שם, והיכן ממקמים כל סוג.'),
  sections: [
    lSec(['What an ACL is', 'Что такое ACL', 'מה זה ACL'],
      lP(['An access control list (ACL) is an ordered list of permit and deny statements called access control entries (ACEs). Applied to an interface, it filters packets. ACLs are also used to select traffic: which addresses NAT translates, which traffic QoS prioritises, who may open a VTY session, which routes are advertised.',
        'Список управления доступом (ACL) — упорядоченный список строк permit и deny, которые называются ACE (access control entry). Применённый к интерфейсу, он фильтрует пакеты. Ещё ACL используются, чтобы выбрать трафик: какие адреса транслирует NAT, какой трафик приоритизирует QoS, кто может открыть VTY-сессию, какие маршруты объявлять.',
        'רשימת בקרת גישה (ACL) היא רשימה מסודרת של שורות permit ו-deny שנקראות ACE ‏(access control entry). כשמחילים אותה על ממשק, היא מסננת חבילות. משתמשים ב-ACL גם כדי לבחור תעבורה: אילו כתובות NAT מתרגם, לאיזו תעבורה QoS נותן עדיפות, מי יכול לפתוח סשן VTY, אילו נתיבים לפרסם.']),
      lUL([
        ['Standard ACLs filter at Layer 3 on the source IPv4 address only.', 'Стандартные ACL фильтруют на 3-м уровне только по IPv4-адресу источника.', 'ACL סטנדרטי מסנן בשכבה 3 רק לפי כתובת ה-IPv4 של המקור.'],
        ['Extended ACLs filter on Layers 3 and 4: protocol, source and destination addresses, TCP/UDP ports.', 'Расширенные ACL фильтруют на 3-м и 4-м уровнях: протокол, адреса источника и получателя, порты TCP/UDP.', 'ACL מורחב מסנן בשכבות 3 ו-4: פרוטוקול, כתובות מקור ויעד, פורטים של TCP/UDP.'],
      ])),
    lSec(['How a router processes an ACL', 'Как роутер обрабатывает ACL', 'איך נתב מעבד ACL'],
      lUL([
        ['ACEs are checked from the top down. The first match decides (permit or deny) and the rest are skipped.', 'ACE проверяются сверху вниз. Первое совпадение решает (permit или deny), остальные пропускаются.', 'ה-ACE נבדקים מלמעלה למטה. ההתאמה הראשונה מכריעה (permit או deny), והשאר מדולגים.'],
        ['Every ACL ends with an invisible "deny any" (the implicit deny). An ACL with only deny lines blocks everything — add a permit.', 'Каждый ACL заканчивается невидимым «deny any» (неявный запрет). ACL только из строк deny блокирует всё — нужен хотя бы один permit.', 'כל ACL מסתיים ב-"deny any" בלתי נראה (הדחייה המרומזת). ‏ACL שיש בו רק שורות deny חוסם הכול — צריך להוסיף permit.'],
        ['Put specific ACEs before general ones, or the general one catches the traffic first.', 'Конкретные ACE ставьте выше общих, иначе общий перехватит трафик первым.', 'שמים ACE ספציפיים לפני כלליים, אחרת הכללי תופס את התעבורה קודם.'],
        ['One ACL per interface, per direction, per protocol (IPv4 / IPv6).', 'Один ACL на интерфейс, на направление, на протокол (IPv4 / IPv6).', '‏ACL אחד לכל ממשק, לכל כיוון, לכל פרוטוקול (IPv4 / IPv6).'],
        ['Inbound — checked as the packet arrives, before routing (dropping early saves work). Outbound — checked after routing, just before the packet leaves.', 'Входящий (inbound) — проверка при приходе пакета, до маршрутизации (раннее отбрасывание экономит работу). Исходящий (outbound) — после маршрутизации, перед выходом пакета.', 'Inbound — נבדק כשהחבילה מגיעה, לפני הניתוב (זריקה מוקדמת חוסכת עבודה). ‏Outbound — נבדק אחרי הניתוב, רגע לפני שהחבילה יוצאת.'],
      ])),
    lSec(['Wildcard masks in ACLs', 'Wildcard-маски в ACL', 'מסכות wildcard ב-ACL'],
      lP(['A wildcard bit 0 means "this bit must match", 1 means "ignore this bit". For a subnet: wildcard = 255.255.255.255 − subnet mask. A block of addresses is matched by its first address plus the wildcard of the block size.',
        'Бит wildcard 0 — «бит должен совпасть», 1 — «бит игнорировать». Для подсети: wildcard = 255.255.255.255 − маска. Блок адресов задаётся первым адресом и wildcard размера блока.',
        'סיבית wildcard ‏0 אומרת "הסיבית חייבת להתאים", ‏1 אומרת "להתעלם מהסיבית". לתת-רשת: wildcard = ‏255.255.255.255 פחות המסכה. בלוק כתובות מתואר בכתובת הראשונה שלו וב-wildcard של גודל הבלוק.']),
      lTable([['Address + wildcard', 'Адрес + wildcard', 'כתובת + wildcard'], ['Matches', 'Совпадает с', 'מתאים ל-']], [
        ['192.168.1.10 0.0.0.0 = host 192.168.1.10', ['Only that host', 'Только этот хост', 'רק המארח הזה']],
        ['192.168.1.0 0.0.0.255', '192.168.1.0 – 192.168.1.255 (/24)'],
        ['192.168.16.0 0.0.15.255', '192.168.16.0 – 192.168.31.255 (/20)'],
        ['10.1.4.0 0.0.3.255', '10.1.4.0 – 10.1.7.255 (/22)'],
        ['0.0.0.0 255.255.255.255 = any', ['Every address', 'Любой адрес', 'כל כתובת']],
      ]),
      lTip(['The keywords "host" and "any" are shortcuts: host X = X 0.0.0.0, any = 0.0.0.0 255.255.255.255.', 'Ключевые слова «host» и «any» — сокращения: host X = X 0.0.0.0, any = 0.0.0.0 255.255.255.255.', 'מילות המפתח "host" ו-"any" הן קיצורים: host X = X 0.0.0.0, ‏any = 0.0.0.0 255.255.255.255.'])),
    lSec(['Types of IPv4 ACLs', 'Типы ACL для IPv4', 'סוגי ACL ל-IPv4'],
      lTable(['', ['Standard', 'Стандартный', 'סטנדרטי'], ['Extended', 'Расширенный', 'מורחב']], [
        [['Matches', 'Проверяет', 'בודק'], ['Source IPv4 address', 'IPv4-адрес источника', 'כתובת IPv4 של המקור'], ['Protocol, source, destination, ports', 'Протокол, источник, получатель, порты', 'פרוטוקול, מקור, יעד, פורטים']],
        [['Numbers', 'Номера', 'מספרים'], '1–99, 1300–1999', '100–199, 2000–2699'],
        [['Named form', 'Именованная форма', 'צורה עם שם'], 'ip access-list standard NAME', 'ip access-list extended NAME'],
        [['Place it', 'Размещать', 'היכן למקם'], ['Close to the destination', 'Ближе к получателю', 'קרוב ליעד'], ['Close to the source', 'Ближе к источнику', 'קרוב למקור']],
      ]),
      lP(['Named ACLs describe their purpose (BLOCK-GUESTS is clearer than 37) and let you insert or delete single lines by sequence number. IPv6 ACLs are always named.',
        'Именованные ACL описывают своё назначение (BLOCK-GUESTS понятнее, чем 37) и позволяют вставлять или удалять отдельные строки по порядковому номеру. ACL для IPv6 всегда именованные.',
        'ACL עם שם מתאר את המטרה שלו (BLOCK-GUESTS ברור יותר מ-37) ומאפשר להכניס או למחוק שורות בודדות לפי מספר רצף. ‏ACL של IPv6 תמיד עם שם.'])),
    lSec(['Where to place an ACL', 'Где размещать ACL', 'היכן ממקמים ACL'],
      lCode(e2AclTopo('192.168.10.0', '192.168.30.0'), ['Task: hosts in 192.168.10.0/24 must not reach 192.168.30.0/24; everything else works', 'Задача: хосты 192.168.10.0/24 не должны попадать в 192.168.30.0/24; всё остальное работает', 'המשימה: מארחים ב-192.168.10.0/24 לא יגיעו ל-192.168.30.0/24; כל השאר עובד']),
      lUL([
        ['Extended ACL → R1, G0/0/0 inbound. It matches source AND destination, so it can drop the traffic right where it enters, before it uses the WAN.', 'Расширенный ACL → R1, G0/0/0 на вход. Он проверяет и источник, и получателя, поэтому может отбросить трафик сразу на входе, до того как тот пойдёт по WAN.', 'ACL מורחב → R1, ‏G0/0/0 בכניסה (in). הוא בודק גם מקור וגם יעד, ולכן יכול לזרוק את התעבורה מיד כשהיא נכנסת, לפני שהיא עוברת ב-WAN.'],
        ['Standard ACL → R3, G0/0/0 outbound. It sees only the source; on R1 it would block 192.168.10.0/24 from EVERY network.', 'Стандартный ACL → R3, G0/0/0 на выход. Он видит только источник; на R1 он заблокировал бы 192.168.10.0/24 от ВСЕХ сетей.', 'ACL סטנדרטי → R3, ‏G0/0/0 ביציאה (out). הוא רואה רק את המקור; ב-R1 הוא היה חוסם את 192.168.10.0/24 מכל הרשתות.'],
        ['Real life also matters: who controls the router, the bandwidth of the links, and how easy the ACL is to manage.', 'В жизни важно и другое: кто управляет роутером, пропускная способность каналов, насколько удобно сопровождать ACL.', 'בחיים האמיתיים חשוב גם: מי שולט בנתב, רוחב הפס של הקישורים, וכמה קל לתחזק את ה-ACL.'],
      ])),
  ],
  quiz: [
    lQ(['How does a router process the ACEs of an ACL?', 'Как роутер обрабатывает строки ACL?', 'איך נתב מעבד את שורות ה-ACL?'],
      [['Top-down; the first match is applied and the rest are skipped', 'Сверху вниз; применяется первое совпадение, остальные пропускаются', 'מלמעלה למטה; ההתאמה הראשונה חלה והשאר מדולגות'], ['All ACEs; the last match wins', 'Все строки; побеждает последнее совпадение', 'כל השורות; ההתאמה האחרונה מנצחת'], ['The most specific ACE wins', 'Побеждает самая точная строка', 'השורה הכי ספציפית מנצחת'], ['Deny lines first, then permit lines', 'Сначала deny, потом permit', 'קודם שורות deny ואז permit']], 0,
      ['That is why the order of the lines matters.', 'Поэтому порядок строк важен.', 'לכן סדר השורות חשוב.']),
    lQ(['What is at the end of every ACL?', 'Что стоит в конце каждого ACL?', 'מה יש בסוף כל ACL?'],
      [['An implicit deny any', 'Неявный deny any', 'deny any מרומז'], ['An implicit permit any', 'Неявный permit any', 'permit any מרומז'], ['A remark', 'Комментарий (remark)', 'הערה (remark)'], ['Nothing', 'Ничего', 'כלום']], 0,
      ['Traffic that matches no line is dropped.', 'Трафик, не совпавший ни с одной строкой, отбрасывается.', 'תעבורה שלא התאימה לאף שורה נזרקת.']),
    lQ(['What does a 0 bit in a wildcard mask mean?', 'Что означает бит 0 в wildcard-маске?', 'מה המשמעות של סיבית 0 במסכת wildcard?'],
      [['The bit must match', 'Бит должен совпасть', 'הסיבית חייבת להתאים'], ['Ignore the bit', 'Бит игнорируется', 'להתעלם מהסיבית'], ['The bit is the host part', 'Это бит хостовой части', 'זו סיבית של חלק המארח'], ['The bit is always 0 in the address', 'В адресе этот бит всегда 0', 'בכתובת הסיבית הזו תמיד 0']], 0,
      ['0 = check, 1 = ignore — the opposite of a subnet mask.', '0 — проверять, 1 — игнорировать; наоборот относительно маски.', '0 = לבדוק, 1 = להתעלם — ההפך ממסכת רשת.']),
    lQ(['An ACL contains only deny statements and is applied inbound. What happens?', 'В ACL только строки deny, он применён на вход. Что будет?', 'ב-ACL יש רק שורות deny והוא מוחל בכניסה. מה יקרה?'],
      [['All traffic on that interface is blocked', 'Весь трафик на этом интерфейсе блокируется', 'כל התעבורה בממשק הזה נחסמת'], ['Only the listed traffic is blocked', 'Блокируется только указанный трафик', 'רק התעבורה שברשימה נחסמת'], ['The ACL is ignored', 'ACL игнорируется', 'ה-ACL לא נלקח בחשבון'], ['The router rejects the configuration', 'Роутер не примет конфигурацию', 'הנתב דוחה את התצורה']], 0,
      ['The implicit deny catches everything the deny lines did not.', 'Неявный запрет поймает всё, что не поймали строки deny.', 'הדחייה המרומזת תופסת את כל מה ששורות ה-deny לא תפסו.']),
    lQ(['How many IPv4 ACLs can be applied to one interface?', 'Сколько ACL для IPv4 можно применить к одному интерфейсу?', 'כמה ACL של IPv4 אפשר להחיל על ממשק אחד?'],
      [['One inbound and one outbound', 'Один на вход и один на выход', 'אחד בכניסה ואחד ביציאה'], ['Only one in total', 'Только один всего', 'רק אחד בסך הכול'], ['As many as you want', 'Сколько угодно', 'כמה שרוצים'], ['One standard and one extended per direction', 'Один стандартный и один расширенный на направление', 'סטנדרטי אחד ומורחב אחד לכל כיוון']], 0,
      ['One per interface, per direction, per protocol.', 'Один на интерфейс, на направление, на протокол.', 'אחד לכל ממשק, לכל כיוון, לכל פרוטוקול.']),
    lQ(['Where should an extended ACL be placed?', 'Где размещать расширенный ACL?', 'היכן ממקמים ACL מורחב?'],
      [['As close to the source as possible', 'Как можно ближе к источнику', 'קרוב ככל האפשר למקור'], ['As close to the destination as possible', 'Как можно ближе к получателю', 'קרוב ככל האפשר ליעד'], ['Only on the core router', 'Только на роутере ядра', 'רק בנתב הליבה'], ['On every router', 'На каждом роутере', 'בכל נתב']], 0,
      ['It matches the destination too, so it can drop unwanted traffic early.', 'Он учитывает и получателя, поэтому может отбросить ненужный трафик рано.', 'הוא בודק גם את היעד, ולכן יכול לזרוק תעבורה לא רצויה מוקדם.']),
    lQ(['When is an inbound ACL checked?', 'Когда проверяется входящий ACL?', 'מתי נבדק ACL בכניסה (inbound)?'],
      [['When the packet arrives, before the routing table lookup', 'Когда пакет пришёл, до поиска в таблице маршрутизации', 'כשהחבילה מגיעה, לפני החיפוש בטבלת הניתוב'], ['After routing, before the packet leaves', 'После маршрутизации, перед выходом пакета', 'אחרי הניתוב, לפני שהחבילה יוצאת'], ['Only for packets created by the router', 'Только для пакетов самого роутера', 'רק לחבילות שהנתב עצמו יוצר'], ['Once per minute', 'Раз в минуту', 'פעם בדקה']], 0,
      ['Outbound ACLs are checked after routing.', 'Исходящие ACL проверяются после маршрутизации.', 'ACL ביציאה נבדק אחרי הניתוב.']),
    lQ(['Which address and wildcard equal the keyword "any"?', 'Какой адрес и wildcard равны ключевому слову «any»?', 'איזו כתובת ו-wildcard שוות למילת המפתח "any"?'],
      ['0.0.0.0 255.255.255.255', '255.255.255.255 0.0.0.0', '0.0.0.0 0.0.0.0', '255.255.255.255 255.255.255.255'], 0,
      ['All 32 bits are ignored, so every address matches.', 'Все 32 бита игнорируются — подходит любой адрес.', 'כל 32 הסיביות מתעלמות, ולכן כל כתובת מתאימה.']),
    lQ(['Why is a standard ACL placed close to the destination?', 'Почему стандартный ACL ставят ближе к получателю?', 'למה ממקמים ACL סטנדרטי קרוב ליעד?'],
      [['It sees only the source; near the source it would block that source from everything', 'Он видит только источник; у источника он заблокировал бы этот источник от всего', 'הוא רואה רק את המקור; ליד המקור הוא היה חוסם את המקור הזה מהכול'], ['Standard ACLs cannot be applied inbound', 'Стандартные ACL нельзя применять на вход', 'אי אפשר להחיל ACL סטנדרטי בכניסה'], ['It saves more bandwidth there', 'Там он экономит больше полосы', 'שם הוא חוסך יותר רוחב פס'], ['The destination router is always faster', 'Роутер получателя всегда быстрее', 'נתב היעד תמיד מהיר יותר']], 0,
      ['Extended ACLs do not have this problem, so they go near the source.', 'У расширенных ACL этой проблемы нет, их ставят у источника.', 'ל-ACL מורחב אין את הבעיה הזו, ולכן ממקמים אותו ליד המקור.']),
  ],
  gen: [
    function genAclNumber(rng) {
      const r = rng.pick([[1, 99, 0], [1300, 1999, 0], [100, 199, 1], [2000, 2699, 1]]), n = rng.int(r[0], r[1]);
      const std = T('Standard IPv4 ACL', 'Стандартный ACL для IPv4', 'ACL סטנדרטי ל-IPv4');
      const ext = T('Extended IPv4 ACL', 'Расширенный ACL для IPv4', 'ACL מורחב ל-IPv4');
      const v6 = T('IPv6 ACL', 'ACL для IPv6', 'ACL ל-IPv6');
      return lGen(T('What type of ACL is "access-list ' + n + '"?', 'Какой тип ACL у «access-list ' + n + '»?', 'מאיזה סוג ה-ACL ‏"access-list ' + n + '"?'),
        r[2] ? ext : std, [r[2] ? std : ext, v6],
        T('Standard: 1–99 and 1300–1999. Extended: 100–199 and 2000–2699. IPv6 ACLs are always named.', 'Стандартные: 1–99 и 1300–1999. Расширенные: 100–199 и 2000–2699. ACL для IPv6 всегда именованные.', 'סטנדרטי: 1–99 ו-1300–1999. מורחב: 100–199 ו-2000–2699. ‏ACL של IPv6 תמיד עם שם.'));
    },
    function genAceMatch(rng) {
      const len = rng.int(16, 29), size = Math.pow(2, 32 - len), net = netOf(lRandHostIp(rng), len), last = (net + size - 1) >>> 0;
      const inside = () => intToIp(net + rng.int(0, size - 1));
      const outside = () => {
        const k = rng.int(0, 2);
        if (k === 0) return intToIp(net - rng.int(1, Math.min(size, 64)));
        if (k === 1) return intToIp(last + rng.int(1, Math.min(size, 64)));
        return intToIp(((net ^ (1 << (32 - len + rng.int(0, Math.min(8, len) - 1)))) + rng.int(0, size - 1)) >>> 0);
      };
      const not = rng.chance(0.35);
      const pickN = (f, k) => { const s = new Set(); while (s.size < k) s.add(f()); return [...s]; };
      const right = not ? outside() : inside(), wrong = pickN(not ? inside : outside, 3);
      const ace = 'access-list ' + rng.int(1, 99) + ' ' + rng.pick(['permit', 'deny']) + ' ' + intToIp(net) + ' ' + lWild(len);
      const range = intToIp(net) + ' – ' + intToIp(last);
      const q = lGen(not ? T('Which source address does NOT match this ACE?', 'Какой адрес источника НЕ совпадает с этой строкой ACL?', 'איזו כתובת מקור לא מתאימה לשורת ה-ACL הזו?') : T('Which source address matches this ACE?', 'Какой адрес источника совпадает с этой строкой ACL?', 'איזו כתובת מקור מתאימה לשורת ה-ACL הזו?'),
        right, wrong,
        T('Wildcard ' + lWild(len) + ' = /' + len + ' → the ACE matches ' + range + '.', 'Wildcard ' + lWild(len) + ' = /' + len + ' → строка совпадает с ' + range + '.', 'Wildcard ' + lWild(len) + ' = ‎/' + len + ' → השורה מתאימה ל-' + range + '.'));
      q.code = ace;
      return q;
    },
    function genAclRange(rng) {
      const len = rng.int(16, 30), size = Math.pow(2, 32 - len), net = netOf(lRandHostIp(rng), len), last = (net + size - 1) >>> 0;
      const a = intToIp(net), right = a + ' ' + lWild(len);
      return lGen(T('Which address and wildcard match exactly ' + a + ' – ' + intToIp(last) + '?', 'Какой адрес и wildcard задают ровно диапазон ' + a + ' – ' + intToIp(last) + '?', 'איזו כתובת ו-wildcard מתאימות בדיוק לטווח ' + a + ' – ' + intToIp(last) + '?'),
        right, rng.shuffle([a + ' ' + lenToMask(len), a + ' ' + lWild(len - 1), a + ' ' + lWild(len + 1), intToIp(net + size) + ' ' + lWild(len)]),
        T(size + ' addresses = /' + len + ' → wildcard ' + lWild(len) + ', starting at the first address of the block.', size + ' адресов = /' + len + ' → wildcard ' + lWild(len) + ', начиная с первого адреса блока.', size + ' כתובות = ‎/' + len + ' → wildcard ' + lWild(len) + ', החל מהכתובת הראשונה של הבלוק.'));
    },
    function genAclPlacement(rng) {
      const used = new Set(), mk = () => e2Uniq(used, () => intToIp(netOf(lRandHostIp(rng), 24)));
      const left = mk(), right = mk(), fromLeft = rng.chance(0.5), ext = rng.chance(0.5);
      const src = fromLeft ? left : right, dst = fromLeft ? right : left;
      const sR = fromLeft ? 'R1' : 'R3', dR = fromLeft ? 'R3' : 'R1';
      const opt = (r, ifc, inb) => T(r + ', ' + ifc + (inb ? ' inbound' : ' outbound'), r + ', ' + ifc + (inb ? ' на вход (in)' : ' на выход (out)'), r + ', ' + ifc + (inb ? ' בכניסה (in)' : ' ביציאה (out)'));
      const nearSrc = opt(sR, 'G0/0/0', true), nearDst = opt(dR, 'G0/0/0', false);
      const mid = opt('R2', fromLeft ? 'S0/1/0' : 'S0/1/1', true), backSrc = opt(sR, 'G0/0/0', false), backDst = opt(dR, 'G0/0/0', true);
      const kind = ext ? T('extended', 'расширенного', 'מורחב') : T('standard', 'стандартного', 'סטנדרטי');
      const q = lGen(T('Hosts in ' + src + '/24 must not reach ' + dst + '/24; all other traffic must still work. Where is the best place for a ' + kind.en + ' ACL?', 'Хосты ' + src + '/24 не должны попадать в ' + dst + '/24; весь остальной трафик должен работать. Где лучше всего разместить ACL ' + kind.ru + ' типа?', 'מארחים ב-' + src + '/24 לא יגיעו ל-' + dst + '/24; כל שאר התעבורה חייבת לעבוד. היכן המקום הטוב ביותר ל-ACL ' + kind.he + '?'),
        ext ? nearSrc : nearDst, ext ? rng.shuffle([nearDst, mid, backSrc]) : rng.shuffle([nearSrc, mid, backDst]),
        ext ? T('An extended ACL matches source and destination, so it goes close to the source: ' + sR + ' G0/0/0 inbound — the traffic is dropped before it crosses the WAN.', 'Расширенный ACL проверяет источник и получателя, поэтому ставится у источника: ' + sR + ' G0/0/0 на вход — трафик отбрасывается до WAN.', 'ACL מורחב בודק מקור ויעד, ולכן הוא ליד המקור: ' + sR + ' ‏G0/0/0 בכניסה — התעבורה נזרקת לפני שהיא עוברת ב-WAN.')
          : T('A standard ACL sees only the source, so it goes close to the destination: ' + dR + ' G0/0/0 outbound. Near the source it would cut ' + src + '/24 off from every network.', 'Стандартный ACL видит только источник, поэтому ставится у получателя: ' + dR + ' G0/0/0 на выход. У источника он отрезал бы ' + src + '/24 от всех сетей.', 'ACL סטנדרטי רואה רק את המקור, ולכן הוא ליד היעד: ' + dR + ' ‏G0/0/0 ביציאה. ליד המקור הוא היה מנתק את ' + src + '/24 מכל הרשתות.'));
      q.code = e2AclTopo(left, right);
      return q;
    },
  ],
});

// ---------------------------------------------------------------
const E2_SERVICES = [
  { en: 'web (HTTP)', ru: 'веб (HTTP)', he: 'גלישה (HTTP)', p: 'tcp', port: 80 },
  { en: 'secure web (HTTPS)', ru: 'защищённый веб (HTTPS)', he: 'גלישה מאובטחת (HTTPS)', p: 'tcp', port: 443 },
  { en: 'SSH', ru: 'SSH', he: 'SSH', p: 'tcp', port: 22 },
  { en: 'Telnet', ru: 'Telnet', he: 'Telnet', p: 'tcp', port: 23 },
  { en: 'FTP', ru: 'FTP', he: 'FTP', p: 'tcp', port: 21 },
  { en: 'SMTP e-mail', ru: 'почту SMTP', he: 'דואר SMTP', p: 'tcp', port: 25 },
  { en: 'TFTP', ru: 'TFTP', he: 'TFTP', p: 'udp', port: 69 },
  { en: 'SNMP', ru: 'SNMP', he: 'SNMP', p: 'udp', port: 161 },
  { en: 'NTP', ru: 'NTP', he: 'NTP', p: 'udp', port: 123 },
];

lessonDef({
  id: 'ensa05', topic: null, drill: 'acl', minutes: 18, genInQuiz: 2,
  title: T('Configuring IPv4 ACLs', 'Настройка ACL для IPv4', 'הגדרת ACL ל-IPv4'),
  goal: T('Write numbered and named standard and extended ACLs, apply them to interfaces and VTY lines, edit them by sequence number and verify them with show access-lists.',
    'Писать нумерованные и именованные стандартные и расширенные ACL, применять их к интерфейсам и линиям VTY, править по порядковым номерам и проверять командой show access-lists.',
    'לכתוב ACL סטנדרטיים ומורחבים, ממוספרים ועם שם, להחיל אותם על ממשקים ועל קווי VTY, לערוך אותם לפי מספרי רצף ולבדוק אותם עם show access-lists.'),
  sections: [
    lSec(['Numbered standard ACL', 'Нумерованный стандартный ACL', 'ACL סטנדרטי ממוספר'],
      lCode('R1(config)# access-list 10 remark Only the 192.168.10.0/24 LAN may go out\nR1(config)# access-list 10 permit 192.168.10.0 0.0.0.255\nR1(config)# interface g0/0/1\nR1(config-if)# ip access-group 10 out',
        ['Everything else from other networks is stopped by the implicit deny', 'Всё остальное из других сетей останавливает неявный запрет', 'כל השאר מרשתות אחרות נעצר בדחייה המרומזת']),
      lUL([
        ['access-list <number> permit|deny <source> [wildcard] — a single host can be written as "host X" or just "X".', 'access-list <номер> permit|deny <источник> [wildcard] — один хост можно записать «host X» или просто «X».', 'access-list <מספר> permit|deny <מקור> [wildcard] — מארח בודד אפשר לכתוב "host X" או פשוט "X".'],
        ['ip access-group <ACL> in|out applies it to an interface. Without this command the ACL does nothing.', 'ip access-group <ACL> in|out применяет ACL к интерфейсу. Без этой команды ACL ничего не делает.', 'ip access-group <ACL> in|out מחיל אותו על ממשק. בלי הפקודה הזו ה-ACL לא עושה כלום.'],
        ['remark adds a comment line. "no access-list 10" deletes the WHOLE list; "no ip access-group 10 out" only detaches it.', 'remark добавляет комментарий. «no access-list 10» удаляет ВЕСЬ список; «no ip access-group 10 out» только отвязывает его.', 'remark מוסיף שורת הערה. ‏"no access-list 10" מוחק את כל הרשימה; ‏"no ip access-group 10 out" רק מנתק אותה מהממשק.'],
      ])),
    lSec(['Named ACLs and editing', 'Именованные ACL и редактирование', 'ACL עם שם ועריכה'],
      lCode('R1(config)# ip access-list standard NO-ACCESS\nR1(config-std-nacl)# deny host 192.168.11.10\nR1(config-std-nacl)# permit any\nR1(config-std-nacl)# exit\nR1(config)# interface g0/0/0\nR1(config-if)# ip access-group NO-ACCESS out\n! edit later: insert line 15, delete line 10\nR1(config)# ip access-list standard NO-ACCESS\nR1(config-std-nacl)# 15 deny host 192.168.11.11\nR1(config-std-nacl)# no 10'),
      lUL([
        ['Lines get sequence numbers 10, 20, 30… — the gaps let you insert a new line in the right place.', 'Строки получают номера 10, 20, 30… — промежутки позволяют вставить новую строку в нужное место.', 'השורות מקבלות מספרי רצף 10, ‏20, ‏30… — הרווחים מאפשרים להכניס שורה חדשה במקום הנכון.'],
        ['A numbered ACL can be edited the same way: ip access-list standard 10.', 'Нумерованный ACL редактируется так же: ip access-list standard 10.', 'ACL ממוספר עורכים באותה דרך: ip access-list standard 10.'],
        ['Another way: copy the ACL into a text editor, fix it, remove the old one and paste the new one.', 'Другой способ: скопировать ACL в текстовый редактор, исправить, удалить старый и вставить новый.', 'דרך נוספת: מעתיקים את ה-ACL לעורך טקסט, מתקנים, מוחקים את הישן ומדביקים את החדש.'],
      ])),
    lSec(['Securing VTY access', 'Защита доступа по VTY', 'אבטחת גישת VTY'],
      lCode('R1(config)# ip access-list standard ADMIN-HOST\nR1(config-std-nacl)# remark Only the admin PC may use SSH\nR1(config-std-nacl)# permit host 192.168.10.10\nR1(config-std-nacl)# exit\nR1(config)# line vty 0 4\nR1(config-line)# transport input ssh\nR1(config-line)# access-class ADMIN-HOST in'),
      lTip(['Interfaces use ip access-group; lines use access-class. Apply the same ACL to all VTY lines.', 'На интерфейсах — ip access-group; на линиях — access-class. Применяйте одинаковый ACL ко всем линиям VTY.', 'על ממשקים — ip access-group; על קווים — access-class. מחילים את אותו ACL על כל קווי ה-VTY.'])),
    lSec(['Extended ACLs', 'Расширенные ACL', 'ACL מורחבים'],
      lCode('R1(config)# access-list 110 permit tcp 192.168.10.0 0.0.0.255 any eq www\nR1(config)# access-list 110 permit tcp 192.168.10.0 0.0.0.255 any eq 443\n\nR1(config)# ip access-list extended SURFING\nR1(config-ext-nacl)# permit tcp 192.168.10.0 0.0.0.255 any eq 80\nR1(config-ext-nacl)# permit tcp 192.168.10.0 0.0.0.255 any eq 443\nR1(config)# ip access-list extended BROWSING\nR1(config-ext-nacl)# permit tcp any 192.168.10.0 0.0.0.255 established\nR1(config)# interface g0/0/0\nR1(config-if)# ip access-group SURFING in\nR1(config-if)# ip access-group BROWSING out'),
      lUL([
        ['Order: permit|deny <protocol> <source> [port] <destination> [port]. Protocol: ip, tcp, udp, icmp, ospf…', 'Порядок: permit|deny <протокол> <источник> [порт] <получатель> [порт]. Протокол: ip, tcp, udp, icmp, ospf…', 'הסדר: permit|deny <פרוטוקול> <מקור> [פורט] <יעד> [פורט]. פרוטוקול: ip, ‏tcp, ‏udp, ‏icmp, ‏ospf…'],
        ['A port belongs to the address written just before it: "any eq 80" after the destination = destination port 80.', 'Порт относится к адресу, который стоит перед ним: «any eq 80» после получателя = порт получателя 80.', 'פורט שייך לכתובת שלפניו: "any eq 80" אחרי היעד = פורט יעד 80.'],
        ['Operators: eq, neq, gt, lt, range. Names work too: www (80), ftp (21), telnet (23), smtp (25), domain (53).', 'Операторы: eq, neq, gt, lt, range. Можно и имена: www (80), ftp (21), telnet (23), smtp (25), domain (53).', 'אופרטורים: eq, ‏neq, ‏gt, ‏lt, ‏range. אפשר גם שמות: www ‏(80), ‏ftp ‏(21), ‏telnet ‏(23), ‏smtp ‏(25), ‏domain ‏(53).'],
        ['established matches TCP segments with ACK or RST set — return traffic of sessions that started inside.', 'established совпадает с TCP-сегментами с флагом ACK или RST — это ответный трафик сессий, начатых изнутри.', 'established מתאים למקטעי TCP עם דגל ACK או RST — תעבורה חוזרת של סשנים שהתחילו מבפנים.'],
      ])),
    lSec(['Verification', 'Проверка', 'בדיקה'],
      lCode('R1# show access-lists\nStandard IP access list 10\n    10 permit 192.168.10.0, wildcard bits 0.0.0.255 (12 matches)\nExtended IP access list SURFING\n    10 permit tcp 192.168.10.0 0.0.0.255 any eq www (31 matches)\n    20 permit tcp 192.168.10.0 0.0.0.255 any eq 443 (5 matches)\nR1# show ip interface g0/0/0 | include access list\n  Outgoing access list is BROWSING\n  Inbound  access list is SURFING\nR1# clear access-list counters SURFING'),
      lUL([
        ['The "matches" counters show which lines are really used. The implicit deny has no counter — add "deny ip any any" at the end if you want to count drops.', 'Счётчики «matches» показывают, какие строки реально срабатывают. У неявного запрета счётчика нет — добавьте в конец «deny ip any any», если нужно считать отброшенное.', 'מוני ה-"matches" מראים אילו שורות באמת עובדות. לדחייה המרומזת אין מונה — מוסיפים בסוף "deny ip any any" אם רוצים לספור את מה שנזרק.'],
        ['show running-config shows the ACL and where it is applied (ip access-group under the interface).', 'show running-config показывает ACL и место его применения (ip access-group под интерфейсом).', 'show running-config מציג את ה-ACL והיכן הוא מוחל (ip access-group תחת הממשק).'],
      ])),
  ],
  quiz: [
    lQ(['Which command applies ACL 10 to traffic leaving an interface?', 'Какая команда применяет ACL 10 к трафику, выходящему из интерфейса?', 'איזו פקודה מחילה את ACL 10 על תעבורה שיוצאת מממשק?'],
      ['ip access-group 10 out', 'access-class 10 out', 'ip access-list 10 out', 'access-list 10 out'], 0,
      ['Entered in interface configuration mode.', 'Вводится в режиме настройки интерфейса.', 'מקלידים במצב הגדרת ממשק.']),
    lQ(['Which command limits who can open SSH sessions to the router?', 'Какая команда ограничивает, кто может открыть SSH-сессию на роутер?', 'איזו פקודה מגבילה מי יכול לפתוח סשן SSH לנתב?'],
      [['access-class ADMIN-HOST in (under line vty)', 'access-class ADMIN-HOST in (в line vty)', 'access-class ADMIN-HOST in (תחת line vty)'], ['ip access-group ADMIN-HOST in (under line vty)', 'ip access-group ADMIN-HOST in (в line vty)', 'ip access-group ADMIN-HOST in (תחת line vty)'], ['transport input none', 'transport input none', 'transport input none'], ['login block-for 60', 'login block-for 60', 'login block-for 60']], 0,
      ['access-class filters VTY lines; ip access-group filters interfaces.', 'access-class фильтрует линии VTY; ip access-group — интерфейсы.', 'access-class מסנן קווי VTY; ‏ip access-group מסנן ממשקים.']),
    lQ(['A named ACL has lines 10 and 20. How do you add a line between them?', 'В именованном ACL строки 10 и 20. Как добавить строку между ними?', 'ב-ACL עם שם יש שורות 10 ו-20. איך מוסיפים שורה ביניהן?'],
      [['Enter the ACL mode and type the line with sequence number 15', 'Войти в режим ACL и ввести строку с номером 15', 'נכנסים למצב ה-ACL ומקלידים את השורה עם מספר רצף 15'], ['It is impossible, delete the ACL first', 'Нельзя, сначала удалите ACL', 'אי אפשר, צריך קודם למחוק את ה-ACL'], ['Type it with "insert after 10"', 'Ввести её с «insert after 10»', 'להקליד אותה עם "insert after 10"'], ['New lines always go to the top', 'Новые строки всегда идут наверх', 'שורות חדשות תמיד נכנסות למעלה']], 0,
      ['Without a number, the new line is added at the end.', 'Без номера новая строка добавляется в конец.', 'בלי מספר, השורה החדשה נוספת בסוף.']),
    lQ(['In "permit tcp any host 10.1.1.10 eq 22", what does "eq 22" match?', 'В «permit tcp any host 10.1.1.10 eq 22» что проверяет «eq 22»?', 'ב-"permit tcp any host 10.1.1.10 eq 22", מה בודק "eq 22"?'],
      [['Destination port 22 (SSH to the server)', 'Порт получателя 22 (SSH на сервер)', 'פורט יעד 22 (SSH לשרת)'], ['Source port 22', 'Порт источника 22', 'פורט מקור 22'], ['Both ports', 'Оба порта', 'שני הפורטים'], ['22 packets per second', '22 пакета в секунду', '22 חבילות בשנייה']], 0,
      ['The port follows the destination address, so it is the destination port.', 'Порт стоит после адреса получателя, значит, это порт получателя.', 'הפורט בא אחרי כתובת היעד, ולכן זה פורט היעד.']),
    lQ(['What does the keyword "established" match?', 'С чем совпадает ключевое слово «established»?', 'למה מתאימה מילת המפתח "established"?'],
      [['TCP segments with ACK or RST set — replies to sessions started inside', 'TCP-сегменты с ACK или RST — ответы на сессии, начатые изнутри', 'מקטעי TCP עם ACK או RST — תשובות לסשנים שהתחילו מבפנים'], ['All UDP traffic', 'Весь трафик UDP', 'כל תעבורת UDP'], ['Only the first SYN', 'Только первый SYN', 'רק ה-SYN הראשון'], ['Traffic older than one minute', 'Трафик старше минуты', 'תעבורה בת יותר מדקה']], 0,
      ['A new connection from outside starts with a SYN without ACK, so it is not matched.', 'Новое соединение снаружи начинается с SYN без ACK, поэтому не совпадает.', 'חיבור חדש מבחוץ מתחיל ב-SYN בלי ACK, ולכן הוא לא מתאים.']),
    lQ(['What does "no access-list 10" do?', 'Что делает «no access-list 10»?', 'מה עושה "no access-list 10"?'],
      [['Deletes the whole ACL 10', 'Удаляет весь ACL 10', 'מוחק את כל ACL 10'], ['Deletes only the last line', 'Удаляет только последнюю строку', 'מוחק רק את השורה האחרונה'], ['Detaches ACL 10 from interfaces only', 'Только отвязывает ACL 10 от интерфейсов', 'רק מנתק את ACL 10 מהממשקים'], ['Resets the counters', 'Сбрасывает счётчики', 'מאפס את המונים']], 0,
      ['Use sequence numbers (named ACL mode) to remove one line.', 'Чтобы удалить одну строку, используйте порядковые номера (режим именованного ACL).', 'כדי למחוק שורה אחת משתמשים במספרי רצף (מצב ACL עם שם).']),
    lQ(['Which command shows ACL lines with their match counters?', 'Какая команда показывает строки ACL со счётчиками совпадений?', 'איזו פקודה מציגה את שורות ה-ACL עם מוני ההתאמות?'],
      ['show access-lists', 'show ip route', 'show ip interface brief', 'show running-config | include vty'], 0,
      ['clear access-list counters resets the counters.', 'clear access-list counters сбрасывает счётчики.', 'clear access-list counters מאפס את המונים.']),
    lQ(['Which prompt do you see after "ip access-list extended SURFING"?', 'Какое приглашение появится после «ip access-list extended SURFING»?', 'איזו שורת פקודה מופיעה אחרי "ip access-list extended SURFING"?'],
      ['R1(config-ext-nacl)#', 'R1(config-std-nacl)#', 'R1(config-acl)#', 'R1(config-if)#'], 0,
      ['ext = extended, std = standard, nacl = named ACL.', 'ext — расширенный, std — стандартный, nacl — именованный ACL.', 'ext = מורחב, ‏std = סטנדרטי, ‏nacl = ‏ACL עם שם.']),
    lQ(['An ACL is configured correctly but no traffic is filtered. What is the most likely cause?', 'ACL настроен правильно, но трафик не фильтруется. Самая вероятная причина?', 'ACL מוגדר נכון אבל שום תעבורה לא מסוננת. מה הסיבה הסבירה ביותר?'],
      [['It is not applied to the interface (or applied in the wrong direction)', 'Он не применён к интерфейсу (или применён не в ту сторону)', 'הוא לא הוחל על הממשק (או הוחל בכיוון הלא נכון)'], ['The router needs a reload', 'Роутеру нужна перезагрузка', 'צריך לאתחל את הנתב'], ['ACLs only work on switches', 'ACL работают только на коммутаторах', 'ACL עובד רק במתגים'], ['The remark line disables it', 'Строка remark его отключает', 'שורת ה-remark משביתה אותו']], 0,
      ['Check show ip interface for "Inbound/Outgoing access list".', 'Проверьте show ip interface — строки «Inbound/Outgoing access list».', 'בודקים ב-show ip interface את השורות "Inbound/Outgoing access list".']),
  ],
  gen: [
    function genAclFirstMatch(rng) {
      const b16 = netOf(lRandHostIp(rng), 16), c24 = (b16 + rng.int(0, 255) * 256) >>> 0;
      const subLen = rng.pick([25, 26, 27, 28, 32]), subSize = Math.pow(2, 32 - subLen);
      const sub = (c24 + (subLen === 32 ? rng.int(1, 254) : subSize * rng.int(0, 256 / subSize - 1))) >>> 0;
      const a1 = rng.pick(['permit', 'deny']), a2 = a1 === 'permit' ? 'deny' : 'permit';
      const lines = [{ act: a1, net: sub, len: subLen }, { act: a2, net: c24, len: 24 }, { act: a1, net: b16, len: 16 }];
      if (rng.chance(0.5)) lines.push({ act: rng.pick(['permit', 'permit', 'deny']), any: true });
      lines.forEach((l, i) => { l.seq = (i + 1) * 10; });
      const target = rng.int(0, lines.some((l) => l.any) ? lines.length - 1 : lines.length);
      let src;
      const pickIn = (net, len, not) => { for (;;) { const x = (net + rng.int(0, Math.pow(2, 32 - len) - 1)) >>> 0; if (!not || !inSubnet(x, not.net, not.len)) return x; } };
      if (target === 0) src = pickIn(sub, subLen);
      else if (target === 1) src = pickIn(c24, 24, lines[0]);
      else if (target === 2) src = pickIn(b16, 16, lines[1]);
      else src = (() => { for (;;) { const x = ipToInt(lRandHostIp(rng)); if (!inSubnet(x, b16, 16)) return x; } })();
      const said = (l) => (l.act === 'permit' ? T('Permitted by line ' + l.seq, 'Разрешён строкой ' + l.seq, 'מותר לפי שורה ' + l.seq) : T('Denied by line ' + l.seq, 'Запрещён строкой ' + l.seq, 'נחסם לפי שורה ' + l.seq));
      const implicit = T('Denied by the implicit deny at the end', 'Запрещён неявным deny в конце', 'נחסם בדחייה המרומזת בסוף');
      const hit = lines.find((l) => l.any || inSubnet(src, l.net, l.len));
      const right = hit ? said(hit) : implicit;
      const wrong = lines.filter((l) => l !== hit).map(said).concat(hit ? (lines.some((l) => l.any) ? [] : [implicit]) : []);
      const fmt = (l) => '    ' + l.seq + ' ' + padR(l.act, 7) + (l.any ? 'any' : l.len === 32 ? intToIp(l.net) : intToIp(l.net) + ', wildcard bits ' + lWild(l.len));
      const why = hit ? T('Line ' + hit.seq + ' is the first one that matches ' + intToIp(src) + '; the router stops checking there.', 'Строка ' + hit.seq + ' — первая, совпадающая с ' + intToIp(src) + '; дальше роутер не проверяет.', 'שורה ' + hit.seq + ' היא הראשונה שמתאימה ל-' + intToIp(src) + '; הנתב מפסיק לבדוק שם.')
        : T(intToIp(src) + ' matches no line, so the implicit deny any drops it.', intToIp(src) + ' не совпадает ни с одной строкой, поэтому его отбрасывает неявный deny any.', intToIp(src) + ' לא מתאים לאף שורה, ולכן ה-deny any המרומז זורק אותו.');
      const q = lGen(T('ACL 20 is applied inbound. A packet with source ' + intToIp(src) + ' arrives. What happens?', 'ACL 20 применён на вход. Приходит пакет с источником ' + intToIp(src) + '. Что произойдёт?', 'ACL 20 מוחל בכניסה. מגיעה חבילה עם כתובת מקור ' + intToIp(src) + '. מה יקרה?'), right, wrong, why);
      q.code = 'R1# show access-lists\nStandard IP access list 20\n' + lines.map(fmt).join('\n');
      return q;
    },
    function genAclExtended(rng) {
      const s = rng.pick(E2_SERVICES), net = netOf(lRandHostIp(rng), 24), srv = lRandHostIp(rng), n = rng.int(100, 199);
      const NET = intToIp(net) + ' ' + lWild(24), other = rng.pick(E2_SERVICES.filter((x) => x.p === s.p && x.port !== s.port));
      const ace = (p, src, dst, port) => 'access-list ' + n + ' deny ' + p + ' ' + src + ' ' + dst + ' eq ' + port;
      const right = ace(s.p, NET, 'host ' + srv, s.port);
      const wrong = rng.shuffle([
        ace(s.p, 'host ' + srv, NET, s.port),
        ace(s.p === 'tcp' ? 'udp' : 'tcp', NET, 'host ' + srv, s.port),
        ace(s.p, intToIp(net) + ' 255.255.255.0', 'host ' + srv, s.port),
        ace(s.p, NET, 'host ' + srv, other.port),
        'access-list ' + n + ' deny ' + s.p + ' ' + NET + ' eq ' + s.port + ' host ' + srv,
      ]);
      return lGen(T('Which ACE blocks ' + s.en + ' from ' + intToIp(net) + '/24 to the server ' + srv + '?', 'Какая строка блокирует ' + s.ru + ' из ' + intToIp(net) + '/24 к серверу ' + srv + '?', 'איזו שורה חוסמת ' + s.he + ' מ-' + intToIp(net) + '/24 לשרת ' + srv + '?'),
        right, wrong,
        T(s.en + ' = ' + s.p.toUpperCase() + ' ' + s.port + '. Order: protocol, source + wildcard, destination, then "eq ' + s.port + '" (the destination port).', s.ru + ' = ' + s.p.toUpperCase() + ' ' + s.port + '. Порядок: протокол, источник + wildcard, получатель, затем «eq ' + s.port + '» (порт получателя).', s.he + ' = ' + s.p.toUpperCase() + ' ' + s.port + '. הסדר: פרוטוקול, מקור + wildcard, יעד, ואז "eq ' + s.port + '" (פורט היעד).'));
    },
  ],
});

// ---------------------------------------------------------------
const E2_NAT_TERMS = [
  { key: 'inside local', ru: 'inside local (внутренний локальный)', he: 'inside local' },
  { key: 'inside global', ru: 'inside global (внутренний глобальный)', he: 'inside global' },
  { key: 'outside global', ru: 'outside global (внешний глобальный)', he: 'outside global' },
  { key: 'outside local', ru: 'outside local (внешний локальный)', he: 'outside local' },
];

lessonDef({
  id: 'ensa06', topic: null, drill: 'nat', minutes: 18, genInQuiz: 2,
  title: T('NAT for IPv4', 'NAT для IPv4', 'NAT עבור IPv4'),
  goal: T('Why NAT exists, the four NAT address terms, static NAT, dynamic NAT and PAT (overload), how to configure and verify them, and the pros and cons of NAT.',
    'Зачем нужен NAT, четыре термина адресов NAT, статический NAT, динамический NAT и PAT (overload), как их настроить и проверить, плюсы и минусы NAT.',
    'למה צריך NAT, ארבעת מונחי הכתובות של NAT, ‏NAT סטטי, ‏NAT דינמי ו-PAT ‏(overload), איך מגדירים ובודקים אותם, והיתרונות והחסרונות של NAT.'),
  sections: [
    lSec(['Why NAT', 'Зачем NAT', 'למה NAT'],
      lP(['There are not enough public IPv4 addresses, so inside networks use private RFC 1918 addresses: 10.0.0.0/8, 172.16.0.0/12 and 192.168.0.0/16. They are not routed on the Internet. The border router translates private source addresses into public ones on the way out and back on the way in.',
        'Публичных IPv4-адресов не хватает, поэтому внутренние сети используют частные адреса RFC 1918: 10.0.0.0/8, 172.16.0.0/12 и 192.168.0.0/16. В Интернете они не маршрутизируются. Пограничный роутер подменяет частный адрес источника публичным на выходе и обратно — на входе.',
        'אין מספיק כתובות IPv4 ציבוריות, ולכן רשתות פנימיות משתמשות בכתובות פרטיות לפי RFC 1918: ‏10.0.0.0/8, ‏172.16.0.0/12 ו-192.168.0.0/16. הן לא מנותבות באינטרנט. נתב הגבול מתרגם כתובות מקור פרטיות לציבוריות ביציאה, ובחזרה בכניסה.']),
      lUL([
        ['The inside network is the one being translated (ip nat inside); the outside is usually the ISP (ip nat outside).', 'Внутренняя сеть — та, которую транслируют (ip nat inside); внешняя — обычно провайдер (ip nat outside).', 'הרשת הפנימית היא זו שמתרגמים (ip nat inside); החיצונית היא בדרך כלל ספק האינטרנט (ip nat outside).'],
        ['NAT usually runs on the edge router of a stub network — a network with one connection to the outside.', 'NAT обычно работает на пограничном роутере тупиковой (stub) сети — сети с одним выходом наружу.', 'NAT רץ בדרך כלל בנתב הקצה של רשת stub — רשת עם חיבור אחד החוצה.'],
      ])),
    lSec(['NAT terminology', 'Термины NAT', 'מונחי NAT'],
      lTable([['Term', 'Термин', 'מונח'], ['Meaning', 'Значение', 'משמעות'], ['Example', 'Пример', 'דוגמה']], [
        ['Inside local', ['Address of an inside host as seen inside (usually private)', 'Адрес внутреннего хоста, как его видят внутри (обычно частный)', 'כתובת של מארח פנימי כפי שרואים אותה בפנים (בדרך כלל פרטית)'], '192.168.10.10'],
        ['Inside global', ['Address of the same inside host as seen from outside (public)', 'Адрес того же внутреннего хоста, как его видят снаружи (публичный)', 'הכתובת של אותו מארח פנימי כפי שרואים אותה מבחוץ (ציבורית)'], '209.165.200.226'],
        ['Outside global', ['Real address of a host on the outside', 'Настоящий адрес внешнего хоста', 'הכתובת האמיתית של מארח בחוץ'], '209.165.201.1'],
        ['Outside local', ['Address of the outside host as seen inside — usually the same as outside global', 'Адрес внешнего хоста, как его видят внутри, — обычно равен outside global', 'כתובת המארח החיצוני כפי שרואים אותה בפנים — בדרך כלל זהה ל-outside global'], '209.165.201.1'],
      ]),
      lTip(['Inside/outside = whose address it is. Local/global = where it is seen from.', 'Inside/outside — чей это адрес. Local/global — откуда на него смотрят.', 'Inside/outside = של מי הכתובת. ‏Local/global = מאיפה רואים אותה.'])),
    lSec(['Static NAT', 'Статический NAT', 'NAT סטטי'],
      lP(['A permanent one-to-one mapping between an inside local and an inside global address. It is used for servers that must be reachable from the Internet, for example a web server.',
        'Постоянное соответствие «один к одному» между inside local и inside global. Используется для серверов, которые должны быть доступны из Интернета, например веб-сервера.',
        'מיפוי קבוע של אחד-לאחד בין כתובת inside local לכתובת inside global. משתמשים בו לשרתים שחייבים להיות נגישים מהאינטרנט, למשל שרת web.']),
      lCode('R2(config)# ip nat inside source static 192.168.10.254 209.165.201.5\nR2(config)# interface g0/0/0\nR2(config-if)# ip nat inside\nR2(config-if)# interface s0/1/0\nR2(config-if)# ip nat outside')),
    lSec(['Dynamic NAT', 'Динамический NAT', 'NAT דינמי'],
      lP(['Inside hosts get a public address from a pool, first come, first served, one-to-one while the translation exists. If the pool is used up, the next host has to wait until an address is free.',
        'Внутренние хосты получают публичный адрес из пула в порядке очереди, «один к одному», пока существует трансляция. Если пул закончился, следующий хост ждёт, пока освободится адрес.',
        'מארחים פנימיים מקבלים כתובת ציבורית ממאגר, לפי סדר הגעה, אחד-לאחד כל עוד התרגום קיים. אם המאגר נגמר, המארח הבא צריך לחכות עד שכתובת תתפנה.']),
      lCode('R2(config)# ip nat pool NAT-POOL1 209.165.200.226 209.165.200.240 netmask 255.255.255.224\nR2(config)# access-list 1 permit 192.168.0.0 0.0.255.255\nR2(config)# ip nat inside source list 1 pool NAT-POOL1\n! plus ip nat inside / ip nat outside on the interfaces',
        ['The ACL selects which inside addresses may be translated (it filters nothing)', 'ACL выбирает, какие внутренние адреса можно транслировать (ничего не фильтрует)', 'ה-ACL בוחר אילו כתובות פנימיות מותר לתרגם (הוא לא מסנן כלום)'])),
    lSec(['PAT (NAT overload)', 'PAT (NAT overload)', 'PAT ‏(NAT overload)'],
      lP(['Port Address Translation lets many inside hosts share one public address. Sessions are told apart by the source port: the router keeps the original port if it is free, otherwise it picks another one. This is what every home router does.',
        'Port Address Translation позволяет многим внутренним хостам делить один публичный адрес. Сессии различаются по порту источника: роутер оставляет исходный порт, если он свободен, иначе выбирает другой. Именно так работает любой домашний роутер.',
        'Port Address Translation מאפשר להרבה מארחים פנימיים לחלוק כתובת ציבורית אחת. מבדילים בין הסשנים לפי פורט המקור: הנתב שומר את הפורט המקורי אם הוא פנוי, ואחרת בוחר פורט אחר. ככה עובד כל ראוטר ביתי.']),
      lCode('R2(config)# access-list 1 permit 192.168.0.0 0.0.255.255\nR2(config)# ip nat inside source list 1 interface serial 0/1/0 overload\n\nR2# show ip nat translations\nPro Inside global         Inside local        Outside local      Outside global\ntcp 209.165.200.225:1444  192.168.10.10:1444  209.165.201.1:80   209.165.201.1:80\ntcp 209.165.200.225:1445  192.168.11.10:1444  209.165.201.1:80   209.165.201.1:80',
        ['Both PCs used source port 1444, so the second one was moved to 1445', 'Оба ПК использовали порт 1444, поэтому второй получил 1445', 'שני המחשבים השתמשו בפורט מקור 1444, ולכן השני הועבר ל-1445']),
      lUL([
        ['"interface … overload" uses the outside interface address; "pool … overload" uses a pool of addresses with PAT.', '«interface … overload» использует адрес внешнего интерфейса; «pool … overload» — пул адресов с PAT.', '"interface … overload" משתמש בכתובת הממשק החיצוני; ‏"pool … overload" משתמש במאגר כתובות עם PAT.'],
        ['Verify: show ip nat translations, show ip nat statistics. Clear dynamic entries: clear ip nat translation *.', 'Проверка: show ip nat translations, show ip nat statistics. Очистить динамические записи: clear ip nat translation *.', 'בדיקה: show ip nat translations, ‏show ip nat statistics. ניקוי רשומות דינמיות: clear ip nat translation *.'],
        ['Pros: saves public addresses, hides the inside addressing, easy ISP change. Cons: breaks end-to-end addressing, harder tracing, problems for some protocols (IPsec AH, VoIP), extra delay.', 'Плюсы: экономит публичные адреса, скрывает внутреннюю адресацию, легко сменить провайдера. Минусы: ломает сквозную адресацию, труднее трассировка, проблемы у некоторых протоколов (IPsec AH, VoIP), лишняя задержка.', 'יתרונות: חוסך כתובות ציבוריות, מסתיר את המיעון הפנימי, קל להחליף ספק. חסרונות: שובר מיעון מקצה-לקצה, קשה יותר לעקוב, בעיות בחלק מהפרוטוקולים (IPsec AH, ‏VoIP), השהיה נוספת.'],
      ])),
  ],
  quiz: [
    lQ(['What is the inside global address?', 'Что такое inside global адрес?', 'מהי כתובת inside global?'],
      [['The public address that represents an inside host to the outside', 'Публичный адрес, которым внутренний хост представлен снаружи', 'הכתובת הציבורית שמייצגת מארח פנימי כלפי חוץ'], ['The private address of an inside host', 'Частный адрес внутреннего хоста', 'הכתובת הפרטית של מארח פנימי'], ['The address of a web server on the Internet', 'Адрес веб-сервера в Интернете', 'הכתובת של שרת web באינטרנט'], ['The gateway address of the LAN', 'Адрес шлюза LAN', 'כתובת השער של ה-LAN']], 0,
      ['Inside = our host; global = how the outside sees it.', 'Inside — наш хост; global — каким его видят снаружи.', 'Inside = המארח שלנו; ‏global = איך רואים אותו מבחוץ.']),
    lQ(['A web server must always be reachable from the Internet at the same public IP. Which NAT type?', 'Веб-сервер должен быть всегда доступен из Интернета по одному и тому же публичному IP. Какой тип NAT?', 'שרת web חייב להיות תמיד נגיש מהאינטרנט באותה כתובת IP ציבורית. איזה סוג NAT?'],
      [['Static NAT', 'Статический NAT', 'NAT סטטי'], ['Dynamic NAT', 'Динамический NAT', 'NAT דינמי'], ['PAT', 'PAT', 'PAT'], ['No NAT is possible', 'NAT невозможен', 'אי אפשר NAT']], 0,
      ['Static NAT is a permanent one-to-one mapping.', 'Статический NAT — постоянное соответствие «один к одному».', 'NAT סטטי הוא מיפוי קבוע של אחד-לאחד.']),
    lQ(['What does the keyword "overload" do?', 'Что делает ключевое слово «overload»?', 'מה עושה מילת המפתח "overload"?'],
      [['Turns on PAT: many hosts share one public address using port numbers', 'Включает PAT: много хостов делят один публичный адрес с помощью портов', 'מפעילה PAT: הרבה מארחים חולקים כתובת ציבורית אחת בעזרת מספרי פורטים'], ['Allows more than one NAT pool', 'Разрешает несколько пулов NAT', 'מאפשרת יותר ממאגר NAT אחד'], ['Increases the interface bandwidth', 'Увеличивает полосу интерфейса', 'מגדילה את רוחב הפס של הממשק'], ['Translates outside addresses', 'Транслирует внешние адреса', 'מתרגמת כתובות חיצוניות']], 0,
      ['Without overload, dynamic NAT is one-to-one.', 'Без overload динамический NAT работает «один к одному».', 'בלי overload, ‏NAT דינמי הוא אחד-לאחד.']),
    lQ(['Which command marks the interface that faces the ISP?', 'Какая команда помечает интерфейс в сторону провайдера?', 'איזו פקודה מסמנת את הממשק שפונה לספק?'],
      ['ip nat outside', 'ip nat inside', 'ip nat pool', 'ip nat enable'], 0,
      ['Inside interfaces get ip nat inside.', 'Внутренним интерфейсам — ip nat inside.', 'הממשקים הפנימיים מקבלים ip nat inside.']),
    lQ(['A dynamic NAT pool has 4 addresses and all are in use. What happens to a 5th inside host?', 'В пуле динамического NAT 4 адреса, все заняты. Что будет с 5-м внутренним хостом?', 'במאגר NAT דינמי יש 4 כתובות וכולן בשימוש. מה יקרה למארח פנימי חמישי?'],
      [['It cannot be translated until an address is free', 'Его не смогут транслировать, пока не освободится адрес', 'אי אפשר לתרגם אותו עד שתתפנה כתובת'], ['It shares an address using ports', 'Он разделит адрес по портам', 'הוא יחלוק כתובת בעזרת פורטים'], ['It gets the router\'s address', 'Он получит адрес роутера', 'הוא יקבל את הכתובת של הנתב'], ['The oldest translation is deleted', 'Самая старая трансляция удаляется', 'התרגום הישן ביותר נמחק']], 0,
      ['Only PAT (overload) shares addresses.', 'Делить адреса умеет только PAT (overload).', 'רק PAT ‏(overload) חולק כתובות.']),
    lQ(['What is the ACL for in "ip nat inside source list 1 pool P"?', 'Зачем ACL в «ip nat inside source list 1 pool P»?', 'למה משמש ה-ACL ב-"ip nat inside source list 1 pool P"?'],
      [['It selects which inside addresses may be translated', 'Он выбирает, какие внутренние адреса можно транслировать', 'הוא בוחר אילו כתובות פנימיות מותר לתרגם'], ['It blocks traffic from the Internet', 'Он блокирует трафик из Интернета', 'הוא חוסם תעבורה מהאינטרנט'], ['It lists the public addresses', 'Он перечисляет публичные адреса', 'הוא מפרט את הכתובות הציבוריות'], ['It limits bandwidth', 'Он ограничивает полосу', 'הוא מגביל את רוחב הפס']], 0,
      ['Addresses permitted by the ACL are translated; others are not.', 'Адреса, разрешённые ACL, транслируются; остальные — нет.', 'כתובות שה-ACL מתיר מתורגמות; האחרות לא.']),
    lQ(['Which command shows the active translations?', 'Какая команда показывает текущие трансляции?', 'איזו פקודה מציגה את התרגומים הפעילים?'],
      ['show ip nat translations', 'show ip route nat', 'show nat pool', 'show ip interface brief'], 0,
      ['show ip nat statistics shows counters and the configuration.', 'show ip nat statistics показывает счётчики и настройки.', 'show ip nat statistics מציג מונים והגדרות.']),
    lQ(['Which is a disadvantage of NAT?', 'Какой недостаток у NAT?', 'מה מהבאים חיסרון של NAT?'],
      [['It breaks end-to-end addressing and makes tracing harder', 'Ломает сквозную адресацию и усложняет трассировку', 'הוא שובר מיעון מקצה-לקצה ומקשה על מעקב'], ['It uses more public addresses', 'Расходует больше публичных адресов', 'הוא צורך יותר כתובות ציבוריות'], ['It shows inside addresses to the Internet', 'Показывает внутренние адреса Интернету', 'הוא חושף כתובות פנימיות לאינטרנט'], ['It works only with IPv6', 'Работает только с IPv6', 'הוא עובד רק עם IPv6']], 0,
      ['Some protocols (IPsec AH, some VoIP) also have trouble with NAT.', 'Некоторые протоколы (IPsec AH, часть VoIP) тоже плохо работают через NAT.', 'גם לחלק מהפרוטוקולים (IPsec AH, ‏VoIP מסוימים) יש בעיות עם NAT.']),
    lQ(['Which of these is a private (RFC 1918) range?', 'Какой из этих диапазонов частный (RFC 1918)?', 'איזה מהטווחים האלה פרטי (RFC 1918)?'],
      ['172.16.0.0/12', '172.32.0.0/12', '169.254.0.0/16', '192.0.2.0/24'], 0,
      ['172.16.0.0 – 172.31.255.255. 169.254.0.0/16 is link-local (APIPA).', '172.16.0.0 – 172.31.255.255. 169.254.0.0/16 — link-local (APIPA).', '172.16.0.0 – 172.31.255.255. ‏169.254.0.0/16 הוא link-local ‏(APIPA).']),
  ],
  gen: [
    function genNatTerm(rng) {
      const lan = netOf(lRandHostIp(rng), 24), pc = intToIp(lan + rng.int(10, 200)), gw = intToIp(lan + 1);
      const pub = '209.165.' + rng.int(200, 202) + '.' + rng.int(225, 254), srv = rng.pick(['203.0.113.', '198.51.100.']) + rng.int(1, 254);
      const t = rng.pick(E2_NAT_TERMS), right = t.key === 'inside local' ? pc : t.key === 'inside global' ? pub : srv;
      return lGen(T('PC ' + pc + ' (gateway ' + gw + ') opens the web server ' + srv + '. R1 translates the PC with PAT to ' + pub + '. Which address is the ' + t.key + ' address?', 'ПК ' + pc + ' (шлюз ' + gw + ') открывает веб-сервер ' + srv + '. R1 транслирует ПК через PAT в ' + pub + '. Какой адрес — ' + t.ru + '?', 'המחשב ' + pc + ' (שער ' + gw + ') פונה לשרת ה-web ‏' + srv + '. ‏R1 מתרגם את המחשב ב-PAT ל-' + pub + '. איזו כתובת היא ה-' + t.he + '?'),
        right, rng.shuffle([pc, pub, srv, gw].filter((x) => x !== right)),
        T('Inside local = the PC\'s own address (' + pc + '); inside global = the PC as seen outside (' + pub + '); outside global and outside local = the server (' + srv + ').', 'Inside local — собственный адрес ПК (' + pc + '); inside global — ПК, как его видят снаружи (' + pub + '); outside global и outside local — сервер (' + srv + ').', 'Inside local = הכתובת של המחשב עצמו (' + pc + '); ‏inside global = המחשב כפי שרואים אותו בחוץ (' + pub + '); ‏outside global ו-outside local = השרת (' + srv + ').'));
    },
    function genPatTranslate(rng) {
      const lan = netOf(lRandHostIp(rng), 24), pub = '209.165.200.' + rng.int(225, 254);
      const servers = [rng.pick(['203.0.113.', '198.51.100.']) + rng.int(1, 254) + ':' + rng.pick([80, 443]), '209.165.201.' + rng.int(1, 30) + ':' + rng.pick([80, 443])];
      const n = rng.int(3, 4), base = rng.int(1024, 1100), usedG = new Set(), usedL = new Set(), rows = [];
      while (rows.length < n) {
        const host = intToIp(lan + rng.int(2, 254)), lport = rows.length && rng.chance(0.4) ? Number(rows[0].il.split(':')[1]) : base + rng.int(0, 40);
        if (usedL.has(host + ':' + lport)) continue;
        let g = lport;
        while (usedG.has(g)) g++;
        usedG.add(g); usedL.add(host + ':' + lport);
        rows.push({ ig: pub + ':' + g, il: host + ':' + lport, og: rng.pick(servers) });
      }
      const r = rng.pick(rows);
      const drop = T('R1 drops it — there is no translation', 'R1 отбросит его — трансляции нет', 'R1 זורק אותה — אין תרגום');
      const q = lGen(T('A reply arrives at R1 from ' + r.og + ' to ' + r.ig + '. Where does R1 send it?', 'На R1 приходит ответ от ' + r.og + ' на ' + r.ig + '. Куда R1 его отправит?', 'תשובה מגיעה ל-R1 מ-' + r.og + ' אל ' + r.ig + '. לאן R1 ישלח אותה?'),
        r.il, rng.shuffle(rows.filter((x) => x !== r).map((x) => x.il)).concat([r.il.split(':')[0] + ':' + r.ig.split(':')[1], drop]),
        T('Find the row with inside global ' + r.ig + ' → inside local ' + r.il + '. The port number tells the hosts apart.', 'Найдите строку с inside global ' + r.ig + ' → inside local ' + r.il + '. Хосты различаются по номеру порта.', 'מוצאים את השורה עם inside global ‏' + r.ig + ' → ‏inside local ‏' + r.il + '. מספר הפורט מבדיל בין המארחים.'));
      q.code = 'R1# show ip nat translations\n' + padR('Pro', 4) + padR('Inside global', 22) + padR('Inside local', 22) + padR('Outside local', 22) + 'Outside global\n' +
        rows.map((x) => padR('tcp', 4) + padR(x.ig, 22) + padR(x.il, 22) + padR(x.og, 22) + x.og).join('\n');
      return q;
    },
    function genNatPool(rng) {
      const block = 32 * rng.int(0, 7), a = block + rng.int(1, 12), b = Math.min(block + 30, a + rng.int(2, 17)), p = '209.165.' + rng.int(200, 202) + '.';
      const right = b - a + 1;
      const q = lGen(T('This is dynamic NAT without overload. How many inside hosts can use the Internet at the same time?', 'Это динамический NAT без overload. Сколько внутренних хостов могут одновременно выходить в Интернет?', 'זה NAT דינמי בלי overload. כמה מארחים פנימיים יכולים להשתמש באינטרנט באותו זמן?'),
        String(right), [String(right - 1), String(right + 1), '30', T('Thousands — each address has many ports', 'Тысячи — у каждого адреса много портов', 'אלפים — לכל כתובת יש הרבה פורטים')],
        T('Without overload each host needs its own address: ' + p + a + ' – ' + p + b + ' = ' + right + ' addresses.', 'Без overload каждому хосту нужен свой адрес: ' + p + a + ' – ' + p + b + ' = ' + right + ' адресов.', 'בלי overload כל מארח צריך כתובת משלו: ' + p + a + ' – ' + p + b + ' = ' + right + ' כתובות.'));
      q.code = 'ip nat pool PUBLIC ' + p + a + ' ' + p + b + ' netmask 255.255.255.224\naccess-list 1 permit 192.168.0.0 0.0.255.255\nip nat inside source list 1 pool PUBLIC';
      return q;
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'ensa07', topic: null, drill: 'ops', minutes: 15, genInQuiz: 1,
  title: T('WAN concepts', 'Принципы WAN', 'עקרונות WAN'),
  goal: T('How a WAN differs from a LAN, private and public WANs, WAN topologies, WAN terms and devices, and today\'s connection options: leased lines, Metro Ethernet, MPLS, DSL, cable, fiber, cellular and VPNs over the Internet.',
    'Чем WAN отличается от LAN, частные и публичные WAN, топологии WAN, термины и устройства WAN и современные способы подключения: выделенные линии, Metro Ethernet, MPLS, DSL, кабель, оптика, сотовая связь и VPN через Интернет.',
    'במה WAN שונה מ-LAN, ‏WAN פרטי וציבורי, טופולוגיות WAN, מונחים והתקנים של WAN, ואפשרויות החיבור של היום: קווים חכורים, ‏Metro Ethernet, ‏MPLS, ‏DSL, כבלים, סיבים, סלולר ו-VPN על גבי האינטרנט.'),
  sections: [
    lSec(['WAN vs LAN', 'WAN и LAN', 'WAN מול LAN'],
      lUL([
        ['A LAN covers a small area (a building, a campus) and is owned by the organisation. A WAN connects sites across a city, country or the world, and its links are usually rented from a service provider.', 'LAN покрывает небольшую территорию (здание, кампус) и принадлежит организации. WAN соединяет площадки по городу, стране или миру, а его каналы обычно арендуются у провайдера.', 'LAN מכסה אזור קטן (בניין, קמפוס) ושייך לארגון. ‏WAN מחבר אתרים ברחבי עיר, מדינה או העולם, והקישורים שלו בדרך כלל נשכרים מספק שירות.'],
        ['WAN standards live mainly at OSI Layers 1 and 2: physical delivery and Layer 2 framing (Ethernet, PPP, HDLC).', 'Стандарты WAN в основном на 1-м и 2-м уровнях OSI: физическая передача и кадрирование 2-го уровня (Ethernet, PPP, HDLC).', 'תקני WAN נמצאים בעיקר בשכבות 1 ו-2 של OSI: העברה פיזית ומסגור בשכבה 2 ‏(Ethernet, ‏PPP, ‏HDLC).'],
        ['Private WAN — dedicated to one customer (leased line, Metro Ethernet, MPLS). Public WAN — the Internet, made private with a VPN.', 'Частный WAN — выделен одному клиенту (выделенная линия, Metro Ethernet, MPLS). Публичный WAN — Интернет, защищённый с помощью VPN.', 'WAN פרטי — מוקדש ללקוח אחד (קו חכור, ‏Metro Ethernet, ‏MPLS). ‏WAN ציבורי — האינטרנט, שהופך לפרטי בעזרת VPN.'],
      ])),
    lSec(['WAN topologies', 'Топологии WAN', 'טופולוגיות WAN'],
      lTable([['Topology', 'Топология', 'טופולוגיה'], ['Idea', 'Суть', 'הרעיון'], ['Links for n sites', 'Каналов для n площадок', 'קישורים ל-n אתרים']], [
        [['Point-to-point', 'Точка-точка', 'נקודה-לנקודה'], ['One permanent link between two sites', 'Один постоянный канал между двумя площадками', 'קישור קבוע אחד בין שני אתרים'], '1'],
        [['Hub-and-spoke', 'Звезда (hub-and-spoke)', 'כוכב (Hub-and-spoke)'], ['Branches connect to a central hub; spoke-to-spoke traffic goes through the hub', 'Филиалы подключены к центру; трафик между филиалами идёт через центр', 'הסניפים מחוברים למרכז; תעבורה בין סניפים עוברת דרך המרכז'], 'n − 1'],
        [['Full mesh', 'Полносвязная', 'רשת מלאה (Full mesh)'], ['Every site to every other site — most redundant, most expensive', 'Каждая площадка с каждой — максимум резервирования и стоимости', 'כל אתר לכל אתר — הכי הרבה יתירות, הכי יקר'], 'n(n − 1)/2'],
        [['Partial mesh', 'Частично связная', 'רשת חלקית'], ['Only the important sites are interconnected', 'Соединены только важные площадки', 'רק האתרים החשובים מחוברים זה לזה'], ['between', 'между ними', 'באמצע']],
        [['Dual-homed', 'Двойное подключение', 'Dual-homed'], ['A site has two links (to one or two hubs) for redundancy', 'У площадки два канала (к одному или двум центрам) для резервирования', 'לאתר יש שני קישורים (למרכז אחד או לשניים) ליתירות'], '2 / site'],
      ]),
      lTip(['A hub-and-spoke hub is a single point of failure — dual-homing the spokes to two hubs fixes that.', 'Центр в «звезде» — единая точка отказа; двойное подключение филиалов к двум центрам решает это.', 'המרכז בכוכב הוא נקודת כשל יחידה — חיבור כפול של הסניפים לשני מרכזים פותר את זה.'])),
    lSec(['WAN terms and devices', 'Термины и устройства WAN', 'מונחים והתקנים ב-WAN'],
      lTable([['Term', 'Термин', 'מונח'], ['Meaning', 'Значение', 'משמעות']], [
        ['DTE / DCE', ['DTE = customer device (router); DCE = device that connects it to the provider and provides the clock (modem, CSU/DSU)', 'DTE — устройство клиента (роутер); DCE — устройство, подключающее его к провайдеру и дающее тактирование (модем, CSU/DSU)', 'DTE = התקן הלקוח (נתב); ‏DCE = ההתקן שמחבר אותו לספק ונותן שעון (מודם, ‏CSU/DSU)']],
        ['CPE', ['Customer premises equipment — the devices at the customer site', 'Оборудование на стороне клиента', 'הציוד שנמצא באתר הלקוח']],
        [['Demarcation point', 'Точка разграничения', 'נקודת הפרדה (Demarc)'], ['Where the customer\'s responsibility ends and the provider\'s begins', 'Где кончается ответственность клиента и начинается ответственность провайдера', 'המקום שבו האחריות של הלקוח נגמרת ושל הספק מתחילה']],
        [['Local loop (last mile)', 'Абонентская линия (последняя миля)', 'לולאה מקומית (Last mile)'], ['The line from the customer to the provider\'s central office (CO)', 'Линия от клиента до центрального узла (CO) провайдера', 'הקו מהלקוח למרכזייה (CO) של הספק']],
        ['POP', ['Point of presence — where the customer connects to the provider network', 'Точка присутствия — где клиент подключается к сети провайдера', 'נקודת נוכחות — המקום שבו הלקוח מתחבר לרשת הספק']],
        [['Toll network', 'Магистральная сеть провайдера', 'רשת הליבה של הספק (Toll network)'], ['The provider\'s long-distance backbone', 'Междугородная магистраль провайдера', 'עמוד השדרה למרחקים ארוכים של הספק']],
      ]),
      lUL([
        ['Devices: voiceband, DSL and cable modems, CSU/DSU for digital leased lines, optical converters, WAN switches and routers.', 'Устройства: модемы (телефонные, DSL, кабельные), CSU/DSU для цифровых выделенных линий, оптические преобразователи, WAN-коммутаторы и роутеры.', 'התקנים: מודמים (טלפוניים, ‏DSL, כבלים), ‏CSU/DSU לקווים חכורים דיגיטליים, ממירים אופטיים, מתגי WAN ונתבים.'],
        ['Circuit-switched (PSTN, ISDN) reserves a path for the whole call; packet-switched (Metro Ethernet, MPLS, the Internet) shares the links between many users.', 'Коммутация каналов (PSTN, ISDN) резервирует путь на весь звонок; коммутация пакетов (Metro Ethernet, MPLS, Интернет) делит каналы между многими пользователями.', 'מיתוג מעגלים (PSTN, ‏ISDN) שומר נתיב לכל השיחה; מיתוג חבילות (Metro Ethernet, ‏MPLS, האינטרנט) משתף את הקישורים בין הרבה משתמשים.'],
        ['Provider optical backbones use SONET/SDH and DWDM (many wavelengths on one fiber).', 'Оптические магистрали провайдеров используют SONET/SDH и DWDM (много длин волн в одном волокне).', 'עמודי שדרה אופטיים של ספקים משתמשים ב-SONET/SDH וב-DWDM (הרבה אורכי גל על סיב אחד).'],
      ])),
    lSec(['Private WAN services', 'Частные WAN-сервисы', 'שירותי WAN פרטיים'],
      lUL([
        ['Leased line — a dedicated point-to-point circuit: T1 = 1.544 Mbps, E1 = 2.048 Mbps (Europe, Israel), T3 = 44.7 Mbps, E3 = 34.4 Mbps. Simple and reliable, but expensive and inflexible.', 'Выделенная линия — постоянный канал точка-точка: T1 = 1,544 Мбит/с, E1 = 2,048 Мбит/с (Европа, Израиль), T3 = 44,7 Мбит/с, E3 = 34,4 Мбит/с. Просто и надёжно, но дорого и негибко.', 'קו חכור — מעגל נקודה-לנקודה ייעודי: T1 = ‏1.544 Mbps, ‏E1 = ‏2.048 Mbps (אירופה, ישראל), ‏T3 = ‏44.7 Mbps, ‏E3 = ‏34.4 Mbps. פשוט ואמין, אבל יקר ולא גמיש.'],
        ['Metro Ethernet — the provider gives you an Ethernet port; sites look like one big switched LAN. Cheap per Mbps, easy to integrate, bandwidth on demand.', 'Metro Ethernet — провайдер даёт Ethernet-порт; площадки выглядят как одна большая коммутируемая LAN. Дёшево за Мбит/с, легко интегрировать, полоса по запросу.', 'Metro Ethernet — הספק נותן פורט Ethernet; האתרים נראים כמו LAN ממותג אחד גדול. זול לכל Mbps, קל לשילוב, רוחב פס לפי דרישה.'],
        ['MPLS — the provider forwards packets by short labels instead of IP lookups. It carries any traffic (IPv4, IPv6, Ethernet) and provides Layer 2 and Layer 3 VPNs between the customer sites.', 'MPLS — провайдер пересылает пакеты по коротким меткам вместо поиска по IP. Переносит любой трафик (IPv4, IPv6, Ethernet) и даёт VPN 2-го и 3-го уровня между площадками клиента.', 'MPLS — הספק מעביר חבילות לפי תוויות קצרות במקום חיפוש לפי IP. הוא נושא כל תעבורה (IPv4, ‏IPv6, ‏Ethernet) ונותן VPN בשכבה 2 ובשכבה 3 בין אתרי הלקוח.'],
      ])),
    lSec(['Internet-based connectivity', 'Подключение через Интернет', 'חיבור דרך האינטרנט'],
      lTable([['Option', 'Вариант', 'אפשרות'], ['How it works', 'Как работает', 'איך זה עובד']], [
        ['DSL', ['Over the telephone copper line, asymmetric (download faster than upload); a DSLAM at the provider', 'По телефонной медной паре, асимметрично (приём быстрее отдачи); у провайдера стоит DSLAM', 'על קו הנחושת של הטלפון, אסימטרי (הורדה מהירה מהעלאה); אצל הספק יש DSLAM']],
        [['Cable', 'Кабель', 'כבלים'], ['Over the cable-TV network (HFC), DOCSIS standard; bandwidth shared with neighbours; CMTS at the provider', 'По сети кабельного ТВ (HFC), стандарт DOCSIS; полоса делится с соседями; у провайдера CMTS', 'על רשת הטלוויזיה בכבלים (HFC), תקן DOCSIS; רוחב הפס משותף עם השכנים; אצל הספק יש CMTS']],
        [['Fiber (FTTx)', 'Оптика (FTTx)', 'סיבים (FTTx)'], ['Fiber to the home, building or node — the highest speeds', 'Оптика до дома, здания или узла — самые высокие скорости', 'סיב עד הבית, הבניין או הצומת — המהירויות הגבוהות ביותר']],
        [['Cellular / satellite', 'Сотовая связь / спутник', 'סלולר / לוויין'], ['4G/5G routers for branches and backup; satellite where nothing else exists (high delay)', 'Роутеры 4G/5G для филиалов и резерва; спутник там, где ничего другого нет (большая задержка)', 'נתבי 4G/5G לסניפים ולגיבוי; לוויין במקום שאין שום דבר אחר (השהיה גבוהה)']],
      ]),
      lTable([['ISP connection', 'Подключение к ISP', 'חיבור לספק'], ['Meaning', 'Значение', 'משמעות']], [
        ['Single-homed', ['One link to one ISP — no redundancy', 'Один канал к одному провайдеру — без резерва', 'קישור אחד לספק אחד — אין יתירות']],
        ['Dual-homed', ['Two links to the same ISP', 'Два канала к одному провайдеру', 'שני קישורים לאותו ספק']],
        ['Multihomed', ['Links to two different ISPs', 'Каналы к двум разным провайдерам', 'קישורים לשני ספקים שונים']],
        ['Dual-multihomed', ['Two links to each of two ISPs — the most resilient', 'По два канала к каждому из двух провайдеров — самый надёжный', 'שני קישורים לכל אחד משני ספקים — העמיד ביותר']],
      ])),
  ],
  quiz: [
    lQ(['At which OSI layers do WAN standards mainly operate?', 'На каких уровнях OSI в основном работают стандарты WAN?', 'באילו שכבות OSI פועלים בעיקר תקני WAN?'],
      [['Layers 1 and 2', '1 и 2', 'שכבות 1 ו-2'], ['Layers 3 and 4', '3 и 4', 'שכבות 3 ו-4'], ['Layer 7 only', 'Только 7', 'רק שכבה 7'], ['Layers 5 and 6', '5 и 6', 'שכבות 5 ו-6']], 0,
      ['Physical delivery and Layer 2 framing.', 'Физическая передача и кадрирование 2-го уровня.', 'העברה פיזית ומסגור בשכבה 2.']),
    lQ(['What is the demarcation point?', 'Что такое точка разграничения?', 'מהי נקודת ההפרדה (demarc)?'],
      [['Where the customer\'s responsibility ends and the provider\'s begins', 'Где кончается ответственность клиента и начинается провайдера', 'המקום שבו האחריות של הלקוח נגמרת ושל הספק מתחילה'], ['The provider\'s central office', 'Центральный узел провайдера', 'המרכזייה של הספק'], ['The first router of the LAN', 'Первый роутер LAN', 'הנתב הראשון ב-LAN'], ['The fastest link of the WAN', 'Самый быстрый канал WAN', 'הקישור המהיר ביותר ב-WAN']], 0,
      ['A fault on the provider side of the demarc is the provider\'s job.', 'Неисправность со стороны провайдера — забота провайдера.', 'תקלה בצד של הספק היא באחריות הספק.']),
    lQ(['Which device is usually the DCE on a serial WAN link?', 'Какое устройство обычно DCE на последовательном WAN-канале?', 'איזה התקן הוא בדרך כלל ה-DCE בקישור WAN טורי?'],
      [['The CSU/DSU or modem of the provider link', 'CSU/DSU или модем канала провайдера', 'ה-CSU/DSU או המודם של קישור הספק'], ['The customer router', 'Роутер клиента', 'הנתב של הלקוח'], ['The LAN switch', 'Коммутатор LAN', 'המתג של ה-LAN'], ['A PC', 'ПК', 'מחשב']], 0,
      ['The DCE provides the clock; the customer router is the DTE.', 'DCE даёт тактирование; роутер клиента — DTE.', 'ה-DCE נותן שעון; הנתב של הלקוח הוא ה-DTE.']),
    lQ(['Which topology connects every site directly to every other site?', 'Какая топология соединяет каждую площадку напрямую с каждой?', 'איזו טופולוגיה מחברת כל אתר ישירות לכל אתר אחר?'],
      [['Full mesh', 'Полносвязная', 'רשת מלאה (Full mesh)'], ['Hub-and-spoke', 'Звезда', 'כוכב'], ['Point-to-point', 'Точка-точка', 'נקודה-לנקודה'], ['Partial mesh', 'Частично связная', 'רשת חלקית']], 0,
      ['n(n − 1)/2 links — great redundancy, high cost.', 'n(n − 1)/2 каналов — отличное резервирование, высокая цена.', 'n(n − 1)/2 קישורים — יתירות מעולה, מחיר גבוה.']),
    lQ(['Which provider technology forwards packets by short labels and offers Layer 2 and Layer 3 VPNs?', 'Какая технология провайдера пересылает пакеты по коротким меткам и даёт VPN 2-го и 3-го уровня?', 'איזו טכנולוגיית ספק מעבירה חבילות לפי תוויות קצרות ומציעה VPN בשכבה 2 ובשכבה 3?'],
      ['MPLS', 'DSL', 'ISDN', 'DOCSIS'], 0,
      ['Multiprotocol Label Switching.', 'Multiprotocol Label Switching.', 'Multiprotocol Label Switching.']),
    lQ(['Which Internet access uses the telephone line and is usually asymmetric?', 'Какой доступ в Интернет использует телефонную линию и обычно асимметричен?', 'איזה חיבור אינטרנט משתמש בקו הטלפון והוא בדרך כלל אסימטרי?'],
      ['DSL', ['Cable', 'Кабельный', 'כבלים'], ['Metro Ethernet', 'Metro Ethernet', 'Metro Ethernet'], ['Satellite', 'Спутник', 'לוויין']], 0,
      ['Cable uses the cable-TV network (DOCSIS).', 'Кабельный доступ использует сеть кабельного ТВ (DOCSIS).', 'חיבור כבלים משתמש ברשת הטלוויזיה בכבלים (DOCSIS).']),
    lQ(['A company has one link to Bezeq and one link to Partner. What is this?', 'У компании один канал к Bezeq и один к Partner. Как это называется?', 'לחברה יש קישור אחד לבזק וקישור אחד לפרטנר. איך זה נקרא?'],
      ['Multihomed', 'Dual-homed', 'Single-homed', 'Dual-multihomed'], 0,
      ['Two different ISPs = multihomed; two links to the same ISP = dual-homed.', 'Два разных провайдера — multihomed; два канала к одному — dual-homed.', 'שני ספקים שונים = multihomed; שני קישורים לאותו ספק = dual-homed.']),
    lQ(['What is the speed of an E1 line?', 'Какая скорость у линии E1?', 'מה המהירות של קו E1?'],
      ['2.048 Mbps', '1.544 Mbps', '44.7 Mbps', '64 kbps'], 0,
      ['T1 (North America) = 1.544 Mbps; E1 (Europe, Israel) = 2.048 Mbps.', 'T1 (Северная Америка) — 1,544 Мбит/с; E1 (Европа, Израиль) — 2,048 Мбит/с.', 'T1 (צפון אמריקה) = ‏1.544 Mbps; ‏E1 (אירופה, ישראל) = ‏2.048 Mbps.']),
    lQ(['What is the main weakness of hub-and-spoke?', 'Главная слабость топологии «звезда»?', 'מהי החולשה העיקרית של טופולוגיית כוכב?'],
      [['The hub is a single point of failure', 'Центр — единая точка отказа', 'המרכז הוא נקודת כשל יחידה'], ['It needs too many links', 'Нужно слишком много каналов', 'צריך יותר מדי קישורים'], ['Spokes cannot reach the hub', 'Филиалы не достают до центра', 'הסניפים לא מגיעים למרכז'], ['It only works with MPLS', 'Работает только с MPLS', 'זה עובד רק עם MPLS']], 0,
      ['Spoke-to-spoke traffic also has to cross the hub.', 'Трафик между филиалами тоже идёт через центр.', 'גם תעבורה בין סניפים חייבת לעבור דרך המרכז.']),
  ],
  gen: [
    function genMeshLinks(rng) {
      const n = rng.int(4, 12), full = rng.chance(0.7), right = full ? n * (n - 1) / 2 : n - 1;
      return lGen(full ? T('How many point-to-point links does a full mesh of ' + n + ' sites need?', 'Сколько каналов точка-точка нужно для полносвязной сети из ' + n + ' площадок?', 'כמה קישורי נקודה-לנקודה צריך לרשת מלאה (full mesh) של ' + n + ' אתרים?')
        : T('A hub-and-spoke WAN has ' + n + ' sites (one of them is the hub). How many links are needed?', 'В WAN «звезда» ' + n + ' площадок (одна из них — центр). Сколько нужно каналов?', 'ב-WAN בטופולוגיית כוכב יש ' + n + ' אתרים (אחד מהם הוא המרכז). כמה קישורים צריך?'),
        String(right), [n * (n - 1), n, n - 1, n * (n - 1) / 2, n * (n + 1) / 2, n - 2].map(String).filter((x) => x !== String(right)),
        full ? T('Full mesh: n(n − 1)/2 = ' + n + '·' + (n - 1) + '/2 = ' + right + '.', 'Полносвязная: n(n − 1)/2 = ' + n + '·' + (n - 1) + '/2 = ' + right + '.', 'רשת מלאה: n(n − 1)/2 = ' + n + '·' + (n - 1) + '/2 = ' + right + '.')
          : T('Hub-and-spoke: every spoke has one link to the hub → n − 1 = ' + right + '.', 'Звезда: у каждого филиала один канал к центру → n − 1 = ' + right + '.', 'כוכב: לכל סניף קישור אחד למרכז → n − 1 = ' + right + '.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'ensa08', topic: null, minutes: 15,
  title: T('VPN and IPsec concepts', 'VPN и IPsec', 'עקרונות VPN ו-IPsec'),
  goal: T('What a VPN is, site-to-site vs remote-access, SSL/TLS vs IPsec, GRE over IPsec, DMVPN, IPsec VTI, provider MPLS VPNs, and the five parts of the IPsec framework.',
    'Что такое VPN, VPN «сеть–сеть» и удалённого доступа, SSL/TLS и IPsec, GRE поверх IPsec, DMVPN, IPsec VTI, MPLS VPN провайдера и пять частей фреймворка IPsec.',
    'מה זה VPN, ‏site-to-site מול גישה מרחוק, ‏SSL/TLS מול IPsec, ‏GRE over IPsec, ‏DMVPN, ‏IPsec VTI, ‏MPLS VPN של ספק, וחמשת חלקי מסגרת IPsec.'),
  sections: [
    lSec(['What a VPN is', 'Что такое VPN', 'מה זה VPN'],
      lP(['A virtual private network is a private, usually encrypted tunnel across a public network such as the Internet. Benefits: cost savings (no leased lines), security (encryption and authentication), scalability (add sites with an Internet link) and compatibility with almost any access technology.',
        'Виртуальная частная сеть — частный, обычно зашифрованный туннель через публичную сеть, например Интернет. Плюсы: экономия (не нужны выделенные линии), безопасность (шифрование и аутентификация), масштабируемость (новые площадки — просто с доступом в Интернет) и совместимость почти с любой технологией доступа.',
        'רשת פרטית וירטואלית היא מנהרה פרטית, בדרך כלל מוצפנת, על גבי רשת ציבורית כמו האינטרנט. יתרונות: חיסכון (לא צריך קווים חכורים), אבטחה (הצפנה ואימות), גמישות בגדילה (מוסיפים אתר עם חיבור אינטרנט) ותאימות כמעט לכל טכנולוגיית גישה.']),
      lUL([
        ['Enterprise-managed VPNs are built by the company itself (site-to-site, remote-access).', 'VPN, управляемые предприятием, компания строит сама («сеть–сеть», удалённый доступ).', 'VPN שמנוהל ע"י הארגון — החברה בונה אותו בעצמה (site-to-site, גישה מרחוק).'],
        ['Provider-managed VPNs are built by the service provider over its MPLS network: Layer 3 MPLS VPN or Layer 2 MPLS VPN (VPLS).', 'VPN, управляемые провайдером, провайдер строит в своей сети MPLS: MPLS VPN 3-го уровня или 2-го уровня (VPLS).', 'VPN שמנוהל ע"י הספק — הספק בונה אותו ברשת ה-MPLS שלו: ‏MPLS VPN בשכבה 3 או בשכבה 2 ‏(VPLS).'],
      ])),
    lSec(['Site-to-site and remote-access', '«Сеть–сеть» и удалённый доступ', 'Site-to-site וגישה מרחוק'],
      lUL([
        ['Site-to-site: VPN gateways (routers or firewalls) at both sites build a permanent tunnel. Hosts send normal traffic and do not know about the VPN.', '«Сеть–сеть»: VPN-шлюзы (роутеры или межсетевые экраны) на обеих площадках строят постоянный туннель. Хосты шлют обычный трафик и о VPN не знают.', 'Site-to-site: שערי VPN (נתבים או חומות אש) בשני האתרים בונים מנהרה קבועה. המארחים שולחים תעבורה רגילה ולא יודעים על ה-VPN.'],
        ['Remote-access: a single user (teleworker, laptop on the road) connects to the company when needed — with a VPN client (Cisco AnyConnect / Secure Client) or clientless through a web browser.', 'Удалённый доступ: отдельный пользователь (надомник, ноутбук в поездке) подключается к компании по необходимости — через VPN-клиент (Cisco AnyConnect / Secure Client) или без клиента, через браузер.', 'גישה מרחוק: משתמש בודד (עובד מהבית, מחשב נייד בדרכים) מתחבר לחברה כשצריך — עם לקוח VPN ‏(Cisco AnyConnect / Secure Client) או בלי לקוח, דרך דפדפן.'],
      ]),
      lTable(['', 'SSL/TLS VPN', 'IPsec VPN'], [
        [['Applications', 'Приложения', 'יישומים'], ['Web-based apps, file sharing (clientless); everything with a client', 'Веб-приложения, общие файлы (без клиента); всё — с клиентом', 'יישומי web ושיתוף קבצים (בלי לקוח); הכול — עם לקוח'], ['All IP-based applications', 'Все IP-приложения', 'כל היישומים מבוססי IP']],
        [['Authentication', 'Аутентификация', 'אימות'], ['Moderate (one-way or two-way)', 'Средняя (одно- или двусторонняя)', 'בינונית (חד- או דו-כיוונית)'], ['Strong (two-way, PSK or certificates)', 'Сильная (двусторонняя, PSK или сертификаты)', 'חזקה (דו-כיוונית, ‏PSK או תעודות)']],
        [['Connection', 'Подключение', 'חיבור'], ['Any device with a browser', 'Любое устройство с браузером', 'כל התקן עם דפדפן'], ['Only devices with a configured client or gateway', 'Только настроенные устройства с клиентом или шлюзом', 'רק התקנים עם לקוח או שער מוגדרים']],
        [['Complexity', 'Сложность', 'מורכבות'], ['Low', 'Низкая', 'נמוכה'], ['Higher', 'Выше', 'גבוהה יותר']],
      ])),
    lSec(['Enterprise VPN types', 'Типы VPN предприятия', 'סוגי VPN בארגון'],
      lUL([
        ['GRE over IPsec — IPsec alone carries only unicast. GRE wraps multicast and routing-protocol traffic (OSPF, EIGRP) in a unicast tunnel, and IPsec then encrypts it.', 'GRE поверх IPsec — сам IPsec переносит только unicast. GRE заворачивает multicast и трафик протоколов маршрутизации (OSPF, EIGRP) в unicast-туннель, а IPsec его шифрует.', 'GRE over IPsec — ‏IPsec לבד נושא רק unicast. ‏GRE עוטף multicast ותעבורת פרוטוקולי ניתוב (OSPF, ‏EIGRP) במנהרת unicast, ו-IPsec מצפין אותה.'],
        ['DMVPN — Dynamic Multipoint VPN: configured like hub-and-spoke, but spokes build direct spoke-to-spoke tunnels on demand (mGRE + NHRP + IPsec).', 'DMVPN — Dynamic Multipoint VPN: настраивается как «звезда», но филиалы по необходимости строят прямые туннели между собой (mGRE + NHRP + IPsec).', 'DMVPN — ‏Dynamic Multipoint VPN: מוגדר כמו כוכב, אבל הסניפים בונים לפי הצורך מנהרות ישירות ביניהם (mGRE + NHRP + IPsec).'],
        ['IPsec VTI — a virtual tunnel interface that is IPsec itself: it carries unicast and multicast without GRE and is easy to configure.', 'IPsec VTI — виртуальный туннельный интерфейс, который сам является IPsec: переносит unicast и multicast без GRE и прост в настройке.', 'IPsec VTI — ממשק מנהרה וירטואלי שהוא IPsec בעצמו: נושא unicast ו-multicast בלי GRE, וקל להגדרה.'],
      ])),
    lSec(['The IPsec framework', 'Фреймворк IPsec', 'מסגרת IPsec'],
      lP(['IPsec is an open framework, not one algorithm: each of its five building blocks can use different algorithms, so new and stronger ones can be added. IKE (UDP 500, and 4500 for NAT traversal) negotiates the security associations (SAs) between the peers.',
        'IPsec — открытый фреймворк, а не один алгоритм: каждая из пяти его частей может использовать разные алгоритмы, поэтому можно добавлять новые, более стойкие. IKE (UDP 500, а для прохода через NAT — 4500) согласует между сторонами ассоциации безопасности (SA).',
        'IPsec הוא מסגרת פתוחה ולא אלגוריתם אחד: כל אחד מחמשת חלקיו יכול להשתמש באלגוריתמים שונים, כך שאפשר להוסיף חדשים וחזקים יותר. ‏IKE ‏(UDP 500, ו-4500 למעבר דרך NAT) מנהל משא ומתן על ה-SA ‏(security associations) בין הצדדים.']),
      lTable([['Building block', 'Часть', 'רכיב'], ['Choices', 'Варианты', 'אפשרויות']], [
        [['IPsec protocol', 'Протокол IPsec', 'פרוטוקול IPsec'], ['ESP (IP protocol 50) — encryption + integrity + authentication; AH (IP 51) — integrity + authentication, no encryption', 'ESP (IP-протокол 50) — шифрование + целостность + аутентификация; AH (IP 51) — целостность + аутентификация, без шифрования', 'ESP ‏(IP protocol 50) — הצפנה + שלמות + אימות; ‏AH ‏(IP 51) — שלמות + אימות, בלי הצפנה']],
        [['Confidentiality', 'Конфиденциальность', 'סודיות'], ['AES (recommended), SEAL; DES and 3DES are legacy', 'AES (рекомендуется), SEAL; DES и 3DES устарели', 'AES (מומלץ), ‏SEAL; ‏DES ו-3DES מיושנים']],
        [['Integrity', 'Целостность', 'שלמות'], ['SHA-256, SHA-384 (HMAC); MD5 and SHA-1 are legacy', 'SHA-256, SHA-384 (HMAC); MD5 и SHA-1 устарели', 'SHA-256, ‏SHA-384 ‏(HMAC); ‏MD5 ו-SHA-1 מיושנים']],
        [['Authentication', 'Аутентификация', 'אימות'], ['Pre-shared key (PSK) or RSA digital signatures (certificates)', 'Общий ключ (PSK) или цифровые подписи RSA (сертификаты)', 'מפתח משותף (PSK) או חתימות דיגיטליות RSA (תעודות)']],
        ['Diffie-Hellman', ['Secure key exchange; groups 14, 15, 16, 19, 20, 21, 24 (1, 2, 5 are weak)', 'Безопасный обмен ключами; группы 14, 15, 16, 19, 20, 21, 24 (1, 2, 5 слабые)', 'החלפת מפתחות מאובטחת; קבוצות 14, ‏15, ‏16, ‏19, ‏20, ‏21, ‏24 (1, ‏2, ‏5 חלשות)']],
      ]),
      lCode('R1# show crypto isakmp sa\ndst             src             state          conn-id status\n209.165.201.1   209.165.200.226 QM_IDLE           1001 ACTIVE\nR1# show crypto ipsec sa | include encaps|decaps\n    #pkts encaps: 124, #pkts encrypt: 124, #pkts digest: 124\n    #pkts decaps: 118, #pkts decrypt: 118, #pkts verify: 118',
        ['Checking a working tunnel (configuring IPsec is CCNP level)', 'Проверка работающего туннеля (настройка IPsec — уровень CCNP)', 'בדיקת מנהרה עובדת (הגדרת IPsec היא ברמת CCNP)']),
      lTip(['AH protects the IP header too, so it breaks through NAT. That is one more reason ESP is used almost everywhere.', 'AH защищает и IP-заголовок, поэтому ломается при NAT. Ещё одна причина, почему почти везде используют ESP.', 'AH מגן גם על כותרת ה-IP, ולכן הוא נשבר כשיש NAT. עוד סיבה לכך ש-ESP משמש כמעט בכל מקום.'])),
  ],
  quiz: [
    lQ(['Which VPN connects whole networks, with hosts that do not know a VPN exists?', 'Какой VPN соединяет целые сети, а хосты даже не знают о VPN?', 'איזה VPN מחבר רשתות שלמות, כשהמארחים לא יודעים שיש VPN?'],
      [['Site-to-site VPN', 'VPN «сеть–сеть»', 'VPN מסוג site-to-site'], ['Clientless remote-access VPN', 'VPN удалённого доступа без клиента', 'VPN לגישה מרחוק בלי לקוח'], ['Client-based remote-access VPN', 'VPN удалённого доступа с клиентом', 'VPN לגישה מרחוק עם לקוח'], ['A dial-up connection', 'Коммутируемое подключение', 'חיבור חיוג']], 0,
      ['The gateways at both ends encrypt and decrypt.', 'Шифруют и расшифровывают шлюзы на обоих концах.', 'השערים בשני הקצוות מצפינים ומפענחים.']),
    lQ(['A teleworker connects from a hotel PC using only a web browser. Which VPN is this?', 'Сотрудник подключается с компьютера в отеле, используя только браузер. Какой это VPN?', 'עובד מתחבר ממחשב במלון רק עם דפדפן. איזה VPN זה?'],
      [['Clientless SSL/TLS VPN', 'SSL/TLS VPN без клиента', 'SSL/TLS VPN בלי לקוח'], ['Site-to-site IPsec VPN', 'IPsec VPN «сеть–сеть»', 'IPsec VPN מסוג site-to-site'], ['DMVPN', 'DMVPN', 'DMVPN'], ['MPLS VPN', 'MPLS VPN', 'MPLS VPN']], 0,
      ['The browser\'s HTTPS (TLS) protects the session.', 'Сессию защищает HTTPS (TLS) браузера.', 'ה-HTTPS ‏(TLS) של הדפדפן מגן על הסשן.']),
    lQ(['Which IPsec protocol provides encryption?', 'Какой протокол IPsec обеспечивает шифрование?', 'איזה פרוטוקול IPsec נותן הצפנה?'],
      ['ESP', 'AH', 'IKE', 'GRE'], 0,
      ['AH gives integrity and authentication only.', 'AH даёт только целостность и аутентификацию.', 'AH נותן רק שלמות ואימות.']),
    lQ(['What does Diffie-Hellman provide?', 'Что обеспечивает Diffie-Hellman?', 'מה נותן Diffie-Hellman?'],
      [['A way to create a shared secret key over an insecure network', 'Способ получить общий секретный ключ по незащищённой сети', 'דרך ליצור מפתח סודי משותף ברשת לא מאובטחת'], ['Encryption of the data', 'Шифрование данных', 'הצפנת המידע'], ['Integrity checking', 'Проверку целостности', 'בדיקת שלמות'], ['Compression', 'Сжатие', 'דחיסה']], 0,
      ['The key itself is never sent.', 'Сам ключ никогда не передаётся.', 'המפתח עצמו אף פעם לא נשלח.']),
    lQ(['Why run GRE over IPsec?', 'Зачем использовать GRE поверх IPsec?', 'למה מריצים GRE over IPsec?'],
      [['IPsec alone carries only unicast; GRE lets routing protocols and multicast through', 'Сам IPsec переносит только unicast; GRE пропускает протоколы маршрутизации и multicast', 'IPsec לבד נושא רק unicast; ‏GRE מעביר פרוטוקולי ניתוב ו-multicast'], ['GRE encrypts better than IPsec', 'GRE шифрует лучше IPsec', 'GRE מצפין טוב יותר מ-IPsec'], ['To avoid needing keys', 'Чтобы не нужны были ключи', 'כדי שלא יהיה צורך במפתחות'], ['To make the tunnel faster', 'Чтобы туннель был быстрее', 'כדי שהמנהרה תהיה מהירה יותר']], 0,
      ['GRE itself does not encrypt anything.', 'Сам GRE ничего не шифрует.', 'GRE עצמו לא מצפין כלום.']),
    lQ(['Which algorithm is recommended for IPsec confidentiality?', 'Какой алгоритм рекомендуется для конфиденциальности в IPsec?', 'איזה אלגוריתם מומלץ לסודיות ב-IPsec?'],
      ['AES', 'DES', 'MD5', 'SHA-1'], 0,
      ['MD5 and SHA are for integrity, and DES is broken.', 'MD5 и SHA — для целостности, а DES взломан.', 'MD5 ו-SHA הם לשלמות, ו-DES פרוץ.']),
    lQ(['What is the main benefit of DMVPN?', 'Главное преимущество DMVPN?', 'מה היתרון העיקרי של DMVPN?'],
      [['Spokes build direct tunnels to each other on demand', 'Филиалы по необходимости строят прямые туннели друг к другу', 'סניפים בונים מנהרות ישירות זה לזה לפי הצורך'], ['No encryption is needed', 'Шифрование не нужно', 'לא צריך הצפנה'], ['It replaces the Internet link', 'Заменяет подключение к Интернету', 'הוא מחליף את חיבור האינטרנט'], ['It only works between two sites', 'Работает только между двумя площадками', 'הוא עובד רק בין שני אתרים']], 0,
      ['You configure only hub-and-spoke, yet get spoke-to-spoke paths.', 'Настраивается только «звезда», а пути между филиалами получаются сами.', 'מגדירים רק כוכב, ומקבלים נתיבים ישירים בין הסניפים.']),
    lQ(['Which two methods can authenticate IPsec peers?', 'Какими двумя способами можно аутентифицировать стороны IPsec?', 'באילו שתי שיטות אפשר לאמת צדדים ב-IPsec?'],
      [['Pre-shared keys or RSA certificates', 'Общий ключ (PSK) или сертификаты RSA', 'מפתח משותף (PSK) או תעודות RSA'], ['AES or 3DES', 'AES или 3DES', 'AES או 3DES'], ['MD5 or SHA', 'MD5 или SHA', 'MD5 או SHA'], ['DH group 2 or 5', 'Группа DH 2 или 5', 'קבוצת DH ‏2 או 5']], 0,
      ['AES/3DES are for confidentiality, MD5/SHA for integrity.', 'AES/3DES — для конфиденциальности, MD5/SHA — для целостности.', 'AES/3DES לסודיות, ‏MD5/SHA לשלמות.']),
    lQ(['Which VPN is built and managed by the service provider?', 'Какой VPN строит и обслуживает провайдер?', 'איזה VPN נבנה ומנוהל ע"י ספק השירות?'],
      ['Layer 3 MPLS VPN', 'GRE over IPsec', 'DMVPN', ['Clientless SSL VPN', 'SSL VPN без клиента', 'SSL VPN בלי לקוח']], 0,
      ['The customer just connects its sites to the provider\'s MPLS network.', 'Клиент просто подключает свои площадки к MPLS-сети провайдера.', 'הלקוח רק מחבר את האתרים שלו לרשת ה-MPLS של הספק.']),
  ],
});

// ---------------------------------------------------------------
// DSCP: AFxy = 8x + 2y, CSn = 8n, EF = 46.
function e2Dscp(name) {
  if (name === 'EF') return 46;
  if (name.startsWith('CS')) return 8 * Number(name[2]);
  return 8 * Number(name[2]) + 2 * Number(name[3]);
}

lessonDef({
  id: 'ensa09', topic: null, drill: 'ops', minutes: 16, genInQuiz: 1,
  title: T('QoS concepts', 'Принципы QoS', 'עקרונות QoS'),
  goal: T('Why congestion causes delay, jitter and loss, what voice, video and data need, queuing algorithms, the three QoS models, and the QoS tools: classification and marking (CoS, DSCP), congestion avoidance, shaping and policing.',
    'Почему перегрузка вызывает задержку, джиттер и потери, что нужно голосу, видео и данным, алгоритмы очередей, три модели QoS и инструменты QoS: классификация и маркировка (CoS, DSCP), предотвращение перегрузки, шейпинг и полисинг.',
    'למה עומס גורם להשהיה, לג׳יטר ולאובדן חבילות, מה צריכים קול, וידאו ונתונים, אלגוריתמי תורים, שלושת מודלי ה-QoS, וכלי QoS: סיווג וסימון (CoS, ‏DSCP), מניעת עומס, ‏shaping ו-policing.'),
  sections: [
    lSec(['Delay, jitter and loss', 'Задержка, джиттер и потери', 'השהיה, ג׳יטר ואובדן'],
      lP(['Congestion happens when more traffic arrives than an outgoing link can send — many links aggregating into one uplink, a fast LAN feeding a slow WAN. Packets wait in a queue, and when the queue is full new packets are dropped (tail drop).',
        'Перегрузка возникает, когда трафика приходит больше, чем исходящий канал может отправить: много каналов сходятся в один аплинк, быстрая LAN подаёт трафик в медленный WAN. Пакеты ждут в очереди, а когда она полна, новые отбрасываются (tail drop).',
        'עומס (congestion) קורה כשמגיעה יותר תעבורה ממה שקישור היציאה יכול לשלוח — הרבה קישורים מתנקזים ל-uplink אחד, ‏LAN מהיר מזין WAN איטי. חבילות מחכות בתור, וכשהתור מלא חבילות חדשות נזרקות (tail drop).']),
      lUL([
        ['Delay (latency): fixed parts (serialization, propagation) plus variable queuing delay.', 'Задержка: постоянные части (сериализация, распространение) плюс переменная задержка в очереди.', 'השהיה (latency): חלקים קבועים (serialization, ‏propagation) ועוד השהיה משתנה בתור.'],
        ['Jitter: variation of delay between packets. A de-jitter buffer smooths small jitter for voice and video.', 'Джиттер: разброс задержки между пакетами. Буфер de-jitter сглаживает небольшой джиттер для голоса и видео.', 'ג׳יטר: השונות בהשהיה בין חבילות. חוצץ de-jitter מחליק ג׳יטר קטן עבור קול ווידאו.'],
        ['Packet loss: dropped packets. TCP resends them; voice and video cannot.', 'Потери: отброшенные пакеты. TCP их перешлёт; голос и видео — нет.', 'אובדן חבילות: חבילות שנזרקו. ‏TCP שולח אותן שוב; קול ווידאו לא יכולים.'],
      ])),
    lSec(['What traffic needs', 'Что нужно разному трафику', 'מה כל סוג תעבורה צריך'],
      lTable(['', ['Voice', 'Голос', 'קול'], ['Video', 'Видео', 'וידאו'], ['Data', 'Данные', 'נתונים']], [
        [['Behaviour', 'Поведение', 'התנהגות'], ['Smooth, benign, UDP', 'Ровный, «скромный», UDP', 'אחיד, צנוע, UDP'], ['Bursty, greedy, UDP', 'Всплески, «жадный», UDP', 'מתפרץ, חמדן, UDP'], ['Smooth or bursty, mostly TCP', 'Ровный или всплесками, в основном TCP', 'אחיד או מתפרץ, בעיקר TCP']],
        [['One-way delay', 'Задержка в одну сторону', 'השהיה בכיוון אחד'], '≤ 150 ms', '≤ 200–400 ms', ['Tolerant', 'Не критична', 'סובלני']],
        [['Jitter', 'Джиттер', 'ג׳יטר'], '≤ 30 ms', '≤ 30–50 ms', ['Tolerant', 'Не критичен', 'סובלני']],
        [['Loss', 'Потери', 'אובדן'], '≤ 1%', '≤ 0.1–1%', ['Resent by TCP', 'Пересылается TCP', 'נשלח שוב ע"י TCP']],
      ])),
    lSec(['Queuing algorithms', 'Алгоритмы очередей', 'אלגוריתמי תורים'],
      lTable([['Algorithm', 'Алгоритм', 'אלגוריתם'], ['How it works', 'Как работает', 'איך זה עובד']], [
        ['FIFO', ['First in, first out; no priority. Default on fast interfaces', 'Первым пришёл — первым ушёл; без приоритетов. По умолчанию на быстрых интерфейсах', 'נכנס ראשון — יוצא ראשון; בלי עדיפויות. ברירת המחדל בממשקים מהירים']],
        ['WFQ', ['Weighted fair queuing: flows share the link fairly; small flows are not starved', 'Взвешенная справедливая очередь: потоки делят канал честно, мелкие не голодают', 'Weighted fair queuing: הזרמים חולקים את הקישור בהגינות, זרמים קטנים לא מורעבים']],
        ['CBWFQ', ['Class-based WFQ: you define classes and guarantee each a share of bandwidth', 'WFQ по классам: вы задаёте классы и гарантируете каждому долю полосы', 'WFQ לפי מחלקות: מגדירים מחלקות ומבטיחים לכל אחת חלק מרוחב הפס']],
        ['LLQ', ['Low latency queuing: CBWFQ plus a strict-priority queue for voice', 'Очередь с малой задержкой: CBWFQ плюс очередь строгого приоритета для голоса', 'Low latency queuing: ‏CBWFQ ועוד תור עדיפות מוחלטת לקול']],
      ])),
    lSec(['QoS models', 'Модели QoS', 'מודלי QoS'],
      lUL([
        ['Best effort — no QoS at all; every packet is treated the same. Simple and scalable, no guarantees.', 'Best effort — никакого QoS, все пакеты равны. Просто и масштабируемо, но без гарантий.', 'Best effort — בלי QoS בכלל; כל החבילות שוות. פשוט וגדל בקלות, בלי הבטחות.'],
        ['IntServ — each application reserves resources end-to-end with RSVP before sending. Hard guarantees, but every router keeps per-flow state — it does not scale.', 'IntServ — каждое приложение резервирует ресурсы от начала до конца через RSVP до отправки. Жёсткие гарантии, но каждый роутер хранит состояние каждого потока — не масштабируется.', 'IntServ — כל יישום שומר משאבים מקצה לקצה בעזרת RSVP לפני השליחה. הבטחות קשיחות, אבל כל נתב שומר מצב לכל זרם — לא גדל.'],
        ['DiffServ — traffic is classified and marked at the edge; each router gives a per-hop behaviour (PHB) by marking. Scalable, "soft" guarantees — the model used in practice.', 'DiffServ — трафик классифицируется и маркируется на краю сети; каждый роутер применяет поведение на хопе (PHB) по метке. Масштабируется, «мягкие» гарантии — модель, которую используют на практике.', 'DiffServ — התעבורה מסווגת ומסומנת בקצה הרשת; כל נתב מפעיל התנהגות לכל קפיצה (PHB) לפי הסימון. גדל בקלות, הבטחות "רכות" — המודל שמשתמשים בו בפועל.'],
      ])),
    lSec(['QoS tools and markings', 'Инструменты и маркировки QoS', 'כלי QoS וסימונים'],
      lUL([
        ['Classification and marking — as close to the source as possible. The trust boundary is where the network starts trusting markings (often the IP phone or the access switch).', 'Классификация и маркировка — как можно ближе к источнику. Граница доверия — место, где сеть начинает доверять меткам (часто IP-телефон или коммутатор доступа).', 'סיווג וסימון — קרוב ככל האפשר למקור. גבול האמון (trust boundary) הוא המקום שבו הרשת מתחילה לסמוך על הסימונים (לרוב טלפון ה-IP או מתג הגישה).'],
        ['Layer 2: CoS — 3 bits in the 802.1Q tag (0–7, voice = 5). Layer 3: DSCP — 6 bits in the IP header (0–63).', '2-й уровень: CoS — 3 бита в теге 802.1Q (0–7, голос = 5). 3-й уровень: DSCP — 6 бит в IP-заголовке (0–63).', 'שכבה 2: ‏CoS — ‏3 סיביות בתג 802.1Q ‏(0–7, קול = 5). שכבה 3: ‏DSCP — ‏6 סיביות בכותרת ה-IP ‏(0–63).'],
        ['DSCP values: default/BE = 0, EF = 46 (voice), AFxy = 8x + 2y (class x 1–4, drop precedence y 1–3 — higher y is dropped first), CSn = 8n.', 'Значения DSCP: по умолчанию/BE = 0, EF = 46 (голос), AFxy = 8x + 2y (класс x 1–4, приоритет отбрасывания y 1–3 — с большим y отбрасывается первым), CSn = 8n.', 'ערכי DSCP: ברירת מחדל/BE = 0, ‏EF = 46 (קול), ‏AFxy = 8x + 2y (מחלקה x ‏1–4, עדיפות זריקה y ‏1–3 — y גבוה נזרק קודם), ‏CSn = 8n.'],
        ['Congestion avoidance — WRED drops some TCP packets early, before the queue is full, so TCP senders slow down.', 'Предотвращение перегрузки — WRED заранее отбрасывает часть TCP-пакетов, до заполнения очереди, чтобы TCP-отправители замедлились.', 'מניעת עומס — WRED זורק מראש חלק מחבילות ה-TCP, לפני שהתור מתמלא, כדי שהשולחים ב-TCP יאטו.'],
        ['Shaping buffers the excess and sends it later (smooth, adds delay, outbound only). Policing drops or re-marks the excess (inbound or outbound — ISPs police customers).', 'Шейпинг буферизует излишек и отправляет позже (сглаживает, добавляет задержку, только на выход). Полисинг отбрасывает или перемаркирует излишек (на вход или выход — провайдеры полисят клиентов).', 'Shaping שומר את העודף בחוצץ ושולח אותו אחר כך (מחליק, מוסיף השהיה, רק ביציאה). ‏Policing זורק או מסמן מחדש את העודף (בכניסה או ביציאה — ספקים עושים policing ללקוחות).'],
      ]),
      lCode('R1(config)# class-map match-any VOICE\nR1(config-cmap)# match dscp ef\nR1(config)# policy-map WAN-EDGE\nR1(config-pmap)# class VOICE\nR1(config-pmap-c)# priority percent 20\nR1(config-pmap)# class class-default\nR1(config-pmap-c)# fair-queue\nR1(config)# interface s0/1/0\nR1(config-if)# service-policy output WAN-EDGE',
        ['LLQ with the Modular QoS CLI: voice gets a priority queue, everything else fair queuing', 'LLQ в Modular QoS CLI: голосу — приоритетная очередь, остальным — справедливая', 'LLQ ב-Modular QoS CLI: לקול תור עדיפות, לכל השאר fair queuing'])),
  ],
  quiz: [
    lQ(['What is jitter?', 'Что такое джиттер?', 'מה זה ג׳יטר?'],
      [['The variation in delay between packets', 'Разброс задержки между пакетами', 'השונות בהשהיה בין חבילות'], ['Total one-way delay', 'Полная задержка в одну сторону', 'ההשהיה הכוללת בכיוון אחד'], ['Lost packets', 'Потерянные пакеты', 'חבילות שאבדו'], ['Link speed', 'Скорость канала', 'מהירות הקישור']], 0,
      ['Voice needs jitter ≤ 30 ms.', 'Голосу нужен джиттер ≤ 30 мс.', 'קול צריך ג׳יטר ≤ 30 ms.']),
    lQ(['What maximum one-way delay does voice tolerate?', 'Какую максимальную задержку в одну сторону выдерживает голос?', 'מהי ההשהיה המרבית בכיוון אחד שקול סובל?'],
      ['150 ms', '1 s', '500 ms', '10 ms'], 0,
      ['Beyond about 150 ms people start talking over each other.', 'При задержке больше ~150 мс собеседники начинают перебивать друг друга.', 'מעבר ל-150 ms בערך אנשים מתחילים לדבר זה על זה.']),
    lQ(['Which queuing method gives voice a strict-priority queue?', 'Какой метод очередей даёт голосу очередь строгого приоритета?', 'איזו שיטת תורים נותנת לקול תור עדיפות מוחלטת?'],
      ['LLQ', 'FIFO', 'WFQ', 'CBWFQ'], 0,
      ['LLQ = CBWFQ + a priority queue.', 'LLQ = CBWFQ + приоритетная очередь.', 'LLQ = ‏CBWFQ ועוד תור עדיפות.']),
    lQ(['Which QoS model reserves resources end-to-end with RSVP?', 'Какая модель QoS резервирует ресурсы от начала до конца через RSVP?', 'איזה מודל QoS שומר משאבים מקצה לקצה בעזרת RSVP?'],
      ['IntServ', 'DiffServ', 'Best effort', 'CoS'], 0,
      ['Hard guarantees, but it does not scale.', 'Жёсткие гарантии, но не масштабируется.', 'הבטחות קשיחות, אבל לא גדל.']),
    lQ(['Which DSCP marking is used for voice?', 'Какая DSCP-метка используется для голоса?', 'באיזה סימון DSCP משתמשים לקול?'],
      ['EF (46)', 'AF41 (34)', 'CS1 (8)', 'BE (0)'], 0,
      ['Expedited Forwarding — low delay, low jitter, low loss.', 'Expedited Forwarding — малая задержка, джиттер и потери.', 'Expedited Forwarding — השהיה, ג׳יטר ואובדן נמוכים.']),
    lQ(['Where should traffic be classified and marked?', 'Где нужно классифицировать и маркировать трафик?', 'היכן צריך לסווג ולסמן תעבורה?'],
      [['As close to the source as possible', 'Как можно ближе к источнику', 'קרוב ככל האפשר למקור'], ['Only on the core', 'Только в ядре', 'רק בליבה'], ['At the destination server', 'На сервере-получателе', 'בשרת היעד'], ['At the ISP', 'У провайдера', 'אצל הספק']], 0,
      ['Then every router on the path can use the marking.', 'Тогда каждый роутер на пути может использовать метку.', 'כך כל נתב בדרך יכול להשתמש בסימון.']),
    lQ(['Which tool buffers excess traffic and sends it later?', 'Какой инструмент буферизует излишек трафика и отправляет его позже?', 'איזה כלי שומר בחוצץ את עודף התעבורה ושולח אותו אחר כך?'],
      [['Shaping', 'Шейпинг', 'Shaping'], ['Policing', 'Полисинг', 'Policing'], ['WRED', 'WRED', 'WRED'], ['Marking', 'Маркировка', 'סימון']], 0,
      ['Policing drops or re-marks the excess instead.', 'Полисинг вместо этого отбрасывает или перемаркирует излишек.', 'Policing זורק או מסמן מחדש את העודף במקום זה.']),
    lQ(['Where is the CoS value carried?', 'Где передаётся значение CoS?', 'היכן נמצא ערך ה-CoS?'],
      [['In 3 bits of the 802.1Q tag', 'В 3 битах тега 802.1Q', 'ב-3 סיביות של תג 802.1Q'], ['In 6 bits of the IP header', 'В 6 битах IP-заголовка', 'ב-6 סיביות של כותרת ה-IP'], ['In the TCP header', 'В TCP-заголовке', 'בכותרת ה-TCP'], ['In the MAC address', 'В MAC-адресе', 'בכתובת ה-MAC']], 0,
      ['6 bits in the IP header = DSCP.', '6 бит в IP-заголовке — это DSCP.', '6 סיביות בכותרת ה-IP = ‏DSCP.']),
    lQ(['What does WRED do?', 'Что делает WRED?', 'מה עושה WRED?'],
      [['Drops some packets early, before the queue is full, so TCP slows down', 'Заранее отбрасывает часть пакетов, до заполнения очереди, чтобы TCP замедлился', 'זורק חלק מהחבילות מוקדם, לפני שהתור מלא, כדי ש-TCP יאט'], ['Encrypts voice', 'Шифрует голос', 'מצפין קול'], ['Reserves bandwidth with RSVP', 'Резервирует полосу через RSVP', 'שומר רוחב פס בעזרת RSVP'], ['Marks traffic with EF', 'Маркирует трафик EF', 'מסמן תעבורה ב-EF']], 0,
      ['It avoids tail drop hitting all TCP flows at once.', 'Так tail drop не бьёт по всем TCP-потокам одновременно.', 'כך tail drop לא פוגע בכל זרמי ה-TCP בבת אחת.']),
    lQ(['AF41 and AF43 are in the same class. Which is dropped first during congestion?', 'AF41 и AF43 — один класс. Что отбрасывается первым при перегрузке?', 'AF41 ו-AF43 באותה מחלקה. מה נזרק קודם בעומס?'],
      ['AF43', 'AF41', ['Both equally', 'Оба одинаково', 'שניהם באותה מידה'], ['Neither — AF is never dropped', 'Ни один — AF не отбрасывается', 'אף אחד — AF אף פעם לא נזרק']], 0,
      ['The second digit is the drop precedence: higher = dropped earlier.', 'Вторая цифра — приоритет отбрасывания: больше — отбрасывается раньше.', 'הספרה השנייה היא עדיפות הזריקה: גבוה יותר = נזרק קודם.']),
  ],
  gen: [
    function genDscp(rng) {
      const kind = rng.int(0, 9);
      const name = kind < 6 ? 'AF' + rng.int(1, 4) + rng.int(1, 3) : kind < 8 ? 'CS' + rng.int(1, 7) : 'EF';
      const v = e2Dscp(name);
      const why = T(name === 'EF' ? 'EF = 46 (binary 101110).' : name.startsWith('CS') ? name + ' = 8 × ' + name[2] + ' = ' + v + '.' : name + ' = 8 × ' + name[2] + ' + 2 × ' + name[3] + ' = ' + v + '.',
        name === 'EF' ? 'EF = 46 (двоичное 101110).' : name.startsWith('CS') ? name + ' = 8 × ' + name[2] + ' = ' + v + '.' : name + ' = 8 × ' + name[2] + ' + 2 × ' + name[3] + ' = ' + v + '.',
        name === 'EF' ? 'EF = 46 (בבינארי 101110).' : name.startsWith('CS') ? name + ' = 8 × ' + name[2] + ' = ' + v + '.' : name + ' = 8 × ' + name[2] + ' + 2 × ' + name[3] + ' = ' + v + '.');
      if (rng.chance(0.5)) {
        const x = Number(name[2]) || 4, y = Number(name[3]) || 1;
        const wrong = [v * 4, v + 2, v - 2, 10 * x + y, 8 * x + y, 8 * y + 2 * x, 40, 48].filter((w) => w >= 0 && w !== v).map(String);
        return lGen(T('What is the decimal DSCP value of ' + name + '?', 'Какое десятичное значение DSCP у ' + name + '?', 'מהו ערך ה-DSCP העשרוני של ' + name + '?'), String(v), rng.shuffle(wrong.slice(0, 5)).concat(wrong.slice(5)), why);
      }
      const all = ['EF'];
      for (let a = 1; a <= 4; a++) for (let b = 1; b <= 3; b++) all.push('AF' + a + b);
      for (let c = 1; c <= 7; c++) all.push('CS' + c);
      const near = all.filter((n) => n !== name).sort((p, q) => Math.abs(e2Dscp(p) - v) - Math.abs(e2Dscp(q) - v)).slice(0, 5);
      return lGen(T('Which PHB has the DSCP value ' + v + '?', 'Какому PHB соответствует DSCP ' + v + '?', 'לאיזה PHB שייך ערך ה-DSCP ‏' + v + '?'), name, rng.shuffle(near), why);
    },
  ],
});

// ---------------------------------------------------------------
const E2_SYSLOG = ['emergencies', 'alerts', 'critical', 'errors', 'warnings', 'notifications', 'informational', 'debugging'];
const E2_SYSLOG_RU = ['аварии', 'тревоги', 'критические', 'ошибки', 'предупреждения', 'уведомления', 'информационные', 'отладка'];
const E2_SYSLOG_HE = ['חירום', 'התראות', 'קריטי', 'שגיאות', 'אזהרות', 'הודעות', 'מידע', 'ניפוי באגים'];
const E2_LOGMSG = [
  '%SYS-2-MALLOCFAIL: Memory allocation of 65536 bytes failed',
  '%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port Gi1/0/5 with BPDU Guard enabled. Disabling port.',
  '%LINK-3-UPDOWN: Interface GigabitEthernet0/0/1, changed state to down',
  '%PM-4-ERR_DISABLE: psecure-violation error detected on Gi1/0/3, putting Gi1/0/3 in err-disable state',
  '%CDP-4-DUPLEX_MISMATCH: duplex mismatch discovered on GigabitEthernet0/0/0',
  '%SYS-5-CONFIG_I: Configured from console by admin on vty0',
  '%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/0/1, changed state to up',
  '%OSPF-5-ADJCHG: Process 1, Nbr 2.2.2.2 on GigabitEthernet0/0/1 from LOADING to FULL, Loading Done',
  '%SEC-6-IPACCESSLOGP: list 101 denied tcp 10.1.1.5(1025) -> 192.168.1.10(23), 1 packet',
  '%SYS-6-CLOCKUPDATE: System clock has been updated',
  '%SYS-7-USERLOG_DEBUG: Message from tty0(user id: admin): test',
];
function e2LogLevel(msg) { return Number(msg.split('-')[1]); }

lessonDef({
  id: 'ensa10', topic: 'device', drill: 'ops', minutes: 18, genInQuiz: 2,
  title: T('Network management', 'Управление сетью', 'ניהול רשת'),
  goal: T('Discover neighbours with CDP and LLDP, keep the right time with NTP, monitor devices with SNMP and Syslog, and back up configurations, upgrade IOS and recover passwords.',
    'Находить соседей с помощью CDP и LLDP, держать точное время по NTP, следить за устройствами через SNMP и Syslog, делать резервные копии конфигураций, обновлять IOS и восстанавливать пароли.',
    'לגלות שכנים עם CDP ו-LLDP, לשמור על שעה מדויקת עם NTP, לנטר התקנים עם SNMP ו-Syslog, לגבות תצורות, לשדרג IOS ולשחזר סיסמאות.'),
  sections: [
    lSec(['CDP and LLDP', 'CDP и LLDP', 'CDP ו-LLDP'],
      lCode('S1# show cdp neighbors\nCapability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge\n                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone\nDevice ID    Local Intrfce   Holdtme   Capability   Platform   Port ID\nR1           Gig 0/1         147       R S I        ISR4331    Gig 0/0/1\n\nR1(config)# interface g0/0/0\nR1(config-if)# no cdp enable          ! towards the ISP\nR1(config)# lldp run\nR1(config)# interface g0/0/1\nR1(config-if)# lldp transmit\nR1(config-if)# lldp receive\nR1# show lldp neighbors detail'),
      lUL([
        ['CDP — Cisco Discovery Protocol: Cisco-proprietary, Layer 2, on by default. Shows the neighbour\'s name, platform, capabilities and port; "detail" adds its IP address and IOS version.', 'CDP — Cisco Discovery Protocol: протокол Cisco, 2-й уровень, включён по умолчанию. Показывает имя соседа, платформу, возможности и порт; «detail» добавляет его IP-адрес и версию IOS.', 'CDP — ‏Cisco Discovery Protocol: קנייני של Cisco, שכבה 2, פעיל כברירת מחדל. מציג את שם השכן, הפלטפורמה, היכולות והפורט; ‏"detail" מוסיף את כתובת ה-IP ואת גרסת ה-IOS שלו.'],
        ['LLDP — IEEE 802.1AB: the same idea for every vendor. Enable it globally with lldp run; per interface you can turn sending and receiving on or off separately.', 'LLDP — IEEE 802.1AB: то же самое для любых производителей. Включается глобально lldp run; на интерфейсе отправку и приём можно включать отдельно.', 'LLDP — ‏IEEE 802.1AB: אותו רעיון לכל היצרנים. מפעילים גלובלית עם lldp run; בכל ממשק אפשר להפעיל או לכבות שליחה וקבלה בנפרד.'],
        ['Both are great for mapping an unknown network — and for attackers too. Disable them on ports facing the ISP or users.', 'Оба отлично помогают нарисовать карту незнакомой сети — и злоумышленнику тоже. Отключайте их на портах к провайдеру и пользователям.', 'שניהם מעולים למיפוי רשת לא מוכרת — וגם לתוקפים. מכבים אותם בפורטים שפונים לספק או למשתמשים.'],
      ])),
    lSec(['NTP', 'NTP', 'NTP'],
      lCode('R1(config)# ntp server 209.165.200.225\nS1(config)# ntp server 10.1.1.1\nR1# show ntp associations\n  address         ref clock       st   when   poll reach  delay  offset   disp\n*~209.165.200.225 .GPS.            1     61     64   377  0.481   7.480  4.261\nR1# show ntp status\nClock is synchronized, stratum 2, reference is 209.165.200.225'),
      lUL([
        ['Correct time matters: log timestamps must line up across devices, and certificates and VPNs check time.', 'Точное время важно: метки времени в журналах разных устройств должны совпадать, а сертификаты и VPN проверяют время.', 'שעה מדויקת חשובה: חותמות הזמן ביומנים של התקנים שונים חייבות להתאים, ותעודות ו-VPN בודקים את השעה.'],
        ['Stratum = distance from the reference clock. Stratum 0 = atomic clock or GPS; stratum 1 servers are connected to it; their clients are stratum 2, and so on (16 = not synchronised).', 'Stratum — расстояние до эталонных часов. Stratum 0 — атомные часы или GPS; серверы stratum 1 подключены к ним; их клиенты — stratum 2 и т. д. (16 — не синхронизировано).', 'Stratum = המרחק משעון הייחוס. ‏Stratum 0 = שעון אטומי או GPS; שרתי stratum 1 מחוברים אליו; הלקוחות שלהם הם stratum 2, וכן הלאה (16 = לא מסונכרן).'],
        ['NTP uses UDP 123. Without NTP you set the clock by hand: clock set 14:30:00 16 Oct 2026.', 'NTP использует UDP 123. Без NTP часы ставят вручную: clock set 14:30:00 16 Oct 2026.', 'NTP משתמש ב-UDP 123. בלי NTP מכוונים את השעון ידנית: clock set 14:30:00 16 Oct 2026.'],
      ])),
    lSec(['SNMP', 'SNMP', 'SNMP'],
      lP(['SNMP has three parts: the SNMP manager (the NMS software), SNMP agents on the devices, and the MIB — the agent\'s database of objects, each named by an OID. The manager polls agents with get requests and can change values with set; agents send traps (unacknowledged) or informs (acknowledged) when something happens.',
        'У SNMP три части: менеджер SNMP (ПО NMS), агенты SNMP на устройствах и MIB — база объектов агента, у каждого объекта свой OID. Менеджер опрашивает агентов запросами get и может менять значения через set; агенты сами шлют trap (без подтверждения) или inform (с подтверждением), когда что-то случилось.',
        'ל-SNMP שלושה חלקים: מנהל ה-SNMP (תוכנת ה-NMS), סוכני SNMP בהתקנים, וה-MIB — מסד האובייקטים של הסוכן, כשלכל אובייקט יש OID. המנהל דוגם את הסוכנים בבקשות get ויכול לשנות ערכים עם set; הסוכנים שולחים trap (בלי אישור) או inform (עם אישור) כשמשהו קורה.']),
      lTable([['Version', 'Версия', 'גרסה'], ['Security', 'Безопасность', 'אבטחה']], [
        ['SNMPv1', ['Community string in clear text', 'Community-строка открытым текстом', 'Community string בטקסט גלוי']],
        ['SNMPv2c', ['Community string in clear text; adds get-bulk and informs', 'Community-строка открытым текстом; добавлены get-bulk и inform', 'Community string בטקסט גלוי; נוספו get-bulk ו-inform']],
        ['SNMPv3', ['Users with authentication and encryption — use this one', 'Пользователи с аутентификацией и шифрованием — используйте её', 'משתמשים עם אימות והצפנה — בזה משתמשים']],
      ]),
      lCode('R1(config)# ip access-list standard SNMP-MGR\nR1(config-std-nacl)# permit host 192.168.1.3\nR1(config)# snmp-server community B@ttl3 RO SNMP-MGR\nR1(config)# snmp-server location NOC-Rack-2\nR1(config)# snmp-server contact Leonid\nR1(config)# snmp-server host 192.168.1.3 version 2c B@ttl3\nR1(config)# snmp-server enable traps',
        ['Read-only community, limited by an ACL to the NMS host', 'Community только для чтения, ограниченная ACL до хоста NMS', 'Community לקריאה בלבד, מוגבלת ב-ACL למארח ה-NMS']),
      lTip(['Agents listen on UDP 161; managers receive traps on UDP 162.', 'Агенты слушают UDP 161; менеджеры принимают trap на UDP 162.', 'הסוכנים מאזינים ב-UDP 161; המנהלים מקבלים trap ב-UDP 162.'])),
    lSec(['Syslog', 'Syslog', 'Syslog'],
      lCode('R1(config)# service timestamps log datetime msec\nR1(config)# logging host 192.168.1.3\nR1(config)# logging trap warnings\nR1(config)# logging source-interface g0/0/1\nR1# show logging\n*Oct 16 09:12:44.311: %LINK-3-UPDOWN: Interface GigabitEthernet0/0/0, changed state to up'),
      lTable([['Level', 'Уровень', 'רמה'], ['Keyword', 'Ключевое слово', 'מילת מפתח'], ['Meaning', 'Значение', 'משמעות']], [
        ['0', 'emergencies', ['System unusable', 'Система не работает', 'המערכת לא שמישה']],
        ['1', 'alerts', ['Immediate action needed', 'Нужны немедленные действия', 'דרושה פעולה מיידית']],
        ['2', 'critical', ['Critical condition', 'Критическое состояние', 'מצב קריטי']],
        ['3', 'errors', ['Error condition', 'Ошибка', 'מצב שגיאה']],
        ['4', 'warnings', ['Warning condition', 'Предупреждение', 'מצב אזהרה']],
        ['5', 'notifications', ['Normal but significant', 'Норма, но важно', 'רגיל אבל משמעותי']],
        ['6', 'informational', ['Informational message', 'Информационное сообщение', 'הודעת מידע']],
        ['7', 'debugging', ['Debug output', 'Вывод отладки', 'פלט ניפוי באגים']],
      ]),
      lUL([
        ['Message format: %FACILITY-SEVERITY-MNEMONIC: text. In %LINK-3-UPDOWN the severity is 3 (errors).', 'Формат сообщения: %FACILITY-SEVERITY-MNEMONIC: текст. В %LINK-3-UPDOWN уровень 3 (errors).', 'מבנה ההודעה: %FACILITY-SEVERITY-MNEMONIC: טקסט. ב-%LINK-3-UPDOWN הרמה היא 3 ‏(errors).'],
        ['"logging trap <level>" sends that level and everything more severe (lower numbers) to the server. Default: informational (6).', '«logging trap <уровень>» отправляет на сервер этот уровень и всё более серьёзное (меньшие номера). По умолчанию informational (6).', '"logging trap <רמה>" שולח לשרת את הרמה הזו ואת כל מה שחמור ממנה (מספרים נמוכים יותר). ברירת המחדל: informational ‏(6).'],
        ['Syslog uses UDP 514. Memory aid: "Every Awesome Cisco Engineer Will Need Ice cream Daily".', 'Syslog использует UDP 514. Запоминалка: «Every Awesome Cisco Engineer Will Need Ice cream Daily».', 'Syslog משתמש ב-UDP 514. משפט לזכירה: "Every Awesome Cisco Engineer Will Need Ice cream Daily".'],
      ])),
    lSec(['Backups, IOS upgrades and password recovery', 'Резервные копии, обновление IOS и восстановление пароля', 'גיבויים, שדרוג IOS ושחזור סיסמה'],
      lCode('R1# copy running-config tftp:\nAddress or name of remote host []? 172.16.1.2\nDestination filename [r1-confg]? R1-2026-10-16\nR1# copy running-config usbflash0:\nR1# copy tftp: flash:                         ! new IOS image\nR1(config)# boot system flash:isr4300-universalk9.17.09.04a.SPA.bin\nR1# copy running-config startup-config\nR1# reload\n\nrommon 1 > confreg 0x2142                     ! password recovery\nrommon 2 > reset'),
      lUL([
        ['File systems: flash: (IOS images), nvram: (startup-config), usbflash0:, tftp:. Look with show file systems and dir flash:.', 'Файловые системы: flash: (образы IOS), nvram: (startup-config), usbflash0:, tftp:. Смотреть: show file systems и dir flash:.', 'מערכות קבצים: flash: (קבצי IOS), ‏nvram: ‏(startup-config), ‏usbflash0:, ‏tftp:. בודקים עם show file systems ו-dir flash:.'],
        ['Copying a file INTO running-config merges it with the current config; to replace it, copy into startup-config and reload.', 'Копирование файла В running-config сливает его с текущей конфигурацией; чтобы заменить, скопируйте в startup-config и перезагрузите.', 'העתקת קובץ לתוך running-config ממזגת אותו עם התצורה הנוכחית; כדי להחליף, מעתיקים ל-startup-config ומאתחלים.'],
        ['Password recovery: break into ROMMON, confreg 0x2142 (ignore startup-config), boot, copy startup-config running-config, set new passwords, config-register 0x2102, save.', 'Восстановление пароля: прервать загрузку в ROMMON, confreg 0x2142 (игнорировать startup-config), загрузиться, copy startup-config running-config, задать новые пароли, config-register 0x2102, сохранить.', 'שחזור סיסמה: עוצרים את האתחול ל-ROMMON, ‏confreg 0x2142 (להתעלם מ-startup-config), מאתחלים, ‏copy startup-config running-config, קובעים סיסמאות חדשות, ‏config-register 0x2102, שומרים.'],
      ])),
  ],
  quiz: [
    lQ(['Which neighbour discovery protocol works with every vendor?', 'Какой протокол обнаружения соседей работает с любыми производителями?', 'איזה פרוטוקול לגילוי שכנים עובד עם כל היצרנים?'],
      ['LLDP', 'CDP', 'SNMP', 'NTP'], 0,
      ['LLDP is IEEE 802.1AB; CDP is Cisco-only.', 'LLDP — стандарт IEEE 802.1AB; CDP — только Cisco.', 'LLDP הוא IEEE 802.1AB; ‏CDP הוא רק של Cisco.']),
    lQ(['Why disable CDP on the interface facing the ISP?', 'Зачем отключать CDP на интерфейсе к провайдеру?', 'למה מכבים CDP בממשק שפונה לספק?'],
      [['It reveals device details (model, IOS, IP) to outsiders', 'Он раскрывает посторонним данные устройства (модель, IOS, IP)', 'הוא חושף לגורמים חיצוניים פרטים על ההתקן (דגם, ‏IOS, ‏IP)'], ['It slows the link down', 'Он замедляет канал', 'הוא מאט את הקישור'], ['It breaks NAT', 'Он ломает NAT', 'הוא שובר NAT'], ['CDP works only on switches', 'CDP работает только на коммутаторах', 'CDP עובד רק במתגים']], 0,
      ['Use no cdp enable on that interface.', 'Используйте no cdp enable на этом интерфейсе.', 'משתמשים ב-no cdp enable על הממשק הזה.']),
    lQ(['What is an NTP stratum 1 server?', 'Что такое сервер NTP stratum 1?', 'מהו שרת NTP ב-stratum 1?'],
      [['A server directly connected to a reference clock (stratum 0)', 'Сервер, напрямую подключённый к эталонным часам (stratum 0)', 'שרת שמחובר ישירות לשעון ייחוס (stratum 0)'], ['The least accurate server', 'Самый неточный сервер', 'השרת הכי פחות מדויק'], ['A server that is not synchronised', 'Несинхронизированный сервер', 'שרת לא מסונכרן'], ['A client of a stratum 2 server', 'Клиент сервера stratum 2', 'לקוח של שרת stratum 2']], 0,
      ['Lower stratum = closer to the reference clock.', 'Меньший stratum — ближе к эталону.', 'Stratum נמוך יותר = קרוב יותר לשעון הייחוס.']),
    lQ(['On which port does an SNMP agent receive get and set requests?', 'На каком порту агент SNMP принимает запросы get и set?', 'באיזה פורט סוכן SNMP מקבל בקשות get ו-set?'],
      ['UDP 161', 'UDP 162', 'UDP 514', 'TCP 23'], 0,
      ['Traps go to the manager on UDP 162; Syslog is UDP 514.', 'Trap идут менеджеру на UDP 162; Syslog — UDP 514.', 'Trap נשלחים למנהל ב-UDP 162; ‏Syslog הוא UDP 514.']),
    lQ(['Which SNMP version adds authentication and encryption?', 'Какая версия SNMP добавляет аутентификацию и шифрование?', 'איזו גרסת SNMP מוסיפה אימות והצפנה?'],
      ['SNMPv3', 'SNMPv2c', 'SNMPv1', 'SNMPv2'], 0,
      ['v1 and v2c send the community string in clear text.', 'v1 и v2c передают community-строку открытым текстом.', 'v1 ו-v2c שולחות את ה-community string בטקסט גלוי.']),
    lQ(['An agent tells the manager about an event without being asked and without waiting for an acknowledgement. What is this message?', 'Агент сам сообщает менеджеру о событии и не ждёт подтверждения. Как называется сообщение?', 'סוכן מודיע למנהל על אירוע בלי שביקשו ממנו ובלי לחכות לאישור. איך נקראת ההודעה?'],
      ['Trap', 'Inform', 'Get-response', 'Set-request'], 0,
      ['An inform is acknowledged by the manager.', 'Inform менеджер подтверждает.', 'על inform המנהל שולח אישור.']),
    lQ(['Which Syslog level is the most severe?', 'Какой уровень Syslog самый серьёзный?', 'איזו רמת Syslog היא החמורה ביותר?'],
      [['0 — emergencies', '0 — emergencies', '0 — emergencies'], ['7 — debugging', '7 — debugging', '7 — debugging'], ['3 — errors', '3 — errors', '3 — errors'], ['5 — notifications', '5 — notifications', '5 — notifications']], 0,
      ['Lower number = more severe.', 'Меньше номер — серьёзнее.', 'מספר נמוך יותר = חמור יותר.']),
    lQ(['What does the configuration register value 0x2142 do?', 'Что делает значение регистра конфигурации 0x2142?', 'מה עושה ערך אוגר התצורה 0x2142?'],
      [['The router ignores startup-config at boot (password recovery)', 'Роутер при загрузке игнорирует startup-config (восстановление пароля)', 'הנתב מתעלם מ-startup-config באתחול (שחזור סיסמה)'], ['Normal boot', 'Обычная загрузка', 'אתחול רגיל'], ['Boots from TFTP', 'Загрузка с TFTP', 'אתחול מ-TFTP'], ['Erases flash', 'Стирает flash', 'מוחק את ה-flash']], 0,
      ['0x2102 is the normal value — set it back after recovery.', '0x2102 — обычное значение; верните его после восстановления.', '0x2102 הוא הערך הרגיל — מחזירים אותו אחרי השחזור.']),
    lQ(['What happens with "copy tftp: running-config"?', 'Что происходит при «copy tftp: running-config»?', 'מה קורה ב-"copy tftp: running-config"?'],
      [['The file is merged into the current running configuration', 'Файл сливается с текущей running-конфигурацией', 'הקובץ מתמזג לתוך התצורה הנוכחית'], ['The running configuration is fully replaced', 'Running-конфигурация полностью заменяется', 'התצורה הנוכחית מוחלפת לגמרי'], ['The IOS image is upgraded', 'Обновляется образ IOS', 'קובץ ה-IOS משודרג'], ['Nothing until a reload', 'Ничего до перезагрузки', 'כלום עד האתחול']], 0,
      ['To replace, copy into startup-config and reload.', 'Чтобы заменить, копируйте в startup-config и перезагрузите.', 'כדי להחליף, מעתיקים ל-startup-config ומאתחלים.']),
  ],
  gen: [
    function genSyslogLevel(rng) {
      const n = rng.int(0, 7), name = E2_SYSLOG[n];
      const why = T('Level ' + n + ' = ' + name + '. Order: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging.', 'Уровень ' + n + ' = ' + name + ' (' + E2_SYSLOG_RU[n] + '). Порядок: 0 emergencies, 1 alerts, 2 critical, 3 errors, 4 warnings, 5 notifications, 6 informational, 7 debugging.', 'רמה ' + n + ' = ' + name + ' (' + E2_SYSLOG_HE[n] + '). הסדר: 0 emergencies, ‏1 alerts, ‏2 critical, ‏3 errors, ‏4 warnings, ‏5 notifications, ‏6 informational, ‏7 debugging.');
      const others = rng.shuffle([n - 1, n + 1, n - 2, n + 2, 7 - n].filter((x) => x >= 0 && x <= 7 && x !== n));
      if (rng.chance(0.5)) return lGen(T('What is the Syslog severity level number of "' + name + '"?', 'Какой номер уровня Syslog у «' + name + '»?', 'מהו מספר רמת ה-Syslog של "' + name + '"?'), String(n), others.map(String), why);
      return lGen(T('Which Syslog keyword is severity level ' + n + '?', 'Какое ключевое слово Syslog у уровня ' + n + '?', 'איזו מילת מפתח של Syslog היא רמה ' + n + '?'), name, others.map((x) => E2_SYSLOG[x]), why);
    },
    function genLoggingTrap(rng) {
      const n = rng.int(2, 5), kw = rng.chance(0.6) ? E2_SYSLOG[n] : String(n);
      const right = rng.pick(E2_LOGMSG.filter((m) => e2LogLevel(m) <= n));
      const wrong = rng.shuffle(E2_LOGMSG.filter((m) => e2LogLevel(m) > n));
      return lGen(T('R1 has "logging trap ' + kw + '". Which of these messages is sent to the Syslog server?', 'На R1 «logging trap ' + kw + '». Какое из этих сообщений уйдёт на Syslog-сервер?', 'ב-R1 מוגדר "logging trap ' + kw + '". איזו מההודעות האלה תישלח לשרת ה-Syslog?'),
        right, wrong,
        T('logging trap ' + E2_SYSLOG[n] + ' (' + n + ') sends levels 0–' + n + '. The level is the number in %FACILITY-LEVEL-MNEMONIC; this one is ' + e2LogLevel(right) + '.', 'logging trap ' + E2_SYSLOG[n] + ' (' + n + ') отправляет уровни 0–' + n + '. Уровень — число в %FACILITY-LEVEL-MNEMONIC; здесь ' + e2LogLevel(right) + '.', 'logging trap ' + E2_SYSLOG[n] + ' ‏(' + n + ') שולח רמות 0–' + n + '. הרמה היא המספר ב-%FACILITY-LEVEL-MNEMONIC; כאן היא ' + e2LogLevel(right) + '.'));
    },
  ],
});

// ---------------------------------------------------------------
function e2Speed(mbps) { return mbps >= 1000 ? mbps / 1000 + ' Gbps' : mbps + ' Mbps'; }
function e2Ratio(r) { return Math.round(r * 100) / 100 + ':1'; }

lessonDef({
  id: 'ensa11', topic: null, drill: 'ops', minutes: 15, genInQuiz: 1,
  title: T('Network design', 'Проектирование сетей', 'תכנון רשתות'),
  goal: T('The hierarchical design model (access, distribution, core) and the collapsed core, how to build a scalable and redundant network, failure domains, and how to choose switches and routers.',
    'Иерархическая модель (доступ, распределение, ядро) и совмещённое ядро, как построить масштабируемую и отказоустойчивую сеть, домены отказа и как выбирать коммутаторы и роутеры.',
    'מודל התכנון ההיררכי (גישה, הפצה, ליבה) והליבה המכווצת, איך בונים רשת שגדלה בקלות ועם יתירות, תחומי כשל, ואיך בוחרים מתגים ונתבים.'),
  sections: [
    lSec(['The hierarchical model', 'Иерархическая модель', 'המודל ההיררכי'],
      lTable([['Layer', 'Уровень', 'שכבה'], ['Job', 'Задача', 'תפקיד']], [
        [['Access', 'Доступ', 'גישה (Access)'], ['Connects end devices and APs: PoE, VLANs, port security, QoS marking', 'Подключает оконечные устройства и точки доступа: PoE, VLAN, port security, маркировка QoS', 'מחברת התקני קצה ונקודות גישה: PoE, ‏VLAN, ‏port security, סימון QoS']],
        [['Distribution', 'Распределение', 'הפצה (Distribution)'], ['Aggregates access switches; routing between VLANs, ACL policy, redundancy, ends broadcast domains', 'Собирает коммутаторы доступа; маршрутизация между VLAN, политики ACL, резервирование, граница широковещательных доменов', 'מאגדת את מתגי הגישה; ניתוב בין VLAN, מדיניות ACL, יתירות, גבול תחומי broadcast']],
        [['Core', 'Ядро', 'ליבה (Core)'], ['High-speed, redundant backbone between distribution blocks; forwards fast, no heavy packet processing', 'Быстрая отказоустойчивая магистраль между блоками распределения; быстро пересылает, без тяжёлой обработки пакетов', 'עמוד שדרה מהיר ועם יתירות בין בלוקי ההפצה; מעביר מהר, בלי עיבוד כבד של חבילות']],
      ]),
      lP(['Small and medium networks often use a two-tier collapsed core: the distribution and core layers are combined into one pair of switches. It costs less and still keeps the access layer separate.',
        'В малых и средних сетях часто используют двухуровневую схему с совмещённым ядром: уровни распределения и ядра объединены в одну пару коммутаторов. Дешевле, а уровень доступа всё равно отделён.',
        'ברשתות קטנות ובינוניות משתמשים לעתים קרובות בתכנון דו-שכבתי עם ליבה מכווצת (collapsed core): שכבות ההפצה והליבה מאוחדות לזוג מתגים אחד. זה זול יותר, ושכבת הגישה עדיין נפרדת.'])),
    lSec(['Scalable and redundant networks', 'Масштабируемые и отказоустойчивые сети', 'רשתות שגדלות בקלות ועם יתירות'],
      lUL([
        ['Redundancy: two uplinks from every access switch, two distribution and two core switches; STP blocks the loops at Layer 2.', 'Резервирование: два аплинка от каждого коммутатора доступа, по два коммутатора распределения и ядра; STP блокирует петли на 2-м уровне.', 'יתירות: שני uplinks מכל מתג גישה, שני מתגי הפצה ושני מתגי ליבה; ‏STP חוסם את הלולאות בשכבה 2.'],
        ['More bandwidth: EtherChannel bundles several links into one logical link that STP does not block.', 'Больше полосы: EtherChannel объединяет несколько каналов в один логический, который STP не блокирует.', 'יותר רוחב פס: EtherChannel מאגד כמה קישורים לקישור לוגי אחד ש-STP לא חוסם.'],
        ['A modular design (switch blocks), wireless to extend the access layer, and a scalable routing protocol (OSPF with areas, summarisation).', 'Модульная структура (блоки коммутаторов), беспроводной доступ для расширения уровня доступа, масштабируемый протокол маршрутизации (OSPF с областями, суммирование).', 'מבנה מודולרי (בלוקים של מתגים), אלחוט להרחבת שכבת הגישה, ופרוטוקול ניתוב שגדל (OSPF עם אזורים, סיכום נתיבים).'],
        ['Failure domain = the part of the network affected when one device or link fails. Hierarchy keeps failure domains small: a broken access switch takes down only its own users.', 'Домен отказа — часть сети, которая страдает при отказе одного устройства или канала. Иерархия делает домены отказа маленькими: сломанный коммутатор доступа выключает только своих пользователей.', 'תחום כשל = החלק ברשת שנפגע כשהתקן או קישור אחד נופל. ההיררכיה שומרת על תחומי כשל קטנים: מתג גישה תקול מפיל רק את המשתמשים שלו.'],
      ])),
    lSec(['Choosing switches', 'Выбор коммутаторов', 'בחירת מתגים'],
      lTable([['Feature', 'Параметр', 'מאפיין'], ['What to check', 'Что проверить', 'מה לבדוק']], [
        [['Form factor', 'Форм-фактор', 'גורם צורה'], ['Fixed configuration, modular (line cards), or stackable (StackWise — several switches managed as one)', 'Фиксированная конфигурация, модульный (линейные карты) или стекируемый (StackWise — несколько коммутаторов управляются как один)', 'תצורה קבועה, מודולרי (כרטיסי קו) או ניתן לערימה (StackWise — כמה מתגים שמנוהלים כאחד)']],
        [['Port density and speed', 'Плотность и скорость портов', 'צפיפות ומהירות פורטים'], ['How many ports in how many rack units; 1/10/25/40/100 Gbps', 'Сколько портов в скольких юнитах; 1/10/25/40/100 Гбит/с', 'כמה פורטים בכמה יחידות rack; ‏1/10/25/40/100 Gbps']],
        [['Forwarding rate', 'Производительность', 'קצב העברה'], ['How much the switch can process per second; "wire speed" = all ports at full speed', 'Сколько коммутатор обрабатывает в секунду; «wire speed» — все порты на полной скорости', 'כמה המתג יכול לעבד בשנייה; ‏"wire speed" = כל הפורטים במהירות מלאה']],
        ['PoE', ['Power for IP phones, APs, cameras: 802.3af 15.4 W, 802.3at (PoE+) 30 W, 802.3bt up to 90 W', 'Питание для IP-телефонов, точек доступа, камер: 802.3af 15,4 Вт, 802.3at (PoE+) 30 Вт, 802.3bt до 90 Вт', 'חשמל לטלפוני IP, נקודות גישה ומצלמות: 802.3af ‏15.4 W, ‏802.3at ‏(PoE+) ‏30 W, ‏802.3bt עד 90 W']],
        [['Multilayer switching', 'Многоуровневая коммутация', 'מיתוג רב-שכבתי'], ['Layer 3 switches route between VLANs in hardware (distribution and core)', 'Коммутаторы 3-го уровня маршрутизируют между VLAN аппаратно (распределение и ядро)', 'מתגי שכבה 3 מנתבים בין VLAN בחומרה (הפצה וליבה)']],
      ]),
      lP(['Oversubscription = total access bandwidth / uplink bandwidth. 48 users at 1 Gbps with two 10 Gbps uplinks: 48 / 20 = 2.4:1. Not every user sends at full speed at once, so some oversubscription is normal (Cisco guidance: up to about 20:1 at the access layer).',
        'Переподписка = суммарная полоса доступа / полоса аплинков. 48 пользователей по 1 Гбит/с и два аплинка по 10 Гбит/с: 48 / 20 = 2,4:1. Все пользователи сразу на полной скорости не работают, поэтому небольшая переподписка — норма (рекомендация Cisco: до ~20:1 на уровне доступа).',
        'Oversubscription = רוחב הפס הכולל של הגישה חלקי רוחב הפס של ה-uplinks. ‏48 משתמשים ב-1 Gbps עם שני uplinks של 10 Gbps: ‏48 / 20 = ‏2.4:1. לא כל המשתמשים שולחים במהירות מלאה בבת אחת, ולכן קצת oversubscription זה נורמלי (ההמלצה של Cisco: עד כ-20:1 בשכבת הגישה).'])),
    lSec(['Choosing routers', 'Выбор роутеров', 'בחירת נתבים'],
      lUL([
        ['Branch routers (Cisco ISR) — integrated services for small sites: routing, security, voice, Wi-Fi.', 'Роутеры филиалов (Cisco ISR) — интегрированные сервисы для небольших площадок: маршрутизация, безопасность, голос, Wi-Fi.', 'נתבי סניף (Cisco ISR) — שירותים משולבים לאתרים קטנים: ניתוב, אבטחה, קול, ‏Wi-Fi.'],
        ['Network edge routers (Cisco ASR 1000) — high performance and security at the connection to the WAN or Internet.', 'Пограничные роутеры (Cisco ASR 1000) — высокая производительность и безопасность на подключении к WAN или Интернету.', 'נתבי קצה (Cisco ASR 1000) — ביצועים ואבטחה גבוהים בנקודת החיבור ל-WAN או לאינטרנט.'],
        ['Service provider routers (Cisco ASR 9000, 8000) — huge throughput for ISPs; industrial routers — rugged for factories and outdoor use.', 'Роутеры провайдеров (Cisco ASR 9000, 8000) — огромная пропускная способность для ISP; промышленные роутеры — защищённые для заводов и улицы.', 'נתבי ספקים (Cisco ASR 9000, ‏8000) — תפוקה עצומה לספקי אינטרנט; נתבים תעשייתיים — עמידים למפעלים ולשימוש בחוץ.'],
        ['Router form factors: fixed or modular, with interface slots for future WAN links.', 'Форм-факторы роутеров: фиксированные или модульные, со слотами под будущие WAN-каналы.', 'גורמי צורה של נתבים: קבועים או מודולריים, עם חריצי ממשקים לקישורי WAN עתידיים.'],
      ])),
  ],
  quiz: [
    lQ(['Which layer connects end devices and provides PoE and port security?', 'Какой уровень подключает оконечные устройства и даёт PoE и port security?', 'איזו שכבה מחברת התקני קצה ונותנת PoE ו-port security?'],
      [['Access', 'Доступ', 'גישה'], ['Distribution', 'Распределение', 'הפצה'], ['Core', 'Ядро', 'ליבה'], ['WAN', 'WAN', 'WAN']], 0,
      ['End users plug into the access layer.', 'Пользователи подключаются к уровню доступа.', 'משתמשי הקצה מתחברים לשכבת הגישה.']),
    lQ(['Which layer routes between VLANs and applies ACL policies?', 'Какой уровень маршрутизирует между VLAN и применяет политики ACL?', 'איזו שכבה מנתבת בין VLAN ומחילה מדיניות ACL?'],
      [['Distribution', 'Распределение', 'הפצה'], ['Access', 'Доступ', 'גישה'], ['Core', 'Ядро', 'ליבה'], ['Physical', 'Физический', 'פיזית']], 0,
      ['The distribution layer is the policy boundary.', 'Уровень распределения — граница политик.', 'שכבת ההפצה היא גבול המדיניות.']),
    lQ(['What is the main goal of the core layer?', 'Главная задача уровня ядра?', 'מהי המטרה העיקרית של שכבת הליבה?'],
      [['Fast, reliable transport with no heavy packet processing', 'Быстрая надёжная передача без тяжёлой обработки пакетов', 'העברה מהירה ואמינה בלי עיבוד כבד של חבילות'], ['Connecting printers', 'Подключение принтеров', 'חיבור מדפסות'], ['Port security', 'Port security', 'Port security'], ['Giving out IP addresses', 'Раздача IP-адресов', 'חלוקת כתובות IP']], 0,
      ['ACLs and similar processing belong at distribution.', 'ACL и подобная обработка — на уровне распределения.', 'ACL ועיבוד דומה שייכים לשכבת ההפצה.']),
    lQ(['What is a collapsed core design?', 'Что такое схема с совмещённым ядром?', 'מהו תכנון collapsed core?'],
      [['Distribution and core combined into one layer', 'Уровни распределения и ядра объединены в один', 'שכבות ההפצה והליבה מאוחדות לשכבה אחת'], ['A core that has failed', 'Вышедшее из строя ядро', 'ליבה שקרסה'], ['Access and distribution combined', 'Объединены доступ и распределение', 'שכבות הגישה וההפצה מאוחדות'], ['A network with no core switches and no routers', 'Сеть без коммутаторов ядра и роутеров', 'רשת בלי מתגי ליבה ובלי נתבים']], 0,
      ['A two-tier design for small and medium networks.', 'Двухуровневая схема для малых и средних сетей.', 'תכנון דו-שכבתי לרשתות קטנות ובינוניות.']),
    lQ(['What does EtherChannel add to a design?', 'Что EtherChannel даёт проекту сети?', 'מה EtherChannel מוסיף לתכנון?'],
      [['More bandwidth: several links act as one logical link that STP does not block', 'Больше полосы: несколько каналов работают как один логический, который STP не блокирует', 'יותר רוחב פס: כמה קישורים פועלים כקישור לוגי אחד ש-STP לא חוסם'], ['Wireless coverage', 'Беспроводное покрытие', 'כיסוי אלחוטי'], ['Encryption', 'Шифрование', 'הצפנה'], ['IP addresses for hosts', 'IP-адреса для хостов', 'כתובות IP למארחים']], 0,
      ['It also gives redundancy: if one member link fails, the others carry on.', 'А также резервирование: если один канал упал, остальные продолжают работать.', 'הוא גם נותן יתירות: אם קישור אחד נופל, האחרים ממשיכים.']),
    lQ(['What is a failure domain?', 'Что такое домен отказа?', 'מהו תחום כשל?'],
      [['The part of the network affected when a device or link fails', 'Часть сети, которая страдает при отказе устройства или канала', 'החלק ברשת שנפגע כשהתקן או קישור נופל'], ['A VLAN with no hosts', 'VLAN без хостов', 'VLAN בלי מארחים'], ['A broken cable', 'Сломанный кабель', 'כבל שבור'], ['An unused IP range', 'Неиспользуемый диапазон IP', 'טווח IP לא בשימוש']], 0,
      ['Good design keeps failure domains small.', 'Хороший проект делает домены отказа маленькими.', 'תכנון טוב שומר על תחומי כשל קטנים.']),
    lQ(['What are stackable switches?', 'Что такое стекируемые коммутаторы?', 'מהם מתגים ניתנים לערימה (stackable)?'],
      [['Switches joined by special cables and managed as one switch', 'Коммутаторы, соединённые специальными кабелями и управляемые как один', 'מתגים שמחוברים בכבלים מיוחדים ומנוהלים כמתג אחד'], ['Switches with line cards', 'Коммутаторы с линейными картами', 'מתגים עם כרטיסי קו'], ['Switches without management', 'Неуправляемые коммутаторы', 'מתגים לא מנוהלים'], ['Switches placed on top of routers', 'Коммутаторы, стоящие на роутерах', 'מתגים שמונחים על נתבים']], 0,
      ['Cisco StackWise is an example.', 'Пример — Cisco StackWise.', 'דוגמה: Cisco StackWise.']),
    lQ(['Which switch feature powers IP phones and access points through the cable?', 'Какая функция коммутатора питает IP-телефоны и точки доступа по кабелю?', 'איזו יכולת של מתג מספקת חשמל לטלפוני IP ולנקודות גישה דרך הכבל?'],
      ['PoE', 'STP', 'EtherChannel', 'VTP'], 0,
      ['Power over Ethernet: 802.3af, 802.3at (PoE+), 802.3bt.', 'Power over Ethernet: 802.3af, 802.3at (PoE+), 802.3bt.', 'Power over Ethernet: ‏802.3af, ‏802.3at ‏(PoE+), ‏802.3bt.']),
  ],
  gen: [
    function genOversub(rng) {
      for (;;) {
        const ports = rng.pick([24, 36, 48]), ps = rng.pick([100, 1000, 1000]), ul = rng.pick([1, 2, 4]), us = rng.pick([1000, 10000, 10000, 25000, 40000]);
        const r = ports * ps / (ul * us);
        if (r < 1 || us <= ps) continue;
        return lGen(T('An access switch has ' + ports + ' × ' + e2Speed(ps) + ' user ports and ' + ul + ' × ' + e2Speed(us) + ' uplinks. What is the oversubscription ratio?', 'У коммутатора доступа ' + ports + ' × ' + e2Speed(ps) + ' пользовательских портов и ' + ul + ' × ' + e2Speed(us) + ' аплинков. Какова переподписка?', 'למתג גישה יש ' + ports + ' × ' + e2Speed(ps) + ' פורטי משתמשים ו-' + ul + ' × ' + e2Speed(us) + ' uplinks. מהו יחס ה-oversubscription?'),
          e2Ratio(r), [e2Ratio(ports * ps / us), e2Ratio(ports / ul), e2Ratio(r * 2), e2Ratio(ports * ps / (ul * us * 10)), '1:1'],
          T(ports + ' × ' + e2Speed(ps) + ' = ' + e2Speed(ports * ps) + '; ' + ul + ' × ' + e2Speed(us) + ' = ' + e2Speed(ul * us) + '; ' + (ports * ps / 1000) + ' / ' + (ul * us / 1000) + ' = ' + e2Ratio(r) + '.', ports + ' × ' + e2Speed(ps) + ' = ' + e2Speed(ports * ps) + '; ' + ul + ' × ' + e2Speed(us) + ' = ' + e2Speed(ul * us) + '; ' + (ports * ps / 1000) + ' / ' + (ul * us / 1000) + ' = ' + e2Ratio(r) + '.', ports + ' × ' + e2Speed(ps) + ' = ' + e2Speed(ports * ps) + '; ' + ul + ' × ' + e2Speed(us) + ' = ' + e2Speed(ul * us) + '; ' + (ports * ps / 1000) + ' / ' + (ul * us / 1000) + ' = ' + e2Ratio(r) + '.'));
      }
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'ensa13', topic: null, minutes: 15,
  title: T('Network virtualization', 'Виртуализация сетей', 'וירטואליזציה של רשתות'),
  goal: T('Cloud service and deployment models, server virtualization and hypervisors, virtual network infrastructure, the control, data and management planes, SDN architecture and APIs, and Cisco ACI with spine-leaf.',
    'Модели облачных сервисов и развёртывания, виртуализация серверов и гипервизоры, виртуальная сетевая инфраструктура, плоскости управления, данных и менеджмента, архитектура SDN и API, Cisco ACI и spine-leaf.',
    'מודלי שירות ופריסה בענן, וירטואליזציה של שרתים והיפרווייזרים, תשתית רשת וירטואלית, מישורי הבקרה, הנתונים והניהול, ארכיטקטורת SDN וממשקי API, ו-Cisco ACI עם spine-leaf.'),
  sections: [
    lSec(['Cloud computing', 'Облачные вычисления', 'מחשוב ענן'],
      lTable([['Model', 'Модель', 'מודל'], ['You get', 'Вы получаете', 'מה מקבלים'], ['Example', 'Пример', 'דוגמה']], [
        ['SaaS', ['Finished software over the Internet', 'Готовое ПО через Интернет', 'תוכנה מוכנה דרך האינטרנט'], 'Microsoft 365, Gmail, Webex'],
        ['PaaS', ['A platform to develop and run your own apps', 'Платформу для разработки и запуска своих приложений', 'פלטפורמה לפיתוח ולהרצה של אפליקציות משלך'], 'Google App Engine, Azure App Service'],
        ['IaaS', ['Virtual machines, storage and networks you manage yourself', 'Виртуальные машины, хранилище и сети, которыми управляете сами', 'מכונות וירטואליות, אחסון ורשתות שאתה מנהל בעצמך'], 'AWS EC2, Azure VMs'],
      ]),
      lUL([
        ['Deployment: public cloud (shared, provider-owned), private cloud (one organisation), hybrid (both, connected), community (several organisations with the same needs, e.g. healthcare).', 'Развёртывание: публичное облако (общее, принадлежит провайдеру), частное (одна организация), гибридное (оба, связанные), community (несколько организаций с общими требованиями, например медицина).', 'פריסה: ענן ציבורי (משותף, של הספק), ענן פרטי (ארגון אחד), היברידי (שניהם, מחוברים), קהילתי (כמה ארגונים עם אותם צרכים, למשל רפואה).'],
        ['A data center is the physical building with servers; the cloud is the service, which usually runs in data centers.', 'Дата-центр — физическое здание с серверами; облако — услуга, которая обычно работает в дата-центрах.', 'דאטה סנטר (חוות שרתים) הוא הבניין הפיזי עם השרתים; הענן הוא השירות, שבדרך כלל רץ בדאטה סנטרים.'],
      ])),
    lSec(['Server virtualization', 'Виртуализация серверов', 'וירטואליזציה של שרתים'],
      lP(['Virtualization separates the operating system from the hardware: one physical server runs many virtual machines (VMs), each with its own OS. The hypervisor shares the CPU, memory and network between them.',
        'Виртуализация отделяет операционную систему от оборудования: один физический сервер запускает много виртуальных машин (ВМ), у каждой своя ОС. Гипервизор делит между ними процессор, память и сеть.',
        'וירטואליזציה מפרידה את מערכת ההפעלה מהחומרה: שרת פיזי אחד מריץ הרבה מכונות וירטואליות (VM), לכל אחת מערכת הפעלה משלה. ההיפרווייזר מחלק ביניהן את המעבד, הזיכרון והרשת.']),
      lTable(['', ['Type 1 (bare metal)', 'Тип 1 (bare metal)', 'סוג 1 (Bare metal)'], ['Type 2 (hosted)', 'Тип 2 (hosted)', 'סוג 2 (Hosted)']], [
        [['Runs on', 'Работает на', 'רץ על'], ['Directly on the hardware', 'Прямо на оборудовании', 'ישירות על החומרה'], ['On top of a host OS', 'Поверх основной ОС', 'מעל מערכת הפעלה מארחת']],
        [['Used in', 'Где используется', 'איפה משתמשים'], ['Data centers, servers', 'Дата-центры, серверы', 'דאטה סנטרים, שרתים'], ['Labs, desktops', 'Лаборатории, рабочие станции', 'מעבדות, מחשבים שולחניים']],
        [['Examples', 'Примеры', 'דוגמאות'], 'VMware ESXi, Microsoft Hyper-V, KVM, Xen', 'VirtualBox, VMware Workstation'],
      ]),
      lUL([
        ['Benefits: less hardware, power and space; faster provisioning; easy prototyping and testing; better uptime (VMs move between hosts); old systems keep running.', 'Плюсы: меньше оборудования, электричества и места; быстрое развёртывание; удобно делать прототипы и тесты; лучше доступность (ВМ переезжают между хостами); старые системы продолжают работать.', 'יתרונות: פחות חומרה, חשמל ומקום; הקמה מהירה; קל לבנות אבות טיפוס ולבדוק; זמינות טובה יותר (VM עוברות בין שרתים); מערכות ישנות ממשיכות לרוץ.'],
        ['Inside the host a virtual switch connects the VMs; a trunk carries their VLANs to the physical switch. Traffic between servers in the data center is east-west; traffic to and from users is north-south.', 'Внутри хоста ВМ соединяет виртуальный коммутатор; trunk несёт их VLAN к физическому коммутатору. Трафик между серверами в дата-центре — east-west; к пользователям и от них — north-south.', 'בתוך השרת, מתג וירטואלי מחבר את ה-VM; ‏trunk נושא את ה-VLAN שלהן למתג הפיזי. תעבורה בין שרתים בדאטה סנטר היא east-west; תעבורה אל המשתמשים וממנה היא north-south.'],
      ])),
    lSec(['Control, data and management planes', 'Плоскости управления, данных и менеджмента', 'מישורי הבקרה, הנתונים והניהול'],
      lTable([['Plane', 'Плоскость', 'מישור'], ['Job', 'Задача', 'תפקיד'], ['Examples', 'Примеры', 'דוגמאות']], [
        [['Control plane', 'Плоскость управления', 'מישור הבקרה'], ['The "brain": decides where traffic should go', '«Мозг»: решает, куда отправлять трафик', '"המוח": מחליט לאן התעבורה צריכה ללכת'], 'OSPF, STP, ARP, routing table'],
        [['Data plane', 'Плоскость данных', 'מישור הנתונים'], ['Forwards frames and packets fast', 'Быстро пересылает кадры и пакеты', 'מעביר מסגרות וחבילות מהר'], 'CEF, FIB, adjacency table, MAC table'],
        [['Management plane', 'Плоскость менеджмента', 'מישור הניהול'], ['Lets people and tools manage the device', 'Позволяет людям и системам управлять устройством', 'מאפשר לאנשים ולכלים לנהל את ההתקן'], 'SSH, SNMP, Syslog, NTP, APIs'],
      ]),
      lP(['In a traditional network every device has its own control plane. In software-defined networking (SDN) the control plane is moved to a central controller, and the devices mostly forward traffic.',
        'В обычной сети у каждого устройства своя плоскость управления. В программно-определяемой сети (SDN) плоскость управления вынесена в центральный контроллер, а устройства в основном пересылают трафик.',
        'ברשת מסורתית לכל התקן יש מישור בקרה משלו. ברשת מוגדרת תוכנה (SDN) מישור הבקרה עובר לבקר (controller) מרכזי, וההתקנים בעיקר מעבירים תעבורה.'])),
    lSec(['SDN architecture', 'Архитектура SDN', 'ארכיטקטורת SDN'],
      lCode('Applications (orchestration, monitoring, security)\n        ↕  northbound API (REST)\nSDN controller                        ← control plane\n        ↕  southbound API (OpenFlow, NETCONF, OpFlex)\nSwitches · routers · firewalls        ← data plane',
        ['Applications talk to the controller; the controller talks to the devices', 'Приложения говорят с контроллером; контроллер — с устройствами', 'האפליקציות מדברות עם הבקר; הבקר מדבר עם ההתקנים']),
      lUL([
        ['Northbound API — between the controller and the applications above it (usually REST).', 'Northbound API — между контроллером и приложениями над ним (обычно REST).', 'Northbound API — בין הבקר לאפליקציות שמעליו (בדרך כלל REST).'],
        ['Southbound API — between the controller and the network devices: OpenFlow, NETCONF, OpFlex, OVSDB.', 'Southbound API — между контроллером и сетевыми устройствами: OpenFlow, NETCONF, OpFlex, OVSDB.', 'Southbound API — בין הבקר להתקני הרשת: ‏OpenFlow, ‏NETCONF, ‏OpFlex, ‏OVSDB.'],
        ['SDN types: device-based (devices are programmed by apps directly), controller-based (a controller programs them), policy-based (the controller works from high-level policies — Cisco ACI, Catalyst Center).', 'Типы SDN: на устройствах (приложения программируют устройства напрямую), через контроллер (контроллер программирует их), на политиках (контроллер работает по высокоуровневым политикам — Cisco ACI, Catalyst Center).', 'סוגי SDN: מבוסס התקן (אפליקציות מתכנתות את ההתקנים ישירות), מבוסס בקר (בקר מתכנת אותם), מבוסס מדיניות (הבקר עובד לפי מדיניות ברמה גבוהה — Cisco ACI, ‏Catalyst Center).'],
      ])),
    lSec(['Cisco ACI and spine-leaf', 'Cisco ACI и spine-leaf', 'Cisco ACI ו-spine-leaf'],
      lCode('Spine1 ── Leaf1, Leaf2, Leaf3\nSpine2 ── Leaf1, Leaf2, Leaf3\nLeaf1 ── servers    Leaf2 ── servers    Leaf3 ── APIC controllers',
        ['Every leaf connects to every spine; leaves never connect to each other', 'Каждый leaf подключён к каждому spine; leaf между собой не соединяются', 'כל leaf מחובר לכל spine; ‏leafs לא מתחברים זה לזה']),
      lUL([
        ['Cisco Application Centric Infrastructure (ACI) is a data-center SDN solution. The APIC controller pushes policy to Nexus 9000 switches in a spine-leaf fabric.', 'Cisco Application Centric Infrastructure (ACI) — SDN-решение для дата-центров. Контроллер APIC передаёт политики коммутаторам Nexus 9000 в фабрике spine-leaf.', 'Cisco Application Centric Infrastructure ‏(ACI) הוא פתרון SDN לדאטה סנטרים. בקר ה-APIC דוחף מדיניות למתגי Nexus 9000 בבד (fabric) מסוג spine-leaf.'],
        ['Spine-leaf: any server reaches any other server in exactly two hops (leaf → spine → leaf), so latency is predictable and you scale by adding spines or leaves.', 'Spine-leaf: любой сервер достигает любого другого ровно за два перехода (leaf → spine → leaf), поэтому задержка предсказуема, а масштабирование — добавлением spine или leaf.', 'Spine-leaf: כל שרת מגיע לכל שרת אחר בדיוק בשתי קפיצות (leaf → spine → leaf), ולכן ההשהיה צפויה, וגדלים ע"י הוספת spines או leafs.'],
        ['The application network profile (ANP) groups endpoints (EPGs) and the rules between them — you describe what the application needs, not port-by-port configs.', 'Профиль сети приложения (ANP) объединяет группы конечных точек (EPG) и правила между ними — вы описываете, что нужно приложению, а не настройки порт за портом.', 'פרופיל רשת היישום (ANP) מקבץ קבוצות של נקודות קצה (EPG) ואת הכללים ביניהן — מתארים מה היישום צריך, ולא תצורה פורט אחרי פורט.'],
      ])),
  ],
  quiz: [
    lQ(['Microsoft 365 and Gmail are examples of which cloud model?', 'Microsoft 365 и Gmail — пример какой облачной модели?', 'Microsoft 365 ו-Gmail הם דוגמאות לאיזה מודל ענן?'],
      ['SaaS', 'PaaS', 'IaaS', ['Private cloud', 'Частное облако', 'ענן פרטי']], 0,
      ['You use finished software and manage nothing underneath.', 'Вы пользуетесь готовым ПО и ничем под ним не управляете.', 'משתמשים בתוכנה מוכנה ולא מנהלים שום דבר מתחת.']),
    lQ(['Where does a type 1 hypervisor run?', 'Где работает гипервизор типа 1?', 'על מה רץ היפרווייזר מסוג 1?'],
      [['Directly on the hardware (bare metal)', 'Прямо на оборудовании (bare metal)', 'ישירות על החומרה (bare metal)'], ['On top of Windows or macOS', 'Поверх Windows или macOS', 'מעל Windows או macOS'], ['Inside a VM', 'Внутри ВМ', 'בתוך VM'], ['In the web browser', 'В браузере', 'בדפדפן']], 0,
      ['ESXi, Hyper-V and KVM are type 1; VirtualBox is type 2.', 'ESXi, Hyper-V и KVM — тип 1; VirtualBox — тип 2.', 'ESXi, ‏Hyper-V ו-KVM הם סוג 1; ‏VirtualBox הוא סוג 2.']),
    lQ(['Which plane runs OSPF and builds the routing table?', 'Какая плоскость запускает OSPF и строит таблицу маршрутизации?', 'איזה מישור מריץ OSPF ובונה את טבלת הניתוב?'],
      [['Control plane', 'Плоскость управления', 'מישור הבקרה'], ['Data plane', 'Плоскость данных', 'מישור הנתונים'], ['Management plane', 'Плоскость менеджмента', 'מישור הניהול'], ['Application plane', 'Плоскость приложений', 'מישור היישומים']], 0,
      ['The control plane decides; the data plane forwards.', 'Плоскость управления решает; плоскость данных пересылает.', 'מישור הבקרה מחליט; מישור הנתונים מעביר.']),
    lQ(['Which plane forwards packets using CEF?', 'Какая плоскость пересылает пакеты с помощью CEF?', 'איזה מישור מעביר חבילות בעזרת CEF?'],
      [['Data plane', 'Плоскость данных', 'מישור הנתונים'], ['Control plane', 'Плоскость управления', 'מישור הבקרה'], ['Management plane', 'Плоскость менеджмента', 'מישור הניהול'], ['Northbound plane', 'Северная плоскость', 'המישור הצפוני']], 0,
      ['CEF uses the FIB and adjacency table built from the control plane.', 'CEF использует FIB и таблицу смежностей, построенные плоскостью управления.', 'CEF משתמש ב-FIB ובטבלת השכנויות שמישור הבקרה בנה.']),
    lQ(['In SDN, what is centralised in the controller?', 'Что в SDN централизовано в контроллере?', 'מה מרוכז בבקר ב-SDN?'],
      [['The control plane', 'Плоскость управления', 'מישור הבקרה'], ['The data plane', 'Плоскость данных', 'מישור הנתונים'], ['All the cabling', 'Вся кабельная система', 'כל הכבילה'], ['The power supply', 'Электропитание', 'אספקת החשמל']], 0,
      ['Devices keep forwarding; the decisions are made centrally.', 'Устройства продолжают пересылать; решения принимаются централизованно.', 'ההתקנים ממשיכים להעביר; ההחלטות מתקבלות במרכז.']),
    lQ(['What does the northbound API connect?', 'Что соединяет northbound API?', 'מה מחבר ה-northbound API?'],
      [['The controller and the applications', 'Контроллер и приложения', 'את הבקר ואת האפליקציות'], ['The controller and the switches', 'Контроллер и коммутаторы', 'את הבקר ואת המתגים'], ['Two switches', 'Два коммутатора', 'שני מתגים'], ['A VM and its hypervisor', 'ВМ и её гипервизор', 'VM וההיפרווייזר שלה']], 0,
      ['Southbound (OpenFlow, NETCONF) connects the controller and the devices.', 'Southbound (OpenFlow, NETCONF) соединяет контроллер и устройства.', 'Southbound ‏(OpenFlow, ‏NETCONF) מחבר את הבקר להתקנים.']),
    lQ(['Which statement about spine-leaf is true?', 'Какое утверждение о spine-leaf верно?', 'איזו טענה על spine-leaf נכונה?'],
      [['Every leaf connects to every spine', 'Каждый leaf подключён к каждому spine', 'כל leaf מחובר לכל spine'], ['Leaves connect to each other', 'Leaf соединяются друг с другом', 'Leafs מחוברים זה לזה'], ['Servers connect to the spines', 'Серверы подключаются к spine', 'שרתים מתחברים ל-spines'], ['There is only one spine', 'Spine всегда один', 'יש רק spine אחד']], 0,
      ['Servers connect to leaves; any server is two hops from any other.', 'Серверы подключаются к leaf; любой сервер в двух переходах от любого другого.', 'שרתים מתחברים ל-leafs; כל שרת נמצא בשתי קפיצות מכל שרת אחר.']),
    lQ(['Traffic between two VMs on servers in the same data center is called…', 'Трафик между двумя ВМ на серверах одного дата-центра называется…', 'תעבורה בין שתי VM בשרתים באותו דאטה סנטר נקראת…'],
      ['East-west', 'North-south', 'Southbound', 'Northbound'], 0,
      ['North-south goes between the data center and the users or the Internet.', 'North-south — между дата-центром и пользователями или Интернетом.', 'North-south עוברת בין הדאטה סנטר למשתמשים או לאינטרנט.']),
    lQ(['A cloud used by only one organisation is a…', 'Облако, которым пользуется только одна организация, — это…', 'ענן שרק ארגון אחד משתמש בו הוא…'],
      [['Private cloud', 'частное облако', 'ענן פרטי'], ['Public cloud', 'публичное облако', 'ענן ציבורי'], ['Community cloud', 'community-облако', 'ענן קהילתי'], ['SaaS', 'SaaS', 'SaaS']], 0,
      ['It can be on-premises or hosted by a provider.', 'Оно может быть у себя или у провайдера.', 'הוא יכול להיות אצל הארגון או אצל ספק.']),
  ],
});

// ---------------------------------------------------------------
const E2_HTTP = [
  { code: 200, en: 'OK — the request succeeded', ru: 'OK — запрос выполнен', he: 'OK — הבקשה הצליחה' },
  { code: 201, en: 'Created — a new resource was created', ru: 'Created — создан новый ресурс', he: 'Created — נוצר משאב חדש' },
  { code: 204, en: 'No Content — success, nothing to return', ru: 'No Content — успех, возвращать нечего', he: 'No Content — הצלחה, אין מה להחזיר' },
  { code: 400, en: 'Bad Request — the request is malformed', ru: 'Bad Request — запрос составлен неверно', he: 'Bad Request — הבקשה בנויה לא נכון' },
  { code: 401, en: 'Unauthorized — missing or wrong authentication', ru: 'Unauthorized — нет или неверная аутентификация', he: 'Unauthorized — חסר אימות או שהוא שגוי' },
  { code: 403, en: 'Forbidden — authenticated, but not allowed', ru: 'Forbidden — аутентифицирован, но нет прав', he: 'Forbidden — מאומת, אבל אין הרשאה' },
  { code: 404, en: 'Not Found — the resource does not exist', ru: 'Not Found — ресурс не существует', he: 'Not Found — המשאב לא קיים' },
  { code: 500, en: 'Internal Server Error — the server failed', ru: 'Internal Server Error — сбой на сервере', he: 'Internal Server Error — תקלה בשרת' },
];
const E2_CRUD = [
  { m: 'POST', en: 'create a new resource', ru: 'создать новый ресурс', he: 'ליצור משאב חדש', not: [] },
  { m: 'GET', en: 'read (retrieve) a resource', ru: 'прочитать (получить) ресурс', he: 'לקרוא (לקבל) משאב', not: [] },
  { m: 'PUT', en: 'update (replace) a whole resource', ru: 'обновить (заменить) ресурс целиком', he: 'לעדכן (להחליף) משאב שלם', not: ['PATCH'] },
  { m: 'PATCH', en: 'update only some fields of a resource', ru: 'обновить только часть полей ресурса', he: 'לעדכן רק חלק מהשדות של משאב', not: ['PUT'] },
  { m: 'DELETE', en: 'delete a resource', ru: 'удалить ресурс', he: 'למחוק משאב', not: [] },
];

lessonDef({
  id: 'ensa14', topic: null, drill: 'ops', minutes: 18, genInQuiz: 2,
  title: T('Network automation', 'Автоматизация сетей', 'אוטומציה של רשתות'),
  goal: T('Why automate, the data formats JSON, YAML and XML, APIs and REST (URIs, HTTP methods, status codes), NETCONF/RESTCONF and YANG, configuration management tools (Ansible, Puppet, Chef, SaltStack) and intent-based networking with Cisco Catalyst Center.',
    'Зачем автоматизировать, форматы данных JSON, YAML и XML, API и REST (URI, HTTP-методы, коды ответов), NETCONF/RESTCONF и YANG, системы управления конфигурацией (Ansible, Puppet, Chef, SaltStack) и сети на основе намерений с Cisco Catalyst Center.',
    'למה לעשות אוטומציה, פורמטי הנתונים JSON, ‏YAML ו-XML, ממשקי API ו-REST (URI, שיטות HTTP, קודי תשובה), ‏NETCONF/RESTCONF ו-YANG, כלים לניהול תצורה (Ansible, ‏Puppet, ‏Chef, ‏SaltStack) ורשתות מבוססות כוונה עם Cisco Catalyst Center.'),
  sections: [
    lSec(['Why automate', 'Зачем автоматизировать', 'למה אוטומציה'],
      lUL([
        ['Configuring 200 switches by hand is slow and full of typos. Automation is faster, consistent and repeatable, and it scales.', 'Настраивать 200 коммутаторов руками долго и с опечатками. Автоматизация быстрее, единообразна, повторяема и масштабируется.', 'להגדיר 200 מתגים ידנית זה איטי ומלא שגיאות הקלדה. אוטומציה מהירה יותר, אחידה, ניתנת לחזרה וגדלה בקלות.'],
        ['Modern devices are programmable: they expose APIs, so scripts (Python) and tools can read and change them without the CLI.', 'Современные устройства программируемы: у них есть API, поэтому скрипты (Python) и инструменты читают и меняют их без CLI.', 'התקנים מודרניים ניתנים לתכנות: יש להם API, כך שסקריפטים (Python) וכלים יכולים לקרוא ולשנות אותם בלי CLI.'],
        ['The network engineer\'s job shifts from typing commands to describing the desired state and checking it.', 'Работа сетевого инженера смещается от набора команд к описанию нужного состояния и его проверке.', 'העבודה של מהנדס הרשת עוברת מהקלדת פקודות לתיאור המצב הרצוי ובדיקה שלו.'],
      ])),
    lSec(['Data formats', 'Форматы данных', 'פורמטים של נתונים'],
      lCode('JSON\n{\n  "hostname": "R1",\n  "interfaces": [\n    { "name": "GigabitEthernet0/0/0", "ipv4": "192.168.1.1", "enabled": true },\n    { "name": "GigabitEthernet0/0/1", "ipv4": "10.1.1.1", "enabled": false }\n  ]\n}\n\nYAML\nhostname: R1\ninterfaces:\n  - name: GigabitEthernet0/0/0\n    ipv4: 192.168.1.1\n    enabled: true\n  - name: GigabitEthernet0/0/1\n    ipv4: 10.1.1.1\n    enabled: false\n\nXML\n<device>\n  <hostname>R1</hostname>\n  <interface><name>GigabitEthernet0/0/0</name><ipv4>192.168.1.1</ipv4></interface>\n</device>',
        ['The same data in three formats', 'Одни и те же данные в трёх форматах', 'אותם נתונים בשלושה פורמטים']),
      lUL([
        ['All three are key/value pairs that can be nested. JSON: {} objects, [] arrays (lists), "key": value, keys in double quotes. Array positions count from 0.', 'Все три — пары ключ/значение с вложенностью. JSON: {} — объекты, [] — массивы (списки), "ключ": значение, ключи в двойных кавычках. Позиции в массиве считаются с 0.', 'שלושתם זוגות מפתח/ערך שאפשר לקנן. ‏JSON: {} אובייקטים, [] מערכים (רשימות), ‏"key": value, מפתחות במירכאות כפולות. מיקומים במערך נספרים מ-0.'],
        ['YAML — minimal punctuation; indentation shows nesting and "- " starts a list item. Ansible playbooks are YAML.', 'YAML — минимум знаков; вложенность задаётся отступами, «- » начинает элемент списка. Плейбуки Ansible пишутся на YAML.', 'YAML — מינימום סימנים; ההזחה מראה את הקינון, ו-"- " מתחיל פריט ברשימה. ה-playbooks של Ansible כתובים ב-YAML.'],
        ['XML — <tag>value</tag>, verbose; used by NETCONF.', 'XML — <тег>значение</тег>, многословный; используется в NETCONF.', 'XML — ‏<tag>value</tag>, ארוך; משמש את NETCONF.'],
      ])),
    lSec(['APIs and REST', 'API и REST', 'API ו-REST'],
      lP(['An API is a set of rules that lets one program use another. REST is the most popular style for web APIs: it runs over HTTP(S), is stateless (every request carries everything needed, including the token), and each resource has a URI.',
        'API — набор правил, по которым одна программа использует другую. REST — самый популярный стиль веб-API: работает поверх HTTP(S), без состояния (в каждом запросе всё необходимое, включая токен), у каждого ресурса свой URI.',
        'API הוא אוסף כללים שמאפשר לתוכנה אחת להשתמש בתוכנה אחרת. ‏REST הוא הסגנון הפופולרי ביותר ל-API ב-web: הוא עובד מעל HTTP(S), הוא stateless (כל בקשה נושאת את כל מה שצריך, כולל ה-token), ולכל משאב יש URI.']),
      lCode('GET https://catalyst.example.com/dna/intent/api/v1/network-device?hostname=R1\nX-Auth-Token: <token>\n\nHTTP/1.1 200 OK\nContent-Type: application/json\n{"response": [{"hostname": "R1", "managementIpAddress": "10.1.1.1", "softwareVersion": "17.9.4a"}]}',
        ['protocol https:// · server · path /dna/intent/api/v1/network-device (the resource) · query ?hostname=R1', 'протокол https:// · сервер · путь /dna/intent/api/v1/network-device (ресурс) · запрос ?hostname=R1', 'פרוטוקול https:// · שרת · נתיב ‎/dna/intent/api/v1/network-device (המשאב) · שאילתה ‎?hostname=R1']),
      lTable([['Operation (CRUD)', 'Операция (CRUD)', 'פעולה (CRUD)'], ['HTTP method', 'HTTP-метод', 'שיטת HTTP']], [
        [['Create', 'Создать', 'יצירה'], 'POST'], [['Read', 'Прочитать', 'קריאה'], 'GET'], [['Update', 'Обновить', 'עדכון'], 'PUT / PATCH'], [['Delete', 'Удалить', 'מחיקה'], 'DELETE'],
      ]),
      lTip(['Status codes: 2xx success (200, 201, 204), 4xx your mistake (400, 401, 403, 404), 5xx server problem (500, 503).', 'Коды ответов: 2xx — успех (200, 201, 204), 4xx — ошибка клиента (400, 401, 403, 404), 5xx — проблема сервера (500, 503).', 'קודי תשובה: 2xx הצלחה (200, ‏201, ‏204), ‏4xx טעות של הלקוח (400, ‏401, ‏403, ‏404), ‏5xx בעיה בשרת (500, ‏503).'])),
    lSec(['NETCONF, RESTCONF and YANG', 'NETCONF, RESTCONF и YANG', 'NETCONF, ‏RESTCONF ו-YANG'],
      lUL([
        ['YANG is a data modelling language: it describes exactly which settings a device has and their types (for example the ietf-interfaces model).', 'YANG — язык моделирования данных: описывает, какие именно настройки есть у устройства и их типы (например, модель ietf-interfaces).', 'YANG היא שפת מידול נתונים: היא מתארת בדיוק אילו הגדרות יש להתקן ומה הסוגים שלהן (למשל המודל ietf-interfaces).'],
        ['NETCONF — reads and changes YANG data over SSH (port 830), with XML.', 'NETCONF — читает и меняет данные YANG через SSH (порт 830) в XML.', 'NETCONF — קורא ומשנה נתוני YANG מעל SSH (פורט 830), ב-XML.'],
        ['RESTCONF — the same YANG data through a REST API over HTTPS, with JSON or XML.', 'RESTCONF — те же данные YANG через REST API по HTTPS, в JSON или XML.', 'RESTCONF — אותם נתוני YANG דרך REST API מעל HTTPS, ב-JSON או ב-XML.'],
      ]),
      lCode('R1(config)# netconf-yang\nR1(config)# restconf\nR1(config)# ip http secure-server', ['Turning on the programmable interfaces of an IOS XE router', 'Включение программных интерфейсов роутера IOS XE', 'הפעלת הממשקים הניתנים לתכנות בנתב IOS XE'])),
    lSec(['Configuration management tools', 'Системы управления конфигурацией', 'כלים לניהול תצורה'],
      lTable(['', 'Ansible', 'Puppet', 'Chef', 'SaltStack'], [
        [['Agent on device', 'Агент на устройстве', 'סוכן בהתקן'], ['No (agentless, SSH)', 'Нет (без агента, SSH)', 'לא (בלי סוכן, SSH)'], ['Yes', 'Да', 'כן'], ['Yes', 'Да', 'כן'], ['Yes (minions)', 'Да (minions)', 'כן (minions)']],
        [['Language', 'Язык', 'שפה'], 'Python, YAML', 'Ruby', 'Ruby', 'Python'],
        [['Files', 'Файлы', 'קבצים'], 'Playbook', 'Manifest', 'Cookbook / recipe', 'Pillar'],
        [['Model', 'Модель', 'מודל'], 'Push', 'Pull', 'Pull', 'Push'],
      ]),
      lCode('- name: Configure NTP on all routers\n  hosts: routers\n  gather_facts: no\n  tasks:\n    - name: Set the NTP server\n      cisco.ios.ios_config:\n        lines:\n          - ntp server 192.168.1.10', ['An Ansible playbook (YAML)', 'Плейбук Ansible (YAML)', 'Playbook של Ansible ‏(YAML)']),
      lP(['Intent-based networking (IBN): you state the business intent ("guests get Internet only"), and the system translates it into configuration, activates it on all devices and keeps checking (assurance) that the network really behaves that way. Cisco Catalyst Center (formerly DNA Center) is Cisco\'s controller for this: Design, Policy, Provision, Assurance.',
        'Сеть на основе намерений (IBN): вы формулируете бизнес-намерение («гостям — только Интернет»), а система переводит его в конфигурацию, применяет на всех устройствах и постоянно проверяет (assurance), что сеть действительно так работает. Cisco Catalyst Center (бывший DNA Center) — контроллер Cisco для этого: Design, Policy, Provision, Assurance.',
        'רשת מבוססת כוונה (IBN): מגדירים את הכוונה העסקית ("לאורחים רק אינטרנט"), והמערכת מתרגמת אותה לתצורה, מפעילה אותה בכל ההתקנים ובודקת כל הזמן (assurance) שהרשת באמת מתנהגת כך. ‏Cisco Catalyst Center (לשעבר DNA Center) הוא הבקר של Cisco לזה: ‏Design, ‏Policy, ‏Provision, ‏Assurance.'])),
  ],
  quiz: [
    lQ(['Which data format uses indentation and "- " list items and is used for Ansible playbooks?', 'Какой формат использует отступы и элементы списка «- » и применяется в плейбуках Ansible?', 'איזה פורמט משתמש בהזחה ובפריטי רשימה "- " ומשמש ל-playbooks של Ansible?'],
      ['YAML', 'JSON', 'XML', 'CSV'], 0,
      ['JSON uses braces and brackets; XML uses tags.', 'JSON — фигурные и квадратные скобки; XML — теги.', 'JSON משתמש בסוגריים מסולסלים ומרובעים; ‏XML בתגיות.']),
    lQ(['How is a list (array) written in JSON?', 'Как в JSON записывается список (массив)?', 'איך כותבים רשימה (מערך) ב-JSON?'],
      [['In square brackets [ ]', 'В квадратных скобках [ ]', 'בסוגריים מרובעים [ ]'], ['In curly braces { }', 'В фигурных скобках { }', 'בסוגריים מסולסלים { }'], ['With < > tags', 'Тегами < >', 'בתגיות < >'], ['One item per indented line starting with "- "', 'По элементу в строке с «- » и отступом', 'פריט בכל שורה מוזחת שמתחילה ב-"- "']], 0,
      ['Curly braces hold an object of key/value pairs.', 'В фигурных скобках — объект из пар ключ/значение.', 'סוגריים מסולסלים מכילים אובייקט של זוגות מפתח/ערך.']),
    lQ(['Which HTTP method reads data from a REST API?', 'Какой HTTP-метод читает данные из REST API?', 'איזו שיטת HTTP קוראת נתונים מ-REST API?'],
      ['GET', 'POST', 'PUT', 'DELETE'], 0,
      ['POST creates, PUT/PATCH update, DELETE deletes.', 'POST создаёт, PUT/PATCH обновляют, DELETE удаляет.', 'POST יוצר, ‏PUT/PATCH מעדכנים, ‏DELETE מוחק.']),
    lQ(['Which tool is agentless and pushes changes over SSH?', 'Какой инструмент работает без агента и отправляет изменения по SSH?', 'איזה כלי עובד בלי סוכן ודוחף שינויים מעל SSH?'],
      ['Ansible', 'Puppet', 'Chef', 'SaltStack'], 0,
      ['Puppet, Chef and SaltStack use agents (minions).', 'Puppet, Chef и SaltStack используют агентов (minions).', 'Puppet, ‏Chef ו-SaltStack משתמשים בסוכנים (minions).']),
    lQ(['What does "stateless" mean for a REST API?', 'Что значит «stateless» для REST API?', 'מה המשמעות של "stateless" ב-REST API?'],
      [['Each request carries everything needed; the server keeps no session', 'Каждый запрос несёт всё необходимое; сервер не хранит сессию', 'כל בקשה נושאת את כל מה שצריך; השרת לא שומר סשן'], ['The API never changes anything', 'API ничего не меняет', 'ה-API אף פעם לא משנה כלום'], ['There is no authentication', 'Аутентификации нет', 'אין אימות'], ['Responses cannot be cached', 'Ответы нельзя кэшировать', 'אי אפשר לשמור תשובות במטמון']], 0,
      ['That is why the token is sent with every request.', 'Поэтому токен отправляется с каждым запросом.', 'לכן ה-token נשלח עם כל בקשה.']),
    lQ(['In a URI, what comes after the "?"', 'Что в URI идёт после «?»?', 'מה בא ב-URI אחרי ה-"?"?'],
      [['Query parameters (key=value)', 'Параметры запроса (ключ=значение)', 'פרמטרי שאילתה (key=value)'], ['The protocol', 'Протокол', 'הפרוטוקול'], ['The server name', 'Имя сервера', 'שם השרת'], ['The HTTP method', 'HTTP-метод', 'שיטת ה-HTTP']], 0,
      ['protocol://server/path?query.', 'протокол://сервер/путь?запрос.', 'protocol://server/path?query.']),
    lQ(['Which protocol changes YANG data over SSH port 830 using XML?', 'Какой протокол меняет данные YANG через SSH на порту 830 в XML?', 'איזה פרוטוקול משנה נתוני YANG מעל SSH בפורט 830 ב-XML?'],
      ['NETCONF', 'RESTCONF', 'SNMP', 'Telnet'], 0,
      ['RESTCONF uses HTTPS with JSON or XML.', 'RESTCONF использует HTTPS с JSON или XML.', 'RESTCONF משתמש ב-HTTPS עם JSON או XML.']),
    lQ(['What is intent-based networking?', 'Что такое сеть на основе намерений?', 'מהי רשת מבוססת כוונה?'],
      [['You state the desired outcome; the system configures it and keeps verifying it', 'Вы задаёте нужный результат; система настраивает его и постоянно проверяет', 'מגדירים את התוצאה הרצויה; המערכת מגדירה אותה ובודקת אותה כל הזמן'], ['Typing every command by hand', 'Ввод каждой команды вручную', 'הקלדה ידנית של כל פקודה'], ['A new routing protocol', 'Новый протокол маршрутизации', 'פרוטוקול ניתוב חדש'], ['A kind of cable', 'Тип кабеля', 'סוג של כבל']], 0,
      ['Cisco Catalyst Center is an IBN controller.', 'Cisco Catalyst Center — IBN-контроллер.', 'Cisco Catalyst Center הוא בקר IBN.']),
    lQ(['A REST call returns HTTP 401. What is wrong?', 'REST-запрос вернул HTTP 401. Что не так?', 'קריאת REST החזירה HTTP 401. מה הבעיה?'],
      [['Authentication is missing or wrong (for example an expired token)', 'Нет аутентификации или она неверна (например, истёк токен)', 'האימות חסר או שגוי (למשל token שפג תוקפו)'], ['The server crashed', 'Сервер упал', 'השרת קרס'], ['The resource was created', 'Ресурс создан', 'המשאב נוצר'], ['Everything is fine', 'Всё в порядке', 'הכול בסדר']], 0,
      ['403 = authenticated but not allowed; 500 = server error.', '403 — аутентифицирован, но нет прав; 500 — ошибка сервера.', '403 = מאומת אבל אין הרשאה; ‏500 = שגיאת שרת.']),
  ],
  gen: [
    function genHttpStatus(rng) {
      const s = rng.pick(E2_HTTP), others = rng.shuffle(E2_HTTP.filter((x) => x !== s));
      const why = T(s.code + ' = ' + s.en + '. 2xx success, 4xx client error, 5xx server error.', s.code + ' = ' + s.ru + '. 2xx — успех, 4xx — ошибка клиента, 5xx — ошибка сервера.', s.code + ' = ' + s.he + '. ‏2xx הצלחה, ‏4xx שגיאת לקוח, ‏5xx שגיאת שרת.');
      if (rng.chance(0.5)) return lGen(T('A REST API call returns HTTP ' + s.code + '. What does it mean?', 'REST-запрос вернул HTTP ' + s.code + '. Что это значит?', 'קריאת REST API החזירה HTTP ' + s.code + '. מה זה אומר?'),
        T(s.en, s.ru, s.he), others.map((x) => T(x.en, x.ru, x.he)), why);
      const name = s.en.split(' — ')[0];
      return lGen(T('Which HTTP status code means "' + name + '"?', 'Какой HTTP-код означает «' + name + '»?', 'איזה קוד HTTP אומר "' + name + '"?'), String(s.code), others.map((x) => String(x.code)), why);
    },
    function genRestVerb(rng) {
      const c = rng.pick(E2_CRUD);
      return lGen(T('Which HTTP method does a REST API use to ' + c.en + '?', 'Какой HTTP-метод REST API использует, чтобы ' + c.ru + '?', 'באיזו שיטת HTTP משתמש REST API כדי ' + c.he + '?'),
        c.m, rng.shuffle(E2_CRUD.filter((x) => x !== c && !c.not.includes(x.m)).map((x) => x.m)),
        T('CRUD → HTTP: Create = POST, Read = GET, Update = PUT (whole) / PATCH (part), Delete = DELETE.', 'CRUD → HTTP: создать — POST, прочитать — GET, обновить — PUT (целиком) / PATCH (частично), удалить — DELETE.', 'CRUD → HTTP: יצירה = POST, קריאה = GET, עדכון = PUT (שלם) / PATCH (חלקי), מחיקה = DELETE.'));
    },
    function genJsonValue(rng) {
      const used = new Set(), names = ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'GigabitEthernet0/0/2', 'Loopback0'];
      const n = rng.int(3, 4), off = rng.int(0, n - 1);
      const ifs = names.slice(0, n).map((name, i) => ({ name, ipv4: e2Uniq(used, () => lRandHostIp(rng)), enabled: i !== off }));
      const obj = { hostname: 'R' + rng.int(1, 9), interfaces: ifs };
      const q = rng.chance(0.6)
        ? (() => {
          const i = rng.int(0, n - 1);
          return lGen(T('In this JSON, what is the value of interfaces[' + i + '].ipv4?', 'Какое значение у interfaces[' + i + '].ipv4 в этом JSON?', 'מה הערך של interfaces[' + i + '].ipv4 ב-JSON הזה?'),
            ifs[i].ipv4, rng.shuffle(ifs.filter((x, k) => k !== i).map((x) => x.ipv4)),
            T('Arrays count from 0, so interfaces[' + i + '] is the ' + ['first', 'second', 'third', 'fourth'][i] + ' interface: ' + ifs[i].name + '.', 'Массивы считаются с 0, поэтому interfaces[' + i + '] — ' + ['первый', 'второй', 'третий', 'четвёртый'][i] + ' интерфейс: ' + ifs[i].name + '.', 'מערכים נספרים מ-0, ולכן interfaces[' + i + '] הוא הממשק ה' + ['ראשון', 'שני', 'שלישי', 'רביעי'][i] + ': ' + ifs[i].name + '.'));
        })()
        : lGen(T('In this JSON, which interface is disabled?', 'Какой интерфейс в этом JSON выключен?', 'איזה ממשק מושבת ב-JSON הזה?'),
          ifs[off].name, rng.shuffle(ifs.filter((x) => x.enabled).map((x) => x.name)),
          T('It is the one with "enabled": false.', 'Тот, у которого "enabled": false.', 'זה הממשק עם "enabled": false.'));
      q.code = JSON.stringify(obj, null, 2);
      return q;
    },
  ],
});

// =================================================================
// Глоссарий ENSA 2–14
G('ensa02', 'Passive interface', 'Пассивный интерфейс', 'ממשק פסיבי', 'An OSPF interface that sends no Hellos (so no neighbours form there) but whose network is still advertised.', 'Интерфейс OSPF, который не шлёт Hello (соседства там нет), но его сеть всё равно объявляется.', 'ממשק OSPF שלא שולח Hello (ולכן לא נוצרת בו שכנות), אבל הרשת שלו עדיין מפורסמת.');
G('ensa02', 'Reference bandwidth', 'Опорная полоса', 'רוחב פס ייחוס', 'The value OSPF divides by the interface bandwidth to get the cost: 100 Mbps by default (auto-cost reference-bandwidth).', 'Значение, которое OSPF делит на полосу интерфейса, чтобы получить cost: по умолчанию 100 Мбит/с (auto-cost reference-bandwidth).', 'הערך ש-OSPF מחלק ברוחב הפס של הממשק כדי לקבל cost: ‏100 Mbps כברירת מחדל (auto-cost reference-bandwidth).');
G('ensa02', 'OSPF priority', 'Приоритет OSPF', 'עדיפות OSPF', '0–255 per interface (default 1); the highest becomes DR; 0 means never DR or BDR.', '0–255 на интерфейсе (по умолчанию 1); наибольший становится DR; 0 — никогда не DR и не BDR.', '0–255 לכל ממשק (ברירת מחדל 1); הגבוה ביותר נהיה DR; ‏0 אומר לעולם לא DR או BDR.');
G('ensa02', 'ASBR', 'ASBR', 'ASBR', 'Autonomous System Boundary Router: an OSPF router that brings in external routes, e.g. a default route with default-information originate.', 'Пограничный роутер автономной системы: роутер OSPF, вносящий внешние маршруты, например маршрут по умолчанию через default-information originate.', 'נתב גבול של מערכת אוטונומית: נתב OSPF שמכניס נתיבים חיצוניים, למשל נתיב ברירת מחדל עם default-information originate.');
G('ensa03', 'Threat actor', 'Злоумышленник (threat actor)', 'גורם איום (Threat actor)', 'A person or group that carries out attacks: script kiddies, hacktivists, cyber criminals, state-sponsored groups.', 'Человек или группа, которые проводят атаки: скрипт-кидди, хактивисты, киберпреступники, государственные группы.', 'אדם או קבוצה שמבצעים מתקפות: script kiddies, האקטיביסטים, פושעי סייבר, קבוצות בחסות מדינה.');
G('ensa03', 'Ransomware', 'Вымогатель (ransomware)', 'כופרה (Ransomware)', 'Malware that encrypts the victim\'s data and demands payment for the key.', 'Вредоносное ПО, которое шифрует данные жертвы и требует выкуп за ключ.', 'נוזקה שמצפינה את המידע של הקורבן ודורשת תשלום תמורת המפתח.');
G('ensa03', 'Social engineering', 'Социальная инженерия', 'הנדסה חברתית', 'Tricking people into giving information or access: phishing, pretexting, tailgating.', 'Обман людей, чтобы получить информацию или доступ: фишинг, выдуманный предлог, проход «хвостом».', 'הטעיית אנשים כדי לקבל מידע או גישה: פישינג, תואנה בדויה, השתחלות.');
G('ensa03', 'Hash', 'Хеш', 'גיבוב (Hash)', 'A fixed-length fingerprint of data (SHA-256); any change gives a different hash — used for integrity.', 'Отпечаток данных фиксированной длины (SHA-256); любое изменение даёт другой хеш — используется для целостности.', 'טביעת אצבע באורך קבוע של מידע (SHA-256); כל שינוי נותן גיבוב אחר — משמש לשלמות.');
G('ensa03', 'Symmetric encryption', 'Симметричное шифрование', 'הצפנה סימטרית', 'The same key encrypts and decrypts (AES); fast, used for bulk data.', 'Один и тот же ключ шифрует и расшифровывает (AES); быстро, для больших объёмов.', 'אותו מפתח מצפין ומפענח (AES); מהיר, משמש לכמויות גדולות של מידע.');
G('ensa03', 'Asymmetric encryption', 'Асимметричное шифрование', 'הצפנה אסימטרית', 'A public/private key pair (RSA); slower, used for key exchange and digital signatures.', 'Пара открытый/закрытый ключ (RSA); медленнее, для обмена ключами и цифровых подписей.', 'זוג מפתחות ציבורי/פרטי (RSA); איטי יותר, משמש להחלפת מפתחות ולחתימות דיגיטליות.');
G('ensa03', 'CIA triad', 'Триада CIA', 'משולש CIA', 'The three goals of security: confidentiality, integrity, availability.', 'Три цели безопасности: конфиденциальность, целостность, доступность.', 'שלוש מטרות האבטחה: סודיות, שלמות, זמינות.');
G('ensa04', 'ACL', 'ACL (список доступа)', 'ACL (רשימת בקרת גישה)', 'Access control list: an ordered list of permit/deny statements that filters or selects traffic.', 'Список управления доступом: упорядоченный список строк permit/deny, который фильтрует или выбирает трафик.', 'רשימת בקרת גישה: רשימה מסודרת של שורות permit/deny שמסננת או בוחרת תעבורה.');
G('ensa04', 'ACE', 'ACE', 'ACE', 'Access control entry: one permit or deny line of an ACL.', 'Access control entry: одна строка permit или deny в ACL.', 'Access control entry: שורת permit או deny אחת ב-ACL.');
G('ensa04', 'Implicit deny', 'Неявный запрет', 'דחייה מרומזת (Implicit deny)', 'The invisible "deny any" at the end of every ACL.', 'Невидимый «deny any» в конце каждого ACL.', 'ה-"deny any" הבלתי נראה בסוף כל ACL.');
G('ensa04', 'Standard ACL', 'Стандартный ACL', 'ACL סטנדרטי', 'Filters on the source IPv4 address only; numbers 1–99 and 1300–1999; placed close to the destination.', 'Фильтрует только по IPv4-адресу источника; номера 1–99 и 1300–1999; ставится ближе к получателю.', 'מסנן רק לפי כתובת ה-IPv4 של המקור; מספרים 1–99 ו-1300–1999; ממוקם קרוב ליעד.');
G('ensa04', 'Extended ACL', 'Расширенный ACL', 'ACL מורחב', 'Filters on protocol, source, destination and ports; numbers 100–199 and 2000–2699; placed close to the source.', 'Фильтрует по протоколу, источнику, получателю и портам; номера 100–199 и 2000–2699; ставится ближе к источнику.', 'מסנן לפי פרוטוקול, מקור, יעד ופורטים; מספרים 100–199 ו-2000–2699; ממוקם קרוב למקור.');
G('ensa05', 'Named ACL', 'Именованный ACL', 'ACL עם שם', 'An ACL identified by a name; single lines can be inserted or removed by sequence number.', 'ACL с именем; отдельные строки можно вставлять или удалять по порядковому номеру.', 'ACL שמזוהה בשם; אפשר להכניס או למחוק שורות בודדות לפי מספר רצף.');
G('ensa05', 'access-class', 'access-class', 'access-class', 'The line command that applies an ACL to VTY lines to limit who can manage the device remotely.', 'Команда линии, которая применяет ACL к линиям VTY, чтобы ограничить удалённое управление.', 'פקודת הקו שמחילה ACL על קווי VTY כדי להגביל מי מנהל את ההתקן מרחוק.');
G('ensa05', 'established (ACL keyword)', 'established (в ACL)', 'established (מילת מפתח ב-ACL)', 'Matches TCP segments with ACK or RST set — return traffic of sessions started inside.', 'Совпадает с TCP-сегментами с ACK или RST — ответным трафиком сессий, начатых изнутри.', 'מתאים למקטעי TCP עם ACK או RST — תעבורה חוזרת של סשנים שהתחילו מבפנים.');
G('ensa06', 'Inside local address', 'Inside local адрес', 'כתובת Inside local', 'The real (usually private) address of an inside host.', 'Настоящий (обычно частный) адрес внутреннего хоста.', 'הכתובת האמיתית (בדרך כלל פרטית) של מארח פנימי.');
G('ensa06', 'Inside global address', 'Inside global адрес', 'כתובת Inside global', 'The public address that represents an inside host to the outside.', 'Публичный адрес, которым внутренний хост представлен снаружи.', 'הכתובת הציבורית שמייצגת מארח פנימי כלפי חוץ.');
G('ensa06', 'Outside global address', 'Outside global адрес', 'כתובת Outside global', 'The real address of a host on the outside network.', 'Настоящий адрес хоста во внешней сети.', 'הכתובת האמיתית של מארח ברשת החיצונית.');
G('ensa06', 'Static NAT', 'Статический NAT', 'NAT סטטי', 'A permanent one-to-one mapping, used for servers that must be reachable from outside.', 'Постоянное соответствие «один к одному» для серверов, доступных снаружи.', 'מיפוי קבוע של אחד-לאחד, לשרתים שחייבים להיות נגישים מבחוץ.');
G('ensa06', 'Dynamic NAT', 'Динамический NAT', 'NAT דינמי', 'Inside hosts get public addresses from a pool, one-to-one, first come first served.', 'Внутренние хосты получают публичные адреса из пула, «один к одному», в порядке очереди.', 'מארחים פנימיים מקבלים כתובות ציבוריות ממאגר, אחד-לאחד, לפי סדר הגעה.');
G('ensa06', 'PAT (NAT overload)', 'PAT (NAT overload)', 'PAT ‏(NAT overload)', 'Many inside hosts share one public address; sessions are told apart by port numbers.', 'Много внутренних хостов делят один публичный адрес; сессии различаются по портам.', 'הרבה מארחים פנימיים חולקים כתובת ציבורית אחת; מבדילים בין הסשנים לפי מספרי פורטים.');
G('ensa07', 'Demarcation point', 'Точка разграничения', 'נקודת הפרדה (Demarc)', 'Where the customer\'s responsibility ends and the service provider\'s begins.', 'Место, где кончается ответственность клиента и начинается ответственность провайдера.', 'המקום שבו האחריות של הלקוח נגמרת ושל ספק השירות מתחילה.');
G('ensa07', 'Local loop', 'Абонентская линия (последняя миля)', 'לולאה מקומית (Last mile)', 'The line from the customer site to the provider\'s central office — the "last mile".', 'Линия от площадки клиента до центрального узла провайдера — «последняя миля».', 'הקו מאתר הלקוח למרכזייה של הספק — ה-"last mile".');
G('ensa07', 'DTE / DCE', 'DTE / DCE', 'DTE / DCE', 'DTE is the customer device (router); DCE connects it to the WAN and provides the clock (modem, CSU/DSU).', 'DTE — устройство клиента (роутер); DCE подключает его к WAN и даёт тактирование (модем, CSU/DSU).', 'DTE הוא התקן הלקוח (נתב); ‏DCE מחבר אותו ל-WAN ונותן שעון (מודם, ‏CSU/DSU).');
G('ensa07', 'MPLS', 'MPLS', 'MPLS', 'Multiprotocol Label Switching: provider WAN that forwards by short labels, carries any traffic and offers Layer 2 and Layer 3 VPNs.', 'Multiprotocol Label Switching: WAN провайдера, пересылающий по коротким меткам, переносит любой трафик и даёт VPN 2-го и 3-го уровня.', 'Multiprotocol Label Switching: ‏WAN של ספק שמעביר לפי תוויות קצרות, נושא כל תעבורה ומציע VPN בשכבה 2 ובשכבה 3.');
G('ensa07', 'Metro Ethernet', 'Metro Ethernet', 'Metro Ethernet', 'An Ethernet-based WAN service across a city or region; sites look like one switched LAN.', 'WAN-сервис на основе Ethernet в пределах города или региона; площадки выглядят как одна коммутируемая LAN.', 'שירות WAN מבוסס Ethernet ברחבי עיר או אזור; האתרים נראים כמו LAN ממותג אחד.');
G('ensa07', 'Full mesh', 'Полносвязная топология', 'רשת מלאה (Full mesh)', 'Every site connects directly to every other site: n(n−1)/2 links.', 'Каждая площадка соединена с каждой: n(n−1)/2 каналов.', 'כל אתר מחובר ישירות לכל אתר אחר: n(n−1)/2 קישורים.');
G('ensa08', 'Site-to-site VPN', 'VPN «сеть–сеть»', 'VPN בין אתרים (Site-to-site)', 'A permanent tunnel between VPN gateways that joins whole networks; hosts do not know about it.', 'Постоянный туннель между VPN-шлюзами, соединяющий целые сети; хосты о нём не знают.', 'מנהרה קבועה בין שערי VPN שמחברת רשתות שלמות; המארחים לא יודעים עליה.');
G('ensa08', 'Remote-access VPN', 'VPN удалённого доступа', 'VPN לגישה מרחוק', 'A VPN for single users: with a client (AnyConnect) or clientless through a browser (SSL/TLS).', 'VPN для отдельных пользователей: с клиентом (AnyConnect) или без клиента, через браузер (SSL/TLS).', 'VPN למשתמשים בודדים: עם לקוח (AnyConnect) או בלי לקוח, דרך דפדפן (SSL/TLS).');
G('ensa08', 'IPsec', 'IPsec', 'IPsec', 'A framework that secures IP packets: confidentiality, integrity, authentication and secure key exchange.', 'Фреймворк защиты IP-пакетов: конфиденциальность, целостность, аутентификация и безопасный обмен ключами.', 'מסגרת שמאבטחת חבילות IP: סודיות, שלמות, אימות והחלפת מפתחות מאובטחת.');
G('ensa08', 'ESP', 'ESP', 'ESP', 'Encapsulating Security Payload (IP protocol 50): encrypts and authenticates the packet.', 'Encapsulating Security Payload (IP-протокол 50): шифрует и аутентифицирует пакет.', 'Encapsulating Security Payload ‏(IP protocol 50): מצפין ומאמת את החבילה.');
G('ensa08', 'AH', 'AH', 'AH', 'Authentication Header (IP protocol 51): integrity and authentication without encryption.', 'Authentication Header (IP-протокол 51): целостность и аутентификация без шифрования.', 'Authentication Header ‏(IP protocol 51): שלמות ואימות בלי הצפנה.');
G('ensa08', 'Diffie-Hellman (DH)', 'Diffie-Hellman (DH)', 'Diffie-Hellman ‏(DH)', 'A method for two peers to create the same secret key over an insecure network without sending it.', 'Способ двум сторонам получить один и тот же секретный ключ по незащищённой сети, не передавая его.', 'שיטה שבה שני צדדים יוצרים את אותו מפתח סודי ברשת לא מאובטחת בלי לשלוח אותו.');
G('ensa08', 'GRE', 'GRE', 'GRE', 'Generic Routing Encapsulation: a simple unencrypted tunnel that can carry multicast and routing protocols.', 'Generic Routing Encapsulation: простой незашифрованный туннель, который переносит multicast и протоколы маршрутизации.', 'Generic Routing Encapsulation: מנהרה פשוטה ולא מוצפנת שיכולה לשאת multicast ופרוטוקולי ניתוב.');
G('ensa09', 'Jitter', 'Джиттер', 'ג׳יטר (Jitter)', 'Variation in delay between packets; harmful for voice and video.', 'Разброс задержки между пакетами; вреден для голоса и видео.', 'השונות בהשהיה בין חבילות; מזיקה לקול ולווידאו.');
G('ensa09', 'DSCP', 'DSCP', 'DSCP', 'Differentiated Services Code Point: a 6-bit QoS marking in the IP header (0–63); EF = 46 for voice.', 'Differentiated Services Code Point: 6-битная метка QoS в IP-заголовке (0–63); EF = 46 для голоса.', 'Differentiated Services Code Point: סימון QoS של 6 סיביות בכותרת ה-IP ‏(0–63); ‏EF = 46 לקול.');
G('ensa09', 'CoS', 'CoS', 'CoS', 'Class of Service: a 3-bit priority (0–7) in the 802.1Q tag.', 'Class of Service: 3-битный приоритет (0–7) в теге 802.1Q.', 'Class of Service: עדיפות של 3 סיביות (0–7) בתג 802.1Q.');
G('ensa09', 'LLQ', 'LLQ', 'LLQ', 'Low Latency Queuing: CBWFQ plus a strict-priority queue for voice.', 'Low Latency Queuing: CBWFQ плюс очередь строгого приоритета для голоса.', 'Low Latency Queuing: ‏CBWFQ ועוד תור עדיפות מוחלטת לקול.');
G('ensa09', 'Trust boundary', 'Граница доверия', 'גבול אמון (Trust boundary)', 'Where the network starts trusting QoS markings — as close to the source as possible.', 'Место, где сеть начинает доверять меткам QoS, — как можно ближе к источнику.', 'המקום שבו הרשת מתחילה לסמוך על סימוני QoS — קרוב ככל האפשר למקור.');
G('ensa09', 'Traffic shaping', 'Шейпинг трафика', 'עיצוב תעבורה (Shaping)', 'Buffers excess traffic and sends it later at a set rate (outbound); policing drops it instead.', 'Буферизует излишек трафика и отправляет его позже с заданной скоростью (на выход); полисинг же его отбрасывает.', 'שומר עודף תעבורה בחוצץ ושולח אותו אחר כך בקצב קבוע (ביציאה); ‏policing זורק אותו במקום זה.');
G('ensa10', 'LLDP', 'LLDP', 'LLDP', 'Link Layer Discovery Protocol (IEEE 802.1AB): vendor-neutral neighbour discovery.', 'Link Layer Discovery Protocol (IEEE 802.1AB): обнаружение соседей для любых производителей.', 'Link Layer Discovery Protocol ‏(IEEE 802.1AB): גילוי שכנים לכל היצרנים.');
G('ensa10', 'NTP', 'NTP', 'NTP', 'Network Time Protocol (UDP 123): keeps device clocks in sync; stratum = distance from the reference clock.', 'Network Time Protocol (UDP 123): синхронизирует часы устройств; stratum — расстояние до эталонных часов.', 'Network Time Protocol ‏(UDP 123): מסנכרן את שעוני ההתקנים; ‏stratum = המרחק משעון הייחוס.');
G('ensa10', 'SNMP', 'SNMP', 'SNMP', 'Simple Network Management Protocol: a manager polls agents (UDP 161); agents send traps (UDP 162).', 'Simple Network Management Protocol: менеджер опрашивает агентов (UDP 161); агенты шлют trap (UDP 162).', 'Simple Network Management Protocol: מנהל דוגם סוכנים (UDP 161); הסוכנים שולחים trap ‏(UDP 162).');
G('ensa10', 'MIB', 'MIB', 'MIB', 'Management Information Base: the database of objects (each with an OID) that an SNMP agent exposes.', 'Management Information Base: база объектов (у каждого OID), которую предоставляет агент SNMP.', 'Management Information Base: מסד האובייקטים (לכל אחד OID) שסוכן SNMP חושף.');
G('ensa10', 'Syslog', 'Syslog', 'Syslog', 'The standard for sending log messages (UDP 514) with severity levels 0 (emergencies) to 7 (debugging).', 'Стандарт отправки сообщений журнала (UDP 514) с уровнями от 0 (emergencies) до 7 (debugging).', 'התקן לשליחת הודעות יומן (UDP 514) עם רמות חומרה מ-0 ‏(emergencies) עד 7 ‏(debugging).');
G('ensa10', 'Configuration register', 'Регистр конфигурации', 'אוגר תצורה (Configuration register)', 'A value that controls how a router boots: 0x2102 normal, 0x2142 ignores startup-config (password recovery).', 'Значение, управляющее загрузкой роутера: 0x2102 — обычная, 0x2142 — без startup-config (восстановление пароля).', 'ערך שקובע איך הנתב מאתחל: 0x2102 רגיל, ‏0x2142 מתעלם מ-startup-config (שחזור סיסמה).');
G('ensa11', 'Access layer', 'Уровень доступа', 'שכבת הגישה', 'Connects end devices: PoE, VLANs, port security.', 'Подключает оконечные устройства: PoE, VLAN, port security.', 'מחברת התקני קצה: PoE, ‏VLAN, ‏port security.');
G('ensa11', 'Distribution layer', 'Уровень распределения', 'שכבת ההפצה', 'Aggregates access switches, routes between VLANs and applies policy.', 'Собирает коммутаторы доступа, маршрутизирует между VLAN и применяет политики.', 'מאגדת את מתגי הגישה, מנתבת בין VLAN ומחילה מדיניות.');
G('ensa11', 'Core layer', 'Уровень ядра', 'שכבת הליבה', 'The fast, redundant backbone between distribution blocks.', 'Быстрая отказоустойчивая магистраль между блоками распределения.', 'עמוד השדרה המהיר ועם היתירות בין בלוקי ההפצה.');
G('ensa11', 'Collapsed core', 'Совмещённое ядро', 'ליבה מכווצת (Collapsed core)', 'A two-tier design in which the core and distribution layers are combined.', 'Двухуровневая схема, в которой уровни ядра и распределения объединены.', 'תכנון דו-שכבתי שבו שכבות הליבה וההפצה מאוחדות.');
G('ensa11', 'PoE', 'PoE', 'PoE', 'Power over Ethernet: the switch powers phones, APs and cameras through the network cable.', 'Power over Ethernet: коммутатор питает телефоны, точки доступа и камеры по сетевому кабелю.', 'Power over Ethernet: המתג מספק חשמל לטלפונים, לנקודות גישה ולמצלמות דרך כבל הרשת.');
G('ensa11', 'Oversubscription', 'Переподписка', 'Oversubscription (רישום יתר)', 'Total access bandwidth divided by uplink bandwidth, e.g. 48 × 1 Gbps / 2 × 10 Gbps = 2.4:1.', 'Суммарная полоса доступа, делённая на полосу аплинков, например 48 × 1 Гбит/с / 2 × 10 Гбит/с = 2,4:1.', 'רוחב הפס הכולל של הגישה חלקי רוחב הפס של ה-uplinks, למשל 48 × 1 Gbps / 2 × 10 Gbps = ‏2.4:1.');
G('ensa11', 'Failure domain', 'Домен отказа', 'תחום כשל', 'The part of the network affected when one device or link fails.', 'Часть сети, которая страдает при отказе одного устройства или канала.', 'החלק ברשת שנפגע כשהתקן או קישור אחד נופל.');
G('ensa13', 'Hypervisor', 'Гипервизор', 'היפרווייזר', 'Software that runs virtual machines: type 1 on bare metal, type 2 on a host OS.', 'ПО, которое запускает виртуальные машины: тип 1 — на голом железе, тип 2 — поверх ОС.', 'תוכנה שמריצה מכונות וירטואליות: סוג 1 ישירות על החומרה, סוג 2 מעל מערכת הפעלה.');
G('ensa13', 'SaaS / PaaS / IaaS', 'SaaS / PaaS / IaaS', 'SaaS / PaaS / IaaS', 'Cloud service models: software, platform or infrastructure as a service.', 'Модели облачных услуг: программа, платформа или инфраструктура как услуга.', 'מודלי שירות בענן: תוכנה, פלטפורמה או תשתית כשירות.');
G('ensa13', 'SDN', 'SDN', 'SDN', 'Software-defined networking: the control plane is centralised in a controller; devices mostly forward.', 'Программно-определяемая сеть: плоскость управления в центральном контроллере; устройства в основном пересылают.', 'רשת מוגדרת תוכנה: מישור הבקרה מרוכז בבקר; ההתקנים בעיקר מעבירים.');
G('ensa13', 'Control plane', 'Плоскость управления', 'מישור הבקרה (Control plane)', 'The "brain" of a device: routing protocols, routing table, STP, ARP.', '«Мозг» устройства: протоколы маршрутизации, таблица маршрутизации, STP, ARP.', '"המוח" של ההתקן: פרוטוקולי ניתוב, טבלת ניתוב, ‏STP, ‏ARP.');
G('ensa13', 'Data plane', 'Плоскость данных', 'מישור הנתונים (Data plane)', 'The forwarding of frames and packets (CEF, FIB, MAC table).', 'Пересылка кадров и пакетов (CEF, FIB, таблица MAC).', 'העברת מסגרות וחבילות (CEF, ‏FIB, טבלת MAC).');
G('ensa13', 'Northbound / southbound API', 'Northbound / southbound API', 'Northbound / southbound API', 'Northbound: controller ↔ applications. Southbound: controller ↔ devices (OpenFlow, NETCONF).', 'Northbound: контроллер ↔ приложения. Southbound: контроллер ↔ устройства (OpenFlow, NETCONF).', 'Northbound: בקר ↔ אפליקציות. ‏Southbound: בקר ↔ התקנים (OpenFlow, ‏NETCONF).');
G('ensa13', 'Spine-leaf', 'Spine-leaf', 'Spine-leaf', 'A data-center fabric where every leaf connects to every spine (used by Cisco ACI).', 'Фабрика дата-центра, где каждый leaf подключён к каждому spine (используется в Cisco ACI).', 'בד (fabric) של דאטה סנטר שבו כל leaf מחובר לכל spine (משמש ב-Cisco ACI).');
G('ensa14', 'REST API', 'REST API', 'REST API', 'A stateless HTTP-based API style: resources in URIs, methods GET/POST/PUT/PATCH/DELETE, data usually in JSON.', 'Стиль API поверх HTTP без состояния: ресурсы в URI, методы GET/POST/PUT/PATCH/DELETE, данные обычно в JSON.', 'סגנון API מעל HTTP בלי מצב (stateless): משאבים ב-URI, שיטות GET/POST/PUT/PATCH/DELETE, נתונים בדרך כלל ב-JSON.');
G('ensa14', 'JSON', 'JSON', 'JSON', 'JavaScript Object Notation: {"key": value} objects and [ ] arrays.', 'JavaScript Object Notation: объекты {"ключ": значение} и массивы [ ].', 'JavaScript Object Notation: אובייקטים {"key": value} ומערכים [ ].');
G('ensa14', 'YAML', 'YAML', 'YAML', 'A human-friendly data format: indentation for nesting, "- " for list items; used by Ansible.', 'Удобный для человека формат: вложенность отступами, «- » для элементов списка; используется в Ansible.', 'פורמט נתונים נוח לבני אדם: הזחה לקינון, ‏"- " לפריטי רשימה; משמש את Ansible.');
G('ensa14', 'Ansible', 'Ansible', 'Ansible', 'An agentless configuration management tool: YAML playbooks pushed over SSH.', 'Система управления конфигурацией без агентов: плейбуки YAML отправляются по SSH.', 'כלי לניהול תצורה בלי סוכנים: ‏playbooks ב-YAML שנדחפים מעל SSH.');
G('ensa14', 'NETCONF / RESTCONF', 'NETCONF / RESTCONF', 'NETCONF / RESTCONF', 'Protocols for configuring devices with YANG models: NETCONF over SSH (830, XML), RESTCONF over HTTPS (JSON/XML).', 'Протоколы настройки устройств по моделям YANG: NETCONF через SSH (830, XML), RESTCONF через HTTPS (JSON/XML).', 'פרוטוקולים להגדרת התקנים לפי מודלי YANG: ‏NETCONF מעל SSH ‏(830, ‏XML), ‏RESTCONF מעל HTTPS ‏(JSON/XML).');
G('ensa14', 'YANG', 'YANG', 'YANG', 'A data modelling language that describes the configuration and state data of a device.', 'Язык моделирования данных, описывающий настройки и состояние устройства.', 'שפת מידול נתונים שמתארת את נתוני התצורה והמצב של התקן.');
G('ensa14', 'Intent-based networking (IBN)', 'Сеть на основе намерений (IBN)', 'רשת מבוססת כוונה (IBN)', 'You state the desired outcome; the system translates, activates and continuously verifies it.', 'Вы задаёте нужный результат; система переводит его в настройки, применяет и постоянно проверяет.', 'מגדירים את התוצאה הרצויה; המערכת מתרגמת, מפעילה ובודקת אותה כל הזמן.');

// =================================================================
// Вопросы для собеседования ENSA 2–14
IV('ensa02', ['How is the OSPF router ID chosen, and why set it manually?', 'Как выбирается router ID в OSPF и зачем задавать его вручную?', 'איך נבחר ה-router ID ב-OSPF, ולמה להגדיר אותו ידנית?'],
  ['When the OSPF process starts, the router uses the router-id command if it exists; otherwise the highest loopback IPv4 address; otherwise the highest IPv4 address of an active physical interface. I set it manually, for example 1.1.1.1, because then it never changes when an interface goes down and it is easy to recognise in show ip ospf neighbor. After changing it you need clear ip ospf process. Two routers with the same ID will not form an adjacency.',
    'При запуске процесса OSPF роутер берёт значение команды router-id, если она есть; иначе наибольший IPv4-адрес loopback; иначе наибольший IPv4-адрес активного физического интерфейса. Я задаю его вручную, например 1.1.1.1: тогда он не меняется при падении интерфейса и его легко узнать в show ip ospf neighbor. После изменения нужен clear ip ospf process. Два роутера с одинаковым ID не станут соседями.',
    'כשתהליך ה-OSPF עולה, הנתב משתמש בפקודת router-id אם היא קיימת; אחרת בכתובת ה-IPv4 הגבוהה ביותר של loopback; אחרת בכתובת ה-IPv4 הגבוהה ביותר של ממשק פיזי פעיל. אני מגדיר אותו ידנית, למשל 1.1.1.1, כי אז הוא לא משתנה כשממשק נופל וקל לזהות אותו ב-show ip ospf neighbor. אחרי שינוי צריך clear ip ospf process. שני נתבים עם אותו ID לא יהיו שכנים.']);
IV('ensa02', ['How is the OSPF DR elected, and how can you influence it?', 'Как выбирается DR в OSPF и как на это повлиять?', 'איך נבחר ה-DR ב-OSPF, ואיך אפשר להשפיע על זה?'],
  ['On multi-access segments like Ethernet, OSPF elects a DR and a BDR to reduce the number of adjacencies. The highest interface priority wins, default 1, then the highest router ID. Priority 0 means the router never becomes DR or BDR. I set "ip ospf priority" on the interface, for example 255 on the router I want as DR. The election is not pre-emptive, so after changing priorities I clear the OSPF process. Between two routers only, I use "ip ospf network point-to-point" to skip the election.',
    'В сегментах множественного доступа, таких как Ethernet, OSPF выбирает DR и BDR, чтобы уменьшить число соседств. Побеждает наибольший приоритет интерфейса, по умолчанию 1, затем наибольший router ID. Приоритет 0 — роутер никогда не станет DR или BDR. Я задаю «ip ospf priority» на интерфейсе, например 255 на нужном DR. Выборы не вытесняющие, поэтому после изменения приоритетов я сбрасываю процесс OSPF. Если роутеров только два, использую «ip ospf network point-to-point», чтобы выборов не было.',
    'בסגמנטים מסוג multi-access כמו Ethernet, ‏OSPF בוחר DR ו-BDR כדי לצמצם את מספר השכנויות. העדיפות הגבוהה ביותר של הממשק מנצחת, ברירת מחדל 1, ואחריה ה-router ID הגבוה ביותר. עדיפות 0 אומרת שהנתב לעולם לא יהיה DR או BDR. אני מגדיר "ip ospf priority" על הממשק, למשל 255 בנתב שאני רוצה כ-DR. הבחירה לא מקדימה, ולכן אחרי שינוי עדיפויות אני מאפס את תהליך ה-OSPF. כשיש רק שני נתבים, אני משתמש ב-"ip ospf network point-to-point" כדי לדלג על הבחירה.']);
IV('ensa03', ['What is the difference between symmetric and asymmetric encryption?', 'Чем симметричное шифрование отличается от асимметричного?', 'מה ההבדל בין הצפנה סימטרית לאסימטרית?'],
  ['Symmetric encryption uses one shared key for both encryption and decryption — for example AES. It is fast, so it protects the bulk data in VPNs and HTTPS. Asymmetric encryption uses a key pair: what one key encrypts only the other can decrypt — for example RSA. It is slower, so it is used to exchange keys and for digital signatures. In practice they work together: asymmetric crypto or Diffie-Hellman agrees on a symmetric key, and AES encrypts the traffic.',
    'Симметричное шифрование использует один общий ключ для шифрования и расшифровки — например, AES. Оно быстрое, поэтому защищает основной поток данных в VPN и HTTPS. Асимметричное использует пару ключей: то, что зашифровано одним, расшифровывается только другим — например, RSA. Оно медленнее, поэтому применяется для обмена ключами и цифровых подписей. На практике они работают вместе: асимметричная криптография или Diffie-Hellman договариваются о симметричном ключе, а AES шифрует трафик.',
    'הצפנה סימטרית משתמשת במפתח משותף אחד גם להצפנה וגם לפענוח — למשל AES. היא מהירה, ולכן מגינה על עיקר המידע ב-VPN וב-HTTPS. הצפנה אסימטרית משתמשת בזוג מפתחות: מה שמפתח אחד מצפין, רק השני מפענח — למשל RSA. היא איטית יותר, ולכן משמשת להחלפת מפתחות ולחתימות דיגיטליות. בפועל הן עובדות יחד: קריפטוגרפיה אסימטרית או Diffie-Hellman מסכימות על מפתח סימטרי, ו-AES מצפין את התעבורה.']);
IV('ensa03', ['What is the CIA triad?', 'Что такое триада CIA?', 'מה זה משולש CIA?'],
  ['CIA is the three goals of information security. Confidentiality — only authorised people can read the data, achieved with encryption and access control. Integrity — the data is not changed on the way, checked with hashes like SHA-256. Availability — the service works when users need it, protected with redundancy, backups and DoS protection. Every security control supports at least one of these.',
    'CIA — три цели информационной безопасности. Конфиденциальность — данные читают только те, кому можно; достигается шифрованием и контролем доступа. Целостность — данные не изменены по пути; проверяется хешами, например SHA-256. Доступность — сервис работает, когда он нужен пользователям; обеспечивается резервированием, резервными копиями и защитой от DoS. Любая мера безопасности поддерживает хотя бы одну из них.',
    'CIA הן שלוש המטרות של אבטחת מידע. סודיות — רק מורשים יכולים לקרוא את המידע; משיגים אותה בהצפנה ובבקרת גישה. שלמות — המידע לא שונה בדרך; בודקים אותה בגיבוב כמו SHA-256. זמינות — השירות עובד כשהמשתמשים צריכים אותו; מגינים עליה ביתירות, בגיבויים ובהגנה מפני DoS. כל אמצעי אבטחה תומך לפחות באחת מהן.']);
IV('ensa04', ['What is the difference between a standard and an extended ACL, and where do you place each?', 'Чем стандартный ACL отличается от расширенного и где размещать каждый?', 'מה ההבדל בין ACL סטנדרטי למורחב, והיכן ממקמים כל אחד?'],
  ['A standard ACL matches only the source IP address; numbers 1–99 and 1300–1999. An extended ACL matches protocol, source and destination addresses and ports; numbers 100–199 and 2000–2699. I place an extended ACL close to the source, so unwanted traffic is dropped before it uses bandwidth. A standard ACL goes close to the destination, because it cannot see the destination — near the source it would block that source from everything. Also remember: top-down processing, first match wins, and an implicit deny at the end.',
    'Стандартный ACL проверяет только IP-адрес источника; номера 1–99 и 1300–1999. Расширенный проверяет протокол, адреса источника и получателя и порты; номера 100–199 и 2000–2699. Расширенный ACL я ставлю ближе к источнику, чтобы ненужный трафик отбрасывался до того, как займёт полосу. Стандартный — ближе к получателю, потому что он не видит получателя: у источника он заблокировал бы этот источник от всего. И помнить: обработка сверху вниз, первое совпадение решает, в конце неявный запрет.',
    'ACL סטנדרטי בודק רק את כתובת ה-IP של המקור; מספרים 1–99 ו-1300–1999. ‏ACL מורחב בודק פרוטוקול, כתובות מקור ויעד ופורטים; מספרים 100–199 ו-2000–2699. ACL מורחב אני ממקם קרוב למקור, כדי שתעבורה לא רצויה תיזרק לפני שהיא צורכת רוחב פס. ACL סטנדרטי — קרוב ליעד, כי הוא לא רואה את היעד: ליד המקור הוא היה חוסם את המקור הזה מהכול. וחשוב לזכור: עיבוד מלמעלה למטה, ההתאמה הראשונה מכריעה, ובסוף יש דחייה מרומזת.']);
IV('ensa05', ['You applied an ACL and now some users lost all access. What do you check?', 'Вы применили ACL, и часть пользователей потеряла доступ ко всему. Что проверяете?', 'החלת ACL ועכשיו חלק מהמשתמשים איבדו גישה לגמרי. מה בודקים?'],
  ['First the implicit deny: if the ACL only has deny lines, or the permits do not cover these users, everything else is dropped — I add the missing permit, often "permit ip any any" at the end. Then the order: a general deny above a specific permit catches the traffic first. Then the direction and the interface — in versus out, and a standard ACL near the source blocks too much. I check show access-lists for the match counters and show ip interface for where it is applied, and fix lines by sequence number instead of deleting the whole list.',
    'Сначала неявный запрет: если в ACL только строки deny или permit не покрывает этих пользователей, всё остальное отбрасывается — добавляю недостающий permit, часто «permit ip any any» в конце. Потом порядок: общий deny выше конкретного permit перехватывает трафик первым. Потом направление и интерфейс — in или out, а стандартный ACL у источника блокирует слишком много. Смотрю счётчики в show access-lists и место применения в show ip interface и правлю строки по номерам, а не удаляю весь список.',
    'קודם הדחייה המרומזת: אם ב-ACL יש רק שורות deny, או שה-permit לא מכסה את המשתמשים האלה, כל השאר נזרק — אני מוסיף את ה-permit החסר, לרוב "permit ip any any" בסוף. אחר כך הסדר: deny כללי מעל permit ספציפי תופס את התעבורה קודם. אחר כך הכיוון והממשק — in או out, ו-ACL סטנדרטי ליד המקור חוסם יותר מדי. אני בודק את המונים ב-show access-lists ואת מקום ההחלה ב-show ip interface, ומתקן שורות לפי מספרי רצף במקום למחוק את כל הרשימה.']);
IV('ensa06', ['Explain inside local, inside global and PAT.', 'Объясните inside local, inside global и PAT.', 'הסבר מה זה inside local, ‏inside global ו-PAT.'],
  ['Inside local is the real, usually private, address of a host in my network, like 192.168.1.10. Inside global is the public address that represents that host on the Internet, like the router\'s outside address. Outside global is the real address of the server outside. With PAT, also called NAT overload, many inside hosts share one inside global address, and the router tells the sessions apart by source port numbers — it keeps a table like 192.168.1.10:51000 ↔ 209.165.200.225:51000. That is how a whole office uses one public IP. I check it with show ip nat translations.',
    'Inside local — настоящий, обычно частный, адрес хоста в моей сети, например 192.168.1.10. Inside global — публичный адрес, которым этот хост представлен в Интернете, например внешний адрес роутера. Outside global — настоящий адрес сервера снаружи. С PAT, он же NAT overload, много внутренних хостов делят один inside global адрес, а роутер различает сессии по портам источника — ведёт таблицу вида 192.168.1.10:51000 ↔ 209.165.200.225:51000. Так целый офис работает через один публичный IP. Проверяю командой show ip nat translations.',
    'Inside local היא הכתובת האמיתית, בדרך כלל פרטית, של מארח ברשת שלי, למשל 192.168.1.10. ‏Inside global היא הכתובת הציבורית שמייצגת את המארח הזה באינטרנט, למשל הכתובת החיצונית של הנתב. ‏Outside global היא הכתובת האמיתית של השרת בחוץ. ב-PAT, שנקרא גם NAT overload, הרבה מארחים פנימיים חולקים כתובת inside global אחת, והנתב מבדיל בין הסשנים לפי פורטי המקור — הוא מחזיק טבלה כמו 192.168.1.10:51000 ↔ 209.165.200.225:51000. כך משרד שלם עובד עם IP ציבורי אחד. בודקים עם show ip nat translations.']);
IV('ensa06', ['When would you use static NAT instead of PAT?', 'Когда вы используете статический NAT вместо PAT?', 'מתי תשתמש ב-NAT סטטי במקום PAT?'],
  ['PAT is for outbound access: users start the sessions, so sharing one address is fine. Static NAT is for a server that must be reachable from the Internet — a web or mail server — because outside clients need a fixed public address that always maps to the same inside host. For example "ip nat inside source static 192.168.10.254 209.165.201.5". Many companies use both on the same router: static NAT for the servers and PAT for everyone else.',
    'PAT — для исходящего доступа: сессии начинают пользователи, поэтому делить один адрес нормально. Статический NAT — для сервера, который должен быть доступен из Интернета, например веб- или почтового: внешним клиентам нужен постоянный публичный адрес, который всегда ведёт на тот же внутренний хост. Например, «ip nat inside source static 192.168.10.254 209.165.201.5». Многие компании используют оба на одном роутере: статический NAT для серверов и PAT для всех остальных.',
    'PAT מיועד לגישה יוצאת: המשתמשים פותחים את הסשנים, ולכן לחלוק כתובת אחת זה בסדר. ‏NAT סטטי מיועד לשרת שחייב להיות נגיש מהאינטרנט, כמו שרת web או דואר: הלקוחות מבחוץ צריכים כתובת ציבורית קבועה שתמיד מובילה לאותו מארח פנימי. למשל "ip nat inside source static 192.168.10.254 209.165.201.5". הרבה חברות משתמשות בשניהם באותו נתב: ‏NAT סטטי לשרתים ו-PAT לכל השאר.']);
IV('ensa07', ['What WAN connection options do you know?', 'Какие варианты подключения WAN вы знаете?', 'אילו אפשרויות חיבור WAN אתה מכיר?'],
  ['Private options: leased lines, which are dedicated point-to-point circuits like E1 at 2.048 Mbps — reliable but expensive; Metro Ethernet, where the provider gives an Ethernet port and the sites look like one LAN; and MPLS, where the provider forwards by labels and gives Layer 2 or Layer 3 VPNs between sites. Public options run over the Internet: DSL, cable, fiber and 4G/5G, made secure with IPsec VPNs. For redundancy a site can be dual-homed or multihomed to two ISPs. The choice depends on cost, bandwidth, SLA and security.',
    'Частные варианты: выделенные линии — постоянные каналы точка-точка, например E1 на 2,048 Мбит/с, надёжные, но дорогие; Metro Ethernet — провайдер даёт Ethernet-порт, и площадки выглядят как одна LAN; MPLS — провайдер пересылает по меткам и даёт VPN 2-го или 3-го уровня между площадками. Публичные варианты — через Интернет: DSL, кабель, оптика и 4G/5G, защищённые IPsec VPN. Для резервирования площадку подключают dual-homed или multihomed к двум провайдерам. Выбор зависит от цены, полосы, SLA и требований безопасности.',
    'אפשרויות פרטיות: קווים חכורים, שהם מעגלי נקודה-לנקודה ייעודיים כמו E1 ב-2.048 Mbps — אמינים אבל יקרים; ‏Metro Ethernet, שבו הספק נותן פורט Ethernet והאתרים נראים כמו LAN אחד; ו-MPLS, שבו הספק מעביר לפי תוויות ונותן VPN בשכבה 2 או 3 בין האתרים. אפשרויות ציבוריות עוברות דרך האינטרנט: ‏DSL, כבלים, סיבים ו-4G/5G, ומאובטחות ב-IPsec VPN. ליתירות אפשר לחבר אתר dual-homed או multihomed לשני ספקים. הבחירה תלויה במחיר, ברוחב הפס, ב-SLA ובאבטחה.']);
IV('ensa08', ['What is the difference between a site-to-site and a remote-access VPN?', 'Чем VPN «сеть–сеть» отличается от VPN удалённого доступа?', 'מה ההבדל בין VPN מסוג site-to-site ל-VPN לגישה מרחוק?'],
  ['A site-to-site VPN connects whole networks, for example a branch to HQ. Routers or firewalls at both ends keep a permanent IPsec tunnel, and the hosts do not know it exists. A remote-access VPN is for individual users, like people working from home: they connect when needed, with a client such as Cisco AnyConnect, or clientless through a web browser using SSL/TLS. IPsec gives strong authentication and supports all IP applications, while SSL VPN is easier because any browser works.',
    'VPN «сеть–сеть» соединяет целые сети, например филиал с головным офисом. Роутеры или межсетевые экраны на обоих концах держат постоянный IPsec-туннель, а хосты о нём не знают. VPN удалённого доступа — для отдельных пользователей, например работающих из дома: они подключаются по необходимости, через клиент, например Cisco AnyConnect, или без клиента через браузер по SSL/TLS. IPsec даёт сильную аутентификацию и поддерживает все IP-приложения, а SSL VPN проще — подходит любой браузер.',
    'VPN מסוג site-to-site מחבר רשתות שלמות, למשל סניף למטה. נתבים או חומות אש בשני הקצוות מחזיקים מנהרת IPsec קבועה, והמארחים לא יודעים שהיא קיימת. VPN לגישה מרחוק מיועד למשתמשים בודדים, כמו אנשים שעובדים מהבית: הם מתחברים כשצריך, עם לקוח כמו Cisco AnyConnect, או בלי לקוח דרך דפדפן עם SSL/TLS. ‏IPsec נותן אימות חזק ותומך בכל יישומי ה-IP, ו-SSL VPN פשוט יותר כי כל דפדפן מתאים.']);
IV('ensa08', ['What does IPsec provide?', 'Что обеспечивает IPsec?', 'מה IPsec מספק?'],
  ['IPsec is a framework that protects IP packets with four services: confidentiality with encryption such as AES, integrity with hashes such as SHA-256, authentication of the peers with pre-shared keys or RSA certificates, and secure key exchange with Diffie-Hellman. ESP provides all of these; AH gives integrity and authentication without encryption, so ESP is what you see in practice. IKE on UDP 500 negotiates the security associations. Because IPsec only carries unicast, GRE over IPsec or a VTI is used when routing protocols must run through the tunnel.',
    'IPsec — фреймворк, который защищает IP-пакеты четырьмя сервисами: конфиденциальность — шифрование, например AES; целостность — хеши, например SHA-256; аутентификация сторон — общий ключ или сертификаты RSA; безопасный обмен ключами — Diffie-Hellman. ESP даёт всё это; AH — целостность и аутентификацию без шифрования, поэтому на практике видят ESP. IKE на UDP 500 согласует ассоциации безопасности. Поскольку IPsec переносит только unicast, для протоколов маршрутизации через туннель используют GRE поверх IPsec или VTI.',
    'IPsec הוא מסגרת שמגנה על חבילות IP בארבעה שירותים: סודיות בהצפנה כמו AES, שלמות בגיבוב כמו SHA-256, אימות הצדדים במפתח משותף או בתעודות RSA, והחלפת מפתחות מאובטחת עם Diffie-Hellman. ‏ESP נותן את כל אלה; ‏AH נותן שלמות ואימות בלי הצפנה, ולכן בפועל רואים ESP. ‏IKE ב-UDP 500 מנהל משא ומתן על ה-SA. מכיוון ש-IPsec נושא רק unicast, משתמשים ב-GRE over IPsec או ב-VTI כשפרוטוקולי ניתוב צריכים לעבור במנהרה.']);
IV('ensa09', ['How would you make voice calls work well over a congested WAN link?', 'Как обеспечить нормальные звонки через перегруженный WAN-канал?', 'איך תגרום לשיחות קול לעבוד טוב על קישור WAN עמוס?'],
  ['Voice needs one-way delay under 150 ms, jitter under 30 ms and loss under 1%. First I classify and mark voice close to the source — the IP phone marks DSCP EF, and the access switch trusts it, which is the trust boundary. Then on the WAN interface I configure LLQ: voice goes into a strict-priority queue with a bandwidth limit, and other classes get guaranteed shares with CBWFQ. If the provider polices our rate, I shape outbound traffic to the contracted speed so the provider does not drop our packets randomly.',
    'Голосу нужна задержка в одну сторону меньше 150 мс, джиттер меньше 30 мс и потери меньше 1%. Сначала классифицирую и маркирую голос у источника — IP-телефон ставит DSCP EF, а коммутатор доступа ему доверяет; это граница доверия. Затем на WAN-интерфейсе настраиваю LLQ: голос идёт в очередь строгого приоритета с ограничением полосы, а другие классы получают гарантированные доли через CBWFQ. Если провайдер полисит нашу скорость, я шейплю исходящий трафик до скорости по договору, чтобы провайдер не отбрасывал наши пакеты случайно.',
    'קול צריך השהיה בכיוון אחד מתחת ל-150 ms, ג׳יטר מתחת ל-30 ms ואובדן מתחת ל-1%. קודם אני מסווג ומסמן את הקול קרוב למקור — טלפון ה-IP מסמן DSCP EF, ומתג הגישה סומך עליו; זה גבול האמון. אחר כך בממשק ה-WAN אני מגדיר LLQ: הקול נכנס לתור עדיפות מוחלטת עם הגבלת רוחב פס, ושאר המחלקות מקבלות חלק מובטח עם CBWFQ. אם הספק עושה policing לקצב שלנו, אני עושה shaping לתעבורה היוצאת לפי המהירות בחוזה, כדי שהספק לא יזרוק לנו חבילות באקראי.']);
IV('ensa10', ['What is the difference between SNMP and Syslog?', 'Чем SNMP отличается от Syslog?', 'מה ההבדל בין SNMP ל-Syslog?'],
  ['SNMP is for monitoring values: the NMS polls agents on UDP 161 for counters like interface traffic, CPU and memory from the MIB, and agents send traps to UDP 162 when something happens. Syslog is for event messages: the device sends text logs like "%LINK-3-UPDOWN" with a severity from 0 to 7 to a Syslog server on UDP 514. I use SNMPv3 because it has authentication and encryption, set logging trap to choose the severity, and keep NTP running so the timestamps from all devices line up.',
    'SNMP — для мониторинга значений: NMS опрашивает агентов по UDP 161 и получает из MIB счётчики — трафик интерфейсов, загрузку CPU, память, — а агенты шлют trap на UDP 162 при событиях. Syslog — для сообщений о событиях: устройство отправляет текстовые записи вида «%LINK-3-UPDOWN» с уровнем от 0 до 7 на Syslog-сервер по UDP 514. Я использую SNMPv3, потому что в нём есть аутентификация и шифрование, выбираю уровень через logging trap и держу NTP, чтобы метки времени всех устройств совпадали.',
    'SNMP מיועד לניטור ערכים: ה-NMS דוגם את הסוכנים ב-UDP 161 ומקבל מה-MIB מונים כמו תעבורה בממשקים, ‏CPU וזיכרון, והסוכנים שולחים trap ל-UDP 162 כשמשהו קורה. ‏Syslog מיועד להודעות על אירועים: ההתקן שולח רשומות טקסט כמו "%LINK-3-UPDOWN" עם רמת חומרה מ-0 עד 7 לשרת Syslog ב-UDP 514. אני משתמש ב-SNMPv3 כי יש בו אימות והצפנה, בוחר את הרמה עם logging trap, ושומר על NTP כדי שחותמות הזמן של כל ההתקנים יתאימו.']);
IV('ensa11', ['Describe the three-layer hierarchical network design.', 'Опишите трёхуровневую иерархическую модель сети.', 'תאר את מודל התכנון ההיררכי בשלוש שכבות.'],
  ['The access layer connects end devices and gives PoE, VLANs, port security and QoS marking. The distribution layer aggregates the access switches, routes between VLANs, applies policy such as ACLs and provides redundancy. The core layer is a fast, redundant backbone that only moves traffic between distribution blocks without heavy processing. The benefits are scalability, small failure domains, easier troubleshooting and predictable performance. In smaller networks I would use a collapsed core, where distribution and core are one pair of switches.',
    'Уровень доступа подключает оконечные устройства и даёт PoE, VLAN, port security и маркировку QoS. Уровень распределения собирает коммутаторы доступа, маршрутизирует между VLAN, применяет политики вроде ACL и обеспечивает резервирование. Уровень ядра — быстрая отказоустойчивая магистраль, которая только переносит трафик между блоками распределения без тяжёлой обработки. Преимущества: масштабируемость, маленькие домены отказа, проще искать неисправности, предсказуемая производительность. В небольших сетях я бы использовал совмещённое ядро — распределение и ядро на одной паре коммутаторов.',
    'שכבת הגישה מחברת התקני קצה ונותנת PoE, ‏VLAN, ‏port security וסימון QoS. שכבת ההפצה מאגדת את מתגי הגישה, מנתבת בין VLAN, מחילה מדיניות כמו ACL ונותנת יתירות. שכבת הליבה היא עמוד שדרה מהיר ועם יתירות שרק מעביר תעבורה בין בלוקי ההפצה בלי עיבוד כבד. היתרונות: גדילה קלה, תחומי כשל קטנים, פתרון תקלות קל יותר וביצועים צפויים. ברשתות קטנות הייתי משתמש בליבה מכווצת — הפצה וליבה על זוג מתגים אחד.']);
IV('ensa13', ['What is SDN? Explain the control plane and the data plane.', 'Что такое SDN? Объясните плоскость управления и плоскость данных.', 'מה זה SDN? הסבר את מישור הבקרה ומישור הנתונים.'],
  ['The control plane is the part of a device that decides where traffic goes — routing protocols like OSPF, STP, ARP, building the tables. The data plane actually forwards frames and packets using those tables, in hardware with CEF. In a traditional network every device has both. Software-defined networking moves the control plane to a central controller, which programs the devices through southbound APIs like OpenFlow or NETCONF, while applications talk to the controller through northbound REST APIs. The result is central policy, automation and a single view of the network — for example Cisco ACI in the data center.',
    'Плоскость управления — часть устройства, которая решает, куда идёт трафик: протоколы маршрутизации вроде OSPF, STP, ARP, построение таблиц. Плоскость данных собственно пересылает кадры и пакеты по этим таблицам, аппаратно через CEF. В обычной сети у каждого устройства есть обе. SDN выносит плоскость управления в центральный контроллер, который программирует устройства через southbound API, например OpenFlow или NETCONF, а приложения общаются с контроллером через northbound REST API. В итоге — централизованные политики, автоматизация и единый взгляд на сеть, например Cisco ACI в дата-центре.',
    'מישור הבקרה הוא החלק בהתקן שמחליט לאן התעבורה הולכת — פרוטוקולי ניתוב כמו OSPF, ‏STP, ‏ARP ובניית הטבלאות. מישור הנתונים הוא זה שבאמת מעביר מסגרות וחבילות לפי הטבלאות האלה, בחומרה עם CEF. ברשת מסורתית לכל התקן יש את שניהם. ‏SDN מעביר את מישור הבקרה לבקר מרכזי, שמתכנת את ההתקנים דרך southbound API כמו OpenFlow או NETCONF, והאפליקציות מדברות עם הבקר דרך northbound REST API. התוצאה: מדיניות מרכזית, אוטומציה ותמונה אחת של הרשת — למשל Cisco ACI בדאטה סנטר.']);
IV('ensa13', ['What is the difference between a type 1 and a type 2 hypervisor?', 'Чем гипервизор типа 1 отличается от типа 2?', 'מה ההבדל בין היפרווייזר מסוג 1 לסוג 2?'],
  ['A type 1 hypervisor, also called bare metal, runs directly on the server hardware — VMware ESXi, Hyper-V or KVM — and is used in data centers because it is efficient and stable. A type 2 hypervisor runs as an application on top of a normal operating system — VirtualBox or VMware Workstation — and is good for labs and testing on a laptop. In both cases the VMs connect through a virtual switch, and a trunk carries their VLANs to the physical network.',
    'Гипервизор типа 1, или bare metal, работает прямо на оборудовании сервера — VMware ESXi, Hyper-V или KVM — и используется в дата-центрах, потому что он эффективный и стабильный. Гипервизор типа 2 работает как приложение поверх обычной ОС — VirtualBox или VMware Workstation — и удобен для лабораторий и тестов на ноутбуке. В обоих случаях ВМ подключаются через виртуальный коммутатор, а trunk несёт их VLAN в физическую сеть.',
    'היפרווייזר מסוג 1, שנקרא גם bare metal, רץ ישירות על החומרה של השרת — ‏VMware ESXi, ‏Hyper-V או KVM — ומשמש בדאטה סנטרים כי הוא יעיל ויציב. היפרווייזר מסוג 2 רץ כאפליקציה מעל מערכת הפעלה רגילה — ‏VirtualBox או VMware Workstation — ומתאים למעבדות ולבדיקות על מחשב נייד. בשני המקרים ה-VM מתחברות דרך מתג וירטואלי, ו-trunk נושא את ה-VLAN שלהן לרשת הפיזית.']);
IV('ensa14', ['What is a REST API and how is it used in networking?', 'Что такое REST API и как он используется в сетях?', 'מה זה REST API ואיך משתמשים בו ברשתות?'],
  ['A REST API lets software talk to a device or controller over HTTPS. Each resource has a URI, and the HTTP method says what to do: GET reads, POST creates, PUT or PATCH update, DELETE removes. It is stateless, so every request carries an authentication token, and the data is usually JSON. The response has a status code — 200 OK, 201 Created, 401 Unauthorized, 404 Not Found. In networking I can use a Python script to pull the inventory from Cisco Catalyst Center or change interface settings through RESTCONF instead of logging into every device.',
    'REST API позволяет программе общаться с устройством или контроллером по HTTPS. У каждого ресурса свой URI, а HTTP-метод говорит, что делать: GET читает, POST создаёт, PUT или PATCH обновляют, DELETE удаляет. Он без состояния, поэтому каждый запрос несёт токен аутентификации, а данные обычно в JSON. В ответе есть код — 200 OK, 201 Created, 401 Unauthorized, 404 Not Found. В сетях я могу скриптом на Python получить инвентарь из Cisco Catalyst Center или изменить настройки интерфейса через RESTCONF, не заходя на каждое устройство.',
    'REST API מאפשר לתוכנה לדבר עם התקן או בקר מעל HTTPS. לכל משאב יש URI, ושיטת ה-HTTP אומרת מה לעשות: ‏GET קורא, ‏POST יוצר, ‏PUT או PATCH מעדכנים, ‏DELETE מוחק. הוא stateless, ולכן כל בקשה נושאת token לאימות, והנתונים בדרך כלל ב-JSON. בתשובה יש קוד — ‏200 OK, ‏201 Created, ‏401 Unauthorized, ‏404 Not Found. ברשתות אני יכול בסקריפט Python למשוך את רשימת הציוד מ-Cisco Catalyst Center או לשנות הגדרות ממשק דרך RESTCONF, בלי להתחבר לכל התקן.']);
IV('ensa14', ['Why automate the network, and which tools would you use?', 'Зачем автоматизировать сеть и какие инструменты вы бы использовали?', 'למה לעשות אוטומציה לרשת, ובאילו כלים היית משתמש?'],
  ['Manual changes on hundreds of devices are slow and error-prone; automation makes changes fast, consistent and repeatable, and keeps configs as code that can be reviewed. For a Cisco network I would start with Ansible, because it is agentless — it connects over SSH — and playbooks are simple YAML. For custom tasks I would write Python scripts with libraries like Netmiko or use REST APIs and RESTCONF. Puppet, Chef and SaltStack are other configuration management tools, but they mostly need agents. Bigger networks can move to intent-based networking with a controller like Catalyst Center.',
    'Ручные изменения на сотнях устройств долгие и с ошибками; автоматизация делает изменения быстрыми, единообразными и повторяемыми и хранит конфигурации как код, который можно проверять. Для сети Cisco я бы начал с Ansible: он без агентов — подключается по SSH, — а плейбуки — простой YAML. Для особых задач писал бы скрипты на Python с библиотеками вроде Netmiko или использовал REST API и RESTCONF. Puppet, Chef и SaltStack — другие системы управления конфигурацией, но им в основном нужны агенты. Большие сети могут перейти к IBN с контроллером вроде Catalyst Center.',
    'שינויים ידניים במאות התקנים הם איטיים ומלאי טעויות; אוטומציה הופכת שינויים למהירים, אחידים וניתנים לחזרה, ושומרת תצורות כקוד שאפשר לבדוק. ברשת Cisco הייתי מתחיל עם Ansible, כי הוא בלי סוכנים — מתחבר מעל SSH — וה-playbooks הם YAML פשוט. למשימות מיוחדות הייתי כותב סקריפטים ב-Python עם ספריות כמו Netmiko, או משתמש ב-REST API וב-RESTCONF. ‏Puppet, ‏Chef ו-SaltStack הם כלים נוספים לניהול תצורה, אבל רובם צריכים סוכנים. רשתות גדולות יכולות לעבור לרשת מבוססת כוונה עם בקר כמו Catalyst Center.']);
