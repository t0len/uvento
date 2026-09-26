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

  const student = await prisma.user.upsert({
    where: { email: "student@uvento.kz" },
    update: {},
    create: {
      email: "student@uvento.kz",
      name: "Студент",
      passwordHash: studentPassword,
      role: "STUDENT",
    },
  });

  const concert = await prisma.category.upsert({
    where: { slug: "concert" },
    update: {},
    create: { name: "Концерт", slug: "concert" },
  });

  const workshop = await prisma.category.upsert({
    where: { slug: "workshop" },
    update: {},
    create: { name: "Воркшоп", slug: "workshop" },
  });

  const sport = await prisma.category.upsert({
    where: { slug: "sport" },
    update: {},
    create: { name: "Спорт", slug: "sport" },
  });

  const party = await prisma.category.upsert({
    where: { slug: "party" },
    update: {},
    create: { name: "Вечеринка", slug: "party" },
  });

  const lecture = await prisma.category.upsert({
    where: { slug: "lecture" },
    update: {},
    create: { name: "Лекция", slug: "lecture" },
  });

  const conference = await prisma.category.upsert({
    where: { slug: "conference" },
    update: {},
    create: { name: "Конференция", slug: "conference" },
  });

  // Sample events
  const event1 = await prisma.event.upsert({
    where: { slug: "intro-party-tokyo-drift" },
    update: {},
    create: {
      title: "Intro Party. Tokyo Drift",
      slug: "intro-party-tokyo-drift",
      description:
        "Welcome party for new students! Join us for an unforgettable evening with music, food, and new friendships. Dress code: Japanese style. DJ sets, photo zones, and surprise performances await you.",
      shortDescription: "Welcome party for new students with music and entertainment",
      location: "KBTU",
      venue: "Main Hall",
      startDate: new Date("2026-10-15T18:00:00"),
      endDate: new Date("2026-10-15T23:00:00"),
      capacity: 200,
      price: 3000,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: party.id }] },
    },
  });

  const event2 = await prisma.event.upsert({
    where: { slug: "student-startup-forum" },
    update: {},
    create: {
      title: "Student Startup Forum",
      slug: "student-startup-forum",
      description:
        "Annual forum for student entrepreneurs. Pitch your ideas, meet investors, and learn from successful founders. Keynote speakers from leading tech companies. Networking session included.",
      shortDescription: "Pitch ideas, meet investors, learn from founders",
      location: "KBTU",
      venue: "Conference Room B",
      startDate: new Date("2026-10-20T10:00:00"),
      endDate: new Date("2026-10-20T17:00:00"),
      capacity: 150,
      price: 0,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: conference.id }] },
    },
  });

  const event3 = await prisma.event.upsert({
    where: { slug: "tech-innovation-day" },
    update: {},
    create: {
      title: "Tech Innovation Day",
      slug: "tech-innovation-day",
      description:
        "Hands-on workshop exploring the latest in AI, blockchain, and IoT. Build a real project in 6 hours with mentors from top companies. Laptops required. Lunch and snacks provided.",
      shortDescription: "Hands-on workshop: AI, blockchain, IoT",
      location: "KBTU",
      venue: "Lab 401",
      startDate: new Date("2026-10-25T09:00:00"),
      endDate: new Date("2026-10-25T16:00:00"),
      capacity: 50,
      price: 1500,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: workshop.id }] },
    },
  });

  await prisma.event.upsert({
    where: { slug: "basketball-tournament" },
    update: {},
    create: {
      title: "Inter-University Basketball Tournament",
      slug: "basketball-tournament",
      description:
        "3-day basketball tournament between Almaty universities. Come support your team or sign up as a player! Free entry for spectators.",
      shortDescription: "3-day inter-university basketball championship",
      location: "KBTU",
      venue: "Sports Complex",
      startDate: new Date("2026-11-01T14:00:00"),
      endDate: new Date("2026-11-03T20:00:00"),
      capacity: 300,
      price: 0,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: sport.id }] },
    },
  });

  await prisma.event.upsert({
    where: { slug: "ai-guest-lecture" },
    update: {},
    create: {
      title: "Guest Lecture: Future of AI",
      slug: "ai-guest-lecture",
      description:
        "Special guest lecture by a leading AI researcher. Topics include large language models, autonomous systems, and ethical AI. Q&A session at the end.",
      shortDescription: "AI researcher talks LLMs, autonomous systems, ethics",
      location: "KBTU",
      venue: "Auditorium 1",
      startDate: new Date("2026-11-10T15:00:00"),
      endDate: new Date("2026-11-10T17:00:00"),
      capacity: 100,
      price: 0,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: lecture.id }] },
    },
  });

  await prisma.event.upsert({
    where: { slug: "acoustic-night" },
    update: {},
    create: {
      title: "Acoustic Night",
      slug: "acoustic-night",
      description:
        "Cozy evening of live acoustic music by student musicians. Bring your guitar and perform, or just enjoy the vibes with tea and snacks.",
      shortDescription: "Live acoustic music by student musicians",
      location: "KBTU",
      venue: "Student Lounge",
      startDate: new Date("2026-11-15T19:00:00"),
      endDate: new Date("2026-11-15T22:00:00"),
      capacity: 60,
      price: 500,
      status: "PUBLISHED",
      organizationId: org.id,
      categories: { create: [{ categoryId: concert.id }] },
    },
  });

  // Sample registration for student
  const existingReg = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: student.id, eventId: event2.id } },
  });
  if (!existingReg) {
    await prisma.registration.create({
      data: {
        userId: student.id,
        eventId: event2.id,
        status: "CONFIRMED",
      },
    });
  }

  const existingReg2 = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: student.id, eventId: event1.id } },
  });
  if (!existingReg2) {
    const reg = await prisma.registration.create({
      data: {
        userId: student.id,
        eventId: event1.id,
        status: "PENDING",
      },
    });
    await prisma.payment.create({
      data: {
        registrationId: reg.id,
        userId: student.id,
        amount: 3000,
        status: "PENDING",
      },
    });
  }

  const existingReg3 = await prisma.registration.findUnique({
    where: { userId_eventId: { userId: student.id, eventId: event3.id } },
  });
  if (!existingReg3) {
    await prisma.registration.create({
      data: {
        userId: student.id,
        eventId: event3.id,
        status: "CONFIRMED",
      },
    });
  }

  console.log("Seed data created:");
  console.log("  Admin: admin@uvento.kz / admin123");
  console.log("  Organizer: organizer@uvento.kz / organizer123");
  console.log("  Student: student@uvento.kz / student123");
  console.log(`  Organization: ${org.name}`);
  console.log("  6 events (all published)");
  console.log("  3 registrations for student");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
