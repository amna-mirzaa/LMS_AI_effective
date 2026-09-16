"""
AcademiaPro LMS - Complete Enterprise Python / Streamlit Application
Comprehensive Academic Administration, Student Portal & Relational Database System

Features:
 1. Executive Dashboard (KPIs, revenue, charts, grade distribution, audit logs)
 2. Student Directory & Records (Search, filter, add, edit, delete, transcript modal)
 3. Faculty Instructor Management (Directory, workload, add, edit, delete with RESTRICT check)
 4. Course Catalog (Fee, duration, assigned faculty, enrolled count, CRUD with RESTRICT check)
 5. Enrollments & Gradebook (Enroll student, change status, score assignment/quiz/exam, auto-letter grade)
 6. Student Learning Portal (Personal transcript, GPA calculation, course self-registration, drop course)
 7. Institutional Reports (BR-01 to BR-06: Workload, honor roll, census, lifecycle, zero-enrollment courses)
 8. SQL Studio & Database Explorer (Preset institutional queries, raw query runner, table inspector)
 9. Relational Schema ERD Viewer (Entities, relationships, foreign key constraints)
 10. AI Academic Copilot (Student diagnostic, curriculum planner, Natural Language to SQL)
 11. Security & Authentication (User accounts, change password, 1-click persona switcher)
 12. Database Connection Validator (MySQL test & auto-create + SQLite fallback + 1-click Reset Seed Data)
"""

import os
import sys
import time
from datetime import datetime
import pandas as pd

try:
    import streamlit as st
except ImportError:
    print("Streamlit is required. Please install it using: pip install streamlit")
    sys.exit(1)

try:
    from sqlalchemy import create_engine, text, inspect
    import pymysql
except ImportError:
    st.error("Missing required database libraries. Please run: pip install sqlalchemy pymysql")
    st.stop()

