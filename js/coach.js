'use strict';
// Наставник для заданий Training: разбор каждой неудачной проверки (что не так, почему это важно, как исправить)
// и пошаговое решение похожего задания с пояснением к каждой команде.

// ---------- Пояснения к командам IOS ----------
const CMD_NOTES = [
  // ACL
  [/^access-list (\d+) remark (.+)/, (m) => T('A comment in ACL ' + m[1] + ' — it filters nothing, it only explains the lines.', 'Комментарий в ACL ' + m[1] + ' — ничего не фильтрует, только поясняет строки.', 'הערה ב-ACL ' + m[1] + ' — לא מסננת כלום, רק מסבירה את השורות.')],
  [/^access-list (\d+) (permit|deny) (.+)/, (m) => { const n = Number(m[1]), std = n < 100 || (n >= 1300 && n < 2000); const a = m[2] === 'permit';
    return T('Adds a line to ' + (std ? 'standard' : 'extended') + ' ACL ' + n + ': ' + (a ? 'permit' : 'drop') + ' packets matching "' + m[3] + '"' + (std ? ' (a standard ACL looks only at the source address)' : '') + '. Lines are checked top-down, the first match wins; an invisible "deny any" ends the list.',
      'Добавляет строку в ' + (std ? 'стандартный' : 'расширенный') + ' ACL ' + n + ': ' + (a ? 'разрешить' : 'отбросить') + ' пакеты, подходящие под "' + m[3] + '"' + (std ? ' (стандартный ACL смотрит только на адрес источника)' : '') + '. Строки проверяются сверху вниз, срабатывает первая подходящая; в конце — невидимый "deny any".',
      'מוסיף שורה ל-ACL ' + (std ? 'סטנדרטי' : 'מורחב') + ' ' + n + ': ' + (a ? 'להתיר' : 'לזרוק') + ' חבילות שמתאימות ל-"' + m[3] + '"' + (std ? ' (ACL סטנדרטי בודק רק את כתובת המקור)' : '') + '. השורות נבדקות מלמעלה למטה, ההתאמה הראשונה קובעת; בסוף יש "deny any" בלתי נראה.'); }],
  [/^no access-list (\d+)/, (m) => T('Deletes the WHOLE ACL ' + m[1] + ' (all its lines), not one line.', 'Удаляет ВЕСЬ ACL ' + m[1] + ' (все строки), а не одну строку.', 'מוחק את כל ה-ACL ‏' + m[1] + ' (כל השורות), לא שורה אחת.')],
  [/^ip access-list (standard|extended) (\S+)/, (m) => T('Create or edit the named ' + m[1] + ' ACL "' + m[2] + '" (prompt config-' + (m[1] === 'standard' ? 'std' : 'ext') + '-nacl). Lines get numbers 10, 20, 30… and can be inserted or deleted one by one.', 'Создать или изменить именованный ' + (m[1] === 'standard' ? 'стандартный' : 'расширенный') + ' ACL "' + m[2] + '" (режим config-' + (m[1] === 'standard' ? 'std' : 'ext') + '-nacl). Строки получают номера 10, 20, 30… и их можно вставлять и удалять по одной.', 'יצירה או עריכה של ACL ' + (m[1] === 'standard' ? 'סטנדרטי' : 'מורחב') + ' בשם "' + m[2] + '" (מצב config-' + (m[1] === 'standard' ? 'std' : 'ext') + '-nacl). השורות מקבלות מספרים 10, 20, 30… ואפשר להכניס ולמחוק אותן אחת-אחת.')],
  [/^(\d+) (permit|deny) (.+)/, (m) => T('Line number ' + m[1] + ': ' + (m[2] === 'permit' ? 'permit' : 'drop') + ' "' + m[3] + '". The number puts it exactly between the existing lines.', 'Строка с номером ' + m[1] + ': ' + (m[2] === 'permit' ? 'разрешить' : 'отбросить') + ' "' + m[3] + '". Номер ставит её точно между существующими строками.', 'שורה מספר ' + m[1] + ': ' + (m[2] === 'permit' ? 'להתיר' : 'לזרוק') + ' "' + m[3] + '". המספר ממקם אותה בדיוק בין השורות הקיימות.')],
  [/^(permit|deny) (.+)/, (m) => T('Next line of this ACL: ' + (m[1] === 'permit' ? 'permit' : 'drop') + ' "' + m[2] + '" (gets the next number, +10).', 'Следующая строка этого ACL: ' + (m[1] === 'permit' ? 'разрешить' : 'отбросить') + ' "' + m[2] + '" (получит следующий номер, +10).', 'השורה הבאה ב-ACL הזה: ' + (m[1] === 'permit' ? 'להתיר' : 'לזרוק') + ' "' + m[2] + '" (מקבלת את המספר הבא, ‎+10).')],
  [/^no (\d+)$/, (m) => T('Delete line ' + m[1] + ' of this ACL; the other lines stay.', 'Удалить строку ' + m[1] + ' этого ACL; остальные строки остаются.', 'מחיקת שורה ' + m[1] + ' ב-ACL הזה; שאר השורות נשארות.')],
  [/^remark (.+)/, () => T('A comment inside the ACL.', 'Комментарий внутри ACL.', 'הערה בתוך ה-ACL.')],
  [/^ip access-group (\S+) (in|out)/, (m) => T('Apply ACL ' + m[1] + ' to this interface for ' + (m[2] === 'in' ? 'packets coming IN (before routing)' : 'packets going OUT (after routing)') + '. One ACL per interface, per direction.', 'Применить ACL ' + m[1] + ' к этому интерфейсу для ' + (m[2] === 'in' ? 'ВХОДЯЩИХ пакетов (до маршрутизации)' : 'ИСХОДЯЩИХ пакетов (после маршрутизации)') + '. Один ACL на интерфейс в каждом направлении.', 'החלת ACL ‏' + m[1] + ' על הממשק הזה עבור ' + (m[2] === 'in' ? 'חבילות נכנסות (לפני הניתוב)' : 'חבילות יוצאות (אחרי הניתוב)') + '. ‏ACL אחד לממשק בכל כיוון.')],
  [/^no ip access-group (\S+) (in|out)/, (m) => T('Remove ACL ' + m[1] + ' from this interface (' + m[2] + '); the ACL itself stays in the configuration.', 'Снять ACL ' + m[1] + ' с этого интерфейса (' + m[2] + '); сам ACL остаётся в конфигурации.', 'הסרת ACL ‏' + m[1] + ' מהממשק (' + m[2] + '); ה-ACL עצמו נשאר בתצורה.')],
  [/^access-class (\S+) in/, (m) => T('Only hosts permitted by ACL ' + m[1] + ' may log in to these vty lines (Telnet/SSH). Transit traffic is not affected.', 'Входить на эти линии vty (Telnet/SSH) могут только хосты, разрешённые ACL ' + m[1] + '. Транзитный трафик не затрагивается.', 'רק מארחים ש-ACL ‏' + m[1] + ' מתיר יכולים להתחבר לקווי ה-vty האלה (Telnet/SSH). תעבורה עוברת לא מושפעת.')],
  [/^transport input (\S+)/, (m) => T('Protocols allowed on these lines: ' + m[1] + '.', 'Разрешённые на линиях протоколы: ' + m[1] + '.', 'הפרוטוקולים המותרים בקווים: ' + m[1] + '.')],
  // NAT
  [/^ip nat inside$/, () => T('This interface faces the private LAN (inside): packets from here get their source translated on the way out.', 'Этот интерфейс смотрит в частную LAN (inside): у пакетов отсюда на выходе подменяется адрес источника.', 'הממשק הזה פונה ל-LAN הפרטית (inside): לחבילות מכאן מתורגמת כתובת המקור ביציאה.')],
  [/^ip nat outside$/, () => T('This interface faces the provider (outside): translations happen when packets cross between inside and outside.', 'Этот интерфейс смотрит к провайдеру (outside): трансляция происходит, когда пакет переходит между inside и outside.', 'הממשק הזה פונה לספק (outside): התרגום קורה כשחבילה עוברת בין inside ל-outside.')],
  [/^no ip nat (inside|outside)$/, (m) => T('Remove the "' + m[1] + '" mark from this interface.', 'Снять метку "' + m[1] + '" с этого интерфейса.', 'הסרת הסימון "' + m[1] + '" מהממשק.')],
  [/^ip nat pool (\S+) (\S+) (\S+)/, (m) => T('Pool ' + m[1] + ' of public addresses (inside global) ' + m[2] + ' – ' + m[3] + '.', 'Пул ' + m[1] + ' публичных адресов (inside global) ' + m[2] + ' – ' + m[3] + '.', 'מאגר ' + m[1] + ' של כתובות ציבוריות (inside global) ‏' + m[2] + ' – ' + m[3] + '.')],
  [/^ip nat inside source list (\S+) interface (\S+) overload/, (m) => T('PAT: hosts permitted by ACL ' + m[1] + ' go out with the address of ' + m[2] + '; "overload" lets them all share it, told apart by port numbers.', 'PAT: хосты, разрешённые ACL ' + m[1] + ', выходят под адресом ' + m[2] + '; "overload" позволяет всем делить его, различая по номерам портов.', 'PAT: מארחים ש-ACL ‏' + m[1] + ' מתיר יוצאים עם הכתובת של ' + m[2] + '; ‏"overload" מאפשר לכולם לחלוק אותה, לפי מספרי פורטים.')],
  [/^ip nat inside source list (\S+) pool (\S+) overload/, (m) => T('PAT with pool ' + m[2] + ': hosts of ACL ' + m[1] + ' share the pool addresses, told apart by ports.', 'PAT с пулом ' + m[2] + ': хосты из ACL ' + m[1] + ' делят адреса пула, различаясь портами.', 'PAT עם המאגר ' + m[2] + ': המארחים של ACL ‏' + m[1] + ' חולקים את כתובות המאגר, לפי פורטים.')],
  [/^ip nat inside source list (\S+) pool (\S+)$/, (m) => T('Dynamic NAT: every host permitted by ACL ' + m[1] + ' takes one free address of pool ' + m[2] + ' while it talks.', 'Динамический NAT: каждый хост, разрешённый ACL ' + m[1] + ', занимает на время работы один свободный адрес пула ' + m[2] + '.', 'NAT דינמי: כל מארח ש-ACL ‏' + m[1] + ' מתיר תופס כתובת פנויה אחת מהמאגר ' + m[2] + ' בזמן שהוא מתקשר.')],
  [/^ip nat inside source static (\S+) (\S+)$/, (m) => T('Static NAT: ' + m[1] + ' always appears outside as ' + m[2] + ' — and outside hosts can reach it at ' + m[2] + '.', 'Статический NAT: ' + m[1] + ' всегда виден снаружи как ' + m[2] + ' — и снаружи до него можно достучаться по ' + m[2] + '.', 'NAT סטטי: ‏' + m[1] + ' תמיד נראה מבחוץ כ-' + m[2] + ' — ומבחוץ אפשר להגיע אליו בכתובת ' + m[2] + '.')],
  // Spanning Tree и EtherChannel
  [/^spanning-tree vlan (\S+) root primary/, (m) => T('Make this switch the root for VLAN ' + m[1] + ': IOS sets priority 24576 (or 4096 below the current root).', 'Сделать этот коммутатор корнем для VLAN ' + m[1] + ': IOS ставит приоритет 24576 (или на 4096 ниже нынешнего корня).', 'להפוך את המתג הזה ל-root של VLAN ' + m[1] + ': ה-IOS קובע priority ‏24576 (או 4096 פחות מה-root הנוכחי).')],
  [/^spanning-tree vlan (\S+) root secondary/, (m) => T('Backup root for VLAN ' + m[1] + ': priority 28672 — it takes over if the root fails.', 'Резервный корень для VLAN ' + m[1] + ': приоритет 28672 — заменит корень, если тот откажет.', 'root גיבוי ל-VLAN ' + m[1] + ': ‏priority ‏28672 — מחליף את ה-root אם הוא נופל.')],
  [/^spanning-tree vlan (\S+) priority (\d+)/, (m) => T('Bridge priority ' + m[2] + ' for VLAN ' + m[1] + ' (a multiple of 4096; the lowest wins).', 'Приоритет моста ' + m[2] + ' для VLAN ' + m[1] + ' (кратен 4096; побеждает наименьший).', 'priority של הגשר ' + m[2] + ' ל-VLAN ' + m[1] + ' (כפולה של 4096; הנמוך מנצח).')],
  [/^no spanning-tree vlan (\S+)$/, (m) => T('Turns Spanning Tree OFF for VLAN ' + m[1] + ': with redundant links the loop is no longer broken — a broadcast storm.', 'Выключает Spanning Tree для VLAN ' + m[1] + ': при резервных каналах петля больше не разрывается — широковещательный шторм.', 'מכבה את Spanning Tree ל-VLAN ' + m[1] + ': עם קישורים מיותרים הלולאה כבר לא נשברת — סופת broadcast.')],
  [/^spanning-tree vlan (\S+)$/, (m) => T('Turn Spanning Tree back on for VLAN ' + m[1] + ': it blocks one port of every loop again.', 'Снова включить Spanning Tree для VLAN ' + m[1] + ': он опять блокирует по порту в каждой петле.', 'להפעיל מחדש את Spanning Tree ל-VLAN ' + m[1] + ': הוא שוב חוסם פורט אחד בכל לולאה.')],
  [/^spanning-tree mode mst/, () => T('MST (802.1s): many VLANs share a few trees (instances); it converges fast like RSTP.', 'MST (802.1s): много VLAN делят несколько деревьев (экземпляров); сходится быстро, как RSTP.', 'MST ‏(802.1s): הרבה VLAN חולקים כמה עצים (מופעים); מתכנס מהר כמו RSTP.')],
  [/^spanning-tree mst configuration/, () => T('Enter the MST region settings (config-mst); the changes apply on exit.', 'Войти в настройки региона MST (config-mst); изменения применятся при exit.', 'כניסה להגדרות אזור ה-MST ‏(config-mst); השינויים נכנסים לתוקף ב-exit.')],
  [/^spanning-tree mst (\d+) root primary/, (m) => T('Make this switch the root of MST instance ' + m[1] + ' (priority 24576 or 4096 below the current root).', 'Сделать этот коммутатор корнем экземпляра MST ' + m[1] + ' (приоритет 24576 или на 4096 ниже нынешнего корня).', 'להפוך את המתג הזה ל-root של מופע MST ' + m[1] + ' ‏(priority ‏24576 או 4096 פחות מה-root הנוכחי).')],
  [/^spanning-tree mst (\d+) root secondary/, (m) => T('Backup root of MST instance ' + m[1] + ' (priority 28672).', 'Резервный корень экземпляра MST ' + m[1] + ' (приоритет 28672).', 'root גיבוי של מופע MST ' + m[1] + ' ‏(priority ‏28672).')],
  [/^spanning-tree mst (\d+) priority (\d+)/, (m) => T('Priority ' + m[2] + ' for MST instance ' + m[1] + ' (a multiple of 4096).', 'Приоритет ' + m[2] + ' для экземпляра MST ' + m[1] + ' (кратен 4096).', 'priority ' + m[2] + ' למופע MST ' + m[1] + ' (כפולה של 4096).')],
  [/^revision (\d+)/, (m) => T('Region revision ' + m[1] + ' — the same number on every switch of the region.', 'Ревизия региона ' + m[1] + ' — одинаковая на всех коммутаторах региона.', 'revision ' + m[1] + ' של האזור — אותו מספר בכל מתגי האזור.')],
  [/^instance (\d+) vlan (.+)/, (m) => T('MST instance ' + m[1] + ' carries VLANs ' + m[2] + ' — they share one tree.', 'Экземпляр MST ' + m[1] + ' несёт VLAN ' + m[2] + ' — у них одно дерево на всех.', 'מופע MST ' + m[1] + ' נושא את ה-VLAN ' + m[2] + ' — יש להם עץ אחד משותף.')],
  [/^no spanning-tree vlan (\S+) (priority|root)/, (m) => T('Back to the default priority 32768 for VLAN ' + m[1] + '.', 'Вернуть приоритет по умолчанию 32768 для VLAN ' + m[1] + '.', 'חזרה ל-priority ברירת המחדל 32768 ל-VLAN ' + m[1] + '.')],
  [/^spanning-tree mode rapid-pvst/, () => T('Rapid PVST+ (802.1w): a separate fast spanning tree for every VLAN.', 'Rapid PVST+ (802.1w): отдельное быстрое дерево для каждого VLAN.', 'Rapid PVST+ ‏(802.1w): עץ מהיר נפרד לכל VLAN.')],
  [/^spanning-tree portfast bpduguard default/, () => T('BPDU Guard on every PortFast port of this switch.', 'BPDU Guard на всех портах этого коммутатора с PortFast.', 'BPDU Guard בכל הפורטים עם PortFast במתג הזה.')],
  [/^spanning-tree portfast/, () => T('PortFast: a port to a PC goes straight to forwarding — no 30-second wait.', 'PortFast: порт к ПК сразу начинает передавать — без ожидания 30 секунд.', 'PortFast: פורט למחשב עובר מיד להעברה — בלי המתנה של 30 שניות.')],
  [/^spanning-tree bpduguard enable/, () => T('BPDU Guard: if a switch is plugged in here, the port goes err-disabled.', 'BPDU Guard: если сюда воткнут коммутатор, порт уйдёт в err-disabled.', 'BPDU Guard: אם מחברים לכאן מתג, הפורט עובר ל-err-disabled.')],
  [/^no spanning-tree bpduguard/, () => T('Remove BPDU Guard from this port.', 'Убрать BPDU Guard с этого порта.', 'הסרת BPDU Guard מהפורט הזה.')],
  [/^no spanning-tree portfast/, () => T('Remove PortFast — a port to another switch must not be an edge port.', 'Убрать PortFast — порт к другому коммутатору не должен быть edge-портом.', 'הסרת PortFast — פורט שמחובר למתג אחר לא יכול להיות edge.')],
  [/^interface port-channel ?(\d+)/i, (m) => T('Logical interface Port-channel' + m[1] + ': its switchport settings are copied to all ports of the bundle.', 'Логический интерфейс Port-channel' + m[1] + ': его настройки switchport переносятся на все порты пучка.', 'הממשק הלוגי Port-channel' + m[1] + ': הגדרות ה-switchport שלו מועתקות לכל הפורטים בצרור.')],
  [/^channel-group (\d+) mode (\S+)/, (m) => ({
    active: T('Into EtherChannel ' + m[1] + ' with LACP, starting the negotiation (active).', 'В EtherChannel ' + m[1] + ' по LACP, начинать переговоры самому (active).', 'ל-EtherChannel ' + m[1] + ' עם LACP, ולהתחיל את המשא ומתן (active).'),
    passive: T('Into EtherChannel ' + m[1] + ' with LACP, only answering (passive): the other side must be active.', 'В EtherChannel ' + m[1] + ' по LACP, только отвечать (passive): другая сторона должна быть active.', 'ל-EtherChannel ' + m[1] + ' עם LACP, רק לענות (passive): הצד השני חייב להיות active.'),
    desirable: T('Into EtherChannel ' + m[1] + ' with PAgP (Cisco), starting the negotiation (desirable).', 'В EtherChannel ' + m[1] + ' по PAgP (Cisco), начинать переговоры самому (desirable).', 'ל-EtherChannel ' + m[1] + ' עם PAgP ‏(Cisco), ולהתחיל את המשא ומתן (desirable).'),
    auto: T('Into EtherChannel ' + m[1] + ' with PAgP, only answering (auto): the other side must be desirable.', 'В EtherChannel ' + m[1] + ' по PAgP, только отвечать (auto): другая сторона должна быть desirable.', 'ל-EtherChannel ' + m[1] + ' עם PAgP, רק לענות (auto): הצד השני חייב להיות desirable.'),
    on: T('Into EtherChannel ' + m[1] + ' without negotiation (on): the other side must be on too.', 'В EtherChannel ' + m[1] + ' без переговоров (on): на другой стороне тоже должен быть on.', 'ל-EtherChannel ' + m[1] + ' בלי משא ומתן (on): גם בצד השני חייב להיות on.'),
  })[m[2]] || null],
  [/^no channel-group/, () => T('Take the ports out of their EtherChannel (needed before changing the protocol).', 'Вывести порты из EtherChannel (нужно перед сменой протокола).', 'הוצאת הפורטים מה-EtherChannel (נדרש לפני החלפת פרוטוקול).')],
  [/^shutdown$/, () => T('Turn the interface off; together with "no shutdown" it also brings an err-disabled port back.', 'Выключить интерфейс; вместе с «no shutdown» это ещё и возвращает порт из err-disabled.', 'כיבוי הממשק; יחד עם "no shutdown" זה גם מחזיר פורט מ-err-disabled.')],
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
  // OSPF: тонкая настройка, serial, Port Security
  [/^clear ip ospf process/, () => T('Restart OSPF on this router: a new router-id takes effect and DR/BDR are elected again (elections are non-preemptive).', 'Перезапустить OSPF на этом роутере: новый router-id вступает в силу, DR/BDR выбираются заново (выборы не вытесняющие).', 'הפעלה מחדש של OSPF בנתב הזה: ה-router-id החדש נכנס לתוקף ונבחרים מחדש DR/BDR (הבחירות אינן דוחקות).')],
  [/^ip ospf priority (\d+)/, (m) => T('DR election priority ' + m[1] + ' on this segment (0 = never DR/BDR, highest wins).', 'Приоритет на выборах DR ' + m[1] + ' на этом сегменте (0 — никогда не DR/BDR, побеждает больший).', 'עדיפות ' + m[1] + ' בבחירות DR בסגמנט הזה (0 — אף פעם לא DR/BDR, הגבוה מנצח).')],
  [/^ip ospf hello-interval (\d+)/, (m) => T('Send Hello every ' + m[1] + ' s — must match the neighbour on this link.', 'Hello каждые ' + m[1] + ' с — должно совпадать с соседом на этом линке.', 'Hello כל ' + m[1] + ' שניות — חייב להיות זהה לשכן בקישור הזה.')],
  [/^ip ospf dead-interval (\d+)/, (m) => T('Neighbour is dead after ' + m[1] + ' s without Hello — must match the neighbour.', 'Сосед считается мёртвым через ' + m[1] + ' с без Hello — должно совпадать с соседом.', 'השכן נחשב מת אחרי ' + m[1] + ' שניות בלי Hello — חייב להיות זהה לשכן.')],
  [/^no ip ospf hello-interval/, () => T('Back to the default Hello of 10 s (Dead 40 s).', 'Вернуть Hello по умолчанию — 10 с (Dead 40 с).', 'חזרה ל-Hello ברירת מחדל של 10 שניות (Dead 40).')],
  [/^no ip ospf dead-interval/, () => T('Back to the default Dead interval (4 × Hello).', 'Вернуть Dead по умолчанию (4 × Hello).', 'חזרה ל-Dead ברירת מחדל (4 × Hello).')],
  [/^ip ospf cost (\d+)/, (m) => T('Set the OSPF cost of this interface by hand: ' + m[1] + ' (beats the bandwidth formula).', 'Задать OSPF cost интерфейса вручную: ' + m[1] + ' (важнее формулы из bandwidth).', 'קביעת cost של OSPF לממשק ידנית: ' + m[1] + ' (גובר על הנוסחה לפי bandwidth).')],
  [/^bandwidth (\d+)/, (m) => T('Bandwidth ' + m[1] + ' kbit/s for metrics only: OSPF cost = reference / ' + m[1] + '. The real speed does not change.', 'Bandwidth ' + m[1] + ' кбит/с только для метрик: OSPF cost = reference / ' + m[1] + '. Реальная скорость не меняется.', 'Bandwidth ' + m[1] + ' קילוביט לשנייה רק למטריקות: cost של OSPF = reference / ' + m[1] + '. המהירות האמיתית לא משתנה.')],
  [/^auto-cost reference-bandwidth (\d+)/, (m) => T('Reference bandwidth ' + m[1] + ' Mbit/s: cost = ' + m[1] + ' / speed. Set the same value on ALL routers.', 'Reference bandwidth ' + m[1] + ' Мбит/с: cost = ' + m[1] + ' / скорость. Одинаково на ВСЕХ роутерах.', 'Reference bandwidth ‏' + m[1] + ' מגה-ביט: cost = ' + m[1] + ' / מהירות. אותו ערך בכל הנתבים.')],
  [/^default-information originate( always)?/, (m) => T('Advertise this router\'s default route into OSPF (it becomes an ASBR, LSA type 5' + (m[1] ? '; "always" — even without its own default route' : '; it needs its own ip route 0.0.0.0 first') + ').', 'Раздать маршрут по умолчанию этого роутера в OSPF (он станет ASBR, LSA тип 5' + (m[1] ? '; "always" — даже без своего маршрута по умолчанию' : '; сначала нужен свой ip route 0.0.0.0') + ').', 'הפצת נתיב ברירת המחדל של הנתב ל-OSPF (הוא נעשה ASBR, ‏LSA מסוג 5' + (m[1] ? '; "always" — גם בלי נתיב ברירת מחדל משלו' : '; קודם צריך ip route 0.0.0.0 משלו') + ').')],
  [/^ip ospf (\d+) area (\d+)/, (m) => T('Enable OSPF process ' + m[1] + ' directly on this interface, area ' + m[2] + '.', 'Включить OSPF процесс ' + m[1] + ' прямо на этом интерфейсе, область ' + m[2] + '.', 'הפעלת OSPF תהליך ' + m[1] + ' ישירות בממשק הזה, אזור ' + m[2] + '.')],
  [/^clock rate (\d+)/, (m) => T('DCE end of the serial cable gives the clock: ' + m[1] + ' bit/s.', 'DCE-конец serial-кабеля задаёт синхронизацию: ' + m[1] + ' бит/с.', 'צד ה-DCE של הכבל הסדרתי נותן את השעון: ' + m[1] + ' ביט לשנייה.')],
  [/^switchport port-security$/, () => T('Turn Port Security on (default: 1 MAC, violation shutdown, learned dynamically).', 'Включить Port Security (по умолчанию: 1 MAC, violation shutdown, адрес учится сам).', 'הפעלת Port Security (ברירת מחדל: MAC אחד, violation shutdown, הכתובת נלמדת לבד).')],
  [/^switchport port-security maximum (\d+)/, (m) => T('Allow at most ' + m[1] + ' MAC address(es) on this port.', 'Разрешить на порту не больше ' + m[1] + ' MAC-адрес(ов).', 'לאפשר בפורט לכל היותר ' + m[1] + ' כתובות MAC.')],
  [/^switchport port-security mac-address sticky$/, () => T('Sticky: learn MACs automatically and write them into running-config.', 'Sticky: учить MAC сами и записывать их в running-config.', 'Sticky: ללמוד כתובות MAC לבד ולכתוב אותן ל-running-config.')],
  [/^no switchport port-security mac-address (\S+)$/, (m) => T('Remove the secure address ' + m[1] + ' (sticky or static) from this port.', 'Удалить с порта разрешённый адрес ' + m[1] + ' (sticky или статический).', 'מחיקת הכתובת המאובטחת ' + m[1] + ' (sticky או סטטית) מהפורט.')],
  [/^show port-security address/, () => T('Table of secure MACs: which addresses each port allows and how it learned them (SecureSticky / SecureDynamic / SecureConfigured).', 'Таблица разрешённых MAC: какие адреса пускает каждый порт и как он их узнал (SecureSticky / SecureDynamic / SecureConfigured).', 'טבלת כתובות MAC מאובטחות: אילו כתובות כל פורט מאשר ואיך למד אותן (SecureSticky / SecureDynamic / SecureConfigured).')],
  [/^show port-security interface/, () => T('Port Status, violation mode, counters and the last source MAC of one port.', 'Port Status, режим нарушения, счётчики и последний MAC-источник одного порта.', 'Port Status, מצב ההפרה, מונים וה-MAC האחרון של פורט אחד.')],
  [/^clear port-security sticky/, () => T('Forget all learned sticky addresses.', 'Забыть все выученные sticky-адреса.', 'לשכוח את כל כתובות ה-sticky שנלמדו.')],
  [/^switchport port-security mac-address (\S+)$/, (m) => T('Allow MAC ' + m[1] + ' on this port (static secure address).', 'Разрешить на порту MAC ' + m[1] + ' (статический адрес).', 'לאשר בפורט את ה-MAC ‏' + m[1] + ' (כתובת סטטית).')],
  [/^switchport port-security violation (\S+)/, (m) => T({ shutdown: 'On a violation: err-disable the port.', restrict: 'On a violation: drop the frame, log it and count it — the port keeps working.', protect: 'On a violation: silently drop the frame (no log, no counter).' }[m[1]] || m[1], { shutdown: 'При нарушении: выключить порт (err-disabled).', restrict: 'При нарушении: отбросить кадр, записать в журнал и посчитать — порт работает.', protect: 'При нарушении: молча отбросить кадр (без журнала и счётчика).' }[m[1]] || m[1], { shutdown: 'בהפרה: לכבות את הפורט (err-disabled).', restrict: 'בהפרה: לזרוק את המסגרת, לרשום ולספור — הפורט ממשיך לעבוד.', protect: 'בהפרה: לזרוק בשקט (בלי יומן ובלי מונה).' }[m[1]] || m[1])],
  [/^switchport port-security aging time (\d+)/, (m) => T('Secure addresses age out after ' + m[1] + ' min.', 'Разрешённые адреса устаревают через ' + m[1] + ' мин.', 'כתובות מאובטחות פגות אחרי ' + m[1] + ' דקות.')],
  [/^switchport port-security aging type (\S+)/, (m) => T(m[1] === 'inactivity' ? 'Age out only after the device was silent that long.' : 'Age out after that time, whatever the traffic.', m[1] === 'inactivity' ? 'Удалять, только если устройство молчало это время.' : 'Удалять через это время независимо от трафика.', m[1] === 'inactivity' ? 'למחוק רק אם ההתקן שתק כל הזמן הזה.' : 'למחוק אחרי הזמן הזה בלי קשר לתעבורה.')],
  [/^shutdown$/, () => T('Turn the interface off (with "no shutdown" it brings a port back from err-disabled).', 'Выключить интерфейс (вместе с "no shutdown" возвращает порт из err-disabled).', 'כיבוי הממשק (יחד עם "no shutdown" מחזיר פורט מ-err-disabled).')],
  [/^copy running-config startup-config/, () => T('Save the configuration to NVRAM so it survives a reboot.', 'Сохранить конфигурацию в NVRAM, чтобы она пережила перезагрузку.', 'שמירת התצורה ב-NVRAM כדי שתישאר אחרי אתחול.')],
];
// ctx — строка режима, в котором стоит команда (interface …, spanning-tree mst configuration …): «name» в регионе MST — не имя VLAN
const MST_NOTES = [
  [/^name (\S+)/, (m) => T('Region name "' + m[1] + '" — must be exactly the same (case too) on every switch of the region.', 'Имя региона «' + m[1] + '» — должно совпадать на всех коммутаторах региона, вплоть до регистра.', 'שם האזור "' + m[1] + '" — חייב להיות זהה בדיוק (גם באותיות) בכל מתגי האזור.')],
  [/^exit$/, () => T('Leave the MST settings — now the changes apply.', 'Выйти из настроек MST — теперь изменения вступают в силу.', 'יציאה מהגדרות ה-MST — עכשיו השינויים נכנסים לתוקף.')],
];
function cmdNote(line, ctx) {
  const list = ctx && /^spanning-tree mst configuration/.test(ctx) ? MST_NOTES.concat(CMD_NOTES) : CMD_NOTES;
  const t = line.trim().replace(/^do\s+/, '');   // "do <команда>" из режима конфигурации — пояснение как к самой команде
  for (const [re, f] of list) { const m = t.match(re); if (m) return f(m); }
  return null;
}
// Пояснения к строкам по порядку, с учётом режима (подрежим заканчивается на exit / end)
function cmdNotes(lines) {
  let ctx = null;
  return lines.map((c) => {
    const note = cmdNote(c, ctx);
    if (SUBMODE_RE.test(c)) ctx = c; else if (c === 'exit' || c === 'end') ctx = null;
    return note;
  });
}

