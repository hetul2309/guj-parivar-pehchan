import os
from pathlib import Path
from dotenv import load_dotenv

root_dir = Path(__file__).resolve().parent.parent.parent
env_path = root_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./family_id.db")
JWT_SECRET = os.getenv("JWT_SECRET", "demo_secret_key_for_gujarat_family_id_platform_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 60 * 24  # 24 hours for demo

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
