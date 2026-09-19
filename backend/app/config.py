import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
    EXTENSION_ORIGIN: str = os.getenv("EXTENSION_ORIGIN", "*")
    PORT: int = int(os.getenv("PORT", "8000"))

settings = Settings()
