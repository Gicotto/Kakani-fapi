from sqlmodel import create_engine, Session, select, SQLModel
from models import Users

sqlite_file_name = "/home/cotto/side_projects/fastapi-kakani/nudge.sqlite3"
sqlite_url = f"sqlite:///{sqlite_file_name}"


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
    
