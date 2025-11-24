import React, { useState, useMemo, useRef, useCallback } from "react";
import { Box, Typography, Select, MenuItem, FormControl, InputLabel, ToggleButtonGroup, ToggleButton, TextField, IconButton, Collapse, Button, Snackbar, Alert } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/Publish";
import { useTasks } from "../store/TasksContext";

function daysBetween(start, end) {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  return Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
}

// Format date for display in date input (convert YYYY-MM-DD to MM/DD/YY format)
function formatDateForInput(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear() % 100).padStart(2, '0');
  return `${month}/${day}/${year}`;
}

// Parse MM/DD/YY format back to YYYY-MM-DD
function parseDateFromInput(inputValue) {
  if (!inputValue) return '';
  const parts = inputValue.split('/');
  if (parts.length !== 3) return '';
  const month = parts[0];
  const day = parts[1];
  let year = parseInt(parts[2], 10);
  // Assume years 00-30 are 2000-2030, years 31-99 are 1931-1999
  if (year <= 30) {
    year = 2000 + year;
  } else {
    year = 1900 + year;
  }
  return `${year}-${month}-${day}`;
}

export default function RoadmapGantt() {
  const { tasks, updateTask, addTask, setTasks } = useTasks();
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [selectedEpic, setSelectedEpic] = useState('all');
  const [selectedFeature, setSelectedFeature] = useState('all');
  const [selectedStory, setSelectedStory] = useState('all');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pushSuccess, setPushSuccess] = useState(false);
  const [scale, setScale] = useState('months'); // 'weeks', 'months', 'years'
  const [expandedEpics, setExpandedEpics] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [showDemos, setShowDemos] = useState(false);
  const containerRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const updateThrottle = 8; // ~120fps for smoother dragging

  // Filter tasks that have dates
  const tasksWithDates = useMemo(() => {
    return tasks.filter(t => (t.start_date || t.startDate) && (t.finish_date || t.finishDate || t.deliverableDate));
  }, [tasks]);

  // Get unique epics, features, and stories for filters
  const epics = useMemo(() => {
    return [...new Set(tasksWithDates.map(t => t.epic).filter(Boolean))];
  }, [tasksWithDates]);

  const features = useMemo(() => {
    if (selectedEpic === 'all') {
      return [...new Set(tasksWithDates.map(t => t.feature).filter(Boolean))];
    }
    return [...new Set(tasksWithDates.filter(t => t.epic === selectedEpic).map(t => t.feature).filter(Boolean))];
  }, [tasksWithDates, selectedEpic]);

  const stories = useMemo(() => {
    if (selectedEpic === 'all' && selectedFeature === 'all') {
      return [...new Set(tasksWithDates.map(t => t.story).filter(Boolean))];
    }
    return [...new Set(tasksWithDates.filter(t => 
      (selectedEpic === 'all' || t.epic === selectedEpic) &&
      (selectedFeature === 'all' || t.feature === selectedFeature)
    ).map(t => t.story).filter(Boolean))];
  }, [tasksWithDates, selectedEpic, selectedFeature]);

  // Get all epics and features for dropdowns (for editing)
  const allEpics = useMemo(() => {
    return [...new Set(tasks.map(t => t.epic).filter(Boolean))];
  }, [tasks]);

  const allFeatures = useMemo(() => {
    const features = [];
    tasks.filter(t => t.type === 'feature').forEach(t => {
      if (t.epic && t.feature) {
        features.push({ epic: t.epic, feature: t.feature });
      }
    });
    return features;
  }, [tasks]);

  // Get demo options from Demo milestones stored in localStorage
  const demoOptions = useMemo(() => {
    try {
      const saved = localStorage.getItem('demo-milestones-data');
      if (saved) {
        const milestones = JSON.parse(saved);
        return milestones.map(m => m.milestone).filter(Boolean);
      }
    } catch (e) {
      console.error('Failed to load demo milestones:', e);
    }
    // Default demo options if none found
    return [
      'Kit App 1.0 (Wireframing and System Config)',
      'Proposal Portal 1.0',
      'XR Experience',
      'Virtual Commissioning Kit App',
      'Project Portal 1.0',
      'Solution Recall',
    ];
  }, []);

  // Get maximum story points capacity per month from Resourcing data
  // Returns a function that takes a year and returns capacity for that year
  const getMaxStoryPointsForYear = useMemo(() => {
    try {
      const saved = localStorage.getItem('resourcing-data');
      if (saved) {
        const resourcingData = JSON.parse(saved);
        return (year) => {
          if (resourcingData[year]) {
            const positions = resourcingData[year];
            const totalCapacity = positions.reduce((sum, pos) => {
              return sum + ((pos.storyPointsPerMonth || 0) * (pos.qty || 0));
            }, 0);
            return totalCapacity;
          }
          return null;
        };
      }
    } catch (e) {
      console.error('Failed to load resourcing data:', e);
    }
    return () => null;
  }, []);

  // Filter tasks based on selections
  const filteredTasks = useMemo(() => {
    return tasksWithDates.filter(task => {
      if (selectedEpic !== 'all' && task.epic !== selectedEpic) return false;
      if (selectedFeature !== 'all' && task.feature !== selectedFeature) return false;
      if (selectedStory !== 'all' && task.story !== selectedStory) return false;
      return true;
    });
  }, [tasksWithDates, selectedEpic, selectedFeature, selectedStory]);

  // Calculate date range - extend to end of 2028
  const dateRange = useMemo(() => {
    try {
      const endDate = new Date('2028-12-31');
      
      if (filteredTasks.length === 0) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: start.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
      }

      const dates = [];
      filteredTasks.forEach(t => {
        if (t.start_date || t.startDate) dates.push(t.start_date || t.startDate);
        if (t.finish_date || t.finishDate || t.deliverableDate) dates.push(t.finish_date || t.finishDate || t.deliverableDate);
      });

      if (dates.length === 0) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: start.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
      }

      const validDates = dates.filter(d => d && !isNaN(new Date(d).getTime()));
      if (validDates.length === 0) {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: start.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
      }

      const minDate = validDates.reduce((a, b) => (a < b ? a : b));
      const start = new Date(minDate);
      if (isNaN(start.getTime())) {
        const today = new Date();
        start.setFullYear(today.getFullYear());
        start.setMonth(today.getMonth());
        start.setDate(1);
      } else {
        start.setDate(1); // Start of month
      }
      
      return { start: start.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
    } catch (error) {
      console.error('Error calculating date range:', error);
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const endDate = new Date('2028-12-31');
      return { start: start.toISOString().slice(0, 10), end: endDate.toISOString().slice(0, 10) };
    }
  }, [filteredTasks]);

  // Generate date headers based on scale
  const dateHeaders = useMemo(() => {
    if (!dateRange || !dateRange.start || !dateRange.end) {
      return [];
    }
    const result = [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return [];
    }
    
    if (scale === 'years') {
      const current = new Date(start.getFullYear(), 0, 1);
      while (current <= end) {
        result.push({ date: new Date(current), label: current.getFullYear().toString(), width: 365 });
        current.setFullYear(current.getFullYear() + 1);
      }
    } else if (scale === 'months') {
      const current = new Date(start.getFullYear(), start.getMonth(), 1);
      while (current <= end) {
        result.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else { // weeks
      const current = new Date(start);
      // Start from beginning of week
      const dayOfWeek = current.getDay();
      current.setDate(current.getDate() - dayOfWeek);
      
      while (current <= end) {
        result.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          width: 7
        });
        current.setDate(current.getDate() + 7);
      }
    }
    
    return result;
  }, [dateRange, scale]);

  // Calculate pixels per unit based on scale
  const pixelsPerUnit = useMemo(() => {
    if (scale === 'years') return 30; // 30px per year
    if (scale === 'months') {
      // Calculate to show exactly 12 months in viewport
      // Average month is ~30 days, so 12 months = ~360 days
      // Assuming viewport timeline area is ~1200px wide (after label column)
      // To show 12 months: 1200px / 360 days = ~3.33px per day
      // Using 2.8px per day to ensure 12 months fit comfortably
      return 2.8; // 2.8px per day - shows ~12 months in viewport
    }
    return 4; // 4px per day for weeks
  }, [scale]);

  const rowHeight = 40;

  // Color generation function - generates consistent colors for epics and features
  const getColorForEpic = useCallback((epicName) => {
    // Generate a hash from epic name to get consistent color
    let hash = 0;
    for (let i = 0; i < epicName.length; i++) {
      hash = epicName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use hue range 0-360, keep saturation and lightness consistent for epics
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 70%, 50%)`; // Epic color - vibrant
  }, []);

  const getColorForFeature = useCallback((epicName, featureName) => {
    // Generate base hue from epic name
    let epicHash = 0;
    for (let i = 0; i < epicName.length; i++) {
      epicHash = epicName.charCodeAt(i) + ((epicHash << 5) - epicHash);
    }
    const baseHue = Math.abs(epicHash) % 360;
    
    // Generate variation from feature name (smaller variation to keep similar theme)
    let featureHash = 0;
    for (let i = 0; i < featureName.length; i++) {
      featureHash = featureName.charCodeAt(i) + ((featureHash << 5) - featureHash);
    }
    // Small hue variation (±20 degrees) to keep similar theme
    const hueVariation = (Math.abs(featureHash) % 40) - 20;
    const hue = (baseHue + hueVariation + 360) % 360;
    
    // Features slightly lighter than epics
    return `hsl(${hue}, 65%, 55%)`;
  }, []);

  const getColorForStory = useCallback((epicName, featureName) => {
    // Stories use same hue as their feature, just different saturation/lightness
    let epicHash = 0;
    for (let i = 0; i < epicName.length; i++) {
      epicHash = epicName.charCodeAt(i) + ((epicHash << 5) - epicHash);
    }
    const baseHue = Math.abs(epicHash) % 360;
    
    let featureHash = 0;
    for (let i = 0; i < featureName.length; i++) {
      featureHash = featureName.charCodeAt(i) + ((featureHash << 5) - featureHash);
    }
    const hueVariation = (Math.abs(featureHash) % 40) - 20;
    const hue = (baseHue + hueVariation + 360) % 360;
    
    // Stories lighter and slightly less saturated than features
    return `hsl(${hue}, 60%, 60%)`;
  }, []);

  // Generate consistent color for each demo milestone
  const getColorForDemo = useCallback((demoName) => {
    if (!demoName) return null;
    // Generate a hash from demo name to get consistent color
    let hash = 0;
    for (let i = 0; i < demoName.length; i++) {
      hash = demoName.charCodeAt(i) + ((hash << 5) - hash);
    }
    // Use hue range 0-360, keep saturation and lightness consistent for demos
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 80%, 50%)`; // Demo color - vibrant
  }, []);

  // Helper function to calculate aggregated values for features
  const calculateFeatureAggregates = (feature) => {
    const stories = feature.stories || [];
    if (stories.length === 0) return feature;
    
    // Check if dates/story points were manually set (don't overwrite manual edits)
    const manuallySetStart = feature._manuallySetStart || false;
    const manuallySetFinish = feature._manuallySetFinish || false;
    const manuallySetStoryPoints = feature._manuallySetStoryPoints || false;
    
    const result = { ...feature };
    
    // Always calculate story points from children unless manually set
    if (!manuallySetStoryPoints) {
      const totalStoryPoints = stories.reduce((sum, story) => {
        return sum + (story.storyPoints || 0);
      }, 0);
      result.storyPoints = totalStoryPoints;
    }
    
    // Always calculate start date (earliest) from children unless manually set
    if (!manuallySetStart) {
      const startDates = stories
        .map(s => s.start_date || s.startDate)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (startDates.length > 0) {
        const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        result.start_date = earliestStart.toISOString().slice(0, 10);
        result.startDate = earliestStart.toISOString().slice(0, 10);
      } else {
        // Clear dates if no stories have dates
        result.start_date = '';
        result.startDate = '';
      }
    }
    
    // Always calculate finish date (latest) from children unless manually set
    if (!manuallySetFinish) {
      const finishDates = stories
        .map(s => s.finish_date || s.finishDate || s.deliverableDate)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (finishDates.length > 0) {
        const latestFinish = new Date(Math.max(...finishDates.map(d => d.getTime())));
        result.finish_date = latestFinish.toISOString().slice(0, 10);
        result.finishDate = latestFinish.toISOString().slice(0, 10);
        result.deliverableDate = latestFinish.toISOString().slice(0, 10);
      } else {
        // Clear dates if no stories have dates
        result.finish_date = '';
        result.finishDate = '';
        result.deliverableDate = '';
      }
    }
    
    return result;
  };
  
  // Helper function to calculate aggregated values for epics
  const calculateEpicAggregates = (epic) => {
    const features = Object.values(epic.features || {});
    const allStories = features.flatMap(f => f.stories || []);
    // For dates, use all children (features and stories)
    const allChildrenForDates = [...features, ...allStories];
    
    if (allChildrenForDates.length === 0) return epic;
    
    // Check if dates/story points were manually set (don't overwrite manual edits)
    const manuallySetStart = epic._manuallySetStart || false;
    const manuallySetFinish = epic._manuallySetFinish || false;
    const manuallySetStoryPoints = epic._manuallySetStoryPoints || false;
    
    const result = { ...epic };
    
    // Always calculate story points from children unless manually set
    if (!manuallySetStoryPoints) {
      let totalStoryPoints = 0;
      if (features.length > 0) {
        // Use features' story points (which already include their stories from calculateFeatureAggregates)
        totalStoryPoints = features.reduce((sum, feature) => {
          return sum + (feature.storyPoints || 0);
        }, 0);
      } else {
        // No features, sum stories directly
        totalStoryPoints = allStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
      }
      result.storyPoints = totalStoryPoints;
    }
    
    // Always calculate start date (earliest) from children unless manually set
    if (!manuallySetStart) {
      const startDates = allChildrenForDates
        .map(c => c.start_date || c.startDate)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (startDates.length > 0) {
        const earliestStart = new Date(Math.min(...startDates.map(d => d.getTime())));
        result.start_date = earliestStart.toISOString().slice(0, 10);
        result.startDate = earliestStart.toISOString().slice(0, 10);
      } else {
        // Clear dates if no children have dates
        result.start_date = '';
        result.startDate = '';
      }
    }
    
    // Always calculate finish date (latest) from children unless manually set
    if (!manuallySetFinish) {
      const finishDates = allChildrenForDates
        .map(c => c.finish_date || c.finishDate || c.deliverableDate)
        .filter(Boolean)
        .map(d => {
          // Handle different date formats
          const dateStr = d.toString();
          // If it's in MM/DD/YYYY format, parse it
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
      } else {
        // Clear dates if no children have dates
        result.finish_date = '';
        result.finishDate = '';
        result.deliverableDate = '';
      }
    }
    
    return result;
  };

  // Organize hierarchically like table view
  const organizedTasks = useMemo(() => {
    const epics = {};
    const epicMap = {};
    
    // First pass: collect epics
    filteredTasks.forEach(task => {
      if (task.type === 'epic') {
        const epicName = task.epic || task.title || 'Unnamed Epic';
        epicMap[epicName] = {
          ...task,
          features: {},
          // Clear manual flags so aggregation can recalculate from children
          _manuallySetStart: false,
          _manuallySetFinish: false,
          _manuallySetStoryPoints: false,
        };
        epics[epicName] = epicMap[epicName];
      }
    });
    
    // Second pass: collect features under epics
    filteredTasks.forEach(task => {
      if (task.type === 'feature' && task.epic) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = {
            id: `epic-${task.epic}`,
            type: 'epic',
            epic: task.epic,
            title: task.epic,
            features: {},
          };
          epics[task.epic] = epicMap[task.epic];
        }
        const featureName = task.feature || task.title || 'Unnamed Feature';
        epicMap[task.epic].features[featureName] = {
          ...task,
          stories: [],
        };
      }
    });
    
    // Third pass: collect stories under features
    filteredTasks.forEach(task => {
      if ((task.type === 'user story' || task.type === 'story') && task.epic && task.feature) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = {
            id: `epic-${task.epic}`,
            type: 'epic',
            epic: task.epic,
            title: task.epic,
            features: {},
            // Clear manual flags so aggregation can recalculate from children
            _manuallySetStart: false,
            _manuallySetFinish: false,
            _manuallySetStoryPoints: false,
          };
          epics[task.epic] = epicMap[task.epic];
        }
        const featureName = task.feature;
        if (!epicMap[task.epic].features[featureName]) {
          epicMap[task.epic].features[featureName] = {
            id: `feature-${featureName}`,
            type: 'feature',
            epic: task.epic,
            feature: featureName,
            title: featureName,
            stories: [],
          };
        }
        epicMap[task.epic].features[featureName].stories.push(task);
      }
    });
    
    // Fourth pass: calculate aggregates for features
    Object.values(epics).forEach(epic => {
      Object.keys(epic.features).forEach(featureName => {
        epic.features[featureName] = calculateFeatureAggregates(epic.features[featureName]);
      });
    });
    
    // Fifth pass: calculate aggregates for epics
    Object.keys(epics).forEach(epicName => {
      epics[epicName] = calculateEpicAggregates(epics[epicName]);
    });
    
    return epics;
  }, [filteredTasks]);

  const toggleEpic = (epic) => {
    setExpandedEpics(prev => ({ ...prev, [epic]: !prev[epic] }));
  };

  const toggleFeature = (epic, feature) => {
    const key = `${epic}-${feature}`;
    setExpandedFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = useCallback(() => {
    // Get all unique epics and features from tasks directly to avoid dependency on organizedTasks
    const epicNames = new Set();
    const featureKeys = new Set();
    
    tasks.forEach(task => {
      if (task.epic) {
        epicNames.add(task.epic);
        if (task.feature) {
          featureKeys.add(`${task.epic}-${task.feature}`);
        }
      }
    });
    
    // Expand all epics
    const expandedEpicsState = {};
    epicNames.forEach(epicName => {
      expandedEpicsState[epicName] = true;
    });
    setExpandedEpics(expandedEpicsState);
    
    // Expand all features
    const expandedFeaturesState = {};
    featureKeys.forEach(key => {
      expandedFeaturesState[key] = true;
    });
    setExpandedFeatures(expandedFeaturesState);
  }, [tasks]);

  const collapseAll = useCallback(() => {
    setExpandedEpics({});
    setExpandedFeatures({});
  }, []);

  const getTaskPosition = useCallback((task) => {
    try {
      if (!task || (!task.start_date && !task.startDate)) {
        return { left: 0, width: 0 };
      }
      
      if (!dateRange || !dateRange.start) {
        return { left: 0, width: 0 };
      }
      
      const start = new Date(task.start_date || task.startDate);
      const end = new Date(task.finish_date || task.finishDate || task.deliverableDate);
      const rangeStart = new Date(dateRange.start);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || isNaN(rangeStart.getTime())) {
        return { left: 0, width: 0 };
      }
      
      let left = 0;
      let width = 0;
      
      if (scale === 'years') {
        const startYear = start.getFullYear();
        const endYear = end.getFullYear();
        const rangeStartYear = rangeStart.getFullYear();
        left = (startYear - rangeStartYear) * pixelsPerUnit;
        width = Math.max(20, (endYear - startYear + 1) * pixelsPerUnit);
      } else if (scale === 'months') {
        const daysDiff = Math.floor((start - rangeStart) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        left = daysDiff * pixelsPerUnit;
        width = Math.max(20, duration * pixelsPerUnit);
      } else { // weeks
        const daysDiff = Math.floor((start - rangeStart) / (1000 * 60 * 60 * 24));
        const duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        left = daysDiff * pixelsPerUnit;
        width = Math.max(20, duration * pixelsPerUnit);
      }
      
      return { left: Math.max(0, left), width: Math.max(0, width) };
    } catch (error) {
      console.error('Error calculating task position:', error, task);
      return { left: 0, width: 0 };
    }
  }, [dateRange, scale, pixelsPerUnit]);

  // Helper function to find or create epic/feature task and update it
  const updateEpicOrFeature = useCallback((epicOrFeature, patch) => {
    // Try to find existing task with matching type and name
    const epicName = epicOrFeature.epic || epicOrFeature.title;
    const featureName = epicOrFeature.feature;
    const isEpic = epicOrFeature.type === 'epic';
    const isFeature = epicOrFeature.type === 'feature';
    
    // Mark fields as manually set if they're being updated
    const updatedPatch = { ...patch };
    if (patch.start_date || patch.startDate) {
      updatedPatch._manuallySetStart = true;
    }
    if (patch.finish_date || patch.finishDate || patch.deliverableDate) {
      updatedPatch._manuallySetFinish = true;
    }
    if (patch.storyPoints !== undefined && patch.storyPoints !== null) {
      updatedPatch._manuallySetStoryPoints = true;
    }
    
    if (isEpic) {
      // Find epic task
      const epicTask = tasks.find(t => t.type === 'epic' && (t.epic === epicName || t.title === epicName));
      if (epicTask) {
        updateTask(epicTask.id, updatedPatch);
      } else {
        // Create new epic task if it doesn't exist
        const newEpic = {
          id: `epic-${Date.now()}-${Math.random()}`,
          type: 'epic',
          epic: epicName,
          title: epicName,
          ...updatedPatch
        };
        addTask(newEpic);
      }
    } else if (isFeature) {
      // Find feature task
      const featureTask = tasks.find(t => 
        t.type === 'feature' && 
        t.epic === epicName && 
        (t.feature === featureName || t.title === featureName)
      );
      if (featureTask) {
        updateTask(featureTask.id, updatedPatch);
      } else {
        // Create new feature task if it doesn't exist
        const newFeature = {
          id: `feature-${Date.now()}-${Math.random()}`,
          type: 'feature',
          epic: epicName,
          feature: featureName,
          title: featureName,
          ...updatedPatch
        };
        addTask(newFeature);
      }
    } else {
      // For stories, use the ID directly
      updateTask(epicOrFeature.id, updatedPatch);
    }
  }, [tasks, updateTask, addTask]);

  const handleMouseDown = useCallback((e, task, type) => {
    e.preventDefault();
    e.stopPropagation();
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const labelColumnWidth = 950;
    const mouseX = e.clientX - rect.left - labelColumnWidth;
    
    if (type === 'resize') {
      setResizing({ 
        task, 
        startX: mouseX, // Mouse position relative to timeline
        initialMouseX: mouseX, // Same as startX for consistency
        startDate: new Date(task.finish_date || task.finishDate || task.deliverableDate),
        startTaskDate: new Date(task.start_date || task.startDate)
      });
    } else {
      setDragging({ 
        task, 
        startX: mouseX,
        startDate: new Date(task.start_date || task.startDate),
        startTaskFinishDate: new Date(task.finish_date || task.finishDate || task.deliverableDate)
      });
    }
  }, [getTaskPosition]);

  const handleMouseMove = useCallback((e) => {
    if (!containerRef.current) return;
    
    // Reduce throttling for resize operations to make small bars more responsive
    const throttleTime = resizing ? 4 : updateThrottle;
    const now = Date.now();
    if (now - lastUpdateRef.current < throttleTime) return;
    lastUpdateRef.current = now;
    
    const rect = containerRef.current.getBoundingClientRect();
    const labelColumnWidth = 950;
    const currentX = e.clientX - rect.left - labelColumnWidth;
    
    if (!dateRange || !dateRange.start) return;
    
    const rangeStart = new Date(dateRange.start);
    
    if (dragging) {
      const deltaX = currentX - dragging.startX;
      let daysDiff = 0;
      
      if (scale === 'years') {
        daysDiff = Math.round(deltaX / pixelsPerUnit) * 365;
      } else {
        daysDiff = Math.round(deltaX / pixelsPerUnit);
      }
      
      const newStart = new Date(dragging.startDate);
      newStart.setDate(newStart.getDate() + daysDiff);
      
      const duration = daysBetween(dragging.startDate, dragging.startTaskFinishDate);
      const newFinish = new Date(newStart);
      newFinish.setDate(newFinish.getDate() + duration - 1);
      
      // Only update if the new start date is valid
      if (newStart.getTime() >= rangeStart.getTime() && !isNaN(newStart.getTime()) && !isNaN(newFinish.getTime())) {
        const dateStr = newStart.toISOString().slice(0, 10);
        const finishStr = newFinish.toISOString().slice(0, 10);
        
        // Use updateEpicOrFeature for epics/features to ensure proper syncing and manual flags
        const taskType = dragging.task.type || '';
        if (taskType === 'epic' || taskType === 'feature') {
          updateEpicOrFeature(dragging.task, {
            start_date: dateStr,
            startDate: dateStr,
            finish_date: finishStr,
            finishDate: finishStr,
            deliverableDate: finishStr,
          });
        } else {
          // For stories, use updateTask directly
          updateTask(dragging.task.id, {
            start_date: dateStr,
            startDate: dateStr,
            finish_date: finishStr,
            finishDate: finishStr,
            deliverableDate: finishStr,
          });
        }
      }
    }
    
    if (resizing) {
      // Use the initial mouse position relative to timeline for calculation
      const initialX = resizing.initialMouseX !== undefined ? resizing.initialMouseX : resizing.startX;
      const deltaX = currentX - initialX;
      let daysDiff = 0;
      
      if (scale === 'years') {
        daysDiff = Math.round(deltaX / pixelsPerUnit) * 365;
      } else {
        // For small bars, use more precise calculation
        daysDiff = deltaX / pixelsPerUnit;
        
        // For very small movements, ensure we still register the change
        if (Math.abs(daysDiff) < 0.5) {
          // For movements less than 0.5 days, use direction-based rounding
          daysDiff = deltaX > 0 ? 1 : (deltaX < 0 ? -1 : 0);
        } else if (Math.abs(daysDiff) < 1) {
          // For movements between 0.5 and 1 day, use ceil/floor
          daysDiff = deltaX > 0 ? Math.ceil(daysDiff) : Math.floor(daysDiff);
        } else {
          // For larger movements, round normally
          daysDiff = Math.round(daysDiff);
        }
      }
      
      const newFinish = new Date(resizing.startDate);
      newFinish.setDate(newFinish.getDate() + daysDiff);
      
      // Only update if the new finish date is valid and after start date
      if (newFinish >= resizing.startTaskDate && !isNaN(newFinish.getTime())) {
        const finishStr = newFinish.toISOString().slice(0, 10);
        
        // Use updateEpicOrFeature for epics/features to ensure proper syncing and manual flags
        const taskType = resizing.task.type || '';
        if (taskType === 'epic' || taskType === 'feature') {
          updateEpicOrFeature(resizing.task, {
            finish_date: finishStr,
            finishDate: finishStr,
            deliverableDate: finishStr,
          });
        } else {
          // For stories, use updateTask directly
          updateTask(resizing.task.id, {
            finish_date: finishStr,
            finishDate: finishStr,
            deliverableDate: finishStr,
          });
        }
      }
    }
  }, [dragging, resizing, scale, pixelsPerUnit, updateTask, updateEpicOrFeature, dateRange]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  React.useEffect(() => {
    if (dragging || resizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  const scrollToTask = useCallback((task) => {
    if (!containerRef.current || !task) return;
    
    if (!dateRange || !dateRange.start) return;
    
    const startDate = task.start_date || task.startDate;
    if (!startDate) return;
    
    const start = new Date(startDate);
    const rangeStart = new Date(dateRange.start);
    
    let scrollLeft = 0;
    
    if (scale === 'years') {
      const startYear = start.getFullYear();
      const rangeStartYear = rangeStart.getFullYear();
      scrollLeft = (startYear - rangeStartYear) * pixelsPerUnit;
    } else if (scale === 'months') {
      const daysDiff = Math.floor((start - rangeStart) / (1000 * 60 * 60 * 24));
      scrollLeft = daysDiff * pixelsPerUnit;
    } else { // weeks
      const daysDiff = Math.floor((start - rangeStart) / (1000 * 60 * 60 * 24));
      scrollLeft = daysDiff * pixelsPerUnit;
    }
    
    const timelineContainer = containerRef.current;
    // Scroll to position, accounting for label column width
    timelineContainer.scrollTo({
      left: Math.max(0, scrollLeft),
      behavior: 'smooth'
    });
  }, [scale, pixelsPerUnit, dateRange]);

  const totalWidth = useMemo(() => {
    if (!dateHeaders || dateHeaders.length === 0) return 0;
    return dateHeaders.reduce((sum, header) => sum + (header.width * pixelsPerUnit), 0);
  }, [dateHeaders, pixelsPerUnit]);

  // Calculate story points aligned with timeline periods
  // Formula: story points per story / number of periods spanned (months/years/weeks), then summed
  const storyPointsByPeriod = useMemo(() => {
    const periodTotals = {};
    
    // Only process stories (not epics or features) - filter by type
    const stories = tasks.filter(task => {
      const type = (task.type || '').toLowerCase();
      return (type === 'user story' || type === 'story') && 
             task.storyPoints && 
             task.storyPoints > 0 &&
             (task.start_date || task.startDate) &&
             (task.finish_date || task.finishDate || task.deliverableDate);
    });
    
    stories.forEach(story => {
      const startDate = story.start_date || story.startDate;
      const finishDate = story.finish_date || story.finishDate || story.deliverableDate;
      const storyPoints = story.storyPoints || 0;
      
      if (!startDate || !finishDate || !storyPoints) return;
      
      const start = new Date(startDate);
      const finish = new Date(finishDate);
      
      if (isNaN(start.getTime()) || isNaN(finish.getTime())) return;
      
      if (scale === 'years') {
        // Calculate number of years spanned
        const startYear = start.getFullYear();
        const finishYear = finish.getFullYear();
        const yearsSpanned = finishYear - startYear + 1;
        
        if (yearsSpanned <= 0) return;
        
        // Story points per year = total story points / number of years
        const pointsPerYear = storyPoints / yearsSpanned;
        
        // Distribute points across the years this story spans
        for (let year = startYear; year <= finishYear; year++) {
          const periodKey = `${year}`;
          if (!periodTotals[periodKey]) {
            periodTotals[periodKey] = 0;
          }
          periodTotals[periodKey] += pointsPerYear;
        }
      } else if (scale === 'months') {
        // Calculate number of months spanned (inclusive)
        const startMonth = start.getFullYear() * 12 + start.getMonth();
        const finishMonth = finish.getFullYear() * 12 + finish.getMonth();
        const monthsSpanned = finishMonth - startMonth + 1;
        
        if (monthsSpanned <= 0) return;
        
        // Story points per month = total story points / number of months
        const pointsPerMonth = storyPoints / monthsSpanned;
        
        // Distribute points across the months spans
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(finish.getFullYear(), finish.getMonth(), 1);
        
        while (current <= endMonth) {
          const periodKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
          if (!periodTotals[periodKey]) {
            periodTotals[periodKey] = 0;
          }
          periodTotals[periodKey] += pointsPerMonth;
          current.setMonth(current.getMonth() + 1);
        }
      } else { // weeks
        // Calculate number of weeks spanned
        const startWeek = new Date(start);
        const dayOfWeek = startWeek.getDay();
        startWeek.setDate(startWeek.getDate() - dayOfWeek); // Start from Sunday
        
        const finishWeek = new Date(finish);
        const finishDayOfWeek = finishWeek.getDay();
        finishWeek.setDate(finishWeek.getDate() - finishDayOfWeek); // Start from Sunday
        
        // Count weeks
        let weeksSpanned = 0;
        let currentWeek = new Date(startWeek);
        while (currentWeek <= finishWeek) {
          weeksSpanned++;
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
        
        if (weeksSpanned <= 0) return;
        
        // Story points per week = total story points / number of weeks
        const pointsPerWeek = storyPoints / weeksSpanned;
        
        // Distribute points across the weeks this story spans
        currentWeek = new Date(startWeek);
        while (currentWeek <= finishWeek) {
          const periodKey = `${currentWeek.getFullYear()}-${String(currentWeek.getMonth() + 1).padStart(2, '0')}-${String(currentWeek.getDate()).padStart(2, '0')}`;
          if (!periodTotals[periodKey]) {
            periodTotals[periodKey] = 0;
          }
          periodTotals[periodKey] += pointsPerWeek;
          currentWeek.setDate(currentWeek.getDate() + 7);
        }
      }
    });
    
    // Match with dateHeaders and create aligned array
    if (!dateHeaders || dateHeaders.length === 0) {
      return { periodData: [], total: 0 };
    }
    const periodData = dateHeaders.map(header => {
      let periodKey = '';
      const headerDate = new Date(header.date);
      const year = headerDate.getFullYear();
      
      if (scale === 'years') {
        periodKey = `${year}`;
      } else if (scale === 'months') {
        periodKey = `${year}-${String(headerDate.getMonth() + 1).padStart(2, '0')}`;
      } else { // weeks
        // For weeks, use the header date directly
        const weekStart = new Date(headerDate);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        periodKey = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
      }
      
      return {
        periodKey,
        points: Math.round((periodTotals[periodKey] || 0) * 100) / 100,
        label: header.label,
        width: header.width * pixelsPerUnit,
        headerWidth: header.width * pixelsPerUnit, // Ensure exact match
        year: year, // Store year for capacity lookup
      };
    });
    
    // Calculate total - sum of all period points
    const total = periodData.reduce((sum, period) => sum + period.points, 0);
    
    return { periodData, total };
  }, [tasks, dateHeaders, scale, pixelsPerUnit]);

  // Ensure we have valid dateRange and dateHeaders
  const safeDateRange = useMemo(() => {
    return dateRange || { start: new Date().toISOString().slice(0, 10), end: '2028-12-31' };
  }, [dateRange]);
  
  // If dateHeaders is empty, generate default headers
  const safeDateHeaders = useMemo(() => {
    if (dateHeaders && dateHeaders.length > 0) {
      return dateHeaders;
    }
    // Generate default headers for the current month to end of 2028
    const defaultStart = new Date();
    defaultStart.setDate(1); // Start of current month
    const defaultEnd = new Date('2028-12-31');
    const result = [];
    
    if (scale === 'months') {
      const current = new Date(defaultStart.getFullYear(), defaultStart.getMonth(), 1);
      while (current <= defaultEnd) {
        result.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          width: new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate()
        });
        current.setMonth(current.getMonth() + 1);
      }
    } else if (scale === 'years') {
      const current = new Date(defaultStart.getFullYear(), 0, 1);
      while (current <= defaultEnd) {
        result.push({ date: new Date(current), label: current.getFullYear().toString(), width: 365 });
        current.setFullYear(current.getFullYear() + 1);
      }
    } else { // weeks
      const current = new Date(defaultStart);
      const dayOfWeek = current.getDay();
      current.setDate(current.getDate() - dayOfWeek);
      while (current <= defaultEnd) {
        result.push({ 
          date: new Date(current), 
          label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          width: 7
        });
        current.setDate(current.getDate() + 7);
      }
    }
    return result;
  }, [dateHeaders, scale]);

  // Debug: Log to verify component is rendering
  console.log('RoadmapGantt rendering', { 
    tasksCount: tasks.length, 
    tasksWithDatesCount: tasksWithDates.length,
    dateHeadersCount: dateHeaders?.length || 0,
    safeDateHeadersCount: safeDateHeaders?.length || 0,
    dateRange 
  });

  const handleSave = useCallback(() => {
    try {
      // Explicitly save to localStorage (though it's already auto-saving)
      localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  }, [tasks]);

  const handlePushToTable = useCallback(() => {
    try {
      // Ensure all changes are saved to localStorage first
      localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
      
      // Force a reload from localStorage to ensure table view gets latest data
      // Dispatch a custom event that TasksContext can listen to
      window.dispatchEvent(new CustomEvent('roadmap-tasks-updated', { 
        detail: { tasks: JSON.parse(JSON.stringify(tasks)) } // Deep copy
      }));
      
      setPushSuccess(true);
      setTimeout(() => setPushSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to push to table:', error);
    }
  }, [tasks]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gantt Chart</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<UnfoldLessIcon />}
            onClick={collapseAll}
            size="small"
          >
            Collapse All
          </Button>
          <Button
            variant={showDemos ? "contained" : "outlined"}
            onClick={() => setShowDemos(!showDemos)}
            size="small"
            color={showDemos ? "primary" : "inherit"}
          >
            {showDemos ? "Turn off Demos" : "Turn on Demos"}
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            size="small"
          >
            Save
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={<PublishIcon />}
            onClick={handlePushToTable}
            size="small"
          >
            Push to Table
          </Button>
          <ToggleButtonGroup
            value={scale}
            exclusive
            onChange={(e, newScale) => newScale && setScale(newScale)}
            size="small"
          >
            <ToggleButton value="weeks">Weeks</ToggleButton>
            <ToggleButton value="months">Months</ToggleButton>
            <ToggleButton value="years">Years</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Epic</InputLabel>
          <Select
            value={selectedEpic}
            label="Epic"
            onChange={(e) => {
              setSelectedEpic(e.target.value);
              setSelectedFeature('all');
              setSelectedStory('all');
            }}
          >
            <MenuItem value="all">All Epics</MenuItem>
            {epics.map(epic => (
              <MenuItem key={epic} value={epic}>{epic}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }} disabled={selectedEpic === 'all'}>
          <InputLabel>Feature</InputLabel>
          <Select
            value={selectedFeature}
            label="Feature"
            onChange={(e) => {
              setSelectedFeature(e.target.value);
              setSelectedStory('all');
            }}
          >
            <MenuItem value="all">All Features</MenuItem>
            {features.map(feature => (
              <MenuItem key={feature} value={feature}>{feature}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 150 }} disabled={selectedEpic === 'all' && selectedFeature === 'all'}>
          <InputLabel>Story</InputLabel>
          <Select
            value={selectedStory}
            label="Story"
            onChange={(e) => setSelectedStory(e.target.value)}
          >
            <MenuItem value="all">All Stories</MenuItem>
            {stories.map(story => (
              <MenuItem key={story} value={story}>{story}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      <Box
        ref={containerRef}
        sx={{
          overflowX: 'auto',
          overflowY: 'auto',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: 'background.paper',
          maxHeight: '80vh', // Enable vertical scrolling while keeping headers sticky
        }}
      >
        <Box sx={{ display: 'flex', minWidth: `${Math.max(totalWidth, 950) + 950}px` }}>
          {/* Label column */}
          <Box sx={{ width: 950, borderRight: '1px solid', borderColor: 'divider', position: 'sticky', left: 0, top: 0, alignSelf: 'flex-start', backgroundColor: 'background.paper', zIndex: 10 }}>
            {/* Story Points label row - aligns with story points summary */}
            <Box sx={{ height: rowHeight, borderBottom: '1px solid', borderColor: 'divider', p: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: '0.75rem', backgroundColor: 'rgba(59, 130, 246, 0.1)', position: 'sticky', top: 0, zIndex: 6 }}>
              Story Points
            </Box>
            {/* Column headers row - aligns with date headers */}
            <Box sx={{ height: rowHeight, borderBottom: '2px solid', borderColor: 'divider', p: 1, fontWeight: 'bold', display: 'flex', gap: 1, fontSize: '0.75rem', position: 'sticky', top: rowHeight, zIndex: 5 }}>
              <Box sx={{ width: 120 }}>Epic</Box>
              <Box sx={{ width: 250 }}>Feature</Box>
              <Box sx={{ width: 200 }}>Story</Box>
              <Box sx={{ width: 150 }}>Start Date</Box>
              <Box sx={{ width: 150 }}>Finish Date</Box>
              <Box sx={{ width: 120 }}>Story Points</Box>
              <Box sx={{ width: 200 }}>Demo</Box>
            </Box>
            {Object.entries(organizedTasks).map(([epicName, epic]) => (
              <React.Fragment key={epicName}>
                {/* Epic row */}
                <Box 
                  sx={{ 
                    height: rowHeight, 
                    borderBottom: '1px solid', 
                    borderColor: 'divider', 
                    p: 0.5, 
                    fontWeight: 600, 
                    backgroundColor: 'rgba(255,255,255,0.05)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.08)',
                    }
                  }}
                  onDoubleClick={() => scrollToTask(epic)}
                >
                  <IconButton size="small" onClick={() => toggleEpic(epicName)} sx={{ width: 24, height: 24 }}>
                    {expandedEpics[epicName] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                  </IconButton>
                  <TextField
                    size="small"
                    value={epic.epic || epicName || ''}
                    onChange={(e) => updateEpicOrFeature(epic, { epic: e.target.value, title: e.target.value })}
                    variant="outlined"
                    sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                    placeholder="Epic name"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      scrollToTask(epic);
                    }}
                    tabIndex={0}
                  />
                  <Box sx={{ width: 100 }} />
                  <Box sx={{ width: 200 }} />
                  <TextField
                    size="small"
                    type="date"
                    value={epic.start_date || epic.startDate || ''}
                    onChange={(e) => updateEpicOrFeature(epic, { start_date: e.target.value, startDate: e.target.value })}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                    tabIndex={0}
                  />
                  <TextField
                    size="small"
                    type="date"
                    value={epic.finish_date || epic.finishDate || epic.deliverableDate || ''}
                    onChange={(e) => updateEpicOrFeature(epic, { finish_date: e.target.value, finishDate: e.target.value, deliverableDate: e.target.value })}
                    variant="outlined"
                    InputLabelProps={{ shrink: true }}
                    sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                    tabIndex={0}
                  />
                  <TextField
                    size="small"
                    type="number"
                    value={epic.storyPoints || 0}
                    onChange={(e) => updateEpicOrFeature(epic, { storyPoints: Number(e.target.value) || 0 })}
                    variant="outlined"
                    sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                    tabIndex={0}
                  />
                  <FormControl size="small" sx={{ width: 200 }}>
                    <Select
                      value={epic.demo || ''}
                      onChange={(e) => updateEpicOrFeature(epic, { demo: e.target.value })}
                      displayEmpty
                      sx={{ fontSize: "0.7rem", height: "28px" }}
                      tabIndex={0}
                    >
                      <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Demo</MenuItem>
                      {demoOptions.map(demo => (
                        <MenuItem key={demo} value={demo} sx={{ fontSize: "0.7rem" }}>{demo}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                {/* Features and Stories */}
                <Collapse in={expandedEpics[epicName]} timeout="auto" unmountOnExit>
                  {Object.entries(epic.features || {}).map(([featureName, feature]) => (
                    <React.Fragment key={featureName}>
                      {/* Feature row */}
                      <Box 
                        sx={{ 
                          height: rowHeight, 
                          borderBottom: '1px solid', 
                          borderColor: 'divider', 
                          p: 0.5, 
                          pl: 4, 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          cursor: 'pointer',
                          '&:hover': {
                            backgroundColor: 'rgba(255,255,255,0.05)',
                          }
                        }}
                        onDoubleClick={() => scrollToTask(feature)}
                      >
                        <IconButton size="small" onClick={() => toggleFeature(epicName, featureName)} sx={{ width: 24, height: 24 }}>
                          {expandedFeatures[`${epicName}-${featureName}`] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                        </IconButton>
                        <FormControl size="small" sx={{ width: 120 }}>
                          <Select
                            value={feature.epic || epicName || ''}
                            onChange={(e) => updateEpicOrFeature(feature, { epic: e.target.value })}
                            displayEmpty
                            sx={{ fontSize: "0.7rem", height: "28px" }}
                            tabIndex={0}
                          >
                            <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Epic</MenuItem>
                            {allEpics.map(e => (
                              <MenuItem key={e} value={e} sx={{ fontSize: "0.7rem" }}>{e}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          value={feature.feature || featureName || ''}
                          onChange={(e) => updateEpicOrFeature(feature, { feature: e.target.value, title: e.target.value })}
                          variant="outlined"
                          sx={{ width: 250, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                          placeholder="Feature name"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            scrollToTask(feature);
                          }}
                          tabIndex={0}
                        />
                        <Box sx={{ width: 200 }} />
                        <TextField
                          size="small"
                          type="date"
                          value={feature.start_date || feature.startDate || ''}
                          onChange={(e) => updateEpicOrFeature(feature, { start_date: e.target.value, startDate: e.target.value })}
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                          tabIndex={0}
                        />
                        <TextField
                          size="small"
                          type="date"
                          value={feature.finish_date || feature.finishDate || feature.deliverableDate || ''}
                          onChange={(e) => updateEpicOrFeature(feature, { finish_date: e.target.value, finishDate: e.target.value, deliverableDate: e.target.value })}
                          variant="outlined"
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                          tabIndex={0}
                        />
                        <TextField
                          size="small"
                          type="number"
                          value={feature.storyPoints || 0}
                          onChange={(e) => updateEpicOrFeature(feature, { storyPoints: Number(e.target.value) || 0 })}
                          variant="outlined"
                          sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                          tabIndex={0}
                        />
                        <FormControl size="small" sx={{ width: 200 }}>
                          <Select
                            value={feature.demo || ''}
                            onChange={(e) => updateEpicOrFeature(feature, { demo: e.target.value })}
                            displayEmpty
                            sx={{ fontSize: "0.7rem", height: "28px" }}
                            tabIndex={0}
                          >
                            <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Demo</MenuItem>
                            {demoOptions.map(demo => (
                              <MenuItem key={demo} value={demo} sx={{ fontSize: "0.7rem" }}>{demo}</MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Box>
                      
                      {/* Story rows */}
                      <Collapse in={expandedFeatures[`${epicName}-${featureName}`]} timeout="auto" unmountOnExit>
                        {(feature.stories || []).map(story => {
                          const filteredFeatureOptions = story.epic 
                            ? allFeatures.filter(f => f.epic === story.epic)
                            : [];
                          
                          return (
                            <Box 
                              key={story.id} 
                              sx={{ 
                                height: rowHeight, 
                                borderBottom: '1px solid', 
                                borderColor: 'divider', 
                                p: 0.5, 
                                pl: 8, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'rgba(255,255,255,0.05)',
                                }
                              }}
                              onDoubleClick={() => scrollToTask(story)}
                            >
                              <Box sx={{ width: 24 }} />
                              <FormControl size="small" sx={{ width: 120 }}>
                                <Select
                                  value={story.epic || ''}
                                  onChange={(e) => updateTask(story.id, { epic: e.target.value })}
                                  displayEmpty
                                  sx={{ fontSize: "0.7rem", height: "28px" }}
                                  tabIndex={0}
                                >
                                  <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Epic</MenuItem>
                                  {allEpics.map(e => (
                                    <MenuItem key={e} value={e} sx={{ fontSize: "0.7rem" }}>{e}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <FormControl size="small" sx={{ width: 150 }}>
                                <Select
                                  value={story.feature || ''}
                                  onChange={(e) => updateTask(story.id, { feature: e.target.value })}
                                  displayEmpty
                                  sx={{ fontSize: "0.7rem", height: "28px" }}
                                  tabIndex={0}
                                >
                                  <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Feature</MenuItem>
                                  {filteredFeatureOptions.map(f => (
                                    <MenuItem key={f.feature} value={f.feature} sx={{ fontSize: "0.7rem" }}>{f.feature}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                              <TextField
                                size="small"
                                value={story.story || story.title || ''}
                                onChange={(e) => updateTask(story.id, { story: e.target.value, title: e.target.value })}
                                variant="outlined"
                                sx={{ width: 200, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                                placeholder="Story name"
                                onDoubleClick={(e) => {
                                  e.stopPropagation();
                                  scrollToTask(story);
                                }}
                                tabIndex={0}
                              />
                              <TextField
                                size="small"
                                type="date"
                                value={story.start_date || story.startDate || ''}
                                onChange={(e) => updateTask(story.id, { start_date: e.target.value, startDate: e.target.value })}
                                variant="outlined"
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                                tabIndex={0}
                              />
                              <TextField
                                size="small"
                                type="date"
                                value={story.finish_date || story.finishDate || story.deliverableDate || ''}
                                onChange={(e) => updateTask(story.id, { finish_date: e.target.value, finishDate: e.target.value, deliverableDate: e.target.value })}
                                variant="outlined"
                                InputLabelProps={{ shrink: true }}
                                sx={{ width: 150, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                                tabIndex={0}
                              />
                              <TextField
                                size="small"
                                type="number"
                                value={story.storyPoints || 0}
                                onChange={(e) => updateTask(story.id, { storyPoints: Number(e.target.value) || 0 })}
                                variant="outlined"
                                sx={{ width: 120, "& .MuiInputBase-input": { fontSize: "0.7rem", py: 0.5 } }}
                                tabIndex={0}
                              />
                              <FormControl size="small" sx={{ width: 200 }}>
                                <Select
                                  value={story.demo || ''}
                                  onChange={(e) => updateTask(story.id, { demo: e.target.value })}
                                  displayEmpty
                                  sx={{ fontSize: "0.7rem", height: "28px" }}
                                  tabIndex={0}
                                >
                                  <MenuItem value="" sx={{ fontSize: "0.7rem" }}>Select Demo</MenuItem>
                                  {demoOptions.map(demo => (
                                    <MenuItem key={demo} value={demo} sx={{ fontSize: "0.7rem" }}>{demo}</MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          );
                        })}
                      </Collapse>
                    </React.Fragment>
                  ))}
                </Collapse>
              </React.Fragment>
            ))}
          </Box>

          {/* Timeline column */}
          <Box sx={{ position: 'relative', flex: 1 }}>
            {/* Story Points Summary Row - above date headers */}
            <Box sx={{ display: 'flex', height: rowHeight, borderBottom: '1px solid', borderColor: 'divider', position: 'sticky', top: 0, backgroundColor: 'background.paper', zIndex: 6 }}>
              {storyPointsByPeriod && storyPointsByPeriod.periodData && storyPointsByPeriod.periodData.length > 0 ? (
                storyPointsByPeriod.periodData.map((period, idx) => {
                  const headerWidth = safeDateHeaders[idx]?.width * pixelsPerUnit || period.width || 100;
                  const maxCapacity = getMaxStoryPointsForYear(period.year);
                  const exceedsCapacity = maxCapacity !== null && period.points > maxCapacity;
                  return (
                    <Box
                      key={idx}
                      sx={{
                        width: `${headerWidth}px`,
                        minWidth: `${headerWidth}px`,
                        maxWidth: `${headerWidth}px`,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        p: 0.5,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: period.points > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.05)',
                        color: exceedsCapacity ? 'error.main' : (period.points > 0 ? 'primary.main' : 'text.secondary'),
                      }}
                    >
                      <Box>{period.points > 0 ? period.points.toFixed(2) : '0.00'}</Box>
                      {maxCapacity !== null && (
                        <Box sx={{ fontSize: '0.65rem', opacity: 0.8, mt: 0.25 }}>
                          / {maxCapacity.toFixed(2)}
                        </Box>
                      )}
                    </Box>
                  );
                })
              ) : (
                safeDateHeaders.length > 0 ? safeDateHeaders.map((header, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      minWidth: `${header.width * pixelsPerUnit}px`,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                      p: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(59, 130, 246, 0.05)',
                      color: 'text.secondary',
                    }}
                  >
                    0.00
                  </Box>
                )) : null
              )}
            </Box>
            
            {/* Date headers */}
            <Box sx={{ display: 'flex', height: rowHeight, borderBottom: '2px solid', borderColor: 'divider', position: 'sticky', top: rowHeight, backgroundColor: 'background.paper', zIndex: 5 }}>
              {safeDateHeaders.length > 0 ? safeDateHeaders.map((header, idx) => (
                <Box
                  key={idx}
                  sx={{
                    minWidth: `${header.width * pixelsPerUnit}px`,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    p: 0.5,
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {header.label}
                </Box>
              )) : (
                <Box sx={{ p: 4, width: '100%', textAlign: 'center', color: 'text.secondary', minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography variant="body1">
                    No date range available. Please import tasks with dates.
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Task bars */}
            {Object.entries(organizedTasks).map(([epicName, epic]) => {
              const epicRow = (
                <Box key={`epic-${epicName}`} sx={{ height: rowHeight, position: 'relative', borderBottom: '1px solid', borderColor: 'divider' }}>
                  {epic.start_date || epic.startDate ? (() => {
                    const { left, width } = getTaskPosition(epic);
                    return (
                      <>
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${left}px`,
                            width: `${width}px`,
                            height: '70%',
                            top: '15%',
                            backgroundColor: getColorForEpic(epicName),
                            borderRadius: 1,
                            cursor: 'default',
                            display: 'flex',
                            alignItems: 'center',
                            px: 1,
                            fontSize: '0.75rem',
                            color: 'white',
                            userSelect: 'none',
                            opacity: 0.7,
                            border: showDemos && epic.demo ? `3px solid ${getColorForDemo(epic.demo)}` : 'none',
                            boxShadow: showDemos && epic.demo ? `0 0 8px ${getColorForDemo(epic.demo)}` : 'none',
                          }}
                        >
                          {epic.epic || epicName}
                        </Box>
                      </>
                    );
                  })() : null}
                </Box>
              );

              const featureRows = Object.entries(epic.features || {}).map(([featureName, feature]) => {
                const featureRow = (
                  <Box key={`feature-${featureName}`} sx={{ height: rowHeight, position: 'relative', borderBottom: '1px solid', borderColor: 'divider' }}>
                    {feature.start_date || feature.startDate ? (() => {
                      const { left, width } = getTaskPosition(feature);
                      return (
                        <>
                          <Box
                            sx={{
                              position: 'absolute',
                              left: `${left}px`,
                              width: `${width}px`,
                              height: '70%',
                              top: '15%',
                              backgroundColor: getColorForFeature(epicName, featureName),
                              borderRadius: 1,
                              cursor: 'default',
                              display: 'flex',
                              alignItems: 'center',
                              px: 1,
                              fontSize: '0.75rem',
                              color: 'white',
                              userSelect: 'none',
                              opacity: 0.7,
                              border: showDemos && feature.demo ? `3px solid ${getColorForDemo(feature.demo)}` : 'none',
                              boxShadow: showDemos && feature.demo ? `0 0 8px ${getColorForDemo(feature.demo)}` : 'none',
                            }}
                          >
                            {feature.feature || featureName}
                          </Box>
                        </>
                      );
                    })() : null}
                  </Box>
                );

                const storyRows = (feature.stories || []).map(story => {
                  const { left, width } = getTaskPosition(story);
                  return (
                    <Box key={story.id} sx={{ height: rowHeight, position: 'relative', borderBottom: '1px solid', borderColor: 'divider' }}>
                      <Box
                        onMouseDown={(e) => handleMouseDown(e, story, 'drag')}
                        sx={{
                          position: 'absolute',
                          left: `${left}px`,
                          width: `${width}px`,
                          height: '70%',
                          top: '15%',
                          backgroundColor: getColorForStory(epicName, featureName),
                          borderRadius: 1,
                          cursor: 'grab',
                          display: 'flex',
                          alignItems: 'center',
                          px: 1,
                          fontSize: '0.75rem',
                          color: 'white',
                          userSelect: 'none',
                          '&:active': { cursor: 'grabbing' },
                          border: showDemos && story.demo ? `3px solid ${getColorForDemo(story.demo)}` : 'none',
                          boxShadow: showDemos && story.demo ? `0 0 8px ${getColorForDemo(story.demo)}` : 'none',
                        }}
                      >
                        {story.story || story.title}
                      </Box>
                      <Box
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleMouseDown(e, story, 'resize');
                        }}
                        sx={{
                          position: 'absolute',
                          left: width < 20 ? `${left + width}px` : `${left + width - 8}px`,
                          width: width < 20 ? '16px' : '16px',
                          height: '100%',
                          cursor: 'ew-resize',
                          zIndex: 3,
                          backgroundColor: width < 30 ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.25)',
                          },
                        }}
                      />
                    </Box>
                  );
                });

                return (
                  <React.Fragment key={`feature-fragment-${featureName}`}>
                    {expandedEpics[epicName] && featureRow}
                    {expandedEpics[epicName] && expandedFeatures[`${epicName}-${featureName}`] && storyRows}
                  </React.Fragment>
                );
              });

              return (
                <React.Fragment key={`epic-fragment-${epicName}`}>
                  {epicRow}
                  {expandedEpics[epicName] && featureRows}
                </React.Fragment>
              );
            })}
          </Box>

           {/* Story Points Summary Row - aligned with timeline */}
           <Box sx={{ display: 'flex', height: rowHeight, borderTop: '2px solid', borderColor: 'divider', position: 'sticky', bottom: 0, backgroundColor: 'background.paper', zIndex: 5 }}>
             <Box sx={{ width: 950, borderRight: '1px solid', borderColor: 'divider', p: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
               Story Points
             </Box>
             {storyPointsByPeriod.periodData.map((period, idx) => {
               const maxCapacity = getMaxStoryPointsForYear(period.year);
               const exceedsCapacity = maxCapacity !== null && period.points > maxCapacity;
               return (
                 <Box
                   key={idx}
                   sx={{
                     minWidth: `${period.width}px`,
                     borderRight: '1px solid',
                     borderColor: 'divider',
                     p: 0.5,
                     fontSize: '0.75rem',
                     fontWeight: 500,
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     backgroundColor: period.points > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                     color: exceedsCapacity ? 'error.main' : 'inherit',
                   }}
                 >
                   {period.points > 0 ? period.points.toFixed(2) : ''}
                 </Box>
               );
             })}
           </Box>
        </Box>
      </Box>
      
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSaveSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Changes saved successfully!
        </Alert>
      </Snackbar>
      <Snackbar
        open={pushSuccess}
        autoHideDuration={3000}
        onClose={() => setPushSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setPushSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Changes pushed to Table View!
        </Alert>
      </Snackbar>
    </Box>
  );
}
