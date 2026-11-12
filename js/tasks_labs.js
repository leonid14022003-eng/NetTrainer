'use strict';
// Задания-лабы по материалам Packet Tracer: статические маршруты (2.2.2.4), OSPF (DR/BDR, три способа включения,
// маршрут по умолчанию, cost/bandwidth), Port Security. Загружается после tasks.js и до coach.js (coach добавляет объяснения).

// ---------- Новые проверки ----------
Object.assign(CHK, {
  // Вид статического маршрута: recursive (next-hop IP), attached (выходной интерфейс), full (интерфейс + next-hop)
  staticKind(dev, net, len, kind) {
    const pfx = net + '/' + len;
    const K = {
      recursive: T('recursive (next-hop IP)', 'рекурсивный (IP следующего узла)', 'רקורסיבי (IP של הקפיצה הבאה)'),
      attached: T('directly attached (exit interface)', 'directly attached (выходной интерфейс)', 'directly attached (ממשק יציאה)'),
      full: T('fully specified (interface + next-hop)', 'fully specified (интерфейс + next-hop)', 'fully specified (ממשק + next-hop)'),
    }[kind];
    return {
      label: T(dev + ': ' + K.en + ' static route to ' + pfx, dev + ': статический маршрут в ' + pfx + ' — ' + K.ru, dev + ': נתיב סטטי אל ' + pfx + ' — ' + K.he),
      run(topo) {
        const D = topo.devices[dev];
        const mask = intToIp(lenToMaskInt(len));
        const list = D.cfg.staticRoutes.filter((s) => s.net === net && s.mask === mask);
        const kindOf = (s) => (s.nextHop && s.exitIf ? 'full' : s.nextHop ? 'recursive' : 'attached');
        const good = list.find((s) => kindOf(s) === kind);
        if (!good) {
          if (list.length) return { ok: false, hint: T('There is a route to ' + pfx + ', but of another kind: ' + kindOf(list[0]) + '. Here the lab wants ' + K.en + '.', 'Маршрут в ' + pfx + ' есть, но другого вида: ' + kindOf(list[0]) + '. Здесь нужен ' + K.ru + '.', 'יש נתיב אל ' + pfx + ', אבל מסוג אחר: ' + kindOf(list[0]) + '. כאן צריך ' + K.he + '.') };
          return { ok: false, hint: T('No "ip route ' + net + ' ' + mask + ' …" on ' + dev + ' yet.', 'На ' + dev + ' пока нет "ip route ' + net + ' ' + mask + ' …".', 'ב-' + dev + ' עדיין אין "ip route ' + net + ' ' + mask + ' …".') };
        }
        const inTable = routesOf(topo, D).some((r) => r.net === ipToInt(net) && r.len === len && r.code.startsWith('S'));
        if (!inTable) return { ok: false, hint: T('The route is configured but not in "show ip route": the next hop is not reachable or the exit interface is down.', 'Маршрут введён, но его нет в "show ip route": next hop недостижим или выходной интерфейс выключен.', 'הנתיב הוגדר אבל לא מופיע ב-"show ip route": ה-next hop לא נגיש או שממשק היציאה כבוי.') };
        return { ok: true };
      },
    };
  },
  // Роль интерфейса на сегменте: DR / BDR / DROTHER
  ospfRole(dev, ifn, role) {
    return {
      label: T(dev + ' is the ' + role + ' on ' + sh(ifn), dev + ' — ' + role + ' на ' + sh(ifn), dev + ' הוא ה-' + role + ' ב-' + sh(ifn)),
      run(topo) {
        const now = ospfRole(topo, dev, ifn);
        if (now === role) return { ok: true };
        return { ok: false, hint: T('Now ' + dev + ' is ' + (now || 'not in OSPF') + '. Elections are non-preemptive: after changing priorities run "clear ip ospf process" on the routers (the current DR last).',
          'Сейчас ' + dev + ' — ' + (now || 'не в OSPF') + '. Выборы не вытесняющие: после смены priority выполните "clear ip ospf process" на роутерах (текущий DR — последним).',
          'עכשיו ' + dev + ' הוא ' + (now || 'לא ב-OSPF') + '. הבחירות אינן דוחקות: אחרי שינוי priority מריצים "clear ip ospf process" בנתבים (ה-DR הנוכחי אחרון).') };
      },
    };
  },
  ospfPrio(dev, ifn, prio) {
    return {
      label: T(dev + ' ' + sh(ifn) + ': ip ospf priority ' + prio, dev + ' ' + sh(ifn) + ': ip ospf priority ' + prio, dev + ' ' + sh(ifn) + ': ‏ip ospf priority ' + prio),
      run(topo) {
        const p = ospfPrio(topo.devices[dev], ifn);
        return p === prio ? { ok: true } : { ok: false, hint: T('Priority now: ' + p + '.', 'Сейчас priority: ' + p + '.', 'ה-priority עכשיו: ' + p + '.') };
      },
    };
  },
  // Каким способом включён OSPF на всех интерфейсах роутера: net (адрес сети + wildcard), host (IP интерфейса + 0.0.0.0), if (ip ospf … area на интерфейсе)
  ospfMethod(dev, method) {
    const M = {
      net: T('network <network address> <wildcard> area 0', 'network <адрес сети> <wildcard> area 0', 'network <כתובת רשת> <wildcard> area 0'),
      host: T('network <interface IP> 0.0.0.0 area 0', 'network <IP интерфейса> 0.0.0.0 area 0', 'network <IP של הממשק> 0.0.0.0 area 0'),
      if: T('"ip ospf <pid> area 0" on each interface', '"ip ospf <pid> area 0" на каждом интерфейсе', '"ip ospf <pid> area 0" בכל ממשק'),
    }[method];
    return {
      label: T(dev + ': OSPF enabled with ' + M.en, dev + ': OSPF включён через ' + M.ru, dev + ': ‏OSPF מופעל עם ' + M.he),
      run(topo) {
        const D = topo.devices[dev], o = D.cfg.ospf;
        if (!o) return { ok: false, hint: T('No OSPF on ' + dev + ' yet.', 'На ' + dev + ' пока нет OSPF.', 'ב-' + dev + ' עדיין אין OSPF.') };
        const ifs = l3Ifaces(D).filter((i) => ifKind(i.name) === 'phys');
        for (const i of ifs) {
          const ic = D.cfg.interfaces[i.name];
          const byIf = ic.ospfArea !== undefined && ic.ospfArea !== null;
          const st = o.networks.find((n) => { const w = ipToInt(n.wildcard), m = (~w) >>> 0; return ((i.ip & m) >>> 0) === ((ipToInt(n.ip) & m) >>> 0); });
          let ok = false;
          if (method === 'if') ok = byIf && !st;
          else if (method === 'host') ok = !!st && st.wildcard === '0.0.0.0' && st.ip === intToIp(i.ip) && !byIf;
          else ok = !!st && st.wildcard === wildcardOf(i.len) && st.ip === intToIp(netOf(i.ip, i.len)) && !byIf;
          if (!ok) return { ok: false, hint: T(sh(i.name) + ' (' + intToIp(i.ip) + '/' + i.len + ') is not enabled with ' + M.en + '.', sh(i.name) + ' (' + intToIp(i.ip) + '/' + i.len + ') не включён через ' + M.ru + '.', sh(i.name) + ' (' + intToIp(i.ip) + '/' + i.len + ') לא מופעל עם ' + M.he + '.') };
        }
        return { ok: true };
      },
    };
  },
  // Маршрут роутера к сети идёт через соседа via
  ospfVia(dev, net, len, via) {
    const pfx = net + '/' + len;
    return {
      label: T(dev + ' reaches ' + pfx + ' through ' + via, dev + ' идёт в ' + pfx + ' через ' + via, dev + ' מגיע אל ' + pfx + ' דרך ' + via),
      run(topo) {
        const D = topo.devices[dev];
        const r = routesOf(topo, D).find((x) => x.net === ipToInt(net) && x.len === len);
        if (!r || r.nextHop === null) return { ok: false, hint: T('No route to ' + pfx + '.', 'Нет маршрута в ' + pfx + '.', 'אין נתיב אל ' + pfx + '.') };
        const owner = devByIp(topo, intToIp(r.nextHop));
        if (owner && owner.id === via && !(r.ecmp && r.ecmp.length > 1)) return { ok: true };
        return { ok: false, hint: T('Now the route goes via ' + intToIp(r.nextHop) + (owner ? ' (' + owner.name + ')' : '') + (r.ecmp && r.ecmp.length > 1 ? ' and other equal-cost paths' : '') + ', cost ' + r.metric + '. Make the direct path more expensive.', 'Сейчас маршрут идёт через ' + intToIp(r.nextHop) + (owner ? ' (' + owner.name + ')' : '') + (r.ecmp && r.ecmp.length > 1 ? ' и другие равноценные пути' : '') + ', cost ' + r.metric + '. Сделайте прямой путь дороже.', 'עכשיו הנתיב עובר דרך ' + intToIp(r.nextHop) + (owner ? ' (' + owner.name + ')' : '') + ', ‏cost ' + r.metric + '. ייקרו את הדרך הישירה.') };
      },
    };
  },
  // Маршрут по умолчанию пришёл по OSPF (O*E2)
  ospfDefault(dev) {
    return {
      label: T(dev + ' learned the default route from OSPF (O*E2 0.0.0.0/0)', dev + ' получил маршрут по умолчанию по OSPF (O*E2 0.0.0.0/0)', dev + ' קיבל את נתיב ברירת המחדל מ-OSPF (O*E2 0.0.0.0/0)'),
      run(topo) {
        const r = routesOf(topo, topo.devices[dev]).find((x) => x.len === 0);
        if (r && r.code === 'O*E2') return { ok: true };
        return { ok: false, hint: r ? T('There is a default route, but it is "' + r.code + '" — it must come from OSPF.', 'Маршрут по умолчанию есть, но "' + r.code + '" — он должен прийти по OSPF.', 'יש נתיב ברירת מחדל, אבל "' + r.code + '" — הוא צריך להגיע מ-OSPF.')
          : T('"Gateway of last resort is not set". The border router needs its own default route AND "default-information originate".', '"Gateway of last resort is not set". Граничному роутеру нужен свой маршрут по умолчанию И "default-information originate".', '"Gateway of last resort is not set". נתב הגבול צריך נתיב ברירת מחדל משלו וגם "default-information originate".') };
      },
    };
  },
  psec(sw, port, spec) {
    const parts = ['switchport port-security'];
    if (spec.max) parts.push('maximum ' + spec.max);
    if (spec.sticky) parts.push('mac-address sticky');
    if (spec.violation) parts.push('violation ' + spec.violation);
    if (spec.agingTime) parts.push('aging time ' + spec.agingTime);
    if (spec.agingType) parts.push('aging type ' + spec.agingType);
    const what = parts.join(', ');
    return {
      label: T(sw + ' ' + sh(port) + ': Port Security — ' + what, sw + ' ' + sh(port) + ': Port Security — ' + what, sw + ' ' + sh(port) + ': ‏Port Security — ' + what),
      run(topo) {
        const ic = topo.devices[sw].cfg.interfaces[port];
        const p = ic.psec;
        const no = (en, ru, he) => ({ ok: false, hint: T(en, ru, he) });
        if (ic.mode !== 'access') return no('The port must be "switchport mode access" first.', 'Сначала порт должен быть "switchport mode access".', 'קודם הפורט צריך להיות "switchport mode access".');
        if (!p || !p.on) return no('Port Security is not enabled: "switchport port-security".', 'Port Security не включён: "switchport port-security".', 'Port Security לא מופעל: "switchport port-security".');
        if (spec.max && p.max !== spec.max) return no('Maximum now: ' + p.max + ' — must be ' + spec.max + '.', 'Сейчас maximum: ' + p.max + ' — нужно ' + spec.max + '.', 'ה-maximum עכשיו: ' + p.max + ' — צריך ' + spec.max + '.');
        if (spec.sticky && !p.sticky) return no('Add "switchport port-security mac-address sticky".', 'Добавьте "switchport port-security mac-address sticky".', 'הוסיפו "switchport port-security mac-address sticky".');
        if (spec.violation && p.violation !== spec.violation) return no('Violation mode now: ' + p.violation + ' — must be ' + spec.violation + '.', 'Сейчас режим нарушения: ' + p.violation + ' — нужен ' + spec.violation + '.', 'מצב ההפרה עכשיו: ' + p.violation + ' — צריך ' + spec.violation + '.');
        if (spec.agingTime && p.aging.time !== spec.agingTime) return no('Aging time now: ' + p.aging.time + ' min.', 'Сейчас aging time: ' + p.aging.time + ' мин.', 'ה-aging time עכשיו: ' + p.aging.time + ' דקות.');
        if (spec.agingType && p.aging.type !== spec.agingType) return no('Aging type now: ' + p.aging.type + '.', 'Сейчас aging type: ' + p.aging.type + '.', 'ה-aging type עכשיו: ' + p.aging.type + '.');
        return { ok: true };
      },
    };
  },
  // Порт выучил MAC компьютера (sticky — в running-config)
  psecLearned(sw, port, pc) {
    return {
      label: T(sw + ' ' + sh(port) + ' learned the MAC of ' + pc + ' (sticky, in running-config)', sw + ' ' + sh(port) + ' выучил MAC ' + pc + ' (sticky, в running-config)', sw + ' ' + sh(port) + ' למד את ה-MAC של ' + pc + ' (sticky, ב-running-config)'),
      run(topo) {
        const mac = topo.devices[pc].ports[0].mac;
        const p = topo.devices[sw].cfg.interfaces[port].psec;
        if (p && p.macs.some((m) => m.mac === mac && m.sticky)) return { ok: true };
        return { ok: false, hint: T('Ping from ' + pc + ' — the port learns the MAC from the first frame. Then "show port-security address".', 'Сделайте ping с ' + pc + ' — порт учит MAC по первому кадру. Потом "show port-security address".', 'עשו ping מ-' + pc + ' — הפורט לומד את ה-MAC מהמסגרת הראשונה. ואז "show port-security address".') };
      },
    };
  },
  // Порт работает: не выключен защитой (err-disabled) и линк поднят
  psecUp(sw, port) {
    return {
      label: T(sw + ' ' + sh(port) + ' is up (not err-disabled)', sw + ' ' + sh(port) + ' работает (не err-disabled)', sw + ' ' + sh(port) + ' פעיל (לא err-disabled)'),
      run(topo) {
        const ic = topo.devices[sw].cfg.interfaces[port];
        if (ic.errdis) return { ok: false, hint: T('The port is err-disabled (' + ic.errdis + '). Remove the cause, then "shutdown" + "no shutdown".', 'Порт в err-disabled (' + ic.errdis + '). Уберите причину, потом "shutdown" + "no shutdown".', 'הפורט ב-err-disabled ‏(' + ic.errdis + '). הסירו את הסיבה, ואז "shutdown" + "no shutdown".') };
        return portPhysUp(topo, sw, port) ? { ok: true } : { ok: false, hint: T('The link is down.', 'Линк не поднят.', 'הקישור לא פעיל.') };
      },
    };
  },
  portsShut(sw, ports) {
    const txt = sh(ports[0]) + '–' + sh(ports[ports.length - 1]).split('/').pop();
    return {
      label: T(sw + ': unused ports ' + txt + ' are shut down', sw + ': неиспользуемые порты ' + txt + ' выключены', sw + ': הפורטים הלא בשימוש ' + txt + ' כבויים'),
      run(topo) {
        const left = ports.filter((p) => !topo.devices[sw].cfg.interfaces[p].shutdown);
        return left.length ? { ok: false, hint: T('Still on: ' + left.map(sh).join(', ') + '. Use "interface range" + "shutdown".', 'Ещё включены: ' + left.map(sh).join(', ') + '. Используйте "interface range" + "shutdown".', 'עדיין פעילים: ' + left.map(sh).join(', ') + '. השתמשו ב-"interface range" + "shutdown".') } : { ok: true };
      },
    };
  },
});

