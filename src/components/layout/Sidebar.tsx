import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from '../../types';
import { ClipboardList, User as UserIcon, CheckCircle2, BarChart3, LogOut, MessageSquare, Users, Database, Sparkles, Trash2, ChevronRight, Tag, Clock, Workflow, LayoutGrid, ShieldAlert, CheckCheck, PlusSquare, Save, Calendar, Gift, Shield } from 'lucide-react';

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

  // BẢO TRÌ HỆ THỐNG States
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [selectedFileContent, setSelectedFileContent] = useState<any>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // LOGIC SAO LƯU (Backup JSON)
  const handleBackup = async () => {
    try {
      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const tasksData = tasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const profilesSnap = await getDocs(collection(db, 'user_profiles'));
      const profilesData = profilesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const categoriesSnap = await getDocs(collection(db, 'task_categories'));
      const categoriesData = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupPayload = {
        tasks: tasksData,
        user_profiles: profilesData,
        task_categories: categoriesData,
        backupAt: new Date().toISOString()
      };

      const date = new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      const fileName = `QLCL_HUB_FULL_DATA_${dd}${mm}${yy}.json`;

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupPayload, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error('Backup failed:', error);
      alert('Backup thất bại: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Upload/parse JSON tệp
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.tasks || !parsed.user_profiles || !parsed.task_categories) {
          alert("Lỗi định dạng tệp: Tệp sao lưu không hợp lệ hoặc thiếu dữ liệu cốt lõi!");
          return;
        }
        setSelectedFileContent(parsed);
        setShowRestoreModal(true);
        setConfirmInput('');
      } catch (err) {
        alert("Lỗi phân tích cú pháp tệp JSON!");
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // xóa input file
  };

  // LOGIC PHỤC HỒI (Restore JSON - Khóa an toàn)
  const handleRestoreConfirm = async () => {
    if (confirmInput !== 'CONFIRM') return;
    if (!selectedFileContent) return;

    setIsRestoring(true);
    try {
      const { tasks, user_profiles, task_categories } = selectedFileContent;

      const tasksSnap = await getDocs(collection(db, 'tasks'));
      const profilesSnap = await getDocs(collection(db, 'user_profiles'));
      const categoriesSnap = await getDocs(collection(db, 'task_categories'));

      const deleteOps: any[] = [];
      tasksSnap.docs.forEach(d => deleteOps.push({ ref: doc(db, 'tasks', d.id), type: 'delete' }));
      profilesSnap.docs.forEach(d => deleteOps.push({ ref: doc(db, 'user_profiles', d.id), type: 'delete' }));
      categoriesSnap.docs.forEach(d => deleteOps.push({ ref: doc(db, 'task_categories', d.id), type: 'delete' }));

      const writeOps: any[] = [];
      tasks.forEach((item: any) => {
        const { id, ...data } = item;
        if (id) writeOps.push({ ref: doc(db, 'tasks', id), type: 'set', data });
      });
      user_profiles.forEach((item: any) => {
        const { id, ...data } = item;
        if (id) writeOps.push({ ref: doc(db, 'user_profiles', id), type: 'set', data });
      });
      task_categories.forEach((item: any) => {
        const { id, ...data } = item;
        if (id) writeOps.push({ ref: doc(db, 'task_categories', id), type: 'set', data });
      });

      const allOps = [...deleteOps, ...writeOps];
      const batchSize = 400;
      for (let i = 0; i < allOps.length; i += batchSize) {
        const chunk = allOps.slice(i, i + batchSize);
        const batch = writeBatch(db);
        chunk.forEach(op => {
          if (op.type === 'delete') {
            batch.delete(op.ref);
          } else if (op.type === 'set') {
            batch.set(op.ref, op.data);
          }
        });
        await batch.commit();
      }

      alert("Hệ thống đã được phục hồi trạng thái cũ!");
      window.location.reload();
    } catch (error) {
      console.error('Restore failed:', error);
      alert('Khôi phục thất bại: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsRestoring(false);
      setShowRestoreModal(false);
    }
  };

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
    administration: ['staff_list', 'system_history', 'super_backup', 'permission_matrix'],
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
    { id: 'staff_list', label: 'PHÂN KHU VĂN PHÒNG', icon: Users, count: totalStaffCount, color: 'bg-orange-500', isAlert: bouncingItems['staff_list'] },
    { id: 'profile', label: 'TRANG CÁ NHÂN', icon: UserIcon },
    { id: 'reports', label: 'BÁO CÁO THÁNG', icon: BarChart3 },
    { id: 'system_history', label: 'PHÂN KHU DỮ LIỆU', icon: Database, color: 'bg-indigo-600' },
    { id: 'super_backup', label: 'SIÊU BACKUP', icon: Save, color: 'bg-slate-600' },
  ];

  const getGroupItems = () => {
    const itemIds = GROUP_MAPPING[activeGroup] || [];
    return allMenuItems.filter(item => {
      // Admin has full bypass power
      if (user.role === 'Admin') return itemIds.includes(item.id);

      // Fetch permissions
      const perms = (user.delegatedPermissions || {}) as any;

      if (item.id === 'pending_confirmation' && perms.newProposals_view === false) return false;
      if (item.id === 'tasks' && perms.tasks_view === false) return false;
      if (item.id === 'pending_approval' && perms.pendingApproval_view === false) return false;
      if (item.id === 'completed_tasks' && perms.completedTasks_view === false) return false;
      if (item.id === 'trash' && perms.trash_view === false) return false;

      if (item.id === 'staff_list' && !perms.canManageStaff) return false;
      if (item.id === 'system_history' && !perms.canViewSystemHistory && !perms.canManageCategories) return false;
      if (item.id === 'super_backup' && !perms.canAccessSuperBackup) return false;
      if (item.id === 'permission_matrix' && !perms.canManageStaff) return false;

      if (item.id === 'reports' && perms.reports_viewPage === false) return false;

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
    <div id="sidebar-container" className="hidden md:flex h-screen sticky top-0 z-[100] print:hidden">
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
            <div className={`${isCollapsed ? 'w-12 h-12 justify-center' : 'w-full p-3'} flex items-center gap-3 ${isDarkL1 ? 'bg-white/10' : 'bg-white'} rounded-2xl border ${isDarkL1 ? 'border-white/10' : 'border-blue-100/50'} shadow-sm relative overflow-hidden group transition-all`}>
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
              const isActive = activeTab === item.id || 
                (item.id === 'staff_list' && ['office_calendar', 'attendance', 'leave_request', 'birthday', 'staff_list'].includes(activeTab)) ||
                (item.id === 'system_history' && ['system_history', 'category_management', 'permission_matrix'].includes(activeTab));
              
              // Only show certain items to Admin
              if (item.id === 'system_history' && user.role !== 'Admin' && !user.delegatedPermissions?.canViewSystemHistory && !user.delegatedPermissions?.canManageCategories) return null;
              if (item.id === 'super_backup' && user.role !== 'Admin' && !user.delegatedPermissions?.canAccessSuperBackup) return null;

              return (
                <div key={item.id} className="relative group/nav">

                  {/* Connector line for workflow items - Only for first 4 items to avoid line below Trash */}
                  {!isCollapsed && isWorkflowItem && idx < 4 && (
                    <div className={`absolute left-[23px] top-8 w-px h-6 ${isDarkL1 ? 'bg-white/10' : 'bg-gray-200'} z-0`} />
                  )}
                  <button
                    onClick={() => {
                      if (item.id === 'super_backup') {
                        if (onSuperBackup) onSuperBackup();
                        return;
                      }
                      const canManageStaff = user.role === 'Admin' || !!user.delegatedPermissions?.canManageStaff;
                      if (item.id === 'staff_list' && !canManageStaff) {
                        setActiveTab('office_calendar');
                      } else {
                        setActiveTab(item.id);
                      }
                      if (['staff_list', 'system_history', 'super_backup'].includes(item.id)) {
                        if (!isCollapsed) {
                          onToggleCollapse();
                        }
                      }
                    }}
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

      {/* LEVEL 2 SIDEBAR - ADMIN MAINTENANCE OR EMPTY FOR REGULAR USERS */}
      <AnimatePresence>
        {isCollapsed && ['office_calendar', 'attendance', 'leave_request', 'birthday', 'staff_list', 'system_history', 'category_management', 'permission_matrix'].includes(activeTab) && (
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

            {(() => {
              const isOfficeSection = ['office_calendar', 'attendance', 'leave_request', 'birthday', 'staff_list'].includes(activeTab);
              const isDbSection = ['system_history', 'category_management', 'permission_matrix'].includes(activeTab);
              
              return (
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar p-5">
                  {isOfficeSection ? (
                    // OFFICE SECTION (PHÂN KHU VĂN PHÒNG)
                    !isLevel2Collapsed ? (
                      <div className="flex-1 flex flex-col h-full min-h-0">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-sm">🌸</span>
                          <span translate="no" className="notranslate font-black text-slate-800 uppercase text-[12px] tracking-wider">
                            Phân Khu Văn Phòng
                          </span>
                        </div>
                        <div className="space-y-1 flex-1">
                          {(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff) && (
                            <button
                              onClick={() => setActiveTab('staff_list')}
                              className={`w-full flex items-center gap-2.5 py-2 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                                activeTab === 'staff_list' 
                                  ? 'bg-blue-600 text-white shadow-md' 
                                  : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-800'
                              }`}
                            >
                              <Users size={15} strokeWidth={2.5} className="shrink-0" />
                              <span translate="no" className="notranslate flex-1">Quản Lý Nhân Sự</span>
                            </button>
                          )}

                          <button
                            onClick={() => setActiveTab('office_calendar')}
                            className={`w-full flex items-center gap-2.5 py-2 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                              activeTab === 'office_calendar' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-800'
                            }`}
                          >
                            <Calendar size={15} strokeWidth={2.5} className="shrink-0" />
                            <span translate="no" className="notranslate flex-1">Lịch Công Tác</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('leave_request')}
                            className={`w-full flex items-center gap-2.5 py-2 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                              activeTab === 'leave_request' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-800'
                            }`}
                          >
                            <ClipboardList size={15} strokeWidth={2.5} className="shrink-0" />
                            <span translate="no" className="notranslate flex-1">Đơn Xin Nghỉ Phép</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('attendance')}
                            className={`w-full flex items-center gap-2.5 py-2 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                              activeTab === 'attendance' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-800'
                            }`}
                          >
                            <Clock size={15} strokeWidth={2.5} className="shrink-0" />
                            <span translate="no" className="notranslate flex-1">Chấm Công Hàng Ngày</span>
                          </button>

                          <button
                            onClick={() => setActiveTab('birthday')}
                            className={`w-full flex items-center gap-2.5 py-2 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap text-left ${
                              activeTab === 'birthday' 
                                ? 'bg-blue-600 text-white shadow-md' 
                                : 'text-slate-600 hover:bg-blue-50/50 hover:text-blue-800'
                            }`}
                          >
                            <Gift size={15} strokeWidth={2.5} className="shrink-0" />
                            <span translate="no" className="notranslate flex-1">Sinh Nhật Thành Viên</span>
                          </button>
                        </div>
                        
                        {/* Cutest decorative card at the bottom of panel */}
                        <div className="mt-auto pt-4 border-t border-dashed border-gray-200/40 flex flex-col items-center justify-center text-center pb-2 select-none">
                          <div className="flex items-center gap-1.5 opacity-85">
                            <span className="text-base animate-bounce duration-1000">🧸</span>
                            <span className="text-base animate-bounce duration-1000 delay-150">⭐</span>
                            <span className="text-base animate-bounce duration-1000 delay-300">🎈</span>
                          </div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
                            QLCL TÂN PHÚ
                          </p>
                          <p className="text-[8.5px] text-slate-400 font-bold mt-0.5">
                            Chúc một ngày thật tuyệt vời! 💕
                          </p>
                        </div>
                      </div>
                    ) : (
                      // Collapsed items
                      <div className="flex flex-col gap-4 items-center py-4 flex-1">
                        {(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff) && <button onClick={() => setActiveTab('staff_list')} title="Quản Lý Nhân Sự" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'staff_list' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Users size={16} /></button>}
                        <button onClick={() => setActiveTab('office_calendar')} title="Lịch Công Tác" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'office_calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Calendar size={16} /></button>
                        <button onClick={() => setActiveTab('leave_request')} title="Đơn Xin Nghỉ Phép" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'leave_request' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><ClipboardList size={16} /></button>
                        <button onClick={() => setActiveTab('attendance')} title="Chấm Công Hàng Ngày" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'attendance' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Clock size={16} /></button>
                        <button onClick={() => setActiveTab('birthday')} title="Sinh Nhật Thành Viên" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'birthday' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Gift size={16} /></button>
                      </div>
                    )
                  ) : isDbSection ? (
                    // DATABASE SECTION (CƠ SỞ DỮ LIỆU) -> Admins Only
                    (user.role === 'Admin' || user.delegatedPermissions?.canManageCategories || user.delegatedPermissions?.canViewSystemHistory) ? (
                      !isLevel2Collapsed ? (
                        <>
                          <span translate="no" className="notranslate font-black text-indigo-950 uppercase text-xs mb-4 block tracking-wider">
                            Cơ Sở Dữ Liệu
                          </span>
                          <div className="space-y-1.5 flex-1">
                            {(user.role === 'Admin' || user.delegatedPermissions?.canManageCategories) && (
                              <button
                                onClick={() => setActiveTab('category_management')}
                                className={`w-full flex items-center gap-2 py-2.5 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${
                                  activeTab === 'category_management' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-blue-50/40 hover:text-blue-800'
                                }`}
                              >
                                <Tag size={13} strokeWidth={2.5} className="shrink-0" />
                                <span translate="no" className="notranslate">Quản Lý Danh Mục</span>
                              </button>
                            )}

                            {(user.role === 'Admin' || user.delegatedPermissions?.canViewSystemHistory) && (
                              <button
                                onClick={() => setActiveTab('system_history')}
                                className={`w-full flex items-center gap-2 py-2.5 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${
                                  activeTab === 'system_history' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-blue-50/40 hover:text-blue-800'
                                }`}
                              >
                                <Database size={13} strokeWidth={2.5} className="shrink-0" />
                                <span translate="no" className="notranslate">Nhật Ký Hệ Thống</span>
                              </button>
                            )}

                            {(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff) && (
                              <button
                                onClick={() => setActiveTab('permission_matrix')}
                                className={`w-full flex items-center gap-2 py-2.5 px-3 text-[10.5px] font-black uppercase rounded-xl transition-all whitespace-nowrap ${
                                  activeTab === 'permission_matrix' 
                                    ? 'bg-blue-600 text-white shadow-md' 
                                    : 'text-slate-600 hover:bg-blue-50/40 hover:text-blue-800'
                                }`}
                              >
                                <Shield size={13} strokeWidth={2.5} className="shrink-0" />
                                <span translate="no" className="notranslate">Phân Quyền Ma Trận</span>
                              </button>
                            )}
                          </div>
                        </>
                      ) : (
                        // Collapsed items
                        <div className="flex flex-col gap-4 items-center py-4 flex-1">
                          {(user.role === 'Admin' || user.delegatedPermissions?.canManageCategories) && (
                            <button onClick={() => setActiveTab('category_management')} title="Quản Lý Danh Mục" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'category_management' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Tag size={16} /></button>
                          )}
                          {(user.role === 'Admin' || user.delegatedPermissions?.canViewSystemHistory) && (
                            <button onClick={() => setActiveTab('system_history')} title="Nhật Ký Hệ Thống" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'system_history' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Database size={16} /></button>
                          )}
                          {(user.role === 'Admin' || user.delegatedPermissions?.canManageStaff) && (
                            <button onClick={() => setActiveTab('permission_matrix')} title="Phân Quyền Hệ Thống" className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${activeTab === 'permission_matrix' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-blue-50/50'}`}><Shield size={16} /></button>
                          )}
                        </div>
                      )
                    ) : (
                      // Non-admin attempting to access restricted DB area
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-3 opacity-60">
                        <ShieldAlert size={28} className="text-red-500 mb-2" />
                        <p translate="no" className="notranslate text-[9px] font-black uppercase leading-relaxed text-red-700">Giới Hạn Truy Cập</p>
                      </div>
                    )
                  ) : null}
                </div>
              );
            })()}

            {/* COMPACT BẢO TRÌ HỆ THỐNG */}
            {(user.role === 'Admin' || user.delegatedPermissions?.canAccessSuperBackup) && ['system_history', 'category_management'].includes(activeTab) && (
              <div className={`px-4 py-3 border-t ${isDarkL2 ? 'border-white/10' : 'border-gray-100'} bg-transparent`}>
                {!isLevel2Collapsed ? (
                  <div className="bg-gray-50/50 p-2 border border-gray-200/50 rounded-2xl relative overflow-hidden text-slate-800">
                    <div className="flex items-center justify-between mb-1.5 px-0.5">
                      <span translate="no" className="notranslate text-[10px] font-black uppercase text-blue-900 tracking-wide">
                        Bảo Trì Hệ Thống
                      </span>
                      <span title="Dự phòng quản trị" className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-full select-none">
                        ADM
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {/* SAO LƯU */}
                      <button
                        onClick={handleBackup}
                        title="Sao lưu hệ thống (Backup JSON)"
                        className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 bg-gray-100 hover:bg-gray-200 text-black font-black text-[9px] uppercase tracking-tight rounded-md border border-gray-200/60 active:scale-95 transition-all"
                      >
                        <Save size={11} strokeWidth={2.5} />
                        <span translate="no" className="notranslate">SAO LƯU</span>
                      </button>

                      {/* PHỤC HỒI */}
                      <label
                        title="Phục hồi hệ thống (Restore JSON)"
                        className="flex items-center justify-center gap-1.5 py-1.5 px-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-black text-[9px] uppercase tracking-tight rounded-md border border-red-200/60 cursor-pointer active:scale-95 transition-all"
                      >
                        <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                        <Database size={11} strokeWidth={2.5} />
                        <span translate="no" className="notranslate">PHỤC HỒI</span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 items-center">
                    <button
                      onClick={handleBackup}
                      title="Sao lưu hệ thống (Backup JSON)"
                      className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 flex items-center justify-center border border-gray-200 active:scale-95 transition-all text-black"
                    >
                      <Save size={13} strokeWidth={2.5} />
                    </button>
                    <label
                      title="Phục hồi hệ thống (Restore JSON)"
                      className="w-8 h-8 rounded-md bg-red-50 hover:bg-red-100 flex items-center justify-center border border-red-200 cursor-pointer active:scale-95 transition-all text-red-700 hover:animate-pulse"
                    >
                      <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                      <Database size={13} strokeWidth={2.5} />
                    </label>
                  </div>
                )}
              </div>
            )}

            {/* Color Selector */}
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

      {/* RESTORE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showRestoreModal && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isRestoring && setShowRestoreModal(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-red-200 rounded-2xl shadow-2xl p-6 overflow-hidden z-10 text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 text-red-600">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                  <ShieldAlert size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <span translate="no" className="notranslate text-sm font-black uppercase tracking-wider block">
                    Cảnh Báo Nguy Hiểm!
                  </span>
                  <span translate="no" className="notranslate text-[10px] font-black text-red-400 uppercase tracking-widest block">
                    THIẾT QUÂN LUẬT KHÔI PHỤC
                  </span>
                </div>
              </div>

              {/* Warning Content */}
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl mb-4">
                <span translate="no" className="notranslate text-xs font-black uppercase block mb-1.5 text-red-900">
                  HÀNH ĐỘNG NÀY SẼ:
                </span>
                <ul className="text-[11px] font-black uppercase tracking-tight space-y-1.5 text-red-800 list-disc pl-4">
                  <li>
                    <span translate="no" className="notranslate">XÓA SẠCH toàn bộ dữ liệu hiện tại trong hệ thống.</span>
                  </li>
                  <li>
                    <span translate="no" className="notranslate">NẠP LẠI chính xác dữ liệu từ tệp sao lưu đã chọn.</span>
                  </li>
                  <li>
                    <span translate="no" className="notranslate">HOẠT ĐỘNG không thể phục hồi hoặc hoàn tác sau khi chạy!</span>
                  </li>
                </ul>
              </div>

              {/* Prompt Input */}
              <div className="space-y-2 mb-6">
                <span translate="no" className="notranslate text-[10px] font-black text-slate-500 uppercase block">
                  Nhập chữ 'CONFIRM' bên dưới để xác nhận cam kết hành động:
                </span>
                <input
                  type="text"
                  placeholder="CONFIRM"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  disabled={isRestoring}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 disabled:opacity-50 text-slate-900"
                />
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isRestoring}
                  onClick={() => setShowRestoreModal(false)}
                  className="flex-1 h-10 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
                >
                  <span translate="no" className="notranslate">HỦY BỎ</span>
                </button>
                <button
                  type="button"
                  onClick={handleRestoreConfirm}
                  disabled={confirmInput !== 'CONFIRM' || isRestoring}
                  className="flex-1 h-10 rounded-md bg-red-600 hover:bg-red-700 text-white text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-30 disabled:bg-red-600 shadow-md"
                >
                  {isRestoring ? (
                    <span translate="no" className="notranslate">ĐANG NẠP...</span>
                  ) : (
                    <span translate="no" className="notranslate">THỰC THI PHỤC HỒI</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
