'use strict';
// Лабы Packet Tracer: serial-линки, виды статических маршрутов, OSPF (DR/BDR, таймеры, bandwidth, ECMP,
// маршрут по умолчанию, router-id), Port Security.

function labCli(topo, id, lines) {
  const sess = iosNewSession(topo, id);
  iosExec(topo, sess, '');
  let out = '';
  for (const l of ['enable'].concat(lines)) out += iosExec(topo, sess, l).out || '';
  return out;
}

// Лаба 2.2.2.4: три роутера цепочкой на serial
function labStaticTopo() {
  const topo = newTopology();
  tAdd(topo, '1941', 'R1', 100, 100); tAdd(topo, '1941', 'R2', 300, 100); tAdd(topo, '1941', 'R3', 500, 100);
  tAdd(topo, 'PC', 'PC1', 100, 300); tAdd(topo, 'PC', 'PC2', 300, 300); tAdd(topo, 'PC', 'PC3', 500, 300);
  tLink(topo, 'R1', 'Serial0/0/0', 'R2', 'Serial0/0/0', 'dce'); tLink(topo, 'R2', 'Serial0/0/1', 'R3', 'Serial0/0/1');
  tLink(topo, 'PC1', 'FastEthernet0', 'R1', 'GigabitEthernet0/0'); tLink(topo, 'PC2', 'FastEthernet0', 'R2', 'GigabitEthernet0/0'); tLink(topo, 'PC3', 'FastEthernet0', 'R3', 'GigabitEthernet0/0');
  tCli(topo, 'R1', ['interface g0/0', 'ip address 172.31.1.1 255.255.255.128', 'no shutdown', 'interface s0/0/0', 'ip address 172.31.1.194 255.255.255.252', 'no shutdown']);
  tCli(topo, 'R2', ['interface g0/0', 'ip address 172.31.0.1 255.255.255.0', 'no shutdown', 'interface s0/0/0', 'ip address 172.31.1.193 255.255.255.252', 'no shutdown', 'interface s0/0/1', 'ip address 172.31.1.197 255.255.255.252', 'no shutdown']);
  tCli(topo, 'R3', ['interface g0/0', 'ip address 172.31.1.129 255.255.255.192', 'no shutdown', 'interface s0/0/1', 'ip address 172.31.1.198 255.255.255.252', 'no shutdown']);
  tPc(topo, 'PC1', '172.31.1.126', '255.255.255.128', '172.31.1.1'); tPc(topo, 'PC2', '172.31.0.254', '255.255.255.0', '172.31.0.1'); tPc(topo, 'PC3', '172.31.1.190', '255.255.255.192', '172.31.1.129');
  netBoot(topo); netCommit(topo);
  return topo;
}

test('serial: cables, ports and point-to-point delivery', () => {
  const topo = newTopology();
  tAdd(topo, '1941', 'A', 0, 0); tAdd(topo, '4331', 'B', 0, 0); tAdd(topo, '2960', 'S', 0, 0);
  ok(topo.devices.A.ports.some((p) => p.name === 'Serial0/0/0') && topo.devices.B.ports.some((p) => p.name === 'Serial0/1/1'), 'routers have serial modules');
  eq(addLink(topo, 'A', 'GigabitEthernet0/0', 'B', 'Serial0/1/0', 'auto').error, 'port-type', 'Ethernet cannot go into a serial port');
  eq(addLink(topo, 'A', 'Serial0/0/0', 'B', 'Serial0/1/0', 'straight').error, 'port-type', 'copper cable does not fit serial');
  const l = addLink(topo, 'A', 'Serial0/0/0', 'B', 'Serial0/1/0', 'dte').link;
  eq(l.cable, 'serial'); eq(l.dce, 'b', 'DTE start: the far end is DCE');
  tCli(topo, 'A', ['interface s0/0/0', 'ip address 10.0.0.1 255.255.255.252', 'no shutdown']);
  tCli(topo, 'B', ['interface s0/1/0', 'ip address 10.0.0.2 255.255.255.252', 'no shutdown']);
  netCommit(topo);
  eq(pingOnce(topo, 'A', ipToInt('10.0.0.2'), { arp: true }).status, 'reply', 'first ping over serial: no ARP, no loss');
  const out = labCli(topo, 'B', ['show interfaces s0/1/0', 'show running-config']);
  ok(/Encapsulation HDLC/.test(out) && /BW 1544 Kbit/.test(out) && /DCE V\.35, clock rate 2000000/.test(out), out);
  ok(/clock rate 2000000/.test(out), 'DCE end shows the clock rate in running-config');
  labCli(topo, 'A', ['conf t', 'interface s0/0/0', 'encapsulation ppp']);
  eq(ifStatus(topo, topo.devices.A, 'Serial0/0/0').protocol, 'down', 'HDLC ↔ PPP: line protocol down');
});

