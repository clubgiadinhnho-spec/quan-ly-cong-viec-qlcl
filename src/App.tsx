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
    handleExportExcel, handleImportExcel, notifications, adminUnreadCount, markNotifRead, deleteNotif, createNotification,
    appNotifications, setConfirmModal,
    showTaskModal, setShowTaskModal, editingTask, setEditingTask, showHistoryModal, setShowHistoryModal, showChatModal, setShowChatModal,
    highlightedTaskId, setHighlightedTaskId, showDirectChat, setShowDirectChat, isChatMinimized, setIsChatMinimized,
    isNotificationCenterOpen, setIsNotificationCenterOpen, showHealthReminder, setShowHealthReminder
  } = useTaskContext();

  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const lastReminderTime = useRef<number>(Date.now());

  const { unreadNotifications, lastReadChatTimestamps, markAsRead, markSectionAsViewed } = appNotifications;

  const handleJumpToTask = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setHighlightedTaskId(taskId);
    
    if (task.deletedAt || task.status === 'DELETED') {
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
      const element = document.getElementById(`task-${taskId}`);
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
        isCollapsed={isMainSidebarCollapsed} onToggleCollapse={() => setIsMainSidebarCollapsed(!isMainSidebarCollapsed)}
      />
      <main className={`flex-1 relative flex flex-col ${activeTab === 'group_chat' ? 'h-screen overflow-hidden' : 'py-6'}`}>
        <div className={`flex-1 ${activeTab === 'group_chat' ? 'h-full w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'}`}>

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
        confirmModal={{ show: false, title: "", message: "", onConfirm: () => {} }}
        setConfirmModal={setConfirmModal}
        showHealthReminder={showHealthReminder}
        setShowHealthReminder={setShowHealthReminder}
        currentUser={currentUser}
      />
      <ScrollToTop />
    </div>
  );
}
