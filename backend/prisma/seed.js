import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.attendance.deleteMany();
  await prisma.session.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  const pass = await bcrypt.hash("password123", 10);

  const teacher = await prisma.user.create({
    data: {
      name: "Dr. Sofia Martinez",
      email: "teacher@edutrack.dev",
      password: pass,
      role: "TEACHER",
      department: "Computer Science",
      designation: "Assistant Professor",
      photoUrl: "https://i.pravatar.cc/100?img=47",
    },
  });

  await prisma.user.create({
    data: {
      name: "Prasanna Sangam",
      email: "student@edutrack.dev",
      password: pass,
      role: "STUDENT",
      department: "Computer Science",
      semester: 5,
      photoUrl: "https://i.pravatar.cc/100?img=12",
    },
  });

  for (const [subject, code, day, start] of [
    ["Database Systems", "CS501", 5, "09:00"],
    ["Data Science", "DS", 5, "10:00"],
    ["Operating Systems", "CS502", 5, "11:00"],
    ["Data Mining", "CS503", 1, "10:00"],
  ]) {
    const c = await prisma.class.create({
      data: {
        subject,
        code,
        department: "Computer Science",
        semester: 5,
        year: 2026,
        teacherId: teacher.id,
      },
    });
    await prisma.timetable.create({
      data: {
        classId: c.id,
        dayOfWeek: day,
        startTime: start,
        endTime: "12:00",
        room: "B-204",
      },
    });
  }

  console.log("Database seeded successfully");
}

main().finally(() => prisma.$disconnect());
