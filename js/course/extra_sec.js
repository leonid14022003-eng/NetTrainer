'use strict';
// «Как это делается в Packet Tracer»: ACL (ensa05), NAT/PAT (ensa06) и практика в уроке «Настройка WLAN» (srwe13):
// домашний роутер Linksys WRT300N, AccessPoint-PT, беспроводные карты WMP300N / WPC300N, приложение PC Wireless.

lessonGet('ensa05').topic = 'acl';
lessonGet('ensa06').topic = 'nat';

lessonExtend('ensa05', {
  minutes: 10,
  sections: [
    lSec(['ACLs in Packet Tracer, step by step', 'ACL в Packet Tracer по шагам', 'ACL ב-Packet Tracer צעד אחר צעד'],
      lP(['Typical lab: PC1 must not reach the server LAN, everybody else may. A standard ACL looks only at the source, so it goes on the router closest to the destination, outbound on the LAN interface.',
        'Типичная лаба: PC1 не должен попадать в серверную сеть, остальные — могут. Стандартный ACL смотрит только на источник, поэтому его ставят на роутер ближе к получателю, исходящим (out) на интерфейс LAN.',
        'מעבדה טיפוסית: PC1 לא אמור להגיע לרשת השרתים, כל השאר כן. ‏ACL סטנדרטי בודק רק את המקור, ולכן שמים אותו בנתב הקרוב ליעד, יוצא (out) על ממשק ה-LAN.']),
      lCode('R2(config)# access-list 10 remark Block PC1 from the server LAN\nR2(config)# access-list 10 deny host 192.168.10.10\nR2(config)# access-list 10 permit any\nR2(config)# interface g0/0\nR2(config-if)# ip access-group 10 out',
        ['Without "permit any" the implicit "deny any" would block everyone', 'Без "permit any" неявный "deny any" заблокировал бы всех', 'בלי "permit any" ה-"deny any" הסמוי היה חוסם את כולם']),
      lCode('R1(config)# ip access-list extended WEB-ONLY\nR1(config-ext-nacl)# permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.100 eq www\nR1(config-ext-nacl)# deny ip 192.168.10.0 0.0.0.255 host 192.168.20.100\nR1(config-ext-nacl)# permit ip any any\nR1(config-ext-nacl)# exit\nR1(config)# interface g0/0\nR1(config-if)# ip access-group WEB-ONLY in',
        ['Named extended ACL near the source: only HTTP to the server, all other traffic allowed', 'Именованный расширенный ACL у источника: к серверу только HTTP, остальной трафик разрешён', 'ACL מורחב עם שם ליד המקור: לשרת רק HTTP, שאר התעבורה מותרת']),
      lCode('R2# show access-lists\nStandard IP access list SRV-LAN\n    10 deny host 192.168.10.120\n    20 permit 192.168.10.0 0.0.0.255 (12 match(es))\nR2# configure terminal\nR2(config)# ip access-list standard SRV-LAN\nR2(config-std-nacl)# 15 deny host 192.168.10.10\nR2(config-std-nacl)# no 10',
        ['Editing by sequence numbers: insert line 15, delete line 10 — no need to retype the list', 'Правка по номерам: вставить строку 15, удалить строку 10 — список заново не набирается', 'עריכה לפי מספרים: מכניסים שורה 15, מוחקים שורה 10 — לא מקלידים את הרשימה מחדש']),
      lCode('R1(config)# access-list 5 permit host 192.168.10.50\nR1(config)# line vty 0 4\nR1(config-line)# access-class 5 in',
        ['Only the admin PC may Telnet/SSH to R1; others get "% Connection refused by remote host"', 'Только ПК администратора может зайти на R1 по Telnet/SSH; остальные получают "% Connection refused by remote host"', 'רק מחשב המנהל יכול להתחבר ל-R1 ב-Telnet/SSH; האחרים מקבלים "% Connection refused by remote host"']),
      lTable([['Check', 'Проверка', 'בדיקה'], ['What you see', 'Что видно', 'מה רואים']], [
        ['show access-lists', ['all ACLs with line numbers and "(n match(es))" counters', 'все ACL с номерами строк и счётчиками "(n match(es))"', 'כל ה-ACL עם מספרי שורות ומונים "(n match(es))"']],
        ['show ip interface g0/0', ['"Inbound access list is …" / "Outgoing access list is …"', '"Inbound access list is …" / "Outgoing access list is …"', '"Inbound access list is …" / "Outgoing access list is …"']],
        [['PC → Command Prompt → ping', 'ПК → Command Prompt → ping', 'מחשב → Command Prompt → ping'], ['a denied ping: "Reply from <router>: Destination host unreachable"', 'запрещённый ping: "Reply from <роутер>: Destination host unreachable"', 'ping חסום: ‏"Reply from <נתב>: Destination host unreachable"']],
        [['PC → Desktop → Web Browser', 'ПК → Desktop → Web Browser', 'מחשב → Desktop → Web Browser'], ['HTTP allowed — the page opens; denied — "Request Timeout"', 'HTTP разрешён — страница открывается; запрещён — "Request Timeout"', 'HTTP מותר — הדף נפתח; חסום — ‏"Request Timeout"']],
        [['telnet <IP> from a PC', 'telnet <IP> с ПК', 'telnet <IP> ממחשב'], ['checks the vty access-class', 'проверяет access-class на vty', 'בודק את ה-access-class ב-vty']],
      ]),
      lTip(['Practise in Training → Access lists (ACL): a standard ACL, a named extended ACL, editing by sequence numbers, VTY protection — and Troubleshooting → "the web-only ACL".',
        'Потренируйтесь в Training → Access lists (ACL): стандартный ACL, именованный расширенный, правка по номерам строк, защита VTY — и в Troubleshooting → «ACL „только веб“».',
        'התאמנו ב-Training → Access lists (ACL): ‏ACL סטנדרטי, ‏ACL מורחב עם שם, עריכה לפי מספרי שורות, הגנה על VTY — וגם Troubleshooting → ‏"ACL ‏רק אתר".'])),
  ],
  quiz: [
    lQ(['A standard ACL must stop PC1 from reaching a server LAN. Where do you apply it?', 'Стандартный ACL должен не пускать PC1 в серверную сеть. Куда его поставить?', 'ACL סטנדרטי צריך למנוע מ-PC1 להגיע לרשת השרתים. איפה מחילים אותו?'],
      [['On the router nearest the server LAN, outbound on its LAN interface', 'На роутер рядом с серверной сетью, out на его интерфейс LAN', 'בנתב הקרוב לרשת השרתים, ‏out על ממשק ה-LAN שלו'], ['On PC1', 'На PC1', 'ב-PC1'], ['On the vty lines', 'На линиях vty', 'בקווי ה-vty'], ['Inbound on the router nearest PC1, on every interface', 'Входящим на роутер рядом с PC1, на все интерфейсы', 'נכנס בנתב הקרוב ל-PC1, על כל הממשקים']], 0,
      ['It sees only the source: near PC1 it would block PC1 from everything.', 'Он видит только источник: рядом с PC1 он отрезал бы PC1 от всего.', 'הוא רואה רק את המקור: ליד PC1 הוא היה מנתק את PC1 מהכול.']),
    lQ(['How do you insert a line between lines 10 and 20 of the named ACL SRV?', 'Как вставить строку между строками 10 и 20 именованного ACL SRV?', 'איך מכניסים שורה בין שורות 10 ו-20 ב-ACL בשם SRV?'],
      [['ip access-list standard SRV → 15 deny host …', 'ip access-list standard SRV → 15 deny host …', 'ip access-list standard SRV → 15 deny host …'], ['access-list SRV insert 15', 'access-list SRV insert 15', 'access-list SRV insert 15'], ['Delete the ACL and type it again', 'Удалить ACL и набрать заново', 'למחוק את ה-ACL ולהקליד מחדש'], ['It is impossible', 'Это невозможно', 'זה בלתי אפשרי']], 0,
      ['The sequence number puts the new line exactly where you want it.', 'Номер строки ставит её точно в нужное место.', 'מספר השורה ממקם אותה בדיוק במקום הרצוי.']),
    lQ(['Which command limits who may Telnet to a router?', 'Какая команда ограничивает, кто может зайти на роутер по Telnet?', 'איזו פקודה מגבילה מי יכול להתחבר לנתב ב-Telnet?'],
      ['access-class 5 in', 'ip access-group 5 in', 'transport input none', 'service password-encryption'], 0,
      ['access-class works on vty lines; ip access-group works on interfaces.', 'access-class работает на линиях vty; ip access-group — на интерфейсах.', 'access-class עובד בקווי vty; ‏ip access-group — על ממשקים.']),
    lQ(['After "access-list 10 deny host 10.1.1.5" on the LAN interface (out), nobody reaches the LAN. Why?', 'После "access-list 10 deny host 10.1.1.5" на интерфейсе LAN (out) в эту сеть не может попасть никто. Почему?', 'אחרי "access-list 10 deny host 10.1.1.5" על ממשק ה-LAN ‏(out) אף אחד לא מגיע לרשת. למה?'],
      [['The implicit "deny any" — a "permit any" line is missing', 'Неявный "deny any" — нет строки "permit any"', 'ה-"deny any" הסמוי — חסרה שורת "permit any"'], ['A standard ACL cannot be used outbound', 'Стандартный ACL нельзя ставить out', 'אי אפשר להחיל ACL סטנדרטי ב-out'], ['The host keyword is wrong', 'Неверное слово host', 'המילה host שגויה'], ['The ACL needs a remark', 'В ACL нужен remark', 'ה-ACL צריך remark']], 0,
      ['Every ACL ends with an invisible "deny any".', 'Каждый ACL заканчивается невидимым "deny any".', 'כל ACL מסתיים ב-"deny any" בלתי נראה.']),
  ],
});

