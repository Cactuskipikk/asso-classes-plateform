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
import { paymentSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const schoolYearId = searchParams.get("schoolYearId");
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};

    if (studentId) where.studentId = studentId;
    if (schoolYearId) where.schoolYearId = schoolYearId;
    if (type) where.type = type;

    if (session.user.role === "PARENT") {
      where.student = { parentId: session.user.id };
    } else if (session.user.role === "STUDENT") {
      where.studentId = session.user.id;
    } else if (session.user.role === "TEACHER") {
      return forbidden();
    } else if (session.user.role !== "ADMIN") {
      return forbidden();
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        schoolYear: true,
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(payments);
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
    const parsed = paymentSchema.safeParse(body);
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

    const payment = await prisma.payment.create({
      data: {
        studentId: data.studentId,
        amount: data.amount,
        type: data.type,
        date: data.date,
        notes: data.notes,
        schoolYearId,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        schoolYear: true,
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
