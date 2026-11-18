# TABOLAND — Android

Bu klasör hazır bir **Android Studio projesi**dir. Oyun telefon ve tabletlerde ekranın tamamını kaplar:
yatay kilitli, durum ve gezinme çubukları gizli, çentikli ekranlarda kenara kadar.
Ekran oyun sırasında kararmaz. Kayıtlı oyunlar cihazda kalır.

## Yol 1: Android Studio ile (en kolay)
1. [Android Studio](https://developer.android.com/studio)'yu kur.
2. **File → Open** ile bu klasördeki `android` klasörünü aç. Gradle eşitlemesi bitene kadar bekle.
3. Telefonu USB ile bağla (Geliştirici seçenekleri → USB hata ayıklama açık) ve ▶ **Run**'a bas.
4. APK dosyası için: **Build → Build App Bundle(s) / APK(s) → Build APK(s)**.
   Dosya `android/app/build/outputs/apk/debug/app-debug.apk` yolunda oluşur.
   Bu dosyayı telefona atıp açarak kurabilirsin.
5. Google Play için: **Build → Generate Signed App Bundle** ile `.aab` üret ve Play Console'a yükle.

## Yol 2: Bilgisayara hiçbir şey kurmadan (GitHub)
1. Bu klasörü yeni bir GitHub deposuna yükle.
2. **Actions** sekmesinde "Android APK" iş akışı kendiliğinden çalışır, yaklaşık 5 dakika sürer.
3. Bitince sayfanın altındaki **TABOLAND-android** dosyasını indir. İçindeki `app-debug.apk`'yı telefona kur.

## Oyunu güncellemek
Yeni `TABOLAND.html` gelince adını `index.html` yap ve `www/` klasörüne koy.
Sonra şunları çalıştır (Node.js gerekir):

    npm install
    npx cap sync android

Uygulama kimliği: `com.taboland.game` (`capacitor.config.json` içinden değiştirilebilir).
