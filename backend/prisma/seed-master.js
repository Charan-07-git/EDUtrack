import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();
const data = JSON.parse(readFileSync(join(__dirname, "timetable-data.json"), "utf-8"));
const DAY_MAP = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };

async function main() {
  for (const [semStr, semData] of Object.entries(data.semesters)) {
    const sem = Number(semStr);
    const year = semData.year;
    const department = "Computer Science";

    const existing = await prisma.class.findFirst({ where: { department, semester: sem } });
    if (existing) { console.log(`Sem ${sem}: already seeded`); continue; }

    const hash = bcrypt.hashSync("timetable123", 10);
    const teacher = await prisma.user.upsert({
      where: { email: `timetable-sem${sem}@edutrack.dev` },
      update: {},
      create: { name: `Admin Sem ${sem}`, email: `timetable-sem${sem}@edutrack.dev`, password: hash, role: "TEACHER", department, designation: "Professor" },
    });

    let count = 0;
    for (const [code, name] of Object.entries(semData.subjects)) {
      const c = await prisma.class.create({ data: { subject: name, code, department, semester: sem, year, teacherId: teacher.id } });
      count++;
      for (const [day, slots] of Object.entries(semData.timetable)) {
        const dayNum = DAY_MAP[day];
        if (!dayNum) continue;
        for (const slot of slots) {
          if (slot.labs) {
            for (const lab of slot.labs) {
              if (lab.code === code) await prisma.timetable.create({ data: { classId: c.id, dayOfWeek: dayNum, startTime: slot.start, endTime: slot.end, room: lab.room || "" } });
            }
          } else if (slot.code === code) {
            await prisma.timetable.create({ data: { classId: c.id, dayOfWeek: dayNum, startTime: slot.start, endTime: slot.end, room: slot.room || "" } });
          }
        }
      }
    }
    console.log(`Sem ${sem}: ${count} classes`);
  }
  console.log("Done");
}

main().catch(console.error).finally(() => prisma.$disconnect());
