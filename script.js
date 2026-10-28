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