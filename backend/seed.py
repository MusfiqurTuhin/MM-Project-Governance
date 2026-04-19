from datetime import date, timedelta
from sqlmodel import Session, select, delete
from .models import Client, Employee, Project, MeetingUpdate, Invoice, RAGStatus, BlockerType, InvoiceStatus
from .database import engine, init_db

def seed_data():
    with Session(engine) as session:
        # Clear existing data for a fresh "World Class" start
        session.exec(delete(MeetingUpdate))
        session.exec(delete(Invoice))
        session.exec(delete(Project))
        session.exec(delete(Employee))
        session.exec(delete(Client))
        session.commit()

        # --- Governance Leadership & Action Owners ---
        directors = [
            Employee(name="Sarah Jenkins", roles="Managing Director, Strategy"),
            Employee(name="Marcus Vane", roles="VP of Engineering"),
            Employee(name="Elena Rodriguez", roles="Chief Product Officer"),
            Employee(name="David Chen", roles="Senior Project Governance"),
            Employee(name="Amara Okafor", roles="Director of Client Success"),
        ]
        for d in directors: session.add(d)
        session.commit()
        for d in directors: session.refresh(d)

        # --- Tier 1 Clients ---
        clients = [
            Client(name="Apex Financial Group", contact_email="governance@apex.com"),
            Client(name="NexGen Biotechs", contact_email="ops@nexgen.io"),
            Client(name="Stellar Logistics", contact_email="contracts@stellar.com"),
            Client(name="Urban Infrastructure Corp", contact_email="projects@uic.org"),
        ]
        for c in clients: session.add(c)
        session.commit()
        for c in clients: session.refresh(c)

        # --- Strategic Projects ---
        projects_data = [
            ("Project Aethelgard", clients[0].id, directors[0].id, 1250000.0, "USD", 60, -10),
            ("Quantum Horizon",    clients[1].id, directors[1].id, 850000.0,  "EUR", 90, 15),
            ("Summit Meridian",    clients[2].id, directors[3].id, 450000.0,  "USD", 45, 5),
            ("Project Obsidian",   clients[0].id, directors[1].id, 320000.0,  "USD", 30, -5),
            ("Nova Stellaris",     clients[3].id, directors[2].id, 2100000.0, "USD", 120, 45),
            ("Aura Core",          clients[1].id, directors[4].id, 150000.0,  "GBP", 20, 2),
            ("Project Zenith",     clients[2].id, directors[0].id, 980000.0,  "USD", 75, 10),
            ("Prism Flux",         clients[3].id, directors[3].id, 560000.0,  "USD", 50, -2),
        ]

        projects = []
        today = date.today()
        for name, cid, mid, budget, curr, start_offset, deadline_offset in projects_data:
            p = Project(
                name=name,
                client_id=cid,
                manager_id=mid,
                budget=budget,
                currency=curr,
                start_date=today - timedelta(days=start_offset),
                original_deadline=today + timedelta(days=deadline_offset)
            )
            session.add(p)
            projects.append(p)
        
        session.commit()
        for p in projects: session.refresh(p)

        # --- Intelligence Updates (The Vibe) ---
        updates = [
            # Aethelgard - Critical
            MeetingUpdate(
                project_id=projects[0].id,
                rag_status=RAGStatus.RED,
                current_estimated_deadline=today + timedelta(days=5),
                blocker_type=BlockerType.BUREAUCRACY,
                action_owner_id=directors[0].id,
                next_invoice_amount=45000.0,
                notes="Critical bottleneck in regional regulatory approval. Escalation to Steering Committee required immediately. Budget impact estimated at 12%."
            ),
            # Quantum Horizon - Amber
            MeetingUpdate(
                project_id=projects[1].id,
                rag_status=RAGStatus.AMBER,
                current_estimated_deadline=today + timedelta(days=20),
                blocker_type=BlockerType.TECHNICAL,
                action_owner_id=directors[1].id,
                next_invoice_amount=12500.0,
                notes="Interoperability testing with legacy hardware is showing performance degradation. Mitigation strategy 'Theta' is being drafted."
            ),
            # Summit Meridian - Green
            MeetingUpdate(
                project_id=projects[2].id,
                rag_status=RAGStatus.GREEN,
                current_estimated_deadline=today + timedelta(days=5),
                blocker_type=BlockerType.NONE,
                action_owner_id=directors[3].id,
                next_invoice_amount=8000.0,
                notes="Deployment phase 1 completed ahead of schedule. Stakeholder satisfaction remains high. Operational readiness is at 94%."
            ),
            # Obsidian - Red
            MeetingUpdate(
                project_id=projects[3].id,
                rag_status=RAGStatus.RED,
                current_estimated_deadline=today - timedelta(days=2),
                blocker_type=BlockerType.CLIENT,
                action_owner_id=directors[1].id,
                next_invoice_amount=0.0,
                notes="Client sign-off on architecture delayed due to internal restructuring at Apex. Project is currently on hold pending executive alignment."
            ),
            # Nova Stellaris - Green but large
            MeetingUpdate(
                project_id=projects[4].id,
                rag_status=RAGStatus.GREEN,
                current_estimated_deadline=today + timedelta(days=50),
                blocker_type=BlockerType.NONE,
                action_owner_id=directors[2].id,
                next_invoice_amount=250000.0,
                notes="Quarterly milestone achieved. Strategic partnership with vendor 'X' finalized. No foreseeable risks to Q3 delivery."
            ),
        ]
        for u in updates: session.add(u)

        # --- Financial Milestones (Invoices) ---
        invoices = [
            Invoice(project_id=projects[0].id, amount=120000.0, status=InvoiceStatus.SENT, due_date=today - timedelta(days=5)),
            Invoice(project_id=projects[1].id, amount=85000.0,  status=InvoiceStatus.PAID, due_date=today - timedelta(days=20)),
            Invoice(project_id=projects[3].id, amount=45000.0,  status=InvoiceStatus.SENT, due_date=today + timedelta(days=1)),
            Invoice(project_id=projects[4].id, amount=500000.0, status=InvoiceStatus.DRAFT, due_date=today + timedelta(days=15)),
        ]
        for inv in invoices: session.add(inv)

        session.commit()
        print("Executive database seeded with premium data successfully.")

if __name__ == "__main__":
    init_db()
    seed_data()