lessonExtend('ensa06', {
  minutes: 10,
  sections: [
    lSec(['NAT in Packet Tracer, step by step', 'NAT в Packet Tracer по шагам', 'NAT ב-Packet Tracer צעד אחר צעד'],
      lP(['Every NAT configuration needs two marks: "ip nat inside" on the interface toward your private LAN and "ip nat outside" toward the provider. Then one of three rules.',
        'Любой настройке NAT нужны две метки: "ip nat inside" на интерфейсе в сторону своей частной LAN и "ip nat outside" — в сторону провайдера. Затем одно из трёх правил.',
        'כל הגדרת NAT צריכה שני סימונים: ‏"ip nat inside" על הממשק לכיוון ה-LAN הפרטית ו-"ip nat outside" לכיוון הספק. ואז אחד משלושה כללים.']),
      lCode('R1(config)# ip nat inside source static 192.168.10.254 209.165.200.229\nR1(config)# interface g0/0\nR1(config-if)# ip nat inside\nR1(config-if)# interface g0/1\nR1(config-if)# ip nat outside',
        ['Static NAT: a server reachable from the Internet at 209.165.200.229', 'Статический NAT: сервер доступен из Интернета по 209.165.200.229', 'NAT סטטי: שרת נגיש מהאינטרנט בכתובת 209.165.200.229']),
      lCode('R1(config)# ip nat pool PUBLIC 209.165.200.230 209.165.200.235 netmask 255.255.255.224\nR1(config)# access-list 1 permit 192.168.10.0 0.0.0.255\nR1(config)# ip nat inside source list 1 pool PUBLIC',
        ['Dynamic NAT: one free pool address per inside host', 'Динамический NAT: по одному свободному адресу пула на каждый внутренний хост', 'NAT דינמי: כתובת פנויה אחת מהמאגר לכל מארח פנימי']),
      lCode('R1(config)# access-list 1 permit 192.168.10.0 0.0.0.255\nR1(config)# ip nat inside source list 1 interface g0/1 overload',
        ['PAT: the whole LAN shares the address of g0/1, told apart by ports', 'PAT: вся LAN делит адрес g0/1, различаясь портами', 'PAT: כל ה-LAN חולקת את הכתובת של g0/1, לפי פורטים']),
      lCode('R1# show ip nat translations\nPro  Inside global         Inside local          Outside local         Outside global\nicmp 209.165.200.226:1024  192.168.10.11:1        198.51.100.10:1       198.51.100.10:1024\n---  209.165.200.229       192.168.10.254        ---                   ---\nR1# show ip nat statistics\nR1# clear ip nat translation *',
        ['Dynamic entries appear only while there is traffic: ping first, then look', 'Динамические записи появляются только при трафике: сначала ping, потом смотрите', 'רשומות דינמיות מופיעות רק כשיש תעבורה: קודם ping, אחר כך מסתכלים']),
      lTable([['Symptom', 'Симптом', 'תסמין'], ['Cause', 'Причина', 'סיבה']], [
        [['Nothing is translated, Hits 0', 'Ничего не транслируется, Hits 0', 'שום דבר לא מתורגם, ‏Hits 0'], ['inside/outside swapped or missing', 'inside/outside перепутаны или отсутствуют', 'inside/outside הוחלפו או חסרים']],
        [['Misses grow, some hosts have no Internet', 'Растут Misses, у части хостов нет Интернета', 'Misses עולים, לחלק מהמארחים אין אינטרנט'], ['pool exhausted — add "overload" or more addresses', 'пул кончился — добавьте "overload" или адресов', 'המאגר נגמר — מוסיפים "overload" או כתובות']],
        [['No translations for the LAN', 'Нет трансляций для LAN', 'אין תרגומים ל-LAN'], ['the NAT ACL permits a different network', 'ACL для NAT разрешает другую сеть', 'ה-ACL של ה-NAT מתיר רשת אחרת']],
        [['The router pings the Internet, PCs do not', 'Роутер пингует Интернет, ПК — нет', 'הנתב עושה ping לאינטרנט, המחשבים לא'], ['NAT is not working: the provider has no route to private addresses', 'NAT не работает: у провайдера нет маршрута к частным адресам', 'ה-NAT לא עובד: לספק אין נתיב לכתובות פרטיות']],
      ]),
      lTip(['Practise in Training → NAT & PAT (static, dynamic with a pool, PAT) and Troubleshooting → "no Internet behind PAT". A home Wi-Fi router does PAT on its Internet port automatically.',
        'Потренируйтесь в Training → NAT & PAT (статический, динамический с пулом, PAT) и Troubleshooting → «нет Интернета за PAT». Домашний Wi-Fi-роутер делает PAT на порту Internet автоматически.',
        'התאמנו ב-Training → NAT & PAT (סטטי, דינמי עם מאגר, ‏PAT) וב-Troubleshooting → ‏"אין אינטרנט מאחורי PAT". נתב Wi-Fi ביתי עושה PAT בפורט ה-Internet אוטומטית.'])),
  ],
  quiz: [
    lQ(['Which two interface commands does every NAT configuration need?', 'Какие две команды интерфейса нужны любой настройке NAT?', 'אילו שתי פקודות ממשק נחוצות לכל הגדרת NAT?'],
      [['ip nat inside and ip nat outside', 'ip nat inside и ip nat outside', 'ip nat inside ו-ip nat outside'], ['ip nat enable and ip nat pool', 'ip nat enable и ip nat pool', 'ip nat enable ו-ip nat pool'], ['ip access-group in and out', 'ip access-group in и out', 'ip access-group in ו-out'], ['nat overload and nat static', 'nat overload и nat static', 'nat overload ו-nat static']], 0,
      ['Translation happens when a packet crosses from inside to outside or back.', 'Трансляция происходит, когда пакет переходит из inside в outside или обратно.', 'התרגום קורה כשחבילה עוברת מ-inside ל-outside או בחזרה.']),
    lQ(['What does "overload" add to "ip nat inside source list 1 interface g0/1"?', 'Что добавляет "overload" к "ip nat inside source list 1 interface g0/1"?', 'מה "overload" מוסיף ל-"ip nat inside source list 1 interface g0/1"?'],
      [['Many hosts share one address, told apart by port numbers (PAT)', 'Многие хосты делят один адрес, различаясь портами (PAT)', 'הרבה מארחים חולקים כתובת אחת, לפי מספרי פורטים (PAT)'], ['Static mapping', 'Статическое отображение', 'מיפוי סטטי'], ['A bigger pool', 'Пул побольше', 'מאגר גדול יותר'], ['Faster routing', 'Более быструю маршрутизацию', 'ניתוב מהיר יותר']], 0,
      ['That is PAT, also called NAT overload.', 'Это PAT, он же NAT overload.', 'זה PAT, שנקרא גם NAT overload.']),
    lQ(['The outside host must open a web server at 192.168.1.10 through the public address 209.165.200.229. Which NAT?', 'Внешний хост должен открывать веб-сервер 192.168.1.10 через публичный адрес 209.165.200.229. Какой NAT нужен?', 'מארח חיצוני צריך לפתוח שרת אינטרנט 192.168.1.10 דרך הכתובת הציבורית 209.165.200.229. איזה NAT?'],
      [['ip nat inside source static 192.168.1.10 209.165.200.229', 'ip nat inside source static 192.168.1.10 209.165.200.229', 'ip nat inside source static 192.168.1.10 209.165.200.229'], ['ip nat inside source list 1 interface g0/1 overload', 'ip nat inside source list 1 interface g0/1 overload', 'ip nat inside source list 1 interface g0/1 overload'], ['ip nat pool WEB 192.168.1.10 192.168.1.10', 'ip nat pool WEB 192.168.1.10 192.168.1.10', 'ip nat pool WEB 192.168.1.10 192.168.1.10'], ['No NAT, only a route', 'Без NAT, только маршрут', 'בלי NAT, רק נתיב']], 0,
      ['Only static NAT lets connections start from outside.', 'Только статический NAT позволяет начинать соединение снаружи.', 'רק NAT סטטי מאפשר לפתוח חיבור מבחוץ.']),
    lQ(['"show ip nat translations" is empty right after configuring PAT. What is wrong?', '"show ip nat translations" пуст сразу после настройки PAT. Что не так?', '"show ip nat translations" ריק מיד אחרי הגדרת PAT. מה לא בסדר?'],
      [['Probably nothing: dynamic entries appear only during traffic', 'Скорее всего ничего: динамические записи появляются только при трафике', 'כנראה כלום: רשומות דינמיות מופיעות רק בזמן תעבורה'], ['PAT needs a reload', 'PAT требует перезагрузки', 'PAT דורש reload'], ['The ACL must be extended', 'ACL должен быть расширенным', 'ה-ACL חייב להיות מורחב'], ['PAT never shows translations', 'PAT никогда не показывает трансляции', 'PAT אף פעם לא מציג תרגומים']], 0,
      ['Ping from a PC, then look again.', 'Сделайте ping с ПК и посмотрите снова.', 'עושים ping ממחשב ומסתכלים שוב.']),
  ],
});