// ---------- Почему это важно (по типу проверки) ----------
const CHK_INFO = {
  stpOn: ['srwe05', 'Without STP the switches do not break loops: a broadcast goes round and multiplies until links and CPUs are saturated — a broadcast storm. MAC addresses "flap" between ports and nothing works.', 'Без STP коммутаторы не разрывают петли: broadcast ходит по кругу и размножается, пока каналы и процессоры не захлебнутся, — широковещательный шторм. MAC-адреса «прыгают» между портами, и ничего не работает.', 'בלי STP המתגים לא שוברים לולאות: ‏broadcast מסתובב ומתרבה עד שהקישורים והמעבדים מוצפים — סופת broadcast. כתובות MAC "קופצות" בין פורטים ושום דבר לא עובד.'],
  mstRegion: ['srwe05', 'MST switches form one region only if the region name, the revision and the whole VLAN-to-instance table are identical. Otherwise each is its own region and the instances stop at the boundary.', 'Коммутаторы MST образуют один регион, только если имя региона, ревизия и вся таблица VLAN → экземпляр совпадают. Иначе каждый — отдельный регион, и экземпляры обрываются на границе.', 'מתגי MST יוצרים אזור אחד רק אם שם האזור, ה-revision וכל טבלת VLAN → מופע זהים. אחרת כל אחד הוא אזור נפרד והמופעים נעצרים בגבול.'],
  mstRoot: ['srwe05', 'Every MST instance has its own root, chosen by the priority of that instance (spanning-tree mst <n> priority / root primary). It works only inside one region.', 'У каждого экземпляра MST свой корень, его выбирает приоритет этого экземпляра (spanning-tree mst <n> priority / root primary). Работает только внутри одного региона.', 'לכל מופע MST יש root משלו, שנבחר לפי ה-priority של המופע (spanning-tree mst <n> priority / root primary). זה עובד רק בתוך אזור אחד.'],
  stpRoot: ['srwe05', 'The root bridge is the switch with the lowest Bridge ID = priority + MAC. With the default priority 32768 everywhere, the oldest switch with the lowest MAC wins — usually not the one you want. Give the core switch a lower priority.', 'Корневой мост — коммутатор с наименьшим Bridge ID = приоритет + MAC. Если у всех приоритет по умолчанию 32768, побеждает самый старый коммутатор с наименьшим MAC — обычно не тот, что нужен. Дайте коммутатору ядра меньший приоритет.', 'ה-root bridge הוא המתג עם ה-Bridge ID הנמוך ביותר = ‏priority + ‏MAC. כשלכולם priority ברירת מחדל 32768, מנצח המתג הישן עם ה-MAC הנמוך — בדרך כלל לא זה שרוצים. נותנים למתג הליבה priority נמוך יותר.'],
  stpBackup: ['srwe05', 'If the root fails, the switch with the next lowest Bridge ID becomes root. Choose it yourself (root secondary = 28672), otherwise chance picks it.', 'Если корень откажет, корнем станет коммутатор со следующим по величине Bridge ID. Выберите его сами (root secondary = 28672), иначе его выберет случай.', 'אם ה-root נופל, המתג עם ה-Bridge ID הבא בגודלו הופך ל-root. בוחרים אותו בעצמכם (root secondary = 28672), אחרת המקרה יבחר.'],
  portfast: ['srwe05', 'Without PortFast an access port waits about 30 seconds (listening, learning) before it forwards. PortFast skips that — but only on ports to end devices.', 'Без PortFast access-порт ждёт около 30 секунд (listening, learning), прежде чем начать передавать. PortFast это пропускает — но только на портах к конечным устройствам.', 'בלי PortFast פורט access מחכה כ-30 שניות (listening, ‏learning) לפני שהוא מעביר. ‏PortFast מדלג על זה — אבל רק בפורטים להתקני קצה.'],
  bpduguard: ['srwe05', 'BPDU Guard shuts a PortFast port (err-disabled) as soon as a BPDU arrives, i.e. a switch is plugged in. Nobody can create a loop or take over the root from a user port.', 'BPDU Guard выключает порт с PortFast (err-disabled), как только приходит BPDU, то есть подключён коммутатор. Через пользовательский порт нельзя устроить петлю или захватить корень.', 'BPDU Guard מכבה פורט PortFast ‏(err-disabled) ברגע שמגיע BPDU, כלומר חובר מתג. אי אפשר ליצור לולאה או להשתלט על ה-root דרך פורט של משתמש.'],
  notErrdis: ['srwe05', 'A link to another switch receives BPDUs all the time. With BPDU Guard on it, the uplink goes err-disabled at once. Remove BPDU Guard and PortFast there, then shutdown / no shutdown.', 'Канал к другому коммутатору всё время получает BPDU. С BPDU Guard на нём аплинк сразу уходит в err-disabled. Уберите там BPDU Guard и PortFast, затем shutdown / no shutdown.', 'קישור למתג אחר מקבל BPDU כל הזמן. עם BPDU Guard עליו, ה-uplink עובר מיד ל-err-disabled. מסירים שם את BPDU Guard ואת PortFast, ואז shutdown / no shutdown.'],
  ecUp: ['srwe06', 'A bundle forms only if both ends agree: the same protocol, compatible modes (LACP: at least one active; PAgP: at least one desirable; on only with on), and every port set like its Port-channel (mode, VLANs, speed).', 'Пучок собирается, только если концы договорились: один протокол, совместимые режимы (LACP — хотя бы один active; PAgP — хотя бы один desirable; on — только с on), и каждый порт настроен как его Port-channel (режим, VLAN, скорость).', 'צרור נוצר רק אם שני הצדדים מסכימים: אותו פרוטוקול, מצבים מתאימים (LACP — לפחות active אחד; ‏PAgP — לפחות desirable אחד; ‏on — רק עם on), וכל פורט מוגדר כמו ה-Port-channel שלו (מצב, ‏VLAN, מהירות).'],
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
  staticKind: ['static', 'Static routes come in kinds: recursive (next-hop IP — two lookups: the next hop, then the exit interface), directly attached (exit interface only — one lookup; fine on point-to-point serial), fully specified (interface AND next hop — for Ethernet) and default (0.0.0.0/0 — everything else).',
    'Статические маршруты бывают разные: рекурсивный (IP следующего узла — два поиска: next hop, потом выходной интерфейс), directly attached (только выходной интерфейс — один поиск; нормально на serial точка-точка), fully specified (интерфейс И next hop — для Ethernet) и маршрут по умолчанию (0.0.0.0/0 — «всё остальное»).',
    'נתיבים סטטיים הם מכמה סוגים: רקורסיבי (IP של הקפיצה הבאה — שני חיפושים: ה-next hop ואז ממשק היציאה), directly attached (ממשק יציאה בלבד — חיפוש אחד; תקין ב-serial נקודה-לנקודה), fully specified (ממשק וגם next hop — ל-Ethernet) וברירת מחדל (0.0.0.0/0 — כל השאר).'],
  ospfRole: ['ospf', 'On an Ethernet segment OSPF elects a DR and a BDR: highest interface priority, then highest router ID; priority 0 never takes a role. The election is non-preemptive — a better router that comes later does not take over until the DR/BDR disappears or the OSPF process is reset.',
    'На Ethernet-сегменте OSPF выбирает DR и BDR: больший priority интерфейса, затем больший router ID; priority 0 роль не получает никогда. Выборы не вытесняющие — более «сильный» роутер, пришедший позже, роль не отбирает, пока DR/BDR не пропадёт или процесс OSPF не будет сброшен.',
    'בסגמנט Ethernet ‏OSPF בוחר DR ו-BDR: ה-priority הגבוה של הממשק, אחר כך ה-router ID הגבוה; priority 0 אף פעם לא מקבל תפקיד. הבחירות אינן דוחקות — נתב "חזק" שמגיע מאוחר לא לוקח תפקיד עד שה-DR/BDR נעלם או שתהליך ה-OSPF מאותחל.'],
  ospfPrio: ['ensa02', 'The interface priority (0–255, default 1) decides the DR/BDR election on that segment. 0 means "never DR or BDR".', 'Priority интерфейса (0–255, по умолчанию 1) решает выборы DR/BDR на этом сегменте. 0 — «никогда не DR и не BDR».', 'ה-priority של הממשק (0–255, ברירת מחדל 1) מכריע את בחירות ה-DR/BDR בסגמנט. 0 פירושו "אף פעם לא DR ולא BDR".'],
  ospfMethod: ['ensa02', 'Three ways enable OSPF on an interface and give the same network: "network <network> <wildcard> area 0" (every interface in that subnet), "network <interface IP> 0.0.0.0 area 0" (exactly one interface) and "ip ospf <pid> area 0" on the interface itself. A "network" statement is NOT a list of networks to advertise — it picks interfaces.',
    'Три способа включить OSPF на интерфейсе дают одинаковую сеть: "network <сеть> <wildcard> area 0" (все интерфейсы этой подсети), "network <IP интерфейса> 0.0.0.0 area 0" (ровно один интерфейс) и "ip ospf <pid> area 0" прямо на интерфейсе. Команда network — НЕ список сетей для рассылки, она выбирает интерфейсы.',
    'שלוש דרכים להפעיל OSPF בממשק נותנות אותה רשת: ‏"network <רשת> <wildcard> area 0" (כל הממשקים בתת-רשת), ‏"network <IP של ממשק> 0.0.0.0 area 0" (ממשק אחד בדיוק) ו-"ip ospf <pid> area 0" בממשק עצמו. פקודת network אינה רשימת רשתות לפרסום — היא בוחרת ממשקים.'],
  ospfVia: ['ensa02', 'OSPF picks the path with the lowest total cost = the sum of the costs of the OUTGOING interfaces on the way. cost = reference bandwidth / interface bandwidth, so "bandwidth" or "ip ospf cost" changes which path wins. Each router computes from itself — a change on R1 does not change R2\'s way back.',
    'OSPF выбирает путь с наименьшей суммарной стоимостью = сумма cost ИСХОДЯЩИХ интерфейсов по пути. cost = reference bandwidth / bandwidth интерфейса, поэтому "bandwidth" или "ip ospf cost" меняют победивший путь. Каждый роутер считает от себя — изменение на R1 не меняет обратный путь R2.',
    'OSPF בוחר את הדרך עם העלות הכוללת הנמוכה = סכום ה-cost של ממשקי היציאה לאורך הדרך. ‏cost = reference bandwidth / bandwidth של הממשק, ולכן "bandwidth" או "ip ospf cost" משנים איזו דרך מנצחת. כל נתב מחשב מעצמו — שינוי ב-R1 לא משנה את דרך החזרה של R2.'],
  ospfDefault: ['ensa02', 'One border router knows the way out: it has its own static default route, and "default-information originate" makes it an ASBR that floods it as an external LSA type 5. The other routers see O*E2 0.0.0.0/0 and "Gateway of last resort is …".',
    'Один граничный роутер знает выход наружу: у него свой статический маршрут по умолчанию, а "default-information originate" делает его ASBR, который рассылает этот маршрут как внешний LSA тип 5. Остальные видят O*E2 0.0.0.0/0 и "Gateway of last resort is …".',
    'נתב גבול אחד יודע את הדרך החוצה: יש לו נתיב ברירת מחדל סטטי משלו, ו-"default-information originate" הופך אותו ל-ASBR שמפיץ אותו כ-LSA חיצוני מסוג 5. שאר הנתבים רואים O*E2 0.0.0.0/0 ו-"Gateway of last resort is …".'],
  psec: ['srwe11', 'Port Security limits which and how many MAC addresses may use an access port. A foreign MAC when the limit is full is a violation: shutdown (err-disabled), restrict (drop + log + counter) or protect (drop silently). It works only on access ports.',
    'Port Security ограничивает, какие и сколько MAC-адресов могут работать через access-порт. Чужой MAC при заполненном лимите — нарушение: shutdown (err-disabled), restrict (отброс + журнал + счётчик) или protect (молча отбросить). Работает только на access-порту.',
    'Port Security מגביל אילו וכמה כתובות MAC יכולות לעבוד דרך פורט access. ‏MAC זר כשהמכסה מלאה הוא הפרה: shutdown ‏(err-disabled), ‏restrict (זריקה + יומן + מונה) או protect (זריקה בשקט). עובד רק בפורט access.'],
  psecLearned: ['srwe11', 'With sticky learning the port takes the MAC from the first frame and writes it into running-config as "switchport port-security mac-address sticky <MAC>". After "copy run start" it survives a reload.',
    'При обучении sticky порт берёт MAC из первого кадра и записывает его в running-config как "switchport port-security mac-address sticky <MAC>". После "copy run start" адрес переживает перезагрузку.',
    'בלמידת sticky הפורט לוקח את ה-MAC מהמסגרת הראשונה וכותב אותו ל-running-config כ-"switchport port-security mac-address sticky <MAC>". אחרי "copy run start" הכתובת שורדת reload.'],
  psecUp: ['srwe11', 'In violation mode shutdown the port goes err-disabled. Remove the cause first (the foreign device or the wrong secure address), otherwise the next frame shuts it again; then "shutdown" + "no shutdown".',
    'В режиме нарушения shutdown порт уходит в err-disabled. Сначала уберите причину (чужое устройство или неверный разрешённый адрес), иначе следующий кадр снова его выключит; потом "shutdown" + "no shutdown".',
    'במצב הפרה shutdown הפורט עובר ל-err-disabled. קודם מסירים את הסיבה (התקן זר או כתובת מורשית שגויה), אחרת המסגרת הבאה תכבה אותו שוב; ואז "shutdown" + "no shutdown".'],
  portsShut: ['srwe11', 'The first rule of switch security: unused ports are shut down, so nobody can plug in a foreign laptop or switch.', 'Первое правило безопасности коммутатора: неиспользуемые порты выключены, чтобы никто не подключил чужой ноутбук или свитч.', 'הכלל הראשון של אבטחת מתג: פורטים שלא בשימוש כבויים, כדי שאף אחד לא יחבר מחשב נייד או מתג זר.'],
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
  aclApplied: ['ensa05', 'An ACL filters nothing until "ip access-group" puts it on an interface in a direction. Standard ACLs (source only) go close to the destination, extended ACLs close to the source.', 'ACL ничего не фильтрует, пока "ip access-group" не поставит его на интерфейс в нужном направлении. Стандартный ACL (только источник) ставят у получателя, расширенный — у источника.', 'ACL לא מסנן כלום עד ש-"ip access-group" מחיל אותו על ממשק בכיוון מסוים. ‏ACL סטנדרטי (רק מקור) ממקמים ליד היעד, ‏ACL מורחב — ליד המקור.'],
  aclEntry: ['ensa05', 'In a named ACL every line has a sequence number: "15 deny …" inserts between 10 and 20, "no 10" deletes line 10 — no need to retype the whole list.', 'В именованном ACL у каждой строки есть номер: "15 deny …" вставляет между 10 и 20, "no 10" удаляет строку 10 — весь список перепечатывать не нужно.', 'ב-ACL עם שם לכל שורה יש מספר: ‏"15 deny …" מכניס בין 10 ל-20, ‏"no 10" מוחק את שורה 10 — לא צריך להקליד את כל הרשימה מחדש.'],
  flow: ['ensa05', 'An extended ACL can tell services apart by protocol and port (tcp eq 80 = HTTP). The first matching line decides, and an invisible "deny any" ends every ACL.', 'Расширенный ACL различает службы по протоколу и порту (tcp eq 80 = HTTP). Решает первая подходящая строка, а в конце каждого ACL — невидимый "deny any".', 'ACL מורחב מבחין בין שירותים לפי פרוטוקול ופורט (tcp eq 80 = HTTP). השורה הראשונה שמתאימה קובעת, ובסוף כל ACL יש "deny any" בלתי נראה.'],
  vtyClass: ['ensa05', 'Remote logins are filtered on the vty lines with "access-class <acl> in" — "ip access-group" works only on interfaces.', 'Удалённые входы фильтруются на линиях vty командой "access-class <acl> in" — "ip access-group" работает только на интерфейсах.', 'התחברויות מרחוק מסוננות בקווי ה-vty עם "access-class <acl> in" — ‏"ip access-group" עובד רק על ממשקים.'],
  remote: ['ensa05', 'Telnet/SSH to a router needs a reachable address, vty lines with login and a password, and — if an access-class is set — the client must be permitted by it.', 'Для Telnet/SSH к роутеру нужны достижимый адрес, линии vty с login и паролем, а если задан access-class — клиент должен быть им разрешён.', 'Telnet/SSH לנתב צריך כתובת נגישה, קווי vty עם login וסיסמה, ואם מוגדר access-class — הלקוח חייב להיות מותר בו.'],
  natIf: ['ensa06', 'NAT translates only packets that cross from an "ip nat inside" interface to an "ip nat outside" one (and back). Without both marks nothing is translated.', 'NAT транслирует только пакеты, которые переходят с интерфейса "ip nat inside" на "ip nat outside" (и обратно). Без обеих меток ничего не транслируется.', 'NAT מתרגם רק חבילות שעוברות מממשק "ip nat inside" לממשק "ip nat outside" (ובחזרה). בלי שני הסימונים לא מתורגם כלום.'],
  natStatic: ['ensa06', 'Static NAT maps one inside local address to one inside global address permanently — used for servers that must be reachable from the Internet.', 'Статический NAT навсегда связывает один inside local с одним inside global — так публикуют серверы, доступные из Интернета.', 'NAT סטטי ממפה כתובת inside local אחת לכתובת inside global אחת לצמיתות — כך מפרסמים שרתים שצריכים להיות נגישים מהאינטרנט.'],
  natPool: ['ensa06', 'Dynamic NAT takes public addresses from a pool; the pool, the ACL of inside hosts and "ip nat inside source list … pool …" work together.', 'Динамический NAT берёт публичные адреса из пула; работают вместе пул, ACL внутренних хостов и "ip nat inside source list … pool …".', 'NAT דינמי לוקח כתובות ציבוריות ממאגר; המאגר, ה-ACL של המארחים הפנימיים ו-"ip nat inside source list … pool …" עובדים יחד.'],
  natSeen: ['ensa06', 'Private addresses are not routed on the Internet: the provider has no route back to them. NAT/PAT replaces the source with a public address so the reply can come back.', 'Частные адреса в Интернете не маршрутизируются: у провайдера нет пути обратно к ним. NAT/PAT подменяет источник публичным адресом, чтобы ответ смог вернуться.', 'כתובות פרטיות לא מנותבות באינטרנט: לספק אין דרך חזרה אליהן. ‏NAT/PAT מחליף את המקור בכתובת ציבורית כדי שהתשובה תוכל לחזור.'],
  homeLan: ['srwe13', 'The Router IP of a home router is the gateway and the DHCP server of the LAN; its DHCP range is computed from it.', 'Router IP домашнего роутера — шлюз и DHCP-сервер для LAN; диапазон DHCP считается от него.', 'ה-Router IP של נתב ביתי הוא השער ושרת ה-DHCP של ה-LAN; טווח ה-DHCP מחושב ממנו.'],
  homeDhcp: ['srwe13', 'The home router gives addresses from Start IP to Start + Maximum users − 1; everything else in the subnet stays for static addresses.', 'Домашний роутер раздаёт адреса от Start IP до Start + Maximum users − 1; остальное в подсети остаётся для статических адресов.', 'הנתב הביתי מחלק כתובות מ-Start IP עד Start + Maximum users − 1; שאר תת-הרשת נשאר לכתובות סטטיות.'],
  wifiAp: ['srwe13', 'The SSID names the network; WPA2-Personal (PSK, AES) protects it with a passphrase of 8–63 characters. An open network lets anyone in.', 'SSID — имя сети; WPA2-Personal (PSK, AES) защищает её паролем из 8–63 символов. Открытая сеть пускает любого.', 'ה-SSID הוא שם הרשת; ‏WPA2-Personal ‏(PSK, ‏AES) מגן עליה בסיסמה של 8–63 תווים. רשת פתוחה מכניסה כל אחד.'],
  wifiNic: ['srwe13', 'A Packet Tracer PC or laptop has no Wi-Fi by default: replace the Fast Ethernet module with a wireless one (WMP300N / WPC300N) while the power is off.', 'У ПК и ноутбука в Packet Tracer по умолчанию нет Wi-Fi: замените модуль Fast Ethernet на беспроводной (WMP300N / WPC300N) при выключенном питании.', 'למחשב ולמחשב נייד ב-Packet Tracer אין Wi-Fi כברירת מחדל: מחליפים את מודול ה-Fast Ethernet במודול אלחוטי (WMP300N / WPC300N) כשהחשמל כבוי.'],
  wifiAssoc: ['srwe13', 'A client associates only if the SSID, the security mode and the key match the access point exactly.', 'Клиент подключается, только если SSID, тип защиты и ключ точно совпадают с точкой доступа.', 'לקוח מתחבר רק אם ה-SSID, סוג האבטחה והמפתח תואמים בדיוק לנקודת הגישה.'],
  ssh: ['itn16', 'SSH needs a domain name, RSA keys, a local user, and vty lines with "login local" and "transport input ssh".', 'Для SSH нужны доменное имя, RSA-ключи, локальный пользователь и линии vty с «login local» и «transport input ssh».', 'SSH צריך שם דומיין, מפתחות RSA, משתמש מקומי וקווי vty עם "login local" ו-"transport input ssh".'],
};

