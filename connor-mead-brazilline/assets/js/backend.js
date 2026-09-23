/* ============================================================
   BACKEND — üyelik, sipariş ve veri katmanı
   config.js içindeki firebase bilgileri doluysa Firebase yüklenir.
   Boşsa "demo mod": her şey tarayıcının localStorage'ında tutulur,
   böylece site anahtarlar girilmeden de çalışır (yalnızca denemek
   içindir; gerçek müşteri için Firebase kurulmalı).

   Şifre yenileme güvenlik soruları ile yapılır. Bu işlem sunucu
   tarafı gerektirir: functions/api/[[path]].js (Cloudflare Pages).
   ============================================================ */

window.Backend = (function () {

  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var cfg = (window.SITE && window.SITE.firebase) || {};
  var wantFirebase = !!(cfg.apiKey && cfg.projectId) && location.protocol !== 'file:';

  var mode = 'demo';
  var listeners = [];
  var waiters = [];
  var current = null;
  var auth = null, db = null;
  var readyResolve, initResolve;
  var ready = new Promise(function (r) { readyResolve = r; });   /* oturum durumu belli oldu */
  var init = new Promise(function (r) { initResolve = r; });     /* çalışma modu (demo/firebase) belli oldu */

  var LOCK_MIN = 15, MAX_FAILS = 5;

  /* ---------- küçük yardımcılar ---------- */
  function ls(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      if (v === null) { localStorage.removeItem(k); return null; }
      localStorage.setItem(k, JSON.stringify(v)); return v;
    } catch (e) { return null; }
  }
  function emit() {
    listeners.forEach(function (fn) { try { fn(current); } catch (e) { console.error(e); } });
    waiters = waiters.filter(function (w) {
      if (current && current.uid === w.uid) { w.done(current); return false; }
      return true;
    });
  }
  /* giriş işlemi bittiğinde oturum bilgisinin hazır olmasını bekler */
  function whenUser(uid) {
    return new Promise(function (res) {
      if (current && current.uid === uid) return res(current);
      var w = { uid: uid, done: res };
      waiters.push(w);
      setTimeout(function () {
        var i = waiters.indexOf(w);
        if (i > -1) { waiters.splice(i, 1); res(current); }
      }, 5000);
    });
  }
  function uid16() { return 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function orderCode() {
    var s = 'CM-', abc = '0123456789ABCDEFGHJKLMNPRSTUVYZ';
    for (var i = 0; i < 6; i++) s += abc[Math.floor(Math.random() * abc.length)];
    return s;
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = false;
      s.onload = res;
      s.onerror = function () { rej(new Error('yüklenemedi: ' + src)); };
      document.head.appendChild(s);
    });
  }
  function noop() {}

  /* Cevap karşılaştırması harf büyüklüğüne, Türkçe karakterlere ve
     boşluklara bakmaz: "İstanbul", "istanbul" ve "Istanbul" aynıdır.
     Aynı fonksiyon sunucuda da (functions/api/[[path]].js) bulunur. */
  function normAnswer(s) {
    return String(s == null ? '' : s).normalize('NFC')
      .replace(/[İIı]/g, 'i').replace(/[Çç]/g, 'c').replace(/[Ğğ]/g, 'g')
      .replace(/[Öö]/g, 'o').replace(/[Şş]/g, 's').replace(/[Üü]/g, 'u')
      .toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  var ERRORS = {
    'auth/invalid-email': 'E-posta adresi geçerli görünmüyor.',
    'auth/missing-password': 'Şifre alanı boş.',
    'auth/weak-password': 'Şifre en az 6 karakter olmalı.',
    'auth/email-already-in-use': 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı deneyin.',
    'auth/user-not-found': 'Bu e-posta ile kayıtlı hesap bulunamadı.',
    'auth/wrong-password': 'Şifre hatalı.',
    'auth/invalid-credential': 'E-posta veya şifre hatalı.',
    'auth/too-many-requests': 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.',
    'auth/popup-closed-by-user': 'Google penceresi kapatıldı.',
    'auth/popup-blocked': 'Tarayıcı açılır pencereyi engelledi. İzin verip tekrar deneyin.',
    'auth/unauthorized-domain': 'Bu adresten giriş yapılamıyor. Alan adı Firebase’de yetkilendirilmemiş.',
    'auth/operation-not-allowed': 'Bu giriş yöntemi şu an kullanılamıyor.',
    'auth/requires-recent-login': 'Güvenlik için tekrar giriş yapıp bu işlemi yineleyin.',
    'auth/network-request-failed': 'İnternet bağlantısı kurulamadı.',
    'auth/user-token-expired': 'Oturumunuzun süresi doldu. Tekrar giriş yapın.'
  };
  function nice(err) {
    var code = (err && err.code) || '';
    return ERRORS[code] || (err && err.message) || 'Beklenmeyen bir hata oluştu.';
  }
  function fail(e) {
    var er = new Error(nice(e));
    er.code = e && e.code; er.data = e && e.data;
    throw er;
  }

  /* Sunucu işlevlerine (Cloudflare Pages Functions) istek */
  function api(path, body) {
    var url = '/api/' + path;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) })
      .then(function (r) {
        return r.text().then(function (t) {
          var data = null;
          try { data = JSON.parse(t); } catch (e) { /* JSON değil */ }
          if (!data || typeof data !== 'object') {
            var e1 = new Error('Sunucu işlevlerine ulaşılamadı. Sitenin Cloudflare Pages üzerinde yayında ve “functions” klasörünün yüklü olduğundan emin olun.');
            e1.code = 'api/unavailable'; throw e1;
          }
          if (!r.ok || data.error) {
            var e2 = new Error(data.message || 'İşlem tamamlanamadı.');
            e2.code = data.error || 'api/error'; e2.data = data; throw e2;
          }
          return data;
        });
      }, function () {
        var e = new Error('İnternet bağlantısı kurulamadı.'); e.code = 'auth/network-request-failed'; throw e;
      });
  }

  /* ---------- güvenlik sorusu doğrulama (demo mod) ---------- */
  function sha256hex(s) {
    try {
      if (window.crypto && crypto.subtle && window.TextEncoder) {
        return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (buf) {
          return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
        });
      }
    } catch (e) { /* aşağıdaki yedek */ }
    var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return Promise.resolve('w' + (h >>> 0).toString(16));
  }
  function hashOne(salt, idx, answer) { return sha256hex(salt + '|' + idx + '|' + normAnswer(answer)); }
  function hashSecurity(items) {
    var salt = uid16();
    return Promise.all(items.map(function (it, i) { return hashOne(salt, i, it.a); })).then(function (hs) {
      return { salt: salt, q: items.map(function (it) { return String(it.q); }), h: hs };
    });
  }
  function checkItems(items) {
    if (!Array.isArray(items) || items.length !== 3) throw new Error('Üç güvenlik sorusunu da yanıtlamanız gerekiyor.');
    var seen = {};
    items.forEach(function (it) {
      if (!it || !String(it.q || '').trim()) throw new Error('Güvenlik sorusu seçilmemiş.');
      if (normAnswer(it.a).length < 2) throw new Error('Güvenlik sorularının cevapları en az 2 harf/rakam içermeli.');
      var k = String(it.q).trim().toLocaleLowerCase('tr');
      if (seen[k]) throw new Error('Aynı güvenlik sorusunu iki kez seçemezsiniz.');
      seen[k] = 1;
    });
  }

  /* ---------- başlatma ---------- */
  function demoUser(email, u) {
    /* demo modda giriş yapan herkes yönetici sayılır: veri zaten yalnızca bu tarayıcıdadır */
    return { uid: u.uid, email: email, name: u.name || '', demo: true, admin: true, password: true };
  }
  function startDemo() {
    mode = 'demo';
    var sess = ls('cm_session');
    var users = ls('cm_users') || {};
    if (sess && users[sess]) current = demoUser(sess, users[sess]);
    initResolve(mode);
    readyResolve(current); emit();
  }

  function hasPassword(u) {
    return (u.providerData || []).some(function (p) { return p && p.providerId === 'password'; });
  }
  function probeAdmin(uid) {
    if (!db) return Promise.resolve(false);
    return db.collection('admins').doc(uid).get().then(function (s) { return !!s.exists; }).catch(function () { return false; });
  }

  function startFirebase() {
    return loadScript(SDK + 'firebase-app-compat.js')
      .then(function () { return loadScript(SDK + 'firebase-auth-compat.js'); })
      .then(function () { return loadScript(SDK + 'firebase-firestore-compat.js'); })
      .then(function () {
        firebase.initializeApp(cfg);
        auth = firebase.auth();
        db = firebase.firestore();
        mode = 'firebase';
        initResolve(mode);
        var first = true;
        function finish() {
          if (first) { first = false; readyResolve(current); }
          emit();
        }
        auth.onAuthStateChanged(function (u) {
          if (!u) { current = null; finish(); return; }
          var rec = { uid: u.uid, email: u.email || '', name: u.displayName || '', photo: u.photoURL || '', password: hasPassword(u), admin: false };
          current = rec;
          probeAdmin(u.uid).then(function (a) { rec.admin = a; }).then(finish, finish);
        });
      });
  }

  if (wantFirebase) {
    startFirebase().catch(function (e) {
      console.warn('Firebase başlatılamadı, demo moda geçildi.', e);
      startDemo();
    });
  } else {
    startDemo();
  }

  /* ---------- demo hesap işlemleri ---------- */
  function enc(s) { return btoa(unescape(encodeURIComponent(String(s)))); }
  function cleanEmail(e) { return String(e || '').trim().toLowerCase(); }

  function demoSignUp(email, pass, sec) {
    var users = ls('cm_users') || {};
    email = cleanEmail(email);
    if (!email || email.indexOf('@') < 1) throw { code: 'auth/invalid-email' };
    if (!pass || pass.length < 6) throw { code: 'auth/weak-password' };
    if (users[email]) throw { code: 'auth/email-already-in-use' };
    checkItems(sec);
    return hashSecurity(sec).then(function (rec) {
      users[email] = { uid: uid16(), pass: enc(pass), sec: rec, fails: 0, lockUntil: 0 };
      ls('cm_users', users); ls('cm_session', email);
      current = demoUser(email, users[email]);
      emit(); return current;
    });
  }
  function demoSignIn(email, pass) {
    var users = ls('cm_users') || {};
    email = cleanEmail(email);
    var u = users[email];
    if (!u) throw { code: 'auth/user-not-found' };
    if (u.pass !== enc(pass || '')) throw { code: 'auth/wrong-password' };
    ls('cm_session', email);
    current = demoUser(email, u);
    emit(); return current;
  }

  /* ---------- genel API ---------- */
  return {
    mode: function () { return mode; },
    init: init,
    ready: ready,
    user: function () { return current; },
    db: function () { return db; },
    api: api,
    normAnswer: normAnswer,

    /** Giriş yapmış kişinin Firebase kimlik belirteci (sunucu işlevleri için) */
    token: function (force) {
      var u = auth && auth.currentUser;
      return u ? u.getIdToken(!!force) : Promise.reject(new Error('Önce giriş yapmalısınız.'));
    },

    onAuth: function (fn) {
      listeners.push(fn);
      ready.then(function () { fn(current); });
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },

    /** sec: [{q: 'soru metni', a: 'cevap'} × 3] */
    signUp: function (email, pass, sec) {
      email = cleanEmail(email);
      try { checkItems(sec); } catch (e) { return Promise.reject(e); }
      if (mode === 'demo') return Promise.resolve().then(function () { return demoSignUp(email, pass, sec); }).catch(fail);

      var user = null;
      return auth.createUserWithEmailAndPassword(email, pass)
        .then(function (c) { user = c.user; return user.getIdToken(true); })
        .then(function (idToken) { return api('security/set', { idToken: idToken, items: sec }); })
        .then(function () {
          if (db) db.collection('users').doc(user.uid).set({ email: user.email, createdAt: Date.now() }, { merge: true }).catch(noop);
          return whenUser(user.uid);
        })
        .catch(function (e) {
          /* güvenlik soruları kaydedilemediyse hesap yarım kalmasın */
          if (user) return user.delete().catch(noop).then(function () { fail(e); });
          fail(e);
        });
    },

    signIn: function (email, pass) {
      email = cleanEmail(email);
      if (mode === 'demo') return Promise.resolve().then(function () { return demoSignIn(email, pass); }).catch(fail);
      return auth.signInWithEmailAndPassword(email, pass)
        .then(function (c) { return whenUser(c.user.uid); })
        .catch(fail);
    },

    google: function () {
      if (mode === 'demo') return Promise.reject(new Error('Google ile giriş şu an kullanılamıyor.'));
      return auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
        .then(function (c) { return whenUser(c.user.uid); })
        .catch(fail);
    },

    signOut: function () {
      if (mode === 'demo') { ls('cm_session', null); current = null; emit(); return Promise.resolve(); }
      return auth.signOut().then(function () { current = null; emit(); });
    },

    /* ---------- şifre yenileme (güvenlik soruları) ---------- */

    /** E-posta için rastgele bir güvenlik sorusu getirir: {question, challenge} */
    recoveryStart: function (email) {
      email = cleanEmail(email);
      if (!email || email.indexOf('@') < 1) return Promise.reject(new Error('E-posta adresi geçerli görünmüyor.'));
      if (mode !== 'demo') return api('recovery/start', { email: email }).catch(fail);

      return Promise.resolve().then(function () {
        var users = ls('cm_users') || {};
        var u = users[email];
        if (!u || !u.sec) throw new Error('Bu e-posta için şifre yenileme yapılamıyor. Hesap yoksa ya da Google ile giriş yaptıysanız bu yöntem çalışmaz.');
        if (u.lockUntil && u.lockUntil > Date.now()) {
          throw new Error('Çok fazla hatalı deneme yapıldı. Yaklaşık ' + Math.ceil((u.lockUntil - Date.now()) / 60000) + ' dakika sonra tekrar deneyin.');
        }
        var i = Math.floor(Math.random() * u.sec.q.length);
        return { ok: true, question: u.sec.q[i], challenge: 'demo.' + i + '.' + (Date.now() + 600000) };
      });
    },

    /** Cevap doğruysa şifreyi değiştirir ve yeni şifreyle oturum açar. */
    recoveryFinish: function (email, challenge, answer, newPass) {
      email = cleanEmail(email);
      if (!newPass || newPass.length < 6) return Promise.reject(new Error('Şifre en az 6 karakter olmalı.'));
      if (mode !== 'demo') {
        return api('recovery/finish', { email: email, challenge: challenge, answer: answer, password: newPass })
          .catch(fail)
          .then(function () {
            return auth.signInWithEmailAndPassword(email, newPass).then(function (c) { return whenUser(c.user.uid); }, fail);
          });
      }
      return Promise.resolve().then(function () {
        var users = ls('cm_users') || {};
        var u = users[email];
        var parts = String(challenge || '').split('.');
        if (!u || !u.sec || parts[0] !== 'demo' || Number(parts[2]) < Date.now()) throw new Error('Sorunun süresi doldu. Lütfen yeniden başlayın.');
        if (u.lockUntil && u.lockUntil > Date.now()) throw new Error('Çok fazla hatalı deneme yapıldı. Daha sonra tekrar deneyin.');
        var i = Number(parts[1]);
        return hashOne(u.sec.salt, i, answer).then(function (h) {
          if (h !== u.sec.h[i]) {
            u.fails = (u.fails || 0) + 1;
            var left = MAX_FAILS - u.fails;
            if (left <= 0) { u.lockUntil = Date.now() + LOCK_MIN * 60000; u.fails = 0; }
            ls('cm_users', users);
            var er = new Error(left > 0 ? 'Cevap doğru değil. ' + left + ' deneme hakkınız kaldı.' : 'Çok fazla hatalı deneme yapıldı. ' + LOCK_MIN + ' dakika sonra tekrar deneyin.');
            er.code = 'wrong_answer'; throw er;
          }
          u.pass = enc(newPass); u.fails = 0; u.lockUntil = 0;
          ls('cm_users', users); ls('cm_session', email);
          current = demoUser(email, u); emit();
          return current;
        });
      });
    },

    /** Hesabın güvenlik soruları ayarlı mı? → {has, questions} */
    securityStatus: function () {
      if (!current) return Promise.reject(new Error('Önce giriş yapmalısınız.'));
      if (mode === 'demo') {
        var u = (ls('cm_users') || {})[current.email];
        return Promise.resolve({ has: !!(u && u.sec), questions: u && u.sec ? u.sec.q : [] });
      }
      return auth.currentUser.getIdToken().then(function (t) { return api('security/status', { idToken: t }); }).catch(fail);
    },

    /** Güvenlik sorularını (yeniden) belirler. Güvenlik için mevcut şifre istenir. */
    setSecurity: function (sec, password) {
      try { checkItems(sec); } catch (e) { return Promise.reject(e); }
      if (!current) return Promise.reject(new Error('Önce giriş yapmalısınız.'));
      if (mode === 'demo') {
        return Promise.resolve().then(function () {
          var users = ls('cm_users') || {};
          var u = users[current.email];
          if (!u || u.pass !== enc(password || '')) throw { code: 'auth/wrong-password' };
          return hashSecurity(sec).then(function (rec) { u.sec = rec; u.fails = 0; u.lockUntil = 0; ls('cm_users', users); });
        }).catch(fail);
      }
      var u2 = auth.currentUser;
      return u2.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u2.email, password))
        .then(function () { return u2.getIdToken(true); })
        .then(function (t) { return api('security/set', { idToken: t, items: sec }); })
        .catch(fail);
    },

    /** Hesabı tamamen siler */
    deleteAccount: function (password) {
      if (!current) return Promise.reject(new Error('Önce giriş yapmalısınız.'));
      if (mode === 'demo') {
        var users = ls('cm_users') || {};
        delete users[current.email];
        ls('cm_users', users);
        ls('cm_doc_' + current.uid, null);
        ls('cm_session', null);
        current = null; emit();
        return Promise.resolve();
      }
      var u = auth.currentUser;
      var step = Promise.resolve();
      if (password) step = u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, password));
      return step
        .then(function () { return u.getIdToken(true); })
        .then(function (t) { return api('security/delete', { idToken: t }).catch(noop); })
        .then(function () { return db ? db.collection('users').doc(u.uid).delete().catch(noop) : null; })
        .then(function () { return u.delete(); })
        /* oturum durumu SDK'nın bildirimini beklemeden hemen temizlenir; yoksa sayfa silinmiş hesabı bir an daha gösterebilir */
        .then(function () { current = null; emit(); })
        .catch(fail);
    },

    /* ---------- kullanıcı belgesi: profil + sepet + favoriler ---------- */
    load: function () {
      if (!current) return Promise.resolve(null);
      if (mode === 'demo' || !db) return Promise.resolve(ls('cm_doc_' + current.uid) || {});
      return db.collection('users').doc(current.uid).get()
        .then(function (s) { return s.exists ? s.data() : {}; })
        .catch(function () { return {}; });
    },

    save: function (patch) {
      if (!current) return Promise.resolve();
      if (mode === 'demo' || !db) {
        var cur = ls('cm_doc_' + current.uid) || {};
        Object.keys(patch).forEach(function (k) { cur[k] = patch[k]; });
        ls('cm_doc_' + current.uid, cur);
        return Promise.resolve();
      }
      return db.collection('users').doc(current.uid).set(patch, { merge: true }).catch(noop);
    },

    /* ---------- siparişler ---------- */

    /** Siparişi kaydeder ve kaydı (referans koduyla) döner. */
    createOrder: function (order) {
      if (!current) return Promise.reject(new Error('Sipariş vermek için giriş yapmalısınız.'));
      var rec = Object.assign({ code: orderCode(), createdAt: Date.now(), status: 'new', uid: current.uid, email: current.email }, order);

      if (mode === 'demo' || !db) {
        var all = ls('cm_orders_all') || [];
        all.unshift(rec); ls('cm_orders_all', all);
        return Promise.resolve(rec);
      }
      function put(tries) {
        return db.collection('orders').doc(rec.code).set(rec).then(function () { return rec; }, function (e) {
          /* aynı kod daha önce alınmışsa yeni kod dene */
          if (tries < 2 && e && e.code === 'permission-denied') { rec.code = orderCode(); return put(tries + 1); }
          console.error('Sipariş kaydedilemedi', e);
          throw new Error('Siparişiniz kaydedilemedi. Lütfen tekrar deneyin. (Hata: ' + ((e && e.code) || 'bilinmiyor') + ')');
        });
      }
      return put(0);
    },

    /** Giriş yapan kişinin siparişleri (yeniden eskiye) */
    listOrders: function () {
      if (!current) return Promise.resolve([]);
      function sorted(a) { return a.sort(function (x, y) { return (y.createdAt || 0) - (x.createdAt || 0); }); }
      if (mode === 'demo' || !db) {
        return Promise.resolve(sorted((ls('cm_orders_all') || []).filter(function (o) { return o.uid === current.uid; })));
      }
      return db.collection('orders').where('uid', '==', current.uid).get()
        .then(function (q) { return sorted(q.docs.map(function (d) { return d.data(); })); })
        .catch(function () { return []; });
    },

    /** Yönetici: tüm siparişler */
    listAllOrders: function () {
      if (mode === 'demo' || !db) return Promise.resolve(ls('cm_orders_all') || []);
      return db.collection('orders').orderBy('createdAt', 'desc').limit(300).get()
        .then(function (q) { return q.docs.map(function (d) { return d.data(); }); })
        .catch(function (e) { console.error(e); throw new Error('Siparişler okunamadı. Bu hesabın yönetici olarak eklendiğinden emin olun. (Hata: ' + ((e && e.code) || 'bilinmiyor') + ')'); });
    },

    /** Yönetici: sipariş durumunu / kargo takip numarasını günceller */
    updateOrder: function (code, patch) {
      patch = Object.assign({}, patch, { updatedAt: Date.now() });
      if (mode === 'demo' || !db) {
        var all = ls('cm_orders_all') || [];
        all.forEach(function (o) { if (o.code === code) Object.assign(o, patch); });
        ls('cm_orders_all', all);
        return Promise.resolve(patch);
      }
      return db.collection('orders').doc(code).update(patch).then(function () { return patch; })
        .catch(function (e) { throw new Error('Sipariş güncellenemedi. (Hata: ' + ((e && e.code) || 'bilinmiyor') + ')'); });
    },

    /* ---------- genel belge okuma/yazma (katalog vb.) ---------- */
    readDoc: function (col, id) {
      if (mode === 'demo' || !db) return Promise.resolve(null);
      return db.collection(col).doc(id).get()
        .then(function (s) { return s.exists ? s.data() : null; })
        .catch(function () { return null; });
    },

    writeDoc: function (col, id, data) {
      if (mode === 'demo' || !db) return Promise.resolve(data);
      return db.collection(col).doc(id).set(data).then(function () { return data; })
        .catch(function (e) {
          if (e && e.code === 'permission-denied') throw new Error('Kaydetme izni yok. Bu hesap yönetici olarak eklenmemiş ya da Firestore kuralları yayınlanmamış.');
          throw e;
        });
    },

    /** Giriş yapan kişi yönetici mi? (Firebase’de "admins" koleksiyonuna göre) */
    isAdmin: function () { return !!(current && current.admin); }
  };
})();
