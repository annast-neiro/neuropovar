from aiogram.fsm.state import State, StatesGroup


class QuizStates(StatesGroup):
    q1_task = State()
    q2_priority = State()
    q3_assets = State()
