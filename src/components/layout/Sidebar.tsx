import React from 'react';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database } from 'lucide-react';

interface SidebarProps {
  user: User;
  users: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onUserClick?: (user: User) => void;
}

export const Sidebar = ({ user, users, activeTab, setActiveTab, onLogout, onUserClick }: SidebarProps) => {
  const activeUsers = users
    .filter(u => u.id !== user.id && u.lastActive && (Date.now() - u.lastActive < 120000))
    .sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">Q</div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">QLCL HUB</h1>
        </div>
        
        <nav className="space-y-1.5 flex-none mb-8">
          {[
            { id: 'tasks', label: 'Bảng công việc', icon: ClipboardList },
            { id: 'completed_tasks', label: 'CV đã hoàn thành', icon: CheckCircle2 },
            ...(user.role === 'Admin' || user.role === 'Trưởng Phòng' 
              ? [{ id: 'staff_list', label: 'Nhân sự', icon: Users }] 
              : []),
            { id: 'group_chat', label: 'Chat nhóm', icon: MessageSquare },
            { id: 'profile', label: 'Trang cá nhân', icon: UserIcon },
            { id: 'reports', label: 'Báo cáo tháng', icon: BarChart3 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Active Users Section */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          <div className="flex items-center justify-between mb-4 px-1">
             <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Users size={12} className="text-blue-500" /> Đang hoạt động
             </h3>
             <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
          </div>
          
          <div className="space-y-3">
            {activeUsers.length > 0 ? (
              activeUsers.map(u => (
                <button 
                  key={u.id} 
                  onClick={() => onUserClick?.(u)}
                  className="w-full flex items-center gap-2.5 px-2 group hover:bg-blue-50/50 py-1.5 rounded-lg transition-all"
                >
                  <div className="relative flex-none">
                    <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full border border-gray-100 bg-gray-50 object-cover" />
                    <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-white rounded-full"></div>
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] font-bold text-gray-700 truncate group-hover:text-blue-600 transition-colors">{u.name}</p>
                    <p className="text-[8px] text-gray-400 font-black uppercase tracking-tighter truncate">{u.role}</p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-[10px] text-gray-400 italic px-2">Không có ai trực tuyến</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2">
          <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-gray-200 bg-white object-cover aspect-square" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
            <p className="text-[10px] text-gray-500 font-semibold uppercase">{user.role}</p>
          </div>
          <button 
            onClick={onLogout}
            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
            title="Đăng xuất"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
