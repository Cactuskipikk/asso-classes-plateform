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
import { schoolYearSchema, updateSchoolYearSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const schoolYears = await prisma.schoolYear.findMany({
      include: {
        _count: {
          select: {
            classes: true,
            payments: true,
            boardMeetings: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(schoolYears);
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
    const parsed = schoolYearSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.schoolYear.findUnique({
      where: { name: parsed.data.name },
    });
    if (existing) {
      return badRequest("A school year with this name already exists");
    }

    const data = parsed.data;

    if (data.active) {
      await prisma.schoolYear.updateMany({
        where: { active: true },
        data: { active: false },
      });
    }

    const schoolYear = await prisma.schoolYear.create({
      data: {
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
        active: data.active ?? false,
      },
    });

    return NextResponse.json(schoolYear, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
