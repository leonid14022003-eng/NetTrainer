'use strict';
// Подсказки под командной строкой IOS: что за режим, какие команды обычно идут дальше,
// и что значит последнее сообщение IOS (ошибки — на трёх языках).

const CLI_MODE_INFO = {
  user: T('User EXEC (>) — you can only look: ping, show. Type "enable" to get more rights.', 'Пользовательский режим (>) — можно только смотреть: ping, show. Введите «enable», чтобы получить больше прав.', 'מצב User EXEC ‏(>) — אפשר רק להסתכל: ping, ‏show. מקלידים "enable" כדי לקבל יותר הרשאות.'),
  priv: T('Privileged EXEC (#) — all show commands, saving, reload. "configure terminal" starts configuring.', 'Привилегированный режим (#) — все show, сохранение, перезагрузка. «configure terminal» — начать настройку.', 'מצב Privileged EXEC ‏(#) — כל פקודות show, שמירה ואתחול. "configure terminal" מתחיל הגדרה.'),
  config: T('Global configuration (config) — settings for the whole device. Enter an interface, a routing process, a VLAN or a line from here.', 'Глобальная конфигурация (config) — настройки всего устройства. Отсюда входят в интерфейс, процесс маршрутизации, VLAN или линию.', 'תצורה גלובלית (config) — הגדרות לכל ההתקן. מכאן נכנסים לממשק, לתהליך ניתוב, ל-VLAN או לקו.'),
  if: T('Interface configuration (config-if) — commands apply to the interface you entered.', 'Настройка интерфейса (config-if) — команды действуют на выбранный интерфейс.', 'הגדרת ממשק (config-if) — הפקודות חלות על הממשק שנבחר.'),
  subif: T('Subinterface (config-subif) — first "encapsulation dot1Q <vlan>", then the IP address.', 'Подынтерфейс (config-subif) — сначала «encapsulation dot1Q <vlan>», потом IP-адрес.', 'תת-ממשק (config-subif) — קודם "encapsulation dot1Q <vlan>", ואחר כך כתובת IP.'),
  range: T('Interface range (config-if-range) — one command configures all ports of the range.', 'Диапазон интерфейсов (config-if-range) — одна команда настраивает все порты диапазона.', 'טווח ממשקים (config-if-range) — פקודה אחת מגדירה את כל הפורטים בטווח.'),
  'router-rip': T('RIP process (config-router) — version 2, no auto-summary, network <classful network>.', 'Процесс RIP (config-router) — version 2, no auto-summary, network <классовая сеть>.', 'תהליך RIP ‏(config-router) — version 2, ‏no auto-summary, ‏network <רשת לפי מחלקה>.'),
  'router-ospf': T('OSPF process (config-router) — router-id, network <address> <wildcard> area <n>, passive-interface.', 'Процесс OSPF (config-router) — router-id, network <адрес> <wildcard> area <n>, passive-interface.', 'תהליך OSPF ‏(config-router) — router-id, ‏network <כתובת> <wildcard> area <n>, ‏passive-interface.'),
  dhcp: T('DHCP pool (dhcp-config) — network, default-router, dns-server.', 'DHCP-пул (dhcp-config) — network, default-router, dns-server.', 'מאגר DHCP ‏(dhcp-config) — network, ‏default-router, ‏dns-server.'),
  line: T('Line configuration (config-line) — password, login, transport input.', 'Настройка линии (config-line) — password, login, transport input.', 'הגדרת קו (config-line) — password, ‏login, ‏transport input.'),
  mst: T('MST region (config-mst) — name, revision, instance <n> vlan <list>; the changes apply on exit (abort cancels them).', 'Регион MST (config-mst) — name, revision, instance <n> vlan <список>; изменения вступают в силу при exit (abort — отменить).', 'אזור MST ‏(config-mst) — ‏name, ‏revision, ‏instance <n> vlan <רשימה>; השינויים נכנסים לתוקף ב-exit ‏(abort מבטל).'),
  vlan: T('VLAN configuration (config-vlan) — give the VLAN a name, then exit.', 'Настройка VLAN (config-vlan) — задайте имя VLAN и выйдите (exit).', 'הגדרת VLAN ‏(config-vlan) — נותנים שם ל-VLAN ויוצאים (exit).'),
  'std-nacl': T('Named standard ACL (config-std-nacl) — permit/deny <source> [wildcard]; "15 deny host …" inserts a numbered line, "no 10" deletes one.', 'Именованный стандартный ACL (config-std-nacl) — permit/deny <источник> [wildcard]; "15 deny host …" вставляет строку с номером, "no 10" удаляет.', 'ACL סטנדרטי עם שם (config-std-nacl) — ‏permit/deny <מקור> [wildcard]; ‏"15 deny host …" מכניס שורה ממוספרת, ‏"no 10" מוחק.'),
  'ext-nacl': T('Named extended ACL (config-ext-nacl) — permit/deny <protocol> <source> <destination> [eq <port>]; numbers insert, "no <n>" deletes.', 'Именованный расширенный ACL (config-ext-nacl) — permit/deny <протокол> <источник> <назначение> [eq <порт>]; номера вставляют, "no <n>" удаляет.', 'ACL מורחב עם שם (config-ext-nacl) — ‏permit/deny <פרוטוקול> <מקור> <יעד> [eq <פורט>]; מספרים מכניסים, ‏"no <n>" מוחק.'),
  start: T('Press Enter to start the console session.', 'Нажмите Enter, чтобы начать сеанс консоли.', 'לוחצים Enter כדי להתחיל את חיבור הקונסולה.'),
  pending: T('IOS is waiting for an answer: a password, or Enter to confirm.', 'IOS ждёт ответа: пароль или Enter для подтверждения.', 'IOS מחכה לתשובה: סיסמה, או Enter לאישור.'),
};

