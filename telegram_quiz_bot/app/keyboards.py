from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def q1_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Привлекать новых клиентов", callback_data="q1:clients")],
            [InlineKeyboardButton(text="Автоматизировать общение и заявки", callback_data="q1:automation")],
            [InlineKeyboardButton(text="Запустить полезный онлайн-инструмент", callback_data="q1:tool")],
            [InlineKeyboardButton(text="Понять, что мне вообще нужно", callback_data="q1:unclear")],
        ]
    )


def q2_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Быстрый запуск", callback_data="q2:speed")],
            [InlineKeyboardButton(text="Профессиональный имидж", callback_data="q2:image")],
            [InlineKeyboardButton(text="Экономия времени в рутине", callback_data="q2:time")],
            [InlineKeyboardButton(text="Проверить идею с минимальными рисками", callback_data="q2:validate")],
        ]
    )


def q3_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Есть только идея", callback_data="q3:idea")],
            [InlineKeyboardButton(text="Есть материалы (тексты/услуги/описание)", callback_data="q3:materials")],
            [InlineKeyboardButton(text="Есть активная аудитория в Telegram", callback_data="q3:tg_audience")],
            [InlineKeyboardButton(text="Есть запросы от клиентов, но всё хаотично", callback_data="q3:chaos")],
        ]
    )


def end_actions_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="Пройти заново", callback_data="action:restart")],
            [InlineKeyboardButton(text="Обсудить задачу", callback_data="action:consult")],
        ]
    )
