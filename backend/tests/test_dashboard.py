import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool
from datetime import date, timedelta
from ..main import app, get_session
from ..models import Project, MeetingUpdate, Employee, Invoice, RAGStatus, BlockerType, InvoiceStatus

# Setup in-memory SQLite for tests
SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

@pytest.fixture(name="client")
def client_fixture(session: Session):
    def get_session_override():
        return session
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()

def test_dashboard_logic(session: Session, client: TestClient):
    # 1. Create Employee
    rakib = Employee(name="Rakib", role="PM")
    session.add(rakib)
    session.commit()
    
    # 2. Create Project
    p1 = Project(name="Project 1", client_id=1, budget=1000, original_deadline=date.today())
    session.add(p1)
    session.commit()
    
    # 3. Create Update (RED + Overdue)
    update = MeetingUpdate(
        project_id=p1.id,
        rag_status=RAGStatus.RED,
        current_estimated_deadline=date.today() + timedelta(days=5),
        blocker_type=BlockerType.BUREAUCRACY,
        action_owner_id=rakib.id,
        notes="Big blocker"
    )
    session.add(update)
    session.commit()
    
    # 4. Create unpaid invoice
    inv = Invoice(
        project_id=p1.id,
        amount=500,
        status=InvoiceStatus.SENT,
        due_date=date.today()
    )
    session.add(inv)
    session.commit()
    
    response = client.get("/api/v1/dashboard")
    assert response.status_code == 200
    data = response.json()
    
    # Verify Watchlist
    assert len(data["critical_watchlist"]) == 1
    assert data["critical_watchlist"][0]["name"] == "Project 1"
    # Score: 10 (Red) + 5 (Days overdue) = 15
    assert data["critical_watchlist"][0]["score"] == 15
    
    # Verify Heatmap
    assert data["resource_heatmap"]["Rakib"] == 1
    
    # Verify Revenue Ticker
    assert data["revenue_ticker"] == 500
    
    # Verify Admin Actions
    assert len(data["admin_actions"]) == 1
    assert data["admin_actions"][0]["blocker"] == "BUREAUCRACY"

def test_block_invalid_state(client: TestClient):
    # Green status + Bureaucracy blocker should fail
    response = client.post("/api/v1/updates", json={
        "project_id": 1,
        "rag_status": "GREEN",
        "current_estimated_deadline": str(date.today()),
        "blocker_type": "BUREAUCRACY",
        "action_owner_id": 1,
        "notes": "Invalid"
    })
    assert response.status_code == 400
    assert "Bureaucracy blocker" in response.json()["detail"]
