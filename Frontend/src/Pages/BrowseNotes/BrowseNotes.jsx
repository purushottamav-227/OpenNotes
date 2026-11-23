import { useEffect, useState } from "react";
import {
  BookOpen,
  FileText,
  Search,
  Download,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { resourceApi } from "../../services/api";
import useFacets from "../../hooks/useFacets";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../Components/common/Pagination";
import "./BrowseNotes.css";

const PAGE_SIZE = 12;
const FACET_KEYS = [
  "stream",
  "branch",
  "academicYear",
  "semester",
  "subjectName",
];

function BrowseNotes() {
  const [notes, setNotes] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const searchTerm = useDebouncedValue(searchInput.trim());
  const [selectedStream, setSelectedStream] = useState("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });

  const [facets, addFacets] = useFacets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    resourceApi
      .notes({
        page,
        limit: PAGE_SIZE,
        q: searchTerm || undefined,
        stream: selectedStream || undefined,
        branch: selectedBranch || undefined,
        academicYear: selectedYear || undefined,
        semester: selectedSemester || undefined,
        subjectName: selectedSubject || undefined,
      })
      .then((result) => {
        if (cancelled) return;

        const resources = Array.isArray(result?.resources)
          ? result.resources
          : [];

        setNotes(resources);
        setPagination({
          total: result?.pagination?.total ?? resources.length,
          totalPages: result?.pagination?.totalPages || 1,
        });
        addFacets(resources, FACET_KEYS);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to load notes.");
          setNotes([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    page,
    searchTerm,
    selectedStream,
    selectedBranch,
    selectedYear,
    selectedSemester,
    selectedSubject,
    refreshKey,
    addFacets,
  ]);

  const streams = facets.stream || [];
  const branches = facets.branch || [];
  const years = facets.academicYear || [];
  const semesters = facets.semester || [];
  const subjects = facets.subjectName || [];
  const filteredNotes = notes;

  function updateFilter(setter, value) {
    setLoading(true);
    setPage(1);
    setter(value);
  }

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearFilters() {
    setLoading(true);
    setPage(1);
    setSearchInput("");
    setSelectedStream("");
    setSelectedBranch("");
    setSelectedYear("");
    setSelectedSemester("");
    setSelectedSubject("");
  }

  function refreshNotes() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  async function handleDownload(note, part) {
    const key = `${note._id}-${part._id}`;

    try {
      setDownloading(key);
      setError("");

      const result = await resourceApi.download(
        "notes",
        note._id,
        part._id
      );

      const url = result?.data?.url;

      if (!url) {
        throw new Error("Download link was not returned.");
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to download this note.");
    } finally {
      setDownloading("");
    }
  }

  return (
    <main className="browse-notes-page">
      <header className="browse-notes-header">
        <div className="section-label">BROWSE NOTES</div>

        <h1>
          Find the notes <span>you need.</span>
        </h1>

        <p className="browse-notes-description">
          Explore approved notes organized by stream, department,
          academic year, semester and subject.
        </p>

        <div className="browse-notes-header-icon">
          <BookOpen size={30} />
        </div>
      </header>

      <div className="browse-search-wrapper">
        <Search className="browse-search-icon" size={21} />
        <input
          type="search"
          className="browse-search-input"
          placeholder="Search notes, subjects or streams..."
          value={searchInput}
          onChange={(event) => {
            setLoading(true);
            setPage(1);
            setSearchInput(event.target.value);
          }}
        />
      </div>

      <section className="browse-section">
        <div className="browse-section-heading">
          <div>
            <div className="section-label">FILTER NOTES</div>
            <h2>Find study materials</h2>
          </div>

          <button
            type="button"
            className="browse-back-button"
            onClick={refreshNotes}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="notes-filter-grid">
          <select
            value={selectedStream}
            onChange={(event) => updateFilter(setSelectedStream, event.target.value)}
          >
            <option value="">All streams</option>
            {streams.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={selectedBranch}
            onChange={(event) => updateFilter(setSelectedBranch, event.target.value)}
          >
            <option value="">All departments</option>
            {branches.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(event) => updateFilter(setSelectedYear, event.target.value)}
          >
            <option value="">All academic years</option>
            {years.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={selectedSemester}
            onChange={(event) => updateFilter(setSelectedSemester, event.target.value)}
          >
            <option value="">All semesters</option>
            {semesters.map((value) => (
              <option key={value} value={value}>Semester {value}</option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(event) => updateFilter(setSelectedSubject, event.target.value)}
          >
            <option value="">All subjects</option>
            {subjects.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <button type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </section>

      {error && (
        <div className="empty-notes" role="alert">
          {error}
          <button type="button" onClick={refreshNotes}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="empty-notes">
          <LoaderCircle className="animate-spin" />
          Loading notes...
        </div>
      ) : (
        <section className="module-notes-section">
          <div className="hierarchy-heading">
            <div className="section-label">APPROVED RESOURCES</div>
            <h2>Available notes</h2>
          </div>

          {filteredNotes.length === 0 ? (
            <div className="empty-notes">
              No approved notes found. Try changing your filters.
            </div>
          ) : (
            <div className="module-notes-grid">
              {filteredNotes.map((note) => (
                <article className="module-note-card" key={note._id}>
                  <div className="module-note-icon">
                    <FileText size={23} />
                  </div>

                  <div className="module-note-content">
                    <h4>{note.title}</h4>
                    <p>{note.description || note.subjectName}</p>

                    <div className="module-note-meta">
                      {note.stream && <span>{note.stream}</span>}
                      {note.branch && <span>{note.branch}</span>}
                      {note.academicYear && <span>{note.academicYear}</span>}
                      {note.semester && <span>Semester {note.semester}</span>}
                      {note.subjectCode && <span>{note.subjectCode}</span>}
                      {note.moduleNumber != null && (
                        <span>Module {note.moduleNumber}</span>
                      )}
                    </div>

                    <small>
                      Uploaded by {note.uploadedBy?.name || "OpenNotes user"}
                    </small>

                    <div className="note-download-parts">
                      {(note.parts || []).map((part) => {
                        const key = `${note._id}-${part._id}`;

                        return (
                          <button
                            type="button"
                            className="note-open-button"
                            key={part._id}
                            disabled={downloading === key}
                            onClick={() => handleDownload(note, part)}
                          >
                            <Download size={15} />
                            {downloading === key
                              ? "Opening..."
                              : part.originalFileName || "Open PDF"}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={pagination.totalPages}
            onChange={changePage}
            disabled={loading}
          />
        </section>
      )}
    </main>
  );
}

export default BrowseNotes;