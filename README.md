# Zenith '26 — College Fest Management System

A full-stack, native mobile and backend festival management platform built for **Zenith '26**, the annual inter-college technical and cultural mega-fest.

---

## 🛠️ Tech Stack

- **Android App:** Native Android in Kotlin with Jetpack Compose, Material 3, and Coroutines
- **Backend:** Python 3.14 + FastAPI + Uvicorn + Pydantic v2
- **Database:** SQLite3 (`fest.db`) with Foreign Keys and relational schema
- **Data Import / Seeding:** `openpyxl` reading spreadsheet data from `data/events_seed.xlsx`
- **Testing & API Verification:** Postman Collection (`zenith26-api.postman_collection.json`) + Automated Test Suite (`test_api.py`)

---

## 📁 Project Structure

```text
zenith26-fest-system/
├── backend/
│   ├── main.py          # FastAPI application, CORS, lifespan startup, API endpoints
│   ├── database.py      # SQLite connection helper and table schema initialization
│   ├── models.py        # Pydantic schemas (EventOut, RegistrationIn/Out, StatsOut, etc.)
│   └── seed_data.py     # Spreadsheet parser populating events from events_seed.xlsx
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/zenith26/fest/
│   │   │   │   ├── MainActivity.kt        # Root Activity and Scaffold navigation
│   │   │   │   ├── api/
│   │   │   │   │   └── ApiClient.kt       # Coroutine HTTP client with configurable Base URL
│   │   │   │   ├── models/
│   │   │   │   │   ├── Event.kt           # Event data classes and computed fields
│   │   │   │   │   ├── Registration.kt    # Registration request & response models
│   │   │   │   │   └── Stats.kt           # Fest live statistics and UiState models
│   │   │   │   ├── screens/
│   │   │   │   │   ├── EventListScreen.kt       # Student portal with cards, search & filter
│   │   │   │   │   ├── EventDetailModal.kt      # Detailed view & student registration form
│   │   │   │   │   └── AdminDashboardScreen.kt  # Operations dashboard & capacity monitoring
│   │   │   │   └── components/
│   │   │   │       ├── Navbar.kt          # Top navbar, ⚡ logo, view toggle & settings
│   │   │   │       ├── HeroSection.kt     # Fest banner, dates, venue & flagship tags
│   │   │   │       ├── CategoryFilter.kt  # Filter chips (All, Technical, Cultural, etc.)
│   │   │   │       ├── SearchBar.kt       # Search input with clear button
│   │   │   │       ├── EventCard.kt       # Event card with FULL badge & fade-in animation
│   │   │   │       ├── StatCard.kt        # 4 live metric cards & category breakdown
│   │   │   │       └── StateViews.kt      # Loading spinner, Error alert & Empty state
│   │   │   ├── res/
│   │   │   │   ├── values/ (colors.xml, strings.xml, themes.xml)
│   │   │   │   └── drawable/ (ic_launcher.xml)
│   │   │   └── AndroidManifest.xml        # Internet permission & cleartext network config
│   │   └── build.gradle.kts
│   ├── build.gradle.kts
│   ├── settings.gradle.kts
│   └── gradle.properties
├── data/
│   └── events_seed.xlsx                   # Companion spreadsheet with 14 flagship events
├── frontend/                              # Companion web UI (accessible at http://localhost:8001)
│   ├── index.html
│   ├── admin.html
│   └── js/
├── requirements.txt
├── test_api.py                            # End-to-end Python test verification script
├── zenith26-api.postman_collection.json   # Ready-to-import Postman test collection
├── Postman-Testing-Commands-Zenith26.md   # Testing checklist with 18 test cases
└── README.md
```

---

## 🚀 How to Run the Backend

### 1. Setup Virtual Environment & Install Dependencies
From the `zenith26-fest-system` directory:
```bash
# If not already created:
python -m venv .venv

# Activate virtual environment (PowerShell):
.\.venv\Scripts\Activate.ps1

# Install requirements:
pip install -r requirements.txt
```

### 2. Seed the Database
```bash
python backend/seed_data.py
```
This imports all 14 flagship events from `data/events_seed.xlsx` into `fest.db`.

### 3. Start the FastAPI Server
```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8001
```
- Interactive OpenAPI Docs: [http://localhost:8001/docs](http://localhost:8001/docs)
- Companion Web UI: [http://localhost:8001/](http://localhost:8001/)
- Admin Operations Portal: [http://localhost:8001/admin.html](http://localhost:8001/admin.html)

---

## 📱 How to Build and Run the Android App

1. Open **Android Studio** (Hedgehog / Iguana / Jellyfish or newer).
2. Choose **Open Project** and navigate to `zenith26-fest-system/android`.
3. Let Gradle sync project dependencies.
4. Run on an **Android Emulator** or physical device:
   - **Android Emulator:** The app connects to the host machine via `http://10.0.2.2:8001` by default.
   - **Physical Device:** Connect to the same Wi-Fi network as your computer, tap the ⚙️ icon in the top navbar of the app, and enter your computer's LAN IP (e.g., `http://192.168.1.50:8001`).

---

## 🌐 API Contract Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/events` | List events with computed `available_seats`. Supports `?category=` and `?search=` query parameters. |
| `GET` | `/api/events/{event_id}` | Fetch a single event's details. Returns 404 if not found. |
| `POST` | `/api/events/{event_id}/register` | Register a student for an event. Performs server-side validation (empty fields -> 400, invalid email -> 400, full event -> 409, duplicate email -> 409). Returns 201. |
| `GET` | `/api/registrations` | Fetch registration roster with event titles. Supports `?event_id=` filter. |
| `GET` | `/api/stats` | Real-time computed metrics: `total_events`, `total_registrations`, `total_capacity`, `overall_utilization_pct`, `upcoming_events_count`, `events_by_category`. |
| `POST` | `/api/events` | *(Stretch Goal)* Admin creates a new event. Validates required fields and positive capacity. Returns 201. |
| `DELETE` | `/api/registrations/{id}` | *(Stretch Goal)* Admin cancels a registration and immediately frees up a seat. |

---

## 🧪 Automated & Postman Testing

- Run the automated test suite:
  ```bash
  python test_api.py
  ```
- Import `zenith26-api.postman_collection.json` into Postman and follow [`Postman-Testing-Commands-Zenith26.md`](Postman-Testing-Commands-Zenith26.md).
