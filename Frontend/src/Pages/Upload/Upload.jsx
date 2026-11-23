import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";

import useAuth from "../../context/useAuth";
import { academicApi, resourceApi } from "../../services/api";
import { getUploadBlocker } from "../../utils/uploadEligibility";

import "./Upload.css";

// These match the backend defaults (MAX_PDF_SIZE_MB / MAX_PDF_PARTS).
// The server enforces the real limits on every request.
const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_PARTS = 10;

const emptyForm = {
  academicStructureId: "",
  academicYear: "",
  semester: "",
  subjectCode: "",
  moduleNumber: "",
  examType: "",
  examinationYear: "",
  title: "",
  description: "",
  files: [],
  confirmed: false,
};

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Upload() {
  const { user } = useAuth();
  const uploadBlocker = getUploadBlocker(user);

  const [resourceType, setResourceType] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [structures, setStructures] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(true);
  const [structuresError, setStructuresError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInput = useRef(null);

  const collegeId = user?.collegeId;

  // Academic structures belong to the user's own college.
  useEffect(() => {
    if (!collegeId || uploadBlocker) return undefined;

    let active = true;

    academicApi
      .list(collegeId)
      .then((result) => {
        if (!active) return;
        setStructures(Array.isArray(result?.data) ? result.data : []);
        setStructuresError("");
      })
      .catch((err) => {
        if (active) {
          setStructuresError(
            err.message || "Unable to load the academic programmes."
          );
        }
      })
      .finally(() => {
        if (active) setLoadingStructures(false);
      });

    return () => {
      active = false;
    };
  }, [collegeId, uploadBlocker]);

  const structuresLoading =
    loadingStructures && Boolean(collegeId) && !uploadBlocker;

  const selectedStructure = useMemo(
    () => structures.find((item) => item._id === form.academicStructureId),
    [structures, form.academicStructureId]
  );

  const semesterOptions = useMemo(
    () =>
      [...(selectedStructure?.semesters || [])].sort((a, b) => a - b),
    [selectedStructure]
  );

  // Only subjects that belong to the chosen semester.
  const subjectOptions = useMemo(
    () =>
      (selectedStructure?.subjects || []).filter(
        (subject) => String(subject.semester) === String(form.semester)
      ),
    [selectedStructure, form.semester]
  );

  const selectedSubject = subjectOptions.find(
    (subject) => subject.subjectCode === form.subjectCode
  );

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function updateField(event) {
    const { name, value } = event.target;

    clearMessages();

    setForm((previous) => {
      const next = { ...previous, [name]: value };

      // Dependent selections reset when their parent changes.
      if (name === "academicStructureId") {
        next.academicYear = "";
        next.semester = "";
        next.subjectCode = "";
      }

      if (name === "semester") {
        next.subjectCode = "";
      }

      return next;
    });
  }

  function chooseType(type) {
    clearMessages();
    setResourceType(type);
  }

  function changeType() {
    clearMessages();
    setResourceType(null);
    setForm(emptyForm);
  }

  function addFiles(fileList) {
    const selected = Array.from(fileList || []);

    clearMessages();

    if (selected.length === 0) return;

    if (
      selected.some(
        (file) =>
          file.type !== "application/pdf" &&
          !file.name.toLowerCase().endsWith(".pdf")
      )
    ) {
      setError("Only PDF files are allowed.");
      return;
    }

    if (selected.some((file) => file.size > MAX_FILE_SIZE)) {
      setError(`Each PDF must be ${MAX_FILE_SIZE / (1024 * 1024)} MB or smaller.`);
      return;
    }

    const known = new Set(
      form.files.map((file) => `${file.name}-${file.size}`)
    );

    const added = selected.filter(
      (file) => !known.has(`${file.name}-${file.size}`)
    );

    const combined = [...form.files, ...added];

    if (combined.length > MAX_PARTS) {
      setError(`You can upload at most ${MAX_PARTS} PDF parts per resource.`);
      return;
    }

    setForm((previous) => ({ ...previous, files: combined }));
  }

  function handleFileInput(event) {
    addFiles(event.target.files);
    // Allow choosing the same file again after removing it.
    event.target.value = "";
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragActive(false);
    addFiles(event.dataTransfer?.files);
  }

  function removeFile(index) {
    setForm((previous) => ({
      ...previous,
      files: previous.files.filter((_, i) => i !== index),
    }));
  }

  function moveFile(index, direction) {
    setForm((previous) => {
      const target = index + direction;

      if (target < 0 || target >= previous.files.length) return previous;

      const files = [...previous.files];
      [files[index], files[target]] = [files[target], files[index]];

      return { ...previous, files };
    });
  }

  function resetForm() {
    clearMessages();
    setForm(emptyForm);
  }

  function validate() {
    if (uploadBlocker) return uploadBlocker;
    if (!form.academicStructureId) return "Select your academic programme.";
    if (!form.academicYear) return "Select the academic year.";
    if (!form.semester) return "Select the semester.";
    if (!selectedSubject) return "Select the subject.";

    if (resourceType === "notes") {
      const moduleNumber = Number(form.moduleNumber);

      if (!Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > 50) {
        return "Enter a module number between 1 and 50.";
      }
    } else {
      if (!form.examType) return "Select the examination type (CIE or SEE).";

      const year = Number(form.examinationYear);

      if (!Number.isInteger(year) || year < 1950 || year > 2200) {
        return "Enter a valid examination year.";
      }
    }

    if (form.title.trim().length < 3) {
      return "The title must contain at least 3 characters.";
    }

    if (form.files.length === 0) return "Add at least one PDF file.";
    if (!form.confirmed) return "Please confirm the declaration before submitting.";

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    clearMessages();

    const problem = validate();

    if (problem) {
      setError(problem);
      return;
    }

    const payload = new FormData();

    payload.append("academicStructureId", form.academicStructureId);
    payload.append("stream", selectedStructure.stream);
    payload.append("branch", selectedStructure.branch);
    payload.append("academicYear", form.academicYear);
    payload.append("semester", form.semester);
    payload.append("subjectName", selectedSubject.subjectName);
    payload.append("subjectCode", selectedSubject.subjectCode);
    payload.append("title", form.title.trim());
    payload.append("description", form.description.trim());
    payload.append("hasMultipleParts", String(form.files.length > 1));

    if (resourceType === "notes") {
      payload.append("moduleNumber", form.moduleNumber);
    } else {
      payload.append("examType", form.examType);
      payload.append("examinationYear", form.examinationYear);
    }

    // Part order follows the order shown in the list.
    form.files.forEach((file) => payload.append("files", file));

    setSubmitting(true);
    setProgress(0);

    try {
      if (resourceType === "notes") {
        await resourceApi.uploadNotes(payload, setProgress);
      } else {
        await resourceApi.uploadPYQ(payload, setProgress);
      }

      setSuccess(
        "Your resource was submitted successfully. It will appear publicly once an administrator approves it."
      );
      setForm(emptyForm);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isNotes = resourceType === "notes";

  return (
    <main className="upload-page">
      <header className="upload-header">
        <div className="upload-header-content">
          <div className="upload-header-text">
            <span className="section-label">SHARE KNOWLEDGE</span>

            <h1>
              Upload <span>resources.</span>
            </h1>

            <p className="upload-description">
              Share notes or previous-year question papers as PDF files. Every
              upload is reviewed by an administrator before it is published.
            </p>
          </div>

          <div className="upload-header-icon">
            <UploadCloud size={32} />
          </div>
        </div>
      </header>

      {success && (
        <div className="upload-message upload-success" role="status">
          <CheckCircle2 size={18} />
          <span>
            {success} <Link to="/my-uploads">View my uploads</Link>
          </span>
        </div>
      )}

      {uploadBlocker && (
        <div className="upload-message upload-error" role="alert">
          {uploadBlocker}
        </div>
      )}

      {!uploadBlocker && structuresError && (
        <div className="upload-message upload-error" role="alert">
          {structuresError}
        </div>
      )}

      {!uploadBlocker && !structuresError && !structuresLoading &&
        structures.length === 0 && (
          <div className="upload-message upload-error" role="alert">
            No academic programmes have been set up for your college yet, so
            nothing can be uploaded. Please contact an administrator.
          </div>
        )}

      {!uploadBlocker && !resourceType && (
        <section className="upload-type-section">
          <div className="upload-type-heading">
            <h2>What would you like to upload?</h2>
            <p>Choose the type of resource you want to share.</p>
          </div>

          <div className="upload-type-grid">
            <button
              type="button"
              className="upload-type-card"
              onClick={() => chooseType("notes")}
            >
              <div className="upload-type-icon">
                <FileText size={28} />
              </div>

              <div className="upload-type-content">
                <strong>Notes</strong>
                <span>
                  Module-wise study notes, handwritten notes and summaries.
                </span>
              </div>

              <ArrowRight className="upload-type-arrow" size={20} />
            </button>

            <button
              type="button"
              className="upload-type-card"
              onClick={() => chooseType("pyqs")}
            >
              <div className="upload-type-icon">
                <FileQuestion size={28} />
              </div>

              <div className="upload-type-content">
                <strong>Previous Year Questions</strong>
                <span>CIE and SEE question papers from earlier exams.</span>
              </div>

              <ArrowRight className="upload-type-arrow" size={20} />
            </button>
          </div>
        </section>
      )}

      {!uploadBlocker && resourceType && (
        <form onSubmit={handleSubmit} className="upload-form" noValidate>
          <button
            type="button"
            className="change-upload-type"
            onClick={changeType}
            disabled={submitting}
          >
            <ArrowLeft size={16} />
            Change resource type
          </button>

          <section className="upload-section">
            <div className="upload-section-heading">
              <h2>Academic details</h2>
            </div>

            <div className="upload-form-grid">
              <div className="form-group form-group-full">
                <label htmlFor="academicStructureId">
                  Academic programme <span>*</span>
                </label>

                <select
                  id="academicStructureId"
                  name="academicStructureId"
                  value={form.academicStructureId}
                  onChange={updateField}
                  disabled={structuresLoading || structures.length === 0}
                >
                  <option value="">
                    {structuresLoading
                      ? "Loading programmes..."
                      : "Select programme"}
                  </option>

                  {structures.map((structure) => (
                    <option key={structure._id} value={structure._id}>
                      {structure.programName} — {structure.branch}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStructure && (
                <>
                  <div className="form-group">
                    <label htmlFor="stream-display">Stream</label>
                    <input
                      id="stream-display"
                      value={selectedStructure.stream}
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="branch-display">Department</label>
                    <input
                      id="branch-display"
                      value={selectedStructure.branch}
                      readOnly
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="academicYear">
                  Academic year <span>*</span>
                </label>

                <select
                  id="academicYear"
                  name="academicYear"
                  value={form.academicYear}
                  onChange={updateField}
                  disabled={!selectedStructure}
                >
                  <option value="">Select academic year</option>
                  {(selectedStructure?.academicYears || []).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="semester">
                  Semester <span>*</span>
                </label>

                <select
                  id="semester"
                  name="semester"
                  value={form.semester}
                  onChange={updateField}
                  disabled={!selectedStructure}
                >
                  <option value="">Select semester</option>
                  {semesterOptions.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subjectCode">
                  Subject <span>*</span>
                </label>

                <select
                  id="subjectCode"
                  name="subjectCode"
                  value={form.subjectCode}
                  onChange={updateField}
                  disabled={!form.semester}
                >
                  <option value="">
                    {form.semester && subjectOptions.length === 0
                      ? "No subjects for this semester"
                      : "Select subject"}
                  </option>
                  {subjectOptions.map((subject) => (
                    <option key={subject.subjectCode} value={subject.subjectCode}>
                      {subject.subjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="subjectCodeDisplay">Subject code</label>
                <input
                  id="subjectCodeDisplay"
                  value={selectedSubject?.subjectCode || ""}
                  placeholder="Filled automatically"
                  readOnly
                />
              </div>
            </div>
          </section>

          <section className="upload-section">
            <div className="upload-section-heading">
              <h2>Resource information</h2>
            </div>

            <div className="upload-form-grid">
              {isNotes ? (
                <div className="form-group">
                  <label htmlFor="moduleNumber">
                    Module number <span>*</span>
                  </label>
                  <input
                    id="moduleNumber"
                    name="moduleNumber"
                    type="number"
                    min="1"
                    max="50"
                    inputMode="numeric"
                    placeholder="e.g. 1"
                    value={form.moduleNumber}
                    onChange={updateField}
                  />
                </div>
              ) : (
                <>
                  <div className="form-group form-group-full">
                    <label id="exam-type-label">
                      Examination type <span>*</span>
                    </label>

                    <div
                      className="choice-grid"
                      role="radiogroup"
                      aria-labelledby="exam-type-label"
                    >
                      {[
                        ["CIE", "Continuous Internal Evaluation"],
                        ["SEE", "Semester End Examination"],
                      ].map(([value, label]) => (
                        <button
                          type="button"
                          role="radio"
                          aria-checked={form.examType === value}
                          key={value}
                          className={`choice-card ${
                            form.examType === value ? "choice-card-selected" : ""
                          }`}
                          onClick={() => {
                            clearMessages();
                            setForm((previous) => ({
                              ...previous,
                              examType: value,
                            }));
                          }}
                        >
                          <strong>{value}</strong>
                          <small>{label}</small>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="examinationYear">
                      Examination year <span>*</span>
                    </label>
                    <input
                      id="examinationYear"
                      name="examinationYear"
                      type="number"
                      min="1950"
                      max="2200"
                      inputMode="numeric"
                      placeholder="e.g. 2024"
                      value={form.examinationYear}
                      onChange={updateField}
                    />
                  </div>
                </>
              )}

              <div className="form-group form-group-full">
                <label htmlFor="title">
                  Title <span>*</span>
                </label>
                <input
                  id="title"
                  name="title"
                  maxLength={200}
                  placeholder={
                    isNotes
                      ? "e.g. Module 1 — Introduction to Data Structures"
                      : "e.g. Data Structures CIE-1 Question Paper"
                  }
                  value={form.title}
                  onChange={updateField}
                />
              </div>

              <div className="form-group form-group-full">
                <label htmlFor="description">Description (optional)</label>
                <textarea
                  id="description"
                  name="description"
                  maxLength={2000}
                  placeholder="Add anything that helps others, such as topics covered."
                  value={form.description}
                  onChange={updateField}
                />
              </div>
            </div>
          </section>

          <section className="upload-section">
            <div className="upload-section-heading">
              <h2>PDF files</h2>
            </div>

            <label
              className={`upload-drop-zone ${dragActive ? "drag-active" : ""}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileInput}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                onChange={handleFileInput}
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  pointerEvents: "none",
                }}
              />

              <UploadCloud className="upload-drop-icon" size={34} />
              <strong>Drag PDFs here, or click to browse</strong>
              <span>
                Large resources can be split into up to {MAX_PARTS} PDF parts.
              </span>
              <small>
                PDF only · up to {MAX_FILE_SIZE / (1024 * 1024)} MB per file
              </small>
            </label>

            {form.files.length > 0 && (
              <div className="selected-files">
                <div className="selected-files-header">
                  <strong>
                    {form.files.length > 1 ? "Parts (in order)" : "Selected file"}
                  </strong>
                  <span className="file-count">
                    {form.files.length} / {MAX_PARTS}
                  </span>
                </div>

                <div className="selected-file-list">
                  {form.files.map((file, index) => (
                    <div className="selected-file" key={`${file.name}-${file.size}`}>
                      <div className="selected-file-icon">
                        <FileText size={18} />
                      </div>

                      <div className="selected-file-info">
                        <strong>
                          {form.files.length > 1 ? `Part ${index + 1}: ` : ""}
                          {file.name}
                        </strong>
                        <span>{formatSize(file.size)}</span>
                      </div>

                      {form.files.length > 1 && (
                        <>
                          <button
                            type="button"
                            className="remove-file-button"
                            onClick={() => moveFile(index, -1)}
                            disabled={index === 0 || submitting}
                            aria-label={`Move ${file.name} up`}
                          >
                            <ChevronUp size={16} />
                          </button>

                          <button
                            type="button"
                            className="remove-file-button"
                            onClick={() => moveFile(index, 1)}
                            disabled={
                              index === form.files.length - 1 || submitting
                            }
                            aria-label={`Move ${file.name} down`}
                          >
                            <ChevronDown size={16} />
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="remove-file-button"
                        onClick={() => removeFile(index)}
                        disabled={submitting}
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="upload-section">
            <div className="checkbox-wrapper">
              <input
                id="confirmed"
                className="custom-checkbox"
                type="checkbox"
                checked={form.confirmed}
                onChange={(event) => {
                  clearMessages();
                  setForm((previous) => ({
                    ...previous,
                    confirmed: event.target.checked,
                  }));
                }}
              />

              <label htmlFor="confirmed" className="checkbox-text">
                <strong>I confirm this upload is appropriate to share</strong>
                <span>
                  The files are my own work or I am allowed to share them, and
                  they contain no inappropriate content.
                </span>
              </label>
            </div>
          </section>

          {error && (
            <div className="upload-message upload-error" role="alert">
              {error}
            </div>
          )}

          <div className="upload-actions">
            <button
              type="button"
              className="upload-reset-button"
              onClick={resetForm}
              disabled={submitting}
            >
              Reset
            </button>

            <button
              type="submit"
              className="upload-submit-button"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="upload-spinner" />
                  Uploading {progress}%
                </>
              ) : (
                <>
                  <UploadCloud size={18} />
                  Submit for approval
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}