lessonGet('srwe13').topic = 'wireless';
lessonGet('srwe13').drill = lessonGet('srwe13').drill || 'lansec';
lessonExtend('srwe13', {
  minutes: 12,
  sections: [
    lSecAt('A home or small-office wireless router', ['Wireless devices in Packet Tracer', 'Беспроводные устройства в Packet Tracer', 'התקנים אלחוטיים ב-Packet Tracer'],
      lTable([['Device', 'Устройство', 'התקן'], ['What it is', 'Что это', 'מה זה'], ['Where to configure', 'Где настраивать', 'איפה מגדירים']], [
        ['WRT300N', ['home router: Internet port, 4 LAN ports, Wi-Fi, DHCP server, NAT (PAT)', 'домашний роутер: порт Internet, 4 порта LAN, Wi-Fi, DHCP-сервер, NAT (PAT)', 'נתב ביתי: פורט Internet, ‏4 פורטי LAN, ‏Wi-Fi, שרת DHCP, ‏NAT ‏(PAT)'], ['GUI tab (or a browser at http://192.168.0.1)', 'вкладка GUI (или браузер по http://192.168.0.1)', 'לשונית GUI (או דפדפן ב-http://192.168.0.1)']],
        ['AccessPoint-PT', ['a bridge: Port 0 (cable) ↔ Port 1 (radio); no IP routing, no DHCP', 'мост: Port 0 (кабель) ↔ Port 1 (радио); без маршрутизации и DHCP', 'גשר: ‏Port 0 (כבל) ↔ ‏Port 1 (רדיו); בלי ניתוב ובלי DHCP'], ['Config → Port 1', 'Config → Port 1', 'Config → Port 1']],
        ['WMP300N', ['wireless card for a PC', 'беспроводная карта для ПК', 'כרטיס אלחוטי למחשב'], ['Physical (power off!)', 'Physical (при выключенном питании!)', 'Physical (כשהחשמל כבוי!)']],
        ['WPC300N', ['wireless card for a laptop', 'беспроводная карта для ноутбука', 'כרטיס אלחוטי למחשב נייד'], ['Physical (power off!)', 'Physical (при выключенном питании!)', 'Physical (כשהחשמל כבוי!)']],
      ]),
      lP(['A device associates when its SSID, security mode and key match the access point; Packet Tracer then draws a dashed "radio" line between them. A cable is never needed for Wi-Fi clients.',
        'Устройство подключается, когда его SSID, тип защиты и ключ совпадают с точкой доступа; тогда Packet Tracer рисует между ними пунктирную «радио»-линию. Кабель Wi-Fi-клиентам не нужен.',
        'התקן מתחבר כשה-SSID, סוג האבטחה והמפתח שלו תואמים לנקודת הגישה; אז Packet Tracer מצייר ביניהם קו "רדיו" מקווקו. ללקוחות Wi-Fi לא צריך כבל.'])),
    lSecAt('Wireless devices in Packet Tracer', ['The home router WRT300N: GUI', 'Домашний роутер WRT300N: GUI', 'הנתב הביתי WRT300N: ‏GUI'],
      lTable([['Page', 'Страница', 'דף'], ['Settings', 'Настройки', 'הגדרות']], [
        ['Setup → Basic Setup', ['Internet Connection type (Automatic Configuration - DHCP / Static IP); Router IP (default 192.168.0.1/24); DHCP Server Enabled, Start IP .100, Maximum number of Users 50', 'Internet Connection type (Automatic Configuration - DHCP / Static IP); Router IP (по умолчанию 192.168.0.1/24); DHCP Server Enabled, Start IP .100, Maximum number of Users 50', 'Internet Connection type ‏(Automatic Configuration - DHCP / Static IP); ‏Router IP (ברירת מחדל 192.168.0.1/24); ‏DHCP Server Enabled, ‏Start IP .100, ‏Maximum number of Users 50']],
        ['Wireless → Basic Wireless Settings', ['Network Mode, Network Name (SSID) — default "Default", Standard Channel, SSID Broadcast', 'Network Mode, Network Name (SSID) — по умолчанию "Default", Standard Channel, SSID Broadcast', 'Network Mode, ‏Network Name (SSID) — ברירת מחדל "Default", ‏Standard Channel, ‏SSID Broadcast']],
        ['Wireless → Wireless Security', ['Security Mode WPA2 Personal, Encryption AES, Passphrase (8–63 characters)', 'Security Mode WPA2 Personal, Encryption AES, Passphrase (8–63 символа)', 'Security Mode WPA2 Personal, ‏Encryption AES, ‏Passphrase ‏(8–63 תווים)']],
        ['Administration → Management', ['router password (default admin / admin)', 'пароль роутера (по умолчанию admin / admin)', 'סיסמת הנתב (ברירת מחדל admin / admin)']],
        ['Status', ['Internet address from the provider, Local Network, DHCP clients, wireless clients', 'адрес от провайдера, Local Network, DHCP-клиенты, беспроводные клиенты', 'הכתובת מהספק, ‏Local Network, לקוחות DHCP, לקוחות אלחוטיים']],
      ]),
      lTip(['Every page is applied only with "Save Settings". After the Router IP changes, the clients keep the old addresses until they renew (click DHCP again or "ipconfig /renew").',
        'Каждая страница применяется только кнопкой "Save Settings". После смены Router IP клиенты держат старые адреса, пока не обновят их (снова DHCP или "ipconfig /renew").',
        'כל דף נשמר רק בכפתור "Save Settings". אחרי שינוי Router IP הלקוחות שומרים את הכתובות הישנות עד שהם מחדשים (שוב DHCP או "ipconfig /renew").']),
      lP(['The Internet port usually gets its address from the provider by DHCP; the router then translates the whole LAN to that one address (PAT) — exactly "ip nat inside source list … interface … overload" on a Cisco router.',
        'Порт Internet обычно получает адрес у провайдера по DHCP; затем роутер транслирует всю LAN в этот один адрес (PAT) — ровно "ip nat inside source list … interface … overload" на роутере Cisco.',
        'פורט ה-Internet מקבל בדרך כלל כתובת מהספק ב-DHCP; אחר כך הנתב מתרגם את כל ה-LAN לכתובת האחת הזו (PAT) — בדיוק "ip nat inside source list … interface … overload" בנתב Cisco.'])),
    lSecAt('The home router WRT300N: GUI', ['Access point and wireless clients', 'Точка доступа и беспроводные клиенты', 'נקודת גישה ולקוחות אלחוטיים'],
      lUL([
        ['AccessPoint-PT → Config → Port 1: SSID, 2.4 GHz Channel (1, 6 or 11 do not overlap), Authentication WPA2-PSK, PSK Pass Phrase, Encryption AES. Port 0 goes to an access port of the switch in the right VLAN.', 'AccessPoint-PT → Config → Port 1: SSID, 2.4 GHz Channel (1, 6 и 11 не перекрываются), Authentication WPA2-PSK, PSK Pass Phrase, Encryption AES. Port 0 — в access-порт коммутатора в нужном VLAN.', 'AccessPoint-PT → Config → Port 1: ‏SSID, ‏2.4 GHz Channel ‏(1, 6 ו-11 לא חופפים), ‏Authentication WPA2-PSK, ‏PSK Pass Phrase, ‏Encryption AES. ‏Port 0 מתחבר לפורט access במתג ב-VLAN הנכון.'],
        ['PC / Laptop → Physical: power OFF, remove PT-HOST-NM-1CFE (laptop: PT-LAPTOP-NM-1CFE), insert WMP300N (laptop: WPC300N), power ON. The port is now Wireless0.', 'ПК / ноутбук → Physical: выключить, снять PT-HOST-NM-1CFE (ноутбук: PT-LAPTOP-NM-1CFE), вставить WMP300N (ноутбук: WPC300N), включить. Порт теперь Wireless0.', 'מחשב / נייד → Physical: לכבות, להוציא את PT-HOST-NM-1CFE (נייד: PT-LAPTOP-NM-1CFE), להכניס WMP300N (נייד: WPC300N), להדליק. הפורט עכשיו Wireless0.'],
        ['Connect: Desktop → PC Wireless → Connect → choose the network → Connect → Pre-shared Key; or Config → Wireless0 → SSID, WPA2-PSK, pass phrase. Then IP Configuration → DHCP.', 'Подключение: Desktop → PC Wireless → Connect → выбрать сеть → Connect → Pre-shared Key; или Config → Wireless0 → SSID, WPA2-PSK, пароль. Затем IP Configuration → DHCP.', 'התחברות: ‏Desktop → PC Wireless → Connect → בוחרים רשת → Connect → ‏Pre-shared Key; או Config → Wireless0 → ‏SSID, ‏WPA2-PSK, סיסמה. ואז IP Configuration → DHCP.'],
        ['A network with SSID Broadcast disabled is not in the Connect list: create it on the Profiles tab by its SSID.', 'Сети с выключенным SSID Broadcast нет в списке Connect: создайте её на вкладке Profiles по SSID.', 'רשת עם SSID Broadcast כבוי לא מופיעה ברשימת Connect: יוצרים אותה בלשונית Profiles לפי ה-SSID.'],
      ])),
    lSecAt('Access point and wireless clients', ['Verification and typical mistakes in Packet Tracer', 'Проверка и типичные ошибки в Packet Tracer', 'בדיקה וטעויות נפוצות ב-Packet Tracer'],
      lTable([['You see', 'Что видно', 'מה רואים'], ['Cause', 'Причина', 'סיבה']], [
        [['no dashed line to the access point', 'нет пунктирной линии к точке доступа', 'אין קו מקווקו לנקודת הגישה'], ['SSID, security mode or key differs (SSID is case-sensitive)', 'отличается SSID, тип защиты или ключ (регистр SSID важен)', 'ה-SSID, סוג האבטחה או המפתח שונים (יש הבדל בין אותיות גדולות לקטנות)']],
        [['address 169.254.x.x', 'адрес 169.254.x.x', 'כתובת 169.254.x.x'], ['connected, but no DHCP server answers (AP port in the wrong VLAN, no pool)', 'подключён, но DHCP-сервер не отвечает (порт AP не в том VLAN, нет пула)', 'מחובר, אבל אף שרת DHCP לא עונה (פורט ה-AP ב-VLAN הלא נכון, אין מאגר)']],
        [['"Cannot add a module when the power is on"', '"Cannot add a module when the power is on"', '"Cannot add a module when the power is on"'], ['turn the device off first', 'сначала выключите устройство', 'קודם מכבים את ההתקן']],
        [['LAN works, Internet does not', 'LAN работает, Интернета нет', 'ה-LAN עובד, אין אינטרנט'], ['the Internet port has no address (Status page) or the provider has no route', 'у порта Internet нет адреса (страница Status) или у провайдера нет маршрута', 'לפורט ה-Internet אין כתובת (דף Status) או שלספק אין נתיב']],
      ]),
      lTip(['Practise in Training → Wi-Fi (WLAN): "Home Wi-Fi with a WRT300N" and "Access point in an office LAN"; the big "Network from scratch" lab ends with Wi-Fi guests behind an ACL.',
        'Потренируйтесь в Training → Wi-Fi (WLAN): «Домашний Wi-Fi на WRT300N» и «Точка доступа в офисной сети»; большая лаба «Сеть с нуля» заканчивается Wi-Fi-гостями за ACL.',
        'התאמנו ב-Training → Wi-Fi ‏(WLAN): ‏"Wi-Fi ביתי עם WRT300N" ו-"נקודת גישה ברשת משרדית"; המעבדה הגדולה "רשת מאפס" נגמרת באורחי Wi-Fi מאחורי ACL.'])),
  ],
  quiz: [
    lQ(['What is the default LAN address of the WRT300N in Packet Tracer?', 'Какой адрес LAN у WRT300N в Packet Tracer по умолчанию?', 'מה כתובת ה-LAN של WRT300N ב-Packet Tracer כברירת מחדל?'],
      ['192.168.0.1', '192.168.1.254', '10.0.0.1', '172.16.0.1'], 0,
      ['With a DHCP range from .100, 50 users.', 'С диапазоном DHCP от .100 на 50 пользователей.', 'עם טווח DHCP מ-.100 ל-50 משתמשים.']),
    lQ(['Why does Packet Tracer refuse to insert the WMP300N into a PC?', 'Почему Packet Tracer не даёт вставить WMP300N в ПК?', 'למה Packet Tracer לא מאפשר להכניס WMP300N למחשב?'],
      [['The PC is powered on', 'ПК включён', 'המחשב דלוק'], ['The PC has no IP address', 'У ПК нет IP-адреса', 'למחשב אין כתובת IP'], ['The access point is off', 'Точка доступа выключена', 'נקודת הגישה כבויה'], ['The card is for routers only', 'Карта только для роутеров', 'הכרטיס רק לנתבים']], 0,
      ['Modules are changed only with the power off.', 'Модули меняют только при выключенном питании.', 'מחליפים מודולים רק כשהחשמל כבוי.']),
    lQ(['Which tab of AccessPoint-PT holds the SSID and the WPA2 pass phrase?', 'Где у AccessPoint-PT задаются SSID и пароль WPA2?', 'איפה ב-AccessPoint-PT מגדירים את ה-SSID ואת סיסמת ה-WPA2?'],
      ['Config → Port 1', 'Config → Port 0', 'GUI → Setup', 'Desktop → PC Wireless'], 0,
      ['Port 1 is the radio; Port 0 is the cable to the switch.', 'Port 1 — радио; Port 0 — кабель к коммутатору.', 'Port 1 הוא הרדיו; ‏Port 0 הוא הכבל למתג.']),
    lQ(['The laptop shows no dashed line to the access point. The most likely cause?', 'У ноутбука нет пунктирной линии к точке доступа. Самая вероятная причина?', 'למחשב הנייד אין קו מקווקו לנקודת הגישה. הסיבה הסבירה ביותר?'],
      [['SSID, security or key does not match', 'Не совпадает SSID, защита или ключ', 'ה-SSID, האבטחה או המפתח לא תואמים'], ['No default gateway', 'Нет шлюза', 'אין שער ברירת מחדל'], ['Wrong subnet mask', 'Неверная маска', 'מסכה שגויה'], ['The switch has no VLANs', 'На коммутаторе нет VLAN', 'אין VLAN במתג']], 0,
      ['Association happens at layer 2, before any IP settings matter.', 'Подключение происходит на уровне 2 — до того, как важны IP-настройки.', 'ההתחברות קורית בשכבה 2 — לפני שהגדרות ה-IP משנות משהו.']),
    lQ(['After changing the WRT300N Router IP to 192.168.50.1 a wired PC still has 192.168.0.100. What do you do?', 'После смены Router IP на WRT300N на 192.168.50.1 проводной ПК всё ещё имеет 192.168.0.100. Что делать?', 'אחרי שינוי Router IP ב-WRT300N ל-192.168.50.1 למחשב קווי עדיין יש 192.168.0.100. מה עושים?'],
      [['Renew the lease: DHCP again or ipconfig /renew', 'Обновить аренду: снова DHCP или ipconfig /renew', 'לחדש את החכירה: שוב DHCP או ipconfig /renew'], ['Reload the router', 'Перезагрузить роутер', 'לאתחל את הנתב'], ['Set the IP by hand to 192.168.0.100', 'Вручную поставить 192.168.0.100', 'להגדיר ידנית 192.168.0.100'], ['Change the SSID', 'Сменить SSID', 'לשנות את ה-SSID']], 0,
      ['A client keeps its lease until it renews it.', 'Клиент держит аренду, пока сам её не обновит.', 'לקוח שומר את החכירה עד שהוא מחדש אותה.']),
    lQ(['Which security mode do you choose on the WRT300N for a home network?', 'Какой режим защиты выбрать на WRT300N для домашней сети?', 'איזה מצב אבטחה בוחרים ב-WRT300N לרשת ביתית?'],
      [['WPA2 Personal with AES', 'WPA2 Personal с AES', 'WPA2 Personal עם AES'], ['WEP', 'WEP', 'WEP'], ['Disabled with a hidden SSID', 'Disabled со скрытым SSID', 'Disabled עם SSID מוסתר'], ['WPA2 Enterprise without a RADIUS server', 'WPA2 Enterprise без RADIUS-сервера', 'WPA2 Enterprise בלי שרת RADIUS']], 0,
      ['WEP is broken; a hidden SSID is not security; Enterprise needs RADIUS.', 'WEP взломан; скрытый SSID — не защита; Enterprise требует RADIUS.', 'WEP פרוץ; ‏SSID מוסתר אינו אבטחה; ‏Enterprise דורש RADIUS.']),
    lQ(['How does an AccessPoint-PT give IP addresses to its clients?', 'Как AccessPoint-PT раздаёт IP-адреса своим клиентам?', 'איך AccessPoint-PT נותן כתובות IP ללקוחות שלו?'],
      [['It does not: it is a bridge, the clients use the DHCP server of the LAN', 'Никак: это мост, клиенты пользуются DHCP-сервером LAN', 'הוא לא: זה גשר, הלקוחות משתמשים בשרת ה-DHCP של ה-LAN'], ['From its own DHCP pool', 'Из своего DHCP-пула', 'מהמאגר שלו'], ['With NAT', 'Через NAT', 'עם NAT'], ['Only static addresses work', 'Работают только статические адреса', 'רק כתובות סטטיות עובדות']], 0,
      ['Unlike the WRT300N, the access point has no router inside.', 'В отличие от WRT300N, внутри точки доступа нет роутера.', 'בניגוד ל-WRT300N, בתוך נקודת הגישה אין נתב.']),
  ],
});

