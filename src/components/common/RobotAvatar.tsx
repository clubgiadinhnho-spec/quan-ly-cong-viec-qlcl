import React from 'react';
import { RobotIconSVG } from './RobotIconSVG';

interface RobotAvatarProps {
  size?: number;
  className?: string;
  animate?: boolean;
}

export const RobotAvatar: React.FC<RobotAvatarProps> = ({ size = 20, className = '', animate = false }) => {
  return (
    <div className={`flex items-center justify-center ${animate ? 'animate-bounce' : ''} ${className}`}>
      <RobotIconSVG size={size} />
    </div>
  );
};
