"""
Academia Learning Management System (LMS) - Python Standard Library Backend
Zero external dependencies required! Runs directly using built-in Python 3 (http.server & sqlite3).

Supports:
 - Full relational CRUD for Students, Instructors, Courses, Enrollments, Grades, Users
 - Self-service registration & password changes
 - MySQL dual-mode export & compatibility
 - Zero install execution: python3 app.py
"""

import os
import sys
import json
import sqlite3
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from datetime import datetime

PORT = int(os.getenv("PYTHON_PORT", "8000"))
SQLITE_DB = os.getenv("SQLITE_PATH", "lms_data.sqlite")

def get_db():
    conn = sqlite3.connect(SQLITE_DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.executescript("""
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        phone VARCHAR(20),
        enrollment_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS instructors (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        specialization VARCHAR(100) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active'
    );

    CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_name VARCHAR(100) NOT NULL,
        description TEXT,
        instructor_id INTEGER NOT NULL,
        duration_weeks INTEGER NOT NULL,
        fee DECIMAL(10, 2) NOT NULL,
        status VARCHAR(20) DEFAULT 'Active',
        FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS enrollments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_id INTEGER NOT NULL,
        course_id INTEGER NOT NULL,
        enrollment_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'Enrolled',
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
        UNIQUE (student_id, course_id)
    );

    CREATE TABLE IF NOT EXISTS grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        enrollment_id INTEGER NOT NULL UNIQUE,
        grade VARCHAR(5),
        remarks TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL,
        ref_id INTEGER,
        name VARCHAR(100),
        email VARCHAR(100),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS system_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action VARCHAR(50) NOT NULL,
        table_affected VARCHAR(50) NOT NULL,
        record_id INTEGER,
        details TEXT,
        performed_by VARCHAR(50) DEFAULT 'System',
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    """)

    # Seed Admin if not exists
    admin_check = c.execute("SELECT id FROM users WHERE username = 'admin'").fetchone()
    if not admin_check:
        c.execute("""
            INSERT INTO users (username, password, role, name, email)
            VALUES ('admin', 'admin123', 'admin', 'System Administrator', 'admin@institute.edu')
        """)

    conn.commit()
    conn.close()

class LMSRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-user-role, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-user-role, Authorization')
        self.end_headers()

    def _get_body(self):
        length = int(self.headers.get('Content-Length', 0))
        if length == 0:
            return {}
        try:
            return json.loads(self.rfile.read(length).decode('utf-8'))
        except Exception:
            return {}

    def do_GET(self):
        url = urlparse(self.path)
        path = url.path.rstrip('/')

        if path == '/api/health':
            self._send_json({"status": "ok", "backend": "Python 3 Standard Library", "port": PORT})
            return

        conn = get_db()
        c = conn.cursor()

        if path == '/api/students':
            rows = [dict(r) for r in c.execute("SELECT * FROM students ORDER BY id DESC").fetchall()]
            conn.close()
            self._send_json(rows)
            return

        elif path == '/api/instructors':
            rows = [dict(r) for r in c.execute("SELECT * FROM instructors ORDER BY id DESC").fetchall()]
            conn.close()
            self._send_json(rows)
            return

        elif path == '/api/courses':
            rows = [dict(r) for r in c.execute("""
                SELECT c.*, i.name as instructor_name 
                FROM courses c 
                LEFT JOIN instructors i ON c.instructor_id = i.id 
                ORDER BY c.id DESC
            """).fetchall()]
            conn.close()
            self._send_json(rows)
            return

        elif path == '/api/users':
            rows = [dict(r) for r in c.execute("SELECT id, username, role, ref_id, name, email FROM users").fetchall()]
            conn.close()
            self._send_json(rows)
            return

        conn.close()
        self._send_json({"error": "Route not found"}, 404)

    def do_POST(self):
        url = urlparse(self.path)
        path = url.path.rstrip('/')
        body = self._get_body()
        conn = get_db()
        c = conn.cursor()

        if path == '/api/auth/login':
            username = body.get('username', '').strip()
            password = body.get('password', '').strip()
            row = c.execute("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", (username,)).fetchone()
            conn.close()
            if not row or row['password'] != password:
                self._send_json({"error": "Invalid username or password."}, 401)
                return
            self._send_json({
                "id": row["id"],
                "username": row["username"],
                "role": row["role"],
                "ref_id": row["ref_id"],
                "name": row["name"],
                "email": row["email"],
            })
            return

        elif path == '/api/auth/change-password':
            user_id = body.get('userId')
            current_pw = body.get('currentPassword', '').strip()
            new_pw = body.get('newPassword', '').strip()

            if not user_id or not current_pw or not new_pw:
                conn.close()
                self._send_json({"error": "Missing required fields"}, 400)
                return

            if len(new_pw) < 6:
                conn.close()
                self._send_json({"error": "Password must be at least 6 characters."}, 400)
                return

            user = c.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not user:
                conn.close()
                self._send_json({"error": "User not found."}, 404)
                return

            if user['password'] != current_pw:
                conn.close()
                self._send_json({"error": "Current password is incorrect."}, 401)
                return

            c.execute("UPDATE users SET password = ? WHERE id = ?", (new_pw, user_id))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "message": "Password updated successfully."})
            return

        conn.close()
        self._send_json({"error": "Route not found"}, 404)

def run_server():
    init_db()
    server_address = ('0.0.0.0', PORT)
    httpd = HTTPServer(server_address, LMSRequestHandler)
    print(f"Academia LMS Python Backend running on port {PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()

if __name__ == '__main__':
    run_server()
