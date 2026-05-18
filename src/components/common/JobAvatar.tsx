import React from 'react';
import { JobIconSVG } from './JobIconSVG';

interface JobAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const JobAvatar: React.FC<JobAvatarProps> = ({ size = 20, className = '', animate = false }) => {
  return (
    <div className={`flex items-center justify-center ${animate ? 'animate-bounce' : ''} ${className}`} title="JOB XIN CHÀO! ✨">
      <JobIconSVG size={size} />
    </div>
  );
};
