import React from 'react';
import { MessageSquare, Paperclip, Highlighter, Check, X, RotateCcw, ThumbsUp, Info, Tag, Trash2, CheckCircle2, History } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AuditModal } from './AuditModal';
import { AnimatePresence, motion } from 'motion/react';
import { calculateKPI } from '../../utils/taskUtils';

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
  setConfirmModal: (modal: any) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo, onUpdate, onDelete,
  isSelected, onToggleSelect, setConfirmModal, markAsRead, lastReadChatTimestamps
}) => {
  const chatButtonRef = React.useRef<HTMLButtonElement>(null);

  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);
  const isOwner = user?.uniqueKey === task.assigneeId || isUserTask(task, user);
  const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.uniqueKey === 'LeNhatTruong09xxxxxxxx' || user.name === 'Lê Nhật Trường' || user.id === 'lenhattruong.caphef1@gmail.com';
  const isManager = isAdmin;

  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showAuditModal, setShowAuditModal] = React.useState(false);

  // When chat opens or new comments arrive while open, update last read timestamp
  React.useEffect(() => {
    if (isChatOpen) {
      markAsRead(task.id);
    }
  }, [isChatOpen, task.id, markAsRead, task.comments?.length]);

  const lastReadTime = (lastReadChatTimestamps || {})[task.id] || 0;
  const unreadCount = (task.comments || []).filter(c => {
    const cTime = c.timestamp 
      ? (typeof c.timestamp === 'string' ? new Date(c.timestamp).getTime() : (c.timestamp as any).toDate?.().getTime() || Date.now()) 
      : Date.now();
    return cTime > lastReadTime && c.authorId !== user.id;
  }).length;
  const showBadge = unreadCount > 0 && !isChatOpen;

  const isRecurringTask = task.recurrence && task.recurrence !== 'NONE' && task.recurrence !== 'KHÔNG LẶP';

  const showRedAlert = () => {
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">LỖI THAO TÁC</span>,
      message: (
        <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
          <p className="text-white font-black text-lg uppercase leading-tight">
            <span translate="no" className="notranslate">ĐÂY LÀ CÔNG VIỆC ĐỊNH KỲ ĐÃ PHÁT SINH KỲ MỚI, KHÔNG THỂ HOÀN TÁC ĐỂ TRÁNH TRÙNG LẶP MÃ SỐ!</span>
          </p>
        </div>
      ),
      confirmText: <span translate="no" className="notranslate">ĐÃ HIỂU</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
      isAlert: true
    });
  };

  const highlightClass = task.highlightColor ? HIGHLIGHT_COLORS[task.highlightColor] : (task.isHighlighted ? HIGHLIGHT_COLORS['amber'] : '');

  return (
    <tr id={`task-${task.id}`} className={`hover:bg-gray-50/50 transition-all ${isSelected ? 'bg-blue-50/50' : ''} ${highlightClass}`}>
      <td className="p-1 text-center border-b border-l border-r border-gray-300 align-middle">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
         />
      </td>
      <td className="p-1 text-center text-[12px] font-bold text-gray-300 border-b border-r border-gray-300 align-top">
        <div className="flex flex-col items-center gap-1 pt-0.5 opacity-60">
          <span translate="no" className="notranslate leading-none">
            {task.code}
          </span>
          {/* Category labels removed per user request */}
          {/* Recurrence Badge for Completed Tasks */}
          {task.recurrence && task.recurrence !== 'NONE' && (
            <div className="flex flex-col items-center gap-0.5 mt-2 opacity-90" title="CÔNG VIỆC ĐỊNH KỲ">
              <RotateCcw size={14} className="text-emerald-500 animate-spin-slow" />
              <span translate="no" className="notranslate text-[9px] font-black text-emerald-700 bg-emerald-50 px-1 rounded-sm uppercase tracking-tighter border border-emerald-100">
                {task.recurrence === 'DAILY' && 'HÀNG NGÀY'}
                {task.recurrence === 'TRI_DAILY' && '2-3 NGÀY/LẦN'}
                {task.recurrence === 'WEEKLY' && 'HÀNG TUẦN'}
                {task.recurrence === 'BI_WEEKLY' && 'HÀNG 2 TUẦN'}
                {task.recurrence === 'TRI_WEEKLY' && 'HÀNG 3 TUẦN'}
                {task.recurrence === 'MONTHLY' && 'HÀNG THÁNG'}
              </span>
            </div>
          )}
        </div>
      </td>
      <td className={`p-1 border-b border-r border-gray-300 align-top h-px transition-colors ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : ''}`}>
        <div className="flex flex-col h-full gap-1.5 px-0.5 pt-0.5 pb-4">
          {/* Identity Section */}
          <div className="flex items-center gap-2">
            <Avatar src={assignee?.avatar} name={assigneeName} size="md" />
            <div className="min-w-0 flex-1">
              <p {...getSafeNameProps()} className="text-[14px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>
                <span translate="no" className="notranslate">{assigneeName}</span>
              </p>
              <div className="mt-1.5">
                <span translate="no" className="notranslate text-[11px] font-medium text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 py-0.5 rounded-sm border border-gray-100">
                  {assignee ? <span translate="no" className="notranslate">{assignee.title || assignee.role}</span> : <span translate="no" className="notranslate">NHÂN SỰ</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Timeline Section - Vertical 4 Rows */}
          <div className="flex flex-col gap-1.5 py-1.5 border-y border-gray-50 border-dashed">
            {/* Hàng 1: Khởi tạo */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" translate="no">📝</span>
              <p className="text-[11px] text-gray-500 font-medium tracking-tighter">
                <span translate="no" className="notranslate">KHỞI TẠO: {formatDate(task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 2: Bắt đầu */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]" translate="no">🚀</span>
              <p className="text-[11px] text-blue-600 font-medium tracking-tighter">
                <span translate="no" className="notranslate">BẮT ĐẦU: {formatDate(task.startDate || task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 3: Hạn */}
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]" translate="no">🏁</span>
              <p className="text-[12px] text-red-600 font-bold tracking-tighter">
                <span translate="no" className="notranslate font-bold uppercase">HẠN: {formatDate(task.expectedEndDate)}</span>
              </p>
            </div>

            {/* Hàng 4: Kết thúc thực tế (Vì đây là CompletedTaskRow) */}
            <div className="flex items-center gap-1.5">
              <span className="text-[13px]" translate="no">✅</span>
              <p className="text-[12px] font-black text-green-700 tracking-tighter leading-none">
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
                showBadge ? 'animate-bounce text-red-700 font-bold' : (task.comments?.length || 0) > 0 ? 'text-red-800 font-bold' : 'text-gray-400'
              }`}
            >
              <div className="relative">
                <MessageSquare size={16} fill={(task.comments?.length || 0) > 0 ? "currentColor" : "none"} className="opacity-90" />
                {showBadge && (
                  <span translate="no" className="notranslate absolute -top-2 -right-2 flex items-center justify-center min-w-[17px] h-[17px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full border border-white shadow-sm">
                    <span translate="no" className="notranslate font-black">{unreadCount}</span>
                   </span>
                )}
              </div>
              <span translate="no" className="notranslate text-[12px] font-black tracking-widest uppercase">
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
      <td className={`p-1.5 border-b border-r border-gray-300 relative group align-top h-px ${(!isAdmin && !isOwner) ? 'bg-gray-50' : ''}`}>
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
          <p className="text-[15px] text-blue-800 font-bold pr-4 uppercase break-words whitespace-normal leading-tight font-sans">
            <span translate="no" className="notranslate">
              [{task.category?.toUpperCase() || 'KHÁC'}] - {task.title}
            </span>
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

          {/* Result Line (Leader's Result) */}
          {task.leaderQCD && (
            <div className="mt-auto pt-2" onClick={(e) => e.stopPropagation()}>
              <hr className="my-2 border-gray-100" />
              <button 
                onClick={() => setShowAuditModal(true)}
                className={`w-full text-left p-1.5 rounded hover:bg-gray-100/50 transition-all group/result`}
              >
                {(() => {
                  const { percentage, label, colorClass } = calculateKPI(task.leaderQCD!.q, task.leaderQCD!.c, task.leaderQCD!.d);
                  return (
                    <>
                      <span translate="no" className={`notranslate font-bold text-[14px] ${colorClass}`}>
                        KẾT QUẢ: {percentage}% - {label}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5 opacity-0 group-hover/result:opacity-100 transition-opacity">
                         <Info size={10} className="text-gray-400" />
                         <span translate="no" className="notranslate text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                           Bấm để xem chi tiết đối soát Q-C-D
                         </span>
                      </div>
                    </>
                  );
                })()}
              </button>
            </div>
          )}
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
      <td className="py-1 px-1 text-center border-b border-r border-gray-300 align-middle">
        <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-0.5">
          {(isAdmin || isOwner) ? (
            <>
              {/* 1. PRIMARY ACTION (HOÀN TÁC) */}
              {isAdmin ? (
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
                          if (isRecurringTask) {
                            showRedAlert();
                            return;
                          }
                          setIsProcessing(true);
                          try {
                            await onUndo(task.id);
                          } finally {
                            setIsProcessing(false);
                          }
                        }} 
                        title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "DUYỆT HOÀN TÁC"}
                        className={`w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded-full hover:bg-green-700 transition-all shadow-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${isRecurringTask ? 'opacity-30' : ''}`}
                      >
                        <Check size={14} strokeWidth={4} />
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
                        className={`w-7 h-7 flex items-center justify-center bg-red-500 text-white rounded-full hover:bg-red-600 transition-all shadow-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <X size={14} strokeWidth={4} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    disabled={isProcessing}
                    onClick={async () => {
                      if (isProcessing) return;
                      if (isRecurringTask) {
                        showRedAlert();
                        return;
                      }
                      setIsProcessing(true);
                      try {
                        await onUndo(task.id);
                      } finally {
                        setIsProcessing(false);
                      }
                    }} 
                    title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "HOÀN TÁC CÔNG VIỆC"}
                    className={`w-7 h-7 flex items-center justify-center bg-green-600 text-white font-black rounded-md hover:bg-green-700 transition-all border-2 border-green-400 group/btn shadow-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${isRecurringTask ? 'opacity-30' : ''}`}
                  >
                    <RotateCcw size={16} strokeWidth={3} className={`group-hover/btn:-rotate-45 transition-transform ${isProcessing ? 'animate-spin' : ''}`} />
                    <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">HOÀN TÁC CÔNG VIỆC</span></span>
                  </button>
                )
              ) : isOwner && (
                task.requestUndo === 'PENDING' ? (
                  <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 animate-pulse uppercase text-center leading-tight">
                    <span translate="no" className="notranslate">Đang chờ<br/>duyệt HT</span>
                  </span>
                ) : (
                  <button 
                    disabled={isProcessing}
                    onClick={async () => {
                      if (isProcessing) return;
                      if (isRecurringTask) {
                        showRedAlert();
                        return;
                      }
                      setIsProcessing(true);
                      try {
                        await onUpdate(task.id, { requestUndo: 'PENDING' });
                      } finally {
                        setIsProcessing(false);
                      }
                    }} 
                    title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "YÊU CẦU HOÀN TÁC"}
                    className={`w-7 h-7 flex items-center justify-center bg-amber-500 text-white font-black rounded-md hover:bg-amber-600 transition-all border-2 border-amber-300 group/btn shadow-md ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''} ${isRecurringTask ? 'opacity-30' : ''}`}
                  >
                    <RotateCcw size={16} strokeWidth={3} className={`group-hover/btn:-rotate-45 transition-transform ${isProcessing ? 'animate-spin' : ''}`} />
                    <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">YÊU CẦU HOÀN TÁC</span></span>
                  </button>
                )
              )}

              {/* 2. VIEW DETAILS BUTTON (HISTORY) - SECOND */}
                <button 
                  onClick={() => onViewHistory(task.id)}
                  title="XEM CHI TIẾT CẬP NHẬT"
                  className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all group/btn border border-blue-400"
                >
                  <History size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  <span translate="no" className="sr-only notranslate"><span translate="no" className="notranslate">XEM CHI TIẾT CẬP NHẬT</span></span>
                </button>

              {/* 3. HIGHLIGHT / TAG */}
              <div className="relative">
                <button 
                   onClick={() => setShowColorPicker(!showColorPicker)}
                   title="LƯU Ý"
                   className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border-2 group/btn ${
                     task.highlightColor || task.isHighlighted
                       ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-100' 
                       : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                   }`}
                 >
                   <Tag size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
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
                  className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                >
                  <Trash2 size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                  <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XÓA CƯỠNG BỨC</span></span>
                </button>
              )}
            </>
          ) : (
            <span translate="no" className="notranslate text-gray-400 italic text-[10px]">Chỉ xem</span>
          )}
        </div>
      </td>
      <AnimatePresence>
        {showAuditModal && (
          <AuditModal 
            task={task} 
            onClose={() => setShowAuditModal(false)} 
          />
        )}
      </AnimatePresence>
    </tr>
  );
};
