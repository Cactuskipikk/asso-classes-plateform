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
import { updateSchoolYearSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const { id } = await params;
    const body = await request.json();
    const parsed = updateSchoolYearSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.schoolYear.findUnique({ where: { id } });
    if (!existing) return notFound("School year not found");

    const data = parsed.data;

    if (data.name && data.name !== existing.name) {
      const nameTaken = await prisma.schoolYear.findUnique({
        where: { name: data.name },
      });
      if (nameTaken) {
        return badRequest("A school year with this name already exists");
      }
    }

    if (data.active) {
      await prisma.schoolYear.updateMany({
        where: { active: true, id: { not: id } },
        data: { active: false },
      });
    }

    const schoolYear = await prisma.schoolYear.update({
      where: { id },
      data,
    });

    return NextResponse.json(schoolYear);
  } catch (error) {
    return serverError(error);
  }
}
