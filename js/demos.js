'use strict';
// «Посмотреть вживую»: готовые маленькие сети к урокам. Демонстрация строит сеть, отправляет пакеты
// и возвращает события для режима Simulation — пакеты бегут по схеме шаг за шагом.

const DEMOS = [];
function demoDef(d) { DEMOS.push(d); }
function demosForLesson(lessonId) { return DEMOS.filter((d) => d.lessons.includes(lessonId)); }

demoDef({
  id: 'arp-lan', lessons: ['itn03', 'itn07', 'itn09', 'itn01'],
  title: T('ARP and ping inside one LAN', 'ARP и ping внутри одной сети', 'ARP ו-ping בתוך רשת אחת'),
  intro: T('PC1 pings PC2 in the same subnet. PC1 does not know PC2\'s MAC yet, so first it broadcasts an ARP request (yellow), PC2 answers, and only then the ICMP echo (purple) goes and comes back. The switch learns the MAC addresses on the way.',
    'PC1 пингует PC2 в той же подсети. PC1 ещё не знает MAC-адрес PC2, поэтому сначала рассылает ARP-запрос (жёлтый), PC2 отвечает, и только потом ICMP echo (фиолетовый) идёт туда и обратно. Коммутатор по пути запоминает MAC-адреса.',
    'PC1 עושה ping ל-PC2 באותה תת-רשת. PC1 עוד לא מכיר את ה-MAC של PC2, ולכן קודם הוא משדר בקשת ARP (צהוב), PC2 עונה, ורק אז ה-ICMP echo (סגול) הולך וחוזר. המתג לומד בדרך את כתובות ה-MAC.'),
  build(topo) {
    tAdd(topo, '2960', 'S1', 420, 160);
    ['PC1', 'PC2', 'PC3'].forEach((p, i) => { tAdd(topo, 'PC', p, 200 + i * 220, 360); tLink(topo, p, 'FastEthernet0', 'S1', fa(i + 1)); tPc(topo, p, '192.168.1.' + (10 * (i + 1)), '255.255.255.0'); });
    tHostname(topo, ['S1']);
  },
  run: [{ kind: 'ping', from: 'PC1', ip: '192.168.1.20' }],
});

