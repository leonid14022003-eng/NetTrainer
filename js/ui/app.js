'use strict';
// Главный модуль интерфейса: состояние, разметка, меню, панели, сохранение, undo/redo.

const App = {
  prefs: { en: true, ru: true, he: true, portLabels: true, modelLabels: true, theme: 'light', cliHints: true },
  view: 'logical',
  sandbox: null,
  training: null, // {task, topo, result}
  tool: 'select',
  placeModel: null,
  cableType: null,
  mode: 'realtime',
  vp: { logical: { x: 0, y: 0, z: 1 }, training: { x: 0, y: 0, z: 1 }, physical: { x: 0, y: 0, z: 1 } },
  undoStacks: { sandbox: [], training: [], example: [] },
  redoStacks: { sandbox: [], training: [], example: [] },
  startTime: Date.now(),
  renderQueued: false,

  topo() {
    if (this.view === 'training' && Training.example) return Training.example.topo; // похожий пример
    return this.view === 'training' && this.training ? this.training.topo : this.sandbox;
  },
  topoKey() { return this.view === 'training' ? (Training.example ? 'example' : 'training') : 'sandbox'; },
  vpCur() { return this.vp[this.view === 'learn' ? 'logical' : this.view]; },

  changed(opts = {}) {
    if (!opts.noCommit) netCommit(this.topo());
    this.queueRender();
    this.queueSave();
  },
  queueRender() {
    if (this.renderQueued) return;
    this.renderQueued = true;
    requestAnimationFrame(() => { this.renderQueued = false; this.render(); });
  },
  render() {
    this.updateToolbar();
    if (this.view === 'physical') Physical.render(); else if (this.view !== 'learn') Workspace.render();
    DevWin.refreshAll();
    Sim.renderPduList();
  },
  _saveTimer: null,
  queueSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => this.saveNow(), 500);
  },
  saveNow() {
    Store.set('sandbox', JSON.parse(JSON.stringify(this.sandbox)));
    if (this.training) Store.set('training', { templateId: this.training.task.templateId, seed: this.training.task.seed, topo: JSON.parse(JSON.stringify(this.training.topo)) });
    Store.set('prefs', this.prefs);
  },

  // --- undo/redo (снимки топологии перед действием в рабочей области) ---
  checkpoint() {
    const k = this.topoKey();
    this.undoStacks[k].push(JSON.stringify(this.topo()));
    if (this.undoStacks[k].length > 60) this.undoStacks[k].shift();
    this.redoStacks[k] = [];
    this.updateToolbar();
  },
  undo() {
    const k = this.topoKey();
    const s = this.undoStacks[k].pop();
    if (!s) { toast('Nothing to undo / Нечего отменять'); return; }
    this.redoStacks[k].push(JSON.stringify(this.topo()));
    restoreTopoInPlace(this.topo(), s);
    if (Workspace.selected && !this.topo().devices[Workspace.selected]) Workspace.selected = null;
    this.changed();
    this.updateToolbar();
  },
  redo() {
    const k = this.topoKey();
    const s = this.redoStacks[k].pop();
    if (!s) return;
    this.undoStacks[k].push(JSON.stringify(this.topo()));
    restoreTopoInPlace(this.topo(), s);
    if (Workspace.selected && !this.topo().devices[Workspace.selected]) Workspace.selected = null;
    this.changed();
    this.updateToolbar();
  },

  // Кнопки, которым сейчас нечего делать, серые — с подсказкой, что нужно сделать сначала.
  updateToolbar() {
    const sel = Workspace.selectedDevice();
    const k = this.topoKey();
    const set = (act, disabled, title) => {
      const b = document.querySelector('.tb[data-act="' + act + '"]');
      if (!b) return;
      b.disabled = !!disabled;
      b.title = title || b.dataset.baseTitle;
    };
    set('copy', !sel, sel ? 'Copy ' + sel.name + ' (Копировать)' : 'Copy — first click a device to select it (сначала выделите устройство)');
    set('paste', !Workspace.clipboard, Workspace.clipboard ? 'Paste a copy (Вставить копию)' : 'Paste — copy a device first (сначала скопируйте устройство)');
    set('undo', !this.undoStacks[k].length, this.undoStacks[k].length ? 'Undo (Отменить)' : 'Undo — nothing to undo yet (пока нечего отменять)');
    set('redo', !this.redoStacks[k].length, this.redoStacks[k].length ? 'Redo (Повторить)' : 'Redo — nothing to redo (нечего повторять)');
    set('delete', false, sel ? 'Delete ' + sel.name + ' (Удалить выделенное)' : 'Delete tool — then click a device, cable or note (Режим удаления)');
  },

  // Подсказка поверх рабочей области: что делать в текущем режиме.
  updateHint() {
    const el = document.getElementById('stagehint');
    if (!el) return;
    const t = this.tool, W = Workspace;
    const H = {
      place: ['Click on the workspace to place ' + (this.placeModel || 'the device'), 'Кликните по рабочей области, чтобы поставить устройство'],
      cable: W.temp && W.temp.start ? ['Now click the second device and choose its port', 'Теперь кликните по второму устройству и выберите порт'] : ['Click the first device and choose a port', 'Кликните по первому устройству и выберите порт'],
      delete: ['Click a device, cable or note to delete it', 'Кликните по устройству, кабелю или заметке, чтобы удалить'],
      inspect: ['Click a device to see its tables (MAC, ARP, routing)', 'Кликните по устройству, чтобы увидеть его таблицы'],
      note: ['Click where the note should go', 'Кликните, где поставить заметку'],
      line: ['Drag on the workspace to draw a line', 'Тяните мышью, чтобы нарисовать линию'],
      rect: ['Drag on the workspace to draw a rectangle', 'Тяните мышью, чтобы нарисовать прямоугольник'],
      ellipse: ['Drag on the workspace to draw an ellipse', 'Тяните мышью, чтобы нарисовать эллипс'],
      freeform: ['Drag to draw freehand', 'Рисуйте мышью'],
      resize: ['Drag a rectangle or ellipse to resize it', 'Тяните прямоугольник или эллипс, чтобы изменить размер'],
      pdu: W.pduSrc ? ['Now click the destination device', 'Теперь кликните по получателю'] : ['Click the device that sends the packet', 'Кликните по устройству-отправителю'],
    }[t];
    const show = H && (this.view === 'logical' || this.view === 'training');
    el.hidden = !show;
    if (!show) return;
    clear(el);
    appendKids(el, [h('span', null, H[0]), h('span', { class: 'ru' }, ' · ' + H[1]), h('button', { class: 'btn sm', onclick: () => App.setTool('select') }, 'Done (Esc)')]);
  },

  setTool(tool, extra = {}) {
    this.tool = tool;
    this.placeModel = extra.model || null;
    this.cableType = extra.cable || null;
    Workspace.cancelTemp();
    $all('#toolbar2 .tb').forEach((b) => b.classList.toggle('on', b.dataset.tool === tool));
    document.getElementById('stage').dataset.tool = tool;
    Bottom.updateStatus();
    this.updateHint();
  },

  setView(view) {
    if (view === 'training' && !this.training) Training.ensureTask();
    this.view = view;
    $all('#viewbar .vtab').forEach((b) => b.classList.toggle('on', b.dataset.view === view));
    document.getElementById('ws').style.display = view === 'physical' || view === 'learn' ? 'none' : '';
    document.getElementById('phys').style.display = view === 'physical' ? '' : 'none';
    document.getElementById('physbar').style.display = view === 'physical' ? '' : 'none';
    document.getElementById('learn').style.display = view === 'learn' ? '' : 'none';
    document.body.classList.toggle('learnview', view === 'learn');
    this.setTool('select');
    Side.update();
    if (view === 'learn') Learn.render();
    DemoUI.render();
    this.queueRender();
  },

  setMode(mode) {
    this.mode = mode;
    $all('#timebar .mode').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    if (mode === 'realtime') Sim.stop();
    Side.update();
    this.queueRender();
  },

  zoom(f) {
    const v = this.vpCur();
    if (f === 0) { v.z = 1; v.x = 0; v.y = 0; } else v.z = Math.max(0.3, Math.min(3, v.z * f));
    this.queueRender();
  },
};

