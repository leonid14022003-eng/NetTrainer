'use strict';
// Задания: ACL (стандартные, расширенные, именованные, VTY), NAT / PAT, Wi-Fi (WRT300N, AccessPoint-PT)
// и большая лаба «сеть с нуля». Загружается после tasks_labs.js и до coach.js.

TASK_TOPICS.splice(TASK_TOPICS.findIndex((t) => t.id === 'device'), 0,
  { id: 'acl', title: T('Access lists (ACL)', 'Списки доступа (ACL)', 'רשימות גישה (ACL)') },
  { id: 'nat', title: T('NAT & PAT', 'NAT и PAT', 'NAT ו-PAT') },
  { id: 'wireless', title: T('Wi-Fi (WLAN)', 'Wi-Fi (WLAN)', 'Wi-Fi ‏(WLAN)') });
TASK_TOPICS.push({ id: 'scratch', title: T('Network from scratch', 'Сеть с нуля', 'רשת מאפס') });

const ACL_NAMES = ['WEB-ONLY', 'LAN-A-FILTER', 'ALLOW-WEB', 'SRV-ACCESS', 'BLOCK-SRV'];
const WIFI_PASS = ['cisco12345', 'Wireless123', 'NetLab2026', 'HomeNet789', 'Secure2024'];
const ACL_NUM_TXT = (n) => T('standard ACL ' + n, 'стандартный ACL ' + n, 'ACL סטנדרטי ' + n);

// ---------- Решение для Wi-Fi (solution.wifi): что нажать и как применить ----------
function wifiSolutionLines(w) {
  if (w.kind === 'home') return ['GUI → Setup → Basic Setup', 'Router IP: ' + w.lanIp + ' / ' + w.lanMask, 'DHCP Server: Enabled, Start IP Address .' + w.dhcpStart + ', Maximum number of Users ' + w.dhcpMax, 'Save Settings',
    'GUI → Wireless → Basic Wireless Settings → Network Name (SSID): ' + w.ssid + ' → Save Settings', 'GUI → Wireless → Wireless Security → WPA2 Personal, Passphrase: ' + w.pass + ' → Save Settings'];
  if (w.kind === 'ap') return ['Config → Port 1', 'SSID: ' + w.ssid, w.channel ? '2.4 GHz Channel: ' + w.channel : null, 'Authentication: ' + WIFI_SECURITY[w.security], w.security !== 'disabled' ? 'PSK Pass Phrase: ' + w.pass : null].filter(Boolean);
  return ['Physical → power OFF', 'MODULES → ' + w.module + ' → Install ' + w.module, 'Physical → power ON', 'Desktop → PC Wireless → Connect → ' + w.ssid + ' → Connect', w.security !== 'disabled' ? 'Pre-shared Key: ' + w.pass + ' → Connect' : null].filter(Boolean);
}
function wifiSolutionApply(topo, d, w) {
  const D = topo.devices[d];
  if (w.kind === 'home') {
    Object.assign(D.cfg.home, { dhcpOn: true, dhcpStart: w.dhcpStart, dhcpMax: w.dhcpMax, ssid: w.ssid, security: w.security, pass: w.pass });
    D.cfg.interfaces.LAN.ip = w.lanIp; D.cfg.interfaces.LAN.mask = w.lanMask;
    homeApply(D.cfg);
  } else if (w.kind === 'ap') {
    Object.assign(D.cfg.wifi, { ssid: w.ssid, security: w.security, pass: w.pass }, w.channel ? { channel: w.channel } : {});
  } else {
    D.off = true; wifiInstallModule(topo, d, w.module); D.off = false;
    D.cfg.wifi = { ssid: w.ssid, security: w.security, pass: w.pass };
  }
  touch(topo);
}

// ---------- Новые проверки ----------
function aclWhere(D, name) {
  const out = [];
  for (const [n, ic] of Object.entries(D.cfg.interfaces || {})) {
    if (ic.aclIn === name) out.push(sh(n) + ' in');
    if (ic.aclOut === name) out.push(sh(n) + ' out');
  }
  return out;
}

