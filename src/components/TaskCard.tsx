/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Task, TaskPriority, TaskStatus, User } from '../types';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal,
  User as UserIcon,
  Calendar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar } from './common/Avatar';

import { getUserById, getSafeNameProps, getTaskAssigneeName } from '../utils/userUtils';
import { FIXED_STAFF } from '../constants/staff';

interface TaskCardProps {
  task: Task;
  users: User[];
  onUpdateStatus?: (id: string, status: TaskStatus) => void;
}

const statusConfig: Partial<Record<TaskStatus, { icon: any, color: string, bg: string }>> = {
  'Chưa bắt đầu': { icon: Clock, color: 'text-slate-500', bg: 'bg-slate-100' },
  'Đang thực hiện': { icon: AlertCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
  'Hoàn thành': { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  'Tạm dừng': { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-100' },
};

const priorityConfig: Partial<Record<TaskPriority, string>> = {
  'Thấp': 'bg-slate-100 text-slate-700',
  'Trung bình': 'bg-blue-100 text-blue-700',
  'Cao': 'bg-orange-100 text-orange-700',
  'Khẩn cấp': 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, users }: TaskCardProps) {
  const displayAssigneeName = getTaskAssigneeName(task, users);
  // Resolve user by name first (for imported data), then by ID
  const assignee = getUserById(displayAssigneeName, users) || (task.assigneeId ? getUserById(task.assigneeId, users) : null);

  const statusInfo = statusConfig[task.status] || { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-100' };
  const StatusIcon = statusInfo.icon;
  const displayDate = task.dueDate || task.expectedEndDate;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-sm transition-shadow group relative" id={`task-card-${task.id}`}>
      <div className="flex justify-between items-start mb-3">
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
          priorityConfig[task.priority] || 'bg-slate-100 text-slate-700'
        )}>
          {task.priority}
        </span>
        <button className="text-slate-400 hover:text-slate-600" id={`task-menu-${task.id}`}>
          <MoreHorizontal size={16} />
        </button>
      </div>

      <h3 className="font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
        {task.title}
      </h3>
      
      <p className="text-slate-500 text-sm line-clamp-2 mb-4">
        {task.description || task.objective}
      </p>

      <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-500">
            <StatusIcon size={14} className={statusInfo.color} />
            <span className="text-xs font-medium">{task.status}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Calendar size={14} />
            <span className="text-xs">{displayDate ? format(new Date(displayDate), 'dd MMM', { locale: vi }) : 'N/A'}</span>
          </div>
        </div>
        
        <div className="relative flex items-center gap-2">
          <span {...getSafeNameProps()} className="text-[10px] font-bold text-slate-400 notranslate">{displayAssigneeName}</span>
          <Avatar 
            src={assignee?.avatar} 
            name={displayAssigneeName} 
            size="xs" 
          />
        </div>
      </div>
    </div>
  );
}
