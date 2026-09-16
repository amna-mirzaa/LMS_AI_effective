"""
Academia Learning Management System (LMS) - Full Python / Flask Server
Serves both:
 1. Full SPA Web Frontend (from dist/index.html)
 2. Full REST APIs (Students, Instructors, Courses, Enrollments, Grades, Auth, Logs)
 3. MySQL (PyMySQL) & SQLite dual-mode database engine
"""

import os
import sys
from datetime import datetime

try:
    from flask import Flask, request, jsonify, send_from_directory, render_template_string
    from flask_cors import CORS
    from sqlalchemy import create_engine, text
except ImportError as err:
    missing_mod = err.name if hasattr(err, 'name') else str(err)
    print("\n" + "=" * 65)
    print(f" [LMS ERROR] Missing Python package: '{missing_mod}'")
    print("=" * 65)
    print("\nPlease install the required packages in your Python environment:")
    print("    python -m pip install -r requirements.txt")
    print("\nOr install them directly:")
    print("    python -m pip install flask flask-cors sqlalchemy pymysql")
    print("=" * 65 + "\n")
    sys.exit(1)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

app = Flask(__name__, static_folder=DIST_DIR if os.path.exists(DIST_DIR) else None)
CORS(app)

# Database Configuration (MySQL default with SQLite fallback)
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "academia_lms")
SQLITE_PATH = os.path.join(BASE_DIR, os.getenv("SQLITE_PATH", "lms_data.sqlite"))

if DB_TYPE == "mysql":
    DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    DATABASE_URI = f"sqlite:///{SQLITE_PATH}"

engine = create_engine(DATABASE_URI, echo=False)

def log_system_action(conn, action: str, table_affected: str, record_id: int, details: str, performed_by: str = "System"):
    try:
        conn.execute(
            text("""
                INSERT INTO system_logs (action, table_affected, record_id, details, performed_by)
                VALUES (:act, :tbl, :rec, :det, :by)
            """),
            {"act": action, "tbl": table_affected, "rec": record_id, "det": details, "by": performed_by}
        )
    except Exception as e:
        print(f"[Audit Log Warning] {e}")

# ==========================================
# REST API ROUTES
# ==========================================

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "framework": "Flask (Python)",
        "database": DB_TYPE,
        "frontend_served": os.path.exists(os.path.join(DIST_DIR, "index.html"))
    })

