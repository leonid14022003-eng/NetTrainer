'use strict';
// Эмулятор Cisco IOS CLI: дерево команд, сокращения, "?"-подсказки, Tab, show-команды.

const IOS_SUFFIX = {
  user: '>', priv: '#', config: '(config)#', if: '(config-if)#', subif: '(config-subif)#', range: '(config-if-range)#',
  'router-rip': '(config-router)#', 'router-ospf': '(config-router)#', dhcp: '(dhcp-config)#', line: '(config-line)#', vlan: '(config-vlan)#',
};
const IOS_CONFIG_SUBMODES = ['if', 'subif', 'range', 'router-rip', 'router-ospf', 'dhcp', 'line', 'vlan'];

const IOS_HELP = {
  enable: 'Turn on privileged commands', disable: 'Turn off privileged commands', exit: 'Exit from the EXEC', logout: 'Exit from the EXEC',
  configure: 'Enter configuration mode', terminal: 'Configure from the terminal', show: 'Show running system information',
  ping: 'Send echo messages', traceroute: 'Trace route to destination', copy: 'Copy from one file to another', write: 'Write running configuration to memory',
  reload: 'Halt and perform a cold restart', erase: 'Erase a filesystem', clear: 'Reset functions', hostname: 'Set system\'s network name',
  interface: 'Select an interface to configure', router: 'Enable a routing process', ip: 'Global IP configuration subcommands',
  no: 'Negate a command or set its defaults', end: 'Exit from configure mode', do: 'To run exec commands in config mode',
  line: 'Configure a terminal line', banner: 'Define a login banner', service: 'Modify use of network based services',
  username: 'Establish User Name Authentication', vlan: 'Vlan commands', 'spanning-tree': 'Spanning Tree Subsystem', cdp: 'Global CDP configuration subcommands',
  crypto: 'Encryption module', shutdown: 'Shutdown the selected interface', address: 'Set the IP address of an interface',
  description: 'Interface specific description', switchport: 'Set switching mode characteristics', encapsulation: 'Set encapsulation type for an interface',
  'helper-address': 'Specify a destination address for UDP broadcasts', ospf: 'OSPF interface commands', duplex: 'Configure duplex operation.',
  speed: 'Configure speed operation.', mode: 'Set trunking mode of the interface', access: 'Set access mode characteristics of the interface',
  trunk: 'Set trunking characteristics of the interface', native: 'Set trunking native characteristics when interface is in trunking mode',
  allowed: 'Set allowed VLAN characteristics when interface is in trunking mode', nonegotiate: 'Device will not engage in negotiation protocol on this interface',
  version: 'Set routing protocol version', network: 'Enable routing on an IP network', 'auto-summary': 'Enable automatic network number summarization',
  'passive-interface': 'Suppress routing updates on an interface', 'default-information': 'Control distribution of default information',
  'router-id': 'router-id for this OSPF process', 'default-router': 'Default routers', 'dns-server': 'DNS servers', 'domain-name': 'Domain name',
  password: 'Set a password', login: 'Enable password checking', transport: 'Define transport protocols for line', name: 'Ascii name of the VLAN',
  route: 'Establish static routes', dhcp: 'Configure DHCP server and relay parameters', pool: 'Configure DHCP address pools',
  'excluded-address': 'Prevent DHCP from assigning certain addresses', 'default-gateway': 'Specify default gateway (if not routing IP)',
  'domain-lookup': 'Enable IP Domain Name System hostname translation', 'name-server': 'Specify address of name server to use', host: 'Add an entry to the ip hostname table',
  hosts: 'IP domain-name, lookup style, nameservers, and host table', server: 'Miscellaneous DHCP server information', statistics: 'DHCP server statistics', conflict: 'DHCP address conflicts',
secret: 'Assign the privileged level secret', 'running-config': 'Current operating configuration',
  'startup-config': 'Contents of startup configuration', brief: 'Brief summary of IP status and configuration', interfaces: 'Interface status and configuration',
  protocols: 'IP routing protocol process parameters and statistics', neighbor: 'Neighbor list', binding: 'DHCP address bindings',
  'mac-address-table': 'MAC forwarding table', 'mac': 'MAC configuration', 'cdp ': 'CDP information', neighbors: 'CDP neighbor entries', arp: 'ARP table',
  rip: 'Routing Information Protocol (RIP)', range: 'interface range command', console: 'Primary terminal line', vty: 'Virtual terminal',
  memory: 'Write to NV memory', 'password-encryption': 'Encrypt system passwords', motd: 'Set Message of the Day banner', area: 'OSPF area ID',
};

const IOS_PARAM_HELP = {
  ip: 'A.B.C.D', mask: 'A.B.C.D', wild: 'A.B.C.D', num: '<0-4294967295>', word: 'WORD', line: 'LINE', if: 'IFNAME', pfx: '/nn', vlans: 'WORD', area: '<0-4294967295>',
};
const IOS_PARAM_DESC = {
  ip: 'IP address', mask: 'Subnet mask', wild: 'Wildcard bits', num: 'Number', word: 'Name / value', line: 'Text', if: 'Interface name (e.g. g0/0, fa0/1, vlan 1)',
  pfx: 'Prefix length', vlans: 'VLAN IDs of the allowed VLANs (e.g. 10,20,30-35)', area: 'OSPF area ID as a decimal value',
};

const IOS_TREES = {};

function iosNode() { return { kw: new Map(), params: [], handlers: [], devs: new Set() }; }

function iosDef(modes, pattern, fn, opts = {}) {
  const toks = pattern.trim().split(/\s+/);
  for (const mode of modes) {
    const root = (IOS_TREES[mode] = IOS_TREES[mode] || iosNode());
    let node = root;
    const devTag = opts.dev || 'any';
    node.devs.add(devTag);
    for (const t of toks) {
      let next;
      if (t.startsWith('<')) {
        const type = t.slice(1, -1);
        let p = node.params.find((x) => x.type === type);
        if (!p) { p = { type, node: iosNode() }; node.params.push(p); }
        next = p.node;
      } else {
        const k = t.toLowerCase();
        if (!node.kw.has(k)) node.kw.set(k, iosNode());
        next = node.kw.get(k);
      }
      next.devs.add(devTag);
      node = next;
    }
    node.handlers.push({ fn, dev: opts.dev || null, ro: !!opts.ro });
  }
}

function iosNodeOk(n, devType) { return n.devs.has('any') || n.devs.has(devType); }

function iosTokenize(line) {
  const toks = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(line))) toks.push({ t: m[0], pos: m.index });
  return toks;
}

function parseVlanList(s) {
  const out = new Set();
  for (const part of s.split(',')) {
    const m = part.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a;
    if (a < 1 || b > 4094 || b < a) return null;
    for (let v = a; v <= b; v++) out.add(v);
  }
  return [...out].sort((x, y) => x - y);
}

function vlanListStr(list) {
  if (!list.length) return 'none';
  const out = [];
  let s = list[0], prev = list[0];
  for (let i = 1; i <= list.length; i++) {
    const v = list[i];
    if (v === prev + 1) { prev = v; continue; }
    out.push(s === prev ? String(s) : s + '-' + prev);
    s = prev = v;
  }
  return out.join(',');
}

function iosAcceptParam(type, toks, i, raw) {
  const t = toks[i].t;
  switch (type) {
    case 'ip': case 'mask': case 'wild': return isIp(t) ? { value: t, consumed: 1 } : null;
    case 'num': return /^\d+$/.test(t) ? { value: Number(t), consumed: 1 } : null;
    case 'word': return { value: t, consumed: 1 };
    case 'line': return { value: raw.slice(toks[i].pos).trimEnd(), consumed: toks.length - i };
    case 'pfx': return /^\/\d{1,2}$/.test(t) ? { value: Number(t.slice(1)), consumed: 1 } : null;
    case 'vlans': { const l = parseVlanList(t); return l ? { value: l, consumed: 1 } : null; }
    case 'area': {
      if (/^\d+$/.test(t)) return { value: String(Number(t)), consumed: 1 };
      if (isIp(t)) return { value: String(ipToInt(t)), consumed: 1 };
      return null;
    }
    case 'if': {
      let name = parseIfName(t);
      if (name) return { value: name, consumed: 1 };
      if (i + 1 < toks.length && /^[a-z-]+$/i.test(t) && /^\d/.test(toks[i + 1].t)) {
        name = parseIfName(t + toks[i + 1].t);
        if (name) return { value: name, consumed: 2 };
      }
      return null;
    }
  }
  return null;
}

function iosMatch(root, toks, devType, raw) {
  let node = root;
  const params = [], words = [];
  let i = 0;
  while (i < toks.length) {
    const low = toks[i].t.toLowerCase();
    const cands = [...node.kw.entries()].filter(([k, n]) => k.startsWith(low) && iosNodeOk(n, devType));
    const exact = cands.find(([k]) => k === low);
    if (exact || cands.length === 1) {
      const [k, n] = exact || cands[0];
      node = n; words.push(k); i++;
      continue;
    }
    let matched = false;
    for (const p of node.params) {
      if (!iosNodeOk(p.node, devType)) continue;
      const r = iosAcceptParam(p.type, toks, i, raw);
      if (r) { params.push(r.value); words.push(r.value); node = p.node; i += r.consumed; matched = true; break; }
    }
    if (matched) continue;
    if (cands.length > 1) return { error: 'ambiguous', pos: i };
    return { error: 'invalid', pos: i };
  }
  const h = node.handlers.find((x) => !x.dev || x.dev === devType);
  if (!h) return { error: 'incomplete', node };
  return { ok: true, handler: h, params, words };
}

// ---------- Сессии ----------
function iosNewSession(topo, devId) {
  return { devId, mode: 'user', ifs: [], proto: null, pool: null, lineName: null, vlanId: null, history: [], pending: null, started: false };
}

function iosPrompt(topo, sess) {
  const dev = topo.devices[sess.devId];
  if (!sess.started) return '';
  if (sess.pending && sess.pending.prompt !== undefined) return sess.pending.prompt;
  return dev.cfg.hostname + IOS_SUFFIX[sess.mode];
}

// Образы IOS по моделям — тексты загрузки и show version как в Packet Tracer
const IOS_IMAGES = {
  isr4: { cfgVer: '16.6', rom: 'IOS-XE ROMMON',
    lines: ['Cisco IOS XE Software, Version 16.06.04', 'Cisco IOS Software [Everest], ISR Software (X86_64_LINUX_IOSD-UNIVERSALK9-M), Version 16.6.4, RELEASE SOFTWARE (fc3)', 'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 1986-2018 by Cisco Systems, Inc.', 'Compiled Sun 08-Jul-18 04:33 by mcpre'],
    file: 'bootflash:isr4300-universalk9.16.06.04.SPA.bin' },
  c1900: { cfgVer: '15.1', rom: 'System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)',
    lines: ['Cisco IOS Software, C1900 Software (C1900-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc2)', 'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 1986-2012 by Cisco Systems, Inc.', 'Compiled Thurs 5-Jan-12 15:41 by prod_rel_team'],
    file: 'flash0:c1900-universalk9-mz.SPA.151-1.M4.bin' },
  c2900: { cfgVer: '15.1', rom: 'System Bootstrap, Version 15.1(4)M4, RELEASE SOFTWARE (fc1)',
    lines: ['Cisco IOS Software, C2900 Software (C2900-UNIVERSALK9-M), Version 15.1(4)M4, RELEASE SOFTWARE (fc2)', 'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 1986-2012 by Cisco Systems, Inc.', 'Compiled Thurs 5-Jan-12 15:41 by prod_rel_team'],
    file: 'flash0:c2900-universalk9-mz.SPA.151-1.M4.bin' },
  c2960: { cfgVer: '15.0', rom: 'Bootstrap program is C2960 boot loader', boot: 'C2960 Boot Loader (C2960-HBOOT-M) Version 12.2(25r)FX, RELEASE SOFTWARE (fc4)',
    lines: ['Cisco IOS Software, C2960 Software (C2960-LANBASEK9-M), Version 15.0(2)SE4, RELEASE SOFTWARE (fc1)', 'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 1986-2013 by Cisco Systems, Inc.', 'Compiled Wed 26-Jun-13 02:49 by mnguyen'],
    file: 'flash:c2960-lanbasek9-mz.150-2.SE4.bin', swVer: '15.0(2)SE4', swImg: 'C2960-LANBASEK9-M' },
  c2950: { cfgVer: '12.1', rom: 'Bootstrap program is C2950 boot loader', boot: 'C2950 Boot Loader (C2950-HBOOT-M) Version 12.1(11r)EA1, RELEASE SOFTWARE (fc1)',
    lines: ['Cisco Internetwork Operating System Software', 'IOS (tm) C2950 Software (C2950-I6Q4L2-M), Version 12.1(22)EA4, RELEASE SOFTWARE(fc1)', 'Copyright (c) 1986-2005 by cisco Systems, Inc.', 'Compiled Wed 18-May-05 22:31 by jharirba'],
    file: 'flash:c2950-i6q4l2-mz.121-22.EA4.bin', swVer: '12.1(22)EA4', swImg: 'C2950-I6Q4L2-M' },
};

function iosImage(dev) {
  const m = dev.model;
  if (m.startsWith('43')) return IOS_IMAGES.isr4;
  if (m === '1941') return IOS_IMAGES.c1900;
  if (m.startsWith('29') && dev.type === 'router') return IOS_IMAGES.c2900;
  if (m.startsWith('2950')) return IOS_IMAGES.c2950;
  return IOS_IMAGES.c2960;
}

