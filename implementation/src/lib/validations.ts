import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one digit")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Invalid time format (HH:mm)");

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerParentSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().min(1, "Phone number is required").max(30),
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "GDPR consent is required" }),
  }),
});

export const registerChildSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  gender: z.enum(["M", "F"], {
    errorMap: () => ({ message: "Gender must be M or F" }),
  }),
  birthDate: z.coerce.date({
    errorMap: () => ({ message: "Invalid birth date" }),
  }),
});

export const classSchema = z
  .object({
    name: z.string().min(1, "Class name is required").max(200),
    organizationType: z.enum(["BY_SUBJECT", "BY_AGE"], {
      errorMap: () => ({
        message: "Organization type must be BY_SUBJECT or BY_AGE",
      }),
    }),
    ageMin: z.number().int().min(0).max(100).optional(),
    ageMax: z.number().int().min(0).max(100).optional(),
    disciplineId: z.string().min(1, "Discipline is required"),
  })
  .refine(
    (data) => {
      if (data.organizationType === "BY_AGE") {
        return (
          data.ageMin !== undefined &&
          data.ageMax !== undefined &&
          data.ageMin <= data.ageMax
        );
      }
      return true;
    },
    {
      message:
        "ageMin and ageMax are required for BY_AGE classes, and ageMin must be less than or equal to ageMax",
      path: ["ageMin"],
    }
  );

export const courseScheduleSchema = z
  .object({
    classId: z.string().min(1, "Class is required"),
    teacherId: z.string().min(1, "Teacher is required"),
    roomId: z.string().min(1, "Room is required"),
    dayOfWeek: z
      .number()
      .int()
      .min(0, "Day of week must be between 0 and 6")
      .max(6, "Day of week must be between 0 and 6"),
    startTime: timeSchema,
    endTime: timeSchema,
    isCollective: z.boolean(),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });

export const attendanceSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  status: z.enum(["PRESENT", "ABSENT", "LATE"], {
    errorMap: () => ({
      message: "Status must be PRESENT, ABSENT, or LATE",
    }),
  }),
  arrivalTime: z.coerce.date().optional(),
});

export const paymentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  type: z.enum(["NORMAL", "REDUCED", "FREE"], {
    errorMap: () => ({
      message: "Payment type must be NORMAL, REDUCED, or FREE",
    }),
  }),
  date: z.coerce.date({
    errorMap: () => ({ message: "Invalid payment date" }),
  }),
  notes: z.string().max(1000).optional(),
});

export const progressItemSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  title: z.string().min(1, "Title is required").max(500),
  level: z.enum(["ACQUIRED", "IN_PROGRESS", "LEARNING"], {
    errorMap: () => ({
      message: "Level must be ACQUIRED, IN_PROGRESS, or LEARNING",
    }),
  }),
  order: z.number().int().min(0, "Order must be zero or greater"),
});

export const boardMeetingSchema = z.object({
  date: z.coerce.date({
    errorMap: () => ({ message: "Invalid meeting date" }),
  }),
  notes: z.string().max(5000).optional(),
});

export const boardDecisionSchema = z.object({
  description: z
    .string()
    .min(1, "Description is required")
    .max(5000, "Description is too long"),
});

export const roomSchema = z.object({
  name: z.string().min(1, "Room name is required").max(200),
  capacity: z.number().int().positive("Capacity must be greater than zero").optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterParentInput = z.infer<typeof registerParentSchema>;
export type RegisterChildInput = z.infer<typeof registerChildSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type CourseScheduleInput = z.infer<typeof courseScheduleSchema>;
export type AttendanceInput = z.infer<typeof attendanceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ProgressItemInput = z.infer<typeof progressItemSchema>;
export type BoardMeetingInput = z.infer<typeof boardMeetingSchema>;
export type BoardDecisionInput = z.infer<typeof boardDecisionSchema>;
export type RoomInput = z.infer<typeof roomSchema>;

export const teacherSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(30).optional(),
  teacherType: z.enum(["TITULAR", "SUBSTITUTE"], {
    errorMap: () => ({
      message: "Teacher type must be TITULAR or SUBSTITUTE",
    }),
  }),
});

