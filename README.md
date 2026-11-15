# PSYCHORA

**The Psychology Professional Network** — Türkiye merkezli, uluslararası büyümeye uygun psikoloji profesyonelleri ağı.

## Bu pakette neler var?

- GitHub Pages üzerinde yayınlanmaya hazır Vite + React + TypeScript iskeleti
- Responsive başlangıç arayüzü
- Türkiye'nin 81 ilini içeren veri dosyası
- Psikoloji uzmanlık kategorileri
- Ülke/bölge/şehir ölçeklenebilir veri yaklaşımı
- GitHub Actions ile otomatik Pages dağıtımı
- İleride Supabase entegrasyonu için ortam değişkeni örneği ve temel tipler

## Önemli mimari not

GitHub Pages statik hosting hizmetidir. Tek başına kullanıcı hesabı, veritabanı, güvenli dosya yükleme, özel mesajlaşma veya sunucu tarafı yetkilendirme çalıştırmaz. Bu paket şu an arayüz ve statik veri başlangıcıdır. Gerçek üyelik ve sosyal ağ özellikleri sonraki aşamada Supabase gibi bir backend'e bağlanacaktır. Demo butonları gerçek üyelik oluşturmaz.

## 1. GitHub deposunu oluştur

GitHub'da `psychora` adında **Public** bir repository oluştur. Bu paketin içindeki dosyaları depo kök dizinine yükle.

## 2. GitHub Pages'i etkinleştir

Repository → Settings → Pages → Build and deployment → Source bölümünde **GitHub Actions** seç.

`main` dalına gönderilen her commit, `.github/workflows/deploy.yml` aracılığıyla siteyi otomatik derleyip yayınlar.

Yayın adresi tipik olarak:

`https://KULLANICI_ADIN.github.io/psychora/`

## 3. Bilgisayarda çalıştırmak istersen

Node.js 20 veya üzeri gerekir.

```bash
npm install
npm run dev
```

Üretim derlemesi:

```bash
npm run build
npm run preview
```

## 4. İlk aşamanın kapsamı

Bu sürümde:
- Marka/landing sayfası
- Uzmanlık alanları kataloğu
- Türkiye'nin 81 ili için arama/seçim arayüzü
- Responsive tasarım

bulunur.

Henüz gerçek kullanıcı kaydı, giriş, profil kaydetme, paylaşım, takip, mesajlaşma veya medya yükleme yoktur. Bunları sonraki aşamalarda gerçek backend ile ekleyeceğiz.

## 5. Sonraki geliştirme sırası

1. Supabase projesi ve PostgreSQL şeması
2. E-posta kayıt, doğrulama ve oturum yönetimi
3. Profil ve mesleki doğrulama başvuruları
4. Takip sistemi ve sosyal akış
5. Gönderi gizliliği ve RLS politikaları
6. Medya depolama, yorum, beğeni ve bildirimler
7. Akademik kütüphane, vaka tartışmaları, etkinlikler, webinarlar, iş ilanları ve uzman haritası

## Güvenlik

- Gerçek Supabase `service_role` anahtarını veya başka bir gizli anahtarı frontend'e ya da GitHub deposuna koyma.
- Erişim kontrolünü sadece arayüzde yapma; backend ve veritabanı politikalarıyla uygula.
- Mesleki belge ve danışan verilerini herkese açık depolama alanında tutma.
- Canlıya çıkmadan önce KVKK, meslek etiği ve veri saklama süreçlerini uzman hukuk/uyum desteğiyle değerlendir.
