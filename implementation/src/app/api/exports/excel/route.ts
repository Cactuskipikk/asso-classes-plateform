import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  forbidden,
  getActiveSchoolYearId,
  requireRoles,
  serverError,
  unauthorized,
} from "@/lib/api-utils";

function parseDurationHours(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH, endM] = endTime.split(":").map(Number);
  return (endH * 60 + endM - (startH * 60 + startM)) / 60;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const schoolYearId = await getActiveSchoolYearId();
    const schoolYear = schoolYearId
      ? await prisma.schoolYear.findUnique({ where: { id: schoolYearId } })
      : null;

    const students = await prisma.user.findMany({
      where: { role: "STUDENT", active: true },
      include: {
        parent: {
          select: { firstName: true, lastName: true, email: true, phone: true },
        },
        class: {
          include: { discipline: true },
        },
        payments: {
          where: schoolYearId ? { schoolYearId } : undefined,
          orderBy: { date: "asc" },
        },
        attendances: {
          include: {
            courseSession: {
              include: {
                courseSchedule: {
                  select: {
                    startTime: true,
                    endTime: true,
                    class: { select: { name: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        progressItems: {
          where: schoolYearId ? { schoolYearId } : undefined,
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Mustafa Edu";
    workbook.created = new Date();

    const studentsSheet = workbook.addWorksheet("Students");
    studentsSheet.columns = [
      { header: "ID", key: "id", width: 28 },
      { header: "Email", key: "email", width: 30 },
      { header: "First Name", key: "firstName", width: 18 },
      { header: "Last Name", key: "lastName", width: 18 },
      { header: "Gender", key: "gender", width: 10 },
      { header: "Birth Date", key: "birthDate", width: 14 },
      { header: "Class", key: "className", width: 25 },
      { header: "Discipline", key: "discipline", width: 25 },
      { header: "Parent Name", key: "parentName", width: 25 },
      { header: "Parent Email", key: "parentEmail", width: 30 },
      { header: "Parent Phone", key: "parentPhone", width: 18 },
      { header: "Active", key: "active", width: 10 },
    ];
    studentsSheet.getRow(1).font = { bold: true };

    for (const student of students) {
      studentsSheet.addRow({
        id: student.id,
        email: student.email,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender ?? "",
        birthDate: student.birthDate
          ? format(student.birthDate, "yyyy-MM-dd")
          : "",
        className: student.class?.name ?? "",
        discipline: student.class?.discipline.name ?? "",
        parentName: student.parent
          ? `${student.parent.firstName} ${student.parent.lastName}`
          : "",
        parentEmail: student.parent?.email ?? "",
        parentPhone: student.parent?.phone ?? "",
        active: student.active ? "Yes" : "No",
      });
    }

    const attendanceSheet = workbook.addWorksheet("Attendance");
    attendanceSheet.columns = [
      { header: "Student", key: "student", width: 25 },
      { header: "Class", key: "className", width: 25 },
      { header: "Session Date", key: "sessionDate", width: 16 },
      { header: "Status", key: "status", width: 12 },
      { header: "Arrival Time", key: "arrivalTime", width: 18 },
      { header: "Late Minutes", key: "lateMinutes", width: 14 },
      { header: "Duration (h)", key: "duration", width: 12 },
    ];
    attendanceSheet.getRow(1).font = { bold: true };

    for (const student of students) {
      for (const attendance of student.attendances) {
        const schedule = attendance.courseSession.courseSchedule;
        const duration =
          attendance.status === "PRESENT" || attendance.status === "LATE"
            ? parseDurationHours(schedule.startTime, schedule.endTime)
            : 0;

        attendanceSheet.addRow({
          student: `${student.firstName} ${student.lastName}`,
          className: schedule.class.name,
          sessionDate: format(attendance.courseSession.date, "yyyy-MM-dd"),
          status: attendance.status,
          arrivalTime: attendance.arrivalTime
            ? format(attendance.arrivalTime, "HH:mm")
            : "",
          lateMinutes: attendance.lateMinutes,
          duration: duration.toFixed(2),
        });
      }
    }

    const paymentsSheet = workbook.addWorksheet("Payments");
    paymentsSheet.columns = [
      { header: "Student", key: "student", width: 25 },
      { header: "Amount", key: "amount", width: 12 },
      { header: "Type", key: "type", width: 12 },
      { header: "Date", key: "date", width: 14 },
      { header: "Notes", key: "notes", width: 40 },
    ];
    paymentsSheet.getRow(1).font = { bold: true };

    for (const student of students) {
      for (const payment of student.payments) {
        paymentsSheet.addRow({
          student: `${student.firstName} ${student.lastName}`,
          amount: payment.amount,
          type: payment.type,
          date: format(payment.date, "yyyy-MM-dd"),
          notes: payment.notes ?? "",
        });
      }
    }

    const progressSheet = workbook.addWorksheet("Progress");
    progressSheet.columns = [
      { header: "Student", key: "student", width: 25 },
      { header: "Title", key: "title", width: 40 },
      { header: "Level", key: "level", width: 15 },
      { header: "Order", key: "order", width: 10 },
      { header: "Validated At", key: "validatedAt", width: 16 },
    ];
    progressSheet.getRow(1).font = { bold: true };

    for (const student of students) {
      for (const item of student.progressItems) {
        progressSheet.addRow({
          student: `${student.firstName} ${student.lastName}`,
          title: item.title,
          level: item.level,
          order: item.order,
          validatedAt: item.validatedAt
            ? format(item.validatedAt, "yyyy-MM-dd")
            : "",
        });
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `mustafa-export-${schoolYear?.name ?? "all"}-${format(new Date(), "yyyy-MM-dd")}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
