import React from 'react';
import { User, PrivateMessage } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles, Trash2 } from 'lucide-react';

import { Avatar } from '../common/Avatar';
import { GroupChatIcon, GroupDiscussionIcon } from '../common/Icons';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  pendingTasksCount?: number;
  activeTasksCount?: number;
  completedTasksCount?: number;
  totalStaffCount?: number;
  groupUnreadCount?: number;
  trashTasksCount?: number;
}

export const Sidebar = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  pendingTasksCount = 0, 
  activeTasksCount = 0,
  completedTasksCount = 0,
  totalStaffCount = 0,
  groupUnreadCount = 0,
  trashTasksCount = 0,
}: SidebarProps) => {
  const isManager = user.role === 'Admin' || user.role === 'Leader' || !!user.delegatedPermissions?.canApproveTask;

  const hasDelegatedPermissions = (u: User) => u.delegatedPermissions && Object.values(u.delegatedPermissions).some(v => v);

  return (
    <aside className="w-72 bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="p-6 flex flex-col h-full">
        <div className="flex flex-col gap-1 mb-6 px-0.5">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg shadow-blue-200 ring-2 ring-white flex-none">Q</div>
            <div className="flex flex-col min-w-0">
              <span className="text-[7px] font-black text-blue-500 uppercase tracking-[0.3em] leading-none mb-1">Systems Unit</span>
              <h1 className="text-[14px] font-black tracking-tighter text-gray-900 uppercase leading-none truncate bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                <span translate="no" className="notranslate">P.QLCL TPP</span>
              </h1>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1 flex-none mb-4">
          {[
            { id: 'tasks', label: <span translate="no" className="notranslate">BẢNG CÔNG VIỆC</span>, icon: ClipboardList, count: activeTasksCount, color: 'bg-blue-500 text-white shadow-blue-100' },
            { id: 'pending_confirmation', label: <span translate="no" className="notranslate">ĐỀ XUẤT MỚI</span>, icon: Sparkles, count: pendingTasksCount, color: 'bg-emerald-500 text-white shadow-emerald-200', isAlert: true, isSubItem: true },
            { id: 'completed_tasks', label: <span translate="no" className="notranslate">CV HOÀN THÀNH</span>, icon: CheckCircle2, count: completedTasksCount, color: 'bg-indigo-500 text-white shadow-indigo-100', isSubItem: true },
            ...(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff
              ? [{ id: 'staff_list', label: <span translate="no" className="notranslate">QUẢN LÝ NHÂN SỰ</span>, icon: Users, count: totalStaffCount, color: 'bg-amber-500 text-white shadow-amber-100' }] 
              : []),
            { id: 'profile', label: <span translate="no" className="notranslate">TRANG CÁ NHÂN</span>, icon: UserIcon },
            { id: 'reports', label: <span translate="no" className="notranslate">BÁO CÁO THÁNG</span>, icon: BarChart3 },
            ...(user.role === 'Admin'
              ? [
                  { id: 'trash', label: <span translate="no" className="notranslate">TRUNG TÂM XÓA</span>, icon: Trash2, count: trashTasksCount, color: 'bg-red-500 text-white shadow-red-200' },
                  { id: 'system_history', label: <span translate="no" className="notranslate">NHẬT KÝ HỆ THỐNG</span>, icon: Database, color: 'bg-indigo-600 text-white shadow-indigo-100' }
                ]
              : []),
          ].map((item: any) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 py-2 text-lg font-medium rounded-xl transition-all relative px-3.5 ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-700 shadow-sm' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <item.icon size={20} />
              <div className="flex-1 text-left uppercase text-sm font-black whitespace-nowrap">{item.label}</div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[11px] font-black min-w-[22px] h-5.5 px-1.5 rounded-full flex items-center justify-center border-2 border-white shadow-md ${
                  item.color || 'bg-gray-500 text-white'
                } ${(item.isAlert && isManager) ? 'animate-bounce' : ''}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Group Chat Moved Below Nav */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6 pt-4">
          <button 
            onClick={() => setActiveTab('group_chat')}
            className={`w-full flex items-center gap-2.5 px-3.5 group hover:bg-rose-50/50 py-3 rounded-xl transition-all ${activeTab === 'group_chat' ? 'bg-rose-50/50 ring-1 ring-rose-100' : ''}`}
          >
            <div className="relative flex-none">
              <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-sm border border-rose-400/20">
                 <GroupChatIcon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0 text-left flex items-center justify-between gap-1">
              <div className="min-w-0">
                <p className={`text-sm font-black uppercase truncate transition-colors ${activeTab === 'group_chat' ? 'text-rose-600' : 'text-gray-700 group-hover:text-rose-600'}`}>Room Thảo Luận</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest truncate">Cộng đồng QLCL</p>
              </div>
              <div className="flex items-center gap-2 flex-none">
                <div className="relative group-hover:scale-110 transition-transform">
                  <GroupDiscussionIcon className={`w-10 h-10 ${activeTab === 'group_chat' ? 'text-rose-600' : 'text-gray-400 opacity-60 group-hover:opacity-100'} transition-all`} />
                  {groupUnreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce z-10">
                      {groupUnreadCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2">
          <Avatar src={user.avatar} name={user.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p translate="no" className="text-sm font-bold text-gray-900 truncate notranslate">
              <span translate="no" className="notranslate">{user.name}</span>
            </p>
            <p className={`text-[10px] font-semibold uppercase ${hasDelegatedPermissions(user) ? 'text-amber-600' : 'text-gray-500'}`}>
              {user.role} {user.delegatedPermissions && (() => {
                const count = Object.values(user.delegatedPermissions).filter(Boolean).length;
                if (count === 0) return null;
                if (count === 6) return '(QUYỀN TP)';
                return `(ỦY QUYỀN ${count}/6)`;
              })()}
            </p>
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
