'use strict';
// Наставник для заданий Training: разбор каждой неудачной проверки (что не так, почему это важно, как исправить)
// и пошаговое решение похожего задания с пояснением к каждой команде.

// ---------- Пояснения к командам IOS ----------
const CMD_NOTES = [
  [/^enable$/, () => T('Enter privileged EXEC mode (#).', 'Перейти в привилегированный режим (#).', 'כניסה למצב privileged EXEC ‏(#).')],
  [/^configure terminal$/, () => T('Enter global configuration mode.', 'Перейти в режим глобальной конфигурации.', 'כניסה למצב תצורה גלובלית.')],
  [/^end$/, () => T('Leave configuration mode, back to #.', 'Выйти из конфигурации обратно в #.', 'יציאה מהתצורה וחזרה ל-#.')],
  [/^exit$/, () => T('Go back one level.', 'Вернуться на уровень назад.', 'חזרה רמה אחת אחורה.')],
  [/^hostname (\S+)/, (m) => T('Name the device ' + m[1] + '; the name appears in the prompt.', 'Назвать устройство ' + m[1] + '; имя видно в приглашении.', 'לתת להתקן את השם ' + m[1] + '; השם מופיע בסמן.')],
  [/^interface range (.+)/, (m) => T('Configure several interfaces at once: ' + m[1] + '.', 'Настроить сразу несколько интерфейсов: ' + m[1] + '.', 'הגדרת כמה ממשקים בבת אחת: ' + m[1] + '.')],
  [/^interface vlan (\d+)/i, (m) => T('Enter the switch virtual interface VLAN ' + m[1] + ' (SVI).', 'Войти в виртуальный интерфейс коммутатора VLAN ' + m[1] + ' (SVI).', 'כניסה לממשק הווירטואלי של המתג VLAN ' + m[1] + ' ‏(SVI).')],
  [/^interface (\S+)\.(\d+)/, (m) => T('Create subinterface ' + m[1] + '.' + m[2] + ' — one per VLAN in router-on-a-stick.', 'Создать подынтерфейс ' + m[1] + '.' + m[2] + ' — по одному на VLAN в router-on-a-stick.', 'יצירת תת-ממשק ' + m[1] + '.' + m[2] + ' — אחד לכל VLAN ב-router-on-a-stick.')],
  [/^interface (\S+)/, (m) => T('Enter the settings of interface ' + m[1] + '.', 'Войти в настройки интерфейса ' + m[1] + '.', 'כניסה להגדרות הממשק ' + m[1] + '.')],
  [/^ip address (\S+) (\S+)/, (m) => T('Give this interface IP ' + m[1] + ' with mask ' + m[2] + ' (/' + maskToLen(m[2]) + ').', 'Дать интерфейсу IP ' + m[1] + ' с маской ' + m[2] + ' (/' + maskToLen(m[2]) + ').', 'לתת לממשק כתובת ' + m[1] + ' עם מסכה ' + m[2] + ' ‏(‎/' + maskToLen(m[2]) + ').')],
  [/^no shutdown$/, () => T('Turn the interface on (router interfaces are off by default).', 'Включить интерфейс (на роутере они выключены по умолчанию).', 'הפעלת הממשק (בנתב הממשקים כבויים כברירת מחדל).')],
  [/^encapsulation dot1Q (\d+)( native)?/i, (m) => T('Tie this subinterface to VLAN ' + m[1] + ' (802.1Q tag)' + (m[2] ? ', untagged native VLAN' : '') + '.', 'Привязать подынтерфейс к VLAN ' + m[1] + ' (тег 802.1Q)' + (m[2] ? ', native VLAN без тега' : '') + '.', 'קשירת תת-הממשק ל-VLAN ' + m[1] + ' (תג 802.1Q)' + (m[2] ? ', ‏native VLAN בלי תג' : '') + '.')],
  [/^ip route 0\.0\.0\.0 0\.0\.0\.0 (\S+)/, (m) => T('Default route: everything unknown goes to next hop ' + m[1] + '.', 'Маршрут по умолчанию: всё неизвестное — на next hop ' + m[1] + '.', 'נתיב ברירת מחדל: כל מה שלא ידוע הולך ל-next hop ' + m[1] + '.')],
  [/^ip route (\S+) (\S+) (\S+)/, (m) => T('Static route: to reach ' + m[1] + '/' + maskToLen(m[2]) + ' send packets to ' + m[3] + '.', 'Статический маршрут: в сеть ' + m[1] + '/' + maskToLen(m[2]) + ' отправлять через ' + m[3] + '.', 'נתיב סטטי: כדי להגיע ל-' + m[1] + '/' + maskToLen(m[2]) + ' שולחים דרך ' + m[3] + '.')],
  [/^no ip route (\S+) (\S+) (\S+)/, (m) => T('Delete the wrong route to ' + m[1] + '/' + maskToLen(m[2]) + ' via ' + m[3] + '.', 'Удалить неверный маршрут в ' + m[1] + '/' + maskToLen(m[2]) + ' через ' + m[3] + '.', 'מחיקת הנתיב השגוי ל-' + m[1] + '/' + maskToLen(m[2]) + ' דרך ' + m[3] + '.')],
  [/^vlan (\d+)/, (m) => T('Create VLAN ' + m[1] + ' and enter its settings.', 'Создать VLAN ' + m[1] + ' и войти в его настройки.', 'יצירת VLAN ' + m[1] + ' וכניסה להגדרות שלו.')],
  [/^name (\S+)/, (m) => T('Name the VLAN "' + m[1] + '".', 'Назвать VLAN «' + m[1] + '».', 'לתת ל-VLAN את השם "' + m[1] + '".')],
  [/^switchport mode access/, () => T('Access port: one VLAN, for an end device.', 'Access-порт: один VLAN, для оконечного устройства.', 'פורט access: ‏VLAN אחד, להתקן קצה.')],
  [/^switchport access vlan (\d+)/, (m) => T('Put the port into VLAN ' + m[1] + '.', 'Поместить порт в VLAN ' + m[1] + '.', 'שיוך הפורט ל-VLAN ' + m[1] + '.')],
  [/^switchport mode trunk/, () => T('Trunk: carries all VLANs with 802.1Q tags.', 'Trunk: передаёт все VLAN с тегами 802.1Q.', 'Trunk: מעביר את כל ה-VLAN עם תגי 802.1Q.')],
  [/^switchport trunk native vlan (\d+)/, (m) => T('Untagged frames on this trunk belong to VLAN ' + m[1] + ' — same on both ends.', 'Кадры без тега на этом trunk — VLAN ' + m[1] + '; одинаково на обоих концах.', 'מסגרות בלי תג ב-trunk הזה שייכות ל-VLAN ' + m[1] + ' — זהה בשני הצדדים.')],
  [/^switchport trunk allowed vlan (.+)/, (m) => T('VLANs allowed on the trunk: ' + m[1] + '.', 'Разрешённые на trunk VLAN: ' + m[1] + '.', 'VLAN מותרים ב-trunk: ' + m[1] + '.')],
  [/^no ip dhcp excluded-address (\S+) (\S+)/, (m) => T('Remove the wrong exclusion ' + m[1] + ' – ' + m[2] + ' so these addresses can be leased again.', 'Убрать неверное исключение ' + m[1] + ' – ' + m[2] + ', чтобы адреса снова раздавались.', 'ביטול ההחרגה השגויה ' + m[1] + ' – ' + m[2] + ' כדי שהכתובות יחולקו שוב.')],
  [/^ip dhcp excluded-address (\S+)(?: (\S+))?/, (m) => T('Never lease ' + m[1] + (m[2] ? ' – ' + m[2] : '') + ' (kept for routers and servers).', 'Не раздавать ' + m[1] + (m[2] ? ' – ' + m[2] : '') + ' (для роутеров и серверов).', 'לא לחלק את ' + m[1] + (m[2] ? ' – ' + m[2] : '') + ' (שמורות לנתבים ולשרתים).')],
  [/^ip dhcp pool (\S+)/, (m) => T('Create DHCP pool "' + m[1] + '".', 'Создать DHCP-пул «' + m[1] + '».', 'יצירת מאגר DHCP בשם "' + m[1] + '".')],
  [/^no network (\S+) (\S+) area (\d+)/, (m) => T('Remove the wrong OSPF statement for ' + m[1] + ' (area ' + m[3] + ').', 'Убрать неверную команду OSPF для ' + m[1] + ' (area ' + m[3] + ').', 'הסרת פקודת ה-OSPF השגויה עבור ' + m[1] + ' ‏(area ' + m[3] + ').')],
  [/^network (\S+) (\S+) area (\d+)/, (m) => T('OSPF: interfaces in ' + m[1] + ' (wildcard ' + m[2] + ') join area ' + m[3] + '.', 'OSPF: интерфейсы из ' + m[1] + ' (wildcard ' + m[2] + ') входят в area ' + m[3] + '.', 'OSPF: הממשקים ב-' + m[1] + ' ‏(wildcard ' + m[2] + ') מצטרפים ל-area ' + m[3] + '.')],
  [/^network (\S+) (\S+)$/, (m) => T('DHCP: lease addresses from ' + m[1] + '/' + maskToLen(m[2]) + '.', 'DHCP: раздавать адреса из ' + m[1] + '/' + maskToLen(m[2]) + '.', 'DHCP: לחלק כתובות מ-' + m[1] + '/' + maskToLen(m[2]) + '.')],
  [/^network (\S+)$/, (m) => T('RIP: enable RIP for the classful network ' + m[1] + ' and advertise it.', 'RIP: включить RIP для классовой сети ' + m[1] + ' и объявлять её.', 'RIP: הפעלת RIP עבור הרשת ' + m[1] + ' ופרסום שלה.')],
  [/^default-router (\S+)/, (m) => T('Clients get ' + m[1] + ' as their default gateway.', 'Клиенты получат шлюз ' + m[1] + '.', 'הלקוחות יקבלו את ' + m[1] + ' כשער ברירת מחדל.')],
  [/^dns-server (\S+)/, (m) => T('Clients get ' + m[1] + ' as DNS server.', 'Клиенты получат DNS-сервер ' + m[1] + '.', 'הלקוחות יקבלו את ' + m[1] + ' כשרת DNS.')],
  [/^ip helper-address (\S+)/, (m) => T('DHCP relay: forward client broadcasts to the server ' + m[1] + '.', 'DHCP relay: пересылать broadcast клиентов на сервер ' + m[1] + '.', 'DHCP relay: העברת ה-broadcast של הלקוחות לשרת ' + m[1] + '.')],
  [/^router rip/, () => T('Start the RIP routing process.', 'Запустить процесс RIP.', 'הפעלת תהליך הניתוב RIP.')],
  [/^version 2/, () => T('Use RIPv2: it sends subnet masks.', 'RIPv2: передаёт маски подсетей.', 'RIPv2: שולח את מסכות הרשת.')],
  [/^no auto-summary/, () => T('Advertise real subnets, not classful summaries.', 'Объявлять настоящие подсети, а не классовые суммы.', 'פרסום תת-הרשתות האמיתיות ולא סיכום לפי מחלקה.')],
  [/^router ospf (\d+)/, (m) => T('Start OSPF process ' + m[1] + ' (the number is local).', 'Запустить OSPF, процесс ' + m[1] + ' (номер локальный).', 'הפעלת OSPF, תהליך ' + m[1] + ' (המספר מקומי).')],
  [/^router-id (\S+)/, (m) => T('OSPF router ID = ' + m[1] + '.', 'OSPF router ID = ' + m[1] + '.', 'ה-router ID של OSPF = ' + m[1] + '.')],
  [/^no passive-interface (\S+)/, (m) => T('Send Hellos/updates on ' + m[1] + ' again so the neighbor can form.', 'Снова слать Hello/обновления на ' + m[1] + ', чтобы появился сосед.', 'לשלוח שוב Hello/עדכונים ב-' + m[1] + ' כדי שתיווצר שכנות.')],
  [/^passive-interface (\S+)/, (m) => T('No Hellos/updates out of ' + m[1] + ' (LAN without routers); its network is still advertised.', 'Не слать Hello/обновления в ' + m[1] + ' (LAN без роутеров); сеть всё равно объявляется.', 'בלי Hello/עדכונים ב-' + m[1] + ' (LAN בלי נתבים); הרשת עדיין מפורסמת.')],
  [/^enable secret (\S+)/, (m) => T('Protect privileged mode with the hashed password "' + m[1] + '".', 'Защитить привилегированный режим хешированным паролем «' + m[1] + '».', 'הגנה על המצב המורשה בסיסמה מגובבת "' + m[1] + '".')],
  [/^line console 0/, () => T('Settings of the console line.', 'Настройки консольной линии.', 'הגדרות קו הקונסולה.')],
  [/^line vty (\d+) (\d+)/, (m) => T('Remote-access lines vty ' + m[1] + '–' + m[2] + ' (Telnet/SSH).', 'Линии удалённого доступа vty ' + m[1] + '–' + m[2] + ' (Telnet/SSH).', 'קווי גישה מרחוק vty ' + m[1] + '–' + m[2] + ' ‏(Telnet/SSH).')],
  [/^password (\S+)/, (m) => T('Line password "' + m[1] + '".', 'Пароль линии «' + m[1] + '».', 'סיסמת הקו "' + m[1] + '".')],
  [/^login local$/, () => T('Log in with a local username and password.', 'Вход по локальному логину и паролю.', 'כניסה עם שם משתמש וסיסמה מקומיים.')],
  [/^login$/, () => T('Ask for the line password at login.', 'Спрашивать пароль линии при входе.', 'לבקש את סיסמת הקו בכניסה.')],
  [/^transport input ssh/, () => T('Allow only SSH on these lines (no Telnet).', 'Разрешить только SSH (без Telnet).', 'לאפשר רק SSH בקווים האלה (בלי Telnet).')],
  [/^service password-encryption/, () => T('Hide plain-text passwords in the configuration.', 'Скрыть открытые пароли в конфигурации.', 'הסתרת סיסמאות גלויות בתצורה.')],
  [/^banner motd (.)(.*)\1/, (m) => T('Login warning: "' + m[2] + '".', 'Предупреждение при входе: «' + m[2] + '».', 'אזהרה בכניסה: "' + m[2] + '".')],
  [/^no ip domain-lookup/, () => T('Do not treat a mistyped command as a host name to look up.', 'Не искать опечатки в командах как имена хостов.', 'לא לחפש פקודה שגויה כאילו הייתה שם מארח.')],
  [/^ip default-gateway (\S+)/, (m) => T('The switch\'s own gateway ' + m[1] + ' — for management from other networks.', 'Шлюз самого коммутатора ' + m[1] + ' — для управления из других сетей.', 'השער של המתג עצמו ' + m[1] + ' — לניהול מרשתות אחרות.')],
  [/^ip domain-name (\S+)/, (m) => T('Domain name ' + m[1] + ' — needed to create RSA keys.', 'Доменное имя ' + m[1] + ' — нужно для RSA-ключей.', 'שם הדומיין ' + m[1] + ' — נדרש ליצירת מפתחות RSA.')],
  [/^crypto key generate rsa.*?(\d+)$/, (m) => T('Create ' + m[1] + '-bit RSA keys for SSH.', 'Создать RSA-ключи на ' + m[1] + ' бит для SSH.', 'יצירת מפתחות RSA של ' + m[1] + ' סיביות ל-SSH.')],
  [/^username (\S+) secret (\S+)/, (m) => T('Local user ' + m[1] + ' with hashed password "' + m[2] + '" (for login local).', 'Локальный пользователь ' + m[1] + ' с хешированным паролем «' + m[2] + '» (для login local).', 'משתמש מקומי ' + m[1] + ' עם סיסמה מגובבת "' + m[2] + '" (עבור login local).')],
  [/^ip ssh version 2/, () => T('Use the more secure SSH version 2.', 'Использовать более надёжный SSH версии 2.', 'שימוש ב-SSH גרסה 2 המאובטחת יותר.')],
  [/^copy running-config startup-config/, () => T('Save the configuration to NVRAM so it survives a reboot.', 'Сохранить конфигурацию в NVRAM, чтобы она пережила перезагрузку.', 'שמירת התצורה ב-NVRAM כדי שתישאר אחרי אתחול.')],
];
function cmdNote(line) {
  for (const [re, f] of CMD_NOTES) { const m = line.trim().match(re); if (m) return f(m); }
  return null;
}

