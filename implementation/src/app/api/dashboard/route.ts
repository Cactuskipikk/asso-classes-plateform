import { NextResponse } from "next/server";
import {
  subMonths,
  startOfMonth,
} from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  getActiveSchoolYearId,
  getTeacherClassIds,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";

async function findConsecutiveAbsenceAlerts(studentIds?: string[]) {
  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      active: true,
      ...(studentIds ? { id: { in: studentIds } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parentId: true,
    },
  });

  const alerts: Array<{
    studentId: string;
    studentName: string;
    consecutiveAbsences: number;
  }> = [];

  for (const student of students) {
    const recentAttendances = await prisma.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { courseSession: { date: "desc" } },
      take: 3,
      select: { status: true },
    });

    if (
      recentAttendances.length >= 3 &&
      recentAttendances.every((a) => a.status === "ABSENT")
    ) {
      alerts.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        consecutiveAbsences: 3,
      });
    }
  }

  return alerts;
}

async function findUnpaidAlerts(studentIds?: string[]) {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      active: true,
      ...(studentIds ? { id: { in: studentIds } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      payments: {
        where: {
          date: { gte: startOfMonth(subMonths(now, 2)) },
          amount: { gt: 0 },
        },
        select: { date: true, amount: true },
      },
    },
  });

  const alerts: Array<{
    studentId: string;
    studentName: string;
    unpaidMonths: number;
  }> = [];

  for (const student of students) {
    const paidMonths = new Set(
      student.payments.map((p) => startOfMonth(p.date).getTime())
    );

    const monthsToCheck = [
      startOfMonth(subMonths(now, 1)).getTime(),
      currentMonthStart.getTime(),
    ];

    let unpaidCount = 0;
    for (const monthTime of monthsToCheck) {
      if (!paidMonths.has(monthTime)) {
        unpaidCount += 1;
      }
    }

    if (unpaidCount >= 2) {
      alerts.push({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        unpaidMonths: unpaidCount,
      });
    }
  }

  return alerts;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const role = session.user.role;
    const today = new Date();
    const dayOfWeek = today.getDay();

    const schoolYearId = await getActiveSchoolYearId();

    if (role === "ADMIN") {
      const [
        totalStudents,
        totalTeachers,
        todayCourses,
        attendances,
        recentActivity,
        unpaidAlerts,
        consecutiveAbsenceAlerts,
      ] = await Promise.all([
        prisma.user.count({ where: { role: "STUDENT", active: true } }),
        prisma.user.count({ where: { role: "TEACHER", active: true } }),
        prisma.courseSchedule.count({
          where: {
            dayOfWeek,
            active: true,
            ...(schoolYearId ? { schoolYearId } : {}),
          },
        }),
        prisma.attendance.findMany({
          select: { status: true },
        }),
        prisma.courseSession.findMany({
          take: 10,
          orderBy: { date: "desc" },
          include: {
            courseSchedule: {
              include: {
                class: { select: { name: true } },
                teacher: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
            _count: { select: { attendances: true } },
          },
        }),
        findUnpaidAlerts(),
        findConsecutiveAbsenceAlerts(),
      ]);

      const presentOrLate = attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const attendanceRate =
        attendances.length > 0
          ? Math.round((presentOrLate / attendances.length) * 100)
          : 0;

      return NextResponse.json({
        totalStudents,
        totalTeachers,
        todayCourses,
        unpaidAlerts,
        attendanceRate,
        recentActivity,
        consecutiveAbsenceAlerts,
      });
    }

    if (role === "TEACHER") {
      const teacherId = session.user.id;
      const classIds = await getTeacherClassIds(teacherId);

      const studentIds = classIds.length
        ? (
            await prisma.user.findMany({
              where: {
                role: "STUDENT",
                active: true,
                classId: { in: classIds },
              },
              select: { id: true },
            })
          ).map((s) => s.id)
        : [];

      const [todayCourses, recentActivity, consecutiveAbsenceAlerts] =
        await Promise.all([
          prisma.courseSchedule.count({
            where: {
              teacherId,
              dayOfWeek,
              active: true,
            },
          }),
          prisma.courseSession.findMany({
            where: {
              courseSchedule: { teacherId },
            },
            take: 10,
            orderBy: { date: "desc" },
            include: {
              courseSchedule: {
                include: {
                  class: { select: { name: true } },
                },
              },
              _count: { select: { attendances: true } },
            },
          }),
          findConsecutiveAbsenceAlerts(studentIds),
        ]);

      const teacherAttendances = studentIds.length
        ? await prisma.attendance.findMany({
            where: { studentId: { in: studentIds } },
            select: { status: true },
          })
        : [];

      const presentOrLate = teacherAttendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const attendanceRate =
        teacherAttendances.length > 0
          ? Math.round((presentOrLate / teacherAttendances.length) * 100)
          : 0;

      return NextResponse.json({
        totalStudents: studentIds.length,
        totalTeachers: 1,
        todayCourses,
        unpaidAlerts: [],
        attendanceRate,
        recentActivity,
        consecutiveAbsenceAlerts,
      });
    }

    if (role === "PARENT") {
      const children = await prisma.user.findMany({
        where: { parentId: session.user.id, role: "STUDENT", active: true },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);

      const [recentActivity, unpaidAlerts, consecutiveAbsenceAlerts] =
        await Promise.all([
          childIds.length
            ? prisma.courseSession.findMany({
                where: {
                  attendances: {
                    some: { studentId: { in: childIds } },
                  },
                },
                take: 10,
                orderBy: { date: "desc" },
                include: {
                  courseSchedule: {
                    include: {
                      class: { select: { name: true } },
                    },
                  },
                  attendances: {
                    where: { studentId: { in: childIds } },
                    include: {
                      student: {
                        select: { firstName: true, lastName: true },
                      },
                    },
                  },
                },
              })
            : Promise.resolve([]),
          findUnpaidAlerts(childIds),
          findConsecutiveAbsenceAlerts(childIds),
        ]);

      const childAttendances = childIds.length
        ? await prisma.attendance.findMany({
            where: { studentId: { in: childIds } },
            select: { status: true },
          })
        : [];

      const presentOrLate = childAttendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const attendanceRate =
        childAttendances.length > 0
          ? Math.round((presentOrLate / childAttendances.length) * 100)
          : 0;

      const todayCourses = childIds.length
        ? await prisma.courseSchedule.count({
            where: {
              dayOfWeek,
              active: true,
              class: {
                students: {
                  some: { id: { in: childIds } },
                },
              },
            },
          })
        : 0;

      return NextResponse.json({
        totalStudents: childIds.length,
        totalTeachers: 0,
        todayCourses,
        unpaidAlerts,
        attendanceRate,
        recentActivity,
        consecutiveAbsenceAlerts,
      });
    }

    if (role === "STUDENT") {
      const student = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { classId: true },
      });

      const [recentActivity, unpaidAlerts, consecutiveAbsenceAlerts] =
        await Promise.all([
          prisma.courseSession.findMany({
            where: {
              attendances: {
                some: { studentId: session.user.id },
              },
            },
            take: 10,
            orderBy: { date: "desc" },
            include: {
              courseSchedule: {
                include: {
                  class: { select: { name: true } },
                  teacher: {
                    select: { firstName: true, lastName: true },
                  },
                },
              },
              attendances: {
                where: { studentId: session.user.id },
              },
            },
          }),
          findUnpaidAlerts([session.user.id]),
          findConsecutiveAbsenceAlerts([session.user.id]),
        ]);

      const studentAttendances = await prisma.attendance.findMany({
        where: { studentId: session.user.id },
        select: { status: true },
      });

      const presentOrLate = studentAttendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const attendanceRate =
        studentAttendances.length > 0
          ? Math.round((presentOrLate / studentAttendances.length) * 100)
          : 0;

      const todayCourses = student?.classId
        ? await prisma.courseSchedule.count({
            where: {
              classId: student.classId,
              dayOfWeek,
              active: true,
            },
          })
        : 0;

      return NextResponse.json({
        totalStudents: 1,
        totalTeachers: 0,
        todayCourses,
        unpaidAlerts,
        attendanceRate,
        recentActivity,
        consecutiveAbsenceAlerts,
      });
    }

    return forbidden();
  } catch (error) {
    return serverError(error);
  }
}
