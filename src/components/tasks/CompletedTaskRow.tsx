import React from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence } from 'motion/react';

import { getUserById, getSafeNameProps, getTaskAssigneeName } from '../../utils/userUtils';

import { Avatar } from '../common/Avatar';

interface CompletedTaskRowProps {
  task: Task;
  user: User;
  users: User[];
  idx: number;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  isChatOpen: boolean;
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onUndo: (id: string) => void;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo 
}) => {
  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);

  return (
    <tr className="hover:bg-gray-50/50 transition-all">
      <td className="p-4 text-center text-xs font-bold text-gray-300 border-b border-r border-gray-300 align-top">{task.code}</td>
      <td className="p-4 border-b border-r border-gray-300 align-top">
        <div className="flex items-center gap-3">
          <Avatar src={assignee?.avatar} name={assigneeName} />
          <div>
            <p {...getSafeNameProps()} className="text-sm font-bold text-gray-900 leading-none whitespace-nowrap notranslate">{assigneeName}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-[10px] text-gray-500 font-medium italic opacity-70 leading-none">Giao việc: {formatDate(task.issueDate)}</p>
              <p className="text-[10px] text-blue-600 font-black italic leading-none">Hạn: {formatDate(task.expectedEndDate)}</p>
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 border-b border-r border-gray-300 relative group align-top h-px">
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
        <div className="flex flex-col h-full font-sans">
          <p className="text-sm font-black text-gray-900 pr-6 uppercase break-words whitespace-normal leading-tight font-sans">{task.title}</p>
          <p className="text-[11px] font-black text-gray-900 leading-relaxed mt-1 break-words whitespace-normal flex-1 font-sans">{task.objective}</p>
        </div>
      </td>
      <td className="p-4 text-center border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col h-full justify-center">
          <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
            Xong: {formatDate(task.actualEndDate)}
          </span>
        </div>
      </td>
      <td className="p-2 border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col gap-2 h-full min-h-[100px] justify-between">
          <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex-1">
            <p className="text-[11px] text-gray-700 leading-relaxed break-words whitespace-normal">{task.currentUpdate}</p>
          </div>
          <div className="flex items-center gap-2 relative mt-auto pt-1">
            <span className="text-[8px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-black uppercase tracking-tighter">v{task.history.length}</span>
            <button 
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`p-1 px-2 text-[9px] rounded-full font-black uppercase transition-all flex items-center gap-1 ${isChatOpen ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-600 bg-blue-50 hover:bg-blue-100'}`}
            >
              <MessageSquare size={10} />
              Hội thoại {task.comments && task.comments.length > 0 && `(${task.comments.length})`}
            </button>

            <AnimatePresence>
              {isChatOpen && (
                <TaskChat 
                  task={task}
                  currentUser={user}
                  users={users}
                  onSendMessage={onSendMessage}
                  onReact={onReact}
                  onClose={() => onOpenChat('')}
                />
              )}
            </AnimatePresence>
          </div>
        </div>
      </td>
      <td className="p-1 text-center border-b border-r border-gray-300 align-top pt-4">
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
      <td className="py-4 px-1 text-center border-b border-r border-gray-300 align-top">
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
