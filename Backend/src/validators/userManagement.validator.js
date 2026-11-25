import { z } from "zod";

const pagination = {
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
};

const searchText = z.string().trim().max(100).optional();

export const listUsersQuerySchema = z
  .object({
    role: z.enum(["student", "teacher"]).optional(),
    status: z.enum(["active", "blocked"]).optional(),
    q: searchText,
    ...pagination
  })
  .strict();

export const listTeachersQuerySchema = z
  .object({
    status: z.enum(["pending", "approved", "rejected"]).default("pending"),
    q: searchText,
    ...pagination
  })
  .strict();

export const blockBodySchema = z
  .object({
    reason: z.string().trim().max(500).optional()
  })
  .strict();

export const rejectTeacherBodySchema = z
  .object({
    reason: z
      .string()
      .trim()
      .min(3, "Enter a reason of at least 3 characters.")
      .max(500, "The reason cannot exceed 500 characters.")
  })
  .strict();

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Invalid account ID.");
