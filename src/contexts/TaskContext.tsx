import React, { createContext, useContext, ReactNode, useState, useCallback, useMemo, useEffect } from "react";
import { Task, User, DiscussionTopic, DiscussionMessage, LogEntry, OfficialReport } from "../types";
import { useFirebaseData } from "../hooks/useFirebaseData";
import { useTaskActions } from "../hooks/useTaskActions";
import { useAppLogic } from "../hooks/useAppLogic";
import { useExcelHandlers } from "../hooks/useExcelHandlers";
import { useNotifications } from "../hooks/useNotifications";
import { useAppNotifications } from "../hooks/useAppNotifications";
import { useAIRobot } from "../hooks/useAIRobot";
import { useAuthContext } from "./AuthContext";

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
  
  handleExportExcel: (tasks: Task[]) => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  notifications: any[];
  adminUnreadCount: number;
  markNotifRead: (id: string) => void;
  deleteNotif: (id: string) => void;
  createNotification: any;
  
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
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { effectiveUser, currentUser, allUsers, isAdmin, authReady } = useAuthContext();
  
  const [activeTab, setActiveTab] = useState("tasks");
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

  const { handleExportExcel, handleImportExcel } = useExcelHandlers({
    currentUser: effectiveUser, tasks, allUsers, firebaseAddTask, setConfirmModal
  });

  const { addTask, updateTask, addTaskComment, updateTaskCommentReactions } = useTaskActions({
    tasks, currentUser: effectiveUser, allUsers, firebaseAddTask, firebaseUpdateTask, firebaseDeleteTask, firebaseSendPrivateMsg
  });

  const { counts, sortedTasks } = useAppLogic({
    tasks, effectiveUser, viewScope, search, activeTab, allUsers, selectedMonth
  });

  const { notifications, unreadCount: adminUnreadCount, markAsRead: markNotifRead, deleteNotification: deleteNotif, createNotification } = useNotifications(isAdmin);

  const appNotifications = useAppNotifications(
    effectiveUser, authReady, loading, tasks, privateMessages, generalMessages, discussionMessages,
    showDirectChat?.id || null, activeTab, showChatModal
  );

  const { markAsRead, lastReadChatTimestamps } = appNotifications;

  useAIRobot({
    tasks, currentUser: effectiveUser, sendAiMessage, aiMessages, users: allUsers
  });

  // Presence Heartbeat
  useEffect(() => {
    if (!effectiveUser || !authReady) return;
    updatePresence(effectiveUser);
    const interval = setInterval(() => updatePresence(effectiveUser), 300000);
    return () => clearInterval(interval);
  }, [effectiveUser?.id, effectiveUser?.avatar, effectiveUser?.name, authReady, updatePresence]);

  const deleteTaskLocal = useCallback(async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    setConfirmModal({ show: true, title: "XÁC NHẬN XÓA", message: "Công việc này sẽ được chuyển vào THÙNG RÁC.", onConfirm: async () => {
      await firebaseUpdateTask(id, { 
        deletedAt: new Date().toISOString(),
        status: 'DELETED' as any 
      }, effectiveUser?.name);
      if (effectiveUser?.role !== 'Admin') {
        await createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
      }
      setConfirmModal(p => ({ ...p, show: false }));
    }});
  }, [firebaseUpdateTask, effectiveUser, tasks, createNotification]);

  const restoreTask = useCallback(async (id: string) => {
    await firebaseUpdateTask(id, { 
      deletedAt: null as any,
      status: 'PENDING' as any,
      isNewInBoard: false,
      lastActionAt: new Date().toISOString()
    });
  }, [firebaseUpdateTask]);

  const permanentDeleteTask = useCallback((id: string) => {
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA VĨNH VIỄN",
      message: "Hành động này không thể hoàn tác. Bạn chắc chắn muốn xóa vĩnh viễn công việc này?",
      onConfirm: async () => {
        await firebaseDeleteTask(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [firebaseDeleteTask]);

  const trashTasksBulkLocal = useCallback(async (ids: string[]) => {
    await trashTasksBulk(ids, effectiveUser?.name);
    if (effectiveUser?.role !== 'Admin') {
      for (const id of ids) {
        const task = tasks.find(t => t.id === id);
        if (task) await createNotification(effectiveUser?.name || 'Nhân viên', task.code, task.id, 'DELETE_REQUEST');
      }
    }
  }, [trashTasksBulk, tasks, effectiveUser, createNotification]);

  const value = {
    tasks, sortedTasks, counts, categories, discussionTopics, discussionMessages, logs, officialReports, aiMessages, presence, loading,
    addTask, updateTask, deleteTask: deleteTaskLocal, approveTaskCompletion, trashTasksBulk: trashTasksBulkLocal, approveTasksBulk,
    deleteTasksBulk, restoreTask, permanentDeleteTask, addTaskComment, updateTaskCommentReactions,
    sendDiscussionMessage, updateDiscussionMessageReactions, createTopic, updateTopic, deleteTopic, deleteTopicsBulk, deleteDiscussionMessage,
    saveReportDraft, saveOfficialReport, sendAiMessage, triggerAiNudge, resetTaskAIStatus,
    handleExportExcel, handleImportExcel, notifications, adminUnreadCount, markNotifRead, deleteNotif, createNotification,
    appNotifications, markAsRead, lastReadChatTimestamps, activeTab, setActiveTab, viewScope, setViewScope, search, setSearch, selectedMonth, setSelectedMonth,
    setConfirmModal, confirmModal,
    showTaskModal, setShowTaskModal, editingTask, setEditingTask, showHistoryModal, setShowHistoryModal, showChatModal, setShowChatModal,
    highlightedTaskId, setHighlightedTaskId, showDirectChat, setShowDirectChat, isChatMinimized, setIsChatMinimized,
    isNotificationCenterOpen, setIsNotificationCenterOpen, showHealthReminder, setShowHealthReminder
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
