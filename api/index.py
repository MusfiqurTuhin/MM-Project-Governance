import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, g
from functools import wraps
from datetime import date, timedelta

from database import engine, SessionLocal, Base
from models import (
    User, UserRole, Client, Employee, Project,
    MeetingUpdate, Invoice, RAGStatus, BlockerType, InvoiceStatus,
)
from auth import (
    hash_password, verify_password, create_access_token,
    decode_token, seed_default_users,
)

app = Flask(__name__)


def init_db():
    Base.metadata.create_all(engine)
    with SessionLocal() as s:
        seed_default_users(s)


with app.app_context():
    init_db()


# ── helpers ──────────────────────────────────────────────────────────────────

def get_db():
    if "db" not in g:
        g.db = SessionLocal()
    return g.db


@app.teardown_appcontext
def close_db(_exc=None):
    db = g.pop("db", None)
    if db:
        db.close()


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
        payload = decode_token(token)
        if not payload:
            return jsonify({"detail": "Invalid or expired token"}), 401
        db = get_db()
        user = db.query(User).filter_by(username=payload.get("sub")).first()
        if not user or not user.is_active:
            return jsonify({"detail": "Invalid or expired token"}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return wrapper


def require_super_admin(f):
    @wraps(f)
    @require_auth
    def wrapper(*args, **kwargs):
        if g.current_user.role != UserRole.SUPER_ADMIN:
            return jsonify({"detail": "Only super admins can perform this action"}), 403
        return f(*args, **kwargs)
    return wrapper


def row_to_dict(obj, exclude=None):
    d = {c.name: getattr(obj, c.name) for c in obj.__table__.columns}
    for k, v in d.items():
        if isinstance(v, date):
            d[k] = v.isoformat()
        elif hasattr(v, "value"):
            d[k] = v.value
    if exclude:
        for k in exclude:
            d.pop(k, None)
    return d


# ── auth ─────────────────────────────────────────────────────────────────────

@app.post("/api/v1/auth/login")
def login():
    username = request.form.get("username") or (request.json or {}).get("username")
    password = request.form.get("password") or (request.json or {}).get("password")
    db = get_db()
    user = db.query(User).filter_by(username=username).first()
    if not user or not verify_password(password, user.hashed_password):
        return jsonify({"detail": "Invalid credentials"}), 401
    if not user.is_active:
        return jsonify({"detail": "Account disabled"}), 403
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return jsonify({"access_token": token, "token_type": "bearer", "role": user.role.value, "username": user.username})


@app.get("/api/v1/auth/me")
@require_auth
def get_me():
    return jsonify(row_to_dict(g.current_user, exclude=["hashed_password"]))


# ── users ─────────────────────────────────────────────────────────────────────

@app.get("/api/v1/users")
@require_super_admin
def list_users():
    db = get_db()
    users = db.query(User).all()
    return jsonify([row_to_dict(u, exclude=["hashed_password"]) for u in users])


@app.post("/api/v1/users")
@require_super_admin
def create_user():
    db = get_db()
    body = request.json or {}
    if db.query(User).filter_by(username=body["username"]).first():
        return jsonify({"detail": "Username already exists"}), 400
    user = User(
        username=body["username"], email=body["email"],
        hashed_password=hash_password(body["password"]),
        role=UserRole(body.get("role", "admin")),
    )
    db.add(user); db.commit(); db.refresh(user)
    return jsonify(row_to_dict(user, exclude=["hashed_password"])), 201


@app.delete("/api/v1/users/<int:user_id>")
@require_super_admin
def delete_user(user_id):
    db = get_db()
    user = db.get(User, user_id)
    if not user:
        return jsonify({"detail": "Not found"}), 404
    db.delete(user); db.commit()
    return jsonify({"ok": True})


# ── read endpoints ────────────────────────────────────────────────────────────

@app.get("/api/v1/projects")
@require_auth
def get_projects():
    return jsonify([row_to_dict(p) for p in get_db().query(Project).all()])


@app.get("/api/v1/employees")
@require_auth
def get_employees():
    return jsonify([row_to_dict(e) for e in get_db().query(Employee).all()])


@app.get("/api/v1/clients")
@require_auth
def get_clients():
    return jsonify([row_to_dict(c) for c in get_db().query(Client).all()])


@app.get("/api/v1/updates")
@require_auth
def get_updates():
    db = get_db()
    updates = db.query(MeetingUpdate).order_by(MeetingUpdate.updated_at.desc()).all()
    result = []
    for u in updates:
        d = row_to_dict(u)
        proj = db.get(Project, u.project_id)
        owner = db.get(Employee, u.action_owner_id)
        d["project_name"] = proj.name if proj else "Unknown"
        d["owner_name"] = owner.name if owner else "Unknown"
        result.append(d)
    return jsonify(result)


@app.get("/api/v1/dashboard")
@require_auth
def get_dashboard():
    db = get_db()
    today = date.today()
    projects = db.query(Project).all()

    critical_watchlist, resource_heatmap, revenue_by_currency, admin_actions, team_details = [], {}, {}, [], {}

    for emp in db.query(Employee).all():
        resource_heatmap[emp.name] = 0

    for project in projects:
        latest = (db.query(MeetingUpdate)
                  .filter_by(project_id=project.id)
                  .order_by(MeetingUpdate.updated_at.desc(), MeetingUpdate.id.desc())
                  .first())
        if not latest:
            continue

        is_overdue = latest.current_estimated_deadline > project.original_deadline
        if latest.rag_status == RAGStatus.RED or is_overdue:
            score = 10 if latest.rag_status == RAGStatus.RED else (5 if latest.rag_status == RAGStatus.AMBER else 0)
            if is_overdue:
                score += max(0, (latest.current_estimated_deadline - project.original_deadline).days)
            score += int(latest.next_invoice_amount / 500)
            critical_watchlist.append({
                "project_id": project.id, "name": project.name,
                "rag_status": latest.rag_status.value, "score": score,
                "deadline": latest.current_estimated_deadline.isoformat(),
            })

        if latest.rag_status in [RAGStatus.RED, RAGStatus.AMBER]:
            owner = db.get(Employee, latest.action_owner_id)
            if owner:
                resource_heatmap[owner.name] = resource_heatmap.get(owner.name, 0) + 1
                team_details.setdefault(owner.name, []).append({
                    "project": project.name, "rag_status": latest.rag_status.value,
                    "deadline": str(latest.current_estimated_deadline),
                    "blocker": latest.blocker_type.value, "notes": latest.notes,
                })

        curr = project.currency or "USD"
        revenue_by_currency.setdefault(curr, 0.0)
        if latest.current_estimated_deadline <= (today + timedelta(days=14)):
            revenue_by_currency[curr] += latest.next_invoice_amount
            for inv in db.query(Invoice).filter(Invoice.project_id == project.id, Invoice.status != InvoiceStatus.PAID).all():
                revenue_by_currency[curr] += inv.amount

        if latest.blocker_type in [BlockerType.BUREAUCRACY, BlockerType.CLIENT]:
            admin_actions.append({"project": project.name, "notes": latest.notes, "blocker": latest.blocker_type.value})

    critical_watchlist.sort(key=lambda x: x["score"], reverse=True)
    return jsonify({
        "important_projects": critical_watchlist, "team_workload": resource_heatmap,
        "financial_summary": revenue_by_currency, "needed_actions": admin_actions,
        "team_details": team_details,
    })


# ── write endpoints ───────────────────────────────────────────────────────────

@app.post("/api/v1/projects")
@require_auth
def create_project():
    db = get_db()
    b = request.json or {}
    p = Project(name=b["name"], client_id=b["client_id"], manager_id=b["manager_id"],
                budget=b["budget"], currency=b.get("currency", "USD"),
                start_date=date.fromisoformat(b["start_date"]),
                original_deadline=date.fromisoformat(b["original_deadline"]))
    db.add(p); db.commit(); db.refresh(p)
    return jsonify(row_to_dict(p)), 201


@app.post("/api/v1/clients")
@require_auth
def create_client():
    db = get_db()
    b = request.json or {}
    c = Client(name=b["name"], contact_email=b["contact_email"])
    db.add(c); db.commit(); db.refresh(c)
    return jsonify(row_to_dict(c)), 201


@app.post("/api/v1/employees")
@require_auth
def create_employee():
    db = get_db()
    b = request.json or {}
    e = Employee(name=b["name"], roles=b["roles"])
    db.add(e); db.commit(); db.refresh(e)
    return jsonify(row_to_dict(e)), 201


@app.post("/api/v1/updates")
@require_auth
def create_update():
    db = get_db()
    b = request.json or {}
    rag = RAGStatus(b["rag_status"])
    blocker = BlockerType(b.get("blocker_type", "NONE"))
    if rag == RAGStatus.GREEN and blocker == BlockerType.BUREAUCRACY:
        return jsonify({"detail": "Cannot have Green status with Bureaucracy blocker"}), 400
    u = MeetingUpdate(
        project_id=b["project_id"], rag_status=rag, blocker_type=blocker,
        current_estimated_deadline=date.fromisoformat(b["current_estimated_deadline"]),
        action_owner_id=b["action_owner_id"],
        next_invoice_amount=b.get("next_invoice_amount", 0.0),
        notes=b.get("notes", ""),
    )
    db.add(u); db.commit(); db.refresh(u)
    return jsonify(row_to_dict(u)), 201


# ── delete endpoints ──────────────────────────────────────────────────────────

@app.delete("/api/v1/projects/<int:pid>")
@require_super_admin
def delete_project(pid):
    db = get_db()
    obj = db.get(Project, pid)
    if not obj:
        return jsonify({"detail": "Not found"}), 404
    db.delete(obj); db.commit()
    return jsonify({"ok": True})


@app.delete("/api/v1/clients/<int:cid>")
@require_super_admin
def delete_client(cid):
    db = get_db()
    obj = db.get(Client, cid)
    if not obj:
        return jsonify({"detail": "Not found"}), 404
    db.delete(obj); db.commit()
    return jsonify({"ok": True})


@app.delete("/api/v1/employees/<int:eid>")
@require_super_admin
def delete_employee(eid):
    db = get_db()
    obj = db.get(Employee, eid)
    if not obj:
        return jsonify({"detail": "Not found"}), 404
    db.delete(obj); db.commit()
    return jsonify({"ok": True})