function restoreTopoInPlace(topo, json) {
  const o = JSON.parse(json);
  for (const k of Object.keys(topo)) delete topo[k];
  Object.assign(topo, o);
  touch(topo);
}

function loadTopo(obj) {
  const t = newTopology();
  if (obj && obj.devices) Object.assign(t, obj);
  touch(t);
  netCommit(t);
  return t;
}

// ---------- Боковая панель (Training / Simulation) ----------
const Side = {
  update() {
    const side = document.getElementById('side');
    const showTrain = App.view === 'training';
    const showSim = App.mode === 'simulation' && App.view !== 'learn';
    side.style.display = showTrain || showSim ? '' : 'none';
    document.getElementById('trainpanel').style.display = showTrain ? '' : 'none';
    document.getElementById('simpanel').style.display = showSim ? '' : 'none';
    side.classList.toggle('both', showTrain && showSim);
    if (showTrain) Training.render();
    if (showSim) Sim.renderPanel();
  },
};

// ---------- Меню ----------
const MENUS = {
  File: () => [
    { label: 'New', right: '⌘N', action: () => fileNew() },
    { label: 'Open...', right: '⌘O', action: () => fileOpen() },
    { sep: true },
    { label: 'Save', right: '⌘S', action: () => fileSave() },
    { label: 'Save picture of the network…', action: () => exportPicture() },
    { label: 'Export / import progress (Learn, Training)…', action: () => progressDialog() },
    { sep: true },
    { label: 'Export solution text (training)', disabled: !App.training, action: () => Training.showSolution(true) },
  ],
  Edit: () => [
    { label: 'Undo', right: '⌘Z', disabled: !App.undoStacks[App.topoKey()].length, action: () => App.undo() },
    { label: 'Redo', right: '⇧⌘Z', disabled: !App.redoStacks[App.topoKey()].length, action: () => App.redo() },
    { sep: true },
    { label: 'Copy device', right: '⌘C', disabled: !Workspace.selectedDevice(), action: () => Workspace.copySelected() },
    { label: 'Paste device', right: '⌘V', disabled: !Workspace.clipboard, action: () => Workspace.paste() },
    { label: 'Delete selected device', right: 'Del', disabled: !Workspace.selectedDevice(), action: () => Workspace.deleteSelected() },
    { sep: true },
    { label: 'Clear the whole workspace…', action: () => fileNew() },
  ],
  Options: () => [
    { label: 'Always Show Port Labels in Logical Workspace', checked: App.prefs.portLabels, action: () => { App.prefs.portLabels = !App.prefs.portLabels; App.queueRender(); App.queueSave(); } },
    { label: 'Show Device Model Labels', checked: App.prefs.modelLabels, action: () => { App.prefs.modelLabels = !App.prefs.modelLabels; App.queueRender(); App.queueSave(); } },
    { label: 'Show English (Training / Learn)', checked: App.prefs.en !== false, action: () => { App.prefs.en = App.prefs.en === false; Side.update(); App.queueSave(); } },
    { label: 'Show Russian translation', checked: App.prefs.ru, action: () => { App.prefs.ru = !App.prefs.ru; Side.update(); App.queueSave(); } },
    { label: 'Show Hebrew translation — עברית', checked: App.prefs.he, action: () => { App.prefs.he = !App.prefs.he; Side.update(); App.queueSave(); } },
    { label: 'CLI hints under the console — подсказки в CLI', checked: App.prefs.cliHints !== false, action: () => { App.prefs.cliHints = App.prefs.cliHints === false; App.queueSave(); for (const m of [App.sandbox, App.training && App.training.topo]) { const map = m && Terminal.states.get(m); if (map) for (const st of map.values()) Terminal.notify(st); } } },
    { sep: true },
    { label: 'Theme: Packet Tracer (light)', checked: App.prefs.theme === 'light', action: () => setTheme('light') },
    { label: 'Theme: Auto (as the system / как в системе)', checked: App.prefs.theme === 'auto', action: () => setTheme('auto') },
    { label: 'Theme: Dark', checked: App.prefs.theme === 'dark', action: () => setTheme('dark') },
  ],
  View: () => [
    { label: 'Zoom In', action: () => App.zoom(1.2) },
    { label: 'Reset Zoom', action: () => App.zoom(0) },
    { label: 'Zoom Out', action: () => App.zoom(1 / 1.2) },
    { label: 'View the entire workspace', action: () => Workspace.fit() },
    { label: 'Drawing Palette…', action: () => Workspace.paletteDialog() },
    { sep: true },
    { label: 'Logical', checked: App.view === 'logical', action: () => App.setView('logical') },
    { label: 'Physical', checked: App.view === 'physical', action: () => App.setView('physical') },
    { label: 'Training', checked: App.view === 'training', action: () => App.setView('training') },
    { label: 'Learn', checked: App.view === 'learn', action: () => App.setView('learn') },
  ],
  Tools: () => [
    { label: 'Clear ARP tables on all devices', action: () => { const rt = netRt(App.topo()); rt.arp = {}; toast('ARP tables cleared'); } },
    { label: 'Power Cycle Devices', action: () => powerCycleAll() },
    { label: 'Command Log', action: () => showCommandLog() },
  ],
  Extensions: () => [
    { label: 'Training: open', action: () => App.setView('training') },
    { label: 'Training: new random task', action: () => { App.setView('training'); Training.newTask(); } },
    { sep: true },
    { label: 'Learn: lessons', action: () => App.setView('learn') },
    { label: 'Learn: final test', action: () => { App.setView('learn'); Learn.open('final'); } },
  ],
  Window: () => [
    { label: 'Close all device windows', action: () => DevWin.closeAll() },
  ],
  Help: () => [
    { label: 'Quick guide (Русский)', action: () => showGuide() },
    { label: 'Keyboard shortcuts', action: () => showShortcuts() },
    { label: 'About NetTrainer', action: () => dialog({ title: 'About NetTrainer', body: h('div', null, h('p', null, 'NetTrainer — a network simulator for CCNA practice, inspired by the Packet Tracer workflow.'), h('p', null, 'Not affiliated with Cisco. IOS commands are emulated for training purposes.')) }) },
  ],
};

