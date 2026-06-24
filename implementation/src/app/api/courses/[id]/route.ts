import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  isRoomAvailable,
  notFound,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { courseScheduleSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

const courseInclude = {
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
  sessions: {
    orderBy: { date: "desc" as const },
    take: 10,
  },
};

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const course = await prisma.courseSchedule.findUnique({
      where: { id },
      include: courseInclude,
    });

    if (!course) return notFound("Course schedule not found");

    if (
      session.user.role === "TEACHER" &&
      course.teacherId !== session.user.id
    ) {
      return forbidden();
    }

    return NextResponse.json(course);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = courseScheduleSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.courseSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Course schedule not found");

    const data = parsed.data;

    const available = await isRoomAvailable(
      data.roomId,
      data.dayOfWeek,
      data.startTime,
      data.endTime,
      id
    );
    if (!available) {
      return badRequest("Room is not available at the requested day and time");
    }

    const course = await prisma.courseSchedule.update({
      where: { id },
      data: {
        classId: data.classId,
        teacherId: data.teacherId,
        roomId: data.roomId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        isCollective: data.isCollective,
      },
      include: courseInclude,
    });

    return NextResponse.json(course);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;

    const existing = await prisma.courseSchedule.findUnique({ where: { id } });
    if (!existing) return notFound("Course schedule not found");

    const course = await prisma.courseSchedule.update({
      where: { id },
      data: { active: false },
      include: {
        class: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true },
        },
        room: true,
      },
    });

    return NextResponse.json(course);
  } catch (error) {
    return serverError(error);
  }
}
