import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  notFound,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { courseSessionCreateSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id: courseScheduleId } = await params;

    const schedule = await prisma.courseSchedule.findUnique({
      where: { id: courseScheduleId },
    });
    if (!schedule) return notFound("Course schedule not found");

    if (
      session.user.role === "TEACHER" &&
      schedule.teacherId !== session.user.id
    ) {
      return forbidden();
    }

    const sessions = await prisma.courseSession.findMany({
      where: { courseScheduleId },
      include: {
        substitute: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { attendances: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(sessions);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN", "TEACHER"])) {
      return forbidden();
    }

    const { id: courseScheduleId } = await params;
    const body = await request.json();
    const parsed = courseSessionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const schedule = await prisma.courseSchedule.findUnique({
      where: { id: courseScheduleId, active: true },
    });
    if (!schedule) return notFound("Course schedule not found");

    if (
      session.user.role === "TEACHER" &&
      schedule.teacherId !== session.user.id
    ) {
      return forbidden();
    }

    const sessionDate = parsed.data.date;
    const dayOfWeek = sessionDate.getDay();
    if (dayOfWeek !== schedule.dayOfWeek) {
      return badRequest(
        `Session date must fall on day of week ${schedule.dayOfWeek}`
      );
    }

    const existing = await prisma.courseSession.findFirst({
      where: {
        courseScheduleId,
        date: sessionDate,
      },
    });
    if (existing) {
      return badRequest("A session already exists for this date");
    }

    const courseSession = await prisma.courseSession.create({
      data: {
        courseScheduleId,
        date: sessionDate,
        status: "SCHEDULED",
      },
      include: {
        courseSchedule: {
          include: {
            class: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
            room: true,
          },
        },
      },
    });

    return NextResponse.json(courseSession, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