test('static routes: kinds, messages and the 2.2.2.4 lab', () => {
  const topo = labStaticTopo();
  const r2 = labCli(topo, 'R2', ['conf t', 'ip route 172.31.1.0 255.255.255.128 172.31.1.193', 'ip route 172.31.1.0 255.255.255.128 s0/0/0', 'ip route 172.31.1.128 255.255.255.192 s0/0/1']);
  ok(r2.includes("%Invalid next hop address (it's this router)"), 'own address rejected');
  ok(r2.includes('%Default route without gateway'), 'exit-interface warning');
  labCli(topo, 'R1', ['conf t', 'ip route 172.31.0.0 255.255.255.0 172.31.1.193', 'ip route 172.31.1.128 255.255.255.192 172.31.1.193', 'ip route 172.31.1.196 255.255.255.252 172.31.1.193']);
  labCli(topo, 'R3', ['conf t', 'ip route 0.0.0.0 0.0.0.0 s0/0/1']);
  netCommit(topo);
  for (const [a, ip] of [['PC1', '172.31.0.254'], ['PC1', '172.31.1.190'], ['PC2', '172.31.1.190']]) eq(pingOnce(topo, a, ipToInt(ip), {}).status, 'reply', a + ' → ' + ip);
  const r3 = labCli(topo, 'R3', ['show ip route static']);
  ok(/Gateway of last resort is 0\.0\.0\.0 to network 0\.0\.0\.0/.test(r3) && /S\*\s+0\.0\.0\.0\/0 is directly connected, Serial0\/0\/1/.test(r3), r3);
  ok(!/^C /m.test(r3), 'show ip route static has no connected routes');
  const r1 = labCli(topo, 'R1', ['show ip route connected']);
  ok(/C\s+172\.31\.1\.0\/25/.test(r1) && !/^S /m.test(r1), r1);
});

