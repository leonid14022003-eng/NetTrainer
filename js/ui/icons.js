'use strict';
// SVG-иконки: устройства (логический вид), категории, кабели, панели инструментов.

const ARROW = '-8,-2.6 2,-2.6 2,-6.5 9,0 2,6.5 2,2.6 -8,2.6';

const ICON_SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">
<defs>
  <linearGradient id="gBlueSide" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#5f97a1"/><stop offset=".16" stop-color="#9cc4cf"/><stop offset=".3" stop-color="#eef7fa"/><stop offset=".46" stop-color="#b5d5de"/><stop offset=".72" stop-color="#67a6b8"/><stop offset="1" stop-color="#1f7189"/></linearGradient>
  <linearGradient id="gBlueTop" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#bfe0e8"/><stop offset="1" stop-color="#7aaabb"/></linearGradient>
  <linearGradient id="gTeal" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8fc3d1"/><stop offset="1" stop-color="#2f7d92"/></linearGradient>
  <linearGradient id="gBolt" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e8291c"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#e8291c"/></linearGradient>
  <linearGradient id="gScreen" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#d9f1ff"/><stop offset="1" stop-color="#6fb7e6"/></linearGradient>
  <linearGradient id="gBeige" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#d9eaf0"/><stop offset="1" stop-color="#86afbd"/></linearGradient>
  <linearGradient id="gGray" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e3eef2"/><stop offset="1" stop-color="#93b2bd"/></linearGradient>
  <linearGradient id="dScr" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#8fd0ff"/><stop offset="1" stop-color="#1f6fc4"/></linearGradient>
</defs>

<symbol id="i-router" viewBox="0 0 64 46">
  <path d="M2 15 V31 A30 11 0 0 0 62 31 V15" fill="url(#gBlueSide)" stroke="#2f6f80" stroke-width="1.2"/>
  <ellipse cx="32" cy="15" rx="30" ry="11" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.2"/>
  <g transform="translate(32 15) scale(1 .42)" fill="#f2fbfd" stroke="#4f8797" stroke-width="1.3">
    <polygon points="${ARROW}" transform="rotate(-38) translate(15 0)"/>
    <polygon points="${ARROW}" transform="rotate(142) translate(15 0)"/>
    <polygon points="${ARROW}" transform="rotate(38) translate(15 0) rotate(180)"/>
    <polygon points="${ARROW}" transform="rotate(218) translate(15 0) rotate(180)"/>
  </g>
</symbol>

<symbol id="i-switch" viewBox="0 0 64 40">
  <polygon points="10,4 62,4 54,16 2,16" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.2"/>
  <polygon points="2,16 54,16 54,32 2,32" fill="url(#gBlueSide)" stroke="#2f6f80" stroke-width="1.2"/>
  <polygon points="54,16 62,4 62,20 54,32" fill="#2b7286" stroke="#2f6f80" stroke-width="1.2"/>
  <g fill="#fff" stroke="#2f6f80" stroke-width="1">
    <polygon points="${ARROW}" transform="translate(24 7.5) scale(.95 .5)"/>
    <polygon points="${ARROW}" transform="translate(40 7.5) scale(.95 .5) rotate(180)"/>
    <polygon points="${ARROW}" transform="translate(21 12.5) scale(.95 .5) rotate(180)"/>
    <polygon points="${ARROW}" transform="translate(37 12.5) scale(.95 .5)"/>
  </g>
</symbol>

<symbol id="i-hub" viewBox="0 0 64 40">
  <polygon points="10,8 62,8 54,18 2,18" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.2"/>
  <polygon points="2,18 54,18 54,30 2,30" fill="url(#gBlueSide)" stroke="#2f6f80" stroke-width="1.2"/>
  <polygon points="54,18 62,8 62,20 54,30" fill="#2b7286" stroke="#2f6f80" stroke-width="1.2"/>
  <g fill="#fff" stroke="#2f6f80" stroke-width="1"><polygon points="${ARROW}" transform="translate(32 13) scale(1.3 .5)"/></g>
</symbol>

<symbol id="i-pc" viewBox="0 0 52 46">
  <rect x="7" y="2" width="38" height="29" rx="3" fill="url(#gBeige)" stroke="#3f7486" stroke-width="1.2"/>
  <rect x="11" y="5.5" width="30" height="21" rx="1.5" fill="url(#gScreen)" stroke="#4f6f86"/>
  <path d="M21 31 h10 l2 5 h-14z" fill="#9fbfca" stroke="#3f7486"/>
  <polygon points="7,38 45,38 49,44 3,44" fill="url(#gBeige)" stroke="#3f7486" stroke-width="1.1"/>
  <path d="M9 40.5 h34 M7.5 42.3 h37" stroke="#5e8d9c" stroke-width=".8" stroke-dasharray="2 1"/>
</symbol>

<symbol id="i-laptop" viewBox="0 0 56 44">
  <polygon points="12,3 50,3 46,28 8,28" fill="url(#gGray)" stroke="#42707f" stroke-width="1.2"/>
  <polygon points="14.5,6 46.5,6 43.5,25 11.5,25" fill="url(#gScreen)" stroke="#4f6f86"/>
  <polygon points="8,28 46,28 54,40 2,40" fill="url(#gGray)" stroke="#42707f" stroke-width="1.2"/>
  <path d="M10 31 h36 M8 34 h40" stroke="#5e8d9c" stroke-width=".8" stroke-dasharray="2 1"/>
</symbol>

<symbol id="i-server" viewBox="0 0 40 50">
  <rect x="8" y="2" width="24" height="44" rx="2" fill="url(#gGray)" stroke="#42707f" stroke-width="1.2"/>
  <path d="M11 9 h18 M11 14 h18 M11 19 h18 M11 24 h18" stroke="#4d7482" stroke-width="2"/>
  <circle cx="27" cy="38" r="2" fill="#3fbf4a"/>
  <rect x="11" y="34" width="10" height="3" fill="#4d7482"/>
</symbol>

<symbol id="i-printer" viewBox="0 0 52 44">
  <rect x="14" y="3" width="24" height="12" fill="#fff" stroke="#3f7486"/>
  <rect x="4" y="13" width="44" height="18" rx="3" fill="url(#gBeige)" stroke="#3f7486" stroke-width="1.2"/>
  <rect x="12" y="27" width="28" height="14" fill="#fff" stroke="#3f7486"/>
  <path d="M16 32 h20 M16 36 h14" stroke="#7a9aa5"/>
</symbol>

<symbol id="i-cloud" viewBox="0 0 64 44">
  <path d="M16 36 a10 10 0 0 1 -2 -19 a13 13 0 0 1 24 -6 a10 10 0 0 1 16 8 a9 9 0 0 1 -2 17 z" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.3"/>
</symbol>
<symbol id="i-ap" viewBox="0 0 52 44">
  <polygon points="10,12 48,12 42,18 4,18" fill="url(#gBlueTop)" stroke="#2f6f80"/>
  <rect x="4" y="18" width="38" height="18" fill="url(#gBlueSide)" stroke="#2f6f80"/>
  <polygon points="42,18 48,12 48,30 42,36" fill="#2b7286" stroke="#2f6f80"/>
  <path d="M15 22 a6 6 0 0 0 0 10 M31 22 a6 6 0 0 1 0 10 M11.5 19.5 a10 10 0 0 0 0 15 M34.5 19.5 a10 10 0 0 1 0 15" fill="none" stroke="#fff" stroke-width="1.6"/>
  <circle cx="23" cy="27" r="2" fill="#fff"/>
