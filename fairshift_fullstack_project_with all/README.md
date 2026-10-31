# FAIRSHIFT — Auditable Allocation & Decision Support System

FAIRSHIFT is an auditable, constraint-optimization allocation and decision-support web application equipped with a **Python/Flask backend**, **SQLite database**, and an **interactive frontend interface**.

---

## 🚀 Key Features Added

1. **Relational Database (SQLite - `fairshift.db`)**:
   - `users`: User authentication, roles (`Administrator`, `Allocator`), organizations.
   - `programs`: Programs, capacities, tracks, and available seats.
   - `applicants`: 180 seeded realistic applicant records with eligibility lists and ranked preferences.
   - `allocations`: Persisted program assignments, preference rankings, and allocation status (`Assigned`, `Unassigned`, `Withdrawn`).
   - `audit_logs`: Full auditable ledger recording all allocation updates, reassignments, appeals, and system actions with timestamps and solver status.

2. **Backend Engine (`app.py`)**:
   - **Constraint-Optimized Allocation**: Multi-objective algorithm enforcing hard rules (capacity limits, prerequisites/eligibility, single seat per applicant) and maximizing preference satisfaction.
   - **Minimal Disruption Reassignment Engine**: Handles capacity changes and applicant withdrawals while preserving confirmed allocations.
   - **Counterfactual Appeal Evaluator**: Simulates forced placements and quantifies systemic ripple effects (displaced peers, $\Delta$ preference satisfaction score, feasibility status).
   - **Independent Constraint Validator**: Validates the current state against declared constraints (capacity boundaries, eligibility, withdrawal exclusions, and uniqueness).
   - **Audit Trail & CSV Export**: Provides complete audit tracking and dynamic CSV export of allocations (`/api/data/export`).

3. **RESTful API Endpoints**:
   - `POST /api/auth/login` & `POST /api/auth/register`
   - `GET /api/allocation/current`
   - `POST /api/allocation/initial`
   - `POST /api/allocation/reassign`
   - `POST /api/allocation/appeal`
   - `POST /api/validation/run`
   - `GET /api/audit/logs`
   - `GET /api/data/export`

---

## 💻 Quick Start & Running the Server

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Start the Backend Server
```bash
python app.py
```
The server will automatically initialize the database schema and seed the initial dataset on first run.

### 3. Open in Browser
Visit:
```
http://127.0.0.1:5000
```
or log in directly:
- **Email:** `admin@fairshift.io`
- **Password:** `demo1234`
