from fastapi import APIRouter, Query, HTTPException, status
from models.schemas import SendMessageRequest
from models.database import Users, Threads, Messages, ThreadParticipants
from db import Session, engine, select
from sqlalchemy import func
import os
import logging
import json
from config import settings

router = APIRouter(prefix="/messages", tags=["messages"])
logger = logging.getLogger(__name__)

# Optional encryption - won't break if not configured
ENCRYPTION_ENABLED = False if settings.envm == "DEV" else True
ENCRYPTION_KEY = settings.message_encryption_key

# Only enable encryption if key is set
if ENCRYPTION_ENABLED:
    try:
        from cryptography.fernet import Fernet
        import base64
        
        cipher = Fernet(ENCRYPTION_KEY.encode())
        logger.info("Message encryption ENABLED")
    except Exception as e:
        logger.warning(f"Encryption key set but initialization failed: {e}")
        logger.warning("Messages will be stored in PLAINTEXT")
else:
    logger.warning("MESSAGE_ENCRYPTION_KEY not set - messages will be stored in PLAINTEXT")
    logger.warning("For production, set MESSAGE_ENCRYPTION_KEY in your .env file")

def encrypt_message(plaintext: str) -> str:
    """Encrypt a message (only if encryption is enabled)"""
    if not ENCRYPTION_ENABLED:
        return plaintext
    
    try:
        encrypted = cipher.encrypt(plaintext.encode())
        return base64.urlsafe_b64encode(encrypted).decode()
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        # Fall back to plaintext if encryption fails
        return plaintext

def decrypt_message(text: str) -> str:
    """Decrypt a message (only if encryption is enabled)"""
    if not ENCRYPTION_ENABLED:
        return text
    
    try:
        # Check if it looks like encrypted data
        if not text.startswith("gAAAAA"):  # Fernet prefix
            return text  # Already plaintext
        
        decoded = base64.urlsafe_b64decode(text.encode())
        decrypted = cipher.decrypt(decoded)
        return decrypted.decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        # Return original if decryption fails (might be plaintext)
        return text

@router.post("/send")
async def send_message(request: SendMessageRequest):
    """
    Sends a message from one user to another.
    Creates or finds a thread between the two users, then adds the message.
    Messages are encrypted if MESSAGE_ENCRYPTION_KEY is set.
    """
    sender_username = request.fromUser
    recipient_username = request.toUser
    body = request.message
    
    if not sender_username:
        return {"success": False, "error": "No sender username provided"}
    if not recipient_username:
        return {"success": False, "error": "No recipient username provided"}
    if not body or body.strip() == "":
        return {"success": False, "error": "Message body is empty"}
    
    with Session(engine) as session:
        sender_stmt = select(Users).where(Users.Username == sender_username)
        sender = session.exec(sender_stmt).first()
        if sender is None:
            return {"success": False, "error": f"Sender '{sender_username}' not found"}
        
        recipient_stmt = select(Users).where(Users.Username == recipient_username)
        recipient = session.exec(recipient_stmt).first()
        if recipient is None:
            return {"success": False, "error": f"Recipient '{recipient_username}' not found"}
        
        existing_thread_stmt = (
            select(Threads)
            .join(ThreadParticipants, ThreadParticipants.thread_id == Threads.id)
            .where(ThreadParticipants.user_uuid == sender.Uuid)
            .where(
                Threads.id.in_(
                    select(ThreadParticipants.thread_id)
                    .where(ThreadParticipants.user_uuid == recipient.Uuid)
                )
            )
        )
        thread = session.exec(existing_thread_stmt).first()
        
        if thread is None:
            new_thread = Threads(
                is_group=False,
                title=None,
                created_by=sender.Uuid,
            )
            session.add(new_thread)
            session.commit()
            session.refresh(new_thread)
            thread = new_thread
            
            sender_participant = ThreadParticipants(
                thread_id=thread.id,
                user_uuid=sender.Uuid
            )
            recipient_participant = ThreadParticipants(
                thread_id=thread.id,
                user_uuid=recipient.Uuid
            )
            session.add(sender_participant)
            session.add(recipient_participant)
            session.commit()
        
        max_index_stmt = (
            select(Messages.message_index)
            .where(Messages.thread_id == thread.id)
            .order_by(Messages.message_index.desc())
            .limit(1)
        )
        current_max_index = session.exec(max_index_stmt).first()
        next_index = (current_max_index or 0) + 1
        
        # Encrypt the message (or store plaintext if encryption disabled)
        stored_body = encrypt_message(body)
        
        new_message = Messages(
            thread_id=thread.id,
            sender_uuid=sender.Uuid,
            body=stored_body,
            message_index=next_index,
        )
        session.add(new_message)
        session.commit()
        session.refresh(new_message)
        
        sender_participation_stmt = (
            select(ThreadParticipants)
            .where(
                ThreadParticipants.thread_id == thread.id,
                ThreadParticipants.user_uuid == sender.Uuid,
            )
        )
        sender_participant = session.exec(sender_participation_stmt).first()
        if sender_participant:
            sender_participant.last_read_message_id = new_message.id
            session.add(sender_participant)
            session.commit()
        
        return {
            "success": True,
            "message": "Message sent successfully",
            "data": {
                "message_id": new_message.id,
                "thread_id": thread.id,
                "sender_uuid": sender.Uuid,
                "recipient_uuid": recipient.Uuid,
                "body": body,  # Return original plaintext
                "message_index": new_message.message_index,
                "created_at": new_message.created_at,
                "encrypted": ENCRYPTION_ENABLED,  # Tell client if encrypted
            }
        }

