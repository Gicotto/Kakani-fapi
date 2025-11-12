from fastapi import FastAPI, HTTPException, status
from models import Users
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from db import engine, Session, select, update
from sqlalchemy import func
from typing import Iterable, Mapping

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

    if username == None or password == None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing credentials")

    statement = select(Users).where(Users.Username==username).where(Users.Password==password)
    results = execute_statement(statement)

    users_found = 0
    for user in results:
        users_found += 1

    if users_found <= 0:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    elif users_found > 1:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Multiple accounts")
    print(f"Movement made")
    return {
        "message": f"User Authenticated (test): {user.Username}",
        "success": True,
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