// Аппаратная часть по моделям: платформа, память, серийный номер
function iosHw(dev) {
  const nGig = dev.ports.filter((p) => /^Gigabit/.test(p.name)).length;
  const nFa = dev.ports.filter((p) => /^FastEthernet/.test(p.name)).length;
  const num = (parseInt(String(dev.id).replace(/\D/g, ''), 10) || 0) % 900 + 100;
  switch (dev.model) {
    case '4331': case '4321': return { pid: 'ISR' + dev.model + '/K9', cpu: 'cisco ISR' + dev.model + '/K9 (1RU) processor with 1795999K/6147K bytes of memory.', sn: 'FLM2041W' + num, nGig, nFa };
    case '1941': return { pid: 'CISCO1941/K9', cpu: 'Cisco CISCO1941/K9 (revision 1.0) with 491520K/32768K bytes of memory.', sn: 'FTX152400' + num, nGig, nFa };
    case '2901': case '2911': return { pid: 'CISCO' + dev.model + '/K9', cpu: 'Cisco CISCO' + dev.model + '/K9 (revision 1.0) with 491520K/32768K bytes of memory.', sn: 'FTX152470' + num, nGig, nFa };
    case '2950-24': case '2950T': {
      const pid = dev.model === '2950T' ? 'WS-C2950T-24' : 'WS-C2950-24';
      return { pid, cpu: 'cisco ' + pid + ' (RC32300) processor (revision C0) with 21039K bytes of memory.', sn: 'FHK0610Z' + num, nGig, nFa };
    }
    default: return { pid: 'WS-C2960-24TT-L', cpu: 'cisco WS-C2960-24TT-L (PowerPC405) processor (revision B0) with 65536K bytes of memory.', sn: 'FOC1010X' + num, nGig, nFa };
  }
}

function iosIfLines(hw, oldStyle) {
  const L = [];
  if (hw.nFa) L.push(hw.nFa + (oldStyle ? ' FastEthernet/IEEE 802.3 interface(s)' : ' FastEthernet interfaces'));
  if (hw.nGig) L.push(hw.nGig + (oldStyle ? ' Gigabit Ethernet/IEEE 802.3 interface(s)' : ' Gigabit Ethernet interfaces'));
  return L;
}

function iosBootText(dev) {
  const img = iosImage(dev), hw = iosHw(dev);
  const mac = (dev.ports[0] && dev.ports[0].mac) || '0001.6377.9A01';
  let L = [];
  if (dev.type === 'router' && img === IOS_IMAGES.isr4) {
    L = ['Initializing Hardware ...', '', 'System integrity status: 00000610', 'Rom image verified correctly', '', 'System Bootstrap, Version 16.6(4r), RELEASE SOFTWARE', 'Copyright (c) 1994-2018  by cisco Systems, Inc.', '',
      'Current image running: Boot ROM0', '', 'Last reset cause: LocalSoft', hw.pid + ' platform with 4194304 Kbytes of main memory', '',
      'Loading "' + img.file + '" ...', '#'.repeat(60), '', ...img.lines, '',
      hw.cpu, 'Processor board ID ' + hw.sn, ...iosIfLines(hw), '32768K bytes of non-volatile configuration memory.', '4194304K bytes of physical memory.', '3207167K bytes of flash memory at bootflash:.', '978928K bytes of USB flash at usb0:.'];
  } else if (dev.type === 'router') {
    L = [img.rom, 'Technical Support: http://www.cisco.com/techsupport', 'Copyright (c) 2010 by cisco Systems, Inc.', 'Total memory size = 512 MB - On-board = 512 MB, DIMM0 = 0 MB', hw.pid + ' platform with 524288 Kbytes of main memory',
      'Main memory is configured to 64/-1(On-board/DIMM0) bit mode with ECC disabled', '', 'Readonly ROMMON initialized', 'program load complete, entry point: 0x80803000, size: 0x1b340', '',
      'IOS Image Load Test', '___________________', 'Digitally Signed Release Software', 'program load complete, entry point: 0x81000000, size: 0x2bb1c58', 'Self decompressing the image :', '#'.repeat(66) + ' [OK]', '',
      ...img.lines, 'Image text-base: 0x2100F918, data-base: 0x24729040', '', hw.cpu, 'Processor board ID ' + hw.sn, ...iosIfLines(hw),
      'DRAM configuration is 64 bits wide with parity disabled.', '255K bytes of non-volatile configuration memory.', '249856K bytes of ATA System CompactFlash 0 (Read/Write)'];
  } else {
    const old = img === IOS_IMAGES.c2950;
    L = [img.boot, hw.cpu.replace(/^cisco /, 'Cisco '), hw.pid.replace(/^WS-C/, '').replace(/-L$/, '') + ' starting...', 'Base ethernet MAC Address: ' + mac, 'Xmodem file system is available.', 'Initializing Flash...',
      'flashfs[0]: 1 files, 0 directories', 'flashfs[0]: 0 orphaned files, 0 orphaned directories', 'flashfs[0]: Total bytes: 64016384', 'flashfs[0]: Bytes used: 4414921', 'flashfs[0]: Bytes available: 59601463', 'flashfs[0]: flashfs fsck took 1 seconds.', '...done Initializing Flash.', '',
      'Loading "' + img.file.replace('flash:', 'flash:/') + '"...', '#'.repeat(66) + ' [OK]', '', ...img.lines, '', hw.cpu, ...iosIfLines(hw, old), '',
      (old ? '63488K' : '64K') + ' bytes of flash-simulated non-volatile configuration memory.', 'Base ethernet MAC Address       : ' + mac, 'Model number                    : ' + hw.pid, 'System serial number            : ' + hw.sn];
    if (!old) L.push('', 'Switch Ports Model              SW Version            SW Image', '------ ----- -----              ----------            ----------',
      '*    1 ' + padR(String(dev.ports.length), 6) + padR(hw.pid, 19) + padR(img.swVer, 22) + img.swImg);
  }
  if (!dev.startup) L.push('', '', '         --- System Configuration Dialog ---', '', 'Would you like to enter the initial configuration dialog? [yes/no]: no');
  L.push('', '', 'Press RETURN to get started!', '');
  return L.join('\n');
}

function iosStartBanner(dev) {
  const lines = [];
  if (dev.cfg.banner) lines.push(dev.cfg.banner);
  return lines.join('\n');
}

// Первая строка после RETURN: баннер, проверка пароля консоли
function iosBegin(topo, sess) {
  const dev = topo.devices[sess.devId];
  sess.started = true;
  sess.mode = 'user';
  const out = [];
  if (dev.cfg.banner) out.push(dev.cfg.banner);
  const con = dev.cfg.lines.con;
  if (con.login && (con.password || con.loginLocal)) {
    out.push('', 'User Access Verification', '');
    sess.pending = { kind: 'login', tries: 0, prompt: 'Password: ', hidden: true };
  }
  return out.join('\n');
}

function iosCtx(topo, sess, params, words, raw) {
  const dev = topo.devices[sess.devId];
  const out = [];
  return {
    topo, dev, cfg: dev.cfg, sess, p: params, w: words, raw, outLines: out, slow: false,
    out(s) { out.push(s); },
    err(s) { out.push(s); },
  };
}

function iosInvalid(prompt, line, pos, toks) {
  const col = prompt.length + (toks[pos] ? toks[pos].pos : line.length);
  return ' '.repeat(col) + '^\n% Invalid input detected at \'^\' marker.\n';
}

// Выполнить строку. Возвращает {out, slow, clear}
function iosExec(topo, sess, line) {
  const dev = topo.devices[sess.devId];
  const rt = netRt(topo);
  if (!sess.started) {
    return { out: iosBegin(topo, sess) };
  }
  if (sess.pending) return iosHandlePending(topo, sess, line);
  const trimmed = line.trim();
  if (!trimmed) return { out: '' };
  if (trimmed.startsWith('!')) return { out: '' };
  sess.history.push(trimmed);
  if (sess.history.length > 50) sess.history.shift();
  // фильтр вывода: | include X
  let filter = null;
  let cmdLine = line;
  const pipe = line.match(/^(.*?)\s\|\s*(include|exclude|begin|section|i|e|b|s|inc|incl|excl|beg|sec)\s+(.+)$/i);
  if (pipe) { cmdLine = pipe[1]; filter = { kind: pipe[2].toLowerCase()[0], re: pipe[3].trim() }; }
  const prompt = iosPrompt(topo, sess);
  rt.capture = { devId: sess.devId, lines: [] };
  let res;
  try {
    res = iosRun(topo, sess, cmdLine, prompt);
  } finally {
    const cap = rt.capture;
    rt.capture = null;
    if (cap.lines.length) {
      res = res || { out: '' };
      res.out = (res.out ? res.out.replace(/\n$/, '') + '\n' : '') + cap.lines.join('\n') + '\n';
    }
  }
  if (filter && res.out) res.out = iosFilter(res.out, filter);
  return res;
}

function iosFilter(text, f) {
  const lines = text.split('\n');
  const test = (l) => l.toLowerCase().includes(f.re.toLowerCase());
  if (f.kind === 'i') return lines.filter(test).join('\n') + '\n';
  if (f.kind === 'e') return lines.filter((l) => !test(l)).join('\n') + '\n';
  if (f.kind === 'b') { const i = lines.findIndex(test); return i < 0 ? '' : lines.slice(i).join('\n'); }
  if (f.kind === 's') {
    const out = [];
    let on = false;
    for (const l of lines) {
      if (!l.startsWith(' ')) on = test(l);
      if (on) out.push(l);
    }
    return out.join('\n') + '\n';
  }
  return text;
}

function iosRun(topo, sess, line, prompt) {
  const dev = topo.devices[sess.devId];
  const toks = iosTokenize(line);
  let mode = sess.mode;
  let m = iosMatch(IOS_TREES[mode], toks, dev.type, line);
  let fellBack = false;
  if (m.error && IOS_CONFIG_SUBMODES.includes(mode)) {
    const m2 = iosMatch(IOS_TREES.config, toks, dev.type, line);
    if (m2.ok) { m = m2; fellBack = true; }
  }
  if (m.error) {
    if (m.error === 'ambiguous') return { out: '% Ambiguous command: "' + line.trim() + '"\n' };
    if (m.error === 'incomplete') return { out: '% Incomplete command.\n' };
    if ((mode === 'user' || mode === 'priv') && m.pos === 0 && toks.length === 1) {
      const lookup = dev.cfg.domainLookup;
      return { out: iosTranslating(dev.cfg, toks[0].t) +
        '% Unknown command or computer name, or unable to find computer address\n', slow: lookup };
    }
    return { out: iosInvalid(prompt, line, m.pos, toks) };
  }
  if (fellBack) sess.mode = 'config';
  const c = iosCtx(topo, sess, m.params, m.words, line);
  const modeBefore = sess.mode;
  m.handler.fn(c);
  if (fellBack && sess.mode === 'config' && modeBefore === 'config') { /* остаёмся в config */ }
  if (!m.handler.ro) netCommit(topo);
  const text = c.outLines.length ? c.outLines.join('\n') + '\n' : '';
  return { out: text, slow: c.slow, clear: c.clear };
}

function iosHandlePending(topo, sess, line) {
  const dev = topo.devices[sess.devId];
  const p = sess.pending;
  if (p.kind === 'login') {
    const con = dev.cfg.lines.con;
    if (line === con.password) { sess.pending = null; return { out: '' }; }
    p.tries++;
    if (p.tries >= 3) { sess.pending = null; sess.started = false; return { out: '% Bad passwords\n\n\n\nPress RETURN to get started!\n' }; }
    return { out: '' };
  }
  if (p.kind === 'enable') {
    const ok = (dev.cfg.enableSecret && line === dev.cfg.enableSecret) || (!dev.cfg.enableSecret && line === dev.cfg.enablePassword);
    if (ok) { sess.pending = null; sess.mode = 'priv'; return { out: '' }; }
    p.tries++;
    if (p.tries >= 3) { sess.pending = null; return { out: '% Bad secrets\n' }; }
    return { out: '' };
  }
  if (p.kind === 'confirm') {
    sess.pending = null;
    const l = line.trim().toLowerCase();
    if (p.yesOnly && l && !'yes'.startsWith(l) && !'confirm'.startsWith(l)) return { out: '' };
    if (l === 'n' || l === 'no') return { out: '' };
    const r = p.then(line);
    if (!p.ro) netCommit(topo);
    return { out: r || '' };
  }
  if (p.kind === 'banner') {
    const idx = line.indexOf(p.delim);
    if (idx >= 0) {
      p.lines.push(line.slice(0, idx));
      dev.cfg.banner = p.lines.join('\n');
      sess.pending = null;
      return { out: '' };
    }
    p.lines.push(line);
    return { out: '' };
  }
  sess.pending = null;
  return { out: '' };
}

// ---------- Подсказки "?" и Tab ----------
function iosHelp(topo, sess, line) {
  const dev = topo.devices[sess.devId];
  if (!sess.started || sess.pending) return '';
  const toks = iosTokenize(line);
  const endsWithSpace = /\s$/.test(line) || line === '';
  const roots = [IOS_TREES[sess.mode]];
  if (IOS_CONFIG_SUBMODES.includes(sess.mode)) roots.push(IOS_TREES.config);
  const items = new Map();
  let anyCr = false;
  for (const root of roots) {
    const pre = endsWithSpace ? toks : toks.slice(0, -1);
    let node = root;
    if (pre.length) {
      const m = iosMatchPrefix(root, pre, dev.type, line);
      if (!m) continue;
      node = m;
    }
    const partial = endsWithSpace ? '' : toks[toks.length - 1].t.toLowerCase();
    for (const [k, n] of node.kw) {
      if (!iosNodeOk(n, dev.type)) continue;
      if (k.startsWith(partial) && !items.has(k)) items.set(k, IOS_HELP[k] || '');
    }
    if (endsWithSpace) {
      for (const p of node.params) {
        if (!iosNodeOk(p.node, dev.type)) continue;
        const label = IOS_PARAM_HELP[p.type];
        if (!items.has(label)) items.set(label, IOS_PARAM_DESC[p.type]);
      }
      if (node.handlers.some((h) => !h.dev || h.dev === dev.type)) anyCr = true;
    }
  }
  if (!items.size && !anyCr) return '% Unrecognized command\n';
  const keys = [...items.keys()].sort();
  if (!endsWithSpace) return keys.join('  ') + '\n';
  const w = Math.max(8, ...keys.map((k) => k.length)) + 2;
  const lines = keys.map((k) => '  ' + padR(k, w) + items.get(k));
  if (anyCr) lines.push('  <cr>');
  return lines.join('\n') + '\n';
}

