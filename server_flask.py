"""
Academia Learning Management System (LMS) - Full Python / Flask Backend
This provides the complete REST API in Python using the Flask framework and SQLAlchemy/PyMySQL.
"""

import os
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, text

app = Flask(__name__)
CORS(app)

# Database Configuration (MySQL default with SQLite fallback)
DB_TYPE = os.getenv("DB_TYPE", "sqlite").lower()
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "academia_lms")

if DB_TYPE == "mysql":
    DATABASE_URI = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
else:
    DATABASE_URI = f"sqlite:///{os.getenv('SQLITE_PATH', 'lms_data.sqlite')}"

engine = create_engine(DATABASE_URI, echo=False)

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "framework": "Flask (Python)",
        "database": DB_TYPE
    })

# --- Authentication & User Security ---
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
            text("SELECT id, password FROM users WHERE id = :id"),
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
        # Check uniqueness
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

# --- Faculty Instructors API with Role Protection ---
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
        # Provision faculty user account
        username = email.split("@")[0]
        conn.execute(
            text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'instructor123', 'instructor', :ref, :n, :e)"),
            {"u": username, "ref": inst_id, "n": name, "e": email}
        )

    return jsonify({"id": inst_id, "name": name, "email": email, "specialization": spec, "status": status}), 201

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
                "w": data.get("duration_weeks"),
                "f": data.get("fee"),
                "st": data.get("status", "Active")
            }
        )
        course_id = res.lastrowid
    return jsonify({"id": course_id, **data}), 201

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
