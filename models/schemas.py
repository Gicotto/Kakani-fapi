from pydantic import BaseModel
from pydantic import BaseModel, Field, field_validator
from typing import Optional
import re

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

class ChangePasswordRequest(BaseModel):
    username: str
    current_password: str
    new_password: str

class InviteLinkCreate(BaseModel):
    """Schema for creating a new invite link"""
    recipient1_username: Optional[str] = None
    recipient1_email: Optional[str] = None
    recipient1_phone: Optional[str] = None
    recipient2_username: Optional[str] = None
    recipient2_email: Optional[str] = None
    recipient2_phone: Optional[str] = None
    expires_in_hours: Optional[int] = Field(default=24, ge=1, le=720)  # 1 hour to 30 days
    
    @field_validator('recipient1_email', 'recipient2_email')
    @classmethod
    def validate_email(cls, v):
        if v is not None and v.strip():
            # Basic email validation
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError('Invalid email format')
        return v
    
    @field_validator('recipient1_phone', 'recipient2_phone')
    @classmethod
    def validate_phone(cls, v):
        if v is not None and v.strip():
            # Remove common formatting
            cleaned = re.sub(r'[\s\-\(\)\.]', '', v)
            # Check if it's a valid phone number (E.164 format)
            phone_regex = r'^\+?[1-9]\d{9,14}$'
            if not re.match(phone_regex, cleaned):
                raise ValueError('Invalid phone number format. Use E.164 format (e.g., +1234567890)')
            # Auto-add + if missing
            if not v.startswith('+'):
                v = '+' + cleaned
        return v


class InviteLinkAccept(BaseModel):
    """Schema for accepting an invite link"""
    code: str = Field(..., min_length=6, max_length=12)
    recipient_number: int = Field(..., ge=1, le=2)
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        # Code should be alphanumeric
        if not v.isalnum():
            raise ValueError('Invite code must be alphanumeric')
        return v.upper()


class InviteLinkResponse(BaseModel):
    """Response schema for invite link creation"""
    success: bool
    invite_code: str
    expires_at: Optional[str]
    notifications: dict


class InviteStatusResponse(BaseModel):
    """Response schema for checking invite status"""
    success: bool
    code: str
    recipient1_accepted: bool
    recipient2_accepted: bool
    thread_created: bool
    thread_id: Optional[int]
    expires_at: Optional[str]


class InviteAcceptResponse(BaseModel):
    """Response schema for accepting an invite"""
    success: bool
    message: str
    both_accepted: Optional[bool] = None
    thread_id: Optional[int] = None
    notification_sent: Optional[bool] = None


class InviteResendResponse(BaseModel):
    """Response schema for resending invite"""
    success: bool
    message: str
    error: Optional[str] = None
