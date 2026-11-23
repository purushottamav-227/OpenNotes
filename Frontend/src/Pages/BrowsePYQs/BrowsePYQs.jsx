import { useEffect, useState } from "react";
import {
  BookOpen,
  FileQuestion,
  Search,
  Download,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";

import { resourceApi } from "../../services/api";
import useFacets from "../../hooks/useFacets";
import useDebouncedValue from "../../hooks/useDebouncedValue";
import Pagination from "../../Components/common/Pagination";
import "./BrowsePYQs.css";

const PAGE_SIZE = 12;
const FACET_KEYS = ["stream", "branch", "semester", "examinationYear"];

function BrowsePYQs() {
  const [papers, setPapers] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const searchTerm = useDebouncedValue(searchInput.trim());
  const [examType, setExamType] = useState("");
  const [examYear, setExamYear] = useState("");
  const [stream, setStream] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
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
      .pyqs({
        page,
        limit: PAGE_SIZE,
        q: searchTerm || undefined,
        examType: examType || undefined,
        examinationYear: examYear || undefined,
        stream: stream || undefined,
        branch: branch || undefined,
        semester: semester || undefined,
      })
      .then((result) => {
        if (cancelled) return;

        const resources = Array.isArray(result?.resources)
          ? result.resources
          : [];

        setPapers(resources);
        setPagination({
          total: result?.pagination?.total ?? resources.length,
          totalPages: result?.pagination?.totalPages || 1,
        });
        addFacets(resources, FACET_KEYS);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to load question papers.");
          setPapers([]);
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
    examType,
    examYear,
    stream,
    branch,
    semester,
    refreshKey,
    addFacets,
  ]);

  const unique = (key) => facets[key] || [];

  function changePage(nextPage) {
    setLoading(true);
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function refreshPapers() {
    setLoading(true);
    setRefreshKey((current) => current + 1);
  }

  function updateFilter(setter, value) {
    setLoading(true);
    setPage(1);
    setter(value);
  }

  async function handleDownload(paper, part) {
    const key = `${paper._id}-${part._id}`;

    try {
      setDownloading(key);
      setError("");

      const result = await resourceApi.download(
        "pyqs",
        paper._id,
        part._id
      );

      const url = result?.data?.url;

      if (!url) {
        throw new Error("Download link was not returned.");
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to download this paper.");
    } finally {
      setDownloading("");
    }
  }

  function clearFilters() {
    setLoading(true);
    setPage(1);
    setSearchInput("");
    setExamType("");
    setExamYear("");
    setStream("");
    setBranch("");
    setSemester("");
  }

  return (
    <main className="browse-pyqs-page">
      <header className="browse-pyqs-header">
        <div className="browse-pyqs-header-content">
          <div className="browse-pyqs-header-text">
            <div className="section-label">BROWSE PYQs</div>
            <h1>
              Previous year <span>question papers.</span>
            </h1>
            <p className="browse-pyqs-description">
              Prepare smarter with approved examination papers from your college.
            </p>
          </div>

          <div className="browse-pyqs-header-icon">
            <BookOpen size={30} />
          </div>
        </div>

        <div className="browse-pyqs-search-wrapper">
          <Search className="browse-pyqs-search-icon" size={21} />
          <input
            className="browse-pyqs-search-input"
            type="search"
            placeholder="Search subject, paper or stream..."
            value={searchInput}
            onChange={(event) => {
              setLoading(true);
              setPage(1);
              setSearchInput(event.target.value);
            }}
          />
        </div>
      </header>

      <section className="browse-pyqs-section">
        <div className="browse-pyqs-section-heading">
          <div>
            <div className="section-label">FILTER PAPERS</div>
            <h2>Find question papers</h2>
          </div>

          <button
            type="button"
            className="browse-pyqs-back-button"
            onClick={refreshPapers}
            disabled={loading}
          >
            <RefreshCw size={15} />
            Refresh
          </button>
        </div>

        <div className="pyq-filter-grid">
          <select
            value={stream}
            onChange={(event) => updateFilter(setStream, event.target.value)}
          >
            <option value="">All streams</option>
            {unique("stream").map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={branch}
            onChange={(event) => updateFilter(setBranch, event.target.value)}
          >
            <option value="">All departments</option>
            {unique("branch").map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <select
            value={semester}
            onChange={(event) => updateFilter(setSemester, event.target.value)}
          >
            <option value="">All semesters</option>
            {unique("semester").map((value) => (
              <option key={value} value={value}>
                Semester {value}
              </option>
            ))}
          </select>

          <select
            value={examType}
            onChange={(event) => updateFilter(setExamType, event.target.value)}
          >
            <option value="">All exam types</option>
            <option value="CIE">CIE</option>
            <option value="SEE">SEE</option>
          </select>

          <select
            value={examYear}
            onChange={(event) => updateFilter(setExamYear, event.target.value)}
          >
            <option value="">All examination years</option>
            {unique("examinationYear").map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>

          <button type="button" onClick={clearFilters}>
            Clear filters
          </button>
        </div>
      </section>

      {error && (
        <div className="pyq-empty-small" role="alert">
          {error}
          <button type="button" onClick={refreshPapers}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="pyq-empty-small">
          <LoaderCircle className="animate-spin" />
          Loading question papers...
        </div>
      ) : (
        <section className="browse-pyqs-section">
          <div className="browse-pyqs-section-heading">
            <div>
              <div className="section-label">APPROVED PAPERS</div>
              <h2>Available question papers</h2>
            </div>
            <span className="pyq-count">{pagination.total} papers</span>
          </div>

          {papers.length === 0 ? (
            <div className="pyq-empty-state">
              <FileQuestion size={35} />
              <h3>No question papers found</h3>
              <p>Try changing your filters or search for another subject.</p>
            </div>
          ) : (
            <div className="pyq-paper-grid">
              {papers.map((paper) => (
                <article className="pyq-paper-card" key={paper._id}>
                  <div className="pyq-paper-icon">
                    <FileQuestion size={23} />
                  </div>

                  <div className="pyq-paper-content">
                    <span className="pyq-paper-year">
                      {paper.examinationYear || "Year unavailable"}
                    </span>

                    <h4>{paper.title}</h4>

                    <div className="pyq-paper-meta">
                      {paper.subjectName && <span>{paper.subjectName}</span>}
                      {paper.subjectCode && <span>{paper.subjectCode}</span>}
                      {paper.stream && <span>{paper.stream}</span>}
                      {paper.branch && <span>{paper.branch}</span>}
                      {paper.semester && <span>Semester {paper.semester}</span>}
                      {paper.examType && <span>{paper.examType}</span>}
                    </div>

                    <small>
                      Uploaded by {paper.uploadedBy?.name || "OpenNotes user"}
                    </small>

                    <div className="note-download-parts">
                      {(paper.parts || []).map((part) => {
                        const key = `${paper._id}-${part._id}`;

                        return (
                          <button
                            type="button"
                            className="pyq-open-button"
                            key={part._id}
                            disabled={downloading === key}
                            onClick={() => handleDownload(paper, part)}
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

export default BrowsePYQs;