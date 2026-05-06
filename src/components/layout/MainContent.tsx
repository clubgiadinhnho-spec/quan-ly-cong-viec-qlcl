import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, User as UserIcon, Users as UsersIcon, FileUp, FileDown, Lock, Trash2 } from 'lucide-react';
import { User, Task, LogEntry, OfficialReport, DiscussionTopic, DiscussionMessage } from '../../types';
import { Header } from './Header';
import { HolidayBanner } from './HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { PendingConfirmationPage } from '../../pages/PendingConfirmationPage';
import { GroupChatPage } from '../../pages/GroupChatPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { ReportPage } from '../../pages/ReportPage';
import { StaffListPage } from '../../pages/StaffListPage';
import { SystemHistoryPage } from '../../pages/SystemHistoryPage';
import { downloadSampleExcel } from '../../utils/excelUtils';
import { isUserTask } from '../../utils/userUtils';

interface MainContentProps {
  activeTab: string;
  effectiveUser: User;
  currentUser: User | null;
  presence: any[];
  allUsers: User[];
  tasks: Task[];
  filteredTasks: Task[];
  sortedTasks: Task[];
  viewScope: 'mine' | 'all';
  setViewScope: (scope: 'mine' | 'all') => void;
  search: string;
  setSearch: (s: string) => void;
  myActiveCount: number;
  allActiveCount: number;
  setShowTaskModal: (show: boolean) => void;
  handleExportExcel: () => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  updateTask: any;
  deleteTask: any;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  highlightedTaskId: string | null;
  lockTasks: () => void;
  discussionTopics: DiscussionTopic[];
  discussionMessages: DiscussionMessage[];
  sendDiscussionMessage: any;
  updateDiscussionMessageReactions: any;
  createTopic: any;
  updateTopic: any;
  deleteTopic: any;
  deleteTopicsBulk: any;
  deleteDiscussionMessage: any;
  updateProfile: any;
  officialReports: OfficialReport[];
  firebaseSaveReportDraft: any;
  firebaseSaveOfficialReport: any;
  permanentDeleteTask: any;
  restoreTask: any;
  setActiveTab: (tab: string) => void;
  setShowDirectChat: (u: User | null) => void;
  unreadCounts: Record<string, number>;
  groupUnreadCount: number;
  setSimulatedUser: (u: User | null) => void;
  firebaseSendPrivateMsg: any;
  deleteProfile: any;
  deleteTasksBulk: any;
  trashTasksBulk: any;
  logs: LogEntry[];
  resetSystem: () => Promise<void>;
  deleteLogsBulk: (logIds: string[]) => Promise<boolean>;
}

