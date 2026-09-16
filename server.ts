import express, { Request, Response } from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  getDb,
  persistDb,
  seedInitialData,
  executeQuery,
  generateSqlDump,
  calculateGrade
} from "./server/db.ts";
import {
  analyzeStudentPerformance,
  generateCourseCurriculum,
  generateSqlFromNaturalLanguage
} from "./server/gemini.ts";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize database on server start
let dbReadyPromise = getDb();

// ============================================================================
// 1. Health & System Status
// ============================================================================
app.get("/api/health", async (req: Request, res: Response) => {
  res.json({
    status: "ok",
    database: "SQLite3 (Relational WebAssembly Engine)",
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// 1.1 Authentication & Role-Based Access Control
// ============================================================================
app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const result = executeQuery(
      db,
      `SELECT id, username, role, ref_id, name, email FROM users WHERE LOWER(username) = LOWER(?) AND password = ?;`,
      [username.trim(), password.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Invalid credentials. Please check your username and password." });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        ref_id: user.ref_id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/auth/demo-users", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const result = executeQuery(
      db,
      `SELECT id, username, password, role, ref_id, name, email FROM users ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1 
          WHEN 'instructor' THEN 2 
          WHEN 'student' THEN 3 
        END, id ASC;`
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Student Self-Registration (Sign-Up)
app.post("/api/auth/register-student", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { name, email, phone, username, password } = req.body;

    if (!name || !email || !username || !password) {
      return res.status(400).json({ error: "Name, email, username, and password are required." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check if email already registered in students or users
    const existingStudent = executeQuery(db, `SELECT id FROM students WHERE email = ?;`, [cleanEmail]);
    if (existingStudent.rows.length > 0) {
      return res.status(409).json({ error: `A student with email '${cleanEmail}' is already registered.` });
    }

    // Check if username already exists in users
    const existingUser = executeQuery(db, `SELECT id FROM users WHERE LOWER(username) = ?;`, [cleanUsername]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: `Username '${cleanUsername}' is already taken. Please choose another.` });
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Insert into students
    db.run(
      `INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (?, ?, ?, ?, 'Active');`,
      [name.trim(), cleanEmail, phone ? phone.trim() : '', today]
    );

    // Get the newly created student record
    const createdStudent = executeQuery(db, `SELECT * FROM students WHERE email = ?;`, [cleanEmail]).rows[0];
    const studentId = createdStudent.id;

    // 2. Insert into users with student role and ref_id
    db.run(
      `INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, 'student', ?, ?, ?);`,
      [cleanUsername, password.trim(), studentId, name.trim(), cleanEmail]
    );
    persistDb();

    const createdUser = executeQuery(db, `SELECT id, username, role, ref_id, name, email FROM users WHERE LOWER(username) = ?;`, [cleanUsername]).rows[0];

    res.status(201).json({
      success: true,
      message: `Registration successful! Welcome to AcademiaPro, ${name.trim()}.`,
      user: createdUser,
      student: createdStudent,
    });
  } catch (err: any) {
    console.error("Student registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Student Portal Data & Self-Service
app.get("/api/student/portal/:studentId", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const studentId = Number(req.params.studentId);

    // Student profile
    const studentRes = executeQuery(db, `SELECT * FROM students WHERE id = ?;`, [studentId]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found." });
    }
    const student = studentRes.rows[0];

    // Current enrollments with course details and grades
    const enrollmentsRes = executeQuery(
      db,
      `SELECT 
        e.id as enrollment_id, e.student_id, e.course_id, e.enrollment_date, e.status as enrollment_status,
        c.course_name, c.description, c.duration_weeks, c.fee,
        i.name as instructor_name, i.email as instructor_email, i.specialization as instructor_specialization,
        g.id as grade_id, g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
       FROM enrollments e
       JOIN courses c ON e.course_id = c.id
       JOIN instructors i ON c.instructor_id = i.id
       LEFT JOIN grades g ON e.id = g.enrollment_id
       WHERE e.student_id = ?
       ORDER BY e.id DESC;`,
      [studentId]
    );

    // Available courses to register (active courses student is NOT currently enrolled in)
    const availableRes = executeQuery(
      db,
      `SELECT 
        c.id, c.course_name, c.description, c.duration_weeks, c.fee, c.status,
        i.name as instructor_name, i.specialization as instructor_specialization
       FROM courses c
       JOIN instructors i ON c.instructor_id = i.id
       WHERE c.status IN ('Active', 'Upcoming')
       AND c.id NOT IN (
         SELECT course_id FROM enrollments WHERE student_id = ? AND status IN ('Enrolled', 'Completed')
       )
       ORDER BY c.id ASC;`,
      [studentId]
    );

    res.json({
      student,
      enrollments: enrollmentsRes.rows,
      availableCourses: availableRes.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/student/register-course", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { student_id, course_id } = req.body;

    if (!student_id || !course_id) {
      return res.status(400).json({ error: "Student ID and Course ID are required." });
    }

    // Verify course exists
    const courseRes = executeQuery(db, `SELECT course_name FROM courses WHERE id = ?;`, [Number(course_id)]);
    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: "Course not found." });
    }
    const courseName = courseRes.rows[0].course_name;

    // Check duplicate
    const existing = executeQuery(
      db,
      `SELECT id, status FROM enrollments WHERE student_id = ? AND course_id = ?;`,
      [Number(student_id), Number(course_id)]
    );

    if (existing.rows.length > 0) {
      const rec = existing.rows[0];
      if (rec.status === 'Dropped') {
        // Re-activate dropped enrollment
        db.run(
          `UPDATE enrollments SET status = 'Enrolled', enrollment_date = ? WHERE id = ?;`,
          [new Date().toISOString().split('T')[0], rec.id]
        );
        persistDb();
        return res.json({ success: true, message: `Successfully re-enrolled in "${courseName}".` });
      } else {
        return res.status(409).json({ error: `You are already enrolled in "${courseName}".` });
      }
    }

    const today = new Date().toISOString().split('T')[0];
    db.run(
      `INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (?, ?, ?, 'Enrolled');`,
      [Number(student_id), Number(course_id), today]
    );
    persistDb();

    res.status(201).json({ success: true, message: `Successfully registered in "${courseName}".` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/student/drop-course", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { student_id, enrollment_id } = req.body;

    if (!student_id || !enrollment_id) {
      return res.status(400).json({ error: "Student ID and Enrollment ID are required." });
    }

    const check = executeQuery(
      db,
      `SELECT e.id, c.course_name FROM enrollments e JOIN courses c ON e.course_id = c.id WHERE e.id = ? AND e.student_id = ?;`,
      [Number(enrollment_id), Number(student_id)]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Enrollment record not found or does not belong to this student." });
    }

    const courseName = check.rows[0].course_name;

    db.run(
      `UPDATE enrollments SET status = 'Dropped' WHERE id = ? AND student_id = ?;`,
      [Number(enrollment_id), Number(student_id)]
    );
    persistDb();

    res.json({ success: true, message: `Successfully dropped course "${courseName}".` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 2. Executive Dashboard KPIs & Statistics
// ============================================================================
app.get("/api/stats", async (req: Request, res: Response) => {
  try {
    const db = await getDb();

    const studentStats = executeQuery(db, `
      SELECT 
        COUNT(*) as total_students,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_students,
        SUM(CASE WHEN status = 'Inactive' THEN 1 ELSE 0 END) as inactive_students,
        SUM(CASE WHEN status = 'Suspended' THEN 1 ELSE 0 END) as suspended_students
      FROM students;
    `).rows[0] || {};

    const instructorStats = executeQuery(db, `
      SELECT 
        COUNT(*) as total_instructors,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_instructors
      FROM instructors;
    `).rows[0] || {};

    const courseStats = executeQuery(db, `
      SELECT 
        COUNT(*) as total_courses,
        SUM(CASE WHEN status = 'Active' THEN 1 ELSE 0 END) as active_courses,
        AVG(fee) as average_course_fee
      FROM courses;
    `).rows[0] || {};

    const enrollmentStats = executeQuery(db, `
      SELECT 
        COUNT(*) as total_enrollments,
        SUM(CASE WHEN status = 'Enrolled' THEN 1 ELSE 0 END) as enrolled_count,
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completed_count,
        SUM(CASE WHEN status = 'Dropped' THEN 1 ELSE 0 END) as dropped_count
      FROM enrollments;
    `).rows[0] || {};

    const gradeStats = executeQuery(db, `
      SELECT 
        AVG(total_mark) as average_grade,
        COUNT(*) as graded_enrollments,
        MAX(total_mark) as highest_grade,
        MIN(total_mark) as lowest_grade
      FROM grades;
    `).rows[0] || {};

    const revenueQuery = executeQuery(db, `
      SELECT SUM(c.fee) as total_revenue
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      WHERE e.status IN ('Enrolled', 'Completed');
    `).rows[0] || {};

    // Grade Distribution Histogram
    const gradeDistribution = executeQuery(db, `
      SELECT grade_letter, COUNT(*) as count
      FROM grades
      GROUP BY grade_letter
      ORDER BY 
        CASE grade_letter 
          WHEN 'A' THEN 1 
          WHEN 'B' THEN 2 
          WHEN 'C' THEN 3 
          WHEN 'D' THEN 4 
          ELSE 5 
        END;
    `).rows;

    res.json({
      students: {
        total: studentStats.total_students || 0,
        active: studentStats.active_students || 0,
        inactive: studentStats.inactive_students || 0,
        suspended: studentStats.suspended_students || 0
      },
      instructors: {
        total: instructorStats.total_instructors || 0,
        active: instructorStats.active_instructors || 0
      },
      courses: {
        total: courseStats.total_courses || 0,
        active: courseStats.active_courses || 0,
        avgFee: Math.round(courseStats.average_course_fee || 0)
      },
      enrollments: {
        total: enrollmentStats.total_enrollments || 0,
        enrolled: enrollmentStats.enrolled_count || 0,
        completed: enrollmentStats.completed_count || 0,
        dropped: enrollmentStats.dropped_count || 0,
        completionRate: enrollmentStats.total_enrollments 
          ? Number(((enrollmentStats.completed_count / enrollmentStats.total_enrollments) * 100).toFixed(1))
          : 0
      },
      academics: {
        averageGrade: gradeStats.average_grade ? Number(gradeStats.average_grade.toFixed(1)) : 0,
        gradedCount: gradeStats.graded_enrollments || 0,
        highestGrade: gradeStats.highest_grade || 0,
        lowestGrade: gradeStats.lowest_grade || 0,
        distribution: gradeDistribution
      },
      financials: {
        totalRevenue: revenueQuery.total_revenue || 0
      }
    });
  } catch (err: any) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 3. Students CRUD
// ============================================================================
app.get("/api/students", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || "").trim();
    const status = req.query.status as string;

    let query = `
      SELECT 
        s.id, s.name, s.email, s.phone, s.enrollment_date, s.status,
        COUNT(e.id) as enrollment_count,
        AVG(g.total_mark) as average_mark
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN grades g ON e.id = g.enrollment_id
    `;
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push(`(s.name LIKE ? OR s.email LIKE ? OR s.phone LIKE ?)`);
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (status && status !== 'All') {
      conditions.push(`s.status = ?`);
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    query += ` GROUP BY s.id ORDER BY s.id DESC;`;

    const result = executeQuery(db, query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/students/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const studentRes = executeQuery(db, `SELECT * FROM students WHERE id = ?;`, [id]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRes.rows[0];
    const enrollments = executeQuery(db, `
      SELECT 
        e.id as enrollment_id, e.enrollment_date, e.status as enrollment_status,
        c.id as course_id, c.course_name, c.fee, c.duration_weeks,
        i.name as instructor_name,
        g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN grades g ON e.id = g.enrollment_id
      WHERE e.student_id = ?
      ORDER BY e.id DESC;
    `, [id]).rows;

    res.json({ ...student, enrollments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/students", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { name, email, phone, enrollment_date, status = 'Active', username, password } = req.body;

    if (!name || !email || !phone || !enrollment_date) {
      return res.status(400).json({ error: "All student fields are required: Name, Email, Phone, Enrollment Date." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check unique email
    const existing = executeQuery(db, `SELECT id FROM students WHERE email = ?;`, [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `A student with email '${email}' already exists.` });
    }

    db.run(
      `INSERT INTO students (name, email, phone, enrollment_date, status) VALUES (?, ?, ?, ?, ?);`,
      [name.trim(), cleanEmail, phone.trim(), enrollment_date, status]
    );

    const newStudent = executeQuery(db, `SELECT * FROM students WHERE email = ?;`, [cleanEmail]).rows[0];
    const studentId = newStudent.id;

    // Generate or use provided username
    let desiredUsername = (username ? username.trim().toLowerCase() : cleanEmail.split('@')[0]);
    // Ensure uniqueness in users
    const existingUser = executeQuery(db, `SELECT id FROM users WHERE LOWER(username) = ?;`, [desiredUsername]);
    if (existingUser.rows.length > 0) {
      desiredUsername = `${desiredUsername}${studentId}`;
    }

    const initialPassword = (password && password.trim()) ? password.trim() : 'student123';

    // Provision user login credentials
    db.run(
      `INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, 'student', ?, ?, ?);`,
      [desiredUsername, initialPassword, studentId, name.trim(), cleanEmail]
    );
    persistDb();

    res.status(201).json({
      ...newStudent,
      username: desiredUsername,
      initial_password: initialPassword
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/students/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const { name, email, phone, enrollment_date, status } = req.body;

    // Check existing
    const existing = executeQuery(db, `SELECT id FROM students WHERE id = ?;`, [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate email
    if (email) {
      const emailConflict = executeQuery(db, `SELECT id FROM students WHERE email = ? AND id != ?;`, [cleanEmail, id]);
      if (emailConflict.rows.length > 0) {
        return res.status(409).json({ error: `Email '${email}' is already registered to another student.` });
      }
    }

    db.run(
      `UPDATE students SET name = ?, email = ?, phone = ?, enrollment_date = ?, status = ? WHERE id = ?;`,
      [name.trim(), cleanEmail, phone, enrollment_date, status, id]
    );

    // Sync corresponding user record if exists
    db.run(
      `UPDATE users SET name = ?, email = ? WHERE ref_id = ? AND role = 'student';`,
      [name.trim(), cleanEmail, id]
    );
    persistDb();

    const updated = executeQuery(db, `SELECT * FROM students WHERE id = ?;`, [id]).rows[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset or Set Student Password (Admin or Self)
app.post("/api/students/:id/reset-password", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const { new_password } = req.body;

    if (!new_password || !new_password.trim()) {
      return res.status(400).json({ error: "New password is required." });
    }

    const studentCheck = executeQuery(db, `SELECT * FROM students WHERE id = ?;`, [id]);
    if (studentCheck.rows.length === 0) {
      return res.status(404).json({ error: "Student not found." });
    }
    const student = studentCheck.rows[0];

    // Check if user record exists
    const userCheck = executeQuery(db, `SELECT id, username FROM users WHERE ref_id = ? AND role = 'student';`, [id]);
    let username = student.email.split('@')[0];

    if (userCheck.rows.length === 0) {
      // Create user record if not already present
      db.run(
        `INSERT INTO users (username, password, role, ref_id, name, email) VALUES (?, ?, 'student', ?, ?, ?);`,
        [username, new_password.trim(), id, student.name, student.email]
      );
    } else {
      username = userCheck.rows[0].username;
      db.run(
        `UPDATE users SET password = ? WHERE ref_id = ? AND role = 'student';`,
        [new_password.trim(), id]
      );
    }
    persistDb();

    res.json({
      success: true,
      message: `Password updated successfully for student "${student.name}".`,
      username,
      updated_password: new_password.trim()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Student Login Credentials info
app.get("/api/students/:id/credentials", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);

    const userRes = executeQuery(
      db,
      `SELECT id, username, password, role, email FROM users WHERE ref_id = ? AND role = 'student';`,
      [id]
    );

    if (userRes.rows.length === 0) {
      return res.json({ hasAccount: false });
    }

    const u = userRes.rows[0];
    res.json({
      hasAccount: true,
      username: u.username,
      password: u.password,
      email: u.email
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/students/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);

    const check = executeQuery(db, `SELECT name FROM students WHERE id = ?;`, [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Delete student and corresponding user account
    db.run(`DELETE FROM students WHERE id = ?;`, [id]);
    db.run(`DELETE FROM users WHERE ref_id = ? AND role = 'student';`, [id]);
    persistDb();

    res.json({ success: true, message: `Student '${check.rows[0].name}' and their login account were deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 4. Instructors CRUD
// ============================================================================
app.get("/api/instructors", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || "").trim();

    let query = `
      SELECT 
        i.id, i.name, i.email, i.specialization, i.status,
        COUNT(c.id) as course_count
      FROM instructors i
      LEFT JOIN courses c ON i.id = c.instructor_id
    `;
    const params: any[] = [];
    if (search) {
      query += ` WHERE (i.name LIKE ? OR i.email LIKE ? OR i.specialization LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY i.id ORDER BY i.name ASC;`;

    const result = executeQuery(db, query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/instructors", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { name, email, specialization, status = 'Active' } = req.body;

    if (!name || !email || !specialization) {
      return res.status(400).json({ error: "Name, Email, and Specialization are required." });
    }

    const existing = executeQuery(db, `SELECT id FROM instructors WHERE email = ?;`, [email.trim().toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `An instructor with email '${email}' already exists.` });
    }

    db.run(
      `INSERT INTO instructors (name, email, specialization, status) VALUES (?, ?, ?, ?);`,
      [name.trim(), email.trim().toLowerCase(), specialization.trim(), status]
    );
    persistDb();

    const newInst = executeQuery(db, `SELECT * FROM instructors WHERE email = ?;`, [email.trim().toLowerCase()]).rows[0];
    res.status(201).json(newInst);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/instructors/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const { name, email, specialization, status } = req.body;

    const emailCheck = executeQuery(db, `SELECT id FROM instructors WHERE email = ? AND id != ?;`, [email.trim().toLowerCase(), id]);
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: `Email '${email}' is already registered to another instructor.` });
    }

    db.run(
      `UPDATE instructors SET name = ?, email = ?, specialization = ?, status = ? WHERE id = ?;`,
      [name.trim(), email.trim().toLowerCase(), specialization.trim(), status, id]
    );
    persistDb();

    const updated = executeQuery(db, `SELECT * FROM instructors WHERE id = ?;`, [id]).rows[0];
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/instructors/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);

    // Check if instructor has active courses (Foreign Key RESTRICT compliance)
    const courses = executeQuery(db, `SELECT id, course_name FROM courses WHERE instructor_id = ?;`, [id]);
    if (courses.rows.length > 0) {
      return res.status(400).json({
        error: `Cannot delete instructor. They are currently assigned to ${courses.rows.length} course(s) (e.g., "${courses.rows[0].course_name}"). Reassign courses first.`
      });
    }

    db.run(`DELETE FROM instructors WHERE id = ?;`, [id]);
    persistDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 5. Courses CRUD
// ============================================================================
app.get("/api/courses", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const search = (req.query.search as string || "").trim();

    let query = `
      SELECT 
        c.id, c.course_name, c.description, c.instructor_id, c.duration_weeks, c.fee, c.status,
        i.name as instructor_name, i.specialization as instructor_specialization,
        COUNT(e.id) as enrolled_count
      FROM courses c
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN enrollments e ON c.id = e.course_id
    `;
    const params: any[] = [];
    if (search) {
      query += ` WHERE (c.course_name LIKE ? OR c.description LIKE ? OR i.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` GROUP BY c.id ORDER BY c.id ASC;`;

    const result = executeQuery(db, query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/courses", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { course_name, description = "", instructor_id, duration_weeks, fee, status = 'Active' } = req.body;

    if (!course_name || !instructor_id || !duration_weeks || fee === undefined) {
      return res.status(400).json({ error: "Course Name, Instructor, Duration (Weeks), and Fee are required." });
    }

    // Verify instructor exists
    const inst = executeQuery(db, `SELECT id FROM instructors WHERE id = ?;`, [instructor_id]);
    if (inst.rows.length === 0) {
      return res.status(400).json({ error: "Selected instructor does not exist." });
    }

    db.run(
      `INSERT INTO courses (course_name, description, instructor_id, duration_weeks, fee, status) VALUES (?, ?, ?, ?, ?, ?);`,
      [course_name.trim(), description.trim(), Number(instructor_id), Number(duration_weeks), Number(fee), status]
    );
    persistDb();

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/courses/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const { course_name, description, instructor_id, duration_weeks, fee, status } = req.body;

    db.run(
      `UPDATE courses SET course_name = ?, description = ?, instructor_id = ?, duration_weeks = ?, fee = ?, status = ? WHERE id = ?;`,
      [course_name, description, Number(instructor_id), Number(duration_weeks), Number(fee), status, id]
    );
    persistDb();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/courses/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);

    // Check for enrollments (Foreign Key RESTRICT compliance)
    const enrollments = executeQuery(db, `SELECT id FROM enrollments WHERE course_id = ?;`, [id]);
    if (enrollments.rows.length > 0) {
      return res.status(400).json({
        error: `Cannot delete course. There are ${enrollments.rows.length} existing student enrollments associated with it.`
      });
    }

    db.run(`DELETE FROM courses WHERE id = ?;`, [id]);
    persistDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 6. Enrollments CRUD (Resolves Many-to-Many with UNIQUE constraint)
// ============================================================================
app.get("/api/enrollments", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const status = req.query.status as string;

    let query = `
      SELECT 
        e.id, e.student_id, e.course_id, e.enrollment_date, e.status,
        s.name as student_name, s.email as student_email,
        c.course_name, c.fee,
        i.name as instructor_name,
        g.id as grade_id, g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN grades g ON e.id = g.enrollment_id
    `;
    const params: any[] = [];
    if (status && status !== 'All') {
      query += ` WHERE e.status = ?`;
      params.push(status);
    }
    query += ` ORDER BY e.id DESC;`;

    const result = executeQuery(db, query, params);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/enrollments", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { student_id, course_id, enrollment_date, status = 'Enrolled' } = req.body;

    if (!student_id || !course_id || !enrollment_date) {
      return res.status(400).json({ error: "Student, Course, and Enrollment Date are required." });
    }

    // Enforce UNIQUE(student_id, course_id) per requirements:
    // "UNIQUE(student_id, course_id) rule for duplicate enrollment prevention"
    const duplicate = executeQuery(
      db,
      `SELECT e.id, s.name as student_name, c.course_name 
       FROM enrollments e 
       JOIN students s ON e.student_id = s.id 
       JOIN courses c ON e.course_id = c.id 
       WHERE e.student_id = ? AND e.course_id = ?;`,
      [Number(student_id), Number(course_id)]
    );

    if (duplicate.rows.length > 0) {
      const match = duplicate.rows[0];
      return res.status(409).json({
        error: `Duplicate Enrollment Rejected: Student "${match.student_name}" is already enrolled in "${match.course_name}".`
      });
    }

    db.run(
      `INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES (?, ?, ?, ?);`,
      [Number(student_id), Number(course_id), enrollment_date, status]
    );
    persistDb();

    res.status(201).json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/enrollments/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    const { status, enrollment_date } = req.body;

    db.run(
      `UPDATE enrollments SET status = COALESCE(?, status), enrollment_date = COALESCE(?, enrollment_date) WHERE id = ?;`,
      [status, enrollment_date, id]
    );
    persistDb();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/enrollments/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);

    db.run(`DELETE FROM enrollments WHERE id = ?;`, [id]);
    persistDb();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 7. Grades CRUD
// ============================================================================
app.get("/api/grades", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = `
      SELECT 
        g.id, g.enrollment_id, g.assignment_mark, g.quiz_mark, g.final_exam_mark, g.total_mark, g.grade_letter, g.feedback,
        s.id as student_id, s.name as student_name, s.email as student_email,
        c.id as course_id, c.course_name,
        i.name as instructor_name,
        e.status as enrollment_status
      FROM grades g
      JOIN enrollments e ON g.enrollment_id = e.id
      JOIN students s ON e.student_id = s.id
      JOIN courses c ON e.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      ORDER BY g.total_mark DESC;
    `;
    const result = executeQuery(db, query);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/grades", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { enrollment_id, assignment_mark = 0, quiz_mark = 0, final_exam_mark = 0, feedback = "" } = req.body;

    if (!enrollment_id) {
      return res.status(400).json({ error: "Enrollment ID is required." });
    }

    const { total, letter } = calculateGrade(Number(assignment_mark), Number(quiz_mark), Number(final_exam_mark));

    // Check if grade already exists for this enrollment (UNIQUE constraint)
    const existing = executeQuery(db, `SELECT id FROM grades WHERE enrollment_id = ?;`, [Number(enrollment_id)]);

    if (existing.rows.length > 0) {
      // Update
      db.run(
        `UPDATE grades 
         SET assignment_mark = ?, quiz_mark = ?, final_exam_mark = ?, total_mark = ?, grade_letter = ?, feedback = ? 
         WHERE enrollment_id = ?;`,
        [Number(assignment_mark), Number(quiz_mark), Number(final_exam_mark), total, letter, feedback, Number(enrollment_id)]
      );
    } else {
      // Insert
      db.run(
        `INSERT INTO grades (enrollment_id, assignment_mark, quiz_mark, final_exam_mark, total_mark, grade_letter, feedback)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [Number(enrollment_id), Number(assignment_mark), Number(quiz_mark), Number(final_exam_mark), total, letter, feedback]
      );
    }
    persistDb();

    res.json({ success: true, total_mark: total, grade_letter: letter });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/grades/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const id = Number(req.params.id);
    db.run(`DELETE FROM grades WHERE id = ?;`, [id]);
    persistDb();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 8. Key Business Reports (BR-01 through BR-06 from Client Specification)
// ============================================================================
app.get("/api/reports/:id", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const reportId = req.params.id.toUpperCase();

    let sql = "";
    let title = "";
    let question = "";
    let sqlConcept = "";

    switch (reportId) {
      case "BR-01":
        title = "Course Enrollment Popularity";
        question = "Which courses have the highest number of enrolled students?";
        sqlConcept = "JOIN + COUNT + GROUP BY + ORDER BY";
        sql = `
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
          GROUP BY c.id
          ORDER BY enrolled_students_count DESC, c.course_name ASC;
        `;
        break;

      case "BR-02":
        title = "Instructor Teaching Workload";
        question = "How many courses is each instructor teaching?";
        sqlConcept = "LEFT JOIN + COUNT + GROUP BY";
        sql = `
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
          GROUP BY i.id
          ORDER BY assigned_courses_count DESC, i.name ASC;
        `;
        break;

      case "BR-03":
        title = "Student Performance & Honor Roll";
        question = "Which students have the highest total marks?";
        sqlConcept = "JOIN + SUM/Calculation + ORDER BY";
        sql = `
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
        `;
        break;

      case "BR-04":
        title = "Active Student Census & Status Breakdown";
        question = "How many students are active?";
        sqlConcept = "COUNT + WHERE + Conditional Aggregation";
        sql = `
          SELECT 
            status,
            COUNT(*) AS student_count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM students), 1) AS percentage_of_total
          FROM students
          GROUP BY status
          ORDER BY student_count DESC;
        `;
        break;

      case "BR-05":
        title = "Enrollment Lifecycle Distribution";
        question = "How many enrollments are Enrolled, Completed or Dropped?";
        sqlConcept = "GROUP BY + COUNT + Percentage";
        sql = `
          SELECT 
            status AS enrollment_status,
            COUNT(*) AS count,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM enrollments), 1) AS percentage
          FROM enrollments
          GROUP BY status
          ORDER BY count DESC;
        `;
        break;

      case "BR-06":
        title = "Zero-Enrollment Courses (Action Required)";
        question = "Which courses have no students enrolled?";
        sqlConcept = "LEFT JOIN + NULL Filtering";
        sql = `
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
        `;
        break;

      default:
        return res.status(404).json({ error: `Unknown report ID '${reportId}'. Valid options: BR-01 to BR-06.` });
    }

    const execution = executeQuery(db, sql);

    res.json({
      reportId,
      title,
      question,
      sqlConcept,
      sql: sql.trim(),
      executionTimeMs: execution.timeMs,
      rowCount: execution.rows.length,
      columns: execution.columns,
      data: execution.rows
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 9. Interactive SQL Console / Terminal Execution Engine
// ============================================================================
app.post("/api/sql/execute", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const query = (req.body.query || "").trim();

    if (!query) {
      return res.status(400).json({ error: "Query cannot be empty" });
    }

    // Execute query
    const execution = executeQuery(db, query);

    // If it modified data, persist
    const upper = query.toUpperCase();
    if (upper.includes("INSERT") || upper.includes("UPDATE") || upper.includes("DELETE") || upper.includes("DROP") || upper.includes("ALTER")) {
      persistDb();
    }

    res.json({
      success: true,
      columns: execution.columns,
      rows: execution.rows,
      rowCount: execution.rows.length,
      timeMs: execution.timeMs
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message,
      timeMs: 0
    });
  }
});

// ============================================================================
// 10. Database Schema Deliverable & Reset
// ============================================================================
app.get("/api/database/sql-dump", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const sqlDump = generateSqlDump(db);
    res.setHeader("Content-Type", "application/sql");
    res.setHeader("Content-Disposition", 'attachment; filename="lms_database.sql"');
    res.send(sqlDump);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/database/reset", async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    seedInitialData(db);
    persistDb();
    res.json({ success: true, message: "Relational database successfully reset with standard institute seed data." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 11. Gemini AI Academic Copilot
// ============================================================================
app.post("/api/ai/advisor", async (req: Request, res: Response) => {
  try {
    const { studentId } = req.body;
    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const db = await getDb();
    const studentRes = executeQuery(db, `SELECT * FROM students WHERE id = ?;`, [Number(studentId)]);
    if (studentRes.rows.length === 0) {
      return res.status(404).json({ error: "Student not found" });
    }

    const student = studentRes.rows[0];
    const enrollments = executeQuery(db, `
      SELECT 
        c.course_name as courseName,
        i.name as instructorName,
        e.status as status,
        COALESCE(g.assignment_mark, 0) as assignmentMark,
        COALESCE(g.quiz_mark, 0) as quizMark,
        COALESCE(g.final_exam_mark, 0) as finalExamMark,
        COALESCE(g.total_mark, 0) as totalMark,
        COALESCE(g.grade_letter, 'N/A') as gradeLetter
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN instructors i ON c.instructor_id = i.id
      LEFT JOIN grades g ON e.id = g.enrollment_id
      WHERE e.student_id = ?;
    `, [Number(studentId)]).rows;

    const analysis = await analyzeStudentPerformance({
      studentName: student.name,
      email: student.email,
      enrollments
    });

    res.json({ success: true, student, analysis });
  } catch (err: any) {
    console.error("AI Advisor error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/curriculum", async (req: Request, res: Response) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ error: "courseId is required" });
    }

    const db = await getDb();
    const courseRes = executeQuery(db, `
      SELECT c.*, i.specialization as instructor_specialization 
      FROM courses c 
      JOIN instructors i ON c.instructor_id = i.id 
      WHERE c.id = ?;
    `, [Number(courseId)]);

    if (courseRes.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const course = courseRes.rows[0];
    const curriculum = await generateCourseCurriculum({
      courseName: course.course_name,
      description: course.description || "",
      instructorSpecialization: course.instructor_specialization || "Computer Science",
      durationWeeks: course.duration_weeks || 12
    });

    res.json({ success: true, course, curriculum });
  } catch (err: any) {
    console.error("AI Curriculum error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/text-to-sql", async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "prompt is required" });
    }

    const result = await generateSqlFromNaturalLanguage(prompt);
    res.json(result);
  } catch (err: any) {
    console.error("AI Text-to-SQL error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// 12. Vite Middleware & Static Production Serving
// ============================================================================
async function startServer() {
  await dbReadyPromise;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AcademiaPro LMS] Monolithic Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
