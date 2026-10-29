'use strict';
// STP и EtherChannel: выбор корня, роли портов, блокировка, пучки LACP / PAgP / on, защиты.

// Треугольник S1–S2–S3 (Fa0/1–Fa0/2), у каждого коммутатора ПК на Fa0/10. MAC задаём, чтобы корень был предсказуем.
function triangle(t, macs) {
  for (const [i, id] of ['S1', 'S2', 'S3'].entries()) {
    addDevice(t, '2960', 0, 0, { id, name: id });
    t.devices[id].ports[0].mac = macs[i];
    addDevice(t, 'PC', 0, 0, { id: 'P' + (i + 1) });
    link(t, 'P' + (i + 1), 'FastEthernet0', id, 'FastEthernet0/10');
    pcSet(t, 'P' + (i + 1), '192.168.1.' + (11 + i), '255.255.255.0');
  }
  link(t, 'S1', 'FastEthernet0/1', 'S2', 'FastEthernet0/1');
  link(t, 'S2', 'FastEthernet0/2', 'S3', 'FastEthernet0/2');
  link(t, 'S3', 'FastEthernet0/1', 'S1', 'FastEthernet0/2');
}
const showSw = (t, dev, cmd) => iosRunScript(t, dev, ['en', cmd]).out;
const blockedPorts = (t, v) => {
  const out = [];
  for (const [dev, x] of Object.entries(swState(t).stp[v] || {})) for (const [lp, p] of Object.entries(x.ports)) if (stpSts(swState(t), p) === "BLK") out.push(dev + ' ' + lp);
  return out;
};

test('STP: root by lowest MAC, one blocked port in a triangle, traffic goes around', () => {
  const t = newTopology();
  triangle(t, ['0002.0000.0002', '0001.0000.0001', '0003.0000.0003']);
  eq(stpRootOf(t, 'S1', 1), 'S2', 'lowest MAC wins with equal priority');
  // S1 и S3 — корневые порты к S2; на сегменте S1–S3 назначенный у S1 (меньший Bridge ID), у S3 — Alternate
  eq(blockedPorts(t, 1), ['S3 FastEthernet0/1']);
  eq(stpPortInfo(t, 'S1', 'FastEthernet0/1', 1).role, 'Root');
  eq(stpPortInfo(t, 'S3', 'FastEthernet0/2', 1).role, 'Root');
  eq(stpPortInfo(t, 'S1', 'FastEthernet0/2', 1).role, 'Desg');
  eq(reach(t, 'P1', '192.168.1.13'), 'reply', 'S1 → S3 still works via the root');
  const sh2 = showSw(t, 'S2', 'show spanning-tree');
  has(sh2, 'VLAN0001');
  has(sh2, 'This bridge is the root');
  has(sh2, 'Priority    32769');
  const sh3 = showSw(t, 'S3', 'show spanning-tree vlan 1');
  has(sh3, 'Fa0/1            Altn BLK 19        128.1    P2p');
  has(sh3, 'Cost        19');
  has(sh3, 'Port        2(FastEthernet0/2)');
  has(sh3, 'Fa0/10           Desg FWD 19        128.10   P2p');
  eq(linkEndState(t, t.links[getPort(t.devices.S3, 'FastEthernet0/1').link], { dev: 'S3', port: 'FastEthernet0/1' }), 'blocked', 'amber LED on the blocked end');
});

