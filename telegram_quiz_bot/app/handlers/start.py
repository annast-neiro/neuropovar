from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import Message

from app import keyboards, texts
from app.states import QuizStates

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(QuizStates.q1_task)
    await message.answer(texts.WELCOME_TEXT)
    await message.answer(texts.Q1_TEXT, reply_markup=keyboards.q1_keyboard())
