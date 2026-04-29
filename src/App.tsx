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
  FileDown,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Utilities
import { exportTasksToExcel, importTasksFromExcel, downloadSampleExcel } from './utils/excelUtils';

// Import Firebase & Hooks
import { auth, logout, db } from './lib/firebase';
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
    officialReports: firebaseOfficialReports,
    clearAllTasks
  } = useFirebaseData(currentUser?.id);

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
  const lastPrivateMsgId = React.useRef<string | null>(null);
  const lastGroupMsgId = React.useRef<string | null>(null);
  const lastTaskCommentId = React.useRef<Record<string, string>>({});
  const initialLoadDone = React.useRef(false);

  // Auto-popup logic for chat (Refined to be non-intrusive)
  const [unreadNotifications, setUnreadNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!currentUser || !authReady || firebaseLoading) return;

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
      if (latestMsg.id !== lastPrivateMsgId.current && latestMsg.receiverId === currentUser.id) {
        const sender = allUsers.find(u => u.id === latestMsg.senderId);
        if (sender) {
          // Add to notifications instead of popping up
          setUnreadNotifications(prev => {
            const exists = prev.find(n => n.type === 'direct' && n.senderId === sender.id);
            if (exists) return prev;
            return [...prev, { type: 'direct', senderId: sender.id, senderName: sender.name, msg: latestMsg.content }];
          });
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
        lastGroupMsgId.current = latestGroupMsg.id;
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
             setUnreadNotifications(prev => {
               const exists = prev.find(n => n.type === 'task' && n.taskId === t.id);
               if (exists) return prev;
               return [...prev, { type: 'task', taskId: t.id, taskTitle: t.title, msg: latestComment.content }];
             });
          }
          lastTaskCommentId.current[t.id] = latestComment.id;
        }
      }
    });

  }, [privateMessages, tasks, currentUser, authReady, firebaseLoading, allUsers, activeTab]);

  // Presence system
  useUserHeartbeat(currentUser?.id, firebaseUpdateHeartbeat);

  // Auto-bootstrap STAFF_LIST to Firestore
  // We ensure every person in STAFF_LIST exists in Firestore
  const bootstrapAttempted = React.useRef(false);
  
  useEffect(() => {
    const bootstrap = async () => {
      if (!firebaseLoading && !bootstrapAttempted.current) {
        bootstrapAttempted.current = true;
        let addedCount = 0;
        for (const staff of STAFF_LIST) {
          const exists = users.find(u => u.id === staff.id || u.companyEmail === staff.companyEmail);
          // If staff doesn't exist OR doesn't have a security question, sync them
          if (!exists || !exists.securityQuestion) {
            await firebaseUpdateStaff({ ...staff, status: (exists?.status || staff.status || 'ACTIVE') as any });
            addedCount++;
          }
        }
      }
    };
    bootstrap();
  }, [firebaseLoading]); // Only run when loading state changes

  // Handle Authentication State (Restore Session & Sync)
  useEffect(() => {
    const savedUser = localStorage.getItem('qc_user');
    if (!savedUser) {
      setAuthReady(true);
      return;
    }

    const parsed = JSON.parse(savedUser);
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
  }, [users]); // removed currentUser from inner logic dependency check to avoid loops, but it works

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('qc_user', JSON.stringify(user));
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

  const filteredTasks = tasks.filter(t => 
    (t.title.toLowerCase().includes(search.toLowerCase()) || 
     t.code.toLowerCase().includes(search.toLowerCase()))
  );

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
        user={currentUser} 
        users={allUsers}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onUserClick={(user) => setShowDirectChat(user)}
      />

      <main className="flex-1 overflow-y-auto">
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
              />
              
              <div className="p-8 space-y-8">
                <StatsSummary tasks={tasks} />

                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                    <h3 className="text-[13px] font-bold text-gray-500 uppercase tracking-widest">Danh sách công việc đang xử lý</h3>
                     {(currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') && (
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
                         {currentUser.role === 'Admin' && (
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
                  setUnreadNotifications(prev => prev.filter((_, i) => i !== idx));
                }}
                className="bg-white border border-blue-100 shadow-2xl rounded-2xl p-4 w-72 cursor-pointer hover:bg-blue-50 transition-all border-l-4 border-l-blue-600 group"
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">
                    {notif.type === 'direct' ? 'Tin nhắn' : notif.type === 'group' ? 'Nhóm' : 'Nhiệm vụ'}
                  </span>
                  <button onClick={(e) => {
                    e.stopPropagation();
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
