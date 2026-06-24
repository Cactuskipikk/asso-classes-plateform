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
import { updateProgressItemSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN", "TEACHER"])) {
      return forbidden();
    }

    const { id } = await params;
    const body = await request.json();
    const parsed = updateProgressItemSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.progressItem.findUnique({ where: { id } });
    if (!existing) return notFound("Progress item not found");

    const progressItem = await prisma.progressItem.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(parsed.data.level === "ACQUIRED" && !parsed.data.validatedAt
          ? { validatedAt: new Date() }
          : {}),
      },
      include: {
        student: {
          select: { id: true, firstName: true, lastName: true },
        },
        schoolYear: true,
      },
    });

    return NextResponse.json(progressItem);
  } catch (error) {
    return serverError(error);
  }
}