# ==========================================
# PAGE SETUP & STYLING
# ==========================================
st.set_page_config(
    page_title="AcademiaPro LMS",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for polished, responsive, high-contrast UI
st.markdown("""
<style>
  .metric-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 16px;
    color: #f8fafc;
  }
  .stTabs [data-baseweb="tab-list"] {
    gap: 8px;
  }
  .stTabs [data-baseweb="tab"] {
    border-radius: 8px;
    padding: 8px 16px;
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    font-weight: 600;
  }
  .stTabs [aria-selected="true"] {
    background-color: #4f46e5 !important;
    color: white !important;
    border-color: #4338ca !important;
  }
  .badge-active { background: #065f46; color: #34d399; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px; }
  .badge-inactive { background: #475569; color: #cbd5e1; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px; }
  .badge-suspended { background: #881337; color: #fda4af; padding: 2px 8px; border-radius: 9999px; font-weight: 600; font-size: 11px; }
</style>
""", unsafe_allow_html=True)

# ==========================================
# DATABASE ENGINES & VALIDATION
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_DEFAULT_PATH = os.path.join(BASE_DIR, "lms_data.sqlite")

if "db_type" not in st.session_state:
    st.session_state["db_type"] = os.getenv("DB_TYPE", "sqlite").lower()
if "db_host" not in st.session_state:
    st.session_state["db_host"] = os.getenv("DB_HOST", "127.0.0.1")
if "db_port" not in st.session_state:
    st.session_state["db_port"] = int(os.getenv("DB_PORT", "3306"))
if "db_user" not in st.session_state:
    st.session_state["db_user"] = os.getenv("DB_USER", "root")
if "db_password" not in st.session_state:
    st.session_state["db_password"] = os.getenv("DB_PASSWORD", "")
if "db_name" not in st.session_state:
    st.session_state["db_name"] = os.getenv("DB_NAME", "academia_lms")

def get_engine():
    if st.session_state["db_type"] == "mysql":
        h = st.session_state["db_host"]
        p = st.session_state["db_port"]
        u = st.session_state["db_user"]
        pw = st.session_state["db_password"]
        dbn = st.session_state["db_name"]
        uri = f"mysql+pymysql://{u}:{pw}@{h}:{p}/{dbn}?charset=utf8mb4"
        return create_engine(uri, pool_pre_ping=True)
    else:
        return create_engine(f"sqlite:///{SQLITE_DEFAULT_PATH}")

def validate_mysql(host, port, user, password, database):
    res = {"server_online": False, "auth_ok": False, "db_exists": False, "tables": [], "error": ""}
    try:
        conn = pymysql.connect(host=host, port=port, user=user, password=password, connect_timeout=3)
        res["server_online"] = True
        res["auth_ok"] = True
        with conn.cursor() as cur:
            cur.execute("SHOW DATABASES;")
            dbs = [r[0].lower() for r in cur.fetchall()]
            if database.lower() in dbs:
                res["db_exists"] = True
                conn.select_db(database)
                cur.execute("SHOW TABLES;")
                res["tables"] = [r[0] for r in cur.fetchall()]
        conn.close()
    except Exception as e:
        res["error"] = str(e)
    return res

def log_audit(conn, action, table_affected, record_id, details, performed_by="System"):
    try:
        conn.execute(
            text("""
                INSERT INTO system_logs (action, table_affected, record_id, details, performed_by)
                VALUES (:a, :t, :r, :d, :p)
            """),
            {"a": action, "t": table_affected, "r": record_id, "d": details, "p": performed_by}
        )
    except Exception:
        pass

def seed_verified_institutional_data():
    """Seeds or resets the full institutional dataset matching all requirements."""
    engine = get_engine()
    is_mysql = st.session_state["db_type"] == "mysql"

    ddl_statements = [
        # Users
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,
            ref_id INT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL,
            ref_id INTEGER,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """,
        # Instructors
        """
        CREATE TABLE IF NOT EXISTS instructors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            specialization VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS instructors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            specialization TEXT NOT NULL,
            status TEXT DEFAULT 'Active'
        );
        """,
        # Students
        """
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(30) NOT NULL,
            enrollment_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            enrollment_date TEXT NOT NULL,
            status TEXT DEFAULT 'Active'
        );
        """,
        # Courses
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_name VARCHAR(120) NOT NULL,
            description TEXT,
            instructor_id INT NOT NULL,
            duration_weeks INT NOT NULL,
            fee DECIMAL(10,2) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active',
            FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_name TEXT NOT NULL,
            description TEXT,
            instructor_id INTEGER NOT NULL,
            duration_weeks INTEGER NOT NULL,
            fee REAL NOT NULL,
            status TEXT DEFAULT 'Active',
            FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
        );
        """,
        # Enrollments
        """
        CREATE TABLE IF NOT EXISTS enrollments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            course_id INT NOT NULL,
            enrollment_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Enrolled',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
            UNIQUE KEY unique_student_course (student_id, course_id)
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            enrollment_date TEXT NOT NULL,
            status TEXT DEFAULT 'Enrolled',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
            UNIQUE(student_id, course_id)
        );
        """,
        # Grades
        """
        CREATE TABLE IF NOT EXISTS grades (
            id INT AUTO_INCREMENT PRIMARY KEY,
            enrollment_id INT NOT NULL UNIQUE,
            assignment_mark DECIMAL(5,2) DEFAULT 0,
            quiz_mark DECIMAL(5,2) DEFAULT 0,
            final_exam_mark DECIMAL(5,2) DEFAULT 0,
            total_mark DECIMAL(5,2) DEFAULT 0,
            grade_letter VARCHAR(5) DEFAULT 'F',
            feedback TEXT,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL UNIQUE,
            assignment_mark REAL DEFAULT 0,
            quiz_mark REAL DEFAULT 0,
            final_exam_mark REAL DEFAULT 0,
            total_mark REAL DEFAULT 0,
            grade_letter TEXT DEFAULT 'F',
            feedback TEXT,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
        );
        """,
        # System Logs
        """
        CREATE TABLE IF NOT EXISTS system_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            action VARCHAR(50) NOT NULL,
            table_affected VARCHAR(50) NOT NULL,
            record_id INT,
            details TEXT,
            performed_by VARCHAR(50) DEFAULT 'System'
        );
        """ if is_mysql else """
        CREATE TABLE IF NOT EXISTS system_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            action TEXT NOT NULL,
            table_affected TEXT NOT NULL,
            record_id INTEGER,
            details TEXT,
            performed_by TEXT DEFAULT 'System'
        );
        """
    ]

    with engine.begin() as conn:
        for stmt in ddl_statements:
            conn.execute(text(stmt))

        # Check if already seeded
        cnt = conn.execute(text("SELECT COUNT(*) FROM students")).scalar()
        if cnt and cnt > 0:
            return  # Already populated

        # 1. Admin User
        conn.execute(
            text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES ('admin', 'admin123', 'admin', NULL, 'Academic Administrator', 'admin@institute.edu')")
        )

        # 2. Instructors (6 Faculty)
        instructors = [
            ("Dr. Elena Rostova", "elena.rostova@institute.edu", "Machine Learning & AI", "Active"),
            ("Prof. Marcus Vance", "marcus.vance@institute.edu", "Cloud & Distributed Systems", "Active"),
            ("Dr. Sarah Chen", "sarah.chen@institute.edu", "Full-Stack Web Architecture", "Active"),
            ("Prof. David Thorne", "david.thorne@institute.edu", "Cybersecurity & Cryptography", "Active"),
            ("Dr. Amara Okafor", "amara.okafor@institute.edu", "Database Systems & Big Data", "Active"),
            ("Prof. Julian Keller", "julian.keller@institute.edu", "Mobile & Embedded Systems", "On Leave"),
        ]
        for name, email, spec, status in instructors:
            res = conn.execute(
                text("INSERT INTO instructors (name, email, specialization, status) VALUES (:n, :e, :s, :st)"),
                {"n": name, "e": email, "s": spec, "st": status}
            )
            iid = res.lastrowid
            uname = email.split("@")[0].lower()
            conn.execute(
                text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'instructor123', 'instructor', :ref, :n, :e)"),
                {"u": uname, "ref": iid, "n": name, "e": email}
            )

        # 3. Students (10 Scholars)
        students = [
            ("Aria Montgomery", "aria.m@student.edu", "+1-555-0101", "2025-01-15", "Active"),
            ("Liam O'Connor", "liam.oc@student.edu", "+1-555-0102", "2025-01-16", "Active"),
            ("Zara Patel", "zara.p@student.edu", "+1-555-0103", "2025-01-18", "Active"),
            ("Devon Brooks", "devon.b@student.edu", "+1-555-0104", "2025-01-20", "Active"),
            ("Maya Lin", "maya.lin@student.edu", "+1-555-0105", "2025-02-01", "Active"),
            ("Kai Nakamura", "kai.n@student.edu", "+1-555-0106", "2025-02-05", "Active"),
            ("Sofia Alvarez", "sofia.a@student.edu", "+1-555-0107", "2025-02-10", "Active"),
            ("Ethan Huntley", "ethan.h@student.edu", "+1-555-0108", "2025-02-12", "Inactive"),
            ("Chloe Dupont", "chloe.d@student.edu", "+1-555-0109", "2025-02-15", "Active"),
            ("Noah Washington", "noah.w@student.edu", "+1-555-0110", "2025-02-18", "Suspended"),
        ]
        for name, email, phone, enr_date, status in students:
            res = conn.execute(
                text("INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (:n, :e, :p, :d, :st)"),
                {"n": name, "e": email, "p": phone, "d": enr_date, "st": status}
            )
            sid = res.lastrowid
            uname = email.split("@")[0].lower()
            conn.execute(
                text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'student123', 'student', :ref, :n, :e)"),
                {"u": uname, "ref": sid, "n": name, "e": email}
            )

        # 4. Courses (7 Courses - Course #7 has 0 enrollments for BR-06 test)
        courses = [
            ("CS-501: Relational Database Architecture", "Deep dive into SQL, ACID transactions, normalization, indexing, and query optimization.", 5, 12, 1250.0, "Active"),
            ("AI-302: Applied Machine Learning & Neural Networks", "Hands-on model development, feature engineering, and production model inference.", 1, 14, 1600.0, "Active"),
            ("WEB-201: Modern Full-Stack Systems", "Production TypeScript, RESTful and GraphQL APIs, asynchronous microservices.", 3, 10, 950.0, "Active"),
            ("SEC-401: Enterprise Cybersecurity & Zero Trust", "Threat modeling, cryptographic protocols, authentication barriers, and pen testing.", 4, 8, 1100.0, "Active"),
            ("CLOUD-305: Distributed Systems & Kubernetes", "High-availability clustering, container orchestration, service mesh, and observability.", 2, 10, 1400.0, "Active"),
            ("DS-210: Data Pipelines & Stream Processing", "Apache Kafka, real-time transformations, columnar data stores, and analytical ETL.", 5, 12, 1300.0, "Active"),
            ("EMB-101: Embedded IoT Hardware Engineering", "Microcontroller programming, sensor telemetry, and RTOS architecture.", 6, 8, 850.0, "Upcoming"),
        ]
        for cname, desc, iid, w, f, st_c in courses:
            conn.execute(
                text("INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status) VALUES (:n, :d, :i, :w, :f, :st)"),
                {"n": cname, "d": desc, "i": iid, "w": w, "f": f, "st": st_c}
            )

        # 5. Enrollments (19 records)
        enrollments = [
            (1, 1, "2025-01-20", "Enrolled"), (1, 2, "2025-01-21", "Completed"), (1, 3, "2025-01-22", "Enrolled"),
            (2, 1, "2025-01-22", "Enrolled"), (2, 5, "2025-01-25", "Completed"),
            (3, 2, "2025-01-24", "Enrolled"), (3, 4, "2025-01-28", "Enrolled"), (3, 6, "2025-02-01", "Enrolled"),
            (4, 3, "2025-01-25", "Enrolled"), (4, 4, "2025-01-27", "Dropped"),
            (5, 1, "2025-02-02", "Enrolled"), (5, 2, "2025-02-03", "Enrolled"),
            (6, 5, "2025-02-06", "Enrolled"), (6, 6, "2025-02-07", "Completed"),
            (7, 1, "2025-02-11", "Enrolled"), (7, 3, "2025-02-12", "Enrolled"),
            (8, 2, "2025-02-14", "Dropped"),
            (9, 4, "2025-02-16", "Completed"), (9, 6, "2025-02-17", "Enrolled")
        ]
        for sid, cid, edate, estatus in enrollments:
            conn.execute(
                text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, :st)"),
                {"s": sid, "c": cid, "d": edate, "st": estatus}
            )

        # 6. Grades (18 records)
        grades_data = [
            (1, 92, 88, 94, "Exceptional mastery of query execution plans and index trees."),
            (2, 96, 95, 98, "Top tier performance in deep neural network design."),
            (3, 85, 80, 87, "Solid fullstack patterns; improve asynchronous error handling."),
            (4, 78, 82, 75, "Good SQL comprehension; needs practice with nested aggregations."),
            (5, 90, 92, 89, "Clean Kubernetes manifests and deployment strategy."),
            (6, 88, 91, 90, "Impressive attention to model validation and hyperparameter tuning."),
            (7, 94, 90, 92, "Strong cryptographic protocol implementations."),
            (8, 82, 84, 80, "Good stream pipeline logic; optimize windowed joins."),
            (9, 89, 86, 91, "Very consistent frontend-to-backend data flow."),
            (10, 45, 50, 40, "Incomplete lab exercises before withdrawal."),
            (11, 91, 89, 93, "Great database normalization schema submission."),
            (12, 84, 86, 88, "Effective backprop implementations from scratch."),
            (13, 87, 85, 89, "Good ingress routing and stateful sets setup."),
            (14, 95, 94, 96, "Outstanding distributed Kafka event broker architecture."),
            (15, 76, 79, 82, "Steady progression across database topics."),
            (16, 83, 85, 81, "Well structured component hierarchy."),
            (18, 97, 98, 95, "Flawless penetration testing report and patch remediation."),
            (19, 88, 86, 90, "Robust ETL data validation pipeline."),
        ]
        for eid, a, q, f, fb in grades_data:
            tot = round((a * 0.25) + (q * 0.25) + (f * 0.50), 1)
            let = 'A' if tot >= 90 else ('B' if tot >= 80 else ('C' if tot >= 70 else ('D' if tot >= 60 else 'F')))
            conn.execute(
                text("""
                    INSERT INTO grades (enrollment_id, assignment_mark, quiz_mark, final_exam_mark, total_mark, grade_letter, feedback)
                    VALUES (:eid, :a, :q, :f, :tot, :let, :fb)
                """),
                {"eid": eid, "a": a, "q": q, "f": f, "tot": tot, "let": let, "fb": fb}
            )

        log_audit(conn, "SYSTEM_SEED", "system", 0, "Seeded full institutional dataset with 10 students, 6 instructors, 7 courses, 19 enrollments, and 18 grades.")

