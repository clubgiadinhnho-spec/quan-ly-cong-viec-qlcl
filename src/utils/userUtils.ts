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
  
  // 1. So khớp ID trực tiếp (Firebase UID hoặc Legacy ID)
  if (task.assigneeId === user.id) return true;
  
  // 2. So khớp theo Mã nhân viên (Staff Code)
  if (user.code && task.assigneeId === user.code) return true;
  
  // 3. Tra cứu trong danh sách FIXED_STAFF để so khớp Email
  const staffByTask = FIXED_STAFF.find(u => u.id === task.assigneeId || u.code === task.assigneeId);
  if (staffByTask && user.companyEmail) {
    if (staffByTask.companyEmail?.toLowerCase() === user.companyEmail.toLowerCase()) return true;
    if (staffByTask.personalEmail?.toLowerCase() === user.companyEmail.toLowerCase()) return true;
  }
  
  // 4. So khớp theo tên hiển thị (Trường hợp cuối)
  const taskAssigneeName = task.assigneeName || task.assignedTo;
  if (taskAssigneeName && user.name && taskAssigneeName.toLowerCase() === user.name.toLowerCase()) {
    return true;
  }

  return false;
};

/**
 * Trả về class và thuộc tính để chống trình duyệt tự dịch tên nhân sự.
 */
export const getSafeNameProps = () => ({
  translate: 'no' as const,
  className: 'notranslate'
});
