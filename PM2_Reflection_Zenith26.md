# PM2-01 & PM2-02 Capstone Reflection: Zenith '26 Fest Management System

**Course:** Product Management II: Technology & Agile Execution  
**Student Name:** [Your Name]  
**Project:** Zenith '26 College Fest Management System  
**Stack:** HTML5 + Tailwind CSS + JavaScript | Python + FastAPI | SQLite (`fest.db`)  

---

## 1. Concept 1: The Three-Layer Architecture & The Server as Single Source of Truth

In class, we discussed the classic three-tier architecture: **Presentation Layer (Client)**, **Application/Logic Layer (Server)**, and **Data Layer (Database)**. Building Zenith '26 made this concrete:

* **Separation of Concerns:** The HTML/Tailwind/JS frontend ([`index.html`](frontend/index.html) and [`app.js`](frontend/js/app.js)) only handles presentation and user interaction. The business logic lives entirely inside FastAPI ([`main.py`](backend/main.py)), and persistence resides in SQLite ([`database.py`](backend/database.py)).
* **Eliminating State Drift:** A crucial PM architectural decision was **how `available_seats` is managed**. Instead of storing a mutable `available_seats` integer column in the database that could drift out of sync if two users register at once or if a cancellation occurs, the system computes `available_seats` dynamically on every request:
  $$\text{available\_seats} = \text{capacity} - \text{COUNT(registrations for event\_id)}$$
  This guarantees that the server and database remain the sole source of truth, preventing race conditions and discrepancies between what students see and what coordinators track.

---

## 2. Concept 2: "Never Trust the Client" & HTTP Status Code Discipline

One of the foundational tenets of PM2-02 is **"Never trust the client."** While the browser form in [`app.js`](frontend/js/app.js) performs client-side validation (ensuring fields aren't blank and the email includes `@`), the FastAPI server independently re-validates every request in [`main.py`](backend/main.py#L125).

During testing, I observed how different scenarios trigger precise HTTP status codes:
1. **`201 Created`**: Returned on valid registration, generating a persistent record with a server timestamp (`registered_at`).
2. **`400 Bad Request`**: Triggered when required parameters (`student_name`, `roll_number`, `email`) are empty or when an email lacks `@`.
3. **`404 Not Found`**: Triggered when attempting to query or register for a non-existent `event_id`.
4. **`409 Conflict`**: Triggered when either:
   * The event has reached capacity (`available_seats <= 0`).
   * The student's email has already registered for that specific event (enforced by application logic and SQLite's `UNIQUE(event_id, email)` database constraint).

Seeing these errors surface directly in Postman proved why client-side validation is purely for user experience (reducing latency), whereas server-side validation is necessary for system security and data integrity.

---

## 3. Concept 3: API Contracts & Postman Verification

In PM2-02, we studied **API Contracts**—the formal agreement between frontend and backend teams defining endpoints, request bodies, query parameters, and response structures.

* **Decoupled Development:** Because the contract was defined beforehand in Step 2 ([`models.py`](backend/models.py)) and Step 3 ([`main.py`](backend/main.py)), the frontend could be built to consume exact endpoints (`GET /api/events`, `POST /api/events/{id}/register`, `GET /api/stats`) without guessing data types or key names.
* **Testing Beyond the UI:** Using Postman ([`zenith26-api.postman_collection.json`](zenith26-api.postman_collection.json)), I tested the backend independently of the browser. Testing via Postman made it immediately obvious whether a bug was a server validation error (e.g., returning 400 vs 409) or a UI display glitch in JavaScript.

---

## 4. Product Management Takeaways from Vibe Coding

Directing Antigravity through small, sequential prompt blocks taught me how a PM must communicate requirements:
1. **Incremental Verification:** Reviewing each step (schema $\rightarrow$ models $\rightarrow$ API $\rightarrow$ frontend $\rightarrow$ admin) prevented cascading failures.
2. **Precise Specifications:** Vague instructions produce generic code. Specifying status codes, edge cases (0 seats remaining showing a `FULL` badge), and database constraints produced an enterprise-grade prototype on the first pass.