// ---------- Как исправить (по типу проверки, с данными задания) ----------
const fxCli = (dev, lines) => ({ dev, via: 'cli', lines: lines.filter(Boolean) });
const fxGui = (dev, lines) => ({ dev, via: 'gui', lines: lines.filter(Boolean) });
const fxSol = (devs, re, fallback) => ({ sol: { devs, re }, fallback });
const CHK_FIX = {
  stpOn: (sw, v) => [fxCli(sw, ['spanning-tree vlan ' + v])],
  mstRegion: (sw, name, rev, map) => [fxCli(sw, ['spanning-tree mode mst', 'spanning-tree mst configuration', 'name ' + name, 'revision ' + rev, ...Object.keys(map).map((i) => 'instance ' + i + ' vlan ' + map[i].join(', ')), 'exit'])],
  mstRoot: (sw, inst) => [fxCli(sw, ['spanning-tree mst ' + inst + ' root primary'])],
  stpRoot: (sw, v) => [fxCli(sw, ['spanning-tree vlan ' + v + ' root primary'])],
  stpBackup: (sw, root, v) => [fxCli(sw, ['spanning-tree vlan ' + v + ' root secondary'])],
  portfast: (sw, port) => [fxCli(sw, ['interface ' + port, 'spanning-tree portfast'])],
  bpduguard: (sw, port) => [fxCli(sw, ['interface ' + port, 'spanning-tree bpduguard enable'])],
  notErrdis: (sw, port) => [fxCli(sw, ['interface ' + port, 'no spanning-tree bpduguard', 'no spanning-tree portfast', 'shutdown', 'no shutdown'])],
  ecUp: (sw, g, count, proto) => [fxSol(null, /channel-group|^interface port-channel|^interface range|switchport mode/,
    fxCli(sw, ['channel-group ' + g + ' mode ' + (proto === 'LACP' ? 'active' : proto === 'PAgP' ? 'desirable' : 'on')]))],
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
  routerId: (dev, rid) => [fxSol([dev], /^router-id/, fxCli(dev, ['router ospf 1', 'router-id ' + rid])), { dev, via: 'exec', lines: ['clear ip ospf process'] }],
  ospfNbrs: () => [fxSol(null, /^router ospf|ip ospf (hello|dead)-interval/)],
  staticKind: (dev, net) => [fxSol([dev], new RegExp('^ip route ' + net.replace(/\./g, '\\.') + ' '))],
  ospfRole: () => [fxSol(null, /ip ospf priority|clear ip ospf process/)],
  ospfPrio: (dev, ifn, prio) => [fxCli(dev, ['interface ' + ifn, 'ip ospf priority ' + prio]), { dev, via: 'exec', lines: ['clear ip ospf process'] }],
  ospfMethod: (dev) => [fxSol([dev], /^router ospf|^router-id|^network|ip ospf \d+ area/)],
  ospfVia: (dev) => [fxSol([dev], /^bandwidth|ip ospf cost/)],
  ospfDefault: () => [fxSol(null, /^ip route 0\.0\.0\.0|^router ospf|default-information/)],
  psec: (sw) => [fxSol([sw], /port-security|switchport mode access/)],
  psecLearned: (sw, port, pc) => [{ dev: pc, via: 'gui', lines: ['Desktop → Command Prompt → ping <server>'] }, { dev: sw, via: 'exec', lines: ['show port-security address'] }],
  psecUp: (sw, port) => [fxSol([sw], /port-security mac-address|^shutdown|^no shutdown/, fxCli(sw, ['interface ' + port, 'shutdown', 'no shutdown']))],
  portsShut: (sw) => [fxSol([sw], /^interface range|^shutdown$/)],
  hostname: (dev, name) => [fxCli(dev, ['hostname ' + name])],
  enableSecret: (dev, pw) => [fxCli(dev, ['enable secret ' + pw])],
  linePw: (dev, line, pw) => [fxCli(dev, [line === 'con' ? 'line console 0' : 'line vty 0 4', 'password ' + pw, 'login'])],
  banner: (dev, text) => [fxCli(dev, ['banner motd #' + text + '#'])],
  encryption: (dev) => [fxCli(dev, ['service password-encryption'])],
  noLookup: (dev) => [fxCli(dev, ['no ip domain-lookup'])],
  saved: (dev) => [{ dev, via: 'exec', lines: ['copy running-config startup-config'] }],
  svi: (dev, ip, mask) => [fxCli(dev, ['interface vlan 1', 'ip address ' + ip + ' ' + mask, 'no shutdown'])],
  swGateway: (dev, gw) => [fxCli(dev, ['ip default-gateway ' + gw])],
  aclApplied: (dev, ifn, dir, name) => [fxSol([dev], /access-list|access-group/, fxCli(dev, ['interface ' + ifn, 'ip access-group ' + name + ' ' + dir]))],
  aclEntry: (dev, name) => [fxSol([dev], /access-list/, fxCli(dev, ['ip access-list standard ' + name]))],
  flow: (a, b, ip, proto, port) => [fxSol(null, /access-list|access-group|ip nat|^ip route/, fxGui(a, ['Desktop → Web Browser → http://' + ip])), fxGui(a, ['Desktop → Web Browser → ' + (port === 443 ? 'https' : 'http') + '://' + ip])],
  vtyClass: (dev, name) => [fxSol([dev], /access-list|^line vty|access-class/, fxCli(dev, ['line vty 0 4', 'access-class ' + name + ' in']))],
  remote: (src, dev, ip, kind) => [fxSol([dev], /access-list|^line vty|access-class/, fxCli(dev, ['line vty 0 4', 'password cisco', 'login'])), fxGui(src, ['Desktop → Command Prompt → ' + (kind === 'ssh' ? 'ssh -l <user> ' : 'telnet ') + ip])],
  natIf: (dev, ifn, role) => [fxCli(dev, ['interface ' + ifn, 'ip nat ' + role])],
  natStatic: (dev, il, ig) => [fxCli(dev, ['ip nat inside source static ' + il + ' ' + ig])],
  natPool: (dev, name, a, b) => [fxSol([dev], /^ip nat pool/, fxCli(dev, ['ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask 255.255.255.0']))],
  natSeen: (src, ip) => [fxSol(null, /ip nat|access-list/, fxGui(src, ['Desktop → Command Prompt → ping ' + ip])), fxGui(src, ['Desktop → Command Prompt → ping ' + ip])],
  homeLan: (dev, ip, mask) => [fxGui(dev, ['GUI → Setup → Basic Setup → Router IP: ' + ip + ' / ' + mask, 'Save Settings'])],
  homeDhcp: (dev, start, max) => [fxGui(dev, ['GUI → Setup → Basic Setup → DHCP Server: Enabled', 'Start IP Address: .' + start + ', Maximum number of Users: ' + max, 'Save Settings'])],
  wifiAp: (dev, ssid, sec, pass, ch, isAp) => [fxGui(dev, isAp ? ['Config → Port 1', 'SSID: ' + ssid, ch ? '2.4 GHz Channel: ' + ch : null, 'Authentication: ' + WIFI_SECURITY[sec], sec !== 'disabled' ? 'PSK Pass Phrase: ' + pass : null]
    : ['GUI → Wireless → Basic Wireless Settings → Network Name (SSID): ' + ssid + ' → Save Settings', 'GUI → Wireless → Wireless Security → ' + (sec === 'wpa2' ? 'WPA2 Personal' : WIFI_SECURITY[sec]) + (sec !== 'disabled' ? ', Passphrase: ' + pass : '') + ' → Save Settings'])],
  wifiNic: (dev, module) => [fxGui(dev, ['Physical → power OFF', 'MODULES → ' + module + ' → Install ' + module, 'Physical → power ON'])],
  wifiAssoc: (pc) => [fxGui(pc, ['Desktop → PC Wireless → Connect → choose the SSID → Connect', 'Pre-shared Key → Connect  (or Config → Wireless0)'])],
  ssh: (dev, user, domain) => [fxSol([dev], /^(ip domain-name|crypto key|username|ip ssh|line vty)/, fxCli(dev, ['ip domain-name ' + domain, 'crypto key generate rsa general-keys modulus 1024', 'username ' + user + ' secret <password>', 'line vty 0 4', 'login local', 'transport input ssh']))],
};