test('STP: priority and root primary / secondary move the root', () => {
  const t = newTopology();
  triangle(t, ['0002.0000.0002', '0001.0000.0001', '0003.0000.0003']);
  has(cli(t, 'S3', ['spanning-tree vlan 1 priority 5000']), 'increments of 4096');
  cli(t, 'S3', ['spanning-tree vlan 1 priority 4096']);
  eq(stpRootOf(t, 'S1', 1), 'S3');
  has(showSw(t, 'S3', 'show spanning-tree'), 'Priority    4097');
  has(showSw(t, 'S3', 'show running-config'), 'spanning-tree vlan 1 priority 4096');
  // root primary: на 4096 ниже нынешнего корня
  cli(t, 'S1', ['spanning-tree vlan 1 root primary']);
  eq(t.devices.S1.cfg.stpPrio[1], 0);
  eq(stpRootOf(t, 'S2', 1), 'S1');
  cli(t, 'S2', ['spanning-tree vlan 1 root secondary']);
  eq(t.devices.S2.cfg.stpPrio[1], 28672);
  // блокируется сегмент между двумя некорневыми: S2 (28672) назначенный, S3 (4096!) — нет? S3 ниже S2 → назначенный у S3
  eq(blockedPorts(t, 1), ['S2 FastEthernet0/2']);
  cli(t, 'S1', ['no spanning-tree vlan 1 priority']);
  eq(stpRootOf(t, 'S1', 1), 'S3', 'S3 (4096) is root again');
  has(showSw(t, 'S3', 'show spanning-tree summary'), 'Root bridge for: VLAN0001');
});

test('STP: per VLAN (PVST+) — two VLANs, two roots, different blocked ports', () => {
  const t = newTopology();
  triangle(t, ['0002.0000.0002', '0001.0000.0001', '0003.0000.0003']);
  for (const s of ['S1', 'S2', 'S3']) cli(t, s, ['vlan 10', 'vlan 20', 'interface range fa0/1-2', 'switchport mode trunk']);
  cli(t, 'S1', ['spanning-tree vlan 10 root primary']);
  cli(t, 'S3', ['spanning-tree vlan 20 root primary']);
  eq(stpRootOf(t, 'S2', 10), 'S1');
  eq(stpRootOf(t, 'S2', 20), 'S3');
  eq(stpRootOf(t, 'S2', 1), 'S2', 'VLAN 1 keeps the default root');
  ok(JSON.stringify(blockedPorts(t, 10)) !== JSON.stringify(blockedPorts(t, 20)), 'each VLAN blocks its own link');
  eq(blockedPorts(t, 10).length, 1);
  eq(blockedPorts(t, 20).length, 1);
  const tr = showSw(t, 'S2', 'show interfaces trunk');
  has(tr, 'Vlans in spanning tree forwarding state and not pruned');
});

// Два коммутатора, два кабеля Fa0/23 и Fa0/24, по ПК в VLAN 10 на каждом
function pairEc(t) {
  addDevice(t, '2960', 0, 0, { id: 'S1', name: 'S1' }); addDevice(t, '2960', 0, 0, { id: 'S2', name: 'S2' });
  t.devices.S1.ports[0].mac = '0001.0000.0001'; t.devices.S2.ports[0].mac = '0002.0000.0002';
  link(t, 'S1', 'FastEthernet0/23', 'S2', 'FastEthernet0/23');
  link(t, 'S1', 'FastEthernet0/24', 'S2', 'FastEthernet0/24');
  addDevice(t, 'PC', 0, 0, { id: 'A' }); addDevice(t, 'PC', 0, 0, { id: 'B' });
  link(t, 'A', 'FastEthernet0', 'S1', 'FastEthernet0/1'); link(t, 'B', 'FastEthernet0', 'S2', 'FastEthernet0/1');
  pcSet(t, 'A', '10.10.10.1', '255.255.255.0'); pcSet(t, 'B', '10.10.10.2', '255.255.255.0');
  for (const s of ['S1', 'S2']) cli(t, s, ['vlan 10', 'interface fa0/1', 'switchport mode access', 'switchport access vlan 10']);
}

