# Telegram Quiz Bot (aiogram 3.x)

Минимальный Telegram-бот-квиз на Python.
Бот задаёт 3 вопроса, сохраняет ответы в памяти и выдаёт одну итоговую рекомендацию:
- Сайт-визитка
- Telegram-бот
- Мини-сервис
- Консультация

## Что реализовано

- Команда `/start`
- Приветствие и запуск квиза
- 3 вопроса с inline-кнопками
- Хранение ответов пользователя в `MemoryStorage` (без БД)
- Простая rule-based логика рекомендаций
- Финальные действия:
  - `Пройти заново`
  - `Обсудить задачу`
- Fallback-сообщение при некорректном callback/состоянии

## Зависимости

- Python 3.10+
- `aiogram==3.22.0`
- `python-dotenv==1.1.1`

## Куда вставить токен

1. Скопируйте файл окружения:

```bash
cp .env.example .env
```

2. Откройте `.env` и укажите:

```env
BOT_TOKEN=ваш_токен_бота
CONSULTATION_CONTACT=@your_username
```

- `BOT_TOKEN` — токен Telegram-бота из BotFather.
- `CONSULTATION_CONTACT` — контакт для кнопки «Обсудить задачу».

## Как запустить

```bash
cd telegram_quiz_bot
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m app.main
```

## Структура проекта

```txt
app/
  main.py          # Точка входа
  config.py        # Загрузка .env
  texts.py         # Тексты сообщений
  keyboards.py     # Inline-кнопки
  states.py        # FSM-состояния
  logic.py         # Правила рекомендаций
  handlers/
    start.py       # /start
    quiz.py        # 3 шага квиза
    actions.py     # Финальные кнопки
```

## Возможные следующие улучшения

- Добавить автотесты для `build_recommendation`.
- Добавить локализацию (RU/EN).
- Логировать ключевые события (start, завершение квиза, restart).
- Добавить ограничение на «двойные клики» по кнопкам.
- При необходимости перейти с `MemoryStorage` на Redis для продакшена.
