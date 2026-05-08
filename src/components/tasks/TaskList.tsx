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
  onApprove?: (id: string) => void;
  type: 'active' | 'completed' | 'trash';
  isReadOnly?: boolean;
  highlightedTaskId?: string | null;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  createNotification?: any;
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
  onApprove,
  type,
  isReadOnly = false,
  onRestore,
  highlightedTaskId,
  selectedIds = [],
  onToggleSelect,
  createNotification
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
  }).slice(0, 100);

  const handleUpdateTask = (id: string, updates: Partial<Task>) => {
    const taskData = tasks.find(t => t.id === id);
    if (!taskData) return;

    // Handle priority shifting when a task is completed
    if (updates.status === 'COMPLETED' && taskData.priorityOrder) {
      const removedOrder = taskData.priorityOrder;
      
      // Update the completed task first
      onUpdate(id, { ...updates, priorityOrder: null as any });
      
      // Shift all others up
      tasks.forEach(t => {
        if (t.priorityOrder && t.id !== id && t.priorityOrder > removedOrder) {
          onUpdate(t.id, { priorityOrder: t.priorityOrder - 1 });
        }
      });
      return;
    }

    onUpdate(id, updates);
  };

  const handleSetPriority = (taskId: string, order: number | null) => {
    const taskData = tasks.find(t => t.id === taskId);
    if (!taskData) return;

    const oldOrder = taskData.priorityOrder;

    if (order === null) {
      // Removing priority
      if (oldOrder) {
        onUpdate(taskId, { priorityOrder: null as any });
        tasks.forEach(t => {
          if (t.priorityOrder && t.id !== taskId && t.priorityOrder > oldOrder) {
            onUpdate(t.id, { priorityOrder: t.priorityOrder - 1 });
          }
        });
      }
    } else {
      // Setting a new priority (could be reordering or new assignment)
      onUpdate(taskId, { priorityOrder: order as any });
    }
  };

  const handleTogglePriority = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    if (task.priorityOrder) {
      handleSetPriority(taskId, null);
    } else {
      const maxOrder = tasks.reduce((max, t) => (t.priorityOrder || 0) > max ? (t.priorityOrder || 0) : max, 0);
      handleSetPriority(taskId, maxOrder + 1);
    }
  };

  return (
    <div className="border border-gray-300 rounded-md bg-white shadow-sm overflow-visible">
      <table className="w-full text-left border-collapse table-fixed min-w-full">
        <thead>
          <tr className="bg-blue-600">
            <th className="p-2 text-[10px] font-black text-white uppercase tracking-wider w-[40px] text-center border border-blue-700 bg-blue-600 sticky top-0 z-10">
               <input 
                 type="checkbox"
                 className="w-3.5 h-3.5 rounded-sm border-blue-400 text-blue-600 focus:ring-blue-500 cursor-pointer"
                 checked={tasks.length > 0 && selectedIds.length === tasks.length}
                 onChange={(e) => {
                   if (e.target.checked) {
                     tasks.forEach(t => {
                       if (!selectedIds.includes(t.id)) onToggleSelect?.(t.id);
                     });
                   } else {
                     tasks.forEach(t => {
                       if (selectedIds.includes(t.id)) onToggleSelect?.(t.id);
                     });
                   }
                 }}
               />
            </th>
            <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider w-[5%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">Mã</span>
            </th>
            <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider w-[20%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">Nhân sự</span>
            </th>
            <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10 w-[30%]">
              <span translate="no" className="notranslate">Nội dung & Mục tiêu</span>
            </th>
            <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider w-[18%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">Diễn tiến trước đó</span>
            </th>
            <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider w-[18%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">Cập nhật</span>
            </th>
            <th className="p-3 text-[11px] font-black text-white uppercase tracking-tighter w-[6%] text-center border-r border-white/20 border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">ƯU TIÊN</span>
            </th>
            {!isReadOnly && <th className="p-3 text-[10px] font-black text-white uppercase tracking-wider w-[6%] text-center border-blue-700 bg-blue-600 sticky top-0 z-10">
              <span translate="no" className="notranslate">Thao tác</span>
            </th>}
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
                onUpdate={handleUpdateTask}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                onSetPriority={handleSetPriority}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                isReadOnly={isReadOnly}
                onRestore={onRestore}
                onApprove={onApprove}
                highlightedTaskId={highlightedTaskId}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                createNotification={createNotification}
              />
            ) : type === 'active' ? (
              <TaskRow 
                key={task.id} 
                task={task} 
                user={user} 
                users={users} 
                idx={idx}
                onUpdate={handleUpdateTask}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                isChatOpen={showChatModal === task.id}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onEdit={onEdit}
                onSetPriority={handleSetPriority}
                setConfirmModal={setConfirmModal}
                onTogglePriority={handleTogglePriority}
                onApprove={onApprove}
                isReadOnly={isReadOnly}
                highlightedTaskId={highlightedTaskId}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                createNotification={createNotification}
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
                onUndo={(id) => onUpdate(id, { 
                  status: 'APPROVED', 
                  actualEndDate: null, 
                  isLocked: false, 
                  requestUndo: null as any 
                })}
                onUpdate={onUpdate}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
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
