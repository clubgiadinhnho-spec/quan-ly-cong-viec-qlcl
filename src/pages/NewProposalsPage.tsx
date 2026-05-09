import React, { useState, useMemo } from 'react';
import { Task, User } from '../types';
import { TaskList } from '../components/tasks/TaskList';
import { Search, Sparkles, CheckCircle2, Trash2 } from 'lucide-react';
import { isUserTask } from '../utils/userUtils';

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
  onBulkDelete
}) => {
  const [search, setSearch] = useState('');
  const isManager = currentUser.role === 'Admin' || !!currentUser.delegatedPermissions?.canApproveTask;

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => !t.deletedAt && t.status === 'PENDING')
      .filter(t => {
        // Staff only see their own pending proposals or tasks assigned to them
        if (!isManager && t.authorId !== currentUser.id && t.authorId !== currentUser.uniqueKey && !isUserTask(t, currentUser)) {
          return false;
        }
        
        const matchesSearch = (t.title || '').toLowerCase().includes(search.toLowerCase()) || 
                            (t.code || '').toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, search, isManager, currentUser]);

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
                : <span translate="no" className="notranslate">Công việc của bạn đang chờ Admin/Leader phê duyệt</span>
              }
            </p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 font-bold" size={14} />
          <input
            type="text"
            placeholder="Tìm mã hoặc tên..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-white border border-emerald-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs w-64 font-bold shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
             <CheckCircle2 size={14} />
             <span translate="no" className="notranslate">DANH SÁCH {pendingTasks.length} ĐỀ XUẤT</span>
           </h3>
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
