import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { User } from '../../types';

interface TaskModalProps {
  onClose: () => void;
  onAdd: (task: any) => void;
  users: User[];
}

export const TaskModal = ({ onClose, onAdd, users }: TaskModalProps) => {
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Plus className="text-blue-600" />
          KHỞI TẠO CÔNG VIỆC MỚI
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Hạng mục công việc *</label>
            <input 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              placeholder="Nhập tên công việc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mục tiêu đạt được *</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-24 resize-none"
              placeholder="Mục tiêu cụ thể cho công việc này..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Người thực hiện</label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Chọn nhân sự</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Hạn hoàn thành</label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-all">HỦY</button>
          <button 
            disabled={!title || !assigneeId}
            onClick={() => onAdd({ title, objective, assigneeId, expectedEndDate: expectedDate })}
            className="flex-1 px-4 py-3 bg-[#1A56DB] text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
          >
            LƯU CÔNG VIỆC
          </button>
        </div>
      </motion.div>
    </div>
  );
};
