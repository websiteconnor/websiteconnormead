/* ============================================================
   SUNUCU İŞLEVLERİ — Cloudflare Pages Functions  (/api/...)

   Bu dosya siteyle birlikte Cloudflare Pages'e yüklenir; ayrıca bir
   sunucu kurmanız gerekmez. Yaptığı işler:

     POST /api/security/set      güvenlik sorularını (3 adet) kaydeder
     POST /api/security/status   sorular ayarlı mı?
     POST /api/security/delete   hesap silinirken sorularını siler
     POST /api/recovery/start    e-posta için rastgele bir güvenlik sorusu verir
     POST /api/recovery/finish   cevap doğruysa şifreyi değiştirir
     POST /api/rate              ürüne 1–5 puan verir, ortalamayı günceller
     GET  /api/health            kurulum kontrolü (?deep=1 ile ayrıntılı)

   Neden sunucu gerekiyor? Şifreyi e-posta bağlantısı olmadan
   değiştirebilmek için Firebase'in "yönetici" yetkisi gerekir; bu yetki
   tarayıcıda bulunamaz. Yönetici anahtarı yalnızca bu işlevlerde,
   Cloudflare'in gizli ayarlarında durur.

   Gerekli gizli ayarlar (Cloudflare Pages → Settings → Variables and Secrets):
     FIREBASE_SERVICE_ACCOUNT  Firebase "hizmet hesabı" JSON dosyasının tüm içeriği
     RECOVERY_SECRET           rastgele, uzun bir metin (en az 16 karakter)
   ============================================================ */

const enc = new TextEncoder();
const dec = new TextDecoder();

const MAX_FAILS = 5;                 /* bu kadar yanlış cevaptan sonra kilitlenir */
const LOCK_MIN = 15;                 /* kilit süresi (dakika) */
const CHALLENGE_MIN = 10;            /* verilen sorunun geçerlilik süresi (dakika) */
const FRESH_LOGIN_SEC = 300;         /* "yeni giriş" sayılma süresi (5 dk) */

