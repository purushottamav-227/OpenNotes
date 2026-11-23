
import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  Clock3,
  FileQuestion,
  FileText,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { resourceApi } from "../../services/api";
import "./ResourceApprovals.css";

const RESOURCE_TYPES = [
  { value: "notes", label: "Notes", icon: FileText },
  { value: "pyqs", label: "PYQs", icon: FileQuestion },
];

function formatDate(value) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ResourceApprovals() {
  const [activeType, setActiveType] = useState("notes");
  const [refreshKey, setRefreshKey] = useState(0);

  const [resources, setResources] = useState([]);
  const [counts, setCounts] = useState({
    notes: 0,
    pyqs: 0,
  });

  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);

  const [rejectingId, setRejectingId] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");

  // Load pending resources.
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      resourceApi.pending("notes", { page: 1, limit: 50 }),
      resourceApi.pending("pyqs", { page: 1, limit: 50 }),
    ])
      .then(([notesResult, pyqsResult]) => {
        if (cancelled) return;

        const notes = Array.isArray(notesResult?.resources)
          ? notesResult.resources
          : [];

        const pyqs = Array.isArray(pyqsResult?.resources)
          ? pyqsResult.resources
          : [];

        setCounts({
          notes: notesResult?.pagination?.total ?? notes.length,
          pyqs: pyqsResult?.pagination?.total ?? pyqs.length,
        });

        setResources(activeType === "notes" ? notes : pyqs);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;

        setResources([]);
        setError(
          err.message || "Unable to load pending resources."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeType, refreshKey]);

  function handleTypeChange(type) {
    if (type === activeType) return;

    setActiveType(type);
    setLoading(true);
    setError("");
    setFeedback(null);
    setRejectingId("");
    setRejectionReason("");
  }

  function handleRefresh() {
    setLoading(true);
    setError("");
    setFeedback(null);
    setRefreshKey((previous) => previous + 1);
  }

  async function handleApprove(resource) {
    const id = resource?._id;

    if (!id || processingId) return;

    setProcessingId(id);
    setError("");
    setFeedback(null);

    try {
      const result = await resourceApi.approve(activeType, id);

      setResources((previous) =>
        previous.filter((item) => item._id !== id)
      );

      setCounts((previous) => ({
        ...previous,
        [activeType]: Math.max(0, previous[activeType] - 1),
      }));

      setFeedback({
        type: "success",
        message:
          result?.message || "Resource approved successfully.",
      });
    } catch (err) {
      setError(
        err.message || "Unable to approve this resource."
      );
    } finally {
      setProcessingId("");
    }
  }

  function openRejectForm(resource) {
    setRejectingId(resource._id);
    setRejectionReason("");
    setError("");
    setFeedback(null);
  }

  async function handleReject(resource) {
    const reason = rejectionReason.trim();

    if (!reason) {
      setError("Please enter a reason for rejecting this resource.");
      return;
    }

    if (reason.length > 1000) {
      setError("The rejection reason cannot exceed 1000 characters.");
      return;
    }

    const id = resource?._id;

    if (!id || processingId) return;

    setProcessingId(id);
    setError("");
    setFeedback(null);

    try {
      const result = await resourceApi.reject(
        activeType,
        id,
        reason
      );

      setResources((previous) =>
        previous.filter((item) => item._id !== id)
      );

      setCounts((previous) => ({
        ...previous,
        [activeType]: Math.max(0, previous[activeType] - 1),
      }));

      setRejectingId("");
      setRejectionReason("");

      setFeedback({
        type: "success",
        message:
          result?.message || "Resource rejected successfully.",
      });
    } catch (err) {
      setError(
        err.message || "Unable to reject this resource."
      );
    } finally {
      setProcessingId("");
    }
  }

  return (
    <main className="resource-approvals-page">
      <header className="resource-approvals-header">
        <div>
          <span className="resource-approvals-eyebrow">
            <ShieldCheck size={15} />
            ADMINISTRATION
          </span>

          <h1>Resource approvals</h1>

          <p>
            Review uploaded notes and question papers before making
            them available to students.
          </p>
        </div>

        <button
          type="button"
          className="resource-refresh-button"
          onClick={handleRefresh}
          disabled={loading || Boolean(processingId)}
        >
          <RefreshCw
            size={16}
            className={loading ? "resource-spin" : ""}
          />
          Refresh
        </button>
      </header>

      <section className="resource-approval-summary">
        <article className="resource-approval-summary-card">
          <FileText size={22} />

          <div>
            <span>Pending notes</span>
            <strong>{counts.notes}</strong>
          </div>
        </article>

        <article className="resource-approval-summary-card">
          <FileQuestion size={22} />

          <div>
            <span>Pending PYQs</span>
            <strong>{counts.pyqs}</strong>
          </div>
        </article>

        <article className="resource-approval-summary-card">
          <Clock3 size={22} />

          <div>
            <span>Total pending</span>
            <strong>{counts.notes + counts.pyqs}</strong>
          </div>
        </article>
      </section>

      <section className="resource-approval-content">
        <div className="resource-approval-tabs">
          {RESOURCE_TYPES.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              className={activeType === value ? "active" : ""}
              onClick={() => handleTypeChange(value)}
            >
              <Icon size={17} />
              {label}
              <span>{counts[value]}</span>
            </button>
          ))}
        </div>

        {error && (
          <div
            className="resource-approval-message error"
            role="alert"
          >
            {error}
          </div>
        )}

        {feedback && (
          <div
            className={`resource-approval-message ${feedback.type}`}
            role="status"
          >
            {feedback.message}
          </div>
        )}

        {loading ? (
          <div className="resource-approval-empty">
            <RefreshCw
              className="resource-spin"
              size={24}
            />
            <p>Loading pending resources...</p>
          </div>
        ) : resources.length === 0 ? (
          <div className="resource-approval-empty">
            <BookOpen size={34} />

            <h3>
              No pending{" "}
              {activeType === "notes" ? "notes" : "PYQs"}
            </h3>

            <p>
              New submissions awaiting review will appear here.
            </p>
          </div>
        ) : (
          <div className="resource-approval-list">
            {resources.map((resource) => {
              const isProcessing =
                processingId === resource._id;

              const isRejecting =
                rejectingId === resource._id;

              return (
                <article
                  className="resource-review-card"
                  key={resource._id}
                >
                  <div className="resource-review-top">
                    <div className="resource-review-icon">
                      {activeType === "notes" ? (
                        <FileText size={22} />
                      ) : (
                        <FileQuestion size={22} />
                      )}
                    </div>

                    <span className="resource-review-status">
                      <Clock3 size={13} />
                      Pending review
                    </span>
                  </div>

                  <h3>
                    {resource.title || "Untitled resource"}
                  </h3>

                  <p className="resource-review-description">
                    {resource.description ||
                      "No description provided."}
                  </p>

                  <div className="resource-review-details">
                    <span>
                      <strong>Subject:</strong>{" "}
                      {resource.subjectName || "Not specified"}
                    </span>

                    <span>
                      <strong>Code:</strong>{" "}
                      {resource.subjectCode || "Not specified"}
                    </span>

                    <span>
                      <strong>Department:</strong>{" "}
                      {resource.branch || "Not specified"}
                    </span>

                    <span>
                      <strong>Semester:</strong>{" "}
                      {resource.semester ?? "Not specified"}
                    </span>

                    <span>
                      <strong>Stream:</strong>{" "}
                      {resource.stream || "Not specified"}
                    </span>

                    {activeType === "notes" ? (
                      <span>
                        <strong>Module:</strong>{" "}
                        {resource.moduleNumber ?? "Not specified"}
                      </span>
                    ) : (
                      <>
                        <span>
                          <strong>Exam:</strong>{" "}
                          {resource.examType || "Not specified"}
                        </span>

                        <span>
                          <strong>Year:</strong>{" "}
                          {resource.examinationYear || "Not specified"}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="resource-review-uploader">
                    <span>
                      Uploaded by{" "}
                      <strong>
                        {resource.uploadedBy?.name ||
                          "Unknown user"}
                      </strong>
                    </span>

                    {resource.uploadedBy?.email && (
                      <span>{resource.uploadedBy.email}</span>
                    )}

                    <span>{formatDate(resource.createdAt)}</span>
                  </div>

                  <div className="resource-review-files">
                    {(resource.parts || []).map((part, index) => (
                      <span key={part._id || index}>
                        <FileText size={14} />
                        {part.originalFileName ||
                          `PDF ${index + 1}`}
                      </span>
                    ))}
                  </div>

                  {isRejecting && (
                    <div className="resource-rejection-form">
                      <label htmlFor={`reason-${resource._id}`}>
                        Rejection reason
                      </label>

                      <textarea
                        id={`reason-${resource._id}`}
                        value={rejectionReason}
                        onChange={(event) =>
                          setRejectionReason(event.target.value)
                        }
                        placeholder="Explain why this resource is being rejected..."
                        maxLength={1000}
                        rows={3}
                      />

                      <div className="resource-rejection-actions">
                        <button
                          type="button"
                          className="resource-cancel-button"
                          onClick={() => {
                            setRejectingId("");
                            setRejectionReason("");
                            setError("");
                          }}
                          disabled={isProcessing}
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          className="resource-confirm-reject"
                          onClick={() => handleReject(resource)}
                          disabled={isProcessing}
                        >
                          <X size={15} />
                          {isProcessing
                            ? "Rejecting..."
                            : "Confirm rejection"}
                        </button>
                      </div>
                    </div>
                  )}

                  {!isRejecting && (
                    <div className="resource-review-actions">
                      <button
                        type="button"
                        className="resource-approve-button"
                        onClick={() => handleApprove(resource)}
                        disabled={
                          isProcessing || Boolean(processingId)
                        }
                      >
                        <Check size={16} />
                        {isProcessing
                          ? "Processing..."
                          : "Approve"}
                      </button>

                      <button
                        type="button"
                        className="resource-reject-button"
                        onClick={() => openRejectForm(resource)}
                        disabled={Boolean(processingId)}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
