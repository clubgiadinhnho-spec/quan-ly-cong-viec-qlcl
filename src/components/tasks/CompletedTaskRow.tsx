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
      <td className="p-2 text-center text-[10px] font-bold text-gray-300 border-b border-l border-r border-gray-300 align-top">{task.code}</td>
      <td className="p-2 border-b border-r border-gray-300 align-top">
        <div className="flex items-start gap-1.5">
          <Avatar src={assignee?.avatar} name={assigneeName} size="sm" />
          <div className="min-w-0 flex-1">
            <p {...getSafeNameProps()} className="text-[11px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>{assigneeName}</p>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="text-[8px] text-gray-500 font-medium italic opacity-70 leading-none">G: {formatDate(task.issueDate)}</p>
              <p className="text-[8px] text-blue-600 font-black italic leading-none">H: {formatDate(task.expectedEndDate)}</p>
            </div>
          </div>
        </div>
      </td>
      <td className="p-2 border-b border-r border-gray-300 relative group align-top h-px">
        {task.attachmentUrl && (
          <a 
            href={task.attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title={`Xem đính kèm: ${task.attachmentName}`}
            className="absolute top-1 right-1 p-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-all z-10"
          >
            <Paperclip size={10} strokeWidth={3} />
          </a>
        )}
        <div className="flex flex-col h-full font-sans">
          <p className="text-[11px] font-black text-gray-900 pr-4 uppercase break-words whitespace-normal leading-tight font-sans">{task.title}</p>
          <p className="text-[10px] font-black text-gray-900 leading-tight mt-1 break-words whitespace-normal flex-1 font-sans">{task.objective}</p>
        </div>
      </td>
      <td className="p-2 text-center border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col h-full justify-start pt-1">
          <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1 py-0.2 rounded border border-green-100 whitespace-nowrap">
            Xong: {formatDate(task.actualEndDate)}
          </span>
        </div>
      </td>
      <td className="p-1 border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col gap-1 h-full min-h-[60px] justify-between">
          <div className="bg-gray-50/50 p-1.5 rounded border border-gray-100 flex-1">
            <p className="text-[10px] text-gray-700 leading-tight break-words whitespace-normal font-medium">{task.currentUpdate}</p>
          </div>
          <div className="flex items-center gap-1 relative mt-auto pt-0.5">
            <button 
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`p-0.5 px-1 text-[8px] rounded font-black uppercase transition-all flex items-center gap-0.5 ${isChatOpen ? 'bg-blue-600 text-white' : 'text-blue-600 bg-blue-50'}`}
            >
              <MessageSquare size={8} />
              {task.comments && task.comments.length > 0 ? `(${task.comments.length})` : 'CHAT'}
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
      <td className="p-1 text-center border-b border-r border-gray-300 align-top pt-1">
        {task.priorityOrder ? (
          <span 
            style={{ 
              backgroundColor: `rgba(220, 38, 38, ${Math.max(0.1, 1 - (task.priorityOrder - 1) * 0.2)})`,
              color: task.priorityOrder > 3 ? '#991b1b' : '#ffffff'
            }}
            className="text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto"
          >
            {task.priorityOrder}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-gray-300">-</span>
        )}
      </td>
      <td className="py-2 px-0.5 text-center border-b border-r border-gray-300 align-top">
        <div className="flex flex-col items-center gap-1">
          <button onClick={() => onViewHistory(task.id)} className="text-[8px] text-blue-600 font-bold hover:underline">CHI TIẾT</button>
          <button 
            onClick={() => onUndo(task.id)} 
            className="text-[8px] text-orange-600 font-bold hover:underline"
          >
            H.TÁC
          </button>
        </div>
      </td>
    </tr>
  );
};