Object.assign(CHK, {
  // ACL применён к интерфейсу в нужном направлении (и существует)
  aclApplied(dev, ifn, dir, name) {
    return {
      label: T(dev + ': ACL ' + name + ' applied on ' + sh(ifn) + ' ' + dir, dev + ': ACL ' + name + ' применён на ' + sh(ifn) + ' ' + dir, dev + ': ‏ACL ' + name + ' מוחל על ' + sh(ifn) + ' ' + dir),
      run(topo) {
        const D = topo.devices[dev];
        const ic = D.cfg.interfaces[ifn];
        const cur = ic && (dir === 'in' ? ic.aclIn : ic.aclOut);
        if (cur === name) {
          if (!aclGet(D.cfg, name) || !aclGet(D.cfg, name).entries.some((e) => e.act !== 'remark')) return { ok: false, hint: T('"ip access-group ' + name + '" is there, but ACL ' + name + ' has no entries — an empty or missing ACL permits everything.', '"ip access-group ' + name + '" есть, но в ACL ' + name + ' нет строк — пустой или несуществующий ACL пропускает всё.', '"ip access-group ' + name + '" קיים, אבל ב-ACL ‏' + name + ' אין שורות — ‏ACL ריק או לא קיים מתיר הכול.') };
          return { ok: true };
        }
        const where = aclWhere(D, name);
        if (where.length) return { ok: false, hint: T('ACL ' + name + ' is applied on ' + where.join(', ') + ' — the task wants ' + sh(ifn) + ' ' + dir + '.', 'ACL ' + name + ' применён на ' + where.join(', ') + ' — а нужно ' + sh(ifn) + ' ' + dir + '.', 'ACL ' + name + ' מוחל על ' + where.join(', ') + ' — המשימה דורשת ' + sh(ifn) + ' ' + dir + '.') };
        return { ok: false, hint: T('Not applied yet: "interface ' + ifn + '" → "ip access-group ' + name + ' ' + dir + '".', 'Пока не применён: "interface ' + ifn + '" → "ip access-group ' + name + ' ' + dir + '".', 'עדיין לא מוחל: ‏"interface ' + ifn + '" ← ‏"ip access-group ' + name + ' ' + dir + '".') };
      },
    };
  },
  // Строка ACL с номером seq: act + host; act === null — строки быть не должно
  aclEntry(dev, name, seq, act, hostIp) {
    const what = act ? act + ' host ' + hostIp : null;
    return {
      label: act ? T(dev + ': ACL ' + name + ' line ' + seq + ' = "' + what + '"', dev + ': в ACL ' + name + ' строка ' + seq + ' = "' + what + '"', dev + ': ב-ACL ‏' + name + ' שורה ' + seq + ' = "' + what + '"')
        : T(dev + ': ACL ' + name + ' has no line ' + seq, dev + ': в ACL ' + name + ' нет строки ' + seq, dev + ': ב-ACL ‏' + name + ' אין שורה ' + seq),
      run(topo) {
        const a = aclGet(topo.devices[dev].cfg, name);
        if (!a) return { ok: false, hint: T('ACL ' + name + ' does not exist.', 'ACL ' + name + ' не существует.', 'ACL ‏' + name + ' לא קיים.') };
        const e = a.entries.find((x) => x.seq === seq);
        if (!act) return e ? { ok: false, hint: T('Line ' + seq + ' is still there: "' + aclAceText(e, a.kind) + '". Remove it with "no ' + seq + '" inside "ip access-list ' + (a.kind === 'std' ? 'standard' : 'extended') + ' ' + name + '".', 'Строка ' + seq + ' ещё есть: "' + aclAceText(e, a.kind) + '". Удалите её командой "no ' + seq + '" внутри "ip access-list ' + (a.kind === 'std' ? 'standard' : 'extended') + ' ' + name + '".', 'שורה ' + seq + ' עדיין קיימת: "' + aclAceText(e, a.kind) + '". מוחקים אותה עם "no ' + seq + '" בתוך "ip access-list ' + (a.kind === 'std' ? 'standard' : 'extended') + ' ' + name + '".') } : { ok: true };
        if (!e) return { ok: false, hint: T('No line ' + seq + ' yet. In the ACL mode type "' + seq + ' ' + what + '" — the number puts it exactly between the existing lines.', 'Строки ' + seq + ' пока нет. В режиме ACL введите "' + seq + ' ' + what + '" — номер ставит её точно между существующими строками.', 'עדיין אין שורה ' + seq + '. במצב ה-ACL מקלידים "' + seq + ' ' + what + '" — המספר ממקם אותה בדיוק בין השורות הקיימות.') };
        const okE = e.act === act && e.src && !e.src.any && e.src.ip === ipToInt(hostIp) && e.src.wild === 0;
        return okE ? { ok: true } : { ok: false, hint: T('Line ' + seq + ' is "' + aclAceText(e, a.kind) + '" — must be "' + what + '".', 'Строка ' + seq + ': "' + aclAceText(e, a.kind) + '" — нужно "' + what + '".', 'שורה ' + seq + ': "' + aclAceText(e, a.kind) + '" — צריך "' + what + '".') };
      },
    };
  },
  // TCP/UDP-сессия от src до ip:port (HTTP, HTTPS, Telnet …) проходит или нет
  flow(src, dst, ip, proto, port, expect = true) {
    const svc = { 80: 'HTTP', 443: 'HTTPS', 23: 'Telnet', 22: 'SSH', 53: 'DNS', 21: 'FTP' }[port] || proto.toUpperCase() + ' ' + port;
    return {
      label: expect ? T(src + ' can open ' + svc + ' on ' + dst + ' (' + ip + ')', src + ' открывает ' + svc + ' на ' + dst + ' (' + ip + ')', src + ' פותח ' + svc + ' ב-' + dst + ' (' + ip + ')')
        : T(src + ' must NOT open ' + svc + ' on ' + dst + ' (' + ip + ')', src + ' НЕ должен открывать ' + svc + ' на ' + dst + ' (' + ip + ')', src + ' לא אמור לפתוח ' + svc + ' ב-' + dst + ' (' + ip + ')'),
      run(topo) {
        const S = topo.devices[src];
        if (!S || !S.cfg.ip || S.cfg.ip === '0.0.0.0') return expect ? { ok: false, hint: T(src + ' has no IP address yet.', 'У ' + src + ' пока нет IP-адреса.', 'ל-' + src + ' עדיין אין כתובת IP.') } : { ok: true };
        const r = flowOnce(topo, src, ipToInt(ip), proto, port, { arp: false, probe: true, natScratch: {} });
        const D = r.ok && topo.devices[r.dev];
        const served = !!D && (D.model !== 'Server' || (port === 80 ? D.cfg.http !== false : port === 443 ? D.cfg.https !== false : true));
        if (served === expect) return { ok: true };
        if (!expect) return { ok: false, hint: T(svc + ' still passes — the ACL does not stop it yet.', svc + ' всё ещё проходит — ACL его пока не останавливает.', svc + ' עדיין עובר — ה-ACL עוד לא עוצר אותו.') };
        if (r.ok && !served) return { ok: false, hint: T('The server answers, but its ' + svc + ' service is off (Server → Services → HTTP).', 'Сервер отвечает, но служба ' + svc + ' выключена (Server → Services → HTTP).', 'השרת עונה, אבל שירות ' + svc + ' כבוי (Server → Services → HTTP).') };
        const why = r.reason && r.reason.code;
        const at = r.reason && topo.devices[r.reason.at] ? topo.devices[r.reason.at].name : '';
        if (why === 'acl') return { ok: false, hint: T('Dropped by an access list on ' + at + ' (' + (r.leg === 'reply' ? 'the reply' : 'the request') + '). Check the order of the ACL lines and the implicit "deny any" at the end.', 'Отброшено списком доступа на ' + at + ' (' + (r.leg === 'reply' ? 'ответ' : 'запрос') + '). Проверьте порядок строк ACL и неявный "deny any" в конце.', 'נזרק ע"י רשימת גישה ב-' + at + ' (' + (r.leg === 'reply' ? 'התשובה' : 'הבקשה') + '). בדקו את סדר השורות ב-ACL ואת ה-"deny any" הסמוי בסוף.') };
        if (why === 'nat') return { ok: false, hint: T('The reply did not come back through NAT on ' + at + ': check "ip nat inside/outside" and the NAT rule.', 'Ответ не вернулся через NAT на ' + at + ': проверьте "ip nat inside/outside" и правило NAT.', 'התשובה לא חזרה דרך ה-NAT ב-' + at + ': בדקו "ip nat inside/outside" ואת כלל ה-NAT.') };
        return { ok: false, hint: T('No answer: check addressing, gateways, routes and NAT on the path.', 'Ответа нет: проверьте адреса, шлюзы, маршруты и NAT на пути.', 'אין תשובה: בדקו כתובות, שערים, נתיבים ו-NAT בדרך.') };
      },
    };
  },
  // На линиях vty применён access-class
  vtyClass(dev, name) {
    return {
      label: T(dev + ': "access-class ' + name + ' in" on line vty 0 4', dev + ': "access-class ' + name + ' in" на line vty 0 4', dev + ': ‏"access-class ' + name + ' in" ב-line vty 0 4'),
      run(topo) {
        const D = topo.devices[dev];
        const v = D.cfg.lines.vty || {};
        if (v.accessClass !== name) return { ok: false, hint: T('Now: ' + (v.accessClass ? 'access-class ' + v.accessClass : 'no access-class') + '. "ip access-group" does not work on vty lines — use "access-class".', 'Сейчас: ' + (v.accessClass ? 'access-class ' + v.accessClass : 'access-class нет') + '. "ip access-group" на линиях vty не работает — нужен "access-class".', 'עכשיו: ' + (v.accessClass ? 'access-class ' + v.accessClass : 'אין access-class') + '. ‏"ip access-group" לא עובד בקווי vty — צריך "access-class".') };
        if (!aclGet(D.cfg, name)) return { ok: false, hint: T('ACL ' + name + ' does not exist yet.', 'ACL ' + name + ' ещё не создан.', 'ACL ‏' + name + ' עוד לא נוצר.') };
        return { ok: true };
      },
    };
  },
  // Удалённый вход: telnet / ssh от src до ip открывается (или отклоняется)
  remote(src, dev, ip, kind, expect = true) {
    const K = kind === 'ssh' ? 'SSH' : 'Telnet';
    return {
      label: expect ? T(src + ' can open ' + K + ' to ' + dev + ' (' + ip + ')', src + ' подключается по ' + K + ' к ' + dev + ' (' + ip + ')', src + ' מתחבר ב-' + K + ' אל ' + dev + ' (' + ip + ')')
        : T(src + ' is refused ' + K + ' to ' + dev + ' (' + ip + ')', src + ' получает отказ ' + K + ' к ' + dev + ' (' + ip + ')', src + ' מקבל סירוב ' + K + ' אל ' + dev + ' (' + ip + ')'),
      run(topo) {
        const r = remoteLogin(topo, src, ip, kind, 'admin', { probe: true });
        const open = !!r.sess || r.lines.some((l) => /\.\.\.Open$|Password required|Authentication failed/.test(l));
        if (open === expect) return { ok: true };
        if (!expect) return { ok: false, hint: T('The connection still opens: the vty lines need an access-class that permits only the admin host.', 'Подключение всё ещё открывается: линиям vty нужен access-class, разрешающий только хост администратора.', 'החיבור עדיין נפתח: קווי ה-vty צריכים access-class שמתיר רק את מארח המנהל.') };
        return { ok: false, hint: T(r.lines.filter(Boolean).slice(-1)[0] + ' — check the access-class ACL (does it permit ' + src + '?) and "login" with a password on the vty lines.', r.lines.filter(Boolean).slice(-1)[0] + ' — проверьте ACL в access-class (разрешён ли ' + src + '?) и "login" с паролем на линиях vty.', r.lines.filter(Boolean).slice(-1)[0] + ' — בדקו את ה-ACL ב-access-class (האם ' + src + ' מותר?) ואת "login" עם סיסמה בקווי ה-vty.') };
      },
    };
  },
  natIf(dev, ifn, role) {
    return {
      label: T(dev + ' ' + sh(ifn) + ': ip nat ' + role, dev + ' ' + sh(ifn) + ': ip nat ' + role, dev + ' ' + sh(ifn) + ': ‏ip nat ' + role),
      run(topo) {
        const now = natRole(topo.devices[dev], ifn);
        if (now === role) return { ok: true };
        return { ok: false, hint: now ? T(sh(ifn) + ' is marked "ip nat ' + now + '" — it faces the ' + (role === 'inside' ? 'private LAN' : 'provider') + ', so it must be "ip nat ' + role + '".', sh(ifn) + ' помечен "ip nat ' + now + '" — он смотрит ' + (role === 'inside' ? 'в частную LAN' : 'к провайдеру') + ', значит нужен "ip nat ' + role + '".', sh(ifn) + ' מסומן "ip nat ' + now + '" — הוא פונה ' + (role === 'inside' ? 'ל-LAN הפרטית' : 'לספק') + ', ולכן צריך "ip nat ' + role + '".')
          : T('Not marked yet: "interface ' + ifn + '" → "ip nat ' + role + '". Without inside/outside marks NAT translates nothing.', 'Пока не помечен: "interface ' + ifn + '" → "ip nat ' + role + '". Без меток inside/outside NAT ничего не транслирует.', 'עדיין לא מסומן: ‏"interface ' + ifn + '" ← ‏"ip nat ' + role + '". בלי סימוני inside/outside ה-NAT לא מתרגם כלום.') };
      },
    };
  },
  natStatic(dev, il, ig) {
    return {
      label: T(dev + ': static NAT ' + il + ' ↔ ' + ig, dev + ': статический NAT ' + il + ' ↔ ' + ig, dev + ': ‏NAT סטטי ' + il + ' ↔ ' + ig),
      run(topo) {
        const st = (topo.devices[dev].cfg.nat || { statics: [] }).statics;
        const s = st.find((x) => x.local === il && !x.proto);
        if (s && s.global === ig) return { ok: true };
        if (s) return { ok: false, hint: T(il + ' is mapped to ' + s.global + ' — must be ' + ig + '.', il + ' отображается в ' + s.global + ' — нужно ' + ig + '.', il + ' ממופה ל-' + s.global + ' — צריך ' + ig + '.') };
        return { ok: false, hint: T('Syntax: ip nat inside source static <inside local> <inside global>.', 'Синтаксис: ip nat inside source static <inside local> <inside global>.', 'תחביר: ip nat inside source static <inside local> <inside global>.') };
      },
    };
  },
  natPool(dev, name, a, b) {
    return {
      label: T(dev + ': NAT pool ' + name + ' ' + a + ' – ' + b, dev + ': пул NAT ' + name + ' ' + a + ' – ' + b, dev + ': ‏מאגר NAT ‏' + name + ' ' + a + ' – ' + b),
      run(topo) {
        const p = ((topo.devices[dev].cfg.nat || {}).pools || {})[name];
        if (!p) return { ok: false, hint: T('No pool ' + name + ' yet: ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask <mask>.', 'Пула ' + name + ' пока нет: ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask <маска>.', 'עדיין אין מאגר ' + name + ': ‏ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask <מסכה>.') };
        if (p.start !== a || p.end !== b) return { ok: false, hint: T('Pool range is ' + p.start + ' – ' + p.end + '.', 'Диапазон пула: ' + p.start + ' – ' + p.end + '.', 'טווח המאגר: ' + p.start + ' – ' + p.end + '.') };
        return { ok: true };
      },
    };
  },
  // Под каким адресом src виден снаружи (у получателя ip): global — адрес или [от, до]
  natSeen(src, ip, global) {
    const want = Array.isArray(global) ? global[0] + ' – ' + global[1] : global;
    return {
      label: T(src + ' reaches ' + ip + ' translated to ' + want, src + ' выходит к ' + ip + ' под адресом ' + want, src + ' מגיע אל ' + ip + ' מתורגם ל-' + want),
      run(topo) {
        const S = topo.devices[src];
        if (!S.cfg.ip || S.cfg.ip === '0.0.0.0') return { ok: false, hint: T(src + ' has no IP address yet.', 'У ' + src + ' пока нет IP-адреса.', 'ל-' + src + ' עדיין אין כתובת IP.') };
        const r = flowOnce(topo, src, ipToInt(ip), 'tcp', 80, { arp: false, probe: true, natScratch: {} });
        if (!r.ok) return { ok: false, hint: T('The traffic does not get there and back: the provider has no route to private addresses, so without NAT the reply is lost.', 'Трафик не доходит туда и обратно: у провайдера нет маршрута к частным адресам, поэтому без NAT ответ теряется.', 'התעבורה לא מגיעה הלוך ושוב: לספק אין נתיב לכתובות פרטיות, ולכן בלי NAT התשובה הולכת לאיבוד.') };
        const seen = intToIp(r.srcSeen);
        const ok = Array.isArray(global) ? r.srcSeen >= ipToInt(global[0]) && r.srcSeen <= ipToInt(global[1]) : seen === global;
        return ok ? { ok: true } : { ok: false, hint: T('Seen outside as ' + seen + '.', 'Снаружи виден как ' + seen + '.', 'נראה מבחוץ כ-' + seen + '.') };
      },
    };
  },
  homeLan(dev, ip, mask) {
    return {
      label: T(dev + ': router IP (LAN) ' + ip + ' ' + mask, dev + ': IP роутера (LAN) ' + ip + ' ' + mask, dev + ': ‏IP הנתב (LAN) ‏' + ip + ' ' + mask),
      run(topo) {
        const l = topo.devices[dev].cfg.interfaces.LAN;
        return l.ip === ip && l.mask === mask ? { ok: true } : { ok: false, hint: T('Now ' + l.ip + ' ' + l.mask + '. GUI → Setup → Basic Setup → Router IP, then Save Settings.', 'Сейчас ' + l.ip + ' ' + l.mask + '. GUI → Setup → Basic Setup → Router IP, затем Save Settings.', 'עכשיו ' + l.ip + ' ' + l.mask + '. ‏GUI → Setup → Basic Setup → Router IP, ואז Save Settings.') };
      },
    };
  },
  homeDhcp(dev, start, max) {
    return {
      label: T(dev + ': DHCP server from .' + start + ', ' + max + ' users', dev + ': DHCP-сервер с .' + start + ', ' + max + ' пользователей', dev + ': ‏שרת DHCP מ-.' + start + ', ‏' + max + ' משתמשים'),
      run(topo) {
        const h0 = topo.devices[dev].cfg.home;
        if (!h0.dhcpOn) return { ok: false, hint: T('DHCP Server is disabled.', 'DHCP Server выключен.', 'שרת ה-DHCP כבוי.') };
        return h0.dhcpStart === start && h0.dhcpMax === max ? { ok: true } : { ok: false, hint: T('Now Start .' + h0.dhcpStart + ', Maximum ' + h0.dhcpMax + '.', 'Сейчас Start .' + h0.dhcpStart + ', Maximum ' + h0.dhcpMax + '.', 'עכשיו Start .' + h0.dhcpStart + ', ‏Maximum ' + h0.dhcpMax + '.') };
      },
    };
  },
  wifiAp(dev, ssid, sec, pass, ch, isAp) {
    return {
      label: T(dev + ': SSID "' + ssid + '", ' + WIFI_SECURITY[sec] + (ch ? ', channel ' + ch : ''), dev + ': SSID "' + ssid + '", ' + WIFI_SECURITY[sec] + (ch ? ', канал ' + ch : ''), dev + ': ‏SSID ‏"' + ssid + '", ' + WIFI_SECURITY[sec] + (ch ? ', ערוץ ' + ch : '')),
      run(topo) {
        const w = wifiApCfg(topo.devices[dev]);
        if (w.ssid !== ssid) return { ok: false, hint: T('SSID is "' + w.ssid + '" (SSIDs are case-sensitive).', 'Сейчас SSID "' + w.ssid + '" (регистр букв важен).', 'ה-SSID עכשיו "' + w.ssid + '" (יש הבדל בין אותיות גדולות לקטנות).') };
        if ((w.security || 'disabled') !== sec) return { ok: false, hint: T('Security is ' + WIFI_SECURITY[w.security || 'disabled'] + '.', 'Защита сейчас: ' + WIFI_SECURITY[w.security || 'disabled'] + '.', 'האבטחה עכשיו: ' + WIFI_SECURITY[w.security || 'disabled'] + '.') };
        if (sec !== 'disabled' && w.pass !== pass) return { ok: false, hint: T('The passphrase differs from the task.', 'Пароль (passphrase) не совпадает с заданием.', 'ה-passphrase שונה מהמשימה.') };
        if (ch && (w.channel || 6) !== ch) return { ok: false, hint: T('Channel is ' + (w.channel || 6) + '.', 'Сейчас канал ' + (w.channel || 6) + '.', 'הערוץ עכשיו ' + (w.channel || 6) + '.') };
        if (w.radioOn === false) return { ok: false, hint: T('The radio is turned off.', 'Радио выключено.', 'הרדיו כבוי.') };
        return { ok: true };
      },
    };
  },
  wifiNic(dev, module) {
    return {
      label: T(dev + ' has the wireless card ' + module, 'В ' + dev + ' установлена беспроводная карта ' + module, 'ב-' + dev + ' מותקן הכרטיס האלחוטי ' + module),
      run(topo) {
        const d = topo.devices[dev];
        if (isWirelessClient(d)) return d.off ? { ok: false, hint: T('Installed — now turn the power back on.', 'Установлена — теперь снова включите питание.', 'מותקן — עכשיו מדליקים שוב את החשמל.') } : { ok: true };
        return { ok: false, hint: T('Physical tab: power OFF, replace the Fast Ethernet module with ' + module + ', power ON.', 'Вкладка Physical: выключить питание, заменить модуль Fast Ethernet на ' + module + ', включить.', 'לשונית Physical: מכבים, מחליפים את מודול ה-Fast Ethernet ב-' + module + ', מדליקים.') };
      },
    };
  },
  wifiAssoc(pc, ap) {
    return {
      label: T(pc + ' is connected to ' + ap + ' over Wi-Fi', pc + ' подключён к ' + ap + ' по Wi-Fi', pc + ' מחובר ל-' + ap + ' ב-Wi-Fi'),
      run(topo) {
        const d = topo.devices[pc];
        if (!isWirelessClient(d)) return { ok: false, hint: T(pc + ' has no wireless card yet.', 'В ' + pc + ' ещё нет беспроводной карты.', 'ב-' + pc + ' עדיין אין כרטיס אלחוטי.') };
        const now = wifiApOf(topo, pc);
        if (now === ap) return { ok: true };
        if (now) return { ok: false, hint: T('Connected to ' + topo.devices[now].name + ' instead.', 'Подключён к ' + topo.devices[now].name + ', а не к ' + ap + '.', 'מחובר ל-' + topo.devices[now].name + ' במקום.') };
        return { ok: false, hint: T('Not associated: the SSID, the security mode or the key does not match. Desktop → PC Wireless → Connect.', 'Не подключён: не совпадает SSID, тип защиты или ключ. Desktop → PC Wireless → Connect.', 'לא מחובר: ה-SSID, סוג האבטחה או המפתח לא תואמים. ‏Desktop → PC Wireless → Connect.') };
      },
    };
  },
});

