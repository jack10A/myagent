from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError

from app.activity.router import router as activity_router
from app.actions.router import router as actions_router
from app.alerts.router import router as alerts_router
from app.approvals.router import router as approvals_router
from app.auth.router import router as auth_router
from app.capture.router import router as capture_router
from app.calendar.router import router as calendar_router
from app.connectors.router import router as connectors_router
from app.core.config import settings
from app.core.database import Base, engine
from app.guardian.router import router as guardian_router
from app.growth.router import router as growth_router
from app.health.router import router as health_router
from app.memory.router import router as memory_router
from app.notifications.router import router as notifications_router
from app.onboarding.router import router as onboarding_router
from app.orchestration.router import router as orchestration_router
from app.profile.router import router as profile_router
from app.users.router import router as users_router

app = FastAPI(title="MyAgent API", version="0.1.0")


@app.on_event("startup")
def create_local_tables() -> None:
    if settings.skip_db_startup:
        print("MyAgent: skipping database startup check.")
        return

    if settings.app_env == "local":
        try:
            Base.metadata.create_all(bind=engine)
        except SQLAlchemyError as exc:
            print(f"MyAgent warning: database is unavailable, starting API without local tables. {exc}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "myagent-api"}


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(capture_router, prefix="/api/capture", tags=["capture"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["calendar"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(onboarding_router, prefix="/api/onboarding", tags=["onboarding"])
app.include_router(connectors_router, prefix="/api/connectors", tags=["connectors"])
app.include_router(memory_router, prefix="/api/memory", tags=["memory"])
app.include_router(orchestration_router, prefix="/api/orchestration", tags=["orchestration"])
app.include_router(activity_router, prefix="/api/activity", tags=["activity"])
app.include_router(approvals_router, prefix="/api/approvals", tags=["approvals"])
app.include_router(actions_router, prefix="/api/actions", tags=["actions"])
app.include_router(guardian_router, prefix="/api/guardian", tags=["guardian"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(growth_router, prefix="/api/growth", tags=["growth"])
app.include_router(health_router, prefix="/api/health", tags=["health"])