demoDef({
  id: 'router', lessons: ['itn08', 'itn10', 'itn11', 'itn13', 'static', 'srwe14'],
  title: T('Ping through a router', 'Ping через маршрутизатор', 'Ping דרך נתב'),
  intro: T('PC1 and PC2 are in different networks. PC1 sends the packet to its default gateway (R1). R1 still has to ARP for PC2, so the first packet is dropped — that is the famous ".!!!!". The second ping goes all the way. Watch the TTL drop by 1 at the router.',
    'PC1 и PC2 в разных сетях. PC1 отправляет пакет своему шлюзу (R1). R1 ещё должен узнать MAC PC2 через ARP, поэтому первый пакет теряется — это тот самый «.!!!!». Второй ping проходит до конца. Обратите внимание: на роутере TTL уменьшается на 1.',
    'PC1 ו-PC2 ברשתות שונות. PC1 שולח את החבילה לשער שלו (R1). ‏R1 עוד צריך לברר ב-ARP את ה-MAC של PC2, ולכן החבילה הראשונה אובדת — זה ה-".!!!!" המפורסם. ה-ping השני עובר עד הסוף. שימו לב: בנתב ה-TTL יורד ב-1.'),
  build(topo) {
    tAdd(topo, '1941', 'R1', 430, 110);
    tAdd(topo, '2960', 'S1', 220, 250); tAdd(topo, '2960', 'S2', 640, 250);
    tAdd(topo, 'PC', 'PC1', 220, 410); tAdd(topo, 'PC', 'PC2', 640, 410);
    tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC2', 'FastEthernet0', 'S2', fa(1));
    tLink(topo, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1'); tLink(topo, 'R1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
    tHostname(topo, ['R1', 'S1', 'S2']);
    tCli(topo, 'R1', ['interface GigabitEthernet0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'interface GigabitEthernet0/1', 'ip address 192.168.2.1 255.255.255.0', 'no shutdown']);
    tPc(topo, 'PC1', '192.168.1.10', '255.255.255.0', '192.168.1.1'); tPc(topo, 'PC2', '192.168.2.10', '255.255.255.0', '192.168.2.1');
  },
  run: [{ kind: 'ping', from: 'PC1', ip: '192.168.2.10' }, { kind: 'ping', from: 'PC1', ip: '192.168.2.10' }],
});

demoDef({
  id: 'dhcp', lessons: ['dhcp', 'itn15', 'itn02'],
  title: T('DHCP: how a PC gets its address', 'DHCP: как ПК получает адрес', 'DHCP: איך מחשב מקבל כתובת'),
  intro: T('PC1 has no address. It broadcasts DHCP Discover to everyone; the router (DHCP server) answers with an Offer, the PC requests it and the server acknowledges (DORA). Then PC1 pings its new gateway.',
    'У PC1 нет адреса. Он рассылает всем DHCP Discover; роутер (DHCP-сервер) отвечает предложением (Offer), ПК запрашивает его, сервер подтверждает (DORA). Затем PC1 пингует свой новый шлюз.',
    'ל-PC1 אין כתובת. הוא משדר לכולם DHCP Discover; הנתב (שרת ה-DHCP) עונה בהצעה (Offer), המחשב מבקש אותה והשרת מאשר (DORA). אחר כך PC1 עושה ping לשער החדש שלו.'),
  build(topo) {
    tAdd(topo, '1941', 'R1', 430, 110); tAdd(topo, '2960', 'S1', 430, 250);
    ['PC1', 'PC2'].forEach((p, i) => { tAdd(topo, 'PC', p, 300 + i * 260, 410); tLink(topo, p, 'FastEthernet0', 'S1', fa(i + 2)); });
    tLink(topo, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1');
    tHostname(topo, ['R1', 'S1']);
    tCli(topo, 'R1', ['interface GigabitEthernet0/0', 'ip address 192.168.10.1 255.255.255.0', 'no shutdown', 'exit', 'ip dhcp excluded-address 192.168.10.1 192.168.10.9',
      'ip dhcp pool LAN', 'network 192.168.10.0 255.255.255.0', 'default-router 192.168.10.1', 'dns-server 8.8.8.8']);
    Object.assign(topo.devices.PC1.cfg, { ipMode: 'dhcp', ip: null, mask: null, gateway: null, dhcpStatus: 'released' });
    Object.assign(topo.devices.PC2.cfg, { ipMode: 'dhcp', ip: null, mask: null, gateway: null, dhcpStatus: 'released' });
  },
  run: [{ kind: 'dhcp', pc: 'PC1' }, { kind: 'ping', from: 'PC1', ip: '192.168.10.1' }],
});

demoDef({
  id: 'vlan', lessons: ['vlan', 'srwe02', 'srwe10'],
  title: T('VLANs across a trunk', 'VLAN через trunk', 'VLAN דרך trunk'),
  intro: T('PC-A1 and PC-A2 are both in VLAN 10 but on different switches: the trunk carries their frames with an 802.1Q tag. Then PC-B1 (VLAN 20) tries to reach PC-A1 in the same IP subnet — the ARP broadcast stays inside VLAN 20, nobody answers, the VLANs are isolated.',
    'PC-A1 и PC-A2 оба в VLAN 10, но на разных коммутаторах: trunk переносит их кадры с тегом 802.1Q. Потом PC-B1 (VLAN 20) пытается достучаться до PC-A1 в той же IP-подсети — ARP-broadcast остаётся внутри VLAN 20, никто не отвечает: VLAN изолированы.',
    'PC-A1 ו-PC-A2 שניהם ב-VLAN 10, אבל במתגים שונים: ה-trunk נושא את המסגרות שלהם עם תג 802.1Q. אחר כך PC-B1 ‏(VLAN 20) מנסה להגיע ל-PC-A1 באותה תת-רשת IP — ה-ARP broadcast נשאר בתוך VLAN 20, אף אחד לא עונה: ה-VLAN מבודדים.'),
  build(topo) {
    tAdd(topo, '2960', 'S1', 260, 170); tAdd(topo, '2960', 'S2', 640, 170);
    tAdd(topo, 'PC', 'PC-A1', 150, 380); tAdd(topo, 'PC', 'PC-B1', 350, 380); tAdd(topo, 'PC', 'PC-A2', 640, 380);
    tLink(topo, 'S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
    tLink(topo, 'PC-A1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC-B1', 'FastEthernet0', 'S1', fa(2)); tLink(topo, 'PC-A2', 'FastEthernet0', 'S2', fa(1));
    tHostname(topo, ['S1', 'S2']);
    const sw = ['vlan 10', 'name Sales', 'vlan 20', 'name HR', 'exit', 'interface ' + fa(1), 'switchport mode access', 'switchport access vlan 10', 'interface ' + fa(2), 'switchport mode access', 'switchport access vlan 20', 'interface GigabitEthernet0/1', 'switchport mode trunk'];
    tCli(topo, 'S1', sw); tCli(topo, 'S2', sw);
    tPc(topo, 'PC-A1', '192.168.1.11', '255.255.255.0'); tPc(topo, 'PC-B1', '192.168.1.21', '255.255.255.0'); tPc(topo, 'PC-A2', '192.168.1.12', '255.255.255.0');
  },
  run: [{ kind: 'ping', from: 'PC-A1', ip: '192.168.1.12' }, { kind: 'ping', from: 'PC-B1', ip: '192.168.1.11' }],
});

demoDef({
  id: 'roas', lessons: ['intervlan'],
  title: T('Router-on-a-stick between VLANs', 'Router-on-a-stick между VLAN', 'Router-on-a-stick בין VLAN'),
  intro: T('PC-A (VLAN 10) pings PC-B (VLAN 20). The packet goes up the trunk to R1 with tag 10, R1 routes it from G0/0.10 to G0/0.20, and it comes back down the same trunk with tag 20. The first try may be lost while R1 does ARP.',
    'PC-A (VLAN 10) пингует PC-B (VLAN 20). Пакет поднимается по trunk к R1 с тегом 10, R1 маршрутизирует его из G0/0.10 в G0/0.20, и он спускается по тому же trunk с тегом 20. Первая попытка может потеряться, пока R1 делает ARP.',
    'PC-A ‏(VLAN 10) עושה ping ל-PC-B ‏(VLAN 20). החבילה עולה ב-trunk אל R1 עם תג 10, ‏R1 מנתב אותה מ-G0/0.10 ל-G0/0.20, והיא יורדת באותו trunk עם תג 20. הניסיון הראשון יכול לאבוד בזמן ש-R1 עושה ARP.'),
  build(topo) {
    tAdd(topo, '1941', 'R1', 450, 100); tAdd(topo, '2960', 'S1', 450, 250);
    tAdd(topo, 'PC', 'PC-A', 280, 410); tAdd(topo, 'PC', 'PC-B', 620, 410);
    tLink(topo, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1'); tLink(topo, 'PC-A', 'FastEthernet0', 'S1', fa(2)); tLink(topo, 'PC-B', 'FastEthernet0', 'S1', fa(3));
    tHostname(topo, ['R1', 'S1']);
    tCli(topo, 'S1', ['vlan 10', 'vlan 20', 'exit', 'interface ' + fa(2), 'switchport mode access', 'switchport access vlan 10', 'interface ' + fa(3), 'switchport mode access', 'switchport access vlan 20', 'interface GigabitEthernet0/1', 'switchport mode trunk']);
    tCli(topo, 'R1', ['interface GigabitEthernet0/0', 'no shutdown', 'interface GigabitEthernet0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0',
      'interface GigabitEthernet0/0.20', 'encapsulation dot1Q 20', 'ip address 192.168.20.1 255.255.255.0']);
    tPc(topo, 'PC-A', '192.168.10.10', '255.255.255.0', '192.168.10.1'); tPc(topo, 'PC-B', '192.168.20.10', '255.255.255.0', '192.168.20.1');
  },
  run: [{ kind: 'ping', from: 'PC-A', ip: '192.168.20.10' }, { kind: 'ping', from: 'PC-A', ip: '192.168.20.10' }],
});

demoDef({
  id: 'ttl', lessons: ['itn13', 'ospf', 'trouble', 'srwe16'],
  title: T('A packet crossing three routers', 'Пакет через три маршрутизатора', 'חבילה שעוברת שלושה נתבים'),
  intro: T('PC1 pings PC3 across R1, R2 and R3 (static routes are already set). Every router decrements the TTL and builds a new frame; each one also has to ARP for its next hop, so the first pings get lost one router at a time.',
    'PC1 пингует PC3 через R1, R2 и R3 (статические маршруты уже настроены). Каждый роутер уменьшает TTL и строит новый кадр; каждому также нужно узнать MAC следующего узла через ARP, поэтому первые ping теряются по одному на каждом роутере.',
    'PC1 עושה ping ל-PC3 דרך R1, ‏R2 ו-R3 (הנתיבים הסטטיים כבר מוגדרים). כל נתב מקטין את ה-TTL ובונה מסגרת חדשה; כל אחד גם צריך לברר ב-ARP את ה-MAC של הקפיצה הבאה, ולכן ה-ping-ים הראשונים אובדים, נתב אחד בכל פעם.'),
  build(topo) {
    tAdd(topo, '1941', 'R1', 200, 170); tAdd(topo, '2911', 'R2', 450, 120); tAdd(topo, '1941', 'R3', 700, 170);
    tAdd(topo, 'PC', 'PC1', 200, 400); tAdd(topo, 'PC', 'PC3', 700, 400);
    tLink(topo, 'PC1', 'FastEthernet0', 'R1', 'GigabitEthernet0/0'); tLink(topo, 'PC3', 'FastEthernet0', 'R3', 'GigabitEthernet0/0');
    tLink(topo, 'R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/1'); tLink(topo, 'R2', 'GigabitEthernet0/2', 'R3', 'GigabitEthernet0/1');
    tHostname(topo, ['R1', 'R2', 'R3']);
    tCli(topo, 'R1', ['interface GigabitEthernet0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'interface GigabitEthernet0/1', 'ip address 10.0.12.1 255.255.255.252', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 10.0.12.2']);
    tCli(topo, 'R2', ['interface GigabitEthernet0/1', 'ip address 10.0.12.2 255.255.255.252', 'no shutdown', 'interface GigabitEthernet0/2', 'ip address 10.0.23.1 255.255.255.252', 'no shutdown', 'exit',
      'ip route 192.168.1.0 255.255.255.0 10.0.12.1', 'ip route 192.168.3.0 255.255.255.0 10.0.23.2']);
    tCli(topo, 'R3', ['interface GigabitEthernet0/0', 'ip address 192.168.3.1 255.255.255.0', 'no shutdown', 'interface GigabitEthernet0/1', 'ip address 10.0.23.2 255.255.255.252', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 10.0.23.1']);
    tPc(topo, 'PC1', '192.168.1.10', '255.255.255.0', '192.168.1.1'); tPc(topo, 'PC3', '192.168.3.10', '255.255.255.0', '192.168.3.1');
  },
  run: [{ kind: 'ping', from: 'PC1', ip: '192.168.3.10' }, { kind: 'ping', from: 'PC1', ip: '192.168.3.10' }, { kind: 'ping', from: 'PC1', ip: '192.168.3.10' }, { kind: 'ping', from: 'PC1', ip: '192.168.3.10' }],
});

// Построить сеть демонстрации (новая топология).
function demoBuild(demo) {
  const topo = newTopology();
  demo.build(topo);
  touch(topo);
  netCommit(topo);
  return topo;
}

// Выполнить действия демонстрации. Возвращает {events, results:[{kind, status|ok}]}.
function demoRun(topo, demo) {
  const events = [], stepRef = { v: 0 };
  const results = [];
  for (const a of demo.run) {
    if (a.kind === 'ping') {
      const r = pingOnce(topo, a.from, ipToInt(a.ip), { arp: true, events, stepRef });
      results.push({ kind: 'ping', from: a.from, ip: a.ip, status: r.status });
    } else if (a.kind === 'dhcp') {
      topo.devices[a.pc].cfg.ipMode = 'dhcp';
      const r = pcDhcpRenew(topo, a.pc, { events, stepRef });
      results.push({ kind: 'dhcp', pc: a.pc, ok: !!r.ok, ip: r.ip || null });
    }
    netCommit(topo);
  }
  return { events, results };
}

// ---------- Подпись «Что происходит» к шагу режима Simulation ----------
// evs — события одного шага. Возвращает T(...) или null.
function simCaption(topo, evs) {
  if (!evs || !evs.length) return null;
  const nm = (id) => (topo.devices[id] ? topo.devices[id].name : '?');
  const typ = (id) => (topo.devices[id] ? topo.devices[id].type : '');
  const e = evs.find((x) => x.fail) || evs[0];
  const A = nm(e.from), B = nm(e.to), i = e.info || {};
  const many = evs.length > 1 ? evs.map((x) => nm(x.to)).filter((v, k, a) => a.indexOf(v) === k) : null;
  let t;
  if (e.proto === 'ARP') {
    if (i.kind === 'fail') t = T('Nobody answered "Who has ' + i.target + '?" — ' + A + ' cannot find the MAC address, so the packet is dropped. Check the IP address, the default gateway and the cables.',
      'Никто не ответил на «У кого ' + i.target + '?» — ' + A + ' не может узнать MAC-адрес, поэтому пакет отброшен. Проверьте IP-адрес, шлюз по умолчанию и кабели.',
      'אף אחד לא ענה ל"למי יש את ' + i.target + '?" — ' + A + ' לא מוצא את כתובת ה-MAC ולכן החבילה נזרקת. בדקו את כתובת ה-IP, ה-default gateway והכבלים.');
    else if (i.kind === 'reply') t = T('ARP reply: "I am ' + i.target + ', here is my MAC address." It goes back only to the one who asked (unicast). ' + A + ' → ' + B + '.',
      'ARP-ответ: «' + i.target + ' — это я, вот мой MAC-адрес». Он идёт только тому, кто спрашивал (unicast). ' + A + ' → ' + B + '.',
      'תשובת ARP: "אני ' + i.target + ', הנה כתובת ה-MAC שלי." היא חוזרת רק למי ששאל (unicast). ' + A + ' → ' + B + '.');
    else if (typ(e.from) === 'switch') t = T('Switch ' + A + ' got a broadcast (destination MAC FFFF.FFFF.FFFF), so it floods it out of every port in the VLAN' + (many ? ': ' + many.join(', ') : '') + '.',
      'Коммутатор ' + A + ' получил broadcast (MAC назначения FFFF.FFFF.FFFF), поэтому рассылает его во все порты этой VLAN' + (many ? ': ' + many.join(', ') : '') + '.',
      'המתג ' + A + ' קיבל broadcast ‏(MAC יעד FFFF.FFFF.FFFF), ולכן מציף אותו לכל הפורטים ב-VLAN' + (many ? ': ' + many.join(', ') : '') + '.');
    else t = T(A + ' needs the MAC address of ' + i.target + ' before it can send. It asks everyone in the LAN: "Who has ' + i.target + '?" (ARP request, broadcast).',
      A + ' нужен MAC-адрес ' + i.target + ', иначе отправить нельзя. Он спрашивает всех в сети: «У кого ' + i.target + '?» (ARP-запрос, broadcast).',
      A + ' צריך את כתובת ה-MAC של ' + i.target + ' לפני השליחה. הוא שואל את כולם ברשת: "למי יש את ' + i.target + '?" (בקשת ARP, ‏broadcast).');
  } else if (e.proto === 'DHCP') {
    const list = many || [B];
    if (i.type === 'DISCOVER' && typ(e.from) === 'pc') t = T(A + ' has no IP address yet. It shouts to everyone: "Is there a DHCP server?" (DHCP DISCOVER from 0.0.0.0 to 255.255.255.255).',
      'У ' + A + ' ещё нет IP-адреса. Он кричит всем: «Есть тут DHCP-сервер?» (DHCP DISCOVER с 0.0.0.0 на 255.255.255.255).',
      'ל-' + A + ' עוד אין כתובת IP. הוא צועק לכולם: "יש פה שרת DHCP?" (DHCP DISCOVER מ-0.0.0.0 ל-255.255.255.255).');
    else if (i.type === 'DISCOVER') t = T(A + ' floods the DHCP broadcast out of every port in the VLAN: ' + list.join(', ') + '. Only the DHCP server will answer.',
      A + ' рассылает DHCP-broadcast во все порты VLAN: ' + list.join(', ') + '. Ответит только DHCP-сервер.',
      A + ' מציף את ה-broadcast של DHCP לכל הפורטים ב-VLAN: ' + list.join(', ') + '. רק שרת ה-DHCP יענה.');
    else if (typ(e.to) === 'pc') t = T(B + ' gets its address: ' + (i.ip || '?') + ' (DHCP OFFER + ACK), together with the mask, the default gateway and DNS. Now it can talk to the network.',
      B + ' получает адрес ' + (i.ip || '?') + ' (DHCP OFFER + ACK), а с ним маску, шлюз по умолчанию и DNS. Теперь он может работать в сети.',
      B + ' מקבל את הכתובת ' + (i.ip || '?') + ' ‏(DHCP OFFER + ACK), יחד עם המסכה, ה-default gateway וה-DNS. עכשיו הוא יכול לעבוד ברשת.');
    else t = T('The DHCP server ' + A + ' answers: it offers ' + (i.ip || 'an address') + ' and confirms it (OFFER + ACK).',
      'DHCP-сервер ' + A + ' отвечает: предлагает ' + (i.ip || 'адрес') + ' и подтверждает его (OFFER + ACK).',
      'שרת ה-DHCP ‏' + A + ' עונה: מציע את ' + (i.ip || 'הכתובת') + ' ומאשר אותה (OFFER + ACK).');
  } else {
    const reply = i.type === 'Echo Reply';
    const what = reply ? T('the ping reply (Echo Reply)', 'ответ на ping (Echo Reply)', 'תשובת ה-ping ‏(Echo Reply)') : T('the ping (Echo Request)', 'ping (Echo Request)', 'ה-ping ‏(Echo Request)');
    if (e.fail && i.code === 'arp-pending') t = T(A + ' had to ask ARP for the next MAC address first, so this first packet is dropped (a timeout ".") — the next pings will pass. That is why the first ping through a router often shows ".!!!!".',
      A + ' сначала пришлось узнавать MAC через ARP, поэтому этот первый пакет потерян (таймаут «.») — следующие пройдут. Поэтому первый ping через маршрутизатор часто показывает «.!!!!».',
      A + ' היה צריך קודם לשאול ARP על כתובת ה-MAC הבאה, ולכן החבילה הראשונה הזו נזרקת (timeout ‏".") — הבאות יעברו. בגלל זה ping ראשון דרך נתב מראה לעתים קרובות ".!!!!".');
    else if (e.fail && i.code === 'ttl') t = T('The TTL reached 0 at ' + A + ', so it drops the packet (this stops packets from looping forever).',
      'На ' + A + ' TTL дошёл до 0, поэтому пакет отброшен (так пакеты не ходят по кругу вечно).',
      'ב-' + A + ' ה-TTL הגיע ל-0, ולכן החבילה נזרקת (כך חבילות לא מסתובבות במעגל לנצח).');
    else if (e.fail && typ(e.from) === 'switch') t = T(A + ' drops the frame: the destination is not in the same VLAN — switches do not route between VLANs. You need a router or a Layer 3 switch.',
      A + ' отбрасывает кадр: получатель не в той же VLAN — коммутатор не маршрутизирует между VLAN. Нужен маршрутизатор или L3-коммутатор.',
      A + ' זורק את המסגרת: היעד לא באותו VLAN — מתג לא מנתב בין VLANs. צריך נתב או מתג שכבה 3.');
    else if (e.fail) t = T(A + ' drops the packet: there is no route to the destination, the next hop does not answer, or the TTL ran out.',
      A + ' отбрасывает пакет: нет маршрута к получателю, следующий узел не отвечает или закончился TTL.',
      A + ' זורק את החבילה: אין מסלול ליעד, הקפיצה הבאה לא עונה, או שה-TTL נגמר.');
    else if (typ(e.to) === 'switch') t = T('Switch ' + B + ' reads only the destination MAC address and sends ' + what.en + ' out of one port — it does not look at IP addresses.',
      'Коммутатор ' + B + ' смотрит только на MAC-адрес назначения и отправляет ' + what.ru + ' в один порт — на IP-адреса он не смотрит.',
      'המתג ' + B + ' קורא רק את כתובת ה-MAC של היעד ושולח את ' + what.he + ' לפורט אחד — הוא לא מסתכל על כתובות IP.');
    else if (typ(e.to) === 'router' && i.dst && !ownsIpQuick(topo, e.to, i.dst)) t = T('Router ' + B + ' receives ' + what.en + ' for ' + i.dst + ', finds the best route in its routing table and sends it on. TTL goes down by 1.',
      'Маршрутизатор ' + B + ' получает ' + what.ru + ' для ' + i.dst + ', ищет лучший маршрут в таблице маршрутизации и отправляет дальше. TTL уменьшается на 1.',
      'הנתב ' + B + ' מקבל את ' + what.he + ' עבור ' + i.dst + ', מחפש את המסלול הטוב ביותר בטבלת הניתוב ושולח הלאה. ה-TTL יורד ב-1.');
    else t = T(B + ' receives ' + what.en + (reply ? ' — the ping worked! "!" in the output.' : ' from ' + (i.src || A) + ' and sends a reply back.'),
      B + ' получает ' + what.ru + (reply ? ' — ping прошёл! В выводе «!».' : ' от ' + (i.src || A) + ' и отправляет ответ обратно.'),
      B + ' מקבל את ' + what.he + (reply ? ' — ה-ping הצליח! "!" בפלט.' : ' מ-' + (i.src || A) + ' ושולח תשובה בחזרה.'));
    if (e.tag) t = T(t.en + ' On this trunk the frame carries an 802.1Q tag: VLAN ' + e.tag + '.', t.ru + ' На этом trunk кадр несёт тег 802.1Q: VLAN ' + e.tag + '.', t.he + ' ב-trunk הזה המסגרת נושאת תג 802.1Q: ‏VLAN ' + e.tag + '.');
  }
  return t;
}

function ownsIpQuick(topo, devId, ipStr) {
  const d = topo.devices[devId];
  if (!d || !d.cfg || !d.cfg.interfaces) return false;
  return Object.values(d.cfg.interfaces).some((x) => x && x.ip && (x.ip === ipStr || (typeof x.ip === 'number' && intToIp(x.ip) === ipStr)));
}
