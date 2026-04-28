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
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  setConfirmModal: (modal: any) => void;
  type: 'active' | 'completed';
}

export const TaskList: React.FC<TaskListProps> = ({ 
  tasks, 
  user, 
  users, 
  onUpdate, 
  onDelete, 
  onViewHistory, 
  onOpenChat, 
  setConfirmModal,
  type 
}) => {
  const priorityWeight = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };

  const sortedTasks = [...tasks].sort((a, b) => {
    const weightA = priorityWeight[a.priority as keyof typeof priorityWeight] || 0;
    const weightB = priorityWeight[b.priority as keyof typeof priorityWeight] || 0;
    if (weightB !== weightA) return weightB - weightA;
    if (a.isHighlighted !== b.isHighlighted) return a.isHighlighted ? -1 : 1;
    return b.code.localeCompare(a.code);
  });

  return (
    <div className="overflow-x-auto ring-1 ring-gray-200 rounded-xl">
      <table className="w-full text-left border-collapse border border-gray-300">
        <thead className="bg-[#FAFBFD] border-b border-gray-300">
          <tr>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider w-12 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">STT</th>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider w-56 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nhân viên</th>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Nội dung & Mục tiêu</th>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider w-60 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Diễn tiến trước đó</th>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider w-60 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Cập nhật (2 tuần tiếp)</th>
            <th className="p-4 text-[13px] font-black text-gray-700 uppercase tracking-wider w-14 text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Ưu tiên</th>
            <th className="py-4 px-1 text-[13px] font-black text-gray-700 uppercase tracking-wider w-[72px] text-center border-r border-gray-300 sticky top-0 z-10 bg-[#FAFBFD]">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-300">
          {sortedTasks.map((task, idx) => (
            type === 'active' ? (
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
                setConfirmModal={setConfirmModal}
              />
            ) : (
              <CompletedTaskRow 
                key={task.id}
                task={task}
                users={users}
                idx={idx}
                onViewHistory={onViewHistory}
                onOpenChat={onOpenChat}
                onUndo={(id) => onUpdate(id, { status: 'IN_PROGRESS', actualEndDate: undefined })}
              />
            )
          ))}
        </tbody>
      </table>
      {sortedTasks.length === 0 && (
        <div className="py-20 text-center text-gray-400 text-sm font-medium">
          {type === 'active' ? 'Không có công việc đang xử lý.' : 'Không có công việc đã hoàn thành.'}
        </div>
      )}
    </div>
  );
};
