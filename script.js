(function () {
  var KEY = 'diaknaptar.v1';
  var DAYS = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];
  var MONTHS = ['jan.', 'febr.', 'márc.', 'ápr.', 'máj.', 'jún.', 'júl.', 'aug.', 'szept.', 'okt.', 'nov.', 'dec.'];
  var CATS = { class: 'Tanóra', home: 'Házi feladat / tanulás', exam: 'Dolgozat / vizsga', sport: 'Sport / különóra', other: 'Egyéb' };
  var state = { events: [], fired: {}, sample: false };
  var weekStart = mondayOf(new Date());
  var editingId = null;
  var audioCtx = null;