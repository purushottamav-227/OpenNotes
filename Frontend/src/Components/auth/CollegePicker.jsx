import { useEffect, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { collegeApi } from "../../services/api";
import "./CollegePicker.css";

/**
 * Searchable college selector backed by GET /colleges/search.
 * `value` is the selected college object ({ _id, name }) or null.
 */
export default function CollegePicker({ value, onChange, disabled = false }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) return undefined;

    let cancelled = false;

    // Debounce so we do not call the API on every keystroke.
    const timer = setTimeout(() => {
      setLoading(true);

      collegeApi
        .search(term, 8)
        .then((result) => {
          if (cancelled) return;
          setResults(Array.isArray(result?.data) ? result.data : []);
          setError("");
        })
        .catch((err) => {
          if (cancelled) return;
          setResults([]);
          setError(err.message || "Unable to search colleges.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Results are only shown for a long-enough query, so a cleared search
  // never displays stale matches.
  const searching = query.trim().length >= 2;

  if (value) {
    return (
      <div className="college-picker-selected">
        <Check size={16} aria-hidden="true" />
        <span>{value.name}</span>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          disabled={disabled}
          aria-label="Remove selected college"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="college-picker">
      <div className="college-picker-input">
        <Search size={16} aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your college"
          disabled={disabled}
          aria-label="Search your college"
          autoComplete="off"
        />
      </div>

      {searching && loading && (
        <p className="college-picker-note">Searching...</p>
      )}

      {searching && error && (
        <p className="college-picker-note college-picker-error" role="alert">
          {error}
        </p>
      )}

      {searching && !loading && !error && results.length === 0 && (
        <p className="college-picker-note">No verified college found.</p>
      )}

      {searching && results.length > 0 && (
        <ul className="college-picker-results">
          {results.map((college) => (
            <li key={college._id}>
              <button type="button" onClick={() => onChange(college)}>
                <strong>{college.name}</strong>
                {college.address && <small>{college.address}</small>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}