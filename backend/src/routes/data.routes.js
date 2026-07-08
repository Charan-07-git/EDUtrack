// ============================================================
// Data Routes – profile, dashboard, classes, analytics, goals,
// attendance reports, leaderboard, and CSV export.
// All routes require JWT authentication.
// ============================================================

import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const r = Router();
r.use(auth); // All routes below require a valid JWT token

// --------------------------------------------------
// GET /me – Get the authenticated user's profile
// Returns selected fields (excludes sensitive data like password)
// --------------------------------------------------
r.get("/me", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      semester: true,
      year: true,
      selectedSubject: true,
      designation: true,
      facultyCode: true,
      photoUrl: true,
      faceDescriptor: true,
      faceRegistered: true,
    },
  });
  res.json(user);
});

// --------------------------------------------------
// PUT /me – Update the authenticated user's profile
// Accepts partial updates: name, department, semester, etc.
// If facultyCode is provided, looks up designation from timetable data
// --------------------------------------------------
r.put("/me", async (req, res) => {
  const { name, department, semester, year, selectedSubject, facultyCode, photoUrl, faceRegistered } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (department !== undefined) data.department = department;
  if (semester !== undefined) data.semester = Number(semester);
  if (year !== undefined) data.year = Number(year);
  if (selectedSubject !== undefined) data.selectedSubject = selectedSubject;
  if (photoUrl !== undefined) data.photoUrl = photoUrl;
  if (faceRegistered !== undefined) data.faceRegistered = Boolean(faceRegistered);
  // Auto-detect designation (Dr./Prof.) from timetable data based on faculty code
  if (facultyCode !== undefined) {
    data.facultyCode = facultyCode;
    try {
      const td = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
      for (const semData of Object.values(td.default.semesters)) {
        for (const slots of Object.values(semData.timetable)) {
          for (const slot of slots) {
            if (slot.facultyCode === facultyCode) {
              const prefix = slot.faculty.match(/^(Dr\.|Prof\.)\s/)?.[1] || "";
              if (prefix) data.designation = prefix;
              break;
            }
          }
        }
      }
    } catch {}
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, name: true, email: true, role: true, department: true, semester: true, year: true, selectedSubject: true, photoUrl: true, designation: true, facultyCode: true },
  });
  res.json(user);
});

// --------------------------------------------------
// DELETE /me – Delete the authenticated user's account
// Cascades: removes announcements, attendance, sessions, timetable, classes, goals
// --------------------------------------------------
r.delete("/me", async (req, res) => {
  await prisma.announcement.deleteMany({ where: { teacherId: req.user.id } });
  await prisma.attendance.deleteMany({ where: { studentId: req.user.id } });
  await prisma.session.deleteMany({ where: { teacherId: req.user.id } });
  await prisma.timetable.deleteMany({ where: { class: { teacherId: req.user.id } } });
  await prisma.class.deleteMany({ where: { teacherId: req.user.id } });
  await prisma.goal.deleteMany({ where: { studentId: req.user.id } });
  await prisma.user.delete({ where: { id: req.user.id } });
  res.json({ success: true });
});

// --------------------------------------------------
// PUT /me/password – Change password
// Verifies current password before updating to new one
// --------------------------------------------------
r.put("/me/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
    return res.status(400).json({ message: "Current password is incorrect" });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: req.user.id }, data: { password: hash } });
  res.json({ success: true });
});

// --------------------------------------------------
// PUT /me/face-descriptor – Store face recognition data
// Expects an array of 128 face descriptor numbers (from face-api.js)
// Marks the user as face-registered
// --------------------------------------------------
r.put("/me/face-descriptor", async (req, res) => {
  const { faceDescriptor, photoUrl } = req.body;
  if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
    return res.status(400).json({ message: "faceDescriptor must be an array of 128 numbers" });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      faceDescriptor: faceDescriptor,
      faceRegistered: true,
      ...(photoUrl ? { photoUrl } : {}),
    },
    select: { id: true, name: true, faceDescriptor: true, faceRegistered: true, photoUrl: true },
  });
  res.json({ success: true, stored: true, user });
});

// --------------------------------------------------
// PUT /me/face-photos – Store 6 face photo URLs for training
// --------------------------------------------------
r.put("/me/face-photos", async (req, res) => {
  const { facePhotos } = req.body;
  if (!facePhotos || !Array.isArray(facePhotos) || facePhotos.length !== 6) {
    return res.status(400).json({ message: "facePhotos must be an array of 6 photo URLs" });
  }
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { facePhotos },
    select: { id: true, name: true, facePhotos: true, faceRegistered: true },
  });
  res.json({ success: true, user });
});

