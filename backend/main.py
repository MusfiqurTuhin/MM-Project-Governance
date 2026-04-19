from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select
from typing import List
from datetime import date, timedelta
from pydantic import BaseModel

from .database import get_session, init_db
from .models import (
    Project, Client, MeetingUpdate, Employee, Invoice,
    RAGStatus, BlockerType, InvoiceStatus, User, UserRole,
)
from .auth import (
    verify_password, create_access_token, hash_password,
    get_current_user, require_admin, require_super_admin,
    seed_default_users,
)

app = FastAPI(title="MM Project Governance API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    from .database import engine
    with Session(engine) as session:
        seed_default_users(session)


# ─── Auth ────────────────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    username: str


@app.post("/api/v1/auth/login", response_model=TokenResponse)
def login(form: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == form.username)).first()
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    token = create_access_token({"sub": user.username, "role": user.role})
    return TokenResponse(access_token=token, token_type="bearer", role=user.role, username=user.username)


class MeResponse(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool


@app.get("/api/v1/auth/me", response_model=MeResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


# ─── User management (super_admin only) ──────────────────────────────────────

class CreateUserRequest(BaseModel):
    username: str
    email: str
    password: str
    role: UserRole = UserRole.ADMIN


@app.get("/api/v1/users", dependencies=[Depends(require_super_admin)])
def list_users(session: Session = Depends(get_session)):
    users = session.exec(select(User)).all()
    return [{"id": u.id, "username": u.username, "email": u.email, "role": u.role, "is_active": u.is_active} for u in users]


@app.post("/api/v1/users", dependencies=[Depends(require_super_admin)])
def create_user(body: CreateUserRequest, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.username == body.username)).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(
        username=body.username,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=body.role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return {"id": user.id, "username": user.username, "email": user.email, "role": user.role}


@app.delete("/api/v1/users/{user_id}", dependencies=[Depends(require_super_admin)])
def delete_user(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    session.delete(user)
    session.commit()
    return {"ok": True}


# ─── Read endpoints (any authenticated user) ─────────────────────────────────

@app.get("/api/v1/projects", response_model=List[Project])
def get_projects(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(Project)).all()


@app.get("/api/v1/employees", response_model=List[Employee])
def get_employees(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(Employee)).all()


@app.get("/api/v1/clients", response_model=List[Client])
def get_clients(session: Session = Depends(get_session), _=Depends(require_admin)):
    return session.exec(select(Client)).all()


@app.get("/api/v1/updates", dependencies=[Depends(require_admin)])
def get_updates(session: Session = Depends(get_session)):
    updates = session.exec(select(MeetingUpdate).order_by(MeetingUpdate.updated_at.desc())).all()
    result = []
    for u in updates:
        project = session.get(Project, u.project_id)
        owner = session.get(Employee, u.action_owner_id)
        result.append({
            **u.model_dump(),
            "project_name": project.name if project else "Unknown",
            "owner_name": owner.name if owner else "Unknown",
        })
    return result


@app.get("/api/v1/dashboard", dependencies=[Depends(require_admin)])
def get_dashboard(session: Session = Depends(get_session)):
    today = date.today()
    projects = session.exec(select(Project)).all()

    critical_watchlist = []
    resource_heatmap = {}
    revenue_by_currency = {}
    admin_actions = []
    team_details: dict = {}

    employees = session.exec(select(Employee)).all()
    for emp in employees:
        resource_heatmap[emp.name] = 0

    for project in projects:
        latest_update = session.exec(
            select(MeetingUpdate)
            .where(MeetingUpdate.project_id == project.id)
            .order_by(MeetingUpdate.updated_at.desc(), MeetingUpdate.id.desc())
        ).first()

        if not latest_update:
            continue

        is_overdue = latest_update.current_estimated_deadline > project.original_deadline
        if latest_update.rag_status == RAGStatus.RED or is_overdue:
            score = 0
            if latest_update.rag_status == RAGStatus.RED:
                score += 10
            elif latest_update.rag_status == RAGStatus.AMBER:
                score += 5
            if is_overdue:
                score += max(0, (latest_update.current_estimated_deadline - project.original_deadline).days)
            score += int(latest_update.next_invoice_amount / 500)
            critical_watchlist.append({
                "project_id": project.id,
                "name": project.name,
                "rag_status": latest_update.rag_status,
                "score": score,
                "deadline": latest_update.current_estimated_deadline,
            })

        if latest_update.rag_status in [RAGStatus.RED, RAGStatus.AMBER]:
            owner = session.get(Employee, latest_update.action_owner_id)
            if owner:
                resource_heatmap[owner.name] += 1
                team_details.setdefault(owner.name, []).append({
                    "project": project.name,
                    "rag_status": latest_update.rag_status,
                    "deadline": str(latest_update.current_estimated_deadline),
                    "blocker": latest_update.blocker_type,
                    "notes": latest_update.notes,
                })

        curr = project.currency or "USD"
        revenue_by_currency.setdefault(curr, 0.0)
        if latest_update.current_estimated_deadline <= (today + timedelta(days=14)):
            revenue_by_currency[curr] += latest_update.next_invoice_amount
            for inv in session.exec(
                select(Invoice).where(Invoice.project_id == project.id).where(Invoice.status != InvoiceStatus.PAID)
            ).all():
                revenue_by_currency[curr] += inv.amount

        if latest_update.blocker_type in [BlockerType.BUREAUCRACY, BlockerType.CLIENT]:
            admin_actions.append({
                "project": project.name,
                "notes": latest_update.notes,
                "blocker": latest_update.blocker_type,
            })

    critical_watchlist.sort(key=lambda x: x["score"], reverse=True)
    return {
        "important_projects": critical_watchlist,
        "team_workload": resource_heatmap,
        "financial_summary": revenue_by_currency,
        "needed_actions": admin_actions,
        "team_details": team_details,
    }


# ─── Write endpoints (any authenticated user) ────────────────────────────────

@app.post("/api/v1/projects", dependencies=[Depends(require_admin)])
def create_project(project: Project, session: Session = Depends(get_session)):
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


@app.post("/api/v1/clients", dependencies=[Depends(require_admin)])
def create_client(client: Client, session: Session = Depends(get_session)):
    session.add(client)
    session.commit()
    session.refresh(client)
    return client


@app.post("/api/v1/employees", dependencies=[Depends(require_admin)])
def create_employee(employee: Employee, session: Session = Depends(get_session)):
    session.add(employee)
    session.commit()
    session.refresh(employee)
    return employee


@app.post("/api/v1/updates", dependencies=[Depends(require_admin)])
def create_update(update: MeetingUpdate, session: Session = Depends(get_session)):
    if update.rag_status == RAGStatus.GREEN and update.blocker_type == BlockerType.BUREAUCRACY:
        raise HTTPException(status_code=400, detail="Cannot have a Green status with a Bureaucracy blocker.")
    session.add(update)
    session.commit()
    session.refresh(update)
    return update


# ─── Delete endpoints (super_admin only) ─────────────────────────────────────

@app.delete("/api/v1/projects/{project_id}", dependencies=[Depends(require_super_admin)])
def delete_project(project_id: int, session: Session = Depends(get_session)):
    obj = session.get(Project, project_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return {"ok": True}


@app.delete("/api/v1/clients/{client_id}", dependencies=[Depends(require_super_admin)])
def delete_client(client_id: int, session: Session = Depends(get_session)):
    obj = session.get(Client, client_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return {"ok": True}


@app.delete("/api/v1/employees/{employee_id}", dependencies=[Depends(require_super_admin)])
def delete_employee(employee_id: int, session: Session = Depends(get_session)):
    obj = session.get(Employee, employee_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Not found")
    session.delete(obj)
    session.commit()
    return {"ok": True}
