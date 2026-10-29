'use strict';
// Тренировочные задания: генераторы по seed, проверки, эталонные решения.
// Текст задания — на английском, переводы — на русский и иврит: T(en, ru, he).

const TASK_TOPICS = [
  { id: 'basics', title: T('IP addressing & ping', 'IP-адресация и ping', 'כתובות IP ו-ping') },
  { id: 'static', title: T('Static routing', 'Статическая маршрутизация', 'ניתוב סטטי') },
  { id: 'vlan', title: T('VLAN & trunk', 'VLAN и trunk', 'VLAN ו-trunk') },
  { id: 'intervlan', title: T('Inter-VLAN routing', 'Маршрутизация между VLAN', 'ניתוב בין VLAN') },
  { id: 'stp', title: T('Spanning Tree (STP)', 'Spanning Tree (STP)', 'Spanning Tree ‏(STP)') },
  { id: 'etherchannel', title: T('EtherChannel', 'EtherChannel', 'EtherChannel') },
  { id: 'dhcp', title: T('DHCP', 'DHCP', 'DHCP') },
  { id: 'rip', title: T('RIP', 'RIP', 'RIP') },
  { id: 'ospf', title: T('OSPF', 'OSPF', 'OSPF') },
  { id: 'device', title: T('Device setup & security', 'Базовая настройка и защита', 'הגדרת התקן ואבטחה') },
  { id: 'trouble', title: T('Troubleshooting', 'Поиск неисправностей', 'איתור תקלות') },
];

const TASK_LEVELS = { 1: T('Easy', 'Лёгкое', 'קל'), 2: T('Medium', 'Среднее', 'בינוני'), 3: T('Hard', 'Сложное', 'קשה') };

const TASK_TEMPLATES = [];
function taskDef(id, topic, level, gen) { TASK_TEMPLATES.push({ id, topic, level, gen }); }

// ---------- Общие помощники ----------
const VLAN_NAMES = ['Sales', 'HR', 'IT', 'Finance', 'Guest', 'Staff', 'Students', 'Faculty', 'Engineering', 'Marketing', 'Support', 'Admin', 'Lab', 'Office', 'Accounting'];
const POOL_NAMES = ['LAN', 'OFFICE', 'STAFF', 'CLIENTS', 'USERS', 'LAN-POOL', 'BRANCH'];
const PASSWORDS = ['cisco', 'class', 'netlab', 'admin123', 'pass123', 'secret1', 'trainer', 'letmein'];
const ROUTER_MODELS = ['1941', '2911', '4331'];

function subnetPool(rng) {
  const used = new Set();
  const take = (net) => { if (used.has(net)) return false; used.add(net); return true; };
  return {
    lan(family) {
      for (;;) {
        const f = family !== undefined ? family : rng.int(0, 2);
        let net;
        if (f === 0) net = '192.168.' + rng.int(1, 250) + '.0';
        else if (f === 1) net = '172.' + rng.int(16, 31) + '.' + rng.int(1, 250) + '.0';
        else net = '10.' + rng.int(1, 250) + '.' + rng.int(1, 250) + '.0';
        if (take(net)) return { net, len: 24, mask: '255.255.255.0' };
      }
    },
    p2p() {
      for (;;) {
        const net = '10.' + rng.int(0, 9) + '.' + rng.int(0, 250) + '.' + 4 * rng.int(0, 60);
        if (take(net)) return { net, len: 30, mask: '255.255.255.252' };
      }
    },
    sized(len) {
      for (;;) {
        const size = Math.pow(2, 32 - len);
        const third = rng.int(1, 250);
        const fourth = len >= 24 ? size * rng.int(0, 256 / size - 1) : 0;
        const net = '192.168.' + third + '.' + fourth;
        if (take(net)) return { net, len, mask: lenToMask(len) };
      }
    },
  };
}

function host(netObj, n) { return intToIp(ipToInt(netObj.net) + n); }
function lastHost(netObj) { return intToIp(broadcastOf(ipToInt(netObj.net), netObj.len) - 1); }
function wildcardOf(len) { return intToIp((~lenToMaskInt(len)) >>> 0); }
function gi(model, i) { return DEVICE_CATALOG[model].ports.filter((p) => p.startsWith('Gigabit'))[i]; }
function fa(n) { return 'FastEthernet0/' + n; }
function sh(n) { return ifShort(n); }

function tAdd(topo, model, id, x, y) { const d = addDevice(topo, model, x, y, { id, name: id }); return d; }
function tLink(topo, a, ap, b, bp, cable) { const r = addLink(topo, a, ap, b, bp, cable || 'auto'); if (r.error) throw new Error('task link ' + a + ' ' + ap + ' ' + b + ' ' + bp + ': ' + r.error); }
function tCli(topo, id, cmds) { iosRunConfig(topo, id, cmds); }
function tPc(topo, id, ip, mask, gw) { Object.assign(topo.devices[id].cfg, { ipMode: 'static', ip, mask, gateway: gw || null }); }
function tHostname(topo, ids) { for (const id of ids) tCli(topo, id, ['hostname ' + id]); }

function cableName(topo, a, b) {
  const A = topo.devices[a], B = topo.devices[b];
  return correctCable(A, B) === 'cross' ? 'Copper Cross-Over' : 'Copper Straight-Through';
}

function rowIf(dev, ifn, ip, mask, gw) { return { dev, iface: ifn ? sh(ifn) : 'NIC', ip, mask, gw: gw || '' }; }
function rowPc(dev, ip, mask, gw) { return { dev, iface: 'NIC', ip, mask, gw: gw || '' }; }

// ---------- Проверки ----------
function findLinkBetween(topo, a, ap, b, bp) {
  for (const l of Object.values(topo.links)) {
    const m1 = l.a.dev === a && l.b.dev === b && (!ap || l.a.port === ap) && (!bp || l.b.port === bp);
    const m2 = l.a.dev === b && l.b.dev === a && (!bp || l.a.port === bp) && (!ap || l.b.port === ap);
    if (m1 || m2) return l;
  }
  return null;
}

