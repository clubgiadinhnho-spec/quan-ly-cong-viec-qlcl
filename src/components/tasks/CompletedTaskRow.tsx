import React from 'react';
import { MessageSquare, Paperclip, Highlighter, Check, X, RotateCcw, ThumbsUp, Info, Tag, Trash2, CheckCircle2, History, Eraser, Edit3 } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AuditModal } from './AuditModal';
import { UpdateModal } from './UpdateModal';
import { AnimatePresence, motion } from 'motion/react';
import { calculateKPI } from '../../utils/taskUtils';
import { Portal } from '../common/Portal';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask, checkIsAdmin, checkIsRecurring } from '../../utils/userUtils';

import { Avatar } from '../common/Avatar';
import { ChatIconSVG } from '../common/ChatIconSVG';

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
  onSetPriority?: (id: string, order: number | null) => void;
  onDelete?: (id: string) => void;
  onEdit?: (task: Task) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  setConfirmModal: (modal: any) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
}

export const CompletedTaskRow: React.FC<CompletedTaskRowProps> = ({ 
  task, user, users, idx, onViewHistory, onOpenChat, isChatOpen, onSendMessage, onReact, onUndo, onUpdate, onSetPriority, onDelete,
  onEdit, isSelected, onToggleSelect, setConfirmModal, markAsRead, lastReadChatTimestamps
}) => {
  const chatButtonRef = React.useRef<HTMLButtonElement>(null);

  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);
  const isOwner = user?.uniqueKey === task.assigneeId || isUserTask(task, user);
  const isAdmin = checkIsAdmin(user);
  const isManager = isAdmin || user?.role === 'Trưởng Phòng';

  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [showAuditModal, setShowAuditModal] = React.useState(false);
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);

  const toHTML = (content: string) => {
    if (!content) return '';
    if (/(?:🤖|\[JOB|JOB Assist|JOB Assistant|JOB Update|JOB:|\bJOB\b|\[Robot|Robot Assist|Robot Assistant|Robot Update|Robot:|\bRobot\b)/gi.test(content)) {
      return '';
    }
    let processed = content;
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
    processed = processed.replace(/<hl>(.*?)<\/hl>/g, '<mark>$1</mark>');
    return processed;
  };

  const handleUpdateProgress = (taskId: string, htmlContent: string, aiApplied?: boolean, aiAppliedDetails?: string) => {
    onUpdate(taskId, { 
      currentUpdate: htmlContent,
      aiApplied: aiApplied ?? null,
      aiAppliedDetails: aiAppliedDetails ?? null,
      isNewUpdate: true,
      lastActionAt: new Date().toISOString(),
      lastUpdatedByRole: user.role,
      version: (task.version || 0) + 1
    });
  };

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

  const isRecurringTask = checkIsRecurring(task);

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
      <td className="p-1 text-center border border-gray-300 align-middle">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
         />
      </td>
      <td className="p-1 text-center text-[12px] font-bold text-gray-300 border border-gray-300 align-top">
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
      <td className={`p-1 border border-gray-300 align-top h-px relative transition-colors ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : ''}`}>
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
            <div className="flex items-center gap-1.5 min-h-[22px]">
              <span className="text-[13px]" translate="no">✅</span>
              <div className="flex-1">
                {(isAdmin || isManager) ? (
                  <div className="flex items-center gap-1 group/date relative">
                    <span translate="no" className="notranslate text-[12px] font-black text-green-700 tracking-tighter uppercase whitespace-nowrap">XONG:</span>
                    <div className="relative">
                      <input 
                        type="date"
                        value={task.actualEndDate || ''}
                        onChange={(e) => onUpdate(task.id, { actualEndDate: e.target.value })}
                        className="bg-green-50 border border-green-200 rounded px-1 text-[11px] font-black text-green-700 tracking-tighter w-[95px] focus:ring-1 focus:ring-green-400 focus:border-green-400 cursor-pointer outline-none transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-[12px] font-black text-green-700 tracking-tighter leading-none">
                    <span translate="no" className="notranslate uppercase">XONG: {formatDate(task.actualEndDate)}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 3. Chat Button - Floating at the bottom-right of the cell */}
          <div className="absolute bottom-1.5 right-1.5" onClick={(e) => e.stopPropagation()}>
            <button 
              ref={chatButtonRef}
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`flex items-center gap-1.5 py-0.5 px-2 transition-all rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 group/chat ${
                showBadge && isAdmin ? 'bg-red-50 text-red-700 font-bold' : (task.comments?.length || 0) > 0 ? 'bg-red-50 text-red-800 font-bold' : 'bg-white text-gray-500 hover:text-blue-600'
              }`}
            >
              <div className="flex items-center gap-1.5 relative">
                <div className="relative">
                  <ChatIconSVG size={22} className="opacity-100" />
                  {showBadge && (
                    <span translate="no" className="notranslate absolute -top-2 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-red-600 text-white text-[8px] font-black rounded-full border border-white shadow-sm z-10 animate-bounce">
                      <span translate="no" className="notranslate font-black">{unreadCount}</span>
                    </span>
                  )}
                </div>
                <span translate="no" className="notranslate text-[8px] font-black tracking-tight uppercase">
                  <span translate="no" className="notranslate">CHAT</span>
                </span>
              </div>
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
      <td className="p-1.5 border border-gray-300 relative group align-top h-px w-[30%]">
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
        <div className="flex flex-col h-[180px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pr-1 font-sans">
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
        className="p-1 border border-gray-300 align-top h-px"
        onClick={(e) => {
          e.stopPropagation();
          if (isAdmin && task.isNewUpdate) {
            onUpdate?.(task.id, { isNewUpdate: false });
          }
        }}
      >
        <div className="flex flex-col h-full min-h-[60px] relative">
          <div className="flex items-center justify-between px-2 py-0.5 border-b border-gray-50/50 bg-gray-50/20 shrink-0">
             <div className="flex items-center gap-1.5">
               <span translate="no" className="notranslate text-[9px] font-black text-blue-400 uppercase tracking-widest">Cập nhật</span>
               {task.aiApplied && (
                 <span 
                   translate="no" 
                   className="notranslate text-[9px] font-black px-1.5 py-0.2 bg-rose-600 text-white rounded-sm border border-rose-700 shadow-sm shrink-0 scale-90"
                   title={task.aiAppliedDetails || "Có ứng dụng AI"}
                 >
                   AI
                 </span>
               )}
             </div>
             {(isAdmin || isManager || isOwner) && (
               <button 
                 onClick={(e) => {
                   e.stopPropagation();
                   setShowUpdateModal(true);
                 }}
                 className="w-5 h-5 flex items-center justify-center rounded bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-100"
                 title="SỬA CẬP NHẬT (RICH TEXT)"
               >
                 <Edit3 size={11} strokeWidth={3} />
               </button>
             )}
          </div>
          <div className="flex-1 flex flex-col p-2 relative group/cell">
            <style dangerouslySetInnerHTML={{ __html: `
              .rich-text-content * { font-style: normal !important; }
            ` }} />
            <div 
              translate="no"
              className={`notranslate rich-text-content h-[130px] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-200 w-full text-[15px] font-medium outline-none leading-relaxed text-blue-950 font-sans ${isAdmin || isManager || isOwner ? 'cursor-pointer hover:bg-gray-50/50' : ''} pr-1`}
              dangerouslySetInnerHTML={{ __html: toHTML(task.currentUpdate || '') }}
              onClick={() => (isAdmin || isManager || isOwner) && setShowUpdateModal(true)}
              title={isAdmin || isManager || isOwner ? "Bấm để sửa nội dung cập nhật" : "Nội dung cập nhật"}
            />
          </div>

          <UpdateModal 
            isOpen={showUpdateModal}
            onClose={() => setShowUpdateModal(false)}
            task={task}
            onSave={handleUpdateProgress}
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
      <td className="p-1 text-center border border-gray-300 align-middle">
        <div className="relative group/priority w-full flex items-center justify-center max-w-[40px] mx-auto">
          {task.priorityOrder ? (
            <>
              <div 
                style={{ 
                  backgroundColor: `rgba(220, 38, 38, ${Math.max(0.05, 0.4 - (task.priorityOrder - 1) * 0.05)})`,
                  color: '#991b1b'
                }}
                className="text-[11px] font-black w-7 h-7 rounded-sm flex items-center justify-center border border-red-100 shadow-sm"
              >
                <span translate="no" className="notranslate">{task.priorityOrder}</span>
              </div>
              {(isAdmin || isManager) && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSetPriority?.(task.id, null);
                  }}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center border border-white opacity-0 group-hover/priority:opacity-100 transition-opacity z-10 hover:bg-black hover:scale-110 shadow-sm"
                  title="Gỡ bỏ ưu tiên"
                >
                  <X size={10} strokeWidth={4} />
                </button>
              )}
            </>
          ) : (
            <span className="text-[9px] font-bold text-gray-300">-</span>
          )}
        </div>
      </td>
      <td className="py-1 px-1 text-center border border-gray-300 align-middle">
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

              {/* 2. EDIT BUTTON (ADMIN/MANAGER ONLY) - NEW */}
              {(isAdmin || isManager) && (
                <button 
                  onClick={() => onEdit?.(task)}
                  title="CHỈNH SỬA CÔNG VIỆC"
                  className="w-7 h-7 flex items-center justify-center bg-emerald-500 text-white rounded-md border-2 border-emerald-400 shadow-sm hover:scale-105 active:scale-95 transition-all"
                >
                  <Highlighter size={16} strokeWidth={3} />
                  <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">CHỈNH SỬA</span></span>
                </button>
              )}

              {/* 3. VIEW DETAILS BUTTON (HISTORY) - SECOND */}
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
                      <>
                        <div className="fixed inset-0 z-[90]" onClick={() => setShowColorPicker(false)} />
                        <motion.div 
                          initial={{ opacity: 0, x: 10, scale: 0.9 }}
                          animate={{ opacity: 1, x: 0, scale: 1 }}
                          exit={{ opacity: 0, x: 10, scale: 0.9 }}
                          className="absolute right-full mr-2 top-0 bg-white border border-gray-200 rounded-md p-1.5 flex flex-col gap-1.5 shadow-xl z-[100] min-w-[36px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(Object.keys(HIGHLIGHT_COLORS || {})).map(color => (
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
                            className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors bg-white mt-1"
                          >
                            <Eraser size={12} strokeWidth={3} />
                          </button>
                        </motion.div>
                      </>
                    )}
                 </AnimatePresence>
              </div>

              {/* 4. FORCE DELETE (ADMIN ONLY) - NEW */}
              {isAdmin && (
                <button 
                  onClick={() => onDelete?.(task.id)}
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
            onUpdate={onUpdate}
            canEdit={isAdmin || isManager}
          />
        )}
      </AnimatePresence>
    </tr>
  );
};
