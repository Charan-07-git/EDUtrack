import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const r = Router();
r.use(auth);

r.post("/clear-semester", requireRole("TEACHER"), async (req, res) => {
  const { semester, department, confirm } = req.body;

  if (confirm !== "CLEAR_ALL") {
    return res.status(400).json({ message: "Must send confirm='CLEAR_ALL' to proceed" });
  }

  const where = {};
  if (semester) where.semester = Number(semester);
  if (department) where.department = department;

  const classes = await prisma.class.findMany({
    where: { ...where, teacherId: req.user.id },
    select: { id: true },
  });
  const classIds = classes.map((c) => c.id);
  if (!classIds.length) {
    return res.status(400).json({ message: "No classes found for given filters" });
  }

  const sessions = await prisma.session.findMany({
    where: { classId: { in: classIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);
  if (!sessionIds.length) {
    return res.json({ message: "No sessions found", deleted: 0 });
  }

  const deleted = await prisma.attendance.deleteMany({
    where: { sessionId: { in: sessionIds } },
  });

  await prisma.session.deleteMany({
    where: { classId: { in: classIds } },
  });

  res.json({
    message: `Cleared ${deleted.count} attendance records and ${sessions.length} sessions`,
    deleted: deleted.count,
    sessionsDeleted: sessions.length,
  });
});

export default r;
