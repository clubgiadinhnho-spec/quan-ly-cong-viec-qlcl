import React, { useState, useEffect } from 'react';
import { User, Task, TaskComment } from './types';
import Login from './components/Login';
import { STAFF_LIST } from './constants';
import { 
  Plus, 
  Search, 
  Lock,
  LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Import Firebase & Hooks
import { auth, logout, db, testConnection } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { useFirebaseData } from './hooks/useFirebaseData';
import { SAMPLE_TASKS } from './data/sampleData';

// Import Components
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { TaskRow } from './components/tasks/TaskRow';
import { CompletedTaskRow } from './components/tasks/CompletedTaskRow';
import { TaskModal } from './components/tasks/TaskModal';
import { HistoryModal } from './components/tasks/HistoryModal';
import { TaskChat } from './components/tasks/TaskChat';
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
  const [showHistoryModal, setShowHistoryModal] = useState<string | null>(null);
  const [showChatModal, setShowChatModal] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Use Firebase Hook
  const { 
    tasks, 
    users, 
    messages: generalMessages, 
    loading: firebaseLoading,
    addTask: firebaseAddTask,
    updateTask: firebaseUpdateTask,
    deleteTask: firebaseDeleteTask,
    sendMessage: firebaseSendMessage,
    updateStaff: firebaseUpdateStaff,
    deleteStaff: firebaseDeleteStaff
  } = useFirebaseData();

  // Combine Firestore users with initial STAFF_LIST
  // Firestore is the source of truth, but we use STAFF_LIST as base defaults
  const allUsers = React.useMemo(() => {
    return users;
  }, [users]);

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
          if (!exists) {
            console.log(`Adding missing staff member: ${staff.name}`);
            await firebaseUpdateStaff({ ...staff, status: staff.status || 'ACTIVE' });
            addedCount++;
          }
        }
        if (addedCount > 0) {
          console.log(`Bootstrapped ${addedCount} staff members.`);
        }
      }
    };
    bootstrap();
  }, [users, firebaseLoading]);

  // Handle Authentication State
  useEffect(() => {
    // Try to load from localStorage for manual login sessions
    const savedUser = localStorage.getItem('qc_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      // Try to find the most up-to-date user from our synced list
      const latestUser = allUsers.find(u => u.id === parsed.id || u.companyEmail === parsed.companyEmail);
      if (latestUser) {
        setCurrentUser(latestUser);
      } else {
        setCurrentUser(parsed);
      }
    }
    
    setAuthReady(true);
  }, [allUsers]);

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

  const addTask = (taskData: Partial<Task>) => {
    const lastNum = tasks.reduce((max, t) => {
      const num = parseInt(t.code.replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    
    const newTask: Omit<Task, 'id'> = {
      code: `C${String(lastNum + 1).padStart(4, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      title: taskData.title || '',
      objective: taskData.objective || '',
      assigneeId: taskData.assigneeId || currentUser?.id || '',
      startDate: taskData.startDate || new Date().toISOString().split('T')[0],
      expectedEndDate: taskData.expectedEndDate || '',
      prevProgress: '',
      currentUpdate: '',
      history: [{ 
        version: 1, 
        content: 'Khởi tạo công việc.', 
        timestamp: new Date().toISOString(), 
        authorId: currentUser?.id || '' 
      }],
      status: 'IN_PROGRESS',
      priority: taskData.priority || 'MEDIUM',
      isHighlighted: false,
      isLocked: false,
    };
    firebaseAddTask(newTask);
    setShowTaskModal(false);
  };

  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ show: false, title: '', message: '', onConfirm: () => {} });

  const updateTask = (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const newUpdates: any = { ...updates };
    
    // History logic
    if (updates.currentUpdate && updates.currentUpdate !== task.currentUpdate) {
      const newHistory = [...(task.history || [])];
      newHistory.push({
        version: newHistory.length + 1,
        content: updates.currentUpdate,
        timestamp: new Date().toISOString(),
        authorId: currentUser?.id || ''
      });
      newUpdates.history = newHistory;
    }

    firebaseUpdateTask(id, newUpdates);
  };

  const addTaskComment = (taskId: string, content: string) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newComments = [...(task.comments || [])];
    newComments.push({
      id: Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      content,
      timestamp: new Date().toISOString()
    });
    firebaseUpdateTask(taskId, { comments: newComments });
  };

  const sendGeneralMessage = (content: string) => {
    if (!currentUser) return;
    firebaseSendMessage(content, currentUser.id);
  };

  const updateUserNote = (userId: string, note: string) => {
    const staff = users.find(u => u.id === userId) || STAFF_LIST.find(u => u.id === userId);
    if (staff) {
      firebaseUpdateStaff({ ...staff, personalNote: note });
    }
  };

  const deleteTask = (id: string) => {
    setConfirmModal({
      show: true,
      title: 'XÁC NHẬN XÓA',
      message: 'Bạn có chắc chắn muốn xóa công việc này? Hành động này không thể hoàn tác.',
      onConfirm: () => {
        firebaseDeleteTask(id);
        setConfirmModal(p => ({ ...p, show: false }));
      }
    });
  };

  const lockTasks = () => {
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
  };

  const seedTasks = async () => {
    if (tasks.length > 0) {
      if (!confirm('Dữ liệu công việc hiện đang có. Bạn có chắc muốn nạp thêm dữ liệu mẫu (các công việc QC cũ)?')) return;
    }
    
    for (const task of SAMPLE_TASKS) {
      const taskWithAuthor = {
        ...task,
        history: task.history.map(h => ({ ...h, authorId: currentUser?.id || 'system' }))
      };
      await firebaseAddTask(taskWithAuthor);
    }
    alert('Đã nạp dữ liệu thành công! Vui lòng kiểm tra Bảng công việc.');
  };

  const onUpdateStaff = (updatedStaff: User) => {
    firebaseUpdateStaff(updatedStaff);
  };

  const handleStaffDelete = (userId: string) => {
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
  };

  const filteredTasks = tasks.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.code.toLowerCase().includes(search.toLowerCase())
  );

  if (!authReady) return <div className="min-h-screen flex items-center justify-center font-black text-blue-600">ĐANG TẢI DỮ LIỆU...</div>;
  if (!currentUser) return <Login users={allUsers} onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      <Sidebar 
        user={currentUser} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout}
        onSeedData={seedTasks}
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
                onAction={currentUser.role === 'Admin' ? () => setShowTaskModal(true) : undefined}
                actionLabel="Giao việc mới"
                actionIcon={Plus}
              />
              
              <div className="p-8 space-y-8">
                {/* Stats Summary */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Tổng cộng dự án</p>
                    <p className="text-2xl font-black">{tasks.length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-blue-600">
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-wider mb-1">Đang thực hiện</p>
                    <p className="text-2xl font-black">{tasks.filter(t => t.status === 'IN_PROGRESS').length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider mb-1">Vấn đề nổi cộm</p>
                    <p className="text-2xl font-black">{tasks.filter(t => t.isHighlighted).length}</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-green-600">
                    <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1">Đã hoàn thành</p>
                    <p className="text-2xl font-black">{tasks.filter(t => t.status === 'COMPLETED').length}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                   <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Danh sách công việc đang xử lý</h3>
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

                <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-auto max-h-[700px] text-left">
                  <table className="w-full text-left border-collapse border border-gray-300">
                    <thead className="bg-[#FAFBFD] border-b border-gray-300">
                      <tr>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-12 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">STT</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-56 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nhân viên</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nội dung & Mục tiêu</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-40 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Diễn tiến trước đó</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-40 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Cập nhật (2 tuần tiếp)</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-16 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Ưu tiên</th>
                        <th className="py-4 px-1 text-[10px] font-black text-gray-700 uppercase tracking-wider w-12 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {filteredTasks.filter(t => t.status !== 'COMPLETED').map((task, idx) => (
                        <TaskRow 
                          key={task.id} 
                          task={task} 
                          user={currentUser} 
                          users={allUsers}
                          onUpdate={updateTask}
                          onDelete={deleteTask}
                          onViewHistory={(id) => setShowHistoryModal(id)}
                          onOpenChat={(id) => setShowChatModal(id)}
                          idx={idx}
                          setConfirmModal={setConfirmModal}
                        />
                      ))}
                    </tbody>
                  </table>
                  {filteredTasks.filter(t => t.status !== 'COMPLETED').length === 0 && (
                    <div className="py-20 text-center text-gray-400 text-sm italic">Không có dữ liệu công việc.</div>
                  )}
                </div>

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
              <Header title="Lịch sử công việc đã hoàn thành" />
              <div className="p-8 space-y-8">
                <div className="bg-white rounded-xl border border-gray-300 shadow-sm overflow-auto max-h-[700px]">
                  <table className="w-full text-left border-collapse border border-gray-300">
                    <thead className="bg-[#FAFBFD] border-b border-gray-300">
                      <tr>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-12 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">STT</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-56 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nhân viên</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-[60%] text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nội dung & Kết quả</th>
                        <th className="p-4 text-[10px] font-black text-gray-700 uppercase tracking-wider w-32 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Ngày hoàn thành</th>
                        <th className="py-4 px-1 text-[10px] font-black text-gray-700 uppercase tracking-wider w-12 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300">
                      {tasks.filter(t => t.status === 'COMPLETED').map((task, idx) => (
                        <CompletedTaskRow 
                          key={task.id}
                          task={task}
                          users={allUsers}
                          idx={idx}
                          onViewHistory={(id) => setShowHistoryModal(id)}
                          onOpenChat={(id) => setShowChatModal(id)}
                          onUndo={(id) => {
                            setConfirmModal({
                              show: true,
                              title: 'HOÀN TÁC CÔNG VIỆC',
                              message: 'Bạn muốn chuyển công việc này quay lại bảng đang thực hiện?',
                              onConfirm: () => {
                                updateTask(id, { 
                                  status: 'IN_PROGRESS', 
                                  actualEndDate: null, 
                                  isLocked: false,
                                  currentUpdate: '[HOÀN TÁC] Chuyển về bảng đang thực hiện'
                                });
                                setConfirmModal(p => ({ ...p, show: false }));
                              }
                            });
                          }}
                        />
                      ))}
                    </tbody>
                  </table>
                  {tasks.filter(t => t.status === 'COMPLETED').length === 0 && (
                    <div className="py-20 text-center text-gray-400 text-sm italic">Chưa có công việc nào hoàn thành.</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'group_chat' && (
            <motion.div key="group_chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Header title="Phòng thảo luận chung" />
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
              <Header title="Hồ sơ & Quản lý nhân sự" badge={currentUser.code} />
              <div className="p-8">
                <ProfilePage 
                  currentUser={currentUser} 
                  tasks={tasks} 
                  users={allUsers}
                  onUpdateNote={updateUserNote}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'reports' && (
            <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <Header title="Báo cáo hiệu suất & Vấn đề" />
               <div className="p-8">
                  <ReportPage tasks={tasks} users={allUsers} onUpdateTask={updateTask} />
               </div>
            </motion.div>
          )}

          {activeTab === 'staff_list' && (currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng') && (
            <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
               <Header title="Quản lý Nhân sự" />
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
      {showTaskModal && (
        <TaskModal onClose={() => setShowTaskModal(false)} onAdd={addTask} users={allUsers} />
      )}
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
