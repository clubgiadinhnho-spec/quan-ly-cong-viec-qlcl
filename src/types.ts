export type UserRoleType = 'Nhân Viên' | 'Trưởng Nhóm' | 'Trưởng Phòng' | 'Admin';

export interface HealthReminder {
  enabled: boolean;
  intervalMinutes: number;
  message: string;
  autoCloseSeconds: number;
  configName: string;
}

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
  securityQuestion?: string;
  securityAnswer?: string;
  lastActive?: number;
  cvUrl?: string;
  cvDetails?: string;
  reminderSettings?: HealthReminder;
}

export interface ProgressUpdate {
  version: number;
  content: string;
  timestamp: string;
  authorId: string;
}

export type TaskStatus = 'PENDING_REVIEW' | 'TODO' | 'IN_PROGRESS' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';

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
  assigneeId: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  prevProgress: string; // Diễn tiến tuần trước
  currentUpdate: string; // Cập nhật nội dung trong 2 tuần tiếp theo
  history: ProgressUpdate[];
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