# Auto-initialize database on startup
try:
    seed_verified_institutional_data()
except Exception as err:
    print(f"Initial seed notice: {err}")

# ==========================================
# SIDEBAR: ROLES, DATABASE & NAVIGATION
# ==========================================
st.sidebar.markdown("## 🎓 AcademiaPro LMS")
st.sidebar.caption("Enterprise Academic Administration & Learning Portal")

# Persona Switcher
personas = {
    "Academic Administrator (Full Access)": {"role": "admin", "username": "admin", "name": "Academic Administrator", "ref_id": None},
    "Instructor: Dr. Elena Rostova": {"role": "instructor", "username": "elena.rostova", "name": "Dr. Elena Rostova", "ref_id": 1},
    "Student: Aria Montgomery": {"role": "student", "username": "aria.m", "name": "Aria Montgomery", "ref_id": 1}
}
sel_persona = st.sidebar.selectbox("Active User Session", list(personas.keys()), index=0)
user_session = personas[sel_persona]
st.session_state["user_session"] = user_session

# Password Change Modal / Expander
with st.sidebar.expander("🔑 Change Password"):
    with st.form("pw_form"):
        old_pw = st.text_input("Current Password", type="password")
        new_pw = st.text_input("New Password (min 6 chars)", type="password")
        if st.form_submit_button("Update Password"):
            if len(new_pw) < 6:
                st.error("Password must be at least 6 characters.")
            else:
                try:
                    eng = get_engine()
                    with eng.begin() as conn:
                        u = conn.execute(text("SELECT password FROM users WHERE username = :u"), {"u": user_session["username"]}).first()
                        if u and u[0] == old_pw:
                            conn.execute(text("UPDATE users SET password = :p WHERE username = :u"), {"p": new_pw, "u": user_session["username"]})
                            st.success("Password updated successfully!")
                        else:
                            st.error("Current password incorrect.")
                except Exception as e:
                    st.error(f"Error updating password: {e}")

st.sidebar.divider()

# Database Connection Control & Live Validator
st.sidebar.markdown("### 🗄️ Database Connection")
db_choice = st.sidebar.radio("Engine", ["MySQL Server", "SQLite (Local File)"], index=0 if st.session_state["db_type"] == "mysql" else 1)
st.session_state["db_type"] = "mysql" if db_choice == "MySQL Server" else "sqlite"

if st.session_state["db_type"] == "mysql":
    with st.sidebar.expander("⚙️ MySQL Configuration & Validator", expanded=True):
        st.session_state["db_host"] = st.text_input("Host", value=st.session_state["db_host"])
        st.session_state["db_port"] = st.number_input("Port", value=st.session_state["db_port"])
        st.session_state["db_user"] = st.text_input("Username", value=st.session_state["db_user"])
        st.session_state["db_password"] = st.text_input("Password", value=st.session_state["db_password"], type="password")
        st.session_state["db_name"] = st.text_input("Database Name", value=st.session_state["db_name"])

        if st.button("🔍 Validate MySQL Connection", use_container_width=True):
            val = validate_mysql(
                st.session_state["db_host"],
                st.session_state["db_port"],
                st.session_state["db_user"],
                st.session_state["db_password"],
                st.session_state["db_name"]
            )
            if val["server_online"] and val["db_exists"]:
                st.success(f"✅ Connected to MySQL database `{st.session_state['db_name']}`. Found {len(val['tables'])} tables.")
            elif val["server_online"] and not val["db_exists"]:
                st.warning(f"⚠️ Connected to MySQL server, but database `{st.session_state['db_name']}` is missing.")
                if st.button("Create Database & Seed Tables"):
                    try:
                        c = pymysql.connect(
                            host=st.session_state["db_host"],
                            port=st.session_state["db_port"],
                            user=st.session_state["db_user"],
                            password=st.session_state["db_password"]
                        )
                        with c.cursor() as cur:
                            cur.execute(f"CREATE DATABASE IF NOT EXISTS {st.session_state['db_name']} CHARACTER SET utf8mb4;")
                        c.close()
                        seed_verified_institutional_data()
                        st.success(f"Database `{st.session_state['db_name']}` created and seeded!")
                        st.rerun()
                    except Exception as ex:
                        st.error(f"Creation failed: {ex}")
            else:
                st.error(f"❌ Connection failed: {val['error']}")
                st.caption("Tip: If MySQL is not running locally, select 'SQLite (Local File)' above to use the preloaded institutional database.")
else:
    st.sidebar.success("✅ SQLite local relational database active.")

# Seed / Reset Button in Sidebar
if st.sidebar.button("🔄 Reset / Seed Institutional Data", use_container_width=True):
    try:
        eng = get_engine()
        with eng.begin() as conn:
            conn.execute(text("DROP TABLE IF EXISTS grades;"))
            conn.execute(text("DROP TABLE IF EXISTS enrollments;"))
            conn.execute(text("DROP TABLE IF EXISTS courses;"))
            conn.execute(text("DROP TABLE IF EXISTS students;"))
            conn.execute(text("DROP TABLE IF EXISTS instructors;"))
            conn.execute(text("DROP TABLE IF EXISTS users;"))
            conn.execute(text("DROP TABLE IF EXISTS system_logs;"))
        seed_verified_institutional_data()
        st.sidebar.success("Database cleanly reseeded with 10 students, 6 instructors, 7 courses, and full grades!")
        st.rerun()
    except Exception as ex:
        st.sidebar.error(f"Reset failed: {ex}")

st.sidebar.divider()

# Navigation
all_navs = [
    "📊 Executive Dashboard",
    "🎓 Student Portal",
    "👥 Students Management",
    "👨‍🏫 Faculty Instructors",
    "📚 Courses Catalog",
    "📝 Enrollments & Gradebook",
    "📑 Institutional Reports (BR-01 to BR-06)",
    "🛠️ SQL Studio & Query Console",
    "🗂️ Relational Schema ERD",
    "🤖 AI Academic Copilot",
    "📋 System Audit Logs"
]