G('ensa05', 'ACL sequence number', 'Номер строки ACL', 'מספר שורה ב-ACL',
  'The number in front of each ACL line (10, 20, 30…). "15 permit …" inserts a line, "no 10" deletes one, inside "ip access-list standard|extended <name>".',
  'Номер перед каждой строкой ACL (10, 20, 30…). "15 permit …" вставляет строку, "no 10" удаляет — внутри "ip access-list standard|extended <имя>".',
  'המספר לפני כל שורה ב-ACL ‏(10, 20, 30…). ‏"15 permit …" מכניס שורה, ‏"no 10" מוחק — בתוך "ip access-list standard|extended <שם>".');
G('ensa06', 'NAT pool', 'Пул NAT', 'מאגר NAT',
  'A range of public addresses for dynamic NAT: "ip nat pool <name> <first> <last> netmask <mask>".',
  'Диапазон публичных адресов для динамического NAT: "ip nat pool <имя> <первый> <последний> netmask <маска>".',
  'טווח כתובות ציבוריות ל-NAT דינמי: ‏"ip nat pool <שם> <ראשונה> <אחרונה> netmask <מסכה>".');
G('ensa06', 'ip nat inside / outside', 'ip nat inside / outside', 'ip nat inside / outside',
  'Interface marks: inside — toward the private LAN, outside — toward the provider. NAT works only between the two.',
  'Метки интерфейсов: inside — в сторону частной LAN, outside — к провайдеру. NAT работает только между ними.',
  'סימוני ממשקים: ‏inside — לכיוון ה-LAN הפרטית, ‏outside — לכיוון הספק. ‏NAT עובד רק ביניהם.');
