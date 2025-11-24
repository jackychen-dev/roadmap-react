import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  IconButton,
  Collapse,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import DeleteIcon from '@mui/icons-material/Delete';

const DEFAULT_VELOCITY_POINTS = [
  { role: 'Hybrid PM', pointsPerMonth: 8 },
  { role: 'Junior/Mixed Role', pointsPerMonth: 10 },
  { role: 'FTE', pointsPerMonth: 18 },
  { role: 'Exceptional Engineer', pointsPerMonth: 24 },
];

const STORAGE_KEY = 'velocity-point-system';

export default function VelocityPointSystem() {
  const [expanded, setExpanded] = useState(false);
  const [velocityPoints, setVelocityPoints] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load velocity points:', e);
    }
    return DEFAULT_VELOCITY_POINTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(velocityPoints));
  }, [velocityPoints]);

  const handlePointsChange = (index, value) => {
    const newPoints = [...velocityPoints];
    newPoints[index].pointsPerMonth = Math.max(0, Number(value) || 0);
    setVelocityPoints(newPoints);
  };

  const handleRoleChange = (index, value) => {
    const newPoints = [...velocityPoints];
    newPoints[index].role = value;
    setVelocityPoints(newPoints);
  };

  const handleAddRow = () => {
    setVelocityPoints([...velocityPoints, { role: 'New Role', pointsPerMonth: 0 }]);
  };

  const handleDeleteRow = (index) => {
    if (velocityPoints.length > 1) {
      const newPoints = velocityPoints.filter((_, i) => i !== index);
      setVelocityPoints(newPoints);
    }
  };

  return (
    <Card sx={{ backgroundColor: 'background.paper', minWidth: 400, maxWidth: 500 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Typography variant="h6">Velocity Point System</Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
              1 Point is around 8 hours of work
            </Typography>
          </Box>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Velocity Point System</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Points Per Month</TableCell>
                <TableCell sx={{ width: 60 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {velocityPoints.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.role}
                      onChange={(e) => handleRoleChange(index, e.target.value)}
                      variant="outlined"
                      fullWidth
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={item.pointsPerMonth}
                      onChange={(e) => handlePointsChange(index, e.target.value)}
                      variant="outlined"
                      inputProps={{ min: 0 }}
                      sx={{
                        '& .MuiInputBase-input': {
                          fontSize: '0.875rem',
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteRow(index);
                      }}
                      disabled={velocityPoints.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Box sx={{ mt: 2 }}>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleAddRow();
              }}
              sx={{
                border: '1px dashed',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              + Add Role
            </IconButton>
          </Box>
        </CardContent>
      </Collapse>
    </Card>
  );
}

