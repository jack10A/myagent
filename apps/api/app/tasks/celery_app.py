from celery import Celery

from app.core.config import settings

celery_app = Celery("myagent", broker=settings.redis_url, backend=settings.redis_url)


@celery_app.task
def poll_connectors() -> str:
    return "connector polling placeholder"