G('srwe13', 'Wireless router', 'Беспроводной роутер', 'נתב אלחוטי',
  'A home device that combines a router (NAT/PAT to the Internet), a switch (LAN ports), an access point and a DHCP server — for example the Linksys WRT300N.',
  'Домашнее устройство, совмещающее роутер (NAT/PAT в Интернет), коммутатор (порты LAN), точку доступа и DHCP-сервер, — например Linksys WRT300N.',
  'התקן ביתי שמשלב נתב (NAT/PAT לאינטרנט), מתג (פורטי LAN), נקודת גישה ושרת DHCP — למשל Linksys WRT300N.');
G('srwe13', 'WPA2 Personal (PSK)', 'WPA2 Personal (PSK)', 'WPA2 Personal ‏(PSK)',
  'Wi-Fi security with one shared pass phrase (8–63 characters) and AES encryption; the usual choice for home and small offices.',
  'Защита Wi-Fi одним общим паролем (8–63 символа) и шифрованием AES; обычный выбор для дома и маленького офиса.',
  'אבטחת Wi-Fi עם סיסמה משותפת אחת (8–63 תווים) והצפנת AES; הבחירה הרגילה לבית ולמשרד קטן.');
G('srwe13', 'Wireless NIC (WMP300N / WPC300N)', 'Беспроводная карта (WMP300N / WPC300N)', 'כרטיס רשת אלחוטי (WMP300N / WPC300N)',
  'The Packet Tracer Wi-Fi modules for a PC (WMP300N) and a laptop (WPC300N); they replace the Fast Ethernet card and are changed only with the power off.',
  'Модули Wi-Fi в Packet Tracer для ПК (WMP300N) и ноутбука (WPC300N); заменяют карту Fast Ethernet и меняются только при выключенном питании.',
  'מודולי ה-Wi-Fi של Packet Tracer למחשב (WMP300N) ולמחשב נייד (WPC300N); הם מחליפים את כרטיס ה-Fast Ethernet ומוחלפים רק כשהחשמל כבוי.');

