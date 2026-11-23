import College from "../models/College.js";

export async function searchColleges(query, limit = 10) {
  const searchTerm = query.trim();

  if (!searchTerm) {
    return [];
  }

  return College.find({
    isActive: true,
    verificationStatus: "verified",
    name: {
      $regex: escapeRegex(searchTerm),
      $options: "i"
    }
  })
    .select("name address website")
    .sort({ name: 1 })
    .limit(limit)
    .lean();
}

export async function getCollegeById(collegeId) {
  return College.findOne({
    _id: collegeId,
    isActive: true,
    verificationStatus: "verified"
  })
    .select("name address website")
    .lean();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
