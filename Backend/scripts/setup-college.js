/**
 * One-time setup helper for a development / first deployment.
 *
 * The API has no endpoints for creating colleges, academic programmes or
 * admin accounts yet, so uploads cannot work until these exist in MongoDB.
 *
 * Usage (run from the Backend folder):
 *
 *   node scripts/setup-college.js \
 *     --college "BMS College of Engineering" \
 *     --domain bmsce.ac.in \
 *     --structures scripts/example-structures.json \
 *     --link-user you@bmsce.ac.in \
 *     --make-admin admin@bmsce.ac.in
 *
 * Every option is optional, except that --domain/--structures/--link-user
 * need --college. The script is safe to run again (it updates, not
 * duplicates).
 */
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";

import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import College from "../src/models/College.js";
import AcademicStructure from "../src/models/AcademicStructure.js";
import User from "../src/models/User.js";

const YEARS = ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"];

function parseArgs(argv) {
  const args = { domain: [] };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];

    if (!key.startsWith("--")) continue;

    const value = argv[i + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`Missing value for ${key}`);
    }

    i += 1;

    if (key === "--domain") args.domain.push(value.toLowerCase().trim());
    else args[key.slice(2)] = value.trim();
  }

  return args;
}

function loadStructures(file) {
  const raw = JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));

  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("The structures file must be a non-empty JSON array.");
  }

  raw.forEach((item, index) => {
    const label = `structures[${index}]`;

    for (const field of ["stream", "branch", "programName", "programCode"]) {
      if (!item[field] || typeof item[field] !== "string") {
        throw new Error(`${label}.${field} is required.`);
      }
    }

    if (
      !Array.isArray(item.academicYears) ||
      item.academicYears.length === 0 ||
      item.academicYears.some((year) => !YEARS.includes(year))
    ) {
      throw new Error(`${label}.academicYears must use: ${YEARS.join(", ")}`);
    }

    if (
      !Array.isArray(item.semesters) ||
      item.semesters.length === 0 ||
      item.semesters.some((s) => !Number.isInteger(s) || s < 1 || s > 12)
    ) {
      throw new Error(`${label}.semesters must be integers from 1 to 12.`);
    }

    if (
      !Array.isArray(item.subjects) ||
      item.subjects.some(
        (subject) =>
          !subject.subjectName ||
          !subject.subjectCode ||
          !item.semesters.includes(subject.semester)
      )
    ) {
      throw new Error(
        `${label}.subjects need subjectName, subjectCode and a semester listed in "semesters".`
      );
    }
  });

  return raw;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (
    (args.domain.length || args.structures || args["link-user"]) &&
    !args.college
  ) {
    throw new Error("--college is required with --domain, --structures or --link-user.");
  }

  // Validate input before touching the database.
  const structures = args.structures ? loadStructures(args.structures) : [];

  if (!args.college && !args["make-admin"]) {
    throw new Error("Nothing to do. See the usage notes at the top of this file.");
  }

  await connectDatabase();

  let college = null;

  if (args.college) {
    const nameKey = args.college.toLowerCase();

    college = await College.findOne({ nameKey });

    if (!college) {
      college = new College({ name: args.college });
    }

    const domains = new Set([...(college.domains || []), ...args.domain]);

    college.domains = [...domains];
    college.verificationStatus = "verified";
    college.isActive = true;

    await college.save();

    console.log(`College ready: ${college.name} (${college._id})`);
    console.log(`  email domains: ${college.domains.join(", ") || "(none)"}`);
  }

  for (const item of structures) {
    const doc = await AcademicStructure.findOneAndUpdate(
      { collegeId: college._id, programCode: item.programCode.toUpperCase() },
      {
        $set: {
          stream: item.stream,
          branch: item.branch,
          programName: item.programName,
          academicYears: item.academicYears,
          semesters: item.semesters,
          subjects: item.subjects,
          isActive: true
        }
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    console.log(`Programme ready: ${doc.programName} / ${doc.branch} (${doc.subjects.length} subjects)`);
  }

  if (args["link-user"]) {
    const user = await User.findOne({ email: args["link-user"].toLowerCase() });

    if (!user) throw new Error(`No user found with email ${args["link-user"]}`);

    user.collegeId = college._id;
    user.collegeAffiliationStatus = "verified";

    await user.save();

    console.log(`Linked and verified: ${user.email} -> ${college.name}`);
  }

  if (args["make-admin"]) {
    const user = await User.findOne({ email: args["make-admin"].toLowerCase() });

    if (!user) throw new Error(`No user found with email ${args["make-admin"]}`);

    user.role = "admin";
    // Revoke existing sessions so the new role takes effect on next sign-in.
    user.sessionVersion = (user.sessionVersion || 0) + 1;

    await user.save();

    console.log(`Admin role granted: ${user.email} (sign in again)`);
  }
}

main()
  .then(async () => {
    await disconnectDatabase();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(`Setup failed: ${error.message}`);
    if (mongoose.connection.readyState !== 0) await disconnectDatabase();
    process.exit(1);
  });