IV('ensa05', ['How do you configure and place ACLs, and how do you check them?', 'Как вы настраиваете и размещаете ACL и как их проверяете?', 'איך מגדירים וממקמים ACL ואיך בודקים אותם?'],
  ['First I write down the policy: who, to what, which service. A standard ACL checks only the source, so I put it close to the destination; an extended ACL checks source, destination, protocol and port, so I put it close to the source to drop traffic early. I prefer named ACLs: lines get sequence numbers, so I can insert "15 deny …" or delete "no 10" without retyping. I remember that the first match wins and every ACL ends with an implicit deny any, so I add "permit ip any any" when other traffic must pass. I apply it with "ip access-group <name> in|out" on the interface, or "access-class" on vty lines for remote access. To verify I use show access-lists with the match counters, show ip interface for the direction, and real tests — ping, a browser, telnet — that must succeed and that must fail.',
    'Сначала записываю политику: кто, куда, какая служба. Стандартный ACL проверяет только источник, поэтому ставлю его ближе к получателю; расширенный смотрит источник, назначение, протокол и порт, поэтому ставлю его у источника, чтобы отбрасывать трафик пораньше. Предпочитаю именованные ACL: у строк есть номера, можно вставить "15 deny …" или удалить "no 10", не перепечатывая. Помню, что срабатывает первое совпадение и в конце каждого ACL неявный deny any, поэтому добавляю "permit ip any any", если остальной трафик должен проходить. Применяю "ip access-group <имя> in|out" на интерфейсе или "access-class" на линиях vty для удалённого доступа. Проверяю show access-lists со счётчиками совпадений, show ip interface — направление, и реальными тестами — ping, браузер, telnet — что должно проходить и что не должно.',
    'קודם כותבים את המדיניות: מי, לאן, איזה שירות. ‏ACL סטנדרטי בודק רק את המקור, ולכן שמים אותו קרוב ליעד; ‏ACL מורחב בודק מקור, יעד, פרוטוקול ופורט, ולכן שמים אותו ליד המקור כדי לזרוק תעבורה מוקדם. אני מעדיף ACL עם שם: לשורות יש מספרים, אפשר להכניס "15 deny …" או למחוק "no 10" בלי להקליד מחדש. זוכרים שההתאמה הראשונה קובעת ושבסוף כל ACL יש deny any סמוי, ולכן מוסיפים "permit ip any any" כששאר התעבורה צריכה לעבור. מחילים עם "ip access-group <שם> in|out" על הממשק, או "access-class" בקווי vty לגישה מרחוק. בודקים עם show access-lists ומוני ההתאמות, ‏show ip interface לכיוון, ובדיקות אמיתיות — ping, דפדפן, telnet — מה צריך לעבור ומה לא.'], 'iv-acl-pt');