function buildMenubar() {
  const bar = document.getElementById('menubar');
  for (const name of Object.keys(MENUS)) {
    const m = h('span', { class: 'menu' }, name);
    m.addEventListener('mousedown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = m.getBoundingClientRect();
      showMenu(MENUS[name](), r.left, r.bottom, { cls: 'dropdown' });
    });
    bar.appendChild(m);
  }
  bar.appendChild(h('span', { class: 'brand' }, 'NetTrainer'));
}

function tbBtn(icon, title, action, extra = {}) {
  const ds = {};
  if (extra.tool) ds.tool = extra.tool;
  if (extra.act) ds.act = extra.act;
  return h('button', { class: 'tb' + (extra.cls ? ' ' + extra.cls : ''), title, dataset: ds, 'data-base-title': title, onclick: action, html: iconUse(icon, 28, 28) });
}
// Кнопки Packet Tracer, у которых в NetTrainer нет аналога: показываем, что это за окно
function ptOnly(name, ru) { toast(name + ' — only in Cisco Packet Tracer (' + ru + ' — есть только в Packet Tracer)'); }
function tbSep() { return h('span', { class: 'tbsep' }); }

function buildToolbars() {
  const t1 = document.getElementById('toolbar1');
  appendKids(t1, [
    tbBtn('t-new', 'New (Создать)', () => fileNew()),
    tbBtn('t-open', 'Open (Открыть)', () => fileOpen()),
    tbBtn('t-save', 'Save (Сохранить)', () => fileSave()),
    tbBtn('t-print', 'Picture of the network — instead of Print (Картинка схемы вместо печати)', () => exportPicture()),
    tbBtn('t-info', 'Network Information (Описание сети)', () => showNetInfo()),
    tbBtn('t-user', 'User Profile (Профиль пользователя)', () => showUserProfile()),
    tbBtn('t-wizard', 'Activity Wizard — training tasks (Задания: тренировка)', () => App.setView('training')),
    tbSep(),
    tbBtn('t-copy', 'Copy (Копировать устройство)', () => Workspace.copySelected(), { act: 'copy' }),
    tbBtn('t-paste', 'Paste (Вставить)', () => Workspace.paste(), { act: 'paste' }),
    tbBtn('t-undo', 'Undo (Отменить)', () => App.undo(), { act: 'undo' }),
    tbBtn('t-redo', 'Redo (Повторить)', () => App.redo(), { act: 'redo' }),
    tbSep(),
    tbBtn('t-zoomin', 'Zoom In (Увеличить)', () => App.zoom(1.2)),
    tbBtn('t-zoomreset', 'Zoom Reset (Сбросить масштаб)', () => App.zoom(0)),
    tbBtn('t-zoomout', 'Zoom Out (Уменьшить)', () => App.zoom(1 / 1.2)),
    tbBtn('t-palette', 'View the entire workspace (Показать всю схему)', () => Workspace.fit()),
    tbBtn('t-devices', 'Device list (Список устройств)', () => showDeviceList()),
    tbSep(),
    tbBtn('t-log', 'View all commands entered in this file (Журнал команд IOS)', () => showCommandLog()),
    tbBtn('t-custom', 'Custom Devices Dialog (Свои устройства)', () => ptOnly('Custom Devices Dialog', 'Свои устройства')),
    tbBtn('t-cluster', 'Cluster Associations Dialog (Кластеры)', () => ptOnly('Cluster Associations Dialog', 'Связи кластеров')),
    h('span', { class: 'grow' }),
    tbBtn('t-help', 'Help (Справка)', () => showGuide()),
  ]);
  const t2 = document.getElementById('toolbar2');
  appendKids(t2, [
    tbBtn('t-select', 'Select (Esc) — Выбор', () => App.setTool('select'), { tool: 'select' }),
    tbBtn('t-inspect', 'Inspect (I) — Осмотр таблиц', () => App.setTool('inspect'), { tool: 'inspect' }),
    tbBtn('t-delete', 'Delete (Del) — Удаление', () => (Workspace.selectedDevice() ? Workspace.deleteSelected() : App.setTool('delete')), { tool: 'delete', act: 'delete' }),
    tbBtn('t-resize', 'Resize Shape — Изменить размер фигуры', () => App.setTool('resize'), { tool: 'resize' }),
    tbSep(),
    tbBtn('t-note', 'Place Note (N) — Заметка', () => App.setTool('note'), { tool: 'note' }),
    tbBtn('t-line', 'Draw Line — Линия', () => App.setTool('line'), { tool: 'line' }),
    tbBtn('t-rect', 'Draw Rectangle — Прямоугольник', () => App.setTool('rect'), { tool: 'rect' }),
    tbBtn('t-ellipse', 'Draw Ellipse — Эллипс', () => App.setTool('ellipse'), { tool: 'ellipse' }),
    tbBtn('t-freeform', 'Draw Freeform — Карандаш', () => App.setTool('freeform'), { tool: 'freeform' }),
    tbSep(),
    tbBtn('t-pdu', 'Add Simple PDU (P) — Простой пакет (ping)', () => App.setTool('pdu'), { tool: 'pdu' }),
    tbBtn('t-pdu2', 'Add Complex PDU — Сложный пакет', () => App.setTool('pdu'), { tool: 'pdu2' }),
  ]);
}

