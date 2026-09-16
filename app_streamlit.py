"""
AcademiaPro LMS - Python Streamlit Application
Enterprise Academic Administration & Student Learning Portal
Supports MySQL (PyMySQL/SQLAlchemy) with connection validator and SQLite fallback.
"""

import os
import sys
from datetime import datetime
import pandas as pd

try:
    import streamlit as st
except ImportError:
    print("Streamlit is not installed. Please run: pip install streamlit")
    sys.exit(1)

try:
    from sqlalchemy import create_engine, text, inspect
    import pymysql
except ImportError:
    st.error("SQLAlchemy or PyMySQL is missing. Please run: pip install sqlalchemy pymysql")
    st.stop()

# Page configuration
st.set_page_config(
    page_title="AcademiaPro LMS",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==========================================
# 1. DATABASE CONNECTION & VALIDATION ENGINE
# ==========================================

def get_connection_config():
    """Retrieve configuration from session state or environment."""
    return {
        "db_type": st.session_state.get("db_type", os.getenv("DB_TYPE", "sqlite").lower()),
        "host": st.session_state.get("db_host", os.getenv("DB_HOST", "127.0.0.1")),
        "port": int(st.session_state.get("db_port", os.getenv("DB_PORT", "3306"))),
        "user": st.session_state.get("db_user", os.getenv("DB_USER", "root")),
        "password": st.session_state.get("db_password", os.getenv("DB_PASSWORD", "")),
        "database": st.session_state.get("db_name", os.getenv("DB_NAME", "academia_lms")),
        "sqlite_path": os.getenv("SQLITE_PATH", "lms_data.sqlite")
    }

def get_engine():
    cfg = get_connection_config()
    if cfg["db_type"] == "mysql":
        url = f"mysql+pymysql://{cfg['user']}:{cfg['password']}@{cfg['host']}:{cfg['port']}/{cfg['database']}"
        return create_engine(url, pool_pre_ping=True)
    else:
        db_path = os.path.join(os.path.dirname(__file__), cfg["sqlite_path"])
        return create_engine(f"sqlite:///{db_path}")

def validate_mysql_connection(host, port, user, password, database):
    """
    Validates MySQL connection step-by-step:
    1. Server reachability & credentials
    2. Target database existence
    3. Tables and schema verification
    """
    results = {
        "server_reachable": False,
        "auth_success": False,
        "database_exists": False,
        "tables_found": [],
        "message": ""
    }
    try:
        # Step 1: Connect to MySQL server without selecting database
        conn = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            connect_timeout=3
        )
        results["server_reachable"] = True
        results["auth_success"] = True

        # Step 2: Check if database exists
        with conn.cursor() as cur:
            cur.execute("SHOW DATABASES;")
            dbs = [row[0].lower() for row in cur.fetchall()]
            if database.lower() in dbs:
                results["database_exists"] = True
            else:
                results["message"] = f"Connected to MySQL server, but database '{database}' was not found."

        # Step 3: Check tables if database exists
        if results["database_exists"]:
            conn.select_db(database)
            with conn.cursor() as cur:
                cur.execute("SHOW TABLES;")
                results["tables_found"] = [row[0] for row in cur.fetchall()]
                results["message"] = f"Valid MySQL connection! Found {len(results['tables_found'])} tables."

        conn.close()
    except pymysql.err.OperationalError as e:
        results["message"] = f"MySQL Operational Error: {e.args[1] if len(e.args) > 1 else str(e)}"
    except Exception as e:
        results["message"] = f"Connection failed: {str(e)}"

    return results