class HttpError extends Error {
  constructor(status, code, message, extra) {
    super(message);
    this.status = status; this.code = code; this.extra = extra || {};
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

/* ---------- base64url ---------- */
function b64uFromBytes(bytes) {
  const b = new Uint8Array(bytes);
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function bytesFromB64u(str) {
  let s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const b64uJson = (o) => b64uFromBytes(enc.encode(JSON.stringify(o)));
function bytesFromB64(str) {
  const bin = atob(str);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/* ---------- ayarlar ---------- */
function readServiceAccount(env) {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return { error: 'FIREBASE_SERVICE_ACCOUNT tanımlı değil' };
  try {
    let sa = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (typeof sa === 'string') sa = JSON.parse(sa);   /* iki kez tırnaklanmışsa */
    if (!sa.private_key || !sa.client_email || !sa.project_id) throw new Error('eksik alan');
    return { sa };
  } catch (e) {
    return { error: 'FIREBASE_SERVICE_ACCOUNT geçerli bir JSON değil (dosyanın tamamını yapıştırdınız mı?)' };
  }
}
function getConfig(env) {
  const missing = [];
  const s = readServiceAccount(env);
  if (s.error) missing.push(s.error);
  if (!env.RECOVERY_SECRET || String(env.RECOVERY_SECRET).length < 16) missing.push('RECOVERY_SECRET tanımlı değil ya da 16 karakterden kısa');
  if (missing.length) {
    throw new HttpError(500, 'not_configured',
      'Sunucu ayarları eksik: ' + missing.join('; ') + '. README’deki “Sunucu ayarları” bölümüne bakın.', { missing });
  }
  return { sa: s.sa, projectId: s.sa.project_id, secret: String(env.RECOVERY_SECRET) };
}

/* ---------- Google hizmet hesabı ile erişim belirteci ---------- */
let tokenCache = { token: '', exp: 0, who: '' };

async function importPrivateKey(pem) {
  const clean = String(pem).replace(/\\n/g, '\n')
    .replace(/-----BEGIN [A-Z ]+-----/g, '').replace(/-----END [A-Z ]+-----/g, '').replace(/\s+/g, '');
  return crypto.subtle.importKey('pkcs8', bytesFromB64(clean),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
}

async function accessToken(cfg) {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache.token && tokenCache.who === cfg.sa.client_email && tokenCache.exp - 120 > now) return tokenCache.token;

  const head = b64uJson({ alg: 'RS256', typ: 'JWT' });
  const claim = b64uJson({
    iss: cfg.sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  });
  let key;
  try { key = await importPrivateKey(cfg.sa.private_key); }
  catch (e) { throw new HttpError(500, 'not_configured', 'Hizmet hesabı anahtarı okunamadı. FIREBASE_SERVICE_ACCOUNT değerini JSON dosyasından yeniden kopyalayın.'); }
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + claim));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: head + '.' + claim + '.' + b64uFromBytes(sig)
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.access_token) {
    throw new HttpError(502, 'upstream', 'Google’dan erişim izni alınamadı: ' + (data.error_description || data.error || res.status));
  }
  tokenCache = { token: data.access_token, exp: now + (Number(data.expires_in) || 3000), who: cfg.sa.client_email };
  return tokenCache.token;
}

async function google(cfg, url, init) {
  const token = await accessToken(cfg);
  const res = await fetch(url, {
    ...(init || {}),
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', ...((init && init.headers) || {}) }
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { /* JSON değil */ }
  return { ok: res.ok, status: res.status, data };
}
function upstream(r, what) {
  const msg = (r.data && r.data.error && (r.data.error.message || r.data.error.status)) || ('durum ' + r.status);
  return new HttpError(502, 'upstream', (what || 'Google hizmeti') + ' hata verdi: ' + String(msg).slice(0, 200));
}

/* ---------- Firestore (REST) ---------- */
const fsRoot = (cfg) => `projects/${cfg.projectId}/databases/(default)/documents`;
const fsUrl = (cfg) => `https://firestore.googleapis.com/v1/${fsRoot(cfg)}`;

function encVal(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encVal) } };
  return { mapValue: { fields: encFields(v) } };
}
function encFields(o) {
  const f = {};
  for (const k of Object.keys(o)) f[k] = encVal(o[k]);
  return f;
}
function decVal(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decVal);
  if ('mapValue' in v) return decFields(v.mapValue.fields || {});
  return null;
}
function decFields(f) {
  const o = {};
  for (const k of Object.keys(f || {})) o[k] = decVal(f[k]);
  return o;
}

async function fsGet(cfg, path) {
  const r = await google(cfg, `${fsUrl(cfg)}/${path}`);
  if (r.status === 404) return null;
  if (!r.ok) throw upstream(r, 'Firestore');
  return decFields(r.data && r.data.fields);
}
/** Belgeyi oluşturur ya da yalnızca `mask` içindeki alanları günceller. */
async function fsPatch(cfg, path, obj, mask) {
  const qs = mask.map((m) => 'updateMask.fieldPaths=' + encodeURIComponent(m)).join('&');
  const r = await google(cfg, `${fsUrl(cfg)}/${path}?${qs}`, {
    method: 'PATCH', body: JSON.stringify({ fields: encFields(obj) })
  });
  if (!r.ok) throw upstream(r, 'Firestore');
}
async function fsDelete(cfg, path) {
  const r = await google(cfg, `${fsUrl(cfg)}/${path}`, { method: 'DELETE' });
  if (!r.ok && r.status !== 404) throw upstream(r, 'Firestore');
}
async function fsQuery(cfg, structuredQuery) {
  const r = await google(cfg, `${fsUrl(cfg)}:runQuery`, { method: 'POST', body: JSON.stringify({ structuredQuery }) });
  if (!r.ok) throw upstream(r, 'Firestore');
  return (Array.isArray(r.data) ? r.data : []).filter((x) => x && x.document).map((x) => decFields(x.document.fields));
}

