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
  onUpdate: (id: string, updates: Partial<Task>) => void;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo, onUpdate 
}) => {
  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);

  return (
    <tr className="hover:bg-gray-50/50 transition-all">
      <td className="p-2 text-center text-[10px] font-bold text-gray-300 border-b border-l border-r border-gray-300 align-top">{task.code}</td>
      <td className="p-2 border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col h-full gap-1">
          <div className="flex items-start gap-1.5">
            <Avatar src={assignee?.avatar} name={assigneeName} size="sm" />
            <div className="min-w-0 flex-1">
              <p {...getSafeNameProps()} className="text-[11px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>{assigneeName}</p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-[8px] text-gray-500 font-medium italic opacity-70 leading-none">G: {formatDate(task.issueDate)}</p>
                <p className="text-[8px] text-blue-600 font-black italic leading-none">Hạn: {formatDate(task.expectedEndDate)}</p>
                {(() => {
                  const extensions = task.history.filter(h => h.content.includes('Gia hạn công việc đến'));
                  const extensionCount = extensions.length;
                  if (task.extensionDate) {
                    return (
                      <p className="text-[8px] text-red-600 font-black italic leading-none">
                        GIA HẠN {extensionCount > 0 ? `(V${extensionCount})` : ''}: {formatDate(task.extensionDate)}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>

          {task.history.filter(h => h.content.includes('Gia hạn công việc đến')).length > 0 && (
            <div className="mt-auto px-1 py-0.5 bg-red-50/30 rounded border border-red-100/30">
              <div className="flex justify-between items-center">
                <p className="text-[6px] font-black text-red-600 uppercase tracking-tighter">Gia hạn:</p>
                <p className="text-[6px] font-black text-red-500 uppercase tracking-tighter">V{task.history.filter(h => h.content.includes('Gia hạn công việc đến')).length}</p>
              </div>
              <div className="flex flex-wrap gap-x-1">
                {task.history
                  .filter(h => h.content.includes('Gia hạn công việc đến'))
                  .slice(-2)
                  .reverse()
                  .map((h, i, arr) => (
                    <p key={i} className="text-[7px] text-red-600 font-bold italic leading-none truncate whitespace-nowrap">
                      {h.content.split(': ')[1]}
                    </p>
                  ))}
              </div>
            </div>
          )}
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
          
          {task.history.length > 1 && (
            <div className="mt-auto px-1 py-0.5 bg-blue-50/30 rounded border border-blue-100/30 flex justify-between items-center group/history" title={task.history[task.history.length - 2]?.content}>
              <div className="flex flex-col min-w-0">
                <p className="text-[6px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-0.5">Lần cập trước:</p>
                <p className="text-[7px] text-gray-500 line-clamp-1 italic leading-none truncate">
                  {task.history[task.history.length - 2]?.content.replace('Cập nhật tiến độ: ', '') || 'Khởi tạo'}
                </p>
              </div>
              <p className="text-[6px] font-black text-blue-400 bg-blue-50/50 px-0.5 rounded leading-none uppercase tracking-tighter shrink-0 ml-1">V{task.history.length}</p>
            </div>
          )}
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
          <div className="flex items-center justify-between px-1 mt-auto pt-1 border-t border-gray-50 border-dotted">
            <span className="text-[7px] px-0.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length || 0}</span>
            <button onClick={() => onViewHistory(task.id)} className="text-[8px] text-blue-500 hover:underline font-extrabold uppercase tracking-tighter">Lịch sử</button>
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
      <td className="py-2 px-1 text-center border-b border-r border-gray-300 align-middle">
        <div className="flex flex-col items-center justify-center gap-3 w-full max-w-[60px] mx-auto min-h-full py-1">
          <button 
            onClick={() => onUndo(task.id)} 
            className="w-full px-1 py-2 text-[10px] bg-amber-500 text-white rounded font-black hover:bg-amber-600 transition-all uppercase tracking-tighter shadow-md"
          >
            H.TÁC
          </button>
          <button 
             onClick={() => onUpdate(task.id, { isHighlighted: !task.isHighlighted })}
             className={`w-full px-1 py-2 text-[10px] rounded font-black transition-all uppercase tracking-tighter shadow-md border ${
               task.isHighlighted 
                 ? 'bg-emerald-500 text-white border-emerald-600' 
                 : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
             }`}
           >
             LƯU Ý
           </button>
          <button onClick={() => onViewHistory(task.id)} className="w-full px-1 py-2 text-[9px] bg-blue-600 text-white rounded font-black hover:bg-blue-700 transition-all uppercase tracking-tighter shadow-md">CHI TIẾT</button>
        </div>
      </td>
    </tr>
  );
};
