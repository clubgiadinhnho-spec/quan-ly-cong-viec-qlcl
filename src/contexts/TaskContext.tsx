import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect } from "react";
import { Task, User, DiscussionTopic, DiscussionMessage, LogEntry, OfficialReport } from "../types";
import { useFirebaseData } from "../hooks/useFirebaseData";
import { useTaskActions } from "../hooks/useTaskActions";
import { useAppLogic } from "../hooks/useAppLogic";
import { useExcelHandlers } from "../hooks/useExcelHandlers";
import { useNotifications } from "../hooks/useNotifications";
import { useAppNotifications } from "../hooks/useAppNotifications";
import { useJobAI } from "../hooks/useJobAI";
import { useSupervisorPatrol } from "../hooks/useSupervisorPatrol";
import { useAuthContext } from "./AuthContext";
import { db } from "../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

interface TaskContextType {
  tasks: Task[];
  sortedTasks: Task[];
  counts: any;
  categories: any[];
  discussionTopics: DiscussionTopic[];
  discussionMessages: DiscussionMessage[];
  logs: LogEntry[];
  officialReports: OfficialReport[];
  aiMessages: any[];
  presence: any[];
  loading: boolean;
  
  // Actions
  addTask: (data: any) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  approveTaskCompletion: (id: string, name?: string, leaderQCD?: any, stopRecurrence?: boolean) => Promise<void>;
  trashTasksBulk: (ids: string[], name?: string) => Promise<void>;
  approveTasksBulk: (ids: string[], name?: string) => Promise<void>;
  deleteTasksBulk: (ids: string[], name?: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;
  permanentDeleteTask: (id: string) => Promise<void>;
  rawDeleteTasksBulk: (ids: string[], name?: string) => Promise<void>;
  rawTrashTasksBulk: (ids: string[], name?: string) => Promise<void>;
  
  addTaskComment: (taskId: string, content: string) => void;
  updateTaskCommentReactions: (taskId: string, commentId: string, emoji: string) => void;
  
  sendDiscussionMessage: any;
  updateDiscussionMessageReactions: any;
  createTopic: any;
  updateTopic: any;
  deleteTopic: any;
  deleteTopicsBulk: any;
  deleteDiscussionMessage: any;
  
  saveReportDraft: any;
  saveOfficialReport: any;
  
  sendAiMessage: any;
  triggerAiNudge: any;
  resetTaskAIStatus: any;
  
  handleExportExcel: (tasks: Task[], customFileName?: string) => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSuperBackup: () => void;
  
  notifications: any[];
  adminUnreadCount: number;
  markNotifRead: (id: string) => void;
  deleteNotif: (id: string) => void;
  createNotification: any;
  
  unreadCounts: Record<string, number>;
  groupUnreadCount: number;
  
  appNotifications: any;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  
  activeTab: string;
  setActiveTab: (t: string) => void;
  viewScope: 'mine' | 'all';
  setViewScope: (s: 'mine' | 'all') => void;
  search: string;
  setSearch: (s: string) => void;
  selectedMonth: string;
  setSelectedMonth: (m: string) => void;
  onMonthChange: (m: string) => void;
  
  setConfirmModal: (m: any) => void;
  confirmModal: any;

  showTaskModal: boolean;
  setShowTaskModal: (s: boolean) => void;
  editingTask: Task | null;
  setEditingTask: (t: Task | null) => void;
  showHistoryModal: string | null;
  setShowHistoryModal: (id: string | null) => void;
  showChatModal: string | null;
  setShowChatModal: (id: string | null) => void;
  highlightedTaskId: string | null;
  setHighlightedTaskId: (id: string | null) => void;
  showDirectChat: User | null;
  setShowDirectChat: (u: User | null) => void;
  isChatMinimized: boolean;
  setIsChatMinimized: (s: boolean) => void;
  isNotificationCenterOpen: boolean;
  setIsNotificationCenterOpen: (s: boolean) => void;
  showHealthReminder: boolean;
  setShowHealthReminder: (s: boolean) => void;
  selectedPermissionUserId: string | null;
  setSelectedPermissionUserId: (id: string | null) => void;
  supState: any;
  togglePatrol: () => Promise<void>;
  resetQuota?: () => Promise<void>;
  increaseQuotaLimit?: () => Promise<void>;
  setQuotaLimit?: (newLimit: number) => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { effectiveUser, currentUser, allUsers, isAdmin, authReady } = useAuthContext();
  
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlTab = params.get("tab");
      if (urlTab) return urlTab;
      if (params.get("print") === "true") {
        return "profile";
      }
    }
    return "tasks";
  });
  const [viewScope, setViewScope] = useState<"mine" | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [confirmModal, setConfirmModal] = useState({ show: false, title: "", message: "", onConfirm: () => {} });

  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState<string | null>(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);
  const [showDirectChat, setShowDirectChat] = useState<User | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isNotificationCenterOpen, setIsNotificationCenterOpen] = useState(false);
  const [showHealthReminder, setShowHealthReminder] = useState(false);
  const [selectedPermissionUserId, setSelectedPermissionUserId] = useState<string | null>(null);

  // Reset search when changing tabs to meet "search on which page only searches... of that page only" requirement
  useEffect(() => {
    setSearch("");
  }, [activeTab]);

  const {
    tasks, messages: generalMessages, privateMessages, officialReports, aiMessages, logs, presence, categories,
    loading, addTask: firebaseAddTask, updateTask: firebaseUpdateTask,
    deleteTask: firebaseDeleteTask, approveTaskCompletion, trashTasksBulk, approveTasksBulk, sendDiscussionMessage,
    sendAiMessage, triggerAiNudge, resetTaskAIStatus,
    createTopic, updateTopic, deleteTopic, deleteTopicsBulk, deleteTasksBulk, sendPrivateMessage: firebaseSendPrivateMsg,
    updateDiscussionMessageReactions, updatePrivateMessageReactions: firebaseUpdatePrivateMessageReactions,
    discussionTopics, discussionMessages, deleteDiscussionMessage,
    saveReportDraft, saveOfficialReport, updatePresence, clearNewInBoardTasks, resetSystem,
    deleteLogsBulk
  } = useFirebaseData(effectiveUser?.id);

  const { handleExportExcel, handleImportExcel, handleSuperBackup } = useExcelHandlers({
    currentUser: effectiveUser, tasks, allUsers, firebaseAddTask, setConfirmModal, activeTab
  });

  const { addTask, updateTask, addTaskComment, updateTaskCommentReactions } = useTaskActions({
    tasks, currentUser: effectiveUser, allUsers, firebaseAddTask, firebaseUpdateTask, firebaseDeleteTask, firebaseSendPrivateMsg
  });

  const { supState, togglePatrol, resetQuota, increaseQuotaLimit, setQuotaLimit } = useSupervisorPatrol({
    tasks, currentUser: effectiveUser, users: allUsers, activeTab, setActiveTab
  });

  const { counts, sortedTasks } = useAppLogic({
    tasks, effectiveUser, viewScope, search, activeTab, allUsers, selectedMonth, supState
  });

  const { notifications, unreadCount: adminUnreadCount, markAsRead: markNotifRead, deleteNotification: deleteNotif, createNotification } = useNotifications(isAdmin);

  const appNotifications = useAppNotifications(
    effectiveUser, authReady, loading, tasks, privateMessages, generalMessages, discussionMessages,
    showDirectChat?.id || null, activeTab, showChatModal
  );

  const { markAsRead, lastReadChatTimestamps, unreadCounts, groupUnreadCount } = appNotifications;

  useJobAI({
    tasks, currentUser: effectiveUser, sendAiMessage, aiMessages, users: allUsers
  });

  // Presence Heartbeat
  useEffect(() => {
    if (!effectiveUser || !authReady) return;
    updatePresence(effectiveUser);
    const interval = setInterval(() => updatePresence(effectiveUser), 300000);
    return () => clearInterval(interval);
  }, [effectiveUser?.id, effectiveUser?.avatar, effectiveUser?.name, authReady, updatePresence]);

  // THIẾT QUÂN LUẬT: Siêu Backup tự động vào 15:00 (VN) Thứ 4 & Thứ 6
  // Vietnam 15:00 = UTC 08:00
  useEffect(() => {
    if (!isAdmin || !authReady) return;

    const checkAutoBackup = async () => {
      const now = new Date();
      const utcDay = now.getUTCDay(); // 3 = Wed, 5 = Fri
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      
      // Kiểm tra khung giờ 15:00 - 15:05 Việt Nam (08:00 - 08:05 UTC)
      if ((utcDay === 3 || utcDay === 5) && utcHours === 8 && utcMinutes < 6) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        try {
          const backupRef = doc(db, 'settings', 'backup_status');
          const backupDoc = await getDoc(backupRef);
          
          if (!backupDoc.exists() || backupDoc.data().lastAutoBackupDay !== todayStr) {
            console.log(`[HỆ THỐNG] Kích hoạt SIÊU BACKUP tự động ngày ${todayStr}`);
            handleSuperBackup();
            // Cập nhật flag để không lặp lại trong ngày (nếu có nhiều admin online)
            await setDoc(backupRef, { 
              lastAutoBackupDay: todayStr,
              lastBackupBy: effectiveUser?.name || 'AutoSystem',
              timestamp: new Date().toISOString()
            }, { merge: true });
          }
        } catch (error) {
          console.error("[AUTO BACKUP ERROR]", error);
        }
      }
    };

    const interval = setInterval(checkAutoBackup, 60000); // Kiểm tra mỗi phút
    checkAutoBackup();
    return () => clearInterval(interval);
  }, [isAdmin, authReady, handleSuperBackup, effectiveUser]);

  const deleteTaskLocal = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const performDelete = async () => {
      await firebaseUpdateTask(id, { 
        deletedAt: new Date().toISOString(),
        status: 'DELETED' as any 
      }, effectiveUser?.name);
      if (effectiveUser?.role !== 'Admin' && !isAdmin) {
        await createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
      }
    };

    setConfirmModal({ 
      show: true, 
      title: "XÁC NHẬN XÓA", 
      message: `Bạn có chắc chắn muốn chuyển công việc [${task.code}] vào THÙNG RÁC không?`, 
      onConfirm: async () => {
        await performDelete();
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [firebaseUpdateTask, effectiveUser, tasks, createNotification, isAdmin]);

  const restoreTask = useCallback(async (id: string) => {
    await firebaseUpdateTask(id, { 
      deletedAt: null as any,
      status: 'APPROVED' as any,
      isNewInBoard: true,
      lastActionAt: new Date().toISOString()
    });
  }, [firebaseUpdateTask]);

  const permanentDeleteTask = useCallback((id: string) => {
    const realId = id.includes('_cycle_') ? id.split('_cycle_')[0] : id;
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA VĨNH VIỄN",
      message: "Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa vĩnh viễn công việc này?",
      onConfirm: async () => {
        await firebaseDeleteTask(realId);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [firebaseDeleteTask]);

  const trashTasksBulkLocal = useCallback(async (ids: string[]) => {
    if (ids.length > 5) {
      alert("Để đảm bảo an toàn dữ liệu, hệ thống chỉ cho phép xóa tối đa 5 công việc cùng lúc.");
      return;
    }

    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA NHÓM",
      message: `Bạn có chắc chắn muốn chuyển ${ids.length} công việc đã chọn vào THÙNG RÁC không?`,
      onConfirm: async () => {
        await trashTasksBulk(ids, effectiveUser?.name);
        if (effectiveUser?.role !== 'Admin' && !isAdmin) {
          for (const id of ids) {
            const task = tasks.find(t => t.id === id);
            if (task) await createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
          }
        }
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [trashTasksBulk, tasks, effectiveUser, createNotification, isAdmin]);

  const deleteTasksBulkLocal = useCallback(async (ids: string[]) => {
    if (ids.length > 5) {
      alert("Hệ thống chỉ cho phép xóa vĩnh viễn tối đa 5 công việc cùng lúc.");
      return;
    }

    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA VĨNH VIỄN NHÓM",
      message: `Hành động này sẽ XÓA VĨNH VIỄN ${ids.length} công việc đã chọn và không thể hoàn tác. Bạn có chắc chắn không?`,
      onConfirm: async () => {
        await deleteTasksBulk(ids, effectiveUser?.name);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteTasksBulk, effectiveUser]);

  const deleteTopicLocal = useCallback(async (id: string) => {
    const topic = discussionTopics.find(t => t.id === id);
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA CHỦ ĐỀ",
      message: `Bạn có chắc chắn muốn XÓA VĨNH VIỄN chủ đề "${topic?.title || id}" và toàn bộ tin nhắn liên quan không?`,
      onConfirm: async () => {
        await deleteTopic(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteTopic, discussionTopics]);

  const deleteTopicsBulkLocal = useCallback(async (ids: string[]) => {
    if (ids.length > 5) {
      alert("Hệ thống chỉ cho phép xóa tối đa 5 chủ đề cùng lúc.");
      return;
    }
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA NHIỀU CHỦ ĐỀ",
      message: `Hành động này sẽ XÓA VĨNH VIỄN ${ids.length} chủ đề và toàn bộ nội dung bên trong. Bạn có chắc chắn không?`,
      onConfirm: async () => {
        await deleteTopicsBulk(ids);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteTopicsBulk]);

  const deleteDiscussionMessageLocal = useCallback(async (id: string) => {
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA TIN NHẮN",
      message: "Bạn có chắc chắn muốn xóa tin nhắn này không? Hành động này không thể hoàn tác.",
      onConfirm: async () => {
        await deleteDiscussionMessage(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteDiscussionMessage]);

  const deleteNotifLocal = useCallback(async (id: string) => {
    // Thông báo thường không quan trọng bằng dữ liệu công việc, 
    // nhưng để an toàn 100% tôi cũng thêm confirm nếu user muốn.
    // Thường thì notifications xóa nhanh nên maybe cứ hỏi cho chắc.
    setConfirmModal({
      show: true,
      title: "XÓA THÔNG BÁO",
      message: "Xóa thông báo này?",
      onConfirm: async () => {
        await deleteNotif(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [deleteNotif]);

  const value = {
    tasks, sortedTasks, counts, categories, discussionTopics, discussionMessages, logs, officialReports, aiMessages, presence, loading,
    addTask, updateTask, deleteTask: deleteTaskLocal, approveTaskCompletion, trashTasksBulk: trashTasksBulkLocal, approveTasksBulk,
    deleteTasksBulk: deleteTasksBulkLocal,
    rawTrashTasksBulk: trashTasksBulk,
    rawDeleteTasksBulk: deleteTasksBulk,
    restoreTask, permanentDeleteTask, addTaskComment, updateTaskCommentReactions,
    sendDiscussionMessage, updateDiscussionMessageReactions, createTopic, updateTopic, 
    deleteTopic: deleteTopicLocal, deleteTopicsBulk: deleteTopicsBulkLocal, deleteDiscussionMessage: deleteDiscussionMessageLocal,
    saveReportDraft, saveOfficialReport, sendAiMessage, triggerAiNudge, resetTaskAIStatus,
    handleExportExcel, handleImportExcel, handleSuperBackup, notifications: appNotifications?.unreadNotifications || [], adminUnreadCount, markNotifRead, deleteNotif: deleteNotifLocal, createNotification,
    appNotifications, markAsRead: appNotifications?.markAsRead || (() => {}), lastReadChatTimestamps: appNotifications?.lastReadChatTimestamps || {}, unreadCounts: appNotifications?.unreadCounts || {}, groupUnreadCount: appNotifications?.groupUnreadCount || 0, activeTab, setActiveTab, viewScope, setViewScope, search, setSearch, 
    selectedMonth, setSelectedMonth, onMonthChange: setSelectedMonth,
    setConfirmModal, confirmModal,
    showTaskModal, setShowTaskModal, editingTask, setEditingTask, showHistoryModal, setShowHistoryModal, showChatModal, setShowChatModal,
    highlightedTaskId, setHighlightedTaskId, showDirectChat, setShowDirectChat, isChatMinimized, setIsChatMinimized,
    isNotificationCenterOpen, setIsNotificationCenterOpen, showHealthReminder, setShowHealthReminder,
    selectedPermissionUserId, setSelectedPermissionUserId,
    supState, togglePatrol, resetQuota, increaseQuotaLimit, setQuotaLimit
  };

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error("useTaskContext must be used within a TaskProvider");
  }
  return context;
}