/* ---------- Firebase Authentication (yönetici) ---------- */
const idtUrl = (cfg) => `https://identitytoolkit.googleapis.com/v1/projects/${cfg.projectId}`;

async function findUserByEmail(cfg, email) {
  const r = await google(cfg, `${idtUrl(cfg)}/accounts:lookup`, { method: 'POST', body: JSON.stringify({ email: [email] }) });
  if (!r.ok) throw upstream(r, 'Firebase Authentication');
  return (r.data && r.data.users && r.data.users[0]) || null;
}
async function setPassword(cfg, uid, password) {
  const r = await google(cfg, `${idtUrl(cfg)}/accounts:update`, { method: 'POST', body: JSON.stringify({ localId: uid, password }) });
  if (!r.ok) throw upstream(r, 'Firebase Authentication');
}

/* ---------- Kimlik belirteci (ID token) doğrulama ---------- */
let jwksCache = { keys: null, exp: 0 };
async function getJwks() {
  const now = Date.now();
  if (jwksCache.keys && jwksCache.exp > now) return jwksCache.keys;
  const res = await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
  if (!res.ok) throw new HttpError(502, 'upstream', 'Kimlik doğrulama anahtarları alınamadı.');
  const data = await res.json();
  jwksCache = { keys: data.keys || [], exp: now + 3600 * 1000 };
  return jwksCache.keys;
}

async function verifyIdToken(cfg, idToken, opt) {
  const bad = () => new HttpError(401, 'auth', 'Oturum doğrulanamadı. Lütfen tekrar giriş yapın.');
  if (typeof idToken !== 'string' || idToken.split('.').length !== 3) throw bad();
  const [h, p, s] = idToken.split('.');
  let header, payload;
  try {
    header = JSON.parse(dec.decode(bytesFromB64u(h)));
    payload = JSON.parse(dec.decode(bytesFromB64u(p)));
  } catch (e) { throw bad(); }
  if (header.alg !== 'RS256' || !header.kid) throw bad();

  const jwk = (await getJwks()).find((k) => k.kid === header.kid);
  if (!jwk) throw bad();
  const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const okSig = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytesFromB64u(s), enc.encode(h + '.' + p));
  if (!okSig) throw bad();

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== cfg.projectId || payload.iss !== 'https://securetoken.google.com/' + cfg.projectId) throw bad();
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < now || payload.iat > now + 300) throw bad();

  if (opt && opt.fresh && !(payload.auth_time && now - payload.auth_time <= FRESH_LOGIN_SEC)) {
    throw new HttpError(401, 'reauth', 'Güvenlik için lütfen mevcut şifrenizi yeniden girin.');
  }
  return payload;
}

/* ---------- güvenlik sorusu cevapları ---------- */

/* İstemcideki (assets/js/backend.js) normAnswer ile aynı olmalı:
   "İstanbul", "istanbul" ve "Istanbul" aynı sayılır. */
function normAnswer(s) {
  return String(s == null ? '' : s).normalize('NFC')
    .replace(/[İIı]/g, 'i').replace(/[Çç]/g, 'c').replace(/[Ğğ]/g, 'g')
    .replace(/[Öö]/g, 'o').replace(/[Şş]/g, 's').replace(/[Üü]/g, 'u')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}
