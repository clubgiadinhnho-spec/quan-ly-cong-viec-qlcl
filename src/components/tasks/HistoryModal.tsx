import React from 'react';
import { motion } from 'motion/react';
import { History } from 'lucide-react';
import { Task } from '../../types';
import { STAFF_LIST } from '../../constants';
import { formatDateTime } from '../../lib/dateUtils';

interface HistoryModalProps {
  taskId: string;
  tasks: Task[];
  onClose: () => void;
}

export const HistoryModal = ({ taskId, tasks, onClose }: HistoryModalProps) => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" onClick={onClose} />
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="bg-blue-600 p-6 text-white">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History />
            LỊCH SỬ THAY ĐỔI
          </h3>
          <p className="text-blue-100 text-xs mt-1 font-bold">{task.code}: {task.title}</p>
        </div>
        <div className="p-6 max-h-[400px] overflow-y-auto">
          <div className="relative border-l-2 border-blue-100 ml-4 space-y-8">
            {task.history.slice().reverse().map((h, i) => (
              <div key={i} className="relative pl-6">
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white" />
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Phiên bản v{h.version}</span>
                  <span className="text-[10px] text-gray-400 font-bold">{formatDateTime(h.timestamp)}</span>
                </div>
                <p className="text-sm text-gray-700 font-medium leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                  {h.content}
                </p>
                <p className="text-[9px] text-gray-400 mt-1 italic">Cập nhật bởi: {STAFF_LIST.find(s => s.id === h.authorId)?.name}</p>
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} className="w-full text-sm font-bold text-blue-600 p-4 border-t border-gray-100 hover:bg-gray-50 transition-all">ĐÓNG</button>
      </motion.div>
    </div>
  );
};
