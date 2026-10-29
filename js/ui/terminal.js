'use strict';
// Терминал: консоль IOS (CLI-вкладка и Terminal на ПК) и командная строка ПК.

const Terminal = {
  states: new WeakMap(), // topo -> Map(key -> state)
  commandLog: [],

  map(topo) {
    let m = this.states.get(topo);
    if (!m) {
      m = new Map();
      this.states.set(topo, m);
      netOnConsole(topo, (devId, text) => {
        const st = m.get('ios|' + devId);
        if (st && st.sess.started) { this.append(st, text + '\n'); }
      });
    }
    return m;
  },

  state(topo, devId, kind) {
    const m = this.map(topo);
    const key = kind + '|' + devId;
    let st = m.get(key);
    if (!st) {
      if (kind === 'ios') {
        const dev = topo.devices[devId];
        st = { kind, devId, topo, sess: iosNewSession(topo, devId), buf: iosBootText(dev), views: new Set(), busy: false, hist: [], hpos: -1 };
      } else {
        st = { kind, devId, topo, shell: pcNewShell(topo, devId), buf: 'NetTrainer PC Command Line 1.0\n', views: new Set(), busy: false, hist: [], hpos: -1 };
      }
      m.set(key, st);
    }
    return st;
  },

  resetDevice(topo, devId) {
    const st = this.map(topo).get('ios|' + devId);
    if (!st) return;
    st.sess = iosNewSession(topo, devId);
    st.buf += '\n' + iosBootText(topo.devices[devId]);
    this.notify(st);
  },

  append(st, text) {
    st.buf += text;
    if (st.buf.length > 200000) st.buf = st.buf.slice(-150000);
    this.notify(st);
  },
  notify(st) { for (const v of st.views) v.refresh(); },

  prompt(st) {
    if (st.kind === 'pc') return pcPrompt();
    return iosPrompt(st.topo, st.sess);
  },

  // Выполнить строку
  async run(st, line) {
    if (st.kind === 'pc') return this.runPc(st, line);
    const dev = st.topo.devices[st.devId];
    if (!dev) return;
    const p = this.prompt(st);
    const hidden = st.sess.pending && st.sess.pending.hidden;
    this.append(st, (st.sess.started ? p + (hidden ? '' : line) : '') + (st.sess.started ? '\n' : ''));
    if (line.trim() && st.sess.started && !st.sess.pending) {
      st.hist.push(line); st.hpos = -1;
      const d = new Date();
      this.commandLog.push({ time: d.toTimeString().slice(0, 8), dev: dev.name, cmd: line.trim() });
    }
    const res = iosExec(st.topo, st.sess, line);
    st.lastOut = res.out || '';
    if (res.slow && res.out) await this.typeOut(st, res.out, 120);
    else this.append(st, res.out || '');
    App.changed({ noCommit: true });
  },

  async runPc(st, line) {
    const p = this.prompt(st);
    this.append(st, p + line + '\n');
    if (line.trim()) { st.hist.push(line); st.hpos = -1; }
    const dev = st.topo.devices[st.devId];
    if (dev.off) { this.append(st, 'The device is powered off.\n'); return; }
    const chunks = pcExec(st.topo, st.shell, line);
    for (const c of chunks) {
      if (c.clear) { st.buf = ''; this.notify(st); continue; }
      if (c.delay) await this.sleep(c.delay);
      this.append(st, c.text + '\n');
    }
    this.append(st, '\n');
    App.changed({ noCommit: true });
  },

  async typeOut(st, text, delay) {
    st.busy = true; this.notify(st);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      this.append(st, lines[i] + (i < lines.length - 1 ? '\n' : ''));
      if (lines[i].length && i < lines.length - 1) await this.sleep(delay);
    }
    st.busy = false; this.notify(st);
  },

  sleep(ms) { return new Promise((r) => setTimeout(r, ms)); },

  // Смонтировать терминал в контейнер
  mount(container, topo, devId, kind, opts = {}) {
    const st = this.state(topo, devId, kind);
    const out = h('pre', { class: 'tout' });
    const promptEl = h('span', { class: 'tprompt' });
    const input = h('input', { class: 'tinput', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off' });
    const inrow = h('div', { class: 'tinrow' }, promptEl, input);
    const scroller = h('div', { class: 'tscroll' }, out, inrow);
    const hint = kind === 'ios' && opts.hints !== false ? h('div', { class: 'clihint' }) : null;
    const term = h('div', { class: 'term ' + (kind === 'pc' ? 'pcterm' : 'iosterm') }, scroller, hint);
    container.appendChild(term);
    scroller.addEventListener('mouseup', () => { if (!window.getSelection().toString()) input.focus(); });

    const view = {
      refresh() {
        out.textContent = st.buf;
        const p = Terminal.prompt(st);
        promptEl.textContent = p;
        const hidden = kind === 'ios' && st.sess.pending && st.sess.pending.hidden;
        input.classList.toggle('secret', !!hidden);
        input.disabled = st.busy;
        inrow.style.visibility = st.busy ? 'hidden' : 'visible';
        if (hint) Terminal.renderHint(hint, st, input);
        scroller.scrollTop = scroller.scrollHeight;
      },
      focus() { input.focus(); },
      destroy() { st.views.delete(view); },
    };
    st.views.add(view);
    view.refresh();

    input.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const line = input.value;
        input.value = '';
        await Terminal.run(st, line);
        view.focus();
        return;
      }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (!st.hist.length) return;
        if (st.hpos === -1) st.hpos = st.hist.length;
        st.hpos = Math.max(0, Math.min(st.hist.length, st.hpos + (e.key === 'ArrowUp' ? -1 : 1)));
        input.value = st.hpos >= st.hist.length ? '' : st.hist[st.hpos];
        return;
      }
      if (kind !== 'ios') return;
      if (e.key === 'Tab') {
        e.preventDefault();
        input.value = iosComplete(st.topo, st.sess, input.value);
        return;
      }
      if (e.key === '?' && !(st.sess.pending)) {
        e.preventDefault();
        const p = Terminal.prompt(st);
        const help = iosHelp(st.topo, st.sess, input.value);
        Terminal.append(st, p + input.value + '?\n' + help);
        return;
      }
      if ((e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (st.sess.mode !== 'user' && st.sess.mode !== 'priv') {
          Terminal.append(st, Terminal.prompt(st) + '^Z\n');
          iosExec(st.topo, st.sess, 'end');
          Terminal.notify(st);
        }
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        Terminal.append(st, Terminal.prompt(st) + input.value + '^C\n');
        input.value = '';
      }
    });
    // '?' может прийти без keydown (вставка, экранная клавиатура)
    input.addEventListener('input', () => {
      if (kind !== 'ios' || st.sess.pending || !input.value.endsWith('?')) return;
      const line = input.value.slice(0, -1);
      input.value = line;
      Terminal.append(st, Terminal.prompt(st) + line + '?\n' + iosHelp(st.topo, st.sess, line));
    });
    if (opts.focus !== false) { input.focus(); setTimeout(() => input.focus(), 30); }
    return view;
  },

  // Полоса подсказок под консолью IOS: в каком режиме вы сейчас, что обычно вводят дальше, что значит ответ IOS.
  renderHint(el, st, input) {
    clear(el);
    el.hidden = App.prefs.cliHints === false;
    if (el.hidden) return;
    const dev = st.topo.devices[st.devId];
    if (!dev) return;
    const help = cliHelp(dev, st.sess, st.lastOut);
    const one = (t) => (App.prefs.ru && t.ru ? t.ru : App.prefs.he && t.he ? t.he : t.en);
    const heOnly = !App.prefs.ru && App.prefs.he;
    el.appendChild(h('div', { class: 'clhrow' },
      h('span', { class: 'clhmode', dir: heOnly ? 'rtl' : null, title: triText(help.mode, '\n') }, '💡 ' + one(help.mode)),
      h('button', { class: 'clhx', title: triText(T('Hide CLI hints (Options menu turns them back on)', 'Скрыть подсказки (вернуть — в меню Options)', 'להסתיר רמזים (מחזירים בתפריט Options)')),
        onclick: () => { App.prefs.cliHints = false; App.queueSave(); el.hidden = true; } }, '×')));
    if (help.msg) el.appendChild(h('div', { class: 'clhmsg ' + help.msg.kind }, bi(help.msg.text)));
    if (help.next.length) {
      el.appendChild(h('div', { class: 'clhnext' }, h('span', { class: 'muted' }, tri('Next', 'дальше', 'הבא'), ':'),
        help.next.map((c) => h('button', { class: 'clhcmd mono', title: c.endsWith(' ') ? triText(T('Inserts the command — finish it and press Enter', 'Вставит команду — допишите и нажмите Enter', 'מכניס את הפקודה — השלימו ולחצו Enter')) : triText(T('Inserts the command — press Enter to run', 'Вставит команду — нажмите Enter', 'מכניס את הפקודה — לחצו Enter')),
          onclick: () => { input.value = c; input.focus(); input.setSelectionRange(c.length, c.length); } }, c.trim() + (c.endsWith(' ') ? ' …' : '')))));
    }
  },

  async pasteInto(topo, devId, kind) {
    const ta = h('textarea', { class: 'inp mono', rows: 12, style: { width: '100%' }, placeholder: 'Paste commands here, one per line' });
    const r = await dialog({ title: 'Paste commands', w: 520, body: ta, buttons: [{ label: 'Run', primary: true, value: true }, { label: 'Cancel', value: false }] });
    if (!r) return;
    const st = this.state(topo, devId, kind);
    for (const line of ta.value.split(/\r?\n/)) {
      if (kind === 'ios' && !st.sess.started) await this.run(st, '');
      await this.run(st, line);
    }
  },
};
