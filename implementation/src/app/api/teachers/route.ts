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
import { teacherSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const teachers = await prisma.user.findMany({
      where: { role: "TEACHER", active: true },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        teacherType: true,
        active: true,
        createdAt: true,
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
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(teachers);
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
    const parsed = teacherSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const data = parsed.data;
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) {
      return badRequest("A user with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const teacher = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "TEACHER",
        teacherType: data.teacherType,
        gdprConsent: true,
        gdprConsentAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        teacherType: true,
        active: true,
        createdAt: true,
        titularCourses: {
          include: {
            class: { include: { discipline: true } },
          },
        },
      },
    });

    return NextResponse.json(teacher, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
