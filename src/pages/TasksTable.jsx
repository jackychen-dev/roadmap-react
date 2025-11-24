import React, { useState } from "react";
import { useTasks } from "../store/TasksContext";
import WorkstreamLabel from "../components/WorkstreamLabel";

function TaskRow({ task, onChange, onDelete, workstreams }) {
  return (
    <tr>
      <td>
        <select className="input" value={task.workstream || "Unassigned"} onChange={(e) => onChange({ ...task, workstream: e.target.value })}>
          <option value="Unassigned">Unassigned</option>
          {workstreams.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </td>
      <td>
        <input value={task.deliverable || ""} onChange={(e) => onChange({ ...task, deliverable: e.target.value })} />
      </td>
      <td>
        <input value={task.feature || ""} onChange={(e) => onChange({ ...task, feature: e.target.value })} />
      </td>
      <td>
        <input type="date" value={task.start || ""} onChange={(e) => onChange({ ...task, start: e.target.value })} />
      </td>
      <td>
        <input type="number" value={task.timeToComplete || 0} onChange={(e) => onChange({ ...task, timeToComplete: Number(e.target.value) })} />
      </td>
      <td>
        <input value={task.associated || ""} onChange={(e) => onChange({ ...task, associated: e.target.value })} />
      </td>
      <td>
        <input type="number" value={task.numResources || 1} onChange={(e) => onChange({ ...task, numResources: Number(e.target.value) })} />
      </td>
      <td>
        <button className="btn" onClick={() => onDelete(task.id)}>Delete</button>
      </td>
    </tr>
  );
}

export default function TasksTable() {
  const { tasks, addTask, updateTask, deleteTask, workstreams, addWorkstream } = useTasks();
  const [newDeliverable, setNewDeliverable] = useState("");
  const [newWorkstream, setNewWorkstream] = useState("");

  const handleAdd = () => {
    if (!newDeliverable.trim()) return;
    addTask({ deliverable: newDeliverable, workstream: workstreams[0] || "Unassigned", start: new Date().toISOString().slice(0, 10), end: new Date().toISOString().slice(0, 10), timeToComplete: 8, associated: "", numResources: 1 });
    setNewDeliverable("");
  };

  const handleAddWorkstream = () => {
    if (!newWorkstream.trim()) return;
    addWorkstream(newWorkstream.trim());
    setNewWorkstream("");
  };

  // group tasks by workstream
  const grouped = {};
  tasks.forEach((t) => {
    const w = t.workstream || "Unassigned";
    if (!grouped[w]) grouped[w] = [];
    grouped[w].push(t);
  });

  const columnHeaders = ["[Workstream]","[Deliverable]","[Feature]","[Deliverable Date]","[Time To Complete]","[Associated]","[Number of Resources]",""];

  return (
    <div className="page-card">
      <div className="row" style={{ marginBottom: 12 }}>
        <input className="input" placeholder="New deliverable" value={newDeliverable} onChange={(e) => setNewDeliverable(e.target.value)} />
        <button className="btn" onClick={handleAdd} style={{ marginLeft: 8 }}>Add Deliverable</button>

        <div style={{ marginLeft: 24 }}>
          <input className="input" placeholder="New workstream" value={newWorkstream} onChange={(e) => setNewWorkstream(e.target.value)} />
          <button className="btn" onClick={handleAddWorkstream} style={{ marginLeft: 8 }}>Add Workstream</button>
        </div>
      </div>

      {Object.keys(grouped).length === 0 && <div className="muted">No tasks</div>}

      {Object.keys(grouped).map((ws) => (
        <div key={ws} style={{ marginBottom: 18 }}>
          <div style={{ marginBottom: 8 }}>
            <WorkstreamLabel workstream={ws} size="medium" />
          </div>

          <table className="tasks-table">
            <thead>
              <tr>
                {columnHeaders.map((h, idx) => (
                  <th key={idx}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {grouped[ws].map((t) => (
                <TaskRow key={t.id} task={t} workstreams={workstreams} onChange={(update) => updateTask(t.id, update)} onDelete={deleteTask} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