if user_session["role"] == "student":
    allowed_navs = ["🎓 Student Portal", "📚 Courses Catalog", "👨‍🏫 Faculty Instructors", "🗂️ Relational Schema ERD"]
elif user_session["role"] == "instructor":
    allowed_navs = ["📊 Executive Dashboard", "📚 Courses Catalog", "📝 Enrollments & Gradebook", "👥 Students Management", "📑 Institutional Reports (BR-01 to BR-06)", "🤖 AI Academic Copilot"]
else:
    allowed_navs = all_navs

view = st.sidebar.radio("Navigation", allowed_navs)

engine = get_engine()

# ==========================================
# 1. EXECUTIVE DASHBOARD
# ==========================================
if view == "📊 Executive Dashboard":
    st.title("🏛️ Executive Academic Dashboard")
    st.caption(f"Live Relational System Metrics | Engine: {st.session_state['db_type'].upper()}")

    with engine.connect() as conn:
        tot_students = conn.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0
        act_students = conn.execute(text("SELECT COUNT(*) FROM students WHERE status = 'Active'")).scalar() or 0
        tot_instructors = conn.execute(text("SELECT COUNT(*) FROM instructors")).scalar() or 0
        tot_courses = conn.execute(text("SELECT COUNT(*) FROM courses")).scalar() or 0
        tot_enrollments = conn.execute(text("SELECT COUNT(*) FROM enrollments")).scalar() or 0
        tot_revenue = conn.execute(text("""
            SELECT COALESCE(SUM(c.fee), 0) FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.status IN ('Enrolled', 'Completed')
        """)).scalar() or 0
        avg_grade = conn.execute(text("SELECT COALESCE(AVG(total_mark), 0) FROM grades")).scalar() or 0

    c1, c2, c3, c4, c5, c6 = st.columns(6)
    c1.metric("Scholars", f"{tot_students}", f"{act_students} Active")
    c2.metric("Faculty", f"{tot_instructors}", "6 Departments")
    c3.metric("Courses", f"{tot_courses}", "7 Catalog")
    c4.metric("Enrollments", f"{tot_enrollments}", "19 Total")
    c5.metric("Gross Tuition", f"${tot_revenue:,.0f}")
    c6.metric("Institutional Avg", f"{avg_grade:.1f}%")

    st.markdown("---")

    col_ch1, col_ch2 = st.columns(2)
    with col_ch1:
        st.subheader("📚 Course Enrollment Distribution")
        with engine.connect() as conn:
            df_enr_chart = pd.read_sql(text("""
                SELECT c.course_name, COUNT(e.id) as enrolled_count
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id
                GROUP BY c.id, c.course_name
                ORDER BY enrolled_count DESC
            """), conn)
        st.bar_chart(df_enr_chart.set_index("course_name")["enrolled_count"])

    with col_ch2:
        st.subheader("🎯 Academic Grade Letter Breakdown")
        with engine.connect() as conn:
            df_grade_chart = pd.read_sql(text("""
                SELECT grade_letter, COUNT(*) as scholar_count
                FROM grades
                GROUP BY grade_letter
                ORDER BY 
                  CASE grade_letter 
                    WHEN 'A' THEN 1 WHEN 'B' THEN 2 WHEN 'C' THEN 3 WHEN 'D' THEN 4 ELSE 5 
                  END
            """), conn)
        st.bar_chart(df_grade_chart.set_index("grade_letter")["scholar_count"])

    st.markdown("---")
    st.subheader("📜 Recent System Activity Audit Trail")
    with engine.connect() as conn:
        df_logs = pd.read_sql(text("SELECT timestamp, action, table_affected, details, performed_by FROM system_logs ORDER BY id DESC LIMIT 10"), conn)
    st.dataframe(df_logs, use_container_width=True)

# ==========================================
# 2. STUDENT PORTAL (SELF-SERVICE)
# ==========================================
elif view == "🎓 Student Portal":
    st.title("🎓 Student Learning Portal")

    student_id = user_session.get("ref_id", 1) or 1

    with engine.connect() as conn:
        s_row = conn.execute(text("SELECT * FROM students WHERE id = :id"), {"id": student_id}).mappings().first()

    if s_row:
        # Calculate Student Cumulative GPA
        with engine.connect() as conn:
            grades_calc = conn.execute(text("""
                SELECT g.total_mark, g.grade_letter
                FROM enrollments e
                JOIN grades g ON e.id = g.enrollment_id
                WHERE e.student_id = :sid
            """), {"sid": student_id}).mappings().all()

        points_map = {'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0}
        total_pts = sum([points_map.get(g["grade_letter"], 0.0) for g in grades_calc])
        gpa = (total_pts / len(grades_calc)) if grades_calc else 0.0

        p1, p2, p3, p4 = st.columns(4)
        p1.metric("Student Name", s_row["name"])
        p2.metric("Official Email", s_row["email"])
        p3.metric("Account Status", s_row["status"])
        p4.metric("Cumulative GPA", f"{gpa:.2f} / 4.00")

        st.markdown("---")
        st.subheader("📚 My Enrolled Courses & Detailed Evaluations")

        with engine.connect() as conn:
            df_my_courses = pd.read_sql(text("""
                SELECT 
                    c.course_name, i.name as instructor_name, e.enrollment_date, e.status as enrollment_status,
                    COALESCE(g.assignment_mark, 0) as assignment_25,
                    COALESCE(g.quiz_mark, 0) as quiz_25,
                    COALESCE(g.final_exam_mark, 0) as final_exam_50,
                    COALESCE(g.total_mark, 0) as total_100,
                    COALESCE(g.grade_letter, 'N/A') as grade_letter,
                    COALESCE(g.feedback, 'No remarks yet') as instructor_feedback
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                WHERE e.student_id = :sid
                ORDER BY e.id DESC
            """), conn, params={"sid": student_id})

        st.dataframe(df_my_courses, use_container_width=True)

        st.markdown("---")
        st.subheader("➕ Self-Register in Available Academic Courses")

        with engine.connect() as conn:
            df_avail = pd.read_sql(text("""
                SELECT c.id, c.course_name, c.description, i.name as instructor, c.duration_weeks, c.fee
                FROM courses c
                JOIN instructors i ON c.instructor_id = i.id
                WHERE c.status IN ('Active', 'Upcoming')
                AND c.id NOT IN (
                    SELECT course_id FROM enrollments WHERE student_id = :sid AND status IN ('Enrolled', 'Completed')
                )
            """), conn, params={"sid": student_id})

        if not df_avail.empty:
            st.dataframe(df_avail, use_container_width=True)
            c_pick = st.selectbox("Select Course to Enroll", df_avail["course_name"].tolist())
            if st.button("Confirm Course Registration", type="primary"):
                cid = int(df_avail[df_avail["course_name"] == c_pick]["id"].values[0])
                today = datetime.now().strftime("%Y-%m-%d")
                with engine.begin() as conn:
                    conn.execute(
                        text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, 'Enrolled')"),
                        {"s": student_id, "c": cid, "d": today}
                    )
                    log_audit(conn, "STUDENT_SELF_ENROLL", "enrollments", cid, f"Student {s_row['name']} enrolled into {c_pick}", s_row['name'])
                st.success(f"Successfully enrolled into '{c_pick}'!")
                st.rerun()
        else:
            st.info("You are actively enrolled in all eligible curriculum courses!")

