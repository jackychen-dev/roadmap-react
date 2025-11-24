import React, { useMemo, useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';
import { useTasks } from '../store/TasksContext';

const PERSONNEL_STORAGE_KEY = 'resourcing-data';
const HARDWARE_STORAGE_KEY = 'hardware-resourcing-data';
const YEARS = [2026, 2027, 2028];
const YEAR_MAPPING = { FY26: 2026, FY27: 2027, FY28: 2028 };

const COLORS = ['#3b82f6', '#8b5cf6']; // Blue for Personnel, Purple for Hardware

export default function RoadmapDashboard() {
  const { tasks } = useTasks();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showYearBreakdown, setShowYearBreakdown] = useState(false); // false = show overall, true = show 3 year charts
  const [showEpicFeatures, setShowEpicFeatures] = useState(false); // true = show all epic feature breakdowns

  // Listen for storage changes to refresh data
  useEffect(() => {
    const handleStorageChange = () => {
      setRefreshKey(prev => prev + 1);
    };

    window.addEventListener('storage', handleStorageChange);
    // Check periodically for changes (in case changes happen in same tab)
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 2000); // Check every 2 seconds

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const spendData = useMemo(() => {
    // Load Personnel Resourcing data
    let personnelData = {};
    try {
      const saved = localStorage.getItem(PERSONNEL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          personnelData = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load personnel resourcing data:', e);
    }

    // Load Hardware Resourcing data
    let hardwareData = {};
    try {
      const saved = localStorage.getItem(HARDWARE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          hardwareData = parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load hardware resourcing data:', e);
    }

    // Calculate totals for each year
    const yearData = {};
    let totalPersonnel = 0;
    let totalHardware = 0;

    YEARS.forEach(year => {
      // Personnel total for this year
      const personnelItems = personnelData[year] || [];
      const personnelTotal = personnelItems.reduce((sum, item) => {
        return sum + ((item.cost || 0) * (item.qty || 0));
      }, 0);

      // Hardware total for this year (map FY26->2026, etc.)
      const hardwareYear = Object.keys(YEAR_MAPPING).find(key => YEAR_MAPPING[key] === year);
      const hardwareItems = hardwareData[hardwareYear] || [];
      const hardwareTotal = hardwareItems.reduce((sum, item) => {
        return sum + ((item.cost || 0) * (item.qty || 0));
      }, 0);

      yearData[year] = {
        personnel: personnelTotal,
        hardware: hardwareTotal,
        total: personnelTotal + hardwareTotal,
      };

      totalPersonnel += personnelTotal;
      totalHardware += hardwareTotal;
    });

    return {
      byYear: yearData,
      totals: {
        personnel: totalPersonnel,
        hardware: totalHardware,
        overall: totalPersonnel + totalHardware,
      },
    };
  }, [refreshKey]);

  // Prepare pie chart data for overall view
  const overallPieData = useMemo(() => {
    return [
      { name: 'Personnel', value: spendData.totals.personnel },
      { name: 'Hardware', value: spendData.totals.hardware },
    ];
  }, [spendData]);

  // Prepare bar chart data for each year
  const yearBarData = useMemo(() => {
    return YEARS.map(year => {
      const yearInfo = spendData.byYear[year];
      return {
        year: year.toString(),
        Personnel: yearInfo.personnel,
        Hardware: yearInfo.hardware,
      };
    });
  }, [spendData]);

  const handlePieClick = () => {
    setShowYearBreakdown(!showYearBreakdown);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value, total) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  // Calculate story points data
  const storyPointsData = useMemo(() => {
    // Organize tasks hierarchically
    const epicMap = {};
    
    tasks.forEach(task => {
      if (task.type === 'epic' && task.epic) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = {
            epic: task.epic,
            storyPoints: task.storyPoints || 0,
            features: {},
          };
        }
      } else if (task.type === 'feature' && task.epic && task.feature) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = { epic: task.epic, storyPoints: 0, features: {} };
        }
        if (!epicMap[task.epic].features[task.feature]) {
          epicMap[task.epic].features[task.feature] = {
            feature: task.feature,
            storyPoints: task.storyPoints || 0,
          };
        }
      } else if ((task.type === 'user story' || task.type === 'story') && task.epic && task.feature) {
        if (!epicMap[task.epic]) {
          epicMap[task.epic] = { epic: task.epic, storyPoints: 0, features: {} };
        }
        if (!epicMap[task.epic].features[task.feature]) {
          epicMap[task.epic].features[task.feature] = {
            feature: task.feature,
            storyPoints: 0,
          };
        }
        epicMap[task.epic].features[task.feature].storyPoints += (task.storyPoints || 0);
      }
    });

    // Calculate feature totals and epic totals
    Object.keys(epicMap).forEach(epicName => {
      const epic = epicMap[epicName];
      let epicTotal = 0;
      Object.keys(epic.features).forEach(featureName => {
        epicTotal += epic.features[featureName].storyPoints;
      });
      epic.storyPoints = epicTotal;
    });

    const totalStoryPoints = Object.values(epicMap).reduce((sum, epic) => sum + epic.storyPoints, 0);
    const totalFeatures = Object.values(epicMap).reduce((sum, epic) => sum + Object.keys(epic.features).length, 0);

    // Get capacity per month from resourcing
    let capacityPerMonth = 0;
    try {
      const saved = localStorage.getItem(PERSONNEL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          // Get current year's capacity (default to 2026)
          const currentYear = new Date().getFullYear();
          const yearData = parsed[currentYear] || parsed[2026] || [];
          capacityPerMonth = yearData.reduce((sum, pos) => {
            return sum + ((pos.storyPointsPerMonth || 0) * (pos.qty || 0));
          }, 0);
        }
      }
    } catch (e) {
      console.error('Failed to load capacity data:', e);
    }

    // Calculate timeline data for burndown chart
    const timelineData = [];
    const stories = tasks.filter(t => (t.type === 'user story' || t.type === 'story') && t.storyPoints);
    
    // Group by month based on start dates
    const monthlyData = {};
    stories.forEach(story => {
      const startDate = story.start_date || story.startDate;
      if (startDate) {
        const date = new Date(startDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { month: monthKey, points: 0, completed: 0 };
        }
        monthlyData[monthKey].points += (story.storyPoints || 0);
      }
    });

    // Sort months and calculate cumulative
    const sortedMonths = Object.keys(monthlyData).sort();
    let remainingPoints = totalStoryPoints;
    let cumulativeBurned = 0;

    sortedMonths.forEach((monthKey, index) => {
      const monthData = monthlyData[monthKey];
      const [year, month] = monthKey.split('-');
      const monthLabel = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      remainingPoints -= monthData.points;
      cumulativeBurned += monthData.points;
      
      // Calculate projected completion
      const monthsToComplete = capacityPerMonth > 0 ? Math.ceil(remainingPoints / capacityPerMonth) : 0;
      const projectedCompletion = new Date(parseInt(year), parseInt(month) - 1);
      projectedCompletion.setMonth(projectedCompletion.getMonth() + monthsToComplete);

      timelineData.push({
        month: monthLabel,
        monthKey,
        remaining: Math.max(0, remainingPoints),
        burned: cumulativeBurned,
        capacity: capacityPerMonth,
        projectedCompletion: projectedCompletion.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      });
    });

    return {
      total: totalStoryPoints,
      byEpic: Object.values(epicMap).map(epic => ({
        name: epic.epic,
        points: epic.storyPoints,
      })),
      byFeature: Object.values(epicMap).flatMap(epic => 
        Object.values(epic.features).map(feature => ({
          name: feature.feature,
          points: feature.storyPoints,
        }))
      ),
      epicMap, // Include epicMap for feature breakdown
      capacityPerMonth,
      timelineData,
    };
  }, [tasks, refreshKey]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Roadmap Dashboard</Typography>
      
      <Grid container spacing={3}>
        {/* Summary Cards - Stacked in one column */}
        <Grid item xs={12} md={3}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '280px' }}>
            <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Total Personnel Spend
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(spendData.totals.personnel)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formatPercent(spendData.totals.personnel, spendData.totals.overall)} of total
              </Typography>
            </Paper>

            <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Total Hardware Spend
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(spendData.totals.hardware)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {formatPercent(spendData.totals.hardware, spendData.totals.overall)} of total
              </Typography>
            </Paper>

            <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                Total Spend (All Years)
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(spendData.totals.overall)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Across {YEARS.length} years
              </Typography>
            </Paper>
          </Box>
        </Grid>

        {/* Pie Chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%', maxWidth: '500px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Spend Distribution
              </Typography>
              <Typography variant="body2" color="text.secondary">
                All Years
              </Typography>
            </Box>
            <Box
              onClick={handlePieClick}
              sx={{ cursor: 'pointer' }}
            >
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={overallPieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {overallPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
              Click chart to view by year
            </Typography>
          </Paper>
        </Grid>

        {/* Year-over-Year Table */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ backgroundColor: 'background.paper', p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Year-over-Year Breakdown
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {YEARS.map((year) => {
                const yearInfo = spendData.byYear[year];
                return (
                  <Box
                    key={year}
                    sx={{
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {year}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Personnel:
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(yearInfo.personnel)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        Hardware:
                      </Typography>
                      <Typography variant="body2">
                        {formatCurrency(yearInfo.hardware)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 1,
                        pt: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Total:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(yearInfo.total)}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>

        {/* Story Points Summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%', maxWidth: '280px' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Story Points Summary
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Story Points
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {storyPointsData.total}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Capacity Per Month
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {storyPointsData.capacityPerMonth.toFixed(1)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Estimated Months to Complete
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {storyPointsData.capacityPerMonth > 0 
                    ? (storyPointsData.total / storyPointsData.capacityPerMonth).toFixed(1)
                    : 'N/A'}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Story Points per Epic Pie Chart */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ backgroundColor: 'background.paper', p: 3, width: '100%', maxWidth: '750px' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Story Points per Epic
            </Typography>
            {storyPointsData.byEpic.length > 0 ? (
              <Box
                onClick={() => setShowEpicFeatures(true)}
                sx={{ cursor: 'pointer' }}
              >
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={storyPointsData.byEpic}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="points"
                      stroke="rgba(255, 255, 255, 0.3)"
                      strokeWidth={2}
                    >
                    {storyPointsData.byEpic.map((entry, index) => {
                      // Generate a glass-like translucent color for each epic
                      const hue = (index * 137.508) % 360; // Golden angle for color distribution
                      return (
                        <Cell key={`cell-${index}`} fill={`hsla(${hue}, 60%, 65%, 0.6)`} />
                      );
                    })}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} story points`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No epic data available. Add epics with story points to see the chart.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Burndown Chart */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ backgroundColor: 'background.paper', p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Story Points Timeline & Capacity
            </Typography>
            {storyPointsData.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={storyPointsData.timelineData}>
                  <CartesianGrid strokeDasharray="3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="month" 
                    stroke="rgba(255, 255, 255, 0.7)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.9)', fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="rgba(255, 255, 255, 0.7)"
                    tick={{ fill: 'rgba(255, 255, 255, 0.9)' }}
                    label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fill: 'rgba(255, 255, 255, 0.9)' }}
                  />
                  <Tooltip 
                    formatter={(value) => value.toFixed(1)}
                    contentStyle={{ 
                      backgroundColor: 'rgba(26, 26, 26, 0.95)', 
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.9)'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="remaining" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3}
                    stroke="#8b5cf6"
                    name="Remaining Points"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="burned" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Cumulative Burned"
                  />
                  <Bar 
                    dataKey="capacity" 
                    fill="#10b981" 
                    fillOpacity={0.5}
                    name="Monthly Capacity"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No timeline data available. Add stories with start dates to see the burndown chart.
              </Typography>
            )}
          </Paper>
        </Grid>

        {/* Overlay for year breakdown */}
        {showYearBreakdown && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 1300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              p: 3,
            }}
            onClick={handlePieClick}
          >
            <Paper
              sx={{
                backgroundColor: 'background.paper',
                p: 4,
                width: '98vw',
                maxHeight: '95vh',
                overflow: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                  Spend Distribution by Year
                </Typography>
                <Typography
                  variant="body2"
                  color="primary"
                  onClick={handlePieClick}
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Close
                </Typography>
              </Box>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <ResponsiveContainer width="100%" height={500}>
                  <BarChart
                    data={yearBarData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis 
                      dataKey="year" 
                      stroke="rgba(255, 255, 255, 0.7)"
                      tick={{ fill: 'rgba(255, 255, 255, 0.9)' }}
                    />
                    <YAxis 
                      stroke="rgba(255, 255, 255, 0.7)"
                      tick={{ fill: 'rgba(255, 255, 255, 0.9)' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value) => formatCurrency(value)}
                      contentStyle={{ 
                        backgroundColor: 'rgba(26, 26, 26, 0.95)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'rgba(255, 255, 255, 0.9)'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Hardware" stackId="a" fill={COLORS[1]} />
                    <Bar dataKey="Personnel" stackId="a" fill={COLORS[0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Paper>
          </Box>
        )}

        {/* Epic Features Overlay - Show All Epics */}
        {showEpicFeatures && storyPointsData.epicMap && (
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1300,
            }}
            onClick={() => setShowEpicFeatures(false)}
          >
            <Paper
              sx={{
                backgroundColor: 'background.paper',
                p: 4,
                width: '98vw',
                maxHeight: '95vh',
                overflow: 'auto',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                  Story Points per Feature - All Epics
                </Typography>
                <Typography
                  variant="body2"
                  color="primary"
                  onClick={() => setShowEpicFeatures(false)}
                  sx={{ cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Close
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center', alignItems: 'stretch' }}>
                {storyPointsData.byEpic.map((epicData, epicIndex) => {
                  const epic = storyPointsData.epicMap[epicData.name];
                  if (!epic || Object.keys(epic.features).length === 0) return null;
                  
                  const features = Object.values(epic.features).map(feature => ({
                    name: feature.feature,
                    points: feature.storyPoints,
                  }));

                  // Calculate number of epics to determine width
                  const numEpics = storyPointsData.byEpic.filter(e => {
                    const ep = storyPointsData.epicMap[e.name];
                    return ep && Object.keys(ep.features).length > 0;
                  }).length;
                  
                  // Calculate width based on number of epics (evenly distributed)
                  const cardWidth = numEpics <= 2 ? '48%' : numEpics === 3 ? '31%' : numEpics === 4 ? '23%' : '18%';

                  return (
                    <Paper 
                      key={epicData.name}
                      sx={{ 
                        p: 2, 
                        backgroundColor: 'background.default', 
                        width: cardWidth,
                        minWidth: '280px',
                        display: 'flex', 
                        flexDirection: 'column',
                        flex: '1 1 auto'
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
                        {epicData.name}
                      </Typography>
                      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={features}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent, value }) => `${name}: ${value} (${(percent * 100).toFixed(1)}%)`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="points"
                              stroke="rgba(255, 255, 255, 0.3)"
                              strokeWidth={2}
                            >
                              {features.map((entry, index) => {
                                // Generate a glass-like translucent color for each feature
                                const hue = (index * 137.508) % 360; // Golden angle for color distribution
                                return (
                                  <Cell key={`cell-${index}`} fill={`hsla(${hue}, 60%, 65%, 0.6)`} />
                                );
                              })}
                            </Pie>
                            <Tooltip formatter={(value) => `${value} story points`} />
                            <Legend />
                          </PieChart>
                        </ResponsiveContainer>
                      </Box>
                    </Paper>
                  );
                })}
              </Box>
            </Paper>
          </Box>
        )}
      </Grid>
    </Box>
  );
}

