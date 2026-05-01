import { Task, User, ProgressUpdate, TaskComment } from '../types';

export const createHistoryEntry = (
  currentHistory: ProgressUpdate[],
  changes: string[],
  authorId: string
): ProgressUpdate[] => {
  const newHistory = [...(currentHistory || [])];
  newHistory.push({
    version: newHistory.length + 1,
    content: changes.join(' | '),
    timestamp: new Date().toISOString(),
    authorId: authorId
  });
  return newHistory;
};

export const prepareTaskUpdates = (
  task: Task, 
  updates: Partial<Task>, 
  currentUser: User | null,
  allUsers: User[]
): Partial<Task> => {
  const newUpdates: any = { ...updates };
  const changes: string[] = [];

  // Track progress update changes
  if (updates.currentUpdate !== undefined && updates.currentUpdate !== task.currentUpdate) {
    changes.push(`Cập nhật tiến độ: ${updates.currentUpdate || '(Trống)'}`);
  }
  
  // Track title changes
  if (updates.title !== undefined && updates.title !== task.title) {
    changes.push(`Đổi tên công việc: ${updates.title}`);
  }

  // Track objective changes
  if (updates.objective !== undefined && updates.objective !== task.objective) {
    changes.push(`Cập nhật nội dung/mục tiêu công việc`);
  }

  // Track assignee changes
  if (updates.assigneeId !== undefined && updates.assigneeId !== task.assigneeId) {
    const oldAssignee = allUsers.find(u => u.id === task.assigneeId)?.name || 'Không xác định';
    const newAssignee = allUsers.find(u => u.id === updates.assigneeId)?.name || 'Không xác định';
    changes.push(`Thay đổi người thực hiện từ ${oldAssignee} sang ${newAssignee}`);
  }

  // Track date changes
  if (updates.startDate !== undefined && updates.startDate !== task.startDate) {
    changes.push(`Thay đổi ngày bắt đầu: ${updates.startDate}`);
  }
  if (updates.expectedEndDate !== undefined && updates.expectedEndDate !== task.expectedEndDate) {
    changes.push(`Thay đổi hạn hoàn thành: ${updates.expectedEndDate}`);
  }
  if (updates.extensionDate !== undefined && updates.extensionDate !== task.extensionDate) {
    changes.push(updates.extensionDate ? `Gia hạn công việc đến: ${updates.extensionDate}` : `Hủy bỏ gia hạn công việc`);
  }

  // Track status changes
  if (updates.status !== undefined && updates.status !== task.status) {
    let statusLabel: string = updates.status;
    const isReverting = task.status === 'COMPLETED' && updates.status === 'IN_PROGRESS';
    
    if (updates.status === 'IN_PROGRESS') statusLabel = 'ĐANG THỰC HIỆN';
    if (updates.status === 'COMPLETED') statusLabel = 'HOÀN THÀNH';
    if (updates.status === 'PENDING_APPROVAL') statusLabel = 'CHỜ DUYỆT';
    
    const prefix = isReverting ? '[HOÀN TÁC] ' : '';
    changes.push(`${prefix}Thay đổi trạng thái sang: ${statusLabel}`);
  }

  // Track priorityOrder changes
  if (updates.priorityOrder !== undefined && updates.priorityOrder !== task.priorityOrder) {
    if (updates.priorityOrder) {
      changes.push(`Thiết lập mức ưu tiên: ${updates.priorityOrder}`);
    } else {
      changes.push('Gỡ bỏ mức ưu tiên');
    }
  }

  if (changes.length > 0) {
    newUpdates.history = createHistoryEntry(task.history, changes, currentUser?.id || 'system');
  }

  // Ensure fields are properly cleared if requested
  if (updates.actualEndDate === undefined && (updates as any).status === 'IN_PROGRESS') {
    // If we are moving to IN_PROGRESS, we usually want to clear the completion date
    newUpdates.actualEndDate = null; 
  }

  return newUpdates;
};
