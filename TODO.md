# CXO Project Steering & Risk Dashboard — Build Checklist

## Phase 0: Setup & Framework Integration
- [x] Clone `e3-framework` and analyze testing patterns
- [x] Set up PostgreSQL database `steering_db`
- [x] Initialize backend (`/backend`) with Python venv, FastAPI, SQLModel
- [x] Initialize frontend (`/frontend`) with Vite + React + TypeScript + Tailwind

## Phase 1: Backend — Data Architecture & API
- [x] Define SQLModel models (Client, Employee, Project, MeetingUpdate, Invoice)
- [x] Create Alembic migrations & apply (Used SQLModel auto-create)
- [x] Seed database (Rakib, Zaahid, Celestial, Friendship, Bhaiya Housing)
- [x] Implement CRUD endpoints (Projects, MeetingUpdates, Invoices)
- [x] Implement `GET /api/v1/dashboard` with CXO logic:
  - [x] Critical Watchlist (RED or deadline exceeded)
  - [x] Resource Heatmap (at-risk tasks per employee)
  - [x] Revenue Ticker (unpaid invoices near deadline)
  - [x] Admin Actions (BUREAUCRACY/CLIENT blockers)
- [x] Write `pytest` tests for dashboard logic

## Phase 2: Frontend — React UI
- [x] Build Input Mode (MeetingUpdate form with validation)
  - [x] Block impossible states (Green + Bureaucracy blocker)
  - [x] Validate all inputs before API dispatch
- [x] Build CXO Dashboard Mode:
  - [x] Resource Heatmap (vertical bar chart)
  - [x] Risk Table (sorted by attention score)
  - [x] Invoicing Health (traffic light)
- [x] Connect frontend to backend API

## Phase 3: Browser E2E Testing (Section 7)
- [x] Start backend dev server (localhost:8000)
- [x] Start frontend dev server (localhost:5173)
- [x] Test 1: Fill & submit MeetingUpdate form for 'Friendship' project (RED + blocker)
- [x] Test 2: Navigate to Dashboard, verify 'Friendship' in Critical Watchlist
- [x] Fix any console errors or UI bugs autonomously

## Phase 4: Documentation
- [x] Create README.md with launch instructions
- [x] Update TODO.md with completion status
