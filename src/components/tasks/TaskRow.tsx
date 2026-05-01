import React from 'react';
import { MessageSquare, Paperclip, X, CheckCircle, XCircle, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { AnimatePresence } from 'motion/react';
import { Avatar } from '../common/Avatar';

import { getUserById, getSafeNameProps, getTaskAssigneeName } from '../../utils/userUtils';

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
  idx: number;
  setConfirmModal: (modal: any) => void;
  isReadOnly?: boolean;
  onRestore?: (id: string) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ 
  task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, 
  isChatOpen, onSendMessage, onReact, onTogglePriority, onEdit, idx, setConfirmModal,
  isReadOnly = false, onRestore
}) => {
  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);
  const isOwner = user.id === task.assigneeId;
  const isAdmin = user.role === 'Admin';
  const isTeamLeader = user.role === 'Leader';
  const canApprove = isAdmin || !!user.delegatedPermissions?.canApproveTask;
  const canDelete = isAdmin || !!user.delegatedPermissions?.canDeleteTask;
  const isManager = isAdmin || isTeamLeader || !!user.delegatedPermissions?.canCreateTask;
  const isEmployee = user.role === 'Staff';
  
  const canEditPriority = isAdmin;
  const hasUnread = false; // Placeholder for future logic

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
    <tr className={`group transition-all ${task.isHighlighted ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
      <td className={`p-2 text-center text-[10px] font-bold border-b border-l border-r border-gray-300 align-top relative ${task.isHighlighted ? 'text-red-300' : 'text-gray-300'}`}>
        <div className="flex flex-col items-center gap-1">
          {task.code}
          {task.isNewSoldier && (
            <div className="bg-amber-100 text-amber-600 p-0.5 rounded-full animate-bounce" title="Lính mới / Việc mới xác nhận">
              <Sparkles size={8} strokeWidth={3} />
            </div>
          )}
        </div>
      </td>
      <td className={`p-2 border-b border-r border-gray-300 align-top ${task.isHighlighted ? 'border-l-4 border-red-500' : ''}`}>
        <div className="flex items-start gap-1.5">
          <div className="relative flex-shrink-0">
            <Avatar src={assignee?.avatar} name={assigneeName} size="sm" />
            {isManager && (
              <button 
                onClick={() => onEdit(task)}
                className="absolute -top-1 -left-1 w-3 h-3 bg-blue-600 text-white rounded-full flex items-center justify-center border border-white hover:scale-110 transition-all shadow-sm"
                title="Sửa"
              >
                <span className="text-[6px]">✎</span>
              </button>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p {...getSafeNameProps()} className="text-[11px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>{assigneeName}</p>
            </div>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <p className="text-[8px] text-gray-500 font-medium opacity-70 leading-tight">G: {formatDate(task.issueDate)}</p>
              <p className="text-[8px] text-blue-600 font-black leading-tight">H: {formatDate(task.expectedEndDate)}</p>
              <div className="relative mt-0.5">
                <button 
                  onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
                  className={`p-0.5 rounded transition-all w-fit ${isChatOpen ? 'text-blue-700 bg-blue-100 shadow-inner' : 'text-blue-500 hover:bg-blue-50'}`}
                >
                  <div className="flex items-center gap-0.5 font-bold text-[8px] uppercase">
                    <MessageSquare size={8} />
                    <span>{task.comments && task.comments.length > 0 ? `(${task.comments.length})` : 'Chat'}</span>
                  </div>
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

          <div className="mt-1 flex items-center gap-1">
              <span className="text-[7px] px-0.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length}</span>
              <button onClick={() => onViewHistory(task.id)} className="text-[8px] text-blue-500 hover:underline font-bold">LS</button>
              {task.status === 'PENDING_APPROVAL' && (
                <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1 py-0.2 rounded animate-pulse border border-amber-100 uppercase tracking-tighter">DUYỆT</span>
              )}
          </div>
        </div>
      </td>
      <td className="p-1 bg-gray-50/50 border-b border-r border-gray-300 align-top h-px">
        <div className="h-full min-h-[60px] text-[10px] text-gray-700 leading-tight px-1 py-1 bg-white/30 rounded border border-gray-100/50 break-words whitespace-normal font-medium">
          {task.prevProgress || ''}
        </div>
      </td>
      <td className="p-1 border-b border-r border-gray-300 align-top h-px">
        <div className="flex flex-col gap-1 h-full min-h-[60px]">
          <textarea 
            className="flex-1 w-full text-[10px] font-medium p-1.5 bg-white border border-gray-200 rounded shadow-sm outline-none focus:border-blue-500 transition-all resize-none leading-tight min-h-[60px] disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:shadow-none placeholder:font-normal text-gray-800"
            placeholder="..."
            defaultValue={task.currentUpdate}
            onBlur={(e) => {
              if (e.target.value !== (task.currentUpdate || '')) {
                onUpdate(task.id, { currentUpdate: e.target.value });
              }
            }}
            disabled={task.isLocked || (!isOwner && !isManager)}
          />
        </div>
      </td>
      <td className="p-0 text-center border-b border-r border-gray-300 align-top">
        <button 
          onClick={() => onTogglePriority(task.id)}
          className={`w-full h-full min-h-[30px] py-2 flex items-center justify-center text-[10px] font-black transition-all ${task.priorityOrder ? 'text-blue-600 bg-blue-50/20' : 'text-gray-300 hover:text-blue-400'}`}
        >
          {task.priorityOrder || '—'}
        </button>
      </td>
      {!isReadOnly && (
        <td className="py-2 px-0.5 text-center border-b border-r border-gray-300 align-top">
          <div className="flex flex-col items-center gap-1">
            {task.deletedAt ? (
              <>
                <button 
                  onClick={() => onRestore && onRestore(task.id)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] bg-green-600 text-white rounded font-black hover:bg-green-700 transition-all uppercase tracking-tighter shadow-sm"
                >
                  <RotateCcw size={10} /> KHÔI PHỤC
                </button>
                <button 
                  onClick={() => onDelete(task.id)}
                  className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] bg-red-600 text-white rounded font-black hover:bg-red-700 transition-all uppercase tracking-tighter shadow-sm"
                >
                  <Trash2 size={10} /> XÓA VĨNH VIỄN
                </button>
              </>
            ) : (
              <>
                {task.status === 'AWAITING_CONFIRMATION' && isManager && (
                  <>
                    <button 
                       onClick={() => handleConfirmTask(true)}
                       className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] bg-blue-600 text-white rounded font-black hover:bg-blue-700 transition-all uppercase tracking-tighter shadow-sm"
                     >
                       <CheckCircle size={10} /> XÁC NHẬN
                     </button>
                    <button 
                       onClick={() => handleConfirmTask(false)}
                       className="w-full flex items-center justify-center gap-1 px-2 py-1.5 text-[9px] bg-gray-100 text-gray-600 border border-gray-200 rounded font-black hover:bg-red-500 hover:text-white hover:border-red-500 transition-all uppercase tracking-tighter shadow-sm"
                     >
                       <XCircle size={10} /> TỪ CHỐI
                     </button>
                  </>
                )}
                {task.status === 'AWAITING_CONFIRMATION' && !isManager && (
                  <span className="text-[8px] font-black text-blue-500 bg-blue-50 px-2 py-1 rounded border border-blue-200 uppercase tracking-tighter text-center">Đang chờ sếp duyệt...</span>
                )}
                {task.status === 'PENDING_APPROVAL' && canApprove && (
                  <>
                    <button 
                       onClick={handleApprove}
                       className="w-full px-2 py-1.5 text-[9px] bg-green-500 text-white rounded font-black hover:bg-green-600 transition-all uppercase tracking-tighter shadow-sm"
                     >
                       DUYỆT HT
                     </button>
                    <button 
                       onClick={() => onUpdate(task.id, { status: 'IN_PROGRESS' })}
                       className="w-full px-2 py-1.5 text-[9px] bg-red-100 text-red-700 border border-red-200 rounded font-black hover:bg-red-600 hover:text-white transition-all uppercase tracking-tighter shadow-sm"
                     >
                       TỪ CHỐI
                     </button>
                  </>
                )}
                {task.status !== 'PENDING_APPROVAL' && (isOwner || isManager || canApprove) && !task.isLocked && !task.requestDelete && task.status !== 'COMPLETED' && task.status !== 'AWAITING_CONFIRMATION' && (
                  <button 
                     onClick={handleStatusAction}
                     className="w-full px-2 py-1.5 text-[9px] bg-blue-600 text-white rounded font-black hover:bg-blue-700 transition-all uppercase tracking-tighter shadow-sm"
                   >
                     {canApprove ? 'XONG' : 'GỬI HT'}
                   </button>
                )}
                {(isManager || isOwner || canApprove) && (
                  <button 
                     onClick={() => onUpdate(task.id, { isHighlighted: !task.isHighlighted })}
                     className={`w-full px-2 py-1.5 text-[9px] border rounded font-black transition-all uppercase tracking-tighter ${task.isHighlighted ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-500'}`}
                   >
                     LƯU Ý
                   </button>
                )}
                {task.requestDelete && canDelete && (
                   <>
                     <button 
                       onClick={() => onDelete(task.id)}
                       className="w-full px-2 py-1.5 text-[9px] bg-red-600 text-white rounded font-black hover:bg-red-700 transition-all uppercase tracking-tighter shadow-sm"
                     >
                       DUYỆT XÓA
                     </button>
                     <button 
                       onClick={() => onUpdate(task.id, { requestDelete: false })}
                       className="w-full px-2 py-1.5 text-[9px] bg-gray-100 text-gray-600 border border-gray-200 rounded font-black hover:bg-gray-200 transition-all uppercase tracking-tighter"
                     >
                       BỎ QUA XÓA
                     </button>
                   </>
                 )}
                {!task.requestDelete && canDelete && (
                   <button 
                     onClick={() => onDelete(task.id)}
                     className="w-full px-2 py-1.5 text-[9px] bg-white text-gray-400 border border-gray-200 rounded font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-tighter"
                   >
                     XÓA
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
                     className="w-full px-2 py-1.5 text-[9px] bg-white text-red-400 border border-red-100 rounded font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-tighter"
                   >
                     YÊU CẦU XÓA
                   </button>
                 )}
                 {task.requestDelete && !canDelete && (
                   <span className="text-[8px] font-black text-red-500 bg-red-50 px-2 py-1 rounded border border-red-200 uppercase tracking-tighter text-center">Chờ duyệt xóa</span>
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
                     className="w-full px-2 py-1.5 text-[9px] bg-gray-100 text-gray-600 border border-gray-200 rounded font-black hover:bg-gray-200 transition-all uppercase tracking-tighter shadow-sm"
                   >
                     HOÀN TÁC
                   </button>
                )}
              </>
            )}
          </div>
        </td>
      )}
    </tr>
  );
};
