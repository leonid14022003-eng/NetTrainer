'use strict';
// SRWE (остальные модули): базовая настройка, коммутация, STP, EtherChannel, SLAAC/DHCPv6, FHRP,
// безопасность LAN, защита коммутатора, WLAN, принципы маршрутизации, неисправности статических маршрутов.
// Загружается после glossary.js и interview.js — в конце файла термины G(...) и вопросы IV(...).

// Стоимость STP (короткий метод 802.1D) по скорости канала.
const STP_COSTS = { '10 Mbps': 100, '100 Mbps': 19, '1 Gbps': 4, '10 Gbps': 2 };
const STP_PORT_PREFIX = { '10 Mbps': 'E', '100 Mbps': 'Fa', '1 Gbps': 'G', '10 Gbps': 'Te' };

lessonDef({
  id: 'srwe01', topic: 'device', minutes: 15,
  title: T('Basic Device Configuration', 'Базовая настройка устройств', 'הגדרה בסיסית של התקנים'),
  goal: T('How a switch boots, the management SVI and default gateway, port settings and errors, SSH, and the everyday router configuration and show commands.',
    'Как загружается коммутатор, SVI управления и шлюз по умолчанию, настройки и ошибки портов, SSH, а также повседневная настройка маршрутизатора и команды show.',
    'איך מתג עולה, ממשק SVI לניהול ושער ברירת מחדל, הגדרות ושגיאות בפורטים, SSH, וההגדרה היומיומית של נתב ופקודות show.'),
  sections: [
    lSec(['How a switch boots', 'Как загружается коммутатор', 'איך מתג עולה'],
      lUL([
        ['POST — the power-on self-test checks the CPU, RAM and flash.', 'POST — самотестирование при включении проверяет CPU, RAM и flash.', 'POST — בדיקה עצמית בהדלקה שבודקת את ה-CPU, ה-RAM וה-flash.'],
        ['The boot loader starts, initializes flash and loads the IOS image: the one in the BOOT variable, or the first executable image in flash.', 'Запускается загрузчик (boot loader), инициализирует flash и загружает образ IOS: указанный в переменной BOOT или первый исполняемый образ во flash.', 'ה-boot loader עולה, מאתחל את ה-flash וטוען את קובץ ה-IOS: זה שמוגדר במשתנה BOOT, או הקובץ הראשון שאפשר להריץ ב-flash.'],
        ['IOS loads the startup-config from NVRAM into RAM as the running-config.', 'IOS загружает startup-config из NVRAM в RAM как running-config.', 'ה-IOS טוען את ה-startup-config מ-NVRAM ל-RAM בתור running-config.'],
      ]),
      lCode('S1(config)# boot system flash:/c2960-lanbasek9-mz.150-2.SE/c2960-lanbasek9-mz.150-2.SE.bin\nS1# show boot', ['Choose which IOS image boots next time', 'Выбор образа IOS для следующей загрузки', 'בחירת קובץ ה-IOS שיעלה בפעם הבאה']),
      lTip(['Lost password or broken IOS? Hold the Mode button while powering on: you get the "switch:" boot loader prompt and can recover the device.', 'Забыли пароль или IOS повреждён? Держите кнопку Mode при включении — появится приглашение загрузчика «switch:», и устройство можно восстановить.', 'שכחת סיסמה או שה-IOS פגום? מחזיקים את כפתור Mode בזמן ההדלקה — מקבלים את שורת ה-boot loader ‏"switch:" ואפשר לשחזר את ההתקן.'])),
    lSec(['Management access: SVI and default gateway', 'Доступ для управления: SVI и шлюз по умолчанию', 'גישה לניהול: SVI ושער ברירת מחדל'],
      lP(['A Layer 2 switch has no IP on its ports. To manage it over the network you give an IP to a switch virtual interface (SVI) in the management VLAN, and a default gateway so it can answer admins in other networks.',
        'На портах коммутатора 2-го уровня нет IP. Чтобы управлять им по сети, IP назначают виртуальному интерфейсу (SVI) в VLAN управления и задают шлюз по умолчанию, чтобы коммутатор мог отвечать администраторам из других сетей.',
        'לפורטים של מתג שכבה 2 אין כתובת IP. כדי לנהל אותו דרך הרשת נותנים IP לממשק וירטואלי (SVI) ב-VLAN הניהול, ומגדירים שער ברירת מחדל כדי שהמתג יוכל לענות למנהלים מרשתות אחרות.']),
      lCode('S1(config)# interface vlan 99\nS1(config-if)# ip address 172.17.99.11 255.255.255.0\nS1(config-if)# ipv6 address 2001:db8:acad:99::11/64\nS1(config-if)# no shutdown\nS1(config-if)# exit\nS1(config)# ip default-gateway 172.17.99.1\nS1# show ip interface brief'),
      lUL([
        ['An SVI is shut down by default, so "no shutdown" is required.', 'SVI по умолчанию выключен, поэтому нужна команда «no shutdown».', 'ממשק SVI כבוי כברירת מחדל, ולכן צריך "no shutdown".'],
        ['The SVI is up/up only when at least one port in that VLAN is up (or a trunk carries it).', 'SVI в состоянии up/up, только если хотя бы один порт этого VLAN поднят (или VLAN идёт по trunk).', 'ה-SVI במצב up/up רק אם לפחות פורט אחד ב-VLAN הזה פעיל (או שה-VLAN עובר ב-trunk).'],
        ['ip default-gateway is a global command, not an interface command.', 'ip default-gateway — глобальная команда, а не команда интерфейса.', 'ip default-gateway היא פקודה גלובלית ולא פקודת ממשק.'],
      ])),
    lSec(['Switch ports: duplex, speed and errors', 'Порты коммутатора: дуплекс, скорость, ошибки', 'פורטים במתג: דופלקס, מהירות ושגיאות'],
      lCode('S1(config)# interface fa0/1\nS1(config-if)# duplex full\nS1(config-if)# speed 100\nS1(config-if)# mdix auto\nS1# show interfaces fa0/1'),
      lTable([['Counter in show interfaces', 'Счётчик в show interfaces', 'מונה ב-show interfaces'], ['Usual cause', 'Обычная причина', 'הסיבה הנפוצה']], [
        [['Input errors, CRC', 'Input errors, CRC', 'Input errors, CRC'], ['Bad or too long cable, electrical interference', 'Плохой или слишком длинный кабель, помехи', 'כבל פגום או ארוך מדי, הפרעות חשמליות']],
        [['Runts, giants', 'Runts, giants', 'Runts, giants'], ['Faulty NIC, collisions, MTU mismatch', 'Неисправная сетевая карта, коллизии, разный MTU', 'כרטיס רשת תקול, התנגשויות, MTU לא תואם']],
        [['Late collisions', 'Поздние коллизии (late collisions)', 'התנגשויות מאוחרות (late collisions)'], ['Duplex mismatch or cable too long', 'Несовпадение дуплекса или слишком длинный кабель', 'אי-התאמת דופלקס או כבל ארוך מדי']],
      ]),
      lTip(['Auto-negotiation on both ends is the safest choice. If you hard-set speed and duplex, set them the same on both ends.', 'Автосогласование на обоих концах — самый надёжный вариант. Если задаёте скорость и дуплекс вручную, задайте одинаково с обеих сторон.', 'משא ומתן אוטומטי בשני הצדדים הוא הבחירה הבטוחה. אם קובעים מהירות ודופלקס ידנית — קובעים אותו דבר בשני הצדדים.'])),
    lSec(['Secure remote access with SSH', 'Безопасный удалённый доступ по SSH', 'גישה מרחוק מאובטחת עם SSH'],
      lCode('S1(config)# hostname S1\nS1(config)# ip domain-name netacad.com\nS1(config)# crypto key generate rsa general-keys modulus 2048\nS1(config)# ip ssh version 2\nS1(config)# username admin secret Cisco123!\nS1(config)# line vty 0 15\nS1(config-line)# transport input ssh\nS1(config-line)# login local\nS1# show ip ssh'),
      lUL([
        ['RSA keys need a hostname (not the default "Switch") and a domain name.', 'Для ключей RSA нужны имя устройства (не стандартное «Switch») и доменное имя.', 'מפתחות RSA דורשים hostname (לא ברירת המחדל "Switch") ושם דומיין.'],
        ['"login local" checks the local username database; "transport input ssh" blocks Telnet.', '«login local» проверяет локальную базу пользователей; «transport input ssh» запрещает Telnet.', '"login local" בודק מול מאגר המשתמשים המקומי; ‏"transport input ssh" חוסם Telnet.'],
        ['SSH uses TCP 22 and encrypts everything; Telnet (TCP 23) sends passwords in clear text.', 'SSH использует TCP 22 и всё шифрует; Telnet (TCP 23) передаёт пароли открытым текстом.', 'SSH משתמש ב-TCP 22 ומצפין הכול; Telnet ‏(TCP 23) שולח סיסמאות כטקסט גלוי.'],
      ])),
    lSec(['Basic router configuration and verification', 'Базовая настройка и проверка маршрутизатора', 'הגדרה בסיסית של נתב ובדיקה'],
      lCode('R1(config)# hostname R1\nR1(config)# enable secret class\nR1(config)# service password-encryption\nR1(config)# banner motd #Authorized access only#\nR1(config)# ipv6 unicast-routing\nR1(config)# interface g0/0/0\nR1(config-if)# description Link to LAN\nR1(config-if)# ip address 192.168.10.1 255.255.255.0\nR1(config-if)# ipv6 address 2001:db8:acad:10::1/64\nR1(config-if)# no shutdown\nR1# copy running-config startup-config'),
      lUL([
        ['show ip interface brief / show ipv6 interface brief — addresses and up/down status.', 'show ip interface brief / show ipv6 interface brief — адреса и состояние up/down.', 'show ip interface brief / show ipv6 interface brief — כתובות ומצב up/down.'],
        ['show ip route / show ipv6 route — the routing table.', 'show ip route / show ipv6 route — таблица маршрутизации.', 'show ip route / show ipv6 route — טבלת הניתוב.'],
        ['Filter long output: | include, | exclude, | begin, | section. Example: show running-config | section interface.', 'Фильтр длинного вывода: | include, | exclude, | begin, | section. Пример: show running-config | section interface.', 'סינון פלט ארוך: ‏| include, ‏| exclude, ‏| begin, ‏| section. דוגמה: show running-config | section interface.'],
        ['show history and "terminal history size 200" — the command history buffer.', 'show history и «terminal history size 200» — буфер истории команд.', 'show history ו-"terminal history size 200" — היסטוריית הפקודות.'],
      ])),
  ],
  quiz: [
    lQ(['Which command lets a Layer 2 switch be managed from a PC in another network?', 'Какая команда позволяет управлять коммутатором 2-го уровня с ПК из другой сети?', 'איזו פקודה מאפשרת לנהל מתג שכבה 2 ממחשב ברשת אחרת?'], ['ip default-gateway 172.17.99.1', 'ip route 0.0.0.0 0.0.0.0 vlan 99', 'default-router 172.17.99.1', 'ip helper-address 172.17.99.1'], 0,
      ['The switch needs a gateway to reply to hosts outside its own subnet.', 'Коммутатору нужен шлюз, чтобы отвечать хостам вне своей подсети.', 'המתג צריך שער כדי לענות למארחים מחוץ לתת-הרשת שלו.']),
    lQ(['interface vlan 99 has an IP address but shows "administratively down". What is missing?', 'На interface vlan 99 есть IP-адрес, но он «administratively down». Чего не хватает?', 'ל-interface vlan 99 יש כתובת IP אבל הוא במצב "administratively down". מה חסר?'], [['no shutdown on the SVI', 'no shutdown на SVI', 'no shutdown על ה-SVI'], ['ip routing', 'ip routing', 'ip routing'], ['A trunk to the router', 'Trunk к маршрутизатору', 'Trunk לנתב'], ['A second IP address', 'Второй IP-адрес', 'כתובת IP שנייה']], 0,
      ['SVIs are shut down by default.', 'SVI по умолчанию выключены.', 'ממשקי SVI כבויים כברירת מחדל.']),
    lQ(['What must be set before "crypto key generate rsa" works?', 'Что нужно задать, чтобы сработала «crypto key generate rsa»?', 'מה צריך להגדיר לפני ש-"crypto key generate rsa" יעבוד?'], [['A hostname and an IP domain name', 'Имя устройства и доменное имя', 'Hostname ושם דומיין'], ['Only the enable secret', 'Только enable secret', 'רק enable secret'], ['A banner', 'Баннер', 'באנר'], ['A default gateway', 'Шлюз по умолчанию', 'שער ברירת מחדל']], 0,
      ['The key name is built from the hostname and the domain name.', 'Имя ключа строится из имени устройства и домена.', 'שם המפתח נבנה מה-hostname ומשם הדומיין.']),
    lQ(['Which VTY command allows SSH and blocks Telnet?', 'Какая команда на VTY разрешает SSH и запрещает Telnet?', 'איזו פקודה ב-VTY מאפשרת SSH וחוסמת Telnet?'], ['transport input ssh', 'ip ssh version 2', 'login local', 'service password-encryption'], 0,
      ['ip ssh version 2 only chooses the SSH version.', 'ip ssh version 2 лишь выбирает версию SSH.', 'ip ssh version 2 רק בוחרת את גרסת ה-SSH.']),
    lQ(['show interfaces shows many late collisions. Most likely cause?', 'show interfaces показывает много поздних коллизий. Наиболее вероятная причина?', 'ב-show interfaces יש הרבה late collisions. מה הסיבה הסבירה?'], [['A duplex mismatch', 'Несовпадение дуплекса', 'אי-התאמת דופלקס'], ['Wrong VLAN', 'Неверный VLAN', 'VLAN שגוי'], ['A missing default gateway', 'Нет шлюза по умолчанию', 'חסר שער ברירת מחדל'], ['Too many MAC addresses', 'Слишком много MAC-адресов', 'יותר מדי כתובות MAC']], 0,
      ['A cable that is too long can also cause them.', 'Их также может вызывать слишком длинный кабель.', 'גם כבל ארוך מדי יכול לגרום לזה.']),
    lQ(['CRC and input errors keep growing on a port. What do you check first?', 'На порту растут ошибки CRC и input errors. Что проверить первым?', 'שגיאות CRC ו-input errors גדלות בפורט. מה בודקים קודם?'], [['The cable and sources of interference', 'Кабель и источники помех', 'את הכבל ומקורות הפרעה'], ['The routing table', 'Таблицу маршрутизации', 'את טבלת הניתוב'], ['The DHCP pool', 'DHCP-пул', 'את מאגר ה-DHCP'], ['The enable password', 'Пароль enable', 'את סיסמת ה-enable']], 0,
      ['These are physical-layer problems.', 'Это проблемы физического уровня.', 'אלה בעיות של השכבה הפיזית.']),
    lQ(['Which filter shows output starting from the first matching line?', 'Какой фильтр показывает вывод начиная с первой совпавшей строки?', 'איזה מסנן מציג את הפלט החל מהשורה הראשונה שמתאימה?'], ['| begin', '| include', '| exclude', '| count'], 0,
      ['include shows only matching lines, exclude hides them.', 'include показывает только совпавшие строки, exclude их скрывает.', 'include מציג רק שורות מתאימות, ‏exclude מסתיר אותן.']),
    lQ(['The BOOT variable is not set. Which IOS does the switch load?', 'Переменная BOOT не задана. Какой IOS загрузит коммутатор?', 'המשתנה BOOT לא מוגדר. איזה IOS המתג יטען?'], [['The first executable image in flash', 'Первый исполняемый образ во flash', 'את הקובץ הראשון שאפשר להריץ ב-flash'], ['The image from a TFTP server', 'Образ с TFTP-сервера', 'קובץ משרת TFTP'], ['The newest image in NVRAM', 'Самый новый образ в NVRAM', 'את הקובץ החדש ביותר ב-NVRAM'], ['None — it stops at ROMMON', 'Никакой — остановится в ROMMON', 'אף אחד — הוא נעצר ב-ROMMON']], 0,
      ['It searches flash for a bootable image.', 'Он ищет во flash загрузочный образ.', 'הוא מחפש ב-flash קובץ שאפשר לאתחל ממנו.']),
  ],
  gen: [
    function genSwitchMgmt(rng) {
      const v = rng.pick([1, 10, 20, 99, 100, 200]), len = rng.pick([24, 24, 25, 26, 27]), size = Math.pow(2, 32 - len);
      const base = ipToInt('172.' + rng.int(16, 31) + '.' + rng.int(0, 255) + '.0') + size * rng.int(0, 256 / size - 1);
      const gw = intToIp(base + 1), ip = intToIp(base + rng.int(2, size - 2)), m = lenToMask(len);
      const cfg = (iface, addr, mask, noShut, gate) => 'interface ' + iface + '\n ip address ' + addr + ' ' + mask + (noShut ? '\n no shutdown' : '') + '\nip default-gateway ' + gate;
      return lGen(T('Switch S1 must be managed at ' + ip + '/' + len + ' in VLAN ' + v + ', gateway ' + gw + '. Which configuration is correct?',
        'Коммутатором S1 нужно управлять по адресу ' + ip + '/' + len + ' в VLAN ' + v + ', шлюз ' + gw + '. Какая конфигурация верна?',
        'צריך לנהל את המתג S1 בכתובת ' + ip + '/' + len + ' ב-VLAN ' + v + ', עם שער ' + gw + '. איזו תצורה נכונה?'),
        cfg('vlan ' + v, ip, m, true, gw),
        rng.shuffle([cfg('vlan ' + v, ip, lWild(len), true, gw), cfg('vlan ' + v, ip, m, false, gw), cfg('fa0/1', ip, m, true, gw), cfg('vlan ' + v, gw, m, true, ip)]),
        T('The IP goes on the SVI (interface vlan ' + v + ') with the subnet mask ' + m + ', the SVI needs "no shutdown", and the gateway is set globally.',
          'IP назначается на SVI (interface vlan ' + v + ') с маской ' + m + ', SVI нужен «no shutdown», а шлюз задаётся глобально.',
          'ה-IP מוגדר על ה-SVI ‏(interface vlan ' + v + ') עם המסכה ' + m + ', ה-SVI צריך "no shutdown", והשער מוגדר גלובלית.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'srwe02', topic: 'basics', drill: 'switching', minutes: 12,
  title: T('Switching Concepts', 'Принципы коммутации', 'עקרונות מיתוג'),
  goal: T('How a switch forwards frames, store-and-forward vs cut-through, collision and broadcast domains, and what helps against congestion.',
    'Как коммутатор пересылает кадры, store-and-forward и cut-through, домены коллизий и широковещательные домены и что помогает против перегрузки.',
    'איך מתג מעביר מסגרות, store-and-forward מול cut-through, תחומי התנגשות ותחומי broadcast, ומה עוזר נגד עומס.'),
  sections: [
    lSec(['Frame forwarding', 'Пересылка кадров', 'העברת מסגרות'],
      lP(['A frame enters a switch on the ingress port and leaves on the egress port. The switch learns the SOURCE MAC of every frame and forwards by the DESTINATION MAC using its MAC address table (also called the CAM table).',
        'Кадр входит в коммутатор через входной (ingress) порт и выходит через выходной (egress). Коммутатор запоминает MAC ИСТОЧНИКА каждого кадра и пересылает по MAC ПОЛУЧАТЕЛЯ, используя таблицу MAC-адресов (её ещё называют CAM-таблицей).',
        'מסגרת נכנסת למתג בפורט הכניסה (ingress) ויוצאת בפורט היציאה (egress). המתג לומד את כתובת ה-MAC של המקור של כל מסגרת ומעביר לפי כתובת ה-MAC של היעד, בעזרת טבלת כתובות ה-MAC (שנקראת גם טבלת CAM).']),
      lUL([
        ['Known unicast → out one port only.', 'Известный unicast → только в один порт.', 'Unicast ידוע → רק לפורט אחד.'],
        ['Unknown unicast, broadcast, multicast → flooded out every port in the same VLAN except the ingress port.', 'Неизвестный unicast, broadcast, multicast → рассылаются во все порты того же VLAN, кроме входного.', 'Unicast לא ידוע, broadcast ו-multicast → מוצפים לכל הפורטים באותו VLAN חוץ מפורט הכניסה.'],
        ['Dynamic entries age out after 300 seconds without traffic.', 'Динамические записи удаляются через 300 секунд без трафика.', 'רשומות דינמיות נמחקות אחרי 300 שניות בלי תעבורה.'],
      ]),
      lCode('S1# show mac address-table dynamic\nS1# show mac address-table aging-time\nS1# clear mac address-table dynamic')),
    lSec(['Switching methods', 'Методы коммутации', 'שיטות מיתוג'],
      lTable([['Method', 'Метод', 'שיטה'], ['Reads before forwarding', 'Что читает до пересылки', 'מה נקרא לפני ההעברה'], ['Notes', 'Особенности', 'הערות']], [
        ['Store-and-forward', ['The whole frame', 'Кадр целиком', 'את כל המסגרת'], ['Checks the FCS and drops bad frames; needed between ports of different speeds. Cisco default.', 'Проверяет FCS и отбрасывает битые кадры; нужен между портами разной скорости. По умолчанию у Cisco.', 'בודק FCS וזורק מסגרות פגומות; נדרש בין פורטים במהירויות שונות. ברירת המחדל ב-Cisco.']],
        ['Cut-through: fast-forward', ['Destination MAC only', 'Только MAC получателя', 'רק את MAC היעד'], ['Lowest latency, forwards errors too.', 'Минимальная задержка, но пересылает и ошибки.', 'השהיה הנמוכה ביותר, אבל מעביר גם שגיאות.']],
        ['Cut-through: fragment-free', ['First 64 bytes', 'Первые 64 байта', '64 הבתים הראשונים'], ['Filters most collision fragments (runts).', 'Отсеивает большинство обрывков коллизий (runts).', 'מסנן את רוב שברי ההתנגשויות (runts).']],
      ]),
      lTip(['Store-and-forward can also run QoS and look deeper into the frame, because it has the whole frame in its buffer.', 'Store-and-forward может также применять QoS и заглядывать глубже в кадр, потому что весь кадр уже в буфере.', 'Store-and-forward יכול גם להפעיל QoS ולהסתכל עמוק יותר במסגרת, כי כל המסגרת כבר נמצאת אצלו בבאפר.'])),
    lSec(['Collision domains', 'Домены коллизий', 'תחומי התנגשות'],
      lP(['Every switch port is its own collision domain (microsegmentation). With full-duplex links there are no collisions at all. A hub is different: the hub and everything on it share ONE collision domain.',
        'Каждый порт коммутатора — отдельный домен коллизий (микросегментация). На полнодуплексных каналах коллизий нет вообще. С хабом иначе: хаб и всё, что к нему подключено, — ОДИН общий домен коллизий.',
        'כל פורט במתג הוא תחום התנגשות נפרד (microsegmentation). בקישורי full-duplex אין התנגשויות בכלל. ברכזת (hub) זה אחרת: הרכזת וכל מה שמחובר אליה חולקים תחום התנגשות אחד.'])),
    lSec(['Broadcast domains', 'Широковещательные домены', 'תחומי broadcast'],
      lP(['Switches forward broadcasts, so all switches connected together (in one VLAN) form one broadcast domain. Only a Layer 3 device — a router or a Layer 3 switch — stops broadcasts; every router interface is a separate broadcast domain. VLANs split one switch into several.',
        'Коммутаторы пересылают broadcast, поэтому все соединённые коммутаторы (в одном VLAN) образуют один широковещательный домен. Остановить broadcast может только устройство 3-го уровня — маршрутизатор или L3-коммутатор; каждый интерфейс маршрутизатора — отдельный широковещательный домен. VLAN делят один коммутатор на несколько.',
        'מתגים מעבירים broadcast, ולכן כל המתגים שמחוברים יחד (ב-VLAN אחד) הם תחום broadcast אחד. רק התקן שכבה 3 — נתב או מתג שכבה 3 — עוצר broadcast; כל ממשק של נתב הוא תחום broadcast נפרד. רשתות VLAN מחלקות מתג אחד לכמה תחומים.']),
      lCode('R1 G0/0 <-> S1: 4 PCs\nR1 G0/1 <-> S2: 2 PCs + a hub with 3 PCs\n\nCollision domains: S1 = 4 + 1 (uplink) = 5\n                   S2 = 2 + 1 (hub) + 1 (uplink) = 4   → 9\nBroadcast domains: one per router interface         → 2', ['Counting domains (no VLANs)', 'Подсчёт доменов (без VLAN)', 'ספירת תחומים (בלי VLAN)'])),
    lSec(['Alleviating network congestion', 'Как бороться с перегрузкой', 'הקלה על עומס ברשת'],
      lUL([
        ['Fast port speeds — 1/10/25/40/100 Gbps.', 'Высокая скорость портов — 1/10/25/40/100 Гбит/с.', 'פורטים מהירים — ‏1/10/25/40/100 Gbps.'],
        ['Fast internal switching — a high-capacity backplane.', 'Быстрая внутренняя коммутация — производительная внутренняя шина.', 'מיתוג פנימי מהיר — backplane בעל קיבולת גבוהה.'],
        ['Large frame buffers — store frames instead of dropping them during bursts.', 'Большие буферы — хранят кадры при всплесках, а не отбрасывают.', 'באפרים גדולים — שומרים מסגרות בזמן פרצי תעבורה במקום לזרוק אותן.'],
        ['High port density — more devices on one switch, less traffic on uplinks.', 'Высокая плотность портов — больше устройств на одном коммутаторе, меньше трафика на аплинках.', 'צפיפות פורטים גבוהה — יותר התקנים על מתג אחד ופחות תעבורה ב-uplinks.'],
      ])),
  ],
  quiz: [
    lQ(['Which switching method has the lowest latency?', 'У какого метода коммутации самая низкая задержка?', 'לאיזו שיטת מיתוג יש ההשהיה הנמוכה ביותר?'], ['Fast-forward', 'Fragment-free', 'Store-and-forward', 'Flooding'], 0,
      ['It forwards as soon as it reads the destination MAC.', 'Пересылает сразу после чтения MAC получателя.', 'הוא מעביר מיד אחרי שקרא את MAC היעד.']),
    lQ(['How many bytes does fragment-free switching read before forwarding?', 'Сколько байт читает fragment-free перед пересылкой?', 'כמה בתים קורא fragment-free לפני ההעברה?'], ['64', '6', '1518', '14'], 0,
      ['Most collision fragments are shorter than 64 bytes.', 'Большинство обрывков коллизий короче 64 байт.', 'רוב שברי ההתנגשויות קצרים מ-64 בתים.']),
    lQ(['Which method checks the FCS and drops damaged frames?', 'Какой метод проверяет FCS и отбрасывает повреждённые кадры?', 'איזו שיטה בודקת FCS וזורקת מסגרות פגומות?'], ['Store-and-forward', 'Fast-forward', 'Fragment-free', 'Cut-through'], 0,
      ['It receives the whole frame first.', 'Сначала принимает кадр целиком.', 'הוא מקבל קודם את כל המסגרת.']),
    lQ(['On a switch, each port is a separate…', 'На коммутаторе каждый порт — это отдельный…', 'במתג, כל פורט הוא…'], [['Collision domain', 'домен коллизий', 'תחום התנגשות נפרד'], ['Broadcast domain', 'широковещательный домен', 'תחום broadcast נפרד'], ['IP subnet', 'IP-подсеть', 'תת-רשת IP נפרדת'], ['VLAN', 'VLAN', 'VLAN נפרד']], 0,
      ['That is microsegmentation. Broadcast domains are separated by routers or VLANs.', 'Это микросегментация. Широковещательные домены разделяют маршрутизаторы или VLAN.', 'זה microsegmentation. תחומי broadcast מופרדים על ידי נתבים או VLAN.']),
    lQ(['Which device separates broadcast domains?', 'Какое устройство разделяет широковещательные домены?', 'איזה התקן מפריד בין תחומי broadcast?'], [['A router', 'Маршрутизатор', 'נתב'], ['A Layer 2 switch', 'Коммутатор 2-го уровня', 'מתג שכבה 2'], ['A hub', 'Хаб', 'רכזת'], ['A repeater', 'Повторитель', 'משחזר (repeater)']], 0,
      ['Routers do not forward broadcasts.', 'Маршрутизаторы не пересылают broadcast.', 'נתבים לא מעבירים broadcast.']),
    lQ(['How long does a dynamic MAC table entry live without traffic (default)?', 'Сколько живёт динамическая запись MAC-таблицы без трафика (по умолчанию)?', 'כמה זמן רשומה דינמית בטבלת ה-MAC נשמרת בלי תעבורה (ברירת מחדל)?'], [['300 seconds', '300 секунд', '300 שניות'], ['30 seconds', '30 секунд', '30 שניות'], ['4 hours', '4 часа', '4 שעות'], ['Forever', 'Бессрочно', 'לתמיד']], 0,
      ['4 hours is the default ARP cache timeout on a router, not the MAC table.', '4 часа — это время жизни ARP-кэша на маршрутизаторе, а не MAC-таблицы.', '4 שעות זה זמן התפוגה של מטמון ה-ARP בנתב, לא של טבלת ה-MAC.']),
    lQ(['A frame arrives with an unknown destination MAC. What does the switch do?', 'Пришёл кадр с неизвестным MAC получателя. Что сделает коммутатор?', 'מגיעה מסגרת עם MAC יעד לא ידוע. מה המתג יעשה?'], [['Floods it out all ports in the VLAN except the ingress port', 'Разошлёт во все порты VLAN, кроме входного', 'יציף אותה לכל הפורטים ב-VLAN חוץ מפורט הכניסה'], ['Drops it', 'Отбросит его', 'יזרוק אותה'], ['Sends an ARP request', 'Отправит ARP-запрос', 'ישלח בקשת ARP'], ['Sends it to the default gateway', 'Отправит на шлюз по умолчанию', 'ישלח אותה לשער ברירת המחדל']], 0,
      ['Switches do not use ARP to find MACs — they flood and learn from the reply.', 'Коммутаторы не используют ARP для поиска MAC — они рассылают кадр и учатся по ответу.', 'מתגים לא משתמשים ב-ARP כדי למצוא MAC — הם מציפים ולומדים מהתשובה.']),
    lQ(['Which feature helps a switch avoid dropping frames during traffic bursts?', 'Что помогает коммутатору не терять кадры при всплесках трафика?', 'מה עוזר למתג לא לזרוק מסגרות בזמן פרצי תעבורה?'], [['Large frame buffers', 'Большие буферы кадров', 'באפרים גדולים למסגרות'], ['Fragment-free switching', 'Режим fragment-free', 'מיתוג fragment-free'], ['A longer aging time', 'Большее время устаревания', 'זמן תפוגה ארוך יותר'], ['Half-duplex ports', 'Полудуплексные порты', 'פורטים ב-half-duplex']], 0,
      ['Buffers hold frames until the egress port is free.', 'Буферы держат кадры, пока выходной порт не освободится.', 'הבאפרים מחזיקים את המסגרות עד שפורט היציאה מתפנה.']),
  ],
  gen: [
    function genDomains(rng) {
      const n = rng.int(2, 3), lines = [];
      let coll = 0, pcs = 0;
      for (let i = 0; i < n; i++) {
        const p = rng.int(2, 8), hub = rng.chance(0.5) ? rng.int(2, 5) : 0;
        lines.push('R1 G0/' + i + ' <-> S' + (i + 1) + ': ' + p + ' PCs' + (hub ? ' + a hub with ' + hub + ' PCs' : ''));
        coll += p + 1 + (hub ? 1 : 0);
        pcs += p + hub;
      }
      const askColl = rng.chance(0.6);
      const right = askColl ? coll : n;
      const q = lGen(askColl ? T('How many collision domains are in this network? (No VLANs, all switch links full-duplex.)', 'Сколько доменов коллизий в этой сети? (VLAN нет, все каналы коммутаторов полнодуплексные.)', 'כמה תחומי התנגשות יש ברשת הזו? (אין VLAN, כל הקישורים של המתגים full-duplex.)')
        : T('How many broadcast domains are in this network? (No VLANs.)', 'Сколько широковещательных доменов в этой сети? (VLAN нет.)', 'כמה תחומי broadcast יש ברשת הזו? (אין VLAN.)'),
        String(right), [String(askColl ? n : coll), String(pcs + n), String(askColl ? coll - n : 1), String(pcs), String(n + 1)],
        T('Collision domains: one per switch/router port in use, a hub counts once → ' + coll + '. Broadcast domains: one per router interface → ' + n + '.',
          'Домены коллизий: по одному на каждый занятый порт коммутатора/маршрутизатора, хаб считается один раз → ' + coll + '. Широковещательные домены: по одному на интерфейс маршрутизатора → ' + n + '.',
          'תחומי התנגשות: אחד לכל פורט פעיל במתג או בנתב, רכזת נספרת פעם אחת → ' + coll + '. תחומי broadcast: אחד לכל ממשק של הנתב → ' + n + '.'));
      q.code = lines.join('\n');
      return q;
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'srwe05', topic: null, drill: 'l2', minutes: 18, genInQuiz: 2,
  title: T('STP Concepts', 'Принципы STP', 'עקרונות STP'),
  goal: T('Why Layer 2 loops are dangerous, how STP elects the root bridge, port roles and costs, port states and timers, RSTP, PortFast and BPDU Guard.',
    'Чем опасны петли 2-го уровня, как STP выбирает корневой мост, роли и стоимости портов, состояния и таймеры, RSTP, PortFast и BPDU Guard.',
    'למה לולאות בשכבה 2 מסוכנות, איך STP בוחר root bridge, תפקידי פורטים ועלויות, מצבי פורט וטיימרים, ‏RSTP, ‏PortFast ו-BPDU Guard.'),
  sections: [
    lSec(['Why we need STP', 'Зачем нужен STP', 'למה צריך STP'],
      lP(['Redundant links between switches keep the network up when a link fails, but they create Layer 2 loops. An Ethernet frame has no TTL, so a looping frame never dies.',
        'Резервные каналы между коммутаторами сохраняют работу сети при обрыве, но создают петли 2-го уровня. У кадра Ethernet нет TTL, поэтому кадр в петле живёт вечно.',
        'קישורים כפולים בין מתגים שומרים על הרשת כשקישור נופל, אבל הם יוצרים לולאות בשכבה 2. למסגרת Ethernet אין TTL, ולכן מסגרת בלולאה אף פעם לא מתה.']),
      lUL([
        ['Broadcast storm — broadcasts multiply until the switches and links are saturated.', 'Широковещательный шторм — broadcast размножаются, пока коммутаторы и каналы не захлебнутся.', 'סופת broadcast — שידורים מתרבים עד שהמתגים והקישורים מוצפים לגמרי.'],
        ['MAC table instability — the same source MAC is learned on different ports again and again.', 'Нестабильность MAC-таблицы — один и тот же MAC источника снова и снова запоминается на разных портах.', 'חוסר יציבות בטבלת ה-MAC — אותה כתובת מקור נלמדת שוב ושוב בפורטים שונים.'],
        ['Duplicate unicast frames reach the destination.', 'Получатель получает дубликаты unicast-кадров.', 'עותקים כפולים של מסגרות unicast מגיעים ליעד.'],
      ]),
      lP(['Spanning Tree Protocol (IEEE 802.1D) blocks some ports so that only ONE active path exists between any two points, and unblocks them if the active path fails.',
        'Spanning Tree Protocol (IEEE 802.1D) блокирует часть портов, чтобы между любыми двумя точками был только ОДИН активный путь, и разблокирует их при отказе активного пути.',
        'פרוטוקול Spanning Tree ‏(IEEE 802.1D) חוסם חלק מהפורטים כך שבין כל שתי נקודות יש רק נתיב פעיל אחד, ומשחרר אותם אם הנתיב הפעיל נופל.'])),
    lSec(['Electing the root bridge', 'Выбор корневого моста', 'בחירת ה-root bridge'],
      lP(['Switches exchange BPDUs that carry a bridge ID (BID) = priority + extended system ID (the VLAN number) + MAC address. The switch with the LOWEST BID becomes the root bridge: lowest priority first, then lowest MAC.',
        'Коммутаторы обмениваются BPDU, в которых есть идентификатор моста (BID) = приоритет + extended system ID (номер VLAN) + MAC-адрес. Корневым мостом становится коммутатор с НАИМЕНЬШИМ BID: сначала по приоритету, затем по наименьшему MAC.',
        'המתגים מחליפים הודעות BPDU שמכילות מזהה גשר (BID) = עדיפות (priority) + extended system ID (מספר ה-VLAN) + כתובת MAC. המתג עם ה-BID הנמוך ביותר הופך ל-root bridge: קודם העדיפות הנמוכה ביותר, ואז ה-MAC הנמוך ביותר.']),
      lCode('S1(config)# spanning-tree vlan 1 root primary        ! sets priority 24576 (or lower)\nS2(config)# spanning-tree vlan 1 root secondary      ! 28672\nS3(config)# spanning-tree vlan 1 priority 4096       ! multiples of 4096, 0–61440\n\nS1# show spanning-tree vlan 1\n  Root ID    Priority    24577\n             This bridge is the root\n  Bridge ID  Priority    24577  (priority 24576 sys-id-ext 1)'),
      lTip(['Default priority is 32768. If you leave everything default, the switch with the lowest MAC — often the oldest switch — becomes root. Always choose the root yourself.', 'Приоритет по умолчанию — 32768. Если всё оставить по умолчанию, корнем станет коммутатор с наименьшим MAC — часто самый старый. Всегда назначайте корень сами.', 'העדיפות כברירת מחדל היא 32768. אם משאירים הכול כברירת מחדל, המתג עם ה-MAC הנמוך ביותר — לרוב הישן ביותר — יהיה ה-root. תמיד בוחרים את ה-root בעצמכם.'])),
    lSec(['Port roles and path cost', 'Роли портов и стоимость пути', 'תפקידי פורטים ועלות נתיב'],
      lUL([
        ['Root port — on every non-root switch, the port with the best (lowest-cost) path to the root bridge.', 'Корневой порт (root port) — на каждом некорневом коммутаторе порт с лучшим (самым дешёвым) путём к корню.', 'Root port — בכל מתג שאינו root, הפורט עם הנתיב הטוב ביותר (הזול ביותר) ל-root bridge.'],
        ['Designated port — one per link, forwards toward that link. All ports of the root bridge are designated.', 'Назначенный порт (designated) — один на каждый канал, передаёт в этот сегмент. Все порты корневого моста — назначенные.', 'Designated port — אחד בכל קישור, מעביר תעבורה לקטע הזה. כל הפורטים של ה-root bridge הם designated.'],
        ['Alternate (or backup) port — blocked; ready to take over.', 'Альтернативный (или резервный) порт — заблокирован, готов подхватить работу.', 'Alternate (או backup) port — חסום, מוכן להיכנס לפעולה.'],
      ]),
      lTable([['Link speed', 'Скорость канала', 'מהירות קישור'], ['STP cost (802.1D)', 'Стоимость STP (802.1D)', 'עלות STP ‏(802.1D)']], [
        ['10 Gbps', '2'], ['1 Gbps', '4'], ['100 Mbps', '19'], ['10 Mbps', '100'],
      ]),
      lP(['Root path cost = the sum of the costs of the links on the way to the root. Ties are broken by: lowest sender BID, then lowest sender port priority, then lowest sender port number.',
        'Стоимость пути до корня = сумма стоимостей каналов по пути к корню. При равенстве сравнивают: наименьший BID отправителя, затем наименьший приоритет порта отправителя, затем наименьший номер порта отправителя.',
        'עלות הנתיב ל-root = סכום העלויות של הקישורים בדרך ל-root. במקרה של שוויון מכריעים לפי: ה-BID הנמוך של השולח, אחר כך עדיפות הפורט הנמוכה של השולח, ואז מספר הפורט הנמוך של השולח.'])),
    lSec(['Port states, timers and RSTP', 'Состояния портов, таймеры и RSTP', 'מצבי פורט, טיימרים ו-RSTP'],
      lTable([['State (802.1D)', 'Состояние (802.1D)', 'מצב ‏(802.1D)'], ['What the port does', 'Что делает порт', 'מה הפורט עושה']], [
        ['Blocking', ['Only listens to BPDUs (max age 20 s)', 'Только слушает BPDU (max age 20 с)', 'רק מקשיב ל-BPDU ‏(max age ‏20 שניות)']],
        ['Listening', ['Sends and receives BPDUs, no MAC learning (forward delay 15 s)', 'Отправляет и принимает BPDU, MAC не изучает (forward delay 15 с)', 'שולח ומקבל BPDU, לא לומד MAC ‏(forward delay ‏15 שניות)']],
        ['Learning', ['Learns MAC addresses but does not forward data (15 s)', 'Изучает MAC-адреса, но не пересылает данные (15 с)', 'לומד כתובות MAC אבל לא מעביר נתונים (15 שניות)']],
        ['Forwarding', ['Forwards data, learns MACs, handles BPDUs', 'Пересылает данные, изучает MAC, обрабатывает BPDU', 'מעביר נתונים, לומד MAC ומטפל ב-BPDU']],
        ['Disabled', ['Administratively down', 'Административно выключен', 'כבוי מנהלית']],
      ]),
      lUL([
        ['Classic STP can take 30–50 seconds to converge. Hello time is 2 seconds.', 'Классический STP сходится за 30–50 секунд. Hello-таймер — 2 секунды.', 'STP הקלאסי יכול לקחת 30–50 שניות להתכנס. ה-hello time הוא 2 שניות.'],
        ['RSTP (802.1w) converges in a few seconds; its states are discarding, learning and forwarding.', 'RSTP (802.1w) сходится за несколько секунд; его состояния — discarding, learning и forwarding.', 'RSTP ‏(802.1w) מתכנס תוך שניות ספורות; המצבים שלו הם discarding, ‏learning ו-forwarding.'],
        ['Cisco runs one tree per VLAN: PVST+ (802.1D based) or Rapid PVST+ (802.1w based). MSTP maps many VLANs to a few trees.', 'Cisco строит отдельное дерево для каждого VLAN: PVST+ (на базе 802.1D) или Rapid PVST+ (на базе 802.1w). MSTP объединяет много VLAN в несколько деревьев.', 'ב-Cisco יש עץ נפרד לכל VLAN: ‏PVST+ (מבוסס 802.1D) או Rapid PVST+ (מבוסס 802.1w). ‏MSTP ממפה הרבה VLAN לכמה עצים בודדים.'],
      ]),
      lCode('S1(config)# spanning-tree mode rapid-pvst')),
    lSec(['PortFast and BPDU Guard', 'PortFast и BPDU Guard', 'PortFast ו-BPDU Guard'],
      lCode('S1(config)# interface range fa0/1 - 20\nS1(config-if-range)# switchport mode access\nS1(config-if-range)# spanning-tree portfast\nS1(config-if-range)# spanning-tree bpduguard enable\n\nS1(config)# spanning-tree portfast default            ! all access ports\nS1(config)# spanning-tree portfast bpduguard default'),
      lUL([
        ['PortFast — an access port to a PC or server goes straight to forwarding, so the host gets DHCP without waiting 30 seconds.', 'PortFast — access-порт к ПК или серверу сразу переходит в forwarding, и хост получает DHCP без ожидания 30 секунд.', 'PortFast — פורט access למחשב או לשרת עובר ישר ל-forwarding, כך שהמארח מקבל DHCP בלי לחכות 30 שניות.'],
        ['BPDU Guard — if a BPDU arrives on that port (someone plugged in a switch), the port goes err-disabled.', 'BPDU Guard — если на порт пришёл BPDU (кто-то подключил коммутатор), порт переходит в err-disabled.', 'BPDU Guard — אם מגיע BPDU לפורט (מישהו חיבר מתג), הפורט עובר ל-err-disabled.'],
        ['Never enable PortFast on links to other switches.', 'Никогда не включайте PortFast на каналах к другим коммутаторам.', 'אף פעם לא מפעילים PortFast על קישורים למתגים אחרים.'],
      ])),
  ],
  quiz: [
    lQ(['What happens to a broadcast in a switched loop without STP?', 'Что происходит с broadcast в петле коммутаторов без STP?', 'מה קורה ל-broadcast בלולאה של מתגים בלי STP?'], [['It loops forever and causes a broadcast storm', 'Ходит по кругу бесконечно и вызывает широковещательный шторм', 'הוא מסתובב לנצח וגורם לסופת broadcast'], ['Its TTL expires and it is dropped', 'Истекает TTL, и он отбрасывается', 'ה-TTL שלו פג והוא נזרק'], ['The switch sends it to the router', 'Коммутатор отправит его маршрутизатору', 'המתג שולח אותו לנתב'], ['Nothing — switches detect loops by themselves', 'Ничего — коммутаторы сами находят петли', 'כלום — מתגים מזהים לולאות בעצמם']], 0,
      ['Ethernet frames have no TTL field.', 'В кадре Ethernet нет поля TTL.', 'למסגרת Ethernet אין שדה TTL.']),
    lQ(['What is the default bridge priority?', 'Какой приоритет моста по умолчанию?', 'מהי עדיפות הגשר כברירת מחדל?'], ['32768', '4096', '0', '65535'], 0,
      ['Priorities go in steps of 4096 from 0 to 61440.', 'Приоритеты идут с шагом 4096 от 0 до 61440.', 'העדיפויות עולות בקפיצות של 4096 מ-0 עד 61440.']),
    lQ(['Two switches have the same priority. Which becomes the root bridge?', 'У двух коммутаторов одинаковый приоритет. Кто станет корневым мостом?', 'לשני מתגים יש אותה עדיפות. מי יהיה ה-root bridge?'], [['The one with the lowest MAC address', 'Тот, у кого наименьший MAC-адрес', 'זה עם כתובת ה-MAC הנמוכה ביותר'], ['The one with the highest MAC address', 'Тот, у кого наибольший MAC-адрес', 'זה עם כתובת ה-MAC הגבוהה ביותר'], ['The one with more ports', 'Тот, у кого больше портов', 'זה עם יותר פורטים'], ['The one that booted first', 'Тот, кто загрузился первым', 'זה שעלה ראשון']], 0,
      ['Lowest bridge ID wins: priority, then MAC.', 'Побеждает наименьший BID: приоритет, затем MAC.', 'ה-BID הנמוך מנצח: עדיפות ואז MAC.']),
    lQ(['On a non-root switch, which port has the lowest-cost path to the root bridge?', 'Какой порт некорневого коммутатора имеет самый дешёвый путь к корню?', 'איזה פורט במתג שאינו root הוא בעל הנתיב הזול ביותר ל-root bridge?'], ['Root port', 'Designated port', 'Alternate port', 'Edge port'], 0,
      ['Each non-root switch has exactly one root port.', 'У каждого некорневого коммутатора ровно один корневой порт.', 'לכל מתג שאינו root יש בדיוק root port אחד.']),
    lQ(['What role do all active ports on the root bridge have?', 'Какую роль имеют все активные порты корневого моста?', 'מה התפקיד של כל הפורטים הפעילים ב-root bridge?'], ['Designated', 'Root', 'Alternate', 'Blocking'], 0,
      ['The root bridge has no root port.', 'У корневого моста нет корневого порта.', 'ל-root bridge אין root port.']),
    lQ(['What is the 802.1D STP cost of a 1 Gbps link?', 'Какова стоимость STP (802.1D) канала 1 Гбит/с?', 'מהי עלות STP ‏(802.1D) של קישור 1 Gbps?'], ['4', '19', '2', '100'], 0,
      ['10 Gbps = 2, 1 Gbps = 4, 100 Mbps = 19, 10 Mbps = 100.', '10 Гбит/с = 2, 1 Гбит/с = 4, 100 Мбит/с = 19, 10 Мбит/с = 100.', '‏10 Gbps = 2, ‏1 Gbps = 4, ‏100 Mbps = 19, ‏10 Mbps = 100.']),
    lQ(['In which 802.1D state does a port learn MAC addresses but not forward data?', 'В каком состоянии 802.1D порт изучает MAC-адреса, но не пересылает данные?', 'באיזה מצב של 802.1D פורט לומד כתובות MAC אבל לא מעביר נתונים?'], ['Learning', 'Listening', 'Blocking', 'Forwarding'], 0,
      ['Blocking → listening → learning → forwarding.', 'Blocking → listening → learning → forwarding.', 'Blocking → listening → learning → forwarding.']),
    lQ(['A user plugs a small switch into a port with BPDU Guard. What happens?', 'Пользователь подключил маленький коммутатор к порту с BPDU Guard. Что произойдёт?', 'משתמש חיבר מתג קטן לפורט עם BPDU Guard. מה יקרה?'], [['The port goes err-disabled', 'Порт перейдёт в err-disabled', 'הפורט יעבור ל-err-disabled'], ['The new switch becomes root', 'Новый коммутатор станет корнем', 'המתג החדש יהפוך ל-root'], ['The port becomes a trunk', 'Порт станет trunk', 'הפורט יהפוך ל-trunk'], ['Nothing happens', 'Ничего не произойдёт', 'לא יקרה כלום']], 0,
      ['BPDU Guard protects edge ports from unexpected switches.', 'BPDU Guard защищает пограничные порты от неожиданных коммутаторов.', 'BPDU Guard מגן על פורטי קצה ממתגים לא צפויים.']),
    lQ(['Which standard is Rapid Spanning Tree?', 'Какой стандарт — это Rapid Spanning Tree?', 'איזה תקן הוא Rapid Spanning Tree?'], ['802.1w', '802.1D', '802.1Q', '802.3ad'], 0,
      ['802.1Q is VLAN tagging, 802.3ad is LACP.', '802.1Q — теги VLAN, 802.3ad — LACP.', '‏802.1Q הוא תיוג VLAN, ‏802.3ad הוא LACP.']),
  ],
  gen: [
    function genRootBridge(rng) {
      const pr = rng.chance(0.4) ? () => 32768 : () => rng.pick([4096, 24576, 28672, 32768, 32768, 32768, 61440]);
      const sw = [];
      while (sw.length < 4) {
        const mac = lRandMac(rng);
        if (!sw.some((s) => s.mac === mac)) sw.push({ name: 'S' + (sw.length + 1), prio: pr(), mac });
      }
      const best = sw.slice().sort((a, b) => a.prio - b.prio || (a.mac < b.mac ? -1 : 1))[0];
      const tie = sw.filter((s) => s.prio === best.prio).length > 1;
      const q = lGen(T('Which switch becomes the root bridge?', 'Какой коммутатор станет корневым мостом?', 'איזה מתג יהיה ה-root bridge?'),
        best.name, sw.filter((s) => s !== best).map((s) => s.name),
        tie ? T('Several switches share the lowest priority ' + best.prio + ', so the lowest MAC decides: ' + best.name + '.', 'У нескольких коммутаторов одинаковый наименьший приоритет ' + best.prio + ', поэтому решает наименьший MAC: ' + best.name + '.', 'לכמה מתגים יש אותה עדיפות נמוכה ' + best.prio + ', ולכן ה-MAC הנמוך ביותר מכריע: ' + best.name + '.')
          : T('The lowest priority wins: ' + best.name + ' (' + best.prio + ').', 'Побеждает наименьший приоритет: ' + best.name + ' (' + best.prio + ').', 'העדיפות הנמוכה ביותר מנצחת: ' + best.name + ' ‏(' + best.prio + ').'));
      q.code = 'Switch  Priority  MAC address\n' + sw.map((s) => padR(s.name, 8) + padR(s.prio, 10) + s.mac).join('\n');
      return q;
    },
    function genRootPort(rng) {
      const speeds = ['100 Mbps', '100 Mbps', '1 Gbps', '1 Gbps', '10 Gbps', '10 Mbps'];
      let a, b, c;
      do { a = rng.pick(speeds); b = rng.pick(speeds); c = rng.pick(speeds); } while (STP_COSTS[a] === STP_COSTS[b] + STP_COSTS[c]);
      const pA = STP_PORT_PREFIX[a] + '0/1', pB = STP_PORT_PREFIX[b] + '0/2';
      const cA = STP_COSTS[a], cB = STP_COSTS[b] + STP_COSTS[c];
      return lGen(T('S1 is the root bridge. S3 connects directly to S1 through ' + pA + ' (' + a + ') and to S2 through ' + pB + ' (' + b + '). S2 connects to S1 over a ' + c + ' link. Which port becomes the root port on S3?',
        'S1 — корневой мост. S3 подключён напрямую к S1 через ' + pA + ' (' + a + ') и к S2 через ' + pB + ' (' + b + '). S2 подключён к S1 каналом ' + c + '. Какой порт станет корневым на S3?',
        'S1 הוא ה-root bridge. ‏S3 מחובר ישירות ל-S1 דרך ' + pA + ' ‏(' + a + ') ול-S2 דרך ' + pB + ' ‏(' + b + '). ‏S2 מחובר ל-S1 בקישור ' + c + '. איזה פורט יהיה ה-root port ב-S3?'),
        cA < cB ? pA : pB, [cA < cB ? pB : pA, T('Both — STP load-balances over them', 'Оба — STP распределит нагрузку', 'שניהם — STP מאזן ביניהם עומסים'), T('None — S3 blocks both ports', 'Ни один — S3 заблокирует оба порта', 'אף אחד — S3 חוסם את שני הפורטים')],
        T('Root path cost via ' + pA + ' = ' + cA + '; via ' + pB + ' = ' + STP_COSTS[b] + ' + ' + STP_COSTS[c] + ' = ' + cB + '. The lower cost wins.',
          'Стоимость пути через ' + pA + ' = ' + cA + '; через ' + pB + ' = ' + STP_COSTS[b] + ' + ' + STP_COSTS[c] + ' = ' + cB + '. Побеждает меньшая.',
          'עלות הנתיב דרך ' + pA + ' = ' + cA + '; דרך ' + pB + ' = ' + STP_COSTS[b] + ' + ' + STP_COSTS[c] + ' = ' + cB + '. העלות הנמוכה מנצחת.'));
    },
    function genBridgePriority(rng) {
      if (rng.chance(0.5)) {
        const ok = 4096 * rng.int(0, 15);
        return lGen(T('Which value can you set with "spanning-tree vlan 10 priority <value>"?', 'Какое значение можно задать командой «spanning-tree vlan 10 priority <значение>»?', 'איזה ערך אפשר להגדיר בפקודה "spanning-tree vlan 10 priority <ערך>"?'),
          String(ok), rng.shuffle([1000, 4000, 8000, 10000, 20000, 30000, 32769, 33000, 36000, 50000, 65535]).map(String),
          T('The priority must be a multiple of 4096 between 0 and 61440.', 'Приоритет должен быть кратен 4096 в диапазоне 0–61440.', 'העדיפות חייבת להיות כפולה של 4096 בין 0 ל-61440.'));
      }
      const v = rng.pick([1, 10, 20, 30, 40, 99, 100]), p = 4096 * rng.int(1, 14);
      return lGen(T('S1 has "spanning-tree vlan ' + v + ' priority ' + p + '". Which bridge priority does "show spanning-tree vlan ' + v + '" display for S1?',
        'На S1 задано «spanning-tree vlan ' + v + ' priority ' + p + '». Какой приоритет моста покажет «show spanning-tree vlan ' + v + '»?',
        'ב-S1 מוגדר "spanning-tree vlan ' + v + ' priority ' + p + '". איזו עדיפות גשר יציג "show spanning-tree vlan ' + v + '"?'),
        String(p + v), [String(p), String(32768 + v), String(p + 1), String(p - v)],
        T('The bridge priority includes the extended system ID (the VLAN number): ' + p + ' + ' + v + ' = ' + (p + v) + '.', 'Приоритет моста включает extended system ID (номер VLAN): ' + p + ' + ' + v + ' = ' + (p + v) + '.', 'עדיפות הגשר כוללת את ה-extended system ID (מספר ה-VLAN): ' + p + ' + ' + v + ' = ' + (p + v) + '.'));
    },
  ],
});

// ---------------------------------------------------------------
const EC_LACP = ['active', 'passive'], EC_PAGP = ['desirable', 'auto'];

lessonDef({
  id: 'srwe06', topic: null, drill: 'l2', minutes: 14,
  title: T('EtherChannel', 'EtherChannel', 'EtherChannel'),
  goal: T('Bundling links into one logical port-channel, PAgP and LACP modes, configuration rules, verification and typical problems.',
    'Объединение каналов в один логический port-channel, режимы PAgP и LACP, правила настройки, проверка и типичные проблемы.',
    'איחוד קישורים ל-port-channel לוגי אחד, המצבים של PAgP ו-LACP, כללי הגדרה, בדיקה ותקלות נפוצות.'),
  sections: [
    lSec(['Why EtherChannel', 'Зачем EtherChannel', 'למה EtherChannel'],
      lP(['Two parallel links between switches give more bandwidth — but STP blocks one of them. EtherChannel bundles up to 8 active physical links into ONE logical interface (a port-channel). STP sees a single link, so nothing is blocked.',
        'Два параллельных канала между коммутаторами дают больше полосы — но STP блокирует один из них. EtherChannel объединяет до 8 активных физических каналов в ОДИН логический интерфейс (port-channel). STP видит один канал, поэтому ничего не блокируется.',
        'שני קישורים מקבילים בין מתגים נותנים יותר רוחב פס — אבל STP חוסם אחד מהם. EtherChannel מאחד עד 8 קישורים פיזיים פעילים לממשק לוגי אחד (port-channel). ‏STP רואה קישור אחד, ולכן שום דבר לא נחסם.']),
      lUL([
        ['More bandwidth — traffic is load-balanced across the member links (by MAC or IP addresses).', 'Больше полосы — трафик распределяется между каналами (по MAC- или IP-адресам).', 'יותר רוחב פס — התעבורה מתחלקת בין הקישורים (לפי כתובות MAC או IP).'],
        ['Redundancy — if one member fails, the channel stays up.', 'Резервирование — при отказе одного канала port-channel продолжает работать.', 'יתירות — אם קישור אחד נופל, ה-port-channel ממשיך לעבוד.'],
        ['Configuration is done once, on the port-channel interface.', 'Настройка делается один раз — на интерфейсе port-channel.', 'ההגדרה נעשית פעם אחת — על ממשק ה-port-channel.'],
      ])),
    lSec(['PAgP and LACP', 'PAgP и LACP', 'PAgP ו-LACP'],
      lTable([['Protocol', 'Протокол', 'פרוטוקול'], ['Modes', 'Режимы', 'מצבים'], ['Notes', 'Особенности', 'הערות']], [
        ['PAgP', 'desirable / auto', ['Cisco proprietary', 'Проприетарный Cisco', 'קנייני של Cisco']],
        ['LACP', 'active / passive', ['IEEE 802.3ad; up to 16 links, 8 active', 'IEEE 802.3ad; до 16 каналов, 8 активных', 'IEEE 802.3ad; עד 16 קישורים, 8 פעילים']],
        [['None', 'Нет', 'ללא'], 'on', ['Forced bundle, no negotiation — both sides must be "on"', 'Принудительно, без согласования — обе стороны должны быть «on»', 'איחוד בכוח בלי משא ומתן — שני הצדדים חייבים להיות "on"']],
      ]),
      lTable([['Side A', 'Сторона A', 'צד A'], ['Side B', 'Сторона B', 'צד B'], ['Result', 'Итог', 'תוצאה']], [
        ['active', 'active / passive', ['Channel (LACP)', 'Канал (LACP)', 'ערוץ (LACP)']],
        ['passive', 'passive', ['No channel', 'Канала нет', 'אין ערוץ']],
        ['desirable', 'desirable / auto', ['Channel (PAgP)', 'Канал (PAgP)', 'ערוץ (PAgP)']],
        ['auto', 'auto', ['No channel', 'Канала нет', 'אין ערוץ']],
        ['on', 'on', ['Channel (static)', 'Канал (статический)', 'ערוץ (סטטי)']],
        ['on', ['any other mode', 'любой другой режим', 'כל מצב אחר'], ['No channel', 'Канала нет', 'אין ערוץ']],
      ]),
      lTip(['Passive/auto only answer; at least one side must start the negotiation (active/desirable). LACP and PAgP never talk to each other.', 'Passive/auto только отвечают; хотя бы одна сторона должна начать согласование (active/desirable). LACP и PAgP друг с другом не работают.', 'Passive/auto רק עונים; לפחות צד אחד חייב להתחיל את המשא ומתן (active/desirable). ‏LACP ו-PAgP לא מדברים זה עם זה.'])),
    lSec(['Configuration', 'Настройка', 'הגדרה'],
      lCode('S1(config)# interface range g0/1 - 2\nS1(config-if-range)# channel-group 1 mode active\nCreating a port-channel interface Port-channel 1\nS1(config-if-range)# exit\nS1(config)# interface port-channel 1\nS1(config-if)# switchport mode trunk\nS1(config-if)# switchport trunk allowed vlan 10,20,99\nS1(config)# port-channel load-balance src-dst-ip'),
      lUL([
        ['All member ports must have the same speed and duplex.', 'У всех портов-участников должны совпадать скорость и дуплекс.', 'לכל הפורטים החברים חייבים להיות אותה מהירות ואותו דופלקס.'],
        ['They must also have the same VLAN settings: all access in the same VLAN, or all trunks with the same native and allowed VLANs.', 'Также должны совпадать настройки VLAN: все access в одном VLAN или все trunk с одинаковыми native и allowed VLAN.', 'גם הגדרות ה-VLAN חייבות להיות זהות: כולם access באותו VLAN, או כולם trunk עם אותו native VLAN ואותם VLAN מותרים.'],
        ['Change settings on the port-channel interface — they are copied to the members.', 'Меняйте настройки на интерфейсе port-channel — они копируются на участников.', 'משנים הגדרות על ממשק ה-port-channel — הן מועתקות לחברים.'],
      ])),
    lSec(['Verification and troubleshooting', 'Проверка и поиск неисправностей', 'בדיקה ופתרון תקלות'],
      lCode('S1# show etherchannel summary\nFlags:  D - down        P - bundled in port-channel\n        I - stand-alone s - suspended\n        S - Layer2      U - in use\nGroup  Port-channel  Protocol    Ports\n------+-------------+-----------+---------------\n1      Po1(SU)         LACP      Gi0/1(P)    Gi0/2(P)'),
      lUL([
        ['Po1(SU) — Layer 2 and in use; members (P) are bundled. (SD) or (s) means a problem.', 'Po1(SU) — 2-й уровень и в работе; участники (P) объединены. (SD) или (s) означает проблему.', 'Po1(SU) — שכבה 2 ובשימוש; החברים (P) מאוחדים. ‏(SD) או (s) מעידים על בעיה.'],
        ['show interfaces port-channel 1, show etherchannel port-channel — details.', 'show interfaces port-channel 1, show etherchannel port-channel — подробности.', 'show interfaces port-channel 1, ‏show etherchannel port-channel — פרטים.'],
        ['Typical faults: incompatible modes (auto + auto, on + active), different speed/duplex, different allowed or native VLANs.', 'Типичные ошибки: несовместимые режимы (auto + auto, on + active), разные скорость/дуплекс, разные allowed или native VLAN.', 'תקלות נפוצות: מצבים לא תואמים (auto + auto, ‏on + active), מהירות או דופלקס שונים, ‏VLAN מותרים או native שונים.'],
      ])),
  ],
  quiz: [
    lQ(['Why does STP not block the links inside an EtherChannel?', 'Почему STP не блокирует каналы внутри EtherChannel?', 'למה STP לא חוסם את הקישורים בתוך EtherChannel?'], [['STP sees the bundle as one logical link', 'STP видит пучок как один логический канал', 'STP רואה את הצרור כקישור לוגי אחד'], ['EtherChannel turns STP off', 'EtherChannel отключает STP', 'EtherChannel מכבה את STP'], ['The links are in different VLANs', 'Каналы в разных VLAN', 'הקישורים ב-VLAN שונים'], ['BPDUs are not sent on fiber', 'BPDU не отправляются по оптике', 'BPDU לא נשלחים על סיב']], 0,
      ['STP still runs — on the port-channel interface.', 'STP продолжает работать — на интерфейсе port-channel.', 'STP עדיין רץ — על ממשק ה-port-channel.']),
    lQ(['Which EtherChannel protocol is an IEEE standard?', 'Какой протокол EtherChannel — стандарт IEEE?', 'איזה פרוטוקול EtherChannel הוא תקן IEEE?'], ['LACP', 'PAgP', 'DTP', 'VTP'], 0,
      ['PAgP is Cisco proprietary.', 'PAgP — проприетарный протокол Cisco.', 'PAgP הוא קנייני של Cisco.']),
    lQ(['Which pair of modes belongs to PAgP?', 'Какая пара режимов относится к PAgP?', 'איזה זוג מצבים שייך ל-PAgP?'], ['desirable / auto', 'active / passive', 'on / off', 'trunk / access'], 0,
      ['LACP uses active / passive.', 'LACP использует active / passive.', 'LACP משתמש ב-active / passive.']),
    lQ(['Both sides are set to LACP passive. Result?', 'Обе стороны настроены LACP passive. Итог?', 'שני הצדדים מוגדרים LACP passive. מה התוצאה?'], [['No EtherChannel — nobody starts the negotiation', 'EtherChannel нет — никто не начинает согласование', 'אין EtherChannel — אף אחד לא מתחיל משא ומתן'], ['An LACP channel forms', 'Образуется канал LACP', 'נוצר ערוץ LACP'], ['A PAgP channel forms', 'Образуется канал PAgP', 'נוצר ערוץ PAgP'], ['The ports go err-disabled', 'Порты уходят в err-disabled', 'הפורטים עוברים ל-err-disabled']], 0,
      ['At least one side must be active.', 'Хотя бы одна сторона должна быть active.', 'לפחות צד אחד חייב להיות active.']),
    lQ(['How many links can be ACTIVE in one EtherChannel?', 'Сколько каналов могут быть АКТИВНЫ в одном EtherChannel?', 'כמה קישורים יכולים להיות פעילים ב-EtherChannel אחד?'], ['8', '2', '4', '16'], 0,
      ['LACP can add up to 8 more links as standby (16 total).', 'LACP может держать ещё до 8 каналов в резерве (всего 16).', 'LACP יכול להחזיק עוד עד 8 קישורים בהמתנה (16 בסך הכול).']),
    lQ(['Which must be identical on all member ports?', 'Что должно совпадать на всех портах-участниках?', 'מה חייב להיות זהה בכל הפורטים החברים?'], [['Speed, duplex and VLAN settings', 'Скорость, дуплекс и настройки VLAN', 'מהירות, דופלקס והגדרות VLAN'], ['Port descriptions', 'Описания портов', 'תיאורי הפורטים'], ['The MAC addresses', 'MAC-адреса', 'כתובות ה-MAC'], ['The cable colour', 'Цвет кабеля', 'צבע הכבל']], 0,
      ['Otherwise the port is suspended from the bundle.', 'Иначе порт исключается из пучка (suspended).', 'אחרת הפורט מושעה מהצרור (suspended).']),
    lQ(['Where do you set trunk options for an EtherChannel?', 'Где задавать настройки trunk для EtherChannel?', 'איפה מגדירים את אפשרויות ה-trunk של EtherChannel?'], [['On the port-channel interface', 'На интерфейсе port-channel', 'על ממשק ה-port-channel'], ['Only on the first member port', 'Только на первом порту-участнике', 'רק על הפורט החבר הראשון'], ['In global configuration', 'В глобальной конфигурации', 'בהגדרה הגלובלית'], ['On the VLAN interface', 'На интерфейсе VLAN', 'על ממשק ה-VLAN']], 0,
      ['The port-channel pushes its settings to every member.', 'Port-channel передаёт свои настройки каждому участнику.', 'ה-port-channel מעביר את ההגדרות שלו לכל חבר.']),
    lQ(['In "show etherchannel summary", what does "Po1(SU)" mean?', 'Что означает «Po1(SU)» в «show etherchannel summary»?', 'מה המשמעות של "Po1(SU)" ב-"show etherchannel summary"?'], [['Layer 2 port-channel, in use', 'Port-channel 2-го уровня, в работе', 'Port-channel בשכבה 2, בשימוש'], ['Suspended and unused', 'Приостановлен и не используется', 'מושעה ולא בשימוש'], ['Static and up', 'Статический и поднят', 'סטטי ופעיל'], ['STP blocked', 'Заблокирован STP', 'חסום על ידי STP']], 0,
      ['S = Layer 2, U = in use; members marked (P) are bundled.', 'S — 2-й уровень, U — в работе; участники с (P) объединены.', 'S = שכבה 2, ‏U = בשימוש; חברים שמסומנים (P) מאוחדים.']),
  ],
  gen: [
    function genEcMode(rng) {
      const fam = rng.pick(['lacp', 'pagp', 'on', 'mixed']);
      let a, b;
      if (fam === 'lacp') { a = rng.pick(EC_LACP); b = rng.pick(EC_LACP); }
      else if (fam === 'pagp') { a = rng.pick(EC_PAGP); b = rng.pick(EC_PAGP); }
      else if (fam === 'on') { a = 'on'; b = rng.pick(['on', 'on', 'active', 'passive', 'desirable', 'auto']); }
      else { a = rng.pick(EC_LACP); b = rng.pick(EC_PAGP); }
      if (rng.chance(0.5)) [a, b] = [b, a];
      const lacp = T('An EtherChannel forms using LACP', 'Образуется EtherChannel по LACP', 'נוצר EtherChannel עם LACP');
      const pagp = T('An EtherChannel forms using PAgP', 'Образуется EtherChannel по PAgP', 'נוצר EtherChannel עם PAgP');
      const stat = T('An EtherChannel forms without negotiation (static)', 'Образуется EtherChannel без согласования (статический)', 'נוצר EtherChannel בלי משא ומתן (סטטי)');
      const none = T('No EtherChannel forms', 'EtherChannel не образуется', 'לא נוצר EtherChannel');
      let right, why;
      if (a === 'on' || b === 'on') {
        right = a === b ? stat : none;
        why = a === b ? T('"on" + "on" bundles the links without any protocol.', '«on» + «on» объединяет каналы без протокола.', '"on" + ‏"on" מאחד את הקישורים בלי פרוטוקול.') : T('"on" sends no negotiation packets, so it works only with "on".', '«on» не отправляет пакеты согласования, поэтому работает только с «on».', '"on" לא שולח הודעות משא ומתן, ולכן עובד רק מול "on".');
      } else if (EC_LACP.includes(a) && EC_LACP.includes(b)) {
        right = a === 'active' || b === 'active' ? lacp : none;
        why = T('LACP needs at least one "active" side.', 'LACP нужна хотя бы одна сторона «active».', 'LACP צריך לפחות צד אחד ב-"active".');
      } else if (EC_PAGP.includes(a) && EC_PAGP.includes(b)) {
        right = a === 'desirable' || b === 'desirable' ? pagp : none;
        why = T('PAgP needs at least one "desirable" side.', 'PAgP нужна хотя бы одна сторона «desirable».', 'PAgP צריך לפחות צד אחד ב-"desirable".');
      } else {
        right = none;
        why = T('One side speaks LACP, the other PAgP — they cannot negotiate.', 'Одна сторона говорит на LACP, другая на PAgP — согласоваться они не могут.', 'צד אחד מדבר LACP והשני PAgP — הם לא יכולים לנהל משא ומתן.');
      }
      return lGen(T('S1: "channel-group 1 mode ' + a + '". S2: "channel-group 1 mode ' + b + '". What happens?', 'S1: «channel-group 1 mode ' + a + '». S2: «channel-group 1 mode ' + b + '». Что получится?', 'S1: ‏"channel-group 1 mode ' + a + '". ‏S2: ‏"channel-group 1 mode ' + b + '". מה יקרה?'),
        right, rng.shuffle([lacp, pagp, stat, none]), why);
    },
    function genEcCommand(rng) {
      const lacp = rng.chance(0.5), start = rng.chance(0.5), n = rng.int(1, 6), ports = rng.pick(['G0/1 - 2', 'Fa0/1 - 4', 'G1/0/1 - 2']);
      const mode = lacp ? (start ? 'active' : 'passive') : (start ? 'desirable' : 'auto');
      const proto = lacp ? 'LACP' : 'PAgP';
      return lGen(T('Bundle ' + ports + ' into Port-channel ' + n + ' with ' + proto + '. This switch must ' + (start ? 'START the negotiation' : 'only RESPOND to the other side') + '. Which interface command do you use?',
        'Объедините ' + ports + ' в Port-channel ' + n + ' по ' + proto + '. Этот коммутатор должен ' + (start ? 'НАЧИНАТЬ согласование' : 'только ОТВЕЧАТЬ другой стороне') + '. Какую команду интерфейса использовать?',
        'צריך לאחד את ' + ports + ' ל-Port-channel ' + n + ' עם ' + proto + '. המתג הזה צריך ' + (start ? 'להתחיל את המשא ומתן' : 'רק לענות לצד השני') + '. באיזו פקודת ממשק משתמשים?'),
        'channel-group ' + n + ' mode ' + mode, rng.shuffle(['active', 'passive', 'desirable', 'auto', 'on'].filter((m) => m !== mode)).map((m) => 'channel-group ' + n + ' mode ' + m),
        T(proto + ': ' + (lacp ? 'active starts, passive only answers' : 'desirable starts, auto only answers') + '; "on" does not negotiate at all.',
          proto + ': ' + (lacp ? 'active начинает, passive только отвечает' : 'desirable начинает, auto только отвечает') + '; «on» вообще не согласует.',
          proto + ': ' + (lacp ? 'active מתחיל, ‏passive רק עונה' : 'desirable מתחיל, ‏auto רק עונה') + '; ‏"on" לא מנהל משא ומתן בכלל.'));
    },
  ],
});

// ---------------------------------------------------------------
function lHex2(n) { return ('0' + n.toString(16)).slice(-2); }

lessonDef({
  id: 'srwe08', topic: null, drill: 'ipv6', minutes: 15,
  title: T('SLAAC and DHCPv6', 'SLAAC и DHCPv6', 'SLAAC ו-DHCPv6'),
  goal: T('How an IPv6 host gets its address: Router Advertisements and the A/O/M flags, SLAAC with EUI-64 or random IDs, stateless and stateful DHCPv6, and the router configuration.',
    'Как IPv6-хост получает адрес: Router Advertisement и флаги A/O/M, SLAAC с EUI-64 или случайным ID, DHCPv6 без состояния и с состоянием, настройка маршрутизатора.',
    'איך מארח IPv6 מקבל כתובת: הודעות Router Advertisement והדגלים A/O/M, ‏SLAAC עם EUI-64 או מזהה אקראי, ‏DHCPv6 בלי מצב ועם מצב, והגדרת הנתב.'),
  sections: [
    lSec(['Router Solicitation and Router Advertisement', 'Router Solicitation и Router Advertisement', 'Router Solicitation ו-Router Advertisement'],
      lP(['An IPv6 host first creates its own link-local address (FE80::/10). Then it sends a Router Solicitation (RS, ICMPv6 type 133) to FF02::2 (all routers). Routers answer with a Router Advertisement (RA, type 134) — and also send RAs every 200 seconds to FF02::1 (all nodes).',
        'IPv6-хост сначала сам создаёт link-local адрес (FE80::/10). Затем отправляет Router Solicitation (RS, ICMPv6 тип 133) на FF02::2 (все маршрутизаторы). Маршрутизаторы отвечают Router Advertisement (RA, тип 134) — и ещё рассылают RA каждые 200 секунд на FF02::1 (все узлы).',
        'מארח IPv6 יוצר קודם בעצמו כתובת link-local ‏(FE80::/10). אחר כך הוא שולח Router Solicitation ‏(RS, ‏ICMPv6 סוג 133) לכתובת FF02::2 (כל הנתבים). הנתבים עונים ב-Router Advertisement ‏(RA, סוג 134) — וגם שולחים RA כל 200 שניות לכתובת FF02::1 (כל הצמתים).']),
      lUL([
        ['The RA carries the prefix, the prefix length and the router\'s link-local address — the hosts\' default gateway.', 'RA содержит префикс, длину префикса и link-local адрес маршрутизатора — шлюз по умолчанию для хостов.', 'ה-RA מכיל את הקידומת, אורך הקידומת ואת כתובת ה-link-local של הנתב — שער ברירת המחדל של המארחים.'],
        ['A router sends RAs only after "ipv6 unicast-routing".', 'Маршрутизатор отправляет RA только после «ipv6 unicast-routing».', 'נתב שולח RA רק אחרי "ipv6 unicast-routing".'],
        ['DHCPv6 never gives a default gateway — that always comes from the RA.', 'DHCPv6 никогда не выдаёт шлюз по умолчанию — он всегда берётся из RA.', 'DHCPv6 אף פעם לא נותן שער ברירת מחדל — הוא תמיד מגיע מה-RA.'],
      ])),
    lSec(['Three methods: the A, O and M flags', 'Три способа: флаги A, O и M', 'שלוש שיטות: הדגלים A, ‏O ו-M'],
      lTable([['Method', 'Способ', 'שיטה'], ['RA flags', 'Флаги RA', 'דגלי RA'], ['Address from', 'Адрес из', 'הכתובת מגיעה מ-'], ['DNS etc. from', 'DNS и др. из', 'DNS וכו\' מגיעים מ-']], [
        [['1. SLAAC only (default)', '1. Только SLAAC (по умолчанию)', '1. רק SLAAC (ברירת מחדל)'], 'A=1 O=0 M=0', ['RA prefix + own interface ID', 'Префикс из RA + свой ID интерфейса', 'קידומת מה-RA + מזהה ממשק עצמי'], ['RA (RDNSS) or nothing', 'RA (RDNSS) или ниоткуда', 'RA ‏(RDNSS) או מאף מקום']],
        [['2. SLAAC + stateless DHCPv6', '2. SLAAC + DHCPv6 без состояния', '2. ‏SLAAC + ‏DHCPv6 בלי מצב'], 'A=1 O=1 M=0', 'SLAAC', ['DHCPv6 server', 'Сервер DHCPv6', 'שרת DHCPv6']],
        [['3. Stateful DHCPv6', '3. DHCPv6 с состоянием', '3. ‏DHCPv6 עם מצב'], 'A=0 M=1', ['DHCPv6 server', 'Сервер DHCPv6', 'שרת DHCPv6'], ['DHCPv6 server', 'Сервер DHCPv6', 'שרת DHCPv6']],
      ]),
      lCode('R1(config-if)# ipv6 nd other-config-flag          ! O=1 → method 2\nR1(config-if)# ipv6 nd managed-config-flag        ! M=1 → method 3\nR1(config-if)# ipv6 nd prefix default no-autoconfig  ! A=0 → no SLAAC'),
      lTip(['"Stateless" means the server does not track which host has which address — it only hands out options like DNS. "Stateful" means it leases and remembers addresses, like DHCPv4.', '«Без состояния» значит, что сервер не помнит, у кого какой адрес, — он раздаёт только параметры вроде DNS. «С состоянием» — сдаёт адреса в аренду и запоминает их, как DHCPv4.', '"בלי מצב" (stateless) אומר שהשרת לא זוכר לאיזה מארח יש איזו כתובת — הוא נותן רק אפשרויות כמו DNS. "עם מצב" (stateful) אומר שהוא מחכיר כתובות וזוכר אותן, כמו DHCPv4.'])),
    lSec(['SLAAC: building the interface ID', 'SLAAC: как строится ID интерфейса', 'SLAAC: איך נבנה מזהה הממשק'],
      lP(['With SLAAC the host takes the /64 prefix from the RA and creates the last 64 bits itself — either EUI-64 from its MAC, or a random number (Windows does this by default for privacy).',
        'При SLAAC хост берёт префикс /64 из RA, а последние 64 бита создаёт сам — по EUI-64 из своего MAC или случайным числом (Windows по умолчанию делает так ради приватности).',
        'ב-SLAAC המארח לוקח את קידומת ה-‎/64 מה-RA ויוצר בעצמו את 64 הסיביות האחרונות — או EUI-64 מכתובת ה-MAC, או מספר אקראי (Windows עושה את זה כברירת מחדל בשביל פרטיות).']),
      lCode('MAC:              00-1A-2B-3C-4D-5E\n1. split:         001A2B | 3C4D5E\n2. insert FFFE:    001A2B FFFE 3C4D5E\n3. flip bit 7:     00 → 02\nInterface ID:     021a:2bff:fe3c:4d5e\nAddress:          2001:db8:acad:1:21a:2bff:fe3c:4d5e', ['EUI-64 step by step', 'EUI-64 по шагам', 'EUI-64 צעד אחר צעד']),
      lP(['Before using the address the host runs Duplicate Address Detection (DAD): it sends a Neighbor Solicitation for its own address; if nobody answers, the address is unique.',
        'Перед использованием адреса хост выполняет обнаружение дубликатов (DAD): отправляет Neighbor Solicitation на свой же адрес; если никто не ответил — адрес уникален.',
        'לפני שהמארח משתמש בכתובת הוא מבצע זיהוי כתובות כפולות (DAD): הוא שולח Neighbor Solicitation לכתובת של עצמו; אם אף אחד לא עונה — הכתובת ייחודית.'])),
    lSec(['How DHCPv6 works', 'Как работает DHCPv6', 'איך DHCPv6 עובד'],
      lUL([
        ['SOLICIT — the client looks for servers at FF02::1:2 (all DHCPv6 servers and relays).', 'SOLICIT — клиент ищет серверы по адресу FF02::1:2 (все серверы и relay DHCPv6).', 'SOLICIT — הלקוח מחפש שרתים בכתובת FF02::1:2 (כל שרתי ה-DHCPv6 וה-relay).'],
        ['ADVERTISE — a server answers.', 'ADVERTISE — сервер отвечает.', 'ADVERTISE — שרת עונה.'],
        ['REQUEST (stateful) or INFORMATION-REQUEST (stateless) — the client asks.', 'REQUEST (с состоянием) или INFORMATION-REQUEST (без состояния) — клиент запрашивает.', 'REQUEST (עם מצב) או INFORMATION-REQUEST (בלי מצב) — הלקוח מבקש.'],
        ['REPLY — the server sends the address and/or options.', 'REPLY — сервер присылает адрес и/или параметры.', 'REPLY — השרת שולח את הכתובת ו/או האפשרויות.'],
        ['UDP 546 = client, UDP 547 = server.', 'UDP 546 — клиент, UDP 547 — сервер.', 'UDP 546 = לקוח, ‏UDP 547 = שרת.'],
      ])),
    lSec(['Router configuration', 'Настройка маршрутизатора', 'הגדרת הנתב'],
      lCode('! Stateless DHCPv6 server (method 2)\nR1(config)# ipv6 unicast-routing\nR1(config)# ipv6 dhcp pool STATELESS\nR1(config-dhcpv6)# dns-server 2001:db8:acad:1::254\nR1(config-dhcpv6)# domain-name example.com\nR1(config)# interface g0/0/1\nR1(config-if)# ipv6 address 2001:db8:acad:1::1/64\nR1(config-if)# ipv6 dhcp server STATELESS\nR1(config-if)# ipv6 nd other-config-flag\n\n! Stateful DHCPv6 server (method 3)\nR1(config)# ipv6 dhcp pool STATEFUL\nR1(config-dhcpv6)# address prefix 2001:db8:acad:1::/64\nR1(config-dhcpv6)# dns-server 2001:4860:4860::8888\nR1(config)# interface g0/0/1\nR1(config-if)# ipv6 dhcp server STATEFUL\nR1(config-if)# ipv6 nd managed-config-flag\nR1(config-if)# ipv6 nd prefix default no-autoconfig'),
      lUL([
        ['Relay to a server in another network: ipv6 dhcp relay destination 2001:db8:acad:2::2 (on the clients\' interface).', 'Relay на сервер в другой сети: ipv6 dhcp relay destination 2001:db8:acad:2::2 (на интерфейсе со стороны клиентов).', 'Relay לשרת ברשת אחרת: ipv6 dhcp relay destination 2001:db8:acad:2::2 (על הממשק בצד הלקוחות).'],
        ['A router as a client: ipv6 address autoconfig (SLAAC) or ipv6 address dhcp (stateful).', 'Маршрутизатор как клиент: ipv6 address autoconfig (SLAAC) или ipv6 address dhcp (с состоянием).', 'נתב כלקוח: ipv6 address autoconfig ‏(SLAAC) או ipv6 address dhcp (עם מצב).'],
        ['Verify: show ipv6 dhcp pool, show ipv6 dhcp binding, show ipv6 interface; on a PC: ipconfig /all.', 'Проверка: show ipv6 dhcp pool, show ipv6 dhcp binding, show ipv6 interface; на ПК — ipconfig /all.', 'בדיקה: show ipv6 dhcp pool, ‏show ipv6 dhcp binding, ‏show ipv6 interface; במחשב — ipconfig /all.'],
      ])),
  ],
  quiz: [
    lQ(['Which ICMPv6 message does a router use to tell hosts the prefix and gateway?', 'Каким сообщением ICMPv6 маршрутизатор сообщает хостам префикс и шлюз?', 'באיזו הודעת ICMPv6 הנתב מודיע למארחים על הקידומת והשער?'], [['Router Advertisement (type 134)', 'Router Advertisement (тип 134)', 'Router Advertisement (סוג 134)'], ['Router Solicitation (type 133)', 'Router Solicitation (тип 133)', 'Router Solicitation (סוג 133)'], ['Neighbor Solicitation (type 135)', 'Neighbor Solicitation (тип 135)', 'Neighbor Solicitation (סוג 135)'], ['Echo Reply (type 129)', 'Echo Reply (тип 129)', 'Echo Reply (סוג 129)']], 0,
      ['Hosts send RS, routers answer with RA.', 'Хосты отправляют RS, маршрутизаторы отвечают RA.', 'המארחים שולחים RS, הנתבים עונים ב-RA.']),
    lQ(['RA flags are A=1, O=0, M=0 (the default). How do hosts get their address?', 'Флаги RA: A=1, O=0, M=0 (по умолчанию). Как хосты получают адрес?', 'דגלי ה-RA הם A=1, ‏O=0, ‏M=0 (ברירת מחדל). איך המארחים מקבלים כתובת?'], [['SLAAC only', 'Только SLAAC', 'רק SLAAC'], ['Stateful DHCPv6', 'DHCPv6 с состоянием', 'DHCPv6 עם מצב'], ['SLAAC + stateless DHCPv6', 'SLAAC + DHCPv6 без состояния', 'SLAAC + ‏DHCPv6 בלי מצב'], ['DHCPv4', 'DHCPv4', 'DHCPv4']], 0,
      ['No O and no M flag = no DHCPv6 at all.', 'Нет флагов O и M — DHCPv6 не используется.', 'בלי דגל O ובלי דגל M — אין DHCPv6 בכלל.']),
    lQ(['Which interface command tells hosts to get DNS from a stateless DHCPv6 server?', 'Какая команда интерфейса говорит хостам брать DNS у DHCPv6-сервера без состояния?', 'איזו פקודת ממשק אומרת למארחים לקבל DNS משרת DHCPv6 בלי מצב?'], ['ipv6 nd other-config-flag', 'ipv6 nd managed-config-flag', 'ipv6 address autoconfig', 'ipv6 dhcp relay destination'], 0,
      ['O = other configuration; M = managed (stateful).', 'O — other (прочие параметры); M — managed (с состоянием).', 'O = הגדרות אחרות; ‏M = מנוהל (עם מצב).']),
    lQ(['Where does an IPv6 host get its default gateway?', 'Откуда IPv6-хост получает шлюз по умолчанию?', 'מאיפה מארח IPv6 מקבל את שער ברירת המחדל?'], [['From the RA — the router\'s link-local address', 'Из RA — link-local адрес маршрутизатора', 'מה-RA — כתובת ה-link-local של הנתב'], ['From the stateful DHCPv6 server', 'От DHCPv6-сервера с состоянием', 'משרת DHCPv6 עם מצב'], ['From DNS', 'От DNS', 'מ-DNS'], ['It is always FE80::1', 'Это всегда FE80::1', 'זה תמיד FE80::1']], 0,
      ['DHCPv6 has no gateway option.', 'В DHCPv6 нет параметра шлюза.', 'ל-DHCPv6 אין אפשרות של שער.']),
    lQ(['What does Duplicate Address Detection do?', 'Что делает обнаружение дубликатов адресов (DAD)?', 'מה עושה זיהוי כתובות כפולות (DAD)?'], [['Checks with a Neighbor Solicitation that nobody else uses the address', 'Проверяет через Neighbor Solicitation, что адрес никто не использует', 'בודק עם Neighbor Solicitation שאף אחד אחר לא משתמש בכתובת'], ['Deletes duplicate routes', 'Удаляет дублирующиеся маршруты', 'מוחק נתיבים כפולים'], ['Finds duplicate MAC addresses in the switch', 'Ищет дубли MAC-адресов в коммутаторе', 'מוצא כתובות MAC כפולות במתג'], ['Removes duplicate DHCP leases', 'Удаляет дублирующиеся аренды DHCP', 'מוחק חכירות DHCP כפולות']], 0,
      ['No Neighbor Advertisement in reply = the address is free.', 'Нет ответа Neighbor Advertisement — адрес свободен.', 'אין תשובת Neighbor Advertisement — הכתובת פנויה.']),
    lQ(['To which address does a DHCPv6 client send its SOLICIT?', 'На какой адрес клиент DHCPv6 отправляет SOLICIT?', 'לאיזו כתובת לקוח DHCPv6 שולח את ה-SOLICIT?'], ['FF02::1:2', 'FF02::1', 'FF02::2', 'FE80::1'], 0,
      ['FF02::1 = all nodes, FF02::2 = all routers.', 'FF02::1 — все узлы, FF02::2 — все маршрутизаторы.', 'FF02::1 = כל הצמתים, ‏FF02::2 = כל הנתבים.']),
    lQ(['Which UDP ports does DHCPv6 use?', 'Какие UDP-порты использует DHCPv6?', 'באילו פורטי UDP משתמש DHCPv6?'], ['546 / 547', '67 / 68', '53', '161 / 162'], 0,
      ['67/68 are DHCPv4, 161/162 SNMP.', '67/68 — DHCPv4, 161/162 — SNMP.', '‏67/68 הם DHCPv4, ‏161/162 הם SNMP.']),
    lQ(['IPv6 addresses are configured on R1, but PCs get no RA. What is missing?', 'IPv6-адреса на R1 настроены, но ПК не получают RA. Чего не хватает?', 'כתובות IPv6 מוגדרות ב-R1, אבל המחשבים לא מקבלים RA. מה חסר?'], ['ipv6 unicast-routing', 'ipv6 enable', 'ip routing', 'ipv6 nd other-config-flag'], 0,
      ['Without it the router acts like a host and sends no RAs.', 'Без неё маршрутизатор ведёт себя как хост и не отправляет RA.', 'בלעדיה הנתב מתנהג כמו מארח ולא שולח RA.']),
  ],
  gen: [
    function genEui64(rng) {
      const b = [rng.pick([0x00, 0x00, 0x02, 0x08, 0x0c, 0x50, 0x70, 0xa4, 0xd4, 0xf0]) | 0, rng.int(0, 255), rng.int(0, 255), rng.int(0, 255), rng.int(0, 255), rng.int(0, 255)];
      const mac = b.map((x) => lHex2(x).toUpperCase()).join('-');
      const id = (b0) => lHex2(b0) + lHex2(b[1]) + ':' + lHex2(b[2]) + 'ff:fe' + lHex2(b[3]) + ':' + lHex2(b[4]) + lHex2(b[5]);
      const right = id(b[0] ^ 2);
      return lGen(T('An interface has MAC ' + mac + ' and builds its IPv6 interface ID with EUI-64. What is the interface ID?', 'У интерфейса MAC ' + mac + ', и он строит ID интерфейса IPv6 по EUI-64. Какой ID получится?', 'לממשק יש MAC ' + mac + ' והוא בונה את מזהה הממשק של IPv6 עם EUI-64. מה יהיה המזהה?'),
        right, rng.shuffle([id(b[0]), id(b[0] ^ 1), lHex2(b[0] ^ 2) + lHex2(b[1]) + ':' + lHex2(b[2]) + lHex2(b[3]) + ':fffe:' + lHex2(b[4]) + lHex2(b[5]), lHex2(b[0] ^ 2) + lHex2(b[1]) + ':' + lHex2(b[2]) + 'fe:ff' + lHex2(b[3]) + ':' + lHex2(b[4]) + lHex2(b[5])]),
        T('Split the MAC in half, insert FFFE in the middle and flip the 7th bit of the first byte: ' + lHex2(b[0]) + ' → ' + lHex2(b[0] ^ 2) + '.', 'Делим MAC пополам, вставляем FFFE в середину и инвертируем 7-й бит первого байта: ' + lHex2(b[0]) + ' → ' + lHex2(b[0] ^ 2) + '.', 'מחלקים את ה-MAC לשניים, מכניסים FFFE באמצע והופכים את הסיבית השביעית של הבית הראשון: ' + lHex2(b[0]) + ' → ' + lHex2(b[0] ^ 2) + '.'));
    },
    function genRaFlags(rng) {
      const m = rng.int(0, 2), asCode = rng.chance(0.5);
      const opts = [
        T('SLAAC only: prefix from the RA, interface ID made by the host', 'Только SLAAC: префикс из RA, ID интерфейса хост создаёт сам', 'רק SLAAC: קידומת מה-RA, ומזהה הממשק נוצר על ידי המארח'),
        T('SLAAC for the address, stateless DHCPv6 for DNS and other options', 'SLAAC для адреса, DHCPv6 без состояния для DNS и других параметров', 'SLAAC לכתובת, ‏DHCPv6 בלי מצב ל-DNS ולשאר האפשרויות'),
        T('Stateful DHCPv6 gives the address and the options', 'DHCPv6 с состоянием выдаёт и адрес, и параметры', 'DHCPv6 עם מצב נותן גם את הכתובת וגם את האפשרויות'),
        T('Static addresses only — the router sends no RAs', 'Только статические адреса — маршрутизатор не отправляет RA', 'רק כתובות סטטיות — הנתב לא שולח RA'),
      ];
      const flags = ['A=1, O=0, M=0', 'A=1, O=1, M=0', 'A=0, O=0, M=1'][m];
      const why = [T('No O and no M flag: hosts use SLAAC only.', 'Флагов O и M нет: хосты используют только SLAAC.', 'אין דגל O ואין דגל M: המארחים משתמשים רק ב-SLAAC.'),
        T('A=1 and O=1: address by SLAAC, other options from a stateless DHCPv6 server.', 'A=1 и O=1: адрес по SLAAC, остальные параметры — от DHCPv6 без состояния.', 'A=1 ו-O=1: כתובת ב-SLAAC, ושאר האפשרויות משרת DHCPv6 בלי מצב.'),
        T('M=1 and A=0: everything comes from a stateful DHCPv6 server (the gateway still comes from the RA).', 'M=1 и A=0: всё выдаёт DHCPv6 с состоянием (шлюз всё равно из RA).', 'M=1 ו-A=0: הכול מגיע משרת DHCPv6 עם מצב (השער עדיין מגיע מה-RA).')][m];
      if (!asCode) {
        return lGen(T('R1 sends Router Advertisements with ' + flags + '. How do the hosts get their IPv6 settings?', 'R1 отправляет Router Advertisement с флагами ' + flags + '. Как хосты получают настройки IPv6?', 'R1 שולח Router Advertisement עם הדגלים ' + flags + '. איך המארחים מקבלים את הגדרות ה-IPv6?'),
          opts[m], opts.filter((_, i) => i !== m), why);
      }
      const q = lGen(T('R1 has "ipv6 unicast-routing" and this LAN interface. How do the hosts on the LAN get their IPv6 settings?', 'На R1 есть «ipv6 unicast-routing» и такой интерфейс LAN. Как хосты в LAN получают настройки IPv6?', 'ב-R1 מוגדר "ipv6 unicast-routing" וממשק ה-LAN הזה. איך המארחים ב-LAN מקבלים את הגדרות ה-IPv6?'),
        opts[m], opts.filter((_, i) => i !== m), why);
      q.code = 'interface g0/0/1\n ipv6 address 2001:db8:acad:' + rng.int(1, 99) + '::1/64' + (m >= 1 ? '\n ipv6 dhcp server POOL' + m : '') + ['', '\n ipv6 nd other-config-flag', '\n ipv6 nd managed-config-flag\n ipv6 nd prefix default no-autoconfig'][m];
      return q;
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'srwe09', topic: null, drill: 'l2', minutes: 13,
  title: T('FHRP Concepts', 'Протоколы резервирования шлюза (FHRP)', 'עקרונות FHRP'),
  goal: T('Why the default gateway is a single point of failure, how HSRP, VRRP and GLBP share a virtual gateway, HSRP election, preemption, configuration and verification.',
    'Почему шлюз по умолчанию — единая точка отказа, как HSRP, VRRP и GLBP создают общий виртуальный шлюз, выборы HSRP, вытеснение (preempt), настройка и проверка.',
    'למה שער ברירת המחדל הוא נקודת כשל יחידה, איך HSRP, ‏VRRP ו-GLBP חולקים שער וירטואלי, הבחירות ב-HSRP, ‏preempt, הגדרה ובדיקה.'),
  sections: [
    lSec(['The problem: one default gateway', 'Проблема: один шлюз по умолчанию', 'הבעיה: שער ברירת מחדל אחד'],
      lP(['Hosts have one default gateway address. Even with two routers on the LAN, if the gateway router fails the hosts lose access to other networks — they do not switch to the second router by themselves.',
        'У хостов один адрес шлюза по умолчанию. Даже если в LAN два маршрутизатора, при отказе шлюза хосты теряют доступ к другим сетям — сами на второй маршрутизатор они не переключатся.',
        'למארחים יש כתובת אחת של שער ברירת מחדל. גם אם יש שני נתבים ב-LAN, כשנתב השער נופל המארחים מאבדים גישה לרשתות אחרות — הם לא עוברים לבד לנתב השני.']),
      lP(['A First Hop Redundancy Protocol (FHRP) makes several routers act as ONE virtual router with a virtual IP and a virtual MAC. Hosts use the virtual IP as their gateway; if the active router fails, another router takes over the same IP and MAC and the hosts notice nothing.',
        'Протокол резервирования первого перехода (FHRP) заставляет несколько маршрутизаторов работать как ОДИН виртуальный маршрутизатор с виртуальными IP и MAC. Хосты указывают виртуальный IP как шлюз; если активный маршрутизатор отказал, другой забирает те же IP и MAC, и хосты ничего не замечают.',
        'פרוטוקול יתירות לקפיצה הראשונה (FHRP) גורם לכמה נתבים לפעול כנתב וירטואלי אחד עם IP וירטואלי ו-MAC וירטואלי. המארחים משתמשים ב-IP הווירטואלי כשער; אם הנתב הפעיל נופל, נתב אחר לוקח את אותם IP ו-MAC והמארחים לא מרגישים כלום.'])),
    lSec(['FHRP options', 'Варианты FHRP', 'סוגי FHRP'],
      lTable([['Protocol', 'Протокол', 'פרוטוקול'], ['Standard', 'Стандарт', 'תקן'], ['How it works', 'Как работает', 'איך זה עובד']], [
        ['HSRP / HSRP for IPv6', ['Cisco', 'Cisco', 'Cisco'], ['One active router forwards, one standby waits', 'Один активный маршрутизатор пересылает, один резервный (standby) ждёт', 'נתב active אחד מעביר תעבורה, ונתב standby אחד ממתין']],
        ['VRRPv2 / VRRPv3', ['Open standard (IETF)', 'Открытый стандарт (IETF)', 'תקן פתוח (IETF)'], ['One master, backups; v3 supports IPv6; virtual MAC 0000.5e00.01XX', 'Один master и резервные (backup); v3 поддерживает IPv6; виртуальный MAC 0000.5e00.01XX', 'Master אחד ונתבי backup; ‏v3 תומך ב-IPv6; ‏MAC וירטואלי 0000.5e00.01XX']],
        ['GLBP / GLBP for IPv6', ['Cisco', 'Cisco', 'Cisco'], ['Redundancy AND load balancing across several routers', 'Резервирование И балансировка нагрузки между несколькими маршрутизаторами', 'יתירות וגם איזון עומסים בין כמה נתבים']],
        ['IRDP', ['Legacy (RFC 1256)', 'Устаревший (RFC 1256)', 'ותיק (RFC 1256)'], ['Hosts discover routers from ICMP messages', 'Хосты узнают о маршрутизаторах из сообщений ICMP', 'המארחים מגלים נתבים מהודעות ICMP']],
      ])),
    lSec(['HSRP: election and preemption', 'HSRP: выборы и вытеснение', 'HSRP: בחירות ו-preempt'],
      lUL([
        ['The router with the highest priority becomes active (default 100, range 0–255). On a tie, the highest interface IP address wins.', 'Активным становится маршрутизатор с наибольшим приоритетом (по умолчанию 100, диапазон 0–255). При равенстве побеждает наибольший IP-адрес интерфейса.', 'הנתב עם העדיפות הגבוהה ביותר הופך ל-active (ברירת מחדל 100, טווח 0–255). בשוויון מנצחת כתובת ה-IP הגבוהה ביותר בממשק.'],
        ['Hellos every 3 seconds; if the standby hears nothing for 10 seconds (hold time), it becomes active.', 'Hello каждые 3 секунды; если standby ничего не слышит 10 секунд (hold time), он становится активным.', 'Hello כל 3 שניות; אם ה-standby לא שומע כלום במשך 10 שניות (hold time), הוא הופך ל-active.'],
        ['Preemption is OFF by default: a router with a higher priority that comes back later does NOT take over unless "standby preempt" is configured.', 'Вытеснение по умолчанию ВЫКЛЮЧЕНО: маршрутизатор с большим приоритетом, вернувшийся позже, НЕ забирает роль, пока не настроен «standby preempt».', 'Preempt כבוי כברירת מחדל: נתב עם עדיפות גבוהה יותר שחוזר מאוחר יותר לא לוקח את התפקיד, אלא אם הוגדר "standby preempt".'],
        ['States: initial → learn → listen → speak → standby → active.', 'Состояния: initial → learn → listen → speak → standby → active.', 'מצבים: initial → learn → listen → speak → standby → active.'],
        ['Virtual MAC: version 1 = 0000.0c07.acXX, version 2 = 0000.0c9f.fXXX (XX/XXX = group number in hex).', 'Виртуальный MAC: версия 1 = 0000.0c07.acXX, версия 2 = 0000.0c9f.fXXX (XX/XXX — номер группы в hex).', 'MAC וירטואלי: גרסה 1 = 0000.0c07.acXX, גרסה 2 = 0000.0c9f.fXXX ‏(XX/XXX = מספר הקבוצה ב-hex).'],
      ])),
    lSec(['HSRP configuration and verification', 'Настройка и проверка HSRP', 'הגדרת HSRP ובדיקה'],
      lCode('R1(config)# interface g0/1\nR1(config-if)# ip address 192.168.1.2 255.255.255.0\nR1(config-if)# standby version 2\nR1(config-if)# standby 1 ip 192.168.1.254\nR1(config-if)# standby 1 priority 150\nR1(config-if)# standby 1 preempt\n\nR2(config)# interface g0/1\nR2(config-if)# ip address 192.168.1.3 255.255.255.0\nR2(config-if)# standby version 2\nR2(config-if)# standby 1 ip 192.168.1.254\n\nR1# show standby brief\nInterface   Grp  Pri P State   Active          Standby         Virtual IP\nGi0/1       1    150 P Active  local           192.168.1.3     192.168.1.254'),
      lTip(['The PCs\' default gateway is the VIRTUAL IP 192.168.1.254 — not the real address of R1 or R2.', 'Шлюз по умолчанию на ПК — ВИРТУАЛЬНЫЙ IP 192.168.1.254, а не реальный адрес R1 или R2.', 'שער ברירת המחדל במחשבים הוא ה-IP הווירטואלי 192.168.1.254 — לא הכתובת האמיתית של R1 או R2.'])),
  ],
  quiz: [
    lQ(['Which problem does an FHRP solve?', 'Какую проблему решает FHRP?', 'איזו בעיה FHRP פותר?'], [['The default gateway is a single point of failure', 'Шлюз по умолчанию — единая точка отказа', 'שער ברירת המחדל הוא נקודת כשל יחידה'], ['Layer 2 loops', 'Петли 2-го уровня', 'לולאות בשכבה 2'], ['Running out of IP addresses', 'Нехватка IP-адресов', 'מחסור בכתובות IP'], ['Slow DNS', 'Медленный DNS', 'DNS איטי']], 0,
      ['Several routers share one virtual gateway.', 'Несколько маршрутизаторов делят один виртуальный шлюз.', 'כמה נתבים חולקים שער וירטואלי אחד.']),
    lQ(['With HSRP, which address do PCs use as their default gateway?', 'Какой адрес ПК используют как шлюз при HSRP?', 'באיזו כתובת המחשבים משתמשים כשער ברירת מחדל עם HSRP?'], [['The virtual IP address', 'Виртуальный IP-адрес', 'כתובת ה-IP הווירטואלית'], ['The active router\'s real IP', 'Реальный IP активного маршрутизатора', 'ה-IP האמיתי של הנתב הפעיל'], ['The standby router\'s IP', 'IP резервного маршрутизатора', 'ה-IP של נתב ה-standby'], ['The switch\'s SVI', 'SVI коммутатора', 'ה-SVI של המתג']], 0,
      ['That way nothing changes on the PCs when a router fails.', 'Так на ПК ничего не меняется при отказе маршрутизатора.', 'כך שום דבר לא משתנה במחשבים כשנתב נופל.']),
    lQ(['What is the default HSRP priority?', 'Какой приоритет HSRP по умолчанию?', 'מהי עדיפות ה-HSRP כברירת מחדל?'], ['100', '0', '255', '32768'], 0,
      ['32768 is the STP default.', '32768 — это значение по умолчанию в STP.', '32768 הוא ברירת המחדל של STP.']),
    lQ(['Two HSRP routers have the same priority. Which becomes active?', 'У двух маршрутизаторов HSRP одинаковый приоритет. Кто станет активным?', 'לשני נתבי HSRP יש אותה עדיפות. מי יהיה active?'], [['The one with the highest IP address', 'Тот, у кого наибольший IP-адрес', 'זה עם כתובת ה-IP הגבוהה ביותר'], ['The one with the lowest IP address', 'Тот, у кого наименьший IP-адрес', 'זה עם כתובת ה-IP הנמוכה ביותר'], ['The one with the lowest MAC', 'Тот, у кого наименьший MAC', 'זה עם ה-MAC הנמוך ביותר'], ['Both share the load', 'Оба делят нагрузку', 'שניהם מחלקים את העומס']], 0,
      ['Note: STP prefers LOW values, HSRP prefers HIGH.', 'Обратите внимание: STP предпочитает НИЗКИЕ значения, HSRP — ВЫСОКИЕ.', 'שימו לב: STP מעדיף ערכים נמוכים, ‏HSRP — גבוהים.']),
    lQ(['Which FHRP is an open standard?', 'Какой FHRP — открытый стандарт?', 'איזה FHRP הוא תקן פתוח?'], ['VRRP', 'HSRP', 'GLBP', 'PAgP'], 0,
      ['HSRP and GLBP are Cisco proprietary.', 'HSRP и GLBP — проприетарные протоколы Cisco.', 'HSRP ו-GLBP הם קנייניים של Cisco.']),
    lQ(['Which FHRP load-balances traffic across several routers in one group?', 'Какой FHRP распределяет нагрузку между несколькими маршрутизаторами одной группы?', 'איזה FHRP מאזן עומסים בין כמה נתבים בקבוצה אחת?'], ['GLBP', 'HSRP', 'VRRP', 'IRDP'], 0,
      ['GLBP = Gateway Load Balancing Protocol.', 'GLBP — Gateway Load Balancing Protocol.', 'GLBP = Gateway Load Balancing Protocol.']),
    lQ(['R1 (priority 150) reboots and comes back, but R2 (priority 100) stays active. Why?', 'R1 (приоритет 150) перезагрузился и вернулся, но R2 (приоритет 100) остаётся активным. Почему?', 'R1 (עדיפות 150) עלה מחדש, אבל R2 (עדיפות 100) נשאר active. למה?'], [['standby preempt is not configured on R1', 'На R1 не настроен standby preempt', 'ב-R1 לא מוגדר standby preempt'], ['R2 has a higher IP address', 'У R2 больший IP-адрес', 'ל-R2 יש כתובת IP גבוהה יותר'], ['The HSRP versions differ', 'Разные версии HSRP', 'גרסאות HSRP שונות'], ['The hold time is too short', 'Слишком короткий hold time', 'ה-hold time קצר מדי']], 0,
      ['Without preemption the current active router keeps the role.', 'Без вытеснения текущий активный маршрутизатор сохраняет роль.', 'בלי preempt הנתב הפעיל הנוכחי שומר על התפקיד.']),
    lQ(['Which command shows the HSRP state, priority and virtual IP?', 'Какая команда показывает состояние HSRP, приоритет и виртуальный IP?', 'איזו פקודה מציגה את מצב ה-HSRP, העדיפות וה-IP הווירטואלי?'], ['show standby brief', 'show hsrp table', 'show ip route', 'show vrrp interfaces'], 0,
      ['HSRP commands start with "standby".', 'Команды HSRP начинаются со «standby».', 'פקודות HSRP מתחילות ב-"standby".']),
  ],
  gen: [
    function genHsrpActive(rng) {
      const net = rng.chance(0.5) ? '192.168.' + rng.int(1, 250) + '.' : '10.' + rng.int(0, 255) + '.' + rng.int(0, 255) + '.';
      const last = rng.shuffle([2, 3, 4]);
      const rt = [0, 1, 2].map((i) => ({ name: 'R' + (i + 1), prio: rng.pick([90, 100, 100, 100, 110, 120, 150, 200]), ip: net + last[i] }));
      if (rng.chance(0.4)) rt[rng.int(0, 2)].prio = rt[rng.int(0, 2)].prio;
      const best = rt.slice().sort((a, b) => b.prio - a.prio || ipToInt(b.ip) - ipToInt(a.ip))[0];
      const tie = rt.filter((r) => r.prio === best.prio).length > 1;
      const q = lGen(T('Three routers in HSRP group 1 start at the same time. Which one becomes the active router?', 'Три маршрутизатора в группе HSRP 1 запускаются одновременно. Какой станет активным?', 'שלושה נתבים בקבוצת HSRP 1 עולים באותו זמן. איזה מהם יהיה ה-active?'),
        best.name, rt.filter((r) => r !== best).map((r) => r.name).concat([T('All three — they share the load', 'Все три — они делят нагрузку', 'שלושתם — הם מחלקים את העומס')]),
        tie ? T('The highest priority is ' + best.prio + ' on more than one router, so the highest IP address decides: ' + best.name + ' (' + best.ip + ').', 'Наибольший приоритет ' + best.prio + ' у нескольких маршрутизаторов, поэтому решает наибольший IP: ' + best.name + ' (' + best.ip + ').', 'העדיפות הגבוהה ביותר, ' + best.prio + ', נמצאת אצל יותר מנתב אחד, ולכן כתובת ה-IP הגבוהה מכריעה: ' + best.name + ' ‏(' + best.ip + ').')
          : T('The highest priority wins: ' + best.name + ' (' + best.prio + ').', 'Побеждает наибольший приоритет: ' + best.name + ' (' + best.prio + ').', 'העדיפות הגבוהה ביותר מנצחת: ' + best.name + ' ‏(' + best.prio + ').'));
      q.code = 'Router  Priority  Interface IP\n' + rt.map((r) => padR(r.name, 8) + padR(r.prio, 10) + r.ip).join('\n');
      return q;
    },
    function genHsrpMac(rng) {
      const kind = rng.pick(['HSRP version 1', 'HSRP version 2', 'VRRP']);
      const g = kind === 'HSRP version 2' ? rng.int(10, 999) : rng.int(10, 99);
      const v1 = (x) => '0000.0c07.ac' + x, v2 = (x) => '0000.0c9f.f' + x, vr = (x) => '0000.5e00.01' + x;
      const h2 = lHex2(g), h3 = ('00' + g.toString(16)).slice(-3), d2 = String(g), d3 = ('00' + g).slice(-3);
      const all = { 'HSRP version 1': [v1(h2), v1(d2)], 'HSRP version 2': [v2(h3), v2(d3)], VRRP: [vr(h2), vr(d2)] }[kind];
      const others = kind === 'VRRP' ? [v1(h2), v2(h3)] : kind === 'HSRP version 1' ? [vr(h2), v2(h3)] : [v1(lHex2(g % 256)), vr(lHex2(g % 256))];
      return lGen(T('Which virtual MAC address does ' + kind + ' group ' + g + ' use?', 'Какой виртуальный MAC-адрес использует ' + kind + ' группа ' + g + '?', 'באיזו כתובת MAC וירטואלית משתמשת קבוצה ' + g + ' של ' + kind + '?'),
        all[0], rng.shuffle([all[1]].concat(others)),
        T('HSRPv1 = 0000.0c07.acXX, HSRPv2 = 0000.0c9f.fXXX, VRRP = 0000.5e00.01XX; the group number is written in hex (' + g + ' = 0x' + g.toString(16) + ').',
          'HSRPv1 = 0000.0c07.acXX, HSRPv2 = 0000.0c9f.fXXX, VRRP = 0000.5e00.01XX; номер группы записывается в hex (' + g + ' = 0x' + g.toString(16) + ').',
          'HSRPv1 = 0000.0c07.acXX, ‏HSRPv2 = 0000.0c9f.fXXX, ‏VRRP = 0000.5e00.01XX; מספר הקבוצה נכתב ב-hex ‏(' + g + ' = 0x' + g.toString(16) + ').'));
    },
  ],
});

// ---------------------------------------------------------------
// Атака → лучшая защита (для генератора и теста).
const L2_MITIGATIONS = {
  psec: T('Port security', 'Port security', 'Port security'),
  dtp: T('Disable DTP: switchport mode access / switchport nonegotiate', 'Отключить DTP: switchport mode access / switchport nonegotiate', 'לכבות DTP: ‏switchport mode access / switchport nonegotiate'),
  native: T('Use an unused VLAN as the native VLAN', 'Сделать native VLAN неиспользуемым VLAN', 'להגדיר VLAN שלא בשימוש כ-native VLAN'),
  snoop: T('DHCP snooping', 'DHCP snooping', 'DHCP snooping'),
  dai: T('Dynamic ARP Inspection (DAI)', 'Dynamic ARP Inspection (DAI)', 'Dynamic ARP Inspection ‏(DAI)'),
  ipsg: T('IP Source Guard', 'IP Source Guard', 'IP Source Guard'),
  bpdu: T('BPDU Guard', 'BPDU Guard', 'BPDU Guard'),
  cdp: T('Disable CDP on edge ports (no cdp enable)', 'Отключить CDP на пограничных портах (no cdp enable)', 'לכבות CDP בפורטי קצה (no cdp enable)'),
};
const L2_ATTACKS = [
  ['psec', T('An attacker runs macof and fills the switch\'s MAC address table', 'Злоумышленник запускает macof и переполняет таблицу MAC-адресов коммутатора', 'תוקף מריץ macof וממלא את טבלת כתובות ה-MAC של המתג')],
  ['dtp', T('An attacker\'s PC negotiates a trunk with the switch using DTP', 'ПК злоумышленника согласует trunk с коммутатором через DTP', 'המחשב של התוקף מנהל משא ומתן על trunk עם המתג בעזרת DTP')],
  ['native', T('An attacker in the native VLAN sends frames with two 802.1Q tags', 'Злоумышленник в native VLAN отправляет кадры с двумя тегами 802.1Q', 'תוקף ב-native VLAN שולח מסגרות עם שני תגי 802.1Q')],
  ['snoop', T('A rogue DHCP server hands out a fake default gateway', 'Поддельный DHCP-сервер раздаёт ложный шлюз по умолчанию', 'שרת DHCP מזויף מחלק שער ברירת מחדל מזויף')],
  ['dai', T('An attacker sends gratuitous ARP replies claiming to be the default gateway', 'Злоумышленник рассылает самопроизвольные ARP-ответы, выдавая себя за шлюз', 'תוקף שולח תשובות ARP יזומות (gratuitous) ומתחזה לשער ברירת המחדל')],
  ['ipsg', T('A host uses an IP address that DHCP never gave it, to impersonate a server', 'Хост использует IP-адрес, который DHCP ему не выдавал, чтобы выдать себя за сервер', 'מארח משתמש בכתובת IP ש-DHCP אף פעם לא נתן לו, כדי להתחזות לשרת')],
  ['bpdu', T('A switch plugged into a user port sends BPDUs with priority 0 to become the root bridge', 'Коммутатор, подключённый к пользовательскому порту, шлёт BPDU с приоритетом 0, чтобы стать корневым мостом', 'מתג שחובר לפורט של משתמש שולח BPDU עם עדיפות 0 כדי להפוך ל-root bridge')],
  ['cdp', T('An attacker captures CDP messages to learn the IOS version and IP addresses of the switch', 'Злоумышленник перехватывает сообщения CDP, чтобы узнать версию IOS и IP-адреса коммутатора', 'תוקף לוכד הודעות CDP כדי לגלות את גרסת ה-IOS וכתובות ה-IP של המתג')],
];

lessonDef({
  id: 'srwe10', topic: 'device', drill: 'lansec', minutes: 15,
  title: T('LAN Security Concepts', 'Безопасность LAN', 'עקרונות אבטחת LAN'),
  goal: T('Endpoint security, AAA and 802.1X, and the Layer 2 attacks every network engineer must know: MAC flooding, VLAN hopping, DHCP, ARP, address spoofing, STP and CDP attacks — and their mitigations.',
    'Защита конечных устройств, AAA и 802.1X и атаки 2-го уровня, которые должен знать каждый сетевой инженер: переполнение MAC-таблицы, VLAN hopping, атаки на DHCP, ARP, подмена адресов, атаки на STP и CDP — и защита от них.',
    'אבטחת התקני קצה, ‏AAA ו-802.1X, והתקפות שכבה 2 שכל מהנדס רשתות חייב להכיר: הצפת טבלת MAC, ‏VLAN hopping, התקפות DHCP ו-ARP, זיוף כתובות, התקפות STP ו-CDP — ואיך מתגוננים מהן.'),
  sections: [
    lSec(['Endpoints and security devices', 'Конечные устройства и средства защиты', 'התקני קצה ואמצעי אבטחה'],
      lP(['Laptops, phones and IoT devices are the main targets — many attacks start inside the LAN. Layer 2 is often the weakest link: if it is compromised, all the layers above are too.',
        'Ноутбуки, телефоны и IoT-устройства — главные цели; многие атаки начинаются внутри LAN. Второй уровень часто самое слабое звено: если взломан он, то взломаны и все уровни выше.',
        'מחשבים ניידים, טלפונים והתקני IoT הם המטרות העיקריות — הרבה התקפות מתחילות בתוך ה-LAN. שכבה 2 היא לרוב החוליה החלשה: אם היא נפרצה, גם כל השכבות שמעליה נפרצו.']),
      lUL([
        ['Network devices: VPN-enabled router, next-generation firewall (NGFW), Network Access Control (NAC).', 'Сетевые средства: маршрутизатор с VPN, межсетевой экран нового поколения (NGFW), контроль доступа к сети (NAC).', 'אמצעי רשת: נתב עם VPN, חומת אש מהדור הבא (NGFW), בקרת גישה לרשת (NAC).'],
        ['On the endpoint: antimalware, host-based firewall, host-based IPS.', 'На конечном устройстве: антивирус, персональный межсетевой экран, HIPS.', 'על התקן הקצה: אנטי-וירוס, חומת אש מקומית, ‏IPS מבוסס מארח.'],
        ['Cisco Email Security Appliance (ESA) filters spam and phishing; Web Security Appliance (WSA) filters web traffic.', 'Cisco Email Security Appliance (ESA) фильтрует спам и фишинг; Web Security Appliance (WSA) фильтрует веб-трафик.', 'Cisco Email Security Appliance ‏(ESA) מסנן ספאם ופישינג; ‏Web Security Appliance ‏(WSA) מסנן תעבורת web.'],
      ])),
    lSec(['AAA and 802.1X', 'AAA и 802.1X', 'AAA ו-802.1X'],
      lUL([
        ['Authentication — who are you? Authorization — what may you do? Accounting — what did you do (logs)?', 'Аутентификация — кто вы? Авторизация — что вам можно? Учёт (accounting) — что вы сделали (журналы)?', 'אימות (Authentication) — מי אתה? הרשאה (Authorization) — מה מותר לך? רישום (Accounting) — מה עשית (לוגים)?'],
        ['RADIUS — open standard, UDP 1812/1813, encrypts only the password. TACACS+ — Cisco, TCP 49, encrypts the whole message, separates authentication and authorization.', 'RADIUS — открытый стандарт, UDP 1812/1813, шифрует только пароль. TACACS+ — Cisco, TCP 49, шифрует всё сообщение, разделяет аутентификацию и авторизацию.', 'RADIUS — תקן פתוח, ‏UDP 1812/1813, מצפין רק את הסיסמה. ‏TACACS+ — של Cisco, ‏TCP 49, מצפין את כל ההודעה ומפריד בין אימות להרשאה.'],
        ['802.1X — port-based access control: the client (supplicant) must authenticate before the switch port passes traffic.', '802.1X — контроль доступа на уровне порта: клиент (supplicant) должен пройти аутентификацию, прежде чем порт коммутатора начнёт пропускать трафик.', '802.1X — בקרת גישה ברמת הפורט: הלקוח (supplicant) חייב לעבור אימות לפני שפורט המתג יעביר תעבורה.'],
      ]),
      lTable([['802.1X role', 'Роль 802.1X', 'תפקיד ב-802.1X'], ['Device', 'Устройство', 'התקן']], [
        ['Supplicant', ['The client PC or phone', 'Клиентский ПК или телефон', 'המחשב או הטלפון של הלקוח']],
        ['Authenticator', ['The switch (or wireless controller)', 'Коммутатор (или контроллер Wi-Fi)', 'המתג (או בקר האלחוט)']],
        ['Authentication server', ['RADIUS server', 'Сервер RADIUS', 'שרת RADIUS']],
      ]),
      lCode('R1(config)# username admin secret Str0ng!Pass\nR1(config)# aaa new-model\nR1(config)# aaa authentication login default group radius local')),
    lSec(['Layer 2 attacks at a glance', 'Атаки 2-го уровня — обзор', 'התקפות שכבה 2 — סקירה'],
      lTable([['Attack', 'Атака', 'התקפה'], ['Mitigation', 'Защита', 'הגנה']], [
        [['MAC address table flooding', 'Переполнение таблицы MAC-адресов', 'הצפת טבלת כתובות MAC'], 'Port security'],
        [['VLAN hopping, double-tagging', 'VLAN hopping, двойное тегирование', 'VLAN hopping, תיוג כפול'], ['Disable DTP, unused native VLAN, shut unused ports', 'Отключить DTP, неиспользуемый native VLAN, выключить лишние порты', 'לכבות DTP, ‏native VLAN שלא בשימוש, לכבות פורטים לא בשימוש']],
        [['DHCP starvation and spoofing', 'Истощение и подмена DHCP', 'הרעבת DHCP וזיוף DHCP'], ['DHCP snooping (+ port security)', 'DHCP snooping (+ port security)', 'DHCP snooping ‏(+ port security)']],
        [['ARP spoofing / poisoning', 'Подмена ARP / отравление ARP', 'זיוף ARP / הרעלת ARP'], 'Dynamic ARP Inspection (DAI)'],
        [['MAC and IP address spoofing', 'Подмена MAC- и IP-адресов', 'זיוף כתובות MAC ו-IP'], 'IP Source Guard'],
        [['STP manipulation', 'Манипуляция STP', 'מניפולציה על STP'], ['BPDU Guard, Root Guard', 'BPDU Guard, Root Guard', 'BPDU Guard, ‏Root Guard']],
        [['CDP / LLDP reconnaissance', 'Разведка через CDP / LLDP', 'איסוף מידע דרך CDP / LLDP'], ['Disable on edge ports', 'Отключить на пограничных портах', 'לכבות בפורטי קצה']],
      ])),
    lSec(['MAC flooding and VLAN attacks', 'Переполнение MAC-таблицы и атаки на VLAN', 'הצפת MAC והתקפות VLAN'],
      lP(['The MAC address table has a fixed size. A tool like macof sends thousands of frames with fake source MACs per second; when the table is full the switch floods every frame out all ports, like a hub — and the attacker captures traffic meant for others.',
        'Таблица MAC-адресов ограничена по размеру. Утилита вроде macof отправляет тысячи кадров в секунду с поддельными MAC источника; когда таблица заполнена, коммутатор рассылает каждый кадр во все порты, как хаб, — и злоумышленник перехватывает чужой трафик.',
        'לטבלת כתובות ה-MAC יש גודל קבוע. כלי כמו macof שולח אלפי מסגרות בשנייה עם כתובות MAC מזויפות; כשהטבלה מלאה המתג מציף כל מסגרת לכל הפורטים, כמו רכזת — והתוקף לוכד תעבורה שנועדה לאחרים.']),
      lUL([
        ['Switch spoofing — the attacker\'s PC speaks DTP, becomes a trunk and reaches every VLAN.', 'Подмена коммутатора (switch spoofing) — ПК злоумышленника говорит на DTP, становится trunk и получает доступ ко всем VLAN.', 'Switch spoofing — המחשב של התוקף מדבר DTP, הופך ל-trunk ומגיע לכל ה-VLAN.'],
        ['Double-tagging — an attacker in the native VLAN adds two tags; the first switch strips the outer (native) tag, the next switch forwards by the inner tag into the victim VLAN. One-way only.', 'Двойное тегирование — злоумышленник в native VLAN ставит два тега; первый коммутатор снимает внешний (native) тег, следующий пересылает по внутреннему тегу в VLAN жертвы. Работает только в одну сторону.', 'תיוג כפול — תוקף ב-native VLAN מוסיף שני תגים; המתג הראשון מסיר את התג החיצוני (native), והמתג הבא מעביר לפי התג הפנימי ל-VLAN של הקורבן. עובד רק בכיוון אחד.'],
      ])),
    lSec(['DHCP, ARP, spoofing, STP and CDP attacks', 'Атаки на DHCP, ARP, подмена адресов, STP и CDP', 'התקפות DHCP, ‏ARP, זיוף, ‏STP ו-CDP'],
      lUL([
        ['DHCP starvation — a tool like Gobbler leases every address in the pool (DoS). DHCP spoofing — a rogue server then gives clients a fake gateway or DNS (man-in-the-middle).', 'Истощение DHCP — утилита вроде Gobbler арендует все адреса пула (отказ в обслуживании). Подмена DHCP — затем поддельный сервер выдаёт клиентам ложный шлюз или DNS (человек посередине).', 'הרעבת DHCP — כלי כמו Gobbler חוכר את כל הכתובות במאגר (DoS). זיוף DHCP — אחר כך שרת מזויף נותן ללקוחות שער או DNS מזויפים (man-in-the-middle).'],
        ['ARP spoofing — gratuitous ARP replies map the gateway\'s IP to the attacker\'s MAC, so traffic goes through the attacker.', 'Подмена ARP — самопроизвольные ARP-ответы связывают IP шлюза с MAC злоумышленника, и трафик идёт через него.', 'זיוף ARP — תשובות ARP יזומות מקשרות את ה-IP של השער ל-MAC של התוקף, כך שהתעבורה עוברת דרכו.'],
        ['STP attack — a rogue switch with priority 0 becomes the root bridge and sees the traffic.', 'Атака на STP — поддельный коммутатор с приоритетом 0 становится корневым мостом и видит трафик.', 'התקפת STP — מתג מזויף עם עדיפות 0 הופך ל-root bridge ורואה את התעבורה.'],
        ['CDP sends the device model, IOS version and IP addresses in clear text every 60 seconds — useful for an attacker. Use "no cdp run" (global) or "no cdp enable" (port).', 'CDP каждые 60 секунд открытым текстом сообщает модель, версию IOS и IP-адреса — полезно злоумышленнику. Используйте «no cdp run» (глобально) или «no cdp enable» (на порту).', 'CDP שולח כל 60 שניות בטקסט גלוי את דגם ההתקן, גרסת ה-IOS וכתובות ה-IP — מידע שימושי לתוקף. משתמשים ב-"no cdp run" (גלובלי) או "no cdp enable" (בפורט).'],
      ])),
  ],
  quiz: [
    lQ(['A switch\'s MAC address table is full after a MAC flooding attack. What does the switch do?', 'Таблица MAC-адресов переполнена после атаки. Что делает коммутатор?', 'טבלת ה-MAC של המתג מלאה אחרי התקפת הצפה. מה המתג עושה?'], [['Floods frames out all ports, like a hub', 'Рассылает кадры во все порты, как хаб', 'מציף מסגרות לכל הפורטים, כמו רכזת'], ['Shuts down all ports', 'Выключает все порты', 'מכבה את כל הפורטים'], ['Reboots', 'Перезагружается', 'עולה מחדש'], ['Drops all traffic', 'Отбрасывает весь трафик', 'זורק את כל התעבורה']], 0,
      ['Unknown destinations are flooded, so the attacker sees other users\' frames.', 'Неизвестные получатели рассылаются всем, и злоумышленник видит чужие кадры.', 'יעדים לא ידועים מוצפים, ולכן התוקף רואה מסגרות של משתמשים אחרים.']),
    lQ(['Which feature mitigates MAC address table flooding?', 'Какая функция защищает от переполнения таблицы MAC?', 'איזו תכונה מגינה מפני הצפת טבלת ה-MAC?'], ['Port security', 'DHCP snooping', 'BPDU Guard', 'HSRP'], 0,
      ['It limits how many MACs a port may learn.', 'Ограничивает число MAC, которые может выучить порт.', 'היא מגבילה כמה כתובות MAC פורט יכול ללמוד.']),
    lQ(['Which attack uses DTP to turn a user port into a trunk?', 'Какая атака использует DTP, чтобы превратить пользовательский порт в trunk?', 'איזו התקפה משתמשת ב-DTP כדי להפוך פורט משתמש ל-trunk?'], [['Switch spoofing (VLAN hopping)', 'Подмена коммутатора (VLAN hopping)', 'Switch spoofing ‏(VLAN hopping)'], ['ARP spoofing', 'Подмена ARP', 'זיוף ARP'], ['DHCP starvation', 'Истощение DHCP', 'הרעבת DHCP'], ['MAC flooding', 'Переполнение MAC-таблицы', 'הצפת MAC']], 0,
      ['Fix: switchport mode access and switchport nonegotiate.', 'Защита: switchport mode access и switchport nonegotiate.', 'הפתרון: switchport mode access ו-switchport nonegotiate.']),
    lQ(['A double-tagging attack works only if the attacker is in…', 'Атака двойного тегирования работает, только если злоумышленник находится в…', 'התקפת תיוג כפול עובדת רק אם התוקף נמצא ב…'], [['The native VLAN of the trunk', 'native VLAN trunk-канала', 'ה-native VLAN של ה-trunk'], ['The management VLAN', 'VLAN управления', 'VLAN הניהול'], ['VLAN 1005', 'VLAN 1005', 'VLAN 1005'], ['Any voice VLAN', 'Любом голосовом VLAN', 'כל VLAN קולי']], 0,
      ['So set the native VLAN to an unused VLAN.', 'Поэтому native VLAN делают неиспользуемым.', 'לכן מגדירים native VLAN שלא בשימוש.']),
    lQ(['Which feature stops a rogue DHCP server?', 'Какая функция останавливает поддельный DHCP-сервер?', 'איזו תכונה עוצרת שרת DHCP מזויף?'], ['DHCP snooping', 'Port security', 'BPDU Guard', 'IP Source Guard'], 0,
      ['Server messages are accepted only on trusted ports.', 'Сообщения сервера принимаются только на доверенных портах.', 'הודעות שרת מתקבלות רק בפורטים מהימנים.']),
    lQ(['Which feature mitigates ARP spoofing?', 'Какая функция защищает от подмены ARP?', 'איזו תכונה מגינה מפני זיוף ARP?'], ['Dynamic ARP Inspection', 'Port security', 'Root Guard', 'PortFast'], 0,
      ['DAI checks ARP packets against the DHCP snooping table.', 'DAI сверяет ARP-пакеты с таблицей DHCP snooping.', 'DAI בודק חבילות ARP מול טבלת ה-DHCP snooping.']),
    lQ(['In 802.1X, what is the role of the switch?', 'Какова роль коммутатора в 802.1X?', 'מה התפקיד של המתג ב-802.1X?'], ['Authenticator', 'Supplicant', 'Authentication server', 'Accounting server'], 0,
      ['The client is the supplicant, RADIUS is the authentication server.', 'Клиент — supplicant, RADIUS — сервер аутентификации.', 'הלקוח הוא ה-supplicant, ‏RADIUS הוא שרת האימות.']),
    lQ(['Which AAA protocol uses TCP 49 and encrypts the whole message?', 'Какой протокол AAA использует TCP 49 и шифрует всё сообщение?', 'איזה פרוטוקול AAA משתמש ב-TCP 49 ומצפין את כל ההודעה?'], ['TACACS+', 'RADIUS', 'SNMP', 'Kerberos'], 0,
      ['RADIUS uses UDP 1812/1813 and encrypts only the password.', 'RADIUS использует UDP 1812/1813 и шифрует только пароль.', 'RADIUS משתמש ב-UDP 1812/1813 ומצפין רק את הסיסמה.']),
  ],
  gen: [
    function genAttackMitigation(rng) {
      const [key, attack] = rng.pick(L2_ATTACKS);
      return lGen(T('Attack: ' + attack.en + '. Which feature mitigates it best?', 'Атака: ' + attack.ru + '. Какая функция лучше всего защищает от неё?', 'התקפה: ' + attack.he + '. איזו תכונה מגינה ממנה הכי טוב?'),
        L2_MITIGATIONS[key], rng.shuffle(Object.keys(L2_MITIGATIONS).filter((k) => k !== key)).map((k) => L2_MITIGATIONS[k]),
        T('Remember the pairs: MAC flooding → port security, DTP → disable DTP, double-tagging → unused native VLAN, rogue DHCP → DHCP snooping, ARP → DAI, address spoofing → IP Source Guard, STP → BPDU Guard, CDP → disable CDP.',
          'Запомните пары: переполнение MAC → port security, DTP → отключить DTP, двойной тег → неиспользуемый native VLAN, поддельный DHCP → DHCP snooping, ARP → DAI, подмена адресов → IP Source Guard, STP → BPDU Guard, CDP → отключить CDP.',
          'זכרו את הזוגות: הצפת MAC → ‏port security, ‏DTP → לכבות DTP, תיוג כפול → ‏native VLAN שלא בשימוש, ‏DHCP מזויף → ‏DHCP snooping, ‏ARP → ‏DAI, זיוף כתובות → ‏IP Source Guard, ‏STP → ‏BPDU Guard, ‏CDP → לכבות CDP.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'srwe11', topic: 'device', drill: 'lansec', minutes: 18,
  title: T('Switch Security Configuration', 'Настройка безопасности коммутатора', 'הגדרת אבטחה במתג'),
  goal: T('Hands-on mitigation: securing unused ports, port security and its violation modes, VLAN attack mitigation, DHCP snooping, Dynamic ARP Inspection, PortFast and BPDU Guard.',
    'Защита на практике: неиспользуемые порты, port security и режимы нарушения, защита от атак на VLAN, DHCP snooping, Dynamic ARP Inspection, PortFast и BPDU Guard.',
    'הגנה בפועל: אבטחת פורטים שלא בשימוש, ‏port security ומצבי ההפרה שלו, הגנה מהתקפות VLAN, ‏DHCP snooping, ‏Dynamic ARP Inspection, ‏PortFast ו-BPDU Guard.'),
  sections: [
    lSec(['Secure unused ports', 'Защита неиспользуемых портов', 'אבטחת פורטים שלא בשימוש'],
      lCode('S1(config)# interface range fa0/20 - 24\nS1(config-if-range)# switchport mode access\nS1(config-if-range)# switchport access vlan 999\nS1(config-if-range)# shutdown'),
      lP(['An unused port that is up is an open door. Shut it down and park it in an unused "black hole" VLAN.', 'Неиспользуемый включённый порт — открытая дверь. Выключите его и поместите в неиспользуемый VLAN («чёрная дыра»).', 'פורט פעיל שלא בשימוש הוא דלת פתוחה. מכבים אותו ומעבירים אותו ל-VLAN שלא בשימוש ("חור שחור").'])),
    lSec(['Port security', 'Port security', 'Port security'],
      lCode('S1(config)# interface fa0/1\nS1(config-if)# switchport mode access\nS1(config-if)# switchport port-security\nS1(config-if)# switchport port-security maximum 2\nS1(config-if)# switchport port-security mac-address sticky\nS1(config-if)# switchport port-security violation restrict\nS1(config-if)# switchport port-security aging time 10\n\nS1# show port-security interface fa0/1\nS1# show port-security address'),
      lUL([
        ['Port security works only on a static access (or trunk) port. On a dynamic DTP port the command is rejected — set "switchport mode access" first.', 'Port security работает только на статическом access- (или trunk-) порту. На динамическом порту DTP команда отклоняется — сначала «switchport mode access».', 'Port security עובד רק על פורט access (או trunk) סטטי. על פורט DTP דינמי הפקודה נדחית — קודם "switchport mode access".'],
        ['Defaults: maximum 1 MAC address, violation mode shutdown.', 'По умолчанию: максимум 1 MAC-адрес, режим нарушения shutdown.', 'ברירות מחדל: מקסימום כתובת MAC אחת, מצב הפרה shutdown.'],
        ['Sticky — learned MACs are written into the running-config (save it to keep them after a reload).', 'Sticky — выученные MAC записываются в running-config (сохраните его, чтобы они пережили перезагрузку).', 'Sticky — כתובות MAC שנלמדו נכתבות ל-running-config (שומרים אותו כדי שיישארו אחרי אתחול).'],
      ]),
      lTable([['Violation mode', 'Режим нарушения', 'מצב הפרה'], ['Drops the frame', 'Отбрасывает кадр', 'זורק את המסגרת'], ['Syslog + counter', 'Syslog + счётчик', 'Syslog + מונה'], ['Shuts the port', 'Выключает порт', 'מכבה את הפורט']], [
        ['protect', ['Yes', 'Да', 'כן'], ['No', 'Нет', 'לא'], ['No', 'Нет', 'לא']],
        ['restrict', ['Yes', 'Да', 'כן'], ['Yes', 'Да', 'כן'], ['No', 'Нет', 'לא']],
        [['shutdown (default)', 'shutdown (по умолчанию)', 'shutdown (ברירת מחדל)'], ['Yes', 'Да', 'כן'], ['Yes', 'Да', 'כן'], ['Yes — err-disabled', 'Да — err-disabled', 'כן — err-disabled']],
      ]),
      lCode('S1(config)# interface fa0/1\nS1(config-if)# shutdown\nS1(config-if)# no shutdown                       ! manual recovery from err-disabled\nS1(config)# errdisable recovery cause psecure-violation\nS1(config)# errdisable recovery interval 300      ! automatic recovery', ['Bringing an err-disabled port back', 'Возврат порта из err-disabled', 'החזרת פורט ממצב err-disabled'])),
    lSec(['Mitigate VLAN attacks', 'Защита от атак на VLAN', 'הגנה מהתקפות VLAN'],
      lCode('S1(config)# interface range fa0/1 - 16\nS1(config-if-range)# switchport mode access          ! user ports: no DTP trunking\nS1(config)# interface range g0/1 - 2\nS1(config-if-range)# switchport mode trunk\nS1(config-if-range)# switchport nonegotiate            ! DTP off\nS1(config-if-range)# switchport trunk native vlan 999  ! unused native VLAN'),
      lTip(['Never use VLAN 1 for users or as the native VLAN.', 'Никогда не используйте VLAN 1 для пользователей или как native VLAN.', 'אף פעם לא משתמשים ב-VLAN 1 למשתמשים או כ-native VLAN.'])),
    lSec(['DHCP snooping', 'DHCP snooping', 'DHCP snooping'],
      lCode('S1(config)# ip dhcp snooping\nS1(config)# interface g0/1                        ! uplink to the real DHCP server\nS1(config-if)# ip dhcp snooping trust\nS1(config)# interface range fa0/1 - 24\nS1(config-if-range)# ip dhcp snooping limit rate 6\nS1(config)# ip dhcp snooping vlan 5,10,50-52\nS1# show ip dhcp snooping binding'),
      lUL([
        ['Trusted ports — toward the legitimate DHCP server. Untrusted ports — everything else: DHCP server messages (OFFER, ACK) arriving there are dropped.', 'Доверенные порты — в сторону настоящего DHCP-сервера. Недоверенные — все остальные: пришедшие на них сообщения сервера (OFFER, ACK) отбрасываются.', 'פורטים מהימנים (trusted) — לכיוון שרת ה-DHCP האמיתי. לא מהימנים — כל השאר: הודעות שרת (OFFER, ‏ACK) שמגיעות אליהם נזרקות.'],
        ['The rate limit stops DHCP starvation from one port.', 'Ограничение скорости останавливает истощение DHCP с одного порта.', 'הגבלת הקצב עוצרת הרעבת DHCP מפורט אחד.'],
        ['The binding table (MAC, IP, lease, VLAN, port) is later used by DAI and IP Source Guard.', 'Таблица привязок (MAC, IP, аренда, VLAN, порт) потом используется DAI и IP Source Guard.', 'טבלת הקישורים (MAC, ‏IP, חכירה, ‏VLAN, פורט) משמשת אחר כך את DAI ואת IP Source Guard.'],
      ])),
    lSec(['Dynamic ARP Inspection, PortFast and BPDU Guard', 'Dynamic ARP Inspection, PortFast и BPDU Guard', 'Dynamic ARP Inspection, ‏PortFast ו-BPDU Guard'],
      lCode('S1(config)# ip dhcp snooping\nS1(config)# ip dhcp snooping vlan 10\nS1(config)# ip arp inspection vlan 10\nS1(config)# interface g0/1\nS1(config-if)# ip arp inspection trust\nS1(config)# ip arp inspection validate src-mac dst-mac ip\n\nS1(config)# interface range fa0/1 - 16\nS1(config-if-range)# spanning-tree portfast\nS1(config-if-range)# spanning-tree bpduguard enable'),
      lUL([
        ['DAI drops ARP packets whose IP-to-MAC pair is not in the DHCP snooping binding table — so DHCP snooping must be on.', 'DAI отбрасывает ARP-пакеты, пары IP–MAC которых нет в таблице привязок DHCP snooping, — поэтому DHCP snooping должен быть включён.', 'DAI זורק חבילות ARP שזוג ה-IP–MAC שלהן לא נמצא בטבלת הקישורים של DHCP snooping — ולכן DHCP snooping חייב להיות פעיל.'],
        ['Trust the uplinks (toward other switches and routers), not the user ports.', 'Доверенными делают аплинки (к другим коммутаторам и маршрутизаторам), а не пользовательские порты.', 'מגדירים כמהימנים את ה-uplinks (למתגים ולנתבים אחרים), לא את פורטי המשתמשים.'],
        ['PortFast + BPDU Guard on every access port: fast start for hosts, err-disabled if a switch appears.', 'PortFast + BPDU Guard на каждом access-порту: быстрый старт для хостов, err-disabled, если появится коммутатор.', 'PortFast + ‏BPDU Guard על כל פורט access: עלייה מהירה למארחים, ‏err-disabled אם מופיע מתג.'],
      ])),
  ],
  quiz: [
    lQ(['What is the default port-security violation mode?', 'Какой режим нарушения port security по умолчанию?', 'מהו מצב ההפרה של port security כברירת מחדל?'], ['shutdown', 'restrict', 'protect', 'sticky'], 0,
      ['The port goes err-disabled.', 'Порт переходит в err-disabled.', 'הפורט עובר ל-err-disabled.']),
    lQ(['Which violation mode drops the frame and logs it, but keeps the port up?', 'Какой режим отбрасывает кадр и пишет в журнал, но оставляет порт включённым?', 'איזה מצב הפרה זורק את המסגרת ורושם ביומן, אבל משאיר את הפורט פעיל?'], ['restrict', 'protect', 'shutdown', 'sticky'], 0,
      ['protect drops silently; shutdown disables the port.', 'protect отбрасывает молча; shutdown выключает порт.', 'protect זורק בשקט; ‏shutdown מכבה את הפורט.']),
    lQ(['By default, how many MAC addresses may a port-security port learn?', 'Сколько MAC-адресов по умолчанию может выучить порт с port security?', 'כמה כתובות MAC פורט עם port security יכול ללמוד כברירת מחדל?'], ['1', '2', '8', '132'], 0,
      ['Raise it with switchport port-security maximum.', 'Увеличить — switchport port-security maximum.', 'מגדילים עם switchport port-security maximum.']),
    lQ(['"switchport port-security" returns "Command rejected: Fa0/1 is a dynamic port." Fix?', '«switchport port-security» выдаёт «Command rejected: Fa0/1 is a dynamic port.» Что сделать?', '"switchport port-security" מחזיר "Command rejected: Fa0/1 is a dynamic port." מה עושים?'], [['Configure switchport mode access first', 'Сначала настроить switchport mode access', 'קודם להגדיר switchport mode access'], ['Reload the switch', 'Перезагрузить коммутатор', 'לאתחל את המתג'], ['Enable DHCP snooping', 'Включить DHCP snooping', 'להפעיל DHCP snooping'], ['Use the sticky keyword', 'Добавить sticky', 'להשתמש ב-sticky']], 0,
      ['The port must be statically access or trunk.', 'Порт должен быть статически access или trunk.', 'הפורט חייב להיות access או trunk באופן סטטי.']),
    lQ(['What does "switchport port-security mac-address sticky" do?', 'Что делает «switchport port-security mac-address sticky»?', 'מה עושה "switchport port-security mac-address sticky"?'], [['Adds learned MACs to the running-config', 'Добавляет выученные MAC в running-config', 'מוסיף את כתובות ה-MAC שנלמדו ל-running-config'], ['Blocks all new MACs forever', 'Навсегда блокирует новые MAC', 'חוסם לתמיד כל MAC חדש'], ['Saves the config to NVRAM', 'Сохраняет конфигурацию в NVRAM', 'שומר את התצורה ב-NVRAM'], ['Turns off aging', 'Отключает устаревание', 'מכבה את ההתיישנות']], 0,
      ['You still need copy run start to keep them.', 'Чтобы они сохранились, всё равно нужен copy run start.', 'עדיין צריך copy run start כדי לשמור אותן.']),
    lQ(['A port is err-disabled by port security. How do you bring it back manually?', 'Порт ушёл в err-disabled из-за port security. Как вернуть его вручную?', 'פורט עבר ל-err-disabled בגלל port security. איך מחזירים אותו ידנית?'], [['shutdown, then no shutdown', 'shutdown, затем no shutdown', 'shutdown ואז no shutdown'], ['clear mac address-table', 'clear mac address-table', 'clear mac address-table'], ['no switchport port-security sticky', 'no switchport port-security sticky', 'no switchport port-security sticky'], ['reload only', 'Только reload', 'רק reload']], 0,
      ['Remove the cause first, or it will happen again.', 'Сначала устраните причину, иначе всё повторится.', 'קודם מסירים את הגורם, אחרת זה יחזור.']),
    lQ(['With DHCP snooping, which port should be trusted?', 'Какой порт делают доверенным при DHCP snooping?', 'איזה פורט מגדירים כמהימן ב-DHCP snooping?'], [['The uplink toward the legitimate DHCP server', 'Аплинк в сторону настоящего DHCP-сервера', 'ה-uplink לכיוון שרת ה-DHCP האמיתי'], ['Every user port', 'Каждый пользовательский порт', 'כל פורט משתמש'], ['Unused ports', 'Неиспользуемые порты', 'פורטים שלא בשימוש'], ['The port of the attacker', 'Порт злоумышленника', 'הפורט של התוקף']], 0,
      ['All other ports stay untrusted.', 'Все остальные порты остаются недоверенными.', 'כל שאר הפורטים נשארים לא מהימנים.']),
    lQ(['Dynamic ARP Inspection checks ARP packets against…', 'Dynamic ARP Inspection проверяет ARP-пакеты по…', 'Dynamic ARP Inspection בודק חבילות ARP מול…'], [['The DHCP snooping binding table', 'Таблице привязок DHCP snooping', 'טבלת הקישורים של DHCP snooping'], ['The routing table', 'Таблице маршрутизации', 'טבלת הניתוב'], ['The STP topology', 'Топологии STP', 'טופולוגיית ה-STP'], ['The CDP neighbor table', 'Таблице соседей CDP', 'טבלת השכנים של CDP']], 0,
      ['That is why DHCP snooping must be enabled first.', 'Поэтому сначала нужно включить DHCP snooping.', 'לכן קודם צריך להפעיל DHCP snooping.']),
  ],
  gen: [
    function genPortSecurity(rng) {
      const max = rng.int(1, 4), learned = rng.chance(0.7) ? max : rng.int(0, max - 1);
      const mode = rng.pick(['protect', 'restrict', 'shutdown', null]);
      const out = {
        fwd: T('The frame is forwarded and the new MAC is learned as secure', 'Кадр пересылается, новый MAC запоминается как безопасный', 'המסגרת מועברת וה-MAC החדש נלמד ככתובת מאובטחת'),
        protect: T('The frame is dropped silently — no log, the counter does not change', 'Кадр молча отбрасывается — без журнала, счётчик не меняется', 'המסגרת נזרקת בשקט — בלי יומן, המונה לא משתנה'),
        restrict: T('The frame is dropped, a syslog message is sent and the violation counter increases', 'Кадр отбрасывается, отправляется syslog, счётчик нарушений растёт', 'המסגרת נזרקת, נשלחת הודעת syslog ומונה ההפרות עולה'),
        shutdown: T('The port goes err-disabled', 'Порт переходит в err-disabled', 'הפורט עובר ל-err-disabled'),
      };
      const key = learned < max ? 'fwd' : (mode || 'shutdown');
      const q = lGen(T('Fa0/5 is configured as shown and has already learned ' + learned + ' secure MAC address' + (learned === 1 ? '' : 'es') + '. A frame arrives from a new MAC address. What happens?',
        'Fa0/5 настроен как показано и уже выучил безопасных MAC-адресов: ' + learned + '. Приходит кадр с нового MAC-адреса. Что произойдёт?',
        'Fa0/5 מוגדר כמו שמוצג וכבר למד ' + (learned === 1 ? 'כתובת MAC מאובטחת אחת' : learned + ' כתובות MAC מאובטחות') + '. מגיעה מסגרת מכתובת MAC חדשה. מה יקרה?'),
        out[key], rng.shuffle(Object.keys(out).filter((k) => k !== key)).map((k) => out[k]),
        learned < max ? T('Only ' + learned + ' of ' + max + ' allowed addresses are used, so there is no violation.', 'Занято только ' + learned + ' из ' + max + ' разрешённых адресов, нарушения нет.', 'רק ' + learned + ' מתוך ' + max + ' הכתובות המותרות בשימוש, ולכן אין הפרה.')
          : T('The maximum (' + max + ') is reached, so it is a violation; mode ' + (mode || 'shutdown (default)') + '.', 'Максимум (' + max + ') достигнут — это нарушение; режим ' + (mode || 'shutdown (по умолчанию)') + '.', 'הגענו למקסימום (' + max + '), ולכן זו הפרה; מצב ' + (mode || 'shutdown (ברירת מחדל)') + '.'));
      q.code = 'interface fa0/5\n switchport mode access\n switchport port-security\n switchport port-security maximum ' + max + (mode ? '\n switchport port-security violation ' + mode : '');
      return q;
    },
  ],
});

// ---------------------------------------------------------------
// Стандарты 802.11: диапазон и поколение Wi-Fi (для генератора и теста).
const WIFI_BANDS = {
  b24: T('2.4 GHz', '2,4 ГГц', '2.4 GHz'),
  b5: T('5 GHz', '5 ГГц', '5 GHz'),
  both: T('2.4 GHz and 5 GHz', '2,4 ГГц и 5 ГГц', '2.4 GHz וגם 5 GHz'),
  b60: T('60 GHz', '60 ГГц', '60 GHz'),
};
const WIFI_STD = { '802.11a': 'b5', '802.11b': 'b24', '802.11g': 'b24', '802.11n': 'both', '802.11ac': 'b5' };
const WIFI_GEN = { 'Wi-Fi 4': '802.11n', 'Wi-Fi 5': '802.11ac', 'Wi-Fi 6': '802.11ax' };

lessonDef({
  id: 'srwe12', topic: null, drill: 'lansec', minutes: 18,
  title: T('WLAN Concepts', 'Беспроводные сети (WLAN)', 'עקרונות רשתות אלחוטיות'),
  goal: T('802.11 standards and frequencies, WLAN components and topologies, CAPWAP and wireless LAN controllers, channels, how a client associates, WLAN threats and WPA2/WPA3 security.',
    'Стандарты 802.11 и частоты, компоненты и топологии WLAN, CAPWAP и контроллеры беспроводной сети, каналы, как клиент подключается, угрозы WLAN и защита WPA2/WPA3.',
    'תקני 802.11 ותדרים, רכיבים וטופולוגיות של WLAN, ‏CAPWAP ובקרי רשת אלחוטית, ערוצים, איך לקוח מתחבר, איומים על WLAN ואבטחת WPA2/WPA3.'),
  sections: [
    lSec(['Wireless networks and 802.11 standards', 'Беспроводные сети и стандарты 802.11', 'רשתות אלחוטיות ותקני 802.11'],
      lP(['WPAN (Bluetooth, a few metres), WLAN (Wi-Fi, IEEE 802.11, a building), WMAN (a city) and WWAN (cellular 4G/5G, a country). A WLAN uses radio waves in unlicensed bands and works in half-duplex.',
        'WPAN (Bluetooth, несколько метров), WLAN (Wi-Fi, IEEE 802.11, здание), WMAN (город) и WWAN (сотовая связь 4G/5G, страна). WLAN использует радиоволны в нелицензируемых диапазонах и работает в полудуплексе.',
        'WPAN ‏(Bluetooth, מטרים ספורים), ‏WLAN ‏(Wi-Fi, ‏IEEE 802.11, בניין), ‏WMAN (עיר) ו-WWAN (סלולר 4G/5G, מדינה). ‏WLAN משתמשת בגלי רדיו בתדרים שלא דורשים רישיון ועובדת ב-half-duplex.']),
      lTable([['Standard', 'Стандарт', 'תקן'], ['Band', 'Диапазон', 'תדר'], ['Max speed', 'Макс. скорость', 'מהירות מרבית']], [
        ['802.11a', '5 GHz', '54 Mbps'],
        ['802.11b', '2.4 GHz', '11 Mbps'],
        ['802.11g', '2.4 GHz', '54 Mbps'],
        [['802.11n (Wi-Fi 4)', '802.11n (Wi-Fi 4)', '802.11n ‏(Wi-Fi 4)'], ['2.4 and 5 GHz', '2,4 и 5 ГГц', '2.4 ו-5 GHz'], ['600 Mbps (MIMO)', '600 Мбит/с (MIMO)', '600 Mbps ‏(MIMO)']],
        [['802.11ac (Wi-Fi 5)', '802.11ac (Wi-Fi 5)', '802.11ac ‏(Wi-Fi 5)'], '5 GHz', ['~7 Gbps', '~7 Гбит/с', '~7 Gbps']],
        [['802.11ax (Wi-Fi 6 / 6E)', '802.11ax (Wi-Fi 6 / 6E)', '802.11ax ‏(Wi-Fi 6 / 6E)'], ['2.4 and 5 GHz (6 GHz with 6E)', '2,4 и 5 ГГц (6 ГГц в 6E)', '2.4 ו-5 GHz ‏(6 GHz ב-6E)'], ['~9.6 Gbps', '~9,6 Гбит/с', '~9.6 Gbps']],
      ]),
      lUL([
        ['ITU-R regulates the radio spectrum, IEEE writes the 802.11 standards, the Wi-Fi Alliance certifies that devices from different vendors work together.', 'ITU-R регулирует радиочастоты, IEEE пишет стандарты 802.11, Wi-Fi Alliance сертифицирует совместимость устройств разных производителей.', 'ITU-R מסדיר את ספקטרום הרדיו, ‏IEEE כותב את תקני 802.11, ו-Wi-Fi Alliance מאשר שהתקנים של יצרנים שונים עובדים יחד.'],
        ['2.4 GHz reaches farther and passes walls better; 5 GHz is faster, has more channels and less interference.', '2,4 ГГц бьёт дальше и лучше проходит стены; 5 ГГц быстрее, там больше каналов и меньше помех.', '2.4 GHz מגיע רחוק יותר ועובר קירות טוב יותר; ‏5 GHz מהיר יותר, יש בו יותר ערוצים ופחות הפרעות.'],
      ])),
    lSec(['Components and topologies', 'Компоненты и топологии', 'רכיבים וטופולוגיות'],
      lUL([
        ['Wireless NIC in every client; a home wireless router (AP + switch + router); access points (APs) in companies.', 'Беспроводной адаптер в каждом клиенте; домашний беспроводной маршрутизатор (AP + коммутатор + маршрутизатор); точки доступа (AP) в компаниях.', 'כרטיס רשת אלחוטי בכל לקוח; נתב אלחוטי ביתי (AP + מתג + נתב); נקודות גישה (AP) בחברות.'],
        ['Autonomous AP — configured one by one. Controller-based (lightweight) AP — no own configuration, managed by a wireless LAN controller (WLC).', 'Автономная AP — настраивается по отдельности. AP на базе контроллера (lightweight) — своей конфигурации нет, ею управляет контроллер беспроводной сети (WLC).', 'AP אוטונומית — מוגדרת כל אחת בנפרד. ‏AP מבוססת בקר (lightweight) — בלי הגדרות משלה, מנוהלת על ידי בקר רשת אלחוטית (WLC).'],
        ['Antennas: omnidirectional (all around), directional (one direction, long range), MIMO (several antennas for more speed).', 'Антенны: всенаправленные (во все стороны), направленные (в одну сторону, на большое расстояние), MIMO (несколько антенн для скорости).', 'אנטנות: כל-כיווניות (לכל הכיוונים), כיווניות (לכיוון אחד, לטווח ארוך), ‏MIMO (כמה אנטנות למהירות גבוהה יותר).'],
      ]),
      lTable([['Mode', 'Режим', 'מצב'], ['Meaning', 'Смысл', 'משמעות']], [
        [['Ad hoc (IBSS)', 'Ad hoc (IBSS)', 'Ad hoc ‏(IBSS)'], ['Clients talk directly, no AP', 'Клиенты связываются напрямую, без AP', 'הלקוחות מדברים ישירות, בלי AP']],
        [['Infrastructure — BSS', 'Инфраструктура — BSS', 'תשתית — BSS'], ['One AP and its clients; the BSSID is the AP\'s MAC', 'Одна AP и её клиенты; BSSID — MAC-адрес AP', 'AP אחת והלקוחות שלה; ה-BSSID הוא כתובת ה-MAC של ה-AP']],
        [['Infrastructure — ESS', 'Инфраструктура — ESS', 'תשתית — ESS'], ['Several APs with the same SSID joined by a wired distribution system; clients roam', 'Несколько AP с одним SSID, соединённых проводной распределительной системой; клиенты переходят между ними (роуминг)', 'כמה נקודות AP עם אותו SSID שמחוברות במערכת הפצה קווית; הלקוחות עוברים ביניהן (roaming)']],
        [['Tethering', 'Тетеринг (точка доступа на телефоне)', 'Tethering (נקודה חמה בטלפון)'], ['A phone shares its cellular connection as a hotspot', 'Телефон раздаёт свою сотовую связь как хотспот', 'טלפון משתף את החיבור הסלולרי שלו כ-hotspot']],
      ])),
    lSec(['CAPWAP and the WLC', 'CAPWAP и контроллер WLC', 'CAPWAP וה-WLC'],
      lP(['Lightweight APs talk to the WLC with CAPWAP (Control And Provisioning of Wireless Access Points): UDP 5246 for control and UDP 5247 for data. The control channel is encrypted with DTLS.',
        'Lightweight AP общаются с WLC по CAPWAP (Control And Provisioning of Wireless Access Points): UDP 5246 для управления и UDP 5247 для данных. Канал управления шифруется DTLS.',
        'נקודות AP מסוג lightweight מדברות עם ה-WLC בפרוטוקול CAPWAP ‏(Control And Provisioning of Wireless Access Points): ‏UDP 5246 לבקרה ו-UDP 5247 לנתונים. ערוץ הבקרה מוצפן ב-DTLS.']),
      lUL([
        ['Split MAC: the AP does the real-time work — beacons, probe responses, acknowledgments, encryption.', 'Split MAC: AP выполняет работу в реальном времени — beacon, ответы на probe, подтверждения, шифрование.', 'Split MAC: ה-AP עושה את העבודה בזמן אמת — beacons, תשובות ל-probe, אישורים, הצפנה.'],
        ['The WLC does the management — authentication, association, roaming, RF management, security policy.', 'WLC выполняет управление — аутентификация, ассоциация, роуминг, управление радиосредой, политика безопасности.', 'ה-WLC עושה את הניהול — אימות, שיוך (association), ‏roaming, ניהול תדרים ומדיניות אבטחה.'],
      ])),
    lSec(['Channels and how a client connects', 'Каналы и подключение клиента', 'ערוצים ואיך לקוח מתחבר'],
      lP(['802.11 uses CSMA/CA: a station listens before it sends, and every frame is acknowledged. A client joins in three steps: discover the AP, authenticate, associate.',
        '802.11 использует CSMA/CA: станция слушает эфир перед передачей, и каждый кадр подтверждается. Клиент подключается в три шага: находит AP, проходит аутентификацию, ассоциируется.',
        '802.11 משתמש ב-CSMA/CA: תחנה מקשיבה לפני שהיא משדרת, וכל מסגרת מקבלת אישור. לקוח מצטרף בשלושה שלבים: מגלה את ה-AP, עובר אימות ומבצע שיוך (association).']),
      lUL([
        ['Passive discovery — the AP announces its SSID in beacons. Active discovery — the client sends probe requests (needed if the SSID is hidden).', 'Пассивное обнаружение — AP объявляет свой SSID в beacon. Активное — клиент отправляет probe request (нужно, если SSID скрыт).', 'גילוי פסיבי — ה-AP מכריזה על ה-SSID שלה ב-beacons. גילוי אקטיבי — הלקוח שולח probe requests (נדרש אם ה-SSID מוסתר).'],
        ['2.4 GHz: channels are 5 MHz apart but 22 MHz wide, so only 1, 6 and 11 do not overlap. Neighbouring APs must use different non-overlapping channels.', '2,4 ГГц: каналы отстоят на 5 МГц, но шириной 22 МГц, поэтому не перекрываются только 1, 6 и 11. Соседние AP должны работать на разных неперекрывающихся каналах.', '2.4 GHz: הערוצים במרחק 5 MHz זה מזה אבל ברוחב 22 MHz, ולכן רק 1, ‏6 ו-11 לא חופפים. נקודות AP שכנות חייבות להשתמש בערוצים שונים שלא חופפים.'],
        ['5 GHz: about 24 non-overlapping channels — much easier planning.', '5 ГГц: около 24 неперекрывающихся каналов — планировать гораздо проще.', '5 GHz: כ-24 ערוצים שלא חופפים — תכנון הרבה יותר קל.'],
      ]),
      lCode('Channel:  1  2  3  4  5  6  7  8  9  10  11\nAP-A [====1====]\nAP-B                [====6====]\nAP-C                                [====11===]', ['The three non-overlapping 2.4 GHz channels', 'Три неперекрывающихся канала 2,4 ГГц', 'שלושת הערוצים שלא חופפים ב-2.4 GHz'])),
    lSec(['WLAN threats and security', 'Угрозы WLAN и защита', 'איומים על WLAN ואבטחה'],
      lUL([
        ['Threats: interception, intruders, DoS (jamming, interference), rogue APs and evil twin attacks (a fake AP with the company SSID — man-in-the-middle).', 'Угрозы: перехват, посторонние пользователи, DoS (глушение, помехи), подставные AP и атака «злой двойник» (фальшивая AP с SSID компании — человек посередине).', 'איומים: יירוט, פולשים, ‏DoS (שיבוש, הפרעות), נקודות AP זדוניות (rogue) והתקפת evil twin ‏(AP מזויפת עם ה-SSID של החברה — man-in-the-middle).'],
        ['Weak "protection": hiding the SSID and MAC filtering — easy to bypass.', 'Слабая «защита»: скрытие SSID и фильтрация по MAC — легко обходятся.', '"הגנה" חלשה: הסתרת ה-SSID וסינון לפי MAC — קל לעקוף.'],
      ]),
      lTable([['Method', 'Метод', 'שיטה'], ['Encryption', 'Шифрование', 'הצפנה'], ['Status', 'Статус', 'מצב']], [
        ['WEP', 'RC4', ['Broken — never use', 'Взломан — не использовать', 'פרוץ — לא להשתמש']],
        ['WPA', 'TKIP', ['Outdated', 'Устарел', 'מיושן']],
        ['WPA2', 'AES-CCMP', ['Current standard', 'Текущий стандарт', 'התקן הנוכחי']],
        ['WPA3', ['AES; SAE instead of PSK', 'AES; SAE вместо PSK', 'AES; ‏SAE במקום PSK'], ['Newest, strongest', 'Самый новый и надёжный', 'החדש והחזק ביותר']],
      ]),
      lP(['Personal mode uses a pre-shared key (PSK) — fine for homes. Enterprise mode uses 802.1X with a RADIUS server — every user has own credentials.',
        'Режим Personal использует общий ключ (PSK) — подходит для дома. Режим Enterprise использует 802.1X с сервером RADIUS — у каждого пользователя свои учётные данные.',
        'מצב Personal משתמש במפתח משותף מראש (PSK) — מתאים לבית. מצב Enterprise משתמש ב-802.1X עם שרת RADIUS — לכל משתמש פרטי הזדהות משלו.'])),
  ],
  quiz: [
    lQ(['Which organization certifies that Wi-Fi devices from different vendors work together?', 'Какая организация сертифицирует совместимость Wi-Fi-устройств разных производителей?', 'איזה ארגון מאשר שהתקני Wi-Fi של יצרנים שונים עובדים יחד?'], ['Wi-Fi Alliance', 'IEEE', 'ITU-R', 'IETF'], 0,
      ['IEEE writes the standards, ITU-R regulates the spectrum.', 'IEEE пишет стандарты, ITU-R регулирует спектр.', 'IEEE כותב את התקנים, ‏ITU-R מסדיר את הספקטרום.']),
    lQ(['Which 2.4 GHz channels do not overlap?', 'Какие каналы 2,4 ГГц не перекрываются?', 'אילו ערוצים ב-2.4 GHz לא חופפים?'], ['1, 6, 11', '1, 2, 3', '1, 5, 9', '2, 7, 12'], 0,
      ['A channel is 22 MHz wide; neighbours are only 5 MHz apart.', 'Ширина канала 22 МГц, а соседние отстоят лишь на 5 МГц.', 'ערוץ ברוחב 22 MHz, והשכנים במרחק של 5 MHz בלבד.']),
    lQ(['Which media access method does 802.11 use?', 'Какой метод доступа к среде использует 802.11?', 'באיזו שיטת גישה למדיה משתמש 802.11?'], ['CSMA/CA', 'CSMA/CD', 'Token passing', 'Full-duplex switching'], 0,
      ['Collision Avoidance — a radio cannot detect collisions while sending.', 'Collision Avoidance — радио не может обнаружить коллизию во время передачи.', 'Collision Avoidance — רדיו לא יכול לזהות התנגשות בזמן שהוא משדר.']),
    lQ(['Several APs with the same SSID connected by a wired network form…', 'Несколько AP с одним SSID, соединённых проводной сетью, образуют…', 'כמה נקודות AP עם אותו SSID שמחוברות ברשת קווית יוצרות…'], [['An ESS', 'ESS', 'ESS'], ['A BSS', 'BSS', 'BSS'], ['An IBSS (ad hoc)', 'IBSS (ad hoc)', 'IBSS ‏(ad hoc)'], ['A WPAN', 'WPAN', 'WPAN']], 0,
      ['Extended Service Set — clients can roam between the APs.', 'Extended Service Set — клиенты переходят между AP.', 'Extended Service Set — הלקוחות יכולים לעבור בין נקודות ה-AP.']),
    lQ(['Which protocol do lightweight APs use to talk to a WLC?', 'Какой протокол используют lightweight AP для связи с WLC?', 'באיזה פרוטוקול נקודות AP מסוג lightweight מדברות עם WLC?'], ['CAPWAP', 'CDP', 'SNMP', 'LACP'], 0,
      ['UDP 5246 (control) and 5247 (data).', 'UDP 5246 (управление) и 5247 (данные).', 'UDP 5246 (בקרה) ו-5247 (נתונים).']),
    lQ(['A client looks for a hidden SSID. Which frame does it send?', 'Клиент ищет скрытый SSID. Какой кадр он отправляет?', 'לקוח מחפש SSID מוסתר. איזו מסגרת הוא שולח?'], ['Probe request', 'Beacon', 'Association response', 'BPDU'], 0,
      ['Beacons are sent by the AP (passive discovery).', 'Beacon отправляет AP (пассивное обнаружение).', 'Beacons נשלחים על ידי ה-AP (גילוי פסיבי).']),
    lQ(['Which wireless security method is broken and must not be used?', 'Какой метод защиты Wi-Fi взломан и не должен использоваться?', 'איזו שיטת אבטחה אלחוטית פרוצה ואסור להשתמש בה?'], ['WEP', 'WPA2', 'WPA3', '802.1X'], 0,
      ['WEP keys can be cracked in minutes.', 'Ключи WEP взламываются за минуты.', 'את מפתחות WEP אפשר לפרוץ תוך דקות.']),
    lQ(['Which encryption does WPA2 use?', 'Какое шифрование использует WPA2?', 'באיזו הצפנה משתמש WPA2?'], [['AES (CCMP)', 'AES (CCMP)', 'AES ‏(CCMP)'], ['RC4', 'RC4', 'RC4'], ['TKIP only', 'Только TKIP', 'רק TKIP'], ['None', 'Никакое', 'בלי הצפנה']], 0,
      ['TKIP belongs to WPA, RC4 to WEP.', 'TKIP — это WPA, RC4 — WEP.', 'TKIP שייך ל-WPA, ‏RC4 ל-WEP.']),
    lQ(['An attacker sets up an AP with the company SSID to capture users\' traffic. What is it called?', 'Злоумышленник поднимает AP с SSID компании, чтобы перехватывать трафик. Как это называется?', 'תוקף מקים AP עם ה-SSID של החברה כדי ללכוד את התעבורה של המשתמשים. איך זה נקרא?'], [['Evil twin', 'Злой двойник (evil twin)', 'Evil twin'], ['MAC flooding', 'Переполнение MAC-таблицы', 'הצפת MAC'], ['Tethering', 'Тетеринг', 'Tethering'], ['Roaming', 'Роуминг', 'Roaming']], 0,
      ['It is a man-in-the-middle attack; 802.1X and rogue-AP detection help.', 'Это атака «человек посередине»; помогают 802.1X и обнаружение подставных AP.', 'זו התקפת man-in-the-middle; ‏802.1X וזיהוי נקודות AP זדוניות עוזרים.']),
  ],
  gen: [
    function genWifiChannel(rng) {
      const c = rng.int(1, 11), ch = [];
      for (let x = 1; x <= 11; x++) ch.push(x);
      const good = ch.filter((x) => Math.abs(x - c) >= 5), bad = ch.filter((x) => Math.abs(x - c) < 5);
      return lGen(T('AP1 uses 2.4 GHz channel ' + c + ' (channels 1–11). Which channel should the neighbouring AP2 use so that they do not overlap?', 'AP1 работает на канале ' + c + ' в диапазоне 2,4 ГГц (каналы 1–11). Какой канал выбрать для соседней AP2, чтобы они не перекрывались?', 'AP1 משתמשת בערוץ ' + c + ' ב-2.4 GHz ‏(ערוצים 1–11). באיזה ערוץ צריכה להשתמש AP2 השכנה כדי שלא תהיה חפיפה?'),
        String(rng.pick(good)), rng.shuffle(bad).map(String),
        T('2.4 GHz channels overlap unless they are at least 5 channels apart (like 1, 6, 11).', 'Каналы 2,4 ГГц перекрываются, если между ними меньше 5 каналов (как у 1, 6, 11 — ровно 5).', 'ערוצים ב-2.4 GHz חופפים אם המרחק ביניהם קטן מ-5 ערוצים (כמו 1, ‏6, ‏11).'));
    },
    function genWifiStandard(rng) {
      if (rng.chance(0.65)) {
        const std = rng.pick(Object.keys(WIFI_STD)), key = WIFI_STD[std];
        return lGen(T('Which frequency band does ' + std + ' use?', 'Какой частотный диапазон использует ' + std + '?', 'באיזה תדר משתמש ' + std + '?'),
          WIFI_BANDS[key], rng.shuffle(Object.keys(WIFI_BANDS).filter((k) => k !== key)).map((k) => WIFI_BANDS[k]),
          T('a = 5 GHz, b and g = 2.4 GHz, n = both, ac = 5 GHz.', 'a — 5 ГГц, b и g — 2,4 ГГц, n — оба, ac — 5 ГГц.', 'a = 5 GHz, ‏b ו-g = 2.4 GHz, ‏n = שניהם, ‏ac = 5 GHz.'));
      }
      const name = rng.pick(Object.keys(WIFI_GEN)), std = WIFI_GEN[name];
      return lGen(T('Which IEEE standard is marketed as ' + name + '?', 'Какой стандарт IEEE продаётся под названием ' + name + '?', 'איזה תקן IEEE משווק בשם ' + name + '?'),
        std, rng.shuffle(['802.11n', '802.11ac', '802.11ax', '802.11g'].filter((s) => s !== std)),
        T('Wi-Fi 4 = 802.11n, Wi-Fi 5 = 802.11ac, Wi-Fi 6 = 802.11ax.', 'Wi-Fi 4 = 802.11n, Wi-Fi 5 = 802.11ac, Wi-Fi 6 = 802.11ax.', 'Wi-Fi 4 = 802.11n, ‏Wi-Fi 5 = 802.11ac, ‏Wi-Fi 6 = 802.11ax.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'srwe13', topic: null, minutes: 15,
  title: T('WLAN Configuration', 'Настройка WLAN', 'הגדרת רשת אלחוטית'),
  goal: T('Setting up a home or small-office wireless router, a WLAN with WPA2-PSK on a Cisco WLC, WPA2-Enterprise with RADIUS, the switch ports for APs and the WLC, and troubleshooting Wi-Fi problems.',
    'Настройка домашнего или офисного беспроводного маршрутизатора, WLAN с WPA2-PSK на контроллере Cisco WLC, WPA2-Enterprise с RADIUS, порты коммутатора для AP и WLC, поиск неисправностей Wi-Fi.',
    'הגדרת נתב אלחוטי לבית או למשרד קטן, ‏WLAN עם WPA2-PSK על בקר Cisco WLC, ‏WPA2-Enterprise עם RADIUS, פורטי המתג ל-AP ול-WLC, ופתרון תקלות Wi-Fi.'),
  sections: [
    lSec(['A home or small-office wireless router', 'Домашний или офисный беспроводной маршрутизатор', 'נתב אלחוטי לבית או למשרד קטן'],
      lUL([
        ['Log in to the web GUI (often 192.168.0.1 or 192.168.1.1) and change the default admin password first.', 'Войдите в веб-интерфейс (часто 192.168.0.1 или 192.168.1.1) и первым делом смените пароль администратора по умолчанию.', 'נכנסים לממשק ה-web (לרוב 192.168.0.1 או 192.168.1.1) וקודם כול מחליפים את סיסמת המנהל של ברירת המחדל.'],
        ['Set the SSID, WPA2- or WPA3-Personal (AES) and a long passphrase.', 'Задайте SSID, WPA2- или WPA3-Personal (AES) и длинную парольную фразу.', 'מגדירים SSID, ‏WPA2 או WPA3-Personal ‏(AES) וסיסמה ארוכה.'],
        ['Choose the band and channel (or Auto), and the network mode (e.g. mixed 802.11 b/g/n for old clients).', 'Выберите диапазон и канал (или Auto) и режим сети (например, смешанный 802.11 b/g/n для старых клиентов).', 'בוחרים תדר וערוץ (או Auto) ומצב רשת (למשל mixed ‏802.11 b/g/n ללקוחות ישנים).'],
        ['The router is the DHCP server for the LAN and does NAT to the Internet (WAN port).', 'Маршрутизатор — DHCP-сервер для LAN и выполняет NAT в интернет (порт WAN).', 'הנתב הוא שרת ה-DHCP של ה-LAN ומבצע NAT לאינטרנט (פורט WAN).'],
        ['Extras: a guest network, QoS for voice and video, port forwarding for a server at home, firmware updates.', 'Дополнительно: гостевая сеть, QoS для голоса и видео, проброс портов для домашнего сервера, обновление прошивки.', 'תוספות: רשת אורחים, ‏QoS לקול ולווידאו, ‏port forwarding לשרת בבית, עדכוני קושחה.'],
      ]),
      lTip(['Port forwarding lets a connection from the Internet reach one internal host, e.g. TCP 443 → 192.168.1.10.', 'Проброс портов позволяет подключению из интернета попасть на один внутренний хост, например TCP 443 → 192.168.1.10.', 'Port forwarding מאפשר לחיבור מהאינטרנט להגיע למארח פנימי אחד, למשל TCP 443 → 192.168.1.10.'])),
    lSec(['A WLAN with WPA2-PSK on a WLC', 'WLAN с WPA2-PSK на WLC', 'WLAN עם WPA2-PSK על WLC'],
      lP(['On a Cisco WLC (e.g. 3504) you create a WLAN in the GUI under WLANs → Create New: a profile name, the SSID and an ID; map it to an interface (a VLAN); under Security choose WPA2 with PSK; then enable it. The lightweight APs that joined the WLC start broadcasting the SSID. The same in the AireOS CLI:',
        'На контроллере Cisco WLC (например, 3504) WLAN создают в веб-интерфейсе в разделе WLANs → Create New: имя профиля, SSID и ID; привязывают к интерфейсу (VLAN); в Security выбирают WPA2 с PSK; затем включают. Lightweight AP, подключённые к WLC, начинают вещать SSID. То же в CLI AireOS:',
        'בבקר Cisco WLC (למשל 3504) יוצרים WLAN בממשק ה-web תחת WLANs → Create New: שם פרופיל, ‏SSID ו-ID; משייכים לממשק (VLAN); תחת Security בוחרים WPA2 עם PSK; ואז מפעילים. נקודות ה-AP מסוג lightweight שהצטרפו ל-WLC מתחילות לשדר את ה-SSID. אותו דבר ב-CLI של AireOS:']),
      lCode('(Cisco Controller) > config wlan create 2 Office Office\n(Cisco Controller) > config wlan interface 2 vlan0010\n(Cisco Controller) > config wlan security wpa akm psk enable 2\n(Cisco Controller) > config wlan security wpa akm psk set-key ascii Str0ngPassPhrase 2\n(Cisco Controller) > config wlan enable 2\n(Cisco Controller) > show wlan summary'),
      lP(['The WLC also needs its management interface (an IP in the management VLAN) and can run an internal DHCP scope for wireless clients.', 'Контроллеру также нужен management-интерфейс (IP в VLAN управления); он может выдавать адреса беспроводным клиентам из встроенного DHCP-пула (scope).', 'ה-WLC צריך גם ממשק ניהול (IP ב-VLAN הניהול), והוא יכול להריץ מאגר DHCP פנימי (scope) ללקוחות האלחוטיים.'])),
    lSec(['WPA2-Enterprise with RADIUS', 'WPA2-Enterprise с RADIUS', 'WPA2-Enterprise עם RADIUS'],
      lCode('(Cisco Controller) > config radius auth add 1 192.168.200.254 1812 ascii RadiusSecret\n(Cisco Controller) > config interface create vlan0005 5\n(Cisco Controller) > config wlan create 3 Staff Staff\n(Cisco Controller) > config wlan interface 3 vlan0005\n(Cisco Controller) > config wlan security wpa akm 802.1x enable 3\n(Cisco Controller) > config wlan radius_server auth add 3 1\n(Cisco Controller) > config wlan enable 3'),
      lUL([
        ['Add the RADIUS server (IP, UDP 1812, shared secret) under Security → AAA → RADIUS.', 'Добавьте сервер RADIUS (IP, UDP 1812, общий секрет) в Security → AAA → RADIUS.', 'מוסיפים את שרת ה-RADIUS ‏(IP, ‏UDP 1812, סוד משותף) תחת Security → AAA → RADIUS.'],
        ['Create a dynamic interface for the users\' VLAN (IP, gateway, DHCP server).', 'Создайте динамический интерфейс для VLAN пользователей (IP, шлюз, DHCP-сервер).', 'יוצרים ממשק דינמי ל-VLAN של המשתמשים (IP, שער, שרת DHCP).'],
        ['In the WLAN: Security → Layer 2 → WPA2 + 802.1X, and on the AAA Servers tab choose the RADIUS server.', 'В WLAN: Security → Layer 2 → WPA2 + 802.1X, на вкладке AAA Servers выберите сервер RADIUS.', 'ב-WLAN: ‏Security → Layer 2 → WPA2 + 802.1X, ובלשונית AAA Servers בוחרים את שרת ה-RADIUS.'],
      ])),
    lSec(['Switch ports for the WLC and the APs', 'Порты коммутатора для WLC и AP', 'פורטי המתג ל-WLC ול-AP'],
      lCode('S1(config)# interface g1/0/1               ! to the WLC: carries all WLAN VLANs\nS1(config-if)# switchport mode trunk\nS1(config-if)# switchport trunk allowed vlan 1,5,10\nS1(config)# interface g1/0/2               ! to a lightweight AP (PoE)\nS1(config-if)# switchport mode access\nS1(config-if)# switchport access vlan 1\nS1(config-if)# spanning-tree portfast'),
      lP(['A lightweight AP in local mode sends all client traffic to the WLC inside the CAPWAP tunnel, so its port is a simple access port. The WLC port is a trunk because each WLAN maps to its own VLAN.',
        'Lightweight AP в режиме local отправляет весь трафик клиентов на WLC внутри туннеля CAPWAP, поэтому её порт — обычный access. Порт WLC — trunk, потому что каждый WLAN привязан к своему VLAN.',
        'AP מסוג lightweight במצב local שולחת את כל תעבורת הלקוחות ל-WLC בתוך מנהרת CAPWAP, ולכן הפורט שלה הוא פורט access רגיל. הפורט של ה-WLC הוא trunk כי כל WLAN משויך ל-VLAN משלו.'])),
    lSec(['Troubleshooting Wi-Fi', 'Поиск неисправностей Wi-Fi', 'פתרון תקלות Wi-Fi'],
      lUL([
        ['Cannot connect: wrong SSID or passphrase, different security type, wireless NIC off, client too far, client supports only 2.4 GHz but the SSID is 5 GHz only.', 'Не подключается: неверный SSID или пароль, другой тип защиты, выключен адаптер, клиент далеко, клиент умеет только 2,4 ГГц, а SSID есть только на 5 ГГц.', 'לא מתחבר: SSID או סיסמה שגויים, סוג אבטחה שונה, כרטיס אלחוטי כבוי, לקוח רחוק מדי, הלקוח תומך רק ב-2.4 GHz וה-SSID קיים רק ב-5 GHz.'],
        ['Connected but no IP (169.254.x.x): DHCP scope full or wrong VLAN/interface mapping.', 'Подключён, но нет IP (169.254.x.x): DHCP-пул исчерпан или неверная привязка к VLAN/интерфейсу.', 'מחובר אבל אין IP ‏(169.254.x.x): מאגר ה-DHCP מלא או שיוך שגוי ל-VLAN/ממשק.'],
        ['Slow or dropping: interference (microwave ovens, cordless phones, neighbours on the same channel) — change the channel or move clients to 5 GHz; update firmware.', 'Медленно или обрывается: помехи (микроволновки, радиотелефоны, соседи на том же канале) — смените канал или переведите клиентов на 5 ГГц; обновите прошивку.', 'איטי או מתנתק: הפרעות (מיקרוגל, טלפונים אלחוטיים, שכנים באותו ערוץ) — מחליפים ערוץ או מעבירים לקוחות ל-5 GHz; מעדכנים קושחה.'],
        ['Work bottom-up: radio and signal → association → IP address → gateway → DNS.', 'Идите снизу вверх: радио и сигнал → ассоциация → IP-адрес → шлюз → DNS.', 'עובדים מלמטה למעלה: רדיו ועוצמת אות → שיוך → כתובת IP → שער → DNS.'],
      ])),
  ],
  quiz: [
    lQ(['What should you change first on a new home wireless router?', 'Что нужно сменить первым на новом домашнем беспроводном маршрутизаторе?', 'מה צריך לשנות קודם כול בנתב אלחוטי ביתי חדש?'], [['The default admin password', 'Пароль администратора по умолчанию', 'את סיסמת המנהל של ברירת המחדל'], ['The LAN IP range', 'Диапазон IP в LAN', 'את טווח ה-IP ב-LAN'], ['The channel width', 'Ширину канала', 'את רוחב הערוץ'], ['The time zone', 'Часовой пояс', 'את אזור הזמן']], 0,
      ['Default passwords are public on the Internet.', 'Пароли по умолчанию опубликованы в интернете.', 'סיסמאות ברירת מחדל מפורסמות באינטרנט.']),
    lQ(['Which security setting is best for a home WLAN today?', 'Какая защита лучше всего подходит для домашней WLAN сегодня?', 'איזו הגדרת אבטחה הכי מתאימה היום ל-WLAN ביתי?'], [['WPA3-Personal (or WPA2-Personal with AES)', 'WPA3-Personal (или WPA2-Personal с AES)', 'WPA3-Personal (או WPA2-Personal עם AES)'], ['WEP 128-bit', 'WEP 128 бит', 'WEP ‏128 ביט'], ['Open with a hidden SSID', 'Открытая сеть со скрытым SSID', 'רשת פתוחה עם SSID מוסתר'], ['MAC filtering only', 'Только фильтр по MAC', 'רק סינון לפי MAC']], 0,
      ['Hiding the SSID and MAC filtering are not real security.', 'Скрытие SSID и фильтр по MAC — не настоящая защита.', 'הסתרת SSID וסינון MAC הם לא אבטחה אמיתית.']),
    lQ(['In WPA2-Enterprise, who checks the user\'s credentials?', 'Кто проверяет учётные данные пользователя в WPA2-Enterprise?', 'מי בודק את פרטי ההזדהות של המשתמש ב-WPA2-Enterprise?'], [['A RADIUS server', 'Сервер RADIUS', 'שרת RADIUS'], ['The access point by itself', 'Сама точка доступа', 'נקודת הגישה בעצמה'], ['The DHCP server', 'DHCP-сервер', 'שרת ה-DHCP'], ['The client', 'Сам клиент', 'הלקוח']], 0,
      ['802.1X: supplicant → authenticator (WLC/AP) → RADIUS.', '802.1X: supplicant → authenticator (WLC/AP) → RADIUS.', '802.1X: ‏supplicant → authenticator ‏(WLC/AP) → RADIUS.']),
    lQ(['Which UDP port is used for RADIUS authentication?', 'Какой UDP-порт используется для аутентификации RADIUS?', 'באיזה פורט UDP משתמשים לאימות RADIUS?'], ['1812', '1813', '49', '5246'], 0,
      ['1813 = RADIUS accounting, 49 = TACACS+ (TCP), 5246 = CAPWAP control.', '1813 — учёт RADIUS, 49 — TACACS+ (TCP), 5246 — управление CAPWAP.', '1813 = ‏accounting של RADIUS, ‏49 = TACACS+ ‏(TCP), ‏5246 = בקרת CAPWAP.']),
    lQ(['On a WLC, each WLAN (SSID) is mapped to…', 'На WLC каждая WLAN (SSID) привязывается к…', 'ב-WLC, כל WLAN ‏(SSID) משויך ל…'], [['An interface (a VLAN)', 'Интерфейсу (VLAN)', 'ממשק (VLAN)'], ['A physical AP port', 'Физическому порту AP', 'פורט פיזי של AP'], ['A routing protocol', 'Протоколу маршрутизации', 'פרוטוקול ניתוב'], ['An EtherChannel', 'EtherChannel', 'EtherChannel']], 0,
      ['That is how wireless users land in the right VLAN.', 'Так беспроводные пользователи попадают в нужный VLAN.', 'כך המשתמשים האלחוטיים מגיעים ל-VLAN הנכון.']),
    lQ(['How should the switch port to a WLC with several WLANs be configured?', 'Как настроить порт коммутатора к WLC с несколькими WLAN?', 'איך מגדירים את פורט המתג ל-WLC עם כמה רשתות WLAN?'], [['As a trunk', 'Как trunk', 'כ-trunk'], ['As an access port in VLAN 1', 'Как access-порт в VLAN 1', 'כפורט access ב-VLAN 1'], ['Shut down', 'Выключенным', 'כבוי'], ['As a routed port', 'Как маршрутизируемый порт', 'כפורט מנותב']], 0,
      ['Each WLAN uses its own VLAN, so the link must carry several VLANs.', 'Каждая WLAN использует свой VLAN, поэтому канал должен нести несколько VLAN.', 'כל WLAN משתמש ב-VLAN משלו, ולכן הקישור חייב להעביר כמה VLAN.']),
    lQ(['Users near the kitchen lose Wi-Fi when the microwave runs. Best fix?', 'У пользователей рядом с кухней пропадает Wi-Fi, когда работает микроволновка. Лучшее решение?', 'למשתמשים ליד המטבח נופל ה-Wi-Fi כשהמיקרוגל עובד. מה הפתרון הטוב ביותר?'], [['Move the clients to the 5 GHz band', 'Перевести клиентов в диапазон 5 ГГц', 'להעביר את הלקוחות לתדר 5 GHz'], ['Hide the SSID', 'Скрыть SSID', 'להסתיר את ה-SSID'], ['Switch to WEP', 'Перейти на WEP', 'לעבור ל-WEP'], ['Add MAC filtering', 'Включить фильтр по MAC', 'להוסיף סינון MAC']], 0,
      ['Microwave ovens interfere with 2.4 GHz.', 'Микроволновки создают помехи в 2,4 ГГц.', 'מיקרוגל מפריע לתדר 2.4 GHz.']),
    lQ(['A laptop connects to the SSID but gets 169.254.10.7. What do you check?', 'Ноутбук подключается к SSID, но получает 169.254.10.7. Что проверить?', 'מחשב נייד מתחבר ל-SSID אבל מקבל 169.254.10.7. מה בודקים?'], [['The DHCP scope and the WLAN-to-VLAN mapping', 'DHCP-пул и привязку WLAN к VLAN', 'את מאגר ה-DHCP ואת השיוך של ה-WLAN ל-VLAN'], ['The antenna type', 'Тип антенны', 'את סוג האנטנה'], ['The channel width', 'Ширину канала', 'את רוחב הערוץ'], ['The SSID name length', 'Длину имени SSID', 'את אורך שם ה-SSID']], 0,
      ['Association worked; the problem is at the IP layer.', 'Ассоциация прошла — проблема на уровне IP.', 'השיוך הצליח; הבעיה בשכבת ה-IP.']),
  ],
});

// ---------------------------------------------------------------
// Источники маршрутов и их административное расстояние (для генераторов).
const ROUTE_SOURCES = [
  { name: T('Static route', 'Статический маршрут', 'נתיב סטטי'), ad: 1 },
  { name: T('eBGP', 'eBGP', 'eBGP'), ad: 20 },
  { name: T('EIGRP', 'EIGRP', 'EIGRP'), ad: 90 },
  { name: T('OSPF', 'OSPF', 'OSPF'), ad: 110 },
  { name: T('IS-IS', 'IS-IS', 'IS-IS'), ad: 115 },
  { name: T('RIP', 'RIP', 'RIP'), ad: 120 },
  { name: T('External EIGRP', 'Внешний EIGRP', 'EIGRP חיצוני'), ad: 170 },
  { name: T('iBGP', 'iBGP', 'iBGP'), ad: 200 },
];
const ROUTE_CODES = { O: 3, D: 2, R: 5, S: 0 };   // код в show ip route → индекс в ROUTE_SOURCES

lessonDef({
  id: 'srwe14', topic: 'static', drill: 'routing', minutes: 16,
  title: T('Routing Concepts', 'Принципы маршрутизации', 'עקרונות ניתוב'),
  goal: T('How a router chooses the best path and forwards a packet, CEF, reading every field of a routing table entry, static vs dynamic routing, metrics and administrative distance.',
    'Как маршрутизатор выбирает лучший путь и пересылает пакет, CEF, разбор каждого поля записи в таблице маршрутизации, статическая и динамическая маршрутизация, метрики и административное расстояние.',
    'איך נתב בוחר את הנתיב הטוב ביותר ומעביר חבילה, ‏CEF, קריאת כל שדה ברשומה של טבלת הניתוב, ניתוב סטטי מול דינמי, מטריקות ומרחק מנהלי.'),
  sections: [
    lSec(['Path determination', 'Выбор пути', 'בחירת נתיב'],
      lP(['A router has two jobs: find the best path to the destination and forward the packet on that path. For every packet it looks up the destination IP in the routing table and uses the longest matching prefix.',
        'У маршрутизатора две задачи: найти лучший путь к получателю и переслать пакет по этому пути. Для каждого пакета он ищет IP получателя в таблице маршрутизации и выбирает самый длинный совпадающий префикс.',
        'לנתב יש שני תפקידים: למצוא את הנתיב הטוב ביותר ליעד ולהעביר את החבילה בנתיב הזה. לכל חבילה הוא מחפש את כתובת ה-IP של היעד בטבלת הניתוב ובוחר את הקידומת התואמת הארוכה ביותר.']),
      lUL([
        ['Directly connected — the destination is on one of the router\'s own networks: deliver it (ARP or ND for the host\'s MAC).', 'Напрямую подключена — получатель в одной из сетей маршрутизатора: доставить (ARP или ND для MAC хоста).', 'מחוברת ישירות — היעד באחת הרשתות של הנתב עצמו: למסור אותה (ARP או ND כדי למצוא את ה-MAC של המארח).'],
        ['Remote — send it to the next-hop router.', 'Удалённая — отправить следующему маршрутизатору (next hop).', 'מרוחקת — לשלוח לנתב ה-next hop.'],
        ['No route — use the default route (gateway of last resort) or drop the packet and send ICMP "destination unreachable".', 'Маршрута нет — использовать маршрут по умолчанию (gateway of last resort) или отбросить пакет и отправить ICMP «destination unreachable».', 'אין נתיב — להשתמש בנתיב ברירת המחדל (gateway of last resort) או לזרוק את החבילה ולשלוח ICMP ‏"destination unreachable".'],
      ]),
      lP(['The metric chooses between paths of the SAME protocol: RIP — hop count, OSPF — cost (bandwidth), EIGRP — bandwidth and delay. Equal-cost paths are load-balanced (ECMP).',
        'Метрика выбирает между путями ОДНОГО протокола: RIP — число переходов, OSPF — стоимость (по полосе), EIGRP — полоса и задержка. Пути с равной стоимостью используются вместе (ECMP).',
        'המטריקה בוחרת בין נתיבים של אותו פרוטוקול: ‏RIP — מספר קפיצות, ‏OSPF — עלות (לפי רוחב פס), ‏EIGRP — רוחב פס והשהיה. נתיבים בעלות שווה מאוזנים ביניהם (ECMP).'])),
    lSec(['Packet forwarding', 'Пересылка пакета', 'העברת חבילה'],
      lUL([
        ['The router removes the incoming Layer 2 frame, reads the IP header, decrements the TTL (TTL 0 → drop + ICMP "time exceeded").', 'Маршрутизатор снимает входящий кадр 2-го уровня, читает IP-заголовок, уменьшает TTL (TTL 0 → отбросить + ICMP «time exceeded»).', 'הנתב מסיר את מסגרת שכבה 2 הנכנסת, קורא את כותרת ה-IP ומקטין את ה-TTL ‏(TTL 0 → לזרוק + ICMP ‏"time exceeded").'],
        ['It finds the exit interface and next hop, then builds a NEW frame for the outgoing link: new source and destination MAC.', 'Находит выходной интерфейс и next hop, затем строит НОВЫЙ кадр для выходного канала: новые MAC источника и получателя.', 'הוא מוצא את ממשק היציאה ואת ה-next hop, ובונה מסגרת חדשה לקישור היוצא: כתובות MAC חדשות של מקור ויעד.'],
        ['The IP addresses do not change on the way (without NAT); the MAC addresses change at every hop.', 'IP-адреса по пути не меняются (без NAT); MAC-адреса меняются на каждом переходе.', 'כתובות ה-IP לא משתנות בדרך (בלי NAT); כתובות ה-MAC משתנות בכל קפיצה.'],
      ]),
      lTable([['Mechanism', 'Механизм', 'מנגנון'], ['How it works', 'Как работает', 'איך זה עובד']], [
        ['Process switching', ['The CPU looks up every packet — slowest', 'CPU ищет маршрут для каждого пакета — самый медленный', 'ה-CPU מחפש נתיב לכל חבילה — הכי איטי']],
        ['Fast switching', ['The first packet is process-switched, the result is cached for the next ones', 'Первый пакет обрабатывает CPU, результат кэшируется для следующих', 'החבילה הראשונה מטופלת ב-CPU והתוצאה נשמרת במטמון לבאות']],
        [['Cisco Express Forwarding (CEF)', 'Cisco Express Forwarding (CEF)', 'Cisco Express Forwarding ‏(CEF)'], ['FIB + adjacency table built in advance — fastest, the default', 'Заранее построенные FIB и таблица смежности — самый быстрый, по умолчанию', 'FIB וטבלת שכנויות שנבנים מראש — הכי מהיר, ברירת המחדל']],
      ])),
    lSec(['Reading a routing table entry', 'Как читать запись таблицы маршрутизации', 'איך קוראים רשומה בטבלת הניתוב'],
      lCode('R1# show ip route\nCodes: L - local, C - connected, S - static, R - RIP, D - EIGRP, O - OSPF, * - candidate default\n\nO    10.0.4.0/24 [110/50] via 10.0.3.2, 00:13:29, Serial0/1/1\n|    |            |   |       |         |         |\n|    |            |   |       |         |         exit interface\n|    |            |   |       |         time since the route was learned\n|    |            |   |       next-hop address\n|    |            |   metric\n|    |            administrative distance\n|    destination network / prefix length\nroute source'),
      lUL([
        ['C and L appear only when the interface has an address and is up/up.', 'C и L появляются, только если у интерфейса есть адрес и он в состоянии up/up.', 'C ו-L מופיעים רק כשלממשק יש כתובת והוא במצב up/up.'],
        ['show ipv6 route reads the same way; IPv6 routing needs "ipv6 unicast-routing".', 'show ipv6 route читается так же; для маршрутизации IPv6 нужна «ipv6 unicast-routing».', 'show ipv6 route נקרא באותה צורה; ניתוב IPv6 דורש "ipv6 unicast-routing".'],
      ])),
    lSec(['Static or dynamic routing', 'Статическая или динамическая маршрутизация', 'ניתוב סטטי או דינמי'],
      lTable([['Aspect', 'Критерий', 'היבט'], ['Static', 'Статическая', 'סטטי'], ['Dynamic', 'Динамическая', 'דינמי']], [
        [['Configuration', 'Настройка', 'הגדרה'], ['Grows with the network', 'Растёт вместе с сетью', 'גדלה יחד עם הרשת'], ['Independent of network size', 'Не зависит от размера сети', 'לא תלויה בגודל הרשת']],
        [['Topology changes', 'Изменения топологии', 'שינויים בטופולוגיה'], ['Admin must fix by hand', 'Админ исправляет вручную', 'המנהל מתקן ידנית'], ['Adapts automatically', 'Подстраивается сам', 'מסתגל אוטומטית']],
        [['Resources', 'Ресурсы', 'משאבים'], ['No CPU, RAM or bandwidth', 'Без затрат CPU, памяти и полосы', 'בלי CPU, זיכרון או רוחב פס'], ['Uses CPU, RAM and link bandwidth', 'Расходует CPU, память и полосу', 'צורך CPU, זיכרון ורוחב פס']],
        [['Security / predictability', 'Безопасность / предсказуемость', 'אבטחה / צפיות'], ['More secure, path always the same', 'Безопаснее, путь всегда один и тот же', 'מאובטח יותר, הנתיב תמיד זהה'], ['Updates must be secured, path can change', 'Обновления нужно защищать, путь может меняться', 'צריך לאבטח את העדכונים, הנתיב יכול להשתנות']],
      ]),
      lUL([
        ['Static fits small and stub networks and the default route to the ISP.', 'Статика подходит для маленьких и тупиковых (stub) сетей и маршрута по умолчанию к провайдеру.', 'סטטי מתאים לרשתות קטנות ולרשתות stub, ולנתיב ברירת המחדל לספק.'],
        ['Interior (IGP): RIP and EIGRP (distance vector), OSPF and IS-IS (link-state). Exterior (EGP): BGP between autonomous systems.', 'Внутренние (IGP): RIP и EIGRP (дистанционно-векторные), OSPF и IS-IS (состояния каналов). Внешний (EGP): BGP между автономными системами.', 'פנימיים (IGP): ‏RIP ו-EIGRP (וקטור-מרחק), ‏OSPF ו-IS-IS (מצב-קישור). חיצוני (EGP): ‏BGP בין מערכות אוטונומיות.'],
      ])),
    lSec(['Administrative distance and the best route', 'Административное расстояние и лучший маршрут', 'מרחק מנהלי והנתיב הטוב ביותר'],
      lTable([['Route source', 'Источник маршрута', 'מקור הנתיב'], 'AD'], [
        [['Connected', 'Подключённая сеть', 'רשת מחוברת'], '0'], [['Static', 'Статический', 'סטטי'], '1'], ['eBGP', '20'], [['EIGRP (internal)', 'EIGRP (внутренний)', 'EIGRP (פנימי)'], '90'],
        ['OSPF', '110'], ['IS-IS', '115'], ['RIP', '120'], [['EIGRP (external)', 'EIGRP (внешний)', 'EIGRP (חיצוני)'], '170'], ['iBGP', '200'],
      ]),
      lUL([
        ['Same prefix from different sources → the lowest AD is installed.', 'Один префикс из разных источников → в таблицу попадает наименьшее AD.', 'אותה קידומת ממקורות שונים → נכנס הנתיב עם ה-AD הנמוך ביותר.'],
        ['Same prefix from one protocol over different paths → the lowest metric wins.', 'Один префикс от одного протокола по разным путям → побеждает наименьшая метрика.', 'אותה קידומת מאותו פרוטוקול בנתיבים שונים → המטריקה הנמוכה מנצחת.'],
        ['Different prefix lengths (10.1.0.0/16 and 10.1.1.0/24) are different routes — both are installed, and each packet uses the longest match.', 'Разные длины префикса (10.1.0.0/16 и 10.1.1.0/24) — разные маршруты: устанавливаются оба, каждый пакет идёт по самому длинному совпадению.', 'אורכי קידומת שונים (10.1.0.0/16 ו-10.1.1.0/24) הם נתיבים שונים — שניהם נכנסים לטבלה, וכל חבילה משתמשת בהתאמה הארוכה ביותר.'],
      ])),
  ],
  quiz: [
    lQ(['In "O 10.0.4.0/24 [110/50] via 10.0.3.2", what is 110?', 'Что означает 110 в «O 10.0.4.0/24 [110/50] via 10.0.3.2»?', 'מה זה 110 ב-"O 10.0.4.0/24 [110/50] via 10.0.3.2"?'], [['The administrative distance', 'Административное расстояние', 'המרחק המנהלי'], ['The metric', 'Метрика', 'המטריקה'], ['The hop count', 'Число переходов', 'מספר הקפיצות'], ['The bandwidth', 'Полоса пропускания', 'רוחב הפס']], 0,
      ['[AD/metric]; 50 is the OSPF cost.', '[AD/метрика]; 50 — стоимость OSPF.', '[AD/מטריקה]; ‏50 היא עלות ה-OSPF.']),
    lQ(['A packet has no matching route and there is no default route. What does the router do?', 'Для пакета нет подходящего маршрута и нет маршрута по умолчанию. Что сделает маршрутизатор?', 'אין נתיב מתאים לחבילה ואין נתיב ברירת מחדל. מה הנתב יעשה?'], [['Drops it and sends ICMP destination unreachable', 'Отбросит его и отправит ICMP destination unreachable', 'יזרוק אותה וישלח ICMP destination unreachable'], ['Floods it out all interfaces', 'Разошлёт во все интерфейсы', 'יציף אותה לכל הממשקים'], ['Sends it back to the source', 'Отправит обратно источнику', 'ישלח אותה חזרה למקור'], ['Holds it until a route appears', 'Будет хранить, пока не появится маршрут', 'יחזיק אותה עד שיופיע נתיב']], 0,
      ['Routers never flood packets like switches flood frames.', 'Маршрутизаторы не рассылают пакеты, как коммутаторы кадры.', 'נתבים אף פעם לא מציפים חבילות כמו שמתגים מציפים מסגרות.']),
    lQ(['Which packet-forwarding mechanism is the fastest and the Cisco default?', 'Какой механизм пересылки самый быстрый и используется Cisco по умолчанию?', 'איזה מנגנון העברת חבילות הוא המהיר ביותר וברירת המחדל ב-Cisco?'], ['CEF', 'Process switching', 'Fast switching', 'Store-and-forward'], 0,
      ['CEF uses the FIB and adjacency table built in advance.', 'CEF использует заранее построенные FIB и таблицу смежности.', 'CEF משתמש ב-FIB ובטבלת שכנויות שנבנים מראש.']),
    lQ(['R1 learns 10.5.5.0/24 from OSPF and from internal EIGRP. Which is installed?', 'R1 узнаёт 10.5.5.0/24 от OSPF и от внутреннего EIGRP. Какой маршрут будет установлен?', 'R1 לומד את 10.5.5.0/24 גם מ-OSPF וגם מ-EIGRP פנימי. איזה נתיב ייכנס לטבלה?'], [['The EIGRP route (AD 90)', 'Маршрут EIGRP (AD 90)', 'נתיב ה-EIGRP ‏(AD 90)'], ['The OSPF route (AD 110)', 'Маршрут OSPF (AD 110)', 'נתיב ה-OSPF ‏(AD 110)'], ['Both, load-balanced', 'Оба, с балансировкой', 'שניהם, עם איזון עומסים'], ['The one with the lower metric', 'Тот, у которого меньше метрика', 'זה עם המטריקה הנמוכה']], 0,
      ['Metrics of different protocols cannot be compared — AD decides.', 'Метрики разных протоколов несравнимы — решает AD.', 'אי אפשר להשוות מטריקות של פרוטוקולים שונים — ה-AD מכריע.']),
    lQ(['What happens to the TTL at each router?', 'Что происходит с TTL на каждом маршрутизаторе?', 'מה קורה ל-TTL בכל נתב?'], [['It is decreased by 1', 'Уменьшается на 1', 'הוא יורד ב-1'], ['It is reset to 255', 'Сбрасывается в 255', 'הוא מתאפס ל-255'], ['It is increased by 1', 'Увеличивается на 1', 'הוא עולה ב-1'], ['It does not change', 'Не меняется', 'הוא לא משתנה']], 0,
      ['At 0 the packet is dropped — this stops routing loops.', 'При 0 пакет отбрасывается — так прерываются петли маршрутизации.', 'כשהוא מגיע ל-0 החבילה נזרקת — כך נעצרות לולאות ניתוב.']),
    lQ(['Which address changes at every hop on the way to the destination?', 'Какой адрес меняется на каждом переходе по пути к получателю?', 'איזו כתובת משתנה בכל קפיצה בדרך ליעד?'], [['The MAC addresses', 'MAC-адреса', 'כתובות ה-MAC'], ['The destination IP', 'IP получателя', 'כתובת ה-IP של היעד'], ['The source IP', 'IP источника', 'כתובת ה-IP של המקור'], ['None of them', 'Никакой', 'אף אחת']], 0,
      ['Each link gets a new frame; IPs stay the same (without NAT).', 'На каждом канале строится новый кадр; IP остаются прежними (без NAT).', 'בכל קישור נבנית מסגרת חדשה; כתובות ה-IP נשארות (בלי NAT).']),
    lQ(['Which metric does RIP use?', 'Какую метрику использует RIP?', 'באיזו מטריקה משתמש RIP?'], [['Hop count', 'Число переходов', 'מספר קפיצות'], ['Cost based on bandwidth', 'Стоимость по полосе', 'עלות לפי רוחב פס'], ['Bandwidth and delay', 'Полоса и задержка', 'רוחב פס והשהיה'], ['Administrative distance', 'Административное расстояние', 'מרחק מנהלי']], 0,
      ['OSPF uses cost, EIGRP bandwidth and delay.', 'OSPF использует стоимость, EIGRP — полосу и задержку.', 'OSPF משתמש בעלות, ‏EIGRP ברוחב פס ובהשהיה.']),
    lQ(['Which is an advantage of static routing?', 'Какое преимущество у статической маршрутизации?', 'מה היתרון של ניתוב סטטי?'], [['No routing updates — less overhead and more secure', 'Нет обновлений маршрутизации — меньше нагрузки и безопаснее', 'אין עדכוני ניתוב — פחות עומס ויותר אבטחה'], ['It adapts to failures automatically', 'Сам подстраивается под отказы', 'מסתגל לתקלות אוטומטית'], ['It scales best in large networks', 'Лучше всего масштабируется в больших сетях', 'מתאים הכי טוב לרשתות גדולות'], ['It needs no configuration', 'Не требует настройки', 'לא צריך הגדרה']], 0,
      ['Its weakness: every change is manual.', 'Слабое место: каждое изменение делается вручную.', 'החולשה שלו: כל שינוי נעשה ידנית.']),
    lQ(['Which routing protocol is an exterior gateway protocol?', 'Какой протокол маршрутизации — внешний (EGP)?', 'איזה פרוטוקול ניתוב הוא פרוטוקול חיצוני (EGP)?'], ['BGP', 'OSPF', 'EIGRP', 'RIP'], 0,
      ['BGP routes between autonomous systems, e.g. between ISPs.', 'BGP маршрутизирует между автономными системами, например между провайдерами.', 'BGP מנתב בין מערכות אוטונומיות, למשל בין ספקים.']),
  ],
  gen: [
    function genAdWinner(rng) {
      const src = rng.shuffle(ROUTE_SOURCES).slice(0, 3);
      const best = src.slice().sort((a, b) => a.ad - b.ad)[0];
      const net = '10.' + rng.int(0, 255) + '.' + rng.int(0, 255) + '.0/24';
      const list = (lang) => src.map((s) => s.name[lang]).join(', ');
      return lGen(T('R1 learns the same prefix ' + net + ' from: ' + list('en') + '. Which one goes into the routing table?', 'R1 узнаёт один и тот же префикс ' + net + ' от: ' + list('ru') + '. Какой маршрут попадёт в таблицу маршрутизации?', 'R1 לומד את אותה קידומת ' + net + ' מ: ' + list('he') + '. איזה נתיב ייכנס לטבלת הניתוב?'),
        best.name, src.filter((s) => s !== best).map((s) => s.name).concat([T('All three — they are load-balanced', 'Все три — с балансировкой нагрузки', 'שלושתם — עם איזון עומסים')]),
        T('The lowest administrative distance wins: ' + src.map((s) => s.name.en + ' ' + s.ad).join(', ') + '.', 'Побеждает наименьшее административное расстояние: ' + src.map((s) => s.name.ru + ' ' + s.ad).join(', ') + '.', 'המרחק המנהלי הנמוך ביותר מנצח: ' + src.map((s) => s.name.he + ' ' + s.ad).join(', ') + '.'));
    },
    function genRouteEntry(rng) {
      const code = rng.pick(['O', 'O', 'D', 'R', 'S']);
      const ad = { O: 110, D: 90, R: 120, S: 1 }[code];
      const metric = { O: rng.int(2, 200), D: rng.int(2816, 3000000), R: rng.int(1, 15), S: 0 }[code];
      const len = rng.pick([16, 24, 24, 26]);
      const net = len === 16 ? '172.' + rng.int(16, 31) + '.0.0' : '192.168.' + rng.int(0, 255) + '.' + (len === 26 ? 64 * rng.int(0, 3) : 0);
      const k = rng.int(0, 255), m = rng.int(0, 60), nh = '10.1.' + k + '.' + (4 * m + 2);
      const ifs = ['GigabitEthernet0/0/0', 'GigabitEthernet0/0/1', 'Serial0/1/0', 'Serial0/1/1'], iface = rng.pick(ifs);
      const time = '00:' + String(rng.int(0, 59)).padStart(2, '0') + ':' + String(rng.int(0, 59)).padStart(2, '0');
      const line = padR(code, 5) + net + '/' + len + ' [' + ad + '/' + metric + '] via ' + nh + (code === 'S' ? '' : ', ' + time + ', ' + iface);
      const fields = code === 'S' ? ['ad', 'metric', 'nh', 'src'] : ['ad', 'metric', 'nh', 'iface', 'src'];
      const f = rng.pick(fields);
      const names = { ad: ['administrative distance', 'административное расстояние', 'המרחק המנהלי'], metric: ['metric', 'метрика', 'המטריקה'], nh: ['next-hop address', 'адрес следующего перехода (next hop)', 'כתובת ה-next hop'], iface: ['exit interface', 'выходной интерфейс', 'ממשק היציאה'], src: ['route source', 'источник маршрута', 'מקור הנתיב'] }[f];
      let right, wrong;
      if (f === 'ad') { right = String(ad); wrong = [String(metric), '110', '90', '120', '1', '20'].filter((x) => x !== right); }
      else if (f === 'metric') { right = String(metric); wrong = [String(ad), String(len), String(metric + (metric < 16 ? 1 : 10))]; }
      else if (f === 'nh') { right = nh; wrong = [net, '10.1.' + k + '.' + (4 * m + 1), '0.0.0.0']; }
      else if (f === 'iface') { right = iface; wrong = rng.shuffle(ifs.filter((x) => x !== iface)); }
      else { const s = ROUTE_SOURCES[ROUTE_CODES[code]]; right = s.name; wrong = rng.shuffle(['O', 'D', 'R', 'S'].filter((c) => c !== code)).map((c) => ROUTE_SOURCES[ROUTE_CODES[c]].name); }
      const q = lGen(T('In this routing table entry, what is the ' + names[0] + '?', 'Каково значение «' + names[1] + '» в этой записи таблицы маршрутизации?', 'מה ' + names[2] + ' ברשומה הזו של טבלת הניתוב?'),
        right, wrong,
        T('Format: code, network/prefix [AD/metric] via next hop, age, exit interface. S = static, O = OSPF, D = EIGRP, R = RIP.', 'Формат: код, сеть/префикс [AD/метрика] via next hop, время, выходной интерфейс. S — статический, O — OSPF, D — EIGRP, R — RIP.', 'המבנה: קוד, רשת/קידומת [AD/מטריקה] via next hop, זמן, ממשק יציאה. ‏S = סטטי, ‏O = OSPF, ‏D = EIGRP, ‏R = RIP.'));
      q.code = line;
      return q;
    },
  ],
});

// ---------------------------------------------------------------
const FLOAT_PRIMARY = { OSPF: 110, EIGRP: 90, RIP: 120, eBGP: 20 };

lessonDef({
  id: 'srwe16', topic: 'trouble', drill: 'routing', minutes: 14,
  title: T('Troubleshoot Static and Default Routes', 'Неисправности статических маршрутов', 'פתרון תקלות בנתיבים סטטיים'),
  goal: T('How packets follow static routes, what breaks them, the commands for finding the fault, and fixing typical errors: wrong next hop, wrong mask, missing return route and routing loops.',
    'Как пакеты идут по статическим маршрутам, что их ломает, команды для поиска неисправности и исправление типичных ошибок: неверный next hop, неверная маска, нет обратного маршрута, петли маршрутизации.',
    'איך חבילות עוברות בנתיבים סטטיים, מה שובר אותם, הפקודות למציאת התקלה ותיקון שגיאות נפוצות: next hop שגוי, מסכה שגויה, חסר נתיב חזרה ולולאות ניתוב.'),
  sections: [
    lSec(['A packet\'s trip with static routes', 'Путь пакета по статическим маршрутам', 'הדרך של חבילה בנתיבים סטטיים'],
      lCode('PC1 192.168.1.10 ─ R1 ─ 10.0.0.0/30 ─ R2 ─ PC3 192.168.2.10\n\nR1: ip route 192.168.2.0 255.255.255.0 10.0.0.2\nR2: ip route 192.168.1.0 255.255.255.0 10.0.0.1'),
      lUL([
        ['PC1 sends the packet to its gateway R1 (different subnet).', 'PC1 отправляет пакет своему шлюзу R1 (другая подсеть).', 'PC1 שולח את החבילה לשער שלו R1 (תת-רשת אחרת).'],
        ['R1 finds 192.168.2.0/24 via 10.0.0.2, then resolves 10.0.0.2 in its connected 10.0.0.0/30 (recursive lookup) and sends it to R2.', 'R1 находит 192.168.2.0/24 через 10.0.0.2, затем ищет 10.0.0.2 в подключённой сети 10.0.0.0/30 (рекурсивный поиск) и отправляет пакет R2.', 'R1 מוצא את 192.168.2.0/24 דרך 10.0.0.2, אחר כך מחפש את 10.0.0.2 ברשת המחוברת 10.0.0.0/30 (חיפוש רקורסיבי) ושולח ל-R2.'],
        ['R2 delivers it on its connected LAN. The reply needs R2\'s route back to 192.168.1.0/24.', 'R2 доставляет пакет в свою подключённую LAN. Для ответа нужен маршрут R2 обратно в 192.168.1.0/24.', 'R2 מוסר את החבילה ב-LAN המחובר שלו. התשובה צריכה נתיב ב-R2 חזרה ל-192.168.1.0/24.'],
      ])),
    lSec(['What breaks static routes', 'Что ломает статические маршруты', 'מה שובר נתיבים סטטיים'],
      lUL([
        ['Static routes do not adapt: if the topology changes, the admin must change them.', 'Статические маршруты не подстраиваются: если меняется топология, их должен менять администратор.', 'נתיבים סטטיים לא מסתגלים: אם הטופולוגיה משתנה, המנהל חייב לשנות אותם.'],
        ['A route with a next hop is removed from the table when the next hop is no longer reachable (e.g. the exit interface goes down).', 'Маршрут с next hop удаляется из таблицы, когда next hop становится недостижим (например, упал выходной интерфейс).', 'נתיב עם next hop מוסר מהטבלה כשה-next hop כבר לא נגיש (למשל ממשק היציאה נפל).'],
        ['A route whose next hop is not in any connected (or routed) network is never installed.', 'Маршрут, чей next hop не входит ни в одну подключённую (или известную) сеть, вообще не устанавливается.', 'נתיב שה-next hop שלו לא נמצא באף רשת מחוברת (או ידועה) לא נכנס לטבלה בכלל.'],
        ['A floating static route (higher AD) takes over only when the main route disappears.', 'Плавающий статический маршрут (большее AD) включается, только когда исчезает основной.', 'נתיב סטטי צף (AD גבוה יותר) נכנס לפעולה רק כשהנתיב הראשי נעלם.'],
      ])),
    lSec(['Troubleshooting commands', 'Команды поиска неисправностей', 'פקודות לפתרון תקלות'],
      lCode('R1# ping 192.168.2.10 source g0/0/0          ! extended ping from the LAN side\nR1# traceroute 192.168.2.10\nR1# show ip route static\nR1# show ip route 192.168.2.0                  ! one specific route\nR1# show ip interface brief\nR1# show running-config | include ip route\nR1# show cdp neighbors detail                  ! neighbours\' real IP addresses'),
      lTip(['A ping from the router itself uses the exit interface as source and can succeed even when the return route to the LAN is missing. Ping with "source" the LAN interface to test the full path.', 'Ping с самого маршрутизатора использует выходной интерфейс как источник и может пройти, даже если обратного маршрута в LAN нет. Делайте ping с «source» LAN-интерфейса, чтобы проверить весь путь.', 'Ping מהנתב עצמו משתמש בממשק היציאה כמקור ויכול להצליח גם כשחסר נתיב חזרה ל-LAN. עושים ping עם "source" של ממשק ה-LAN כדי לבדוק את כל הנתיב.'])),
    lSec(['Typical errors and fixes', 'Типичные ошибки и исправление', 'שגיאות נפוצות ותיקון'],
      lTable([['Symptom', 'Симптом', 'תסמין'], ['Likely cause', 'Вероятная причина', 'סיבה אפשרית']], [
        [['Route missing from show ip route', 'Маршрута нет в show ip route', 'הנתיב לא מופיע ב-show ip route'], ['Next hop typo / not in a connected subnet, or exit interface down', 'Опечатка в next hop / он не в подключённой подсети, или выходной интерфейс выключен', 'שגיאת הקלדה ב-next hop / הוא לא בתת-רשת מחוברת, או שממשק היציאה כבוי']],
        [['Some hosts reachable, others not', 'Часть хостов доступна, часть нет', 'חלק מהמארחים נגישים וחלק לא'], ['Wrong mask or network address in ip route', 'Неверная маска или адрес сети в ip route', 'מסכה או כתובת רשת שגויות ב-ip route']],
        [['Router pings work, PC pings fail', 'Ping с маршрутизатора работает, с ПК нет', 'Ping מהנתב עובד, ממחשב לא'], ['Missing return route on the far router', 'Нет обратного маршрута на дальнем маршрутизаторе', 'חסר נתיב חזרה בנתב המרוחק']],
        [['traceroute repeats the same two routers', 'traceroute повторяет одни и те же два маршрутизатора', 'traceroute חוזר על אותם שני נתבים'], ['Routing loop — e.g. two default routes pointing at each other', 'Петля маршрутизации — например, два маршрута по умолчанию указывают друг на друга', 'לולאת ניתוב — למשל שני נתיבי ברירת מחדל שמצביעים זה על זה']],
        [['"Gateway of last resort is not set"', '«Gateway of last resort is not set»', '"Gateway of last resort is not set"'], ['No default route', 'Нет маршрута по умолчанию', 'אין נתיב ברירת מחדל']],
      ]),
      lCode('R1(config)# no ip route 192.168.2.0 255.255.255.0 10.0.0.6   ! remove the wrong route\nR1(config)# ip route 192.168.2.0 255.255.255.0 10.0.0.2      ! add the correct one\nR1(config)# ip route 192.168.2.0 255.255.255.0 g0/0/1 10.0.0.2  ! fully specified (Ethernet)'),
      lP(['On Ethernet links prefer a next-hop or a fully specified route (exit interface + next hop): a route with only an Ethernet exit interface depends on proxy ARP.', 'На каналах Ethernet лучше указывать next hop или полностью заданный маршрут (выходной интерфейс + next hop): маршрут только с Ethernet-интерфейсом зависит от proxy ARP.', 'בקישורי Ethernet עדיף להגדיר next hop או נתיב מוגדר במלואו (ממשק יציאה + next hop): נתיב עם ממשק Ethernet בלבד תלוי ב-proxy ARP.'])),
  ],
  quiz: [
    lQ(['A static route via next hop 10.0.0.2 disappeared from the routing table. Most likely cause?', 'Статический маршрут через next hop 10.0.0.2 пропал из таблицы маршрутизации. Наиболее вероятная причина?', 'נתיב סטטי דרך next hop ‏10.0.0.2 נעלם מטבלת הניתוב. מה הסיבה הסבירה?'], [['The interface toward 10.0.0.2 went down', 'Упал интерфейс в сторону 10.0.0.2', 'הממשק לכיוון 10.0.0.2 נפל'], ['The route aged out after 5 minutes', 'Маршрут устарел через 5 минут', 'הנתיב פג אחרי 5 דקות'], ['OSPF removed it', 'Его удалил OSPF', 'OSPF מחק אותו'], ['The startup-config was erased', 'Стёрли startup-config', 'ה-startup-config נמחק']], 0,
      ['Static routes do not age out; they disappear when the next hop is unreachable.', 'Статические маршруты не устаревают; они пропадают, когда next hop недостижим.', 'נתיבים סטטיים לא פגים; הם נעלמים כשה-next hop לא נגיש.']),
    lQ(['R1 can ping PC3, but PC1 (behind R1) cannot. What is most likely missing?', 'R1 пингует PC3, а PC1 (за R1) — нет. Чего, скорее всего, не хватает?', 'R1 מצליח לעשות ping ל-PC3, אבל PC1 (שמאחורי R1) לא. מה כנראה חסר?'], [['A route on R2 back to PC1\'s LAN', 'Маршрута на R2 обратно в LAN PC1', 'נתיב ב-R2 חזרה ל-LAN של PC1'], ['A route on R1 to PC3\'s LAN', 'Маршрута на R1 в LAN PC3', 'נתיב ב-R1 ל-LAN של PC3'], ['An IP on the switch', 'IP на коммутаторе', 'IP במתג'], ['A DNS server', 'DNS-сервера', 'שרת DNS']], 0,
      ['R1\'s own ping uses the link address that R2 knows; PC1\'s LAN is unknown to R2.', 'Ping с R1 идёт от адреса канала, который R2 знает; LAN PC1 для R2 неизвестна.', 'ה-ping של R1 יוצא מכתובת הקישור ש-R2 מכיר; את ה-LAN של PC1 ‏R2 לא מכיר.']),
    lQ(['traceroute shows R1, R2, R1, R2, … until it times out. What is it?', 'traceroute показывает R1, R2, R1, R2, … до тайм-аута. Что это?', 'traceroute מציג R1, ‏R2, ‏R1, ‏R2, … עד שנגמר הזמן. מה זה?'], [['A routing loop', 'Петля маршрутизации', 'לולאת ניתוב'], ['A broadcast storm', 'Широковещательный шторм', 'סופת broadcast'], ['A duplex mismatch', 'Несовпадение дуплекса', 'אי-התאמת דופלקס'], ['A DNS failure', 'Сбой DNS', 'תקלת DNS']], 0,
      ['The TTL stops the packet; fix the routes that point at each other.', 'Пакет остановит TTL; исправьте маршруты, указывающие друг на друга.', 'ה-TTL יעצור את החבילה; מתקנים את הנתיבים שמצביעים זה על זה.']),
    lQ(['What does "Gateway of last resort is not set" mean?', 'Что означает «Gateway of last resort is not set»?', 'מה המשמעות של "Gateway of last resort is not set"?'], [['There is no default route', 'Нет маршрута по умолчанию', 'אין נתיב ברירת מחדל'], ['The router has no IP addresses', 'У маршрутизатора нет IP-адресов', 'לנתב אין כתובות IP'], ['The PCs have no gateway', 'У ПК нет шлюза', 'למחשבים אין שער'], ['The routing table is full', 'Таблица маршрутизации переполнена', 'טבלת הניתוב מלאה']], 0,
      ['Add one with ip route 0.0.0.0 0.0.0.0 <next hop>.', 'Добавьте: ip route 0.0.0.0 0.0.0.0 <next hop>.', 'מוסיפים: ip route 0.0.0.0 0.0.0.0 <next hop>.']),
    lQ(['How do you remove a wrong static route?', 'Как удалить неверный статический маршрут?', 'איך מוחקים נתיב סטטי שגוי?'], [['no ip route <network> <mask> <next hop>', 'no ip route <сеть> <маска> <next hop>', 'no ip route <רשת> <מסכה> <next hop>'], ['clear ip route *', 'clear ip route *', 'clear ip route *'], ['delete ip route', 'delete ip route', 'delete ip route'], ['ip route reset', 'ip route reset', 'ip route reset']], 0,
      ['Type the same command with "no" in front.', 'Введите ту же команду с «no» впереди.', 'מקלידים את אותה פקודה עם "no" בהתחלה.']),
    lQ(['Which command shows only the static routes?', 'Какая команда показывает только статические маршруты?', 'איזו פקודה מציגה רק את הנתיבים הסטטיים?'], ['show ip route static', 'show static', 'show ip static route', 'show route summary'], 0,
      ['show running-config | include ip route shows the commands as typed.', 'show running-config | include ip route показывает команды в том виде, как их ввели.', 'show running-config | include ip route מציג את הפקודות כפי שהוקלדו.']),
    lQ(['How do you test a route from the router as if the packet came from its LAN?', 'Как проверить маршрут с маршрутизатора так, будто пакет пришёл из его LAN?', 'איך בודקים נתיב מהנתב כאילו החבילה הגיעה מה-LAN שלו?'], [['Extended ping with the LAN interface as source', 'Расширенный ping с LAN-интерфейсом в качестве источника', 'Ping מורחב עם ממשק ה-LAN כמקור'], ['show ip interface brief', 'show ip interface brief', 'show ip interface brief'], ['debug all', 'debug all', 'debug all'], ['A ping with a bigger packet size', 'Ping с большим размером пакета', 'Ping עם חבילה גדולה יותר']], 0,
      ['ping 192.168.2.10 source g0/0/0.', 'ping 192.168.2.10 source g0/0/0.', 'ping 192.168.2.10 source g0/0/0.']),
    lQ(['For a static route out an Ethernet interface, which form is recommended?', 'Какую форму статического маршрута через Ethernet-интерфейс рекомендуется использовать?', 'איזו צורה של נתיב סטטי דרך ממשק Ethernet מומלצת?'], [['Next hop or fully specified (interface + next hop)', 'Next hop или полностью заданный (интерфейс + next hop)', 'Next hop או מוגדר במלואו (ממשק + next hop)'], ['Exit interface only', 'Только выходной интерфейс', 'ממשק יציאה בלבד'], ['Wildcard mask instead of a subnet mask', 'Wildcard-маска вместо маски подсети', 'מסכת wildcard במקום מסכת רשת'], ['AD 255', 'AD 255', 'AD 255']], 0,
      ['Exit-interface-only routes on Ethernet rely on proxy ARP.', 'Маршруты только с Ethernet-интерфейсом зависят от proxy ARP.', 'נתיבים עם ממשק Ethernet בלבד תלויים ב-proxy ARP.']),
  ],
  gen: [
    function genNextHop(rng) {
      const len = rng.pick([24, 29, 30, 30]), size = Math.pow(2, 32 - len);
      const base = ipToInt('10.' + rng.int(0, 255) + '.' + rng.int(0, 255) + '.0') + size * rng.int(0, 256 / size - 2);
      const mine = base + 1;
      let nh;
      const valid = rng.chance(0.5);
      if (valid) { do { nh = base + rng.int(2, size - 2); } while (nh === mine); }
      else nh = base + size + rng.int(1, Math.min(size, 6) - 1 || 1);
      const dst = '192.168.' + rng.int(1, 250) + '.0';
      const yes = T('Yes — the next hop is in a connected subnet', 'Да — next hop находится в подключённой подсети', 'כן — ה-next hop נמצא בתת-רשת מחוברת');
      const no = T('No — the next hop is not reachable through any connected network', 'Нет — next hop недостижим ни через одну подключённую сеть', 'לא — ה-next hop לא נגיש דרך אף רשת מחוברת');
      const q = lGen(T('R1 has only connected networks; its G0/0/1 is ' + intToIp(mine) + '/' + len + ' (up/up). You add "ip route ' + dst + ' 255.255.255.0 ' + intToIp(nh) + '". Will the route be installed in the routing table?',
        'У R1 есть только подключённые сети; его G0/0/1 — ' + intToIp(mine) + '/' + len + ' (up/up). Вы добавляете «ip route ' + dst + ' 255.255.255.0 ' + intToIp(nh) + '». Попадёт ли маршрут в таблицу маршрутизации?',
        'ל-R1 יש רק רשתות מחוברות; ה-G0/0/1 שלו הוא ' + intToIp(mine) + '/' + len + ' ‏(up/up). מוסיפים "ip route ' + dst + ' 255.255.255.0 ' + intToIp(nh) + '". האם הנתיב ייכנס לטבלת הניתוב?'),
        valid ? yes : no, [valid ? no : yes, T('Yes — static routes are always installed', 'Да — статические маршруты устанавливаются всегда', 'כן — נתיבים סטטיים תמיד נכנסים לטבלה'), T('No — a static route needs an exit interface, not a next hop', 'Нет — статическому маршруту нужен выходной интерфейс, а не next hop', 'לא — נתיב סטטי צריך ממשק יציאה ולא next hop')],
        T('The connected subnet is ' + intToIp(base) + '/' + len + ' (hosts ' + intToIp(base + 1) + '–' + intToIp(base + size - 2) + '). ' + intToIp(nh) + (valid ? ' is inside it, so the route is installed.' : ' is outside it, so the recursive lookup fails and the route is not installed.'),
          'Подключённая подсеть — ' + intToIp(base) + '/' + len + ' (хосты ' + intToIp(base + 1) + '–' + intToIp(base + size - 2) + '). ' + intToIp(nh) + (valid ? ' внутри неё, поэтому маршрут устанавливается.' : ' вне её, рекурсивный поиск не удаётся, и маршрут не устанавливается.'),
          'תת-הרשת המחוברת היא ' + intToIp(base) + '/' + len + ' (מארחים ' + intToIp(base + 1) + '–' + intToIp(base + size - 2) + '). ' + intToIp(nh) + (valid ? ' נמצא בתוכה, ולכן הנתיב נכנס לטבלה.' : ' נמצא מחוצה לה, החיפוש הרקורסיבי נכשל והנתיב לא נכנס לטבלה.')));
      return q;
    },
    function genFloatingAd(rng) {
      const p = rng.pick(Object.keys(FLOAT_PRIMARY)), ad = FLOAT_PRIMARY[p];
      const right = rng.pick([ad + 5, ad + 10, 130, 150, 200, 250].filter((x) => x > ad && x < 255));
      const low = rng.shuffle([1, 5, 10, 15, ad - 1, ad - 10, ad - 20, 90, 100].filter((x) => x >= 1 && x < ad));
      return lGen(T('R1 learns its default route via ' + p + '. A backup static default route through a second ISP must be used ONLY when the ' + p + ' route is lost. Which administrative distance do you give the static route?',
        'R1 получает маршрут по умолчанию через ' + p + '. Резервный статический маршрут по умолчанию через второго провайдера должен использоваться ТОЛЬКО при потере маршрута ' + p + '. Какое административное расстояние ему задать?',
        'R1 לומד את נתיב ברירת המחדל דרך ' + p + '. נתיב ברירת מחדל סטטי לגיבוי דרך ספק שני צריך לשמש רק כשנתיב ה-' + p + ' אובד. איזה מרחק מנהלי נותנים לנתיב הסטטי?'),
        String(right), low.map(String),
        T(p + ' has AD ' + ad + '. The floating static route needs a HIGHER AD (but below 255), so it stays out of the table while the ' + p + ' route exists.',
          'У ' + p + ' AD ' + ad + '. Плавающему статическому маршруту нужно БОЛЬШЕЕ AD (но меньше 255), чтобы он не попадал в таблицу, пока есть маршрут ' + p + '.',
          'ל-' + p + ' יש AD ‏' + ad + '. הנתיב הסטטי הצף צריך AD גבוה יותר (אבל מתחת ל-255), כדי שלא ייכנס לטבלה כל עוד נתיב ה-' + p + ' קיים.'));
    },
  ],
});

// ===============================================================
// Глоссарий для новых уроков SRWE (G определена в glossary.js, который загружен раньше).
G('srwe01', 'Boot loader', 'Загрузчик (boot loader)', 'Boot loader', 'Small program that starts after POST and loads the IOS image from flash.', 'Небольшая программа, которая запускается после POST и загружает образ IOS из flash.', 'תוכנה קטנה שעולה אחרי POST וטוענת את קובץ ה-IOS מה-flash.');
G('srwe01', 'SSH', 'SSH', 'SSH', 'Secure Shell — encrypted remote CLI access, TCP 22. Replaces Telnet.', 'Secure Shell — зашифрованный удалённый доступ к CLI, TCP 22. Замена Telnet.', 'Secure Shell — גישה מרחוק מוצפנת ל-CLI, ‏TCP 22. מחליף את Telnet.');
G('srwe01', 'ip default-gateway', 'ip default-gateway', 'ip default-gateway', 'Global command that gives a Layer 2 switch a gateway, so it can be managed from other networks.', 'Глобальная команда, задающая шлюз коммутатору 2-го уровня, чтобы им можно было управлять из других сетей.', 'פקודה גלובלית שנותנת למתג שכבה 2 שער, כדי שאפשר יהיה לנהל אותו מרשתות אחרות.');
G('srwe01', 'Late collision', 'Поздняя коллизия', 'התנגשות מאוחרת (Late collision)', 'A collision after the first 64 bytes — usually a duplex mismatch or a cable that is too long.', 'Коллизия после первых 64 байт — обычно несовпадение дуплекса или слишком длинный кабель.', 'התנגשות אחרי 64 הבתים הראשונים — בדרך כלל אי-התאמת דופלקס או כבל ארוך מדי.');
G('srwe02', 'Cut-through switching', 'Сквозная коммутация (cut-through)', 'מיתוג Cut-through', 'Forwarding a frame before it is fully received: fast-forward or fragment-free.', 'Пересылка кадра до его полного приёма: fast-forward или fragment-free.', 'העברת מסגרת לפני שהתקבלה כולה: fast-forward או fragment-free.');
G('srwe02', 'Fragment-free', 'Fragment-free', 'Fragment-free', 'Cut-through mode that reads the first 64 bytes, filtering most collision fragments.', 'Режим cut-through, читающий первые 64 байта и отсеивающий большинство обрывков коллизий.', 'מצב cut-through שקורא את 64 הבתים הראשונים ומסנן את רוב שברי ההתנגשויות.');
G('srwe02', 'Microsegmentation', 'Микросегментация', 'Microsegmentation', 'Each device on its own switch port, so each link is its own collision domain.', 'Каждое устройство на своём порту коммутатора — каждый канал отдельный домен коллизий.', 'כל התקן בפורט משלו במתג, כך שכל קישור הוא תחום התנגשות נפרד.');
G('srwe02', 'Ingress / egress port', 'Входной / выходной порт', 'פורט כניסה / יציאה', 'The port where a frame enters the switch / the port where it leaves.', 'Порт, через который кадр входит в коммутатор / через который выходит.', 'הפורט שבו מסגרת נכנסת למתג / הפורט שבו היא יוצאת.');
G('srwe05', 'STP', 'STP', 'STP', 'Spanning Tree Protocol (802.1D) — blocks redundant links to prevent Layer 2 loops.', 'Spanning Tree Protocol (802.1D) — блокирует резервные каналы, чтобы не было петель 2-го уровня.', 'Spanning Tree Protocol ‏(802.1D) — חוסם קישורים כפולים כדי למנוע לולאות בשכבה 2.');
G('srwe05', 'BPDU', 'BPDU', 'BPDU', 'Bridge Protocol Data Unit — the message STP switches exchange.', 'Bridge Protocol Data Unit — сообщение, которым обмениваются коммутаторы STP.', 'Bridge Protocol Data Unit — ההודעה שמתגי STP מחליפים ביניהם.');
G('srwe05', 'Bridge ID', 'Идентификатор моста (BID)', 'מזהה גשר (Bridge ID)', 'Priority + extended system ID (VLAN) + MAC; the lowest becomes the root bridge.', 'Приоритет + extended system ID (VLAN) + MAC; наименьший становится корневым мостом.', 'עדיפות + extended system ID ‏(VLAN) + MAC; הנמוך ביותר הופך ל-root bridge.');
G('srwe05', 'Root bridge', 'Корневой мост', 'Root bridge', 'The reference switch of the spanning tree; all its ports are designated.', 'Опорный коммутатор связующего дерева; все его порты — назначенные.', 'מתג הייחוס של העץ; כל הפורטים שלו הם designated.');
G('srwe05', 'Root port', 'Корневой порт', 'Root port', 'The port of a non-root switch with the lowest-cost path to the root bridge.', 'Порт некорневого коммутатора с самым дешёвым путём к корню.', 'הפורט של מתג שאינו root עם הנתיב הזול ביותר ל-root bridge.');
G('srwe05', 'Designated port', 'Назначенный порт', 'Designated port', 'The forwarding port on each link, closest to the root.', 'Пересылающий порт на каждом канале, ближайший к корню.', 'הפורט המעביר בכל קישור, הקרוב ביותר ל-root.');
G('srwe05', 'Broadcast storm', 'Широковещательный шторм', 'סופת broadcast', 'Broadcasts looping and multiplying in a Layer 2 loop until the network stops.', 'Broadcast, которые крутятся и множатся в петле 2-го уровня, пока сеть не встанет.', 'שידורי broadcast שמסתובבים ומתרבים בלולאה בשכבה 2 עד שהרשת נעצרת.');
G('srwe05', 'RSTP', 'RSTP', 'RSTP', 'Rapid STP (802.1w) — converges in seconds; Cisco runs it per VLAN as Rapid PVST+.', 'Быстрый STP (802.1w) — сходится за секунды; у Cisco работает по VLAN как Rapid PVST+.', 'STP מהיר (802.1w) — מתכנס תוך שניות; ב-Cisco רץ לכל VLAN בתור Rapid PVST+.');
G('srwe05', 'PortFast', 'PortFast', 'PortFast', 'Puts an access port straight into forwarding, skipping listening and learning.', 'Сразу переводит access-порт в forwarding, минуя listening и learning.', 'מעביר פורט access ישר ל-forwarding בלי listening ו-learning.');
G('srwe05', 'BPDU Guard', 'BPDU Guard', 'BPDU Guard', 'Err-disables an edge port that receives a BPDU.', 'Переводит пограничный порт в err-disabled при получении BPDU.', 'מעביר פורט קצה ל-err-disabled כשמגיע אליו BPDU.');
G('srwe06', 'EtherChannel', 'EtherChannel', 'EtherChannel', 'Several physical links bundled into one logical link for bandwidth and redundancy.', 'Несколько физических каналов, объединённых в один логический ради полосы и резервирования.', 'כמה קישורים פיזיים שמאוחדים לקישור לוגי אחד בשביל רוחב פס ויתירות.');
G('srwe06', 'Port-channel', 'Port-channel', 'Port-channel', 'The logical interface of an EtherChannel; configure it instead of the member ports.', 'Логический интерфейс EtherChannel; настраивают его вместо портов-участников.', 'הממשק הלוגי של EtherChannel; מגדירים אותו במקום את הפורטים החברים.');
G('srwe06', 'LACP', 'LACP', 'LACP', 'IEEE 802.3ad EtherChannel negotiation; modes active and passive.', 'Согласование EtherChannel по IEEE 802.3ad; режимы active и passive.', 'משא ומתן על EtherChannel לפי IEEE 802.3ad; מצבים active ו-passive.');
G('srwe06', 'PAgP', 'PAgP', 'PAgP', 'Cisco-proprietary EtherChannel negotiation; modes desirable and auto.', 'Проприетарное согласование EtherChannel от Cisco; режимы desirable и auto.', 'משא ומתן קנייני של Cisco על EtherChannel; מצבים desirable ו-auto.');
G('srwe08', 'Router Advertisement (RA)', 'Router Advertisement (RA)', 'Router Advertisement ‏(RA)', 'ICMPv6 type 134: prefix, prefix length, gateway and the A/O/M flags for hosts.', 'ICMPv6 тип 134: префикс, длина префикса, шлюз и флаги A/O/M для хостов.', 'ICMPv6 סוג 134: קידומת, אורך קידומת, שער והדגלים A/O/M למארחים.');
G('srwe08', 'Stateless DHCPv6', 'DHCPv6 без состояния', 'DHCPv6 בלי מצב (Stateless)', 'DHCPv6 that gives only options like DNS; the address comes from SLAAC (O flag).', 'DHCPv6, который выдаёт только параметры вроде DNS; адрес — из SLAAC (флаг O).', 'DHCPv6 שנותן רק אפשרויות כמו DNS; הכתובת מגיעה מ-SLAAC (דגל O).');
G('srwe08', 'Stateful DHCPv6', 'DHCPv6 с состоянием', 'DHCPv6 עם מצב (Stateful)', 'DHCPv6 that leases addresses and remembers them, like DHCPv4 (M flag).', 'DHCPv6, который сдаёт адреса в аренду и помнит их, как DHCPv4 (флаг M).', 'DHCPv6 שמחכיר כתובות וזוכר אותן, כמו DHCPv4 (דגל M).');
G('srwe08', 'DAD', 'DAD', 'DAD', 'Duplicate Address Detection — a Neighbor Solicitation for its own address before using it.', 'Duplicate Address Detection — Neighbor Solicitation на собственный адрес перед его использованием.', 'Duplicate Address Detection — שליחת Neighbor Solicitation לכתובת של עצמך לפני שמשתמשים בה.');
G('srwe09', 'FHRP', 'FHRP', 'FHRP', 'First Hop Redundancy Protocol — several routers share one virtual default gateway.', 'First Hop Redundancy Protocol — несколько маршрутизаторов делят один виртуальный шлюз.', 'First Hop Redundancy Protocol — כמה נתבים חולקים שער ברירת מחדל וירטואלי אחד.');
G('srwe09', 'HSRP', 'HSRP', 'HSRP', 'Cisco FHRP with one active and one standby router; highest priority wins (default 100).', 'FHRP от Cisco с одним активным и одним резервным маршрутизатором; побеждает наибольший приоритет (по умолчанию 100).', 'FHRP של Cisco עם נתב active אחד ונתב standby אחד; העדיפות הגבוהה מנצחת (ברירת מחדל 100).');
G('srwe09', 'VRRP', 'VRRP', 'VRRP', 'Open-standard FHRP with a master and backup routers.', 'Открытый стандарт FHRP с маршрутизатором master и резервными (backup).', 'FHRP בתקן פתוח עם נתב master ונתבי backup.');
G('srwe09', 'GLBP', 'GLBP', 'GLBP', 'Cisco FHRP that also load-balances between the routers of a group.', 'FHRP от Cisco, который ещё и распределяет нагрузку между маршрутизаторами группы.', 'FHRP של Cisco שגם מאזן עומסים בין הנתבים בקבוצה.');
G('srwe09', 'Virtual IP address', 'Виртуальный IP-адрес', 'כתובת IP וירטואלית', 'The shared gateway address of an FHRP group that hosts use.', 'Общий адрес шлюза группы FHRP, который используют хосты.', 'כתובת השער המשותפת של קבוצת FHRP שהמארחים משתמשים בה.');
G('srwe09', 'Preemption', 'Вытеснение (preempt)', 'Preempt', 'Lets a router with higher priority take back the active role when it returns.', 'Позволяет маршрутизатору с большим приоритетом вернуть себе активную роль.', 'מאפשר לנתב עם עדיפות גבוהה יותר לקחת בחזרה את תפקיד ה-active כשהוא חוזר.');
G('srwe10', 'MAC flooding', 'Переполнение MAC-таблицы', 'הצפת MAC', 'Filling a switch\'s MAC table with fake addresses so it floods all frames.', 'Заполнение MAC-таблицы коммутатора поддельными адресами, чтобы он рассылал все кадры.', 'מילוי טבלת ה-MAC של המתג בכתובות מזויפות כדי שיציף את כל המסגרות.');
G('srwe10', 'VLAN hopping', 'VLAN hopping', 'VLAN hopping', 'Reaching other VLANs without a router — by DTP switch spoofing or double tagging.', 'Доступ к чужим VLAN без маршрутизатора — подменой коммутатора через DTP или двойным тегом.', 'הגעה ל-VLAN אחרים בלי נתב — באמצעות switch spoofing עם DTP או תיוג כפול.');
G('srwe10', 'Double tagging', 'Двойное тегирование', 'תיוג כפול', 'A frame with two 802.1Q tags sent from the native VLAN to jump into another VLAN.', 'Кадр с двумя тегами 802.1Q из native VLAN, чтобы попасть в другой VLAN.', 'מסגרת עם שני תגי 802.1Q שנשלחת מה-native VLAN כדי לקפוץ ל-VLAN אחר.');
G('srwe10', 'DHCP starvation', 'Истощение DHCP', 'הרעבת DHCP', 'Leasing all addresses of a DHCP pool with fake MACs (denial of service).', 'Аренда всех адресов DHCP-пула с поддельных MAC (отказ в обслуживании).', 'חכירת כל הכתובות במאגר DHCP עם כתובות MAC מזויפות (מניעת שירות).');
G('srwe10', 'DHCP spoofing', 'Подмена DHCP', 'זיוף DHCP', 'A rogue DHCP server giving clients a fake gateway or DNS.', 'Поддельный DHCP-сервер, выдающий клиентам ложный шлюз или DNS.', 'שרת DHCP מזויף שנותן ללקוחות שער או DNS מזויפים.');
G('srwe10', '802.1X', '802.1X', '802.1X', 'Port-based access control: supplicant, authenticator and RADIUS server.', 'Контроль доступа на порту: supplicant, authenticator и сервер RADIUS.', 'בקרת גישה ברמת הפורט: ‏supplicant, ‏authenticator ושרת RADIUS.');
G('srwe10', 'RADIUS', 'RADIUS', 'RADIUS', 'Open AAA protocol, UDP 1812/1813, encrypts only the password.', 'Открытый протокол AAA, UDP 1812/1813, шифрует только пароль.', 'פרוטוקול AAA פתוח, ‏UDP 1812/1813, מצפין רק את הסיסמה.');
G('srwe10', 'TACACS+', 'TACACS+', 'TACACS+', 'Cisco AAA protocol, TCP 49, encrypts the whole message.', 'Протокол AAA от Cisco, TCP 49, шифрует всё сообщение.', 'פרוטוקול AAA של Cisco, ‏TCP 49, מצפין את כל ההודעה.');
G('srwe11', 'Port security', 'Port security', 'Port security', 'Limits and remembers which MAC addresses may use a switch port.', 'Ограничивает и запоминает, какие MAC-адреса могут работать через порт.', 'מגביל וזוכר אילו כתובות MAC רשאיות להשתמש בפורט במתג.');
G('srwe11', 'Sticky MAC', 'Sticky MAC', 'Sticky MAC', 'Port security option that writes learned MACs into the running-config.', 'Опция port security, записывающая выученные MAC в running-config.', 'אפשרות של port security שכותבת את כתובות ה-MAC שנלמדו ל-running-config.');
G('srwe11', 'Err-disabled', 'Err-disabled', 'Err-disabled', 'A port shut down by the switch because of an error or violation.', 'Порт, выключенный коммутатором из-за ошибки или нарушения.', 'פורט שהמתג כיבה בגלל שגיאה או הפרה.');
G('srwe11', 'DHCP snooping', 'DHCP snooping', 'DHCP snooping', 'Accepts DHCP server messages only on trusted ports and builds a binding table.', 'Принимает сообщения DHCP-сервера только на доверенных портах и строит таблицу привязок.', 'מקבל הודעות שרת DHCP רק בפורטים מהימנים ובונה טבלת קישורים.');
G('srwe11', 'Dynamic ARP Inspection (DAI)', 'Dynamic ARP Inspection (DAI)', 'Dynamic ARP Inspection ‏(DAI)', 'Drops ARP packets that do not match the DHCP snooping binding table.', 'Отбрасывает ARP-пакеты, не совпадающие с таблицей привязок DHCP snooping.', 'זורק חבילות ARP שלא תואמות את טבלת הקישורים של DHCP snooping.');
G('srwe11', 'Black hole VLAN', 'VLAN «чёрная дыра»', 'VLAN "חור שחור"', 'An unused VLAN where unused ports are parked.', 'Неиспользуемый VLAN, куда помещают неиспользуемые порты.', 'VLAN שלא בשימוש שאליו מעבירים פורטים שלא בשימוש.');
G('srwe12', 'WLAN', 'Беспроводная LAN (WLAN)', 'רשת מקומית אלחוטית (WLAN)', 'A wireless LAN based on IEEE 802.11 (Wi-Fi).', 'Беспроводная локальная сеть на базе IEEE 802.11 (Wi-Fi).', 'רשת מקומית אלחוטית לפי IEEE 802.11 ‏(Wi-Fi).');
G('srwe12', 'SSID', 'SSID', 'SSID', 'The name of a wireless network.', 'Имя беспроводной сети.', 'השם של רשת אלחוטית.');
G('srwe12', 'BSS / ESS', 'BSS / ESS', 'BSS / ESS', 'One AP and its clients / several APs with one SSID joined by a wired network.', 'Одна AP и её клиенты / несколько AP с одним SSID, соединённых проводной сетью.', 'AP אחת והלקוחות שלה / כמה נקודות AP עם SSID אחד שמחוברות ברשת קווית.');
G('srwe12', 'WLC', 'Контроллер WLAN (WLC)', 'בקר רשת אלחוטית (WLC)', 'Wireless LAN controller that manages lightweight APs centrally.', 'Контроллер беспроводной сети, централизованно управляющий lightweight AP.', 'בקר רשת אלחוטית שמנהל באופן מרכזי נקודות AP מסוג lightweight.');
G('srwe12', 'CAPWAP', 'CAPWAP', 'CAPWAP', 'Protocol between lightweight APs and a WLC: UDP 5246 control, 5247 data.', 'Протокол между lightweight AP и WLC: UDP 5246 — управление, 5247 — данные.', 'הפרוטוקול בין נקודות AP מסוג lightweight ל-WLC: ‏UDP 5246 לבקרה, ‏5247 לנתונים.');
G('srwe12', 'Beacon', 'Beacon', 'Beacon', 'Frame an AP sends regularly to announce its SSID and settings.', 'Кадр, который AP регулярно отправляет, объявляя свой SSID и параметры.', 'מסגרת שה-AP שולחת באופן קבוע כדי להכריז על ה-SSID וההגדרות שלה.');
G('srwe12', 'WPA2 / WPA3', 'WPA2 / WPA3', 'WPA2 / WPA3', 'Wi-Fi security standards with AES; WPA3 replaces the PSK exchange with SAE.', 'Стандарты защиты Wi-Fi с AES; WPA3 заменяет обмен PSK на SAE.', 'תקני אבטחת Wi-Fi עם AES; ‏WPA3 מחליף את החלפת ה-PSK ב-SAE.');
G('srwe12', 'Evil twin', 'Злой двойник (evil twin)', 'Evil twin', 'A fake AP with a legitimate SSID used for man-in-the-middle attacks.', 'Поддельная AP с настоящим SSID для атаки «человек посередине».', 'AP מזויפת עם SSID לגיטימי שמשמשת להתקפת man-in-the-middle.');
G('srwe13', 'Pre-shared key (PSK)', 'Общий ключ (PSK)', 'מפתח משותף מראש (PSK)', 'One passphrase shared by all users — WPA2/WPA3-Personal.', 'Одна парольная фраза для всех пользователей — WPA2/WPA3-Personal.', 'סיסמה אחת שכל המשתמשים חולקים — WPA2/WPA3-Personal.');
G('srwe13', 'WPA2-Enterprise', 'WPA2-Enterprise', 'WPA2-Enterprise', 'WPA2 with 802.1X: each user logs in with own credentials checked by RADIUS.', 'WPA2 с 802.1X: каждый пользователь входит со своими данными, их проверяет RADIUS.', 'WPA2 עם 802.1X: כל משתמש מתחבר עם פרטי הזדהות משלו ש-RADIUS בודק.');
G('srwe13', 'Port forwarding', 'Проброс портов', 'Port forwarding', 'A router rule that sends inbound traffic on a port to one internal host.', 'Правило маршрутизатора, направляющее входящий трафик на порт к одному внутреннему хосту.', 'כלל בנתב שמעביר תעבורה נכנסת בפורט מסוים למארח פנימי אחד.');
G('srwe13', 'Dynamic interface (WLC)', 'Динамический интерфейс (WLC)', 'ממשק דינמי (WLC)', 'A WLC interface in a user VLAN that a WLAN is mapped to.', 'Интерфейс WLC в пользовательском VLAN, к которому привязывается WLAN.', 'ממשק של ה-WLC ב-VLAN של משתמשים שאליו משויך WLAN.');
G('srwe14', 'Metric', 'Метрика', 'מטריקה', 'The value a routing protocol uses to compare paths: hops, cost, bandwidth and delay.', 'Значение, по которому протокол маршрутизации сравнивает пути: переходы, стоимость, полоса и задержка.', 'הערך שפרוטוקול ניתוב משתמש בו כדי להשוות נתיבים: קפיצות, עלות, רוחב פס והשהיה.');
G('srwe14', 'CEF', 'CEF', 'CEF', 'Cisco Express Forwarding — the fastest, default forwarding method using the FIB and adjacency table.', 'Cisco Express Forwarding — самый быстрый механизм пересылки по умолчанию, использует FIB и таблицу смежности.', 'Cisco Express Forwarding — שיטת ההעברה המהירה וברירת המחדל, משתמשת ב-FIB ובטבלת שכנויות.');
G('srwe14', 'Gateway of last resort', 'Шлюз последней надежды', 'Gateway of last resort', 'The next hop of the default route, used when nothing else matches.', 'Next hop маршрута по умолчанию — используется, когда ничего другое не подходит.', 'ה-next hop של נתיב ברירת המחדל, משמש כשאין התאמה אחרת.');
G('srwe14', 'IGP / EGP', 'IGP / EGP', 'IGP / EGP', 'Interior protocols route inside one organization (OSPF, EIGRP); exterior between them (BGP).', 'Внутренние протоколы работают внутри одной организации (OSPF, EIGRP), внешние — между ними (BGP).', 'פרוטוקולים פנימיים מנתבים בתוך ארגון אחד (OSPF, ‏EIGRP); חיצוניים — בין ארגונים (BGP).');
G('srwe14', 'ECMP', 'ECMP', 'ECMP', 'Equal-cost multipath — load balancing over paths with the same metric.', 'Equal-cost multipath — балансировка по путям с одинаковой метрикой.', 'Equal-cost multipath — איזון עומסים בין נתיבים עם אותה מטריקה.');
G('srwe16', 'Recursive lookup', 'Рекурсивный поиск', 'חיפוש רקורסיבי', 'A second routing-table lookup to find how to reach a route\'s next hop.', 'Повторный поиск в таблице маршрутизации, чтобы понять, как добраться до next hop маршрута.', 'חיפוש נוסף בטבלת הניתוב כדי למצוא איך מגיעים ל-next hop של נתיב.');
G('srwe16', 'Fully specified static route', 'Полностью заданный статический маршрут', 'נתיב סטטי מוגדר במלואו', 'A static route with both the exit interface and the next hop.', 'Статический маршрут, где указаны и выходной интерфейс, и next hop.', 'נתיב סטטי עם ממשק יציאה וגם next hop.');
G('srwe16', 'Routing loop', 'Петля маршрутизации', 'לולאת ניתוב', 'Packets bounce between routers until the TTL expires.', 'Пакеты ходят между маршрутизаторами по кругу, пока не истечёт TTL.', 'חבילות קופצות בין נתבים עד שה-TTL נגמר.');
G('srwe16', 'Extended ping', 'Расширенный ping', 'Ping מורחב', 'A ping with options such as the source interface, size and count.', 'Ping с параметрами: интерфейс-источник, размер, количество.', 'Ping עם אפשרויות כמו ממשק מקור, גודל ומספר חבילות.');

// Вопросы для собеседования (IV определена в interview.js).
IV('srwe01', ['How do you configure SSH on a Cisco switch?', 'Как настроить SSH на коммутаторе Cisco?', 'איך מגדירים SSH במתג Cisco?'],
  ['Set a hostname and an IP domain name, generate RSA keys with "crypto key generate rsa" (2048 bits), choose "ip ssh version 2", create a local user with "username admin secret …", and on "line vty 0 15" use "login local" and "transport input ssh". The switch also needs a management IP on an SVI and a default gateway. I verify with "show ip ssh" and by connecting from a PC.',
    'Задать имя устройства и доменное имя, сгенерировать ключи RSA командой «crypto key generate rsa» (2048 бит), выбрать «ip ssh version 2», создать локального пользователя «username admin secret …», а на «line vty 0 15» указать «login local» и «transport input ssh». Коммутатору также нужны IP управления на SVI и шлюз по умолчанию. Проверяю через «show ip ssh» и подключением с ПК.',
    'מגדירים hostname ושם דומיין, יוצרים מפתחות RSA עם "crypto key generate rsa" ‏(2048 ביט), בוחרים "ip ssh version 2", יוצרים משתמש מקומי עם "username admin secret …", וב-"line vty 0 15" מגדירים "login local" ו-"transport input ssh". המתג צריך גם IP לניהול על SVI ושער ברירת מחדל. בודקים עם "show ip ssh" ובהתחברות ממחשב.']);
IV('srwe01', ['Why does a Layer 2 switch need an IP address and a default gateway?', 'Зачем коммутатору 2-го уровня IP-адрес и шлюз по умолчанию?', 'למה מתג שכבה 2 צריך כתובת IP ושער ברירת מחדל?'],
  ['Not for switching frames — only for management. The IP on an SVI (for example interface vlan 99) lets us reach it with SSH, SNMP or syslog. The default gateway lets the switch reply to admins in other subnets; without it you can manage it only from its own subnet.',
    'Не для коммутации кадров, а только для управления. IP на SVI (например, interface vlan 99) позволяет подключаться по SSH, SNMP или syslog. Шлюз по умолчанию нужен, чтобы коммутатор отвечал администраторам из других подсетей; без него управлять можно только из своей подсети.',
    'לא בשביל מיתוג מסגרות — רק בשביל ניהול. ה-IP על SVI (למשל interface vlan 99) מאפשר להתחבר ב-SSH, ‏SNMP או syslog. שער ברירת המחדל מאפשר למתג לענות למנהלים מתת-רשתות אחרות; בלעדיו אפשר לנהל אותו רק מתת-הרשת שלו.']);
IV('srwe02', ['What is the difference between store-and-forward and cut-through switching?', 'Чем отличается коммутация store-and-forward от cut-through?', 'מה ההבדל בין מיתוג store-and-forward ל-cut-through?'],
  ['Store-and-forward receives the whole frame, checks the FCS and drops damaged frames — it is the Cisco default and is needed between ports of different speeds. Cut-through starts forwarding early: fast-forward after the destination MAC (lowest latency, but errors pass through), fragment-free after the first 64 bytes, which filters most collision fragments.',
    'Store-and-forward принимает кадр целиком, проверяет FCS и отбрасывает повреждённые — это режим Cisco по умолчанию, и он нужен между портами разной скорости. Cut-through начинает пересылку раньше: fast-forward — после MAC получателя (минимальная задержка, но ошибки проходят), fragment-free — после первых 64 байт, что отсеивает большинство обрывков коллизий.',
    'Store-and-forward מקבל את כל המסגרת, בודק FCS וזורק מסגרות פגומות — זו ברירת המחדל של Cisco והיא נדרשת בין פורטים במהירויות שונות. Cut-through מתחיל להעביר מוקדם: ‏fast-forward אחרי MAC היעד (השהיה הכי נמוכה, אבל שגיאות עוברות), ‏fragment-free אחרי 64 הבתים הראשונים, וכך מסנן את רוב שברי ההתנגשויות.']);
IV('srwe05', ['How does STP elect the root bridge and choose root ports?', 'Как STP выбирает корневой мост и корневые порты?', 'איך STP בוחר את ה-root bridge ואת ה-root ports?'],
  ['Switches exchange BPDUs. The lowest bridge ID — priority first (default 32768, steps of 4096), then the lowest MAC — becomes root, and all its ports are designated. Every other switch picks as root port the port with the lowest root path cost (1 Gbps = 4, 100 Mbps = 19); ties go to the lowest sender bridge ID, then port priority and number. On each link one designated port forwards, the rest are blocked. In practice I set the root myself with "spanning-tree vlan X root primary".',
    'Коммутаторы обмениваются BPDU. Наименьший идентификатор моста — сначала приоритет (по умолчанию 32768, шаг 4096), затем наименьший MAC — становится корнем, все его порты назначенные. Каждый другой коммутатор выбирает корневым порт с наименьшей стоимостью пути до корня (1 Гбит/с = 4, 100 Мбит/с = 19); при равенстве — по наименьшему BID отправителя, затем приоритету и номеру порта. На каждом канале пересылает один назначенный порт, остальные блокируются. На практике я сам назначаю корень командой «spanning-tree vlan X root primary».',
    'המתגים מחליפים BPDU. מזהה הגשר הנמוך ביותר — קודם עדיפות (ברירת מחדל 32768, בקפיצות של 4096), ואז ה-MAC הנמוך — הופך ל-root, וכל הפורטים שלו designated. כל מתג אחר בוחר כ-root port את הפורט עם עלות הנתיב הנמוכה ל-root ‏(1 Gbps = 4, ‏100 Mbps = 19); בשוויון — לפי ה-BID הנמוך של השולח, ואז עדיפות ומספר פורט. בכל קישור פורט designated אחד מעביר והשאר נחסמים. בפועל אני קובע את ה-root בעצמי עם "spanning-tree vlan X root primary".']);
IV('srwe05', ['What are PortFast and BPDU Guard, and where do you use them?', 'Что такое PortFast и BPDU Guard и где их применять?', 'מה זה PortFast ו-BPDU Guard ואיפה משתמשים בהם?'],
  ['Both go on access ports to end devices. PortFast puts the port straight into forwarding, so a PC gets DHCP without waiting 30–50 seconds for STP. BPDU Guard err-disables the port if a BPDU arrives — someone plugged in a switch — which protects the topology and the root bridge. Never use PortFast on links between switches.',
    'Оба ставятся на access-порты к конечным устройствам. PortFast сразу переводит порт в forwarding, и ПК получает DHCP без ожидания STP в 30–50 секунд. BPDU Guard переводит порт в err-disabled, если пришёл BPDU — кто-то подключил коммутатор, — это защищает топологию и корневой мост. На каналах между коммутаторами PortFast не используют.',
    'שניהם מוגדרים על פורטי access להתקני קצה. ‏PortFast מעביר את הפורט ישר ל-forwarding, כך שמחשב מקבל DHCP בלי לחכות 30–50 שניות ל-STP. ‏BPDU Guard מעביר את הפורט ל-err-disabled אם מגיע BPDU — מישהו חיבר מתג — וכך מגן על הטופולוגיה ועל ה-root bridge. אף פעם לא משתמשים ב-PortFast בקישורים בין מתגים.']);
IV('srwe06', ['What is EtherChannel? What is the difference between LACP and PAgP?', 'Что такое EtherChannel? Чем отличаются LACP и PAgP?', 'מה זה EtherChannel? מה ההבדל בין LACP ל-PAgP?'],
  ['EtherChannel bundles up to 8 active links of the same speed and duplex into one logical port-channel, so STP does not block them; we get more bandwidth and redundancy. LACP is the IEEE 802.3ad standard with modes active and passive; PAgP is Cisco proprietary with desirable and auto. At least one side must actively negotiate; "on" forces the bundle without a protocol and works only with "on". All members need matching VLAN settings, configured on the port-channel interface.',
    'EtherChannel объединяет до 8 активных каналов одинаковой скорости и дуплекса в один логический port-channel, поэтому STP их не блокирует; получаем больше полосы и резервирование. LACP — стандарт IEEE 802.3ad с режимами active и passive; PAgP — протокол Cisco с режимами desirable и auto. Хотя бы одна сторона должна активно согласовывать; «on» включает пучок без протокола и работает только с «on». У всех участников должны совпадать настройки VLAN — их задают на интерфейсе port-channel.',
    'EtherChannel מאחד עד 8 קישורים פעילים באותה מהירות ודופלקס ל-port-channel לוגי אחד, ולכן STP לא חוסם אותם; מקבלים יותר רוחב פס ויתירות. ‏LACP הוא תקן IEEE 802.3ad עם המצבים active ו-passive; ‏PAgP קנייני של Cisco עם desirable ו-auto. לפחות צד אחד חייב לנהל משא ומתן באופן אקטיבי; "on" מאחד בכוח בלי פרוטוקול ועובד רק מול "on". לכל החברים צריכות להיות אותן הגדרות VLAN, ומגדירים אותן על ממשק ה-port-channel.']);
IV('srwe08', ['How does an IPv6 host get its address? Explain SLAAC and DHCPv6.', 'Как IPv6-хост получает адрес? Объясните SLAAC и DHCPv6.', 'איך מארח IPv6 מקבל כתובת? הסבר SLAAC ו-DHCPv6.'],
  ['The host sends a Router Solicitation and the router answers with a Router Advertisement containing the prefix, the gateway (its link-local address) and flags. With SLAAC only (the default) the host builds its own interface ID with EUI-64 or randomly and checks it with DAD. With the O flag it also asks a stateless DHCPv6 server for DNS. With the M flag a stateful DHCPv6 server assigns the address, like DHCPv4. The gateway always comes from the RA.',
    'Хост отправляет Router Solicitation, маршрутизатор отвечает Router Advertisement с префиксом, шлюзом (своим link-local адресом) и флагами. При чистом SLAAC (по умолчанию) хост сам строит ID интерфейса по EUI-64 или случайно и проверяет его через DAD. С флагом O он дополнительно берёт DNS у DHCPv6-сервера без состояния. С флагом M адрес выдаёт DHCPv6 с состоянием, как DHCPv4. Шлюз всегда приходит из RA.',
    'המארח שולח Router Solicitation והנתב עונה ב-Router Advertisement עם הקידומת, השער (כתובת ה-link-local שלו) ודגלים. ב-SLAAC בלבד (ברירת המחדל) המארח בונה בעצמו את מזהה הממשק ב-EUI-64 או באקראי ובודק אותו עם DAD. עם דגל O הוא גם מקבל DNS משרת DHCPv6 בלי מצב. עם דגל M שרת DHCPv6 עם מצב נותן את הכתובת, כמו DHCPv4. השער תמיד מגיע מה-RA.']);
IV('srwe09', ['What is HSRP and how does it work?', 'Что такое HSRP и как он работает?', 'מה זה HSRP ואיך הוא עובד?'],
  ['HSRP is a Cisco first-hop redundancy protocol. Two or more routers share a virtual IP and a virtual MAC, and the hosts use the virtual IP as their default gateway. The router with the highest priority (default 100; tie → highest IP) is active and forwards traffic, another is standby. If the standby stops hearing hellos (3 s hello, 10 s hold), it takes over and the hosts notice nothing. Preemption is off by default. The open-standard alternative is VRRP; GLBP also load-balances.',
    'HSRP — протокол Cisco для резервирования первого перехода. Два или более маршрутизатора делят виртуальные IP и MAC, а хосты используют виртуальный IP как шлюз. Маршрутизатор с наибольшим приоритетом (по умолчанию 100; при равенстве — наибольший IP) активен и пересылает трафик, другой — в резерве (standby). Если standby перестаёт слышать hello (hello 3 с, hold 10 с), он берёт роль на себя, и хосты ничего не замечают. Вытеснение по умолчанию выключено. Открытая альтернатива — VRRP; GLBP ещё и балансирует нагрузку.',
    'HSRP הוא פרוטוקול של Cisco ליתירות בקפיצה הראשונה. שני נתבים או יותר חולקים IP וירטואלי ו-MAC וירטואלי, והמארחים משתמשים ב-IP הווירטואלי כשער. הנתב עם העדיפות הגבוהה (ברירת מחדל 100; בשוויון — ה-IP הגבוה) הוא active ומעביר תעבורה, ואחר הוא standby. אם ה-standby מפסיק לשמוע hello ‏(hello כל 3 שניות, ‏hold ‏10 שניות), הוא לוקח את התפקיד והמארחים לא מרגישים כלום. ‏Preempt כבוי כברירת מחדל. החלופה בתקן פתוח היא VRRP; ‏GLBP גם מאזן עומסים.']);
IV('srwe10', ['Name some Layer 2 attacks and how you mitigate them.', 'Назовите атаки 2-го уровня и способы защиты от них.', 'תן דוגמאות להתקפות בשכבה 2 ואיך מתגוננים מהן.'],
  ['MAC flooding fills the MAC table so the switch floods traffic — port security. VLAN hopping via DTP — set access ports to "switchport mode access" and use "switchport nonegotiate"; double tagging — use an unused native VLAN. DHCP starvation and rogue DHCP servers — DHCP snooping with rate limits. ARP spoofing — Dynamic ARP Inspection. IP/MAC spoofing — IP Source Guard. STP attacks — BPDU Guard and Root Guard. Also shut unused ports and disable CDP on edge ports.',
    'Переполнение MAC-таблицы заставляет коммутатор рассылать трафик всем — port security. VLAN hopping через DTP — «switchport mode access» на access-портах и «switchport nonegotiate»; двойной тег — неиспользуемый native VLAN. Истощение DHCP и поддельные DHCP-серверы — DHCP snooping с ограничением скорости. Подмена ARP — Dynamic ARP Inspection. Подмена IP/MAC — IP Source Guard. Атаки на STP — BPDU Guard и Root Guard. А ещё выключать неиспользуемые порты и CDP на пограничных портах.',
    'הצפת MAC ממלאת את טבלת ה-MAC כך שהמתג מציף תעבורה — ‏port security. ‏VLAN hopping דרך DTP — ‏"switchport mode access" בפורטי access ו-"switchport nonegotiate"; תיוג כפול — ‏native VLAN שלא בשימוש. הרעבת DHCP ושרתי DHCP מזויפים — ‏DHCP snooping עם הגבלת קצב. זיוף ARP — ‏Dynamic ARP Inspection. זיוף IP/MAC — ‏IP Source Guard. התקפות STP — ‏BPDU Guard ו-Root Guard. ובנוסף מכבים פורטים שלא בשימוש ו-CDP בפורטי קצה.']);
IV('srwe10', ['What is 802.1X?', 'Что такое 802.1X?', 'מה זה 802.1X?'],
  ['802.1X is port-based network access control. Until the user or device authenticates, the switch port (or Wi-Fi) passes only authentication traffic. There are three roles: the supplicant (the client), the authenticator (the switch or WLC) and the authentication server (usually RADIUS). It is used in companies for wired ports and in WPA2/WPA3-Enterprise Wi-Fi.',
    '802.1X — контроль доступа к сети на уровне порта. Пока пользователь или устройство не прошли аутентификацию, порт коммутатора (или Wi-Fi) пропускает только трафик аутентификации. Три роли: supplicant (клиент), authenticator (коммутатор или WLC) и сервер аутентификации (обычно RADIUS). Используется в компаниях на проводных портах и в Wi-Fi WPA2/WPA3-Enterprise.',
    '802.1X הוא בקרת גישה לרשת ברמת הפורט. עד שהמשתמש או ההתקן עוברים אימות, פורט המתג (או ה-Wi-Fi) מעביר רק תעבורת אימות. יש שלושה תפקידים: ה-supplicant (הלקוח), ה-authenticator (המתג או ה-WLC) ושרת האימות (בדרך כלל RADIUS). משתמשים בו בחברות בפורטים קוויים וב-Wi-Fi מסוג WPA2/WPA3-Enterprise.']);
IV('srwe11', ['How do you configure port security, and what are the violation modes?', 'Как настроить port security и какие есть режимы нарушения?', 'איך מגדירים port security ומה מצבי ההפרה?'],
  ['On a static access port: "switchport mode access", "switchport port-security", then optionally "maximum", "mac-address sticky" and "violation". Defaults are 1 MAC and shutdown. Protect drops the offending frames silently; restrict drops them, logs and increments the counter; shutdown puts the port into err-disabled, which I recover with shutdown / no shutdown or errdisable recovery. I verify with "show port-security interface".',
    'На статическом access-порту: «switchport mode access», «switchport port-security», затем при необходимости «maximum», «mac-address sticky» и «violation». По умолчанию 1 MAC и shutdown. Protect молча отбрасывает лишние кадры; restrict отбрасывает, пишет в журнал и увеличивает счётчик; shutdown переводит порт в err-disabled, его я восстанавливаю через shutdown / no shutdown или errdisable recovery. Проверяю «show port-security interface».',
    'בפורט access סטטי: ‏"switchport mode access", ‏"switchport port-security", ואז לפי הצורך "maximum", ‏"mac-address sticky" ו-"violation". ברירות המחדל: MAC אחד ו-shutdown. ‏Protect זורק בשקט את המסגרות החורגות; ‏restrict זורק, רושם ביומן ומעלה את המונה; ‏shutdown מעביר את הפורט ל-err-disabled, ואני מחזיר אותו עם shutdown / no shutdown או errdisable recovery. בודקים עם "show port-security interface".']);
IV('srwe11', ['What are DHCP snooping and Dynamic ARP Inspection?', 'Что такое DHCP snooping и Dynamic ARP Inspection?', 'מה זה DHCP snooping ו-Dynamic ARP Inspection?'],
  ['DHCP snooping divides ports into trusted (toward the real DHCP server) and untrusted. DHCP server messages from untrusted ports are dropped, which stops rogue servers, and a rate limit stops starvation. It also builds a binding table of MAC, IP, VLAN and port. Dynamic ARP Inspection uses that table to drop ARP packets with a false IP-to-MAC mapping, which stops ARP spoofing and man-in-the-middle attacks.',
    'DHCP snooping делит порты на доверенные (в сторону настоящего DHCP-сервера) и недоверенные. Сообщения DHCP-сервера с недоверенных портов отбрасываются — это останавливает поддельные серверы, а ограничение скорости останавливает истощение. Кроме того, строится таблица привязок MAC, IP, VLAN и порта. Dynamic ARP Inspection по этой таблице отбрасывает ARP-пакеты с ложной связкой IP–MAC и тем самым останавливает подмену ARP и атаки «человек посередине».',
    'DHCP snooping מחלק את הפורטים למהימנים (לכיוון שרת ה-DHCP האמיתי) ולא מהימנים. הודעות שרת DHCP מפורטים לא מהימנים נזרקות — וזה עוצר שרתים מזויפים, והגבלת קצב עוצרת הרעבה. בנוסף נבנית טבלת קישורים של MAC, ‏IP, ‏VLAN ופורט. ‏Dynamic ARP Inspection משתמש בטבלה הזו כדי לזרוק חבילות ARP עם קישור IP–MAC שקרי, וכך עוצר זיוף ARP והתקפות man-in-the-middle.']);
IV('srwe12', ['What is the difference between 2.4 GHz and 5 GHz Wi-Fi?', 'Чем отличается Wi-Fi 2,4 ГГц от 5 ГГц?', 'מה ההבדל בין Wi-Fi ב-2.4 GHz ל-5 GHz?'],
  ['2.4 GHz has longer range and passes walls better, but it is crowded: only three non-overlapping channels (1, 6, 11) and interference from microwaves, Bluetooth and neighbours. 5 GHz is faster, has many non-overlapping channels and less interference, but a shorter range. In offices we usually prefer 5 GHz (and 6 GHz with Wi-Fi 6E) and keep 2.4 GHz for old or IoT devices.',
    'У 2,4 ГГц больше дальность и лучше проходимость через стены, но диапазон перегружен: всего три неперекрывающихся канала (1, 6, 11) и помехи от микроволновок, Bluetooth и соседей. 5 ГГц быстрее, там много неперекрывающихся каналов и меньше помех, но меньше дальность. В офисах обычно предпочитают 5 ГГц (и 6 ГГц с Wi-Fi 6E), а 2,4 ГГц оставляют для старых и IoT-устройств.',
    'ל-2.4 GHz יש טווח ארוך יותר והוא עובר קירות טוב יותר, אבל הוא עמוס: רק שלושה ערוצים שלא חופפים (1, ‏6, ‏11) והפרעות ממיקרוגל, ‏Bluetooth ושכנים. ‏5 GHz מהיר יותר, יש בו הרבה ערוצים שלא חופפים ופחות הפרעות, אבל הטווח קצר יותר. במשרדים בדרך כלל מעדיפים 5 GHz (ו-6 GHz עם Wi-Fi 6E) ומשאירים את 2.4 GHz להתקנים ישנים ול-IoT.']);
IV('srwe12', ['Which Wi-Fi security would you use in a company, and why?', 'Какую защиту Wi-Fi вы выбрали бы для компании и почему?', 'באיזו אבטחת Wi-Fi היית משתמש בחברה ולמה?'],
  ['WPA2- or better WPA3-Enterprise: 802.1X with a RADIUS server, so every user logs in with own credentials, access can be revoked per user and activity is logged. A shared PSK is fine at home but in a company it leaks and is hard to change. I would never use WEP or WPA/TKIP, and I would not rely on hidden SSIDs or MAC filtering. A separate guest SSID in its own VLAN is also good practice.',
    'WPA2-, а лучше WPA3-Enterprise: 802.1X с сервером RADIUS, чтобы каждый пользователь входил со своими учётными данными, доступ можно было отозвать у конкретного человека и действия журналировались. Общий PSK подходит для дома, но в компании он утекает и его трудно менять. WEP и WPA/TKIP я бы не использовал никогда и не полагался бы на скрытый SSID или фильтр по MAC. Хорошая практика — отдельный гостевой SSID в своём VLAN.',
    'WPA2-Enterprise, ועדיף WPA3-Enterprise: ‏802.1X עם שרת RADIUS, כך שכל משתמש מתחבר עם פרטי הזדהות משלו, אפשר לבטל גישה למשתמש מסוים והפעילות נרשמת. ‏PSK משותף מתאים לבית, אבל בחברה הוא דולף וקשה להחליף אותו. אף פעם לא הייתי משתמש ב-WEP או WPA/TKIP, ולא הייתי סומך על SSID מוסתר או סינון MAC. נוהג טוב נוסף הוא SSID נפרד לאורחים ב-VLAN משלו.']);
IV('srwe13', ['A user cannot connect to Wi-Fi. How do you troubleshoot it?', 'Пользователь не может подключиться к Wi-Fi. Как будете искать причину?', 'משתמש לא מצליח להתחבר ל-Wi-Fi. איך מאתרים את התקלה?'],
  ['I go bottom-up. Is the wireless adapter on, is the user in range, and does the device support the band the SSID uses? Then association: the right SSID, security type and passphrase or credentials (for Enterprise, check the RADIUS logs). If it is associated but has 169.254.x.x, the problem is DHCP or the WLAN-to-VLAN mapping. If it has an IP, test the gateway and DNS with ping and nslookup. Slowness usually means interference or a crowded 2.4 GHz channel.',
    'Иду снизу вверх. Включён ли беспроводной адаптер, в зоне ли пользователь, поддерживает ли устройство диапазон, в котором работает SSID? Затем ассоциация: правильные SSID, тип защиты и пароль или учётные данные (для Enterprise смотрю журналы RADIUS). Если подключился, но адрес 169.254.x.x — проблема в DHCP или привязке WLAN к VLAN. Если IP есть — проверяю шлюз и DNS через ping и nslookup. Медленная работа обычно означает помехи или перегруженный канал 2,4 ГГц.',
    'עובדים מלמטה למעלה. האם הכרטיס האלחוטי פועל, האם המשתמש בטווח, והאם ההתקן תומך בתדר שבו ה-SSID עובד? אחר כך השיוך: SSID נכון, סוג אבטחה וסיסמה או פרטי הזדהות (ב-Enterprise בודקים את הלוגים של RADIUS). אם הוא מחובר אבל קיבל 169.254.x.x — הבעיה ב-DHCP או בשיוך של ה-WLAN ל-VLAN. אם יש IP — בודקים שער ו-DNS עם ping ו-nslookup. איטיות בדרך כלל אומרת הפרעות או ערוץ עמוס ב-2.4 GHz.']);
IV('srwe14', ['How does a router decide where to send a packet?', 'Как маршрутизатор решает, куда отправить пакет?', 'איך נתב מחליט לאן לשלוח חבילה?'],
  ['It looks up the destination IP in its routing table and uses the longest matching prefix. If the network is directly connected, it delivers the packet to the host (ARP for the MAC); if it is remote, it sends it to the next hop; if nothing matches, it uses the default route or drops the packet with ICMP unreachable. When the same prefix comes from several sources, the lowest administrative distance is installed; within one protocol, the lowest metric. Then it decrements the TTL and builds a new Layer 2 frame; CEF makes all of this very fast.',
    'Он ищет IP получателя в таблице маршрутизации и берёт самый длинный совпадающий префикс. Если сеть подключена напрямую — доставляет пакет хосту (ARP для MAC); если удалённая — отправляет next hop; если совпадений нет — использует маршрут по умолчанию или отбрасывает пакет с ICMP unreachable. Если один префикс пришёл из нескольких источников, устанавливается наименьшее административное расстояние; внутри одного протокола — наименьшая метрика. Затем уменьшает TTL и строит новый кадр 2-го уровня — с CEF это происходит очень быстро.',
    'הוא מחפש את כתובת ה-IP של היעד בטבלת הניתוב ובוחר את הקידומת התואמת הארוכה ביותר. אם הרשת מחוברת ישירות — מוסר את החבילה למארח (ARP בשביל ה-MAC); אם היא מרוחקת — שולח ל-next hop; אם אין התאמה — משתמש בנתיב ברירת המחדל או זורק את החבילה עם ICMP unreachable. כשאותה קידומת מגיעה מכמה מקורות, נכנס הנתיב עם ה-AD הנמוך; בתוך פרוטוקול אחד — המטריקה הנמוכה. אחר כך הוא מקטין את ה-TTL ובונה מסגרת שכבה 2 חדשה — עם CEF זה קורה מהר מאוד.']);
IV('srwe16', ['You configured a static route but traffic still does not work. What do you check?', 'Вы настроили статический маршрут, но трафик всё равно не идёт. Что проверите?', 'הגדרת נתיב סטטי אבל התעבורה עדיין לא עוברת. מה תבדוק?'],
  ['First "show ip route" — is the route installed at all? If not, the next hop is wrong or not in a connected subnet, or the exit interface is down ("show ip interface brief"). Then I check the network and mask with "show running-config | include ip route". Then the return path: the far router needs a route back to my LAN — I test with an extended ping using my LAN interface as the source. traceroute shows where packets stop or whether there is a loop. Finally, the hosts\' default gateway.',
    'Сначала «show ip route» — установлен ли маршрут вообще? Если нет — неверный next hop или он не в подключённой подсети, либо выключен выходной интерфейс («show ip interface brief»). Затем проверяю сеть и маску через «show running-config | include ip route». Потом обратный путь: дальнему маршрутизатору нужен маршрут обратно в мою LAN — проверяю расширенным ping с LAN-интерфейсом в качестве источника. traceroute показывает, где пакеты останавливаются и нет ли петли. И наконец, шлюз по умолчанию на хостах.',
    'קודם "show ip route" — האם הנתיב בכלל נכנס לטבלה? אם לא — ה-next hop שגוי או לא בתת-רשת מחוברת, או שממשק היציאה כבוי ("show ip interface brief"). אחר כך בודקים רשת ומסכה עם "show running-config | include ip route". אחר כך הדרך חזרה: הנתב המרוחק צריך נתיב חזרה ל-LAN שלי — בודקים עם ping מורחב שממשק ה-LAN שלי הוא המקור. ‏traceroute מראה איפה החבילות נעצרות ואם יש לולאה. ולבסוף — שער ברירת המחדל במארחים.']);
