from fastapi import APIRouter, Query
from db import Session, engine, select, update
from sqlalchemy import func
from database.operations import execute_statement, update_fields
from models.database import Users
from models.schemas import CreateUserRequest
import uuid
import bcrypt

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/changepassword/")
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

@router.get("/")
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

@router.get("/all/")
async def list_all_users(secret: str | None = None):
    """Returns all users and related info, discluding password"""
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
    return {"message": "Not found"}

@router.post("/create/")
async def create_user(request: CreateUserRequest):
    """Creates a new user in the Users table."""
    if not request.username or request.username.strip() == "":
        return {"success": False, "error": "Username is required"}
    
    if not request.password or request.password.strip() == "":
        return {"success": False, "error": "Password is required"}
    
    user_uuid = str(uuid.uuid4())
    hashed_pw = bcrypt.hashpw(request.password.encode("utf-8"), bcrypt.gensalt()).decode()
    
    with Session(engine) as session:
        stmt = select(Users).where(Users.Username == request.username)
        existing = session.exec(stmt).first()
        
        if existing:
            print(f"Already exists")
            return {
                "success": False,
                "error": "Username already exists",
            }
        
        new_user = Users(
            Uuid=user_uuid,
            Username=request.username,
            Password=hashed_pw,
            Email=request.email,
            phone=request.phone,
        )
        
        session.add(new_user)
        session.commit()
        session.refresh(new_user)
        
        print(f"User created: {new_user.Username}")
        return {
            "success": True,
            "user_id": new_user.Uuid,
            "username": new_user.Username,
            "email": new_user.Email,
            "phone": new_user.phone,
            "message": "Account created successfully"
        }

@router.post("/active")
async def get_active_users():
    """Returns active users. For messaging purposes"""
    try: 
        statement = select(Users.Username, Users.Uuid).where(Users.active)
        results = execute_statement(statement)

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
            "message": str(e)
        }