// ---------- Почему это важно (по типу проверки) ----------
const CHK_INFO = {
  link: ['itn04', 'Different kinds of devices (PC–switch, switch–router) need a straight-through cable; the same kind (switch–switch, router–router, PC–PC, PC–router) needs cross-over. Use exactly the ports from the task.', 'Разным типам устройств (ПК–коммутатор, коммутатор–роутер) нужен прямой кабель; одинаковым (коммутатор–коммутатор, роутер–роутер, ПК–ПК, ПК–роутер) — перекрёстный. Порты — строго те, что в задании.', 'סוגי התקנים שונים (מחשב–מתג, מתג–נתב) צריכים כבל ישר; אותו סוג (מתג–מתג, נתב–נתב, מחשב–מחשב, מחשב–נתב) צריך כבל מוצלב. משתמשים בדיוק בפורטים שבמשימה.'],
  ifIp: ['itn10', 'Each router interface is the gateway of its own network, so it needs an address from that subnet with the right mask.', 'Каждый интерфейс роутера — шлюз своей сети, поэтому ему нужен адрес из этой подсети с правильной маской.', 'כל ממשק של נתב הוא השער של הרשת שלו, ולכן הוא צריך כתובת מתוך תת-הרשת הזו עם המסכה הנכונה.'],
  ifUp: ['itn10', 'Router interfaces stay administratively down until "no shutdown". A down interface forwards nothing.', 'Интерфейсы роутера выключены, пока не введена «no shutdown». Выключенный интерфейс ничего не передаёт.', 'ממשקי נתב כבויים עד "no shutdown". ממשק כבוי לא מעביר כלום.'],
  pc: ['itn11', 'IP and mask put the PC into its subnet. The default gateway — the router interface in that subnet — is needed to reach other networks.', 'IP и маска помещают ПК в его подсеть. Шлюз — интерфейс роутера в этой подсети — нужен, чтобы выходить в другие сети.', 'ה-IP והמסכה מכניסים את המחשב לתת-הרשת שלו. שער ברירת המחדל — ממשק הנתב באותה תת-רשת — נדרש כדי להגיע לרשתות אחרות.'],
  ping: ['itn13', 'Ping works only when the whole path works in both directions: cables, IP/mask on hosts, gateways, and routes on every router.', 'Ping проходит, только когда весь путь работает в обе стороны: кабели, IP/маска на хостах, шлюзы и маршруты на всех роутерах.', 'ping עובד רק כשכל הנתיב עובד בשני הכיוונים: כבלים, IP ומסכה במארחים, שערים ונתיבים בכל נתב.'],
  route: ['static', 'A router knows only its connected networks. Every remote network needs a static route or a routing protocol — on every router, including the way back.', 'Роутер знает только подключённые сети. Каждой удалённой сети нужен статический маршрут или протокол маршрутизации — на каждом роутере, включая обратный путь.', 'נתב מכיר רק רשתות מחוברות. כל רשת מרוחקת צריכה נתיב סטטי או פרוטוקול ניתוב — בכל נתב, כולל הדרך חזרה.'],
  defaultRoute: ['static', 'A default route 0.0.0.0/0 sends traffic for all unknown networks to one next hop, usually toward the provider.', 'Маршрут по умолчанию 0.0.0.0/0 отправляет трафик во все неизвестные сети на один next hop, обычно к провайдеру.', 'נתיב ברירת מחדל 0.0.0.0/0 שולח תעבורה לכל הרשתות הלא מוכרות ל-next hop אחד, בדרך כלל לכיוון הספק.'],
  vlan: ['vlan', 'A VLAN must exist on the switch before its ports can use it.', 'VLAN должен существовать на коммутаторе, прежде чем порты смогут его использовать.', 'ה-VLAN חייב להיות קיים במתג לפני שפורטים יכולים להשתמש בו.'],
  access: ['vlan', 'A PC is in whatever VLAN its switch port is in. An access port belongs to exactly one VLAN.', 'ПК находится в том VLAN, в котором его порт коммутатора. Access-порт принадлежит ровно одному VLAN.', 'מחשב נמצא באותו VLAN של פורט המתג שלו. פורט access שייך ל-VLAN אחד בדיוק.'],
  trunk: ['vlan', 'A link that must carry several VLANs (switch–switch or to router-on-a-stick) has to be a trunk.', 'Канал, который несёт несколько VLAN (коммутатор–коммутатор или к router-on-a-stick), должен быть trunk.', 'קישור שצריך לשאת כמה VLAN (מתג–מתג או ל-router-on-a-stick) חייב להיות trunk.'],
  native: ['vlan', 'The native VLAN crosses the trunk untagged and must match on both ends.', 'Native VLAN идёт по trunk без тега и должен совпадать на обоих концах.', 'ה-native VLAN עובר ב-trunk בלי תג וחייב להיות זהה בשני הצדדים.'],
  subif: ['intervlan', 'In router-on-a-stick every VLAN gets a subinterface: "encapsulation dot1Q" ties it to the VLAN, and its IP is that VLAN\'s gateway.', 'В router-on-a-stick у каждого VLAN свой подынтерфейс: «encapsulation dot1Q» привязывает его к VLAN, а его IP — шлюз этого VLAN.', 'ב-router-on-a-stick לכל VLAN יש תת-ממשק: "encapsulation dot1Q" קושר אותו ל-VLAN, וכתובת ה-IP שלו היא השער של ה-VLAN.'],
  dhcpPool: ['dhcp', 'The pool says which network to lease from and which gateway and DNS the clients receive.', 'Пул определяет, из какой сети раздавать адреса и какой шлюз и DNS получат клиенты.', 'המאגר קובע מאיזו רשת מחלקים כתובות ואיזה שער ו-DNS הלקוחות מקבלים.'],
  excluded: ['dhcp', 'Excluded addresses are never leased — keep the router\'s and servers\' static addresses out of the pool.', 'Исключённые адреса не раздаются — так статические адреса роутера и серверов не попадут клиентам.', 'כתובות מוחרגות לא מחולקות — כך הכתובות הסטטיות של הנתב והשרתים לא יגיעו ללקוחות.'],
  dhcpClient: ['dhcp', 'The PC must be set to DHCP and the server must answer. 169.254.x.x means no DHCP answer came.', 'ПК должен быть в режиме DHCP, а сервер должен отвечать. 169.254.x.x — ответ DHCP не пришёл.', 'המחשב חייב להיות במצב DHCP והשרת חייב לענות. ‏169.254.x.x פירושו שלא הגיעה תשובת DHCP.'],
  helper: ['dhcp', 'DHCP Discover is a broadcast and does not cross routers. "ip helper-address" on the clients\' gateway relays it to the server.', 'DHCP Discover — broadcast и не проходит роутер. «ip helper-address» на шлюзе клиентов пересылает его серверу.', 'DHCP Discover הוא broadcast ולא עובר נתבים. ‏"ip helper-address" בשער של הלקוחות מעביר אותו לשרת.'],
  ripV2: ['rip', 'RIPv2 sends subnet masks; "no auto-summary" keeps real subnets instead of classful summaries.', 'RIPv2 передаёт маски; «no auto-summary» сохраняет настоящие подсети вместо классовых сумм.', 'RIPv2 שולח מסכות; ‏"no auto-summary" שומר על תת-הרשתות האמיתיות במקום סיכום לפי מחלקה.'],
  passive: ['ospf', 'A passive interface sends no Hellos or updates (a LAN without routers), but its network is still advertised.', 'Пассивный интерфейс не шлёт Hello и обновления (LAN без роутеров), но его сеть всё равно объявляется.', 'ממשק פסיבי לא שולח Hello ועדכונים (LAN בלי נתבים), אבל הרשת שלו עדיין מפורסמת.'],
  routerId: ['ospf', 'The router ID names the OSPF router. A changed ID takes effect after "clear ip ospf process" or a reload.', 'Router ID — имя роутера в OSPF. Новый ID действует после «clear ip ospf process» или перезагрузки.', 'ה-router ID הוא השם של הנתב ב-OSPF. ‏ID חדש נכנס לתוקף אחרי "clear ip ospf process" או אתחול.'],
  ospfNbrs: ['ospf', 'OSPF neighbors need the same subnet and mask, the same area, non-passive interfaces and a network statement that covers the link.', 'Соседям OSPF нужны одинаковые подсеть и маска, одна area, непассивные интерфейсы и команда network, покрывающая канал.', 'שכני OSPF צריכים אותה תת-רשת ומסכה, אותו area, ממשקים לא פסיביים ופקודת network שמכסה את הקישור.'],
  hostname: ['itn02', 'A unique hostname identifies the device in the prompt and in logs.', 'Уникальное имя видно в приглашении и логах.', 'שם ייחודי מזהה את ההתקן בסמן וביומנים.'],
  enableSecret: ['itn02', '"enable secret" protects privileged mode with a hashed password.', '«enable secret» защищает привилегированный режим хешированным паролем.', '"enable secret" מגן על המצב המורשה בסיסמה מגובבת.'],
  linePw: ['itn02', 'A line password plus "login" protects console or remote access.', 'Пароль линии плюс «login» защищают консоль или удалённый доступ.', 'סיסמת קו יחד עם "login" מגינות על הקונסולה או על הגישה מרחוק.'],
  banner: ['itn02', 'The MOTD banner is a legal warning shown before login.', 'Баннер MOTD — юридическое предупреждение перед входом.', 'באנר MOTD הוא אזהרה משפטית לפני הכניסה.'],
  encryption: ['itn02', 'Hides plain-text passwords from anyone reading the configuration.', 'Прячет открытые пароли от того, кто читает конфигурацию.', 'מסתיר סיסמאות גלויות ממי שקורא את התצורה.'],
  noLookup: ['itn10', 'Stops the device from treating a mistyped command as a host name (no long wait).', 'Устройство не будет искать опечатку как имя хоста (без долгого ожидания).', 'ההתקן לא ינסה לחפש פקודה שגויה כשם מארח (בלי המתנה ארוכה).'],
  saved: ['itn02', 'Changes live in RAM (running-config) until saved to NVRAM (startup-config).', 'Изменения живут в RAM (running-config), пока не сохранены в NVRAM (startup-config).', 'השינויים נמצאים ב-RAM ‏(running-config) עד ששומרים אותם ב-NVRAM ‏(startup-config).'],
  svi: ['itn02', 'A Layer 2 switch gets its management IP on "interface vlan 1", and that interface must be up.', 'Коммутатор 2-го уровня получает IP для управления на «interface vlan 1», и этот интерфейс должен быть включён.', 'מתג שכבה 2 מקבל כתובת ניהול ב-"interface vlan 1", והממשק הזה חייב להיות פעיל.'],
  swGateway: ['itn10', 'The switch needs a default gateway to answer management traffic from other networks.', 'Коммутатору нужен шлюз, чтобы отвечать на управление из других сетей.', 'המתג צריך שער ברירת מחדל כדי לענות לתעבורת ניהול מרשתות אחרות.'],
  ssh: ['itn16', 'SSH needs a domain name, RSA keys, a local user, and vty lines with "login local" and "transport input ssh".', 'Для SSH нужны доменное имя, RSA-ключи, локальный пользователь и линии vty с «login local» и «transport input ssh».', 'SSH צריך שם דומיין, מפתחות RSA, משתמש מקומי וקווי vty עם "login local" ו-"transport input ssh".'],
};

