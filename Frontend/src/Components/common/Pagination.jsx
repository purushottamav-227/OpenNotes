import { ChevronLeft, ChevronRight } from "lucide-react";

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "9px 16px",
  border: "1px solid #343434",
  borderRadius: 10,
  background: "#121212",
  color: "#f2f2f2",
  font: "inherit",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

export default function Pagination({ page, totalPages, onChange, disabled }) {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginTop: 28,
        flexWrap: "wrap",
      }}
    >
      <button
        type="button"
        style={{ ...buttonStyle, opacity: page <= 1 || disabled ? 0.5 : 1 }}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1 || disabled}
      >
        <ChevronLeft size={16} />
        Previous
      </button>

      <span style={{ color: "#a3a3a3", fontSize: 13 }}>
        Page {page} of {totalPages}
      </span>

      <button
        type="button"
        style={{
          ...buttonStyle,
          opacity: page >= totalPages || disabled ? 0.5 : 1,
        }}
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages || disabled}
      >
        Next
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}