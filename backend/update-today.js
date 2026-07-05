import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const today = new Date().getDay();
prisma.timetable.updateMany({ data: { dayOfWeek: today } }).then(() => {
  console.log(`Updated all timetables to today (day ${today})`);
  prisma.$disconnect();
});
