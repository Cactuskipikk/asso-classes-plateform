import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getActiveSchoolYearId,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { boardMeetingSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { searchParams } = new URL(request.url);
    const schoolYearId = searchParams.get("schoolYearId");

    const where: Record<string, unknown> = {};
    if (schoolYearId) where.schoolYearId = schoolYearId;

    const meetings = await prisma.boardMeeting.findMany({
      where,
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
      orderBy: { date: "desc" },
    });

    return NextResponse.json(meetings);
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
    const parsed = boardMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const schoolYearId = await getActiveSchoolYearId();
    if (!schoolYearId) {
      return badRequest("No active school year found");
    }

    const meeting = await prisma.boardMeeting.create({
      data: {
        date: parsed.data.date,
        notes: parsed.data.notes,
        schoolYearId,
      },
      include: {
        schoolYear: true,
        attendances: true,
        decisions: true,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
