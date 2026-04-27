import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';

interface CompletedTaskRowProps {
  task: Task;
  users: User[];
  idx: number;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  onUndo: (id: string) => void;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ task, users, idx, onViewHistory, onOpenChat, onUndo }) => {
  const assignee = users.find(s => s.id === task.assigneeId);

  return (
    <tr className="hover:bg-gray-50/50 transition-all">
      <td className="p-4 text-center text-xs font-bold text-gray-300 border-r border-gray-300">{idx + 1}</td>
      <td className="p-4 border-r border-gray-300">
        <div className="flex items-center gap-3">
          <img src={assignee?.avatar} alt={assignee?.name} className="w-8 h-8 rounded-full border border-gray-100" />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none whitespace-nowrap">{assignee?.name}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-[10px] text-gray-500 font-medium italic opacity-70 leading-none">Giao việc: {formatDate(task.issueDate)}</p>
              <p className="text-[10px] text-blue-600 font-black italic leading-none">Hạn: {formatDate(task.expectedEndDate)}</p>
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 border-r border-gray-300">
        <p className="text-sm font-bold text-gray-900">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500 italic">{task.currentUpdate}</p>
          <button 
            onClick={() => onOpenChat(task.id)}
            className="p-1 px-2 text-[9px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full font-bold uppercase transition-all flex items-center gap-1"
          >
            <MessageSquare size={10} />
            Hội thoại {task.comments && task.comments.length > 0 && `(${task.comments.length})`}
          </button>
        </div>
      </td>
      <td className="p-4 text-center border-r border-gray-300">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
            Xong: {formatDate(task.actualEndDate)}
          </span>
        </div>
      </td>
      <td className="py-4 px-1 text-center border-r border-gray-300">
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => onViewHistory(task.id)} className="text-[10px] text-blue-600 font-bold hover:underline">CHI TIẾT</button>
          <button 
            onClick={() => onUndo(task.id)} 
            className="text-[10px] text-orange-600 font-bold hover:underline"
          >
            HOÀN TÁC
          </button>
        </div>
      </td>
    </tr>
  );
};
