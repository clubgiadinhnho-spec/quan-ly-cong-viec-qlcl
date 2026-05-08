import React from 'react';
import { MessageSquare, Paperclip, Highlighter, Check, X, RotateCcw, ThumbsUp, Info, Tag, Trash2, CheckCircle2 } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence, motion } from 'motion/react';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask } from '../../utils/userUtils';

import { Avatar } from '../common/Avatar';

const HIGHLIGHT_COLORS: Record<string, string> = {
  'amber': '!bg-amber-100 hover:!bg-amber-200 ring-inset ring-2 ring-amber-400/50',
  'emerald': '!bg-emerald-100 hover:!bg-emerald-200 ring-inset ring-2 ring-emerald-400/50',
  'blue': '!bg-blue-100 hover:!bg-blue-200 ring-inset ring-2 ring-blue-400/50',
  'red': '!bg-red-100 hover:!bg-red-200 ring-inset ring-2 ring-red-400/50',
  'purple': '!bg-purple-100 hover:!bg-purple-200 ring-inset ring-2 ring-purple-400/50',
};

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
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo, onUpdate,
  isSelected, onToggleSelect
}) => {
  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);
  const isOwner = isUserTask(task, user);
  const isLNT = user.name === 'Lê Nhật Trường';
  const isAdmin = user.role === 'Admin' || isLNT;
  const isManager = isAdmin;

  const [lastReadCount, setLastReadCount] = React.useState(task.comments?.length || 0);
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  // When chat opens, update last read count to current number of comments
  React.useEffect(() => {
    if (isChatOpen) {
      setLastReadCount(task.comments?.length || 0);
    }
  }, [isChatOpen, task.comments?.length]);

  const unreadCount = (task.comments?.length || 0) - lastReadCount;
  const showBadge = unreadCount > 0 && !isChatOpen;

  const highlightClass = task.highlightColor ? HIGHLIGHT_COLORS[task.highlightColor] : (task.isHighlighted ? HIGHLIGHT_COLORS['amber'] : '');

  return (
    <tr id={`task-${task.id}`} className={`hover:bg-gray-50/50 transition-all ${isSelected ? 'bg-blue-50/50' : ''} ${highlightClass}`}>
      <td className="p-2 text-center border-b border-l border-r border-gray-300 align-middle">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm transition-all"
         />
      </td>
      <td className="p-2 text-center text-[10px] font-bold text-gray-300 border-b border-r border-gray-300 align-top">
        <div className="flex flex-col items-center gap-1 pt-1 opacity-60">
          <span translate="no" className="notranslate leading-none">{task.code}</span>
          {task.category && (
            <span translate="no" className="notranslate text-[7px] font-black text-white bg-indigo-400 px-1 py-0.5 rounded shadow-sm leading-none" title="PHÂN LOẠI">
              <span translate="no" className="notranslate">{task.category}</span>
            </span>
          )}
        </div>
      </td>
      <td 
        className={`p-2 border-b border-r border-gray-300 align-top h-px ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : ''}`}
      >
        <div className="flex flex-col h-full gap-1">
          <div className="flex items-start gap-1.5">
            <Avatar src={assignee?.avatar} name={assigneeName} size="sm" />
            <div className="min-w-0 flex-1">
              <p {...getSafeNameProps()} className="text-[11px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>{assigneeName}</p>
              <p className="text-[5px] font-black text-black uppercase tracking-widest leading-none mt-1 whitespace-nowrap">
                <span translate="no" className="notranslate">{assignee ? (assignee.title || assignee.role) : 'NHÂN SỰ'}</span>
              </p>
              <div className="flex flex-col gap-0.5 mt-0.5">
                <p className="text-[8px] text-gray-500 font-medium italic opacity-70 leading-none">
                  <span translate="no" className="notranslate">KHỞI TẠO:</span> {formatDate(task.issueDate)}
                </p>
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
          <p className="text-[11px] font-black text-gray-900 pr-4 uppercase break-words whitespace-normal leading-tight font-sans">
            <span translate="no" className="notranslate">{task.title}</span>
          </p>
          <p className="text-[10px] font-black text-gray-900 leading-tight mt-1 break-words whitespace-normal flex-1 font-sans">
            <span translate="no" className="notranslate">{task.objective}</span>
          </p>
          
          {task.history.length > 1 && (
            <div className="mt-auto px-1 py-0.5 bg-blue-50/30 rounded border border-blue-100/30 flex justify-between items-center group/history" title={task.history[task.history.length - 2]?.content}>
              <div className="flex flex-col min-w-0">
                <p className="text-[6px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-0.5">Lần cập trước:</p>
                <p className="text-[7px] text-gray-500 line-clamp-1 italic leading-none truncate">
                  {(task.history[task.history.length - 2]?.content || '').replace('Cập nhật tiến độ: ', '') || 'Khởi tạo'}
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
          <div className="p-1.5 rounded border border-gray-100 flex-1">
            <p className="text-[10px] text-gray-700 leading-tight break-words whitespace-normal font-medium">
              <span translate="no" className="notranslate">{task.currentUpdate}</span>
            </p>
          </div>
          <div className="flex items-center justify-between px-1 mt-auto pt-1 border-t border-gray-50 border-dotted">
            <span className="text-[7px] px-0.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length || 0}</span>
            <button onClick={() => onViewHistory(task.id)} className="text-[8px] text-blue-500 hover:underline font-extrabold uppercase tracking-tighter">Lịch sử</button>
          </div>
          <div className="flex items-center gap-1 relative mt-auto pt-0.5">
            <button 
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`p-1 px-2 rounded-md transition-all w-fit flex items-center gap-1.5 border ${
                isChatOpen 
                  ? 'text-blue-700 bg-blue-100 shadow-inner border-blue-200' 
                  : showBadge
                    ? 'text-white bg-red-600 border-red-400 animate-[pulse_0.8s_infinite] shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                    : (task.comments?.length || 0) > 0
                      ? 'text-red-600 bg-red-50 border-red-200 animate-[pulse_2s_infinite]'
                      : 'text-blue-600 hover:bg-blue-50 border-blue-100 bg-white'
              }`}
            >
              <MessageSquare size={12} fill={showBadge ? "white" : (task.comments?.length || 0) > 0 ? "rgba(220, 38, 38, 0.1)" : "none"} />
              <span className="text-[10px] font-black tracking-tight uppercase">CHAT</span>
              {showBadge && (
                <span className="flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-white text-red-600 text-[8px] font-black rounded-full shadow-sm animate-bounce border border-red-100">
                  {unreadCount}
                </span>
              )}
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
        <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-1">
          {task.requestUndo === 'PENDING' ? (
            <div className="w-full flex flex-col gap-1 items-center">
              <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 animate-pulse uppercase">Đợi duyệt HT</span>
              {isManager && (
                <div className="flex flex-row gap-1">
                  <button 
                    onClick={() => onUndo(task.id)} 
                    title="DUYỆT HOÀN TÁC"
                    className="w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition-all shadow-sm"
                  >
                    <Check size={16} strokeWidth={4} />
                  </button>
                  <button 
                    onClick={() => onUpdate(task.id, { requestUndo: 'REJECTED' })} 
                    title="BÁC HOÀN TÁC"
                    className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-sm"
                  >
                    <X size={16} strokeWidth={4} />
                  </button>
                </div>
              )}
            </div>
          ) : (isManager || isOwner) ? (
            <button 
              onClick={() => {
                if (isManager) {
                  onUndo(task.id);
                } else {
                  onUpdate(task.id, { 
                    requestUndo: 'PENDING', 
                    undoRequestAt: new Date().toISOString(),
                    undoRequestBy: user.name
                  });
                }
              }} 
              title="YÊU CẦU HOÀN TÁC"
              disabled={task.requestUndo === 'REJECTED'}
              className={`w-10 h-10 flex items-center justify-center rounded-[14px] transition-all shadow-lg group/btn ${
                task.requestUndo === 'REJECTED' 
                  ? 'bg-gray-200 text-white cursor-not-allowed opacity-50' 
                  : 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-100'
              }`}
            >
              <RotateCcw size={20} strokeWidth={3} className="group-hover/btn:-rotate-45 transition-transform" />
            </button>
          ) : null}

          <div className="relative">
            <button 
               onClick={() => setShowColorPicker(!showColorPicker)}
               title="LƯU Ý"
               className={`w-10 h-10 flex items-center justify-center rounded-[14px] transition-all shadow-lg border-2 group/btn ${
                 task.highlightColor || task.isHighlighted
                   ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-100' 
                   : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
               }`}
             >
               <Tag size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
               <span className="sr-only notranslate" translate="no">LƯU Ý</span>
             </button>
             
             <AnimatePresence>
                {showColorPicker && (
                  <motion.div 
                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                    className="absolute right-full mr-2 top-0 bg-white border border-gray-200 rounded-lg shadow-xl p-1.5 flex flex-col gap-1.5 z-[100]"
                  >
                    {Object.keys(HIGHLIGHT_COLORS).map(color => (
                        <button
                          key={color}
                          onClick={() => {
                            onUpdate(task.id, { highlightColor: color, isHighlighted: true });
                            setShowColorPicker(false);
                          }}
                          className={`w-6 h-6 rounded-full border border-gray-200 transition-transform hover:scale-125 ${HIGHLIGHT_COLORS[color].split(' ')[0]}`}
                        />
                      ))}
                    <button
                      onClick={() => {
                        onUpdate(task.id, { highlightColor: null, isHighlighted: false });
                        setShowColorPicker(false);
                      }}
                      title="Bỏ highlight"
                      className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                    >
                      <X size={12} strokeWidth={3} />
                    </button>
                  </motion.div>
                )}
             </AnimatePresence>
          </div>

          <button 
            onClick={() => onViewHistory(task.id)} 
            title="XEM CHI TIẾT"
            className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-[14px] hover:bg-blue-700 transition-all shadow-lg border-2 border-blue-400 group/btn"
          >
            <Info size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
            <span className="sr-only notranslate" translate="no">XEM CHI TIẾT</span>
          </button>
        </div>
      </td>
    </tr>
  );
};
