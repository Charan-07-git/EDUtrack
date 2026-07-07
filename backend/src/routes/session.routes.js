import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";
import { makeQr } from "../services/qr.js";
import { distanceMeters } from "../services/geo.js";

const r = Router();
r.use(auth);

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

r.get("/:sessionId/students", async (req, res) => {
  const session = await prisma.session.findUnique({
    where: { id: req.params.sessionId },
    include: { class: { select: { department: true, semester: true } } },
  });
  if (!session) return res.status(404).json({ message: "Session not found" });
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      department: session.class.department,
      semester: session.class.semester,
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

r.post("/:sessionId/end", async (req, res) => {
  const s = await prisma.session.update({
    where: { id: req.params.sessionId },
    data: { status: "ENDED", endTime: new Date() },
  });
  req.app.get("io").emit("session:update", s);
  res.json(s);
});

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

r.get("/:sessionId/count", async (req, res) => {
  const count = await prisma.attendance.count({
    where: { sessionId: req.params.sessionId },
  });
  res.json({ count });
});

r.post("/mark", async (req, res) => {
  const { sessionId, token, lat, lng, photo } = req.body;

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

  const count = await prisma.attendance.count({ where: { sessionId } });
  req.app.get("io").to(sessionId).emit("attendance:count", { sessionId, count, attendanceId: a.id });
  res.json(a);
});

export default r;
