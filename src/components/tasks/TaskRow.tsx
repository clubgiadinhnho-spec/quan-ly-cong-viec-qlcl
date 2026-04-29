import React from 'react';
import { MessageSquare, Paperclip } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDate } from '../../lib/dateUtils';

interface TaskRowProps {
  task: Task;
  user: User;
  users: User[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  onTogglePriority: (id: string) => void;
  onEdit: (task: Task) => void;
  idx: number;
  setConfirmModal: (modal: any) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, onTogglePriority, onEdit, idx, setConfirmModal }) => {
  const assignee = users.find(s => s.id === task.assigneeId);
  const isOwner = user.id === task.assigneeId;
  const isManager = user.role === 'Admin' || user.role === 'Trưởng Phòng';
  const canEditPriority = user.role === 'Admin' || user.role === 'Trưởng Phòng';
  const isStaff = user.role === 'Nhân Viên' || user.role === 'Trưởng Nhóm';
  const hasUnread = false; // Placeholder for future logic

  const handleStatusAction = () => {
    if (isStaff) {
      onUpdate(task.id, { status: 'PENDING_APPROVAL' });
    } else {
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
      <td className={`p-4 text-center text-xs font-bold border-r border-gray-300 ${task.isHighlighted ? 'text-red-300' : 'text-gray-300'}`}>{task.code}</td>
      <td className={`p-4 border-r border-gray-300 ${task.isHighlighted ? 'border-l-4 border-red-500' : ''}`}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={assignee?.avatar} alt={assignee?.name} className="w-8 h-8 rounded-full border border-gray-100 shadow-sm" />
            {isManager && (
              <button 
                onClick={() => onEdit(task)}
                className="absolute -top-1 -left-1 w-4 h-4 bg-blue-600 text-white rounded-full flex items-center justify-center border border-white hover:scale-110 transition-all shadow-sm"
                title="Thay đổi nhân sự / Chỉnh sửa"
              >
                <span className="text-[8px]">✎</span>
              </button>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-gray-900 leading-none whitespace-nowrap">{assignee?.name}</p>
              {isManager && (
                <button 
                  onClick={() => onEdit(task)} 
                  className="text-[9px] text-blue-500 hover:underline font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Sửa
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-[10px] text-gray-500 font-medium opacity-70 leading-normal">Giao việc: {formatDate(task.issueDate)}</p>
              <p className="text-[10px] text-blue-600 font-black leading-normal">Hạn: {formatDate(task.expectedEndDate)}</p>
              <button 
                onClick={() => onOpenChat(task.id)}
                className="relative p-1 text-blue-500 hover:bg-blue-50 rounded-full transition-all w-fit -ml-1"
                title="Trao đổi công việc"
              >
                <div className="flex items-center gap-1 font-bold text-[9px] uppercase">
                  <MessageSquare size={10} />
                  <span>Trao đổi {task.comments && task.comments.length > 0 && `(${task.comments.length})`}</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </td>
      <td className="p-4 border-r border-gray-300 relative group">
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
        {isManager ? (
           <div className="relative">
             <input 
              className="text-sm font-bold text-gray-900 bg-transparent border-b border-transparent focus:border-blue-400 outline-none w-full py-0.5 pr-6"
              defaultValue={task.title}
              onBlur={(e) => {
                if (e.target.value !== task.title) {
                  onUpdate(task.id, { title: e.target.value });
                }
              }}
            />
            <button 
              onClick={() => onEdit(task)}
              className="absolute top-1 right-0 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <span className="text-[10px]">✎</span>
            </button>
           </div>
        ) : (
          <p className="text-sm font-bold text-gray-900 leading-relaxed pr-6">{task.title}</p>
        )}
        <p className="text-[11px] text-gray-500 leading-relaxed mt-2 line-clamp-2">{task.objective}</p>

        <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length}</span>
            <button onClick={() => onViewHistory(task.id)} className="text-[9px] text-blue-500 hover:underline font-bold">Lịch sử</button>
            {task.status === 'PENDING_APPROVAL' && (
              <span className="text-[9px] font-black text-amber-500 bg-amber-50 px-2 py-0.5 rounded animate-pulse border border-amber-200 uppercase tracking-tighter">Chờ duyệt HT</span>
            )}
        </div>
      </td>
      <td className="p-4 bg-gray-50/30 border-r border-gray-300">
        <p className="text-xs text-gray-500 leading-relaxed">{task.prevProgress || '—'}</p>
      </td>
      <td className="p-4 border-r border-gray-300">
        <textarea 
          className="w-full text-xs p-2.5 bg-white border border-gray-100 rounded-lg shadow-inner outline-none focus:border-blue-500 transition-all resize-none leading-relaxed h-20 disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:shadow-none"
          placeholder="Cập nhật tiến độ..."
          defaultValue={task.currentUpdate}
          onBlur={(e) => {
            if (e.target.value !== (task.currentUpdate || '')) {
              onUpdate(task.id, { currentUpdate: e.target.value });
            }
          }}
          disabled={task.isLocked || (!isOwner && !isManager)}
        />
        {(task.history || []).length > 0 && (
          <div className="mt-1 flex items-center justify-between px-1">
            <span className="text-[8px] font-bold text-gray-400">
              v{task.history.length} • {formatDate(task.updatedAt)}
            </span>
            <button 
              onClick={() => onViewHistory(task.id)}
              className="text-[9px] text-blue-500 hover:underline font-bold"
            >
              Xem lịch sử
            </button>
          </div>
        )}
      </td>
      <td className="p-1 text-center border-r border-gray-300">
        <button 
          onClick={() => canEditPriority && onTogglePriority(task.id)}
          disabled={!canEditPriority || task.isLocked}
          style={{ 
            backgroundColor: task.priorityOrder 
              ? `rgba(220, 38, 38, ${Math.max(0.1, 1 - (task.priorityOrder - 1) * 0.2)})` 
              : undefined,
            color: task.priorityOrder 
              ? (task.priorityOrder > 3 ? '#991b1b' : '#ffffff') 
              : undefined
          }}
          className={`text-[10px] font-black w-8 h-8 rounded-full flex items-center justify-center mx-auto transition-all transition-all ${
            !task.priorityOrder ? 'bg-gray-100 text-gray-400 hover:bg-gray-200' : ''
          } ${!canEditPriority || task.isLocked ? 'cursor-default opacity-50' : 'hover:scale-110 active:scale-90 cursor-pointer'}`}
          title={task.priorityOrder ? `Mức ưu tiên ${task.priorityOrder}` : 'Thêm mức ưu tiên'}
        >
          {task.priorityOrder || '+'}
        </button>
      </td>
      <td className="py-4 px-1 text-center border-r border-gray-300">
        <div className="flex flex-col items-center gap-1.5">
           {task.status === 'PENDING_APPROVAL' && isManager && (
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
           {task.status !== 'PENDING_APPROVAL' && (isOwner || isManager) && !task.isLocked && (
             <button 
                onClick={handleStatusAction}
                className="w-full px-2 py-1.5 text-[9px] bg-blue-600 text-white rounded font-black hover:bg-blue-700 transition-all uppercase tracking-tighter shadow-sm"
              >
                {isStaff ? 'GỬI HT' : 'XONG'}
              </button>
           )}
           {isManager && (
             <button 
                onClick={() => onUpdate(task.id, { isHighlighted: !task.isHighlighted })}
                className={`w-full px-2 py-1.5 text-[9px] border rounded font-black transition-all uppercase tracking-tighter ${task.isHighlighted ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-500'}`}
              >
                LƯU Ý
              </button>
           )}
           {isManager && (
              <button 
                onClick={() => onDelete(task.id)}
                className="w-full px-2 py-1.5 text-[9px] bg-white text-gray-400 border border-gray-200 rounded font-black hover:bg-red-500 hover:text-white transition-all uppercase tracking-tighter"
              >
                XÓA
              </button>
           )}
           {task.status === 'COMPLETED' && isManager && (
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
        </div>
      </td>
    </tr>
  );
};
