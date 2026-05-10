import { Task, User, ProgressUpdate, TaskComment, RecurrenceType, CycleHistoryEntry } from '../types';

export const calculateNextDueDate = (currentDateStr: string, recurrence: RecurrenceType): string => {
  const current = new Date(currentDateStr);
  if (isNaN(current.getTime())) return currentDateStr;

  const next = new Date(current);
  switch (recurrence) {
    case 'DAILY':
      next.setDate(next.getDate() + 1);
      break;
    case 'TRI_DAILY':
      next.setDate(next.getDate() + 3);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;
    case 'BI_WEEKLY':
      next.setDate(next.getDate() + 14);
      break;
    case 'TRI_WEEKLY':
      next.setDate(next.getDate() + 21);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      break;
    default:
      return currentDateStr;
  }
  return next.toISOString().split('T')[0];
};

export const createHistoryEntry = (
  currentHistory: ProgressUpdate[],
  changes: string[],
  authorId: string
): ProgressUpdate[] => {
  const newHistory = [...(currentHistory || [])];
  newHistory.push({
    version: (newHistory.length > 0 ? newHistory[newHistory.length - 1].version : 0) + 1,
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

  if (currentUser) {
    newUpdates.lastUpdatedBy = currentUser.uniqueKey || currentUser.id;
    newUpdates.lastUpdatedByRole = currentUser.role;
  }

  // We no longer handle recurring magic here. It's handled in useFirebaseData approveTaskCompletion.

  // Track progress update changes
  if (updates.currentUpdate !== undefined && updates.currentUpdate !== task.currentUpdate && !updates.status) {
    changes.push(`Cập nhật tiến độ: ${updates.currentUpdate || '(Trống)'}`);
  }
  
  // Track title changes
  if (updates.title !== undefined && updates.title !== task.title) {
    changes.push(`Đã chỉnh sửa nội dung: ${updates.title}`);
  }

  // Track objective changes
  if (updates.objective !== undefined && updates.objective !== task.objective) {
    changes.push(`Cập nhật mục tiêu công việc`);
  }

  // Track assignee changes
  if (updates.assigneeId !== undefined && updates.assigneeId !== task.assigneeId) {
    const oldAssignee = allUsers.find(u => u.id === task.assigneeId)?.name || 'Không xác định';
    const newAssignee = allUsers.find(u => u.id === updates.assigneeId)?.name || 'Không xác định';
    changes.push(`Thay đổi người thực hiện từ ${oldAssignee} sang ${newAssignee}`);
  }

  // Track date changes
  if (updates.startDate !== undefined && updates.startDate !== task.startDate) {
    changes.push(`Thay đổi ngày bắt đầu từ [${task.startDate}] sang [${updates.startDate}]`);
  }
  if (updates.expectedEndDate !== undefined && updates.expectedEndDate !== task.expectedEndDate) {
    changes.push(`Gia hạn từ [${task.expectedEndDate}] sang [${updates.expectedEndDate}]`);
  }
  if (updates.extensionDate !== undefined && updates.extensionDate !== task.extensionDate) {
    changes.push(updates.extensionDate 
      ? `Gia hạn công việc từ [${task.extensionDate || 'Chưa có'}] sang [${updates.extensionDate}]` 
      : `Hủy bỏ gia hạn công việc (Trước đó: ${task.extensionDate})`);
  }

  // Track status changes
  if (updates.status !== undefined && updates.status !== task.status) {
    const getStatusLabel = (s: string) => {
      if (s === 'IN_PROGRESS') return 'ĐANG THỰC HIỆN';
      if (s === 'COMPLETED') return 'HOÀN THÀNH';
      if (s === 'PENDING_APPROVAL') return 'CHỜ DUYỆT';
      if (s === 'PENDING') return 'CHỜ DUYỆT KHỞI TẠO';
      if (s === 'APPROVED') return 'ĐÃ DUYỆT KHỞI TẠO';
      return s;
    };
    
    const oldStatusLabel = getStatusLabel(task.status);
    const newStatusLabel = getStatusLabel(updates.status);
    const isReverting = task.status === 'COMPLETED' && updates.status === 'IN_PROGRESS';
    const prefix = isReverting ? '[HOÀN TÁC] ' : '';
    
    changes.push(`${prefix}Thay đổi trạng thái từ [${oldStatusLabel}] sang [${newStatusLabel}]`);
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
    newUpdates.lastActionAt = new Date().toISOString();
  }

  // Ensure fields are properly cleared if requested
  if (updates.actualEndDate === undefined && (updates as any).status === 'IN_PROGRESS') {
    // If we are moving to IN_PROGRESS, we usually want to clear the completion date
    newUpdates.actualEndDate = null; 
  }

  return newUpdates;
};