// ---------- Как исправить (по типу проверки, с данными задания) ----------
const fxCli = (dev, lines) => ({ dev, via: 'cli', lines: lines.filter(Boolean) });
const fxGui = (dev, lines) => ({ dev, via: 'gui', lines: lines.filter(Boolean) });
const fxSol = (devs, re, fallback) => ({ sol: { devs, re }, fallback });
const CHK_FIX = {
  link: (a, ap, b, bp) => [{ cable: [a, ap, b, bp] }],
  ifIp: (dev, ifn, ip, mask) => [fxCli(dev, ['interface ' + ifn, 'ip address ' + ip + ' ' + mask, 'no shutdown'])],
  ifUp: (dev, ifn) => [fxCli(dev, ['interface ' + ifn, 'no shutdown'])],
  pc: (dev, ip, mask, gw) => [fxGui(dev, ['Desktop → IP Configuration → Static', 'IPv4 Address: ' + ip, 'Subnet Mask: ' + mask, gw ? 'Default Gateway: ' + gw : null])],
  ping: (a, b, ip, expect = true) => [{ ping: [a, b, ip, expect] }],
  route: (dev, net, len, code) => [code === 'S' ? fxSol([dev], /^(no )?ip route /) : code === 'R' ? fxSol([dev], /^router rip/) : fxSol([dev], /^router ospf/)],
  defaultRoute: (dev) => [fxSol([dev], /^ip route 0\.0\.0\.0 0\.0\.0\.0/)],
  vlan: (sw, id, name) => [fxCli(sw, ['vlan ' + id, name ? 'name ' + name : null])],
  access: (sw, port, vlan) => [fxCli(sw, ['interface ' + port, 'switchport mode access', 'switchport access vlan ' + vlan])],
  trunk: (sw, port) => [fxCli(sw, ['interface ' + port, 'switchport mode trunk'])],
  native: (sw, port, vlan) => [fxCli(sw, ['interface ' + port, 'switchport trunk native vlan ' + vlan])],
  subif: (dev, ifn, vlan, ip, mask) => [fxCli(dev, ['interface ' + ifn, 'encapsulation dot1Q ' + vlan, 'ip address ' + ip + ' ' + mask])],
  dhcpPool: (dev, name, net, mask, gw, dns) => [fxCli(dev, ['ip dhcp pool ' + name, 'network ' + net + ' ' + mask, 'default-router ' + gw, dns ? 'dns-server ' + dns : null])],
  excluded: (dev, s, e) => [fxCli(dev, ['ip dhcp excluded-address ' + s + ' ' + e])],
  dhcpClient: (pc) => [fxGui(pc, ['Desktop → IP Configuration → DHCP', 'Desktop → Command Prompt → ipconfig /renew'])],
  helper: (dev, ifn, ip) => [fxCli(dev, ['interface ' + ifn, 'ip helper-address ' + ip])],
  ripV2: (dev) => [fxCli(dev, ['router rip', 'version 2', 'no auto-summary'])],
  passive: (dev, proto, ifn) => [fxSol([dev], /passive-interface/, fxCli(dev, [proto === 'rip' ? 'router rip' : 'router ospf 1', 'passive-interface ' + ifn]))],
  routerId: (dev, rid) => [fxSol([dev], /^router-id/, fxCli(dev, ['router ospf 1', 'router-id ' + rid]))],
  ospfNbrs: () => [fxSol(null, /^router ospf/)],
  hostname: (dev, name) => [fxCli(dev, ['hostname ' + name])],
  enableSecret: (dev, pw) => [fxCli(dev, ['enable secret ' + pw])],
  linePw: (dev, line, pw) => [fxCli(dev, [line === 'con' ? 'line console 0' : 'line vty 0 4', 'password ' + pw, 'login'])],
  banner: (dev, text) => [fxCli(dev, ['banner motd #' + text + '#'])],
  encryption: (dev) => [fxCli(dev, ['service password-encryption'])],
  noLookup: (dev) => [fxCli(dev, ['no ip domain-lookup'])],
  saved: (dev) => [{ dev, via: 'exec', lines: ['copy running-config startup-config'] }],
  svi: (dev, ip, mask) => [fxCli(dev, ['interface vlan 1', 'ip address ' + ip + ' ' + mask, 'no shutdown'])],
  swGateway: (dev, gw) => [fxCli(dev, ['ip default-gateway ' + gw])],
  ssh: (dev, user, domain) => [fxSol([dev], /^(ip domain-name|crypto key|username|ip ssh|line vty)/, fxCli(dev, ['ip domain-name ' + domain, 'crypto key generate rsa general-keys modulus 1024', 'username ' + user + ' secret <password>', 'line vty 0 4', 'login local', 'transport input ssh']))],
};