test('OSPF: DR/BDR election is non-preemptive (lab "DR and BDR changing roles")', () => {
  const topo = newTopology();
  tAdd(topo, '2960', 'S1', 0, 0);
  const R = { RA: ['192.168.1.1', '192.168.31.11'], RB: ['192.168.1.2', '192.168.31.22'], RC: ['192.168.1.3', '192.168.31.33'] };
  let i = 1;
  for (const n of Object.keys(R)) { tAdd(topo, '1941', n, 0, 0); tLink(topo, n, 'GigabitEthernet0/0', 'S1', fa(i++)); }
  for (const [n, [ip, rid]] of Object.entries(R)) tCli(topo, n, ['interface g0/0', 'ip address ' + ip + ' 255.255.255.0', 'no shutdown', ...(n === 'RC' ? ['ip ospf priority 2'] : []), 'router ospf 1', 'router-id ' + rid, 'network 192.168.1.0 0.0.0.255 area 0']);
  netBoot(topo); netCommit(topo);
  const roles = () => ['RA', 'RB', 'RC'].map((n) => ospfRole(topo, n, 'GigabitEthernet0/0') || '-').join(' ');
  eq(roles(), 'DROTHER BDR DR', 'start: RC (priority 2) DR, RB (higher RID) BDR');
  const nb = labCli(topo, 'RA', ['show ip ospf neighbor']);
  ok(/192\.168\.31\.33\s+2\s+FULL\/DR/.test(nb) && /192\.168\.31\.22\s+1\s+FULL\/BDR/.test(nb), nb);
  labCli(topo, 'RA', ['debug ip ospf adj']);
  labCli(topo, 'RC', ['conf t', 'interface g0/0', 'shutdown']); eq(roles(), 'BDR DR -', 'DR gone: BDR promoted, new BDR elected');
  ok(netRt(topo).consoles.RA.some((x) => /OSPF: DR\/BDR election/.test(x)), 'debug ip ospf adj shows the election');
  ok(netRt(topo).consoles.RA.some((x) => /Dead timer expired/.test(x)), 'neighbour lost while own interface is up: dead timer expired');
  labCli(topo, 'RC', ['conf t', 'interface g0/0', 'no shutdown']); eq(roles(), 'BDR DR DROTHER', 'RC returns as DROTHER');
  ok(/2WAY\/DROTHER/.test(labCli(topo, 'RC', ['show ip ospf neighbor'])) === false, 'RC is FULL with DR and BDR');
  labCli(topo, 'RB', ['conf t', 'interface g0/0', 'shutdown']); eq(roles(), 'DR - BDR');
  labCli(topo, 'RB', ['conf t', 'interface g0/0', 'no shutdown']); eq(roles(), 'DR DROTHER BDR');
  labCli(topo, 'RA', ['conf t', 'interface g0/0', 'ip ospf priority 200']); labCli(topo, 'RB', ['conf t', 'interface g0/0', 'ip ospf priority 100']); labCli(topo, 'RC', ['conf t', 'interface g0/0', 'ip ospf priority 1']);
  eq(roles(), 'DR DROTHER BDR', 'a new priority alone changes nothing');
  for (const n of ['RA', 'RB', 'RC']) labCli(topo, n, ['clear ip ospf process']);
  eq(roles(), 'DR BDR DROTHER', 'after clearing: RA (200) DR, RB (100) BDR');
  const ifo = labCli(topo, 'RC', ['show ip ospf interface g0/0', 'show ip ospf interface brief']);
  ok(/State DROTHER, Priority 1/.test(ifo) && /Designated Router \(ID\) 192\.168\.31\.11/.test(ifo) && /Gi0\/0\s+1\s+0\s+192\.168\.1\.3\/24\s+1\s+DROTH 2\/2/.test(ifo), ifo);
  // RC и RB — оба DROTHER? Нет: RB BDR. Проверим 2WAY между двумя DROTHER на сегменте из четырёх
  tAdd(topo, '1941', 'RD', 0, 0); tLink(topo, 'RD', 'GigabitEthernet0/0', 'S1', fa(4));
  tCli(topo, 'RD', ['interface g0/0', 'ip address 192.168.1.4 255.255.255.0', 'no shutdown', 'router ospf 1', 'router-id 192.168.31.44', 'network 192.168.1.0 0.0.0.255 area 0']);
  netCommit(topo);
  ok(/192\.168\.31\.33\s+1\s+2WAY\/DROTHER/.test(labCli(topo, 'RD', ['show ip ospf neighbor'])), 'two DROTHERs stay in 2WAY');
});

