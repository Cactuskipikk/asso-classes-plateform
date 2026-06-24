import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  calculateLateMinutes,
  checkConsecutiveAbsences,
  forbidden,
  notFound,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { recordAttendanceBatchSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where: Record<string, unknown> = {};

    if (classId) {
      where.student = { classId };
    }

    if (startDate || endDate) {
      where.courseSession = {
        date: {
          ...(startDate ? { gte: new Date(startDate) } : {}),
          ...(endDate ? { lte: new Date(endDate) } : {}),
        },
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            class: { select: { id: true, name: true } },
          },
        },
        courseSession: {
          select: {
            id: true,
            date: true,
            courseSchedule: {
              select: {
                class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { courseSession: { date: "desc" } },
    });

    return NextResponse.json(records);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN", "TEACHER"])) {
      return forbidden();
    }

    const body = await request.json();
    const parsed = recordAttendanceBatchSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const { courseSessionId, attendances } = parsed.data;

    const courseSession = await prisma.courseSession.findUnique({
      where: { id: courseSessionId },
      include: {
        courseSchedule: true,
      },
    });
    if (!courseSession) return notFound("Course session not found");

    if (
      session.user.role === "TEACHER" &&
      courseSession.courseSchedule.teacherId !== session.user.id &&
      courseSession.substituteId !== session.user.id
    ) {
      return forbidden();
    }

    const startTime = courseSession.courseSchedule.startTime;
    const sessionDate = courseSession.date;

    const results = [];

    for (const attendance of attendances) {
      const student = await prisma.user.findFirst({
        where: {
          id: attendance.studentId,
          role: "STUDENT",
          active: true,
        },
      });
      if (!student) {
        return badRequest(`Student ${attendance.studentId} not found`);
      }

      let lateMinutes = 0;
      let status = attendance.status;

      if (attendance.status === "LATE" && attendance.arrivalTime) {
        lateMinutes = calculateLateMinutes(
          sessionDate,
          startTime,
          attendance.arrivalTime
        );
        if (lateMinutes === 0) {
          status = "PRESENT";
        }
      } else if (attendance.status === "PRESENT" && attendance.arrivalTime) {
        lateMinutes = calculateLateMinutes(
          sessionDate,
          startTime,
          attendance.arrivalTime
        );
        if (lateMinutes > 0) {
          status = "LATE";
        }
      }

      const record = await prisma.attendance.upsert({
        where: {
          courseSessionId_studentId: {
            courseSessionId,
            studentId: attendance.studentId,
          },
        },
        update: {
          status,
          arrivalTime: attendance.arrivalTime ?? null,
          lateMinutes,
        },
        create: {
          courseSessionId,
          studentId: attendance.studentId,
          status,
          arrivalTime: attendance.arrivalTime ?? null,
          lateMinutes,
        },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      results.push(record);

      if (status === "ABSENT") {
        await checkConsecutiveAbsences(attendance.studentId);
      }
    }

    return NextResponse.json(results, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
