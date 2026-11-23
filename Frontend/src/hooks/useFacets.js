import { useCallback, useState } from "react";

function sortValues(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

// Remembers every filter value seen so far. Dropdown options therefore
// stay available after a filter narrows the result list.
export default function useFacets() {
  const [facets, setFacets] = useState({});

  const addFacets = useCallback((items, keys) => {
    setFacets((previous) => {
      const next = { ...previous };

      keys.forEach((key) => {
        const values = new Set(previous[key] || []);

        items.forEach((item) => {
          const value = item[key];

          if (value !== undefined && value !== null && value !== "") {
            values.add(value);
          }
        });

        next[key] = [...values].sort(sortValues);
      });

      return next;
    });
  }, []);

  return [facets, addFacets];
}