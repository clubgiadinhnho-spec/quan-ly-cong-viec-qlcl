import React from 'react';
import { motion } from 'motion/react';
import { Plus, User as UserIcon, Users as UsersIcon, Trash2, FileDown, Search } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { isUserTask, normalizeString, getTaskAssigneeName } from '../../utils/userUtils';

interface CompletedTasksTabProps {
  effectiveUser: User;
  presence: any[];
  setShowTaskModal: (show: boolean) => void;
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  viewScope: 'mine' | 'all';
  setViewScope: (scope: 'mine' | 'all') => void;
  tasks: Task[];
  filteredTasks: Task[];
  handleExportExcel: (tasks: Task[]) => void;
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  handlePermanentBulkDelete: () => void;
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
  highlightedTaskId: string | null;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
}

export const CompletedTasksTab: React.FC<CompletedTasksTabProps> = ({
  effectiveUser, presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
  viewScope, setViewScope, tasks, filteredTasks, handleExportExcel, selectedTaskIds,
  handleBulkDelete, handlePermanentBulkDelete, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
  updateTaskCommentReactions, setEditingTask, setConfirmModal, approveTaskCompletion,
  highlightedTaskId, toggleTaskSelection, setBulkSelection,
  search, setSearch
}) => {
  const getTasksToDisplay = () => {
    const directCompleted = tasks.filter(t => (t.status === "COMPLETED" || t.status === "Hoàn thành") && !t.deletedAt);
    const cycleItems: any[] = [];
    tasks.forEach(t => {
      if (t.cycleHistory && t.cycleHistory.length > 0) {
        t.cycleHistory.forEach(entry => {
          cycleItems.push({
             ...t,
             id: `${t.id}_cycle_${entry.version}`,
             code: entry.code || t.code,
             originalTaskId: t.id,
             actualEndDate: entry.completedAt,
             currentUpdate: entry.reportContent,
             objective: entry.objective || t.objective,
             version: entry.version,
             isCycleRecord: true,
             kpiEfficiency: entry.kpiResult // Ensure kpiEfficiency is available for search
          });
        });
      }
    });
    
    let combined = [...directCompleted, ...cycleItems];
    
    // Deduplicate
    const uniqueMap = new Map();
    combined.forEach(item => {
      if (!item.id || !item.code) return;
      
      const rawDate = item.actualEndDate || '';
      const dateStr = rawDate.includes('T') ? rawDate.split('T')[0] : rawDate.substring(0, 10);
      const contentStr = (item.currentUpdate || '').trim();
      const fingerprint = `${item.code}_${dateStr}_${contentStr}`;
      
      if (!uniqueMap.has(fingerprint)) {
        uniqueMap.set(fingerprint, item);
      } else {
        const existing = uniqueMap.get(fingerprint);
        if (item.isCycleRecord && !existing.isCycleRecord) {
          uniqueMap.set(fingerprint, item);
        }
      }
    });
    combined = Array.from(uniqueMap.values());

    // Search Filtering
    if (search) {
      const term = normalizeString(search);
      combined = combined.filter(t => {
        const assigneeName = getTaskAssigneeName(t, allUsers);
        const searchableFields = [
          t.code,
          assigneeName,
          t.category,
          t.title,
          t.objective,
          t.currentUpdate,
          typeof t.kpiEfficiency === 'number' ? t.kpiEfficiency.toString() : t.kpiEfficiency
        ];
        return searchableFields.some(f => normalizeString(f || '').includes(term));
      });
    }

    if (viewScope === 'mine') {
      combined = combined.filter(t => isUserTask(t, effectiveUser));
    }
    return combined.sort((a, b) => new Date(b.actualEndDate || 0).getTime() - new Date(a.actualEndDate || 0).getTime());
  };

  const tasksToDisplay = getTasksToDisplay();

  return (
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
      <div className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewScope("mine")}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewScope === "mine" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserIcon size={14} />
              <span translate="no" className="notranslate">Cá nhân (<span translate="no" className="notranslate">{tasksToDisplay.filter(t => isUserTask(t, effectiveUser)).length}</span>)</span>
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                viewScope === "all" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UsersIcon size={14} />
              <span translate="no" className="notranslate">Phòng QLCL (<span translate="no" className="notranslate">{tasksToDisplay.length}</span>)</span>
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
        <div className="flex items-center justify-between mb-4 mt-6">
          <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
            <div className="w-1.5 h-6 bg-green-600 rounded-full" />
            <span translate="no" className="notranslate">KẾT QUẢ CÔNG VIỆC HOÀN THÀNH</span>
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm kiếm mã, tên, nội dung, nhân sự..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-xs w-72 placeholder:notranslate transition-all group-focus-within:border-green-400 group-focus-within:shadow-sm shadow-sm"
              />
            </div>
            {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
              <button
                onClick={() => handleExportExcel(tasksToDisplay)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-50 transition-all uppercase shadow-sm"
              >
                <FileDown size={12} />
                <span translate="no" className="notranslate">Xuất Excel</span>
              </button>
            )}
          </div>
        </div>
        {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
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
          tasks={tasksToDisplay} 
          user={effectiveUser} users={allUsers}
          onUpdate={updateTask} onDelete={deleteTask} onViewHistory={(id) => setShowHistoryModal(id.split('_cycle_')[0])}
          onOpenChat={(id) => setShowChatModal(id.split('_cycle_')[0])} showChatModal={showChatModal} onSendMessage={addTaskComment}
          onReact={updateTaskCommentReactions} onEdit={setEditingTask} setConfirmModal={setConfirmModal}
          approveTaskCompletion={approveTaskCompletion}
          type="completed" highlightedTaskId={highlightedTaskId}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onBulkSelect={setBulkSelection}
        />
      </div>
    </motion.div>
  );
};
