# Woordenlijst — Hollandaca / Türkçe Flashcard PWA

## Yerel geliştirme
```bash
npm install
npm run dev
```

## Deploy (Netlify)
1. GitHub'a push yap
2. Netlify'da "Add new site → Import from GitHub" seç
3. Build command: `npm run build`, Publish dir: `dist`
4. VAPID anahtarlarını üret:
   ```bash
   npx web-push generate-vapid-keys
   ```
5. Netlify → Site settings → Environment variables'a ekle:
   - `VITE_VAPID_PUBLIC_KEY` = üretilen public key
   - `VAPID_PRIVATE_KEY` = üretilen private key
   - `VAPID_EMAIL` = senin e-posta adresin
6. Redeploy yap

## cron-job.org kurulumu
1. cron-job.org'a kayıt ol (ücretsiz)
2. Yeni cron job oluştur:
   - URL: `https://SENİN-SİTEN.netlify.app/api/send-push`
   - Schedule: Her 30 dakikada bir (`*/30 * * * *`)
3. Bitti! Eşinin ayarladığı saatlerde ±15 dk toleransla bildirim gönderilir.

## iPhone kurulumu (eşin için)
1. iPhone'da Safari ile siteyi aç
2. Alt menüden "Paylaş" (□↑) → "Ana Ekrana Ekle"
3. "Ekle" ye bas
4. Uygulamayı ana ekrandan aç → Bildirim iznine izin ver

**Not:** iOS 16.4+ gerekli. Bildirimler sadece ana ekrandan açıldığında çalışır.
