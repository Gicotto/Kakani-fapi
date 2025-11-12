from fastapi import FastAPI
from models import Users 
from db import engine, Session, select

app = FastAPI()

uuid_dict = {
    1: "Julian",
    2: "Grace",
    3: "Zach",
}

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/home/{uuid}")
async def home(uuid: int=None):
    if uuid:
        if not isinstance(uuid, int):
            uuid = int(uuid)
        message = f"Welcome Home: {uuid_dict[uuid]}"
    else:
        message = f"Welcome Home: Anonymous"

    return message

@app.get("/users/{username}/credentials/{password}")
async def get_user(username: str, password: str):
    if username == None or password == None:
        message = f"Missing Info"
    elif username != None and password != None:
        with Session(engine) as session:
            statement = select(Users).where(Users.Username==username).where(Users.Password==password)
            results = session.exec(statement)
            for user in results:
                message = f"Retrieved User: {user.Username}"
    else:
        message = f"Error: Bad Info"
    return message

@app.get("users/{username}/credentials/{password}/changepassword/{new_password}")
async def change_password(username: str, password: str, new_password: str):
    if username == None or password == None or new_password == None:
        message = f"Missing Info, Please Enter Credentials"
    elif username != None and password != None and new_password != None:
        statement = select(Users).where(Users.Username==username).where(Users.Password==password)
        results = execute_statement(statement=statement)
        for user in results:
            message = f"User: {user}"
    else:
        message = f"Error: Bad Info"
    return message

def execute_statement(statement: str = None):
    with Session(engine) as session:
        results = session.exec(statement)
    return results
