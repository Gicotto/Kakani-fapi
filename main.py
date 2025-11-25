from fastapi import FastAPI, HTTPException, status
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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class LoginIn(BaseModel):
    username: str
    password: str

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

@app.post("/users/messages/send/")
async def send_message(
    thread_id: int | None = None,
    sender_uuid: str | None = None,
    body: str | None = None,
):
    """
    Sends a message in a thread.
    """

    # Validate required fields
    if thread_id is None:
        return {"success": False, "error": "No thread_id provided"}

    if sender_uuid is None:
        return {"success": False, "error": "No sender_uuid provided"}

    if body is None or body.strip() == "":
        return {"success": False, "error": "Message body is empty"}

    with Session(engine) as session:
        # 1) Confirm thread exists
        thread_stmt = select(Threads).where(Threads.id == thread_id)
        thread = session.exec(thread_stmt).first()

        if thread is None:
            return {"success": False, "error": "Thread does not exist"}

        # 2) Confirm user is in this thread
        participation_stmt = (
            select(ThreadParticipants)
            .where(
                ThreadParticipants.thread_id == thread_id,
                ThreadParticipants.user_uuid == sender_uuid,
            )
        )
        participant = session.exec(participation_stmt).first()

        if participant is None:
            return {"success": False, "error": "User is not part of this thread"}

        # 3) Compute next message_index for this thread
        max_index_stmt = (
            select(Messages.message_index)
            .where(Messages.thread_id == thread_id)
            .order_by(Messages.message_index.desc())
            .limit(1)
        )
        current_max_index = session.exec(max_index_stmt).first()
        next_index = (current_max_index or 0) + 1

        # 4) Create the message
        new_message = Messages(
            thread_id=thread_id,
            sender_uuid=sender_uuid,
            body=body,
            message_index=next_index,
        )

        session.add(new_message)
        session.commit()
        session.refresh(new_message)

        # 5) Update last_read_message_id for the sender
        participant.last_read_message_id = new_message.id
        session.add(participant)
        session.commit()
        session.refresh(participant)

        return {
            "success": True,
            "message_id": new_message.id,
            "thread_id": thread_id,
            "sender_uuid": sender_uuid,
            "body": body,
            "message_index": new_message.message_index,
            "created_at": new_message.created_at,
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

