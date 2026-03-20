# НейроПовар (Telegram Mini App ready)

React/Vite приложение для сценария:
1) загрузить фото продуктов,
2) распознать продукты,
3) отредактировать список,
4) получить рекомендации блюд и КБЖУ.

## Что изменено в архитектуре

- Убрана клиентская интеграция Gemini (`@google/genai`).
- Вызовы LLM перенесены на server-side.
- Фронтенд теперь работает только с backend endpoint-ами:
  - `POST /api/analyze-products` — распознавание продуктов с image input.
  - `POST /api/generate-recipes` — генерация карточек блюд.
- Для AI используется **OpenAI Responses API**.
- Секрет `OPENAI_API_KEY` хранится только в переменных окружения backend/runtime.

## Технологии

- Frontend: React + Vite
- Backend для локальной разработки: Express (`server/index.ts`)
- Production API: Vercel Functions (`api/*.ts`)
- AI: OpenAI Responses API (модели по умолчанию `gpt-4.1-mini`)

## Переменные окружения

Скопируйте `.env.example` в `.env`:

```bash
cp .env.example .env
```

И задайте минимум:

```env
OPENAI_API_KEY=...
```

Опционально:

```env
OPENAI_VISION_MODEL=gpt-4.1-mini
OPENAI_RECIPE_MODEL=gpt-4.1-mini
API_PORT=8787
```

## Локальный запуск

Установка:

```bash
npm install
```

Запустите API (терминал 1):

```bash
npm run dev:api
```

Запустите фронтенд (терминал 2):

```bash
npm run dev
```

Frontend: `http://localhost:3000`

Vite проксирует `/api/*` на `http://localhost:8787`.

## Деплой на Vercel

1. Импортируйте репозиторий в Vercel.
2. Framework preset: **Vite** (обычно определяется автоматически).
3. Добавьте environment variable в проекте Vercel:
   - `OPENAI_API_KEY` (обязательно)
   - `OPENAI_VISION_MODEL` (опционально)
   - `OPENAI_RECIPE_MODEL` (опционально)
4. Deploy.

После деплоя фронтенд и `api/*.ts` будут работать на одном домене.

## Подключение к Telegram Mini App

После получения production URL:

1. В BotFather:
   - `/mybots` → выберите бота → **Bot Settings** → **Menu Button** или **Mini App**.
2. Укажите HTTPS URL вашего деплоя Vercel.
3. Проверьте открытие Web App из Telegram клиента.
4. (Рекомендуется) добавить проверку `initData` на backend для production-безопасности.

## Важное

- Не храните ключи в клиентском коде.
- Не коммитьте `.env`.
- Если `OPENAI_API_KEY` не задан, API вернет ошибку 500 и приложение покажет пользовательское сообщение.
