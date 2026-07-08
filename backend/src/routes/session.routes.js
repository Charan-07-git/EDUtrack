// ============================================================
// Session Routes – session lifecycle: start, end, QR generation,
// bulk attendance, and individual student mark-in.
// All routes require JWT authentication.
// ============================================================

import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";
import { makeQr } from "../services/qr.js";
import { distanceMeters } from "../services/geo.js";

const r = Router();
r.use(auth);

// --------------------------------------------------
// GET /:sessionId – Get a single session's details
// Includes subject name, code, status, timetable, QR token + expiry
// --------------------------------------------------
r.get("/:sessionId", async (req, res) => {
  const s = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: { class: { include: { timetable: true } } },
  });
  if (!s) return res.status(404).json({ message: "Session not found" });
  res.json({
    id: s.id,
    subject: s.class.subject,
    code: s.class.code,
    status: s.status,
    timetable: s.class.timetable,
    qrToken: s.qrToken,
    qrExpiresAt: s.qrExpiresAt,
  });
});

// --------------------------------------------------
// GET /archive – Teacher's ended sessions (historical archive)
// Returns each session with subject, attendance count, start/end times
// --------------------------------------------------
r.get("/archive", async (req, res) => {
  const sessions = await prisma.session.findMany({
    where: { teacherId: req.user.id, status: "ENDED" },
    include: { class: true, attendances: true },
    orderBy: { startTime: "desc" },
  });
  res.json(sessions.map((s) => ({
    id: s.id,
    classId: s.classId,
    subject: s.class.subject,
    code: s.class.code,
    attendanceCount: s.attendances.length,
    startTime: s.startTime,
    endTime: s.endTime,
  })));
});

// --------------------------------------------------
// GET /:sessionId/students – Get student list with attendance status
// Shows all eligible students (by dept/semester or already marked)
// and marks each as present/absent with timestamp + photo
// --------------------------------------------------
r.get("/:sessionId/students", async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: { class: { select: { department: true, semester: true } } },
  });
  if (!session) return res.status(404).json({ message: "Session not found" });
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      OR: [
        { department: session.class.department, semester: session.class.semester },
        { attendances: { some: { sessionId: req.params.sessionId } } },
      ],
    },
    select: { id: true, name: true, rollNumber: true, department: true, semester: true },
    orderBy: { name: "asc" },
  });
  const attendances = await prisma.attendance.findMany({
    where: { sessionId: req.params.sessionId },
    select: { studentId: true, markedAt: true, photo: true, studentName: true, rollNumber: true },
  });
  const attMap = new Map(attendances.map((a) => [a.studentId, a]));
  res.json(students.map((s) => ({
    id: s.id,
    name: s.name,
    rollNumber: s.rollNumber,
    department: s.department,
    semester: s.semester,
    isPresent: attMap.has(s.id),
    markedAt: attMap.get(s.id)?.markedAt || null,
    photo: attMap.get(s.id)?.photo || null,
  })));
});

// --------------------------------------------------
// POST /:classId/start – Start a new session for a class
// Validates that the teacher owns the class
// Emits a real-time "session:update" event via Socket.IO
// --------------------------------------------------
r.post("/:classId/start", async (req, res) => {
  const cls = await prisma.class.findUnique({ where: { id: req.params.classId } });
  if (!cls || cls.teacherId !== req.user.id) {
    return res.status(403).json({ message: "You can only start sessions for your own classes" });
  }
  const s = await prisma.session.create({
    data: {
      classId: req.params.classId,
      teacherId: req.user.id,
      status: "ACTIVE",
      startTime: new Date(),
    },
  });
  req.app.get("io").emit("session:update", s);
  res.json(s);
});

// --------------------------------------------------
// POST /:sessionId/end – End an active session
// Sets status to ENDED and records endTime
// --------------------------------------------------
r.post("/:sessionId/end", async (req, res) => {
  const s = await prisma.session.update({
    where: { id: req.params.sessionId },
    data: { status: "ENDED", endTime: new Date() },
  });
  req.app.get("io").emit("session:update", s);
  res.json(s);
});

