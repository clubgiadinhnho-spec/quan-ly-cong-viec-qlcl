import React from 'react';

export const ChatIconSVG: React.FC<{ size?: number; className?: string }> = ({ size = 20, className = '' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 512 512" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    {/* Blue Bubble (Back) */}
    <path d="M251.2 56.4H74.1C55.4 56.4 40.3 71.5 40.3 90.2V211.5C40.3 230.1 55.4 245.3 74.1 245.3H96.4V296.8C96.4 300.9 101.4 303 104.3 300.1L153.2 245.3H251.2C269.8 245.3 284.9 230.2 284.9 211.5V90.2C284.9 71.5 269.8 56.4 251.2 56.4Z" fill="#A0C8F8" />
    <rect x="85" y="115" width="140" height="18" rx="9" fill="white" />
    <rect x="85" y="155" width="140" height="18" rx="9" fill="white" />
    <rect x="85" y="195" width="80" height="18" rx="9" fill="white" />

    {/* Yellow Bubble (Front) */}
    <path d="M437.9 179.3H199.1C179.3 179.3 163.3 195.3 163.3 215.1V394.2C163.3 414 179.3 430 199.1 430H374.3L442.2 491.5C445.6 494.6 450.9 492.2 450.9 487.6V430H437.9C457.7 430 473.7 414 473.7 394.2V215.1C473.7 195.3 457.7 179.3 437.9 179.3Z" fill="#FFC960" />
    
    {/* Smile Face */}
    <circle cx="266" cy="285" r="18" fill="#3A3A3C" />
    <circle cx="370" cy="285" r="18" fill="#3A3A3C" />
    <path d="M280 345C280 345 305 385 343 385C381 385 406 345 406 345" stroke="#3A3A3C" strokeWidth="24" strokeLinecap="round" />
  </svg>
);