test('EtherChannel: without it STP blocks one link; LACP active/passive bundles both', () => {
  const t = newTopology();
  pairEc(t);
  eq(blockedPorts(t, 1), ['S2 FastEthernet0/24'], 'redundant link blocked');
  has(cli(t, 'S1', ['interface range fa0/23-24', 'channel-group 1 mode active']), 'Creating a port-channel interface Port-channel 1');
  cli(t, 'S2', ['interface range fa0/23 - 24', 'channel-group 1 mode passive']);
  const sum = showSw(t, 'S1', 'show etherchannel summary');
  has(sum, 'Po1(SU)');
  has(sum, 'LACP');
  has(sum, 'Fa0/23(P) Fa0/24(P)');
  eq(blockedPorts(t, 1), [], 'the bundle is one STP port — nothing blocked');
  eq(stpPortInfo(t, 'S2', 'Port-channel1', 1).cost, 12, 'two FastEthernet links: cost 12');
  has(showSw(t, 'S2', 'show spanning-tree'), 'Po1              Root FWD 12        128.65   P2p');
  // trunk на Port-channel переносится на порты пучка
  for (const s of ['S1', 'S2']) cli(t, s, ['interface port-channel 1', 'switchport mode trunk']);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/24'].mode, 'trunk');
  has(showSw(t, 'S1', 'show interfaces trunk'), 'Po1         on');
  eq(reach(t, 'A', '10.10.10.2'), 'reply', 'VLAN 10 crosses the bundle');
  has(showSw(t, 'S1', 'show interfaces port-channel 1'), 'Members in this channel: Fa0/23 Fa0/24');
  const run = showSw(t, 'S1', 'show running-config');
  has(run, 'interface Port-channel1\n switchport mode trunk');
  has(run, ' channel-group 1 mode active');
  ok(run.indexOf('interface Port-channel1') < run.indexOf('interface FastEthernet0/1\n'), 'Port-channel is listed first');
});

test('EtherChannel: mode and config mismatches', () => {
  const t = newTopology();
  pairEc(t);
  cli(t, 'S1', ['interface range fa0/23-24', 'channel-group 1 mode passive']);
  cli(t, 'S2', ['interface range fa0/23-24', 'channel-group 1 mode passive']);
  let sum = showSw(t, 'S1', 'show etherchannel summary');
  has(sum, 'Po1(SD)');
  has(sum, 'Fa0/23(I) Fa0/24(I)');
  eq(blockedPorts(t, 1).length, 1, 'stand-alone ports are separate STP ports');
  cli(t, 'S2', ['interface range fa0/23-24', 'channel-group 1 mode active']);
  has(showSw(t, 'S1', 'show etherchannel summary'), 'Po1(SU)');
  // PAgP в группе LACP — отказ
  has(cli(t, 'S1', ['interface fa0/23', 'channel-group 1 mode desirable']), 'already uses LACP');
  // порт пучка настроен иначе, чем Port-channel → приостановлен (s) с обеих сторон
  cli(t, 'S2', ['interface fa0/24', 'switchport mode access']);
  sum = showSw(t, 'S2', 'show etherchannel summary');
  has(sum, 'Fa0/23(P) Fa0/24(s)');
  has(showSw(t, 'S1', 'show etherchannel summary'), 'Fa0/24(s)');
  eq(reach(t, 'A', '10.10.10.2'), 'timeout', 'VLAN 10 is not allowed: Po is access VLAN 1');
  // PAgP desirable / auto
  const p = newTopology();
  pairEc(p);
  cli(p, 'S1', ['interface range fa0/23-24', 'channel-group 2 mode desirable']);
  cli(p, 'S2', ['interface range fa0/23-24', 'channel-group 2 mode auto']);
  has(showSw(p, 'S2', 'show etherchannel summary'), 'Po2(SU)           PAgP   Fa0/23(P) Fa0/24(P)');
});

