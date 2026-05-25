import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles, Trash2, ChevronRight, Tag, Clock, Workflow, LayoutGrid, ShieldAlert, CheckCheck, PlusSquare, Save } from 'lucide-react';

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
  onSuperBackup?: () => void;
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
  onSuperBackup,
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

  const [sidebarColorL1, setSidebarColorL1] = useState(() => {
    return localStorage.getItem('qlcl_sidebar_color_l1') || 'white';
  });

  const [sidebarColorL2, setSidebarColorL2] = useState(() => {
    return localStorage.getItem('qlcl_sidebar_color_l2') || 'white';
  });

  const isManager = user.role === 'Admin' || !!user.delegatedPermissions?.canApproveTask;

  useEffect(() => {
    localStorage.setItem('qlcl_sidebar_color_l1', sidebarColorL1);
  }, [sidebarColorL1]);

  useEffect(() => {
    localStorage.setItem('qlcl_sidebar_color_l2', sidebarColorL2);
  }, [sidebarColorL2]);

  const COLOR_OPTIONS = [
    { id: 'white', bg: 'bg-white', dot: 'bg-white border border-gray-300 shadow-inner', isDark: false },
    { id: 'purple', bg: 'bg-purple-50', dot: 'bg-purple-200', isDark: false },
    { id: 'blue-light', bg: 'bg-blue-50', dot: 'bg-blue-400', isDark: false },
    { id: 'emerald-light', bg: 'bg-emerald-50', dot: 'bg-emerald-400', isDark: false },
    { id: 'gray-light', bg: 'bg-slate-100', dot: 'bg-slate-200 border border-slate-300', isDark: false },
    { id: 'gray-medium', bg: 'bg-slate-200', dot: 'bg-slate-400 border border-slate-500', isDark: false },
    { id: 'orange-light', bg: 'bg-orange-50', dot: 'bg-orange-400', isDark: false },
    { id: 'navy', bg: 'bg-slate-800', dot: 'bg-slate-700', isDark: true },
    { id: 'indigo-dark', bg: 'bg-indigo-950', dot: 'bg-indigo-900', isDark: true },
  ];

  const currentColorL1 = COLOR_OPTIONS.find(c => c.id === sidebarColorL1) || COLOR_OPTIONS[0];
  const isDarkL1 = currentColorL1.isDark;

  const currentColorL2 = COLOR_OPTIONS.find(c => c.id === sidebarColorL2) || COLOR_OPTIONS[0];
  const isDarkL2 = currentColorL2.isDark;

  const hasDelegatedPermissions = (u: any) => {
    if (!u || !u.delegatedPermissions) return false;
    try {
      return Object.values(u.delegatedPermissions).some(v => !!v);
    } catch (e) {
      return false;
    }
  };

  const [activeGroup, setActiveGroup] = useState<string>('operations');
  const [isLevel2Collapsed, setIsLevel2Collapsed] = useState(false);

  // Map items to groups
  const GROUPS = [
    { id: 'dashboard', label: 'TỔNG QUAN', icon: LayoutGrid },
    { id: 'operations', label: 'TÁC NGHIỆP', icon: Workflow },
    { id: 'administration', label: 'QUẢN TRỊ', icon: ShieldAlert, adminOnly: true },
    { id: 'user_center', label: 'CÁ NHÂN', icon: UserIcon },
  ];

  const GROUP_MAPPING: Record<string, string[]> = {
    dashboard: ['dashboard'],
    operations: ['pending_confirmation', 'tasks', 'pending_approval', 'completed_tasks', 'trash'],
    administration: ['staff_list', 'system_history', 'super_backup'],
    user_center: ['profile', 'reports'],
  };

  // Determine active group based on current activeTab
  useEffect(() => {
    Object.entries(GROUP_MAPPING).forEach(([groupId, items]) => {
      if (items.includes(activeTab)) {
        setActiveGroup(groupId);
      }
    });

    if (activeTab === 'group_chat') {
      // Keep previous group or default to operations
    }
  }, [activeTab]);

  const allMenuItems = [
    { id: 'pending_confirmation', label: 'ĐỀ XUẤT MỚI', icon: Sparkles, count: pendingTasksCount, color: 'bg-emerald-500', isAlert: bouncingItems['pending_confirmation'] },
    { id: 'tasks', label: 'BẢNG CÔNG VIỆC', icon: LayoutGrid, count: activeTasksCount, color: 'bg-red-600', isAlert: bouncingItems['tasks'] },
    { id: 'pending_approval', label: 'TRÌNH DUYỆT', icon: ShieldAlert, count: pendingApprovalCount, color: 'bg-orange-500', isAlert: bouncingItems['pending_approval'] },
    { id: 'completed_tasks', label: 'CÔNG VIỆC HOÀN THÀNH', icon: CheckCheck, count: completedTasksCount, color: 'bg-blue-600', isAlert: bouncingItems['completed_tasks'] },
    { id: 'trash', label: 'TRUNG TÂM XÓA', icon: Trash2, count: trashTasksCount, color: 'bg-red-600', isAlert: bouncingItems['trash'] },
    { id: 'staff_list', label: 'QUẢN LÝ NHÂN SỰ', icon: Users, count: totalStaffCount, color: 'bg-orange-500', isAlert: bouncingItems['staff_list'] },
    { id: 'profile', label: 'TRANG CÁ NHÂN', icon: UserIcon },
    { id: 'reports', label: 'BÁO CÁO THÁNG', icon: BarChart3 },
    { id: 'system_history', label: 'NHẬT KÝ HỆ THỐNG', icon: Database, color: 'bg-indigo-600' },
    { id: 'super_backup', label: 'SIÊU BACKUP', icon: Save, color: 'bg-amber-500', isAction: true },
  ];

  const getGroupItems = () => {
    const itemIds = GROUP_MAPPING[activeGroup] || [];
    return allMenuItems.filter(item => {
      if (item.id === 'staff_list' && user.role !== 'Admin') return false;
      if (item.id === 'system_history' && user.role !== 'Admin') return false;
      if (item.id === 'super_backup' && user.role !== 'Admin') return false;
      return itemIds.includes(item.id);
    });
  };

  const getGroupCounts = (groupId: string) => {
    const itemIds = GROUP_MAPPING[groupId] || [];
    return allMenuItems
      .filter(item => itemIds.includes(item.id))
      .reduce((sum, item) => sum + (item.count || 0), 0);
  };

  const isGroupAlert = (groupId: string) => {
    const itemIds = GROUP_MAPPING[groupId] || [];
    return itemIds.some(id => bouncingItems[id]);
  };

  return (
    <div id="sidebar-container" className="flex h-screen sticky top-0 z-[100] print:hidden">
      {/* LEVEL 1 SIDEBAR */}
      <motion.aside 
        id="sidebar-level-1"
        initial={false}
        animate={{ width: isCollapsed ? 76 : 280 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`${currentColorL1.bg} border-r border-gray-200 flex flex-col h-full shadow-xl relative z-30 transition-colors duration-500`}
      >
        <button 
          id="toggle-sidebar-1"
          onClick={onToggleCollapse}
          className={`absolute top-12 -right-3 z-[150] w-6 h-10 bg-white border border-gray-200 rounded-lg shadow-lg flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all hover:scale-110 active:scale-95`}
        >
          <ChevronRight size={14} strokeWidth={3} className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
        </button>

        <div className={`flex flex-col h-full ${isCollapsed ? 'p-3' : 'p-5'} overflow-hidden`}>
          {/* Logo Area */}
          <div className="mb-6 flex flex-col gap-1 items-center">
            <div className={`${isCollapsed ? 'w-12 h-12' : 'w-full p-3'} flex items-center gap-3 ${isDarkL1 ? 'bg-white/10' : 'bg-white'} rounded-2xl border ${isDarkL1 ? 'border-white/10' : 'border-blue-100/50'} shadow-sm relative overflow-hidden group transition-all`}>
              <div className="absolute top-0 right-0 w-12 h-12 bg-blue-400/5 rounded-full blur-xl -mr-6 -mt-6" />
              <div className={`${isCollapsed ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'} shrink-0 ${isDarkL1 ? 'bg-white text-gray-900' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'} rounded-xl flex items-center justify-center font-black shadow-lg`}>Q</div>
              {!isCollapsed && (
                <div className="flex flex-col min-w-0">
                  <span className={`text-[7px] font-black ${isDarkL1 ? 'text-white/60' : 'text-blue-500'} uppercase tracking-[0.3em] leading-none mb-1`}>Tân Phú Việt Nam</span>
                  <h1 className={`text-[13px] font-black uppercase truncate ${isDarkL1 ? 'text-white' : 'text-gray-900'}`}>QLCL Tân Phú</h1>
                </div>
              )}
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar relative">
            {!isCollapsed && (
              <div className="px-3.5 mb-2 mt-2 flex items-center gap-2.5">
                <Workflow size={18} className={`${isDarkL1 ? 'text-white/40' : 'text-blue-400'} shrink-0`} />
                <span translate="no" className={`notranslate text-[10px] font-black uppercase tracking-widest ${isDarkL1 ? 'text-white' : 'text-[#2d4363]'}`}>QUY TRÌNH TÁC NGHIỆP</span>
              </div>
            )}

            {/* Workflow Section Icon (When collapsed) */}
            {isCollapsed && (
              <div className="flex justify-center mb-2 mt-2">
                <Workflow size={20} className={`${isDarkL1 ? 'text-white/40' : 'text-blue-400 opacity-50'}`} />
              </div>
            )}

            {allMenuItems.map((item, idx) => {
              const isWorkflowItem = ['pending_confirmation', 'tasks', 'pending_approval', 'completed_tasks', 'trash'].includes(item.id);
              const isActive = activeTab === item.id;
              
              // Only show certain items to Admin
              if (['staff_list', 'system_history', 'super_backup'].includes(item.id) && user.role !== 'Admin') return null;

              return (
                <div key={item.id} className="relative group/nav">

                  {/* Connector line for workflow items - Only for first 4 items to avoid line below Trash */}
                  {!isCollapsed && isWorkflowItem && idx < 4 && (
                    <div className={`absolute left-[23px] top-8 w-px h-6 ${isDarkL1 ? 'bg-white/10' : 'bg-gray-200'} z-0`} />
                  )}
                  <button
                    onClick={() => item.isAction ? onSuperBackup?.() : setActiveTab(item.id)}
                    className={`w-full flex items-center ${isCollapsed ? 'justify-center p-3' : `gap-3 py-2.5 px-3.5 ${isWorkflowItem ? 'pl-6' : ''}`} rounded-xl transition-all relative z-10 ${
                      isActive 
                        ? (isDarkL1 ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 shadow-sm')
                        : (isDarkL1 ? 'text-white/60 hover:bg-white/10 hover:text-white' : 'text-[#4b5e78] hover:bg-gray-50')
                    } ${!isCollapsed && item.id === 'staff_list' ? 'mt-6' : ''}`}
                  >
                    <div className="relative">
                      <item.icon size={isWorkflowItem ? 18 : 20} className={isActive ? (isDarkL1 ? 'text-white' : 'text-blue-600') : (isDarkL1 ? 'text-white/40' : 'text-gray-400')} />
                      {/* Badge in collapsed mode */}
                      {isCollapsed && item.count !== undefined && item.count > 0 && (
                        <span className={`absolute -top-2 -right-2 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center border border-white shadow-sm text-[9px] font-black text-white ${item.color || 'bg-gray-500'} ${item.isAlert ? 'animate-bounce' : ''}`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <span translate="no" className={`notranslate ${isWorkflowItem ? 'text-[10px]' : 'text-[11px]'} font-black uppercase tracking-tight flex-1 text-left`}>
                        {item.label}
                      </span>
                    )}
                    {!isCollapsed && item.count !== undefined && (
                      <span className={`min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center border-2 border-white shadow-md text-[10px] font-bold text-white ${item.color || 'bg-gray-500'} ${item.isAlert ? 'animate-bounce' : ''}`}>
                        {item.count}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </nav>

          {/* Bottom Area Level 1 */}
          <div className="mt-auto pt-4 space-y-3">
             {/* Room Thảo Luận */}
             <button 
                onClick={() => setActiveTab('group_chat')}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'} rounded-2xl transition-all ${activeTab === 'group_chat' ? (isDarkL1 ? 'bg-white/20' : 'bg-rose-50 ring-1 ring-rose-100') : 'hover:bg-gray-50'}`}
              >
                <div className="w-9 h-9 flex items-center justify-center bg-rose-500 rounded-xl shadow-md text-white shrink-0">
                  <GroupChatIcon className="w-5 h-5" />
                </div>
                {!isCollapsed && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className={`text-[10px] font-black uppercase leading-tight ${isDarkL1 ? 'text-white' : 'text-gray-700'}`}>ROOM THẢO LUẬN</p>
                    <p className={`text-[7.5px] font-black uppercase tracking-wider ${isDarkL1 ? 'text-white/40' : 'text-gray-400'}`}>CỘNG ĐỒNG QLCL</p>
                  </div>
                )}
                {groupUnreadCount > 0 && (
                  <span className={`bg-blue-600 text-white min-w-[18px] h-5 px-1 rounded-full flex items-center justify-center shadow-md border-2 border-white text-[10px] font-bold ${isCollapsed ? 'absolute top-1 right-1' : ''}`}>
                    {groupUnreadCount}
                  </span>
                )}
              </button>

              <div className={`${isDarkL1 ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200'} border rounded-2xl p-3 shadow-sm`}>
                {/* Color Selector for Level 1 */}
                {!isCollapsed && (
                  <div className="flex items-center justify-center mb-3 px-1 pt-1 border-b border-gray-100/10 pb-2">
                    <div className="flex flex-wrap gap-1.25 justify-center">
                      {COLOR_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => setSidebarColorL1(opt.id)} className={`w-3.5 h-3.5 rounded-full ${opt.dot} ${sidebarColorL1 === opt.id ? 'ring-2 ring-blue-500 scale-110' : ''}`} />
                      ))}
                    </div>
                  </div>
                )}

                <div className={`flex items-center gap-2 ${isCollapsed ? 'flex-col' : ''}`}>
                  <Avatar src={user.avatar} name={user.name} size={isCollapsed ? "sm" : "md"} className="ring-2 ring-blue-100 shadow-md" />
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-black truncate uppercase tracking-tight ${isDarkL1 ? 'text-white' : 'text-slate-900'}`}>{user.name}</p>
                      <p className="text-[8px] font-black text-blue-500 uppercase">{user.role}</p>
                    </div>
                  )}
                  <button onClick={onLogout} className={`p-2 rounded-xl transition-all border ${isDarkL1 ? 'text-white/40 border-white/10 hover:bg-red-500/20' : 'text-gray-400 border-gray-200 hover:bg-red-50 hover:text-red-600'}`}>
                    <LogOut size={14} strokeWidth={3} />
                  </button>
                </div>

                {/* Small indicator when collapsed for L1 */}
                {isCollapsed && (
                  <div className="flex justify-center mt-2">
                    <div className={`w-2 h-2 rounded-full ${currentColorL1.dot.split(' ')[0]} border border-gray-200`} />
                  </div>
                )}
              </div>
          </div>
        </div>
      </motion.aside>

      {/* LEVEL 2 SIDEBAR - EMPTY for now as per user request */}
      <AnimatePresence>
        {isCollapsed && (
          <motion.aside
            id="sidebar-level-2"
            initial={{ width: 0, opacity: 0, x: -20 }}
            animate={{ width: isLevel2Collapsed ? 76 : 240, opacity: 1, x: 0 }}
            exit={{ width: 0, opacity: 0, x: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`h-full ${currentColorL2.bg} border-r border-gray-200 flex flex-col shadow-2xl relative z-10 transition-colors duration-500`}
          >
            {/* Toggle button for Level 2 */}
            <button 
              id="toggle-sidebar-2"
              onClick={() => setIsLevel2Collapsed(!isLevel2Collapsed)}
              className="absolute top-12 -right-3 z-[110] w-6 h-8 bg-white border border-gray-200 rounded-lg shadow-md flex items-center justify-center text-gray-400 hover:text-blue-600 transition-all hover:scale-110"
            >
              <ChevronRight size={12} strokeWidth={3} className={`transition-transform duration-300 ${isLevel2Collapsed ? '' : 'rotate-180'}`} />
            </button>

            <div className={`flex-1 flex flex-col items-center justify-center ${isDarkL2 ? 'opacity-40' : 'opacity-20'} group overflow-hidden ${isLevel2Collapsed ? 'p-2' : 'p-5'}`}>
               <div className={`w-16 h-16 rounded-full ${isDarkL2 ? 'bg-white/10' : 'bg-gray-100'} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <PlusSquare size={32} className={isDarkL2 ? 'text-white' : 'text-gray-400'} />
               </div>
               {!isLevel2Collapsed && (
                 <p className={`text-[10px] font-black uppercase tracking-widest ${isDarkL2 ? 'text-white' : 'text-gray-400'}`}>Tầng 2 Đang Trống</p>
               )}
            </div>

            {/* Color Selector - Moved from Level 1 */}
            <div className={`mt-auto border-t ${isDarkL2 ? 'border-white/10' : 'border-gray-100'} ${isLevel2Collapsed ? 'p-3' : 'p-4'}`}>
               {!isLevel2Collapsed ? (
                  <div className={`flex items-center justify-center px-2 ${isDarkL2 ? 'bg-white/5' : 'bg-gray-50/50'} p-2 rounded-2xl border ${isDarkL2 ? 'border-white/10' : 'border-gray-100'} shadow-inner`}>
                    <div className="flex flex-row flex-nowrap gap-1.25 justify-center whitespace-nowrap items-center">
                      {COLOR_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => setSidebarColorL2(opt.id)} className={`w-3 h-3 rounded-full ${opt.dot} ${sidebarColorL2 === opt.id ? 'ring-2 ring-blue-500 scale-110' : 'hover:scale-110 transition-transform'}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                   <div className="flex justify-center">
                      <div className={`w-5 h-5 rounded-full ${currentColorL2.dot.split(' ')[0]} border border-gray-200 shadow-sm`} title="Màu sidebar" />
                   </div>
                )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};
