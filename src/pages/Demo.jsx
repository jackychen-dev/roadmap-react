import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Paper,
  TextField,
  Select,
  MenuItem,
  FormControl,
} from '@mui/material';

const STORAGE_KEY = 'demo-milestones-data';

const DEFAULT_MILESTONES = [
  { milestone: 'Kit App 1.0 (Wireframing and System Config)', date: '3/1/2026', demo: '', color: '#1a1a1a' },
  { milestone: 'Proposal Portal 1.0', date: '3/1/2026', demo: '', color: '#1a1a1a' },
  { milestone: 'XR Experience', date: '3/1/2026', demo: '', color: '#1a1a1a' },
  { milestone: 'Virtual Commissioning Kit App', date: '3/1/2026', demo: '', color: '#1a1a1a' },
  { milestone: 'Project Portal 1.0', date: '3/1/2026', demo: '', color: '#1a1a1a' },
  { milestone: 'Solution Recall', date: '3/1/2026', demo: '', color: '#1a1a1a' },
];

export default function Demo() {
  const [milestones, setMilestones] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load demo milestones:', e);
    }
    return DEFAULT_MILESTONES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(milestones));
  }, [milestones]);

  const handleMilestoneChange = (index, field, value) => {
    const newMilestones = [...milestones];
    newMilestones[index][field] = value;
    setMilestones(newMilestones);
  };

  const handleAddRow = () => {
    setMilestones([...milestones, { milestone: 'New Milestone', date: '', color: '#1a1a1a' }]);
  };

  const handleDeleteRow = (index) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((_, i) => i !== index));
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Demo</Typography>
      
      <Paper sx={{ backgroundColor: 'background.paper' }}>
        <Table sx={{ border: '1px solid', borderColor: 'divider' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'background.paper' }}>
              <TableCell sx={{ fontWeight: 'bold', width: '70%', border: '1px solid', borderColor: 'divider' }}>Demo Milestones</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '30%', border: '1px solid', borderColor: 'divider', textAlign: 'right' }}>Demo Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {milestones.map((milestone, index) => (
              <TableRow 
                key={index}
                sx={{ 
                  backgroundColor: milestone.color || 'background.paper',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                <TableCell sx={{ border: '1px solid', borderColor: 'divider' }}>
                  <TextField
                    size="small"
                    value={milestone.milestone}
                    onChange={(e) => handleMilestoneChange(index, 'milestone', e.target.value)}
                    variant="outlined"
                    fullWidth
                    sx={{ 
                      backgroundColor: 'transparent',
                      "& .MuiInputBase-input": { fontSize: "0.875rem", color: 'text.primary' },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'transparent',
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  />
                </TableCell>
                <TableCell sx={{ border: '1px solid', borderColor: 'divider', textAlign: 'right' }}>
                  <TextField
                    size="small"
                    value={milestone.date}
                    onChange={(e) => handleMilestoneChange(index, 'date', e.target.value)}
                    variant="outlined"
                    fullWidth
                    placeholder="3/1/2026"
                    sx={{ 
                      backgroundColor: 'transparent',
                      "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right', color: 'text.primary' },
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'transparent',
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      }
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Box
            onClick={handleAddRow}
            sx={{
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            + Add Milestone
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