async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
/* Cevaplar düz metin olarak saklanmaz: gizli anahtarla (RECOVERY_SECRET) karılmış özet tutulur. */
const answerHash = (cfg, uid, i, answer) => hmacHex(cfg.secret, `ans|${uid}|${i}|${normAnswer(answer)}`);

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* Sorulan sorunun kimliği imzalanır: kullanıcı hangi soruyu yanıtlayacağını seçemesin. */
async function signChallenge(cfg, obj) {
  const p = b64uJson(obj);
  return p + '.' + (await hmacHex(cfg.secret, 'chal|' + p));
}
async function readChallenge(cfg, token) {
  const expired = () => new HttpError(400, 'expired', 'Sorunun süresi doldu. Lütfen yeniden başlayın.');
  const [p, sig] = String(token || '').split('.');
  if (!p || !sig) throw expired();
  if (!safeEqual(await hmacHex(cfg.secret, 'chal|' + p), sig)) throw expired();
  let obj;
  try { obj = JSON.parse(dec.decode(bytesFromB64u(p))); } catch (e) { throw expired(); }
  if (!obj || !obj.e || obj.e < Date.now()) throw expired();
  return obj;
}

function normEmail(v) {
  const e = String(v || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || e.length > 254) throw new HttpError(400, 'invalid', 'E-posta adresi geçerli görünmüyor.');
  return e;
}
function lockedError(until) {
  const min = Math.max(1, Math.ceil((until - Date.now()) / 60000));
  return new HttpError(429, 'locked', `Çok fazla hatalı deneme yapıldı. Yaklaşık ${min} dakika sonra tekrar deneyin.`, { minutes: min });
}
const NO_RECOVERY = 'Bu e-posta için şifre yenileme yapılamıyor. Hesap yoksa ya da Google ile giriş yaptıysanız bu yöntem çalışmaz.';

function validateItems(items) {
  if (!Array.isArray(items) || items.length !== 3) throw new HttpError(400, 'invalid', 'Üç güvenlik sorusunu da yanıtlamanız gerekiyor.');
  const seen = new Set();
  for (const it of items) {
    const q = it && typeof it.q === 'string' ? it.q.trim() : '';
    if (q.length < 5 || q.length > 160) throw new HttpError(400, 'invalid', 'Güvenlik sorusu geçersiz.');
    if (normAnswer(it.a).length < 2 || String(it.a).length > 200) throw new HttpError(400, 'invalid', 'Güvenlik sorularının cevapları en az 2 harf/rakam içermeli.');
    const k = q.toLocaleLowerCase('tr');
    if (seen.has(k)) throw new HttpError(400, 'invalid', 'Aynı güvenlik sorusunu iki kez seçemezsiniz.');
    seen.add(k);
  }
}

/* ---------- uç noktalar ---------- */

async function securitySet(cfg, body) {
  const claims = await verifyIdToken(cfg, body.idToken, { fresh: true });
  if ((claims.firebase && claims.firebase.sign_in_provider) !== 'password') {
    throw new HttpError(400, 'provider', 'Güvenlik soruları yalnızca e-posta ve şifreyle açılan hesaplar içindir.');
  }
  validateItems(body.items);
  const uid = claims.sub;
  const data = { fails: 0, lockUntil: 0, updatedAt: Date.now() };
  for (let i = 0; i < 3; i++) {
    data['q' + i] = String(body.items[i].q).trim();
    data['h' + i] = await answerHash(cfg, uid, i, body.items[i].a);
  }
  await fsPatch(cfg, 'security/' + uid, data, Object.keys(data));
  return { ok: true };
}

async function securityStatus(cfg, body) {
  const claims = await verifyIdToken(cfg, body.idToken);
  const doc = await fsGet(cfg, 'security/' + claims.sub);
  const has = !!(doc && doc.q0 && doc.h0 && doc.h1 && doc.h2);
  return { ok: true, has, questions: has ? [doc.q0, doc.q1, doc.q2] : [] };
}

async function securityDelete(cfg, body) {
  const claims = await verifyIdToken(cfg, body.idToken);
  await fsDelete(cfg, 'security/' + claims.sub);
  return { ok: true };
}

