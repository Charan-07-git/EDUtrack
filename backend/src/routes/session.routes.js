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
    subject: s.class.subject,
    code: s.class.code,
    attendanceCount: s.attendances.length,
    startTime: s.startTime,
    endTime: s.endTime,
  })));
});

r.get("/:sessionId/students", async (req, res) => {
  const students = await prisma.user.findMany({
    where: { role: "STUDENT" },
    select: { id: true, name: true, department: true, semester: true },
  });
  const attendances = await prisma.attendance.findMany({
    where: { sessionId: req.params.sessionId },
    select: { studentId: true },
  });
  const presentIds = new Set(attendances.map((a) => a.studentId));
  res.json(students.map((s) => ({
    ...s,
    isPresent: presentIds.has(s.id),
  })));
});

r.post("/:classId/start", async (req, res) => {
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
  const { sessionId, token, lat, lng, faceVerified, facePhoto } = req.body;

  const s = await prisma.session.findUnique({ where: { id: sessionId } });
  if (
    !s ||
    s.status !== "QR_ACTIVE" ||
    s.qrToken !== token ||
    !s.qrExpiresAt ||
    s.qrExpiresAt < new Date()
  ) {
    return res.status(400).json({ message: "QR expired or invalid" });
  }

  if (lat && lng) {
    const refLat = s.teacherLat ?? Number(process.env.CAMPUS_LAT);
    const refLng = s.teacherLng ?? Number(process.env.CAMPUS_LNG);
    const d = distanceMeters(
      Number(lat),
      Number(lng),
      refLat,
      refLng
    );
    if (d > 100) {
      return res
        .status(400)
        .json({ message: "You are outside the 100m attendance radius" });
    }
  }

  if (!faceVerified) {
    return res.status(400).json({ message: "Face verification failed" });
  }

  const a = await prisma.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId: req.user.id } },
    update: {
      facePhotoUrl: facePhoto || undefined,
      faceVerified: true,
      locationVerified: true,
    },
    create: {
      sessionId,
      studentId: req.user.id,
      faceVerified: true,
      locationVerified: true,
      facePhotoUrl: facePhoto || null,
    },
  });

  req.app.get("io").to(sessionId).emit("attendance:count");
  res.json(a);
});

export default r;