function iosMatchPrefix(root, toks, devType, raw) {
  let node = root;
  let i = 0;
  while (i < toks.length) {
    const low = toks[i].t.toLowerCase();
    const cands = [...node.kw.entries()].filter(([k, n]) => k.startsWith(low) && iosNodeOk(n, devType));
    const exact = cands.find(([k]) => k === low);
    if (exact || cands.length === 1) { node = (exact || cands[0])[1]; i++; continue; }
    let ok = false;
    for (const p of node.params) {
      if (p.type === 'line') return null;
      const r = iosAcceptParam(p.type, toks, i, raw);
      if (r) { node = p.node; i += r.consumed; ok = true; break; }
    }
    if (!ok) return null;
  }
  return node;
}

function iosComplete(topo, sess, line) {
  const dev = topo.devices[sess.devId];
  if (!sess.started || sess.pending || /\s$/.test(line) || !line.trim()) return line;
  const toks = iosTokenize(line);
  const last = toks[toks.length - 1];
  const roots = [IOS_TREES[sess.mode]];
  if (IOS_CONFIG_SUBMODES.includes(sess.mode)) roots.push(IOS_TREES.config);
  for (const root of roots) {
    const pre = toks.slice(0, -1);
    const node = pre.length ? iosMatchPrefix(root, pre, dev.type, line) : root;
    if (!node) continue;
    const low = last.t.toLowerCase();
    const cands = [...node.kw.keys()].filter((k) => k.startsWith(low) && iosNodeOk(node.kw.get(k), dev.type));
    if (cands.length === 1) return line.slice(0, last.pos) + cands[0] + ' ';
    // интерфейсы: g0/0 -> GigabitEthernet0/0
    if (!cands.length && node.params.some((p) => p.type === 'if')) {
      const n = parseIfName(last.t);
      if (n) return line.slice(0, last.pos) + n;
    }
  }
  return line;
}

// ---------- Хелперы для обработчиков ----------
function iosIfaces(c) { return c.sess.ifs.map((n) => ({ name: n, ic: c.cfg.interfaces[n] })).filter((x) => x.ic); }

function iosRequireL3If(c) {
  const list = iosIfaces(c);
  if (c.dev.type === 'switch' && list.some((x) => ifKind(x.name) === 'phys')) { c.out(iosInvalidHere(c)); return null; }
  return list;
}

function iosInvalidHere(c) {
  const prompt = iosPrompt(c.topo, c.sess);
  return ' '.repeat(prompt.length) + '^\n% Invalid input detected at \'^\' marker.';
}

// Порты коммутатора для switchport / spanning-tree: физические и Port-channel
function iosSwPorts(c) {
  const list = iosIfaces(c);
  if (list.some((x) => ifKind(x.name) !== 'phys' && ifKind(x.name) !== 'po')) { c.out(iosInvalidHere(c)); return null; }
  return list;
}

function ensureVlan(cfg, v, c) {
  if (!cfg.vlans[v]) {
    cfg.vlans[v] = { name: 'VLAN' + String(v).padStart(4, '0') };
    if (c) c.out('% Access VLAN does not exist. Creating vlan ' + v);
  }
}

function iosParseRange(cfg, text) {
  const out = [];
  const parts = text.split(',');
  let lastType = null;
  for (let part of parts) {
    part = part.replace(/\s+/g, '');
    if (!part) continue;
    const m = part.match(/^([a-z-]*)([\d/]*?)(\d+)(?:-(\d+))?$/i);
    if (!m) return null;
    let [, type, slot, a, b] = m;
    let base;
    if (type) {
      base = parseIfName(type + slot + a);
      if (!base) return null;
      lastType = base.slice(0, base.length - a.length);
    } else if (lastType) base = lastType + a;
    else return null;
    const prefix = base.slice(0, base.length - a.length);
    const from = Number(a), to = b ? Number(b) : from;
    for (let i = from; i <= to; i++) {
      const n = prefix + i;
      if (!cfg.interfaces[n]) return null;
      out.push(n);
    }
  }
  return out.length ? out : null;
}

function type7(pw) {
  const xlat = 'dsfd;kfoA,.iyewrkldJKDHSUBsgvca69834ncxv9873254k;fg87';
  const seed = 8;
  let s = String(seed).padStart(2, '0');
  for (let i = 0; i < pw.length; i++) s += ((pw.charCodeAt(i) ^ xlat.charCodeAt((seed + i) % xlat.length)) & 0xff).toString(16).toUpperCase().padStart(2, '0');
  return s;
}