// ---------- Общие топологии ----------
// Две площадки: LAN A (PC1, PC2) за R1, LAN B (Server, PC3) за R2, статика в обе стороны
function secBase(rng) {
  const sp = subnetPool(rng);
  const m1 = rng.pick(ROUTER_MODELS), m2 = rng.pick(ROUTER_MODELS);
  const lA = sp.lan(0), lB = sp.lan(0), w = sp.p2p();
  const x = {
    lA, lB, w, r1lan: gi(m1, 0), r1wan: gi(m1, 1), r2lan: gi(m2, 0), r2wan: gi(m2, 1),
    gw1: host(lA, 1), gw2: host(lB, 1), pc1: host(lA, rng.int(10, 49)), pc2: host(lA, rng.int(50, 99)), srv: host(lB, rng.int(100, 150)), pc3: host(lB, rng.int(10, 49)),
    w1: host(w, 1), w2: host(w, 2), wc: wildcardOf(24),
  };
  x.build = (topo) => {
    tAdd(topo, m1, 'R1', 300, 140); tAdd(topo, m2, 'R2', 620, 140);
    tAdd(topo, '2960', 'S1', 200, 280); tAdd(topo, '2960', 'S2', 720, 280);
    tAdd(topo, 'PC', 'PC1', 100, 420); tAdd(topo, 'PC', 'PC2', 280, 430); tAdd(topo, 'Server', 'Server', 650, 430); tAdd(topo, 'PC', 'PC3', 820, 420);
    tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC2', 'FastEthernet0', 'S1', fa(2));
    tLink(topo, 'Server', 'FastEthernet0', 'S2', fa(1)); tLink(topo, 'PC3', 'FastEthernet0', 'S2', fa(2));
    tLink(topo, 'R1', x.r1lan, 'S1', 'GigabitEthernet0/1'); tLink(topo, 'R2', x.r2lan, 'S2', 'GigabitEthernet0/1'); tLink(topo, 'R1', x.r1wan, 'R2', x.r2wan);
    tHostname(topo, ['R1', 'R2', 'S1', 'S2']);
    tCli(topo, 'R1', ['interface ' + x.r1lan, 'ip address ' + x.gw1 + ' ' + lA.mask, 'no shutdown', 'interface ' + x.r1wan, 'ip address ' + x.w1 + ' ' + w.mask, 'no shutdown', 'ip route ' + lB.net + ' ' + lB.mask + ' ' + x.w2]);
    tCli(topo, 'R2', ['interface ' + x.r2lan, 'ip address ' + x.gw2 + ' ' + lB.mask, 'no shutdown', 'interface ' + x.r2wan, 'ip address ' + x.w2 + ' ' + w.mask, 'no shutdown', 'ip route ' + lA.net + ' ' + lA.mask + ' ' + x.w1]);
    tPc(topo, 'PC1', x.pc1, lA.mask, x.gw1); tPc(topo, 'PC2', x.pc2, lA.mask, x.gw1); tPc(topo, 'Server', x.srv, lB.mask, x.gw2); tPc(topo, 'PC3', x.pc3, lB.mask, x.gw2);
  };
  x.table = [rowIf('R1', x.r1lan, x.gw1, lA.mask), rowIf('R1', x.r1wan, x.w1, w.mask), rowIf('R2', x.r2lan, x.gw2, lB.mask), rowIf('R2', x.r2wan, x.w2, w.mask),
    rowPc('PC1', x.pc1, lA.mask, x.gw1), rowPc('PC2', x.pc2, lA.mask, x.gw1), rowPc('Server', x.srv, lB.mask, x.gw2), rowPc('PC3', x.pc3, lB.mask, x.gw2)];
  return x;
}

// Граница с провайдером: LAN за R1 (PC1, PC2, Server), R1 — ISP (/27 публичных адресов), за ISP — веб-сервер WEB
function natBase(rng) {
  const sp = subnetPool(rng);
  const m1 = rng.pick(ROUTER_MODELS);
  const lA = sp.lan(rng.int(0, 2));
  const pub = rng.pick(['209.165.200.224', '209.165.201.0', '209.165.202.128', '203.0.113.32', '198.51.100.64']);
  const wan = { net: pub, len: 27, mask: '255.255.255.224' };
  const web = { net: rng.pick(['198.18.10.0', '192.31.7.0', '64.100.1.0']), len: 24, mask: '255.255.255.0' };
  const x = {
    lA, wan, web, r1lan: gi(m1, 0), r1wan: gi(m1, 1), isp: 'GigabitEthernet0/0', ispWeb: 'GigabitEthernet0/1',
    gw1: host(lA, 1), pc1: host(lA, rng.int(10, 49)), pc2: host(lA, rng.int(50, 99)), srv: host(lA, rng.int(200, 240)),
    ispIp: host(wan, 1), r1Pub: host(wan, 2), webGw: host(web, 1), webIp: host(web, 10), wc: wildcardOf(lA.len),
  };
  x.build = (topo) => {
    tAdd(topo, m1, 'R1', 320, 160); tAdd(topo, '2911', 'ISP', 620, 160); tAdd(topo, 'Server', 'WEB', 820, 300);
    tAdd(topo, '2960', 'S1', 200, 290);
    tAdd(topo, 'PC', 'PC1', 80, 430); tAdd(topo, 'PC', 'PC2', 220, 440); tAdd(topo, 'Server', 'Server', 360, 430);
    tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'PC2', 'FastEthernet0', 'S1', fa(2)); tLink(topo, 'Server', 'FastEthernet0', 'S1', fa(3));
    tLink(topo, 'R1', x.r1lan, 'S1', 'GigabitEthernet0/1'); tLink(topo, 'R1', x.r1wan, 'ISP', x.isp); tLink(topo, 'ISP', x.ispWeb, 'WEB', 'FastEthernet0');
    tHostname(topo, ['R1', 'ISP', 'S1']);
    tCli(topo, 'R1', ['interface ' + x.r1lan, 'ip address ' + x.gw1 + ' ' + lA.mask, 'no shutdown', 'interface ' + x.r1wan, 'ip address ' + x.r1Pub + ' ' + wan.mask, 'no shutdown', 'ip route 0.0.0.0 0.0.0.0 ' + x.ispIp]);
    tCli(topo, 'ISP', ['interface ' + x.isp, 'ip address ' + x.ispIp + ' ' + wan.mask, 'no shutdown', 'interface ' + x.ispWeb, 'ip address ' + x.webGw + ' ' + web.mask, 'no shutdown']);
    tPc(topo, 'PC1', x.pc1, lA.mask, x.gw1); tPc(topo, 'PC2', x.pc2, lA.mask, x.gw1); tPc(topo, 'Server', x.srv, lA.mask, x.gw1); tPc(topo, 'WEB', x.webIp, web.mask, x.webGw);
  };
  x.table = [rowIf('R1', x.r1lan, x.gw1, lA.mask), rowIf('R1', x.r1wan, x.r1Pub, wan.mask), rowIf('ISP', x.isp, x.ispIp, wan.mask), rowIf('ISP', x.ispWeb, x.webGw, web.mask),
    rowPc('PC1', x.pc1, lA.mask, x.gw1), rowPc('PC2', x.pc2, lA.mask, x.gw1), rowPc('Server', x.srv, lA.mask, x.gw1), rowPc('WEB', x.webIp, web.mask, x.webGw)];
  x.nat = (r1) => ['interface ' + x.r1lan, 'ip nat inside', 'interface ' + x.r1wan, 'ip nat outside'].concat(r1 || []);
  return x;
}

