# AR Live Book — Инструкция

## Архитектура

```
┌─────────────────┐       ┌──────────────────┐       ┌─────────────────┐
│  Камера (Web)   │ ────▶ │  AR.js + NFT     │ ────▶ │  A-Frame Scene  │
│  getUserMedia   │       │  tracking engine │       │  a-nft markers  │
└─────────────────┘       └──────────────────┘       └────────┬────────┘
                                                              │
                                            ┌─────────────────┼─────────────────┐
                                            │                 │                 │
                                      markerFound       markerLost         markerFound
                                      play(video)      pause(video)      play(video)
                                      opacity → 1      opacity → 0       opacity → 1
```

### Как это работает

1. **Камера** — при загрузке страницы браузер запрашивает доступ к камере (`environment` — задняя камера на мобильных). Видеопоток отображается на весь экран.

2. **NFT Tracking** — AR.js загружает дескрипторы (.fset, .fset3, .iset) из папки `nft-assets/`. Эти файлы описывают уникальные визуальные особенности каждого изображения (углы, текстуры, градиенты). При совпадении паттерна в реальном времени с камерой — срабатывает `markerFound`.

3. **Видео** — при `markerFound` видео запускается программно (без клика пользователя). Это возможно потому что видео имеет атрибут `muted` — браузеры разрешают autoplay для muted видео. При `markerLost` видео ставится на паузу и сбрасывается на начало.

4. **Плавность** — A-Frame animation компонента управляет opacity элемента `<a-video>`, создавая плавное появление/исчезновение.

### Файловая структура

```
ar-app/
├── index.html              # Точка входа: A-Frame сцена + HUD
├── css/style.css           # Стили overlay, адаптив, анимации
├── js/main.js              # Логика: камера, маркеры, видео, перезапуск
├── nginx.conf              # Конфигурация Nginx для Docker
├── Dockerfile              # nginx:alpine с MIME для NFT
├── .dockerignore           # Исключения из Docker-образа
├── nft-assets/             # NFT-дескрипторы (положить сюда)
│   ├── image1.fset
│   ├── image1.fset3
│   ├── image1.iset
│   ├── image2.fset
│   ├── image2.fset3
│   ├── image2.iset
│   ├── image3.fset
│   ├── image3.fset3
│   └── image3.iset
└── videos/                 # Видеофайлы
    ├── video1.mp4
    ├── video2.mp4
    └── video3.mp4
```

---

## Генерация NFT-дескрипторов (.fset, .fset3, .iset)

NFT (Natural Feature Tracking) дескрипторы создаются из изображений с помощью утилиты **nft-maker** из проекта ARjs/ARTag. Ниже — три способа.

### Способ 1: Docker-контейнер (рекомендуемый)

Самый простой способ — использовать готовый Docker-образ с artoolkitX:

```bash
# 1) Поместите ваши изображения (PNG/JPG) в папку nft-assets
cp images/image1.png nft-assets/image1.png
cp images/image2.png nft-assets/image2.png
cp images/image3.png nft-assets/image3.png

# 2) Запустите nft-maker в Docker
docker run --rm -v "$(pwd)/nft-assets:/data" ghcr.io/nicolocarpignoli/nft-marker-maker:latest \
  nft-maker image1.png
docker run --rm -v "$(pwd)/nft-assets:/data" ghcr.io/nicolocarpignoli/nft-maker:latest \
  nft-maker image2.png
docker run --rm -v "$(pwd)/nft-assets:/data" ghcr.io/nicolocarpignoli/nft-marker-maker:latest \
  nft-maker image3.png
```

После выполнения в `nft-assets/` появятся файлы:
- `image1.fset`, `image1.fset3`, `image1.iset`
- `image2.fset`, `image2.fset3`, `image2.iset`
- `image3.fset`, `image3.fset3`, `image3.iset`

### Способ 2: Онлайн-генератор

AR.js предоставляет онлайн-инструмент:

