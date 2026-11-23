
import { z } from "zod";

const objectId = z.string().regex(
  /^[a-f\d]{24}$/i,
  "A valid ID is required."
);

const yearSchema = z.enum([
  "1st Year",
  "2nd Year",
  "3rd Year",
  "4th Year",
  "5th Year"
]);

export const createNoteSchema = z.object({
  academicStructureId: objectId,
  stream: z.string().trim().min(1).max(100),
  branch: z.string().trim().min(1).max(150),
  academicYear: yearSchema,
  semester: z.coerce.number().int().min(1).max(12),
  subjectName: z.string().trim().min(1).max(150),
  subjectCode: z.string().trim().toUpperCase().min(1).max(30),
  moduleNumber: z.coerce.number().int().min(1).max(50),
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).default(""),
  hasMultipleParts: z.preprocess(
    (value) => value === true || value === "true",
    z.boolean()
  )
}).strict();

export const resourceIdSchema = objectId;

export const browseNoteSchema = z.object({
  collegeId: objectId.optional(),
  academicStructureId: objectId.optional(),
  stream: z.string().trim().max(100).optional(),
  branch: z.string().trim().max(150).optional(),
  academicYear: yearSchema.optional(),
  semester: z.coerce.number().int().min(1).max(12).optional(),
  subjectName: z.string().trim().max(150).optional(),
  subjectCode: z.string().trim().toUpperCase().max(30).optional(),
  moduleNumber: z.coerce.number().int().min(1).max(50).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20)
}).strict();