</symbol>
<symbol id="i-firewall" viewBox="0 0 52 44">
  <polygon points="17,4 35,4 39,1 21,1" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width=".8"/>
  <rect x="17" y="4" width="18" height="38" fill="url(#gBlueSide)" stroke="#2f6f80"/>
  <polygon points="35,4 39,1 39,38 35,42" fill="#2b7286" stroke="#2f6f80" stroke-width=".8"/>
  <rect x="17" y="29" width="18" height="13" fill="#6b0f14" stroke="#3d070a"/>
  <path d="M20 9 h12 v11 h-12z" fill="#e6f2f5" stroke="#2f6f80" stroke-width=".8"/>
  <path d="M20 12.7 h12 M20 16.3 h12 M24 9 v3.7 M28 12.7 v3.6 M24 16.3 v3.7" stroke="#b9472e" stroke-width=".9"/>
</symbol>
<symbol id="i-phone" viewBox="0 0 44 44">
  <rect x="6" y="14" width="32" height="24" rx="4" fill="url(#gGray)" stroke="#42707f"/>
  <path d="M8 14 c0 -10 28 -10 28 0" fill="none" stroke="#42707f" stroke-width="4"/>
  <rect x="13" y="20" width="18" height="12" fill="#cfe7f6" stroke="#42707f"/>
</symbol>
<symbol id="i-modem" viewBox="0 0 52 40">
  <polygon points="10,8 48,8 42,16 4,16" fill="url(#gGray)" stroke="#42707f"/>
  <rect x="4" y="16" width="38" height="12" fill="#c8ced4" stroke="#42707f"/>
  <circle cx="10" cy="22" r="1.6" fill="#3fbf4a"/><circle cx="15" cy="22" r="1.6" fill="#3fbf4a"/><circle cx="20" cy="22" r="1.6" fill="#f0b429"/>
</symbol>
<symbol id="i-house" viewBox="0 0 44 44"><path d="M6 22 L22 8 L38 22 V38 H6Z" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.3"/><rect x="18" y="26" width="8" height="12" fill="#2f7d92"/></symbol>
<symbol id="i-city" viewBox="0 0 44 44"><rect x="6" y="14" width="10" height="26" fill="url(#gBlueSide)" stroke="#2f6f80"/><rect x="18" y="6" width="10" height="34" fill="url(#gBlueTop)" stroke="#2f6f80"/><rect x="30" y="18" width="8" height="22" fill="url(#gBlueSide)" stroke="#2f6f80"/></symbol>
<symbol id="i-factory" viewBox="0 0 44 44"><path d="M4 40 V20 L14 26 V20 L24 26 V20 L34 26 V8 H40 V40Z" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.2"/></symbol>
<symbol id="i-tower" viewBox="0 0 44 44"><path d="M22 4 L12 40 M22 4 L32 40 M8 14 H36 M10 22 H34 M15 30 H29" stroke="#2f7d92" stroke-width="2" fill="none"/></symbol>
<symbol id="i-board" viewBox="0 0 44 44"><rect x="3" y="10" width="38" height="25" rx="1.5" fill="#2d6878" stroke="#1d4652"/><rect x="16" y="17" width="12" height="11" fill="#1d1f22"/><path d="M6 14 h7 M6 18 h5 M31 14 h7 M33 30 h5 M6 31 h7 M16 13 v-3 M20 13 v-3 M24 13 v-3 M28 13 v-3" stroke="#9fd3e0" stroke-width="1.2"/><circle cx="35" cy="21" r="1.6" fill="#e6c34a"/></symbol>
<symbol id="i-sensor" viewBox="0 0 44 44"><circle cx="22" cy="22" r="14" fill="#555" stroke="#222"/><path d="M22 22 L30 14" stroke="#fff" stroke-width="2"/></symbol>
<symbol id="i-actuator" viewBox="0 0 44 44"><path d="M14 36 V18 a8 8 0 0 1 16 0 V36Z" fill="#222"/><rect x="12" y="34" width="20" height="5" fill="#444"/></symbol>
<symbol id="i-folder" viewBox="0 0 44 44"><path d="M4 12 h14 l4 4 h18 v22 h-36z" fill="url(#gBlueTop)" stroke="#2f6f80" stroke-width="1.3"/><path d="M4 18 h36" stroke="#2f6f80"/></symbol>
<symbol id="i-bolt" viewBox="0 0 44 44"><polygon points="33,2 13,24 22,24 9,42 37,16 26,16 38,2" fill="url(#gBolt)" stroke="#c0251a" stroke-width=".8"/></symbol>
<symbol id="i-grid" viewBox="0 0 44 44"><rect x="7" y="7" width="30" height="30" fill="#e7f1fb" stroke="#2f7d92" stroke-width="1.6"/><path d="M17 7 v30 M27 7 v30 M7 17 h30 M7 27 h30" stroke="#2f7d92" stroke-width="1.4"/></symbol>
<symbol id="i-netdev" viewBox="0 0 48 44">
  <g transform="translate(0 2) scale(.62)"><use href="#i-router"/></g>
  <g transform="translate(10 18) scale(.6)"><use href="#i-switch"/></g>
</symbol>
<symbol id="i-enddev" viewBox="0 0 48 44">
  <g transform="translate(14 0) scale(.66)"><use href="#i-pc"/></g>
  <g transform="translate(0 18) scale(.55)"><use href="#i-phone"/></g>
</symbol>
<symbol id="i-multiuser" viewBox="0 0 48 44"><g transform="translate(0 2) scale(.75)"><use href="#i-cloud"/></g><path d="M14 21 h16 M12 25 h20 M15 29 h13" stroke="#e8f4f7" stroke-width="1.6" stroke-linecap="round"/></symbol>

<!-- кабели -->
<symbol id="c-auto" viewBox="0 0 44 44"><use href="#i-bolt"/></symbol>
<symbol id="c-console" viewBox="0 0 44 44"><path d="M8 38 C8 10 30 8 38 6" fill="none" stroke="#56b1e6" stroke-width="3"/></symbol>
<symbol id="c-straight" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="currentColor" stroke-width="3"/></symbol>
<symbol id="c-cross" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="currentColor" stroke-width="3" stroke-dasharray="6 4"/></symbol>
<symbol id="c-fiber" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="#f39b1f" stroke-width="3"/></symbol>
<symbol id="c-phone" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="currentColor" stroke-width="3" stroke-dasharray="2 3"/></symbol>
<symbol id="c-coax" viewBox="0 0 44 44"><path d="M8 38 L18 22 L24 28 L36 6" fill="none" stroke="#2f6fd6" stroke-width="3"/></symbol>
<symbol id="c-dce" viewBox="0 0 44 44"><path d="M8 38 L18 22 L24 28 L36 6" fill="none" stroke="#d62f2f" stroke-width="3"/><circle cx="33" cy="33" r="5" fill="#fff" stroke="#333"/><path d="M33 30 v3 h2" stroke="#333" fill="none"/></symbol>
<symbol id="c-dte" viewBox="0 0 44 44"><path d="M8 38 L18 22 L24 28 L36 6" fill="none" stroke="#d62f2f" stroke-width="3"/></symbol>
<symbol id="c-octal" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="#3fae49" stroke-width="3"/></symbol>
<symbol id="c-usb" viewBox="0 0 44 44"><path d="M8 38 L38 6" stroke="#666" stroke-width="3" stroke-dasharray="8 2 2 2"/></symbol>

