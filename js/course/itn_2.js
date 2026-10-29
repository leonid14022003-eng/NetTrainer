'use strict';
// ITN, модули 5–9: системы счисления, канальный уровень, коммутация Ethernet, сетевой уровень, разрешение адресов.

function bin8(n) { return ('00000000' + (n >>> 0).toString(2)).slice(-8); }
function hex2(n) { return ('0' + n.toString(16).toUpperCase()).slice(-2); }
function lRandMac(rng) {
  const q = () => ('000' + rng.int(0, 0xffff).toString(16)).slice(-4);
  return '00' + ('0' + rng.int(0, 0xff).toString(16)).slice(-2) + '.' + q() + '.' + q();
}

lessonDef({
  id: 'itn05', topic: null, drill: 'binary', minutes: 15,
  title: T('Number Systems', 'Системы счисления', 'שיטות ספירה'),
  goal: T('Binary and hexadecimal: why networks use them and how to convert between binary, decimal and hex quickly.',
    'Двоичная и шестнадцатеричная системы: зачем они в сетях и как быстро переводить между двоичной, десятичной и шестнадцатеричной.',
    'בינארי והקסדצימלי: למה רשתות משתמשות בהם ואיך להמיר במהירות בין בינארי, עשרוני והקסדצימלי.'),
  sections: [
    lSec(['Binary', 'Двоичная система', 'השיטה הבינארית'],
      lP(['Computers work with bits: 0 and 1. An IPv4 address is 32 bits, written as 4 octets of 8 bits. Each bit in an octet has a positional value:',
        'Компьютеры работают с битами: 0 и 1. IPv4-адрес — 32 бита, записанные как 4 октета по 8 бит. У каждого бита в октете своё «весовое» значение:',
        'מחשבים עובדים עם סיביות: 0 ו-1. כתובת IPv4 היא 32 סיביות, שנכתבות כ-4 אוקטטים של 8 סיביות. לכל סיבית באוקטט יש ערך לפי מיקומה:']),
      lCode('Position:   2^7  2^6  2^5  2^4  2^3  2^2  2^1  2^0\nValue:      128   64   32   16    8    4    2    1\n\n11000000 = 128 + 64 = 192\n10101000 = 128 + 32 + 8 = 168'),
      lP(['Binary → decimal: add the values of the positions that have a 1.', 'Двоичное → десятичное: сложите значения позиций, где стоит 1.', 'מבינארי לעשרוני: מחברים את ערכי המיקומים שבהם יש 1.'])),
    lSec(['Decimal to binary', 'Из десятичной в двоичную', 'מעשרוני לבינארי'],
      lP(['Go from 128 down to 1. If the number is greater than or equal to the value, write 1 and subtract; otherwise write 0.',
        'Идите от 128 к 1. Если число больше или равно значению позиции — пишите 1 и вычитайте; иначе пишите 0.',
        'עוברים מ-128 עד 1. אם המספר גדול או שווה לערך — כותבים 1 ומחסירים; אחרת כותבים 0.']),
      lCode('172:  172-128=44 ->1 | 44<64 ->0 | 44-32=12 ->1 | 12<16 ->0\n      12-8=4 ->1   | 4-4=0 ->1  | 0<2 ->0      | 0<1 ->0\n172 = 10101100'),
      lTip(['Learn the mask octets by heart: 128, 192, 224, 240, 248, 252, 254, 255 — they are 1, 2, 3 … 8 ones from the left.',
        'Выучите октеты масок наизусть: 128, 192, 224, 240, 248, 252, 254, 255 — это 1, 2, 3 … 8 единиц слева.',
        'כדאי לזכור בעל פה את אוקטטי המסכה: 128, 192, 224, 240, 248, 252, 254, 255 — אלה 1, 2, 3 … 8 אחדות משמאל.'])),
    lSec(['Hexadecimal', 'Шестнадцатеричная система', 'השיטה ההקסדצימלית'],
      lP(['Hex is base 16: digits 0–9 and A–F (A=10 … F=15). One hex digit = exactly 4 bits, so 8 bits = 2 hex digits. MAC addresses and IPv6 addresses are written in hex.',
        'Шестнадцатеричная система — основание 16: цифры 0–9 и A–F (A=10 … F=15). Одна hex-цифра = ровно 4 бита, значит 8 бит = 2 hex-цифры. MAC- и IPv6-адреса записываются в hex.',
        'הקסדצימלי הוא בסיס 16: הספרות 0–9 ו-A–F ‏(A=10 … F=15). ספרה הקסדצימלית אחת = בדיוק 4 סיביות, ולכן 8 סיביות = 2 ספרות. כתובות MAC וכתובות IPv6 נכתבות בהקסדצימלי.']),
      lTable(['Dec', 'Hex', 'Binary'], [
        ['0', '0', '0000'], ['5', '5', '0101'], ['9', '9', '1001'], ['10', 'A', '1010'], ['12', 'C', '1100'], ['15', 'F', '1111'],
      ]),
      lCode('Hex -> decimal:   0x2A = 2*16 + 10 = 42\nDecimal -> hex:  200 = 12*16 + 8  -> C8\nHex -> binary:   C8 = 1100 1000')),
  ],
  quiz: [
    lQ(['How many bits are in one octet?', 'Сколько бит в одном октете?', 'כמה סיביות יש באוקטט אחד?'], ['8', '4', '16', '32'], 0,
      ['An octet = 8 bits; an IPv4 address = 4 octets = 32 bits.', 'Октет — 8 бит; IPv4-адрес — 4 октета = 32 бита.', 'אוקטט = 8 סיביות; כתובת IPv4 = ‏4 אוקטטים = 32 סיביות.']),
    lQ(['What is the largest decimal value of one octet?', 'Какое наибольшее десятичное значение одного октета?', 'מהו הערך העשרוני הגדול ביותר של אוקטט?'], ['255', '256', '128', '999'], 0,
      ['11111111 = 128+64+32+16+8+4+2+1 = 255.', '11111111 = 128+64+32+16+8+4+2+1 = 255.', '‏11111111 = 128+64+32+16+8+4+2+1 = 255.']),
    lQ(['How many bits does one hexadecimal digit represent?', 'Сколько бит представляет одна шестнадцатеричная цифра?', 'כמה סיביות מייצגת ספרה הקסדצימלית אחת?'], ['4', '8', '2', '16'], 0,
      ['0000 to 1111 = 0 to F.', 'От 0000 до 1111 = от 0 до F.', 'מ-0000 עד 1111 = מ-0 עד F.']),
    lQ(['Which value does the hex digit F have?', 'Какое значение у шестнадцатеричной цифры F?', 'מה ערכה של הספרה ההקסדצימלית F?'], ['15', '16', '14', '10'], 0,
      ['A=10, B=11, C=12, D=13, E=14, F=15.', 'A=10, B=11, C=12, D=13, E=14, F=15.', '‏A=10, B=11, C=12, D=13, E=14, F=15.']),
    lQ(['Which addresses are written in hexadecimal?', 'Какие адреса записываются в шестнадцатеричном виде?', 'אילו כתובות נכתבות בהקסדצימלי?'],
      [['MAC and IPv6 addresses', 'MAC- и IPv6-адреса', 'כתובות MAC וכתובות IPv6'], ['IPv4 addresses', 'IPv4-адреса', 'כתובות IPv4'], ['Port numbers', 'Номера портов', 'מספרי פורטים'], ['Phone numbers', 'Номера телефонов', 'מספרי טלפון']], 0,
      ['IPv4 is written in dotted decimal.', 'IPv4 записывается в десятичном виде с точками.', 'IPv4 נכתבת בעשרוני עם נקודות.']),
    lQ(['What is 11111100 in decimal?', 'Чему равно 11111100 в десятичной системе?', 'כמה זה 11111100 בעשרוני?'], ['252', '248', '254', '240'], 0,
      ['128+64+32+16+8+4 = 252 — the last octet of a /30 mask.', '128+64+32+16+8+4 = 252 — последний октет маски /30.', '‏128+64+32+16+8+4 = 252 — האוקטט האחרון במסכת ‎/30.']),
    lQ(['What is 0x10 in decimal?', 'Чему равно 0x10 в десятичной системе?', 'כמה זה 0x10 בעשרוני?'], ['16', '10', '1', '100'], 0,
      ['1×16 + 0 = 16.', '1×16 + 0 = 16.', '‏1×16 + 0 = 16.']),
  ],
  genInQuiz: 3,
  gen: [
    function genDecToBin(rng) {
      const n = rng.int(1, 254), b = [7, 6, 5, 4, 3, 2, 1, 0].map((k) => n ^ (1 << k));
      return lGen(T('What is ' + n + ' in binary?', 'Как записать ' + n + ' в двоичном виде?', 'איך כותבים ' + n + ' בבינארי?'),
        bin8(n), rng.shuffle(b).map(bin8).concat([bin8(n).split('').reverse().join('')]),
        T(n + ' = ' + [128, 64, 32, 16, 8, 4, 2, 1].filter((v) => n & v).join(' + ') + '.', n + ' = ' + [128, 64, 32, 16, 8, 4, 2, 1].filter((v) => n & v).join(' + ') + '.', n + ' = ' + [128, 64, 32, 16, 8, 4, 2, 1].filter((v) => n & v).join(' + ') + '.'));
    },
    function genBinToDec(rng) {
      const n = rng.int(1, 254), sum = [128, 64, 32, 16, 8, 4, 2, 1].filter((v) => n & v).join(' + ');
      return lGen(T('What is ' + bin8(n) + ' in decimal?', 'Чему равно ' + bin8(n) + ' в десятичной системе?', 'כמה זה ' + bin8(n) + ' בעשרוני?'),
        String(n), rng.shuffle([7, 6, 5, 4, 3, 2, 1, 0]).map((k) => String(n ^ (1 << k))),
        T(sum + ' = ' + n + '.', sum + ' = ' + n + '.', sum + ' = ' + n + '.'));
    },
    function genHexToDec(rng) {
      const n = rng.int(16, 255), h = hex2(n), hi = n >> 4, lo = n & 15;
      return lGen(T('What is 0x' + h + ' in decimal?', 'Чему равно 0x' + h + ' в десятичной системе?', 'כמה זה 0x' + h + ' בעשרוני?'),
        String(n), [String(hi * 10 + lo), String((lo << 4) | hi), String(n + 16), String(n - 16), String(n + 1)],
        T(hi + '×16 + ' + lo + ' = ' + n + '.', hi + '×16 + ' + lo + ' = ' + n + '.', hi + '×16 + ' + lo + ' = ' + n + '.'));
    },
    function genDecToHex(rng) {
      const n = rng.int(16, 255), h = hex2(n);
      return lGen(T('What is ' + n + ' in hexadecimal?', 'Как записать ' + n + ' в шестнадцатеричном виде?', 'איך כותבים ' + n + ' בהקסדצימלי?'),
        h, [h[1] + h[0], hex2((n + 16) & 255), hex2((n + 1) & 255), hex2((n - 1) & 255), String(n % 100)],
        T(n + ' = ' + (n >> 4) + '×16 + ' + (n & 15) + ' → ' + h + '.', n + ' = ' + (n >> 4) + '×16 + ' + (n & 15) + ' → ' + h + '.', n + ' = ' + (n >> 4) + '×16 + ' + (n & 15) + ' → ' + h + '.'));
    },
    function genHexToBin(rng) {
      const n = rng.int(16, 255), h = hex2(n);
      return lGen(T('What is 0x' + h + ' in binary?', 'Как записать 0x' + h + ' в двоичном виде?', 'איך כותבים 0x' + h + ' בבינארי?'),
        bin8(n), [bin8(((n & 15) << 4) | (n >> 4)), bin8(n ^ 1), bin8(n ^ 16), bin8(n ^ 128)],
        T('Each hex digit = 4 bits: ' + h[0] + ' = ' + bin8(n).slice(0, 4) + ', ' + h[1] + ' = ' + bin8(n).slice(4) + '.', 'Каждая hex-цифра — 4 бита: ' + h[0] + ' = ' + bin8(n).slice(0, 4) + ', ' + h[1] + ' = ' + bin8(n).slice(4) + '.', 'כל ספרה הקסדצימלית = 4 סיביות: ' + h[0] + ' = ' + bin8(n).slice(0, 4) + ', ' + h[1] + ' = ' + bin8(n).slice(4) + '.'));
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn06', topic: null, minutes: 12,
  title: T('Data Link Layer', 'Канальный уровень', 'שכבת קו הנתונים'),
  goal: T('What Layer 2 does, its two sublayers, topologies, duplex, how devices share the medium and what is inside a frame.',
    'Что делает уровень 2, его два подуровня, топологии, дуплекс, как устройства делят среду и что внутри кадра.',
    'מה עושה שכבה 2, שתי תת-השכבות שלה, טופולוגיות, דופלקס, איך התקנים חולקים את המדיה ומה יש בתוך מסגרת.'),
  sections: [
    lSec(['Purpose of Layer 2', 'Назначение уровня 2', 'תפקיד שכבה 2'],
      lP(['The data link layer prepares packets for the medium: it puts the packet into a frame with Layer 2 addresses, controls access to the medium and detects errors.',
        'Канальный уровень готовит пакеты к передаче по среде: помещает пакет в кадр с адресами 2-го уровня, управляет доступом к среде и обнаруживает ошибки.',
        'שכבת קו הנתונים מכינה חבילות למדיה: עוטפת את החבילה במסגרת עם כתובות שכבה 2, שולטת בגישה למדיה ומזהה שגיאות.']),
      lUL([
        ['LLC sublayer (IEEE 802.2) — talks to the network layer above and says which protocol is inside (IPv4, IPv6).', 'Подуровень LLC (IEEE 802.2) — общается с сетевым уровнем и указывает, какой протокол внутри (IPv4, IPv6).', 'תת-שכבת LLC ‏(IEEE 802.2) — מדברת עם שכבת הרשת ומציינת איזה פרוטוקול נמצא בפנים (IPv4, IPv6).'],
        ['MAC sublayer (802.3 Ethernet, 802.11 Wi-Fi) — addressing and access to the medium.', 'Подуровень MAC (802.3 Ethernet, 802.11 Wi-Fi) — адресация и доступ к среде.', 'תת-שכבת MAC ‏(802.3 Ethernet, ‏802.11 Wi-Fi) — מיעון וגישה למדיה.'],
      ]),
      lP(['Layer 2 addresses are only valid on the local link: at every router the frame is removed and a new one is built for the next link.',
        'Адреса 2-го уровня действуют только на локальном участке: на каждом маршрутизаторе кадр снимается и строится новый для следующего участка.',
        'כתובות שכבה 2 תקפות רק בקטע המקומי: בכל נתב המסגרת מוסרת ונבנית מסגרת חדשה לקטע הבא.'])),
    lSec(['Topologies and duplex', 'Топологии и дуплекс', 'טופולוגיות ודופלקס'],
      lUL([
        ['LAN: star and extended star (switches in the middle). Legacy: bus and ring.', 'LAN: звезда и расширенная звезда (в центре коммутаторы). Устаревшие: шина и кольцо.', 'LAN: כוכב וכוכב מורחב (מתגים במרכז). ותיקות: אפיק (bus) וטבעת.'],
        ['WAN: point-to-point, hub-and-spoke, full or partial mesh.', 'WAN: точка-точка, «звезда» (hub-and-spoke), полная или частичная сетка (mesh).', 'WAN: נקודה-לנקודה, רכזת וחישורים (hub-and-spoke), רשת מלאה או חלקית (mesh).'],
        ['Half-duplex — send OR receive at a time (hubs, Wi-Fi). Full-duplex — send AND receive at the same time (switch ports).', 'Полудуплекс — либо передача, либо приём (хабы, Wi-Fi). Полный дуплекс — передача и приём одновременно (порты коммутатора).', 'חצי דופלקס — או שולחים או מקבלים (רכזות, Wi-Fi). דופלקס מלא — שולחים ומקבלים בו-זמנית (פורטים של מתג).'],
      ])),
    lSec(['Media access control', 'Управление доступом к среде', 'בקרת גישה למדיה'],
      lUL([
        ['Contention-based: devices compete for a shared medium. CSMA/CD — legacy Ethernet with hubs: listen, send, detect collisions, wait a random time. CSMA/CA — Wi-Fi: listen and try to avoid collisions.',
          'Конкурентный доступ: устройства соревнуются за общую среду. CSMA/CD — старый Ethernet с хабами: слушать, передавать, обнаруживать коллизии, ждать случайное время. CSMA/CA — Wi-Fi: слушать и стараться избегать коллизий.',
          'גישה תחרותית: ההתקנים מתחרים על מדיה משותפת. CSMA/CD — ‏Ethernet ותיק עם רכזות: מקשיבים, שולחים, מזהים התנגשויות וממתינים זמן אקראי. CSMA/CA — ‏Wi-Fi: מקשיבים ומנסים להימנע מהתנגשויות.'],
        ['Controlled access: devices take turns (legacy Token Ring).', 'Управляемый доступ: устройства передают по очереди (устаревший Token Ring).', 'גישה מבוקרת: ההתקנים משדרים בתורות (Token Ring הוותיק).'],
        ['Full-duplex switched Ethernet needs no CSMA/CD — there are no collisions.', 'Коммутируемому Ethernet в полном дуплексе CSMA/CD не нужен — коллизий нет.', 'ב-Ethernet ממותג בדופלקס מלא אין צורך ב-CSMA/CD — אין התנגשויות.'],
      ])),
    lSec(['The frame', 'Кадр', 'המסגרת'],
      lTable([['Field', 'Поле', 'שדה'], ['Purpose', 'Назначение', 'תפקיד']], [
        [['Frame start / stop', 'Начало / конец кадра', 'התחלה / סיום מסגרת'], ['Marks where the frame begins and ends', 'Где кадр начинается и заканчивается', 'מסמן היכן המסגרת מתחילה ונגמרת']],
        [['Addressing', 'Адресация', 'מיעון'], ['Source and destination MAC', 'MAC источника и получателя', 'MAC מקור ויעד']],
        [['Type', 'Тип', 'סוג'], ['Which Layer 3 protocol is inside', 'Какой протокол 3-го уровня внутри', 'איזה פרוטוקול שכבה 3 נמצא בפנים']],
        [['Data', 'Данные', 'נתונים'], ['The packet', 'Пакет', 'החבילה']],
        [['Error detection (FCS)', 'Обнаружение ошибок (FCS)', 'זיהוי שגיאות (FCS)'], ['A CRC value; a damaged frame is dropped', 'Значение CRC; повреждённый кадр отбрасывается', 'ערך CRC; מסגרת פגומה נזרקת']],
      ])),
  ],
  quiz: [
    lQ(['Which sublayer handles addressing and access to the medium?', 'Какой подуровень отвечает за адресацию и доступ к среде?', 'איזו תת-שכבה אחראית למיעון ולגישה למדיה?'],
      ['MAC', 'LLC', 'IP', 'TCP'], 0,
      ['LLC talks to the network layer; MAC deals with addressing and the medium.', 'LLC общается с сетевым уровнем; MAC — адресация и среда.', 'LLC מדברת עם שכבת הרשת; MAC אחראית למיעון ולמדיה.']),
    lQ(['What does the FCS field do?', 'Что делает поле FCS?', 'מה עושה השדה FCS?'],
      [['Detects errors in the frame', 'Обнаруживает ошибки в кадре', 'מזהה שגיאות במסגרת'], ['Holds the IP address', 'Содержит IP-адрес', 'מכיל את כתובת ה-IP'], ['Sets the priority', 'Задаёт приоритет', 'קובע עדיפות'], ['Encrypts the data', 'Шифрует данные', 'מצפין את הנתונים']], 0,
      ['The receiver recalculates the CRC; if it differs, the frame is dropped.', 'Получатель пересчитывает CRC; если не совпало — кадр отбрасывается.', 'המקבל מחשב מחדש את ה-CRC; אם יש הבדל — המסגרת נזרקת.']),
    lQ(['Which access method does Wi-Fi use?', 'Какой метод доступа использует Wi-Fi?', 'באיזו שיטת גישה משתמש Wi-Fi?'],
      ['CSMA/CA', 'CSMA/CD', 'Token passing', 'Full-duplex'], 0,
      ['CA = collision avoidance. CSMA/CD is legacy Ethernet with hubs.', 'CA — избегание коллизий. CSMA/CD — старый Ethernet с хабами.', 'CA = הימנעות מהתנגשויות. CSMA/CD הוא Ethernet ותיק עם רכזות.']),
    lQ(['What is full-duplex?', 'Что такое полный дуплекс?', 'מהו דופלקס מלא?'],
      [['Sending and receiving at the same time', 'Передача и приём одновременно', 'שליחה וקבלה בו-זמנית'], ['Sending or receiving, one at a time', 'Либо передача, либо приём', 'או שליחה או קבלה, אחד בכל פעם'], ['Two cables per device', 'Два кабеля на устройство', 'שני כבלים לכל התקן'], ['Sending to all devices', 'Передача всем устройствам', 'שליחה לכל ההתקנים']], 0,
      ['Switch ports normally run full-duplex — no collisions.', 'Порты коммутатора обычно работают в полном дуплексе — коллизий нет.', 'פורטים של מתג עובדים בדרך כלל בדופלקס מלא — אין התנגשויות.']),
    lQ(['Which LAN topology is the most common today?', 'Какая топология LAN самая распространённая сегодня?', 'איזו טופולוגיית LAN הנפוצה ביותר היום?'],
      [['Star / extended star', 'Звезда / расширенная звезда', 'כוכב / כוכב מורחב'], ['Bus', 'Шина', 'אפיק'], ['Ring', 'Кольцо', 'טבעת'], ['Full mesh', 'Полная сетка', 'רשת מלאה']], 0,
      ['End devices connect to a central switch.', 'Оконечные устройства подключены к центральному коммутатору.', 'התקני הקצה מחוברים למתג מרכזי.']),
    lQ(['What happens to Layer 2 addresses when a packet crosses a router?', 'Что происходит с адресами 2-го уровня, когда пакет проходит маршрутизатор?', 'מה קורה לכתובות שכבה 2 כשחבילה עוברת נתב?'],
      [['A new frame with new MAC addresses is built', 'Строится новый кадр с новыми MAC-адресами', 'נבנית מסגרת חדשה עם כתובות MAC חדשות'], ['They stay the same', 'Они не меняются', 'הן נשארות זהות'], ['They become IP addresses', 'Они становятся IP-адресами', 'הן הופכות לכתובות IP'], ['They are encrypted', 'Они шифруются', 'הן מוצפנות']], 0,
      ['MAC addresses are local to one link.', 'MAC-адреса действуют только в пределах одного участка.', 'כתובות MAC מקומיות לקטע אחד.']),
    lQ(['Which field tells which Layer 3 protocol is inside the frame?', 'Какое поле говорит, какой протокол 3-го уровня внутри кадра?', 'איזה שדה מציין איזה פרוטוקול שכבה 3 נמצא במסגרת?'],
      [['Type', 'Тип (Type)', 'סוג (Type)'], ['FCS', 'FCS', 'FCS'], ['Source MAC', 'MAC источника', 'MAC מקור'], ['Preamble', 'Преамбула', 'Preamble']], 0,
      ['For example 0x0800 = IPv4, 0x86DD = IPv6, 0x0806 = ARP.', 'Например, 0x0800 — IPv4, 0x86DD — IPv6, 0x0806 — ARP.', 'לדוגמה 0x0800 = IPv4, ‏0x86DD = IPv6, ‏0x0806 = ARP.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn07', topic: 'basics', minutes: 14,
  title: T('Ethernet Switching', 'Коммутация Ethernet', 'מיתוג Ethernet'),
  goal: T('The Ethernet frame, MAC addresses, how a switch learns and forwards, switching methods and duplex/speed settings.',
    'Кадр Ethernet, MAC-адреса, как коммутатор запоминает и пересылает, методы коммутации и настройки дуплекса и скорости.',
    'מסגרת Ethernet, כתובות MAC, איך מתג לומד ומעביר, שיטות מיתוג והגדרות דופלקס ומהירות.'),
  sections: [
    lSec(['The Ethernet frame', 'Кадр Ethernet', 'מסגרת Ethernet'],
      lTable([['Field', 'Поле', 'שדה'], ['Size', 'Размер', 'גודל']], [
        [['Preamble + SFD', 'Преамбула + SFD', 'Preamble + SFD'], ['8 bytes', '8 байт', '8 בתים']],
        [['Destination MAC', 'MAC получателя', 'MAC יעד'], ['6 bytes', '6 байт', '6 בתים']],
        [['Source MAC', 'MAC источника', 'MAC מקור'], ['6 bytes', '6 байт', '6 בתים']],
        [['Type', 'Тип', 'סוג'], ['2 bytes', '2 байта', '2 בתים']],
        [['Data', 'Данные', 'נתונים'], ['46–1500 bytes', '46–1500 байт', '46–1500 בתים']],
        ['FCS', ['4 bytes', '4 байта', '4 בתים']],
      ]),
      lP(['A frame is 64–1518 bytes (without the preamble). Smaller = runt, larger = giant (jumbo). Both are dropped by default.',
        'Кадр — от 64 до 1518 байт (без преамбулы). Меньше — runt, больше — giant (jumbo). По умолчанию оба отбрасываются.',
        'מסגרת היא 64–1518 בתים (בלי ה-preamble). קטנה יותר = runt, גדולה יותר = giant ‏(jumbo). כברירת מחדל שתיהן נזרקות.'])),
    lSec(['MAC addresses', 'MAC-адреса', 'כתובות MAC'],
      lP(['A MAC address is 48 bits, written as 12 hex digits: 00-1A-2B-3C-4D-5E or 001a.2b3c.4d5e (Cisco). The first 24 bits are the OUI (vendor), the last 24 bits are assigned by the vendor.',
        'MAC-адрес — 48 бит, записанных как 12 hex-цифр: 00-1A-2B-3C-4D-5E или 001a.2b3c.4d5e (Cisco). Первые 24 бита — OUI (производитель), последние 24 назначает производитель.',
        'כתובת MAC היא 48 סיביות שנכתבות כ-12 ספרות הקסדצימליות: 00-1A-2B-3C-4D-5E או 001a.2b3c.4d5e ‏(Cisco). 24 הסיביות הראשונות הן ה-OUI (היצרן), ו-24 האחרונות נקבעות על ידי היצרן.']),
      lUL([
        ['Unicast — one specific NIC.', 'Unicast — одна конкретная сетевая карта.', 'Unicast — כרטיס רשת מסוים אחד.'],
        ['Broadcast — FF-FF-FF-FF-FF-FF, every device in the LAN (e.g. ARP request, DHCP Discover).', 'Broadcast — FF-FF-FF-FF-FF-FF, все устройства LAN (например, ARP-запрос, DHCP Discover).', 'Broadcast — ‏FF-FF-FF-FF-FF-FF, כל ההתקנים ב-LAN (למשל בקשת ARP, ‏DHCP Discover).'],
        ['Multicast — a group: 01-00-5E-… for IPv4, 33-33-… for IPv6.', 'Multicast — группа: 01-00-5E-… для IPv4, 33-33-… для IPv6.', 'Multicast — קבוצה: ‏01-00-5E-… עבור IPv4, ‏33-33-… עבור IPv6.'],
      ])),
    lSec(['How a switch learns and forwards', 'Как коммутатор запоминает и пересылает', 'איך מתג לומד ומעביר'],
      lUL([
        ['Learn: the switch writes the SOURCE MAC and the incoming port into its MAC address table (entries age out after 5 minutes).', 'Запоминание: коммутатор записывает MAC ИСТОЧНИКА и входящий порт в таблицу MAC-адресов (записи устаревают через 5 минут).', 'למידה: המתג רושם את כתובת ה-MAC של המקור ואת פורט הכניסה בטבלת כתובות ה-MAC (רשומות פגות אחרי 5 דקות).'],
        ['Forward: it looks up the DESTINATION MAC. Known → only out that port. Unknown unicast or broadcast → flood out all ports except the incoming one.', 'Пересылка: ищет MAC ПОЛУЧАТЕЛЯ. Известен → только в этот порт. Неизвестный unicast или broadcast → рассылка во все порты, кроме входящего.', 'העברה: המתג מחפש את כתובת ה-MAC של היעד. ידועה → רק לפורט הזה. Unicast לא ידוע או broadcast → הצפה לכל הפורטים חוץ מפורט הכניסה.'],
        ['Filter: if the destination is on the same port the frame came from, the switch drops it.', 'Фильтрация: если получатель на том же порту, откуда пришёл кадр, коммутатор его отбрасывает.', 'סינון: אם היעד נמצא באותו פורט שממנו הגיעה המסגרת, המתג זורק אותה.'],
      ]),
      lCode('S1# show mac address-table\nVlan  Mac Address      Type     Ports\n----  ---------------  -------  -----\n1     0001.4ab2.33c1   DYNAMIC  Fa0/1\n1     0060.5c11.9a02   DYNAMIC  Fa0/2')),
    lSec(['Switching methods and port settings', 'Методы коммутации и настройки портов', 'שיטות מיתוג והגדרות פורט'],
      lUL([
        ['Store-and-forward — receives the whole frame and checks the FCS before forwarding. Cisco default.', 'Store-and-forward — принимает кадр целиком и проверяет FCS перед пересылкой. По умолчанию у Cisco.', 'Store-and-forward — מקבל את כל המסגרת ובודק FCS לפני ההעברה. ברירת המחדל ב-Cisco.'],
        ['Cut-through — starts forwarding after reading the destination MAC (fast-forward) or the first 64 bytes (fragment-free). Faster, no error check.', 'Cut-through — начинает пересылку, прочитав MAC получателя (fast-forward) или первые 64 байта (fragment-free). Быстрее, без проверки ошибок.', 'Cut-through — מתחיל להעביר אחרי קריאת MAC היעד (fast-forward) או 64 הבתים הראשונים (fragment-free). מהיר יותר, בלי בדיקת שגיאות.'],
        ['Speed and duplex are auto-negotiated. A duplex mismatch (one side full, the other half) causes collisions and slow links.', 'Скорость и дуплекс согласуются автоматически. Несовпадение дуплекса (одна сторона full, другая half) даёт коллизии и медленный канал.', 'מהירות ודופלקס נקבעים אוטומטית. אי-התאמת דופלקס (צד אחד מלא, השני חצי) גורמת להתנגשויות ולקישור איטי.'],
        ['Auto-MDIX — the port adapts to straight-through or cross-over cable.', 'Auto-MDIX — порт подстраивается под прямой или перекрёстный кабель.', 'Auto-MDIX — הפורט מתאים את עצמו לכבל ישר או מוצלב.'],
      ])),
  ],
  quiz: [
    lQ(['Which address does a switch LEARN from an incoming frame?', 'Какой адрес коммутатор ЗАПОМИНАЕТ из входящего кадра?', 'איזו כתובת המתג לומד ממסגרת נכנסת?'],
      [['The source MAC', 'MAC источника', 'כתובת ה-MAC של המקור'], ['The destination MAC', 'MAC получателя', 'כתובת ה-MAC של היעד'], ['The source IP', 'IP источника', 'כתובת ה-IP של המקור'], ['The destination IP', 'IP получателя', 'כתובת ה-IP של היעד']], 0,
      ['It learns the source and forwards by the destination.', 'Запоминает источник, пересылает по получателю.', 'הוא לומד את המקור ומעביר לפי היעד.']),
    lQ(['What is the broadcast MAC address?', 'Какой MAC-адрес широковещательный?', 'מהי כתובת ה-MAC של שידור לכולם?'],
      ['FF-FF-FF-FF-FF-FF', '00-00-00-00-00-00', '01-00-5E-00-00-01', '33-33-00-00-00-01'], 0,
      ['01-00-5E… is IPv4 multicast, 33-33… IPv6 multicast.', '01-00-5E… — multicast IPv4, 33-33… — multicast IPv6.', '01-00-5E… הוא multicast של IPv4, ‏33-33… ‏multicast של IPv6.']),
    lQ(['How many bits is a MAC address?', 'Сколько бит в MAC-адресе?', 'כמה סיביות יש בכתובת MAC?'], ['48', '32', '64', '128'], 0,
      ['48 bits = 12 hex digits. IPv4 is 32 bits, IPv6 128.', '48 бит = 12 hex-цифр. IPv4 — 32 бита, IPv6 — 128.', '48 סיביות = 12 ספרות הקסדצימליות. IPv4 היא 32 סיביות, IPv6 ‏128.']),
    lQ(['What does the OUI part of a MAC address identify?', 'Что обозначает часть OUI в MAC-адресе?', 'מה מזהה החלק OUI בכתובת MAC?'],
      [['The vendor', 'Производителя', 'את היצרן'], ['The VLAN', 'VLAN', 'את ה-VLAN'], ['The switch port', 'Порт коммутатора', 'את פורט המתג'], ['The country', 'Страну', 'את המדינה']], 0,
      ['The first 24 bits are the Organizationally Unique Identifier.', 'Первые 24 бита — Organizationally Unique Identifier.', '24 הסיביות הראשונות הן ה-Organizationally Unique Identifier.']),
    lQ(['Which switching method checks the FCS before forwarding?', 'Какой метод коммутации проверяет FCS перед пересылкой?', 'איזו שיטת מיתוג בודקת FCS לפני ההעברה?'],
      ['Store-and-forward', 'Fast-forward', 'Fragment-free', 'Flooding'], 0,
      ['Store-and-forward reads the whole frame first.', 'Store-and-forward сначала принимает кадр целиком.', 'Store-and-forward קורא קודם את כל המסגרת.']),
    lQ(['What is a runt frame?', 'Что такое кадр runt?', 'מהי מסגרת runt?'],
      [['A frame smaller than 64 bytes', 'Кадр меньше 64 байт', 'מסגרת קטנה מ-64 בתים'], ['A frame larger than 1518 bytes', 'Кадр больше 1518 байт', 'מסגרת גדולה מ-1518 בתים'], ['A broadcast frame', 'Широковещательный кадр', 'מסגרת broadcast'], ['A frame with a VLAN tag', 'Кадр с тегом VLAN', 'מסגרת עם תג VLAN']], 0,
      ['Runts are usually the result of collisions and are dropped.', 'Runt обычно результат коллизий и отбрасывается.', 'Runt נגרמת בדרך כלל מהתנגשויות ונזרקת.']),
    lQ(['One side of a link is full-duplex, the other half-duplex. What happens?', 'Одна сторона канала в полном дуплексе, другая — в полудуплексе. Что будет?', 'צד אחד של הקישור בדופלקס מלא והשני בחצי דופלקס. מה יקרה?'],
      [['Collisions and a slow link (duplex mismatch)', 'Коллизии и медленный канал (несовпадение дуплекса)', 'התנגשויות וקישור איטי (אי-התאמת דופלקס)'], ['Nothing, it works perfectly', 'Ничего, всё отлично работает', 'כלום, הכול עובד מצוין'], ['The link goes administratively down', 'Канал уходит в administratively down', 'הקישור עובר ל-administratively down'], ['Broadcasts are blocked', 'Broadcast блокируются', 'שידורים לכולם נחסמים']], 0,
      ['Let both sides auto-negotiate, or set both the same.', 'Пусть обе стороны согласуют автоматически или задайте одинаково.', 'תנו לשני הצדדים לנהל משא ומתן אוטומטי, או הגדירו את שניהם זהה.']),
  ],
  gen: [
    function genSwitchForward(rng) {
      const A = lRandMac(rng), B = lRandMac(rng), C = lRandMac(rng), D = lRandMac(rng);
      const table = [[A, 'Fa0/1'], [B, 'Fa0/2'], [C, 'Fa0/4'], [D, 'Fa0/4']];
      const code = 'Vlan  Mac Address      Type     Ports\n' + table.map(([m, p]) => '1     ' + m + '   DYNAMIC  ' + p).join('\n');
      const kind = rng.int(0, 3);
      let inPort, dst, right, why;
      const fwd = (p) => T('Forward it only out ' + p, 'Переслать только в ' + p, 'להעביר רק דרך ' + p);
      const drop = T('Drop (filter) it', 'Отбросить (отфильтровать)', 'לזרוק (לסנן) אותה');
      if (kind === 0) { inPort = 'Fa0/1'; dst = B; right = fwd('Fa0/2'); why = T('The destination MAC is in the table on Fa0/2.', 'MAC получателя есть в таблице на Fa0/2.', 'כתובת ה-MAC של היעד נמצאת בטבלה ב-Fa0/2.'); }
      else if (kind === 1) { inPort = rng.pick(['Fa0/1', 'Fa0/2']); dst = lRandMac(rng); right = null; why = T('Unknown destination MAC → flood out all ports except the incoming one.', 'Неизвестный MAC получателя → рассылка во все порты, кроме входящего.', 'כתובת MAC יעד לא ידועה → הצפה לכל הפורטים חוץ מפורט הכניסה.'); }
      else if (kind === 2) { inPort = rng.pick(['Fa0/1', 'Fa0/2', 'Fa0/3']); dst = 'ffff.ffff.ffff'; right = null; why = T('Broadcast → flood out all ports except the incoming one.', 'Broadcast → рассылка во все порты, кроме входящего.', 'Broadcast → הצפה לכל הפורטים חוץ מפורט הכניסה.'); }
      else { inPort = 'Fa0/4'; dst = D; right = drop; why = T('The destination is on the same port the frame came in on (Fa0/4), so the switch filters it.', 'Получатель на том же порту, откуда пришёл кадр (Fa0/4), поэтому коммутатор его фильтрует.', 'היעד נמצא באותו פורט שממנו הגיעה המסגרת (Fa0/4), ולכן המתג מסנן אותה.'); }
      const flood = T('Flood it out all ports except ' + inPort, 'Разослать во все порты, кроме ' + inPort, 'להציף לכל הפורטים חוץ מ-' + inPort);
      if (!right) right = flood;
      const q = lGen(T('A frame arrives on ' + inPort + ' with destination MAC ' + dst + '. What does the switch do?', 'Кадр пришёл на ' + inPort + ' с MAC получателя ' + dst + '. Что сделает коммутатор?', 'מסגרת מגיעה ל-' + inPort + ' עם MAC יעד ' + dst + '. מה המתג יעשה?'),
        right, [flood, drop, fwd(kind === 0 ? 'Fa0/4' : 'Fa0/2'), T('Send it back out ' + inPort, 'Отправить обратно в ' + inPort, 'לשלוח אותה בחזרה דרך ' + inPort)], why);
      q.code = code;
      return q;
    },
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn08', topic: 'basics', minutes: 12,
  title: T('Network Layer', 'Сетевой уровень', 'שכבת הרשת'),
  goal: T('What Layer 3 does, the properties of IP, the IPv4 and IPv6 headers, and how hosts and routers decide where to send a packet.',
    'Что делает уровень 3, свойства IP, заголовки IPv4 и IPv6 и как хосты и маршрутизаторы решают, куда отправить пакет.',
    'מה עושה שכבה 3, תכונות IP, כותרות IPv4 ו-IPv6, ואיך מארחים ונתבים מחליטים לאן לשלוח חבילה.'),
  sections: [
    lSec(['What the network layer does', 'Что делает сетевой уровень', 'מה עושה שכבת הרשת'],
      lUL([
        ['Addressing end devices with IP addresses.', 'Адресует оконечные устройства IP-адресами.', 'מיעון התקני קצה בכתובות IP.'],
        ['Encapsulation — adds the IP header to the segment.', 'Инкапсуляция — добавляет IP-заголовок к сегменту.', 'כימוס — מוסיפה כותרת IP למקטע.'],
        ['Routing — routers choose the best path to the destination network.', 'Маршрутизация — маршрутизаторы выбирают лучший путь к сети назначения.', 'ניתוב — נתבים בוחרים את הנתיב הטוב ביותר לרשת היעד.'],
        ['De-encapsulation at the destination host.', 'Деинкапсуляция на хосте-получателе.', 'פריקה (de-encapsulation) אצל מארח היעד.'],
      ]),
      lP(['IP is connectionless (no session is set up), best effort (no delivery guarantee — TCP takes care of that) and media independent (works over copper, fiber, wireless).',
        'IP работает без соединения (сеанс не устанавливается), «по возможности» (best effort — доставка не гарантируется, этим занимается TCP) и не зависит от среды (медь, оптика, радио).',
        'IP הוא ללא חיבור (לא נפתח session), "במאמץ מיטבי" (best effort — אין הבטחת מסירה, TCP דואג לזה) ובלתי תלוי במדיה (נחושת, סיב, אלחוט).'])),
    lSec(['The IPv4 header', 'Заголовок IPv4', 'כותרת IPv4'],
      lTable([['Field', 'Поле', 'שדה'], ['Meaning', 'Значение', 'משמעות']], [
        ['Version', ['4 for IPv4', '4 для IPv4', '4 עבור IPv4']],
        ['DS (DSCP/ECN)', ['Priority for QoS', 'Приоритет для QoS', 'עדיפות עבור QoS']],
        ['TTL', ['Time to Live: −1 at every router; at 0 the packet is dropped (prevents loops)', 'Time to Live: −1 на каждом маршрутизаторе; при 0 пакет отбрасывается (защита от петель)', 'Time to Live: ‏‎−1 בכל נתב; כשמגיע ל-0 החבילה נזרקת (מונע לולאות)']],
        ['Protocol', ['What is inside: 1 = ICMP, 6 = TCP, 17 = UDP', 'Что внутри: 1 — ICMP, 6 — TCP, 17 — UDP', 'מה בפנים: ‏1 = ICMP, ‏6 = TCP, ‏17 = UDP']],
        ['Header checksum', ['Detects errors in the header', 'Обнаруживает ошибки в заголовке', 'מזהה שגיאות בכותרת']],
        [['Source / destination address', 'Адрес источника / получателя', 'כתובת מקור / יעד'], ['32-bit IPv4 addresses', '32-битные IPv4-адреса', 'כתובות IPv4 של 32 סיביות']],
      ])),
    lSec(['IPv6', 'IPv6', 'IPv6'],
      lP(['IPv4 problems: address depletion, NAT breaking end-to-end connectivity, more complexity. IPv6 has 128-bit addresses, no need for NAT and a simpler fixed 40-byte header: Version, Traffic Class, Flow Label, Payload Length, Next Header, Hop Limit (= TTL), source and destination.',
        'Проблемы IPv4: нехватка адресов, NAT ломает сквозную связность, усложнение. У IPv6 128-битные адреса, NAT не нужен и простой фиксированный заголовок 40 байт: Version, Traffic Class, Flow Label, Payload Length, Next Header, Hop Limit (= TTL), источник и получатель.',
        'הבעיות של IPv4: מחסור בכתובות, NAT ששובר קישוריות מקצה לקצה, ומורכבות. ל-IPv6 כתובות של 128 סיביות, אין צורך ב-NAT, וכותרת פשוטה וקבועה של 40 בתים: Version, ‏Traffic Class, ‏Flow Label, ‏Payload Length, ‏Next Header, ‏Hop Limit (= TTL), מקור ויעד.'])),
    lSec(['How a host decides', 'Как решает хост', 'איך המארח מחליט'],
      lUL([
        ['Itself — 127.0.0.1 (loopback).', 'Себе — 127.0.0.1 (loopback).', 'לעצמו — 127.0.0.1 ‏(loopback).'],
        ['Local host — same network: send directly.', 'Локальный хост — та же сеть: отправить напрямую.', 'מארח מקומי — אותה רשת: שולחים ישירות.'],
        ['Remote host — another network: send to the default gateway.', 'Удалённый хост — другая сеть: отправить шлюзу по умолчанию.', 'מארח מרוחק — רשת אחרת: שולחים לשער ברירת המחדל.'],
      ]),
      lP(['A router\'s routing table has directly connected networks, remote networks (static or learned by a routing protocol) and optionally a default route 0.0.0.0/0.',
        'В таблице маршрутизации есть подключённые сети, удалённые сети (статические или от протокола маршрутизации) и, возможно, маршрут по умолчанию 0.0.0.0/0.',
        'בטבלת הניתוב של נתב יש רשתות מחוברות ישירות, רשתות מרוחקות (סטטיות או שנלמדו מפרוטוקול ניתוב) ולפעמים נתיב ברירת מחדל 0.0.0.0/0.']),
      lCode('C:\\> route print          (Windows: the host routing table)\nR1# show ip route         (router)')),
  ],
  quiz: [
    lQ(['IP is called "best effort". What does that mean?', 'IP называют «best effort». Что это значит?', 'IP נקרא "best effort". מה זה אומר?'],
      [['It does not guarantee delivery', 'Он не гарантирует доставку', 'הוא לא מבטיח מסירה'], ['It always delivers', 'Он всегда доставляет', 'הוא תמיד מוסר'], ['It encrypts packets', 'Он шифрует пакеты', 'הוא מצפין חבילות'], ['It needs a session', 'Ему нужен сеанс', 'הוא צריך session']], 0,
      ['Reliability is the job of TCP at Layer 4.', 'Надёжность — задача TCP на уровне 4.', 'האמינות היא התפקיד של TCP בשכבה 4.']),
    lQ(['What happens when the TTL of a packet reaches 0?', 'Что происходит, когда TTL пакета становится 0?', 'מה קורה כשה-TTL של חבילה מגיע ל-0?'],
      [['The router drops it and sends an ICMP Time Exceeded', 'Маршрутизатор отбрасывает его и шлёт ICMP Time Exceeded', 'הנתב זורק אותה ושולח ICMP Time Exceeded'], ['It is delivered faster', 'Его доставляют быстрее', 'היא נמסרת מהר יותר'], ['It is sent back to the source', 'Его отправляют обратно', 'היא נשלחת חזרה למקור'], ['TTL is reset to 255', 'TTL сбрасывается на 255', 'ה-TTL מתאפס ל-255']], 0,
      ['TTL prevents packets from looping forever. traceroute uses this.', 'TTL не даёт пакетам бесконечно ходить по петле. На этом работает traceroute.', 'TTL מונע מחבילות להסתובב בלולאה לנצח. traceroute משתמש בזה.']),
    lQ(['Which Protocol field value means TCP?', 'Какое значение поля Protocol означает TCP?', 'איזה ערך בשדה Protocol מציין TCP?'], ['6', '17', '1', '4'], 0,
      ['1 = ICMP, 6 = TCP, 17 = UDP.', '1 — ICMP, 6 — TCP, 17 — UDP.', '‏1 = ICMP, ‏6 = TCP, ‏17 = UDP.']),
    lQ(['Which IPv6 header field replaces the IPv4 TTL?', 'Какое поле IPv6 заменяет TTL из IPv4?', 'איזה שדה בכותרת IPv6 מחליף את ה-TTL של IPv4?'], ['Hop Limit', 'Flow Label', 'Next Header', 'Traffic Class'], 0,
      ['Hop Limit is decremented by every router, like TTL.', 'Hop Limit уменьшается на каждом маршрутизаторе, как TTL.', 'Hop Limit יורד בכל נתב, בדיוק כמו TTL.']),
    lQ(['How long is an IPv6 address?', 'Какой длины IPv6-адрес?', 'מה אורכה של כתובת IPv6?'], [['128 bits', '128 бит', '128 סיביות'], ['32 bits', '32 бита', '32 סיביות'], ['48 bits', '48 бит', '48 סיביות'], ['64 bits', '64 бита', '64 סיביות']], 0,
      ['IPv6 = 128 bits; IPv4 = 32 bits.', 'IPv6 — 128 бит; IPv4 — 32 бита.', 'IPv6 = ‏128 סיביות; IPv4 = ‏32 סיביות.']),
    lQ(['A host wants to reach a host in another network. Where does it send the packet?', 'Хост хочет достучаться до хоста в другой сети. Куда он отправит пакет?', 'מארח רוצה להגיע למארח ברשת אחרת. לאן הוא שולח את החבילה?'],
      [['To its default gateway', 'Своему шлюзу по умолчанию', 'לשער ברירת המחדל שלו'], ['Directly to the remote host', 'Напрямую удалённому хосту', 'ישירות למארח המרוחק'], ['To the DNS server', 'DNS-серверу', 'לשרת ה-DNS'], ['To every host (broadcast)', 'Всем хостам (broadcast)', 'לכל המארחים (broadcast)']], 0,
      ['Remote destination → default gateway.', 'Удалённый получатель → шлюз по умолчанию.', 'יעד מרוחק → שער ברירת המחדל.']),
    lQ(['Why is IP called media independent?', 'Почему IP называют независимым от среды?', 'למה IP נקרא בלתי תלוי במדיה?'],
      [['It works over copper, fiber and wireless alike', 'Он одинаково работает по меди, оптике и радио', 'הוא עובד באותה צורה על נחושת, סיב ואלחוט'], ['It has no header', 'У него нет заголовка', 'אין לו כותרת'], ['It needs no addresses', 'Ему не нужны адреса', 'הוא לא צריך כתובות'], ['It only works on Ethernet', 'Работает только в Ethernet', 'עובד רק ב-Ethernet']], 0,
      ['Layer 2 adapts the packet to the medium.', 'Уровень 2 приспосабливает пакет к среде.', 'שכבה 2 מתאימה את החבילה למדיה.']),
  ],
});

// ---------------------------------------------------------------
lessonDef({
  id: 'itn09', topic: 'basics', minutes: 10,
  title: T('Address Resolution', 'Разрешение адресов', 'תרגום כתובות'),
  goal: T('How a host finds the MAC address that belongs to an IP address: ARP for IPv4, Neighbor Discovery for IPv6.',
    'Как хост находит MAC-адрес, соответствующий IP-адресу: ARP для IPv4, Neighbor Discovery для IPv6.',
    'איך מארח מוצא את כתובת ה-MAC ששייכת לכתובת IP: ‏ARP עבור IPv4 ו-Neighbor Discovery עבור IPv6.'),
  sections: [
    lSec(['Which MAC goes into the frame', 'Какой MAC попадает в кадр', 'איזו כתובת MAC נכנסת למסגרת'],
      lUL([
        ['Destination in the SAME network → the frame goes to the MAC of the destination host.', 'Получатель в ТОЙ ЖЕ сети → кадр идёт на MAC самого получателя.', 'יעד באותה רשת → המסגרת נשלחת ל-MAC של מארח היעד.'],
        ['Destination in ANOTHER network → the frame goes to the MAC of the default gateway; the IP destination stays the remote host.', 'Получатель в ДРУГОЙ сети → кадр идёт на MAC шлюза по умолчанию; IP получателя остаётся удалённым хостом.', 'יעד ברשת אחרת → המסגרת נשלחת ל-MAC של שער ברירת המחדל; כתובת ה-IP של היעד נשארת של המארח המרוחק.'],
      ])),
    lSec(['ARP', 'ARP', 'ARP'],
      lP(['ARP finds a MAC address for a known IPv4 address. The host first checks its ARP table (cache). If there is no entry:',
        'ARP находит MAC-адрес по известному IPv4-адресу. Сначала хост смотрит свою ARP-таблицу (кэш). Если записи нет:',
        'ARP מוצא כתובת MAC לפי כתובת IPv4 ידועה. קודם המארח בודק את טבלת ה-ARP שלו (מטמון). אם אין רשומה:']),
      lUL([
        ['ARP Request — a broadcast: "Who has 192.168.1.1? Tell 192.168.1.10."', 'ARP Request — broadcast: «У кого 192.168.1.1? Сообщите 192.168.1.10».', 'ARP Request — ‏broadcast: "למי יש 192.168.1.1? תגיד ל-192.168.1.10."'],
        ['ARP Reply — a unicast from the owner: "192.168.1.1 is at 0060.5c11.9a02".', 'ARP Reply — unicast от владельца: «192.168.1.1 — это 0060.5c11.9a02».', 'ARP Reply — ‏unicast מהבעלים: "‏192.168.1.1 נמצא ב-0060.5c11.9a02".'],
        ['Both sides save the mapping; entries time out after a few minutes.', 'Обе стороны сохраняют соответствие; записи устаревают через несколько минут.', 'שני הצדדים שומרים את ההתאמה; הרשומות פגות אחרי כמה דקות.'],
      ]),
      lCode('C:\\> arp -a\n  Internet Address      Physical Address      Type\n  192.168.1.1           00-60-5c-11-9a-02     dynamic\n\nR1# show ip arp'),
      lTip(['The first ping from a Cisco router often shows ".!!!!": the first echo times out while ARP is being resolved.',
        'Первый ping с маршрутизатора Cisco часто показывает «.!!!!»: первый запрос теряется, пока идёт ARP.',
        'ה-ping הראשון מנתב Cisco מציג לעתים קרובות ".!!!!": הבקשה הראשונה פגה בזמן שה-ARP מתבצע.'])),
    lSec(['ARP issues', 'Проблемы ARP', 'בעיות ARP'],
      lUL([
        ['ARP requests are broadcasts — too many hosts in one LAN means a lot of broadcast traffic.', 'ARP-запросы — это broadcast: слишком много хостов в одной LAN — много широковещательного трафика.', 'בקשות ARP הן broadcast — יותר מדי מארחים ב-LAN אחת יוצרים הרבה תעבורת שידור.'],
        ['ARP spoofing (poisoning) — an attacker answers with its own MAC and becomes a man in the middle. Mitigation: Dynamic ARP Inspection (DAI).', 'ARP-спуфинг (отравление) — злоумышленник отвечает своим MAC и становится «человеком посередине». Защита: Dynamic ARP Inspection (DAI).', 'זיוף ARP ‏(ARP poisoning) — תוקף עונה עם ה-MAC שלו והופך ל"אדם באמצע". הגנה: Dynamic ARP Inspection ‏(DAI).'],
      ])),
    lSec(['IPv6 Neighbor Discovery', 'Neighbor Discovery в IPv6', 'Neighbor Discovery ב-IPv6'],
      lP(['IPv6 has no ARP and no broadcast. ICMPv6 Neighbor Discovery does the job with multicast: Neighbor Solicitation (NS) and Neighbor Advertisement (NA) for MAC addresses, Router Solicitation (RS) and Router Advertisement (RA) to find routers.',
        'В IPv6 нет ARP и нет broadcast. Эту работу делает ICMPv6 Neighbor Discovery через multicast: Neighbor Solicitation (NS) и Neighbor Advertisement (NA) — для MAC-адресов, Router Solicitation (RS) и Router Advertisement (RA) — чтобы найти маршрутизаторы.',
        'ב-IPv6 אין ARP ואין broadcast. את העבודה עושה ICMPv6 Neighbor Discovery באמצעות multicast: ‏Neighbor Solicitation ‏(NS) ו-Neighbor Advertisement ‏(NA) לכתובות MAC, ו-Router Solicitation ‏(RS) ו-Router Advertisement ‏(RA) למציאת נתבים.'])),
  ],
  quiz: [
    lQ(['How is an ARP Request sent?', 'Как отправляется ARP Request?', 'איך נשלחת בקשת ARP?'],
      [['As a broadcast', 'Широковещательно', 'כ-broadcast'], ['As a unicast to the gateway', 'Unicast на шлюз', 'כ-unicast לשער'], ['As a multicast', 'Как multicast', 'כ-multicast'], ['It is not sent', 'Не отправляется', 'היא לא נשלחת']], 0,
      ['The host does not know the MAC yet, so it asks everyone. The reply is unicast.', 'Хост ещё не знает MAC, поэтому спрашивает всех. Ответ — unicast.', 'המארח עוד לא יודע את ה-MAC, ולכן שואל את כולם. התשובה היא unicast.']),
    lQ(['What does ARP resolve?', 'Что определяет ARP?', 'מה ARP מתרגם?'],
      [['An IPv4 address to a MAC address', 'IPv4-адрес в MAC-адрес', 'כתובת IPv4 לכתובת MAC'], ['A name to an IP address', 'Имя в IP-адрес', 'שם לכתובת IP'], ['A MAC address to a port', 'MAC-адрес в порт', 'כתובת MAC לפורט'], ['An IPv6 address to IPv4', 'IPv6 в IPv4', 'כתובת IPv6 ל-IPv4']], 0,
      ['Names to IP addresses is DNS.', 'Имена в IP-адреса переводит DNS.', 'שמות לכתובות IP — זה DNS.']),
    lQ(['Which command shows the ARP cache on a Windows PC?', 'Какая команда показывает ARP-кэш на ПК с Windows?', 'איזו פקודה מציגה את מטמון ה-ARP במחשב Windows?'], ['arp -a', 'ipconfig', 'show ip arp', 'netstat'], 0,
      ['On a Cisco router: show ip arp.', 'На маршрутизаторе Cisco: show ip arp.', 'בנתב Cisco: show ip arp.']),
    lQ(['What replaces ARP in IPv6?', 'Что заменяет ARP в IPv6?', 'מה מחליף את ARP ב-IPv6?'],
      [['ICMPv6 Neighbor Discovery (NS/NA)', 'ICMPv6 Neighbor Discovery (NS/NA)', 'ICMPv6 Neighbor Discovery ‏(NS/NA)'], ['DHCPv6', 'DHCPv6', 'DHCPv6'], ['DNS', 'DNS', 'DNS'], ['Broadcast ARP', 'Широковещательный ARP', 'ARP בשידור לכולם']], 0,
      ['IPv6 has no broadcast; ND uses multicast.', 'В IPv6 нет broadcast; ND использует multicast.', 'ב-IPv6 אין broadcast; ‏ND משתמש ב-multicast.']),
    lQ(['What is ARP spoofing?', 'Что такое ARP-спуфинг?', 'מהו זיוף ARP?'],
      [['An attacker answers ARP with its own MAC to intercept traffic', 'Злоумышленник отвечает на ARP своим MAC, чтобы перехватывать трафик', 'תוקף עונה ל-ARP עם ה-MAC שלו כדי ליירט תעבורה'], ['A very fast ARP', 'Очень быстрый ARP', 'ARP מהיר מאוד'], ['ARP over Wi-Fi', 'ARP по Wi-Fi', 'ARP דרך Wi-Fi'], ['Deleting the ARP table', 'Удаление ARP-таблицы', 'מחיקת טבלת ה-ARP']], 0,
      ['Dynamic ARP Inspection on switches stops it.', 'Это останавливает Dynamic ARP Inspection на коммутаторах.', 'Dynamic ARP Inspection במתגים עוצר את זה.']),
    lQ(['Why does the first ping from a router often show ".!!!!"?', 'Почему первый ping с маршрутизатора часто показывает «.!!!!»?', 'למה ה-ping הראשון מנתב מציג לעתים קרובות ".!!!!"?'],
      [['The first echo is lost while ARP resolves the MAC', 'Первый запрос теряется, пока ARP определяет MAC', 'הבקשה הראשונה הולכת לאיבוד בזמן ש-ARP מברר את ה-MAC'], ['The cable is bad', 'Плохой кабель', 'הכבל פגום'], ['The router is overloaded', 'Маршрутизатор перегружен', 'הנתב עמוס'], ['DNS failed', 'Не сработал DNS', 'ה-DNS נכשל']], 0,
      ['Later pings already find the MAC in the ARP cache.', 'Следующие ping уже находят MAC в ARP-кэше.', 'ה-ping-ים הבאים כבר מוצאים את ה-MAC במטמון.']),
  ],
  gen: [
    function genArpTarget(rng) {
      const len = rng.pick([24, 24, 25, 26, 27]), size = Math.pow(2, 32 - len);
      const third = rng.int(1, 250), base = ipToInt('192.168.' + third + '.0');
      const n = base + size * rng.int(0, 256 / size - 1);
      const gw = intToIp(n + 1), pc = intToIp(n + rng.int(2, Math.min(size - 2, 30)));
      const local = rng.chance(0.5);
      let dst;
      if (local) { do { dst = intToIp(n + rng.int(2, size - 2)); } while (dst === pc); }
      else dst = len < 24 || rng.chance(0.5) ? '192.168.' + ((third + rng.int(1, 4)) % 250 + 1) + '.' + rng.int(1, 254) : intToIp((n + size + rng.int(1, size - 2)) >>> 0);
      const dMac = T('The MAC of ' + dst, 'MAC хоста ' + dst, 'ה-MAC של ' + dst);
      const gMac = T('The MAC of the default gateway ' + gw, 'MAC шлюза по умолчанию ' + gw, 'ה-MAC של שער ברירת המחדל ' + gw);
      return lGen(T('PC1 is ' + pc + '/' + len + ' with gateway ' + gw + '. It sends a packet to ' + dst + '. Which destination MAC is in the frame?',
        'PC1 — ' + pc + '/' + len + ', шлюз ' + gw + '. Он отправляет пакет на ' + dst + '. Какой MAC получателя будет в кадре?',
        'PC1 הוא ' + pc + '/' + len + ' עם שער ' + gw + '. הוא שולח חבילה ל-' + dst + '. איזו כתובת MAC של יעד תהיה במסגרת?'),
        local ? dMac : gMac, [local ? gMac : dMac, T('FFFF.FFFF.FFFF (broadcast)', 'FFFF.FFFF.FFFF (broadcast)', 'FFFF.FFFF.FFFF ‏(broadcast)'), T('PC1\'s own MAC', 'Собственный MAC PC1', 'ה-MAC של PC1 עצמו')],
        local ? T(dst + ' is in the same subnet (' + intToIp(n) + '/' + len + '), so PC1 sends directly.', dst + ' в той же подсети (' + intToIp(n) + '/' + len + '), поэтому PC1 шлёт напрямую.', dst + ' באותה תת-רשת (' + intToIp(n) + '/' + len + '), ולכן PC1 שולח ישירות.')
          : T(dst + ' is outside ' + intToIp(n) + '/' + len + ', so the frame goes to the gateway.', dst + ' вне подсети ' + intToIp(n) + '/' + len + ', поэтому кадр идёт на шлюз.', dst + ' מחוץ ל-' + intToIp(n) + '/' + len + ', ולכן המסגרת נשלחת לשער.'));
    },
  ],
});
