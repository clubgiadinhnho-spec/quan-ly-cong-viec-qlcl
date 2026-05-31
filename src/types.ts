export type UserRoleType = 'Staff' | 'Leader' | 'Admin' | 'Trưởng Phòng';

export interface HealthReminder {
  enabled: boolean;
  intervalMinutes: number;
  message: string;
  autoCloseSeconds: number;
  configName: string;
}

export interface UserPermissions {
  // QUẢN LÝ CÔNG VIỆC (MACRO CONTROLS FROM PREVIOUS VERSION)
  canCreateTask: boolean;
  canEditTask?: boolean;
  canApproveTask: boolean;
  canDeleteTask: boolean;
  
  // DỮ LIỆU & BÁO CÁO EXCEL (MACRO CONTROLS FROM PREVIOUS VERSION)
  canExportExcel: boolean;
  canImportExcel: boolean;

  // BÁO CÁO THÁNG & KPI
  canViewReports?: boolean;
  canConfigReportKpi?: boolean;

  // TIỆN ÍCH VĂN PHÒNG
  canViewOfficeCalendar?: boolean;
  canRegisterCalendar?: boolean;
  canApproveLeaveRequest?: boolean;

  // QUẢN TRỊ HỆ THỐNG
  canManageStaff: boolean;
  canManageCategories?: boolean;
  canViewSystemHistory?: boolean;
  canAccessSuperBackup?: boolean;

  // -------------------------------------------------------------
  // TRANG ĐỀ XUẤT MỚI (NEW PROPOSALS) - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  newProposals_view?: boolean;
  newProposals_create?: boolean;
  newProposals_attach?: boolean;
  newProposals_print?: boolean;
  newProposals_search?: boolean;
  newProposals_edit?: boolean;
  newProposals_delete?: boolean;
  newProposals_color?: boolean;
  newProposals_encode?: boolean;
  newProposals_importExcel?: boolean;
  newProposals_exportExcel?: boolean;

  // -------------------------------------------------------------
  // TRANG BẢNG CÔNG VIỆC (ACTIVE TASKS) - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  tasks_view?: boolean;
  tasks_edit?: boolean;
  tasks_delete?: boolean;
  tasks_color?: boolean;
  tasks_search?: boolean;
  tasks_print?: boolean;
  tasks_comment?: boolean;

  // -------------------------------------------------------------
  // TRANG TRÌNH DUYỆT (PENDING APPROVAL) - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  pendingApproval_view?: boolean;
  pendingApproval_approve?: boolean;
  pendingApproval_reject?: boolean;

  // -------------------------------------------------------------
  // TRANG CÔNG VIỆC HOÀN THÀNH - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  completedTasks_view?: boolean;
  completedTasks_undo?: boolean;

  // -------------------------------------------------------------
  // TRUNG TÂM XÓA (TRASH) - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  trash_view?: boolean;
  trash_restore?: boolean;
  trash_purge?: boolean;

  // -------------------------------------------------------------
  // PHÂN KHU VĂN PHÒNG (STAFF / UTILITIES) - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  office_viewCalendar?: boolean;
  office_registerCalendar?: boolean;
  office_approveLeave?: boolean;
  office_manageHr?: boolean;

  // -------------------------------------------------------------
  // BÁO CÁO THÁNG & KPI - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  reports_viewPage?: boolean;
  reports_configPage?: boolean;

  // -------------------------------------------------------------
  // PHÂN KHU DỮ LIỆU & HỆ THỐNG - FINE-GRAINED PERMISSIONS
  // -------------------------------------------------------------
  system_viewLogPage?: boolean;
  system_backupPage?: boolean;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 
    | 'DELEGATION_CHANGE' 
    | 'DELEGATED_ACTION' 
    | 'SYSTEM' 
    | 'TASK_CREATE'
    | 'TASK_UPDATE' 
    | 'TASK_DELETE' 
    | 'TASK_RESTORE' 
    | 'TASK_PERMANENT_DELETE'
    | 'TASK_LOCK'
    | 'ERROR' 
    | 'PROFILE_UPDATE';
  userId: string; // The person who performed the action
  userName?: string; // Explicit name tracking for logs
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
  birthDate?: string; // Date of birth (format: YYYY-MM-DD or standard)
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
  updatedFields?: string[];
  updatedFieldsAt?: string;
  updatedAt?: string;
  layoutConfig?: any;
}

