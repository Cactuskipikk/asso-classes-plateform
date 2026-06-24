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
import { roomSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const rooms = await prisma.room.findMany({
      where: { active: true },
      include: {
        _count: {
          select: {
            courseSchedules: {
              where: { active: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(rooms);
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
    const parsed = roomSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.room.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return badRequest("A room with this name already exists");
    }

    const room = await prisma.room.create({
      data: parsed.data,
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