// Помечаем проверки типом и аргументами, чтобы потом объяснить их.
for (const k of Object.keys(CHK)) {
  const make = CHK[k];
  CHK[k] = (...args) => Object.assign(make(...args), { kind: k, args });
}

// Строки решения, относящиеся к проверке: блоки «режим + команды внутри» (interface …, router …, vlan …).
const SUBMODE_RE = /^(interface |vlan \d|router |ip dhcp pool |line |spanning-tree mst configuration|ip access-list )/;
const CHILD_RE = /^(no )?(revision|instance |channel-group|channel-protocol|spanning-tree|ip address|shutdown|description|switchport|encapsulation|ip helper-address|name |network |default-router|dns-server|version|auto-summary|passive-interface|router-id|default-information|password|login|transport|exec-timeout|ipv6 address|ip ospf|bandwidth|duplex|speed|lease|auto-cost|clock rate|do |\d+ (permit|deny)|permit |deny |remark |\d+$|ip access-group|access-class|ip nat (inside|outside)$)/;
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
      else blocks.push({ dev: a + ' ↔ ' + b, via: 'cable', lines: ['Connections (⚡) → ' + cableName(topo, a, b, ap, bp), a + ': ' + ap, b + ': ' + bp] });
    } else if (f.ping) {
      const [a, , ip, expect] = f.ping;
      const aclTask = task.solution && task.solution.cli && Object.values(task.solution.cli).some((c) => c.some((l) => /access-(list|group|class)/.test(l)));
      if (task.faults && task.solution && task.solution.cli) blocks.push(...solExtract(task, null, /./));
      else if (!expect && aclTask) blocks.push(...solExtract(task, null, /access-list|access-group|access-class/));
      else if (!(!expect && aclTask)) blocks.push({ dev: a, via: 'note', lines: [expect ? T('Fix the red items above first — then ping works by itself.', 'Сначала исправьте красные пункты выше — тогда ping заработает сам.', 'קודם מתקנים את הסעיפים האדומים למעלה — ואז ה-ping יעבוד לבד.') : T('Put the devices into different VLANs or networks so they are isolated.', 'Разнесите устройства по разным VLAN или сетям, чтобы изолировать их.', 'מפרידים את ההתקנים ל-VLAN או לרשתות שונות כדי לבודד אותם.')] });
      blocks.push({ dev: a, via: 'gui', lines: ['Desktop → Command Prompt → ping ' + ip] });
    } else if (f.sol) {
      const got = solExtract(task, f.sol.devs, f.sol.re);
      if (got.length) blocks.push(...got); else if (f.fallback) blocks.push(f.fallback);
    } else blocks.push(f);
  }
  return {
    why: info ? T(info[1], info[2], info[3]) : null,
    lesson: info ? info[0] : null,
    fix: blocks.map((b) => ({ dev: b.dev, via: b.via, viaLabel: VIA[b.via] || VIA.cli, lines: ((notes) => b.lines.map((l, i) => (typeof l === 'string' ? { text: l, note: b.via === 'cli' || b.via === 'exec' ? notes[i] : null } : { text: null, note: l })))(cmdNotes(b.lines.map((l) => (typeof l === 'string' ? l : '')))) })),
  };
}