async function recoveryStart(cfg, body) {
  const email = normEmail(body.email);
  const user = await findUserByEmail(cfg, email);
  const sec = user ? await fsGet(cfg, 'security/' + user.localId) : null;
  /* hesap yok / sorular yok aynı cevabı verir: hesabın var olup olmadığı sızmasın */
  if (!sec || !sec.q0 || !sec.h0) throw new HttpError(404, 'no_recovery', NO_RECOVERY);
  if (Number(sec.lockUntil) > Date.now()) throw lockedError(Number(sec.lockUntil));

  const idx = crypto.getRandomValues(new Uint32Array(1))[0] % 3;
  const challenge = await signChallenge(cfg, { u: user.localId, i: idx, e: Date.now() + CHALLENGE_MIN * 60000 });
  return { ok: true, question: sec['q' + idx], challenge };
}

async function recoveryFinish(cfg, body) {
  const email = normEmail(body.email);
  const password = String(body.password || '');
  if (password.length < 6 || password.length > 128) throw new HttpError(400, 'weak_password', 'Şifre en az 6 karakter olmalı.');
  if (!normAnswer(body.answer)) throw new HttpError(400, 'invalid', 'Lütfen soruyu yanıtlayın.');

  const ch = await readChallenge(cfg, body.challenge);
  const user = await findUserByEmail(cfg, email);
  if (!user || user.localId !== ch.u || !(ch.i >= 0 && ch.i <= 2)) throw new HttpError(400, 'expired', 'Sorunun süresi doldu. Lütfen yeniden başlayın.');

  const uid = user.localId;
  const sec = await fsGet(cfg, 'security/' + uid);
  if (!sec || !sec['h' + ch.i]) throw new HttpError(404, 'no_recovery', NO_RECOVERY);

  const now = Date.now();
  if (Number(sec.lockUntil) > now) throw lockedError(Number(sec.lockUntil));

  const got = await answerHash(cfg, uid, ch.i, body.answer);
  if (!safeEqual(sec['h' + ch.i], got)) {
    const fails = (Number(sec.fails) || 0) + 1;
    const left = MAX_FAILS - fails;
    const patch = left <= 0 ? { fails: 0, lockUntil: now + LOCK_MIN * 60000 } : { fails };
    await fsPatch(cfg, 'security/' + uid, patch, Object.keys(patch));
    if (left <= 0) {
      throw new HttpError(429, 'locked', `Çok fazla hatalı deneme yapıldı. ${LOCK_MIN} dakika sonra tekrar deneyin.`, { minutes: LOCK_MIN });
    }
    throw new HttpError(401, 'wrong_answer', `Cevap doğru değil. ${left} deneme hakkınız kaldı.`, { left });
  }

  await setPassword(cfg, uid, password);
  await fsPatch(cfg, 'security/' + uid, { fails: 0, lockUntil: 0 }, ['fails', 'lockUntil']);
  return { ok: true };
}

async function rate(cfg, body) {
  const claims = await verifyIdToken(cfg, body.idToken);
  const pid = String(body.pid || '');
  if (!/^[a-z0-9-]{1,60}$/.test(pid)) throw new HttpError(400, 'invalid', 'Ürün kimliği geçersiz.');
  const value = Number(body.value);
  if (!Number.isInteger(value) || value < 1 || value > 5) throw new HttpError(400, 'invalid', 'Puan 1 ile 5 arasında olmalı.');
  const uid = claims.sub;

  /* her hesap bir ürüne tek puan verir; tekrar verirse öncekinin yerine geçer */
  await fsPatch(cfg, `ratings/${pid}__${uid}`, { pid, uid, value, updatedAt: Date.now() }, ['pid', 'uid', 'value', 'updatedAt']);

  /* ortalama her seferinde yeniden hesaplanır (kendini düzeltir) */
  const docs = await fsQuery(cfg, {
    from: [{ collectionId: 'ratings' }],
    where: { fieldFilter: { field: { fieldPath: 'pid' }, op: 'EQUAL', value: { stringValue: pid } } },
    select: { fields: [{ fieldPath: 'value' }] },
    limit: 10000
  });
  let sum = 0, count = 0;
  for (const d of docs) {
    const v = Number(d.value);
    if (v >= 1 && v <= 5) { sum += v; count++; }
  }
  await fsPatch(cfg, 'stats/' + pid, { ratingSum: sum, ratingCount: count }, ['ratingSum', 'ratingCount']);
  return { ok: true, avg: count ? sum / count : 0, count, mine: value };
}