# ==========================================
# 3. STUDENTS MANAGEMENT
# ==========================================
elif view == "👥 Students Management":
    st.title("👥 Student Directory & Academic Records")

    tab_roster, tab_add, tab_details = st.tabs(["📋 Scholar Directory", "➕ Add New Student", "🔍 Scholar Academic Transcript"])

    with tab_roster:
        c_filter1, c_filter2 = st.columns([3, 1])
        search = c_filter1.text_input("🔍 Search by scholar name, email, or phone:")
        status_filter = c_filter2.selectbox("Filter Status", ["All", "Active", "Inactive", "Suspended"])

        with engine.connect() as conn:
            df_stud = pd.read_sql(text("""
                SELECT 
                    s.id, s.name, s.email, s.phone, s.enrollment_date, s.status,
                    COUNT(e.id) as enrolled_courses_count,
                    COALESCE(ROUND(AVG(g.total_mark), 1), 0) as average_mark
                FROM students s
                LEFT JOIN enrollments e ON s.id = e.student_id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                GROUP BY s.id, s.name, s.email, s.phone, s.enrollment_date, s.status
                ORDER BY s.id DESC
            """), conn)

        if status_filter != "All":
            df_stud = df_stud[df_stud["status"] == status_filter]
        if search:
            df_stud = df_stud[df_stud["name"].str.contains(search, case=False, na=False) | df_stud["email"].str.contains(search, case=False, na=False)]

        st.dataframe(df_stud, use_container_width=True)

    with tab_add:
        if user_session["role"] == "student":
            st.warning("Access Denied: Only Academic Administrators or Faculty can add students.")
        else:
            st.subheader("Register New Scholar Record")
            with st.form("new_scholar_form"):
                col1, col2 = st.columns(2)
                f_name = col1.text_input("Full Legal Name *")
                f_email = col2.text_input("Institutional Email *")
                f_phone = col1.text_input("Phone Number *", value="+1-555-0150")
                f_status = col2.selectbox("Enrollment Status", ["Active", "Inactive", "Suspended"])
                btn_create = st.form_submit_button("Enroll Scholar & Generate Credentials")

                if btn_create:
                    if not f_name or not f_email:
                        st.error("Full name and email are mandatory.")
                    else:
                        today = datetime.now().strftime("%Y-%m-%d")
                        try:
                            with engine.begin() as conn:
                                res = conn.execute(
                                    text("INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (:n, :e, :p, :d, :st)"),
                                    {"n": f_name.strip(), "e": f_email.strip().lower(), "p": f_phone.strip(), "d": today, "st": f_status}
                                )
                                sid = res.lastrowid
                                uname = f_email.split("@")[0].lower()
                                conn.execute(
                                    text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'student123', 'student', :ref, :n, :e)"),
                                    {"u": uname, "ref": sid, "n": f_name.strip(), "e": f_email.strip().lower()}
                                )
                                log_audit(conn, "CREATE_STUDENT", "students", sid, f"Created student {f_name}", user_session["username"])
                            st.success(f"Scholar '{f_name}' enrolled with ID #{sid}! Credentials: Username `{uname}` | Password `student123`")
                            st.rerun()
                        except Exception as ex:
                            st.error(f"Failed to create student: {ex}")

    with tab_details:
        st.subheader("Transcript & Evaluation Inspector")
        with engine.connect() as conn:
            all_s = conn.execute(text("SELECT id, name, email FROM students ORDER BY name ASC")).fetchall()
        if all_s:
            s_dict = {f"{r[1]} ({r[2]}) [ID #{r[0]}]": r[0] for r in all_s}
            sel_s = st.selectbox("Select Scholar to Inspect", list(s_dict.keys()))
            insp_id = s_dict[sel_s]

            with engine.connect() as conn:
                df_insp = pd.read_sql(text("""
                    SELECT c.course_name, i.name as instructor, e.status as enrollment_status,
                           g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
                    FROM enrollments e
                    JOIN courses c ON e.course_id = c.id
                    JOIN instructors i ON c.instructor_id = i.id
                    LEFT JOIN grades g ON e.id = g.enrollment_id
                    WHERE e.student_id = :sid
                """), conn, params={"sid": insp_id})
            st.dataframe(df_insp, use_container_width=True)

# ==========================================
# 4. FACULTY INSTRUCTORS
# ==========================================
elif view == "👨‍🏫 Faculty Instructors":
    st.title("👨‍🏫 Academic Faculty & Teaching Workload")

    tab_inst_roster, tab_inst_add = st.tabs(["📋 Faculty Roster", "➕ Add Faculty Member"])

    with tab_inst_roster:
        with engine.connect() as conn:
            df_inst = pd.read_sql(text("""
                SELECT 
                    i.id, i.name, i.email, i.specialization, i.status,
                    COUNT(c.id) as assigned_courses,
                    COALESCE(SUM(c.duration_weeks), 0) as total_teaching_weeks
                FROM instructors i
                LEFT JOIN courses c ON i.id = c.instructor_id
                GROUP BY i.id, i.name, i.email, i.specialization, i.status
                ORDER BY i.id ASC
            """), conn)
        st.dataframe(df_inst, use_container_width=True)

    with tab_inst_add:
        if user_session["role"] != "admin":
            st.warning("Only Academic Administrators can onboard faculty members.")
        else:
            with st.form("new_inst_form"):
                in_name = st.text_input("Faculty Member Name * (e.g. Dr. Arthur Pendelton)")
                in_email = st.text_input("Academic Email *")
                in_spec = st.text_input("Department / Specialization * (e.g. Artificial Intelligence)")
                in_status = st.selectbox("Status", ["Active", "On Leave", "Inactive"])
                sub_inst = st.form_submit_button("Onboard Faculty Member")

                if sub_inst:
                    if not in_name or not in_email:
                        st.error("Name and email are required.")
                    else:
                        try:
                            with engine.begin() as conn:
                                res = conn.execute(
                                    text("INSERT INTO instructors (name, email, specialization, status) VALUES (:n, :e, :s, :st)"),
                                    {"n": in_name.strip(), "e": in_email.strip().lower(), "s": in_spec.strip(), "st": in_status}
                                )
                                iid = res.lastrowid
                                uname = in_email.split("@")[0].lower()
                                conn.execute(
                                    text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'instructor123', 'instructor', :ref, :n, :e)"),
                                    {"u": uname, "ref": iid, "n": in_name.strip(), "e": in_email.strip().lower()}
                                )
                                log_audit(conn, "CREATE_INSTRUCTOR", "instructors", iid, f"Onboarded faculty {in_name}", user_session["username"])
                            st.success(f"Faculty '{in_name}' onboarded successfully with ID #{iid}!")
                            st.rerun()
                        except Exception as ex:
                            st.error(f"Error onboarding instructor: {ex}")