test('EtherChannel guard: "on" against a non-channel port goes err-disabled until shutdown / no shutdown', () => {
  const t = newTopology();
  pairEc(t);
  const out = cli(t, 'S1', ['interface range fa0/23-24', 'channel-group 1 mode on']);
  has(out, '%PM-4-ERR_DISABLE: channel-misconfig (STP) error detected on Po1, putting Fa0/23 in err-disable state');
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'channel-misconfig');
  has(showSw(t, 'S1', 'show interfaces fa0/23'), 'line protocol is down (err-disabled)');
  eq(reach(t, 'A', '10.10.10.2'), 'timeout', 'both links are down');
  cli(t, 'S2', ['interface range fa0/23-24', 'channel-group 1 mode on']);
  ok(t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'still err-disabled: needs shutdown / no shutdown');
  cli(t, 'S1', ['interface port-channel 1', 'shutdown', 'no shutdown']);
  ok(!t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'recovered');
  has(showSw(t, 'S1', 'show etherchannel summary'), 'Po1(SU)           -      Fa0/23(P) Fa0/24(P)');
  eq(reach(t, 'A', '10.10.10.2'), 'timeout', 'the bundle is an access port in VLAN 1 — VLAN 10 does not cross it');
  for (const s of ['S1', 'S2']) cli(t, s, ['interface port-channel 1', 'switchport mode trunk']);
  eq(reach(t, 'A', '10.10.10.2'), 'reply');
});

test('BPDU Guard and PortFast', () => {
  const t = newTopology();
  pairEc(t);
  // на порту к ПК — включён и работает
  cli(t, 'S1', ['interface fa0/1', 'spanning-tree portfast', 'spanning-tree bpduguard enable']);
  ok(!t.devices.S1.cfg.interfaces['FastEthernet0/1'].errdis, 'PC sends no BPDUs');
  has(showSw(t, 'S1', 'show spanning-tree vlan 10'), 'P2p Edge');
  // на порту к коммутатору — порт выключается
  const out = cli(t, 'S1', ['interface fa0/23', 'spanning-tree bpduguard enable']);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'bpduguard');
  has(out, '%SPANTREE-2-BLOCK_BPDUGUARD: Received BPDU on port FastEthernet0/23 with BPDU Guard enabled');
  cli(t, 'S1', ['interface fa0/23', 'shutdown', 'no shutdown']);
  eq(t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'bpduguard', 'cause still there — disabled again');
  cli(t, 'S1', ['interface fa0/23', 'no spanning-tree bpduguard', 'shutdown', 'no shutdown']);
  ok(!t.devices.S1.cfg.interfaces['FastEthernet0/23'].errdis, 'up after removing the cause');
  // глобально: BPDU Guard на всех PortFast-портах
  cli(t, 'S2', ['spanning-tree portfast bpduguard default', 'interface fa0/24', 'spanning-tree portfast']);
  eq(t.devices.S2.cfg.interfaces['FastEthernet0/24'].errdis, 'bpduguard');
  has(showSw(t, 'S2', 'show running-config'), 'spanning-tree portfast bpduguard default');
  has(showSw(t, 'S2', 'show spanning-tree summary'), 'PortFast BPDU Guard Default  is enabled');
});

