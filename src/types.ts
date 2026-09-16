export type StudentStatus = 'Active' | 'Inactive' | 'Suspended';
export type InstructorStatus = 'Active' | 'On Leave' | 'Inactive';
export type CourseStatus = 'Active' | 'Archived' | 'Upcoming';
export type EnrollmentStatus = 'Enrolled' | 'Completed' | 'Dropped';
export type UserRole = 'admin' | 'instructor' | 'student';

export interface AuthUser {
  id: number;
  username: string;
  role: UserRole;
  ref_id?: number | null; // student id or instructor id
  name: string;
  email: string;
}

export interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  enrollment_date: string;
  status: StudentStatus;
  enrollment_count?: number;
  average_mark?: number;
}

export interface Instructor {
  id: number;
  name: string;
  email: string;
  specialization: string;
  status: InstructorStatus;
  course_count?: number;
}

export interface Course {
  id: number;
  course_name: string;
  description: string;
  instructor_id: number;
  duration_weeks: number;
  fee: number;
  status: CourseStatus;
  instructor_name?: string;
  instructor_specialization?: string;
  enrolled_count?: number;
}

export interface Enrollment {
  id: number;
  student_id: number;
  course_id: number;
  enrollment_date: string;
  status: EnrollmentStatus;
  student_name?: string;
  student_email?: string;
  course_name?: string;
  fee?: number;
  instructor_name?: string;
  grade_id?: number;
  assignment_mark?: number;
  quiz_mark?: number;
  final_exam_mark?: number;
  total_mark?: number;
  grade_letter?: string;
}

export interface Grade {
  id: number;
  enrollment_id: number;
  assignment_mark: number;
  quiz_mark: number;
  final_exam_mark: number;
  total_mark: number;
  grade_letter: string;
  feedback?: string;
  student_id?: number;
  student_name?: string;
  student_email?: string;
  course_id?: number;
  course_name?: string;
  instructor_name?: string;
  enrollment_status?: EnrollmentStatus;
}

export interface DashboardStats {
  students: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  instructors: {
    total: number;
    active: number;
  };
  courses: {
    total: number;
    active: number;
    avgFee: number;
  };
  enrollments: {
    total: number;
    enrolled: number;
    completed: number;
    dropped: number;
    completionRate: number;
  };
  academics: {
    averageGrade: number;
    gradedCount: number;
    highestGrade: number;
    lowestGrade: number;
    distribution: Array<{ grade_letter: string; count: number }>;
  };
  financials: {
    totalRevenue: number;
  };
}

export interface ReportData {
  reportId: string;
  title: string;
  question: string;
  sqlConcept: string;
  sql: string;
  executionTimeMs: number;
  rowCount: number;
  columns: string[];
  data: Record<string, any>[];
}

export type ActiveTab =
  | 'dashboard'
  | 'student_portal'
  | 'students'
  | 'instructors'
  | 'courses'
  | 'enrollments'
  | 'grades'
  | 'reports'
  | 'sql_studio'
  | 'schema_erd'
  | 'ai_copilot';
