from fastapi import APIRouter, Query, HTTPException
from db import Session, engine, select, update
from sqlalchemy import func
from database.operations import execute_statement, update_fields
from models.database import Users
from models.schemas import CreateUserRequest, ChangePasswordRequest
import uuid
import bcrypt

router = APIRouter(prefix="/users", tags=["users"])

@router.post("/changepassword/")
async def change_password(request: ChangePasswordRequest):
    """Change user password with bcrypt encryption"""
    print(f"=== CHANGE PASSWORD REQUEST ===")
    print(f"Username: {request.username}")
    
    if not request.username or not request.current_password or not request.new_password:
        return {
            "success": False,
            "error": "All fields are required"
        }
    
    # Validate new password strength (optional but recommended)
    if len(request.new_password) < 6:
        return {
            "success": False,
            "error": "New password must be at least 6 characters long"
        }
    
    with Session(engine) as session:
        # Get user by username
        stmt = select(Users).where(Users.Username == request.username)
        user = session.exec(stmt).first()
        
        if not user:
            print("User not found")
            return {
                "success": False,
                "error": "Invalid credentials"
            }
        
        # Verify current password with bcrypt
        try:
            is_valid = bcrypt.checkpw(
                request.current_password.encode("utf-8"),
                user.Password.encode("utf-8")
            )
            print(f"Current password valid: {is_valid}")
        except Exception as e:
            print(f"Error checking password: {e}")
            return {
                "success": False,
                "error": "Password verification failed"
            }
        
        if not is_valid:
            print("Current password incorrect")
            return {
                "success": False,
                "error": "Current password is incorrect"
            }
        
        # Hash the new password
        hashed_new_pw = bcrypt.hashpw(
            request.new_password.encode("utf-8"), 
            bcrypt.gensalt()
        ).decode()
        print(f"New password hashed: {hashed_new_pw[:20]}...")
        
        # Update password
        user.Password = hashed_new_pw
        session.add(user)
        session.commit()
        
        print(f"✓ Password updated successfully for {user.Username}")
        return {
            "success": True,
            "message": "Password updated successfully"
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

@router.get("/details")
async def get_user_details(username: str):
    """Get detailed user information by username"""
    if not username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is required"
        )
    
    with Session(engine) as session:
        stmt = select(Users).where(Users.Username == username)
        user = session.exec(stmt).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "success": True,
            "user_id": user.Uuid,
            "username": user.Username,
            "email": user.Email,
            "phone": user.phone,
            "active": bool(user.active),
            "isAdmin": bool(user.isAdmin),
            "last_logged_in_at": user.last_logged_in_at,
        }
