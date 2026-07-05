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
  const classes = await prisma.class.findMany({
    where: { teacherId: req.user.id },
    select: { department: true, semester: true },
    distinct: ["department", "semester"],
    orderBy: [{ department: "asc" }, { semester: "asc" }],
  });
  res.json(classes);
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

r.get("/master", async (req, res) => {
  try {
    const data = await import("../../prisma/timetable-data.json", { with: { type: "json" } });
    const sem = req.query.semester;
    if (sem) {
      const semData = data.default.semesters[sem];
      if (!semData) return res.status(404).json({ message: `Semester ${sem} not found` });
      return res.json(semData);
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