function buildViewbar() {
  const vb = document.getElementById('viewbar');
  const tab = (view, icon, label, title) => h('button', { class: 'vtab' + (view === 'training' ? ' vtrain' : view === 'learn' ? ' vlearn' : ''), dataset: { view }, title, onclick: () => App.setView(view), html: iconUse(icon, 24, 24) + '<span>' + label + '</span>' });
  appendKids(vb, [
    tab('logical', 'v-logical', 'Logical', 'Logical workspace (Логическая схема)'),
    tab('physical', 'v-physical', 'Physical', 'Physical workspace (Физический вид)'),
    tab('training', 'v-training', 'Training', 'Training tasks (Тренировка)'),
    tab('learn', 'v-learn', 'Learn', 'Lessons and mini-tests (Обучение)'),
    h('span', { id: 'coords' }, 'x: 0, y: 0'),
    h('span', { class: 'grow' }),
    h('span', { id: 'vpath', title: 'Current Cluster Name (Текущий кластер)' }, 'Root'),
    h('button', { class: 'vb', title: 'Go Back One Level (Alt+Left)', disabled: true, html: iconUse('v-back', 24, 24) }),
    h('button', { class: 'vb', title: 'Create New Cluster (Shift+U)', html: iconUse('v-cluster', 26, 26), onclick: () => ptOnly('Clusters', 'Кластеры') }),
    h('button', { class: 'vb', title: 'Move Object (Shift+M)', disabled: true, html: iconUse('v-move', 24, 24) }),
    h('button', { class: 'vb', title: 'Set Background Image (Shift+I) — grid on/off (Сетка)', html: iconUse('v-bg', 26, 26), onclick: () => { App.prefs.grid = !App.prefs.grid; App.queueRender(); App.queueSave(); } }),
    h('span', { id: 'clock', title: 'Environment (Shift+E) — clock (часы)', html: iconUse('v-env', 30, 25) + '<span>00:00:00</span>' }),
  ]);
}

