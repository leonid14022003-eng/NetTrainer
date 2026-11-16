'use strict';
// Wi-Fi как в Packet Tracer: беспроводной роутер WRT300N (Internet + Ethernet 1–4 + радио, DHCP-сервер, PAT в Internet),
// точка доступа AccessPoint-PT (мост Port 0 ↔ эфир), беспроводные карты WMP300N (ПК) и WPC300N (ноутбук).
// Клиент подключается, если SSID и защита (WPA2-Personal + пароль) совпадают с точкой; кабеля нет — «линк» в эфире.

DEVICE_CATALOG['WRT300N'] = { type: 'router', home: true, group: 'wireless', label: 'WRT300N', display: 'Linksys-WRT300N', icon: 'wrouter', namePrefix: 'Wireless Router',
  menu: [], ports: ['Internet', 'Ethernet 1', 'Ethernet 2', 'Ethernet 3', 'Ethernet 4'],
  hint: T('Wireless home router: Internet port, 4 LAN ports, Wi-Fi, DHCP server and NAT', 'Беспроводной домашний роутер: порт Internet, 4 порта LAN, Wi-Fi, DHCP-сервер и NAT') };
DEVICE_CATALOG['AccessPoint-PT'] = { type: 'hub', ap: true, cls: 'H', group: 'wireless', label: 'AccessPoint-PT', display: 'AccessPoint-PT', icon: 'ap', namePrefix: 'Access Point',
  menu: [], ports: ['Port 0'], hint: T('Wireless access point: bridges Wi-Fi clients to the wired LAN (Port 0)', 'Точка доступа: соединяет Wi-Fi-клиентов с проводной сетью (Port 0)') };

const WIFI_MODULES = { PC: { wired: 'PT-HOST-NM-1CFE', wireless: 'WMP300N' }, Laptop: { wired: 'PT-LAPTOP-NM-1CFE', wireless: 'WPC300N' } };
const WIFI_SECURITY = { disabled: 'Disabled', wep: 'WEP', wpa: 'WPA-PSK', wpa2: 'WPA2-PSK' };

function isHomeRouter(dev) { const c = dev && DEVICE_CATALOG[dev.model]; return !!(c && c.home); }
function isAccessPoint(dev) { const c = dev && DEVICE_CATALOG[dev.model]; return !!(c && c.ap); }
function homeLanPorts(dev) { return ['Ethernet 1', 'Ethernet 2', 'Ethernet 3', 'Ethernet 4'].filter((p) => getPort(dev, p)); }
function wifiRadioPort(dev) { return isHomeRouter(dev) ? 'Wireless' : isAccessPoint(dev) ? 'Port 1' : null; }
function isWirelessClient(dev) { return !!dev && dev.type === 'pc' && dev.cfg.nic === 'wireless'; }
function wifiApCfg(dev) { return isHomeRouter(dev) ? dev.cfg.home : dev.cfg.wifi; }
function pcIfName(dev) { return isWirelessClient(dev) ? 'Wireless0' : 'FastEthernet0'; }

// ---------- Конфигурации по умолчанию (как у нового устройства в PT) ----------
function defaultHomeCfg(ports) {
  const cfg = defaultRouterCfg([]);
  cfg.hostname = 'Wireless Router';
  cfg.interfaces = { Internet: { ip: null, mask: null, shutdown: false, description: '', helpers: [], dhcp: true } };
  for (const p of ports) if (p !== 'Internet') cfg.interfaces[p] = { shutdown: false, description: '', helpers: [] };
  cfg.interfaces.LAN = { ip: '192.168.0.1', mask: '255.255.255.0', shutdown: false, description: '', helpers: [] };
  cfg.home = { wan: 'dhcp', wanIp: null, wanMask: null, wanGw: null, wanDns: null, dhcpOn: true, dhcpStart: 100, dhcpMax: 50, ssid: 'Default', security: 'disabled', pass: '', channel: 6, broadcast: true, leaseDns: null };
  homeApply(cfg);
  return cfg;
}
function defaultApCfg() { return { wifi: { ssid: 'Default', security: 'disabled', pass: '', channel: 6, broadcast: true }, port0On: true }; }

// Пересчитать то, что вытекает из настроек GUI: DHCP-пул LAN, исключения вне диапазона, маршрут по умолчанию для Static IP
function homeApply(cfg) {
  const h = cfg.home, lan = cfg.interfaces.LAN;
  const len = maskToLen(lan.mask), net = netOf(ipToInt(lan.ip), len), bc = broadcastOf(net, len);
  cfg.dhcpPools = {};
  cfg.dhcpExcluded = [];
  if (h.dhcpOn) {
    cfg.dhcpPools.LAN = { network: intToIp(net), mask: lan.mask, defaultRouter: lan.ip, dns: h.staticDns || h.wanDns || h.leaseDns || null, domainName: null };
    const s = ((net & 0xffffff00) >>> 0) + h.dhcpStart, e = Math.min(bc - 1, s + h.dhcpMax - 1);
    if (s > net + 1) cfg.dhcpExcluded.push({ start: intToIp(net + 1), end: intToIp(s - 1) });
    if (e < bc - 1) cfg.dhcpExcluded.push({ start: intToIp(e + 1), end: intToIp(bc - 1) });
  }
  const wan = cfg.interfaces.Internet;
  if (h.wan === 'static') {
    wan.dhcp = false;
    wan.ip = h.wanIp; wan.mask = h.wanMask;
    cfg.staticRoutes = h.wanGw ? [{ net: '0.0.0.0', mask: '0.0.0.0', nextHop: h.wanGw, exitIf: null, ad: null }] : [];
  } else if (!wan.dhcp) {
    wan.dhcp = true; wan.ip = null; wan.mask = null; cfg.staticRoutes = [];
  }
}

