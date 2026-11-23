import { describe, it, expect } from "vitest";

import {
  createNoteSchema,
  browseNoteSchema
} from "../src/validators/note.validator.js";

import {
  createPYQSchema,
  browsePYQSchema
} from "../src/validators/pyq.validator.js";

const academicStructureId = "507f1f77bcf86cd799439011";

describe("Note validation", () => {
  const validNote = {
    academicStructureId,
    stream: "Engineering",
    branch: "Computer Science",
    academicYear: "3rd Year",
    semester: "5",
    subjectName: "Database Management Systems",
    subjectCode: "CS501",
    moduleNumber: "1",
    title: "DBMS Module 1 Notes",
    description: "Study notes",
    hasMultipleParts: "false"
  };

  it("accepts valid note metadata", () => {
    const result = createNoteSchema.safeParse(validNote);

    expect(result.success).toBe(true);
    expect(result.data.semester).toBe(5);
    expect(result.data.moduleNumber).toBe(1);
  });

  it("rejects an invalid module number", () => {
    const result = createNoteSchema.safeParse({
      ...validNote,
      moduleNumber: "0"
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid academic structure ID", () => {
    const result = createNoteSchema.safeParse({
      ...validNote,
      academicStructureId: "invalid"
    });

    expect(result.success).toBe(false);
  });

  it("accepts valid browse filters", () => {
    expect(
      browseNoteSchema.safeParse({
        semester: "5",
        page: "1",
        limit: "20"
      }).success
    ).toBe(true);
  });
});

describe("PYQ validation", () => {
  const validPYQ = {
    academicStructureId,
    stream: "Engineering",
    branch: "Computer Science",
    academicYear: "3rd Year",
    semester: "5",
    subjectName: "Database Management Systems",
    subjectCode: "CS501",
    examType: "SEE",
    examinationYear: "2026",
    title: "DBMS SEE 2026",
    description: "Semester examination paper",
    hasMultipleParts: "false"
  };

  it("accepts a valid PYQ", () => {
    const result = createPYQSchema.safeParse(validPYQ);

    expect(result.success).toBe(true);
    expect(result.data.examinationYear).toBe(2026);
  });

  it("rejects an invalid examination type", () => {
    const result = createPYQSchema.safeParse({
      ...validPYQ,
      examType: "INTERNAL"
    });

    expect(result.success).toBe(false);
  });

  it("rejects an invalid examination year", () => {
    const result = createPYQSchema.safeParse({
      ...validPYQ,
      examinationYear: "1800"
    });

    expect(result.success).toBe(false);
  });

  it("accepts CIE examination type", () => {
    const result = createPYQSchema.safeParse({
      ...validPYQ,
      examType: "CIE"
    });

    expect(result.success).toBe(true);
  });
});