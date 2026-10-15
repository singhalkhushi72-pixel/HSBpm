from contextlib import asynccontextmanager
from datetime import datetime, date
from pathlib import Path
from typing import List, Optional, Dict

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from backend.database import get_db_connection, init_db
from backend.models import (
    EventOut,
    EventDetail,
    EventCreate,
    RegistrationIn,
    RegistrationOut,
    RegistrationDetailOut,
    StatsOut,
)
from backend.seed_data import seed_events

BASE_DIR = Path(__file__).resolve().parent.parent

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize SQLite DB and seed events if empty
    init_db()
    try:
        seed_events()
    except Exception as e:
        print(f"Seed initialization note: {e}")
    yield

app = FastAPI(
    title="Zenith '26 College Fest Management System",
    description="REST API powering the student event portal and admin dashboard.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local development (browser, emulator 10.0.2.2, device LAN)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# API Endpoints
# ==========================================

@app.get(
    "/api/events",
    response_model=List[EventOut],
    summary="List events with live available seat counts",
)
def get_events(
    category: Optional[str] = Query(None, description="Filter by event category"),
    search: Optional[str] = Query(None, description="Search in event title (case-insensitive)"),
):
    conn = get_db_connection()
    query = """
    SELECT 
        e.id, e.title, e.category, e.description, e.event_date, e.event_time, 
        e.venue, e.capacity, e.fee, e.icon,
        (e.capacity - COALESCE(reg_counts.registered_count, 0)) AS available_seats
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) AS registered_count
        FROM registrations
        GROUP BY event_id
    ) reg_counts ON e.id = reg_counts.event_id
    WHERE 1=1
    """
    params = []

    if category and category.strip() and category.strip().lower() != "all":
        query += " AND LOWER(e.category) = LOWER(?)"
        params.append(category.strip())

    if search and search.strip():
        query += " AND LOWER(e.title) LIKE LOWER(?)"
        params.append(f"%{search.strip()}%")

    query += " ORDER BY e.id ASC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        EventOut(
            id=r["id"],
            title=r["title"],
            category=r["category"],
            description=r["description"],
            event_date=r["event_date"],
            event_time=r["event_time"],
            venue=r["venue"],
            capacity=r["capacity"],
            fee=r["fee"],
            icon=r["icon"],
            available_seats=max(0, r["available_seats"]),
        )
        for r in rows
    ]


@app.get(
    "/api/events/{event_id}",
    response_model=EventDetail,
    summary="Get detailed information for a single event",
)
def get_event(event_id: int):
    conn = get_db_connection()
    query = """
    SELECT 
        e.id, e.title, e.category, e.description, e.event_date, e.event_time, 
        e.venue, e.capacity, e.fee, e.icon,
        (e.capacity - COALESCE(reg_counts.registered_count, 0)) AS available_seats
    FROM events e
    LEFT JOIN (
        SELECT event_id, COUNT(*) AS registered_count
        FROM registrations
        GROUP BY event_id
    ) reg_counts ON e.id = reg_counts.event_id
    WHERE e.id = ?
    """
    row = conn.execute(query, (event_id,)).fetchone()
    conn.close()

    if not row:
        raise HTTPException(status_code=404, detail="Event not found")

    return EventDetail(
        id=row["id"],
        title=row["title"],
        category=row["category"],
        description=row["description"],
        event_date=row["event_date"],
        event_time=row["event_time"],
        venue=row["venue"],
        capacity=row["capacity"],
        fee=row["fee"],
        icon=row["icon"],
        available_seats=max(0, row["available_seats"]),
    )


