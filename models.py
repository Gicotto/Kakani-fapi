from sqlmodel import Field, Session, SQLModel, create_engine, select

class Users(SQLModel, table=True):
    Uuid: str | None = Field(default=None, primary_key=True)
    Username: str
    Password: str
    Email: str


