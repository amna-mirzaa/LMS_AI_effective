import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function analyzeStudentPerformance(studentData: {
  studentName: string;
  email: string;
  enrollments: Array<{
    courseName: string;
    instructorName: string;
    status: string;
    assignmentMark: number;
    quizMark: number;
    finalExamMark: number;
    totalMark: number;
    gradeLetter: string;
  }>;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const prompt = `You are a Senior Academic Dean and Learning Analytics Specialist at an engineering institute.
Analyze the following student's academic profile and multi-course performance:

Student: ${studentData.studentName} (${studentData.email})
Academic Record:
${studentData.enrollments.map((e, idx) => `
${idx + 1}. Course: ${e.courseName} (Instructor: ${e.instructorName})
   Status: ${e.status}
   Assignment: ${e.assignmentMark}/100, Quiz: ${e.quizMark}/100, Final Exam: ${e.finalExamMark}/100
   Calculated Weighted Total: ${e.totalMark}%, Grade: ${e.gradeLetter}
`).join("\n")}

Provide a structured, rigorous assessment in JSON format with the following keys:
- "overallStatus": short summary classification (e.g., "Dean's Honors Candidate", "Satisfactory Progress", "Targeted Intervention Needed", "Academic Probation Risk")
- "academicExecutiveSummary": 2-3 concise paragraphs evaluating conceptual mastery, test consistency vs coursework completion.
- "coreStrengths": list of 3 bullet points identifying specific competencies.
- "riskFactors": list of 2-3 specific vulnerability areas (e.g. final exam variance vs assignment consistency).
- "fourWeekActionPlan": list of 4 concrete weekly milestone tasks for the student to achieve academic mastery.
- "instructorPedagogicalNote": actionable guidance for course instructors.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateCourseCurriculum(courseData: {
  courseName: string;
  description: string;
  instructorSpecialization: string;
  durationWeeks: number;
}) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const prompt = `You are a Principal Curriculum Architect for a top technical institute.
Design a comprehensive, industry-aligned syllabus for:
Course: ${courseData.courseName}
Overview: ${courseData.description}
Instructor Specialization: ${courseData.instructorSpecialization}
Duration: ${courseData.durationWeeks} Weeks

Provide a structured JSON output with:
- "prerequisites": list of 3-4 recommended foundational skills.
- "learningOutcomes": list of 4 measurable learning objectives (Bloom's Taxonomy).
- "weeklyModules": array of ${Math.min(courseData.durationWeeks, 8)} module objects, each with:
    "week": number,
    "topic": string,
    "lectureFocus": string,
    "handsOnLab": string
- "capstoneProject": object with "title", "description", "industryRelevance".
- "gradingRubric": list of assessment components with percentages.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSqlFromNaturalLanguage(userQuery: string) {
  const ai = getAiClient();
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  const schemaContext = `
The relational database has 5 tables:
1. students (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, phone TEXT, enrollment_date TEXT, status TEXT ['Active', 'Inactive', 'Suspended'])
2. instructors (id INTEGER PRIMARY KEY, name TEXT, email TEXT UNIQUE, specialization TEXT, status TEXT ['Active', 'On Leave', 'Inactive'])
3. courses (id INTEGER PRIMARY KEY, course_name TEXT, description TEXT, instructor_id INTEGER, duration_weeks INTEGER, fee REAL, status TEXT ['Active', 'Archived', 'Upcoming'], FOREIGN KEY (instructor_id) REFERENCES instructors(id))
4. enrollments (id INTEGER PRIMARY KEY, student_id INTEGER, course_id INTEGER, enrollment_date TEXT, status TEXT ['Enrolled', 'Completed', 'Dropped'], UNIQUE(student_id, course_id), FOREIGN KEY (student_id) REFERENCES students(id), FOREIGN KEY (course_id) REFERENCES courses(id))
5. grades (id INTEGER PRIMARY KEY, enrollment_id INTEGER UNIQUE, assignment_mark REAL, quiz_mark REAL, final_exam_mark REAL, total_mark REAL, grade_letter TEXT, feedback TEXT, FOREIGN KEY (enrollment_id) REFERENCES enrollments(id))
`;

  const prompt = `You are an expert SQL engineer.
Based on the following schema:
${schemaContext}

Translate this user's analytical question into standard SQLite/MySQL compliant SQL:
"${userQuery}"

Return JSON with:
- "sql": the clean SQL query string (no markdown formatting, valid syntax with appropriate JOINs, WHERE, GROUP BY, or ORDER BY as requested).
- "explanation": a concise 2-sentence explanation of how the query joins tables and performs the calculation.
- "complexity": "Simple" | "Moderate" | "Advanced"`;

  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}