const CHK = {
  link(a, ap, b, bp) {
    return {
      label: T('Cable ' + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp) + ' is connected and up', 'Кабель ' + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp) + ' подключён и работает',
        'הכבל ' + a + ' ' + sh(ap) + ' ↔ ' + b + ' ' + sh(bp) + ' מחובר ופעיל'),
      run(topo) {
        if (!topo.devices[a] || !topo.devices[b]) return { ok: false };
        const l = findLinkBetween(topo, a, ap, b, bp);
        if (!l) {
          const any = findLinkBetween(topo, a, null, b, null);
          if (any) return { ok: false, hint: T('Devices are connected, but not via the required ports.', 'Устройства соединены, но не теми портами, что указаны в задании.', 'ההתקנים מחוברים, אבל לא דרך הפורטים שנדרשו במשימה.') };
          return { ok: false, hint: T('No cable between these ports yet.', 'Кабеля между этими портами пока нет.', 'עדיין אין כבל בין הפורטים האלה.') };
        }
        if (!linkCableOk(topo, l)) return { ok: false, hint: T('Wrong cable type: use ' + cableName(topo, a, b) + '.', 'Неверный тип кабеля: нужен ' + cableName(topo, a, b) + '.', 'סוג כבל שגוי: צריך ' + cableName(topo, a, b) + '.') };
        const up = portPhysUp(topo, l.a.dev, l.a.port);
        if (!up) return { ok: false, hint: T('Cable is OK but the link is down — is an interface shut down?', 'Кабель правильный, но линк не поднят — интерфейс выключен (shutdown)?', 'הכבל תקין אבל הקישור לא פעיל — אולי ממשק כבוי (shutdown)?') };
        return { ok: true };
      },
    };
  },
  ifIp(dev, ifn, ip, mask) {
    return {
      label: T(dev + ' ' + sh(ifn) + ' has address ' + ip + ' ' + mask, dev + ' ' + sh(ifn) + ': адрес ' + ip + ' ' + mask, 'ל-' + sh(ifn) + ' של ' + dev + ' יש כתובת ' + ip + ' ' + mask),
      run(topo) {
        const d = topo.devices[dev];
        const ic = d && d.cfg.interfaces[ifn];
        if (!ic) return { ok: false, hint: T('Interface ' + ifn + ' is not configured.', 'Интерфейс ' + ifn + ' не настроен.', 'הממשק ' + ifn + ' לא מוגדר.') };
        if (ic.ip !== ip) return { ok: false, hint: T('Address now: ' + (ic.ip || 'not set') + ' — must be ' + ip + '.', 'Сейчас адрес: ' + (ic.ip || 'не задан') + ' — нужен ' + ip + '.', 'הכתובת עכשיו: ' + (ic.ip || 'לא מוגדרת') + ' — צריכה להיות ' + ip + '.') };
        if (ic.mask !== mask) return { ok: false, hint: T('Mask now: ' + ic.mask + ' — must be ' + mask + ' (/' + maskToLen(mask) + ').', 'Сейчас маска: ' + ic.mask + ' — нужна ' + mask + ' (/' + maskToLen(mask) + ').', 'המסכה עכשיו: ' + ic.mask + ' — צריכה להיות ' + mask + ' (‎/' + maskToLen(mask) + ').') };
        return { ok: true };
      },
    };
  },
  ifUp(dev, ifn) {
    return {
      label: T(dev + ' ' + sh(ifn) + ' is up/up', dev + ' ' + sh(ifn) + ' в состоянии up/up', sh(ifn) + ' של ' + dev + ' במצב up/up'),
      run(topo) {
        const d = topo.devices[dev];
        if (!d || !d.cfg.interfaces[ifn]) return { ok: false };
        const s = ifStatus(topo, d, ifn);
        if (s.status === 'administratively down') return { ok: false, hint: T('Interface is shut down: use "no shutdown".', 'Интерфейс выключен: нужна команда "no shutdown".', 'הממשק כבוי: צריך את הפקודה "no shutdown".') };
        if (s.protocol !== 'up') return { ok: false, hint: T('Interface is down: check the cable.', 'Интерфейс down: проверьте кабель.', 'הממשק במצב down: בדקו את הכבל.') };
        return { ok: true };
      },
    };
  },
  pc(dev, ip, mask, gw) {
    return {
      label: T(dev + ': IP ' + ip + ', mask ' + mask + (gw ? ', gateway ' + gw : ''), dev + ': IP ' + ip + ', маска ' + mask + (gw ? ', шлюз ' + gw : ''),
        dev + ': כתובת IP ' + ip + ', מסכה ' + mask + (gw ? ', שער ' + gw : '')),
      run(topo) {
        const c = topo.devices[dev].cfg;
        if (c.ip !== ip) return { ok: false, hint: T('IP now: ' + (c.ip || 'not set') + ' — must be ' + ip + ' (see the addressing table).', 'Сейчас IP: ' + (c.ip || 'не задан') + ' — нужен ' + ip + ' (см. таблицу адресации).', 'ה-IP עכשיו: ' + (c.ip || 'לא מוגדר') + ' — צריך להיות ' + ip + ' (ראו בטבלת הכתובות).') };
        if (c.mask !== mask) return { ok: false, hint: T('Mask now: ' + (c.mask || 'not set') + ' — must be ' + mask + ' (/' + maskToLen(mask) + ').', 'Сейчас маска: ' + (c.mask || 'не задана') + ' — нужна ' + mask + ' (/' + maskToLen(mask) + ').', 'המסכה עכשיו: ' + (c.mask || 'לא מוגדרת') + ' — צריכה להיות ' + mask + ' (‎/' + maskToLen(mask) + ').') };
        if (gw && c.gateway !== gw) return { ok: false, hint: T('Gateway now: ' + (c.gateway || 'not set') + ' — must be ' + gw + ' (the router interface in this subnet).', 'Сейчас шлюз: ' + (c.gateway || 'не задан') + ' — нужен ' + gw + ' (интерфейс роутера в этой подсети).', 'השער עכשיו: ' + (c.gateway || 'לא מוגדר') + ' — צריך להיות ' + gw + ' (ממשק הנתב בתת-הרשת הזו).') };
        return { ok: true };
      },
    };
  },
  ping(a, b, ip, expect = true) {
    return {
      label: expect
        ? T(a + ' can ping ' + b + ' (' + ip + ')', a + ' успешно пингует ' + b + ' (' + ip + ')', a + ' מצליח לעשות ping ל-' + b + ' (' + ip + ')')
        : T(a + ' must NOT reach ' + b + ' (' + ip + ')', a + ' НЕ должен достучаться до ' + b + ' (' + ip + ')', a + ' לא אמור להגיע ל-' + b + ' (' + ip + ')'),
      run(topo) {
        const r = canReach(topo, a, ip);
        const ok = r.status === 'reply';
        if (ok === expect) return { ok: true };
        if (!expect) return { ok: false, hint: T('Traffic still passes — the devices are not isolated yet.', 'Трафик всё ещё проходит — устройства пока не изолированы.', 'התעבורה עדיין עוברת — ההתקנים עוד לא מבודדים.') };
        return { ok: false, hint: explainReach(topo, a, ip, r) };
      },
    };
  },
  route(dev, net, len, code, viaText) {
    const pfx = net + '/' + len;
    const names = { S: T('static', 'статический', 'סטטי'), R: T('RIP', 'RIP', 'RIP'), O: T('OSPF', 'OSPF', 'OSPF') };
    return {
      label: T(dev + ' has a ' + names[code].en + ' route to ' + pfx + (viaText ? ' ' + viaText.en : ''), 'У ' + dev + ' есть ' + names[code].ru + ' маршрут в ' + pfx + (viaText ? ' ' + viaText.ru : ''),
        'ל-' + dev + ' יש נתיב ' + names[code].he + ' אל ' + pfx + (viaText ? ' ' + (viaText.he || viaText.en) : '')),
      run(topo) {
        const routes = routesOf(topo, topo.devices[dev]);
        const r = routes.find((x) => x.net === ipToInt(net) && x.len === len);
        if (r && r.code.startsWith(code)) return { ok: true };
        if (code !== 'S' || len !== 0) {
          // маршрут по умолчанию тоже покрывает сеть для статики
          if (code === 'S' && routes.some((x) => x.len === 0 && x.code.startsWith('S'))) return { ok: true };
        }
        if (r) return { ok: false, hint: T('There is a route, but it is "' + r.code + '", not "' + code + '".', 'Маршрут есть, но типа "' + r.code + '", а не "' + code + '".', 'יש נתיב, אבל מסוג "' + r.code + '" ולא "' + code + '".') };
        return { ok: false, hint: T('No route to ' + pfx + ' in "show ip route".', 'В "show ip route" нет маршрута в ' + pfx + '.', 'ב-"show ip route" אין נתיב אל ' + pfx + '.') };
      },
    };
  },
  defaultRoute(dev) {
    return {
      label: T(dev + ' has a default static route (0.0.0.0/0)', 'У ' + dev + ' есть статический маршрут по умолчанию (0.0.0.0/0)', 'ל-' + dev + ' יש נתיב סטטי של ברירת מחדל (0.0.0.0/0)'),
      run(topo) {
        return routesOf(topo, topo.devices[dev]).some((x) => x.len === 0 && x.code.startsWith('S'))
          ? { ok: true } : { ok: false, hint: T('Use: ip route 0.0.0.0 0.0.0.0 <next-hop>', 'Команда: ip route 0.0.0.0 0.0.0.0 <next-hop>', 'הפקודה: ip route 0.0.0.0 0.0.0.0 <next-hop>') };
      },
    };
  },
  vlan(sw, id, name) {
    return {
      label: T(sw + ': VLAN ' + id + (name ? ' named "' + name + '"' : '') + ' exists', sw + ': есть VLAN ' + id + (name ? ' с именем "' + name + '"' : ''),
        'ב-' + sw + ' קיים VLAN ' + id + (name ? ' בשם "' + name + '"' : '')),
      run(topo) {
        const v = topo.devices[sw].cfg.vlans[id];
        if (!v) return { ok: false, hint: T('Create it: vlan ' + id, 'Создайте: vlan ' + id, 'צרו אותו: vlan ' + id) };
        if (name && v.name !== name) return { ok: false, hint: T('Name is "' + v.name + '"', 'Сейчас имя "' + v.name + '"', 'השם עכשיו "' + v.name + '"') };
        return { ok: true };
      },
    };
  },
  access(sw, port, vlan) {
    return {
      label: T(sw + ' ' + sh(port) + ' is an access port in VLAN ' + vlan, sw + ' ' + sh(port) + ' — access-порт в VLAN ' + vlan, sh(port) + ' של ' + sw + ' הוא פורט access ב-VLAN ' + vlan),
      run(topo) {
        const d = topo.devices[sw];
        const ic = d.cfg.interfaces[port];
        if (ic.mode !== 'access') return { ok: false, hint: T('The port is in mode "' + ic.mode + '", not access.', 'Порт в режиме «' + ic.mode + '», а не access.', 'הפורט במצב "' + ic.mode + '" ולא access.') };
        if (ic.accessVlan !== vlan) return { ok: false, hint: T('Port is in VLAN ' + ic.accessVlan + ' — must be VLAN ' + vlan + '.', 'Порт сейчас в VLAN ' + ic.accessVlan + ' — нужен VLAN ' + vlan + '.', 'הפורט עכשיו ב-VLAN ' + ic.accessVlan + ' — צריך להיות ב-VLAN ' + vlan + '.') };
        return { ok: true };
      },
    };
  },
  trunk(sw, port) {
    return {
      label: T(sw + ' ' + sh(port) + ' is trunking', sw + ' ' + sh(port) + ' работает как trunk', sh(port) + ' של ' + sw + ' עובד כ-trunk'),
      run(topo) {
        const d = topo.devices[sw];
        if (ifKind(port) === 'po') {
          if (!d.cfg.interfaces[port]) return { ok: false, hint: T(port + ' does not exist yet — it appears with "channel-group".', port + ' пока нет — он появится после «channel-group».', port + ' עדיין לא קיים — הוא נוצר עם "channel-group".') };
          if (!ifUp(topo, d, port)) return { ok: false, hint: T(port + ' is down: no ports are bundled yet.', port + ' не работает: в пучке пока нет портов.', port + ' לא פעיל: עדיין אין פורטים בצרור.') };
        } else if (!portPhysUp(topo, sw, port)) return { ok: false, hint: T('The link on this port is down.', 'Линк на этом порту не поднят.', 'הקישור בפורט הזה לא פעיל.') };
        return swOperMode(topo, d, swRepPort(topo, d, port)) === 'trunk' ? { ok: true } : { ok: false, hint: T('Use "switchport mode trunk".', 'Нужна команда "switchport mode trunk".', 'צריך את הפקודה "switchport mode trunk".') };
      },
    };
  },
  native(sw, port, vlan) {
    return {
      label: T(sw + ' ' + sh(port) + ': native VLAN ' + vlan, sw + ' ' + sh(port) + ': native VLAN ' + vlan, sh(port) + ' של ' + sw + ': ‏native VLAN ' + vlan),
      run(topo) { const ic = topo.devices[sw].cfg.interfaces[port]; return ic.nativeVlan === vlan ? { ok: true } : { ok: false, hint: T('Native VLAN now ' + ic.nativeVlan + ' — must be ' + vlan + '.', 'Сейчас native VLAN ' + ic.nativeVlan + ' — нужен ' + vlan + '.', 'ה-native VLAN עכשיו ' + ic.nativeVlan + ' — צריך להיות ' + vlan + '.') }; },
    };
  },
  subif(dev, ifn, vlan, ip, mask) {
    return {
      label: T(dev + ' ' + sh(ifn) + ': dot1Q ' + vlan + ', ' + ip + ' ' + mask, dev + ' ' + sh(ifn) + ': dot1Q ' + vlan + ', ' + ip + ' ' + mask, sh(ifn) + ' של ' + dev + ': ‏dot1Q ' + vlan + ', ' + ip + ' ' + mask),
      run(topo) {
        const ic = topo.devices[dev].cfg.interfaces[ifn];
        if (!ic) return { ok: false, hint: T('Create it: interface ' + ifn, 'Создайте: interface ' + ifn, 'צרו אותו: interface ' + ifn) };
        if (!ic.encap || ic.encap.vlan !== vlan) return { ok: false, hint: T('Use "encapsulation dot1Q ' + vlan + '".', 'Нужна команда "encapsulation dot1Q ' + vlan + '".', 'צריך את הפקודה "encapsulation dot1Q ' + vlan + '".') };
        if (ic.ip !== ip || ic.mask !== mask) return { ok: false, hint: T('Address now: ' + (ic.ip ? ic.ip + ' ' + ic.mask : 'not set') + ' — must be ' + ip + ' ' + mask + '.', 'Сейчас адрес: ' + (ic.ip ? ic.ip + ' ' + ic.mask : 'не задан') + ' — нужен ' + ip + ' ' + mask + '.', 'הכתובת עכשיו: ' + (ic.ip ? ic.ip + ' ' + ic.mask : 'לא מוגדרת') + ' — צריכה להיות ' + ip + ' ' + mask + '.') };
        return { ok: true };
      },
    };
  },
  dhcpPool(dev, name, net, mask, gw, dns) {
    return {
      label: T(dev + ': DHCP pool ' + name + ' (' + net + ' ' + mask + ', router ' + gw + (dns ? ', DNS ' + dns : '') + ')',
        dev + ': DHCP-пул ' + name + ' (' + net + ' ' + mask + ', шлюз ' + gw + (dns ? ', DNS ' + dns : '') + ')',
        dev + ': מאגר DHCP בשם ' + name + ' (' + net + ' ' + mask + ', שער ' + gw + (dns ? ', DNS ' + dns : '') + ')'),
      run(topo) {
        const p = topo.devices[dev].cfg.dhcpPools[name];
        if (!p) return { ok: false, hint: T('Create it: ip dhcp pool ' + name, 'Создайте: ip dhcp pool ' + name, 'צרו אותו: ip dhcp pool ' + name) };
        if (p.network !== net || p.mask !== mask) return { ok: false, hint: T('Pool network now: ' + (p.network ? p.network + ' ' + p.mask : 'not set') + ' — must be ' + net + ' ' + mask + '.', 'Сеть пула сейчас: ' + (p.network ? p.network + ' ' + p.mask : 'не задана') + ' — нужна ' + net + ' ' + mask + '.', 'רשת המאגר עכשיו: ' + (p.network ? p.network + ' ' + p.mask : 'לא מוגדרת') + ' — צריכה להיות ' + net + ' ' + mask + '.') };
        if (p.defaultRouter !== gw) return { ok: false, hint: T('default-router now: ' + (p.defaultRouter || 'not set') + ' — must be ' + gw + '.', 'default-router сейчас: ' + (p.defaultRouter || 'не задан') + ' — нужен ' + gw + '.', 'ה-default-router עכשיו: ' + (p.defaultRouter || 'לא מוגדר') + ' — צריך להיות ' + gw + '.') };
        if (dns && p.dns !== dns) return { ok: false, hint: T('dns-server now: ' + (p.dns || 'not set') + ' — must be ' + dns + '.', 'dns-server сейчас: ' + (p.dns || 'не задан') + ' — нужен ' + dns + '.', 'ה-dns-server עכשיו: ' + (p.dns || 'לא מוגדר') + ' — צריך להיות ' + dns + '.') };
        return { ok: true };
      },
    };
  },
  excluded(dev, start, end) {
    return {
      label: T(dev + ': addresses ' + start + ' – ' + end + ' are excluded from DHCP', dev + ': адреса ' + start + ' – ' + end + ' исключены из DHCP', dev + ': הכתובות ' + start + ' – ' + end + ' מוחרגות מ-DHCP'),
      run(topo) {
        const ex = topo.devices[dev].cfg.dhcpExcluded;
        const s = ipToInt(start), e = ipToInt(end);
        for (let ip = s; ip <= e; ip++) if (!ex.some((x) => ip >= ipToInt(x.start) && ip <= ipToInt(x.end || x.start))) return { ok: false, hint: T(intToIp(ip) + ' is not excluded.', 'Адрес ' + intToIp(ip) + ' не исключён.', 'הכתובת ' + intToIp(ip) + ' לא מוחרגת.') };
        return { ok: true };
      },
    };
  },
  dhcpClient(pc, netObj, minHost) {
    return {
      label: T(pc + ' gets its address via DHCP (' + netObj.net + '/' + netObj.len + ')', pc + ' получает адрес по DHCP (' + netObj.net + '/' + netObj.len + ')', pc + ' מקבל כתובת ב-DHCP (' + netObj.net + '/' + netObj.len + ')'),
      run(topo) {
        const c = topo.devices[pc].cfg;
        if (c.ipMode !== 'dhcp') return { ok: false, hint: T('Switch the PC to DHCP: Desktop → IP Configuration → DHCP.', 'Переключите ПК на DHCP: Desktop → IP Configuration → DHCP.', 'העבירו את המחשב ל-DHCP: ‏Desktop → IP Configuration → DHCP.') };
        if (!hasValidLease(topo.devices[pc])) return { ok: false, hint: T('No lease yet (APIPA 169.254.x.x). Fix the server, then click DHCP again or run "ipconfig /renew".', 'Адрес не получен (APIPA 169.254.x.x). Исправьте сервер и снова нажмите DHCP или выполните "ipconfig /renew".', 'עדיין אין כתובת (APIPA ‏169.254.x.x). תקנו את השרת ואז לחצו שוב DHCP או הריצו "ipconfig /renew".') };
        if (!inSubnet(ipToInt(c.ip), ipToInt(netObj.net), netObj.len)) return { ok: false, hint: T('Got ' + c.ip + ' — wrong subnet.', 'Получен ' + c.ip + ' — не та подсеть.', 'התקבלה ' + c.ip + ' — תת-רשת לא נכונה.') };
        if (minHost && ipToInt(c.ip) < ipToInt(netObj.net) + minHost) return { ok: false, hint: T('Got an address from the excluded range.', 'Получен адрес из исключённого диапазона.', 'התקבלה כתובת מהטווח המוחרג.') };
        return { ok: true };
      },
    };
  },
  helper(dev, ifn, ip) {
    return {
      label: T(dev + ' ' + sh(ifn) + ' relays DHCP to ' + ip + ' (ip helper-address)', dev + ' ' + sh(ifn) + ' пересылает DHCP на ' + ip + ' (ip helper-address)', sh(ifn) + ' של ' + dev + ' מעביר DHCP אל ' + ip + ' (ip helper-address)'),
      run(topo) { const ic = topo.devices[dev].cfg.interfaces[ifn]; return (ic.helpers || []).includes(ip) ? { ok: true } : { ok: false, hint: T('Use "ip helper-address ' + ip + '" on ' + sh(ifn) + '.', 'Нужна команда "ip helper-address ' + ip + '" на ' + sh(ifn) + '.', 'צריך את הפקודה "ip helper-address ' + ip + '" בממשק ' + sh(ifn) + '.') }; },
    };
  },
  ripV2(dev) {
    return {
      label: T(dev + ': RIP version 2, no auto-summary', dev + ': RIP версии 2, no auto-summary', dev + ': ‏RIP גרסה 2, ‏no auto-summary'),
      run(topo) {
        const r = topo.devices[dev].cfg.rip;
        if (!r) return { ok: false, hint: T('Start RIP: router rip', 'Запустите RIP: router rip', 'הפעילו RIP: ‏router rip') };
        if (r.version !== 2) return { ok: false, hint: T('Use "version 2".', 'Нужна команда "version 2".', 'צריך את הפקודה "version 2".') };
        if (r.autoSummary !== false) return { ok: false, hint: T('Use "no auto-summary".', 'Нужна команда "no auto-summary".', 'צריך את הפקודה "no auto-summary".') };
        return { ok: true };
      },
    };
  },
  passive(dev, proto, ifn) {
    return {
      label: T(dev + ': ' + sh(ifn) + ' is a passive interface (' + proto.toUpperCase() + ')', dev + ': ' + sh(ifn) + ' — пассивный интерфейс (' + proto.toUpperCase() + ')', dev + ': ' + sh(ifn) + ' הוא ממשק פסיבי (' + proto.toUpperCase() + ')'),
      run(topo) { const p = topo.devices[dev].cfg[proto]; return p && p.passive.includes(ifn) ? { ok: true } : { ok: false, hint: T('Use "passive-interface ' + sh(ifn) + '".', 'Нужна команда "passive-interface ' + sh(ifn) + '".', 'צריך את הפקודה "passive-interface ' + sh(ifn) + '".') }; },
    };
  },
  routerId(dev, rid) {
    return {
      label: T(dev + ': OSPF router-id ' + rid, dev + ': OSPF router-id ' + rid, dev + ': ‏OSPF router-id ' + rid),
      run(topo) { const id = ospfRouterId(topo, topo.devices[dev]); return id === rid ? { ok: true } : { ok: false, hint: T('Router ID now: ' + (id || 'none') + ' — must be ' + rid + '.', 'Сейчас router-id: ' + (id || 'нет') + ' — нужен ' + rid + '.', 'ה-router ID עכשיו: ' + (id || 'אין') + ' — צריך להיות ' + rid + '.') }; },
    };
  },
  ospfNbrs(dev, count) {
    return {
      label: T(dev + ' has ' + count + ' OSPF neighbor(s) in FULL state', 'У ' + dev + ' ' + count + ' OSPF-сосед(а) в состоянии FULL', 'ל-' + dev + ' יש ' + count + ' שכני OSPF במצב FULL'),
      run(topo) {
        const n = allRoutes(topo).ospfAdj.filter((a) => a.dev === dev).length;
        return n >= count ? { ok: true } : { ok: false, hint: T('Now: ' + n + '. Check network statements, areas and passive interfaces.', 'Сейчас: ' + n + '. Проверьте network, area и passive-interface.', 'עכשיו: ' + n + '. בדקו את פקודות network, את ה-area ואת passive-interface.') };
      },
    };
  },
  hostname(dev, name) {
    return { label: T('Hostname of ' + dev + ' is ' + name, 'Имя (hostname) ' + dev + ' — ' + name, 'שם המארח (hostname) של ' + dev + ' הוא ' + name),
      run(topo) { const hn = topo.devices[dev].cfg.hostname; return hn === name ? { ok: true } : { ok: false, hint: T('Hostname now: ' + hn + ' — must be ' + name + '.', 'Сейчас имя: ' + hn + ' — нужно ' + name + '.', 'השם עכשיו: ' + hn + ' — צריך להיות ' + name + '.') }; } };
  },
  enableSecret(dev, pw) {
    return { label: T(dev + ': enable secret is "' + pw + '"', dev + ': enable secret — "' + pw + '"', dev + ': ה-enable secret הוא "' + pw + '"'),
      run(topo) { return topo.devices[dev].cfg.enableSecret === pw ? { ok: true } : { ok: false, hint: T('Use "enable secret ' + pw + '".', 'Команда "enable secret ' + pw + '".', 'הפקודה "enable secret ' + pw + '".') }; } };
  },
  linePw(dev, line, pw) {
    const nm = line === 'con' ? T('console', 'консоли', 'הקונסולה') : T('VTY (telnet/SSH)', 'VTY (telnet/SSH)', 'VTY ‏(telnet/SSH)');
    return {
      label: T(dev + ': ' + nm.en + ' password "' + pw + '" + login', dev + ': пароль ' + nm.ru + ' "' + pw + '" + login', dev + ': סיסמת ' + nm.he + ' "' + pw + '" + login'),
      run(topo) {
        const l = topo.devices[dev].cfg.lines[line] || {};
        const where = line === 'con' ? 'console 0' : 'vty 0 4';
        if (l.password !== pw) return { ok: false, hint: T('Use "password ' + pw + '" under line ' + where + '.', 'Команда "password ' + pw + '" в режиме line ' + where + '.', 'הפקודה "password ' + pw + '" במצב line ' + where + '.') };
        if (!l.login) return { ok: false, hint: T('Add "login".', 'Добавьте "login".', 'הוסיפו "login".') };
        return { ok: true };
      },
    };
  },
  banner(dev, text) {
    return { label: T(dev + ': MOTD banner contains "' + text + '"', dev + ': баннер MOTD содержит "' + text + '"', dev + ': באנר ה-MOTD מכיל "' + text + '"'),
      run(topo) { const b = topo.devices[dev].cfg.banner || ''; return b.includes(text) ? { ok: true } : { ok: false, hint: T('Use: banner motd #' + text + '#', 'Команда: banner motd #' + text + '#', 'הפקודה: banner motd #' + text + '#') }; } };
  },
  encryption(dev) {
    return { label: T(dev + ': service password-encryption is on', dev + ': включено service password-encryption', dev + ': ‏service password-encryption מופעל'),
      run(topo) { return topo.devices[dev].cfg.servicePasswordEncryption ? { ok: true } : { ok: false, hint: T('Passwords are still stored in clear text.', 'Пароли пока хранятся открытым текстом.', 'הסיסמאות עדיין שמורות כטקסט גלוי.') }; } };
  },
  noLookup(dev) {
    return { label: T(dev + ': DNS lookup disabled (no ip domain-lookup)', dev + ': отключён DNS-поиск (no ip domain-lookup)', dev + ': חיפוש DNS כבוי (no ip domain-lookup)'),
      run(topo) { return topo.devices[dev].cfg.domainLookup === false ? { ok: true } : { ok: false, hint: T('DNS lookup is still on.', 'DNS-поиск всё ещё включён.', 'חיפוש ה-DNS עדיין פעיל.') }; } };
  },
  saved(dev) {
    return {
      label: T(dev + ': configuration saved to startup-config', dev + ': конфигурация сохранена в startup-config', dev + ': התצורה נשמרה ב-startup-config'),
      run(topo) {
        const d = topo.devices[dev];
        if (!d.startup) return { ok: false, hint: T('Run "copy running-config startup-config".', 'Выполните "copy running-config startup-config".', 'הריצו "copy running-config startup-config".') };
        const a = JSON.stringify({ ...d.startup, dhcpBindings: {} }), b = JSON.stringify({ ...d.cfg, dhcpBindings: {} });
        return a === b ? { ok: true } : { ok: false, hint: T('Saved config differs from running config — save again.', 'Сохранённая конфигурация отличается от текущей — сохраните ещё раз.', 'התצורה השמורה שונה מהתצורה הנוכחית — שמרו שוב.') };
      },
    };
  },
  svi(dev, ip, mask) {
    return {
      label: T(dev + ' Vlan1: ' + ip + ' ' + mask + ', up', dev + ' Vlan1: ' + ip + ' ' + mask + ', включён', 'Vlan1 של ' + dev + ': ' + ip + ' ' + mask + ', פעיל'),
      run(topo) {
        const d = topo.devices[dev];
        const ic = d.cfg.interfaces.Vlan1;
        if (ic.ip !== ip || ic.mask !== mask) return { ok: false, hint: T('Address is ' + (ic.ip || 'not set'), 'Сейчас адрес: ' + (ic.ip || 'не задан'), 'הכתובת עכשיו: ' + (ic.ip || 'לא מוגדרת')) };
        if (ic.shutdown) return { ok: false, hint: T('Use "no shutdown" on interface vlan 1.', 'Нужна "no shutdown" на interface vlan 1.', 'צריך "no shutdown" בממשק vlan 1.') };
        return { ok: true };
      },
    };
  },
  swGateway(dev, gw) {
    return { label: T(dev + ': ip default-gateway ' + gw, dev + ': ip default-gateway ' + gw, dev + ': ‏ip default-gateway ' + gw),
      run(topo) { const g = topo.devices[dev].cfg.defaultGateway; return g === gw ? { ok: true } : { ok: false, hint: T('Gateway now: ' + (g || 'not set') + ' — must be ' + gw + '.', 'Сейчас шлюз: ' + (g || 'не задан') + ' — нужен ' + gw + '.', 'השער עכשיו: ' + (g || 'לא מוגדר') + ' — צריך להיות ' + gw + '.') }; } };
  },
  ssh(dev, user, domain) {
    return {
      label: T(dev + ': SSH ready (domain ' + domain + ', RSA keys, user ' + user + ', VTY: login local + transport input ssh)',
        dev + ': SSH готов (домен ' + domain + ', RSA-ключи, пользователь ' + user + ', VTY: login local + transport input ssh)',
        dev + ': ‏SSH מוכן (דומיין ' + domain + ', מפתחות RSA, משתמש ' + user + ', ‏VTY: ‏login local + transport input ssh)'),
      run(topo) {
        const c = topo.devices[dev].cfg;
        if (c.domainName !== domain) return { ok: false, hint: T('ip domain-name ' + domain, 'ip domain-name ' + domain, 'ip domain-name ' + domain) };
        if (!c.users[user]) return { ok: false, hint: T('username ' + user + ' secret ...', 'username ' + user + ' secret ...', 'username ' + user + ' secret ...') };
        if (!c.rsaBits || c.rsaBits < 768) return { ok: false, hint: T('crypto key generate rsa (1024 bits)', 'crypto key generate rsa (1024 бит)', 'crypto key generate rsa ‏(1024 סיביות)') };
        const v = c.lines.vty || {};
        if (!v.loginLocal) return { ok: false, hint: T('line vty 0 4 → login local', 'line vty 0 4 → login local', 'line vty 0 4 → login local') };
        if (!v.transport || !/ssh/.test(v.transport) || /telnet|all/.test(v.transport)) return { ok: false, hint: T('line vty 0 4 → transport input ssh', 'line vty 0 4 → transport input ssh', 'line vty 0 4 → transport input ssh') };
        return { ok: true };
      },
    };
  },
  // --- Spanning Tree ---
  stpRoot(sw, v) {
    return {
      label: T(sw + ' is the root bridge for VLAN ' + v, sw + ' — корневой мост (root bridge) для VLAN ' + v, sw + ' הוא ה-root bridge של VLAN ' + v),
      run(topo) {
        const r = stpRootOf(topo, sw, v);
        if (r === sw) return { ok: true };
        if (!r) return { ok: false, hint: T('VLAN ' + v + ' has no working ports on ' + sw + '.', 'На ' + sw + ' нет работающих портов в VLAN ' + v + '.', 'ב-' + sw + ' אין פורטים פעילים ב-VLAN ' + v + '.') };
        const R = topo.devices[r], me = topo.devices[sw];
        const now = 'priority ' + (stpPrio(R, v) + v) + ', MAC ' + swBaseMac(R), mine = stpPrio(me, v) + v;
        return { ok: false, hint: T('The root now is ' + r + ' (' + now + '); ' + sw + ' has priority ' + mine + '.', 'Сейчас корень — ' + r + ' (' + now + '); у ' + sw + ' приоритет ' + mine + '.',
          'ה-root עכשיו הוא ' + r + ' (' + now + '); ל-' + sw + ' יש priority ' + mine + '.') };
      },
    };
  },
  // Если корень откажет, корнем станет sw: у него наименьший Bridge ID среди остальных
  stpBackup(sw, root, v) {
    return {
      label: T(sw + ' is the backup root for VLAN ' + v + ' (takes over if ' + root + ' fails)', sw + ' — резервный корень для VLAN ' + v + ' (заменит ' + root + ' при отказе)',
        sw + ' הוא ה-root הגיבוי של VLAN ' + v + ' (מחליף את ' + root + ' אם הוא נופל)'),
      run(topo) {
        let best = null;
        for (const d of Object.values(topo.devices)) if (d.type === 'switch' && d.id !== root && d.cfg.vlans[v] && (!best || bidLess(stpBid(d, v), stpBid(best, v)))) best = d;
        if (best && best.id === sw) return { ok: true };
        const b = best ? best.id + ' (priority ' + (stpPrio(best, v) + v) + ')' : '—';
        return { ok: false, hint: T('If ' + root + ' failed, the new root would be ' + b + '. ' + sw + ' needs a lower priority than the others.', 'Если ' + root + ' откажет, корнем станет ' + b + '. ' + sw + ' нужен приоритет ниже, чем у остальных.',
          'אם ' + root + ' ייפול, ה-root החדש יהיה ' + b + '. ‏' + sw + ' צריך priority נמוך יותר משל האחרים.') };
      },
    };
  },
  portfast(sw, port) {
    return {
      label: T(sw + ' ' + sh(port) + ': PortFast is on', sw + ' ' + sh(port) + ': PortFast включён', sh(port) + ' של ' + sw + ': ‏PortFast פעיל'),
      run(topo) {
        const d = topo.devices[sw], ic = d.cfg.interfaces[port];
        if (ic.portfast || (d.cfg.portfastDefault && swOperMode(topo, d, port) === 'access')) return { ok: true };
        return { ok: false, hint: T('Not enabled on this port yet.', 'На этом порту пока не включён.', 'עדיין לא הופעל בפורט הזה.') };
      },
    };
  },
  bpduguard(sw, port) {
    return {
      label: T(sw + ' ' + sh(port) + ': BPDU Guard is on', sw + ' ' + sh(port) + ': BPDU Guard включён', sh(port) + ' של ' + sw + ': ‏BPDU Guard פעיל'),
      run(topo) {
        const d = topo.devices[sw];
        return swBpduGuardOn(d, d.cfg.interfaces[port], port, topo) ? { ok: true }
          : { ok: false, hint: T('Not enabled on this port yet.', 'На этом порту пока не включён.', 'עדיין לא הופעל בפורט הזה.') };
      },
    };
  },
  notErrdis(sw, port, peer) {
    return {
      label: T(sw + ' ' + sh(port) + ' (uplink to ' + peer + ') stays up — no PortFast or BPDU Guard on it', sw + ' ' + sh(port) + ' (к ' + peer + ') работает — без PortFast и BPDU Guard',
        sh(port) + ' של ' + sw + ' (אל ' + peer + ') נשאר פעיל — בלי PortFast ובלי BPDU Guard'),
      run(topo) {
        const d = topo.devices[sw], ic = d.cfg.interfaces[port];
        if (ic.errdis) return { ok: false, hint: T('The port is err-disabled by BPDU Guard: a switch is on the other end.', 'Порт выключен защитой BPDU Guard (err-disabled): на другом конце коммутатор.', 'הפורט כובה על ידי BPDU Guard ‏(err-disabled): בצד השני יש מתג.') };
        if (ic.portfast) return { ok: false, hint: T('PortFast must not be on a port to another switch.', 'PortFast нельзя включать на порту к другому коммутатору.', 'אסור להפעיל PortFast בפורט שמחובר למתג אחר.') };
        return portPhysUp(topo, sw, port) ? { ok: true } : { ok: false, hint: T('The link is down.', 'Линк не поднят.', 'הקישור לא פעיל.') };
      },
    };
  },
  // --- EtherChannel ---
  ecUp(sw, g, count, proto) {
    const pn = (p) => (p === '-' ? 'mode on' : p);
    return {
      label: T(sw + ': Port-channel' + g + ' is up with ' + count + ' ports bundled (' + pn(proto) + ')', sw + ': Port-channel' + g + ' работает, в пучке ' + count + ' порта (' + pn(proto) + ')',
        'ב-' + sw + ': ‏Port-channel' + g + ' פעיל, ' + count + ' פורטים בצרור (' + pn(proto) + ')'),
      run(topo) {
        const G = ecGroupState(topo, topo.devices[sw], g);
        if (!G) return { ok: false, hint: T('There is no channel-group ' + g + ' on ' + sw + ' yet.', 'На ' + sw + ' пока нет channel-group ' + g + '.', 'ב-' + sw + ' עדיין אין channel-group ' + g + '.') };
        if (G.proto !== proto) return { ok: false, hint: T(sw + ' uses ' + pn(G.proto) + ' — the task asks for ' + pn(proto) + '.', sw + ' использует ' + pn(G.proto) + ', а в задании — ' + pn(proto) + '.', 'ב-' + sw + ' מוגדר ' + pn(G.proto) + ', והמשימה דורשת ' + pn(proto) + '.') };
        const fl = Object.values(G.flags);
        if (fl.filter((f) => f === 'P').length >= count) return { ok: true };
        const now = Object.keys(G.flags).map((n) => sh(n) + '(' + (G.flags[n] === 'M' ? 'D' : G.flags[n]) + ')').join(' ');
        const why = fl.includes('I') ? T(' I = the other end does not negotiate with this one: passive + passive and auto + auto never bundle.', ' I — другой конец не договаривается с этим: passive + passive и auto + auto не собираются.', ' I = הצד השני לא מתאם עם הצד הזה: ‏passive + passive ו-auto + auto לא מתחברים.')
          : fl.includes('s') ? T(' s = this port is set differently from its Port-channel or from the other end (mode, VLANs).', ' s — порт настроен не так, как его Port-channel или другой конец (режим, VLAN).', ' s = הפורט מוגדר אחרת מה-Port-channel שלו או מהצד השני (מצב, ‏VLAN).')
            : T(' D = the port is down.', ' D — порт не работает.', ' D = הפורט לא פעיל.');
        return { ok: false, hint: T('Now: ' + now + '.' + why.en, 'Сейчас: ' + now + '.' + why.ru, 'עכשיו: ' + now + '.' + why.he) };
      },
    };
  },
};

