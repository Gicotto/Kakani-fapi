from fastapi import APIRouter, Query
from models.schemas import SendMessageRequest
from models.database import Users, Threads, Messages, ThreadParticipants
from db import Session, engine, select
from sqlalchemy import func

router = APIRouter(prefix="/messages", tags=["messages"])

@router.post("/send")
async def send_message(request: SendMessageRequest):
    """
    Sends a message from one user to another.
    Creates or finds a thread between the two users, then adds the message.
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
        
        new_message = Messages(
            thread_id=thread.id,
            sender_uuid=sender.Uuid,
            body=body,
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
                "body": body,
                "message_index": new_message.message_index,
                "created_at": new_message.created_at,
            }
        }

@router.get("/thread")
async def get_messages_thread(
    user1: str = Query(..., description="Username of first user"),
    user2: str = Query(..., description="Username of second user")
):
    """Get all messages in the thread between two users."""
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
            sender = session.get(Users, msg.sender_uuid)
            formatted_messages.append({
                "id": msg.id,
                "thread_id": msg.thread_id,
                "sender_uuid": msg.sender_uuid,
                "sender_username": sender.Username if sender else "Unknown",
                "body": msg.body,
                "message_index": msg.message_index,
                "created_at": msg.created_at.isoformat() if hasattr(msg.created_at, 'isoformat') else str(msg.created_at),
            })
        
        return {
            "success": True,
            "thread_id": thread.id,
            "messages": formatted_messages
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
                "last_message": last_message.body,
                "last_message_time": last_message.created_at.isoformat() if hasattr(last_message.created_at, 'isoformat') else str(last_message.created_at),
                "unread_count": unread_count
            })
        
        threads_data.sort(key=lambda x: x["last_message_time"], reverse=True)
        
        return {
            "success": True,
            "threads": threads_data
        }
