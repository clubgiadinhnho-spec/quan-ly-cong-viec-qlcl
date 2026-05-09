import React from 'react';
import { MessageSquare, Paperclip, Highlighter, Check, X, RotateCcw, ThumbsUp, Info, Tag, Trash2, CheckCircle2, History } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence, motion } from 'motion/react';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask } from '../../utils/userUtils';

import { Avatar } from '../common/Avatar';

const HIGHLIGHT_COLORS: Record<string, string> = {
  'amber': '!bg-amber-50/50 hover:!bg-amber-100/60 ring-inset ring-1 ring-amber-200/30 text-amber-950',
  'emerald': '!bg-emerald-50/50 hover:!bg-emerald-100/60 ring-inset ring-1 ring-emerald-200/30 text-emerald-950',
  'blue': '!bg-blue-50/50 hover:!bg-blue-100/60 ring-inset ring-1 ring-blue-200/30 text-blue-950',
  'red': '!bg-rose-50/50 hover:!bg-rose-100/60 ring-inset ring-1 ring-rose-200/30 text-rose-950',
  'purple': '!bg-purple-50/50 hover:!bg-purple-100/60 ring-inset ring-1 ring-purple-200/40 text-purple-950',
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
  onDelete?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo, onUpdate, onDelete,
  isSelected, onToggleSelect
}) => {
  const chatButtonRef = React.useRef<HTMLButtonElement>(null);

  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);
  const isOwner = user?.uniqueKey === task.assigneeId || isUserTask(task, user);
  const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.uniqueKey === 'LeNhatTruong09xxxxxxxx' || user.name === 'Lê Nhật Trường' || user.id === 'lenhattruong.caphef1@gmail.com';
  const isManager = isAdmin;

  const [lastReadCount, setLastReadCount] = React.useState(task.comments?.length || 0);
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

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
           className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
         />
      </td>
      <td className="p-2 text-center text-[10px] font-bold text-gray-300 border-b border-r border-gray-300 align-top">
        <div className="flex flex-col items-center gap-1 pt-1 opacity-60">
          <span translate="no" className="notranslate leading-none">{task.code}</span>
          {task.category && (
            <span translate="no" className="notranslate text-[7px] font-black text-white bg-indigo-400 px-1 py-0.5 rounded leading-none" title="PHÂN LOẠI">
              <span translate="no" className="notranslate">{task.category}</span>
            </span>
          )}
        </div>
      </td>
      <td className={`p-1.5 border-b border-r border-gray-300 align-top h-px transition-colors ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : ''}`}>
        <div className="flex flex-col h-full gap-2 px-0.5 pt-1">
          {/* Identity Section */}
          <div className="flex items-center gap-2">
            <Avatar src={assignee?.avatar} name={assigneeName} size="xs" />
            <div className="min-w-0 flex-1">
              <p {...getSafeNameProps()} className="text-[13px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>
                <span translate="no" className="notranslate">{assigneeName}</span>
              </p>
              <div className="mt-1.5">
                <span translate="no" className="notranslate text-[10px] font-medium text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 py-0.5 rounded-sm border border-gray-100">
                  {assignee ? <span translate="no" className="notranslate">{assignee.title || assignee.role}</span> : <span translate="no" className="notranslate">NHÂN SỰ</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Section - Vertical 4 Rows */}
          <div className="flex flex-col gap-1 py-1.5 border-y border-gray-50 border-dashed">
            {/* Hàng 1: Khởi tạo */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]" translate="no">📝</span>
              <p className="text-[10px] text-gray-500 font-medium tracking-tighter">
                <span translate="no" className="notranslate">KHỞI TẠO: {formatDate(task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 2: Bắt đầu */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]" translate="no">🚀</span>
              <p className="text-[10px] text-blue-600 font-medium tracking-tighter">
                <span translate="no" className="notranslate">BẮT ĐẦU: {formatDate(task.startDate || task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 3: Hạn */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" translate="no">🏁</span>
              <p className="text-[11px] text-red-600 font-bold tracking-tighter">
                <span translate="no" className="notranslate font-bold uppercase">HẠN: {formatDate(task.expectedEndDate)}</span>
              </p>
            </div>

            {/* Hàng 4: Kết thúc thực tế (Vì đây là CompletedTaskRow) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" translate="no">✅</span>
              <p className="text-[11px] font-black text-green-700 tracking-tighter leading-none">
                <span translate="no" className="notranslate uppercase">XONG: {formatDate(task.actualEndDate)}</span>
              </p>
            </div>
          </div>

          {/* Chat Button */}
          <div className="mt-1" onClick={(e) => e.stopPropagation()}>
            <button 
              ref={chatButtonRef}
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`flex items-center gap-1.5 py-1 px-1 transition-all rounded ${
                showBadge && isAdmin ? 'animate-bounce text-red-700 font-bold' : (task.comments?.length || 0) > 0 ? 'text-red-800 font-bold' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <MessageSquare size={14} fill={(task.comments?.length || 0) > 0 ? "currentColor" : "none"} className="opacity-90" />
                {showBadge && isAdmin && (
                  <span translate="no" className="notranslate absolute -top-2 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-1 bg-red-600 text-white text-[8px] font-black rounded-full border border-white shadow-sm">
                    <span translate="no" className="notranslate">{unreadCount}</span>
                   </span>
                )}
              </div>
              <span translate="no" className="notranslate text-[11px] font-black tracking-widest uppercase">
                <span translate="no" className="notranslate">CHAT</span>
              </span>
            </button>

            {isChatOpen && (
              <TaskChat 
                task={task}
                currentUser={user}
                users={users}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onClose={() => onOpenChat('')}
                anchorRef={chatButtonRef}
              />
            )}
          </div>
        </div>
      </td>
      <td className={`p-2 border-b border-r border-gray-300 relative group align-top h-px ${(!isAdmin && !isOwner) ? 'bg-gray-50' : ''}`}>
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
          <p className="text-[15px] text-blue-900 font-bold pr-4 uppercase break-words whitespace-normal leading-tight font-sans">
            <span translate="no" className="notranslate">{task.title}</span>
          </p>
          <p className="text-[15px] text-gray-900 leading-tight mt-2 break-words whitespace-normal flex-1 font-sans">
            <span translate="no" className="notranslate font-bold">MỤC TIÊU: </span>
            <span translate="no" className="notranslate">{task.objective}</span>
          </p>
        </div>
      </td>
      
      <td 
        className={`p-1 border-b border-r border-gray-300 align-top h-px ${(!isAdmin && !isOwner) ? 'bg-gray-50' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          if (isAdmin && task.isNewUpdate) {
            onUpdate?.(task.id, { isNewUpdate: false });
          }
        }}
      >
        <div className="flex flex-col gap-1 h-full min-h-[60px] justify-between">
          <textarea
            translate="no"
            readOnly={!isAdmin && !isOwner}
            className={`notranslate w-full p-2.5 rounded-sm flex-1 transition-all outline-none resize-none text-[15px] text-blue-950 font-medium leading-tight ${
              (!isAdmin && !isOwner) ? 'bg-gray-50 cursor-not-allowed' : 'bg-transparent cursor-text'
            } ${
              task.isNewUpdate 
                ? 'border-2 border-blue-700' 
                : 'border border-gray-200'
            }`}
            defaultValue={task.currentUpdate}
            onBlur={(e) => {
              const newValue = e.target.value;
              if (newValue !== task.currentUpdate) {
                onUpdate?.(task.id, { 
                  currentUpdate: newValue,
                  isNewUpdate: true,
                  version: (task.version || 0) + 1
                });
              }
            }}
            onMouseLeave={() => {
              if (isAdmin && task.isNewUpdate) {
                onUpdate?.(task.id, { isNewUpdate: false });
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.currentTarget.blur();
              }
            }}
            placeholder={(!isAdmin && !isOwner) ? "Chỉ xem..." : "Nhập ghi chú cuối cùng..."}
          />
        </div>
      </td>
      <td className="p-1 text-center border-b border-r border-gray-300 align-top pt-1">
        {task.priorityOrder ? (
          <span 
            style={{ 
              backgroundColor: `rgba(220, 38, 38, ${Math.max(0.05, 0.4 - (task.priorityOrder - 1) * 0.05)})`,
              color: '#991b1b'
            }}
            className="text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center mx-auto border border-red-100"
          >
            {task.priorityOrder}
          </span>
        ) : (
          <span className="text-[9px] font-bold text-gray-300">-</span>
        )}
      </td>
      <td className="py-2 px-1 text-center border-b border-r border-gray-300 align-middle">
        <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-1">
          {(isAdmin || isOwner) ? (
            <>
              {/* 1. PRIMARY ACTION (HOÀN TÁC) - ON TOP (ADMIN ONLY) */}
              {isAdmin && (
                task.requestUndo === 'PENDING' ? (
                  <div className="w-full flex flex-col gap-1 items-center">
                    <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 animate-pulse uppercase">
                      <span translate="no" className="notranslate">Đợi duyệt HT</span>
                    </span>
                    <div className="flex flex-row gap-1">
                      <button 
                        disabled={isProcessing}
                        onClick={async () => {
                          if (isProcessing) return;
                          setIsProcessing(true);
                          try {
                            await onUndo(task.id);
                          } finally {
                            setIsProcessing(false);
                          }
                        }} 
                        title="DUYỆT HOÀN TÁC"
                        className={`w-8 h-8 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition-all shadow-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Check size={16} strokeWidth={4} />
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={async () => {
                          if (isProcessing) return;
                          setIsProcessing(true);
                          try {
                            await onUpdate(task.id, { requestUndo: 'REJECTED' });
                          } finally {
                            setIsProcessing(false);
                          }
                        }} 
                        title="BÁC HOÀN TÁC"
                        className={`w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <X size={16} strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    disabled={isProcessing}
                    onClick={async () => {
                      if (isProcessing) return;
                      setIsProcessing(true);
                      try {
                        await onUndo(task.id);
                      } finally {
                        setIsProcessing(false);
                      }
                    }} 
                    title="HOÀN TÁC CÔNG VIỆC"
                    className={`w-10 h-10 flex items-center justify-center bg-green-600 text-white font-black rounded-md hover:bg-green-700 transition-all border-2 border-green-400 group/btn shadow-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <RotateCcw size={20} strokeWidth={3} className={`group-hover/btn:-rotate-45 transition-transform ${isProcessing ? 'animate-spin' : ''}`} />
                    <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">HOÀN TÁC CÔNG VIỆC</span></span>
                  </button>
                )
              )}

              {/* 2. VIEW DETAILS BUTTON (HISTORY) - SECOND */}
                <button 
                  onClick={() => onViewHistory(task.id)}
                  title="XEM CHI TIẾT CẬP NHẬT"
                  className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all group/btn border border-blue-400"
                >
                  <History size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  <span translate="no" className="sr-only notranslate"><span translate="no" className="notranslate">XEM CHI TIẾT CẬP NHẬT</span></span>
                </button>

              {/* 3. HIGHLIGHT / TAG */}
              <div className="relative">
                <button 
                   onClick={() => setShowColorPicker(!showColorPicker)}
                   title="LƯU Ý"
                   className={`w-10 h-10 flex items-center justify-center rounded-md transition-all border-2 group/btn ${
                     task.highlightColor || task.isHighlighted
                       ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-100' 
                       : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                   }`}
                 >
                   <Tag size={20} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                   <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">LƯU Ý</span></span>
                 </button>
                 
                 <AnimatePresence>
                    {showColorPicker && (
                      <motion.div 
                        initial={{ opacity: 0, x: 10, scale: 0.9 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 10, scale: 0.9 }}
                        className="absolute right-full mr-2 top-0 bg-white border border-gray-200 rounded-md p-1.5 flex flex-col gap-1.5 z-[100]"
                      >
                        {Object.keys(HIGHLIGHT_COLORS).map(color => (
                            <button
                              key={color}
                              onClick={() => {
                                onUpdate(task.id, { highlightColor: color, isHighlighted: true });
                                setShowColorPicker(false);
                              }}
                              className={`w-6 h-6 rounded-md border border-gray-200 transition-transform hover:scale-125 ${HIGHLIGHT_COLORS[color].split(' ')[0]}`}
                            />
                          ))}
                        <button
                          onClick={() => {
                            onUpdate(task.id, { highlightColor: null, isHighlighted: false });
                            setShowColorPicker(false);
                          }}
                          title="Bỏ highlight"
                          className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </motion.div>
                    )}
                 </AnimatePresence>
              </div>

              {/* 4. FORCE DELETE (ADMIN ONLY) - NEW */}
              {isAdmin && (
                <button 
                  onClick={() => onDelete && onDelete(task.id)}
                  title="XÓA CƯỠNG BỨC (VĨNH VIỄN)"
                  className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                >
                  <Trash2 size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XÓA CƯỠNG BỨC</span></span>
                </button>
              )}
            </>
          ) : (
            <span translate="no" className="notranslate text-gray-400 italic text-[10px]">Chỉ xem</span>
          )}
        </div>
      </td>
    </tr>
  );
};
