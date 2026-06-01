import React from 'react';

interface QLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | number;
}

export const QLogo = ({ className = '', size = 'md' }: QLogoProps) => {
  // Determine dimensions based on size presets or custom number
  let dimClass = 'w-10 h-10 text-base';
  if (size === 'sm') dimClass = 'w-8 h-8 text-xs';
  if (size === 'lg') dimClass = 'w-12 h-12 text-xl md:w-14 md:h-14 md:text-2xl';
  
  const customStyle = typeof size === 'number' ? { width: size, height: size, fontSize: size * 0.45 } : {};

  return (
    <div
      style={customStyle}
      className={`${typeof size === 'number' ? '' : dimClass} shrink-0 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-blue-600/20 tracking-tighter select-none transform hover:scale-105 transition-all duration-300 ${className}`}
    >
      <span translate="no" className="notranslate font-black">Q</span>
    </div>
  );
};
