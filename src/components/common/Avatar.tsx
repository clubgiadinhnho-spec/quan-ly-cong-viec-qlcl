import React from 'react';

interface AvatarProps {
  src?: string;
  name?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, className = '', size = 'md' }) => {
  const sizeClasses = {
    'xs': 'w-5 h-5 min-w-[20px]',
    'sm': 'w-6 h-6 min-w-[24px]',
    'md': 'w-8 h-8 min-w-[32px]',
    'lg': 'w-10 h-10 min-w-[40px]',
    'xl': 'w-16 h-16 min-w-[64px]'
  };

  const currentSizeClass = sizeClasses[size] || sizeClasses.md;
  const safeName = name ? encodeURIComponent(name) : 'User';
  const fallbackUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${safeName}`;
  const displaySrc = (src && typeof src === 'string' && src.trim() !== '') ? src : fallbackUrl;
  
  return (
    <div className={`${currentSizeClass} flex-none relative bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-sm`}>
      <img 
        src={displaySrc}
        alt={name || 'Avatar'}
        className="w-full h-full object-cover transition-opacity duration-300 opacity-0"
        onLoad={(e) => {
          e.currentTarget.style.opacity = '1';
        }}
        onError={(e) => {
          if (e.currentTarget.src !== fallbackUrl) {
            e.currentTarget.src = fallbackUrl;
          } else {
            // If even fallback fails, hide img and show initial
            e.currentTarget.style.display = 'none';
          }
        }}
      />
      {!src && !displaySrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-blue-50 text-blue-600 text-[10px] font-bold">
          {name ? name.charAt(0).toUpperCase() : '?'}
        </div>
      )}
    </div>
  );
};
