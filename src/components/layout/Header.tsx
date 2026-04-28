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
  const activeUsers = users.filter(u => u.id !== currentUserId && u.lastActive && (Date.now() - u.lastActive < 120000));

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
          
          {activeUsers.length > 0 && (
            <div className="flex items-center -space-x-3 ml-2">
              {activeUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => onUserClick?.(user)}
                  className="relative group transition-all z-10 hover:z-50"
                  title={`Chat với ${user.name}`}
                >
                  <div className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden hover:border-blue-500 hover:scale-125 transition-all cursor-pointer ring-2 ring-green-400 ring-offset-1 bg-gray-100">
                    <img 
                      src={user.avatar} 
                      alt={user.name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border border-white rounded-full"></span>
                  
                  {/* Tooltip */}
                  <div className="absolute top-10 left-1/2 -translate-x-1/2 px-2 py-1.5 bg-gray-900/95 backdrop-blur-md text-white text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 shadow-2xl shadow-black/20 whitespace-nowrap z-[100] pointer-events-none font-bold border border-white/10">
                    <div className="flex flex-col items-center">
                      <span>{user.name}</span>
                      <span className="text-[7px] text-blue-300 uppercase tracking-tighter opacity-80">{user.role}</span>
                    </div>
                  </div>
                </button>
              ))}
              {activeUsers.length > 0 && (
                <div className="ml-4 pl-4 border-l border-gray-100 h-6 flex items-center">
                   <span className="text-[9px] font-black text-green-600 uppercase tracking-widest animate-pulse">Online</span>
                </div>
              )}
            </div>
          )}
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
