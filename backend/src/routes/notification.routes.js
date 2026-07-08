// ============================================================
// Notification Routes – paginated notification listing, unread
// count, and mark-as-read operations.
// All routes require JWT authentication.
// ============================================================

import { Router } from "express";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();
r.use(auth);

// --------------------------------------------------
// GET / – Get paginated notifications for the logged-in user
// Query params: page (default 1), limit (default 20, max 50)
// Returns notifications, total count, page, and limit
// --------------------------------------------------
r.get("/", async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: (page - 1) * limit,
  });
  const total = await prisma.notification.count({
    where: { userId: req.user.id },
  });
  res.json({ notifications, total, page, limit });
});

// --------------------------------------------------
// GET /unread-count – Get count of unread notifications
// --------------------------------------------------
r.get("/unread-count", async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false },
  });
  res.json({ count });
});

// --------------------------------------------------
// PUT /:id/read – Mark a single notification as read
// --------------------------------------------------
r.put("/:id/read", async (req, res) => {
  await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user.id },
    data: { isRead: true },
  });
  res.json({ success: true });
});

// --------------------------------------------------
// PUT /read-all – Mark all unread notifications as read
// --------------------------------------------------
r.put("/read-all", async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data: { isRead: true },
  });
  res.json({ success: true });
});

export default r;
