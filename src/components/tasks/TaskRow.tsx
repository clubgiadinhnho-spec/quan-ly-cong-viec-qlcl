import React from 'react';
import { MessageSquare, Paperclip, X, CheckCircle, XCircle, Sparkles, RotateCcw, Trash2, Bell, RefreshCw, Highlighter, Check, ThumbsUp } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar } from '../common/Avatar';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask } from '../../utils/userUtils';

const HIGHLIGHT_COLORS: Record<string, string> = {
  'amber': '!bg-amber-100 hover:!bg-amber-200 ring-inset ring-2 ring-amber-400/50',
  'emerald': '!bg-emerald-100 hover:!bg-emerald-200 ring-inset ring-2 ring-emerald-400/50',
  'blue': '!bg-blue-100 hover:!bg-blue-200 ring-inset ring-2 ring-blue-400/50',
  'red': '!bg-red-100 hover:!bg-red-200 ring-inset ring-2 ring-red-400/50',
  'purple': '!bg-purple-100 hover:!bg-purple-200 ring-inset ring-2 ring-purple-400/50',
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
  highlightedTaskId?: string | null;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ 
  task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, 
  isChatOpen, onSendMessage, onReact, onTogglePriority, onSetPriority, onEdit, idx, setConfirmModal,
  isReadOnly = false, onRestore, highlightedTaskId, isSelected, onToggleSelect
}) => {
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

  const isOwner = isUserTask(task, user);
  const isAdmin = user.role === 'Admin';
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

  const handleConfirmTask = (approve: boolean) => {
    if (approve) {
      onUpdate(task.id, { 
        status: 'IN_PROGRESS', 
        isNewSoldier: true,
        updatedAt: new Date().toISOString()
      });
    } else {
      onDelete(task.id);
    }
  };

  const handleStatusAction = () => {
    // Managers/Owners can mark as pending approval
    if (!canApprove) {
      onUpdate(task.id, { status: 'PENDING_APPROVAL' });
    } else if (canApprove) {
      setConfirmModal({
        show: true,
        title: 'XÁC NHẬN HOÀN THÀNH',
        message: 'Bạn muốn chốt công việc này đã hoàn thành?',
        onConfirm: () => {
          onUpdate(task.id, { status: 'COMPLETED', actualEndDate: new Date().toISOString().split('T')[0], isLocked: true });
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      });
    }
  };

  const handleApprove = () => {
    onUpdate(task.id, { status: 'COMPLETED', actualEndDate: new Date().toISOString().split('T')[0], isLocked: true });
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
      <td className="p-2 text-center border-b border-l border-r border-gray-300 align-middle">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer shadow-sm transition-all"
         />
      </td>
      <td className={`p-2 text-center text-[10px] border-b border-r border-gray-300 align-top relative h-px ${task.isHighlighted || task.priorityOrder ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex flex-col items-center pt-1 h-full justify-between">
          <div className="flex flex-col items-center gap-1 mb-3">
            <div translate="no" className="notranslate leading-none text-[10px] font-mono font-black text-blue-600 bg-blue-50/50 px-1 py-0.5 rounded border border-blue-100/50">{task.code}</div>
            {task.recurrence && task.recurrence !== 'NONE' && (
              <div className="flex flex-col items-center gap-1">
                <RefreshCw size={11} className="text-emerald-500 animate-[spin_4s_linear_infinite]" strokeWidth={3} />
                <span translate="no" className="notranslate text-[7px] font-black text-emerald-600 leading-none uppercase bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 shadow-sm">
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
                className={`animate-[pulse_0.6s_infinite] p-1.5 rounded-full shadow-md border-2 ${
                  deadlineStatus === 'overdue' 
                    ? 'text-red-700 bg-red-100 border-red-300 shadow-red-100' 
                    : 'text-emerald-700 bg-emerald-50 border-emerald-200 shadow-emerald-100'
                }`}
                title={deadlineStatus === 'overdue' ? 'CẢNH BÁO: ĐÃ QUÁ HẠN!' : 'CẢNH BÁO: Sắp đến hạn (còn dưới 20% thời gian)'}
              >
                <Bell size={16} fill="currentColor" className={deadlineStatus === 'overdue' ? 'drop-shadow-[0_0_8px_rgba(220,38,38,0.8)]' : 'drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'} />
              </div>
              <span translate="no" className={`notranslate text-[7px] font-black uppercase leading-none tracking-tight ${
                deadlineStatus === 'overdue' ? 'text-red-700' : 'text-emerald-700'
              }`}>
                {deadlineStatus === 'overdue' ? 'QUÁ HẠN' : 'SẮP HẾT HẠN'}
              </span>
            </div>
          )}
          {task.isNewSoldier && (
            <div className="bg-amber-100 text-amber-600 p-0.5 rounded-full animate-bounce" title="Lính mới / Việc mới xác nhận">
              <Sparkles size={8} strokeWidth={3} />
            </div>
          )}
        </div>
      </td>
      <td 
        className={`p-2 border-b border-r border-gray-300 align-top h-px ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : ''} ${isManager ? 'cursor-pointer hover:bg-blue-50/50' : ''}`}
        onClick={() => isManager && onEdit(task)}
      >
        <div className="flex flex-col h-full gap-1">
          <div className="flex items-start gap-1.5">
            <div className="relative flex-shrink-0">
              <Avatar src={assignee?.avatar} name={assigneeName} size="sm" />
              {isManager && (
                <div className="absolute -top-1 -left-1 w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center border border-white shadow-sm">
                  <span className="text-[6px]">✎</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p {...getSafeNameProps()} className="text-[12px] font-black text-gray-900 leading-none truncate notranslate" title={assigneeName}>
                  <span translate="no" className="notranslate">{assigneeName}</span>
                </p>
              </div>
              <p className="text-[6px] font-black text-black uppercase tracking-widest leading-none mt-1 whitespace-nowrap">
                <span translate="no" className="notranslate">{assignee ? (assignee.title || assignee.role) : 'NHÂN SỰ'}</span>
              </p>
              <div className="flex flex-col gap-1.5 mt-2">
                <p className="text-[9px] text-gray-500 font-bold opacity-80 leading-tight">
                  <span translate="no" className="notranslate">GIAO:</span> {formatDate(task.issueDate)}
                </p>
                <p className={`text-[10px] font-black leading-tight ${
                  deadlineStatus === 'overdue' && !task.extensionDate 
                    ? 'text-red-700 underline' 
                    : deadlineStatus === 'warning'
                      ? 'text-emerald-700'
                      : 'text-blue-700'
                }`}>
                  <span translate="no" className="notranslate">HẠN:</span> {formatDate(task.expectedEndDate)}
                </p>
                {(() => {
                  const extensions = (task.history || []).filter(h => h.content?.includes('Gia hạn công việc đến'));
                  const extensionCount = extensions.length;
                  if (task.extensionDate) {
                    return (
                      <p className={`text-[10px] font-black leading-tight text-red-600 animate-pulse underline`}>
                        <span translate="no" className="notranslate">GIA HẠN</span> {extensionCount > 0 ? `(V${extensionCount})` : ''}: {formatDate(task.extensionDate)}
                      </p>
                    );
                  } else if (isManager) {
                    return (
                      <p className="text-[9px] font-bold text-gray-300 hover:text-red-400 italic transition-colors">
                        <span translate="no" className="notranslate">GIA HẠN: --</span>
                      </p>
                    );
                  }
                  return null;
                })()}
                <div className="relative mt-1" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
                    className={`relative p-1 px-2 rounded-md transition-all w-fit flex items-center gap-1.5 border ${
                      isChatOpen 
                        ? 'text-blue-700 bg-blue-100 shadow-inner border-blue-200' 
                        : showBadge
                          ? 'text-white bg-red-600 border-red-400 animate-[pulse_0.8s_infinite] shadow-[0_0_15px_rgba(220,38,38,0.4)]'
                          : (task.comments?.length || 0) > 0
                            ? 'text-red-600 bg-red-50 border-red-200 animate-[pulse_2s_infinite]'
                            : 'text-blue-600 hover:bg-blue-50 border-blue-100 bg-white'
                    }`}
                  >
                    <MessageSquare size={14} fill={showBadge ? "white" : (task.comments?.length || 0) > 0 ? "rgba(220, 38, 38, 0.1)" : "none"} />
                    <span translate="no" className="notranslate text-[10px] font-black tracking-tight uppercase">CHAT</span>
                    {showBadge && (
                      <span className="absolute -top-2 -right-2 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-white text-red-600 text-[10px] font-black rounded-full shadow-lg animate-bounce border-2 border-red-600 z-20">
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
            </div>
          </div>

          {(task.history || []).filter(h => h.content?.includes('Gia hạn công việc đến')).length > 0 && (
            <div className="mt-auto px-1 py-0.5 bg-red-50/30 rounded border border-red-100/30">
              <div className="flex justify-between items-center mb-0.5">
                <p translate="no" className="notranslate text-[7px] font-black text-red-600 uppercase tracking-tighter font-sans">Lịch sử gia hạn:</p>
                <p translate="no" className="notranslate text-[7px] font-black text-red-500 bg-red-50/50 px-0.5 rounded leading-none uppercase tracking-tighter font-sans">GH V{(task.history || []).filter(h => h.content?.includes('Gia hạn công việc đến')).length}</p>
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                {(task.history || [])
                  .filter(h => h.content?.includes('Gia hạn công việc đến'))
                  .slice(-3)
                  .reverse()
                  .map((h, i, arr) => (
                    <p key={i} className="text-[7px] text-red-500 font-bold italic leading-none truncate whitespace-nowrap font-sans">
                      V{arr.length - i}: {h.content?.split(': ')[1]}
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
          {isManager ? (
             <div className="relative">
              <textarea 
                className="text-[11px] font-black text-gray-900 bg-transparent border-b border-transparent focus:border-blue-400 outline-none w-full py-0 pr-4 uppercase break-words resize-none overflow-hidden leading-tight min-h-[1rem] font-sans"
                defaultValue={task.title}
                rows={1}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                onBlur={(e) => {
                  if (e.target.value !== task.title) {
                    onUpdate(task.id, { title: e.target.value });
                  }
                }}
              />
              <button 
                onClick={() => onEdit(task)}
                className="absolute top-0 right-0 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="text-[8px]">✎</span>
              </button>
             </div>
          ) : (
            <p className="text-[11px] font-black text-gray-900 leading-tight pr-4 uppercase break-words whitespace-normal font-sans">{task.title}</p>
          )}
          <p className="text-[10px] font-black text-gray-900 leading-tight mt-1 break-words whitespace-normal flex-1 font-sans">{task.objective}</p>
          
          {(task.history || []).length > 1 && (
            <div className="mt-auto px-1 py-0.5 bg-blue-50/30 rounded border border-blue-100/30 flex justify-between items-center group/history cursor-help" title={(task.history || [])[(task.history || []).length - 2]?.content}>
              <div className="flex flex-col min-w-0">
                <p translate="no" className="notranslate text-[7px] font-black text-blue-600 uppercase tracking-tighter leading-none mb-0.5 font-sans">Lần cập trước:</p>
                <p className="text-[8px] text-gray-500 line-clamp-1 italic leading-none truncate font-sans">
                  {((task.history || [])[(task.history || []).length - 2]?.content || '').replace('Cập nhật tiến độ: ', '') || 'Khởi tạo'}
                </p>
              </div>
              <p className="text-[7px] font-black text-blue-400 bg-blue-50/50 px-0.5 rounded leading-none uppercase tracking-tighter shrink-0 ml-1 font-sans">V{(task.history || []).length - 1}</p>
            </div>
          )}
          
          <div className="mt-1 flex items-center gap-1">
              {task.status === 'PENDING_APPROVAL' && (
                <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1 py-0.2 rounded animate-pulse border border-amber-100 uppercase tracking-tighter">DUYỆT</span>
              )}
          </div>
        </div>
      </td>
      <td className="p-1 border-b border-r border-gray-300 align-top h-px">
        <div className="h-full min-h-[60px] text-[10px] text-gray-700 leading-tight px-1 py-1 rounded border border-gray-100/50 break-words whitespace-normal font-medium">
          {task.prevProgress || ''}
        </div>
      </td>
      <td className="p-1 border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col gap-1 h-full min-h-[60px]">
          <textarea 
            className="flex-1 w-full text-[10px] font-medium p-1.5 bg-white/40 border border-gray-200 rounded shadow-sm outline-none focus:border-blue-500 transition-all resize-none leading-tight min-h-[60px] disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:shadow-none placeholder:font-normal text-gray-800"
            placeholder="..."
            defaultValue={task.currentUpdate}
            onBlur={(e) => {
              if (e.target.value !== (task.currentUpdate || '')) {
                onUpdate(task.id, { currentUpdate: e.target.value });
              }
            }}
            disabled={task.isLocked || (!isOwner && !isManager)}
          />
          <div className="flex items-center justify-between px-1 mt-auto pt-1 border-t border-gray-50 border-dotted">
            <span translate="no" className="notranslate text-[7px] px-0.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{(task.history || []).length || 1}</span>
            <button onClick={() => onViewHistory(task.id)} className="text-[8px] text-blue-500 hover:underline font-extrabold uppercase tracking-tighter">
              <span translate="no" className="notranslate">XEM LỊCH SỬ</span>
            </button>
          </div>
        </div>
      </td>
      <td className="p-0 text-center border-b border-r border-gray-300 align-middle">
        <div className="relative group/priority w-full h-full min-h-[32px] flex items-center justify-center p-1">
          <button 
            onClick={canEditPriority && !task.priorityOrder ? () => onTogglePriority(task.id) : undefined}
            disabled={!canEditPriority && !task.priorityOrder}
            className={`w-[32px] h-[32px] flex flex-col items-center justify-center transition-all rounded-lg shadow-lg border-2 ${
              task.priorityOrder 
                ? `${
                    task.priorityOrder === 1 ? 'bg-red-600 text-white border-red-400' :
                    task.priorityOrder === 2 ? 'bg-orange-500 text-white border-orange-300 ring-4 ring-orange-50' :
                    task.priorityOrder === 3 ? 'bg-yellow-400 text-black border-yellow-200 ring-4 ring-yellow-50' :
                    task.priorityOrder === 4 ? 'bg-green-500 text-white border-green-300 ring-4 ring-green-50' :
                    task.priorityOrder === 5 ? 'bg-blue-500 text-white border-blue-300 ring-4 ring-blue-50' :
                    task.priorityOrder === 6 ? 'bg-indigo-600 text-white border-indigo-400 ring-4 ring-indigo-50' :
                    'bg-purple-600 text-white border-purple-400 ring-4 ring-purple-50'
                  } font-black` 
                : 'text-gray-200 hover:text-red-500 hover:bg-red-50 border-gray-100 border-dashed'
            } ${!canEditPriority ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            {task.priorityOrder ? (
              <span className="text-[16px] leading-none font-black drop-shadow-sm">{task.priorityOrder}</span>
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
              className="absolute top-1 right-1 w-3.5 h-3.5 bg-gray-600/80 text-white rounded-full flex items-center justify-center border border-white shadow-sm opacity-0 group-hover/priority:opacity-100 transition-opacity z-10 hover:bg-red-600"
              title="Bỏ ưu tiên"
            >
              <X size={8} strokeWidth={4} />
            </button>
          )}
        </div>
      </td>
      {!isReadOnly && (
        <td className="py-2 px-1 text-center border-b border-r border-gray-300 align-middle">
          <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-1">
            {task.deletedAt ? (
              <div className="flex flex-col gap-2 w-full">
                <button 
                  onClick={() => onRestore && onRestore(task.id)}
                  title="HỒI PHỤC"
                  className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-all shadow-md mx-auto"
                >
                  <RotateCcw size={16} strokeWidth={3} />
                </button>
                {canDelete && (
                  <button 
                    onClick={() => onDelete && onDelete(task.id)}
                    title="XÓA VĨNH VIỄN"
                    className="w-8 h-8 flex items-center justify-center bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-md border border-red-400 mx-auto"
                  >
                    <Trash2 size={16} strokeWidth={3} />
                  </button>
                )}
              </div>
            ) : (
              <>
                {task.status === 'AWAITING_CONFIRMATION' && isManager && (
                  <button 
                      onClick={() => handleConfirmTask(true)}
                      title="XÁC NHẬN"
                      className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg group/btn"
                    >
                      <ThumbsUp size={20} strokeWidth={3} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                )}
                {task.status === 'AWAITING_CONFIRMATION' && !isManager && (
                  <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-1 py-1 rounded border border-blue-200 uppercase tracking-tight leading-tight text-center">Chờ duyệt...</span>
                )}
                {task.status === 'PENDING_APPROVAL' && canApprove && (
                  <button 
                      onClick={handleApprove}
                      title="XÁC NHẬN HOÀN THÀNH"
                      className="w-10 h-10 flex items-center justify-center bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg border-2 border-blue-400 group/btn"
                    >
                      <CheckCircle size={20} strokeWidth={3} className="group-hover/btn:scale-110 transition-transform" />
                    </button>
                )}
                {task.status === 'PENDING_APPROVAL' && !canApprove && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[7px] font-black text-amber-600 bg-amber-50 px-1 py-1 rounded border border-amber-200 uppercase tracking-tighter leading-none text-center animate-pulse">Đang chờ duyệt...</span>
                    <button 
                      onClick={() => onUpdate(task.id, { status: 'IN_PROGRESS' })}
                      className="w-full py-1 text-[7px] font-bold text-gray-400 hover:text-red-500 uppercase tracking-tighter"
                    >
                      Hủy gửi
                    </button>
                  </div>
                )}
                {task.status !== 'PENDING_APPROVAL' && (isOwner || isManager || canApprove) && !task.isLocked && !task.requestDelete && task.status !== 'COMPLETED' && task.status !== 'AWAITING_CONFIRMATION' && (
                  <button 
                     onClick={handleStatusAction}
                     title={canApprove ? 'XÁC NHẬN HOÀN THÀNH (XONG)' : 'GỬI HOÀN THÀNH'}
                     className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg group/btn ${
                       canApprove ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-100' : 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-100'
                     }`}
                   >
                     <CheckCircle size={20} strokeWidth={3} className="group-hover/btn:scale-110 transition-transform" />
                   </button>
                )}
                
                {(isManager || isOwner || canApprove) && (
                  <div className="relative">
                    <button 
                       onClick={() => setShowColorPicker(!showColorPicker)}
                       title="LƯU Ý / HIGHLIGHT"
                       className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg border-2 group/btn ${
                         task.highlightColor || task.isHighlighted
                           ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-100' 
                           : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                       }`}
                     >
                       <Highlighter size={20} strokeWidth={3} className="group-hover/btn:rotate-12 transition-transform" />
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
                )}

                {canDelete && (
                   <button 
                     onClick={() => onDelete(task.id)}
                     title={task.requestDelete ? 'XÁC NHẬN XÓA (DUYỆT XÓA)' : 'XÓA'}
                     className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all shadow-lg border-2 group/btn ${
                       task.requestDelete 
                         ? 'bg-red-600 text-white border-red-400 ring-2 ring-red-100 animate-pulse' 
                         : 'bg-red-500 text-white border-red-600 hover:bg-red-600'
                     }`}
                   >
                     {task.requestDelete ? (
                        <Check size={20} strokeWidth={4} className="group-hover/btn:scale-125 transition-transform" />
                     ) : (
                        <Trash2 size={20} strokeWidth={3} className="group-hover/btn:animate-shake transition-transform" />
                     )}
                   </button>
                )}

                {!canDelete && isOwner && !task.requestDelete && !task.isLocked && (
                   <button 
                     onClick={() => {
                       setConfirmModal({
                         show: true,
                         title: 'YÊU CẦU XÓA',
                         message: 'Bạn muốn gửi yêu cầu xóa công việc này lên cấp trên?',
                         onConfirm: () => {
                           onUpdate(task.id, { requestDelete: true });
                           setConfirmModal((p: any) => ({ ...p, show: false }));
                         }
                       });
                     }}
                     title="YÊU CẦU XÓA"
                     className="w-10 h-10 flex items-center justify-center bg-white text-red-500 border-2 border-red-200 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all shadow-sm group/btn"
                   >
                     <Trash2 size={18} strokeWidth={3} className="group-hover/btn:opacity-100 opacity-70 transition-opacity" />
                   </button>
                )}

                {task.requestDelete && !canDelete && (
                  <div className="flex flex-col gap-1 w-full">
                    <span className="text-[8px] font-black text-red-500 bg-red-50 px-1 py-1 rounded border border-red-200 uppercase tracking-tighter text-center leading-none">Chờ duyệt xóa</span>
                    <button 
                      onClick={() => onUpdate(task.id, { requestDelete: false })}
                      className="w-full py-1 text-[7px] font-bold text-gray-400 hover:text-blue-500 uppercase tracking-tighter"
                    >
                      Hủy yêu cầu
                    </button>
                  </div>
                )}
                {task.status === 'COMPLETED' && canApprove && (
                  <button 
                     onClick={() => {
                       setConfirmModal({
                         show: true,
                         title: 'HOÀN TÁC CÔNG VIỆC',
                         message: 'Bạn muốn chuyển công việc này quay lại bảng đang thực hiện?',
                         onConfirm: () => {
                           onUpdate(task.id, { 
                             status: 'IN_PROGRESS', 
                             actualEndDate: null, 
                             isLocked: false,
                             currentUpdate: '[HOÀN TÁC] Chuyển về bảng đang thực hiện'
                           });
                           setConfirmModal((p: any) => ({ ...p, show: false }));
                         }
                       });
                     }}
                     title="HOÀN TÁC"
                     className="w-10 h-10 flex items-center justify-center bg-gray-100 text-gray-600 border-2 border-gray-200 rounded-xl hover:bg-gray-200 transition-all shadow-sm group/btn"
                   >
                     <RotateCcw size={20} strokeWidth={3} className="group-hover/btn:-rotate-45 transition-transform" />
                   </button>
                )}
              </>
            )}
          </div>
        </td>
      )}
    </motion.tr>
  );
};
