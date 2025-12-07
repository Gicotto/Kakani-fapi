from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime

# Use TYPE_CHECKING to avoid circular imports
if TYPE_CHECKING:
    from typing import List

class Users(SQLModel, table=True):
    __tablename__ = "Users"
    
    Uuid: str = Field(primary_key=True)
    Username: str = Field(unique=True, index=True)
    Password: str
    Email: Optional[str] = None
    phone: Optional[str] = Field(default=None, index=True)  # New field
    active: int = Field(default=1)  # 0=inactive, 1=active
    isAdmin: int = Field(default=0)  # 0=regular user, 1=admin
    last_logged_in_at: Optional[str] = None
    
    # Relationships - SQLModel style (no Mapped needed)
    threads_created: List["Threads"] = Relationship(back_populates="creator")
    messages: List["Messages"] = Relationship(back_populates="sender")
    thread_participations: List["ThreadParticipants"] = Relationship(back_populates="user")
    invites_created: List["InviteLinks"] = Relationship(back_populates="creator")


class Threads(SQLModel, table=True):
    __tablename__ = "threads"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    is_group: int = Field(default=0)  # 0=DM, 1=group
    title: Optional[str] = None
    created_by: str = Field(foreign_key="Users.Uuid")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    
    # Relationships
    creator: Optional["Users"] = Relationship(back_populates="threads_created")
    messages: List["Messages"] = Relationship(back_populates="thread")
    participants: List["ThreadParticipants"] = Relationship(back_populates="thread")
    invite_link: Optional["InviteLinks"] = Relationship(back_populates="thread")


class Messages(SQLModel, table=True):
    __tablename__ = "messages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    thread_id: int = Field(foreign_key="threads.id", index=True)
    sender_uuid: str = Field(foreign_key="Users.Uuid")
    body: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), index=True)
    message_index: Optional[int] = None
    reply_to_message_id: Optional[int] = Field(default=None, foreign_key="messages.id")
    is_deleted: int = Field(default=0)  # 0=false, 1=true
    
    # Relationships
    thread: Optional["Threads"] = Relationship(back_populates="messages")
    sender: Optional["Users"] = Relationship(back_populates="messages")
    attachments: List["MessageAttachments"] = Relationship(back_populates="message")


class ThreadParticipants(SQLModel, table=True):
    __tablename__ = "thread_participants"
    
    thread_id: int = Field(foreign_key="threads.id", primary_key=True)
    user_uuid: str = Field(foreign_key="Users.Uuid", primary_key=True)
    joined_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    last_read_message_id: Optional[int] = Field(default=None, foreign_key="messages.id")
    visible: int = Field(default=1)  # 0=hidden, 1=visible
    
    # Relationships
    thread: Optional["Threads"] = Relationship(back_populates="participants")
    user: Optional["Users"] = Relationship(back_populates="thread_participations")


class MessageAttachments(SQLModel, table=True):
    __tablename__ = "message_attachments"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="messages.id", index=True)
    url: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None
    metadata_json: Optional[str] = Field(default=None, sa_column_kwargs={"name": "metadata"})
    
    # Relationships
    message: Optional["Messages"] = Relationship(back_populates="attachments")


class InviteLinks(SQLModel, table=True):
    __tablename__ = "invite_links"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    
    # Recipient 1
    recipient1_username: Optional[str] = None
    recipient1_email: Optional[str] = Field(default=None, index=True)
    recipient1_phone: Optional[str] = None
    recipient1_accepted: int = Field(default=0)  # 0=not accepted, 1=accepted
    
    # Recipient 2
    recipient2_username: Optional[str] = None
    recipient2_email: Optional[str] = Field(default=None, index=True)
    recipient2_phone: Optional[str] = None
    recipient2_accepted: int = Field(default=0)  # 0=not accepted, 1=accepted
    
    # Thread association
    thread_id: Optional[int] = Field(default=None, foreign_key="threads.id")
    
    # Metadata
    created_by: str = Field(foreign_key="Users.Uuid")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    expires_at: Optional[str] = None
    
    # Relationships
    thread: Optional["Threads"] = Relationship(back_populates="invite_link")
    creator: Optional["Users"] = Relationship(back_populates="invites_created")

class FriendRequest(SQLModel, table=True):
    __tablename__ = "friend_requests"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    requester_uuid: str = Field(foreign_key="Users.Uuid")
    recipient_uuid: str = Field(foreign_key="Users.Uuid")
    status: str = Field(default="pending")  # 'pending', 'accepted', 'rejected'
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    responded_at: Optional[str] = None

class Notification(SQLModel, table=True):
    __tablename__ = "notifications"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_uuid: str = Field(foreign_key="Users.Uuid")
    type: str  # 'friend_request', 'friend_accepted', 'message', 'invite', 'system'
    from_user_uuid: Optional[str] = Field(default=None, foreign_key="Users.Uuid")
    related_id: Optional[int] = None
    title: str
    message: str
    is_read: int = Field(default=0)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    action_url: Optional[str] = None
