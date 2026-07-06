import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);

r.get("/by-department", async (req, res) => {
  const { department, semester } = req.query;
  const where = { teacherId: req.user.id };
  if (department) where.department = department;
  if (semester) where.semester = Number(semester);
  const classes = await prisma.class.findMany({
    where,
    include: { timetable: true },
    orderBy: { subject: "asc" },
  });
  res.json(classes);
});

r.get("/departments", async (req, res) => {
  const dbClasses = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    select: { department: true, semester: true },
    distinct: ["department", "semester"],
    orderBy: [{ department: "asc" }, { semester: "asc" }],
  });
  if (dbClasses.length > 0) return res.json(dbClasses);
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const semesters = Object.keys(data.default.semesters).map(Number).sort((a, b) => a - b);
    const result = semesters.map((s) => ({ department: data.default.department || "Computer Science", semester: s }));
    res.json(result);
  } catch {
    res.json([]);
  }
});

r.post("/bulk", async (req, res) => {
  const { classId, entries } = req.body;
  const classData = await prisma.class.findUnique({ where: { id: classId } });
  if (!classData || classData.teacherId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  await prisma.timetable.deleteMany({ where: { classId } });
  if (entries.length) {
    await prisma.timetable.createMany({
      data: entries.map((e) => ({
        classId,
        dayOfWeek: Number(e.dayOfWeek),
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room || "",
      })),
    });
  }
  const updated = await prisma.timetable.findMany({ where: { classId } });
  res.json(updated);
});

r.get("/semesters", async (_req, res) => {
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const semesters = data.default.semesters;
    const result = Object.entries(semesters).map(([num, info]) => ({
      semester: Number(num),
      year: info.year,
      class: info.class,
      subjects: info.subjects,
      faculty: info.faculty,
    }));
    res.json(result);
  } catch {
    res.status(404).json({ message: "Timetable data not loaded" });
  }
});

r.get("/by-faculty", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).json({ message: "Faculty code required" });
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const semesters = data.default.semesters;
    const subjects = [];
    const seen = new Set();
    for (const [semStr, semData] of Object.entries(semesters)) {
      const sem = Number(semStr);
      for (const [day, slots] of Object.entries(semData.timetable)) {
        for (const slot of slots) {
          if (slot.faculty === code || slot.facultyCode === code || (slot.labs && slot.labs.some((l) => l.faculty === code))) {
            const subjCode = slot.code || (slot.labs && slot.labs.find((l) => l.faculty === code)?.code);
            if (subjCode && !seen.has(`${sem}-${subjCode}`)) {
              seen.add(`${sem}-${subjCode}`);
              const name = semData.subjects[subjCode] || subjCode;
              subjects.push({ semester: sem, code: subjCode, name, department: data.default.department || "Computer Science" });
            }
          }
        }
      }
    }
    res.json(subjects);
  } catch (err) {
    console.error("by-faculty error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

r.get("/faculty-codes", async (_req, res) => {
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const semesters = data.default.semesters;
    const codes = {};
    for (const semData of Object.values(semesters)) {
      for (const slots of Object.values(semData.timetable)) {
        for (const slot of slots) {
          if (slot.facultyCode && !codes[slot.facultyCode]) {
            codes[slot.facultyCode] = slot.faculty;
          }
        }
      }
    }
    const result = Object.entries(codes).map(([code, name]) => ({ code, name }));
    res.json(result);
  } catch {
    res.status(404).json({ message: "Timetable data not loaded" });
  }
});

r.get("/available-subjects", async (req, res) => {
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const semesters = data.default.semesters;
    const result = [];
    for (const [num, info] of Object.entries(semesters)) {
      const sem = Number(num);
      const subjects = info.subjects || {};
      for (const [code, name] of Object.entries(subjects)) {
        result.push({ semester: sem, code, name, department: data.default.department || "Computer Science" });
      }
    }
    const semFilter = req.query.semester;
    if (semFilter) return res.json(result.filter((s) => s.semester === Number(semFilter)));
    res.json(result);
  } catch {
    res.status(404).json({ message: "Timetable data not loaded" });
  }
});

r.get("/master", async (req, res) => {
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const sem = req.query.semester;
    if (sem) {
      const semData = data.default.semesters[sem];
      if (!semData) return res.status(404).json({ message: `Semester ${sem} not found` });
      return res.json({
        ...semData,
        department: data.default.department,
        academicYear: data.default.academicYear,
        room: data.default.room,
      });
    }
    res.json(data.default);
  } catch {
    res.status(404).json({ message: "Master timetable not loaded" });
  }
});

r.delete("/:id", async (req, res) => {
  const entry = await prisma.timetable.findUnique({
    where: { id: req.params.id },
    include: { class: { select: { teacherId: true } } },
  });
  if (!entry || entry.class.teacherId !== req.user.id) {
    return res.status(403).json({ message: "Forbidden" });
  }
  await prisma.timetable.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default r;
