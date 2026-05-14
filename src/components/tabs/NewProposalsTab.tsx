import React from 'react';
import { motion } from 'motion/react';
import { Plus, Trash2, Search, FileDown, Sparkles } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { NewProposalsPage } from '../../pages/NewProposalsPage';

interface NewProposalsTabProps {
  effectiveUser: User;
  presence: any[];
  setShowTaskModal: (show: boolean) => void;
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  tasks: Task[];
  handleExportExcel: (tasks: Task[]) => void;
  allUsers: User[];
  updateTask: any;
  deleteTask: any;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  createNotification: any;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
  approveTasksBulk: any;
  setActiveTab: (tab: string) => void;
  search: string;
  setSearch: (s: string) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
}

export const NewProposalsTab: React.FC<NewProposalsTabProps> = ({
  effectiveUser, presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
  selectedTaskIds, handleBulkDelete, tasks, handleExportExcel, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
  updateTaskCommentReactions, setEditingTask, setConfirmModal, createNotification,
  toggleTaskSelection, setBulkSelection, approveTasksBulk, setActiveTab,
  search, setSearch, markAsRead, lastReadChatTimestamps
}) => {
  return (
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
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 px-1"
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
          </div>
        </div>

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
          handleExportExcel={handleExportExcel}
          search={search}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
          presence={presence}
        />
      </div>
    </motion.div>
  );
};
