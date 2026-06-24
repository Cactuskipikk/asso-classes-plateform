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
import { paymentSchema } from "@/lib/validations";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { id } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            parentId: true,
          },
        },
        schoolYear: true,
      },
    });

    if (!payment) return notFound("Payment not found");

    if (session.user.role === "PARENT" && payment.student.parentId !== session.user.id) {
      return forbidden();
    }
    if (session.user.role === "STUDENT" && payment.studentId !== session.user.id) {
      return forbidden();
    }
    if (session.user.role === "TEACHER") {
      return forbidden();
    }

    return NextResponse.json(payment);
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
    const parsed = paymentSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return notFound("Payment not found");

    const data = parsed.data;
    const schoolYearId = existing.schoolYearId;

    const payment = await prisma.payment.update({
      where: { id },
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

    return NextResponse.json(payment);
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

    const existing = await prisma.payment.findUnique({ where: { id } });
    if (!existing) return notFound("Payment not found");

    await prisma.payment.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return serverError(error);
  }
}
