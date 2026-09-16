import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

let dbInstance: Database | null = null;
const DB_FILE_PATH = path.join(process.cwd(), "lms_data.sqlite");

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE_PATH);
      dbInstance = new SQL.Database(fileBuffer);
      dbInstance.run("PRAGMA foreign_keys = ON;");
      
      // Auto-migrate: check if users table exists
      const userTableCheck = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users';");
      if (!userTableCheck.length || !userTableCheck[0].values.length) {
        console.log("Users table missing in existing database. Re-seeding fresh data...");
        seedInitialData(dbInstance);
        persistDb();
      } else {
        console.log("Loaded existing relational database from disk.");
      }
      return dbInstance;
    } catch (err) {
      console.error("Failed to load existing DB file, creating fresh DB:", err);
    }
  }

  dbInstance = new SQL.Database();
  dbInstance.run("PRAGMA foreign_keys = ON;");
  initializeSchema(dbInstance);
  seedInitialData(dbInstance);
  persistDb();
  console.log("Initialized new relational database with seed data.");
  return dbInstance;
}

export function persistDb() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (err) {
    console.error("Failed to persist database to disk:", err);
  }
}

export function initializeSchema(db: Database) {
  // Enforce foreign key constraints
  db.run("PRAGMA foreign_keys = ON;");

  const schema = `
    -- 0. User Authentication & Credentials Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'instructor', 'student')),
      ref_id INTEGER,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    );

    -- 1. Students Table
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL,
      enrollment_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Active', 'Inactive', 'Suspended'))
    );

    -- 2. Instructors Table
    CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      specialization TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Active', 'On Leave', 'Inactive'))
    );

    -- 3. Courses Table
    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_name TEXT NOT NULL,
      description TEXT,
      instructor_id INTEGER NOT NULL,
      duration_weeks INTEGER NOT NULL CHECK(duration_weeks > 0),
      fee REAL NOT NULL CHECK(fee >= 0),
      status TEXT NOT NULL CHECK(status IN ('Active', 'Archived', 'Upcoming')),
      FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE RESTRICT
    );

    -- 4. Enrollments Table (Resolves Many-to-Many with UNIQUE constraint)
    CREATE TABLE IF NOT EXISTS enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      enrollment_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Enrolled', 'Completed', 'Dropped')),
      UNIQUE(student_id, course_id),
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE RESTRICT
    );

    -- 5. Grades Table
    CREATE TABLE IF NOT EXISTS grades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enrollment_id INTEGER NOT NULL UNIQUE,
      assignment_mark REAL NOT NULL CHECK(assignment_mark >= 0 AND assignment_mark <= 100),
      quiz_mark REAL NOT NULL CHECK(quiz_mark >= 0 AND quiz_mark <= 100),
      final_exam_mark REAL NOT NULL CHECK(final_exam_mark >= 0 AND final_exam_mark <= 100),
      total_mark REAL NOT NULL CHECK(total_mark >= 0 AND total_mark <= 100),
      grade_letter TEXT NOT NULL,
      feedback TEXT,
      FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE
    );
  `;

  db.run(schema);
}

export function calculateGrade(assignment: number, quiz: number, finalExam: number) {
  // Weights: Assignment 25%, Quiz 25%, Final Exam 50%
  const total = Number(((assignment * 0.25) + (quiz * 0.25) + (finalExam * 0.50)).toFixed(1));
  let letter = 'F';
  if (total >= 90) letter = 'A';
  else if (total >= 80) letter = 'B';
  else if (total >= 70) letter = 'C';
  else if (total >= 60) letter = 'D';
  return { total, letter };
}

