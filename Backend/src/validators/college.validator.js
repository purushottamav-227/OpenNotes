import { z } from "zod";

const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Email domain is required.")
  .max(253, "Email domain is too long.")
  .regex(
    /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/,
    "Enter a valid domain, such as college.edu."
  );

export const createCollegeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "College name must contain at least 2 characters.")
      .max(200, "College name cannot exceed 200 characters."),

    domains: z.array(domainSchema).max(20).default([]),

    address: z
      .string()
      .trim()
      .max(500, "Address cannot exceed 500 characters.")
      .default(""),

    website: z
      .string()
      .trim()
      .max(500, "Website cannot exceed 500 characters.")
      .default("")
      .refine(
        (value) => {
          if (!value) return true;

          try {
            const url = new URL(value);
            return ["http:", "https:"].includes(url.protocol);
          } catch {
            return false;
          }
        },
        { message: "Website must be a valid HTTP or HTTPS URL." }
      )
  })
  .strict()
  .superRefine((data, ctx) => {
    const normalizedDomains = data.domains.map((domain) =>
      domain.toLowerCase()
    );

    if (new Set(normalizedDomains).size !== normalizedDomains.length) {
      ctx.addIssue({
        code: "custom",
        path: ["domains"],
        message: "Duplicate email domains are not allowed."
      });
    }
  });

export const collegeSearchSchema = z
  .object({
    q: z.string().trim().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(20).default(10)
  })
  .strict();

export const collegeIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "A valid college ID is required.");