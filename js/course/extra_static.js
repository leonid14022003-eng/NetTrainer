'use strict';
// Дополнение к урокам «Статическая маршрутизация» и «Неисправности статических маршрутов»:
// разбор Packet Tracer 2.2.2.4 Configuring IPv4 Static and Default Routes (четыре вида статических маршрутов).

lessonExtend('static', {
  minutes: 10,
  sections: [
    lSecAt('Static and default routes', ['Four kinds of static routes', 'Четыре вида статических маршрутов', 'ארבעה סוגים של נתיבים סטטיים'],
      lTable([['Kind', 'Вид', 'סוג'], ['Syntax', 'Синтаксис', 'תחביר'], ['Idea', 'Суть', 'הרעיון']], [
        [['Recursive', 'Рекурсивный (recursive)', 'רקורסיבי (recursive)'], 'ip route <net> <mask> <next-hop IP>', ['neighbour\'s IP — two lookups in the table', 'IP соседа — два поиска в таблице', 'ה-IP של השכן — שני חיפושים בטבלה']],
        [['Directly attached', 'Directly attached', 'Directly attached'], 'ip route <net> <mask> <exit interface>', ['own exit port — one lookup', 'свой выходной порт — один поиск', 'פורט היציאה שלך — חיפוש אחד']],
        [['Fully specified', 'Fully specified', 'Fully specified'], 'ip route <net> <mask> <interface> <next-hop IP>', ['both: the port and the neighbour', 'и порт, и сосед', 'גם הפורט וגם השכן']],
        [['Default', 'По умолчанию (default)', 'ברירת מחדל (default)'], 'ip route 0.0.0.0 0.0.0.0 …', ['"everything else"', '«всё остальное»', '"כל השאר"']],
      ]),
      lP(['Why a recursive route needs two lookups: 1) 172.31.0.0/24 → next hop 172.31.1.193; 2) .193 belongs to the connected network 172.31.1.192/30 → exit S0/0/0.',
        'Почему у рекурсивного маршрута два поиска: 1) 172.31.0.0/24 → next hop 172.31.1.193; 2) .193 входит в подключённую сеть 172.31.1.192/30 → выход S0/0/0.',
        'למה בנתיב רקורסיבי יש שני חיפושים: 1) ‏172.31.0.0/24 → next hop ‏172.31.1.193; 2) ‏‎.193 שייך לרשת המחוברת 172.31.1.192/30 → יציאה S0/0/0.']),
      lUL([
        ['Directly attached is fine on a serial point-to-point link: there is exactly one receiver at the other end. On Ethernet (multi-access) it depends on proxy ARP — use a next hop or a fully specified route there.',
          'Directly attached нормально работает на serial точка-точка: на другом конце ровно один получатель. На Ethernet (много устройств в сегменте) он держится на proxy ARP — там указывайте next hop или fully specified маршрут.',
          'Directly attached עובד טוב בקישור serial נקודה-לנקודה: בצד השני יש מקבל אחד בדיוק. ב-Ethernet (רשת מרובת גישה) הוא נשען על proxy ARP — שם מציינים next hop או נתיב fully specified.'],
        ['Packet Tracer prints "%Default route without gateway, if not a point-to-point interface, may impact performance" for an exit-interface route. It is only a warning — the route is added.',
          'Packet Tracer пишет "%Default route without gateway, if not a point-to-point interface, may impact performance" на маршрут с выходным интерфейсом. Это только предупреждение — маршрут добавлен.',
          'Packet Tracer מדפיס "%Default route without gateway, if not a point-to-point interface, may impact performance" לנתיב עם ממשק יציאה. זו רק אזהרה — הנתיב נוסף.'],
        ['A connected link (C) never needs a static route: on R2 the links to R1 and R3 are its own.', 'Подключённому линку (C) статика не нужна: у R2 линки к R1 и R3 — свои.', 'קישור מחובר (C) אף פעם לא צריך נתיב סטטי: אצל R2 הקישורים ל-R1 ול-R3 הם שלו.'],
      ]),
      lTip(['Main rule: the next hop is ALWAYS the neighbour\'s address on the shared link, never your own. Your own address gives "%Invalid next hop address (it\'s this router)".',
        'Главное правило: next hop — ВСЕГДА адрес соседа на общем линке, а не свой. На свой адрес IOS ответит "%Invalid next hop address (it\'s this router)".',
        'הכלל החשוב: ה-next hop הוא תמיד הכתובת של השכן בקישור המשותף, אף פעם לא הכתובת שלך. על הכתובת שלך IOS יענה "%Invalid next hop address (it\'s this router)".'])),
    lSecAt('Four kinds of static routes', ['How many routes does each router need?', 'Сколько маршрутов нужно каждому роутеру?', 'כמה נתיבים צריך כל נתב?'],
      lP(['A router knows only its connected networks (C). Routes needed = all networks − its own. Lab 2.2.2.4 has 5 networks: R1 has 2 → needs 3; R2 has 3 → needs 2; R3 has 2 → needs 3, or ONE default route, because all three remote networks are behind R2.',
        'Роутер знает только свои подключённые сети (C). Нужно маршрутов = все сети − свои. В лабе 2.2.2.4 пять сетей: у R1 2 → нужно 3; у R2 3 → нужно 2; у R3 2 → нужно 3 или ОДИН маршрут по умолчанию, потому что все три чужие сети за R2.',
        'נתב מכיר רק את הרשתות המחוברות שלו (C). מספר הנתיבים הדרוש = כל הרשתות − הרשתות שלו. במעבדה 2.2.2.4 יש 5 רשתות: ל-R1 ‏2 → צריך 3; ל-R2 ‏3 → צריך 2; ל-R3 ‏2 → צריך 3, או נתיב ברירת מחדל אחד, כי כל שלוש הרשתות הזרות נמצאות מאחורי R2.']),
      lP(['Before you write a route, find the network address from the IP and the mask: block size = 256 − the last mask octet that is not 255; the network starts at the largest multiple of the block that is not above the address.',
        'Перед тем как писать маршрут, найдите адрес сети по IP и маске: размер блока = 256 − последний октет маски, не равный 255; сеть начинается с наибольшего кратного блоку числа, не больше адреса.',
        'לפני שכותבים נתיב, מוצאים את כתובת הרשת לפי ה-IP והמסכה: גודל הגוש = 256 − האוקטט האחרון במסכה שאינו 255; הרשת מתחילה בכפולה הגדולה ביותר של הגוש שאינה גדולה מהכתובת.']),
      lTable(['IP', ['Mask', 'Маска', 'מסכה'], ['Block', 'Блок', 'גוש'], ['Range', 'Диапазон', 'טווח'], ['Network', 'Сеть', 'רשת']], [
        ['172.31.1.1', '.128 (/25)', '128', '.0 – .127', '172.31.1.0'],
        ['172.31.1.194', '.252 (/30)', '4', '.192 – .195', '172.31.1.192'],
        ['172.31.1.198', '.252 (/30)', '4', '.196 – .199', '172.31.1.196'],
        ['172.31.1.129', '.192 (/26)', '64', '.128 – .191', '172.31.1.128'],
        ['172.31.0.1', '.0 (/24)', '256', '.0 – .255', '172.31.0.0'],
      ]),
      lTip(['Example: 198 / 4 = 49.5 → 49 × 4 = 196 → network 172.31.1.196. The Subnets tab in Learn shows every bit.', 'Пример: 198 / 4 = 49,5 → 49 × 4 = 196 → сеть 172.31.1.196. Вкладка «Подсети» в Learn покажет каждый бит.', 'דוגמה: 198 / 4 = 49.5 → 49 × 4 = 196 → הרשת 172.31.1.196. הלשונית "תת-רשתות" ב-Learn מראה כל סיבית.'])),
    lSec(['Lab 2.2.2.4 walkthrough', 'Разбор лабы 2.2.2.4', 'פתרון מעבדה 2.2.2.4'],
      lCode('PC1 .1.126 ── R1 ──S0/0/0── 172.31.1.192/30 ──S0/0/0── R2 ──S0/0/1── 172.31.1.196/30 ──S0/0/1── R3 ── PC3 .1.190\n172.31.1.0/25        .194             .193    │    .197             .198        172.31.1.128/26\n                                         R2 G0/0 172.31.0.0/24 — PC2 .0.254',
        ['Three routers in a chain, five networks', 'Три роутера в цепочке, пять сетей', 'שלושה נתבים בשרשרת, חמש רשתות']),
      lCode('R1(config)# ip route 172.31.0.0 255.255.255.0 172.31.1.193       ! recursive: LAN R2\nR1(config)# ip route 172.31.1.128 255.255.255.192 172.31.1.193   ! LAN R3\nR1(config)# ip route 172.31.1.196 255.255.255.252 172.31.1.193   ! link R2–R3\n\nR2(config)# ip route 172.31.1.0 255.255.255.128 s0/0/0           ! directly attached\nR2(config)# ip route 172.31.1.128 255.255.255.192 s0/0/1\n\nR3(config)# ip route 0.0.0.0 0.0.0.0 s0/0/1                       ! default route\nR3# show ip route\nGateway of last resort is 0.0.0.0 to network 0.0.0.0\nS*   0.0.0.0/0 is directly connected, Serial0/0/1'),
      lUL([
        ['Part 1: 5 networks; directly connected — R1 2, R2 3, R3 2; static routes needed — R1 3, R2 2, R3 3 (or 1 default). The first pings fail: there are no routes to remote networks yet.', 'Часть 1: 5 сетей; напрямую подключено — R1 2, R2 3, R3 2; нужно статических маршрутов — R1 3, R2 2, R3 3 (или 1 default). Первые ping не проходят: маршрутов к чужим сетям ещё нет.', 'חלק 1: 5 רשתות; מחוברות ישירות — R1 ‏2, ‏R2 ‏3, ‏R3 ‏2; נתיבים סטטיים דרושים — R1 ‏3, ‏R2 ‏2, ‏R3 ‏3 (או ברירת מחדל אחד). ה-ping הראשונים נכשלים: עדיין אין נתיבים לרשתות מרוחקות.'],
        ['After R1 only: still no ping — R2 and R3 have no return routes to the R1 LAN.', 'Когда настроен только R1: ping всё ещё нет — у R2 и R3 нет обратных маршрутов в LAN R1.', 'אחרי R1 בלבד: עדיין אין ping — ל-R2 ול-R3 אין נתיבי חזרה ל-LAN של R1.'],
        ['R3 needs one line: it has a single exit (S0/0/1 to R2), so "everything unknown — there". /0 is the shortest mask, so any more exact route still wins (longest prefix match).', 'R3 хватает одной строки: у него один выход (S0/0/1 к R2), поэтому «всё чужое — туда». /0 — самая короткая маска, любой более точный маршрут всё равно сильнее (longest prefix match).', 'ל-R3 מספיקה שורה אחת: יש לו יציאה אחת (S0/0/1 אל R2), ולכן "כל מה שזר — לשם". ‎/0 היא המסכה הקצרה ביותר, כך שכל נתיב מדויק יותר עדיין מנצח (longest prefix match).'],
        ['Fully specified (only to write down): "ip route 172.31.0.0 255.255.255.0 s0/0/1 172.31.1.197" — order: network → mask → own interface → neighbour IP (R2 on the R2–R3 link = .197).', 'Fully specified (только записать): "ip route 172.31.0.0 255.255.255.0 s0/0/1 172.31.1.197" — порядок: сеть → маска → свой интерфейс → IP соседа (R2 на линке R2–R3 = .197).', 'Fully specified (רק לרשום): ‏"ip route 172.31.0.0 255.255.255.0 s0/0/1 172.31.1.197" — הסדר: רשת → מסכה → הממשק שלך → IP של השכן (R2 בקישור R2–R3 = ‎.197).'],
      ]),
      lTable([['Check', 'Проверка', 'בדיקה'], ['Expected', 'Должно быть', 'מה צריך לראות']], [
        ['show ip route static', ['R1: 3 lines S · R2: 2 lines S · R3: S* 0.0.0.0/0', 'R1: 3 строки S · R2: 2 строки S · R3: S* 0.0.0.0/0', 'R1: ‏3 שורות S · ‏R2: ‏2 שורות S · ‏R3: ‏S* 0.0.0.0/0']],
        ['show ip route connected', ['only the C (and L) routes', 'только маршруты C (и L)', 'רק נתיבי C ‏(ו-L)']],
        ['ping PC1 → PC2 / PC3, PC2 → PC3', ['every device pings every other device', 'каждое устройство пингует каждое', 'כל התקן עושה ping לכל התקן']],
      ]),
      lTip(['Codes: C — connected, S — static, S* — static default (candidate default). Practise the whole lab in Training → Static routing → "Lab 2.2.2.4" — the routers there have serial interfaces like in Packet Tracer.',
        'Коды: C — подключённая, S — статический, S* — статический по умолчанию. Всю лабу можно пройти в Training → Static routing → «Лаба 2.2.2.4» — там у роутеров serial-интерфейсы, как в Packet Tracer.',
        'קודים: C — מחוברת, S — סטטי, S* — ברירת מחדל סטטית. את כל המעבדה אפשר לתרגל ב-Training → Static routing → "מעבדה 2.2.2.4" — לנתבים שם יש ממשקי serial כמו ב-Packet Tracer.'])),
  ],
  quiz: [
    lQ(['What is a recursive static route?', 'Что такое рекурсивный статический маршрут?', 'מהו נתיב סטטי רקורסיבי?'],
      [['It points to the next-hop IP instead of an exit interface', 'Указывает IP следующего узла, а не выходной интерфейс', 'מצביע על IP של הקפיצה הבאה במקום על ממשק יציאה'], ['It points to the exit interface only', 'Указывает только выходной интерфейс', 'מצביע רק על ממשק יציאה'], ['It has an exit interface and a next hop', 'Указывает и интерфейс, и next hop', 'יש בו ממשק יציאה וגם next hop'], ['It is a route to 0.0.0.0/0', 'Это маршрут в 0.0.0.0/0', 'זה נתיב אל 0.0.0.0/0']], 0,
      ['Recursive = next-hop IP, so the router needs a second lookup to find the exit interface to that next hop.', 'Рекурсивный — это IP соседа, поэтому роутеру нужен второй поиск, чтобы найти выход к этому соседу.', 'רקורסיבי = IP של השכן, ולכן הנתב צריך חיפוש שני כדי למצוא את ממשק היציאה אליו.']),
    lQ(['Why does a recursive static route need two routing-table lookups?', 'Почему рекурсивному маршруту нужно два поиска в таблице?', 'למה נתיב סטטי רקורסיבי צריך שני חיפושים בטבלת הניתוב?'],
      [['The first finds the next hop, the second finds the exit interface to that next hop', 'Первый находит next hop, второй — выходной интерфейс к нему', 'הראשון מוצא את ה-next hop, השני את ממשק היציאה אליו'], ['One lookup for each direction', 'По одному поиску на каждое направление', 'חיפוש אחד לכל כיוון'], ['Because its AD is 1', 'Потому что у него AD 1', 'כי ה-AD שלו הוא 1'], ['Because of proxy ARP', 'Из-за proxy ARP', 'בגלל proxy ARP']], 0,
      ['1) destination → next hop; 2) next hop → connected network → exit interface.', '1) получатель → next hop; 2) next hop → подключённая сеть → выходной интерфейс.', '1) יעד → next hop; 2) ‏next hop → רשת מחוברת → ממשק יציאה.']),
    lQ(['Which static route gives BOTH the exit interface and the next-hop IP?', 'Какой статический маршрут указывает И выходной интерфейс, И IP следующего узла?', 'איזה נתיב סטטי מציין גם ממשק יציאה וגם IP של הקפיצה הבאה?'],
      [['Fully specified', 'Fully specified', 'Fully specified'], ['Recursive', 'Рекурсивный', 'רקורסיבי'], ['Directly attached', 'Directly attached', 'Directly attached'], ['Floating', 'Плавающий', 'צף']], 0,
      ['Needed on Ethernet (multi-access): the port alone is not enough, there can be many neighbours.', 'Нужен на Ethernet (много соседей в сегменте): одного порта мало, соседей может быть несколько.', 'נחוץ ב-Ethernet (רשת מרובת גישה): פורט בלבד לא מספיק, יכולים להיות כמה שכנים.']),
    lQ(['There are 5 networks. R2 is directly connected to 3 of them. How many static routes does R2 need (no default route)?', 'В сети 5 сетей. R2 напрямую подключён к 3 из них. Сколько статических маршрутов нужно R2 (без маршрута по умолчанию)?', 'יש 5 רשתות. R2 מחובר ישירות ל-3 מהן. כמה נתיבים סטטיים R2 צריך (בלי נתיב ברירת מחדל)?'],
      ['2', '3', '5', '0'], 0,
      ['Routes needed = all networks − connected ones: 5 − 3 = 2.', 'Нужно маршрутов = все сети − подключённые: 5 − 3 = 2.', 'נתיבים דרושים = כל הרשתות − המחוברות: 5 − 3 = 2.']),
    lQ(['R3 has only one exit — S0/0/1 to R2. Which ONE command replaces its three static routes?', 'У R3 один выход — S0/0/1 к R2. Какая ОДНА команда заменит три его статических маршрута?', 'ל-R3 יש יציאה אחת בלבד — S0/0/1 אל R2. איזו פקודה אחת מחליפה את שלושת הנתיבים הסטטיים שלו?'],
      ['ip route 0.0.0.0 0.0.0.0 s0/0/1', 'ip route 255.255.255.255 0.0.0.0 s0/0/1', 'ip default-gateway 172.31.1.197', 'ip route 0.0.0.0 255.255.255.255 s0/0/1'], 0,
      ['0.0.0.0 0.0.0.0 matches everything; ip default-gateway is for switches.', '0.0.0.0 0.0.0.0 совпадает со всем; ip default-gateway — для коммутаторов.', '0.0.0.0 0.0.0.0 מתאים לכל דבר; ip default-gateway מיועד למתגים.']),
    lQ(['How does a default route via an exit interface look in "show ip route"?', 'Как маршрут по умолчанию через выходной интерфейс выглядит в "show ip route"?', 'איך נתיב ברירת מחדל דרך ממשק יציאה נראה ב-"show ip route"?'],
      ['S*   0.0.0.0/0 is directly connected, Serial0/0/1', 'C    0.0.0.0/0 is directly connected, Serial0/0/1', 'O*E2 0.0.0.0/0 [110/1] via 172.31.1.197', 'L    0.0.0.0/32 is directly connected, Serial0/0/1'], 0,
      ['S* = static candidate default; with an exit interface it says "is directly connected". Gateway of last resort is 0.0.0.0.', 'S* — статический кандидат в маршрут по умолчанию; с выходным интерфейсом — "is directly connected". Gateway of last resort is 0.0.0.0.', 'S* = נתיב ברירת מחדל סטטי; עם ממשק יציאה כתוב "is directly connected". ‏Gateway of last resort is 0.0.0.0.']),
    lQ(['Which command shows ONLY the static routes?', 'Какая команда показывает ТОЛЬКО статические маршруты?', 'איזו פקודה מציגה רק את הנתיבים הסטטיים?'],
      ['show ip route static', 'show ip route connected', 'show ip protocols', 'show ip interface brief'], 0,
      ['"show ip route connected" shows only C/L; "show ip route static" — only S.', '"show ip route connected" — только C/L; "show ip route static" — только S.', '"show ip route connected" מציג רק C/L; ‏"show ip route static" — רק S.']),
    lQ(['On R2 (S0/0/0 = 172.31.1.193) you type "ip route 172.31.1.0 255.255.255.128 172.31.1.193". What does IOS answer?', 'На R2 (S0/0/0 = 172.31.1.193) вы вводите "ip route 172.31.1.0 255.255.255.128 172.31.1.193". Что ответит IOS?', 'ב-R2 ‏(S0/0/0 = 172.31.1.193) מקלידים "ip route 172.31.1.0 255.255.255.128 172.31.1.193". מה IOS עונה?'],
      ['%Invalid next hop address (it\'s this router)', '% Invalid input detected', '%Inconsistent address and mask', ['Nothing — the route works', 'Ничего — маршрут работает', 'כלום — הנתיב עובד']], 0,
      ['.193 is R2\'s own address. The next hop must be the neighbour R1: 172.31.1.194.', '.193 — свой адрес R2. Next hop должен быть соседом R1: 172.31.1.194.', '‎.193 היא הכתובת של R2 עצמו. ה-next hop צריך להיות השכן R1: ‏172.31.1.194.']),
  ],
});

