'use strict';
// Мини-фреймворк тестов для jsc (JavaScriptCore).
const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }
function eq(a, b, msg) {
  const sa = JSON.stringify(a), sb = JSON.stringify(b);
  if (sa !== sb) throw new Error((msg ? msg + ': ' : '') + 'expected ' + sb + ', got ' + sa);
}
function ok(c, msg) { if (!c) throw new Error(msg || 'assertion failed'); }
function has(text, sub, msg) { if (!String(text).includes(sub)) throw new Error((msg ? msg + ': ' : '') + 'expected to find ' + JSON.stringify(sub) + ' in:\n' + text); }
function runTests() {
  let pass = 0, fail = 0;
  const only = typeof TEST_FILTER === 'string' ? TEST_FILTER : '';
  for (const t of TESTS) {
    if (only && !t.name.includes(only)) continue;
    try { t.fn(); pass++; } catch (e) { fail++; print('FAIL ' + t.name + '\n   ' + e.message + (e.stack ? '\n' + e.stack.split('\n').slice(0, 4).join('\n') : '')); }
  }
  print('\n' + pass + ' passed, ' + fail + ' failed');
  if (fail) throw new Error('tests failed');
}

// Хелперы построения сетей
function cli(topo, devId, cmds) { return iosRunScript(topo, devId, ['enable', 'configure terminal', ...cmds, 'end']).out; }
function pcSet(topo, id, ip, mask, gw) { Object.assign(topo.devices[id].cfg, { ipMode: 'static', ip, mask, gateway: gw || null }); netCommit(topo); }
function link(topo, a, ap, b, bp, cable) { const r = addLink(topo, a, ap, b, bp, cable || 'auto'); if (r.error) throw new Error('link ' + r.error); netCommit(topo); return r.link; }
function reach(topo, a, ip) { return canReach(topo, a, ip).status; }
function pingSeq(topo, a, ip, n = 4) { let s = ''; for (let i = 0; i < n; i++) s += pingOnce(topo, a, ipToInt(ip), { arp: true }).status === 'reply' ? '!' : '.'; return s; }
