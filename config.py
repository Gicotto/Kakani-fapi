from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # CORS
    cors_origins: list[str] = [
        "http://localhost:8081",
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8000"
    ]
    
    # Security
    secret_key: str = "SECRET"  # Move to environment variable
    # Application settings
    app_base_url: str = "https://localhost:8081/"

    # Twilio SMS settings
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = None

    # Email settings
    email_backend: str = "smtp"  # "smtp", "sendgrid", or "resend"
    email_from: str = "noreply@yourapp.com"
    email_from_name: str = "YourApp"

    # SMTP settings (if using email_backend="smtp")
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    envm: Optional[str] = None
    message_encryption_key: Optional[str] = None

    # SendGrid settings (if using email_backend="sendgrid")
    sendgrid_api_key: Optional[str] = None

    # Resend settings (if using email_backend="resend")
    resend_api_key: Optional[str] = None

    class Config:
        env_file = ".env"

settings = Settings()
