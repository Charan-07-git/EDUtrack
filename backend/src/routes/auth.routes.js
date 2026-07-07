import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, rollNumber: user.rollNumber, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

r.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, department, semester, rollNumber } = req.body;

    if (role === "STUDENT") {
      if (!rollNumber) {
        return res.status(400).json({ message: "Roll number is required for students" });
      }
      const num = Number(rollNumber);
      if (num < 100523733001 || num > 100523733100) {
        return res.status(400).json({ message: "Roll number must be between 100523733001 and 100523733100" });
      }
      const existing = await prisma.user.findFirst({ where: { rollNumber } });
      if (existing) {
        return res.status(400).json({ message: "Roll number already registered" });
      }
    } else if (!email) {
      return res.status(400).json({ message: "Email is required for teachers" });
    }

    if (role !== "STUDENT") {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    const semNum = semester ? Number(semester) : null;
    const year = semNum ? Math.ceil(semNum / 2) : null;
    const user = await prisma.user.create({
      data: {
        name,
        email: role === "STUDENT" ? rollNumber : email,
        password: hash,
        role,
        department,
        semester: semNum,
        year,
        rollNumber: role === "STUDENT" ? rollNumber : null,
        designation: role === "TEACHER" ? "Assistant Professor" : null,
      },
    });

    res.json({ token: sign(user), user });
  } catch (err) {
    console.error("Signup error:", err?.message || err);
    const msg = err?.message?.includes("Can't reach database server")
      ? "Database is unavailable. Please contact the administrator."
      : "Server error, please try again";
    res.status(500).json({ message: msg });
  }
});

r.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email/Roll number and password are required" });
    }

    let user;
    if (role === "STUDENT") {
      user = await prisma.user.findFirst({ where: { rollNumber: email } });
    } else {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user || user.role !== role || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ token: sign(user), user });
  } catch (err) {
    console.error("Login error:", err?.message || err);
    console.error("Login stack:", err?.stack || "");
    const msg = err?.message?.includes("Can't reach database server")
      ? "Database is unavailable. Please contact the administrator."
      : `Server error: ${err?.message || "Unknown"}`;
    res.status(500).json({ message: msg });
  }
});

r.post("/upload-photo", auth, async (req, res) => {
  const { photoData } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { photoUrl: photoData || null },
  });

  res.json({ user });
});

r.delete("/students", async (req, res) => {
  if (req.query.confirm !== "yes") {
    return res.status(400).json({ message: "Pass ?confirm=yes to confirm" });
  }
  await prisma.attendance.deleteMany({ where: { student: { role: "STUDENT" } } });
  await prisma.goal.deleteMany({});
  await prisma.announcement.deleteMany({ where: { teacher: { role: "TEACHER" } } });
  const deleted = await prisma.user.deleteMany({ where: { role: "STUDENT" } });
  res.json({ message: `Deleted ${deleted.count} student accounts` });
});

export default r;