// Порт Internet в режиме DHCP получает адрес у провайдера (повторяет попытку, пока не получит; теряет при обрыве)
function homeWanDhcp(topo, d) {
  const ic = d.cfg.interfaces.Internet;
  if (!ic || !ic.dhcp) return;
  if (!portPhysUp(topo, d.id, 'Internet') || d.off) {
    if (ic.ip) { ic.ip = null; ic.mask = null; d.cfg.staticRoutes = []; d.cfg.home.leaseDns = null; homeApply(d.cfg); touch(topo); }
    return;
  }
  if (ic.ip && d.cfg.staticRoutes.length) return;
  // без шлюза в аренде — продлеваем её, как клиент на T1: вдруг на сервере уже появился default-router
  const r = dhcpObtain(topo, d.id, 'Internet', getPort(d, 'Internet').mac);
  if (!r.ok || (ic.ip === r.ip && !r.gateway)) return;
  ic.ip = r.ip; ic.mask = r.mask;
  d.cfg.staticRoutes = r.gateway ? [{ net: '0.0.0.0', mask: '0.0.0.0', nextHop: r.gateway, exitIf: null, ad: null }] : [];
  d.cfg.home.leaseDns = r.dns || null;
  homeApply(d.cfg);
  touch(topo);
}

// ---------- Ассоциации клиентов с точками доступа ----------
function wifiSecOk(ap, cl) {
  const as = ap.security || 'disabled', cs = cl.security || 'disabled';
  if (as !== cs) return false;
  return as === 'disabled' || (!!ap.pass && cl.pass === ap.pass);
}
function wifiAssoc(topo) {
  const rt = netRt(topo);
  if (rt.wifiCache && rt.wifiCache.rev === topo.rev) return rt.wifiCache;
  const aps = Object.values(topo.devices).filter((d) => wifiRadioPort(d) && !d.off && wifiApCfg(d).radioOn !== false).sort((a, b) => (a.id < b.id ? -1 : 1));
  const res = { rev: topo.rev, apOf: {}, clients: {} };
  for (const c of Object.values(topo.devices)) {
    if (!isWirelessClient(c) || c.off || c.cfg.portOn === false) continue;
    const w = c.cfg.wifi || {};
    const ap = aps.find((a) => { const ac = wifiApCfg(a); return ac && ac.ssid === w.ssid && wifiSecOk(ac, w); });
    if (!ap) continue;
    res.apOf[c.id] = ap.id;
    (res.clients[ap.id] = res.clients[ap.id] || []).push(c.id);
  }
  rt.wifiCache = res;
  return res;
}
function wifiApOf(topo, pcId) { return wifiAssoc(topo).apOf[pcId] || null; }
function pcNicUp(topo, pc) {
  if (pc.off) return false;
  if (isWirelessClient(pc)) return !!wifiApOf(topo, pc.id);
  return portPhysUp(topo, pc.id, 'FastEthernet0');
}

// Куда уходит кадр, отправленный в порт: соседи по кабелю или по эфиру — [{dev, port, link: {id}}]
function l2Next(topo, devId, port) {
  const dev = topo.devices[devId];
  if (!dev) return [];
  const radio = wifiRadioPort(dev);
  if (radio && port === radio) {
    if (dev.off) return [];
    return (wifiAssoc(topo).clients[devId] || []).map((cid) => ({ dev: cid, port: 'FastEthernet0', link: { id: 'w:' + devId + ':' + cid } }));
  }
  if (isWirelessClient(dev)) {
    const ap = wifiApOf(topo, devId);
    if (!ap) return [];
    return [{ dev: ap, port: wifiRadioPort(topo.devices[ap]), link: { id: 'w:' + ap + ':' + devId } }];
  }
  if (!portPhysUp(topo, devId, port)) return [];
  const p = linkPeer(topo, devId, port);
  return p ? [p] : [];
}

// Список сетей для PC Wireless → Connect: сеть видна, если вещает SSID
function wifiScan(topo, pcId) {
  const out = [];
  for (const d of Object.values(topo.devices)) {
    if (!wifiRadioPort(d) || d.off) continue;
    const c = wifiApCfg(d);
    if (!c || c.broadcast === false || c.radioOn === false) continue;
    out.push({ apId: d.id, ssid: c.ssid, ch: c.channel || 6, security: c.security || 'disabled', signal: 80 + (d.id.length % 3) * 5 });
  }
  return out.sort((a, b) => (a.ssid < b.ssid ? -1 : a.ssid > b.ssid ? 1 : 0));
}

// Замена модуля в ПК / ноутбуке (как перетаскивание модуля на вкладке Physical). Только при выключенном питании.
function wifiInstallModule(topo, devId, module) {
  const d = topo.devices[devId];
  const mods = WIFI_MODULES[d.model];
  if (!mods || (module !== mods.wired && module !== mods.wireless)) return { error: 'module' };
  if (!d.off) return { error: 'power' };
  const wireless = module === mods.wireless;
  if (wireless === isWirelessClient(d)) return { ok: true, same: true };
  const p = getPort(d, 'FastEthernet0');
  if (p && p.link) removeLink(topo, p.link);
  d.cfg.nic = wireless ? 'wireless' : 'wired';
  if (wireless && !d.cfg.wifi) d.cfg.wifi = { ssid: 'Default', security: 'disabled', pass: '' };
  return { ok: true };
}
