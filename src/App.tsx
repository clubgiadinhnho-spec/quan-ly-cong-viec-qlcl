import React, { useState, useEffect, useCallback } from 'react';
import { User, Task, TaskComment } from './types';
import Login from './components/Login';
import { STAFF_LIST } from './constants';
import { 
  Plus, 
  Search, 
  Lock,
  LogOut,
  FileUp,
  FileDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Utilities
import { exportTasksToExcel, importTasksFromExcel } from './utils/excelUtils';

// Import Firebase & Hooks
import { auth, logout, db, testConnection, loginAnonymously } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebaseData, useUserHeartbeat } from './hooks/useFirebaseData';
import { useTaskActions } from './hooks/useTaskActions';

// Import Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { StatsSummary } from './components/dashboard/StatsSummary';
import { TaskList } from './components/tasks/TaskList';
import { TaskModal } from './components/tasks/TaskModal';
import { HistoryModal } from './components/tasks/HistoryModal';
import { TaskChat } from './components/tasks/TaskChat';
import { DirectChat } from './components/tasks/DirectChat';
import { ConfirmModal } from './components/common/ConfirmModal';
import { ProfilePage } from './pages/ProfilePage';
import { ReportPage } from './pages/ReportPage';
import { GroupChatPage } from './pages/GroupChatPage';
import { StaffListPage } from './pages/StaffListPage';

import firebaseConfig from '../firebase-applet-config.json';

