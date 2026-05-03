import React from 'react';
import { Task, User } from '../types';
import { TaskList } from '../components/tasks/TaskList';
import { ClipboardList, Sparkles, AlertCircle } from 'lucide-react';

interface PendingConfirmationPageProps {
  tasks: Task[];
  currentUser: User;
  allUsers: User[];
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setShowHistoryModal: (id: string) => void;
  setShowChatModal: (id: string) => void;
  showChatModal: string | null;
  addTaskComment: (taskId: string, content: string, attachments: string[]) => void;
  updateTaskCommentReactions: (taskId: string, commentId: string, emoji: string) => void;
  setEditingTask: (task: Task) => void;
  setConfirmModal: (modal: any) => void;
}

export const PendingConfirmationPage = ({
  tasks,
  currentUser,
  allUsers,
  updateTask,
  deleteTask,
  setShowHistoryModal,
  setShowChatModal,
  showChatModal,
  addTaskComment,
  updateTaskCommentReactions,
  setEditingTask,
  setConfirmModal
}: PendingConfirmationPageProps) => {
  const pendingTasks = tasks.filter(t => t.status === 'AWAITING_CONFIRMATION');
  const isManager = currentUser.role === 'Admin' || currentUser.role === 'Leader' || !!currentUser.delegatedPermissions?.canApproveTask;

  // For non-managers, only show their own pending tasks
  const visibleTasks = isManager 
    ? pendingTasks 
    : pendingTasks.filter(t => t.authorId === currentUser.id || t.history[0]?.authorId === currentUser.id);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-xl shadow-sm">
            <ClipboardList size={24} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              ĐỀ XUẤT MỚI
              <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{visibleTasks.length}</span>
            </h1>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
              {isManager ? 'Phê duyệt các công việc do nhân viên khởi tạo' : 'Theo dõi các công việc bạn đã gửi đề xuất'}
            </p>
          </div>
        </div>

        {isManager && visibleTasks.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl animate-pulse">
            <AlertCircle size={16} className="text-amber-500" />
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-tighter">Cần phê duyệt gấp</span>
          </div>
        )}
      </div>

      {visibleTasks.length > 0 ? (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden p-1 shadow-blue-50">
             <TaskList 
                tasks={visibleTasks}
                user={currentUser}
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
              />
          </div>
          
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex items-start gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Sparkles className="text-blue-500" size={20} />
            </div>
            <div className="text-sm text-blue-800 leading-relaxed font-medium">
              <p className="mb-1 font-bold">Lưu ý cho nhân viên:</p>
              Các công việc sau khi bạn nhấn "NHẬP CÔNG VIỆC MỚI" sẽ nằm ở trạng thái <span className="text-blue-600 font-bold uppercase">Chờ xác nhận</span>. 
              Sau khi Quản lý xác nhận, nó mới chính thức được đưa vào danh sách xử lý và xuất hiện tại DANH SÁCH BẢNG CÔNG VIỆC.
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-20 rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
            <ClipboardList size={32} />
          </div>
          <div>
            <h3 className="text-gray-400 font-black uppercase tracking-widest">Không có đề xuất nào</h3>
            <p className="text-xs text-gray-300 font-medium">Tất cả các đề xuất đã được xử lý hoặc chưa có yêu cầu mới.</p>
          </div>
        </div>
      )}
    </div>
  );
};
