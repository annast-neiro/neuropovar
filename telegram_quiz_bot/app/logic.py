from dataclasses import dataclass


@dataclass(frozen=True)
class Recommendation:
    solution: str
    why: str
    next_step: str


def build_recommendation(q1: str, q2: str, q3: str) -> Recommendation:
    """Apply simple top-down rules. First match wins."""
    if q1 == "unclear":
        return Recommendation(
            solution="Консультация",
            why="Пока не хватает ясности по формату, и это нормально на старте.",
            next_step="Коротко созвонимся и определим самый простой первый шаг.",
        )

    if q2 == "validate" and q3 == "idea":
        return Recommendation(
            solution="Консультация",
            why="Есть идея, но пока мало вводных для уверенного запуска.",
            next_step="Уточним гипотезу и соберем понятный план на ближайшие шаги.",
        )

    if q1 == "automation":
        return Recommendation(
            solution="Telegram-бот",
            why="Вам важно автоматизировать общение и заявки — бот это закрывает лучше всего.",
            next_step="Выделите 3 частых сценария и сделайте первую версию бота.",
        )

    if q2 == "time" and q3 in {"tg_audience", "chaos"}:
        return Recommendation(
            solution="Telegram-бот",
            why="Есть повторяющиеся обращения, и бот поможет снять рутину.",
            next_step="Соберите простой сценарий: приветствие, FAQ и сбор заявки.",
        )

    if q1 == "tool":
        return Recommendation(
            solution="Мини-сервис",
            why="Вам нужен рабочий инструмент с конкретной полезной функцией.",
            next_step="Опишите одну ключевую функцию и запустите мини-MVP.",
        )

    if q2 == "validate" and q3 != "idea":
        return Recommendation(
            solution="Мини-сервис",
            why="У вас уже есть база, поэтому можно быстро проверить идею на практике.",
            next_step="Выберите метрику успеха и запустите пилотную версию.",
        )

    if q1 == "clients" and q2 == "image":
        return Recommendation(
            solution="Сайт-визитка",
            why="Нужно понятно показать себя и услуги — сайт-визитка подойдет лучше всего.",
            next_step="Соберите страницу: о вас, услуги, примеры и контакты.",
        )

    if q1 == "clients" and q3 == "materials":
        return Recommendation(
            solution="Сайт-визитка",
            why="Материалы уже есть, значит можно быстро запустить аккуратную витрину услуг.",
            next_step="Подготовьте тексты и опубликуйте первую версию страницы.",
        )

    return Recommendation(
        solution="Консультация",
        why="Чтобы не ошибиться со стартом, лучше сначала уточнить фокус задачи.",
        next_step="На коротком созвоне выберем самый рациональный формат запуска.",
    )
