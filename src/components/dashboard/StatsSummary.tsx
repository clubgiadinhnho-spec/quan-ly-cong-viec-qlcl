import React from 'react';
import { Task } from '../../types';
import { Activity, Zap, Shield, CheckCircle } from 'lucide-react';

interface StatsSummaryProps {
  tasks: Task[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks }) => {
  const nonDeleted = tasks.filter(t => !t.deletedAt);
  const activeTasks = nonDeleted.filter(t => t.status !== 'COMPLETED' && t.status !== 'AWAITING_CONFIRMATION');
  
  const totalProcessing = activeTasks.length;
  const priorityTasks = activeTasks.filter(t => t.priorityOrder || t.isHighlighted);
  const normalTasks = activeTasks.filter(t => !t.priorityOrder && !t.isHighlighted);
  const completedCount = nonDeleted.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-l-4 border-l-blue-500 relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-5 transition-transform group-hover:scale-110">
          <Activity size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">Tổng dự án</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-gray-900 leading-none">{totalProcessing}</p>
          <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Đang xử lý</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-l-4 border-l-emerald-500 relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-5 transition-transform group-hover:scale-110 text-emerald-500">
          <Shield size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
            <Shield size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Bình thường</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-gray-900 leading-none">{normalTasks.length}</p>
          <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Ổn định</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-l-4 border-l-red-500 relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-5 transition-transform group-hover:scale-110 text-red-500">
          <Zap size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-red-50 rounded-lg text-red-500">
            <Zap size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-red-500 font-black uppercase tracking-widest">Ưu tiên / Gấp</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-gray-900 leading-none">{priorityTasks.length}</p>
          <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Cần chú ý</span>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md border-l-4 border-l-indigo-500 relative overflow-hidden group">
        <div className="absolute right-[-10px] top-[-10px] opacity-5 transition-transform group-hover:scale-110 text-indigo-500">
          <CheckCircle size={80} />
        </div>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
            <CheckCircle size={18} strokeWidth={2.5} />
          </div>
          <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Hoàn thành</p>
        </div>
        <div className="flex items-end gap-2">
          <p className="text-3xl font-black text-gray-900 leading-none">{completedCount}</p>
          <span className="text-[10px] text-gray-400 font-bold mb-1 uppercase">Kết quả</span>
        </div>
      </div>
    </div>
  );
};
