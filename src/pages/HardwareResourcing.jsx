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
  Tabs,
  Tab,
} from '@mui/material';

const STORAGE_KEY = 'hardware-resourcing-data';
const YEARS = ['FY26', 'FY27', 'FY28'];

const DEFAULT_HARDWARE_FY26 = [
  { category: 'NVIDIA Room', item: 'Workstations', description: 'Monitor mounted PCs', cost: 2000, qty: 8 },
  { category: 'NVIDIA Room', item: 'Command Workstation', description: 'RTX6000 PRO Workstation', cost: 15000, qty: 1 },
  { category: 'NVIDIA Room', item: 'Furniture', description: 'Custom conference table, command desk, misc furniture', cost: 50000, qty: 1 },
  { category: 'NVIDIA Room', item: 'RTX Server', description: '8 GPU RTX Server', cost: 250000, qty: 4 },
  { category: 'NVIDIA Room', item: 'Networking/Servers', description: 'Switches, Server hardware, UPS, Data Domain License', cost: 400000, qty: 1 },
  { category: 'NVIDIA Room', item: 'LED Wall', description: "16' x 9' 4k LED Wall", cost: 260000, qty: 1 },
  { category: 'NVIDIA Room', item: 'AV & Controls', description: 'AV Installation & Crestron Control Room or Equiv', cost: 120000, qty: 1 },
  { category: 'Devices', item: 'XR Device', description: 'Apple Vision Pro or Equiv', cost: 4500, qty: 6 },
  { category: 'Devices', item: 'Handheld Scanner', description: 'PortalCAM or Equiv', cost: 5500, qty: 5 },
  { category: 'Devices', item: 'Misc', description: 'Misc R&D Hardware', cost: 100000, qty: 1 },
  { category: 'In-Kind', item: 'Mirsee Collab Agreement', description: 'Mentorship, Manufacturing, Space, Software, etc.', cost: 1000000, qty: 0.3 },
  { category: 'Investment', item: 'Interaptix Strategic Investment', description: 'Interaptix Strategic Investment & Partnership', cost: 0, qty: 1 },
  { category: 'Office Equipment', item: 'Developer Workstation', description: 'RTX6000 PRO Workstation', cost: 13000, qty: 8 },
];

const DEFAULT_HARDWARE_FY27 = [
  { category: 'Devices', item: 'XR Device', description: 'Apple Vision Pro or Equiv', cost: 4500, qty: 10 },
  { category: 'Devices', item: 'Handheld Scanner', description: 'PortalCAM or Equiv', cost: 5500, qty: 5 },
  { category: 'Devices', item: 'Misc', description: 'Misc R&D Hardware', cost: 100000, qty: 1 },
  { category: 'In-Kind', item: 'Mirsee Collab Agreement', description: 'Mentorship, Manufacturing, Space, Software, etc.', cost: 1000000, qty: 0.3 },
];

const DEFAULT_HARDWARE_FY28 = [
  { category: 'Devices', item: 'XR Device', description: 'Apple Vision Pro or Equiv', cost: 4500, qty: 1 },
  { category: 'Devices', item: 'Handheld Scanner', description: 'PortalCAM or Equiv', cost: 5500, qty: 1 },
  { category: 'Devices', item: 'Misc', description: 'Misc R&D Hardware', cost: 100000, qty: 1 },
  { category: 'In-Kind', item: 'Mirsee Collab Agreement', description: 'Mentorship, Manufacturing, Space, Software, etc.', cost: 1000000, qty: 0.3 },
];

const DEFAULT_DATA = {
  FY26: DEFAULT_HARDWARE_FY26,
  FY27: DEFAULT_HARDWARE_FY27,
  FY28: DEFAULT_HARDWARE_FY28,
};

export default function HardwareResourcing() {
  const [selectedYear, setSelectedYear] = useState('FY26');
  const [hardwareByYear, setHardwareByYear] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load hardware resourcing data:', e);
    }
    return DEFAULT_DATA;
  });

  const hardware = hardwareByYear[selectedYear] || [];

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hardwareByYear));
  }, [hardwareByYear]);

  const handleHardwareChange = (index, field, value) => {
    const newHardwareByYear = { ...hardwareByYear };
    const newHardware = [...hardware];
    if (field === 'cost' || field === 'qty') {
      newHardware[index][field] = Number(value) || 0;
    } else {
      newHardware[index][field] = value;
    }
    newHardwareByYear[selectedYear] = newHardware;
    setHardwareByYear(newHardwareByYear);
  };

  const handleAddRow = () => {
    const newHardwareByYear = { ...hardwareByYear };
    const newHardware = [...hardware, { category: '', item: '', description: '', cost: 0, qty: 0 }];
    newHardwareByYear[selectedYear] = newHardware;
    setHardwareByYear(newHardwareByYear);
  };

  const handleDeleteRow = (index) => {
    if (hardware.length > 1) {
      const newHardwareByYear = { ...hardwareByYear };
      const newHardware = hardware.filter((_, i) => i !== index);
      newHardwareByYear[selectedYear] = newHardware;
      setHardwareByYear(newHardwareByYear);
    }
  };

  const total = useMemo(() => {
    return hardware.reduce((sum, item) => sum + (item.cost * item.qty), 0);
  }, [hardware]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Hardware Resourcing</Typography>
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
              <TableCell sx={{ fontWeight: 'bold', width: '15%' }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '20%' }}>Item</TableCell>
              <TableCell sx={{ fontWeight: 'bold', width: '35%' }}>Description</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '12%' }}>Cost</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '8%' }}>QTY</TableCell>
              <TableCell sx={{ fontWeight: 'bold', textAlign: 'right', width: '10%' }}>Total</TableCell>
              <TableCell sx={{ width: '6%', textAlign: 'center' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {hardware.map((item, index) => {
              const itemTotal = item.cost * item.qty;
              
              return (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.category}
                      onChange={(e) => handleHardwareChange(index, 'category', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.item}
                      onChange={(e) => handleHardwareChange(index, 'item', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                    />
                  </TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      value={item.description}
                      onChange={(e) => handleHardwareChange(index, 'description', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem" } }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={item.cost}
                      onChange={(e) => handleHardwareChange(index, 'cost', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right' } }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleHardwareChange(index, 'qty', e.target.value)}
                      variant="outlined"
                      sx={{ width: '100%', "& .MuiInputBase-input": { fontSize: "0.875rem", textAlign: 'right' } }}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 'medium' }}>
                    {itemTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <TableCell colSpan={5} sx={{ fontWeight: 'bold', textAlign: 'right', pr: 2 }}>
                Total
              </TableCell>
              <TableCell sx={{ textAlign: 'right', fontWeight: 'bold' }}>
                {total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </TableCell>
              <TableCell></TableCell>
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
            + Add Item
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}

