
import { useState } from "react";
import { TasksProvider } from "./store/TasksContext";
import TasksTable from "./pages/TasksTable";
import Timeline from "./pages/Timeline";

function App() {
  const [page, setPage] = useState("tasks");

  return (
    <TasksProvider>
      <div style={{ padding: "20px" }}>
        <h1>Roadmap UI</h1>

        <nav style={{ marginBottom: 16 }}>
          <button onClick={() => setPage("tasks")} style={{ marginRight: 8 }}>
            Tasks Table
          </button>
          <button onClick={() => setPage("timeline")}>
            Timeline
          </button>
        </nav>

        {page === "tasks" ? <TasksTable /> : <Timeline />}
      </div>
    </TasksProvider>
  );
}

export default App;
