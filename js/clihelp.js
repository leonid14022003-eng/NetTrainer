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
  vlan: T('VLAN configuration (config-vlan) — give the VLAN a name, then exit.', 'Настройка VLAN (config-vlan) — задайте имя VLAN и выйдите (exit).', 'הגדרת VLAN ‏(config-vlan) — נותנים שם ל-VLAN ויוצאים (exit).'),
  start: T('Press Enter to start the console session.', 'Нажмите Enter, чтобы начать сеанс консоли.', 'לוחצים Enter כדי להתחיל את חיבור הקונסולה.'),
  pending: T('IOS is waiting for an answer: a password, or Enter to confirm.', 'IOS ждёт ответа: пароль или Enter для подтверждения.', 'IOS מחכה לתשובה: סיסמה, או Enter לאישור.'),
};

// Сообщения IOS → объяснение. kind: err — ошибка, info — полезно знать, ok — всё хорошо.
const CLI_MESSAGES = [
  [/% Invalid input detected/, 'err', T('IOS did not understand the word under the ^ mark: a typo, or this command does not exist in this mode. Look at the prompt — (config)# and (config-if)# accept different commands. Type ? to see what is allowed here.', 'IOS не понял слово под знаком ^: опечатка или такой команды нет в этом режиме. Посмотрите на приглашение — (config)# и (config-if)# принимают разные команды. Наберите ?, чтобы увидеть, что здесь можно.', 'IOS לא הבין את המילה שמתחת לסימן ^: שגיאת הקלדה, או שהפקודה לא קיימת במצב הזה. שימו לב לסמן — (config)# ו-(config-if)# מקבלים פקודות שונות. מקלידים ? כדי לראות מה מותר כאן.')],
  [/% Incomplete command/, 'err', T('The command is not finished — something is missing at the end. Type the command, a space and ? to see what comes next.', 'Команда не закончена — в конце чего-то не хватает. Наберите команду, пробел и ?, чтобы увидеть продолжение.', 'הפקודה לא גמורה — חסר משהו בסוף. מקלידים את הפקודה, רווח ו-? כדי לראות מה בא אחר כך.')],
  [/% Ambiguous command/, 'err', T('The abbreviation fits several commands. Type a few more letters (for example "con" → "conf").', 'Сокращение подходит к нескольким командам. Допишите ещё пару букв (например, «con» → «conf»).', 'הקיצור מתאים לכמה פקודות. מוסיפים עוד כמה אותיות (למשל "con" → "conf").')],
  [/% Unknown command or computer name/, 'err', T('IOS took this word for a host name and tried to connect to it. Most likely a typo in a command. Tip: "no ip domain-lookup" stops the long DNS wait.', 'IOS принял слово за имя хоста и пытался к нему подключиться. Скорее всего, опечатка в команде. Совет: «no ip domain-lookup» убирает долгое ожидание DNS.', 'IOS חשב שהמילה היא שם של מארח וניסה להתחבר אליו. כנראה שגיאת הקלדה בפקודה. טיפ: "no ip domain-lookup" מבטל את ההמתנה הארוכה ל-DNS.')],
  [/%PM-4-ERR_DISABLE: bpduguard/, 'err', T('BPDU Guard turned the port off: a switch is connected to a port that is meant for a PC. Remove BPDU Guard there (or move the cable), then shutdown and no shutdown on the port.', 'BPDU Guard выключил порт: к порту для ПК подключён коммутатор. Уберите там BPDU Guard (или переткните кабель), затем shutdown и no shutdown на порту.', 'BPDU Guard כיבה את הפורט: לפורט שמיועד למחשב חובר מתג. מסירים שם את BPDU Guard (או מעבירים את הכבל), ואז shutdown ו-no shutdown בפורט.')],
  [/%PM-4-ERR_DISABLE: channel-misconfig/, 'err', T('EtherChannel guard: this side is "mode on", but the other side is not. Set matching modes on both ends, then shutdown and no shutdown on the Port-channel.', 'EtherChannel guard: здесь «mode on», а на другой стороне нет. Настройте одинаковые режимы с обеих сторон, затем shutdown и no shutdown на Port-channel.', 'EtherChannel guard: בצד הזה "mode on", ובצד השני לא. מגדירים מצבים תואמים בשני הצדדים, ואז shutdown ו-no shutdown ב-Port-channel.')],
  [/Creating a port-channel interface/, 'info', T('IOS created the logical Port-channel interface. Put trunk / VLAN settings on it: they are copied to all its ports.', 'IOS создал логический интерфейс Port-channel. Настройки trunk / VLAN задавайте на нём: они перенесутся на все его порты.', 'ה-IOS יצר את הממשק הלוגי Port-channel. מגדירים עליו trunk ו-VLAN: ההגדרות מועתקות לכל הפורטים שלו.')],
  [/already uses (LACP|PAgP|mode on)/, 'err', T('All ports of one channel use one protocol. To change it: "no channel-group" on all its ports, then "channel-group … mode …" again.', 'Все порты одного канала используют один протокол. Чтобы сменить его: «no channel-group» на всех портах, затем снова «channel-group … mode …».', 'כל הפורטים בערוץ אחד משתמשים בפרוטוקול אחד. כדי להחליף: ‏"no channel-group" בכל הפורטים, ואז שוב "channel-group … mode …".')],
  [/Po\d+\(SD\)/, 'err', T('The Port-channel is down. I = the other end does not negotiate (passive + passive, auto + auto, LACP vs PAgP); s = a port is set differently from its Port-channel; D = the port is down.', 'Port-channel не работает. I — другой конец не договаривается (passive + passive, auto + auto, LACP против PAgP); s — порт настроен не так, как его Port-channel; D — порт не работает.', 'ה-Port-channel לא פעיל. ‏I = הצד השני לא מתאם (passive + passive, ‏auto + auto, ‏LACP מול PAgP); ‏s = פורט מוגדר אחרת מה-Port-channel שלו; ‏D = הפורט לא פעיל.')],
  [/Po\d+\(SU\)/, 'ok', T('The EtherChannel is up. (P) ports carry traffic together; STP sees the whole bundle as one port.', 'EtherChannel работает. Порты (P) передают трафик вместе; STP видит весь пучок как один порт.', 'ה-EtherChannel פעיל. פורטים (P) מעבירים תעבורה יחד; ‏STP רואה את כל הצרור כפורט אחד.')],
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