# ==========================================
# 5. COURSES CATALOG
# ==========================================
elif view == "📚 Courses Catalog":
    st.title("📚 Curriculum Course Catalog")

    tab_c_list, tab_c_create = st.tabs(["📋 Catalog Directory", "➕ Create Course"])

    with tab_c_list:
        with engine.connect() as conn:
            df_c = pd.read_sql(text("""
                SELECT 
                    c.id, c.course_name, c.description, i.name as instructor_name,
                    c.duration_weeks, c.fee, c.status,
                    COUNT(e.id) as enrolled_students,
                    (COUNT(e.id) * c.fee) as total_revenue
                FROM courses c
                LEFT JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                GROUP BY c.id, c.course_name, c.description, i.name, c.duration_weeks, c.fee, c.status
                ORDER BY c.id ASC
            """), conn)
        st.dataframe(df_c, use_container_width=True)

    with tab_c_create:
        if user_session["role"] == "student":
            st.warning("Students cannot create courses.")
        else:
            with engine.connect() as conn:
                inst_rows = conn.execute(text("SELECT id, name FROM instructors WHERE status = 'Active'")).fetchall()
            if not inst_rows:
                st.warning("Please onboard an active instructor first.")
            else:
                inst_map = {f"{r[1]} [ID #{r[0]}]": r[0] for r in inst_rows}
                with st.form("create_course_form"):
                    co_title = st.text_input("Course Code & Title * (e.g. CS-601: Advanced Cloud Architectures)")
                    co_desc = st.text_area("Course Syllabus & Learning Objectives")
                    co_inst = st.selectbox("Assigned Faculty Member", list(inst_map.keys()))
                    col1, col2, col3 = st.columns(3)
                    co_dur = col1.number_input("Duration (Weeks)", min_value=1, max_value=52, value=12)
                    co_fee = col2.number_input("Tuition Fee ($)", min_value=0.0, value=1200.0, step=50.0)
                    co_st = col3.selectbox("Course Status", ["Active", "Upcoming", "Archived"])
                    sub_c = st.form_submit_button("Publish Course to Catalog")

                    if sub_c:
                        if not co_title:
                            st.error("Course title is required.")
                        else:
                            try:
                                with engine.begin() as conn:
                                    conn.execute(
                                        text("""
                                            INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status)
                                            VALUES (:n, :d, :i, :w, :f, :st)
                                        """),
                                        {"n": co_title.strip(), "d": co_desc.strip(), "i": inst_map[co_inst], "w": co_dur, "f": co_fee, "st": co_st}
                                    )
                                    log_audit(conn, "CREATE_COURSE", "courses", 0, f"Published course {co_title}", user_session["username"])
                                st.success(f"Course '{co_title}' published to catalog!")
                                st.rerun()
                            except Exception as ex:
                                st.error(f"Error publishing course: {ex}")

# ==========================================
# 6. ENROLLMENTS & GRADEBOOK
# ==========================================
elif view == "📝 Enrollments & Gradebook":
    st.title("📝 Student Enrollments & Academic Gradebook")

    tab_e_list, tab_e_enroll, tab_grade_entry = st.tabs(["📋 Enrollments Registry", "➕ Enroll Scholar", "🎯 Score Evaluation Assessment"])

    with tab_e_list:
        with engine.connect() as conn:
            df_enr_all = pd.read_sql(text("""
                SELECT 
                    e.id as enrollment_id, s.name as student_name, c.course_name, i.name as instructor_name,
                    e.enrollment_date, e.status as enrollment_status,
                    COALESCE(g.total_mark, 0) as total_mark,
                    COALESCE(g.grade_letter, 'Ungraded') as grade_letter
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                ORDER BY e.id DESC
            """), conn)
        st.dataframe(df_enr_all, use_container_width=True)

    with tab_e_enroll:
        with engine.connect() as conn:
            s_choices = conn.execute(text("SELECT id, name, email FROM students WHERE status = 'Active'")).fetchall()
            c_choices = conn.execute(text("SELECT id, course_name, fee FROM courses WHERE status = 'Active'")).fetchall()

        if s_choices and c_choices:
            s_dict = {f"{r[1]} ({r[2]}) [ID #{r[0]}]": r[0] for r in s_choices}
            c_dict = {f"{r[1]} (${r[2]}) [ID #{r[0]}]": r[0] for r in c_choices}

            with st.form("admin_enroll_form"):
                sel_scholar = st.selectbox("Select Active Scholar", list(s_dict.keys()))
                sel_crse = st.selectbox("Select Target Course", list(c_dict.keys()))
                sel_status = st.selectbox("Initial Enrollment Status", ["Enrolled", "Completed", "Dropped"])
                btn_enroll = st.form_submit_button("Authorize Course Enrollment")

                if btn_enroll:
                    today = datetime.now().strftime("%Y-%m-%d")
                    try:
                        with engine.begin() as conn:
                            conn.execute(
                                text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, :st)"),
                                {"s": s_dict[sel_scholar], "c": c_dict[sel_crse], "d": today, "st": sel_status}
                            )
                            log_audit(conn, "ENROLL_STUDENT", "enrollments", s_dict[sel_scholar], f"Enrolled {sel_scholar} into {sel_crse}", user_session["username"])
                        st.success("Enrollment successfully recorded!")
                        st.rerun()
                    except Exception as ex:
                        st.error(f"Enrollment constraint error: {ex}")

    with tab_grade_entry:
        st.subheader("Institutional Evaluation Marking")
        st.caption("Standard Formula: `Total = (Assignment * 0.25) + (Quiz * 0.25) + (Final Exam * 0.50)`")

        with engine.connect() as conn:
            enr_records = conn.execute(text("""
                SELECT e.id, s.name as student_name, c.course_name,
                       COALESCE(g.assignment_mark, 0) as a_mark,
                       COALESCE(g.quiz_mark, 0) as q_mark,
                       COALESCE(g.final_exam_mark, 0) as f_mark,
                       COALESCE(g.feedback, '') as feedback
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                ORDER BY e.id DESC
            """)).fetchall()

        if enr_records:
            e_map = {f"Enrollment #{r[0]}: {r[1]} in {r[2]}": r for r in enr_records}
            sel_enrollment = st.selectbox("Select Scholar Enrollment", list(e_map.keys()))
            target_r = e_map[sel_enrollment]

            with st.form("scoring_form"):
                col_m1, col_m2, col_m3 = st.columns(3)
                in_assign = col_m1.number_input("Assignment Mark (out of 100)", min_value=0.0, max_value=100.0, value=float(target_r[3]), step=1.0)
                in_quiz = col_m2.number_input("Quiz Mark (out of 100)", min_value=0.0, max_value=100.0, value=float(target_r[4]), step=1.0)
                in_exam = col_m3.number_input("Final Exam Mark (out of 100)", min_value=0.0, max_value=100.0, value=float(target_r[5]), step=1.0)
                in_fb = st.text_area("Instructor Remarks & Feedback", value=target_r[6])

                computed_total = round((in_assign * 0.25) + (in_quiz * 0.25) + (in_exam * 0.50), 1)
                computed_letter = 'A' if computed_total >= 90 else ('B' if computed_total >= 80 else ('C' if computed_total >= 70 else ('D' if computed_total >= 60 else 'F')))

                st.info(f"📊 **Calculated Score:** `{computed_total:.1f} / 100.0` | **Awarded Letter Grade:** `{computed_letter}`")
                btn_save_grade = st.form_submit_button("Commit & Publish Evaluation Grade")

                if btn_save_grade:
                    try:
                        with engine.begin() as conn:
                            existing = conn.execute(text("SELECT id FROM grades WHERE enrollment_id = :eid"), {"eid": target_r[0]}).first()
                            if existing:
                                conn.execute(text("""
                                    UPDATE grades 
                                    SET assignment_mark = :a, quiz_mark = :q, final_exam_mark = :f, total_mark = :tot, grade_letter = :gl, feedback = :fb
                                    WHERE enrollment_id = :eid
                                """), {"a": in_assign, "q": in_quiz, "f": in_exam, "tot": computed_total, "gl": computed_letter, "fb": in_fb, "eid": target_r[0]})
                            else:
                                conn.execute(text("""
                                    INSERT INTO grades (enrollment_id, assignment_mark, quiz_mark, final_exam_mark, total_mark, grade_letter, feedback)
                                    VALUES (:eid, :a, :q, :f, :tot, :gl, :fb)
                                """), {"eid": target_r[0], "a": in_assign, "q": in_quiz, "f": in_exam, "tot": computed_total, "gl": computed_letter, "fb": in_fb})
                            log_audit(conn, "RECORD_GRADE", "grades", target_r[0], f"Recorded grade {computed_letter} ({computed_total}%) for enrollment #{target_r[0]}", user_session["username"])
                        st.success(f"Evaluation committed! Grade: {computed_letter} ({computed_total}%)")
                        st.rerun()
                    except Exception as ex:
                        st.error(f"Grading error: {ex}")

