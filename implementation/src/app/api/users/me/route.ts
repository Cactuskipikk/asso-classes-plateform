import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  badRequest,
  serverError,
  unauthorized,
} from "@/lib/api-utils";
import { z } from "zod";

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  locale: z.enum(["fr", "en", "tr", "ar", "ku"]).optional(),
  notifyPush: z.boolean().optional(),
  notifyEmail: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        locale: true,
        notifyPush: true,
        notifyEmail: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation failed", parsed.error.flatten());
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        locale: true,
        notifyPush: true,
        notifyEmail: true,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    return serverError(error);
  }
}