// --- Main App ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [search, setSearch] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [firebaseConfigError, setFirebaseConfigError] = useState<string | null>(null);

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
    sendPrivateMessage: firebaseSendPrivateMessage,
    updateStaff: firebaseUpdateStaff,
    deleteStaff: firebaseDeleteStaff,
    updateHeartbeat: firebaseUpdateHeartbeat,
    saveReportDraft: firebaseSaveReportDraft,
    saveOfficialReport: firebaseSaveOfficialReport,
    officialReports: firebaseOfficialReports
  } = useFirebaseData(currentUser?.id);

  // Combine Firestore users with initial STAFF_LIST
  // Firestore is the source of truth, but we use STAFF_LIST as base defaults
  const allUsers = React.useMemo(() => {
    return users;
  }, [users]);

  const { 
    addTask: baseAddTask,
    updateTask,
    addTaskComment
  } = useTaskActions({
    tasks,
    currentUser,
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

  const [showDirectChat, setShowDirectChat] = useState<User | null>(null);

  // Presence system
  useUserHeartbeat(currentUser?.id, firebaseUpdateHeartbeat);

  // Auto-bootstrap STAFF_LIST to Firestore
  // We ensure every person in STAFF_LIST exists in Firestore
  const bootstrapAttempted = React.useRef(false);
  
  useEffect(() => {
    const bootstrap = async () => {
      if (!firebaseLoading && !bootstrapAttempted.current && auth.currentUser) {
        bootstrapAttempted.current = true;
        let addedCount = 0;
        for (const staff of STAFF_LIST) {
          const exists = users.find(u => u.id === staff.id || u.companyEmail === staff.companyEmail);
          // If staff doesn't exist OR doesn't have a security question OR code changed, sync them
          if (!exists || !exists.securityQuestion || exists.code !== staff.code) {
            try {
              await firebaseUpdateStaff({ 
                ...staff, 
                status: (exists?.status || staff.status || 'ACTIVE') as any,
                // Reserve existing data that might be user-specific but update core fields
                firebaseUid: exists?.firebaseUid || staff.firebaseUid
              });
              addedCount++;
            } catch (e) {
              console.warn("Bootstrap write failed (likely permissions):", e);
            }
          }
        }
      }
    };
    bootstrap();
  }, [firebaseLoading]); // Only run when loading state changes

  // Handle Authentication State (Restore Session & Sync)
  useEffect(() => {
    const savedUser = localStorage.getItem('qc_user');
    
    const restoreAuth = async () => {
      // Ensure we are signed in to Firebase to allow reading/writing data
      if (!auth.currentUser) {
        try {
          await loginAnonymously();
          setFirebaseConfigError(null);
        } catch (err: any) {
          if (err.message?.includes('auth/admin-restricted-operation') || err.code === 'auth/admin-restricted-operation') {
            setFirebaseConfigError("ANONYMOUS_AUTH_DISABLED");
            // Only log once to avoid console spam
            if (!(window as any).__firebase_error_logged) {
              console.error(`FIREBASE CONFIG ERROR: Anonymous Authentication is disabled in project "${firebaseConfig.projectId}".`);
              (window as any).__firebase_error_logged = true;
            }
          } else {
            console.error("Failed to establish firebase auth:", err);
          }
        }
      }

      if (!savedUser) {
        setAuthReady(true);
        return;
      }

      const parsed = JSON.parse(savedUser);

      // Sync UID mapping if we have an active auth session
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'uid_mapping', auth.currentUser.uid), { targetId: parsed.id });
        } catch (e) {
          console.warn("Restore mapping failed:", e);
        }
      }

      const latestUser = users.find(u => u.id === parsed.id || u.companyEmail === parsed.companyEmail);
      
      if (latestUser) {
        // Only update if the user data (excluding lastActive) has changed to avoid heartbeat-induced loops
        const currentUserReduced = currentUser ? { ...currentUser, lastActive: 0 } : null;
        const latestUserReduced = { ...latestUser, lastActive: 0 };
        
        if (JSON.stringify(currentUserReduced) !== JSON.stringify(latestUserReduced)) {
          setCurrentUser(latestUser);
          localStorage.setItem('qc_user', JSON.stringify(latestUser));
        }
      } else if (!currentUser) {
        setCurrentUser(parsed);
      }
      
      setAuthReady(true);
    };

    restoreAuth();
  }, [users]); // removed currentUser from inner logic dependency check to avoid loops, but it works

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('qc_user', JSON.stringify(user));
    
    // Create UID mapping and link firebaseUid if not set
      if (auth.currentUser) {
        try {
          const uid = auth.currentUser.uid;
          // Create mapping
          await setDoc(doc(db, 'uid_mapping', uid), { targetId: user.id });
          // Link firebaseUid to user record
          if (user.firebaseUid !== uid) {
            await firebaseUpdateStaff({ ...user, firebaseUid: uid });
          }
        } catch (err) {
          console.warn("Failed to create UID mapping (session might be limited):", err);
        }
      } else {
        console.warn("Login successful but Firebase session missing. Database writes will be restricted.");
      }
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
    if (!currentUser) return;
    firebaseSendMessage(content, currentUser.id);
  }, [currentUser, firebaseSendMessage]);

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

  const onUpdateStaff = useCallback((updatedStaff: User) => {
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

      const confirmed = confirm(`Bạn có muốn nạp ${importedTasks.length} công việc từ file Excel này không?`);
      if (!confirmed) return;

      let lastNum = tasks.reduce((max, t) => {
        const num = parseInt(t.code.replace(/\D/g, '')) || 0;
        return num > max ? num : max;
      }, 0);

      let unmatchedCount = 0;
      for (const tData of importedTasks) {
        lastNum++;
        
        // Find matching user
        let matchedAssigneeId = ''; // Initialize empty
        const rawName = tData.assigneeName || '';
        
        if (rawName) {
          // Normalize name: remove special chars, extra spaces
          const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          
          // Format in Excel: "Name (Code)" or just "Name"
          const codeMatch = rawName.match(/\((.*?)\)/);
          const extractedCode = codeMatch ? codeMatch[1].trim() : '';
          const extractedName = rawName.replace(/\(.*?\)/, '').trim();
          
          const foundUser = allUsers.find(u => {
            const uNameNorm = normalize(u.name);
            const extNameNorm = normalize(extractedName);
            const rawNameNorm = normalize(rawName);
            
            // Check by code first
            if (extractedCode && u.code === extractedCode) return true;
            if (u.code && extractedName.includes(u.code)) return true;
            
            // Check by normalized name
            if (uNameNorm === extNameNorm) return true;
            
            // Fuzzy match (only if names are long enough to avoid false positives)
            if (uNameNorm.length > 5) {
               if (extNameNorm.includes(uNameNorm)) return true;
               if (uNameNorm.includes(extNameNorm) && extNameNorm.length > 5) return true;
            }
            
            return false;
          });
          
          if (foundUser) {
            matchedAssigneeId = foundUser.id;
          } else {
            unmatchedCount++;
          }
        }

        // Default to current user ONLY IF NO NAME WAS PROVIDED AT ALL in Excel
        if (!matchedAssigneeId && !rawName) {
          matchedAssigneeId = currentUser?.id || '';
        }

        const newTask: Omit<Task, 'id'> = {
          code: tData.code || `C${String(lastNum).padStart(6, '0')}`,
          issueDate: new Date().toISOString().split('T')[0],
          title: tData.title || 'Không có tiêu đề',
          objective: tData.objective || '',
          assigneeId: matchedAssigneeId,
          startDate: new Date().toISOString().split('T')[0],
          expectedEndDate: tData.expectedEndDate || '',
          prevProgress: '',
          currentUpdate: '',
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
          sortTimestamp: Date.now(),
        };
        await firebaseAddTask(newTask);
      }
      alert(`Đã nạp thành công ${importedTasks.length} công việc.${unmatchedCount > 0 ? `\n\nCẢNH BÁO: Có ${unmatchedCount} công việc không tìm thấy tên nhân viên khớp trong hệ thống (đã để trống tên hoặc gán cho bạn nếu không có tên).` : ''}`);
      e.target.value = ''; // Reset input
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

  const filteredTasks = tasks.filter(t => 
    (t.title.toLowerCase().includes(search.toLowerCase()) || 
     t.code.toLowerCase().includes(search.toLowerCase()))
  );

  const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // 1. Reverted tasks (sortTimestamp === 0) MUST go to the absolute bottom
    const isRevertedA = a.sortTimestamp === 0;
    const isRevertedB = b.sortTimestamp === 0;
    
    if (isRevertedA && !isRevertedB) return 1;
    if (!isRevertedA && isRevertedB) return -1;
    if (isRevertedA && isRevertedB) {
      // Both are reverted, sort by update time (newest at the top of the reverted group)
      const timeA = new Date(a.updatedAt).getTime() || 0;
      const timeB = new Date(b.updatedAt).getTime() || 0;
      return timeB - timeA;
    }

    // 2. Main Sorting: Newest created tasks at the top
    // Use sortTimestamp if available, otherwise fallback to issueDate
    // Reverted tasks (0) are already handled above, so they won't reach here if compared to non-reverted
    const sortA = typeof a.sortTimestamp === 'number' ? a.sortTimestamp : (new Date(a.issueDate).getTime() || 1);
    const sortB = typeof b.sortTimestamp === 'number' ? b.sortTimestamp : (new Date(b.issueDate).getTime() || 1);
    if (sortB !== sortA) return sortB - sortA;

    // 3. Secondary: Priority Order (Specific manually assigned order)
    if (a.priorityOrder !== b.priorityOrder) {
      if (!a.priorityOrder) return 1;
      if (!b.priorityOrder) return -1;
      return a.priorityOrder - b.priorityOrder;
    }

    // 4. Tertiary: Priority Weight (HIGH > MEDIUM > LOW)
    const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
    const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
    if (weightB !== weightA) return weightB - weightA;
    
    // 5. High priority issues (Highlighted)
    if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
    
    // 6. Update time
    const timeA = new Date(a.updatedAt).getTime() || 0;
    const timeB = new Date(b.updatedAt).getTime() || 0;
    return timeB - timeA;
  });

  if (!authReady) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600">ĐANG TẢI DỮ LIỆU...</div>;
  if (!currentUser) return <Login users={allUsers} onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar 
        user={currentUser} 
        users={allUsers}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUserClick={(user) => setShowDirectChat(user)}
      />

      <main className="flex-1 overflow-y-auto">
        {firebaseConfigError === 'ANONYMOUS_AUTH_DISABLED' && (
          <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-4 text-center text-sm font-medium sticky top-0 z-[100] shadow-xl border-b border-white/20 backdrop-blur-md">
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold uppercase tracking-tight">Cần bật quyền truy cập (Anonymous Auth)</p>
                  <p className="text-xs opacity-90 mt-0.5">Project: <code className="bg-black/20 px-1 rounded">{firebaseConfig.projectId}</code></p>
                  <p className="text-[10px] opacity-75 mt-1">Truy cập Firebase Console &gt; Authentication &gt; Sign-in method &gt; Enable <b>Anonymous</b></p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => window.open(`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/providers`, '_blank')}
                  className="bg-white text-red-600 px-4 py-1.5 rounded-full font-bold text-xs shadow-lg hover:scale-105 active:scale-95 transition-all uppercase"
                >
                  BẬT NGAY
                </button>
                <button 
                  onClick={() => setFirebaseConfigError(null)}
                  className="bg-black/20 text-white hover:bg-black/40 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                >
                  ĐÓNG
                </button>
              </div>
            </div>
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
              <Header 
                title="BẢNG THEO DÕI CÔNG VIỆC P.QLCL" 
                badge={currentUser.role}
                onAction={(currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') ? () => setShowTaskModal(true) : undefined}
                actionLabel="Giao việc mới"
                actionIcon={Plus}
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
              />
              
              <div className="p-8 space-y-8">
                <StatsSummary tasks={tasks} />

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Danh sách công việc đang xử lý</h3>
                    {(currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') && (
                      <div className="flex items-center gap-2">
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
                  user={currentUser}
                  users={allUsers}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onViewHistory={(id) => setShowHistoryModal(id)}
                  onOpenChat={(id) => setShowChatModal(id)}
                  onEdit={setEditingTask}
                  setConfirmModal={setConfirmModal}
                  type="active"
                />

                {currentUser.role === 'Admin' && (
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
              <Header 
                title="Lịch sử công việc đã hoàn thành" 
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
              />
              <div className="p-8 space-y-8">
                <TaskList 
                  tasks={sortedTasks.filter(t => t.status === 'COMPLETED')}
                  user={currentUser}
                  users={allUsers}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onViewHistory={(id) => setShowHistoryModal(id)}
                  onOpenChat={(id) => setShowChatModal(id)}
                  onEdit={setEditingTask}
                  setConfirmModal={setConfirmModal}
                  type="completed"
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'group_chat' && (
            <motion.div key="group_chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Header 
                title="Phòng thảo luận chung" 
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
              />
              <div className="p-8">
                <GroupChatPage 
                  currentUser={currentUser} 
                  messages={generalMessages} 
                  onSendMessage={sendGeneralMessage} 
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Header 
                title="Hồ sơ & Quản lý nhân sự" 
                badge={currentUser.code} 
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
              />
              <div className="p-8">
                <ProfilePage 
                  currentUser={currentUser} 
                  tasks={tasks} 
                  users={allUsers}
                  onUpdateNote={updateUserNote}
                  onUpdateUser={onUpdateStaff}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <Header 
                title="Báo cáo hiệu suất & Vấn đề" 
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
               />
               <div className="p-8">
                  <ReportPage 
                    tasks={tasks} 
                    users={allUsers} 
                    onUpdateTask={updateTask}
                    currentUser={currentUser!}
                    officialReports={firebaseOfficialReports}
                    onSaveDraft={firebaseSaveReportDraft}
                    onSaveOfficialReport={firebaseSaveOfficialReport}
                  />
               </div>
            </motion.div>
          )}

          {activeTab === 'staff_list' && (currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') && (
            <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <Header 
                title="Quản lý Nhân sự" 
                users={allUsers}
                onUserClick={(user) => setShowDirectChat(user)}
                currentUserId={currentUser.id}
               />
               <div className="p-8">
                  <StaffListPage 
                    users={allUsers} 
                    onUpdateStaff={onUpdateStaff} 
                    onDeleteStaff={handleStaffDelete}
                    currentUser={currentUser} 
                  />
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

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
        <HistoryModal taskId={showHistoryModal} tasks={tasks} onClose={() => setShowHistoryModal(null)} />
      )}
      
      <AnimatePresence>
        {showChatModal && (
          <TaskChat 
            task={tasks.find(t => t.id === showChatModal)!}
            currentUser={currentUser!}
            onSendMessage={addTaskComment}
            onClose={() => setShowChatModal(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDirectChat && (
          <DirectChat 
            currentUser={currentUser}
            otherUser={showDirectChat}
            messages={privateMessages}
            onSendMessage={firebaseSendPrivateMessage}
            onClose={() => setShowDirectChat(null)}
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
    </div>
  );
}
