import React from 'react';
import { MessageSquare, Paperclip, X, CheckCircle, XCircle, Sparkles, RotateCcw, Trash2, Bell, RefreshCw, Highlighter, Check, ThumbsUp, CheckCircle2, Tag, Pencil, Eye, History } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate, calculateNextDeadline } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar } from '../common/Avatar';
import { CycleHistoryEntry } from '../../types';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask } from '../../utils/userUtils';

const HIGHLIGHT_COLORS: Record<string, string> = {
  'amber': '!bg-amber-50/50 hover:!bg-amber-100/60 ring-inset ring-1 ring-amber-200/30 text-amber-950',
  'emerald': '!bg-emerald-50/50 hover:!bg-emerald-100/60 ring-inset ring-1 ring-emerald-200/30 text-emerald-950',
  'blue': '!bg-blue-50/50 hover:!bg-blue-100/60 ring-inset ring-1 ring-blue-200/30 text-blue-950',
  'red': '!bg-rose-50/50 hover:!bg-rose-100/60 ring-inset ring-1 ring-rose-200/30 text-rose-950',
  'purple': '!bg-purple-50/50 hover:!bg-purple-100/60 ring-inset ring-1 ring-purple-200/40 text-purple-950',
};

interface TaskRowProps {
  task: Task;
  user: User;
  users: User[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  isChatOpen: boolean;
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onTogglePriority: (id: string) => void;
  onEdit: (task: Task) => void;
  onSetPriority?: (id: string, order: number | null) => void;
  idx: number;
  setConfirmModal: (modal: any) => void;
  isReadOnly?: boolean;
  onRestore?: (id: string) => void;
  onApprove?: (id: string) => void;
  highlightedTaskId?: string | null;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  createNotification?: (senderName: string, taskCode: string, taskId: string, type: any) => Promise<void>;
}

export const TaskRow: React.FC<TaskRowProps> = ({ 
  task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, 
  isChatOpen, onSendMessage, onReact, onTogglePriority, onSetPriority, onEdit, idx, setConfirmModal,
  isReadOnly = false, onRestore, onApprove, highlightedTaskId, isSelected, onToggleSelect,
  createNotification
}) => {
  const chatButtonRef = React.useRef<HTMLButtonElement>(null);

  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);

