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

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [viewScope, setViewScope] = useState<'mine' | 'all'>('all');

  // Ensure viewScope is always 'all' whenever currentUser changes (app starts or login)
  useEffect(() => {
    if (currentUser) {
      setViewScope('all');
    }
  }, [currentUser?.id]);

  // The effectively active user (either original or simulated)
  const effectiveUser = simulatedUser || currentUser;

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
    saveReportDraft: firebaseSaveReportDraft,
    saveOfficialReport: firebaseSaveOfficialReport,
    officialReports: firebaseOfficialReports,
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
    // Group users by email and pick the best one (preferring currentUser.id, or latest activity, or longest ID)
    [...users].forEach(u => {
      const email = u.companyEmail.toLowerCase();
      const existing = uniqueUsers.get(email);
      
      if (!existing) {
        uniqueUsers.set(email, u);
      } else {
        // Tie-breaker:
        // 1. prefer the one that is currently logged in
        if (u.id === currentUser?.id) {
          uniqueUsers.set(email, u);
        } else if (existing.id === currentUser?.id) {
          // keep existing
        } 
        // 2. prefer the one with activity
        else if ((u.lastActive || 0) > (existing.lastActive || 0)) {
          uniqueUsers.set(email, u);
        }
        // 3. prefer long IDs (UIDs) if activity is same
        else if (u.id.length > existing.id.length && (u.lastActive || 0) === (existing.lastActive || 0)) {
          uniqueUsers.set(email, u);
        }
      }
    });
    return Array.from(uniqueUsers.values());
  }, [users, currentUser?.id]);

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
    firebaseDeleteTask
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
  const lastPrivateMsgId = React.useRef<string | null>(localStorage.getItem('qc_last_pvt_msg'));
  const lastGroupMsgId = React.useRef<string | null>(localStorage.getItem('qc_last_group_msg'));
  const lastTaskCommentId = React.useRef<Record<string, string>>({});
  const initialLoadDone = React.useRef(false);
  const knownRequests = React.useRef<Set<string>>(new Set());

  // Auto-popup logic for chat (Refined to be non-intrusive)
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!effectiveUser || !authReady || firebaseLoading) return;

    // Give some time for initial data to load completely
    if (!initialLoadDone.current) {
      if (generalMessages.length > 0 && !lastGroupMsgId.current) {
        lastGroupMsgId.current = generalMessages[generalMessages.length - 1].id;
        localStorage.setItem('qc_last_group_msg', lastGroupMsgId.current);
      }
      if (privateMessages.length > 0 && !lastPrivateMsgId.current) {
        lastPrivateMsgId.current = privateMessages[privateMessages.length - 1].id;
        localStorage.setItem('qc_last_pvt_msg', lastPrivateMsgId.current);
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
      if (latestMsg.id !== lastPrivateMsgId.current && latestMsg.receiverId === currentUser.id) {
        const sender = allUsers.find(u => u.id === latestMsg.senderId);
        if (sender) {
          // Auto-open Direct Chat
          setShowDirectChat(sender);
        }
        lastPrivateMsgId.current = latestMsg.id;
      } else if (latestMsg.id !== lastPrivateMsgId.current) {
        lastPrivateMsgId.current = latestMsg.id;
      }
    }

    // 2. Check for new group messages
    if (generalMessages.length > 0) {
      const latestGroupMsg = generalMessages[generalMessages.length - 1];
      if (latestGroupMsg.id !== lastGroupMsgId.current) {
        if (latestGroupMsg.senderId !== currentUser.id && activeTab !== 'group_chat') {
           setUnreadNotifications(prev => {
             const exists = prev.find(n => n.type === 'group');
             if (exists) return prev;
             return [...prev, { type: 'group', msg: latestGroupMsg.content }];
           });
        }
        
        // Only update Ref and localStorage if it's a NEW message that we've "seen" by being in the tab
        if (activeTab === 'group_chat') {
          lastGroupMsgId.current = latestGroupMsg.id;
          localStorage.setItem('qc_last_group_msg', latestGroupMsg.id);
        } else {
          // If not in tab, we update Ref so we don't trigger multiple notifications for the same message,
          // but we only persist to localStorage if the user explicitly opens the chat or sees the toast
          lastGroupMsgId.current = latestGroupMsg.id;
        }
      }
    }

    // 3. Check for new task comments
    tasks.forEach(t => {
      if (t.comments && t.comments.length > 0) {
        const latestComment = t.comments[t.comments.length - 1];
        const lastId = lastTaskCommentId.current[t.id];
        
        if (latestComment.id !== lastId) {
          const isRelated = t.assigneeId === currentUser.id || t.history[0]?.authorId === currentUser.id;
          if (latestComment.authorId !== currentUser.id && isRelated) {
             // Auto-open Task Chat
             setShowChatModal(t.id);
          }
          lastTaskCommentId.current[t.id] = latestComment.id;
        }
      }
    });

    // 4. Check for task requests (Admin/Trưởng Phòng)
    if (currentUser.role === 'Trưởng Phòng' || currentUser.role === 'Admin') {
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

  }, [generalMessages, privateMessages, tasks, currentUser, authReady, firebaseLoading, allUsers, activeTab]);

  // Sync "Read" state when tabs are active
  useEffect(() => {
    if (activeTab === 'group_chat' && generalMessages.length > 0) {
      const latestId = generalMessages[generalMessages.length - 1].id;
      if (lastGroupMsgId.current !== latestId) {
        lastGroupMsgId.current = latestId;
        localStorage.setItem('qc_last_group_msg', latestId);
      }
    }
  }, [activeTab, generalMessages]);

  useEffect(() => {
    if (showDirectChat && privateMessages.length > 0) {
      const latestId = privateMessages[privateMessages.length - 1].id;
      if (lastPrivateMsgId.current !== latestId) {
        lastPrivateMsgId.current = latestId;
        localStorage.setItem('qc_last_pvt_msg', latestId);
      }
    }
  }, [showDirectChat, privateMessages]);

  // Auto-clear notifications when chat is opened
  useEffect(() => {
    if (unreadNotifications.length === 0) return;

    setUnreadNotifications(prev => prev.filter(notif => {
      if (notif.type === 'direct' && showDirectChat && notif.senderId === showDirectChat.id) {
        if (privateMessages.length > 0) {
          const lastId = privateMessages[privateMessages.length - 1].id;
          lastPrivateMsgId.current = lastId;
          localStorage.setItem('qc_last_pvt_msg', lastId);
        }
        return false;
      }
      if (notif.type === 'group' && activeTab === 'group_chat') {
        if (generalMessages.length > 0) {
          const lastId = generalMessages[generalMessages.length - 1].id;
          lastGroupMsgId.current = lastId;
          localStorage.setItem('qc_last_group_msg', lastId);
        }
        return false;
      }
      if (notif.type === 'task' && showChatModal === notif.taskId) return false;
      return true;
    }));
  }, [showDirectChat, activeTab, showChatModal, unreadNotifications.length, generalMessages, privateMessages]);

  // Presence system
  useUserHeartbeat(currentUser?.id, firebaseUpdateHeartbeat);

  // AUTOMATIC CLEANUP: Remove duplicate Lê Nhật Trường accounts created by auto-reg
  useEffect(() => {
    if (firebaseLoading || users.length === 0) return;
    
    const duplicates = users.filter(u => 
      u.name === "Lê Nhật Trường" && 
      u.id !== 'mgr-01' && 
      u.id !== currentUser?.id && // Don't delete the user we are currently logged in as!
      (u.companyEmail.includes('@qlcl.vn') || u.companyEmail === 'lenhattruong.tpp@gmail.com' && u.id.length > 10)
    );
    
    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} duplicate accounts for cleaning...`);
      duplicates.forEach(d => {
        firebaseDeleteStaff(d.id).catch(err => console.error("Cleanup failed for", d.id, err));
      });
    }
  }, [users, firebaseLoading, firebaseDeleteStaff]);

  // Auto-bootstrap STAFF_LIST to Firestore is DISABLED to prevent overwriting user changes.
  // We only read from Firestore now.
  useEffect(() => {
    // Bootstrap logic removed to protect manual adjustments to Trường, Quản Trị Viên, Tân, Tú, etc.
  }, []); 

  // Handle Authentication State (Restore Session & Sync)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("Auth state changed:", fbUser?.uid || "No user", fbUser?.email || "No email");
      
      if (fbUser) {
        // 1. Try to find user by UID first
        let currentStaff = users.find(u => u.id === fbUser.uid);
        
        // 2. If not found by UID, try to find by Email
        if (!currentStaff && fbUser.email) {
          currentStaff = users.find(u => u.companyEmail.toLowerCase() === fbUser.email?.toLowerCase());
          
          if (currentStaff) {
             console.log("Mapping user by email to new UID:", fbUser.uid);
             const updatedStaff = { ...currentStaff, id: fbUser.uid };
             // Use setDoc to associate the current Firestore user data with this new UID
             await setDoc(doc(db, 'users', fbUser.uid), updatedStaff);
             currentStaff = updatedStaff;
          }
        }

        if (currentStaff) {
          console.log("User identified as:", currentStaff.name, currentStaff.role);
          setCurrentUser(currentStaff);
          localStorage.setItem('qc_user', JSON.stringify(currentStaff));
        } else if (!firebaseLoading && fbUser.uid) {
          console.log("User not found in system:", fbUser.uid);
          // Instead of auto-registering, we show a message or just don't set the user
          // This prevents duplicate accounts for every new UID
        }
      } else {
        const savedUser = localStorage.getItem('qc_user');
        if (savedUser) {
          const parsed = JSON.parse(savedUser);
          setCurrentUser(parsed);
          // Auto-trigger anonymous login to restore Firebase session if no Google user
          try {
            console.log("Restoring Firebase session anonymously for:", parsed.name);
            await loginAnonymously();
          } catch (err: any) {
            console.error("Auto-auth restoration failed:", err);
          }
        } else {
          setCurrentUser(null);
        }
      }
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, [users.length, firebaseLoading, authReady]); 

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

  const onUpdateStaff = useCallback((updatedStaff: UserType) => {
    firebaseUpdateStaff(updatedStaff);
  }, [firebaseUpdateStaff]);

  const handleExportExcel = () => {
    if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Trưởng Phòng') return;
    exportTasksToExcel(tasks, users);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== 'Admin' && currentUser?.role !== 'Trưởng Phòng') return;
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
              const searchStr = tData.assigneeId.toString().toLowerCase();
              const matchedUser = allUsers.find(u => 
                (u.companyEmail && u.companyEmail.toLowerCase() === searchStr) || 
                (u.personalEmail && u.personalEmail.toLowerCase() === searchStr) || 
                (u.name && u.name.toLowerCase().includes(searchStr))
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
      onConfirm: () => {
        firebaseDeleteStaff(userId);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  }, [allUsers, firebaseDeleteStaff]);

  const handleResetStaffList = useCallback(async () => {
    try {
      console.log("Resetting Staff List to original 5 members...");
      // 1. Delete all current users in Firestore
      for (const u of users) {
        await firebaseDeleteStaff(u.id);
      }
      // 2. Add the 5 essential staff back from STAFF_LIST
      for (const s of STAFF_LIST) {
        await firebaseUpdateStaff(s);
      }
      alert("Đã khôi phục danh sách 5 nhân sự gốc thành công.");
      // Optional: Logout current user to ensure clean state
      handleLogout();
    } catch (err) {
      console.error("Reset staff failed:", err);
      alert("Cần quyền Admin để thực hiện thao tác này.");
    }
  }, [users, firebaseDeleteStaff, firebaseUpdateStaff, handleLogout]);

  // Expose to window for the button in StaffListPage
  React.useEffect(() => {
    (window as any).resetStaffList = handleResetStaffList;
    return () => { delete (window as any).resetStaffList; };
  }, [handleResetStaffList]);

  const filteredTasks = tasks.filter(t => {
    const matchesSearch = (t.title.toLowerCase().includes(search.toLowerCase()) || 
                          t.code.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;

    // Filter out pending review tasks from the main list unless specifically viewing them
    if (t.status === 'PENDING_REVIEW' && activeTab !== 'review_tasks') return false;
    if (t.status !== 'PENDING_REVIEW' && activeTab === 'review_tasks') return false;

    // CV đã hoàn thành filter
    if (activeTab === 'completed_tasks' && t.status !== 'COMPLETED') return false;
    if (activeTab === 'tasks' && t.status === 'COMPLETED') return false;

    // View scope filter
    if (viewScope === 'mine') {
      const isMine = t.assigneeId === effectiveUser?.id;
      // Also match if the assignee ID corresponds to the same email as current user (legacy match)
      const assigneeByOldId = users.find(u => u.id === t.assigneeId);
      const emailMatches = assigneeByOldId && effectiveUser?.companyEmail && 
                           assigneeByOldId.companyEmail.toLowerCase() === effectiveUser.companyEmail.toLowerCase();
      
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
  if (!currentUser) return <Login users={allUsers} onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar 
        user={effectiveUser} 
        users={allUsers}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUserClick={(user) => setShowDirectChat(user)}
        onAddTask={() => setShowTaskModal(true)}
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
                onAction={() => setShowTaskModal(true)}
                actionLabel="Nhập công việc"
                actionIcon={Plus}
              />
              
              <div className="p-8 space-y-8">
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
                       DANH SÁCH CÔNG VIỆC ĐANG XỬ LÝ
                    </h3>
                     {(effectiveUser.role !== 'Nhân Viên') && (
                       <div className="flex items-center gap-2">
                          <button 
                            onClick={downloadSampleExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase"
                            title="Tải file Excel mẫu"
                          >
                            <FileDown size={12} />
                            File Mẫu
                          </button>
                          <button 
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                          >
                            <FileDown size={12} />
                            Xuất Excel
                          </button>
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
                  tasks={sortedTasks.filter(t => t.status !== 'COMPLETED')}
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
                  isReadOnly={activeTab === 'tasks' && effectiveUser.role === 'Nhân Viên'}
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

          {activeTab === 'completed_tasks' && (
            <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <HolidayBanner />
              <Header 
                title="Lịch sử công việc đã hoàn thành" 
              />
              <div className="p-8 space-y-8">
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
              <div className="p-8">
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
                title="Hồ sơ & Quản lý nhân sự" 
                badge={effectiveUser.code} 
              />
              <div className="p-8">
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
               <div className="p-8">
                  <ReportPage 
                    tasks={tasks} 
                    users={allUsers} 
                    onUpdateTask={updateTask}
                    currentUser={effectiveUser!}
                    officialReports={firebaseOfficialReports}
                    onSaveDraft={firebaseSaveReportDraft}
                    onSaveOfficialReport={firebaseSaveOfficialReport}
                  />
               </div>
            </motion.div>
          )}

          {activeTab === 'staff_list' && (currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') && (
            <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <HolidayBanner />
               <Header 
                title="Quản lý Nhân sự" 
               />
               <div className="p-8">
                  <StaffListPage 
                    users={allUsers} 
                    onUpdateStaff={firebaseUpdateStaff} 
                    onDeleteStaff={handleStaffDelete}
                    currentUser={effectiveUser} 
                    onSimulateStaff={setSimulatedUser}
                  />
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
                  if (notif.type === 'group') setActiveTab('group_chat');
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
                     notif.type === 'group' ? 'Nhóm' : 
                     notif.type === 'approve_ht' ? 'Phê duyệt HT' :
                     notif.type === 'approve_delete' ? 'Phê duyệt Xóa' :
                     'Nhiệm vụ'}
                  </span>
                  <button onClick={(e) => {
                    e.stopPropagation();
                    const notif = unreadNotifications[idx];
                    if (notif.type === 'group' && generalMessages.length > 0) {
                      localStorage.setItem('qc_last_group_msg', generalMessages[generalMessages.length - 1].id);
                    }
                    if (notif.type === 'direct' && privateMessages.length > 0) {
                      localStorage.setItem('qc_last_pvt_msg', privateMessages[privateMessages.length - 1].id);
                    }
                    setUnreadNotifications(prev => prev.filter((_, i) => i !== idx));
                  }} className="text-gray-300 hover:text-gray-500"><Plus size={14} className="rotate-45" /></button>
                </div>
                <p className="text-xs font-bold text-gray-900 truncate">
                  {notif.type === 'direct' ? notif.senderName : notif.type === 'group' ? 'Phòng thảo luận' : notif.taskTitle}
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
