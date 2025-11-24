import React, { useState, useMemo, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Button,
  IconButton,
  Chip,
  Box,
  Typography,
  Collapse,
  Menu,
  MenuItem,
  Select,
  FormControl,
  Snackbar,
  Alert,
} from "@mui/material";
import { useTasks } from "../store/TasksContext";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import SaveIcon from "@mui/icons-material/Save";

function EditableRow({ item, level, isExpanded, onToggle, onChange, onDelete, epicOptions = [], featureOptions = [], storyOptions = [], demoOptions = [] }) {
  const indentLevel = level * 3;
  const isEpic = item.type === 'epic';
  const isFeature = item.type === 'feature';
  const isStory = item.type === 'user story' || item.type === 'story';

  const filteredFeatureOptions = useMemo(() => {
    if (!item.epic) return [];
    return featureOptions.filter(f => f.epic === item.epic);
  }, [item.epic, featureOptions]);

  const filteredStoryOptions = useMemo(() => {
    if (!item.epic || !item.feature) return [];
    return storyOptions.filter(s => s.epic === item.epic && s.feature === item.feature);
  }, [item.epic, item.feature, storyOptions]);

  return (
    <TableRow sx={{ backgroundColor: level === 0 ? 'rgba(255,255,255,0.05)' : level === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
      <TableCell sx={{ pl: `${indentLevel + 2}px`, minWidth: 200 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {(isEpic || isFeature) && (
            <IconButton size="small" onClick={onToggle}>
              {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
          <TextField
            size="small"
            value={isEpic ? item.epic : isFeature ? item.feature : item.story || item.title || ''}
            onChange={(e) => {
              if (isEpic) onChange({ ...item, epic: e.target.value, title: e.target.value });
              else if (isFeature) onChange({ ...item, feature: e.target.value, title: e.target.value });
              else onChange({ ...item, story: e.target.value, title: e.target.value });
            }}
            placeholder={isEpic ? "Epic name" : isFeature ? "Feature name" : "Story name"}
            variant="outlined"
            sx={{ flex: 1, "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
          />
        </Box>
      </TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        {isEpic ? (
          <Chip label="Epic" size="small" color="primary" />
        ) : isFeature ? (
          <Chip label="Feature" size="small" color="secondary" />
        ) : (
          <Chip label="Story" size="small" />
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {isEpic ? (
          <TextField
            size="small"
            value={item.epic || ''}
            onChange={(e) => onChange({ ...item, epic: e.target.value, title: e.target.value })}
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        ) : isFeature ? (
          <FormControl size="small" sx={{ width: "100%" }}>
            <Select
              value={item.epic || ''}
              onChange={(e) => onChange({ ...item, epic: e.target.value })}
              displayEmpty
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="">Select Epic</MenuItem>
              {epicOptions.map(epic => (
                <MenuItem key={epic} value={epic}>{epic}</MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <FormControl size="small" sx={{ width: "100%" }}>
            <Select
              value={item.epic || ''}
              onChange={(e) => onChange({ ...item, epic: e.target.value })}
              displayEmpty
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="">Select Epic</MenuItem>
              {epicOptions.map(epic => (
                <MenuItem key={epic} value={epic}>{epic}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {isEpic ? (
          <TextField
            size="small"
            value=""
            disabled
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        ) : isFeature ? (
          <TextField
            size="small"
            value={item.feature || ''}
            onChange={(e) => onChange({ ...item, feature: e.target.value, title: e.target.value })}
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        ) : (
          <FormControl size="small" sx={{ width: "100%" }}>
            <Select
              value={item.feature || ''}
              onChange={(e) => onChange({ ...item, feature: e.target.value })}
              displayEmpty
              sx={{ fontSize: "0.75rem" }}
            >
              <MenuItem value="">Select Feature</MenuItem>
              {filteredFeatureOptions.map(f => (
                <MenuItem key={f.feature} value={f.feature}>{f.feature}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        {isEpic || isFeature ? (
          <TextField
            size="small"
            value=""
            disabled
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        ) : (
          <TextField
            size="small"
            value={item.story || ''}
            onChange={(e) => onChange({ ...item, story: e.target.value, title: e.target.value })}
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        {isEpic || isFeature ? (
          <TextField
            size="small"
            type="date"
            value={item.start_date || item.startDate || ''}
            disabled
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
            helperText={isEpic ? "Calculated from children" : "Calculated from stories"}
          />
        ) : (
          <TextField
            size="small"
            type="date"
            value={item.start_date || item.startDate || ''}
            onChange={(e) => {
              const newStart = e.target.value;
              const update = { ...item, start_date: newStart, startDate: newStart };
              if (newStart && (item.finish_date || item.finishDate)) {
                const finish = item.finish_date || item.finishDate;
                const start = new Date(newStart);
                const end = new Date(finish);
                if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
                  update.duration_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                }
              }
              onChange(update);
            }}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 120 }}>
        {isEpic || isFeature ? (
          <TextField
            size="small"
            type="date"
            value={item.finish_date || item.finishDate || item.deliverableDate || ''}
            disabled
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
            helperText={isEpic ? "Calculated from children" : "Calculated from stories"}
          />
        ) : (
          <TextField
            size="small"
            type="date"
            value={item.finish_date || item.finishDate || item.deliverableDate || ''}
            onChange={(e) => {
              const newFinish = e.target.value;
              const update = { ...item, finish_date: newFinish, finishDate: newFinish, deliverableDate: newFinish };
              if (newFinish && (item.start_date || item.startDate)) {
                const start = item.start_date || item.startDate;
                const startDate = new Date(start);
                const endDate = new Date(newFinish);
                if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && endDate >= startDate) {
                  update.duration_days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                }
              }
              onChange(update);
            }}
            variant="outlined"
            InputLabelProps={{ shrink: true }}
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 100 }}>
        {isEpic || isFeature ? (
          <TextField
            size="small"
            type="number"
            value={item.storyPoints || 0}
            disabled
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
            helperText={isEpic ? "Sum of children" : "Sum of stories"}
          />
        ) : (
          <TextField
            size="small"
            type="number"
            value={item.storyPoints || 0}
            onChange={(e) => onChange({ ...item, storyPoints: Number(e.target.value) || 0 })}
            variant="outlined"
            sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
          />
        )}
      </TableCell>
      <TableCell sx={{ minWidth: 150 }}>
        <TextField
          size="small"
          value={item.assignedTo || ''}
          onChange={(e) => onChange({ ...item, assignedTo: e.target.value })}
          placeholder="Assignee"
          variant="outlined"
          sx={{ width: "100%", "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
        />
      </TableCell>
      <TableCell sx={{ minWidth: 200 }}>
        <FormControl size="small" sx={{ width: "100%" }}>
          <Select
            value={item.demo || ''}
            onChange={(e) => onChange({ ...item, demo: e.target.value })}
            displayEmpty
            sx={{ fontSize: "0.75rem" }}
          >
            <MenuItem value="">Select Demo</MenuItem>
            {demoOptions.map(demo => (
              <MenuItem key={demo} value={demo}>{demo}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>
      <TableCell sx={{ width: 60 }}>
        <IconButton size="small" onClick={() => onDelete(item.id)} color="error">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );
}

export default function RoadmapTable() {
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const [expandedEpics, setExpandedEpics] = useState({});
  const [expandedFeatures, setExpandedFeatures] = useState({});
  const [addTaskAnchor, setAddTaskAnchor] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Helper function to calculate aggregated values for features
  const calculateFeatureAggregates = useCallback((feature) => {
    const stories = feature.stories || [];
    if (stories.length === 0) return feature;
    
    // Check if dates/story points were manually set (don't overwrite manual edits)
    const manuallySetStart = feature._manuallySetStart || false;
    const manuallySetFinish = feature._manuallySetFinish || false;
    const manuallySetStoryPoints = feature._manuallySetStoryPoints || false;
    
    const hasExistingStart = feature.start_date || feature.startDate;
    const hasExistingFinish = feature.finish_date || feature.finishDate || feature.deliverableDate;
    
    const result = { ...feature };
    
    // Always calculate story points from children unless manually set
    if (!manuallySetStoryPoints) {
      const totalStoryPoints = stories.reduce((sum, story) => {
        return sum + (story.storyPoints || 0);
      }, 0);
      result.storyPoints = totalStoryPoints;
    }
    
    // Calculate start date (earliest) if not pre-existing AND not manually set
    if (!hasExistingStart && !manuallySetStart) {
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
    }
    
    // Calculate finish date (latest) if not pre-existing AND not manually set
    if (!hasExistingFinish && !manuallySetFinish) {
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
      }
    }
    
    return result;
  }, []);
  
  // Helper function to calculate aggregated values for epics
  const calculateEpicAggregates = useCallback((epic) => {
    const features = epic.features || [];
    const allStories = features.flatMap(f => f.stories || []);
    // For dates, use all children (features and stories)
    const allChildrenForDates = [...features, ...allStories];
    
    if (allChildrenForDates.length === 0) return epic;
    
    // Check if dates/story points were manually set (don't overwrite manual edits)
    const manuallySetStart = epic._manuallySetStart || false;
    const manuallySetFinish = epic._manuallySetFinish || false;
    const manuallySetStoryPoints = epic._manuallySetStoryPoints || false;
    
    const hasExistingStart = epic.start_date || epic.startDate;
    const hasExistingFinish = epic.finish_date || epic.finishDate || epic.deliverableDate;
    
    const result = { ...epic };
    
    // Always calculate story points from children unless manually set
    if (!manuallySetStoryPoints) {
      let totalStoryPoints = 0;
      if (features.length > 0) {
        // Use features' story points (which already include their stories from calculateFeatureAggregates)
        totalStoryPoints = features.reduce((sum, feature) => {
          // Feature should already have calculated story points from calculateFeatureAggregates
          return sum + (feature.storyPoints || 0);
        }, 0);
      } else {
        // No features, sum stories directly
        totalStoryPoints = allStories.reduce((sum, story) => sum + (story.storyPoints || 0), 0);
      }
      result.storyPoints = totalStoryPoints;
    }
    
    // Calculate start date (earliest) if not pre-existing AND not manually set
    if (!hasExistingStart && !manuallySetStart) {
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
    }
    
    // Calculate finish date (latest) if not pre-existing AND not manually set
    if (!hasExistingFinish && !manuallySetFinish) {
      const finishDates = allChildrenForDates
        .map(c => c.finish_date || c.finishDate || c.deliverableDate)
        .filter(Boolean)
        .map(d => new Date(d))
        .filter(d => !isNaN(d.getTime()));
      
      if (finishDates.length > 0) {
        const latestFinish = new Date(Math.max(...finishDates.map(d => d.getTime())));
        result.finish_date = latestFinish.toISOString().slice(0, 10);
        result.finishDate = latestFinish.toISOString().slice(0, 10);
        result.deliverableDate = latestFinish.toISOString().slice(0, 10);
      }
    }
    
    return result;
  }, []);

  // Organize tasks hierarchically
  const organizedTasks = useMemo(() => {
    const epics = [];
    const epicMap = {};
    
    tasks.forEach(task => {
      if (task.type === 'epic') {
        epicMap[task.epic || task.title] = {
          ...task,
          features: [],
        };
        epics.push(epicMap[task.epic || task.title]);
      }
    });
    
    tasks.forEach(task => {
      if (task.type === 'feature' && task.epic) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = {
            id: `epic-${task.epic}`,
            type: 'epic',
            epic: task.epic,
            title: task.epic,
            features: [],
          };
          epics.push(epicMap[task.epic]);
        }
        epicMap[task.epic].features.push({
          ...task,
          stories: [],
        });
      }
    });
    
    tasks.forEach(task => {
      if ((task.type === 'user story' || task.type === 'story') && task.epic && task.feature) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = {
            id: `epic-${task.epic}`,
            type: 'epic',
            epic: task.epic,
            title: task.epic,
            features: [],
          };
          epics.push(epicMap[task.epic]);
        }
        let feature = epicMap[task.epic].features.find(f => f.feature === task.feature);
        if (!feature) {
          feature = {
            id: `feature-${task.feature}`,
            type: 'feature',
            epic: task.epic,
            feature: task.feature,
            title: task.feature,
            stories: [],
          };
          epicMap[task.epic].features.push(feature);
        }
        feature.stories.push(task);
      }
    });
    
    // Calculate aggregates for features
    epics.forEach(epic => {
      epic.features = epic.features.map(feature => calculateFeatureAggregates(feature));
    });
    
    // Calculate aggregates for epics
    return epics.map(epic => calculateEpicAggregates(epic));
  }, [tasks, calculateFeatureAggregates, calculateEpicAggregates]);

  const epicOptions = useMemo(() => {
    return [...new Set(tasks.filter(t => t.type === 'epic').map(t => t.epic || t.title).filter(Boolean))];
  }, [tasks]);

  const featureOptions = useMemo(() => {
    const features = [];
    tasks.filter(t => t.type === 'feature').forEach(t => {
      if (t.epic && t.feature) {
        features.push({ epic: t.epic, feature: t.feature });
      }
    });
    return features;
  }, [tasks]);

  const storyOptions = useMemo(() => {
    const stories = [];
    tasks.filter(t => t.type === 'user story' || t.type === 'story').forEach(t => {
      if (t.epic && t.feature && t.story) {
        stories.push({ epic: t.epic, feature: t.feature, story: t.story });
      }
    });
    return stories;
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

  const toggleEpic = (epic) => {
    setExpandedEpics(prev => ({ ...prev, [epic]: !prev[epic] }));
  };

  const toggleFeature = (epic, feature) => {
    const key = `${epic}-${feature}`;
    setExpandedFeatures(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddTaskClick = (event) => {
    setAddTaskAnchor(event.currentTarget);
  };

  const handleAddTaskClose = () => {
    setAddTaskAnchor(null);
  };

  const handleAddEpic = () => {
    addTask({ type: 'epic', epic: 'New Epic', title: 'New Epic' });
    handleAddTaskClose();
  };

  const handleAddFeature = () => {
    const firstEpic = epicOptions[0] || 'New Epic';
    addTask({ type: 'feature', epic: firstEpic, feature: 'New Feature', title: 'New Feature' });
    handleAddTaskClose();
  };

  const handleAddStory = () => {
    const firstEpic = epicOptions[0] || 'New Epic';
    const firstFeature = featureOptions.find(f => f.epic === firstEpic)?.feature || 'New Feature';
    addTask({ type: 'user story', epic: firstEpic, feature: firstFeature, story: 'New Story', title: 'New Story' });
    handleAddTaskClose();
  };

  const handleAddFeatureInEpic = (epic) => {
    addTask({ type: 'feature', epic: epic, feature: 'New Feature', title: 'New Feature' });
  };

  const handleAddStoryInFeature = (epic, feature) => {
    addTask({ type: 'user story', epic: epic, feature: feature, story: 'New Story', title: 'New Story' });
  };

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

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Roadmap</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} size="small">
            Save
          </Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddTaskClick}>
            Add Task
          </Button>
        </Box>
        <Menu
          anchorEl={addTaskAnchor}
          open={Boolean(addTaskAnchor)}
          onClose={handleAddTaskClose}
        >
          <MenuItem onClick={handleAddEpic}>Add Epic</MenuItem>
          <MenuItem onClick={handleAddFeature}>Add Feature</MenuItem>
          <MenuItem onClick={handleAddStory}>Add Story</MenuItem>
        </Menu>
      </Box>

      <Table sx={{ backgroundColor: 'background.paper' }}>
        <TableHead>
          <TableRow>
            <TableCell>Epic</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Epic</TableCell>
            <TableCell>Feature</TableCell>
            <TableCell>Story</TableCell>
            <TableCell>Start Date</TableCell>
            <TableCell>Finish Date</TableCell>
            <TableCell>Story Points</TableCell>
            <TableCell>Assigned To</TableCell>
            <TableCell>Demo</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizedTasks.map((epic) => (
            <React.Fragment key={epic.id || epic.epic}>
              <EditableRow
                item={epic}
                level={0}
                isExpanded={expandedEpics[epic.epic]}
                onToggle={() => toggleEpic(epic.epic)}
                onChange={(update) => updateTask(epic.id, update)}
                onDelete={deleteTask}
                epicOptions={epicOptions}
                featureOptions={featureOptions}
                storyOptions={storyOptions}
                demoOptions={demoOptions}
              />
              <TableRow>
                <TableCell colSpan={11} sx={{ py: 0, border: 0 }}>
                  <Collapse in={expandedEpics[epic.epic]} timeout="auto" unmountOnExit>
                    <Box sx={{ pl: 4 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddFeatureInEpic(epic.epic)}>
                          Add Feature
                        </Button>
                      </Box>
                      {epic.features.map((feature) => (
                        <React.Fragment key={feature.id || feature.feature}>
                          <EditableRow
                            item={feature}
                            level={1}
                            isExpanded={expandedFeatures[`${epic.epic}-${feature.feature}`]}
                            onToggle={() => toggleFeature(epic.epic, feature.feature)}
                            onChange={(update) => updateTask(feature.id, update)}
                            onDelete={deleteTask}
                            epicOptions={epicOptions}
                            featureOptions={featureOptions}
                            storyOptions={storyOptions}
                            demoOptions={demoOptions}
                          />
                          <TableRow>
                            <TableCell colSpan={11} sx={{ py: 0, border: 0 }}>
                              <Collapse in={expandedFeatures[`${epic.epic}-${feature.feature}`]} timeout="auto" unmountOnExit>
                                <Box sx={{ pl: 4 }}>
                                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                                    <Button size="small" startIcon={<AddIcon />} onClick={() => handleAddStoryInFeature(epic.epic, feature.feature)}>
                                      Add Story
                                    </Button>
                                  </Box>
                                  {feature.stories.map((story) => (
                                    <EditableRow
                                      key={story.id}
                                      item={story}
                                      level={2}
                                      isExpanded={false}
                                      onToggle={() => {}}
                                      onChange={(update) => updateTask(story.id, update)}
                                      onDelete={deleteTask}
                                      epicOptions={epicOptions}
                                      featureOptions={featureOptions}
                                      storyOptions={storyOptions}
                                      demoOptions={demoOptions}
                                    />
                                  ))}
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))}
                    </Box>
                  </Collapse>
                </TableCell>
              </TableRow>
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
      
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
    </Box>
  );
}