// Помечаем проверки типом и аргументами, чтобы потом объяснить их.
for (const k of Object.keys(CHK)) {
  const make = CHK[k];
  CHK[k] = (...args) => Object.assign(make(...args), { kind: k, args });
}

// Строки решения, относящиеся к проверке: блоки «режим + команды внутри» (interface …, router …, vlan …).
const SUBMODE_RE = /^(interface |vlan \d|router |ip dhcp pool |line )/;
const CHILD_RE = /^(no )?(ip address|shutdown|description|switchport|encapsulation|ip helper-address|name |network |default-router|dns-server|version|auto-summary|passive-interface|router-id|default-information|password|login|transport|exec-timeout|ipv6 address|ip ospf|bandwidth|duplex|speed|lease)/;
function solExtract(task, devs, re) {
  const out = [];
  for (const [dev, cmds] of Object.entries((task.solution && task.solution.cli) || {})) {
    if (devs && !devs.includes(dev)) continue;
    const lines = [];
    let parent = null, parentIn = false, pushed = false;
    for (const c of cmds) {
      if (SUBMODE_RE.test(c)) { parent = c; parentIn = re.test(c); pushed = parentIn; if (parentIn) lines.push(c); continue; }
      if (c === 'exit' || c === 'end') { parent = null; parentIn = false; continue; }
      if (!(parent && CHILD_RE.test(c))) { parent = null; parentIn = false; if (re.test(c)) lines.push(c); continue; }
      if (parentIn || re.test(c)) { if (!pushed) { lines.push(parent); pushed = true; } lines.push(c); }
    }
    if (lines.length) out.push({ dev, via: 'cli', lines });
  }
  return out;
}

