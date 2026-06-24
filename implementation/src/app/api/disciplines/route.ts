import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { disciplineSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const disciplines = await prisma.discipline.findMany({
      include: {
        _count: {
          select: { classes: { where: { active: true } } },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(disciplines);
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
    const parsed = disciplineSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.discipline.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return badRequest("A discipline with this name already exists");
    }

    const discipline = await prisma.discipline.create({
      data: parsed.data,
    });

    return NextResponse.json(discipline, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