// Треугольник из трёх роутеров на serial-линках /30 и три LAN /24 (как в лабах OSPF Packet Tracer)
function serialTriangle(rng, opts = {}) {
  const sp = subnetPool(rng);
  const l1 = sp.lan(0), l2 = sp.lan(0), l3 = sp.lan(0);
  const a = rng.int(1, 200), b = rng.int(0, 60) * 4;
  const w = (k) => ({ net: '10.' + a + '.' + b + '.' + k * 4, len: 30, mask: '255.255.255.252' });
  const w12 = w(0), w13 = w(1), w23 = w(2);
  const model = opts.model || '4331';
  const S = DEVICE_CATALOG[model].serial, G = gi(model, 0);
  const R = { R1: { lan: G, s12: S[0], s13: S[1] }, R2: { lan: G, s12: S[0], s23: S[1] }, R3: { lan: G, s13: S[1], s23: S[0] } };
  const ip = {
    r1lan: host(l1, 1), r2lan: host(l2, 1), r3lan: host(l3, 1),
    r1s12: host(w12, 1), r2s12: host(w12, 2), r1s13: host(w13, 1), r3s13: host(w13, 2), r2s23: host(w23, 1), r3s23: host(w23, 2),
    pc1: host(l1, 10), pc2: host(l2, 10), pc3: host(l3, 10),
  };
  const x = { l1, l2, l3, w12, w13, w23, R, ip, model };
  x.build = (topo) => {
    tAdd(topo, model, 'R1', 200, 140); tAdd(topo, model, 'R2', 640, 140); tAdd(topo, model, 'R3', 420, 330);
    tAdd(topo, 'PC', 'PC1', 80, 300); tAdd(topo, 'PC', 'PC2', 760, 300); tAdd(topo, 'PC', 'PC3', 420, 480);
    tLink(topo, 'R1', R.R1.s12, 'R2', R.R2.s12, 'dce'); tLink(topo, 'R1', R.R1.s13, 'R3', R.R3.s13, 'dce'); tLink(topo, 'R2', R.R2.s23, 'R3', R.R3.s23, 'dce');
    tLink(topo, 'PC1', 'FastEthernet0', 'R1', G); tLink(topo, 'PC2', 'FastEthernet0', 'R2', G); tLink(topo, 'PC3', 'FastEthernet0', 'R3', G);
    tHostname(topo, ['R1', 'R2', 'R3']);
    const ifc = (n, addr, net) => ['interface ' + n, 'ip address ' + addr + ' ' + net.mask, 'no shutdown'];
    tCli(topo, 'R1', [...ifc(G, ip.r1lan, l1), ...ifc(R.R1.s12, ip.r1s12, w12), ...ifc(R.R1.s13, ip.r1s13, w13)]);
    tCli(topo, 'R2', [...ifc(G, ip.r2lan, l2), ...ifc(R.R2.s12, ip.r2s12, w12), ...ifc(R.R2.s23, ip.r2s23, w23)]);
    tCli(topo, 'R3', [...ifc(G, ip.r3lan, l3), ...ifc(R.R3.s13, ip.r3s13, w13), ...ifc(R.R3.s23, ip.r3s23, w23)]);
    tPc(topo, 'PC1', ip.pc1, l1.mask, ip.r1lan); tPc(topo, 'PC2', ip.pc2, l2.mask, ip.r2lan); tPc(topo, 'PC3', ip.pc3, l3.mask, ip.r3lan);
  };
  x.table = [rowIf('R1', G, ip.r1lan, l1.mask), rowIf('R1', R.R1.s12, ip.r1s12, w12.mask), rowIf('R1', R.R1.s13, ip.r1s13, w13.mask),
    rowIf('R2', G, ip.r2lan, l2.mask), rowIf('R2', R.R2.s12, ip.r2s12, w12.mask), rowIf('R2', R.R2.s23, ip.r2s23, w23.mask),
    rowIf('R3', G, ip.r3lan, l3.mask), rowIf('R3', R.R3.s13, ip.r3s13, w13.mask), rowIf('R3', R.R3.s23, ip.r3s23, w23.mask),
    rowPc('PC1', ip.pc1, l1.mask, ip.r1lan), rowPc('PC2', ip.pc2, l2.mask, ip.r2lan), rowPc('PC3', ip.pc3, l3.mask, ip.r3lan)];
  // OSPF по классике: network + wildcard на всех трёх
  x.ospf = (pid) => {
    const st = (n) => 'network ' + n.net + ' ' + wildcardOf(n.len) + ' area 0';
    return { R1: ['router ospf ' + pid, st(l1), st(w12), st(w13)], R2: ['router ospf ' + pid, st(l2), st(w12), st(w23)], R3: ['router ospf ' + pid, st(l3), st(w13), st(w23)] };
  };
  return x;
}

