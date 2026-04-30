import React from 'react';
import { Task } from '../../types';

interface StatsSummaryProps {
  tasks: Task[];
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ tasks }) => {
  const total = tasks.length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const highlighted = tasks.filter(t => t.isHighlighted).length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-[12px] text-gray-400 font-bold uppercase tracking-wider mb-1">Tổng cộng dự án</p>
        <p className="text-2xl font-black">{total}</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-blue-600">
        <p className="text-[12px] text-blue-500 font-bold uppercase tracking-wider mb-1">Đang thực hiện</p>
        <p className="text-2xl font-black">{inProgress}</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <p className="text-[12px] text-red-500 font-bold uppercase tracking-wider mb-1">Vấn đề nổi cộm</p>
        <p className="text-2xl font-black">{highlighted}</p>
      </div>
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-green-600">
        <p className="text-[12px] text-green-500 font-bold uppercase tracking-wider mb-1">Đã hoàn thành</p>
        <p className="text-2xl font-black">{completed}</p>
      </div>
    </div>
  );
};