test('STP timers: listening 15 s → learning 15 s → forwarding; PortFast and RSTP are immediate', () => {
  const t = newTopology();
  netRt(t).stpTimers = true;
  addDevice(t, '2960', 0, 0, { id: 'S1', name: 'S1' });
  addDevice(t, 'PC', 0, 0, { id: 'A' }); addDevice(t, 'PC', 0, 0, { id: 'B' });
  link(t, 'A', 'FastEthernet0', 'S1', 'FastEthernet0/1');
  pcSet(t, 'A', '10.0.0.1', '255.255.255.0');
  link(t, 'B', 'FastEthernet0', 'S1', 'FastEthernet0/2');
  pcSet(t, 'B', '10.0.0.2', '255.255.255.0');
  const sts = () => stpSts(swState(t), stpPortInfo(t, 'S1', 'FastEthernet0/2', 1));
  eq(sts(), 'LIS');
  has(showSw(t, 'S1', 'show spanning-tree'), 'Fa0/2            Desg LIS 19');
  eq(reach(t, 'A', '10.0.0.2'), 'timeout', 'no forwarding while listening');
  eq(linkEndState(t, t.links[getPort(t.devices.S1, 'FastEthernet0/2').link], { dev: 'S1', port: 'FastEthernet0/2' }), 'blocked', 'amber LED while converging');
  ok(swNextChange(t) > 14000 && swNextChange(t) <= 15000, 'next change in ~15 s: ' + swNextChange(t));
  netAdvance(t, 16000);
  eq(sts(), 'LRN');
  eq(reach(t, 'A', '10.0.0.2'), 'timeout', 'learning does not forward either');
  netAdvance(t, 15000);
  eq(sts(), 'FWD');
  eq(reach(t, 'A', '10.0.0.2'), 'reply');
  eq(swNextChange(t), null);
  // проверки заданий смотрят на настройку, а не на секунды
  cli(t, 'S1', ['interface fa0/3']);
  addDevice(t, 'PC', 0, 0, { id: 'C' }); link(t, 'C', 'FastEthernet0', 'S1', 'FastEthernet0/3'); pcSet(t, 'C', '10.0.0.3', '255.255.255.0');
  eq(reach(t, 'A', '10.0.0.3'), 'timeout');
  eq(swConverged(t, () => reach(t, 'A', '10.0.0.3')), 'reply');
  swSettle(t);
  eq(reach(t, 'A', '10.0.0.3'), 'reply', 'settled');
  // PortFast — сразу
  cli(t, 'S1', ['interface fa0/4', 'spanning-tree portfast']);
  addDevice(t, 'PC', 0, 0, { id: 'D' }); link(t, 'D', 'FastEthernet0', 'S1', 'FastEthernet0/4'); pcSet(t, 'D', '10.0.0.4', '255.255.255.0');
  eq(reach(t, 'A', '10.0.0.4'), 'reply', 'PortFast port forwards at once');
  // Rapid PVST+ между двумя коммутаторами — сразу, а к ПК без PortFast — тоже 30 с
  addDevice(t, '2960', 0, 0, { id: 'S2', name: 'S2' });
  cli(t, 'S1', ['spanning-tree mode rapid-pvst']); cli(t, 'S2', ['spanning-tree mode rapid-pvst']);
  link(t, 'S1', 'GigabitEthernet0/1', 'S2', 'GigabitEthernet0/1');
  eq(stpSts(swState(t), stpPortInfo(t, 'S1', 'GigabitEthernet0/1', 1)), 'FWD', 'RSTP proposal/agreement');
  addDevice(t, 'PC', 0, 0, { id: 'E' }); link(t, 'E', 'FastEthernet0', 'S2', 'FastEthernet0/1');
  eq(stpSts(swState(t), stpPortInfo(t, 'S2', 'FastEthernet0/1', 1)), 'BLK', 'RSTP discarding to a host without PortFast');
});

test('No STP on a loop = broadcast storm: pings die, MAC flapping, back after spanning-tree vlan', () => {
  const t = newTopology();
  triangle(t, ['0002.0000.0002', '0001.0000.0001', '0003.0000.0003']);
  eq(reach(t, 'P1', '192.168.1.13'), 'reply');
  let out = '';
  for (const s of ['S1', 'S2', 'S3']) out += cli(t, s, ['no spanning-tree vlan 1']);
  eq(swStorm(swState(t), 1).size, 3, 'all three switches are in the storm');
  has(out, '%SW_MATM-4-MACFLAP_NOTIF');
  eq(reach(t, 'P1', '192.168.1.13'), 'timeout');
  eq(reach(t, 'P1', '192.168.1.12'), 'timeout', 'even the direct neighbour is unreachable');
  has(showSw(t, 'S1', 'show spanning-tree vlan 1'), 'does not exist');
  has(showSw(t, 'S1', 'show interfaces fa0/1'), 'broadcasts');
  has(showSw(t, 'S1', 'show running-config'), 'no spanning-tree vlan 1');
  // петли нет — шторма нет, даже без STP
  const l = getPort(t.devices.S3, 'FastEthernet0/1').link;
  removeLink(t, l); netCommit(t);
  eq(swStorm(swState(t), 1).size, 0, 'a tree without loops does not storm');
  eq(reach(t, 'P1', '192.168.1.13'), 'reply');
  link(t, 'S3', 'FastEthernet0/1', 'S1', 'FastEthernet0/2');
  eq(reach(t, 'P1', '192.168.1.13'), 'timeout', 'loop is back');
  for (const s of ['S1', 'S2', 'S3']) cli(t, s, ['spanning-tree vlan 1']);
  eq(swStorm(swState(t), 1).size, 0);
  eq(reach(t, 'P1', '192.168.1.13'), 'reply', 'STP breaks the loop again');
});