function fakeMd5(pw) {
  const chars = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let h = 2166136261;
  for (let i = 0; i < pw.length; i++) { h ^= pw.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  const rng = makeRng(h);
  let salt = '', hash = '';
  for (let i = 0; i < 4; i++) salt += chars[rng.int(0, 63)];
  for (let i = 0; i < 22; i++) hash += chars[rng.int(0, 63)];
  return '$1$' + salt + '$' + hash;
}

function iosResetDevice(topo, dev) {
  const cat = DEVICE_CATALOG[dev.model];
  if (dev.startup) dev.cfg = deepClone(dev.startup);
  else dev.cfg = dev.type === 'router' ? defaultRouterCfg(cat.ports) : defaultSwitchCfg(cat.ports);
  if (dev.cfg.dhcpBindings) dev.cfg.dhcpBindings = {};
  const rt = netRt(topo);
  rt.arp[dev.id] = {};
  rt.mac[dev.id] = {};
}

// ================= Команды =================
const EXEC = ['user', 'priv'];
const CONF_ALL = ['config', ...IOS_CONFIG_SUBMODES];
const IFM = ['if', 'subif', 'range'];

// --- EXEC ---
iosDef(EXEC, 'enable', (c) => {
  if (c.sess.mode === 'priv') return;
  if (c.cfg.enableSecret || c.cfg.enablePassword) { c.sess.pending = { kind: 'enable', tries: 0, prompt: 'Password: ', hidden: true }; return; }
  c.sess.mode = 'priv';
}, { ro: true });
iosDef(['priv'], 'disable', (c) => { c.sess.mode = 'user'; }, { ro: true });
const iosLogout = (c) => {
  c.sess.started = false; c.sess.mode = 'user';
  c.out('\n\n' + c.cfg.hostname + ' con0 is now available\n\n\n\n\n\nPress RETURN to get started.\n');
};
iosDef(EXEC, 'exit', iosLogout, { ro: true });
iosDef(EXEC, 'logout', iosLogout, { ro: true });
iosDef(['priv'], 'configure terminal', (c) => {
  c.out('Enter configuration commands, one per line.  End with CNTL/Z.');
  c.sess.mode = 'config';
}, { ro: true });
iosDef(['priv'], 'terminal length <num>', () => {}, { ro: true });
iosDef(['priv'], 'terminal no monitor', () => {}, { ro: true });

const iosSave = (c) => {
  c.sess.pending = {
    kind: 'confirm', prompt: 'Destination filename [startup-config]? ', ro: true,
    then: () => { c.dev.startup = deepClone(c.cfg); return 'Building configuration...\n[OK]\n'; },
  };
};
iosDef(['priv'], 'copy running-config startup-config', iosSave, { ro: true });
iosDef(['priv'], 'write memory', (c) => { c.dev.startup = deepClone(c.cfg); c.out('Building configuration...\n[OK]'); }, { ro: true });
iosDef(['priv'], 'write', (c) => { c.dev.startup = deepClone(c.cfg); c.out('Building configuration...\n[OK]'); }, { ro: true });
iosDef(['priv'], 'copy startup-config running-config', (c) => {
  if (!c.dev.startup) { c.out('%Error opening nvram:/startup-config (No such file or directory)'); return; }
  c.sess.pending = { kind: 'confirm', prompt: 'Destination filename [running-config]? ', then: () => {
    c.dev.cfg = deepClone(c.dev.startup);
    return c.cfg.hostname + ' bytes copied\n';
  } };
});
iosDef(['priv'], 'erase startup-config', (c) => {
  c.sess.pending = { kind: 'confirm', prompt: 'Erasing the nvram filesystem will remove all configuration files! Continue? [confirm]', ro: true,
    then: () => { c.dev.startup = null; return '[OK]\nErase of nvram: complete\n'; } };
}, { ro: true });
iosDef(['priv'], 'reload', (c) => {
  c.sess.pending = { kind: 'confirm', prompt: 'Proceed with reload? [confirm]', then: () => {
    iosResetDevice(c.topo, c.dev);
    c.sess.started = false; c.sess.mode = 'user';
    return '\n' + iosBootText(c.dev);
  } };
}, { ro: true });
iosDef(['priv'], 'clear arp-cache', (c) => { netRt(c.topo).arp[c.dev.id] = {}; }, { ro: true });
iosDef(['priv'], 'clear mac address-table dynamic', (c) => { netRt(c.topo).mac[c.dev.id] = {}; }, { ro: true, dev: 'switch' });
iosDef(['priv'], 'clear ip ospf process', (c) => { c.out('Reset ALL OSPF processes? [no]: yes'); }, { ro: true, dev: 'router' });
iosDef(['priv'], 'clear ip dhcp conflict *', (c) => { const m = netRt(c.topo).dhcpConflicts; if (m) delete m[c.dev.id]; }, { ro: true, dev: 'router' });

iosDef(EXEC, 'ping <ip>', (c) => iosPing(c, c.p[0], 5), { ro: true });
iosDef(EXEC, 'ping <ip> repeat <num>', (c) => iosPing(c, c.p[0], Math.min(c.p[1], 100)), { ro: true });
iosDef(EXEC, 'ping <word>', (c) => iosByName(c, (ip) => iosPing(c, ip, 5)), { ro: true });
iosDef(EXEC, 'traceroute <ip>', (c) => iosTrace(c, c.p[0]), { ro: true });
iosDef(EXEC, 'traceroute <word>', (c) => iosByName(c, (ip) => iosTrace(c, ip)), { ro: true });

// Имя → IP: сначала таблица ip host (без учёта регистра), иначе попытка DNS, которой в NetTrainer нет
function iosHostKey(cfg, name) { return Object.keys(cfg.hosts || {}).find((n) => n.toLowerCase() === name.toLowerCase()) || null; }
function iosTranslating(cfg, name) {
  if (cfg.domainLookup === false) return 'Translating "' + name + '"\n';
  const ns = (cfg.nameServers || []).length ? cfg.nameServers : ['255.255.255.255'];
  return 'Translating "' + name + '"...domain server (' + ns.join(') (') + ')\n';
}
function iosByName(c, run) {
  const k = iosHostKey(c.cfg, c.p[0]);
  if (k) { run(c.cfg.hosts[k]); return; }
  c.slow = c.cfg.domainLookup !== false;
  c.out((c.cfg.domainLookup === false ? '' : iosTranslating(c.cfg, c.p[0])) + '% Unrecognized host or address, or protocol not running.');
}

function iosPing(c, ipStr, count) {
  const dst = ipToInt(ipStr);
  c.slow = true;
  const lines = ['Type escape sequence to abort.', 'Sending ' + count + ', 100-byte ICMP Echos to ' + ipStr + ', timeout is 2 seconds:'];
  let marks = '', ok = 0;
  const sim = netSimHook(c.topo, c.dev.id);
  for (let i = 0; i < count; i++) {
    const r = pingOnce(c.topo, c.dev.id, dst, { arp: true, events: i === 0 && sim ? sim.events : undefined, stepRef: sim ? sim.stepRef : undefined });
    if (r.status === 'reply') { marks += '!'; ok++; } else if (r.status === 'unreachable') marks += 'U'; else marks += '.';
  }
  if (sim) sim.done();
  lines.push(marks);
  const pct = Math.round((ok * 100) / count);
  lines.push('Success rate is ' + pct + ' percent (' + ok + '/' + count + ')' + (ok ? ', round-trip min/avg/max = 0/0/1 ms' : ''));
  c.out(lines.join('\n'));
}

function iosTrace(c, ipStr) {
  c.slow = true;
  const tr = traceroute(c.topo, c.dev.id, ipToInt(ipStr), 30);
  const lines = ['Type escape sequence to abort.', 'Tracing the route to ' + ipStr, ''];
  for (const h of tr.hops) {
    if (h.ip) lines.push('  ' + padR(h.hop, 3) + ' ' + padR(h.ip, 16) + '0 msec    0 msec    0 msec' + (h.unreachable ? ' !H' : ''));
    else lines.push('  ' + padR(h.hop, 3) + ' *         *         *');
  }
  c.out(lines.join('\n'));
}

// --- SHOW ---
const SHOW = (pattern, fn, opts = {}) => iosDef(EXEC, 'show ' + pattern, fn, { ro: true, ...opts });
SHOW('running-config', (c) => { if (c.sess.mode === 'user') { c.out(iosInvalidHere(c)); return; } c.out(iosRunningConfig(c.topo, c.dev, c.cfg)); });
SHOW('startup-config', (c) => {
  if (c.sess.mode === 'user') { c.out(iosInvalidHere(c)); return; }
  if (!c.dev.startup) { c.out('startup-config is not present'); return; }
  c.out(iosRunningConfig(c.topo, c.dev, c.dev.startup, true));
});
SHOW('ip interface brief', (c) => c.out(iosShowIpIntBrief(c.topo, c.dev)));
SHOW('ip route', (c) => c.out(iosShowIpRoute(c.topo, c.dev)), { dev: 'router' });
SHOW('ip protocols', (c) => c.out(iosShowIpProtocols(c.topo, c.dev)), { dev: 'router' });
SHOW('ip ospf neighbor', (c) => c.out(iosShowOspfNbr(c.topo, c.dev)), { dev: 'router' });
SHOW('ip dhcp binding', (c) => c.out(iosShowDhcpBinding(c.topo, c.dev)), { dev: 'router' });
SHOW('ip dhcp pool', (c) => c.out(iosShowDhcpPool(c.topo, c.dev)), { dev: 'router' });
SHOW('ip dhcp conflict', (c) => c.out(iosShowDhcpConflict(c.topo, c.dev)), { dev: 'router' });
SHOW('ip dhcp server statistics', (c) => c.out(iosShowDhcpStats(c.topo, c.dev)), { dev: 'router' });
SHOW('ip interface', (c) => c.out(iosIfOrder(c.dev).filter((n) => c.cfg.interfaces[n]).map((n) => iosShowIpInterface(c.topo, c.dev, n)).join('\n')));
SHOW('ip interface <if>', (c) => {
  if (!c.cfg.interfaces[c.p[0]]) { c.out(iosInvalidHere(c)); return; }
  c.out(iosShowIpInterface(c.topo, c.dev, c.p[0]));
});
SHOW('hosts', (c) => c.out(iosShowHosts(c.dev)));
SHOW('interfaces', (c) => c.out(Object.keys(c.cfg.interfaces).map((n) => iosShowInterface(c.topo, c.dev, n)).join('\n')));
SHOW('interfaces <if>', (c) => {
  if (!c.cfg.interfaces[c.p[0]]) { c.out(iosInvalidHere(c)); return; }
  c.out(iosShowInterface(c.topo, c.dev, c.p[0]));
});
SHOW('interfaces trunk', (c) => c.out(iosShowTrunk(c.topo, c.dev)), { dev: 'switch' });
SHOW('interfaces <if> switchport', (c) => c.out(iosShowSwitchport(c.topo, c.dev, c.p[0])), { dev: 'switch' });
SHOW('vlan brief', (c) => c.out(iosShowVlanBrief(c.topo, c.dev)), { dev: 'switch' });
SHOW('vlan', (c) => c.out(iosShowVlanBrief(c.topo, c.dev)), { dev: 'switch' });
SHOW('mac address-table', (c) => c.out(iosShowMac(c.topo, c.dev)), { dev: 'switch' });
SHOW('mac-address-table', (c) => c.out(iosShowMac(c.topo, c.dev)), { dev: 'switch' });
SHOW('cdp neighbors', (c) => c.out(iosShowCdp(c.topo, c.dev)));
SHOW('arp', (c) => c.out(iosShowArp(c.topo, c.dev)));
SHOW('ip arp', (c) => c.out(iosShowArp(c.topo, c.dev)));
SHOW('version', (c) => c.out(iosShowVersion(c.topo, c.dev)));
SHOW('clock', (c) => { const d = new Date(); c.out('*' + d.toTimeString().slice(0, 8) + '.000 UTC ' + d.toDateString()); });
SHOW('history', (c) => c.out(c.sess.history.map((h) => '  ' + h).join('\n')));

// --- CONFIG (глобальные) ---
iosDef(CONF_ALL, 'end', (c) => { c.sess.mode = 'priv'; c.sess.ifs = []; }, { ro: true });
iosDef(['config'], 'exit', (c) => { c.sess.mode = 'priv'; }, { ro: true });
iosDef(IOS_CONFIG_SUBMODES, 'exit', (c) => { c.sess.mode = 'config'; c.sess.ifs = []; }, { ro: true });
iosDef(CONF_ALL, 'do <line>', (c) => {
  const saved = c.sess.mode;
  c.sess.mode = 'priv';
  const r = iosRun(c.topo, c.sess, c.p[0], iosPrompt(c.topo, c.sess));
  if (c.sess.mode === 'priv' || c.sess.mode === 'user') c.sess.mode = saved;
  if (r.out) c.out(r.out.replace(/\n$/, ''));
  c.slow = r.slow;
}, { ro: true });

iosDef(['config'], 'hostname <word>', (c) => { c.cfg.hostname = c.p[0]; });
iosDef(['config'], 'no hostname', (c) => { c.cfg.hostname = c.dev.type === 'router' ? 'Router' : 'Switch'; });
iosDef(['config'], 'enable secret <word>', (c) => { c.cfg.enableSecret = c.p[0]; });
iosDef(['config'], 'enable password <word>', (c) => { c.cfg.enablePassword = c.p[0]; });
iosDef(['config'], 'no enable secret', (c) => { c.cfg.enableSecret = null; });
iosDef(['config'], 'no enable password', (c) => { c.cfg.enablePassword = null; });
iosDef(['config'], 'service password-encryption', (c) => { c.cfg.servicePasswordEncryption = true; });
iosDef(['config'], 'no service password-encryption', (c) => { c.cfg.servicePasswordEncryption = false; });
iosDef(['config'], 'no ip domain-lookup', (c) => { c.cfg.domainLookup = false; });
iosDef(['config'], 'ip domain-lookup', (c) => { c.cfg.domainLookup = true; });
iosDef(['config'], 'ip domain-name <word>', (c) => { c.cfg.domainName = c.p[0]; });
iosDef(['config'], 'ip domain name <word>', (c) => { c.cfg.domainName = c.p[0]; });
// DNS для самого устройства: сервер имён и статическая таблица имён (ip host)
iosDef(['config'], 'ip name-server <ip>', (c) => { const l = (c.cfg.nameServers = c.cfg.nameServers || []); if (!l.includes(c.p[0]) && l.length < 6) l.push(c.p[0]); });
iosDef(['config'], 'no ip name-server', (c) => { c.cfg.nameServers = []; });
iosDef(['config'], 'no ip name-server <ip>', (c) => { c.cfg.nameServers = (c.cfg.nameServers || []).filter((x) => x !== c.p[0]); });
iosDef(['config'], 'ip host <word> <ip>', (c) => { const hs = (c.cfg.hosts = c.cfg.hosts || {}); const k = iosHostKey(c.cfg, c.p[0]); if (k) delete hs[k]; hs[c.p[0]] = c.p[1]; });
iosDef(['config'], 'no ip host <word>', (c) => { const k = iosHostKey(c.cfg, c.p[0]); if (k) delete c.cfg.hosts[k]; });
iosDef(['config'], 'username <word> secret <word>', (c) => { c.cfg.users[c.p[0]] = { secret: c.p[1] }; });
iosDef(['config'], 'username <word> password <word>', (c) => { c.cfg.users[c.p[0]] = { password: c.p[1] }; });
iosDef(['config'], 'username <word> privilege <num> secret <word>', (c) => { c.cfg.users[c.p[0]] = { secret: c.p[2], privilege: c.p[1] }; });
iosDef(['config'], 'no username <word>', (c) => { delete c.cfg.users[c.p[0]]; });
iosDef(['config'], 'ip ssh version <num>', (c) => { c.cfg.sshVersion = c.p[0]; });
iosDef(['config'], 'crypto key generate rsa', (c) => {
  if (!c.cfg.domainName || ['Router', 'Switch'].includes(c.cfg.hostname)) { c.out('% Please define a domain-name first.'); return; }
  c.out('The name for the keys will be: ' + c.cfg.hostname + '.' + c.cfg.domainName + '\nChoose the size of the key modulus in the range of 360 to 4096 for your\n  General Purpose Keys. Choosing a key modulus greater than 512 may take\n  a few minutes.\n');
  c.sess.pending = { kind: 'confirm', prompt: 'How many bits in the modulus [512]: ', then: (l) => {
    const bits = Number(l.trim()) || 512;
    c.cfg.rsaBits = bits;
    return '% Generating ' + bits + ' bit RSA keys, keys will be non-exportable...[OK]\n';
  } };
});
iosDef(['config'], 'crypto key generate rsa general-keys modulus <num>', (c) => {
  if (!c.cfg.domainName) { c.out('% Please define a domain-name first.'); return; }
  c.cfg.rsaBits = c.p[0];
  c.out('% Generating ' + c.p[0] + ' bit RSA keys, keys will be non-exportable...[OK]');
});
iosDef(['config'], 'spanning-tree mode pvst', (c) => { c.cfg.stpMode = 'pvst'; }, { dev: 'switch' });
iosDef(['config'], 'spanning-tree mode rapid-pvst', (c) => { c.cfg.stpMode = 'rapid-pvst'; }, { dev: 'switch' });
iosDef(['config'], 'spanning-tree mode mst', (c) => { c.out('% NetTrainer: MST is not simulated — use pvst or rapid-pvst.'); }, { dev: 'switch' });
iosDef(['config'], 'cdp run', (c) => { c.cfg.cdp = true; });
iosDef(['config'], 'no cdp run', (c) => { c.cfg.cdp = false; });

iosDef(['config'], 'banner motd <line>', (c) => {
  const s = c.p[0];
  const delim = s[0];
  const rest = s.slice(1);
  const idx = rest.indexOf(delim);
  if (idx >= 0) { c.cfg.banner = rest.slice(0, idx); return; }
  c.out('Enter TEXT message.  End with the character \'' + delim + '\'.');
  c.sess.pending = { kind: 'banner', delim, lines: rest ? [rest] : [], prompt: '' };
});
iosDef(['config'], 'no banner motd', (c) => { c.cfg.banner = null; });

iosDef(['config'], 'interface <if>', (c) => {
  const name = c.p[0];
  const k = ifKind(name);
  const ics = c.cfg.interfaces;
  if (c.dev.type === 'router') {
    if (k === 'svi') { c.out(iosInvalidHere(c)); return; }
    if (k === 'sub') {
      if (!ics[parentPort(name)]) { c.out(iosInvalidHere(c)); return; }
      if (!ics[name]) ics[name] = { ip: null, mask: null, shutdown: false, description: '', helpers: [], encap: null };
      c.sess.mode = 'subif';
    } else if (k === 'loop') {
      if (!ics[name]) ics[name] = { ip: null, mask: null, shutdown: false, description: '', helpers: [] };
      c.sess.mode = 'if';
    } else {
      if (!ics[name]) { c.out(iosInvalidHere(c)); return; }
      c.sess.mode = 'if';
    }
  } else {
    if (k === 'sub' || k === 'loop') { c.out(iosInvalidHere(c)); return; }
    if (k === 'po') {
      const g = poGroup(name);
      if (g < 1 || g > 64) { c.out(iosInvalidHere(c)); return; }
      if (!ics[name]) ics[name] = ecNewPo(c.dev, null);
    } else if (k === 'svi') {
      const v = Number(name.slice(4));
      if (v < 1 || v > 4094) { c.out(iosInvalidHere(c)); return; }
      if (!ics[name]) ics[name] = { ip: null, mask: null, shutdown: true, description: '' };
    } else if (!ics[name]) { c.out(iosInvalidHere(c)); return; }
    c.sess.mode = 'if';
  }
  c.sess.ifs = [name];
});
iosDef(['config'], 'interface range <line>', (c) => {
  const list = iosParseRange(c.cfg, c.p[0]);
  if (!list) { c.out(iosInvalidHere(c)); return; }
  c.sess.ifs = list;
  c.sess.mode = 'range';
});
iosDef(['config'], 'no interface <if>', (c) => {
  const n = c.p[0];
  const k = ifKind(n);
  if (!c.cfg.interfaces[n] || k === 'phys' || n === 'Vlan1') { c.out(iosInvalidHere(c)); return; }
  if (k === 'po') for (const m of ecMembers(c.dev, poGroup(n))) delete c.cfg.interfaces[m].channel; // как в IOS: порты выходят из пучка
  delete c.cfg.interfaces[n];
});

// Статические маршруты
function iosAddStatic(c, net, mask, nh, exitIf, ad) {
  if (!isMask(mask)) { c.out('%Inconsistent address and mask'); return; }
  const len = maskToLen(mask);
  if (netOf(ipToInt(net), len) !== ipToInt(net)) { c.out('%Inconsistent address and mask'); return; }
  if (exitIf && !c.cfg.interfaces[exitIf]) { c.out(iosInvalidHere(c)); return; }
  const list = c.cfg.staticRoutes;
  const same = (s) => s.net === net && s.mask === mask && (s.nextHop || null) === (nh || null) && (s.exitIf || null) === (exitIf || null);
  const ex = list.find(same);
  if (ex) { ex.ad = ad || null; return; }
  list.push({ net, mask, nextHop: nh || null, exitIf: exitIf || null, ad: ad || null });
}
iosDef(['config'], 'ip route <ip> <mask> <ip>', (c) => iosAddStatic(c, c.p[0], c.p[1], c.p[2], null), { dev: 'router' });
iosDef(['config'], 'ip route <ip> <mask> <ip> <num>', (c) => iosAddStatic(c, c.p[0], c.p[1], c.p[2], null, c.p[3]), { dev: 'router' });
iosDef(['config'], 'ip route <ip> <mask> <if>', (c) => iosAddStatic(c, c.p[0], c.p[1], null, c.p[2]), { dev: 'router' });
iosDef(['config'], 'ip route <ip> <mask> <if> <num>', (c) => iosAddStatic(c, c.p[0], c.p[1], null, c.p[2], c.p[3]), { dev: 'router' });
iosDef(['config'], 'ip route <ip> <mask> <if> <ip>', (c) => iosAddStatic(c, c.p[0], c.p[1], c.p[3], c.p[2]), { dev: 'router' });
const iosNoStatic = (c) => {
  const [net, mask, x] = c.p;
  c.cfg.staticRoutes = c.cfg.staticRoutes.filter((s) => !(s.net === net && s.mask === mask && (x === undefined || s.nextHop === x || s.exitIf === x)));
};
iosDef(['config'], 'no ip route <ip> <mask>', iosNoStatic, { dev: 'router' });
iosDef(['config'], 'no ip route <ip> <mask> <ip>', iosNoStatic, { dev: 'router' });
iosDef(['config'], 'no ip route <ip> <mask> <if>', iosNoStatic, { dev: 'router' });
iosDef(['config'], 'ip default-gateway <ip>', (c) => { c.cfg.defaultGateway = c.p[0]; }, { dev: 'switch' });
iosDef(['config'], 'no ip default-gateway', (c) => { c.cfg.defaultGateway = null; }, { dev: 'switch' });
iosDef(['config'], 'ip routing', (c) => { c.out('% IP routing is not supported on this switch model.'); }, { dev: 'switch' });

// Маршрутизация
iosDef(['config'], 'router rip', (c) => {
  if (!c.cfg.rip) c.cfg.rip = { version: null, networks: [], autoSummary: true, passive: [], defaultOriginate: false };
  c.sess.mode = 'router-rip';
}, { dev: 'router' });
iosDef(['config'], 'no router rip', (c) => { c.cfg.rip = null; }, { dev: 'router' });
iosDef(['config'], 'router ospf <num>', (c) => {
  if (c.p[0] < 1 || c.p[0] > 65535) { c.out(iosInvalidHere(c)); return; }
  if (c.cfg.ospf && c.cfg.ospf.pid !== c.p[0]) { c.out('% OSPF: only one process is supported in this emulator (process ' + c.cfg.ospf.pid + ').'); return; }
  if (!c.cfg.ospf) c.cfg.ospf = { pid: c.p[0], routerId: null, networks: [], passive: [], defaultOriginate: false, defaultAlways: false, refBw: 100 };
  c.sess.mode = 'router-ospf';
}, { dev: 'router' });
iosDef(['config'], 'no router ospf <num>', (c) => { if (c.cfg.ospf && c.cfg.ospf.pid === c.p[0]) c.cfg.ospf = null; }, { dev: 'router' });

// DHCP
iosDef(['config'], 'ip dhcp pool <word>', (c) => {
  if (!c.cfg.dhcpPools[c.p[0]]) c.cfg.dhcpPools[c.p[0]] = { network: null, mask: null, defaultRouter: null, dns: null, domainName: null };
  c.sess.pool = c.p[0];
  c.sess.mode = 'dhcp';
}, { dev: 'router' });
iosDef(['config'], 'no ip dhcp pool <word>', (c) => { delete c.cfg.dhcpPools[c.p[0]]; }, { dev: 'router' });
iosDef(['config'], 'ip dhcp excluded-address <ip>', (c) => { c.cfg.dhcpExcluded.push({ start: c.p[0], end: c.p[0] }); }, { dev: 'router' });
iosDef(['config'], 'ip dhcp excluded-address <ip> <ip>', (c) => {
  if (ipToInt(c.p[1]) < ipToInt(c.p[0])) { c.out('% Invalid address range'); return; }
  c.cfg.dhcpExcluded.push({ start: c.p[0], end: c.p[1] });
}, { dev: 'router' });
iosDef(['config'], 'no ip dhcp excluded-address <ip>', (c) => { c.cfg.dhcpExcluded = c.cfg.dhcpExcluded.filter((e) => e.start !== c.p[0]); }, { dev: 'router' });
iosDef(['config'], 'no ip dhcp excluded-address <ip> <ip>', (c) => { c.cfg.dhcpExcluded = c.cfg.dhcpExcluded.filter((e) => !(e.start === c.p[0] && e.end === c.p[1])); }, { dev: 'router' });

// Линии
iosDef(['config'], 'line console <num>', (c) => { if (c.p[0] !== 0) { c.out(iosInvalidHere(c)); return; } c.sess.lineName = 'con'; c.sess.mode = 'line'; });
iosDef(['config'], 'line vty <num> <num>', (c) => { c.sess.lineName = 'vty'; c.sess.mode = 'line'; });
iosDef(['config'], 'line aux <num>', (c) => { c.sess.lineName = 'aux'; c.sess.mode = 'line'; }, { dev: 'router' });

// VLAN
iosDef(['config'], 'vlan <num>', (c) => {
  const v = c.p[0];
  if (v < 1 || v > 4094) { c.out(iosInvalidHere(c)); return; }
  if (v >= 1002 && v <= 1005) { c.out('Default VLAN ' + v + ' may not have its name changed.'); }
  if (!c.cfg.vlans[v]) c.cfg.vlans[v] = { name: 'VLAN' + String(v).padStart(4, '0') };
  c.sess.vlanId = v;
  c.sess.mode = 'vlan';
}, { dev: 'switch' });
iosDef(['config'], 'no vlan <num>', (c) => {
  if (c.p[0] === 1 || (c.p[0] >= 1002 && c.p[0] <= 1005)) { c.out('Default VLAN ' + c.p[0] + ' may not be deleted.'); return; }
  delete c.cfg.vlans[c.p[0]];
}, { dev: 'switch' });
iosDef(['vlan'], 'name <word>', (c) => { c.cfg.vlans[c.sess.vlanId].name = c.p[0]; }, { dev: 'switch' });
iosDef(['vlan'], 'no name', (c) => { c.cfg.vlans[c.sess.vlanId].name = 'VLAN' + String(c.sess.vlanId).padStart(4, '0'); }, { dev: 'switch' });

// --- INTERFACE ---
iosDef(IFM, 'ip address <ip> <mask>', (c) => {
  const list = iosRequireL3If(c);
  if (!list) return;
  const [ip, mask] = c.p;
  if (!isMask(mask)) { c.out('% Inconsistent address and mask'); return; }
  const len = maskToLen(mask);
  const n = ipToInt(ip);
  if (len < 31 && (n === netOf(n, len) || n === broadcastOf(n, len))) { c.out('% Bad mask /' + len + ' for address ' + ip); return; }
  for (const { name, ic } of list) {
    if (ifKind(name) === 'sub' && !ic.encap) {
      c.out('% Configuring IP routing on a LAN subinterface is only allowed if that\nsubinterface is already configured as part of an IEEE 802.10, IEEE 802.1Q,\nor ISL vLAN.\n');
      return;
    }
    // перекрытие с другими интерфейсами
    for (const [other, oc] of Object.entries(c.cfg.interfaces)) {
      if (other === name || !oc.ip || !oc.mask) continue;
      const ol = maskToLen(oc.mask);
      const ml = Math.min(ol, len);
      if (inSubnet(ipToInt(oc.ip), n, ml)) { c.out('% ' + intToIp(netOf(n, len)) + ' overlaps with ' + other); return; }
    }
    ic.ip = ip; ic.mask = mask;
  }
});
iosDef(IFM, 'no ip address', (c) => { const l = iosRequireL3If(c); if (l) for (const { ic } of l) { ic.ip = null; ic.mask = null; } });
// DHCP-клиент на интерфейсе роутера (ip address dhcp) пока не моделируется — говорим об этом прямо
iosDef(IFM, 'ip address dhcp', (c) => { c.out('% NetTrainer: the DHCP client on router interfaces is not simulated yet.\n% Use a static address here: ip address <ip> <mask>'); }, { dev: 'router' });
// shutdown / no shutdown ещё и возвращают порт из err-disabled (на Port-channel — все его порты)
function iosClearErrdis(c) {
  for (const { name, ic } of iosIfaces(c)) {
    delete ic.errdis;
    if (ifKind(name) === 'po') for (const m of ecMembers(c.dev, poGroup(name))) delete c.cfg.interfaces[m].errdis;
  }
}
iosDef(IFM, 'shutdown', (c) => { iosClearErrdis(c); for (const { ic } of iosIfaces(c)) ic.shutdown = true; });
iosDef(IFM, 'no shutdown', (c) => { iosClearErrdis(c); for (const { ic } of iosIfaces(c)) ic.shutdown = false; });
iosDef(IFM, 'description <line>', (c) => { for (const { ic } of iosIfaces(c)) ic.description = c.p[0]; });
iosDef(IFM, 'no description', (c) => { for (const { ic } of iosIfaces(c)) ic.description = ''; });
iosDef(IFM, 'duplex <word>', () => {});
iosDef(IFM, 'speed <word>', () => {});
iosDef(IFM, 'clock rate <num>', () => {}, { dev: 'router' });
iosDef(IFM, 'ip helper-address <ip>', (c) => {
  for (const { name, ic } of iosIfaces(c)) {
    if (ifKind(name) === 'loop') continue;
    ic.helpers = ic.helpers || [];
    if (!ic.helpers.includes(c.p[0])) ic.helpers.push(c.p[0]);
  }
}, { dev: 'router' });
iosDef(IFM, 'no ip helper-address <ip>', (c) => { for (const { ic } of iosIfaces(c)) ic.helpers = (ic.helpers || []).filter((h) => h !== c.p[0]); }, { dev: 'router' });
iosDef(IFM, 'no ip helper-address', (c) => { for (const { ic } of iosIfaces(c)) ic.helpers = []; }, { dev: 'router' });
iosDef(IFM, 'ip ospf cost <num>', (c) => { for (const { ic } of iosIfaces(c)) ic.ospfCost = c.p[0]; }, { dev: 'router' });
iosDef(IFM, 'no ip ospf cost', (c) => { for (const { ic } of iosIfaces(c)) delete ic.ospfCost; }, { dev: 'router' });
iosDef(IFM, 'ip ospf <num> area <area>', (c) => {
  if (!c.cfg.ospf) c.cfg.ospf = { pid: c.p[0], routerId: null, networks: [], passive: [], defaultOriginate: false, defaultAlways: false, refBw: 100 };
  for (const { ic } of iosIfaces(c)) ic.ospfArea = c.p[1];
}, { dev: 'router' });
iosDef(['subif'], 'encapsulation dot1Q <num>', (c) => {
  for (const { ic } of iosIfaces(c)) ic.encap = { vlan: c.p[0], native: false };
}, { dev: 'router' });
iosDef(['subif'], 'encapsulation dot1Q <num> native', (c) => {
  for (const { ic } of iosIfaces(c)) ic.encap = { vlan: c.p[0], native: true };
}, { dev: 'router' });

// switchport
const SWP = (pattern, fn) => iosDef(['if', 'range'], pattern, (c) => { const l = iosSwPorts(c); if (l) { fn(c, l); ecSyncMembers(c.dev, l); } }, { dev: 'switch' });
SWP('switchport mode access', (c, l) => l.forEach(({ ic }) => { ic.mode = 'access'; }));
SWP('switchport mode trunk', (c, l) => l.forEach(({ ic }) => { ic.mode = 'trunk'; }));
SWP('switchport mode dynamic auto', (c, l) => l.forEach(({ ic }) => { ic.mode = 'dynamic auto'; }));
SWP('switchport mode dynamic desirable', (c, l) => l.forEach(({ ic }) => { ic.mode = 'dynamic desirable'; }));
SWP('no switchport mode', (c, l) => l.forEach(({ ic }) => { ic.mode = 'dynamic auto'; }));
SWP('switchport access vlan <num>', (c, l) => {
  const v = c.p[0];
  if (v < 1 || v > 4094) { c.out(iosInvalidHere(c)); return; }
  ensureVlan(c.cfg, v, c);
  l.forEach(({ ic }) => { ic.accessVlan = v; });
});
SWP('no switchport access vlan', (c, l) => l.forEach(({ ic }) => { ic.accessVlan = 1; }));
SWP('switchport trunk native vlan <num>', (c, l) => l.forEach(({ ic }) => { ic.nativeVlan = c.p[0]; }));
SWP('no switchport trunk native vlan', (c, l) => l.forEach(({ ic }) => { ic.nativeVlan = 1; }));
SWP('switchport trunk allowed vlan <vlans>', (c, l) => l.forEach(({ ic }) => { ic.allowed = c.p[0].slice(); }));
SWP('switchport trunk allowed vlan all', (c, l) => l.forEach(({ ic }) => { ic.allowed = 'all'; }));
SWP('switchport trunk allowed vlan none', (c, l) => l.forEach(({ ic }) => { ic.allowed = []; }));
SWP('switchport trunk allowed vlan add <vlans>', (c, l) => l.forEach(({ ic }) => {
  if (ic.allowed === 'all') return;
  ic.allowed = [...new Set([...ic.allowed, ...c.p[0]])].sort((a, b) => a - b);
}));
SWP('switchport trunk allowed vlan remove <vlans>', (c, l) => l.forEach(({ ic }) => {
  const base = ic.allowed === 'all' ? Array.from({ length: 4094 }, (_, i) => i + 1) : ic.allowed;
  ic.allowed = base.filter((v) => !c.p[0].includes(v));
}));
SWP('switchport trunk allowed vlan except <vlans>', (c, l) => l.forEach(({ ic }) => {
  ic.allowed = Array.from({ length: 4094 }, (_, i) => i + 1).filter((v) => !c.p[0].includes(v));
}));
SWP('no switchport trunk allowed vlan', (c, l) => l.forEach(({ ic }) => { ic.allowed = 'all'; }));
SWP('switchport nonegotiate', (c, l) => l.forEach(({ ic }) => { ic.nonegotiate = true; }));
SWP('no switchport nonegotiate', (c, l) => l.forEach(({ ic }) => { ic.nonegotiate = false; }));
SWP('spanning-tree portfast', (c, l) => { l.forEach(({ ic }) => { ic.portfast = true; }); c.out('%Warning: portfast should only be enabled on ports connected to a single\n host. Connecting hubs, concentrators, switches, bridges, etc... to this\n interface  when portfast is enabled, can cause temporary bridging loops.\n Use with CAUTION'); });
SWP('switchport trunk encapsulation dot1q', () => {});

// --- ROUTER RIP ---
iosDef(['router-rip'], 'version <num>', (c) => {
  if (c.p[0] !== 1 && c.p[0] !== 2) { c.out(iosInvalidHere(c)); return; }
  c.cfg.rip.version = c.p[0];
}, { dev: 'router' });
iosDef(['router-rip'], 'no version', (c) => { c.cfg.rip.version = null; }, { dev: 'router' });
iosDef(['router-rip'], 'network <ip>', (c) => {
  const n = ipToInt(c.p[0]);
  const major = intToIp(netOf(n, classfulLen(n)));
  if (!c.cfg.rip.networks.includes(major)) c.cfg.rip.networks.push(major);
}, { dev: 'router' });
iosDef(['router-rip'], 'no network <ip>', (c) => {
  const n = ipToInt(c.p[0]);
  const major = intToIp(netOf(n, classfulLen(n)));
  c.cfg.rip.networks = c.cfg.rip.networks.filter((x) => x !== major);
}, { dev: 'router' });
iosDef(['router-rip'], 'no auto-summary', (c) => { c.cfg.rip.autoSummary = false; }, { dev: 'router' });
iosDef(['router-rip'], 'auto-summary', (c) => { c.cfg.rip.autoSummary = true; }, { dev: 'router' });

const iosPassive = (key) => (c) => {
  const p = c.cfg[key];
  if (!c.cfg.interfaces[c.p[0]]) { c.out(iosInvalidHere(c)); return; }
  if (!p.passive.includes(c.p[0])) p.passive.push(c.p[0]);
};
const iosNoPassive = (key) => (c) => { const p = c.cfg[key]; p.passive = p.passive.filter((x) => x !== c.p[0]); };
iosDef(['router-rip'], 'passive-interface <if>', iosPassive('rip'), { dev: 'router' });
iosDef(['router-rip'], 'no passive-interface <if>', iosNoPassive('rip'), { dev: 'router' });
iosDef(['router-rip'], 'default-information originate', (c) => { c.cfg.rip.defaultOriginate = true; }, { dev: 'router' });
iosDef(['router-rip'], 'no default-information originate', (c) => { c.cfg.rip.defaultOriginate = false; }, { dev: 'router' });

// --- ROUTER OSPF ---
iosDef(['router-ospf'], 'network <ip> <wild> area <area>', (c) => {
  const [ip, wild, area] = c.p;
  const o = c.cfg.ospf;
  const ex = o.networks.find((n) => n.ip === ip && n.wildcard === wild);
  if (ex) { ex.area = area; return; }
  o.networks.push({ ip, wildcard: wild, area });
}, { dev: 'router' });
iosDef(['router-ospf'], 'no network <ip> <wild> area <area>', (c) => {
  const [ip, wild] = c.p;
  c.cfg.ospf.networks = c.cfg.ospf.networks.filter((n) => !(n.ip === ip && n.wildcard === wild));
}, { dev: 'router' });
iosDef(['router-ospf'], 'router-id <ip>', (c) => {
  c.cfg.ospf.routerId = c.p[0];
  c.out('Reload or use "clear ip ospf process" command, for this to take effect');
}, { dev: 'router' });
iosDef(['router-ospf'], 'no router-id', (c) => { c.cfg.ospf.routerId = null; }, { dev: 'router' });
iosDef(['router-ospf'], 'passive-interface <if>', iosPassive('ospf'), { dev: 'router' });
iosDef(['router-ospf'], 'no passive-interface <if>', iosNoPassive('ospf'), { dev: 'router' });
iosDef(['router-ospf'], 'default-information originate', (c) => { c.cfg.ospf.defaultOriginate = true; c.cfg.ospf.defaultAlways = false; }, { dev: 'router' });
iosDef(['router-ospf'], 'default-information originate always', (c) => { c.cfg.ospf.defaultOriginate = true; c.cfg.ospf.defaultAlways = true; }, { dev: 'router' });
iosDef(['router-ospf'], 'no default-information originate', (c) => { c.cfg.ospf.defaultOriginate = false; }, { dev: 'router' });
iosDef(['router-ospf'], 'auto-cost reference-bandwidth <num>', (c) => { c.cfg.ospf.refBw = c.p[0]; }, { dev: 'router' });
iosDef(['router-ospf'], 'log-adjacency-changes', () => {}, { dev: 'router' });

// --- DHCP POOL ---
const POOL = (c) => c.cfg.dhcpPools[c.sess.pool];
iosDef(['dhcp'], 'network <ip> <mask>', (c) => {
  if (!isMask(c.p[1])) { c.out('% Invalid mask'); return; }
  Object.assign(POOL(c), { network: intToIp(netOf(ipToInt(c.p[0]), maskToLen(c.p[1]))), mask: c.p[1] });
}, { dev: 'router' });
iosDef(['dhcp'], 'network <ip> <pfx>', (c) => {
  Object.assign(POOL(c), { network: intToIp(netOf(ipToInt(c.p[0]), c.p[1])), mask: lenToMask(c.p[1]) });
}, { dev: 'router' });
iosDef(['dhcp'], 'default-router <ip>', (c) => { POOL(c).defaultRouter = c.p[0]; }, { dev: 'router' });
iosDef(['dhcp'], 'no default-router', (c) => { POOL(c).defaultRouter = null; }, { dev: 'router' });
iosDef(['dhcp'], 'dns-server <ip>', (c) => { POOL(c).dns = c.p[0]; }, { dev: 'router' });
iosDef(['dhcp'], 'no dns-server', (c) => { POOL(c).dns = null; }, { dev: 'router' });
iosDef(['dhcp'], 'domain-name <word>', (c) => { POOL(c).domainName = c.p[0]; }, { dev: 'router' });
iosDef(['dhcp'], 'lease <num>', () => {}, { dev: 'router' });

// --- LINE ---
const LINE = (c) => c.cfg.lines[c.sess.lineName] || (c.cfg.lines[c.sess.lineName] = { password: null, login: false, loginLocal: false });
iosDef(['line'], 'password <word>', (c) => { LINE(c).password = c.p[0]; });
iosDef(['line'], 'no password', (c) => { LINE(c).password = null; });
iosDef(['line'], 'login', (c) => { LINE(c).login = true; LINE(c).loginLocal = false; });
iosDef(['line'], 'login local', (c) => { LINE(c).login = true; LINE(c).loginLocal = true; });
iosDef(['line'], 'no login', (c) => { LINE(c).login = false; LINE(c).loginLocal = false; });
iosDef(['line'], 'transport input <line>', (c) => { LINE(c).transport = c.p[0].trim(); });
iosDef(['line'], 'exec-timeout <num>', () => {});
iosDef(['line'], 'exec-timeout <num> <num>', () => {});
iosDef(['line'], 'logging synchronous', (c) => { LINE(c).loggingSync = true; });

// ================= SHOW-выводы =================
function iosIfOrder(dev) {
  const phys = dev.ports.map((p) => p.name);
  const others = Object.keys(dev.cfg.interfaces).filter((n) => !phys.includes(n));
  const rank = (n) => (ifKind(n) === 'sub' ? 0 : ifKind(n) === 'loop' ? 1 : 2);
  others.sort((a, b) => {
    if (ifKind(a) === 'sub' && ifKind(b) === 'sub') return a.localeCompare(b, undefined, { numeric: true });
    return rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true });
  });
  const out = [];
  for (const p of phys) {
    out.push(p);
    for (const s of others.filter((x) => ifKind(x) === 'sub' && parentPort(x) === p)) out.push(s);
  }
  return out.concat(others.filter((x) => ifKind(x) !== 'sub'));
}

