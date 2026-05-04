import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles, Trash2, ChevronRight } from 'lucide-react';

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
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) => {
  const [sidebarColor, setSidebarColor] = useState(() => {
    return localStorage.getItem('qlcl_sidebar_color') || 'white';
  });

  const isManager = user.role === 'Admin' || user.role === 'Leader' || !!user.delegatedPermissions?.canApproveTask;

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
    { id: 'red-dark', bg: 'bg-red-400', dot: 'bg-red-500', isDark: true },
    { id: 'emerald-dark', bg: 'bg-emerald-500', dot: 'bg-emerald-600', isDark: true },
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
      className={`${currentColor.bg} border-r border-gray-200 flex flex-col h-screen sticky top-0 z-[100] transition-colors duration-500 shadow-xl overflow-hidden`}
    >
      {/* Toggle Button Inside Sidebar Top */}
      <button 
        onClick={onToggleCollapse}
        className={`absolute top-10 -right-0.5 z-10 w-6 h-12 bg-white border border-gray-200 rounded-l-xl shadow-lg flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all ${isCollapsed ? 'translate-x-0' : 'translate-x-0'}`}
      >
        <ChevronRight size={16} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>

      <div className={`flex flex-col h-full ${isCollapsed ? 'p-4' : 'p-6'}`}>
        <div className={`flex flex-col gap-1 mb-6 ${isCollapsed ? 'items-center' : 'px-0.5'}`}>
          <div className={`flex items-center gap-3 p-3 ${isDark ? 'bg-white/10' : 'bg-gradient-to-br from-blue-50 to-indigo-50/50'} rounded-2xl border ${isDark ? 'border-white/10' : 'border-blue-100/50'} shadow-sm relative overflow-hidden group w-full`}>
            <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full blur-xl -mr-6 -mt-6" />
            <div className={`w-10 h-10 shrink-0 ${isDark ? 'bg-white text-gray-900' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'} rounded-xl flex items-center justify-center text-sm font-black shadow-lg ring-2 ring-white/20`}>Q</div>
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
        
        <nav className="space-y-1 flex-none mb-4">
          {[
            { id: 'tasks', label: <span translate="no" className="notranslate">BẢNG CÔNG VIỆC</span>, icon: ClipboardList, count: activeTasksCount, color: 'bg-blue-500 text-white shadow-blue-100' },
            { id: 'pending_confirmation', label: <span translate="no" className="notranslate"> ĐỀ XUẤT MỚI</span>, icon: Sparkles, count: pendingTasksCount, color: 'bg-emerald-500 text-white shadow-emerald-200', isAlert: true, isSubItem: true },
            { id: 'completed_tasks', label: <span translate="no" className="notranslate">CÔNG VIỆC HOÀN THÀNH</span>, icon: CheckCircle2, count: completedTasksCount, color: 'bg-indigo-500 text-white shadow-indigo-100', isSubItem: true },
            ...((user.role === 'Admin' || user.role === 'Leader' || user.delegatedPermissions?.canManageStaff) && user.name !== 'Võ Thị Mỹ Tân'
              ? [{ id: 'staff_list', label: <span translate="no" className="notranslate">QUẢN LÝ NHÂN SỰ</span>, icon: Users, count: totalStaffCount, color: 'bg-amber-500 text-white shadow-amber-100' }] 
              : []),
            { id: 'profile', label: <span translate="no" className="notranslate">TRANG CÁ NHÂN</span>, icon: UserIcon },
            { id: 'reports', label: <span translate="no" className="notranslate">BẢNG CÁO THÁNG</span>, icon: BarChart3 },
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
              title={isCollapsed ? item.label.props.children : undefined}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : 'gap-2.5 py-2 px-3.5'} text-lg font-medium rounded-xl transition-all relative ${
                activeTab === item.id 
                  ? (isDark ? 'bg-white/20 text-white shadow-sm' : 'bg-blue-50 text-blue-700 shadow-sm')
                  : (isDark ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900')
              }`}
            >
              <item.icon size={20} className="shrink-0" />
              {!isCollapsed && (
                <div className="flex-1 text-left uppercase text-[11px] font-black whitespace-nowrap overflow-hidden truncate">
                  {item.label}
                </div>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className={`${isCollapsed ? 'absolute -top-1 -right-1' : ''} text-[10px] font-black min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 ${isDark ? 'border-transparent' : 'border-white'} shadow-md shrink-0 ${
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
            title={isCollapsed ? "Room Thảo Luận" : undefined}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-2.5 px-3.5 py-3'} group hover:bg-rose-50/10 rounded-xl transition-all ${activeTab === 'group_chat' ? (isDark ? 'bg-white/20 ring-1 ring-white/20' : 'bg-rose-50/50 ring-1 ring-rose-100') : ''}`}
          >
            <div className="relative flex-none">
              <div className={`p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-sm border border-rose-400/20`}>
                 <GroupChatIcon className="w-5 h-5 text-white" />
              </div>
              {isCollapsed && groupUnreadCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce z-10">
                  {groupUnreadCount}
                </span>
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0 text-left flex items-center justify-between gap-1 overflow-hidden">
                <div className="min-w-0">
                  <p className={`text-[12px] font-black uppercase truncate transition-colors ${activeTab === 'group_chat' ? (isDark ? 'text-white' : 'text-rose-600') : (isDark ? 'text-white/80 group-hover:text-white' : 'text-gray-700 group-hover:text-rose-600')}`}>Room Thảo Luận</p>
                  <p className={`text-[8px] font-bold uppercase tracking-widest truncate ${isDark ? 'text-white/40' : 'text-gray-400'}`}>Cộng đồng QLCL</p>
                </div>
                <div className="flex items-center gap-2 flex-none">
                  <div className="relative group-hover:scale-110 transition-transform">
                    <GroupDiscussionIcon className={`w-8 h-8 ${activeTab === 'group_chat' ? (isDark ? 'text-white' : 'text-rose-600') : (isDark ? 'text-white/40 group-hover:text-white/60' : 'text-gray-400 opacity-60 group-hover:opacity-100')} transition-all`} />
                    {groupUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-black min-w-[20px] h-[20px] px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce z-10">
                        {groupUnreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </button>
        </div>
      </div>
      
        <div className={`px-4 py-3 border-t ${isDark ? 'border-white/10' : 'border-gray-100/50'} flex justify-center`}>
          {isCollapsed ? (
            <div className={`w-6 h-6 rounded-full border-2 ${isDark ? 'border-white/40' : 'border-gray-300'} flex items-center justify-center p-0.5`}>
              <div className={`w-full h-full rounded-full ${currentColor.dot.split(' ')[0]}`} />
            </div>
          ) : (
            <div className={`flex items-center gap-2 ${isDark ? 'bg-white/10' : 'bg-gray-100/50'} p-1 rounded-full border ${isDark ? 'border-white/10' : 'border-gray-200/50'}`}>
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSidebarColor(option.id)}
                  className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-all duration-300 ${option.dot} ${
                    sidebarColor === option.id 
                      ? 'scale-150 ring-2 ring-blue-400 ring-offset-1 z-10' 
                      : 'hover:scale-125 opacity-80 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

      <div className={`mt-0 border-t ${isDark ? 'border-white/10' : 'border-gray-100'} ${isDark ? 'bg-white/5' : 'bg-gray-50/50'} ${isCollapsed ? 'p-4 flex flex-col items-center gap-4' : 'p-4'}`}>
        <div className={`flex items-center gap-3 ${isCollapsed ? 'flex-col' : 'px-2'}`}>
          <Avatar src={user.avatar} name={user.name} size={isCollapsed ? "md" : "lg"} />
          {!isCollapsed ? (
            <div className="flex-1 min-w-0">
              <p translate="no" className={`text-sm font-bold truncate notranslate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span translate="no" className="notranslate">{user.name}</span>
              </p>
              <p className={`text-[10px] font-semibold uppercase ${isDark ? 'text-white/60' : (hasDelegatedPermissions(user) ? 'text-amber-600' : 'text-gray-500')}`}>
                {user.role === 'Admin' ? <span translate="no" className="notranslate">ADMIN</span> : user.role} {user.delegatedPermissions && (() => {
                  const count = Object.values(user.delegatedPermissions).filter(Boolean).length;
                  if (count === 0) return null;
                  if (count === 6) return '(QUYỀN TP)';
                  return `(ỦY QUYỀN ${count}/6)`;
                })()}
              </p>
            </div>
          ) : null}
          <button 
            onClick={onLogout}
            className={`p-1.5 transition-colors ${isDark ? 'text-white/40 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}
            title="Đăng xuất"
          >
            <LogOut size={isCollapsed ? 18 : 16} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
