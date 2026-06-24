import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getTeacherClassIds,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { createStudentSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get("classId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {
      role: "STUDENT",
      active: true,
    };

    if (session.user.role === "PARENT") {
      where.parentId = session.user.id;
      if (classId) where.classId = classId;
    } else if (session.user.role === "TEACHER") {
      const classIds = await getTeacherClassIds(session.user.id);
      if (classIds.length === 0) {
        return NextResponse.json([]);
      }
      if (classId) {
        if (!classIds.includes(classId)) {
          return forbidden();
        }
        where.classId = classId;
      } else {
        where.classId = { in: classIds };
      }
    } else if (session.user.role === "ADMIN") {
      if (classId) where.classId = classId;
    } else {
      return forbidden();
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }

    const students = await prisma.user.findMany({
      where,
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
        attendances: {
          select: { status: true },
        },
        payments: {
          select: { date: true, amount: true, type: true },
          orderBy: { date: "desc" },
          take: 12,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(students);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    if (!requireRoles(session.user.role, ["ADMIN", "PARENT"])) {
      return forbidden();
    }

    const body = await request.json();
    const parsed = createStudentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const data = parsed.data;
    const parentId =
      session.user.role === "PARENT" ? session.user.id : data.parentId || undefined;

    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return badRequest("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const student = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: "STUDENT",
        gender: data.gender,
        birthDate: data.birthDate,
        parentId: parentId ?? undefined,
        classId: data.classId,
        gdprConsent: true,
        gdprConsentAt: new Date(),
      },
      include: {
        parent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        class: {
          include: {
            discipline: true,
          },
        },
      },
    });

    const { password: _, ...studentWithoutPassword } = student;
    return NextResponse.json(studentWithoutPassword, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