export const updateTeacherSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: passwordSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  teacherType: z.enum(["TITULAR", "SUBSTITUTE"]).optional(),
  active: z.boolean().optional(),
});

export const createStudentSchema = registerChildSchema.extend({
  classId: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateStudentSchema = z.object({
  email: z.string().email("Invalid email address").optional(),
  password: passwordSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  classId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  gender: z.enum(["M", "F"]).optional(),
  birthDate: z.coerce.date().optional(),
  active: z.boolean().optional(),
});

export const createClassSchema = z
  .object({
    name: z.string().min(1, "Class name is required").max(200),
    organizationType: z.enum(["BY_SUBJECT", "BY_AGE"], {
      errorMap: () => ({
        message: "Organization type must be BY_SUBJECT or BY_AGE",
      }),
    }),
    ageMin: z.number().int().min(0).max(100).optional(),
    ageMax: z.number().int().min(0).max(100).optional(),
    disciplineId: z.string().min(1, "Discipline is required"),
    schoolYearId: z.string().min(1, "School year is required"),
  })
  .refine(
    (data) => {
      if (data.organizationType === "BY_AGE") {
        return (
          data.ageMin !== undefined &&
          data.ageMax !== undefined &&
          data.ageMin <= data.ageMax
        );
      }
      return true;
    },
    {
      message:
        "ageMin and ageMax are required for BY_AGE classes, and ageMin must be less than or equal to ageMax",
      path: ["ageMin"],
    }
  );

export const updateClassSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  organizationType: z.enum(["BY_SUBJECT", "BY_AGE"]).optional(),
  ageMin: z.number().int().min(0).max(100).nullable().optional(),
  ageMax: z.number().int().min(0).max(100).nullable().optional(),
  disciplineId: z.string().min(1).optional(),
  schoolYearId: z.string().min(1).optional(),
  active: z.boolean().optional(),
});

export const disciplineSchema = z.object({
  name: z.string().min(1, "Discipline name is required").max(200),
});

export const schoolYearSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(50),
    startDate: z.coerce.date({
      errorMap: () => ({ message: "Invalid start date" }),
    }),
    endDate: z.coerce.date({
      errorMap: () => ({ message: "Invalid end date" }),
    }),
    active: z.boolean().optional(),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Start date must be before end date",
    path: ["endDate"],
  });

export const updateSchoolYearSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  active: z.boolean().optional(),
});

export const courseSessionCreateSchema = z.object({
  date: z.coerce.date({
    errorMap: () => ({ message: "Invalid session date" }),
  }),
});

export const updateCourseSessionSchema = z.object({
  status: z
    .enum(["SCHEDULED", "COMPLETED", "CANCELLED"], {
      errorMap: () => ({
        message: "Status must be SCHEDULED, COMPLETED, or CANCELLED",
      }),
    })
    .optional(),
  cancelReason: z.string().max(1000).nullable().optional(),
  content: z.string().max(5000).nullable().optional(),
  homework: z.string().max(5000).nullable().optional(),
  substituteId: z.string().nullable().optional(),
});

export const recordAttendanceBatchSchema = z.object({
  courseSessionId: z.string().min(1, "Course session is required"),
  attendances: z.array(attendanceSchema).min(1, "At least one attendance is required"),
});

export const updateBoardDecisionSchema = z.object({
  applied: z.boolean().nullable().optional(),
  notAppliedReason: z.string().max(5000).nullable().optional(),
  reviewedAt: z.coerce.date().nullable().optional(),
});

export const updateProgressItemSchema = z.object({
  level: z
    .enum(["ACQUIRED", "IN_PROGRESS", "LEARNING"], {
      errorMap: () => ({
        message: "Level must be ACQUIRED, IN_PROGRESS, or LEARNING",
      }),
    })
    .optional(),
  order: z.number().int().min(0).optional(),
  validatedAt: z.coerce.date().nullable().optional(),
});

export const markNotificationsReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, "At least one notification id is required"),
});

export const updateBoardMeetingSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  date: z.coerce.date().optional(),
});

export type TeacherInput = z.infer<typeof teacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type DisciplineInput = z.infer<typeof disciplineSchema>;
export type SchoolYearInput = z.infer<typeof schoolYearSchema>;
