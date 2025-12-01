from fastapi import APIRouter, HTTPException, status
from models.schemas import LoginIn
from models.database import Users
from db import Session, engine, select
import bcrypt

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/login")
async def login(body: LoginIn):
    username = body.username
    password = body.password

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credentials",
        )

    with Session(engine) as session:
        stmt = select(Users).where(Users.Username == username)
        user = session.exec(stmt).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    is_valid = bcrypt.checkpw(
        password.encode("utf-8"),
        user.Password.encode("utf-8"),
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    return {
        "success": True,
        "message": f"User authenticated: {user.Username}",
        "user_id": user.Uuid,
        "username": user.Username,
        "email": user.Email,
        "phone": user.phone,  # Include phone in login response
    }