# --- Authentication & User Security ---
@app.route("/api/auth/demo-users", methods=["GET"])
def get_demo_users():
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, username, password, role, ref_id, name, email 
                FROM users 
                ORDER BY 
                  CASE role 
                    WHEN 'admin' THEN 1 
                    WHEN 'instructor' THEN 2 
                    WHEN 'student' THEN 3 
                  END, id ASC
            """)
        ).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT id, username, password, role, ref_id, name, email FROM users WHERE LOWER(username) = LOWER(:u)"),
            {"u": username}
        ).mappings().first()

        if not result or result["password"] != password:
            return jsonify({"error": "Invalid username or password."}), 401

        return jsonify({
            "id": result["id"],
            "username": result["username"],
            "role": result["role"],
            "ref_id": result["ref_id"],
            "name": result["name"],
            "email": result["email"]
        })

@app.route("/api/auth/change-password", methods=["POST"])
def change_password():
    data = request.get_json() or {}
    user_id = data.get("userId")
    current_pw = data.get("currentPassword", "").strip()
    new_pw = data.get("newPassword", "").strip()

    if not user_id or not current_pw or not new_pw:
        return jsonify({"error": "Missing required fields."}), 400

    if len(new_pw) < 6:
        return jsonify({"error": "New password must be at least 6 characters."}), 400

    with engine.begin() as conn:
        user = conn.execute(
            text("SELECT id, password, username FROM users WHERE id = :id"),
            {"id": user_id}
        ).mappings().first()

        if not user:
            return jsonify({"error": "User account not found."}), 404

        if user["password"] != current_pw:
            return jsonify({"error": "Current password is incorrect."}), 401

        conn.execute(
            text("UPDATE users SET password = :p WHERE id = :id"),
            {"p": new_pw, "id": user_id}
        )
        log_system_action(conn, "CHANGE_PASSWORD", "users", user_id, f"Password updated for {user['username']}", user['username'])

    return jsonify({"success": True, "message": "Password updated successfully."})

@app.route("/api/auth/register-student", methods=["POST"])
def register_student():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    username = data.get("username", "").strip().lower()
    password = data.get("password", "").strip()

    if not name or not email or not username or not password:
        return jsonify({"error": "Name, email, username, and password are required."}), 400

    with engine.begin() as conn:
        if conn.execute(text("SELECT id FROM students WHERE LOWER(email) = :e"), {"e": email}).first():
            return jsonify({"error": "Email is already registered."}), 409

        if conn.execute(text("SELECT id FROM users WHERE LOWER(username) = :u"), {"u": username}).first():
            return jsonify({"error": "Username is already taken."}), 409

        today = datetime.now().strftime("%Y-%m-%d")
        res = conn.execute(
            text("INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (:n, :e, :p, :d, 'Active')"),
            {"n": name, "e": email, "p": phone, "d": today}
        )
        student_id = res.lastrowid

        res_u = conn.execute(
            text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, :p, 'student', :ref, :n, :e)"),
            {"u": username, "p": password, "ref": student_id, "n": name, "e": email}
        )
        user_id = res_u.lastrowid
        log_system_action(conn, "REGISTER_STUDENT", "students", student_id, f"Self-registered student {name} ({username})", username)

    return jsonify({
        "success": True,
        "user": {
            "id": user_id,
            "username": username,
            "role": "student",
            "ref_id": student_id,
            "name": name,
            "email": email
        }
    }), 201

# --- Students API ---
@app.route("/api/students", methods=["GET"])
def get_students():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM students ORDER BY id DESC")).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/students", methods=["POST"])
def create_student():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    status = data.get("status", "Active")
    enrollment_date = data.get("enrollment_date") or datetime.now().strftime("%Y-%m-%d")

    with engine.begin() as conn:
        if conn.execute(text("SELECT id FROM students WHERE LOWER(email) = :e"), {"e": email}).first():
            return jsonify({"error": f"Student with email '{email}' already exists."}), 409

        res = conn.execute(
            text("INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (:n, :e, :p, :d, :st)"),
            {"n": name, "e": email, "p": phone, "d": enrollment_date, "st": status}
        )
        student_id = res.lastrowid
        username = email.split("@")[0]
        conn.execute(
            text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'student123', 'student', :ref, :n, :e)"),
            {"u": username, "ref": student_id, "n": name, "e": email}
        )
        log_system_action(conn, "CREATE_STUDENT", "students", student_id, f"Created student {name}")

    return jsonify({"id": student_id, "name": name, "email": email, "phone": phone, "enrollment_date": enrollment_date, "status": status}), 201

@app.route("/api/students/<int:id>", methods=["PUT"])
def update_student(id):
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    status = data.get("status", "Active")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE students SET name = :n, email = :e, phone = :p, status = :st WHERE id = :id"),
            {"n": name, "e": email, "p": phone, "st": status, "id": id}
        )
        conn.execute(
            text("UPDATE users SET name = :n, email = :e WHERE ref_id = :id AND role = 'student'"),
            {"n": name, "e": email, "id": id}
        )
        log_system_action(conn, "UPDATE_STUDENT", "students", id, f"Updated student {name}")

    return jsonify({"id": id, **data})

@app.route("/api/students/<int:id>", methods=["DELETE"])
def delete_student(id):
    role = request.headers.get("x-user-role", "admin")
    if role != "admin":
        return jsonify({"error": "Access Denied: Only Administrators can delete students."}), 403

    with engine.begin() as conn:
        conn.execute(text("DELETE FROM users WHERE ref_id = :id AND role = 'student'"), {"id": id})
        conn.execute(text("DELETE FROM students WHERE id = :id"), {"id": id})
        log_system_action(conn, "DELETE_STUDENT", "students", id, f"Deleted student ID {id}")

    return jsonify({"success": True})

# --- Faculty Instructors API ---
@app.route("/api/instructors", methods=["GET"])
def get_instructors():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM instructors ORDER BY id DESC")).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/instructors", methods=["POST"])
def create_instructor():
    user_role = request.headers.get("x-user-role", "admin")
    if user_role == "student":
        return jsonify({"error": "Access Denied: Students are not permitted to add faculty."}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    spec = data.get("specialization", "").strip()
    status = data.get("status", "Active")

    with engine.begin() as conn:
        res = conn.execute(
            text("INSERT INTO instructors (name, email, specialization, status) VALUES (:n, :e, :s, :st)"),
            {"n": name, "e": email, "s": spec, "st": status}
        )
        inst_id = res.lastrowid
        username = email.split("@")[0]
        conn.execute(
            text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'instructor123', 'instructor', :ref, :n, :e)"),
            {"u": username, "ref": inst_id, "n": name, "e": email}
        )
        log_system_action(conn, "CREATE_INSTRUCTOR", "instructors", inst_id, f"Added faculty {name}")

    return jsonify({"id": inst_id, "name": name, "email": email, "specialization": spec, "status": status}), 201

@app.route("/api/instructors/<int:id>", methods=["PUT"])
def update_instructor(id):
    user_role = request.headers.get("x-user-role", "admin")
    if user_role == "student":
        return jsonify({"error": "Access Denied: Students cannot modify faculty."}), 403

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    spec = data.get("specialization", "").strip()
    status = data.get("status", "Active")

    with engine.begin() as conn:
        conn.execute(
            text("UPDATE instructors SET name = :n, email = :e, specialization = :s, status = :st WHERE id = :id"),
            {"n": name, "e": email, "s": spec, "st": status, "id": id}
        )
        conn.execute(
            text("UPDATE users SET name = :n, email = :e WHERE ref_id = :id AND role = 'instructor'"),
            {"n": name, "e": email, "id": id}
        )
        log_system_action(conn, "UPDATE_INSTRUCTOR", "instructors", id, f"Updated faculty {name}")

    return jsonify({"id": id, **data})

@app.route("/api/instructors/<int:id>", methods=["DELETE"])
def delete_instructor(id):
    user_role = request.headers.get("x-user-role", "admin")
    if user_role != "admin":
        return jsonify({"error": "Access Denied: Only Administrators can delete faculty."}), 403

    with engine.begin() as conn:
        assigned = conn.execute(text("SELECT id FROM courses WHERE instructor_id = :id"), {"id": id}).first()
        if assigned:
            return jsonify({"error": "Cannot delete instructor: active courses are currently assigned. Reassign courses first."}), 400

        conn.execute(text("DELETE FROM users WHERE ref_id = :id AND role = 'instructor'"), {"id": id})
        conn.execute(text("DELETE FROM instructors WHERE id = :id"), {"id": id})
        log_system_action(conn, "DELETE_INSTRUCTOR", "instructors", id, f"Deleted faculty ID {id}")

    return jsonify({"success": True})

# --- Courses API ---
@app.route("/api/courses", methods=["GET"])
def get_courses():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT c.*, i.name as instructor_name 
            FROM courses c 
            LEFT JOIN instructors i ON c.instructor_id = i.id 
            ORDER BY c.id DESC
        """)).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/courses", methods=["POST"])
