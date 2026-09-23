/* ============================================================
   KATALOG
   Ürünler ve türler yönetim panelinden (yonetici.html) eklenir.
   Buradaki liste yalnızca başlangıç değeridir.
   ============================================================ */

window.BRANDS = {
  'connor-mead': {
    id: 'connor-mead',
    name: 'Connor Mead',
    home: 'connor-mead.html',
    claim: '',
    lead: '',
    story: ''
  },
  'brazilline': {
    id: 'brazilline',
    name: 'Brazilline',
    home: 'brazilline.html',
    claim: '',
    lead: '',
    story: ''
  }
};

window.CATEGORIES = [];   /* {id, brand, name}  — arayüzde "Tür" olarak geçer */
window.PRODUCTS = [];

/* ============================================================
   Katalog deposu — sunucu bağlıysa oradan, değilse bu cihazdan.
   ============================================================ */
window.Catalog = (function () {

  var KEY = 'cm_catalog';
  var COL = 'site', ID = 'catalog';
  var readyResolve;
  var ready = new Promise(function (r) { readyResolve = r; });
  var started = false;

  function ls(k, v) {
    try {
      if (v === undefined) { var s = localStorage.getItem(k); return s ? JSON.parse(s) : null; }
      localStorage.setItem(k, JSON.stringify(v)); return v;
    } catch (e) { return null; }
  }

  function slug(s) {
    return String(s).toLowerCase()
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/i̇/g, 'i')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function str(v) { return String(v == null ? '' : v); }
  function num(v) { v = Number(v); return isFinite(v) && v > 0 ? v : 0; }

  /* gelen veriyi güvenli hale getirir */
  function clean(d) {
    d = d || {};
    var cats = Array.isArray(d.categories) ? d.categories : [];
    var prods = Array.isArray(d.products) ? d.products : [];
    var brands = d.brands && typeof d.brands === 'object' ? d.brands : {};
    var o = d.order && typeof d.order === 'object' ? d.order : null;
    var h = d.home && typeof d.home === 'object' ? d.home : null;

    return {
      categories: cats.filter(function (c) { return c && c.id && c.brand; }).map(function (c) {
        return { id: String(c.id), brand: String(c.brand), name: String(c.name || c.id) };
      }),
      products: prods.filter(function (p) { return p && p.id; }).map(function (p) {
        return {
          id: String(p.id),
          brand: String(p.brand || 'connor-mead'),
          cat: String(p.cat || ''),
          name: String(p.name || ''),
          sub: String(p.sub || ''),
          price: Number(p.price) || 0,
          old: p.old ? Number(p.old) : 0,
          size: String(p.size || ''),
          form: String(p.form || 'bottle'),
          tone: String(p.tone || '#c9c3ba'),
          image: String(p.image || ''),
          best: !!p.best,
          isNew: !!p.isNew,
          stock: p.stock === false ? false : true,
          desc: String(p.desc || ''),
          usage: String(p.usage || ''),
          ingredients: String(p.ingredients || '')
        };
      }),
      brands: brands,
      announcement: typeof d.announcement === 'string' ? d.announcement : null,
      home: h ? { claim: str(h.claim), lead: str(h.lead) } : null,
      order: o ? {
        shippingFee: num(o.shippingFee),
        freeShippingOver: num(o.freeShippingOver),
        codFee: num(o.codFee),
        cod: o.cod !== false,
        eft: o.eft !== false,
        bank: {
          holder: str(o.bank && o.bank.holder).trim(),
          bankName: str(o.bank && o.bank.bankName).trim(),
          iban: str(o.bank && o.bank.iban).trim()
        },
        note: str(o.note).trim()
      } : null,
      updated: d.updated || 0
    };
  }

  function apply(d) {
    /* diziler yerinde güncellenir, böylece sayfaların elindeki
       referanslar geçerli kalır */
    window.CATEGORIES.length = 0;
    d.categories.forEach(function (c) { window.CATEGORIES.push(c); });
    window.PRODUCTS.length = 0;
    d.products.forEach(function (x) { window.PRODUCTS.push(x); });
    Object.keys(window.BRANDS).forEach(function (k) {
      var b = d.brands[k];
      if (!b) return;
      if (typeof b.claim === 'string') window.BRANDS[k].claim = b.claim;
      if (typeof b.lead === 'string') window.BRANDS[k].lead = b.lead;
      if (typeof b.story === 'string') window.BRANDS[k].story = b.story;
    });
    if (d.announcement !== null) window.SITE.announcement = d.announcement;
    if (d.home) window.SITE.home = d.home;
    if (d.order) window.SITE.order = d.order;
  }

  function current() {
    var brands = {};
    Object.keys(window.BRANDS).forEach(function (k) {
      brands[k] = { claim: window.BRANDS[k].claim, lead: window.BRANDS[k].lead, story: window.BRANDS[k].story };
    });
    return {
      categories: window.CATEGORIES,
      products: window.PRODUCTS,
      brands: brands,
      announcement: window.SITE.announcement,
      home: window.SITE.home,
      order: window.SITE.order
    };
  }

  function load() {
    if (started) return ready;
    started = true;

    var local = ls(KEY);
    if (local) apply(clean(local));

    var B = window.Backend;
    if (!B) { readyResolve(true); return ready; }

    /* Sunucu bağlantısı kurulana kadar beklenir; kurulamazsa ya da çok
       yavaşsa en fazla 4 saniye sonra bu cihazdaki kopya ile devam edilir. */
    var work = B.init.then(function () {
      if (B.mode() !== 'firebase') return;
      return B.readDoc(COL, ID).then(function (d) {
        if (d) { var c = clean(d); apply(c); ls(KEY, c); }
      });
    }).catch(function () {});
    var limit = new Promise(function (r) { setTimeout(r, 4000); });
    Promise.race([work, limit]).then(function () { readyResolve(true); });

    return ready;
  }

  function save(data) {
    var c = clean(data || current());
    c.updated = Date.now();
    apply(c);
    ls(KEY, c);
    var B = window.Backend;
    if (B && B.mode() === 'firebase') return B.writeDoc(COL, ID, c).then(function () { return c; });
    return Promise.resolve(c);
  }

  function newId(prefix, taken) {
    var n = 1, id;
    do { id = prefix + '-' + (n < 10 ? '0' + n : n); n++; } while (taken.indexOf(id) > -1);
    return id;
  }

  /** Marka için bu adda bir tür varsa kimliğini döner; yoksa oluşturup döner. */
  function ensureType(brand, name) {
    name = String(name || '').trim().replace(/\s+/g, ' ');
    if (!name) return '';
    var low = name.toLocaleLowerCase('tr');
    var list = window.CATEGORIES;
    for (var i = 0; i < list.length; i++) {
      if (list[i].brand === brand && list[i].name.toLocaleLowerCase('tr') === low) return list[i].id;
    }
    var id = slug(name) || 'tur';
    var taken = list.map(function (c) { return c.id; });
    if (taken.indexOf(id) > -1) id = newId(id, taken);
    list.push({ id: id, brand: brand, name: name });
    return id;
  }

  return { ready: ready, load: load, save: save, current: current, clean: clean, newId: newId, slug: slug, ensureType: ensureType };
})();
