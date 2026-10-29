'use strict';
// ITN, модули 10–13: базовая настройка маршрутизатора, IPv4, IPv6, ICMP.

lessonDef({
  id: 'itn10', topic: 'device', minutes: 12,
  title: T('Basic Router Configuration', 'Базовая настройка маршрутизатора', 'הגדרה בסיסית של נתב'),
  goal: T('The initial settings of a router, configuring and enabling interfaces, the verification commands and the default gateway of hosts and switches.',
    'Начальные настройки маршрутизатора, настройка и включение интерфейсов, команды проверки и шлюз по умолчанию для хостов и коммутаторов.',
    'ההגדרות הראשוניות של נתב, הגדרת ממשקים והפעלתם, פקודות בדיקה ושער ברירת המחדל של מארחים ומתגים.'),
  sections: [
    lSec(['Initial settings', 'Начальные настройки', 'הגדרות ראשוניות'],
      lCode('Router(config)# hostname R1\nR1(config)# enable secret class\nR1(config)# line console 0\nR1(config-line)# password cisco\nR1(config-line)# login\nR1(config-line)# line vty 0 4\nR1(config-line)# password cisco\nR1(config-line)# login\nR1(config-line)# transport input ssh telnet\nR1(config-line)# exit\nR1(config)# service password-encryption\nR1(config)# banner motd #Authorized access only!#\nR1(config)# end\nR1# copy running-config startup-config'),
      lP(['The same basic steps as on a switch: name, secure privileged mode, console and vty passwords, encrypt passwords, banner, save.',
        'Те же базовые шаги, что и на коммутаторе: имя, защита привилегированного режима, пароли на консоль и vty, шифрование паролей, баннер, сохранение.',
        'אותם צעדים בסיסיים כמו במתג: שם, הגנה על המצב המורשה, סיסמאות לקונסולה ול-vty, הצפנת סיסמאות, באנר ושמירה.'])),
    lSec(['Configuring interfaces', 'Настройка интерфейсов', 'הגדרת ממשקים'],
      lCode('R1(config)# interface g0/0\nR1(config-if)# description Link to LAN\nR1(config-if)# ip address 192.168.10.1 255.255.255.0\nR1(config-if)# ipv6 address 2001:db8:acad:10::1/64\nR1(config-if)# no shutdown\nR1(config-if)# exit\nR1(config)# ipv6 unicast-routing'),
      lUL([
        ['Each router interface is in a different network. Its IP is usually the gateway of that network.', 'Каждый интерфейс маршрутизатора — в своей сети. Его IP обычно и есть шлюз этой сети.', 'כל ממשק של נתב נמצא ברשת אחרת. כתובת ה-IP שלו היא בדרך כלל השער של הרשת הזו.'],
        ['Router interfaces are shut down by default — always finish with no shutdown.', 'Интерфейсы маршрутизатора по умолчанию выключены — всегда заканчивайте no shutdown.', 'ממשקי נתב כבויים כברירת מחדל — תמיד מסיימים ב-no shutdown.'],
        ['description helps the next engineer understand the network.', 'description помогает следующему инженеру понять сеть.', 'description עוזר למהנדס הבא להבין את הרשת.'],
      ])),
    lSec(['Verification commands', 'Команды проверки', 'פקודות בדיקה'],
      lTable([['Command', 'Команда', 'פקודה'], ['Shows', 'Показывает', 'מציגה']], [
        ['show ip interface brief', ['All interfaces, IPs and up/down status', 'Все интерфейсы, IP и состояние up/down', 'כל הממשקים, כתובות IP ומצב up/down']],
        ['show ip route', ['The routing table', 'Таблицу маршрутизации', 'את טבלת הניתוב']],
        ['show interfaces', ['Detailed statistics and errors', 'Подробную статистику и ошибки', 'סטטיסטיקה ושגיאות בפירוט']],
        ['show running-config', ['The current configuration', 'Текущую конфигурацию', 'את התצורה הנוכחית']],
        ['show ipv6 interface brief', ['IPv6 addresses of interfaces', 'IPv6-адреса интерфейсов', 'כתובות IPv6 של הממשקים']],
      ]),
      lTip(['Exam habit: after every change, run show ip interface brief and ping the neighbour.', 'Привычка для экзамена: после каждого изменения — show ip interface brief и ping соседа.', 'הרגל למבחן: אחרי כל שינוי מריצים show ip interface brief ועושים ping לשכן.'])),
    lSec(['Default gateway', 'Шлюз по умолчанию', 'שער ברירת מחדל'],
      lUL([
        ['Hosts: the IP of the router interface in their LAN, set in IP Configuration or given by DHCP.', 'Хосты: IP интерфейса маршрутизатора в их LAN — вручную в IP Configuration или от DHCP.', 'מארחים: כתובת ה-IP של ממשק הנתב ב-LAN שלהם — ידנית ב-IP Configuration או דרך DHCP.'],
        ['Switch: ip default-gateway — needed only to manage the switch from other networks.', 'Коммутатор: ip default-gateway — нужен только для управления коммутатором из других сетей.', 'מתג: ip default-gateway — נדרש רק כדי לנהל את המתג מרשתות אחרות.'],
      ]),
      lCode('S1(config)# ip default-gateway 192.168.10.1')),
  ],
  quiz: [
    lQ(['Why must you enter "no shutdown" on a router interface?', 'Зачем вводить «no shutdown» на интерфейсе маршрутизатора?', 'למה צריך להקליד "no shutdown" בממשק נתב?'],
      [['Router interfaces are disabled by default', 'Интерфейсы маршрутизатора выключены по умолчанию', 'ממשקי נתב כבויים כברירת מחדל'], ['To save the configuration', 'Чтобы сохранить конфигурацию', 'כדי לשמור את התצורה'], ['To set the speed', 'Чтобы задать скорость', 'כדי לקבוע מהירות'], ['To delete the IP', 'Чтобы удалить IP', 'כדי למחוק את ה-IP']], 0,
      ['Without it the interface stays administratively down.', 'Без неё интерфейс остаётся administratively down.', 'בלעדיה הממשק נשאר administratively down.']),
    lQ(['Which command shows the routing table?', 'Какая команда показывает таблицу маршрутизации?', 'איזו פקודה מציגה את טבלת הניתוב?'], ['show ip route', 'show ip interface brief', 'show running-config', 'show arp'], 0,
      ['show ip route lists C, L, S, O, R routes.', 'show ip route показывает маршруты C, L, S, O, R.', 'show ip route מציג נתיבי C, ‏L, ‏S, ‏O, ‏R.']),
    lQ(['Which command enables IPv6 routing on a Cisco router?', 'Какая команда включает маршрутизацию IPv6 на Cisco?', 'איזו פקודה מפעילה ניתוב IPv6 בנתב Cisco?'], ['ipv6 unicast-routing', 'ipv6 enable', 'ip routing ipv6', 'router ipv6'], 0,
      ['Without it the router only acts like an IPv6 host.', 'Без неё маршрутизатор ведёт себя как обычный IPv6-хост.', 'בלעדיה הנתב מתנהג כמו מארח IPv6 רגיל.']),
    lQ(['What does the "description" command on an interface do?', 'Что делает команда «description» на интерфейсе?', 'מה עושה הפקודה "description" בממשק?'],
      [['Adds a comment that helps document the network', 'Добавляет комментарий для документирования сети', 'מוסיפה הערה שעוזרת לתעד את הרשת'], ['Sets the IP address', 'Задаёт IP-адрес', 'קובעת כתובת IP'], ['Turns the interface on', 'Включает интерфейс', 'מפעילה את הממשק'], ['Sets a password', 'Задаёт пароль', 'קובעת סיסמה']], 0,
      ['It changes nothing in how the router works.', 'Она никак не влияет на работу маршрутизатора.', 'היא לא משנה שום דבר בפעולת הנתב.']),
    lQ(['Which command gives a Layer 2 switch a default gateway?', 'Какая команда задаёт шлюз по умолчанию коммутатору 2-го уровня?', 'איזו פקודה מגדירה שער ברירת מחדל למתג שכבה 2?'], ['ip default-gateway 192.168.10.1', 'ip route 0.0.0.0 0.0.0.0 192.168.10.1', 'default-router 192.168.10.1', 'gateway 192.168.10.1'], 0,
      ['default-router is a DHCP pool command; ip route is for routers.', 'default-router — команда DHCP-пула; ip route — для маршрутизаторов.', 'default-router היא פקודה של מאגר DHCP; ‏ip route — לנתבים.']),
    lQ(['Two router interfaces in the same subnet — is that allowed?', 'Два интерфейса маршрутизатора в одной подсети — так можно?', 'שני ממשקי נתב באותה תת-רשת — זה מותר?'],
      [['No — each interface must be in a different network', 'Нет — каждый интерфейс должен быть в своей сети', 'לא — כל ממשק חייב להיות ברשת אחרת'], ['Yes, always', 'Да, всегда', 'כן, תמיד'], ['Only on Gigabit interfaces', 'Только на Gigabit-интерфейсах', 'רק בממשקי Gigabit'], ['Only with IPv6', 'Только с IPv6', 'רק עם IPv6']], 0,
      ['IOS refuses an overlapping subnet on another interface.', 'IOS не даст назначить пересекающуюся подсеть на другой интерфейс.', 'IOS מסרב להגדיר תת-רשת חופפת בממשק אחר.']),
    lQ(['Which command shows interface errors and statistics in detail?', 'Какая команда подробно показывает ошибки и статистику интерфейса?', 'איזו פקודה מציגה שגיאות וסטטיסטיקה של ממשק בפירוט?'], ['show interfaces', 'show ip route', 'show version', 'show clock'], 0,
      ['show interfaces: input/output errors, CRC, collisions, duplex.', 'show interfaces: ошибки ввода/вывода, CRC, коллизии, дуплекс.', 'show interfaces: שגיאות קלט/פלט, CRC, התנגשויות, דופלקס.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn11', topic: 'basics', drill: 'subnet', minutes: 20, genInQuiz: 3,
  title: T('IPv4 Addressing', 'IPv4-адресация', 'מיעון IPv4'),
  goal: T('Network and host parts, masks and prefixes, network and broadcast addresses, address types, and subnetting a network.',
    'Сетевая и хостовая часть, маски и префиксы, адрес сети и broadcast, типы адресов и разбиение сети на подсети.',
    'החלק של הרשת והחלק של המארח, מסכות וקידומות, כתובת רשת וכתובת broadcast, סוגי כתובות וחלוקה לתת-רשתות.'),
  sections: [
    lSec(['Network and host parts', 'Сетевая и хостовая часть', 'חלק הרשת וחלק המארח'],
      lP(['Every IPv4 address has a network part and a host part. The subnet mask marks the network bits with 1s. The prefix length (/24) is the number of 1s in the mask.',
        'У каждого IPv4-адреса есть сетевая и хостовая части. Маска отмечает сетевые биты единицами. Длина префикса (/24) — число единиц в маске.',
        'לכל כתובת IPv4 יש חלק רשת וחלק מארח. המסכה מסמנת את סיביות הרשת ב-1. אורך הקידומת (‎/24) הוא מספר האחדות במסכה.']),
      lCode('192.168.10.25  = 11000000.10101000.00001010.00011001\n255.255.255.0  = 11111111.11111111.11111111.00000000\n                 |------ network (24 bits) -----|host|'),
      lTable([['Prefix', 'Префикс', 'קידומת'], ['Mask', 'Маска', 'מסכה'], ['Block', 'Блок', 'גוש'], ['Hosts', 'Хостов', 'מארחים']], [
        ['/24', '255.255.255.0', '256', '254'], ['/25', '255.255.255.128', '128', '126'], ['/26', '255.255.255.192', '64', '62'], ['/27', '255.255.255.224', '32', '30'],
        ['/28', '255.255.255.240', '16', '14'], ['/29', '255.255.255.248', '8', '6'], ['/30', '255.255.255.252', '4', '2'],
      ])),
    lSec(['Network, broadcast and host addresses', 'Адрес сети, broadcast и хосты', 'כתובת רשת, broadcast ומארחים'],
      lUL([
        ['All host bits 0 → network address (cannot be given to a host).', 'Все биты хоста = 0 → адрес сети (хосту не назначается).', 'כל סיביות המארח 0 → כתובת הרשת (אי אפשר לתת אותה למארח).'],
        ['All host bits 1 → broadcast address.', 'Все биты хоста = 1 → broadcast-адрес.', 'כל סיביות המארח 1 → כתובת ה-broadcast.'],
        ['Usable hosts = 2^(host bits) − 2.', 'Число хостов = 2^(биты хоста) − 2.', 'מספר המארחים = 2 בחזקת (סיביות המארח) פחות 2.'],
      ]),
      lP(['Fast method — block size = 256 − the interesting mask octet. /26 → block 64: subnets .0, .64, .128, .192.',
        'Быстрый способ — размер блока = 256 − «интересный» октет маски. /26 → блок 64: подсети .0, .64, .128, .192.',
        'שיטה מהירה — גודל הגוש = 256 פחות האוקטט "המעניין" של המסכה. ‎/26 → גוש של 64: תת-רשתות ‎.0, ‎.64, ‎.128, ‎.192.']),
      lCode('Host 192.168.1.100/26   block = 256 - 192 = 64\n  network   = 192.168.1.64\n  hosts     = 192.168.1.65 - 192.168.1.126\n  broadcast = 192.168.1.127')),
    lSec(['Types of addresses', 'Типы адресов', 'סוגי כתובות'],
      lTable([['Range', 'Диапазон', 'טווח'], ['Meaning', 'Назначение', 'משמעות']], [
        ['10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16', ['Private — not routed on the Internet, used with NAT', 'Частные — не маршрутизируются в интернете, используются с NAT', 'פרטיות — לא מנותבות באינטרנט, משמשות עם NAT']],
        ['127.0.0.0/8', ['Loopback — the host itself', 'Loopback — сам хост', 'Loopback — המארח עצמו']],
        ['169.254.0.0/16', ['Link-local (APIPA) — DHCP failed', 'Link-local (APIPA) — DHCP не ответил', 'Link-local ‏(APIPA) — ‏DHCP נכשל']],
        ['224.0.0.0 – 239.255.255.255', ['Multicast (old class D)', 'Multicast (бывший класс D)', 'Multicast (מחלקה D לשעבר)']],
      ]),
      lP(['Legacy classes: A 1–126 (/8), B 128–191 (/16), C 192–223 (/24). Today addressing is classless (CIDR), but RIP and exam questions still mention classes.',
        'Старые классы: A 1–126 (/8), B 128–191 (/16), C 192–223 (/24). Сегодня адресация бесклассовая (CIDR), но RIP и экзамены всё ещё упоминают классы.',
        'מחלקות ותיקות: A ‏1–126 ‏(‎/8), ‏B ‏128–191 ‏(‎/16), ‏C ‏192–223 ‏(‎/24). היום המיעון ללא מחלקות (CIDR), אבל RIP ושאלות מבחן עדיין מזכירים מחלקות.'])),
    lSec(['Subnetting', 'Разбиение на подсети', 'חלוקה לתת-רשתות'],
      lP(['Subnetting borrows host bits to make more, smaller networks: smaller broadcast domains, better security and order. Borrowing n bits gives 2^n subnets; the remaining h host bits give 2^h − 2 hosts each.',
        'Разбиение на подсети «занимает» биты хоста, чтобы получить больше маленьких сетей: меньше широковещательные домены, лучше безопасность и порядок. Заняв n бит, получаем 2^n подсетей; оставшиеся h бит хоста дают по 2^h − 2 хостов.',
        'חלוקה לתת-רשתות "שואלת" סיביות מארח כדי ליצור יותר רשתות קטנות: תחומי broadcast קטנים יותר, אבטחה וסדר טובים יותר. שאילת n סיביות נותנת 2^n תת-רשתות; ‏h סיביות המארח שנשארו נותנות 2^h − 2 מארחים בכל אחת.']),
      lCode('192.168.1.0/24 -> borrow 2 bits -> /26 (4 subnets, 62 hosts each)\n  192.168.1.0/26     .1  - .62    bcast .63\n  192.168.1.64/26    .65 - .126   bcast .127\n  192.168.1.128/26   .129 - .190  bcast .191\n  192.168.1.192/26   .193 - .254  bcast .255'),
      lTip(['VLSM: use different prefix lengths for different needs — e.g. /26 for a 50-host LAN and /30 for a router-to-router link. Always start with the largest subnet.',
        'VLSM: разные длины префикса под разные задачи — например, /26 для LAN на 50 хостов и /30 для канала между маршрутизаторами. Всегда начинайте с самой большой подсети.',
        'VLSM: אורכי קידומת שונים לצרכים שונים — למשל ‎/26 ל-LAN של 50 מארחים ו-‎/30 לקישור בין נתבים. תמיד מתחילים מתת-הרשת הגדולה ביותר.'])),
  ],
  quiz: [
    lQ(['Which address is private?', 'Какой адрес частный?', 'איזו כתובת פרטית?'], ['172.20.5.1', '172.32.5.1', '11.0.0.1', '192.169.1.1'], 0,
      ['Private 172 range: 172.16.0.0 – 172.31.255.255.', 'Частный диапазон 172: 172.16.0.0 – 172.31.255.255.', 'טווח 172 הפרטי: 172.16.0.0 – 172.31.255.255.']),
    lQ(['Which address cannot be assigned to a host in 192.168.5.0/24?', 'Какой адрес нельзя назначить хосту в сети 192.168.5.0/24?', 'איזו כתובת אי אפשר לתת למארח ב-192.168.5.0/24?'], ['192.168.5.255', '192.168.5.1', '192.168.5.100', '192.168.5.254'], 0,
      ['.255 is the broadcast of a /24 (and .0 the network).', '.255 — broadcast сети /24 (а .0 — адрес сети).', '‎.255 היא כתובת ה-broadcast של ‎/24 (ו-‎.0 כתובת הרשת).']),
    lQ(['A PC shows 169.254.12.7. What happened?', 'ПК показывает 169.254.12.7. Что произошло?', 'מחשב מציג 169.254.12.7. מה קרה?'],
      [['It got no answer from a DHCP server', 'Он не получил ответ от DHCP-сервера', 'הוא לא קיבל תשובה משרת DHCP'], ['It has a public address', 'У него публичный адрес', 'יש לו כתובת ציבורית'], ['It is a loopback address', 'Это loopback', 'זו כתובת loopback'], ['It is a multicast address', 'Это multicast', 'זו כתובת multicast']], 0,
      ['169.254.x.x = APIPA.', '169.254.x.x — APIPA.', '169.254.x.x = APIPA.']),
    lQ(['How many subnets do you get by borrowing 3 bits?', 'Сколько подсетей получится, если занять 3 бита?', 'כמה תת-רשתות מקבלים משאילת 3 סיביות?'], ['8', '6', '3', '16'], 0,
      ['2^3 = 8.', '2^3 = 8.', '2^3 = 8.']),
    lQ(['Which range is multicast?', 'Какой диапазон — multicast?', 'איזה טווח הוא multicast?'], ['224.0.0.0 – 239.255.255.255', '192.168.0.0 – 192.168.255.255', '127.0.0.0 – 127.255.255.255', '169.254.0.0 – 169.254.255.255'], 0,
      ['224–239 = old class D.', '224–239 — бывший класс D.', '224–239 = מחלקה D לשעבר.']),
    lQ(['The default gateway of a host must be…', 'Шлюз по умолчанию хоста должен быть…', 'שער ברירת המחדל של מארח חייב להיות…'],
      [['In the same subnet as the host', 'в той же подсети, что и хост', 'באותה תת-רשת כמו המארח'], ['Any router address', 'любым адресом маршрутизатора', 'כל כתובת של נתב'], ['The DNS server', 'DNS-сервером', 'שרת ה-DNS'], ['The broadcast address', 'broadcast-адресом', 'כתובת ה-broadcast']], 0,
      ['The host must reach it directly with ARP.', 'Хост должен достать до него напрямую через ARP.', 'המארח חייב להגיע אליו ישירות בעזרת ARP.']),
    lQ(['Which prefix is ideal for a link between two routers?', 'Какой префикс идеален для канала между двумя маршрутизаторами?', 'איזו קידומת מתאימה לקישור בין שני נתבים?'], ['/30', '/24', '/16', '/32'], 0,
      ['/30 has exactly 2 usable hosts.', 'В /30 ровно 2 адреса для хостов.', 'ב-‎/30 יש בדיוק 2 כתובות שימושיות.']),
    lQ(['In VLSM, which subnet do you allocate first?', 'Какую подсеть в VLSM выделяют первой?', 'איזו תת-רשת מקצים ראשונה ב-VLSM?'],
      [['The largest one', 'Самую большую', 'את הגדולה ביותר'], ['The smallest one', 'Самую маленькую', 'את הקטנה ביותר'], ['The router links', 'Каналы между маршрутизаторами', 'את הקישורים בין הנתבים'], ['Any order', 'В любом порядке', 'בכל סדר']], 0,
      ['Largest first avoids overlaps and wasted space.', 'Сначала самая большая — так нет пересечений и потерь адресов.', 'קודם הגדולה — כך נמנעים מחפיפות ומבזבוז כתובות.']),
  ],
  gen: [
    function genNetwork(rng) {
      const ip = lRandHostIp(rng), len = rng.pick([18, 20, 22, 23, 25, 26, 27, 28, 29, 30]);
      const n = netOf(ip, len), size = Math.pow(2, 32 - len), b = broadcastOf(n, len);
      return lGen(T('What is the network address of ' + ip + '/' + len + '?', 'Какой адрес сети у ' + ip + '/' + len + '?', 'מהי כתובת הרשת של ' + ip + '/' + len + '?'),
        intToIp(n), [intToIp(n + size), intToIp(b), n >= size ? intToIp(n - size) : null, intToIp(netOf(ip, len + 1) === n ? n + size / 2 : n - size / 2), intToIp(netOf(ip, len - 1)), intToIp(n + 1)],
        T('Mask ' + lenToMask(len) + ': set the host bits to 0. Subnet ' + intToIp(n) + ' – ' + intToIp(b) + '.', 'Маска ' + lenToMask(len) + ': обнуляем биты хоста. Подсеть ' + intToIp(n) + ' – ' + intToIp(b) + '.', 'מסכה ' + lenToMask(len) + ': מאפסים את סיביות המארח. תת-רשת ' + intToIp(n) + ' – ' + intToIp(b) + '.'));
    },
    function genBroadcast(rng) {
      const ip = lRandHostIp(rng), len = rng.pick([20, 22, 25, 26, 27, 28, 29]);
      const n = netOf(ip, len), size = Math.pow(2, 32 - len), b = broadcastOf(n, len);
      return lGen(T('What is the broadcast address of the subnet that contains ' + ip + '/' + len + '?', 'Какой broadcast-адрес у подсети, где находится ' + ip + '/' + len + '?', 'מהי כתובת ה-broadcast של תת-הרשת שמכילה את ' + ip + '/' + len + '?'),
        intToIp(b), [intToIp(b - 1), intToIp(n), intToIp(b + size), intToIp(broadcastOf(n, len + 1) === b ? b - size / 2 : b + size / 2), intToIp(n - 1)],
        T('Set the host bits to 1: ' + intToIp(n) + '/' + len + ' ends at ' + intToIp(b) + '.', 'Все биты хоста = 1: подсеть ' + intToIp(n) + '/' + len + ' заканчивается на ' + intToIp(b) + '.', 'כל סיביות המארח 1: תת-הרשת ' + intToIp(n) + '/' + len + ' מסתיימת ב-' + intToIp(b) + '.'));
    },
    function genHosts(rng) {
      const len = rng.int(20, 30), hb = 32 - len, p = Math.pow(2, hb);
      return lGen(T('How many usable host addresses does a /' + len + ' subnet have?', 'Сколько адресов для хостов в подсети /' + len + '?', 'כמה כתובות מארחים שימושיות יש בתת-רשת ‎/' + len + '?'),
        String(p - 2), [String(p), String(p - 1), String(p * 2 - 2), String(p / 2 - 2), String(p + 2)],
        T('Host bits = ' + hb + '. 2^' + hb + ' − 2 = ' + (p - 2) + '.', 'Бит хоста = ' + hb + '. 2^' + hb + ' − 2 = ' + (p - 2) + '.', 'סיביות מארח = ' + hb + '. ‏2^' + hb + ' − 2 = ' + (p - 2) + '.'));
    },
    function genMask(rng) {
      const len = rng.int(17, 30);
      return lGen(T('Which subnet mask equals /' + len + '?', 'Какая маска соответствует /' + len + '?', 'איזו מסכה שווה ל-‎/' + len + '?'),
        lenToMask(len), [lenToMask(len - 1), lenToMask(len + 1), lenToMask(len + 2 <= 32 ? len + 2 : len - 2), lWild(len), lenToMask(len - 2)],
        T('/' + len + ' = ' + len + ' ones = ' + lenToMask(len) + '.', '/' + len + ' = ' + len + ' единиц = ' + lenToMask(len) + '.', '‎/' + len + ' = ' + len + ' אחדות = ' + lenToMask(len) + '.'));
    },
    function genPrefix(rng) {
      const len = rng.int(17, 30), m = lenToMask(len);
      return lGen(T('The mask ' + m + ' is the same as which prefix?', 'Маска ' + m + ' — это какой префикс?', 'המסכה ' + m + ' שווה לאיזו קידומת?'),
        '/' + len, ['/' + (len - 1), '/' + (len + 1), '/' + (len - 2), '/' + (len + 2)],
        T('Count the 1-bits: ' + len + '.', 'Считаем единицы: ' + len + '.', 'סופרים את האחדות: ' + len + '.'));
    },
    function genSameSubnet(rng) {
      const len = rng.int(25, 29), size = Math.pow(2, 32 - len);
      const base = ipToInt('192.168.' + rng.int(1, 250) + '.0');
      const n = base + rng.int(1, 256 / size - 2) * size;
      const pickHost = (net) => intToIp(net + rng.int(1, size - 2));
      const me = pickHost(n);
      let mate = pickHost(n);
      for (let i = 0; mate === me && i < 20; i++) mate = pickHost(n);
      if (mate === me) mate = intToIp(ipToInt(me) === n + 1 ? n + 2 : n + 1);
      return lGen(T('Which host is in the same subnet as ' + me + '/' + len + '?', 'Какой хост в той же подсети, что и ' + me + '/' + len + '?', 'איזה מארח נמצא באותה תת-רשת כמו ' + me + '/' + len + '?'),
        mate, [pickHost(n + size), pickHost(n - size), pickHost(n + 2 * size), intToIp(n + size + 1)],
        T('/' + len + ' → block ' + size + '. ' + me + ' is in ' + intToIp(n) + ' – ' + intToIp(n + size - 1) + '.', '/' + len + ' → блок ' + size + '. ' + me + ' лежит в ' + intToIp(n) + ' – ' + intToIp(n + size - 1) + '.', '‎/' + len + ' → גוש ' + size + '. ' + me + ' נמצא בטווח ' + intToIp(n) + ' – ' + intToIp(n + size - 1) + '.'));
    },
    function genPrefixForHosts(rng) {
      const need = rng.pick([5, 10, 12, 20, 25, 28, 30, 31, 40, 50, 60, 62, 63, 90, 100, 120, 126, 127, 200, 250, 254, 300, 500]);
      let len = 30; while (Math.pow(2, 32 - len) - 2 < need) len--;
      return lGen(T('A LAN needs ' + need + ' host addresses. Which is the smallest subnet (longest prefix) that fits?', 'В LAN нужно ' + need + ' адресов для хостов. Какая самая маленькая подсеть (самый длинный префикс) подойдёт?', 'ב-LAN צריך ' + need + ' כתובות מארחים. מהי תת-הרשת הקטנה ביותר (הקידומת הארוכה ביותר) שמתאימה?'),
        '/' + len, ['/' + (len + 1), '/' + (len - 1), '/' + (len + 2), '/' + (len - 2)],
        T('/' + len + ' gives ' + (Math.pow(2, 32 - len) - 2) + ' hosts; /' + (len + 1) + ' would give only ' + (Math.pow(2, 31 - len) - 2) + '.', '/' + len + ' даёт ' + (Math.pow(2, 32 - len) - 2) + ' хостов; /' + (len + 1) + ' дал бы только ' + (Math.pow(2, 31 - len) - 2) + '.', '‎/' + len + ' נותן ' + (Math.pow(2, 32 - len) - 2) + ' מארחים; ‎/' + (len + 1) + ' היה נותן רק ' + (Math.pow(2, 31 - len) - 2) + '.'));
    },
    function genBorrow(rng) {
      const from = rng.pick([16, 24, 24, 24]), n = from === 24 ? rng.int(1, 5) : rng.int(2, 8), len = from + n, h = 32 - len;
      const fmt = (s, k) => T(s + ' subnets, ' + k + ' hosts each', s + ' подсетей, по ' + k + ' хостов', s + ' תת-רשתות, ' + k + ' מארחים בכל אחת');
      return lGen(T('You subnet a /' + from + ' network by borrowing ' + n + ' bits. What do you get?', 'Сеть /' + from + ' делят на подсети, заняв ' + n + ' бит. Что получится?', 'מחלקים רשת ‎/' + from + ' לתת-רשתות בשאילת ' + n + ' סיביות. מה מתקבל?'),
        fmt(Math.pow(2, n), Math.pow(2, h) - 2), [fmt(Math.pow(2, n), Math.pow(2, h)), fmt(Math.pow(2, n) - 2, Math.pow(2, h) - 2), fmt(n * 2, Math.pow(2, h) - 2), fmt(Math.pow(2, h), Math.pow(2, n) - 2)],
        T('Subnets = 2^' + n + ' = ' + Math.pow(2, n) + '. New prefix /' + len + ' → hosts = 2^' + h + ' − 2 = ' + (Math.pow(2, h) - 2) + '.', 'Подсетей = 2^' + n + ' = ' + Math.pow(2, n) + '. Новый префикс /' + len + ' → хостов = 2^' + h + ' − 2 = ' + (Math.pow(2, h) - 2) + '.', 'תת-רשתות = 2^' + n + ' = ' + Math.pow(2, n) + '. קידומת חדשה ‎/' + len + ' → מארחים = 2^' + h + ' − 2 = ' + (Math.pow(2, h) - 2) + '.'));
    },
  ],
});

// ---------------------------------------------------------------
// IPv6: генерация адресов и правила сокращения (RFC 5952).
function ipv6Rand(rng) {
  const h = [0x2001, 0x0db8, rng.int(1, 0xffff), rng.chance(0.5) ? rng.int(1, 0xff) : rng.int(0x100, 0xffff), 0, 0, 0, 0]; // нули только там, где задано ниже
  for (let i = 4; i < 8; i++) h[i] = rng.chance(0.5) ? rng.int(1, 0xfff) : rng.int(0x1000, 0xffff);
  const L = rng.int(2, 3), s = rng.int(3, 8 - L);
  for (let k = s; k < s + L; k++) h[k] = 0;
  if (rng.chance(0.6)) {
    const free = [2, 3, 4, 5, 6, 7].filter((i) => i < s - 1 || i > s + L);
    if (free.length) h[rng.pick(free)] = 0;
  }
  return h;
}
function ipv6Full(h) { return h.map((x) => ('000' + x.toString(16)).slice(-4)).join(':'); }
function ipv6ZeroRuns(h) {
  const runs = [];
  for (let i = 0; i < 8; i++) {
    if (h[i] !== 0) continue;
    let j = i; while (j < 8 && h[j] === 0) j++;
    runs.push({ start: i, len: j - i }); i = j;
  }
  return runs;
}
function ipv6Join(parts, run) {
  if (!run) return parts.join(':');
  return parts.slice(0, run.start).join(':') + '::' + parts.slice(run.start + run.len).join(':');
}
function ipv6Compress(h) {
  const best = ipv6ZeroRuns(h).filter((r) => r.len >= 2).sort((a, b) => b.len - a.len || a.start - b.start)[0];
  return ipv6Join(h.map((x) => x.toString(16)), best);
}

lessonDef({
  id: 'itn12', topic: null, drill: 'ipv6', minutes: 16, genInQuiz: 3,
  title: T('IPv6 Addressing', 'IPv6-адресация', 'מיעון IPv6'),
  goal: T('Why IPv6, how addresses are written and shortened, the address types, and how hosts get an IPv6 address.',
    'Зачем IPv6, как записывать и сокращать адреса, типы адресов и как хосты получают IPv6-адрес.',
    'למה IPv6, איך כותבים ומקצרים כתובות, סוגי הכתובות ואיך מארחים מקבלים כתובת IPv6.'),
  sections: [
    lSec(['Why IPv6', 'Зачем IPv6', 'למה IPv6'],
      lP(['IPv4 has about 4.3 billion addresses and they have run out; NAT is only a workaround. IPv6 has 128-bit addresses — enough for every device. During the transition networks use dual stack (IPv4 and IPv6 together), tunneling (IPv6 inside IPv4) and translation (NAT64).',
        'В IPv4 около 4,3 млрд адресов, и они закончились; NAT — лишь обходной путь. В IPv6 адреса 128-битные — хватит на любое устройство. В переходный период используют dual stack (IPv4 и IPv6 вместе), туннелирование (IPv6 внутри IPv4) и трансляцию (NAT64).',
        'ב-IPv4 יש כ-4.3 מיליארד כתובות והן נגמרו; NAT הוא רק פתרון עוקף. ב-IPv6 הכתובות הן של 128 סיביות — מספיק לכל התקן. בתקופת המעבר משתמשים ב-dual stack ‏(IPv4 ו-IPv6 יחד), במנהור (IPv6 בתוך IPv4) ובתרגום (NAT64).'])),
    lSec(['Writing and shortening', 'Запись и сокращение', 'כתיבה וקיצור'],
      lP(['An IPv6 address is 8 hextets of 4 hex digits, separated by colons. Two rules make it shorter:',
        'IPv6-адрес — 8 хекстетов по 4 hex-цифры через двоеточие. Два правила делают его короче:',
        'כתובת IPv6 היא 8 קבוצות (hextets) של 4 ספרות הקסדצימליות, מופרדות בנקודתיים. שני כללים מקצרים אותה:']),
      lUL([
        ['Rule 1 — omit leading zeros in any hextet: 0db8 → db8, 0000 → 0.', 'Правило 1 — убрать ведущие нули в любом хекстете: 0db8 → db8, 0000 → 0.', 'כלל 1 — משמיטים אפסים מובילים בכל hextet: ‏0db8 → db8, ‏0000 → 0.'],
        ['Rule 2 — replace ONE run of two or more all-zero hextets with "::" (the longest run; if equal, the first). "::" may appear only once.', 'Правило 2 — заменить ОДНУ серию из двух и более нулевых хекстетов на «::» (самую длинную; при равенстве — первую). «::» можно использовать только один раз.', 'כלל 2 — מחליפים רצף אחד של שני hextets אפסיים או יותר ב-"::" (הרצף הארוך ביותר; אם שווים — הראשון). מותר להשתמש ב-"::" רק פעם אחת.'],
      ]),
      lCode('2001:0db8:0000:0000:0000:ff00:0042:8329\n2001:db8:0:0:0:ff00:42:8329      (rule 1)\n2001:db8::ff00:42:8329            (rule 2)'),
      lP(['The prefix length is written with a slash. Most LANs use /64: 64 bits of network prefix + 64 bits of interface ID.',
        'Длина префикса пишется через косую черту. В большинстве LAN — /64: 64 бита префикса сети + 64 бита идентификатора интерфейса.',
        'אורך הקידומת נכתב אחרי לוכסן. רוב רשתות ה-LAN משתמשות ב-‎/64: ‏64 סיביות קידומת רשת + 64 סיביות מזהה ממשק.'])),
    lSec(['Address types', 'Типы адресов', 'סוגי כתובות'],
      lTable([['Type', 'Тип', 'סוג'], ['Prefix', 'Префикс', 'קידומת'], ['Meaning', 'Назначение', 'משמעות']], [
        [['Global unicast (GUA)', 'Глобальный unicast (GUA)', 'Global unicast ‏(GUA)'], '2000::/3', ['Routable on the Internet, like a public IPv4 address', 'Маршрутизируется в интернете, как публичный IPv4', 'מנותבת באינטרנט, כמו כתובת IPv4 ציבורית']],
        [['Link-local (LLA)', 'Link-local (LLA)', 'Link-local ‏(LLA)'], 'fe80::/10', ['Only on the local link; every IPv6 interface has one; routers use it as next hop', 'Только на локальном канале; есть у каждого IPv6-интерфейса; маршрутизаторы используют его как next hop', 'רק בקטע המקומי; יש לכל ממשק IPv6; נתבים משתמשים בה כ-next hop']],
        [['Unique local', 'Уникальный локальный', 'Unique local'], 'fc00::/7 (fd…)', ['Private addressing, like 10.0.0.0/8', 'Частная адресация, как 10.0.0.0/8', 'מיעון פרטי, כמו 10.0.0.0/8']],
        ['Multicast', 'ff00::/8', ['One-to-group. ff02::1 = all nodes, ff02::2 = all routers. IPv6 has no broadcast.', 'Одному — группе. ff02::1 — все узлы, ff02::2 — все маршрутизаторы. Broadcast в IPv6 нет.', 'אחד לקבוצה. ‏ff02::1 = כל הצמתים, ‏ff02::2 = כל הנתבים. ב-IPv6 אין broadcast.']],
        ['Loopback', '::1', ['The host itself', 'Сам хост', 'המארח עצמו']],
      ])),
    lSec(['Getting an IPv6 address', 'Как получить IPv6-адрес', 'איך מקבלים כתובת IPv6'],
      lUL([
        ['Static: ipv6 address 2001:db8:acad:1::1/64 (plus ipv6 unicast-routing on a router).', 'Статически: ipv6 address 2001:db8:acad:1::1/64 (плюс ipv6 unicast-routing на маршрутизаторе).', 'סטטית: ipv6 address 2001:db8:acad:1::1/64 (ובנתב גם ipv6 unicast-routing).'],
        ['SLAAC: the host takes the prefix from the router\'s Router Advertisement and builds its own interface ID.', 'SLAAC: хост берёт префикс из Router Advertisement маршрутизатора и сам строит идентификатор интерфейса.', 'SLAAC: המארח לוקח את הקידומת מה-Router Advertisement של הנתב ובונה לבד את מזהה הממשק.'],
        ['Stateless DHCPv6: SLAAC for the address + DHCPv6 for DNS. Stateful DHCPv6: the server gives the address too.', 'Stateless DHCPv6: адрес по SLAAC + DHCPv6 для DNS. Stateful DHCPv6: сервер выдаёт и адрес.', 'Stateless DHCPv6: כתובת דרך SLAAC ו-DHCPv6 בשביל DNS. ‏Stateful DHCPv6: השרת נותן גם את הכתובת.'],
        ['EUI-64: interface ID from the MAC — split it, insert FFFE in the middle, flip the 7th bit. Or a random ID (privacy).', 'EUI-64: идентификатор из MAC — разделить его, вставить FFFE посередине, инвертировать 7-й бит. Или случайный ID (приватность).', 'EUI-64: מזהה ממשק מתוך ה-MAC — מפצלים, מכניסים FFFE באמצע והופכים את הסיבית השביעית. או מזהה אקראי (פרטיות).'],
      ])),
  ],
  quiz: [
    lQ(['How many bits is an IPv6 address?', 'Сколько бит в IPv6-адресе?', 'כמה סיביות יש בכתובת IPv6?'], ['128', '64', '32', '48'], 0,
      ['8 hextets × 16 bits = 128.', '8 хекстетов × 16 бит = 128.', '‏8 hextets × ‏16 סיביות = 128.']),
    lQ(['How many times can "::" appear in one address?', 'Сколько раз «::» может встречаться в одном адресе?', 'כמה פעמים יכול "::" להופיע בכתובת אחת?'], [['Once', 'Один раз', 'פעם אחת'], ['Twice', 'Два раза', 'פעמיים'], ['Any number', 'Сколько угодно', 'כמה שרוצים'], ['Never', 'Ни разу', 'אף פעם']], 0,
      ['With two "::" nobody could tell how many zeros each one hides.', 'С двумя «::» нельзя понять, сколько нулей скрыто в каждом.', 'עם שני "::" אי אפשר לדעת כמה אפסים מסתתרים בכל אחד.']),
    lQ(['Which prefix is a link-local address?', 'Какой префикс у link-local адреса?', 'מהי הקידומת של כתובת link-local?'], ['fe80::/10', '2000::/3', 'ff00::/8', 'fc00::/7'], 0,
      ['fe80::/10 — every IPv6 interface has one.', 'fe80::/10 — есть у каждого IPv6-интерфейса.', 'fe80::/10 — יש אחת לכל ממשק IPv6.']),
    lQ(['What replaces broadcast in IPv6?', 'Что заменяет broadcast в IPv6?', 'מה מחליף את ה-broadcast ב-IPv6?'], [['Multicast (e.g. ff02::1)', 'Multicast (например, ff02::1)', 'Multicast (למשל ff02::1)'], ['Anycast only', 'Только anycast', 'רק anycast'], ['ARP', 'ARP', 'ARP'], ['Nothing — IPv6 uses broadcast', 'Ничего — в IPv6 есть broadcast', 'כלום — ב-IPv6 יש broadcast']], 0,
      ['IPv6 has no broadcast at all.', 'Broadcast в IPv6 нет вообще.', 'ב-IPv6 אין broadcast בכלל.']),
    lQ(['What is the usual prefix length of an IPv6 LAN?', 'Какая обычная длина префикса IPv6 в LAN?', 'מהו אורך הקידומת הרגיל ב-LAN של IPv6?'], ['/64', '/24', '/48', '/128'], 0,
      ['64 bits network + 64 bits interface ID; SLAAC needs /64.', '64 бита сети + 64 бита интерфейса; SLAAC требует /64.', '‏64 סיביות רשת + 64 סיביות מזהה ממשק; SLAAC דורש ‎/64.']),
    lQ(['With SLAAC, where does the host get its prefix?', 'Откуда хост при SLAAC берёт префикс?', 'מאיפה מארח מקבל את הקידומת ב-SLAAC?'],
      [['From the router\'s Router Advertisement', 'Из Router Advertisement маршрутизатора', 'מה-Router Advertisement של הנתב'], ['From a DHCPv4 server', 'От DHCPv4-сервера', 'משרת DHCPv4'], ['From DNS', 'От DNS', 'מ-DNS'], ['It invents it', 'Придумывает сам', 'ממציא אותה לבד']], 0,
      ['The RA carries the prefix; the host builds the interface ID itself.', 'В RA есть префикс; идентификатор интерфейса хост строит сам.', 'ה-RA נושא את הקידומת; את מזהה הממשק המארח בונה לבד.']),
    lQ(['What does EUI-64 insert in the middle of the MAC address?', 'Что EUI-64 вставляет в середину MAC-адреса?', 'מה EUI-64 מכניס באמצע כתובת ה-MAC?'], ['FFFE', 'FFFF', '0000', 'FE80'], 0,
      ['It also flips the 7th bit of the first byte.', 'А ещё инвертирует 7-й бит первого байта.', 'וגם הופך את הסיבית השביעית בבית הראשון.']),
  ],
  gen: [
    function genV6Compress(rng) {
      const h = ipv6Rand(rng), right = ipv6Compress(h), parts = h.map((x) => x.toString(16));
      const runs = ipv6ZeroRuns(h), best = runs.filter((r) => r.len >= 2).sort((a, b) => b.len - a.len || a.start - b.start)[0];
      const wrong = [];
      const other = runs.find((r) => r !== best);
      if (other) { // два «::» — недопустимо
        const p2 = parts.slice(); const [a, b] = [best, other].sort((x, y) => x.start - y.start);
        wrong.push(p2.slice(0, a.start).join(':') + '::' + p2.slice(a.start + a.len, b.start).join(':') + '::' + p2.slice(b.start + b.len).join(':'));
        wrong.push(ipv6Join(parts, other)); // сжата не самая длинная серия
      }
      wrong.push(ipv6Join(h.map((x) => (x ? x.toString(16).replace(/0+$/, '') || '0' : '0')), best)); // убраны нули в конце, а не в начале
      wrong.push(parts.filter((x, i) => !(i >= best.start && i < best.start + best.len)).join(':')); // нули выброшены без «::»
      wrong.push(ipv6Join(h.map((x) => ('000' + x.toString(16)).slice(-4)), best)); // не убраны ведущие нули
      return lGen(T('What is the shortest correct form of ' + ipv6Full(h) + '?', 'Какая самая короткая правильная запись ' + ipv6Full(h) + '?', 'מהי הצורה המקוצרת הנכונה של ' + ipv6Full(h) + '?'),
        right, wrong,
        T('Drop leading zeros in every hextet, then replace the longest run of zero hextets with "::" (only once).', 'Убираем ведущие нули в каждом хекстете, затем самую длинную серию нулевых хекстетов заменяем на «::» (только один раз).', 'משמיטים אפסים מובילים בכל hextet, ואז מחליפים את הרצף הארוך ביותר של hextets אפסיים ב-"::" (פעם אחת בלבד).'));
    },
    function genV6Expand(rng) {
      const h = ipv6Rand(rng), short = ipv6Compress(h), full = ipv6Full(h);
      const runs = ipv6ZeroRuns(h).filter((r) => r.len >= 2).sort((a, b) => b.len - a.len || a.start - b.start), best = runs[0];
      const withZeros = (n) => { const a = h.slice(0, best.start).concat(Array(n).fill(0)).concat(h.slice(best.start + best.len)); return a.map((x) => ('000' + x.toString(16)).slice(-4)).join(':'); };
      const trailing = h.map((x) => (x.toString(16) + '000').slice(0, 4)).join(':');
      return lGen(T('Write ' + short + ' in full (all 8 hextets, 4 digits each).', 'Запишите ' + short + ' полностью (все 8 хекстетов по 4 цифры).', 'כתבו את ' + short + ' במלואה (כל 8 ה-hextets, 4 ספרות בכל אחד).'),
        full, [withZeros(best.len + 1), withZeros(best.len - 1), trailing, withZeros(best.len + 2)],
        T('"::" hides ' + best.len + ' zero hextets, because the address must have 8. Leading zeros go back in front.', '«::» скрывает ' + best.len + ' нулевых хекстета, потому что всего их должно быть 8. Ведущие нули возвращаются в начало.', '"::" מסתיר ' + best.len + ' hextets של אפסים, כי בכתובת חייבים להיות 8. האפסים המובילים חוזרים לפני הספרות.'));
    },
    function genV6Type(rng) {
      const g = () => rng.int(0, 0xffff).toString(16);
      const kinds = [
        { a: () => '2001:db8:' + g() + ':' + g() + '::' + g(), t: T('Global unicast (GUA)', 'Глобальный unicast (GUA)', 'Global unicast ‏(GUA)') },
        { a: () => 'fe80::' + g() + ':' + g() + ':' + g() + ':' + g(), t: T('Link-local', 'Link-local', 'Link-local') },
        { a: () => rng.pick(['ff02::1', 'ff02::2', 'ff02::5', 'ff05::1:3', 'ff02::1:ff' + g().slice(0, 2) + ':' + g()]), t: T('Multicast', 'Multicast', 'Multicast') },
        { a: () => 'fd' + ('0' + rng.int(0, 255).toString(16)).slice(-2) + ':' + g() + ':' + g() + '::' + g(), t: T('Unique local', 'Уникальный локальный', 'Unique local') },
      ];
      const k = rng.int(0, kinds.length - 1), addr = kinds[k].a();
      return lGen(T('What type of IPv6 address is ' + addr + '?', 'Какой это тип IPv6-адреса: ' + addr + '?', 'איזה סוג כתובת IPv6 היא ' + addr + '?'),
        kinds[k].t, kinds.filter((_, i) => i !== k).map((x) => x.t),
        T('2000::/3 = GUA, fe80::/10 = link-local, ff00::/8 = multicast, fc00::/7 (fd…) = unique local.', '2000::/3 — GUA, fe80::/10 — link-local, ff00::/8 — multicast, fc00::/7 (fd…) — уникальный локальный.', '‏2000::/3 = GUA, ‏fe80::/10 = link-local, ‏ff00::/8 = multicast, ‏fc00::/7 ‏(fd…) = unique local.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn13', topic: 'basics', minutes: 10,
  title: T('ICMP', 'ICMP', 'ICMP'),
  goal: T('The ICMP messages, how ping and traceroute work and how to read their output.',
    'Сообщения ICMP, как работают ping и traceroute и как читать их вывод.',
    'הודעות ICMP, איך ping ו-traceroute עובדים ואיך לקרוא את הפלט שלהם.'),
  sections: [
    lSec(['ICMP messages', 'Сообщения ICMP', 'הודעות ICMP'],
      lP(['ICMP reports errors and tests connectivity. It does not make IP reliable — it only tells what went wrong.',
        'ICMP сообщает об ошибках и проверяет связность. Надёжным IP он не делает — он лишь сообщает, что пошло не так.',
        'ICMP מדווח על שגיאות ובודק קישוריות. הוא לא הופך את IP לאמין — הוא רק מספר מה השתבש.']),
      lTable([['Message', 'Сообщение', 'הודעה'], ['When', 'Когда', 'מתי']], [
        ['Echo Request / Echo Reply', ['ping: "are you there?" / "yes"', 'ping: «ты здесь?» / «да»', 'ping: "אתה שם?" / "כן"']],
        ['Destination Unreachable', ['No route, host down, port closed (codes: 0 net, 1 host, 2 protocol, 3 port)', 'Нет маршрута, хост недоступен, порт закрыт (коды: 0 сеть, 1 хост, 2 протокол, 3 порт)', 'אין נתיב, מארח לא זמין, פורט סגור (קודים: 0 רשת, 1 מארח, 2 פרוטוקול, 3 פורט)']],
        ['Time Exceeded', ['TTL reached 0 on the way', 'TTL стал 0 по дороге', 'ה-TTL הגיע ל-0 בדרך']],
        ['ICMPv6 RS / RA / NS / NA', ['Router and neighbor discovery in IPv6', 'Поиск маршрутизаторов и соседей в IPv6', 'גילוי נתבים ושכנים ב-IPv6']],
      ])),
    lSec(['Ping step by step', 'Ping шаг за шагом', 'ping שלב אחר שלב'],
      lUL([
        ['ping 127.0.0.1 — tests the TCP/IP stack of the host itself.', 'ping 127.0.0.1 — проверка стека TCP/IP самого хоста.', 'ping 127.0.0.1 — בודק את מחסנית TCP/IP של המארח עצמו.'],
        ['ping the default gateway — tests the local network.', 'ping шлюза — проверка локальной сети.', 'ping לשער ברירת המחדל — בודק את הרשת המקומית.'],
        ['ping a remote host — tests the whole path and the way back.', 'ping удалённого хоста — проверка всего пути туда и обратно.', 'ping למארח מרוחק — בודק את כל הנתיב הלוך וחזור.'],
      ]),
      lTable([['Cisco ping symbol', 'Символ ping Cisco', 'סימן ב-ping של Cisco'], ['Meaning', 'Значение', 'משמעות']], [
        ['!', ['Echo reply received', 'Ответ получен', 'התקבלה תשובה']],
        ['.', ['Timed out — no reply', 'Тайм-аут — ответа нет', 'פג הזמן — אין תשובה']],
        ['U', ['Destination unreachable received', 'Получено «получатель недоступен»', 'התקבלה הודעת יעד לא זמין']],
      ])),
    lSec(['Traceroute', 'Traceroute', 'Traceroute'],
      lP(['traceroute sends packets with TTL = 1, 2, 3… Each router that drops a packet at TTL 0 answers with Time Exceeded — so you see every hop and its round-trip time. "*" means no answer from that hop.',
        'traceroute отправляет пакеты с TTL = 1, 2, 3… Каждый маршрутизатор, у которого TTL стал 0, отвечает Time Exceeded — так видны все переходы и время отклика. «*» — этот переход не ответил.',
        'traceroute שולח חבילות עם TTL = 1, 2, 3… כל נתב שזורק חבילה כשה-TTL מגיע ל-0 עונה ב-Time Exceeded — וכך רואים כל קפיצה ואת זמן הסבב שלה. "*" פירושו שהקפיצה לא ענתה.']),
      lCode('C:\\> tracert 192.168.30.10        (Windows)\nR1# traceroute 192.168.30.10      (Cisco, Linux)\n  1   1 ms   192.168.10.1\n  2   2 ms   10.0.0.2\n  3   *      *    Request timed out.'),
      lTip(['Where the list stops is where to look: check that router\'s routes and the way back.', 'Где список обрывается — там и ищите: проверьте маршруты этого маршрутизатора и обратный путь.', 'איפה שהרשימה נעצרת — שם מחפשים: בודקים את הנתיבים של הנתב הזה ואת הדרך חזרה.'])),
  ],
  quiz: [
    lQ(['Which ICMP messages does ping use?', 'Какие сообщения ICMP использует ping?', 'באילו הודעות ICMP משתמש ping?'], ['Echo Request / Echo Reply', 'Time Exceeded', 'Destination Unreachable', 'Router Advertisement'], 0,
      ['ping = echo request, the answer is echo reply.', 'ping — echo request, ответ — echo reply.', 'ping = ‏echo request, והתשובה היא echo reply.']),
    lQ(['Which ICMP message makes traceroute work?', 'Благодаря какому сообщению ICMP работает traceroute?', 'בזכות איזו הודעת ICMP עובד traceroute?'], ['Time Exceeded', 'Echo Reply', 'Redirect', 'Neighbor Advertisement'], 0,
      ['Each router answers Time Exceeded when TTL hits 0.', 'Каждый маршрутизатор отвечает Time Exceeded, когда TTL становится 0.', 'כל נתב עונה Time Exceeded כשה-TTL מגיע ל-0.']),
    lQ(['What does "U" mean in Cisco ping output?', 'Что значит «U» в выводе ping на Cisco?', 'מה פירוש "U" בפלט של ping ב-Cisco?'],
      [['Destination unreachable was received', 'Получено сообщение «получатель недоступен»', 'התקבלה הודעת יעד לא זמין'], ['Success', 'Успех', 'הצלחה'], ['Timed out', 'Тайм-аут', 'פג זמן'], ['Unknown command', 'Неизвестная команда', 'פקודה לא מוכרת']], 0,
      ['! = reply, . = timeout, U = unreachable.', '! — ответ, . — тайм-аут, U — недоступен.', '! = תשובה, . = פג זמן, ‏U = לא זמין.']),
    lQ(['What does a successful "ping 127.0.0.1" prove?', 'Что доказывает успешный «ping 127.0.0.1»?', 'מה מוכיח "ping 127.0.0.1" שהצליח?'],
      [['The host\'s TCP/IP stack works', 'Стек TCP/IP хоста работает', 'מחסנית TCP/IP של המארח עובדת'], ['The cable works', 'Кабель исправен', 'הכבל תקין'], ['The gateway is reachable', 'Шлюз доступен', 'השער זמין'], ['DNS works', 'DNS работает', 'DNS עובד']], 0,
      ['Loopback never leaves the host.', 'Loopback не выходит за пределы хоста.', 'Loopback לא יוצא מהמארח.']),
    lQ(['In traceroute output a line shows "* * *". What does it mean?', 'В выводе traceroute строка «* * *». Что это значит?', 'בפלט של traceroute מופיעה שורה "* * *". מה זה אומר?'],
      [['That hop did not answer in time', 'Этот переход не ответил вовремя', 'הקפיצה הזו לא ענתה בזמן'], ['The destination was reached', 'Получатель достигнут', 'הגענו ליעד'], ['The packet was encrypted', 'Пакет зашифрован', 'החבילה הוצפנה'], ['TTL was too large', 'TTL слишком большой', 'ה-TTL היה גדול מדי']], 0,
      ['Look at the device after the last hop that answered.', 'Смотрите на устройство после последнего ответившего перехода.', 'בודקים את ההתקן שאחרי הקפיצה האחרונה שענתה.']),
    lQ(['Which Destination Unreachable code means "port unreachable"?', 'Какой код Destination Unreachable означает «порт недоступен»?', 'איזה קוד של Destination Unreachable פירושו "פורט לא זמין"?'], ['3', '0', '1', '2'], 0,
      ['0 net, 1 host, 2 protocol, 3 port.', '0 — сеть, 1 — хост, 2 — протокол, 3 — порт.', '‏0 רשת, ‏1 מארח, ‏2 פרוטוקול, ‏3 פורט.']),
    lQ(['Which ICMPv6 message does a router send to announce the prefix?', 'Каким сообщением ICMPv6 маршрутизатор объявляет префикс?', 'באיזו הודעת ICMPv6 נתב מכריז על הקידומת?'], ['Router Advertisement (RA)', 'Router Solicitation (RS)', 'Neighbor Solicitation (NS)', 'Echo Reply'], 0,
      ['Hosts ask with RS, routers answer (and send periodically) RA.', 'Хосты спрашивают RS, маршрутизаторы отвечают (и периодически шлют) RA.', 'מארחים שואלים ב-RS, ונתבים עונים (ושולחים מדי פעם) RA.']),
  ],
});
