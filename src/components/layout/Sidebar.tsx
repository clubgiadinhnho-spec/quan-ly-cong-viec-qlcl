import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles, Trash2, ChevronRight, Tag, Clock, Workflow, LayoutGrid, ShieldAlert, CheckCheck, PlusSquare } from 'lucide-react';

import { Avatar } from '../common/Avatar';
import { GroupChatIcon, GroupDiscussionIcon } from '../common/Icons';

interface SidebarProps {
  user: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
  pendingTasksCount?: number;
  pendingApprovalCount?: number;
  activeTasksCount?: number;
  completedTasksCount?: number;
  totalStaffCount?: number;
  groupUnreadCount?: number;
  trashTasksCount?: number;
  activeTasksAlert?: boolean;
  pendingTasksAlert?: boolean;
  pendingApprovalAlert?: boolean;
  completedTasksAlert?: boolean;
  trashTasksAlert?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ 
  user, 
  activeTab, 
  setActiveTab, 
  onLogout, 
  pendingTasksCount = 0, 
  pendingApprovalCount = 0,
  activeTasksCount = 0,
  completedTasksCount = 0,
  totalStaffCount = 0,
  groupUnreadCount = 0,
  trashTasksCount = 0,
  activeTasksAlert = false,
  pendingTasksAlert = false,
  pendingApprovalAlert = false,
  completedTasksAlert = false,
  trashTasksAlert = false,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) => {
  const prevCounts = React.useRef<Record<string, number>>({});
  const [bouncingItems, setBouncingItems] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    const currentCounts: Record<string, number> = {
      pending_confirmation: pendingTasksCount,
      tasks: activeTasksCount,
      pending_approval: pendingApprovalCount,
      completed_tasks: completedTasksCount,
      trash: trashTasksCount,
      staff_list: totalStaffCount,
    };

    const newBouncingItems = { ...bouncingItems };
    let hasNewBounce = false;

    Object.entries(currentCounts).forEach(([id, count]) => {
      // Logic: Nếu số lượng TĂNG LÊN so với trước đó
      if (count > (prevCounts.current[id] ?? count)) {
        newBouncingItems[id] = true;
        hasNewBounce = true;
        
        // Luôn giữ hiệu ứng trong 10 giây theo thiết quân luật
        setTimeout(() => {
          setBouncingItems(prev => ({ ...prev, [id]: false }));
        }, 10000);
      }
      prevCounts.current[id] = count;
    });

    if (hasNewBounce) {
      setBouncingItems(newBouncingItems);
    }
  }, [pendingTasksCount, activeTasksCount, pendingApprovalCount, completedTasksCount, trashTasksCount, totalStaffCount]);

  useEffect(() => {
    if (bouncingItems[activeTab]) {
      setBouncingItems(prev => ({ ...prev, [activeTab]: false }));
    }
  }, [activeTab]);

  const [sidebarColor, setSidebarColor] = useState(() => {
    return localStorage.getItem('qlcl_sidebar_color') || 'white';
  });

  const isManager = user.role === 'Admin' || !!user.delegatedPermissions?.canApproveTask;

  useEffect(() => {
    localStorage.setItem('qlcl_sidebar_color', sidebarColor);
  }, [sidebarColor]);

  const COLOR_OPTIONS = [
    { id: 'white', bg: 'bg-white', dot: 'bg-white border-gray-200', isDark: false },
    { id: 'purple', bg: 'bg-purple-50', dot: 'bg-purple-200', isDark: false },
    { id: 'blue-light', bg: 'bg-blue-50', dot: 'bg-blue-400', isDark: false },
    { id: 'emerald-light', bg: 'bg-emerald-50', dot: 'bg-emerald-400', isDark: false },
    { id: 'orange-light', bg: 'bg-orange-50', dot: 'bg-orange-400', isDark: false },
    { id: 'orange-dark', bg: 'bg-orange-300', dot: 'bg-orange-500', isDark: false },
    { id: 'navy', bg: 'bg-slate-800', dot: 'bg-slate-700', isDark: true },
    { id: 'indigo-dark', bg: 'bg-indigo-950', dot: 'bg-indigo-900', isDark: true },
  ];

  const currentColor = COLOR_OPTIONS.find(c => c.id === sidebarColor) || COLOR_OPTIONS[0];
  const isDark = currentColor.isDark;

  const hasDelegatedPermissions = (u: User) => u.delegatedPermissions && Object.values(u.delegatedPermissions).some(v => v);

  return (
    <motion.aside 
      initial={false}
      animate={{ width: isCollapsed ? 84 : 288 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`${currentColor.bg} border-r border-gray-200 flex flex-col h-screen sticky top-0 z-[100] transition-colors duration-500 shadow-xl`}
    >
      {/* Toggle Button Inside Sidebar Top */}
      <button 
        onClick={onToggleCollapse}
        className={`absolute top-12 -right-3 z-[110] w-6 h-10 bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all hover:scale-110 active:scale-95`}
      >
        <ChevronRight size={14} strokeWidth={3} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      <div className={`flex flex-col h-full ${isCollapsed ? 'p-3' : 'p-6'}`}>
        <div className={`flex flex-col gap-1 mb-6 ${isCollapsed ? 'items-center' : 'px-0.5'}`}>
          <div className={`${isCollapsed ? 'w-12 h-12 p-0 justify-center' : 'p-3 w-full'} flex items-center gap-3 ${isDark ? 'bg-white/10' : 'bg-gradient-to-br from-blue-50 to-indigo-50/50'} rounded-2xl border ${isDark ? 'border-white/10' : 'border-blue-100/50'} shadow-sm relative overflow-hidden group transition-all`}>
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className={`${isCollapsed ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm'} shrink-0 ${isDark ? 'bg-white text-gray-900' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'} rounded-xl flex items-center justify-center font-black shadow-lg ring-2 ring-white/10 hover:rotate-12 transition-transform`}>Q</div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-col min-w-0"
                >
                  <span className={`text-[7px] font-black ${isDark ? 'text-white/60' : 'text-blue-500'} uppercase tracking-[0.3em] leading-none mb-1`}>Tân Phú Việt Nam</span>
                  <h1 className={`text-[14px] font-black tracking-tighter uppercase leading-none truncate ${isDark ? 'text-white' : 'bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent'}`}>
                    <span translate="no" className="notranslate">QLCL Tân Phú</span>
                  </h1>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto no-scrollbar space-y-0.5 mb-2 relative">
          <div className={`px-3.5 mb-1.5 mt-0.5 relative flex items-center ${isCollapsed ? 'justify-center' : 'gap-2.5'}`}>
            {/* Decorative line from title to first item */}
            {!isCollapsed && (
              <div className={`absolute left-[23.5px] top-7 w-0.5 h-4 ${isDark ? 'bg-white/10' : 'bg-gray-200'} z-0`} />
            )}
            
            <Workflow size={20} className={`${isDark ? 'text-white/40' : 'text-blue-400'} shrink-0`} />
            
            {!isCollapsed && (
              <span translate="no" className={`notranslate text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white/90' : 'text-blue-900'} opacity-80`}>
                QUY TRÌNH TÁC NGHIỆP
              </span>
            )}
          </div>
          {[
            { id: 'pending_confirmation', label: 'ĐỀ XUẤT MỚI', icon: Sparkles, count: pendingTasksCount, color: 'bg-emerald-500', isAlert: bouncingItems['pending_confirmation'], isSubItem: true },
            { id: 'tasks', label: 'BẢNG CÔNG VIỆC', icon: LayoutGrid, count: activeTasksCount, color: 'bg-red-600', isAlert: bouncingItems['tasks'], isSubItem: true },
            { id: 'pending_approval', label: 'TRÌNH DUYỆT', icon: ShieldAlert, count: pendingApprovalCount, color: 'bg-orange-500', isAlert: bouncingItems['pending_approval'], isSubItem: true },
            { id: 'completed_tasks', label: 'CÔNG VIỆC HOÀN THÀNH', icon: CheckCheck, count: completedTasksCount, color: 'bg-blue-600', isAlert: bouncingItems['completed_tasks'], isSubItem: true },
            { id: 'trash', label: 'TRUNG TÂM XÓA', icon: Trash2, count: trashTasksCount, color: 'bg-red-600', isAlert: bouncingItems['trash'], isSubItem: true },
            ...((user.role === 'Admin')
              ? [{ id: 'staff_list', label: 'QUẢN LÝ NHÂN SỰ', icon: Users, count: totalStaffCount, color: 'bg-orange-500', isAlert: bouncingItems['staff_list'] }] 
              : []),
            { id: 'profile', label: 'TRANG CÁ NHÂN', icon: UserIcon },
            { id: 'reports', label: 'BÁO CÁO THÁNG', icon: BarChart3 },
            ...(user.role === 'Admin'
              ? [
                  { id: 'system_history', label: 'NHẬT KÝ HỆ THỐNG', icon: Database, color: 'bg-indigo-600 text-white shadow-indigo-100' }
                ]
              : []),
          ].map((item: any, idx: number, arr: any[]) => {
            // Logic để vẽ đường kết nối giữa các item có isSubItem (quy trình công việc)
            const isWorkflowItem = item.isSubItem && idx < 5;
            const hasNextWorkflowItem = isWorkflowItem && idx < 4;

            return (
              <div key={item.id} className="relative group/nav">
                {/* Connector Line */}
                {hasNextWorkflowItem && !isCollapsed && (
                  <div className={`absolute left-[23px] top-8 w-0.5 h-6 ${isDark ? 'bg-white/10' : 'bg-gray-200'} z-0`} />
                )}
                
                <button
                  onClick={() => setActiveTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-2.5 py-2 px-3.5'} text-lg font-medium rounded-xl transition-all relative z-10 ${
                    activeTab === item.id 
                      ? (isDark ? 'bg-white/20 text-white shadow-sm' : 'bg-blue-50 text-blue-700 shadow-sm')
                      : (isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
                  } ${item.isSubItem && !isCollapsed ? 'pl-6' : ''} ${!isCollapsed && idx === 5 ? 'mt-5' : ''}`}
                >
                  <div className={`shrink-0 flex items-center justify-center transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover/nav:scale-110'} ${isCollapsed ? 'relative' : ''}`}>
                    {item.isSubItem && activeTab === item.id ? (
                      <div className={`w-1 h-4 absolute -left-2 rounded-r-full ${isDark ? 'bg-white' : 'bg-blue-600'}`} />
                    ) : null}
                    <item.icon size={item.isSubItem ? 18 : 20} className={`${activeTab === item.id ? (isDark ? 'text-white' : 'text-blue-600') : ''}`} />
                    
                    {/* Collapsed Badge (Over icon) */}
                    {item.count !== undefined && isCollapsed && (
                      <span className={`absolute -top-2.5 -right-2.5 min-w-[17px] h-4.5 px-1 rounded-full flex items-center justify-center border border-white shadow-xl z-[150] ${
                        item.color || 'bg-gray-500'
                      } text-white ${item.isAlert ? 'animate-bounce' : ''}`}>
                        <span translate="no" className="notranslate font-black text-[11px] leading-tight filter drop-shadow-sm">
                          {item.count}
                        </span>
                      </span>
                    )}
                  </div>
                  
                  {!isCollapsed && (
                    <div className={`flex-1 text-left uppercase ${item.isSubItem ? 'text-[10px]' : 'text-[11px]'} font-black whitespace-nowrap overflow-hidden truncate flex items-center`}>
                      <span translate="no" className="notranslate uppercase tracking-tight">{item.label}</span>
                    </div>
                  )}
                  {item.count !== undefined && !isCollapsed && (
                    <span className={`ml-auto min-w-[22px] h-5.5 px-1.5 rounded-full flex items-center justify-center border-2 ${isDark ? 'border-transparent' : 'border-white'} shadow-lg shrink-0 z-[150] ${
                      item.color || 'bg-gray-500'
                    } text-white ${item.isAlert ? 'animate-bounce' : ''}`}>
                      <span translate="no" className="notranslate font-black text-[13px] leading-none">
                        {item.count}
                      </span>
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </nav>

        {/* Bottom Fixed Area */}
        <div className="flex-none space-y-4 pt-4 border-t border-gray-100/30 mt-auto">
          {/* Group Chat */}
          <button 
            onClick={() => setActiveTab('group_chat')}
            title={isCollapsed ? "Room Thảo Luận" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-4 py-2.5'} group rounded-2xl transition-all ${activeTab === 'group_chat' ? (isDark ? 'bg-white/20 ring-1 ring-white/20' : 'bg-rose-50/50 ring-1 ring-rose-100') : 'hover:bg-gray-50/50'}`}
          >
            <div className="relative flex-none">
              <div className="w-9 h-9 flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                <GroupChatIcon className="w-5 h-5 text-white" />
              </div>
              {groupUnreadCount > 0 && isCollapsed && (
                <div className="absolute -top-2.5 -right-2.5 bg-blue-600 text-white min-w-[15px] h-4 px-0.5 rounded-full flex items-center justify-center border border-white shadow-xl z-[150]">
                  <span translate="no" className="notranslate text-[11px] font-black leading-tight filter drop-shadow-sm">{groupUnreadCount}</span>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className={`text-[12px] font-black uppercase truncate transition-colors leading-tight ${activeTab === 'group_chat' ? (isDark ? 'text-white' : 'text-rose-600') : (isDark ? 'text-white/80 group-hover:text-white' : 'text-gray-700 group-hover:text-rose-600')}`}>
                  <span translate="no" className="notranslate uppercase">ROOM THẢO LUẬN</span>
                </p>
                <p className={`text-[8.5px] font-black uppercase tracking-[0.1em] truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
                  <span translate="no" className="notranslate uppercase">CỘNG ĐỒNG QLCL</span>
                </p>
              </div>
            )}
            {groupUnreadCount > 0 && !isCollapsed && (
              <div className="bg-blue-600 text-white min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center shadow-md border border-white z-[150]">
                <span translate="no" className="notranslate text-white text-[13px] font-black leading-none">
                  {groupUnreadCount}
                </span>
              </div>
            )}
          </button>

          {/* Color Switcher & User Profile combined for space optimization */}
          <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-200/50'} border rounded-[24px] p-3.5 space-y-4 shadow-sm`}>
            {/* Color Switcher Row */}
            <div className={`flex items-center justify-center ${isCollapsed ? 'py-1' : 'py-2'} bg-white/50 rounded-xl shadow-inner-sm border border-black/5`}>
              {isCollapsed ? (
                <div className={`w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center p-0.5`}>
                  <div className={`w-full h-full rounded-full ${currentColor.dot.split(' ')[0]}`} />
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-1">
                  {COLOR_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setSidebarColor(option.id)}
                      className={`w-3 h-3 rounded-full border shadow-sm transition-all duration-300 ${option.dot} ${
                        sidebarColor === option.id 
                          ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 z-10' 
                          : 'hover:scale-125 opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Profile Row */}
            <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col p-1' : 'px-1'}`}>
              <div className="relative group/avatar">
                <Avatar src={user.avatar} name={user.name} size={isCollapsed ? "sm" : "md"} className="ring-2 ring-white shadow-md transition-transform group-hover/avatar:scale-105" />
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
              </div>
              {!isCollapsed ? (
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] font-black whitespace-nowrap notranslate leading-snug truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span translate="no" className="notranslate uppercase">{user.name}</span>
                  </div>
                  <p className={`text-[9px] font-black uppercase tracking-wider mt-0.5 ${isDark ? 'text-white/60' : (hasDelegatedPermissions(user) ? 'text-amber-600' : 'text-slate-500')}`}>
                    <span translate="no" className="notranslate uppercase">{user.role === 'Admin' ? 'ADMIN' : (user.role === 'Staff' ? 'NHÂN VIÊN' : user.role)}</span>
                  </p>
                </div>
              ) : null}
              <button 
                onClick={onLogout}
                title="Đăng xuất"
                className={`flex items-center justify-center p-2 rounded-xl transition-all ${
                  isDark 
                    ? 'text-white/60 hover:bg-red-500/20 hover:text-red-400' 
                    : 'text-slate-400 hover:bg-red-50 hover:text-red-600'
                } w-9 h-9 flex-none ml-auto border border-transparent hover:border-red-100 shadow-sm hover:shadow-md active:scale-90`}
              >
                <LogOut size={16} strokeWidth={3} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.aside>
  );
};
