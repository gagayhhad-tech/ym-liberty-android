# YM Liberty (Android)

<p align="center">
  <img src="android_app/assets/www/favicon.png" width="100" height="100" alt="YM Liberty Logo" />
</p>

<h3 align="center">Современный, быстрый и свободный клиент для Яндекс Музыки на Android</h3>

<p align="center">
  Бесконечная «Моя Волна», студийный звук без цензуры (FLAC / 320 kbps), динамический полноэкранный плеер в стиле Spotify и Apple Music, встроенный эквалайзер и управление через шторку Android 12+.
</p>

<p align="center">
  💻 <b>Версия для ПК:</b> Ищете клиент для компьютера? Мод для Windows и Linux доступен в репозитории <b><a href="https://github.com/gagayhhad-tech/YandexMusicLiberty">YandexMusicLiberty</a></b>.
</p>

<p align="center">
  <a href="https://github.com/gagayhhad-tech/ym-liberty-android/releases"><img src="https://img.shields.io/badge/Release-v1.0.15-blue?style=flat-square&logo=android" alt="Release v1.0.15" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GNU_GPLv3-green?style=flat-square" alt="License GPLv3" /></a>
  <a href="https://developer.android.com/"><img src="https://img.shields.io/badge/Platform-Android_8.0+-3DDC84?style=flat-square&logo=android&logoColor=white" alt="Platform" /></a>
  <a href="https://github.com/gagayhhad-tech/YandexMusicLiberty"><img src="https://img.shields.io/badge/Desktop-Windows%20%7C%20Linux-0078D6?style=flat-square&logo=windows&logoColor=white" alt="Версия для ПК" /></a>
  <img src="https://img.shields.io/badge/Audio-FLAC%20%7C%20320kbps-purple?style=flat-square" alt="Audio" />
  <img src="https://img.shields.io/badge/Ads-Free-red?style=flat-square" alt="No Ads" />
  <a href="https://www.tbank.ru/cf/4YjAQJ0qaos"><img src="https://img.shields.io/badge/Donate-%D0%9F%D0%BE%D0%B4%D0%B4%D0%B5%D1%80%D0%B6%D0%B0%D1%82%D1%8C_%D0%B0%D0%B2%D1%82%D0%BE%D1%80%D0%B0-ff69b4?style=flat-square&logo=heart" alt="Поддержать автора" /></a>
</p>

---

## 📱 Скриншот

<p align="center">
  <img src="screenshots/vibe_screen.png" width="340" alt="Интерфейс Моей Волны" />
</p>

---

## ✨ Ключевые возможности

### 🌊 Полноценная «Моя Волна»
- **Умные рекомендации Яндекса:** прямое взаимодействие с официальным алгоритмом **Yandex Rotor API** с поддержкой всех настроений (*Всё подряд, Бодрое, Спокойное, Радостное, Открытия*).
- **Защита от зацикливания:** продвинутый механизм дедупликации — Волна больше не повторяет одни и те же треки по кругу и плавно подгружает рекомендации в фоне.
- **Статистика прослушивания:** отслеживание количества прослушанных треков и минут за день и за всё время с облачной синхронизацией.

