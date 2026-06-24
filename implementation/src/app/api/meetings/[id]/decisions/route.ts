import { NextRequest, NextResponse } from "next/server";
import { addMonths } from "date-fns";
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
import { boardDecisionSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id: boardMeetingId } = await params;

    const meeting = await prisma.boardMeeting.findUnique({
      where: { id: boardMeetingId },
    });
    if (!meeting) return notFound("Board meeting not found");

    const decisions = await prisma.boardDecision.findMany({
      where: { boardMeetingId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(decisions);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id: boardMeetingId } = await params;
    const body = await request.json();
    const parsed = boardDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const meeting = await prisma.boardMeeting.findUnique({
      where: { id: boardMeetingId },
    });
    if (!meeting) return notFound("Board meeting not found");

    const reviewDate = addMonths(meeting.date, 3);

    const decision = await prisma.boardDecision.create({
      data: {
        boardMeetingId,
        description: parsed.data.description,
        reviewDate,
      },
    });

    return NextResponse.json(decision, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