test('OSPF: timers, bandwidth, ECMP, default route and router-id (labs 2–4)', () => {
  const topo = newTopology();
  for (const n of ['R1', 'R2', 'R3', 'ISP']) tAdd(topo, '1941', n, 0, 0);
  tLink(topo, 'R1', 'Serial0/0/0', 'R2', 'Serial0/0/0', 'dce'); tLink(topo, 'R1', 'Serial0/0/1', 'R3', 'Serial0/0/0', 'dce'); tLink(topo, 'R2', 'Serial0/0/1', 'R3', 'Serial0/0/1', 'dce');
  tLink(topo, 'R2', 'GigabitEthernet0/1', 'ISP', 'GigabitEthernet0/0');
  tCli(topo, 'R1', ['interface s0/0/0', 'ip address 172.16.3.1 255.255.255.252', 'no shutdown', 'interface s0/0/1', 'ip address 192.168.10.5 255.255.255.252', 'no shutdown', 'router ospf 1', 'network 172.16.3.0 0.0.0.3 area 0', 'network 192.168.10.4 0.0.0.3 area 0']);
  tCli(topo, 'R2', ['interface s0/0/0', 'ip address 172.16.3.2 255.255.255.252', 'no shutdown', 'interface s0/0/1', 'ip address 192.168.10.9 255.255.255.252', 'no shutdown', 'interface g0/1', 'ip address 209.165.200.225 255.255.255.224', 'no shutdown',
    'router ospf 1', 'network 172.16.3.0 0.0.0.3 area 0', 'network 192.168.10.8 0.0.0.3 area 0']);
  tCli(topo, 'R3', ['interface s0/0/0', 'ip address 192.168.10.6 255.255.255.252', 'no shutdown', 'interface s0/0/1', 'ip address 192.168.10.10 255.255.255.252', 'no shutdown', 'router ospf 1', 'network 192.168.10.4 0.0.0.3 area 0', 'network 192.168.10.8 0.0.0.3 area 0']);
  tCli(topo, 'ISP', ['interface g0/0', 'ip address 209.165.200.226 255.255.255.224', 'no shutdown']);
  netBoot(topo); netCommit(topo);
  eq(ospfRouterId(topo, topo.devices.R2), '209.165.200.225', 'no router-id, no loopback: highest interface IP');
  const rt1 = labCli(topo, 'R1', ['show ip route ospf', 'show ip ospf neighbor']);
  ok(/192\.168\.10\.8 \[110\/128\] via 172\.16\.3\.2/.test(rt1) && /\[110\/128\] via 192\.168\.10\.6/.test(rt1), 'ECMP: two equal-cost lines\n' + rt1);
  ok(/FULL\/  -/.test(rt1), 'serial neighbours: FULL/  -');
  labCli(topo, 'R2', ['debug ip ospf hello']);
  labCli(topo, 'R1', ['conf t', 'interface s0/0/0', 'ip ospf hello-interval 15', 'ip ospf dead-interval 60']);
  eq(allRoutes(topo).ospfAdj.filter((a) => a.dev === 'R1').length, 1, 'mismatched timers: R1–R2 adjacency gone');
  ok(netRt(topo).consoles.R2.some((x) => /Mismatched hello parameters from 172\.16\.3\.1/.test(x) && /Dead R 60 C 40, Hello R 15 C 10/.test(x)), 'debug shows the mismatch');
  labCli(topo, 'R2', ['conf t', 'interface s0/0/0', 'ip ospf hello-interval 15', 'ip ospf dead-interval 60']);
  eq(allRoutes(topo).ospfAdj.filter((a) => a.dev === 'R1').length, 2, 'same timers: adjacency back');
  labCli(topo, 'R1', ['conf t', 'interface s0/0/0', 'bandwidth 64']);
  eq(ospfCost(topo.devices.R1, 'Serial0/0/0'), 1562);
  const r = routesOf(topo, topo.devices.R1).find((x) => x.net === ipToInt('192.168.10.8'));
  eq(intToIp(r.nextHop), '192.168.10.6', 'after bandwidth 64 R1 goes via R3'); eq(r.metric, 128);
  labCli(topo, 'R2', ['conf t', 'router ospf 1', 'default-information originate']);
  ok(!routesOf(topo, topo.devices.R1).some((x) => x.len === 0), 'without its own default route R2 advertises nothing');
  labCli(topo, 'R2', ['conf t', 'ip route 0.0.0.0 0.0.0.0 209.165.200.226']);
  const def = routesOf(topo, topo.devices.R3).find((x) => x.len === 0);
  ok(def && def.code === 'O*E2' && def.metric === 1, 'O*E2 [110/1] on R3');
  ok(/Type-5 AS External Link States/.test(labCli(topo, 'R3', ['show ip ospf database'])), 'LSA type 5 in the database');
  // router-id при уже поднятых соседях — только после clear ip ospf process
  const msg = labCli(topo, 'R3', ['conf t', 'router ospf 1', 'router-id 3.3.3.3']);
  ok(/Reload or use "clear ip ospf process"/.test(msg), msg);
  eq(ospfRouterId(topo, topo.devices.R3), '192.168.10.10', 'old router ID still in use');
  labCli(topo, 'R3', ['clear ip ospf process']);
  eq(ospfRouterId(topo, topo.devices.R3), '3.3.3.3', 'new router ID after clear');
  ok(/Routing on Interfaces Configured Explicitly/.test((() => { labCli(topo, 'R3', ['conf t', 'interface s0/0/0', 'ip ospf 1 area 0']); return labCli(topo, 'R3', ['show ip protocols']); })()), 'interface-level OSPF in show ip protocols');
});