// ---------- Пошаговое решение ----------
const CLI_TOPICS = [
  [/^interface .*\.\d|^encapsulation/, T('subinterfaces', 'подынтерфейсы', 'תת-ממשקים')],
  [/access-list|access-group|^(\d+ )?(permit|deny) |^no \d+$/, T('ACL', 'ACL', 'ACL')],
  [/access-class/, T('VTY access', 'доступ к VTY', 'גישה ל-VTY')],
  [/^(no )?ip nat/, T('NAT', 'NAT', 'NAT')],
  [/^(interface|ip address|no shutdown)/, T('interfaces', 'интерфейсы', 'ממשקים')],
  [/ip route/, T('static routes', 'статические маршруты', 'נתיבים סטטיים')],
  [/^(vlan|name |switchport access|switchport mode access)/, T('VLANs and access ports', 'VLAN и access-порты', 'VLAN ופורטי access')],
  [/^switchport (mode trunk|trunk)/, T('trunk', 'trunk', 'trunk')],
  [/^spanning-tree mst|^spanning-tree mode mst/, T('MST', 'MST', 'MST')],
  [/^spanning-tree/, T('Spanning Tree', 'Spanning Tree', 'Spanning Tree')],
  [/channel-group|^interface port-channel/i, T('EtherChannel', 'EtherChannel', 'EtherChannel')],
  [/dhcp|default-router|dns-server|helper/, T('DHCP', 'DHCP', 'DHCP')],
  [/^router ospf|area|router-id/, T('OSPF', 'OSPF', 'OSPF')],
  [/ip ospf priority|clear ip ospf process/, T('DR/BDR election', 'выборы DR/BDR', 'בחירות DR/BDR')],
  [/^bandwidth|ip ospf cost|auto-cost/, T('OSPF cost', 'стоимость OSPF', 'עלות OSPF')],
  [/default-information/, T('default route in OSPF', 'маршрут по умолчанию в OSPF', 'נתיב ברירת מחדל ב-OSPF')],
  [/port-security/, T('Port Security', 'Port Security', 'Port Security')],
  [/^interface range|^shutdown$/, T('unused ports off', 'выключить неиспользуемые порты', 'כיבוי פורטים לא בשימוש')],
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
      const cross = correctCable(topo.devices[a], topo.devices[b], ap, bp) === 'cross';
      return cross ? T(a + ' and ' + b + ' are the same kind of device for cabling → Copper Cross-Over.', a + ' и ' + b + ' — однотипные для кабеля устройства → перекрёстный (Copper Cross-Over).', a + ' ו-' + b + ' הם התקנים מאותו סוג מבחינת כבילה → כבל מוצלב (Copper Cross-Over).')
        : T(a + ' and ' + b + ' are different kinds of devices → Copper Straight-Through.', a + ' и ' + b + ' — разные типы устройств → прямой кабель (Copper Straight-Through).', a + ' ו-' + b + ' הם סוגי התקנים שונים → כבל ישר (Copper Straight-Through).');
    },
    lines(topo) { return [{ via: 'cable', dev: a + ' ↔ ' + b, lines: ['Connections (⚡) → ' + cableName(topo, a, b, ap, bp), a + ': ' + ap, b + ': ' + bp].map((x) => ({ text: x, note: null })) }]; },
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

