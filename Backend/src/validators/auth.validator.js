import { z } from "zod";

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100, "Name cannot exceed 100 characters."),

    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254, "Email cannot exceed 254 characters."),

    password: z
      .string()
      .min(12, "Password must contain at least 12 characters.")
      .max(128, "Password cannot exceed 128 characters."),

    collegeId: z
      .string()
      .regex(/^[a-f\d]{24}$/i, "Enter a valid college ID.")
      .optional(),

    // Public registration can only create students or teachers.
    // Admin accounts can never be created here.
    role: z.enum(["student", "teacher"]).optional()
  })
  .strict()
  .refine(
    (data) => data.role !== "teacher" || Boolean(data.collegeId),
    {
      path: ["collegeId"],
      message: "Select your college to register as a teacher."
    }
  );

export const loginSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address.")
      .max(254, "Email cannot exceed 254 characters."),

    password: z
      .string()
      .min(1, "Password is required.")
      .max(128, "Password cannot exceed 128 characters.")
  })
  .strict();


export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must contain at least 2 characters.")
      .max(100, "Name cannot exceed 100 characters.")
      .optional(),

    // null removes the college (students only; enforced in the service).
    collegeId: z
      .union([
        z.string().regex(/^[a-f\d]{24}$/i, "Enter a valid college ID."),
        z.null()
      ])
      .optional()
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "Provide at least one field to update."
  });