def create_course():
    user_role = request.headers.get("x-user-role", "admin")
    if user_role == "student":
        return jsonify({"error": "Access Denied: Students cannot create courses."}), 403

    data = request.get_json() or {}
    with engine.begin() as conn:
        res = conn.execute(
            text("""
                INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status)
                VALUES (:c, :d, :i, :w, :f, :st)
            """),
            {
                "c": data.get("course_name"),
                "d": data.get("description", ""),
                "i": data.get("instructor_id"),
                "w": data.get("duration_weeks", 12),
                "f": data.get("fee", 0.0),
                "st": data.get("status", "Active")
            }
        )
        course_id = res.lastrowid
        log_system_action(conn, "CREATE_COURSE", "courses", course_id, f"Created course {data.get('course_name')}")

    return jsonify({"id": course_id, **data}), 201

@app.route("/api/courses/<int:id>", methods=["PUT"])
def update_course(id):
    user_role = request.headers.get("x-user-role", "admin")
    if user_role == "student":
        return jsonify({"error": "Access Denied: Students cannot modify courses."}), 403

    data = request.get_json() or {}
    with engine.begin() as conn:
        conn.execute(
            text("""
                UPDATE courses 
                SET course_name = :c, description = :d, instructor_id = :i, duration_weeks = :w, fee = :f, status = :st 
                WHERE id = :id
            """),
            {
                "c": data.get("course_name"),
                "d": data.get("description", ""),
                "i": data.get("instructor_id"),
                "w": data.get("duration_weeks"),
                "f": data.get("fee"),
                "st": data.get("status"),
                "id": id
            }
        )
        log_system_action(conn, "UPDATE_COURSE", "courses", id, f"Updated course {data.get('course_name')}")

    return jsonify({"id": id, **data})

