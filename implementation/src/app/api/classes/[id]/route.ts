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
import { updateClassSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const cls = await prisma.class.findUnique({
      where: { id },
      include: {
        discipline: true,
        schoolYear: true,
        students: {
          where: { role: "STUDENT", active: true },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            gender: true,
            birthDate: true,
          },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        },
        courseSchedules: {
          where: { active: true },
          include: {
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
        _count: {
          select: {
            students: {
              where: { role: "STUDENT", active: true },
            },
          },
        },
      },
    });

    if (!cls) return notFound("Class not found");

    const { _count, ...classData } = cls;
    return NextResponse.json({
      ...classData,
      studentCount: _count.students,
    });
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
    const parsed = updateClassSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) return notFound("Class not found");

    const cls = await prisma.class.update({
      where: { id },
      data: parsed.data,
      include: {
        discipline: true,
        schoolYear: true,
        _count: {
          select: {
            students: {
              where: { role: "STUDENT", active: true },
            },
          },
        },
      },
    });

    const { _count, ...classData } = cls;
    return NextResponse.json({
      ...classData,
      studentCount: _count.students,
    });
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

    const existing = await prisma.class.findUnique({ where: { id } });
    if (!existing) return notFound("Class not found");

    const cls = await prisma.class.update({
      where: { id },
      data: { active: false },
      include: {
        discipline: true,
        schoolYear: true,
      },
    });

    return NextResponse.json(cls);
  } catch (error) {
    return serverError(error);
  }
}