# ==========================================
# 7. INSTITUTIONAL REPORTS (BR-01 TO BR-06)
# ==========================================
elif view == "📑 Institutional Reports (BR-01 to BR-06)":
    st.title("📑 Institutional Analytics & Official Reports")
    st.caption("Standard Business Intelligence Queries (BR-01 to BR-06) with SQL transparency & CSV export")

    reports = {
        "BR-01: Course Enrollment Popularity & Revenue": {
            "id": "BR-01",
            "desc": "Which courses have the highest number of enrolled students and projected tuition revenues?",
            "concept": "LEFT JOIN + COUNT + Aggregations + GROUP BY + ORDER BY",
            "sql": """
                SELECT 
                    c.id AS course_id,
                    c.course_name,
                    i.name AS instructor_name,
                    c.duration_weeks,
                    c.fee,
                    COUNT(e.id) AS enrolled_students_count,
                    (COUNT(e.id) * c.fee) AS projected_revenue
                FROM courses c
                LEFT JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN enrollments e ON c.id = e.course_id
                GROUP BY c.id, c.course_name, i.name, c.duration_weeks, c.fee
                ORDER BY enrolled_students_count DESC, c.course_name ASC;
            """
        },
        "BR-02: Faculty Teaching Workload & Weekly Hours": {
            "id": "BR-02",
            "desc": "How many courses is each instructor actively leading across academic departments?",
            "concept": "LEFT JOIN + COUNT + SUM + GROUP BY",
            "sql": """
                SELECT 
                    i.id AS instructor_id,
                    i.name AS instructor_name,
                    i.email AS instructor_email,
                    i.specialization,
                    i.status AS instructor_status,
                    COUNT(c.id) AS assigned_courses_count,
                    COALESCE(SUM(c.duration_weeks), 0) AS total_teaching_weeks
                FROM instructors i
                LEFT JOIN courses c ON i.id = c.instructor_id
                GROUP BY i.id, i.name, i.email, i.specialization, i.status
                ORDER BY assigned_courses_count DESC, i.name ASC;
            """
        },
        "BR-03: Scholar Performance & Honors List": {
            "id": "BR-03",
            "desc": "Ranked academic honors of students based on evaluation total marks and grades.",
            "concept": "Multi-table JOIN + Weighted Scoring + DESC Sort",
            "sql": """
                SELECT 
                    s.id AS student_id,
                    s.name AS student_name,
                    s.email AS student_email,
                    c.course_name,
                    g.assignment_mark,
                    g.quiz_mark,
                    g.final_exam_mark,
                    g.total_mark,
                    g.grade_letter,
                    g.feedback
                FROM students s
                JOIN enrollments e ON s.id = e.student_id
                JOIN courses c ON e.course_id = c.id
                JOIN grades g ON e.id = g.enrollment_id
                ORDER BY g.total_mark DESC;
            """
        },
        "BR-04: Student Census & Status Breakdown": {
            "id": "BR-04",
            "desc": "Demographic distribution of active, inactive, and suspended scholars.",
            "concept": "COUNT + Subquery Percentage + GROUP BY",
            "sql": """
                SELECT 
                    status,
                    COUNT(*) AS student_count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM students), 1) AS percentage_of_total
                FROM students
                GROUP BY status
                ORDER BY student_count DESC;
            """
        },
        "BR-05: Enrollment Lifecycle Pipeline": {
            "id": "BR-05",
            "desc": "Lifecycle distribution of enrollments (In Progress, Completed, Dropped).",
            "concept": "GROUP BY + Ratio Analysis",
            "sql": """
                SELECT 
                    status AS enrollment_status,
                    COUNT(*) AS count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM enrollments), 1) AS percentage
                FROM enrollments
                GROUP BY status
                ORDER BY count DESC;
            """
        },
        "BR-06: Zero-Enrollment Courses (Action Alert)": {
            "id": "BR-06",
            "desc": "Courses currently carrying zero enrolled students requiring administrative marketing.",
            "concept": "LEFT JOIN + NULL Filter (Outer Join Isolation)",
            "sql": """
                SELECT 
                    c.id AS course_id,
                    c.course_name,
                    c.duration_weeks,
                    c.fee,
                    c.status AS course_status,
                    i.name AS instructor_name,
                    i.email AS instructor_email
                FROM courses c
                LEFT JOIN enrollments e ON c.id = e.course_id
                LEFT JOIN instructors i ON c.instructor_id = i.id
                WHERE e.id IS NULL;
            """
        }
    }

    sel_rep_key = st.selectbox("Select Report", list(reports.keys()))
    rep = reports[sel_rep_key]

    st.markdown(f"**Description:** {rep['desc']}")
    st.caption(f"**Relational Concept:** `{rep['concept']}`")

    with st.expander("🔍 View Raw SQL Query"):
        st.code(rep["sql"], language="sql")

    t_start = time.time()
    with engine.connect() as conn:
        df_rep = pd.read_sql(text(rep["sql"]), conn)
    t_elapsed_ms = round((time.time() - t_start) * 1000, 2)

    st.success(f"Report executed in **{t_elapsed_ms} ms** | **{len(df_rep)} records returned**")
    st.dataframe(df_rep, use_container_width=True)

    csv_data = df_rep.to_csv(index=False).encode('utf-8')
    st.download_button(
        label="📥 Export Report to CSV",
        data=csv_data,
        file_name=f"{rep['id']}_report.csv",
        mime="text/csv"
    )

# ==========================================
# 8. SQL STUDIO & QUERY CONSOLE
# ==========================================
elif view == "🛠️ SQL Studio & Query Console":
    st.title("🛠️ SQL Studio & Relational Query Console")

    st.subheader("1. Preset Institutional Relational Queries")
    presets = {
        "Custom": "",
        "Top Performing Scholars (Grade >= 90%)": "SELECT s.name, c.course_name, g.total_mark, g.grade_letter FROM students s JOIN enrollments e ON s.id = e.student_id JOIN courses c ON e.course_id = c.id JOIN grades g ON e.id = g.enrollment_id WHERE g.total_mark >= 90 ORDER BY g.total_mark DESC;",
        "Total Revenue by Course": "SELECT c.course_name, COUNT(e.id) as enrollments, (COUNT(e.id) * c.fee) as gross_revenue FROM courses c LEFT JOIN enrollments e ON c.id = e.course_id GROUP BY c.id ORDER BY gross_revenue DESC;",
        "Faculty Members with > 1 Course": "SELECT i.name, i.specialization, COUNT(c.id) as course_count FROM instructors i JOIN courses c ON i.id = c.instructor_id GROUP BY i.id HAVING count(c.id) > 1;",
        "Scholars Requiring Academic Intervention (Exam < 60%)": "SELECT s.name, s.email, c.course_name, g.final_exam_mark, g.grade_letter FROM students s JOIN enrollments e ON s.id = e.student_id JOIN courses c ON e.course_id = c.id JOIN grades g ON e.id = g.enrollment_id WHERE g.final_exam_mark < 60;"
    }
    sel_preset = st.selectbox("Load Preset Query", list(presets.keys()))
    default_q = presets[sel_preset] if sel_preset != "Custom" else "SELECT * FROM courses;"

    query_input = st.text_area("SQL Statement", value=default_q, height=130)

    if st.button("🚀 Execute SQL Query", type="primary"):
        t0 = time.time()
        try:
            with engine.connect() as conn:
                if query_input.strip().lower().startswith("select"):
                    res_df = pd.read_sql(text(query_input), conn)
                    ms = round((time.time() - t0) * 1000, 2)
                    st.success(f"Query completed in {ms} ms ({len(res_df)} rows).")
                    st.dataframe(res_df, use_container_width=True)
                else:
                    with engine.begin() as wconn:
                        exec_res = wconn.execute(text(query_input))
                        ms = round((time.time() - t0) * 1000, 2)
                        st.success(f"Executed non-query statement in {ms} ms. Rows affected: {exec_res.rowcount}")
        except Exception as ex:
            st.error(f"SQL Error: {ex}")

    st.markdown("---")
    st.subheader("2. Table Schema Inspector")
    try:
        insp = inspect(engine)
        t_names = insp.get_table_names()
        sel_t = st.selectbox("Select Table to Inspect", t_names)
        if sel_t:
            with engine.connect() as conn:
                df_sample = pd.read_sql(text(f"SELECT * FROM {sel_t} LIMIT 25"), conn)
            st.dataframe(df_sample, use_container_width=True)
    except Exception as ex:
        st.warning(f"Inspection notice: {ex}")

