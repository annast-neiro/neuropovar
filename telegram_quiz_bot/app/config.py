from dataclasses import dataclass
import os

from dotenv import load_dotenv


@dataclass(frozen=True)
class Config:
    bot_token: str
    consultation_contact: str


def load_config() -> Config:
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN", "").strip()
    if not bot_token:
        raise RuntimeError("BOT_TOKEN is not set. Add it to .env file.")

    consultation_contact = os.getenv("CONSULTATION_CONTACT", "@your_username").strip()

    return Config(
        bot_token=bot_token,
        consultation_contact=consultation_contact,
    )