### 💎 Обход цензуры (YM Liberty Engine)
- **Оригинальные треки:** интеграция с открытой базой [YM Liberty DB](https://github.com/gagayhhad-tech/ym-liberty-db) — автоматически заменяет запиканные и обрезанные версии песен на оригинальные студийные записи без цензуры.
- **Иконка кристалла 💎:** наглядно подсвечивает треки, в которых цензура была снята.

### 🎨 Премиальный дизайн и анимации
- **Динамический фон полноэкранного плеера:** плавное размытие обложки играющего трека с адаптивным цветовым свечением (как в Spotify и Apple Music).
- **Тактильная 3D-обложка:** мягко выдвигается вперёд при воспроизведении и отдаляется назад при паузе.
- **Интуитивные жесты:** свайп мини-плеера вверх для открытия, свайп вниз для закрытия, горизонтальные свайпы для переключения треков и навигации.

### 🎚 Студийный звук и эквалайзер
- **Максимальное качество:** поддержка HQ 320 kbps и Lossless/FLAC.
- **5-полосный эквалайзер Web Audio API:** встроенный параметрический эквалайзер с пресетами (*Bass Boost, Rock, Pop, Vocal, Acoustic, Electronic* и др.) и ручной регулировкой частот (60 Гц, 230 Гц, 910 Гц, 3.6 кГц, 14 кГц).

### 🔔 Интеграция с Android
- **Медиа-уведомление Android 12+ / 13+:** управление воспроизведением (Play/Pause, Next, Prev, прогресс-бар) прямо из системной шторки и экрана блокировки через нативный **MediaSession** и **Foreground Service**.
- **Фоновое воспроизведение:** стабильная работа в фоне без выгрузки системой.
- **Встроенный In-App автоапдейтер:** приложение само проверяет обновления через Vercel API и скачивает новые версии в один клик.

---

## 🛠 Стек технологий

- **Клиентская часть:** Современный Vanilla JS (ESNext), CSS3 Glassmorphism UI, Web Audio API, Canvas 2D Fluid Engine.
- **Платформа:** Android WebView (Cordova / Custom Smali Native Bridge, MediaSessionCompat, ForegroundService).
- **API:** Direct Client-Side Yandex Music API + Yandex Rotor Recommendation Engine.

---

## 🚀 Сборка из исходников

### Требования
- **Java JDK 17+**
- **Apktool** (2.9.3+)
- **uber-apk-signer**

### Инструкция

1. **Клонируйте репозиторий:**
   ```bash
   git clone https://github.com/gagayhhad-tech/ym-liberty-android.git
   cd ym-liberty-android
   ```

2. **Сборка APK:**
   - **На Windows:** просто запустите скрипт:
     ```cmd
     build.bat
     ```
   - **Или вручную через консоль:**
     ```bash
     # Сборка структуры проекта в APK
     java -jar apktool.jar b android_app -o YMLiberty_unsigned.apk

     # Выравнивание и подпись релизным ключом
     java -jar uber-apk-signer.jar -a YMLiberty_unsigned.apk --overwrite
     ```

Готовый APK-файл появится в корне проекта: `YMLiberty.apk`.

---

## 🌐 Экосистема проектов YM Liberty

Проекты YM Liberty развиваются как единая кроссплатформенная экосистема для комфортного прослушивания музыки без цензуры:

| Продукт | Платформа / Назначение | Ссылка |
| :--- | :--- | :--- |
| 💻 **Yandex Music Liberty (PC)** | Десктоп-мод с обходом цензуры (Windows, Linux), Discord RPC и загрузкой треков | [**Репозиторий**](https://github.com/gagayhhad-tech/YandexMusicLiberty) / [Релизы](https://github.com/gagayhhad-tech/YandexMusicLiberty/releases) |
| 📱 **YM Liberty Android** | Полноценный мобильный клиент для Android с Моей Волной, эквалайзером и шторкой | [**Репозиторий**](https://github.com/gagayhhad-tech/ym-liberty-android) / [Скачать APK](https://github.com/gagayhhad-tech/ym-liberty-android/releases/latest) |
| ☁️ **YM Liberty DB** | Центральная база оригинальных треков без цензуры (GitHub + Hugging Face) | [**Репозиторий**](https://github.com/gagayhhad-tech/ym-liberty-db) |
| 🤖 **YM Liberty Bot** | Telegram-бот для автоматической модерации и пополнения базы треков | [**Репозиторий**](https://github.com/gagayhhad-tech/ym-liberty-bot) |

---

## 💖 Поддержать автора

> **YM Liberty** создаётся и поддерживается бесплатно, с открытым исходным кодом и без какой-либо рекламы. Если вам нравится приложение, вы можете поддержать разработку и сказать автору спасибо на чашку кофе:

| Способ оплаты | Реквизиты / Ссылка |
| :--- | :--- |
| 💳 **Т-Банк / СБП** | [**Перевести через Т-Банк**](https://www.tbank.ru/cf/4YjAQJ0qaos) |
| 💎 **USDT (Сеть TON)** | `UQBfZCbJO25d6JBq6smXu-Oic2kUvlY1kJRkDx7TvB9kwdry` |

*Ваша поддержка очень сильно мотивирует развивать приложение, полировать интерфейс и оперативно выпускать свежие обновления! Большое спасибо!*

---

## 📄 Лицензия

Проект распространяется под свободной лицензией **GNU General Public License v3.0 (GPLv3)**. Подробности см. в файле [LICENSE](LICENSE).

---

## ⚠️ Дисклеймер

Данный проект разработан исключительно в образовательных, исследовательских и ознакомительных целях. Разработчики не несут ответственности за использование приложения. Все товарные знаки, названия и права на аудиоконтент принадлежат их законным правообладателям (ООО «Яндекс» и соответствующим лейблам).