function iosShowIpIntBrief(topo, dev) {
  const lines = ['Interface              IP-Address      OK? Method Status                Protocol '];
  for (const n of iosIfOrder(dev)) {
    const ic = dev.cfg.interfaces[n];
    if (!ic) continue;
    const s = ifStatus(topo, dev, n);
    const ip = ic.ip || 'unassigned';
    const method = ic.ip ? 'manual' : 'unset ';
    lines.push(padR(n, 23) + padR(ip, 16) + 'YES ' + padR(method, 7) + padR(s.status, 22) + s.protocol + ' ');
  }
  return lines.join('\n');
}

function iosRouteLine(r, withLen) {
  const tgt = intToIp(r.net) + (withLen ? '/' + r.len : '');
  if (r.code === 'C' || r.code === 'L') return tgt + ' is directly connected, ' + r.exitIf;
  if ((r.code === 'S' || r.code === 'S*') && r.nextHop === null) return tgt + ' is directly connected, ' + r.exitIf;
  const nh = intToIp(r.nextHop);
  if (r.code === 'S' || r.code === 'S*') return tgt + ' [' + r.ad + '/0] via ' + nh + (r.exitIf ? ', ' + r.exitIf : '');
  return tgt + ' [' + r.ad + '/' + r.metric + '] via ' + nh + ', 00:00:' + String(10 + (r.net % 40)).padStart(2, '0') + ', ' + r.exitIf;
}