// MAC коммутаторов для заданий STP по возрастанию: у кого меньше, тот без настройки приоритета и станет корнем
function swMacs(rng, n) {
  const h = (x, w) => x.toString(16).toUpperCase().padStart(w, '0');
  const list = [];
  while (list.length < n) { const m = '00' + h(rng.int(1, 0xd0), 2) + '.' + h(rng.int(0, 0xffff), 4) + '.' + h(rng.int(0, 0xffff), 4); if (!list.includes(m)) list.push(m); }
  return list.sort((a, b) => macVal(a) - macVal(b));
}
function tMac(topo, id, mac) { topo.devices[id].ports[0].mac = mac; }

// Устройство, которому принадлежит IP (для понятных сообщений)
function devByIp(topo, ip) {
  const n = ipToInt(ip);
  for (const d of Object.values(topo.devices)) {
    if (d.cfg.ip === ip) return d;
    for (const ic of Object.values(d.cfg.interfaces || {})) if (ic.ip && ipToInt(ic.ip) === n) return d;
  }
  return null;
}

// Объяснение, почему ping не проходит
function explainReach(topo, src, ip, r) {
  const S = topo.devices[src];
  if (r.status === 'noip' || (S.type === 'pc' && !S.cfg.ip)) return T(src + ' has no IP address.', 'У ' + src + ' не задан IP-адрес.', 'ל-' + src + ' אין כתובת IP.');
  if (r.status === 'unreachable') {
    const R = devByIp(topo, r.from);
    const n = R ? R.name + ' (' + r.from + ')' : r.from;
    return T('Router ' + n + ' has no route to ' + ip + '. Add a route on it (or check the routing protocol).', 'У роутера ' + n + ' нет маршрута к ' + ip + '. Добавьте на нём маршрут (или проверьте протокол маршрутизации).',
      'לנתב ' + n + ' אין נתיב אל ' + ip + '. הוסיפו בו נתיב (או בדקו את פרוטוקול הניתוב).');
  }
  const f = r.reason;
  if (!f) return T('No reply.', 'Ответа нет.', 'אין תשובה.');
  const at = topo.devices[f.at] ? topo.devices[f.at].name : f.at;
  if (r.replyLeg) {
    if (f.code === 'nogw') return T('The request arrives, but ' + at + ' cannot send the reply: check its default gateway.', 'Запрос доходит, но ' + at + ' не может ответить: проверьте у него шлюз по умолчанию.', 'הבקשה מגיעה, אבל ' + at + ' לא יכול לשלוח תשובה: בדקו את שער ברירת המחדל שלו.');
    if (f.code === 'unreachable') return T('The request arrives, but ' + at + ' has no route back.', 'Запрос доходит, но у ' + at + ' нет обратного маршрута.', 'הבקשה מגיעה, אבל ל-' + at + ' אין נתיב חזרה.');
    return T('The request arrives, but the reply is lost near ' + at + '.', 'Запрос доходит, но ответ теряется около ' + at + '.', 'הבקשה מגיעה, אבל התשובה הולכת לאיבוד ליד ' + at + '.');
  }
  if (f.code === 'nogw') {
    const g = topo.devices[f.at] && topo.devices[f.at].cfg.gateway;
    return T(at + ': ' + ip + ' is in another network, but the default gateway is ' + (g || 'not set') + ' — it must be the router interface in ' + at + '\'s subnet.',
      at + ': ' + ip + ' в другой сети, а шлюз сейчас ' + (g || 'не задан') + ' — нужен интерфейс роутера в подсети ' + at + '.',
      at + ': ‏' + ip + ' ברשת אחרת, אבל השער עכשיו ' + (g || 'לא מוגדר') + ' — הוא צריך להיות ממשק הנתב בתת-הרשת של ' + at + '.');
  }
  if (f.code === 'arp') return T(at + ' cannot reach the next hop on its local network: check cables, IP/mask, VLANs and that interfaces are up.', at + ' не видит следующий узел в своей сети: проверьте кабели, IP/маску, VLAN и что интерфейсы включены.',
    at + ' לא מגיע לקפיצה הבאה ברשת המקומית שלו: בדקו כבלים, IP ומסכה, VLAN ושהממשקים פעילים.');
  if (f.code === 'unreachable') return T(at + ' has no route to the destination.', 'У ' + at + ' нет маршрута к получателю.', 'ל-' + at + ' אין נתיב אל היעד.');
  if (f.code === 'ttl' || f.code === 'loop') return T('Routing loop detected near ' + at + '.', 'Петля маршрутизации около ' + at + '.', 'זוהתה לולאת ניתוב ליד ' + at + '.');
  return T('No reply.', 'Ответа нет.', 'אין תשובה.');
}

// ================== ШАБЛОНЫ ==================

// --- 1. Два ПК через свитч ---
taskDef('lan-switch', 'basics', 1, (rng) => {
  const n = rng.int(2, 3);
  const sn = subnetPool(rng).lan();
  const ports = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]).slice(0, n).map(fa);
  const hosts = rng.shuffle([10, 11, 12, 20, 21, 22, 50, 51, 100, 101, 150]).slice(0, n);
  const pcs = Array.from({ length: n }, (_, i) => 'PC' + (i + 1));
  const ips = hosts.map((hh) => host(sn, hh));
  return {
    title: T('Build a small LAN', 'Соберите маленькую локальную сеть', 'בניית רשת מקומית קטנה'),
    intro: T('A new office has ' + n + ' computers and one switch. Connect them and give every PC an address in network ' + sn.net + '/24.',
      'В новом офисе ' + n + ' компьютера и один свитч. Соедините их и выдайте каждому ПК адрес из сети ' + sn.net + '/24.',
      'במשרד חדש יש ' + n + ' מחשבים ומתג אחד. יש לחבר אותם ולתת לכל מחשב כתובת ברשת ' + sn.net + '/24.'),
    steps: [
      T('Connect ' + pcs.map((p, i) => p + ' to S1 ' + sh(ports[i])).join(', ') + '. Choose the correct cable type.',
        'Подключите ' + pcs.map((p, i) => p + ' к порту ' + sh(ports[i]) + ' свитча S1').join(', ') + '. Выберите правильный тип кабеля.',
        'לחבר את ' + pcs.map((p, i) => p + ' לפורט ' + sh(ports[i]) + ' של S1').join(', ') + '. לבחור את סוג הכבל הנכון.'),
      T('Configure the IP address and subnet mask on every PC (Desktop → IP Configuration).', 'Настройте IP-адрес и маску на каждом ПК (Desktop → IP Configuration).',
        'להגדיר כתובת IP ומסכת רשת בכל מחשב (Desktop → IP Configuration).'),
      T('Verify: PC1 must ping all other PCs.', 'Проверка: PC1 должен пинговать все остальные ПК.', 'בדיקה: PC1 צריך להצליח לעשות ping לכל שאר המחשבים.'),
    ],
    table: pcs.map((p, i) => rowPc(p, ips[i], sn.mask)),
    build(topo) {
      tAdd(topo, '2960', 'S1', 420, 200);
      pcs.forEach((p, i) => tAdd(topo, 'PC', p, 200 + i * 220, 380));
      tHostname(topo, ['S1']);
    },
    checks: [
      ...pcs.map((p, i) => CHK.link(p, 'FastEthernet0', 'S1', ports[i])),
      ...pcs.map((p, i) => CHK.pc(p, ips[i], sn.mask)),
      ...pcs.slice(1).map((p, i) => CHK.ping('PC1', p, ips[i + 1])),
    ],
    solution: { links: pcs.map((p, i) => [p, 'FastEthernet0', 'S1', ports[i]]), pc: Object.fromEntries(pcs.map((p, i) => [p, { ip: ips[i], mask: sn.mask }])) },
    hints: [T('PC ↔ switch uses a Copper Straight-Through cable.', 'ПК ↔ свитч соединяются прямым кабелем (Copper Straight-Through).', 'מחשב ↔ מתג מתחברים בכבל ישר (Copper Straight-Through).'),
      T('All PCs must be in the same subnet with the same mask.', 'Все ПК должны быть в одной подсети с одинаковой маской.', 'כל המחשבים צריכים להיות באותה תת-רשת ועם אותה מסכה.')],
  };
});

// --- 2. ПК-ПК напрямую, маски разной длины ---
taskDef('pc-pc', 'basics', 1, (rng) => {
  const len = rng.pick([24, 25, 26, 27, 28, 29]);
  const sn = subnetPool(rng).sized(len);
  const size = Math.pow(2, 32 - len);
  const a = rng.int(1, size - 3), b = rng.int(a + 1, size - 2);
  const ipA = host(sn, a), ipB = host(sn, b);
  return {
    title: T('Connect two PCs directly', 'Соедините два ПК напрямую', 'חיבור ישיר בין שני מחשבים'),
    intro: T('Two computers must talk without a switch. The network is ' + sn.net + '/' + len + ' — calculate the right subnet mask.',
      'Два компьютера должны общаться без свитча. Сеть — ' + sn.net + '/' + len + ' — вычислите правильную маску подсети.',
      'שני מחשבים צריכים לתקשר בלי מתג. הרשת היא ' + sn.net + '/' + len + ' — יש לחשב את מסכת הרשת הנכונה.'),
    steps: [
      T('Connect PC1 FastEthernet0 directly to PC2 FastEthernet0. Which cable type is needed between two PCs?', 'Соедините PC1 FastEthernet0 напрямую с PC2 FastEthernet0. Какой кабель нужен между двумя ПК?',
        'לחבר את FastEthernet0 של PC1 ישירות ל-FastEthernet0 של PC2. איזה כבל צריך בין שני מחשבים?'),
      T('Give PC1 the address ' + ipA + ' and PC2 the address ' + ipB + ' with mask for /' + len + '.', 'Задайте PC1 адрес ' + ipA + ', а PC2 — ' + ipB + ' с маской для /' + len + '.',
        'לתת ל-PC1 את הכתובת ' + ipA + ' ול-PC2 את הכתובת ' + ipB + ' עם המסכה של ‎/' + len + '.'),
      T('Verify: PC1 pings PC2.', 'Проверка: PC1 пингует PC2.', 'בדיקה: PC1 עושה ping ל-PC2.'),
    ],
    table: [rowPc('PC1', ipA, '/' + len + ' = ?'), rowPc('PC2', ipB, '/' + len + ' = ?')],
    build(topo) { tAdd(topo, 'PC', 'PC1', 250, 260); tAdd(topo, 'PC', 'PC2', 600, 260); },
    checks: [CHK.link('PC1', 'FastEthernet0', 'PC2', 'FastEthernet0'), CHK.pc('PC1', ipA, sn.mask), CHK.pc('PC2', ipB, sn.mask), CHK.ping('PC1', 'PC2', ipB)],
    solution: { links: [['PC1', 'FastEthernet0', 'PC2', 'FastEthernet0']], pc: { PC1: { ip: ipA, mask: sn.mask }, PC2: { ip: ipB, mask: sn.mask } } },
    hints: [T('Same device types (PC–PC) need a Copper Cross-Over cable.', 'Одинаковые устройства (ПК–ПК) соединяются перекрёстным кабелем (Copper Cross-Over).', 'התקנים מאותו סוג (מחשב–מחשב) צריכים כבל מוצלב (Copper Cross-Over).'),
      T('/' + len + ' = ' + sn.mask, '/' + len + ' = ' + sn.mask, '‎/' + len + ' = ' + sn.mask)],
  };
});

// --- 3. Роутер между двумя LAN ---
taskDef('router-2lan', 'basics', 2, (rng) => {
  const model = rng.pick(ROUTER_MODELS);
  const sp = subnetPool(rng);
  const n1 = sp.lan(), n2 = sp.lan();
  const g1 = rng.pick([1, 254]), g2 = rng.pick([1, 254]);
  const h1 = rng.int(10, 200), h2 = rng.int(10, 200);
  const r0 = gi(model, 0), r1 = gi(model, 1);
  const gw1 = host(n1, g1), gw2 = host(n2, g2), p1 = host(n1, h1), p2 = host(n2, h2);
  return {
    title: T('Connect two networks with a router', 'Соедините две сети через роутер', 'חיבור שתי רשתות דרך נתב'),
    intro: T('Two departments have their own LANs (switches S1 and S2). Connect them through router R1 (' + model + ') so that PC1 can reach PC2.',
      'У двух отделов свои сети (свитчи S1 и S2). Соедините их через роутер R1 (' + model + '), чтобы PC1 доставал до PC2.',
      'לשתי מחלקות יש רשתות משלהן (המתגים S1 ו-S2). יש לחבר אותן דרך הנתב R1 (' + model + ') כך ש-PC1 יגיע ל-PC2.'),
    steps: [
      T('Connect R1 ' + sh(r0) + ' to S1 GigabitEthernet0/1 and R1 ' + sh(r1) + ' to S2 GigabitEthernet0/1.', 'Подключите R1 ' + sh(r0) + ' к S1 GigabitEthernet0/1, а R1 ' + sh(r1) + ' — к S2 GigabitEthernet0/1.',
        'לחבר את ' + sh(r0) + ' של R1 ל-GigabitEthernet0/1 של S1, ואת ' + sh(r1) + ' של R1 ל-GigabitEthernet0/1 של S2.'),
      T('Configure R1 interfaces from the addressing table and turn them on (no shutdown).', 'Настройте интерфейсы R1 по таблице адресации и включите их (no shutdown).',
        'להגדיר את ממשקי R1 לפי טבלת הכתובות ולהפעיל אותם (no shutdown).'),
      T('Configure PC1 and PC2: IP address, mask and default gateway.', 'Настройте PC1 и PC2: IP-адрес, маску и шлюз по умолчанию.', 'להגדיר ב-PC1 וב-PC2 כתובת IP, מסכה ושער ברירת מחדל.'),
      T('Verify: PC1 pings PC2.', 'Проверка: PC1 пингует PC2.', 'בדיקה: PC1 עושה ping ל-PC2.'),
    ],
    table: [rowIf('R1', r0, gw1, n1.mask), rowIf('R1', r1, gw2, n2.mask), rowPc('PC1', p1, n1.mask, gw1), rowPc('PC2', p2, n2.mask, gw2)],
    build(topo) {
      tAdd(topo, model, 'R1', 430, 120);
      tAdd(topo, '2960', 'S1', 220, 260); tAdd(topo, '2960', 'S2', 640, 260);
      tAdd(topo, 'PC', 'PC1', 220, 420); tAdd(topo, 'PC', 'PC2', 640, 420);
      tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC2', 'FastEthernet0', 'S2', fa(1));
      tHostname(topo, ['R1', 'S1', 'S2']);
    },
    checks: [CHK.link('R1', r0, 'S1', 'GigabitEthernet0/1'), CHK.link('R1', r1, 'S2', 'GigabitEthernet0/1'),
      CHK.ifIp('R1', r0, gw1, n1.mask), CHK.ifIp('R1', r1, gw2, n2.mask), CHK.ifUp('R1', r0), CHK.ifUp('R1', r1),
      CHK.pc('PC1', p1, n1.mask, gw1), CHK.pc('PC2', p2, n2.mask, gw2), CHK.ping('PC1', 'PC2', p2)],
    solution: {
      links: [['R1', r0, 'S1', 'GigabitEthernet0/1'], ['R1', r1, 'S2', 'GigabitEthernet0/1']],
      cli: { R1: ['interface ' + r0, 'ip address ' + gw1 + ' ' + n1.mask, 'no shutdown', 'interface ' + r1, 'ip address ' + gw2 + ' ' + n2.mask, 'no shutdown'] },
      pc: { PC1: { ip: p1, mask: n1.mask, gw: gw1 }, PC2: { ip: p2, mask: n2.mask, gw: gw2 } },
    },
    hints: [T('Router interfaces are shut down by default — "no shutdown" is required.', 'Интерфейсы роутера по умолчанию выключены — нужна "no shutdown".', 'ממשקי נתב כבויים כברירת מחדל — צריך "no shutdown".'),
      T('The PC default gateway is the router interface address in its LAN.', 'Шлюз ПК — это адрес интерфейса роутера в его сети.', 'שער ברירת המחדל של מחשב הוא הכתובת של ממשק הנתב ברשת שלו.')],
  };
});

// Общая топология: LAN1 — R1 — R2 — LAN2 (интерфейсы уже настроены)
function twoRouterBase(rng) {
  const sp = subnetPool(rng);
  const m1 = rng.pick(ROUTER_MODELS), m2 = rng.pick(ROUTER_MODELS);
  const l1 = sp.lan(), l2 = sp.lan(), w = sp.p2p();
  const x = {
    m1, m2, l1, l2, w,
    r1lan: gi(m1, 0), r1wan: gi(m1, 1), r2lan: gi(m2, 0), r2wan: gi(m2, 1),
    gw1: host(l1, 1), gw2: host(l2, 1), pc1: host(l1, rng.int(10, 99)), pc2: host(l2, rng.int(10, 99)),
    w1: host(w, 1), w2: host(w, 2),
  };
  x.build = (topo, opts = {}) => {
    tAdd(topo, m1, 'R1', 300, 150); tAdd(topo, m2, 'R2', 600, 150);
    tAdd(topo, '2960', 'S1', 200, 290); tAdd(topo, '2960', 'S2', 700, 290);
    tAdd(topo, 'PC', 'PC1', 200, 430); tAdd(topo, 'PC', 'PC2', 700, 430);
    tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC2', 'FastEthernet0', 'S2', fa(1));
    tLink(topo, 'R1', x.r1lan, 'S1', 'GigabitEthernet0/1'); tLink(topo, 'R2', x.r2lan, 'S2', 'GigabitEthernet0/1');
    tLink(topo, 'R1', x.r1wan, 'R2', x.r2wan);
    tHostname(topo, ['R1', 'R2', 'S1', 'S2']);
    if (opts.ifaces !== false) {
      tCli(topo, 'R1', ['interface ' + x.r1lan, 'ip address ' + x.gw1 + ' ' + l1.mask, 'no shutdown', 'interface ' + x.r1wan, 'ip address ' + x.w1 + ' ' + w.mask, 'no shutdown']);
      tCli(topo, 'R2', ['interface ' + x.r2lan, 'ip address ' + x.gw2 + ' ' + l2.mask, 'no shutdown', 'interface ' + x.r2wan, 'ip address ' + x.w2 + ' ' + w.mask, 'no shutdown']);
    }
    tPc(topo, 'PC1', x.pc1, l1.mask, x.gw1); tPc(topo, 'PC2', x.pc2, l2.mask, x.gw2);
  };
  x.table = [rowIf('R1', x.r1lan, x.gw1, l1.mask), rowIf('R1', x.r1wan, x.w1, w.mask), rowIf('R2', x.r2lan, x.gw2, l2.mask), rowIf('R2', x.r2wan, x.w2, w.mask),
    rowPc('PC1', x.pc1, l1.mask, x.gw1), rowPc('PC2', x.pc2, l2.mask, x.gw2)];
  return x;
}

