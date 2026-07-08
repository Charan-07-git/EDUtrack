// ============================================================
// Attendance Routes – utility endpoints for clearing attendance
// data on a per-semester/department basis.
// All routes require JWT authentication.
// ============================================================

import { Router } from "express";
import { prisma } from "../db.js";
import { auth, requireRole } from "../middleware/auth.js";

const r = Router();
r.use(auth);

// --------------------------------------------------
// POST /clear-semester – Delete all attendance records & sessions
// for a given semester/department (Teacher only).
// Requires confirm="CLEAR_ALL" to prevent accidental deletion.
// Finds all classes matching the filters, then cascades:
// deletes attendance records first, then the sessions.
// --------------------------------------------------
r.post("/clear-semester", requireRole("TEACHER"), async (req, res) => {
  const { semester, department, confirm } = req.body;

  // Safety confirmation string required
  if (confirm !== "CLEAR_ALL") {
    return res.status(400).json({ message: "Must send confirm='CLEAR_ALL' to proceed" });
  }

  // Build filter for teacher's classes
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

  // Find all sessions under these classes
  const sessions = await prisma.session.findMany({
    where: { classId: { in: classIds } },
    select: { id: true },
  });
  const sessionIds = sessions.map((s) => s.id);
  if (!sessionIds.length) {
    return res.json({ message: "No sessions found", deleted: 0 });
  }

  // Delete attendance records first (child records), then sessions
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
