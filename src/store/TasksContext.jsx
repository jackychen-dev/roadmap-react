import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  query, 
  orderBy,
  writeBatch 
} from "firebase/firestore";
import { db } from "../config/firebase";
import * as XLSX from "xlsx";

function simpleId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

const TasksContext = createContext(null);
const TASKS_COLLECTION = "tasks";
const TASKS_DOC_ID = "roadmap-tasks-v1";

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [useFirebase, setUseFirebase] = useState(false);

  // Check if Firebase is configured
  useEffect(() => {
    try {
      // Check if Firebase config has been set up
      const firebaseConfig = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      console.log("Checking Firebase config...", {
        projectId: firebaseConfig,
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? "Set" : "Not set",
        allEnvVars: {
          apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
          authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
          appId: import.meta.env.VITE_FIREBASE_APP_ID
        }
      });
      
      if (firebaseConfig && firebaseConfig !== "YOUR_PROJECT_ID" && firebaseConfig !== "YOUR_PROJECT_ID.firebaseapp.com") {
        console.log("✅ Firebase config detected, enabling Firebase...");
        setUseFirebase(true);
      } else {
        console.warn("⚠️ Firebase not configured. Using localStorage.");
        console.warn("If you updated .env, make sure to restart the dev server!");
        // Fallback to localStorage
        const raw = localStorage.getItem("roadmap-tasks:v1");
        if (raw) {
          setTasks(JSON.parse(raw));
        }
        setIsLoading(false);
      }
    } catch (e) {
      console.error("Firebase check error:", e);
      setIsLoading(false);
    }
  }, []);

  // Load tasks from Firestore on mount and set up real-time listener
  useEffect(() => {
    if (!useFirebase) return;
    
    // Check if db is available
    if (!db) {
      console.error("Firestore db is not initialized");
      setIsLoading(false);
      setUseFirebase(false);
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("roadmap-tasks:v1");
        if (raw) {
          setTasks(JSON.parse(raw));
        }
      } catch (e) {}
      return;
    }

    setIsLoading(true);
    const tasksRef = doc(db, TASKS_COLLECTION, TASKS_DOC_ID);

    // Set a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.error("Firestore connection timeout");
      console.error("This usually means:");
      console.error("1. Firestore Database is not enabled in Firebase Console");
      console.error("2. Firestore security rules are blocking access");
      console.error("3. Check ENABLE_FIRESTORE.md for step-by-step instructions");
      setIsLoading(false);
      setUseFirebase(false);
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("roadmap-tasks:v1");
        if (raw) {
          setTasks(JSON.parse(raw));
        }
    } catch (e) {}
    }, 10000); // 10 second timeout

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      tasksRef,
      (snapshot) => {
        clearTimeout(timeoutId);
        if (snapshot.exists()) {
          const data = snapshot.data();
          setTasks(data.tasks || []);
          // Also save to localStorage as backup
          try {
            localStorage.setItem("roadmap-tasks:v1", JSON.stringify(data.tasks || []));
          } catch (e) {
            console.error("LocalStorage backup error:", e);
          }
        } else {
          // Document doesn't exist, initialize it
          setDoc(tasksRef, { tasks: [] }).catch(err => {
            console.error("Error initializing Firestore document:", err);
          });
          setTasks([]);
        }
        setIsLoading(false);
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error("Firestore listener error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        // Handle offline/unavailable errors specifically
        if (error.code === 'unavailable' || error.message.includes('offline')) {
          console.warn("Firestore is unavailable. This could be due to:");
          console.warn("1. Firestore not enabled in Firebase Console");
          console.warn("2. Network connectivity issues");
          console.warn("3. Firestore security rules blocking access");
          console.warn("Falling back to localStorage...");
        }
        
        // Fallback to localStorage on error
        try {
          const raw = localStorage.getItem("roadmap-tasks:v1");
          if (raw) {
            setTasks(JSON.parse(raw));
          }
    } catch (e) {}
        setIsLoading(false);
        setUseFirebase(false);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [useFirebase]);

  // Manual save function - only saves when explicitly called
  const saveTasks = async () => {
    if (isLoading) return;

    if (useFirebase && db) {
      const tasksRef = doc(db, TASKS_COLLECTION, TASKS_DOC_ID);
      try {
        await setDoc(tasksRef, { tasks }, { merge: true });
        console.log("✅ Tasks saved to Firestore");
        // Also save to localStorage as backup
        try {
          localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
        } catch (e) {
          console.error("LocalStorage backup error:", e);
        }
      } catch (error) {
        console.error("Error saving to Firestore:", error);
        // Fallback to localStorage
        try {
          localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
          console.log("✅ Tasks saved to localStorage (Firestore unavailable)");
        } catch (e) {
          console.error("LocalStorage save error:", e);
        }
      }
    } else {
      // Save to localStorage if Firebase is not configured
      try {
        localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
        console.log("✅ Tasks saved to localStorage");
      } catch (e) {
        console.error("LocalStorage save error:", e);
      }
    }
  };

  // Listen for storage events to sync across tabs/components (localStorage fallback)
  useEffect(() => {
    if (useFirebase) return; // Firestore handles real-time sync

    const handleStorageChange = () => {
      try {
        const raw = localStorage.getItem("roadmap-tasks:v1");
        if (raw) {
          const newTasks = JSON.parse(raw);
          // Only update if different to avoid infinite loops
          if (JSON.stringify(newTasks) !== JSON.stringify(tasks)) {
            setTasks(newTasks);
          }
        }
    } catch (e) {}
    };

    const handleCustomUpdate = (e) => {
      if (e.detail && e.detail.tasks) {
        setTasks(e.detail.tasks);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('roadmap-tasks-updated', handleCustomUpdate);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('roadmap-tasks-updated', handleCustomUpdate);
    };
  }, [tasks, useFirebase]);

  // Parse CSV text into tasks
  const importCSV = (csvText) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) return; // Need at least header + 1 row
    
    // Parse CSV properly handling quoted fields
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
    
    // Find column indices
    const idIdx = headers.findIndex(h => h === 'id');
    const typeIdx = headers.findIndex(h => h.includes('work item type') || h.includes('type'));
    const title1Idx = headers.findIndex(h => h === 'title 1' || h === 'title1');
    const title2Idx = headers.findIndex(h => h === 'title 2' || h === 'title2');
    const title3Idx = headers.findIndex(h => h === 'title 3' || h === 'title3');
    // Fallback to single title column if separate titles not found
    const titleIdx = title1Idx < 0 ? headers.findIndex(h => h === 'title') : -1;
    const assignedIdx = headers.findIndex(h => h.includes('assigned'));
    const stateIdx = headers.findIndex(h => h === 'state');
    const storyPointsIdx = headers.findIndex(h => h.includes('story points'));
    const startIdx = headers.findIndex(h => h.includes('start'));
    const endIdx = headers.findIndex(h => h.includes('deliverable') || h.includes('closed') || h.includes('finish') || h.includes('end'));
    const demoIdx = headers.findIndex(h => h === 'demo');
    
    const newTasks = [];
    const seenItems = new Set(); // Track duplicates by unique key
    let currentEpic = '';
    let currentFeature = '';
    
    // Detect format: if we have "work item type" and single "title", use hierarchy tracking
    const isHierarchyFormat = typeIdx >= 0 && titleIdx >= 0 && title1Idx < 0;
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;
      
      const id = idIdx >= 0 ? values[idIdx] : '';
      const type = typeIdx >= 0 ? values[typeIdx] : '';
      const typeLower = type.toLowerCase().trim();
      
      // Handle Title 1, Title 2, Title 3 format or single Title column
      let epicName = '';
      let featureName = '';
      let storyName = '';
      let title = '';
      
      if (title1Idx >= 0 || title2Idx >= 0 || title3Idx >= 0) {
        // Format with separate title columns - carry forward empty values
        const title1Value = title1Idx >= 0 ? values[title1Idx].trim() : '';
        const title2Value = title2Idx >= 0 ? values[title2Idx].trim() : '';
        const title3Value = title3Idx >= 0 ? values[title3Idx].trim() : '';
        
        // If Title 1 has a value, use it and update currentEpic
        if (title1Value) {
          epicName = title1Value;
          currentEpic = epicName;
          currentFeature = ''; // Reset feature when epic changes
        } else if (currentEpic) {
          // Carry forward last seen epic
          epicName = currentEpic;
        }
        
        // If Title 2 has a value, use it and update currentFeature
        if (title2Value) {
          featureName = title2Value;
          currentFeature = featureName;
        } else if (currentFeature) {
          // Carry forward last seen feature
          featureName = currentFeature;
        }
        
        // If Title 3 has a value, use it
        if (title3Value) {
          storyName = title3Value;
        }
      } else if (titleIdx >= 0) {
        // Single title column format
        title = values[titleIdx];
        
        // If using hierarchy format (Work Item Type + single Title), track hierarchy
        if (isHierarchyFormat) {
          if (typeLower === 'epic') {
            currentEpic = title;
            currentFeature = ''; // Reset feature when new epic
          } else if (typeLower === 'feature') {
            currentFeature = title;
            // Keep current epic (don't reset it)
          } else if (typeLower === 'user story' || typeLower === 'story') {
            // Use current epic and feature
            // Don't change them
          }
        }
      }
      
      const assigned = assignedIdx >= 0 ? values[assignedIdx] : '';
      const state = stateIdx >= 0 ? values[stateIdx] : 'New';
      const storyPoints = storyPointsIdx >= 0 ? parseFloat(values[storyPointsIdx]) || 0 : 0;
      const startDate = startIdx >= 0 ? values[startIdx] : '';
      const endDate = endIdx >= 0 ? values[endIdx] : '';
      const demo = demoIdx >= 0 ? values[demoIdx] : '';
      
      // Determine the actual name and hierarchy based on type
      let itemName = '';
      if (isHierarchyFormat) {
        // Hierarchy format: use title and track epic/feature from context
        itemName = title;
      } else if (title1Idx >= 0 || title2Idx >= 0 || title3Idx >= 0) {
        // Title 1/2/3 format: use the appropriate column based on work item type
        if (typeLower === 'epic') {
          itemName = epicName || '';
          if (epicName) {
            currentEpic = epicName;
            currentFeature = ''; // Reset feature when new epic
          }
        } else if (typeLower === 'feature') {
          itemName = featureName || '';
          if (featureName) {
            currentFeature = featureName;
          }
          // epicName is already set from carry-forward logic above
        } else if (typeLower === 'user story' || typeLower === 'story') {
          itemName = storyName || '';
          // epicName and featureName are already set from carry-forward logic above
        }
      } else {
        // Old format: single title column
        if (typeLower === 'epic') {
          itemName = title;
          currentEpic = itemName;
          currentFeature = ''; // Reset feature when new epic
        } else if (typeLower === 'feature') {
          itemName = title;
          currentFeature = itemName;
          // Keep current epic
        } else if (typeLower === 'user story' || typeLower === 'story') {
          itemName = title;
          // Use current epic and feature
        }
      }
      
      // Skip empty rows
      if (!itemName && !type) continue;
      
      // Create unique key for duplicate detection
      let uniqueKey = '';
      const epicNameKey = currentEpic.toLowerCase().trim();
      const featureNameKey = currentFeature.toLowerCase().trim();
      const storyNameKey = itemName.toLowerCase().trim();
      
      if (typeLower === 'epic') {
        uniqueKey = `epic:${storyNameKey}`;
      } else if (typeLower === 'feature') {
        uniqueKey = `feature:${epicNameKey}:${storyNameKey}`;
      } else if (typeLower === 'user story' || typeLower === 'story') {
        // For stories, use epic:feature:story combination
        // Handle cases where epic/feature might be missing
        if (epicNameKey && featureNameKey && storyNameKey) {
          uniqueKey = `story:${epicNameKey}:${featureNameKey}:${storyNameKey}`;
        } else if (epicNameKey && storyNameKey) {
          uniqueKey = `story:${epicNameKey}::${storyNameKey}`;
        } else if (storyNameKey) {
          uniqueKey = `story:::${storyNameKey}`;
        } else {
          uniqueKey = `story:${id || simpleId()}`; // Fallback to ID if no name
        }
      }
      
      // Skip if we've already seen this item
      if (uniqueKey && seenItems.has(uniqueKey)) {
        continue;
      }
      
      if (uniqueKey) {
        seenItems.add(uniqueKey);
      }
      
      // Normalize dates - handle formats like "2/27/2026" or "12/21/2025"
      let normalizedStart = '';
      let normalizedEnd = '';
      
      const parseDate = (dateStr) => {
        if (!dateStr) return null;
        
        // Remove quotes if present
        dateStr = dateStr.replace(/^"|"$/g, '');
        
        // Try parsing as-is first
        let date = new Date(dateStr);
        if (!isNaN(date.getTime())) return date;
        
        // Handle MM/DD/YYYY format
        const parts = dateStr.split(/[\s\/-]/);
        if (parts.length >= 3) {
          // Try MM/DD/YYYY
          const month = parseInt(parts[0]) - 1;
          const day = parseInt(parts[1]);
          const year = parseInt(parts[2]);
          if (!isNaN(month) && !isNaN(day) && !isNaN(year)) {
            date = new Date(year, month, day);
            if (!isNaN(date.getTime())) return date;
          }
        }
        
        // Handle "26-Nov" or "26-Nov-2026" format (day-month-year or day-month)
        const dayMonthMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})(?:-(\d{4}))?$/i);
        if (dayMonthMatch) {
          const day = parseInt(dayMonthMatch[1]);
          const monthStr = dayMonthMatch[2];
          const yearStr = dayMonthMatch[3];
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const month = monthNames.findIndex(m => m === monthStr.toLowerCase());
          if (month >= 0) {
            let year;
            if (yearStr) {
              year = parseInt(yearStr);
            } else {
              const now = new Date();
              year = now.getFullYear();
              // If the month has passed this year, use next year
              if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
                year = year + 1;
              }
            }
            date = new Date(year, month, day);
            if (!isNaN(date.getTime())) return date;
          }
        }
        
        return null;
      };
      
      const startDateObj = parseDate(startDate);
      if (startDateObj) {
        normalizedStart = startDateObj.toISOString().slice(0, 10);
      }
      
      const endDateObj = parseDate(endDate);
      if (endDateObj) {
        normalizedEnd = endDateObj.toISOString().slice(0, 10);
      }
      
      // Calculate duration (use provided duration if available, otherwise calculate)
      let duration = 0;
      const durationIdx = headers.findIndex(h => h.includes('duration'));
      if (durationIdx >= 0 && values[durationIdx]) {
        duration = parseInt(values[durationIdx]) || 0;
      }
      if (!duration && normalizedStart && normalizedEnd) {
        const start = new Date(normalizedStart);
        const finish = new Date(normalizedEnd);
        duration = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      const task = {
        id: id || simpleId(),
        type: typeLower,
        title: itemName || title,
        epic: currentEpic,
        feature: currentFeature,
        story: (typeLower === 'user story' || typeLower === 'story') ? itemName : '',
        assignedTo: assigned,
        state: state,
        storyPoints: storyPoints,
        start_date: normalizedStart,
        finish_date: normalizedEnd,
        duration_days: duration,
        startDate: normalizedStart,
        deliverableDate: normalizedEnd,
        finishDate: normalizedEnd,
        demo: demo || '', // Include demo field
      };
      
      newTasks.push(task);
    }
    
    setTasks(newTasks);
  };

  // Helper function to calculate feature aggregates (same logic as in RoadmapTable/RoadmapGantt)
  const calculateFeatureAggregates = (feature) => {
    const stories = feature.stories || [];
    if (stories.length === 0) return feature;
    
    const result = { ...feature };
    
    // Calculate story points (sum of all stories)
    const totalStoryPoints = stories.reduce((sum, story) => {
      return sum + (story.storyPoints || 0);
    }, 0);
    result.storyPoints = totalStoryPoints;
    
    // Calculate start date (earliest from stories)
    const startDates = stories
      .map(s => s.start_date || s.startDate)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));
    
    if (startDates.length > 0) {
      const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
      result.start_date = earliestStart.toISOString().slice(0, 10);
      result.startDate = earliestStart.toISOString().slice(0, 10);
    }
    
    // Calculate finish date (latest from stories)
    const finishDates = stories
      .map(s => s.finish_date || s.finishDate || s.deliverableDate)
      .filter(Boolean)
      .map(d => {
        const dateStr = d.toString();
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
        }
        return new Date(d);
      })
      .filter(d => !isNaN(d.getTime()));
    
    if (finishDates.length > 0) {
      const latestFinish = new Date(Math.max(...finishDates.map(d => d.getTime())));
      result.finish_date = latestFinish.toISOString().slice(0, 10);
      result.finishDate = latestFinish.toISOString().slice(0, 10);
      result.deliverableDate = latestFinish.toISOString().slice(0, 10);
    }
    
    return result;
  };

  // Helper function to calculate epic aggregates (same logic as in RoadmapTable/RoadmapGantt)
  const calculateEpicAggregates = (epic) => {
    const features = Object.values(epic.features || {});
    const allStories = features.flatMap(f => f.stories || []);
    const allChildrenForDates = [...features, ...allStories];
    
    if (allChildrenForDates.length === 0) return epic;
    
    const result = { ...epic };
    
    // Calculate story points (sum from features or stories)
    let totalStoryPoints = 0;
    if (features.length > 0) {
      totalStoryPoints = features.reduce((sum, feature) => {
        return sum + (feature.storyPoints || 0);
      }, 0);
    } else {
      totalStoryPoints = allStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
    }
    result.storyPoints = totalStoryPoints;
    
    // Calculate start date (earliest from all children)
    const startDates = allChildrenForDates
      .map(c => c.start_date || c.startDate)
      .filter(Boolean)
      .map(d => new Date(d))
      .filter(d => !isNaN(d.getTime()));
    
    if (startDates.length > 0) {
      const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
      result.start_date = earliestStart.toISOString().slice(0, 10);
      result.startDate = earliestStart.toISOString().slice(0, 10);
    }
    
    // Calculate finish date (latest from all children)
    const finishDates = allChildrenForDates
      .map(c => c.finish_date || c.finishDate || c.deliverableDate)
      .filter(Boolean)
      .map(d => {
        const dateStr = d.toString();
        if (dateStr.includes('/')) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
          }
        }
        return new Date(d);
      })
      .filter(d => !isNaN(d.getTime()));
    
    if (finishDates.length > 0) {
      const latestFinish = new Date(Math.max(...finishDates.map(d => d.getTime())));
      result.finish_date = latestFinish.toISOString().slice(0, 10);
      result.finishDate = latestFinish.toISOString().slice(0, 10);
      result.deliverableDate = latestFinish.toISOString().slice(0, 10);
    }
    
    return result;
  };

  // Helper function to build roadmap data
  const buildRoadmapData = () => {
    // First, organize tasks hierarchically
    const epicMap = {};
    
    // Organize tasks into epics -> features -> stories structure
    tasks.forEach(task => {
      if (task.type === 'epic') {
        const epicName = task.epic || task.title || '';
        if (!epicMap[epicName]) {
          epicMap[epicName] = {
            ...task,
            features: {},
          };
        }
      } else if (task.type === 'feature') {
        const epicName = task.epic || '';
        const featureName = task.feature || task.title || '';
        if (epicName) {
          if (!epicMap[epicName]) {
            epicMap[epicName] = {
              id: `epic-${epicName}`,
              type: 'epic',
              epic: epicName,
              title: epicName,
              features: {},
            };
          }
          if (!epicMap[epicName].features[featureName]) {
            epicMap[epicName].features[featureName] = {
              ...task,
              stories: [],
            };
          }
        }
      } else if (task.type === 'user story' || task.type === 'story') {
        const epicName = task.epic || '';
        const featureName = task.feature || '';
        if (epicName && featureName) {
          if (!epicMap[epicName]) {
            epicMap[epicName] = {
              id: `epic-${epicName}`,
              type: 'epic',
              epic: epicName,
              title: epicName,
              features: {},
            };
          }
          if (!epicMap[epicName].features[featureName]) {
            epicMap[epicName].features[featureName] = {
              id: `feature-${featureName}`,
              type: 'feature',
              epic: epicName,
              feature: featureName,
              title: featureName,
              stories: [],
            };
          }
          epicMap[epicName].features[featureName].stories.push(task);
        }
      }
    });
    
    // Calculate aggregates for features
    Object.keys(epicMap).forEach(epicName => {
      Object.keys(epicMap[epicName].features).forEach(featureName => {
        epicMap[epicName].features[featureName] = calculateFeatureAggregates(epicMap[epicName].features[featureName]);
      });
    });
    
    // Calculate aggregates for epics
    Object.keys(epicMap).forEach(epicName => {
      epicMap[epicName] = calculateEpicAggregates(epicMap[epicName]);
    });
    
    // Build roadmap rows in Title 1/2/3 format
    // Format: ID, Work Item Type, Title 1 (Epic), Title 2 (Feature), Title 3 (User Story), Start Date, Deliverable, Story Points
    // Each unique value should only appear once in its column
    const roadmapHeaders = ['ID', 'Work Item Type', 'Title 1', 'Title 2', 'Title 3', 'Start Date', 'Deliverable', 'Story Points'];
    const roadmapRows = [];
    
    // Track which values have already appeared in each column
    const seenTitle1 = new Set();
    const seenTitle2 = new Set();
    const seenTitle3 = new Set();
    
    // Helper to format date as DD-Mon
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day}-${monthNames[date.getMonth()]}`;
      } catch (e) {
        return dateStr;
      }
    };
    
    // Add epics
    Object.values(epicMap).forEach(epic => {
      const type = 'Epic';
      const epicName = epic.epic || epic.title || '';
      const startDate = epic.start_date || epic.startDate || '';
      const finishDate = epic.finish_date || epic.finishDate || epic.deliverableDate || '';
      
      // Epic name appears in Title 1 only once
      const title1 = seenTitle1.has(epicName) ? '' : epicName;
      if (epicName && !seenTitle1.has(epicName)) {
        seenTitle1.add(epicName);
      }
      
      roadmapRows.push([
        epic.id || `epic-${epicName}`,
        type,
        title1, // Title 1 (only appears once)
        '', // Title 2 (empty for epics)
        '', // Title 3 (empty for epics)
        formatDate(startDate),
        formatDate(finishDate),
        epic.storyPoints || 0,
      ]);
      
      // Add features under this epic
      Object.values(epic.features || {}).forEach(feature => {
        const featureType = 'Feature';
        const featureName = feature.feature || feature.title || '';
        const featureStartDate = feature.start_date || feature.startDate || '';
        const featureFinishDate = feature.finish_date || feature.finishDate || feature.deliverableDate || '';
        
        // Feature name appears in Title 2 only once
        const title2 = seenTitle2.has(featureName) ? '' : featureName;
        if (featureName && !seenTitle2.has(featureName)) {
          seenTitle2.add(featureName);
        }
        
        roadmapRows.push([
          feature.id || `feature-${featureName}`,
          featureType,
          '', // Title 1 (empty - epic already appeared)
          title2, // Title 2 (only appears once)
          '', // Title 3 (empty for features)
          formatDate(featureStartDate),
          formatDate(featureFinishDate),
          feature.storyPoints || 0,
        ]);
        
        // Add stories under this feature
        (feature.stories || []).forEach(story => {
          const storyType = 'User Story';
          const storyName = story.story || story.title || '';
          const storyStartDate = story.start_date || story.startDate || '';
          const storyFinishDate = story.finish_date || story.finishDate || story.deliverableDate || '';
          
          // Story name appears in Title 3 only once
          const title3 = seenTitle3.has(storyName) ? '' : storyName;
          if (storyName && !seenTitle3.has(storyName)) {
            seenTitle3.add(storyName);
          }
          
          roadmapRows.push([
            story.id,
            storyType,
            '', // Title 1 (empty - epic already appeared)
            '', // Title 2 (empty - feature already appeared)
            title3, // Title 3 (only appears once)
            formatDate(storyStartDate),
            formatDate(storyFinishDate),
            story.storyPoints || 0,
          ]);
        });
      });
    });
    
    // Add any standalone tasks that don't fit into the hierarchy
    tasks.forEach(task => {
      if (task.type !== 'epic' && task.type !== 'feature' && task.type !== 'user story' && task.type !== 'story') {
        const type = 'Task';
        const title = task.title || '';
        const title3 = seenTitle3.has(title) ? '' : title;
        if (title && !seenTitle3.has(title)) {
          seenTitle3.add(title);
        }
        roadmapRows.push([
          task.id,
          type,
          '', // Title 1
          '', // Title 2
          title3, // Title 3
          formatDate(task.start_date || task.startDate || ''),
          formatDate(task.finish_date || task.finishDate || task.deliverableDate || ''),
          task.storyPoints || 0,
        ]);
      }
    });
    
    return { headers: roadmapHeaders, rows: roadmapRows };
  };

  // Import Excel file with 3 tabs
  const importExcel = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Import Roadmap sheet
          const roadmapSheet = workbook.Sheets[workbook.SheetNames.find(name => 
            name.toLowerCase().includes('roadmap')
          )];
          
          if (roadmapSheet) {
            // Convert sheet to JSON array
            const roadmapData = XLSX.utils.sheet_to_json(roadmapSheet, { header: 1, defval: '' });
            
            if (roadmapData.length > 1) {
              // Convert to CSV-like format and import
              const headers = roadmapData[0].map(h => String(h || '').trim());
              const csvLines = [
                headers.join(','),
                ...roadmapData.slice(1).map(row => 
                  row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
                )
              ];
              const csvText = csvLines.join('\n');
              importCSV(csvText);
            }
          }
          
          // Import Personnel Resourcing sheet (with year headers: FY2026, FY2027, etc.)
          const personnelSheet = workbook.Sheets[workbook.SheetNames.find(name => 
            name.toLowerCase().includes('personnel')
          )];
          
          if (personnelSheet) {
            try {
              const personnelData = XLSX.utils.sheet_to_json(personnelSheet, { header: 1, defval: '' });
              const positionsByYear = {};
              const years = [2026, 2027, 2028];
              let currentYear = null;
              let headers = null;
              
              personnelData.forEach((row, index) => {
                const firstCell = String(row[0] || '').trim();
                
                // Check if this is a year header (FY2026, FY2027, etc.)
                const yearMatch = firstCell.match(/FY(\d{4})/i);
                if (yearMatch) {
                  currentYear = parseInt(yearMatch[1]);
                  if (years.includes(currentYear)) {
                    positionsByYear[currentYear] = [];
                    headers = null; // Reset headers for next section
                  }
                } else if (currentYear && years.includes(currentYear)) {
                  // Check if this is a header row
                  if (firstCell.toLowerCase().includes('position') || 
                      firstCell.toLowerCase().includes('source') ||
                      firstCell.toLowerCase().includes('cost')) {
                    headers = row.map(h => String(h || '').trim());
                  } else if (headers && firstCell) {
                    // This is a data row
                    const position = String(row[headers.findIndex(h => h.toLowerCase().includes('position'))] || '').trim();
                    const source = String(row[headers.findIndex(h => h.toLowerCase().includes('source'))] || '').trim();
                    const cost = parseFloat(row[headers.findIndex(h => h.toLowerCase().includes('cost'))] || 0);
                    const qty = parseFloat(row[headers.findIndex(h => h.toLowerCase().includes('qty'))] || 0);
                    const storyPointsPerMonth = parseFloat(row[headers.findIndex(h => h.toLowerCase().includes('story points'))] || 0);
                    
                    if (position) {
                      positionsByYear[currentYear].push({
                        position,
                        source: source || 'Eclipse',
                        cost: cost || 0,
                        qty: qty || 0,
                        storyPointsPerMonth: storyPointsPerMonth || 0
                      });
                    }
                  }
                }
              });
              
              // Save personnel resourcing data
              if (Object.keys(positionsByYear).length > 0) {
                try {
                  const existing = localStorage.getItem('resourcing-data');
                  const existingData = existing ? JSON.parse(existing) : {};
                  Object.keys(positionsByYear).forEach(year => {
                    existingData[year] = positionsByYear[year];
                  });
                  localStorage.setItem('resourcing-data', JSON.stringify(existingData));
                } catch (e) {
                  console.error('Error saving personnel resourcing data:', e);
                }
              }
            } catch (e) {
              console.error('Error importing personnel resourcing:', e);
            }
          }
          
          // Import Hardware Resourcing sheet (with fiscal year headers: FY26, FY27, etc.)
          const hardwareSheet = workbook.Sheets[workbook.SheetNames.find(name => 
            name.toLowerCase().includes('hardware')
          )];
          
          if (hardwareSheet) {
            try {
              const hardwareData = XLSX.utils.sheet_to_json(hardwareSheet, { header: 1, defval: '' });
              const hardwareByYear = {};
              const fiscalYears = ['FY26', 'FY27', 'FY28'];
              let currentYear = null;
              let headers = null;
              
              hardwareData.forEach((row, index) => {
                const firstCell = String(row[0] || '').trim();
                
                // Check if this is a fiscal year header (FY26, FY27, etc.)
                if (fiscalYears.includes(firstCell)) {
                  currentYear = firstCell;
                  hardwareByYear[currentYear] = [];
                  headers = null; // Reset headers for next section
                } else if (currentYear && fiscalYears.includes(currentYear)) {
                  // Check if this is a header row
                  if (firstCell.toLowerCase().includes('category') || 
                      firstCell.toLowerCase().includes('item') ||
                      firstCell.toLowerCase().includes('cost')) {
                    headers = row.map(h => String(h || '').trim());
                  } else if (headers && (firstCell || String(row[1] || '').trim())) {
                    // This is a data row
                    const category = String(row[headers.findIndex(h => h.toLowerCase().includes('category'))] || '').trim();
                    const item = String(row[headers.findIndex(h => h.toLowerCase().includes('item'))] || '').trim();
                    const description = String(row[headers.findIndex(h => h.toLowerCase().includes('description'))] || '').trim();
                    const cost = parseFloat(row[headers.findIndex(h => h.toLowerCase().includes('cost'))] || 0);
                    const qty = parseFloat(row[headers.findIndex(h => h.toLowerCase().includes('qty'))] || 0);
                    
                    if (item || category) {
                      hardwareByYear[currentYear].push({
                        category: category || '',
                        item: item || '',
                        description: description || '',
                        cost: cost || 0,
                        qty: qty || 0
                      });
                    }
                  }
                }
              });
              
              // Save hardware resourcing data
              if (Object.keys(hardwareByYear).length > 0) {
                try {
                  const existing = localStorage.getItem('hardware-resourcing-data');
                  const existingData = existing ? JSON.parse(existing) : {};
                  Object.keys(hardwareByYear).forEach(year => {
                    existingData[year] = hardwareByYear[year];
                  });
                  localStorage.setItem('hardware-resourcing-data', JSON.stringify(existingData));
                } catch (e) {
                  console.error('Error saving hardware resourcing data:', e);
                }
              }
            } catch (e) {
              console.error('Error importing hardware resourcing:', e);
            }
          }
          
          resolve();
        } catch (error) {
          console.error('Error importing Excel file:', error);
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Export tasks to CSV (roadmap only)
  const exportCSV = () => {
    const { headers, rows } = buildRoadmapData();
    
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roadmap-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export all fields to Excel with 3 tabs
  const exportExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    // ===== SHEET 1: ROADMAP =====
    const { headers: roadmapHeaders, rows: roadmapRows } = buildRoadmapData();
    const roadmapData = [roadmapHeaders, ...roadmapRows];
    const roadmapSheet = XLSX.utils.aoa_to_sheet(roadmapData);
    XLSX.utils.book_append_sheet(workbook, roadmapSheet, 'Roadmap');
    
    // ===== SHEET 2: PERSONNEL RESOURCING (with year headers) =====
    try {
      const resourcingDataRaw = localStorage.getItem('resourcing-data');
      if (resourcingDataRaw) {
        const resourcingData = JSON.parse(resourcingDataRaw);
        const personnelHeaders = ['Position', 'Source', 'Cost', 'QTY', 'Total (Per Year)', 'Overall', 'Story Points Per Month'];
        const years = [2026, 2027, 2028];
        const personnelRows = [];
        
        years.forEach(year => {
          const positions = resourcingData[year] || [];
          if (positions.length > 0) {
            // Add year header row
            personnelRows.push([`FY${year}`, '', '', '', '', '', '']);
            // Add column headers
            personnelRows.push(personnelHeaders);
            // Add data rows
            positions.forEach(pos => {
              const totalPerYear = pos.cost * pos.qty;
              const overall = pos.source === 'Eclipse' ? pos.qty : 0;
              personnelRows.push([
                pos.position || '',
                pos.source || '',
                pos.cost || 0,
                pos.qty || 0,
                totalPerYear,
                overall,
                pos.storyPointsPerMonth || 0,
              ]);
            });
            // Add empty row between years
            personnelRows.push(['', '', '', '', '', '', '']);
          }
        });
        
        if (personnelRows.length > 0) {
          const personnelData = personnelRows;
          const personnelSheet = XLSX.utils.aoa_to_sheet(personnelData);
          XLSX.utils.book_append_sheet(workbook, personnelSheet, 'Personnel Resourcing');
        }
      }
    } catch (e) {
      console.error('Error exporting personnel resourcing data:', e);
    }
    
    // ===== SHEET 3: HARDWARE RESOURCING (with fiscal year headers) =====
    try {
      const hardwareDataRaw = localStorage.getItem('hardware-resourcing-data');
      if (hardwareDataRaw) {
        const hardwareData = JSON.parse(hardwareDataRaw);
        const hardwareHeaders = ['Category', 'Item', 'Description', 'Cost', 'QTY', 'Total'];
        const fiscalYears = ['FY26', 'FY27', 'FY28'];
        const hardwareRows = [];
        
        fiscalYears.forEach(year => {
          const items = hardwareData[year] || [];
          if (items.length > 0) {
            // Add fiscal year header row
            hardwareRows.push([year, '', '', '', '', '']);
            // Add column headers
            hardwareRows.push(hardwareHeaders);
            // Add data rows
            items.forEach(item => {
              const total = item.cost * item.qty;
              hardwareRows.push([
                item.category || '',
                item.item || '',
                item.description || '',
                item.cost || 0,
                item.qty || 0,
                total,
              ]);
            });
            // Add empty row between years
            hardwareRows.push(['', '', '', '', '', '']);
          }
        });
        
        if (hardwareRows.length > 0) {
          const hardwareSheetData = hardwareRows;
          const hardwareSheet = XLSX.utils.aoa_to_sheet(hardwareSheetData);
          XLSX.utils.book_append_sheet(workbook, hardwareSheet, 'Hardware Resourcing');
        }
      }
    } catch (e) {
      console.error('Error exporting hardware resourcing data:', e);
    }
    
    // Export the workbook as Excel file
    XLSX.writeFile(workbook, 'roadmap-export.xlsx');
  };

  const addTask = (task) => {
    const t = {
      id: simpleId(),
      type: task.type || 'story',
      title: task.title || '',
      epic: task.epic || '',
      feature: task.feature || '',
      story: task.story || '',
      assignedTo: task.assignedTo || '',
      state: task.state || 'New',
      storyPoints: task.storyPoints || 0,
      start_date: task.start_date || task.startDate || '',
      finish_date: task.finish_date || task.finishDate || task.deliverableDate || '',
      duration_days: task.duration_days || 0,
      startDate: task.start_date || task.startDate || '',
      deliverableDate: task.finish_date || task.finishDate || task.deliverableDate || '',
      finishDate: task.finish_date || task.finishDate || task.deliverableDate || '',
      ...task
    };
    setTasks((s) => [...s, t]);
    return t;
  };

  const updateTask = (id, patch) => {
    setTasks((s) => s.map((t) => {
      if (t.id === id) {
        const updated = { ...t, ...patch };
        // Sync date fields
        if (patch.start_date || patch.startDate) {
          updated.startDate = updated.start_date || updated.startDate;
          updated.start_date = updated.startDate;
        }
        if (patch.finish_date || patch.finishDate || patch.deliverableDate) {
          updated.finishDate = updated.finish_date || updated.finishDate || updated.deliverableDate;
          updated.deliverableDate = updated.finishDate;
          updated.finish_date = updated.finishDate;
        }
        // Preserve manual flags if they're being set
        if (patch._manuallySetStart !== undefined) {
          updated._manuallySetStart = patch._manuallySetStart;
        }
        if (patch._manuallySetFinish !== undefined) {
          updated._manuallySetFinish = patch._manuallySetFinish;
        }
        if (patch._manuallySetStoryPoints !== undefined) {
          updated._manuallySetStoryPoints = patch._manuallySetStoryPoints;
        }
        // Recalculate duration
        if (updated.startDate && updated.finishDate) {
          const start = new Date(updated.startDate);
          const finish = new Date(updated.finishDate);
          updated.duration_days = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
        }
        return updated;
      }
      return t;
    }));
  };

  const deleteTask = (id) => setTasks((s) => s.filter((t) => t.id !== id));

  // Remove duplicates from existing tasks
  const removeDuplicates = () => {
    const seenItems = new Set();
    const uniqueTasks = [];
    
    // Sort tasks to prioritize keeping items with more complete data
    const sortedTasks = [...tasks].sort((a, b) => {
      // Prioritize items with epic/feature/story set over those without
      const aComplete = (a.epic ? 1 : 0) + (a.feature ? 1 : 0) + (a.story ? 1 : 0);
      const bComplete = (b.epic ? 1 : 0) + (b.feature ? 1 : 0) + (b.story ? 1 : 0);
      return bComplete - aComplete;
    });
    
    sortedTasks.forEach(task => {
      let uniqueKey = '';
      const epicName = (task.epic || task.title || '').toLowerCase().trim();
      const featureName = (task.feature || task.title || '').toLowerCase().trim();
      const storyName = (task.story || task.title || '').toLowerCase().trim();
      
      if (task.type === 'epic') {
        uniqueKey = `epic:${epicName}`;
      } else if (task.type === 'feature') {
        uniqueKey = `feature:${epicName}:${featureName}`;
      } else if (task.type === 'user story' || task.type === 'story') {
        // For stories, use epic:feature:story combination
        // If epic/feature are missing, use story name alone as fallback
        if (epicName && featureName && storyName) {
          uniqueKey = `story:${epicName}:${featureName}:${storyName}`;
        } else if (epicName && storyName) {
          uniqueKey = `story:${epicName}::${storyName}`;
        } else if (storyName) {
          uniqueKey = `story:::${storyName}`;
        } else {
          uniqueKey = `story:${task.id}`; // Fallback to ID if no name
        }
      }
      
      // Skip if we've already seen this item
      if (uniqueKey && seenItems.has(uniqueKey)) {
        return; // Skip duplicate
      }
      
      if (uniqueKey) {
        seenItems.add(uniqueKey);
      }
      uniqueTasks.push(task);
    });
    
    setTasks(uniqueTasks);
  };

  return (
    <TasksContext.Provider value={{ 
      tasks, 
      addTask, 
      updateTask, 
      deleteTask, 
      importCSV,
      importExcel,
      exportCSV,
      exportExcel,
      saveTasks,
      removeDuplicates,
      isLoading,
      useFirebase 
    }}>
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