function iosShowIpRoute(topo, dev) {
  const routes = routesOf(topo, dev).slice().sort((a, b) => a.net - b.net || a.len - b.len || (a.code === 'L') - (b.code === 'L'));
  const lines = [
    'Codes: L - local, C - connected, S - static, R - RIP, M - mobile, B - BGP',
    '       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area',
    '       N1 - OSPF NSSA external type 1, N2 - OSPF NSSA external type 2',
    '       E1 - OSPF external type 1, E2 - OSPF external type 2, E - EGP',
    '       i - IS-IS, L1 - IS-IS level-1, L2 - IS-IS level-2, ia - IS-IS inter area',
    '       * - candidate default, U - per-user static route, o - ODR',
    '       P - periodic downloaded static route',
    '',
  ];
  const def = routes.find((r) => r.len === 0);
  if (def) lines.push('Gateway of last resort is ' + (def.nextHop !== null ? intToIp(def.nextHop) : '0.0.0.0') + ' to network 0.0.0.0');
  else lines.push('Gateway of last resort is not set');
  lines.push('');
  const groups = new Map();
  for (const r of routes) {
    const major = r.len === 0 ? 'default' : netOf(r.net, classfulLen(r.net)) + '/' + classfulLen(r.net);
    if (!groups.has(major)) groups.set(major, []);
    groups.get(major).push(r);
  }
  for (const [key, list] of groups) {
    const code = (r) => padR(r.code, r.code.length > 4 ? r.code.length + 1 : 5);
    if (key === 'default') { for (const r of list) lines.push(code(r) + iosRouteLine(r, true)); continue; }
    const [majNet, majLen] = key.split('/').map(Number);
    if (list.length === 1 && list[0].len === majLen) { lines.push(code(list[0]) + iosRouteLine(list[0], true)); continue; }
    const masks = new Set(list.map((r) => r.len));
    const nonMajor = list.filter((r) => r.len !== majLen);
    const majorRoutes = list.filter((r) => r.len === majLen);
    for (const r of majorRoutes) lines.push(code(r) + iosRouteLine(r, true));
    if (!nonMajor.length) continue;
    const m2 = new Set(nonMajor.map((r) => r.len));
    if (m2.size === 1) {
      lines.push('     ' + intToIp(majNet) + '/' + [...m2][0] + ' is subnetted, ' + nonMajor.length + ' subnets');
      for (const r of nonMajor) lines.push(padR(r.code, 8) + iosRouteLine(r, false));
    } else {
      lines.push('     ' + intToIp(majNet) + '/' + majLen + ' is variably subnetted, ' + nonMajor.length + ' subnets, ' + m2.size + ' masks');
      for (const r of nonMajor) lines.push(padR(r.code, 8) + iosRouteLine(r, true));
    }
    void masks;
  }
  return lines.join('\n');
}

function iosShowIpProtocols(topo, dev) {
  const out = [];
  const rip = dev.cfg.rip, ospf = dev.cfg.ospf;
  if (ospf) {
    const rid = ospfRouterId(topo, dev) || '0.0.0.0';
    const areas = new Set(ospf.networks.map((n) => n.area));
    out.push('Routing Protocol is "ospf ' + ospf.pid + '"', 'Outgoing update filter list for all interfaces is not set ', 'Incoming update filter list for all interfaces is not set ',
      'Router ID ' + rid, 'Number of areas in this router is ' + areas.size + '. ' + areas.size + ' normal 0 stub 0 nssa', 'Maximum path: 4', 'Routing for Networks:');
    for (const n of ospf.networks) out.push('  ' + n.ip + ' ' + n.wildcard + ' area ' + n.area);
    if (ospf.passive.length) { out.push('Passive Interface(s): '); for (const p of ospf.passive) out.push('  ' + p); }
    out.push('Routing Information Sources:  ', '  Gateway         Distance      Last Update ');
    for (const a of allRoutes(topo).ospfAdj.filter((x) => x.dev === dev.id)) out.push('  ' + padR(a.nbrRid, 16) + padR('110', 14) + '00:00:12');
    out.push('Distance: (default is 110)', '');
  }
  if (rip) {
    const v = rip.version;
    out.push('Routing Protocol is "rip"', 'Sending updates every 30 seconds, next due in 12 seconds', 'Invalid after 180 seconds, hold down 180, flushed after 240',
      'Outgoing update filter list for all interfaces is not set', 'Incoming update filter list for all interfaces is not set', 'Redistributing: rip',
      'Default version control: send version ' + (v || 1) + ', receive ' + (v ? v : 'any version'), '  Interface             Send  Recv  Triggered RIP  Key-chain');
    for (const i of ripEnabledIfaces(topo, dev)) out.push('  ' + padR(i.name, 22) + padR(v || 1, 6) + (v ? v : '2 1'));
    out.push('Automatic network summarization is ' + (rip.autoSummary !== false ? '' : 'not ') + 'in effect', 'Maximum path: 4', 'Routing for Networks:');
    for (const n of rip.networks) out.push('\t' + n);
    if (rip.passive.length) { out.push('Passive Interface(s):'); for (const p of rip.passive) out.push('\t' + p); }
    out.push('Routing Information Sources:', '\tGateway         Distance      Last Update');
    const srcs = new Set(routesOf(topo, dev).filter((r) => r.code.startsWith('R')).map((r) => intToIp(r.nextHop)));
    for (const s of srcs) out.push('\t' + padR(s, 16) + padR('120', 14) + '00:00:05');
    out.push('Distance: (default is 120)');
  }
  return out.join('\n');
}

