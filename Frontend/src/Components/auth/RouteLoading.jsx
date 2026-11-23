export default function RouteLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        minHeight: "60vh",
        display: "grid",
        placeItems: "center",
        color: "#a3a3a3",
        fontSize: 14,
      }}
    >
      Loading...
    </div>
  );
}