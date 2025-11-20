import React, { createContext, useContext, useEffect, useState } from "react";

function simpleId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem("tasks:v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    // sample tasks with extended fields
    return [
      {
        id: "t-1",
        workstream: "AI",
        deliverable: "Design UI",
        feature: "UI Mockups",
        start: "2025-11-24",
        end: "2025-11-28",
        timeToComplete: 32,
        associated: "",
        numResources: 1,
        assignee: "alice"
      },
      {
        id: "t-2",
        workstream: "Connectors",
        deliverable: "Build Timeline Component",
        feature: "Timeline Core",
        start: "2025-11-26",
        end: "2025-12-02",
        timeToComplete: 48,
        associated: "",
        numResources: 1,
        assignee: "bob"
      }
    ];
  });

  const [workstreams, setWorkstreams] = useState(() => {
    try {
      const raw = localStorage.getItem("workstreams:v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return ["AI", "Connectors"];
  });

  useEffect(() => {
    try {
      localStorage.setItem("tasks:v1", JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem("workstreams:v1", JSON.stringify(workstreams));
    } catch (e) {}
  }, [workstreams]);

  const addTask = (task) => {
    const t = { id: simpleId(), workstream: task.workstream || "Unassigned", deliverable: task.deliverable || task.name || "Untitled", feature: task.feature || "", start: task.start || new Date().toISOString().slice(0,10), end: task.end || new Date().toISOString().slice(0,10), timeToComplete: task.timeToComplete || task.effort || 8, associated: task.associated || "", numResources: task.numResources || 1, assignee: task.assignee || "", ...task };
    setTasks((s) => [...s, t]);
    return t;
  };

  const updateTask = (id, patch) => {
    setTasks((s) => s.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTask = (id) => setTasks((s) => s.filter((t) => t.id !== id));

  const addWorkstream = (name) => {
    if (!name || workstreams.includes(name)) return;
    setWorkstreams((s) => [...s, name]);
  };

  const removeWorkstream = (name) => {
    setWorkstreams((s) => s.filter((w) => w !== name));
    // optionally set tasks to Unassigned
    setTasks((s) => s.map((t) => (t.workstream === name ? { ...t, workstream: "Unassigned" } : t)));
  };

  return (
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, workstreams, addWorkstream, removeWorkstream }}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const ctx = useContext(TasksContext);
  if (!ctx) throw new Error("useTasks must be used within TasksProvider");
  return ctx;
}

export default TasksContext;
