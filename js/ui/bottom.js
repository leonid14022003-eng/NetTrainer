'use strict';
// Нижняя панель: выбор типа устройств (категории/подкатегории) и моделей, строка статуса.

const NA = (label, icon) => ({ na: true, label, icon });
const PALETTE = [
  { id: 'network', label: 'Network Devices', icon: 'i-netdev', key: 'Ctrl+Alt+N', subs: [
    { id: 'routers', label: 'Routers', icon: 'i-router', items: [NA('PT8200', 'i-router'), '4331', '4321', NA('IR8340', 'i-router'), '1941', '2901', '2911', NA('819IOX', 'i-router'), NA('819HGW', 'i-router'), NA('829', 'i-router'), NA('1240', 'i-router'), NA('PT-Router', 'i-router'), NA('PT-Empty', 'i-router'), NA('1841', 'i-router'), NA('2620XM', 'i-router'), NA('2621XM', 'i-router'), NA('2811', 'i-router')] },
    { id: 'switches', label: 'Switches', icon: 'i-switch', items: ['2960', NA('PT-Switch', 'i-switch'), NA('PT-Empty', 'i-switch'), NA('3560-24PS', 'i-switch'), NA('3650-24PS', 'i-switch'), NA('IE 2000', 'i-switch'), NA('PT-Bridge', 'i-switch'), '2950-24', '2950T'] },
    { id: 'hubs', label: 'Hubs', icon: 'i-hub', items: ['PT-Hub', NA('PT-Repeater', 'i-hub'), NA('Coaxial Splitter', 'i-modem')] },
    { id: 'wireless', label: 'Wireless Devices', icon: 'i-ap', items: [NA('Meraki', 'i-ap'), NA('LAP-PT', 'i-ap'), NA('3702i', 'i-ap'), NA('WLC-PT', 'i-ap'), NA('3504', 'i-modem'), NA('2504', 'i-modem'), NA('Home Router', 'i-ap'), NA('AP-PT', 'i-ap'), NA('AP-PT-A', 'i-ap')] },
    { id: 'security', label: 'Security', icon: 'i-firewall', items: [NA('5506', 'i-firewall'), NA('5505', 'i-firewall')] },
    { id: 'wan', label: 'WAN Emulation', icon: 'i-cloud', items: [NA('PT-Cloud', 'i-cloud'), NA('PT-Empty', 'i-cloud'), NA('DSL Modem', 'i-modem'), NA('Cable Modem', 'i-modem')] },
  ] },
  { id: 'end', label: 'End Devices', icon: 'i-enddev', key: 'Ctrl+Alt+V', subs: [
    { id: 'enddev', label: 'End Devices', icon: 'i-pc', items: ['PC', 'Laptop', 'Server', NA('Meraki Server', 'i-server'), NA('Network Controller', 'i-server'), 'Printer', NA('IP Phone', 'i-phone'), NA('VoIP Device', 'i-phone'), NA('Phone', 'i-phone'), NA('TV', 'i-pc'), NA('Wireless Tablet', 'i-laptop'), NA('Smart Device', 'i-phone')] },
    { id: 'home', label: 'Home', icon: 'i-house', items: [NA('Fan', 'i-house'), NA('Lamp', 'i-house'), NA('Door', 'i-house'), NA('Window', 'i-house'), NA('Webcam', 'i-house'), NA('Thermostat', 'i-house')] },
    { id: 'city', label: 'Smart City', icon: 'i-city', items: [NA('Street Lamp', 'i-city'), NA('Siren', 'i-city'), NA('Car', 'i-city'), NA('Solar Panel', 'i-city')] },
    { id: 'industrial', label: 'Industrial', icon: 'i-factory', items: [NA('Pump', 'i-factory'), NA('Valve', 'i-factory'), NA('Conveyor', 'i-factory')] },
    { id: 'grid', label: 'Power Grid', icon: 'i-tower', items: [NA('Battery', 'i-tower'), NA('Wind Turbine', 'i-tower'), NA('Power Meter', 'i-tower')] },
  ] },
  { id: 'components', label: 'Components', icon: 'i-board', key: 'Ctrl+Alt+C', subs: [
    { id: 'boards', label: 'Boards', icon: 'i-board', items: [NA('MCU Board', 'i-board'), NA('SBC Board', 'i-board'), NA('Thing', 'i-board')] },
    { id: 'actuators', label: 'Actuators', icon: 'i-actuator', items: [NA('Servo', 'i-actuator'), NA('LED', 'i-actuator'), NA('Motor', 'i-actuator'), NA('Buzzer', 'i-actuator')] },
    { id: 'sensors', label: 'Sensors', icon: 'i-sensor', items: [NA('Temperature', 'i-sensor'), NA('Motion', 'i-sensor'), NA('Light', 'i-sensor'), NA('Potentiometer', 'i-sensor')] },
  ] },
  { id: 'connections', label: 'Connections', icon: 'i-bolt', key: 'Ctrl+Alt+O', subs: [
    { id: 'conn', label: 'Connections', icon: 'i-bolt', cables: [['auto', 'c-auto', 'Automatically Choose Connection Type'], ['console', 'c-console', 'Console'], ['straight', 'c-straight', 'Copper Straight-Through'], ['cross', 'c-cross', 'Copper Cross-Over'],
      ['fiber', 'c-fiber', 'Fiber', true], ['phone', 'c-phone', 'Phone', true], ['coax', 'c-coax', 'Coaxial', true], ['dce', 'c-dce', 'Serial DCE', true], ['dte', 'c-dte', 'Serial DTE', true], ['octal', 'c-octal', 'Octal', true], ['usb', 'c-usb', 'USB', true]] },
    { id: 'structured', label: 'Structured Cabling', icon: 'i-grid', physicalOnly: true, items: [NA('Patch Panel', 'i-grid'), NA('Wall Mount', 'i-grid'), NA('Patch Panel 2', 'i-grid'), NA('Wall Mount 2', 'i-grid')] },
  ] },
  { id: 'misc', label: 'Miscellaneous', icon: 'i-folder', key: 'Ctrl+Alt+M', subs: [
    { id: 'custom', label: 'Miscellaneous', icon: 'i-folder', items: [NA('1841', 'i-router'), NA('2621XM', 'i-router'), NA('2811', 'i-router'), NA('2960', 'i-switch'), NA('Laptop', 'i-laptop'), NA('PC', 'i-pc')] },
  ] },
  { id: 'multiuser', label: 'Multiuser Connection', icon: 'i-multiuser', key: 'Ctrl+Alt+U', subs: [
    { id: 'remote', label: 'Multiuser Connection', icon: 'i-cloud', items: [NA('Remote Network', 'i-cloud')] },
  ] },
];

