'use strict';
// «Посмотреть вживую»: из урока открывается готовая сеть в режиме Simulation, пакеты идут сами,
// а под ними подпись — что происходит на каждом шаге (EN / RU / HE).

const DemoUI = {
  demo: null,
  saved: null,      // сеть пользователя до демонстрации (JSON)
  done: false,

  start(demo) {
    Learn.audioStop();
    if (!this.demo) {
      this.saved = Object.keys(App.sandbox.devices).length ? JSON.stringify(App.sandbox) : null;
      if (this.saved) Projects.put('Before demo (autosave)', App.sandbox);
    }
    this.demo = demo;
    App.setView('logical');
    this.load();
    App.setMode('simulation');
    this.render();
    setTimeout(() => { this.fit(); this.play(); }, 150);
  },
  fit() {
    const b = document.getElementById('demobanner');
    Workspace.fit(b && !b.hidden ? b.offsetHeight + 16 : 0);
  },

  // Свежая сеть демонстрации: пустые ARP- и MAC-таблицы, чтобы снова было видно ARP.
  load() {
    Sim.reset();
    DevWin.closeAll();
    restoreTopoInPlace(App.sandbox, JSON.stringify(demoBuild(this.demo)));
    _rtMap.delete(App.sandbox);
    Terminal.states.delete(App.sandbox);
    Workspace.selected = null;
    App.undoStacks.sandbox = []; App.redoStacks.sandbox = [];
    App.changed();
  },

  play() {
    if (!this.demo) return;
    if (this.done) this.load();
    this.done = false;
    if (App.mode !== 'simulation') App.setMode('simulation');
    const r = demoRun(App.sandbox, this.demo);
    App.changed({ noCommit: true });
    Sim.load(r.events, () => { this.done = true; this.result = r.results; this.render(); });
    this.render();
  },

  exit(keep) {
    if (!this.demo) return;
    Sim.reset();
    this.demo = null;
    this.done = false;
    if (!keep) {
      DevWin.closeAll();
      restoreTopoInPlace(App.sandbox, this.saved || JSON.stringify(newTopology()));
      _rtMap.delete(App.sandbox);
      stpLive(App.sandbox);
      Terminal.states.delete(App.sandbox);
      App.changed();
    }
    this.saved = null;
    if (keep) stpLive(App.sandbox); // демонстрация шла без таймеров STP — дальше сеть живёт как обычно
    App.setMode('realtime');
    this.render();
    if (!keep) { App.setView('learn'); }
    else toast(triText(T('The network stays in the workspace — try your own pings', 'Сеть осталась в рабочей области — попробуйте свои ping', 'הרשת נשארת באזור העבודה — נסו ping משלכם')));
  },

  update() { if (this.demo) this.render(); },

  renderCaption() {
    const el = document.querySelector('#demobanner .democap');
    if (!el) return;
    clear(el);
    const evs = Sim.events.filter((e) => e.step === Sim.step && Sim.visible(e));
    const cap = simCaption(App.sandbox, evs);
    if (cap) el.appendChild(bi(cap));
    else if (this.done) el.appendChild(bi(this.summary()));
    else el.appendChild(bi(this.demo.intro));
  },

  summary() {
    const res = this.result || [];
    const pings = res.filter((x) => x.kind === 'ping');
    const okN = pings.filter((x) => x.status === 'reply').length;
    return T('Done: ' + okN + ' of ' + pings.length + ' pings answered. Press ↻ to watch again, or open the devices and try it yourself.',
      'Готово: ответили ' + okN + ' из ' + pings.length + ' ping. Нажмите ↻, чтобы посмотреть ещё раз, или откройте устройства и попробуйте сами.',
      'סיום: ' + okN + ' מתוך ' + pings.length + ' פינגים קיבלו תשובה. לחצו ↻ כדי לצפות שוב, או פתחו את ההתקנים ונסו בעצמכם.');
  },

  render() {
    let el = document.getElementById('demobanner');
    if (!el) return;
    clear(el);
    el.hidden = !this.demo || (App.view !== 'logical' && App.view !== 'physical');
    if (el.hidden) return;
    const d = this.demo;
    appendKids(el, [
      h('div', { class: 'demohead' },
        h('b', null, '▶ ', d.title.en), App.prefs.ru ? h('span', { class: 'muted' }, ' · ' + d.title.ru) : null,
        h('span', { class: 'demobtns' },
          Sim.playing ? h('button', { class: 'btn sm', onclick: () => { Sim.pause(); this.render(); } }, '⏸')
            : h('button', { class: 'btn sm primary', onclick: () => { if (this.done || !Sim.events.length) this.play(); else { Sim.play(); this.render(); } } }, this.done ? '↻' : '▶'),
          h('button', { class: 'btn sm', title: 'Step', onclick: () => { Sim.pause(); Sim.forward(); this.render(); } }, '⏭'),
          h('button', { class: 'btn sm', title: triText(T('Keep this network and try it yourself', 'Оставить сеть и попробовать самому', 'להשאיר את הרשת ולנסות לבד')), onclick: () => this.exit(true) }, '🧪 ', tri('Try it', 'сам', 'לנסות')),
          h('button', { class: 'btn sm', onclick: () => this.exit(false) }, '✕ ', tri('Back to the lesson', 'к уроку', 'חזרה לשיעור')))),
      h('div', { class: 'democap' }),
    ]);
    this.renderCaption();
  },
};
