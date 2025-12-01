from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Column, String
from sqlmodel import SQLModel, Field


# ---------- Users (existing table) ----------

class Users(SQLModel, table=True):
    __tablename__ = "Users"

    Uuid: str = Field(primary_key=True, index=True)
    Username: str = Field(index=True, unique=True)
    Password: str
    Email: Optional[str] = None


# ---------- Threads ----------

class Threads(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    is_group: bool = Field(default=False)
    title: Optional[str] = None

    # FK to Users.Uuid
    created_by: str = Field(foreign_key="Users.Uuid")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------- Messages ----------

class Messages(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    thread_id: int = Field(foreign_key="threads.id")
    sender_uuid: str = Field(foreign_key="Users.Uuid")

    body: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    message_index: Optional[int] = None

    reply_to_message_id: Optional[int] = Field(
        default=None, foreign_key="messages.id"
    )

    is_deleted: bool = Field(default=False)


# ---------- MessageAttachments ----------

class MessageAttachments(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)

    message_id: int = Field(foreign_key="messages.id")

    url: str
    mime_type: Optional[str] = None
    size_bytes: Optional[int] = None

    # underlying DB column is named "metadata"
    metadata_json: Optional[str] = Field(
        default=None,
        sa_column=Column("metadata", String),
    )


# ---------- ThreadParticipants (join table) ----------

class ThreadParticipants(SQLModel, table=True):
    thread_id: int = Field(foreign_key="threads.id", primary_key=True)
    user_uuid: str = Field(foreign_key="Users.Uuid", primary_key=True)

    joined_at: datetime = Field(default_factory=datetime.utcnow)
    last_read_message_id: Optional[int] = Field(
        default=None, foreign_key="messages.id"
    )
