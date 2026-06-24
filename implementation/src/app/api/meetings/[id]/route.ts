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
import { updateBoardMeetingSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;

    const meeting = await prisma.boardMeeting.findUnique({
      where: { id },
      include: {
        schoolYear: true,
        attendances: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true,
              },
            },
          },
        },
        decisions: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!meeting) return notFound("Board meeting not found");

    return NextResponse.json(meeting);
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
    const parsed = updateBoardMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.boardMeeting.findUnique({ where: { id } });
    if (!existing) return notFound("Board meeting not found");

    const meeting = await prisma.boardMeeting.update({
      where: { id },
      data: parsed.data,
      include: {
        schoolYear: true,
        attendances: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        decisions: true,
      },
    });

    return NextResponse.json(meeting);
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

    const existing = await prisma.boardMeeting.findUnique({ where: { id } });
    if (!existing) return notFound("Board meeting not found");

    await prisma.boardMeeting.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
