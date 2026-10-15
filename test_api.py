import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_all():
    print("Testing GET /api/events...")
    res = client.get("/api/events")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    events = res.json()
    assert len(events) >= 14, f"Expected at least 14 events, got {len(events)}"
    print(f"  OK: Fetched {len(events)} events. First event: {events[0]['title']}, Seats: {events[0]['available_seats']}")

    print("Testing GET /api/events?category=Technical...")
    res = client.get("/api/events?category=Technical")
    assert res.status_code == 200
    tech_events = res.json()
    assert len(tech_events) == 4, f"Expected 4 Technical events, got {len(tech_events)}"
    print(f"  OK: Fetched {len(tech_events)} Technical events.")

    print("Testing GET /api/events?search=design...")
    res = client.get("/api/events?search=design")
    assert res.status_code == 200
    design_events = res.json()
    assert len(design_events) == 2, f"Expected 2 search results for 'design', got {len(design_events)}"
    print(f"  OK: Fetched {len(design_events)} search results for 'design'.")

    print("Testing GET /api/events/1...")
    res = client.get("/api/events/1")
    assert res.status_code == 200
    ev1 = res.json()
    assert ev1["id"] == 1
    print(f"  OK: Fetched event id 1: {ev1['title']}")

    print("Testing GET /api/events/999 (404)...")
    res = client.get("/api/events/999")
    assert res.status_code == 404, f"Expected 404, got {res.status_code}"
    assert res.json()["detail"] == "Event not found"
    print("  OK: 404 returned correctly.")

    print("Testing POST /api/events/1/register (Success 201)...")
    reg_payload = {
        "student_name": "Antigravity Tester",
        "roll_number": "AGY-2026-001",
        "email": "tester@zenith26.edu",
        "phone": "+91 9999999999"
    }
    res = client.post("/api/events/1/register", json=reg_payload)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    reg_out = res.json()
    assert reg_out["event_id"] == 1
    assert reg_out["student_name"] == "Antigravity Tester"
    reg_id = reg_out["id"]
    print(f"  OK: Registered successfully with ID {reg_id}")

    print("Testing POST /api/events/1/register (Duplicate 409)...")
    res = client.post("/api/events/1/register", json=reg_payload)
    assert res.status_code == 409, f"Expected 409, got {res.status_code}"
    assert res.json()["detail"] == "Already registered"
    print("  OK: Duplicate registration rejected with 409 'Already registered'.")

    print("Testing POST /api/events/1/register (Invalid email 400)...")
    bad_email_payload = dict(reg_payload, email="notanemail")
    res = client.post("/api/events/1/register", json=bad_email_payload)
    assert res.status_code == 400
    assert "Invalid email" in res.json()["detail"]
    print("  OK: Invalid email rejected with 400.")

    print("Testing POST /api/events/1/register (Missing name 400)...")
    missing_name_payload = dict(reg_payload, student_name="")
    res = client.post("/api/events/1/register", json=missing_name_payload)
    assert res.status_code == 400
    print("  OK: Missing required field rejected with 400.")

    print("Testing GET /api/registrations...")
    res = client.get("/api/registrations")
    assert res.status_code == 200
    regs = res.json()
    assert len(regs) >= 1
    assert "event_title" in regs[0]
    print(f"  OK: Fetched {len(regs)} registrations, including event title '{regs[0]['event_title']}'.")

    print("Testing GET /api/stats...")
    res = client.get("/api/stats")
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_events"] >= 14
    assert stats["total_registrations"] >= 1
    assert stats["total_capacity"] > 0
    assert stats["overall_utilization_pct"] > 0
    assert "Technical" in stats["events_by_category"]
    print(f"  OK: Stats live computed: Events={stats['total_events']}, Regs={stats['total_registrations']}, Util={stats['overall_utilization_pct']}%, Upcoming={stats['upcoming_events_count']}")

    print("Testing Stretch Goal: POST /api/events (Create Event 201)...")
    new_event_payload = {
        "title": "Robo Sumo Championship",
        "category": "Technical",
        "description": "Autonomous mini-bots clash in the circular ring.",
        "event_date": "2026-11-15",
        "event_time": "03:00 PM",
        "venue": "Robotics Arena",
        "capacity": 30,
        "fee": 50,
        "icon": "🤖"
    }
    res = client.post("/api/events", json=new_event_payload)
    assert res.status_code == 201
    created = res.json()
    print(f"  OK: Created new event ID {created['id']}: {created['title']}")

    print("Testing Stretch Goal: DELETE /api/registrations/{id}...")
    res = client.delete(f"/api/registrations/{reg_id}")
    assert res.status_code == 200
    del_res = res.json()
    assert del_res["success"] is True
    print(f"  OK: Registration {reg_id} deleted successfully.")

    print("\nALL API ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!")

if __name__ == "__main__":
    test_all()