// Шаг решения для Wi-Fi: GUI роутера WRT300N, Config точки доступа, модуль и подключение клиента
function wifiSolutionStep(d, w) {
  const T3 = {
    home: [T(d + ' — GUI: LAN, DHCP and Wi-Fi', d + ' — GUI: LAN, DHCP и Wi-Fi', d + ' — GUI: ‏LAN, ‏DHCP ו-Wi-Fi'), T('The Linksys web interface: every page is applied with Save Settings.', 'Веб-интерфейс Linksys: каждая страница применяется кнопкой Save Settings.', 'ממשק האינטרנט של Linksys: כל דף נשמר בכפתור Save Settings.')],
    ap: [T(d + ' — Config → Port 1: SSID and security', d + ' — Config → Port 1: SSID и защита', d + ' — Config → Port 1: ‏SSID ואבטחה'), T('An access point is a bridge from Wi-Fi to the wired LAN: it needs only the SSID and the security settings.', 'Точка доступа — мост из Wi-Fi в проводную LAN: ей нужны только SSID и настройки защиты.', 'נקודת גישה היא גשר מה-Wi-Fi ל-LAN הקווית: היא צריכה רק SSID והגדרות אבטחה.')],
    client: [T(d + ' — wireless card ' + w.module + ' and Wi-Fi "' + w.ssid + '"', d + ' — беспроводная карта ' + w.module + ' и Wi-Fi "' + w.ssid + '"', d + ' — כרטיס אלחוטי ' + w.module + ' ו-Wi-Fi ‏"' + w.ssid + '"'), T('The module is changed only with the power off. The client joins when the SSID, the security mode and the key match the access point.', 'Модуль меняют только при выключенном питании. Клиент подключится, когда SSID, тип защиты и ключ совпадут с точкой доступа.', 'מחליפים את המודול רק כשהחשמל כבוי. הלקוח מתחבר כשה-SSID, סוג האבטחה והמפתח תואמים לנקודת הגישה.')],
  }[w.kind];
  return {
    kind: 'wifi', dev: d, title: T3[0], explain: () => T3[1],
    lines: () => [{ via: 'gui', dev: d, lines: wifiSolutionLines(w).map((x) => ({ text: x, note: null })) }],
    apply(topo) { wifiSolutionApply(topo, d, w); netCommit(topo); },
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
      lines: () => { const all = ['enable', 'configure terminal', ...cmds, 'end'], notes = cmdNotes(all); return [{ via: 'cli', dev: d, lines: all.map((c, i) => ({ text: c, note: notes[i] })) }]; },
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
  for (const [d, w] of Object.entries(s.wifi || {})) steps.push(wifiSolutionStep(d, w));
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
