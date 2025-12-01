from sqlmodel import create_engine, Session, SQLModel, select, update, delete
from models.database import Users
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# sqlite_file_name = "/home/cotto/side_projects/fastapi-kakani/nudge.sqlite3"
sqlite_file_name = 'nudge.sqlite3'
sqlite_db_path = os.path.join(BASE_DIR, sqlite_file_name)
print(f"sqlite_db_path: {sqlite_db_path}")
sqlite_url = f"sqlite:///{sqlite_db_path}"


def select_users():
    with Session(engine) as session:
        statement = select(Users)
        results = session.exec(statement)
        for user in results:
            print(user)

engine = create_engine(sqlite_url, echo=True)
SQLModel.metadata.create_all(engine)
    

if __name__ == "__main__":
    select_users()
    
