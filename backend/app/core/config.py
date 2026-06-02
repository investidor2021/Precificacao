from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    ENV: str = "development"
    PROJECT_NAME: str = "Precificacao API (Sheets)"
    
    # Google Sheets settings
    SPREADSHEET_NAME: str = "Precificacao_Marketplaces"
    SPREADSHEET_ID: Optional[str] = None
    GOOGLE_CREDENTIALS_FILE: str = "credentials.json"
    GOOGLE_CREDENTIALS_JSON: Optional[str] = None  # Raw JSON string for cloud environment deployment

    class Config:
        env_file = ".env"

settings = Settings()
