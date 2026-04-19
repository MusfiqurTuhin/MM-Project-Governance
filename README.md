# CXO Project Steering & Risk Dashboard

A powerful, high-fidelity dashboard for tracking project risks, resource health, and financial guardrails.

## Tech Stack
- **Backend:** FastAPI, SQLModel, PostgreSQL
- **Frontend:** React (Vite), TypeScript, Tailwind CSS, Lucide-React, Recharts
- **Testing:** Pytest, e3-framework patterns

## Launch Instructions

### 1. Prerequisites
- Python 3.12+
- Node.js & npm
- PostgreSQL (running locally)

### 2. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt # (Or manually install: fastapi uvicorn sqlmodel alembic psycopg2-binary pytest httpx)
# Database is assumed to be 'steering_db' on localhost
# Run seed script
python -m backend.seed
# Start server
uvicorn backend.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev -- --port 5173
```

### 4. Usage
- Open `http://localhost:5173` in your browser.
- **Input Mode:** Fill out meeting updates for projects.
- **CXO Dashboard:** View strategic risks, resource heatmaps, and revenue at risk.

## Dashboard Logic
- **Risk Score:** Red = 10pts, Amber = 5pts, Overdue = 1pt/day.
- **Critical Watchlist:** Flags projects with RED status or missed deadlines.
- **Admin Actions:** Highlights projects with Bureaucracy or Client blockers.
- **Revenue Ticker:** Sums unpaid invoices for projects with deadlines within 14 days.

## Testing
Run backend tests with:
```bash
export PYTHONPATH=$PYTHONPATH:.
backend/venv/bin/pytest backend/tests/test_dashboard.py
```
