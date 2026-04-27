import React from 'react';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database } from 'lucide-react';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onSeedData: () => void;
}

export const Sidebar = ({ user, activeTab, setActiveTab, onLogout, onSeedData }: SidebarProps) => (
  <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
    <div className="p-6">
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-200">Q</div>
        <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">QLCL HUB</h1>
      </div>
      
      <nav className="space-y-1.5">
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
                ? 'bg-blue-50 text-blue-700' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        {user.role === 'Admin' && (
          <button
            onClick={onSeedData}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg text-amber-600 hover:bg-amber-50 transition-all mt-4 border border-dashed border-amber-200"
          >
            <Database size={18} />
            Nạp dữ liệu công việc
          </button>
        )}
      </nav>
    </div>
    
    <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
      <div className="flex items-center gap-3 px-2">
        <img src={user.avatar} alt="avatar" className="w-10 h-10 rounded-full border border-gray-200" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
          <p className="text-[10px] text-gray-500 font-semibold uppercase">{user.role}</p>
        </div>
        <button 
          onClick={onLogout}
          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  </aside>
);
