import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserPermissions } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { useTaskContext } from '../../contexts/TaskContext';
import { 
  Search, Shield, Save, Users, RefreshCw, CheckCircle, 
  Briefcase, Database, Calendar as CalendarIcon, 
  Settings, BarChart3, Check, X, ShieldAlert,
  Sliders, Info, HelpCircle, Lock, Sparkles, CheckSquare, Square
} from 'lucide-react';

interface PermissionMatrixTabProps {
  effectiveUser: User;
  presence: any[];
  allUsers: User[];
  updateProfile: (uniqueKey: string, updates: any) => Promise<void>;
  setConfirmModal: (m: any) => void;
}

interface PermissionGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  items: {
    key: keyof UserPermissions;
    label: string;
    description: string;
    defaultStaff: boolean;
    defaultAdmin: boolean;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'newProposals',
    label: 'TRANG ĐỀ XUẤT MỚI',
    icon: <Settings size={14} strokeWidth={2.5} />,
    color: 'emerald',
    bgColor: 'bg-emerald-50/70',
    borderColor: 'border-emerald-200/50',
    textColor: 'text-emerald-700',
    items: [
      { key: 'newProposals_view', label: 'XEM & MỞ TRANG "ĐỀ XUẤT MỚI"', description: 'Cho phép nhìn thấy và truy cập vào trang Đề xuất mới', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_create', label: 'FORM NHẬP CÔNG VIỆC MỚI', description: 'Cho phép điền và nộp phiếu đăng ký chỉ tiêu công tác mới', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_attach', label: 'ĐÍNH KÈM TÀI LIỆU/HÌNH ẢNH', description: 'Cho phép đính kèm file hoặc ảnh đề xuất. Khi tắt, form ẩn tính năng chèn file.', defaultStaff: false, defaultAdmin: false },
      { key: 'newProposals_print', label: 'IN ĐỀ XUẤT RA PDF', description: 'Cho phép tạo bản in hoặc tải báo cáo PDF chỉ tiêu chờ duyệt', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_search', label: 'TÌM KIẾM ĐẦU VIỆC', description: 'Cho phép sử dụng ô tìm kiếm lọc nhanh danh sách', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_edit', label: 'SỬA ĐỀ XUẤT', description: 'Cho phép thay đổi nội dung mục tiêu công việc chờ phê duyệt', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_delete', label: 'XÓA ĐỀ XUẤT', description: 'Cho phép gỡ bỏ các đề xuất công việc chưa phê duyệt', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_color', label: 'TÔ MÀU ĐẦU VIỆC (Highlight)', description: 'Cho phép đánh dấu nổi bật bằng màu sắc cho đề xuất', defaultStaff: true, defaultAdmin: true },
      { key: 'newProposals_encode', label: 'MÃ HÓA CÔNG VIỆC (Mã hóa KPI Quy chuẩn)', description: 'Cho phép truy cập menu mã hóa quy chuẩn công việc KPI phòng ban', defaultStaff: false, defaultAdmin: true },
      { key: 'newProposals_importExcel', label: 'NHẬP BÁO CÁO EXCEL', description: 'Cho phép nhập danh sách đề xuất hàng loạt bằng tệp excel', defaultStaff: false, defaultAdmin: true },
      { key: 'newProposals_exportExcel', label: 'XUẤT EXCEL DANH SÁCH', description: 'Cho phép tải danh sách các đề xuất chờ duyệt về tệp excel', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    id: 'tasks',
    label: 'TRANG BẢNG CÔNG VIỆC',
    icon: <Briefcase size={14} strokeWidth={2.5} />,
    color: 'blue',
    bgColor: 'bg-blue-50/70',
    borderColor: 'border-blue-200/50',
    textColor: 'text-blue-700',
    items: [
      { key: 'tasks_view', label: 'TRUY CẬP BẢNG CÔNG VIỆC CHÍNH THỨC', description: 'Cho phép nhìn thấy và mở trang Bảng công việc đã duyệt chính thức', defaultStaff: true, defaultAdmin: true },
      { key: 'tasks_edit', label: 'SỬA ĐẦU VIỆC CHÍNH THỨC', description: 'Cho phép cập nhật diễn tiến, tiến độ công tác đang chạy', defaultStaff: true, defaultAdmin: true },
      { key: 'tasks_delete', label: 'XÓA ĐẦU VIỆC CHÍNH THỨC', description: 'Cho phép yêu cầu hoặc trực tiếp gỡ bỏ công việc đang chạy', defaultStaff: false, defaultAdmin: true },
      { key: 'tasks_color', label: 'TÔ MÀU DÒNG (Highlight)', description: 'Cho phép tô màu phân tách mức độ, mã màu nổi bật cho dòng công trình', defaultStaff: true, defaultAdmin: true },
      { key: 'tasks_search', label: 'TÌM KIẾM BẢNG CÔNG VIỆC', description: 'Cho phép sử dụng thanh tìm kiếm lọc thông minh phòng ban', defaultStaff: true, defaultAdmin: true },
      { key: 'tasks_print', label: 'IN PDF / XUẤT BẢN FILE', description: 'Cho phép xuất bản in hoặc tải chi tiết bảng tiến độ công tác ra PDF', defaultStaff: true, defaultAdmin: true },
      { key: 'tasks_comment', label: 'TRAO ĐỔI & CHAT THẢO LUẬN', description: 'Cho phép trò chuyện, phản hồi thông tin trên trực dòng công việc', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    id: 'pendingApproval',
    label: 'TRANG TRÌNH DUYỆT TIẾN ĐỘ',
    icon: <Shield size={14} strokeWidth={2.5} />,
    color: 'amber',
    bgColor: 'bg-amber-50/70',
    borderColor: 'border-amber-200/50',
    textColor: 'text-amber-700',
    items: [
      { key: 'pendingApproval_view', label: 'TRUY CẬP TRANG "TRÌNH DUYỆT"', description: 'Cho phép nhìn thấy và ở trang kiểm duyệt tiến độ hoàn thành', defaultStaff: false, defaultAdmin: true },
      { key: 'pendingApproval_approve', label: 'PHÊ DUYỆT HOÀN THÀNH', description: 'Chấp thuận báo cáo tốt, duyệt hoàn tất công tác và chốt kết quả lập chỉ số', defaultStaff: false, defaultAdmin: true },
      { key: 'pendingApproval_reject', label: 'TỪ CHỐI / HOÀN TRẢ TIẾN ĐỘ', description: 'Từ chối báo cáo, yêu cầu điều chỉnh cập nhật lại nội dung kiểm định', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    id: 'completedTasks',
    label: 'TRANG CÔNG VIỆC HOÀN THÀNH',
    icon: <CheckCircle size={14} strokeWidth={2.5} />,
    color: 'sky',
    bgColor: 'bg-sky-50/70',
    borderColor: 'border-sky-200/50',
    textColor: 'text-sky-700',
    items: [
      { key: 'completedTasks_view', label: 'TRUY CẬP TRANG HOÀN THÀNH', description: 'Cho phép nhìn thấy dữ liệu mốc thời gian hoàn tất', defaultStaff: true, defaultAdmin: true },
      { key: 'completedTasks_undo', label: 'YÊU CẦU HOÀN TÁC / MỞ LẠI KỲ VIỆC', description: 'Cho phép phục hồi các công việc đã khóa hoàn thành về trạng thái hoạt động', defaultStaff: true, defaultAdmin: true },
    ]
  },
  {
    id: 'trash',
    label: 'TRUNG TÂM XÓA (THÙNG RÁC)',
    icon: <Sliders size={14} strokeWidth={2.5} />,
    color: 'red',
    bgColor: 'bg-red-50/70',
    borderColor: 'border-red-200/50',
    textColor: 'text-red-700',
    items: [
      { key: 'trash_view', label: 'TRUY CẬP TRUNG TÂM XÓA', description: 'Cho phép nhìn thấy và mở danh mục lưu trữ tạm thời', defaultStaff: false, defaultAdmin: true },
      { key: 'trash_restore', label: 'KHÔI PHỤC CÔNG VIỆC BỊ XÓA', description: 'Cho phép phục hồi các chỉ tiêu lỗi trở lại khu vực công vụ', defaultStaff: false, defaultAdmin: true },
      { key: 'trash_purge', label: 'XÓA VĨNH VIỄN CƠ SỞ DỮ LIỆU', description: 'Gỡ bỏ hoàn toàn dòng bản ghi khỏi bộ nhớ không thể hoàn trả', defaultStaff: false, defaultAdmin: false },
    ]
  },
  {
    id: 'office',
    label: 'PHÂN KHU VĂN PHÒNG',
    icon: <CalendarIcon size={14} strokeWidth={2.5} />,
    color: 'purple',
    bgColor: 'bg-purple-50/70',
    borderColor: 'border-purple-200/50',
    textColor: 'text-purple-700',
    items: [
      { key: 'office_viewCalendar', label: 'XEM LỊCH CÔNG TÁC TOÀN PHÒNG', description: 'Theo dõi hành trình lịch trình công cụ di động toàn phòng khí hóa', defaultStaff: true, defaultAdmin: true },
      { key: 'office_registerCalendar', label: 'ĐĂNG KÝ HÀM CHẤM CÔNG VÀ NGHỈ CA', description: 'Tự khai báo thời ca chấm công biểu và nộp xin phép hằng ngày', defaultStaff: true, defaultAdmin: true },
      { key: 'office_approveLeave', label: 'DUYỆT ĐƠN NGHỈ PHÉP NHÂN SỰ', description: 'Được quyền duyệt phép, tích lũy bảo lưu ngày phép cho các chuyên viên', defaultStaff: false, defaultAdmin: true },
      { key: 'office_manageHr', label: 'QUẢN LÝ THÔNG TIN NHÂN SỰ', description: 'Chỉnh sửa thông tin thành viên, tạo sơ yếu lý bạ phòng chất lượng', defaultStaff: false, defaultAdmin: true },
      { key: 'office_syncLeaveQuota', label: 'ĐỒNG BỘ NGHỈ PHÉP & QUỸ PHÉP (Lưu/Sync)', description: 'Cho phép nhấn Lưu & Đồng bộ quỹ phép và Lưu & Đồng bộ chủ động', defaultStaff: false, defaultAdmin: true },
      { key: 'office_manageAttendanceSheet', label: 'QUẢN LÝ BẢNG CHẤM CÔNG (Lưu/Reset)', description: 'Cho phép Lưu bảng công và Đặt lại mặc định', defaultStaff: false, defaultAdmin: true },
      { key: 'office_manageBirthdayWishes', label: 'GỬI & LƯU LỜI CHÚC SINH NHẬT', description: 'Cho phép điền, gửi và Lưu lời chúc sinh nhật', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    id: 'reports',
    label: 'BÁO CÁO THÁNG & KPI',
    icon: <BarChart3 size={14} strokeWidth={2.5} />,
    color: 'violet',
    bgColor: 'bg-violet-50/70',
    borderColor: 'border-violet-200/50',
    textColor: 'text-violet-700',
    items: [
      { key: 'reports_viewPage', label: 'TRUY CẬP XEM BÁO CÁO KPI PHÒNG', description: 'Theo dõi kết quả hoàn tất biểu đồ & năng suất phòng QLCL', defaultStaff: false, defaultAdmin: true },
      { key: 'reports_configPage', label: 'THIẾT LẬP KPI PHÒNG BAN', description: 'Điều phối điều kiện các chỉ mục cân đo, cài đặt trọng số cốt quy định', defaultStaff: false, defaultAdmin: true },
      { key: 'reports_saveEvaluation', label: 'LƯU ĐÁNH GIÁ THÁNG (KPI)', description: 'Cho phép quản lý bấm nút Lưu Đánh Giá Tháng', defaultStaff: false, defaultAdmin: true },
    ]
  },
  {
    id: 'system',
    label: 'DỮ LIỆU & BẢO MẬT HỆ THỐNG',
    icon: <Database size={14} strokeWidth={2.5} />,
    color: 'slate',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    items: [
      { key: 'system_viewLogPage', label: 'TRUY VẾT LOG LỊCH SỬ THỜI GIAN THỰC', description: 'Xem và truy vết lịch sử thao tác hệ thống toàn cục chặt chẽ', defaultStaff: false, defaultAdmin: true },
      { key: 'system_backupPage', label: 'SAO LƯU & SAO CHÉP DỮ LIỆU GỐC', description: 'Lưu trữ sao lục JSON hoặc hồi phục nền tảng dữ liệu trực tuyến', defaultStaff: false, defaultAdmin: false },
    ]
  }
];

// Helper to determine default permissions based on rules and user role.
// Treating Tân, Tú, Hùng like staff-level by default
export const getUserDefaultPermissions = (user: User): UserPermissions => {
  const normName = (user.name || '').trim();
  const isLikeTu = normName.toLowerCase().includes('tân') || 
                   normName.toLowerCase().includes('tú') || 
                   normName.toLowerCase().includes('hùng');
  const role = isLikeTu ? 'Staff' : user.role;
  const isStaffDefault = role === 'Staff';

  return {
    canCreateTask: true,
    canEditTask: true,
    canApproveTask: !isStaffDefault,
    canDeleteTask: !isStaffDefault,
    canExportExcel: !isStaffDefault,
    canImportExcel: !isStaffDefault,
    canViewReports: !isStaffDefault,
    canConfigReportKpi: !isStaffDefault,
    canViewOfficeCalendar: true,
    canRegisterCalendar: true,
    canApproveLeaveRequest: !isStaffDefault,
    canManageStaff: !isStaffDefault,
    canManageCategories: !isStaffDefault,
    canViewSystemHistory: !isStaffDefault,
    canAccessSuperBackup: false,

    newProposals_view: true,
    newProposals_create: true,
    newProposals_attach: false,
    newProposals_print: true,
    newProposals_search: true,
    newProposals_edit: true,
    newProposals_delete: true,
    newProposals_color: true,
    newProposals_encode: !isStaffDefault,
    newProposals_importExcel: !isStaffDefault,
    newProposals_exportExcel: !isStaffDefault,

    tasks_view: true,
    tasks_edit: true,
    tasks_delete: !isStaffDefault,
    tasks_color: true,
    tasks_search: true,
    tasks_print: true,
    tasks_comment: true,

    pendingApproval_view: !isStaffDefault,
    pendingApproval_approve: !isStaffDefault,
    pendingApproval_reject: !isStaffDefault,

    completedTasks_view: true,
    completedTasks_undo: true,

    trash_view: !isStaffDefault,
    trash_restore: !isStaffDefault,
    trash_purge: false,

    office_viewCalendar: true,
    office_registerCalendar: true,
    office_approveLeave: !isStaffDefault,
    office_manageHr: false,
    office_syncLeaveQuota: !isStaffDefault,
    office_manageAttendanceSheet: !isStaffDefault,
    office_manageBirthdayWishes: !isStaffDefault,

    reports_viewPage: !isStaffDefault,
    reports_configPage: !isStaffDefault,
    reports_saveEvaluation: !isStaffDefault,

    system_viewLogPage: !isStaffDefault,
    system_backupPage: false,
  };
};

export const getUserPermissionsOf = (user: User): UserPermissions => {
  const defaults = getUserDefaultPermissions(user);
  const perms = user.delegatedPermissions || {};
  
  const merged: any = {};
  Object.keys(defaults).forEach((k) => {
    const key = k as keyof UserPermissions;
    merged[key] = perms[key] ?? defaults[key];
  });
  
  return merged as UserPermissions;
};

// Sync legacy macro permissions with fine-grained ones when saving
const syncMacroPermissions = (p: UserPermissions): UserPermissions => {
  return {
    ...p,
    canCreateTask: p.newProposals_create ?? true,
    canEditTask: p.tasks_edit ?? p.newProposals_edit ?? true,
    canApproveTask: p.pendingApproval_approve ?? false,
    canDeleteTask: p.tasks_delete ?? p.newProposals_delete ?? false,
    canExportExcel: p.newProposals_exportExcel ?? false,
    canImportExcel: p.newProposals_importExcel ?? false,
    canViewReports: p.reports_viewPage ?? false,
    canConfigReportKpi: p.reports_configPage ?? false,
    canViewOfficeCalendar: p.office_viewCalendar ?? true,
    canRegisterCalendar: p.office_registerCalendar ?? true,
    canApproveLeaveRequest: p.office_approveLeave ?? false,
    canManageStaff: p.office_manageHr ?? false,
    canManageCategories: p.reports_configPage ?? false,
    canViewSystemHistory: p.system_viewLogPage ?? false,
    canAccessSuperBackup: p.system_backupPage ?? false,
  };
};

export const PermissionMatrixTab: React.FC<PermissionMatrixTabProps> = ({
  effectiveUser,
  presence,
  allUsers,
  updateProfile,
  setConfirmModal,
}) => {
  const { selectedPermissionUserId, setSelectedPermissionUserId } = useTaskContext();
  const [searchPermissionQuery, setSearchPermissionQuery] = useState('');
  const [searchStaffQuery, setSearchStaffQuery] = useState('');
  
  const [matrixDraft, setMatrixDraft] = useState<Record<string, UserPermissions>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state with allUsers loaded data on mount or change
  useEffect(() => {
    if (allUsers.length > 0) {
      const initialDraft: Record<string, UserPermissions> = {};
      allUsers.forEach(u => {
        initialDraft[u.uniqueKey] = getUserPermissionsOf(u);
      });
      setMatrixDraft(initialDraft);
    }
  }, [allUsers]);

  // Clean context selections on unmount
  useEffect(() => {
    return () => {
      setSelectedPermissionUserId(null);
    };
  }, [setSelectedPermissionUserId]);

  const allowedNames = useMemo(() => {
    const fixedNames = ['Lê Nhật Trường', 'Nguyễn Kiều Phan Tú', 'Võ Thị Mỹ Tân', 'Bành Nhựt Hùng'].map(n => n.toLowerCase().trim());
    let customNames: string[] = [];
    try {
      const saved = localStorage.getItem('office_custom_employees');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          customNames = parsed.map((e: any) => (e.name || '').toLowerCase().trim()).filter(Boolean);
        }
      }
    } catch (e) {
      console.error("Read office_custom_employees error in PermissionMatrixTab:", e);
    }
    return [...fixedNames, ...customNames].filter(name => {
      const clean = name.toLowerCase().trim();
      return clean !== 'mai thị hậu' && clean !== 'quản trị viên' && clean !== 'quản trị viên hệ thống';
    });
  }, []);

  // Sorted user column sequence: Lê Nhật Trường first, then Võ Thị Mỹ Tân, Nguyễn Kiều Phan Tú, Bành Nhựt Hùng, then others
  const sortedUsersForColumns = useMemo(() => {
    const filtered = allUsers.filter(u => {
      const nameLower = (u.name || '').toLowerCase().trim();
      if (nameLower === 'mai thị hậu' || nameLower === 'quản trị viên' || nameLower === 'admin' || nameLower === 'quản trị viên hệ thống') {
        return false;
      }
      return allowedNames.some(allowed => 
        nameLower === allowed || 
        nameLower.includes(allowed) || 
        allowed.includes(nameLower)
      );
    });

    return [...filtered].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      
      if (nameA === 'Lê Nhật Trường') return -1;
      if (nameB === 'Lê Nhật Trường') return 1;
      
      if (nameA === 'Võ Thị Mỹ Tân') return -1;
      if (nameB === 'Võ Thị Mỹ Tân') return 1;
      
      if (nameA === 'Nguyễn Kiều Phan Tú') return -1;
      if (nameB === 'Nguyễn Kiều Phan Tú') return 1;
      
      if (nameA === 'Bành Nhựt Hùng') return -1;
      if (nameB === 'Bành Nhựt Hùng') return 1;
      
      return nameA.localeCompare(nameB);
    });
  }, [allUsers, allowedNames]);

  // Filter columns by staff name search
  const filteredUsers = useMemo(() => {
    if (!searchStaffQuery.trim()) return sortedUsersForColumns;
    return sortedUsersForColumns.filter(u => 
      u.name.toLowerCase().includes(searchStaffQuery.toLowerCase()) ||
      (u.code && u.code.toLowerCase().includes(searchStaffQuery.toLowerCase()))
    );
  }, [sortedUsersForColumns, searchStaffQuery]);

  // Filter permission rows by custom keywords
  const filteredGroups = useMemo(() => {
    if (!searchPermissionQuery.trim()) return PERMISSION_GROUPS;
    return PERMISSION_GROUPS.map(g => {
      const matchedItems = g.items.filter(item => 
        item.label.toLowerCase().includes(searchPermissionQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchPermissionQuery.toLowerCase())
      );
      return {
        ...g,
        items: matchedItems
      };
    }).filter(g => g.items.length > 0);
  }, [searchPermissionQuery]);

  // Toggle single cell
  const handleToggleCell = (userUniqueKey: string, permissionKey: keyof UserPermissions) => {
    setMatrixDraft(prev => {
      const current = prev[userUniqueKey] || getUserPermissionsOf(allUsers.find(u => u.uniqueKey === userUniqueKey)!);
      return {
        ...prev,
        [userUniqueKey]: {
          ...current,
          [permissionKey]: !current[permissionKey]
        }
      };
    });
    setSaveSuccess(false);
  };

  // Set preset for a single user directly from column header
  const handleUserPreset = (userUniqueKey: string, type: 'default' | 'all' | 'clear') => {
    const user = allUsers.find(u => u.uniqueKey === userUniqueKey);
    if (!user) return;

    let updated: UserPermissions;
    if (type === 'all') {
      updated = {
        canCreateTask: true, canEditTask: true, canApproveTask: true, canDeleteTask: true,
        canExportExcel: true, canImportExcel: true, canViewReports: true, canConfigReportKpi: true,
        canViewOfficeCalendar: true, canRegisterCalendar: true, canApproveLeaveRequest: true,
        canManageStaff: true, canManageCategories: true, canViewSystemHistory: true, canAccessSuperBackup: true,
        
        newProposals_view: true, newProposals_create: true, newProposals_attach: true, newProposals_print: true,
        newProposals_search: true, newProposals_edit: true, newProposals_delete: true, newProposals_color: true,
        newProposals_encode: true, newProposals_importExcel: true, newProposals_exportExcel: true,
        
        tasks_view: true, tasks_edit: true, tasks_delete: true, tasks_color: true, tasks_search: true,
        tasks_print: true, tasks_comment: true,
        pendingApproval_view: true, pendingApproval_approve: true, pendingApproval_reject: true,
        completedTasks_view: true, completedTasks_undo: true,
        trash_view: true, trash_restore: true, trash_purge: true,
        office_viewCalendar: true, office_registerCalendar: true, office_approveLeave: true, office_manageHr: true,
        reports_viewPage: true, reports_configPage: true,
        system_viewLogPage: true, system_backupPage: true,
      };
    } else if (type === 'clear') {
      updated = {
        canCreateTask: false, canEditTask: false, canApproveTask: false, canDeleteTask: false,
        canExportExcel: false, canImportExcel: false, canViewReports: false, canConfigReportKpi: false,
        canViewOfficeCalendar: false, canRegisterCalendar: false, canApproveLeaveRequest: false,
        canManageStaff: false, canManageCategories: false, canViewSystemHistory: false, canAccessSuperBackup: false,
        
        newProposals_view: false, newProposals_create: false, newProposals_attach: false, newProposals_print: false,
        newProposals_search: false, newProposals_edit: false, newProposals_delete: false, newProposals_color: false,
        newProposals_encode: false, newProposals_importExcel: false, newProposals_exportExcel: false,
        
        tasks_view: false, tasks_edit: false, tasks_delete: false, tasks_color: false, tasks_search: false,
        tasks_print: false, tasks_comment: false,
        pendingApproval_view: false, pendingApproval_approve: false, pendingApproval_reject: false,
        completedTasks_view: false, completedTasks_undo: false,
        trash_view: false, trash_restore: false, trash_purge: false,
        office_viewCalendar: false, office_registerCalendar: false, office_approveLeave: false, office_manageHr: false,
        reports_viewPage: false, reports_configPage: false,
        system_viewLogPage: false, system_backupPage: false,
      };
    } else {
      updated = getUserDefaultPermissions(user);
    }

    setMatrixDraft(prev => ({
      ...prev,
      [userUniqueKey]: updated
    }));
    setSaveSuccess(false);
  };

  // Mass action togglers for ALL users
  const handleGlobalPreset = (type: 'default' | 'all' | 'clear') => {
    const updatedDraft: Record<string, UserPermissions> = {};
    allUsers.forEach(u => {
      let updated: UserPermissions;
      if (type === 'all') {
        updated = {
          canCreateTask: true, canEditTask: true, canApproveTask: true, canDeleteTask: true,
          canExportExcel: true, canImportExcel: true, canViewReports: true, canConfigReportKpi: true,
          canViewOfficeCalendar: true, canRegisterCalendar: true, canApproveLeaveRequest: true,
          canManageStaff: true, canManageCategories: true, canViewSystemHistory: true, canAccessSuperBackup: true,
          
          newProposals_view: true, newProposals_create: true, newProposals_attach: true, newProposals_print: true,
          newProposals_search: true, newProposals_edit: true, newProposals_delete: true, newProposals_color: true,
          newProposals_encode: true, newProposals_importExcel: true, newProposals_exportExcel: true,
          
          tasks_view: true, tasks_edit: true, tasks_delete: true, tasks_color: true, tasks_search: true,
          tasks_print: true, tasks_comment: true,
          pendingApproval_view: true, pendingApproval_approve: true, pendingApproval_reject: true,
          completedTasks_view: true, completedTasks_undo: true,
          trash_view: true, trash_restore: true, trash_purge: true,
          office_viewCalendar: true, office_registerCalendar: true, office_approveLeave: true, office_manageHr: true,
          reports_viewPage: true, reports_configPage: true,
          system_viewLogPage: true, system_backupPage: true,
        };
      } else if (type === 'clear') {
        updated = {
          canCreateTask: false, canEditTask: false, canApproveTask: false, canDeleteTask: false,
          canExportExcel: false, canImportExcel: false, canViewReports: false, canConfigReportKpi: false,
          canViewOfficeCalendar: false, canRegisterCalendar: false, canApproveLeaveRequest: false,
          canManageStaff: false, canManageCategories: false, canViewSystemHistory: false, canAccessSuperBackup: false,
          
          newProposals_view: false, newProposals_create: false, newProposals_attach: false, newProposals_print: false,
          newProposals_search: false, newProposals_edit: false, newProposals_delete: false, newProposals_color: false,
          newProposals_encode: false, newProposals_importExcel: false, newProposals_exportExcel: false,
          
          tasks_view: false, tasks_edit: false, tasks_delete: false, tasks_color: false, tasks_search: false,
          tasks_print: false, tasks_comment: false,
          pendingApproval_view: false, pendingApproval_approve: false, pendingApproval_reject: false,
          completedTasks_view: false, completedTasks_undo: false,
          trash_view: false, trash_restore: false, trash_purge: false,
          office_viewCalendar: false, office_registerCalendar: false, office_approveLeave: false, office_manageHr: false,
          reports_viewPage: false, reports_configPage: false,
          system_viewLogPage: false, system_backupPage: false,
        };
      } else {
        updated = getUserDefaultPermissions(u);
      }
      updatedDraft[u.uniqueKey] = updated;
    });

    setMatrixDraft(updatedDraft);
    setSaveSuccess(false);
  };

  // Mass save to Firestore (only writing users that actually changed)
  const handleSaveMatrix = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const updatePromises = allUsers.map(async (u) => {
        const currentPermissions = getUserPermissionsOf(u);
        const draftPermissions = matrixDraft[u.uniqueKey];
        if (!draftPermissions) return;

        const hasChanged = Object.keys(currentPermissions).some(
          (key) => (draftPermissions as any)[key] !== (currentPermissions as any)[key]
        );

        if (hasChanged) {
          const syncedDraft = syncMacroPermissions(draftPermissions);
          await updateProfile(u.uniqueKey, { delegatedPermissions: syncedDraft });
        }
      });

      await Promise.all(updatePromises);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 5 * 1000);
    } catch (e: any) {
      console.error("Save matrix error:", e);
      setConfirmModal({
        show: true,
        title: 'LỖI CẬP NHẬT',
        message: 'Có lỗi xảy ra trong quá trình lưu trữ phân quyền. Vui lòng kiểm tra lại kết nối mạng đám mây.',
        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false }))
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      <HolidayBanner />
      <Header 
        title={
          <div className="flex items-center gap-2">
            <Shield size={20} className="text-blue-600 animate-pulse" />
            <span translate="no" className="notranslate font-black">PHÂN QUYỀN HỆ THỐNG</span>
          </div>
        } 
        onlineUsers={presence} 
        currentUserId={effectiveUser.id} 
      />

      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
        
        {/* TOP SUMMARY OVERVIEW CARD */}
        <div className="bg-slate-900 border border-slate-800 text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
          <div className="relative z-10 max-w-xl">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1 flex items-center gap-1.5">
              <Sparkles size={11} className="text-blue-400" />
              THIẾT QUÂN LUẬT PHÂN QUYỀN TRỰC QUAN
            </h2>
            <p className="text-xl font-black mt-1">MA TRẬN ỦY QUYỀN TÁC NGHIỆP PHÒNG QLCL</p>
            <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
              Bảng so sánh đa tuyến phân quyền. Layout tích hợp như cái **Bảng KPI**, hiển thị toàn diện mọi nhân sự theo cột và mọi tính năng theo dòng, giúp nhận biết tức thì ai được quyền gì, ai không được quyền một cách rõ ràng nhất.
            </p>
          </div>
          <Shield size={100} className="absolute right-[-10px] bottom-[-10px] text-slate-800 opacity-20 pointer-events-none" />
          
          <div className="mt-4 md:mt-0 flex flex-wrap items-center gap-2 shrink-0 z-10">
            <button
              onClick={() => handleGlobalPreset('default')}
              className="h-9 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] uppercase font-black tracking-tight rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Đồng loạt cài đặt phân quyền về mặc định xuất phát điểm ban đầu"
            >
              <RefreshCw size={11} />
              ĐỒNG ĐẠT MẶC ĐỊNH
            </button>
            <button
              onClick={() => handleGlobalPreset('all')}
              className="h-9 px-3.5 bg-blue-650 hover:bg-blue-600 text-white text-[10px] uppercase font-black tracking-tight rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Đồng loạt kích hoạt tất cả các quyền"
            >
              <CheckSquare size={11} />
              CẤP TOÀN BỘ
            </button>
            <button
              onClick={() => handleGlobalPreset('clear')}
              className="h-9 px-3.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-900/60 text-[10px] uppercase font-black tracking-tight rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title="Gỡ bỏ không cấp bất kỳ một quyền hạn nào"
            >
              <X size={11} />
              GỠ HẾT QUYỀN
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchPermissionQuery}
                onChange={(e) => setSearchPermissionQuery(e.target.value)}
                placeholder="Tìm tên quyền hạn..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans font-medium bg-slate-50/50"
              />
              <Search size={13} className="absolute left-3 top-3 text-slate-400" />
              {searchPermissionQuery && (
                <button 
                  onClick={() => setSearchPermissionQuery('')} 
                  className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>

            <div className="relative flex-1 sm:w-64">
              <input
                type="text"
                value={searchStaffQuery}
                onChange={(e) => setSearchStaffQuery(e.target.value)}
                placeholder="Lọc nhân sự theo cột..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-sans font-medium bg-slate-50/50"
              />
              <Users size={13} className="absolute left-3 top-3 text-slate-400" />
              {searchStaffQuery && (
                <button 
                  onClick={() => setSearchStaffQuery('')} 
                  className="absolute right-3 top-2.5 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-sans leading-none flex items-center gap-1.5 shrink-0">
            <Info size={14} className="text-blue-500 rotate-180" />
            <span>Mẹo: Click trực tiếp vào ô Checkbox trên lưới tác nghiệp để thay đổi cục bộ</span>
          </div>
        </div>

        {/* MAIN MASTER MATRIX TABULAR VIEW */}
        <div className="bg-white rounded-2xl shadow-xl border-2 border-slate-300 overflow-hidden flex flex-col">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left border-collapse table-fixed border border-slate-300" style={{ minWidth: `${540 + (filteredUsers.length * 130)}px` }}>
              <thead>
                <tr className="bg-slate-900 border-b-2 border-slate-700 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="p-4 pl-6 text-center shrink-0 w-[50px] border border-slate-750">STT</th>
                  <th className="p-4 text-left w-[360px] whitespace-normal border border-slate-750">PHÂN KHU & CHỨC NĂNG HỆ THỐNG</th>
                  <th className="p-2.5 text-center w-[65px] whitespace-normal leading-tight text-slate-400 font-bold border border-slate-750">MẶC ĐỊNH NV</th>
                  <th className="p-2.5 text-center w-[65px] whitespace-normal leading-tight text-slate-400 font-bold border border-slate-750">MẶC ĐỊNH QL</th>
                  
                  {filteredUsers.map((u) => {
                    const isSelected = selectedPermissionUserId === u.id || selectedPermissionUserId === u.uniqueKey;
                    const isUserAdmin = u.role === 'Admin';
                    return (
                      <th 
                        key={u.uniqueKey} 
                        className={`p-3 text-center border border-slate-750 relative ${
                          isSelected ? 'bg-blue-950/80' : ''
                        }`}
                        style={{ width: '130px' }}
                      >
                        {isSelected && (
                          <div className="absolute top-0 right-0 left-0 bg-blue-600 text-white text-[8px] font-black uppercase text-center py-0.5 tracking-wider animate-pulse rounded-t">
                            <span translate="no" className="notranslate">ĐANG ĐỀ XUẤT</span>
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-1.5 pt-2.5 pb-2">
                          <div className="relative">
                            <img 
                              src={u.avatarUrl || u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.name}`} 
                              alt={u.name} 
                              className={`w-10 h-10 rounded-full border-2 object-cover ${
                                isSelected ? 'border-blue-400 shadow-lg shadow-blue-500/20 animate-pulse' : 'border-slate-700'
                              }`} 
                              referrerPolicy="no-referrer"
                            />
                            {presence.some(p => p.userId === u.id) && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                            )}
                          </div>
                          <div className="text-center w-full min-w-0">
                            <span translate="no" className="notranslate block text-[10px] font-black truncate leading-normal" title={u.name}>
                              {u.name}
                            </span>
                            <span className={`inline-block mt-0.5 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-tight ${
                              isUserAdmin 
                                ? 'bg-red-900/60 text-red-100 border border-red-800/50' 
                                : u.role === 'Leader'
                                  ? 'bg-amber-900/60 text-amber-100 border border-amber-800/50'
                                  : 'bg-emerald-900/60 text-emerald-100 border border-emerald-800/50'
                            }`}>
                              <span translate="no" className="notranslate">
                                {isUserAdmin ? 'ADMIN' : u.role === 'Leader' ? 'QUẢN LÝ' : 'NHÂN VIÊN'}
                              </span>
                            </span>
                          </div>

                          {/* USER COLUMN PRESET SHORTCUT LINKS */}
                          {!isUserAdmin ? (
                            <div className="flex items-center gap-1 mt-2.5 pt-2 border-t border-slate-850 w-full px-1 justify-center">
                              <button
                                onClick={() => handleUserPreset(u.uniqueKey, 'default')}
                                className="flex-1 min-w-0 h-[30px] flex flex-col items-center justify-center text-[7.5px] font-black uppercase rounded bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer border border-amber-500 shadow-sm transition-all leading-none"
                                title="Khôi phục phân quyền mặc định của người này"
                              >
                                <span translate="no" className="notranslate block text-center leading-[1.1]">MẶC<br />ĐỊNH</span>
                              </button>
                              <button
                                onClick={() => handleUserPreset(u.uniqueKey, 'all')}
                                className="flex-1 min-w-0 h-[30px] flex flex-col items-center justify-center text-[7.5px] font-black uppercase rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 cursor-pointer shadow-sm transition-all mx-0.5 border border-emerald-500 leading-none"
                                title="Cấp toàn bộ quyền hạn"
                              >
                                <span translate="no" className="notranslate block text-center leading-[1.1]">TOÀN<br />QUYỀN</span>
                              </button>
                              <button
                                onClick={() => handleUserPreset(u.uniqueKey, 'clear')}
                                className="flex-1 min-w-0 h-[30px] flex flex-col items-center justify-center text-[7.5px] font-black uppercase rounded bg-rose-450 hover:bg-rose-350 text-white cursor-pointer shadow-sm transition-all border border-rose-550 leading-none"
                                title="Gỡ bỏ hoàn toàn quyền"
                              >
                                <span translate="no" className="notranslate block text-center leading-[1.1]">GỠ<br />BỎ</span>
                              </button>
                            </div>
                          ) : (
                            <div className="text-[8px] font-black text-rose-400 mt-2.5 pt-1.5 border-t border-slate-850 w-full text-center uppercase tracking-wider">
                              <span translate="no" className="notranslate">ADMIN TOÀN QUYỀN</span>
                            </div>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredGroups.map((group) => {
                  let groupCounter = 0;
                  return (
                    <React.Fragment key={group.id}>
                      
                      {/* GROUP ROW CATEGORY TITLE SPAN */}
                      <tr className={`${group.bgColor} font-black`}>
                        <td className="p-3 text-center border-y border-r border-slate-300">
                          <span className={`p-1 bg-white rounded shadow-sm border ${group.borderColor} ${group.textColor} inline-block`}>
                            {group.icon}
                          </span>
                        </td>
                        <td className={`p-3 uppercase text-xs tracking-wider font-extrabold ${group.textColor} border-y border-slate-300`} colSpan={3 + filteredUsers.length}>
                          <span translate="no" className="notranslate">{group.label} ({group.items.length} đầu mục quyền hạn)</span>
                        </td>
                      </tr>

                      {/* GROUP ITEMS ROWS */}
                      {group.items.map((item, index) => {
                        groupCounter++;
                        return (
                          <tr key={item.key} className="hover:bg-slate-50/70 transition-colors">
                            
                            {/* INDEX / STT */}
                            <td className="p-4 text-center font-bold text-slate-500 text-xs w-[50px] border border-slate-300 bg-slate-50/30">
                              <span translate="no" className="notranslate">{groupCounter}</span>
                            </td>

                            {/* PERMISSION PATH NAME AND DESCRIPTION */}
                            <td className="p-4 w-[360px] whitespace-normal leading-relaxed border border-slate-300">
                              <div className="flex flex-col gap-0.5">
                                <span translate="no" className="notranslate text-xs font-bold text-slate-800 tracking-tight">
                                  {item.label}
                                </span>
                                <span translate="no" className="notranslate text-[10px] text-slate-550 font-medium">
                                  {item.description}
                                </span>
                              </div>
                            </td>

                            {/* STANDARD DEFAULT STAFF */}
                            <td className="p-2 text-center w-[65px] border border-slate-300 bg-slate-50/30">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none ${
                                item.defaultStaff 
                                  ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                  : 'bg-slate-100 text-slate-450 border border-slate-200'
                              }`}>
                                <span translate="no" className="notranslate">{item.defaultStaff ? 'CÓ' : 'KHÔNG'}</span>
                              </span>
                            </td>

                            {/* STANDARD DEFAULT ADMIN/LEADER */}
                            <td className="p-2 text-center w-[65px] border border-slate-300 bg-slate-50/30">
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none ${
                                item.defaultAdmin 
                                  ? 'bg-purple-100 text-purple-700 border border-purple-200' 
                                  : 'bg-slate-100 text-slate-450 border border-slate-200'
                              }`}>
                                <span translate="no" className="notranslate">{item.defaultAdmin ? 'CÓ' : 'KHÔNG'}</span>
                              </span>
                            </td>

                            {/* USER COLUMN CELLS CHECKBOX MATRIX */}
                            {filteredUsers.map((u) => {
                              const isUserAdmin = u.role === 'Admin';
                              const userDraftPerms = matrixDraft[u.uniqueKey];
                              const isChecked = userDraftPerms ? !!userDraftPerms[item.key] : false;
                              const isSelectedCol = selectedPermissionUserId === u.id || selectedPermissionUserId === u.uniqueKey;

                              return (
                                <td 
                                  key={u.uniqueKey} 
                                  className={`p-2 border border-slate-300 text-center relative ${
                                    isSelectedCol ? 'bg-blue-50/20' : ''
                                  }`}
                                  style={{ width: '130px' }}
                                >
                                  {isUserAdmin ? (
                                    <div className="flex justify-center" title="Tài khoản Admin tự động sở hữu toàn quyền">
                                      <span className="w-8 h-8 rounded-full bg-amber-50 border border-amber-250 flex items-center justify-center text-amber-500 shadow-sm">
                                        <Lock size={12} strokeWidth={2.5} />
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex justify-center">
                                      <button
                                        onClick={() => handleToggleCell(u.uniqueKey, item.key)}
                                        className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 transform active:scale-95 cursor-pointer border ${
                                          isChecked 
                                            ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-600 shadow-sm scale-102 hover:scale-105' 
                                            : 'bg-slate-50 hover:bg-slate-100 border-slate-305 text-slate-400 hover:text-slate-600 shadow-none'
                                        }`}
                                      >
                                        {isChecked ? (
                                          <Check size={18} strokeWidth={3} className="animate-fade-in" />
                                        ) : (
                                          <X size={15} strokeWidth={2} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SAVE ROW BOTTOM ACTION CONTROL BAR */}
          <div className="p-5 bg-slate-900 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-start gap-2.5 text-xs text-slate-405 leading-relaxed">
              <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-extrabold text-slate-300 uppercase tracking-tight text-[10px]">THÔNG TIN KIỂM DUYỆT BÁN LẬP TÀI KHOẢN</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Nhấn "Cập nhật hệ thống phân quyền" để lưu vĩnh viễn các thay đổi trên mạng Firestore. Chỉ các cột có người dùng thay đổi thực tế mới thực hiện truyền tải ghi nhận lên đám mây nhằm bảo vệ chất lượng đường truyền tối ưu.</p>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto shrink-0 justify-end">
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="text-[10.5px] font-black text-emerald-400 uppercase flex items-center gap-1 shrink-0"
                  >
                    <CheckCircle size={14} className="text-emerald-400" />
                    ĐỒNG BỘ ĐÁM MÂY THÀNH CÔNG!
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                onClick={handleSaveMatrix}
                disabled={isSaving}
                className={`w-full md:w-auto px-8 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isSaving 
                    ? 'bg-slate-700 cursor-not-allowed' 
                    : saveSuccess 
                      ? 'bg-emerald-600 hover:bg-emerald-700 hover:scale-102 shadow-emerald-950/40 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 hover:scale-102 shadow-blue-950/40 transform active:scale-98'
                }`}
              >
                {isSaving ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Save size={13} />
                )}
                {isSaving ? 'ĐANG ĐỒNG BỘ...' : 'CẬP NHẬT HỆ THỐNG PHÂN QUYỀN'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
