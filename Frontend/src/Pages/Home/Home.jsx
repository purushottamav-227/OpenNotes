import { useEffect, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  FileText,
  Search,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { resourceApi } from "../../services/api";
import useFacets from "../../hooks/useFacets";
import useDebouncedValue from "../../hooks/useDebouncedValue";

import "./Home.css";

function Home() {
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebouncedValue(searchTerm.trim());
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  const [notes, setNotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [facets, addFacets] = useFacets();

  // Streams come from the real notes returned by the backend.
  const departments = ["All", ...(facets.stream || [])];

  useEffect(() => {
    let cancelled = false;

    resourceApi
      .notes({
        limit: 9,
        q: debouncedSearch || undefined,
        stream: selectedDepartment === "All" ? undefined : selectedDepartment,
      })
      .then((result) => {
        if (cancelled) return;

        const resources = Array.isArray(result?.resources)
          ? result.resources
          : [];

        setNotes(resources);
        setTotal(result?.pagination?.total ?? resources.length);
        addFacets(resources, ["stream"]);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setNotes([]);
        setTotal(0);
        setError(err.message || "Unable to load notes.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedDepartment, addFacets]);

  const handleBrowseNotes = () => {
    navigate("/browse-notes");
  };

  return (
    <div className="home-page">

      {/* =================================
          HERO SECTION
      ================================= */}

      <section className="home-hero">

        <div className="hero-content">

          <div className="hero-badge">
            <Sparkles size={16} />

            <span>
              YOUR ACADEMIC KNOWLEDGE HUB
            </span>
          </div>

          <h1>
            Every semester,
            <span> every subject.</span>
          </h1>

          <p className="hero-description">
            Discover notes and previous-year question papers
            shared by students and teachers across
            different streams.
          </p>

          {/* SEARCH */}

          <div className="home-search">

            <Search size={21} />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(event.target.value)
              }
              placeholder="Search notes, subjects or codes..."
              aria-label="Search notes, subjects or codes"
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search"
                onClick={() => setSearchTerm("")}
              >
                Clear
              </button>
            )}

          </div>

          <div className="hero-actions">

            <button
              type="button"
              className="primary-button"
              onClick={handleBrowseNotes}
            >
              Browse Notes

              <ArrowRight size={18} />
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => navigate("/browse-pyqs")}
            >
              Browse PYQs
            </button>

          </div>

        </div>

        <div className="hero-decoration">

          <div className="hero-circle hero-circle-one" />
          <div className="hero-circle hero-circle-two" />

          <div className="hero-book-icon">
            <BookOpen size={90} />
          </div>

        </div>

      </section>


      {/* =================================
          STREAM FILTER
      ================================= */}

      <section className="home-section">

        <div className="section-heading">

          <div>
            <p className="section-label">
              EXPLORE
            </p>

            <h2>
              Browse by stream
            </h2>
          </div>

          <button
            type="button"
            className="view-all-button"
            onClick={handleBrowseNotes}
          >
            View all
            <ArrowRight size={17} />
          </button>

        </div>

        <div className="department-list">

          {departments.map((department) => (
            <button
              key={department}
              type="button"
              className={`department-button ${
                selectedDepartment === department
                  ? "department-button-active"
                  : ""
              }`}
              onClick={() =>
                setSelectedDepartment(department)
              }
            >
              {department}
            </button>
          ))}

        </div>

      </section>


      {/* =================================
          BOOKS
      ================================= */}

      <section className="home-section books-section">

        <div className="section-heading">

          <div>
            <p className="section-label">
              LATEST APPROVED
            </p>

            <h2>
              Recently added notes
            </h2>
          </div>

          <span className="book-count">
            {total} {total === 1 ? "note" : "notes"}
          </span>

        </div>

        {error && (
          <div className="no-books" role="alert">
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="no-books">
            <p>Loading notes...</p>
          </div>
        ) : notes.length > 0 ? (

          <div className="books-grid">

            {notes.map((note) => (
              <article className="book-card" key={note._id}>
                <div
                  className="book-cover-wrapper"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    color: "var(--color-primary, #d6ad55)",
                  }}
                >
                  <FileText size={56} aria-hidden="true" />

                  <span className="book-department">{note.stream}</span>
                </div>

                <div className="book-card-content">
                  <p className="book-category">
                    {note.subjectName}
                    {note.subjectCode ? ` · ${note.subjectCode}` : ""}
                  </p>

                  <h3 className="book-title">{note.title}</h3>

                  <p className="book-description">
                    {note.description ||
                      `${note.branch} · Semester ${note.semester}`}
                  </p>

                  <div className="book-author">
                    <span>{note.uploadedBy?.name || "OpenNotes user"}</span>
                  </div>

                  <div className="book-footer">
                    <span>
                      <BookOpen size={15} />
                      {note.academicYear}
                    </span>

                    <button
                      type="button"
                      onClick={() => navigate("/browse-notes")}
                    >
                      Browse notes
                    </button>
                  </div>
                </div>
              </article>
            ))}

          </div>

        ) : (

          <div className="no-books">

            <BookOpen size={40} />

            <h3>
              No notes found
            </h3>

            <p>
              No approved notes match your search yet.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSelectedDepartment("All");
              }}
            >
              Clear filters
            </button>

          </div>

        )}

      </section>

    </div>
  );
}

export default Home;