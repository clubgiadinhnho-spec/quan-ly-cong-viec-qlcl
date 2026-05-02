export type UserRoleType = 'Staff' | 'Leader' | 'Admin';

export interface HealthReminder {
  enabled: boolean;
  intervalMinutes: number;
  message: string;
  autoCloseSeconds: number;
  configName: string;
}

export interface UserPermissions {
  canCreateTask: boolean;
  canApproveTask: boolean;
  canDeleteTask: boolean;
  canExportExcel: boolean;
  canImportExcel: boolean;
  canManageStaff: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'DELEGATION_CHANGE' | 'DELEGATED_ACTION' | 'SYSTEM';
  userId: string; // The person who performed the action
  targetId?: string; // The person who was the target (e.g. delegated to)
  details: string;
  metadata?: any;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  zalo?: string;
  role: UserRoleType;
  companyEmail: string;
  personalEmail: string;
  email?: string; // For auth mapping
  avatar: string;
  code: string;
  title?: string; // e.g. Chuyên viên QC, Quản lý
  password?: string; // Optional field to store/display password on ID card
  uniqueKey: string;
  abbreviation: string;
  personalNote?: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  securityQuestion?: string;
  securityAnswer?: string;
  lastActive?: number;
  cvUrl?: string;
  cvDetails?: string;
  reminderSettings?: HealthReminder;
  delegatedPermissions?: UserPermissions;
}

export interface ProgressUpdate {
  version: number;
  content: string;
  timestamp: string;
  authorId: string;
}

export type TaskStatus = 'Chưa bắt đầu' | 'Đang thực hiện' | 'Hoàn thành' | 'Tạm dừng' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD' | 'AWAITING_CONFIRMATION';

export type TaskPriority = 'Thấp' | 'Trung bình' | 'Cao' | 'Khẩn cấp' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface TaskComment {
  id: string;
  authorId: string;
  content: string;
  timestamp: string;
  reactions?: MessageReaction[];
}

export interface PrivateMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  chatId: string;
  reactions?: MessageReaction[];
}

export interface Task {
  id: string;
  code: string;
  issueDate: string;
  title: string;
  objective: string;
  description?: string; // Tên cũ hoặc mô tả bổ sung
  assigneeId: string;
  assignedTo?: string; // Tên người phụ trách (hiển thị)
  assigneeName?: string; // Tên nhân viên từ Excel hoặc hệ thống
  startDate: string;
  expectedEndDate: string;
  extensionDate?: string;
  dueDate?: string; // Alias cho expectedEndDate
  actualEndDate?: string;
  prevProgress: string; // Diễn tiến tuần trước
  currentUpdate: string; // Cập nhật nội dung trong 2 tuần tiếp theo
  history: ProgressUpdate[];
  status: TaskStatus;
  priority: TaskPriority;
  priorityOrder?: number;
  isHighlighted: boolean;
  isLocked: boolean; // Chốt 2 tuần/lần
  attachmentUrl?: string;
  attachmentName?: string;
  updatedAt: string;
  comments?: TaskComment[];
  requestDelete?: boolean;
  reportExplanation?: string;
  reportAttachments?: string[];
  isNewSoldier?: boolean;
  authorId?: string;
  deletedAt?: string;
}

export interface ReportDraft {
  id: string;
  monthYear: string;
  content: string;
  userId: string;
  updatedAt: string;
}

export interface OfficialReport {
  id: string;
  monthYear: string;
  content: string;
  userId: string;
  stats: {
    total: number;
    completed: number;
    ongoing: number;
    issues: number;
  };
  isOfficial: boolean;
  createdAt: string;
}

export interface DiscussionMessage {
  id: string;
  authorId: string;
  topicId: string;
  content: string;
  timestamp: string;
  reactions?: MessageReaction[];
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'file';
    size: number;
  }[];
}

export interface DiscussionTopic {
  id: string;
  title: string;
  description?: string;
  createdBy: string;
  creatorAvatar?: string;
  createdAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED';
  isDefault?: boolean;
}

export interface UserPresence {
  id: string;
  name: string;
  avatar: string;
  lastActive: string;
  status: 'online' | 'offline';
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