def init_database_tables():
    """Initializes tables in database if missing."""
    engine = get_engine()
    tables_sql = [
        """
        CREATE TABLE IF NOT EXISTS students (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(20),
            enrollment_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """ if get_connection_config()["db_type"] == "mysql" else """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            phone VARCHAR(20),
            enrollment_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS instructors (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            specialization VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """ if get_connection_config()["db_type"] == "mysql" else """
        CREATE TABLE IF NOT EXISTS instructors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL UNIQUE,
            specialization VARCHAR(100) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active'
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS courses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            course_name VARCHAR(100) NOT NULL,
            description TEXT,
            instructor_id INT NOT NULL,
            duration_weeks INT NOT NULL,
            fee DECIMAL(10, 2) NOT NULL,
            status VARCHAR(20) DEFAULT 'Active',
            FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
        );
        """ if get_connection_config()["db_type"] == "mysql" else """
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
        """,
        """
        CREATE TABLE IF NOT EXISTS enrollments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            student_id INT NOT NULL,
            course_id INT NOT NULL,
            enrollment_date DATE NOT NULL,
            status VARCHAR(20) DEFAULT 'Enrolled',
            FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT,
            UNIQUE KEY (student_id, course_id)
        );
        """ if get_connection_config()["db_type"] == "mysql" else """
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
        """,
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
        """ if get_connection_config()["db_type"] == "mysql" else """
        CREATE TABLE IF NOT EXISTS grades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            enrollment_id INTEGER NOT NULL UNIQUE,
            assignment_mark DECIMAL(5,2) DEFAULT 0,
            quiz_mark DECIMAL(5,2) DEFAULT 0,
            final_exam_mark DECIMAL(5,2) DEFAULT 0,
            total_mark DECIMAL(5,2) DEFAULT 0,
            grade_letter VARCHAR(5) DEFAULT 'F',
            feedback TEXT,
            FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
        );
        """,
        """
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,
            ref_id INT,
            name VARCHAR(100),
            email VARCHAR(100)
        );
        """ if get_connection_config()["db_type"] == "mysql" else """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role VARCHAR(20) NOT NULL,
            ref_id INTEGER,
            name VARCHAR(100),
            email VARCHAR(100)
        );
        """
    ]

    with engine.begin() as conn:
        for stmt in tables_sql:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                print(f"Table init notice: {e}")

# ==========================================
# 2. SIDEBAR - DATABASE & ROLE CONFIGURATION
# ==========================================

st.sidebar.markdown("### 🎓 AcademiaPro LMS")
st.sidebar.caption("Python & Streamlit Academic Management System")

# Active Role Selection
role_options = {
    "Administrator": {"username": "admin", "role": "admin", "name": "Academic Administrator"},
    "Faculty Instructor": {"username": "elena.rostova", "role": "instructor", "name": "Dr. Elena Rostova", "ref_id": 1},
    "Student": {"username": "aria.m", "role": "student", "name": "Aria Montgomery", "ref_id": 1}
}
selected_role_label = st.sidebar.selectbox("Current User Session", list(role_options.keys()), index=0)
current_user = role_options[selected_role_label]
st.session_state["current_user"] = current_user

st.sidebar.divider()

# Database Connection Control in Sidebar
st.sidebar.markdown("#### 🗄️ Database Connection")
db_type = st.sidebar.radio("Database Engine", ["MySQL", "SQLite (Local)"], index=0 if os.getenv("DB_TYPE", "sqlite").lower() == "mysql" else 1)
st.session_state["db_type"] = "mysql" if db_type == "MySQL" else "sqlite"

if db_type == "MySQL":
    with st.sidebar.expander("MySQL Credentials & Validator", expanded=True):
        st.session_state["db_host"] = st.text_input("Host", value=st.session_state.get("db_host", os.getenv("DB_HOST", "127.0.0.1")))
        st.session_state["db_port"] = st.number_input("Port", value=int(st.session_state.get("db_port", os.getenv("DB_PORT", "3306"))))
        st.session_state["db_user"] = st.text_input("User", value=st.session_state.get("db_user", os.getenv("DB_USER", "root")))
        st.session_state["db_password"] = st.text_input("Password", value=st.session_state.get("db_password", os.getenv("DB_PASSWORD", "")), type="password")
        st.session_state["db_name"] = st.text_input("Database Name", value=st.session_state.get("db_name", os.getenv("DB_NAME", "academia_lms")))

        if st.button("🔍 Validate MySQL Connection", use_container_width=True):
            res = validate_mysql_connection(
                st.session_state["db_host"],
                st.session_state["db_port"],
                st.session_state["db_user"],
                st.session_state["db_password"],
                st.session_state["db_name"]
            )
            if res["server_reachable"] and res["database_exists"]:
                st.success(f"✅ Connection Valid! Connected to MySQL `{st.session_state['db_name']}`. Found {len(res['tables_found'])} tables.")
            elif res["server_reachable"] and not res["database_exists"]:
                st.warning(f"⚠️ MySQL server reachable, but database `{st.session_state['db_name']}` is missing.")
                if st.button("Create Database Now"):
                    try:
                        conn = pymysql.connect(
                            host=st.session_state["db_host"],
                            port=st.session_state["db_port"],
                            user=st.session_state["db_user"],
                            password=st.session_state["db_password"]
                        )
                        with conn.cursor() as cur:
                            cur.execute(f"CREATE DATABASE IF NOT EXISTS {st.session_state['db_name']};")
                        conn.close()
                        init_database_tables()
                        st.success(f"Database `{st.session_state['db_name']}` created and schema initialized!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Failed to create database: {e}")
            else:
                st.error(f"❌ Connection Failed: {res['message']}")
                st.info("Tip: If your local MySQL service is stopped or using a different password, you can toggle to 'SQLite (Local)' anytime!")
else:
    st.sidebar.success("✅ SQLite local database engine active.")

st.sidebar.divider()

# Navigation Tabs
nav_items = ["Dashboard", "Students", "Instructors", "Courses", "Enrollments & Grades", "Student Portal", "SQL Studio & Diagnostics"]
if current_user["role"] == "student":
    nav_items = ["Student Portal", "Courses Catalog", "Instructors Directory"]

selected_view = st.sidebar.radio("Navigation", nav_items)

# ==========================================
# 3. VIEWS & LOGIC IMPLEMENTATION
# ==========================================

engine = get_engine()

# --- VIEW: DASHBOARD ---
if selected_view == "Dashboard":
    st.title("🏛️ Academic Administration Dashboard")
    st.caption("Live relational database key performance indicators")

    try:
        with engine.connect() as conn:
            tot_students = conn.execute(text("SELECT COUNT(*) FROM students")).scalar() or 0
            active_students = conn.execute(text("SELECT COUNT(*) FROM students WHERE status = 'Active'")).scalar() or 0
            tot_instructors = conn.execute(text("SELECT COUNT(*) FROM instructors")).scalar() or 0
            tot_courses = conn.execute(text("SELECT COUNT(*) FROM courses")).scalar() or 0
            tot_enrollments = conn.execute(text("SELECT COUNT(*) FROM enrollments")).scalar() or 0
            tot_rev = conn.execute(text("""
                SELECT COALESCE(SUM(c.fee), 0) FROM enrollments e 
                JOIN courses c ON e.course_id = c.id
                WHERE e.status IN ('Enrolled', 'Completed')
            """)).scalar() or 0
            avg_grade = conn.execute(text("SELECT COALESCE(AVG(total_mark), 0) FROM grades")).scalar() or 0
    except Exception as e:
        st.error(f"Error querying database: {e}")
        tot_students = tot_instructors = tot_courses = tot_enrollments = tot_rev = avg_grade = 0

    # Top KPI metric cards
    col1, col2, col3, col4, col5 = st.columns(5)
    col1.metric("Total Students", f"{tot_students}", f"{active_students} Active")
    col2.metric("Faculty Members", f"{tot_instructors}")
    col3.metric("Total Courses", f"{tot_courses}")
    col4.metric("Enrollments", f"{tot_enrollments}")
    col5.metric("Gross Revenue", f"${tot_rev:,.2f}")

    st.markdown("---")

    col_chart1, col_chart2 = st.columns(2)

    with col_chart1:
        st.subheader("📊 Course Catalog & Enrolled Numbers")
        try:
            with engine.connect() as conn:
                df_courses = pd.read_sql(text("""
                    SELECT c.course_name, COUNT(e.id) as enrolled_students, c.fee
                    FROM courses c
                    LEFT JOIN enrollments e ON c.id = e.course_id
                    GROUP BY c.id, c.course_name, c.fee
                """), conn)
                if not df_courses.empty:
                    st.bar_chart(df_courses.set_index("course_name")["enrolled_students"])
                else:
                    st.info("No courses registered yet.")
        except Exception as e:
            st.warning(f"Could not load course chart: {e}")

    with col_chart2:
        st.subheader("🎯 Academic Grade Letter Distribution")
        try:
            with engine.connect() as conn:
                df_grades = pd.read_sql(text("""
                    SELECT grade_letter, COUNT(*) as count 
                    FROM grades 
                    GROUP BY grade_letter 
                    ORDER BY count DESC
                """), conn)
                if not df_grades.empty:
                    st.bar_chart(df_grades.set_index("grade_letter")["count"])
                else:
                    st.info("No graded assessments recorded yet.")
        except Exception as e:
            st.warning(f"Could not load grades chart: {e}")

# --- VIEW: STUDENTS ---
elif selected_view == "Students":
    st.title("👥 Student Directory & Records")

    with engine.connect() as conn:
        df_students = pd.read_sql(text("SELECT id, name, email, phone, enrollment_date, status FROM students ORDER BY id DESC"), conn)

    tab_list, tab_add = st.tabs(["📋 Student Roster", "➕ Enroll New Student"])

    with tab_list:
        search = st.text_input("🔍 Search students by name or email:")
        if search:
            filtered = df_students[df_students["name"].str.contains(search, case=False, na=False) | df_students["email"].str.contains(search, case=False, na=False)]
            st.dataframe(filtered, use_container_width=True)
        else:
            st.dataframe(df_students, use_container_width=True)

    with tab_add:
        if current_user["role"] == "student":
            st.warning("Students are not permitted to add records.")
        else:
            with st.form("new_student_form"):
                st.subheader("Register New Student")
                col_a, col_b = st.columns(2)
                s_name = col_a.text_input("Full Name *")
                s_email = col_b.text_input("Official Email *")
                s_phone = col_a.text_input("Phone Number")
                s_status = col_b.selectbox("Account Status", ["Active", "Inactive", "Suspended"])
                s_submit = st.form_submit_button("Create Student Record")

                if s_submit:
                    if not s_name or not s_email:
                        st.error("Name and email are required.")
                    else:
                        today = datetime.now().strftime("%Y-%m-%d")
                        try:
                            with engine.begin() as conn:
                                res = conn.execute(
                                    text("INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (:n, :e, :p, :d, :st)"),
                                    {"n": s_name.strip(), "e": s_email.strip().lower(), "p": s_phone, "d": today, "st": s_status}
                                )
                                sid = res.lastrowid
                                username = s_email.split("@")[0].lower()
                                conn.execute(
                                    text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'student123', 'student', :ref, :n, :e)"),
                                    {"u": username, "ref": sid, "n": s_name, "e": s_email.lower()}
                                )
                            st.success(f"Student '{s_name}' registered successfully with ID #{sid}!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error registering student: {e}")

# --- VIEW: INSTRUCTORS ---
elif selected_view in ["Instructors", "Instructors Directory"]:
    st.title("👨‍🏫 Faculty Directory")

    with engine.connect() as conn:
        df_inst = pd.read_sql(text("SELECT id, name, email, specialization, status FROM instructors ORDER BY id DESC"), conn)

    st.dataframe(df_inst, use_container_width=True)

    if current_user["role"] == "admin":
        with st.expander("➕ Add Faculty Instructor (Admin Only)"):
            with st.form("add_inst_form"):
                i_name = st.text_input("Faculty Name (e.g. Dr. Jane Smith)")
                i_email = st.text_input("Email Address")
                i_spec = st.text_input("Academic Specialization")
                i_submit = st.form_submit_button("Add Instructor")

                if i_submit:
                    if not i_name or not i_email:
                        st.error("Name and email required.")
                    else:
                        try:
                            with engine.begin() as conn:
                                res = conn.execute(
                                    text("INSERT INTO instructors (name, email, specialization, status) VALUES (:n, :e, :s, 'Active')"),
                                    {"n": i_name.strip(), "e": i_email.strip().lower(), "s": i_spec.strip()}
                                )
                                i_id = res.lastrowid
                                uname = i_email.split("@")[0].lower()
                                conn.execute(
                                    text("INSERT INTO users (username, password, role, ref_id, name, email) VALUES (:u, 'instructor123', 'instructor', :r, :n, :e)"),
                                    {"u": uname, "r": i_id, "n": i_name, "e": i_email.lower()}
                                )
                            st.success(f"Faculty member '{i_name}' added successfully!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Error adding instructor: {e}")

# --- VIEW: COURSES ---
elif selected_view in ["Courses", "Courses Catalog"]:
    st.title("📚 Course Catalog")

    with engine.connect() as conn:
        df_courses = pd.read_sql(text("""
            SELECT c.id, c.course_name, c.description, i.name as instructor_name, c.duration_weeks, c.fee, c.status
            FROM courses c
            LEFT JOIN instructors i ON c.instructor_id = i.id
            ORDER BY c.id DESC
        """), conn)

    st.dataframe(df_courses, use_container_width=True)

    if current_user["role"] == "admin":
        with st.expander("➕ Create New Course (Admin Only)"):
            with engine.connect() as conn:
                inst_choices = conn.execute(text("SELECT id, name FROM instructors WHERE status = 'Active'")).fetchall()

            if not inst_choices:
                st.warning("Please add at least one faculty instructor before creating courses.")
            else:
                inst_dict = {f"{r[1]} (ID #{r[0]})": r[0] for r in inst_choices}
                with st.form("new_course_form"):
                    c_title = st.text_input("Course Title *")
                    c_desc = st.text_area("Course Description")
                    c_inst_label = st.selectbox("Assigned Instructor *", list(inst_dict.keys()))
                    col_w, col_f = st.columns(2)
                    c_weeks = col_w.number_input("Duration (Weeks)", min_value=1, max_value=52, value=12)
                    c_fee = col_f.number_input("Tuition Fee ($)", min_value=0.0, value=450.0, step=25.0)
                    c_submit = st.form_submit_button("Publish Course")

                    if c_submit:
                        if not c_title:
                            st.error("Course title is required.")
                        else:
                            try:
                                with engine.begin() as conn:
                                    conn.execute(
                                        text("""
                                            INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status)
                                            VALUES (:t, :d, :inst, :w, :f, 'Active')
                                        """),
                                        {"t": c_title.strip(), "d": c_desc.strip(), "inst": inst_dict[c_inst_label], "w": c_weeks, "f": c_fee}
                                    )
                                st.success(f"Course '{c_title}' published successfully!")
                                st.rerun()
                            except Exception as e:
                                st.error(f"Error publishing course: {e}")

# --- VIEW: ENROLLMENTS & GRADES ---
elif selected_view == "Enrollments & Grades":
    st.title("📝 Student Enrollments & Gradebook")

    tab_enr, tab_grade = st.tabs(["📋 Enrollments Roster", "🎯 Grade Assessments"])

    with tab_enr:
        with engine.connect() as conn:
            df_enr = pd.read_sql(text("""
                SELECT e.id as enrollment_id, s.name as student_name, c.course_name, i.name as instructor_name,
                       e.enrollment_date, e.status as enrollment_status,
                       g.grade_letter, g.total_mark
                FROM enrollments e
                JOIN students s ON e.student_id = s.id
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                ORDER BY e.id DESC
            """), conn)
        st.dataframe(df_enr, use_container_width=True)

        with st.expander("➕ Enroll Student into Course"):
            with engine.connect() as conn:
                students_list = conn.execute(text("SELECT id, name, email FROM students WHERE status = 'Active'")).fetchall()
                courses_list = conn.execute(text("SELECT id, course_name, fee FROM courses WHERE status = 'Active'")).fetchall()

            if students_list and courses_list:
                s_map = {f"{r[1]} ({r[2]}) [ID #{r[0]}]": r[0] for r in students_list}
                c_map = {f"{r[1]} (${r[2]}) [ID #{r[0]}]": r[0] for r in courses_list}

                with st.form("enroll_student_form"):
                    sel_s = st.selectbox("Select Student", list(s_map.keys()))
                    sel_c = st.selectbox("Select Course", list(c_map.keys()))
                    e_btn = st.form_submit_button("Confirm Enrollment")

                    if e_btn:
                        today = datetime.now().strftime("%Y-%m-%d")
                        try:
                            with engine.begin() as conn:
                                conn.execute(
                                    text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, 'Enrolled')"),
                                    {"s": s_map[sel_s], "c": c_map[sel_c], "d": today}
                                )
                            st.success("Student successfully enrolled!")
                            st.rerun()
                        except Exception as e:
                            st.error(f"Enrollment failed: {e}")

    with tab_grade:
        st.subheader("Record Assessment Marks")
        with engine.connect() as conn:
            enr_to_grade = conn.execute(text("""
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

        if enr_to_grade:
            eg_map = {f"Enrollment #{r[0]}: {r[1]} in {r[2]}": r for r in enr_to_grade}
            selected_eg_label = st.selectbox("Select Enrollment to Grade", list(eg_map.keys()))
            rec = eg_map[selected_eg_label]

            with st.form("grading_form"):
                col_g1, col_g2, col_g3 = st.columns(3)
                m_assign = col_g1.number_input("Assignment Mark (out of 25)", min_value=0.0, max_value=25.0, value=float(rec[3]))
                m_quiz = col_g2.number_input("Quiz Mark (out of 25)", min_value=0.0, max_value=25.0, value=float(rec[4]))
                m_exam = col_g3.number_input("Final Exam Mark (out of 50)", min_value=0.0, max_value=50.0, value=float(rec[5]))
                m_feedback = st.text_area("Instructor Feedback", value=rec[6])

                total = m_assign + m_quiz + m_exam
                if total >= 90:
                    letter = 'A'
                elif total >= 80:
                    letter = 'B'
                elif total >= 70:
                    letter = 'C'
                elif total >= 60:
                    letter = 'D'
                else:
                    letter = 'F'

                st.info(f"**Computed Total:** {total:.1f} / 100.0 (Grade Letter: **{letter}**)")
                save_grade = st.form_submit_button("Save & Publish Grade")

                if save_grade:
                    try:
                        with engine.begin() as conn:
                            # Upsert grade
                            existing = conn.execute(text("SELECT id FROM grades WHERE enrollment_id = :eid"), {"eid": rec[0]}).first()
                            if existing:
                                conn.execute(text("""
                                    UPDATE grades 
                                    SET assignment_mark = :a, quiz_mark = :q, final_exam_mark = :f, total_mark = :tot, grade_letter = :gl, feedback = :fb
                                    WHERE enrollment_id = :eid
                                """), {"a": m_assign, "q": m_quiz, "f": m_exam, "tot": total, "gl": letter, "fb": m_feedback, "eid": rec[0]})
                            else:
                                conn.execute(text("""
                                    INSERT INTO grades (enrollment_id, assignment_mark, quiz_mark, final_exam_mark, total_mark, grade_letter, feedback)
                                    VALUES (:eid, :a, :q, :f, :tot, :gl, :fb)
                                """), {"eid": rec[0], "a": m_assign, "q": m_quiz, "f": m_exam, "tot": total, "gl": letter, "fb": m_feedback})
                        st.success(f"Grade {letter} ({total:.1f}%) recorded successfully!")
                        st.rerun()
                    except Exception as e:
                        st.error(f"Grading error: {e}")