// --- 4. Статика между двумя роутерами ---
taskDef('static-2r', 'static', 2, (rng) => {
  const x = twoRouterBase(rng);
  const useDefault = rng.chance(0.4);
  return {
    title: T('Static routes between two routers', 'Статические маршруты между двумя роутерами', 'נתיבים סטטיים בין שני נתבים'),
    intro: T('Two sites are connected by a point-to-point link ' + x.w.net + '/30. All interfaces are already configured, but the routers do not know about the remote LANs.',
      'Две площадки соединены каналом точка-точка ' + x.w.net + '/30. Все интерфейсы уже настроены, но роутеры не знают про удалённые сети.',
      'שני אתרים מחוברים בקו נקודה-לנקודה ' + x.w.net + '/30. כל הממשקים כבר מוגדרים, אבל הנתבים לא מכירים את הרשתות המרוחקות.'),
    steps: [
      T('On R1 add a static route to ' + x.l2.net + '/24 via next hop ' + x.w2 + '.', 'На R1 добавьте статический маршрут в ' + x.l2.net + '/24 через next hop ' + x.w2 + '.',
        'ב-R1 להוסיף נתיב סטטי אל ' + x.l2.net + '/24 דרך ה-next hop ‏' + x.w2 + '.'),
      useDefault ? T('On R2 add a default route (0.0.0.0/0) via ' + x.w1 + '.', 'На R2 добавьте маршрут по умолчанию (0.0.0.0/0) через ' + x.w1 + '.', 'ב-R2 להוסיף נתיב ברירת מחדל (0.0.0.0/0) דרך ' + x.w1 + '.')
        : T('On R2 add a static route to ' + x.l1.net + '/24 via next hop ' + x.w1 + '.', 'На R2 добавьте статический маршрут в ' + x.l1.net + '/24 через next hop ' + x.w1 + '.', 'ב-R2 להוסיף נתיב סטטי אל ' + x.l1.net + '/24 דרך ה-next hop ‏' + x.w1 + '.'),
      T('Verify with "show ip route" and ping PC2 from PC1.', 'Проверьте "show ip route" и пропингуйте PC2 с PC1.', 'לבדוק עם "show ip route" ולעשות ping מ-PC1 ל-PC2.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.route('R1', x.l2.net, 24, 'S'), useDefault ? CHK.defaultRoute('R2') : CHK.route('R2', x.l1.net, 24, 'S'), CHK.ping('PC1', 'PC2', x.pc2)],
    solution: { cli: { R1: ['ip route ' + x.l2.net + ' 255.255.255.0 ' + x.w2], R2: [useDefault ? 'ip route 0.0.0.0 0.0.0.0 ' + x.w1 : 'ip route ' + x.l1.net + ' 255.255.255.0 ' + x.w1] } },
    hints: [T('Syntax: ip route <network> <mask> <next-hop>', 'Синтаксис: ip route <сеть> <маска> <next-hop>', 'תחביר: ip route <רשת> <מסכה> <next-hop>'),
      T('Routing must work in BOTH directions — the reply needs a route back.', 'Маршрут нужен в ОБЕ стороны — ответу тоже нужен путь назад.', 'הניתוב חייב לעבוד בשני הכיוונים — גם התשובה צריכה נתיב חזרה.')],
  };
});

// --- 5. Статика: три роутера ---
taskDef('static-3r', 'static', 3, (rng) => {
  const sp = subnetPool(rng);
  const l1 = sp.lan(), l3 = sp.lan(), w12 = sp.p2p(), w23 = sp.p2p();
  const m = [rng.pick(ROUTER_MODELS), rng.pick(['2911', '4331']), rng.pick(ROUTER_MODELS)];
  const [m1, m2, m3] = m;
  const R1lan = gi(m1, 0), R1w = gi(m1, 1), R2a = gi(m2, 1), R2b = gi(m2, 2), R3lan = gi(m3, 0), R3w = gi(m3, 1);
  const ip = { r1lan: host(l1, 1), r1w: host(w12, 1), r2a: host(w12, 2), r2b: host(w23, 1), r3w: host(w23, 2), r3lan: host(l3, 1), pc1: host(l1, rng.int(10, 90)), pc3: host(l3, rng.int(10, 90)) };
  return {
    title: T('Static routing across three routers', 'Статическая маршрутизация через три роутера', 'ניתוב סטטי דרך שלושה נתבים'),
    intro: T('Branch R1 and branch R3 are connected through the core router R2. Interfaces are configured. Make the networks reach each other using default routes on the edge routers and specific routes on R2.',
      'Филиалы R1 и R3 связаны через центральный роутер R2. Интерфейсы настроены. Обеспечьте связь: на крайних роутерах — маршруты по умолчанию, на R2 — маршруты в конкретные сети.',
      'הסניפים R1 ו-R3 מחוברים דרך נתב הליבה R2. הממשקים מוגדרים. יש לחבר בין הרשתות: בנתבי הקצה — נתיבי ברירת מחדל, וב-R2 — נתיבים לרשתות הספציפיות.'),
    steps: [
      T('R1: default route via ' + ip.r2a + '.', 'R1: маршрут по умолчанию через ' + ip.r2a + '.', 'R1: נתיב ברירת מחדל דרך ' + ip.r2a + '.'),
      T('R3: default route via ' + ip.r2b + '.', 'R3: маршрут по умолчанию через ' + ip.r2b + '.', 'R3: נתיב ברירת מחדל דרך ' + ip.r2b + '.'),
      T('R2: static routes to ' + l1.net + '/24 (via R1) and ' + l3.net + '/24 (via R3).', 'R2: статические маршруты в ' + l1.net + '/24 (через R1) и ' + l3.net + '/24 (через R3).',
        'R2: נתיבים סטטיים אל ' + l1.net + '/24 (דרך R1) ואל ' + l3.net + '/24 (דרך R3).'),
      T('Verify: PC1 pings PC3, and "tracert" shows 3 hops.', 'Проверка: PC1 пингует PC3, а "tracert" показывает 3 перехода.', 'בדיקה: PC1 עושה ping ל-PC3, ו-"tracert" מראה 3 קפיצות.'),
    ],
    table: [rowIf('R1', R1lan, ip.r1lan, l1.mask), rowIf('R1', R1w, ip.r1w, w12.mask), rowIf('R2', R2a, ip.r2a, w12.mask), rowIf('R2', R2b, ip.r2b, w23.mask),
      rowIf('R3', R3w, ip.r3w, w23.mask), rowIf('R3', R3lan, ip.r3lan, l3.mask), rowPc('PC1', ip.pc1, l1.mask, ip.r1lan), rowPc('PC3', ip.pc3, l3.mask, ip.r3lan)],
    build(topo) {
      tAdd(topo, m1, 'R1', 200, 170); tAdd(topo, m2, 'R2', 450, 120); tAdd(topo, m3, 'R3', 700, 170);
      tAdd(topo, 'PC', 'PC1', 200, 400); tAdd(topo, 'PC', 'PC3', 700, 400);
      tLink(topo, 'PC1', 'FastEthernet0', 'R1', R1lan); tLink(topo, 'PC3', 'FastEthernet0', 'R3', R3lan);
      tLink(topo, 'R1', R1w, 'R2', R2a); tLink(topo, 'R2', R2b, 'R3', R3w);
      tHostname(topo, ['R1', 'R2', 'R3']);
      tCli(topo, 'R1', ['interface ' + R1lan, 'ip address ' + ip.r1lan + ' ' + l1.mask, 'no shutdown', 'interface ' + R1w, 'ip address ' + ip.r1w + ' ' + w12.mask, 'no shutdown']);
      tCli(topo, 'R2', ['interface ' + R2a, 'ip address ' + ip.r2a + ' ' + w12.mask, 'no shutdown', 'interface ' + R2b, 'ip address ' + ip.r2b + ' ' + w23.mask, 'no shutdown']);
      tCli(topo, 'R3', ['interface ' + R3lan, 'ip address ' + ip.r3lan + ' ' + l3.mask, 'no shutdown', 'interface ' + R3w, 'ip address ' + ip.r3w + ' ' + w23.mask, 'no shutdown']);
      tPc(topo, 'PC1', ip.pc1, l1.mask, ip.r1lan); tPc(topo, 'PC3', ip.pc3, l3.mask, ip.r3lan);
    },
    checks: [CHK.defaultRoute('R1'), CHK.defaultRoute('R3'), CHK.route('R2', l1.net, 24, 'S'), CHK.route('R2', l3.net, 24, 'S'), CHK.ping('PC1', 'PC3', ip.pc3), CHK.ping('PC3', 'PC1', ip.pc1)],
    solution: { cli: {
      R1: ['ip route 0.0.0.0 0.0.0.0 ' + ip.r2a], R3: ['ip route 0.0.0.0 0.0.0.0 ' + ip.r2b],
      R2: ['ip route ' + l1.net + ' 255.255.255.0 ' + ip.r1w, 'ip route ' + l3.net + ' 255.255.255.0 ' + ip.r3w] } },
    hints: [T('PC ↔ router directly needs a Cross-Over cable (already connected here).', 'ПК ↔ роутер напрямую — перекрёстный кабель (здесь уже подключено).', 'מחשב ↔ נתב ישירות — כבל מוצלב (כאן כבר מחובר).'),
      T('R2 must not use a default route — it is the core and must know both LANs.', 'На R2 маршрут по умолчанию не подойдёт — он центр и должен знать обе сети.', 'ב-R2 נתיב ברירת מחדל לא יתאים — הוא נתב הליבה וחייב להכיר את שתי הרשתות.')],
  };
});

// --- 6. Полная сборка: кабели + адреса + статика ---
taskDef('static-build', 'static', 3, (rng) => {
  const x = twoRouterBase(rng);
  const cables = 'PC1–S1 Fa0/1, S1 Gi0/1–R1 ' + sh(x.r1lan) + ', R1 ' + sh(x.r1wan) + '–R2 ' + sh(x.r2wan) + ', R2 ' + sh(x.r2lan) + '–S2 Gi0/1, S2 Fa0/1–PC2.';
  return {
    title: T('Build a two-site network from scratch', 'Соберите сеть двух площадок с нуля', 'בניית רשת של שני אתרים מאפס'),
    intro: T('Devices are placed but nothing is connected or configured. Build the whole network: cables, addresses and static routing.',
      'Устройства расставлены, но ничего не подключено и не настроено. Соберите всю сеть: кабели, адреса и статическую маршрутизацию.',
      'ההתקנים כבר במקום, אבל שום דבר לא מחובר ולא מוגדר. יש לבנות את כל הרשת: כבלים, כתובות וניתוב סטטי.'),
    steps: [
      T('Cables: ' + cables, 'Кабели: ' + cables, 'כבלים: ' + cables),
      T('Configure all router interfaces and PCs from the addressing table.', 'Настройте все интерфейсы роутеров и ПК по таблице адресации.', 'להגדיר את כל ממשקי הנתבים ואת המחשבים לפי טבלת הכתובות.'),
      T('Add static routes so that both LANs can reach each other.', 'Добавьте статические маршруты, чтобы обе сети видели друг друга.', 'להוסיף נתיבים סטטיים כך ששתי הרשתות יגיעו זו לזו.'),
      T('Verify: PC1 pings PC2.', 'Проверка: PC1 пингует PC2.', 'בדיקה: PC1 עושה ping ל-PC2.'),
    ],
    table: x.table,
    build(topo) {
      tAdd(topo, x.m1, 'R1', 300, 150); tAdd(topo, x.m2, 'R2', 600, 150);
      tAdd(topo, '2960', 'S1', 200, 290); tAdd(topo, '2960', 'S2', 700, 290);
      tAdd(topo, 'PC', 'PC1', 200, 430); tAdd(topo, 'PC', 'PC2', 700, 430);
      tHostname(topo, ['R1', 'R2', 'S1', 'S2']);
    },
    checks: [CHK.link('PC1', 'FastEthernet0', 'S1', fa(1)), CHK.link('S1', 'GigabitEthernet0/1', 'R1', x.r1lan), CHK.link('R1', x.r1wan, 'R2', x.r2wan),
      CHK.link('R2', x.r2lan, 'S2', 'GigabitEthernet0/1'), CHK.link('S2', fa(1), 'PC2', 'FastEthernet0'),
      CHK.ifIp('R1', x.r1lan, x.gw1, x.l1.mask), CHK.ifIp('R1', x.r1wan, x.w1, x.w.mask), CHK.ifIp('R2', x.r2lan, x.gw2, x.l2.mask), CHK.ifIp('R2', x.r2wan, x.w2, x.w.mask),
      CHK.pc('PC1', x.pc1, x.l1.mask, x.gw1), CHK.pc('PC2', x.pc2, x.l2.mask, x.gw2),
      CHK.route('R1', x.l2.net, 24, 'S'), CHK.route('R2', x.l1.net, 24, 'S'), CHK.ping('PC1', 'PC2', x.pc2)],
    solution: {
      links: [['PC1', 'FastEthernet0', 'S1', fa(1)], ['S1', 'GigabitEthernet0/1', 'R1', x.r1lan], ['R1', x.r1wan, 'R2', x.r2wan], ['R2', x.r2lan, 'S2', 'GigabitEthernet0/1'], ['S2', fa(1), 'PC2', 'FastEthernet0']],
      cli: {
        R1: ['interface ' + x.r1lan, 'ip address ' + x.gw1 + ' ' + x.l1.mask, 'no shutdown', 'interface ' + x.r1wan, 'ip address ' + x.w1 + ' ' + x.w.mask, 'no shutdown', 'exit', 'ip route ' + x.l2.net + ' 255.255.255.0 ' + x.w2],
        R2: ['interface ' + x.r2lan, 'ip address ' + x.gw2 + ' ' + x.l2.mask, 'no shutdown', 'interface ' + x.r2wan, 'ip address ' + x.w2 + ' ' + x.w.mask, 'no shutdown', 'exit', 'ip route ' + x.l1.net + ' 255.255.255.0 ' + x.w1],
      },
      pc: { PC1: { ip: x.pc1, mask: x.l1.mask, gw: x.gw1 }, PC2: { ip: x.pc2, mask: x.l2.mask, gw: x.gw2 } },
    },
    hints: [T('Router ↔ router = Cross-Over; switch ↔ router and PC ↔ switch = Straight-Through.', 'Роутер ↔ роутер — кросс; свитч ↔ роутер и ПК ↔ свитч — прямой.', 'נתב ↔ נתב — כבל מוצלב; מתג ↔ נתב ומחשב ↔ מתג — כבל ישר.')],
  };
});

// --- 7. VLAN на одном свитче ---
taskDef('vlan-1sw', 'vlan', 2, (rng) => {
  const sn = subnetPool(rng).lan(0);
  const [na, nb] = rng.shuffle(VLAN_NAMES).slice(0, 2);
  const va = rng.int(2, 49) * 2, vb = va + rng.int(1, 40) * 2;
  const ports = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]).slice(0, 4).map(fa);
  const ips = [11, 12, 13, 14].map((hh) => host(sn, hh));
  return {
    title: T('Separate departments with VLANs', 'Разделите отделы с помощью VLAN', 'הפרדת מחלקות בעזרת VLAN'),
    intro: T('Four PCs are in one subnet ' + sn.net + '/24 on switch S1. Department "' + na + '" (PC1, PC2) must be isolated from "' + nb + '" (PC3, PC4) using VLANs.',
      'Четыре ПК в одной подсети ' + sn.net + '/24 на свитче S1. Отдел "' + na + '" (PC1, PC2) нужно изолировать от "' + nb + '" (PC3, PC4) с помощью VLAN.',
      'ארבעה מחשבים נמצאים באותה תת-רשת ' + sn.net + '/24 במתג S1. יש לבודד את מחלקת "' + na + '" (PC1, PC2) ממחלקת "' + nb + '" (PC3, PC4) בעזרת VLAN.'),
    steps: [
      T('On S1 create VLAN ' + va + ' named ' + na + ' and VLAN ' + vb + ' named ' + nb + '.', 'На S1 создайте VLAN ' + va + ' с именем ' + na + ' и VLAN ' + vb + ' с именем ' + nb + '.',
        'ב-S1 ליצור VLAN ' + va + ' בשם ' + na + ' ו-VLAN ' + vb + ' בשם ' + nb + '.'),
      T('Make ' + sh(ports[0]) + ', ' + sh(ports[1]) + ' access ports in VLAN ' + va + '; ' + sh(ports[2]) + ', ' + sh(ports[3]) + ' — in VLAN ' + vb + '.',
        'Сделайте ' + sh(ports[0]) + ', ' + sh(ports[1]) + ' access-портами в VLAN ' + va + '; ' + sh(ports[2]) + ', ' + sh(ports[3]) + ' — в VLAN ' + vb + '.',
        'להגדיר את ' + sh(ports[0]) + ', ' + sh(ports[1]) + ' כפורטי access ב-VLAN ' + va + ', ואת ' + sh(ports[2]) + ', ' + sh(ports[3]) + ' — ב-VLAN ' + vb + '.'),
      T('Verify: PC1 ↔ PC2 and PC3 ↔ PC4 ping, but PC1 cannot reach PC3.', 'Проверка: PC1 ↔ PC2 и PC3 ↔ PC4 пингуются, а PC1 не достаёт до PC3.', 'בדיקה: PC1 ↔ PC2 ו-PC3 ↔ PC4 עוברים ping, אבל PC1 לא מגיע ל-PC3.'),
    ],
    table: ['PC1', 'PC2', 'PC3', 'PC4'].map((p, i) => ({ ...rowPc(p, ips[i], sn.mask), extra: 'VLAN ' + (i < 2 ? va : vb) + ' · S1 ' + sh(ports[i]) })),
    build(topo) {
      tAdd(topo, '2960', 'S1', 450, 160);
      ['PC1', 'PC2', 'PC3', 'PC4'].forEach((p, i) => { tAdd(topo, 'PC', p, 150 + i * 200, 380); tLink(topo, p, 'FastEthernet0', 'S1', ports[i]); tPc(topo, p, ips[i], sn.mask); });
      tHostname(topo, ['S1']);
    },
    checks: [CHK.vlan('S1', va, na), CHK.vlan('S1', vb, nb), CHK.access('S1', ports[0], va), CHK.access('S1', ports[1], va), CHK.access('S1', ports[2], vb), CHK.access('S1', ports[3], vb),
      CHK.ping('PC1', 'PC2', ips[1]), CHK.ping('PC3', 'PC4', ips[3]), CHK.ping('PC1', 'PC3', ips[2], false)],
    solution: { cli: { S1: ['vlan ' + va, 'name ' + na, 'vlan ' + vb, 'name ' + nb, 'exit',
      'interface range ' + sh(ports[0]) + ' , ' + sh(ports[1]), 'switchport mode access', 'switchport access vlan ' + va,
      'interface range ' + sh(ports[2]) + ' , ' + sh(ports[3]), 'switchport mode access', 'switchport access vlan ' + vb] } },
    hints: [T('Check with "show vlan brief".', 'Проверяйте командой "show vlan brief".', 'בודקים עם "show vlan brief".'),
      T('Same subnet does not matter — VLANs split the broadcast domain.', 'Одна подсеть не важна — VLAN делят широковещательный домен.', 'אותה תת-רשת לא משנה — VLAN מפצלים את תחום ה-broadcast.')],
  };
});

// --- 8. VLAN через trunk между двумя свитчами ---
taskDef('vlan-trunk', 'vlan', 3, (rng) => {
  const sp = subnetPool(rng);
  const na = sp.lan(0), nb = sp.lan(0);
  const [nma, nmb] = rng.shuffle(VLAN_NAMES).slice(0, 2);
  const va = rng.int(5, 40) * 2, vb = va + rng.int(1, 30) * 2;
  const native = rng.chance(0.5) ? rng.pick([99, 999, 100, 199]) : null;
  const pa = fa(rng.int(1, 12)), pb = fa(rng.int(13, 24));
  const ips = { A1: host(na, 11), A2: host(na, 12), B1: host(nb, 11), B2: host(nb, 12) };
  const swCmds = ['vlan ' + va, 'name ' + nma, 'vlan ' + vb, 'name ' + nmb, ...(native ? ['vlan ' + native, 'name Native'] : []), 'exit',
    'interface ' + pa, 'switchport mode access', 'switchport access vlan ' + va, 'interface ' + pb, 'switchport mode access', 'switchport access vlan ' + vb,
    'interface GigabitEthernet0/1', 'switchport mode trunk', ...(native ? ['switchport trunk native vlan ' + native] : [])];
  return {
    title: T('Extend VLANs across a trunk', 'Протяните VLAN через trunk', 'העברת VLAN דרך trunk'),
    intro: T('Departments ' + nma + ' (VLAN ' + va + ') and ' + nmb + ' (VLAN ' + vb + ') have PCs on both floors (S1 and S2). Connect the switches and carry both VLANs over one trunk link.',
      'У отделов ' + nma + ' (VLAN ' + va + ') и ' + nmb + ' (VLAN ' + vb + ') есть ПК на обоих этажах (S1 и S2). Соедините свитчи и передавайте оба VLAN по одному trunk-каналу.',
      'למחלקות ' + nma + ' (VLAN ' + va + ') ו-' + nmb + ' (VLAN ' + vb + ') יש מחשבים בשתי הקומות (S1 ו-S2). יש לחבר את המתגים ולהעביר את שני ה-VLAN בקישור trunk אחד.'),
    steps: [
      T('Connect S1 GigabitEthernet0/1 to S2 GigabitEthernet0/1 (switch ↔ switch: which cable?).', 'Соедините S1 GigabitEthernet0/1 с S2 GigabitEthernet0/1 (свитч ↔ свитч: какой кабель?).',
        'לחבר את GigabitEthernet0/1 של S1 ל-GigabitEthernet0/1 של S2 (מתג ↔ מתג: איזה כבל?).'),
      T('On BOTH switches create VLAN ' + va + ' (' + nma + ') and VLAN ' + vb + ' (' + nmb + ').', 'На ОБОИХ свитчах создайте VLAN ' + va + ' (' + nma + ') и VLAN ' + vb + ' (' + nmb + ').',
        'בשני המתגים ליצור VLAN ' + va + ' (' + nma + ') ו-VLAN ' + vb + ' (' + nmb + ').'),
      T('On both switches: ' + sh(pa) + ' → access VLAN ' + va + ', ' + sh(pb) + ' → access VLAN ' + vb + '.', 'На обоих свитчах: ' + sh(pa) + ' → access VLAN ' + va + ', ' + sh(pb) + ' → access VLAN ' + vb + '.',
        'בשני המתגים: ' + sh(pa) + ' → access VLAN ' + va + ', ' + sh(pb) + ' → access VLAN ' + vb + '.'),
      T('Configure Gi0/1 as a static trunk on both switches' + (native ? ' with native VLAN ' + native : '') + '.', 'Настройте Gi0/1 как статический trunk на обоих свитчах' + (native ? ' с native VLAN ' + native : '') + '.',
        'להגדיר את Gi0/1 כ-trunk סטטי בשני המתגים' + (native ? ' עם native VLAN ' + native : '') + '.'),
      T('Verify: PCs in the same VLAN ping each other across switches; different VLANs are isolated.', 'Проверка: ПК одного VLAN пингуются через свитчи; разные VLAN изолированы.',
        'בדיקה: מחשבים באותו VLAN עוברים ping בין המתגים; ‏VLAN שונים מבודדים.'),
    ],
    table: [{ ...rowPc('PC-A1', ips.A1, na.mask), extra: 'S1 ' + sh(pa) + ' · VLAN ' + va }, { ...rowPc('PC-B1', ips.B1, nb.mask), extra: 'S1 ' + sh(pb) + ' · VLAN ' + vb },
      { ...rowPc('PC-A2', ips.A2, na.mask), extra: 'S2 ' + sh(pa) + ' · VLAN ' + va }, { ...rowPc('PC-B2', ips.B2, nb.mask), extra: 'S2 ' + sh(pb) + ' · VLAN ' + vb }],
    build(topo) {
      tAdd(topo, '2960', 'S1', 260, 170); tAdd(topo, '2960', 'S2', 640, 170);
      tAdd(topo, 'PC', 'PC-A1', 140, 390); tAdd(topo, 'PC', 'PC-B1', 330, 390); tAdd(topo, 'PC', 'PC-A2', 560, 390); tAdd(topo, 'PC', 'PC-B2', 750, 390);
      tLink(topo, 'PC-A1', 'FastEthernet0', 'S1', pa); tLink(topo, 'PC-B1', 'FastEthernet0', 'S1', pb);
      tLink(topo, 'PC-A2', 'FastEthernet0', 'S2', pa); tLink(topo, 'PC-B2', 'FastEthernet0', 'S2', pb);
      tPc(topo, 'PC-A1', ips.A1, na.mask); tPc(topo, 'PC-B1', ips.B1, nb.mask); tPc(topo, 'PC-A2', ips.A2, na.mask); tPc(topo, 'PC-B2', ips.B2, nb.mask);
      tHostname(topo, ['S1', 'S2']);
    },
    checks: [CHK.link('S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1'),
      CHK.vlan('S1', va, nma), CHK.vlan('S1', vb, nmb), CHK.vlan('S2', va, nma), CHK.vlan('S2', vb, nmb),
      CHK.access('S1', pa, va), CHK.access('S1', pb, vb), CHK.access('S2', pa, va), CHK.access('S2', pb, vb),
      CHK.trunk('S1', 'GigabitEthernet0/1'), CHK.trunk('S2', 'GigabitEthernet0/1'),
      ...(native ? [CHK.native('S1', 'GigabitEthernet0/1', native), CHK.native('S2', 'GigabitEthernet0/1', native)] : []),
      CHK.ping('PC-A1', 'PC-A2', ips.A2), CHK.ping('PC-B1', 'PC-B2', ips.B2)],
    solution: { links: [['S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1']], cli: { S1: swCmds, S2: swCmds } },
    hints: [T('Switch ↔ switch = Cross-Over cable.', 'Свитч ↔ свитч — перекрёстный кабель.', 'מתג ↔ מתג — כבל מוצלב.'), T('"show interfaces trunk" shows if the trunk is up.', '"show interfaces trunk" покажет, поднят ли trunk.', '"show interfaces trunk" מראה אם ה-trunk פעיל.'),
      T('The native VLAN must match on both ends.', 'Native VLAN должен совпадать с обеих сторон.', 'ה-native VLAN חייב להיות זהה בשני הצדדים.')],
  };
});

