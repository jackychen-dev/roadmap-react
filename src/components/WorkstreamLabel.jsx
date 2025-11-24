import { Box } from '@mui/material';

// Generate a consistent color gradient for each workstream
const workstreamGradients = {
  'Unassigned': 'linear-gradient(135deg, rgba(100, 100, 100, 0.3) 0%, rgba(120, 120, 120, 0.2) 100%)',
  'AI': 'linear-gradient(135deg, rgba(156, 39, 176, 0.4) 0%, rgba(124, 58, 237, 0.3) 100%)',
  'Connectors': 'linear-gradient(135deg, rgba(0, 188, 212, 0.4) 0%, rgba(76, 175, 80, 0.3) 100%)',
};

// Generate gradient based on workstream name hash
function getWorkstreamGradient(workstream) {
  if (workstreamGradients[workstream]) {
    return workstreamGradients[workstream];
  }
  
  // Generate a consistent gradient based on string hash
  let hash = 0;
  for (let i = 0; i < workstream.length; i++) {
    hash = workstream.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Create color variations from purple/cyan palette
  const hue1 = (hash % 60) + 270; // Purple range (270-330)
  const hue2 = (hash % 60) + 180; // Cyan range (180-240)
  const sat1 = 60 + (hash % 20);
  const sat2 = 50 + (hash % 20);
  
  return `linear-gradient(135deg, 
    hsla(${hue1}, ${sat1}%, 50%, 0.4) 0%, 
    hsla(${hue2}, ${sat2}%, 55%, 0.3) 100%)`;
}

export default function WorkstreamLabel({ workstream, size = 'medium' }) {
  const gradient = getWorkstreamGradient(workstream);
  
  const sizeStyles = {
    small: {
      padding: '4px 10px',
      fontSize: '0.75rem',
      borderRadius: '6px',
    },
    medium: {
      padding: '6px 12px',
      fontSize: '0.875rem',
      borderRadius: '8px',
    },
    large: {
      padding: '8px 16px',
      fontSize: '1rem',
      borderRadius: '10px',
    },
  };

  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        color: '#ffffff',
        fontWeight: 600,
        textShadow: '0 1px 8px rgba(255, 255, 255, 0.2)',
        display: 'inline-block',
        boxShadow: 
          '0 4px 16px rgba(0, 0, 0, 0.3), ' +
          '0 0 0 1px rgba(255, 255, 255, 0.05) inset',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        textTransform: 'none',
        letterSpacing: '0.02em',
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '16px',
        ...sizeStyles[size],
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(139, 92, 246, 0.4) 50%, transparent 100%)',
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          background: 'rgba(255, 255, 255, 0.12)',
          boxShadow: 
            '0 8px 24px rgba(0, 0, 0, 0.4), ' +
            '0 0 0 1px rgba(255, 255, 255, 0.1) inset',
          borderColor: 'rgba(255, 255, 255, 0.2)',
        },
      }}
    >
      {workstream}
    </Box>
  );
}

