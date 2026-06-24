import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

async function main() {
  const schoolYear = await prisma.schoolYear.upsert({
    where: { name: "2024-2025" },
    update: {
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-06-30"),
      active: true,
    },
    create: {
      name: "2024-2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-06-30"),
      active: true,
    },
  });

  const disciplines = await Promise.all([
    prisma.discipline.upsert({
      where: { name: "Apprentissage religieux" },
      update: {},
      create: { name: "Apprentissage religieux" },
    }),
    prisma.discipline.upsert({
      where: { name: "Langue arabe" },
      update: {},
      create: { name: "Langue arabe" },
    }),
    prisma.discipline.upsert({
      where: { name: "Informatique" },
      update: {},
      create: { name: "Informatique" },
    }),
  ]);

  const rooms = await Promise.all([
    prisma.room.upsert({
      where: { name: "Salle A" },
      update: { capacity: 20, active: true },
      create: { name: "Salle A", capacity: 20, active: true },
    }),
    prisma.room.upsert({
      where: { name: "Salle B" },
      update: { capacity: 15, active: true },
      create: { name: "Salle B", capacity: 15, active: true },
    }),
    prisma.room.upsert({
      where: { name: "Salle C" },
      update: { capacity: 30, active: true },
      create: { name: "Salle C", capacity: 30, active: true },
    }),
  ]);

  const adminPassword = await hashPassword("Admin123!");
  const admin = await prisma.user.upsert({
    where: { email: "admin@mustafa.edu" },
    update: {
      password: adminPassword,
      firstName: "Ahmed",
      lastName: "Yilmaz",
      role: "ADMIN",
      active: true,
    },
    create: {
      email: "admin@mustafa.edu",
      password: adminPassword,
      firstName: "Ahmed",
      lastName: "Yilmaz",
      role: "ADMIN",
      active: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const teacherPassword = await hashPassword("Teacher123!");
  const teacher1 = await prisma.user.upsert({
    where: { email: "teacher1@mustafa.edu" },
    update: {
      password: teacherPassword,
      firstName: "Mehmet",
      lastName: "Kaya",
      role: "TEACHER",
      teacherType: "TITULAR",
      active: true,
    },
    create: {
      email: "teacher1@mustafa.edu",
      password: teacherPassword,
      firstName: "Mehmet",
      lastName: "Kaya",
      role: "TEACHER",
      teacherType: "TITULAR",
      active: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const teacher2 = await prisma.user.upsert({
    where: { email: "teacher2@mustafa.edu" },
    update: {
      password: teacherPassword,
      firstName: "Ali",
      lastName: "Demir",
      role: "TEACHER",
      teacherType: "SUBSTITUTE",
      active: true,
    },
    create: {
      email: "teacher2@mustafa.edu",
      password: teacherPassword,
      firstName: "Ali",
      lastName: "Demir",
      role: "TEACHER",
      teacherType: "SUBSTITUTE",
      active: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const parentPassword = await hashPassword("Parent123!");
  const parent = await prisma.user.upsert({
    where: { email: "parent@mustafa.edu" },
    update: {
      password: parentPassword,
      firstName: "Fatma",
      lastName: "Ozturk",
      role: "PARENT",
      gdprConsent: true,
      gdprConsentAt: new Date(),
      active: true,
    },
    create: {
      email: "parent@mustafa.edu",
      password: parentPassword,
      firstName: "Fatma",
      lastName: "Ozturk",
      role: "PARENT",
      gdprConsent: true,
      gdprConsentAt: new Date(),
      active: true,
    },
  });

  const studentPassword = await hashPassword("Student123!");

  async function upsertClass(
    name: string,
    disciplineId: string,
    organizationType: "BY_SUBJECT" | "BY_AGE",
    ageMin?: number,
    ageMax?: number
  ) {
    const existing = await prisma.class.findFirst({
      where: { name, schoolYearId: schoolYear.id },
    });
    if (existing) {
      return prisma.class.update({
        where: { id: existing.id },
        data: {
          disciplineId,
          organizationType,
          ageMin,
          ageMax,
          active: true,
        },
      });
    }
    return prisma.class.create({
      data: {
        name,
        disciplineId,
        schoolYearId: schoolYear.id,
        organizationType,
        ageMin,
        ageMax,
        active: true,
      },
    });
  }

  const classReligieux = await upsertClass(
    "Religion - Niveau 1",
    disciplines[0].id,
    "BY_AGE",
    6,
    8
  );
  const classArabe = await upsertClass(
    "Arabe - Débutant",
    disciplines[1].id,
    "BY_AGE",
    7,
    10
  );
  const classInfo = await upsertClass(
    "Informatique - Initiation",
    disciplines[2].id,
    "BY_SUBJECT"
  );

  const student1 = await prisma.user.upsert({
    where: { email: "student1@mustafa.edu" },
    update: {
      password: studentPassword,
      firstName: "Yusuf",
      lastName: "Ozturk",
      role: "STUDENT",
      gender: "M",
      birthDate: new Date("2016-03-15"),
      parentId: parent.id,
      classId: classReligieux.id,
      active: true,
    },
    create: {
      email: "student1@mustafa.edu",
      password: studentPassword,
      firstName: "Yusuf",
      lastName: "Ozturk",
      role: "STUDENT",
      gender: "M",
      birthDate: new Date("2016-03-15"),
      parentId: parent.id,
      classId: classReligieux.id,
      active: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  const student2 = await prisma.user.upsert({
    where: { email: "student2@mustafa.edu" },
    update: {
      password: studentPassword,
      firstName: "Zeynep",
      lastName: "Ozturk",
      role: "STUDENT",
      gender: "F",
      birthDate: new Date("2017-08-22"),
      parentId: parent.id,
      classId: classArabe.id,
      active: true,
    },
    create: {
      email: "student2@mustafa.edu",
      password: studentPassword,
      firstName: "Zeynep",
      lastName: "Ozturk",
      role: "STUDENT",
      gender: "F",
      birthDate: new Date("2017-08-22"),
      parentId: parent.id,
      classId: classArabe.id,
      active: true,
      gdprConsent: true,
      gdprConsentAt: new Date(),
    },
  });

  async function upsertCourseSchedule(data: {
    classId: string;
    roomId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }) {
    const existing = await prisma.courseSchedule.findFirst({
      where: {
        classId: data.classId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        schoolYearId: schoolYear.id,
      },
    });
    if (existing) {
      return prisma.courseSchedule.update({
        where: { id: existing.id },
        data: {
          teacherId: teacher1.id,
          roomId: data.roomId,
          endTime: data.endTime,
          active: true,
        },
      });
    }
    return prisma.courseSchedule.create({
      data: {
        ...data,
        teacherId: teacher1.id,
        schoolYearId: schoolYear.id,
        isCollective: false,
        active: true,
      },
    });
  }

  const scheduleReligieux = await upsertCourseSchedule({
    classId: classReligieux.id,
    roomId: rooms[0].id,
    dayOfWeek: 6,
    startTime: "09:00",
    endTime: "10:30",
  });

  const scheduleArabe = await upsertCourseSchedule({
    classId: classArabe.id,
    roomId: rooms[1].id,
    dayOfWeek: 0,
    startTime: "14:00",
    endTime: "15:30",
  });

  const scheduleInfo = await upsertCourseSchedule({
    classId: classInfo.id,
    roomId: rooms[2].id,
    dayOfWeek: 3,
    startTime: "17:00",
    endTime: "18:30",
  });

  const progressTitles = [
    { studentId: student1.id, title: "Récitation Sourate Al-Fatiha", level: "ACQUIRED", order: 1 },
    { studentId: student1.id, title: "Les cinq piliers de l'Islam", level: "IN_PROGRESS", order: 2 },
    { studentId: student1.id, title: "Histoire des prophètes", level: "LEARNING", order: 3 },
    { studentId: student2.id, title: "Alphabet arabe", level: "ACQUIRED", order: 1 },
    { studentId: student2.id, title: "Vocabulaire de base", level: "IN_PROGRESS", order: 2 },
    { studentId: student2.id, title: "Conversation simple", level: "LEARNING", order: 3 },
  ];

  for (const item of progressTitles) {
    const existing = await prisma.progressItem.findFirst({
      where: {
        studentId: item.studentId,
        title: item.title,
        schoolYearId: schoolYear.id,
      },
    });
    if (existing) {
      await prisma.progressItem.update({
        where: { id: existing.id },
        data: {
          level: item.level,
          order: item.order,
          validatedAt: item.level === "ACQUIRED" ? new Date("2024-10-15") : null,
        },
      });
    } else {
      await prisma.progressItem.create({
        data: {
          ...item,
          schoolYearId: schoolYear.id,
          validatedAt: item.level === "ACQUIRED" ? new Date("2024-10-15") : null,
        },
      });
    }
  }

  const paymentData = [
    {
      studentId: student1.id,
      amount: 50,
      type: "NORMAL",
      date: new Date("2024-09-05"),
      notes: "Cotisation septembre",
    },
    {
      studentId: student1.id,
      amount: 50,
      type: "NORMAL",
      date: new Date("2024-10-05"),
      notes: "Cotisation octobre",
    },
    {
      studentId: student2.id,
      amount: 30,
      type: "REDUCED",
      date: new Date("2024-09-05"),
      notes: "Cotisation réduite septembre",
    },
    {
      studentId: student2.id,
      amount: 0,
      type: "FREE",
      date: new Date("2024-10-05"),
      notes: "Exonération octobre",
    },
  ];

  for (const payment of paymentData) {
    const existing = await prisma.payment.findFirst({
      where: {
        studentId: payment.studentId,
        date: payment.date,
        amount: payment.amount,
      },
    });
    if (!existing) {
      await prisma.payment.create({
        data: { ...payment, schoolYearId: schoolYear.id },
      });
    }
  }

  const meetingDate = new Date("2024-11-15T18:00:00");
  let boardMeeting = await prisma.boardMeeting.findFirst({
    where: { date: meetingDate, schoolYearId: schoolYear.id },
  });
  if (!boardMeeting) {
    boardMeeting = await prisma.boardMeeting.create({
      data: {
        date: meetingDate,
        notes:
          "Réunion du conseil d'administration - bilan du premier trimestre et planification des activités.",
        schoolYearId: schoolYear.id,
      },
    });
  } else {
    boardMeeting = await prisma.boardMeeting.update({
      where: { id: boardMeeting.id },
      data: {
        notes:
          "Réunion du conseil d'administration - bilan du premier trimestre et planification des activités.",
      },
    });
  }

  await prisma.boardAttendance.upsert({
    where: {
      boardMeetingId_memberId: {
        boardMeetingId: boardMeeting.id,
        memberId: admin.id,
      },
    },
    update: { present: true },
    create: {
      boardMeetingId: boardMeeting.id,
      memberId: admin.id,
      present: true,
    },
  });

  await prisma.boardAttendance.upsert({
    where: {
      boardMeetingId_memberId: {
        boardMeetingId: boardMeeting.id,
        memberId: teacher1.id,
      },
    },
    update: { present: true },
    create: {
      boardMeetingId: boardMeeting.id,
      memberId: teacher1.id,
      present: true,
    },
  });

  const decisions = [
    {
      description: "Augmenter la capacité de la Salle C à 35 places",
      reviewDate: new Date("2025-02-15"),
      applied: true,
      reviewedAt: new Date("2025-02-20"),
    },
    {
      description: "Organiser une sortie éducative au printemps",
      reviewDate: new Date("2025-02-15"),
      applied: null,
    },
    {
      description: "Recruter un enseignant supplémentaire pour l'arabe",
      reviewDate: new Date("2025-02-15"),
      applied: false,
      notAppliedReason: "Budget insuffisant pour le moment",
      reviewedAt: new Date("2025-03-01"),
    },
  ];

  for (const decision of decisions) {
    const existing = await prisma.boardDecision.findFirst({
      where: {
        boardMeetingId: boardMeeting.id,
        description: decision.description,
      },
    });
    if (existing) {
      await prisma.boardDecision.update({
        where: { id: existing.id },
        data: decision,
      });
    } else {
      await prisma.boardDecision.create({
        data: {
          boardMeetingId: boardMeeting.id,
          ...decision,
        },
      });
    }
  }

  const sessionDates = [
    { schedule: scheduleReligieux, date: new Date("2024-11-02T09:00:00") },
    { schedule: scheduleArabe, date: new Date("2024-11-03T14:00:00") },
    { schedule: scheduleInfo, date: new Date("2024-11-06T17:00:00") },
  ];

  for (const { schedule, date } of sessionDates) {
    let session = await prisma.courseSession.findFirst({
      where: { courseScheduleId: schedule.id, date },
    });
    if (!session) {
      session = await prisma.courseSession.create({
        data: {
          courseScheduleId: schedule.id,
          date,
          status: "COMPLETED",
          content: "Cours complété avec succès",
          homework: "Réviser les leçons du jour",
        },
      });
    }

    const studentsInClass = await prisma.user.findMany({
      where: { classId: schedule.classId, role: "STUDENT", active: true },
    });

    for (const student of studentsInClass) {
      await prisma.attendance.upsert({
        where: {
          courseSessionId_studentId: {
            courseSessionId: session.id,
            studentId: student.id,
          },
        },
        update: { status: "PRESENT", lateMinutes: 0 },
        create: {
          courseSessionId: session.id,
          studentId: student.id,
          status: "PRESENT",
          lateMinutes: 0,
        },
      });
    }
  }

  console.log("Seed completed successfully.");
  console.log({
    schoolYear: schoolYear.name,
    admin: admin.email,
    teachers: [teacher1.email, teacher2.email],
    parent: parent.email,
    students: [student1.email, student2.email],
    classes: [classReligieux.name, classArabe.name, classInfo.name],
    schedules: [
      scheduleReligieux.id,
      scheduleArabe.id,
      scheduleInfo.id,
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
