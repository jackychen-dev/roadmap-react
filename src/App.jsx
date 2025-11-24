import { useState } from "react";
import { ThemeProvider, CssBaseline, Tabs, Tab, Box } from "@mui/material";
import { TasksProvider } from "./store/TasksContext";
import RoadmapTable from "./pages/RoadmapTable";
import RoadmapGantt from "./pages/RoadmapGantt";
import Resourcing from "./pages/Resourcing";
import HardwareResourcing from "./pages/HardwareResourcing";
import Demo from "./pages/Demo";
import RoadmapDashboard from "./pages/RoadmapDashboard";
import CSVImport from "./components/CSVImport";
import ThemeToggle from "./components/ThemeToggle";
import VelocityPointSystem from "./components/VelocityPointSystem";
import theme from "./theme/theme";

function App() {
  const [tab, setTab] = useState(0);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TasksProvider>
        <ThemeToggle />
        <Box sx={{ minHeight: "100vh", p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <h1>Roadmap</h1>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <VelocityPointSystem />
            </Box>
          </Box>

          <CSVImport />

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)}>
              <Tab label="Table View" />
              <Tab label="Gantt Chart" />
              <Tab label="Personnel Resourcing" />
              <Tab label="Hardware Resourcing" />
              <Tab label="Demo" />
              <Tab label="Roadmap Dashboard" />
            </Tabs>
          </Box>

          {tab === 0 && <RoadmapTable />}
          {tab === 1 && <RoadmapGantt />}
          {tab === 2 && <Resourcing />}
          {tab === 3 && <HardwareResourcing />}
          {tab === 4 && <Demo />}
          {tab === 5 && <RoadmapDashboard />}
        </Box>
      </TasksProvider>
    </ThemeProvider>
  );
}

export default App;