# --- VIEW: STUDENT PORTAL ---
elif selected_view == "Student Portal":
    st.title("🎓 My Student Learning Portal")

    student_id = current_user.get("ref_id", 1)

    with engine.connect() as conn:
        s_info = conn.execute(text("SELECT * FROM students WHERE id = :id"), {"id": student_id}).mappings().first()

    if s_info:
        st.markdown(f"**Student:** {s_info['name']} | **Email:** {s_info['email']} | **Status:** `{s_info['status']}`")

        st.subheader("📚 Enrolled Courses & Academic Transcript")
        with engine.connect() as conn:
            df_my_enr = pd.read_sql(text("""
                SELECT c.course_name, i.name as instructor, e.enrollment_date, e.status,
                       g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
                FROM enrollments e
                JOIN courses c ON e.course_id = c.id
                LEFT JOIN instructors i ON c.instructor_id = i.id
                LEFT JOIN grades g ON e.id = g.enrollment_id
                WHERE e.student_id = :sid
                ORDER BY e.id DESC
            """), conn, params={"sid": student_id})

        if not df_my_enr.empty:
            st.dataframe(df_my_enr, use_container_width=True)
        else:
            st.info("You are not currently enrolled in any courses.")

        st.subheader("➕ Self-Register for Available Courses")
        with engine.connect() as conn:
            df_avail = pd.read_sql(text("""
                SELECT c.id, c.course_name, c.description, i.name as instructor_name, c.duration_weeks, c.fee
                FROM courses c
                LEFT JOIN instructors i ON c.instructor_id = i.id
                WHERE c.status IN ('Active', 'Upcoming')
                AND c.id NOT IN (
                    SELECT course_id FROM enrollments WHERE student_id = :sid AND status IN ('Enrolled', 'Completed')
                )
            """), conn, params={"sid": student_id})

        if not df_avail.empty:
            st.dataframe(df_avail, use_container_width=True)
            c_select = st.selectbox("Select Course to Register", df_avail["course_name"].tolist())
            if st.button("Register for Course"):
                c_id = int(df_avail[df_avail["course_name"] == c_select]["id"].values[0])
                today = datetime.now().strftime("%Y-%m-%d")
                with engine.begin() as conn:
                    conn.execute(
                        text("INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (:s, :c, :d, 'Enrolled')"),
                        {"s": student_id, "c": c_id, "d": today}
                    )
                st.success(f"Enrolled in '{c_select}'!")
                st.rerun()
        else:
            st.info("You are already enrolled in all available courses.")
    else:
        st.warning("No student record found for current session.")

