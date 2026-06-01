// Checkpoint: He thong on dinh truoc khi lam Bao cao
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User as UserType, Task, TaskCategory } from "./types";
import Login from "./components/Login";

// Import Components
import { Sidebar } from "./components/layout/Sidebar";
import { MainContent } from "./components/layout/MainContent";
import { NotificationCenter } from "./components/layout/NotificationCenter";
import { ScrollToTop } from "./components/common/ScrollToTop";
import { AppModals } from "./components/layout/AppModals";

import { useAuthContext } from "./contexts/AuthContext";
import { useTaskContext } from "./contexts/TaskContext";
import { isTaskDeleted } from "./utils/userUtils";
import { 
  ClipboardList, Sparkles, BarChart3, MessageSquare, 
  Menu, X, ShieldAlert, CheckCheck, Trash2, Users, Calendar, 
  Clock, FileText, Award, User as UserIcon, Settings, UserCheck, 
  Database, LogOut, Workflow, Maximize2, Minimize2, Smartphone
} from "lucide-react";
import { Avatar } from "./components/common/Avatar";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const { 
    currentUser, effectiveUser, authReady, handleLogout, 
    allUsers, staffLoading, updateProfile, deleteProfile,
    simulatedUser, setSimulatedUser, isAdmin
  } = useAuthContext();

  const {
    tasks, sortedTasks, counts, categories, discussionTopics, discussionMessages, logs, officialReports, aiMessages, presence, loading: firebaseLoading,
    activeTab, setActiveTab, viewScope, setViewScope, search, setSearch, selectedMonth, setSelectedMonth,
    addTask, updateTask, deleteTask, approveTaskCompletion, trashTasksBulk, approveTasksBulk, deleteTasksBulk, restoreTask, permanentDeleteTask,
    addTaskComment, updateTaskCommentReactions, sendDiscussionMessage, updateDiscussionMessageReactions, createTopic, updateTopic, deleteTopic,
    deleteTopicsBulk, deleteDiscussionMessage, saveReportDraft, saveOfficialReport, sendAiMessage, triggerAiNudge, resetTaskAIStatus,
    handleExportExcel, handleImportExcel, handleSuperBackup, notifications, adminUnreadCount, markNotifRead, deleteNotif, createNotification,
    appNotifications, setConfirmModal, confirmModal,
    showTaskModal, setShowTaskModal, editingTask, setEditingTask, showHistoryModal, setShowHistoryModal, showChatModal, setShowChatModal,
    highlightedTaskId, setHighlightedTaskId, showDirectChat, setShowDirectChat, isChatMinimized, setIsChatMinimized,
    isNotificationCenterOpen, setIsNotificationCenterOpen, showHealthReminder, setShowHealthReminder
  } = useTaskContext();

  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, []);

  const lastReminderTime = useRef<number>(Date.now());

  const { unreadNotifications, lastReadChatTimestamps, markAsRead, markSectionAsViewed } = appNotifications || { unreadNotifications: [], lastReadChatTimestamps: {}, markAsRead: () => {}, markSectionAsViewed: () => {} };

  const handleJumpToTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.isCycleRecord) return;

    setHighlightedTaskId(taskId);
    
    if (isTaskDeleted(task)) {
      setActiveTab("trash");
    } else if (task.status === 'PENDING_APPROVAL' || task.status === 'PENDING') {
      setActiveTab("pending_confirmation");
    } else if (task.status === 'COMPLETED' || task.status === 'Hoàn thành') {
      setActiveTab("completed_tasks");
    } else {
      setActiveTab("tasks");
    }
    
    setTimeout(() => setHighlightedTaskId(null), 10000);

    setTimeout(() => {
      const element = document.getElementById(`task-card-${taskId}`) || 
                      document.getElementById(`task-${taskId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  }, [tasks, setActiveTab, setHighlightedTaskId]);

  // Periodic reminder logic
  useEffect(() => {
    if (!effectiveUser || !effectiveUser.reminderSettings?.enabled) return;
    const checkInterval = setInterval(() => {
      const now = Date.now();
      const intervalMs = (effectiveUser.reminderSettings?.intervalMinutes || 30) * 60 * 1000;
      if (now - lastReminderTime.current >= intervalMs) {
        setShowHealthReminder(true);
        lastReminderTime.current = now;
      }
    }, 10000);
    return () => clearInterval(checkInterval);
  }, [effectiveUser]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    return counts;
  }, []);

  const groupUnreadCount = useMemo(() => {
    if (!effectiveUser) return 0;
    return discussionMessages.filter(m => {
      if (m.authorId === effectiveUser.id) return false;
      const lastRead = lastReadChatTimestamps[`topic_${m.topicId}`] || 0;
      return new Date(m.timestamp).getTime() > lastRead;
    }).length;
  }, [discussionMessages, effectiveUser, lastReadChatTimestamps]);

  const groupedSections = useMemo(() => [
    {
      label: "TÁC NGHIỆP",
      items: [
        { id: 'pending_confirmation', label: 'Đề Xuất Mới', icon: Sparkles, count: counts.pending, badgeColor: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]', permissionKey: 'newProposals_view' },
        { id: 'tasks', label: 'Bảng Công Việc', icon: ClipboardList, count: counts.active, badgeColor: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]', permissionKey: 'tasks_view' },
        { id: 'pending_approval', label: 'Trình Duyệt', icon: ShieldAlert, count: counts.pendingApprovalTotal, badgeColor: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]', permissionKey: 'pendingApproval_view' },
        { id: 'completed_tasks', label: 'Hoàn Thành', icon: CheckCheck, count: counts.completedTotal, badgeColor: 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.5)]', permissionKey: 'completedTasks_view' },
        { id: 'trash', label: 'Trung Tâm Xóa', icon: Trash2, count: counts.trash, badgeColor: 'bg-gray-600 shadow-[0_0_10px_rgba(75,85,99,0.5)]', permissionKey: 'trash_view' },
      ]
    },
    {
      label: "VĂN PHÒNG",
      items: [
        { id: 'office_calendar', label: 'Lịch Công Tác', icon: Calendar },
        { id: 'attendance', label: 'Bảng Chấm Công', icon: Clock },
        { id: 'leave_request', label: 'Đơn Xin Nghỉ Phép', icon: FileText },
        { id: 'birthday', label: 'Tiệc Sinh Nhật', icon: Award },
        { id: 'staff_list', label: 'Quản Lý Nhân Sự', icon: Users, permissionKey: 'canManageStaff' },
      ]
    },
    {
      label: "TIỆN ÍCH & BÁO CÁO",
      items: [
        { id: 'reports', label: 'Báo Cáo Tháng', icon: BarChart3, permissionKey: 'reports_viewPage' },
        { id: 'profile', label: 'Trang Cá Nhân', icon: UserIcon },
        { id: 'group_chat', label: 'Thảo Luận QLCL', icon: MessageSquare, count: groupUnreadCount, badgeColor: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' },
      ]
    },
    {
      label: "QUẢN TRỊ HỆ THỐNG",
      items: [
        { id: 'category_management', label: 'Cấu Hình Danh Mục', icon: Settings, permissionKey: 'canManageCategories' },
        { id: 'permission_matrix', label: 'Ma Trận Quyền Hạn', icon: UserCheck, permissionKey: 'canManageStaff' },
        { id: 'system_history', label: 'Phân Khu Dữ Liệu', icon: Database, permissionKey: 'canViewSystemHistory' },
      ]
    }
  ], [counts, groupUnreadCount]);

  if (!authReady || staffLoading) return (
    <div className="min-h-screen flex items-center justify-center font-black text-blue-600 uppercase bg-white animate-pulse">
      <span translate="no" className="notranslate">ĐANG TẢI DỮ LIỆU...</span>
    </div>
  );

  if (!currentUser) return <Login users={allUsers} onLogin={() => {}} onAddStaff={(u) => updateProfile(u.uniqueKey, u)} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar
        user={effectiveUser!} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}
        pendingTasksCount={counts.pending} 
        pendingApprovalCount={counts.pendingApprovalTotal} 
        activeTasksCount={counts.active} 
        completedTasksCount={counts.completedTotal}
        totalStaffCount={counts.staffTotal} 
        groupUnreadCount={groupUnreadCount} 
        trashTasksCount={counts.trash}
        activeTasksAlert={counts.attention > 0} 
        pendingTasksAlert={counts.pending > 0} 
        pendingApprovalAlert={counts.pendingApprovalUnread > 0}
        completedTasksAlert={counts.completedUnread > 0}
        trashTasksAlert={false}
        isCollapsed={isMainSidebarCollapsed} 
        onToggleCollapse={() => setIsMainSidebarCollapsed(!isMainSidebarCollapsed)}
        onSuperBackup={handleSuperBackup}
      />
      <main className={`flex-1 relative flex flex-col ${activeTab === 'group_chat' ? 'h-screen overflow-hidden' : 'py-6 mb-16 md:mb-0'} print:py-0 print:bg-white`}>
        <div className={`flex-1 ${activeTab === 'group_chat' ? 'h-full w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'} print:max-w-full print:px-0 print:mx-0`}>

          {simulatedUser && <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-2 flex justify-between shadow-lg"><span>GIẢ LẬP: {simulatedUser.name}</span><button onClick={() => setSimulatedUser(null)}>Thoát</button></div>}
          
          <MainContent />
        </div>
      </main>
      <NotificationCenter 
        isOpen={isNotificationCenterOpen}
        onClose={() => setIsNotificationCenterOpen(false)}
        notifications={notifications}
        onMarkAsRead={markNotifRead}
        onDelete={deleteNotif}
        onGoToTask={handleJumpToTask}
      />
      
      {/* Bottom Navigation for Mobile (< 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] flex items-center justify-around px-3 z-[80] backdrop-blur-md bg-white/95">
        {[
          { id: 'tasks', label: 'BẢNG CÔNG VIỆC', icon: ClipboardList, count: counts.active, badgeColor: 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]' },
          { id: 'pending_confirmation', label: 'Đề xuất', icon: Sparkles, count: counts.pending, badgeColor: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' },
          { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
          { id: 'menu', label: 'Menu', icon: Menu }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'menu') {
                  setIsMobileMenuOpen(true);
                } else {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }
              }}
              className={`flex-1 flex flex-col items-center justify-center h-full relative transition-all active:scale-95 ${isActive || (item.id === 'menu' && isMobileMenuOpen) ? 'text-blue-600 font-bold' : 'text-gray-400'}`}
            >
              <div className="relative p-1">
                <Icon size={20} className={isActive || (item.id === 'menu' && isMobileMenuOpen) ? 'stroke-[2.5]' : 'stroke-[2]'} />
                {item.count !== undefined && item.count > 0 && (
                  <span translate="no" className={`notranslate absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-black text-white border border-white leading-none z-10 ${item.badgeColor}`}>
                    {item.count}
                  </span>
                )}
              </div>
              <span translate="no" className="notranslate text-[10px] font-black mt-0.5 tracking-tight uppercase">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Menu Drawer Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[90] md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Drawer Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[2.5rem] z-[100] md:hidden shadow-[0_-12px_40px_rgba(0,0,0,0.12)] flex flex-col max-h-[85vh] overflow-hidden border-t border-gray-100"
            >
              {/* Grab handle bar */}
              <div className="shrink-0 pt-4 pb-2 flex flex-col items-center bg-white">
                <div className="w-12 h-1 bg-gray-200 rounded-full mb-3" />
                <div className="w-full px-6 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">🌸</span>
                    <span translate="no" className="notranslate text-xs font-black uppercase tracking-widest text-[#2d4263]">
                      Menu Tác Nghiệp
                    </span>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 px-3 rounded-xl border border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 transition-all text-[11px] font-black uppercase tracking-widest active:scale-95 shadow-sm bg-white"
                  >
                    <X size={14} strokeWidth={3} />
                    <span>Đóng</span>
                  </button>
                </div>
              </div>

              {/* Scroll Container */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 pb-8">
                {/* Header Group */}
                <div className="flex items-center gap-2.5 px-1 text-blue-500">
                  <Workflow size={20} className="stroke-[2.5]" />
                  <span translate="no" className="notranslate text-xs font-black uppercase tracking-widest text-[#2d4263]">
                    QUY TRÌNH TÁC NGHIỆP
                  </span>
                </div>

                {/* List Container with centered gray connector line */}
                <div className="relative flex flex-col gap-3">
                  {/* Vertical gray line passing exactly behind icon centers */}
                  <div className="absolute left-[32px] top-6 bottom-6 w-[1.5px] bg-slate-200/80 pointer-events-none z-0" />

                  {[
                    { id: 'pending_confirmation', label: 'ĐỀ XUẤT MỚI', icon: Sparkles, count: counts.pending, badgeColor: 'bg-[#10b981] shadow-[0_4px_10px_rgba(16,185,129,0.35)]' },
                    { id: 'tasks', label: 'BẢNG CÔNG VIỆC', icon: ClipboardList, count: counts.active, badgeColor: 'bg-[#dc2626] shadow-[0_4px_10px_rgba(220,38,38,0.4)]' },
                    { id: 'pending_approval', label: 'TRÌNH DUYỆT', icon: ShieldAlert, count: counts.pendingApprovalTotal, badgeColor: 'bg-[#f97316] shadow-[0_4px_10px_rgba(249,115,22,0.35)]' },
                    { id: 'completed_tasks', label: 'CÔNG VIỆC HOÀN THÀNH', icon: CheckCheck, count: counts.completedTotal, badgeColor: 'bg-[#2563eb] shadow-[0_4px_10px_rgba(37,99,235,0.4)]' },
                    { id: 'trash', label: 'TRUNG TÂM XÓA', icon: Trash2, count: counts.trash, badgeColor: 'bg-[#dc2626] shadow-[0_4px_10px_rgba(220,38,38,0.4)]' }
                  ].filter((item) => {
                    const perms = (effectiveUser?.delegatedPermissions || {}) as any;
                    if (effectiveUser?.role === 'Admin') return true;
                    if (item.id === 'pending_confirmation' && perms.newProposals_view === false) return false;
                    if (item.id === 'tasks' && perms.tasks_view === false) return false;
                    if (item.id === 'pending_approval' && perms.pendingApproval_view === false) return false;
                    if (item.id === 'completed_tasks' && perms.completedTasks_view === false) return false;
                    if (item.id === 'trash' && effectiveUser?.role !== 'Staff') return false;
                    return true;
                  }).map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between py-3.5 px-4 rounded-2xl transition-all duration-200 relative active:scale-[0.98] z-10 ${
                          isActive
                            ? "bg-[#edf4ff] text-blue-600 font-bold"
                            : "text-slate-700 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 z-10">
                          {/* Inner Circle wrapper */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all ${
                            isActive
                              ? "bg-white border-blue-200 text-blue-600 shadow-sm"
                              : "bg-white border-gray-100 text-[#8a99ad]"
                          }`}>
                            <Icon size={14} className={isActive ? "stroke-[2.5]" : "stroke-[2]"} />
                          </div>
                          <span translate="no" className={`notranslate text-[11px] font-black uppercase tracking-tight ${
                            isActive ? "text-blue-600" : "text-[#4b5e78]"
                          }`}>
                            {item.label}
                          </span>
                        </div>
                        {/* Status Badge */}
                        {item.count !== undefined && item.count >= 0 && (
                          <span translate="no" className={`notranslate min-w-[24px] h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black text-white ${item.badgeColor}`}>
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* MOBILE WEB-APP & FULLSCREEN UTILITIES */}
                <div className="bg-gradient-to-br from-indigo-50/75 to-purple-50/50 border border-indigo-100/80 rounded-2xl p-4.5 space-y-3.5 mt-4">
                  <div className="flex items-center gap-2">
                    <Smartphone size={16} className="text-indigo-600 animate-pulse" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-900">Tính năng toàn màn hình</span>
                  </div>

                  {/* Standard browser Fullscreen Toggle button */}
                  <button
                    onClick={() => {
                      toggleFullscreen();
                      setIsMobileMenuOpen(false); // Close menu drawer to let users enjoy fullscreen immediately
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-750 active:scale-[0.98] transition-all text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm shadow-indigo-100 cursor-pointer"
                  >
                    {isFullscreen ? (
                      <>
                        <Minimize2 size={14} strokeWidth={3} />
                        <span>Thoát Toàn Màn Hình</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 size={14} strokeWidth={3} />
                        <span>Bật Toàn Màn Hình (Tối ưu)</span>
                      </>
                    )}
                  </button>

                  {/* Progressive Web App Guidance on Adding to Home Screen */}
                  <div className="bg-white/80 rounded-xl p-3 border border-indigo-50 text-[11px] text-indigo-950 font-medium space-y-2 leading-relaxed">
                    <p className="font-extrabold text-indigo-800">
                      💡 MẸO ẨN THANH TRÌNH DUYỆT 100%:
                    </p>
                    <p>
                      Để chạy ứng dụng dạng App Di Động Native không có thanh địa chỉ thô kệch:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[10.5px] text-indigo-900 border-t border-indigo-50/50 pt-1.5 font-sans">
                      <li>
                        <strong className="text-indigo-950">Safari (iPhone/iPad):</strong> Ấn nút <span className="font-black text-xs text-indigo-600">Chia sẻ 📤</span> ➔ Tìm & chọn <strong className="text-indigo-950">"Thêm vào MH chính"</strong>.
                      </li>
                      <li>
                        <strong className="text-indigo-950">Chrome / Android:</strong> Ấn <span className="font-black text-xs text-indigo-600">3 chấm dọc ➔</span> Chọn <strong className="text-indigo-950">"Thêm vào màn hình chính"</strong> hoặc <strong className="text-indigo-950">"Cài đặt ứng dụng"</strong>.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Simulated/Current User capsule */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3 relative overflow-hidden mt-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar src={effectiveUser?.avatar} name={effectiveUser?.name || ""} size="sm" className="ring-2 ring-blue-500/10 shadow-sm" />
                    <div>
                      <p translate="no" className="notranslate text-[10px] font-black text-slate-800 uppercase leading-none tracking-tight">
                        {effectiveUser?.name}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-bold text-blue-500 uppercase tracking-widest leading-none">
                          {effectiveUser?.role}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg border border-rose-200 text-rose-500 bg-rose-50/50 hover:bg-rose-50 hover:text-rose-600 flex items-center gap-1 transition-all text-[9px] font-black uppercase tracking-wider active:scale-95 shadow-sm shrink-0"
                  >
                    <LogOut size={11} strokeWidth={3} />
                    <span>ĐĂNG XUẤT</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <AppModals 
        showTaskModal={showTaskModal}
        setShowTaskModal={setShowTaskModal}
        editingTask={editingTask}
        setEditingTask={setEditingTask}
        updateTask={updateTask}
        baseAddTask={addTask}
        allUsers={allUsers}
        tasks={tasks}
        effectiveUser={effectiveUser}
        categories={categories}
        showHistoryModal={showHistoryModal}
        setShowHistoryModal={setShowHistoryModal}
        showDirectChat={showDirectChat}
        setShowDirectChat={setShowDirectChat}
        isChatMinimized={isChatMinimized}
        setIsChatMinimized={setIsChatMinimized}
        privateMessages={[]}
        firebaseSendPrivateMsg={() => {}}
        handleJumpToTask={handleJumpToTask}
        confirmModal={confirmModal}
        setConfirmModal={setConfirmModal}
        showHealthReminder={showHealthReminder}
        setShowHealthReminder={setShowHealthReminder}
        currentUser={currentUser}
      />
      <ScrollToTop />
    </div>
  );
}
