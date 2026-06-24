import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  forbidden,
  getActiveSchoolYearId,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { progressItemSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return badRequest("studentId query parameter is required");
    }

    const student = await prisma.user.findFirst({
      where: { id: studentId, role: "STUDENT" },
      select: { id: true, parentId: true },
    });
    if (!student) {
      return badRequest("Student not found");
    }

    if (session.user.role === "STUDENT" && session.user.id !== studentId) {
      return forbidden();
    }
    if (session.user.role === "PARENT" && student.parentId !== session.user.id) {
      return forbidden();
    }
    if (
      !requireRoles(session.user.role, ["ADMIN", "TEACHER", "PARENT", "STUDENT"])
    ) {
      return forbidden();
    }

    const progressItems = await prisma.progressItem.findMany({
      where: { studentId },
      include: { schoolYear: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json(progressItems);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN", "TEACHER"])) {
      return forbidden();
    }

    const body = await request.json();
    const parsed = progressItemSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const data = parsed.data;
    const schoolYearId = await getActiveSchoolYearId();
    if (!schoolYearId) {
      return badRequest("No active school year found");
    }

    const student = await prisma.user.findFirst({
      where: { id: data.studentId, role: "STUDENT", active: true },
    });
    if (!student) {
      return badRequest("Student not found");
    }

    const progressItem = await prisma.progressItem.create({
      data: {
        studentId: data.studentId,
        title: data.title,
        level: data.level,
        order: data.order,
        schoolYearId,
      },
      include: { schoolYear: true },
    });

    return NextResponse.json(progressItem, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
