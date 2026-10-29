'use strict';

test('PC-switch-PC same subnet', () => {
  const t = newTopology();
  addDevice(t, 'PC', 0, 0, { id: 'PC1' }); addDevice(t, 'PC', 0, 0, { id: 'PC2' }); addDevice(t, '2960', 0, 0, { id: 'S1' });
  link(t, 'PC1', 'FastEthernet0', 'S1', 'FastEthernet0/1');
  link(t, 'PC2', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  pcSet(t, 'PC1', '192.168.1.10', '255.255.255.0');
  pcSet(t, 'PC2', '192.168.1.11', '255.255.255.0');
  eq(reach(t, 'PC1', '192.168.1.11'), 'reply');
  eq(pingSeq(t, 'PC1', '192.168.1.11'), '!!!!', 'no loss on L2 ping');
  eq(reach(t, 'PC1', '192.168.1.99'), 'timeout');
});

test('cable type matters', () => {
  const t = newTopology();
  addDevice(t, 'PC', 0, 0, { id: 'A' }); addDevice(t, 'PC', 0, 0, { id: 'B' });
  const l = link(t, 'A', 'FastEthernet0', 'B', 'FastEthernet0', 'straight');
  pcSet(t, 'A', '10.0.0.1', '255.0.0.0'); pcSet(t, 'B', '10.0.0.2', '255.0.0.0');
  eq(reach(t, 'A', '10.0.0.2'), 'timeout', 'straight PC-PC is down');
  removeLink(t, l.id);
  link(t, 'A', 'FastEthernet0', 'B', 'FastEthernet0', 'cross');
  eq(reach(t, 'A', '10.0.0.2'), 'reply');
});

function routerLan(t) {
  addDevice(t, 'PC', 0, 0, { id: 'PC1' }); addDevice(t, 'PC', 0, 0, { id: 'PC2' }); addDevice(t, '2911', 0, 0, { id: 'R1' });
  link(t, 'PC1', 'FastEthernet0', 'R1', 'GigabitEthernet0/0');
  link(t, 'PC2', 'FastEthernet0', 'R1', 'GigabitEthernet0/1');
  pcSet(t, 'PC1', '192.168.1.10', '255.255.255.0', '192.168.1.1');
  pcSet(t, 'PC2', '192.168.2.10', '255.255.255.0', '192.168.2.1');
}

test('router between two PCs', () => {
  const t = newTopology();
  routerLan(t);
  eq(reach(t, 'PC1', '192.168.2.10'), 'timeout', 'before config');
  const out = cli(t, 'R1', ['int g0/0', 'ip add 192.168.1.1 255.255.255.0', 'no shut', 'int g0/1', 'ip address 192.168.2.1 255.255.255.0', 'no shutdown']);
  has(out, '%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up');
  has(out, '%LINEPROTO-5-UPDOWN: Line protocol on Interface GigabitEthernet0/1, changed state to up');
  eq(reach(t, 'PC1', '192.168.2.10'), 'reply');
  const r = canReach(t, 'PC1', '192.168.2.10');
  eq(r.ttl, 127, 'TTL after one router');
  eq(pingSeq(t, 'PC1', '192.168.2.10'), '.!!!', 'first ping lost to router ARP');
  // без шлюза
  pcSet(t, 'PC2', '192.168.2.10', '255.255.255.0', null);
  eq(reach(t, 'PC1', '192.168.2.10'), 'timeout', 'reply needs gateway');
  pcSet(t, 'PC2', '192.168.2.10', '255.255.255.0', '192.168.2.1');
  cli(t, 'R1', ['int g0/1', 'shutdown']);
  eq(reach(t, 'PC1', '192.168.2.10').startsWith('unreach') || reach(t, 'PC1', '192.168.2.10') === 'timeout', true);
  eq(reach(t, 'PC1', '192.168.2.10'), 'unreachable', 'router answers host unreachable');
});

test('static routing two routers', () => {
  const t = newTopology();
  addDevice(t, 'PC', 0, 0, { id: 'PC1' }); addDevice(t, 'PC', 0, 0, { id: 'PC2' });
  addDevice(t, '2911', 0, 0, { id: 'R1' }); addDevice(t, '2911', 0, 0, { id: 'R2' });
  link(t, 'PC1', 'FastEthernet0', 'R1', 'GigabitEthernet0/0');
  link(t, 'R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/1');
  link(t, 'PC2', 'FastEthernet0', 'R2', 'GigabitEthernet0/0');
  pcSet(t, 'PC1', '192.168.10.10', '255.255.255.0', '192.168.10.1');
  pcSet(t, 'PC2', '192.168.20.10', '255.255.255.0', '192.168.20.1');
  cli(t, 'R1', ['int g0/0', 'ip add 192.168.10.1 255.255.255.0', 'no sh', 'int g0/1', 'ip add 10.0.0.1 255.255.255.252', 'no sh']);
  cli(t, 'R2', ['int g0/0', 'ip add 192.168.20.1 255.255.255.0', 'no sh', 'int g0/1', 'ip add 10.0.0.2 255.255.255.252', 'no sh']);
  eq(reach(t, 'PC1', '192.168.20.10'), 'unreachable');
  cli(t, 'R1', ['ip route 192.168.20.0 255.255.255.0 10.0.0.2']);
  eq(reach(t, 'PC1', '192.168.20.10'), 'timeout', 'no return route');
  cli(t, 'R2', ['ip route 0.0.0.0 0.0.0.0 GigabitEthernet0/1']);
  eq(reach(t, 'PC1', '192.168.20.10'), 'reply', 'exit-interface default route via proxy arp');
  eq(canReach(t, 'PC1', '192.168.20.10').ttl, 126);
  eq(pingSeq(t, 'PC1', '192.168.20.10'), '...!', 'two router ARPs + proxy ARP for exit-interface route');
  const rt = iosRunScript(t, 'R1', ['en', 'show ip route']).out;
  has(rt, 'S    192.168.20.0/24 [1/0] via 10.0.0.2');
  has(rt, 'C       10.0.0.0/30 is directly connected, GigabitEthernet0/1');
  has(rt, 'L       10.0.0.1/32 is directly connected, GigabitEthernet0/1');
  const tr = traceroute(t, 'PC1', ipToInt('192.168.20.10'));
  eq(tr.hops.map((h) => h.ip), ['192.168.10.1', '10.0.0.2', '192.168.20.10']);
});

test('VLAN isolation and trunk', () => {
  const t = newTopology();
  addDevice(t, '2960', 0, 0, { id: 'S1' }); addDevice(t, '2960', 0, 0, { id: 'S2' });
  for (const id of ['A1', 'A2', 'B1', 'B2']) addDevice(t, 'PC', 0, 0, { id });
  link(t, 'A1', 'FastEthernet0', 'S1', 'FastEthernet0/1');
  link(t, 'B1', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  link(t, 'A2', 'FastEthernet0', 'S2', 'FastEthernet0/1');
  link(t, 'B2', 'FastEthernet0', 'S2', 'FastEthernet0/2');
  link(t, 'S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
  pcSet(t, 'A1', '192.168.1.1', '255.255.255.0'); pcSet(t, 'A2', '192.168.1.2', '255.255.255.0');
  pcSet(t, 'B1', '192.168.1.3', '255.255.255.0'); pcSet(t, 'B2', '192.168.1.4', '255.255.255.0');
  eq(reach(t, 'A1', '192.168.1.4'), 'reply', 'all in vlan 1');
  for (const s of ['S1', 'S2']) cli(t, s, ['vlan 10', 'name Sales', 'vlan 20', 'name HR', 'int fa0/1', 'sw mo acc', 'sw acc vl 10', 'int fa0/2', 'switchport mode access', 'switchport access vlan 20']);
  eq(reach(t, 'A1', '192.168.1.2'), 'timeout', 'no trunk: dynamic auto both sides');
  cli(t, 'S1', ['int g0/1', 'switchport mode trunk']);
  eq(reach(t, 'A1', '192.168.1.2'), 'reply', 'trunk negotiated with auto');
  eq(reach(t, 'B1', '192.168.1.4'), 'reply');
  eq(reach(t, 'A1', '192.168.1.4'), 'timeout', 'different vlan isolated');
  cli(t, 'S1', ['int g0/1', 'switchport trunk allowed vlan 10']);
  eq(reach(t, 'B1', '192.168.1.4'), 'timeout', 'vlan 20 pruned');
  eq(reach(t, 'A1', '192.168.1.2'), 'reply');
  const vb = iosRunScript(t, 'S1', ['en', 'show vlan brief']).out;
  has(vb, '10   Sales                            active    Fa0/1');
  const tr = iosRunScript(t, 'S1', ['en', 'show interfaces trunk']).out;
  has(tr, 'Gi0/1       on           802.1q         trunking      1');
});

test('router on a stick', () => {
  const t = newTopology();
  addDevice(t, '2960', 0, 0, { id: 'S1' }); addDevice(t, '2911', 0, 0, { id: 'R1' });
  addDevice(t, 'PC', 0, 0, { id: 'P10' }); addDevice(t, 'PC', 0, 0, { id: 'P20' });
  link(t, 'P10', 'FastEthernet0', 'S1', 'FastEthernet0/1');
  link(t, 'P20', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  link(t, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1');
  pcSet(t, 'P10', '192.168.10.10', '255.255.255.0', '192.168.10.1');
  pcSet(t, 'P20', '192.168.20.10', '255.255.255.0', '192.168.20.1');
  cli(t, 'S1', ['vlan 10', 'vlan 20', 'int f0/1', 'sw mode access', 'sw access vlan 10', 'int f0/2', 'sw mode access', 'sw access vlan 20', 'int g0/1', 'sw mode trunk']);
  const o = cli(t, 'R1', ['int g0/0', 'no shut', 'int g0/0.10', 'ip address 192.168.10.1 255.255.255.0']);
  has(o, 'Configuring IP routing on a LAN subinterface');
  cli(t, 'R1', ['int g0/0.10', 'encapsulation dot1Q 10', 'ip address 192.168.10.1 255.255.255.0', 'int g0/0.20', 'encap dot1q 20', 'ip add 192.168.20.1 255.255.255.0']);
  eq(reach(t, 'P10', '192.168.20.10'), 'reply');
  eq(reach(t, 'P10', '192.168.10.1'), 'reply');
  cli(t, 'S1', ['int g0/1', 'switchport mode access']);
  eq(reach(t, 'P10', '192.168.20.10'), 'timeout', 'access port to router breaks it');
});

test('DHCP server and relay', () => {
  const t = newTopology();
  addDevice(t, '2960', 0, 0, { id: 'S1' }); addDevice(t, '2911', 0, 0, { id: 'R1' });
  addDevice(t, 'PC', 0, 0, { id: 'PC1' }); addDevice(t, 'PC', 0, 0, { id: 'PC2' });
  link(t, 'PC1', 'FastEthernet0', 'S1', 'FastEthernet0/1');
  link(t, 'PC2', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  link(t, 'R1', 'GigabitEthernet0/0', 'S1', 'GigabitEthernet0/1');
  cli(t, 'R1', ['int g0/0', 'ip add 192.168.1.1 255.255.255.0', 'no shut', 'ip dhcp excluded-address 192.168.1.1 192.168.1.10',
    'ip dhcp pool LAN', 'network 192.168.1.0 255.255.255.0', 'default-router 192.168.1.1', 'dns-server 8.8.8.8']);
  t.devices.PC1.cfg.ipMode = 'dhcp';
  const r = pcDhcpRenew(t, 'PC1');
  eq(r.ok, true);
  eq(t.devices.PC1.cfg.ip, '192.168.1.11');
  eq(t.devices.PC1.cfg.gateway, '192.168.1.1');
  t.devices.PC2.cfg.ipMode = 'dhcp';
  pcDhcpRenew(t, 'PC2');
  eq(t.devices.PC2.cfg.ip, '192.168.1.12');
  eq(reach(t, 'PC1', '192.168.1.12'), 'reply');
  has(iosRunScript(t, 'R1', ['en', 'show ip dhcp binding']).out, '192.168.1.11');
  // relay через второй роутер
  addDevice(t, '2911', 0, 0, { id: 'R2' }); addDevice(t, 'PC', 0, 0, { id: 'PC3' });
  link(t, 'R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/1');
  link(t, 'PC3', 'FastEthernet0', 'R2', 'GigabitEthernet0/0');
  cli(t, 'R1', ['int g0/1', 'ip add 10.1.1.1 255.255.255.252', 'no shut', 'ip route 192.168.2.0 255.255.255.0 10.1.1.2',
    'ip dhcp pool REMOTE', 'network 192.168.2.0 255.255.255.0', 'default-router 192.168.2.1']);
  cli(t, 'R2', ['int g0/1', 'ip add 10.1.1.2 255.255.255.252', 'no shut', 'int g0/0', 'ip add 192.168.2.1 255.255.255.0', 'no shut', 'ip route 0.0.0.0 0.0.0.0 10.1.1.1']);
  t.devices.PC3.cfg.ipMode = 'dhcp';
  eq(pcDhcpRenew(t, 'PC3').ok, false, 'no helper yet');
  ok(t.devices.PC3.cfg.ip.startsWith('169.254.'), 'APIPA');
  cli(t, 'R2', ['int g0/0', 'ip helper-address 10.1.1.1']);
  eq(pcDhcpRenew(t, 'PC3').ok, true);
  eq(t.devices.PC3.cfg.ip, '192.168.2.2');
  eq(reach(t, 'PC3', '192.168.1.11'), 'reply');
  const sh = (dev, cmd) => iosRunScript(t, dev, ['en', cmd]).out;
  has(sh('R2', 'show ip interface g0/0'), 'Helper address is 10.1.1.1');
  has(sh('R2', 'show ip interface g0/1'), 'Helper address is not set');
  has(sh('R2', 'show ip interface g0/2'), 'Internet protocol processing disabled');
  const st = sh('R1', 'show ip dhcp server statistics');
  has(st, 'Address pools        2');
  has(st, 'Automatic bindings   3');
  const cnt = (k) => Number((st.match(new RegExp(k + '\\s+(\\d+)')) || [])[1]);
  ok(cnt('DHCPACK') >= 3 && cnt('DHCPDISCOVER') >= cnt('DHCPOFFER'), 'ACK counter grows, DISCOVER >= OFFER: ' + st);
  // ручной адрес внутри пула — сервер его пропускает и пишет в conflict
  addDevice(t, 'PC', 0, 0, { id: 'PC4' }); addDevice(t, 'PC', 0, 0, { id: 'PC5' });
  link(t, 'PC4', 'FastEthernet0', 'S1', 'FastEthernet0/3');
  link(t, 'PC5', 'FastEthernet0', 'S1', 'FastEthernet0/4');
  pcSet(t, 'PC4', '192.168.1.13', '255.255.255.0', '192.168.1.1');
  t.devices.PC5.cfg.ipMode = 'dhcp';
  pcDhcpRenew(t, 'PC5');
  eq(t.devices.PC5.cfg.ip, '192.168.1.14', 'skips the static .13');
  has(sh('R1', 'show ip dhcp conflict'), '192.168.1.13');
  ok(!sh('R1', 'show ip dhcp conflict').includes('192.168.1.1 '), 'own gateway is not a conflict');
  sh('R1', 'clear ip dhcp conflict *');
  ok(!sh('R1', 'show ip dhcp conflict').includes('192.168.1.13'), 'cleared');
});

test('DNS on the router: ip host, ip name-server, show hosts', () => {
  const t = newTopology();
  routerLan(t);
  cli(t, 'R1', ['int g0/0', 'ip add 192.168.1.1 255.255.255.0', 'no shut', 'int g0/1', 'ip add 192.168.2.1 255.255.255.0', 'no shut']);
  const sh = (cmd) => iosRunScript(t, 'R1', ['en', cmd]).out;
  has(sh('ping srv2'), 'Translating "srv2"...domain server (255.255.255.255)');
  cli(t, 'R1', ['ip name-server 192.168.2.53', 'ip host Server1 192.168.2.10', 'ip domain-name lab.local']);
  const ping = sh('ping server1');
  has(ping, 'Sending 5, 100-byte ICMP Echos to 192.168.2.10');
  ok(ping.includes('!!!'), 'host table name answers: ' + ping);
  has(sh('ping nosuch'), 'Translating "nosuch"...domain server (192.168.2.53)');
  has(sh('ping nosuch'), '% Unrecognized host or address');
  const hosts = sh('show hosts');
  has(hosts, 'Default domain is lab.local');
  has(hosts, 'Name servers are 192.168.2.53');
  has(hosts, 'Server1');
  const run = sh('show running-config');
  has(run, 'ip host Server1 192.168.2.10');
  has(run, 'ip name-server 192.168.2.53');
  cli(t, 'R1', ['no ip domain-lookup']);
  has(sh('show hosts'), 'lookup uses static mappings');
  ok(!sh('ping nosuch').includes('domain server'), 'no DNS query when lookup is off');
  ok(sh('ping Server1').includes('!!!'), 'ip host still works without domain-lookup');
  cli(t, 'R1', ['no ip host server1', 'no ip name-server']);
  ok(!sh('show running-config').includes('ip host'), 'host removed');
  ok(!sh('show running-config').includes('ip name-server'), 'name-server removed');
  has(cli(t, 'R1', ['int g0/1', 'ip address dhcp']), 'not simulated yet');
});

function chain3(t) {
  for (const id of ['R1', 'R2', 'R3']) addDevice(t, '2911', 0, 0, { id });
  for (const id of ['PC1', 'PC3']) addDevice(t, 'PC', 0, 0, { id });
  link(t, 'PC1', 'FastEthernet0', 'R1', 'GigabitEthernet0/0');
  link(t, 'R1', 'GigabitEthernet0/1', 'R2', 'GigabitEthernet0/1');
  link(t, 'R2', 'GigabitEthernet0/2', 'R3', 'GigabitEthernet0/2');
  link(t, 'PC3', 'FastEthernet0', 'R3', 'GigabitEthernet0/0');
  pcSet(t, 'PC1', '172.16.1.10', '255.255.255.0', '172.16.1.1');
  pcSet(t, 'PC3', '172.16.3.10', '255.255.255.0', '172.16.3.1');
  cli(t, 'R1', ['int g0/0', 'ip add 172.16.1.1 255.255.255.0', 'no sh', 'int g0/1', 'ip add 10.0.12.1 255.255.255.0', 'no sh']);
  cli(t, 'R2', ['int g0/1', 'ip add 10.0.12.2 255.255.255.0', 'no sh', 'int g0/2', 'ip add 10.0.23.2 255.255.255.0', 'no sh']);
  cli(t, 'R3', ['int g0/0', 'ip add 172.16.3.1 255.255.255.0', 'no sh', 'int g0/2', 'ip add 10.0.23.3 255.255.255.0', 'no sh']);
}

test('RIP v2 chain', () => {
  const t = newTopology();
  chain3(t);
  eq(reach(t, 'PC1', '172.16.3.10'), 'unreachable');
  for (const r of ['R1', 'R2', 'R3']) cli(t, r, ['router rip', 'version 2', 'no auto-summary', 'network 10.0.0.0', 'network 172.16.0.0']);
  eq(reach(t, 'PC1', '172.16.3.10'), 'reply');
  const rt = iosRunScript(t, 'R1', ['en', 'sh ip ro']).out;
  has(rt, 'R       172.16.3.0/24 [120/2] via 10.0.12.2');
  has(rt, 'R       10.0.23.0/24 [120/1] via 10.0.12.2');
  // версия 1 на R2 ломает приём от v2-соседей
  cli(t, 'R2', ['router rip', 'version 1']);
  eq(reach(t, 'PC1', '172.16.3.10'), 'unreachable', 'version mismatch');
});

test('OSPF chain with router-id and passive', () => {
  const t = newTopology();
  chain3(t);
  cli(t, 'R1', ['router ospf 1', 'router-id 1.1.1.1', 'network 172.16.1.0 0.0.0.255 area 0', 'network 10.0.12.0 0.0.0.255 area 0', 'passive-interface g0/0']);
  const o2 = cli(t, 'R2', ['router ospf 1', 'router-id 2.2.2.2', 'network 10.0.0.0 0.255.255.255 area 0']);
  has(o2, '%OSPF-5-ADJCHG: Process 1, Nbr 1.1.1.1 on GigabitEthernet0/1 from LOADING to FULL, Loading Done');
  cli(t, 'R3', ['router ospf 1', 'router-id 3.3.3.3', 'network 172.16.3.1 0.0.0.0 area 0', 'network 10.0.23.3 0.0.0.0 area 0']);
  eq(reach(t, 'PC1', '172.16.3.10'), 'reply');
  const rt = iosRunScript(t, 'R1', ['en', 'show ip route']).out;
  has(rt, 'O       172.16.3.0/24 [110/3] via 10.0.12.2');
  const nb = iosRunScript(t, 'R2', ['en', 'show ip ospf neighbor']).out;
  has(nb, '1.1.1.1');
  has(nb, '3.3.3.3');
  cli(t, 'R3', ['router ospf 1', 'no network 10.0.23.3 0.0.0.0 area 0', 'network 10.0.23.3 0.0.0.0 area 1']);
  eq(reach(t, 'PC1', '172.16.3.10'), 'unreachable', 'area mismatch');
});

test('switch SVI management', () => {
  const t = newTopology();
  addDevice(t, '2960', 0, 0, { id: 'S1' }); addDevice(t, 'PC', 0, 0, { id: 'PC1' });
  link(t, 'PC1', 'FastEthernet0', 'S1', 'FastEthernet0/5');
  pcSet(t, 'PC1', '192.168.99.10', '255.255.255.0', '192.168.99.1');
  const o = cli(t, 'S1', ['interface vlan 1', 'ip address 192.168.99.2 255.255.255.0', 'no shutdown', 'exit', 'ip default-gateway 192.168.99.1']);
  has(o, 'Vlan1, changed state to up');
  eq(reach(t, 'PC1', '192.168.99.2'), 'reply');
  eq(canReach(t, 'PC1', '192.168.99.2').ttl, 255);
});

test('CLI parser behaviour', () => {
  const t = newTopology();
  addDevice(t, '2911', 0, 0, { id: 'R1' });
  const sess = iosNewSession(t, 'R1');
  let r = iosExec(t, sess, '');
  eq(sess.started, true);
  eq(iosPrompt(t, sess), 'Router>');
  r = iosExec(t, sess, 'conf t');
  has(r.out, "% Invalid input detected at '^' marker.");
  r = iosExec(t, sess, 'foo');
  has(r.out, 'Translating "foo"');
  iosExec(t, sess, 'en');
  eq(iosPrompt(t, sess), 'Router#');
  r = iosExec(t, sess, 'c');
  has(r.out, '% Ambiguous command');
  iosExec(t, sess, 'conf t');
  iosExec(t, sess, 'hostname R1');
  eq(iosPrompt(t, sess), 'R1(config)#');
  r = iosExec(t, sess, 'hostnme X');
  has(r.out, "    ^\n% Invalid input detected");
  iosExec(t, sess, 'int g0/0');
  eq(iosPrompt(t, sess), 'R1(config-if)#');
  r = iosExec(t, sess, 'ip address 10.1.1.1');
  has(r.out, '% Incomplete command.');
  iosExec(t, sess, 'router ospf 1');
  eq(iosPrompt(t, sess), 'R1(config-router)#', 'fallback to global command');
  r = iosExec(t, sess, 'do show ip int brief');
  has(r.out, 'GigabitEthernet0/0     unassigned      YES unset  administratively down down');
  iosExec(t, sess, 'end');
  eq(iosPrompt(t, sess), 'R1#');
  has(iosHelp(t, sess, 'show ip '), 'route');
  has(iosHelp(t, sess, 'sh'), 'show');
  eq(iosComplete(t, sess, 'conf'), 'configure ');
  r = iosExec(t, sess, 'show running-config | include hostname');
  eq(r.out.trim(), 'hostname R1');
  // пароли
  iosExec(t, sess, 'conf t'); iosExec(t, sess, 'enable secret class'); iosExec(t, sess, 'line con 0'); iosExec(t, sess, 'password cisco'); iosExec(t, sess, 'login'); iosExec(t, sess, 'end');
  iosExec(t, sess, 'disable');
  iosExec(t, sess, 'enable');
  ok(sess.pending && sess.pending.kind === 'enable', 'asks password');
  iosExec(t, sess, 'wrong');
  iosExec(t, sess, 'class');
  eq(iosPrompt(t, sess), 'R1#');
  iosExec(t, sess, 'exit');
  eq(sess.started, false);
  r = iosExec(t, sess, '');
  has(r.out, 'User Access Verification');
  iosExec(t, sess, 'cisco');
  eq(iosPrompt(t, sess), 'R1>');
  // service password-encryption
  iosRunScript(t, 'R1', ['en', 'class', 'conf t', 'service password-encryption', 'end']);
  const run = iosRunScript(t, 'R1', ['en', 'class', 'show run']).out;
  has(run, ' password 7 ');
  has(run, 'enable secret 5 $1$');
  // interface range
  addDevice(t, '2960', 0, 0, { id: 'S1' });
  cli(t, 'S1', ['interface range fa0/1 - 4, fa0/10', 'switchport mode access', 'switchport access vlan 30']);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/4'].accessVlan, 30);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/10'].accessVlan, 30);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/5'].accessVlan, 1);
  ok(t.devices.S1.cfg.vlans[30], 'vlan auto-created');
});

test('hub, console cable and power', () => {
  const t = newTopology();
  addDevice(t, 'PT-Hub', 0, 0, { id: 'H1' }); addDevice(t, 'PC', 0, 0, { id: 'A' }); addDevice(t, 'PC', 0, 0, { id: 'B' });
  link(t, 'A', 'FastEthernet0', 'H1', 'Port 0'); link(t, 'B', 'FastEthernet0', 'H1', 'Port 3');
  pcSet(t, 'A', '10.1.1.1', '255.255.255.0'); pcSet(t, 'B', '10.1.1.2', '255.255.255.0');
  eq(reach(t, 'A', '10.1.1.2'), 'reply', 'hub repeats');
  addDevice(t, '2911', 0, 0, { id: 'R1' });
  eq(addLink(t, 'A', 'RS 232', 'R1', 'GigabitEthernet0/0', 'auto').error, 'port-type');
  const r = addLink(t, 'A', 'RS 232', 'R1', 'Console', 'auto');
  eq(r.link.cable, 'console');
  eq(consolePeer(t, 'A').id, 'R1');
  netCommit(t);
  // выключение питания
  t.devices.B.off = true; netCommit(t);
  eq(reach(t, 'A', '10.1.1.2'), 'timeout', 'powered off');
  t.devices.B.off = false; netCommit(t);
  eq(reach(t, 'A', '10.1.1.2'), 'reply');
  ok(!iosRunScript(t, 'R1', ['en', 'show run']).out.includes('interface Console'));
});
