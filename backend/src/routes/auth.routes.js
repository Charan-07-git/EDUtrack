import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";
import { auth } from "../middleware/auth.js";

const r = Router();

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

r.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role, department, semester } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hash,
        role,
        department,
        semester: semester ? Number(semester) : null,
        designation: role === "TEACHER" ? "Assistant Professor" : null,
      },
    });

    res.json({ token: sign(user), user });
  } catch (err) {
    console.error("Signup error:", err?.message || err);
    res.status(500).json({ message: "Server error, please try again" });
  }
});

r.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || user.role !== role || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ token: sign(user), user });
  } catch (err) {
    console.error("Login error:", err?.message || err);
    res.status(500).json({ message: "Server error, please try again" });
  }
});

r.post("/upload-photo", auth, async (req, res) => {
  const { photoData, mimeType } = req.body;

  if (!photoData) {
    return res.status(400).json({ message: "No photo data provided" });
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: { photoUrl: photoData },
  });

  res.json({ user });
});

export default r;
