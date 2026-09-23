/* ============================================================
   İSTATİSTİK — ürün görüntülenme sayısı ve puanlar
   Firebase varsa Firestore "stats" koleksiyonunda, yoksa bu
   cihazda (demo) tutulur.
     - Görüntülenme: tarayıcıdan doğrudan +1 yazılır (kurallar
       yalnızca +1'e izin verir). Aynı kişi aynı ürünü 30 dakika
       içinde tekrar açarsa sayılmaz.
     - Puan: giriş yapmış kişi 1–5 arası puan verir; sunucu işlevi
       (/api/rate) puanı kaydedip ortalamayı yeniden hesaplar.
   ============================================================ */

window.Stats = (function () {

  var B = window.Backend;
  var SEEN_KEY = 'cm_seen', TOP_KEY = 'cm_top';
  var SEEN_TTL = 30 * 60 * 1000;   /* aynı ürün 30 dk içinde tekrar sayılmaz */
  var TOP_TTL = 10 * 60 * 1000;    /* çok görüntülenenler listesi 10 dk önbellekte */

  function ls(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      localStorage.setItem(k, JSON.stringify(v)); return v;
    } catch (e) { return null; }
  }

  function shape(d) {
    d = d || {};
    var count = Number(d.ratingCount) || 0, sum = Number(d.ratingSum) || 0;
    return { views: Number(d.views) || 0, count: count, avg: count ? sum / count : 0 };
  }
  function firestore() {
    return B.init.then(function () { return B.mode() === 'firebase' ? B.db() : null; });
  }

  /* ---- demo mod verisi ---- */
  function demoStats() { return ls('cm_stats') || {}; }
  function demoRow(pid) {
    var s = demoStats()[pid];
    return shape(s ? { views: s.views, ratingSum: s.sum, ratingCount: s.count } : null);
  }

  /** Bu ziyareti sayar. Sayıldıysa true döner. */
  function view(pid) {
    return B.ready.then(function () {
      if (B.isAdmin()) return false;                       /* yönetici gezintisi sayılmaz */
      var seen = ls(SEEN_KEY) || {}, now = Date.now();
      Object.keys(seen).forEach(function (k) { if (now - seen[k] > SEEN_TTL) delete seen[k]; });
      if (seen[pid]) return false;
      seen[pid] = now; ls(SEEN_KEY, seen);

      return firestore().then(function (db) {
        if (db) {
          return db.collection('stats').doc(pid)
            .set({ views: firebase.firestore.FieldValue.increment(1) }, { merge: true })
            .then(function () { return true; }, function () { return false; });
        }
        var all = demoStats(), s = all[pid] || { views: 0, sum: 0, count: 0 };
        s.views += 1; all[pid] = s; ls('cm_stats', all);
        return true;
      });
    });
  }

  /** Tek ürünün {views, count, avg} bilgisi */
  function get(pid) {
    return firestore().then(function (db) {
      if (!db) return demoRow(pid);
      return db.collection('stats').doc(pid).get().then(
        function (snap) { return shape(snap.exists ? snap.data() : null); },
        function () { return shape(null); });
    });
  }

  /** En çok görüntülenen ürünlerin {kimlik: {views,count,avg}} haritası */
  function top(n) {
    n = n || 100;
    return firestore().then(function (db) {
      if (!db) {
        var m = {}, all = demoStats();
        Object.keys(all).forEach(function (k) { m[k] = demoRow(k); });
        return m;
      }
      var c = ls(TOP_KEY);
      if (c && c.n >= n && Date.now() - c.t < TOP_TTL) return c.map;
      return db.collection('stats').orderBy('views', 'desc').limit(n).get().then(function (q) {
        var map = {};
        q.docs.forEach(function (d) { map[d.id] = shape(d.data()); });
        ls(TOP_KEY, { t: Date.now(), n: n, map: map });
        return map;
      }, function () { return {}; });
    });
  }

  /** Listeyi görüntülenmeye göre sıralar (eşitlikte: çok satan, yeni, ekleme sırası) */
  function sortByViews(list, map) {
    map = map || {};
    var idx = {}; list.forEach(function (p, i) { idx[p.id] = i; });
    return list.slice().sort(function (a, b) {
      var va = map[a.id] ? map[a.id].views : 0, vb = map[b.id] ? map[b.id].views : 0;
      if (vb !== va) return vb - va;
      if (!!a.best !== !!b.best) return a.best ? -1 : 1;
      if (!!a.isNew !== !!b.isNew) return a.isNew ? -1 : 1;
      return idx[a.id] - idx[b.id];
    });
  }

  /** Verilen ürünlerden en çok görüntülenen n tanesi */
  function popular(list, n) {
    /* 40 belge okunur: 10 ürünlük satır için yeterli, okuma kotasını korur */
    return top(40).then(function (map) { return sortByViews(list, map).slice(0, n || list.length); });
  }

  /** Giriş yapan kişinin bu ürüne verdiği puan (yoksa 0) */
  function myRating(pid) {
    return B.ready.then(function () {
      var u = B.user();
      if (!u) return 0;
      return firestore().then(function (db) {
        if (!db) { var r = ls('cm_ratings') || {}; return (r[pid] && r[pid][u.uid]) || 0; }
        return db.collection('ratings').doc(pid + '__' + u.uid).get().then(
          function (snap) { return snap.exists ? Number(snap.data().value) || 0 : 0; },
          function () { return 0; });
      });
    });
  }

  /** Puan verir (1–5). {avg, count, mine} döner. */
  function rate(pid, value) {
    value = Math.round(Number(value));
    if (!(value >= 1 && value <= 5)) return Promise.reject(new Error('Puan 1 ile 5 arasında olmalı.'));
    return B.ready.then(function () {
      var u = B.user();
      if (!u) throw new Error('Puan vermek için giriş yapmalısınız.');
      return firestore().then(function (db) {
        if (!db) {
          var ratings = ls('cm_ratings') || {};
          ratings[pid] = ratings[pid] || {};
          ratings[pid][u.uid] = value;
          ls('cm_ratings', ratings);
          var vals = Object.keys(ratings[pid]).map(function (k) { return ratings[pid][k]; });
          var all = demoStats(), s = all[pid] || { views: 0, sum: 0, count: 0 };
          s.count = vals.length; s.sum = vals.reduce(function (a, b) { return a + b; }, 0);
          all[pid] = s; ls('cm_stats', all);
          return { avg: s.sum / s.count, count: s.count, mine: value };
        }
        return B.token().then(function (t) { return B.api('rate', { idToken: t, pid: pid, value: value }); })
          .then(function (r) { return { avg: Number(r.avg) || 0, count: Number(r.count) || 0, mine: Number(r.mine) || value }; });
      });
    });
  }

  return { view: view, get: get, top: top, popular: popular, sortByViews: sortByViews, myRating: myRating, rate: rate };
})();