// --------------------------------------------------
// GET /teacher/dashboard – Teacher's dashboard data
// Returns all classes with their timetable and sessions
// --------------------------------------------------
r.get("/teacher/dashboard", async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    include: { timetable: true, sessions: true },
  });
  res.json({ classes, lowAttendance: [] });
});

// --------------------------------------------------
// GET /student/dashboard – Student's dashboard data
// Shows classes matching their department/semester OR classes they've attended
// --------------------------------------------------
r.get("/student/dashboard", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });
  const where = [];
  if (user.department && user.semester) {
    where.push({ department: user.department, semester: user.semester });
  }
  where.push({ sessions: { some: { attendances: { some: { studentId: req.user.id } } } } });
  const classes = await prisma.class.findMany({
    where: { OR: where },
    include: {
      timetable: true,
      sessions: { include: { attendances: true } },
    },
  });
  res.json({ classes });
});

// --------------------------------------------------
// GET /classes/today – Get today's classes
// For teachers: filters by day of week; auto-creates classes if none exist
// For students: shows classes matching their dept/semester on today's day
// --------------------------------------------------
r.get("/classes/today", async (req, res) => {
  const now = new Date();
  const day = now.getDay();

  if (req.user.role === "TEACHER") {
    const semFilter = req.query.semester ? Number(req.query.semester) : null;
    let classes = await prisma.class.findMany({
      where: { teacherId: req.user.id, ...(semFilter ? { semester: semFilter } : {}) },
      include: { timetable: true },
    });
    // Auto-create classes from teacher's selected subjects if none exist yet
    if (classes.length === 0) {
      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (user?.selectedSubject) {
        try {
          const subjects = JSON.parse(user.selectedSubject);
          const filtered = semFilter ? subjects.filter((s) => s.semester === semFilter) : subjects;
          for (const sub of filtered) {
            const created = await prisma.class.create({
              data: {
                subject: sub.name,
                code: sub.code,
                department: sub.department || "CSE",
                semester: sub.semester,
                year: Math.ceil(sub.semester / 2),
                teacherId: req.user.id,
              },
            });
            classes.push({ ...created, timetable: [] });
          }
        } catch {}
      }
    }
    const todayClasses = classes.filter((c) => c.timetable.length === 0 || c.timetable.some((t) => t.dayOfWeek === day));
    res.json(todayClasses);
  } else {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user.department || !user.semester) return res.json([]);
    const classes = await prisma.class.findMany({
      where: {
        department: user.department,
        semester: user.semester,
        timetable: { some: { dayOfWeek: day } },
      },
      include: { timetable: true },
    });
    res.json(classes);
  }
});

// --------------------------------------------------
// GET /analytics – Teacher's attendance analytics
// Returns assigned/taken counts plus hardcoded chart data
// --------------------------------------------------
r.get("/analytics", async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    include: { sessions: true },
  });
  res.json({
    assigned: classes.length,
    taken: classes.reduce(
      (a, c) => a + c.sessions.filter((s) => s.endTime).length,
      0
    ),
    studentWise: [82, 74, 91, 65],
    semesterWise: [78, 84, 69, 88],
    subjectWise: [80, 76, 92, 70],
    yearWise: [73, 81, 87, 68],
  });
});

// --------------------------------------------------
// GET /teacher/classes – List all classes for a teacher
// --------------------------------------------------
r.get("/teacher/classes", async (req, res) => {
  try {
    const classes = await prisma.class.findMany({
      where: { teacherId: req.user.id },
      select: {
        id: true,
        subject: true,
        code: true,
        department: true,
        semester: true,
      },
    });
    res.json(classes);
  } catch (err) {
    console.error("GET teacher/classes error:", err?.message || err);
    res.status(500).json({ message: err?.message || "Failed to load classes" });
  }
});

// --------------------------------------------------
// GET /teacher/student-report/:classId – Per-student attendance report
// For each student in the class, calculates sessions attended + percentage
// Flags students below 75% attendance
// --------------------------------------------------
r.get("/teacher/student-report/:classId", async (req, res) => {
  const { classId } = req.params;

  const classData = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      sessions: {
        include: { attendances: true },
      },
    },
  });

  if (!classData) {
    return res.status(404).json({ message: "Class not found" });
  }

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      department: classData.department,
      semester: classData.semester,
    },
    select: {
      id: true,
      name: true,
      email: true,
      department: true,
      semester: true,
      photoUrl: true,
    },
  });

  const totalSessions = classData.sessions.filter((s) => s.endTime).length;
  const report = students.map((student) => {
    const attended = classData.sessions.reduce((acc, session) => {
      return acc + session.attendances.filter((a) => a.studentId === student.id).length;
    }, 0);
    const percent = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      photoUrl: student.photoUrl,
      attended,
      total: totalSessions,
      percent,
      below75: percent < 75,
    };
  });

  res.json({
    class: {
      id: classData.id,
      subject: classData.subject,
      code: classData.code,
      department: classData.department,
      semester: classData.semester,
      totalSessions,
    },
    students: report,
  });
});

