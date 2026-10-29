'use strict';
// ENSA: OSPFv2 с одной областью, поиск неисправностей; дополнительно — RIP.

const OSPF_LINKS = [
  { en: 'Ethernet (10 Mbps)', ru: 'Ethernet (10 Мбит/с)', he: 'Ethernet ‏(10 Mbps)', cost: 10 },
  { en: 'FastEthernet (100 Mbps)', ru: 'FastEthernet (100 Мбит/с)', he: 'FastEthernet ‏(100 Mbps)', cost: 1 },
  { en: 'GigabitEthernet (1 Gbps)', ru: 'GigabitEthernet (1 Гбит/с)', he: 'GigabitEthernet ‏(1 Gbps)', cost: 1 },
  { en: 'Serial T1 (1.544 Mbps)', ru: 'Serial T1 (1,544 Мбит/с)', he: 'Serial T1 ‏(1.544 Mbps)', cost: 64 },
];

lessonDef({
  id: 'ospf', topic: 'ospf', drill: 'wildcard', minutes: 16,
  title: T('OSPFv2 (single area)', 'OSPFv2 (одна область)', 'OSPFv2 (אזור יחיד)'),
  goal: T('Link-state routing, OSPF cost, the router ID, wildcard masks in the network command, DR/BDR and verification.',
    'Маршрутизация по состоянию каналов, cost в OSPF, router ID, wildcard-маски в команде network, DR/BDR и проверка.',
    'ניתוב מצב-קישור, ה-cost ב-OSPF, ‏router ID, מסכות wildcard בפקודת network, ‏DR/BDR ובדיקה.'),
  sections: [
    lSec(['Link-state routing', 'Маршрутизация по состоянию каналов', 'ניתוב מצב-קישור'],
      lP(['OSPF routers flood LSAs so every router in an area has the same map (link-state database) and runs Dijkstra\'s SPF algorithm to find the best paths. Fast convergence, no hop limit, scales with areas.',
        'Роутеры OSPF рассылают LSA, и у каждого роутера в области одинаковая карта (база состояния каналов); на ней каждый запускает алгоритм SPF Дейкстры. Быстрая сходимость, нет ограничения по переходам, масштабируется областями.',
        'נתבי OSPF מפיצים LSA, כך שלכל נתב באזור יש אותה מפה (מסד נתוני מצב-קישור), וכל אחד מריץ עליה את אלגוריתם SPF של דייקסטרה כדי למצוא את הנתיבים הטובים ביותר. התכנסות מהירה, בלי הגבלת קפיצות, וגדילה בעזרת אזורים.']),
      lUL([
        ['AD 110. Metric = cost.', 'AD 110. Метрика — cost.', 'AD 110. המטריקה היא cost.'],
        ['Hellos to 224.0.0.5 every 10 s; dead after 40 s (Ethernet).', 'Hello на 224.0.0.5 каждые 10 с; dead через 40 с (Ethernet).', 'Hello ל-224.0.0.5 כל 10 שניות; ‏dead אחרי 40 שניות (Ethernet).'],
        ['Neighbours must match: area, hello/dead timers, subnet and mask.', 'У соседей должны совпадать: область, таймеры hello/dead, подсеть и маска.', 'אצל שכנים חייבים להתאים: אזור, טיימרים hello/dead, תת-רשת ומסכה.'],
      ])),
    lSec(['Cost', 'Cost', 'Cost'],
      lP(['cost = reference bandwidth (100 Mbps by default) / interface bandwidth. The lowest total cost wins.', 'cost = опорная полоса (по умолчанию 100 Мбит/с) / полоса интерфейса. Побеждает наименьшая сумма.', 'cost = רוחב פס ייחוס (100 Mbps כברירת מחדל) חלקי רוחב הפס של הממשק. הסכום הנמוך ביותר מנצח.']),
      lTable([['Interface', 'Интерфейс', 'ממשק'], ['Bandwidth', 'Полоса', 'רוחב פס'], 'Cost'], [
        ['Ethernet', '10 Mbps', '10'], ['FastEthernet', '100 Mbps', '1'], ['GigabitEthernet', '1 Gbps', '1 (!)'], ['Serial T1', '1.544 Mbps', '64'],
      ]),
      lTip(['Fa and Gi both cost 1 by default — fix with "auto-cost reference-bandwidth 1000" on every router.', 'Fa и Gi по умолчанию оба стоят 1 — исправляется «auto-cost reference-bandwidth 1000» на всех роутерах.', 'ל-Fa ול-Gi יש cost 1 כברירת מחדל — מתקנים עם "auto-cost reference-bandwidth 1000" בכל הנתבים.'])),
    lSec(['Router ID', 'Router ID', 'Router ID'],
      lUL([
        ['1. The router-id command.', '1. Команда router-id.', '1. הפקודה router-id.'],
        ['2. The highest loopback IP.', '2. Наибольший IP loopback.', '2. כתובת ה-IP הגבוהה ביותר של loopback.'],
        ['3. The highest IP of an active physical interface.', '3. Наибольший IP активного физического интерфейса.', '3. כתובת ה-IP הגבוהה ביותר של ממשק פיזי פעיל.'],
      ]),
      lP(['A new router ID takes effect after "clear ip ospf process".', 'Новый router ID действует после «clear ip ospf process».', 'router ID חדש נכנס לתוקף אחרי "clear ip ospf process".'])),
    lSec(['Configuration and wildcard masks', 'Настройка и wildcard-маски', 'הגדרה ומסכות wildcard'],
      lCode('R1(config)# router ospf 1\nR1(config-router)# router-id 1.1.1.1\nR1(config-router)# network 192.168.1.0 0.0.0.255 area 0\nR1(config-router)# network 10.0.0.0 0.0.0.3 area 0\nR1(config-router)# passive-interface g0/0\nR1(config-router)# default-information originate'),
      lUL([
        ['The process ID ("1") is local and does not have to match.', 'Номер процесса («1») локальный и может не совпадать.', 'מספר התהליך ("1") מקומי ולא חייב להתאים.'],
        ['Wildcard = 255.255.255.255 − subnet mask (/24 → 0.0.0.255, /30 → 0.0.0.3).', 'Wildcard = 255.255.255.255 − маска (/24 → 0.0.0.255, /30 → 0.0.0.3).', 'Wildcard = ‏255.255.255.255 פחות המסכה (‎/24 → 0.0.0.255, ‎/30 → 0.0.0.3).'],
        ['Area 0 is the backbone.', 'Area 0 — магистральная область.', 'Area 0 הוא אזור השדרה (backbone).'],
        ['passive-interface — no Hellos on a LAN without routers; the network is still advertised.', 'passive-interface — нет Hello в LAN без роутеров; сеть всё равно объявляется.', 'passive-interface — בלי Hello ב-LAN שאין בו נתבים; הרשת עדיין מפורסמת.'],
      ])),
    lSec(['DR/BDR and verification', 'DR/BDR и проверка', 'DR/BDR ובדיקה'],
      lP(['On multi-access networks OSPF elects a DR and BDR: highest priority (default 1) wins, then highest router ID; priority 0 never becomes DR; the election is not pre-emptive.',
        'В сетях множественного доступа OSPF выбирает DR и BDR: побеждает наибольший приоритет (по умолчанию 1), затем наибольший router ID; приоритет 0 — никогда не DR; выборы не вытесняющие.',
        'ברשתות multi-access ‏OSPF בוחר DR ו-BDR: העדיפות הגבוהה ביותר מנצחת (ברירת מחדל 1), ואחריה ה-router ID הגבוה ביותר; עדיפות 0 לעולם לא תהיה DR; הבחירה אינה מקדימה (non-preemptive).']),
      lCode('R1# show ip ospf neighbor\nNeighbor ID   Pri  State      Dead Time  Address    Interface\n2.2.2.2       1    FULL/DR    00:00:35   10.0.0.2   GigabitEthernet0/1'),
      lUL([
        ['FULL — adjacency complete.', 'FULL — соседство установлено.', 'FULL — השכנות הושלמה.'],
        ['show ip route — O routes [110/cost]. show ip protocols — router ID, networks, passive interfaces.', 'show ip route — маршруты O [110/cost]. show ip protocols — router ID, сети, пассивные интерфейсы.', 'show ip route — נתיבי O ‏[110/cost]. ‏show ip protocols — ‏router ID, רשתות וממשקים פסיביים.'],
      ])),
  ],
  quiz: [
    lQ(['What type of routing protocol is OSPF?', 'К какому типу относится OSPF?', 'איזה סוג פרוטוקול ניתוב הוא OSPF?'], [['Link-state', 'Состояния каналов', 'מצב-קישור'], ['Distance vector', 'Дистанционно-векторный', 'וקטור מרחק'], ['Path vector', 'Path vector', 'Path vector'], ['Static', 'Статический', 'סטטי']], 0,
      ['Every router has the full map and runs SPF.', 'У каждого роутера полная карта, он запускает SPF.', 'לכל נתב יש את המפה המלאה והוא מריץ SPF.']),
    lQ(['What is the AD of OSPF?', 'Какое AD у OSPF?', 'מהו ה-AD של OSPF?'], ['110', '120', '90', '1'], 0,
      ['OSPF 110 beats RIP 120.', 'OSPF 110 побеждает RIP 120.', 'OSPF 110 מנצח את RIP 120.']),
    lQ(['Which value does NOT have to match between OSPF neighbours?', 'Что НЕ обязано совпадать у соседей OSPF?', 'מה לא חייב להתאים בין שכני OSPF?'], [['The process ID', 'Номер процесса', 'מספר התהליך'], ['The area', 'Область', 'האזור'], ['Hello/dead timers', 'Таймеры hello/dead', 'טיימרים hello/dead'], ['Subnet and mask', 'Подсеть и маска', 'תת-רשת ומסכה']], 0,
      ['The process ID is local.', 'Номер процесса локальный.', 'מספר התהליך מקומי.']),
    lQ(['What decides the OSPF router ID first?', 'Что в первую очередь определяет router ID?', 'מה קובע קודם כול את ה-router ID ב-OSPF?'], [['The router-id command', 'Команда router-id', 'הפקודה router-id'], ['The highest loopback IP', 'Наибольший IP loopback', 'IP ה-loopback הגבוה ביותר'], ['The highest physical IP', 'Наибольший физический IP', 'ה-IP הפיזי הגבוה ביותר'], ['The lowest IP', 'Наименьший IP', 'ה-IP הנמוך ביותר']], 0,
      ['router-id → loopback → physical.', 'router-id → loopback → физический.', 'router-id → loopback → פיזי.']),
    lQ(['Where does OSPF send Hellos?', 'Куда OSPF отправляет Hello?', 'לאן OSPF שולח Hello?'], ['224.0.0.5', '224.0.0.9', '255.255.255.255', '224.0.0.10'], 0,
      ['224.0.0.9 is RIPv2.', '224.0.0.9 — это RIPv2.', '224.0.0.9 הוא RIPv2.']),
    lQ(['What is area 0?', 'Что такое area 0?', 'מהו area 0?'], [['The backbone area', 'Магистральная область', 'אזור השדרה'], ['An area without routers', 'Область без роутеров', 'אזור בלי נתבים'], ['The default route', 'Маршрут по умолчанию', 'נתיב ברירת המחדל'], ['A disabled area', 'Отключённая область', 'אזור מושבת']], 0,
      ['All other areas connect to area 0.', 'Все остальные области подключаются к area 0.', 'כל שאר האזורים מתחברים ל-area 0.']),
    lQ(['A neighbour is in state FULL. Meaning?', 'Сосед в состоянии FULL. Что это значит?', 'שכן במצב FULL. מה המשמעות?'], [['Adjacency complete, databases synchronised', 'Соседство установлено, базы синхронизированы', 'השכנות הושלמה ומסדי הנתונים מסונכרנים'], ['The neighbour is down', 'Сосед недоступен', 'השכן למטה'], ['DR election running', 'Идут выборы DR', 'בחירת DR מתבצעת'], ['Only Hellos exchanged', 'Только обмен Hello', 'רק Hello מוחלפים']], 0,
      ['FULL is the goal state.', 'FULL — целевое состояние.', 'FULL הוא מצב היעד.']),
    lQ(['How does OSPF choose the best path?', 'Как OSPF выбирает лучший путь?', 'איך OSPF בוחר את הנתיב הטוב ביותר?'], [['Lowest total cost', 'Наименьшая суммарная стоимость', 'ה-cost הכולל הנמוך ביותר'], ['Fewest hops', 'Меньше всего переходов', 'הכי מעט קפיצות'], ['Lowest AD', 'Наименьшее AD', 'ה-AD הנמוך ביותר'], ['Newest route', 'Самый новый маршрут', 'הנתיב החדש ביותר']], 0,
      ['SPF adds the costs of outgoing interfaces.', 'SPF складывает cost выходных интерфейсов.', 'SPF מחבר את ה-cost של ממשקי היציאה.']),
  ],
  gen: [
    function genWildcard(rng) {
      const len = rng.int(16, 30);
      return lGen(T('What is the wildcard mask for ' + lenToMask(len) + ' (/' + len + ')?', 'Какая wildcard-маска для ' + lenToMask(len) + ' (/' + len + ')?', 'מהי מסכת ה-wildcard של ' + lenToMask(len) + ' ‏(‎/' + len + ')?'),
        lWild(len), [lenToMask(len), lWild(len - 1), lWild(len + 1), lWild(len + 2)],
        T('255.255.255.255 − ' + lenToMask(len) + ' = ' + lWild(len) + '.', '255.255.255.255 − ' + lenToMask(len) + ' = ' + lWild(len) + '.', '255.255.255.255 − ' + lenToMask(len) + ' = ' + lWild(len) + '.'));
    },
    function genOspfNetwork(rng) {
      const len = rng.pick([24, 24, 25, 26, 27, 28, 29, 30]), size = Math.pow(2, 32 - len);
      const net = (rng.chance(0.5) ? '192.168.' + rng.int(1, 250) : '10.' + rng.int(0, 250) + '.' + rng.int(0, 250)) + '.' + size * rng.int(0, 256 / size - 1);
      const area = rng.pick([0, 0, 0, 1]);
      return lGen(T('Which command adds ' + net + '/' + len + ' to OSPF area ' + area + '?', 'Какая команда добавляет ' + net + '/' + len + ' в OSPF area ' + area + '?', 'איזו פקודה מוסיפה את ' + net + '/' + len + ' ל-OSPF area ' + area + '?'),
        'network ' + net + ' ' + lWild(len) + ' area ' + area,
        ['network ' + net + ' ' + lenToMask(len) + ' area ' + area, 'network ' + net + ' ' + lWild(len), 'network ' + net + '/' + len + ' area ' + area, 'network ' + net + ' ' + lWild(len - 1) + ' area ' + (area ? 0 : 1)],
        T('network <address> <wildcard> area <id>; wildcard for /' + len + ' = ' + lWild(len) + '.', 'network <адрес> <wildcard> area <номер>; wildcard для /' + len + ' = ' + lWild(len) + '.', 'network <כתובת> <wildcard> area <מספר>; ה-wildcard של ‎/' + len + ' = ' + lWild(len) + '.'));
    },
    function genOspfCost(rng) {
      const l = rng.pick(OSPF_LINKS);
      return lGen(T('With the default reference bandwidth, what is the OSPF cost of a ' + l.en + ' interface?', 'При опорной полосе по умолчанию какой OSPF cost у интерфейса ' + l.ru + '?', 'ברוחב פס ייחוס ברירת מחדל, מהו ה-cost של OSPF בממשק ' + l.he + '?'),
        String(l.cost), ['1', '10', '64', '100'].filter((x) => x !== String(l.cost)),
        T('cost = 100 Mbps / bandwidth (at least 1).', 'cost = 100 Мбит/с / полоса (не меньше 1).', 'cost = ‏100 Mbps חלקי רוחב הפס (לפחות 1).'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'trouble', topic: 'trouble', minutes: 14,
  title: T('Network Troubleshooting', 'Поиск неисправностей', 'פתרון תקלות ברשת'),
  goal: T('Structured troubleshooting approaches, what to check at each layer, reading ping and tracert, and the most common faults.',
    'Систематические подходы к поиску неисправностей, что проверять на каждом уровне, как читать ping и tracert, частые поломки.',
    'גישות מסודרות לפתרון תקלות, מה בודקים בכל שכבה, איך קוראים ping ו-tracert, והתקלות הנפוצות.'),
  sections: [
    lSec(['Approaches', 'Подходы', 'גישות'],
      lUL([
        ['Bottom-up — start at Layer 1 and go up.', 'Снизу вверх — от 1-го уровня вверх.', 'מלמטה למעלה — מתחילים בשכבה 1 ועולים.'],
        ['Top-down — start at the application.', 'Сверху вниз — от приложения.', 'מלמעלה למטה — מתחילים ביישום.'],
        ['Divide and conquer — start in the middle with ping.', 'Разделяй и властвуй — с середины, с ping.', 'הפרד ומשול — מתחילים באמצע עם ping.'],
        ['Follow the path — check every device from source to destination.', 'По пути — каждое устройство от источника до получателя.', 'מעקב אחרי הנתיב — בודקים כל התקן מהמקור עד היעד.'],
      ]),
      lP(['Define the problem, gather information, guess, change ONE thing, test, verify the whole network, document.', 'Описать проблему, собрать информацию, выдвинуть гипотезу, изменить ОДНУ вещь, проверить, проверить всю сеть, записать.', 'מגדירים את הבעיה, אוספים מידע, משערים, משנים דבר אחד, בודקים, מוודאים את כל הרשת ומתעדים.'])),
    lSec(['Checklist by layer', 'Что проверять по уровням', 'מה בודקים בכל שכבה'],
      lTable([['Layer', 'Уровень', 'שכבה'], ['Check', 'Проверить', 'לבדוק'], ['Command', 'Команда', 'פקודה']], [
        ['1', ['Cable, lights, interface up', 'Кабель, индикаторы, интерфейс поднят', 'כבל, נוריות, ממשק למעלה'], 'show ip interface brief'],
        ['2', ['Port VLAN, trunk, native/allowed VLANs', 'VLAN порта, trunk, native/allowed VLAN', 'ה-VLAN של הפורט, trunk, ‏native/allowed'], 'show vlan brief, show interfaces trunk'],
        [['3 host', '3 хост', '3 מארח'], ['IP, mask, gateway', 'IP, маска, шлюз', 'IP, מסכה, שער'], 'ipconfig'],
        [['3 routers', '3 роутеры', '3 נתבים'], ['Routes both ways, protocol networks', 'Маршруты в обе стороны, сети протокола', 'נתיבים בשני הכיוונים, הרשתות בפרוטוקול'], 'show ip route, show ip protocols'],
        [['Services', 'Сервисы', 'שירותים'], ['DHCP pool/relay, DNS', 'DHCP-пул/relay, DNS', 'מאגר DHCP/relay, ‏DNS'], 'show ip dhcp binding, nslookup'],
      ])),
    lSec(['Reading ping and tracert', 'Как читать ping и tracert', 'איך קוראים ping ו-tracert'],
      lUL([
        ['Request timed out — no reply came back: missing return route, wrong gateway on the far host, device off.', 'Request timed out — ответ не вернулся: нет обратного маршрута, неверный шлюз у дальнего хоста, устройство выключено.', 'Request timed out — לא חזרה תשובה: חסר נתיב חזרה, שער שגוי במארח המרוחק, או שההתקן כבוי.'],
        ['Destination host unreachable — a router (or the PC itself) has no route or no ARP answer.', 'Destination host unreachable — у роутера (или самого ПК) нет маршрута или ответа ARP.', 'Destination host unreachable — לנתב (או למחשב עצמו) אין נתיב או תשובת ARP.'],
        ['tracert stops at "* * *" — look at the next device and its way back.', 'tracert обрывается на «* * *» — смотрите следующее устройство и обратный путь.', 'tracert נעצר ב-"* * *" — בודקים את ההתקן הבא ואת הדרך חזרה.'],
      ])),
    lSec(['Common faults', 'Частые неисправности', 'תקלות נפוצות'],
      lTable([['Symptom', 'Симптом', 'סימפטום'], ['Fix', 'Решение', 'פתרון']], [
        [['"administratively down"', '«administratively down»', '"administratively down"'], 'no shutdown'],
        [['Gateway OK, other networks not', 'Шлюз отвечает, другие сети — нет', 'השער עונה, רשתות אחרות לא'], ['Add routes on both sides', 'Добавить маршруты с обеих сторон', 'להוסיף נתיבים בשני הצדדים']],
        [['169.254.x.x on a PC', '169.254.x.x на ПК', '169.254.x.x במחשב'], ['Check DHCP pool and ip helper-address', 'Проверить DHCP-пул и ip helper-address', 'לבדוק את מאגר ה-DHCP ואת ip helper-address']],
        [['Same VLAN on two switches cannot talk', 'Один VLAN на двух коммутаторах не общается', 'אותו VLAN בשני מתגים לא מתקשר'], ['Make the link a trunk / allow the VLAN', 'Сделать канал trunk / разрешить VLAN', 'להפוך את הקישור ל-trunk / לאפשר את ה-VLAN']],
        [['OSPF neighbours missing', 'Нет соседей OSPF', 'אין שכני OSPF'], ['Match area, subnet/mask; check passive-interface', 'Совместить area, подсеть/маску; проверить passive-interface', 'להתאים area ותת-רשת/מסכה; לבדוק passive-interface']],
      ]),
      lTip(['Practise: Training → Troubleshooting tasks break a working network in 2–3 places.', 'Практика: Training → задания Troubleshooting ломают рабочую сеть в 2–3 местах.', 'תרגול: ‏Training → משימות Troubleshooting שוברות רשת עובדת ב-2–3 מקומות.'])),
  ],
  quiz: [
    lQ(['Which approach starts with cables and link lights?', 'Какой подход начинается с кабелей и индикаторов?', 'איזו גישה מתחילה בכבלים ובנוריות?'], [['Bottom-up', 'Снизу вверх', 'מלמטה למעלה'], ['Top-down', 'Сверху вниз', 'מלמעלה למטה'], ['Divide and conquer', 'Разделяй и властвуй', 'הפרד ומשול'], ['Trial and error', 'Метод тыка', 'ניסוי וטעייה']], 0,
      ['Bottom-up begins at Layer 1.', 'Снизу вверх — с 1-го уровня.', 'מלמטה למעלה מתחילים בשכבה 1.']),
    lQ(['PC1 pings its gateway but not a remote server. Where do you look first?', 'PC1 пингует шлюз, но не удалённый сервер. Где искать сначала?', 'PC1 מצליח ping לשער אבל לא לשרת מרוחק. איפה מחפשים קודם?'], [['Routing on the routers, both directions', 'Маршрутизацию на роутерах, в обе стороны', 'ניתוב בנתבים, בשני הכיוונים'], ['PC1\'s cable', 'Кабель PC1', 'הכבל של PC1'], ['PC1\'s VLAN', 'VLAN PC1', 'ה-VLAN של PC1'], ['Switch power', 'Питание коммутатора', 'החשמל של המתג']], 0,
      ['Reaching the gateway proves the local side works.', 'Раз шлюз отвечает, локальная часть в порядке.', 'אם השער עונה — הצד המקומי תקין.']),
    lQ(['tracert shows two routers, then "* * *". Where is the problem?', 'tracert показывает два роутера, затем «* * *». Где проблема?', 'tracert מציג שני נתבים ואז "* * *". איפה הבעיה?'], [['At or after the last router that answered', 'На последнем ответившем роутере или после него', 'בנתב האחרון שענה או אחריו'], ['On the source PC', 'На исходном ПК', 'במחשב המקור'], ['On the first router', 'На первом роутере', 'בנתב הראשון'], ['In DNS', 'В DNS', 'ב-DNS']], 0,
      ['Check that hop\'s routes and the way back.', 'Проверьте маршруты этого перехода и обратный путь.', 'בודקים את הנתיבים של הקפיצה הזו ואת הדרך חזרה.']),
    lQ(['A DHCP client shows 169.254.10.20. What do you check?', 'DHCP-клиент показывает 169.254.10.20. Что проверять?', 'לקוח DHCP מציג 169.254.10.20. מה בודקים?'], [['DHCP pool, ip helper-address, path to the server', 'DHCP-пул, ip helper-address, путь до сервера', 'מאגר DHCP, ‏ip helper-address והנתיב לשרת'], ['OSPF areas', 'Области OSPF', 'אזורי OSPF'], ['Console cable', 'Консольный кабель', 'כבל קונסולה'], ['The banner', 'Баннер', 'הבאנר']], 0,
      ['APIPA = no DHCP answer.', 'APIPA — нет ответа DHCP.', 'APIPA = אין תשובת DHCP.']),
    lQ(['Two PCs in VLAN 10 on different switches cannot ping each other. Likely cause?', 'Два ПК в VLAN 10 на разных коммутаторах не пингуются. Вероятная причина?', 'שני מחשבים ב-VLAN 10 במתגים שונים לא מצליחים ping. סיבה סבירה?'], [['The inter-switch link does not carry VLAN 10', 'Канал между коммутаторами не несёт VLAN 10', 'הקישור בין המתגים לא נושא את VLAN 10'], ['Wrong gateways', 'Неверные шлюзы', 'שערים שגויים'], ['DHCP down', 'DHCP не работает', 'DHCP לא עובד'], ['OSPF mismatch', 'Несовпадение OSPF', 'אי-התאמת OSPF']], 0,
      ['Same subnet → no gateway involved → Layer 2 issue.', 'Одна подсеть → шлюз не участвует → проблема 2-го уровня.', 'אותה תת-רשת → השער לא מעורב → בעיה בשכבה 2.']),
    lQ(['Which step must never be skipped after a fix?', 'Какой шаг нельзя пропускать после исправления?', 'איזה צעד אסור לדלג עליו אחרי תיקון?'], [['Verify it works and nothing else broke', 'Проверить, что работает и ничего не сломалось', 'לוודא שזה עובד ושלא נשבר משהו אחר'], ['Reload everything', 'Перезагрузить всё', 'לאתחל הכול'], ['Erase the config', 'Стереть конфигурацию', 'למחוק את התצורה'], ['Change many things', 'Поменять много всего', 'לשנות הרבה דברים']], 0,
      ['Verify and document.', 'Проверить и записать.', 'מוודאים ומתעדים.']),
    lQ(['Which command checks whether a port is in the right VLAN?', 'Какая команда показывает, в правильном ли VLAN порт?', 'איזו פקודה בודקת אם פורט נמצא ב-VLAN הנכון?'], ['show vlan brief', 'show ip route', 'ipconfig', 'show ip ospf neighbor'], 0,
      ['Access ports per VLAN.', 'Access-порты по VLAN.', 'פורטי access לפי VLAN.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'rip', topic: 'rip', minutes: 10,
  title: T('RIP', 'RIP', 'RIP'),
  goal: T('A legacy distance-vector protocol that is still asked about: hop count, timers, RIPv1 vs RIPv2 and configuration.',
    'Старый дистанционно-векторный протокол, о котором всё ещё спрашивают: число переходов, таймеры, RIPv1 и RIPv2, настройка.',
    'פרוטוקול וקטור-מרחק ותיק שעדיין שואלים עליו: ספירת קפיצות, טיימרים, RIPv1 מול RIPv2 והגדרה.'),
  sections: [
    lSec(['How RIP works', 'Как работает RIP', 'איך RIP עובד'],
      lUL([
        ['Distance vector — knows only distance and direction, learned from neighbours.', 'Дистанционно-векторный — знает только расстояние и направление, со слов соседей.', 'וקטור מרחק — יודע רק מרחק וכיוון, ממה שהשכנים מספרים.'],
        ['Metric = hop count; maximum 15, 16 = unreachable.', 'Метрика — число переходов; максимум 15, 16 — недостижимо.', 'המטריקה היא מספר קפיצות; מקסימום 15, ‏16 = לא ניתן להגעה.'],
        ['Full table to neighbours every 30 s. AD 120. Split horizon prevents loops.', 'Вся таблица соседям каждые 30 с. AD 120. Split horizon защищает от петель.', 'כל הטבלה לשכנים כל 30 שניות. ‏AD 120. ‏Split horizon מונע לולאות.'],
      ]),
      lTable(['', 'RIPv1', 'RIPv2'], [
        [['Masks in updates', 'Маски в обновлениях', 'מסכות בעדכונים'], ['No (classful)', 'Нет (классовый)', 'לא (מבוסס מחלקות)'], ['Yes (classless)', 'Да (бесклассовый)', 'כן (ללא מחלקות)']],
        [['Updates to', 'Обновления на', 'עדכונים אל'], '255.255.255.255', '224.0.0.9'],
      ])),
    lSec(['Configuration', 'Настройка', 'הגדרה'],
      lCode('R1(config)# router rip\nR1(config-router)# version 2\nR1(config-router)# no auto-summary\nR1(config-router)# network 192.168.1.0\nR1(config-router)# network 10.0.0.0\nR1(config-router)# passive-interface g0/0\nR1(config-router)# default-information originate'),
      lUL([
        ['network — classful network, no mask (10.1.1.1/30 → network 10.0.0.0).', 'network — классовая сеть без маски (10.1.1.1/30 → network 10.0.0.0).', 'network — רשת לפי מחלקה, בלי מסכה (10.1.1.1/30 → network 10.0.0.0).'],
        ['no auto-summary — advertise subnets with their real masks.', 'no auto-summary — объявлять подсети с настоящими масками.', 'no auto-summary — לפרסם תת-רשתות עם המסכות האמיתיות שלהן.'],
        ['R routes look like [120/2] = AD 120, 2 hops.', 'Маршруты R выглядят как [120/2] — AD 120, 2 перехода.', 'נתיבי R נראים כמו ‏[120/2] = ‏AD 120, ‏2 קפיצות.'],
      ])),
  ],
  quiz: [
    lQ(['What metric does RIP use?', 'Какую метрику использует RIP?', 'באיזו מטריקה משתמש RIP?'], [['Hop count', 'Число переходов', 'מספר קפיצות'], ['Bandwidth', 'Полоса', 'רוחב פס'], ['Delay', 'Задержка', 'השהיה'], ['Cost', 'Cost', 'Cost']], 0,
      ['Cost is OSPF.', 'Cost — это OSPF.', 'Cost זה OSPF.']),
    lQ(['What is the largest reachable hop count in RIP?', 'Какое наибольшее достижимое число переходов в RIP?', 'מהו מספר הקפיצות הגבוה ביותר שעדיין ניתן להגעה ב-RIP?'], ['15', '16', '255', '100'], 0,
      ['16 = unreachable.', '16 — недостижимо.', '16 = לא ניתן להגעה.']),
    lQ(['How often does RIP send updates?', 'Как часто RIP шлёт обновления?', 'כל כמה זמן RIP שולח עדכונים?'], [['Every 30 s', 'Каждые 30 с', 'כל 30 שניות'], ['Every 10 s', 'Каждые 10 с', 'כל 10 שניות'], ['Only on change', 'Только при изменениях', 'רק כשיש שינוי'], ['Every 90 s', 'Каждые 90 с', 'כל 90 שניות']], 0,
      ['Periodic full-table updates.', 'Периодически, всю таблицу.', 'עדכונים תקופתיים של כל הטבלה.']),
    lQ(['What is the AD of RIP?', 'Какое AD у RIP?', 'מהו ה-AD של RIP?'], ['120', '110', '1', '90'], 0,
      ['RIP 120, OSPF 110.', 'RIP 120, OSPF 110.', 'RIP 120, ‏OSPF 110.']),
    lQ(['Where does RIPv2 send its updates?', 'Куда RIPv2 отправляет обновления?', 'לאן RIPv2 שולח עדכונים?'], ['224.0.0.9', '255.255.255.255', '224.0.0.5', '224.0.0.10'], 0,
      ['RIPv1 uses broadcast; 224.0.0.5 is OSPF.', 'RIPv1 — broadcast; 224.0.0.5 — OSPF.', 'RIPv1 משתמש ב-broadcast; ‏224.0.0.5 הוא OSPF.']),
    lQ(['Why enter "no auto-summary"?', 'Зачем «no auto-summary»?', 'למה מקלידים "no auto-summary"?'], [['To advertise subnets with their real masks', 'Чтобы объявлять подсети с настоящими масками', 'כדי לפרסם תת-רשתות עם המסכות האמיתיות'], ['To turn RIP off', 'Чтобы выключить RIP', 'כדי לכבות את RIP'], ['To stop updates', 'Чтобы остановить обновления', 'כדי לעצור עדכונים'], ['To use RIPv1', 'Чтобы перейти на RIPv1', 'כדי לעבור ל-RIPv1']], 0,
      ['Auto-summary breaks discontiguous networks.', 'Auto-summary ломает разрывные сети.', 'Auto-summary שובר רשתות לא רציפות.']),
  ],
  gen: [
    function genRipNetwork(rng) {
      const ip = lRandHostIp(rng), len = rng.int(24, 30), cl = classfulLen(ip), right = intToIp(netOf(ip, cl)), first = ip.split('.')[0];
      const cls = cl === 8 ? 'A' : cl === 16 ? 'B' : 'C';
      return lGen(T('An interface has the address ' + ip + '/' + len + '. Which network do you enter under "router rip"?', 'У интерфейса адрес ' + ip + '/' + len + '. Какую сеть указать в «router rip»?', 'לממשק יש כתובת ' + ip + '/' + len + '. איזו רשת מקלידים תחת "router rip"?'),
        'network ' + right, ['network ' + intToIp(netOf(ip, len)), 'network ' + intToIp(netOf(ip, 8)), 'network ' + intToIp(netOf(ip, 16)), 'network ' + intToIp(netOf(ip, 24)), 'network ' + first + '.0.0.0 0.255.255.255'],
        T(first + '.x is class ' + cls + ' → ' + right + '.', first + '.x — класс ' + cls + ' → ' + right + '.', first + '.x היא מחלקה ' + cls + ' → ' + right + '.'));
    },
  ],
});
