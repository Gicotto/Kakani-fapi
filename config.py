from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # CORS
    cors_origins: list[str] = [
        "http://localhost:8081",
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8000"
    ]
    
    # Security
    secret_key: str = "SECRET"  # Move to environment variable
    
    class Config:
        env_file = ".env"

settings = Settings()