function buildTimebar() {
  const tb = document.getElementById('timebar');
  appendKids(tb, [
    h('span', { id: 'simtime' }, 'Time: 00:00:00'),
    h('button', { class: 'round', title: 'Power Cycle Devices (Alt+S) — перезагрузить все устройства', html: iconUse('v-cycle', 26, 26), onclick: () => powerCycleAll() }),
    h('button', { class: 'round', title: 'Fast Forward Time (Alt+D) — ускорить время, сети сходятся мгновенно', html: iconUse('v-ff', 24, 24), onclick: () => { App.startTime -= 30000; toast('+30 s'); } }),
    h('span', { class: 'grow' }),
    h('button', { class: 'mode on', dataset: { mode: 'realtime' }, title: 'Realtime mode (Реальное время)', html: iconUse('v-rt', 26, 26) + '<span>Realtime</span>', onclick: () => App.setMode('realtime') }),
    h('button', { class: 'mode', dataset: { mode: 'simulation' }, title: 'Simulation mode (Пошаговая симуляция пакетов)', html: iconUse('v-sim', 26, 26) + '<span>Simulation</span>', onclick: () => App.setMode('simulation') }),
  ]);
  setInterval(() => {
    const s = Math.floor((Date.now() - App.startTime) / 1000);
    const f = (n) => String(n).padStart(2, '0');
    const t = f(Math.floor(s / 3600)) + ':' + f(Math.floor(s / 60) % 60) + ':' + f(s % 60);
    document.getElementById('simtime').textContent = 'Time: ' + t;
    const d = new Date();
    document.querySelector('#clock span').textContent = f(d.getHours()) + ':' + f(d.getMinutes()) + ':' + f(d.getSeconds());
  }, 1000);
}