// --------------------------------------------------
// POST /:sessionId/qr – Generate a QR code for attendance
// Body: { teacherLat, teacherLng } (optional, for geo-location)
// Creates a time-limited QR token (5 min) and stores teacher's location
// --------------------------------------------------
r.post("/:sessionId/qr", async (req, res) => {
  const { teacherLat, teacherLng } = req.body;
  const qr = await makeQr(req.params.sessionId);
  const s = await prisma.session.update({
    where: { id: req.params.sessionId },
    data: {
      status: "QR_ACTIVE",
      qrToken: qr.token,
      qrExpiresAt: qr.expiresAt,
      teacherLat: teacherLat ? Number(teacherLat) : undefined,
      teacherLng: teacherLng ? Number(teacherLng) : undefined,
    },
  });
  res.json({ ...s, qrDataUrl: qr.dataUrl });
});

// --------------------------------------------------
// POST /:sessionId/bulk-attendance – Mark multiple students at once
// Body: { studentIds: string[] }
// Creates new attendance records for selected students,
// removes records for unselected students (deselection)
// --------------------------------------------------
r.post("/:sessionId/bulk-attendance", async (req, res) => {
  const { studentIds } = req.body;
  const existing = await prisma.attendance.findMany({
    where: { sessionId: req.params.sessionId },
    select: { studentId: true },
  });
  const existingIds = new Set(existing.map((a) => a.studentId));
  const toCreate = studentIds.filter((id) => !existingIds.has(id));
  
  if (toCreate.length) {
    await prisma.attendance.createMany({
      data: toCreate.map((id) => ({
        sessionId: req.params.sessionId,
        studentId: id,
        faceVerified: true,
        locationVerified: true,
      })),
      skipDuplicates: true,
    });
  }
  const toRemove = studentIds.length ? await prisma.attendance.deleteMany({
    where: { sessionId: req.params.sessionId, studentId: { notIn: studentIds } },
  }) : { count: 0 };
  
  const count = await prisma.attendance.count({ where: { sessionId: req.params.sessionId } });
  res.json({ count, created: toCreate.length, removed: toRemove.count });
});

// --------------------------------------------------
// GET /:sessionId/count – Get number of students marked present
// --------------------------------------------------
r.get("/:sessionId/count", async (req, res) => {
  const count = await prisma.attendance.count({
    where: { sessionId: req.params.sessionId },
  });
  res.json({ count });
});

// --------------------------------------------------
// POST /mark – Student marks their own attendance via QR scan
// Body: { sessionId, token, lat, lng, photo }
// Validates: QR exists, status is QR_ACTIVE, token matches, not expired
// Geo-location: verifies student is within 3000m of teacher/campus
// Uses upsert so re-scanning updates the existing record
// Emits real-time "attendance:count" event to session room
// --------------------------------------------------
r.post("/mark", async (req, res) => {
  const { sessionId, token, lat, lng, photo } = req.body;

  // Fetch session and validate QR token + expiry
  const s = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { class: { select: { id: true, subject: true, code: true } } },
  });
  if (
    !s ||
    s.status !== "QR_ACTIVE" ||
    s.qrToken !== token ||
    !s.qrExpiresAt ||
    s.qrExpiresAt < new Date()
  ) {
    return res.status(400).json({ message: "QR expired or invalid" });
  }

  // Verify student's location is within 3km of teacher's location or campus center
  let locationVerified = false;
  if (lat && lng) {
    const refLat = s.teacherLat ?? Number(process.env.CAMPUS_LAT);
    const refLng = s.teacherLng ?? Number(process.env.CAMPUS_LNG);
    const d = distanceMeters(Number(lat), Number(lng), refLat, refLng);
    locationVerified = d <= 3000;
  }

  const student = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { name: true, rollNumber: true },
  });

  // Create or update attendance record (upsert prevents duplicates)
  const a = await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
    update: {
      photo: photo || undefined,
      faceVerified: true,
      locationVerified,
      studentName: student?.name || undefined,
      rollNumber: student?.rollNumber || undefined,
      subjectId: s.classId || undefined,
      teacherId: s.teacherId || undefined,
    },
    create: {
      sessionId,
      studentId: req.user.id,
      faceVerified: true,
      locationVerified,
      photo: photo || null,
      studentName: student?.name || null,
      rollNumber: student?.rollNumber || null,
      subjectId: s.classId || null,
      teacherId: s.teacherId || null,
    },
  });

  // Emit updated count to all clients viewing this session
  const count = await prisma.attendance.count({ where: { sessionId } });
  req.app.get("io").to(sessionId).emit("attendance:count", { sessionId, count, attendanceId: a.id });
  res.json(a);
});

export default r;
