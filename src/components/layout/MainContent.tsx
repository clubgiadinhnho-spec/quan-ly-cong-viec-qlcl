import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, User as UserIcon, Users as UsersIcon, FileUp, FileDown, Lock, Trash2 } from 'lucide-react';
import { User, Task, LogEntry, OfficialReport, DiscussionTopic, DiscussionMessage } from '../../types';
import { Header } from './Header';
import { HolidayBanner } from './HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { NewProposalsPage } from '../../pages/NewProposalsPage';
import { GroupChatPage } from '../../pages/GroupChatPage';
import { ProfilePage } from '../../pages/ProfilePage';
import { ReportPage } from '../../pages/ReportPage';
import { StaffListPage } from '../../pages/StaffListPage';
import { SystemHistoryPage } from '../../pages/SystemHistoryPage';
import { CategoryManagement } from '../tasks/CategoryManagement';
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
  approveTaskCompletion?: (id: string, modifierName?: string) => Promise<void>;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  highlightedTaskId: string | null;
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
  approveTasksBulk: any;
  logs: LogEntry[];
  resetSystem: () => Promise<void>;
  deleteLogsBulk: (logIds: string[]) => Promise<boolean>;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  createNotification: any;
}

export const MainContent: React.FC<MainContentProps> = (props) => {
  const {
    activeTab, effectiveUser, currentUser, presence, allUsers, tasks, filteredTasks, sortedTasks,
    viewScope, setViewScope, search, setSearch, myActiveCount, allActiveCount, setShowTaskModal,
    handleExportExcel, handleImportExcel, updateTask, deleteTask, approveTaskCompletion, setShowHistoryModal, setShowChatModal,
    showChatModal, addTaskComment, updateTaskCommentReactions, setEditingTask, setConfirmModal,
    highlightedTaskId, discussionTopics, discussionMessages, sendDiscussionMessage,
    updateDiscussionMessageReactions, createTopic, updateTopic, deleteTopic, deleteTopicsBulk, deleteDiscussionMessage,
    updateProfile, officialReports, firebaseSaveReportDraft, firebaseSaveOfficialReport,
    permanentDeleteTask, restoreTask, setActiveTab, setShowDirectChat, unreadCounts, groupUnreadCount,
    setSimulatedUser, firebaseSendPrivateMsg, deleteProfile, deleteTasksBulk, trashTasksBulk, approveTasksBulk, logs, resetSystem,
    deleteLogsBulk, markAsRead, lastReadChatTimestamps,
    adminUnreadCount, onOpenNotifications, createNotification
  } = props;

  const [selectedTaskIds, setSelectedTaskIds] = React.useState<string[]>([]);

  // Clear selection when changing tabs to prevent stale data
  React.useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTab]);

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const setBulkSelection = (ids: string[], select: boolean) => {
    if (select) {
      setSelectedTaskIds(prev => {
        const newIds = [...prev];
        ids.forEach(id => {
          if (!newIds.includes(id)) newIds.push(id);
        });
        return newIds;
      });
    } else {
      setSelectedTaskIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  // Helper to map UI IDs to real Firestore Document IDs
  // This is crucial for virtual items in completed_tasks tab
  const getRealDocIds = (ids: string[]) => {
    const realIds = ids.map(id => {
      if (id.includes('_cycle_')) {
        return id.split('_cycle_')[0];
      }
      return id;
    });
    // Return unique IDs (Set) converted back to array
    return Array.from(new Set(realIds));
  };

  const handleBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    const realIds = getRealDocIds(selectedTaskIds);
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">XÁC NHẬN XÓA NHIỀU</span>,
      message: (
        <span translate="no" className="notranslate">
          Bạn đang chọn XÓA {realIds.length} công việc. Hành động này sẽ chuyển các công việc vào THÙNG RÁC. Bạn có chắc chắn không?
        </span>
      ),
      onConfirm: async () => {
        try {
          // Use the optimized batch function with real document IDs
          await trashTasksBulk(realIds, effectiveUser.name);
          
          setSelectedTaskIds([]);
        } catch (error) {
          alert("Có lỗi xảy ra khi xóa.");
        } finally {
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      }
    });
  };

  const handlePermanentBulkDelete = () => {
    if (selectedTaskIds.length === 0) return;
    const realIds = getRealDocIds(selectedTaskIds);
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">XÁC NHẬN XÓA VĨNH VIỄN NHIỀU</span>,
      message: (
        <span translate="no" className="notranslate">
          Bạn đang chọn XÓA VĨNH VIỄN {realIds.length} công việc. Hành động này KHÔNG THỂ HOÀN TÁC. Bạn có chắc chắn không?
        </span>
      ),
      onConfirm: async () => {
        try {
          await deleteTasksBulk(realIds, effectiveUser.name);
          setSelectedTaskIds([]);
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
      {activeTab === "pending_confirmation" && (
        <motion.div key="pending_confirmation" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col">
          <HolidayBanner />
          <div className="z-40">
            <Header 
              title={<span translate="no" className="notranslate">ĐỀ XUẤT MỚI</span>} 
              onAction={() => setShowTaskModal(true)}
              actionLabel={<span translate="no" className="notranslate">NHẬP CÔNG VIỆC MỚI</span>}
              actionIcon={Plus}
              onlineUsers={presence} 
              currentUserId={effectiveUser.id}
              adminUnreadCount={adminUnreadCount}
              onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
            />
          </div>
          <div className="p-6">
            {/* Đề xuất mới: Xóa hàng loạt */}
            {activeTab === "pending_confirmation" && effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 mb-4 px-1"
              >
                 <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-b-4 border-red-800"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">XÓA {selectedTaskIds.length} ĐỀ XUẤT</span>
                </button>
              </motion.div>
            )}

            <NewProposalsPage
              tasks={tasks} currentUser={effectiveUser} allUsers={allUsers} updateTask={updateTask} deleteTask={deleteTask}
              setShowHistoryModal={setShowHistoryModal} setShowChatModal={setShowChatModal} showChatModal={showChatModal}
              addTaskComment={addTaskComment} updateTaskCommentReactions={updateTaskCommentReactions}
              setEditingTask={setEditingTask} setConfirmModal={setConfirmModal}
              createNotification={createNotification}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onBulkSelect={setBulkSelection}
              approveTasksBulk={approveTasksBulk}
              onBulkDelete={handleBulkDelete}
              onOpenCategoryManagement={() => setActiveTab('category_management')}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "tasks" && (
        <motion.div
          key="tasks"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col"
        >
          <HolidayBanner />
          <div className="z-40">
            <Header
              title={<span translate="no" className="notranslate">BẢNG CÔNG VIỆC</span>}
              badge={<span translate="no" className="notranslate">{effectiveUser.role}</span>}
              onAction={() => setShowTaskModal(true)}
              actionLabel={<span translate="no" className="notranslate">NHẬP CÔNG VIỆC MỚI</span>}
              actionIcon={Plus}
              onlineUsers={presence}
              currentUserId={effectiveUser.id}
              adminUnreadCount={adminUnreadCount}
              onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
            />
          </div>

          <div className="p-6 space-y-6">
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
                  <span translate="no" className="notranslate">Cá nhân ({myActiveCount})</span>
                </button>
                <button
                  onClick={() => setViewScope("all")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UsersIcon size={14} />
                  <span translate="no" className="notranslate">Phòng QLCL ({allActiveCount})</span>
                </button>
              </div>
              
              {/* Vị trí mới cho nút Bulk Delete - Ngang hàng với bộ lọc để tiết kiệm diện tích */}
              {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-b-4 border-red-800"
                  >
                    <Trash2 size={16} strokeWidth={2.5} />
                    <span translate="no" className="notranslate">XÓA ({selectedTaskIds.length})</span>
                  </button>
                </div>
              )}

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
                      <span translate="no" className="notranslate">File Mẫu</span>
                    </button>
                    {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
                      <button
                        onClick={handleExportExcel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                      >
                        <FileDown size={12} />
                        <span translate="no" className="notranslate">Xuất Excel</span>
                      </button>
                    )}
                    {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canImportExcel) && (
                      <button
                        onClick={() => {}} // Placeholder or real handler
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase cursor-pointer"
                      >
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <FileUp size={12} />
                          <span translate="no" className="notranslate">Nhập từ Excel</span>
                          <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                        </label>
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-xs w-64 placeholder:notranslate"
                  />
                </div>
              </div>
            </div>

            {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center px-1 mb-4"
              >
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-b-4 border-red-800"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">XÓA {selectedTaskIds.length} MỤC ĐÃ CHỌN</span>
                </button>
              </motion.div>
            )}

            <TaskList
              tasks={sortedTasks.filter((t) => {
                // YÊU CẦU BẮT BUỘC: Bảng chính chỉ hiển thị trạng thái APPROVED
                return t.status === "APPROVED";
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
              onNavigate={setActiveTab}
              type="active"
              isReadOnly={false}
              highlightedTaskId={highlightedTaskId}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onBulkSelect={setBulkSelection}
              createNotification={createNotification}
            />

          </div>
        </motion.div>
      )}

      {activeTab === "pending_approval" && (
        <motion.div key="pending_approval" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col">
          <HolidayBanner />
          <div className="z-40">
            <Header 
              title={<span translate="no" className="notranslate">TRÌNH DUYỆT HOÀN THÀNH</span>} 
              onAction={() => setShowTaskModal(true)}
              actionLabel={<span translate="no" className="notranslate">NHẬP CÔNG VIỆC MỚI</span>}
              actionIcon={Plus}
              onlineUsers={presence} 
              currentUserId={effectiveUser.id}
              adminUnreadCount={adminUnreadCount}
              onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
            />
          </div>
          <div className="p-6 space-y-6">
             <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center"><Lock size={20} /></div>
              <div>
                <h4 className="text-sm font-black text-amber-800 uppercase">
                  <span translate="no" className="notranslate">Danh sách chờ duyệt</span>
                </h4>
                <p className="text-[10px] text-amber-600 font-bold uppercase">
                  <span translate="no" className="notranslate">Sau khi được duyệt, công việc sẽ tự động chuyển sang mục HOÀN THÀNH.</span>
                </p>
              </div>
            </div>
            
            {/* Trình duyệt: Xóa hàng loạt */}
            {activeTab === "pending_approval" && effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <div className="flex items-center gap-2 mb-4 px-1">
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-b-4 border-red-800"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">Xóa {selectedTaskIds.length} mục đã chọn</span>
                </button>
              </div>
            )}

            <TaskList
              tasks={sortedTasks.filter(t => t.waitingApproval)}
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
              approveTaskCompletion={approveTaskCompletion}
              onNavigate={setActiveTab}
              type="active"
              isReadOnly={false}
              highlightedTaskId={highlightedTaskId}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onBulkSelect={setBulkSelection}
              createNotification={createNotification}
            />
          </div>
        </motion.div>
      )}

      {activeTab === "completed_tasks" && (
        <motion.div key="completed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col">
          <HolidayBanner />
          <div className="z-40">
            <Header 
              title={<span translate="no" className="notranslate">CÔNG VIỆC HOÀN THÀNH</span>} 
              onAction={() => setShowTaskModal(true)}
              actionLabel={<span translate="no" className="notranslate">NHẬP CÔNG VIỆC MỚI</span>}
              actionIcon={Plus}
              onlineUsers={presence} 
              currentUserId={effectiveUser.id}
              adminUnreadCount={adminUnreadCount}
              onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
            />
          </div>
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                <button
                  onClick={() => setViewScope("mine")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "mine" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UserIcon size={14} />
                  <span translate="no" className="notranslate">Cá nhân ({tasks.filter(t => ((t.status === "COMPLETED" || t.status === "Hoàn thành") || (t.cycleHistory && t.cycleHistory.length > 0)) && isUserTask(t, effectiveUser)).length})</span>
                </button>
                <button
                  onClick={() => setViewScope("all")}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                    viewScope === "all" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <UsersIcon size={14} />
                  <span translate="no" className="notranslate">Phòng QLCL ({tasks.filter(t => (t.status === "COMPLETED" || t.status === "Hoàn thành") || (t.cycleHistory && t.cycleHistory.length > 0)).length})</span>
                </button>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span translate="no" className="notranslate text-[10px] text-green-700 font-black uppercase tracking-widest">
                  Đang xem: {viewScope === "mine" ? "Lịch sử cá nhân" : "Lịch sử toàn phòng"}
                </span>
              </div>
            </div>
            <StatsSummary tasks={filteredTasks} />
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 px-1">
                <div className="w-1.5 h-6 bg-green-600 rounded-full" />
                <span translate="no" className="notranslate">KẾT QUẢ CÔNG VIỆC HOÀN THÀNH</span>
              </h3>
            </div>
            {/* Hoàn thành: Xóa hàng loạt & Xóa vĩnh viễn */}
            {activeTab === "completed_tasks" && effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 px-1 mb-4"
              >
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95 border-b-4 border-red-800"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">CHUYỂN VÀO THÙNG RÁC ({selectedTaskIds.length})</span>
                </button>
                <button
                  onClick={handlePermanentBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg active:scale-95 border-b-4 border-black/30"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">XÓA CƯỠNG BỨC ({selectedTaskIds.length})</span>
                </button>
              </motion.div>
            )}

            <TaskList
              tasks={(() => {
                const directCompleted = tasks.filter(t => (t.status === "COMPLETED" || t.status === "Hoàn thành") && !t.deletedAt);
                const cycleItems: any[] = [];
                tasks.forEach(t => {
                  if (t.cycleHistory && t.cycleHistory.length > 0) {
                    t.cycleHistory.forEach(entry => {
                      cycleItems.push({
                         ...t,
                         id: `${t.id}_cycle_${entry.version}`,
                         code: entry.code || `${t.code}-K${entry.version}`,
                         originalTaskId: t.id,
                         actualEndDate: entry.completedAt,
                         currentUpdate: entry.reportContent,
                         objective: entry.objective || t.objective,
                         version: entry.version,
                         isCycleRecord: true
                      });
                    });
                  }
                });
                
                let combined = [...directCompleted, ...cycleItems];
                
                // Deduplicate bằng Fingerprint (Mã + Ngày + Nội dung) để loại bỏ hoàn toàn các bản ghi trùng lặp hình ảnh
                const uniqueMap = new Map();
                combined.forEach(item => {
                  if (!item.id || !item.code) return;
                  
                  // Chỉ lấy 10 ký tự đầu của ngày (YYYY-MM-DD) để đảm bảo so sánh chính xác giữa ISO string và date string
                  const rawDate = item.actualEndDate || '';
                  const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
                  
                  // Trim nội dung để tránh sai lệch do khoảng trắng
                  const contentStr = (item.currentUpdate || '').trim();
                  
                  // Tạo dấu vân tay duy nhất dựa trên nội dung thực tế hiển thị
                  const fingerprint = `${item.code}_${dateStr}_${contentStr}`;
                  
                  if (!uniqueMap.has(fingerprint)) {
                    uniqueMap.set(fingerprint, item);
                  } else {
                    // Nếu đã tồn tại vân tay này (trùng lặp hiển thị):
                    // Ưu tiên giữ bản ghi có isCycleRecord vì nó chứa thông tin phiên bản lịch sử chính xác hơn
                    const existing = uniqueMap.get(fingerprint);
                    if (item.isCycleRecord && !existing.isCycleRecord) {
                      uniqueMap.set(fingerprint, item);
                    }
                  }
                });
                combined = Array.from(uniqueMap.values());

                if (viewScope === 'mine') {
                  combined = combined.filter(t => isUserTask(t, effectiveUser));
                }
                return combined.sort((a, b) => new Date(b.actualEndDate || 0).getTime() - new Date(a.actualEndDate || 0).getTime());
              })()} 
              user={effectiveUser} users={allUsers}
              onUpdate={updateTask} onDelete={deleteTask} onViewHistory={(id) => setShowHistoryModal(id.split('_cycle_')[0])}
              onOpenChat={(id) => setShowChatModal(id.split('_cycle_')[0])} showChatModal={showChatModal} onSendMessage={addTaskComment}
              onReact={updateTaskCommentReactions} onEdit={setEditingTask} setConfirmModal={setConfirmModal}
              type="completed" highlightedTaskId={highlightedTaskId}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onBulkSelect={setBulkSelection}
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
            markAsRead={markAsRead}
            lastReadChatTimestamps={lastReadChatTimestamps}
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

      {activeTab === "category_management" && effectiveUser?.role === "Admin" && (
        <motion.div key="category_management" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
          <CategoryManagement tasks={tasks} />
        </motion.div>
      )}

      {activeTab === "trash" && (effectiveUser?.role === "Admin" || effectiveUser?.role === "Staff") && (
        <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <HolidayBanner />
          <div className="z-40">
            <Header title={<span translate="no" className="notranslate">TRUNG TÂM XÓA (THÙNG RÁC)</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
          </div>
          <div className="p-6 space-y-6">
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 text-red-600 rounded-full flex items-center justify-center"><Trash2 size={20} /></div>
              <div>
                <h4 className="text-sm font-black text-red-800 uppercase">
                  <span translate="no" className="notranslate">Lưu ý bảo mật</span>
                </h4>
                <p className="text-[10px] text-red-600 font-bold uppercase">
                  <span translate="no" className="notranslate">{effectiveUser.role === 'Admin' ? 'Các công việc ở đây có thể được KHÔI PHỤC hoặc XÓA VĨNH VIỄN bởi Quản trị viên.' : 'Các nhiệm vụ đã bị xóa đang nằm trong thùng rác này.'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-red-800 uppercase">
                <span translate="no" className="notranslate">Danh sách lưu trữ</span>
              </h4>
            </div>
            {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center px-1 mb-4"
              >
                <button
                  onClick={handlePermanentBulkDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-b-4 border-red-800"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                  <span translate="no" className="notranslate">XÓA VĨNH VIỄN {selectedTaskIds.length} MỤC</span>
                </button>
              </motion.div>
            )}
            <TaskList
              tasks={sortedTasks} user={effectiveUser} users={allUsers} onUpdate={updateTask} onDelete={permanentDeleteTask}
              onViewHistory={(id) => setShowHistoryModal(id)} onOpenChat={(id) => setShowChatModal(id)}
              showChatModal={showChatModal} onSendMessage={addTaskComment} onReact={updateTaskCommentReactions}
              onEdit={setEditingTask} setConfirmModal={setConfirmModal} type="trash" onRestore={restoreTask} highlightedTaskId={highlightedTaskId}
              selectedIds={selectedTaskIds}
              onToggleSelect={toggleTaskSelection}
              onBulkSelect={setBulkSelection}
              isReadOnly={effectiveUser.role !== 'Admin'}
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
