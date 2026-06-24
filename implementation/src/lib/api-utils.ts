import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getSession() {
  return auth();
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function requireRoles(role: string, allowed: string[]) {
  return allowed.includes(role);
}

export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  return start1 < end2 && start2 < end1;
}

export function calculateLateMinutes(
  sessionDate: Date,
  startTime: string,
  arrivalTime: Date
): number {
  const [hours, minutes] = startTime.split(":").map(Number);
  const scheduledStart = new Date(sessionDate);
  scheduledStart.setHours(hours, minutes, 0, 0);
  const diffMs = arrivalTime.getTime() - scheduledStart.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / 60000);
}

export async function isRoomAvailable(
  roomId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  excludeScheduleId?: string
): Promise<boolean> {
  const existing = await prisma.courseSchedule.findMany({
    where: {
      roomId,
      dayOfWeek,
      active: true,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
    },
  });

  return !existing.some((schedule) =>
    timesOverlap(startTime, endTime, schedule.startTime, schedule.endTime)
  );
}

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const schedules = await prisma.courseSchedule.findMany({
    where: { teacherId, active: true },
    select: { classId: true },
  });
  return Array.from(new Set(schedules.map((s) => s.classId)));
}

export async function checkConsecutiveAbsences(studentId: string) {
  const recentAttendances = await prisma.attendance.findMany({
    where: { studentId },
    include: {
      courseSession: {
        select: { date: true },
      },
    },
    orderBy: { courseSession: { date: "desc" } },
    take: 3,
  });

  if (
    recentAttendances.length < 3 ||
    !recentAttendances.every((a) => a.status === "ABSENT")
  ) {
    return;
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { firstName: true, lastName: true, parentId: true },
  });

  if (!student) return;

  const recipientIds = [studentId];
  if (student.parentId) recipientIds.push(student.parentId);

  const message = `${student.firstName} ${student.lastName} a 3 absences consécutives.`;

  for (const userId of recipientIds) {
    const existing = await prisma.notification.findFirst({
      where: {
        userId,
        type: "ABSENCE_ALERT",
        message,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    if (!existing) {
      await prisma.notification.create({
        data: {
          userId,
          type: "ABSENCE_ALERT",
          title: "Alerte d'absence",
          message,
          channel: "PUSH",
        },
      });
    }
  }
}

export async function getActiveSchoolYearId(): Promise<string | null> {
  const schoolYear = await prisma.schoolYear.findFirst({
    where: { active: true },
    select: { id: true },
  });
  return schoolYear?.id ?? null;
}
