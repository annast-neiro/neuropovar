from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from app import keyboards, texts
from app.config import Config
from app.states import QuizStates

router = Router()


@router.callback_query(F.data == "action:restart")
async def restart_quiz(callback: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(QuizStates.q1_task)
    await state.set_data({})

    await callback.answer("Начинаем заново")
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(texts.RESTART_TEXT, reply_markup=keyboards.q1_keyboard())


@router.callback_query(F.data == "action:consult")
async def get_consultation(callback: CallbackQuery, config: Config) -> None:
    await callback.answer()
    await callback.message.answer(texts.CONSULTATION_TEMPLATE.format(contact=config.consultation_contact))


@router.callback_query()
async def fallback_callback(callback: CallbackQuery, state: FSMContext) -> None:
    await callback.answer()
    await state.clear()
    await callback.message.answer(texts.FALLBACK_TEXT)