// Сообщения IOS → объяснение. kind: err — ошибка, info — полезно знать, ok — всё хорошо.
const CLI_MESSAGES = [
  [/% Invalid access list name/, 'err', T('A named ACL must start with a letter (a pure number is a numbered ACL: 1–99 standard, 100–199 extended).', 'Имя ACL должно начинаться с буквы (просто число — это нумерованный ACL: 1–99 стандартный, 100–199 расширенный).', 'שם של ACL חייב להתחיל באות (מספר בלבד הוא ACL ממוספר: 1–99 סטנדרטי, 100–199 מורחב).')],
  [/% Connection refused by remote host/, 'err', T('The router answered but refused the login: an access-class on its vty lines does not permit you, or the protocol is not allowed by "transport input".', 'Роутер ответил, но отказал во входе: access-class на его линиях vty вас не разрешает, или протокол не разрешён в "transport input".', 'הנתב ענה אבל סירב לכניסה: ‏access-class בקווי ה-vty שלו לא מתיר אתכם, או שהפרוטוקול לא מותר ב-"transport input".')],
  [/% Connection timed out; remote host not responding/, 'err', T('No answer at all: the address is unreachable — or an ACL on the path drops the packets.', 'Ответа нет совсем: адрес недостижим — или ACL на пути отбрасывает пакеты.', 'אין תשובה בכלל: הכתובת לא נגישה — או ש-ACL בדרך זורק את החבילות.')],
  [/Password required, but none set/, 'err', T('The vty lines have "login" but no password: set "password <pw>" under "line vty 0 4" (or use "login local" with a username).', 'На линиях vty есть "login", но нет пароля: задайте "password <пароль>" в "line vty 0 4" (или "login local" с пользователем).', 'בקווי ה-vty יש "login" אבל אין סיסמה: מגדירים "password <סיסמה>" תחת "line vty 0 4" (או "login local" עם משתמש).')],
  [/% No password set/, 'err', T('Over Telnet/SSH "enable" needs an enable secret (or enable password) on the router.', 'Через Telnet/SSH для "enable" на роутере нужен enable secret (или enable password).', 'דרך Telnet/SSH, ‏"enable" דורש enable secret (או enable password) בנתב.')],
  [/%Start and end addresses on different subnets|%End address less than start address/, 'err', T('The NAT pool range is wrong: both addresses must be in one subnet of the given netmask, start ≤ end.', 'Неверный диапазон пула NAT: оба адреса в одной подсети заданной маски, начало ≤ конец.', 'טווח מאגר ה-NAT שגוי: שתי הכתובות באותה תת-רשת של המסכה, התחלה ≤ סוף.')],
  [/% Invalid input detected/, 'err', T('IOS did not understand the word under the ^ mark: a typo, or this command does not exist in this mode. Look at the prompt — (config)# and (config-if)# accept different commands. Type ? to see what is allowed here.', 'IOS не понял слово под знаком ^: опечатка или такой команды нет в этом режиме. Посмотрите на приглашение — (config)# и (config-if)# принимают разные команды. Наберите ?, чтобы увидеть, что здесь можно.', 'IOS לא הבין את המילה שמתחת לסימן ^: שגיאת הקלדה, או שהפקודה לא קיימת במצב הזה. שימו לב לסמן — (config)# ו-(config-if)# מקבלים פקודות שונות. מקלידים ? כדי לראות מה מותר כאן.')],
  [/% Incomplete command/, 'err', T('The command is not finished — something is missing at the end. Type the command, a space and ? to see what comes next.', 'Команда не закончена — в конце чего-то не хватает. Наберите команду, пробел и ?, чтобы увидеть продолжение.', 'הפקודה לא גמורה — חסר משהו בסוף. מקלידים את הפקודה, רווח ו-? כדי לראות מה בא אחר כך.')],
  [/% Ambiguous command/, 'err', T('The abbreviation fits several commands. Type a few more letters (for example "con" → "conf").', 'Сокращение подходит к нескольким командам. Допишите ещё пару букв (например, «con» → «conf»).', 'הקיצור מתאים לכמה פקודות. מוסיפים עוד כמה אותיות (למשל "con" → "conf").')],
  [/% Unknown command or computer name/, 'err', T('IOS took this word for a host name and tried to connect to it. Most likely a typo in a command. Tip: "no ip domain-lookup" stops the long DNS wait.', 'IOS принял слово за имя хоста и пытался к нему подключиться. Скорее всего, опечатка в команде. Совет: «no ip domain-lookup» убирает долгое ожидание DNS.', 'IOS חשב שהמילה היא שם של מארח וניסה להתחבר אליו. כנראה שגיאת הקלדה בפקודה. טיפ: "no ip domain-lookup" מבטל את ההמתנה הארוכה ל-DNS.')],
  [/%PM-4-ERR_DISABLE: psecure-violation/, 'err', T('Port Security switched the port off (err-disabled): a MAC that is not allowed sent traffic and the limit was full. Remove the foreign device first, then "shutdown" and "no shutdown" on the port. "show port-security interface" shows the violator in "Last Source Address".',
    'Port Security выключил порт (err-disabled): прислал трафик неразрешённый MAC, а лимит уже заполнен. Сначала уберите чужое устройство, потом на порту "shutdown" и "no shutdown". В "show port-security interface" нарушитель виден в "Last Source Address".',
    'Port Security כיבה את הפורט (err-disabled): MAC לא מורשה שלח תעבורה כשהמכסה כבר מלאה. קודם מנתקים את ההתקן הזר, ואז בפורט "shutdown" ו-"no shutdown". ב-"show port-security interface" רואים את המפר ב-"Last Source Address".')],
  [/%PORT_SECURITY-2-PSECURE_VIOLATION/, 'err', T('Security violation: a frame came from a MAC that is not in the allowed list while the port is full. In "restrict" mode the frame is dropped and logged, the port keeps working for the allowed devices.',
    'Нарушение Port Security: кадр пришёл с MAC, которого нет в списке, а лимит заполнен. В режиме "restrict" кадр отброшен и записан в журнал, порт продолжает работать для разрешённых устройств.',
    'הפרת Port Security: מסגרת הגיעה מ-MAC שאינו ברשימה והפורט מלא. במצב "restrict" המסגרת נזרקת ונרשמת ביומן, והפורט ממשיך לעבוד להתקנים המורשים.')],
  [/Command rejected: .* is a (dynamic|trunk) port/, 'err', T('Port Security works only on an access port. First "switchport mode access", then "switchport port-security".',
    'Port Security работает только на access-порту. Сначала "switchport mode access", потом "switchport port-security".',
    'Port Security עובד רק בפורט access. קודם "switchport mode access", ואז "switchport port-security".')],
  [/has reached maximum limit/, 'err', T('The port already has as many secure addresses as "maximum" allows. Raise "switchport port-security maximum" or remove an address.',
    'На порту уже столько разрешённых адресов, сколько позволяет "maximum". Увеличьте "switchport port-security maximum" или удалите адрес.',
    'בפורט כבר יש כמה כתובות שמותר לפי "maximum". הגדילו את "switchport port-security maximum" או מחקו כתובת.')],
  [/Invalid next hop address \(it's this router\)/, 'err', T('The next hop must be the NEIGHBOUR\'s address on the shared link, not this router\'s own address. Look at the other end of the link (show ip interface brief on the neighbour).',
    'Next hop — это адрес СОСЕДА на общем линке, а не свой. Посмотрите адрес на другом конце линка (show ip interface brief на соседе).',
    'ה-next hop הוא הכתובת של השכן בקישור המשותף, לא הכתובת של הנתב עצמו. בדקו את הכתובת בצד השני של הקישור (show ip interface brief אצל השכן).')],
  [/Default route without gateway/, 'info', T('Only a warning: the route was added. With just an exit interface the router sends the packet straight out of it — on a serial (point-to-point) link that is fine; on Ethernet it relies on proxy ARP, so prefer a next-hop IP there.',
    'Только предупреждение: маршрут добавлен. С одним выходным интерфейсом роутер просто отправляет пакет в него — на serial (точка-точка) это нормально; на Ethernet это держится на proxy ARP, там лучше указать IP next hop.',
    'זו רק אזהרה: הנתיב נוסף. עם ממשק יציאה בלבד הנתב שולח את החבילה ישר דרכו — בקישור serial (נקודה-לנקודה) זה תקין; ב-Ethernet זה נשען על proxy ARP, ולכן עדיף לציין שם next hop.')],
  [/Mismatched hello parameters/, 'err', T('The neighbour sends Hello with other timers (R = received, C = configured here). Hello and Dead must be equal on both ends of the link — set the same "ip ospf hello-interval" / "ip ospf dead-interval" on both sides.',
    'Сосед присылает Hello с другими таймерами (R — получено, C — настроено здесь). Hello и Dead должны совпадать на обоих концах линка — задайте одинаковые "ip ospf hello-interval" / "ip ospf dead-interval" с обеих сторон.',
    'השכן שולח Hello עם טיימרים אחרים (R — התקבל, C — מוגדר כאן). Hello ו-Dead חייבים להיות שווים בשני צדי הקישור — הגדירו "ip ospf hello-interval" / "ip ospf dead-interval" זהים בשני הצדדים.')],
  [/Dead timer expired/, 'err', T('No suitable Hello from the neighbour for the whole Dead interval: it is off, its link is down, or the Hello parameters (timers, area, mask) no longer match.',
    'От соседа за весь Dead-интервал не пришло подходящего Hello: он выключен, его линк лежит или параметры Hello (таймеры, area, маска) больше не совпадают.',
    'במשך כל ה-Dead interval לא הגיע Hello מתאים מהשכן: הוא כבוי, הקישור שלו נפל, או שפרמטרי ה-Hello (טיימרים, area, מסכה) כבר לא תואמים.')],
  [/OSPF: DR\/BDR election/, 'info', T('A DR/BDR election happened on this segment. Elections are non-preemptive: a router with a higher priority that joins later does not take the role — only when the DR/BDR disappears or after "clear ip ospf process".',
    'На сегменте прошли выборы DR/BDR. Выборы не вытесняющие: роутер с большим priority, подключившийся позже, роль не отбирает — только когда DR/BDR пропадает или после "clear ip ospf process".',
    'בסגמנט התקיימו בחירות DR/BDR. הבחירות אינן דוחקות: נתב עם priority גבוה שמצטרף מאוחר לא לוקח את התפקיד — רק כשה-DR/BDR נעלם או אחרי "clear ip ospf process".')],
  [/2WAY\/DROTHER/, 'info', T('2WAY between two DROTHERs is normal: on an Ethernet segment DROTHERs become FULL only with the DR and the BDR.',
    '2WAY между двумя DROTHER — норма: на Ethernet-сегменте DROTHER доходят до FULL только с DR и BDR.',
    '2WAY בין שני DROTHER זה תקין: בסגמנט Ethernet נתבי DROTHER מגיעים ל-FULL רק עם ה-DR וה-BDR.')],
  [/FULL\/  -/, 'info', T('FULL/  - : a point-to-point link (serial) has no DR/BDR election, so the role column shows a dash. That is not an error.',
    'FULL/  - : на линке точка-точка (serial) выборов DR/BDR нет, поэтому в столбце роли прочерк. Это не ошибка.',
    'FULL/  - : בקישור נקודה-לנקודה (serial) אין בחירות DR/BDR, ולכן בעמודת התפקיד יש מקף. זו לא שגיאה.')],
  [/%PM-4-ERR_DISABLE: bpduguard/, 'err', T('BPDU Guard turned the port off: a switch is connected to a port that is meant for a PC. Remove BPDU Guard there (or move the cable), then shutdown and no shutdown on the port.', 'BPDU Guard выключил порт: к порту для ПК подключён коммутатор. Уберите там BPDU Guard (или переткните кабель), затем shutdown и no shutdown на порту.', 'BPDU Guard כיבה את הפורט: לפורט שמיועד למחשב חובר מתג. מסירים שם את BPDU Guard (או מעבירים את הכבל), ואז shutdown ו-no shutdown בפורט.')],
  [/%PM-4-ERR_DISABLE: channel-misconfig/, 'err', T('EtherChannel guard: this side is "mode on", but the other side is not. Set matching modes on both ends, then shutdown and no shutdown on the Port-channel.', 'EtherChannel guard: здесь «mode on», а на другой стороне нет. Настройте одинаковые режимы с обеих сторон, затем shutdown и no shutdown на Port-channel.', 'EtherChannel guard: בצד הזה "mode on", ובצד השני לא. מגדירים מצבים תואמים בשני הצדדים, ואז shutdown ו-no shutdown ב-Port-channel.')],
  [/Creating a port-channel interface/, 'info', T('IOS created the logical Port-channel interface. Put trunk / VLAN settings on it: they are copied to all its ports.', 'IOS создал логический интерфейс Port-channel. Настройки trunk / VLAN задавайте на нём: они перенесутся на все его порты.', 'ה-IOS יצר את הממשק הלוגי Port-channel. מגדירים עליו trunk ו-VLAN: ההגדרות מועתקות לכל הפורטים שלו.')],
  [/already uses (LACP|PAgP|mode on)/, 'err', T('All ports of one channel use one protocol. To change it: "no channel-group" on all its ports, then "channel-group … mode …" again.', 'Все порты одного канала используют один протокол. Чтобы сменить его: «no channel-group» на всех портах, затем снова «channel-group … mode …».', 'כל הפורטים בערוץ אחד משתמשים בפרוטוקול אחד. כדי להחליף: ‏"no channel-group" בכל הפורטים, ואז שוב "channel-group … mode …".')],
  [/Po\d+\(SD\)/, 'err', T('The Port-channel is down. I = the other end does not negotiate (passive + passive, auto + auto, LACP vs PAgP); s = a port is set differently from its Port-channel; D = the port is down.', 'Port-channel не работает. I — другой конец не договаривается (passive + passive, auto + auto, LACP против PAgP); s — порт настроен не так, как его Port-channel; D — порт не работает.', 'ה-Port-channel לא פעיל. ‏I = הצד השני לא מתאם (passive + passive, ‏auto + auto, ‏LACP מול PAgP); ‏s = פורט מוגדר אחרת מה-Port-channel שלו; ‏D = הפורט לא פעיל.')],
  [/Po\d+\(SU\)/, 'ok', T('The EtherChannel is up. (P) ports carry traffic together; STP sees the whole bundle as one port.', 'EtherChannel работает. Порты (P) передают трафик вместе; STP видит весь пучок как один порт.', 'ה-EtherChannel פעיל. פורטים (P) מעבירים תעבורה יחד; ‏STP רואה את כל הצרור כפורט אחד.')],
  [/%SW_MATM-4-MACFLAP_NOTIF/, 'err', T('A MAC address jumps between two ports: the same frame arrives from two directions. That is a Layer 2 loop that STP does not break — a broadcast storm. Check show spanning-tree; if STP was turned off, turn it on: spanning-tree vlan <n>.', 'MAC-адрес прыгает между двумя портами: один и тот же кадр приходит с двух сторон. Это петля 2-го уровня, которую STP не разрывает, — широковещательный шторм. Проверьте show spanning-tree; если STP выключен, включите: spanning-tree vlan <n>.', 'כתובת MAC קופצת בין שני פורטים: אותה מסגרת מגיעה משני כיוונים. זו לולאה בשכבה 2 ש-STP לא שובר — סופת broadcast. בודקים show spanning-tree; אם STP כובה, מפעילים: ‏spanning-tree vlan <n>.')],
  [/No spanning tree instance exists|Spanning tree instance\(s\) for vlan \d+ does not exist/, 'info', T('No STP here for that VLAN: either no port of the VLAN is up, or STP was turned off (look for "no spanning-tree vlan" in running-config).', 'Здесь нет STP для этого VLAN: либо ни один порт VLAN не работает, либо STP выключен (ищите «no spanning-tree vlan» в running-config).', 'אין כאן STP ל-VLAN הזה: או שאין פורט פעיל ב-VLAN, או ש-STP כובה (לחפש "no spanning-tree vlan" ב-running-config).')],
  [/ (LIS|LRN) /, 'info', T('LIS / LRN — the port is still converging: 15 s listening + 15 s learning, then FWD. No data passes yet. PortFast skips this on ports to PCs; the ⏩ Fast Forward Time button moves time 30 s ahead.', 'LIS / LRN — порт ещё сходится: 15 с listening + 15 с learning, потом FWD. Данные пока не проходят. PortFast пропускает это на портах к ПК; кнопка ⏩ Fast Forward Time сдвигает время на 30 с.', 'LIS / LRN — הפורט עדיין מתכנס: ‏15 שניות listening + ‏15 learning, ואז FWD. נתונים עוד לא עוברים. ‏PortFast מדלג על זה בפורטים למחשבים; הכפתור ⏩ Fast Forward Time מקדם את הזמן ב-30 שניות.')],
  [/Bound\((RSTP|PVST)\)/, 'info', T('Region boundary: the neighbour is in another MST region (name, revision or VLAN table differ) or runs PVST+. MST instances stop here; instance 0 (IST) carries the tree across.', 'Граница региона: сосед в другом регионе MST (отличаются имя, ревизия или таблица VLAN) или работает в PVST+. Экземпляры MST здесь обрываются; дерево через границу ведёт экземпляр 0 (IST).', 'גבול אזור: השכן באזור MST אחר (השם, ה-revision או טבלת ה-VLAN שונים) או מריץ PVST+. מופעי ה-MST נעצרים כאן; מופע 0 ‏(IST) מעביר את העץ דרך הגבול.')],
  [/Altn BLK/, 'info', T('Altn BLK = STP blocks this port to break a loop. That is normal: it is the backup path if the main one fails.', 'Altn BLK — STP блокирует этот порт, чтобы разорвать петлю. Это нормально: это запасной путь на случай отказа основного.', 'Altn BLK = ‏STP חוסם את הפורט כדי לשבור לולאה. זה תקין: זו הדרך הגיבוי אם הראשית נופלת.')],
  [/This bridge is the root/, 'info', T('This switch is the root bridge of that VLAN: all its ports are designated (FWD).', 'Этот коммутатор — корневой мост этого VLAN: все его порты назначенные (FWD).', 'המתג הזה הוא ה-root bridge של ה-VLAN: כל הפורטים שלו designated ‏(FWD).')],
  [/% Unrecognized host or address/, 'err', T('The router does not know this name. Use the IP address, or add the name to the router\'s own table: "ip host <name> <ip>" (check with "show hosts").', 'Роутер не знает этого имени. Укажите IP-адрес или добавьте имя в собственную таблицу роутера: «ip host <имя> <ip>» (проверка — «show hosts»).', 'הנתב לא מכיר את השם הזה. משתמשים בכתובת ה-IP, או מוסיפים את השם לטבלה של הנתב עצמו: "ip host <name> <ip>" (בודקים עם "show hosts").')],
  [/% Unrecognized command/, 'err', T('Nothing starts with these letters in this mode. Check the mode (prompt) or delete the last letters.', 'В этом режиме ничего не начинается с этих букв. Проверьте режим (приглашение) или сотрите последние буквы.', 'במצב הזה שום דבר לא מתחיל באותיות האלה. בודקים את המצב (הסמן) או מוחקים את האותיות האחרונות.')],
  [/% Bad mask|Inconsistent address and mask/, 'err', T('The address and the mask do not fit together: it is the network or broadcast address of that subnet, or the mask is wrong.', 'Адрес и маска не подходят друг к другу: это адрес сети или broadcast этой подсети, или маска неверная.', 'הכתובת והמסכה לא מתאימות: זו כתובת הרשת או ה-broadcast של תת-הרשת, או שהמסכה שגויה.')],
  [/overlaps with/, 'err', T('This subnet is already on another interface of this router. Every router interface must be in a different network.', 'Эта подсеть уже есть на другом интерфейсе роутера. Каждый интерфейс роутера должен быть в своей сети.', 'תת-הרשת הזו כבר נמצאת בממשק אחר של הנתב. כל ממשק של נתב חייב להיות ברשת אחרת.')],
  [/only allowed if that\s*\n?subinterface is already configured/, 'err', T('On a subinterface type "encapsulation dot1Q <vlan>" first, then "ip address".', 'На подынтерфейсе сначала «encapsulation dot1Q <vlan>», потом «ip address».', 'בתת-ממשק מקלידים קודם "encapsulation dot1Q <vlan>", ואחר כך "ip address".')],
  [/% Please define a domain-name first/, 'err', T('RSA keys need a domain name: "ip domain-name example.com" (and a hostname other than Router/Switch).', 'Для RSA-ключей нужно доменное имя: «ip domain-name example.com» (и имя устройства не Router/Switch).', 'מפתחות RSA צריכים שם דומיין: "ip domain-name example.com" (ו-hostname שאינו Router/Switch).')],
  [/% Access VLAN does not exist\. Creating vlan/, 'info', T('IOS created the VLAN for you. Give it a name: "vlan <n>" then "name <text>".', 'IOS сам создал VLAN. Дайте ему имя: «vlan <n>», затем «name <текст>».', 'IOS יצר את ה-VLAN בעצמו. נותנים לו שם: "vlan <n>" ואחר כך "name <טקסט>".')],
  [/% Bad (passwords|secrets)/, 'err', T('Three wrong passwords in a row. Press Enter and try again.', 'Три неверных пароля подряд. Нажмите Enter и попробуйте снова.', 'שלוש סיסמאות שגויות ברצף. לוחצים Enter ומנסים שוב.')],
  [/Destination filename \[startup-config\]\?|\[confirm\]/, 'info', T('IOS asks you to confirm — just press Enter.', 'IOS просит подтвердить — просто нажмите Enter.', 'IOS מבקש אישור — פשוט לוחצים Enter.')],
  [/Success rate is 0 percent/, 'err', T('No replies at all. Check, in order: interfaces up (show ip interface brief), IP and mask on both ends, the gateway, and a route back.', 'Ответов нет. Проверьте по порядку: интерфейсы подняты (show ip interface brief), IP и маска на обоих концах, шлюз и обратный маршрут.', 'אין תשובות בכלל. בודקים לפי הסדר: הממשקים פעילים (show ip interface brief), ‏IP ומסכה בשני הקצוות, השער ונתיב חזרה.')],
  [/Success rate is (?:[1-9]\d?) percent/, 'info', T('Some packets were lost — the first one usually times out while ARP finds the MAC address. Run ping again: it should be 100%.', 'Часть пакетов потерялась — первый обычно теряется, пока ARP ищет MAC-адрес. Повторите ping: должно быть 100%.', 'חלק מהחבילות אבדו — הראשונה בדרך כלל אובדת בזמן ש-ARP מחפש את כתובת ה-MAC. מריצים ping שוב: אמור להיות 100%.')],
  [/Success rate is 100 percent/, 'ok', T('All replies came back — the path works in both directions.', 'Все ответы вернулись — путь работает в обе стороны.', 'כל התשובות חזרו — הנתיב עובד בשני הכיוונים.')],
  [/Reload or use "clear ip ospf process"/, 'info', T('The new router ID works only after "clear ip ospf process" (in # mode) or a reload.', 'Новый router ID заработает только после «clear ip ospf process» (в режиме #) или перезагрузки.', 'ה-router ID החדש יעבוד רק אחרי "clear ip ospf process" (במצב #) או אתחול.')],
  [/changed state to up/, 'ok', T('The interface came up.', 'Интерфейс поднялся.', 'הממשק עלה.')],
  [/changed state to down/, 'info', T('The interface went down: check the cable and the other end ("no shutdown" there too).', 'Интерфейс опустился: проверьте кабель и другую сторону (там тоже нужен «no shutdown»).', 'הממשק ירד: בודקים את הכבל ואת הצד השני (גם שם צריך "no shutdown").')],
  [/from LOADING to FULL/, 'ok', T('An OSPF neighbour is up (FULL) — routes will be exchanged.', 'Сосед OSPF установлен (FULL) — маршруты будут передаваться.', 'שכן OSPF נוצר (FULL) — הנתבים יחליפו נתיבים.')],
];

