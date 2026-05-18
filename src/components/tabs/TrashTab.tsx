import React from 'react';
import { motion } from 'motion/react';
import { Trash2, FileDown, Search } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { TaskList } from '../tasks/TaskList';

interface TrashTabProps {
  effectiveUser: User;
  presence: any[];
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  selectedTaskIds: string[];
  handlePermanentBulkDelete: () => void;
  sortedTasks: Task[];
  handleExportExcel: (tasks: Task[]) => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allUsers: User[];
  updateTask: any;
  permanentDeleteTask: any;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  restoreTask: any;
  highlightedTaskId: string | null;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
}

export const TrashTab: React.FC<TrashTabProps> = ({
  effectiveUser, presence, adminUnreadCount, onOpenNotifications,
  selectedTaskIds, handlePermanentBulkDelete, sortedTasks, handleExportExcel, handleImportExcel, allUsers,
  updateTask, permanentDeleteTask, setShowHistoryModal, setShowChatModal,
  showChatModal, addTaskComment, updateTaskCommentReactions, setEditingTask,
  setConfirmModal, restoreTask, highlightedTaskId, toggleTaskSelection, setBulkSelection,
  search, setSearch, markAsRead, lastReadChatTimestamps
}) => {
  return (
    <motion.div key="trash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <HolidayBanner />
      <div className="z-40">
        <Header title={<span translate="no" className="notranslate">TRUNG TÂM XÓA (THÙNG RÁC)</span>} onlineUsers={presence} currentUserId={effectiveUser.id} />
      </div>
      <div className="p-4 space-y-4">
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
          
          <div className="ml-auto" />
        </div>
        <div className="flex items-center justify-between mb-4 mt-6">
          <h4 className="text-sm font-black text-red-800 uppercase flex items-center gap-2">
            <div className="w-1.5 h-6 bg-red-600 rounded-full" />
            <span translate="no" className="notranslate">Danh sách lưu trữ</span>
          </h4>
          <div className="flex items-center gap-3">
            {search && (
              <span translate="no" className="notranslate text-[11px] font-bold text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-100 animate-in fade-in slide-in-from-right-1">
                TÌM THẤY: {sortedTasks.length}
              </span>
            )}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm kiếm mã, nội dung, nhân sự, ngày khởi tạo, ngày bắt đầu, hạn hoàn thành, Gia hạn, chu kỳ lặp lại..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-red-500 text-xs w-72 placeholder:notranslate transition-all group-focus-within:border-red-400 group-focus-within:shadow-sm shadow-sm"
              />
            </div>
            {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all uppercase shadow-sm cursor-pointer shadow-blue-200">
                  <FileDown size={12} className="rotate-180" />
                  <span translate="no" className="notranslate">Nhập Excel</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                </label>
                <button
                  onClick={() => handleExportExcel(sortedTasks)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-700 border border-red-200 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-all uppercase shadow-sm"
                >
                  <FileDown size={12} />
                  <span translate="no" className="notranslate">Xuất Excel</span>
                </button>
              </div>
            )}
          </div>
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
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
          presence={presence}
        />
      </div>
    </motion.div>
  );
};