const VIA = { cli: T('CLI', 'CLI', 'CLI'), gui: T('Desktop', 'Desktop', 'Desktop'), cable: T('Cable', 'Кабель', 'כבל'), exec: T('CLI, privileged mode (#)', 'CLI, режим #', 'CLI, מצב #'), note: T('Tip', 'Совет', 'טיפ') };

// Полный разбор неудачной проверки: {why, lesson, fix:[{dev, via, lines:[{text, note}]}]}
function checkDetails(check, task, topo) {
  if (!check || !check.kind) return null;
  let info = CHK_INFO[check.kind];
  if (check.kind === 'link') { // кабель верный, но порт выключен — объясняем про no shutdown
    const [a, ap, b, bp] = check.args, l = findLinkBetween(topo, a, ap, b, bp);
    if (l && linkCableOk(topo, l) && !portPhysUp(topo, l.a.dev, l.a.port)) info = CHK_INFO.ifUp;
  }
  const raw = CHK_FIX[check.kind] ? CHK_FIX[check.kind](...check.args) : [];
  const blocks = [];
  for (const f of raw) {
    if (f.cable) {
      const [a, ap, b, bp] = f.cable;
      const l = findLinkBetween(topo, a, ap, b, bp);
      const off = l && linkCableOk(topo, l) ? [[a, ap], [b, bp]].filter(([d, p]) => { const ic = topo.devices[d].cfg.interfaces && topo.devices[d].cfg.interfaces[p]; return ic && ic.shutdown; }) : [];
      if (off.length) for (const [d, p] of off) blocks.push(fxCli(d, ['interface ' + p, 'no shutdown'])); // кабель верный — просто выключен порт
      else blocks.push({ dev: a + ' ↔ ' + b, via: 'cable', lines: ['Connections (⚡) → ' + cableName(topo, a, b), a + ': ' + ap, b + ': ' + bp] });
    } else if (f.ping) {
      const [a, , ip, expect] = f.ping;
      if (task.faults && task.solution && task.solution.cli) blocks.push(...solExtract(task, null, /./));
      else blocks.push({ dev: a, via: 'note', lines: [expect ? T('Fix the red items above first — then ping works by itself.', 'Сначала исправьте красные пункты выше — тогда ping заработает сам.', 'קודם מתקנים את הסעיפים האדומים למעלה — ואז ה-ping יעבוד לבד.') : T('Put the devices into different VLANs or networks so they are isolated.', 'Разнесите устройства по разным VLAN или сетям, чтобы изолировать их.', 'מפרידים את ההתקנים ל-VLAN או לרשתות שונות כדי לבודד אותם.')] });
      blocks.push({ dev: a, via: 'gui', lines: ['Desktop → Command Prompt → ping ' + ip] });
    } else if (f.sol) {
      const got = solExtract(task, f.sol.devs, f.sol.re);
      if (got.length) blocks.push(...got); else if (f.fallback) blocks.push(f.fallback);
    } else blocks.push(f);
  }
  return {
    why: info ? T(info[1], info[2], info[3]) : null,
    lesson: info ? info[0] : null,
    fix: blocks.map((b) => ({ dev: b.dev, via: b.via, viaLabel: VIA[b.via] || VIA.cli, lines: b.lines.map((l) => (typeof l === 'string' ? { text: l, note: b.via === 'cli' || b.via === 'exec' ? cmdNote(l) : null } : { text: null, note: l })) })),
  };
}

