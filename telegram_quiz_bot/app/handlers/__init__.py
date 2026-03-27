from aiogram import Dispatcher

from .actions import router as actions_router
from .quiz import router as quiz_router
from .start import router as start_router


def setup_routers(dp: Dispatcher) -> None:
    dp.include_router(start_router)
    dp.include_router(quiz_router)
    dp.include_router(actions_router)