@router.get("/thread")
async def get_messages_thread(
    user1: str = Query(..., description="Username of first user"),
    user2: str = Query(..., description="Username of second user"),
    requesting_user_uuid: str = Query(None, description="UUID of user requesting messages (for filtering deleted)")
):
    """Get all messages in the thread between two users, filtered by soft deletes."""
    with Session(engine) as session:
        user1_obj = session.exec(select(Users).where(Users.Username == user1)).first()
        user2_obj = session.exec(select(Users).where(Users.Username == user2)).first()

        if not user1_obj or not user2_obj:
            return {
                "success": False,
                "error": "One or both users not found",
                "messages": []
            }
        
        user1_threads = session.exec(
            select(ThreadParticipants.thread_id)
            .where(ThreadParticipants.user_uuid == user1_obj.Uuid)
        ).all()
        
        user2_threads = session.exec(
            select(ThreadParticipants.thread_id)
            .where(ThreadParticipants.user_uuid == user2_obj.Uuid)
        ).all()
        
        common_thread_ids = set(user1_threads) & set(user2_threads)
        
        if not common_thread_ids:
            return {
                "success": True,
                "messages": [],
                "thread_id": None
            }
        
        thread = None
        for thread_id in common_thread_ids:
            potential_thread = session.get(Threads, thread_id)
            if potential_thread and not potential_thread.is_group:
                participants = session.exec(
                    select(ThreadParticipants)
                    .where(ThreadParticipants.thread_id == thread_id)
                ).all()
                if len(participants) == 2:
                    thread = potential_thread
                    break
        
        if not thread:
            return {
                "success": True,
                "messages": [],
                "thread_id": None
            }
        
        messages_stmt = (
            select(Messages)
            .where(Messages.thread_id == thread.id)
            .order_by(Messages.message_index)
        )
        messages = session.exec(messages_stmt).all()

        formatted_messages = []
        for msg in messages:
            # Filter out messages deleted by the requesting user
            if requesting_user_uuid:
                try:
                    deleted_for_users = json.loads(msg.deleted_for_users)
                    if requesting_user_uuid in deleted_for_users:
                        continue  # Skip this message for this user
                except (json.JSONDecodeError, TypeError):
                    pass  # If parsing fails, show the message

            sender = session.get(Users, msg.sender_uuid)

            # Decrypt message (or return plaintext if encryption disabled)
            decrypted_body = decrypt_message(msg.body)

            formatted_messages.append({
                "id": msg.id,
                "thread_id": msg.thread_id,
                "sender_uuid": msg.sender_uuid,
                "sender_username": sender.Username if sender else "Unknown",
                "body": decrypted_body,
                "message_index": msg.message_index,
                "created_at": msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else str(msg.created_at),
            })
        
        return {
            "success": True,
            "thread_id": thread.id,
            "messages": formatted_messages,
            "encrypted": ENCRYPTION_ENABLED,  # Tell client if encrypted
        }