// ---------- Пошаговое решение ----------
const CLI_TOPICS = [
  [/^interface .*\.\d|^encapsulation/, T('subinterfaces', 'подынтерфейсы', 'תת-ממשקים')],
  [/^(interface|ip address|no shutdown)/, T('interfaces', 'интерфейсы', 'ממשקים')],
  [/ip route/, T('static routes', 'статические маршруты', 'נתיבים סטטיים')],
  [/^(vlan|name |switchport access|switchport mode access)/, T('VLANs and access ports', 'VLAN и access-порты', 'VLAN ופורטי access')],
  [/^switchport (mode trunk|trunk)/, T('trunk', 'trunk', 'trunk')],
  [/dhcp|default-router|dns-server|helper/, T('DHCP', 'DHCP', 'DHCP')],
  [/^router ospf|area|router-id/, T('OSPF', 'OSPF', 'OSPF')],
  [/^router rip|^version|auto-summary/, T('RIP', 'RIP', 'RIP')],
  [/passive-interface/, T('passive interfaces', 'пассивные интерфейсы', 'ממשקים פסיביים')],
  [/^(hostname|enable secret|line |password|login|banner|service password|no ip domain-lookup)/, T('basic settings and passwords', 'базовые настройки и пароли', 'הגדרות בסיס וסיסמאות')],
  [/^(ip domain-name|crypto|username|ip ssh|transport)/, T('SSH', 'SSH', 'SSH')],
  [/^ip default-gateway/, T('switch gateway', 'шлюз коммутатора', 'שער המתג')],
];
function cliTopics(cmds) {
  const out = [];
  for (const [re, t] of CLI_TOPICS) if (cmds.some((c) => re.test(c)) && !out.includes(t)) out.push(t);
  return out;
}
const joinT = (arr) => T(arr.map((t) => t.en).join(', '), arr.map((t) => t.ru).join(', '), arr.map((t) => t.he).join(', '));

