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

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const room = await prisma.room.findUnique({
      where: { id },
      include: {
        courseSchedules: {
          where: { active: true },
          include: {
            class: true,
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!room) return notFound("Room not found");

    return NextResponse.json(room);
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
    const parsed = roomSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) return notFound("Room not found");

    if (parsed.data.name !== existing.name) {
      const nameTaken = await prisma.room.findUnique({
        where: { name: parsed.data.name },
      });
      if (nameTaken) {
        return badRequest("A room with this name already exists");
      }
    }

    const room = await prisma.room.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json(room);
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

    const existing = await prisma.room.findUnique({ where: { id } });
    if (!existing) return notFound("Room not found");

    const room = await prisma.room.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json(room);
  } catch (error) {
    return serverError(error);
  }
}
