import React from 'react';
import { Task, User } from '../../types';
import { TaskRow } from './TaskRow';
import { CompletedTaskRow } from './CompletedTaskRow';

interface TaskListProps {
  tasks: Task[];
  user: User;
  users: User[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  showChatModal: string | null;
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onEdit: (task: Task) => void;
  setConfirmModal: (modal: any) => void;
  type: 'active' | 'completed';
  isReadOnly?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  user, 
  users, 
  onUpdate, 
  onDelete, 
  onViewHistory, 
  onOpenChat, 
  showChatModal,
  onSendMessage,
  onReact,
  onEdit,
  setConfirmModal,
  type,
  isReadOnly = false,
  onRestore
}) => {
  const sortedTasks = [...tasks].sort((a, b) => {
    // 1. Phê duyệt (Dành cho cấp quản lý xác nhận lính mới) - nếu có status AWAITING_CONFIRMATION
    if (a.status === 'AWAITING_CONFIRMATION' && b.status !== 'AWAITING_CONFIRMATION') return -1;
    if (b.status === 'AWAITING_CONFIRMATION' && a.status !== 'AWAITING_CONFIRMATION') return 1;

    // 2. Lính mới xác nhận (Ưu tiên nhảy lên trên cùng của danh sách xử lý)
    if (type === 'active') {
      if (a.isNewSoldier && !b.isNewSoldier) return -1;
      if (b.isNewSoldier && !a.isNewSoldier) return 1;
    }

    // 3. Ưu tiên do người dùng gán (Priority Order)
    if (a.priorityOrder && !b.priorityOrder) return -1;
    if (b.priorityOrder && !a.priorityOrder) return 1;
    if (a.priorityOrder && b.priorityOrder) return a.priorityOrder - b.priorityOrder;

    // 4. Mã công việc (Mới nhất lên trên)
    return b.code.localeCompare(a.code);
  });

  const handleTogglePriority = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.priorityOrder) {
      // Nếu đã có thứ tự, nhấn lại để xóa
      onUpdate(taskId, { priorityOrder: null as any });
    } else {
      // Nếu chưa có, lấy số lớn nhất hiện tại + 1
      const maxOrder = tasks.reduce((max, t) => (t.priorityOrder || 0) > max ? (t.priorityOrder || 0) : max, 0);
      onUpdate(taskId, { priorityOrder: maxOrder + 1 });
    }
  };

  return (
    <div className="overflow-x-auto lg:overflow-x-visible max-h-[780px] ring-1 ring-gray-200 rounded-xl scrollbar-thin scrollbar-thumb-gray-300">
      <table className="w-full min-w-[900px] text-left border-separate border-spacing-0">
        <thead className="bg-[#FAFBFD] sticky top-0 z-20 shadow-sm">
          <tr>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider w-14 text-center border-b border-l border-r border-gray-300 bg-[#FAFBFD]">Mã CV</th>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider w-36 text-center border-b border-r border-gray-300 bg-[#FAFBFD]">Nhân viên</th>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider text-center border-b border-r border-gray-300 bg-[#FAFBFD] min-w-[200px]">Nội dung & Mục tiêu</th>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider w-40 text-center border-b border-r border-gray-300 bg-[#FAFBFD]">Diễn tiến trước đó</th>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider w-44 text-center border-b border-r border-gray-300 bg-[#FAFBFD]">Cập nhật (2 tuần tiếp)</th>
            <th className="p-2 text-[10px] font-black text-gray-700 uppercase tracking-wider w-10 text-center border-b border-r border-gray-300 bg-[#FAFBFD]">Ưu tiến</th>
            {!isReadOnly && <th className="py-2 px-1 text-[10px] font-black text-gray-700 uppercase tracking-wider w-[64px] text-center border-b border-r border-gray-300 bg-[#FAFBFD]">Thao tác</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {sortedTasks.map((task, idx) => (
            type === 'trash' ? (
              <TaskRow 
                key={task.id} 
                task={task} 
                user={user} 
                users={users} 
                idx={idx}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                isReadOnly={isReadOnly}
                onRestore={onRestore}
              />
            ) : type === 'active' ? (
              <TaskRow 
                key={task.id} 
                task={task} 
                user={user} 
                users={users} 
                idx={idx}
                onUpdate={onUpdate}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                isReadOnly={isReadOnly}
              />
            ) : (
              <CompletedTaskRow 
                key={task.id}
                task={task}
                user={user}
                users={users}
                idx={idx}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onUndo={(id) => onUpdate(id, { status: 'IN_PROGRESS', actualEndDate: null, isLocked: false })}
              />
            )
          ))}
        </tbody>
      </table>
      {sortedTasks.length === 0 && (
        <div className="py-20 text-center text-gray-400 text-sm font-medium">
          {type === 'trash' ? 'Thùng rác trống.' : type === 'active' ? 'Không có công việc đang xử lý.' : 'Không có công việc đã hoàn thành.'}
        </div>
      )}
    </div>
  );
};