function linkStep(a, ap, b, bp, relink) {
  return {
    kind: 'cable',
    title: T((relink ? 'Re-cable ' : 'Connect ') + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp), (relink ? 'Переподключить ' : 'Соединить ') + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp), (relink ? 'חיבור מחדש ' : 'חיבור ') + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp)),
    explain(topo) {
      const cross = correctCable(topo.devices[a], topo.devices[b]) === 'cross';
      return cross ? T(a + ' and ' + b + ' are the same kind of device for cabling → Copper Cross-Over.', a + ' и ' + b + ' — однотипные для кабеля устройства → перекрёстный (Copper Cross-Over).', a + ' ו-' + b + ' הם התקנים מאותו סוג מבחינת כבילה → כבל מוצלב (Copper Cross-Over).')
        : T(a + ' and ' + b + ' are different kinds of devices → Copper Straight-Through.', a + ' и ' + b + ' — разные типы устройств → прямой кабель (Copper Straight-Through).', a + ' ו-' + b + ' הם סוגי התקנים שונים → כבל ישר (Copper Straight-Through).');
    },
    lines(topo) { return [{ via: 'cable', dev: a + ' ↔ ' + b, lines: ['Connections (⚡) → ' + cableName(topo, a, b), a + ': ' + ap, b + ': ' + bp].map((x) => ({ text: x, note: null })) }]; },
    apply(topo) {
      if (relink) { const l = findLinkBetween(topo, a, ap, b, bp); if (l) removeLink(topo, l.id); }
      if (!findLinkBetween(topo, a, ap, b, bp)) {
        for (const [d, p] of [[a, ap], [b, bp]]) { const port = getPort(topo.devices[d], p); if (port && port.link) removeLink(topo, port.link); }
        addLink(topo, a, ap, b, bp, 'auto');
      }
      netCommit(topo);
    },
  };
}

