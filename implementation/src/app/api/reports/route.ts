import { NextResponse } from "next/server";
import { format, startOfMonth, subMonths } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  getActiveSchoolYearId,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";

function parseDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM - (startH * 60 + startM)) / 60;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const schoolYearId = await getActiveSchoolYearId();
    const now = new Date();

    const attendances = await prisma.attendance.findMany({
      where: schoolYearId
        ? {
            courseSession: {
              courseSchedule: { schoolYearId },
            },
          }
        : undefined,
      include: {
        courseSession: { select: { date: true } },
      },
    });

    const monthlyMap = new Map<string, { present: number; total: number }>();
    for (let i = 11; i >= 0; i--) {
      const month = subMonths(now, i);
      const key = format(startOfMonth(month), "yyyy-MM");
      monthlyMap.set(key, { present: 0, total: 0 });
    }

    for (const att of attendances) {
      const key = format(startOfMonth(att.courseSession.date), "yyyy-MM");
      const entry = monthlyMap.get(key);
      if (!entry) continue;
      entry.total += 1;
      if (att.status === "PRESENT" || att.status === "LATE") {
        entry.present += 1;
      }
    }

    const attendanceByMonth = Array.from(monthlyMap.entries()).map(
      ([month, data]) => ({
        month,
        rate:
          data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      })
    );

    const weeklyMap = new Map<number, { present: number; total: number }>();
    for (let d = 0; d <= 6; d++) {
      weeklyMap.set(d, { present: 0, total: 0 });
    }

    for (const att of attendances) {
      const day = att.courseSession.date.getDay();
      const entry = weeklyMap.get(day)!;
      entry.total += 1;
      if (att.status === "PRESENT" || att.status === "LATE") {
        entry.present += 1;
      }
    }

    const attendanceByDay = Array.from(weeklyMap.entries()).map(
      ([day, data]) => ({
        day,
        rate:
          data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
        count: data.total,
      })
    );

    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        titularCourses: {
          where: { active: true, ...(schoolYearId ? { schoolYearId } : {}) },
          select: { startTime: true, endTime: true },
        },
      },
    });

    const hoursPerTeacher = teachers.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      hours: t.titularCourses.reduce(
        (sum, c) => sum + parseDurationHours(c.startTime, c.endTime),
        0
      ),
    }));

    const classes = await prisma.class.findMany({
      where: { active: true, ...(schoolYearId ? { schoolYearId } : {}) },
      include: {
        _count: {
          select: {
            students: { where: { role: "STUDENT", active: true } },
          },
        },
      },
    });

    const studentsPerClass = classes.map((c) => ({
      name: c.name,
      value: c._count.students,
    }));

    return NextResponse.json({
      attendanceByMonth,
      attendanceByDay,
      hoursPerTeacher,
      studentsPerClass,
    });
  } catch (error) {
    return serverError(error);
  }
}
