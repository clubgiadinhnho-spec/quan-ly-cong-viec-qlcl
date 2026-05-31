import React from 'react';

interface SupIconSVGProps {
  size?: number;
  className?: string;
}

export const SupIconSVG: React.FC<SupIconSVGProps> = ({ size = 20, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Head contour - Orange styled */}
    <rect x="3" y="5" width="18" height="13" rx="4" fill="#F97316" stroke="#C2410C" strokeWidth="1" />
    
    {/* Face screen */}
    <rect x="5" y="7" width="14" height="9" rx="2" fill="#0F172A" />
    
    {/* Supervisor Authoritative glowing eyes (Red/Orange-Yellow) */}
    <circle cx="9" cy="11" r="1.5" fill="#EF4444" />
    <circle cx="15" cy="11" r="1.5" fill="#EF4444" />
    
    {/* Stern but serious and neat supervisor mouth */}
    <path d="M10 13.5h4" stroke="#EF4444" strokeWidth="1.2" strokeLinecap="round" />
    
    {/* Ears/Side sensor bolts */}
    <rect x="1" y="9" width="2" height="5" rx="0.5" fill="#475569" />
    <rect x="21" y="9" width="2" height="5" rx="0.5" fill="#475569" />
    
    {/* Dual Security Antennas or Scanner Dome */}
    <line x1="9" y1="5" x2="7" y2="2" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="15" y1="5" x2="17" y2="2" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="7" cy="1.5" r="1" fill="#EF4444" />
    <circle cx="17" cy="1.5" r="1" fill="#EF4444" />
  </svg>
);
