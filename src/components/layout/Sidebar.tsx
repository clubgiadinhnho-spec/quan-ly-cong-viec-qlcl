import React from 'react';
import { User, PrivateMessage } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles } from 'lucide-react';

import { Avatar } from '../common/Avatar';
import { ChatIcon, GroupChatIcon, GroupDiscussionIcon } from '../common/Icons';

interface SidebarProps {
  user: User;
  users: User[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  onUserClick?: (user: User, top?: number) => void;
  pendingTasksCount?: number;
  activeTasksCount?: number;
  completedTasksCount?: number;
  totalStaffCount?: number;
  groupUnreadCount?: number;
  unreadUserIds?: string[];
  unreadCounts?: Record<string, number>;
  activeChatUser?: User;
  isChatMinimized?: boolean;
  privateMessages?: PrivateMessage[];
  onSendPrivateMessage?: (content: string, senderId: string, receiverId: string) => void;
  onReactToPrivateMessage?: (msgId: string, emoji: string) => void;
}

export const Sidebar = ({ 
  user, 
  users, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  onUserClick, 
  pendingTasksCount = 0, 
  activeTasksCount = 0,
  completedTasksCount = 0,
  totalStaffCount = 0,
  groupUnreadCount = 0,
  unreadUserIds = [],
  unreadCounts = {},
  activeChatUser,
  isChatMinimized,
  privateMessages = [],
  onSendPrivateMessage,
  onReactToPrivateMessage
}: SidebarProps) => {
  const activeUsers = React.useMemo(() => {
    const onlineThreshold = 15 * 60 * 1000;
    const now = Date.now();
    
    // Helper to check if a user is online
    const checkOnline = (u: User) => u.id === user.id || (u.lastActive && (now - u.lastActive < onlineThreshold));

    // FILTER to show ONLY online users in this section
    return users
      .filter(checkOnline)
      .sort((a, b) => {
        if (a.id === user.id) return -1;
        if (b.id === user.id) return 1;
        return (b.lastActive || 0) - (a.lastActive || 0);
      });
  }, [users, user.id]);

  const onlineThreshold = 15 * 60 * 1000;
  // Enhanced isOnline logic to force current user status
  const isOnline = (u: User) => {
    if (u.id === user.id) return true; // FORCE SELF ONLINE
    return !!(u.lastActive && (Date.now() - u.lastActive < onlineThreshold));
  };

  const onlineCount = Math.max(1, activeUsers.length);

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
              <h1 className="text-[14px] font-black tracking-tighter text-gray-900 uppercase leading-none truncate bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">PHÒNG QLCL</h1>
            </div>
          </div>
        </div>
        
        <nav className="space-y-1 flex-none mb-4">
          {[
            { id: 'tasks', label: 'BẢNG CÔNG VIỆC', icon: ClipboardList, count: activeTasksCount, color: 'bg-blue-500 text-white shadow-blue-100' },
            { id: 'pending_confirmation', label: 'ĐỀ XUẤT MỚI', icon: Sparkles, count: pendingTasksCount, color: 'bg-emerald-500 text-white shadow-emerald-200', isAlert: true, isSubItem: true },
            { id: 'completed_tasks', label: 'CV HOÀN THÀNH', icon: CheckCircle2, count: completedTasksCount, color: 'bg-indigo-500 text-white shadow-indigo-100', isSubItem: true },
            ...(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff
              ? [{ id: 'staff_list', label: 'THÔNG TIN NHÂN SỰ', icon: Users, count: totalStaffCount, color: 'bg-amber-500 text-white shadow-amber-100' }] 
              : []),
            { id: 'profile', label: 'Trang cá nhân', icon: UserIcon },
            { id: 'reports', label: 'Báo cáo tháng', icon: BarChart3 },
            ...(user.role === 'Admin'
              ? [{ id: 'system_history', label: 'NHẬT KÝ HỆ THỐNG', icon: Database, color: 'bg-indigo-600 text-white shadow-indigo-100' }]
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
              <span className="flex-1 text-left uppercase text-sm font-black whitespace-nowrap">{item.label}</span>
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

        {/* Active Users Section */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
          <div className="flex items-center justify-between mb-3 px-1">
             <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <Users size={12} className="text-blue-500" /> HOẠT ĐỘNG
             </h3>
             <div className="bg-emerald-100/50 text-emerald-600 px-1.5 py-0.5 rounded-full border border-emerald-200/50 flex items-center gap-1 shadow-sm">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[9px] font-black">{onlineCount}</span>
             </div>
          </div>
          
          <div className="space-y-2 block opacity-100 min-h-[50px]">
            {activeUsers.length > 0 ? (
              activeUsers.map(u => (
                <div key={u.id} className="relative">
                  <button 
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onUserClick?.(u, rect.top + rect.height / 2);
                    }}
                    className={`w-full flex items-center gap-2.5 px-2 group hover:bg-blue-50/50 py-1.5 rounded-lg transition-all sidebar-user-item ${activeChatUser?.id === u.id ? 'bg-blue-50/50' : ''}`}
                  >
                    <div className="relative flex-none">
                      <Avatar src={u.avatar} name={u.name} size="sm" />
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 border-2 border-white rounded-full ${
                        isOnline(u) 
                          ? 'bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.8)]' 
                          : 'bg-gray-300'
                      }`}></div>
                    </div>
                    <div className="flex-1 min-w-0 text-left flex items-center justify-between gap-1">
                      <div className="min-w-0">
                        <p className={`text-[11px] font-bold truncate transition-colors ${activeChatUser?.id === u.id ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'}`}>
                          {u.name} {u.id === user.id && <span className="text-[9px] text-blue-500 font-black ml-1">(BẠN)</span>}
                        </p>
                        <p className={`text-[8px] font-black uppercase tracking-tighter truncate ${hasDelegatedPermissions(u) ? 'text-amber-500' : 'text-gray-400'}`}>
                          {u.role} {u.delegatedPermissions && (() => {
                            const count = Object.values(u.delegatedPermissions).filter(Boolean).length;
                            if (count === 0) return null;
                            if (count === 6) return '(QUYỀN TP)';
                            return `(ỦY QUYỀN ${count}/6)`;
                          })()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-none">
                        <div className="relative group-hover:scale-110 transition-transform">
                          <ChatIcon className={`w-6 h-6 ${activeChatUser?.id === u.id && !isChatMinimized ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'} transition-all drop-shadow-sm`} />
                          {unreadCounts[u.id] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce z-10">
                              {unreadCounts[u.id]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                </div>
              ))
            ) : (
              <div className="px-2 py-4 text-center">
                <p className="text-[10px] text-gray-400 italic mb-1">Đang tải danh sách...</p>
              </div>
            )}

            <div className="h-px bg-gray-100 mx-1 my-1 opacity-50" />

            {/* Group Chat Moved Below Staff List */}
            <button 
              onClick={() => setActiveTab('group_chat')}
              className={`w-full flex items-center gap-2.5 px-2 group hover:bg-rose-50/50 py-1.5 rounded-lg transition-all ${activeTab === 'group_chat' ? 'bg-rose-50/50 ring-1 ring-rose-100' : ''}`}
            >
              <div className="relative flex-none">
                <div className="p-1.5 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg shadow-sm border border-rose-400/20">
                   <GroupChatIcon className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 border-2 border-white rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0 text-left flex items-center justify-between gap-1">
                <div className="min-w-0">
                  <p className={`text-[10px] font-black uppercase truncate transition-colors ${activeTab === 'group_chat' ? 'text-rose-600' : 'text-gray-700 group-hover:text-rose-600'}`}>Chat Nhóm</p>
                  <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter truncate">Thảo luận chung</p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <div className="relative group-hover:scale-110 transition-transform">
                    <GroupDiscussionIcon className={`w-9 h-9 ${activeTab === 'group_chat' ? 'text-rose-600' : 'text-gray-400 opacity-60 group-hover:opacity-100'} transition-all`} />
                    {groupUnreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[9px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce z-10">
                        {groupUnreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 px-2">
          <Avatar src={user.avatar} name={user.name} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{user.name}</p>
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
