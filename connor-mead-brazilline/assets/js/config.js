/* ============================================================
   SITE AYARLARI
   Bu dosyadaki değerler başlangıç değeridir. Kargo, ödeme ve
   duyuru gibi ayarları yönetim panelinden (yonetici.html →
   Ayarlar / Metinler) de değiştirebilirsiniz; panelden yapılan
   değişiklik bu dosyadakinin yerine geçer.
   ============================================================ */

window.SITE = {

  /* ---- Şirket ---- */
  group: {
    name: 'Connor Mead',
    legal: 'Connor Mead Kozmetik',
    year: 2026,
    email: 'merhaba@connormead.com',
    phone: '',
    address: '',
    instagram: ''
  },

  /* ---- Sipariş ayarları ----
     Sipariş doğrudan bu siteden alınır. Ödeme yöntemleri:
       cod : Kapıda ödeme
       eft : Havale / EFT (IBAN aşağıdaki bank bölümüne yazılır)
     Tutarlar TL'dir. 0 yazarsanız ilgili ücret alınmaz. */
  order: {
    shippingFee: 0,          /* kargo ücreti */
    freeShippingOver: 0,     /* bu tutar ve üzerinde kargo ücretsiz (0 = kapalı) */
    codFee: 0,               /* kapıda ödeme hizmet bedeli */
    cod: true,
    eft: true,
    bank: { holder: '', bankName: '', iban: '' },
    note: ''                 /* sipariş ekranında görünen kısa bilgi notu */
  },

  /* ---- Ana sayfa metinleri (panelden de değiştirilebilir) ---- */
  home: { claim: '', lead: '' },

  /* ---- Üst duyuru şeridi (boşsa görünmez) ---- */
  announcement: '',

  /* ---- Güvenlik soruları ----
     Hesap açarken bunlardan üçü seçilir; şifre değiştirirken üçünden
     biri rastgele sorulur. Listeyi istediğiniz gibi değiştirebilirsiniz. */
  securityQuestions: [
    'En sevdiğiniz renk nedir?',
    'En sevdiğiniz yemek nedir?',
    'En sevdiğiniz film ya da dizi nedir?',
    'İlk evcil hayvanınızın adı nedir?',
    'İlkokul öğretmeninizin soyadı nedir?',
    'Doğduğunuz şehir neresidir?',
    'Çocukluk lakabınız nedir?',
    'İlk çalıştığınız iş yerinin adı nedir?',
    'En sevdiğiniz tatil yeri neresidir?',
    'En sevdiğiniz sporcu ya da takım kimdir?'
  ],

  /* ---- Sunucu bağlantısı (Firebase) ----
     Boş bırakırsanız site "demo modda" çalışır: kayıtlar yalnızca
     o tarayıcıda tutulur. Kurulum adımları README.md dosyasında. */
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
  },

  googleSignIn: true
};
