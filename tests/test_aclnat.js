'use strict';
// ACL, NAT/PAT, вход по telnet/ssh с проверкой access-class, Wi-Fi (WRT300N, AccessPoint-PT, беспроводные карты).

function anCli(topo, id, lines) {
  const sess = iosNewSession(topo, id);
  iosExec(topo, sess, '');
  let out = '';
  for (const l of ['enable'].concat(lines)) out += iosExec(topo, sess, l).out || '';
  return out;
}

// PC1 192.168.10.10 — R1 — 10.1.1.0/30 — R2 — PC3 192.168.30.10; статика в обе стороны
function anAclTopo() {
  const topo = newTopology();
  tAdd(topo, '1941', 'R1', 0, 0); tAdd(topo, '1941', 'R2', 0, 0);
  tAdd(topo, 'PC', 'PC1', 0, 0); tAdd(topo, 'PC', 'PC2', 0, 0); tAdd(topo, 'PC', 'PC3', 0, 0); tAdd(topo, '2960', 'S1', 0, 0);
  tLink(topo, 'R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/1');
  tLink(topo, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1');
  tLink(topo, 'PC1', 'FastEthernet0', 'S1', 'FastEthernet0/1'); tLink(topo, 'PC2', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  tLink(topo, 'PC3', 'FastEthernet0', 'R2', 'GigabitEthernet0/0');
  tCli(topo, 'R1', ['interface g0/0', 'ip address 192.168.10.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.1.1.1 255.255.255.252', 'no shutdown', 'exit', 'ip route 192.168.30.0 255.255.255.0 10.1.1.2']);
  tCli(topo, 'R2', ['interface g0/0', 'ip address 192.168.30.1 255.255.255.0', 'no shutdown', 'interface g0/1', 'ip address 10.1.1.2 255.255.255.252', 'no shutdown', 'exit', 'ip route 192.168.10.0 255.255.255.0 10.1.1.1']);
  tPc(topo, 'PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1'); tPc(topo, 'PC2', '192.168.10.11', '255.255.255.0', '192.168.10.1');
  tPc(topo, 'PC3', '192.168.30.10', '255.255.255.0', '192.168.30.1');
  netBoot(topo); netCommit(topo);
  return topo;
}

test('ACL: numbered standard ACL, implicit deny, counters, running-config', () => {
  const topo = anAclTopo();
  eq(canReach(topo, 'PC1', '192.168.30.10').status, 'reply', 'works before the ACL');
  const out = anCli(topo, 'R2', ['configure terminal', 'access-list 10 remark Block PC1 only', 'access-list 10 deny host 192.168.10.10', 'access-list 10 permit 192.168.10.0 0.0.0.255',
    'interface g0/0', 'ip access-group 10 out', 'end']);
  ok(!/Invalid/.test(out), 'commands accepted: ' + out);
  const r = canReach(topo, 'PC1', '192.168.30.10');
  eq(r.status, 'unreachable', 'denied: router answers Destination host unreachable');
  ok(r.acl, 'reason is the ACL');
  eq(canReach(topo, 'PC2', '192.168.30.10').status, 'reply', 'PC2 is permitted');
  eq(iosShowAccessLists(topo, topo.devices.R2), 'Standard IP access list 10\n    10 deny host 192.168.10.10\n    20 permit 192.168.10.0 0.0.0.255', 'probe pings do not count');
  pingOnce(topo, 'PC1', ipToInt('192.168.30.10'), { arp: false });
  pingOnce(topo, 'PC2', ipToInt('192.168.30.10'), { arp: false });
  const sh = anCli(topo, 'R2', ['show access-lists', 'show running-config', 'show ip interface g0/0']);
  ok(sh.includes('10 deny host 192.168.10.10 (1 match(es))'), 'counter on the deny line');
  ok(sh.includes('20 permit 192.168.10.0 0.0.0.255 (1 match(es))'), 'counter on the permit line');
  ok(sh.includes('access-list 10 remark Block PC1 only') && sh.includes('access-list 10 deny host 192.168.10.10'), 'numbered ACL in running-config');
  ok(sh.includes(' ip access-group 10 out'), 'applied under the interface');
  ok(sh.includes('Outgoing access list is 10') && sh.includes('Inbound  access list is not set'), 'show ip interface');
  // ACL из одних deny блокирует всё
  anCli(topo, 'R2', ['configure terminal', 'no access-list 10', 'access-list 10 deny host 192.168.10.10', 'end']);
  eq(canReach(topo, 'PC2', '192.168.30.10').status, 'unreachable', 'implicit deny any');
  anCli(topo, 'R2', ['configure terminal', 'interface g0/0', 'no ip access-group 10 out', 'end']);
  eq(canReach(topo, 'PC1', '192.168.30.10').status, 'reply', 'removed from the interface');
  const bad = anCli(topo, 'R2', ['configure terminal', 'access-list 10 permit 192.168.10.0 0.0.0.255 eq www', 'access-list 500 permit any']);
  ok(/Invalid input detected/.test(bad), 'standard ACL rejects ports, number 500 is not an IP ACL');
});

test('ACL: named extended ACL, editing by sequence number, router ping shows U.U.U', () => {
  const topo = anAclTopo();
  tAdd(topo, 'Server', 'SRV', 0, 0); tLink(topo, 'SRV', 'FastEthernet0', 'S1', 'FastEthernet0/3'); tPc(topo, 'SRV', '192.168.10.254', '255.255.255.0', '192.168.10.1');
  const out = anCli(topo, 'R1', ['configure terminal', 'ip access-list extended WEB-ONLY', 'permit tcp 192.168.30.0 0.0.0.255 host 192.168.10.254 eq www', 'permit tcp any any established',
    'deny icmp any host 192.168.10.254 echo', 'permit ip any any', 'exit', 'interface g0/1', 'ip access-group WEB-ONLY in', 'end']);
  ok(!/Invalid|Incomplete/.test(out), out);
  ok(/\(config-ext-nacl\)#$/.test(iosPrompt(topo, Object.assign(iosNewSession(topo, 'R1'), { started: true, mode: 'ext-nacl' }))), 'prompt');
  eq(flowOnce(topo, 'PC3', ipToInt('192.168.10.254'), 'tcp', 80, { arp: false, probe: true, natScratch: {} }).ok, true, 'HTTP to the server is permitted');
  eq(canReach(topo, 'PC3', '192.168.10.254').status, 'unreachable', 'ping to the server is denied');
  eq(canReach(topo, 'PC3', '192.168.10.10').status, 'reply', 'other traffic permitted');
  // вставить строку 25, удалить 30
  anCli(topo, 'R1', ['configure terminal', 'ip access-list extended WEB-ONLY', '25 permit icmp host 192.168.30.10 host 192.168.10.254', 'no 30', 'end']);
  const sh = iosShowAccessLists(topo, topo.devices.R1);
  ok(sh.includes('10 permit tcp 192.168.30.0 0.0.0.255 host 192.168.10.254 eq www'), 'www shown by name');
  ok(sh.includes('25 permit icmp host 192.168.30.10 host 192.168.10.254') && !sh.includes('30 deny icmp'), 'line inserted and line removed: ' + sh);
  eq(canReach(topo, 'PC3', '192.168.10.254').status, 'reply', 'after the edit the ping works');
  const rc = anCli(topo, 'R1', ['show running-config']);
  ok(rc.includes('ip access-list extended WEB-ONLY\n permit tcp 192.168.30.0 0.0.0.255 host 192.168.10.254 eq www'), 'named ACL block in running-config');
  // пинг с роутера, которому ответ режет ACL на соседнем роутере
  anCli(topo, 'R2', ['configure terminal', 'access-list 1 deny any', 'interface g0/1', 'ip access-group 1 in', 'end']);
  const ping = anCli(topo, 'R1', ['ping 192.168.30.10']);
  ok(/U\.U/.test(ping), 'router ping: U.U.U (unreachables are rate-limited): ' + ping);
});

test('ACL: VTY access-class, telnet and ssh from a PC', () => {
  const topo = anAclTopo();
  anCli(topo, 'R1', ['configure terminal', 'hostname R1', 'enable secret class', 'line vty 0 4', 'password cisco', 'login', 'exit',
    'ip access-list standard ADMIN', 'permit host 192.168.10.10', 'exit', 'line vty 0 4', 'access-class ADMIN in', 'end']);
  const okT = remoteLogin(topo, 'PC1', '192.168.10.1', 'telnet');
  ok(okT.sess && okT.lines[0] === 'Trying 192.168.10.1 ...Open', 'telnet from the admin PC opens');
  eq(okT.sess.pending.prompt, 'Password: ');
  iosExec(topo, okT.sess, 'cisco');
  eq(iosPrompt(topo, okT.sess), 'R1>', 'logged in');
  iosExec(topo, okT.sess, 'enable'); iosExec(topo, okT.sess, 'class');
  eq(iosPrompt(topo, okT.sess), 'R1#');
  const no = remoteLogin(topo, 'PC2', '192.168.10.1', 'telnet');
  ok(!no.sess && no.lines.join('\n').includes('% Connection refused by remote host'), 'other PC refused by access-class');
  ok(iosShowAccessLists(topo, topo.devices.R1).includes('10 permit host 192.168.10.10 (1 match(es))'), 'access-class counts');
  const ssh = remoteLogin(topo, 'PC1', '192.168.10.1', 'ssh', 'admin');
  ok(!ssh.sess, 'no SSH without domain name / RSA keys');
  anCli(topo, 'R1', ['class', 'configure terminal', 'ip domain-name lab.local', 'crypto key generate rsa general-keys modulus 1024', 'username admin secret Str0ng', 'line vty 0 4', 'login local', 'transport input ssh', 'end']);
  ok(!remoteLogin(topo, 'PC1', '192.168.10.1', 'telnet').sess, 'telnet refused by transport input ssh');
  const s2 = remoteLogin(topo, 'PC1', '192.168.10.1', 'ssh', 'admin');
  ok(s2.sess, 'ssh opens');
  iosExec(topo, s2.sess, 'Str0ng');
  eq(iosPrompt(topo, s2.sess), 'R1>');
});

// Внутри 192.168.1.0/24 — R1 (g0/0 inside, g0/1 outside 209.165.200.225/27) — ISP — сервер 198.51.100.10
function anNatTopo() {
  const topo = newTopology();
  tAdd(topo, '4331', 'R1', 0, 0); tAdd(topo, '2911', 'ISP', 0, 0); tAdd(topo, '2960', 'S1', 0, 0);
  tAdd(topo, 'PC', 'PC1', 0, 0); tAdd(topo, 'PC', 'PC2', 0, 0); tAdd(topo, 'Server', 'WEB', 0, 0); tAdd(topo, 'Server', 'LOCAL', 0, 0);
  tLink(topo, 'R1', 'GigabitEthernet0/0/0', 'S1', 'GigabitEthernet0/1');
  for (const [pc, p] of [['PC1', 1], ['PC2', 2], ['LOCAL', 3]]) tLink(topo, pc, 'FastEthernet0', 'S1', 'FastEthernet0/' + p);
  tLink(topo, 'R1', 'GigabitEthernet0/0/1', 'ISP', 'GigabitEthernet0/1');
  tLink(topo, 'WEB', 'FastEthernet0', 'ISP', 'GigabitEthernet0/0');
  tCli(topo, 'R1', ['interface g0/0/0', 'ip address 192.168.1.1 255.255.255.0', 'no shutdown', 'interface g0/0/1', 'ip address 209.165.200.225 255.255.255.224', 'no shutdown', 'exit', 'ip route 0.0.0.0 0.0.0.0 209.165.200.226']);
  tCli(topo, 'ISP', ['interface g0/1', 'ip address 209.165.200.226 255.255.255.224', 'no shutdown', 'interface g0/0', 'ip address 198.51.100.1 255.255.255.0', 'no shutdown']);
  tPc(topo, 'PC1', '192.168.1.10', '255.255.255.0', '192.168.1.1'); tPc(topo, 'PC2', '192.168.1.11', '255.255.255.0', '192.168.1.1');
  tPc(topo, 'LOCAL', '192.168.1.254', '255.255.255.0', '192.168.1.1'); tPc(topo, 'WEB', '198.51.100.10', '255.255.255.0', '198.51.100.1');
  netBoot(topo); netCommit(topo);
  return topo;
}

test('NAT: PAT with interface overload, translations and statistics', () => {
  const topo = anNatTopo();
  eq(canReach(topo, 'PC1', '198.51.100.10').status, 'timeout', 'ISP has no route back to the private LAN');
  const out = anCli(topo, 'R1', ['configure terminal', 'access-list 1 permit 192.168.1.0 0.0.0.255', 'ip nat inside source list 1 interface GigabitEthernet0/0/1 overload',
    'interface g0/0/0', 'ip nat inside', 'interface g0/0/1', 'ip nat outside', 'end']);
  ok(!/Invalid/.test(out), out);
  eq(canReach(topo, 'PC1', '198.51.100.10').status, 'reply', 'PAT works');
  eq(natState(topo, topo.devices.R1).entries.length, 0, 'a check does not leave translations');
  eq(pingOnce(topo, 'PC1', ipToInt('198.51.100.10'), { arp: false }).status, 'reply');
  eq(pingOnce(topo, 'PC2', ipToInt('198.51.100.10'), { arp: false }).status, 'reply');
  const sh = anCli(topo, 'R1', ['show ip nat translations', 'show ip nat statistics', 'show running-config']);
  ok(/icmp 209\.165\.200\.225:1\s+192\.168\.1\.10:1\s+198\.51\.100\.10:1\s+198\.51\.100\.10:1/.test(sh), 'PC1 row: ' + sh);
  ok(/icmp 209\.165\.200\.225:2\s+192\.168\.1\.11:1/.test(sh), 'PC2 got the next free id (PAT): ' + sh);
  ok(sh.includes('Outside Interfaces: GigabitEthernet0/0/1') && sh.includes('Inside Interfaces: GigabitEthernet0/0/0'), 'statistics: interfaces');
  ok(sh.includes('access-list 1 interface GigabitEthernet0/0/1 refCount 2'), 'statistics: mapping');
  ok(sh.includes('ip nat inside source list 1 interface GigabitEthernet0/0/1 overload') && sh.includes(' ip nat inside') && sh.includes(' ip nat outside'), 'running-config');
  anCli(topo, 'R1', ['clear ip nat translation *']);
  eq(natState(topo, topo.devices.R1).entries.length, 0, 'cleared');
  // HTTP тоже проходит через PAT
  ok(flowOnce(topo, 'PC1', ipToInt('198.51.100.10'), 'tcp', 80, { arp: false }).ok, 'TCP through PAT');
});

test('NAT: static NAT for a server, dynamic pool and its exhaustion', () => {
  const topo = anNatTopo();
  anCli(topo, 'R1', ['configure terminal', 'ip nat inside source static 192.168.1.254 209.165.200.229', 'interface g0/0/0', 'ip nat inside', 'interface g0/0/1', 'ip nat outside', 'end']);
  // сервер снаружи достаёт до внутреннего сервера по публичному адресу (R1 отвечает на ARP за 209.165.200.229)
  eq(canReach(topo, 'WEB', '209.165.200.229').status, 'reply', 'outside → inside global of the static mapping');
  eq(canReach(topo, 'WEB', '192.168.1.254').status, 'unreachable', 'private address is not routed outside: ISP answers unreachable');
  eq(canReach(topo, 'LOCAL', '198.51.100.10').status, 'reply', 'the server itself goes out with its static global address');
  eq(canReach(topo, 'PC1', '198.51.100.10').status, 'timeout', 'PC1 is not translated (no rule)');
  ok(iosShowNatTranslations(topo, topo.devices.R1).includes('---  209.165.200.229'), 'static entry shown');
  // динамический пул из одного адреса без overload
  anCli(topo, 'R1', ['configure terminal', 'ip nat pool PUB 209.165.200.230 209.165.200.230 netmask 255.255.255.224', 'access-list 2 permit 192.168.1.0 0.0.0.127', 'ip nat inside source list 2 pool PUB', 'end']);
  eq(pingOnce(topo, 'PC1', ipToInt('198.51.100.10'), { arp: false }).status, 'reply', 'PC1 takes the only address');
  eq(pingOnce(topo, 'PC2', ipToInt('198.51.100.10'), { arp: false }).status, 'timeout', 'pool exhausted for PC2');
  const st = anCli(topo, 'R1', ['show ip nat statistics', 'show ip nat translations']);
  ok(/total addresses 1 , allocated 1 \(100%\), misses 1/.test(st), st);
  ok(st.includes('---  209.165.200.230'), 'simple dynamic entry');
  anCli(topo, 'R1', ['configure terminal', 'ip nat inside source list 2 pool PUB overload', 'end']);
  eq(pingOnce(topo, 'PC2', ipToInt('198.51.100.10'), { arp: false }).status, 'reply', 'with overload the pool is shared');
});

test('Wi-Fi: WRT300N with a laptop, WPA2, WAN by DHCP and PAT to the Internet', () => {
  const topo = anNatTopo();
  tCli(topo, 'ISP', ['interface g0/2', 'ip address 203.0.113.1 255.255.255.0', 'no shutdown', 'exit', 'ip dhcp pool HOME', 'network 203.0.113.0 255.255.255.0', 'default-router 203.0.113.1', 'dns-server 198.51.100.10']);
  addDevice(topo, 'WRT300N', 0, 0, { id: 'WR', name: 'WR' });
  addDevice(topo, 'Laptop', 0, 0, { id: 'L1', name: 'L1' });
  addDevice(topo, 'PC', 0, 0, { id: 'PCw', name: 'PCw' });
  eq(addLink(topo, 'WR', 'Internet', 'ISP', 'GigabitEthernet0/2', 'auto').link.cable, 'cross', 'Internet port to a router = cross-over');
  eq(addLink(topo, 'PCw', 'FastEthernet0', 'WR', 'Ethernet 1', 'auto').link.cable, 'straight', 'PC to a LAN port = straight-through');
  netCommit(topo);
  const wr = topo.devices.WR;
  eq(wr.cfg.interfaces.Internet.ip, '203.0.113.2', 'WAN address from the ISP DHCP pool');
  eq(topo.devices.PCw.cfg.ip, null);
  topo.devices.PCw.cfg.ipMode = 'dhcp'; netCommit(topo);
  eq(topo.devices.PCw.cfg.ip, '192.168.0.100', 'wired PC: first address of the 192.168.0.100 range');
  eq(topo.devices.PCw.cfg.dns, '198.51.100.10', 'DNS passed on from the WAN lease');
  eq(wifiInstallModule(topo, 'L1', 'WPC300N').error, 'power', 'module swap needs power off');
  topo.devices.L1.off = true;
  ok(wifiInstallModule(topo, 'L1', 'WPC300N').ok);
  topo.devices.L1.off = false;
  topo.devices.L1.cfg.ipMode = 'dhcp'; netCommit(topo);
  eq(wifiApOf(topo, 'L1'), 'WR', 'joins the open SSID "Default"');
  eq(topo.devices.L1.cfg.ip, '192.168.0.101', 'wireless laptop got a lease');
  eq(canReach(topo, 'L1', '198.51.100.10').status, 'reply', 'to the Internet through the router PAT');
  eq(canReach(topo, 'L1', '192.168.0.100').status, 'reply', 'wireless ↔ wired inside one LAN');
  ok(flowOnce(topo, 'L1', ipToInt('198.51.100.10'), 'tcp', 80, { arp: false }).ok, 'web through PAT');
  // WPA2-Personal: клиент со старыми настройками отваливается
  Object.assign(wr.cfg.home, { ssid: 'HomeNet', security: 'wpa2', pass: 'Cisco123' }); homeApply(wr.cfg); netCommit(topo);
  eq(wifiApOf(topo, 'L1'), null, 'disconnected after the SSID / security change');
  topo.devices.L1.cfg.wifi = { ssid: 'HomeNet', security: 'wpa2', pass: 'wrong123' }; netCommit(topo);
  eq(wifiApOf(topo, 'L1'), null, 'wrong passphrase');
  topo.devices.L1.cfg.wifi.pass = 'Cisco123'; netCommit(topo);
  eq(wifiApOf(topo, 'L1'), 'WR', 'right passphrase');
  ok(wifiScan(topo, 'L1').some((n) => n.ssid === 'HomeNet' && n.security === 'wpa2'), 'visible in the scan');
  ok(!addLink(topo, 'L1', 'FastEthernet0', 'S1', 'FastEthernet0/9', 'auto').link, 'no Ethernet cable into a wireless card');
});

test('Wi-Fi: AccessPoint-PT bridges wireless PCs into a wired VLAN', () => {
  const topo = anAclTopo();
  tCli(topo, 'R1', ['ip dhcp excluded-address 192.168.10.1 192.168.10.20', 'ip dhcp pool LAN', 'network 192.168.10.0 255.255.255.0', 'default-router 192.168.10.1']);
  addDevice(topo, 'AccessPoint-PT', 0, 0, { id: 'AP', name: 'AP' });
  addDevice(topo, 'PC', 0, 0, { id: 'W1', name: 'W1' });
  eq(addLink(topo, 'AP', 'Port 0', 'S1', 'FastEthernet0/10', 'auto').link.cable, 'straight', 'AP to switch = straight-through');
  const w = topo.devices.W1;
  w.off = true; wifiInstallModule(topo, 'W1', 'WMP300N'); w.off = false;
  Object.assign(topo.devices.AP.cfg.wifi, { ssid: 'OFFICE', security: 'wpa2', pass: 'Secret99' });
  w.cfg.wifi = { ssid: 'OFFICE', security: 'wpa2', pass: 'Secret99' };
  w.cfg.ipMode = 'dhcp';
  netCommit(topo);
  eq(wifiApOf(topo, 'W1'), 'AP');
  eq(w.cfg.ip, '192.168.10.21', 'lease from the router through the AP');
  eq(canReach(topo, 'W1', '192.168.30.10').status, 'reply', 'routed onward');
  eq(ifStatus(topo, w, 'FastEthernet0').status, 'up');
  topo.devices.AP.cfg.wifi.pass = 'Other999'; netCommit(topo);
  eq(ifStatus(topo, w, 'FastEthernet0').status, 'down', 'no association → NIC down');
});
