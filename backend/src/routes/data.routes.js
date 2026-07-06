import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";
import bcrypt from "bcryptjs";

const r = Router();
r.use(auth);

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
      photoUrl: true,
    },
  });
  res.json(user);
});

r.put("/me", async (req, res) => {
  const { name, department, semester, year, selectedSubject } = req.body;
  const data = {};
  if (name !== undefined) data.name = name;
  if (department !== undefined) data.department = department;
  if (semester !== undefined) data.semester = Number(semester);
  if (year !== undefined) data.year = Number(year);
  if (selectedSubject !== undefined) data.selectedSubject = selectedSubject;
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, name: true, email: true, role: true, department: true, semester: true, year: true, selectedSubject: true, photoUrl: true },
  });
  res.json(user);
});

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

r.get("/teacher/dashboard", async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    include: { timetable: true, sessions: true },
  });
  res.json({ classes, lowAttendance: [] });
});

r.get("/student/dashboard", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });
  if (!user.department || !user.semester) return res.json({ classes: [] });
  const classes = await prisma.class.findMany({
    where: {
      department: user.department,
      semester: user.semester,
    },
    include: {
      timetable: true,
      sessions: { include: { attendances: true } },
    },
  });
  res.json({ classes });
});

r.get("/classes/today", async (req, res) => {
  const now = new Date();
  const day = now.getDay();

  if (req.user.role === "TEACHER") {
    const classes = await prisma.class.findMany({
      where: {
        teacherId: req.user.id,
        timetable: { some: { dayOfWeek: day } },
      },
      include: { timetable: true },
    });
    res.json(classes);
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

r.get("/teacher/quick-analysis", async (req, res) => {
  const classes = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    include: { sessions: true, timetable: true },
  });
  const assigned = classes.length;
  const taken = classes.reduce((a, c) => a + c.sessions.filter((s) => s.endTime).length, 0);
  const pending = classes.reduce((a, c) => a + c.timetable.length * 15 - c.sessions.length, 0);
  res.json({ assigned, taken, pending: Math.max(pending, 0) });
});

r.get("/teacher/classes", async (req, res) => {
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
});

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

r.get("/announcements", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user.department || !user.semester) return res.json([]);
  const classes = await prisma.class.findMany({
    where: { department: user.department, semester: user.semester },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  const announcements = await prisma.announcement.findMany({
    where: {
      classId: { in: classIds },
      OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });
  res.json(announcements);
});

r.post("/announcements", async (req, res) => {
  const { classId, title, content, expiresInHours } = req.body;
  const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000) : null;
  const announcement = await prisma.announcement.create({
    data: { classId, teacherId: req.user.id, title, content, expiresAt },
  });
  res.json(announcement);
});

r.get("/teacher/session-archive", async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { teacherId: req.user.id, status: "ENDED" },
    include: { class: { select: { subject: true, code: true } } },
    orderBy: { endTime: "desc" },
  });
  res.json(sessions);
});

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

r.get("/leaderboard", async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    include: { attendances: { orderBy: { markedAt: "desc" }, include: { session: true } } },
  });

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

r.get("/goals", async (req, res) =>
  res.json([
    { subject: "Database Systems", percent: 62, classesNeeded: 7 },
    { subject: "Operating Systems", percent: 71, classesNeeded: 3 },
  ])
);

export default r;