  // Auto-scroll when highlighted
  React.useEffect(() => {
    if (highlightedTaskId === task.id) {
      const element = document.getElementById(`task-${task.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedTaskId, task.id]);

  const isOwner = user?.uniqueKey === task.assigneeId || isUserTask(task, user);
  const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.uniqueKey === 'LeNhatTruong09xxxxxxxx' || user.name === 'Lê Nhật Trường';
  const isAuthor = task.authorId === user.id || task.authorId === user.uniqueKey;
  const canApprove = isAdmin || !!user.delegatedPermissions?.canApproveTask;
  const canDelete = isAdmin || !!user.delegatedPermissions?.canDeleteTask;
  const isManager = isAdmin || !!user.delegatedPermissions?.canCreateTask;
  const isEmployee = user.role === 'Staff';
  
  const canEditPriority = isAdmin;
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

  const getPriorityRowClass = (priority: number | undefined) => {
    return '';
  };

  const priorityRowClass = getPriorityRowClass(task.priorityOrder);
  const highlightClass = task.highlightColor ? HIGHLIGHT_COLORS[task.highlightColor] : (task.isHighlighted ? HIGHLIGHT_COLORS['amber'] : '');
  const finalRowClass = highlightClass || priorityRowClass || 'hover:bg-gray-50/50';

  // Deadline Warning Logic
  const getDeadlineStatus = (): 'overdue' | 'warning' | null => {
    if (task.status === 'COMPLETED' || !task.issueDate || (!task.expectedEndDate && !task.extensionDate)) return null;
    const finalDeadline = task.extensionDate || task.expectedEndDate;
    if (!finalDeadline) return null;
    
    const end = new Date(finalDeadline).getTime();
    const now = new Date().getTime();
    
    if (now >= end) return 'overdue';
    
    const start = new Date(task.issueDate).getTime();
    const totalDuration = end - start;
    if (totalDuration <= 0) return null;
    
    const remainingTime = end - now;
    const remainingPercent = (remainingTime / totalDuration) * 100;
    
    return remainingPercent <= 20 ? 'warning' : null;
  };

  const deadlineStatus = getDeadlineStatus();

  const isFreshUpdate = task.isNewUpdate && task.lastUpdatedByRole !== user.role && (
    isAdmin || isOwner
  );

  const isTrulyNew = task.isNewInBoard && task.lastUpdatedByRole !== user.role && isOwner;

  const isNewInBoard = task.isNewInBoard && isAdmin;

  const handleConfirmTask = (approve: boolean) => {
    if (approve) {
      onUpdate(task.id, { 
        status: 'APPROVED', 
        isNewInBoard: true,
        updatedAt: new Date().toISOString()
      });
    } else {
      onDelete(task.id);
    }
  };

  const handleStatusAction = () => {
    // Staff sends completion request
    if (!isAdmin) {
      if (!isOwner) return; // Chỉ người được giao việc mới được gửi hoàn thành
      if (task.waitingApproval) return; // Already sent
      onUpdate(task.id, { 
        waitingApproval: true,
        isNewUpdate: true,
        updatedAt: new Date().toISOString()
      });
      if (createNotification) {
        createNotification(user.name, task.code, task.id, 'COMPLETED_REQUEST');
      }
    } else {
      // Admin approves completion
      setConfirmModal({
        show: true,
        title: 'XÁC NHẬN HOÀN THÀNH',
        message: 'Bạn muốn chốt công việc này đã hoàn thành?',
        onConfirm: () => {
          if (task.recurrence && task.recurrence !== 'NONE') {
            // Recurring task logic
            const currentDeadline = task.extensionDate || task.expectedEndDate;
            const nextDeadline = calculateNextDeadline(currentDeadline || new Date().toISOString().split('T')[0], task.recurrence);
            
            const newHistory: CycleHistoryEntry = {
              version: (task.cycleHistory?.length || 0) + 1,
              reportContent: task.currentUpdate,
              completedAt: new Date().toISOString(),
              nextDeadline: nextDeadline
            };

            onUpdate(task.id, {
              cycleHistory: [...(task.cycleHistory || []), newHistory],
              expectedEndDate: nextDeadline,
              extensionDate: null,
              prevProgress: task.currentUpdate,
              currentUpdate: '',
              isNewUpdate: false,
              waitingApproval: false,
              updatedAt: new Date().toISOString()
            });
          } else {
            // One-time task logic
            onUpdate(task.id, { 
              status: 'COMPLETED', 
              actualEndDate: new Date().toISOString().split('T')[0], 
              isLocked: true,
              waitingApproval: false,
              updatedAt: new Date().toISOString()
            });
          }
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      });
    }
  };

  const handleApprove = () => {
    onUpdate(task.id, { 
      status: 'APPROVED', 
      isNewInBoard: true,
      updatedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString()
    });
  };

  return (
    <motion.tr 
      id={`task-${task.id}`}
      initial={false}
      animate={{ 
        backgroundColor: highlightedTaskId === task.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        boxShadow: highlightedTaskId === task.id ? 'inset 0 0 0 2px rgba(59, 130, 246, 0.5)' : 'inset 0 0 0 0px transparent'
      }}
      transition={{ duration: 0.4 }}
      className={`group transition-all ${finalRowClass} relative ${highlightedTaskId === task.id ? 'z-10' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
    >
      <td className="p-2 text-center border border-gray-300 align-middle w-[40px]">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3.5 h-3.5 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
         />
      </td>
      <td className={`p-2 text-center text-[10px] border border-gray-300 align-top relative h-px ${task.isHighlighted || task.priorityOrder ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex flex-col items-center pt-1 h-full justify-between">
          <div className="flex flex-col items-center gap-1 mb-3">
            <div translate="no" className="notranslate leading-none text-[10px] font-mono font-black text-blue-600 bg-blue-50/50 px-1 py-0.5 rounded-sm border border-blue-100/50">
              <span translate="no" className="notranslate">{task.code}</span>
            </div>
            {task.category && (
              <div translate="no" className="notranslate leading-none text-[9px] font-mono font-black text-white bg-indigo-500 px-1 py-0.5 rounded-sm border border-indigo-400" title="PHÂN LOẠI">
                <span translate="no" className="notranslate font-bold text-[10px]">{task.category}</span>
              </div>
            )}
            {task.recurrence && task.recurrence !== 'NONE' && (
              <div className="flex flex-col items-center gap-1">
                <RefreshCw size={11} className="text-emerald-500 animate-[spin_4s_linear_infinite]" strokeWidth={3} />
                <span translate="no" className="notranslate text-[7px] font-black text-emerald-600 leading-none uppercase bg-emerald-50 px-1 py-0.5 rounded-sm border border-emerald-100">
                  {task.recurrence === 'DAILY' && <span translate="no" className="notranslate">HÀNG NGÀY</span>}
                  {task.recurrence === 'TRI_DAILY' && <span translate="no" className="notranslate">2-3 NGÀY/LẦN</span>}
                  {task.recurrence === 'WEEKLY' && <span translate="no" className="notranslate">HÀNG TUẦN</span>}
                  {task.recurrence === 'BI_WEEKLY' && <span translate="no" className="notranslate">HÀNG 2 TUẦN</span>}
                  {task.recurrence === 'TRI_WEEKLY' && <span translate="no" className="notranslate">HÀNG 3 TUẦN</span>}
                  {task.recurrence === 'MONTHLY' && <span translate="no" className="notranslate">HÀNG THÁNG</span>}
                </span>
              </div>
            )}
          </div>
          {deadlineStatus && (
            <div className="flex flex-col items-center gap-1.5 transition-all mt-auto mb-1">
              <div 
                className={`animate-[pulse_0.6s_infinite] p-1.5 rounded-sm border-2 ${
                  deadlineStatus === 'overdue' 
                    ? 'text-red-700 bg-red-100 border-red-300' 
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                }`}
                title={deadlineStatus === 'overdue' ? 'CẢNH BÁO: ĐÃ QUÁ HẠN!' : 'CẢNH BÁO: Sắp đến hạn (còn dưới 20% thời gian)'}
              >
                <Bell size={16} fill="currentColor" />
              </div>
              <span translate="no" className={`notranslate text-[7px] font-black uppercase leading-none tracking-tight ${
                deadlineStatus === 'overdue' ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {deadlineStatus === 'overdue' ? 'QUÁ HẠN' : 'SẮP HẾT HẠN'}
              </span>
            </div>
          )}
          {isTrulyNew && (
            <div className="bg-amber-100 text-amber-600 p-0.5 rounded-sm animate-bounce" title="Lính mới / Việc mới xác nhận">
              <Sparkles size={8} strokeWidth={3} />
            </div>
          )}
        </div>
      </td>
      <td 
        className={`p-1.5 border border-gray-300 align-top h-px transition-colors ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : isNewInBoard ? 'border-l-4 border-emerald-500 bg-emerald-50/10' : ''}`}
      >
        <div className="flex flex-col h-full gap-2 px-0.5 pt-1">
          {/* 1. Identity Section - Avatar & Name on same row */}
          <div className="flex items-center gap-2">
            <Avatar src={assignee?.avatar} name={assigneeName} size="xs" />
            <div className="min-w-0 flex-1">
              <p {...getSafeNameProps()} className="text-[13px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>
                <span translate="no" className="notranslate">{assigneeName}</span>
              </p>
              <div className="mt-1.5">
                <span translate="no" className="notranslate text-[10px] font-medium text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 py-0.5 rounded-sm border border-gray-100">
                  {assignee ? (assignee.title || assignee.role) : 'NHÂN SỰ'}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Timeline Section - Vertical 4 Rows */}
          <div className="flex flex-col gap-1 py-1.5 border-y border-gray-50 border-dashed">
            {/* Hàng 1: Khởi tạo */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">📝</span>
              <p className="text-[10px] text-gray-500 font-medium tracking-tighter">
                <span translate="no" className="notranslate">KHỞI TẠO: {formatDate(task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 2: Bắt đầu */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px]">🚀</span>
              <p className="text-[10px] text-blue-600 font-medium tracking-tighter">
                <span translate="no" className="notranslate">BẮT ĐẦU: {formatDate(task.startDate || task.issueDate)}</span>
              </p>
            </div>
            
            {/* Hàng 3: Hạn */}
            <div className="flex items-center gap-1.5">
              <span className="text-[12px]">🏁</span>
              <p className="text-[11px] text-red-600 font-bold tracking-tighter">
                <span translate="no" className="notranslate font-bold uppercase">HẠN: {formatDate(task.expectedEndDate)}</span>
              </p>
            </div>

            {/* Hàng 4: Gia hạn (Nếu có) */}
            {task.extensionDate && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px]">🔄</span>
                <p className="text-[10px] text-orange-600 font-medium tracking-tighter">
                  <span translate="no" className="notranslate uppercase font-medium">GIA HẠN: {formatDate(task.extensionDate)}</span>
                </p>
              </div>
            )}
          </div>

          {/* 3. Chat Button - Ultra Minimal */}
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
            className="absolute top-1 right-3 p-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-all z-10"
          >
            <Paperclip size={10} strokeWidth={3} />
          </a>
        )}

        {(isManager || isOwner) && (
          <button 
            onClick={() => onEdit(task)}
            className="absolute top-1 right-1 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="CHỈNH SỬA NỘI DUNG & GIA HẠN"
          >
            <Pencil size={12} strokeWidth={3} />
          </button>
        )}

        <div className="flex flex-col h-full font-sans">
          <p className="text-[15px] font-black text-gray-900 leading-tight pr-5 uppercase break-words whitespace-normal font-sans">
            {isTrulyNew && (
              <span 
                translate="no" 
                className="notranslate inline-block bg-red-600 text-white text-[9px] font-black px-1 py-0.5 rounded-sm mr-1 animate-pulse uppercase cursor-pointer"
                onClick={() => onUpdate(task.id, { isNewInBoard: false })}
              >
                NEW
              </span>
            )}
            {isNewInBoard && (
              <span className="inline-flex items-center mr-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-1 ring-emerald-100" />
              </span>
            )}
            <span translate="no" className="notranslate">{task.title}</span>
          </p>
          
          <div className="text-[15px] text-gray-900 leading-tight mt-2 break-words whitespace-normal flex-1 font-sans pr-5">
            <span translate="no" className="notranslate font-bold">MỤC TIÊU: </span>
            <span translate="no" className="notranslate">{task.objective}</span>
          </div>
          
          <div className="mt-1 flex items-center gap-1">
              {task.status === 'PENDING_APPROVAL' && (
                <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1 py-0.2 rounded-sm animate-pulse border border-amber-100 uppercase tracking-tighter">DUYỆT</span>
              )}
          </div>
        </div>
      </td>

      <td 
        className={`p-1 border border-gray-300 align-top h-px ${(!isAdmin && !isOwner) ? 'bg-gray-50' : 'bg-gray-50/10'}`}
        onClick={(e) => {
          e.stopPropagation();
          // Logic for Admin to mark as seen
          if (isAdmin && task.isNewUpdate) {
            onUpdate(task.id, { isNewUpdate: false });
          }
        }}
      >
        <div className="flex flex-col gap-1 h-full min-h-[60px]">
            <textarea 
              translate="no"
              readOnly={!isAdmin && !isOwner}
              className={`notranslate flex-1 w-full text-[15px] font-medium p-1.5 rounded-sm outline-none transition-all resize-none leading-tight min-h-[60px] placeholder:font-normal text-blue-950 font-sans ${
                (!isAdmin && !isOwner) ? 'bg-gray-50 cursor-not-allowed' : 'bg-transparent cursor-text'
              } ${
                task.isNewUpdate 
                  ? 'border-2 border-blue-700 shadow-none' 
                  : 'border border-gray-200 shadow-none'
              }`}
              placeholder={(!isAdmin && !isOwner) ? "Chỉ xem..." : "Nhập báo cáo tiến độ tại đây..."}
              defaultValue={task.currentUpdate}
              onBlur={(e) => {
                const newValue = e.target.value;
                if (newValue !== task.currentUpdate) {
                  onUpdate(task.id, { 
                    currentUpdate: newValue,
                    isNewUpdate: true,
                    version: (task.version || 0) + 1
                  });
                }
              }}
              onMouseLeave={() => {
                if (isAdmin && task.isNewUpdate) {
                  onUpdate(task.id, { isNewUpdate: false });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.currentTarget.blur();
                }
              }}
              title="GÕ TRỰC TIẾP ĐỂ CẬP NHẬT TIẾN ĐỘ"
            />
        </div>
      </td>
      <td className="p-0 text-center border border-gray-300 align-middle">
        <div className="relative group/priority w-full h-full min-h-[32px] flex items-center justify-center p-1">
          <button 
            onClick={canEditPriority && !task.priorityOrder ? () => onTogglePriority(task.id) : undefined}
            disabled={!canEditPriority && !task.priorityOrder}
            className={`w-[32px] h-[32px] flex flex-col items-center justify-center transition-all rounded-md border-2 ${
              task.priorityOrder 
                ? `${
                    task.priorityOrder === 1 ? 'bg-red-50 text-red-700 border-red-200' :
                    task.priorityOrder === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    task.priorityOrder === 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    task.priorityOrder === 4 ? 'bg-green-50 text-green-700 border-green-200' :
                    task.priorityOrder === 5 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    task.priorityOrder === 6 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  } font-black` 
                : 'text-gray-200 hover:text-red-500 hover:bg-red-50 border-gray-100 border-dashed'
            } ${!canEditPriority ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            {task.priorityOrder ? (
              <span className="text-[16px] leading-none font-black"><span translate="no" className="notranslate">{task.priorityOrder}</span></span>
            ) : (
              <span className="text-[10px] opacity-20">—</span>
            )}
          </button>
          
          {canEditPriority && task.priorityOrder && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSetPriority && onSetPriority(task.id, null);
              }}
              className="absolute top-1 right-1 w-3.5 h-3.5 bg-gray-600/80 text-white rounded-full flex items-center justify-center border border-white opacity-0 group-hover/priority:opacity-100 transition-opacity z-10 hover:bg-red-600"
              title="Bỏ ưu tiên"
            >
              <X size={8} strokeWidth={4} />
            </button>
          )}
        </div>
      </td>
      <td className="py-2 px-1 text-center border border-gray-300 align-middle">
          <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-1">
            {(isAdmin || isOwner) ? (
              <>
                {/* 1. PRIMARY ACTION (CHECKMARK) - NOW ON TOP */}
                {!isReadOnly && (
                  <>
                    {/* TRẠNG THÁI: APPROVED - NÚT XONG */}
                    {task.status === 'APPROVED' && !task.isLocked && (
                      <button 
                        onClick={handleStatusAction}
                        title={isAdmin ? 'XÁC NHẬN HOÀN THÀNH' : 'GỬI HOÀN THÀNH'}
                        className={`w-10 h-10 flex items-center justify-center rounded-md transition-all group/btn border-2 ${
                          isAdmin 
                            ? (task.waitingApproval ? 'bg-blue-600 animate-bounce border-blue-400' : 'bg-green-600 hover:bg-green-700 border-green-400') 
                            : (task.waitingApproval ? 'bg-green-500 cursor-default opacity-50' : 'bg-green-600 hover:bg-green-700 border-green-400')
                        } text-white`}
                      >
                        <CheckCircle2 size={24} strokeWidth={3} className={`${task.waitingApproval ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                        <span className="sr-only notranslate" translate="no">XONG</span>
                      </button>
                    )}

                    {/* TRẠNG THÁI: PENDING - NÚT DUYỆT */}
                    {task.status === 'PENDING' && canApprove && (
                      <button 
                        onClick={handleApprove}
                        className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 transition-all group/btn border-2 border-green-400"
                        title="DUYỆT"
                      >
                        <CheckCircle2 size={24} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                        <span className="sr-only notranslate" translate="no">DUYỆT</span>
                      </button>
                    )}

                    {/* TRẠNG THÁI: AWAITING_CONFIRMATION - NÚT XÁC NHẬN */}
                    {task.status === 'AWAITING_CONFIRMATION' && isManager && (
                      <button 
                        onClick={() => handleConfirmTask(true)}
                        title="XÁC NHẬN"
                        className="w-10 h-10 flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 transition-all group/btn border-2 border-green-400"
                      >
                        <ThumbsUp size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                        <span className="sr-only notranslate" translate="no">XÁC NHẬN</span>
                      </button>
                    )}
                  </>
                )}