# --- VIEW: SQL STUDIO & DIAGNOSTICS ---
elif selected_view == "SQL Studio & Diagnostics":
    st.title("🛠️ Database Studio & Connection Diagnostics")

    st.subheader("1. Active Database Information")
    cfg = get_connection_config()
    st.json({
        "Database Engine": cfg["db_type"].upper(),
        "Host": cfg["host"] if cfg["db_type"] == "mysql" else "Local File",
        "Port": cfg["port"] if cfg["db_type"] == "mysql" else "N/A",
        "Target Database": cfg["database"] if cfg["db_type"] == "mysql" else cfg["sqlite_path"]
    })

    st.subheader("2. Table Inspector")
    try:
        insp = inspect(engine)
        table_names = insp.get_table_names()
        st.write(f"**Found {len(table_names)} tables in database:**", table_names)

        t_pick = st.selectbox("Inspect table schema & rows", table_names)
        if t_pick:
            with engine.connect() as conn:
                df_t = pd.read_sql(text(f"SELECT * FROM {t_pick} LIMIT 50"), conn)
                st.dataframe(df_t, use_container_width=True)
    except Exception as e:
        st.error(f"Error inspecting tables: {e}")

    st.subheader("3. Raw SQL Query Console")
    query = st.text_area("Write SQL Query (e.g. SELECT * FROM courses;)", value="SELECT * FROM students LIMIT 10;")
    if st.button("Run Query"):
        try:
            with engine.connect() as conn:
                if query.strip().lower().startswith("select"):
                    res_df = pd.read_sql(text(query), conn)
                    st.dataframe(res_df, use_container_width=True)
                    st.success(f"Query returned {len(res_df)} rows.")
                else:
                    with engine.begin() as wconn:
                        r = wconn.execute(text(query))
                        st.success(f"Executed successfully! Rows affected: {r.rowcount}")
        except Exception as e:
            st.error(f"SQL Error: {e}")

st.markdown("---")
st.caption("AcademiaPro LMS | Powered by Streamlit & Python SQLAlchemy")