<!-- панели инструментов -->
<symbol id="t-new" viewBox="0 0 20 20"><path d="M4 1.5 h8.2 l4.3 4.3 v12.7 h-12.5z" fill="#3a3a3f"/><path d="M12.2 1.5 v4.3 h4.3" fill="#8e8e93"/></symbol>
<symbol id="t-open" viewBox="0 0 20 20"><path d="M1.5 4 h6 l1.7 1.8 h9.3 v11.7 h-17z" fill="#3a3a3f"/><path d="M2.6 8.3 h14.8" stroke="#d9d9d9" stroke-width="1"/></symbol>
<symbol id="t-save" viewBox="0 0 20 20"><path d="M2 2 h13 l3 3 v13 h-16z" fill="#3a3a3f"/><rect x="5.5" y="3" width="7.5" height="4.6" fill="#e2e2e2"/><rect x="10.5" y="3.6" width="1.6" height="3.4" fill="#3a3a3f"/></symbol>
<symbol id="t-print" viewBox="0 0 20 20"><rect x="5" y="1.8" width="10" height="4.5" fill="#3a3a3f"/><rect x="1.5" y="6.8" width="17" height="8" rx="1.8" fill="#3a3a3f"/><rect x="5" y="12" width="10" height="6.5" fill="#3a3a3f" stroke="#e2e2e2" stroke-width="1"/><circle cx="15.6" cy="9.3" r=".9" fill="#e2e2e2"/></symbol>
<symbol id="t-info" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.8" fill="#3a3a3f"/><rect x="8.9" y="8.6" width="2.3" height="6.4" rx=".6" fill="#fff"/><circle cx="10.05" cy="5.9" r="1.35" fill="#fff"/></symbol>
<symbol id="t-wizard" viewBox="0 0 20 20"><path d="M2.5 17.5 L8.3 1.5 L14 17.5z" fill="#3a3a3f"/><rect x="1.5" y="16.5" width="13.5" height="2.3" rx=".6" fill="#3a3a3f"/><path d="M8.2 7.5 l.5 1.1 1.2.2 -.9.8 .2 1.2 -1 -.6 -1 .6 .2 -1.2 -.9 -.8 1.2 -.2z M10 12.4 l.4 .8 .9 .1 -.7 .6 .2 .9 -.8 -.4 -.8 .4 .2 -.9 -.7 -.6 .9 -.1z M6.6 12.9 l.3 .6 .7 .1 -.5 .5 .1 .7 -.6 -.3 -.6 .3 .1 -.7 -.5 -.5 .7 -.1z" fill="#fff"/><path d="M14.6 5.5 L18.6 17.8" stroke="#3a3a3f" stroke-width="1.7"/></symbol>
<symbol id="t-train" viewBox="0 0 20 20"><path d="M1 7 L10 3 L19 7 L10 11Z" fill="#222"/><path d="M5 9 v5 c0 2 10 2 10 0 v-5 l-5 2.2z" fill="#222"/><path d="M18 7.5 v6" stroke="#222" stroke-width="1.4"/></symbol>
<symbol id="t-copy" viewBox="0 0 20 20"><path d="M2.5 1.8 h7 l2.3 2.3 v9.6 h-9.3z" fill="#fff" stroke="#3a3a3f" stroke-width="1.4"/><path d="M8 6.3 h7 l2.5 2.5 v9.4 h-9.5z" fill="#fff" stroke="#3a3a3f" stroke-width="1.4"/><path d="M10 11 h5.5 M10 13.4 h5.5 M10 15.8 h5.5 M4.5 6.5 h3 M4.5 9 h3" stroke="#3a3a3f" stroke-width="1.2"/></symbol>
<symbol id="t-paste" viewBox="0 0 20 20"><rect x="2.5" y="2.8" width="12.5" height="15.5" rx="1.2" fill="#3a3a3f"/><rect x="6" y="1.3" width="5.5" height="3" rx=".8" fill="#e2e2e2" stroke="#3a3a3f"/><path d="M8.3 7.3 h6.4 l2.8 2.8 v8.6 h-9.2z" fill="#fff" stroke="#3a3a3f" stroke-width="1.2"/><path d="M10 12 h5.5 M10 14.3 h5.5 M10 16.5 h5.5" stroke="#3a3a3f" stroke-width="1.1"/></symbol>
<symbol id="t-undo" viewBox="0 0 20 20"><path d="M6 17.5 V9.5 a5 5 0 0 1 10 0 V12" fill="none" stroke="#3a3a3f" stroke-width="2"/><path d="M2.8 14.3 L6 18.3 L9.2 14.3z" fill="#3a3a3f"/></symbol>
<symbol id="t-redo" viewBox="0 0 20 20"><path d="M14 17.5 V9.5 a5 5 0 0 0 -10 0 V12" fill="none" stroke="#3a3a3f" stroke-width="2"/><path d="M10.8 14.3 L14 18.3 L17.2 14.3z" fill="#3a3a3f"/></symbol>
<symbol id="t-zoomin" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6.2" fill="none" stroke="#3a3a3f" stroke-width="2.2"/><path d="M12.6 12.6 L18.2 18.2" stroke="#3a3a3f" stroke-width="3" stroke-linecap="round"/><path d="M4.8 8 h6.4 M8 4.8 v6.4" stroke="#3a3a3f" stroke-width="2"/></symbol>
<symbol id="t-zoomreset" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6.2" fill="none" stroke="#3a3a3f" stroke-width="2.2"/><path d="M12.6 12.6 L18.2 18.2" stroke="#3a3a3f" stroke-width="3" stroke-linecap="round"/><text x="8" y="11" font-size="8.5" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#3a3a3f">R</text></symbol>
<symbol id="t-zoomout" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6.2" fill="none" stroke="#3a3a3f" stroke-width="2.2"/><path d="M12.6 12.6 L18.2 18.2" stroke="#3a3a3f" stroke-width="3" stroke-linecap="round"/><path d="M4.8 8 h6.4" stroke="#3a3a3f" stroke-width="2"/></symbol>
<symbol id="t-palette" viewBox="0 0 20 20"><rect x="1.5" y="4" width="17" height="12.5" rx="1" fill="none" stroke="#3a3a3f" stroke-width="1.8"/><path d="M1.5 6.2 h17" stroke="#3a3a3f" stroke-width="2.6"/><circle cx="16.3" cy="5" r=".6" fill="#ddd"/></symbol>
<symbol id="t-devices" viewBox="0 0 20 20"><rect x="1.5" y="2.5" width="17" height="15" rx="1" fill="none" stroke="#3a3a3f" stroke-width="1.6"/><path d="M1.5 4.6 h17" stroke="#3a3a3f" stroke-width="2.4"/><path d="M7.5 8.4 h8 M7.5 11.4 h8 M7.5 14.4 h8" stroke="#3a3a3f" stroke-width="1.6"/><path d="M4.3 8.4 h1.4 M4.3 11.4 h1.4 M4.3 14.4 h1.4" stroke="#3a3a3f" stroke-width="1.6"/></symbol>
<symbol id="t-log" viewBox="0 0 20 20"><rect x="4" y="1.5" width="12" height="17" rx="1.2" fill="#3a3a3f"/><path d="M6.5 5.5 h7 M6.5 8.5 h7 M6.5 11.5 h7 M6.5 14.5 h4.5" stroke="#fff" stroke-width="1.3"/></symbol>
<symbol id="t-help" viewBox="0 0 20 20"><path d="M6 7 a4 4 0 1 1 6 3.4 c-1.4 .9 -2 1.6 -2 3.3" fill="none" stroke="#3a3a3f" stroke-width="2.4"/><circle cx="10" cy="17" r="1.5" fill="#3a3a3f"/></symbol>
<symbol id="t-select" viewBox="0 0 20 20"><path d="M1.5 6.5 v-3.5 h4 M8 3 h4 M14.5 3 h4 v3.5 M1.5 10 v3.5 h3 M18.5 10 v1.5" fill="none" stroke="#3a3a3f" stroke-width="1.7"/><path d="M10.5 9 L17.5 15.2 L14 15.4 L16 18.6 L14.6 19.4 L12.6 16.2 L10.5 18.6z" fill="#3a3a3f"/></symbol>
<symbol id="t-inspect" viewBox="0 0 20 20"><circle cx="8" cy="8" r="6.2" fill="none" stroke="#3a3a3f" stroke-width="2"/><path d="M12.6 12.6 L18.2 18.2" stroke="#3a3a3f" stroke-width="2.6" stroke-linecap="round"/></symbol>
<symbol id="t-delete" viewBox="0 0 20 20"><path d="M1.5 10 L6.5 4.5 h11 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-11z" fill="#3a3a3f"/><path d="M9.5 7.3 l5.2 5.4 M14.7 7.3 l-5.2 5.4" stroke="#fff" stroke-width="1.9"/></symbol>
<symbol id="t-resize" viewBox="0 0 20 20"><path d="M1.5 6.5 v-3.5 h4 M8 3 h4 M14.5 3 h3 v3 M1.5 10 v3.5 h3" fill="none" stroke="#3a3a3f" stroke-width="1.7"/><path d="M9.5 9.5 L17 17 M17 12.5 v4.5 h-4.5" fill="none" stroke="#3a3a3f" stroke-width="1.8"/></symbol>
<symbol id="t-note" viewBox="0 0 20 20"><rect x="3.8" y="2.6" width="12.4" height="16" rx="1.6" fill="#3a3a3f"/><rect x="7.2" y="1" width="5.6" height="3.2" rx="1" fill="#3a3a3f" stroke="#e2e2e2" stroke-width=".9"/><path d="M6.6 8 h6.8 M6.6 11 h6.8 M6.6 14 h4.5" stroke="#fff" stroke-width="1.4"/></symbol>
<symbol id="t-line" viewBox="0 0 20 20"><path d="M4 16 L16 4" stroke="#3a3a3f" stroke-width="2.3" stroke-linecap="round"/></symbol>
<symbol id="t-rect" viewBox="0 0 20 20"><rect x="2" y="5.5" width="16" height="9" rx=".8" fill="#3a3a3f"/></symbol>
<symbol id="t-ellipse" viewBox="0 0 20 20"><ellipse cx="10" cy="10" rx="8" ry="4.6" fill="#3a3a3f"/></symbol>
<symbol id="t-freeform" viewBox="0 0 20 20"><circle cx="13.2" cy="6" r="4.3" fill="#3a3a3f"/><circle cx="7" cy="13.6" r="4.8" fill="#3a3a3f"/><path d="M13.2 6 L7 13.6" stroke="#3a3a3f" stroke-width="6"/><path d="M14.6 3.8 a2.2 2.2 0 0 1 .9 1.6" stroke="#c9c9c9" stroke-width=".9" fill="none"/></symbol>
<symbol id="t-pdu" viewBox="0 0 20 20"><path d="M1.5 3.5 h17 v11.3 h-7.2 l-1.3 3.4 -1.3 -3.4 h-7.2z" fill="#3a3a3f"/><path d="M2.6 4.6 L10 10.4 L17.4 4.6" fill="none" stroke="#fff" stroke-width="1.4"/></symbol>
<symbol id="t-pdu2" viewBox="0 0 20 20"><path d="M1.5 8.2 L10 2 L18.5 8.2 V18 H1.5Z" fill="#3a3a3f"/><path d="M1.8 8.4 L10 13.3 L18.2 8.4" fill="none" stroke="#fff" stroke-width="1.4"/></symbol>
<symbol id="v-logical" viewBox="0 0 20 20"><path d="M4 15.5 L10 4.5 L16.5 14" stroke="#fff" stroke-width="1.4" fill="none"/><circle cx="4" cy="15.5" r="2.9" fill="#fff"/><circle cx="10" cy="4.5" r="2.9" fill="#fff"/><circle cx="16.5" cy="14" r="2.9" fill="#fff"/></symbol>
<symbol id="v-physical" viewBox="0 0 20 20"><rect x="2.5" y="1.5" width="15" height="17" fill="none" stroke="#dfe7f1" stroke-width="1.2"/><path d="M2.5 4.3 h15 M2.5 7.1 h15 M2.5 9.9 h15 M2.5 12.7 h15 M2.5 15.5 h15" stroke="#dfe7f1" stroke-width="1"/></symbol>
<symbol id="v-learn" viewBox="0 0 20 20"><path d="M2 4.5 C5 3.5 8 3.8 10 5.5 V17 C8 15.5 5 15.2 2 16Z" fill="#fff"/><path d="M18 4.5 C15 3.5 12 3.8 10 5.5 V17 C12 15.5 15 15.2 18 16Z" fill="#fff" opacity=".75"/></symbol>
<symbol id="v-training" viewBox="0 0 20 20"><path d="M1 7 L10 3 L19 7 L10 11Z" fill="#fff"/><path d="M5 9 v5 c0 2 10 2 10 0 v-5 l-5 2.2z" fill="#fff"/><path d="M18 7.5 v6" stroke="#fff" stroke-width="1.4"/></symbol>
<symbol id="v-back" viewBox="0 0 20 20"><path d="M8.5 3.5 L3.5 8.5 L8.5 13.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/><path d="M3.8 8.5 h8 a4.6 4.6 0 0 1 0 9.2 h-2.5" fill="none" stroke="#fff" stroke-width="2.4"/></symbol>
<symbol id="v-cluster" viewBox="0 0 20 20"><path d="M5 15 a4 4 0 0 1 -.4 -8 a5.3 5.3 0 0 1 9.9 -1.3 a4.2 4.2 0 0 1 1 8.3z" fill="#fff"/><path d="M15.5 11.5 v7 M12 15 h7" stroke="#0e284d" stroke-width="4"/><path d="M15.5 12 v6.5 M12.3 15.2 h6.4" stroke="#fff" stroke-width="2"/></symbol>
<symbol id="v-move" viewBox="0 0 20 20"><path d="M10 1.5 L12.6 4.6 H7.4Z M10 18.5 L12.6 15.4 H7.4Z M1.5 10 L4.6 7.4 V12.6Z M18.5 10 L15.4 7.4 V12.6Z" fill="#fff"/><circle cx="10" cy="10" r="1.3" fill="#fff"/></symbol>
<symbol id="v-bg" viewBox="0 0 20 20"><path d="M1.5 17 L7.2 8.5 L11.3 13.6 L14 10.6 L18.5 17Z" fill="#fff"/><circle cx="15" cy="4.8" r="2.2" fill="#fff"/></symbol>
<symbol id="v-viewport" viewBox="0 0 20 20"><rect x="2" y="4" width="16" height="12" fill="none" stroke="#fff" stroke-width="1.5"/><rect x="9" y="9" width="7" height="5" fill="#fff"/></symbol>
<symbol id="v-clock" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M10 5 v5 l3.5 2" stroke="#fff" stroke-width="1.8" fill="none"/></symbol>
<symbol id="v-power" viewBox="0 0 20 20"><path d="M6 5 a7 7 0 1 0 8 0" fill="none" stroke="#fff" stroke-width="2"/><path d="M10 2 v8" stroke="#fff" stroke-width="2"/></symbol>
<symbol id="v-ff" viewBox="0 0 20 20"><path d="M2 3.5 L10 10 L2 16.5Z M10 3.5 L18 10 L10 16.5Z" fill="#fff"/></symbol>
<symbol id="v-sim" viewBox="0 0 20 20"><rect x="8.6" y="1.2" width="2.8" height="2.6" fill="#fff"/><path d="M3.8 13 V10.6 a6.2 6.4 0 0 1 12.4 0 V13z" fill="#fff"/><rect x="5.6" y="8.6" width="8.8" height="2.4" rx="1" fill="#0e284d"/><rect x="2" y="13.4" width="16" height="3.4" fill="#fff"/><path d="M3.5 16.8 v2 M7.5 16.8 v2 M12.5 16.8 v2 M16.5 16.8 v2" stroke="#fff" stroke-width="1.6"/></symbol>
<symbol id="t-user" viewBox="0 0 20 20"><circle cx="7.5" cy="8.3" r="3.6" fill="#3a3a3f"/><path d="M1 19 c0-5 2.9-7.3 6.5-7.3 s6.5 2.3 6.5 7.3z" fill="#3a3a3f"/><path d="M11.5 3.2 h7 M18.5 6.8 h-6" stroke="#3a3a3f" stroke-width="1.5"/><path d="M13.7 1.2 L11.2 3.2 L13.7 5.2z M16.4 4.8 L18.9 6.8 L16.4 8.8z" fill="#3a3a3f"/></symbol>
<symbol id="t-custom" viewBox="0 0 20 20"><rect x="1" y="5" width="18" height="4.8" rx=".8" fill="#3a3a3f"/><rect x="1" y="11" width="18" height="4.8" rx=".8" fill="#3a3a3f"/><path d="M3 7.4 h6 M12 7.4 h1.5 M15 7.4 h1.5" stroke="#e2e2e2" stroke-width="1.3"/><path d="M3.2 13.4 h1.6 M5.8 13.4 h1.6 M8.4 13.4 h1.6 M11 13.4 h1.6 M13.6 13.4 h1.6" stroke="#e2e2e2" stroke-width="1.6"/></symbol>
<symbol id="t-cluster" viewBox="0 0 20 20"><rect x="1.5" y="2.5" width="17" height="15" rx="1.4" fill="#3a3a3f"/><rect x="3.2" y="4.2" width="13.6" height="11.6" rx=".6" fill="#e2e2e2"/><path d="M6.7 13.2 a2.3 2.3 0 0 1 -.3 -4.5 a3.3 3.3 0 0 1 6.1 -1 a2.4 2.4 0 0 1 1.6 4.4 l-.4 1.1z" fill="#3a3a3f"/><ellipse cx="10" cy="11.4" rx="2.1" ry=".9" fill="#e2e2e2"/></symbol>
<symbol id="v-env" viewBox="0 0 24 20"><circle cx="7" cy="13" r="6" fill="none" stroke="#fff" stroke-width="1.3"/><path d="M1 13 h12 M7 7 v12 M2.2 10 h9.6 M2.2 16 h9.6" stroke="#fff" stroke-width=".9"/><ellipse cx="7" cy="13" rx="2.6" ry="6" fill="none" stroke="#fff" stroke-width=".9"/><path d="M11 3.5 h12 M12 9 h11" stroke="#fff" stroke-width="1.4"/><path d="M13.5 1.5 L10.8 3.5 L13.5 5.5z M20.5 7 L23.2 9 L20.5 11z" fill="#fff"/></symbol>
<symbol id="v-cycle" viewBox="0 0 20 20"><path d="M7.4 3.6 A7.2 7.2 0 1 0 13.2 3.9" fill="none" stroke="#fff" stroke-width="1.9"/><path d="M9.6 1 L5.8 3.5 L9.7 6.1z" fill="#fff"/><circle cx="10" cy="10.6" r="1.2" fill="#fff"/></symbol>
<symbol id="v-rt" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9.2" fill="#fff"/><path d="M8.6 4.3 V11.8 h3.2" fill="none" stroke="#0779ad" stroke-width="2.1" stroke-linecap="round"/></symbol>
<!-- рабочий стол ПК -->
<symbol id="d-ip" viewBox="0 0 56 56"><rect x="6" y="6" width="44" height="32" rx="3" fill="#5b6470"/><rect x="9" y="9" width="38" height="26" rx="1" fill="url(#dScr)"/><path d="M23 38 h10 l2 6 h-14z" fill="#8a929c"/><rect x="16" y="44" width="24" height="4" rx="1.5" fill="#6d7580"/><text x="28" y="28" font-size="13" font-weight="bold" text-anchor="middle" font-family="Arial" fill="#fff">IP</text></symbol>
<symbol id="d-dialup" viewBox="0 0 56 56"><path d="M10 30 c0 -14 36 -14 36 0 l-7 3 -2 -5 c-5 -2 -13 -2 -18 0 l-2 5z" fill="#3e4650"/><path d="M16 32 h24 l5 14 h-34z" fill="#d9d4c7" stroke="#8d877a"/><g fill="#5b5f66"><circle cx="22" cy="37" r="1.6"/><circle cx="28" cy="37" r="1.6"/><circle cx="34" cy="37" r="1.6"/><circle cx="22" cy="42" r="1.6"/><circle cx="28" cy="42" r="1.6"/><circle cx="34" cy="42" r="1.6"/></g></symbol>
<symbol id="d-terminal" viewBox="0 0 56 56"><rect x="5" y="8" width="46" height="38" rx="2.5" fill="#20242a" stroke="#4d545c"/><rect x="5" y="8" width="46" height="7" rx="2.5" fill="#c9ced4"/><circle cx="10" cy="11.5" r="1.4" fill="#e0574f"/><circle cx="14.5" cy="11.5" r="1.4" fill="#e6b13a"/><circle cx="19" cy="11.5" r="1.4" fill="#4bb04f"/><path d="M11 22 l6 4 -6 4" fill="none" stroke="#62e06b" stroke-width="2"/><path d="M20 31 h9" stroke="#62e06b" stroke-width="2"/></symbol>
<symbol id="d-cmd" viewBox="0 0 56 56"><rect x="5" y="8" width="46" height="38" rx="2.5" fill="#20242a" stroke="#4d545c"/><rect x="5" y="8" width="46" height="7" rx="2.5" fill="#c9ced4"/><circle cx="10" cy="11.5" r="1.4" fill="#e0574f"/><circle cx="14.5" cy="11.5" r="1.4" fill="#e6b13a"/><circle cx="19" cy="11.5" r="1.4" fill="#4bb04f"/><text x="10" y="28" font-size="9" font-family="Menlo, Consolas, monospace" fill="#e9ecef">C:\\&gt;_</text></symbol>
<symbol id="d-web" viewBox="0 0 56 56"><rect x="5" y="8" width="46" height="38" rx="2.5" fill="#fff" stroke="#7d8790"/><rect x="5" y="8" width="46" height="7" rx="2.5" fill="#d4dae0"/><rect x="16" y="10" width="30" height="3" rx="1.5" fill="#fff"/><circle cx="28" cy="31" r="10" fill="#3d8fdc"/><path d="M18 31 h20 M28 21 v20 M20.5 25 h15 M20.5 37 h15" stroke="#cfe6fb" stroke-width="1"/><ellipse cx="28" cy="31" rx="4.5" ry="10" fill="none" stroke="#cfe6fb"/></symbol>
<symbol id="d-wireless" viewBox="0 0 56 56"><rect x="8" y="26" width="40" height="18" rx="2" fill="#4c5560"/><rect x="11" y="29" width="22" height="12" fill="#c4a95a"/><path d="M38 20 a6 6 0 0 1 6 6 M38 15 a11 11 0 0 1 11 11" fill="none" stroke="#3d8fdc" stroke-width="2.2"/><circle cx="38" cy="26" r="2" fill="#3d8fdc"/></symbol>
<symbol id="d-vpn" viewBox="0 0 56 56"><path d="M19 26 v-6 a9 9 0 0 1 18 0 v6" fill="none" stroke="#8b939c" stroke-width="4"/><rect x="13" y="25" width="30" height="22" rx="3" fill="#e2b13c" stroke="#a87c1a"/><circle cx="28" cy="34" r="3" fill="#6b4c0c"/><rect x="27" y="35" width="2" height="6" fill="#6b4c0c"/></symbol>
<symbol id="d-traffic" viewBox="0 0 56 56"><rect x="4" y="12" width="20" height="15" rx="1.5" fill="#5b6470"/><rect x="6" y="14" width="16" height="11" fill="url(#dScr)"/><rect x="32" y="29" width="20" height="15" rx="1.5" fill="#5b6470"/><rect x="34" y="31" width="16" height="11" fill="url(#dScr)"/><path d="M24 22 h12 l-3 -3 M32 34 h-12 l3 3" fill="none" stroke="#e8792b" stroke-width="2.2"/></symbol>
<symbol id="d-mib" viewBox="0 0 56 56"><path d="M8 12 c7 -3 14 -3 20 1 v32 c-6 -4 -13 -4 -20 -1z" fill="#3d8fdc"/><path d="M48 12 c-7 -3 -14 -3 -20 1 v32 c6 -4 13 -4 20 -1z" fill="#6aaef0"/><path d="M12 20 h11 M12 25 h11 M12 30 h9 M33 20 h11 M33 25 h11 M33 30 h9" stroke="#fff" stroke-width="1.4"/></symbol>
<symbol id="d-ipcomm" viewBox="0 0 56 56"><rect x="10" y="8" width="36" height="40" rx="5" fill="#3c4148"/><rect x="14" y="12" width="28" height="14" rx="1" fill="url(#dScr)"/><g fill="#c9ced4"><rect x="15" y="30" width="7" height="4" rx="1"/><rect x="24.5" y="30" width="7" height="4" rx="1"/><rect x="34" y="30" width="7" height="4" rx="1"/><rect x="15" y="36" width="7" height="4" rx="1"/><rect x="24.5" y="36" width="7" height="4" rx="1"/><rect x="34" y="36" width="7" height="4" rx="1"/></g></symbol>
<symbol id="d-email" viewBox="0 0 56 56"><rect x="6" y="13" width="44" height="30" rx="2" fill="#fff" stroke="#7d8790" stroke-width="1.4"/><path d="M6.5 14 L28 31 L49.5 14" fill="none" stroke="#7d8790" stroke-width="1.6"/><path d="M6.5 42 L22 27 M49.5 42 L34 27" stroke="#b5bcc3"/><circle cx="44" cy="15" r="6" fill="#e0574f"/><text x="44" y="18" font-size="8" font-weight="bold" text-anchor="middle" fill="#fff" font-family="Arial">1</text></symbol>
<symbol id="d-pppoe" viewBox="0 0 56 56"><rect x="6" y="6" width="44" height="32" rx="3" fill="#5b6470"/><rect x="9" y="9" width="38" height="26" rx="1" fill="url(#dScr)"/><path d="M23 38 h10 l2 6 h-14z" fill="#8a929c"/><rect x="16" y="44" width="24" height="4" rx="1.5" fill="#6d7580"/><path d="M16 22 h24" stroke="#fff" stroke-width="2"/><circle cx="16" cy="22" r="3" fill="#fff"/><circle cx="40" cy="22" r="3" fill="#fff"/><text x="28" y="32" font-size="6" text-anchor="middle" font-family="Arial" fill="#fff">PPPoE</text></symbol>
<symbol id="d-text" viewBox="0 0 56 56"><path d="M12 6 h26 l8 8 v36 h-34z" fill="#fff" stroke="#7d8790" stroke-width="1.4"/><path d="M38 6 v8 h8" fill="#e3e7eb" stroke="#7d8790"/><path d="M17 20 h22 M17 25 h22 M17 30 h22 M17 35 h14" stroke="#9aa3ac" stroke-width="1.5"/><path d="M30 46 L46 30 l4 4 -16 16 -5 1z" fill="#e8b33c" stroke="#8a6512"/></symbol>
<symbol id="d-firewall" viewBox="0 0 56 56"><rect x="6" y="14" width="44" height="32" fill="#b9472e" stroke="#6e2416"/><path d="M6 22 h44 M6 30 h44 M6 38 h44 M16 14 v8 M30 14 v8 M44 14 v8 M10 22 v8 M24 22 v8 M38 22 v8 M16 30 v8 M30 30 v8 M44 30 v8 M10 38 v8 M24 38 v8 M38 38 v8" stroke="#f1d2c7" stroke-width="1.4"/><path d="M40 4 c4 4 8 6 6 12 c3 -1 4 -3 4 -5 c3 5 1 9 -4 10 c-5 1 -9 -3 -8 -7 c0 -4 3 -5 2 -10z" fill="#ff9d1c"/></symbol>
<symbol id="d-ipv6fw" viewBox="0 0 56 56"><rect x="6" y="14" width="44" height="32" fill="#b9472e" stroke="#6e2416"/><path d="M6 22 h44 M6 30 h44 M6 38 h44 M16 14 v8 M30 14 v8 M44 14 v8 M10 22 v8 M24 22 v8 M38 22 v8 M16 30 v8 M30 30 v8 M44 30 v8 M10 38 v8 M24 38 v8 M38 38 v8" stroke="#f1d2c7" stroke-width="1.4"/><rect x="14" y="23" width="28" height="13" rx="2" fill="#fff"/><text x="28" y="33" font-size="9" font-weight="bold" text-anchor="middle" font-family="Arial" fill="#6e2416">IPv6</text></symbol>
<symbol id="d-netflow" viewBox="0 0 56 56"><rect x="6" y="6" width="44" height="32" rx="3" fill="#5b6470"/><rect x="9" y="9" width="38" height="26" rx="1" fill="url(#dScr)"/><path d="M23 38 h10 l2 6 h-14z" fill="#8a929c"/><rect x="16" y="44" width="24" height="4" rx="1.5" fill="#6d7580"/><path d="M13 31 l7 -7 6 4 8 -9 9 6" fill="none" stroke="#ffd34d" stroke-width="2"/></symbol>
<symbol id="p-back" viewBox="0 0 20 20"><path d="M3 4 v12 M17 4 L7 10 L17 16Z" fill="#fff" stroke="#fff" stroke-width="2"/></symbol>
<symbol id="p-play" viewBox="0 0 20 20"><path d="M5 3 L17 10 L5 17Z" fill="#fff"/></symbol>
<symbol id="p-pause" viewBox="0 0 20 20"><rect x="4" y="3" width="4" height="14" fill="#fff"/><rect x="12" y="3" width="4" height="14" fill="#fff"/></symbol>
<symbol id="p-fwd" viewBox="0 0 20 20"><path d="M17 4 v12 M3 4 L13 10 L3 16Z" fill="#fff" stroke="#fff" stroke-width="2"/></symbol>
<symbol id="p-env" viewBox="0 0 24 18"><rect x="1" y="1" width="22" height="16" rx="1.5" fill="currentColor" stroke="#333"/><path d="M1 2 L12 10 L23 2" fill="none" stroke="#333" stroke-width="1.3"/></symbol>
</svg>`;

function iconUse(id, w, h, extra = '') {
  return '<svg class="ico" width="' + w + '" height="' + h + '" ' + extra + '><use href="#' + id + '"/></svg>';
}

function deviceIconId(dev) {
  const cat = DEVICE_CATALOG[dev.model];
  if (dev.type === 'router') return 'i-router';
  if (dev.type === 'switch') return 'i-switch';
  if (dev.type === 'hub') return 'i-hub';
  return 'i-' + (cat.icon || 'pc');
}

// Размер иконки устройства на логической схеме
function deviceIconSize(dev) {
  if (dev.type === 'router') return [52, 37];
  if (dev.type === 'switch' || dev.type === 'hub') return [54, 34];
  if (dev.model === 'Server') return [30, 38];
  if (dev.model === 'Laptop') return [46, 36];
  return [42, 37];
}

// ---------- Передние/задние панели (Physical-вид) ----------
// Возвращает {w, h, svg, ports:[{name, x, y}]}
function frontPanel(dev, topo, scale = 1) {
  const cat = DEVICE_CATALOG[dev.model];
  const ports = [];
  const led = (name) => {
    const up = topo && name && portPhysUp(topo, dev.id, name);
    return up ? '#5fe05f' : '#3b3b3b';
  };
  const portJack = (x, y, name, w = 9, h = 7) => {
    ports.push({ name, x: x + w / 2, y: y + h / 2 });
    return '<g class="pjack" data-port="' + escapeHtml(name) + '"><rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="#111" stroke="#9aa" stroke-width=".6"/>' +
      '<rect x="' + (x + 1.5) + '" y="' + (y + 1) + '" width="2" height="1.4" fill="' + led(name) + '"/><rect x="' + (x + w - 3.5) + '" y="' + (y + 1) + '" width="2" height="1.4" fill="' + led(name) + '"/></g>';
  };
  let w, h, body = '';
  if (dev.type === 'switch') {
    w = 300; h = 34;
    body += '<defs><linearGradient id="swFace" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#e3e6e9"/><stop offset="1" stop-color="#b9bfc5"/></linearGradient></defs>';
    body += '<rect width="300" height="34" rx="2" fill="url(#swFace)" stroke="#6f767d"/><rect x="1" y="1" width="298" height="2" fill="#f6f7f8"/>';
    body += '<rect x="0" y="0" width="5" height="34" fill="#9aa1a8"/><rect x="295" y="0" width="5" height="34" fill="#9aa1a8"/><circle cx="2.5" cy="6" r="1" fill="#555"/><circle cx="2.5" cy="28" r="1" fill="#555"/><circle cx="297.5" cy="6" r="1" fill="#555"/><circle cx="297.5" cy="28" r="1" fill="#555"/>';
    // левая панель: светодиоды и кнопка MODE
    body += '<rect x="8" y="4" width="36" height="26" rx="1.5" fill="#d7dbdf" stroke="#9aa1a8" stroke-width=".5"/>';
    ['SYST', 'RPS', 'STAT', 'DUPLX', 'SPEED'].forEach((t, i) => {
      body += '<circle cx="12" cy="' + (8 + i * 4.6) + '" r="1.2" fill="' + (dev.off ? '#555' : i === 0 ? '#3fdc4a' : i === 1 ? '#555' : i === 2 ? '#3fdc4a' : '#666') + '"/><text x="15" y="' + (9.4 + i * 4.6) + '" font-size="3.2" fill="#333">' + t + '</text>';
    });
    body += '<rect x="33" y="22" width="8" height="5" rx="1" fill="#444" stroke="#222" stroke-width=".4"/><text x="37" y="20.6" font-size="2.8" text-anchor="middle" fill="#333">MODE</text>';
    body += '<text x="50" y="11" font-size="4.6" font-weight="bold" fill="#2a3540">Catalyst ' + escapeHtml(dev.model.startsWith('2950') ? '2950' : '2960') + '</text><text x="50" y="16" font-size="3.4" fill="#4a5560">SERIES</text>';
    body += '<text x="50" y="30" font-size="4" fill="#4a5560">' + escapeHtml(cat.display) + '</text>';
    const fe = cat.ports.filter((p) => p.startsWith('Fast'));
    for (let g = 0; g < Math.ceil(fe.length / 12); g++) body += '<rect x="' + (98 + g * 82) + '" y="5" width="77" height="24" rx="1" fill="#2a2d31" stroke="#55595e" stroke-width=".5"/>';
    fe.forEach((p, i) => {
      const grp = Math.floor(i / 12), col = Math.floor((i % 12) / 2), row = i % 2;
      body += portJack(100 + grp * 82 + col * 12.5, 7 + row * 12, p);
      if (row === 0) body += '<text x="' + (104.5 + grp * 82 + col * 12.5) + '" y="4.2" font-size="2.6" text-anchor="middle" fill="#333">' + (i + 1) + '</text>';
    });
    const ge = cat.ports.filter((p) => p.startsWith('Gigabit'));
    if (ge.length) body += '<rect x="269" y="5" width="25" height="24" rx="1" fill="#2a2d31" stroke="#55595e" stroke-width=".5"/>';
    ge.forEach((p, i) => { body += portJack(272 + (i % 2) * 12 - (ge.length > 1 ? 0 : 0), 7 + i * 12, p, 10, 8); });
    if (ge.length) body += '<text x="281.5" y="32.6" font-size="2.6" text-anchor="middle" fill="#333">10/100/1000</text>';
  } else if (dev.type === 'router') {
    const gis = cat.ports;
    const isr4 = dev.model.startsWith('43');
    w = 300; h = isr4 ? 44 : 50;
    body += '<defs><linearGradient id="rtFace' + (isr4 ? 4 : 1) + '" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="' + (isr4 ? '#3a3d42' : '#5a6068') + '"/><stop offset="1" stop-color="' + (isr4 ? '#16181b' : '#2f343a') + '"/></linearGradient></defs>';
    body += '<rect width="300" height="' + h + '" rx="2" fill="url(#rtFace' + (isr4 ? 4 : 1) + ')" stroke="#0e0f11"/><rect x="1" y="1" width="298" height="1.5" fill="rgba(255,255,255,.18)"/>';
    // крепёжные уши с винтами
    body += '<rect x="0" y="0" width="5" height="' + h + '" fill="#26292d"/><rect x="295" y="0" width="5" height="' + h + '" fill="#26292d"/>';
    for (const x of [2.5, 297.5]) body += '<circle cx="' + x + '" cy="6" r="1.1" fill="#8a9097"/><circle cx="' + x + '" cy="' + (h - 6) + '" r="1.1" fill="#8a9097"/>';
    gis.forEach((p, i) => {
      body += portJack(10 + i * 14, isr4 ? 8 : 30, p, 11, 9);
      body += '<text x="' + (15.5 + i * 14) + '" y="' + (isr4 ? 22.5 : 44.5) + '" font-size="2.7" text-anchor="middle" fill="#c9d1d8">' + (isr4 ? '0/0/' + i : 'GE 0/' + i) + '</text>';
    });
    // светодиоды
    const leds = isr4 ? [['PWR', true], ['STAT', true], ['ACT', false], ['SYS', true]] : [['SYS', true], ['ACT', false], ['POE', false]];
    leds.forEach(([t, on], i) => {
      const lx = isr4 ? 12 + i * 11 : 12 + i * 12, ly = isr4 ? 29 : 12;
      body += '<circle cx="' + lx + '" cy="' + ly + '" r="1.3" fill="' + (dev.off || !on ? '#4a4a4a' : '#45e24f') + '"/><text x="' + lx + '" y="' + (ly + 4.5) + '" font-size="2.6" text-anchor="middle" fill="#c9d1d8">' + t + '</text>';
    });
    // слоты модулей с заглушками
    const slots = isr4 ? 3 : 2;
    for (let i = 0; i < slots; i++) {
      const sx = 70 + i * 70, sy = 6, sh = isr4 ? 30 : 18;
      body += '<rect x="' + sx + '" y="' + sy + '" width="62" height="' + sh + '" rx="1" fill="#0f1012" stroke="#5a5e63" stroke-width=".7"/>';
      body += '<rect x="' + (sx + 3) + '" y="' + (sy + 2.5) + '" width="56" height="' + (sh - 5) + '" fill="none" stroke="#2c2f33" stroke-width=".6"/>';
      body += '<circle cx="' + (sx + 5) + '" cy="' + (sy + sh / 2) + '" r="1.2" fill="#7d838a"/><circle cx="' + (sx + 57) + '" cy="' + (sy + sh / 2) + '" r="1.2" fill="#7d838a"/>';
      body += '<text x="' + (sx + 31) + '" y="' + (sy + sh / 2 + 1.3) + '" font-size="3.6" text-anchor="middle" fill="#8d949b">' + (isr4 ? (i === 2 ? 'SM-X 0/2' : 'NIM 0/' + (i + 1)) : 'HWIC ' + i) + '</text>';
    }
    body += '<text x="12" y="' + (h - 4) + '" font-size="5" font-weight="bold" fill="#dfe5ea">' + escapeHtml(cat.display) + '</text>';
    if (!isr4) body += '<text x="150" y="' + (h - 5) + '" font-size="3.6" fill="#aeb6bd">EHWIC SLOTS</text><rect x="232" y="30" width="8" height="5" fill="#111" stroke="#7aa9c9" stroke-width=".6"/><text x="236" y="39" font-size="2.6" text-anchor="middle" fill="#c9d1d8">USB</text>';
  } else if (dev.type === 'hub') {
    w = 150; h = 26;
    body += '<rect width="150" height="26" rx="2" fill="#3e4a55" stroke="#1d242b"/>';
    cat.ports.forEach((p, i) => { body += portJack(40 + i * 16, 9, p); });
  } else if (dev.model === 'Server') {
    w = 120; h = 90;
    body += '<rect width="120" height="90" rx="3" fill="#2d3238" stroke="#111"/>';
    for (let i = 0; i < 6; i++) body += '<rect x="8" y="' + (8 + i * 12) + '" width="40" height="9" fill="#444" stroke="#111"/>';
    body += '<rect x="56" y="8" width="40" height="74" fill="#9aa3ab" stroke="#555"/>';
    body += portJack(100, 40, 'FastEthernet0', 12, 10);
  } else if (dev.model === 'Laptop') {
    w = 90; h = 52;
    body += '<polygon points="10,0 80,0 76,34 14,34" fill="#575d64" stroke="#2a2d31"/><polygon points="14,3 76,3 73,31 17,31" fill="#9bc9e8"/>';
    body += '<polygon points="14,34 76,34 90,48 0,48" fill="#8c939a" stroke="#2a2d31"/>';
    body += portJack(78, 40, 'FastEthernet0', 8, 6);
  } else if (dev.model === 'Printer') {
    w = 70; h = 46;
    body += '<rect x="5" y="10" width="60" height="30" rx="3" fill="#d8d4c8" stroke="#555"/><rect x="15" y="2" width="40" height="10" fill="#fff" stroke="#555"/>';
    body += portJack(55, 30, 'FastEthernet0', 8, 6);
  } else {
    w = 56; h = 96;
    body += '<defs><linearGradient id="pcFace" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#bfc3c7"/><stop offset=".5" stop-color="#e4e6e8"/><stop offset="1" stop-color="#b3b8bd"/></linearGradient></defs>';
    body += '<rect x="4" width="48" height="96" rx="3" fill="url(#pcFace)" stroke="#555"/>';
    for (let i = 0; i < 2; i++) body += '<rect x="10" y="' + (7 + i * 9) + '" width="36" height="7" rx=".8" fill="#f3f3f3" stroke="#8a8f94" stroke-width=".7"/><rect x="38" y="' + (9.5 + i * 9) + '" width="5" height="1.6" fill="#9aa"/>';
    body += '<rect x="10" y="26" width="36" height="4" rx=".6" fill="#d0d3d6" stroke="#8a8f94" stroke-width=".6"/>';
    body += '<circle cx="28" cy="38" r="3.4" fill="#d9dcdf" stroke="#666" stroke-width=".8"/><path d="M28 35.8 v2.3 M26.3 36.6 a2.2 2.2 0 1 0 3.4 0" fill="none" stroke="#444" stroke-width=".6"/>';
    body += '<circle cx="36" cy="38" r="1.1" fill="' + (dev.off ? '#600' : '#3fdc4a') + '"/><circle cx="20" cy="38" r="1.1" fill="#d9a400"/>';
    body += '<rect x="8" y="50" width="40" height="40" rx="1" fill="#4b4f54" stroke="#2c2f33"/>';
    for (let i = 0; i < 6; i++) body += '<path d="M10 ' + (54 + i * 6) + ' h36" stroke="#6d7277" stroke-dasharray="2 1"/>';
    body += portJack(18, 80, 'FastEthernet0', 10, 7);
  }
  if (dev.off) body += '<rect width="' + w + '" height="' + h + '" fill="#000" opacity=".25"/>';
  return { w: w * scale, h: h * scale, scale, ports: ports.map((p) => ({ ...p, x: p.x * scale, y: p.y * scale })),
    svg: '<g transform="scale(' + scale + ')">' + body + '</g>' };
}

function rearPanel(dev, scale = 1) {
  const w = 300, h = dev.type === 'router' ? 50 : 40;
  let b = '<rect width="' + w + '" height="' + h + '" rx="2" fill="#2a2e33" stroke="#0e0f11"/>';
  b += '<rect x="20" y="12" width="16" height="12" fill="#111" stroke="#5fb4e8"/><text x="28" y="31" font-size="5" text-anchor="middle" fill="#9cd">CONSOLE</text>';
  if (dev.type === 'router') b += '<rect x="44" y="12" width="16" height="12" fill="#111" stroke="#888"/><text x="52" y="31" font-size="5" text-anchor="middle" fill="#aaa">AUX</text>';
  b += '<rect x="0" y="0" width="5" height="' + h + '" fill="#1f2226"/><rect x="295" y="0" width="5" height="' + h + '" fill="#1f2226"/>';
  b += '<text x="76" y="' + (h / 2 + 1.5) + '" font-size="3.6" fill="#7e868d">' + escapeHtml(DEVICE_CATALOG[dev.model].display) + '</text>';
  // вентилятор блока питания
  b += '<rect x="186" y="8" width="' + (h - 16) + '" height="' + (h - 16) + '" rx="2" fill="#141517" stroke="#555"/>';
  const fc = 186 + (h - 16) / 2, fr = (h - 16) / 2 - 2;
  for (let r = fr; r > 1; r -= 2.4) b += '<circle cx="' + fc + '" cy="' + (h / 2) + '" r="' + r + '" fill="none" stroke="#3b3e42" stroke-width=".7"/>';
  b += '<path d="M' + (fc - fr) + ' ' + (h / 2) + ' h' + 2 * fr + ' M' + fc + ' ' + (h / 2 - fr) + ' v' + 2 * fr + '" stroke="#3b3e42" stroke-width=".7"/>';
  b += '<rect x="230" y="8" width="30" height="' + (h - 16) + '" rx="3" fill="#111" stroke="#666"/><text x="245" y="' + (h - 2) + '" font-size="5" text-anchor="middle" fill="#aaa">PSU</text>';
  b += '<rect x="238" y="' + (h / 2 - 6) + '" width="14" height="10" rx="1.5" fill="#050505" stroke="#888" stroke-width=".6"/><rect x="241" y="' + (h / 2 - 3) + '" width="2" height="4" fill="#777"/><rect x="247" y="' + (h / 2 - 3) + '" width="2" height="4" fill="#777"/><text x="245" y="' + (h / 2 + 8) + '" font-size="2.6" text-anchor="middle" fill="#999">100-240V~</text>';
  if (dev.type === 'router' || dev.type === 'pc') {
    b += '<g class="power-btn" style="cursor:pointer"><rect x="272" y="12" width="14" height="22" rx="2" fill="#111" stroke="#888"/>' +
      '<circle cx="279" cy="18" r="2.4" fill="' + (dev.off ? '#333' : '#5fe05f') + '"/><text x="279" y="31" font-size="5" text-anchor="middle" fill="#ccc">I/O</text></g>';
  }
  return { w: w * scale, h: h * scale, svg: '<g transform="scale(' + scale + ')">' + b + '</g>' };
}
