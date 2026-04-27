import React from 'react';
import { MessageSquare } from 'lucide-react';
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
  idx: number;
  setConfirmModal: (modal: any) => void;
}

export const TaskRow: React.FC<TaskRowProps> = ({ task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, idx, setConfirmModal }) => {
  const assignee = users.find(s => s.id === task.assigneeId);
  const isOwner = user.id === task.assigneeId;
  const isManager = user.role === 'Admin' || user.role === 'Trưởng Phòng' || user.role === 'Trưởng Nhóm';
  const hasUnread = false; // Placeholder for future logic

  return (
    <tr className={`group transition-all ${task.isHighlighted ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
      <td className={`p-4 text-center text-xs font-bold border-r border-gray-300 ${task.isHighlighted ? 'text-red-300' : 'text-gray-300'}`}>{idx + 1}</td>
      <td className={`p-4 border-r border-gray-300 ${task.isHighlighted ? 'border-l-4 border-red-500' : ''}`}>
        <div className="flex items-center gap-3">
          <img src={assignee?.avatar} alt={assignee?.name} className="w-8 h-8 rounded-full border border-gray-100 shadow-sm" />
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none whitespace-nowrap">{assignee?.name}</p>
            <div className="flex flex-col gap-0.5 mt-1">
              <p className="text-[10px] text-gray-500 font-medium italic opacity-70 leading-none">Giao việc: {formatDate(task.issueDate)}</p>
              <p className="text-[10px] text-blue-600 font-black italic leading-none">Hạn: {formatDate(task.expectedEndDate)}</p>
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
      <td className="p-4 border-r border-gray-300">
        {isManager ? (
           <input 
            className="text-sm font-bold text-gray-900 bg-transparent border-b border-transparent focus:border-blue-400 outline-none w-full py-0.5"
            defaultValue={task.title}
            onBlur={(e) => onUpdate(task.id, { title: e.target.value })}
          />
        ) : (
          <p className="text-sm font-bold text-gray-900">{task.title}</p>
        )}
        <p className="text-[11px] text-gray-500 leading-tight mt-1 line-clamp-2 italic">{task.objective}</p>
        <div className="mt-2 flex items-center gap-2">
            <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded font-bold uppercase tracking-tighter">v{task.history.length}</span>
            <button onClick={() => onViewHistory(task.id)} className="text-[9px] text-blue-500 hover:underline font-bold">Lịch sử</button>
        </div>
      </td>
      <td className="p-4 bg-gray-50/30 border-r border-gray-300">
        <p className="text-xs text-gray-500 leading-relaxed italic">{task.prevProgress || '—'}</p>
      </td>
      <td className="p-4 border-r border-gray-300">
        <textarea 
          className="w-full text-xs p-2.5 bg-white border border-gray-100 rounded-lg shadow-inner outline-none focus:border-blue-500 transition-all resize-none leading-relaxed h-20 disabled:bg-transparent disabled:border-transparent disabled:p-0 disabled:shadow-none"
          placeholder="Cập nhật tiến độ..."
          value={task.currentUpdate}
          onChange={(e) => onUpdate(task.id, { currentUpdate: e.target.value })}
          disabled={task.isLocked || (!isOwner && !isManager)}
        />
      </td>
      <td className="p-4 text-center border-r border-gray-300">
        <button 
          onClick={() => onUpdate(task.id, { priority: task.priority === 'HIGH' ? 'MEDIUM' : (task.priority === 'MEDIUM' ? 'LOW' : 'HIGH') })}
          className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${
            task.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 
            task.priority === 'MEDIUM' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          {task.priority === 'HIGH' ? 'Khẩn' : (task.priority === 'MEDIUM' ? 'T.Bình' : 'Thấp')}
        </button>
      </td>
      <td className="py-4 px-1 text-center border-r border-gray-300">
        <div className="flex flex-col items-center gap-1.5">
           {isManager && (
             <button 
                onClick={() => {
                  setConfirmModal({
                    show: true,
                    title: 'XÁC NHẬN HOÀN THÀNH',
                    message: 'Bạn muốn chốt công việc này đã hoàn thành?',
                    onConfirm: () => {
                      onUpdate(task.id, { status: 'COMPLETED', actualEndDate: new Date().toISOString().split('T')[0], isLocked: true });
                      setConfirmModal((p: any) => ({ ...p, show: false }));
                    }
                  });
                }}
                className="w-full px-2 py-1.5 text-[9px] bg-green-100 text-green-700 border border-green-200 rounded font-bold hover:bg-green-600 hover:text-white transition-all uppercase"
              >
                XONG
              </button>
           )}
           {isManager && (
             <button 
                onClick={() => onUpdate(task.id, { isHighlighted: !task.isHighlighted })}
                className={`w-full px-2 py-1.5 text-[9px] border rounded font-bold transition-all uppercase ${task.isHighlighted ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-gray-400 border-gray-200 hover:border-blue-500'}`}
              >
                LƯU Ý
              </button>
           )}
           {(isOwner || isManager) && (
              <button 
                onClick={() => onDelete(task.id)}
                className="w-full px-2 py-1.5 text-[9px] bg-white text-gray-400 border border-gray-200 rounded font-bold hover:bg-red-500 hover:text-white transition-all uppercase"
              >
                XÓA
              </button>
           )}
        </div>
      </td>
    </tr>
  );
};