function iosShowOspfNbr(topo, dev) {
  const lines = ['', 'Neighbor ID     Pri   State           Dead Time   Address         Interface'];
  const myRid = ipToInt(ospfRouterId(topo, dev) || '0.0.0.0');
  for (const a of allRoutes(topo).ospfAdj.filter((x) => x.dev === dev.id)) {
    const role = ipToInt(a.nbrRid) > myRid ? 'FULL/DR' : 'FULL/BDR';
    lines.push(padR(a.nbrRid, 16) + padR('  1', 6) + padR(role, 16) + padR('00:00:3' + (a.nbrIp % 10), 12) + padR(intToIp(a.nbrIp), 16) + a.myIf);
  }
  return lines.join('\n');
}

function iosShowDhcpBinding(topo, dev) {
  const lines = ['IP address       Client-ID/              Lease expiration        Type', '                 Hardware address'];
  for (const [mac, ip] of Object.entries(dev.cfg.dhcpBindings)) lines.push(padR(ip, 17) + padR(mac, 24) + padR('--', 24) + 'Automatic');
  return lines.join('\n');
}

function iosShowDhcpPool(topo, dev) {
  const out = [];
  for (const [name, p] of Object.entries(dev.cfg.dhcpPools)) {
    const len = p.mask ? maskToLen(p.mask) : 0;
    const total = p.network ? Math.max(0, Math.pow(2, 32 - len) - 2) : 0;
    const leased = Object.values(dev.cfg.dhcpBindings).filter((ip) => p.network && inSubnet(ipToInt(ip), ipToInt(p.network), len)).length;
    out.push('', 'Pool ' + name + ' :', ' Utilization mark (high/low)    : 100 / 0', ' Subnet size (first/next)       : 0 / 0 ',
      ' Total addresses                : ' + total, ' Leased addresses               : ' + leased, ' Excluded addresses             : ' + dev.cfg.dhcpExcluded.length, ' Pending event                  : none');
    if (p.network) {
      out.push('', ' 1 subnet is currently in the pool', ' Current index        IP address range                    Leased/Excluded/Total');
      const net = ipToInt(p.network);
      out.push(' ' + padR(intToIp(net + 1), 21) + padR(intToIp(net + 1), 17) + '- ' + padR(intToIp(broadcastOf(net, len) - 1), 17) + leased + '    / ' + dev.cfg.dhcpExcluded.length + '     / ' + total);
    }
  }
  return out.join('\n');
}

