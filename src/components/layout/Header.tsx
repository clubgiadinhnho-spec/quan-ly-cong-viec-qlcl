import React from 'react';
import { User, UserPresence } from '../../types';

interface HeaderProps {
  title: string;
  badge?: string;
  onAction?: () => void;
  actionLabel?: string;
  actionIcon?: React.ElementType;
  users?: User[];
  onlineUsers?: UserPresence[];
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
  onlineUsers = [],
  onUserClick,
  currentUserId
}: HeaderProps) => {
  // Combine users from props (legacy logic) and new onlineUsers
  const legacyActiveUsers = users.filter(u => u.id !== currentUserId && u.lastActive && (Date.now() - u.lastActive < 120000));
  
  // Final list of users to show as online
  const displayOnline = onlineUsers.length > 0 ? onlineUsers : legacyActiveUsers.map(u => ({
    id: u.id,
    name: u.name,
    avatar: u.avatar,
    lastActive: new Date(u.lastActive!).toISOString(),
    status: 'online' as const
  }));

  // Sắp xếp để người dùng hiện tại luôn đứng đầu list
  const sortedDisplay = [...displayOnline].sort((a, b) => {
    if (a.id === currentUserId) return -1;
    if (b.id === currentUserId) return 1;
    return 0;
  });

  return (
    <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <h2 className="text-[24px] font-black text-blue-900 tracking-tight uppercase leading-none">
            <span translate="no" className="notranslate">{title}</span>
          </h2>
          {badge && (
            <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {badge}
            </span>
          )}
        </div>
        
        {/* Online Users Display */}
        {sortedDisplay.length > 0 && (
          <div className="flex items-center gap-2 border-l border-gray-100 pl-6 ml-2">
            <div className="flex -space-x-2">
              {sortedDisplay.slice(0, 5).map((u) => {
                const isMe = u.id === currentUserId;
                return (
                  <div 
                    key={u.id} 
                    className="relative group"
                    title={isMe ? "Bạn (Đang online)" : `${u.name} đang online`}
                  >
                    <div className={`p-0.5 rounded-full bg-white border-2 ${isMe ? 'border-blue-500' : 'border-white'} shadow-sm transition-all`}>
                      <img 
                        src={u.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random`} 
                        alt={u.name}
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full ${isMe ? 'animate-pulse' : ''}`} />
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {u.name} {isMe ? '(Bạn)' : '(Online)'}
                    </div>
                  </div>
                );
              })}
              {sortedDisplay.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-black text-gray-500 shadow-sm">
                  +{sortedDisplay.length - 5}
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider ml-1">
              {sortedDisplay.length} Online
            </span>
          </div>
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
};