export const MainContent: React.FC<MainContentProps> = (props) => {
  const {
    activeTab, effectiveUser, currentUser, presence, allUsers, tasks, filteredTasks, sortedTasks,
    viewScope, setViewScope, search, setSearch, myActiveCount, allActiveCount, setShowTaskModal,
    handleExportExcel, handleImportExcel, updateTask, deleteTask, setShowHistoryModal, setShowChatModal,
    showChatModal, addTaskComment, updateTaskCommentReactions, setEditingTask, setConfirmModal,
    highlightedTaskId, lockTasks, discussionTopics, discussionMessages, sendDiscussionMessage,
    updateDiscussionMessageReactions, createTopic, updateTopic, deleteTopic, deleteTopicsBulk, deleteDiscussionMessage,
    updateProfile, officialReports, firebaseSaveReportDraft, firebaseSaveOfficialReport,
    permanentDeleteTask, restoreTask, setActiveTab, setShowDirectChat, unreadCounts, groupUnreadCount,
    setSimulatedUser, firebaseSendPrivateMsg, deleteProfile, deleteTasksBulk, trashTasksBulk, logs, resetSystem,
    deleteLogsBulk
  } = props;

  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    setConfirmModal({
      show: true,
      title: "XÁC NHẬN XÓA NHIỀU",
      message: `Bạn đang chọn XÓA ${selectedTaskIds.length} công việc. Hành động này sẽ chuyển các công việc vào THÙNG RÁC. Bạn có chắc chắn không?`,
      onConfirm: async () => {
        try {
          // Use the optimized batch function
          await trashTasksBulk(selectedTaskIds, effectiveUser.name);
          
          setSelectedTaskIds([]);
          alert(`Đã chuyển ${selectedTaskIds.length} công việc vào thùng rác.`);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa.");
        } finally {
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      }
    });
  };

  return (
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
              title={<span translate="no" className="notranslate">BẢNG CÔNG VIỆC</span>}
              badge={<span translate="no" className="notranslate">{effectiveUser.role}</span>}
              onAction={() => setShowTaskModal(true)}
              actionLabel={<span translate="no" className="notranslate">NHẬP CÔNG VIỆC MỚI</span>}
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
                    viewScope === "mine" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserIcon size={14} />
                  <span translate="no" className="notranslate">Cá nhân</span> ({myActiveCount})
                </button>
                <button
                  onClick={() => setViewScope("all")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UsersIcon size={14} />
                  <span translate="no" className="notranslate">Phòng QLCL</span> ({allActiveCount})
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span translate="no" className="notranslate text-[10px] text-blue-700 font-black uppercase tracking-widest">
                  Đang xem: {viewScope === "mine" ? "Nhiệm vụ của bạn" : "Toàn bộ phòng"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                  <span translate="no" className="notranslate">DANH SÁCH BẢNG CÔNG VIỆC</span>
                </h3>
                {(effectiveUser.role !== "Staff" || effectiveUser.delegatedPermissions?.canExportExcel || effectiveUser.delegatedPermissions?.canImportExcel) && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={downloadSampleExcel}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase"
                      title="Tải file Excel mẫu"
                    >
                      <FileDown size={12} />
                      File Mẫu
                    </button>
                    {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
                      <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                      >
                        <FileDown size={12} />
                        Xuất Excel
                      </button>
                    )}
                    {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canImportExcel) && (
                      <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase cursor-pointer">
                        <FileUp size={12} />
                        Nhập từ Excel
                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                      </label>
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
              tasks={sortedTasks.filter((t) => {
                if (t.status === "COMPLETED" || t.status === "Hoàn thành" || t.status === "AWAITING_CONFIRMATION") return false;
                if (effectiveUser.role === "Staff" && t.status === "PENDING_APPROVAL") return false;
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
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
            />

            {effectiveUser.role === "Admin" && (
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <AnimatePresence>
                    {selectedTaskIds.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, x: -20, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.9 }}
                        onClick={handleBulkDelete}
                        className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 border-b-4 border-red-800"
                      >
                         <Trash2 size={16} strokeWidth={2.5} />
                         Xóa {selectedTaskIds.length} mục đã chọn
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
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
        <motion.div key="pending_confirmation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
          <HolidayBanner />
          <div className="sticky top-0 z-50">
            <Header title={<span translate="no" className="notranslate">ĐỀ XUẤT MỚI</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          </div>
          <div className="p-6 overflow-y-auto min-h-0 flex-1">
            <PendingConfirmationPage
              tasks={tasks} currentUser={effectiveUser} allUsers={allUsers} updateTask={updateTask} deleteTask={deleteTask}
              setShowHistoryModal={setShowHistoryModal} setShowChatModal={setShowChatModal} showChatModal={showChatModal}
              addTaskComment={addTaskComment} updateTaskCommentReactions={updateTaskCommentReactions}
              setEditingTask={setEditingTask} setConfirmModal={setConfirmModal}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "completed_tasks" && (
        <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col h-full">
          <HolidayBanner />
          <div className="sticky top-0 z-50">
            <Header title={<span translate="no" className="notranslate">CÔNG VIỆC HOÀN THÀNH</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          </div>
          <div className="p-6 space-y-6 overflow-y-auto min-h-0 flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewScope("mine")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "mine" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserIcon size={14} />
                  Cá nhân ({tasks.filter(t => (t.status === "COMPLETED" || t.status === "Hoàn thành") && isUserTask(t, effectiveUser)).length})
                </button>
                <button
                  onClick={() => setViewScope("all")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "all" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UsersIcon size={14} />
                  Phòng QLCL ({tasks.filter(t => t.status === "COMPLETED" || t.status === "Hoàn thành").length})
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-green-700 font-black uppercase tracking-widest">
                  Đang xem: {viewScope === "mine" ? "Lịch sử cá nhân" : "Lịch sử toàn phòng"}
                </span>
              </div>
            </div>
            <StatsSummary tasks={filteredTasks} />
            <TaskList
              tasks={sortedTasks.filter((t) => t.status === "COMPLETED")} user={effectiveUser} users={allUsers}
              onUpdate={updateTask} onDelete={deleteTask} onViewHistory={(id) => setShowHistoryModal(id)}
              onOpenChat={(id) => setShowChatModal(id)} showChatModal={showChatModal} onSendMessage={addTaskComment}
              onReact={updateTaskCommentReactions} onEdit={setEditingTask} setConfirmModal={setConfirmModal}
              type="completed" highlightedTaskId={highlightedTaskId}
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
          className="h-full flex flex-col overflow-hidden"
        >
          <HolidayBanner />
          <GroupChatPage
            currentUser={effectiveUser} users={allUsers} topics={discussionTopics} messages={discussionMessages}
            onSendMessage={(topicId, content, attachments) => sendDiscussionMessage(topicId, content, effectiveUser.uniqueKey, attachments)}
            onReact={(msgId, emoji) => {
              const msg = discussionMessages.find((m) => m.id === msgId);
              if (!msg) return;
              const reactions = [...(msg.reactions || [])];
              const idx = reactions.findIndex(r => (r.userId === effectiveUser.id || r.userId === effectiveUser.uniqueKey) && r.emoji === emoji);
              if (idx > -1) reactions.splice(idx, 1);
              else reactions.push({ userId: effectiveUser.uniqueKey, emoji });
              updateDiscussionMessageReactions(msgId, reactions);
            }}
            onCreateTopic={(title, desc, orderCode) => createTopic({
              title, description: desc, createdBy: effectiveUser.uniqueKey, creatorAvatar: effectiveUser.avatar, status: "OPEN", orderCode,
            })}
            onUpdateTopic={updateTopic} onDeleteTopic={deleteTopic} onDeleteTopicsBulk={deleteTopicsBulk} onDeleteMessage={deleteDiscussionMessage}
            presence={presence.map(p => p.id)}
          />
        </motion.div>
      )}

      {activeTab === "profile" && (
        <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <Header title={<span translate="no" className="notranslate">TRANG CÁ NHÂN</span>} badge={effectiveUser.code} onlineUsers={presence} currentUserId={effectiveUser.id} />
          <div className="p-6">
            <ProfilePage currentUser={effectiveUser} tasks={tasks} users={allUsers} onUpdateProfile={(uniqueKey, updates) => updateProfile(uniqueKey, updates)} />
          </div>
        </motion.div>
      )}

      {activeTab === "reports" && (
        <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <Header title={<span translate="no" className="notranslate">BÁO CÁO THÁNG</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          <div className="p-6">
            <ReportPage
              tasks={tasks} users={allUsers} onUpdateTask={updateTask} currentUser={effectiveUser!}
              officialReports={officialReports} onSaveDraft={firebaseSaveReportDraft} onSaveOfficialReport={firebaseSaveOfficialReport}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "trash" && effectiveUser?.role === "Admin" && (
        <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <Header title="TRUNG TÂM XÓA (THÙNG RÁC)" onlineUsers={presence} currentUserId={effectiveUser.id} />
          <div className="p-6 space-y-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><Trash2 size={20} /></div>
              <div>
                <h4 className="text-sm font-black text-red-800 uppercase">Lưu ý bảo mật</h4>
                <p className="text-[10px] text-red-600 font-bold uppercase">Các công việc ở đây có thể được KHÔI PHỤC hoặc XÓA VĨNH VIỄN bởi Quản trị viên.</p>
              </div>
            </div>
            <TaskList
              tasks={sortedTasks} user={effectiveUser} users={allUsers} onUpdate={updateTask} onDelete={permanentDeleteTask}
              onViewHistory={(id) => setShowHistoryModal(id)} onOpenChat={(id) => setShowChatModal(id)}
              showChatModal={showChatModal} onSendMessage={addTaskComment} onReact={updateTaskCommentReactions}
              onEdit={setEditingTask} setConfirmModal={setConfirmModal} type="trash" onRestore={restoreTask} highlightedTaskId={highlightedTaskId}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "staff_list" && (effectiveUser?.role === "Admin") && (
        <motion.div key="staff_list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <Header title={<span translate="no" className="notranslate">QUẢN LÝ NHÂN SỰ</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          <div className="p-8">
            <StaffListPage
              onNavigate={setActiveTab} onOpenDirectChat={setShowDirectChat}
              unreadCount={(Object.values(unreadCounts) as number[]).reduce((a, b) => a + b, 0) + (groupUnreadCount as number)}
              users={allUsers} currentUser={effectiveUser} originalUser={currentUser} onSimulateStaff={setSimulatedUser}
              onSendToUser={async (msg, targetId, attachments) => {
                await firebaseSendPrivateMsg(msg, effectiveUser.id, targetId, attachments);
              }}
              onSendToGroup={async (msg, attachments) => {
                const topic = discussionTopics.find(t => t.status === 'OPEN');
                if (topic) await sendDiscussionMessage(topic.id, msg, effectiveUser.id, attachments);
                else {
                  // Fallback: Nếu không có chủ đề thảo luận nào, gửi vào chat tổng của công việc bất kỳ (nếu cần) hoặc thông báo
                  console.warn("No open discussion topic found to send message to group.");
                }
              }}
              onAddStaff={(user) => updateProfile(user.uniqueKey, user)}
              onUpdateStaff={(userId, updates) => {
                const staff = allUsers.find(u => u.id === userId || u.uniqueKey === userId);
                if (staff) updateProfile(staff.uniqueKey, updates);
                else updateProfile(userId, updates); // Fallback to using userId as uniqueKey
              }}
              onDeleteStaff={(userId) => {
                const staff = allUsers.find(u => u.id === userId);
                if (staff) deleteProfile(staff.uniqueKey);
              }}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "system_history" && effectiveUser?.role === "Admin" && (
        <motion.div key="system_history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <Header title={<span translate="no" className="notranslate">LỊCH SỬ HỆ THỐNG</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          <div className="p-6">
            <SystemHistoryPage 
              logs={logs} 
              allUsers={allUsers} 
              currentUser={effectiveUser!} 
              tasks={tasks}
              onResetSystem={() => resetSystem(effectiveUser.name)}
              onDeleteLogsBulk={deleteLogsBulk}
              setConfirmModal={setConfirmModal}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