// Адреса пула, которые оказались заняты устройствами с ручным IP (их сервер пропустил)
function iosShowDhcpConflict(topo, dev) {
  const L = ['IP address        Detection method   Detection time          VRF'];
  const m = (netRt(topo).dhcpConflicts || {})[dev.id] || {};
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const stamp = (t) => { const d = new Date(t), hr = d.getHours() % 12 || 12; return mon[d.getMonth()] + ' ' + String(d.getDate()).padStart(2, '0') + ' ' + d.getFullYear() + ' ' + String(hr).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'); };
  for (const ip of Object.keys(m).sort((a, b) => ipToInt(a) - ipToInt(b))) L.push(padR(ip, 18) + padR('Ping', 19) + stamp(m[ip]));
  return L.join('\n');
}

function iosShowDhcpStats(topo, dev) {
  const s = Object.assign({ discover: 0, request: 0, release: 0, offer: 0, ack: 0 }, (netRt(topo).dhcpStats || {})[dev.id]);
  const r = (k, v) => padR(k, 21) + v;
  return [r('Memory usage', 42095), r('Address pools', Object.keys(dev.cfg.dhcpPools).length), r('Database agents', 0), r('Automatic bindings', Object.keys(dev.cfg.dhcpBindings).length),
    r('Manual bindings', 0), r('Expired bindings', 0), r('Malformed messages', 0), r('Secure arp entries', 0), '',
    r('Message', 'Received'), r('BOOTREQUEST', 0), r('DHCPDISCOVER', s.discover), r('DHCPREQUEST', s.request), r('DHCPDECLINE', 0), r('DHCPRELEASE', s.release), r('DHCPINFORM', 0), '',
    r('Message', 'Sent'), r('BOOTREPLY', 0), r('DHCPOFFER', s.offer), r('DHCPACK', s.ack), r('DHCPNAK', 0)].join('\n');
}

function iosShowIpInterface(topo, dev, n) {
  const ic = dev.cfg.interfaces[n];
  const s = ifStatus(topo, dev, n);
  const L = [n + ' is ' + s.status + ', line protocol is ' + s.protocol + (s.protocol === 'up' && ifKind(n) === 'phys' ? ' (connected)' : '')];
  if (!ic.ip) { L.push('  Internet protocol processing disabled'); return L.join('\n'); }
  L.push('  Internet address is ' + ic.ip + '/' + maskToLen(ic.mask), '  Broadcast address is 255.255.255.255', '  Address determined by setup command', '  MTU is 1500 bytes');
  const hs = ic.helpers || [];
  if (!hs.length) L.push('  Helper address is not set');
  else if (hs.length === 1) L.push('  Helper address is ' + hs[0]);
  else L.push('  Helper addresses are ' + hs[0], ...hs.slice(1).map((x) => '                       ' + x));
  L.push('  Directed broadcast forwarding is disabled', '  Outgoing access list is not set', '  Inbound  access list is not set', '  Proxy ARP is enabled', '  Split horizon is enabled',
    '  ICMP redirects are always sent', '  ICMP unreachables are always sent', '  ICMP mask replies are never sent');
  return L.join('\n');
}

function iosShowHosts(dev) {
  const cfg = dev.cfg, ns = cfg.nameServers || [];
  const L = ['Default domain is ' + (cfg.domainName || 'not set'), 'Name/address lookup uses ' + (cfg.domainLookup === false ? 'static mappings' : 'domain service'),
    'Name servers are ' + (ns.length ? ns.join(', ') : '255.255.255.255'), '', 'Codes: UN - unknown, EX - expired, OK - OK, ?? - revalidate',
    '       temp - temporary, perm - permanent', '       NA - Not Applicable None - Not defined', '', 'Host                      Port  Flags      Age Type   Address(es)'];
  for (const [n, ip] of Object.entries(cfg.hosts || {})) L.push(padR(n, 26) + padR('None', 6) + padR('(perm, OK)', 11) + padR('0', 4) + padR('IP', 7) + ip);
  return L.join('\n');
}

function iosShowInterface(topo, dev, n) {
  const ic = dev.cfg.interfaces[n];
  const s = ifStatus(topo, dev, n);
  const mac = ifMac(dev, n);
  const hw = n.startsWith('Gigabit') ? 'CN Gigabit Ethernet' : n.startsWith('Fast') ? 'Lance' : n.startsWith('Vlan') ? 'CPU Interface' : n.startsWith('Loopback') ? 'Loopback' : ifKind(n) === 'po' ? 'EtherChannel' : 'Ethernet';
  const lines = [n + ' is ' + s.status + ', line protocol is ' + s.protocol + (s.errdis ? ' (err-disabled)' : s.protocol === 'up' && ifKind(n) === 'phys' ? ' (connected)' : '')];
  lines.push('  Hardware is ' + hw + ', address is ' + mac.toLowerCase() + ' (bia ' + mac.toLowerCase() + ')');
  if (ifKind(n) === 'po') {
    const G = ecGroupState(topo, dev, poGroup(n));
    const inPo = G ? Object.keys(G.flags).filter((m) => G.flags[m] === 'P') : [];
    lines.push('  Members in this channel: ' + (inPo.length ? inPo.map(ifShort).join(' ') : '(none)'));
  }
  if (ic.description) lines.push('  Description: ' + ic.description);
  if (ic.ip) lines.push('  Internet address is ' + ic.ip + '/' + maskToLen(ic.mask));
  const bw = n.startsWith('Gigabit') ? 1000000 : n.startsWith('Fast') ? 100000 : n.startsWith('Loopback') ? 8000000 : 100000;
  lines.push('  MTU 1500 bytes, BW ' + bw + ' Kbit, DLY 10 usec,', '     reliability 255/255, txload 1/255, rxload 1/255');
  if (ic.encap) lines.push('  Encapsulation 802.1Q Virtual LAN, Vlan ID  ' + ic.encap.vlan);
  else lines.push('  Encapsulation ARPA, loopback not set');
  if (ifKind(n) === 'phys') lines.push('  Full-duplex, ' + (n.startsWith('Gigabit') ? '1000Mb/s' : '100Mb/s') + ', media type is RJ45');
  return lines.join('\n');
}

function iosShowSwitchport(topo, dev, n) {
  const ic = dev.cfg.interfaces[n];
  if (!ic || (ifKind(n) !== 'phys' && ifKind(n) !== 'po')) return '% Invalid interface';
  const oper = swOperMode(topo, dev, swRepPort(topo, dev, n));
  const admin = ic.mode === 'access' ? 'static access' : ic.mode === 'trunk' ? 'trunk' : ic.mode;
  return [
    'Name: ' + ifShort(n), 'Switchport: Enabled', 'Administrative Mode: ' + admin,
    'Operational Mode: ' + (ifUp(topo, dev, n) ? (oper === 'access' ? 'static access' : 'trunk') : 'down'),
    'Administrative Trunking Encapsulation: dot1q', 'Operational Trunking Encapsulation: ' + (oper === 'trunk' ? 'dot1q' : 'native'),
    'Negotiation of Trunking: ' + (ic.nonegotiate || ic.mode === 'access' ? 'Off' : 'On'),
    'Access Mode VLAN: ' + ic.accessVlan + ' (' + ((dev.cfg.vlans[ic.accessVlan] || {}).name || 'Inactive') + ')',
    'Trunking Native Mode VLAN: ' + ic.nativeVlan + ' (' + ((dev.cfg.vlans[ic.nativeVlan] || {}).name || 'Inactive') + ')',
    'Trunking VLANs Enabled: ' + (ic.allowed === 'all' ? 'ALL' : vlanListStr(ic.allowed)),
  ].join('\n');
}

function iosShowVlanBrief(topo, dev) {
  const lines = ['', 'VLAN Name                             Status    Ports', '---- -------------------------------- --------- -------------------------------'];
  const vlans = Object.keys(dev.cfg.vlans).map(Number).sort((a, b) => a - b);
  const all = vlans.concat([1002, 1003, 1004, 1005]);
  const dflt = { 1002: 'fddi-default', 1003: 'token-ring-default', 1004: 'fddinet-default', 1005: 'trnet-default' };
  for (const v of all) {
    const name = dflt[v] || dev.cfg.vlans[v].name;
    // порты пучка в списке заменяет их Port-channel, как в IOS
    const sws = swState(topo);
    const ports = [...new Set(dev.ports.filter((p) => {
      const ic = dev.cfg.interfaces[p.name];
      return ic && swOperMode(topo, dev, p.name) === 'access' && ic.accessVlan === v;
    }).map((p) => swLogicalPort(sws, dev, p.name) || p.name))].map(ifShort);
    const chunks = [];
    for (let i = 0; i < ports.length; i += 4) chunks.push(ports.slice(i, i + 4).join(', '));
    lines.push(padR(v, 5) + padR(name, 33) + padR('active', 10) + (chunks[0] || ''));
    for (const ch of chunks.slice(1)) lines.push(' '.repeat(48) + ch);
  }
  return lines.join('\n');
}

function iosShowTrunk(topo, dev) {
  // логические порты: пучок EtherChannel показывается одной строкой Po<N>
  const sws = swState(topo);
  const trunks = [...new Set(dev.ports.filter((p) => portPhysUp(topo, dev.id, p.name) && swOperMode(topo, dev, p.name) === 'trunk')
    .map((p) => swLogicalPort(sws, dev, p.name)).filter(Boolean))].map((name) => ({ name }));
  if (!trunks.length) return '';
  const lines = ['Port        Mode         Encapsulation  Status        Native vlan'];
  for (const p of trunks) {
    const ic = dev.cfg.interfaces[p.name];
    const mode = ic.mode === 'trunk' ? 'on' : ic.mode === 'dynamic desirable' ? 'desirable' : 'auto';
    lines.push(padR(ifShort(p.name), 12) + padR(mode, 13) + padR('802.1q', 15) + padR('trunking', 14) + ic.nativeVlan);
  }
  lines.push('', 'Port        Vlans allowed on trunk');
  for (const p of trunks) { const ic = dev.cfg.interfaces[p.name]; lines.push(padR(ifShort(p.name), 12) + (ic.allowed === 'all' ? '1-1005' : vlanListStr(ic.allowed))); }
  lines.push('', 'Port        Vlans allowed and active in management domain');
  const active = Object.keys(dev.cfg.vlans).map(Number);
  for (const p of trunks) {
    const ic = dev.cfg.interfaces[p.name];
    lines.push(padR(ifShort(p.name), 12) + vlanListStr(active.filter((v) => vlanAllowed(ic, v)).sort((a, b) => a - b)));
  }
  lines.push('', 'Port        Vlans in spanning tree forwarding state and not pruned');
  for (const p of trunks) {
    const ic = dev.cfg.interfaces[p.name];
    const fwd = active.filter((v) => vlanAllowed(ic, v) && !stpBlocks(sws, dev, p.name, v)).sort((a, b) => a - b);
    lines.push(padR(ifShort(p.name), 12) + (fwd.length ? vlanListStr(fwd) : 'none'));
  }
  return lines.join('\n');
}

function iosShowMac(topo, dev) {
  const t = netRt(topo).mac[dev.id] || {};
  const lines = ['          Mac Address Table', '-------------------------------------------', '', 'Vlan    Mac Address       Type        Ports', '----    -----------       --------    -----'];
  const entries = Object.entries(t).filter(([, e]) => portPhysUp(topo, dev.id, e.port)).sort((a, b) => a[1].vlan - b[1].vlan);
  for (const [mac, e] of entries) lines.push(padL(e.vlan, 4) + '    ' + padR(mac.toLowerCase(), 18) + padR('DYNAMIC', 12) + ifShort(e.port));
  return lines.join('\n');
}

function iosShowCdp(topo, dev) {
  const lines = ['Capability Codes: R - Router, T - Trans Bridge, B - Source Route Bridge', '                  S - Switch, H - Host, I - IGMP, r - Repeater, P - Phone',
    'Device ID    Local Intrfce   Holdtme    Capability   Platform    Port ID'];
  for (const p of dev.ports) {
    if (!portPhysUp(topo, dev.id, p.name)) continue;
    const peer = linkPeer(topo, dev.id, p.name);
    const N = topo.devices[peer.dev];
    if (N.type === 'pc' || N.cfg.cdp === false || dev.cfg.cdp === false) continue;
    const sp = (n) => ifShort(n).replace(/^Gi/, 'Gig ').replace(/^Fa/, 'Fas ');
    lines.push(padR(N.cfg.hostname, 13) + padR(sp(p.name), 16) + padR('150', 11) + padR(N.type === 'router' ? 'R' : 'S', 13) + padR(N.model, 12) + sp(peer.port));
  }
  return lines.join('\n');
}

function iosShowArp(topo, dev) {
  const lines = ['Protocol  Address          Age (min)  Hardware Addr   Type   Interface'];
  for (const i of l3Ifaces(dev)) {
    if (!ifUp(topo, dev, i.name)) continue;
    lines.push('Internet  ' + padR(intToIp(i.ip), 17) + padR('-', 11) + padR(ifMac(dev, i.name), 16) + 'ARPA   ' + i.name);
  }
  const t = netRt(topo).arp[dev.id] || {};
  for (const [ip, e] of Object.entries(t)) lines.push('Internet  ' + padR(ip, 17) + padR('0', 11) + padR(e.mac, 16) + 'ARPA   ' + e.ifName);
  return lines.join('\n');
}

function iosShowVersion(topo, dev) {
  const img = iosImage(dev), hw = iosHw(dev);
  const L = [...img.lines, '', 'ROM: ' + img.rom];
  if (img.boot) L.push('BOOTLDR: ' + img.boot);
  L.push('', dev.cfg.hostname + ' uptime is 12 minutes, 4 seconds', 'System returned to ROM by power-on', 'System image file is "' + img.file + '"', '');
  if (dev.type === 'router') {
    L.push(hw.cpu, 'Processor board ID ' + hw.sn, ...iosIfLines(hw));
    if (img === IOS_IMAGES.isr4) L.push('32768K bytes of non-volatile configuration memory.', '4194304K bytes of physical memory.', '3207167K bytes of flash memory at bootflash:.', '978928K bytes of USB flash at usb0:.');
    else L.push('DRAM configuration is 64 bits wide with parity disabled.', '255K bytes of non-volatile configuration memory.', '249856K bytes of ATA System CompactFlash 0 (Read/Write)');
    L.push('', 'Configuration register is 0x2102');
  } else {
    const old = img === IOS_IMAGES.c2950;
    L.push(hw.cpu, 'Processor board ID ' + hw.sn, 'Last reset from power-on');
    if (!old) L.push('1 Virtual Ethernet interface');
    L.push(...iosIfLines(hw, old));
    if (!old) L.push('The password-recovery mechanism is enabled.');
    L.push('', (old ? '63488K' : '64K') + ' bytes of flash-simulated non-volatile configuration memory.', 'Base ethernet MAC Address       : ' + ((dev.ports[0] && dev.ports[0].mac) || ''), 'Model number                    : ' + hw.pid, 'System serial number            : ' + hw.sn);
    if (!old) L.push('', 'Switch Ports Model              SW Version            SW Image', '------ ----- -----              ----------            ----------',
      '*    1 ' + padR(String(dev.ports.length), 6) + padR(hw.pid, 19) + padR(img.swVer, 22) + img.swImg);
    L.push('', 'Configuration register is 0xF');
  }
  return L.join('\n');
}

// ================= running-config =================
function iosPw(cfg, pw) { return cfg.servicePasswordEncryption ? '7 ' + type7(pw) : pw; }

function iosRunningConfig(topo, dev, cfg, isStartup) {
  const L = [];
  L.push('!', 'version ' + iosImage(dev).cfgVer, 'no service timestamps log datetime msec', 'no service timestamps debug datetime msec');
  L.push(cfg.servicePasswordEncryption ? 'service password-encryption' : 'no service password-encryption', '!', 'hostname ' + cfg.hostname, '!');
  if (cfg.enableSecret) L.push('enable secret 5 ' + fakeMd5(cfg.enableSecret));
  if (cfg.enablePassword) L.push('enable password ' + iosPw(cfg, cfg.enablePassword));
  L.push('!');
  if (dev.type === 'router') {
    for (const e of cfg.dhcpExcluded) L.push('ip dhcp excluded-address ' + e.start + (e.end && e.end !== e.start ? ' ' + e.end : ''));
    if (cfg.dhcpExcluded.length) L.push('!');
    for (const [name, p] of Object.entries(cfg.dhcpPools)) {
      L.push('ip dhcp pool ' + name);
      if (p.network) L.push(' network ' + p.network + ' ' + p.mask);
      if (p.defaultRouter) L.push(' default-router ' + p.defaultRouter);
      if (p.dns) L.push(' dns-server ' + p.dns);
      if (p.domainName) L.push(' domain-name ' + p.domainName);
    }
    if (Object.keys(cfg.dhcpPools).length) L.push('!');
    L.push('!', 'no ip cef', 'no ipv6 cef', '!');
  }
  for (const [u, x] of Object.entries(cfg.users)) {
    L.push('username ' + u + (x.privilege ? ' privilege ' + x.privilege : '') + (x.secret ? ' secret 5 ' + fakeMd5(x.secret) : ' password ' + iosPw(cfg, x.password)));
  }
  if (cfg.domainName) L.push('ip domain-name ' + cfg.domainName);
  for (const [n, ip] of Object.entries(cfg.hosts || {})) L.push('ip host ' + n + ' ' + ip);
  if ((cfg.nameServers || []).length) L.push('ip name-server ' + cfg.nameServers.join(' '));
  if (cfg.domainLookup === false) L.push('no ip domain-lookup');
  if (cfg.sshVersion) L.push('ip ssh version ' + cfg.sshVersion);
  L.push('!', 'spanning-tree mode ' + (cfg.stpMode || 'pvst'));
  if (dev.type === 'switch') L.push(...swRunningGlobal(cfg));
  L.push('!');
  if (dev.type === 'switch') {
    // как в IOS: сначала Port-channel, потом физические порты
    const pos = Object.keys(cfg.interfaces).filter((n) => ifKind(n) === 'po').sort((a, b) => poGroup(a) - poGroup(b));
    for (const n of pos.concat(dev.ports.map((p) => p.name))) {
      const ic = cfg.interfaces[n];
      if (!ic) continue;
      L.push('interface ' + n);
      if (ic.description) L.push(' description ' + ic.description);
      if (ic.accessVlan !== 1) L.push(' switchport access vlan ' + ic.accessVlan);
      if (ic.nativeVlan !== 1) L.push(' switchport trunk native vlan ' + ic.nativeVlan);
      if (ic.allowed !== 'all') L.push(' switchport trunk allowed vlan ' + vlanListStr(ic.allowed));
      if (ic.mode === 'access') L.push(' switchport mode access');
      if (ic.mode === 'trunk') L.push(' switchport mode trunk');
      if (ic.mode === 'dynamic desirable') L.push(' switchport mode dynamic desirable');
      if (ic.nonegotiate) L.push(' switchport nonegotiate');
      if (ic.portfast) L.push(' spanning-tree portfast');
      L.push(...swRunningIf(ic));
      if (ic.shutdown) L.push(' shutdown');
      L.push('!');
    }
    const svis = Object.keys(cfg.interfaces).filter((n) => n.startsWith('Vlan')).sort((a, b) => Number(a.slice(4)) - Number(b.slice(4)));
    for (const n of svis) {
      const ic = cfg.interfaces[n];
      L.push('interface ' + n);
      if (ic.description) L.push(' description ' + ic.description);
      L.push(ic.ip ? ' ip address ' + ic.ip + ' ' + ic.mask : ' no ip address');
      if (ic.shutdown) L.push(' shutdown');
      L.push('!');
    }
    if (cfg.defaultGateway) L.push('ip default-gateway ' + cfg.defaultGateway, '!');
  } else {
    for (const n of iosIfOrder({ ...dev, cfg })) {
      const ic = cfg.interfaces[n];
      if (!ic) continue;
      L.push('interface ' + n);
      if (ic.description) L.push(' description ' + ic.description);
      if (ic.encap) L.push(' encapsulation dot1Q ' + ic.encap.vlan + (ic.encap.native ? ' native' : ''));
      L.push(ic.ip ? ' ip address ' + ic.ip + ' ' + ic.mask : ' no ip address');
      for (const h of ic.helpers || []) L.push(' ip helper-address ' + h);
      if (ic.ospfCost) L.push(' ip ospf cost ' + ic.ospfCost);
      if (ic.ospfArea !== undefined && cfg.ospf) L.push(' ip ospf ' + cfg.ospf.pid + ' area ' + ic.ospfArea);
      if (ifKind(n) === 'phys') L.push(' duplex auto', ' speed auto');
      if (ic.shutdown) L.push(' shutdown');
      L.push('!');
    }
    if (cfg.ospf) {
      const o = cfg.ospf;
      L.push('router ospf ' + o.pid);
      if (o.routerId) L.push(' router-id ' + o.routerId);
      L.push(' log-adjacency-changes');
      if (o.refBw && o.refBw !== 100) L.push(' auto-cost reference-bandwidth ' + o.refBw);
      for (const p of o.passive) L.push(' passive-interface ' + p);
      for (const n of o.networks) L.push(' network ' + n.ip + ' ' + n.wildcard + ' area ' + n.area);
      if (o.defaultOriginate) L.push(' default-information originate' + (o.defaultAlways ? ' always' : ''));
      L.push('!');
    }
    if (cfg.rip) {
      const r = cfg.rip;
      L.push('router rip');
      if (r.version) L.push(' version ' + r.version);
      for (const p of r.passive) L.push(' passive-interface ' + p);
      for (const n of r.networks) L.push(' network ' + n);
      if (r.defaultOriginate) L.push(' default-information originate');
      if (r.autoSummary === false) L.push(' no auto-summary');
      L.push('!');
    }
    L.push('ip classless');
    for (const s of cfg.staticRoutes) {
      L.push('ip route ' + s.net + ' ' + s.mask + (s.exitIf ? ' ' + s.exitIf : '') + (s.nextHop ? ' ' + s.nextHop : '') + (s.ad ? ' ' + s.ad : ''));
    }
    L.push('!', 'ip flow-export version 9', '!');
  }
  if (cfg.banner) L.push('banner motd ^C' + cfg.banner + '^C', '!');
  L.push('!');
  const ln = (name, hdr) => {
    const l = cfg.lines[name] || {};
    L.push(hdr);
    if (l.password) L.push(' password ' + iosPw(cfg, l.password));
    if (l.loginLocal) L.push(' login local');
    else if (l.login) L.push(' login');
    if (l.transport) L.push(' transport input ' + l.transport);
    if (l.loggingSync) L.push(' logging synchronous');
  };
  ln('con', 'line con 0');
  if (dev.type === 'router') { L.push('!', 'line aux 0'); }
  L.push('!');
  ln('vty', 'line vty 0 4');
  L.push('line vty 5 15');
  const vty = cfg.lines.vty || {};
  if (vty.password) L.push(' password ' + iosPw(cfg, vty.password));
  if (vty.login) L.push(vty.loginLocal ? ' login local' : ' login');
  L.push('!', '!', 'end');
  const body = L.join('\n');
  return (isStartup ? 'Using ' + body.length + ' bytes\n' : 'Building configuration...\n\nCurrent configuration : ' + body.length + ' bytes\n') + body + '\n';
}

// Выполнить набор конфиг-команд (для GUI-вкладки Config и сценариев заданий)
function iosRunConfig(topo, devId, cmds) {
  const sess = iosNewSession(topo, devId);
  sess.started = true;
  sess.mode = 'priv';
  const outs = [];
  for (const cmd of ['configure terminal', ...cmds, 'end']) {
    const r = iosExec(topo, sess, cmd);
    if (sess.pending) { const r2 = iosExec(topo, sess, ''); if (r2.out) outs.push(r2.out); }
    if (r.out) outs.push(r.out);
  }
  return outs.join('');
}

// Выполнить сценарий как в консоли (начиная с user-режима, с enable)
function iosRunScript(topo, devId, cmds) {
  const sess = iosNewSession(topo, devId);
  sess.started = true;
  sess.mode = 'user';
  const outs = [];
  for (const cmd of cmds) {
    const r = iosExec(topo, sess, cmd);
    if (r.out) outs.push(r.out);
  }
  return { out: outs.join(''), sess };
}
