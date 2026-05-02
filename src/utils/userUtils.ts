import { User, Task } from '../types';
import { FIXED_STAFF } from '../constants/staff';

/**
 * Lấy thông tin nhân sự dựa trên ID hoặc Tên.
 * Ưu tiên các nhân sự trong hệ thống.
 */
export const getUserById = (id: string, allUsers: User[]): User | undefined => {
  if (!id) return undefined;

  // 1. Kiểm tra theo ID
  const userById = allUsers.find(u => u.id === id);
  if (userById) return userById;
  
  // 2. Kiểm tra theo Tên (Tuyệt đối)
  const userByName = allUsers.find(u => u.name.toLowerCase() === id.toLowerCase());
  if (userByName) return userByName;

  return undefined;
};

/**
 * Lấy tên hiển thị của nhân sự. Ưu tiên tên lưu trong Task.
 */
export const getTaskAssigneeName = (task: Task, allUsers: User[]): string => {
  // Chỉ hiển thị đúng tên người được lưu trong Task
  if (task.assigneeName) return task.assigneeName;
  if (task.assignedTo) return task.assignedTo;

  // Nếu không có tên, tra cứu theo ID
  const user = allUsers.find(u => u.id === task.assigneeId);
  if (user) return user.name;

  return task.assigneeId || 'Chưa phân công';
};

/**
 * Kiểm tra xem công việc có thuộc về nhân sự hay không.
 * Hỗ trợ fallback kiểm tra qua Email nếu ID không khớp (do đổi từ ID cũ sang Firebase UID).
 */
export const isUserTask = (task: Task, user: User | null): boolean => {
  if (!user || !task) return false;
  if (task.assigneeId === user.id) return true;
  
  // Fallback check by email (for cases where ID changed from USER001 to Firebase UID)
  const staffMember = FIXED_STAFF.find(u => u.id === task.assigneeId);
  return !!(staffMember?.companyEmail && user.companyEmail && 
            staffMember.companyEmail.toLowerCase() === user.companyEmail.toLowerCase());
};

/**
 * Trả về class và thuộc tính để chống trình duyệt tự dịch tên nhân sự.
 */
export const getSafeNameProps = () => ({
  translate: 'no' as const,
  className: 'notranslate'
});
