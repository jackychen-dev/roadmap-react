export default function TaskCard({ title }) {
  return (
    <div
      style={{
        padding: "12px",
        background: "#e6f0ff",
        borderRadius: "8px",
        marginBottom: "10px",
        border: "1px solid #b3cfff",
        width: "250px",
        cursor: "grab"
      }}
    >
      {title}
    </div>
  );
}