// --------------------------------------------------
// POST /teacher/subjects – Create a new subject/class
// Auto-generates a subject code from initials + random suffix
// Also saves to teacher's selectedSubject JSON field
// --------------------------------------------------
r.post("/teacher/subjects", async (req, res) => {
  try {
    const { name, semester } = req.body;
    if (!name || !semester) {
      return res.status(400).json({ message: "Subject name and semester are required" });
    }
    const initials = name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 4);
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${initials}${suffix}`;
    const cls = await prisma.class.create({
      data: {
        subject: name,
        code,
        department: "CSE",
        semester: Number(semester),
        year: Math.ceil(Number(semester) / 2),
        teacherId: req.user.id,
      },
    });
    // Persist subject in teacher's selectedSubject JSON for auto-class creation
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let subjects = [];
    if (user.selectedSubject) {
      try { subjects = JSON.parse(user.selectedSubject); } catch { subjects = []; }
    }
    subjects.push({ semester: cls.semester, code: cls.code, name: cls.subject, department: cls.department });
    await prisma.user.update({
      where: { id: req.user.id },
      data: { selectedSubject: JSON.stringify(subjects) },
    });
    res.json(cls);
  } catch (err) {
    console.error("create subject error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// PUT /teacher/subjects/:code – Update an existing subject
// Updates both the Class record and the teacher's selectedSubject list
// --------------------------------------------------
r.put("/teacher/subjects/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const { name, semester } = req.body;
    const existing = await prisma.class.findFirst({
      where: { code, teacherId: req.user.id },
    });
    if (existing) {
      await prisma.class.update({
        where: { id: existing.id },
        data: {
          ...(name !== undefined && { subject: name }),
          ...(semester !== undefined && { semester: Number(semester), year: Math.ceil(Number(semester) / 2) }),
        },
      });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let subjects = [];
    if (user.selectedSubject) {
      try { subjects = JSON.parse(user.selectedSubject); } catch { subjects = []; }
    }
    const idx = subjects.findIndex((s) => s.code === code);
    if (idx !== -1) {
      subjects[idx] = {
        semester: semester !== undefined ? Number(semester) : subjects[idx].semester,
        code,
        name: name || subjects[idx].name,
        department: subjects[idx].department,
      };
    }
    await prisma.user.update({
      where: { id: req.user.id },
      data: { selectedSubject: JSON.stringify(subjects) },
    });
    res.json({ code, subject: name, semester: Number(semester) });
  } catch (err) {
    console.error("edit subject error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// GET /teacher/my-subjects – Get teacher's selected subject list
// Merges stored JSON subjects with any existing Class records
// --------------------------------------------------
r.get("/teacher/my-subjects", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    let subjects = [];
    if (user.selectedSubject) {
      try { subjects = JSON.parse(user.selectedSubject); } catch { subjects = []; }
    }
    const existingClasses = await prisma.class.findMany({
      where: { teacherId: req.user.id },
      select: { semester: true, code: true, subject: true, department: true },
    });
    for (const c of existingClasses) {
      if (!subjects.some((s) => s.code === c.code)) {
        subjects.push({ semester: c.semester, code: c.code, name: c.subject, department: c.department });
      }
    }
    res.json(subjects);
  } catch (err) {
    console.error("my-subjects error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// PUT /teacher/my-subjects – Replace teacher's full subject list
// Creates Class records for any new subjects not already in the DB
// --------------------------------------------------
r.put("/teacher/my-subjects", async (req, res) => {
  try {
    const { subjects } = req.body;
    await prisma.user.update({
      where: { id: req.user.id },
      data: { selectedSubject: JSON.stringify(subjects || []) },
    });
    const existingClasses = await prisma.class.findMany({ where: { teacherId: req.user.id } });
    const existingCodes = new Set(existingClasses.map((c) => `${c.semester}-${c.code}`));
    for (const sub of subjects || []) {
      if (!existingCodes.has(`${sub.semester}-${sub.code}`)) {
        await prisma.class.create({
          data: {
            subject: sub.name,
            code: sub.code,
            department: sub.department || "CSE",
            semester: sub.semester,
            year: Math.ceil(sub.semester / 2),
            teacherId: req.user.id,
          },
        });
      }
    }
    res.json({ success: true, subjects: subjects || [] });
  } catch (err) {
    console.error("my-subjects put error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// --------------------------------------------------
// GET /teacher/session-archive – Past ended sessions for a teacher
// Includes attendance count for each session
// --------------------------------------------------
r.get("/teacher/session-archive", async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { teacherId: req.user.id, status: "ENDED" },
    include: { class: { select: { subject: true, code: true } }, attendances: true },
    orderBy: { endTime: "desc" },
  });
  res.json(sessions.map((s) => ({
    id: s.id,
    class: s.class,
    attendanceCount: s.attendances.length,
    startTime: s.startTime,
    endTime: s.endTime,
  })));
});

// --------------------------------------------------
// GET /export/:classId – Export attendance as CSV file
// Generates a downloadable CSV with Name, Email, Attended, Total, Percent
// --------------------------------------------------
r.get("/export/:classId", async (req, res) => {
  const classData = await prisma.class.findUnique({
    where: { id: req.params.classId },
    include: { sessions: { include: { attendances: true } } },
  });
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", department: classData.department, semester: classData.semester },
  });
  
  const csvRows = ["Name,Email,Attended,Total,Percent"];
  const totalSessions = classData.sessions.filter((s) => s.endTime).length;
  
  for (const student of students) {
    const attended = classData.sessions.reduce((acc, session) => {
      return acc + session.attendances.filter((a) => a.studentId === student.id).length;
    }, 0);
    const percent = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
    csvRows.push(`"${student.name}","${student.email}",${attended},${totalSessions},${percent}%`);
  }
  
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename=${classData.subject}_attendance.csv`);
  res.send(csvRows.join("\n"));
});

