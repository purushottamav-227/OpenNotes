import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileQuestion,
  FileText,
  FolderOpen,
  Search,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { resourceApi } from "../../services/api";
import "./MyUploads.css";

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const PAGE_SIZE = 50;

function MyUploads() {
  const [allUploads, setAllUploads] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [downloadingFile, setDownloadingFile] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Always load every type so the summary cards stay correct; the
  // Notes / PYQs buttons only filter what is shown.
  useEffect(() => {
    let cancelled = false;

    resourceApi
      .myUploads({ type: "all", page, limit: PAGE_SIZE })
      .then((result) => {
        if (cancelled) return;

        const resources = Array.isArray(result?.resources)
          ? result.resources.map((item) => ({
              ...item,
              uploadType: item.resourceType,
            }))
          : [];

        setAllUploads((current) =>
          page === 1 ? resources : [...current, ...resources]
        );
        setTotalPages(result?.pagination?.totalPages || 1);
        setError("");
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Unable to load your uploads.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, refreshKey]);

  const uploads = useMemo(
    () =>
      activeFilter === "all"
        ? allUploads
        : allUploads.filter((item) => item.uploadType === activeFilter),
    [allUploads, activeFilter]
  );

  const filteredUploads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return uploads;

    return uploads.filter((upload) =>
      [
        upload.title,
        upload.description,
        upload.subjectName,
        upload.subjectCode,
        upload.stream,
        upload.branch,
        upload.academicYear,
        upload.examType,
        upload.examinationYear,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [uploads, searchTerm]);

  const totalUploads = allUploads.length;
  const totalNotes = allUploads.filter(
    (item) => item.uploadType === "notes"
  ).length;
  const totalPYQs = allUploads.filter(
    (item) => item.uploadType === "pyqs"
  ).length;
  const approvedUploads = allUploads.filter(
    (item) => item.approvalStatus === "approved"
  ).length;
  const pendingUploads = allUploads.filter(
    (item) => item.approvalStatus === "pending"
  ).length;
  const rejectedUploads = allUploads.filter(
    (item) => item.approvalStatus === "rejected"
  ).length;

  function refreshUploads() {
    setLoading(true);
    setPage(1);
    setRefreshKey((current) => current + 1);
  }

  function loadMore() {
    setLoadingMore(true);
    setPage((current) => current + 1);
  }

  async function handleDownload(upload, part) {
    const key = `${upload._id}-${part._id}`;

    try {
      setDownloadingFile(key);
      setError("");

      const result = await resourceApi.download(
        upload.uploadType,
        upload._id,
        part._id
      );

      const url = result?.data?.url;

      if (!url) {
        throw new Error("Download link was not returned.");
      }

      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.message || "Unable to download the file.");
    } finally {
      setDownloadingFile("");
    }
  }

  return (
    <main className="my-uploads-page">
      <header className="my-uploads-header">
        <div className="my-uploads-header-content">
          <div className="my-uploads-header-text">
            <div className="section-label">MY CONTRIBUTIONS</div>
            <h1>My Uploads</h1>
            <p>Manage and track the resources you have shared.</p>
          </div>

          <div className="my-uploads-header-icon">
            <FolderOpen size={30} />
          </div>
        </div>
      </header>

      <section className="upload-stats-grid">
        <article className="upload-stat-card">
          <div className="upload-stat-icon"><FolderOpen size={21} /></div>
          <div>
            <span>Total uploads</span>
            <strong>{totalUploads}</strong>
          </div>
        </article>

        <article className="upload-stat-card">
          <div className="upload-stat-icon"><FileText size={21} /></div>
          <div>
            <span>Notes</span>
            <strong>{totalNotes}</strong>
          </div>
        </article>

        <article className="upload-stat-card">
          <div className="upload-stat-icon"><FileQuestion size={21} /></div>
          <div>
            <span>Question papers</span>
            <strong>{totalPYQs}</strong>
          </div>
        </article>

        <article className="upload-stat-card">
          <div className="upload-stat-icon"><CheckCircle2 size={21} /></div>
          <div>
            <span>Approved</span>
            <strong>{approvedUploads}</strong>
          </div>
        </article>

        <article className="upload-stat-card">
          <div className="upload-stat-icon"><Clock3 size={21} /></div>
          <div>
            <span>Pending</span>
            <strong>{pendingUploads}</strong>
          </div>
        </article>

        <article className="upload-stat-card">
          <div className="upload-stat-icon"><XCircle size={21} /></div>
          <div>
            <span>Rejected</span>
            <strong>{rejectedUploads}</strong>
          </div>
        </article>
      </section>

      <section className="my-uploads-content">
        <div className="my-uploads-controls">
          <div className="my-uploads-filters">
            {["all", "notes", "pyqs"].map((filter) => (
              <button
                key={filter}
                type="button"
                className={activeFilter === filter ? "active" : ""}
                onClick={() => setActiveFilter(filter)}
              >
                {filter === "all"
                  ? "All uploads"
                  : filter === "notes"
                    ? "Notes"
                    : "PYQs"}
              </button>
            ))}
          </div>

          <div className="my-uploads-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search your uploads..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            {searchTerm && (
              <button
                type="button"
                className="clear-search-button"
                aria-label="Clear search"
                onClick={() => setSearchTerm("")}
              >
                <XCircle size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            className="refresh-uploads-button"
            onClick={refreshUploads}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="my-uploads-error" role="alert">
            {error}
            <button type="button" onClick={refreshUploads}>Retry</button>
          </div>
        )}

        {loading ? (
          <div className="my-uploads-empty">
            Loading your uploads...
          </div>
        ) : filteredUploads.length === 0 ? (
          <div className="my-uploads-empty">
            <div className="my-uploads-empty-icon">
              <FolderOpen size={30} />
            </div>
            <h3>No uploads found</h3>
            <p>Your uploaded notes and question papers will appear here.</p>
          </div>
        ) : (
          <>
            <div className="my-uploads-results-header">
              <div>
                <div className="section-label">YOUR RESOURCES</div>
                <h2>Uploaded resources</h2>
              </div>
              <span className="results-count">
                {filteredUploads.length} results
              </span>
            </div>

            <div className="my-uploads-grid">
              {filteredUploads.map((upload) => {
                const type = upload.uploadType;
                const status = upload.approvalStatus || "pending";

                return (
                  <article
                    className="my-upload-card"
                    key={`${type}-${upload._id}`}
                  >
                    <div className="my-upload-card-top">
                      <div className="my-upload-type-icon">
                        {type === "notes"
                          ? <FileText size={22} />
                          : <FileQuestion size={22} />}
                      </div>

                      <div className="my-upload-card-meta">
                        <span className="my-upload-type">
                          {type === "notes" ? "NOTES" : "QUESTION PAPER"}
                        </span>
                        <span className={`my-upload-status status-${status}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="my-upload-card-body">
                      <h3>{upload.title || "Untitled resource"}</h3>

                      <p className="my-upload-description">
                        {upload.description || upload.subjectName || ""}
                      </p>

                      <div className="my-upload-details">
                        {upload.subjectName && (
                          <span className="my-upload-detail">
                            {upload.subjectName}
                          </span>
                        )}
                        {upload.subjectCode && (
                          <span className="my-upload-detail detail-code">
                            {upload.subjectCode}
                          </span>
                        )}
                        {upload.branch && (
                          <span className="my-upload-detail">{upload.branch}</span>
                        )}
                        {upload.semester && (
                          <span className="my-upload-detail">
                            Semester {upload.semester}
                          </span>
                        )}
                        {type === "notes" && upload.moduleNumber != null && (
                          <span className="my-upload-detail">
                            Module {upload.moduleNumber}
                          </span>
                        )}
                        {type === "pyqs" && upload.examType && (
                          <span className="my-upload-detail exam-type-badge">
                            {upload.examType}
                          </span>
                        )}
                        {type === "pyqs" && upload.examinationYear && (
                          <span className="my-upload-detail">
                            {upload.examinationYear}
                          </span>
                        )}
                      </div>

                      <p className="my-upload-detail">
                        <CalendarDays size={15} />
                        {formatDate(upload.createdAt)}
                      </p>

                      {status === "rejected" && upload.rejectionReason && (
                        <p className="my-upload-description">
                          Reason: {upload.rejectionReason}
                        </p>
                      )}

                      <div className="my-upload-files">
                        {(upload.parts || []).map((part) => {
                          const key = `${upload._id}-${part._id}`;

                          return (
                            <button
                              type="button"
                              className="upload-download-button"
                              key={part._id}
                              disabled={
                                status !== "approved" ||
                                downloadingFile === key
                              }
                              onClick={() => handleDownload(upload, part)}
                            >
                              <Download size={15} />
                              {downloadingFile === key
                                ? "Opening..."
                                : part.originalFileName || "Open PDF"}
                            </button>
                          );
                        })}

                        {(!upload.parts || upload.parts.length === 0) && (
                          <span>No files available</span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {page < totalPages && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
                <button
                  type="button"
                  className="refresh-uploads-button"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default MyUploads;