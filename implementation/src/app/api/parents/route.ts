import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { forbidden, serverError, unauthorized } from "@/lib/api-utils";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (session.user.role !== "ADMIN") return forbidden();

    const parents = await prisma.user.findMany({
      where: { role: "PARENT", active: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    return NextResponse.json(parents);
  } catch (error) {
    return serverError(error);
  }
}
