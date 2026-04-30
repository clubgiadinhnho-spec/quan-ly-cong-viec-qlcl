import React, { useState, useEffect, useCallback } from 'react';
import { User as UserType, Task, TaskComment } from './types';
import Login from './components/Login';
import { STAFF_LIST } from './constants';
import { 
  Plus, 
  Search, 
  Lock,
  LogOut,
  FileUp,
  FileDown,
  Trash2,
  User as UserIcon,
  Users as UsersIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Utilities
import { exportTasksToExcel, importTasksFromExcel, downloadSampleExcel } from './utils/excelUtils';

// Import Firebase & Hooks
import { auth, logout, db, loginAnonymously } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebaseData, useUserHeartbeat } from './hooks/useFirebaseData';
import { useTaskActions } from './hooks/useTaskActions';

// Import Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { HolidayBanner } from './components/layout/HolidayBanner';
import { StatsSummary } from './components/dashboard/StatsSummary';
import { TaskList } from './components/tasks/TaskList';
import { TaskModal } from './components/tasks/TaskModal';
import { HistoryModal } from './components/tasks/HistoryModal';
import { TaskChat } from './components/tasks/TaskChat';
import { DirectChat } from './components/tasks/DirectChat';
import { ConfirmModal } from './components/common/ConfirmModal';
import { HealthReminder } from './components/common/HealthReminder';
import { ProfilePage } from './pages/ProfilePage';
import { ReportPage } from './pages/ReportPage';
import { GroupChatPage } from './pages/GroupChatPage';
import { StaffListPage } from './pages/StaffListPage';
import { PendingConfirmationPage } from './pages/PendingConfirmationPage';

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewScope, setViewScope] = useState<'mine' | 'all'>('all');

  // Track last read timestamps for each chat
  const [lastReadChatTimestamps, setLastReadChatTimestamps] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('qc_last_read_chats');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('qc_last_read_chats', JSON.stringify(lastReadChatTimestamps));
  }, [lastReadChatTimestamps]);

  // Ensure viewScope is always 'all' whenever currentUser changes (app starts or login)
  useEffect(() => {
    if (currentUser) {
      setViewScope('all');
    }
  }, [currentUser?.id]);

  // The effectively active user (either original or simulated)
  const effectiveUser = React.useMemo(() => {
    const user = simulatedUser || currentUser;
    if (!user) return null;
    
    // Safety check: if they belong to any system admin emails, force Admin role
    const systemAdmins = ['adminnutifood@gmail.com', 'lenhattruong.tpp@gmail.com', 'club.nhuatanphu@gmail.com', 'tanphuvietnam.tpp@gmail.com'];
    if (user.companyEmail && systemAdmins.includes(user.companyEmail.toLowerCase())) {
       return { ...user, role: 'Admin' as any };
    }
    return user;
  }, [simulatedUser, currentUser]);

  const [search, setSearch] = useState('');
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
      const intervalMs = (effectiveUser.reminderSettings?.intervalMinutes || 30) * 60 * 1000;
      
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
    users, 
    messages: generalMessages, 
    privateMessages,
    officialReports,
    logs,
    loading: firebaseLoading,
    addTask: firebaseAddTask,
    updateTask: firebaseUpdateTask,
    deleteTask: firebaseDeleteTask,
    sendMessage: firebaseSendMessage,
    sendPrivateMessage: firebaseSendPrivateMsg,
    updateStaff: firebaseUpdateStaff,
    deleteStaff: firebaseDeleteStaff,
    updateHeartbeat: firebaseUpdateHeartbeat,
    updateMessageReactions: firebaseUpdateMessageReactions,
    updatePrivateMessageReactions: firebaseUpdatePrivateMessageReactions,
    addLog: firebaseAddLog,
    saveReportDraft: firebaseSaveReportDraft,
    saveOfficialReport: firebaseSaveOfficialReport,
    clearAllTasks
  } = useFirebaseData(effectiveUser?.id);

  const firebaseSendPrivateMessage = useCallback(async (content: string, senderId: string, receiverId: string) => {
    if (!auth.currentUser) {
      console.warn("Firebase Auth missing. Attempting auto-login...");
      try {
        await loginAnonymously();
      } catch (err) {
        console.error("Auth restoration failed:", err);
      }
    }
    await firebaseSendPrivateMsg(content, senderId, receiverId);
  }, [firebaseSendPrivateMsg]);

  // Firestore is the source of truth, but we use STAFF_LIST as base defaults
  const allUsers = React.useMemo(() => {
    const uniqueUsers = new Map<string, UserType>();
    
    // 1. Add from STAFF_LIST first - use id as primary key for internal staff
    STAFF_LIST.forEach(u => {
      uniqueUsers.set(u.id, { ...u });
    });

    // 2. Overwrite with Firestore data
    users.forEach(u => {
      // Find matching user from STAFF_LIST by email or internal ID
      let matchedId = u.id;
      
      // If the Firestore user has an email, try to find the corresponding STAFF_LIST entry
      if (u.companyEmail) {
        const emailMatch = STAFF_LIST.find(s => s.companyEmail?.toLowerCase() === u.companyEmail?.toLowerCase());
        if (emailMatch) {
          matchedId = emailMatch.id;
        }
      }

      // Merge data
      const existing = uniqueUsers.get(matchedId);
      const systemAdmins = ['adminnutifood@gmail.com', 'lenhattruong.tpp@gmail.com', 'club.nhuatanphu@gmail.com', 'tanphuvietnam.tpp@gmail.com'];
      
      const updatedUser = { 
        ...(existing || {}),
        ...u, 
        role: (u.companyEmail && systemAdmins.includes(u.companyEmail.toLowerCase())) ? 'Admin' : (u.role || existing?.role || 'Staff')
      } as UserType;

      uniqueUsers.set(matchedId, updatedUser);
    });
    
    return Array.from(uniqueUsers.values()).filter(u => {
      if ((u as any).status === 'DELETED') return false;
      // Specific fix for duplicate/placeholder 'Lê Nhật Trường' accounts
      if (u.name === 'Lê Nhật Trường' && u.companyEmail && !u.companyEmail.includes('truong.le@tanphuvietnam.vn')) return false;
      return true;
    });
  }, [users]);

  const { 
    addTask: baseAddTask,
    updateTask,
    addTaskComment,
    updateTaskCommentReactions
  } = useTaskActions({
    tasks,
    currentUser: effectiveUser,
    allUsers,
    firebaseAddTask,
    firebaseUpdateTask,
    firebaseDeleteTask,
    firebaseAddLog
  });

  const addTask = useCallback(async (taskData: any) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData);
      setEditingTask(null);
    } else {
      await baseAddTask(taskData);
      setShowTaskModal(false);
    }
  }, [baseAddTask, updateTask, editingTask]);

  const [showDirectChat, setShowDirectChat] = useState<UserType | null>(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [chatTop, setChatTop] = useState(0);

  // Mark chat as read when shown
  useEffect(() => {
    if (showDirectChat) {
      setLastReadChatTimestamps(prev => ({
        ...prev,
        [showDirectChat.id]: Date.now()
      }));
    }
  }, [showDirectChat?.id]);

  useEffect(() => {
    if (activeTab === 'group_chat') {
      setLastReadChatTimestamps(prev => ({
        ...prev,
        'group_chat': Date.now()
      }));
    }
  }, [activeTab]);

  const unreadCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    privateMessages.forEach(m => {
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
    if (!currentUser) return 0;
    const lastRead = lastReadChatTimestamps['group_chat'] || 0;
    return generalMessages.filter(m => 
      m.senderId !== currentUser.id && 
      new Date(m.timestamp).getTime() > lastRead
    ).length;
  }, [generalMessages, currentUser, lastReadChatTimestamps]);

  const unreadUserIds = React.useMemo(() => Object.keys(unreadCounts), [unreadCounts]);

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
        lastPrivateMsgId.current = privateMessages[privateMessages.length - 1].id;
      }
      if (generalMessages.length > 0) {
        lastGroupMsgId.current = generalMessages[generalMessages.length - 1].id;
      }
      tasks.forEach(t => {
        if (t.comments && t.comments.length > 0) {
          lastTaskCommentId.current[t.id] = t.comments[t.comments.length - 1].id;
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
    tasks.forEach(t => {
      if (t.comments && t.comments.length > 0) {
        const latestComment = t.comments[t.comments.length - 1];
        lastTaskCommentId.current[t.id] = latestComment.id;
      }
    });

    // 4. Check for task requests (Admin or delegated approval power)
    if (effectiveUser && (effectiveUser.role === 'Admin' || effectiveUser.delegatedPermissions?.canApproveTask)) {
      tasks.forEach(t => {
        const reqKey = `${t.id}-${t.status === 'PENDING_APPROVAL' ? 'HT' : ''}-${t.requestDelete ? 'XOA' : ''}`;
        if ((t.status === 'PENDING_APPROVAL' || t.requestDelete) && !knownRequests.current.has(reqKey)) {
           setUnreadNotifications(prev => {
             const type = t.status === 'PENDING_APPROVAL' ? 'approve_ht' : 'approve_delete';
             const exists = prev.find(n => n.taskId === t.id && n.type === type);
             if (exists) return prev;
             return [...prev, { 
               type, 
               taskId: t.id, 
               taskTitle: t.title, 
               msg: t.status === 'PENDING_APPROVAL' ? 'Yêu cầu chốt hoàn thành' : 'Yêu cầu xóa công việc' 
             }];
           });
           knownRequests.current.add(reqKey);
        }
      });
    }

  }, [privateMessages, tasks, currentUser, authReady, firebaseLoading, allUsers, activeTab]);

  // Auto-clear notifications when chat is opened
  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    setUnreadNotifications(prev => prev.filter(notif => {
      if (notif.type === 'direct' && showDirectChat && notif.senderId === showDirectChat.id) return false;
      if (notif.type === 'task' && showChatModal === notif.taskId) return false;
      return true;
    }));
  }, [showDirectChat, activeTab, showChatModal, unreadNotifications.length]);

  // Presence heartbeat
  useEffect(() => {
    if (!currentUser?.id || !authReady) return;
    
    // 1. Immediate update on login/mount
    console.log("Heartbeat: Updating lastActive for", currentUser.id);
    firebaseUpdateHeartbeat(currentUser.id);

    // 2. Periodic update every 30 seconds
    const interval = setInterval(() => {
      firebaseUpdateHeartbeat(currentUser.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser?.id, authReady]);

  // Presence system (Syncing with hook)
  // useUserHeartbeat(currentUser?.id, firebaseUpdateHeartbeat); // Already covered above with more direct control if needed, or we can use the hook. 
  // Let's stick to one. The hook useUserHeartbeat actually does exactly this.
  // I will just make sure it follows the 30s rule.

  // Ensure minimal staff data is present in Firestore
  useEffect(() => {
    const syncStaff = async () => {
      // Only Admins should attempt to sync essential staff to Firestore
      if (!firebaseLoading && authReady && effectiveUser?.role === 'Admin') {
        // Always ensure the first few essential staff (Admins/Managers) are in Firestore
        // This acts as a safety net for login
        const essentialStaff = STAFF_LIST.slice(0, 2); 
        for (const staff of essentialStaff) {
          const exists = users.find(u => u.id === staff.id || u.companyEmail === staff.companyEmail);
          if (!exists) {
            try {
              // Explicitly remove any undefined fields
              const cleanStaff: any = {};
              Object.entries(staff).forEach(([key, value]) => {
                if (value !== undefined) {
                  cleanStaff[key] = value;
                }
              });
              
              await setDoc(doc(db, 'users', staff.id), cleanStaff);
            } catch (err) {
              console.error(`Failed to sync essential user ${staff.id}:`, err);
            }
          }
        }
      }
    };
    syncStaff();
  }, [users.length, firebaseLoading, authReady, effectiveUser?.role]); 

  // Handle Authentication State (Restore Session & Sync)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      const savedUserStr = localStorage.getItem('qc_user');
      const savedUser = savedUserStr ? JSON.parse(savedUserStr) : null;

      if (fbUser) {
        // Try to find user by UID in Firestore
        const fbStaff = users.find(u => u.id === fbUser.uid);
        if (fbStaff) {
          setCurrentUser(fbStaff);
          localStorage.setItem('qc_user', JSON.stringify(fbStaff));
        } else if (savedUser) {
          // If Firestore doesn't have the UID yet, use localStorage user
          setCurrentUser(savedUser);
        }
      } else {
        if (savedUser) {
          // No Firebase session, but we have local user - restore anonymously
          setCurrentUser(savedUser);
          loginAnonymously().catch(err => console.error("Anonymous login error during restoration:", err));
        } else {
          setCurrentUser(null);
          // NEW: Even if no saved user, log in anonymously to allow public listeners (like users list) to function
          loginAnonymously().catch(err => console.error("Initial anonymous login failed:", err));
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [users.length, firebaseLoading]); 

  const handleLogin = (user: UserType) => {
    setCurrentUser(user);
    localStorage.setItem('qc_user', JSON.stringify(user));
    // Explicitly set view to all/department on login
    setViewScope('all');
    setActiveTab('tasks');
  };

  const handleLogout = async () => {
    try {
      setCurrentUser(null);
      localStorage.removeItem('qc_user');
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
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const sendGeneralMessage = useCallback((content: string) => {
    if (!effectiveUser) return;
    firebaseSendMessage(content, effectiveUser.id);
  }, [effectiveUser, firebaseSendMessage]);

  const updateUserNote = useCallback((userId: string, note: string) => {
    const staff = users.find(u => u.id === userId) || STAFF_LIST.find(u => u.id === userId);
    if (staff) {
      firebaseUpdateStaff({ ...staff, personalNote: note });
    }
  }, [users, firebaseUpdateStaff]);

  const deleteTask = useCallback((id: string) => {
    setConfirmModal({
      show: true,
      title: 'XÁC NHẬN XÓA',
      message: 'Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        firebaseDeleteTask(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [firebaseDeleteTask]);

  const lockTasks = useCallback(() => {
    setConfirmModal({
      show: true,
      title: 'CHỐT DANH SÁCH',
      message: 'Hành động này sẽ CHỐT dữ liệu công việc trong 2 tuần qua. Bạn có chắc chắn?',
      onConfirm: () => {
        tasks.forEach(t => {
          if (!t.isLocked) {
             firebaseUpdateTask(t.id, { 
                isLocked: true, 
                prevProgress: t.currentUpdate || t.prevProgress,
                currentUpdate: '' 
             });
          }
        });
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [tasks, firebaseUpdateTask]);

  const handleResetData = useCallback(() => {
    setConfirmModal({
      show: true,
      title: 'CẢNH BÁO: XÓA TOÀN BỘ DỮ LIỆU',
      message: `Bạn có chắc chắn muốn xóa TOÀN BỘ ${tasks.length} dự án/công việc không? Hành động này KHÔNG THỂ hoàn tác!`,
      onConfirm: async () => {
        const ids = tasks.map(t => t.id);
        await clearAllTasks(ids);
        setConfirmModal(p => ({ ...p, show: false }));
        alert("Đã xóa toàn bộ dữ liệu dự án.");
      }
    });
  }, [tasks, clearAllTasks]);

  const onUpdateStaff = useCallback(async (updatedStaff: UserType) => {
    // Detect delegation changes to log them
    const originalStaff = users.find(u => u.id === updatedStaff.id);
    const hasPermsChanged = JSON.stringify(originalStaff?.delegatedPermissions) !== JSON.stringify(updatedStaff.delegatedPermissions);
    
    if (originalStaff && hasPermsChanged) {
      const activePerms = updatedStaff.delegatedPermissions ? 
        Object.entries(updatedStaff.delegatedPermissions)
          .filter(([_, v]) => v)
          .map(([k]) => k) : [];
      
      const count = activePerms.length;

      // Log the change
      await firebaseAddLog({
        type: 'DELEGATION_CHANGE',
        userId: currentUser?.id || 'system',
        targetId: updatedStaff.id,
        details: `Cập nhật quyền ủy quyền cho ${updatedStaff.name}: ${count > 0 ? activePerms.join(', ') : 'Thu hồi toàn bộ quyền'}`,
        metadata: { perms: updatedStaff.delegatedPermissions }
      });

      // Send announcement to Group Chat if there are permissions
      if (count > 0) {
        const adminName = currentUser?.name || 'Trưởng phòng';
        const msg = `🛡️ [THÔNG BÁO ỦY QUYỀN TRỌNG YẾU]\n\n` +
                    `Trưởng phòng ${adminName} chính thức ủy quyền cho ${updatedStaff.name} (${count}/6 quyền) để điều hành và kiểm soát công việc tại Phòng QLCL.\n\n` +
                    `Phạm vi ủy quyền bao gồm:\n` +
                    activePerms.map(p => {
                      const labels: Record<string, string> = {
                        canCreateTask: '• Soạn thảo & Nhập liệu',
                        canApproveTask: '• Phê duyệt & Chốt báo cáo',
                        canDeleteTask: '• Xóa & Hủy dự án',
                        canExportExcel: '• Trích xuất dữ liệu',
                        canImportExcel: '• Nhập dữ liệu hàng loạt',
                        canManageStaff: '• Quản trị nhân sự'
                      };
                      return labels[p] || p;
                    }).join('\n') +
                    `\n\nHệ thống đã cập nhật thẻ bài quyền hạn. Đề nghị các thành viên phối hợp thực hiện.`;

        await firebaseSendMessage(msg, 'system');
      }
    }
    firebaseUpdateStaff(updatedStaff);
  }, [users, firebaseUpdateStaff, firebaseAddLog, firebaseSendMessage, currentUser]);

  const handleExportExcel = () => {
    if (currentUser?.role !== 'Admin' && !currentUser?.delegatedPermissions?.canExportExcel) return;
    exportTasksToExcel(tasks, users);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'Admin' && !currentUser?.delegatedPermissions?.canImportExcel) return;
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
        title: 'XÁC NHẬN NHẬP DỮ LIỆU',
        message: `Bạn có muốn nạp ${importedTasks.length} công việc từ file Excel này không?`,
        onConfirm: async () => {
          setConfirmModal(p => ({ ...p, show: false }));
          
          let lastNum = tasks.reduce((max, t) => {
            const num = parseInt(t.code.replace(/\D/g, '')) || 0;
            return num > max ? num : max;
          }, 0);

          let successCount = 0;
          for (const tData of importedTasks) {
            lastNum++;

            // Find user by email or name string from Excel
            let assigneeId = currentUser?.id || '';
            if (tData.assigneeId) {
              const searchStr = (tData.assigneeId?.toString() || '').toLowerCase();
              const matchedUser = allUsers.find(u => 
                ((u.companyEmail || '').toLowerCase() === searchStr) || 
                ((u.personalEmail || '').toLowerCase() === searchStr) || 
                ((u.name || '').toLowerCase().includes(searchStr))
              );
              if (matchedUser) {
                assigneeId = matchedUser.id;
              }
            }

            const newTask: Omit<Task, 'id'> = {
              code: `C${String(lastNum).padStart(4, '0')}`,
              issueDate: new Date().toISOString().split('T')[0],
              title: tData.title || 'Không có tiêu đề',
              objective: tData.objective || '',
              assigneeId: assigneeId,
              startDate: new Date().toISOString().split('T')[0],
              expectedEndDate: tData.expectedEndDate || '',
              prevProgress: tData.prevProgress || '',
              currentUpdate: tData.currentUpdate || '',
              history: [{ 
                version: 1, 
                content: 'Nhập từ file Excel.', 
                timestamp: new Date().toISOString(), 
                authorId: currentUser?.id || 'system' 
              }],
              status: 'IN_PROGRESS',
              priority: tData.priority || 'MEDIUM',
              isHighlighted: false,
              isLocked: false,
              updatedAt: new Date().toISOString(),
            };
            await firebaseAddTask(newTask);
            successCount++;
          }
          alert(`Đã nạp thành công ${successCount} công việc.`);
        }
      });
      
      if (e.target) e.target.value = '';
    } catch (err) {
      console.error("Import error:", err);
      alert("Đã có lỗi xảy ra khi nhập file Excel. Vui lòng kiểm tra định dạng.");
    }
  };

  const handleStaffDelete = useCallback((userId: string) => {
    const staff = allUsers.find(u => u.id === userId);
    if (!staff) return;

    setConfirmModal({
      show: true,
      title: 'XÁC NHẬN XÓA NHÂN SỰ',
      message: `Bạn có chắc chắn muốn xóa nhân sự "${staff.name}" khỏi hệ thống? Dữ liệu này sẽ mất vĩnh viễn.`,
      onConfirm: async () => {
        try {
          // Soft delete by updating status to 'DELETED'
          // This also masks the STAFF_LIST entry because the Firestore record with the same email
          // will overwrite it in the uniqueUsers map.
          await firebaseUpdateStaff({ ...staff, status: 'DELETED' as any });
          setConfirmModal(p => ({ ...p, show: false }));
        } catch (error) {
          console.error("Delete staff error:", error);
          // Fallback: try hard delete if soft delete failed (maybe rule restriction)
          try {
            await firebaseDeleteStaff(userId);
            setConfirmModal(p => ({ ...p, show: false }));
          } catch (err) {
            console.error("Hard delete also failed:", err);
            alert("Lỗi: Không thể xóa nhân sự này. Vui lòng thử lại sau.");
          }
        }
      }
    });
  }, [allUsers, firebaseUpdateStaff, firebaseDeleteStaff]);

  const filteredTasks = tasks.filter(t => {
    const safeTitle = (t.title || '').toLowerCase();
    const safeCode = (t.code || '').toLowerCase();
    const safeSearch = (search || '').toLowerCase();

    const matchesSearch = safeTitle.includes(safeSearch) || safeCode.includes(safeSearch);
    
    if (!matchesSearch) return false;

    // View scope filter
    if (viewScope === 'mine') {
      const isMine = t.assigneeId === effectiveUser?.id;
      // Also match if the assignee ID corresponds to the same email as current user (legacy match)
      const assigneeByOldId = users.find(u => u.id === t.assigneeId);
      const emailMatches = !!(assigneeByOldId?.companyEmail && effectiveUser?.companyEmail && 
                           assigneeByOldId.companyEmail.toLowerCase() === effectiveUser.companyEmail.toLowerCase());
      
      return isMine || emailMatches;
    }

    // 'all' scope shows everything matching search
    return true;
  });

  const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Primary sort: Priority (High to Low)
    const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
    const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
    if (weightB !== weightA) return weightB - weightA;
    // Secondary sort: High priority issues (Highlighted)
    if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
    // Tertiary: Newest first
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  if (!authReady) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600">ĐANG TẢI DỮ LIỆU...</div>;
  if (!currentUser || (!currentUser.name && !currentUser.companyEmail)) return <Login users={allUsers} onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar 
        user={effectiveUser} 
        users={allUsers}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUserClick={(user, top) => {
          if (top !== undefined) setChatTop(top);
          setIsChatMinimized(false);
          setShowDirectChat(user);
        }}
        pendingTasksCount={tasks.filter(t => t.status === 'AWAITING_CONFIRMATION').length}
        activeTasksCount={tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'AWAITING_CONFIRMATION').length}
        completedTasksCount={tasks.filter(t => t.status === 'COMPLETED').length}
        totalStaffCount={allUsers.length}
        groupUnreadCount={groupUnreadCount}
        unreadUserIds={unreadUserIds}
        unreadCounts={unreadCounts}
        activeChatUser={showDirectChat || undefined}
        isChatMinimized={isChatMinimized}
        privateMessages={privateMessages}
        onSendPrivateMessage={firebaseSendPrivateMessage}
        onReactToPrivateMessage={(msgId, emoji) => {
          const msg = privateMessages.find(m => m.id === msgId);
          if (!msg) return;
          const reactions = [...(msg.reactions || [])];
          const idx = reactions.findIndex(r => r.userId === effectiveUser.id && r.emoji === emoji);
          if (idx > -1) reactions.splice(idx, 1);
          else reactions.push({ userId: effectiveUser.id, emoji });
          firebaseUpdatePrivateMessageReactions(msgId, reactions);
        }}
      />

      <main className="flex-1 overflow-y-auto relative">
        {simulatedUser && (
          <div className="sticky top-0 z-[60] bg-amber-500 text-white px-6 py-2.5 flex items-center justify-between shadow-lg border-b border-amber-600 animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Search size={18} className="animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">CHẾ ĐỘ GIẢ LẬP NHÂN VIÊN</p>
                <p className="text-[10px] opacity-90 font-bold italic">Bạn đang nhìn thấy hệ thống dưới góc nhìn của: {simulatedUser.name}</p>
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
          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <HolidayBanner />
              <Header 
                title="TRUNG TÂM QUẢN LÝ CHẤT LƯỢNG TÂN PHÚ VIỆT NAM" 
                badge={effectiveUser.role}
                onAction={effectiveUser.role !== 'Staff' || effectiveUser.delegatedPermissions?.canCreateTask ? () => setShowTaskModal(true) : undefined}
                actionLabel={effectiveUser.role !== 'Staff' || effectiveUser.delegatedPermissions?.canCreateTask ? "Nhập công việc mới" : "Xem thông tin"}
                actionIcon={effectiveUser.role !== 'Staff' || effectiveUser.delegatedPermissions?.canCreateTask ? Plus : Search}
              />
              
              <div className="p-6 space-y-6">
                <StatsSummary tasks={filteredTasks} />

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm transition-all duration-300">
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setViewScope('mine')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewScope === 'mine' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <UserIcon size={14} />
                      Cá nhân ({tasks.filter(t => t.assigneeId === effectiveUser.id && t.status !== 'COMPLETED').length})
                    </button>
                    <button 
                      onClick={() => setViewScope('all')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewScope === 'all' 
                          ? 'bg-white text-blue-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <UsersIcon size={14} />
                      Phòng QLCL ({tasks.filter(t => t.status !== 'COMPLETED').length})
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-[10px] text-blue-700 font-black uppercase tracking-widest">
                      Đang xem: {viewScope === 'mine' ? 'Nhiệm vụ của bạn' : 'Toàn bộ phòng'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                       <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                       DANH SÁCH BẢNG CÔNG VIỆC
                    </h3>
                     {(effectiveUser.role !== 'Staff' || effectiveUser.delegatedPermissions?.canExportExcel || effectiveUser.delegatedPermissions?.canImportExcel) && (
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={downloadSampleExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase"
                            title="Tải file Excel mẫu"
                          >
                            <FileDown size={12} />
                            File Mẫu
                          </button>
                          {(effectiveUser.role === 'Admin' || effectiveUser.delegatedPermissions?.canExportExcel) && (
                            <button 
                              onClick={handleExportExcel}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                            >
                              <FileDown size={12} />
                              Xuất Excel
                            </button>
                          )}
                         {(effectiveUser.role === 'Admin' || effectiveUser.delegatedPermissions?.canImportExcel) && (
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
                         {effectiveUser.role === 'Admin' && (
                           <button 
                             onClick={handleResetData}
                             className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-100 transition-all uppercase"
                             title="Xóa toàn bộ dự án"
                           >
                             <Trash2 size={12} />
                             Xóa Hết
                           </button>
                         )}
                      </div>
                    )}
                   </div>
                   <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
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
                  tasks={sortedTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'AWAITING_CONFIRMATION')}
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
                  isReadOnly={viewScope === 'all' && effectiveUser.role === 'Staff'}
                />

                {effectiveUser.role === 'Admin' && (
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

          {activeTab === 'pending_confirmation' && (
            <motion.div key="pending_confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HolidayBanner />
              <Header 
                title="ĐỀ XUẤT MỚI" 
              />
              <div className="p-6">
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

          {activeTab === 'completed_tasks' && (
            <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HolidayBanner />
              <Header 
                title="CV HOÀN THÀNH" 
              />
              <div className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                    <button 
                      onClick={() => setViewScope('mine')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewScope === 'mine' 
                          ? 'bg-white text-green-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <UserIcon size={14} />
                      Cá nhân ({tasks.filter(t => t.assigneeId === effectiveUser.id && t.status === 'COMPLETED').length})
                    </button>
                    <button 
                      onClick={() => setViewScope('all')}
                      className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                        viewScope === 'all' 
                          ? 'bg-white text-green-600 shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <UsersIcon size={14} />
                      Phòng QLCL ({tasks.filter(t => t.status === 'COMPLETED').length})
                    </button>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] text-green-700 font-black uppercase tracking-widest">
                      Đang xem: {viewScope === 'mine' ? 'Lịch sử cá nhân' : 'Lịch sử toàn phòng'}
                    </span>
                  </div>
                </div>

                <StatsSummary tasks={filteredTasks} />

                <TaskList 
                  tasks={sortedTasks.filter(t => t.status === 'COMPLETED')}
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
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'group_chat' && (
            <motion.div key="group_chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HolidayBanner />
              <Header 
                title="Phòng thảo luận chung" 
              />
              <div className="p-6">
                <GroupChatPage 
                  currentUser={effectiveUser} 
                  users={allUsers}
                  messages={generalMessages} 
                  onSendMessage={sendGeneralMessage} 
                  onReact={(msgId, emoji) => {
                    const msg = generalMessages.find(m => m.id === msgId);
                    if (!msg) return;
                    const reactions = [...(msg.reactions || [])];
                    const idx = reactions.findIndex(r => r.userId === effectiveUser.id && r.emoji === emoji);
                    if (idx > -1) reactions.splice(idx, 1);
                    else reactions.push({ userId: effectiveUser.id, emoji });
                    firebaseUpdateMessageReactions(msgId, reactions);
                  }}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HolidayBanner />
              <Header 
                title="Hồ sơ & Thông tin nhân sự" 
                badge={effectiveUser.code} 
              />
              <div className="p-6">
                <ProfilePage 
                  currentUser={effectiveUser} 
                  tasks={tasks} 
                  users={allUsers}
                  onUpdateNote={updateUserNote}
                  onUpdateUser={firebaseUpdateStaff}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <HolidayBanner />
               <Header 
                title="Báo cáo hiệu suất & Vấn đề" 
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

          {activeTab === 'staff_list' && effectiveUser?.role === 'Admin' && (
            <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <HolidayBanner />
               <Header 
                title="Quản lý Nhân sự" 
               />
               <div className="p-8">
                  <StaffListPage 
                    users={allUsers} 
                    onUpdateStaff={onUpdateStaff} 
                    onDeleteStaff={handleStaffDelete}
                    currentUser={effectiveUser} 
                    onSimulateStaff={setSimulatedUser}
                    onSendToUser={async (msg, targetId) => {
                      await firebaseSendPrivateMsg(msg, currentUser.id, targetId);
                    }}
                    onSendToGroup={async (msg) => {
                      await firebaseSendMessage(msg, 'system');
                    }}
                  />
               </div>
            </motion.div>
          )}

          {activeTab === 'system_history' && effectiveUser?.role === 'Admin' && (
            <motion.div key="system_history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <HolidayBanner />
               <Header 
                title="Lịch sử Hoạt động Hệ thống" 
               />
               <div className="p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                      <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <Search size={20} />
                          </div>
                          <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-gray-900">Nhật ký hệ thống</h2>
                            <p className="text-[10px] text-gray-400 font-bold">Ghi nhận các thay đổi quan trọng</p>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {logs.length > 0 ? logs.map(log => {
                          const actor = allUsers.find(u => u.id === log.userId);
                          const target = allUsers.find(u => u.id === log.targetId);
                          return (
                            <div key={log.id} className="p-6 hover:bg-gray-50 transition-colors">
                              <div className="flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                  log.type === 'DELEGATION_CHANGE' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                                }`}>
                                  {log.type === 'DELEGATION_CHANGE' ? <Lock size={20} /> : <Search size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-black text-gray-900">{log.details}</span>
                                    <span className="text-[10px] text-gray-400 font-bold">{new Date(log.timestamp).toLocaleString('vi-VN')}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-red-500">
                                    <span>Tác nhân: {actor?.name || 'Hệ thống'}</span>
                                    {target && <span>• Đối tượng: {target.name}</span>}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="p-20 text-center text-gray-400 italic">Chưa có bản ghi hoạt động nào.</div>
                        )}
                      </div>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
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
                  if (notif.type === 'direct') setShowDirectChat(allUsers.find(u => u.id === notif.senderId)!);
                  if (notif.type === 'task') setShowChatModal(notif.taskId);
                  if (notif.type === 'approve_ht' || notif.type === 'approve_delete') setActiveTab('tasks');
                  setUnreadNotifications(prev => prev.filter((_, i) => i !== idx));
                }}
                className="bg-white border border-blue-100 shadow-2xl rounded-2xl p-4 w-72 cursor-pointer hover:bg-blue-50 transition-all border-l-4 border-l-blue-600 group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                    notif.type.startsWith('approve') ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {notif.type === 'direct' ? 'Tin nhắn' : 
                     notif.type === 'approve_ht' ? 'Phê duyệt HT' :
                     notif.type === 'approve_delete' ? 'Phê duyệt Xóa' :
                     'Nhiệm vụ'}
                  </span>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    setUnreadNotifications(prev => prev.filter((_, i) => i !== idx));
                  }} className="text-gray-300 hover:text-gray-500"><Plus size={14} className="rotate-45" /></button>
                </div>
                <p className="text-xs font-bold text-gray-900 truncate">
                  {notif.type === 'direct' ? notif.senderName : notif.taskTitle}
                </p>
                <p className="text-[11px] text-gray-500 line-clamp-1 italic">"{notif.msg}"</p>
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
            otherUser={allUsers.find(u => u.id === showDirectChat.id)!}
            messages={privateMessages}
            onSendMessage={firebaseSendPrivateMessage}
            onClose={() => setShowDirectChat(null)}
            onReact={(msgId, emoji) => {
              const msg = privateMessages.find(m => m.id === msgId);
              if (!msg) return;
              const reactions = [...(msg.reactions || [])];
              const idx = reactions.findIndex(r => r.userId === effectiveUser.id && r.emoji === emoji);
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
        onClose={() => setConfirmModal(p => ({ ...p, show: false }))}
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