// ================== ШАБЛОНЫ ==================

// --- Лаба 2.2.2.4: четыре вида статических маршрутов на serial-линках ---
taskDef('static-kinds', 'static', 3, (rng) => {
  const o2 = rng.int(16, 31), t = rng.int(0, 100) * 2;
  const B = '172.' + o2 + '.';
  const lan2 = { net: B + t + '.0', len: 24, mask: '255.255.255.0' };
  const lan1 = { net: B + (t + 1) + '.0', len: 25, mask: '255.255.255.128' };
  const lan3 = { net: B + (t + 1) + '.128', len: 26, mask: '255.255.255.192' };
  const w12 = { net: B + (t + 1) + '.192', len: 30, mask: '255.255.255.252' };
  const w23 = { net: B + (t + 1) + '.196', len: 30, mask: '255.255.255.252' };
  const ip = { r1lan: host(lan1, 1), pc1: host(lan1, 126), r1s: host(w12, 2), r2s0: host(w12, 1), r2s1: host(w23, 1), r3s: host(w23, 2),
    r2lan: host(lan2, 1), pc2: host(lan2, 254), r3lan: host(lan3, 1), pc3: host(lan3, 62) };
  const m = [0, 1, 2].map(() => rng.pick(['1941', '2911']));
  const G = (k) => gi(m[k], 0);
  const S0 = 'Serial0/0/0', S1 = 'Serial0/0/1';
  const mask = (n) => n.mask;
  return {
    title: T('Lab 2.2.2.4: IPv4 static and default routes', 'Лаба 2.2.2.4: статические маршруты и маршрут по умолчанию', 'מעבדה 2.2.2.4: נתיבים סטטיים ונתיב ברירת מחדל'),
    intro: T('Three routers in a chain on serial links, five networks. Part 1 — examine: each router needs a route to every network that is not its own (R1: 3, R2: 2, R3: 3 — or one default route). Part 2 — configure three kinds of static routes. The next hop is always the NEIGHBOUR\'s address on the shared link.',
      'Три роутера цепочкой на serial-линках, пять сетей. Часть 1 — изучить: каждому роутеру нужен маршрут в каждую не свою сеть (R1: 3, R2: 2, R3: 3 — или один маршрут по умолчанию). Часть 2 — настроить три вида статических маршрутов. Next hop — всегда адрес СОСЕДА на общем линке.',
      'שלושה נתבים בשרשרת על קישורי serial, חמש רשתות. חלק 1 — לבדוק: כל נתב צריך נתיב לכל רשת שאינה שלו (R1: 3, ‏R2: 2, ‏R3: 3 — או נתיב ברירת מחדל אחד). חלק 2 — להגדיר שלושה סוגים של נתיבים סטטיים. ה-next hop הוא תמיד הכתובת של השכן בקישור המשותף.'),
    steps: [
      T('R1 — recursive routes (next-hop IP ' + ip.r2s0 + ') to ' + lan2.net + '/24, ' + lan3.net + '/26 and the R2–R3 link ' + w23.net + '/30.', 'R1 — рекурсивные маршруты (next-hop ' + ip.r2s0 + ') в ' + lan2.net + '/24, ' + lan3.net + '/26 и линк R2–R3 ' + w23.net + '/30.', 'R1 — נתיבים רקורסיביים (next-hop ' + ip.r2s0 + ') אל ' + lan2.net + '/24, ' + lan3.net + '/26 ואל הקישור R2–R3 ‏' + w23.net + '/30.'),
      T('R2 — directly attached routes (exit interface only): ' + lan1.net + '/25 out of S0/0/0 and ' + lan3.net + '/26 out of S0/0/1. The warning "Default route without gateway…" is not an error.', 'R2 — directly attached маршруты (только выходной интерфейс): ' + lan1.net + '/25 через S0/0/0 и ' + lan3.net + '/26 через S0/0/1. Предупреждение "Default route without gateway…" — не ошибка.', 'R2 — נתיבי directly attached (ממשק יציאה בלבד): ' + lan1.net + '/25 דרך S0/0/0 ו-' + lan3.net + '/26 דרך S0/0/1. האזהרה "Default route without gateway…" אינה שגיאה.'),
      T('R3 — one default route out of S0/0/1 (all three remote networks are behind R2).', 'R3 — один маршрут по умолчанию через S0/0/1 (все три чужие сети за R2).', 'R3 — נתיב ברירת מחדל אחד דרך S0/0/1 (כל שלוש הרשתות הזרות נמצאות מאחורי R2).'),
      T('Verify: "show ip route static" (R1: 3 S, R2: 2 S, R3: S* 0.0.0.0/0); PC1 → PC2, PC1 → PC3, PC2 → PC3 ping.', 'Проверка: "show ip route static" (R1: 3 строки S, R2: 2 S, R3: S* 0.0.0.0/0); ping PC1 → PC2, PC1 → PC3, PC2 → PC3.', 'בדיקה: "show ip route static" (R1: ‏3 שורות S, ‏R2: ‏2, ‏R3: ‏S* 0.0.0.0/0); ping ‏PC1 → PC2, ‏PC1 → PC3, ‏PC2 → PC3.'),
      T('Write down (no need to type): fully specified routes on R3 — "ip route <net> <mask> s0/0/1 ' + ip.r2s1 + '" — interface AND neighbour IP.', 'Записать (вводить не нужно): fully specified маршруты на R3 — "ip route <сеть> <маска> s0/0/1 ' + ip.r2s1 + '" — и интерфейс, и IP соседа.', 'לרשום (לא חובה להקליד): נתיבי fully specified ב-R3 — "ip route <רשת> <מסכה> s0/0/1 ' + ip.r2s1 + '" — גם ממשק וגם IP של השכן.'),
    ],
    table: [rowIf('R1', G(0), ip.r1lan, lan1.mask), rowIf('R1', S0, ip.r1s, w12.mask), rowIf('R2', G(1), ip.r2lan, lan2.mask), rowIf('R2', S0, ip.r2s0, w12.mask),
      rowIf('R2', S1, ip.r2s1, w23.mask), rowIf('R3', G(2), ip.r3lan, lan3.mask), rowIf('R3', S1, ip.r3s, w23.mask),
      rowPc('PC1', ip.pc1, lan1.mask, ip.r1lan), rowPc('PC2', ip.pc2, lan2.mask, ip.r2lan), rowPc('PC3', ip.pc3, lan3.mask, ip.r3lan)],
    build(topo) {
      tAdd(topo, m[0], 'R1', 200, 160); tAdd(topo, m[1], 'R2', 450, 160); tAdd(topo, m[2], 'R3', 700, 160);
      tAdd(topo, 'PC', 'PC1', 200, 380); tAdd(topo, 'PC', 'PC2', 450, 380); tAdd(topo, 'PC', 'PC3', 700, 380);
      tLink(topo, 'R1', S0, 'R2', S0, 'dce'); tLink(topo, 'R2', S1, 'R3', S1, 'dce');
      tLink(topo, 'PC1', 'FastEthernet0', 'R1', G(0)); tLink(topo, 'PC2', 'FastEthernet0', 'R2', G(1)); tLink(topo, 'PC3', 'FastEthernet0', 'R3', G(2));
      tHostname(topo, ['R1', 'R2', 'R3']);
      tCli(topo, 'R1', ['interface ' + G(0), 'ip address ' + ip.r1lan + ' ' + lan1.mask, 'no shutdown', 'interface ' + S0, 'ip address ' + ip.r1s + ' ' + w12.mask, 'no shutdown']);
      tCli(topo, 'R2', ['interface ' + G(1), 'ip address ' + ip.r2lan + ' ' + lan2.mask, 'no shutdown', 'interface ' + S0, 'ip address ' + ip.r2s0 + ' ' + w12.mask, 'no shutdown',
        'interface ' + S1, 'ip address ' + ip.r2s1 + ' ' + w23.mask, 'no shutdown']);
      tCli(topo, 'R3', ['interface ' + G(2), 'ip address ' + ip.r3lan + ' ' + lan3.mask, 'no shutdown', 'interface ' + S1, 'ip address ' + ip.r3s + ' ' + w23.mask, 'no shutdown']);
      tPc(topo, 'PC1', ip.pc1, lan1.mask, ip.r1lan); tPc(topo, 'PC2', ip.pc2, lan2.mask, ip.r2lan); tPc(topo, 'PC3', ip.pc3, lan3.mask, ip.r3lan);
    },
    checks: [CHK.staticKind('R1', lan2.net, 24, 'recursive'), CHK.staticKind('R1', lan3.net, 26, 'recursive'), CHK.staticKind('R1', w23.net, 30, 'recursive'),
      CHK.staticKind('R2', lan1.net, 25, 'attached'), CHK.staticKind('R2', lan3.net, 26, 'attached'), CHK.staticKind('R3', '0.0.0.0', 0, 'attached'),
      CHK.ping('PC1', 'PC2', ip.pc2), CHK.ping('PC1', 'PC3', ip.pc3), CHK.ping('PC2', 'PC3', ip.pc3)],
    solution: { cli: {
      R1: ['ip route ' + lan2.net + ' ' + mask(lan2) + ' ' + ip.r2s0, 'ip route ' + lan3.net + ' ' + mask(lan3) + ' ' + ip.r2s0, 'ip route ' + w23.net + ' ' + mask(w23) + ' ' + ip.r2s0],
      R2: ['ip route ' + lan1.net + ' ' + mask(lan1) + ' ' + S0, 'ip route ' + lan3.net + ' ' + mask(lan3) + ' ' + S1],
      R3: ['ip route 0.0.0.0 0.0.0.0 ' + S1] } },
    hints: [T('Network address = the first address of the block: block size = 256 − last mask octet (/30 → 4, /26 → 64, /25 → 128).', 'Адрес сети — первый адрес блока: размер блока = 256 − последний октет маски (/30 → 4, /26 → 64, /25 → 128).', 'כתובת הרשת היא הכתובת הראשונה בגוש: גודל הגוש = 256 − האוקטט האחרון של המסכה (‎/30 → 4, ‎/26 → 64, ‎/25 → 128).'),
      T('On R2 do NOT use ' + ip.r2s0 + ' as next hop — it is R2\'s own address ("Invalid next hop").', 'На R2 нельзя next hop ' + ip.r2s0 + ' — это свой адрес R2 ("Invalid next hop").', 'ב-R2 אסור next hop ‏' + ip.r2s0 + ' — זו הכתובת של R2 עצמו ("Invalid next hop").'),
      T('A ping fails? Check "show ip route" on every router on the way — there and back.', 'Ping не проходит? Смотрите "show ip route" на каждом роутере по пути — туда и обратно.', 'ה-ping נכשל? בודקים "show ip route" בכל נתב בדרך — הלוך וחזור.')],
  };
});

