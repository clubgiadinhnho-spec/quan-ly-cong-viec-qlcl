import React, { useState, useEffect, useCallback } from "react";
import { User as UserType, Task, TaskComment } from "./types";
import Login from "./components/Login";
import { FIXED_STAFF } from "./constants/staff";
import {
  Plus,
  Search,
  Lock,
  LogOut,
  FileUp,
  FileDown,
  Trash2,
  MessageSquare,
  User as UserIcon,
  Users as UsersIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// Import Utilities
import {
  exportTasksToExcel,
  importTasksFromExcel,
  downloadSampleExcel,
} from "./utils/excelUtils";

// Import Firebase & Hooks
import { auth, logout, db } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useFirebaseData } from "./hooks/useFirebaseData";
import { useTaskActions } from "./hooks/useTaskActions";
import { useStaff } from "./hooks/useStaff";

// Import Components
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { HolidayBanner } from "./components/layout/HolidayBanner";
import { StatsSummary } from "./components/dashboard/StatsSummary";
import { TaskList } from "./components/tasks/TaskList";
import { TaskModal } from "./components/tasks/TaskModal";
import { HistoryModal } from "./components/tasks/HistoryModal";
import { TaskChat } from "./components/tasks/TaskChat";
import { DirectChat } from "./components/tasks/DirectChat";
import { Avatar } from "./components/common/Avatar";
import { ConfirmModal } from "./components/common/ConfirmModal";
import { HealthReminder } from "./components/common/HealthReminder";
import { isUserTask } from "./utils/userUtils";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportPage } from "./pages/ReportPage";
import { GroupChatPage } from "./pages/GroupChatPage";
import { StaffListPage } from "./pages/StaffListPage";
import { PendingConfirmationPage } from "./pages/PendingConfirmationPage";
import { SystemHistoryPage } from "./pages/SystemHistoryPage";

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");
  const [viewScope, setViewScope] = useState<"mine" | "all">("all");
  const [isMainSidebarCollapsed, setIsMainSidebarCollapsed] = useState(false);
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(
    null,
  );

  // Clear highlight after 5 seconds
  useEffect(() => {
    if (highlightedTaskId) {
      const timer = setTimeout(() => setHighlightedTaskId(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [highlightedTaskId]);

  // Track last read timestamps for each chat
  const [lastReadChatTimestamps, setLastReadChatTimestamps] = useState<
    Record<string, number>
  >(() => {
    const saved = localStorage.getItem("qc_last_read_chats");
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem(
      "qc_last_read_chats",
      JSON.stringify(lastReadChatTimestamps),
    );
  }, [lastReadChatTimestamps]);

  // Ensure viewScope is always 'all' whenever currentUser changes (app starts or login)
  useEffect(() => {
    if (currentUser) {
      setViewScope("all");
    }
  }, [currentUser?.id]);

  // The effectively active user (either original or simulated)
  const effectiveUser = React.useMemo(() => {
    const user = simulatedUser || currentUser;
    if (!user) return null;

    // Safety check: if they belong to any system admin emails, force Admin role
    const systemAdmins = [
      "truong.le@tanphuvietnam.vn",
      "lenhattruong.tpp@gmail.com",
      "club.nhuatanphu@gmail.com",
      "tanphuvietnam.tpp@gmail.com",
      "truongln.tanhongngoc@gmail.com",
    ];
    const userEmail = (
      user.email ||
      user.companyEmail ||
      user.personalEmail ||
      ""
    ).toLowerCase();
    const isSystemAdmin =
      systemAdmins.includes(userEmail) ||
      (user.companyEmail &&
        systemAdmins.includes(user.companyEmail.toLowerCase())) ||
      (user.personalEmail &&
        systemAdmins.includes(user.personalEmail.toLowerCase()));

    if (isSystemAdmin) {
      return { ...user, role: "Admin" as any };
    }
    return user;
  }, [simulatedUser, currentUser]);

  const [search, setSearch] = useState("");
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [showHealthReminder, setShowHealthReminder] = useState(false);
  const lastReminderTime = React.useRef<number>(Date.now());

  // Health Reminder Logic
  useEffect(() => {
    if (!effectiveUser || !effectiveUser.reminderSettings?.enabled) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const intervalMs =
        (effectiveUser.reminderSettings?.intervalMinutes || 30) * 60 * 1000;

      if (now - lastReminderTime.current >= intervalMs) {
        setShowHealthReminder(true);
        lastReminderTime.current = now;
      }
    }, 10000); // Check every 10s

    return () => clearInterval(checkInterval);
  }, [effectiveUser]);

  // Use Firebase Hook
  const {
    tasks,
    messages: generalMessages,
    privateMessages,
    officialReports,
    logs,
    presence,
    loading: firebaseLoading,
    addTask: firebaseAddTask,
    updateTask: firebaseUpdateTask,
    deleteTask: firebaseDeleteTask,
    sendMessage: firebaseSendMessage,
    sendDiscussionMessage,
    createTopic,
    updateTopic,
    deleteTopic,
    sendPrivateMessage: firebaseSendPrivateMsg,
    updateMessageReactions: firebaseUpdateMessageReactions,
    updateDiscussionMessageReactions,
    updatePrivateMessageReactions: firebaseUpdatePrivateMessageReactions,
    discussionTopics,
    discussionMessages,
    deleteDiscussionMessage,
    addLog: firebaseAddLog,
    saveReportDraft: firebaseSaveReportDraft,
    saveOfficialReport: firebaseSaveOfficialReport,
    updatePresence,
  } = useFirebaseData(effectiveUser?.id);

  const {
    allStaff,
    loading: staffLoading,
    updateProfile,
    deleteProfile,
  } = useStaff();
  const allUsers = allStaff;

  const {
    all: allActiveCount,
    mine: myActiveCount,
    pending: pendingTasksCount,
    active: activeSidebarCount,
    completed: completedTasksCount,
    trash: trashTasksCount,
  } = React.useMemo(() => {
    const isManager =
      effectiveUser?.role === "Admin" ||
      effectiveUser?.role === "Leader" ||
      !!effectiveUser?.delegatedPermissions?.canApproveTask;
    const nonDeleted = tasks.filter((t) => !t.deletedAt);

    // ĐỀ XUẤT MỚI (AWAITING_CONFIRMATION) - New tasks waiting to enter the board
    const pendingForUser = nonDeleted.filter((t) => {
      if (t.status !== "AWAITING_CONFIRMATION") return false;
      if (isManager) return true;
      // Staff only sees their own proposals
      return (
        t.authorId === effectiveUser?.id ||
        t.history[0]?.authorId === effectiveUser?.id
      );
    });

    // BẢNG CÔNG VIỆC (Active tasks)
    // For Staff: tasks assigned to them that are not completed or waiting for approval
    // For Admin: all tasks assigned to anyone that are not completed, including those waiting for approval (PENDING_APPROVAL)
    const activeForSidebar = nonDeleted.filter((t) => {
      if (
        t.status === "COMPLETED" ||
        t.status === "AWAITING_CONFIRMATION" ||
        t.status === "Hoàn thành"
      )
        return false;
      if (isManager) return true;
      // For staff, exclude things they submitted and are now PENDING_APPROVAL
      return isUserTask(t, effectiveUser) && t.status !== "PENDING_APPROVAL";
    });

    return {
      all: activeForSidebar.length,
      mine: activeForSidebar.filter((t) => isUserTask(t, effectiveUser)).length,
      pending: pendingForUser.length,
      active: activeForSidebar.length,
      completed: nonDeleted.filter(
        (t) => t.status === "COMPLETED" || t.status === "Hoàn thành",
      ).length,
      trash: tasks.filter((t) => !!t.deletedAt).length,
    };
  }, [tasks, effectiveUser]);

  useEffect(() => {
    if (tasks.length > 0) {
      console.log("Tổng số công việc trong hệ thống:", tasks.length);
    }
  }, [tasks.length]);

  // Topic Initialization logic for the new project
  useEffect(() => {
    if (!effectiveUser || effectiveUser.role !== 'Admin' || firebaseLoading) return;
    
    // Nếu chưa có chủ đề nào, khởi tạo chủ đề "TRAO ĐỔI TỰ DO"
    if (discussionTopics.length === 0) {
      console.log("Khởi tạo chủ đề mặc định...");
      const initTopic = async () => {
        try {
          await createTopic({
            title: 'TRAO ĐỔI TỰ DO',
            description: 'Room thảo luận chung cho toàn hệ thống',
            createdBy: 'SYSTEM',
            status: 'OPEN',
            category: 'GENERAL'
          });
          // Note: createTopic in useFirebaseData already handles the Code generation logic.
          // But the user requested a VERY SPECIFIC code: P0002026.
          // I will modify createTopic in useFirebaseData to handle 'SYSTEM' as a trigger for this specific code if needed,
          // OR I will manually set it here if I change the createTopic to accept a code.
        } catch (e) {
          console.error("Lỗi khởi tạo chủ đề:", e);
        }
      };
      initTopic();
    }
  }, [discussionTopics.length, effectiveUser?.id, firebaseLoading]);

  // Presence Heartbeat
  useEffect(() => {
    if (!effectiveUser || !authReady) return;

    // Initial update
    updatePresence(effectiveUser);

    const interval = setInterval(() => {
      updatePresence(effectiveUser);
    }, 300000); // Cập nhật mỗi 5 phút để tiết kiệm Quota Firestore (Buffer 5 phút trong hook)

    return () => clearInterval(interval);
  }, [
    effectiveUser?.id,
    effectiveUser?.name,
    effectiveUser?.avatar,
    authReady,
    updatePresence,
  ]);

  const firebaseSendPrivateMessage = useCallback(
    async (content: string, senderId: string, receiverId: string) => {
      await firebaseSendPrivateMsg(content, senderId, receiverId);
    },
    [firebaseSendPrivateMsg],
  );

  const {
    addTask: baseAddTask,
    updateTask,
    addTaskComment,
    updateTaskCommentReactions,
  } = useTaskActions({
    tasks,
    currentUser: effectiveUser,
    allUsers,
    firebaseAddTask,
    firebaseUpdateTask,
    firebaseDeleteTask,
    firebaseAddLog,
  });

  const addTask = useCallback(
    async (taskData: any) => {
      if (editingTask) {
        await updateTask(editingTask.id, taskData);
        setEditingTask(null);
      } else {
        await baseAddTask(taskData);
        setShowTaskModal(false);
      }
    },
    [baseAddTask, updateTask, editingTask],
  );

  const [showDirectChat, setShowDirectChat] = useState<UserType | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatTop, setChatTop] = useState(0);

  // Mark chat as read when shown
  useEffect(() => {
    if (showDirectChat) {
      setLastReadChatTimestamps((prev) => ({
        ...prev,
        [showDirectChat.id]: Date.now(),
      }));
    }
  }, [showDirectChat?.id]);

  const unreadCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    privateMessages.forEach((m) => {
      if (m.receiverId === currentUser?.id) {
        const lastRead = lastReadChatTimestamps[m.senderId] || 0;
        if (new Date(m.timestamp).getTime() > lastRead) {
          counts[m.senderId] = (counts[m.senderId] || 0) + 1;
        }
      }
    });
    return counts;
  }, [privateMessages, currentUser?.id, lastReadChatTimestamps]);

  const groupUnreadCount = React.useMemo(() => {
    if (!effectiveUser) return 0;
    const lastRead = lastReadChatTimestamps["group_chat"] || 0;
    return discussionMessages.filter(
      (m) =>
        m.authorId !== effectiveUser.id &&
        new Date(m.timestamp).getTime() > lastRead,
    ).length;
  }, [discussionMessages, effectiveUser, lastReadChatTimestamps]);

  // Mark group chat as read when shown
  useEffect(() => {
    if (activeTab === "group_chat") {
      setLastReadChatTimestamps((prev) => ({
        ...prev,
        group_chat: Date.now(),
      }));
    }
  }, [activeTab]);

  const unreadUserIds = React.useMemo(
    () => Object.keys(unreadCounts),
    [unreadCounts],
  );

  const lastPrivateMsgId = React.useRef<string | null>(null);
  const lastGroupMsgId = React.useRef<string | null>(null);
  const lastTaskCommentId = React.useRef<Record<string, string>>({});
  const initialLoadDone = React.useRef(false);
  const knownRequests = React.useRef<Set<string>>(new Set());

  // Auto-popup logic for chat (Refined to be non-intrusive)
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!effectiveUser || !authReady || firebaseLoading) return;

    // Give some time for initial data to load completely
    if (!initialLoadDone.current) {
      if (privateMessages.length > 0) {
        lastPrivateMsgId.current =
          privateMessages[privateMessages.length - 1].id;
      }
      if (generalMessages.length > 0) {
        lastGroupMsgId.current = generalMessages[generalMessages.length - 1].id;
      }
      tasks.forEach((t) => {
        if (t.comments && t.comments.length > 0) {
          lastTaskCommentId.current[t.id] =
            t.comments[t.comments.length - 1].id;
        }
      });
      initialLoadDone.current = true;
      return;
    }

    // 1. Check for new private messages
    if (privateMessages.length > 0) {
      const latestMsg = privateMessages[privateMessages.length - 1];
      if (latestMsg.id !== lastPrivateMsgId.current) {
        lastPrivateMsgId.current = latestMsg.id;
      }
    }

    // 2. Check for new group messages
    if (generalMessages.length > 0) {
      const latestGroupMsg = generalMessages[generalMessages.length - 1];
      if (latestGroupMsg.id !== lastGroupMsgId.current) {
        lastGroupMsgId.current = latestGroupMsg.id;
      }
    }

    // 3. Check for new task comments
    tasks.forEach((t) => {
      if (t.comments && t.comments.length > 0) {
        const latestComment = t.comments[t.comments.length - 1];
        lastTaskCommentId.current[t.id] = latestComment.id;
      }
    });

    // 4. Check for task requests (Admin or delegated approval power)
    if (
      effectiveUser &&
      (effectiveUser.role === "Admin" ||
        effectiveUser.delegatedPermissions?.canApproveTask)
    ) {
      // Auto-clear notifications for tasks that are no longer pending or are deleted
      setUnreadNotifications((prev) =>
        prev.filter((n) => {
          if (n.type === "approve_ht" || n.type === "approve_delete") {
            const t = tasks.find((task) => task.id === n.taskId);
            if (!t || t.deletedAt) return false;
            if (n.type === "approve_ht" && t.status !== "PENDING_APPROVAL")
              return false;
            if (n.type === "approve_delete" && !t.requestDelete) return false;
          }
          return true;
        }),
      );

      tasks.forEach((t) => {
        const reqKey = `${t.id}-${t.status === "PENDING_APPROVAL" ? "HT" : ""}-${t.requestDelete ? "XOA" : ""}`;
        if (
          (t.status === "PENDING_APPROVAL" || t.requestDelete) &&
          !t.deletedAt &&
          !knownRequests.current.has(reqKey)
        ) {
          setUnreadNotifications((prev) => {
            const type =
              t.status === "PENDING_APPROVAL" ? "approve_ht" : "approve_delete";
            const exists = prev.find(
              (n) => n.taskId === t.id && n.type === type,
            );
            if (exists) return prev;
            return [
              ...prev,
              {
                type,
                taskId: t.id,
                taskTitle: `[${t.code}] ${t.title}`,
                msg:
                  t.status === "PENDING_APPROVAL"
                    ? "Yêu cầu chốt hoàn thành"
                    : "Yêu cầu xóa công việc",
              },
            ];
          });
          knownRequests.current.add(reqKey);
        }
      });
    }
  }, [
    privateMessages,
    tasks,
    currentUser,
    authReady,
    firebaseLoading,
    allUsers,
    activeTab,
  ]);

  // Auto-clear notifications when chat is opened
  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    setUnreadNotifications((prev) =>
      prev.filter((notif) => {
        if (
          notif.type === "direct" &&
          showDirectChat &&
          notif.senderId === showDirectChat.id
        )
          return false;
        if (notif.type === "task" && showChatModal === notif.taskId)
          return false;
        return true;
      }),
    );
  }, [showDirectChat, activeTab, showChatModal, unreadNotifications.length]);

  // Handle Authentication State (Restore Session & Sync)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        // Find matching staff in the merged list
        const matchingStaff = allUsers.find(
          (s) =>
            (s.companyEmail || "").toLowerCase() ===
              (fbUser.email || "").toLowerCase() ||
            (s.personalEmail || "").toLowerCase() ===
              (fbUser.email || "").toLowerCase(),
        );

        if (matchingStaff) {
          const userWithFbId = {
            ...matchingStaff,
            id: fbUser.uid,
            email: fbUser.email || "",
            lastActive: Date.now(),
          } as UserType;
          setCurrentUser(userWithFbId);
        } else {
          // Email not in staff list - block access
          logout();
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [allUsers]);

  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem("qc_user", JSON.stringify(user));
    localStorage.setItem("qc_logged_out", "false"); // Reset logout flag
    // Explicitly set view to all/department on login
    setViewScope("all");
    setActiveTab("tasks");
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem("qc_user");
      localStorage.setItem("qc_logged_out", "true");
      setCurrentUser(null);
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: "", message: "", onConfirm: () => {} });

  const sendGeneralMessage = useCallback(
    (content: string) => {
      if (!effectiveUser) return;
      firebaseSendMessage(content, effectiveUser.id);
    },
    [effectiveUser, firebaseSendMessage],
  );

  const deleteTask = useCallback(
    (id: string) => {
      setConfirmModal({
        show: true,
        title: "XÁC NHẬN XÓA",
        message:
          "Công việc này sẽ được chuyển vào THÙNG RÁC. Bạn có thể hoàn tác sau này.",
        onConfirm: async () => {
          await firebaseUpdateTask(id, { deletedAt: new Date().toISOString() });
          setConfirmModal((p) => ({ ...p, show: false }));
        },
      });
    },
    [firebaseUpdateTask],
  );

  const restoreTask = useCallback(
    async (id: string) => {
      await firebaseUpdateTask(id, { deletedAt: null as any });
    },
    [firebaseUpdateTask],
  );

  const permanentDeleteTask = useCallback(
    (id: string) => {
      setConfirmModal({
        show: true,
        title: "XÓA VĨNH VIỄN",
        message:
          "Bạn có chắc chắn muốn xóa vĩnh viễn công việc này? Hành động này KHÔNG THỂ HOÀN TÁC.",
        onConfirm: async () => {
          await firebaseDeleteTask(id);
          setConfirmModal((p) => ({ ...p, show: false }));
        },
      });
    },
    [firebaseDeleteTask],
  );

  const lockTasks = useCallback(() => {
    setConfirmModal({
      show: true,
      title: "CHỐT DANH SÁCH",
      message:
        "Hành động này sẽ CHỐT dữ liệu công việc trong 2 tuần qua. Bạn có chắc chắn?",
      onConfirm: () => {
        tasks.forEach((t) => {
          if (!t.isLocked) {
            firebaseUpdateTask(t.id, {
              isLocked: true,
              prevProgress: t.currentUpdate || t.prevProgress,
              currentUpdate: "",
            });
          }
        });
        setConfirmModal((p) => ({ ...p, show: false }));
      },
    });
  }, [tasks, firebaseUpdateTask]);

  const handleExportExcel = () => {
    if (
      currentUser?.role !== "Admin" &&
      !currentUser?.delegatedPermissions?.canExportExcel
    )
      return;
    exportTasksToExcel(tasks, allUsers);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      currentUser?.role !== "Admin" &&
      !currentUser?.delegatedPermissions?.canImportExcel
    )
      return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedTasks = await importTasksFromExcel(file);
      if (importedTasks.length === 0) {
        alert("Không tìm thấy dữ liệu trong file Excel.");
        return;
      }

      setConfirmModal({
        show: true,
        title: "XÁC NHẬN NHẬP DỮ LIỆU",
        message: `Bạn có muốn nạp ${importedTasks.length} công việc từ file Excel này không?`,
        onConfirm: async () => {
          setConfirmModal((p) => ({ ...p, show: false }));

          let lastNum = tasks.reduce((max, t) => {
            const num = parseInt(t.code.replace(/\D/g, "")) || 0;
            return num > max ? num : max;
          }, 0);

          let successCount = 0;
          let failCount = 0;

          for (const tData of importedTasks) {
            try {
              lastNum++;

              // Find user by email or name string from Excel
              let assigneeId = "";
              let assigneeName = tData.assigneeName || "";

              if (tData.assigneeId || tData.assigneeName) {
                const searchStr = (tData.assigneeId || tData.assigneeName || "")
                  .toString()
                  .toLowerCase();
                const matchedUser = allUsers.find(
                  (u) =>
                    (u.companyEmail || "").toLowerCase() === searchStr ||
                    (u.personalEmail || "").toLowerCase() === searchStr ||
                    (u.name || "").toLowerCase() === searchStr ||
                    (u.name || "").toLowerCase().includes(searchStr),
                );
                if (matchedUser) {
                  assigneeId = matchedUser.id;
                  assigneeName = matchedUser.name;
                } else {
                  // Fallback: If no match, we can't easily assign a Firestore ID
                  // but we should store the name if possible.
                  // For now, if no match, we might assign to Admin or leave as empty Id
                  // The user wants it NOT to be automatically assigned to Admin.
                  assigneeId = ""; // Empty ID means it shows the name provided in Excel
                }
              }

              const newTask: Omit<Task, "id"> = {
                code: `C${String(lastNum).padStart(4, "0")}`,
                issueDate: new Date().toISOString().split("T")[0],
                title: tData.title || "Không có tiêu đề",
                objective: tData.objective || "",
                assigneeId: assigneeId,
                assigneeName: assigneeName,
                startDate: new Date().toISOString().split("T")[0],
                expectedEndDate: tData.expectedEndDate || "",
                prevProgress: tData.prevProgress || "",
                currentUpdate: tData.currentUpdate || "",
                history: [
                  {
                    version: 1,
                    content: "Nhập từ file Excel.",
                    timestamp: new Date().toISOString(),
                    authorId: currentUser?.id || "system",
                  },
                ],
                status: "IN_PROGRESS",
                priority: tData.priority || "MEDIUM",
                isHighlighted: false,
                isLocked: false,
                updatedAt: new Date().toISOString(),
              };
              await firebaseAddTask(newTask);
              successCount++;
            } catch (err) {
              console.error("Error importing row:", err);
              failCount++;
            }
          }
          console.log(
            `Đã nhập thành công: ${successCount} dòng. Thất bại: ${failCount} dòng.`,
          );
          alert(
            `Đã nạp thành công ${successCount} công việc.${failCount > 0 ? ` Có ${failCount} dòng bị lỗi.` : ""}`,
          );
        },
      });

      if (e.target) e.target.value = "";
    } catch (err) {
      console.error("Import error:", err);
      alert(
        "Đã có lỗi xảy ra khi nhập file Excel. Vui lòng kiểm tra định dạng.",
      );
    }
  };

  const filteredTasks = tasks.filter((t) => {
    // Trash tab shows ONLY deleted tasks
    if (activeTab === "trash") {
      return !!t.deletedAt;
    }

    // Other tabs show ONLY non-deleted tasks
    if (t.deletedAt) return false;

    const safeTitle = (t.title || "").toLowerCase();
    const safeCode = (t.code || "").toLowerCase();
    const safeSearch = (search || "").toLowerCase();

    const matchesSearch =
      safeTitle.includes(safeSearch) || safeCode.includes(safeSearch);

    if (!matchesSearch) return false;

    // View scope filter
    if (viewScope === "mine") {
      return isUserTask(t, effectiveUser);
    }

    // 'all' scope shows everything matching search
    return true;
  });

  const priorityWeight = { HIGH: 3, MEDIUM: 2, LOW: 1 };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Primary sort: Priority (High to Low)
    const weightA =
      priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
    const weightB =
      priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
    if (weightB !== weightA) return weightB - weightA;
    // Secondary sort: High priority issues (Highlighted)
    if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
    // Tertiary: Newest first
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (!authReady || staffLoading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-blue-600 uppercase tracking-widest bg-white animate-pulse">
        ĐANG TẢI DỮ LIỆU HỆ THỐNG...
      </div>
    );
  if (!currentUser || (!currentUser.name && !currentUser.companyEmail))
    return (
      <Login
        users={allUsers}
        onLogin={handleLogin}
        onAddStaff={(u) => updateProfile(u.personalEmail, u)}
      />
    );

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar
        user={effectiveUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        pendingTasksCount={pendingTasksCount}
        activeTasksCount={activeSidebarCount}
        completedTasksCount={completedTasksCount}
        totalStaffCount={allUsers.length}
        groupUnreadCount={groupUnreadCount}
        trashTasksCount={trashTasksCount}
        isCollapsed={isMainSidebarCollapsed}
        onToggleCollapse={() =>
          setIsMainSidebarCollapsed(!isMainSidebarCollapsed)
        }
      />

      <main className="flex-1 overflow-y-auto relative py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {simulatedUser && (
            <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between shadow-lg border-b border-amber-600 animate-in slide-in-from-top duration-300">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-lg">
                  <Search size={18} className="animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider">
                    CHẾ ĐỘ GIẢ LẬP NHÂN VIÊN
                  </p>
                  <p className="text-[10px] opacity-90 font-bold italic">
                    Bạn đang nhìn thấy hệ thống dưới góc nhìn của:{" "}
                    <span translate="no" className="notranslate">
                      {simulatedUser.name}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSimulatedUser(null)}
                className="px-4 py-1.5 bg-white text-amber-600 rounded-full text-[10px] font-black uppercase hover:bg-amber-50 transition-colors shadow-sm"
              >
                Thoát Giả Lập
              </button>
            </div>
          )}
          <AnimatePresence mode="wait">
            {activeTab === "tasks" && (
              <motion.div
                key="tasks"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col h-full"
              >
                <HolidayBanner />
                <div className="sticky top-0 z-50">
                  <Header
                    title={
                      <span translate="no" className="notranslate">
                        BẢNG CÔNG VIỆC
                      </span>
                    }
                    badge={effectiveUser.role}
                    onAction={() => setShowTaskModal(true)}
                    actionLabel="NHẬP CÔNG VIỆC MỚI"
                    actionIcon={Plus}
                    onlineUsers={presence}
                    currentUserId={effectiveUser.id}
                  />
                </div>

                <div className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1">
                  <StatsSummary tasks={filteredTasks} />

                  <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all duration-300">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewScope("mine")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          viewScope === "mine"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <UserIcon size={14} />
                        <span translate="no" className="notranslate">
                          Cá nhân
                        </span>{" "}
                        ({myActiveCount})
                      </button>
                      <button
                        onClick={() => setViewScope("all")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          viewScope === "all"
                            ? "bg-white text-blue-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <UsersIcon size={14} />
                        <span translate="no" className="notranslate">
                          Phòng QLCL
                        </span>{" "}
                        ({allActiveCount})
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest">
                        <span translate="no" className="notranslate">
                          Đang xem:{" "}
                          {viewScope === "mine"
                            ? "Nhiệm vụ của bạn"
                            : "Toàn bộ phòng"}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                        <span translate="no" className="notranslate">
                          DANH SÁCH BẢNG CÔNG VIỆC
                        </span>
                      </h3>
                      {(effectiveUser.role !== "Staff" ||
                        effectiveUser.delegatedPermissions?.canExportExcel ||
                        effectiveUser.delegatedPermissions?.canImportExcel) && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={downloadSampleExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase"
                            title="Tải file Excel mẫu"
                          >
                            <FileDown size={12} />
                            File Mẫu
                          </button>
                          {(effectiveUser.role === "Admin" ||
                            effectiveUser.delegatedPermissions
                              ?.canExportExcel) && (
                            <button
                              onClick={handleExportExcel}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                            >
                              <FileDown size={12} />
                              Xuất Excel
                            </button>
                          )}
                          {(effectiveUser.role === "Admin" ||
                            effectiveUser.delegatedPermissions
                              ?.canImportExcel) && (
                            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase cursor-pointer">
                              <FileUp size={12} />
                              Nhập từ Excel
                              <input
                                type="file"
                                accept=".xlsx, .xls"
                                className="hidden"
                                onChange={handleImportExcel}
                              />
                            </label>
                          )}

                        </div>
                      )}
                    </div>
                    <div className="relative group">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={14}
                      />
                      <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-xs w-64"
                      />
                    </div>
                  </div>

                  <TaskList
                    tasks={sortedTasks.filter((t) => {
                      if (
                        t.status === "COMPLETED" ||
                        t.status === "Hoàn thành" ||
                        t.status === "AWAITING_CONFIRMATION"
                      )
                        return false;
                      // If staff, hide what they already submitted for approval
                      if (
                        effectiveUser.role === "Staff" &&
                        t.status === "PENDING_APPROVAL"
                      )
                        return false;
                      return true;
                    })}
                    user={effectiveUser}
                    users={allUsers}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onViewHistory={(id) => setShowHistoryModal(id)}
                    onOpenChat={(id) => setShowChatModal(id)}
                    showChatModal={showChatModal}
                    onSendMessage={addTaskComment}
                    onReact={updateTaskCommentReactions}
                    onEdit={setEditingTask}
                    setConfirmModal={setConfirmModal}
                    type="active"
                    isReadOnly={false}
                    highlightedTaskId={highlightedTaskId}
                  />

                  {effectiveUser.role === "Admin" && (
                    <div className="flex justify-end">
                      <button
                        onClick={lockTasks}
                        className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-100 transition-all font-mono"
                      >
                        <Lock size={14} />
                        CHỐT DANH SÁCH 2 TUẦN
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === "pending_confirmation" && (
              <motion.div
                key="pending_confirmation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <HolidayBanner />
                <div className="sticky top-0 z-50">
                  <Header
                    title={
                      <span translate="no" className="notranslate">
                        ĐỀ XUẤT MỚI
                      </span>
                    }
                    onlineUsers={presence}
                    currentUserId={effectiveUser.id}
                  />
                </div>
                <div className="p-6 overflow-y-auto min-h-0 flex-1">
                  <PendingConfirmationPage
                    tasks={tasks}
                    currentUser={effectiveUser}
                    allUsers={allUsers}
                    updateTask={updateTask}
                    deleteTask={deleteTask}
                    setShowHistoryModal={setShowHistoryModal}
                    setShowChatModal={setShowChatModal}
                    showChatModal={showChatModal}
                    addTaskComment={addTaskComment}
                    updateTaskCommentReactions={updateTaskCommentReactions}
                    setEditingTask={setEditingTask}
                    setConfirmModal={setConfirmModal}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "completed_tasks" && (
              <motion.div
                key="completed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full"
              >
                <HolidayBanner />
                <div className="sticky top-0 z-50">
                  <Header
                    title={
                      <span translate="no" className="notranslate">
                        CÔNG VIỆC HOÀN THÀNH
                      </span>
                    }
                    onlineUsers={presence}
                    currentUserId={effectiveUser.id}
                  />
                </div>
                <div className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                      <button
                        onClick={() => setViewScope("mine")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          viewScope === "mine"
                            ? "bg-white text-green-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <UserIcon size={14} />
                        Cá nhân (
                        {
                          tasks.filter(
                            (t) =>
                              t.assigneeId === effectiveUser.id &&
                              t.status === "COMPLETED",
                          ).length
                        }
                        )
                      </button>
                      <button
                        onClick={() => setViewScope("all")}
                        className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                          viewScope === "all"
                            ? "bg-white text-green-600 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        <UsersIcon size={14} />
                        Phòng QLCL (
                        {tasks.filter((t) => t.status === "COMPLETED").length})
                      </button>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[10px] text-green-700 font-black uppercase tracking-widest">
                        Đang xem:{" "}
                        {viewScope === "mine"
                          ? "Lịch sử cá nhân"
                          : "Lịch sử toàn phòng"}
                      </span>
                    </div>
                  </div>

                  <StatsSummary tasks={filteredTasks} />

                  <TaskList
                    tasks={sortedTasks.filter((t) => t.status === "COMPLETED")}
                    user={effectiveUser}
                    users={allUsers}
                    onUpdate={updateTask}
                    onDelete={deleteTask}
                    onViewHistory={(id) => setShowHistoryModal(id)}
                    onOpenChat={(id) => setShowChatModal(id)}
                    showChatModal={showChatModal}
                    onSendMessage={addTaskComment}
                    onReact={updateTaskCommentReactions}
                    onEdit={setEditingTask}
                    setConfirmModal={setConfirmModal}
                    type="completed"
                    highlightedTaskId={highlightedTaskId}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "group_chat" && (
              <motion.div
                key="group_chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <HolidayBanner />
                <GroupChatPage
                  currentUser={effectiveUser}
                  users={allUsers}
                  topics={discussionTopics}
                  messages={discussionMessages}
                  onSendMessage={(topicId, content, attachments) =>
                    sendDiscussionMessage(
                      topicId,
                      content,
                      effectiveUser.id,
                      attachments,
                    )
                  }
                  onReact={(msgId, emoji) => {
                    const msg = discussionMessages.find((m) => m.id === msgId);
                    if (!msg) return;
                    const reactions = [...(msg.reactions || [])];
                    const idx = reactions.findIndex(
                      (r) => r.userId === effectiveUser.id && r.emoji === emoji,
                    );
                    if (idx > -1) reactions.splice(idx, 1);
                    else reactions.push({ userId: effectiveUser.id, emoji });
                    updateDiscussionMessageReactions(msgId, reactions);
                  }}
                  onCreateTopic={(title, desc, orderCode) =>
                    createTopic({
                      title,
                      description: desc,
                      createdBy: effectiveUser.id,
                      creatorAvatar: effectiveUser.avatar,
                      status: "OPEN",
                      orderCode,
                    })
                  }
                  onUpdateTopic={updateTopic}
                  onDeleteTopic={deleteTopic}
                  onDeleteMessage={deleteDiscussionMessage}
                  onAddLog={firebaseAddLog}
                  presence={presence.map((p) => p.id)}
                />
              </motion.div>
            )}

            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <HolidayBanner />
                <Header
                  title={
                    <span translate="no" className="notranslate">
                      TRANG CÁ NHÂN
                    </span>
                  }
                  badge={effectiveUser.code}
                  onlineUsers={presence}
                  currentUserId={effectiveUser.id}
                />
                <div className="p-6">
                  <ProfilePage
                    currentUser={effectiveUser}
                    tasks={tasks}
                    users={allUsers}
                    onUpdateProfile={(email, updates) =>
                      updateProfile(email, updates)
                    }
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "reports" && (
              <motion.div
                key="reports"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <HolidayBanner />
                <Header
                  title={
                    <span translate="no" className="notranslate">
                      BÁO CÁO THÁNG
                    </span>
                  }
                  onlineUsers={presence}
                  currentUserId={effectiveUser.id}
                />
                <div className="p-6">
                  <ReportPage
                    tasks={tasks}
                    users={allUsers}
                    onUpdateTask={updateTask}
                    currentUser={effectiveUser!}
                    officialReports={officialReports}
                    onSaveDraft={firebaseSaveReportDraft}
                    onSaveOfficialReport={firebaseSaveOfficialReport}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "trash" && effectiveUser?.role === "Admin" && (
              <motion.div
                key="trash"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <HolidayBanner />
                <Header
                  title="TRUNG TÂM XÓA (THÙNG RÁC)"
                  onlineUsers={presence}
                  currentUserId={effectiveUser.id}
                />
                <div className="p-6 space-y-6">
                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <Trash2 size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-red-800 uppercase">
                        Lưu ý bảo mật
                      </h4>
                      <p className="text-[10px] text-red-600 font-bold uppercase">
                        Các công việc ở đây có thể được KHÔI PHỤC hoặc XÓA VĨNH
                        VIỄN bởi Quản trị viên.
                      </p>
                    </div>
                  </div>

                  <TaskList
                    tasks={sortedTasks}
                    user={effectiveUser}
                    users={allUsers}
                    onUpdate={updateTask}
                    onDelete={permanentDeleteTask}
                    onViewHistory={(id) => setShowHistoryModal(id)}
                    onOpenChat={(id) => setShowChatModal(id)}
                    showChatModal={showChatModal}
                    onSendMessage={addTaskComment}
                    onReact={updateTaskCommentReactions}
                    onEdit={setEditingTask}
                    setConfirmModal={setConfirmModal}
                    type="trash"
                    onRestore={restoreTask}
                    highlightedTaskId={highlightedTaskId}
                  />
                </div>
              </motion.div>
            )}

            {activeTab === "staff_list" &&
              (currentUser?.role === "Admin" ||
                effectiveUser?.role === "Admin" ||
                currentUser?.delegatedPermissions?.canManageStaff) &&
              effectiveUser?.name !== "Võ Thị Mỹ Tân" && (
                <motion.div
                  key="staff_list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HolidayBanner />
                  <Header
                    title={
                      <span translate="no" className="notranslate">
                        QUẢN LÝ NHÂN SỰ
                      </span>
                    }
                    onlineUsers={presence}
                    currentUserId={effectiveUser.id}
                  />
                  <div className="p-8">
                    <StaffListPage
                      onNavigate={setActiveTab}
                      onOpenDirectChat={setShowDirectChat}
                      unreadCount={
                        (Object.values(unreadCounts) as number[]).reduce(
                          (a, b) => a + b,
                          0,
                        ) + (groupUnreadCount as number)
                      }
                      users={allUsers}
                      currentUser={effectiveUser}
                      originalUser={currentUser}
                      onSimulateStaff={setSimulatedUser}
                      onSendToUser={async (msg, targetId, attachments) => {
                        await firebaseSendPrivateMsg(
                          msg,
                          effectiveUser.id,
                          targetId,
                          attachments,
                        );
                      }}
                      onSendToGroup={async (msg, attachments) => {
                        const topic = discussionTopics.find(
                          (t) => t.title.toLowerCase() === "tự do",
                        );
                        if (topic) {
                          await sendDiscussionMessage(
                            topic.id,
                            msg,
                            effectiveUser.id,
                            attachments,
                          );
                        } else {
                          await firebaseSendMessage(
                            msg,
                            effectiveUser.id,
                            attachments,
                          );
                        }
                      }}
                      onAddStaff={(user) =>
                        updateProfile(user.personalEmail, user)
                      }
                      onUpdateStaff={(userId, updates) => {
                        const staff = allUsers.find((u) => u.id === userId);
                        if (staff) {
                          updateProfile(staff.personalEmail, updates);
                        }
                      }}
                      onDeleteStaff={(userId) => {
                        const staff = allUsers.find((u) => u.id === userId);
                        if (staff) {
                          deleteProfile(staff.personalEmail);
                        }
                      }}
                    />
                  </div>
                </motion.div>
              )}

            {activeTab === "system_history" &&
              effectiveUser?.role === "Admin" && (
                <motion.div
                  key="system_history"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <HolidayBanner />
                  <Header
                    title={
                      <span translate="no" className="notranslate">
                        LỊCH SỬ HỆ THỐNG
                      </span>
                    }
                    onlineUsers={presence}
                    currentUserId={effectiveUser.id}
                  />
                  <div className="p-6">
                    <SystemHistoryPage
                      logs={logs}
                      allUsers={allUsers}
                      currentUser={effectiveUser!}
                    />
                  </div>
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      </main>

      {/* Activity Notifications Popup */}
      <AnimatePresence>
        {unreadNotifications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3 items-end"
          >
            {unreadNotifications.map((notif, idx) => (
              <div
                key={idx}
                onClick={() => {
                  if (notif.type === "direct")
                    setShowDirectChat(
                      allUsers.find((u) => u.id === notif.senderId)!,
                    );
                  if (notif.type === "task") setShowChatModal(notif.taskId);
                  if (
                    notif.type === "approve_ht" ||
                    notif.type === "approve_delete"
                  ) {
                    setActiveTab("tasks");
                    if (notif.taskId) {
                      setHighlightedTaskId(notif.taskId);
                    }
                  }
                  setUnreadNotifications((prev) =>
                    prev.filter((_, i) => i !== idx),
                  );
                }}
                className="bg-white border border-blue-100 shadow-2xl rounded-2xl p-4 w-72 cursor-pointer hover:bg-blue-50 transition-all border-l-4 border-l-blue-600 group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                      notif.type.startsWith("approve")
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {notif.type === "direct"
                      ? "Tin nhắn"
                      : notif.type === "approve_ht"
                        ? "Phê duyệt HT"
                        : notif.type === "approve_delete"
                          ? "Phê duyệt Xóa"
                          : "Nhiệm vụ"}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setUnreadNotifications((prev) =>
                        prev.filter((_, i) => i !== idx),
                      );
                    }}
                    className="text-gray-300 hover:text-gray-500"
                  >
                    <Plus size={14} className="rotate-45" />
                  </button>
                </div>
                <p className="text-xs font-bold text-gray-900 truncate">
                  {notif.type === "direct" ? notif.senderName : notif.taskTitle}
                </p>
                <p className="text-[11px] text-gray-500 line-clamp-1 italic">
                  "{notif.msg}"
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {(showTaskModal || editingTask) && (
          <TaskModal
            onClose={() => {
              setShowTaskModal(false);
              setEditingTask(null);
            }}
            onSave={addTask}
            users={allUsers}
            task={editingTask || undefined}
          />
        )}
      </AnimatePresence>
      {showHistoryModal && (
        <HistoryModal
          taskId={showHistoryModal}
          tasks={tasks}
          users={allUsers}
          onClose={() => setShowHistoryModal(null)}
        />
      )}

      <AnimatePresence>
        {showDirectChat && (
          <DirectChat
            variant="bubble"
            top={chatTop}
            isMinimized={isChatMinimized}
            onMinimizeChange={setIsChatMinimized}
            currentUser={effectiveUser!}
            otherUser={allUsers.find((u) => u.id === showDirectChat.id)!}
            messages={privateMessages}
            onSendMessage={firebaseSendPrivateMessage}
            onClose={() => setShowDirectChat(null)}
            onReact={(msgId, emoji) => {
              const msg = privateMessages.find((m) => m.id === msgId);
              if (!msg) return;
              const reactions = [...(msg.reactions || [])];
              const idx = reactions.findIndex(
                (r) => r.userId === effectiveUser.id && r.emoji === emoji,
              );
              if (idx > -1) reactions.splice(idx, 1);
              else reactions.push({ userId: effectiveUser.id, emoji });
              firebaseUpdatePrivateMessageReactions(msgId, reactions);
            }}
            allUsers={allUsers}
          />
        )}
      </AnimatePresence>

      <ConfirmModal
        show={confirmModal.show}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onClose={() => setConfirmModal((p) => ({ ...p, show: false }))}
      />

      <AnimatePresence>
        {showHealthReminder && currentUser?.reminderSettings && (
          <HealthReminder
            settings={currentUser.reminderSettings}
            onClose={() => setShowHealthReminder(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
