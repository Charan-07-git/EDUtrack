import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);

r.post("/", async (req, res) => {
  const { classId, title, content, expiresAt } = req.body;
  const ann = await prisma.announcement.create({
    data: {
      teacherId: req.user.id,
      classId,
      title,
      content,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });
  res.json(ann);
});

r.get("/", async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: { department: true, semester: true } });
  if (!user.department || !user.semester) {
    const announcements = await prisma.announcement.findMany({
      where: { teacherId: req.user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    return res.json(announcements);
  }
  const classes = await prisma.class.findMany({
    where: { department: user.department, semester: user.semester },
    select: { id: true, subject: true, code: true },
  });
  const classIds = classes.map((c) => c.id);
  const classMap = Object.fromEntries(classes.map((c) => [c.id, { subject: c.subject, code: c.code }]));
  const announcements = await prisma.announcement.findMany({
    where: {
      OR: [
        { teacherId: req.user.id },
        { classId: { in: classIds } },
      ],
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(announcements.map((a) => ({ ...a, class: classMap[a.classId] || null })));
});

r.delete("/:id", async (req, res) => {
  await prisma.announcement.deleteMany({
    where: { id: req.params.id, teacherId: req.user.id },
  });
  res.json({ success: true });
});

export default r;