// ---------- Файлы ----------
async function fileNew() {
  const ok = await dialog({ title: 'New', body: h('p', null, App.view === 'training' ? 'Start a new random training task?' : 'Clear the workspace? Unsaved changes will be lost. (Очистить рабочую область?)'), buttons: [{ label: 'Yes', primary: true, value: true }, { label: 'No', value: false }] });
  if (!ok) return;
  if (App.view === 'training') { Training.newTask(); return; }
  App.checkpoint();
  DevWin.closeAll();
  restoreTopoInPlace(App.sandbox, JSON.stringify(newTopology()));
  App.changed();
}

async function powerCycleAll() {
  const ok = await dialog({ title: 'Power Cycle Devices', body: h('p', null, 'Reload all routers and switches from startup-config? Running configuration that was not saved will be lost. (Перезагрузить все устройства?)'), buttons: [{ label: 'Yes', primary: true, value: true }, { label: 'No', value: false }] });
  if (!ok) return;
  const topo = App.topo();
  for (const d of Object.values(topo.devices)) if (d.type === 'router' || d.type === 'switch') { iosResetDevice(topo, d); Terminal.resetDevice(topo, d.id); }
  App.changed();
}

function setTheme(t) {
  App.prefs.theme = t;
  // «Auto» не трогает тему, которую выставила страница-хозяин (например, просмотрщик claude.ai)
  if (t === 'auto') { if (App.ownTheme) document.documentElement.removeAttribute('data-theme'); App.ownTheme = false; }
  else { document.documentElement.dataset.theme = t; App.ownTheme = true; }
  App.queueSave();
}

// ---------- Информационные окна ----------
function showUserProfile() {
  const name = h('input', { class: 'inp', value: App.prefs.userName || '', placeholder: 'Name (Имя)' });
  const mail = h('input', { class: 'inp', value: App.prefs.userMail || '', placeholder: 'E-mail' });
  const save = () => { App.prefs.userName = name.value.trim(); App.prefs.userMail = mail.value.trim(); App.queueSave(); };
  name.addEventListener('input', save);
  mail.addEventListener('input', save);
  dialog({ title: 'User Profile', w: 380, body: h('div', { class: 'col' }, h('div', { class: 'muted' }, 'Stored only in this browser (хранится только в этом браузере).'),
    h('div', { class: 'frow' }, h('label', null, 'Name'), name), h('div', { class: 'frow' }, h('label', null, 'E-mail'), mail)), buttons: [{ label: 'OK', primary: true, value: true }] });
}