IV('ensa06', ['Static NAT, dynamic NAT and PAT — when and how do you configure each?', 'Статический NAT, динамический NAT и PAT — когда и как настраивать каждый?', 'NAT סטטי, NAT דינמי ו-PAT — מתי ואיך מגדירים כל אחד?'],
  ['All three need "ip nat inside" on the LAN side and "ip nat outside" toward the provider. Static NAT maps one private address to one public address permanently — "ip nat inside source static" — for servers that must be reachable from the Internet. Dynamic NAT gives each inside host a free address from a pool: "ip nat pool", an ACL that matches the inside hosts, and "ip nat inside source list … pool …"; when the pool is empty, new hosts fail. PAT, or NAT overload, lets the whole LAN share one address, told apart by port numbers: "ip nat inside source list … interface … overload" — what every home router does. I verify with show ip nat translations after generating traffic, and show ip nat statistics for hits, misses and the interfaces.',
    'Всем трём нужны "ip nat inside" со стороны LAN и "ip nat outside" к провайдеру. Статический NAT навсегда связывает один частный адрес с одним публичным — "ip nat inside source static" — для серверов, доступных из Интернета. Динамический NAT даёт каждому внутреннему хосту свободный адрес из пула: "ip nat pool", ACL для внутренних хостов и "ip nat inside source list … pool …"; когда пул пуст, новые хосты не выходят. PAT, или NAT overload, позволяет всей LAN делить один адрес, различаясь портами: "ip nat inside source list … interface … overload" — так работает любой домашний роутер. Проверяю show ip nat translations после трафика и show ip nat statistics — hits, misses и интерфейсы.',
    'כל השלושה צריכים "ip nat inside" בצד ה-LAN ו-"ip nat outside" לכיוון הספק. ‏NAT סטטי ממפה כתובת פרטית אחת לכתובת ציבורית אחת לצמיתות — ‏"ip nat inside source static" — לשרתים שצריכים להיות נגישים מהאינטרנט. ‏NAT דינמי נותן לכל מארח פנימי כתובת פנויה ממאגר: ‏"ip nat pool", ‏ACL שמתאים למארחים הפנימיים ו-"ip nat inside source list … pool …"; כשהמאגר ריק, מארחים חדשים נכשלים. ‏PAT, או NAT overload, מאפשר לכל ה-LAN לחלוק כתובת אחת, לפי מספרי פורטים: ‏"ip nat inside source list … interface … overload" — מה שכל נתב ביתי עושה. בודקים עם show ip nat translations אחרי יצירת תעבורה, ו-show ip nat statistics ל-hits, ‏misses והממשקים.'], 'iv-nat-pt');
