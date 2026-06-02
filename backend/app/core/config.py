from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/pricing_db"
    ENV: str = "development"
    PROJECT_NAME: str = "Precificacao API"

    class Config:
        env_file = ".env"

settings = Settings()
