# Academia LMS - Python Backend Setup & Execution Guide

This project includes complete Python backends (both **Flask** with SQLAlchemy/MySQL and a standalone **FastAPI / Python 3 Standard Library** service) alongside a complete `requirements.txt` file.

---

## 1. Quick Installation (One-Line Package Install)
To install all required Python packages and frameworks in your local Python environment:

```bash
pip install -r requirements.txt
```

---

## 2. Configure Environment (`.env`)
Create or update your `.env` file in the project root:

```env
# Database Mode: "mysql" (for MySQL Workbench) or "sqlite"
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=academia_lms

# Gemini AI Copilot Key (Optional)
GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 3. Running the Python Server
You can choose whichever Python framework suits your preference:

### Option A: Flask Backend (`server_flask.py`)
Run the Flask API server:
```bash
python3 server_flask.py
```
Or with Flask CLI:
```bash
export FLASK_APP=server_flask.py
flask run --port=5000
```

### Option B: FastAPI Backend (`app.py`)
Run high-performance asynchronous FastAPI server:
```bash
uvicorn app:app --reload --port=8000
```

### Option C: Zero-Install Standalone Python Server (`app.py`)
If you don't have pip packages installed yet, `app.py` runs directly using Python 3's built-in standard library:
```bash
python3 app.py
```

---

## 4. API Features Implemented in Python
- **Role-Based Access Control**:
  - `POST /api/auth/login`: Authenticates Admins, Instructors, and Students.
  - `POST /api/auth/change-password`: Secure user self-service password update.
  - `POST /api/auth/register-student`: Student self-registration flow with auto-sync to `students` and `users`.
- **Protected Faculty Management**:
  - `GET /api/instructors`: Public faculty directory.
  - `POST /api/instructors`: Admin-only instructor creation; enforces 403 Forbidden for students.
- **Course Catalog & Registration**:
  - `GET /api/courses`: Available courses and enrolled student counts.
  - `POST /api/courses`: Admin-only course creation.
- **Relational Integrity**:
  - Foreign key constraints with `ON DELETE RESTRICT` (preventing orphan enrollments/courses) and `ON DELETE CASCADE` (grades & enrollment linkage).
