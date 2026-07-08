// ============================================================
// EDUTrack API – Express server entry point
// Sets up middleware, routes, Socket.IO, and error handling.
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// Global error handlers for unhandled promise rejections and exceptions
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err?.message || err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
});

import "express-async-errors"; // Wraps async route handlers to catch errors automatically

// Create Express app, HTTP server, and Socket.IO instance
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL },
});
app.set("io", io); // Make io accessible to route handlers via req.app.get("io")

// Configure CORS to allow requests from the frontend and deployed versions
const allowedOrigins = [process.env.FRONTEND_URL, "https://edutrack-ten-inky.vercel.app", "https://edutrack.vercel.app"].filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" })); // Parse JSON bodies up to 20MB (for photo uploads)

// --------------------------------------------------
// GET /health – Basic health check
// GET /health/db – Database connectivity check (pings DB, returns user count)
// --------------------------------------------------
app.get("/health", (_, res) =>
  res.json({ ok: true, name: "EDUTrack API" })
);
app.get("/health/db", async (_, res) => {
  try {
    const { prisma } = await import("./db.js");
    await prisma.$connect();
    const userCount = await prisma.user.count();
    await prisma.$disconnect();
    res.json({ ok: true, db: "connected", users: userCount });
  } catch (e) {
    const dbUrl = (process.env.DATABASE_URL || "").trim();
    let host = "(not set)";
    try { host = dbUrl ? new URL(dbUrl).host : "(not set)"; } catch (_) { host = "(invalid URL)"; }
    res.json({ ok: false, db: "error", host, error: e?.message || String(e) });
  }
});

// Warn if DATABASE_URL is missing or invalid
const dbUrl = (process.env.DATABASE_URL || "").trim();
if (!dbUrl) {
  console.error("WARN: DATABASE_URL environment variable is not set - DB features will fail");
} else {
  let dbHost = "(unknown)";
  try { dbHost = new URL(dbUrl).host; } catch (e) {
    console.error("WARN: DATABASE_URL is invalid -", e.message);
  }
  console.log(`DATABASE_URL: set (connecting to ${dbHost})`);
}

// --------------------------------------------------
// init – Async startup: connects to DB, registers all route modules
// --------------------------------------------------
async function init() {
  try {
    const { prisma } = await import("./db.js");
    try {
      await prisma.$connect();
      console.log("Database: connected successfully");
    } catch (dbErr) {
      console.error("Database: connection failed -", dbErr?.message || dbErr);
      console.error("Database: the Supabase project may be paused. Resume it at https://supabase.com/dashboard");
    }

    // Dynamically import all route files
    const authRoutes = (await import("./routes/auth.routes.js")).default;
    const dataRoutes = (await import("./routes/data.routes.js")).default;
    const sessionRoutes = (await import("./routes/session.routes.js")).default;
    const attendanceRoutes = (await import("./routes/attendance.routes.js")).default;
    const timetableRoutes = (await import("./routes/timetable.routes.js")).default;
    const announcementRoutes = (await import("./routes/announcement.routes.js")).default;
    const notificationRoutes = (await import("./routes/notification.routes.js")).default;

    // Mount routes under their respective base paths
    app.use("/api/auth", authRoutes);
    app.use("/api", dataRoutes);
    app.use("/api/sessions", sessionRoutes);
    app.use("/api/attendance", attendanceRoutes);
    app.use("/api/timetable", timetableRoutes);
    app.use("/api/announcements", announcementRoutes);
    app.use("/api/notifications", notificationRoutes);

    // Socket.IO event handlers for real-time attendance updates
    io.on("connection", (socket) => {
      socket.on("join:session", (id) => socket.join(id)); // Join a session room
      socket.on("attendance:mark", (sessionId) => {
        io.to(sessionId).emit("attendance:count"); // Notify room on attendance change
      });
    });

    console.log(`Routes: ${7} registered`);
  } catch (e) {
    console.error("Route init error:", e?.message || e);
    console.error(e?.stack || "");
  }
}

init();

// --------------------------------------------------
// Global error handler – catches unhandled errors from all routes
// --------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error("Request Error:", err?.message || err);
  console.error(err?.stack || "");
  const msg = err?.message?.includes("Can't reach database server")
    ? "Database is unavailable. The Supabase project may be paused."
    : "Internal server error";
  res.status(500).json({ message: msg });
});

// Start the HTTP server
server.listen(process.env.PORT || 4000, () =>
  console.log(`EDUTrack API running on port ${process.env.PORT || 4000}`)
);
