import React from 'react';

export const RobotIconSVG: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="1.8" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    {/* Head */}
    <rect x="4" y="6" width="16" height="11" rx="2.5" />
    
    {/* Eyes */}
    <circle cx="9" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="11.5" r="1.2" fill="currentColor" stroke="none" />
    
    {/* Antenna */}
    <line x1="12" y1="6" x2="12" y2="3" />
    <circle cx="12" cy="2" r="1.5" />
    
    {/* Ears */}
    <path d="M4 11c-1.5 0-2 .5-2 1.5s.5 1.5 2 1.5" />
    <path d="M20 11c1.5 0 2 .5 2 1.5s-.5 1.5-2 1.5" />
    
    {/* Bottom box with dots */}
    <rect x="5" y="18" width="14" height="5" rx="2" />
    <circle cx="8" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="12" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="16" cy="20.5" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);
