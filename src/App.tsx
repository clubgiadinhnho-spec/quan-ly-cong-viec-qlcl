import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User as UserType, Task, TaskCategory } from "./types";
import Login from "./components/Login";
import { auth, logout } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer } from 'firebase/firestore';
import { useFirebaseData } from "./hooks/useFirebaseData";
import { useTaskActions } from "./hooks/useTaskActions";
import { useStaff } from "./hooks/useStaff";
import { useAppNotifications } from "./hooks/useAppNotifications";
import { useNotifications } from "./hooks/useNotifications";
import { useExcelHandlers } from "./hooks/useExcelHandlers";

// Import Components
import { Sidebar } from "./components/layout/Sidebar";
import { MainContent } from "./components/layout/MainContent";
import { TaskModal } from "./components/tasks/TaskModal";
import { HistoryModal } from "./components/tasks/HistoryModal";
import { DirectChat } from "./components/tasks/DirectChat";
import { NotificationCenter } from "./components/layout/NotificationCenter";
import { ConfirmModal } from "./components/common/ConfirmModal";
import { HealthReminder } from "./components/common/HealthReminder";
import { isUserTask } from "./utils/userUtils";
import { db } from "./lib/firebase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [viewScope, setViewScope] = useState<"mine" | "all">("all");
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showHealthReminder, setShowHealthReminder] = useState(false);
  const lastReminderTime = useRef<number>(Date.now());

  const [showDirectChat, setShowDirectChat] = useState<UserType | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {} });

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  // 1. Firebase Data Retrieval
  const {
    tasks, messages: generalMessages, privateMessages, officialReports, logs, presence, categories,
    loading: firebaseLoading, addTask: firebaseAddTask, updateTask: firebaseUpdateTask,
    deleteTask: firebaseDeleteTask, trashTasksBulk, sendMessage: firebaseSendMessage, sendDiscussionMessage,
    createTopic, updateTopic, deleteTopic, deleteTopicsBulk, deleteTasksBulk, sendPrivateMessage: firebaseSendPrivateMsg,
    updateDiscussionMessageReactions, updatePrivateMessageReactions: firebaseUpdatePrivateMessageReactions,
    discussionTopics, discussionMessages, deleteDiscussionMessage,
    saveReportDraft: firebaseSaveReportDraft, saveOfficialReport: firebaseSaveOfficialReport, updatePresence, resetSystem,
    deleteLogsBulk
  } = useFirebaseData(simulatedUser?.id || currentUser?.id);

  const { allStaff, loading: staffLoading, updateProfile, deleteProfile } = useStaff();
  const allUsers = allStaff;

  // 2. Effective User Memo
  const effectiveUser = useMemo(() => {
    const rawUser = simulatedUser || currentUser;
    if (!rawUser) return null;
    
    const latestUser = allUsers.find(u => 
      (u.uniqueKey && u.uniqueKey === rawUser.uniqueKey) || 
      (u.personalEmail && u.personalEmail === rawUser.personalEmail) ||
      (u.companyEmail && u.companyEmail === rawUser.companyEmail) ||
      (u.email && u.email === rawUser.email) ||
      (u.id && u.id === rawUser.id)
    ) || rawUser;
    
    const systemAdmins = [
      "truong.le@tanphuvietnam.vn", 
      "lenhattruong.tpp@gmail.com", 
      "lenhattruong.caphef1@gmail.com",
      "club.nhuatanphu@gmail.com", 
      "tanphuvietnam.tpp@gmail.com", 
      "truongln.tanhongngoc@gmail.com"
    ];
    const userEmail = (latestUser.email || latestUser.companyEmail || latestUser.personalEmail || "").toLowerCase();
    const isSystemAdmin = systemAdmins.includes(userEmail);
    const finalUser = isSystemAdmin ? { ...latestUser, role: "Admin" as any } : latestUser;
    
    return finalUser;
  }, [simulatedUser, currentUser, allUsers]);

  const isAdmin = effectiveUser?.role === 'Admin';
  const { 
    notifications, 
    unreadCount: adminUnreadCount, 
    createNotification, 
    markAsRead: markNotifRead, 
    deleteNotification: deleteNotif 
  } = useNotifications(isAdmin);

  // 3. Excel Handlers Hook
  const { handleExportExcel, handleImportExcel } = useExcelHandlers({
    currentUser: effectiveUser, tasks, allUsers, firebaseAddTask, setConfirmModal
  });

  // 4. Task Actions Hook
  const { addTask: baseAddTask, updateTask, addTaskComment, updateTaskCommentReactions } = useTaskActions({
    tasks, 
    currentUser: effectiveUser, 
    allUsers, 
    firebaseAddTask, 
    firebaseUpdateTask, 
    firebaseDeleteTask, 
    firebaseSendPrivateMsg
  });

  // 6. Notifications & Unread Counts Hook
  const { unreadNotifications, setUnreadNotifications, lastReadChatTimestamps, lastViewedSections, markAsRead, markSectionAsViewed } = useAppNotifications(
    effectiveUser, authReady, firebaseLoading, tasks, privateMessages, generalMessages, discussionMessages,
    showDirectChat?.id || null, activeTab, showChatModal
  );

  // Clear unread count for current section
  useEffect(() => {
    if (activeTab) {
      markSectionAsViewed(activeTab);
    }
  }, [activeTab, markSectionAsViewed]);

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
    
    // Auto-clear highlight after 10 seconds
    setTimeout(() => {
      setHighlightedTaskId(null);
    }, 10000);

    setTimeout(() => {
      const element = document.getElementById(`task-${taskId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 500);
  }, [tasks]);

  // 6. Auth Listener & Logout
  const allUsersRef = useRef(allUsers);
  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  const handleLogout = useCallback(async () => {
    console.log("🚀 [App] Logout sequence initiated");
    setSimulatedUser(null);
    setCurrentUser(null);
    try {
      await logout();
      console.log("✅ [App] Logout successful");
    } catch (error) {
      console.error("❌ [App] Logout failed:", error);
      // Force clear state anyway
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userEmail = (fbUser.email || "").toLowerCase();
        const systemAdmins = [
          "truong.le@tanphuvietnam.vn", 
          "lenhattruong.tpp@gmail.com", 
          "lenhattruong.caphef1@gmail.com",
          "club.nhuatanphu@gmail.com", 
          "tanphuvietnam.tpp@gmail.com", 
          "truongln.tanhongngoc@gmail.com"
        ];
        const isSystemAdmin = systemAdmins.includes(userEmail);
        
        // Use Ref to avoid closure dependency on allUsers
        const currentAllUsers = allUsersRef.current;
        
        let matchingStaff = currentAllUsers.find(s => s.id === fbUser.uid);
        if (!matchingStaff) {
          matchingStaff = currentAllUsers.find(s => 
            (s.companyEmail || "").toLowerCase() === userEmail || 
            (s.personalEmail || "").toLowerCase() === userEmail
          );
        }
        
        if (isSystemAdmin) {
          const adminProfile = matchingStaff ? { ...matchingStaff, role: "Admin" as any } : {
            id: fbUser.uid,
            name: "System Admin",
            role: "Admin",
            personalEmail: fbUser.email || "",
            status: "ACTIVE",
            uniqueKey: `ADMIN_${fbUser.uid}`
          };
          setCurrentUser({ ...adminProfile, id: fbUser.uid, email: fbUser.email || "", lastActive: Date.now() } as UserType);
        } else if (matchingStaff) {
          if (matchingStaff.status === 'ACTIVE' || matchingStaff.role === 'Admin') {
            setCurrentUser({ ...matchingStaff, id: fbUser.uid, email: fbUser.email || "", lastActive: Date.now() } as UserType);
          } else {
            console.log("User found but not active:", fbUser.email);
            handleLogout();
          }
        } else { 
          // Profile not in current list yet? Just set currentUser null, don't force logout yet
          // to avoid racing during initialization
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [handleLogout]);

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

  // Presence Heartbeat
  useEffect(() => {
    if (!effectiveUser || !authReady) return;
    updatePresence(effectiveUser);
    const interval = setInterval(() => updatePresence(effectiveUser), 300000);
    return () => clearInterval(interval);
  }, [effectiveUser?.id, effectiveUser?.avatar, effectiveUser?.name, authReady, updatePresence]);

  const addTask = useCallback(async (taskData: any) => {
    if (editingTask) { await firebaseUpdateTask(editingTask.id, taskData, effectiveUser?.name); setEditingTask(null); }
    else { await firebaseAddTask(taskData, effectiveUser?.name); }
  }, [firebaseAddTask, firebaseUpdateTask, editingTask, effectiveUser]);

  const deleteTaskLocal = useCallback((id: string) => {
    const task = tasks.find(t => t.id === id);
    setConfirmModal({ show: true, title: "XÁC NHẬN XÓA", message: "Công việc này sẽ được chuyển vào THÙNG RÁC.", onConfirm: async () => {
      await firebaseUpdateTask(id, { 
        deletedAt: new Date().toISOString(),
        status: 'DELETED' as any 
      }, effectiveUser?.name);
      
      // Notify Admin
      if (task && effectiveUser?.role !== 'Admin') {
        await createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
      }

      setConfirmModal(p => ({ ...p, show: false }));
    }});
  }, [firebaseUpdateTask, effectiveUser, tasks, createNotification]);

  // Derived counts for sidebar
  const counts = useMemo(() => {
    const nonDeleted = tasks.filter(t => !t.deletedAt);
    const isManager = effectiveUser?.role === "Admin" || !!effectiveUser?.delegatedPermissions?.canApproveTask;
    
    // View thresholds
    const lastViewedTasks = lastViewedSections["tasks"] || 0;
    const lastViewedPending = lastViewedSections["pending_confirmation"] || 0;
    const lastViewedCompleted = lastViewedSections["completed_tasks"] || 0;
    const lastViewedStaff = lastViewedSections["staff_list"] || 0;

    // Tasks awaiting confirmation or pending approval
    const pending = nonDeleted.filter(t => 
      t.status === "PENDING" && 
      (isManager || t.authorId === effectiveUser?.id || t.authorId === effectiveUser?.uniqueKey || isUserTask(t, effectiveUser))
    );
    
    // All active tasks in the department (APPROVED)
    const departmentActive = nonDeleted.filter(t => 
      t.status === "APPROVED"
    );

    // Active tasks for current user
    const myActive = departmentActive.filter(t => isUserTask(t, effectiveUser));

    // Tasks needing attention (isNewUpdate or isNewSoldier)
    // If Admin: counts tasks with isNewUpdate (updates from staff)
    // If Staff: counts tasks assigned to them with isNewUpdate (from admin) OR isNewSoldier (newly approved)
    const attentionTasks = departmentActive.filter(t => {
      if (isAdmin) {
        return t.isNewUpdate && t.lastUpdatedByRole !== 'Admin';
      } else {
        const isMyTask = isUserTask(t, effectiveUser);
        return isMyTask && (t.isNewSoldier || (t.isNewUpdate && t.lastUpdatedByRole === 'Admin'));
      }
    });

    // Completed tasks (unread)
    const completedUnread = nonDeleted.filter(t => 
      (t.status === "COMPLETED" || t.status === "Hoàn thành") &&
      new Date(t.updatedAt).getTime() > lastViewedCompleted
    );

    // Staff unread (new or updated profiles)
    const staffUnread = allUsers.filter(u => 
      new Date(u.updatedAt || 0).getTime() > lastViewedStaff
    );

    return {
      pending: pending.length,
      active: departmentActive.length,
      attention: attentionTasks.length,
      allActive: departmentActive.length,
      mine: myActive.length,
      completed: completedUnread.length,
      staff: staffUnread.length,
      trash: tasks.filter(t => !!t.deletedAt).length
    };
  }, [tasks, effectiveUser, lastViewedSections, allUsers]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    privateMessages.forEach(m => { if (m.receiverId === currentUser?.id) { const lastRead = lastReadChatTimestamps[m.senderId] || 0; if (new Date(m.timestamp).getTime() > lastRead) counts[m.senderId] = (counts[m.senderId] || 0) + 1; } });
    return counts;
  }, [privateMessages, currentUser?.id, lastReadChatTimestamps]);

  const groupUnreadCount = useMemo(() => {
    if (!effectiveUser) return 0;
    // Agreggate unread messages across all topics using per-topic lastRead timestamps
    return discussionMessages.filter(m => {
      if (m.authorId === effectiveUser.id) return false;
      const lastRead = lastReadChatTimestamps[`topic_${m.topicId}`] || 0;
      return new Date(m.timestamp).getTime() > lastRead;
    }).length;
  }, [discussionMessages, effectiveUser, lastReadChatTimestamps]);

  const groupTotalCount = useMemo(() => discussionMessages.length, [discussionMessages]);

  const sortedTasks = useMemo(() => {
    const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return tasks.filter(t => {
      if (activeTab === "trash") return !!t.deletedAt;
      if (t.deletedAt) return false;
      
      // Exclude PENDING tasks from all tabs except pending_confirmation
      if (t.status === "PENDING" && activeTab !== "pending_confirmation") return false;
      
      const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase()) || (t.code || "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      return viewScope === "mine" ? isUserTask(t, effectiveUser) : true;
    }).sort((a, b) => {
      const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
      const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
      if (weightB !== weightA) return weightB - weightA;
      if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tasks, activeTab, search, viewScope, effectiveUser]);

  const restoreTaskLocal = useCallback(async (id: string) => {
    await firebaseUpdateTask(id, { 
      deletedAt: null as any,
      status: 'APPROVED' as any 
    });
  }, [firebaseUpdateTask]);

  const permanentDeleteTaskLocal = useCallback((id: string) => {
    setConfirmModal({
      show: true,
      title: "XÓA VĨNH VIỄN",
      message: "Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa vĩnh viễn công việc này?",
      onConfirm: async () => {
        await firebaseDeleteTask(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [firebaseDeleteTask]);

  const trashTasksBulkLocal = useCallback(async (ids: string[]) => {
    for (const id of ids) {
      const task = tasks.find(t => t.id === id);
      await firebaseUpdateTask(id, { deletedAt: new Date().toISOString() });
      if (task && effectiveUser?.role !== 'Admin') {
        createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
      }
    }
  }, [firebaseUpdateTask, tasks, effectiveUser, createNotification]);

  const deleteTasksBulkLocal = useCallback((ids: string[]) => {
    setConfirmModal({
      show: true,
      title: "XÓA VĨNH VIỄN HÀNG LOẠT",
      message: `Bạn chắc chắn muốn xóa vĩnh viễn ${ids.length} công việc đã chọn?`,
      onConfirm: async () => {
        await deleteTasksBulk(ids);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteTasksBulk]);

  // 7. Mark as read when entering tabs or new messages arrive while in tab
  useEffect(() => {
    if (activeTab === "group_chat") {
      markAsRead("group_chat");
    }
  }, [activeTab, markAsRead, discussionMessages.length]);

  if (!authReady || staffLoading) return (
    <div className="min-h-screen flex items-center justify-center font-black text-blue-600 uppercase bg-white animate-pulse">
      <span translate="no" className="notranslate">ĐANG TẢI DỮ LIỆU...</span>
    </div>
  );
  if (!currentUser) return <Login users={allUsers} onLogin={setCurrentUser} onAddStaff={(u) => updateProfile(u.uniqueKey, u)} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar
        user={effectiveUser} activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout}
        pendingTasksCount={counts.pending} activeTasksCount={counts.attention} completedTasksCount={counts.completed}
        totalStaffCount={counts.staff} groupUnreadCount={groupUnreadCount} trashTasksCount={counts.trash}
        activeTasksAlert={counts.attention > 0} 
        pendingTasksAlert={counts.pending > 0}
        isCollapsed={isMainSidebarCollapsed} onToggleCollapse={() => setIsMainSidebarCollapsed(!isMainSidebarCollapsed)}
      />
      <main className={`flex-1 relative flex flex-col ${activeTab === 'group_chat' ? 'h-screen overflow-hidden' : 'py-6'}`}>
        <div className={`flex-1 ${activeTab === 'group_chat' ? 'h-full w-full' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full'}`}>

          {simulatedUser && <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-2 flex justify-between shadow-lg"><span>GIẢ LẬP: {simulatedUser.name}</span><button onClick={() => setSimulatedUser(null)}>Thoát</button></div>}
          <MainContent
            activeTab={activeTab} effectiveUser={effectiveUser!} currentUser={currentUser} presence={presence} allUsers={allUsers}
            tasks={tasks} filteredTasks={sortedTasks} sortedTasks={sortedTasks} viewScope={viewScope} setViewScope={setViewScope}
            search={search} setSearch={setSearch} myActiveCount={counts.mine} allActiveCount={counts.allActive} setShowTaskModal={setShowTaskModal}
            handleExportExcel={handleExportExcel} handleImportExcel={handleImportExcel} updateTask={updateTask} deleteTask={deleteTaskLocal}
            setShowHistoryModal={setShowHistoryModal} setShowChatModal={setShowChatModal} showChatModal={showChatModal}
            addTaskComment={addTaskComment} updateTaskCommentReactions={updateTaskCommentReactions} setEditingTask={setEditingTask}
            setConfirmModal={setConfirmModal} highlightedTaskId={highlightedTaskId} discussionTopics={discussionTopics}
            discussionMessages={discussionMessages} sendDiscussionMessage={sendDiscussionMessage} updateDiscussionMessageReactions={updateDiscussionMessageReactions}
            createTopic={createTopic} updateTopic={updateTopic} deleteTopic={deleteTopic} deleteTopicsBulk={deleteTopicsBulk} deleteTasksBulk={deleteTasksBulkLocal} trashTasksBulk={trashTasksBulkLocal} deleteDiscussionMessage={deleteDiscussionMessage}
            updateProfile={updateProfile} officialReports={officialReports} firebaseSaveReportDraft={firebaseSaveReportDraft}
            firebaseSaveOfficialReport={firebaseSaveOfficialReport} permanentDeleteTask={permanentDeleteTaskLocal} restoreTask={restoreTaskLocal}
            logs={logs} setActiveTab={setActiveTab} setShowDirectChat={setShowDirectChat} unreadCounts={unreadCounts} groupUnreadCount={groupUnreadCount}
            setSimulatedUser={setSimulatedUser} firebaseSendPrivateMsg={firebaseSendPrivateMsg} deleteProfile={deleteProfile}
            resetSystem={resetSystem} deleteLogsBulk={deleteLogsBulk}
            markAsRead={markAsRead} lastReadChatTimestamps={lastReadChatTimestamps}
            adminUnreadCount={adminUnreadCount} onOpenNotifications={() => setIsNotificationCenterOpen(true)}
            createNotification={createNotification}
          />
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
      {(showTaskModal || editingTask) && (
        <TaskModal 
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }} 
          onSave={addTask} 
          users={allUsers} 
          tasks={tasks}
          task={editingTask || undefined} 
          currentUser={effectiveUser!} 
          categories={categories}
        />
      )}
      {showHistoryModal && <HistoryModal taskId={showHistoryModal} tasks={tasks} users={allUsers} onClose={() => setShowHistoryModal(null)} />}
      {showDirectChat && (
        <DirectChat 
          variant="bubble" 
          isMinimized={isChatMinimized} 
          onMinimizeChange={setIsChatMinimized} 
          currentUser={effectiveUser!} 
          otherUser={allUsers.find(u => u.id === showDirectChat.id) || showDirectChat} 
          messages={privateMessages} 
          onSendMessage={firebaseSendPrivateMsg} 
          onClose={() => setShowDirectChat(null)} 
          onReact={(msgId, emoji) => {/* Logic react */}} 
          allUsers={allUsers}
          onJumpToTask={handleJumpToTask}
        />
      )}
      <ConfirmModal show={confirmModal.show} title={confirmModal.title} message={confirmModal.message} onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal(p => ({ ...p, show: false }))} />
      {showHealthReminder && currentUser?.reminderSettings && <HealthReminder settings={currentUser.reminderSettings} onClose={() => setShowHealthReminder(false)} />}
    </div>
  );
}
