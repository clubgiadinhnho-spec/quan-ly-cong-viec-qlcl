import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Edit2, Plus } from 'lucide-react';
import { Task, User } from '../../types';

interface TaskModalProps {
  onClose: () => void;
  onSave: (task: any) => void;
  users: User[];
  task?: Task;
}

export const TaskModal = ({ onClose, onSave, users, task }: TaskModalProps) => {
  const [title, setTitle] = useState(task?.title || '');
  const [objective, setObjective] = useState(task?.objective || '');
  const [assigneeId, setAssigneeId] = useState(task?.assigneeId || '');
  const [expectedDate, setExpectedDate] = useState(task?.expectedEndDate || '');
  const [attachment, setAttachment] = useState<File | null>(null);

  const isEdit = !!task;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl"
      >
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          {isEdit ? <Edit2 className="text-blue-600" /> : <Plus className="text-blue-600" />}
          {isEdit ? 'CẬP NHẬT CÔNG VIỆC' : 'KHỞI TẠO CÔNG VIỆC MỚI'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Hạng mục công việc *</label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-24 resize-none"
              placeholder="Nhập tên công việc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Mục tiêu đạt được *</label>
            <input 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          
          {!isEdit && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Đính kèm tài liệu mô tả (PDF/Ảnh)</label>
              <div className="relative group">
                <input 
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  id="task-attachment"
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                />
                <label 
                  htmlFor="task-attachment"
                  className="flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-lg cursor-pointer group-hover:border-blue-400 group-hover:bg-blue-50/30 transition-all"
                >
                  <span className="text-gray-400 text-sm truncate pr-4">
                    {attachment ? attachment.name : "Chọn file PDF hoặc Ảnh..."}
                  </span>
                  <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded group-hover:bg-blue-600 group-hover:text-white uppercase transition-all">
                    Browse
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-all">HỦY</button>
          <button 
            disabled={!title || !assigneeId}
            onClick={() => onSave({ title, objective, assigneeId, expectedEndDate: expectedDate, attachment })}
            className="flex-1 px-4 py-3 bg-[#1A56DB] text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
          >
            {isEdit ? 'CẬP NHẬT' : 'KHỞI TẠO'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
