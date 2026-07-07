import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);

r.post("/", async (req, res) => {
  const { classId, title, content, expiresAt, expiresInHours, semesters } = req.body;
  let sem = semesters;
  let cls;
  if (!sem && classId) {
    cls = await prisma.class.findUnique({ where: { id: classId }, select: { semester: true, department: true, subject: true, code: true } });
    if (cls) sem = [cls.semester];
  }
  const exp = expiresAt
    ? new Date(expiresAt)
    : expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;
  const ann = await prisma.announcement.create({
    data: {
      teacherId: req.user.id,
      classId,
      title,
      content,
      semesters: sem || null,
      expiresAt: exp,
    },
    include: { class: { select: { subject: true, code: true } } },
  });
  if (cls && sem && sem.length > 0) {
    try {
      const students = await prisma.user.findMany({
        where: { role: "STUDENT", department: cls.department, semester: { in: sem } },
        select: { id: true },
      });
      if (students.length > 0) {
        const teacherName = req.user.name || "Teacher";
        const notifLink = "/student/announcements";
        await prisma.notification.createMany({
          data: students.map((s) => ({
            userId: s.id,
            type: "announcement",
            title: title,
            message: `${cls.subject} • ${teacherName} • ${content?.substring(0, 100)}${content?.length > 100 ? "..." : ""}`,
            link: notifLink,
            announcementId: ann.id,
          })),
        });
      }
    } catch (notifErr) {
      console.error("Failed to create notifications:", notifErr.message);
    }
  }
  res.json(ann);
});

r.get("/", async (req, res) => {
  try {
    const dbUser = await prisma.user.findUnique({ where: { id: req.user.id }, select: { role: true, department: true, semester: true } });
    if (!dbUser) return res.status(404).json({ message: "User not found" });
    if (dbUser.role === "TEACHER") {
      const announcements = await prisma.announcement.findMany({
        where: { teacherId: req.user.id, expiresAt: { gt: new Date() } },
        include: { class: { select: { subject: true, code: true } } },
        orderBy: { createdAt: "desc" },
      });
      return res.json(announcements);
    }
    const classes = await prisma.class.findMany({
      where: { department: dbUser.department, semester: dbUser.semester },
      select: { id: true, subject: true, code: true },
    });
    const classIds = classes.map((c) => c.id);
    const classMap = Object.fromEntries(classes.map((c) => [c.id, { subject: c.subject, code: c.code }]));
    const announcements = await prisma.announcement.findMany({
      where: {
        classId: { in: classIds },
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    const filtered = announcements.filter((a) => {
      if (!a.semesters) return true;
      return Array.isArray(a.semesters) && a.semesters.includes(dbUser.semester);
    });
    res.json(filtered.map((a) => ({
      ...a,
      class: classMap[a.classId] || null,
    })));
  } catch (err) {
    console.error("GET announcements error:", err?.message || err);
    res.status(500).json({ message: err?.message || "Failed to load announcements" });
  }
});

r.put("/:id", async (req, res) => {
  const { title, content, expiresAt, semesters, classId } = req.body;
  const existing = await prisma.announcement.findFirst({
    where: { id: req.params.id, teacherId: req.user.id },
  });
  if (!existing) return res.status(404).json({ message: "Announcement not found" });
  const ann = await prisma.announcement.update({
    where: { id: req.params.id },
    data: {
      ...(title !== undefined && { title }),
      ...(content !== undefined && { content }),
      ...(classId !== undefined && { classId }),
      ...(semesters !== undefined && { semesters }),
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
    include: { class: { select: { subject: true, code: true } } },
  });
  res.json(ann);
});

r.delete("/:id", async (req, res) => {
  await prisma.announcement.deleteMany({
    where: { id: req.params.id, teacherId: req.user.id },
  });
  res.json({ success: true });
});

export default r;
