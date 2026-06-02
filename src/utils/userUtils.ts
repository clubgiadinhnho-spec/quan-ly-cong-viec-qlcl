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
  const userByName = allUsers.find(u => (u.name || '').toLowerCase() === id.toLowerCase());
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
  
  const assigneeId = (task.assigneeId || '').trim();
  if (!assigneeId) return false;

  const assigneeIdLower = assigneeId.toLowerCase();

  // 1. So khớp ID trực tiếp hoặc UID Auth hoặc uniqueKey
  if (user.id && assigneeIdLower === user.id.toLowerCase()) return true;
  if ((user as any).uid && assigneeIdLower === (user as any).uid.toLowerCase()) return true;
  if (user.uniqueKey && assigneeIdLower === user.uniqueKey.toLowerCase()) return true;
  if (user.code && assigneeIdLower === user.code.toLowerCase()) return true;

  // 2. So khớp theo Email (email, companyEmail, personalEmail)
  const userEmails = [
    user.email,
    user.companyEmail,
    user.personalEmail
  ].map(e => (e || '').trim().toLowerCase()).filter(Boolean);

  if (userEmails.includes(assigneeIdLower)) return true;

  // 3. Tra cứu trong danh sách FIXED_STAFF để so khớp Email
  const staffByTask = FIXED_STAFF.find(u => 
    (u.id && u.id.toLowerCase() === assigneeIdLower) || 
    (u.code && u.code.toLowerCase() === assigneeIdLower) ||
    (u.uniqueKey && u.uniqueKey.toLowerCase() === assigneeIdLower)
  );
  if (staffByTask) {
    const staffEmails = [
      staffByTask.companyEmail,
      staffByTask.personalEmail,
      (staffByTask as any).email
    ].map(e => (e || '').trim().toLowerCase()).filter(Boolean);

    if (staffEmails.some(se => userEmails.includes(se))) return true;
  }
  
  // 4. So khớp theo tên hiển thị (Trường hợp cuối)
  const taskAssigneeName = task.assigneeName || task.assignedTo;
  if (taskAssigneeName && user.name && taskAssigneeName.toLowerCase() === user.name.toLowerCase()) {
    return true;
  }

  return false;
};

/**
 * Kiểm tra xem người dùng có quyền Admin hay không.
 */
export const checkIsAdmin = (user: User | null): boolean => {
  if (!user) return false;
  
  const role = (user.role || '').toUpperCase();
  if (role === 'ADMIN') return true;

  const identifiers = [
    (user.uniqueKey || '').toLowerCase(),
    (user.id || '').toLowerCase(),
    (user.email || '').toLowerCase(),
    (user.companyEmail || '').toLowerCase(),
  ];

  const adminIdentifiers = [
    'lenhattruong09xxxxxxxx',
    'lenhattruong.tpp@gmail.com',
    'lenhattruong.caphef1@gmail.com',
    'truong.le@tanphuvietnam.vn',
    'club.nhuatanphu@gmail.com',
    'tanphuvietnam.tpp@gmail.com',
    'truongln.tanhongngoc@gmail.com'
  ];

  if (identifiers.some(id => adminIdentifiers.includes(id))) return true;

  // So khớp tên (không dấu, chữ thường)
  const normalizedName = normalizeString(user.name || '');
  if (normalizedName === 'le nhat truong') return true;

  return false;
};

/**
 * Kiểm tra xem công việc có phải là định kỳ hay không.
 */
export const checkIsRecurring = (task: Partial<Task> | null): boolean => {
  if (!task) return false;
  
  // 1. Check direct recurrence field
  if (task.recurrence) {
    const rec = task.recurrence.toUpperCase();
    const noneValues = ['NONE', 'KHÔNG LẶP', 'KHONG LAP', 'KHÔNG', 'KHONG', 'KHÔNG LẶP LẠI', 'KHONG LAP LAI', 'NO', 'FALSE', '0'];
    const normalizedRec = normalizeString(rec).toUpperCase();
    if (!noneValues.includes(normalizedRec) && normalizedRec !== '') return true;
  }
  
  // 2. Check if it has cycle history (evidence of recurrence)
  if (task.cycleHistory && task.cycleHistory.length > 0) return true;
  
  return false;
};

/**
 * Kiểm tra xem công việc có bị xóa hay không.
 */
export const isTaskDeleted = (task: any): boolean => {
  if (!task) return true;
  if (task.deletedAt) return true;
  if (task.requestDelete === true) return true;
  
  const statusStr = String(task.status || '');
  if (!statusStr) return false;

  const status = normalizeString(statusStr).replace(/\s+/g, '').toUpperCase();
  const deletedStatuses = ['DELETED', 'RAC', 'TRASH', 'DAXOA', 'DELETE', 'XOA', 'TRUNGTAMXOA', 'RECYCLED'];
  return deletedStatuses.includes(status);
};

/**
 * Chuẩn hóa chuỗi: chuyển thành chữ thường, loại bỏ dấu tiếng Việt.
 */
export const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');
};

/**
 * Trả về class và thuộc tính để chống trình duyệt tự dịch tên nhân sự.
 */
export const getSafeNameProps = () => ({
  translate: 'no' as const,
  className: 'notranslate'
});
