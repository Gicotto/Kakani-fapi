from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginIn(BaseModel):
    username: str
    password: str

class SendMessageRequest(BaseModel):
    fromUser: str
    toUser: str
    message: str

class SendInviteRequest(BaseModel):
    fromUser: str
    toUser1: str
    toUser2: str
    message: str

class InviteLinkCreate(BaseModel):
    recipient1_username: Optional[str] = None
    recipient1_email: Optional[EmailStr] = None
    recipient1_phone: Optional[str] = None
    
    recipient2_username: Optional[str] = None
    recipient2_email: Optional[EmailStr] = None
    recipient2_phone: Optional[str] = None
    
    expires_in_hours: Optional[int] = 24  # Default 24 hours

class InviteLinkAccept(BaseModel):
    code: str
    recipient_number: int  # 1 or 2

class UserUpdate(BaseModel):
    active: Optional[bool] = None
    isAdmin: Optional[bool] = None

class ThreadVisibilityUpdate(BaseModel):
    thread_id: int
    visible: bool

class CreateUserRequest(BaseModel):
    username: str
    password: str
    email: Optional[str] = None
    phone: Optional[str] = None
