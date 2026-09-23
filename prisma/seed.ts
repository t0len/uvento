import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@uvento.kz" },
    update: {},
    create: {
      email: "admin@uvento.kz",
      name: "Admin",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });

  const organizerPassword = await bcrypt.hash("organizer123", 10);

  const organizer = await prisma.user.upsert({
    where: { email: "organizer@uvento.kz" },
    update: {},
    create: {
      email: "organizer@uvento.kz",
      name: "Организатор",
      passwordHash: organizerPassword,
      role: "ORGANIZER",
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "kbtu-student-council" },
    update: {},
    create: {
      name: "KBTU Student Council",
      slug: "kbtu-student-council",
      description: "Студенческий совет КБТУ",
      contactEmail: "council@kbtu.kz",
      members: {
        create: {
          userId: organizer.id,
          role: "owner",
        },
      },
    },
  });

  const studentPassword = await bcrypt.hash("student123", 10);

  await prisma.user.upsert({
    where: { email: "student@uvento.kz" },
    update: {},
    create: {
      email: "student@uvento.kz",
      name: "Студент",
      passwordHash: studentPassword,
      role: "STUDENT",
    },
  });

  await prisma.category.upsert({
    where: { slug: "concert" },
    update: {},
    create: { name: "Концерт", slug: "concert" },
  });

  await prisma.category.upsert({
    where: { slug: "workshop" },
    update: {},
    create: { name: "Воркшоп", slug: "workshop" },
  });

  await prisma.category.upsert({
    where: { slug: "sport" },
    update: {},
    create: { name: "Спорт", slug: "sport" },
  });

  await prisma.category.upsert({
    where: { slug: "party" },
    update: {},
    create: { name: "Вечеринка", slug: "party" },
  });

  await prisma.category.upsert({
    where: { slug: "lecture" },
    update: {},
    create: { name: "Лекция", slug: "lecture" },
  });

  console.log("Seed data created:");
  console.log(`  Admin: admin@uvento.kz / admin123`);
  console.log(`  Organizer: organizer@uvento.kz / organizer123`);
  console.log(`  Student: student@uvento.kz / student123`);
  console.log(`  Organization: ${org.name}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