const Bottom = {
  cat: 'network', sub: { network: 'routers', end: 'enddev', components: 'boards', connections: 'conn', misc: 'custom', multiuser: 'remote' },

  init() {
    this.el = document.getElementById('bottom');
    this.render();
  },

  render() {
    const types = clear(document.getElementById('devtypes'));
    const cat = PALETTE.find((c) => c.id === this.cat);
    const top = h('div', { class: 'catrow' });
    for (const c of PALETTE) {
      top.appendChild(h('button', { class: 'catbtn' + (c.id === this.cat ? ' on' : ''), title: c.label + '  ' + c.key, html: iconUse(c.icon, 40, 36),
        onclick: () => { this.cat = c.id; this.query = ''; this.render(); }, onmouseenter: () => { this.hoverLabel = c.label; this.updateLabel(); }, onmouseleave: () => { this.hoverLabel = null; this.updateLabel(); } }));
    }
    // Как в Packet Tracer 9: строка поиска между категориями и подкатегориями
    const input = h('input', { class: 'inp', id: 'devsearch', type: 'search', placeholder: 'Search for device', value: this.query || '', autocomplete: 'off', spellcheck: 'false',
      oninput: (e) => { this.query = e.target.value; this.renderModels(); } });
    const search = h('label', { class: 'devsearch', title: 'Search for device (Поиск устройства)' }, h('span', { class: 'dsicon', html: iconUse('t-inspect', 15, 15) }), input);
    const subrow = h('div', { class: 'subrow' });
    for (const s of cat.subs) {
      subrow.appendChild(h('button', { class: 'subbtn' + (s.id === this.sub[this.cat] ? ' on' : ''), title: s.label, html: iconUse(s.icon, 40, 34),
        onclick: () => { this.sub[this.cat] = s.id; this.query = ''; this.render(); }, onmouseenter: () => { this.hoverLabel = s.label; this.updateLabel(); }, onmouseleave: () => { this.hoverLabel = null; this.updateLabel(); } }));
    }
    appendKids(types, [top, search, subrow]);
    this.updateLabel();
    this.renderModels();
  },

  // Имя категории под курсором — в строке статуса (в PT 9 отдельной надписи нет)
  updateLabel() {
    if (this.hoverLabel) this.setStatus('[' + this.hoverLabel + ']');
    else this.updateStatus();
  },

  // Модели всех категорий, чьё имя содержит строку поиска
  searchItems(q) {
    const out = [], seen = new Set();
    q = q.trim().toLowerCase();
    // сначала рабочие модели, потом недоступные — без повторов по имени
    for (const real of [true, false]) for (const c of PALETTE) for (const s of c.subs) for (const it of s.items || []) {
      if ((typeof it === 'string') !== real) continue;
      const label = real ? DEVICE_CATALOG[it].label : it.label;
      if (seen.has(label) || !(label.toLowerCase().includes(q) || (real && DEVICE_CATALOG[it].display.toLowerCase().includes(q)))) continue;
      seen.add(label);
      out.push(it);
    }
    return out;
  },

  renderModels() {
    const box = clear(document.getElementById('devmodels'));
    const cat = PALETTE.find((c) => c.id === this.cat);
    const sub = cat.subs.find((s) => s.id === this.sub[this.cat]);
    const row = h('div', { class: 'modelrow' });
    const query = (this.query || '').trim();
    const items = query ? this.searchItems(query) : sub.items;
    if (query && !items.length) row.appendChild(h('div', { class: 'nomatch' }, 'No devices found (ничего не найдено)'));
    if (sub.cables && !query) {
      for (const [id, icon, name, na] of sub.cables) {
        const b = h('button', { class: 'model cable' + (na ? ' na' : '') + (App.tool === 'cable' && App.cableType === id ? ' on' : ''), title: na ? name + ' — not simulated (пока не поддерживается)' : name, html: iconUse(icon, 38, 38) });
        if (!na) b.addEventListener('click', () => { App.setTool('cable', { cable: id }); this.renderModels(); });
        b.addEventListener('mouseenter', () => this.setStatus(name));
        b.addEventListener('mouseleave', () => this.updateStatus());
        row.appendChild(b);
      }
    } else {
      for (const it of items) {
        if (typeof it === 'object' && it.na) {
          row.appendChild(h('button', { class: 'model na', title: it.label + ' — not simulated in NetTrainer (пока не поддерживается)', html: iconUse(it.icon, 42, 30) + '<span>' + escapeHtml(it.label) + '</span>' }));
          continue;
        }
        const cat2 = DEVICE_CATALOG[it];
        const fake = { model: it, type: cat2.type };
        const b = h('button', { class: 'model' + (App.tool === 'place' && App.placeModel === it ? ' on' : ''), title: cat2.display + ' — ' + cat2.hint.en + ' (' + cat2.hint.ru + ')', draggable: 'true',
          html: iconUse(deviceIconId(fake), 42, 30) + '<span>' + escapeHtml(cat2.label) + '</span>' });
        b.addEventListener('click', (e) => { App.setTool('place', { model: it }); this.renderModels(); if (e.shiftKey) toast('Shift-click on the workspace to place several'); });
        b.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/x-model', it); e.dataTransfer.effectAllowed = 'copy'; });
        b.addEventListener('mouseenter', () => this.setStatus(cat2.display));
        b.addEventListener('mouseleave', () => this.updateStatus());
        row.appendChild(b);
      }
    }
    box.appendChild(row);
    box.appendChild(h('div', { class: 'status', id: 'status' }));
    this.updateStatus();
  },

  setStatus(t) { const s = document.getElementById('status'); if (s) s.textContent = t; },

  updateStatus() {
    let t = '(Select a Device to Drag and Drop to the Workspace)';
    const cat = PALETTE.find((c) => c.id === this.cat);
    const sub = cat && cat.subs.find((s) => s.id === this.sub[this.cat]);
    if (sub && sub.physicalOnly) t = '(These devices are only available in Physical View)';
    if (App.tool === 'place' && App.placeModel) t = DEVICE_CATALOG[App.placeModel].display + '  — click on the workspace (кликните по рабочему полю)';
    if (App.tool === 'cable') t = (CABLE_NAMES[App.cableType] || '') + (Workspace.temp && Workspace.temp.start ? '  — click the second device' : '  — click the first device');
    if (App.tool === 'pdu') t = Workspace.pduSrc ? 'Simple PDU: click the destination device (получатель)' : 'Simple PDU: click the source device (отправитель)';
    if (App.tool === 'delete') t = 'Delete: click a device, cable or note';
    if (App.tool === 'inspect') t = 'Inspect: click a device to see its tables';
    this.setStatus(t);
    if (App.tool !== 'place' && App.tool !== 'cable') $all('#devmodels .model.on').forEach((b) => b.classList.remove('on'));
  },
};
