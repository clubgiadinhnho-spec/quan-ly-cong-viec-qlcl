import React from 'react';
import { Task } from '../../types';
import { Activity, Zap, Shield, CheckCircle } from 'lucide-react';

interface StatsSummaryProps {
  tasks: Task[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks }) => {
  const nonDeleted = tasks.filter(t => !t.deletedAt);
  const totalCount = nonDeleted.length;
  const activeTasks = nonDeleted.filter(t => t.status !== 'COMPLETED' && t.status !== 'AWAITING_CONFIRMATION');
  
  const totalProcessing = activeTasks.length;
  const priorityTasks = activeTasks.filter(t => t.priorityOrder || t.isHighlighted);
  const normalTasks = activeTasks.filter(t => !t.priorityOrder && !t.isHighlighted);
  const completedCount = nonDeleted.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-amber-500 p-5 rounded-2xl border border-amber-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-20 transition-transform group-hover:scale-110 text-white">
          <Activity size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest">TỔNG DỰ ÁN</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-white leading-none">{totalCount}</p>
          <span className="text-[10px] text-amber-100 font-bold mb-1 uppercase">Đang quản lý</span>
        </div>
      </div>

      <div className="bg-emerald-500 p-5 rounded-2xl border border-emerald-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-20 transition-transform group-hover:scale-110 text-white">
          <Shield size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Shield size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest">BÌNH THƯỜNG</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-white leading-none">{normalTasks.length}</p>
          <span className="text-[10px] text-emerald-100 font-bold mb-1 uppercase">Ổn định</span>
        </div>
      </div>

      <div className="bg-red-500 p-5 rounded-2xl border border-red-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-20 transition-transform group-hover:scale-110 text-white">
          <Zap size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <Zap size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">ƯU TIÊN / GẤP</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-white leading-none">{priorityTasks.length}</p>
          <span className="text-[10px] text-red-100 font-bold mb-1 uppercase">Cần chú ý</span>
        </div>
      </div>

      <div className="bg-blue-600 p-5 rounded-2xl border border-blue-700 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-20 transition-transform group-hover:scale-110 text-white">
          <CheckCircle size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/20 rounded-lg text-white">
            <CheckCircle size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-white font-black uppercase tracking-widest">HOÀN THÀNH</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-white leading-none">{completedCount}</p>
          <span className="text-[10px] text-blue-100 font-bold mb-1 uppercase">Kết quả</span>
        </div>
      </div>
    </div>
  );
};