// --- Лаба «DR и BDR»: выборы не вытесняющие ---
taskDef('ospf-dr', 'ospf', 2, (rng) => {
  const n3 = rng.int(1, 250), r3 = rng.int(10, 99);
  const lan = { net: '192.168.' + n3 + '.0', len: 24, mask: '255.255.255.0' };
  const pid = rng.pick([1, 10]);
  const rid = { RA: '192.168.' + r3 + '.11', RB: '192.168.' + r3 + '.22', RC: '192.168.' + r3 + '.33' };
  const ip = { RA: host(lan, 1), RB: host(lan, 2), RC: host(lan, 3) };
  const pDR = rng.pick([200, 255, 150]), pBDR = rng.pick([100, 50, 120]);
  const model = rng.pick(['1941', '2911']);
  const G = gi(model, 0);
  const cmds = (n) => ['interface ' + G, 'ip address ' + ip[n] + ' ' + lan.mask, 'no shutdown', ...(n === 'RC' ? ['ip ospf priority 2'] : []),
    'router ospf ' + pid, 'router-id ' + rid[n], 'network ' + lan.net + ' 0.0.0.255 area 0'];
  return {
    title: T('OSPF: make the DR and the BDR', 'OSPF: назначить DR и BDR', 'OSPF: לקבוע את ה-DR וה-BDR'),
    intro: T('RA, RB and RC share one Ethernet segment ' + lan.net + '/24, so OSPF elects a DR and a BDR (highest priority, then highest router ID). Now RC is the DR (priority 2). The company wants RA to be the DR, RB the BDR, and RC must never take either role.',
      'RA, RB и RC стоят в одном Ethernet-сегменте ' + lan.net + '/24, поэтому OSPF выбирает DR и BDR (больший priority, затем больший router ID). Сейчас DR — RC (priority 2). Нужно, чтобы DR был RA, BDR — RB, а RC никогда не получал ни одной из ролей.',
      'RA, ‏RB ו-RC נמצאים באותו סגמנט Ethernet ‏' + lan.net + '/24, ולכן OSPF בוחר DR ו-BDR (priority גבוה, אחר כך router ID גבוה). עכשיו ה-DR הוא RC ‏(priority 2). צריך ש-RA יהיה DR, ‏RB יהיה BDR, ו-RC לעולם לא יקבל אף אחד מהתפקידים.'),
    steps: [
      T('Look first: "show ip ospf neighbor" on RA (the State column shows the NEIGHBOUR\'s role).', 'Сначала посмотрите: "show ip ospf neighbor" на RA (в столбце State — роль СОСЕДА).', 'קודם מסתכלים: "show ip ospf neighbor" ב-RA (בעמודה State — התפקיד של השכן).'),
      T('Interface ' + sh(G) + ': RA "ip ospf priority ' + pDR + '", RB "ip ospf priority ' + pBDR + '", RC "ip ospf priority 0".', 'Интерфейс ' + sh(G) + ': RA "ip ospf priority ' + pDR + '", RB "ip ospf priority ' + pBDR + '", RC "ip ospf priority 0".', 'ממשק ' + sh(G) + ': ‏RA ‏"ip ospf priority ' + pDR + '", ‏RB ‏"ip ospf priority ' + pBDR + '", ‏RC ‏"ip ospf priority 0".'),
      T('A new priority does not start an election (non-preemptive). Run "clear ip ospf process" on RA, RB and then RC (the current DR last).', 'Новый priority сам выборы не запускает (они не вытесняющие). Выполните "clear ip ospf process" на RA, RB и потом RC (текущий DR — последним).', 'priority חדש לא מתחיל בחירות (הן אינן דוחקות). מריצים "clear ip ospf process" ב-RA, ‏RB ואחר כך RC (ה-DR הנוכחי אחרון).'),
      T('Verify: "show ip ospf interface ' + sh(G) + '" on RC — DR is ' + rid.RA + ', BDR ' + rid.RB + '. Tip: "debug ip ospf adj" shows the elections, "undebug all" turns it off.', 'Проверка: "show ip ospf interface ' + sh(G) + '" на RC — DR ' + rid.RA + ', BDR ' + rid.RB + '. Совет: "debug ip ospf adj" показывает выборы, "undebug all" выключает.', 'בדיקה: "show ip ospf interface ' + sh(G) + '" ב-RC — ה-DR הוא ' + rid.RA + ', ה-BDR ‏' + rid.RB + '. טיפ: "debug ip ospf adj" מראה את הבחירות, "undebug all" מכבה.'),
    ],
    table: [rowIf('RA', G, ip.RA, lan.mask), rowIf('RB', G, ip.RB, lan.mask), rowIf('RC', G, ip.RC, lan.mask),
      { dev: 'RA', iface: 'router-id', ip: rid.RA, mask: '', gw: '' }, { dev: 'RB', iface: 'router-id', ip: rid.RB, mask: '', gw: '' }, { dev: 'RC', iface: 'router-id', ip: rid.RC, mask: '', gw: '' }],
    build(topo) {
      tAdd(topo, '2960', 'S1', 450, 120);
      tAdd(topo, model, 'RA', 220, 320); tAdd(topo, model, 'RB', 450, 340); tAdd(topo, model, 'RC', 680, 320);
      ['RA', 'RB', 'RC'].forEach((n, k) => tLink(topo, n, G, 'S1', fa(k + 1)));
      tHostname(topo, ['RA', 'RB', 'RC', 'S1']);
      for (const n of ['RA', 'RB', 'RC']) tCli(topo, n, cmds(n));
    },
    checks: [CHK.ospfPrio('RA', G, pDR), CHK.ospfPrio('RB', G, pBDR), CHK.ospfPrio('RC', G, 0), CHK.ospfRole('RA', G, 'DR'), CHK.ospfRole('RB', G, 'BDR'), CHK.ospfNbrs('RC', 2)],
    solution: { cli: {
      RA: ['interface ' + G, 'ip ospf priority ' + pDR, 'do clear ip ospf process'],
      RB: ['interface ' + G, 'ip ospf priority ' + pBDR, 'do clear ip ospf process'],
      RC: ['interface ' + G, 'ip ospf priority 0', 'do clear ip ospf process'] } },
    hints: [T('Priority 0 = never DR/BDR. Highest priority wins; on a tie — highest router ID.', 'Priority 0 — никогда не DR/BDR. Побеждает больший priority; при равенстве — больший router ID.', 'Priority 0 — אף פעם לא DR/BDR. ה-priority הגבוה מנצח; בתיקו — ה-router ID הגבוה.'),
      T('If the DR disappears, the BDR becomes DR at once and only a new BDR is elected.', 'Если DR пропал, BDR сразу становится DR, а выбирают только нового BDR.', 'אם ה-DR נעלם, ה-BDR הופך מיד ל-DR ונבחר רק BDR חדש.')],
  };
});

