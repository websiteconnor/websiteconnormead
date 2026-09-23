/* ============================================================
   SAYFALAR — her HTML dosyası <body data-page="..."> ile
   hangi görünümün çizileceğini söyler.
   Yönetim paneli ayrı dosyada: assets/js/admin.js
   ============================================================ */

(function () {
  var A = window.App, P = window.PRODUCTS, B = window.BRANDS;
  var esc = A.esc, money = A.money;

  function el() { return document.getElementById('page'); }
  function byBrand(b) { return P.filter(function (p) { return p.brand === b; }); }
  function brandCls(k) { return k === 'brazilline' ? 'bl' : 'cm'; }
  function ord() { return window.SITE.order || {}; }

  /** Etkin ödeme yöntemleri. Havale için IBAN yazılmış olmalı. */
  function methods() {
    var o = ord(), out = [];
    if (o.cod !== false) out.push('cod');
    if (o.eft !== false && o.bank && o.bank.iban) out.push('eft');
    return out;
  }
  function shippingText() {
    var o = ord();
    if (!o.shippingFee) return 'Kargo ücretsizdir.';
    if (o.freeShippingOver) return 'Kargo ücreti ' + money(o.shippingFee) + '; ' + money(o.freeShippingOver) + ' ve üzeri siparişlerde kargo ücretsizdir.';
    return 'Kargo ücreti ' + money(o.shippingFee) + '.';
  }
  function payText() {
    var m = methods().map(function (k) { return A.PAYMENT[k]; });
    return m.length ? 'Ödeme yöntemleri: ' + m.join(' veya ') + '.' : '';
  }
  /** Havale / EFT bilgileri kutusu */
  function bankBox(code) {
    var b = ord().bank || {};
    if (!b.iban) return '';
    return '<div class="bank">' +
      '<h4>Havale / EFT bilgileri</h4>' +
      '<dl>' +
      (b.holder ? '<dt>Hesap sahibi</dt><dd>' + esc(b.holder) + '</dd>' : '') +
      (b.bankName ? '<dt>Banka</dt><dd>' + esc(b.bankName) + '</dd>' : '') +
      '<dt>IBAN</dt><dd><code>' + esc(b.iban) + '</code></dd>' +
      (code ? '<dt>Açıklama</dt><dd><code>' + esc(code) + '</code></dd>' : '') +
      '</dl>' +
      '<p class="muted">Havale açıklamasına sipariş kodunuzu yazmanız, ödemenizi hızlıca eşleştirmemizi sağlar.</p></div>';
  }

  /* ================= ANA SAYFA (kurumsal) ================= */
  function home() {
    var H = window.SITE.home || {};
    var g = window.SITE.group;
    var keys = Object.keys(B);
    var any = P.length > 0;

    function tile(k) {
      var n = byBrand(k).length;
      return '<a class="brand-tile brand-tile--' + brandCls(k) + '" href="' + esc(B[k].home) + '">' +
        '<span class="brand-tile__mark">' + esc(B[k].name) + '</span>' +
        '<span class="brand-tile__meta">' + (n ? n + ' ürün' : 'Ürünler yakında') + '</span>' +
        '<span class="brand-tile__go">Markayı keşfedin ' + A.icon.arrowR + '</span></a>';
    }

    var hasStory = keys.some(function (k) { return B[k].story; });
    var pm = methods().map(function (k) { return '<li>' + esc(A.PAYMENT[k]) + '</li>'; }).join('');

    el().innerHTML = '' +
      '<section class="hero hero--home"><div class="hero__in">' +
      '<div class="hero__txt">' +
      '<div class="hero__kicker">' + esc(g.legal) + '</div>' +
      '<h1><span>' + esc(H.claim || g.name) + '</span></h1>' +
      '<p class="hero__lead">' + esc(H.lead || 'Connor Mead ve Brazilline ürünleri tek adreste. Siparişinizi doğrudan bu siteden verebilirsiniz.') + '</p>' +
      '<div class="hero__cta">' +
      '<a class="btn" href="katalog.html">Ürünlerimizi keşfedin</a>' +
      '<a class="btn btn--ghost" href="kurumsal.html">Hakkımızda</a>' +
      '</div></div>' +
      '<div class="hero__brands">' + keys.map(tile).join('') + '</div>' +
      '</div></section>' +

      /* çok görüntülenen ürünler */
      (any
        ? A.rowSection({ id: 'popRow', title: 'Ürünlerimiz', sub: 'En çok görüntülenen ürünler', href: 'katalog.html', items: popularNow(P, 10) })
        : '<section class="section wrap wrap--narrow" style="text-align:center"><div class="empty"><h2>Ürünler yakında</h2>' +
          '<p class="muted">Ürün kataloğumuz hazırlanıyor. Marka sayfalarımızı şimdiden inceleyebilirsiniz.</p>' +
          '<div class="btn-row"><a class="btn" href="connor-mead.html">Connor Mead</a><a class="btn btn--ghost" href="brazilline.html">Brazilline</a></div></div></section>') +

      /* markalar */
      (hasStory ? '<section class="houses">' + keys.map(function (k) {
        return '<div class="house-card' + (k === 'brazilline' ? ' house-card--bl' : '') + '">' +
          '<div class="house-card__mark">' + esc(B[k].name) + '</div><div class="house-card__rule"></div>' +
          (B[k].story ? '<p>' + esc(B[k].story) + '</p>' : '') +
          '<a class="link-u" href="' + esc(B[k].home) + '">' + esc(B[k].name) + ' sayfası</a></div>';
      }).join('') + '</section>' : '') +

      /* sipariş nasıl verilir */
      '<section class="section section--soft"><div class="wrap">' +
      '<div class="shead"><div><h2>Sipariş nasıl verilir?</h2><p>Sipariş doğrudan bu siteden alınır; aracı mağaza yoktur.</p></div></div>' +
      '<ol class="steps">' +
      '<li><b>1</b><h3>Ürünü seçin</h3><p>Ürünlerimizi inceleyin ve beğendiklerinizi sepetinize ekleyin.</p></li>' +
      '<li><b>2</b><h3>Bilgilerinizi girin</h3><p>Hesabınızla giriş yapın; teslimat adresinizi ve ödeme yönteminizi seçin.</p></li>' +
      '<li><b>3</b><h3>Siparişiniz yola çıksın</h3><p>Siparişiniz hazırlanıp kargoya verilir. Durumunu “Siparişlerim” sayfasından izleyebilirsiniz.</p></li>' +
      '</ol>' +
      '<div class="steps__foot">' +
      (pm ? '<div><span class="muted">Ödeme yöntemleri</span><ul class="pills">' + pm + '</ul></div>' : '') +
      '<div><span class="muted">Kargo</span><p style="margin:4px 0 0">' + esc(shippingText()) + '</p></div>' +
      '</div>' +
      '<div class="btn-row" style="margin-top:28px"><a class="btn" href="katalog.html">Alışverişe başlayın</a>' +
      (g.email ? '<a class="btn btn--ghost" href="mailto:' + esc(g.email) + '">Bize yazın</a>' : '') + '</div>' +
      '</div></section>';

    if (any) paintPopular('popRow', P, 10, 'katalog.html');
  }

  /* çok görüntülenenler: önce bayraklara göre hemen çiz, sayılar gelince güncelle */
  function popularNow(list, n) { return window.Stats.sortByViews(list, {}).slice(0, n); }
  function paintPopular(id, list, n, href) {
    window.Stats.popular(list, n).then(function (sorted) {
      var row = document.getElementById(id);
      if (row) row.innerHTML = A.rowCards(sorted, href);
    });
  }

  /* ================= MARKA SAYFASI ================= */
  function brandPage(house) {
    var b = B[house];
    var mine = byBrand(house);
    var other = house === 'connor-mead' ? B['brazilline'] : B['connor-mead'];
    var fresh = mine.filter(function (p) { return p.isNew; });
    var heroP = mine.filter(function (p) { return p.best; })[0] || mine[0];
    var href = 'katalog.html?marka=' + house;

    var typeCards = A.cats(house).map(function (c) {
      var inCat = mine.filter(function (p) { return p.cat === c.id; });
      if (!inCat.length) return '';
      return '<a class="card" href="katalog.html?marka=' + house + '&tur=' + encodeURIComponent(c.id) + '">' +
        '<span class="card__art">' + A.art(inCat[0]) + '</span>' +
        '<span class="card__body"><span class="card__name">' + esc(c.name) + '</span>' +
        '<span class="card__sub">' + inCat.length + ' ürün</span></span></a>';
    }).join('');

    el().innerHTML = '' +
      '<section class="hero"><div class="hero__in">' +
      '<div class="hero__txt">' +
      (house === 'brazilline' ? '<div class="hero__kicker">Connor Mead markası</div>' : '<div class="hero__kicker">Marka</div>') +
      '<h1><span>' + esc(b.claim || b.name) + '</span></h1>' +
      (b.lead ? '<p class="hero__lead">' + esc(b.lead) + '</p>' : '') +
      '<div class="hero__cta">' +
      (mine.length ? '<a class="btn" href="' + href + '">Ürünleri gör</a>' : '') +
      '<a class="btn btn--ghost" href="index.html">Ana sayfa</a>' +
      '</div></div>' +
      (heroP
        ? '<a class="hero__art" href="urun.html?id=' + encodeURIComponent(heroP.id) + '" aria-label="' + esc(heroP.name) + '">' + A.art(heroP) + '</a>'
        : '<div class="hero__art hero__art--brand hero__art--' + brandCls(house) + '" aria-hidden="true"><span>' + esc(b.name) + '</span></div>') +
      '</div></section>' +

      /* çok görüntülenen ürünler */
      (mine.length
        ? A.rowSection({ id: 'popRow', title: 'Ürünlerimiz', sub: 'En çok görüntülenen ' + b.name + ' ürünleri', href: href, items: popularNow(mine, 10) })
        : '<section class="section wrap wrap--narrow" style="text-align:center"><div class="empty"><h2>Ürünler yakında</h2>' +
          '<p class="muted">' + esc(b.name) + ' ürünleri hazırlanıyor.</p>' +
          '<div class="btn-row"><a class="btn btn--ghost" href="index.html">Ana sayfa</a></div></div></section>') +

      /* türler */
      (typeCards ? '<section class="section section--soft"><div class="wrap">' +
        '<div class="shead"><div><h2>Türler</h2><p>İhtiyacınıza göre ürün türüne göz atın.</p></div></div>' +
        '<div class="grid">' + typeCards + '</div></div></section>' : '') +

      /* yeniler */
      (fresh.length ? '<section class="section wrap">' +
        '<div class="shead"><div><h2>Yeni gelenler</h2></div>' +
        '<a class="link-u link-arrow" href="' + href + '&liste=yeni">Tümünü görüntüle ' + A.icon.arrowR + '</a></div>' +
        '<div class="grid">' + fresh.slice(0, 4).map(A.card).join('') + '</div></section>' : '') +

      /* marka hikâyesi */
      ((b.story || other.story) ? '<section class="houses">' +
        '<div class="house-card' + (house === 'brazilline' ? ' house-card--bl' : '') + '">' +
        '<div class="house-card__mark">' + esc(b.name) + '</div><div class="house-card__rule"></div>' +
        (b.story ? '<p>' + esc(b.story) + '</p>' : '') +
        (mine.length ? '<a class="link-u" href="' + href + '">' + esc(b.name) + ' ürünleri</a>' : '') + '</div>' +
        '<div class="house-card' + (other.id === 'brazilline' ? ' house-card--bl' : '') + '">' +
        '<div class="house-card__mark">' + esc(other.name) + '</div><div class="house-card__rule"></div>' +
        (other.story ? '<p>' + esc(other.story) + '</p>' : '') +
        '<a class="link-u" href="' + esc(other.home) + '">' + esc(other.name) + ' sayfası</a></div>' +
        '</section>' : '');

    if (mine.length) paintPopular('popRow', mine, 10, href);
  }

  /* ================= TÜM ÜRÜNLERİMİZ (katalog) ================= */
  function priceBands(list) {
    var prices = list.map(function (p) { return p.price; }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
    if (prices.length < 6) return [];
    var max = prices[prices.length - 1];
    var step = max < 300 ? 10 : max < 1500 ? 50 : 100;
    function r(x) { return Math.max(step, Math.round(x / step) * step); }
    var t1 = r(prices[Math.floor(prices.length / 3)]);
    var t2 = r(prices[Math.floor(prices.length * 2 / 3)]);
    if (t2 <= t1) t2 = t1 + step;
    return [
      ['0-' + t1, A.fmtNum(t1) + ' TL altı'],
      [t1 + '-' + t2, A.fmtNum(t1) + ' – ' + A.fmtNum(t2 - 1) + ' TL'],
      [t2 + '-99999999', A.fmtNum(t2) + ' TL ve üzeri']
    ];
  }

  function katalog() {
    var q = A.params();
    var state = {
      marka: q.marka ? [q.marka] : [],
      tur: (q.tur || q.kategori) ? [q.tur || q.kategori] : [],
      fiyat: [],
      indirim: false,
      liste: q.liste || '',
      q: q.q || '',
      sirala: q.sirala || 'varsayilan'
    };
    var statMap = {};
    var bands = priceBands(P);

    var title = state.q ? '“' + state.q + '” için sonuçlar'
      : state.liste === 'cok-satan' ? 'Çok satanlar'
        : state.liste === 'yeni' ? 'Yeni gelenler'
          : state.tur.length ? A.catName(state.tur[0])
            : (state.marka.length && B[state.marka[0]]) ? B[state.marka[0]].name
              : 'Tüm ürünlerimiz';
    var kicker = title === 'Tüm ürünlerimiz' ? '' : 'Tüm ürünlerimiz';

    el().innerHTML =
      '<div class="wrap"><div class="cat-head">' + (kicker ? '<div class="hero__kicker" style="margin-bottom:10px">' + kicker + '</div>' : '') +
      '<h1>' + esc(title) + '</h1>' +
      (state.marka.length && B[state.marka[0]] && B[state.marka[0]].claim ? '<p>' + esc(B[state.marka[0]].claim) + '</p>' : '') + '</div>' +
      '<div class="cat-bar">' +
      '<button class="chip filter-toggle" id="ftog" aria-expanded="false">Filtrele</button>' +
      '<span class="cat-count" id="count"></span>' +
      '<label class="sort-lbl"><span class="muted">Sırala</span>' +
      '<select class="select" id="sort">' +
      '<option value="varsayilan">Varsayılan</option>' +
      '<option value="populer">En çok görüntülenen</option>' +
      '<option value="fiyat-artan">Fiyat: düşükten yükseğe</option>' +
      '<option value="fiyat-azalan">Fiyat: yüksekten düşüğe</option>' +
      '<option value="yeni">Önce yeniler</option>' +
      '</select></label>' +
      '</div>' +
      '<div class="cat-layout"><aside class="filters" id="filters"></aside><div><div class="grid" id="results"></div></div></div></div>';

    var $sort = document.getElementById('sort');
    $sort.value = state.sirala;
    if (!$sort.value) { $sort.value = 'varsayilan'; state.sirala = 'varsayilan'; }

    function filtersHtml() {
      var brands = Object.keys(B).map(function (k) {
        return '<label><input type="checkbox" name="marka" value="' + k + '"' + (state.marka.indexOf(k) > -1 ? ' checked' : '') + '>' +
          esc(B[k].name) + ' <span>(' + byBrand(k).length + ')</span></label>';
      }).join('');
      var groups = Object.keys(B).map(function (k) {
        if (state.marka.length && state.marka.indexOf(k) < 0) return '';
        if (!A.cats(k).length) return '';
        return '<fieldset><legend>' + esc(B[k].name) + ' türleri</legend>' + A.cats(k).map(function (c) {
          var n = P.filter(function (p) { return p.cat === c.id; }).length;
          return '<label><input type="checkbox" name="tur" value="' + esc(c.id) + '"' + (state.tur.indexOf(c.id) > -1 ? ' checked' : '') + '>' +
            esc(c.name) + ' <span>(' + n + ')</span></label>';
        }).join('') + '</fieldset>';
      }).join('');
      var prices = bands.map(function (r) {
        return '<label><input type="checkbox" name="fiyat" value="' + r[0] + '"' + (state.fiyat.indexOf(r[0]) > -1 ? ' checked' : '') + '>' + r[1] + '</label>';
      }).join('');
      return '<fieldset><legend>Marka</legend>' + brands + '</fieldset>' + groups +
        (prices ? '<fieldset><legend>Fiyat</legend>' + prices + '</fieldset>' : '') +
        '<fieldset><legend>Kampanya</legend><label><input type="checkbox" name="indirim"' + (state.indirim ? ' checked' : '') + '>Sadece indirimliler</label></fieldset>' +
        '<fieldset><button class="btn btn--ghost btn--sm btn--full" id="clear">Filtreleri temizle</button></fieldset>';
    }

    function apply() {
      var list = P.slice();
      if (state.marka.length) list = list.filter(function (p) { return state.marka.indexOf(p.brand) > -1; });
      if (state.tur.length) list = list.filter(function (p) { return state.tur.indexOf(p.cat) > -1; });
      if (state.indirim) list = list.filter(function (p) { return !!p.old; });
      if (state.liste === 'cok-satan') list = list.filter(function (p) { return p.best; });
      if (state.liste === 'yeni') list = list.filter(function (p) { return p.isNew; });
      if (state.fiyat.length) {
        list = list.filter(function (p) {
          return state.fiyat.some(function (r) {
            var a = r.split('-'); return p.price >= +a[0] && p.price < +a[1];
          });
        });
      }
      if (state.q) {
        var t = state.q.toLocaleLowerCase('tr');
        list = list.filter(function (p) {
          return (p.name + ' ' + p.sub + ' ' + p.desc + ' ' + B[p.brand].name + ' ' + A.catName(p.cat)).toLocaleLowerCase('tr').indexOf(t) > -1;
        });
      }
      var s = state.sirala;
      if (s === 'populer') list = window.Stats.sortByViews(list, statMap);
      if (s === 'fiyat-artan') list.sort(function (a, b) { return a.price - b.price; });
      if (s === 'fiyat-azalan') list.sort(function (a, b) { return b.price - a.price; });
      if (s === 'yeni') list.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0); });

      document.getElementById('count').textContent = list.length + ' ürün';
      document.getElementById('results').innerHTML = list.length
        ? list.map(A.card).join('')
        : (P.length
          ? '<div class="empty" style="grid-column:1/-1"><h3>Bu filtrelerle ürün yok</h3><p class="muted">Bir filtreyi kaldırıp tekrar deneyin.</p><button class="btn btn--ghost btn--sm" id="clear2">Filtreleri temizle</button></div>'
          : '<div class="empty" style="grid-column:1/-1"><h3>Ürünler yakında</h3><p class="muted">Katalog hazırlanıyor.</p></div>');

      var u = new URLSearchParams();
      if (state.marka.length === 1) u.set('marka', state.marka[0]);
      if (state.tur.length === 1) u.set('tur', state.tur[0]);
      if (state.liste) u.set('liste', state.liste);
      if (state.q) u.set('q', state.q);
      if (state.sirala !== 'varsayilan') u.set('sirala', state.sirala);
      history.replaceState(null, '', location.pathname + (u.toString() ? '?' + u : ''));
    }

    function bind() { document.getElementById('filters').innerHTML = filtersHtml(); }

    function reset() {
      state.marka = []; state.tur = []; state.fiyat = []; state.indirim = false; state.liste = ''; state.q = '';
      bind(); apply();
    }

    var fEl = document.getElementById('filters');
    fEl.addEventListener('change', function (e) {
      var n = e.target.name, v = e.target.value;
      if (n === 'indirim') state.indirim = e.target.checked;
      else if (state[n]) {
        var i = state[n].indexOf(v);
        if (e.target.checked && i < 0) state[n].push(v);
        if (!e.target.checked && i > -1) state[n].splice(i, 1);
      }
      if (n === 'marka') { state.tur = []; bind(); }
      apply();
    });
    fEl.addEventListener('click', function (e) { if (e.target.id === 'clear') reset(); });

    document.getElementById('ftog').addEventListener('click', function () {
      var f = document.getElementById('filters');
      var on = f.classList.toggle('is-open');
      this.setAttribute('aria-expanded', String(on));
      this.classList.toggle('is-on', on);
    });
    /* görüntülenme sayıları yalnızca "en çok görüntülenen" sıralaması seçilirse okunur (okuma kotasını korur) */
    var statsAsked = false;
    function needStats() {
      if (state.sirala !== 'populer' || statsAsked) return;
      statsAsked = true;
      window.Stats.top(100).then(function (m) { statMap = m; apply(); });
    }
    $sort.addEventListener('change', function () { state.sirala = this.value; needStats(); apply(); });
    document.addEventListener('click', function (e) { if (e.target.id === 'clear2') reset(); });

    bind(); apply(); needStats();
  }

  /* ================= ÜRÜN DETAY ================= */
  function urun() {
    var p = A.product(A.params().id);
    if (!p) { el().innerHTML = '<div class="wrap empty"><h3>Ürün bulunamadı</h3><p class="muted">Bağlantı eski olabilir.</p><a class="btn" href="katalog.html">Tüm ürünlerimiz</a></div>'; return; }
    document.title = p.name + ' — ' + B[p.brand].name;
    document.documentElement.setAttribute('data-house', p.brand);

    var same = P.filter(function (x) { return x.cat === p.cat && x.id !== p.id; }).slice(0, 4);
    if (same.length < 4) same = same.concat(byBrand(p.brand).filter(function (x) { return x.id !== p.id && same.indexOf(x) < 0; })).slice(0, 4);
    var mets = methods();

    el().innerHTML =
      '<div class="wrap">' +
      '<nav class="crumbs"><a href="' + esc(B[p.brand].home) + '">' + esc(B[p.brand].name) + '</a> / ' +
      (p.cat ? '<a href="katalog.html?marka=' + p.brand + '&tur=' + encodeURIComponent(p.cat) + '">' + esc(A.catName(p.cat)) + '</a> / ' : '') +
      '<span class="muted">' + esc(p.name) + '</span></nav>' +
      '<div class="pdp">' +
      '<div class="pdp__art" id="pdpArt">' + A.art(p) + '</div>' +
      '<div>' +
      '<div class="pdp__brand">' + esc(B[p.brand].name) + '</div>' +
      '<h1>' + esc(p.name) + '</h1>' +
      (p.sub ? '<p class="pdp__sub">' + esc(p.sub) + '</p>' : '') +
      '<div class="pdp__meta" id="pdpMeta"><span class="muted">Değerlendirmeler yükleniyor…</span></div>' +
      '<div class="pdp__price">' + money(p.price) + (p.old ? '<s>' + money(p.old) + '</s><span class="tag tag--sale">%' + Math.round((1 - p.price / p.old) * 100) + '</span>' : '') + '</div>' +
      (p.size ? '<p class="muted" style="font-size:13.5px;margin-top:6px">' + esc(p.size) + '</p>' : '') +
      '<div class="pdp__row">' +
      '<div class="qty"><button type="button" data-q="-1" aria-label="Azalt">−</button><output id="qty">1</output><button type="button" data-q="1" aria-label="Artır">+</button></div>' +
      (p.stock === false
        ? '<button class="btn pdp__add" disabled>Tükendi</button>'
        : '<button class="btn pdp__add" id="addBtn">Sepete ekle</button>') +
      '<button class="btn btn--ghost" data-fav="' + esc(p.id) + '" data-fav-text aria-pressed="' + A.isFav(p.id) + '">' + (A.isFav(p.id) ? 'Favorilerde' : 'Favorilere ekle') + '</button>' +
      '</div>' +
      (p.stock === false ? '' : '<button class="btn btn--ghost btn--full" id="buyNow">Hemen satın al</button>') +
      '<div class="buy-where"><h4>Sipariş ve teslimat</h4>' +
      '<p>' + esc(payText() || 'Sipariş, ödeme yöntemi seçilerek doğrudan bu sitede tamamlanır.') + ' ' + esc(shippingText()) + '</p></div>' +
      '<div class="rate-box"><h4>Bu ürünü değerlendirin</h4>' +
      '<div class="rate-in" id="rateIn" role="group" aria-label="Puan ver">' +
      [1, 2, 3, 4, 5].map(function (n) { return '<button type="button" data-rate="' + n + '" aria-label="' + n + ' yıldız">★</button>'; }).join('') +
      '</div><p class="muted" id="rateMsg">Puan vermek için giriş yapmanız gerekir.</p></div>' +
      '<div class="acc">' +
      (p.desc ? accItem('Ürün açıklaması', p.desc, true) : '') +
      (p.usage ? accItem('Nasıl kullanılır', p.usage) : '') +
      (p.ingredients ? accItem('İçindekiler', p.ingredients) : '') +
      accItem('Teslimat ve iade', 'Siparişiniz hazırlandıktan sonra kargoya verilir. ' + shippingText() +
        (window.SITE.group.email ? ' İade, değişim ve diğer sorularınız için ' + window.SITE.group.email + ' adresine yazabilirsiniz.' : '')) +
      '</div></div></div>' +
      (same.length ? '<section class="section"><div class="shead"><div><h2>Bunlar da ilginizi çekebilir</h2></div></div>' +
        '<div class="grid">' + same.map(A.card).join('') + '</div></section>' : '') +
      '</div>';

    var qty = 1;
    document.querySelectorAll('[data-q]').forEach(function (b) {
      b.addEventListener('click', function () {
        qty = Math.max(1, Math.min(20, qty + parseInt(b.dataset.q, 10)));
        document.getElementById('qty').textContent = qty;
      });
    });
    var addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.addEventListener('click', function () { A.addToCart(p.id, '', qty); });
    var buy = document.getElementById('buyNow');
    if (buy) buy.addEventListener('click', function () { A.addToCart(p.id, '', qty, true); location.href = 'siparis-ver.html'; });

    el().addEventListener('click', function (e) {
      var b = e.target.closest('.acc__btn'); if (!b) return;
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      b.nextElementSibling.hidden = open;
    });

    /* ---- görüntülenme sayısı ve puanlar ---- */
    function paintMeta(s) {
      var box = document.getElementById('pdpMeta'); if (!box) return;
      box.innerHTML = (s.count
        ? A.stars(s.avg) + '<b>' + s.avg.toFixed(1).replace('.', ',') + '</b><span class="muted">(' + A.fmtNum(s.count) + ' değerlendirme)</span>'
        : '<span class="muted">Henüz değerlendirme yok</span>') +
        '<span class="pdp__views">' + A.fmtNum(s.views) + ' görüntülenme</span>';
    }
    function paintMine(n) {
      document.querySelectorAll('#rateIn [data-rate]').forEach(function (b) { b.classList.toggle('is-on', +b.dataset.rate <= n); });
      var m = document.getElementById('rateMsg');
      if (m && n) m.textContent = 'Verdiğiniz puan: ' + n + ' / 5. Değiştirmek için başka bir yıldıza dokunun.';
    }
    var stat = { views: 0, count: 0, avg: 0 };
    window.Stats.view(p.id).then(function () { return window.Stats.get(p.id); }).then(function (s) { stat = s; paintMeta(s); });
    Backend.ready.then(function () {
      var m = document.getElementById('rateMsg');
      if (Backend.user()) { if (m) m.textContent = 'Puanınızı seçmek için bir yıldıza dokunun.'; window.Stats.myRating(p.id).then(paintMine); }
      else if (m) m.innerHTML = 'Puan vermek için <a class="link-inline" href="hesap.html?next=' + encodeURIComponent('urun.html?id=' + p.id) + '">giriş yapmanız</a> gerekir.';
    });
    document.getElementById('rateIn').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rate]'); if (!b) return;
      if (!Backend.user()) { A.toast('Puan vermek için giriş yapmalısınız.', 'hesap.html?next=' + encodeURIComponent('urun.html?id=' + p.id), 'Giriş yap'); return; }
      var n = +b.dataset.rate;
      window.Stats.rate(p.id, n).then(function (r) {
        stat.avg = r.avg; stat.count = r.count; paintMeta(stat); paintMine(r.mine);
        A.toast('Puanınız kaydedildi. Teşekkürler!');
      }).catch(function (err) { A.toast(err.message || 'Puan kaydedilemedi.'); });
    });
  }
  function accItem(t, body, open) {
    return '<div class="acc__item"><button class="acc__btn" aria-expanded="' + (!!open) + '">' + esc(t) + '<i>+</i></button>' +
      '<div class="acc__panel"' + (open ? '' : ' hidden') + '>' + esc(body) + '</div></div>';
  }

  /* ================= SEPET ================= */
  function sepet() {
    function draw() {
      A.pruneCart();
      var lines = A.cart();
      if (!lines.length) {
        el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Sepetim</h1></div>' +
          '<div class="empty"><h3>Sepetiniz boş</h3><p class="muted">Beğendiğiniz ürünleri sepete ekleyin, siparişinizi birkaç adımda tamamlayın.</p>' +
          '<div class="btn-row"><a class="btn" href="katalog.html">Tüm ürünlerimiz</a><a class="btn btn--ghost" href="connor-mead.html">Connor Mead</a><a class="btn btn--ghost" href="brazilline.html">Brazilline</a></div></div></div>';
        return;
      }
      var t = A.totals(), soldOut = false;
      var rows = lines.map(function (l, i) {
        var p = A.product(l.id); if (!p) return '';
        if (p.stock === false) soldOut = true;
        return '<div class="cart-line">' +
          '<a class="cart-line__art" href="urun.html?id=' + encodeURIComponent(p.id) + '">' + A.art(p) + '</a>' +
          '<div><a class="cart-line__name" href="urun.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>' +
          '<div class="cart-line__meta">' + esc(B[p.brand].name) + (p.size ? ' · ' + esc(p.size) : '') + (l.variant ? ' · ' + esc(l.variant) : '') + '</div>' +
          (p.stock === false ? '<div class="cart-line__warn">Bu ürün şu anda tükendi; siparişe devam etmek için sepetten çıkarın.</div>' : '') +
          '<div class="cart-line__tools">' +
          '<div class="qty"><button type="button" data-line="' + i + '" data-d="-1" aria-label="Azalt">−</button><output>' + l.qty + '</output><button type="button" data-line="' + i + '" data-d="1" aria-label="Artır">+</button></div>' +
          '<button class="btn--link" data-del="' + i + '">Kaldır</button>' +
          '</div></div>' +
          '<div class="cart-line__price">' + money(p.price * l.qty) + (p.old ? '<div class="muted" style="font-size:12.5px"><s>' + money(p.old * l.qty) + '</s></div>' : '') + '</div>' +
          '</div>';
      }).join('');

      el().innerHTML = '<div class="wrap"><div class="cat-head" style="text-align:left"><h1>Sepetim</h1></div>' +
        '<div class="cart-layout"><div>' + rows +
        '<div style="padding-top:18px"><button class="btn--link" id="empty">Sepeti boşalt</button></div></div>' +
        '<aside class="summary"><h3>Özet</h3>' +
        '<dl><dt>Ara toplam</dt><dd>' + money(t.list) + '</dd>' +
        (t.discount > 0 ? '<dt>İndirim</dt><dd style="color:var(--sale)">−' + money(t.discount) + '</dd>' : '') +
        '<dt>Kargo</dt><dd>' + (t.ship ? money(t.ship) : 'Ücretsiz') + '</dd>' +
        '<dt class="total">Toplam</dt><dd class="total">' + money(t.sub + t.ship) + '</dd></dl>' +
        '<a class="btn btn--full' + (soldOut ? '" aria-disabled="true" style="opacity:.4;pointer-events:none' : '') + '" href="siparis-ver.html" id="order">Siparişi tamamla</a>' +
        '<p class="muted" style="font-size:12.5px;margin:14px 0 0">' + esc(payText() || 'Ödeme yöntemini bir sonraki adımda seçeceksiniz.') + '</p>' +
        '</aside></div></div>';

      document.getElementById('empty').addEventListener('click', function () { A.clearCart(); });
    }

    el().addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-del]'))) A.removeLine(+t.dataset.del);
      else if ((t = e.target.closest('[data-line]'))) {
        var i = +t.dataset.line;
        if (A.cart()[i]) A.setQty(i, A.cart()[i].qty + (+t.dataset.d));
      }
    });

    draw();
    document.addEventListener('store:change', draw);
  }

  /* ================= SİPARİŞİ TAMAMLA ================= */
  function odeme() {
    var placed = false;   /* sipariş verildikten sonra sepet boşalır; boş sepet ekranı gösterilmesin */

    function login() {
      el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Siparişi tamamla</h1></div>' +
        '<div class="empty"><h3>Önce giriş yapmalısınız</h3>' +
        '<p class="muted">Siparişinizi takip edebilmeniz için hesabınızla giriş yapmanız gerekir. Sepetiniz korunur.</p>' +
        '<div class="btn-row"><a class="btn" href="hesap.html?next=siparis-ver.html">Giriş yap / Hesap aç</a>' +
        '<a class="btn btn--ghost" href="sepet.html">Sepete dön</a></div></div></div>';
    }
    function emptyCart() {
      el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Siparişi tamamla</h1></div>' +
        '<div class="empty"><h3>Sepetiniz boş</h3><p class="muted">Sipariş vermek için önce sepete ürün ekleyin.</p>' +
        '<div class="btn-row"><a class="btn" href="katalog.html">Tüm ürünlerimiz</a></div></div></div>';
    }

    function form(u, doc) {
      var mets = methods();
      if (!mets.length) {
        el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Siparişi tamamla</h1></div>' +
          '<div class="empty"><h3>Sipariş şu anda alınamıyor</h3><p class="muted">Ödeme yöntemi tanımlanmamış. Lütfen ' +
          esc(window.SITE.group.email || 'bizimle') + ' ile iletişime geçin.</p></div></div>';
        return;
      }
      var sel = mets[0];
      var lines = A.cart().filter(function (l) { return A.product(l.id); });
      var demo = Backend.mode() === 'demo';

      function summary() {
        var t = A.totals(sel);
        return '<aside class="summary"><h3>Sipariş özeti</h3>' +
          '<ul class="mini-lines">' + lines.map(function (l) {
            var p = A.product(l.id);
            return '<li><span>' + esc(p.name) + ' <em>× ' + l.qty + '</em></span><b>' + money(p.price * l.qty) + '</b></li>';
          }).join('') + '</ul>' +
          '<dl><dt>Ara toplam</dt><dd>' + money(t.sub) + '</dd>' +
          '<dt>Kargo</dt><dd>' + (t.ship ? money(t.ship) : 'Ücretsiz') + '</dd>' +
          (t.cod ? '<dt>Kapıda ödeme bedeli</dt><dd>' + money(t.cod) + '</dd>' : '') +
          '<dt class="total">Toplam</dt><dd class="total">' + money(t.total) + '</dd></dl>' +
          (ord().note ? '<p class="muted" style="font-size:13px;margin:0">' + esc(ord().note) + '</p>' : '') +
          '</aside>';
      }

      el().innerHTML = '<div class="wrap"><div class="cat-head" style="text-align:left"><h1>Siparişi tamamla</h1></div>' +
        (demo ? '<div class="form-msg err">Bu sitede sunucu bağlantısı (Firebase) henüz kurulu değil. Verdiğiniz sipariş yalnızca bu tarayıcıda saklanır ve bize ulaşmaz.</div>' : '') +
        '<div class="cart-layout"><form id="ordForm" novalidate>' +
        '<div class="panel"><h3>Teslimat bilgileri</h3>' +
        '<div class="two-col">' +
        '<label class="field"><span>Ad soyad *</span><input class="input" name="name" autocomplete="name" required value="' + esc(doc.name || u.name || '') + '"></label>' +
        '<label class="field"><span>Telefon *</span><input class="input" name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="05xx xxx xx xx" required value="' + esc(doc.phone || '') + '"></label>' +
        '</div>' +
        '<label class="field"><span>E-posta</span><input class="input" value="' + esc(u.email) + '" disabled></label>' +
        '<div class="two-col">' +
        '<label class="field"><span>İl *</span><input class="input" name="city" autocomplete="address-level1" required value="' + esc(doc.city || '') + '"></label>' +
        '<label class="field"><span>İlçe *</span><input class="input" name="district" autocomplete="address-level2" required value="' + esc(doc.district || '') + '"></label>' +
        '</div>' +
        '<label class="field"><span>Açık adres *</span><textarea class="textarea" name="address" autocomplete="street-address" rows="3" required placeholder="Mahalle, cadde/sokak, bina ve daire no">' + esc(doc.address || '') + '</textarea></label>' +
        '<label class="field"><span>Sipariş notu (isteğe bağlı)</span><textarea class="textarea" name="note" rows="2" placeholder="Kuryeye ya da bize iletmek istediğiniz not"></textarea></label>' +
        '</div>' +
        '<div class="panel"><h3>Ödeme yöntemi</h3>' +
        '<div class="pay-opts">' + mets.map(function (k, i) {
          var o = ord();
          return '<label class="pay-opt"><input type="radio" name="pay" value="' + k + '"' + (i === 0 ? ' checked' : '') + '>' +
            '<span><b>' + esc(A.PAYMENT[k]) + '</b>' +
            '<small>' + (k === 'cod' ? 'Siparişiniz teslim edilirken ödersiniz.' + (o.codFee ? ' Hizmet bedeli: ' + money(o.codFee) + '.' : '')
              : 'Sipariş sonrası gösterilen IBAN’a havale/EFT yaparsınız.') + '</small></span></label>';
        }).join('') + '</div></div>' +
        '<div class="pay-total"><span>Ödenecek toplam</span><b id="payTotal">' + money(A.totals(sel).total) + '</b></div>' +
        '<div id="ordMsg"></div>' +
        '<button class="btn btn--full" type="submit" id="ordBtn">Siparişi onayla</button>' +
        '<p class="muted" style="font-size:12.5px;margin-top:12px">“Siparişi onayla” düğmesine bastığınızda siparişiniz bize iletilir.</p>' +
        '</form><div id="sum">' + summary() + '</div></div></div>';

      var f = document.getElementById('ordForm');
      f.addEventListener('change', function (e) {
        if (e.target.name === 'pay') {
          sel = e.target.value;
          document.getElementById('sum').innerHTML = summary();
          document.getElementById('payTotal').textContent = money(A.totals(sel).total);
        }
      });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(f), msg = document.getElementById('ordMsg');
        function bad(t) { msg.innerHTML = '<div class="form-msg err">' + esc(t) + '</div>'; msg.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
        var c = {
          name: String(d.get('name') || '').trim(), phone: String(d.get('phone') || '').trim(),
          city: String(d.get('city') || '').trim(), district: String(d.get('district') || '').trim(),
          address: String(d.get('address') || '').trim(), note: String(d.get('note') || '').trim()
        };
        if (c.name.length < 3) return bad('Lütfen ad ve soyadınızı yazın.');
        if (c.phone.replace(/\D/g, '').length < 10) return bad('Lütfen geçerli bir telefon numarası yazın.');
        if (!c.city || !c.district) return bad('Lütfen il ve ilçe bilgisini yazın.');
        if (c.address.length < 10) return bad('Lütfen açık adresinizi eksiksiz yazın.');
        if (A.cart().some(function (l) { var p = A.product(l.id); return !p || p.stock === false; })) return bad('Sepetinizde satışta olmayan ürün var. Lütfen sepeti güncelleyin.');
        msg.innerHTML = '';

        var t = A.totals(sel), btn = document.getElementById('ordBtn');
        btn.disabled = true; btn.textContent = 'Siparişiniz gönderiliyor…';
        var items = A.cart().map(function (l) {
          var p = A.product(l.id);
          return { id: p.id, name: p.name, brand: B[p.brand].name, variant: l.variant || '', qty: l.qty, price: p.price };
        });
        Backend.createOrder({
          payment: sel, customer: c, items: items,
          subtotal: t.sub, shipping: t.ship, codFee: t.cod, total: t.total
        }).then(function (rec) {
          placed = true;
          Backend.save({ name: c.name, phone: c.phone, city: c.city, district: c.district, address: c.address });
          /* boş sepet buluta yazılmadan sayfa değişirse eski sepet geri gelebilir; kısa süre beklenir */
          Promise.race([A.clearCart(), new Promise(function (r) { setTimeout(r, 1500); })]).then(function () { done(rec); });
        }).catch(function (err) {
          btn.disabled = false; btn.textContent = 'Siparişi onayla';
          bad(err.message || 'Sipariş gönderilemedi.');
        });
      });
    }

    function done(rec) {
      window.scrollTo(0, 0);
      el().innerHTML = '<div class="wrap wrap--narrow" style="padding-bottom:70px">' +
        '<div class="cat-head"><div class="hero__kicker" style="margin-bottom:10px">Teşekkür ederiz</div><h1>Siparişiniz alındı</h1></div>' +
        '<div class="panel" style="text-align:center"><p class="muted" style="margin:0 auto 6px">Sipariş kodunuz</p>' +
        '<p class="order-code">' + esc(rec.code) + '</p>' +
        '<p style="margin:0 auto">' + (rec.payment === 'eft'
          ? 'Siparişinizin hazırlanması için ödemenizi aşağıdaki hesaba havale/EFT ile yapın.'
          : 'Ödemenizi siparişiniz teslim edilirken yapabilirsiniz.') + '</p></div>' +
        (rec.payment === 'eft' ? bankBox(rec.code) : '') +
        '<div class="panel"><h3>Sipariş özeti</h3>' +
        '<ul class="mini-lines">' + rec.items.map(function (i) { return '<li><span>' + esc(i.name) + ' <em>× ' + i.qty + '</em></span><b>' + money(i.price * i.qty) + '</b></li>'; }).join('') + '</ul>' +
        '<dl class="sum-dl"><dt>Ara toplam</dt><dd>' + money(rec.subtotal) + '</dd>' +
        '<dt>Kargo</dt><dd>' + (rec.shipping ? money(rec.shipping) : 'Ücretsiz') + '</dd>' +
        (rec.codFee ? '<dt>Kapıda ödeme bedeli</dt><dd>' + money(rec.codFee) + '</dd>' : '') +
        '<dt class="total">Toplam</dt><dd class="total">' + money(rec.total) + '</dd></dl>' +
        '<p class="muted" style="margin:14px 0 0;font-size:13.5px">Teslimat: ' + esc(rec.customer.name) + ' — ' + esc(rec.customer.address) + ', ' + esc(rec.customer.district) + '/' + esc(rec.customer.city) + '</p></div>' +
        '<div class="btn-row" style="justify-content:center"><a class="btn" href="siparislerim.html">Siparişlerim</a><a class="btn btn--ghost" href="index.html">Ana sayfa</a></div></div>';
    }

    Backend.ready.then(function () {
      var u = Backend.user();
      A.pruneCart();
      if (!u) return login();
      if (!A.cart().length) return emptyCart();
      Backend.load().then(function (doc) { form(u, doc || {}); });
    });
  }

  /* ================= FAVORİLER ================= */
  function favoriler() {
    function draw() {
      var list = A.favs().map(A.product).filter(Boolean);
      el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Favorilerim</h1>' +
        '<p>' + (list.length ? list.length + ' ürün kaydettiniz.' : 'Beğendiğiniz ürünleri kalp simgesiyle buraya kaydedebilirsiniz.') + '</p></div>' +
        (list.length ? '<div class="grid" style="padding-bottom:60px">' + list.map(A.card).join('') + '</div>'
          : '<div class="empty"><h3>Henüz favoriniz yok</h3><div class="btn-row"><a class="btn" href="katalog.html">Ürünlere göz atın</a></div></div>') +
        '</div>';
    }
    draw();
    document.addEventListener('store:change', draw);
  }

  /* ================= HESAP ================= */

  /** Güvenlik soruları bloğu: 3 soru seçilir, her birine cevap yazılır. */
  function secBlock() {
    var Q = window.SITE.securityQuestions || [];
    var pick = [0, 3, 5];
    return '<fieldset class="secq"><legend>Güvenlik soruları</legend>' +
      '<p class="muted secq__note">Şifrenizi değiştirmeniz gerektiğinde bu üç sorudan biri size <b>rastgele</b> sorulur. ' +
      'Cevaplarınızı not edin; harf büyüklüğü ve Türkçe karakterler önemli değildir.</p>' +
      [0, 1, 2].map(function (i) {
        var chosen = Q[pick[i] % Math.max(1, Q.length)];
        return '<div class="secq__row">' +
          '<label class="field"><span>' + (i + 1) + '. soru</span><select class="select" name="q' + i + '" data-secq>' +
          Q.map(function (q) { return '<option' + (q === chosen ? ' selected' : '') + '>' + esc(q) + '</option>'; }).join('') + '</select></label>' +
          '<label class="field"><span>Cevabınız</span><input class="input" name="a' + i + '" autocomplete="off" required></label>' +
          '</div>';
      }).join('') + '</fieldset>';
  }
  /** Aynı soru iki kez seçilmesin: çakışma olursa diğer kutu boşta kalan bir soruya geçer. */
  function bindSecBlock(root) {
    var sels = Array.prototype.slice.call(root.querySelectorAll('select[data-secq]'));
    sels.forEach(function (s) {
      s.addEventListener('change', function () {
        sels.forEach(function (o) {
          if (o === s || o.value !== s.value) return;
          var used = sels.map(function (x) { return x.value; });
          for (var i = 0; i < o.options.length; i++) { if (used.indexOf(o.options[i].value) < 0) { o.value = o.options[i].value; break; } }
        });
      });
    });
  }
  function readSec(form) {
    var d = new FormData(form);
    return [0, 1, 2].map(function (i) { return { q: String(d.get('q' + i) || ''), a: String(d.get('a' + i) || '') }; });
  }

  /** Şifre yenileme akışı (e-posta → rastgele güvenlik sorusu → yeni şifre).
      opt: { email, fixed, onDone, onCancel } */
  function recovery(box, opt) {
    var st = { email: opt.email || '', question: '', challenge: '' };

    function say(text, kind) {
      var m = box.querySelector('[data-msg]');
      if (m) m.innerHTML = text ? '<div class="form-msg ' + (kind || '') + '">' + esc(text) + '</div>' : '';
    }
    function cancelBtn() { return opt.onCancel ? '<div style="text-align:center;margin-top:14px"><button type="button" class="btn--link" data-cancel>Vazgeç</button></div>' : ''; }
    function wireCancel() { var c = box.querySelector('[data-cancel]'); if (c) c.addEventListener('click', opt.onCancel); }

    function stepEmail(msg, kind) {
      box.innerHTML = '<form novalidate>' +
        '<p class="muted">E-posta adresinizi yazın. Hesabınızı açarken belirlediğiniz güvenlik sorularından biri size sorulacak.</p>' +
        '<label class="field"><span>E-posta</span><input class="input" type="email" name="email" required autocomplete="email" value="' + esc(st.email) + '"></label>' +
        '<div data-msg></div><button class="btn btn--full" type="submit">Devam</button>' + cancelBtn() + '</form>';
      say(msg, kind); wireCancel();
      box.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        st.email = String(new FormData(this).get('email') || '').trim();
        ask();
      });
    }

    function ask() {
      box.innerHTML = '<p class="muted" style="text-align:center;padding:24px 0">Soru getiriliyor…</p>';
      Backend.recoveryStart(st.email).then(function (r) {
        st.question = r.question; st.challenge = r.challenge; stepAnswer();
      }).catch(function (err) { stepEmail(err.message, 'err'); });
    }

    function stepAnswer(msg, kind) {
      box.innerHTML = '<form novalidate>' +
        '<p class="muted" style="margin-bottom:6px">Güvenlik sorusu</p>' +
        '<p class="secq__ask">' + esc(st.question) + '</p>' +
        '<label class="field"><span>Cevabınız</span><input class="input" name="answer" autocomplete="off" required></label>' +
        '<label class="field"><span>Yeni şifre</span><input class="input" type="password" name="p1" minlength="6" autocomplete="new-password" required></label>' +
        '<label class="field"><span>Yeni şifre (tekrar)</span><input class="input" type="password" name="p2" minlength="6" autocomplete="new-password" required></label>' +
        '<div data-msg></div>' +
        '<button class="btn btn--full" type="submit">Şifreyi değiştir</button>' +
        '<div style="text-align:center;margin-top:14px"><button type="button" class="btn--link" data-another>Başka bir soru sor</button></div>' +
        cancelBtn() + '</form>';
      say(msg, kind); wireCancel();
      var f = box.querySelector('form');
      f.querySelector('[data-another]').addEventListener('click', function () { ask(); });
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var d = new FormData(f);
        var a = String(d.get('answer') || ''), p1 = String(d.get('p1') || ''), p2 = String(d.get('p2') || '');
        if (!a.trim()) return say('Lütfen soruyu yanıtlayın.', 'err');
        if (p1.length < 6) return say('Yeni şifre en az 6 karakter olmalı.', 'err');
        if (p1 !== p2) return say('Yeni şifreler birbiriyle aynı değil.', 'err');
        var btn = f.querySelector('button[type=submit]');
        btn.disabled = true; btn.textContent = 'Bekleyin…';
        Backend.recoveryFinish(st.email, st.challenge, a, p1).then(function (u) {
          opt.onDone(u);
        }).catch(function (err) {
          if (err.code === 'wrong_answer') { stepAnswer(err.message, 'err'); return; }
          stepEmail(err.message, 'err');
        });
      });
    }

    if (opt.fixed && st.email) ask(); else stepEmail();
  }

  function hesap() {
    var mode = 'in';
    var nextUrl = A.safeNext(A.params().next);

    function goNext(msg) {
      if (nextUrl) { location.href = nextUrl; return; }
      render(); A.toast(msg);
    }

    function guest() {
      el().innerHTML = '<div class="wrap"><div class="auth-wrap">' +
        '<div class="auth-side">' +
        '<h2>Hesabınız sizi hatırlasın</h2>' +
        '<ul><li>Sepetiniz ve favorileriniz telefonunuzla bilgisayarınız arasında senkron kalır.</li>' +
        '<li>Siparişlerinizi ve durumlarını tek yerden takip edersiniz.</li>' +
        '<li>Teslimat bilgileriniz kayıtlı kalır; her siparişte yeniden yazmazsınız.</li></ul>' +
        '</div>' +
        '<div class="auth-form" id="authBox">' +
        '<div class="tabs"><button class="is-on" data-tab="in">Giriş yap</button><button data-tab="up">Hesap aç</button></div>' +
        '<div id="msg"></div>' +
        '<form id="authForm" novalidate>' +
        '<label class="field"><span>E-posta</span><input class="input" type="email" name="email" required autocomplete="email"></label>' +
        '<label class="field"><span>Şifre</span><input class="input" type="password" name="password" required minlength="6" autocomplete="current-password"></label>' +
        '<div id="upOnly" hidden>' +
        '<label class="field"><span>Şifre (tekrar)</span><input class="input" type="password" name="password2" minlength="6" autocomplete="new-password"></label>' +
        secBlock() +
        '</div>' +
        '<button class="btn btn--full" type="submit" id="submitBtn">Giriş yap</button>' +
        '</form>' +
        '<div style="text-align:center;margin-top:14px" id="forgotRow"><button class="btn--link" id="forgot">Şifremi unuttum</button></div>' +
        (window.SITE.googleSignIn && Backend.mode() === 'firebase' ? '<div class="divider">veya</div><button class="btn btn--ghost btn--full" id="gbtn">Google ile devam et</button>' : '') +
        '</div></div></div>';

      var form = document.getElementById('authForm');
      var msg = document.getElementById('msg');
      function say(text, kind) { msg.innerHTML = text ? '<div class="form-msg ' + (kind || '') + '">' + esc(text) + '</div>' : ''; }
      bindSecBlock(form);

      function setMode(m) {
        mode = m;
        el().querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('is-on', x.dataset.tab === m); });
        document.getElementById('upOnly').hidden = m !== 'up';
        /* gizli alanlar zorunlu sayılmasın */
        form.querySelectorAll('#upOnly input').forEach(function (i) { i.required = m === 'up'; });
        document.getElementById('submitBtn').textContent = m === 'up' ? 'Hesap aç' : 'Giriş yap';
        document.getElementById('forgotRow').hidden = m === 'up';
        form.password.setAttribute('autocomplete', m === 'up' ? 'new-password' : 'current-password');
        say('');
      }
      el().querySelectorAll('[data-tab]').forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.dataset.tab); });
      });
      setMode('in');
      if (A.params().tab === 'up') setMode('up');

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        say('');
        var d = new FormData(form);
        var email = String(d.get('email') || '').trim(), pass = String(d.get('password') || '');
        if (!email || email.indexOf('@') < 1) return say('E-posta adresi geçerli görünmüyor.', 'err');
        if (pass.length < 6) return say('Şifre en az 6 karakter olmalı.', 'err');
        var job;
        if (mode === 'up') {
          if (pass !== String(d.get('password2') || '')) return say('Şifreler birbiriyle aynı değil.', 'err');
          job = Backend.signUp(email, pass, readSec(form));
        } else {
          job = Backend.signIn(email, pass);
        }
        var btn = document.getElementById('submitBtn');
        btn.disabled = true; btn.textContent = 'Bekleyin…';
        job.then(function () { goNext(mode === 'up' ? 'Hesabınız açıldı.' : 'Giriş yapıldı.'); })
          .catch(function (err) {
            say(err.message, 'err');
            btn.disabled = false; btn.textContent = mode === 'up' ? 'Hesap aç' : 'Giriş yap';
          });
      });

      document.getElementById('forgot').addEventListener('click', function () {
        var email = form.email.value.trim();
        var box = document.getElementById('authBox');
        box.innerHTML = '<h3 style="margin-bottom:14px">Şifrenizi değiştirin</h3><div id="rcBox"></div>';
        recovery(document.getElementById('rcBox'), {
          email: email,
          onDone: function () { goNext('Şifreniz değiştirildi ve giriş yapıldı.'); },
          onCancel: function () { guest(); }
        });
      });

      var g = document.getElementById('gbtn');
      if (g) g.addEventListener('click', function () {
        Backend.google().then(function () { goNext('Giriş yapıldı.'); }).catch(function (e2) { say(e2.message, 'err'); });
      });
    }

    function member(u) {
      Backend.load().then(function (doc) {
        doc = doc || {};
        el().innerHTML = '<div class="wrap"><div class="cat-head" style="text-align:left"><h1>Hesabım</h1>' +
          '<p style="margin-left:0">' + esc(u.email) + '</p></div>' +
          '<div class="acct-grid">' +
          '<nav class="acct-menu"><a class="is-on" href="hesap.html">Bilgilerim</a><a href="siparislerim.html">Siparişlerim</a><a href="favoriler.html">Favorilerim</a><a href="sepet.html">Sepetim</a></nav>' +
          '<div>' +
          '<div class="panel"><h3>İletişim ve teslimat bilgileri</h3>' +
          '<form id="prof"><div class="two-col">' +
          '<label class="field"><span>Ad soyad</span><input class="input" name="name" autocomplete="name" value="' + esc(doc.name || u.name || '') + '"></label>' +
          '<label class="field"><span>Telefon</span><input class="input" name="phone" type="tel" autocomplete="tel" value="' + esc(doc.phone || '') + '" placeholder="05xx xxx xx xx"></label>' +
          '<label class="field"><span>İl</span><input class="input" name="city" autocomplete="address-level1" value="' + esc(doc.city || '') + '"></label>' +
          '<label class="field"><span>İlçe</span><input class="input" name="district" autocomplete="address-level2" value="' + esc(doc.district || '') + '"></label>' +
          '</div>' +
          '<label class="field"><span>Açık adres</span><textarea class="textarea" name="address" autocomplete="street-address" placeholder="Siparişlerinizde otomatik doldurulur">' + esc(doc.address || '') + '</textarea></label>' +
          '<button class="btn btn--sm" type="submit">Bilgileri kaydet</button>' +
          '<span id="pmsg" class="muted" style="margin-left:12px;font-size:13px"></span>' +
          '</form></div>' +
          (u.password
            ? '<div class="panel"><h3>Şifre</h3><p class="muted">Şifrenizi değiştirmek için güvenlik sorularınızdan biri size rastgele sorulur.</p>' +
              '<button class="btn btn--ghost btn--sm" id="chgPass">Şifreyi değiştir</button></div>' +
              '<div class="panel"><h3>Güvenlik soruları</h3><p class="muted" id="secState">Durum kontrol ediliyor…</p>' +
              '<button class="btn btn--ghost btn--sm" id="chgSec" hidden>Soruları güncelle</button></div>'
            : '<div class="panel"><h3>Şifre</h3><p class="muted" style="margin:0">Google hesabınızla giriş yaptığınız için ayrı bir şifreniz yok.</p></div>') +
          '<div class="panel"><h3>Oturum</h3><p class="muted">Bu cihazdan çıkış yapabilirsiniz. Sepetiniz ve favorileriniz hesabınızda kalır.</p>' +
          '<button class="btn btn--ghost btn--sm" id="out">Çıkış yap</button></div>' +
          '<div class="panel danger"><h3>Hesabı kapat</h3><p class="muted">Hesabınız, kayıtlı bilgileriniz ve güvenlik sorularınız kalıcı olarak silinir. Geçmiş siparişleriniz işletme kayıtlarında saklanmaya devam eder. Bu işlem geri alınamaz.</p>' +
          '<button class="btn btn--ghost btn--sm" id="del" style="border-color:var(--sale);color:var(--sale)">Hesabımı kapat</button></div>' +
          '</div></div></div>';

        document.getElementById('prof').addEventListener('submit', function (e) {
          e.preventDefault();
          var d = new FormData(e.target);
          Backend.save({ name: d.get('name'), phone: d.get('phone'), city: d.get('city'), district: d.get('district'), address: d.get('address') }).then(function () {
            document.getElementById('pmsg').textContent = 'Kaydedildi.';
            setTimeout(function () { var x = document.getElementById('pmsg'); if (x) x.textContent = ''; }, 2500);
          });
        });
        document.getElementById('out').addEventListener('click', function () {
          Backend.signOut().then(function () { A.toast('Çıkış yapıldı.'); render(); });
        });

        /* ---- şifre değiştir (güvenlik sorusu ile) ---- */
        var chg = document.getElementById('chgPass');
        if (chg) chg.addEventListener('click', function () {
          var m = A.modal('<h3>Şifreyi değiştir</h3><div id="rcBox"></div>');
          recovery(m.el.querySelector('#rcBox'), {
            email: u.email, fixed: true,
            onDone: function () { m.close(); A.toast('Şifreniz değiştirildi.'); render(); },
            onCancel: function () { m.close(); }
          });
        });

        /* ---- güvenlik soruları ---- */
        var st = document.getElementById('secState'), cs = document.getElementById('chgSec');
        if (st) Backend.securityStatus().then(function (s) {
          st.innerHTML = s.has
            ? 'Güvenlik sorularınız <b>ayarlı</b>.' + (s.questions && s.questions.length ? '<br><span style="font-size:13px">' + s.questions.map(esc).join('<br>') + '</span>' : '')
            : '<b style="color:var(--sale)">Güvenlik sorularınız ayarlı değil.</b> Şifrenizi unutursanız yenileyemezsiniz.';
          cs.textContent = s.has ? 'Soruları güncelle' : 'Soruları belirle'; cs.hidden = false;
        }).catch(function (err) { st.textContent = 'Durum alınamadı: ' + err.message; });
        if (cs) cs.addEventListener('click', function () {
          var m = A.modal('<h3>Güvenlik soruları</h3><form id="secForm" novalidate>' +
            '<label class="field"><span>Mevcut şifreniz</span><input class="input" type="password" name="cur" autocomplete="current-password" required></label>' +
            secBlock() + '<div id="secMsg"></div>' +
            '<div class="modal__act"><button type="button" class="btn btn--ghost" data-close>Vazgeç</button><button class="btn" type="submit">Kaydet</button></div></form>');
          var f = m.el.querySelector('#secForm');
          bindSecBlock(f);
          f.addEventListener('submit', function (e) {
            e.preventDefault();
            var out = m.el.querySelector('#secMsg');
            Backend.setSecurity(readSec(f), String(new FormData(f).get('cur') || '')).then(function () {
              m.close(); A.toast('Güvenlik soruları kaydedildi.'); render();
            }).catch(function (err) { out.innerHTML = '<div class="form-msg err">' + esc(err.message) + '</div>'; });
          });
        });

        /* ---- hesabı kapat ---- */
        document.getElementById('del').addEventListener('click', function () {
          var needsPass = Backend.mode() === 'firebase' && u.password;
          var m = A.modal('<h3>Hesabınızı kapatmak üzeresiniz</h3>' +
            '<p>Bu işlem geri alınamaz. Devam etmek için aşağıya <b>KAPAT</b> yazın' + (needsPass ? ' ve şifrenizi girin' : '') + '.</p>' +
            '<label class="field"><span>Onay</span><input class="input" id="confirmTxt" placeholder="KAPAT"></label>' +
            (needsPass ? '<label class="field"><span>Şifre</span><input class="input" type="password" id="confirmPass"></label>' : '') +
            '<div id="dmsg"></div>' +
            '<div class="modal__act">' +
            '<button class="btn btn--sm btn--ghost" data-close>Vazgeç</button>' +
            '<button class="btn btn--sm" id="doDel" style="background:var(--sale);color:#fff">Hesabı kapat</button></div>');
          m.el.querySelector('#doDel').addEventListener('click', function () {
            var txt = m.el.querySelector('#confirmTxt').value.trim().toLocaleUpperCase('tr');
            var dm = m.el.querySelector('#dmsg');
            if (txt !== 'KAPAT') { dm.innerHTML = '<div class="form-msg err">Onay kutusuna KAPAT yazmanız gerekiyor.</div>'; return; }
            var pass = needsPass ? m.el.querySelector('#confirmPass').value : null;
            Backend.deleteAccount(pass).then(function () {
              m.close(); A.toast('Hesabınız kapatıldı.'); render();
            }).catch(function (err) { dm.innerHTML = '<div class="form-msg err">' + esc(err.message) + '</div>'; });
          });
        });
      });
    }

    function render() {
      var u = Backend.user();
      if (u && nextUrl) { location.replace(nextUrl); return; }
      if (u) member(u); else guest();
    }
    Backend.ready.then(render);
  }

  /* ================= SİPARİŞLERİM ================= */
  function siparisler() {
    Backend.ready.then(function () {
      if (!Backend.user()) {
        el().innerHTML = '<div class="wrap"><div class="cat-head"><h1>Siparişlerim</h1></div>' +
          '<div class="empty"><h3>Önce giriş yapmalısınız</h3><p class="muted">Siparişleriniz hesabınıza kaydedilir.</p><a class="btn" href="hesap.html?next=siparislerim.html">Giriş yap</a></div></div>';
        return;
      }
      Backend.listOrders().then(function (list) {
        el().innerHTML = '<div class="wrap"><div class="cat-head" style="text-align:left"><h1>Siparişlerim</h1>' +
          '<p style="margin-left:0">Verdiğiniz siparişler ve durumları.</p></div>' +
          '<div style="padding-bottom:70px">' +
          (list.length ? list.map(function (o) {
            var c = o.customer || {};
            return '<div class="order-row"><header><code>' + esc(o.code) + '</code>' +
              '<span class="muted">' + esc(A.fmtDate(o.createdAt)) + '</span>' +
              '<span class="status status--' + esc(o.status) + '">' + esc(A.STATUS[o.status] || o.status) + '</span>' +
              '<b>' + money(o.total) + '</b></header>' +
              '<ul>' + (o.items || []).map(function (i) {
                return '<li>' + esc(i.name) + (i.variant ? ' (' + esc(i.variant) + ')' : '') + ' × ' + i.qty + '</li>';
              }).join('') + '</ul>' +
              '<p class="order-row__meta">' + esc(A.PAYMENT[o.payment] || '') +
              (c.address ? ' · ' + esc(c.address) + ', ' + esc(c.district || '') + '/' + esc(c.city || '') : '') + '</p>' +
              (o.tracking ? '<p class="order-row__meta"><b>Kargo takip no:</b> ' + esc(o.tracking) + '</p>' : '') +
              (o.payment === 'eft' && (o.status === 'new') ? bankBox(o.code) : '') +
              '</div>';
          }).join('')
            : '<div class="empty"><h3>Henüz siparişiniz yok</h3><a class="btn" href="katalog.html">Ürünlere göz atın</a></div>') +
          '</div></div>';
      });
    });
  }

  /* ================= KURUMSAL ================= */
  function kurumsal() {
    var s = window.SITE.group;
    var cm = B['connor-mead'], bl = B['brazilline'];
    el().innerHTML = '<div class="wrap wrap--narrow prose" style="padding-bottom:70px">' +
      '<div class="cat-head" style="text-align:left"><h1>Hakkımızda</h1></div>' +
      '<p style="font-size:18px">' + esc(s.legal) + ', Connor Mead ve Brazilline markalarını tek çatı altında toplayan bir bakım grubudur.</p>' +
      '<h2 id="connor-mead">Connor Mead</h2>' +
      '<p>' + esc(cm.story || cm.lead || 'Connor Mead ürünlerini bu sitede inceleyip doğrudan sipariş edebilirsiniz.') + '</p>' +
      '<a class="link-u link-arrow" href="connor-mead.html">Connor Mead sayfası ' + A.icon.arrowR + '</a>' +
      '<h2 id="brazilline">Brazilline</h2>' +
      '<p>' + esc(bl.story || bl.lead || 'Brazilline, Connor Mead çatısı altındaki ikinci markadır.') + '</p>' +
      '<a class="link-u link-arrow" href="brazilline.html">Brazilline sayfası ' + A.icon.arrowR + '</a>' +
      '<h2>Sipariş, ödeme ve teslimat</h2>' +
      '<p>Siparişler doğrudan bu siteden alınır. ' + esc(payText()) + ' ' + esc(shippingText()) + '</p>' +
      '<h2>İletişim</h2>' +
      '<p>' + esc(s.legal) + '</p>' +
      (s.address ? '<p>' + esc(s.address) + '</p>' : '') +
      (s.email ? '<p><a class="link-inline" href="mailto:' + esc(s.email) + '">' + esc(s.email) + '</a></p>' : '') +
      (s.phone ? '<p><a class="link-inline" href="tel:' + esc(String(s.phone).replace(/[^+\d]/g, '')) + '">' + esc(s.phone) + '</a></p>' : '') +
      '<div class="btn-row" style="margin-top:24px"><a class="btn btn--sm" href="katalog.html">Tüm ürünlerimiz</a></div>' +
      '</div>';
  }

  /* ================= YÖNLENDİRİCİ ================= */
  var routes = {
    home: home,
    marka: function () { brandPage(document.body.dataset.house || 'connor-mead'); },
    katalog: katalog,
    urun: urun,
    sepet: sepet,
    odeme: odeme,
    favoriler: favoriler,
    hesap: hesap,
    siparisler: siparisler,
    kurumsal: kurumsal,
    yonetici: function () { if (window.AdminPage) window.AdminPage(); }
  };

  function start() {
    var r = routes[document.body.dataset.page];
    if (r) r();
  }
  window.Pages = { routes: routes, start: start };
  function boot() {
    if (window.Catalog) window.Catalog.load().then(start);
    else start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
