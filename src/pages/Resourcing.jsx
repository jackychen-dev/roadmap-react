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
  Tabs,
  Tab,
} from '@mui/material';

const STORAGE_KEY = 'resourcing-data';
const YEARS = [2026, 2027, 2028];

const DEFAULT_POSITIONS = [
  { position: 'Program Management', source: 'Eclipse', cost: 120000, qty: 1, storyPointsPerMonth: 8 },
  { position: 'Tech Lead', source: 'Eclipse', cost: 150000, qty: 1, storyPointsPerMonth: 24 },
  { position: 'Project Manager', source: 'Eclipse', cost: 115000, qty: 1, storyPointsPerMonth: 8 },
  { position: 'Digital Innovation Architect', source: 'Eclipse', cost: 115000, qty: 3, storyPointsPerMonth: 18 },
  { position: 'Full Stack Software Engineer', source: 'Eclipse', cost: 120000, qty: 8, storyPointsPerMonth: 18 },
  { position: 'DevOps Engineer', source: 'Eclipse', cost: 120000, qty: 1, storyPointsPerMonth: 18 },
  { position: 'Co-op', source: 'Eclipse', cost: 30000, qty: 3, storyPointsPerMonth: 10 },
  { position: 'Contract - Low Cost', source: 'Contract', cost: 20000, qty: 0, storyPointsPerMonth: 10 },
  { position: 'Contract - Medium Cost', source: 'Contract', cost: 50000, qty: 0, storyPointsPerMonth: 18 },
  { position: 'Contract - High Cost', source: 'Contract', cost: 150000, qty: 0, storyPointsPerMonth: 24 },
];

export default function Resourcing() {
  const [selectedYear, setSelectedYear] = useState(2026);
  const [positionsByYear, setPositionsByYear] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // If it's the old format (array), convert to new format (object by year)
        if (Array.isArray(parsed)) {
          const byYear = {};
          YEARS.forEach(year => {
            byYear[year] = parsed.map(pos => ({ ...pos }));
          });
          return byYear;
        }
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load resourcing data:', e);
    }
    // Initialize with default positions for each year
    const byYear = {};
    YEARS.forEach(year => {
      byYear[year] = DEFAULT_POSITIONS.map(pos => ({ ...pos }));
    });
    return byYear;
  });

  const positions = positionsByYear[selectedYear] || [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(positionsByYear));
  }, [positionsByYear]);

  const handlePositionChange = (index, field, value) => {
    const newPositionsByYear = { ...positionsByYear };
    const newPositions = [...positions];
    if (field === 'cost' || field === 'qty' || field === 'storyPointsPerMonth') {
      newPositions[index][field] = Number(value) || 0;
    } else {
      newPositions[index][field] = value;
    }
    newPositionsByYear[selectedYear] = newPositions;
    setPositionsByYear(newPositionsByYear);
  };

  const handleAddRow = () => {
    const newPositionsByYear = { ...positionsByYear };
    const newPositions = [...positions, { position: 'New Position', source: 'Eclipse', cost: 0, qty: 0, storyPointsPerMonth: 0 }];
    newPositionsByYear[selectedYear] = newPositions;
    setPositionsByYear(newPositionsByYear);
  };

  const handleDeleteRow = (index) => {
    if (positions.length > 1) {
      const newPositionsByYear = { ...positionsByYear };
      const newPositions = positions.filter((_, i) => i !== index);
      newPositionsByYear[selectedYear] = newPositions;
      setPositionsByYear(newPositionsByYear);
    }
  };

  const totals = useMemo(() => {
    const totalPerYear = positions.reduce((sum, pos) => sum + (pos.cost * pos.qty), 0);
    const overall = positions.reduce((sum, pos) => {
      if (pos.source === 'Eclipse') {
        return sum + pos.qty;
      }
      return sum;
    }, 0);
    const totalPerMonth = positions.reduce((sum, pos) => sum + (pos.storyPointsPerMonth * pos.qty), 0);
    return { totalPerYear, overall, totalPerMonth };
  }, [positions]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Personnel Resourcing</Typography>
        <Tabs value={selectedYear} onChange={(e, newValue) => setSelectedYear(newValue)}>
          {YEARS.map(year => (
            <Tab key={year} value={year} label={year} />
          ))}
        </Tabs>
      </Box>
      
      <Paper sx={{ backgroundColor: 'background.paper' }}>
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Position</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '12%' }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '12%' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '8%' }}>QTY</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '12%' }}>Total (Per Year)</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '10%' }}>Overall</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '15%' }}>Story Points Per Month</TableCell>
              <TableCell sx={{ width: '6%', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {positions.map((pos, index) => {
              const totalPerYear = pos.cost * pos.qty;
              const overall = pos.source === 'Eclipse' ? pos.qty : 0;
              
              return (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={pos.position}
                      onChange={(e) => handlePositionChange(index, 'position', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={pos.source}
                        onChange={(e) => handlePositionChange(index, 'source', e.target.value)}
                        sx={{ fontSize: "0.875rem" }}
                      >
                        <MenuItem value="Eclipse">Eclipse</MenuItem>
                        <MenuItem value="Contract">Contract</MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={pos.cost}
                      onChange={(e) => handlePositionChange(index, 'cost', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right' } }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={pos.qty}
                      onChange={(e) => handlePositionChange(index, 'qty', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right' } }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 'medium' }}>
                    {totalPerYear.toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 'medium' }}>
                    {overall}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={pos.storyPointsPerMonth}
                      onChange={(e) => handlePositionChange(index, 'storyPointsPerMonth', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right' } }}
                      inputProps={{ min: 0 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Box
                      onClick={() => handleDeleteRow(index)}
                      sx={{
                        cursor: 'pointer',
                        color: 'error.main',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                        '&:hover': { opacity: 0.7 },
                      }}
                    >
                      ×
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* Summary row */}
            <TableRow sx={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', borderTop: '2px solid', borderColor: 'divider' }}>
              <TableCell colSpan={4} sx={{ fontWeight: 'bold', textAlign: 'right', pr: 2 }}>
                Total (Per Year)
              </TableCell>
              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                {totals.totalPerYear.toLocaleString()}
              </TableCell>
              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                {totals.overall}
              </TableCell>
              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                Total capacity of story Points per Month
              </TableCell>
              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                {totals.totalPerMonth.toFixed(2)}
              </TableCell>
            </TableRow>
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
            + Add Position
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
