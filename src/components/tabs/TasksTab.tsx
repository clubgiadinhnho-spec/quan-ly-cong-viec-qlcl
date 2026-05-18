import React from 'react';
import { motion } from 'motion/react';
import { Plus, User as UserIcon, Users as UsersIcon, FileDown, FileUp, Search, Trash2 } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { downloadSampleExcel } from '../../utils/excelUtils';

import { useAuthContext } from '../../contexts/AuthContext';
import { useTaskContext } from '../../contexts/TaskContext';

interface TasksTabProps {
  // Most props are now handled via context
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  selectedTaskIds,
  handleBulkDelete,
  toggleTaskSelection,
  setBulkSelection
}) => {
  const { effectiveUser, allUsers } = useAuthContext();
  const {
    presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
    sortedTasks, search, setSearch, viewScope, setViewScope, counts,
    handleExportExcel, handleImportExcel, updateTask, deleteTask,
    setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
    updateTaskCommentReactions, setEditingTask, setConfirmModal,
    approveTaskCompletion, setActiveTab, highlightedTaskId,
    createNotification, markAsRead, lastReadChatTimestamps,
    selectedMonth, onMonthChange, tasks,
    sendAiMessage, triggerAiNudge, resetTaskAIStatus, aiMessages
  } = useTaskContext();

  const myActiveCount = counts.mine;
  const allActiveCount = counts.allActive;

  return (
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

      <div className="p-4 space-y-4">
        <StatsSummary 
          tasks={tasks} 
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
        />

        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewScope("mine")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewScope === "mine" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserIcon size={14} />
              <span translate="no" className="notranslate">Cá nhân (<span translate="no" className="notranslate">{myActiveCount}</span>)</span>
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewScope === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UsersIcon size={14} />
              <span translate="no" className="notranslate">Phòng QLCL (<span translate="no" className="notranslate">{allActiveCount}</span>)</span>
            </button>
          </div>
          
          {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-2 border-red-500"
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
              <span translate="no" className="notranslate uppercase tracking-tighter">DANH SÁCH BẢNG CÔNG VIỆC</span>
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
                    onClick={() => handleExportExcel(sortedTasks)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase"
                  >
                    <FileDown size={12} />
                    <span translate="no" className="notranslate">Xuất Excel</span>
                  </button>
                )}
                {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canImportExcel) && (
                  <label 
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase cursor-pointer shadow-sm active:scale-95"
                  >
                    <FileUp size={12} />
                    <span translate="no" className="notranslate">Nhập từ Excel</span>
                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                  </label>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {search && (
              <span translate="no" className="notranslate text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 animate-in fade-in slide-in-from-right-1">
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
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-xs w-72 placeholder:notranslate transition-all group-focus-within:border-blue-400 group-focus-within:shadow-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        <TaskList
          tasks={sortedTasks}
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
          sendAiMessage={sendAiMessage}
          triggerAiNudge={triggerAiNudge}
          resetTaskAIStatus={resetTaskAIStatus}
          aiMessages={aiMessages}
          onNavigate={setActiveTab}
          type="active"
          isReadOnly={false}
          highlightedTaskId={highlightedTaskId}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onBulkSelect={setBulkSelection}
          createNotification={createNotification}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
          presence={presence}
        />
      </div>
    </motion.div>
  );
};