export function seedInitialData(db: Database) {
  // Clear any existing tables
  db.run("DROP TABLE IF EXISTS users;");
  db.run("DROP TABLE IF EXISTS grades;");
  db.run("DROP TABLE IF EXISTS enrollments;");
  db.run("DROP TABLE IF EXISTS courses;");
  db.run("DROP TABLE IF EXISTS instructors;");
  db.run("DROP TABLE IF EXISTS students;");

  initializeSchema(db);

  // Seed Users: Administrator
  db.run(
    "INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, ?, ?, ?, ?);",
    ["admin", "admin123", "admin", null, "Academic Administrator", "admin@institute.edu"]
  );

  // Seed Instructors
  const instructors = [
    { name: "Dr. Elena Rostova", email: "elena.rostova@institute.edu", specialization: "Machine Learning & AI", status: "Active" },
    { name: "Prof. Marcus Vance", email: "marcus.vance@institute.edu", specialization: "Cloud & Distributed Systems", status: "Active" },
    { name: "Dr. Sarah Chen", email: "sarah.chen@institute.edu", specialization: "Full-Stack Web Architecture", status: "Active" },
    { name: "Prof. David Thorne", email: "david.thorne@institute.edu", specialization: "Cybersecurity & Cryptography", status: "Active" },
    { name: "Dr. Amara Okafor", email: "amara.okafor@institute.edu", specialization: "Database Systems & Big Data", status: "Active" },
    { name: "Prof. Julian Keller", email: "julian.keller@institute.edu", specialization: "Mobile & Embedded Systems", status: "On Leave" },
  ];

  let instId = 1;
  for (const inst of instructors) {
    db.run(
      "INSERT INTO instructors (name, email, specialization, status) VALUES (?, ?, ?, ?);",
      [inst.name, inst.email, inst.specialization, inst.status]
    );
    // Create corresponding instructor user account
    const username = inst.email.split('@')[0];
    db.run(
      "INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, 'instructor', ?, ?, ?);",
      [username, "instructor123", instId, inst.name, inst.email]
    );
    instId++;
  }

  // Seed Students
  const students = [
    { name: "Aria Montgomery", email: "aria.m@student.edu", phone: "+1-555-0101", enrollment_date: "2025-01-15", status: "Active" },
    { name: "Liam O'Connor", email: "liam.oc@student.edu", phone: "+1-555-0102", enrollment_date: "2025-01-16", status: "Active" },
    { name: "Zara Patel", email: "zara.p@student.edu", phone: "+1-555-0103", enrollment_date: "2025-01-18", status: "Active" },
    { name: "Devon Brooks", email: "devon.b@student.edu", phone: "+1-555-0104", enrollment_date: "2025-01-20", status: "Active" },
    { name: "Maya Lin", email: "maya.lin@student.edu", phone: "+1-555-0105", enrollment_date: "2025-02-01", status: "Active" },
    { name: "Kai Nakamura", email: "kai.n@student.edu", phone: "+1-555-0106", enrollment_date: "2025-02-05", status: "Active" },
    { name: "Sofia Alvarez", email: "sofia.a@student.edu", phone: "+1-555-0107", enrollment_date: "2025-02-10", status: "Active" },
    { name: "Ethan Huntley", email: "ethan.h@student.edu", phone: "+1-555-0108", enrollment_date: "2025-02-12", status: "Inactive" },
    { name: "Chloe Dupont", email: "chloe.d@student.edu", phone: "+1-555-0109", enrollment_date: "2025-02-15", status: "Active" },
    { name: "Noah Washington", email: "noah.w@student.edu", phone: "+1-555-0110", enrollment_date: "2025-02-18", status: "Suspended" },
  ];

  let studId = 1;
  for (const s of students) {
    db.run(
      "INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (?, ?, ?, ?, ?);",
      [s.name, s.email, s.phone, s.enrollment_date, s.status]
    );
    // Create corresponding student user account
    const username = s.email.split('@')[0];
    db.run(
      "INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, 'student', ?, ?, ?);",
      [username, "student123", studId, s.name, s.email]
    );
    studId++;
  }

  // Seed Courses (Note: Course 7 has no students enrolled to satisfy BR-06 client acceptance test!)
  const courses = [
    { name: "CS-501: Relational Database Architecture", desc: "Deep dive into SQL, ACID transactions, normalization, indexing, and query optimization.", instructor_id: 5, duration: 12, fee: 1250, status: "Active" },
    { name: "AI-302: Applied Machine Learning & Neural Networks", desc: "Hands-on model development, feature engineering, and production model inference.", instructor_id: 1, duration: 14, fee: 1600, status: "Active" },
    { name: "WEB-201: Modern Full-Stack Systems", desc: "Production TypeScript, RESTful and GraphQL APIs, asynchronous microservices.", instructor_id: 3, duration: 10, fee: 950, status: "Active" },
    { name: "SEC-401: Enterprise Cybersecurity & Zero Trust", desc: "Threat modeling, cryptographic protocols, authentication barriers, and pen testing.", instructor_id: 4, duration: 8, fee: 1100, status: "Active" },
    { name: "CLOUD-305: Distributed Systems & Kubernetes", desc: "High-availability clustering, container orchestration, service mesh, and observability.", instructor_id: 2, duration: 10, fee: 1400, status: "Active" },
    { name: "DS-210: Data Pipelines & Stream Processing", desc: "Apache Kafka, real-time transformations, columnar data stores, and analytical ETL.", instructor_id: 5, duration: 12, fee: 1300, status: "Active" },
    { name: "EMB-101: Embedded IoT Hardware Engineering", desc: "Microcontroller programming, sensor telemetry, and RTOS architecture.", instructor_id: 6, duration: 8, fee: 850, status: "Upcoming" }, // 0 enrollments on purpose for BR-06
  ];

  for (const c of courses) {
    db.run(
      "INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status) VALUES (?, ?, ?, ?, ?, ?);",
      [c.name, c.desc, c.instructor_id, c.duration, c.fee, c.status]
    );
  }

  // Seed Enrollments
  const enrollments = [
    // Student 1 (Aria)
    { student_id: 1, course_id: 1, date: "2025-01-20", status: "Enrolled" },
    { student_id: 1, course_id: 2, date: "2025-01-21", status: "Completed" },
    { student_id: 1, course_id: 3, date: "2025-01-22", status: "Enrolled" },
    // Student 2 (Liam)
    { student_id: 2, course_id: 1, date: "2025-01-22", status: "Enrolled" },
    { student_id: 2, course_id: 5, date: "2025-01-25", status: "Completed" },
    // Student 3 (Zara)
    { student_id: 3, course_id: 2, date: "2025-01-24", status: "Enrolled" },
    { student_id: 3, course_id: 4, date: "2025-01-28", status: "Enrolled" },
    { student_id: 3, course_id: 6, date: "2025-02-01", status: "Enrolled" },
    // Student 4 (Devon)
    { student_id: 4, course_id: 3, date: "2025-01-25", status: "Enrolled" },
    { student_id: 4, course_id: 4, date: "2025-01-27", status: "Dropped" },
    // Student 5 (Maya)
    { student_id: 5, course_id: 1, date: "2025-02-02", status: "Enrolled" },
    { student_id: 5, course_id: 2, date: "2025-02-03", status: "Enrolled" },
    // Student 6 (Kai)
    { student_id: 6, course_id: 5, date: "2025-02-06", status: "Enrolled" },
    { student_id: 6, course_id: 6, date: "2025-02-07", status: "Completed" },
    // Student 7 (Sofia)
    { student_id: 7, course_id: 1, date: "2025-02-11", status: "Enrolled" },
    { student_id: 7, course_id: 3, date: "2025-02-12", status: "Enrolled" },
    // Student 8 (Ethan)
    { student_id: 8, course_id: 2, date: "2025-02-14", status: "Dropped" },
    // Student 9 (Chloe)
    { student_id: 9, course_id: 4, date: "2025-02-16", status: "Completed" },
    { student_id: 9, course_id: 6, date: "2025-02-17", status: "Enrolled" },
  ];

  for (const e of enrollments) {
    db.run(
      "INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (?, ?, ?, ?);",
      [e.student_id, e.course_id, e.date, e.status]
    );
  }

  // Seed Grades
  const grades = [
    { enrollment_id: 1, assign: 92, quiz: 88, exam: 94, feedback: "Exceptional mastery of query execution plans and index trees." },
    { enrollment_id: 2, assign: 96, quiz: 95, exam: 98, feedback: "Top tier performance in deep neural network design." },
    { enrollment_id: 3, assign: 85, quiz: 80, exam: 87, feedback: "Solid fullstack patterns; improve asynchronous error handling." },
    { enrollment_id: 4, assign: 78, quiz: 82, exam: 75, feedback: "Good SQL comprehension; needs practice with nested aggregations." },
    { enrollment_id: 5, assign: 90, quiz: 92, exam: 89, feedback: "Clean Kubernetes manifests and deployment strategy." },
    { enrollment_id: 6, assign: 88, quiz: 91, exam: 90, feedback: "Impressive attention to model validation and hyperparameter tuning." },
    { enrollment_id: 7, assign: 94, quiz: 90, exam: 92, feedback: "Strong cryptographic protocol implementations." },
    { enrollment_id: 8, assign: 82, quiz: 84, exam: 80, feedback: "Good stream pipeline logic; optimize windowed joins." },
    { enrollment_id: 9, assign: 89, quiz: 86, exam: 91, feedback: "Very consistent frontend-to-backend data flow." },
    { enrollment_id: 10, assign: 45, quiz: 50, exam: 40, feedback: "Incomplete lab exercises before withdrawal." },
    { enrollment_id: 11, assign: 91, quiz: 89, exam: 93, feedback: "Great database normalization schema submission." },
    { enrollment_id: 12, assign: 84, quiz: 86, exam: 88, feedback: "Effective backprop implementations from scratch." },
    { enrollment_id: 13, assign: 87, quiz: 85, exam: 89, feedback: "Good ingress routing and stateful sets setup." },
    { enrollment_id: 14, assign: 95, quiz: 94, exam: 96, feedback: "Outstanding distributed Kafka event broker architecture." },
    { enrollment_id: 15, assign: 76, quiz: 79, exam: 82, feedback: "Steady progression across database topics." },
    { enrollment_id: 16, assign: 83, quiz: 85, exam: 81, feedback: "Well structured component hierarchy." },
    { enrollment_id: 18, assign: 97, quiz: 98, exam: 95, feedback: "Flawless penetration testing report and patch remediation." },
    { enrollment_id: 19, assign: 88, quiz: 86, exam: 90, feedback: "Robust ETL data validation pipeline." },
  ];

  for (const g of grades) {
    const { total, letter } = calculateGrade(g.assign, g.quiz, g.exam);
    db.run(
      `INSERT INTO grades (enrollment_id, assignment_mark, quiz_mark, final_exam_mark, total_mark, grade_letter, feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [g.enrollment_id, g.assign, g.quiz, g.exam, total, letter, g.feedback]
    );
  }
}

export function executeQuery(db: Database, sql: string, params: any[] = []): { columns: string[]; rows: any[]; timeMs: number } {
  const startTime = performance.now();
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const columns = stmt.getColumnNames();
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  const timeMs = Number((performance.now() - startTime).toFixed(2));
  return { columns, rows, timeMs };
}

export function generateSqlDump(db: Database): string {
  const timestamp = new Date().toISOString();
  let dump = `-- ==========================================================================\n`;
  dump += `-- Learning Management System (LMS) - Relational Database Deliverable\n`;
  dump += `-- Standard SQL / MySQL Compatible Schema & Seed Dump\n`;
  dump += `-- Generated at: ${timestamp}\n`;
  dump += `-- Target DBMS: MySQL 8.0+ / SQLite 3 / PostgreSQL Compatible\n`;
  dump += `-- ==========================================================================\n\n`;

  dump += `SET FOREIGN_KEY_CHECKS = 0;\n`;
  dump += `DROP TABLE IF EXISTS users;\n`;
  dump += `DROP TABLE IF EXISTS grades;\n`;
  dump += `DROP TABLE IF EXISTS enrollments;\n`;
  dump += `DROP TABLE IF EXISTS courses;\n`;
  dump += `DROP TABLE IF EXISTS instructors;\n`;
  dump += `DROP TABLE IF EXISTS students;\n`;
  dump += `SET FOREIGN_KEY_CHECKS = 1;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`users\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE users (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  username VARCHAR(100) NOT NULL UNIQUE,\n`;
  dump += `  password VARCHAR(255) NOT NULL,\n`;
  dump += `  role ENUM('admin', 'instructor', 'student') NOT NULL,\n`;
  dump += `  ref_id INT NULL,\n`;
  dump += `  name VARCHAR(150) NOT NULL,\n`;
  dump += `  email VARCHAR(150) NOT NULL\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`students\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE students (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  name VARCHAR(150) NOT NULL,\n`;
  dump += `  email VARCHAR(150) NOT NULL UNIQUE,\n`;
  dump += `  phone VARCHAR(50) NOT NULL,\n`;
  dump += `  enrollment_date DATE NOT NULL,\n`;
  dump += `  status ENUM('Active', 'Inactive', 'Suspended') NOT NULL DEFAULT 'Active'\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`instructors\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE instructors (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  name VARCHAR(150) NOT NULL,\n`;
  dump += `  email VARCHAR(150) NOT NULL UNIQUE,\n`;
  dump += `  specialization VARCHAR(150) NOT NULL,\n`;
  dump += `  status ENUM('Active', 'On Leave', 'Inactive') NOT NULL DEFAULT 'Active'\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`courses\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE courses (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  course_name VARCHAR(150) NOT NULL,\n`;
  dump += `  description TEXT,\n`;
  dump += `  instructor_id INT NOT NULL,\n`;
  dump += `  duration_weeks INT NOT NULL,\n`;
  dump += `  fee DECIMAL(10, 2) NOT NULL,\n`;
  dump += `  status ENUM('Active', 'Archived', 'Upcoming') NOT NULL DEFAULT 'Active',\n`;
  dump += `  CONSTRAINT fk_course_instructor FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON UPDATE CASCADE ON DELETE RESTRICT\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`enrollments\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE enrollments (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  student_id INT NOT NULL,\n`;
  dump += `  course_id INT NOT NULL,\n`;
  dump += `  enrollment_date DATE NOT NULL,\n`;
  dump += `  status ENUM('Enrolled', 'Completed', 'Dropped') NOT NULL DEFAULT 'Enrolled',\n`;
  dump += `  CONSTRAINT uq_student_course UNIQUE (student_id, course_id),\n`;
  dump += `  CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES students(id) ON UPDATE CASCADE ON DELETE CASCADE,\n`;
  dump += `  CONSTRAINT fk_enrollment_course FOREIGN KEY (course_id) REFERENCES courses(id) ON UPDATE CASCADE ON DELETE RESTRICT\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `-- Table structure for table \`grades\`\n`;
  dump += `-- --------------------------------------------------------------------------\n`;
  dump += `CREATE TABLE grades (\n`;
  dump += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  dump += `  enrollment_id INT NOT NULL UNIQUE,\n`;
  dump += `  assignment_mark DECIMAL(5, 2) NOT NULL DEFAULT 0.00,\n`;
  dump += `  quiz_mark DECIMAL(5, 2) NOT NULL DEFAULT 0.00,\n`;
  dump += `  final_exam_mark DECIMAL(5, 2) NOT NULL DEFAULT 0.00,\n`;
  dump += `  total_mark DECIMAL(5, 2) NOT NULL DEFAULT 0.00,\n`;
  dump += `  grade_letter VARCHAR(5) NOT NULL,\n`;
  dump += `  feedback TEXT,\n`;
  dump += `  CONSTRAINT fk_grades_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE\n`;
  dump += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

  // Append data dumps
  const tables = ['users', 'instructors', 'students', 'courses', 'enrollments', 'grades'];
  for (const t of tables) {
    const res = executeQuery(db, `SELECT * FROM ${t};`);
    if (res.rows.length > 0) {
      dump += `-- Data for table \`${t}\`\n`;
      for (const row of res.rows) {
        const keys = Object.keys(row).join(', ');
        const vals = Object.values(row).map(v => {
          if (v === null || v === undefined) return 'NULL';
          if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
          return v;
        }).join(', ');
        dump += `INSERT INTO ${t} (${keys}) VALUES (${vals});\n`;
      }
      dump += `\n`;
    }
  }

  dump += `-- End of LMS Database Deliverable Export\n`;
  return dump;
}