lessonExtend('srwe16', {
  minutes: 4,
  sections: [
    lSec(['Typical CLI mistakes (lab 2.2.2.4)', 'Типичные ошибки в CLI (лаба 2.2.2.4)', 'טעויות נפוצות ב-CLI (מעבדה 2.2.2.4)'],
      lTable([['You typed', 'Ввёл', 'הקלדת'], ['Router answer', 'Ответ роутера', 'תשובת הנתב'], ['Why', 'Причина', 'למה']], [
        ['172.31.1.0 255.255.255.128 s0/0/0', '% Invalid input', ['"ip route" is missing at the start', 'нет «ip route» в начале', 'חסר "ip route" בהתחלה']],
        ['ip route … 172.31.1.193 (R2)', '%Invalid next hop address (it\'s this router)', ['.193 is R2\'s own address, the neighbour is .194', '.193 — свой адрес R2, сосед — .194', '‎.193 היא הכתובת של R2, השכן הוא ‎.194']],
        ['ip route … 172.31.1.194 (R2)', ['accepted', 'принято', 'מתקבל'], ['an extra recursive route — remove it with "no ip route …"', 'лишний рекурсивный маршрут — удалить через «no ip route …»', 'נתיב רקורסיבי מיותר — מוחקים עם "no ip route …"']],
        ['ip route … s0/0/0', '%Default route without gateway…', ['only a warning — the route works on serial', 'только предупреждение — маршрут работает на serial', 'רק אזהרה — הנתיב עובד ב-serial']],
        [['ping fails', 'ping не проходит', 'ה-ping נכשל'], '—', ['no return route, or a wrong mask in ip route', 'нет обратного маршрута или ошибка в маске', 'אין נתיב חזרה, או מסכה שגויה ב-ip route']],
      ]),
      lP(['To delete a route type the same command with "no" in front. If a ping fails, run "show ip route" on every router on the way — there and back.', 'Удалить маршрут — та же команда с «no» впереди. Если ping не проходит — "show ip route" на каждом роутере по пути, туда и обратно.', 'כדי למחוק נתיב מקלידים את אותה פקודה עם "no" בהתחלה. אם ה-ping נכשל — "show ip route" בכל נתב בדרך, הלוך וחזור.'])),
  ],
  quiz: [
    lQ(['"ip route 10.1.1.0 255.255.255.0 s0/0/0" prints "%Default route without gateway, if not a point-to-point interface…". What does it mean?', '"ip route 10.1.1.0 255.255.255.0 s0/0/0" выдаёт "%Default route without gateway, if not a point-to-point interface…". Что это значит?', '"ip route 10.1.1.0 255.255.255.0 s0/0/0" מדפיס "%Default route without gateway, if not a point-to-point interface…". מה זה אומר?'],
      [['Only a warning: the route is added and works on a serial link', 'Только предупреждение: маршрут добавлен и работает на serial', 'רק אזהרה: הנתיב נוסף ועובד בקישור serial'], ['The route was rejected', 'Маршрут отклонён', 'הנתיב נדחה'], ['The interface is down', 'Интерфейс выключен', 'הממשק כבוי'], ['The mask is wrong', 'Неверная маска', 'המסכה שגויה']], 0,
      ['Serial is point-to-point — one receiver, no ARP needed. On Ethernet prefer a next hop.', 'Serial — точка-точка: один получатель, ARP не нужен. На Ethernet лучше указать next hop.', 'Serial הוא נקודה-לנקודה — מקבל אחד, לא צריך ARP. ב-Ethernet עדיף next hop.']),
  ],
});

