import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
import { updateTeacherSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

const teacherSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  teacherType: true,
  active: true,
  createdAt: true,
  updatedAt: true,
  titularCourses: {
    where: { active: true },
    include: {
      class: {
        include: {
          discipline: true,
          schoolYear: true,
        },
      },
      room: true,
    },
  },
} as const;

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;

    const teacher = await prisma.user.findFirst({
      where: { id, role: "TEACHER" },
      select: teacherSelect,
    });

    if (!teacher) return notFound("Teacher not found");

    return NextResponse.json(teacher);
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
    const parsed = updateTeacherSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.user.findFirst({
      where: { id, role: "TEACHER" },
    });
    if (!existing) return notFound("Teacher not found");

    const data = parsed.data;
    if (data.email && data.email !== existing.email) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (emailTaken) {
        return badRequest("A user with this email already exists");
      }
    }

    const updateData: Record<string, unknown> = { ...data };
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      delete updateData.password;
    }

    const teacher = await prisma.user.update({
      where: { id },
      data: updateData,
      select: teacherSelect,
    });

    return NextResponse.json(teacher);
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

    const existing = await prisma.user.findFirst({
      where: { id, role: "TEACHER" },
    });
    if (!existing) return notFound("Teacher not found");

    const teacher = await prisma.user.update({
      where: { id },
      data: { active: false },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        active: true,
      },
    });

    return NextResponse.json(teacher);
  } catch (error) {
    return serverError(error);
  }
}