test('Port Security: learning, violations, err-disabled and recovery', () => {
  const topo = newTopology();
  tAdd(topo, '2960', 'S1', 0, 0); tAdd(topo, 'PT-Hub', 'H1', 0, 0);
  for (const [n, ip] of [['PC1', '10.0.0.1'], ['PC2', '10.0.0.2'], ['ROGUE', '10.0.0.3'], ['SRV', '10.0.0.10']]) { tAdd(topo, 'PC', n, 0, 0); tPc(topo, n, ip, '255.255.255.0'); }
  tLink(topo, 'H1', 'Port 0', 'S1', 'FastEthernet0/1'); tLink(topo, 'PC1', 'FastEthernet0', 'H1', 'Port 1'); tLink(topo, 'PC2', 'FastEthernet0', 'H1', 'Port 2');
  tLink(topo, 'SRV', 'FastEthernet0', 'S1', 'FastEthernet0/24');
  netBoot(topo); netCommit(topo);
  ok(/Command rejected: FastEthernet0\/1 is a dynamic port\./.test(labCli(topo, 'S1', ['conf t', 'interface f0/1', 'switchport port-security'])), 'rejected on a dynamic port');
  labCli(topo, 'S1', ['conf t', 'interface f0/1', 'switchport mode access', 'switchport port-security', 'switchport port-security maximum 2', 'switchport port-security mac-address sticky', 'switchport port-security violation restrict']);
  const ping = (a) => pingOnce(topo, a, ipToInt('10.0.0.10'), {}).status;
  eq(ping('PC1'), 'reply'); eq(ping('PC2'), 'reply');
  const ic = topo.devices.S1.cfg.interfaces.FastEthernet0_1 || topo.devices.S1.cfg.interfaces['FastEthernet0/1'];
  eq(ic.psec.macs.filter((m) => m.sticky).length, 2, 'two sticky MACs learned');
  ok(/switchport port-security mac-address sticky [0-9a-f]{4}\./.test(labCli(topo, 'S1', ['show running-config'])), 'sticky MACs in running-config');
  tLink(topo, 'ROGUE', 'FastEthernet0', 'H1', 'Port 3'); netCommit(topo);
  eq(ping('ROGUE'), 'timeout', 'restrict: the third MAC is dropped'); eq(ping('PC1'), 'reply', 'restrict: allowed devices keep working');
  ok(/Violation Mode\s+: Restrict/.test(labCli(topo, 'S1', ['show port-security interface f0/1'])) && psecRt(topo, 'S1', 'FastEthernet0/1').count === 1, 'one violation counted');
  ok(netRt(topo).consoles.S1.some((x) => /%PORT_SECURITY-2-PSECURE_VIOLATION/.test(x)), 'restrict logs the violation');
  labCli(topo, 'S1', ['conf t', 'interface f0/1', 'switchport port-security violation shutdown', 'end', 'conf t', 'errdisable recovery cause psecure-violation', 'errdisable recovery interval 30']);
  eq(ping('ROGUE'), 'timeout');
  eq(ic.errdis, 'psecure-violation', 'shutdown mode: port err-disabled'); eq(ping('PC1'), 'timeout', 'everything behind the port is cut off');
  ok(/Secure-shutdown/.test(labCli(topo, 'S1', ['show port-security interface f0/1'])) && /Fa0\/1\s+err-disabled/.test(labCli(topo, 'S1', ['show interfaces status'])), 'show commands report err-disabled');
  netAdvance(topo, 31000); netCommit(topo);
  ok(!ic.errdis, 'errdisable recovery brought the port back');
  removeLink(topo, topo.devices.ROGUE.ports[0].link); netCommit(topo);
  labCli(topo, 'S1', ['conf t', 'interface f0/1', 'shutdown', 'no shutdown']);
  eq(ping('PC1'), 'reply', 'after removing the intruder the port works');
  const addr = labCli(topo, 'S1', ['show port-security address']);
  ok((addr.match(/SecureSticky/g) || []).length === 2, addr);
});

test('labs: OSPF lesson generators compute the right answers', () => {
  for (let seed = 1; seed <= 200; seed++) {
    const rng = makeRng(seed);
    const g1 = lessonGet('ensa02').gen.find((g) => g.name === 'genRefBw')(rng);
    const c = Number(g1.q.en.match(/cost (\d+)\./)[1]);
    eq(g1.options[0], (c * 1000) + ' — FE ' + (c * 10), g1.q.en);
    const g2 = lessonGet('ensa02').gen.find((g) => g.name === 'genBwCost')(rng);
    const bw = Number(g2.q.en.match(/"bandwidth (\d+)"/)[1]);
    eq(g2.options[0], String(Math.max(1, Math.floor(100000 / bw))), g2.q.en);
    eq(new Set(g2.options).size, g2.options.length, 'distinct options ' + g2.options.join(','));
  }
  ok(lessonGet('ospf-labs') && coursePartOf('ospf-labs').id === 'extra', 'OSPF lab walkthrough lesson is on the course map');
});