G('static', 'Directly attached static route', 'Directly attached статический маршрут', 'נתיב סטטי directly attached',
  'A static route with only an exit interface: "ip route <net> <mask> s0/0/0". One lookup; normal on serial point-to-point links.',
  'Статический маршрут только с выходным интерфейсом: "ip route <сеть> <маска> s0/0/0". Один поиск; норма на serial точка-точка.',
  'נתיב סטטי עם ממשק יציאה בלבד: ‏"ip route <רשת> <מסכה> s0/0/0". חיפוש אחד; רגיל בקישורי serial נקודה-לנקודה.');
G('static', 'Recursive static route', 'Рекурсивный статический маршрут', 'נתיב סטטי רקורסיבי',
  'A static route with a next-hop IP: the router looks up the next hop again to find the exit interface (two lookups).',
  'Статический маршрут с IP следующего узла: роутер ищет next hop ещё раз, чтобы найти выходной интерфейс (два поиска).',
  'נתיב סטטי עם IP של הקפיצה הבאה: הנתב מחפש שוב את ה-next hop כדי למצוא את ממשק היציאה (שני חיפושים).');
G('static', 'Serial link (HDLC, DCE / DTE)', 'Serial-линк (HDLC, DCE / DTE)', 'קישור serial ‏(HDLC, DCE / DTE)',
  'A point-to-point WAN link between two routers. Cisco default encapsulation is HDLC; the DCE end gives the clock ("clock rate"). OSPF treats it as point-to-point: no DR/BDR.',
  'WAN-линк точка-точка между двумя роутерами. Инкапсуляция Cisco по умолчанию — HDLC; DCE-конец задаёт синхронизацию ("clock rate"). OSPF считает его точкой-точкой: без DR/BDR.',
  'קישור WAN נקודה-לנקודה בין שני נתבים. האנקפסולציה ברירת המחדל של Cisco היא HDLC; צד ה-DCE נותן את השעון ("clock rate"). ‏OSPF מתייחס אליו כנקודה-לנקודה: בלי DR/BDR.');