function showDeviceList() {
  const topo = App.topo();
  const rows = Object.values(topo.devices).map((d) => h('tr', null, h('td', null, d.name), h('td', null, DEVICE_CATALOG[d.model].display), h('td', null, d.type),
    h('td', null, l3Ifaces(d).map((i) => intToIp(i.ip) + '/' + i.len).join(', ') || '—')));
  const w = makeWindow({ title: 'Devices', w: 520, h: 360 });
  w.body.appendChild(h('div', { class: 'pad scroll' }, h('table', { class: 'grid' }, h('tr', null, h('th', null, 'Name'), h('th', null, 'Model'), h('th', null, 'Type'), h('th', null, 'IP addresses')), rows)));
}

function showCommandLog() {
  const w = makeWindow({ title: 'IOS Command Log', w: 560, h: 380 });
  const log = Terminal.commandLog.slice(-300).map((e) => h('tr', null, h('td', null, e.time), h('td', null, e.dev), h('td', null, h('code', null, e.cmd))));
  w.body.appendChild(h('div', { class: 'pad scroll' }, h('table', { class: 'grid' }, h('tr', null, h('th', null, 'Time'), h('th', null, 'Device'), h('th', null, 'Command')), log)));
}

function showNetInfo() {
  const topo = App.topo();
  const w = makeWindow({ title: 'Network Information', w: 460, h: 300 });
  const text = h('textarea', { class: 'netinfo' }, topo.info || '');
  text.addEventListener('input', () => { topo.info = text.value; App.queueSave(); });
  w.body.appendChild(h('div', { class: 'pad col' }, h('div', { class: 'muted' }, 'Notes about this network (Описание сети):'), text));
}

function showShortcuts() {
  const rows = [['Esc', 'Select tool / cancel'], ['Delete / Backspace', 'Delete the selected device (or the Delete tool)'], ['⌘C / ⌘V', 'Copy / paste the selected device'], ['P', 'Add Simple PDU'], ['N', 'Place note'], ['I', 'Inspect'],
    ['⌘Z / ⇧⌘Z', 'Undo / Redo'], ['⌘S', 'Save to file'], ['⌘ + wheel', 'Zoom'], ['Drag empty space', 'Pan the workspace'],
    ['Shift-click a model', 'Place several devices'], ['Tab / ?', 'Complete / help in CLI'], ['↑ ↓', 'Command history in CLI']];
  dialog({ title: 'Keyboard shortcuts', w: 460, body: h('table', { class: 'grid' }, rows.map(([k, v]) => h('tr', null, h('td', null, h('b', null, k)), h('td', null, v)))) });
}

function showGuide() {
  const p = (t) => h('p', null, t);
  dialog({ title: 'Как пользоваться NetTrainer', w: 620, body: h('div', { class: 'guide' },
    h('h4', null, '1. Собрать сеть'),
    p('Внизу слева выберите категорию (Network Devices / End Devices), затем модель справа и кликните по рабочему полю. Можно перетащить модель мышкой.'),
    h('h4', null, '2. Соединить кабелем'),
    p('Категория Connections (молния). Automatic подберёт кабель сам. Или выберите Copper Straight-Through / Cross-Over, кликните по первому устройству, выберите порт, затем по второму. Индикаторы: зелёный — работает, красный — нет (выключен интерфейс или неверный кабель), оранжевый — порт свитча просыпается или заблокирован STP (запасной путь), либо порт EtherChannel не вошёл в пучок.'),
    h('h4', null, '3. Настроить'),
    p('Клик по устройству открывает окно: Config (формы), CLI (команды IOS: enable, conf t, int g0/0, ip add ..., no shut) или Desktop у ПК (IP Configuration, Command Prompt с ping/ipconfig/tracert, Terminal через консольный кабель).'),
    h('h4', null, '4. Проверить'),
    p('ping в Command Prompt, конвертик Add Simple PDU (клик по источнику и получателю) или режим Simulation — пакеты движутся по схеме шаг за шагом.'),
    h('h4', null, '5. Тренировка'),
    p('Вкладка Training: случайное задание на английском с русским переводом, таблица адресации, кнопки Check (проверить), Hint (подсказка) и Solution (решение).'),
    h('h4', null, '6. Теория и тесты'),
    p('Вкладка Learn — полный курс по программе Cisco NetAcad (ITN → SRWE → ENSA) на английском с переводом на русский и иврит. В конце каждого урока мини-тест (70%), после каждой части — итоговый тест. Там же тренажёры (Drills), глоссарий с карточками и озвучкой, и подготовка к собеседованию (Interview).'),
    h('h4', null, '7. Чтобы учиться было легче'),
    p('Today — план на 15 минут в день. Mistakes — тетрадь ошибок: вопрос уходит после 3 верных ответов подряд. Exam — пробный экзамен с таймером. Subnets — калькулятор подсетей с цветными битами. В уроке: 🔊 слушать урок (EN/HE/RU) и ▶ посмотреть вживую. В Interview можно отвечать голосом. Под консолью IOS — подсказки (выключаются в Options). На claude.ai: кнопка 🤖 «Объясни» и общий прогресс телефона и компьютера.')) });
}

