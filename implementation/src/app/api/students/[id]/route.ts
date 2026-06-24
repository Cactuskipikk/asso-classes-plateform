import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getTeacherClassIds,
  notFound,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { updateStudentSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

async function canAccessStudent(
  userId: string,
  role: string,
  student: { id: string; parentId: string | null; classId: string | null }
) {
  if (role === "ADMIN") return true;
  if (role === "PARENT") return student.parentId === userId;
  if (role === "STUDENT") return student.id === userId;
  if (role === "TEACHER") {
    const classIds = await getTeacherClassIds(userId);
    return student.classId ? classIds.includes(student.classId) : false;
  }
  return false;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const student = await prisma.user.findFirst({
      where: { id, role: "STUDENT" },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        class: {
          include: {
            discipline: true,
            schoolYear: true,
          },
        },
        payments: {
          orderBy: { date: "desc" },
          include: { schoolYear: true },
        },
        progressItems: {
          orderBy: { order: "asc" },
          include: { schoolYear: true },
        },
        attendances: {
          orderBy: { createdAt: "desc" },
          include: {
            courseSession: {
              include: {
                courseSchedule: {
                  include: {
                    class: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!student) return notFound("Student not found");

    const allowed = await canAccessStudent(
      session.user.id,
      session.user.role,
      student
    );
    if (!allowed) return forbidden();

    const { password: _, ...studentWithoutPassword } = student;
    return NextResponse.json(studentWithoutPassword);
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
    const parsed = updateStudentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.user.findFirst({
      where: { id, role: "STUDENT" },
    });
    if (!existing) return notFound("Student not found");

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

    const student = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        parent: true,
        class: { include: { discipline: true } },
      },
    });

    const { password: _, ...studentWithoutPassword } = student;
    return NextResponse.json(studentWithoutPassword);
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
      where: { id, role: "STUDENT" },
    });
    if (!existing) return notFound("Student not found");

    const student = await prisma.user.update({
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

    return NextResponse.json(student);
  } catch (error) {
    return serverError(error);
  }
}