@app.post(
    "/api/events/{event_id}/register",
    response_model=RegistrationOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a student for an event",
)
def register_for_event(event_id: int, reg_data: RegistrationIn):
    # Server-side validation: do NOT trust client checks
    student_name = reg_data.student_name.strip() if reg_data.student_name else ""
    roll_number = reg_data.roll_number.strip() if reg_data.roll_number else ""
    email = reg_data.email.strip() if reg_data.email else ""
    phone = reg_data.phone.strip() if reg_data.phone else None

    if not student_name or not roll_number or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="student_name, roll_number, and email are required fields",
        )

    if "@" not in email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email address: must contain '@'",
        )

    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Verify event exists
    event = cursor.execute("SELECT id, capacity, title FROM events WHERE id = ?", (event_id,)).fetchone()
    if not event:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Event with id {event_id} does not exist",
        )

    # 2. Check current capacity
    reg_count = cursor.execute(
        "SELECT COUNT(*) AS count FROM registrations WHERE event_id = ?",
        (event_id,),
    ).fetchone()["count"]

    if reg_count >= event["capacity"]:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Event is full",
        )

    # 3. Check for duplicate registration by email for this event
    existing = cursor.execute(
        "SELECT id FROM registrations WHERE event_id = ? AND LOWER(email) = LOWER(?)",
        (event_id, email),
    ).fetchone()

    if existing:
        conn.close()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Already registered",
        )

    # 4. Insert registration with server timestamp
    registered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        """
        INSERT INTO registrations (event_id, student_name, roll_number, email, phone, registered_at)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (event_id, student_name, roll_number, email, phone, registered_at),
    )
    reg_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return RegistrationOut(
        id=reg_id,
        event_id=event_id,
        student_name=student_name,
        registered_at=registered_at,
    )


@app.get(
    "/api/registrations",
    response_model=List[RegistrationDetailOut],
    summary="List registrations with event title",
)
def get_registrations(event_id: Optional[int] = Query(None, description="Filter by event ID")):
    conn = get_db_connection()
    query = """
    SELECT 
        r.id, r.event_id, r.student_name, r.roll_number, r.email, r.phone, 
        r.registered_at, e.title AS event_title
    FROM registrations r
    JOIN events e ON r.event_id = e.id
    """
    params = []

    if event_id is not None:
        query += " WHERE r.event_id = ?"
        params.append(event_id)

    query += " ORDER BY r.id DESC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    return [
        RegistrationDetailOut(
            id=r["id"],
            event_id=r["event_id"],
            student_name=r["student_name"],
            roll_number=r["roll_number"],
            email=r["email"],
            phone=r["phone"],
            registered_at=r["registered_at"],
            event_title=r["event_title"],
        )
        for r in rows
    ]


@app.get(
    "/api/stats",
    response_model=StatsOut,
    summary="Real-time festival statistics and metrics",
)
def get_stats():
    conn = get_db_connection()

    # Total events & total capacity
    events_summary = conn.execute(
        "SELECT COUNT(*) AS total_events, COALESCE(SUM(capacity), 0) AS total_capacity FROM events"
    ).fetchone()
    total_events = events_summary["total_events"]
    total_capacity = events_summary["total_capacity"]

    # Total registrations
    total_registrations = conn.execute(
        "SELECT COUNT(*) AS total_reg FROM registrations"
    ).fetchone()["total_reg"]

    # Overall utilization percentage
    overall_utilization_pct = 0.0
    if total_capacity > 0:
        overall_utilization_pct = round((total_registrations / total_capacity) * 100.0, 1)

    # Upcoming events count (event_date today or later)
    today_str = date.today().isoformat()
    upcoming_events_count = conn.execute(
        "SELECT COUNT(*) AS count FROM events WHERE event_date >= ?",
        (today_str,),
    ).fetchone()["count"]

    # Events breakdown by category
    category_rows = conn.execute(
        "SELECT category, COUNT(*) AS count FROM events GROUP BY category"
    ).fetchall()
    events_by_category: Dict[str, int] = {r["category"]: r["count"] for r in category_rows}

    conn.close()

    return StatsOut(
        total_events=total_events,
        total_registrations=total_registrations,
        total_capacity=total_capacity,
        overall_utilization_pct=overall_utilization_pct,
        upcoming_events_count=upcoming_events_count,
        events_by_category=events_by_category,
    )


# ==========================================
# Stretch Goals Endpoints
# ==========================================

@app.post(
    "/api/events",
    response_model=EventDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Admin adds a new event (Stretch Goal)",
)
def create_event(event_in: EventCreate):
    title = event_in.title.strip()
    category = event_in.category.strip()
    venue = event_in.venue.strip()
    event_date = event_in.event_date.strip()
    event_time = event_in.event_time.strip()

    if not title or not category or not venue or not event_date or not event_time:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Title, category, venue, event_date, and event_time are required",
        )

    if event_in.capacity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Capacity must be a positive integer greater than 0",
        )

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        """
        INSERT INTO events (title, category, description, event_date, event_time, venue, capacity, fee, icon)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            title,
            category,
            event_in.description.strip() if event_in.description else "",
            event_date,
            event_time,
            venue,
            event_in.capacity,
            event_in.fee,
            event_in.icon or "📅",
        ),
    )
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return EventDetail(
        id=new_id,
        title=title,
        category=category,
        description=event_in.description or "",
        event_date=event_date,
        event_time=event_time,
        venue=venue,
        capacity=event_in.capacity,
        fee=event_in.fee,
        icon=event_in.icon or "📅",
        available_seats=event_in.capacity,
    )


@app.delete(
    "/api/registrations/{registration_id}",
    summary="Admin cancels a registration (Stretch Goal)",
)
def delete_registration(registration_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    reg = cursor.execute("SELECT id, event_id, student_name FROM registrations WHERE id = ?", (registration_id,)).fetchone()
    if not reg:
        conn.close()
        raise HTTPException(status_code=404, detail="Registration not found")

    cursor.execute("DELETE FROM registrations WHERE id = ?", (registration_id,))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Registration {registration_id} for '{reg['student_name']}' successfully cancelled",
        "event_id": reg["event_id"],
    }


# ==========================================
# Frontend Static Files Serving (Companion)
# ==========================================
frontend_dir = BASE_DIR / "frontend"
if frontend_dir.exists():
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse

    if (frontend_dir / "js").exists():
        app.mount("/js", StaticFiles(directory=frontend_dir / "js"), name="js")

    @app.get("/", include_in_schema=False)
    @app.get("/index.html", include_in_schema=False)
    def serve_index():
        return FileResponse(frontend_dir / "index.html")

    @app.get("/admin.html", include_in_schema=False)
    def serve_admin():
        return FileResponse(frontend_dir / "admin.html")