/* ---------- kurulum kontrolü ---------- */
async function health(env, url) {
  const s = readServiceAccount(env);
  const out = {
    ok: true,
    functions: 'çalışıyor',
    ayarlar: {
      FIREBASE_SERVICE_ACCOUNT: s.error ? ('SORUN: ' + s.error) : 'tamam',
      RECOVERY_SECRET: env.RECOVERY_SECRET && String(env.RECOVERY_SECRET).length >= 16 ? 'tamam' : 'SORUN: tanımlı değil ya da 16 karakterden kısa'
    }
  };
  if (s.sa) out.proje = s.sa.project_id;
  if (url.searchParams.get('deep') && !s.error && env.RECOVERY_SECRET) {
    const cfg = getConfig(env);
    const run = async (name, fn) => { try { await fn(); out.ayrintili = out.ayrintili || {}; out.ayrintili[name] = 'tamam'; } catch (e) { out.ayrintili = out.ayrintili || {}; out.ayrintili[name] = 'SORUN: ' + e.message; out.ok = false; } };
    await run('googleErisim', () => accessToken(cfg));
    await run('firestoreOkuma', () => fsGet(cfg, 'site/catalog'));
    await run('authYonetimi', () => findUserByEmail(cfg, 'saglik-kontrolu@example.invalid'));
    await run('kimlikAnahtarlari', () => getJwks());
  }
  if (out.ayarlar.FIREBASE_SERVICE_ACCOUNT !== 'tamam' || out.ayarlar.RECOVERY_SECRET !== 'tamam') out.ok = false;
  return out;
}

/* ---------- giriş noktası ---------- */
function sameOrigin(request, url) {
  const site = request.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') throw new HttpError(403, 'origin', 'İstek kabul edilmedi.');
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) throw new HttpError(403, 'origin', 'İstek kabul edilmedi.');
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const raw = context.params && context.params.path;
  const path = (Array.isArray(raw) ? raw.join('/') : String(raw || '')).replace(/^\/+|\/+$/g, '');

  try {
    if (path === 'health' && request.method === 'GET') return json(await health(env, url));
    if (request.method !== 'POST') throw new HttpError(405, 'method', 'Bu adres yalnızca POST isteği kabul eder.');

    sameOrigin(request, url);
    if (!(request.headers.get('content-type') || '').includes('application/json')) throw new HttpError(415, 'content_type', 'JSON bekleniyor.');
    const text = await request.text();
    if (text.length > 20000) throw new HttpError(413, 'too_large', 'İstek çok büyük.');
    let body;
    try { body = JSON.parse(text); } catch (e) { throw new HttpError(400, 'invalid', 'İstek okunamadı.'); }
    if (!body || typeof body !== 'object') throw new HttpError(400, 'invalid', 'İstek okunamadı.');

    const cfg = getConfig(env);
    switch (path) {
      case 'security/set': return json(await securitySet(cfg, body));
      case 'security/status': return json(await securityStatus(cfg, body));
      case 'security/delete': return json(await securityDelete(cfg, body));
      case 'recovery/start': return json(await recoveryStart(cfg, body));
      case 'recovery/finish': return json(await recoveryFinish(cfg, body));
      case 'rate': return json(await rate(cfg, body));
      default: throw new HttpError(404, 'not_found', 'Böyle bir istek yok.');
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, message: e.message, ...e.extra }, e.status);
    console.error('api hatası', e && e.stack ? e.stack : e);
    return json({ error: 'server', message: 'Beklenmeyen bir sunucu hatası oluştu.' }, 500);
  }
}
