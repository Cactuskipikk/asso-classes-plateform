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
import { updateCourseSessionSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const courseSession = await prisma.courseSession.findUnique({
      where: { id },
      include: {
        courseSchedule: {
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
          },
        },
        substitute: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attendances: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            student: { lastName: "asc" },
          },
        },
      },
    });

    if (!courseSession) return notFound("Session not found");

    if (session.user.role === "TEACHER") {
      const schedule = courseSession.courseSchedule;
      if (
        schedule.teacherId !== session.user.id &&
        courseSession.substituteId !== session.user.id
      ) {
        return forbidden();
      }
    }

    return NextResponse.json(courseSession);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN", "TEACHER"])) {
      return forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateCourseSessionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.courseSession.findUnique({
      where: { id },
      include: { courseSchedule: true },
    });
    if (!existing) return notFound("Session not found");

    if (session.user.role === "TEACHER") {
      const schedule = existing.courseSchedule;
      if (
        schedule.teacherId !== session.user.id &&
        existing.substituteId !== session.user.id
      ) {
        return forbidden();
      }
    }

    if (parsed.data.substituteId) {
      const substitute = await prisma.user.findFirst({
        where: {
          id: parsed.data.substituteId,
          role: "TEACHER",
          active: true,
        },
      });
      if (!substitute) {
        return badRequest("Substitute teacher not found");
      }
    }

    const courseSession = await prisma.courseSession.update({
      where: { id },
      data: parsed.data,
      include: {
        courseSchedule: {
          include: {
            class: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        substitute: {
          select: { id: true, firstName: true, lastName: true },
        },
        attendances: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    return NextResponse.json(courseSession);
  } catch (error) {
    return serverError(error);
  }
}
