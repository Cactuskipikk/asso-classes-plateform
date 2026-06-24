import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { badRequest, serverError } from "@/lib/api-utils";
import { registerParentSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerParentSchema.safeParse(body);

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

    const parent = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: "PARENT",
        gdprConsent: true,
        gdprConsentAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return NextResponse.json(parent, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
