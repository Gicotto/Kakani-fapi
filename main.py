from fastapi import FastAPI, HTTPException, status, Query
from models import Users, Threads, Messages, ThreadParticipants, MessageAttachments
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import engine, Session, select, update
from sqlalchemy import func
from typing import Iterable, Mapping
import uuid
import bcrypt

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8001",
        "http://127.0.0.1:8000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginIn(BaseModel):
    username: str
    password: str

class SendMessageRequest(BaseModel):
    fromUser: str
    toUser: str
    message: str

@app.post("/login")
async def login(body: LoginIn):
    username = body.username
    password = body.password

    if not username or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credentials",
        )

    # Look up user by username
    with Session(engine) as session:
        stmt = select(Users).where(Users.Username == username)
        user = session.exec(stmt).first()

    # Username not found
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Check bcrypt hash
    is_valid = bcrypt.checkpw(
        password.encode("utf-8"),
        user.Password.encode("utf-8"),
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # At this point, user is authenticated
    return {
        "success": True,
        "message": f"User authenticated: {user.Username}",
        "user_id": user.Uuid,
        "username": user.Username,
        "email": user.Email,
    }

@app.get("/users/changepassword/")
async def change_password(username: str, password: str, new_password: str):
    print(f"Username: {username} | password: {password} | new_password {new_password}")
    if username is None or password is None or new_password is None:
        return {"message": "No user matched, unable to change password if no user found"}
   
    statement = select(Users).where(Users.Username == username).where(Users.Password == password)
    update_dict = {"Password": new_password}
    updated = update_fields(statement, update_dict)
    if updated <= 0:
        return {
            "message": f"Unable to change password",
            "success": False,
        }
    return {
        "message": f"Password updated successfully",
        "success": True,
    }


@app.get("/users/")
async def get_user(username: str | None = None):
    print(f"Username received: {username}")
    if username is None:
        return {"message": "Missing Info", "count": 0, "users": []}

    statement = select(Users).where(func.lower(Users.Username) == username.lower())
    results = execute_statement(statement)
    users_found_list = [u.Username for u in results]

    if not users_found_list:
        return {"message": "No Users found", "count": 0, "users": []}

    return {
        "message": f"User {username} exists: {', '.join(users_found_list)}",
        "count": len(users_found_list),
        "users": users_found_list,
    }

@app.get("/all-users/")
async def list_all_users(secret: str | None = None):
    """
    Returns all users and related info, discluding password
    """
    users_list = []

    if secret == 'SECRET':
        statement = select(Users)
        results = execute_statement(statement)
        users_list = [u.Username for u in results]
        passwords_list = [u.Password for u in results]

        return {
            "message": f"Found user(s): {', '.join(users_list)}",
            "count": len(users_list),
            "users": users_list,
            "passwords": passwords_list,
        }
    return {"message": "Not found",}

@app.get("/users/messages/")
async def list_message_threads(user_id: str | None = None):
    """
    Returns message threads, to display message previews for users.
    """
    
    if user_id is None:
        return {
            "success": False,
            "error": "Error: No User was passed in"
        }
    return
    statement = (
        select(Threads)
        .join(ThreadParticipants, ThreadParticipants.thread_id == Threads.id)
        .where(ThreadParticipants.user_uuid == user_uuid)
        .order_by(Threads.created_at.desc())
    )
    results = execute_statement(statement)
    print(f"Results: {results}")
    threads_list = [u.Threads.id for u in results]
    title_list = [u.Threads.title for u in results]

    # TODO add actual values
    return {
        "success": True,
        "count": len(threads_list),
        "threads": threads_list,
        "titles": title_list,
    }


@app.post("/getactiveusers/")
async def get_active_users():
    """
    Returns active users. For messaging purposes
    """
    try: 
        statement = select(Users.Username, Users.Uuid)
        results = execute_statement(statement)

        # print(f"Results of active users: {results}")

        # Build the list of active users
        users_list = []
        for username, uuid in results:
            users_list.append({
                "username": username,
                "uuid": uuid
            })

        return {
            "success": True,
            "active_users": users_list
        }
    except Exception as e:
        return {
            "success": False,
            "message": e
        }

@app.post("/users/create/")
async def create_user(
    username: str | None = None,
    password: str | None = None,
    email: str | None = None,
):
    """
    Creates a new user in the Users table.
    """

    # Validate inputs
    if username is None or username.strip() == "":
        return {"success": False, "error": "Username is required"}

    if password is None or password.strip() == "":
        return {"success": False, "error": "Password is required"}

    # Generate UUID for user
    user_uuid = str(uuid.uuid4())

    # Hash password (secure)
    hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode()

    with Session(engine) as session:

        # Check if username already exists
        stmt = select(Users).where(Users.Username == username)
        existing = session.exec(stmt).first()

        if existing:
            return {
                "success": False,
                "error": "Username already exists",
            }

        # Create user
        new_user = Users(
            Uuid=user_uuid,
            Username=username,
            Password=hashed_pw,
            Email=email,
        )

        session.add(new_user)
        session.commit()
        session.refresh(new_user)

        return {
            "success": True,
            "user_id": new_user.Uuid,
            "username": new_user.Username,
            "email": new_user.Email,
        }

@app.post("/messages/send")
async def send_message(request: SendMessageRequest):
    """
    Sends a message from one user to another.
    Creates or finds a thread between the two users, then adds the message.
    """
    sender_username = request.fromUser
    recipient_username = request.toUser
    body = request.message
    
    # Validate required fields
    if not sender_username:
        return {"success": False, "error": "No sender username provided"}
    if not recipient_username:
        return {"success": False, "error": "No recipient username provided"}
    if not body or body.strip() == "":
        return {"success": False, "error": "Message body is empty"}
    
    with Session(engine) as session:
        # 1) Get sender user
        sender_stmt = select(Users).where(Users.Username == sender_username)
        sender = session.exec(sender_stmt).first()
        if sender is None:
            return {"success": False, "error": f"Sender '{sender_username}' not found"}
        
        # 2) Get recipient user
        recipient_stmt = select(Users).where(Users.Username == recipient_username)
        recipient = session.exec(recipient_stmt).first()
        if recipient is None:
            return {"success": False, "error": f"Recipient '{recipient_username}' not found"}
        
        # 3) Find or create a thread between these two users
        # Check if a thread exists with both participants
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
        
        # If no thread exists, create one
        if thread is None:
            new_thread = Threads(
                is_group=False,
                title=None,
                created_by=sender.Uuid,
                # Add any thread properties your model requires
                # For example: name=f"{sender_username} & {recipient_username}"
            )
            session.add(new_thread)
            session.commit()
            session.refresh(new_thread)
            thread = new_thread
            
            # Add both users as participants
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
        
        # 4) Compute next message_index for this thread
        max_index_stmt = (
            select(Messages.message_index)
            .where(Messages.thread_id == thread.id)
            .order_by(Messages.message_index.desc())
            .limit(1)
        )
        current_max_index = session.exec(max_index_stmt).first()
        next_index = (current_max_index or 0) + 1
        
        # 5) Create the message
        new_message = Messages(
            thread_id=thread.id,
            sender_uuid=sender.Uuid,
            body=body,
            message_index=next_index,
        )
        session.add(new_message)
        session.commit()
        session.refresh(new_message)
        
        # 6) Update last_read_message_id for the sender
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

@app.get("/messages/thread")
async def get_messages_thread(
    user1: str = Query(..., description="Username of first user"),
    user2: str = Query(..., description="Username of second user")
):
    """
    Get all messages in the thread between two users.
    Returns messages ordered by message_index (oldest first).
    """
    with Session(engine) as session:
        # 1) Get both users
        user1_obj = session.exec(select(Users).where(Users.Username == user1)).first()
        user2_obj = session.exec(select(Users).where(Users.Username == user2)).first()
        
        if not user1_obj or not user2_obj:
            return {
                "success": False,
                "error": "One or both users not found",
                "messages": []
            }
        
        # 2) Find the thread between these two users
        # Get threads where both users are participants
        user1_threads = session.exec(
            select(ThreadParticipants.thread_id)
            .where(ThreadParticipants.user_uuid == user1_obj.Uuid)
        ).all()
        
        user2_threads = session.exec(
            select(ThreadParticipants.thread_id)
            .where(ThreadParticipants.user_uuid == user2_obj.Uuid)
        ).all()
        
        # Find common threads (threads where both are participants)
        common_thread_ids = set(user1_threads) & set(user2_threads)
        
        if not common_thread_ids:
            # No thread exists between these users yet
            return {
                "success": True,
                "messages": [],
                "thread_id": None
            }
        
        # 3) Get the direct message thread (is_group = False)
        thread = None
        for thread_id in common_thread_ids:
            potential_thread = session.get(Threads, thread_id)
            if potential_thread and not potential_thread.is_group:
                # Verify it's only these two users
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
        
        # 4) Get all messages in this thread
        messages_stmt = (
            select(Messages)
            .where(Messages.thread_id == thread.id)
            .order_by(Messages.message_index)  # Oldest first
        )
        messages = session.exec(messages_stmt).all()
        
        # 5) Format messages with sender info
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

@app.get("/messages/threads")
async def get_user_threads(
    username: str = Query(..., description="Username to get threads for")
):
    """
    Get all message threads (conversations) for a user.
    Returns threads with the other participant's info and the latest message.
    """
    with Session(engine) as session:
        # 1) Get the user
        user = session.exec(select(Users).where(Users.Username == username)).first()
        
        if not user:
            return {
                "success": False,
                "error": "User not found",
                "threads": []
            }
        
        # 2) Get all threads where this user is a participant
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
        
        # 3) For each thread, get the other participant and last message
        threads_data = []
        
        for thread_id in thread_ids:
            thread = session.get(Threads, thread_id)
            
            # Skip group threads (only show direct messages)
            if not thread or thread.is_group:
                continue
            
            # Get all participants in this thread
            participants = session.exec(
                select(ThreadParticipants)
                .where(ThreadParticipants.thread_id == thread_id)
            ).all()
            
            # Find the other participant (not the current user)
            other_participant_uuid = None
            for participant in participants:
                if participant.user_uuid != user.Uuid:
                    other_participant_uuid = participant.user_uuid
                    break
            
            if not other_participant_uuid:
                continue  # Skip if no other participant found
            
            # Get the other user's info
            other_user = session.get(Users, other_participant_uuid)
            if not other_user:
                continue
            
            # Get the last message in this thread
            last_message_stmt = (
                select(Messages)
                .where(Messages.thread_id == thread_id)
                .order_by(Messages.message_index.desc())
                .limit(1)
            )
            last_message = session.exec(last_message_stmt).first()
            
            if not last_message:
                continue  # Skip threads with no messages
            
            # Get unread count for current user
            # Find the user's participant record
            user_participant = None
            for participant in participants:
                if participant.user_uuid == user.Uuid:
                    user_participant = participant
                    break
            
            unread_count = 0
            if user_participant and user_participant.last_read_message_id:
                # Count messages after the last read message
                unread_stmt = (
                    select(func.count(Messages.id))
                    .where(
                        Messages.thread_id == thread_id,
                        Messages.id > user_participant.last_read_message_id,
                        Messages.sender_uuid != user.Uuid  # Don't count own messages
                    )
                )
                unread_count = session.exec(unread_stmt).first() or 0
            elif user_participant:
                # If no last_read_message_id, count all messages from others
                unread_stmt = (
                    select(func.count(Messages.id))
                    .where(
                        Messages.thread_id == thread_id,
                        Messages.sender_uuid != user.Uuid
                    )
                )
                unread_count = session.exec(unread_stmt).first() or 0
            
            # Add thread data
            threads_data.append({
                "thread_id": thread_id,
                "other_user_uuid": other_user.Uuid,
                "other_user_username": other_user.Username,
                "last_message": last_message.body,
                "last_message_time": last_message.created_at.isoformat() if hasattr(last_message.created_at, 'isoformat') else str(last_message.created_at),
                "unread_count": unread_count
            })
        
        # 4) Sort threads by last message time (most recent first)
        threads_data.sort(key=lambda x: x["last_message_time"], reverse=True)
        
        return {
            "success": True,
            "threads": threads_data
        }

def execute_statement(statement = None):
    """
    Helper Function
    Executes 'statement' and returns object
    """
    if statement is None:
        return

    with Session(engine) as session:
        results = session.exec(statement).all()
        return results

def update_fields(statement, fields_to_update: Mapping[str, object] | None = None) -> int:
    """
    Helper Function
    Executes `statement` (e.g., select(Model).where(...)) and updates the
    returned rows with the provided field values. Returns count updated.
    """
    if not fields_to_update:
        return 0

    updated = 0
    with Session(engine) as session:
        results = session.exec(statement).all()
        for row in results:
            for key, value in fields_to_update.items():
                setattr(row, key, value)
            session.add(row)
            updated += 1
        session.commit()
    return updated

