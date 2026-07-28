from typing import Any

from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import SessionLocal
from app.db.models import DemoMemory


def database_memory_enabled() -> bool:
    return not settings.skip_db_startup


def read_memory_value(key: str) -> Any | None:
    if not database_memory_enabled():
        return None
    try:
        with SessionLocal() as db:
            row = db.get(DemoMemory, key)
            return row.value_json if row else None
    except SQLAlchemyError as exc:
        print(f"MyAgent warning: demo memory DB read failed for {key}. {exc}")
        return None


def write_memory_value(key: str, value: Any) -> bool:
    if not database_memory_enabled():
        return False
    try:
        with SessionLocal() as db:
            row = db.get(DemoMemory, key)
            if row:
                row.value_json = normalize_json_value(value)
            else:
                row = DemoMemory(key=key, value_json=normalize_json_value(value))
                db.add(row)
            db.commit()
        return True
    except SQLAlchemyError as exc:
        print(f"MyAgent warning: demo memory DB write failed for {key}. {exc}")
        return False


def delete_memory_value(key: str) -> bool:
    if not database_memory_enabled():
        return False
    try:
        with SessionLocal() as db:
            row = db.get(DemoMemory, key)
            if row:
                db.delete(row)
                db.commit()
        return True
    except SQLAlchemyError as exc:
        print(f"MyAgent warning: demo memory DB delete failed for {key}. {exc}")
        return False


def normalize_json_value(value: Any) -> dict:
    if isinstance(value, dict):
        return value
    return {"items": value}
