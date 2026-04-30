import React from 'react';

export const ChatIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M85 70C85 81.0457 76.0457 90 65 90C61.5 90 58.2 89.1 55.4 87.5L40 95L45 80C41.9 77.2 40 73.1 40 68.5C40 57.4543 48.9543 48.5 60 48.5C71.0457 48.5 80 57.4543 80 68.5" 
      fill="#F87171" 
      stroke="black" 
      strokeWidth="4"
    />
    <path 
      d="M15 45C15 22.9086 32.9086 5 55 5C77.0914 5 95 22.9086 95 45C95 67.0914 77.0914 85 55 85C50 85 45.3 84.1 41 82.4L20 90L25 68C18.8 61.9 15 53.6 15 45Z" 
      fill="#60A5FA" 
      stroke="black" 
      strokeWidth="4"
    />
    <line x1="35" y1="35" x2="75" y2="35" stroke="black" strokeWidth="6" strokeLinecap="round" />
    <line x1="35" y1="50" x2="60" y2="50" stroke="black" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const GroupChatIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={className}
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Background bubbles */}
    <path d="M25 25 C25 15, 45 15, 45 25 C45 35, 25 35, 25 25" fill="#FBBF24" opacity="0.6" />
    <path d="M55 20 C55 10, 75 10, 75 20 C75 30, 55 30, 55 20" fill="#F87171" opacity="0.6" />
    <path d="M65 45 C65 35, 85 35, 85 45 C85 55, 65 55, 65 45" fill="#34D399" opacity="0.6" />
    
    {/* Main bubbles */}
    <circle cx="35" cy="40" r="15" fill="#FBBF24" stroke="white" strokeWidth="2" />
    <circle cx="55" cy="35" r="18" fill="#F87171" stroke="white" strokeWidth="2" />
    <circle cx="75" cy="45" r="16" fill="#34D399" stroke="white" strokeWidth="2" />
    <circle cx="65" cy="25" r="14" fill="#60A5FA" stroke="white" strokeWidth="2" />
    
    {/* People icons at bottom */}
    <path d="M30 85 C30 75, 50 75, 50 85" fill="#1E3A8A" />
    <circle cx="40" cy="70" r="8" fill="#1E3A8A" />
    
    <path d="M50 85 C50 70, 75 70, 75 85" fill="#1E40AF" />
    <circle cx="62" cy="65" r="10" fill="#1E40AF" />
    
    <path d="M75 85 C75 75, 95 75, 95 85" fill="#1E3A8A" />
    <circle cx="85" cy="70" r="8" fill="#1E3A8A" />
  </svg>
);

export const GroupDiscussionIcon = ({ className = "" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className}
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Avatars */}
    <circle cx="12" cy="16" r="2.5" />
    <path d="M12 19c-2.5 0-4 1-4 2v.5h8V21c0-1-1.5-2-4-2z" />
    
    <circle cx="7.5" cy="17" r="2" />
    <path d="M7.5 19.5c-1.5 0-2.5.8-2.5 1.5v.5H10v-.5c0-.7-1-1.5-2.5-1.5z" />
    
    <circle cx="16.5" cy="17" r="2" />
    <path d="M16.5 19.5c-1.5 0-2.5.8-2.5 1.5v.5H19v-.5c0-.7-1-1.5-2.5-1.5z" />

    {/* Speech bubbles */}
    <path 
      d="M11 8c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5-1.8 3.5-4 3.5c-.4 0-.8-.1-1.2-.2L11.5 13l.4-1.8c-.9-.7-1.4-1.7-1.4-2.7z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.2"
    />
    <path 
      d="M5 10c0-1.5 1.4-2.5 3-2.5.8 0 1.5.3 2 .8l2-1v2.5c0 1.5-1.4 2.5-3 2.5-.4 0-.8-.1-1.2-.2L5.5 14l.4-1.5c-.6-.7-0.9-1.5-0.9-2.5z" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.2"
    />
  </svg>
);
