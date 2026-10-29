'use strict';
// Тренажёры: бесконечные сгенерированные вопросы по одному навыку (числа каждый раз новые).

function D(id, icon, en, ru, he, gens) { return { id, icon, title: T(en, ru, he), gens }; }
const DRILLS = [
  D('binary', '🔢', 'Binary & hex conversion', 'Двоичная и hex-система', 'המרות בינארי והקסדצימלי', [['itn05', 'genDecToBin'], ['itn05', 'genBinToDec'], ['itn05', 'genHexToDec'], ['itn05', 'genDecToHex'], ['itn05', 'genHexToBin']]),
  D('subnet', '🧮', 'Subnetting', 'Подсети', 'חלוקה לתת-רשתות', [['itn11', 'genNetwork'], ['itn11', 'genBroadcast'], ['itn11', 'genHosts'], ['itn11', 'genMask'], ['itn11', 'genPrefix'], ['itn11', 'genSameSubnet'], ['itn11', 'genPrefixForHosts'], ['itn11', 'genBorrow']]),
  D('ipv6', '🌐', 'IPv6 addresses', 'IPv6-адреса', 'כתובות IPv6', [['itn12', 'genV6Compress'], ['itn12', 'genV6Expand'], ['itn12', 'genV6Type'], ['srwe08', 'genEui64'], ['srwe08', 'genRaFlags']]),
  D('ports', '🚪', 'Ports & protocols', 'Порты и протоколы', 'פורטים ופרוטוקולים', [['itn14', 'genPortToProto'], ['itn14', 'genProtoToPort'], ['itn14', 'genTcpOrUdp']]),
  D('switching', '🔀', 'Cables, switching & ARP', 'Кабели, коммутация и ARP', 'כבלים, מיתוג ו-ARP', [['itn04', 'genCable'], ['itn07', 'genSwitchForward'], ['itn09', 'genArpTarget'], ['srwe02', 'genDomains'], ['srwe01', 'genSwitchMgmt']]),
  D('routing', '🧭', 'Routing decisions', 'Маршрутизация', 'החלטות ניתוב', [['static', 'genLongestMatch'], ['static', 'genIpRoute'], ['intervlan', 'genSubif'], ['rip', 'genRipNetwork'], ['srwe14', 'genAdWinner'], ['srwe14', 'genRouteEntry'], ['srwe16', 'genNextHop'], ['srwe16', 'genFloatingAd']]),
  D('wildcard', '🎭', 'Wildcards & OSPF', 'Wildcard и OSPF', 'Wildcard ו-OSPF', [['ospf', 'genWildcard'], ['ospf', 'genOspfNetwork'], ['ospf', 'genOspfCost'], ['ensa02', 'genRouterId'], ['ensa02', 'genDrElection'], ['ensa02', 'genRefBwCost']]),
  D('acl', '🚦', 'ACLs', 'ACL', 'ACL', [['ensa04', 'genAclNumber'], ['ensa04', 'genAceMatch'], ['ensa04', 'genAclRange'], ['ensa04', 'genAclPlacement'], ['ensa05', 'genAclFirstMatch'], ['ensa05', 'genAclExtended']]),
  D('nat', '🔁', 'NAT & PAT', 'NAT и PAT', 'NAT ו-PAT', [['ensa06', 'genNatTerm'], ['ensa06', 'genPatTranslate'], ['ensa06', 'genNatPool']]),
  D('ops', '📊', 'WAN, QoS, management & APIs', 'WAN, QoS, управление и API', 'WAN, ‏QoS, ניהול ו-API', [['ensa07', 'genMeshLinks'], ['ensa09', 'genDscp'], ['ensa10', 'genSyslogLevel'], ['ensa10', 'genLoggingTrap'], ['ensa11', 'genOversub'], ['ensa14', 'genHttpStatus'], ['ensa14', 'genRestVerb'], ['ensa14', 'genJsonValue']]),
  D('l2', '🌲', 'STP, EtherChannel & FHRP', 'STP, EtherChannel и FHRP', 'STP, ‏EtherChannel ו-FHRP', [['srwe05', 'genRootBridge'], ['srwe05', 'genRootPort'], ['srwe05', 'genBridgePriority'], ['srwe06', 'genEcMode'], ['srwe06', 'genEcCommand'], ['srwe09', 'genHsrpActive'], ['srwe09', 'genHsrpMac']]),
  D('lansec', '🛡️', 'LAN security & Wi-Fi', 'Безопасность LAN и Wi-Fi', 'אבטחת LAN ו-Wi-Fi', [['srwe10', 'genAttackMitigation'], ['srwe11', 'genPortSecurity'], ['srwe12', 'genWifiChannel'], ['srwe12', 'genWifiStandard']]),
];

function drillGens(drill) {
  const out = [];
  for (const [lid, name] of drill.gens) {
    const l = lessonGet(lid);
    const g = l && (l.gen || []).find((f) => f.name === name);
    if (g) out.push({ lesson: lid, g });
  }
  return out;
}

// 'mixed' — все генераторы курса.
function drillQuestion(drillId, rng) {
  const pool = drillId === 'mixed' ? DRILLS.flatMap(drillGens) : drillGens(DRILLS.find((d) => d.id === drillId));
  const pick = rng.pick(pool);
  return quizPrepare(Object.assign({ lesson: pick.lesson }, pick.g(rng)), rng);
}
