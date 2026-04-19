# PROJECT_BLUEPRINT: CXO Project Steering & Risk Dashboard

## 1. STRATEGIC GOALS
Transform qualitative meeting minutes into a quantitative CXO-level dashboard.
* **Identify Risks:** Flag projects with timeline slippage or "Red" health.
* **Resource Balancing:** Detect employee overloading (especially Rakib and Zaahid).
* **Financial Guardrails:** Highlight projects nearing go-live without payment confirmation.
* **Admin Engagement:** Specifically filter for "Bureaucracy" or "Policy" blockers.

## 2. TECH STACK (NATIVE DEPLOYMENT)
* **Frontend:** React 18 (Vite), TypeScript, Tailwind CSS, Lucide-React.
* **Backend:** FastAPI (Python), SQLModel (ORM), Alembic (Migrations).
* **Database:** PostgreSQL (Local service already running).
* **Process:** No Docker. Use Python `venv` and `npm` directly on the host.

## 3. DATA ARCHITECTURE (SQLModel)
The agent MUST implement these relationships to support intelligent dashboarding:

### A. Master Data (Static)
* `Client`: id, name, contact_email.
* `Employee`: id, name, role.
* `Project`: id, name, client_id (FK), budget, original_deadline.

### B. Transactional Data (Dynamic)
* `MeetingUpdate`: 
    - project_id (FK), updated_at (date).
    - rag_status (Enum: RED, AMBER, GREEN).
    - current_estimated_deadline (date).
    - blocker_type (Enum: TECHNICAL, BUREAUCRACY, CLIENT, RESOURCE, NONE).
    - action_owner_id (FK to Employee).
    - notes (Text).
* `Invoice`: project_id (FK), amount, status (DRAFT, SENT, PAID), due_date.

## 4. INTELLIGENT DASHBOARD LOGIC (The "CXO View")
The `GET /api/v1/dashboard` endpoint must return an object containing:
1.  **Critical Watchlist:** Projects where `rag_status` is RED or `current_estimated_deadline` > `original_deadline`.
2.  **Resource Heatmap:** A count of "Incomplete/At Risk" tasks assigned per `Employee`. Highlight if count > 2.
3.  **Revenue Ticker:** Sum of `Invoice.amount` where `Invoice.status` != 'PAID' and project `estimated_deadline` < 14 days.
4.  **Admin Actions:** A list of `notes` and `projects` specifically tagged with `BUREAUCRACY` or `CLIENT` blockers.

## 5. UI/UX SPECIFICATIONS
* **Input Mode:** A single-page React form where users select a project and fill in the *MeetingUpdate* fields.
* **CXO Mode:** A dashboard with three main widgets:
    - **Heatmap:** Vertical bar chart (Employees vs. At-Risk Tasks).
    - **Risk Table:** List of projects sorted by "Extent of Attention" (calculated: Red = 10pts, Amber = 5pts, Days Overdue = 1pt/day).
    - **Invoicing Health:** A visual "Traffic Light" for payment statuses.

## 6. QUALITY ASSURANCE & TESTING (e3-framework)
The development process MUST be test-driven.
* **Framework Integration:** Clone `https://github.com/nsrshishir/e3-framework` into a subdirectory. Analyze its structure, and adapt its testing and validation patterns for this project.
* **Form Validation:** React form must block impossible states (e.g., submitting a 'Green' status with a 'Bureaucracy' blocker). Validate all inputs before API dispatch.
* **Backend Correctness:** Write automated tests (`pytest`) for the `/dashboard` API to verify the SQL joins and scoring algorithms.

## 7. BROWSER AUTOMATION & E2E UI QA
The agent MUST use browser interaction capabilities to visually test the frontend.
1. Start both the FastAPI backend (`localhost:8000`) and Vite frontend (`localhost:5173`) in background terminal sessions.
2. Launch the agentic browser and navigate to the frontend URL.
3. **Test 1 (Form Submission):** Interact with the DOM to fill out a mock update for the 'Friendship' project, setting it to 'RED' and tagging a blocker. Submit the form.
4. **Test 2 (Dashboard Verification):** Navigate to the Dashboard. Visually verify the DOM rendered the 'Friendship' project in the Critical Watchlist.
5. Autonomously fix any console errors or UI bugs discovered during the browser session.

## 8. AUTONOMOUS EXECUTION PROTOCOL
1. Create `/backend` and `/frontend`. Initialize `venv` and `npm`.
2. Verify connection to local Postgres. Create DB `steering_db`. Generate migrations.
3. Seed the database with names from the blueprint (Rakib, Zaahid, Celestial, Friendship, Bhaiya Housing).
4. Verify backend logic via `pytest` before building the React code.
5. Document how to launch the stack in a `README.md`.