// ================== ACL ==================
taskDef('acl-std', 'acl', 2, (rng) => {
  const x = secBase(rng);
  const n = rng.int(1, 99);
  return {
    title: T('Standard ACL: block one host', 'Стандартный ACL: запретить один хост', 'ACL סטנדרטי: חסימת מארח אחד'),
    intro: T('PC1 must no longer reach the server LAN ' + x.lB.net + '/24 behind R2. PC2 and all other traffic must keep working. Use ' + ACL_NUM_TXT(n).en + ' and place it as close to the destination as possible.',
      'PC1 больше не должен попадать в серверную сеть ' + x.lB.net + '/24 за R2. PC2 и весь остальной трафик должны работать. Используйте ' + ACL_NUM_TXT(n).ru + ' и поставьте его как можно ближе к получателю.',
      'PC1 לא אמור להגיע יותר לרשת השרתים ' + x.lB.net + '/24 שמאחורי R2. ‏PC2 וכל שאר התעבורה צריכים להמשיך לעבוד. משתמשים ב-' + ACL_NUM_TXT(n).he + ' וממקמים אותו קרוב ככל האפשר ליעד.'),
    steps: [
      T('On R2: "access-list ' + n + ' deny host ' + x.pc1 + '", then "access-list ' + n + ' permit any" — without it the implicit "deny any" at the end blocks everybody.', 'На R2: "access-list ' + n + ' deny host ' + x.pc1 + '", затем "access-list ' + n + ' permit any" — без неё неявный "deny any" в конце заблокирует всех.', 'ב-R2: ‏"access-list ' + n + ' deny host ' + x.pc1 + '", ואז "access-list ' + n + ' permit any" — בלעדיה ה-"deny any" הסמוי בסוף חוסם את כולם.'),
      T('A standard ACL checks only the source, so it goes near the destination: "interface ' + x.r2lan + '", "ip access-group ' + n + ' out".', 'Стандартный ACL смотрит только на источник, поэтому ставится у получателя: "interface ' + x.r2lan + '", "ip access-group ' + n + ' out".', 'ACL סטנדרטי בודק רק את המקור, ולכן ממקמים אותו ליד היעד: ‏"interface ' + x.r2lan + '", ‏"ip access-group ' + n + ' out".'),
      T('Verify: PC1 → Server fails, PC2 → Server works, PC1 can still ping R2 ' + x.gw2 + '. "show access-lists" on R2 counts the matches.', 'Проверка: PC1 → Server не проходит, PC2 → Server проходит, PC1 по-прежнему пингует R2 ' + x.gw2 + '. "show access-lists" на R2 показывает совпадения.', 'בדיקה: ‏PC1 → Server נכשל, ‏PC2 → Server עובד, ‏PC1 עדיין עושה ping ל-R2 ‏' + x.gw2 + '. ‏"show access-lists" ב-R2 מראה את ההתאמות.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.aclApplied('R2', x.r2lan, 'out', String(n)), CHK.ping('PC1', 'Server', x.srv, false), CHK.ping('PC2', 'Server', x.srv, true), CHK.ping('PC1', 'R2', x.gw2, true)],
    solution: { cli: { R2: ['access-list ' + n + ' deny host ' + x.pc1, 'access-list ' + n + ' permit any', 'interface ' + x.r2lan, 'ip access-group ' + n + ' out'] } },
    hints: [T('"host ' + x.pc1 + '" = "' + x.pc1 + ' 0.0.0.0": the wildcard 0.0.0.0 means "all 32 bits must match".', '"host ' + x.pc1 + '" = "' + x.pc1 + ' 0.0.0.0": wildcard 0.0.0.0 значит «совпасть должны все 32 бита».', '"host ' + x.pc1 + '" = "' + x.pc1 + ' 0.0.0.0": ה-wildcard ‏0.0.0.0 פירושו "כל 32 הביטים חייבים להתאים".'),
      T('Traffic to the router itself is not checked by an outbound ACL — that is why PC1 still pings ' + x.gw2 + '.', 'Трафик к самому роутеру исходящий ACL не проверяет — поэтому PC1 всё ещё пингует ' + x.gw2 + '.', 'ACL יוצא לא בודק תעבורה אל הנתב עצמו — לכן PC1 עדיין עושה ping ל-' + x.gw2 + '.')],
  };
});

taskDef('acl-ext', 'acl', 3, (rng) => {
  const x = secBase(rng);
  const name = rng.pick(ACL_NAMES);
  const [port, kw] = rng.pick([[80, 'www'], [80, '80'], [443, '443']]);
  const svc = port === 80 ? 'HTTP' : 'HTTPS';
  const cli = ['ip access-list extended ' + name, 'permit tcp ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + ' eq ' + kw, 'deny ip ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv, 'permit ip any any', 'exit',
    'interface ' + x.r1lan, 'ip access-group ' + name + ' in'];
  return {
    title: T('Named extended ACL: only ' + svc + ' to the server', 'Именованный расширенный ACL: к серверу только ' + svc, 'ACL מורחב עם שם: לשרת רק ' + svc),
    intro: T('Users of LAN A (' + x.lA.net + '/24) may use only the web site (' + svc + ', TCP ' + port + ') on the server ' + x.srv + ' — no ping, no other services to it. Everything else (for example PC3 in LAN B) stays reachable. Write the extended ACL "' + name + '" and place it close to the source.',
      'Пользователям LAN A (' + x.lA.net + '/24) к серверу ' + x.srv + ' можно только на сайт (' + svc + ', TCP ' + port + ') — ни ping, ни других служб. Всё остальное (например, PC3 в LAN B) должно быть доступно. Напишите расширенный ACL "' + name + '" и поставьте его ближе к источнику.',
      'למשתמשי LAN A ‏(' + x.lA.net + '/24) מותר אל השרת ' + x.srv + ' רק לאתר (' + svc + ', ‏TCP ' + port + ') — בלי ping ובלי שירותים אחרים. כל השאר (למשל PC3 ב-LAN B) נשאר נגיש. כתבו ACL מורחב "' + name + '" ומקמו אותו ליד המקור.'),
    steps: [
      T('R1: "ip access-list extended ' + name + '" → line 1: permit tcp ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + ' eq ' + kw + '.', 'R1: "ip access-list extended ' + name + '" → строка 1: permit tcp ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + ' eq ' + kw + '.', 'R1: ‏"ip access-list extended ' + name + '" ← שורה 1: ‏permit tcp ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + ' eq ' + kw + '.'),
      T('Line 2: deny ip ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + '; line 3: permit ip any any. Order matters: the first match wins.', 'Строка 2: deny ip ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + '; строка 3: permit ip any any. Порядок важен: срабатывает первое совпадение.', 'שורה 2: ‏deny ip ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + '; שורה 3: ‏permit ip any any. הסדר חשוב: ההתאמה הראשונה קובעת.'),
      T('An extended ACL goes near the source: R1 ' + sh(x.r1lan) + ' in. Verify: PC1 → Desktop → Web Browser → ' + (port === 443 ? 'https' : 'http') + '://' + x.srv + ' opens, ping ' + x.srv + ' fails, ping PC3 works.', 'Расширенный ACL ставится у источника: R1 ' + sh(x.r1lan) + ' in. Проверка: PC1 → Desktop → Web Browser → ' + (port === 443 ? 'https' : 'http') + '://' + x.srv + ' открывается, ping ' + x.srv + ' не проходит, ping PC3 проходит.', 'ACL מורחב ממוקם ליד המקור: ‏R1 ' + sh(x.r1lan) + ' in. בדיקה: ‏PC1 → Desktop → Web Browser → ' + (port === 443 ? 'https' : 'http') + '://' + x.srv + ' נפתח, ‏ping ל-' + x.srv + ' נכשל, ‏ping ל-PC3 עובד.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.aclApplied('R1', x.r1lan, 'in', name), CHK.flow('PC1', 'Server', x.srv, 'tcp', port, true), CHK.ping('PC1', 'Server', x.srv, false), CHK.ping('PC2', 'PC3', x.pc3, true)],
    solution: { cli: { R1: cli } },
    hints: [T('"eq www" and "eq 80" are the same port; IOS shows it as "eq www".', '"eq www" и "eq 80" — один и тот же порт; IOS показывает "eq www".', '"eq www" ו-"eq 80" הם אותו פורט; ה-IOS מציג "eq www".'),
      T('Edit a named ACL line by line: "no 20" deletes line 20, "15 permit …" inserts between 10 and 20.', 'Именованный ACL редактируется построчно: "no 20" удаляет строку 20, "15 permit …" вставляет между 10 и 20.', 'עורכים ACL עם שם שורה-שורה: ‏"no 20" מוחק את שורה 20, ‏"15 permit …" מכניס בין 10 ל-20.')],
  };
});

taskDef('acl-edit', 'acl', 3, (rng) => {
  const x = secBase(rng);
  const name = rng.pick(['SRV-LAN', 'PROTECT-SRV', 'LAN-B-OUT', 'SERVERS']);
  const old = host(x.lA, rng.int(100, 120));
  return {
    title: T('Edit a named ACL with sequence numbers', 'Правка именованного ACL по номерам строк', 'עריכת ACL עם שם לפי מספרי שורות'),
    intro: T('R2 already filters traffic into LAN B with the named standard ACL "' + name + '": line 10 denies an old printer ' + old + ' (it is gone), line 20 permits LAN A. Now PC1 ' + x.pc1 + ' must be denied, PC2 still permitted. Do not re-type the ACL — edit it.',
      'R2 уже фильтрует трафик в LAN B именованным стандартным ACL "' + name + '": строка 10 запрещает старый принтер ' + old + ' (его больше нет), строка 20 разрешает LAN A. Теперь нужно запретить PC1 ' + x.pc1 + ', а PC2 оставить. Не набирайте ACL заново — отредактируйте его.',
      'R2 כבר מסנן תעבורה אל LAN B עם ACL סטנדרטי בשם "' + name + '": שורה 10 חוסמת מדפסת ישנה ' + old + ' (היא כבר לא קיימת), שורה 20 מתירה את LAN A. עכשיו צריך לחסום את PC1 ‏' + x.pc1 + ' ולהשאיר את PC2. לא מקלידים את ה-ACL מחדש — עורכים אותו.'),
    steps: [
      T('"show access-lists" on R2: note the line numbers 10 and 20.', '"show access-lists" на R2: запомните номера строк 10 и 20.', '"show access-lists" ב-R2: שימו לב למספרי השורות 10 ו-20.'),
      T('"ip access-list standard ' + name + '" → "15 deny host ' + x.pc1 + '": the line goes before 20, otherwise "permit ' + x.lA.net + '" would match PC1 first.', '"ip access-list standard ' + name + '" → "15 deny host ' + x.pc1 + '": строка встаёт перед 20, иначе "permit ' + x.lA.net + '" сработает для PC1 раньше.', '"ip access-list standard ' + name + '" ← ‏"15 deny host ' + x.pc1 + '": השורה נכנסת לפני 20, אחרת "permit ' + x.lA.net + '" יתאים ל-PC1 קודם.'),
      T('Remove the obsolete line: "no 10". Verify with "show access-lists" and ping from PC1 and PC2 to the server.', 'Удалите устаревшую строку: "no 10". Проверьте "show access-lists" и ping с PC1 и PC2 до сервера.', 'מוחקים את השורה המיותרת: ‏"no 10". בודקים עם "show access-lists" ו-ping מ-PC1 ומ-PC2 לשרת.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); tCli(topo, 'R2', ['ip access-list standard ' + name, '10 deny host ' + old, '20 permit ' + x.lA.net + ' ' + x.wc, 'exit', 'interface ' + x.r2lan, 'ip access-group ' + name + ' out']); },
    checks: [CHK.aclEntry('R2', name, 15, 'deny', x.pc1), CHK.aclEntry('R2', name, 10, null), CHK.ping('PC1', 'Server', x.srv, false), CHK.ping('PC2', 'Server', x.srv, true)],
    solution: { cli: { R2: ['ip access-list standard ' + name, '15 deny host ' + x.pc1, 'no 10'] } },
    hints: [T('Numbered ACLs (access-list 10 …) can be edited the same way: "ip access-list standard 10".', 'Нумерованные ACL (access-list 10 …) правятся так же: "ip access-list standard 10".', 'גם ACL ממוספר (access-list 10 …) נערך כך: ‏"ip access-list standard 10".'),
      T('PC3 in LAN B is not affected: its traffic never leaves R2 through ' + sh(x.r2lan) + '.', 'PC3 в LAN B не затронут: его трафик не выходит из R2 через ' + sh(x.r2lan) + '.', 'PC3 ב-LAN B לא מושפע: התעבורה שלו לא יוצאת מ-R2 דרך ' + sh(x.r2lan) + '.')],
  };
});

taskDef('acl-vty', 'acl', 2, (rng) => {
  const x = secBase(rng);
  const n = rng.int(1, 99), pw = rng.pick(PASSWORDS);
  return {
    title: T('Protect the VTY lines with an ACL', 'Защитить линии VTY списком доступа', 'הגנה על קווי VTY עם ACL'),
    intro: T('R1 accepts Telnet from anyone who knows the password "' + pw + '". Only the admin computer PC2 (' + x.pc2 + ') may log in remotely; PC1 must be refused. Ping must keep working.',
      'R1 пускает по Telnet любого, кто знает пароль "' + pw + '". Удалённо входить может только компьютер администратора PC2 (' + x.pc2 + '); PC1 должен получать отказ. Ping при этом должен работать.',
      'R1 מקבל Telnet מכל מי שיודע את הסיסמה "' + pw + '". רק מחשב המנהל PC2 ‏(' + x.pc2 + ') רשאי להתחבר מרחוק; ‏PC1 צריך לקבל סירוב. ה-ping צריך להמשיך לעבוד.'),
    steps: [
      T('Try it: PC1 → Command Prompt → "telnet ' + x.gw1 + '" opens a session.', 'Попробуйте: PC1 → Command Prompt → "telnet ' + x.gw1 + '" открывает сессию.', 'נסו: ‏PC1 → Command Prompt → ‏"telnet ' + x.gw1 + '" פותח חיבור.'),
      T('R1: "access-list ' + n + ' permit host ' + x.pc2 + '" (everyone else hits the implicit deny).', 'R1: "access-list ' + n + ' permit host ' + x.pc2 + '" (все остальные попадут под неявный deny).', 'R1: ‏"access-list ' + n + ' permit host ' + x.pc2 + '" (כל השאר נופלים ל-deny הסמוי).'),
      T('"line vty 0 4" → "access-class ' + n + ' in". Verify: telnet from PC2 opens, from PC1 — "% Connection refused by remote host".', '"line vty 0 4" → "access-class ' + n + ' in". Проверка: telnet с PC2 открывается, с PC1 — "% Connection refused by remote host".', '"line vty 0 4" ← ‏"access-class ' + n + ' in". בדיקה: ‏telnet מ-PC2 נפתח, מ-PC1 — ‏"% Connection refused by remote host".'),
    ],
    table: x.table,
    build(topo) { x.build(topo); tCli(topo, 'R1', ['line vty 0 4', 'password ' + pw, 'login', 'transport input telnet']); },
    checks: [CHK.vtyClass('R1', String(n)), CHK.remote('PC2', 'R1', x.gw1, 'telnet', true), CHK.remote('PC1', 'R1', x.gw1, 'telnet', false), CHK.ping('PC1', 'R1', x.gw1, true)],
    solution: { cli: { R1: ['access-list ' + n + ' permit host ' + x.pc2, 'line vty 0 4', 'access-class ' + n + ' in'] } },
    hints: [T('access-class filters only remote logins to the router itself; transit traffic is not affected.', 'access-class фильтрует только удалённые входы на сам роутер; транзитный трафик не затрагивается.', 'access-class מסנן רק התחברויות מרחוק לנתב עצמו; תעבורה שעוברת דרכו לא מושפעת.'),
      T('Apply the same access-class to all vty lines you use (0 4, and 5 15 on switches) — otherwise a free line stays open.', 'Ставьте один access-class на все используемые линии vty (0 4, а на коммутаторах и 5 15) — иначе свободная линия останется открытой.', 'שמים את אותו access-class על כל קווי ה-vty בשימוש (0 4, ובמתגים גם 5 15) — אחרת קו פנוי נשאר פתוח.')],
  };
});

taskDef('ts-acl', 'trouble', 3, (rng) => {
  const x = secBase(rng);
  const name = rng.pick(ACL_NAMES);
  const fault = rng.pick(['nopermit', 'order', 'dir']);
  const pT = 'permit tcp ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv + ' eq www', dI = 'deny ip ' + x.lA.net + ' ' + x.wc + ' host ' + x.srv;
  const lines = fault === 'nopermit' ? ['10 ' + pT, '20 ' + dI] : fault === 'order' ? ['10 ' + dI, '20 ' + pT, '30 permit ip any any'] : ['10 ' + pT, '20 ' + dI, '30 permit ip any any'];
  const sol = fault === 'nopermit' ? ['ip access-list extended ' + name, '30 permit ip any any'] : fault === 'order' ? ['ip access-list extended ' + name, 'no 10', '25 ' + dI]
    : ['interface ' + x.r1lan, 'no ip access-group ' + name + ' out', 'ip access-group ' + name + ' in'];
  const F = {
    nopermit: T('The ACL had no "permit ip any any" at the end: the implicit "deny any" dropped all other traffic from LAN A, e.g. to PC3.', 'В конце ACL не было "permit ip any any": неявный "deny any" отбрасывал весь остальной трафик из LAN A, например к PC3.', 'בסוף ה-ACL לא היה "permit ip any any": ה-"deny any" הסמוי זרק את כל שאר התעבורה מ-LAN A, למשל ל-PC3.'),
    order: T('Line 10 "deny ip … host ' + x.srv + '" stood before the HTTP permit: the first match wins, so the web site was blocked too.', 'Строка 10 "deny ip … host ' + x.srv + '" стояла перед разрешением HTTP: срабатывает первое совпадение, поэтому сайт тоже был закрыт.', 'שורה 10 ‏"deny ip … host ' + x.srv + '" עמדה לפני ההיתר ל-HTTP: ההתאמה הראשונה קובעת, ולכן גם האתר נחסם.'),
    dir: T('The ACL was applied "out" on ' + sh(x.r1lan) + ' — towards LAN A — so it saw only replies and filtered nothing that LAN A sends. It belongs "in".', 'ACL был применён "out" на ' + sh(x.r1lan) + ' — в сторону LAN A, — поэтому видел только ответы и ничего из того, что шлёт LAN A, не фильтровал. Нужно "in".', 'ה-ACL הוחל "out" על ' + sh(x.r1lan) + ' — לכיוון LAN A — ולכן ראה רק תשובות ולא סינן שום דבר ש-LAN A שולחת. הוא צריך להיות "in".'),
  }[fault];
  return {
    title: T('Troubleshoot: the web-only ACL', 'Неисправность: ACL «только веб»', 'איתור תקלות: ACL "רק אתר"'),
    intro: T('Policy: LAN A may open only the web site (HTTP) on the server ' + x.srv + '; everything else to the server is denied; all other traffic is allowed. R1 has the extended ACL "' + name + '", but the policy does not work. Find and fix the mistake.',
      'Политика: LAN A может открывать на сервере ' + x.srv + ' только сайт (HTTP); всё остальное к серверу запрещено; прочий трафик разрешён. На R1 есть расширенный ACL "' + name + '", но политика не работает. Найдите и исправьте ошибку.',
      'המדיניות: ‏LAN A רשאית לפתוח בשרת ' + x.srv + ' רק את האתר (HTTP); כל השאר לשרת חסום; שאר התעבורה מותרת. ב-R1 יש ACL מורחב "' + name + '", אבל המדיניות לא עובדת. מצאו ותקנו את הטעות.'),
    steps: [
      T('Test from PC1: Web Browser → http://' + x.srv + ', ping ' + x.srv + ', ping PC3 ' + x.pc3 + '. Which one is wrong?', 'Проверьте с PC1: Web Browser → http://' + x.srv + ', ping ' + x.srv + ', ping PC3 ' + x.pc3 + '. Что работает не так?', 'בודקים מ-PC1: ‏Web Browser → http://' + x.srv + ', ‏ping ל-' + x.srv + ', ‏ping ל-PC3 ‏' + x.pc3 + '. מה לא עובד כמו שצריך?'),
      T('On R1: "show access-lists" (order of lines, match counters) and "show ip interface ' + sh(x.r1lan) + '" (inbound / outgoing access list).', 'На R1: "show access-lists" (порядок строк, счётчики) и "show ip interface ' + sh(x.r1lan) + '" (inbound / outgoing access list).', 'ב-R1: ‏"show access-lists" (סדר השורות, מונים) ו-"show ip interface ' + sh(x.r1lan) + '" ‏(inbound / outgoing access list).'),
      T('Fix the ACL or where it is applied, then repeat the three tests.', 'Исправьте ACL или место, где он применён, и повторите три проверки.', 'מתקנים את ה-ACL או את המקום שבו הוא מוחל, וחוזרים על שלוש הבדיקות.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); tCli(topo, 'R1', ['ip access-list extended ' + name, ...lines, 'exit', 'interface ' + x.r1lan, 'ip access-group ' + name + (fault === 'dir' ? ' out' : ' in')]); },
    checks: [CHK.aclApplied('R1', x.r1lan, 'in', name), CHK.flow('PC1', 'Server', x.srv, 'tcp', 80, true), CHK.ping('PC1', 'Server', x.srv, false), CHK.ping('PC2', 'PC3', x.pc3, true)],
    solution: { cli: { R1: sol } },
    faults: [F],
    hints: [T('An ACL is read top-down and stops at the first match; after the last line there is always an invisible "deny any".', 'ACL читается сверху вниз до первого совпадения; после последней строки всегда есть невидимый "deny any".', 'ACL נקרא מלמעלה למטה עד ההתאמה הראשונה; אחרי השורה האחרונה תמיד יש "deny any" בלתי נראה.')],
  };
});

// ================== NAT / PAT ==================
taskDef('nat-static', 'nat', 2, (rng) => {
  const x = natBase(rng);
  const ig = host(x.wan, rng.int(17, 29));
  return {
    title: T('Static NAT for a web server', 'Статический NAT для веб-сервера', 'NAT סטטי לשרת אינטרנט'),
    intro: T('The company web server has the private address ' + x.srv + '. It must be reachable from the Internet as ' + ig + ' (a public address from the provider block ' + x.wan.net + '/27). The provider ISP has no routes to private networks.',
      'Веб-сервер компании имеет частный адрес ' + x.srv + '. Из Интернета он должен быть доступен как ' + ig + ' (публичный адрес из блока провайдера ' + x.wan.net + '/27). У провайдера ISP нет маршрутов в частные сети.',
      'לשרת האינטרנט של החברה יש כתובת פרטית ' + x.srv + '. מהאינטרנט הוא צריך להיות נגיש כ-' + ig + ' (כתובת ציבורית מבלוק הספק ' + x.wan.net + '/27). לספק ISP אין נתיבים לרשתות פרטיות.'),
    steps: [
      T('R1: "ip nat inside source static ' + x.srv + ' ' + ig + '" (inside local → inside global).', 'R1: "ip nat inside source static ' + x.srv + ' ' + ig + '" (inside local → inside global).', 'R1: ‏"ip nat inside source static ' + x.srv + ' ' + ig + '" ‏(inside local ← inside global).'),
      T('Mark the interfaces: ' + sh(x.r1lan) + ' "ip nat inside", ' + sh(x.r1wan) + ' "ip nat outside".', 'Пометьте интерфейсы: ' + sh(x.r1lan) + ' "ip nat inside", ' + sh(x.r1wan) + ' "ip nat outside".', 'מסמנים את הממשקים: ' + sh(x.r1lan) + ' ‏"ip nat inside", ‏' + sh(x.r1wan) + ' ‏"ip nat outside".'),
      T('Verify: WEB → ping ' + ig + ' works; "show ip nat translations" shows the static entry and, during traffic, ICMP entries.', 'Проверка: WEB → ping ' + ig + ' проходит; "show ip nat translations" показывает статическую запись, а при трафике — записи ICMP.', 'בדיקה: ‏WEB → ping ל-' + ig + ' עובד; ‏"show ip nat translations" מראה את הרשומה הסטטית, ובזמן תעבורה גם רשומות ICMP.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.natIf('R1', x.r1lan, 'inside'), CHK.natIf('R1', x.r1wan, 'outside'), CHK.natStatic('R1', x.srv, ig), CHK.ping('WEB', 'Server', ig, true), CHK.natSeen('Server', x.webIp, ig)],
    solution: { cli: { R1: ['ip nat inside source static ' + x.srv + ' ' + ig].concat(x.nat()) } },
    hints: [T('Static NAT works both ways: outside hosts can start connections to ' + ig + '.', 'Статический NAT работает в обе стороны: снаружи можно начать соединение к ' + ig + '.', 'NAT סטטי עובד בשני הכיוונים: מבחוץ אפשר לפתוח חיבור אל ' + ig + '.'),
      T('R1 answers ARP for ' + ig + ' on the outside interface by itself — no extra configuration.', 'R1 сам отвечает на ARP за ' + ig + ' на внешнем интерфейсе — дополнительная настройка не нужна.', 'R1 עונה בעצמו ל-ARP עבור ' + ig + ' בממשק החיצוני — לא צריך הגדרה נוספת.')],
  };
});

taskDef('nat-dyn', 'nat', 3, (rng) => {
  const x = natBase(rng);
  const name = rng.pick(['NAT-POOL', 'PUBLIC', 'POOL1', 'INET']);
  const s = rng.int(5, 10), e = s + rng.int(3, 6), a = host(x.wan, s), b = host(x.wan, e);
  const n = rng.int(1, 99);
  return {
    title: T('Dynamic NAT with a pool', 'Динамический NAT с пулом', 'NAT דינמי עם מאגר'),
    intro: T('The provider gave the addresses ' + a + ' – ' + b + ' for users. Hosts of LAN ' + x.lA.net + '/' + x.lA.len + ' must reach the Internet (WEB ' + x.webIp + ') with an address from this pool.',
      'Провайдер выделил для пользователей адреса ' + a + ' – ' + b + '. Хосты сети ' + x.lA.net + '/' + x.lA.len + ' должны выходить в Интернет (WEB ' + x.webIp + ') с адресом из этого пула.',
      'הספק הקצה למשתמשים את הכתובות ' + a + ' – ' + b + '. מארחי הרשת ' + x.lA.net + '/' + x.lA.len + ' צריכים לצאת לאינטרנט (WEB ‏' + x.webIp + ') עם כתובת מהמאגר הזה.'),
    steps: [
      T('R1: "ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask ' + x.wan.mask + '".', 'R1: "ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask ' + x.wan.mask + '".', 'R1: ‏"ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask ' + x.wan.mask + '".'),
      T('Who may be translated: "access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '"; bind them: "ip nat inside source list ' + n + ' pool ' + name + '".', 'Кого транслировать: "access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '"; связать: "ip nat inside source list ' + n + ' pool ' + name + '".', 'את מי לתרגם: ‏"access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '"; לקשר: ‏"ip nat inside source list ' + n + ' pool ' + name + '".'),
      T('ip nat inside / outside on the interfaces. Ping WEB from PC1 and PC2, then "show ip nat translations" and "show ip nat statistics".', 'ip nat inside / outside на интерфейсах. Ping WEB с PC1 и PC2, затем "show ip nat translations" и "show ip nat statistics".', 'ip nat inside / outside בממשקים. ‏ping ל-WEB מ-PC1 ומ-PC2, ואז "show ip nat translations" ו-"show ip nat statistics".'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.natIf('R1', x.r1lan, 'inside'), CHK.natIf('R1', x.r1wan, 'outside'), CHK.natPool('R1', name, a, b), CHK.natSeen('PC1', x.webIp, [a, b]), CHK.ping('PC2', 'WEB', x.webIp, true)],
    solution: { cli: { R1: ['ip nat pool ' + name + ' ' + a + ' ' + b + ' netmask ' + x.wan.mask, 'access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc, 'ip nat inside source list ' + n + ' pool ' + name].concat(x.nat()) } },
    hints: [T('Without "overload" every inside host takes a whole public address: when the pool is empty, the next host gets no translation (misses in show ip nat statistics).', 'Без "overload" каждый внутренний хост занимает целый публичный адрес: когда пул кончится, следующий хост не транслируется (misses в show ip nat statistics).', 'בלי "overload" כל מארח פנימי תופס כתובת ציבורית שלמה: כשהמאגר נגמר, המארח הבא לא מתורגם (misses ב-show ip nat statistics).')],
  };
});

taskDef('nat-pat', 'nat', 2, (rng) => {
  const x = natBase(rng);
  const n = rng.int(1, 99), viaPool = rng.chance(0.35);
  const one = host(x.wan, rng.int(5, 20));
  const rule = viaPool ? ['ip nat pool OVLD ' + one + ' ' + one + ' netmask ' + x.wan.mask, 'access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc, 'ip nat inside source list ' + n + ' pool OVLD overload']
    : ['access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc, 'ip nat inside source list ' + n + ' interface ' + x.r1wan + ' overload'];
  const g = viaPool ? one : x.r1Pub;
  return {
    title: T('PAT (NAT overload)', 'PAT (NAT overload)', 'PAT ‏(NAT overload)'),
    intro: viaPool ? T('The whole LAN ' + x.lA.net + '/' + x.lA.len + ' must reach the Internet using ONE public address ' + one + ' (pool OVLD). Configure PAT on R1.', 'Вся сеть ' + x.lA.net + '/' + x.lA.len + ' должна выходить в Интернет через ОДИН публичный адрес ' + one + ' (пул OVLD). Настройте PAT на R1.', 'כל הרשת ' + x.lA.net + '/' + x.lA.len + ' צריכה לצאת לאינטרנט דרך כתובת ציבורית אחת ' + one + ' (מאגר OVLD). הגדירו PAT ב-R1.')
      : T('The whole LAN ' + x.lA.net + '/' + x.lA.len + ' must reach the Internet using the address of R1\'s outside interface ' + x.r1Pub + ' (PAT, NAT overload).', 'Вся сеть ' + x.lA.net + '/' + x.lA.len + ' должна выходить в Интернет под адресом внешнего интерфейса R1 ' + x.r1Pub + ' (PAT, NAT overload).', 'כל הרשת ' + x.lA.net + '/' + x.lA.len + ' צריכה לצאת לאינטרנט עם הכתובת של הממשק החיצוני של R1 ‏' + x.r1Pub + ' ‏(PAT, ‏NAT overload).'),
    steps: [
      T('"access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '" — the inside hosts to translate.', '"access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '" — какие внутренние хосты транслировать.', '"access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc + '" — אילו מארחים פנימיים לתרגם.'),
      viaPool ? T('"ip nat pool OVLD ' + one + ' ' + one + ' netmask ' + x.wan.mask + '" and "ip nat inside source list ' + n + ' pool OVLD overload".', '"ip nat pool OVLD ' + one + ' ' + one + ' netmask ' + x.wan.mask + '" и "ip nat inside source list ' + n + ' pool OVLD overload".', '"ip nat pool OVLD ' + one + ' ' + one + ' netmask ' + x.wan.mask + '" ו-"ip nat inside source list ' + n + ' pool OVLD overload".')
        : T('"ip nat inside source list ' + n + ' interface ' + x.r1wan + ' overload".', '"ip nat inside source list ' + n + ' interface ' + x.r1wan + ' overload".', '"ip nat inside source list ' + n + ' interface ' + x.r1wan + ' overload".'),
      T('ip nat inside on ' + sh(x.r1lan) + ', ip nat outside on ' + sh(x.r1wan) + '. Ping WEB from PC1 and PC2: in "show ip nat translations" both have the same inside global address and different port numbers.', 'ip nat inside на ' + sh(x.r1lan) + ', ip nat outside на ' + sh(x.r1wan) + '. Ping WEB с PC1 и PC2: в "show ip nat translations" у обоих одинаковый inside global и разные номера портов.', 'ip nat inside ב-' + sh(x.r1lan) + ', ‏ip nat outside ב-' + sh(x.r1wan) + '. ‏ping ל-WEB מ-PC1 ומ-PC2: ב-"show ip nat translations" לשניהם אותה inside global ומספרי פורטים שונים.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.natIf('R1', x.r1lan, 'inside'), CHK.natIf('R1', x.r1wan, 'outside'), CHK.natSeen('PC1', x.webIp, g), CHK.ping('PC1', 'WEB', x.webIp, true), CHK.ping('PC2', 'WEB', x.webIp, true)],
    solution: { cli: { R1: rule.concat(x.nat()) } },
    hints: [T('PAT tells the hosts apart by the port number (for ping — by the ICMP identifier).', 'PAT различает хосты по номеру порта (для ping — по идентификатору ICMP).', 'PAT מבדיל בין המארחים לפי מספר הפורט (ב-ping — לפי מזהה ה-ICMP).'),
      T('This is exactly what a home Wi-Fi router does on its Internet port.', 'Именно это делает домашний Wi-Fi-роутер на порту Internet.', 'זה בדיוק מה שנתב Wi-Fi ביתי עושה בפורט ה-Internet.')],
  };
});

taskDef('ts-nat', 'trouble', 3, (rng) => {
  const x = natBase(rng);
  const n = rng.int(1, 99);
  const fault = rng.pick(['swap', 'acl', 'noinside']);
  const parts = x.lA.net.split('.'); parts[2] = String((Number(parts[2]) % 250) + 1);
  const wrongNet = parts.join('.');
  const build = fault === 'swap' ? ['interface ' + x.r1lan, 'ip nat outside', 'interface ' + x.r1wan, 'ip nat inside']
    : fault === 'noinside' ? ['interface ' + x.r1wan, 'ip nat outside'] : x.nat();
  const aclLine = 'access-list ' + n + ' permit ' + (fault === 'acl' ? wrongNet : x.lA.net) + ' ' + x.wc;
  const sol = fault === 'swap' ? ['interface ' + x.r1lan, 'no ip nat outside', 'ip nat inside', 'interface ' + x.r1wan, 'no ip nat inside', 'ip nat outside']
    : fault === 'acl' ? ['no access-list ' + n, 'access-list ' + n + ' permit ' + x.lA.net + ' ' + x.wc] : ['interface ' + x.r1lan, 'ip nat inside'];
  const F = {
    swap: T('"ip nat inside" and "ip nat outside" were swapped: NAT translated in the wrong direction.', '"ip nat inside" и "ip nat outside" были перепутаны: NAT транслировал не в ту сторону.', '"ip nat inside" ו-"ip nat outside" הוחלפו: ה-NAT תרגם בכיוון הלא נכון.'),
    acl: T('ACL ' + n + ' permitted ' + wrongNet + ' instead of the real LAN ' + x.lA.net + ': the hosts were never translated.', 'ACL ' + n + ' разрешал ' + wrongNet + ' вместо настоящей сети ' + x.lA.net + ': хосты не транслировались.', 'ACL ‏' + n + ' התיר את ' + wrongNet + ' במקום הרשת האמיתית ' + x.lA.net + ': המארחים לא תורגמו.'),
    noinside: T('The LAN interface ' + sh(x.r1lan) + ' had no "ip nat inside": NAT needs both marks.', 'На интерфейсе LAN ' + sh(x.r1lan) + ' не было "ip nat inside": NAT нужны обе метки.', 'בממשק ה-LAN ‏' + sh(x.r1lan) + ' לא היה "ip nat inside": ה-NAT צריך את שני הסימונים.'),
  }[fault];
  return {
    title: T('Troubleshoot: no Internet behind PAT', 'Неисправность: нет Интернета за PAT', 'איתור תקלות: אין אינטרנט מאחורי PAT'),
    intro: T('R1 is configured for PAT on ' + sh(x.r1wan) + ', but PC1 and PC2 cannot reach WEB ' + x.webIp + '. R1 itself pings WEB fine. Find and fix the NAT mistake.',
      'На R1 настроен PAT через ' + sh(x.r1wan) + ', но PC1 и PC2 не достают до WEB ' + x.webIp + '. Сам R1 пингует WEB нормально. Найдите и исправьте ошибку NAT.',
      'ב-R1 מוגדר PAT דרך ' + sh(x.r1wan) + ', אבל PC1 ו-PC2 לא מגיעים ל-WEB ‏' + x.webIp + '. ‏R1 עצמו עושה ping ל-WEB בלי בעיה. מצאו ותקנו את טעות ה-NAT.'),
    steps: [
      T('On R1: "show ip nat statistics" (Outside / Inside interfaces, Hits / Misses), "show ip nat translations" while PC1 pings WEB.', 'На R1: "show ip nat statistics" (Outside / Inside interfaces, Hits / Misses), "show ip nat translations" во время ping с PC1.', 'ב-R1: ‏"show ip nat statistics" ‏(Outside / Inside interfaces, ‏Hits / Misses), ‏"show ip nat translations" בזמן ping מ-PC1.'),
      T('"show running-config": compare the ACL with the LAN address and the inside/outside marks with the topology.', '"show running-config": сравните ACL с адресом LAN, а метки inside/outside — со схемой.', '"show running-config": משווים את ה-ACL לכתובת ה-LAN ואת סימוני inside/outside לטופולוגיה.'),
      T('Fix it and ping WEB from both PCs.', 'Исправьте и пропингуйте WEB с обоих ПК.', 'מתקנים ועושים ping ל-WEB משני המחשבים.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); tCli(topo, 'R1', [aclLine, 'ip nat inside source list ' + n + ' interface ' + x.r1wan + ' overload'].concat(build)); },
    checks: [CHK.ping('PC1', 'WEB', x.webIp, true), CHK.ping('PC2', 'WEB', x.webIp, true), CHK.natSeen('PC1', x.webIp, x.r1Pub)],
    solution: { cli: { R1: sol } },
    faults: [F],
    hints: [T('Inside = toward your private LAN, outside = toward the provider.', 'Inside — в сторону своей частной LAN, outside — в сторону провайдера.', 'Inside — לכיוון ה-LAN הפרטית שלכם, outside — לכיוון הספק.')],
  };
});

// ================== Wi-Fi ==================
taskDef('wifi-home', 'wireless', 2, (rng) => {
  const n3 = rng.int(10, 250);
  const lan = { net: '192.168.' + n3 + '.0', len: 24, mask: '255.255.255.0' };
  const lanIp = host(lan, 1), start = rng.pick([50, 100, 120, 150]), max = rng.pick([20, 30, 40, 50]);
  const ssid = rng.pick(['HOME', 'MyHome', 'Family', 'Flat']) + '-' + rng.int(10, 99), pass = rng.pick(WIFI_PASS);
  const isp = { net: '209.165.' + rng.int(200, 210) + '.' + 8 * rng.int(1, 30), len: 29, mask: '255.255.255.248' };
  const web = { net: '198.51.100.0', len: 24, mask: '255.255.255.0' };
  const ispIp = host(isp, 1), webIp = host(web, 10);
  return {
    title: T('Home Wi-Fi with a WRT300N', 'Домашний Wi-Fi на WRT300N', 'Wi-Fi ביתי עם WRT300N'),
    intro: T('Set up the home router Linksys WRT300N: its Internet port already gets an address from the provider by DHCP. Change the LAN to ' + lan.net + '/24, protect the Wi-Fi with WPA2 and connect the laptop over Wi-Fi and PC0 over a cable.',
      'Настройте домашний роутер Linksys WRT300N: порт Internet уже получает адрес у провайдера по DHCP. Переведите LAN на ' + lan.net + '/24, защитите Wi-Fi через WPA2 и подключите ноутбук по Wi-Fi, а PC0 — кабелем.',
      'הגדירו את הנתב הביתי Linksys WRT300N: פורט ה-Internet כבר מקבל כתובת מהספק ב-DHCP. העבירו את ה-LAN ל-' + lan.net + '/24, הגנו על ה-Wi-Fi עם WPA2 וחברו את המחשב הנייד ב-Wi-Fi ואת PC0 בכבל.'),
    steps: [
      T('WR → GUI → Setup → Basic Setup: Router IP ' + lanIp + ' / 255.255.255.0; DHCP Server Enabled, Start IP .' + start + ', Maximum number of Users ' + max + ' → Save Settings.', 'WR → GUI → Setup → Basic Setup: Router IP ' + lanIp + ' / 255.255.255.0; DHCP Server Enabled, Start IP .' + start + ', Maximum number of Users ' + max + ' → Save Settings.', 'WR → GUI → Setup → Basic Setup: ‏Router IP ‏' + lanIp + ' / 255.255.255.0; ‏DHCP Server Enabled, ‏Start IP .' + start + ', ‏Maximum number of Users ' + max + ' → Save Settings.'),
      T('Wireless → Basic Wireless Settings: Network Name (SSID) "' + ssid + '" → Save; Wireless Security: WPA2 Personal, Passphrase "' + pass + '" → Save.', 'Wireless → Basic Wireless Settings: Network Name (SSID) "' + ssid + '" → Save; Wireless Security: WPA2 Personal, Passphrase "' + pass + '" → Save.', 'Wireless → Basic Wireless Settings: ‏Network Name (SSID) ‏"' + ssid + '" → Save; ‏Wireless Security: ‏WPA2 Personal, ‏Passphrase ‏"' + pass + '" → Save.'),
      T('Laptop0 → Physical: power off, replace PT-LAPTOP-NM-1CFE with WPC300N, power on. Desktop → PC Wireless → Connect → ' + ssid + ' → key → Connect; IP Configuration: DHCP.', 'Laptop0 → Physical: выключить, заменить PT-LAPTOP-NM-1CFE на WPC300N, включить. Desktop → PC Wireless → Connect → ' + ssid + ' → ключ → Connect; IP Configuration: DHCP.', 'Laptop0 → Physical: מכבים, מחליפים את PT-LAPTOP-NM-1CFE ב-WPC300N, מדליקים. ‏Desktop → PC Wireless → Connect → ' + ssid + ' → מפתח → Connect; ‏IP Configuration: DHCP.'),
      T('PC0 (cable to Ethernet 1): DHCP. Verify: Laptop0 → Web Browser → http://' + webIp + ' opens (PAT on the Internet port).', 'PC0 (кабель в Ethernet 1): DHCP. Проверка: Laptop0 → Web Browser → http://' + webIp + ' открывается (PAT на порту Internet).', 'PC0 (כבל ל-Ethernet 1): ‏DHCP. בדיקה: ‏Laptop0 → Web Browser → http://' + webIp + ' נפתח (PAT בפורט ה-Internet).'),
    ],
    table: [{ dev: 'WR', iface: 'LAN', ip: lanIp, mask: lan.mask, gw: '' }, { dev: 'WR', iface: 'Internet', ip: 'DHCP (ISP)', mask: '', gw: '' }, rowIf('ISP', 'GigabitEthernet0/0', ispIp, isp.mask), rowPc('WEB', webIp, web.mask, host(web, 1)),
      { dev: 'Laptop0', iface: 'Wireless0', ip: 'DHCP', mask: '', gw: '' }, { dev: 'PC0', iface: 'NIC', ip: 'DHCP', mask: '', gw: '' }],
    build(topo) {
      tAdd(topo, '2911', 'ISP', 600, 140); tAdd(topo, 'Server', 'WEB', 800, 140); tAdd(topo, 'WRT300N', 'WR', 380, 220);
      tAdd(topo, 'Laptop', 'Laptop0', 220, 380); tAdd(topo, 'PC', 'PC0', 460, 400);
      tLink(topo, 'ISP', 'GigabitEthernet0/1', 'WEB', 'FastEthernet0'); tLink(topo, 'WR', 'Internet', 'ISP', 'GigabitEthernet0/0'); tLink(topo, 'PC0', 'FastEthernet0', 'WR', 'Ethernet 1');
      tHostname(topo, ['ISP']);
      tCli(topo, 'ISP', ['interface GigabitEthernet0/0', 'ip address ' + ispIp + ' ' + isp.mask, 'no shutdown', 'interface GigabitEthernet0/1', 'ip address ' + host(web, 1) + ' ' + web.mask, 'no shutdown',
        'ip dhcp excluded-address ' + ispIp, 'ip dhcp pool HOME', 'network ' + isp.net + ' ' + isp.mask, 'default-router ' + ispIp, 'dns-server ' + webIp]);
      tPc(topo, 'WEB', webIp, web.mask, host(web, 1));
    },
    checks: [CHK.homeLan('WR', lanIp, lan.mask), CHK.homeDhcp('WR', start, max), CHK.wifiAp('WR', ssid, 'wpa2', pass), CHK.wifiNic('Laptop0', 'WPC300N'), CHK.wifiAssoc('Laptop0', 'WR'),
      CHK.dhcpClient('Laptop0', lan, start), CHK.dhcpClient('PC0', lan, start), CHK.flow('Laptop0', 'WEB', webIp, 'tcp', 80, true)],
    solution: { wifi: { WR: { kind: 'home', lanIp, lanMask: lan.mask, dhcpStart: start, dhcpMax: max, ssid, security: 'wpa2', pass }, Laptop0: { kind: 'client', module: 'WPC300N', ssid, security: 'wpa2', pass } },
      pc: { Laptop0: { dhcp: true }, PC0: { dhcp: true } } },
    hints: [T('After you change the Router IP, the clients keep their old addresses until they renew: click DHCP again or run "ipconfig /renew".', 'После смены Router IP клиенты держат старые адреса, пока не обновят их: снова нажмите DHCP или выполните "ipconfig /renew".', 'אחרי שינוי Router IP הלקוחות שומרים את הכתובות הישנות עד שהם מחדשים: לוחצים שוב DHCP או מריצים "ipconfig /renew".'),
      T('The GUI tab is the same web interface you would open in a browser at http://' + lanIp + ' (user admin, password admin).', 'Вкладка GUI — тот же веб-интерфейс, что открывается в браузере по http://' + lanIp + ' (логин admin, пароль admin).', 'לשונית GUI היא אותו ממשק אינטרנט שנפתח בדפדפן בכתובת http://' + lanIp + ' (משתמש admin, סיסמה admin).')],
  };
});

taskDef('wifi-ap', 'wireless', 2, (rng) => {
  const sp = subnetPool(rng);
  const lA = sp.lan(0), lB = sp.lan(1);
  const m = rng.pick(ROUTER_MODELS);
  const r1lan = gi(m, 0), r1srv = gi(m, 1);
  const gw = host(lA, 1), gwB = host(lB, 1), srv = host(lB, 10);
  const ssid = rng.pick(['OFFICE', 'STAFF', 'CORP', 'LAB']) + '-' + rng.int(10, 99), pass = rng.pick(WIFI_PASS), ch = rng.pick([1, 6, 11]);
  return {
    title: T('Access point in an office LAN', 'Точка доступа в офисной сети', 'נקודת גישה ברשת משרדית'),
    intro: T('R1 is the gateway and the DHCP server of the office LAN ' + lA.net + '/24. Add Wi-Fi: the AccessPoint-PT on S1 must broadcast "' + ssid + '" on channel ' + ch + ' with WPA2-PSK. Laptop1 and PC2 must work over Wi-Fi and reach the server ' + srv + '.',
      'R1 — шлюз и DHCP-сервер офисной сети ' + lA.net + '/24. Добавьте Wi-Fi: AccessPoint-PT на S1 должна вещать "' + ssid + '" на канале ' + ch + ' с WPA2-PSK. Laptop1 и PC2 должны работать по Wi-Fi и доставать до сервера ' + srv + '.',
      'R1 הוא השער ושרת ה-DHCP של רשת המשרד ' + lA.net + '/24. הוסיפו Wi-Fi: ה-AccessPoint-PT שעל S1 צריכה לשדר "' + ssid + '" בערוץ ' + ch + ' עם WPA2-PSK. ‏Laptop1 ו-PC2 צריכים לעבוד ב-Wi-Fi ולהגיע לשרת ' + srv + '.'),
    steps: [
      T('AP → Config → Port 1: SSID "' + ssid + '", 2.4 GHz Channel ' + ch + ', Authentication WPA2-PSK, PSK Pass Phrase "' + pass + '".', 'AP → Config → Port 1: SSID "' + ssid + '", 2.4 GHz Channel ' + ch + ', Authentication WPA2-PSK, PSK Pass Phrase "' + pass + '".', 'AP → Config → Port 1: ‏SSID ‏"' + ssid + '", ‏2.4 GHz Channel ' + ch + ', ‏Authentication WPA2-PSK, ‏PSK Pass Phrase ‏"' + pass + '".'),
      T('Laptop1: power off → WPC300N → power on; PC2: power off → WMP300N → power on.', 'Laptop1: выключить → WPC300N → включить; PC2: выключить → WMP300N → включить.', 'Laptop1: לכבות → WPC300N → להדליק; ‏PC2: לכבות → WMP300N → להדליק.'),
      T('On both: Config → Wireless0 (or Desktop → PC Wireless) — SSID, WPA2-PSK, the same pass phrase; IP Configuration → DHCP. Then ping ' + srv + '.', 'На обоих: Config → Wireless0 (или Desktop → PC Wireless) — SSID, WPA2-PSK, тот же пароль; IP Configuration → DHCP. Затем ping ' + srv + '.', 'בשניהם: ‏Config → Wireless0 (או Desktop → PC Wireless) — ‏SSID, ‏WPA2-PSK, אותה סיסמה; ‏IP Configuration → DHCP. ואז ping ל-' + srv + '.'),
    ],
    table: [rowIf('R1', r1lan, gw, lA.mask), rowIf('R1', r1srv, gwB, lB.mask), rowPc('Server', srv, lB.mask, gwB), { dev: 'AP', iface: 'Port 1', ip: 'SSID ' + ssid, mask: 'ch ' + ch, gw: '' },
      { dev: 'Laptop1 / PC2', iface: 'Wireless0', ip: 'DHCP', mask: '', gw: '' }, rowPc('PC1', host(lA, 20), lA.mask, gw)],
    build(topo) {
      tAdd(topo, m, 'R1', 420, 120); tAdd(topo, 'Server', 'Server', 700, 120); tAdd(topo, '2960', 'S1', 420, 250); tAdd(topo, 'AccessPoint-PT', 'AP', 600, 300);
      tAdd(topo, 'PC', 'PC1', 240, 380); tAdd(topo, 'Laptop', 'Laptop1', 560, 440); tAdd(topo, 'PC', 'PC2', 760, 430);
      tLink(topo, 'R1', r1lan, 'S1', 'GigabitEthernet0/1'); tLink(topo, 'R1', r1srv, 'Server', 'FastEthernet0'); tLink(topo, 'PC1', 'FastEthernet0', 'S1', fa(1)); tLink(topo, 'AP', 'Port 0', 'S1', fa(2));
      tHostname(topo, ['R1', 'S1']);
      tCli(topo, 'R1', ['interface ' + r1lan, 'ip address ' + gw + ' ' + lA.mask, 'no shutdown', 'interface ' + r1srv, 'ip address ' + gwB + ' ' + lB.mask, 'no shutdown',
        'ip dhcp excluded-address ' + gw + ' ' + host(lA, 10), 'ip dhcp pool OFFICE', 'network ' + lA.net + ' ' + lA.mask, 'default-router ' + gw]);
      tPc(topo, 'PC1', host(lA, 20), lA.mask, gw); tPc(topo, 'Server', srv, lB.mask, gwB);
    },
    checks: [CHK.wifiAp('AP', ssid, 'wpa2', pass, ch, true), CHK.wifiNic('Laptop1', 'WPC300N'), CHK.wifiNic('PC2', 'WMP300N'), CHK.wifiAssoc('Laptop1', 'AP'), CHK.wifiAssoc('PC2', 'AP'),
      CHK.dhcpClient('Laptop1', lA, 11), CHK.ping('PC2', 'Server', srv, true)],
    solution: { wifi: { AP: { kind: 'ap', ssid, security: 'wpa2', pass, channel: ch }, Laptop1: { kind: 'client', module: 'WPC300N', ssid, security: 'wpa2', pass }, PC2: { kind: 'client', module: 'WMP300N', ssid, security: 'wpa2', pass } },
      pc: { Laptop1: { dhcp: true }, PC2: { dhcp: true } } },
    hints: [T('An access point is a bridge: it has no IP routing and no DHCP — the clients get addresses from R1 through it.', 'Точка доступа — это мост: у неё нет маршрутизации и DHCP — клиенты получают адреса у R1 через неё.', 'נקודת גישה היא גשר: אין לה ניתוב ואין DHCP — הלקוחות מקבלים כתובות מ-R1 דרכה.'),
      T('Channels 1, 6 and 11 do not overlap — neighbouring access points use different ones.', 'Каналы 1, 6 и 11 не перекрываются — соседние точки доступа ставят на разные.', 'הערוצים 1, 6 ו-11 לא חופפים — נקודות גישה שכנות משתמשות בערוצים שונים.')],
  };
});

// ================== Сеть с нуля ==================
// Все устройства стоят на столе без кабелей и без настроек. Провайдер (ISP + WEB) уже работает.
taskDef('scratch-campus', 'scratch', 3, (rng) => {
  const [vA, vB, vW] = rng.pick([[10, 20, 30], [10, 20, 40], [100, 200, 50], [11, 22, 33], [15, 25, 35]]);
  const vM = 99;
  const third = (v) => (v > 255 ? v / 10 : v);
  const net = (v) => ({ net: '192.168.' + third(v) + '.0', len: 24, mask: '255.255.255.0' });
  const nA = net(vA), nB = net(vB), nW = net(vW), nM = net(vM);
  const nameA = rng.pick(['Sales', 'Office', 'Staff']), nameB = rng.pick(['Engineering', 'IT', 'Accounting']), nameW = 'Wireless', nameM = 'Management';
  const srvNet = { net: '172.16.' + rng.int(1, 250) + '.0', len: 24, mask: '255.255.255.0' };
  const p2p = { net: '10.' + rng.int(0, 9) + '.' + rng.int(0, 250) + '.' + 4 * rng.int(0, 60), len: 30, mask: '255.255.255.252' };
  const wan = { net: '209.165.' + rng.pick([200, 201, 202]) + '.' + 4 * rng.int(56, 62), len: 30, mask: '255.255.255.252' };
  const web = { net: '198.51.100.0', len: 24, mask: '255.255.255.0' };
  const ispIp = host(wan, 1), r1Pub = host(wan, 2), webIp = host(web, 10), srv = host(srvNet, 10), s1Mgmt = host(nM, 11);
  const proto = rng.pick(['LACP', 'PAgP']), g = rng.int(1, 6), ecMode = proto === 'LACP' ? 'active' : 'desirable';
  const ssid = 'CAMPUS-' + rng.int(10, 99), pass = rng.pick(WIFI_PASS);
  const aclName = rng.pick(['GUEST-FILTER', 'WLAN-IN', 'NO-GUEST-SRV']);
  const R1 = { wan: 'GigabitEthernet0/0/0', trunk: 'GigabitEthernet0/0/1', r2: 'GigabitEthernet0/0/2' };
  const sub = (v) => R1.trunk + '.' + v;
  const wc = '0.0.0.255';
  const vlanCmds = [['vlan ' + vA, 'name ' + nameA], ['vlan ' + vB, 'name ' + nameB], ['vlan ' + vW, 'name ' + nameW], ['vlan ' + vM, 'name ' + nameM]].flat();
  const allV = [1, vA, vB, vW, vM].sort((a, b) => a - b).join(',');
  const subCmds = [[vA, nA], [vB, nB], [vW, nW], [vM, nM]].flatMap(([v, n]) => ['interface ' + sub(v), 'encapsulation dot1Q ' + v, 'ip address ' + host(n, 1) + ' ' + n.mask, 'ip nat inside'].concat(v === vW ? ['ip access-group ' + aclName + ' in'] : []));
  const pools = [[vA, nA], [vB, nB], [vW, nW]].flatMap(([v, n]) => ['ip dhcp excluded-address ' + host(n, 1) + ' ' + host(n, 10), 'ip dhcp pool VLAN' + v, 'network ' + n.net + ' ' + n.mask, 'default-router ' + host(n, 1), 'dns-server ' + webIp]);
  const cli = {
    R1: ['hostname R1', 'interface ' + R1.wan, 'ip address ' + r1Pub + ' ' + wan.mask, 'ip nat outside', 'no shutdown', 'interface ' + R1.trunk, 'no shutdown', ...subCmds,
      'interface ' + R1.r2, 'ip address ' + host(p2p, 1) + ' ' + p2p.mask, 'ip nat inside', 'no shutdown', ...pools,
      'ip access-list extended ' + aclName, 'deny ip ' + nW.net + ' ' + wc + ' ' + srvNet.net + ' ' + wc, 'permit ip any any', 'exit',
      'access-list 1 permit 192.168.0.0 0.0.255.255', 'access-list 1 permit ' + srvNet.net + ' ' + wc, 'ip nat inside source list 1 interface ' + R1.wan + ' overload',
      'ip route 0.0.0.0 0.0.0.0 ' + ispIp, 'router ospf 1', 'router-id 1.1.1.1', 'network ' + p2p.net + ' 0.0.0.3 area 0', 'network 192.168.0.0 0.0.255.255 area 0', 'default-information originate'],
    R2: ['hostname R2', 'interface GigabitEthernet0/1', 'ip address ' + host(p2p, 2) + ' ' + p2p.mask, 'no shutdown', 'interface GigabitEthernet0/0', 'ip address ' + host(srvNet, 1) + ' ' + srvNet.mask, 'no shutdown',
      'router ospf 1', 'router-id 2.2.2.2', 'network ' + p2p.net + ' 0.0.0.3 area 0', 'network ' + srvNet.net + ' ' + wc + ' area 0'],
    S1: ['hostname S1', ...vlanCmds, 'interface GigabitEthernet0/1', 'switchport mode trunk', 'interface range Fa0/23 - 24', 'channel-group ' + g + ' mode ' + ecMode, 'interface port-channel ' + g, 'switchport mode trunk',
      'interface FastEthernet0/21', 'switchport mode trunk', 'spanning-tree vlan ' + allV + ' root primary', 'interface vlan ' + vM, 'ip address ' + s1Mgmt + ' ' + nM.mask, 'no shutdown', 'ip default-gateway ' + host(nM, 1)],
    S2: ['hostname S2', ...vlanCmds, 'interface range Fa0/23 - 24', 'channel-group ' + g + ' mode ' + ecMode, 'interface port-channel ' + g, 'switchport mode trunk', 'interface FastEthernet0/22', 'switchport mode trunk',
      'interface FastEthernet0/1', 'switchport mode access', 'switchport access vlan ' + vA, 'spanning-tree portfast', 'spanning-tree bpduguard enable', 'switchport port-security', 'switchport port-security maximum 2', 'switchport port-security mac-address sticky',
      'interface FastEthernet0/2', 'switchport mode access', 'switchport access vlan ' + vW],
    S3: ['hostname S3', ...vlanCmds, 'interface range Fa0/21 - 22', 'switchport mode trunk', 'interface FastEthernet0/1', 'switchport mode access', 'switchport access vlan ' + vB, 'spanning-tree portfast', 'spanning-tree bpduguard enable'],
  };
  const links = [['R1', R1.wan, 'ISP', 'GigabitEthernet0/0'], ['R1', R1.trunk, 'S1', 'GigabitEthernet0/1'], ['R1', R1.r2, 'R2', 'GigabitEthernet0/1'], ['R2', 'GigabitEthernet0/0', 'Server', 'FastEthernet0'],
    ['S1', fa(23), 'S2', fa(23)], ['S1', fa(24), 'S2', fa(24)], ['S1', fa(21), 'S3', fa(21)], ['S2', fa(22), 'S3', fa(22)],
    ['PC1', 'FastEthernet0', 'S2', fa(1)], ['PC2', 'FastEthernet0', 'S3', fa(1)], ['AP', 'Port 0', 'S2', fa(2)]];
  const L = (en, ru, he) => T(en, ru, he);
  return {
    title: T('Build the campus network from scratch', 'Построить сеть кампуса с нуля', 'בניית רשת הקמפוס מאפס'),
    intro: T('Everything is on the desk but nothing is cabled or configured. Only the provider (ISP and its WEB server) already works. Build the whole network from the table and the steps: cables (FastEthernet to hosts, GigabitEthernet between routers and to the core), VLANs and trunks, EtherChannel, Spanning Tree, router-on-a-stick, DHCP, OSPF, PAT to the Internet, an ACL for the wireless guests, Port Security and Wi-Fi.',
      'Всё стоит на столе, но ничего не подключено и не настроено. Работает только провайдер (ISP и его сервер WEB). Постройте всю сеть по таблице и шагам: кабели (FastEthernet к хостам, GigabitEthernet между роутерами и к ядру), VLAN и trunk, EtherChannel, Spanning Tree, router-on-a-stick, DHCP, OSPF, PAT в Интернет, ACL для беспроводных гостей, Port Security и Wi-Fi.',
      'הכול על השולחן, אבל שום דבר לא מחובר ולא מוגדר. רק הספק (ISP ושרת ה-WEB שלו) כבר עובד. בנו את כל הרשת לפי הטבלה והצעדים: כבלים (FastEthernet למארחים, ‏GigabitEthernet בין הנתבים ולליבה), ‏VLAN ו-trunk, ‏EtherChannel, ‏Spanning Tree, ‏router-on-a-stick, ‏DHCP, ‏OSPF, ‏PAT לאינטרנט, ‏ACL לאורחי ה-Wi-Fi, ‏Port Security ו-Wi-Fi.'),
    steps: [
      L('1. Cables: R1 G0/0/0–ISP G0/0, R1 G0/0/1–S1 G0/1, R1 G0/0/2–R2 G0/1, R2 G0/0–Server; S1 Fa0/23–24 ↔ S2 Fa0/23–24 (two links), S1 Fa0/21–S3 Fa0/21, S2 Fa0/22–S3 Fa0/22; PC1–S2 Fa0/1, AP Port 0–S2 Fa0/2, PC2–S3 Fa0/1.',
        '1. Кабели: R1 G0/0/0–ISP G0/0, R1 G0/0/1–S1 G0/1, R1 G0/0/2–R2 G0/1, R2 G0/0–Server; S1 Fa0/23–24 ↔ S2 Fa0/23–24 (два линка), S1 Fa0/21–S3 Fa0/21, S2 Fa0/22–S3 Fa0/22; PC1–S2 Fa0/1, AP Port 0–S2 Fa0/2, PC2–S3 Fa0/1.',
        '1. כבלים: ‏R1 G0/0/0–ISP G0/0, ‏R1 G0/0/1–S1 G0/1, ‏R1 G0/0/2–R2 G0/1, ‏R2 G0/0–Server; ‏S1 Fa0/23–24 ↔ S2 Fa0/23–24 (שני קישורים), ‏S1 Fa0/21–S3 Fa0/21, ‏S2 Fa0/22–S3 Fa0/22; ‏PC1–S2 Fa0/1, ‏AP Port 0–S2 Fa0/2, ‏PC2–S3 Fa0/1.'),
      L('2. Switches S1–S3: hostnames, VLAN ' + vA + ' ' + nameA + ', ' + vB + ' ' + nameB + ', ' + vW + ' ' + nameW + ', ' + vM + ' ' + nameM + '. Links between switches and S1 G0/1 — "switchport mode trunk".',
        '2. Коммутаторы S1–S3: имена, VLAN ' + vA + ' ' + nameA + ', ' + vB + ' ' + nameB + ', ' + vW + ' ' + nameW + ', ' + vM + ' ' + nameM + '. Линки между коммутаторами и S1 G0/1 — "switchport mode trunk".',
        '2. מתגים S1–S3: שמות, ‏VLAN ' + vA + ' ' + nameA + ', ' + vB + ' ' + nameB + ', ' + vW + ' ' + nameW + ', ' + vM + ' ' + nameM + '. הקישורים בין המתגים ו-S1 G0/1 — ‏"switchport mode trunk".'),
      L('3. EtherChannel ' + g + ' (' + proto + ', mode ' + ecMode + ') on S1/S2 Fa0/23–24, Port-channel ' + g + ' as trunk. S1 is the STP root for all VLANs ("spanning-tree vlan ' + allV + ' root primary").',
        '3. EtherChannel ' + g + ' (' + proto + ', режим ' + ecMode + ') на S1/S2 Fa0/23–24, Port-channel ' + g + ' — trunk. S1 — корень STP для всех VLAN ("spanning-tree vlan ' + allV + ' root primary").',
        '3. ‏EtherChannel ' + g + ' ‏(' + proto + ', מצב ' + ecMode + ') ב-S1/S2 Fa0/23–24, ‏Port-channel ' + g + ' כ-trunk. ‏S1 הוא ה-root של STP לכל ה-VLAN ‏("spanning-tree vlan ' + allV + ' root primary").'),
      L('4. Access ports: S2 Fa0/1 VLAN ' + vA + ' (PortFast, BPDU Guard, Port Security maximum 2 sticky), S2 Fa0/2 VLAN ' + vW + ' (access point), S3 Fa0/1 VLAN ' + vB + ' (PortFast, BPDU Guard). S1: interface vlan ' + vM + ' ' + s1Mgmt + '/24, ip default-gateway ' + host(nM, 1) + '.',
        '4. Access-порты: S2 Fa0/1 VLAN ' + vA + ' (PortFast, BPDU Guard, Port Security maximum 2 sticky), S2 Fa0/2 VLAN ' + vW + ' (точка доступа), S3 Fa0/1 VLAN ' + vB + ' (PortFast, BPDU Guard). S1: interface vlan ' + vM + ' ' + s1Mgmt + '/24, ip default-gateway ' + host(nM, 1) + '.',
        '4. פורטי access: ‏S2 Fa0/1 ‏VLAN ' + vA + ' ‏(PortFast, ‏BPDU Guard, ‏Port Security maximum 2 sticky), ‏S2 Fa0/2 ‏VLAN ' + vW + ' (נקודת הגישה), ‏S3 Fa0/1 ‏VLAN ' + vB + ' ‏(PortFast, ‏BPDU Guard). ‏S1: ‏interface vlan ' + vM + ' ' + s1Mgmt + '/24, ‏ip default-gateway ' + host(nM, 1) + '.'),
      L('5. R1: subinterfaces G0/0/1.' + vA + ', .' + vB + ', .' + vW + ', .' + vM + ' (encapsulation dot1Q, gateway .1 of each subnet); DHCP pools for VLAN ' + vA + ', ' + vB + ', ' + vW + ' (exclude .1–.10, DNS ' + webIp + ').',
        '5. R1: подынтерфейсы G0/0/1.' + vA + ', .' + vB + ', .' + vW + ', .' + vM + ' (encapsulation dot1Q, шлюз .1 каждой подсети); DHCP-пулы для VLAN ' + vA + ', ' + vB + ', ' + vW + ' (исключить .1–.10, DNS ' + webIp + ').',
        '5. ‏R1: תת-ממשקים G0/0/1.' + vA + ', .' + vB + ', .' + vW + ', .' + vM + ' ‏(encapsulation dot1Q, שער .1 בכל תת-רשת); מאגרי DHCP ל-VLAN ' + vA + ', ' + vB + ', ' + vW + ' (להחריג .1–.10, ‏DNS ' + webIp + ').'),
      L('6. Routing: R1–R2 link ' + p2p.net + '/30, R2 LAN ' + srvNet.net + '/24 (Server ' + srv + ', static). OSPF process 1 area 0 on R1 and R2; R1 has "ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" and "default-information originate".',
        '6. Маршрутизация: линк R1–R2 ' + p2p.net + '/30, LAN R2 ' + srvNet.net + '/24 (Server ' + srv + ', статический). OSPF процесс 1 area 0 на R1 и R2; на R1 "ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" и "default-information originate".',
        '6. ניתוב: הקישור R1–R2 ‏' + p2p.net + '/30, ה-LAN של R2 ‏' + srvNet.net + '/24 ‏(Server ' + srv + ', סטטי). ‏OSPF תהליך 1 ‏area 0 ב-R1 וב-R2; ב-R1 ‏"ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" ו-"default-information originate".'),
      L('7. Internet: R1 G0/0/0 ' + r1Pub + '/30, PAT "overload" on it for 192.168.0.0/16 and ' + srvNet.net + '/24. ACL "' + aclName + '" on G0/0/1.' + vW + ' in: wireless guests must not reach ' + srvNet.net + '/24, everything else allowed.',
        '7. Интернет: R1 G0/0/0 ' + r1Pub + '/30, PAT "overload" через него для 192.168.0.0/16 и ' + srvNet.net + '/24. ACL "' + aclName + '" на G0/0/1.' + vW + ' in: беспроводные гости не должны попадать в ' + srvNet.net + '/24, остальное разрешено.',
        '7. אינטרנט: ‏R1 G0/0/0 ‏' + r1Pub + '/30, ‏PAT ‏"overload" דרכו ל-192.168.0.0/16 ול-' + srvNet.net + '/24. ‏ACL ‏"' + aclName + '" על G0/0/1.' + vW + ' in: אורחי ה-Wi-Fi לא יגיעו ל-' + srvNet.net + '/24, כל השאר מותר.'),
      L('8. Wi-Fi: AP → Port 1: SSID "' + ssid + '", WPA2-PSK "' + pass + '". Laptop: WPC300N (power off/on), connect, DHCP. PC1 and PC2: DHCP. Verify with ping, tracert and the Web Browser (http://' + webIp + ').',
        '8. Wi-Fi: AP → Port 1: SSID "' + ssid + '", WPA2-PSK "' + pass + '". Laptop: WPC300N (выключить/включить), подключиться, DHCP. PC1 и PC2: DHCP. Проверка: ping, tracert и Web Browser (http://' + webIp + ').',
        '8. ‏Wi-Fi: ‏AP → Port 1: ‏SSID ‏"' + ssid + '", ‏WPA2-PSK ‏"' + pass + '". ‏Laptop: ‏WPC300N (לכבות/להדליק), להתחבר, ‏DHCP. ‏PC1 ו-PC2: ‏DHCP. בדיקה: ‏ping, ‏tracert ו-Web Browser ‏(http://' + webIp + ').'),
    ],
    table: [rowIf('R1', R1.wan, r1Pub, wan.mask), rowIf('R1', sub(vA), host(nA, 1), nA.mask), rowIf('R1', sub(vB), host(nB, 1), nB.mask), rowIf('R1', sub(vW), host(nW, 1), nW.mask), rowIf('R1', sub(vM), host(nM, 1), nM.mask),
      rowIf('R1', R1.r2, host(p2p, 1), p2p.mask), rowIf('R2', 'GigabitEthernet0/1', host(p2p, 2), p2p.mask), rowIf('R2', 'GigabitEthernet0/0', host(srvNet, 1), srvNet.mask), rowPc('Server', srv, srvNet.mask, host(srvNet, 1)),
      { dev: 'S1', iface: 'Vlan' + vM, ip: s1Mgmt, mask: nM.mask, gw: host(nM, 1) }, { dev: 'PC1 / PC2 / Laptop', iface: 'NIC', ip: 'DHCP', mask: 'VLAN ' + vA + ' / ' + vB + ' / ' + vW, gw: '' },
      rowIf('ISP', 'GigabitEthernet0/0', ispIp, wan.mask), rowPc('WEB', webIp, web.mask, host(web, 1))],
    build(topo) {
      tAdd(topo, '2911', 'ISP', 120, 90); tAdd(topo, 'Server', 'WEB', 120, 230);
      tAdd(topo, '4331', 'R1', 400, 90); tAdd(topo, '1941', 'R2', 700, 90); tAdd(topo, 'Server', 'Server', 880, 200);
      tAdd(topo, '2960', 'S1', 400, 230); tAdd(topo, '2960', 'S2', 260, 370); tAdd(topo, '2960', 'S3', 560, 370);
      tAdd(topo, 'PC', 'PC1', 140, 500); tAdd(topo, 'AccessPoint-PT', 'AP', 330, 500); tAdd(topo, 'Laptop', 'Laptop', 460, 560); tAdd(topo, 'PC', 'PC2', 620, 500);
      tLink(topo, 'ISP', 'GigabitEthernet0/1', 'WEB', 'FastEthernet0');
      tHostname(topo, ['ISP']);
      tCli(topo, 'ISP', ['interface GigabitEthernet0/0', 'ip address ' + ispIp + ' ' + wan.mask, 'no shutdown', 'interface GigabitEthernet0/1', 'ip address ' + host(web, 1) + ' ' + web.mask, 'no shutdown']);
      tPc(topo, 'WEB', webIp, web.mask, host(web, 1));
    },
    checks: [
      CHK.link('R1', R1.trunk, 'S1', 'GigabitEthernet0/1'), CHK.link('R1', R1.wan, 'ISP', 'GigabitEthernet0/0'),
      CHK.vlan('S2', vA, nameA), CHK.vlan('S3', vB, nameB), CHK.access('S2', fa(1), vA), CHK.access('S3', fa(1), vB), CHK.access('S2', fa(2), vW),
      CHK.trunk('S1', 'GigabitEthernet0/1'), CHK.ecUp('S1', g, 2, proto), CHK.stpRoot('S1', vA),
      CHK.portfast('S2', fa(1)), CHK.bpduguard('S3', fa(1)), CHK.psec('S2', fa(1), { max: 2, sticky: true }),
      CHK.subif('R1', sub(vA), vA, host(nA, 1), nA.mask), CHK.dhcpClient('PC1', nA, 11), CHK.dhcpClient('PC2', nB, 11),
      CHK.ospfNbrs('R1', 1), CHK.ospfDefault('R2'), CHK.natSeen('PC1', webIp, r1Pub),
      CHK.wifiAp('AP', ssid, 'wpa2', pass, null, true), CHK.wifiAssoc('Laptop', 'AP'), CHK.dhcpClient('Laptop', nW, 11),
      CHK.ping('Laptop', 'Server', srv, false), CHK.ping('PC2', 'Server', srv, true), CHK.flow('Laptop', 'WEB', webIp, 'tcp', 80, true), CHK.ping('PC1', 'S1', s1Mgmt, true),
    ],
    solution: { links, cli, wifi: { AP: { kind: 'ap', ssid, security: 'wpa2', pass }, Laptop: { kind: 'client', module: 'WPC300N', ssid, security: 'wpa2', pass } },
      pc: { Server: { ip: srv, mask: srvNet.mask, gw: host(srvNet, 1) }, PC1: { dhcp: true }, PC2: { dhcp: true }, Laptop: { dhcp: true } } },
    hints: [T('Work bottom-up and test each layer: links lit → VLANs/trunks ("show vlan brief", "show interfaces trunk") → EtherChannel ("show etherchannel summary") → R1 subinterfaces → DHCP → OSPF ("show ip ospf neighbor") → NAT → ACL → Wi-Fi.',
      'Идите снизу вверх и проверяйте каждый уровень: линки горят → VLAN/trunk ("show vlan brief", "show interfaces trunk") → EtherChannel ("show etherchannel summary") → подынтерфейсы R1 → DHCP → OSPF ("show ip ospf neighbor") → NAT → ACL → Wi-Fi.',
      'עובדים מלמטה למעלה ובודקים כל שכבה: הקישורים דולקים → VLAN/trunk ‏("show vlan brief", ‏"show interfaces trunk") → ‏EtherChannel ‏("show etherchannel summary") → תת-הממשקים של R1 → ‏DHCP → ‏OSPF ‏("show ip ospf neighbor") → ‏NAT → ‏ACL → ‏Wi-Fi.'),
    T('The NAT ACL must cover R2\'s LAN too, and R2 must have a way out — that is what "default-information originate" gives it.', 'ACL для NAT должен покрывать и LAN R2, а у R2 должен быть путь наружу — его даёт "default-information originate".', 'ה-ACL של ה-NAT חייב לכסות גם את ה-LAN של R2, ול-R2 צריכה להיות דרך החוצה — את זה נותן "default-information originate".'),
    T('Save every device when done: "copy running-config startup-config".', 'В конце сохраните все устройства: "copy running-config startup-config".', 'בסוף שומרים את כל ההתקנים: ‏"copy running-config startup-config".')],
  };
});
