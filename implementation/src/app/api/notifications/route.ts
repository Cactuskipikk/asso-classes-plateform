import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { markNotificationsReadSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const where: Record<string, unknown> = {
      userId: session.user.id,
    };
    if (unreadOnly) where.read = false;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const body = await request.json();
    const parsed = markNotificationsReadSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: parsed.data.ids },
        userId: session.user.id,
      },
      data: { read: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return serverError(error);
  }
}