                {/* 2. VIEW DETAILS BUTTON (HISTORY) - NOW SECOND POSITION */}
                <button 
                  onClick={() => onViewHistory(task.id)}
                  title="XEM CHI TIẾT CẬP NHẬT"
                  className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all group/btn border border-blue-400"
                >
                  <History size={20} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  <span className="sr-only notranslate" translate="no">XEM CHI TIẾT CẬP NHẬT</span>
                </button>

                {/* REST OF THE BUTTONS */}
                {!isReadOnly && (
                  <>
                    {/* THÙNG RÁC: Trạng thái DELETED hoặc có deletedAt */}
                    {(task.status === 'DELETED' || !!task.deletedAt) ? (
                      <div className="flex flex-col gap-1.5 w-full items-center">
                        <button 
                          onClick={() => onRestore && onRestore(task.id)}
                          title="PHỤC HỒI"
                          className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all group/btn border-2 border-emerald-400"
                        >
                          <RotateCcw size={20} strokeWidth={3} className="group-hover:rotate-45 transition-transform" />
                          <span className="sr-only notranslate" translate="no">PHỤC HỒI</span>
                        </button>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => onDelete && onDelete(task.id)}
                            title="XÓA VĨNH VIỄN"
                            className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                          >
                            <Trash2 size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="sr-only notranslate" translate="no">XÓA VĨNH VIỄN</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* KHỐI SỬA CHO PENDING (HIỂN THỊ SAU HISTORY) */}
                        {task.status === 'PENDING' && (
                          <div className="flex flex-col gap-1.5 w-full items-center">
                            {(isOwner || isManager) && (
                              <button 
                                onClick={() => onEdit(task)}
                                className="w-10 h-10 flex items-center justify-center bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all group/btn border-2 border-emerald-400"
                                title="SỬA"
                              >
                                <Pencil size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                <span className="sr-only notranslate" translate="no">SỬA</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* KHỐI HIGHLIGHT CHO APPROVED (HIỂN THỊ SAU HISTORY) */}
                        {task.status === 'APPROVED' && (
                          <div className="flex flex-col gap-1.5 w-full items-center">
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
                                <span className="sr-only notranslate" translate="no">LƯU Ý</span>
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
                                      className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                                    >
                                      <X size={12} strokeWidth={3} />
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}

                        {/* HIỂN THỊ NÚT XÓA: CHỈ ADMIN */}
                        {isAdmin && (
                          <button 
                            onClick={() => onDelete(task.id)}
                            className="w-10 h-10 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                            title="XÓA"
                          >
                            <Trash2 size={22} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                            <span className="sr-only notranslate" translate="no">XÓA</span>
                          </button>
                        )}

                        {/* HOÀN TÁC CÔNG VIỆC TỪ COMPLETED (TRONG TRƯỜNG HỢP ADMIN XEM BẢNG CHÍNH NHƯNG CÓ VIỆC COMPLETED) */}
                        {task.status === 'COMPLETED' && isAdmin && (
                          <button 
                            onClick={() => {
                              setConfirmModal({
                                show: true,
                                title: 'HOÀN TÁC CÔNG VIỆC',
                                message: 'Bạn muốn chuyển công việc này quay lại bảng đang thực hiện?',
                                onConfirm: () => {
                                  onUpdate(task.id, { 
                                    status: 'APPROVED', 
                                    actualEndDate: null, 
                                    isLocked: false,
                                    currentUpdate: '[HOÀN TÁC] Chuyển về bảng đang thực hiện'
                                  });
                                  setConfirmModal((p: any) => ({ ...p, show: false }));
                                }
                              });
                            }}
                            title="HOÀN TÁC"
                            className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 border-2 border-gray-200 rounded-md hover:bg-gray-200 transition-all group/btn"
                          >
                            <RotateCcw size={20} strokeWidth={3} className="group-hover:rotate-45 transition-transform" />
                            <span className="sr-only notranslate" translate="no">HOÀN TÁC</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <span translate="no" className="notranslate text-gray-400 italic text-[10px]">Chỉ xem</span>
            )}
          </div>
        </td>

    </motion.tr>
  );
};