// --- Лаба «Настройка OSPFv2 point-to-point»: три способа включить OSPF + passive ---
taskDef('ospf-3ways', 'ospf', 3, (rng) => {
  const x = serialTriangle(rng);
  const { l1, l2, l3, w12, w13, w23, R, ip } = x;
  const pid = 10;
  const G = R.R1.lan;
  const st = (n) => 'network ' + n.net + ' ' + wildcardOf(n.len) + ' area 0';
  const hostSt = (a) => 'network ' + a + ' 0.0.0.0 area 0';
  return {
    title: T('OSPFv2 point-to-point: three ways to enable OSPF', 'OSPFv2 точка-точка: три способа включить OSPF', 'OSPFv2 נקודה-לנקודה: שלוש דרכים להפעיל OSPF'),
    intro: T('Three routers in a triangle on serial /30 links, each with its own LAN. Process ID 10, area 0. Every router enables OSPF in a different way — all three give the same result in the network. LAN interfaces must not send Hellos.',
      'Три роутера треугольником на serial-линках /30, у каждого своя LAN. Process ID 10, область 0. Каждый роутер включает OSPF своим способом — в сети результат одинаковый. LAN-интерфейсы не должны слать Hello.',
      'שלושה נתבים במשולש על קישורי serial ‏/30, לכל אחד LAN משלו. ‏Process ID 10, אזור 0. כל נתב מפעיל OSPF בדרך אחרת — התוצאה ברשת זהה. ממשקי ה-LAN לא אמורים לשלוח Hello.'),
    steps: [
      T('Router IDs: R1 1.1.1.1, R2 2.2.2.2, R3 3.3.3.3 ("router ospf 10" → "router-id").', 'Router ID: R1 1.1.1.1, R2 2.2.2.2, R3 3.3.3.3 ("router ospf 10" → "router-id").', 'Router ID: ‏R1 1.1.1.1, ‏R2 2.2.2.2, ‏R3 3.3.3.3 ‏("router ospf 10" → "router-id").'),
      T('R1 — network ADDRESS + wildcard (3 commands: /24 → 0.0.0.255, /30 → 0.0.0.3).', 'R1 — АДРЕС СЕТИ + wildcard (3 команды: /24 → 0.0.0.255, /30 → 0.0.0.3).', 'R1 — כתובת הרשת + wildcard (3 פקודות: ‎/24 → 0.0.0.255, ‎/30 → 0.0.0.3).'),
      T('R2 — interface IP + quad-zero: "network ' + ip.r2lan + ' 0.0.0.0 area 0" and the same for its two serial addresses.', 'R2 — IP интерфейса + 0.0.0.0: "network ' + ip.r2lan + ' 0.0.0.0 area 0" и так же для двух serial-адресов.', 'R2 — IP של הממשק + 0.0.0.0: ‏"network ' + ip.r2lan + ' 0.0.0.0 area 0" וכך גם לשתי כתובות ה-serial.'),
      T('R3 — directly on each of its 3 interfaces: "ip ospf 10 area 0".', 'R3 — прямо на каждом из 3 интерфейсов: "ip ospf 10 area 0".', 'R3 — ישירות בכל אחד מ-3 הממשקים: ‏"ip ospf 10 area 0".'),
      T('All three: "passive-interface ' + sh(G) + '" (only PCs behind it). Verify: 2 neighbours FULL/  - on each router; R1 reaches ' + w23.net + '/30 by two equal paths (ECMP); all PCs ping each other.', 'На всех трёх: "passive-interface ' + sh(G) + '" (за ним только ПК). Проверка: у каждого 2 соседа FULL/  -; у R1 сеть ' + w23.net + '/30 через два равных пути (ECMP); все ПК пингуют друг друга.', 'בשלושתם: ‏"passive-interface ' + sh(G) + '" (מאחוריו רק מחשבים). בדיקה: לכל נתב 2 שכנים FULL/  -; ל-R1 יש שתי דרכים שוות אל ' + w23.net + '/30 ‏(ECMP); כל המחשבים עושים ping זה לזה.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); },
    checks: [CHK.routerId('R1', '1.1.1.1'), CHK.routerId('R2', '2.2.2.2'), CHK.routerId('R3', '3.3.3.3'),
      CHK.ospfMethod('R1', 'net'), CHK.ospfMethod('R2', 'host'), CHK.ospfMethod('R3', 'if'),
      CHK.passive('R1', 'ospf', G), CHK.passive('R2', 'ospf', G), CHK.passive('R3', 'ospf', G),
      CHK.ospfNbrs('R1', 2), CHK.ospfNbrs('R2', 2), CHK.ospfNbrs('R3', 2),
      CHK.ping('PC1', 'PC2', ip.pc2), CHK.ping('PC2', 'PC3', ip.pc3), CHK.ping('PC3', 'PC1', ip.pc1)],
    solution: { cli: {
      R1: ['router ospf ' + pid, 'router-id 1.1.1.1', st(l1), st(w12), st(w13), 'passive-interface ' + G],
      R2: ['router ospf ' + pid, 'router-id 2.2.2.2', hostSt(ip.r2lan), hostSt(ip.r2s12), hostSt(ip.r2s23), 'passive-interface ' + G],
      R3: ['router ospf ' + pid, 'router-id 3.3.3.3', 'passive-interface ' + G, 'interface ' + G, 'ip ospf ' + pid + ' area 0', 'interface ' + R.R3.s13, 'ip ospf ' + pid + ' area 0', 'interface ' + R.R3.s23, 'ip ospf ' + pid + ' area 0'] } },
    hints: [T('With wildcard 0.0.0.0 write the exact interface IP — "network ' + l2.net + ' 0.0.0.0" matches nothing, and IOS gives no error.', 'С wildcard 0.0.0.0 пишите точный IP интерфейса — "network ' + l2.net + ' 0.0.0.0" не совпадёт ни с чем, и IOS не выдаст ошибку.', 'עם wildcard ‏0.0.0.0 כותבים את ה-IP המדויק של הממשק — ‏"network ' + l2.net + ' 0.0.0.0" לא יתאים לשום דבר, ו-IOS לא יציג שגיאה.'),
      T('Process ID is local: neighbours may use different numbers. The area must match.', 'Process ID локален: у соседей номера могут отличаться. А area должна совпадать.', 'ה-Process ID מקומי: אצל שכנים המספרים יכולים להיות שונים. ה-area חייב להיות זהה.'),
      T('Serial links are point-to-point: no DR/BDR, the neighbour state is "FULL/  -".', 'Serial-линки — точка-точка: DR/BDR нет, состояние соседа "FULL/  -".', 'קישורי serial הם נקודה-לנקודה: אין DR/BDR, מצב השכן הוא "FULL/  -".')],
  };
});

// --- Лаба «Раздача маршрута по умолчанию»: ip route 0.0.0.0 + default-information originate ---
taskDef('ospf-default', 'ospf', 2, (rng) => {
  const x = serialTriangle(rng);
  const { R, ip } = x;
  const pid = rng.pick([1, 10]);
  const isp = { net: '209.165.' + rng.int(100, 220) + '.' + rng.int(0, 7) * 32, len: 27, mask: '255.255.255.224' };
  const srvNet = { net: '64.' + rng.int(1, 200) + '.1.0', len: 24, mask: '255.255.255.0' };
  const r2isp = host(isp, 1), ispIp = host(isp, 2), srv = host(srvNet, 2), ispLan = host(srvNet, 1);
  const r2o = gi(x.model, 1), ispG = gi('1941', 0), ispG2 = gi('1941', 1);
  const cmds = x.ospf(pid);
  return {
    title: T('OSPF: propagate a default route', 'OSPF: раздать маршрут по умолчанию', 'OSPF: הפצת נתיב ברירת מחדל'),
    intro: T('OSPF already runs on R1, R2 and R3. Only R2 is connected to the ISP. The PCs cannot reach the web server ' + srv + ': each gateway answers "Destination host unreachable" — "Gateway of last resort is not set". Give R2 a default route and let OSPF tell the others.',
      'OSPF уже работает на R1, R2 и R3. К провайдеру подключён только R2. ПК не достают до веб-сервера ' + srv + ': шлюз отвечает "Destination host unreachable" — "Gateway of last resort is not set". Дайте R2 маршрут по умолчанию и пусть OSPF сообщит остальным.',
      'OSPF כבר רץ ב-R1, ‏R2 ו-R3. רק R2 מחובר לספק. המחשבים לא מגיעים לשרת האינטרנט ‏' + srv + ': השער עונה "Destination host unreachable" — ‏"Gateway of last resort is not set". תנו ל-R2 נתיב ברירת מחדל ותנו ל-OSPF לספר לאחרים.'),
    steps: [
      T('First see the problem: ping ' + srv + ' from PC1 and "show ip route" on R1.', 'Сначала увидьте проблему: ping ' + srv + ' с PC1 и "show ip route" на R1.', 'קודם רואים את הבעיה: ping ‏' + srv + ' מ-PC1 ו-"show ip route" ב-R1.'),
      T('R2: "ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" (towards the ISP).', 'R2: "ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" (в сторону провайдера).', 'R2: ‏"ip route 0.0.0.0 0.0.0.0 ' + ispIp + '" (לכיוון הספק).'),
      T('R2: "router ospf ' + pid + '" → "default-information originate" (R2 becomes an ASBR, LSA type 5). Order matters: without its own default route R2 has nothing to advertise.', 'R2: "router ospf ' + pid + '" → "default-information originate" (R2 станет ASBR, LSA тип 5). Порядок важен: без своего маршрута по умолчанию R2 нечего раздавать.', 'R2: ‏"router ospf ' + pid + '" → "default-information originate" (R2 נעשה ASBR, ‏LSA מסוג 5). הסדר חשוב: בלי נתיב ברירת מחדל משלו ל-R2 אין מה להפיץ.'),
      T('Verify on R1 and R3: "O*E2 0.0.0.0/0 [110/1]" and "Gateway of last resort is …"; all PCs ping ' + srv + '.', 'Проверка на R1 и R3: "O*E2 0.0.0.0/0 [110/1]" и "Gateway of last resort is …"; все ПК пингуют ' + srv + '.', 'בדיקה ב-R1 וב-R3: ‏"O*E2 0.0.0.0/0 [110/1]" ו-"Gateway of last resort is …"; כל המחשבים עושים ping ל-' + srv + '.'),
    ],
    table: x.table.concat([rowIf('R2', r2o, r2isp, isp.mask), rowIf('ISP', ispG, ispIp, isp.mask), rowIf('ISP', ispG2, ispLan, srvNet.mask), rowPc('Web', srv, srvNet.mask, ispLan)]),
    build(topo) {
      x.build(topo);
      tAdd(topo, '1941', 'ISP', 880, 140); tAdd(topo, 'Server', 'Web', 880, 330);
      tLink(topo, 'R2', r2o, 'ISP', ispG); tLink(topo, 'Web', 'FastEthernet0', 'ISP', ispG2);
      tHostname(topo, ['ISP']);
      tCli(topo, 'R2', ['interface ' + r2o, 'ip address ' + r2isp + ' ' + isp.mask, 'no shutdown']);
      tCli(topo, 'ISP', ['interface ' + ispG, 'ip address ' + ispIp + ' ' + isp.mask, 'no shutdown', 'interface ' + ispG2, 'ip address ' + ispLan + ' ' + srvNet.mask, 'no shutdown',
        'ip route 0.0.0.0 0.0.0.0 ' + r2isp]);
      tPc(topo, 'Web', srv, srvNet.mask, ispLan);
      for (const [d, c] of Object.entries(cmds)) tCli(topo, d, c);
    },
    checks: [CHK.defaultRoute('R2'), CHK.ospfDefault('R1'), CHK.ospfDefault('R3'), CHK.ping('PC1', 'Web', srv), CHK.ping('PC3', 'Web', srv), CHK.ping('PC2', 'Web', srv)],
    solution: { cli: { R2: ['ip route 0.0.0.0 0.0.0.0 ' + ispIp, 'router ospf ' + pid, 'default-information originate'] } },
    hints: [T('"default-information originate always" would advertise it even without R2\'s own default route — but then traffic would be dropped at R2.', '"default-information originate always" раздаст маршрут даже без своего — но тогда трафик будет отбрасываться на R2.', '"default-information originate always" יפיץ גם בלי נתיב משלו — אבל אז התעבורה תיזרק ב-R2.'),
      T('E2 = external type 2: the metric (1) does not grow along the path — same on R1 and R3.', 'E2 — внешний тип 2: метрика (1) не растёт по пути — одинаковая на R1 и R3.', 'E2 — חיצוני מסוג 2: המטריקה (1) לא גדלה לאורך הדרך — זהה ב-R1 וב-R3.')],
  };
});

// --- Лаба «Изменение настроек OSPF»: bandwidth меняет cost и выбранный путь ---
taskDef('ospf-cost', 'ospf', 3, (rng) => {
  const x = serialTriangle(rng);
  const { l2, R, ip } = x;
  const pid = rng.pick([1, 10]);
  const cmds = x.ospf(pid);
  const bw = rng.pick([64, 128, 56]);
  const cost = Math.floor(100000 / bw);
  return {
    title: T('OSPF: steer traffic with bandwidth', 'OSPF: направить трафик через bandwidth', 'OSPF: לכוון תעבורה עם bandwidth'),
    intro: T('All three routers run OSPF. Now R1 sends traffic for R2\'s LAN ' + l2.net + '/24 over the direct serial link (cost 64 + 1). The direct link must stay up, but traffic from R1 to that LAN should go through R3.',
      'На всех трёх роутерах работает OSPF. Сейчас R1 шлёт трафик в LAN R2 ' + l2.net + '/24 по прямому serial-линку (cost 64 + 1). Прямой линк должен остаться включённым, но трафик от R1 в эту сеть должен идти через R3.',
      'OSPF רץ בשלושת הנתבים. עכשיו R1 שולח תעבורה ל-LAN של R2 ‏' + l2.net + '/24 בקישור ה-serial הישיר (cost 64 + 1). הקישור הישיר צריך להישאר פעיל, אבל התעבורה מ-R1 לרשת הזו צריכה לעבור דרך R3.'),
    steps: [
      T('Look: "show ip route ospf" on R1 — ' + l2.net + '/24 [110/65] via R2; "tracert ' + ip.pc2 + '" from PC1.', 'Посмотрите: "show ip route ospf" на R1 — ' + l2.net + '/24 [110/65] через R2; "tracert ' + ip.pc2 + '" с PC1.', 'מסתכלים: ‏"show ip route ospf" ב-R1 — ‏' + l2.net + '/24 [110/65] דרך R2; ‏"tracert ' + ip.pc2 + '" מ-PC1.'),
      T('On R1 ' + sh(R.R1.s12) + ' (to R2): "bandwidth ' + bw + '". cost = 100 000 / ' + bw + ' = ' + cost + ' — more than 64 + 64 through R3.', 'На R1 ' + sh(R.R1.s12) + ' (к R2): "bandwidth ' + bw + '". cost = 100 000 / ' + bw + ' = ' + cost + ' — больше, чем 64 + 64 через R3.', 'ב-R1 ‏' + sh(R.R1.s12) + ' (אל R2): ‏"bandwidth ' + bw + '". ‏cost = 100 000 / ' + bw + ' = ' + cost + ' — יותר מ-64 + 64 דרך R3.'),
      T('Verify: R1 now reaches ' + l2.net + '/24 [110/129] via R3; tracert from PC1 goes through R3. Replies from R2 still come directly (cost is counted on outgoing interfaces of each router) — asymmetric routing.', 'Проверка: R1 теперь идёт в ' + l2.net + '/24 [110/129] через R3; tracert с PC1 проходит через R3. Ответы от R2 по-прежнему идут напрямую (cost считается по исходящим интерфейсам каждого роутера) — асимметричная маршрутизация.', 'בדיקה: R1 מגיע עכשיו אל ' + l2.net + '/24 ‏[110/129] דרך R3; ה-tracert מ-PC1 עובר דרך R3. התשובות מ-R2 עדיין חוזרות ישירות (ה-cost נספר לפי ממשקי היציאה של כל נתב) — ניתוב אסימטרי.'),
    ],
    table: x.table,
    build(topo) { x.build(topo); for (const [d, c] of Object.entries(cmds)) tCli(topo, d, c); },
    checks: [CHK.ospfVia('R1', l2.net, 24, 'R3'), CHK.ifUp('R1', R.R1.s12), CHK.ospfNbrs('R1', 2), CHK.ping('PC1', 'PC2', ip.pc2)],
    solution: { cli: { R1: ['interface ' + R.R1.s12, 'bandwidth ' + bw] } },
    hints: [T('bandwidth does not change the real speed of the port — only the number OSPF divides the reference bandwidth by.', 'bandwidth не меняет реальную скорость порта — только число, на которое OSPF делит reference bandwidth.', 'bandwidth לא משנה את המהירות האמיתית של הפורט — רק את המספר ש-OSPF מחלק בו את ה-reference bandwidth.'),
      T('"ip ospf cost <n>" on the same interface does the same job directly.', '"ip ospf cost <n>" на том же интерфейсе делает то же самое напрямую.', '"ip ospf cost <n>" באותו ממשק עושה את אותו הדבר ישירות.')],
  };
});

// --- Port Security: sticky, maximum, violation, aging; неиспользуемые порты выключены ---
taskDef('psec', 'device', 2, (rng) => {
  const n3 = rng.int(1, 250);
  const net = { net: '192.168.' + n3 + '.0', len: 24, mask: '255.255.255.0' };
  const p1 = rng.int(1, 8), p2 = p1 + rng.int(1, 4);
  const port = fa(p1), port2 = fa(p2), srvPort = fa(rng.int(18, 19));
  const spec = { max: rng.pick([1, 2, 2, 3]), sticky: true, violation: rng.pick(['restrict', 'protect', 'shutdown']), agingTime: rng.pick([0, 10, 15]) };
  if (spec.agingTime) spec.agingType = rng.pick(['inactivity', 'absolute']);
  const unused = [20, 21, 22, 23, 24].map(fa);
  const ip = { pc1: host(net, 11), pc2: host(net, 12), srv: host(net, 100) };
  const vtxt = { restrict: T('restrict (drop + log + count, the port keeps working)', 'restrict (отбросить + журнал + счётчик, порт работает)', 'restrict (לזרוק + יומן + מונה, הפורט ממשיך לעבוד)'), protect: T('protect (drop silently)', 'protect (молча отбросить)', 'protect (לזרוק בשקט)'), shutdown: T('shutdown (err-disable the port)', 'shutdown (выключить порт в err-disabled)', 'shutdown (לכבות את הפורט ל-err-disabled)') }[spec.violation];
  const cli = ['interface ' + port, 'switchport mode access', 'switchport port-security'];
  if (spec.max !== 1) cli.push('switchport port-security maximum ' + spec.max);
  cli.push('switchport port-security mac-address sticky');
  if (spec.violation !== 'shutdown') cli.push('switchport port-security violation ' + spec.violation);
  if (spec.agingTime) cli.push('switchport port-security aging time ' + spec.agingTime, 'switchport port-security aging type ' + spec.agingType);
  cli.push('interface range ' + sh(unused[0]) + ' - 24', 'shutdown');
  return {
    title: T('Port Security on an access port', 'Port Security на access-порту', 'Port Security בפורט access'),
    intro: T('PC1 sits at the reception desk on S1 ' + sh(port) + '. Only known devices may work through that port, and unused ports must not be live. Configure Port Security and check what the switch has learned.',
      'PC1 стоит на ресепшене, порт S1 ' + sh(port) + '. Через этот порт должны работать только известные устройства, а неиспользуемые порты не должны быть включены. Настройте Port Security и проверьте, что выучил коммутатор.',
      'PC1 נמצא בדלפק הקבלה, בפורט ' + sh(port) + ' של S1. דרך הפורט הזה יעבדו רק התקנים מוכרים, ופורטים שלא בשימוש לא יהיו פעילים. יש להגדיר Port Security ולבדוק מה המתג למד.'),
    steps: [
      T('S1 ' + sh(port) + ': "switchport mode access" first — on a dynamic port the command is rejected — then "switchport port-security".', 'S1 ' + sh(port) + ': сначала "switchport mode access" — на dynamic-порту команда отклоняется, — потом "switchport port-security".', 'S1 ' + sh(port) + ': קודם "switchport mode access" — בפורט dynamic הפקודה נדחית — ואז "switchport port-security".'),
      T('Maximum ' + spec.max + ' MAC, sticky learning, violation mode ' + vtxt.en + (spec.agingTime ? ', aging time ' + spec.agingTime + ' min, type ' + spec.agingType : '') + '.', 'Максимум ' + spec.max + ' MAC, обучение sticky, режим нарушения ' + vtxt.ru + (spec.agingTime ? ', aging time ' + spec.agingTime + ' мин, type ' + spec.agingType : '') + '.', 'מקסימום ' + spec.max + ' MAC, למידה sticky, מצב הפרה ' + vtxt.he + (spec.agingTime ? ', ‏aging time ' + spec.agingTime + ' דקות, type ' + spec.agingType : '') + '.'),
      T('Shut down the unused ports ' + sh(unused[0]) + '–24 with "interface range".', 'Выключите неиспользуемые порты ' + sh(unused[0]) + '–24 через "interface range".', 'כבו את הפורטים הלא בשימוש ' + sh(unused[0]) + '–24 עם "interface range".'),
      T('Ping the server ' + ip.srv + ' from PC1, then "show port-security interface ' + sh(port) + '", "show port-security address" and "show running-config" — the sticky MAC is in the configuration (save it with "copy run start" or it is lost after a reload).', 'Сделайте ping сервера ' + ip.srv + ' с PC1, потом "show port-security interface ' + sh(port) + '", "show port-security address" и "show running-config" — sticky MAC в конфигурации (сохраните "copy run start", иначе после перезагрузки пропадёт).', 'עשו ping לשרת ' + ip.srv + ' מ-PC1, ואז "show port-security interface ' + sh(port) + '", ‏"show port-security address" ו-"show running-config" — ה-MAC מסוג sticky נמצא בתצורה (שמרו עם "copy run start", אחרת הוא ייעלם אחרי reload).'),
    ],
    table: [rowPc('PC1', ip.pc1, net.mask), rowPc('PC2', ip.pc2, net.mask), rowPc('Server', ip.srv, net.mask), { dev: 'S1', iface: sh(port) + ' / ' + sh(port2) + ' / ' + sh(srvPort), ip: 'PC1 / PC2 / Server', mask: '', gw: '' }],
    build(topo) {
      tAdd(topo, '2960', 'S1', 450, 150);
      tAdd(topo, 'PC', 'PC1', 220, 360); tAdd(topo, 'PC', 'PC2', 450, 380); tAdd(topo, 'Server', 'Server', 700, 360);
      tLink(topo, 'PC1', 'FastEthernet0', 'S1', port); tLink(topo, 'PC2', 'FastEthernet0', 'S1', port2); tLink(topo, 'Server', 'FastEthernet0', 'S1', srvPort);
      tHostname(topo, ['S1']);
      tPc(topo, 'PC1', ip.pc1, net.mask); tPc(topo, 'PC2', ip.pc2, net.mask); tPc(topo, 'Server', ip.srv, net.mask);
    },
    checks: [CHK.psec('S1', port, spec), CHK.portsShut('S1', unused), CHK.ping('PC1', 'Server', ip.srv), CHK.psecLearned('S1', port, 'PC1')],
    solution: { cli: { S1: cli } },
    hints: [T('Defaults after "switchport port-security": maximum 1, violation shutdown, dynamic learning, aging off.', 'По умолчанию после "switchport port-security": maximum 1, violation shutdown, динамическое обучение, aging выключен.', 'ברירות מחדל אחרי "switchport port-security": ‏maximum 1, ‏violation shutdown, למידה דינמית, aging כבוי.'),
      T('An IP phone with a PC behind it needs maximum 2.', 'IP-телефону с ПК за ним нужен maximum 2.', 'טלפון IP עם מחשב מאחוריו צריך maximum 2.')],
  };
});

// --- Неисправность: Port Security выключил порт (err-disabled) ---
taskDef('ts-psec', 'trouble', 2, (rng) => {
  const n3 = rng.int(1, 250);
  const net = { net: '10.' + rng.int(1, 200) + '.' + n3 + '.0', len: 24, mask: '255.255.255.0' };
  const port = fa(rng.int(2, 12)), srvPort = fa(24);
  const hx = (w) => rng.int(0, Math.pow(16, w) - 1).toString(16).toUpperCase().padStart(w, '0');
  const oldMac = '00' + hx(2) + '.' + hx(4) + '.' + hx(4);
  const ip = { pc: host(net, rng.int(20, 90)), srv: host(net, 250) };
  return {
    title: T('Troubleshoot: the new PC has no network', 'Неисправность: у нового ПК нет сети', 'איתור תקלות: למחשב החדש אין רשת'),
    intro: T('At the desk on S1 ' + sh(port) + ' the old computer was replaced by PC1. Port Security is on (maximum 1, sticky). PC1 cannot reach the server ' + ip.srv + '. Find out why and fix it — Port Security must stay on.',
      'На рабочем месте с портом S1 ' + sh(port) + ' старый компьютер заменили на PC1. На порту включён Port Security (maximum 1, sticky). PC1 не достаёт до сервера ' + ip.srv + '. Найдите причину и исправьте — Port Security должен остаться включённым.',
      'בעמדה שבפורט ' + sh(port) + ' של S1 הוחלף המחשב הישן ב-PC1. בפורט מופעל Port Security ‏(maximum 1, sticky). ‏PC1 לא מגיע לשרת ' + ip.srv + '. מצאו את הסיבה ותקנו — Port Security חייב להישאר מופעל.'),
    steps: [
      T('Ping the server from PC1 and watch the S1 console and the port light.', 'Сделайте ping сервера с PC1 и посмотрите на консоль S1 и огонёк порта.', 'עשו ping לשרת מ-PC1 והסתכלו על הקונסולה של S1 ועל נורית הפורט.'),
      T('"show interfaces status", "show port-security interface ' + sh(port) + '" (Port Status, Violation Count, Last Source Address) and "show running-config".', '"show interfaces status", "show port-security interface ' + sh(port) + '" (Port Status, Violation Count, Last Source Address) и "show running-config".', '"show interfaces status", ‏"show port-security interface ' + sh(port) + '" ‏(Port Status, Violation Count, Last Source Address) ו-"show running-config".'),
      T('Remove the cause first (the sticky address of the old computer), then bring the port back: "shutdown" + "no shutdown". Verify: PC1 pings the server and its MAC becomes the new sticky address.', 'Сначала уберите причину (sticky-адрес старого компьютера), потом поднимите порт: "shutdown" + "no shutdown". Проверка: PC1 пингует сервер, а его MAC становится новым sticky-адресом.', 'קודם מסירים את הסיבה (כתובת ה-sticky של המחשב הישן), ואז מחזירים את הפורט: ‏"shutdown" + "no shutdown". בדיקה: ‏PC1 עושה ping לשרת וה-MAC שלו נעשה כתובת ה-sticky החדשה.'),
    ],
    table: [rowPc('PC1', ip.pc, net.mask), rowPc('Server', ip.srv, net.mask), { dev: 'S1', iface: sh(port) + ' / ' + sh(srvPort), ip: 'PC1 / Server', mask: '', gw: '' }],
    build(topo) {
      tAdd(topo, '2960', 'S1', 450, 150);
      tAdd(topo, 'PC', 'PC1', 250, 360); tAdd(topo, 'Server', 'Server', 650, 360);
      tLink(topo, 'PC1', 'FastEthernet0', 'S1', port); tLink(topo, 'Server', 'FastEthernet0', 'S1', srvPort);
      tHostname(topo, ['S1']);
      tCli(topo, 'S1', ['interface ' + port, 'switchport mode access', 'switchport port-security', 'switchport port-security mac-address sticky', 'switchport port-security mac-address sticky ' + oldMac.toLowerCase()]);
      tPc(topo, 'PC1', ip.pc, net.mask); tPc(topo, 'Server', ip.srv, net.mask);
    },
    checks: [CHK.ping('PC1', 'Server', ip.srv), CHK.psecUp('S1', port), CHK.psec('S1', port, { max: 1, sticky: true }), CHK.psecLearned('S1', port, 'PC1')],
    solution: { cli: { S1: ['interface ' + port, 'no switchport port-security mac-address ' + oldMac.toLowerCase(), 'shutdown', 'no shutdown'] } },
    faults: [T('The port still had the sticky MAC ' + oldMac.toLowerCase() + ' of the old computer (maximum 1): PC1\'s first frame was a violation, so the port went err-disabled.', 'На порту остался sticky MAC ' + oldMac.toLowerCase() + ' старого компьютера (maximum 1): первый же кадр PC1 стал нарушением, и порт ушёл в err-disabled.', 'בפורט נשאר ה-MAC מסוג sticky ‏' + oldMac.toLowerCase() + ' של המחשב הישן (maximum 1): המסגרת הראשונה של PC1 הייתה הפרה, והפורט עבר ל-err-disabled.')],
    hints: [T('If you only do shutdown / no shutdown, the port goes down again with the next frame — the cause is still there.', 'Если сделать только shutdown / no shutdown, порт снова упадёт со следующим кадром — причина осталась.', 'אם עושים רק shutdown / no shutdown, הפורט ייפול שוב עם המסגרת הבאה — הסיבה עדיין שם.'),
      T('"clear port-security sticky" (privileged mode) also removes learned sticky addresses.', '"clear port-security sticky" (привилегированный режим) тоже удаляет выученные sticky-адреса.', '"clear port-security sticky" (מצב מורשה) גם מוחק כתובות sticky שנלמדו.')],
  };
});
