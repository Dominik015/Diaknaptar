(function () {
  var KEY = 'diaknaptar.v1';
  var DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  var MONTHS = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
  var CATS = { class: 'Tanóra', home: 'Házi feladat / tanulás', exam: 'Dolgozat / vizsga', sport: 'Sport / különóra', other: 'Egyéb' };
  var state = { events: [], fired: {}, sample: false };
  var weekStart = mondayOf(new Date());
  var editingId = null;
  var audioCtx = null;

   /* ---------- storage ---------- */
  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { var s = JSON.parse(raw); if (s && Array.isArray(s.events)) { state = { events: s.events, fired: s.fired || {}, sample: !!s.sample }; return true; } }
    } catch (e) {}
    return false;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  /* ---------- dates ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ds(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseDay(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function at(day, hm) { var p = hm.split(':'); var d = parseDay(day); d.setHours(+p[0], +p[1], 0, 0); return d; }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function mondayOf(d) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); var wd = (x.getDay() + 6) % 7; return addDays(x, -wd); }
  function dayDiff(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function endOf(ev, day) {
    var s = at(day, ev.start), e = at(day, ev.end);
    return e > s ? e : new Date(s.getTime() + 30 * 60000);
  }

  /* ---------- events ---------- */
  function occursOn(ev, day) {
    if (ev.date === day) return true;
    if (ev.repeat === 'weekly') { var d = dayDiff(ev.date, day); return d > 0 && d % 7 === 0; }
    return false;
  }
  function dayEvents(day) {
    return state.events.filter(function (e) { return occursOn(e, day); })
      .sort(function (a, b) { return a.start.localeCompare(b.start); });
  }
  function uid() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function seed() {
    var m = mondayOf(new Date());
    function d(i) { return ds(addDays(m, i)); }
    state.events = [
      { id: uid(), title: 'Matematika', date: d(0), start: '08:00', end: '08:45', cat: 'class', remind: 10, repeat: 'weekly' },
      { id: uid(), title: 'Magyar esszé írása', date: d(0), start: '18:00', end: '19:00', cat: 'home', remind: 30, repeat: 'none' },
      { id: uid(), title: 'Edzés', date: d(1), start: '17:30', end: '19:00', cat: 'sport', remind: 60, repeat: 'weekly' },
      { id: uid(), title: 'Angol', date: d(2), start: '09:00', end: '09:45', cat: 'class', remind: 10, repeat: 'weekly' },
      { id: uid(), title: 'Fizika dolgozat', date: d(3), start: '10:00', end: '10:45', cat: 'exam', remind: 60, repeat: 'none' },
      { id: uid(), title: 'Történelem tételek tanulása', date: d(3), start: '16:00', end: '17:30', cat: 'home', remind: 15, repeat: 'none' },
      { id: uid(), title: 'Csoportos projektmegbeszélés', date: d(4), start: '14:00', end: '15:00', cat: 'other', remind: 15, repeat: 'none' }
    ].map(function (e) { e.sample = true; return e; });
    state.sample = true;
    save();
  }

   /* ---------- render ---------- */
  function fmtDay(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate() + '.'; }

  function render() {
    var board = document.getElementById('board');
    var today = ds(new Date());
    var html = '';
    for (var i = 0; i < 7; i++) {
      var d = addDays(weekStart, i), day = ds(d);
      var evs = dayEvents(day);
      var cls = 'day' + (day === today ? ' today' : '') + (day < today ? ' past' : '');
      html += '<section class="' + cls + '"><div class="dayhead"><div><div class="name">' + DAYS[i] + '</div><div class="date">' + fmtDay(d) + '</div></div>' +
        '<button class="addday" type="button" data-add="' + day + '" aria-label="Esemény hozzáadása: ' + DAYS[i] + '">+</button></div><div class="events">';
      if (!evs.length) html += '<div class="empty">Nincs program.</div>';
      evs.forEach(function (e) {
        html += '<button type="button" class="ev cat-' + e.cat + '" data-edit="' + e.id + '" data-day="' + day + '">' +
          '<span class="t">' + e.start + '–' + e.end +
          (e.remind >= 0 ? '<span class="badge">' + (e.remind === 0 ? 'jelzés: kezdéskor' : 'jelzés: ' + (e.remind === 60 ? '1 óra' : e.remind + ' perc')) + '</span>' : '') +
          (e.repeat === 'weekly' ? '<span class="badge">heti</span>' : '') + '</span>' +
          '<span class="n">' + esc(e.title) + '</span>' +
          '<span class="c"><i class="dot"></i>' + CATS[e.cat] + '</span></button>';
      });
      html += '</div></section>';
    }
    board.innerHTML = html;
    var end = addDays(weekStart, 6);
    document.getElementById('weekLabel').textContent = weekStart.getFullYear() + '. ' + fmtDay(weekStart) + ' – ' + fmtDay(end);
    document.getElementById('sampleNotice').hidden = !state.sample;
    renderNext();
  }

  function nextOccurrence() {
    var now = new Date();
    for (var i = 0; i < 15; i++) {
      var day = ds(addDays(now, i));
      var evs = dayEvents(day);
      for (var j = 0; j < evs.length; j++) {
        var s = at(day, evs[j].start), e = endOf(evs[j], day);
        if (e > now) return { ev: evs[j], start: s, end: e, day: day };
      }
    }
    return null;
  }
  function renderNext() {
    var el = document.getElementById('next');
    var n = nextOccurrence();
    if (!n) { el.innerHTML = '<span class="lbl">Következő</span><strong>Nincs közelgő program</strong>'; return; }
    var now = new Date(), mins = Math.round((n.start - now) / 60000), when;
    if (mins <= 0) when = 'most zajlik, vége ' + pad(n.end.getHours()) + ':' + pad(n.end.getMinutes()) + '-kor';
    else if (mins < 60) when = mins + ' perc múlva';
    else if (mins < 24 * 60) when = Math.floor(mins / 60) + ' óra ' + (mins % 60) + ' perc múlva';
    else when = DAYS[(parseDay(n.day).getDay() + 6) % 7].toLowerCase() + ' ' + n.ev.start;
    el.innerHTML = '<span class="lbl">Következő</span><strong>' + esc(n.ev.title) + '</strong><span class="when">' + n.ev.start + ' · ' + when + '</span>';
  }

  /* ---------- dialog ---------- */
  var dlg = document.getElementById('dlg');
  var f = {
    title: document.getElementById('fTitle'), date: document.getElementById('fDate'), cat: document.getElementById('fCat'),
    start: document.getElementById('fStart'), end: document.getElementById('fEnd'), remind: document.getElementById('fRemind'),
    repeat: document.getElementById('fRepeat'), err: document.getElementById('err'), del: document.getElementById('delBtn')
  };
  var delArmed = false;
  function openDialog(ev, day) {
    editingId = ev ? ev.id : null;
    delArmed = false;
    document.getElementById('dlgTitle').textContent = ev ? 'Esemény szerkesztése' : 'Új esemény';
    f.title.value = ev ? ev.title : '';
    f.date.value = ev ? ev.date : (day || ds(new Date()));
    f.cat.value = ev ? ev.cat : 'class';
    f.start.value = ev ? ev.start : '08:00';
    f.end.value = ev ? ev.end : '08:45';
    f.remind.value = String(ev ? ev.remind : 10);
    f.repeat.value = ev ? ev.repeat : 'none';
    f.err.textContent = '';
    f.del.hidden = !ev;
    f.del.textContent = ev && ev.repeat === 'weekly' ? 'Törlés (minden alkalom)' : 'Törlés';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    f.title.focus();
  }
  function closeDialog() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  f.start.addEventListener('change', function () {
    if (!f.start.value) return;
    if (!f.end.value || f.end.value <= f.start.value) {
      var p = f.start.value.split(':'), t = +p[0] * 60 + +p[1] + 45;
      if (t < 24 * 60) f.end.value = pad(Math.floor(t / 60)) + ':' + pad(t % 60);
    }
  });

  document.getElementById('form').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = f.title.value.trim();
    if (!title) { f.err.textContent = 'Írd be az esemény nevét.'; f.title.focus(); return; }
    if (!f.date.value) { f.err.textContent = 'Válassz napot.'; return; }
    if (!f.start.value || !f.end.value) { f.err.textContent = 'Add meg a kezdés és a vége időpontját.'; return; }
    if (f.end.value <= f.start.value) { f.err.textContent = 'A végének későbbinek kell lennie, mint a kezdés.'; return; }
    var data = { title: title, date: f.date.value, start: f.start.value, end: f.end.value, cat: f.cat.value, remind: +f.remind.value, repeat: f.repeat.value };
    if (editingId) {
      state.events = state.events.map(function (x) { if (x.id !== editingId) return x; data.id = x.id; data.sample = x.sample; return data; });
      clearFired(editingId);
    } else { data.id = uid(); state.events.push(data); }
    save(); closeDialog();
    weekStart = mondayOf(parseDay(data.date));
    render(); check();
  });
  document.getElementById('cancelBtn').addEventListener('click', closeDialog);
  f.del.addEventListener('click', function () {
    if (!delArmed) { delArmed = true; f.del.textContent = 'Biztosan törlöd?'; return; }
    state.events = state.events.filter(function (x) { return x.id !== editingId; });
    clearFired(editingId);
    if (!state.events.some(function (x) { return x.sample; })) state.sample = false;
    save(); closeDialog(); render();
  });
  function clearFired(id) { Object.keys(state.fired).forEach(function (k) { if (k.indexOf(id + '|') === 0) delete state.fired[k]; }); }

  
  /* ---------- clicks ---------- */
  document.getElementById('board').addEventListener('click', function (e) {
    var add = e.target.closest('[data-add]'); if (add) { openDialog(null, add.getAttribute('data-add')); return; }
    var ed = e.target.closest('[data-edit]');
    if (ed) { var id = ed.getAttribute('data-edit'); var ev = state.events.filter(function (x) { return x.id === id; })[0]; if (ev) openDialog(ev); }
  });
  document.getElementById('newBtn').addEventListener('click', function () {
    var today = ds(new Date()), wk = ds(weekStart);
    openDialog(null, dayDiff(wk, today) >= 0 && dayDiff(wk, today) < 7 ? today : wk);
  });
  document.getElementById('prev').addEventListener('click', function () { weekStart = addDays(weekStart, -7); render(); });
  document.getElementById('nextW').addEventListener('click', function () { weekStart = addDays(weekStart, 7); render(); });
  document.getElementById('todayBtn').addEventListener('click', function () { weekStart = mondayOf(new Date()); render(); });
  document.getElementById('clearSample').addEventListener('click', function () {
    state.events = state.events.filter(function (x) { return !x.sample; });
    state.sample = false; save(); render();
  });