@router.get("/threads")
async def get_user_threads(
    username: str = Query(..., description="Username to get threads for")
):
    """Get all message threads (conversations) for a user."""
    with Session(engine) as session:
        user = session.exec(select(Users).where(Users.Username == username)).first()
        
        if not user:
            return {
                "success": False,
                "error": "User not found",
                "threads": []
            }
        
        user_threads_stmt = (
            select(ThreadParticipants.thread_id)
            .where(ThreadParticipants.user_uuid == user.Uuid)
        )
        thread_ids = session.exec(user_threads_stmt).all()
        
        if not thread_ids:
            return {
                "success": True,
                "threads": []
            }
        
        threads_data = []
        
        for thread_id in thread_ids:
            thread = session.get(Threads, thread_id)

            if not thread or thread.is_group:
                continue

            # Filter out threads hidden by this user
            try:
                hidden_for_users = json.loads(thread.hidden_for_users)
                if user.Uuid in hidden_for_users:
                    continue  # Skip this thread for this user
            except (json.JSONDecodeError, TypeError):
                pass  # If parsing fails, show the thread
            
            participants = session.exec(
                select(ThreadParticipants)
                .where(ThreadParticipants.thread_id == thread_id)
            ).all()
            
            other_participant_uuid = None
            for participant in participants:
                if participant.user_uuid != user.Uuid:
                    other_participant_uuid = participant.user_uuid
                    break
            
            if not other_participant_uuid:
                continue
            
            other_user = session.get(Users, other_participant_uuid)
            if not other_user:
                continue
            
            last_message_stmt = (
                select(Messages)
                .where(Messages.thread_id == thread_id)
                .order_by(Messages.message_index.desc())
                .limit(1)
            )
            last_message = session.exec(last_message_stmt).first()
            
            if not last_message:
                continue
            
            # Decrypt last message preview
            decrypted_preview = decrypt_message(last_message.body)
            # Truncate preview if too long
            if len(decrypted_preview) > 50:
                decrypted_preview = decrypted_preview[:50] + "..."
            
            user_participant = None
            for participant in participants:
                if participant.user_uuid == user.Uuid:
                    user_participant = participant
                    break
            
            unread_count = 0
            if user_participant and user_participant.last_read_message_id:
                unread_stmt = (
                    select(func.count(Messages.id))
                    .where(
                        Messages.thread_id == thread_id,
                        Messages.id > user_participant.last_read_message_id,
                        Messages.sender_uuid != user.Uuid
                    )
                )
                unread_count = session.exec(unread_stmt).first() or 0
            elif user_participant:
                unread_stmt = (
                    select(func.count(Messages.id))
                    .where(
                        Messages.thread_id == thread_id,
                        Messages.sender_uuid != user.Uuid
                    )
                )
                unread_count = session.exec(unread_stmt).first() or 0
            
            threads_data.append({
                "thread_id": thread_id,
                "other_user_uuid": other_user.Uuid,
                "other_user_username": other_user.Username,
                "last_message": decrypted_preview,
                "last_message_time": last_message.created_at.isoformat() if hasattr(last_message.created_at, 'isoformat') else str(last_message.created_at),
                "unread_count": unread_count
            })
        
        threads_data.sort(key=lambda x: x["last_message_time"], reverse=True)

        return {
            "success": True,
            "threads": threads_data,
            "encrypted": ENCRYPTION_ENABLED,  # Tell client if encrypted
        }


@router.delete("/message/{message_id}")
async def delete_message(
    message_id: int,
    user_uuid: str = Query(..., description="UUID of user deleting the message")
):
    """
    Soft delete a message for a specific user.
    The message will be hidden from this user but still visible to others.
    """
    with Session(engine) as session:
        # Get the message
        message = session.get(Messages, message_id)
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )

        # Parse the deleted_for_users JSON
        try:
            deleted_for_users = json.loads(message.deleted_for_users)
        except (json.JSONDecodeError, TypeError):
            deleted_for_users = []

        # Add user to deleted list if not already there
        if user_uuid not in deleted_for_users:
            deleted_for_users.append(user_uuid)
            message.deleted_for_users = json.dumps(deleted_for_users)
            session.add(message)
            session.commit()

        return {
            "success": True,
            "message": "Message deleted successfully"
        }


@router.delete("/thread/{thread_id}")
async def hide_thread(
    thread_id: int,
    user_uuid: str = Query(..., description="UUID of user hiding the thread")
):
    """
    Hide a thread for a specific user.
    The thread will be hidden from this user's thread list but still visible to others.
    """
    with Session(engine) as session:
        # Get the thread
        thread = session.get(Threads, thread_id)
        if not thread:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Thread not found"
            )

        # Verify user is a participant
        participant = session.exec(
            select(ThreadParticipants).where(
                ThreadParticipants.thread_id == thread_id,
                ThreadParticipants.user_uuid == user_uuid
            )
        ).first()

        if not participant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not a participant in this thread"
            )

        # Parse the hidden_for_users JSON
        try:
            hidden_for_users = json.loads(thread.hidden_for_users)
        except (json.JSONDecodeError, TypeError):
            hidden_for_users = []

        # Add user to hidden list if not already there
        if user_uuid not in hidden_for_users:
            hidden_for_users.append(user_uuid)
            thread.hidden_for_users = json.dumps(hidden_for_users)
            session.add(thread)
            session.commit()

        return {
            "success": True,
            "message": "Thread hidden successfully"
        }