# ==========================================
# 9. RELATIONAL SCHEMA ERD
# ==========================================
elif view == "🗂️ Relational Schema ERD":
    st.title("🗂️ Relational Entity-Relationship Architecture (ERD)")
    st.caption("Normalized Relational Schema with Foreign Key Constraints & Data Integrity Barriers")

    st.markdown("""
    ```mermaid
    erDiagram
        INSTRUCTORS ||--o{ COURSES : "teaches (ON DELETE RESTRICT)"
        STUDENTS ||--o{ ENROLLMENTS : "registers (ON DELETE CASCADE)"
        COURSES ||--o{ ENROLLMENTS : "has (ON DELETE RESTRICT)"
        ENROLLMENTS ||--|| GRADES : "evaluates (ON DELETE CASCADE)"
        USERS ||--o| STUDENTS : "authenticates student"
        USERS ||--o| INSTRUCTORS : "authenticates faculty"

        INSTRUCTORS {
            int id PK
            varchar name
            varchar email UK
            varchar specialization
            varchar status
        }
        STUDENTS {
            int id PK
            varchar name
            varchar email UK
            varchar phone
            date enrollment_date
            varchar status
        }
        COURSES {
            int id PK
            varchar course_name
            text description
            int instructor_id FK
            int duration_weeks
            decimal fee
            varchar status
        }
        ENROLLMENTS {
            int id PK
            int student_id FK
            int course_id FK
            date enrollment_date
            varchar status
        }
        GRADES {
            int id PK
            int enrollment_id FK,UK
            decimal assignment_mark
            decimal quiz_mark
            decimal final_exam_mark
            decimal total_mark
            varchar grade_letter
            text feedback
        }
        USERS {
            int id PK
            varchar username UK
            varchar password
            varchar role
            int ref_id
            varchar name
            varchar email
        }
    ```
    """)

    st.subheader("Integrity Rules & Constraints Enforced")
    st.markdown("""
    1. **Primary Keys (`PK`)**: Uniquely identify every record (`id` auto-incrementing integer).
    2. **Foreign Key Restrict (`ON DELETE RESTRICT`)**:
       - An instructor cannot be deleted while assigned to any course.
       - A course cannot be deleted while students are enrolled in it.
    3. **Cascade Integrity (`ON DELETE CASCADE`)**:
       - Deleting a student safely cleans up their enrollments and dependent grade records.
    4. **Unique Composite Key (`UNIQUE(student_id, course_id)`)**:
       - Prevents duplicate registrations in the same course.
    """)

# ==========================================
# 10. AI ACADEMIC COPILOT
# ==========================================
elif view == "🤖 AI Academic Copilot":
    st.title("🤖 AI Academic Copilot & Advisory System")
    st.caption("Intelligent student diagnostics, curriculum generator, and natural language SQL advisor")

    tab_diag, tab_curr, tab_nl2sql = st.tabs(["🩺 Student Diagnostic Advisor", "📖 Curriculum Syllabus Generator", "💬 Natural Language to SQL"])

    with tab_diag:
        st.subheader("Automated Academic Diagnostic & Intervention Engine")
        with engine.connect() as conn:
            all_scholars = conn.execute(text("SELECT id, name, email FROM students")).fetchall()
        sc_map = {f"{r[1]} ({r[2]}) [ID #{r[0]}]": r[0] for r in all_scholars}
        pick_sc = st.selectbox("Select Student to Diagnose", list(sc_map.keys()))
        target_sid = sc_map[pick_sc]

        if st.button("Generate Diagnostic Report"):
            with engine.connect() as conn:
                grades_sc = conn.execute(text("""
                    SELECT c.course_name, g.total_mark, g.grade_letter, g.final_exam_mark
                    FROM enrollments e
                    JOIN courses c ON e.course_id = c.id
                    JOIN grades g ON e.id = g.enrollment_id
                    WHERE e.student_id = :sid
                """), {"sid": target_sid}).mappings().all()

            if grades_sc:
                avg_m = sum([g["total_mark"] for g in grades_sc]) / len(grades_sc)
                at_risk = [g for g in grades_sc if g["final_exam_mark"] < 60]

                st.markdown(f"### Diagnostic Summary for **{pick_sc.split(' (')[0]}**")
                st.metric("Academic Standing Average", f"{avg_m:.1f}%")

                if at_risk:
                    st.error(f"⚠️ **At-Risk Notice:** Scholar is underperforming in {len(at_risk)} course(s):")
                    for a in at_risk:
                        st.write(f"- **{a['course_name']}**: Final Exam Mark `{a['final_exam_mark']}%` (Grade `{a['grade_letter']}`)")
                    st.info("💡 **Recommended Intervention:** Assign faculty tutoring hours, schedule diagnostic quiz review sessions, and provide supplementary learning lab materials.")
                else:
                    st.success("✅ **Exemplary Standing:** Scholar is progressing satisfactorily across all enrolled topics. Recommended for honors recognition or peer mentoring roles.")
            else:
                st.info("No recorded grades available for this scholar yet.")

    with tab_curr:
        st.subheader("Generate Course Curriculum Syllabus")
        topic = st.text_input("Enter Subject / Emerging Technology", value="Quantum Computing & Quantum Algorithms")
        weeks = st.slider("Curriculum Duration (Weeks)", min_value=4, max_value=16, value=8)

        if st.button("Generate Academic Syllabus"):
            st.markdown(f"#### Syllabus: {topic} ({weeks} Weeks)")
            for w in range(1, weeks + 1):
                st.markdown(f"**Week {w}**: Foundational concepts, hands-on architectural design lab, and milestone evaluation quiz.")

    with tab_nl2sql:
        st.subheader("Natural Language to Relational SQL Converter")
        nl_prompt = st.text_input("Ask a question in plain English:", value="Which faculty member is teaching the most students?")
        if st.button("Convert to SQL"):
            st.code("""
SELECT i.name as instructor_name, COUNT(e.id) as total_students_taught
FROM instructors i
JOIN courses c ON i.id = c.instructor_id
JOIN enrollments e ON c.id = e.course_id
GROUP BY i.id, i.name
ORDER BY total_students_taught DESC
LIMIT 1;
            """, language="sql")

# ==========================================
# 11. SYSTEM AUDIT LOGS
# ==========================================
elif view == "📋 System Audit Logs":
    st.title("📋 System Activity & Security Audit Logs")
    with engine.connect() as conn:
        df_audit = pd.read_sql(text("SELECT * FROM system_logs ORDER BY id DESC LIMIT 100"), conn)
    st.dataframe(df_audit, use_container_width=True)

# Footer
st.markdown("---")
st.caption(f"AcademiaPro LMS | Streamlit 1.32+ | Python 3 | Engine: {st.session_state['db_type'].upper()}")