// Шаги решения задания: кабели → CLI по устройствам → сохранение → ПК. Применение всех шагов = эталонное решение.
function taskSolutionSteps(task) {
  const s = task.solution || {};
  const steps = [];
  if (task.faults && task.faults.length) {
    steps.push({
      kind: 'diagnose',
      title: T('Find what is broken', 'Найти, что сломано', 'למצוא מה תקול'),
      explain: () => T(task.faults.map((f) => f.en).join(' '), task.faults.map((f) => f.ru).join(' '), task.faults.map((f) => f.he || f.en).join(' ')),
      lines: () => [{ via: 'note', dev: '', lines: task.steps.slice(0, 1).map((t) => ({ text: null, note: t })) }],
      apply() {},
    });
  }
  for (const [a, ap, b, bp] of s.relink || []) steps.push(linkStep(a, ap, b, bp, true));
  for (const [a, ap, b, bp] of s.links || []) steps.push(linkStep(a, ap, b, bp, false));
  for (const [d, cmds] of Object.entries(s.cli || {})) {
    const topics = cliTopics(cmds);
    steps.push({
      kind: 'cli', dev: d,
      title: T(d + ' — CLI: ' + joinT(topics).en, d + ' — CLI: ' + joinT(topics).ru, d + ' — CLI: ' + joinT(topics).he),
      explain: () => T('Click ' + d + ' → CLI. Each line is explained on the right.', 'Кликните ' + d + ' → CLI. Каждая строка объяснена справа.', 'לוחצים על ' + d + ' → CLI. כל שורה מוסברת בצד.'),
      lines: () => [{ via: 'cli', dev: d, lines: ['enable', 'configure terminal', ...cmds, 'end'].map((c) => ({ text: c, note: cmdNote(c) })) }],
      apply(topo) { iosRunConfig(topo, d, cmds); netCommit(topo); },
    });
  }
  for (const [d, cmds] of Object.entries(s.exec || {})) {
    steps.push({
      kind: 'exec', dev: d,
      title: T(d + ' — save the configuration', d + ' — сохранить конфигурацию', d + ' — שמירת התצורה'),
      explain: () => T('Run in privileged mode (#).', 'Выполняется в привилегированном режиме (#).', 'מריצים במצב privileged ‏(#).'),
      lines: () => [{ via: 'exec', dev: d, lines: cmds.map((c) => ({ text: c, note: cmdNote(c) })) }],
      apply(topo) {
        const sess = iosNewSession(topo, d); sess.started = true; sess.mode = 'priv';
        for (const c of cmds) { iosExec(topo, sess, c); if (sess.pending) iosExec(topo, sess, ''); }
        netCommit(topo);
      },
    });
  }
  for (const [d, v] of Object.entries(s.pc || {})) {
    steps.push({
      kind: 'pc', dev: d,
      title: v.dhcp ? T(d + ' — get an address by DHCP', d + ' — получить адрес по DHCP', d + ' — קבלת כתובת ב-DHCP') : T(d + ' — IP settings', d + ' — IP-настройки', d + ' — הגדרות IP'),
      explain() {
        if (v.dhcp) return T('The PC asks the server: Discover → Offer → Request → Ack.', 'ПК спрашивает сервер: Discover → Offer → Request → Ack.', 'המחשב שואל את השרת: Discover → Offer → Request → Ack.');
        const net = intToIp(netOf(v.ip, maskToLen(v.mask))) + '/' + maskToLen(v.mask);
        return v.gw ? T(d + ' joins ' + net + '. Its gateway ' + v.gw + ' is the router interface in the same subnet.', d + ' входит в сеть ' + net + '. Шлюз ' + v.gw + ' — интерфейс роутера в той же подсети.', d + ' מצטרף לרשת ' + net + '. השער ' + v.gw + ' הוא ממשק הנתב באותה תת-רשת.')
          : T(d + ' joins ' + net + '. No gateway is needed inside one LAN.', d + ' входит в сеть ' + net + '. Внутри одной LAN шлюз не нужен.', d + ' מצטרף לרשת ' + net + '. בתוך LAN אחת לא צריך שער.');
      },
      lines: () => [{ via: 'gui', dev: d, lines: (v.dhcp ? ['Desktop → IP Configuration → DHCP'] : ['Desktop → IP Configuration → Static', 'IPv4 Address: ' + v.ip, 'Subnet Mask: ' + v.mask, v.gw ? 'Default Gateway: ' + v.gw : null].filter(Boolean)).map((x) => ({ text: x, note: null })) }],
      apply(topo) {
        if (v.dhcp) { topo.devices[d].cfg.ipMode = 'dhcp'; pcDhcpRenew(topo, d); } else tPc(topo, d, v.ip, v.mask, v.gw);
        netCommit(topo);
      },
    });
  }
  const pings = task.checks.filter((c) => c.kind === 'ping');
  if (pings.length) {
    steps.push({
      kind: 'verify',
      title: T('Verify with ping', 'Проверить ping', 'בדיקה עם ping'),
      explain: () => T('If every step above is right, the pings succeed.', 'Если все шаги выше верны, ping проходит.', 'אם כל הצעדים למעלה נכונים, ה-ping מצליח.'),
      lines: () => [{ via: 'gui', dev: pings[0].args[0], lines: pings.slice(0, 4).map((c) => ({ text: c.args[0] + '> ping ' + c.args[2] + (c.args[3] === false ? '   (must fail)' : ''), note: null })) }],
      apply() {},
    });
  }
  return steps;
}
