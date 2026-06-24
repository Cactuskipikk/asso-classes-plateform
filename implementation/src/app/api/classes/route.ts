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
import { createClassSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const schoolYearId = searchParams.get("schoolYearId");
    const disciplineId = searchParams.get("disciplineId");

    const where: Record<string, unknown> = { active: true };
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (disciplineId) where.disciplineId = disciplineId;

    const classes = await prisma.class.findMany({
      where,
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
      orderBy: { name: "asc" },
    });

    const result = classes.map(({ _count, ...cls }) => ({
      ...cls,
      studentCount: _count.students,
    }));

    return NextResponse.json(result);
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
    const parsed = createClassSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const data = parsed.data;

    const schoolYear = await prisma.schoolYear.findUnique({
      where: { id: data.schoolYearId },
    });
    if (!schoolYear) {
      return badRequest("School year not found");
    }

    const discipline = await prisma.discipline.findUnique({
      where: { id: data.disciplineId },
    });
    if (!discipline) {
      return badRequest("Discipline not found");
    }

    const cls = await prisma.class.create({
      data: {
        name: data.name,
        organizationType: data.organizationType,
        ageMin: data.ageMin,
        ageMax: data.ageMax,
        disciplineId: data.disciplineId,
        schoolYearId: data.schoolYearId,
      },
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
    return NextResponse.json(
      { ...classData, studentCount: _count.students },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error);
  }
}