// Типичные следующие команды для режима (с настоящими именами интерфейсов этого устройства).
function cliNextCommands(dev, sess) {
  if (!dev || !sess || !sess.started || sess.pending) return [];
  const isR = dev.type === 'router';
  const ics = dev.cfg.interfaces || {};
  const phys = dev.ports.filter((p) => !p.console).map((p) => p.name);
  const freeIf = isR ? phys.find((n) => ics[n] && !ics[n].ip) : null;
  const cur = sess.ifs && sess.ifs[0] ? ics[sess.ifs[0]] : null;
  switch (sess.mode) {
    case 'user': return ['enable', 'show ip interface brief', 'ping '];
    case 'priv': return ['configure terminal', 'show ip interface brief', 'show running-config', isR ? 'show ip route' : 'show vlan brief', 'copy running-config startup-config'];
    case 'config':
      if (isR) return ['interface ' + ifShort(freeIf || phys[0]), 'hostname R1', 'ip route ', 'router ospf 1', 'ip dhcp pool LAN', 'end'];
      return ['interface ' + ifShort(phys[0]), 'vlan 10', 'interface vlan 1', 'ip default-gateway ', 'hostname S1', 'end'];
    case 'if': {
      const name = sess.ifs[0] || '';
      if (dev.type === 'switch' && ifKind(name) === 'phys') return ['switchport mode access', 'switchport access vlan ', 'switchport mode trunk', 'description ', 'exit'];
      const out = [];
      if (cur && !cur.ip) out.push('ip address ');
      if (cur && cur.shutdown) out.push('no shutdown');
      out.push('description ', 'exit');
      return out;
    }
    case 'subif': return cur && !cur.encap ? ['encapsulation dot1Q ', 'exit'] : ['ip address ', 'exit'];
    case 'range': return dev.type === 'switch' ? ['switchport mode access', 'switchport access vlan ', 'shutdown', 'exit'] : ['no shutdown', 'exit'];
    case 'router-rip': return ['version 2', 'no auto-summary', 'network ', 'passive-interface ', 'exit'];
    case 'router-ospf': return ['router-id ', 'network ', 'passive-interface ', 'default-information originate', 'exit'];
    case 'dhcp': return ['network ', 'default-router ', 'dns-server ', 'exit'];
    case 'line': return ['password ', 'login', 'login local', 'transport input ssh', 'exit'];
    case 'vlan': return ['name ', 'exit'];
    default: return [];
  }
}

// Что показать под строкой ввода: режим, следующие команды, разбор последнего вывода.
function cliHelp(dev, sess, lastOut) {
  let mode = CLI_MODE_INFO.start;
  if (sess && sess.started) mode = sess.pending ? CLI_MODE_INFO.pending : CLI_MODE_INFO[sess.mode] || CLI_MODE_INFO.config;
  let msg = null;
  const out = String(lastOut || '');
  for (const [re, kind, text] of CLI_MESSAGES) if (re.test(out)) { msg = { kind, text }; break; }
  return { mode, next: cliNextCommands(dev, sess), msg };
}