test('MST: region, instances, per-instance roots, boundary and pending changes', () => {
  const t = newTopology();
  triangle(t, ['0002.0000.0002', '0001.0000.0001', '0003.0000.0003']);
  for (const s of ['S1', 'S2', 'S3']) cli(t, s, ['vlan 10', 'vlan 20', 'vlan 30', 'interface range fa0/1-2', 'switchport mode trunk']);
  const region = ['spanning-tree mode mst', 'spanning-tree mst configuration', 'name CAMPUS', 'revision 3', 'instance 1 vlan 10, 20', 'instance 2 vlan 30', 'exit'];
  for (const s of ['S1', 'S2', 'S3']) cli(t, s, region);
  has(showSw(t, 'S1', 'show spanning-tree mst configuration'), 'Name      [CAMPUS]');
  has(showSw(t, 'S1', 'show spanning-tree mst configuration'), '1         10,20');
  has(showSw(t, 'S1', 'show spanning-tree mst configuration'), '0         1-9,11-19,21-29,31-4094');
  cli(t, 'S1', ['spanning-tree mst 1 root primary']);
  cli(t, 'S3', ['spanning-tree mst 2 root primary']);
  eq(stpRootOf(t, 'S2', 10), 'S1'); eq(stpRootOf(t, 'S2', 20), 'S1', 'VLANs of one instance share the tree');
  eq(stpRootOf(t, 'S2', 30), 'S3');
  eq(stpRootOf(t, 'S2', 1), 'S2', 'IST (instance 0): default priorities, lowest MAC');
  const sm = showSw(t, 'S1', 'show spanning-tree');
  has(sm, 'MST1');
  has(sm, 'Spanning tree enabled protocol mstp');
  has(sm, 'Priority    24577');
  has(showSw(t, 'S2', 'show spanning-tree mst 1'), '##### MST1    vlans mapped:   10,20');
  eq(stpPortInfo(t, 'S2', 'FastEthernet0/1', 10).cost, 200000, 'MST uses long path costs');
  has(showSw(t, 'S1', 'show running-config'), 'spanning-tree mst configuration\n name CAMPUS\n revision 3\n instance 1 vlan 10, 20');
  // другой регион у S3 (ревизия) — граница, экземпляры не действуют, решает IST
  cli(t, 'S3', ['spanning-tree mst configuration', 'revision 4', 'exit']);
  eq(stpRootOf(t, 'S2', 30), 'S2', 'MSTI 2 does not cross the region border — CIST decides');
  has(showSw(t, 'S1', 'show spanning-tree vlan 30'), 'Bound(RSTP)');
  // abort отменяет, выход глобальной командой — применяет
  cli(t, 'S3', ['spanning-tree mst configuration', 'revision 3', 'abort']);
  eq(t.devices.S3.cfg.mst.rev, 4, 'abort discarded the change');
  cli(t, 'S3', ['spanning-tree mst configuration', 'revision 3', 'hostname S3']);
  eq(t.devices.S3.cfg.mst.rev, 3, 'leaving the submode with a global command applies the changes');
  eq(stpRootOf(t, 'S2', 30), 'S3', 'one region again');
});
