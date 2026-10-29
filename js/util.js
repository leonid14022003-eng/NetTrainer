'use strict';
// Общие утилиты: IPv4-арифметика, клонирование, генератор случайных чисел.

function ipToInt(s) {
  if (typeof s !== 'string') return null;
  const p = s.trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const x of p) {
    if (!/^\d{1,3}$/.test(x)) return null;
    const v = Number(x);
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}

function intToIp(n) {
  n = n >>> 0;
  return [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
}

function isIp(s) { return ipToInt(s) !== null; }

function lenToMaskInt(len) {
  if (len <= 0) return 0;
  if (len >= 32) return 0xffffffff;
  return (0xffffffff << (32 - len)) >>> 0;
}

function lenToMask(len) { return intToIp(lenToMaskInt(len)); }

// Длина префикса по маске; null, если маска не непрерывная.
function maskToLen(mask) {
  const m = typeof mask === 'number' ? mask >>> 0 : ipToInt(mask);
  if (m === null) return null;
  let len = 0;
  let seenZero = false;
  for (let i = 31; i >= 0; i--) {
    const bit = (m >>> i) & 1;
    if (bit && seenZero) return null;
    if (bit) len++; else seenZero = true;
  }
  return len;
}

function isMask(s) { return isIp(s) && maskToLen(s) !== null; }

function wildcardToLen(w) {
  const n = ipToInt(w);
  if (n === null) return null;
  return maskToLen((~n) >>> 0);
}

function netOf(ip, len) {
  const n = typeof ip === 'number' ? ip : ipToInt(ip);
  return (n & lenToMaskInt(len)) >>> 0;
}

function inSubnet(ip, net, len) {
  const n = typeof ip === 'number' ? ip : ipToInt(ip);
  const t = typeof net === 'number' ? net : ipToInt(net);
  return ((n & lenToMaskInt(len)) >>> 0) === ((t & lenToMaskInt(len)) >>> 0);
}

function classfulLen(ip) {
  const n = typeof ip === 'number' ? ip : ipToInt(ip);
  const first = n >>> 24;
  if (first < 128) return 8;
  if (first < 192) return 16;
  return 24;
}

function broadcastOf(net, len) {
  return (netOf(net, len) | (~lenToMaskInt(len) >>> 0)) >>> 0;
}

function cidr(net, len) { return intToIp(net) + '/' + len; }

function deepClone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }

// Детерминированный генератор (mulberry32) — задания воспроизводимы по seed.
function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int(lo, hi) { return lo + Math.floor(next() * (hi - lo + 1)); },
    pick(arr) { return arr[Math.floor(next() * arr.length)]; },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    chance(p) { return next() < p; },
  };
}

function padR(s, n) { s = String(s); return s.length >= n ? s : s + ' '.repeat(n - s.length); }
function padL(s, n) { s = String(s); return s.length >= n ? s : ' '.repeat(n - s.length) + s; }

// MAC в формате Cisco: 0060.2F84.4AB6
function makeMac(rng, oui) {
  const hex = (n) => n.toString(16).toUpperCase().padStart(4, '0');
  const o = oui || rng.pick(['0001.4321', '0060.2F84', '00D0.BC52', '0002.1734', '00E0.F7A3', '0090.2B11', '000C.CF0B', '0030.A3C8']);
  return o + '.' + hex(rng.int(0, 0xffff));
}

function macToWin(mac) {
  const h = mac.replace(/\./g, '').toUpperCase();
  return h.match(/.{2}/g).join('-');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Многоязычная строка: английский + русский перевод (+ иврит, если есть).
function T(en, ru, he) { return he === undefined ? { en, ru } : { en, ru, he }; }
