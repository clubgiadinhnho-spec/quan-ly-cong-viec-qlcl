import React from 'react';
import { User } from '../../types';

interface HeaderProps {
  title: string;
  badge?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ElementType;
  users?: User[];
  onUserClick?: (user: User) => void;
  currentUserId?: string;
}

export const Header = ({ 
  title, 
  badge, 
  onAction, 
  actionLabel, 
  actionIcon: Icon,
  users = [],
  onUserClick,
  currentUserId
}: HeaderProps) => {
  const activeUsers = users.filter(u => u.id !== currentUserId && u.lastActive && (Date.now() - u.lastActive < 60000));

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[24px] font-black text-blue-900 tracking-tight uppercase leading-none">{title}</h2>
          {badge && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>

        {activeUsers.length > 0 && (
          <div className="h-10 w-px bg-gray-200 mx-2" />
        )}

        <div className="flex items-center gap-2">
          {activeUsers.map(user => (
            <button
              key={user.id}
              onClick={() => onUserClick?.(user)}
              className="relative group transition-all"
              title={`Chat với ${user.name}`}
            >
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-8 h-8 rounded-full border-2 border-green-400 p-0.5 object-cover hover:scale-110 transition-transform" 
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>
              <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none font-bold uppercase">
                {user.name}
              </div>
            </button>
          ))}
        </div>
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
};
