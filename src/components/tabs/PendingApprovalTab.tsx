import React from 'react';
import { motion } from 'motion/react';
import { Plus, Lock, Trash2 } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { TaskList } from '../tasks/TaskList';

interface PendingApprovalTabProps {
  effectiveUser: User;
  presence: any[];
  setShowTaskModal: (show: boolean) => void;
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  sortedTasks: Task[];
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
  approveTaskCompletion?: (id: string, modifierName?: string, leaderQCD?: any, stopRecurrence?: boolean) => Promise<void>;
  setActiveTab: (tab: string) => void;
  highlightedTaskId: string | null;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
  createNotification: any;
}

export const PendingApprovalTab: React.FC<PendingApprovalTabProps> = ({
  effectiveUser, presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
  selectedTaskIds, handleBulkDelete, sortedTasks, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
  updateTaskCommentReactions, setEditingTask, setConfirmModal, approveTaskCompletion,
  setActiveTab, highlightedTaskId, toggleTaskSelection, setBulkSelection, createNotification
}) => {
  return (
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
      <div className="p-4 space-y-4">
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
        
        {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
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
  );
};
