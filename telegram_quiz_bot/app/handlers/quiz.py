from aiogram import F, Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery

from app import keyboards, texts
from app.logic import build_recommendation
from app.states import QuizStates

router = Router()


def _extract_answer(data: str, prefix: str) -> str | None:
    marker = f"{prefix}:"
    if not data or not data.startswith(marker):
        return None
    return data.split(":", 1)[1] or None


@router.callback_query(QuizStates.q1_task, F.data.startswith("q1:"))
async def process_q1(callback: CallbackQuery, state: FSMContext) -> None:
    answer = _extract_answer(callback.data, "q1")
    if not answer:
        await callback.answer()
        await callback.message.answer(texts.FALLBACK_TEXT)
        return

    # Новый проход квиза всегда начинаем с чистых данных.
    await state.set_data({"q1": answer})
    await state.set_state(QuizStates.q2_priority)

    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(texts.Q2_TEXT, reply_markup=keyboards.q2_keyboard())


@router.callback_query(QuizStates.q2_priority, F.data.startswith("q2:"))
async def process_q2(callback: CallbackQuery, state: FSMContext) -> None:
    answer = _extract_answer(callback.data, "q2")
    if not answer:
        await callback.answer()
        await callback.message.answer(texts.FALLBACK_TEXT)
        return

    await state.update_data(q2=answer)
    await state.set_state(QuizStates.q3_assets)

    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(texts.Q3_TEXT, reply_markup=keyboards.q3_keyboard())


@router.callback_query(QuizStates.q3_assets, F.data.startswith("q3:"))
async def process_q3(callback: CallbackQuery, state: FSMContext) -> None:
    answer = _extract_answer(callback.data, "q3")
    if not answer:
        await callback.answer()
        await callback.message.answer(texts.FALLBACK_TEXT)
        return

    await state.update_data(q3=answer)

    data = await state.get_data()
    q1, q2, q3 = data.get("q1"), data.get("q2"), data.get("q3")
    if not (q1 and q2 and q3):
        await callback.answer()
        await callback.message.answer(texts.FALLBACK_TEXT)
        await state.clear()
        return

    recommendation = build_recommendation(q1, q2, q3)

    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer(
        texts.RESULT_TEMPLATE.format(
            solution=recommendation.solution,
            why=recommendation.why,
            next_step=recommendation.next_step,
        ),
        reply_markup=keyboards.end_actions_keyboard(),
    )
    await callback.message.answer(texts.END_ACTION_TEXT)
