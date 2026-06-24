import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getActiveSchoolYearId,
  isRoomAvailable,
  notFound,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { courseScheduleSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const teacherId = searchParams.get("teacherId");
    const dayOfWeekParam = searchParams.get("dayOfWeek");

    const where: Record<string, unknown> = { active: true };

    if (classId) where.classId = classId;
    if (teacherId) where.teacherId = teacherId;
    if (dayOfWeekParam !== null && dayOfWeekParam !== "") {
      where.dayOfWeek = parseInt(dayOfWeekParam, 10);
    }

    if (session.user.role === "TEACHER") {
      where.teacherId = session.user.id;
    }

    const courses = await prisma.courseSchedule.findMany({
      where,
      include: {
        class: {
          include: {
            discipline: true,
            schoolYear: true,
          },
        },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            teacherType: true,
          },
        },
        room: true,
        schoolYear: true,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json(courses);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const body = await request.json();
    const parsed = courseScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const data = parsed.data;
    const schoolYearId = await getActiveSchoolYearId();
    if (!schoolYearId) {
      return badRequest("No active school year found");
    }

    const [cls, teacher, room] = await Promise.all([
      prisma.class.findFirst({
        where: { id: data.classId, active: true },
      }),
      prisma.user.findFirst({
        where: { id: data.teacherId, role: "TEACHER", active: true },
      }),
      prisma.room.findFirst({
        where: { id: data.roomId, active: true },
      }),
    ]);

    if (!cls) return badRequest("Class not found");
    if (!teacher) return badRequest("Teacher not found");
    if (!room) return badRequest("Room not found");

    const available = await isRoomAvailable(
      data.roomId,
      data.dayOfWeek,
      data.startTime,
      data.endTime
    );
    if (!available) {
      return badRequest("Room is not available at the requested day and time");
    }

    const course = await prisma.courseSchedule.create({
      data: {
        classId: data.classId,
        teacherId: data.teacherId,
        roomId: data.roomId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isCollective: data.isCollective,
        schoolYearId,
      },
      include: {
        class: { include: { discipline: true } },
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        room: true,
        schoolYear: true,
      },
    });

    return NextResponse.json(course, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