export interface ProgressUpdate {
  version: number;
  content: string;
  timestamp: string;
  authorId: string;
}

export type TaskStatus = 'Chưa bắt đầu' | 'Đang thực hiện' | 'Hoàn thành' | 'Tạm dừng' | 'IN_PROGRESS' | 'PENDING' | 'APPROVED' | 'PENDING_APPROVAL' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD' | 'AWAITING_CONFIRMATION' | 'DELETED';

export type NotificationType = 'COMPLETED_REQUEST' | 'DELETE_REQUEST';

export interface AppNotification {
  id: string;
  senderName: string;
  taskCode: string;
  taskId: string;
  type: NotificationType;
  createdAt: string;
  expiresAt: string;
  isRead: boolean;
}

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
  attachments?: {
    name: string;
    url: string;
    type: 'image' | 'file';
    size: number;
  }[];
}

export type RecurrenceType = 'NONE' | 'DAILY' | 'TRI_DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'TRI_WEEKLY' | 'MONTHLY';

export interface CycleHistoryEntry {
  version: number;
  code?: string;
  reportContent: string;
  objective?: string;
  completedAt: string;
  nextDeadline: string;
}

export interface TaskCategory {
  id: string;
  code: string;
  name: string;
  activityName?: string;
}

export interface QCDEvaluation {
  q: number;
  c: number;
  d: number;
  explanation: string;
  qExplanation?: string;
  cExplanation?: string;
  dExplanation?: string;
  qComment?: string;
  cComment?: string;
  dComment?: string;
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
  prevProgress: string; // Diễn tiến trước đó
  currentUpdate: string; // Cập nhật nội dung thực hiện
  history: ProgressUpdate[];
  status: TaskStatus;
  priority: TaskPriority;
  priorityOrder?: number;
  highlightColor?: string | null; // e.g. 'amber', 'emerald', 'blue', 'red', 'purple'
  isHighlighted: boolean;
  isLocked: boolean; // Trạng thái khóa (khi hoàn thành)
  recurrence?: RecurrenceType;
  cycleHistory?: CycleHistoryEntry[];
  attachmentUrl?: string;
  attachmentName?: string;
  category?: string; // Mã phân loại từ task_categories
  updatedAt: string;
  comments?: TaskComment[];
  requestDelete?: boolean;
  requestUndo?: 'PENDING' | 'APPROVED' | 'REJECTED';
  undoRequestAt?: string;
  undoRequestBy?: string;
  reportExplanation?: string;
  reportAttachments?: string[];
  isNewSoldier?: boolean;
  authorId?: string;
  authorName?: string;
  lastUpdatedBy?: string;
  lastUpdatedByRole?: string;
  deletedAt?: string;
  systemCreatedAt?: string;
  isNewUpdate?: boolean;
  isCycleRecord?: boolean;
  lastUpdateAt?: string;
  waitingApproval?: boolean;
  waitingApprovalAt?: string;
  staffQCD?: QCDEvaluation;
  leaderQCD?: QCDEvaluation;
  leader_Q?: number;
  leader_C?: number;
  leader_D?: number;
  managerRemarks?: string;
  kpiEfficiency?: string | number;
  isNewInBoard?: boolean;
  lastActionAt?: string;
  aiReminderResponded?: boolean;
  aiReminderLastDate?: string;
  aiReminderCreatedAt?: string;
  patrolReviewedByAdmin?: boolean;
  lastPatrolTime?: string;
  patrolStatus?: string;
  requestEndTracking?: boolean;
  last_ai_content?: string;
  last_ai_response?: string;
  stage1Done?: boolean;
  stage1CompletedAt?: string;
  stage1KpiPassed?: boolean;
  aiApplied?: boolean | null;
  aiAppliedDetails?: string | null;
  lastPatrolResult?: {
    assistantReply?: string;
    supervisorClosing?: string;
    nextAction?: string;
    patrolledAt?: string;
  };
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
  orderCode?: string;
  topicCode?: string; // Standardized code like P0012026
  title: string;
  description?: string;
  createdBy: string;
  creatorAvatar?: string;
  createdAt: string;
  closedAt?: string;
  status: 'OPEN' | 'CLOSED' | 'DELETED';
  isDefault?: boolean;
  isPinned?: boolean;
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

export interface AIChatMessage {
  id: string;
  taskId: string;
  userId: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: string;
}
