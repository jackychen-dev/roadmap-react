import React, { createContext, useContext, useEffect, useState } from "react";

function simpleId() {
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
}

const TasksContext = createContext(null);

export function TasksProvider({ children }) {
  const [tasks, setTasks] = useState(() => {
    try {
      const raw = localStorage.getItem("roadmap-tasks:v1");
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("roadmap-tasks:v1", JSON.stringify(tasks));
    } catch (e) {}
  }, [tasks]);

  // Listen for storage events to sync across tabs/components
  useEffect(() => {
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
  }, [tasks]);

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
        // Format with separate title columns
        epicName = title1Idx >= 0 ? values[title1Idx] : '';
        featureName = title2Idx >= 0 ? values[title2Idx] : '';
        storyName = title3Idx >= 0 ? values[title3Idx] : '';
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
      } else {
        // Multi-column format: use epic/feature/story names
        if (typeLower === 'epic') {
          itemName = epicName || title;
          currentEpic = itemName;
          currentFeature = ''; // Reset feature when new epic
        } else if (typeLower === 'feature') {
          itemName = featureName || title;
          // Use Title 1 (epic) if available, otherwise keep current epic
          if (epicName) {
            currentEpic = epicName;
          }
          currentFeature = itemName;
        } else if (typeLower === 'user story' || typeLower === 'story') {
          itemName = storyName || title;
          // Use Title 1 (epic) and Title 2 (feature) if available
          if (epicName) {
            currentEpic = epicName;
          }
          if (featureName) {
            currentFeature = featureName;
          }
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
        
        // Handle "26-Nov" format (day-month, assume current year or next year if month has passed)
        const dayMonthMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})$/i);
        if (dayMonthMatch) {
          const day = parseInt(dayMonthMatch[1]);
          const monthStr = dayMonthMatch[2];
          const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
          const month = monthNames.findIndex(m => m === monthStr.toLowerCase());
          if (month >= 0) {
            const now = new Date();
            let year = now.getFullYear();
            // If the month has passed this year, use next year
            if (month < now.getMonth() || (month === now.getMonth() && day < now.getDate())) {
              year = year + 1;
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

  // Export tasks to CSV
  const exportCSV = () => {
    // First, organize tasks hierarchically
    const epicMap = {};
    const featureMap = {};
    
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
    
    // Build CSV rows with aggregated data
    const headers = ['ID', 'Work Item Type', 'Title', 'Assigned To', 'State', 'Story Points', 'Start Date', 'Finish Date', 'Duration (Days)', 'Demo'];
    const rows = [];
    
    // Add epics
    Object.values(epicMap).forEach(epic => {
      const type = 'Epic';
      const title = epic.epic || epic.title || '';
      const startDate = epic.start_date || epic.startDate || '';
      const finishDate = epic.finish_date || epic.finishDate || epic.deliverableDate || '';
      let duration = 0;
      if (startDate && finishDate) {
        const start = new Date(startDate);
        const finish = new Date(finishDate);
        duration = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      rows.push([
        epic.id || `epic-${title}`,
        type,
        title,
        epic.assignedTo || '',
        epic.state || 'New',
        epic.storyPoints || 0,
        startDate,
        finishDate,
        duration,
        epic.demo || '',
      ]);
      
      // Add features under this epic
      Object.values(epic.features || {}).forEach(feature => {
        const featureType = 'Feature';
        const featureTitle = feature.feature || feature.title || '';
        const featureStartDate = feature.start_date || feature.startDate || '';
        const featureFinishDate = feature.finish_date || feature.finishDate || feature.deliverableDate || '';
        let featureDuration = 0;
        if (featureStartDate && featureFinishDate) {
          const start = new Date(featureStartDate);
          const finish = new Date(featureFinishDate);
          featureDuration = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
        }
        
        rows.push([
          feature.id || `feature-${featureTitle}`,
          featureType,
          featureTitle,
          feature.assignedTo || '',
          feature.state || 'New',
          feature.storyPoints || 0,
          featureStartDate,
          featureFinishDate,
          featureDuration,
          feature.demo || '',
        ]);
        
        // Add stories under this feature
        (feature.stories || []).forEach(story => {
          const storyType = 'User Story';
          const storyTitle = story.story || story.title || '';
          const storyStartDate = story.start_date || story.startDate || '';
          const storyFinishDate = story.finish_date || story.finishDate || story.deliverableDate || '';
          let storyDuration = story.duration_days || 0;
          if (!storyDuration && storyStartDate && storyFinishDate) {
            const start = new Date(storyStartDate);
            const finish = new Date(storyFinishDate);
            storyDuration = Math.ceil((finish - start) / (1000 * 60 * 60 * 24)) + 1;
          }
          
          rows.push([
            story.id,
            storyType,
            storyTitle,
            story.assignedTo || '',
            story.state || 'New',
            story.storyPoints || 0,
            storyStartDate,
            storyFinishDate,
            storyDuration,
            story.demo || '',
          ]);
        });
      });
    });
    
    // Add any standalone tasks that don't fit into the hierarchy
    tasks.forEach(task => {
      if (task.type !== 'epic' && task.type !== 'feature' && task.type !== 'user story' && task.type !== 'story') {
        const type = 'Task';
        const title = task.title || '';
        rows.push([
          task.id,
          type,
          title,
          task.assignedTo || '',
          task.state || 'New',
          task.storyPoints || 0,
          task.start_date || task.startDate || '',
          task.finish_date || task.finishDate || task.deliverableDate || '',
          task.duration_days || 0,
          task.demo || '',
        ]);
      }
    });
    
    const csvContent = [
      headers.join(','),
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
    <TasksContext.Provider value={{ tasks, addTask, updateTask, deleteTask, importCSV, exportCSV, removeDuplicates }}>
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
