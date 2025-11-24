import { useState, useEffect } from "react";
import { ThemeProvider, CssBaseline, Tabs, Tab, Box, Chip, Alert } from "@mui/material";
import { TasksProvider, useTasks } from "./store/TasksContext";
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

function FirebaseStatus() {
  const { useFirebase, isLoading } = useTasks();
  const [testResult, setTestResult] = useState(null);
  const [testTimeout, setTestTimeout] = useState(false);

  useEffect(() => {
    if (useFirebase) {
      // Set a timeout for the test
      const timeout = setTimeout(() => {
        setTestTimeout(true);
      }, 15000); // 15 second timeout

      // Test Firebase connection
      import('./utils/testFirebase').then(({ testFirebaseConnection }) => {
        testFirebaseConnection().then(result => {
          clearTimeout(timeout);
          setTestResult(result);
        }).catch(err => {
          clearTimeout(timeout);
          setTestResult({
            success: false,
            error: err.message || 'Connection test failed',
            details: 'Check browser console for details'
          });
        });
      });

      return () => clearTimeout(timeout);
    }
  }, [useFirebase]);

  if (!useFirebase) {
    return (
      <Alert 
        severity="info" 
        sx={{ mb: 2 }}
        action={
          <Chip 
            label="📱 Local" 
            size="small" 
            color="info"
            sx={{ fontSize: '0.75rem' }}
          />
        }
      >
        ℹ️ <strong>Using localStorage</strong> (Firebase not configured). Data is stored locally only.
        <br />
        <small style={{ opacity: 0.8 }}>
          To enable Firebase, configure your .env file and restart the dev server.
        </small>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        ⏳ Loading Firebase... (This may take a moment. Check browser console for errors.)
      </Alert>
    );
  }

  if (testTimeout && !testResult) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        ⚠️ Firebase connection timeout. Check your Firestore security rules and network connection.
        Falling back to localStorage.
      </Alert>
    );
  }

  if (testResult) {
    if (testResult.success) {
      return (
        <Alert 
          severity="success" 
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Chip 
                label="🟢 Online" 
                size="small" 
                color="success"
                sx={{ fontSize: '0.75rem' }}
              />
            </Box>
          }
        >
          ✅ <strong>Firebase connected!</strong> Data is syncing to cloud.
          <br />
          <small style={{ opacity: 0.8 }}>
            Project: {import.meta.env.VITE_FIREBASE_PROJECT_ID || 'N/A'} | 
            Check console (F12) for detailed logs
          </small>
        </Alert>
      );
    }
    
    // Handle specific error types
    const isOfflineError = testResult.error.includes('offline') || testResult.error.includes('unavailable');
    
    return (
      <Alert 
        severity="warning" 
        sx={{ mb: 2 }}
        action={
          <Chip 
            label="🔴 Error" 
            size="small" 
            color="error"
            sx={{ fontSize: '0.75rem' }}
          />
        }
      >
        ⚠️ <strong>Firebase connection issue:</strong> {testResult.error}
        {isOfflineError && (
          <>
            <br /><br />
            <strong>Common causes:</strong>
            <ul style={{ marginTop: '8px', marginBottom: '8px', paddingLeft: '20px' }}>
              <li>Firestore Database not enabled in Firebase Console</li>
              <li>Firestore security rules blocking access</li>
              <li>Network connectivity issues</li>
            </ul>
            <strong>Solution:</strong> Check <code>FIREBASE_TROUBLESHOOTING.md</code> for help.
            <br />
            <strong>Note:</strong> App is using localStorage as fallback.
          </>
        )}
      </Alert>
    );
  }

  return (
    <Alert severity="info" sx={{ mb: 2 }}>
      🔄 Testing Firebase connection...
    </Alert>
  );
}

function AppContent() {
  const [tab, setTab] = useState(0);

  return (
    <>
      <ThemeToggle />
      <Box sx={{ minHeight: "100vh", p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <h1>Roadmap</h1>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
            <VelocityPointSystem />
          </Box>
        </Box>

        {/* Firebase Status - Always visible */}
        <Box sx={{ mb: 2 }}>
          <FirebaseStatus />
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
    </>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TasksProvider>
        <AppContent />
      </TasksProvider>
    </ThemeProvider>
  );
}

export default App;