// ---------- Горячие клавиши ----------
function bindKeys() {
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); fileSave(); return; }
    if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); fileOpen(); return; }
    if (typing || App.view === 'learn') return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) App.redo(); else App.undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); App.redo(); return; }
    if (mod && e.key.toLowerCase() === 'c' && Workspace.selectedDevice()) { e.preventDefault(); Workspace.copySelected(); return; }
    if (mod && e.key.toLowerCase() === 'v' && Workspace.clipboard) { e.preventDefault(); Workspace.paste(); return; }
    if (mod) return;
    if (e.key === 'Escape') { hideMenu(); App.setTool('select'); if (Workspace.selected) { Workspace.selected = null; App.queueRender(); } }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (Workspace.selectedDevice()) Workspace.deleteSelected(); else App.setTool('delete'); }
    else if (e.key.toLowerCase() === 'p') App.setTool('pdu');
    else if (e.key.toLowerCase() === 'n') App.setTool('note');
    else if (e.key.toLowerCase() === 'i') App.setTool('inspect');
  });
}

// ---------- Запуск ----------
function appInit() {
  document.body.insertAdjacentHTML('afterbegin', ICON_SPRITE);
  App.prefs = Object.assign(App.prefs, Store.get('prefs', {}));
  // Раньше по умолчанию стояло «Auto» (тёмная тема в тёмном окружении) — теперь по умолчанию вид Packet Tracer
  if (!App.prefs.themeV2) { if (App.prefs.theme === 'auto') App.prefs.theme = 'light'; App.prefs.themeV2 = true; }
  setTheme(App.prefs.theme || 'light');
  buildMenubar();
  buildToolbars();
  buildViewbar();
  buildTimebar();
  // Как в Packet Tracer: каждый запуск — с пустой рабочей области. Прошлая работа — в File → Open → «Last session».
  const prev = Store.get('sandbox', null);
  App.sandbox = loadTopo(null);
  if (prev && prev.devices && Object.keys(prev.devices).length) {
    Projects.put(AUTOSAVE_NAME, prev);
    setTimeout(() => toast('Empty workspace. Your previous work: Open → "' + AUTOSAVE_NAME + '" (прошлая работа — в Open)'), 900);
  }
  const tr = Store.get('training', null);
  if (tr && tr.templateId) {
    const task = taskCreate(tr.templateId, tr.seed);
    if (task) App.training = { task, topo: loadTopo(tr.topo), result: null };
  }
  Workspace.init();
  Physical.init();
  Bottom.init();
  Sim.init();
  Training.init();
  Learn.init();
  Tutor.init();   // «Объясни» и проверка ответов — только на claude.ai
  Sync.init();    // общий прогресс между устройствами — только на claude.ai
  Pwa.init();     // офлайн и обновления — только в приложении (сборка docs/)
  bindKeys();
  App.setView(window.innerWidth < 760 ? 'learn' : 'logical'); // на телефоне сразу открываем обучение
  App.setMode('realtime');
  if (Object.keys(App.sandbox.devices).length) setTimeout(() => Workspace.fit(), 60);
  if (window.innerWidth >= 760 && !Object.keys(App.sandbox.devices).length && !Store.get('seenGuide', false)) { Store.set('seenGuide', true); setTimeout(showGuide, 400); }
  App.updateToolbar();
  window.addEventListener('beforeunload', () => App.saveNow());
}

document.addEventListener('DOMContentLoaded', appInit);
