# Zenith '26 API Testing Guide — Postman Commands & Test Cases

This companion guide details all test requests, payloads, status codes, and response expectations for the **Zenith '26 College Fest Management System**.

---

## 🛠️ Setup Instructions

1. **Start the backend server:**
   ```bash
   cd zenith26-fest-system
   .\.venv\Scripts\uvicorn backend.main:app --reload --port 8001
   ```
2. **Open Postman Desktop:**
   - Click **Import** in the top left.
   - Choose `zenith26-api.postman_collection.json` located in your project root.
   - The collection uses the variable `{{baseUrl}} = http://localhost:8001`.

---

## 🧪 Test Requests Checklist

### 1. Events Endpoints

#### Request 1: Get All Events
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/events`
- **Expected Status:** `200 OK`
- **Expected Response:** JSON array with 14 event objects. Each event contains `id`, `title`, `category`, `venue`, `capacity`, `fee`, `icon`, and `available_seats`.

#### Request 2: Filter by Category (Technical)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/events?category=Technical`
- **Expected Status:** `200 OK`
- **Expected Response:** Array of 4 events (`Code Sprint 2.0`, `Robo Race`, `AI Pitch Fest`, `Web Design Rumble`).

#### Request 3: Search Events by Title
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/events?search=code`
- **Expected Status:** `200 OK`
- **Expected Response:** Array containing `Code Sprint 2.0` and `Intro to Vibe Coding`.

#### Request 4: Get Single Event Detail
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/events/1`
- **Expected Status:** `200 OK`
- **Expected Response:** Single object for `Code Sprint 2.0` with `id: 1`.

#### Request 5: Get Non-existent Event (404 Error Case)
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/events/999`
- **Expected Status:** `404 Not Found`
- **Expected Body:**
  ```json
  {
    "detail": "Event not found"
  }
  ```

---

### 2. Registration Endpoints

#### Request 6: Successful Registration
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/events/1/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "student_name": "Rohan Sharma",
    "roll_number": "CS2026-088",
    "email": "rohan.sharma@campus.edu",
    "phone": "+91 9876543210"
  }
  ```
- **Expected Status:** `201 Created`
- **Expected Body:**
  ```json
  {
    "id": 1,
    "event_id": 1,
    "student_name": "Rohan Sharma",
    "registered_at": "2026-10-12 12:35:00"
  }
  ```

#### Request 7: Invalid Email (400 Bad Request)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/events/1/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "student_name": "Rohan Sharma",
    "roll_number": "CS2026-088",
    "email": "invalidemail.com",
    "phone": "+91 9876543210"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Body:**
  ```json
  {
    "detail": "Invalid email address: must contain '@'"
  }
  ```

#### Request 8: Missing Required Field (400 Bad Request)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/events/1/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "student_name": "",
    "roll_number": "CS2026-088",
    "email": "rohan@campus.edu"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Expected Body:**
  ```json
  {
    "detail": "student_name, roll_number, and email are required fields"
  }
  ```

#### Request 9: Duplicate Registration (409 Conflict)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/events/1/register`
- **Headers:** `Content-Type: application/json`
- **Body:** (Same email registered previously in Request 6)
  ```json
  {
    "student_name": "Rohan Sharma",
    "roll_number": "CS2026-088",
    "email": "rohan.sharma@campus.edu",
    "phone": "+91 9876543210"
  }
  ```
- **Expected Status:** `409 Conflict`
- **Expected Body:**
  ```json
  {
    "detail": "Already registered"
  }
  ```

---

### 3. Roster & Analytics Endpoints

#### Request 10: List All Registrations
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/registrations`
- **Expected Status:** `200 OK`
- **Expected Response:** Array of registered students with `event_title` joined.

#### Request 11: Filter Registrations by Event
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/registrations?event_id=1`
- **Expected Status:** `200 OK`
- **Expected Response:** Only registrations for event #1.

#### Request 12: Live Fest Statistics
- **Method:** `GET`
- **URL:** `{{baseUrl}}/api/stats`
- **Expected Status:** `200 OK`
- **Expected Body Structure:**
  ```json
  {
    "total_events": 14,
    "total_registrations": 1,
    "total_capacity": 1467,
    "overall_utilization_pct": 0.1,
    "upcoming_events_count": 14,
    "events_by_category": {
      "Technical": 4,
      "Cultural": 5,
      "Sports": 2,
      "Gaming": 1,
      "Workshop": 2
    }
  }
  ```

---

### 4. Admin Stretch Capabilities

#### Request 13: Add New Event (Stretch)
- **Method:** `POST`
- **URL:** `{{baseUrl}}/api/events`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "title": "Robo Wars Championship",
    "category": "Technical",
    "description": "Heavyweight combat robots clash in the steel arena.",
    "event_date": "2026-11-15",
    "event_time": "04:00 PM",
    "venue": "Mechanical Workshop Arena",
    "capacity": 50,
    "fee": 100,
    "icon": "⚡"
  }
  ```
- **Expected Status:** `201 Created`

#### Request 14: Delete Registration (Stretch)
- **Method:** `DELETE`
- **URL:** `{{baseUrl}}/api/registrations/1`
- **Expected Status:** `200 OK`
- **Expected Body:**
  ```json
  {
    "success": true,
    "message": "Registration 1 for 'Rohan Sharma' successfully cancelled",
    "event_id": 1
  }
  ```