1. Откройте: **https://carnaux.github.io/NFT-Marker-Creator/**
2. Загрузите PNG/JPG изображение
3. Настройте параметры (по умолчанию обычно ок):
   - **Image DPI**: 72 (стандарт для экранов)
   - **Min features**: 100–500 (больше = точнее, но медленнее)
4. Нажмите **Download .zip**
5. Распакуйте `.fset`, `.fset3`, `.iset` в `nft-assets/`

> **Важно**: онлайн-генератор может быть недоступен. Если не работает — используйте Docker (Способ 1).

### Способ 3: Локальная сборка из исходников

Если Docker не доступен:

```bash
# Клонируем репозиторий
git clone https://github.com/AR-js-org/studio-nft-marker-maker.git
cd studio-nft-marker-maker

# Устанавливаем зависимости
npm install

# Запускаем сервер
npm start

# Открываем браузер на http://localhost:3000, загружаем изображение, скачиваем дескрипторы
```

### Советы для качественных дескрипторов

| Критерий | Рекомендация |
|---|---|
| **Разрешение** | Минимум 800×600 px, без пикселизации |
| **Контраст** | Высокий — чёткие границы, текстуры, паттерны |
| **Однородные области** | Избегайте — одноцветные участки не даютfeature points |
| **Искажения** | Избегайте бликов, зеркальных поверхностей |
| **Уникальность** | Каждое изображение должно быть визуально уникальным |
| **Формат** | PNG или JPG без сжатия с потерями |

### Проверка дескрипторов

После генерации проверьте:

```bash
# Каждый набор должен содержать ровно 3 файла
ls -la nft-assets/image1.*
# image1.fset  image1.fset3  image1.iset

# Размеры должны быть > 0 (не пустые)
wc -c nft-assets/image1.*
```

---

## Локальный запуск (без Docker)

```bash
# Python 3
cd ar-app
python3 -m http.server 8080

# Или Node.js
npx serve ar-app -p 8080

# Откройте http://localhost:8080
```

> ⚠️ AR.js требует **HTTPS** для доступа к камере на продакшене. Для локального тестирования `localhost` работает по HTTP.

---

## Деплой на Dokploy

1. Соберите Docker-образ:
```bash
cd ar-app
docker build -t ar-live-book .
```

2. В Dokploy создайте новое приложение типа **Docker Image**:
   - Image: `ar-live-book` (или push в registry)
   - Port: `80`
   - Protocol: `HTTP`

3. **Обязательно включите HTTPS** (Dokploy поддерживает Let's Encrypt):
   - Камера в браузере работает только по **HTTPS** (кроме `localhost`)
   - На мобильных устройствах без HTTPS доступ к камере будет заблокирован

4. Для Dokploy с Docker Compose:
```yaml
services:
  ar-live-book:
    build:
      context: ./ar-app
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
```

---

## Добавление новых маркеров

Чтобы добавить 4-е изображение:

1. Сгенерируйте дескрипторы → положите в `nft-assets/image4.*`
2. Добавьте `<video id="video4">` в `<a-assets>`
3. Добавьте `<a-nft>` блок в `index.html`
4. Добавьте запись в массив `MARKERS` в `main.js`:
```js
{
  id: "nft-marker-4",
  videoId: "video4",
  arVideoId: "ar-video-4",
  label: "image4",
}
```

---

## Совместимость

| Платформа | Браузер | Статус |
|---|---|---|
| iOS 15+ | Safari | ✅ Требуется HTTPS |
| Android 10+ | Chrome | ✅ Требуется HTTPS |
| Desktop | Chrome/Firefox | ✅ Для тестирования |
| iOS | Chrome | ⚠️ Использует WebKit — тот же движок что Safari |

### Известные ограничения

- **iOS Safari**: может потребоваться явный жест пользователя для autoplay. `muted` + `playsinline` решают проблему в 95% случаев.
- **Android Chrome**: autoplay muted видео работает без проблем.
- **Низкое освещение**: NFT-трекинг зависит от контрастности — в темноте распознавание может работать нестабильно.
