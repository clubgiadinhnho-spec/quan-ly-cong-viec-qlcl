import React from 'react';

interface HeaderProps {
  title: string;
  badge?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ElementType;
}

export const Header = ({ title, badge, onAction, actionLabel, actionIcon: Icon }: HeaderProps) => (
  <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
    <div className="flex items-center gap-4">
      <h2 className="text-xl font-black text-blue-900 tracking-tight uppercase">{title}</h2>
      {badge && (
        <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
          {badge}
        </span>
      )}
    </div>
    <div className="flex gap-3">
      {onAction && actionLabel && (
        <button 
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-blue-700 flex items-center gap-2 transition-all"
        >
          {Icon && <Icon size={14} />}
          {actionLabel}
        </button>
      )}
    </div>
  </header>
);
