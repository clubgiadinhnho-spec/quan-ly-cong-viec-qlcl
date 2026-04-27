export type UserRoleType = 'Nhân Viên' | 'Trưởng Nhóm' | 'Trưởng Phòng' | 'Admin';

export interface User {
  id: string;
  name: string;
  phone: string;
  zalo?: string;
  role: UserRoleType;
  companyEmail: string;
  personalEmail: string;
  avatar: string;
  code: string;
  abbreviation: string;
  personalNote?: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
}

export interface ProgressUpdate {
  version: number;
  content: string;
  timestamp: string;
  authorId: string;
}

export type TaskStatus = 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

export interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
}

export interface Task {
  id: string;
  code: string;
  issueDate: string;
  title: string;
  objective: string;
  assigneeId: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  prevProgress: string; // Diễn tiến tuần trước
  currentUpdate: string; // Cập nhật nội dung trong 2 tuần tiếp theo
  history: ProgressUpdate[];
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  isHighlighted: boolean;
  isLocked: boolean; // Chốt 2 tuần/lần
  comments?: TaskComment[];
  reportExplanation?: string;
  reportAttachments?: string[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
