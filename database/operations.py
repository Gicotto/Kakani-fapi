from db import Session, engine
from typing import Mapping

def execute_statement(statement=None):
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
    Executes `statement` and updates the returned rows with the provided field values.
    Returns count updated.
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
