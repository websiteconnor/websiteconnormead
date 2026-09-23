/* ============================================================
   UI — tema, marka geçişi, sepet/favori deposu, başlık, altlık,
   ürün görseli ve ürün kartı. Tüm sayfalar bunu yükler.
   ============================================================ */

window.App = (function () {

  /* ---------------- küçük yardımcılar ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var nf = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  /* Tam liraysa "320 TL", kuruş varsa "249,90 TL" (yuvarlama yok: sipariş tutarıyla aynı olmalı) */
  function money(n) {
    var c = Math.round((Number(n) || 0) * 100);
    return (c % 100 === 0 ? nf.format(c / 100) : nf2.format(c / 100)) + ' TL';
  }
  function fmtNum(n) { return nf.format(Math.round(n || 0)); }
  function fmtDate(ts) {
    var d = new Date(ts);
    try { return d.toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return d.toLocaleDateString('tr-TR'); }
  }

  function params() {
    var o = {}; new URLSearchParams(location.search).forEach(function (v, k) { o[k] = v; }); return o;
  }
  function product(id) {
    for (var i = 0; i < window.PRODUCTS.length; i++) if (window.PRODUCTS[i].id === id) return window.PRODUCTS[i];
    return null;
  }
  function cats(brand) {
    return window.CATEGORIES.filter(function (c) { return !brand || c.brand === brand; });
  }
  function catName(id) {
    var c = window.CATEGORIES.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function ls(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      localStorage.setItem(k, JSON.stringify(v)); return v;
    } catch (e) { return null; }
  }
  function slug(s) { return window.Catalog.slug(s); }

  /* girişten sonra dönülecek adres: yalnızca bu sitenin kendi sayfaları */
  function safeNext(s) {
    s = String(s || '');
    return /^[a-z0-9-]+\.html(\?[^#\s]*)?$/i.test(s) ? s : '';
  }

  var STATUS = {
    'new': 'Alındı', paid: 'Ödemesi alındı', preparing: 'Hazırlanıyor',
    shipped: 'Kargoya verildi', delivered: 'Teslim edildi', cancelled: 'İptal edildi'
  };
  var PAYMENT = { cod: 'Kapıda ödeme', eft: 'Havale / EFT' };

  /* ---------------- tema ---------------- */
  var Theme = {
    get: function () {
      /* varsayılan açık tema; kullanıcı koyuyu seçerse o cihazda kalıcı olur */
      return ls('cm_theme') || 'light';
    },
    set: function (v) {
      ls('cm_theme', v);
      document.documentElement.setAttribute('data-theme', v);
      $$('[data-theme-btn]').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.themeBtn === v));
        b.classList.toggle('is-on', b.dataset.themeBtn === v);
      });
      var m = $('meta[name="theme-color"]');
      if (m) m.setAttribute('content', v === 'dark' ? '#0a0a0b' : '#ffffff');
    },
    toggle: function () { Theme.set(Theme.get() === 'dark' ? 'light' : 'dark'); }
  };

  /* ---------------- marka (ev) ---------------- */
  var House = {
    get: function () { return document.body.dataset.house || ls('cm_house') || 'connor-mead'; },
    set: function (v) { ls('cm_house', v); document.documentElement.setAttribute('data-house', v); }
  };

  /* ---------------- sepet & favoriler ---------------- */
  var cart = ls('cm_cart') || [];
  var favs = ls('cm_favs') || [];

  /* Sepet/favori değişikliğini kaydeder. Bulut kaydının bitişini bildiren bir söz döner. */
  function persist() {
    ls('cm_cart', cart); ls('cm_favs', favs);
    var saved = (window.Backend && Backend.user()) ? Backend.save({ cart: cart, favs: favs }) : Promise.resolve();
    paintCounts();
    document.dispatchEvent(new CustomEvent('store:change'));
    return saved;
  }
  function paintCounts() {
    var n = cart.reduce(function (a, l) { return a + l.qty; }, 0);
    $$('[data-count="cart"]').forEach(function (e) { e.textContent = n ? n : ''; e.dataset.n = n; });
    $$('[data-count="fav"]').forEach(function (e) { e.textContent = favs.length ? favs.length : ''; e.dataset.n = favs.length; });
  }
  function addToCart(id, variant, qty, quiet) {
    qty = qty || 1;
    var line = cart.filter(function (l) { return l.id === id && (l.variant || '') === (variant || ''); })[0];
    if (line) line.qty = Math.min(50, line.qty + qty); else cart.push({ id: id, variant: variant || '', qty: qty });
    persist();
    var p = product(id);
    if (!quiet) toast((p ? p.name : 'Ürün') + ' sepete eklendi.', 'sepet.html', 'Sepeti aç');
  }
  function setQty(i, n) {
    if (!cart[i]) return;
    if (n <= 0) cart.splice(i, 1); else cart[i].qty = Math.min(50, n);
    persist();
  }
  function removeLine(i) { cart.splice(i, 1); persist(); }
  function clearCart() { cart = []; return persist(); }
  /* katalogda artık bulunmayan ürünleri sepetten temizler */
  function pruneCart() {
    var keep = cart.filter(function (l) { return !!product(l.id); });
    if (keep.length !== cart.length) { cart = keep; persist(); return true; }
    return false;
  }
  function isFav(id) { return favs.indexOf(id) > -1; }
  function toggleFav(id) {
    var i = favs.indexOf(id);
    if (i > -1) { favs.splice(i, 1); toast('Favorilerden çıkarıldı.'); }
    else { favs.push(id); toast('Favorilere eklendi.', 'favoriler.html', 'Favorileri aç'); }
    persist();
    $$('[data-fav="' + id + '"]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(isFav(id)));
      if (b.hasAttribute('data-fav-text')) b.textContent = isFav(id) ? 'Favorilerde' : 'Favorilere ekle';
    });
    return isFav(id);
  }

  /** Sepet toplamları: ara toplam, indirim, kargo, kapıda ödeme bedeli, genel toplam */
  function totals(method) {
    var o = window.SITE.order || {};
    /* hesap kuruş (tam sayı) üzerinden yapılır; küsurat hatası olmasın */
    function c(x) { return Math.round((Number(x) || 0) * 100); }
    var sub = 0, list = 0;
    cart.forEach(function (l) {
      var p = product(l.id); if (!p) return;
      sub += c(p.price) * l.qty; list += c(p.old || p.price) * l.qty;
    });
    var free = c(o.freeShippingOver);
    var ship = sub && !(free && sub >= free) ? c(o.shippingFee) : 0;
    var cod = sub && method === 'cod' ? c(o.codFee) : 0;
    return { sub: sub / 100, list: list / 100, discount: (list - sub) / 100, ship: ship / 100, cod: cod / 100, total: (sub + ship + cod) / 100 };
  }

  /* giriş yapınca buluttaki sepet/favorileri birleştir */
  function syncFromCloud() {
    if (!window.Backend) return;
    Backend.onAuth(function (u) {
      paintAuth(u);
      if (!u) return;
      Backend.load().then(function (doc) {
        if (!doc) return;
        var changed = false;
        (doc.favs || []).forEach(function (id) { if (favs.indexOf(id) < 0) { favs.push(id); changed = true; } });
        (doc.cart || []).forEach(function (l) {
          var same = cart.filter(function (c) { return c.id === l.id && (c.variant || '') === (l.variant || ''); })[0];
          if (!same) { cart.push(l); changed = true; }
        });
        if (changed) persist(); else paintCounts();
      });
    });
  }
  function paintAuth(u) {
    var admin = !!(window.Backend && Backend.isAdmin());
    $$('[data-admin-link]').forEach(function (e) { e.classList.toggle('hidden', !admin); });
    $$('[data-auth-name]').forEach(function (e) { e.textContent = u ? (u.name || u.email.split('@')[0]) : 'Hesabım'; });
    $$('[data-auth-in]').forEach(function (e) { e.classList.toggle('hidden', !u); });
    $$('[data-auth-out]').forEach(function (e) { e.classList.toggle('hidden', !!u); });
  }

  /* ---------------- puan yıldızları ---------------- */
  function stars(avg) {
    var pct = Math.max(0, Math.min(100, (Number(avg) || 0) / 5 * 100));
    return '<span class="rating" style="--pct:' + pct.toFixed(0) + '%" role="img" aria-label="5 üzerinden ' +
      (Number(avg) || 0).toFixed(1).replace('.', ',') + '">★★★★★</span>';
  }

  /* ---------------- ürün görseli (SVG) ---------------- */
  function art(p, cls) {
    if (p.image) {
      return '<img class="' + (cls || '') + '" src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">';
    }
    var t = p.tone || '#c9c3ba';
    var s = '<svg viewBox="0 0 300 400" class="' + (cls || '') + '" role="img" aria-label="' + esc(p.name) + '" xmlns="http://www.w3.org/2000/svg">';
    s += '<ellipse cx="150" cy="378" rx="66" ry="9" fill="var(--art-shadow)"/>';
    s += forms[p.form] ? forms[p.form](t) : forms.bottle(t);
    s += '</svg>';
    return s;
  }
  function label(x, y, w, h, t) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="var(--art-label)" opacity=".93"/>' +
      '<rect x="' + (x + 12) + '" y="' + (y + 16) + '" width="' + (w - 24) + '" height="3" fill="var(--art-ink)" opacity=".8"/>' +
      '<rect x="' + (x + 12) + '" y="' + (y + 26) + '" width="' + (w - 42) + '" height="2" fill="var(--art-ink)" opacity=".35"/>' +
      '<rect x="' + (x + 12) + '" y="' + (y + h - 20) + '" width="18" height="6" fill="' + t + '"/>';
  }
  var forms = {
    dropper: function (t) {
      return '<rect x="118" y="74" width="64" height="16" rx="3" fill="var(--art-ink)"/>' +
        '<rect x="112" y="88" width="76" height="62" rx="5" fill="var(--art-ink)"/>' +
        '<rect x="132" y="148" width="36" height="24" fill="var(--art-glass-2)"/>' +
        '<rect x="100" y="168" width="100" height="204" rx="8" fill="var(--art-glass-2)"/>' +
        '<rect x="100" y="222" width="100" height="150" rx="8" fill="' + t + '"/>' +
        '<rect x="106" y="174" width="12" height="130" rx="6" fill="#fff" opacity=".22"/>' +
        label(110, 240, 80, 84, t);
    },
    pump: function (t) {
      return '<rect x="112" y="70" width="46" height="20" rx="8" fill="var(--art-ink)"/>' +
        '<rect x="150" y="76" width="34" height="9" rx="4.5" fill="var(--art-ink)"/>' +
        '<rect x="128" y="88" width="14" height="32" fill="var(--art-ink)" opacity=".8"/>' +
        '<rect x="122" y="118" width="56" height="18" rx="3" fill="var(--art-ink)"/>' +
        '<rect x="94" y="134" width="112" height="238" rx="12" fill="' + t + '"/>' +
        '<rect x="102" y="146" width="13" height="150" rx="6.5" fill="#fff" opacity=".2"/>' +
        label(106, 206, 88, 104, t);
    },
    jar: function (t) {
      return '<rect x="76" y="176" width="148" height="56" rx="7" fill="var(--art-ink)"/>' +
        '<rect x="76" y="220" width="148" height="10" fill="#fff" opacity=".1"/>' +
        '<rect x="86" y="230" width="128" height="142" rx="12" fill="' + t + '"/>' +
        label(104, 266, 92, 70, t);
    },
    tube: function (t) {
      return '<rect x="108" y="84" width="84" height="15" rx="3" fill="var(--art-ink)"/>' +
        '<path d="M112 99 h76 l10 226 h-96 z" fill="' + t + '"/>' +
        '<rect x="118" y="112" width="11" height="140" rx="5.5" fill="#fff" opacity=".2"/>' +
        '<rect x="110" y="325" width="80" height="48" rx="7" fill="var(--art-ink)"/>' +
        label(116, 150, 70, 116, t);
    },
    bottle: function (t) {
      return '<rect x="124" y="70" width="52" height="34" rx="6" fill="var(--art-ink)"/>' +
        '<path d="M108 104 h84 l14 28 h-112 z" fill="' + t + '"/>' +
        '<rect x="92" y="128" width="116" height="244" rx="16" fill="' + t + '"/>' +
        '<rect x="100" y="142" width="13" height="160" rx="6.5" fill="#fff" opacity=".2"/>' +
        label(102, 196, 96, 116, t);
    },
    flacon: function (t) {
      return '<rect x="118" y="70" width="64" height="44" rx="2" fill="var(--art-ink)"/>' +
        '<rect x="136" y="114" width="28" height="18" fill="var(--art-glass-2)"/>' +
        '<rect x="94" y="130" width="112" height="242" rx="4" fill="' + t + '"/>' +
        '<rect x="102" y="142" width="12" height="150" fill="#fff" opacity=".18"/>' +
        label(108, 208, 84, 96, t);
    },
    bar: function (t) {
      return '<rect x="74" y="230" width="152" height="112" rx="26" fill="' + t + '"/>' +
        '<rect x="74" y="230" width="152" height="24" rx="12" fill="#fff" opacity=".18"/>' +
        '<circle cx="150" cy="286" r="26" fill="var(--art-label)" opacity=".9"/>';
    },
    set: function (t) {
      return '<rect x="28" y="196" width="78" height="176" rx="10" fill="' + t + '" opacity=".78"/>' +
        '<rect x="40" y="168" width="54" height="30" rx="4" fill="var(--art-ink)"/>' +
        '<rect x="112" y="150" width="76" height="222" rx="11" fill="' + t + '"/>' +
        '<rect x="128" y="112" width="44" height="40" rx="4" fill="var(--art-ink)"/>' +
        '<rect x="122" y="212" width="56" height="84" fill="var(--art-label)" opacity=".93"/>' +
        '<rect x="132" y="228" width="36" height="3" fill="var(--art-ink)" opacity=".8"/>' +
        '<rect x="132" y="238" width="24" height="2" fill="var(--art-ink)" opacity=".35"/>' +
        '<rect x="194" y="252" width="78" height="120" rx="12" fill="' + t + '" opacity=".88"/>' +
        '<rect x="204" y="222" width="58" height="32" rx="6" fill="var(--art-ink)"/>';
    }
  };

  /* ---------------- ürün kartı ---------------- */
  function card(p) {
    var badge = p.stock === false ? '<span class="card__badge card__badge--out">Tükendi</span>'
      : p.old ? '<span class="card__badge card__badge--sale">İndirim</span>'
        : p.isNew ? '<span class="card__badge">Yeni</span>'
          : p.best ? '<span class="card__badge">Çok satan</span>' : '';
    return '' +
      '<article class="card">' +
      badge +
      '<button class="card__fav" data-fav="' + p.id + '" aria-pressed="' + isFav(p.id) + '" aria-label="' + esc(p.name) + ' favorilere ekle">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.5 3.8 12.4a4.9 4.9 0 0 1 0-6.9 4.9 4.9 0 0 1 6.9 0l1.3 1.3 1.3-1.3a4.9 4.9 0 0 1 6.9 0 4.9 4.9 0 0 1 0 6.9Z"/></svg></button>' +
      '<a class="card__art" href="urun.html?id=' + encodeURIComponent(p.id) + '" aria-label="' + esc(p.name) + ' ürün sayfası">' + art(p) + '</a>' +
      '<div class="card__body">' +
      '<a class="card__name" href="urun.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a>' +
      '<span class="card__sub">' + esc(p.sub || p.size || '') + '</span>' +
      '<span class="card__price">' + (p.old ? '<s>' + money(p.old) + '</s>' : '') + money(p.price) + '</span>' +
      (p.old ? '<span class="card__deal">%' + Math.round((1 - p.price / p.old) * 100) + ' indirim</span>' : '') +
      '<div class="card__cta">' + (p.stock === false
        ? '<button class="btn btn--sm btn--full" disabled>Tükendi</button>'
        : '<button class="btn btn--sm btn--full" data-add="' + esc(p.id) + '">Sepete ekle</button>') +
      '</div>' +
      '</div></article>';
  }

  /** Yatay kaydırılan ürün satırının içeriği (+ sondaki "Tümünü görüntüle" kartı) */
  function rowCards(items, moreHref) {
    return items.map(card).join('') +
      '<a class="card card--more" href="' + moreHref + '"><span class="card--more__in">' +
      '<span class="card--more__arrow">' + ICON.arrowR + '</span><span>Tümünü görüntüle</span></span></a>';
  }

  /** "Ürünlerimiz" gibi yatay ürün satırı bölümü. Başlığın yanında ok düğmeleri ve
      "Tümünü görüntüle →" bağlantısı bulunur. */
  function rowSection(o) {
    return '<section class="section wrap" id="' + o.id + '-sec"' + (o.hidden ? ' hidden' : '') + '>' +
      '<div class="shead"><div><h2>' + esc(o.title) + '</h2>' + (o.sub ? '<p>' + esc(o.sub) + '</p>' : '') + '</div>' +
      '<div class="shead__tools">' +
      '<div class="row-nav">' +
      '<button type="button" data-row-prev="' + o.id + '" aria-label="Geri kaydır">' + ICON.arrowL + '</button>' +
      '<button type="button" data-row-next="' + o.id + '" aria-label="İleri kaydır">' + ICON.arrowR + '</button></div>' +
      '<a class="link-u link-arrow" href="' + o.href + '">Tümünü görüntüle ' + ICON.arrowR + '</a>' +
      '</div></div>' +
      '<div class="row-scroll" id="' + o.id + '" tabindex="0" aria-label="' + esc(o.title) + '">' + rowCards(o.items, o.href) + '</div>' +
      '</section>';
  }

  /* ---------------- toast & modal ---------------- */
  function toast(msg, href, label) {
    var zone = $('.toast-zone');
    if (!zone) { zone = document.createElement('div'); zone.className = 'toast-zone'; document.body.appendChild(zone); }
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span>' + esc(msg) + '</span>' + (href ? '<a href="' + href + '">' + esc(label || 'Aç') + '</a>' : '');
    zone.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; setTimeout(function () { el.remove(); }, 200); }, 3400);
  }

  function modal(html) {
    var wrap = document.createElement('div');
    wrap.className = 'modal';
    wrap.innerHTML = '<div class="sheet-bg is-open"></div><div class="modal__box" role="dialog" aria-modal="true">' + html + '</div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('is-open'); });
    function close() { wrap.classList.remove('is-open'); setTimeout(function () { wrap.remove(); }, 200); document.body.classList.remove('is-locked'); }
    wrap.querySelector('.sheet-bg').addEventListener('click', close);
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } });
    document.body.classList.add('is-locked');
    var f = wrap.querySelector('input, textarea, select, button, a');
    if (f) f.focus();
    return { el: wrap, close: close };
  }

  /* ---------------- başlık & altlık ---------------- */

  var ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20.5 3.8 12.4a4.9 4.9 0 0 1 0-6.9 4.9 4.9 0 0 1 6.9 0l1.3 1.3 1.3-1.3a4.9 4.9 0 0 1 6.9 0 4.9 4.9 0 0 1 0 6.9Z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 7h14l1.2 13H3.8Z"/><path d="M8.5 9V6.5a3.5 3.5 0 0 1 7 0V9"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 14.2A8.2 8.2 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3.5 7h17M3.5 12h17M3.5 17h17"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    arrowR: '<svg class="ico-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>',
    arrowL: '<svg class="ico-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M20 12H5M11 6l-6 6 6 6"/></svg>'
  };

  function searchBox() {
    return '<form class="searchbox" role="search" action="katalog.html">' +
      ICON.search +
      '<input type="search" name="q" placeholder="Ara" aria-label="Ürün ara" value="' + esc(params().q || '') + '">' +
      '</form>';
  }

  function header() {
    return '' +
      (window.SITE.announcement ? '<div class="topbar">' + esc(window.SITE.announcement) + '</div>' : '') +
      '<div class="site-head">' +
      '<div class="head-main">' +
      '<button type="button" class="menu-btn" data-open-menu aria-haspopup="true" aria-expanded="false" aria-controls="megaMenu" aria-label="Menüyü aç">' +
      ICON.menu + '<span>Menü</span></button>' +
      '<a class="brandmark" href="index.html" aria-label="Connor Mead ana sayfa"><b>Connor Mead</b></a>' +
      '<div class="head-tools">' +
      '<a class="icon-btn" href="hesap.html" aria-label="Hesabım">' + ICON.user + '</a>' +
      '<a class="icon-btn" href="favoriler.html" aria-label="Favorilerim">' + ICON.heart + '<span class="count" data-count="fav" data-n="0"></span></a>' +
      '<a class="icon-btn" href="sepet.html" aria-label="Sepetim">' + ICON.bag + '<span class="count" data-count="cart" data-n="0"></span></a>' +
      '</div>' +
      '</div>' +
      '<div class="search-row">' + searchBox() + '</div>' +
      '</div>';
  }

  /** Marka + tür seçilen tam ekran menü (hamburger ile açılır). */
  function megaMenu() {
    var house = House.get();
    var brandBtns = Object.keys(window.BRANDS).map(function (k) {
      var on = k === house;
      return '<button type="button" class="mega__brand-btn' + (on ? ' is-on' : '') + '" data-mega-brand="' + k + '" aria-expanded="' + on + '">' +
        esc(window.BRANDS[k].name) + '</button>';
    }).join('');
    var grids = Object.keys(window.BRANDS).map(function (k) {
      return '<div class="mega__grid" data-mega-panel="' + k + '"' + (k === house ? '' : ' hidden') + '>' + megaGrid(k) + '</div>';
    }).join('');

    return '' +
      '<div class="mega" id="megaMenu">' +
      '<div class="mega__bg" data-close-menu></div>' +
      '<div class="mega__panel" role="dialog" aria-modal="true" aria-label="Ana menü">' +
      '<div class="mega__top"><span class="mega__title">Menü</span>' +
      '<button class="icon-btn" data-close-menu aria-label="Menüyü kapat">' + ICON.close + '</button></div>' +
      '<div class="mega__body">' +
      '<nav class="mega__brands" aria-label="Marka seç">' +
      '<a class="mega__link" href="index.html">Ana sayfa</a>' +
      '<a class="mega__link" href="katalog.html">Tüm ürünlerimiz</a>' +
      brandBtns +
      '<div class="mega__utility">' +
      '<a href="kurumsal.html">Hakkımızda</a>' +
      '<a href="hesap.html">Hesabım</a>' +
      '<a href="siparislerim.html">Siparişlerim</a>' +
      '<a href="yonetici.html" data-admin-link class="hidden">Yönetim paneli</a>' +
      '<button type="button" class="mega__theme" data-theme-switch>' +
      '<span data-theme-icon>' + ICON.moon + '</span><span>Açık / koyu tema</span></button>' +
      '</div>' +
      '</nav>' +
      '<div class="mega__stage">' + grids + '</div>' +
      '</div></div></div>';
  }

  /** Bir markanın tür kutucukları (veya ürün yoksa boş durum). */
  function megaGrid(brand) {
    var b = window.BRANDS[brand];
    var mine = window.PRODUCTS.filter(function (p) { return p.brand === brand; });
    var tiles = cats(brand).map(function (c) {
      var inCat = mine.filter(function (p) { return p.cat === c.id; });
      if (!inCat.length) return '';
      return '<a class="mega__tile" href="katalog.html?marka=' + brand + '&tur=' + encodeURIComponent(c.id) + '">' +
        '<span class="mega__tile-art">' + art(inCat[0]) + '</span>' +
        '<span class="mega__tile-name">' + esc(c.name) + '</span></a>';
    }).join('');

    var head = '<div class="mega__grid-head"><h3>' + esc(b.name) + '</h3>' +
      '<span class="mega__grid-links"><a class="link-u" href="' + esc(b.home) + '">Marka sayfası</a>' +
      (mine.length ? '<a class="link-u" href="katalog.html?marka=' + brand + '">Tüm ürünler</a>' : '') + '</span>' +
      '</div>';

    if (!mine.length) {
      return head + '<p class="muted mega__empty">' + esc(b.name) + ' ürünleri hazırlanıyor.</p>';
    }
    return head + (tiles ? '<div class="mega__tiles">' + tiles + '</div>' : '');
  }

  function footer() {
    var s2 = window.SITE.group;
    function list(brand) {
      var c = cats(brand).map(function (x) {
        return '<li><a href="katalog.html?marka=' + brand + '&tur=' + encodeURIComponent(x.id) + '">' + esc(x.name) + '</a></li>';
      }).join('');
      return '<li><a href="' + window.BRANDS[brand].home + '">Marka sayfası</a></li>' + c;
    }
    return '' +
      '<div class="foot-grid">' +
      '<div>' +
      '<h4>' + esc(s2.name) + '</h4>' +
      '<p class="muted" style="font-size:14px;max-width:34ch">Connor Mead ve Brazilline ürünleri. Siparişlerinizi doğrudan bu siteden verebilirsiniz.</p>' +
      '<div class="foot-houses" style="margin-top:18px"><a href="connor-mead.html">Connor Mead</a><span></span><a href="brazilline.html">Brazilline</a></div>' +
      '</div>' +
      '<div><h4>Connor Mead</h4><ul>' + list('connor-mead') + '</ul></div>' +
      '<div><h4>Brazilline</h4><ul>' + list('brazilline') + '</ul></div>' +
      '<div><h4>Kurumsal</h4><ul>' +
      '<li><a href="katalog.html">Tüm ürünlerimiz</a></li>' +
      '<li><a href="kurumsal.html">Hakkımızda</a></li>' +
      '<li><a href="hesap.html">Hesabım</a></li>' +
      '<li><a href="siparislerim.html">Siparişlerim</a></li>' +
      '<li><a href="sepet.html">Sepetim</a></li>' +
      (s2.email ? '<li><a href="mailto:' + esc(s2.email) + '">' + esc(s2.email) + '</a></li>' : '') +
      (s2.phone ? '<li><a href="tel:' + esc(String(s2.phone).replace(/[^+\d]/g, '')) + '">' + esc(s2.phone) + '</a></li>' : '') +
      '<li data-admin-link class="hidden"><a href="yonetici.html">Yönetim paneli</a></li>' +
      '</ul></div>' +
      '</div>' +
      '<div class="foot-note"><span>© ' + s2.year + ' ' + esc(s2.legal) + '</span></div>';
  }

  /* ---------------- kurulum ---------------- */

  /** Başlık, menü ve altlığı (yeniden) çizer. */
  function renderShell() {
    var h = document.getElementById('site-header');
    if (h) {
      h.innerHTML = header();
      var old = document.getElementById('megaMenu');
      if (old) old.remove();
      h.insertAdjacentHTML('afterend', megaMenu());
    }
    var f = document.getElementById('site-footer');
    if (f) { f.className = 'site-foot'; f.innerHTML = footer(); }
    paintCounts();
    paintThemeIcon();
    if (window.Backend) paintAuth(Backend.user());
  }

  /** Tema ve aktif markayı adrese göre ayarlayıp kabuğu çizer. */
  function refresh() {
    Theme.set(Theme.get());

    /* ürün ve katalog sayfalarında aktif marka adresten okunur,
       böylece menü ve vurgu rengi doğru markayı gösterir */
    var pg = document.body.dataset.page, q = params();
    if (!document.body.dataset.house) {
      if (pg === 'urun') { var pr = product(q.id); if (pr) document.body.dataset.house = pr.brand; }
      else if (pg === 'katalog' && window.BRANDS[q.marka]) document.body.dataset.house = q.marka;
    }
    if (document.body.dataset.house) House.set(document.body.dataset.house);
    else House.set(House.get());

    renderShell();
  }

  function mount() {
    refresh();
    syncFromCloud();
    /* katalog geldiğinde menü ve altlık yeniden çizilir */
    if (window.Catalog) window.Catalog.load().then(function () { refresh(); });

    /* olaylar */
    document.addEventListener('click', function (e) {
      var t;
      if ((t = e.target.closest('[data-theme-switch]'))) { Theme.toggle(); paintThemeIcon(); }
      if ((t = e.target.closest('[data-open-menu]'))) openMenu(true);
      if ((t = e.target.closest('[data-close-menu]'))) openMenu(false);
      if ((t = e.target.closest('[data-mega-brand]'))) setMegaBrand(t.dataset.megaBrand);
      if ((t = e.target.closest('[data-add]'))) { addToCart(t.dataset.add, t.dataset.variant || '', parseInt(t.dataset.qty || '1', 10)); }
      if ((t = e.target.closest('[data-fav]'))) { toggleFav(t.dataset.fav); }
      if ((t = e.target.closest('[data-row-prev],[data-row-next]'))) {
        var prev = t.hasAttribute('data-row-prev');
        var row = document.getElementById(t.getAttribute(prev ? 'data-row-prev' : 'data-row-next'));
        if (row) row.scrollBy({ left: (prev ? -1 : 1) * Math.max(220, row.clientWidth * 0.85), behavior: 'smooth' });
      }
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openMenu(false); });
  }
  function paintThemeIcon() {
    var dark = Theme.get() === 'dark';
    $$('[data-theme-icon]').forEach(function (e) { e.innerHTML = dark ? ICON.sun : ICON.moon; });
  }
  function openMenu(on) {
    var m = document.getElementById('megaMenu');
    if (!m) return;
    m.classList.toggle('is-open', on);
    var btn = $('.menu-btn');
    if (btn) btn.setAttribute('aria-expanded', String(on));
    document.body.classList.toggle('is-locked', on);
  }
  function setMegaBrand(brand) {
    $$('.mega__brand-btn').forEach(function (b) {
      var on = b.dataset.megaBrand === brand;
      b.classList.toggle('is-on', on);
      b.setAttribute('aria-expanded', String(on));
    });
    $$('.mega__grid').forEach(function (g) { g.hidden = g.dataset.megaPanel !== brand; });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();

  /* ---------------- dışa açılan API ---------------- */
  return {
    $: $, $$: $$, esc: esc, money: money, fmtNum: fmtNum, fmtDate: fmtDate, params: params, slug: slug, safeNext: safeNext,
    product: product, cats: cats, catName: catName,
    Theme: Theme, House: House,
    STATUS: STATUS, PAYMENT: PAYMENT,
    cart: function () { return cart; }, favs: function () { return favs; },
    addToCart: addToCart, setQty: setQty, removeLine: removeLine, clearCart: clearCart, pruneCart: pruneCart, totals: totals,
    isFav: isFav, toggleFav: toggleFav,
    art: art, card: card, rowCards: rowCards, rowSection: rowSection, stars: stars,
    toast: toast, modal: modal, icon: ICON,
    refresh: refresh, renderShell: renderShell
  };
})();
