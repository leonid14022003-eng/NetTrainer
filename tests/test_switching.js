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
  for (const [dev, x] of Object.entries(swState(t).stp[v] || {})) for (const [lp, p] of Object.entries(x.ports)) if (p.sts === 'BLK') out.push(dev + ' ' + lp);
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
