/* ============================================================
   YÖNETİM PANELİ (yonetici.html)
   Sekmeler: Ürünler · Türler · Siparişler · Metinler · Ayarlar · Yedek
   Ürün, tür, metin ve ayarlarda yapılan değişiklikler üstteki
   "Kaydet" ile yayına alınır. Sipariş durumu değişiklikleri ise
   hemen kaydedilir.
   ============================================================ */

window.AdminPage = function () {
  var A = window.App, P = window.PRODUCTS, B = window.BRANDS;
  var esc = A.esc, money = A.money;
  var tab = 'urun';
  var draft = null;          /* düzenlenen ürün */
  var dirty = false;
  var orders = null;         /* sipariş listesi önbelleği */

  var FORMS = [
    ['dropper', 'Damlalıklı şişe'], ['pump', 'Pompalı şişe'], ['jar', 'Kavanoz'],
    ['tube', 'Tüp'], ['bottle', 'Şişe'], ['flacon', 'Cam flakon'],
    ['bar', 'Kalıp / sabun'], ['set', 'Set']
  ];

  function el() { return document.getElementById('page'); }
  function box() { return document.getElementById('admBody'); }

  /* tarayıcı confirm/prompt her yerde çalışmadığı için kendi pencerelerimiz */
  function ask(title, text, onYes) {
    var m = A.modal('<h3>' + esc(title) + '</h3><p class="muted">' + esc(text) + '</p>' +
      '<div class="modal__act"><button class="btn btn--ghost" data-close>Vazgeç</button>' +
      '<button class="btn" id="askYes">Evet, devam</button></div>');
    m.el.querySelector('#askYes').addEventListener('click', function () { m.close(); onYes(); });
  }
  function askText(title, value, onOk) {
    var m = A.modal('<h3>' + esc(title) + '</h3>' +
      '<label class="field"><input class="input" id="askInput" value="' + esc(value || '') + '"></label>' +
      '<div class="modal__act"><button class="btn btn--ghost" data-close>Vazgeç</button>' +
      '<button class="btn" id="askOk">Tamam</button></div>');
    var i = m.el.querySelector('#askInput');
    i.focus(); i.select();
    function done() { var v = i.value.trim(); m.close(); if (v) onOk(v); }
    m.el.querySelector('#askOk').addEventListener('click', done);
    i.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); done(); } });
  }

  /* ---------- giriş kapısı ---------- */
  function gate() {
    Backend.ready.then(function () {
      var u = Backend.user();
      if (!u) return loginView();
      if (!Backend.isAdmin()) return denyView(u);
      panel();
    });
  }

  function loginView(err) {
    el().innerHTML = '<div class="wrap wrap--narrow" style="padding:60px 0 90px">' +
      '<div class="cat-head" style="text-align:left"><h1>Yönetim paneli</h1><p>Devam etmek için yönetici hesabınızla giriş yapın.</p></div>' +
      '<div class="auth-form" style="max-width:420px">' +
      (err ? '<div class="form-msg err">' + esc(err) + '</div>' : '') +
      '<form id="admLogin">' +
      '<label class="field"><span>E-posta</span><input class="input" type="email" name="email" required autocomplete="email"></label>' +
      '<label class="field"><span>Şifre</span><input class="input" type="password" name="password" required autocomplete="current-password"></label>' +
      '<button class="btn btn--full" type="submit">Giriş yap</button>' +
      '</form>' +
      '<p class="muted" style="font-size:13px;margin-top:16px">Hesabınız yoksa önce <a class="link-inline" href="hesap.html?tab=up&next=yonetici.html">siteden hesap açın</a>; ardından yönetici olarak eklenmesi gerekir (README, “Yönetici ekleme”).</p>' +
      '</div></div>';
    document.getElementById('admLogin').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(this);
      Backend.signIn(d.get('email'), d.get('password'))
        .then(function () { gate(); })
        .catch(function (er) { loginView(er.message); });
    });
  }

  function denyView(u) {
    el().innerHTML = '<div class="wrap wrap--narrow" style="padding:60px 0 90px">' +
      '<div class="empty" style="padding-block:20px"><h3>Bu hesabın yönetici yetkisi yok</h3>' +
      '<p class="muted"><b>' + esc(u.email) + '</b> yönetici olarak eklenmemiş.</p></div>' +
      '<div class="panel"><h3>Yönetici olarak nasıl eklenir?</h3>' +
      '<ol class="howto">' +
      '<li>Firebase konsolunda <b>Firestore Database → Data</b> bölümüne gidin.</li>' +
      '<li><b>Koleksiyon başlat</b> (ya da varsa <b>admins</b> koleksiyonunu aç) deyip koleksiyon kimliğine <code>admins</code> yazın.</li>' +
      '<li><b>Belge kimliği</b> olarak aşağıdaki kimliği yapıştırın. Bir alan ekleyin: ad <code>role</code>, değer <code>admin</code>. Kaydedin.</li>' +
      '<li>Bu sayfayı yenileyin.</li></ol>' +
      '<p class="muted" style="margin:14px 0 6px">Hesap kimliğiniz (UID):</p>' +
      '<p><code class="uid" id="uidBox">' + esc(u.uid) + '</code> <button class="btn btn--ghost btn--sm" id="uidCopy">Kopyala</button></p></div>' +
      '<div class="btn-row"><button class="btn btn--ghost btn--sm" id="admRe">Yenile</button>' +
      '<button class="btn btn--ghost btn--sm" id="admOut">Çıkış yap</button></div></div>';
    document.getElementById('admOut').addEventListener('click', function () { Backend.signOut().then(gate); });
    document.getElementById('admRe').addEventListener('click', function () { location.reload(); });
    document.getElementById('uidCopy').addEventListener('click', function () {
      var t = u.uid;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { A.toast('Kopyalandı.'); }, function () { A.toast('Elle seçip kopyalayın.'); });
      else A.toast('Elle seçip kopyalayın.');
    });
  }

  /* ---------- panel ---------- */
  function panel() {
    el().innerHTML = '<div class="wrap adm">' +
      '<div class="adm__head">' +
      '<div><h1>Yönetim paneli</h1><p class="muted" id="admState"></p></div>' +
      '<div class="adm__head-act">' +
      '<a class="btn btn--ghost btn--sm" href="index.html">Siteyi gör</a>' +
      '<button class="btn btn--sm" id="admSave">Kaydet</button>' +
      '</div></div>' +
      '<div class="tabs adm__tabs">' +
      '<button data-atab="urun" class="is-on">Ürünler</button>' +
      '<button data-atab="tur">Türler</button>' +
      '<button data-atab="siparis" id="tabOrders">Siparişler</button>' +
      '<button data-atab="metin">Metinler</button>' +
      '<button data-atab="ayar">Ayarlar</button>' +
      '<button data-atab="yedek">Yedek</button>' +
      '</div>' +
      '<div id="admBody"></div></div>';

    document.querySelector('.adm__tabs').addEventListener('click', function (e) {
      var b = e.target.closest('[data-atab]'); if (!b) return;
      tab = b.dataset.atab; draft = null;
      document.querySelectorAll('[data-atab]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      body();
    });
    document.getElementById('admSave').addEventListener('click', persist);
    state();
    body();
    /* yeni sipariş sayısı sekmede görünsün */
    loadOrders().then(function () { badge(); }, function () {});
  }

  function state(msg) {
    var e = document.getElementById('admState');
    if (!e) return;
    e.textContent = msg || (dirty ? 'Kaydedilmemiş değişiklikler var.' : P.length + ' ürün · ' + window.CATEGORIES.length + ' tür');
  }
  function touch() { dirty = true; state(); }

  function persist() {
    var btn = document.getElementById('admSave');
    btn.disabled = true; btn.textContent = 'Kaydediliyor…';
    Catalog.save().then(function () {
      dirty = false;
      btn.disabled = false; btn.textContent = 'Kaydet';
      state('Kaydedildi.');
      A.toast('Değişiklikler kaydedildi.');
      A.refresh();
    }).catch(function (e) {
      btn.disabled = false; btn.textContent = 'Kaydet';
      state('Kaydedilemedi: ' + e.message);
      A.toast('Kaydedilemedi: ' + e.message);
    });
  }

  function body() {
    if (tab === 'urun') return draft ? formView() : productList();
    if (tab === 'tur') return typeList();
    if (tab === 'siparis') return orderView();
    if (tab === 'metin') return textView();
    if (tab === 'ayar') return settingsView();
    return backupView();
  }

  /* ---------- ürün listesi ---------- */
  function productList() {
    var rows = P.map(function (p, i) {
      return '<tr>' +
        '<td class="adm__thumb">' + A.art(p) + '</td>' +
        '<td><b>' + esc(p.name || '(adsız)') + '</b><small>' + esc(B[p.brand] ? B[p.brand].name : p.brand) +
        (p.cat ? ' · ' + esc(A.catName(p.cat)) : '') + '</small></td>' +
        '<td>' + money(p.price) + (p.old ? '<small><s>' + money(p.old) + '</s></small>' : '') + '</td>' +
        '<td data-stat="' + esc(p.id) + '"><span class="muted">…</span></td>' +
        '<td>' + (p.stock === false ? '<span class="tag tag--sale">Tükendi</span>' : '<span class="tag">Satışta</span>') + '</td>' +
        '<td class="adm__act">' +
        '<button class="btn btn--ghost btn--sm" data-edit="' + i + '">Düzenle</button>' +
        '<button class="btn btn--ghost btn--sm danger-btn" data-del="' + i + '">Sil</button>' +
        '</td></tr>';
    }).join('');

    box().innerHTML = '<div class="adm__bar">' +
      '<button class="btn btn--sm" id="admNew">Yeni ürün</button>' +
      '</div>' +
      (P.length
        ? '<div class="adm__table-wrap"><table class="adm__table"><thead><tr><th></th><th>Ürün</th><th>Fiyat</th><th>Görüntülenme / puan</th><th>Durum</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
        : '<div class="empty"><h3>Henüz ürün yok</h3><p class="muted">“Yeni ürün” ile ilk ürünü ekleyin.</p></div>');

    Stats.top(200).then(function (map) {
      document.querySelectorAll('[data-stat]').forEach(function (td) {
        var s = map[td.dataset.stat];
        td.innerHTML = s ? A.fmtNum(s.views) + (s.count ? '<small>★ ' + s.avg.toFixed(1).replace('.', ',') + ' (' + s.count + ')</small>' : '') : '<span class="muted">0</span>';
      });
    });

    document.getElementById('admNew').addEventListener('click', function () {
      draft = {
        id: Catalog.newId('urun', P.map(function (x) { return x.id; })),
        brand: 'connor-mead', cat: '', name: '', sub: '', price: 0, old: 0, size: '',
        form: 'bottle', tone: '#c9b9a6', image: '', best: false, isNew: true, stock: true,
        desc: '', usage: '', ingredients: '', _new: true
      };
      body();
    });
    box().onclick = function (e) {
      var ed = e.target.closest('[data-edit]'), dl = e.target.closest('[data-del]');
      if (ed) { draft = JSON.parse(JSON.stringify(P[+ed.dataset.edit])); body(); }
      if (dl) {
        var i = +dl.dataset.del;
        ask('Ürün silinsin mi?', (P[i].name || 'Bu ürün') + ' listeden kaldırılacak.', function () {
          P.splice(i, 1); touch(); body();
        });
      }
    };
  }

  /* ---------- ürün formu ---------- */
  function formView() {
    var p = draft;
    function chips(brand) {
      var list = A.cats(brand);
      return list.length
        ? '<span class="muted" style="font-size:12.5px">Var olan türler:</span> ' + list.map(function (c) {
          return '<button type="button" class="chip" data-tur="' + esc(c.name) + '">' + esc(c.name) + '</button>';
        }).join('')
        : '<span class="muted" style="font-size:12.5px">Bu markada henüz tür yok. Yukarıya yazdığınız ad yeni tür olarak oluşturulur.</span>';
    }
    box().innerHTML = '<form class="adm__form" id="admForm">' +
      '<div class="adm__form-head"><h2>' + (p._new ? 'Yeni ürün' : esc(p.name || 'Ürün')) + '</h2>' +
      '<button type="button" class="btn--link" id="admBack">← Listeye dön</button></div>' +

      '<div class="adm__cols">' +
      '<label class="field"><span>Marka</span><select class="select" name="brand">' +
      Object.keys(B).map(function (k) {
        return '<option value="' + k + '"' + (k === p.brand ? ' selected' : '') + '>' + esc(B[k].name) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>Tür (ör. Şampuan, Krem, Serum)</span>' +
      '<input class="input" name="tur" id="turIn" maxlength="40" autocomplete="off" placeholder="Yazın ya da aşağıdan seçin" value="' + esc(p.cat ? A.catName(p.cat) : '') + '"></label>' +
      '</div>' +
      '<div class="chips" id="turChips">' + chips(p.brand) + '</div>' +

      '<label class="field" style="margin-top:14px"><span>Ürün adı</span><input class="input" name="name" value="' + esc(p.name) + '" required></label>' +
      '<label class="field"><span>Kısa açıklama</span><input class="input" name="sub" value="' + esc(p.sub) + '" placeholder="Kartta adın altında görünür"></label>' +

      '<div class="adm__cols">' +
      '<label class="field"><span>Fiyat (TL)</span><input class="input" type="number" name="price" min="0" step="0.01" value="' + (p.price || '') + '" required></label>' +
      '<label class="field"><span>Eski fiyat (boş bırakılabilir)</span><input class="input" type="number" name="old" min="0" step="0.01" value="' + (p.old || '') + '"></label>' +
      '<label class="field"><span>Hacim / boyut</span><input class="input" name="size" value="' + esc(p.size) + '" placeholder="50 ml"></label>' +
      '</div>' +

      '<div class="adm__cols">' +
      '<label class="field"><span>Görsel tipi</span><select class="select" name="form">' +
      FORMS.map(function (f) {
        return '<option value="' + f[0] + '"' + (f[0] === p.form ? ' selected' : '') + '>' + f[1] + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>Ürün rengi</span><input class="input adm__color" type="color" name="tone" value="' + esc(p.tone || '#c9b9a6') + '"></label>' +
      '<label class="field"><span>Fotoğraf adresi (varsa)</span><input class="input" name="image" value="' + esc(p.image) + '" placeholder="assets/img/urun.jpg"></label>' +
      '</div>' +

      '<div class="adm__checks">' +
      '<label><input type="checkbox" name="best"' + (p.best ? ' checked' : '') + '> Çok satan</label>' +
      '<label><input type="checkbox" name="isNew"' + (p.isNew ? ' checked' : '') + '> Yeni</label>' +
      '<label><input type="checkbox" name="stock"' + (p.stock !== false ? ' checked' : '') + '> Satışta</label>' +
      '</div>' +

      '<label class="field"><span>Açıklama</span><textarea class="textarea" name="desc" rows="4">' + esc(p.desc) + '</textarea></label>' +
      '<label class="field"><span>Nasıl kullanılır</span><textarea class="textarea" name="usage" rows="3">' + esc(p.usage) + '</textarea></label>' +
      '<label class="field"><span>İçindekiler</span><textarea class="textarea" name="ingredients" rows="3">' + esc(p.ingredients) + '</textarea></label>' +

      '<div class="adm__form-act">' +
      '<button class="btn" type="submit">' + (p._new ? 'Ürünü ekle' : 'Değişikliği uygula') + '</button>' +
      '<button class="btn btn--ghost" type="button" id="admCancel">Vazgeç</button>' +
      '</div>' +
      '<p class="muted" style="font-size:13px">Listeye eklendikten sonra üstteki <b>Kaydet</b> ile yayına alınır.</p>' +
      '</form>';

    var f = document.getElementById('admForm');
    f.querySelector('[name="brand"]').addEventListener('change', function () {
      p.brand = this.value;
      document.getElementById('turChips').innerHTML = chips(this.value);
    });
    document.getElementById('turChips').addEventListener('click', function (e) {
      var c = e.target.closest('[data-tur]'); if (!c) return;
      document.getElementById('turIn').value = c.dataset.tur;
    });
    document.getElementById('admBack').addEventListener('click', function () { draft = null; body(); });
    document.getElementById('admCancel').addEventListener('click', function () { draft = null; body(); });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(f);
      var brand = d.get('brand');
      var obj = {
        id: p.id,
        brand: brand,
        cat: Catalog.ensureType(brand, d.get('tur')),   /* yazılan tür yoksa otomatik oluşturulur */
        name: String(d.get('name') || '').trim(),
        sub: String(d.get('sub') || '').trim(),
        price: Number(d.get('price')) || 0,
        old: Number(d.get('old')) || 0,
        size: String(d.get('size') || '').trim(),
        form: d.get('form'),
        tone: d.get('tone'),
        image: String(d.get('image') || '').trim(),
        best: !!d.get('best'),
        isNew: !!d.get('isNew'),
        stock: !!d.get('stock'),
        desc: String(d.get('desc') || '').trim(),
        usage: String(d.get('usage') || '').trim(),
        ingredients: String(d.get('ingredients') || '').trim()
      };
      var i = P.map(function (x) { return x.id; }).indexOf(obj.id);
      if (i > -1) P[i] = obj; else P.push(obj);
      draft = null; touch(); body();
      A.toast(obj.name + ' listeye alındı. Kaydet’e basmayı unutmayın.');
    });
  }

  /* ---------- türler ---------- */
  function typeList() {
    var C = window.CATEGORIES;
    function group(brand) {
      var mine = C.filter(function (c) { return c.brand === brand; });
      var rows = mine.map(function (c) {
        var i = C.indexOf(c);
        var n = P.filter(function (p) { return p.cat === c.id; }).length;
        return '<li><span><b>' + esc(c.name) + '</b><small>' + n + ' ürün</small></span>' +
          '<span class="adm__act">' +
          '<button class="btn btn--ghost btn--sm" data-up="' + i + '" aria-label="Yukarı">↑</button>' +
          '<button class="btn btn--ghost btn--sm" data-down="' + i + '" aria-label="Aşağı">↓</button>' +
          '<button class="btn btn--ghost btn--sm" data-ren="' + i + '">Adını değiştir</button>' +
          '<button class="btn btn--ghost btn--sm danger-btn" data-cdel="' + i + '">Sil</button>' +
          '</span></li>';
      }).join('');
      return '<div class="adm__cat"><h3>' + esc(B[brand].name) + '</h3>' +
        (rows ? '<ul class="adm__list">' + rows + '</ul>' : '<p class="muted">Bu markada tür yok. Ürün eklerken tür yazmanız yeterli; buradan da ekleyebilirsiniz.</p>') +
        '<form class="adm__add" data-brand="' + brand + '">' +
        '<input class="input" name="name" placeholder="Yeni tür adı" required>' +
        '<button class="btn btn--sm" type="submit">Ekle</button></form></div>';
    }
    box().innerHTML = '<div class="adm__cats">' + Object.keys(B).map(group).join('') + '</div>';

    box().onsubmit = function (e) {
      var f = e.target.closest('.adm__add'); if (!f) return;
      e.preventDefault();
      var name = String(new FormData(f).get('name') || '').trim();
      if (!name) return;
      Catalog.ensureType(f.dataset.brand, name);
      touch(); body();
    };
    box().onclick = function (e) {
      var t;
      if ((t = e.target.closest('[data-ren]'))) {
        var c = C[+t.dataset.ren];
        askText('Tür adı', c.name, function (v) { c.name = v; touch(); body(); });
      }
      if ((t = e.target.closest('[data-cdel]'))) {
        var j = +t.dataset.cdel;
        var used = P.filter(function (p) { return p.cat === C[j].id; }).length;
        var go = function () {
          P.forEach(function (p) { if (p.cat === C[j].id) p.cat = ''; });
          C.splice(j, 1); touch(); body();
        };
        if (used) ask('Tür silinsin mi?', used + ' ürün bu türde. Silerseniz o ürünler türsüz kalır.', go);
        else ask('Tür silinsin mi?', C[j].name + ' kaldırılacak.', go);
      }
      if ((t = e.target.closest('[data-up]'))) { move(+t.dataset.up, -1); }
      if ((t = e.target.closest('[data-down]'))) { move(+t.dataset.down, 1); }
    };
    function move(i, dir) {
      var c = C[i], brand = c.brand;
      var sib = C.filter(function (x) { return x.brand === brand; });
      var pos = sib.indexOf(c), to = pos + dir;
      if (to < 0 || to >= sib.length) return;
      var a = C.indexOf(sib[pos]), b2 = C.indexOf(sib[to]);
      C[a] = sib[to]; C[b2] = sib[pos];
      touch(); body();
    }
  }

  /* ---------- siparişler ---------- */
  var ordFilter = '';

  function loadOrders() {
    return Backend.listAllOrders().then(function (l) { orders = l; return l; });
  }
  function badge() {
    var n = (orders || []).filter(function (o) { return o.status === 'new'; }).length;
    var t = document.getElementById('tabOrders');
    if (t) t.textContent = n ? 'Siparişler (' + n + ' yeni)' : 'Siparişler';
  }

  function orderView() {
    box().onclick = null; box().onsubmit = null;
    box().innerHTML = '<p class="muted">Siparişler yükleniyor…</p>';
    loadOrders().then(function () { badge(); drawOrders(); }).catch(function (err) {
      box().innerHTML = '<div class="form-msg err">' + esc(err.message) + '</div>' +
        '<button class="btn btn--ghost btn--sm" id="ordRetry">Tekrar dene</button>';
      document.getElementById('ordRetry').addEventListener('click', orderView);
    });
  }

  function drawOrders() {
    var list = (orders || []).filter(function (o) { return !ordFilter || o.status === ordFilter; });
    box().innerHTML = '<div class="adm__bar adm__bar--split">' +
      '<label class="sort-lbl"><span class="muted">Durum</span><select class="select" id="ordFilter"><option value="">Tümü (' + (orders || []).length + ')</option>' +
      Object.keys(A.STATUS).map(function (k) {
        var n = (orders || []).filter(function (o) { return o.status === k; }).length;
        return '<option value="' + k + '"' + (k === ordFilter ? ' selected' : '') + '>' + esc(A.STATUS[k]) + ' (' + n + ')</option>';
      }).join('') + '</select></label>' +
      '<button class="btn btn--ghost btn--sm" id="ordRefresh">Yenile</button></div>' +
      (list.length ? list.map(orderCard).join('') : '<div class="empty"><h3>Sipariş yok</h3><p class="muted">Bu filtrede gösterilecek sipariş bulunmuyor.</p></div>');

    document.getElementById('ordFilter').addEventListener('change', function () { ordFilter = this.value; drawOrders(); });
    document.getElementById('ordRefresh').addEventListener('click', orderView);

    box().onclick = function (e) {
      var h = e.target.closest('[data-ohead]');
      if (h) {
        var open = h.getAttribute('aria-expanded') === 'true';
        h.setAttribute('aria-expanded', String(!open));
        h.nextElementSibling.hidden = open;
        return;
      }
      var u = e.target.closest('[data-oupd]');
      if (u) {
        var card = u.closest('.ord'), code = card.dataset.code;
        var status = card.querySelector('[data-ostatus]').value;
        var tracking = card.querySelector('[data-otrack]').value.trim();
        u.disabled = true; u.textContent = 'Kaydediliyor…';
        Backend.updateOrder(code, { status: status, tracking: tracking }).then(function () {
          (orders || []).forEach(function (o) { if (o.code === code) { o.status = status; o.tracking = tracking; } });
          badge();
          var pill = card.querySelector('.status');
          pill.className = 'status status--' + status; pill.textContent = A.STATUS[status];
          u.disabled = false; u.textContent = 'Güncelle';
          A.toast('Sipariş güncellendi.');
        }).catch(function (err) {
          u.disabled = false; u.textContent = 'Güncelle';
          A.toast(err.message);
        });
      }
    };
  }

  function orderCard(o) {
    var c = o.customer || {};
    return '<div class="ord" data-code="' + esc(o.code) + '">' +
      '<button type="button" class="ord__head" data-ohead aria-expanded="false">' +
      '<code>' + esc(o.code) + '</code>' +
      '<span class="ord__who">' + esc(c.name || o.email || '') + '</span>' +
      '<span class="muted ord__date">' + esc(A.fmtDate(o.createdAt)) + '</span>' +
      '<span class="status status--' + esc(o.status) + '">' + esc(A.STATUS[o.status] || o.status) + '</span>' +
      '<b>' + money(o.total) + '</b></button>' +
      '<div class="ord__body" hidden>' +
      '<div class="ord__cols">' +
      '<div><h4>Müşteri</h4><p>' + esc(c.name || '') + '<br>' +
      (c.phone ? '<a class="link-inline" href="tel:' + esc(String(c.phone).replace(/[^+\d]/g, '')) + '">' + esc(c.phone) + '</a><br>' : '') +
      esc(o.email || '') + '</p>' +
      '<h4>Teslimat adresi</h4><p>' + esc(c.address || '') + '<br>' + esc(c.district || '') + ' / ' + esc(c.city || '') + '</p>' +
      (c.note ? '<h4>Sipariş notu</h4><p>' + esc(c.note) + '</p>' : '') + '</div>' +
      '<div><h4>Ürünler</h4><ul class="mini-lines">' + (o.items || []).map(function (i) {
        return '<li><span>' + esc(i.name) + (i.variant ? ' (' + esc(i.variant) + ')' : '') + ' <em>× ' + i.qty + '</em></span><b>' + money(i.price * i.qty) + '</b></li>';
      }).join('') + '</ul>' +
      '<dl class="sum-dl"><dt>Ara toplam</dt><dd>' + money(o.subtotal || 0) + '</dd>' +
      '<dt>Kargo</dt><dd>' + (o.shipping ? money(o.shipping) : 'Ücretsiz') + '</dd>' +
      (o.codFee ? '<dt>Kapıda ödeme bedeli</dt><dd>' + money(o.codFee) + '</dd>' : '') +
      '<dt class="total">Toplam</dt><dd class="total">' + money(o.total) + '</dd></dl>' +
      '<p style="margin:10px 0 0"><b>Ödeme:</b> ' + esc(A.PAYMENT[o.payment] || '') + '</p></div>' +
      '</div>' +
      '<div class="ord__act">' +
      '<label class="field"><span>Durum</span><select class="select" data-ostatus>' + Object.keys(A.STATUS).map(function (k) {
        return '<option value="' + k + '"' + (k === o.status ? ' selected' : '') + '>' + esc(A.STATUS[k]) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field"><span>Kargo takip no</span><input class="input" data-otrack value="' + esc(o.tracking || '') + '" placeholder="İsteğe bağlı"></label>' +
      '<button class="btn btn--sm" data-oupd>Güncelle</button>' +
      '</div></div></div>';
  }

  /* ---------- metinler ---------- */
  function textView() {
    box().onclick = null; box().onsubmit = null;
    var H = window.SITE.home || {};
    box().innerHTML = '<form class="adm__form" id="txtForm">' +
      '<label class="field"><span>Üst duyuru şeridi</span><input class="input" name="ann" value="' + esc(window.SITE.announcement || '') + '" placeholder="Boş bırakırsanız şerit görünmez"></label>' +
      '<fieldset class="adm__fs"><legend>Ana sayfa</legend>' +
      '<label class="field"><span>Ana başlık</span><input class="input" name="home|claim" value="' + esc(H.claim || '') + '" placeholder="' + esc(window.SITE.group.name) + '"></label>' +
      '<label class="field"><span>Başlık altı yazı</span><textarea class="textarea" name="home|lead" rows="2">' + esc(H.lead || '') + '</textarea></label>' +
      '</fieldset>' +
      Object.keys(B).map(function (k) {
        var b = B[k];
        return '<fieldset class="adm__fs"><legend>' + esc(b.name) + ' sayfası</legend>' +
          '<label class="field"><span>Sayfa başlığı</span><input class="input" name="' + k + '|claim" value="' + esc(b.claim) + '" placeholder="' + esc(b.name) + '"></label>' +
          '<label class="field"><span>Başlık altı yazı</span><textarea class="textarea" name="' + k + '|lead" rows="2">' + esc(b.lead) + '</textarea></label>' +
          '<label class="field"><span>Marka tanıtımı</span><textarea class="textarea" name="' + k + '|story" rows="4">' + esc(b.story) + '</textarea></label>' +
          '</fieldset>';
      }).join('') +
      '<div class="adm__form-act"><button class="btn" type="submit">Metinleri uygula</button></div>' +
      '<p class="muted" style="font-size:13px">Sonra üstteki <b>Kaydet</b> ile yayına alınır.</p>' +
      '</form>';
    document.getElementById('txtForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(this);
      window.SITE.announcement = String(d.get('ann') || '').trim();
      window.SITE.home = { claim: String(d.get('home|claim') || '').trim(), lead: String(d.get('home|lead') || '').trim() };
      Object.keys(B).forEach(function (k) {
        B[k].claim = String(d.get(k + '|claim') || '').trim();
        B[k].lead = String(d.get(k + '|lead') || '').trim();
        B[k].story = String(d.get(k + '|story') || '').trim();
      });
      touch(); A.refresh(); A.toast('Metinler güncellendi. Kaydet’e basmayı unutmayın.');
    });
  }

  /* ---------- ayarlar (kargo, ödeme) ---------- */
  function fmtIban(s) { return String(s || '').replace(/\s+/g, '').toUpperCase().replace(/(.{4})/g, '$1 ').trim(); }

  function settingsView() {
    box().onclick = null; box().onsubmit = null;
    var o = window.SITE.order || {}, bank = o.bank || {};
    box().innerHTML = '<form class="adm__form" id="setForm">' +
      '<fieldset class="adm__fs"><legend>Kargo</legend>' +
      '<div class="adm__cols">' +
      '<label class="field"><span>Kargo ücreti (TL)</span><input class="input" type="number" name="shippingFee" min="0" step="0.01" value="' + (o.shippingFee || 0) + '"></label>' +
      '<label class="field"><span>Bu tutar ve üzerinde kargo ücretsiz (TL)</span><input class="input" type="number" name="freeShippingOver" min="0" step="0.01" value="' + (o.freeShippingOver || 0) + '"></label>' +
      '</div><p class="muted" style="font-size:13px">0 yazarsanız ilgili ücret/koşul uygulanmaz. Kargo ücreti 0 ise kargo ücretsizdir.</p></fieldset>' +
      '<fieldset class="adm__fs"><legend>Ödeme yöntemleri</legend>' +
      '<div class="adm__checks">' +
      '<label><input type="checkbox" name="cod"' + (o.cod !== false ? ' checked' : '') + '> Kapıda ödeme</label>' +
      '<label><input type="checkbox" name="eft"' + (o.eft !== false ? ' checked' : '') + '> Havale / EFT</label>' +
      '</div>' +
      '<label class="field"><span>Kapıda ödeme hizmet bedeli (TL)</span><input class="input" type="number" name="codFee" min="0" step="0.01" value="' + (o.codFee || 0) + '"></label>' +
      '</fieldset>' +
      '<fieldset class="adm__fs"><legend>Havale / EFT bilgileri</legend>' +
      '<label class="field"><span>Hesap sahibi</span><input class="input" name="holder" value="' + esc(bank.holder || '') + '"></label>' +
      '<div class="adm__cols">' +
      '<label class="field"><span>Banka</span><input class="input" name="bankName" value="' + esc(bank.bankName || '') + '"></label>' +
      '<label class="field"><span>IBAN</span><input class="input" name="iban" value="' + esc(bank.iban || '') + '" placeholder="TR00 0000 0000 0000 0000 0000 00" autocomplete="off"></label>' +
      '</div><p class="muted" style="font-size:13px">IBAN yazılmadan “Havale / EFT” seçeneği müşterilere gösterilmez.</p></fieldset>' +
      '<label class="field"><span>Sipariş ekranında görünecek kısa not (isteğe bağlı)</span><input class="input" name="note" value="' + esc(o.note || '') + '" placeholder="Örn. Siparişler 1–3 iş günü içinde kargoya verilir."></label>' +
      '<div id="setMsg"></div>' +
      '<div class="adm__form-act"><button class="btn" type="submit">Ayarları uygula</button></div>' +
      '<p class="muted" style="font-size:13px">Sonra üstteki <b>Kaydet</b> ile yayına alınır.</p>' +
      '</form>';
    document.getElementById('setForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(this);
      var iban = fmtIban(d.get('iban'));
      var plain = iban.replace(/\s/g, '');
      var m = document.getElementById('setMsg');
      if (plain && !/^TR\d{24}$/.test(plain)) {
        m.innerHTML = '<div class="form-msg err">IBAN, “TR” ile başlayan 26 karakter olmalı. Yine de kaydedildi; lütfen kontrol edin.</div>';
      } else m.innerHTML = '';
      window.SITE.order = {
        shippingFee: Number(d.get('shippingFee')) || 0,
        freeShippingOver: Number(d.get('freeShippingOver')) || 0,
        codFee: Number(d.get('codFee')) || 0,
        cod: !!d.get('cod'), eft: !!d.get('eft'),
        bank: { holder: String(d.get('holder') || '').trim(), bankName: String(d.get('bankName') || '').trim(), iban: iban },
        note: String(d.get('note') || '').trim()
      };
      this.iban.value = iban;
      touch(); A.toast('Ayarlar güncellendi. Kaydet’e basmayı unutmayın.');
    });
  }

  /* ---------- yedek ---------- */
  function backupView() {
    box().onclick = null; box().onsubmit = null;
    box().innerHTML = '<div class="adm__form">' +
      '<h2>Yedek al / geri yükle</h2>' +
      '<p class="muted">Aşağıdaki metni kopyalayıp saklayabilirsiniz. Geri yüklemek için yapıştırıp “İçe aktar”a basın. (Siparişler bu yedeğe dahil değildir; onlar Firebase’de durur.)</p>' +
      '<textarea class="textarea adm__json" id="jsonBox" rows="14" spellcheck="false">' +
      esc(JSON.stringify(Catalog.current(), null, 2)) + '</textarea>' +
      '<div class="adm__form-act">' +
      '<button class="btn btn--ghost" id="copyJson">Kopyala</button>' +
      '<button class="btn" id="impJson">İçe aktar</button>' +
      '</div><div id="jsonMsg"></div></div>';

    document.getElementById('copyJson').addEventListener('click', function () {
      var t = document.getElementById('jsonBox');
      t.select();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t.value)
          .then(function () { A.toast('Panoya kopyalandı.'); })
          .catch(function () { A.toast('Metni elle seçip kopyalayın.'); });
        return;
      }
      try { document.execCommand('copy'); A.toast('Panoya kopyalandı.'); }
      catch (e) { A.toast('Metni elle seçip kopyalayın.'); }
    });
    document.getElementById('impJson').addEventListener('click', function () {
      var msg = document.getElementById('jsonMsg');
      var d;
      try { d = JSON.parse(document.getElementById('jsonBox').value); }
      catch (er) { msg.className = 'form-msg err'; msg.textContent = 'Metin okunamadı, JSON biçimini kontrol edin.'; return; }
      Catalog.save(d).then(function () {
        dirty = false;
        msg.className = 'form-msg ok'; msg.textContent = 'İçe aktarıldı ve kaydedildi.';
        A.refresh(); state();
      }).catch(function (er) { msg.className = 'form-msg err'; msg.textContent = 'Kaydedilemedi: ' + er.message; });
    });
  }

  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  gate();
};
