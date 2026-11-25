/* Visual HSE — app shell, router and screens. Plain JS, no dependencies. */
(function () {
  'use strict';
  var D = window.HSE;

  /* ================================================================ helpers */
  var ICON = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    alert: 'M12 3l10 18H2L12 3zM12 10v4M12 17.5v.5',
    lock: 'M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5z',
    checkSq: 'M9 11l3 3 8-8M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9',
    list: 'M4 6h16M4 12h16M4 18h10',
    shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
    cap: 'M2 9l10-5 10 5-10 5L2 9zM6 11v5c3 2 9 2 12 0v-5',
    bars: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    factory: 'M3 21h18M5 21V9l5 3V9l5 3V5h4v16',
    clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0',
    search: 'M11 3.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM20.5 20.5l-4.2-4.2',
    send: 'M5 12h14M13 6l6 6-6 6',
    menu: 'M4 7h16M4 12h16M4 17h16',
    plus: 'M12 5v14M5 12h14',
    check: 'M5 12l5 5L20 7',
    x: 'M6 6l12 12M18 6L6 18',
    wait: 'M12 7v5l3 2',
    thermo: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
    activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
    refresh: 'M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5',
    download: 'M12 4v11M7 10l5 5 5-5M5 20h14',
    file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
    camera: 'M4 8h3l2-3h6l2 3h3v11H4zM12 10.5a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    chevDown: 'M6 9l6 6 6-6'
  };
  function ic(name, cls) { return '<span class="i' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + ICON[name] + '"/></svg></span>'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v, unit) { return esc(v) + (unit ? '<span class="u">' + esc(unit) + '</span>' : ''); }
  function lvl(score) { return score >= 70 ? 'act' : score >= 40 ? 'watch' : 'low'; }
  function lvlName(score) { return score >= 70 ? 'Act' : score >= 40 ? 'Watch' : 'Low'; }
  var SEV = { High: 'act', Medium: 'watch', Low: 'low', Off: 'off', Info: 'info' };
  function chip(text, tone) { return '<span class="chip ' + tone + '">' + esc(text) + '</span>'; }
  function on(action, arg) { return ' data-on="' + action + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : ''); }
  function cells(n, total, tone) {
    var s = '';
    for (var i = 0; i < total; i++) s += '<span' + (i < n ? ' class="on"' : '') + '></span>';
    return '<div class="cells ' + (tone || '') + '" style="grid-template-columns:repeat(' + total + ',1fr)" aria-hidden="true">' + s + '</div>';
  }
  function kpis(items) {
    return '<div class="kpis">' + items.map(function (k) {
      return '<div class="kpi"><div class="kpi-top">' + esc(k[0]) + (k[4] || '') + '</div>' +
        '<div class="num">' + num(k[1], k[2]) + '</div><div class="meta">' + k[3] + '</div>' + (k[5] || '') + '</div>';
    }).join('') + '</div>';
  }
  function head(title, desc, tools) {
    return '<header class="page-head"><div><h1>' + title + '</h1><p>' + desc + '</p></div>' + (tools ? '<div class="head-tools">' + tools + '</div>' : '') + '</header>';
  }
  function card(title, sub, body, extra, cls) {
    return '<section class="card ' + (cls || '') + '"><div class="card-head"><div><h2>' + title + '</h2>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (extra || '') + '</div>' + body + '</section>';
  }
  function checkRow(state, label) {
    var name = state === 'ok' || state === 1 ? 'ok' : state === 'no' || state === 0 ? 'no' : 'wait';
    var icon = name === 'ok' ? 'check' : name === 'no' ? 'x' : 'clock';
    var sr = name === 'ok' ? 'Done: ' : name === 'no' ? 'Failed: ' : 'Waiting: ';
    return '<div class="check ' + name + '">' + ic(icon) + '<span><span class="sr">' + sr + '</span>' + esc(label) + '</span></div>';
  }
  function foot(left, right) { return '<footer class="foot"><span>' + left + '</span>' + (right ? '<span>' + right + '</span>' : '') + '</footer>'; }

  /* ================================================================ state */
  var S = {
    route: 'control',
    range: 'shift', zone: 'Press 3', evFilter: 'All',
    cam: 'CAM 03',
    incFilter: 'All', inc: 'INC-0412', approved: {},
    permitDecisions: {},
    answers: { 0: 'pass', 1: 'pass', 2: 'fail', 3: 'pass' },
    owner: 'Everyone', stage: {},
    std: 'ISO 45001',
    gapsOnly: false,
    routinesOff: { 3: true },
    askNote: false
  };

  var PAGES = [
    { id: 'control', nav: 'Overview', icon: 'grid' },
    { id: 'live', nav: 'Live floor', icon: 'eye' },
    { id: 'incidents', nav: 'Incidents', icon: 'alert', count: ['2', 'act'] },
    { id: 'permits', nav: 'Permits & lockout', icon: 'lock' },
    { id: 'inspections', nav: 'Inspections', icon: 'checkSq' },
    { id: 'actions', nav: 'Follow-up actions', icon: 'list', count: ['7', 'watch'] },
    { id: 'compliance', nav: 'Compliance', icon: 'shield' },
    { id: 'training', nav: 'Training', icon: 'cap' },
    { id: 'reports', nav: 'Reports', icon: 'bars' }
  ];
  function page(id) { return PAGES.filter(function (p) { return p.id === id; })[0] || PAGES[0]; }
  function zone(name) { return D.zones.filter(function (z) { return z.name === name; })[0] || D.zones[0]; }

  /* ================================================================ shell */
  function renderShell() {
    var top = D.zones.filter(function (z) { return z.score >= 70; });
    document.getElementById('sidebar').innerHTML =
      '<a class="brand" href="#control"><span class="brand-mark">' + ic('eye') + '</span><span><b>Visual HSE</b><small>' + esc(D.site.org) + '</small></span></a>' +
      '<label class="search">' + ic('search') + '<span class="sr">Search</span><input type="search" placeholder="Search"></label>' +
      '<div class="nav-label">Workspace</div>' +
      '<nav class="nav" aria-label="Main">' + PAGES.map(function (p) {
        return '<a href="#' + p.id + '" data-page="' + p.id + '">' + ic(p.icon) + '<span>' + esc(p.nav) + '</span>' +
          (p.count ? '<span class="count ' + p.count[1] + '" aria-label="' + p.count[0] + ' open">' + p.count[0] + '</span>' : '') + '</a>';
      }).join('') + '</nav>' +
      '<div class="nav-label">Zones to act on</div>' +
      '<nav class="nav sites" aria-label="Zones to act on">' + top.map(function (z) {
        return '<a href="#control"' + on('zone', z.name) + '><span class="lvl" style="background:var(--act)"></span><span>' + esc(z.name) + '</span><span class="score">' + z.score + '</span></a>';
      }).join('') + '</nav>' +
      '<form class="ask" data-form="ask"><label for="ask-q">Ask the data</label><p>' +
        (S.askNote ? 'Answers with cited sources run in the pilot app. This preview shows the layout only.' : 'Answers come with cited sources.') + '</p>' +
        '<div class="ask-field"><input id="ask-q" placeholder="Why did Press 3 stop?" autocomplete="off"><button type="submit" aria-label="Ask">' + ic('send') + '</button></div></form>';

    document.getElementById('topbar').innerHTML =
      '<div class="crumbs"><button class="round menu-btn" aria-label="Open menu"' + on('menu') + '>' + ic('menu') + '</button>' +
      '<span class="pill here" id="crumb"></span>' +
      '<span class="pill">' + ic('factory') + esc(D.site.name) + '</span>' +
      '<span class="pill">' + ic('clock') + esc(D.site.shift) + '</span></div>' +
      '<div class="tools"><span class="live">LIVE</span>' +
      '<button class="round" aria-label="Notifications, 3 high-severity events">' + ic('bell') + '<span class="dot"></span></button>' +
      '<span class="avatar" role="img" aria-label="Signed in as ' + esc(D.site.user) + '">' + esc(D.site.initials) + '</span></div>';
  }
  function updateShell() {
    var p = page(S.route);
    document.querySelectorAll('[data-page]').forEach(function (a) {
      if (a.dataset.page === p.id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    document.getElementById('crumb').innerHTML = '<span class="disc">' + ic(p.icon) + '</span>' + esc(p.id === 'control' ? 'Control room' : p.nav);
    document.title = 'Visual HSE · ' + (p.id === 'control' ? 'Control room' : p.nav);
  }

  /* ================================================================ CONTROL ROOM */
  // Top five zones by score, ranked left to right. Flat tiles: severity is the
  // left rule plus the spelled-out level, never a finish or texture.
  function fan() {
    var ranked = D.zones.slice().sort(function (a, b) { return b.score - a.score; }).slice(0, 5);
    return '<section class="zstrip" aria-label="Highest-risk zones, ranked">' + ranked.map(function (zo, i) {
      var l = lvl(zo.score);
      return '<button class="zt ' + l + '"' + on('zone', zo.name) + ' aria-pressed="' + (S.zone === zo.name) + '">' +
        '<span class="zt-top"><span class="zt-rank">' + (i + 1) + '</span><span class="zt-name">' + esc(zo.name) + '</span>' +
        '<span class="zt-lvl t-' + l + '">' + lvlName(zo.score) + '</span></span>' +
        '<span class="zt-score num">' + zo.score + '<span class="u">/100</span></span>' +
        '<span class="zt-cause">' + esc(zo.cause) + '</span>' +
        cells(Math.round(zo.score / 5), 20, l) + '</button>';
    }).join('') + '</section>';
  }
  function gauge(risk) {
    var cx = 78, cy = 79, out = '';
    [[73, 3.3], [63, 3.0], [53, 2.7], [43, 2.4]].forEach(function (ring, ri) {
      var R = ring[0], n = Math.round(Math.PI * R / 8.4);
      for (var i = 0; i <= n; i++) {
        var t = i / n, a = Math.PI * (1 - t);
        var fill = t * 100 <= risk ? (t < 0.4 ? '#2f8656' : t < 0.7 ? '#c98412' : '#c8343d') : '#e6e4dc';
        out += '<circle cx="' + (cx + R * Math.cos(a)).toFixed(1) + '" cy="' + (cy - R * Math.sin(a)).toFixed(1) + '" r="' + ring[1] + '" fill="' + fill + '" />';
      }
    });
    return '<div class="gauge"><svg viewBox="0 0 156 84" role="img" aria-label="Site risk index ' + risk + ' out of 100">' + out + '</svg>' +
      '<div class="gauge-val"><div class="num">' + num(risk, '/100') + '</div></div></div>';
  }
  function shiftChart() {
    var peak = D.trend.reduce(function (m, t) { return t[1] > m[1] ? t : m; });
    var cols = D.trend.map(function (t) {
      var filled = Math.round(t[1] / 10), s = '';
      for (var r = 9; r >= 0; r--) {
        var level = (r + 1) * 10, onCell = r < filled;
        s += '<span' + (onCell ? ' style="background:' + (level > 70 ? 'var(--act)' : level > 40 ? 'var(--watch)' : 'var(--mint)') + '"' : '') + '></span>';
      }
      return '<div class="shift-col" title="' + t[0] + ' · ' + t[1] + '">' + s + '</div>';
    }).join('');
    return '<div><div class="shift" role="img" aria-label="Predicted risk by hour: ' + D.trend.map(function (t) { return t[0] + ' ' + t[1]; }).join(', ') + '">' + cols + '<i class="thr"></i></div>' +
      '<div class="shift-x">' + D.trend.map(function (t) { return '<span' + (t === peak ? ' class="peak"' : '') + '>' + t[0].slice(0, 2) + '</span>'; }).join('') + '</div></div>';
  }
  var MODULE_ICON = { 'Vision-AI': 'camera', 'Chemical & sensors': 'thermo', 'Safety agent': 'shield', 'IoT sensors': 'activity', 'Inspections': 'checkSq', 'Connectors': 'refresh' };
  function openActions() {
    return D.actions.map(function (a) {
      var st = S.stage[a[0]] != null ? S.stage[a[0]] : a[6];
      return { id: a[0], title: a[1], source: a[2], owner: a[3], due: a[4], pri: a[5], stage: st, late: !!D.actionOverdue[a[4]] && st < 3 };
    });
  }

  function viewControl() {
    var k = D.kpi[S.range], z = zone(S.zone), zl = lvl(z.score);
    var ranges = [['shift', 'This shift'], ['day', '24 hours'], ['week', '7 days']];
    var tools = '<div class="seg" role="group" aria-label="Time range">' + ranges.map(function (r) {
      return '<button' + on('range', r[0]) + ' aria-pressed="' + (S.range === r[0]) + '">' + r[1] + '</button>';
    }).join('') + '</div><a class="btn dark" href="#incidents">' + ic('alert') + 'Report incident</a>';

    var zonesCard = card('Zone risk', 'Each zone is checked against permits, lockout and the shift roster before an alert is raised.',
      '<div class="list">' + D.zones.map(function (zo) {
        var l = lvl(zo.score);
        return '<button class="row zone-row"' + on('zone', zo.name) + ' aria-pressed="' + (S.zone === zo.name) + '">' +
          '<span class="row-main"><b>' + esc(zo.name) + '</b><span class="meta">' + esc(zo.cause) + '</span></span>' +
          cells(Math.round(zo.score / 5), 20, l) +
          '<span class="num score ' + 't-' + l + '">' + zo.score + '</span></button>';
      }).join('') + '</div>' +
      '<div class="zone-detail"><div class="tile"><div class="eyebrow">' + esc(z.name) + ' · ' + lvlName(z.score) + ' ' + z.score + '</div>' +
        [['Cameras', z.cams], ['Sensors', z.sensors], ['Permit', z.permit], ['Lockout', z.lockout]].map(function (r) {
          return '<div class="kv"><span>' + r[0] + '</span><b>' + esc(r[1]) + '</b></div>';
        }).join('') + '</div>' +
        '<div class="next-step"><div class="eyebrow">Suggested next step</div><p>' + esc(z.action) + '</p></div></div>',
      '<div class="legend"><span><i class="sq act"></i>Act 70+</span><span><i class="sq watch"></i>Watch 40–69</span><span><i class="sq low"></i>Low</span></div>', 'cr-zones');

    var gaugeCard = card('Site risk', esc(k.riskNote), gauge(k.risk) +
      '<div class="gauge-foot"><div><span class="meta">Peak this shift</span><b class="t-act">72 · 18:00</b></div><div style="text-align:right"><span class="meta">Act threshold</span><b>70</b></div></div>');

    var shiftCard = card('Risk through the shift', 'Predicted, hourly. Peak at 18:00 during changeover.', shiftChart() +
      '<div class="legend"><span><i class="sq act"></i>Above 70</span><span><i class="sq watch"></i>40–70</span><span><span style="width:16px;border-top:1.5px dashed var(--act)"></span>Act threshold</span></div>');

    var evs = D.events.filter(function (e) { return S.evFilter === 'All' || e[1] === S.evFilter; });
    var eventsCard = card('<span class="dot low" aria-hidden="true"></span>Live events', D.events.filter(function (e) { return e[1] === 'High'; }).length + ' high-severity this shift',
      '<ul class="list" aria-live="polite">' + (evs.length ? evs.map(function (e) {
        var t = SEV[e[1]];
        return '<li class="row"><span class="ico ' + (t === 'low' ? '' : t) + '">' + ic(MODULE_ICON[e[4]] || 'activity') + '</span>' +
          '<span class="row-main"><b>' + esc(e[2]) + ' · ' + esc(e[3]) + '</b><span class="meta">' + esc(e[4]) + '</span></span>' +
          '<span class="row-side">' + chip(e[1], t) + '<span class="meta mono">' + e[0] + '</span></span></li>';
      }).join('') : '<li class="meta">No events at this level.</li>') + '</ul>',
      '<div class="chips" role="group" aria-label="Filter by severity">' + ['All', 'High', 'Medium', 'Low'].map(function (f) {
        return '<button' + on('evFilter', f) + ' aria-pressed="' + (S.evFilter === f) + '">' + f + '</button>';
      }).join('') + '</div>', 'cr-events');

    var decisions = card('See · Decide · Act', 'Recent agent decisions, with the facts it checked first.',
      '<div class="grid g3">' + D.decisions.map(function (d) {
        return '<div class="decision"><div class="decision-top"><span class="meta mono">' + d.time + ' · ' + esc(d.zone) + '</span>' + chip(d.outcome, SEV[d.sev]) + '</div>' +
          '<div class="scene">' + esc(d.scene) + '</div><div class="checks">' + d.checks.map(function (c) { return checkRow(c[0], c[1]); }).join('') + '</div>' +
          '<div class="outcome">' + esc(d.action) + '</div></div>';
      }).join('') + '</div>');

    var acts = openActions().filter(function (a) { return a.stage < 3; }).slice(0, 6);
    var STAGE = ['Open', 'In progress', 'Awaiting check'];
    var follow = card('Follow-up actions', 'Each has an owner and a due date.',
      '<div class="list">' + acts.map(function (a) {
        return '<div class="row"><span class="ico ' + SEV[a.pri] + '">' + ic('list') + '</span><span class="row-main"><b>' + esc(a.title) + '</b><span class="meta">' + esc(a.id + ' · ' + a.owner + ' · from ' + a.source) + '</span></span>' +
          '<span class="row-side">' + chip(STAGE[a.stage], a.stage === 2 ? 'low' : 'info') + '<span class="meta ' + (a.late ? 'late' : '') + '">' + (a.late ? 'Overdue · ' : 'Due ') + esc(a.due) + '</span></span></div>';
      }).join('') + '</div>', '<a class="link" href="#actions">View all actions</a>');

    var waste = card('Waste & energy today', '', '<div class="grid g2">' + D.waste.map(function (w) {
      return '<div class="tile"><div class="meta">' + esc(w[0]) + '</div><div class="num">' + num(w[1], w[2]) + '</div><div class="meta">' + esc(w[3]) + '</div></div>';
    }).join('') + '</div>');
    var audit = card('Audit readiness', '', D.audit.map(function (a) {
      return '<div><div class="kv" style="border:0;padding:0 0 8px"><b style="text-align:left">' + esc(a[0]) + '</b><span>' + a[1] + '% on file</span></div>' +
        cells(Math.round(a[1] / 4), 25) + '<div class="meta" style="margin-top:6px">Missing: ' + esc(a[2]) + '</div></div>';
    }).join(''), '<a class="link" href="#compliance">Compliance</a>');

    return head('Control room', 'Every zone, checked against permits, lockout and the shift roster before an alert is raised.', tools) + fan() +
      '<div class="panel">' +
      kpis([
        ['Site risk index', k.risk, '/100', esc(k.riskNote), chip(lvlName(k.risk), lvl(k.risk))],
        ['Real alerts raised', k.alerts, '', '<b>' + k.silenced + '</b> entries stayed quiet: permit and lockout verified'],
        ['Machine stops', k.stops, '', 'Person truly at risk · stopped in under 1 s'],
        ['Open follow-up actions', k.capa, '', '<b class="t-act">' + k.due + '</b> due today · each has an owner']
      ]) +
      '<div class="cr-grid">' + zonesCard + gaugeCard + shiftCard + eventsCard + '</div>' +
      decisions +
      '<div class="grid g-wide">' + follow + '<div class="grid">' + waste + audit + '</div></div>' +
      foot('Sample data for the four-week pilot preview. The software suggests; a qualified person approves every safety and compliance decision.', 'Records support ISO 45001 and ISO 14001 audits.') +
      '</div>';
  }

  /* ================================================================ LIVE FLOOR */
  var BOX = { High: '#ff6a5a', Medium: '#f6b43e', Low: '#35c877' };
  function viewLive() {
    var c = D.cams.filter(function (x) { return x.id === S.cam; })[0] || D.cams[0];
    var view = '<div class="cam-view" role="img" aria-label="' + esc('Camera view of ' + c.name + ': ' + c.summary) + '"><div class="floor"></div>' +
      (c.sev === 'Off' ? '<div class="cam-off">' + ic('camera') + '&nbsp; Camera offline</div>' :
        c.boxes.map(function (b) {
          return '<div class="cam-box" style="left:' + b.l + '%;top:' + b.t + '%;width:' + b.w + '%;height:' + b.h + '%;border-color:' + BOX[b.sev] + '"><span style="background:' + BOX[b.sev] + '">' + esc(b.label) + '</span></div>';
        }).join('') + '<div class="cam-hud"><span>' + esc(c.id + ' · ' + c.name) + '</span><span class="rec">REC</span></div>') + '</div>';
    var camCard = card(esc(c.name) + ' ' + chip(c.status, SEV[c.sev]), esc(c.id + ' · ' + c.zone),
      view + '<p style="font-size:14px">' + esc(c.summary) + '</p>' +
      '<div class="cam-list" role="group" aria-label="Choose camera">' + D.cams.map(function (x) {
        return '<button' + on('cam', x.id) + ' aria-pressed="' + (x.id === c.id) + '"><b><span class="dot ' + SEV[x.sev] + '"></span>' + x.id + '</b><span>' + esc(x.name) + '</span></button>';
      }).join('') + '</div>');
    var planCard = card('Floor plan', 'Zone level and people on the floor now',
      '<div class="plan">' + D.plan.map(function (p) {
        var t = SEV[p[5]];
        return '<div class="plan-zone ' + t + '" style="grid-column:' + p[1] + ' / span ' + p[3] + ';grid-row:' + p[2] + ' / span ' + p[4] + '"><b>' + esc(p[0]) + '</b>' +
          '<span class="meta"><span>' + { act: 'Act', watch: 'Watch', low: 'Low' }[t] + '</span><span>' + (p[6] ? p[6] + ' ' + (p[6] === 1 ? 'person' : 'people') : 'Nobody') + '</span></span></div>';
      }).join('') + '</div>' +
      '<div class="legend"><span><i class="sq act"></i>Act</span><span><i class="sq watch"></i>Watch</span><span><i class="sq low"></i>Low</span></div>' +
      '<div class="tile"><div class="eyebrow">Watching now</div><p style="margin-top:4px">Danger-zone entry, safety gear, machine and forklift spacing, spills.</p></div>');
    var sensors = card('Sensors', 'Last 12 readings', '<div class="grid g3">' + D.sensors.map(function (s) {
      var max = Math.max.apply(null, s.v), min = Math.min.apply(null, s.v), t = SEV[s.sev];
      var bars = s.v.map(function (v, i) {
        var h = max === min ? 70 : 25 + (v - min) / (max - min) * 75;
        return '<span class="' + (i === s.v.length - 1 ? 'last ' + t : '') + '" style="height:' + h.toFixed(0) + '%"></span>';
      }).join('');
      return '<div class="tile sensor"><div class="kv" style="border:0;padding:0"><span style="color:var(--ink-2)">' + esc(s.label) + '</span>' + chip(s.state, t) + '</div>' +
        '<div class="num">' + num(s.value, s.unit) + '</div><div class="spark" aria-hidden="true" style="margin-top:10px">' + bars + '</div><div class="meta" style="margin-top:8px">' + esc(s.where) + '</div></div>';
    }).join('') + '</div>');
    var machines = card('Machines', '', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Machine</th><th>Zone</th><th>Status</th><th>Power</th><th>Temp</th><th>Guard / lockout</th></tr></thead><tbody>' +
      D.machines.map(function (m) {
        var t = SEV[D.machineState[m[2]]];
        return '<tr' + (t === 'act' ? ' class="warn"' : '') + '><td>' + esc(m[0]) + '</td><td>' + esc(m[1]) + '</td><td>' + chip(m[2], t) + '</td><td class="mono">' + esc(m[3]) + '</td><td class="mono">' + esc(m[4]) + '</td><td>' + esc(m[5]) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    return head('Live floor', 'What the cameras and sensors see right now, zone by zone.',
      '<div class="facts">' + D.floorStats.map(function (f) { return '<span class="fact"><b>' + f[0] + '</b>' + esc(f[1]) + '</span>'; }).join('') + '</div>') +
      '<div class="panel"><div class="grid g-wide">' + camCard + planCard + '</div>' + sensors + machines +
      foot('Sample data for the four-week pilot preview. Video analysis runs on the edge; footage stays on site.') + '</div>';
  }

  /* ================================================================ INCIDENTS */
  function viewIncidents() {
    var list = D.incidents.filter(function (i) { return S.incFilter === 'All' || i.type === S.incFilter; });
    var c = D.incidents.filter(function (i) { return i.id === S.inc; })[0] || D.incidents[0];
    var approved = c.stage === 4 || !!S.approved[c.id];
    var stage = approved ? 4 : c.stage;
    var listCard = card('This month', '', '<div class="chips" role="group" aria-label="Filter by type">' + [['All', 'All'], ['Incident', 'Incidents'], ['Near-miss', 'Near-misses']].map(function (f) {
      return '<button' + on('incFilter', f[0]) + ' aria-pressed="' + (S.incFilter === f[0]) + '">' + f[1] + '</button>';
    }).join('') + '</div><div class="list">' + list.map(function (i) {
      var st = (S.approved[i.id] ? 4 : i.stage);
      return '<button class="row"' + on('inc', i.id) + ' aria-pressed="' + (i.id === c.id) + '" style="align-items:flex-start">' +
        '<span class="row-main"><b>' + esc(i.title) + '</b><span class="meta">' + esc(i.id + ' · ' + i.date + ' ' + i.time + ' · ' + i.zone) + '</span></span>' +
        '<span class="row-side">' + chip(i.sev, SEV[i.sev]) + '<span class="meta">' + D.incidentStageText[st] + '</span></span></button>';
    }).join('') + '</div>');
    var steps = '<ol class="stepper" aria-label="Progress">' + D.incidentStages.map(function (s, n) {
      var done = n + 1 < stage || approved, now = n + 1 === stage && !approved;
      return '<li class="step ' + (done ? 'done' : now ? 'now' : '') + '"><i></i><b>' + (n + 1) + '. ' + s + '</b><span>' + (done ? 'Done' : now ? 'In progress' : 'Waiting') + '</span></li>';
    }).join('') + '</ol>';
    var detail = card(esc(c.title), esc(c.id + ' · ' + c.type + ' · ' + c.zone + ' · ' + c.date + ' ' + c.time),
      steps +
      '<div class="grid g2"><div class="tile"><div class="eyebrow">What happened</div><p style="margin-top:6px">' + esc(c.what) + '</p><div class="meta" style="margin-top:8px">Captured by ' + esc(c.source) + '</div></div>' +
      '<div class="tile"><div class="eyebrow" style="margin-bottom:8px">Likely causes</div><ol class="causes">' + c.causes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ol></div></div>' +
      '<div><div class="eyebrow" style="margin-bottom:4px">Standards</div><div class="tbl-wrap"><table class="tbl"><tbody>' + c.clauses.map(function (k) {
        return '<tr><td style="white-space:nowrap">' + esc(k[0]) + '</td><td>' + esc(k[1]) + '</td><td style="text-align:right">' + chip(k[2], k[2] === 'Gap' ? 'act' : 'low') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +
      '<div class="signoff"><div style="flex:1;min-width:220px"><b style="font-weight:500">Draft report and follow-up actions</b><p style="margin-top:3px">' + esc(c.draft) + '</p>' +
        '<div class="meta" style="margin-top:4px">' + (approved ? 'Signed off by a qualified person. Filed to the audit pack.' : 'Needs sign-off from a qualified person before it is filed.') + '</div></div>' +
        '<div class="head-tools"><button class="btn light sm">Open draft</button>' +
        (approved ? '<button class="btn sm ok" disabled>' + ic('check') + 'Approved</button>' : '<button class="btn dark sm"' + on('approve', c.id) + '>Approve and file</button>') + '</div></div>',
      chip(c.sev + ' severity', SEV[c.sev]));
    return head('Incidents &amp; near-misses', 'The software does the follow-up work. A person signs it off.', '<button class="btn dark">' + ic('plus') + 'Report an incident</button>') +
      '<div class="panel">' + kpis(D.incidentKpis.map(function (k) { return [k[0], k[1], k[2], esc(k[3])]; })) +
      '<div class="grid g-narrow">' + listCard + detail + '</div>' +
      foot('Sample data for the four-week pilot preview. Each closed incident feeds back into risk prediction.') + '</div>';
  }

  /* ================================================================ PERMITS */
  function viewPermits() {
    var pending = D.permitRequests.filter(function (r) { return !S.permitDecisions[r.id]; }).length;
    var reqs = card('Waiting for approval', 'The agent checks training and the roster first.', '<div class="list">' + D.permitRequests.map(function (r) {
      var d = S.permitDecisions[r.id];
      return '<div class="req"><div><div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap"><b style="font-weight:500;font-size:14.5px">' + esc(r.type) + '</b><span class="meta">' + esc(r.id + ' · asked ' + r.when + ' by ' + r.who) + '</span></div>' +
        '<p style="margin-top:4px">' + esc(r.work) + '</p><div class="req-checks">' + r.checks.map(function (c) { return checkRow(c[0], c[1]); }).join('') + '</div></div>' +
        (d ? chip(d === 'yes' ? 'Approved · issued' : 'Declined · sent back', d === 'yes' ? 'low' : 'info') :
          '<div class="req-actions"><button class="btn light sm"' + on('permit', r.id + '|no') + '>Decline</button><button class="btn dark sm"' + on('permit', r.id + '|yes') + '>Approve</button></div>') + '</div>';
    }).join('') + '</div>');
    var active = '<div class="grid g3">' + D.permits.map(function (p) {
      return '<section class="card permit"><div class="card-head"><span class="eyebrow">' + esc(p.type) + '</span>' + chip(p.status, SEV[p.sev === 'Low' ? 'Low' : 'Medium']) + '</div>' +
        '<div><div class="work">' + esc(p.work) + '</div><div class="meta" style="margin-top:3px">' + esc(p.id + ' · ' + p.where + ' · ' + p.holder) + '</div></div>' +
        '<div class="checks">' + p.checks.map(function (c) { return checkRow(c[0], c[1]); }).join('') + '</div>' +
        '<div style="margin-top:auto"><div class="timeleft"><span>Valid until ' + p.until + '</span><b style="font-weight:500">' + p.left + ' left</b></div>' + cells(Math.round(p.pct / 5), 20, p.pct > 80 ? 'watch' : '') + '</div></section>';
    }).join('') + '</div>';
    var locks = card('Lockout board', '', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Machine</th><th>Energy sources</th><th>Locked by</th><th>Since</th><th>Checked by</th><th>State</th></tr></thead><tbody>' +
      D.locks.map(function (l) {
        var t = SEV[D.lockState[l[5]]];
        return '<tr' + (t === 'act' ? ' class="warn"' : '') + '><td>' + esc(l[0]) + '</td><td>' + esc(l[1]) + '</td><td>' + esc(l[2]) + '</td><td class="mono">' + esc(l[3]) + '</td><td>' + esc(l[4]) + '</td><td>' + chip(l[5], t) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    return head('Permits &amp; lockout', 'Hot work, confined space and lockout. The agent reads these before raising any alarm, and cameras confirm the power is off before work starts.', '<button class="btn dark">' + ic('plus') + 'Request a permit</button>') +
      '<div class="panel">' + kpis([['Active permits', '3', '', 'Lockout, hot work, confined space'], ['Waiting for approval', String(pending), '', 'Agent checks training and roster first'], ['Lockouts verified', '3', 'of 4', '<span class="t-act">Press 3 has no lockout</span>'], ['Expiring within 1 hour', '1', '', 'PTW-1185 · hot work']]) +
      reqs + '<div class="card-head" style="padding:4px 4px 0"><h2>Active permits</h2></div>' + active + locks +
      foot('Sample data for the four-week pilot preview. A qualified person approves every permit.') + '</div>';
  }

  /* ================================================================ INSPECTIONS */
  function viewInspections() {
    var done = Object.keys(S.answers).length, total = D.checklist.length;
    var fails = Object.keys(S.answers).filter(function (k) { return S.answers[k] === 'fail'; }).length;
    var sched = card('Schedule', '', '<div class="list">' + D.schedule.map(function (s) {
      return '<div class="row"><span class="row-main"><b>' + esc(s[1]) + '</b><span class="meta">' + esc(s[0] + ' · ' + s[2] + ' · ' + s[3]) + '</span></span>' + chip(s[4], SEV[D.schedState[s[4]]]) + '</div>';
    }).join('') + '</div>');
    var list = card('Press hall · weekly machine guarding', 'In progress · started 18:20 by Sana M.',
      '<div><div class="timeleft"><span>Progress</span><b style="font-weight:500">' + done + ' of ' + total + ' checked</b></div><div class="progress"><span style="width:' + Math.round(done / total * 100) + '%"></span></div></div>' +
      '<div class="list">' + D.checklist.map(function (it, n) {
        var a = S.answers[n];
        return '<div class="check-item"><div class="row-main"><b style="font-weight:400">' + esc(it[0]) + '</b><span class="meta">' + esc(it[1]) + (D.checklistPhotos[n] ? ' · photo attached' : '') + '</span></div>' +
          '<div class="pf" role="group" aria-label="' + esc(it[0]) + '">' + [['pass', 'Pass'], ['fail', 'Fail'], ['na', 'N/A']].map(function (o) {
            return '<button class="' + o[0] + '"' + on('answer', n + '|' + o[0]) + ' aria-pressed="' + (a === o[0]) + '">' + o[1] + '</button>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
      '<div><div class="eyebrow" style="margin-bottom:8px">Photo evidence</div><div class="photos">' + Object.keys(D.checklistPhotos).map(function (k) {
        return '<div class="photo" role="img" aria-label="' + esc(D.checklistPhotos[k]) + '">' + esc(D.checklistPhotos[k]) + '</div>';
      }).join('') + '<button class="photo add">' + ic('camera') + 'Add photo</button></div></div>' +
      '<div class="signoff"><span class="' + (fails ? 't-act' : 'meta') + '">' + (fails ? fails + ' failed item' + (fails > 1 ? 's' : '') + ' will become follow-up actions with an owner.' : 'No failed items so far.') + '</span><button class="btn dark sm">Submit inspection</button></div>',
      chip('In progress', 'watch'));
    var findings = card('Recent findings', '', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Finding</th><th>Inspection</th><th>Date</th><th>Risk</th><th>Action</th></tr></thead><tbody>' +
      D.findings.map(function (f) {
        return '<tr' + (f[3] === 'High' ? ' class="warn"' : '') + '><td>' + esc(f[0]) + '</td><td>' + esc(f[1]) + '</td><td class="mono">' + esc(f[2]) + '</td><td>' + chip(f[3], SEV[f[3]]) + '</td><td><a class="link" href="#actions">' + esc(f[4]) + '</a></td></tr>';
      }).join('') + '</tbody></table></div>');
    return head('Inspections &amp; audits', 'Mobile checklists with photo evidence. Every finding becomes a tracked action.', '<button class="btn light">' + ic('download') + 'Download audit pack</button>') +
      '<div class="panel">' + kpis(D.inspectionKpis.map(function (k) { return [k[0], k[1], k[2], esc(k[3])]; })) +
      '<div class="grid g-narrow">' + sched + list + '</div>' + findings + foot('Sample data for the four-week pilot preview.') + '</div>';
  }

  /* ================================================================ FOLLOW-UP ACTIONS */
  function viewActions() {
    var owner = S.owner;
    var all = openActions().filter(function (a) {
      return owner === 'Everyone' || a.owner === owner || (owner === 'Floor team' && /Floor team|Line lead|Shift supervisor/.test(a.owner));
    });
    var board = '<div class="board">' + D.actionCols.map(function (t, i) {
      var cs = all.filter(function (a) { return a.stage === i; });
      return '<section class="col" aria-label="' + t + '"><div class="col-head">' + t + '<span>' + cs.length + '</span></div>' + (cs.length ? cs.map(function (a) {
        var initials = a.owner.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
        return '<article class="task"><div class="task-top"><span class="mono">' + a.id + '</span>' + chip(a.pri, SEV[a.pri]) + '</div><b>' + esc(a.title) + '</b>' +
          '<span class="meta">From ' + esc(a.source) + '</span><div class="task-foot"><span class="owner"><span class="initials" aria-hidden="true">' + initials + '</span>' + esc(a.owner) + '</span>' +
          '<span class="' + (a.late ? 'late' : '') + '">' + (a.late ? 'Overdue · ' : '') + esc(a.due) + '</span></div>' +
          (a.stage < 3 ? '<button class="btn light sm"' + on('move', a.id + '|' + a.stage) + '>' + D.actionNext[a.stage] + '</button>' : '') + '</article>';
      }).join('') : '<p class="meta" style="padding:4px">Nothing here.</p>') + '</section>';
    }).join('') + '</div>';
    return head('Follow-up actions', 'Corrective and preventive actions. Each has an owner and a due date, and cameras confirm the fix before it closes.',
      '<div class="chips" role="group" aria-label="Filter by owner">' + D.actionOwners.map(function (o) {
        return '<button' + on('owner', o) + ' aria-pressed="' + (S.owner === o) + '">' + o + '</button>';
      }).join('') + '</div>') +
      '<div class="panel">' + board + foot('Sample data for the four-week pilot preview.') + '</div>';
  }

  /* ================================================================ COMPLIANCE */
  function viewCompliance() {
    var d = D.standards[S.std];
    var tabs = '<div class="seg" role="tablist" aria-label="Standard">' + Object.keys(D.standards).map(function (k) {
      return '<button role="tab"' + on('std', k) + ' aria-selected="' + (S.std === k) + '">' + k + '</button>';
    }).join('') + '</div>';
    var clauses = card(esc(d.name) + ' · clause by clause', '', '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Clause</th><th>Requirement</th><th>Evidence</th><th>Status</th></tr></thead><tbody>' +
      d.clauses.map(function (c) {
        var t = SEV[D.clauseState[c[3]]];
        return '<tr' + (t === 'act' ? ' class="warn"' : '') + '><td class="mono">' + esc(c[0]) + '</td><td style="color:var(--ink)">' + esc(c[1]) + '</td><td>' + esc(c[2]) + '</td><td>' + chip(c[3], t) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    var gaps = card('Missing evidence', 'Each linked to a follow-up action', '<div class="list">' + d.gaps.map(function (g) {
      return '<div class="row"><span class="ico act">' + ic('alert') + '</span><span class="row-main"><b>' + esc(g[0]) + '</b><span class="meta">Clause ' + esc(g[1]) + ' · <a class="link" href="#actions">' + esc(g[2]) + '</a></span></span></div>';
    }).join('') + '</div>');
    var ask = card('Ask compliance', '', '<p style="font-size:15px">“' + esc(D.askCompliance.q) + '”</p><p>' + esc(D.askCompliance.a) + '</p>' +
      '<div class="chips">' + D.askCompliance.refs.map(function (r) { return '<span class="chip off">' + esc(r) + '</span>'; }).join('') + '</div>', '', 'note');
    return head('Compliance', 'Live mapping of site activity to each standard, and the evidence still missing.', tabs) +
      '<div class="panel">' + kpis([
        ['Evidence on file', d.pct, '%', '', '', '<div style="margin-top:10px">' + cells(Math.round(d.pct / 4), 25) + '</div>'],
        ['Clauses covered', d.covered.split(' of ')[0], 'of ' + d.covered.split(' of ')[1], esc(d.scope)],
        ['Gaps to close', d.gaps.length, '', 'Each linked to a follow-up action'],
        ['Next audit', d.next, '', esc(d.nextNote)]
      ]) + '<div class="grid g-wide">' + clauses + '<div class="grid" style="align-content:start">' + gaps + ask + '</div></div>' +
      foot('Sample data for the four-week pilot preview. A qualified person reviews every compliance decision.') + '</div>';
  }

  /* ================================================================ TRAINING */
  var MARK = { v: ['✓', 'Valid'], e: ['!', 'Expires within 30 days'], x: ['✕', 'Expired or missing'], n: ['–', 'Not needed'] };
  function viewTraining() {
    var rows = D.people.filter(function (p) { return !S.gapsOnly || /[xe]/.test(p[2]); });
    var matrix = card('Shift B · competency matrix', '', '<div class="tbl-wrap"><table class="tbl mx"><thead><tr><th>Worker</th><th>Role</th>' + D.courses.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      rows.map(function (p) {
        return '<tr' + (/x/.test(p[2]) ? ' class="warn"' : '') + '><td>' + esc(p[0]) + '</td><td>' + esc(p[1]) + '</td>' + p[2].split('').map(function (k, i) {
          return '<td><span class="mark ' + k + '" title="' + esc(D.courses[i] + ': ' + MARK[k][1]) + '">' + MARK[k][0] + '<span class="sr">' + esc(MARK[k][1]) + '</span></span></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>',
      '<div class="legend">' + ['v', 'e', 'x', 'n'].map(function (k) { return '<span><span class="mark ' + k + '" style="width:22px;height:22px;font-size:11.5px">' + MARK[k][0] + '</span>' + MARK[k][1] + '</span>'; }).join('') + '</div>');
    var attention = card('Needs attention', '', '<div class="list">' + D.attention.map(function (a) {
      return '<div class="row"><span class="row-main"><b>' + esc(a[0] + ' · ' + a[1]) + '</b><span class="meta">' + esc(a[2]) + '</span></span>' + chip(a[3], SEV[a[4]]) + '<button class="btn light sm">Book course</button></div>';
    }).join('') + '</div>');
    var reminders = card('Automatic reminders', 'Sent in Urdu or English, by text or voice.', '<div>' + D.reminders.map(function (r) {
      return '<div class="kv"><span>' + esc(r[0]) + '</span><b' + (r[1] === 'Permits blocked' ? ' class="t-act"' : '') + '>' + esc(r[1]) + '</b></div>';
    }).join('') + '</div>');
    return head('Training &amp; competency', 'Who is trained for what. The agent checks this against the shift roster before it approves a permit.',
      '<button class="btn ' + (S.gapsOnly ? 'dark' : 'light') + '"' + on('gaps') + ' aria-pressed="' + S.gapsOnly + '">Show only people with gaps</button>') +
      '<div class="panel">' + kpis(D.trainingKpis.map(function (k) { return [k[0], k[1], k[2], esc(k[3])]; })) + matrix +
      '<div class="grid g-wide">' + attention + reminders + '</div>' + foot('Sample data for the four-week pilot preview.') + '</div>';
  }

  /* ================================================================ REPORTS */
  function viewReports() {
    var chart = '<div class="weeks" role="img" aria-label="Incidents and near-misses by week: ' + D.weeks.map(function (w) { return w[0] + ' ' + w[1] + ' incidents, ' + w[2] + ' near-misses'; }).join('; ') + '">' +
      '<div class="y"><span>8</span><span>4</span><span>0</span></div>' + D.weeks.map(function (w) {
        function bar(v, cls) { var s = ''; for (var r = 7; r >= 0; r--) s += '<span' + (r < v ? ' class="on"' : '') + '></span>'; return '<div class="wk-bar ' + cls + '">' + s + '</div>'; }
        return '<div class="wk"><div class="wk-bars">' + bar(w[1], 'inc') + bar(w[2], 'nm') + '</div><span class="wk-label">' + w[0] + '</span></div>';
      }).join('') + '</div>';
    var trend = card('Incidents and near-misses, by week', 'More near-misses reported, fewer incidents: problems are caught earlier.', chart,
      '<div class="legend"><span><i class="sq act"></i>Incidents</span><span><i class="sq" style="background:var(--deep-2)"></i>Near-misses</span></div>');
    var brief = card('Wednesday, 25 November', 'Morning briefing · sent 06:30',
      '<ul class="brief">' + D.briefing.map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul><p class="meta">Sent to 6 people in English and Urdu. Every line links to its source.</p>', '', 'note');
    var lib = card('Report library', '', '<div class="list">' + D.reports.map(function (r) {
      return '<div class="row"><span class="ico">' + ic('file') + '</span><span class="row-main"><b>' + esc(r[0]) + '</b><span class="meta">' + esc(r[1]) + '</span></span>' + chip(r[2], SEV[D.reportState[r[2]]]) +
        '<span class="head-tools"><button class="btn light sm" aria-label="' + esc(r[0]) + ' as PDF">PDF</button><button class="btn light sm" aria-label="' + esc(r[0]) + ' as Excel">Excel</button></span></div>';
    }).join('') + '</div>');
    var routines = card('Routines', 'Run on a schedule or a trigger, without anyone asking.', '<div class="list">' + D.routines.map(function (r, i) {
      var onn = !S.routinesOff[i];
      return '<div class="row"><span class="row-main"><b>' + esc(r[0]) + '</b><span class="meta">' + esc(r[1]) + '</span></span><button class="switch" role="switch" aria-checked="' + onn + '" aria-label="' + esc(r[0]) + '"' + on('routine', i) + '></button></div>';
    }).join('') + '</div>');
    return head('Reports', 'What leadership opens every morning, plus the reports that write themselves.', '<button class="btn dark">' + ic('plus') + 'New report</button>') +
      '<div class="panel"><div class="grid g-wide">' + trend + brief + '</div><div class="grid g-wide">' + lib + routines + '</div>' +
      foot('Sample data for the four-week pilot preview. Reports are drafted by the software and approved by a person before they are filed.') + '</div>';
  }

  var VIEWS = { control: viewControl, live: viewLive, incidents: viewIncidents, permits: viewPermits, inspections: viewInspections, actions: viewActions, compliance: viewCompliance, training: viewTraining, reports: viewReports };

  /* ================================================================ render & events */
  var content = document.getElementById('content');
  function render(keepFocus) {
    var f = document.activeElement, key = keepFocus && f && f.dataset && f.dataset.on ? '[data-on="' + f.dataset.on + '"]' + (f.dataset.arg != null ? '[data-arg="' + CSS.escape(f.dataset.arg) + '"]' : '') : null;
    content.innerHTML = VIEWS[S.route]();
    if (key) { var el = content.querySelector(key); if (el) el.focus({ preventScroll: true }); }
  }
  function go() {
    var id = (location.hash || '#control').slice(1);
    S.route = VIEWS[id] ? id : 'control';
    updateShell(); render(false);
    closeMenu();
    window.scrollTo(0, 0);
  }

  var ACT = {
    range: function (a) { S.range = a; },
    zone: function (a) {
      S.zone = a;
      if (S.route !== 'control') { location.hash = '#control'; return 'nav'; }
    },
    evFilter: function (a) { S.evFilter = a; },
    cam: function (a) { S.cam = a; },
    incFilter: function (a) { S.incFilter = a; },
    inc: function (a) { S.inc = a; },
    approve: function (a) { S.approved[a] = true; },
    permit: function (a) { var p = a.split('|'); S.permitDecisions[p[0]] = p[1]; },
    answer: function (a) { var p = a.split('|'); S.answers[p[0]] = p[1]; },
    owner: function (a) { S.owner = a; },
    move: function (a) { var p = a.split('|'); S.stage[p[0]] = +p[1] + 1; },
    std: function (a) { S.std = a; },
    gaps: function () { S.gapsOnly = !S.gapsOnly; },
    routine: function (a) { S.routinesOff[a] = !S.routinesOff[a]; },
    menu: function () { openMenu(); return 'skip'; }
  };
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-on]');
    if (!t) return;
    if (t.tagName === 'A') e.preventDefault();
    var r = ACT[t.dataset.on](t.dataset.arg);
    if (r === 'nav' || r === 'skip') return;
    render(true);
    if (t.dataset.on === 'zone' && t.closest('#sidebar')) { closeMenu(); var zc = document.querySelector('.cr-zones'); if (zc) zc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  document.addEventListener('submit', function (e) {
    if (e.target.dataset.form === 'ask') { e.preventDefault(); S.askNote = true; var p = e.target.querySelector('p'); p.textContent = 'Answers with cited sources run in the pilot app. This preview shows the layout only.'; }
  });

  /* mobile menu */
  var scrim;
  function openMenu() {
    document.getElementById('sidebar').classList.add('open');
    scrim = document.createElement('div'); scrim.className = 'scrim'; scrim.addEventListener('click', closeMenu); document.body.appendChild(scrim);
  }
  function closeMenu() {
    document.getElementById('sidebar').classList.remove('open');
    if (scrim) { scrim.remove(); scrim = null; }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  renderShell();
  window.addEventListener('hashchange', go);
  go();
})();
