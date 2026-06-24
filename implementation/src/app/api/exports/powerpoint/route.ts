import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";
import {
  format,
  startOfWeek,
  getMonth,
} from "date-fns";
import { fr } from "date-fns/locale";
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

const MONTH_NAMES = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return unauthorized();
    if (!requireRoles(session.user.role, ["ADMIN"])) return forbidden();

    const schoolYearId = await getActiveSchoolYearId();
    const schoolYear = schoolYearId
      ? await prisma.schoolYear.findUnique({ where: { id: schoolYearId } })
      : null;

    const sessions = await prisma.courseSession.findMany({
      where: {
        status: "COMPLETED",
        courseSchedule: schoolYearId ? { schoolYearId } : undefined,
      },
      include: {
        courseSchedule: {
          include: {
            class: { include: { discipline: true } },
            teacher: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        attendances: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    const pptx = new PptxGenJS();
    pptx.author = "Mustafa Edu";
    pptx.title = "Rapport éducatif";

    const titleSlide = pptx.addSlide();
    titleSlide.addText("Mustafa - Rapport éducatif", {
      x: 0.5,
      y: 1.5,
      w: 9,
      h: 1,
      fontSize: 32,
      bold: true,
      color: "1a365d",
      align: "center",
    });
    titleSlide.addText(
      `Année scolaire: ${schoolYear?.name ?? "Non définie"}`,
      {
        x: 0.5,
        y: 2.8,
        w: 9,
        h: 0.6,
        fontSize: 20,
        color: "4a5568",
        align: "center",
      }
    );
    titleSlide.addText(`Généré le ${format(new Date(), "dd MMMM yyyy", { locale: fr })}`, {
      x: 0.5,
      y: 3.5,
      w: 9,
      h: 0.5,
      fontSize: 14,
      color: "718096",
      align: "center",
    });

    const courseStats = new Map<
      string,
      { className: string; weekly: Map<string, number>; monthly: Map<string, number> }
    >();

    for (const session of sessions) {
      const className = session.courseSchedule.class.name;
      const key = session.courseSchedule.classId;

      if (!courseStats.has(key)) {
        courseStats.set(key, {
          className,
          weekly: new Map(),
          monthly: new Map(),
        });
      }

      const stats = courseStats.get(key)!;
      const weekKey = format(
        startOfWeek(session.date, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const monthKey = format(session.date, "yyyy-MM");

      const presentCount = session.attendances.filter(
        (a) => a.status === "PRESENT" || a.status === "LATE"
      ).length;
      const totalCount = session.attendances.length;
      const rate = totalCount > 0 ? (presentCount / totalCount) * 100 : 0;

      stats.weekly.set(weekKey, (stats.weekly.get(weekKey) ?? 0) + rate);
      stats.monthly.set(monthKey, (stats.monthly.get(monthKey) ?? 0) + rate);
    }

    const attendanceSlide = pptx.addSlide();
    attendanceSlide.addText("Statistiques de présence", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "1a365d",
    });

    const headerFill = { color: "e2e8f0" };
    const cell = (text: string) => ({ text });
    const headerCell = (text: string) => ({
      text,
      options: { bold: true, fill: headerFill },
    });

    const attendanceRows = [
      [
        headerCell("Cours"),
        headerCell("Semaines"),
        headerCell("Mois"),
        headerCell("Taux moyen"),
      ],
    ] as PptxGenJS.TableRow[];

    Array.from(courseStats.values()).forEach((stats) => {
      const weeklyAvg =
        stats.weekly.size > 0
          ? Array.from(stats.weekly.values()).reduce((a, b) => a + b, 0) /
            stats.weekly.size
          : 0;
      const monthlyAvg =
        stats.monthly.size > 0
          ? Array.from(stats.monthly.values()).reduce((a, b) => a + b, 0) /
            stats.monthly.size
          : 0;
      const overallAvg = (weeklyAvg + monthlyAvg) / 2;

      attendanceRows.push([
        cell(stats.className),
        cell(stats.weekly.size.toString()),
        cell(stats.monthly.size.toString()),
        cell(`${overallAvg.toFixed(1)}%`),
      ]);
    });

    if (attendanceRows.length === 1) {
      attendanceRows.push([
        cell("Aucune donnée"),
        cell("-"),
        cell("-"),
        cell("-"),
      ]);
    }

    attendanceSlide.addTable(attendanceRows, {
      x: 0.5,
      y: 1.2,
      w: 9,
      fontSize: 11,
      border: { pt: 0.5, color: "cbd5e0" },
    });

    const studentHours = new Map<
      string,
      { name: string; hours: number; sessions: number }
    >();

    for (const session of sessions) {
      const duration = parseDurationHours(
        session.courseSchedule.startTime,
        session.courseSchedule.endTime
      );

      for (const attendance of session.attendances) {
        if (attendance.status !== "PRESENT" && attendance.status !== "LATE") {
          continue;
        }

        const studentId = attendance.student.id;
        const name = `${attendance.student.firstName} ${attendance.student.lastName}`;

        if (!studentHours.has(studentId)) {
          studentHours.set(studentId, { name, hours: 0, sessions: 0 });
        }

        const entry = studentHours.get(studentId)!;
        entry.hours += duration;
        entry.sessions += 1;
      }
    }

    const hoursSlide = pptx.addSlide();
    hoursSlide.addText("Heures par élève", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "1a365d",
    });

    const studentRows = [
      [
        headerCell("Élève"),
        headerCell("Sessions"),
        headerCell("Heures totales"),
      ],
    ] as PptxGenJS.TableRow[];

    Array.from(studentHours.values())
      .sort((a, b) => b.hours - a.hours)
      .forEach((entry) => {
        studentRows.push([
          cell(entry.name),
          cell(entry.sessions.toString()),
          cell(entry.hours.toFixed(1)),
        ]);
      });

    if (studentRows.length === 1) {
      studentRows.push([cell("Aucune donnée"), cell("-"), cell("-")]);
    }

    hoursSlide.addTable(studentRows, {
      x: 0.5,
      y: 1.2,
      w: 9,
      fontSize: 11,
      border: { pt: 0.5, color: "cbd5e0" },
    });

    const teacherMonthlyHours = new Map<
      string,
      { name: string; months: Map<number, number> }
    >();

    for (const session of sessions) {
      const teacher = session.courseSchedule.teacher;
      const teacherId = teacher.id;
      const name = `${teacher.firstName} ${teacher.lastName}`;
      const month = getMonth(session.date);
      const duration = parseDurationHours(
        session.courseSchedule.startTime,
        session.courseSchedule.endTime
      );

      if (!teacherMonthlyHours.has(teacherId)) {
        teacherMonthlyHours.set(teacherId, { name, months: new Map() });
      }

      const entry = teacherMonthlyHours.get(teacherId)!;
      entry.months.set(month, (entry.months.get(month) ?? 0) + duration);
    }

    const teacherSlide = pptx.addSlide();
    teacherSlide.addText("Heures par enseignant (par mois)", {
      x: 0.5,
      y: 0.3,
      w: 9,
      h: 0.6,
      fontSize: 24,
      bold: true,
      color: "1a365d",
    });

    const teacherRows = [
      [
        headerCell("Enseignant"),
        ...MONTH_NAMES.map((m) => headerCell(m)),
      ],
    ] as PptxGenJS.TableRow[];

    Array.from(teacherMonthlyHours.values()).forEach((entry) => {
      teacherRows.push([
        cell(entry.name),
        ...MONTH_NAMES.map((_, i) => cell((entry.months.get(i) ?? 0).toFixed(1))),
      ]);
    });

    if (teacherRows.length === 1) {
      teacherRows.push([
        cell("Aucune donnée"),
        ...MONTH_NAMES.map(() => cell("-")),
      ]);
    }

    teacherSlide.addTable(teacherRows, {
      x: 0.3,
      y: 1.2,
      w: 9.4,
      fontSize: 9,
      border: { pt: 0.5, color: "cbd5e0" },
    });

    const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer;
    const filename = `mustafa-report-${schoolYear?.name ?? "all"}-${format(new Date(), "yyyy-MM-dd")}.pptx`;

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