IV('static', ['What kinds of static routes are there, and when do you use each?', 'Какие бывают статические маршруты и когда какой использовать?', 'אילו סוגים של נתיבים סטטיים יש, ומתי משתמשים בכל אחד?'],
  ['Four. Recursive — "ip route <net> <mask> <next-hop>": the router looks up the next hop again to find the exit, two lookups; the usual choice. Directly attached — only the exit interface: one lookup, fine on point-to-point serial links, but on Ethernet it relies on proxy ARP. Fully specified — exit interface plus next hop: the safe choice on Ethernet. And the default route 0.0.0.0/0 — "everything else", for a stub router with a single exit or the edge to the ISP; any more specific route still wins by longest prefix match. In every case the next hop is the neighbour\'s address on the shared link, and routing must work both ways.',
    'Четыре. Рекурсивный — "ip route <сеть> <маска> <next-hop>": роутер ищет next hop ещё раз, чтобы найти выход, два поиска; обычный выбор. Directly attached — только выходной интерфейс: один поиск, нормально на serial точка-точка, но на Ethernet держится на proxy ARP. Fully specified — интерфейс плюс next hop: надёжный выбор на Ethernet. И маршрут по умолчанию 0.0.0.0/0 — «всё остальное», для тупикового роутера с одним выходом или для выхода к провайдеру; любой более точный маршрут всё равно сильнее (longest prefix match). Во всех случаях next hop — адрес соседа на общем линке, а маршрутизация должна работать в обе стороны.',
    'ארבעה. רקורסיבי — "ip route <רשת> <מסכה> <next-hop>": הנתב מחפש שוב את ה-next hop כדי למצוא את היציאה, שני חיפושים; הבחירה הרגילה. Directly attached — ממשק יציאה בלבד: חיפוש אחד, תקין בקישורי serial נקודה-לנקודה, אבל ב-Ethernet נשען על proxy ARP. Fully specified — ממשק יציאה ועוד next hop: הבחירה הבטוחה ב-Ethernet. ונתיב ברירת המחדל 0.0.0.0/0 — "כל השאר", לנתב קצה עם יציאה אחת או לחיבור לספק; כל נתיב מדויק יותר עדיין מנצח (longest prefix match). בכל המקרים ה-next hop הוא הכתובת של השכן בקישור המשותף, והניתוב חייב לעבוד בשני הכיוונים.'], 'iv-static-kinds');