// --- 9. Router-on-a-stick ---
taskDef('roas', 'intervlan', 3, (rng) => {
  const sp = subnetPool(rng);
  const na = sp.lan(0), nb = sp.lan(0);
  const [nma, nmb] = rng.shuffle(VLAN_NAMES).slice(0, 2);
  const va = rng.int(1, 20) * 10, vb = va + rng.int(1, 10) * 10;
  const model = rng.pick(ROUTER_MODELS);
  const rp = gi(model, 0);
  const ga = host(na, 1), gb = host(nb, 1), pa = host(na, rng.int(10, 99)), pb = host(nb, rng.int(10, 99));
  return {
    title: T('Router-on-a-stick: route between VLANs', 'Router-on-a-stick: маршрутизация между VLAN', 'Router-on-a-stick: ניתוב בין VLAN'),
    intro: T('S1 already has VLAN ' + va + ' (' + nma + ') and VLAN ' + vb + ' (' + nmb + '). PCs in different VLANs must communicate through router R1 using ONE physical link with subinterfaces.',
      'На S1 уже есть VLAN ' + va + ' (' + nma + ') и VLAN ' + vb + ' (' + nmb + '). ПК из разных VLAN должны общаться через роутер R1 по ОДНОМУ физическому каналу с подынтерфейсами.',
      'ב-S1 כבר יש VLAN ' + va + ' (' + nma + ') ו-VLAN ' + vb + ' (' + nmb + '). מחשבים מ-VLAN שונים צריכים לתקשר דרך הנתב R1, בקישור פיזי אחד עם תת-ממשקים.'),
    steps: [
      T('On S1 make GigabitEthernet0/1 (to R1) a trunk.', 'На S1 сделайте GigabitEthernet0/1 (к R1) trunk-портом.', 'ב-S1 להגדיר את GigabitEthernet0/1 (לכיוון R1) כ-trunk.'),
      T('On R1 enable ' + sh(rp) + ' (no shutdown) without an IP address.', 'На R1 включите ' + sh(rp) + ' (no shutdown) без IP-адреса.', 'ב-R1 להפעיל את ' + sh(rp) + ' (no shutdown) בלי כתובת IP.'),
      T('Create subinterfaces ' + sh(rp) + '.' + va + ' and ' + sh(rp) + '.' + vb + ' with "encapsulation dot1Q" and the gateway addresses.', 'Создайте подынтерфейсы ' + sh(rp) + '.' + va + ' и ' + sh(rp) + '.' + vb + ' с "encapsulation dot1Q" и адресами шлюзов.',
        'ליצור תת-ממשקים ' + sh(rp) + '.' + va + ' ו-' + sh(rp) + '.' + vb + ' עם "encapsulation dot1Q" ועם כתובות השערים.'),
      T('Verify: PC-A pings PC-B.', 'Проверка: PC-A пингует PC-B.', 'בדיקה: PC-A עושה ping ל-PC-B.'),
    ],
    table: [rowIf('R1', rp + '.' + va, ga, na.mask), rowIf('R1', rp + '.' + vb, gb, nb.mask), { ...rowPc('PC-A', pa, na.mask, ga), extra: 'VLAN ' + va }, { ...rowPc('PC-B', pb, nb.mask, gb), extra: 'VLAN ' + vb }],
    build(topo) {
      tAdd(topo, model, 'R1', 450, 100); tAdd(topo, '2960', 'S1', 450, 250);
      tAdd(topo, 'PC', 'PC-A', 280, 410); tAdd(topo, 'PC', 'PC-B', 620, 410);
      tLink(topo, 'R1', rp, 'S1', 'GigabitEthernet0/1'); tLink(topo, 'PC-A', 'FastEthernet0', 'S1', fa(2)); tLink(topo, 'PC-B', 'FastEthernet0', 'S1', fa(3));
      tHostname(topo, ['R1', 'S1']);
      tCli(topo, 'S1', ['vlan ' + va, 'name ' + nma, 'vlan ' + vb, 'name ' + nmb, 'interface ' + fa(2), 'switchport mode access', 'switchport access vlan ' + va, 'interface ' + fa(3), 'switchport mode access', 'switchport access vlan ' + vb]);
      tPc(topo, 'PC-A', pa, na.mask, ga); tPc(topo, 'PC-B', pb, nb.mask, gb);
    },
    checks: [CHK.trunk('S1', 'GigabitEthernet0/1'), CHK.ifUp('R1', rp), CHK.subif('R1', rp + '.' + va, va, ga, na.mask), CHK.subif('R1', rp + '.' + vb, vb, gb, nb.mask),
      CHK.ping('PC-A', 'R1', ga), CHK.ping('PC-A', 'PC-B', pb)],
    solution: { cli: {
      S1: ['interface GigabitEthernet0/1', 'switchport mode trunk'],
      R1: ['interface ' + rp, 'no shutdown', 'interface ' + rp + '.' + va, 'encapsulation dot1Q ' + va, 'ip address ' + ga + ' ' + na.mask,
        'interface ' + rp + '.' + vb, 'encapsulation dot1Q ' + vb, 'ip address ' + gb + ' ' + nb.mask] } },
    hints: [T('"encapsulation dot1Q <vlan>" must come BEFORE "ip address" on a subinterface.', '"encapsulation dot1Q <vlan>" нужно ввести ДО "ip address" на подынтерфейсе.', 'את "encapsulation dot1Q <vlan>" צריך להקליד לפני "ip address" בתת-הממשק.'),
      T('The router does not negotiate trunks — the switch port must be "switchport mode trunk".', 'Роутер не согласует trunk — на свитче нужен "switchport mode trunk".', 'הנתב לא מנהל משא ומתן על trunk — בפורט המתג צריך "switchport mode trunk".')],
  };
});

// --- STP и EtherChannel ---
// Треугольник из трёх коммутаторов (гигабитные кабели уже проложены) и ПК на каждом.
// Без настройки корнем становится «старый» коммутатор с наименьшим MAC.
function stpTriangle(rng, ids, old, opts = {}) {
  const sp = subnetPool(rng);
  const net = sp.lan();
  const macs = swMacs(rng, 3);
  const mac = { [old]: macs[0] };
  ids.filter((x) => x !== old).forEach((x, i) => { mac[x] = macs[i + 1]; });
  const pcPort = fa(rng.int(2, 20));
  const pcs = ids.map((id, i) => ({ id: 'PC-' + id, sw: id, ip: host(net, 11 + i), vlan: opts.vlans ? opts.vlans[i % opts.vlans.length] : 1 }));
  return {
    net, pcPort, pcs, mac,
    build(topo) {
      const pos = { [ids[0]]: [450, 120], [ids[1]]: [240, 320], [ids[2]]: [660, 320] };
      for (const id of ids) { tAdd(topo, '2960', id, pos[id][0], pos[id][1]); tMac(topo, id, mac[id]); }
      tLink(topo, ids[0], 'GigabitEthernet0/1', ids[1], 'GigabitEthernet0/1');
      tLink(topo, ids[1], 'GigabitEthernet0/2', ids[2], 'GigabitEthernet0/2');
      tLink(topo, ids[2], 'GigabitEthernet0/1', ids[0], 'GigabitEthernet0/2');
      const pcPos = { [ids[0]]: [450, 0], [ids[1]]: [90, 440], [ids[2]]: [810, 440] };
      for (const p of pcs) { tAdd(topo, 'PC', p.id, pcPos[p.sw][0], pcPos[p.sw][1]); tLink(topo, p.id, 'FastEthernet0', p.sw, pcPort); tPc(topo, p.id, p.ip, net.mask); }
      tHostname(topo, ids);
    },
    table: pcs.map((p) => ({ ...rowPc(p.id, p.ip, net.mask), extra: p.sw + ' ' + sh(pcPort) + (p.vlan !== 1 ? ' · VLAN ' + p.vlan : '') })),
  };
}

taskDef('stp-root', 'stp', 2, (rng) => {
  const ids = ['S1', 'S2', 'S3'];
  const [core, backup, old] = rng.shuffle(ids.slice());
  const tri = stpTriangle(rng, ids, old);
  const pOld = tri.pcs.find((p) => p.sw === old), pBack = tri.pcs.find((p) => p.sw === backup);
  return {
    title: T('Choose the root bridge', 'Выберите корневой мост', 'בחירת ה-root bridge'),
    intro: T('Three switches are cabled in a triangle, so there is a loop and STP blocks one port. Right now the root bridge is the old switch ' + old + ' — only because it has the lowest MAC address. Make the core switch ' + core + ' the root, and ' + backup + ' the backup root.',
      'Три коммутатора соединены треугольником — есть петля, и STP блокирует один порт. Сейчас корневой мост — старый коммутатор ' + old + ', просто потому что у него самый маленький MAC. Сделайте корнем коммутатор ядра ' + core + ', а резервным корнем — ' + backup + '.',
      'שלושה מתגים מחוברים במשולש — יש לולאה, ו-STP חוסם פורט אחד. כרגע ה-root bridge הוא המתג הישן ' + old + ' — רק כי יש לו את כתובת ה-MAC הנמוכה ביותר. יש להפוך את מתג הליבה ' + core + ' ל-root, ואת ' + backup + ' ל-root גיבוי.'),
    steps: [
      T('On any switch run show spanning-tree: who is the root now, and which port is BLK?', 'На любом коммутаторе выполните show spanning-tree: кто сейчас корень и какой порт в BLK?', 'בכל מתג להריץ show spanning-tree: מי ה-root עכשיו, ואיזה פורט במצב BLK?'),
      T('Make ' + core + ' the root bridge for VLAN 1 (lower priority wins).', 'Сделайте ' + core + ' корневым мостом для VLAN 1 (меньший приоритет побеждает).', 'להפוך את ' + core + ' ל-root bridge של VLAN 1 (priority נמוך יותר מנצח).'),
      T('Make ' + backup + ' the backup root: it must take over if ' + core + ' fails.', 'Сделайте ' + backup + ' резервным корнем: он должен заменить ' + core + ' при отказе.', 'להפוך את ' + backup + ' ל-root גיבוי: הוא צריך להחליף את ' + core + ' אם הוא נופל.'),
      T('Verify: "This bridge is the root" on ' + core + '; the blocked port moved. PCs still ping each other.', 'Проверка: на ' + core + ' — «This bridge is the root»; заблокированный порт переместился. ПК по-прежнему пингуются.', 'בדיקה: ב-' + core + ' — ‏"This bridge is the root"; הפורט החסום זז. המחשבים עדיין עוברים ping.'),
    ],
    table: tri.table,
    build: tri.build,
    checks: [CHK.stpRoot(core, 1), CHK.stpBackup(backup, core, 1), CHK.ping(pOld.id, pBack.id, pBack.ip)],
    solution: { cli: { [core]: ['spanning-tree vlan 1 root primary'], [backup]: ['spanning-tree vlan 1 root secondary'] } },
    hints: [T('Bridge ID = priority + MAC. The priority is a multiple of 4096 (default 32768); the lowest Bridge ID wins.', 'Bridge ID = приоритет + MAC. Приоритет кратен 4096 (по умолчанию 32768); побеждает наименьший Bridge ID.', 'Bridge ID = ‏priority + ‏MAC. ה-priority הוא כפולה של 4096 (ברירת מחדל 32768); ה-Bridge ID הנמוך ביותר מנצח.'),
      T('spanning-tree vlan 1 root primary on ' + core + ', root secondary on ' + backup + '.', 'spanning-tree vlan 1 root primary на ' + core + ', root secondary на ' + backup + '.', 'spanning-tree vlan 1 root primary ב-' + core + ', ו-root secondary ב-' + backup + '.')],
  };
});

taskDef('stp-pvst', 'stp', 3, (rng) => {
  const ids = ['S1', 'S2', 'S3'];
  const [nA, nB] = rng.shuffle(VLAN_NAMES).slice(0, 2);
  const vA = rng.int(5, 40) * 2, vB = vA + rng.int(1, 20) * 2;
  const tri = stpTriangle(rng, ids, 'S3', { vlans: [vA, vB, vA] });
  const trunkCmds = ['vlan ' + vA, 'name ' + nA, 'vlan ' + vB, 'name ' + nB, 'exit', 'interface range GigabitEthernet0/1 - 2', 'switchport mode trunk'];
  const pA1 = tri.pcs[0], pB = tri.pcs[1], pA2 = tri.pcs[2];
  return {
    title: T('Share the load: one root per VLAN (PVST+)', 'Разделите нагрузку: свой корень для каждого VLAN (PVST+)', 'חלוקת עומס: root נפרד לכל VLAN ‏(PVST+)'),
    intro: T('PVST+ builds a separate spanning tree for every VLAN. Now S3 is the root of all of them, so traffic of both VLANs uses the same links. Make S1 the root for VLAN ' + vA + ' (' + nA + ') and S2 the root for VLAN ' + vB + ' (' + nB + '); each must also be the backup root for the other VLAN.',
      'PVST+ строит отдельное дерево для каждого VLAN. Сейчас S3 — корень всех деревьев, и трафик обоих VLAN идёт по одним и тем же каналам. Сделайте S1 корнем для VLAN ' + vA + ' (' + nA + '), а S2 — для VLAN ' + vB + ' (' + nB + '); каждый из них должен быть ещё и резервным корнем другого VLAN.',
      'PVST+ בונה עץ נפרד לכל VLAN. כרגע S3 הוא ה-root של כולם, ולכן התעבורה של שני ה-VLAN עוברת באותם קישורים. יש להפוך את S1 ל-root של VLAN ' + vA + ' ‏(' + nA + '), ואת S2 ל-root של VLAN ' + vB + ' ‏(' + nB + '); כל אחד מהם צריך להיות גם ה-root הגיבוי של ה-VLAN השני.'),
    steps: [
      T('show spanning-tree vlan ' + vA + ' and vlan ' + vB + ' on S1: the root and the blocked port are the same for both VLANs.', 'show spanning-tree vlan ' + vA + ' и vlan ' + vB + ' на S1: корень и заблокированный порт у обоих VLAN одинаковые.', 'show spanning-tree vlan ' + vA + ' ו-vlan ' + vB + ' ב-S1: ה-root והפורט החסום זהים לשני ה-VLAN.'),
      T('S1: root primary for VLAN ' + vA + ', root secondary for VLAN ' + vB + '.', 'S1: root primary для VLAN ' + vA + ', root secondary для VLAN ' + vB + '.', 'S1: ‏root primary ל-VLAN ' + vA + ', ‏root secondary ל-VLAN ' + vB + '.'),
      T('S2: root primary for VLAN ' + vB + ', root secondary for VLAN ' + vA + '.', 'S2: root primary для VLAN ' + vB + ', root secondary для VLAN ' + vA + '.', 'S2: ‏root primary ל-VLAN ' + vB + ', ‏root secondary ל-VLAN ' + vA + '.'),
      T('Verify: now each VLAN blocks a different link — both links carry traffic.', 'Проверка: теперь каждый VLAN блокирует свой канал — работают оба.', 'בדיקה: עכשיו כל VLAN חוסם קישור אחר — שני הקישורים עובדים.'),
    ],
    table: tri.table,
    build(topo) {
      tri.build(topo);
      for (const id of ids) tCli(topo, id, trunkCmds);
      for (const p of tri.pcs) tCli(topo, p.sw, ['interface ' + tri.pcPort, 'switchport mode access', 'switchport access vlan ' + p.vlan]);
    },
    checks: [CHK.stpRoot('S1', vA), CHK.stpRoot('S2', vB), CHK.stpBackup('S2', 'S1', vA), CHK.stpBackup('S1', 'S2', vB), CHK.ping(pA1.id, pA2.id, pA2.ip)],
    solution: { cli: { S1: ['spanning-tree vlan ' + vA + ' root primary', 'spanning-tree vlan ' + vB + ' root secondary'], S2: ['spanning-tree vlan ' + vB + ' root primary', 'spanning-tree vlan ' + vA + ' root secondary'] } },
    hints: [T('The commands take a VLAN number: spanning-tree vlan ' + vA + ' root primary.', 'Команды принимают номер VLAN: spanning-tree vlan ' + vA + ' root primary.', 'הפקודות מקבלות מספר VLAN: ‏spanning-tree vlan ' + vA + ' root primary.'),
      T('The Bridge ID priority shown is priority + VLAN number (sys-id-ext): 24576 + ' + vA + ' = ' + (24576 + vA) + '.', 'В выводе приоритет = priority + номер VLAN (sys-id-ext): 24576 + ' + vA + ' = ' + (24576 + vA) + '.', 'ה-priority שמוצג = ‏priority + מספר ה-VLAN ‏(sys-id-ext): ‏24576 + ' + vA + ' = ' + (24576 + vA) + '.'),
      T(pB.id + ' is in VLAN ' + vB + ' alone — it is there to show the second tree.', pB.id + ' один в VLAN ' + vB + ' — он нужен, чтобы было видно второе дерево.', pB.id + ' לבד ב-VLAN ' + vB + ' — הוא שם כדי לראות את העץ השני.')],
  };
});

