import React from 'react';
import { Task } from '../../types';

interface StatsSummaryProps {
  tasks: Task[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks }) => {
  const activeTasks = tasks.filter(t => t.status !== 'AWAITING_CONFIRMATION');
  const total = activeTasks.length;
  const inProgress = activeTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const highlighted = activeTasks.filter(t => t.isHighlighted || t.priority === 'HIGH').length;
  const completed = activeTasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Tổng dự án</p>
        <p className="text-xl font-black text-gray-900">{total}</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md text-indigo-600">
        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-wider mb-0.5">Đang xử lý</p>
        <p className="text-xl font-black">{inProgress}</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md text-red-600">
        <p className="text-[9px] text-red-400 font-bold uppercase tracking-wider mb-0.5">Vấn đề gấp</p>
        <p className="text-xl font-black">{highlighted}</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md text-green-600">
        <p className="text-[9px] text-green-400 font-bold uppercase tracking-wider mb-0.5">Hoàn thành</p>
        <p className="text-xl font-black">{completed}</p>
      </div>
    </div>
  );
};
