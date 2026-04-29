import React from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';
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
      <td className="p-4 text-center text-xs font-bold text-gray-300 border-r border-gray-300">{task.code}</td>
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
      <td className="p-4 border-r border-gray-300 relative group">
        {task.attachmentUrl && (
          <a 
            href={task.attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title={`Xem đính kèm: ${task.attachmentName}`}
            className="absolute top-2 right-2 p-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-all z-10"
          >
            <Paperclip size={14} strokeWidth={3} />
          </a>
        )}
        <p className="text-sm font-bold text-gray-900 pr-6">{task.title}</p>
        <p className="text-[11px] text-gray-500 leading-relaxed mt-1 line-clamp-2">{task.objective}</p>
      </td>
      <td className="p-4 text-center border-r border-gray-300">
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
          Xong: {formatDate(task.actualEndDate)}
        </span>
      </td>
      <td className="p-4 border-r border-gray-300">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-gray-500 italic leading-relaxed">{task.currentUpdate}</p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length}</span>
            <button 
              onClick={() => onOpenChat(task.id)}
              className="p-1 px-2 text-[9px] text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full font-bold uppercase transition-all flex items-center gap-1"
            >
              <MessageSquare size={10} />
              Hội thoại {task.comments && task.comments.length > 0 && `(${task.comments.length})`}
            </button>
          </div>
        </div>
      </td>
      <td className="p-1 text-center border-r border-gray-300">
        {task.priorityOrder ? (
          <span 
            style={{ 
              backgroundColor: `rgba(220, 38, 38, ${Math.max(0.1, 1 - (task.priorityOrder - 1) * 0.2)})`,
              color: task.priorityOrder > 3 ? '#991b1b' : '#ffffff'
            }}
            className="text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center mx-auto"
          >
            {task.priorityOrder}
          </span>
        ) : (
          <span className="text-[10px] font-bold text-gray-300">-</span>
        )}
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