taskDef('stp-edge', 'stp', 1, (rng) => {
  const sp = subnetPool(rng);
  const net = sp.lan();
  const ports = rng.shuffle(Array.from({ length: 20 }, (_, i) => fa(i + 2))).slice(0, 3).sort((a, b) => Number(a.split('/')[1]) - Number(b.split('/')[1]));
  const globalWay = rng.chance(0.5);
  const pcs = ports.map((p, i) => ({ id: 'PC' + (i + 1), port: p, ip: host(net, 11 + i) }));
  const srv = { id: 'Server', ip: host(net, 50) };
  const list = ports.map(sh).join(', ');
  return {
    title: T('PortFast and BPDU Guard on user ports', 'PortFast и BPDU Guard на портах пользователей', 'PortFast ו-BPDU Guard בפורטים של משתמשים'),
    intro: T('Users wait 30 seconds after plugging in their PC, until STP lets the port forward. And someone could plug a home switch into a wall socket. Turn on PortFast and BPDU Guard on the PC ports of S1 (' + list + ') — but not on the uplink Gi0/1 to S2.',
      'Пользователи ждут 30 секунд после подключения ПК, пока STP не разрешит порту передавать. А кто-нибудь может воткнуть в розетку домашний коммутатор. Включите PortFast и BPDU Guard на портах ПК коммутатора S1 (' + list + ') — но не на аплинке Gi0/1 к S2.',
      'המשתמשים מחכים 30 שניות אחרי חיבור המחשב, עד ש-STP מאפשר לפורט להעביר תעבורה. ומישהו יכול לחבר לשקע מתג ביתי. יש להפעיל PortFast ו-BPDU Guard בפורטים של המחשבים ב-S1 ‏(' + list + ') — אבל לא ב-uplink ‏Gi0/1 אל S2.'),
    steps: [
      T('Configure the three PC ports together: interface range ' + list + '.', 'Настройте три порта ПК сразу: interface range ' + list + '.', 'להגדיר את שלושת פורטי המחשבים יחד: ‏interface range ' + list + '.'),
      T('PortFast on these ports.', 'PortFast на этих портах.', 'PortFast בפורטים האלה.'),
      globalWay ? T('BPDU Guard for all PortFast ports at once — with one global command.', 'BPDU Guard сразу для всех портов с PortFast — одной глобальной командой.', 'BPDU Guard לכל הפורטים עם PortFast בבת אחת — בפקודה גלובלית אחת.')
        : T('BPDU Guard on the same ports.', 'BPDU Guard на тех же портах.', 'BPDU Guard באותם פורטים.'),
      T('Do not touch Gi0/1: BPDU Guard there would shut the uplink at once.', 'Gi0/1 не трогайте: BPDU Guard там сразу выключит аплинк.', 'לא לגעת ב-Gi0/1: ‏BPDU Guard שם יכבה את ה-uplink מיד.'),
    ],
    table: pcs.map((p) => ({ ...rowPc(p.id, p.ip, net.mask), extra: 'S1 ' + sh(p.port) })).concat([{ ...rowPc(srv.id, srv.ip, net.mask), extra: 'S2 Fa0/1' }]),
    build(topo) {
      tAdd(topo, '2960', 'S1', 300, 200); tAdd(topo, '2960', 'S2', 650, 200);
      tLink(topo, 'S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
      pcs.forEach((p, i) => { tAdd(topo, 'PC', p.id, 120 + i * 180, 400); tLink(topo, p.id, 'FastEthernet0', 'S1', p.port); tPc(topo, p.id, p.ip, net.mask); });
      tAdd(topo, 'Server', srv.id, 650, 400); tLink(topo, srv.id, 'FastEthernet0', 'S2', 'FastEthernet0/1'); tPc(topo, srv.id, srv.ip, net.mask);
      tHostname(topo, ['S1', 'S2']);
    },
    checks: [...pcs.map((p) => CHK.portfast('S1', p.port)), ...pcs.map((p) => CHK.bpduguard('S1', p.port)), CHK.notErrdis('S1', 'GigabitEthernet0/1', 'S2'), CHK.ping(pcs[0].id, srv.id, srv.ip)],
    solution: { cli: { S1: globalWay ? ['interface range ' + list, 'spanning-tree portfast', 'exit', 'spanning-tree portfast bpduguard default'] : ['interface range ' + list, 'spanning-tree portfast', 'spanning-tree bpduguard enable'] } },
    hints: [T('PortFast only on ports to end devices (PCs, printers, servers).', 'PortFast — только на портах к конечным устройствам (ПК, принтеры, серверы).', 'PortFast רק בפורטים להתקני קצה (מחשבים, מדפסות, שרתים).'),
      globalWay ? T('Global: spanning-tree portfast bpduguard default.', 'Глобально: spanning-tree portfast bpduguard default.', 'גלובלית: ‏spanning-tree portfast bpduguard default.') : T('On the ports: spanning-tree bpduguard enable.', 'На портах: spanning-tree bpduguard enable.', 'בפורטים: ‏spanning-tree bpduguard enable.'),
      T('show spanning-tree shows "P2p Edge" on PortFast ports.', 'show spanning-tree показывает «P2p Edge» на портах с PortFast.', 'show spanning-tree מראה "P2p Edge" בפורטים עם PortFast.')],
  };
});

// Два коммутатора, два параллельных кабеля, ПК одного VLAN на каждом
function ecPairSetup(rng) {
  const sp = subnetPool(rng);
  const net = sp.lan();
  const gig = rng.chance(0.5);
  const links = gig ? ['GigabitEthernet0/1', 'GigabitEthernet0/2'] : ['FastEthernet0/23', 'FastEthernet0/24'];
  const g = rng.int(1, 6);
  const vlan = rng.int(5, 60) * 2, vname = rng.pick(VLAN_NAMES);
  const pcPort = fa(rng.int(1, 12));
  const ips = { A: host(net, 11), B: host(net, 12) };
  const range = 'interface range ' + sh(links[0]) + ' - ' + links[1].split('/')[1];
  return {
    net, links, g, vlan, vname, pcPort, ips, range, po: 'Port-channel' + g,
    build(topo) {
      tAdd(topo, '2960', 'S1', 280, 180); tAdd(topo, '2960', 'S2', 640, 180);
      for (const p of links) tLink(topo, 'S1', p, 'S2', p);
      tAdd(topo, 'PC', 'PC-A', 280, 400); tAdd(topo, 'PC', 'PC-B', 640, 400);
      tLink(topo, 'PC-A', 'FastEthernet0', 'S1', pcPort); tLink(topo, 'PC-B', 'FastEthernet0', 'S2', pcPort);
      tPc(topo, 'PC-A', ips.A, net.mask); tPc(topo, 'PC-B', ips.B, net.mask);
      for (const s of ['S1', 'S2']) tCli(topo, s, ['hostname ' + s, 'vlan ' + vlan, 'name ' + vname, 'exit', 'interface ' + pcPort, 'switchport mode access', 'switchport access vlan ' + vlan]);
    },
    table: [{ ...rowPc('PC-A', ips.A, net.mask), extra: 'S1 ' + sh(pcPort) + ' · VLAN ' + vlan }, { ...rowPc('PC-B', ips.B, net.mask), extra: 'S2 ' + sh(pcPort) + ' · VLAN ' + vlan }],
  };
}

taskDef('ec-bundle', 'etherchannel', 2, (rng) => {
  const e = ecPairSetup(rng);
  const lacp = rng.chance(0.6);
  const [m1, m2] = lacp ? ['active', rng.pick(['passive', 'active'])] : ['desirable', rng.pick(['auto', 'desirable'])];
  const proto = lacp ? 'LACP' : 'PAgP';
  const two = sh(e.links[0]) + ' + ' + sh(e.links[1]);
  return {
    title: T('Bundle two links into an EtherChannel (' + proto + ')', 'Объедините два канала в EtherChannel (' + proto + ')', 'איחוד שני קישורים ל-EtherChannel ‏(' + proto + ')'),
    intro: T('S1 and S2 are connected with two cables (' + two + '). STP blocks one of them, so half of the bandwidth is wasted, and VLAN ' + e.vlan + ' (' + e.vname + ') does not reach the other switch yet. Bundle both links into ' + e.po + ' with ' + proto + ' and make it a trunk.',
      'S1 и S2 соединены двумя кабелями (' + two + '). STP блокирует один из них — половина полосы пропадает, а VLAN ' + e.vlan + ' (' + e.vname + ') пока не доходит до второго коммутатора. Объедините оба канала в ' + e.po + ' по ' + proto + ' и сделайте его trunk.',
      'S1 ו-S2 מחוברים בשני כבלים (' + two + '). ‏STP חוסם אחד מהם, כך שחצי מרוחב הפס הולך לאיבוד, ו-VLAN ' + e.vlan + ' ‏(' + e.vname + ') עדיין לא מגיע למתג השני. יש לאחד את שני הקישורים ל-' + e.po + ' עם ' + proto + ' ולהגדיר אותו כ-trunk.'),
    steps: [
      T('Look first: show spanning-tree — one of the two links is BLK.', 'Сначала посмотрите: show spanning-tree — один из двух каналов в BLK.', 'קודם להסתכל: ‏show spanning-tree — אחד משני הקישורים במצב BLK.'),
      T('S1: both ports into channel-group ' + e.g + ', mode ' + m1 + '.', 'S1: оба порта в channel-group ' + e.g + ', режим ' + m1 + '.', 'S1: שני הפורטים ל-channel-group ' + e.g + ', מצב ' + m1 + '.'),
      T('S2: both ports into channel-group ' + e.g + ', mode ' + m2 + '.', 'S2: оба порта в channel-group ' + e.g + ', режим ' + m2 + '.', 'S2: שני הפורטים ל-channel-group ' + e.g + ', מצב ' + m2 + '.'),
      T('On both switches: interface ' + e.po + ' → switchport mode trunk (IOS copies it to both ports).', 'На обоих коммутаторах: interface ' + e.po + ' → switchport mode trunk (IOS перенесёт это на оба порта).', 'בשני המתגים: ‏interface ' + e.po + ' → ‏switchport mode trunk (ה-IOS מעתיק את זה לשני הפורטים).'),
      T('Verify: show etherchannel summary → Po' + e.g + '(SU), both ports (P); PC-A pings PC-B.', 'Проверка: show etherchannel summary → Po' + e.g + '(SU), оба порта (P); PC-A пингует PC-B.', 'בדיקה: ‏show etherchannel summary → ‏Po' + e.g + '(SU), שני הפורטים (P); ‏PC-A עושה ping ל-PC-B.'),
    ],
    table: e.table,
    build: e.build,
    checks: [CHK.ecUp('S1', e.g, 2, proto), CHK.ecUp('S2', e.g, 2, proto), CHK.trunk('S1', e.po), CHK.trunk('S2', e.po), CHK.ping('PC-A', 'PC-B', e.ips.B)],
    solution: { cli: { S1: [e.range, 'channel-group ' + e.g + ' mode ' + m1, 'interface port-channel ' + e.g, 'switchport mode trunk'], S2: [e.range, 'channel-group ' + e.g + ' mode ' + m2, 'interface port-channel ' + e.g, 'switchport mode trunk'] } },
    hints: [lacp ? T('LACP: active starts the negotiation, passive only answers. At least one side must be active.', 'LACP: active сам начинает переговоры, passive только отвечает. Хотя бы одна сторона должна быть active.', 'LACP: ‏active מתחיל את המשא ומתן, ‏passive רק עונה. לפחות צד אחד חייב להיות active.')
      : T('PAgP: desirable starts the negotiation, auto only answers. At least one side must be desirable.', 'PAgP: desirable сам начинает переговоры, auto только отвечает. Хотя бы одна сторона должна быть desirable.', 'PAgP: ‏desirable מתחיל את המשא ומתן, ‏auto רק עונה. לפחות צד אחד חייב להיות desirable.'),
      T(e.range + ' configures both ports at once.', e.range + ' настраивает оба порта сразу.', e.range + ' מגדיר את שני הפורטים בבת אחת.'),
      T('After bundling, STP sees one port ' + e.po + ' — nothing is blocked any more.', 'После объединения STP видит один порт ' + e.po + ' — блокировать больше нечего.', 'אחרי האיחוד STP רואה פורט אחד ' + e.po + ' — אין יותר מה לחסום.')],
  };
});

taskDef('ts-ec', 'etherchannel', 3, (rng) => {
  const e = ecPairSetup(rng);
  const memb = 'interface ' + e.links[1];
  const base = { S1: [e.range, 'channel-group ' + e.g + ' mode passive', 'interface port-channel ' + e.g, 'switchport mode trunk'], S2: [e.range, 'channel-group ' + e.g + ' mode active', 'interface port-channel ' + e.g, 'switchport mode trunk'] };
  const all = rng.shuffle([
    { id: 'passive', bad: [e.range, 'channel-group ' + e.g + ' mode passive'], fix: [e.range, 'channel-group ' + e.g + ' mode active'],
      text: T('S2 was LACP passive, like S1: passive + passive never forms a channel.', 'На S2 стоял LACP passive, как и на S1: passive + passive канал не собирают.', 'ב-S2 היה LACP passive, כמו ב-S1: ‏passive + passive אף פעם לא יוצרים ערוץ.') },
    { id: 'pagp', bad: [e.range, 'no channel-group', 'channel-group ' + e.g + ' mode desirable'], fix: [e.range, 'no channel-group', 'channel-group ' + e.g + ' mode active'],
      text: T('S2 used PAgP (desirable) and S1 LACP: different protocols never bundle.', 'S2 использовал PAgP (desirable), а S1 — LACP: разные протоколы не объединяются.', 'S2 השתמש ב-PAgP ‏(desirable) ו-S1 ב-LACP: פרוטוקולים שונים לא מתאחדים.') },
    { id: 'member', bad: [memb, 'switchport mode access'], fix: [memb, 'switchport mode trunk'],
      text: T('On S2 ' + sh(e.links[1]) + ' was an access port while its ' + e.po + ' is a trunk — the port was suspended (s).', 'На S2 порт ' + sh(e.links[1]) + ' был access, а его ' + e.po + ' — trunk: порт приостановлен (s).', 'ב-S2 הפורט ' + sh(e.links[1]) + ' היה access, וה-' + e.po + ' שלו trunk — הפורט הושעה (s).') },
    { id: 'notrunk', bad: ['interface port-channel ' + e.g, 'switchport mode access'], fix: ['interface port-channel ' + e.g, 'switchport mode trunk'],
      text: T('On S2 ' + e.po + ' was an access port, so VLAN ' + e.vlan + ' did not cross the channel.', 'На S2 ' + e.po + ' был access-портом, и VLAN ' + e.vlan + ' не проходил через канал.', 'ב-S2 ה-' + e.po + ' היה פורט access, ולכן VLAN ' + e.vlan + ' לא עבר בערוץ.') },
  ]);
  const faults = [all[0]];
  const second = all.slice(1).find((f) => !(['passive', 'pagp'].includes(f.id) && ['passive', 'pagp'].includes(all[0].id)));
  if (rng.chance(0.5) && second) faults.push(second);
  return {
    title: T('Troubleshoot: the EtherChannel does not come up', 'Неисправность: EtherChannel не поднимается', 'איתור תקלות: ה-EtherChannel לא עולה'),
    intro: T('S1 and S2 should be joined by ' + e.po + ' (LACP, trunk) over ' + sh(e.links[0]) + ' and ' + sh(e.links[1]) + ', but PC-A cannot reach PC-B in VLAN ' + e.vlan + '. S1 is configured correctly; find and fix the problem on S2.',
      'S1 и S2 должны быть соединены через ' + e.po + ' (LACP, trunk) по ' + sh(e.links[0]) + ' и ' + sh(e.links[1]) + ', но PC-A не видит PC-B в VLAN ' + e.vlan + '. S1 настроен правильно; найдите и исправьте ошибку на S2.',
      'S1 ו-S2 אמורים להיות מחוברים דרך ' + e.po + ' ‏(LACP, ‏trunk) על ' + sh(e.links[0]) + ' ו-' + sh(e.links[1]) + ', אבל PC-A לא מגיע ל-PC-B ב-VLAN ' + e.vlan + '. ‏S1 מוגדר נכון; יש למצוא ולתקן את התקלה ב-S2.'),
    steps: [T('Useful commands: show etherchannel summary, show interfaces trunk, show running-config.', 'Полезные команды: show etherchannel summary, show interfaces trunk, show running-config.', 'פקודות שימושיות: ‏show etherchannel summary, ‏show interfaces trunk, ‏show running-config.'),
      T('Flags: P — in the channel, I — stand-alone (no partner), s — suspended (settings differ), D — down.', 'Флаги: P — в канале, I — сам по себе (нет партнёра), s — приостановлен (настройки отличаются), D — не работает.', 'דגלים: P — בערוץ, ‏I — לבד (אין שותף), ‏s — מושעה (הגדרות שונות), ‏D — לא פעיל.'),
      T('Verify: Po' + e.g + '(SU) with both ports (P) on both switches; PC-A pings PC-B.', 'Проверка: Po' + e.g + '(SU) и оба порта (P) на обоих коммутаторах; PC-A пингует PC-B.', 'בדיקה: ‏Po' + e.g + '(SU) עם שני הפורטים (P) בשני המתגים; ‏PC-A עושה ping ל-PC-B.')],
    table: e.table,
    build(topo) {
      e.build(topo);
      tCli(topo, 'S1', base.S1); tCli(topo, 'S2', base.S2);
      for (const f of faults) tCli(topo, 'S2', f.bad);
    },
    checks: [CHK.ecUp('S1', e.g, 2, 'LACP'), CHK.ecUp('S2', e.g, 2, 'LACP'), CHK.ping('PC-A', 'PC-B', e.ips.B)],
    solution: { cli: { S2: faults.flatMap((f) => f.fix) } },
    faults: faults.map((f) => f.text),
    hints: [T('Compare S1 and S2: show etherchannel summary on both.', 'Сравните S1 и S2: show etherchannel summary на обоих.', 'משווים בין S1 ל-S2: ‏show etherchannel summary בשניהם.'), ...faults.map((f) => f.text)],
  };
});

// --- 10. DHCP на роутере ---
taskDef('dhcp-basic', 'dhcp', 2, (rng) => {
  const sn = subnetPool(rng).lan();
  const model = rng.pick(ROUTER_MODELS);
  const rp = gi(model, 0);
  const pool = rng.pick(POOL_NAMES);
  const excl = rng.pick([5, 10, 20, 50]);
  const dns = rng.pick(['8.8.8.8', '1.1.1.1', '9.9.9.9', host(sn, 2)]);
  const gw = host(sn, 1);
  return {
    title: T('Configure a DHCP server on a router', 'Настройте DHCP-сервер на роутере', 'הגדרת שרת DHCP בנתב'),
    intro: T('Instead of typing addresses on every PC, router R1 must hand them out automatically for network ' + sn.net + '/24.',
      'Чтобы не вбивать адреса на каждом ПК, роутер R1 должен раздавать их автоматически в сети ' + sn.net + '/24.',
      'במקום להקליד כתובת בכל מחשב, הנתב R1 צריך לחלק כתובות אוטומטית ברשת ' + sn.net + '/24.'),
    steps: [
      T('Configure R1 ' + sh(rp) + ' with ' + gw + ' ' + sn.mask + ' and enable it.', 'Настройте на R1 ' + sh(rp) + ' адрес ' + gw + ' ' + sn.mask + ' и включите интерфейс.',
        'להגדיר ב-R1 את ' + sh(rp) + ' עם ' + gw + ' ' + sn.mask + ' ולהפעיל את הממשק.'),
      T('Exclude addresses ' + host(sn, 1) + ' – ' + host(sn, excl) + ' from DHCP.', 'Исключите из DHCP адреса ' + host(sn, 1) + ' – ' + host(sn, excl) + '.',
        'להחריג מ-DHCP את הכתובות ' + host(sn, 1) + ' – ' + host(sn, excl) + '.'),
      T('Create DHCP pool "' + pool + '": network ' + sn.net + ' ' + sn.mask + ', default-router ' + gw + ', dns-server ' + dns + '.',
        'Создайте DHCP-пул "' + pool + '": network ' + sn.net + ' ' + sn.mask + ', default-router ' + gw + ', dns-server ' + dns + '.',
        'ליצור מאגר DHCP בשם "' + pool + '": ‏network ' + sn.net + ' ' + sn.mask + ', ‏default-router ' + gw + ', ‏dns-server ' + dns + '.'),
      T('Set all PCs to DHCP (Desktop → IP Configuration → DHCP).', 'Переключите все ПК на DHCP (Desktop → IP Configuration → DHCP).', 'להעביר את כל המחשבים ל-DHCP (Desktop → IP Configuration → DHCP).'),
      T('Verify: every PC gets an address and pings R1.', 'Проверка: каждый ПК получает адрес и пингует R1.', 'בדיקה: כל מחשב מקבל כתובת ועושה ping ל-R1.'),
    ],
    table: [rowIf('R1', rp, gw, sn.mask), rowPc('PC1–PC3', 'DHCP', 'DHCP', 'DHCP')],
    build(topo) {
      tAdd(topo, model, 'R1', 450, 90); tAdd(topo, '2960', 'S1', 450, 230);
      ['PC1', 'PC2', 'PC3'].forEach((p, i) => { tAdd(topo, 'PC', p, 230 + i * 220, 400); tLink(topo, p, 'FastEthernet0', 'S1', fa(i + 2)); });
      tLink(topo, 'R1', rp, 'S1', 'GigabitEthernet0/1');
      tHostname(topo, ['R1', 'S1']);
    },
    checks: [CHK.ifIp('R1', rp, gw, sn.mask), CHK.ifUp('R1', rp), CHK.excluded('R1', host(sn, 1), host(sn, excl)), CHK.dhcpPool('R1', pool, sn.net, sn.mask, gw, dns),
      ...['PC1', 'PC2', 'PC3'].map((p) => CHK.dhcpClient(p, sn, excl + 1)),
      { label: T('Every PC pings R1 (' + gw + ')', 'Каждый ПК пингует R1 (' + gw + ')', 'כל מחשב עושה ping ל-R1 (' + gw + ')'),
        run(topo) { for (const p of ['PC1', 'PC2', 'PC3']) { if (canReach(topo, p, gw).status !== 'reply') return { ok: false, hint: T(p + ' cannot reach the gateway.', p + ' не достаёт до шлюза.', p + ' לא מגיע לשער.') }; } return { ok: true }; } }],
    solution: { cli: { R1: ['interface ' + rp, 'ip address ' + gw + ' ' + sn.mask, 'no shutdown', 'exit', 'ip dhcp excluded-address ' + host(sn, 1) + ' ' + host(sn, excl),
      'ip dhcp pool ' + pool, 'network ' + sn.net + ' ' + sn.mask, 'default-router ' + gw, 'dns-server ' + dns] }, pc: { PC1: { dhcp: true }, PC2: { dhcp: true }, PC3: { dhcp: true } } },
    hints: [T('Exclude addresses BEFORE PCs request them, otherwise they may get an excluded address — then renew.', 'Исключите адреса ДО запроса с ПК, иначе ПК может получить исключённый адрес — тогда обновите.',
      'מחריגים כתובות לפני שהמחשבים מבקשים אותן, אחרת מחשב עלול לקבל כתובת מוחרגת — ואז מחדשים.'),
      T('Check leases with "show ip dhcp binding".', 'Аренды смотрите командой "show ip dhcp binding".', 'את החכירות רואים עם "show ip dhcp binding".')],
  };
});

// --- 11. DHCP relay ---
taskDef('dhcp-relay', 'dhcp', 3, (rng) => {
  const x = twoRouterBase(rng);
  const pool = 'REMOTE';
  return {
    title: T('DHCP relay for a remote LAN', 'DHCP relay для удалённой сети', 'DHCP relay לרשת מרוחקת'),
    intro: T('R1 is the central DHCP server. PCs behind R2 must get addresses from R1. Routing between the sites is already configured.',
      'R1 — центральный DHCP-сервер. ПК за R2 должны получать адреса от R1. Маршрутизация между площадками уже настроена.',
      'R1 הוא שרת ה-DHCP המרכזי. המחשבים מאחורי R2 צריכים לקבל כתובות מ-R1. הניתוב בין האתרים כבר מוגדר.'),
    steps: [
      T('On R1 exclude ' + x.gw2 + ' and create pool ' + pool + ' for ' + x.l2.net + '/24 with default-router ' + x.gw2 + '.', 'На R1 исключите ' + x.gw2 + ' и создайте пул ' + pool + ' для ' + x.l2.net + '/24 с default-router ' + x.gw2 + '.',
        'ב-R1 להחריג את ' + x.gw2 + ' וליצור מאגר ' + pool + ' עבור ' + x.l2.net + '/24 עם default-router ‏' + x.gw2 + '.'),
      T('On R2 ' + sh(x.r2lan) + ' configure "ip helper-address ' + x.w1 + '".', 'На R2 ' + sh(x.r2lan) + ' настройте "ip helper-address ' + x.w1 + '".',
        'ב-R2, בממשק ' + sh(x.r2lan) + ', להגדיר "ip helper-address ' + x.w1 + '".'),
      T('Switch PC2 to DHCP and verify it pings PC1.', 'Переключите PC2 на DHCP и проверьте, что он пингует PC1.', 'להעביר את PC2 ל-DHCP ולבדוק שהוא עושה ping ל-PC1.'),
    ],
    table: x.table.map((r) => (r.dev === 'PC2' ? rowPc('PC2', 'DHCP', 'DHCP', 'DHCP') : r)),
    build(topo) {
      x.build(topo);
      tCli(topo, 'R1', ['ip route ' + x.l2.net + ' 255.255.255.0 ' + x.w2]);
      tCli(topo, 'R2', ['ip route ' + x.l1.net + ' 255.255.255.0 ' + x.w1]);
      Object.assign(topo.devices.PC2.cfg, { ip: null, mask: null, gateway: null });
    },
    checks: [CHK.dhcpPool('R1', pool, x.l2.net, x.l2.mask, x.gw2), CHK.helper('R2', x.r2lan, x.w1), CHK.dhcpClient('PC2', x.l2, 2), CHK.ping('PC2', 'PC1', x.pc1)],
    solution: { cli: { R1: ['ip dhcp excluded-address ' + x.gw2, 'ip dhcp pool ' + pool, 'network ' + x.l2.net + ' ' + x.l2.mask, 'default-router ' + x.gw2], R2: ['interface ' + x.r2lan, 'ip helper-address ' + x.w1] }, pc: { PC2: { dhcp: true } } },
    hints: [T('DHCP DISCOVER is a broadcast — routers do not forward it without ip helper-address.', 'DHCP DISCOVER — широковещательный, роутер не передаёт его без ip helper-address.', 'DHCP DISCOVER הוא broadcast — נתבים לא מעבירים אותו בלי ip helper-address.')],
  };
});

// Три роутера в цепочку с LAN на каждом конце (интерфейсы настроены)
function threeChain(rng, family) {
  const sp = subnetPool(rng);
  const l1 = sp.lan(family), l2 = sp.lan(family), l3 = sp.lan(family);
  const w12 = { net: '10.0.' + rng.int(0, 120) * 2 + '.0', len: 30, mask: '255.255.255.252' };
  const w23 = { net: intToIp(ipToInt(w12.net) + 256), len: 30, mask: '255.255.255.252' };
  const m = ['2911', '2911', '2911'].map(() => rng.pick(['2911', '4331']));
  const R = [
    { id: 'R1', m: m[0], lan: gi(m[0], 0), a: gi(m[0], 1) },
    { id: 'R2', m: m[1], lan: gi(m[1], 0), a: gi(m[1], 1), b: gi(m[1], 2) },
    { id: 'R3', m: m[2], lan: gi(m[2], 0), a: gi(m[2], 1) },
  ];
  const ip = { r1lan: host(l1, 1), r2lan: host(l2, 1), r3lan: host(l3, 1), r1a: host(w12, 1), r2a: host(w12, 2), r2b: host(w23, 1), r3a: host(w23, 2),
    pc1: host(l1, 10), pc2: host(l2, 10), pc3: host(l3, 10) };
  const x = { l1, l2, l3, w12, w23, R, ip };
  x.build = (topo) => {
    tAdd(topo, m[0], 'R1', 180, 150); tAdd(topo, m[1], 'R2', 450, 110); tAdd(topo, m[2], 'R3', 720, 150);
    tAdd(topo, 'PC', 'PC1', 180, 400); tAdd(topo, 'PC', 'PC2', 450, 400); tAdd(topo, 'PC', 'PC3', 720, 400);
    tAdd(topo, '2960', 'S2', 450, 260);
    tLink(topo, 'PC1', 'FastEthernet0', 'R1', R[0].lan); tLink(topo, 'PC3', 'FastEthernet0', 'R3', R[2].lan);
    tLink(topo, 'PC2', 'FastEthernet0', 'S2', fa(1)); tLink(topo, 'S2', 'GigabitEthernet0/1', 'R2', R[1].lan);
    tLink(topo, 'R1', R[0].a, 'R2', R[1].a); tLink(topo, 'R2', R[1].b, 'R3', R[2].a);
    tHostname(topo, ['R1', 'R2', 'R3', 'S2']);
    tCli(topo, 'R1', ['interface ' + R[0].lan, 'ip address ' + ip.r1lan + ' ' + l1.mask, 'no shutdown', 'interface ' + R[0].a, 'ip address ' + ip.r1a + ' ' + w12.mask, 'no shutdown']);
    tCli(topo, 'R2', ['interface ' + R[1].lan, 'ip address ' + ip.r2lan + ' ' + l2.mask, 'no shutdown', 'interface ' + R[1].a, 'ip address ' + ip.r2a + ' ' + w12.mask, 'no shutdown', 'interface ' + R[1].b, 'ip address ' + ip.r2b + ' ' + w23.mask, 'no shutdown']);
    tCli(topo, 'R3', ['interface ' + R[2].lan, 'ip address ' + ip.r3lan + ' ' + l3.mask, 'no shutdown', 'interface ' + R[2].a, 'ip address ' + ip.r3a + ' ' + w23.mask, 'no shutdown']);
    tPc(topo, 'PC1', ip.pc1, l1.mask, ip.r1lan); tPc(topo, 'PC2', ip.pc2, l2.mask, ip.r2lan); tPc(topo, 'PC3', ip.pc3, l3.mask, ip.r3lan);
  };
  x.table = [rowIf('R1', R[0].lan, ip.r1lan, l1.mask), rowIf('R1', R[0].a, ip.r1a, w12.mask), rowIf('R2', R[1].lan, ip.r2lan, l2.mask), rowIf('R2', R[1].a, ip.r2a, w12.mask),
    rowIf('R2', R[1].b, ip.r2b, w23.mask), rowIf('R3', R[2].a, ip.r3a, w23.mask), rowIf('R3', R[2].lan, ip.r3lan, l3.mask),
    rowPc('PC1', ip.pc1, l1.mask, ip.r1lan), rowPc('PC2', ip.pc2, l2.mask, ip.r2lan), rowPc('PC3', ip.pc3, l3.mask, ip.r3lan)];
  return x;
}

// --- 12. RIPv2 ---
taskDef('rip', 'rip', 2, (rng) => {
  const x = threeChain(rng, 0);
  const major = (n) => intToIp(netOf(ipToInt(n.net), classfulLen(ipToInt(n.net))));
  const nets = { R1: [major(x.l1), '10.0.0.0'], R2: [major(x.l2), '10.0.0.0'], R3: [major(x.l3), '10.0.0.0'] };
  const passive = rng.chance(0.6);
  const ripCmds = (id, lanIf) => ['router rip', 'version 2', 'no auto-summary', ...nets[id].map((n) => 'network ' + n), ...(passive ? ['passive-interface ' + lanIf] : [])];
  const netList = [...new Set(Object.values(nets).flat())].join(', ');
  return {
    title: T('Dynamic routing with RIPv2', 'Динамическая маршрутизация RIPv2', 'ניתוב דינמי עם RIPv2'),
    intro: T('Three routers are connected in a chain and all interfaces are configured. Instead of static routes, let the routers learn the networks with RIP version 2.',
      'Три роутера соединены цепочкой, все интерфейсы настроены. Вместо статики пусть роутеры сами узнают сети по RIP версии 2.',
      'שלושה נתבים מחוברים בשרשרת וכל הממשקים מוגדרים. במקום נתיבים סטטיים, הנתבים ילמדו את הרשתות בעזרת RIP גרסה 2.'),
    steps: [
      T('On every router: "router rip", "version 2", "no auto-summary".', 'На каждом роутере: "router rip", "version 2", "no auto-summary".', 'בכל נתב: ‏"router rip", ‏"version 2", ‏"no auto-summary".'),
      T('Advertise all directly connected networks with "network" (classful: ' + netList + ').', 'Анонсируйте все подключённые сети командой "network" (классовые: ' + netList + ').',
        'לפרסם את כל הרשתות המחוברות עם "network" (לפי מחלקה: ' + netList + ').'),
      ...(passive ? [T('Make the LAN interfaces passive (passive-interface) — no RIP updates towards PCs.', 'Сделайте LAN-интерфейсы пассивными (passive-interface) — без RIP-обновлений в сторону ПК.',
        'להגדיר את ממשקי ה-LAN כפסיביים (passive-interface) — בלי עדכוני RIP לכיוון המחשבים.')] : []),
      T('Verify: "show ip route" shows R routes; PC1 pings PC3.', 'Проверка: в "show ip route" есть маршруты R; PC1 пингует PC3.', 'בדיקה: ב-"show ip route" יש נתיבי R; ‏PC1 עושה ping ל-PC3.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.ripV2('R1'), CHK.ripV2('R2'), CHK.ripV2('R3'),
      CHK.route('R1', x.l3.net, 24, 'R'), CHK.route('R3', x.l1.net, 24, 'R'), CHK.route('R1', x.l2.net, 24, 'R'),
      ...(passive ? [CHK.passive('R1', 'rip', x.R[0].lan), CHK.passive('R2', 'rip', x.R[1].lan), CHK.passive('R3', 'rip', x.R[2].lan)] : []),
      CHK.ping('PC1', 'PC3', x.ip.pc3), CHK.ping('PC2', 'PC1', x.ip.pc1)],
    solution: { cli: { R1: ripCmds('R1', x.R[0].lan), R2: ripCmds('R2', x.R[1].lan), R3: ripCmds('R3', x.R[2].lan) } },
    hints: [T('RIP "network" takes the classful network: 192.168.5.0, 172.16.0.0, 10.0.0.0.', 'RIP-команда "network" принимает классовую сеть: 192.168.5.0, 172.16.0.0, 10.0.0.0.', 'הפקודה "network" של RIP מקבלת רשת לפי מחלקה: 192.168.5.0, ‏172.16.0.0, ‏10.0.0.0.'),
      T('RIPv1 and v2 do not understand each other when v2 is forced.', 'При принудительной v2 роутер не принимает обновления v1.', 'כשמגדירים version 2, הנתב לא מקבל עדכוני RIPv1.')],
  };
});

// --- 13. OSPF ---
taskDef('ospf', 'ospf', 3, (rng) => {
  const x = threeChain(rng);
  const pid = rng.pick([1, 10, 100, 7]);
  const rids = { R1: '1.1.1.1', R2: '2.2.2.2', R3: '3.3.3.3' };
  if (rng.chance(0.5)) { rids.R1 = '11.11.11.11'; rids.R2 = '22.22.22.22'; rids.R3 = '33.33.33.33'; }
  const passive = rng.chance(0.6);
  const st = (n) => 'network ' + n.net + ' ' + wildcardOf(n.len) + ' area 0';
  const cmds = {
    R1: ['router ospf ' + pid, 'router-id ' + rids.R1, st(x.l1), st(x.w12), ...(passive ? ['passive-interface ' + x.R[0].lan] : [])],
    R2: ['router ospf ' + pid, 'router-id ' + rids.R2, st(x.l2), st(x.w12), st(x.w23), ...(passive ? ['passive-interface ' + x.R[1].lan] : [])],
    R3: ['router ospf ' + pid, 'router-id ' + rids.R3, st(x.l3), st(x.w23), ...(passive ? ['passive-interface ' + x.R[2].lan] : [])],
  };
  const ridList = 'R1 ' + rids.R1 + ', R2 ' + rids.R2 + ', R3 ' + rids.R3;
  return {
    title: T('Single-area OSPF', 'OSPF в одной области', 'OSPF באזור אחד'),
    intro: T('Configure OSPF process ' + pid + ' in area 0 on all three routers so every network is reachable. Use explicit router IDs.',
      'Настройте OSPF процесс ' + pid + ' в области 0 на всех трёх роутерах, чтобы все сети были доступны. Задайте router-id явно.',
      'יש להגדיר תהליך OSPF ' + pid + ' באזור 0 בכל שלושת הנתבים, כך שכל הרשתות יהיו נגישות. ה-router ID נקבע ידנית.'),
    steps: [
      T('"router ospf ' + pid + '" and router-id: ' + ridList + '.', '"router ospf ' + pid + '" и router-id: ' + ridList + '.', '"router ospf ' + pid + '" ו-router-id: ' + ridList + '.'),
      T('Add "network <address> <wildcard> area 0" for every connected network.', 'Добавьте "network <адрес> <wildcard> area 0" для каждой подключённой сети.', 'להוסיף "network <כתובת> <wildcard> area 0" לכל רשת מחוברת.'),
      ...(passive ? [T('Make LAN interfaces passive.', 'Сделайте LAN-интерфейсы пассивными.', 'להגדיר את ממשקי ה-LAN כפסיביים.')] : []),
      T('Verify: "show ip ospf neighbor" shows FULL neighbors; PC1 pings PC3.', 'Проверка: "show ip ospf neighbor" показывает соседей FULL; PC1 пингует PC3.', 'בדיקה: ‏"show ip ospf neighbor" מראה שכנים במצב FULL; ‏PC1 עושה ping ל-PC3.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.routerId('R1', rids.R1), CHK.routerId('R2', rids.R2), CHK.routerId('R3', rids.R3), CHK.ospfNbrs('R2', 2),
      CHK.route('R1', x.l3.net, 24, 'O'), CHK.route('R3', x.l1.net, 24, 'O'),
      ...(passive ? [CHK.passive('R1', 'ospf', x.R[0].lan), CHK.passive('R3', 'ospf', x.R[2].lan)] : []),
      CHK.ping('PC1', 'PC3', x.ip.pc3), CHK.ping('PC2', 'PC1', x.ip.pc1)],
    solution: { cli: cmds },
    hints: [T('Wildcard = inverted mask: /24 → 0.0.0.255, /30 → 0.0.0.3.', 'Wildcard — это инвертированная маска: /24 → 0.0.0.255, /30 → 0.0.0.3.', 'Wildcard היא מסכה הפוכה: ‎/24 → 0.0.0.255, ‏‎/30 → 0.0.0.3.'),
      T('Neighbors must be in the same area and subnet.', 'Соседи должны быть в одной области и одной подсети.', 'שכנים חייבים להיות באותו אזור ובאותה תת-רשת.')],
  };
});

// --- 14. Базовая настройка устройства ---
taskDef('basic-config', 'device', 1, (rng) => {
  const isR = rng.chance(0.5);
  const model = isR ? rng.pick(ROUTER_MODELS) : '2960';
  const id = isR ? 'R1' : 'S1';
  const hn = rng.pick(isR ? ['HQ-R1', 'Branch-R', 'Edge1', 'CORE-RTR', 'R-Office'] : ['HQ-SW1', 'Floor2-SW', 'Access1', 'SW-Lab', 'S-Office']);
  const [pCon, pEn, pVty] = rng.shuffle(PASSWORDS).slice(0, 3);
  const motd = rng.pick(['Authorized access only!', 'Unauthorized access is prohibited', 'Property of NetLab', 'Restricted area']);
  return {
    title: T('Initial device configuration', 'Начальная настройка устройства', 'הגדרה ראשונית של התקן'),
    intro: T('A brand-new ' + (isR ? 'router' : 'switch') + ' must get a name, passwords and a warning banner. Open the CLI tab of ' + id + '.',
      'Новому ' + (isR ? 'роутеру' : 'свитчу') + ' нужно задать имя, пароли и предупреждающий баннер. Откройте вкладку CLI устройства ' + id + '.',
      (isR ? 'נתב חדש' : 'מתג חדש') + ' צריך לקבל שם, סיסמאות ובאנר אזהרה. פותחים את לשונית ה-CLI של ' + id + '.'),
    steps: [
      T('Set the hostname to ' + hn + '.', 'Задайте имя (hostname) ' + hn + '.', 'לקבוע את שם המארח (hostname) ל-' + hn + '.'),
      T('Disable DNS lookup of mistyped commands: "no ip domain-lookup".', 'Отключите DNS-поиск ошибочных команд: "no ip domain-lookup".', 'לבטל חיפוש DNS של פקודות שגויות: "no ip domain-lookup".'),
      T('Privileged mode secret: ' + pEn + '.', 'Пароль привилегированного режима (enable secret): ' + pEn + '.', 'סיסמה למצב המורשה (enable secret): ' + pEn + '.'),
      T('Console password ' + pCon + ' and VTY password ' + pVty + ' — both with "login".', 'Пароль консоли ' + pCon + ' и VTY ' + pVty + ' — оба с "login".', 'סיסמת קונסולה ' + pCon + ' וסיסמת VTY ‏' + pVty + ' — שתיהן עם "login".'),
      T('Encrypt plain-text passwords and set the MOTD banner: ' + motd, 'Зашифруйте открытые пароли и задайте баннер MOTD: ' + motd, 'להצפין סיסמאות גלויות ולהגדיר באנר MOTD: ' + motd),
      T('Save the configuration: "copy running-config startup-config".', 'Сохраните конфигурацию: "copy running-config startup-config".', 'לשמור את התצורה: "copy running-config startup-config".'),
    ],
    table: [],
    build(topo) { tAdd(topo, model, id, 450, 220); },
    checks: [CHK.hostname(id, hn), CHK.noLookup(id), CHK.enableSecret(id, pEn), CHK.linePw(id, 'con', pCon), CHK.linePw(id, 'vty', pVty), CHK.encryption(id), CHK.banner(id, motd), CHK.saved(id)],
    solution: {
      cli: { [id]: ['hostname ' + hn, 'no ip domain-lookup', 'enable secret ' + pEn, 'line console 0', 'password ' + pCon, 'login', 'line vty 0 4', 'password ' + pVty, 'login', 'exit', 'service password-encryption', 'banner motd #' + motd + '#'] },
      exec: { [id]: ['copy running-config startup-config'] },
    },
    hints: [T('After "enable secret" the CLI will ask for the password when you type "enable".', 'После "enable secret" при вводе "enable" CLI будет спрашивать пароль.', 'אחרי "enable secret" ה-CLI יבקש את הסיסמה כשמקלידים "enable".')],
  };
});

// --- 15. Управление свитчем (SVI) ---
taskDef('svi', 'device', 1, (rng) => {
  const sn = subnetPool(rng).lan();
  const swIp = host(sn, rng.int(2, 9)), gw = host(sn, 1), pc = host(sn, rng.int(20, 99));
  return {
    title: T('Remote management address for a switch', 'Адрес управления для свитча', 'כתובת ניהול מרחוק למתג'),
    intro: T('A switch works without an IP, but to manage it remotely it needs an address on interface VLAN 1.', 'Свитч работает без IP, но для удалённого управления ему нужен адрес на интерфейсе VLAN 1.',
      'מתג עובד גם בלי IP, אבל כדי לנהל אותו מרחוק הוא צריך כתובת בממשק VLAN 1.'),
    steps: [
      T('On S1: "interface vlan 1", IP ' + swIp + ' ' + sn.mask + ', "no shutdown".', 'На S1: "interface vlan 1", IP ' + swIp + ' ' + sn.mask + ', "no shutdown".', 'ב-S1: ‏"interface vlan 1", כתובת IP ‏' + swIp + ' ' + sn.mask + ', ‏"no shutdown".'),
      T('Set the switch default gateway ' + gw + ' (ip default-gateway).', 'Задайте свитчу шлюз по умолчанию ' + gw + ' (ip default-gateway).', 'לקבוע למתג שער ברירת מחדל ' + gw + ' (ip default-gateway).'),
      T('Connect PC1 to S1 Fa0/5, configure it and ping the switch.', 'Подключите PC1 к S1 Fa0/5, настройте его и пропингуйте свитч.', 'לחבר את PC1 ל-Fa0/5 של S1, להגדיר אותו ולעשות ping למתג.'),
    ],
    table: [rowIf('S1', 'Vlan1', swIp, sn.mask, gw), rowPc('PC1', pc, sn.mask, gw)],
    build(topo) { tAdd(topo, '2960', 'S1', 450, 180); tAdd(topo, 'PC', 'PC1', 450, 400); tHostname(topo, ['S1']); },
    checks: [CHK.svi('S1', swIp, sn.mask), CHK.swGateway('S1', gw), CHK.link('PC1', 'FastEthernet0', 'S1', fa(5)), CHK.pc('PC1', pc, sn.mask, gw), CHK.ping('PC1', 'S1', swIp)],
    solution: { links: [['PC1', 'FastEthernet0', 'S1', fa(5)]], cli: { S1: ['interface vlan 1', 'ip address ' + swIp + ' ' + sn.mask, 'no shutdown', 'exit', 'ip default-gateway ' + gw] }, pc: { PC1: { ip: pc, mask: sn.mask, gw } } },
    hints: [T('VLAN 1 interface is shut down by default.', 'Интерфейс VLAN 1 по умолчанию выключен.', 'ממשק VLAN 1 כבוי כברירת מחדל.')],
  };
});

// --- 16. SSH ---
taskDef('ssh', 'device', 3, (rng) => {
  const model = rng.pick(ROUTER_MODELS);
  const hn = rng.pick(['R-SSH', 'EdgeRouter', 'HQ-R1', 'SecureR']);
  const dom = rng.pick(['netlab.local', 'ccna.lab', 'office.net', 'example.com']);
  const user = rng.pick(['admin', 'netadmin', 'student', 'operator']);
  const pw = rng.pick(PASSWORDS);
  return {
    title: T('Secure remote access with SSH', 'Безопасный удалённый доступ по SSH', 'גישה מרחוק מאובטחת עם SSH'),
    intro: T('Telnet sends passwords in clear text. Configure R1 so that remote management is possible only over SSH with a local user account.',
      'Telnet передаёт пароли открытым текстом. Настройте R1 так, чтобы удалённое управление было возможно только по SSH с локальной учётной записью.',
      'Telnet שולח סיסמאות כטקסט גלוי. יש להגדיר את R1 כך שאפשר יהיה לנהל אותו מרחוק רק דרך SSH עם משתמש מקומי.'),
    steps: [
      T('Hostname ' + hn + ', domain name ' + dom + '.', 'Имя ' + hn + ', домен ' + dom + '.', 'שם מארח ' + hn + ', שם דומיין ' + dom + '.'),
      T('Create user ' + user + ' with secret ' + pw + '.', 'Создайте пользователя ' + user + ' с паролем (secret) ' + pw + '.', 'ליצור משתמש ' + user + ' עם סיסמה (secret) ‏' + pw + '.'),
      T('Generate RSA keys with a 1024-bit modulus: "crypto key generate rsa".', 'Сгенерируйте RSA-ключи длиной 1024 бита: "crypto key generate rsa".', 'ליצור מפתחות RSA באורך 1024 סיביות: "crypto key generate rsa".'),
      T('VTY lines 0–4: "login local" and "transport input ssh".', 'Линии VTY 0–4: "login local" и "transport input ssh".', 'קווי VTY ‏0–4: ‏"login local" ו-"transport input ssh".'),
    ],
    table: [],
    build(topo) { tAdd(topo, model, 'R1', 450, 220); },
    checks: [CHK.hostname('R1', hn), CHK.ssh('R1', user, dom)],
    solution: { cli: { R1: ['hostname ' + hn, 'ip domain-name ' + dom, 'username ' + user + ' secret ' + pw, 'crypto key generate rsa general-keys modulus 1024', 'ip ssh version 2', 'line vty 0 4', 'login local', 'transport input ssh'] } },
    hints: [T('RSA keys need a hostname other than "Router" and a domain name.', 'Для RSA-ключей нужно имя, отличное от "Router", и доменное имя.', 'מפתחות RSA דורשים שם מארח שונה מ-"Router" ושם דומיין.')],
  };
});

// ================== ПОИСК НЕИСПРАВНОСТЕЙ ==================
// Сначала строится правильная сеть, затем вносятся 1–2 поломки.

taskDef('ts-lan', 'trouble', 2, (rng) => {
  const base = TASK_TEMPLATES.find((t) => t.id === 'router-2lan').gen(rng);
  const sol = base.solution;
  const r0 = sol.links[0][1], r1 = sol.links[1][1];
  const faults = rng.shuffle([
    { id: 'gw', apply: (t) => { t.devices.PC1.cfg.gateway = intToIp(ipToInt(sol.pc.PC1.gw) + 1); }, fix: T('PC1 default gateway was wrong.', 'У PC1 был неправильный шлюз.', 'שער ברירת המחדל של PC1 היה שגוי.') },
    { id: 'mask', apply: (t) => { t.devices.PC2.cfg.mask = '255.255.0.0'; }, fix: T('PC2 subnet mask was wrong.', 'У PC2 была неверная маска.', 'מסכת הרשת של PC2 הייתה שגויה.') },
    { id: 'shut', apply: (t) => tCli(t, 'R1', ['interface ' + r1, 'shutdown']), fix: T('R1 ' + sh(r1) + ' was shut down.', 'R1 ' + sh(r1) + ' был выключен (shutdown).', sh(r1) + ' של R1 היה כבוי (shutdown).') },
    { id: 'ip', apply: (t) => { t.devices.R1.cfg.interfaces[r0].ip = intToIp(ipToInt(sol.pc.PC1.gw) ^ 0x00000100); }, fix: T('R1 ' + sh(r0) + ' had an address from the wrong subnet.', 'На R1 ' + sh(r0) + ' был адрес из чужой подсети.', 'ב-' + sh(r0) + ' של R1 הייתה כתובת מתת-רשת אחרת.') },
    { id: 'cable', apply: (t) => { const l = findLinkBetween(t, 'R1', r0, 'S1', 'GigabitEthernet0/1'); removeLink(t, l.id); tLink(t, 'R1', r0, 'S1', 'GigabitEthernet0/1', 'cross'); }, fix: T('R1–S1 used a cross-over cable.', 'Между R1 и S1 был перекрёстный кабель.', 'בין R1 ל-S1 היה כבל מוצלב.') },
  ]).slice(0, rng.int(1, 2));
  const fixCli = [];
  if (faults.some((f) => f.id === 'shut')) fixCli.push('interface ' + r1, 'no shutdown');
  if (faults.some((f) => f.id === 'ip')) fixCli.push('interface ' + r0, 'ip address ' + sol.pc.PC1.gw + ' ' + sol.pc.PC1.mask);
  const two = faults.length > 1;
  return {
    title: T('Troubleshoot: PC1 cannot reach PC2', 'Неисправность: PC1 не видит PC2', 'איתור תקלות: PC1 לא מגיע ל-PC2'),
    intro: T('This network used to work. Now PC1 cannot ping PC2. Find and fix ' + (two ? 'the ' + faults.length + ' problems' : 'the problem') + ' without changing the addressing plan.',
      'Эта сеть раньше работала. Теперь PC1 не пингует PC2. Найдите и исправьте ' + (two ? faults.length + ' неисправности' : 'неисправность') + ', не меняя план адресации.',
      'הרשת הזו עבדה בעבר. עכשיו PC1 לא מצליח לעשות ping ל-PC2. יש למצוא ולתקן את ' + (two ? 'שתי התקלות' : 'התקלה') + ' בלי לשנות את תוכנית הכתובות.'),
    steps: [T('Use ping, ipconfig, "show ip interface brief" and the link lights to locate the fault.', 'Используйте ping, ipconfig, "show ip interface brief" и индикаторы линков, чтобы найти поломку.',
      'משתמשים ב-ping, ‏ipconfig, ‏"show ip interface brief" ובנוריות הקישורים כדי למצוא את התקלה.'),
      T('Fix it and verify: PC1 pings PC2.', 'Исправьте и проверьте: PC1 пингует PC2.', 'לתקן ולבדוק: PC1 עושה ping ל-PC2.')],
    table: base.table,
    build(topo) {
      base.build(topo);
      for (const [a, ap, b, bp] of sol.links) tLink(topo, a, ap, b, bp);
      tCli(topo, 'R1', sol.cli.R1);
      for (const [p, v] of Object.entries(sol.pc)) tPc(topo, p, v.ip, v.mask, v.gw);
      for (const f of faults) f.apply(topo);
    },
    checks: [CHK.ping('PC1', 'PC2', sol.pc.PC2.ip), CHK.pc('PC1', sol.pc.PC1.ip, sol.pc.PC1.mask, sol.pc.PC1.gw), CHK.pc('PC2', sol.pc.PC2.ip, sol.pc.PC2.mask, sol.pc.PC2.gw)],
    solution: {
      relink: faults.some((f) => f.id === 'cable') ? [['R1', r0, 'S1', 'GigabitEthernet0/1']] : [],
      cli: fixCli.length ? { R1: fixCli } : {},
      pc: { PC1: sol.pc.PC1, PC2: sol.pc.PC2 },
    },
    faults: faults.map((f) => f.fix),
    hints: [T('Start from PC1: can it ping its own gateway?', 'Начните с PC1: пингуется ли его собственный шлюз?', 'מתחילים מ-PC1: האם הוא מגיע ב-ping לשער שלו?'), ...faults.map((f) => f.fix)],
  };
});

taskDef('ts-vlan', 'trouble', 3, (rng) => {
  const base = TASK_TEMPLATES.find((t) => t.id === 'vlan-trunk').gen(rng);
  const sol = base.solution;
  const swCmds = sol.cli.S1;
  const accessA = swCmds[swCmds.indexOf('switchport mode access') - 1].replace('interface ', '');
  const vlanA = Number(swCmds[swCmds.indexOf('switchport mode access') + 1].split(' ').pop());
  const faults = rng.shuffle([
    { id: 'wrongvlan', apply: (t) => tCli(t, 'S2', ['interface ' + accessA, 'switchport access vlan 1']), fix: T('S2 ' + sh(accessA) + ' was in VLAN 1.', 'S2 ' + sh(accessA) + ' был в VLAN 1.', sh(accessA) + ' של S2 היה ב-VLAN 1.'), cli: { S2: ['interface ' + accessA, 'switchport access vlan ' + vlanA] } },
    { id: 'notrunk', apply: (t) => tCli(t, 'S1', ['interface GigabitEthernet0/1', 'switchport mode access']), fix: T('S1 Gi0/1 was an access port, not a trunk.', 'S1 Gi0/1 был access-портом, а не trunk.', 'Gi0/1 של S1 היה פורט access ולא trunk.'), cli: { S1: ['interface GigabitEthernet0/1', 'switchport mode trunk'] } },
    { id: 'pruned', apply: (t) => tCli(t, 'S2', ['interface GigabitEthernet0/1', 'switchport trunk allowed vlan 1']), fix: T('S2 trunk did not allow the VLANs.', 'На trunk S2 не были разрешены нужные VLAN.', 'ב-trunk של S2 לא היו מותרים ה-VLAN הנדרשים.'), cli: { S2: ['interface GigabitEthernet0/1', 'switchport trunk allowed vlan all'] } },
    { id: 'novlan', apply: (t) => tCli(t, 'S2', ['no vlan ' + vlanA]), fix: T('VLAN ' + vlanA + ' was missing on S2.', 'На S2 не было VLAN ' + vlanA + '.', 'ב-S2 היה חסר VLAN ' + vlanA + '.'), cli: { S2: ['vlan ' + vlanA, 'name ' + swCmds[swCmds.indexOf('vlan ' + vlanA) + 1].slice(5)] } },
  ]).slice(0, rng.int(1, 2));
  const cli = {};
  for (const f of faults) for (const [d, c] of Object.entries(f.cli)) cli[d] = (cli[d] || []).concat(c);
  return {
    title: T('Troubleshoot: VLAN traffic does not cross the switches', 'Неисправность: трафик VLAN не проходит между свитчами', 'איתור תקלות: תעבורת VLAN לא עוברת בין המתגים'),
    intro: T('PCs of the same VLAN on different floors cannot reach each other any more. Find and fix the misconfiguration.',
      'ПК одного VLAN на разных этажах больше не видят друг друга. Найдите и исправьте ошибку в настройке.',
      'מחשבים מאותו VLAN בקומות שונות כבר לא מגיעים זה לזה. יש למצוא ולתקן את שגיאת ההגדרה.'),
    steps: [T('Useful commands: show vlan brief, show interfaces trunk, show interfaces <port> switchport.', 'Полезные команды: show vlan brief, show interfaces trunk, show interfaces <порт> switchport.',
      'פקודות שימושיות: show vlan brief, ‏show interfaces trunk, ‏show interfaces <פורט> switchport.'),
      T('Verify: PC-A1 pings PC-A2 and PC-B1 pings PC-B2.', 'Проверка: PC-A1 пингует PC-A2, а PC-B1 — PC-B2.', 'בדיקה: PC-A1 עושה ping ל-PC-A2, ו-PC-B1 ל-PC-B2.')],
    table: base.table,
    build(topo) {
      base.build(topo);
      tLink(topo, 'S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
      tCli(topo, 'S1', sol.cli.S1); tCli(topo, 'S2', sol.cli.S2);
      for (const f of faults) f.apply(topo);
    },
    checks: base.checks.filter((c) => c.label.en.includes('ping')),
    solution: { cli },
    faults: faults.map((f) => f.fix),
    hints: [T('Compare the two switches: VLAN list, access ports, trunk.', 'Сравните свитчи: список VLAN, access-порты, trunk.', 'משווים בין שני המתגים: רשימת VLAN, פורטי access, ‏trunk.'), ...faults.map((f) => f.fix)],
  };
});

taskDef('ts-static', 'trouble', 3, (rng) => {
  const base = TASK_TEMPLATES.find((t) => t.id === 'static-3r').gen(rng);
  const sol = base.solution.cli;
  const wrongNh = (cmd) => cmd.replace(/(\d+)$/, (m) => String(Number(m) + 1 > 254 ? 1 : Number(m) + 1));
  const faults = rng.shuffle([
    { id: 'missing', apply: (t) => tCli(t, 'R2', ['no ' + sol.R2[1]]), fix: T('R2 had no route to the R3 LAN.', 'У R2 не было маршрута в сеть R3.', 'ל-R2 לא היה נתיב לרשת של R3.'), cli: { R2: [sol.R2[1]] } },
    { id: 'wrongnh', apply: (t) => tCli(t, 'R1', ['no ' + sol.R1[0], wrongNh(sol.R1[0])]), fix: T('R1 default route pointed to a wrong next hop.', 'Маршрут по умолчанию на R1 указывал на неверный next hop.', 'נתיב ברירת המחדל ב-R1 הצביע על next hop שגוי.'), cli: { R1: ['no ' + wrongNh(sol.R1[0]), sol.R1[0]] } },
    { id: 'nodefault', apply: (t) => tCli(t, 'R3', ['no ' + sol.R3[0]]), fix: T('R3 had no default route.', 'У R3 не было маршрута по умолчанию.', 'ל-R3 לא היה נתיב ברירת מחדל.'), cli: { R3: [sol.R3[0]] } },
  ]).slice(0, rng.int(1, 2));
  const cli = {};
  for (const f of faults) for (const [d, c] of Object.entries(f.cli)) cli[d] = (cli[d] || []).concat(c);
  return {
    title: T('Troubleshoot: static routing', 'Неисправность: статическая маршрутизация', 'איתור תקלות: ניתוב סטטי'),
    intro: T('The three-router network is configured, but PC1 and PC3 cannot communicate. Inspect the routing tables and fix the routes.',
      'Сеть из трёх роутеров настроена, но PC1 и PC3 не связываются. Изучите таблицы маршрутизации и исправьте маршруты.',
      'רשת שלושת הנתבים מוגדרת, אבל PC1 ו-PC3 לא מתקשרים. יש לבדוק את טבלאות הניתוב ולתקן את הנתיבים.'),
    steps: [T('Use "show ip route" on every router and "tracert" from the PCs.', 'Используйте "show ip route" на каждом роутере и "tracert" с ПК.', 'משתמשים ב-"show ip route" בכל נתב וב-"tracert" מהמחשבים.'),
      T('Verify: PC1 ↔ PC3.', 'Проверка: PC1 ↔ PC3.', 'בדיקה: PC1 ↔ PC3.')],
    table: base.table,
    build(topo) { base.build(topo); for (const [d, c] of Object.entries(sol)) tCli(topo, d, c); for (const f of faults) f.apply(topo); },
    checks: base.checks.filter((c) => c.label.en.includes('ping')),
    solution: { cli },
    faults: faults.map((f) => f.fix),
    hints: [T('"Destination host unreachable" names the router that has no route.', '"Destination host unreachable" показывает роутер, у которого нет маршрута.', '"Destination host unreachable" מציין את הנתב שאין לו נתיב.'), ...faults.map((f) => f.fix)],
  };
});

taskDef('ts-dhcp', 'trouble', 2, (rng) => {
  const base = TASK_TEMPLATES.find((t) => t.id === 'dhcp-basic').gen(rng);
  const sol = base.solution.cli.R1;
  const poolCmd = sol.find((c) => c.startsWith('ip dhcp pool'));
  const netCmd = sol.find((c) => c.startsWith('network'));
  const drCmd = sol.find((c) => c.startsWith('default-router'));
  const gwIp = drCmd.split(' ')[1];
  const [netAddr, mask] = netCmd.split(' ').slice(1);
  const wrongNet = intToIp(ipToInt(netAddr) + 256);
  const faults = rng.shuffle([
    { id: 'net', apply: (t) => tCli(t, 'R1', [poolCmd, 'network ' + wrongNet + ' ' + mask]), fix: T('The pool network was wrong.', 'В пуле была указана неверная сеть.', 'רשת המאגר הייתה שגויה.'), cli: [poolCmd, netCmd] },
    { id: 'gw', apply: (t) => tCli(t, 'R1', [poolCmd, 'default-router ' + intToIp(ipToInt(gwIp) + 2)]), fix: T('default-router in the pool was wrong.', 'В пуле был неверный default-router.', 'ה-default-router במאגר היה שגוי.'), cli: [poolCmd, drCmd] },
    { id: 'excl', apply: (t) => tCli(t, 'R1', ['ip dhcp excluded-address ' + intToIp(ipToInt(netAddr) + 1) + ' ' + intToIp(ipToInt(netAddr) + 254)]), fix: T('All addresses were excluded — the pool was exhausted.', 'Были исключены все адреса — пул исчерпан.', 'כל הכתובות הוחרגו — המאגר התרוקן.'), cli: ['no ip dhcp excluded-address ' + intToIp(ipToInt(netAddr) + 1) + ' ' + intToIp(ipToInt(netAddr) + 254)] },
  ]).slice(0, 1);
  return {
    title: T('Troubleshoot: PCs get 169.254.x.x', 'Неисправность: ПК получают 169.254.x.x', 'איתור תקלות: מחשבים מקבלים 169.254.x.x'),
    intro: T('Users complain that they have no network. Their PCs use DHCP. Find out why and fix the DHCP server on R1.',
      'Пользователи жалуются, что у них нет сети. ПК получают адреса по DHCP. Выясните причину и исправьте DHCP-сервер на R1.',
      'המשתמשים מתלוננים שאין להם רשת. המחשבים מקבלים כתובות ב-DHCP. יש לברר למה ולתקן את שרת ה-DHCP ב-R1.'),
    steps: [T('Look at "show running-config | section dhcp" and "show ip dhcp binding".', 'Изучите "show running-config | section dhcp" и "show ip dhcp binding".', 'בודקים את "show running-config | section dhcp" ואת "show ip dhcp binding".'),
      T('After fixing, renew addresses on the PCs (DHCP button or "ipconfig /renew").', 'После исправления обновите адреса на ПК (кнопка DHCP или "ipconfig /renew").', 'אחרי התיקון מחדשים את הכתובות במחשבים (כפתור DHCP או "ipconfig /renew").')],
    table: base.table,
    build(topo) {
      base.build(topo);
      tCli(topo, 'R1', sol);
      for (const f of faults) f.apply(topo);
      for (const p of ['PC1', 'PC2', 'PC3']) { topo.devices[p].cfg.ipMode = 'dhcp'; pcDhcpRenew(topo, p); }
    },
    checks: [...base.checks.filter((c) => /DHCP|ping/i.test(c.label.en) && !c.label.en.includes('pool') && !c.label.en.includes('excluded')),
      { label: T('PCs received the correct default gateway (' + gwIp + ')', 'ПК получили правильный шлюз (' + gwIp + ')', 'המחשבים קיבלו את השער הנכון (' + gwIp + ')'),
        run(topo) {
          for (const p of ['PC1', 'PC2', 'PC3']) {
            const g = topo.devices[p].cfg.gateway;
            if (g !== gwIp) return { ok: false, hint: T(p + ' gateway: ' + (g || 'none'), p + ': шлюз ' + (g || 'нет'), p + ': שער ' + (g || 'אין')) };
          }
          return { ok: true };
        } }],
    solution: { cli: { R1: faults[0].cli }, pc: { PC1: { dhcp: true }, PC2: { dhcp: true }, PC3: { dhcp: true } } },
    faults: faults.map((f) => f.fix),
    hints: [T('APIPA 169.254.x.x means no DHCP server answered.', 'APIPA 169.254.x.x значит, что DHCP-сервер не ответил.', 'כתובת APIPA ‏169.254.x.x פירושה שאף שרת DHCP לא ענה.'), ...faults.map((f) => f.fix)],
  };
});

taskDef('ts-ospf', 'trouble', 3, (rng) => {
  const base = TASK_TEMPLATES.find((t) => t.id === 'ospf').gen(rng);
  const cmds = base.solution.cli;
  const r3w = cmds.R3.find((c) => c.startsWith('network') && c.includes('0.0.0.3'));
  const r2w = cmds.R2.filter((c) => c.startsWith('network') && c.includes('0.0.0.3'))[0];
  const routerCmd = cmds.R1[0];
  const faults = rng.shuffle([
    { id: 'area', apply: (t) => tCli(t, 'R3', [routerCmd, 'no ' + r3w, r3w.replace('area 0', 'area 1')]), fix: T('R3 had its WAN network in area 1.', 'На R3 WAN-сеть была в области 1.', 'ב-R3 רשת ה-WAN הייתה באזור 1.'), cli: { R3: [routerCmd, 'no ' + r3w.replace('area 0', 'area 1'), r3w] } },
    { id: 'passive', apply: (t) => tCli(t, 'R2', [routerCmd, 'passive-interface ' + base.table[3].iface]), fix: T('R2 had a passive interface towards R1.', 'На R2 интерфейс в сторону R1 был пассивным.', 'ב-R2 הממשק לכיוון R1 היה פסיבי.'), cli: { R2: [routerCmd, 'no passive-interface ' + base.table[3].iface] } },
    { id: 'nonet', apply: (t) => tCli(t, 'R2', [routerCmd, 'no ' + r2w]), fix: T('R2 did not advertise the link to R1.', 'R2 не анонсировал сеть в сторону R1.', 'R2 לא פרסם את הרשת לכיוון R1.'), cli: { R2: [routerCmd, r2w] } },
  ]).slice(0, 1);
  return {
    title: T('Troubleshoot: OSPF neighbors missing', 'Неисправность: нет OSPF-соседей', 'איתור תקלות: חסרים שכני OSPF'),
    intro: T('OSPF is configured on all routers, but some networks are missing from the routing tables. Fix the OSPF configuration.',
      'OSPF настроен на всех роутерах, но некоторых сетей нет в таблицах маршрутизации. Исправьте настройку OSPF.',
      'OSPF מוגדר בכל הנתבים, אבל חלק מהרשתות חסרות בטבלאות הניתוב. יש לתקן את הגדרות ה-OSPF.'),
    steps: [T('Check "show ip ospf neighbor", "show ip protocols" and "show ip route ospf".', 'Проверьте "show ip ospf neighbor", "show ip protocols" и "show ip route".', 'בודקים את "show ip ospf neighbor", ‏"show ip protocols" ו-"show ip route".'),
      T('Verify: all PCs ping each other.', 'Проверка: все ПК пингуют друг друга.', 'בדיקה: כל המחשבים עושים ping זה לזה.')],
    table: base.table,
    build(topo) { base.build(topo); for (const [d, c] of Object.entries(cmds)) tCli(topo, d, c); for (const f of faults) f.apply(topo); },
    checks: [CHK.ospfNbrs('R2', 2), ...base.checks.filter((c) => c.label.en.includes('ping'))],
    solution: { cli: faults[0].cli },
    faults: faults.map((f) => f.fix),
    hints: [T('Neighbors need: same subnet, same area, non-passive interfaces.', 'Соседям нужно: одна подсеть, одна область, непассивные интерфейсы.', 'שכנים צריכים: אותה תת-רשת, אותו אזור, ממשקים לא פסיביים.'), ...faults.map((f) => f.fix)],
  };
});

// ================== API ==================
function taskCreate(templateId, seed) {
  const tpl = TASK_TEMPLATES.find((t) => t.id === templateId);
  if (!tpl) return null;
  const spec = tpl.gen(makeRng(seed));
  return { templateId, seed, topic: tpl.topic, level: tpl.level, ...spec };
}

function taskList(topic, level) {
  return TASK_TEMPLATES.filter((t) => (!topic || topic === 'all' || t.topic === topic) && (!level || level === 'all' || t.level === Number(level)));
}

function taskRandom(topic, level, rnd = Math.random) {
  const list = taskList(topic, level);
  if (!list.length) return null;
  const tpl = list[Math.floor(rnd() * list.length)];
  return taskCreate(tpl.id, Math.floor(rnd() * 1e9) + 1);
}

function taskBuild(task) {
  const topo = newTopology();
  task.build(topo);
  touch(topo);
  netCommit(topo);
  return topo;
}

function taskCheck(topo, task) {
  const items = task.checks.map((c) => {
    let r;
    try { r = c.run(topo); } catch (e) { r = { ok: false, hint: T('Check error: ' + e.message, 'Ошибка проверки: ' + e.message, 'שגיאת בדיקה: ' + e.message) }; }
    return { label: c.label, ok: !!r.ok, hint: r.hint || null, check: c };
  });
  const passed = items.filter((i) => i.ok).length;
  return { items, passed, total: items.length, score: Math.round((passed * 100) / items.length), done: passed === items.length };
}

// Применить эталонное решение (для тестов и кнопки «Показать решение»): по шагам из coach.js
function taskApplySolution(topo, task) {
  for (const st of taskSolutionSteps(task)) st.apply(topo);
  netCommit(topo);
}

// Текст решения для показа пользователю
function taskSolutionText(task, topo) {
  const s = task.solution || {};
  const out = [];
  const links = (s.links || []).concat(s.relink || []);
  if (links.length) {
    out.push('# Cables / Кабели / כבלים');
    for (const [a, ap, b, bp] of links) out.push(a + ' ' + ap + '  ↔  ' + b + ' ' + bp + '   (' + (topo ? cableName(topo, a, b) : 'auto') + ')');
    out.push('');
  }
  for (const [d, cmds] of Object.entries(s.cli || {})) {
    out.push('# ' + d + ' — CLI');
    out.push('enable', 'configure terminal', ...cmds, 'end');
    if (s.exec && s.exec[d]) out.push(...s.exec[d]);
    out.push('');
  }
  for (const [d, v] of Object.entries(s.pc || {})) {
    out.push('# ' + d + ' — Desktop → IP Configuration');
    out.push(v.dhcp ? 'DHCP' : 'Static: IP ' + v.ip + '  Mask ' + v.mask + (v.gw ? '  Gateway ' + v.gw : ''));
    out.push('');
  }
  return out.join('\n').trim();
}
