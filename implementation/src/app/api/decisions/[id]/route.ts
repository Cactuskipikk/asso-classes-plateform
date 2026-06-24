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
import { updateBoardDecisionSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = updateBoardDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.boardDecision.findUnique({ where: { id } });
    if (!existing) return notFound("Decision not found");

    const decision = await prisma.boardDecision.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(decision);
  } catch (error) {
    return serverError(error);
  }
}
