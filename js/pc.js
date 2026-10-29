'use strict';
// Командная строка ПК (как Desktop → Command Prompt).

function pcNewShell(topo, devId) { return { devId, history: [] }; }
function pcPrompt() { return 'C:\\>'; }

// Возвращает массив кусков вывода: [{text, delay}]
function pcExec(topo, shell, line) {
  const dev = topo.devices[shell.devId];
  const raw = line.trim();
  const out = [];
  const say = (text, delay = 0) => out.push({ text, delay });
  if (!raw) return out;
  shell.history.push(raw);
  const parts = raw.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === 'ping') {
    let count = 4, target = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-n' && args[i + 1]) { count = Math.max(1, Math.min(50, Number(args[i + 1]) || 4)); i++; }
      else if (args[i] === '-t') count = 20;
      else target = args[i];
    }
    if (!target) { say('Usage: ping [-n count] [-t] target_name'); return out; }
    if (!isIp(target)) { say('Ping request could not find host ' + target + '. Please check the name and try again.'); return out; }
    const dst = ipToInt(target);
    say('\nPinging ' + target + ' with 32 bytes of data:\n');
    let recv = 0;
    const sim = netSimHook(topo, dev.id);
    for (let i = 0; i < count; i++) {
      const r = pingOnce(topo, dev.id, dst, { arp: true, events: i === 0 && sim ? sim.events : undefined, stepRef: sim ? sim.stepRef : undefined });
      if (r.status === 'reply') { recv++; say('Reply from ' + target + ': bytes=32 time' + (i % 3 === 2 ? '=1ms' : '<1ms') + ' TTL=' + r.ttl, 350); }
      else if (r.status === 'unreachable') say('Reply from ' + r.from + ': Destination host unreachable.', 600);
      else if (r.status === 'ttl') say('Reply from ' + r.from + ': TTL expired in transit.', 600);
      else say('Request timed out.', 900);
    }
    if (sim) sim.done();
    const lost = count - recv;
    say('\nPing statistics for ' + target + ':\n    Packets: Sent = ' + count + ', Received = ' + recv + ', Lost = ' + lost + ' (' + Math.round((lost * 100) / count) + '% loss),');
    if (recv) say('Approximate round trip times in milli-seconds:\n    Minimum = 0ms, Maximum = 1ms, Average = 0ms');
    return out;
  }

  if (cmd === 'tracert' || cmd === 'traceroute') {
    const target = args[0];
    if (!target || !isIp(target)) { say('Unable to resolve target system name ' + (target || '') + '.'); return out; }
    say('\nTracing route to ' + target + ' over a maximum of 30 hops: \n');
    const tr = traceroute(topo, dev.id, ipToInt(target), 30);
    for (const h of tr.hops) {
      if (h.ip) say('  ' + padR(h.hop, 3) + ' ' + padR('0 ms', 10) + padR('0 ms', 10) + padR('0 ms', 10) + h.ip + (h.unreachable ? ' reports: Destination host unreachable.' : ''), 300);
      else say('  ' + padR(h.hop, 3) + ' ' + padR('*', 10) + padR('*', 10) + padR('*', 10) + 'Request timed out.', 400);
    }
    if (tr.done || tr.unreachable) say('\nTrace complete.');
    return out;
  }

  if (cmd === 'ipconfig') {
    const sw = (args[0] || '').toLowerCase();
    const c = dev.cfg;
    if (sw === '/release') {
      if (c.ipMode !== 'dhcp') { say('\nThe operation failed: interface FastEthernet0 is not configured for DHCP (use IP Configuration → DHCP).'); return out; }
      pcDhcpRelease(topo, dev.id);
      netCommit(topo);
      say('\n   IP Address......................: 0.0.0.0\n   Subnet Mask.....................: 0.0.0.0\n   Default Gateway.................: 0.0.0.0\n   DNS Server......................: 0.0.0.0');
      return out;
    }
    if (sw === '/renew') {
      if (c.ipMode !== 'dhcp') { say('\nThe operation failed: interface FastEthernet0 is not configured for DHCP (use IP Configuration → DHCP).'); return out; }
      const sim = netSimHook(topo, dev.id);
      const r = pcDhcpRenew(topo, dev.id, sim ? { events: sim.events, stepRef: sim.stepRef } : undefined);
      if (sim) sim.done();
      netCommit(topo);
      if (!r.ok) { say('DHCP request failed. ', 1500); return out; }
      say('\n   IP Address......................: ' + c.ip + '\n   Subnet Mask.....................: ' + c.mask + '\n   Default Gateway.................: ' + (c.gateway || '0.0.0.0') + '\n   DNS Server......................: ' + (c.dns || '0.0.0.0'), 800);
      return out;
    }
    const lines = ['', 'FastEthernet0 Connection:(default port)', '', '   Connection-specific DNS Suffix..: '];
    if (sw === '/all') {
      lines.push('   Physical Address................: ' + dev.ports[0].mac);
      lines.push('   DHCP Enabled....................: ' + (c.ipMode === 'dhcp' ? 'Yes' : 'No'));
    }
    lines.push('   IPv4 Address....................: ' + (c.ip || '0.0.0.0'));
    lines.push('   Subnet Mask.....................: ' + (c.mask || '0.0.0.0'));
    lines.push('   Default Gateway.................: ' + (c.gateway || '0.0.0.0'));
    if (sw === '/all') lines.push('   DNS Servers.....................: ' + (c.dns || '0.0.0.0'));
    lines.push('');
    say(lines.join('\n'));
    return out;
  }

  if (cmd === 'arp') {
    const sw = (args[0] || '').toLowerCase();
    const rt = netRt(topo);
    if (sw === '-d') { rt.arp[dev.id] = {}; return out; }
    if (sw !== '-a') { say('Usage: arp -a | arp -d'); return out; }
    const t = rt.arp[dev.id] || {};
    const ents = Object.entries(t);
    if (!ents.length) { say('No ARP Entries Found'); return out; }
    const lines = ['  Internet Address      Physical Address      Type'];
    for (const [ip, e] of ents) lines.push('  ' + padR(ip, 22) + padR(e.mac.toLowerCase(), 22) + 'dynamic');
    say(lines.join('\n'));
    return out;
  }

  if (cmd === 'cls') { out.push({ clear: true }); return out; }
  if (cmd === 'hostname') { say(dev.name); return out; }
  if (cmd === 'help' || cmd === '?') {
    say([
      'Available Commands:',
      '?         Display the list of available commands',
      'arp       Display the arp table (arp -a / arp -d)',
      'cls       Clear screen',
      'help      Display the list of available commands',
      'hostname  Display the host name',
      'ipconfig  Display network configuration (/all /release /renew)',
      'ping      Send echo messages (ping [-n N] A.B.C.D)',
      'tracert   Trace route to destination',
    ].join('\n'));
    return out;
  }
  say('Invalid Command.');
  return out;
}
