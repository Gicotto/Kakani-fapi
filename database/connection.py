from db import engine, Session

def get_session():
    """Dependency for getting DB sessions"""
    with Session(engine) as session:
        yield session
