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
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

const attendanceUpdateSchema = z.object({
  attendances: z.array(
    z.object({
      memberId: z.string().min(1),
      present: z.boolean(),
    })
  ),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id: boardMeetingId } = await params;
    const body = await request.json();
    const parsed = attendanceUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const meeting = await prisma.boardMeeting.findUnique({
      where: { id: boardMeetingId },
    });
    if (!meeting) return notFound("Board meeting not found");

    for (const att of parsed.data.attendances) {
      await prisma.boardAttendance.upsert({
        where: {
          boardMeetingId_memberId: {
            boardMeetingId,
            memberId: att.memberId,
          },
        },
        update: { present: att.present },
        create: {
          boardMeetingId,
          memberId: att.memberId,
          present: att.present,
        },
      });
    }

    const updated = await prisma.boardMeeting.findUnique({
      where: { id: boardMeetingId },
      include: {
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
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return serverError(error);
  }
}
