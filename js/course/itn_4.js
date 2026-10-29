'use strict';
// ITN, модули 14–17: транспортный и прикладной уровни, основы безопасности, построение небольшой сети.

const WELL_KNOWN_PORTS = [
  { port: '20, 21', name: 'FTP', tr: 'TCP' }, { port: '22', name: 'SSH', tr: 'TCP' }, { port: '23', name: 'Telnet', tr: 'TCP' },
  { port: '25', name: 'SMTP', tr: 'TCP' }, { port: '53', name: 'DNS', tr: 'UDP, TCP' }, { port: '67, 68', name: 'DHCP', tr: 'UDP' },
  { port: '69', name: 'TFTP', tr: 'UDP' }, { port: '80', name: 'HTTP', tr: 'TCP' }, { port: '110', name: 'POP3', tr: 'TCP' },
  { port: '123', name: 'NTP', tr: 'UDP' }, { port: '143', name: 'IMAP', tr: 'TCP' }, { port: '161', name: 'SNMP', tr: 'UDP' },
  { port: '443', name: 'HTTPS', tr: 'TCP' }, { port: '3389', name: 'RDP', tr: 'TCP' },
];

lessonDef({
  id: 'itn14', topic: null, drill: 'ports', minutes: 15, genInQuiz: 2,
  title: T('Transport Layer', 'Транспортный уровень', 'שכבת התעבורה'),
  goal: T('What Layer 4 does, TCP versus UDP, the three-way handshake, reliability and flow control, and port numbers.',
    'Что делает уровень 4, TCP против UDP, трёхэтапное рукопожатие, надёжность и управление потоком, номера портов.',
    'מה עושה שכבה 4, ‏TCP מול UDP, לחיצת היד המשולשת, אמינות ובקרת זרימה, ומספרי פורטים.'),
  sections: [
    lSec(['Role of the transport layer', 'Роль транспортного уровня', 'תפקיד שכבת התעבורה'],
      lUL([
        ['Tracks each conversation between applications.', 'Отслеживает каждый «разговор» между приложениями.', 'עוקבת אחרי כל שיחה בין יישומים.'],
        ['Segments data and reassembles it at the destination.', 'Делит данные на сегменты и собирает их у получателя.', 'מחלקת נתונים למקטעים ומרכיבה אותם מחדש ביעד.'],
        ['Identifies the application with a port number. IP address + port = socket (192.168.1.10:49152).', 'Определяет приложение по номеру порта. IP-адрес + порт = сокет (192.168.1.10:49152).', 'מזהה את היישום לפי מספר פורט. כתובת IP + פורט = socket ‏(192.168.1.10:49152).'],
        ['Multiplexing — many conversations share one network at the same time.', 'Мультиплексирование — много разговоров одновременно в одной сети.', 'ריבוב (multiplexing) — הרבה שיחות חולקות את אותה רשת בו-זמנית.'],
      ])),
    lSec(['TCP', 'TCP', 'TCP'],
      lUL([
        ['Connection-oriented: the three-way handshake SYN → SYN-ACK → ACK opens a session; FIN and ACK close it.', 'С установкой соединения: трёхэтапное рукопожатие SYN → SYN-ACK → ACK открывает сеанс; FIN и ACK закрывают его.', 'מבוסס חיבור: לחיצת היד המשולשת SYN → SYN-ACK → ACK פותחת session; ‏FIN ו-ACK סוגרים אותו.'],
        ['Reliable: sequence numbers, acknowledgements and retransmission of lost segments.', 'Надёжный: порядковые номера, подтверждения и повторная отправка потерянных сегментов.', 'אמין: מספרים סידוריים, אישורים ושליחה חוזרת של מקטעים שאבדו.'],
        ['Same-order delivery: segments are put back in order.', 'Доставка по порядку: сегменты собираются в правильном порядке.', 'מסירה בסדר הנכון: המקטעים מסודרים מחדש.'],
        ['Flow control: the window size says how much data may be sent before an acknowledgement.', 'Управление потоком: размер окна говорит, сколько данных можно отправить до подтверждения.', 'בקרת זרימה: גודל החלון קובע כמה נתונים אפשר לשלוח לפני אישור.'],
        ['Header 20 bytes. Used by HTTP/HTTPS, FTP, SSH, email.', 'Заголовок 20 байт. Используют HTTP/HTTPS, FTP, SSH, почта.', 'כותרת של 20 בתים. משמש את HTTP/HTTPS, ‏FTP, ‏SSH ודואר.'],
      ])),
    lSec(['UDP', 'UDP', 'UDP'],
      lP(['UDP is connectionless and unreliable — no handshake, no acknowledgements, no ordering — but it is fast with only an 8-byte header. It suits DNS queries, DHCP, TFTP, SNMP, VoIP and video streaming, where speed matters more than a lost packet.',
        'UDP работает без соединения и ненадёжно — без рукопожатия, подтверждений и порядка, — зато быстро, заголовок всего 8 байт. Подходит для DNS-запросов, DHCP, TFTP, SNMP, IP-телефонии и видео, где скорость важнее одного потерянного пакета.',
        'UDP הוא ללא חיבור ולא אמין — בלי לחיצת יד, בלי אישורים ובלי סדר — אבל מהיר, עם כותרת של 8 בתים בלבד. מתאים לשאילתות DNS, ‏DHCP, ‏TFTP, ‏SNMP, ‏VoIP ווידאו בזרימה, שבהם מהירות חשובה יותר מחבילה אחת שאבדה.'])),
    lSec(['Port numbers', 'Номера портов', 'מספרי פורטים'],
      lTable([['Range', 'Диапазон', 'טווח'], ['Name', 'Название', 'שם']], [
        ['0 – 1023', ['Well-known (servers: HTTP 80, HTTPS 443…)', 'Общеизвестные (серверы: HTTP 80, HTTPS 443…)', 'מוכרים (שרתים: HTTP 80, ‏HTTPS 443…)']],
        ['1024 – 49151', ['Registered (applications)', 'Зарегистрированные (приложения)', 'רשומים (יישומים)']],
        ['49152 – 65535', ['Dynamic / private (clients choose a random source port)', 'Динамические / частные (клиент берёт случайный порт источника)', 'דינמיים / פרטיים (הלקוח בוחר פורט מקור אקראי)']],
      ]),
      lTable([['Port', 'Порт', 'פורט'], ['Protocol', 'Протокол', 'פרוטוקול'], ['Transport', 'Транспорт', 'תעבורה']], WELL_KNOWN_PORTS.map((x) => [x.port, x.name, x.tr])),
      lCode('C:\\> netstat -an      (shows active connections and listening ports)')),
  ],
  quiz: [
    lQ(['What is the correct order of the TCP three-way handshake?', 'Какой порядок у трёхэтапного рукопожатия TCP?', 'מהו סדר לחיצת היד המשולשת של TCP?'], ['SYN → SYN-ACK → ACK', 'ACK → SYN → FIN', 'SYN → ACK → FIN', 'FIN → ACK → SYN'], 0,
      ['FIN is used to close the session.', 'FIN используется для закрытия сеанса.', 'FIN משמש לסגירת ה-session.']),
    lQ(['Which protocol is best for live voice over IP?', 'Какой протокол лучше для живой IP-телефонии?', 'איזה פרוטוקול מתאים ביותר לשיחות קול חיות ב-IP?'], ['UDP', 'TCP', 'FTP', 'SMTP'], 0,
      ['A late voice packet is useless; retransmission would only add delay.', 'Опоздавший голосовой пакет бесполезен; повторная отправка лишь добавит задержку.', 'חבילת קול שמאחרת לא שימושית; שליחה חוזרת רק תוסיף השהיה.']),
    lQ(['What is a socket?', 'Что такое сокет?', 'מהו socket?'], [['IP address + port number', 'IP-адрес + номер порта', 'כתובת IP + מספר פורט'], ['MAC + IP address', 'MAC + IP-адрес', 'MAC + כתובת IP'], ['A type of cable', 'Тип кабеля', 'סוג כבל'], ['A router interface', 'Интерфейс маршрутизатора', 'ממשק של נתב']], 0,
      ['A socket pair uniquely identifies a conversation.', 'Пара сокетов однозначно определяет разговор.', 'זוג sockets מזהה שיחה באופן ייחודי.']),
    lQ(['Which TCP feature controls how much data can be sent before an acknowledgement?', 'Какая функция TCP определяет, сколько данных отправить до подтверждения?', 'איזו תכונה של TCP קובעת כמה נתונים אפשר לשלוח לפני אישור?'], [['Window size', 'Размер окна', 'גודל החלון'], ['Sequence number', 'Порядковый номер', 'מספר סידורי'], ['TTL', 'TTL', 'TTL'], ['Checksum', 'Контрольная сумма', 'Checksum']], 0,
      ['Window size = flow control.', 'Размер окна — это управление потоком.', 'גודל החלון = בקרת זרימה.']),
    lQ(['Which port range do clients use as random source ports?', 'Какой диапазон портов клиенты берут как случайные порты источника?', 'באיזה טווח פורטים לקוחות משתמשים כפורט מקור אקראי?'], ['49152 – 65535', '0 – 1023', '1024 – 49151', '1 – 100'], 0,
      ['Dynamic (ephemeral) ports.', 'Динамические (эфемерные) порты.', 'פורטים דינמיים (ephemeral).']),
    lQ(['How big is the UDP header?', 'Какой размер заголовка UDP?', 'מה גודל כותרת UDP?'], [['8 bytes', '8 байт', '8 בתים'], ['20 bytes', '20 байт', '20 בתים'], ['40 bytes', '40 байт', '40 בתים'], ['4 bytes', '4 байта', '4 בתים']], 0,
      ['TCP header is at least 20 bytes.', 'Заголовок TCP — минимум 20 байт.', 'כותרת TCP היא לפחות 20 בתים.']),
    lQ(['How does TCP put segments back in the right order?', 'Как TCP восстанавливает правильный порядок сегментов?', 'איך TCP מחזיר את המקטעים לסדר הנכון?'], [['With sequence numbers', 'По порядковым номерам', 'בעזרת מספרים סידוריים'], ['With port numbers', 'По номерам портов', 'בעזרת מספרי פורטים'], ['With MAC addresses', 'По MAC-адресам', 'בעזרת כתובות MAC'], ['It does not', 'Никак', 'הוא לא עושה את זה']], 0,
      ['Sequence numbers also show which data was lost.', 'Порядковые номера ещё и показывают, какие данные потерялись.', 'המספרים הסידוריים גם מראים אילו נתונים אבדו.']),
  ],
  gen: [
    function genPortToProto(rng) {
      const x = rng.pick(WELL_KNOWN_PORTS);
      return lGen(T('Which protocol uses well-known port ' + x.port + '?', 'Какой протокол использует порт ' + x.port + '?', 'איזה פרוטוקול משתמש בפורט ' + x.port + '?'),
        x.name, rng.shuffle(WELL_KNOWN_PORTS.filter((y) => y !== x)).map((y) => y.name),
        T(x.name + ' — port ' + x.port + ' (' + x.tr + ').', x.name + ' — порт ' + x.port + ' (' + x.tr + ').', x.name + ' — פורט ' + x.port + ' ‏(' + x.tr + ').'));
    },
    function genProtoToPort(rng) {
      const x = rng.pick(WELL_KNOWN_PORTS);
      return lGen(T('Which port does ' + x.name + ' use?', 'Какой порт использует ' + x.name + '?', 'באיזה פורט משתמש ' + x.name + '?'),
        x.port, rng.shuffle(WELL_KNOWN_PORTS.filter((y) => y !== x)).map((y) => y.port),
        T(x.name + ' = ' + x.port + ' over ' + x.tr + '.', x.name + ' = ' + x.port + ' поверх ' + x.tr + '.', x.name + ' = ' + x.port + ' מעל ' + x.tr + '.'));
    },
    function genTcpOrUdp(rng) {
      const x = rng.pick(WELL_KNOWN_PORTS.filter((y) => y.tr !== 'UDP, TCP'));
      const tcp = T('TCP — reliable, connection-oriented', 'TCP — надёжный, с соединением', 'TCP — אמין, מבוסס חיבור');
      const udp = T('UDP — fast, connectionless', 'UDP — быстрый, без соединения', 'UDP — מהיר, ללא חיבור');
      const ip = T('Neither — it runs directly over IP', 'Ни тот, ни другой — работает прямо поверх IP', 'אף אחד — רץ ישירות מעל IP');
      return lGen(T('Which transport protocol does ' + x.name + ' use?', 'Какой транспортный протокол использует ' + x.name + '?', 'באיזה פרוטוקול תעבורה משתמש ' + x.name + '?'),
        x.tr === 'TCP' ? tcp : udp, [x.tr === 'TCP' ? udp : tcp, ip],
        T(x.name + ' uses ' + x.tr + ' (port ' + x.port + ').', x.name + ' использует ' + x.tr + ' (порт ' + x.port + ').', x.name + ' משתמש ב-' + x.tr + ' (פורט ' + x.port + ').'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn15', topic: null, drill: 'ports', minutes: 12,
  title: T('Application Layer', 'Прикладной уровень', 'שכבת היישום'),
  goal: T('Client-server and peer-to-peer, the web, email, DNS, DHCP and file sharing protocols.',
    'Клиент-сервер и одноранговые сети, веб, почта, DNS, DHCP и протоколы обмена файлами.',
    'שרת-לקוח ועמית לעמית, האינטרנט (Web), דואר, ‏DNS, ‏DHCP ופרוטוקולים לשיתוף קבצים.'),
  sections: [
    lSec(['Application, presentation, session', 'Прикладной, представления, сеансовый', 'יישום, הצגה, שיחה'],
      lP(['In TCP/IP these three OSI layers are one Application layer. It is the interface between the user\'s programs and the network.',
        'В TCP/IP эти три уровня OSI объединены в один прикладной уровень. Это стык между программами пользователя и сетью.',
        'ב-TCP/IP שלוש שכבות ה-OSI האלה הן שכבת יישום אחת. זהו הממשק בין התוכנות של המשתמש לבין הרשת.']),
      lUL([
        ['Client-server — the client asks, the server answers (web, email).', 'Клиент-сервер — клиент спрашивает, сервер отвечает (веб, почта).', 'שרת-לקוח — הלקוח מבקש והשרת עונה (אתרים, דואר).'],
        ['Peer-to-peer (P2P) — each device is client and server (BitTorrent).', 'Одноранговая (P2P) — каждое устройство и клиент, и сервер (BitTorrent).', 'עמית לעמית (P2P) — כל התקן הוא גם לקוח וגם שרת (BitTorrent).'],
      ])),
    lSec(['Web and email', 'Веб и почта', 'Web ודואר'],
      lUL([
        ['HTTP (80) — web pages. HTTPS (443) — HTTP encrypted with TLS.', 'HTTP (80) — веб-страницы. HTTPS (443) — HTTP, зашифрованный TLS.', 'HTTP ‏(80) — דפי אינטרנט. ‏HTTPS ‏(443) — HTTP מוצפן ב-TLS.'],
        ['URL: https://www.cisco.com/index.html = protocol + server name + resource.', 'URL: https://www.cisco.com/index.html = протокол + имя сервера + ресурс.', 'URL: ‏https://www.cisco.com/index.html = פרוטוקול + שם שרת + משאב.'],
        ['SMTP (25) — sends email between servers and from a client.', 'SMTP (25) — отправляет почту между серверами и от клиента.', 'SMTP ‏(25) — שולח דואר בין שרתים ומהלקוח.'],
        ['POP3 (110) — downloads mail and usually deletes it from the server. IMAP (143) — keeps mail on the server, synced on all devices.', 'POP3 (110) — скачивает почту и обычно удаляет её с сервера. IMAP (143) — хранит почту на сервере, синхронно на всех устройствах.', 'POP3 ‏(110) — מוריד את הדואר ובדרך כלל מוחק אותו מהשרת. ‏IMAP ‏(143) — משאיר את הדואר בשרת ומסונכרן בכל ההתקנים.'],
      ])),
    lSec(['DNS', 'DNS', 'DNS'],
      lP(['DNS translates names to IP addresses (www.cisco.com → 72.163.4.185). It is hierarchical: root servers → top-level domains (.com, .org, .il, .ru) → second-level domains.',
        'DNS переводит имена в IP-адреса (www.cisco.com → 72.163.4.185). Он иерархичен: корневые серверы → домены верхнего уровня (.com, .org, .il, .ru) → домены второго уровня.',
        'DNS מתרגם שמות לכתובות IP ‏(www.cisco.com → 72.163.4.185). הוא היררכי: שרתי שורש → דומיינים עליונים (‎.com, ‎.org, ‎.il, ‎.ru) → דומיינים ברמה השנייה.']),
      lTable([['Record', 'Запись', 'רשומה'], ['Meaning', 'Значение', 'משמעות']], [
        ['A', ['Name → IPv4 address', 'Имя → IPv4-адрес', 'שם → כתובת IPv4']], ['AAAA', ['Name → IPv6 address', 'Имя → IPv6-адрес', 'שם → כתובת IPv6']],
        ['NS', ['Authoritative name server', 'Авторитетный DNS-сервер', 'שרת שמות מוסמך']], ['MX', ['Mail server of the domain', 'Почтовый сервер домена', 'שרת הדואר של הדומיין']],
      ]),
      lCode('C:\\> nslookup www.cisco.com'),
      lTip(['Classic symptom: ping 8.8.8.8 works but ping www.google.com fails → the problem is DNS.', 'Классический симптом: ping 8.8.8.8 работает, а ping www.google.com — нет → проблема в DNS.', 'סימפטום קלאסי: ‏ping 8.8.8.8 עובד אבל ping www.google.com נכשל → הבעיה ב-DNS.'])),
    lSec(['DHCP and file sharing', 'DHCP и обмен файлами', 'DHCP ושיתוף קבצים'],
      lUL([
        ['DHCP gives hosts IP, mask, gateway and DNS automatically: Discover → Offer → Request → Acknowledgment (DORA), UDP 67/68.', 'DHCP автоматически выдаёт хостам IP, маску, шлюз и DNS: Discover → Offer → Request → Acknowledgment (DORA), UDP 67/68.', 'DHCP נותן למארחים אוטומטית IP, מסכה, שער ו-DNS: ‏Discover → Offer → Request → Acknowledgment ‏(DORA), ‏UDP 67/68.'],
        ['FTP — file transfer: port 21 for control, port 20 for data. TFTP (69/UDP) — simple, no login, used to copy IOS images.', 'FTP — передача файлов: порт 21 — управление, порт 20 — данные. TFTP (69/UDP) — простой, без входа, для копирования образов IOS.', 'FTP — העברת קבצים: פורט 21 לבקרה ופורט 20 לנתונים. ‏TFTP ‏(69/UDP) — פשוט, בלי התחברות, משמש להעתקת תמונות IOS.'],
        ['SMB — Windows file and printer sharing.', 'SMB — общий доступ к файлам и принтерам Windows.', 'SMB — שיתוף קבצים ומדפסות ב-Windows.'],
      ])),
  ],
  quiz: [
    lQ(['Which protocol translates www.cisco.com into an IP address?', 'Какой протокол переводит www.cisco.com в IP-адрес?', 'איזה פרוטוקול מתרגם את www.cisco.com לכתובת IP?'], ['DNS', 'DHCP', 'HTTP', 'ARP'], 0,
      ['ARP maps IP to MAC; DNS maps names to IP.', 'ARP — IP в MAC; DNS — имена в IP.', 'ARP — מ-IP ל-MAC; ‏DNS — משמות ל-IP.']),
    lQ(['Which email protocol keeps messages on the server and syncs all devices?', 'Какой почтовый протокол хранит письма на сервере и синхронизирует все устройства?', 'איזה פרוטוקול דואר משאיר את ההודעות בשרת ומסנכרן את כל ההתקנים?'], ['IMAP', 'POP3', 'SMTP', 'FTP'], 0,
      ['POP3 downloads and usually deletes; SMTP only sends.', 'POP3 скачивает и обычно удаляет; SMTP только отправляет.', 'POP3 מוריד ובדרך כלל מוחק; ‏SMTP רק שולח.']),
    lQ(['Which DNS record maps a name to an IPv6 address?', 'Какая запись DNS сопоставляет имя и IPv6-адрес?', 'איזו רשומת DNS ממפה שם לכתובת IPv6?'], ['AAAA', 'A', 'MX', 'NS'], 0,
      ['A = IPv4, AAAA = IPv6, MX = mail, NS = name server.', 'A — IPv4, AAAA — IPv6, MX — почта, NS — DNS-сервер.', 'A = IPv4, ‏AAAA = IPv6, ‏MX = דואר, ‏NS = שרת שמות.']),
    lQ(['ping 8.8.8.8 works, but ping www.google.com fails. What is wrong?', 'ping 8.8.8.8 работает, а ping www.google.com — нет. В чём проблема?', 'ping 8.8.8.8 עובד, אבל ping www.google.com נכשל. מה הבעיה?'], ['DNS', 'The cable', 'The default gateway', 'The NIC'], 0,
      ['Connectivity by IP is fine, so name resolution fails.', 'Связь по IP есть, значит не работает разрешение имён.', 'יש קישוריות לפי IP, אז תרגום השמות נכשל.']),
    lQ(['Which port does FTP use for control commands?', 'Какой порт FTP использует для управляющих команд?', 'באיזה פורט FTP משתמש לפקודות בקרה?'], ['21', '20', '22', '69'], 0,
      ['21 control, 20 data; 69 is TFTP.', '21 — управление, 20 — данные; 69 — TFTP.', '‏21 בקרה, ‏20 נתונים; ‏69 הוא TFTP.']),
    lQ(['Which protocol sends email?', 'Какой протокол отправляет почту?', 'איזה פרוטוקול שולח דואר?'], ['SMTP', 'POP3', 'IMAP', 'HTTP'], 0,
      ['SMTP (25) sends; POP3/IMAP retrieve.', 'SMTP (25) отправляет; POP3/IMAP получают.', 'SMTP ‏(25) שולח; POP3/IMAP מקבלים.']),
    lQ(['What does HTTPS add to HTTP?', 'Что HTTPS добавляет к HTTP?', 'מה HTTPS מוסיף ל-HTTP?'], [['Encryption with TLS', 'Шифрование TLS', 'הצפנה ב-TLS'], ['Faster speed', 'Скорость', 'מהירות'], ['Compression only', 'Только сжатие', 'רק דחיסה'], ['Name resolution', 'Разрешение имён', 'תרגום שמות']], 0,
      ['HTTPS uses port 443.', 'HTTPS работает на порту 443.', 'HTTPS משתמש בפורט 443.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn16', topic: 'device', minutes: 15,
  title: T('Network Security Fundamentals', 'Основы сетевой безопасности', 'יסודות אבטחת רשת'),
  goal: T('Vulnerabilities, threats and types of attacks, how to mitigate them, AAA and how to harden a Cisco device with strong passwords and SSH.',
    'Уязвимости, угрозы и виды атак, как от них защищаться, AAA и как укрепить устройство Cisco надёжными паролями и SSH.',
    'פגיעויות, איומים וסוגי מתקפות, איך מתגוננים, ‏AAA ואיך מקשיחים התקן Cisco בסיסמאות חזקות וב-SSH.'),
  sections: [
    lSec(['Vulnerabilities and threats', 'Уязвимости и угрозы', 'פגיעויות ואיומים'],
      lUL([
        ['Vulnerabilities: technological (weak protocols, OS bugs), configuration (default passwords, open services), security policy (no rules, no monitoring).', 'Уязвимости: технологические (слабые протоколы, ошибки ОС), конфигурационные (пароли по умолчанию, открытые службы), в политике безопасности (нет правил, нет контроля).', 'פגיעויות: טכנולוגיות (פרוטוקולים חלשים, באגים במערכת ההפעלה), תצורה (סיסמאות ברירת מחדל, שירותים פתוחים), מדיניות אבטחה (אין כללים, אין ניטור).'],
        ['Physical threats: hardware damage, power, environment, maintenance — lock the server room.', 'Физические угрозы: повреждение оборудования, питание, среда, обслуживание — запирайте серверную.', 'איומים פיזיים: נזק לחומרה, חשמל, סביבה, תחזוקה — נועלים את חדר השרתים.'],
      ])),
    lSec(['Types of attacks', 'Виды атак', 'סוגי מתקפות'],
      lTable([['Attack', 'Атака', 'מתקפה'], ['What it is', 'Что это', 'מה זה']], [
        [['Virus', 'Вирус', 'וירוס'], ['Malicious code attached to a program; spreads when the program runs', 'Вредоносный код в программе; распространяется при её запуске', 'קוד זדוני שמוצמד לתוכנה; מתפשט כשהתוכנה רצה']],
        [['Worm', 'Червь', 'תולעת'], ['Copies itself across the network by itself', 'Сам распространяется по сети', 'משכפלת את עצמה ברשת לבד']],
        [['Trojan horse', 'Троян', 'סוס טרויאני'], ['Looks useful but hides malicious code', 'Выглядит полезным, но прячет вредоносный код', 'נראה שימושי אבל מסתיר קוד זדוני']],
        [['Reconnaissance', 'Разведка', 'איסוף מודיעין'], ['Ping sweeps and port scans to map the network', 'Ping sweep и сканирование портов для изучения сети', 'סריקות ping וסריקות פורטים כדי למפות את הרשת']],
        [['Access attacks', 'Атаки доступа', 'מתקפות גישה'], ['Password attacks, trust exploitation, man-in-the-middle', 'Подбор паролей, злоупотребление доверием, «человек посередине»', 'ניחוש סיסמאות, ניצול אמון, אדם באמצע']],
        ['DoS / DDoS', ['Flooding a service so real users cannot use it (DDoS = from many devices)', 'Перегрузка сервиса, чтобы настоящие пользователи не могли им пользоваться (DDoS — с многих устройств)', 'הצפת שירות כך שמשתמשים אמיתיים לא יכולים להשתמש בו (DDoS — מהרבה התקנים)']],
      ])),
    lSec(['Mitigation', 'Защита', 'התגוננות'],
      lUL([
        ['Defense in depth: firewalls, IPS, VPN, email and web security appliances, AAA servers — several layers together.', 'Эшелонированная защита: межсетевые экраны, IPS, VPN, защита почты и веба, AAA-серверы — несколько уровней вместе.', 'הגנה לעומק (defense in depth): חומות אש, IPS, ‏VPN, הגנה על דואר ו-Web, שרתי AAA — כמה שכבות יחד.'],
        ['Backups, software updates and patches, antivirus on hosts.', 'Резервные копии, обновления и патчи, антивирус на хостах.', 'גיבויים, עדכוני תוכנה וטלאים, אנטי-וירוס במארחים.'],
        ['AAA — Authentication (who are you), Authorization (what may you do), Accounting (what did you do).', 'AAA — аутентификация (кто вы), авторизация (что вам можно), учёт (что вы сделали).', 'AAA — אימות (מי אתה), הרשאה (מה מותר לך), חשבונאות (מה עשית).'],
      ])),
    lSec(['Hardening a Cisco device', 'Укрепление устройства Cisco', 'הקשחת התקן Cisco'],
      lCode('R1(config)# security passwords min-length 8\nR1(config)# login block-for 120 attempts 3 within 60\nR1(config)# line vty 0 4\nR1(config-line)# exec-timeout 5 0\nR1(config-line)# exit\nR1(config)# ip domain-name netlab.local\nR1(config)# crypto key generate rsa\n  How many bits in the modulus [512]: 1024\nR1(config)# username admin secret Str0ng!Pass\nR1(config)# ip ssh version 2\nR1(config)# line vty 0 4\nR1(config-line)# transport input ssh\nR1(config-line)# login local\nR1(config)# no ip http server'),
      lUL([
        ['Strong passwords: at least 8 characters, mixed case, numbers and symbols; change them regularly.', 'Надёжные пароли: от 8 символов, разный регистр, цифры и символы; регулярно меняйте.', 'סיסמאות חזקות: לפחות 8 תווים, אותיות גדולות וקטנות, ספרות וסימנים; מחליפים באופן קבוע.'],
        ['login block-for — blocks logins for 120 s after 3 failures in 60 s (slows brute force).', 'login block-for — блокирует вход на 120 с после 3 неудач за 60 с (замедляет подбор).', 'login block-for — חוסם כניסות ל-120 שניות אחרי 3 כישלונות ב-60 שניות (מאט ניחוש סיסמאות).'],
        ['exec-timeout 5 0 — logs out an idle session after 5 minutes.', 'exec-timeout 5 0 — завершает неактивный сеанс через 5 минут.', 'exec-timeout 5 0 — מנתק session לא פעיל אחרי 5 דקות.'],
        ['SSH instead of Telnet; disable unused services and shut down unused switch ports.', 'SSH вместо Telnet; отключите ненужные службы и выключите неиспользуемые порты коммутатора.', 'SSH במקום Telnet; מכבים שירותים לא נחוצים ופורטים לא בשימוש במתג.'],
      ])),
  ],
  quiz: [
    lQ(['Which malware spreads across the network by itself?', 'Какое вредоносное ПО само распространяется по сети?', 'איזו נוזקה מתפשטת ברשת לבד?'], [['Worm', 'Червь', 'תולעת'], ['Virus', 'Вирус', 'וירוס'], ['Trojan horse', 'Троян', 'סוס טרויאני'], ['Spyware', 'Шпионская программа', 'תוכנת ריגול']], 0,
      ['A virus needs a host program; a worm replicates on its own.', 'Вирусу нужна программа-носитель; червь размножается сам.', 'וירוס צריך תוכנה מארחת; תולעת משכפלת את עצמה.']),
    lQ(['A ping sweep and a port scan are examples of…', 'Ping sweep и сканирование портов — это примеры…', 'סריקת ping וסריקת פורטים הן דוגמאות ל…'], [['Reconnaissance', 'разведки', 'איסוף מודיעין'], ['DoS', 'DoS', 'DoS'], ['Access attack', 'атаки доступа', 'מתקפת גישה'], ['Worm', 'червя', 'תולעת']], 0,
      ['Attackers first map the network, then attack.', 'Сначала злоумышленник изучает сеть, затем атакует.', 'התוקף קודם ממפה את הרשת ואז תוקף.']),
    lQ(['What does the "A" for Authorization in AAA control?', 'Что контролирует «A» — авторизация в AAA?', 'על מה שולטת ה-A של הרשאה (Authorization) ב-AAA?'], [['What a user is allowed to do', 'Что пользователю разрешено делать', 'מה מותר למשתמש לעשות'], ['Who the user is', 'Кто пользователь', 'מי המשתמש'], ['What the user did', 'Что пользователь сделал', 'מה המשתמש עשה'], ['How fast the user types', 'Как быстро печатает', 'כמה מהר הוא מקליד']], 0,
      ['Authentication = who, Authorization = what allowed, Accounting = what was done.', 'Аутентификация — кто, авторизация — что можно, учёт — что сделано.', 'אימות = מי, הרשאה = מה מותר, חשבונאות = מה נעשה.']),
    lQ(['Which command logs out an idle vty session after 5 minutes?', 'Какая команда завершает неактивный сеанс vty через 5 минут?', 'איזו פקודה מנתקת session לא פעיל ב-vty אחרי 5 דקות?'], ['exec-timeout 5 0', 'login block-for 5', 'timeout 300', 'session-limit 5'], 0,
      ['exec-timeout minutes seconds.', 'exec-timeout минуты секунды.', 'exec-timeout דקות שניות.']),
    lQ(['Which of these is NOT needed for SSH?', 'Что из этого НЕ нужно для SSH?', 'מה מהבאים לא נדרש ל-SSH?'], [['A DHCP pool', 'DHCP-пул', 'מאגר DHCP'], ['A domain name', 'Доменное имя', 'שם דומיין'], ['RSA keys', 'RSA-ключи', 'מפתחות RSA'], ['A local user', 'Локальный пользователь', 'משתמש מקומי']], 0,
      ['SSH: hostname, ip domain-name, crypto key generate rsa, username, login local.', 'SSH: hostname, ip domain-name, crypto key generate rsa, username, login local.', 'SSH: ‏hostname, ‏ip domain-name, ‏crypto key generate rsa, ‏username, ‏login local.']),
    lQ(['Why use SSH instead of Telnet?', 'Почему SSH вместо Telnet?', 'למה SSH במקום Telnet?'], [['SSH encrypts the session; Telnet sends clear text', 'SSH шифрует сеанс; Telnet передаёт открытый текст', 'SSH מצפין את ה-session; ‏Telnet שולח טקסט גלוי'], ['SSH is faster', 'SSH быстрее', 'SSH מהיר יותר'], ['Telnet needs a license', 'Telnet требует лицензии', 'Telnet דורש רישיון'], ['SSH needs no password', 'SSH не нужен пароль', 'ל-SSH לא צריך סיסמה']], 0,
      ['Passwords sent by Telnet can be captured.', 'Пароли, отправленные через Telnet, можно перехватить.', 'סיסמאות שנשלחות ב-Telnet אפשר ליירט.']),
    lQ(['What is a DDoS attack?', 'Что такое DDoS-атака?', 'מהי מתקפת DDoS?'], [['A denial of service from many devices at once', 'Отказ в обслуживании с многих устройств одновременно', 'מניעת שירות מהרבה התקנים בבת אחת'], ['Stealing a password', 'Кража пароля', 'גניבת סיסמה'], ['Scanning ports', 'Сканирование портов', 'סריקת פורטים'], ['A virus in email', 'Вирус в письме', 'וירוס בדואר']], 0,
      ['Often done with a botnet of infected hosts.', 'Часто с помощью ботнета из заражённых хостов.', 'לעתים קרובות בעזרת botnet של מארחים נגועים.']),
    lQ(['What does "security passwords min-length 8" do?', 'Что делает «security passwords min-length 8»?', 'מה עושה "security passwords min-length 8"?'], [['Requires new passwords to be at least 8 characters', 'Требует, чтобы новые пароли были не короче 8 символов', 'מחייב שסיסמאות חדשות יהיו באורך 8 תווים לפחות'], ['Encrypts passwords', 'Шифрует пароли', 'מצפין סיסמאות'], ['Blocks 8 failed logins', 'Блокирует 8 неудачных входов', 'חוסם 8 כניסות כושלות'], ['Sets 8 users', 'Создаёт 8 пользователей', 'יוצר 8 משתמשים']], 0,
      ['It does not change existing passwords.', 'На уже заданные пароли не влияет.', 'זה לא משנה סיסמאות קיימות.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn17', topic: 'trouble', minutes: 15,
  title: T('Build a Small Network', 'Построение небольшой сети', 'בניית רשת קטנה'),
  goal: T('Choosing devices, planning addresses, redundancy and growth, verifying a network and a first troubleshooting method.',
    'Выбор устройств, план адресации, резервирование и рост, проверка сети и первый метод поиска неисправностей.',
    'בחירת התקנים, תכנון מיעון, יתירות וגדילה, בדיקת הרשת ושיטה ראשונה לפתרון תקלות.'),
  sections: [
    lSec(['Devices and addressing plan', 'Устройства и план адресации', 'התקנים ותוכנית מיעון'],
      lUL([
        ['Choose devices by cost, number and speed of ports, expandability (modular vs fixed) and OS features.', 'Выбирайте устройства по цене, количеству и скорости портов, расширяемости (модульные или фиксированные) и возможностям ОС.', 'בוחרים התקנים לפי מחיר, מספר ומהירות פורטים, יכולת הרחבה (מודולרי או קבוע) ויכולות מערכת ההפעלה.'],
        ['Plan IP ranges: end devices (often DHCP), servers and printers (static), network devices (static), and document everything.', 'Планируйте диапазоны IP: оконечные устройства (часто DHCP), серверы и принтеры (статически), сетевые устройства (статически) — и всё документируйте.', 'מתכננים טווחי IP: התקני קצה (לרוב DHCP), שרתים ומדפסות (סטטי), התקני רשת (סטטי) — ומתעדים הכול.'],
        ['Redundancy: extra links and devices so one failure does not stop the business.', 'Резервирование: дополнительные каналы и устройства, чтобы один отказ не остановил работу.', 'יתירות: קישורים והתקנים נוספים כך שתקלה אחת לא עוצרת את העבודה.'],
        ['Growth: keep documentation, an inventory and a budget; analyse traffic before upgrading.', 'Рост: ведите документацию, инвентаризацию и бюджет; анализируйте трафик перед модернизацией.', 'גדילה: שומרים תיעוד, מלאי ותקציב; מנתחים תעבורה לפני שדרוג.'],
      ])),
    lSec(['Verifying the network', 'Проверка сети', 'בדיקת הרשת'],
      lTable([['Where', 'Где', 'איפה'], ['Commands', 'Команды', 'פקודות']], [
        [['Router / switch', 'Маршрутизатор / коммутатор', 'נתב / מתג'], 'show ip interface brief, show ip route, show running-config, show interfaces, show arp, show version, show cdp neighbors'],
        [['Windows host', 'ПК с Windows', 'מחשב Windows'], 'ipconfig /all, ping, tracert, arp -a, nslookup, netstat'],
      ]),
      lTip(['show cdp neighbors shows the Cisco devices directly connected — great for drawing an unknown network. Disable CDP on ports facing the Internet.',
        'show cdp neighbors показывает напрямую подключённые устройства Cisco — отлично, чтобы нарисовать незнакомую сеть. На портах в сторону интернета CDP лучше выключить.',
        'show cdp neighbors מציג את התקני Cisco שמחוברים ישירות — מצוין כדי לשרטט רשת לא מוכרת. בפורטים שפונים לאינטרנט עדיף לכבות CDP.'])),
    lSec(['Troubleshooting method', 'Метод поиска неисправностей', 'שיטה לפתרון תקלות'],
      lUL([
        ['1. Identify the problem. 2. Establish a theory of probable causes. 3. Test the theory. 4. Make a plan and fix. 5. Verify and add preventive measures. 6. Document.', '1. Определить проблему. 2. Выдвинуть гипотезу о причинах. 3. Проверить гипотезу. 4. Составить план и исправить. 5. Проверить и принять меры на будущее. 6. Задокументировать.', '1. מזהים את הבעיה. 2. מעלים השערה לגבי הסיבות. 3. בודקים את ההשערה. 4. מתכננים ומתקנים. 5. מוודאים ומוסיפים אמצעי מניעה. 6. מתעדים.'],
        ['Change one thing at a time and test after every change.', 'Меняйте по одной вещи и проверяйте после каждого изменения.', 'משנים דבר אחד בכל פעם ובודקים אחרי כל שינוי.'],
      ])),
    lSec(['Common problems', 'Частые проблемы', 'בעיות נפוצות'],
      lTable([['Symptom', 'Симптом', 'סימפטום'], ['Likely cause', 'Вероятная причина', 'סיבה סבירה']], [
        [['Slow link, many collisions/CRC errors', 'Медленный канал, много коллизий/ошибок CRC', 'קישור איטי, הרבה התנגשויות/שגיאות CRC'], ['Duplex mismatch or a bad cable', 'Несовпадение дуплекса или плохой кабель', 'אי-התאמת דופלקס או כבל פגום']],
        [['Host cannot reach anything', 'Хост никуда не достаёт', 'המארח לא מגיע לשום מקום'], ['Wrong IP or mask, cable, wrong VLAN', 'Неверный IP или маска, кабель, не тот VLAN', 'IP או מסכה שגויים, כבל, VLAN לא נכון']],
        [['Host reaches its LAN but not other networks', 'Хост достаёт до своей LAN, но не до других сетей', 'המארח מגיע ל-LAN שלו אבל לא לרשתות אחרות'], ['Wrong or missing default gateway', 'Неверный шлюз или его нет', 'שער ברירת מחדל שגוי או חסר']],
        [['IP works, names do not', 'По IP работает, по именам — нет', 'לפי IP עובד, לפי שמות לא'], ['DNS server setting', 'Настройка DNS-сервера', 'הגדרת שרת ה-DNS']],
      ])),
  ],
  quiz: [
    lQ(['Which devices should get static IP addresses?', 'Каким устройствам лучше давать статические IP?', 'לאילו התקנים כדאי לתת כתובות IP סטטיות?'], [['Servers, printers and network devices', 'Серверам, принтерам и сетевым устройствам', 'שרתים, מדפסות והתקני רשת'], ['All laptops', 'Всем ноутбукам', 'כל המחשבים הניידים'], ['Guest phones', 'Гостевым телефонам', 'טלפונים של אורחים'], ['No device', 'Никаким', 'לאף התקן']], 0,
      ['Users and other devices must always find them at the same address.', 'Пользователи и другие устройства должны всегда находить их по одному адресу.', 'משתמשים והתקנים אחרים צריכים למצוא אותם תמיד באותה כתובת.']),
    lQ(['Which command shows directly connected Cisco devices?', 'Какая команда показывает напрямую подключённые устройства Cisco?', 'איזו פקודה מציגה התקני Cisco שמחוברים ישירות?'], ['show cdp neighbors', 'show ip route', 'show version', 'show arp'], 0,
      ['CDP = Cisco Discovery Protocol (Layer 2).', 'CDP — Cisco Discovery Protocol (уровень 2).', 'CDP = ‏Cisco Discovery Protocol (שכבה 2).']),
    lQ(['A host reaches its own LAN but no other network. Most likely?', 'Хост достаёт до своей LAN, но не до других сетей. Наиболее вероятно?', 'מארח מגיע ל-LAN שלו אבל לא לרשתות אחרות. מה הכי סביר?'], [['Wrong or missing default gateway', 'Неверный или отсутствующий шлюз', 'שער ברירת מחדל שגוי או חסר'], ['Bad cable', 'Плохой кабель', 'כבל פגום'], ['Wrong MAC address', 'Неверный MAC-адрес', 'כתובת MAC שגויה'], ['DNS', 'DNS', 'DNS']], 0,
      ['Local traffic works, so Layer 1–2 and the IP/mask are fine.', 'Локальный трафик работает, значит уровни 1–2 и IP/маска в порядке.', 'התעבורה המקומית עובדת, כך ששכבות 1–2 וה-IP/מסכה תקינים.']),
    lQ(['Many CRC errors and collisions on a switch port suggest…', 'Много ошибок CRC и коллизий на порту коммутатора указывают на…', 'הרבה שגיאות CRC והתנגשויות בפורט של מתג מצביעות על…'], [['A duplex mismatch or a bad cable', 'несовпадение дуплекса или плохой кабель', 'אי-התאמת דופלקס או כבל פגום'], ['A DNS problem', 'проблему DNS', 'בעיית DNS'], ['A missing route', 'нет маршрута', 'נתיב חסר'], ['A wrong password', 'неверный пароль', 'סיסמה שגויה']], 0,
      ['Check show interfaces for duplex and errors.', 'Проверьте show interfaces: дуплекс и ошибки.', 'בודקים ב-show interfaces את הדופלקס והשגיאות.']),
    lQ(['What is the first step of troubleshooting?', 'Какой первый шаг поиска неисправностей?', 'מהו הצעד הראשון בפתרון תקלות?'], [['Identify the problem', 'Определить проблему', 'לזהות את הבעיה'], ['Replace the router', 'Заменить маршрутизатор', 'להחליף את הנתב'], ['Reload everything', 'Перезагрузить всё', 'לאתחל הכול'], ['Document the fix', 'Задокументировать исправление', 'לתעד את התיקון']], 0,
      ['Know exactly what fails, from where to where, before changing anything.', 'Сначала точно узнайте, что не работает и откуда куда, и только потом что-то меняйте.', 'קודם מבינים בדיוק מה לא עובד ומאיפה לאן, ורק אז משנים משהו.']),
    lQ(['Which Windows command shows IP, mask, gateway, DNS and MAC?', 'Какая команда Windows показывает IP, маску, шлюз, DNS и MAC?', 'איזו פקודת Windows מציגה IP, מסכה, שער, DNS ו-MAC?'], ['ipconfig /all', 'netstat', 'arp -a', 'tracert'], 0,
      ['Plain ipconfig does not show DNS and MAC.', 'Обычный ipconfig не показывает DNS и MAC.', 'ipconfig רגיל לא מציג DNS ו-MAC.']),
    lQ(['Why change only one thing at a time while troubleshooting?', 'Почему при поиске неисправностей меняют только одну вещь за раз?', 'למה בפתרון תקלות משנים רק דבר אחד בכל פעם?'], [['To know which change fixed (or broke) it', 'Чтобы знать, какое изменение помогло (или навредило)', 'כדי לדעת איזה שינוי תיקן (או קלקל)'], ['It is faster', 'Так быстрее', 'כך מהיר יותר'], ['IOS allows only one', 'IOS разрешает только одно', 'IOS מאפשר רק אחד'], ['To save power', 'Чтобы экономить энергию', 'כדי לחסוך חשמל']], 0,
      ['Several changes at once hide the real cause.', 'Несколько изменений сразу скрывают настоящую причину.', 'כמה שינויים בבת אחת מסתירים את הסיבה האמיתית.']),
  ],
});
