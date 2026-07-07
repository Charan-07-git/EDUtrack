import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err?.message || err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err?.message || err);
});

import "express-async-errors";

import authRoutes from "./routes/auth.routes.js";
import dataRoutes from "./routes/data.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import attendanceRoutes from "./routes/attendance.routes.js";
import timetableRoutes from "./routes/timetable.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL },
});
app.set("io", io);

const allowedOrigins = [process.env.FRONTEND_URL, "https://edutrack-ten-inky.vercel.app", "https://edutrack.vercel.app"].filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => cb(null, allowedOrigins.includes(origin) || !origin),
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));

app.get("/health", (_, res) =>
  res.json({ ok: true, name: "EDUTrack API" })
);

app.use("/api/auth", authRoutes);
app.use("/api", dataRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/timetable", timetableRoutes);
app.use("/api/announcements", announcementRoutes);

io.on("connection", (socket) => {
  socket.on("join:session", (id) => socket.join(id));
  socket.on("attendance:mark", (sessionId) => {
    io.to(sessionId).emit("attendance:count");
  });
});

app.use((err, _req, res, _next) => {
  console.error("Request Error:", err?.message || err);
  res.status(500).json({ message: "Internal server error" });
});

server.listen(process.env.PORT || 4000, () =>
  console.log(`EDUTrack API running on port ${process.env.PORT || 4000}`)
);