@app.route("/api/courses/<int:id>", methods=["DELETE"])
def delete_course(id):
    user_role = request.headers.get("x-user-role", "admin")
    if user_role != "admin":
        return jsonify({"error": "Access Denied: Only Administrators can delete courses."}), 403

    with engine.begin() as conn:
        enrolled = conn.execute(text("SELECT id FROM enrollments WHERE course_id = :id"), {"id": id}).first()
        if enrolled:
            return jsonify({"error": "Cannot delete course: Students are currently enrolled. (Foreign Key RESTRICT integrity constraint)."}), 400

        conn.execute(text("DELETE FROM courses WHERE id = :id"), {"id": id})
        log_system_action(conn, "DELETE_COURSE", "courses", id, f"Deleted course ID {id}")

    return jsonify({"success": True})

# --- Enrollments & Grades ---
@app.route("/api/enrollments", methods=["GET"])
def get_enrollments():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT e.*, s.name as student_name, c.course_name, i.name as instructor_name,
                   g.grade, g.remarks, g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
            FROM enrollments e
            JOIN students s ON e.student_id = s.id
            JOIN courses c ON e.course_id = c.id
            LEFT JOIN instructors i ON c.instructor_id = i.id
            LEFT JOIN grades g ON e.id = g.enrollment_id
            ORDER BY e.id DESC
        """)).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/enrollments", methods=["POST"])
def create_enrollment():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    course_id = data.get("course_id")
    status = data.get("status", "Enrolled")
    date_str = data.get("enrollment_date") or datetime.now().strftime("%Y-%m-%d")

    with engine.begin() as conn:
        existing = conn.execute(
            text("SELECT id FROM enrollments WHERE student_id = :s AND course_id = :c"),
            {"s": student_id, "c": course_id}
        ).first()
        if existing:
            return jsonify({"error": "Student is already enrolled in this course."}), 409

        res = conn.execute(
            text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, :st)"),
            {"s": student_id, "c": course_id, "d": date_str, "st": status}
        )
        eid = res.lastrowid
        log_system_action(conn, "ENROLL", "enrollments", eid, f"Enrolled student #{student_id} into course #{course_id}")

    return jsonify({"id": eid, "student_id": student_id, "course_id": course_id, "enrollment_date": date_str, "status": status}), 201

# --- Student Portal APIs ---
@app.route("/api/student/portal/<int:student_id>", methods=["GET"])
def get_student_portal(student_id):
    with engine.connect() as conn:
        student = conn.execute(text("SELECT * FROM students WHERE id = :id"), {"id": student_id}).mappings().first()
        if not student:
            return jsonify({"error": "Student not found."}), 404

        enrollments = conn.execute(text("""
            SELECT 
                e.id as enrollment_id, e.student_id, e.course_id, e.enrollment_date, e.status as enrollment_status,
                c.course_name, c.description, c.duration_weeks, c.fee,
                i.name as instructor_name, i.email as instructor_email, i.specialization as instructor_specialization,
                g.id as grade_id, g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            JOIN instructors i ON c.instructor_id = i.id
            LEFT JOIN grades g ON e.id = g.enrollment_id
            WHERE e.student_id = :sid
            ORDER BY e.id DESC
        """), {"sid": student_id}).mappings().all()

        available = conn.execute(text("""
            SELECT 
                c.id, c.course_name, c.description, c.duration_weeks, c.fee, c.status,
                i.name as instructor_name, i.specialization as instructor_specialization
            FROM courses c
            JOIN instructors i ON c.instructor_id = i.id
            WHERE c.status IN ('Active', 'Upcoming')
            AND c.id NOT IN (
                SELECT course_id FROM enrollments WHERE student_id = :sid AND status IN ('Enrolled', 'Completed')
            )
            ORDER BY c.id ASC
        """), {"sid": student_id}).mappings().all()

        return jsonify({
            "student": dict(student),
            "enrollments": [dict(r) for r in enrollments],
            "availableCourses": [dict(r) for r in available]
        })

@app.route("/api/student/register-course", methods=["POST"])
def student_register_course():
    data = request.get_json() or {}
    student_id = data.get("student_id")
    course_id = data.get("course_id")
    today = datetime.now().strftime("%Y-%m-%d")

    with engine.begin() as conn:
        res = conn.execute(
            text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, 'Enrolled')"),
            {"s": student_id, "c": course_id, "d": today}
        )
        eid = res.lastrowid
        log_system_action(conn, "STUDENT_SELF_ENROLL", "enrollments", eid, f"Student #{student_id} self-registered for course #{course_id}")

    return jsonify({"success": True, "enrollment_id": eid}), 201

# --- System Logs & Users ---
@app.route("/api/logs", methods=["GET"])
def get_logs():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT * FROM system_logs ORDER BY id DESC LIMIT 200")).mappings().all()
        return jsonify([dict(r) for r in rows])

@app.route("/api/users", methods=["GET"])
def get_users():
    with engine.connect() as conn:
        rows = conn.execute(text("SELECT id, username, role, ref_id, name, email, created_at FROM users ORDER BY id ASC")).mappings().all()
        return jsonify([dict(r) for r in rows])

# ==========================================
# FRONTEND SPA SERVING & FALLBACK
# ==========================================

FALLBACK_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Academia LMS - Python Backend Active</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; display: flex; justify-content: center; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 640px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    h1 { margin-top: 0; color: #6366f1; font-size: 24px; display: flex; align-items: center; gap: 10px; }
    .status { display: inline-block; background: #065f46; color: #34d399; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 20px; }
    p { color: #cbd5e1; line-height: 1.6; font-size: 14px; }
    .code { background: #0f172a; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 13px; color: #38bdf8; margin: 12px 0; border: 1px solid #1e293b; }
    .btn-group { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 24px; }
    .btn { background: #4f46e5; color: white; text-decoration: none; padding: 10px 16px; border-radius: 8px; font-size: 13px; font-weight: 600; display: inline-block; transition: background 0.2s; }
    .btn:hover { background: #4338ca; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status">● Python Backend Online (Port 5000)</div>
    <h1>Academia LMS API Server</h1>
    <p>The Python Flask backend is active and connected to <strong>{{ db_type.upper() }}</strong> database.</p>
    
    <div style="background: #172554; border: 1px solid #1e40af; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #93c5fd; font-size: 15px;">To Access the Full Interactive Web Application:</h3>
      <p style="margin: 0; color: #bfdbfe; font-size: 13px;">
        1. In your VS Code terminal, build the client-side bundle:
      </p>
      <div class="code">npm run build</div>
      <p style="margin: 0; color: #bfdbfe; font-size: 13px;">
        2. Refresh this page (<strong>http://127.0.0.1:5000/</strong>) and Flask will immediately serve the complete React LMS interface!
      </p>
    </div>

    <h3 style="color: #e2e8f0; font-size: 14px; margin-top: 24px;">Explore Live Python API Endpoints:</h3>
    <div class="btn-group">
      <a class="btn btn-secondary" href="/api/health" target="_blank">Health Check</a>
      <a class="btn btn-secondary" href="/api/courses" target="_blank">Courses API</a>
      <a class="btn btn-secondary" href="/api/students" target="_blank">Students API</a>
      <a class="btn btn-secondary" href="/api/instructors" target="_blank">Faculty API</a>
      <a class="btn btn-secondary" href="/api/auth/demo-users" target="_blank">Demo Accounts</a>
    </div>
  </div>
</body>
</html>
"""

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_spa(path):
    # Do not intercept API requests
    if path.startswith("api/"):
        return jsonify({"error": f"API route '/{path}' not found."}), 404

    # Check if a static file or build exists in dist
    if os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, path)
        if path != "" and os.path.exists(file_path) and os.path.isfile(file_path):
            return send_from_directory(DIST_DIR, path)
        index_file = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_file):
            return send_from_directory(DIST_DIR, "index.html")

    # Fallback status page if dist is not yet built
    return render_template_string(FALLBACK_HTML, db_type=DB_TYPE)

if __name__ == "__main__":
    print(f"\n========================================================")
    print(f" Academia LMS - Python Flask Server Active")
    print(f" Database: {DB_TYPE.upper()}")
    print(f" Web UI & API: http://127.0.0.1:5000/")
    print(f"========================================================\n")
    app.run(host="0.0.0.0", port=5000, debug=True)