IV('srwe13', ['How would you set up Wi-Fi for a small office in Packet Tracer?', 'Как бы вы настроили Wi-Fi для маленького офиса в Packet Tracer?', 'איך הייתם מגדירים Wi-Fi למשרד קטן ב-Packet Tracer?'],
  ['With a home-class router like the WRT300N I open the GUI: Basic Setup — the LAN address and the DHCP range, keeping room for static devices; Basic Wireless Settings — a meaningful SSID and a channel; Wireless Security — WPA2 Personal with AES and a long pass phrase; and I change the admin password. In a bigger LAN I use an access point on an access port in the right VLAN — it is only a bridge, so the router or a server gives the addresses. On the clients I install the WMP300N or WPC300N with the power off, connect through PC Wireless with the key, and switch to DHCP. I check the dashed association line, the address, ping to the gateway and a page in the browser; for guests I add an ACL so they reach only the Internet.',
    'С роутером домашнего класса вроде WRT300N открываю GUI: Basic Setup — адрес LAN и диапазон DHCP, оставляя место под статические устройства; Basic Wireless Settings — понятный SSID и канал; Wireless Security — WPA2 Personal с AES и длинным паролем; и меняю пароль администратора. В сети побольше ставлю точку доступа в access-порт нужного VLAN — это только мост, адреса раздаёт роутер или сервер. На клиентах при выключенном питании ставлю WMP300N или WPC300N, подключаюсь через PC Wireless с ключом и включаю DHCP. Проверяю пунктирную линию подключения, адрес, ping до шлюза и страницу в браузере; для гостей добавляю ACL, чтобы они видели только Интернет.',
    'עם נתב ביתי כמו WRT300N פותחים את ה-GUI: ‏Basic Setup — כתובת ה-LAN וטווח ה-DHCP, ומשאירים מקום להתקנים סטטיים; ‏Basic Wireless Settings — ‏SSID ברור וערוץ; ‏Wireless Security — ‏WPA2 Personal עם AES וסיסמה ארוכה; ומחליפים את סיסמת המנהל. ברשת גדולה יותר שמים נקודת גישה בפורט access ב-VLAN הנכון — היא רק גשר, והכתובות מגיעות מהנתב או משרת. בלקוחות מתקינים WMP300N או WPC300N כשהחשמל כבוי, מתחברים דרך PC Wireless עם המפתח ועוברים ל-DHCP. בודקים את קו החיבור המקווקו, הכתובת, ping לשער ודף בדפדפן; לאורחים מוסיפים ACL כדי שיגיעו רק לאינטרנט.'], 'iv-wlan-pt');
