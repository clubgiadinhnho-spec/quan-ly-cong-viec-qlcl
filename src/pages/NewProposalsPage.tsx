import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { TaskList } from '../components/tasks/TaskList';
import { Search, Sparkles, CheckCircle2, Trash2, FileDown } from 'lucide-react';
import { normalizeString, getTaskAssigneeName } from '../utils/userUtils';

interface NewProposalsPageProps {
  tasks: Task[];
  currentUser: User;
  allUsers: User[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  createNotification: any;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onBulkSelect?: (ids: string[], select: boolean) => void;
  approveTasksBulk?: (ids: string[], modifierName: string) => Promise<boolean>;
  onBulkDelete?: () => void;
  onOpenCategoryManagement?: () => void;
  handleExportExcel: (tasks: Task[]) => void;
  search: string;
  setSearch: (s: string) => void;
}

export const NewProposalsPage: React.FC<NewProposalsPageProps> = ({
  tasks, currentUser, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal,
  addTaskComment, updateTaskCommentReactions, setEditingTask, setConfirmModal,
  createNotification,
  selectedIds = [],
  onToggleSelect,
  onBulkSelect,
  approveTasksBulk,
  onBulkDelete,
  onOpenCategoryManagement,
  handleExportExcel,
  search,
  setSearch
}) => {
  const isManager = currentUser.role === 'Admin' || !!currentUser.delegatedPermissions?.canApproveTask;
  const isAdmin = currentUser.role === 'Admin';

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.deletedAt && t.status === 'PENDING')
      .filter(t => {
        if (!search) return true;
        const term = normalizeString(search);
        const assigneeName = getTaskAssigneeName(t, allUsers);
        const fields = [
          t.code,
          assigneeName,
          t.category,
          t.title,
          t.objective,
          t.currentUpdate,
          typeof t.kpiEfficiency === 'number' ? t.kpiEfficiency.toString() : t.kpiEfficiency
        ];
        return fields.some(f => normalizeString(f || '').includes(term));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, search, isManager, currentUser, allUsers]);

  const handleBulkApprove = () => {
    if (selectedIds.length === 0 || !approveTasksBulk) return;
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black uppercase">XÁC NHẬN DUYỆT HÀNG LOẠT</span>,
      message: <span translate="no" className="notranslate">{`Bạn đang chọn DUYỆT ${selectedIds.length} mục đề xuất. Bạn có chắc chắn không?`}</span>,
      onConfirm: async () => {
        try {
          await approveTasksBulk(selectedIds, currentUser.name);
          if (onBulkSelect) onBulkSelect(selectedIds, false);
          
          setConfirmModal({
            show: true,
            title: <span translate="no" className="notranslate font-black uppercase">THÀNH CÔNG</span>,
            message: <span translate="no" className="notranslate">Đã phê duyệt {selectedIds.length} đề xuất.</span>,
            onConfirm: async () => {
              setConfirmModal((p: any) => ({ ...p, show: false }));
            }
          });
        } catch (error) {
          alert("Có lỗi xảy ra khi phê duyệt.");
        } finally {
          // Note: We don't close the modal immediately because we show a success modal inside try
        }
      }
    });
  };

  const handleApprove = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">PHÊ DUYỆT CÔNG VIỆC</span>,
      message: <span translate="no" className="notranslate">{`Bạn chắc chắn muốn DUYỆT công việc ${task.code}? Sau khi duyệt, công việc sẽ xuất hiện tại bảng chính.`}</span>,
      onConfirm: async () => {
        await updateTask(taskId, { 
          status: 'APPROVED' as any,
          isNewSoldier: true,
          history: [
            ...(task.history || []),
            {
              version: (task.history?.length || 0) + 1,
              content: <span translate="no" className="notranslate">{`${currentUser.name} đã duyệt công việc.`}</span> as any,
              timestamp: new Date().toISOString(),
              authorId: currentUser.id
            }
          ]
        });
        setConfirmModal((p: any) => ({ ...p, show: false }));
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-emerald-900 uppercase tracking-tight leading-none mb-1">
              <span translate="no" className="notranslate">Trạm chờ duyệt đề xuất</span>
            </h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
              {isManager 
                ? <span translate="no" className="notranslate">Vui lòng kiểm duyệt các nội dung công việc mới</span>
                : <span translate="no" className="notranslate">Danh sách đề xuất đang chờ Admin/Leader phê duyệt</span>
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isAdmin && onOpenCategoryManagement && (
            <button
              onClick={onOpenCategoryManagement}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 border-b-4 border-blue-800"
            >
              <div className="bg-white/20 p-1 rounded-lg">
                <Sparkles size={14} className="text-white" />
              </div>
              <span translate="no" className="notranslate">Mã hóa công việc</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
             <CheckCircle2 size={14} />
             <span translate="no" className="notranslate">DANH SÁCH {pendingTasks.length} ĐỀ XUẤT</span>
           </h3>
           <div className="flex items-center gap-2">
             <div className="relative group mr-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm kiếm mã, tên, nội dung, nhân sự..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs w-64 placeholder:notranslate transition-all group-focus-within:border-emerald-400 group-focus-within:shadow-sm shadow-sm"
              />
            </div>

             {(currentUser.role === "Admin" || currentUser.delegatedPermissions?.canExportExcel) && (
               <button
                 onClick={() => handleExportExcel(pendingTasks)}
                 className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-50 transition-all uppercase shadow-sm"
               >
                 <FileDown size={12} />
                 <span translate="no" className="notranslate">Xuất Excel</span>
               </button>
             )}
             {isManager && selectedIds.length > 0 && (
               <div className="flex items-center gap-2">
                 <button
                   onClick={handleBulkApprove}
                   className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 border-b-4 border-blue-800"
                 >
                   <CheckCircle2 size={16} strokeWidth={2.5} />
                   <span translate="no" className="notranslate">DUYỆT ĐÃ CHỌN ({selectedIds.length})</span>
                 </button>
                 {onBulkDelete && (
                   <button
                     onClick={onBulkDelete}
                     className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 border-b-4 border-red-800"
                   >
                     <Trash2 size={16} strokeWidth={2.5} />
                     <span translate="no" className="notranslate">XÓA ĐÃ CHỌN</span>
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>
        
        <TaskList
          tasks={pendingTasks}
          user={currentUser}
          users={allUsers}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onViewHistory={setShowHistoryModal}
          onOpenChat={setShowChatModal}
          showChatModal={showChatModal}
          onSendMessage={addTaskComment}
          onReact={updateTaskCommentReactions}
          onEdit={setEditingTask}
          setConfirmModal={setConfirmModal}
          type="active"
          isReadOnly={false}
          onApprove={isManager ? handleApprove : undefined}
          createNotification={createNotification}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onBulkSelect={onBulkSelect}
        />
      </div>

      {pendingTasks.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Sparkles size={32} className="opacity-20" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-50">
            <span translate="no" className="notranslate">KHÔNG CÓ ĐỀ XUẤT NÀO ĐANG CHỜ</span>
          </p>
        </div>
      )}
    </div>
  );
};