// --------------------------------------------------
// GET /low-attendance – Hardcoded low-attendance student examples
// --------------------------------------------------
r.get("/low-attendance", async (req, res) =>
  res.json([
    {
      name: "Aarav Patel",
      subject: "Database Systems",
      semester: 5,
      percent: 61,
    },
    { name: "Mia Chen", subject: "Operating Systems", semester: 5, percent: 72 },
  ])
);

// --------------------------------------------------
// GET /leaderboard – Top 10 students by attendance score
// Score = attendance count / (count + 10) * 100 (diminishing returns formula)
// Also calculates current consecutive-day attendance streak
// --------------------------------------------------
r.get("/leaderboard", async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { attendances: { orderBy: { markedAt: "desc" }, include: { session: true } } },
  });

  // Helper: calculate consecutive-day streak from attendance dates
  function calcStreak(attendances) {
    if (!attendances.length) return 0;
    const dates = [...new Set(attendances.map((a) => a.markedAt.toISOString().slice(0, 10)))].sort((a, b) => b.localeCompare(a));
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const diff = (new Date(dates[i - 1]) - new Date(dates[i])) / (1000 * 60 * 60 * 24);
      if (diff === 1) streak++;
      else break;
    }
    return streak;
  }

  const ranked = students
    .map((s) => ({
      name: s.name,
      department: s.department,
      semester: s.semester,
      score: Math.round((s.attendances.length / Math.max(s.attendances.length + 10, 1)) * 100),
      streak: calcStreak(s.attendances),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  res.json(ranked);
});

// --------------------------------------------------
// GET /goals – Student's attendance goals per subject
// Calculates current attendance %, and how many more classes needed to reach 75%
// --------------------------------------------------
r.get("/goals", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.json([]);
  const where = [];
  if (user.department && user.semester) {
    where.push({ department: user.department, semester: user.semester });
  }
  where.push({ sessions: { some: { attendances: { some: { studentId: req.user.id } } } } });
  const classes = await prisma.class.findMany({
    where: { OR: where },
    include: { sessions: { include: { attendances: { where: { studentId: req.user.id } } } } },
  });
  const goals = classes.map((c) => {
    const total = c.sessions.length;
    const attended = c.sessions.reduce((sum, s) => sum + s.attendances.length, 0);
    const percent = total > 0 ? Math.round((attended / total) * 100) : 0;
    const classesNeeded = total > 0 ? Math.max(0, Math.ceil(0.75 * total - attended)) : 0;
    return { subject: c.subject, percent, classesNeeded, total, attended };
  });
  res.json(goals);
});

// --------------------------------------------------
// GET /classes/:id – Get a single class by ID with timetable and sessions
// --------------------------------------------------
r.get("/classes/:id", async (req, res) => {
  const cls = await prisma.class.findUnique({
    where: { id: req.params.id },
    include: { timetable: true, sessions: true },
  });
  if (!cls) return res.status(404).json({ message: "Class not found" });
  res.json(cls);
});

export default r;
