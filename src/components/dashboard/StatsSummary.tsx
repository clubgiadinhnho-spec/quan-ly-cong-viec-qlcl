import React from 'react';
import { Task } from '../../types';
import { Activity, Zap, Shield, CheckCircle } from 'lucide-react';

interface StatsSummaryProps {
  tasks: Task[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks }) => {
  const nonDeleted = tasks.filter(t => !t.deletedAt);
  // YÊU CẦU BẮT BUỘC: Dashboard chỉ tính các việc APPROVED và KHÔNG đang chờ duyệt
  const approvedTasks = nonDeleted.filter(t => t.status === 'APPROVED' && !t.waitingApproval);
  
  const totalCount = approvedTasks.length;
  const activeTasks = approvedTasks; // Tất cả APPROVED được coi là đang xử lý cho Dashboard này
  
  const priorityTasks = activeTasks.filter(t => t.priority === 'HIGH' || t.priority === 'URGENT' || t.isHighlighted);
  const normalTasks = activeTasks.filter(t => !priorityTasks.includes(t));
  const completedCount = nonDeleted.filter(t => t.status === 'COMPLETED' || t.status === 'Hoàn thành').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-amber-500 py-3 px-5 rounded-2xl border border-amber-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Activity size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Activity size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">TỔNG DỰ ÁN</p>
              <p className="text-[9px] text-amber-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap">Đang quản lý</p>
            </div>
          </div>
          <p className="text-3xl font-black text-white leading-none shrink-0"><span translate="no" className="notranslate">{totalCount}</span></p>
        </div>
      </div>

      <div className="bg-emerald-500 py-3 px-5 rounded-2xl border border-emerald-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Shield size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Shield size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">BÌNH THƯỜNG</p>
              <p className="text-[9px] text-emerald-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap text-ellipsis overflow-hidden">HỆ THỐNG KIỂM SOÁT</p>
            </div>
          </div>
          <p className="text-3xl font-black text-white leading-none shrink-0"><span translate="no" className="notranslate">{normalTasks.length}</span></p>
        </div>
      </div>

      <div className="bg-red-500 py-3 px-5 rounded-2xl border border-red-600 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <Zap size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <Zap size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">ƯU TIÊN / GẤP</p>
              <p className="text-[9px] text-red-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap">BẤT QUY TẮC</p>
            </div>
          </div>
          <p className="text-3xl font-black text-white leading-none shrink-0"><span translate="no" className="notranslate">{priorityTasks.length}</span></p>
        </div>
      </div>

      <div className="bg-blue-600 py-3 px-5 rounded-2xl border border-blue-700 shadow-md transition-all hover:shadow-lg relative overflow-hidden group text-white">
        <div className="absolute right-[-10px] top-[-10px] opacity-10 transition-transform group-hover:scale-110 text-white">
          <CheckCircle size={70} />
        </div>
        <div className="flex items-center justify-between relative z-10 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-white/20 rounded-lg text-white group-hover:scale-110 transition-transform shrink-0">
              <CheckCircle size={18} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-white font-black uppercase tracking-widest whitespace-nowrap">HOÀN THÀNH</p>
              <p className="text-[9px] text-blue-100 font-bold uppercase opacity-80 leading-none mt-0.5 whitespace-nowrap">Kết quả</p>
            </div>
          </div>
          <p className="text-3xl font-black text-white leading-none shrink-0"><span translate="no" className="notranslate">{completedCount}</span></p>
        </div>
      </div>
    </div>
  );
};
