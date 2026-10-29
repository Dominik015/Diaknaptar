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