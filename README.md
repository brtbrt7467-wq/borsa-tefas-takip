# Borsa & TEFAS Fon Takip ve Akıllı Alarm Sistemi

BIST hisse senetleri, döviz kurları, altın/kıymetli madenler ve TEFAS yatırım fonlarını anlık ve geçmişe dönük olarak takip eden, teknik analiz grafiklerine sahip, fiyat ve fırsat alarmlarını sesli/tarayıcı bildirimleri ve e-posta ile ileten full-stack finansal takip uygulaması.

## 🚀 Özellikler

- **Geniş Varlık Yelpazesi:** BIST hisseleri, döviz (USD, EUR, GBP), altın/emtia ve TEFAS yatırım fonları.
- **Detaylı Grafikler:** Günlük, haftalık, aylık ve yıllık fiyat değişim grafikleri (Recharts destekli).
- **Teknik ve Temel Veriler:** F/K, PD/DD, piyasa değeri, fon büyüklüğü, getiri oranları ve kategori sıralamaları.
- **Akıllı Fiyat Alarmları:**
  - Belirlenen hedef fiyat aşıldığında veya altına düşüldüğünde tetiklenme.
  - Sesli uyarı ve tarayıcı bildirimleri.
  - Sunucu taraflı 7/24 otomatik kontrol ve SMTP üzerinden e-posta bildirim desteği.
- **Portföy & Takip Listesi:** Favori varlıkları kaydetme ve kişisel portföy yönetimi.
- **Modern & Duyarlı Tasarım:** Mobil ve masaüstü tam uyumlu, karanlık/aydınlık tema desteği.

## 🛠️ Teknolojiler

- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Motion
- **Backend:** Node.js, Express, Nodemailer (E-posta bildirimleri)
- **Paketleme / Derleme:** Vite, esbuild, tsx

---

## 💻 Kurulum ve Lokal Çalıştırma

### Gereksinimler
- Node.js (v18 veya üzeri)
- npm veya yarn

### Adımlar

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/KULLANICI_ADINIZ/DEPO_ADINIZ.git
   cd DEPO_ADINIZ
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Çevre değişkenlerini yapılandırın:
   `.env.example` dosyasını referans alarak `.env` dosyası oluşturun:
   ```env
   PORT=3000
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=eposta@gmail.com
   SMTP_PASS=uygulama_sifresi
   NOTIFICATION_EMAIL=eposta@gmail.com
   ```

4. Geliştirme modunda başlatın:
   ```bash
   npm run dev
   ```
   Tarayıcınızdan `http://localhost:3000` adresine gidin.

---

## 🌐 Ücretsiz Canlıya Alma (Deploy)

Uygulama Express arka plan sunucusu içerdiğinden Node.js destekleyen herhangi bir platforma tek tıkla bağlanabilir:

### Render.com ile Yayınlama
1. [Render.com](https://render.com) üzerinde ücretsiz hesap açın.
2. **New +** -> **Web Service** seçin ve GitHub deponuzu bağlayın.
3. Ayarlar:
   - **Build Command:** `npm run build`
   - **Start Command:** `npm run start`
4. **Environment Variables** bölümüne SMTP ve e-posta ayarlarınızı girin.
5. **Create Web Service** butonuna basarak 7/24 yayına alın.

---

## 📱 iOS / Android Mobil Uygulama Olarak Çalıştırma

Uygulama mobil uyumlu tasarlanmıştır:
- **PWA / Ana Ekrana Ekleme:** Safari veya Chrome üzerinden *"Ana Ekrana Ekle"* diyerek tam ekran mobil uygulama deneyimi elde edebilirsiniz.
- **Capacitor ile Derleme:** `npm i @capacitor/core @capacitor/cli @capacitor/ios` paketleriyle Xcode projesine dönüştürüp App Store için paketleyebilirsiniz.
