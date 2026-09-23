# Connor Mead · Brazilline — Resmi Site

Connor Mead ve Brazilline markalarının resmi sitesi. **Siparişler doğrudan bu siteden alınır**
(pazaryeri yönlendirmesi yoktur). Ürünleri, türleri, siparişleri ve ayarları yönetim panelinden
(`yonetici.html`) yönetirsiniz; kodla uğraşmanız gerekmez.

* Barındırma: **Cloudflare Pages** (ücretsiz)
* Hesaplar + veritabanı: **Firebase** (Authentication + Firestore, ücretsiz kota yeterlidir)
* Alan adı: Hostinger’dan aldıysanız Cloudflare’e bağlanır (bkz. Bölüm 4)

---

## İçindekiler

1. [Sayfalar ve özellikler](#1-sayfalar-ve-özellikler)
2. [Hemen denemek (kurulum gerektirmez)](#2-hemen-denemek-kurulum-gerektirmez)
3. [Firebase kurulumu — adım adım](#3-firebase-kurulumu--adım-adım)
4. [Yayına alma: GitHub → Cloudflare Pages → alan adı](#4-yayına-alma-github--cloudflare-pages--alan-adı)
5. [İlk yöneticiyi ekleme](#5-ilk-yöneticiyi-ekleme)
6. [Kurulum sonrası kontrol listesi](#6-kurulum-sonrası-kontrol-listesi)
7. [Yönetim panelini kullanma](#7-yönetim-panelini-kullanma)
8. [Nasıl çalışıyor?](#8-nasıl-çalışıyor)
9. [Sorun giderme](#9-sorun-giderme)
10. [Bilmeniz gerekenler ve yapılacaklar](#10-bilmeniz-gerekenler-ve-yapılacaklar)

---

## 1. Sayfalar ve özellikler

| Sayfa | Dosya | Ne yapar |
|---|---|---|
| **Ana sayfa** | `index.html` | Şirketin kurumsal ana sayfası. İki markaya giden kutular, **“Ürünlerimiz”** (en çok görüntülenenler) ve sipariş bilgisi. |
| **Connor Mead** | `connor-mead.html` | Marka sayfası: kendi ürünleri, türleri, yeniler. |
| **Brazilline** | `brazilline.html` | Marka sayfası. |
| **Tüm ürünlerimiz** | `katalog.html` | Tüm ürünler; marka, **tür**, fiyat, kampanya filtreleri ve sıralama (en çok görüntülenen dahil). |
| **Ürün** | `urun.html` | Ürün detayı, **görüntülenme sayısı**, **puanlar**, puan verme, sepete ekleme, “Hemen satın al”. |
| Sepet / Sipariş | `sepet.html`, `siparis-ver.html` | Sepet ve doğrudan sipariş (kapıda ödeme / havale-EFT). |
| Hesap | `hesap.html` | Giriş, hesap açma (**3 güvenlik sorusu**), **güvenlik sorusuyla şifre değiştirme**, bilgilerim. |
| Siparişlerim / Favoriler | `siparislerim.html`, `favoriler.html` | Müşterinin siparişleri ve durumları; favoriler. |
| Hakkımızda | `kurumsal.html` | Kurumsal bilgi ve iletişim. |
| **Yönetim paneli** | `yonetici.html` | Ürünler · Türler · Siparişler · Metinler · Ayarlar · Yedek. |

Öne çıkanlar:

* **Ürünlerimiz** bölümü, markanın **en çok görüntülenen** ürünlerini yatay kaydırılan bir satırda gösterir. Başlığın yanında
  **“Tümünü görüntüle →”** bağlantısı, satırın sonunda da aynı işi yapan bir kart vardır; ikisi de **Tüm ürünlerimiz** sayfasına gider.
* **Tür**: yönetim panelinde ürün eklerken “Tür” kutusuna ne yazarsanız (ör. *Şampuan*, *Krem*, *Serum*) o tür **kendiliğinden oluşur**;
  müşteriler menüden, marka sayfasından ve filtrelerden türe göre gezebilir. Ayrı bir kategori tanımlamanız gerekmez.
* **Şifre değiştirme e-posta bağlantısıyla değildir.** Hesap açarken **3 güvenlik sorusu** seçilip cevaplanır. Şifre değiştirirken bu üçünden
  **rastgele biri** sorulur; doğru cevaplanırsa yeni şifre belirlenir.
* Giriş ve hesap açma formlarında **ad soyad sorulmaz**. Ad, telefon ve adres yalnızca sipariş verirken istenir ve bir sonraki sipariş için hatırlanır.
* Telefondaki taşma/kayma sorunu giderildi (üst çubuktaki sepet, favori ve hesap simgeleri artık ekranda kalıyor).

---

## 2. Hemen denemek (kurulum gerektirmez)

`assets/js/config.js` içindeki `firebase` alanları **boşken** site **demo modda** çalışır: `index.html` dosyasına çift tıklamanız yeter.
Hesaplar, ürünler ve siparişler yalnızca **o tarayıcıda** saklanır. Bu modda:

* Hesap açan herkes yönetim paneline girebilir (veriler zaten sadece sizin tarayıcınızdadır).
* Sipariş sayfasında “sunucu bağlantısı kurulu değil” uyarısı görünür; **gerçek müşteriler için mutlaka Firebase kurun.**

---

## 3. Firebase kurulumu — adım adım

Firebase, Google’ın ücretsiz katmanı olan bir hizmettir. Kredi kartı gerekmez. Tarayıcıda Google hesabınızla girin: <https://console.firebase.google.com>

### 3.1 Proje oluşturun
1. **Proje oluştur / Create a project** → bir ad verin (ör. `connor-mead`) → devam.
2. *Google Analytics* isteğe bağlıdır; kapatabilirsiniz → **Proje oluştur**.

### 3.2 Giriş yöntemini açın (Authentication)
1. Sol menü **Build (Derleme) → Authentication → Get started (Başlayın)**.
2. **Sign-in method (Oturum açma yöntemi)** sekmesi → **Email/Password (E-posta/Şifre)** → *Enable (Etkinleştir)* → **Save (Kaydet)**.
   (“Email link / passwordless” seçeneğini **açmayın**; bu sitede e-posta bağlantısı kullanılmaz.)
3. İsterseniz **Google**’ı da açın (*Enable* → destek e-postası seçin → *Save*). Kullanmayacaksanız `config.js` içinde `googleSignIn: false` yapın.

### 3.3 Veritabanını oluşturun (Firestore)
1. Sol menü **Build → Firestore Database → Create database (Veritabanı oluştur)**.
2. Konum seçin (ör. `eur3 (europe-west)`; **sonradan değiştirilemez**).
3. **Start in production mode (Üretim modunda başlat)** → **Create**.

### 3.4 Güvenlik kurallarını yayınlayın (çok önemli)
1. **Firestore Database → Rules (Kurallar)** sekmesi.
2. Kutudaki her şeyi silin; bu projedeki **`firestore.rules`** dosyasının **tamamını** yapıştırın.
3. **Publish (Yayınla)** düğmesine basın.

> Kurallar yayınlanmazsa sipariş verilemez, ürünler kaydedilemez. Sipariş ekranında `permission-denied` hatası görürseniz sebep budur.

### 3.5 Sitenin Firebase bilgilerini alın (`config.js`)
1. Sol üstte **Project Overview** yanındaki **⚙ (dişli) → Project settings (Proje ayarları)**.
2. **General (Genel)** sekmesinde aşağı inin → **Your apps (Uygulamalarınız)** → **`</>` (Web)** simgesi.
3. Bir takma ad yazın (ör. `site`) → **Register app**. *Firebase Hosting*’i işaretlemeyin.
4. Ekranda `firebaseConfig = { ... }` görünür. Bu değerleri **`assets/js/config.js`** içindeki `firebase` bölümüne yazın:

```js
firebase: {
  apiKey: 'AIza...',
  authDomain: 'connor-mead.firebaseapp.com',
  projectId: 'connor-mead',
  storageBucket: 'connor-mead.appspot.com',
  messagingSenderId: '1234567890',
  appId: '1:1234567890:web:abcdef'
},
```

> `apiKey` **gizli bilgi değildir**; Firebase web uygulamalarında herkese açıktır. Verinizi koruyan şey 3.4’teki kurallardır.

### 3.6 Alan adınızı yetkilendirin
**Authentication → Settings (Ayarlar) → Authorized domains (Yetkili alan adları) → Add domain** ile şunları ekleyin:
Cloudflare’in verdiği adres (`proje-adi.pages.dev`) ve kendi alan adınız (`ornek.com`, `www.ornek.com`). Eklemezseniz Google ile giriş hata verir.

### 3.7 “Hizmet hesabı” anahtarını indirin (güvenlik soruları ve puanlama için)
Şifreyi e-posta bağlantısı olmadan değiştirebilmek ve puanları güvenle kaydedebilmek için sunucu tarafında Firebase’in yönetici anahtarı gerekir.
1. **⚙ → Project settings → Service accounts (Hizmet hesapları)** sekmesi.
2. **Generate new private key (Yeni özel anahtar oluştur) → Generate key**. Bir **`.json`** dosyası iner.
3. Bu dosyayı **saklayın ama kimseyle paylaşmayın ve GitHub’a yüklemeyin.** İçeriğini bir sonraki bölümde Cloudflare’e yapıştıracaksınız.

---

## 4. Yayına alma: GitHub → Cloudflare Pages → alan adı

### 4.1 GitHub’a yükleyin
1. <https://github.com> → **New repository** → ad verin (ör. `connor-mead-site`) → *Private* seçebilirsiniz → **Create**.
2. Bu klasörün **içindekileri** (klasörün kendisini değil) depoya yükleyin: *Add file → Upload files* ile sürükleyip bırakın → **Commit changes**.
   `functions` klasörü ve `_headers` dosyası da yüklenmiş olmalı.

### 4.2 Cloudflare Pages’i bağlayın
1. <https://dash.cloudflare.com> → ücretsiz hesap açın → **Workers & Pages → Create → Pages → Connect to Git**.
2. GitHub’ı yetkilendirin, depoyu seçin → **Begin setup**.
3. Ayarlar:
   * **Framework preset:** `None`
   * **Build command:** boş bırakın
   * **Build output directory:** `/` (eğik çizgi)
4. **Save and Deploy**. Bir dakika içinde `https://proje-adi.pages.dev` adresinde site açılır.

> **Önemli:** `functions` klasörü yalnızca **GitHub bağlantısıyla** (ya da Wrangler ile) yüklenen sitelerde çalışır. Cloudflare panelinde klasörü *sürükle-bırak* yüklerseniz
> güvenlik soruları ve puanlama çalışmaz. Siteyi **Hostinger’ın barındırma (hosting) hizmetine dosya olarak yüklemeyin** — orada da çalışmaz.

### 4.3 Gizli ayarları Cloudflare’e girin
Proje → **Settings (Ayarlar) → Variables and Secrets** (ya da *Environment variables*) → **Add**. İki tane ekleyin (**Type: Secret**, Production için):

| Ad | Değer |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | 3.7’de indirdiğiniz `.json` dosyasını Not Defteri ile açın, **tüm içeriği** kopyalayıp yapıştırın (`{` ile başlayıp `}` ile biter). |
| `RECOVERY_SECRET` | Rastgele, uzun bir metin (en az 16 karakter; ör. `Kx9-dP2mQ7vLr4TzY8wNb3Hs`). **Bir kez belirleyin ve değiştirmeyin**: değiştirirseniz herkesin kayıtlı güvenlik sorusu cevabı geçersiz olur. |

Kaydedin, sonra **Deployments → son dağıtımın yanındaki ⋯ → Retry deployment** deyin (yeni ayarlar bir sonraki dağıtımda devreye girer).

### 4.4 Sunucu tarafını kontrol edin
Tarayıcıda şu adresi açın (kendi adresinizle):

```
https://proje-adi.pages.dev/api/health?deep=1
```

Şuna benzer bir yanıt görmelisiniz — hepsi **“tamam”** olmalı:

```json
{"ok":true,"functions":"çalışıyor","ayarlar":{"FIREBASE_SERVICE_ACCOUNT":"tamam","RECOVERY_SECRET":"tamam"},
 "proje":"connor-mead","ayrintili":{"googleErisim":"tamam","firestoreOkuma":"tamam","authYonetimi":"tamam","kimlikAnahtarlari":"tamam"}}
```

“SORUN” yazan bir satır varsa ne eksik olduğunu Türkçe söyler (bkz. Bölüm 9).

### 4.5 Alan adını bağlayın (Hostinger’dan aldıysanız)
Cloudflare projesi → **Custom domains → Set up a custom domain** → alan adınızı yazın (ör. `ornek.com`).

**Yöntem A — önerilen (kök alan adı ve www birlikte çalışır)**
1. Cloudflare panelinde **Add a site** ile alan adınızı ekleyin (ücretsiz plan). Cloudflare size iki **nameserver** verir (ör. `ada.ns.cloudflare.com`).
2. Hostinger’da **hPanel → Domains → alan adınız → DNS / Nameservers → Change nameservers** ve Cloudflare’in verdiği ikisini yazın.
3. 5 dakika – 24 saat içinde Cloudflare “Active” olur. Pages projesinde **Custom domains**’ten alan adını ekleyin; kalanını Cloudflare kendisi yapar.

**Yöntem B — yalnızca `www` için, nameserver değiştirmeden**
1. Hostinger **hPanel → Domains → DNS / Nameservers → DNS records** → *Add record*: **Type** `CNAME`, **Name** `www`, **Target** `proje-adi.pages.dev`.
2. Pages projesinde **Custom domains** → `www.ornek.com` ekleyin.
3. `ornek.com` (www’suz) adresini Hostinger’daki yönlendirme (*Redirects*) ile `www.ornek.com`’a yönlendirin.

Alan adı bağlanınca **3.6**’daki gibi Firebase’de **Authorized domains**’e ekleyin.

---

## 5. İlk yöneticiyi ekleme

Yönetim paneline kimin girebileceği Firestore’daki **`admins`** koleksiyonuyla belirlenir. (E-posta listesi tutmaya gerek yok; bir hesabın e-postasını
başkası taklit edemez, çünkü kimlik olarak hesabın **UID**’si kullanılır.)

1. Sitede normal bir müşteri gibi **Hesap aç** deyip yönetici olacak hesabı oluşturun (3 güvenlik sorusunu yanıtlayın).
2. `https://alanadiniz/yonetici.html` sayfasını açın. **“Bu hesabın yönetici yetkisi yok”** ekranı hesabınızın **UID**’sini gösterir → **Kopyala**.
3. Firebase → **Firestore Database → Data (Veri) → Start collection (Koleksiyon başlat)**
   * **Collection ID:** `admins`
   * **Document ID:** kopyaladığınız UID’yi yapıştırın
   * **Field:** `role` — **Type:** string — **Value:** `admin` → **Save**
4. `yonetici.html` sayfasını yenileyin. Panel açılır. Daha sonra başka yöneticiler için aynı adımları tekrarlayın (aynı `admins` koleksiyonuna yeni belge).

---

## 6. Kurulum sonrası kontrol listesi

Kendi adresinizde sırayla deneyin:

- [ ] `…/api/health?deep=1` hepsi “tamam”.
- [ ] **Hesap aç** → 3 güvenlik sorusuyla hesap açılıyor (hata yok).
- [ ] `yonetici.html` → (5. bölümdeki adımlarla) panel açılıyor.
- [ ] **Ayarlar** sekmesinde kargo/ödeme bilgilerini girip **Kaydet**.
- [ ] Panelden bir **ürün ekleyin** (marka + **Tür** yazın) → **Kaydet** → marka sayfasında ve **Tüm ürünlerimiz**’de görünüyor.
- [ ] Ürün sayfasını başka bir tarayıcıda açın → **görüntülenme** sayısı artıyor; giriş yapıp **puan verin** → puan görünüyor.
- [ ] Sepete ekleyip **test siparişi** verin → **Siparişler** sekmesinde görünüyor; durumu değiştirince müşterinin **Siparişlerim** sayfasında güncelleniyor.
- [ ] Çıkış yapıp **Şifremi unuttum** → güvenlik sorusu soruluyor → doğru cevapla şifre değişiyor.
- [ ] Telefonunuzdan açın: üst çubukta menü, hesap, favori ve sepet simgelerinin hepsi görünüyor.

---

## 7. Yönetim paneli kullanımı

**Yönetim paneli:** `https://alanadiniz/yonetici.html` (menüde yalnızca yöneticilere “Yönetim paneli” bağlantısı görünür).

> **Ürün, tür, metin ve ayarlarda yaptığınız değişiklikler üstteki `Kaydet` düğmesine basınca yayına alınır.** Sipariş durumu değişiklikleri ise hemen kaydedilir.

* **Ürünler** — *Yeni ürün*: marka, **Tür** (yazın ya da mevcut türlerden birine dokunun), ad, fiyat, açıklama vb. Listede her ürünün **görüntülenme** sayısı ve **puanı** görünür.
  * Yazdığınız **Tür** yoksa otomatik oluşturulur (“Şampuan”, “şampuan” aynı kabul edilir).
  * **Fotoğraf:** resim dosyasını GitHub’daki `assets/img/` klasörüne yükleyin (klasör yoksa oluşturun), panelde “Fotoğraf adresi”ne `assets/img/dosya-adi.jpg` yazın.
    Fotoğraf yoksa ürünün rengi ve şekli ile çizim gösterilir.
* **Türler** — türleri yeniden adlandırın, sıralayın, silin veya boş tür ekleyin.
* **Siparişler** — yeni siparişler rozetle görünür. Siparişe tıklayınca müşteri bilgisi, adres, ürünler ve ödeme yöntemi açılır. **Durum** (Alındı → Ödemesi alındı → Hazırlanıyor →
  Kargoya verildi → Teslim edildi / İptal) ve **kargo takip numarası** girip *Güncelle*’ye basın. Müşteri bunu “Siparişlerim”de görür.
* **Metinler** — üst duyuru şeridi, ana sayfa başlığı ve marka sayfası yazıları.
* **Ayarlar** — kargo ücreti (ve “şu tutarın üzerinde ücretsiz”), kapıda ödeme bedeli, **havale/EFT bilgileri (IBAN)**. IBAN girmezseniz “Havale/EFT” seçeneği müşterilere gösterilmez.
* **Yedek** — katalogun yedeğini metin olarak alın / geri yükleyin.

Yeni sipariş için **e-posta bildirimi yoktur**; siparişleri panelden takip edin (sekme başlığında “N yeni” yazar).

---

## 8. Nasıl çalışıyor?

**Firestore koleksiyonları**

| Koleksiyon | İçerik | Kim okur / yazar |
|---|---|---|
| `site/catalog` | Ürünler, türler, metinler, ayarlar (tek belge) | Herkes okur · yalnızca yönetici yazar |
| `stats/{ürün}` | Görüntülenme sayısı, puan toplamı/adedi | Herkes okur · görüntülenme için herkes yalnızca **+1** yazar · puanı sunucu işlevi yazar |
| `ratings/{ürün}__{uid}` | Bir kişinin bir ürüne verdiği puan | Yalnızca sunucu işlevi yazar · kişi kendi puanını okur |
| `orders/{kod}` | Siparişler (`CM-XXXXXX`) | Müşteri oluşturur ve kendi siparişini görür · durumu yalnızca yönetici değiştirir |
| `users/{uid}` | Profil, adres, sepet, favoriler | Yalnızca hesabın sahibi |
| `security/{uid}` | Güvenlik soruları ve cevap özetleri | **Tarayıcıdan hiç erişilemez**, yalnızca sunucu işlevi |
| `admins/{uid}` | Yönetici kaydı | Yalnızca Firebase Konsolu’ndan yazılır |

**Güvenlik soruları ile şifre değiştirme**

1. Hesap açarken 3 soru seçilir ve cevaplanır. Cevaplar **düz metin olarak saklanmaz**: sunucu işlevi, `RECOVERY_SECRET` ile karıştırılmış bir özetini `security/{uid}` içine yazar.
   Harf büyüklüğü, boşluk ve Türkçe karakterler önemsizdir (“İstanbul” = “istanbul”).
2. Şifre değiştirirken (Şifremi unuttum ya da Hesabım → Şifreyi değiştir) sunucu, üç sorudan **rastgele birini** verir. Hangi sorunun sorulduğu imzalıdır; kullanıcı kendi istediği soruyu seçemez.
3. Cevap doğruysa sunucu şifreyi Firebase Authentication’da değiştirir ve kullanıcı yeni şifreyle otomatik giriş yapar.
4. **5 yanlış cevaptan sonra hesap 15 dakika kilitlenir.** Cevap doğru bile olsa kilitliyken şifre değişmez.
5. Google ile giriş yapan hesaplarda şifre olmadığı için bu yöntem geçerli değildir.

**Görüntülenme ve puan**

* Ürün sayfası açılınca sayaç **+1** artar. Aynı kişi aynı ürünü 30 dakika içinde tekrar açarsa sayılmaz; yöneticinin gezintisi de sayılmaz.
* Puan vermek için giriş gerekir; her hesap bir ürüne **tek puan** verir, istediği zaman değiştirebilir. Ortalama her puanda sunucuda yeniden hesaplanır.
* “Ürünlerimiz” satırı görüntülenmeye göre sıralanır (10 dakikalık önbellekle, okuma kotasını korumak için).

---

## 9. Sorun giderme

| Belirti | Sebep / çözüm |
|---|---|
| Hesap açarken **“Sunucu işlevlerine ulaşılamadı”** | `functions` klasörü yayınlanmamış. Siteyi **GitHub bağlantısıyla** Cloudflare Pages’e bağlayın (sürükle-bırak yükleme `functions`’ı çalıştırmaz). |
| **“Sunucu ayarları eksik: …”** | 4.3’teki iki gizli ayar girilmemiş/yanlış. Girip **Retry deployment** yapın. `…/api/health` neyin eksik olduğunu yazar. |
| Health’te **`googleErisim` SORUN** (“invalid_grant”, yetki hatası) | `FIREBASE_SERVICE_ACCOUNT` yanlış kopyalanmış (JSON’un tamamı olmalı) ya da **başka bir projenin** anahtarı. 3.7’yi tekrarlayıp yapıştırın. |
| Health’te **`firestoreOkuma` / `authYonetimi` SORUN** | Firestore veritabanı oluşturulmamış (3.3) ya da Authentication açılmamış (3.2). |
| Sipariş: **“Siparişiniz kaydedilemedi (Hata: permission-denied)”** | Firestore kuralları yayınlanmamış (3.4). |
| Panelde **“Kaydetme izni yok”** | Hesabınız `admins` koleksiyonuna eklenmemiş (Bölüm 5) ya da kurallar yayınlanmamış. |
| Ürün ekledim ama sitede görünmüyor | Panelde üstteki **Kaydet**’e basmayı unutmuş olabilirsiniz. Ayrıca tarayıcıda **Ctrl+F5** yapın; `config.js` içindeki Firebase bilgilerinin dolu olduğunu kontrol edin. |
| Sayfa hâlâ eski görünüyor | Tarayıcı önbelleği: **Ctrl+F5**. Cloudflare’de: *Caching → Purge cache*. |
| Google ile giriş: **“unauthorized-domain”** | Alan adı Firebase → Authentication → Authorized domains’e eklenmemiş (3.6). |
| “Şifremi unuttum” → **“Bu e-posta için şifre yenileme yapılamıyor”** | Hesap yok, hesap Google ile açılmış ya da güvenlik soruları ayarlı değil. Giriş yapıp **Hesabım → Güvenlik soruları**’ndan belirleyin. |
| Kullanıcı 5 kez yanlış girip kilitlendi | 15 dakika bekleyin. Acil durumda Firebase Konsolu → Firestore → `security/{uid}` belgesinde `lockUntil` alanını `0` yapın. |
| Kullanıcı hem şifreyi hem cevabı unuttu | Firebase → Authentication → Users → kullanıcının yanındaki ⋯ → **Reset password** (e-posta gönderir) ya da hesabı silip yeniden açtırın. |
| Yeni siparişleri göremiyorum | `yonetici.html → Siparişler → Yenile`. Hata varsa mesajı okuyun (yetki ya da kural sorunu). |

---

## 10. Bilmeniz gerekenler ve yapılacaklar

**Yasal metinler (siz hazırlatmalısınız).** Bu site sipariş aldığı için Türkiye’de e-ticaret mevzuatı gereği genellikle şunlar gerekir: **Mesafeli satış sözleşmesi ve ön bilgilendirme formu**,
**iade/cayma koşulları**, **KVKK aydınlatma metni**, **gizlilik ve çerez politikası**. Bu metinler koda dahil değildir; bir avukat ya da mali müşavirle hazırlatıp
sayfa olarak ekletmenizi (ve altlığa bağlantı koymanızı) öneririz.

**Ödeme.** Şu an **kapıda ödeme** ve **havale/EFT** vardır. Kredi kartı ile online ödeme (iyzico, PayTR vb.) yoktur; eklenecekse ayrı bir entegrasyon işidir.
Kart ödemesi olmadığı için fiyatlar müşterinin tarayıcısından gelir; havale/kapıda ödeme öncesi sipariş tutarını panelden kontrol etmeniz yeterlidir.

**Şifre sıfırlama güvenliği.** Güvenlik soruları, e-posta doğrulamasından daha zayıf bir yöntemdir (cevaplar tahmin edilebilir olabilir). Bunu dengelemek için: cevaplar sunucuda gizli anahtarla özetlenir,
5 yanlışta hesap kilitlenir, sorular sunucudan rastgele gelir. Yine de müşterilerinize “tahmin edilmesi zor cevaplar” seçmelerini söylemek iyi olur.

**Görüntülenme sayacı** herkesin +1 yazabildiği açık bir sayaçtır; kötü niyetli biri sayıyı şişirebilir. Kritik bir veri olmadığı için bu bilinçli bir tercihtir.

**Ücretsiz kotalar.** Firebase Firestore günlük 50.000 okuma / 20.000 yazma; Cloudflare Pages Functions günlük 100.000 istek. Küçük ve orta ölçekli bir mağaza için fazlasıyla yeterlidir.
Okuma kotasını korumak için katalog tek belge halinde okunur; “çok görüntülenenler” listesi ziyaretçinin tarayıcısında 10 dakika önbellekte tutulur (bir ziyaretçi en fazla ~40 belge okur).
Günde birkaç bin ziyaretçiden sonra ücretsiz kota aşılırsa Firebase’i *Blaze (kullandıkça öde)* planına geçirmeniz gerekir; bu ölçekte maliyet birkaç kuruş ile birkaç dolar arasındadır.

**Firebase Storage kullanılmıyor** (yeni projelerde ücretli plan gerektirir). Fotoğraflar `assets/img/` klasöründen sunulur.

**Sonraki adımlar (isteğe bağlı):** yeni siparişte e-posta/WhatsApp bildirimi, online kart ödemesi, stok adedi takibi, indirim kodları.

### Klasör yapısı

```
index.html                 Ana sayfa                 functions/api/[[path]].js   Sunucu işlevleri (Cloudflare)
connor-mead.html           Marka sayfası             firestore.rules             Firestore güvenlik kuralları
brazilline.html            Marka sayfası             _headers                    Güvenlik başlıkları (Cloudflare)
katalog.html               Tüm ürünlerimiz           robots.txt                  Arama motoru yönergeleri
urun.html · sepet.html · siparis-ver.html · favoriler.html · hesap.html · siparislerim.html · kurumsal.html · yonetici.html · 404.html
assets/css/main.css        Tüm stiller
assets/js/config.js        ← SİZİN DÜZENLEYECEĞİNİZ AYARLAR (Firebase bilgileri, kargo, sorular…)
assets/js/data.js          Katalog deposu            assets/js/backend.js        Hesap, sipariş, Firebase bağlantısı
assets/js/stats.js         Görüntülenme ve puan      assets/js/ui.js             Başlık, menü, kart, sepet
assets/js/pages.js         Sayfa görünümleri         assets/js/admin.js          Yönetim paneli
```
