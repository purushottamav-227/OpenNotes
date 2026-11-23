import { useEffect, useState } from "react";
import { resourceApi } from "../services/api";

const PAGE_SIZE = 50;
const MAX_PAGES = 10;

const emptyStats = {
  notes: 0,
  pyqs: 0,
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
};

// Counts the signed-in user's own uploads from GET /resources/mine.
export default function useMyUploadStats() {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const all = [];
        let page = 1;
        let totalPages = 1;

        do {
          const result = await resourceApi.myUploads({
            type: "all",
            page,
            limit: PAGE_SIZE,
          });

          all.push(...(result?.resources || []));
          totalPages = result?.pagination?.totalPages || 1;
          page += 1;
        } while (page <= totalPages && page <= MAX_PAGES);

        if (cancelled) return;

        const count = (predicate) => all.filter(predicate).length;

        setStats({
          notes: count((item) => item.resourceType === "notes"),
          pyqs: count((item) => item.resourceType === "pyqs"),
          total: all.length,
          pending: count((item) => item.approvalStatus === "pending"),
          approved: count((item) => item.approvalStatus === "approved"),
          rejected: count((item) => item.approvalStatus === "rejected"),
        });
        setError("");
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to load your uploads.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { stats, loading, error };
}