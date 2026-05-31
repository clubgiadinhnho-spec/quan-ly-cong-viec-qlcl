import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Clock, CheckCircle2, MapPin, Sparkles, Gift, Send, FileText, CheckCircle, Check, Plus, ClipboardList, Trash2, ShieldAlert, Printer, RotateCcw, AlertTriangle, FileSpreadsheet, Sliders, ChevronDown, ChevronLeft, ChevronRight, Info, Save } from 'lucide-react';
import { User } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';

// Global holder for historical defaults
let defaultHistoricalEdits: { [key: string]: string } = {};

// Helper to get day details including holiday name and day of week
const getDayDetails = (dayNum: number, month: number, year: number) => {
  const date = new Date(year, month - 1, dayNum);
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
  
  const holidays: { [key: string]: string } = {
    '2026-01-01': 'Tết Dương Lịch',
    '2026-02-14': 'Tết Nguyên Đán',
    '2026-02-15': 'Tết Nguyên Đán',
    '2026-02-16': 'Tết Nguyên Đán',
    '2026-02-17': 'Tết Nguyên Đán',
    '2026-02-18': 'Tết Nguyên Đán',
    '2026-02-19': 'Tết Nguyên Đán',
    '2026-02-20': 'Tết Nguyên Đán',
    '2026-02-21': 'Tết Nguyên Đán',
    '2026-02-22': 'Tết Nguyên Đán',
    '2026-02-23': 'Tết Nguyên Đán',
    '2026-04-26': 'Giỗ tổ Hùng Vương',
    '2026-04-27': 'Nghỉ bù Giỗ tổ',
    '2026-04-30': 'Giải phóng Miền Nam',
    '2026-05-01': 'Quốc tế Lao động',
    '2026-08-29': 'Nghỉ lễ Quốc Khánh',
    '2026-08-30': 'Nghỉ lễ Quốc Khánh',
    '2026-08-31': 'Nghỉ lễ Quốc Khánh',
    '2026-09-01': 'Quốc Khánh 2/9',
    '2026-09-02': 'Quốc Khánh 2/9',
  };
  
  return {
    dayOfWeek, // 0 = CN, 1 = T2, ..., 6 = T7
    isHoliday: !!holidays[dateStr],
    holidayName: holidays[dateStr] || '',
    dateStr
  };
};

const getVietnameseDayLabel = (dayOfWeek: number) => {
  if (dayOfWeek === 0) return 'CN';
  return `T${dayOfWeek + 1}`;
};

const formatDateVN = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const parts = dateStr.trim().split('-');
  if (parts.length === 3) {
    const y = parts[0].slice(-2);
    const m = parts[1];
    const d = parts[2];
    return `${d}/${m}/${y}`;
  }
  return dateStr;
};

const getWeekRange = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = date.getDay();
  // Monday calculation
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  const formatDateForQuery = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dayVal = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayVal}`;
  };

  const monStr = formatDateForQuery(monday);
  const sunStr = formatDateForQuery(sunday);

  return {
    mondayStr: monStr,
    sundayStr: sunStr,
    label: `Tuần từ ${formatDateVN(monStr)} đến ${formatDateVN(sunStr)}`
  };
};

interface OfficeUtilitiesTabProps {
  activeTab: 'office_calendar' | 'attendance' | 'leave_request' | 'birthday';
  effectiveUser: User;
  allUsers: User[];
  presence: any[];
  setConfirmModal: (modal: any) => void;
  setActiveTab?: (tab: 'office_calendar' | 'attendance' | 'leave_request' | 'birthday') => void;
}

export const OfficeUtilitiesTab: React.FC<OfficeUtilitiesTabProps> = ({
  activeTab,
  effectiveUser,
  allUsers,
  presence,
  setConfirmModal,
  setActiveTab,
}) => {
  // ---- LỊCH CÔNG TÁC STATES ----
  const [calendarEvents, setCalendarEvents] = useState<{ id: number; title: string; date: string; time: string; location: string; host: string; status: string; type: string; reason: string }[]>(() => {
    const saved = localStorage.getItem('office_calendar_events');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [
      { id: 1, title: 'Họp giao ban Quản Lý Chất Lượng tuần 22', date: '2026-05-25', time: '08:30 - 10:30', location: 'Phòng họp Lớn - VP Tân Phú', host: 'Lê Nhật Trường', status: 'Đang diễn ra', type: 'meeting', reason: 'Thảo luận kế hoạch vận hành và chỉ số KPI phòng QLCL' },
      { id: 2, title: 'Kiểm toán HACCP xưởng bao bì bạt nhựa', date: '2026-05-26', time: '09:00 - 16:00', location: 'Nhà máy số 2 - Khu B', host: 'Nguyễn Văn A', status: 'Xác nhận', type: 'audit', reason: 'Kiểm tra quy trình sản xuất và hồ sơ vệ sinh của xưởng bao bì bạt nhựa' },
      { id: 3, title: 'Đánh giá chỉ số chất lượng mẫu đầu vào lô TP-88', date: '2026-05-27', time: '14:00 - 16:30', location: 'Phòng Lab vi sinh', host: 'Trần Thị B', status: 'Xác nhận', type: 'evaluate', reason: 'Đánh giá chất lượng nguyên liệu thô nhập từ đối tác' },
      { id: 4, title: 'Tổng kết tháng & chuẩn bị hồ sơ ISO 9001:2015', date: '2026-05-29', time: '08:30 - 11:30', location: 'Văn phòng QLCL', host: 'Trương Nhật Trường', status: 'Lên kế hoạch', type: 'document', reason: 'Chuẩn bị hồ sơ đánh giá và tái chứng nhận ISO 9001:2015' },
    ];
  });
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventReason, setNewEventReason] = useState('');
  const [newEventDate, setNewEventDate] = useState('2026-05-25');
  const [newEventTime, setNewEventTime] = useState('08:30 - 11:30');
  const [newEventLocation, setNewEventLocation] = useState('Văn phòng QLCL');
  const [newEventHost, setNewEventHost] = useState(effectiveUser.name);
  const [newEventType, setNewEventType] = useState('meeting');
  const [showAddEvent, setShowAddEvent] = useState(false);
  
  // Desk Calendar States
  const [deskCalMonth, setDeskCalMonth] = useState(() => new Date().getMonth() + 1);
  const [deskCalYear, setDeskCalYear] = useState(() => new Date().getFullYear());
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

  // ---- XIN NGHỈ PHÉP STATES ----
  const [leaveRequests, setLeaveRequests] = useState<{ id: number; name: string; type: string; days: number; reason: string; startDate: string; endDate: string; status: string }[]>(() => {
    // Generate precise model-driven approved leave applications matching actual timesheet entries from January 2026 to May 2026
    const defaultRequests = [
      // Lê Nhật Trường (ID: 1)
      { id: 1001, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-01-02', endDate: '2026-01-02', status: 'Đã duyệt' },
      { id: 1002, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-02-13', endDate: '2026-02-13', status: 'Đã duyệt' },
      { id: 1003, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-03-04', endDate: '2026-03-04', status: 'Đã duyệt' },
      { id: 1004, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-03-11', endDate: '2026-03-11', status: 'Đã duyệt' },
      { id: 1005, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-03-25', endDate: '2026-03-25', status: 'Đã duyệt' },
      { id: 1006, name: 'Lê Nhật Trường', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-05-07', endDate: '2026-05-07', status: 'Đã duyệt' },

      // Nguyễn Kiều Phan Tú (ID: 2)
      { id: 2001, name: 'Nguyễn Kiều Phan Tú', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-01-02', endDate: '2026-01-02', status: 'Đã duyệt' },
      { id: 2002, name: 'Nguyễn Kiều Phan Tú', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-02-11', endDate: '2026-02-11', status: 'Đã duyệt' },
      { id: 2003, name: 'Nguyễn Kiều Phan Tú', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-02-13', endDate: '2026-02-13', status: 'Đã duyệt' },
      { id: 2004, name: 'Nguyễn Kiều Phan Tú', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-04-17', endDate: '2026-04-17', status: 'Đã duyệt' },
      { id: 2005, name: 'Nguyễn Kiều Phan Tú', type: 'Nghỉ ốm', days: 3.0, reason: 'Con ốm T2, T3, T4', startDate: '2026-05-04', endDate: '2026-05-06', status: 'Đã duyệt' },

      // Võ Thị Mỹ Tân (ID: 3)
      { id: 3001, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-01-02', endDate: '2026-01-02', status: 'Đã duyệt' },
      { id: 3002, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-01-14', endDate: '2026-01-14', status: 'Đã duyệt' },
      { id: 3003, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-01-22', endDate: '2026-01-22', status: 'Đã duyệt' },
      { id: 3004, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-01-30', endDate: '2026-01-30', status: 'Đã duyệt' },
      { id: 3005, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-02-11', endDate: '2026-02-11', status: 'Đã duyệt' },
      { id: 3006, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 5.0, reason: 'Nghỉ phép năm', startDate: '2026-02-23', endDate: '2026-02-27', status: 'Đã duyệt' },
      { id: 3007, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-05-13', endDate: '2026-05-13', status: 'Đã duyệt' },
      { id: 3008, name: 'Võ Thị Mỹ Tân', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-05-29', endDate: '2026-05-29', status: 'Đã duyệt' },

      // Bành Nhựt Hùng (ID: 4)
      { id: 4001, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-01-21', endDate: '2026-01-21', status: 'Đã duyệt' },
      { id: 4002, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-02-12', endDate: '2026-02-12', status: 'Đã duyệt' },
      { id: 4003, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-02-13', endDate: '2026-02-13', status: 'Đã duyệt' },
      { id: 4004, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-04-16', endDate: '2026-04-16', status: 'Đã duyệt' },
      { id: 4005, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-04-24', endDate: '2026-04-24', status: 'Đã duyệt' },
      { id: 4006, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 0.5, reason: 'Nghỉ phép năm', startDate: '2026-05-21', endDate: '2026-05-21', status: 'Đã duyệt' },
      { id: 4007, name: 'Bành Nhựt Hùng', type: 'Nghỉ phép năm', days: 1.0, reason: 'Nghỉ phép năm', startDate: '2026-05-28', endDate: '2026-05-28', status: 'Đã duyệt' },
      { id: 4008, name: 'Bành Nhựt Hùng', type: 'Nghỉ thai sản / Đặc biệt', days: 3.0, reason: 'Nghỉ việc riêng đặc biệt cưới hỏi', startDate: '2026-03-18', endDate: '2026-03-20', status: 'Đã duyệt' }
    ];

    const saved = localStorage.getItem('office_leave_requests');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Retain user's custom added requests outside standard timesheet months Jan-May 2026, and filter out any stale incorrect entries
        const filtered = parsed.filter((req: any) => {
          if (req.id === 4008 || req.id === 3009) {
            return false;
          }
          const start = new Date(req.startDate);
          const limitStart = new Date('2026-01-01');
          const limitEnd = new Date('2026-05-31');
          if (start >= limitStart && start <= limitEnd) {
            return false;
          }
          return true;
        });
        return [...defaultRequests, ...filtered];
      } catch (e) {
        console.error(e);
      }
    }
    return defaultRequests;
  });
  const [leaveType, setLeaveType] = useState('Nghỉ phép năm');
  const [leaveDays, setLeaveDays] = useState(1);
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveStart, setLeaveStart] = useState('2026-05-26');
  const [leaveEnd, setLeaveEnd] = useState('2026-05-26');
  const [summaryMonth, setSummaryMonth] = useState(5);
  const [summaryYear, setSummaryYear] = useState(2026);

  const [leaveAllowances, setLeaveAllowances] = useState<{ [empId: string]: { standard: number; seniority: number; prevYearCarry: number } }>(() => {
    const saved = localStorage.getItem('office_leave_allowances');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {
      '1': { standard: 12, seniority: 2, prevYearCarry: 1.5 },
      '2': { standard: 12, seniority: 3, prevYearCarry: 2.0 },
      '3': { standard: 12, seniority: 2, prevYearCarry: 0.5 },
      '4': { standard: 12, seniority: 0, prevYearCarry: 2.0 },
    };
  });

  // ---- CHẤM CÔNG STATES ----
  const [currentTime, setCurrentTime] = useState(new Date());
  const [attendanceRecords, setAttendanceRecords] = useState<{ id: number; name: string; time: string; status: string; type: string; location: string; mode: string; direction: string; date?: string }[]>(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const saved = localStorage.getItem('office_attendance_records');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Keep only today's records
          return parsed.filter(r => r.date === todayStr);
        }
      } catch (e) {
        console.error(e);
      }
    }
    // Only fallback to mock data if today is actually 2026-05-28. Otherwise, start with an empty list for a new day.
    if (todayStr === '2026-05-28') {
      return [
        { id: 1, name: 'Lê Nhật Trường', time: '07:45:22', status: 'Đúng giờ', type: 'Vân tay', location: 'VP Tân Phú (Vùng An Toàn IP)', mode: 'Offline', direction: 'VÀO', date: '2026-05-28' },
        { id: 2, name: 'Nguyễn Kiều Phan Tú', time: '07:55:10', status: 'Đúng giờ', type: 'Điện thoại QR', location: 'Xưởng 1 (Vùng An Toàn GPS)', mode: 'Online', direction: 'VÀO', date: '2026-05-28' },
        { id: 3, name: 'Nguyễn Kiều Phan Tú', time: '17:30:15', status: 'Đúng giờ', type: 'Điện thoại QR', location: 'Xưởng 1 (Vùng An Toàn GPS)', mode: 'Online', direction: 'RA', date: '2026-05-28' },
        { id: 4, name: 'Võ Thị Mỹ Tân', time: '07:58:15', status: 'Đúng giờ', type: 'Vân tay', location: 'VP Tân Phú (Vùng An Toàn IP)', mode: 'Offline', direction: 'VÀO', date: '2026-05-28' },
        { id: 5, name: 'Bành Nhựt Hùng', time: '08:12:05', status: 'Đi muộn', type: 'Khuôn mặt FaceID', location: 'Khu kiểm nghiệm (Vùng An Toàn GPS)', mode: 'Công tác', direction: 'VÀO', date: '2026-05-28' },
        { id: 6, name: 'Bành Nhựt Hùng', time: '17:05:00', status: 'Đúng giờ', type: 'Khuôn mặt FaceID', location: 'Khu kiểm nghiệm (Vùng An Toàn GPS)', mode: 'Công tác', direction: 'RA', date: '2026-05-28' },
      ];
    }
    return [];
  });
  const [checkInLog, setCheckInLog] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [checkInMode, setCheckInMode] = useState<'Offline' | 'Online' | 'Công tác'>('Online');
  const [attendanceSubTab, setAttendanceSubTab] = useState<'daily' | 'monthly'>('daily');

  // Automated daily reset detector inside OfficeUtilitiesTab
  useEffect(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    const lastSavedDate = localStorage.getItem('office_attendance_date');
    if (lastSavedDate !== todayStr) {
      setAttendanceRecords([]);
      localStorage.setItem('office_attendance_records', JSON.stringify([]));
      localStorage.setItem('office_attendance_date', todayStr);
      setCheckInLog(null);
      console.log(`[ATTENDANCE RESET] Khởi tạo ngày mới: ${todayStr}, reset danh sách điểm danh hàng ngày thành công.`);
    }
  }, []);

  const userCheckedIn = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return attendanceRecords.some(r => r.name.toLowerCase() === effectiveUser.name.toLowerCase() && r.direction === 'VÀO' && (!r.date || r.date === todayStr));
  }, [attendanceRecords, effectiveUser.name]);

  const userCheckedOut = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('en-CA');
    return attendanceRecords.some(r => r.name.toLowerCase() === effectiveUser.name.toLowerCase() && r.direction === 'RA' && (!r.date || r.date === todayStr));
  }, [attendanceRecords, effectiveUser.name]);

  const groupedRecords = useMemo(() => {
    const list: any[] = [];
    attendanceRecords.forEach(rec => {
      let rOld = list.find(x => x.name.toLowerCase() === rec.name.toLowerCase());
      if (!rOld) {
        rOld = {
          name: rec.name,
          vao: null,
          ra: null
        };
        list.push(rOld);
      }
      if (rec.direction === 'VÀO') {
        rOld.vao = rec;
      } else if (rec.direction === 'RA') {
        rOld.ra = rec;
      } else {
        if (!rOld.vao) {
          rOld.vao = rec;
        } else if (!rOld.ra) {
          rOld.ra = rec;
        }
      }
    });
    return list;
  }, [attendanceRecords]);

  // ---- EDITING MODALS STATES (ADMIN RIGHTS) ----
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editingLeave, setEditingLeave] = useState<any | null>(null);
  const [editingAttendanceRecord, setEditingAttendanceRecord] = useState<any | null>(null);
  const [editingWish, setEditingWish] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'attendance' | 'event' | 'leave' | 'wish'; id: any; title: string; subtitle?: string } | null>(null);

  // Group leave requests by Year-Month of req.startDate
  const groupedLeaveRequests = useMemo(() => {
    const groups: { [key: string]: typeof leaveRequests } = {};
    leaveRequests.forEach(req => {
      let monthKey = 'Khác';
      if (req.startDate) {
        const parts = req.startDate.split('-');
        if (parts.length >= 2) {
          monthKey = `Tháng ${parts[1]}/${parts[0]}`;
        }
      }
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(req);
    });
    return groups;
  }, [leaveRequests]);

  const sortedMonthKeys = useMemo(() => {
    const keys = Object.keys(groupedLeaveRequests);
    return keys.sort((a, b) => {
      if (a === 'Khác') return 1;
      if (b === 'Khác') return -1;
      const regex = /Tháng (\d+)\/(\d+)/;
      const matchA = a.match(regex);
      const matchB = b.match(regex);
      if (matchA && matchB) {
        const mA = parseInt(matchA[1], 10);
        const yA = parseInt(matchA[2], 10);
        const mB = parseInt(matchB[1], 10);
        const yB = parseInt(matchB[2], 10);
        
        if (yB !== yA) {
          return yB - yA; // Descending by year
        }
        return mB - mA; // Descending by month
      }
      return a.localeCompare(b);
    });
  }, [groupedLeaveRequests]);

  // ---- SMART MONTHLY TIMESHEET METRICS STATES ----
  const [selectedMonth, setSelectedMonth] = useState(5); // May by default
  const [selectedYear, setSelectedYear] = useState(2026);
  
  const [hasSaturdayWorkMap, setHasSaturdayWorkMap] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('office_has_saturday_work_map');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const oldSaved = localStorage.getItem('office_has_saturday_work');
    const defaultVal = oldSaved !== null ? oldSaved === 'true' : false;
    return {
      '1-2026': false,
      '2-2026': false,
      '3-2026': false,
      '4-2026': false,
      '5-2026': false,
      '5-2026-default': defaultVal
    };
  });

  const [standardDaysMap, setStandardDaysMap] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('office_standard_days_map');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    const oldSaved = localStorage.getItem('office_standard_days');
    const defaultVal = oldSaved !== null ? Number(oldSaved) : 26;
    return {
      '1-2026': 26,
      '2-2026': 24,
      '3-2026': 26,
      '4-2026': 26,
      '5-2026': 26,
      '5-2026-default': defaultVal
    };
  });

  const currentMonthYearKey = `${selectedMonth}-${selectedYear}`;

  const hasSaturdayWork = hasSaturdayWorkMap[currentMonthYearKey] !== undefined 
    ? hasSaturdayWorkMap[currentMonthYearKey] 
    : false;

  const standardDays = standardDaysMap[currentMonthYearKey] !== undefined
    ? standardDaysMap[currentMonthYearKey]
    : 26;

  const setHasSaturdayWork = (val: boolean) => {
    const newMap = { ...hasSaturdayWorkMap, [currentMonthYearKey]: val };
    setHasSaturdayWorkMap(newMap);
    localStorage.setItem('office_has_saturday_work_map', JSON.stringify(newMap));
    localStorage.setItem('office_has_saturday_work', String(val));
  };

  const setStandardDays = (val: number) => {
    const newMap = { ...standardDaysMap, [currentMonthYearKey]: val };
    setStandardDaysMap(newMap);
    localStorage.setItem('office_standard_days_map', JSON.stringify(newMap));
    localStorage.setItem('office_standard_days', String(val));
  };

  const [editingCell, setEditingCell] = useState<{ empId: string; day: number; coords?: { top: number; left: number; width: number; height: number } } | null>(null);
  const [manualEdits, setManualEdits] = useState<{ [key: string]: string }>(() => {
    // Precise historical timesheet mapping for P.QLCL from Jan 2026 to May 2026 matching the 5 PDFs
    defaultHistoricalEdits = {
      // MONTH 1 (JANUARY 2026)
      // Lê Nhật Trường (ID: 1)
      '1-2026-1-1': 'L',
      '1-2026-1-2': 'P',
      '1-2026-1-3': 'OFF',
      '1-2026-1-4': 'OFF',
      '1-2026-1-5': '8', '1-2026-1-6': '8', '1-2026-1-7': '8', '1-2026-1-8': '8', '1-2026-1-9': '8',
      '1-2026-1-10': 'OFF', '1-2026-1-11': 'OFF',
      '1-2026-1-12': '8', '1-2026-1-13': '8', '1-2026-1-14': '8', '1-2026-1-15': '8', '1-2026-1-16': '8',
      '1-2026-1-17': 'OFF', '1-2026-1-18': 'OFF',
      '1-2026-1-19': '8', '1-2026-1-20': '8', '1-2026-1-21': '8', '1-2026-1-22': '8', '1-2026-1-23': '8',
      '1-2026-1-24': 'OFF', '1-2026-1-25': 'OFF',
      '1-2026-1-26': '8', '1-2026-1-27': '8', '1-2026-1-28': '8', '1-2026-1-29': '8', '1-2026-1-30': '8',
      '1-2026-1-31': 'OFF',

      // Nguyễn Kiều Phan Tú (ID: 2)
      '2-2026-1-1': 'L',
      '2-2026-1-2': '1/2P',
      '2-2026-1-3': 'OFF', '2-2026-1-4': 'OFF',
      '2-2026-1-5': '8', '2-2026-1-6': '8', '2-2026-1-7': '8', '2-2026-1-8': '8', '2-2026-1-9': '8',
      '2-2026-1-10': 'OFF', '2-2026-1-11': 'OFF',
      '2-2026-1-12': '8', '2-2026-1-13': '8', '2-2026-1-14': '8', '2-2026-1-15': '8', '2-2026-1-16': '8',
      '2-2026-1-17': 'OFF', '2-2026-1-18': 'OFF',
      '2-2026-1-19': '8', '2-2026-1-20': '8', '2-2026-1-21': '8', '2-2026-1-22': '8', '2-2026-1-23': '8',
      '2-2026-1-24': 'OFF', '2-2026-1-25': 'OFF',
      '2-2026-1-26': '8', '2-2026-1-27': '8', '2-2026-1-28': '8', '2-2026-1-29': '8', '2-2026-1-30': '8',
      '2-2026-1-31': 'OFF',

      // Võ Thị Mỹ Tân (ID: 3)
      '3-2026-1-1': 'L',
      '3-2026-1-2': 'P',
      '3-2026-1-3': 'OFF', '3-2026-1-4': 'OFF',
      '3-2026-1-5': '8', '3-2026-1-6': '8', '3-2026-1-7': '8', '3-2026-1-8': '8', '3-2026-1-9': '8',
      '3-2026-1-10': 'OFF', '3-2026-1-11': 'OFF',
      '3-2026-1-12': '8', '3-2026-1-13': '8',
      '3-2026-1-14': '1/2P',
      '3-2026-1-15': '8', '3-2026-1-16': '8',
      '3-2026-1-17': 'OFF', '3-2026-1-18': 'OFF',
      '3-2026-1-19': '8', '3-2026-1-20': '8', '3-2026-1-21': '8',
      '3-2026-1-22': 'P',
      '3-2026-1-23': '8',
      '3-2026-1-24': 'OFF', '3-2026-1-25': 'OFF',
      '3-2026-1-26': '8', '3-2026-1-27': '8', '3-2026-1-28': '8', '3-2026-1-29': '8',
      '3-2026-1-30': '1/2P',
      '3-2026-1-31': 'OFF',

      // Bành Nhựt Hùng (ID: 4)
      '4-2026-1-1': 'L',
      '4-2026-1-2': '8',
      '4-2026-1-3': 'OFF', '4-2026-1-4': 'OFF',
      '4-2026-1-5': '8', '4-2026-1-6': '8', '4-2026-1-7': '8', '4-2026-1-8': '8', '4-2026-1-9': '8',
      '4-2026-1-10': 'OFF', '4-2026-1-11': 'OFF',
      '4-2026-1-12': '8', '4-2026-1-13': '8', '4-2026-1-14': '8', '4-2026-1-15': '8', '4-2026-1-16': '8',
      '4-2026-1-17': 'OFF', '4-2026-1-18': 'OFF',
      '4-2026-1-19': '8', '4-2026-1-20': '8',
      '4-2026-1-21': '1/2P',
      '4-2026-1-22': '8', '4-2026-1-23': '8',
      '4-2026-1-24': 'OFF', '4-2026-1-25': 'OFF',
      '4-2026-1-26': '8', '4-2026-1-27': '8', '4-2026-1-28': '8', '4-2026-1-29': '8', '4-2026-1-30': '8',
      '4-2026-1-31': 'OFF',

      // MONTH 2 (FEBRUARY 2026)
      // Lê Nhật Trường (ID: 1)
      '1-2026-2-1': 'OFF',
      '1-2026-2-2': '8', '1-2026-2-3': '8', '1-2026-2-4': '8', '1-2026-2-5': '8', '1-2026-2-6': '8',
      '1-2026-2-7': 'OFF', '1-2026-2-8': 'OFF',
      '1-2026-2-9': '8', '1-2026-2-10': '8', '1-2026-2-11': '8', '1-2026-2-12': '8',
      '1-2026-2-13': 'P',
      '1-2026-2-14': 'OFF', '1-2026-2-15': 'OFF',
      '1-2026-2-16': 'L', '1-2026-2-17': 'L', '1-2026-2-18': 'L', '1-2026-2-19': 'L', '1-2026-2-20': 'L',
      '1-2026-2-21': 'OFF', '1-2026-2-22': 'OFF',
      '1-2026-2-23': '8', '1-2026-2-24': '8', '1-2026-2-25': '8', '1-2026-2-26': '8', '1-2026-2-27': '8',
      '1-2026-2-28': 'OFF',

      // Nguyễn Kiều Phan Tú (ID: 2)
      '2-2026-2-1': 'OFF',
      '2-2026-2-2': '8', '2-2026-2-3': '8', '2-2026-2-4': '8', '2-2026-2-5': '8', '2-2026-2-6': '8',
      '2-2026-2-7': 'OFF', '2-2026-2-8': 'OFF',
      '2-2026-2-9': '8', '2-2026-2-10': '8',
      '2-2026-2-11': 'P',
      '2-2026-2-12': '8',
      '2-2026-2-13': 'P',
      '2-2026-2-14': 'OFF', '2-2026-2-15': 'OFF',
      '2-2026-2-16': 'L', '2-2026-2-17': 'L', '2-2026-2-18': 'L', '2-2026-2-19': 'L', '2-2026-2-20': 'L',
      '2-2026-2-21': 'OFF', '2-2026-2-22': 'OFF',
      '2-2026-2-23': '8', '2-2026-2-24': '8', '2-2026-2-25': '8', '2-2026-2-26': '8', '2-2026-2-27': '8',
      '2-2026-2-28': 'OFF',

      // Võ Thị Mỹ Tân (ID: 3)
      '3-2026-2-1': 'OFF',
      '3-2026-2-2': '8', '3-2026-2-3': '8', '3-2026-2-4': '8', '3-2026-2-5': '8', '3-2026-2-6': '8',
      '3-2026-2-7': 'OFF', '3-2026-2-8': 'OFF',
      '3-2026-2-9': '8', '3-2026-2-10': '8',
      '3-2026-2-11': '1/2P',
      '3-2026-2-12': '8', '3-2026-2-13': '8',
      '3-2026-2-14': 'OFF', '3-2026-2-15': 'OFF',
      '3-2026-2-16': 'L', '3-2026-2-17': 'L', '3-2026-2-18': 'L', '3-2026-2-19': 'L', '3-2026-2-20': 'L',
      '3-2026-2-21': 'OFF', '3-2026-2-22': 'OFF',
      '3-2026-2-23': 'P', '3-2026-2-24': 'P', '3-2026-2-25': 'P', '3-2026-2-26': 'P', '3-2026-2-27': 'P',
      '3-2026-2-28': 'OFF',

      // Bành Nhựt Hùng (ID: 4)
      '4-2026-2-1': 'OFF',
      '4-2026-2-2': '8', '4-2026-2-3': '8', '4-2026-2-4': '8', '4-2026-2-5': '8', '4-2026-2-6': '8',
      '4-2026-2-7': 'OFF', '4-2026-2-8': 'OFF',
      '4-2026-2-9': '8', '4-2026-2-10': '8', '4-2026-2-11': '8',
      '4-2026-2-12': 'P', '4-2026-2-13': 'P',
      '4-2026-2-14': 'OFF', '4-2026-2-15': 'OFF',
      '4-2026-2-16': 'L', '4-2026-2-17': 'L', '4-2026-2-18': 'L', '4-2026-2-19': 'L', '4-2026-2-20': 'L',
      '4-2026-2-21': 'OFF', '4-2026-2-22': 'OFF',
      '4-2026-2-23': '8', '4-2026-2-24': '8', '4-2026-2-25': '8', '4-2026-2-26': '8', '4-2026-2-27': '8',
      '4-2026-2-28': 'OFF',

      // MONTH 3 (MARCH 2026)
      // Lê Nhật Trường (ID: 1)
      '1-2026-3-1': 'OFF',
      '1-2026-3-2': '8', '1-2026-3-3': '8',
      '1-2026-3-4': '1/2P',
      '1-2026-3-5': '8', '1-2026-3-6': '8',
      '1-2026-3-7': 'OFF', '1-2026-3-8': 'OFF',
      '1-2026-3-9': '8', '1-2026-3-10': '8',
      '1-2026-3-11': '1/2P',
      '1-2026-3-12': '8', '1-2026-3-13': '8',
      '1-2026-3-14': 'OFF', '1-2026-3-15': 'OFF',
      '1-2026-3-16': '8', '1-2026-3-17': '8', '1-2026-3-18': '8', '1-2026-3-19': '8', '1-2026-3-20': '8',
      '1-2026-3-21': 'OFF', '1-2026-3-22': 'OFF',
      '1-2026-3-23': '8', '1-2026-3-24': '8',
      '1-2026-3-25': 'P',
      '1-2026-3-26': '8', '1-2026-3-27': '8',
      '1-2026-3-28': 'OFF', '1-2026-3-29': 'OFF',
      '1-2026-3-30': '8', '1-2026-3-31': '8',

      // Nguyễn Kiều Phan Tú (ID: 2)
      '2-2026-3-1': 'OFF',
      '2-2026-3-2': '8', '2-2026-3-3': '8', '2-2026-3-4': '8', '2-2026-3-5': '8', '2-2026-3-6': '8',
      '2-2026-3-7': 'OFF', '2-2026-3-8': 'OFF',
      '2-2026-3-9': '8', '2-2026-3-10': '8', '2-2026-3-11': '8', '2-2026-3-12': '8', '2-2026-3-13': '8',
      '2-2026-3-14': 'OFF', '2-2026-3-15': 'OFF',
      '2-2026-3-16': '8', '2-2026-3-17': '8', '2-2026-3-18': '8', '2-2026-3-19': '8', '2-2026-3-20': '8',
      '2-2026-3-21': 'OFF', '2-2026-3-22': 'OFF',
      '2-2026-3-23': '8', '2-2026-3-24': '8', '2-2026-3-25': '8', '2-2026-3-26': '8', '2-2026-3-27': '8',
      '2-2026-3-28': 'OFF', '2-2026-3-29': 'OFF',
      '2-2026-3-30': '8', '2-2026-3-31': '8',

      // Võ Thị Mỹ Tân (ID: 3)
      '3-2026-3-1': 'OFF',
      '3-2026-3-2': '8', '3-2026-3-3': '8', '3-2026-3-4': '8', '3-2026-3-5': '8', '3-2026-3-6': '8',
      '3-2026-3-7': 'OFF', '3-2026-3-8': 'OFF',
      '3-2026-3-9': '8', '3-2026-3-10': '8', '3-2026-3-11': '8', '3-2026-3-12': '8', '3-2026-3-13': '8',
      '3-2026-3-14': 'OFF', '3-2026-3-15': 'OFF',
      '3-2026-3-16': '8', '3-2026-3-17': '8', '3-2026-3-18': '8', '3-2026-3-19': '8', '3-2026-3-20': '8',
      '3-2026-3-21': 'OFF', '3-2026-3-22': 'OFF',
      '3-2026-3-23': '8', '3-2026-3-24': '8', '3-2026-3-25': '8', '3-2026-3-26': '8', '3-2026-3-27': '8',
      '3-2026-3-28': 'OFF', '3-2026-3-29': 'OFF',
      '3-2026-3-30': '8', '3-2026-3-31': '8',

      // Bành Nhựt Hùng (ID: 4)
      '4-2026-3-1': 'OFF',
      '4-2026-3-2': '8', '4-2026-3-3': '8', '4-2026-3-4': '8', '4-2026-3-5': '8', '4-2026-3-6': '8',
      '4-2026-3-7': 'OFF', '4-2026-3-8': 'OFF',
      '4-2026-3-9': '8', '4-2026-3-10': '8', '4-2026-3-11': '8', '4-2026-3-12': '8', '4-2026-3-13': '8',
      '4-2026-3-14': 'OFF', '4-2026-3-15': 'OFF',
      '4-2026-3-16': '8', '4-2026-3-17': '8', '4-2026-3-18': 'CD', '4-2026-3-19': 'CD',
      '4-2026-3-20': 'CD',
      '4-2026-3-21': 'OFF', '4-2026-3-22': 'OFF',
      '4-2026-3-23': '8', '4-2026-3-24': '8',
      '4-2026-3-25': '8', '4-2026-3-26': '8', '4-2026-3-27': '8',
      '4-2026-3-28': 'OFF', '4-2026-3-29': 'OFF',
      '4-2026-3-30': '8', '4-2026-3-31': '8',

      // MONTH 4 (APRIL 2026)
      // Lê Nhật Trường (ID: 1)
      '1-2026-4-1': '8', '1-2026-4-2': '8', '1-2026-4-3': '8',
      '1-2026-4-4': 'OFF', '1-2026-4-5': 'OFF',
      '1-2026-4-6': '8', '1-2026-4-7': '8', '1-2026-4-8': '8', '1-2026-4-9': '8', '1-2026-4-10': '8',
      '1-2026-4-11': 'OFF', '1-2026-4-12': 'OFF',
      '1-2026-4-13': '8', '1-2026-4-14': '8', '1-2026-4-15': '8', '1-2026-4-16': '8', '1-2026-4-17': '8',
      '1-2026-4-18': 'OFF', '1-2026-4-19': 'OFF',
      '1-2026-4-20': '8', '1-2026-4-21': '8', '1-2026-4-22': '8', '1-2026-4-23': '8', '1-2026-4-24': '8',
      '1-2026-4-25': 'OFF', '1-2026-4-26': 'OFF',
      '1-2026-4-27': 'L',
      '1-2026-4-28': '8', '1-2026-4-29': '8',
      '1-2026-4-30': 'L',

      // Nguyễn Kiều Phan Tú (ID: 2)
      '2-2026-4-1': '8', '2-2026-4-2': '8', '2-2026-4-3': '8',
      '2-2026-4-4': 'OFF', '2-2026-4-5': 'OFF',
      '2-2026-4-6': '8', '2-2026-4-7': '8', '2-2026-4-8': '8', '2-2026-4-9': '8', '2-2026-4-10': '8',
      '2-2026-4-11': 'OFF', '2-2026-4-12': 'OFF',
      '2-2026-4-13': '8', '2-2026-4-14': '8', '2-2026-4-15': '8', '2-2026-4-16': '8',
      '2-2026-4-17': '1/2P',
      '2-2026-4-18': 'OFF', '2-2026-4-19': 'OFF',
      '2-2026-4-20': '8', '2-2026-4-21': '8', '2-2026-4-22': '8', '2-2026-4-23': '8', '2-2026-4-24': '8',
      '2-2026-4-25': 'OFF', '2-2026-4-26': 'OFF',
      '2-2026-4-27': 'L',
      '2-2026-4-28': '8', '2-2026-4-29': '8',
      '2-2026-4-30': 'L',

      // Võ Thị Mỹ Tân (ID: 3)
      '3-2026-4-1': '8', '3-2026-4-2': '8', '3-2026-4-3': '8',
      '3-2026-4-4': 'OFF', '3-2026-4-5': 'OFF',
      '3-2026-4-6': '8', '3-2026-4-7': '8', '3-2026-4-8': '8', '3-2026-4-9': '8', '3-2026-4-10': '8',
      '3-2026-4-11': 'OFF', '3-2026-4-12': 'OFF',
      '3-2026-4-13': '8', '3-2026-4-14': '8', '3-2026-4-15': '8', '3-2026-4-16': '8', '3-2026-4-17': '8',
      '3-2026-4-18': 'OFF', '3-2026-4-19': 'OFF',
      '3-2026-4-20': '8', '3-2026-4-21': '8', '3-2026-4-22': '8', '3-2026-4-23': '8', '3-2026-4-24': '8',
      '3-2026-4-25': 'OFF', '3-2026-4-26': 'OFF',
      '3-2026-4-27': 'L',
      '3-2026-4-28': '8', '3-2026-4-29': '8',
      '3-2026-4-30': 'L',

      // Bành Nhựt Hùng (ID: 4)
      '4-2026-4-1': '8', '4-2026-4-2': '8', '4-2026-4-3': '8',
      '4-2026-4-4': 'OFF', '4-2026-4-5': 'OFF',
      '4-2026-4-6': '8', '4-2026-4-7': '8', '4-2026-4-8': '8', '4-2026-4-9': '8', '4-2026-4-10': '8',
      '4-2026-4-11': 'OFF', '4-2026-4-12': 'OFF',
      '4-2026-4-13': '8', '4-2026-4-14': '8', '4-2026-4-15': '8',
      '4-2026-4-16': 'P',
      '4-2026-4-17': '8',
      '4-2026-4-18': 'OFF', '4-2026-4-19': 'OFF',
      '4-2026-4-20': '8', '4-2026-4-21': '8', '4-2026-4-22': '8', '4-2026-4-23': '8',
      '4-2026-4-24': 'P',
      '4-2026-4-25': 'OFF', '4-2026-4-26': 'OFF',
      '4-2026-4-27': 'L',
      '4-2026-4-28': '8', '4-2026-4-29': '8',
      '4-2026-4-30': 'L',

      // MONTH 5 (MAY 2026)
      // Lê Nhật Trường (ID: 1)
      '1-2026-5-1': 'L',
      '1-2026-5-2': 'OFF',
      '1-2026-5-3': 'OFF',
      '1-2026-5-4': '8',
      '1-2026-5-5': '8',
      '1-2026-5-6': '8',
      '1-2026-5-7': '1/2P',
      '1-2026-5-8': '8',
      '1-2026-5-9': 'OFF',
      '1-2026-5-10': 'OFF',
      '1-2026-5-11': '8',
      '1-2026-5-12': '8',
      '1-2026-5-13': '8',
      '1-2026-5-14': '8',
      '1-2026-5-15': '8',
      '1-2026-5-16': 'OFF',
      '1-2026-5-17': 'OFF',
      '1-2026-5-18': '8',
      '1-2026-5-19': '8',
      '1-2026-5-20': '8',
      '1-2026-5-21': '8',
      '1-2026-5-22': '8',
      '1-2026-5-23': 'OFF',
      '1-2026-5-24': 'OFF',
      '1-2026-5-25': '8',
      '1-2026-5-26': '8',
      '1-2026-5-27': '8',
      '1-2026-5-28': '8',
      '1-2026-5-29': '8',
      '1-2026-5-30': 'OFF',
      '1-2026-5-31': 'OFF',

      // Nguyễn Kiều Phan Tú (ID: 2)
      '2-2026-5-1': 'L',
      '2-2026-5-2': 'OFF',
      '2-2026-5-3': 'OFF',
      '2-2026-5-4': 'O',
      '2-2026-5-5': 'O',
      '2-2026-5-6': 'O',
      '2-2026-5-7': '8',
      '2-2026-5-8': '8',
      '2-2026-5-9': 'OFF',
      '2-2026-5-10': 'OFF',
      '2-2026-5-11': '8',
      '2-2026-5-12': '8',
      '2-2026-5-13': '8',
      '2-2026-5-14': '8',
      '2-2026-5-15': '8',
      '2-2026-5-16': 'OFF',
      '2-2026-5-17': 'OFF',
      '2-2026-5-18': '8',
      '2-2026-5-19': '8',
      '2-2026-5-20': '8',
      '2-2026-5-21': '8',
      '2-2026-5-22': '8',
      '2-2026-5-23': 'OFF',
      '2-2026-5-24': 'OFF',
      '2-2026-5-25': '8',
      '2-2026-5-26': '8',
      '2-2026-5-27': '8',
      '2-2026-5-28': '8',
      '2-2026-5-29': '8',
      '2-2026-5-30': 'OFF',
      '2-2026-5-31': 'OFF',

      // Võ Thị Mỹ Tân (ID: 3)
      '3-2026-5-1': 'L',
      '3-2026-5-2': 'OFF',
      '3-2026-5-3': 'OFF',
      '3-2026-5-4': '8',
      '3-2026-5-5': '8',
      '3-2026-5-6': '8',
      '3-2026-5-7': '8',
      '3-2026-5-8': '8',
      '3-2026-5-9': 'OFF',
      '3-2026-5-10': 'OFF',
      '3-2026-5-11': '8',
      '3-2026-5-12': '8',
      '3-2026-5-13': 'P',
      '3-2026-5-14': '8',
      '3-2026-5-15': '8',
      '3-2026-5-16': 'OFF',
      '3-2026-5-17': 'OFF',
      '3-2026-5-18': '8',
      '3-2026-5-19': '8',
      '3-2026-5-20': '8',
      '3-2026-5-21': '8',
      '3-2026-5-22': '8',
      '3-2026-5-23': 'OFF',
      '3-2026-5-24': 'OFF',
      '3-2026-5-25': '8',
      '3-2026-5-26': '8',
      '3-2026-5-27': '8',
      '3-2026-5-28': '8',
      '3-2026-5-29': 'P',
      '3-2026-5-30': 'OFF',
      '3-2026-5-31': 'OFF',

      // Bành Nhựt Hùng (ID: 4)
      '4-2026-5-1': 'L',
      '4-2026-5-2': 'OFF',
      '4-2026-5-3': 'OFF',
      '4-2026-5-4': '8',
      '4-2026-5-5': '8',
      '4-2026-5-6': '8',
      '4-2026-5-7': '8',
      '4-2026-5-8': '8',
      '4-2026-5-9': 'OFF',
      '4-2026-5-10': 'OFF',
      '4-2026-5-11': '8',
      '4-2026-5-12': '8',
      '4-2026-5-13': '8',
      '4-2026-5-14': '8',
      '4-2026-5-15': '8',
      '4-2026-5-16': 'OFF',
      '4-2026-5-17': 'OFF',
      '4-2026-5-18': '8',
      '4-2026-5-19': '8',
      '4-2026-5-20': '8',
      '4-2026-5-21': '1/2P',
      '4-2026-5-22': '8',
      '4-2026-5-23': 'OFF',
      '4-2026-5-24': 'OFF',
      '4-2026-5-25': '8',
      '4-2026-5-26': '8',
      '4-2026-5-27': '8',
      '4-2026-5-28': 'P',
      '4-2026-5-29': '8',
      '4-2026-5-30': 'OFF',
      '4-2026-5-31': 'OFF',
    };

    const saved = localStorage.getItem('office_manual_edits');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Clean out any faulty cached keys for Year 2026 and Months 1-5 to guarantee PDF matches
        const cleaned: { [key: string]: string } = {};
        Object.keys(parsed).forEach(k => {
          const parts = k.split('-');
          if (parts.length === 4) {
            const y = parseInt(parts[1], 10);
            const m = parseInt(parts[2], 10);
            if (y === 2026 && m <= 5) {
              return;
            }
          }
          cleaned[k] = parsed[k];
        });
        return { ...defaultHistoricalEdits, ...cleaned };
      } catch (e) {
        console.error(e);
      }
    }
    return defaultHistoricalEdits;
  });

  const qlclEmployees = useMemo(() => [
    { id: '1', code: 'D12.00042', name: 'Lê Nhật Trường', role: 'Trưởng phòng', dept: 'PQLCL' },
    { id: '2', code: 'D12.00038', name: 'Nguyễn Kiều Phan Tú', role: 'Nhân viên', dept: 'PQLCL' },
    { id: '3', code: 'D12.00311', name: 'Võ Thị Mỹ Tân', role: 'Trưởng nhóm', dept: 'PQLCL' },
    { id: '4', code: 'D12.00876', name: 'Bành Nhựt Hùng', role: 'Nhân viên', dept: 'PQLCL' },
  ], []);

  const [customEmployees, setCustomEmployees] = useState<any[]>(() => {
    const saved = localStorage.getItem('office_custom_employees');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpRole, setNewEmpRole] = useState('Nhân viên');
  const [showAddEmpForm, setShowAddEmpForm] = useState(false);

  const activeQLCLEmployees = useMemo(() => {
    return [...qlclEmployees, ...customEmployees];
  }, [customEmployees, qlclEmployees]);

  useEffect(() => {
    localStorage.setItem('office_calendar_events', JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  useEffect(() => {
    localStorage.setItem('office_leave_requests', JSON.stringify(leaveRequests));
  }, [leaveRequests]);

  useEffect(() => {
    localStorage.setItem('office_attendance_records', JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem('office_manual_edits', JSON.stringify(manualEdits));
  }, [manualEdits]);

  useEffect(() => {
    localStorage.setItem('office_custom_employees', JSON.stringify(customEmployees));
  }, [customEmployees]);

  const [timesheetAcknowledgements, setTimesheetAcknowledgements] = useState<Record<string, { confirmed: boolean; confirmedAt: string }>>(() => {
    const saved = localStorage.getItem('office_timesheet_acknowledgements');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return {};
  });

  useEffect(() => {
    localStorage.setItem('office_timesheet_acknowledgements', JSON.stringify(timesheetAcknowledgements));
  }, [timesheetAcknowledgements]);

  useEffect(() => {
    if (!editingCell) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingCell(null);
      }
    };

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const popover = document.getElementById('attendance-popover');
      if (popover && !popover.contains(e.target as Node)) {
        setEditingCell(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [editingCell]);

  const calculateTotalAnnualLeaveTaken = (empId: string, empName: string, year: number): number => {
    let totalTaken = 0;
    for (let m = 1; m <= 12; m++) {
      const totalDays = new Date(year, m, 0).getDate();
      for (let d = 1; d <= totalDays; d++) {
        // Find if there is a manual edit first (master source of truth)
        const key = `${empId}-${year}-${m}-${d}`;
        if (manualEdits[key] !== undefined) {
          const status = manualEdits[key];
          if (status === 'P') {
            totalTaken += 1.0;
          } else if (status === '1/2P') {
            totalTaken += 0.5;
          }
          continue;
        }

        // Otherwise check if there is an approved 'Nghỉ phép năm' request
        let hasApprovedRequest = false;
        let requestDays = 0;
        for (let i = 0; i < leaveRequests.length; i++) {
          const req = leaveRequests[i];
          if (req.status === 'Đã duyệt' && req.name.toLowerCase() === empName.toLowerCase() && req.type === 'Nghỉ phép năm') {
            const start = new Date(req.startDate);
            const end = new Date(req.endDate);
            const currentDate = new Date(year, m - 1, d);
            if (currentDate >= start && currentDate <= end) {
              const det = getDayDetails(d, m, year);
              if (!det.isHoliday && det.dayOfWeek !== 0) {
                hasApprovedRequest = true;
                requestDays = req.days === 0.5 ? 0.5 : 1.0;
                break;
              }
            }
          }
        }

        if (hasApprovedRequest) {
          totalTaken += requestDays;
          continue;
        }
      }
    }
    return totalTaken;
  };

  const calculateMonthlyLeaveTaken = (empId: string, empName: string, year: number, month: number): number => {
    let totalTaken = 0;
    const totalDays = new Date(year, month, 0).getDate();
    for (let d = 1; d <= totalDays; d++) {
      // Find if there is a manual edit first (master source of truth)
      const key = `${empId}-${year}-${month}-${d}`;
      if (manualEdits[key] !== undefined) {
        const status = manualEdits[key];
        if (status === 'P') {
          totalTaken += 1.0;
        } else if (status === '1/2P') {
          totalTaken += 0.5;
        }
        continue;
      }

      // Otherwise check if there is an approved 'Nghỉ phép năm' request
      let hasApprovedRequest = false;
      let requestDays = 0;
      for (let i = 0; i < leaveRequests.length; i++) {
        const req = leaveRequests[i];
        if (req.status === 'Đã duyệt' && req.name.toLowerCase() === empName.toLowerCase() && req.type === 'Nghỉ phép năm') {
          const start = new Date(req.startDate);
          const end = new Date(req.endDate);
          const currentDate = new Date(year, month - 1, d);
          if (currentDate >= start && currentDate <= end) {
            const det = getDayDetails(d, month, year);
            if (!det.isHoliday && det.dayOfWeek !== 0) {
              hasApprovedRequest = true;
              requestDays = req.days === 0.5 ? 0.5 : 1.0;
              break;
            }
          }
        }
      }

      if (hasApprovedRequest) {
        totalTaken += requestDays;
        continue;
      }
    }
    return totalTaken;
  };

  // Core attendance logs state: { [employeeId]: { [day]: status_symbol } }
  const [monthAttendance, setMonthAttendance] = useState<{ [empId: string]: { [day: number]: string } }>(() => {
    const totalDays = new Date(2026, 5, 0).getDate();
    return {
      '1': (() => {
        const list: { [key: number]: string } = {};
        for (let d = 1; d <= totalDays; d++) {
          const det = getDayDetails(d, 5, 2026);
          if (det.isHoliday) list[d] = 'L';
          else if (det.dayOfWeek === 0) list[d] = 'OFF';
          else if (det.dayOfWeek === 6) list[d] = '8';
          else list[d] = '8';
        }
        return list;
      })(),
      '2': (() => {
        const list: { [key: number]: string } = {};
        for (let d = 1; d <= totalDays; d++) {
          const det = getDayDetails(d, 5, 2026);
          if (det.isHoliday) list[d] = 'L';
          else if (det.dayOfWeek === 0) list[d] = 'OFF';
          else if (det.dayOfWeek === 6) list[d] = '8';
          else list[d] = '8';
        }
        return list;
      })(),
      '3': (() => {
        const list: { [key: number]: string } = {};
        for (let d = 1; d <= totalDays; d++) {
          const det = getDayDetails(d, 5, 2026);
          if (det.isHoliday) list[d] = 'L';
          else if (det.dayOfWeek === 0) list[d] = 'OFF';
          else if (det.dayOfWeek === 6) list[d] = '8';
          else list[d] = '8';
        }
        return list;
      })(),
      '4': (() => {
        const list: { [key: number]: string } = {};
        for (let d = 1; d <= totalDays; d++) {
          const det = getDayDetails(d, 5, 2026);
          if (det.isHoliday) list[d] = 'L';
          else if (det.dayOfWeek === 0) list[d] = 'OFF';
          else if (det.dayOfWeek === 6) list[d] = '8';
          else list[d] = '8';
        }
        return list;
      })(),
    };
  });

  const handleResetAttendance = (month: number, year: number, satWork: boolean) => {
    const totalDays = new Date(year, month, 0).getDate();
    const newLogs: { [empId: string]: { [day: number]: string } } = {};
    const todayMidnight = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
    
    activeQLCLEmployees.forEach(emp => {
      const list: { [key: number]: string } = {};
      for (let d = 1; d <= totalDays; d++) {
        const cellMidnight = new Date(year, month - 1, d);
        const isFuture = cellMidnight.getTime() > todayMidnight.getTime();
        
        if (isFuture) {
          list[d] = ''; // Ngày chưa tới thì không được tự chấm công
        } else {
          const det = getDayDetails(d, month, year);
          if (det.isHoliday) list[d] = 'L';
          else if (det.dayOfWeek === 0) list[d] = 'OFF';
          else if (det.dayOfWeek === 6) list[d] = satWork ? '8' : 'OFF';
          else list[d] = '8';
        }
      }
      
      // No stubborn hardcoding overrides: all leaves are now model-driven and generated starting from the leaveRequests state!

      // 1. Đồng bộ Đơn nghỉ phép đã được PHÊ DUYỆT (Đã duyệt)
      leaveRequests.forEach(req => {
        if (req.status === 'Đã duyệt' && req.name.toLowerCase() === emp.name.toLowerCase()) {
          const start = new Date(req.startDate);
          const end = new Date(req.endDate);
          
          for (let d = 1; d <= totalDays; d++) {
            const currentDate = new Date(year, month - 1, d);
            if (currentDate >= start && currentDate <= end) {
              let symbol = 'P';
              if (req.type === 'Nghỉ phép năm') {
                symbol = req.days === 0.5 ? '1/2P' : 'P';
              } else if (req.type === 'Nghỉ ốm') {
                symbol = 'O';
              } else if (req.type === 'Nghỉ thai sản / Đặc biệt') {
                symbol = 'CD';
              } else if (req.type === 'Nghỉ việc riêng') {
                symbol = 'NV';
              }
              
              const det = getDayDetails(d, month, year);
              if (!det.isHoliday && det.dayOfWeek !== 0) {
                list[d] = symbol;
              }
            }
          }
        }
      });

      // 2. Chấm công hàng ngày (Daily Check-in) is purely roll-call list and does not override Bảng chấm công as requested.

      // 3. Giữ nguyên các ô chỉnh sửa thủ công của người dùng
      for (let d = 1; d <= totalDays; d++) {
        const key = `${emp.id}-${year}-${month}-${d}`;
        if (manualEdits[key] !== undefined) {
          list[d] = manualEdits[key];
        }
      }

      newLogs[emp.id] = list;
    });
    setMonthAttendance(newLogs);
  };

  const handleResetToSystemDefaults = () => {
    const confirmReset = window.confirm(
      `BẠN CÓ CHẮC CHẮN MUỐN ĐẶT LẠI MẶC ĐỊNH?\n\nHành động này tự động:\n1. Xóa toàn bộ dữ liệu ô chấm công đã chỉnh sửa thủ công bằng tay (như ký hiệu phép P, nghỉ thai sản, đi trễ,...) của tháng ${selectedMonth}/${selectedYear} và khôi phục về mặc định chuẩn.\n2. Cài đặt số công chuẩn của tháng trở lại mặc định: 26 công.\n3. Đặt lịch làm việc thứ bảy về mặc định (Nghỉ thứ Bảy).\n\nToàn bộ lịch công tác phát sinh và các đơn xin phép đã được phê duyệt liên kết từ hệ thống vẫn giữ nguyên tự động.`
    );
    if (!confirmReset) return;

    const newEdits = { ...manualEdits };
    let countCleared = 0;
    Object.keys(newEdits).forEach((key) => {
      const parts = key.split('-');
      if (parts.length === 4) {
        const yVal = parseInt(parts[1], 10);
        const mVal = parseInt(parts[2], 10);
        if (yVal === selectedYear && mVal === selectedMonth) {
          delete newEdits[key];
          countCleared++;
        }
      }
    });

    // Restore official historical PDF defaults if restoring a month <= May 2026
    if (selectedYear === 2026 && selectedMonth <= 5) {
      Object.keys(defaultHistoricalEdits).forEach((key) => {
        const parts = key.split('-');
        if (parts.length === 4) {
          const yVal = parseInt(parts[1], 10);
          const mVal = parseInt(parts[2], 10);
          if (yVal === selectedYear && mVal === selectedMonth) {
            newEdits[key] = defaultHistoricalEdits[key];
          }
        }
      });
    }

    setManualEdits(newEdits);
    
    const defaultStandardDays = (selectedYear === 2026 && selectedMonth === 2) ? 24 : 26;
    setStandardDays(defaultStandardDays);
    setHasSaturdayWork(false);

    if (customEmployees.length > 0) {
      setCustomEmployees([]);
    }

    alert(`Đã khôi phục thành công bảng chấm công tháng ${selectedMonth}/${selectedYear} về cấu hình mặc định tuyệt đối!`);
  };

  useEffect(() => {
    handleResetAttendance(selectedMonth, selectedYear, hasSaturdayWork);
  }, [selectedMonth, selectedYear, hasSaturdayWork, customEmployees.length, leaveRequests, attendanceRecords, manualEdits]);

  const calculateMetrics = (empId: string) => {
    const empLogs = monthAttendance[empId] || {};
    let totalDaysWorked = 0;
    let regularHours = 0;
    let pCount = 0;
    let lCount = 0;
    let cdCount = 0;
    let nvCount = 0;
    let offCount = 0;

    Object.values(empLogs).forEach(status => {
      if (status === '8') {
        totalDaysWorked += 1.0;
        regularHours += 8;
      } else if (status === '1/2P') {
        totalDaysWorked += 0.5;
        regularHours += 4;
        pCount += 0.5;
      } else if (status === 'P') {
        pCount += 1.0;
      } else if (status === 'L') {
        lCount += 1.0;
      } else if (status === 'CD') {
        cdCount += 1.0;
      } else if (status === 'O') {
        cdCount += 1.0;
      } else if (status === 'NV') {
        nvCount += 1.0;
      } else if (status === 'OFF') {
        offCount += 1.0;
      }
    });

    const lunchReturns = pCount + lCount + cdCount + nvCount;

    return {
      rawDays: totalDaysWorked,
      totalHours: regularHours,
      pCount,
      lCount,
      cdCount,
      nvCount,
      offCount,
      lunchReturns,
    };
  };

  const handlePrintTimesheet = () => {
    const totalDays = new Date(selectedYear, selectedMonth, 0).getDate();
    
    let saturdaysCount = 0;
    let sundaysCount = 0;
    let holidaysCount = 0;
    
    for (let d = 1; d <= totalDays; d++) {
      const det = getDayDetails(d, selectedMonth, selectedYear);
      if (det.dayOfWeek === 6) saturdaysCount++;
      if (det.dayOfWeek === 0) sundaysCount++;
      if (det.isHoliday) holidaysCount++;
    }
    
    let daysRowHtml = '';
    let dowRowHtml = '';
    
    for (let d = 1; d <= totalDays; d++) {
      const det = getDayDetails(d, selectedMonth, selectedYear);
      const dowLabel = getVietnameseDayLabel(det.dayOfWeek);
      const isSunday = det.dayOfWeek === 0;
      const isSaturday = det.dayOfWeek === 6;
      const isHoliday = det.isHoliday;
      
      let bgStyle = '';
      if (isSunday) bgStyle = 'background-color: #fef3c7; color: #b45309;';
      else if (isHoliday) bgStyle = 'background-color: #fee2e2; color: #b91c1c;';
      else if (isSaturday) bgStyle = 'background-color: #f1f5f9; color: #475569;';
      
      daysRowHtml += `<th style="border: 1px solid #94a3b8; padding: 2.5px 0.5px; font-size: 8px; font-weight: 850; text-align: center; width: 17px; min-width: 17px; max-width: 17px; ${bgStyle}">${String(d).padStart(2, '0')}</th>`;
      dowRowHtml += `<th style="border: 1px solid #94a3b8; padding: 2px 0.5px; font-size: 7.5px; font-weight: 850; text-align: center; width: 17px; min-width: 17px; max-width: 17px; ${bgStyle}">${dowLabel}</th>`;
    }

    let employeesRowsHtml = '';
    activeQLCLEmployees.forEach((emp, idx) => {
      const metrics = calculateMetrics(emp.id);
      const empLogs = monthAttendance[emp.id] || {};
      
      let cellsHtml = '';
      for (let d = 1; d <= totalDays; d++) {
        const det = getDayDetails(d, selectedMonth, selectedYear);
        const isSunday = det.dayOfWeek === 0;
        const status = empLogs[d] !== undefined ? empLogs[d] : '';
        
        let cellColorStyle = '';
        if (status === 'P') cellColorStyle = 'color: #b45309; font-weight: 850;';
        else if (status === '1/2P') cellColorStyle = 'color: #b45309; font-weight: 850;';
        else if (status === 'L') cellColorStyle = 'color: #b91c1c; font-weight: 855;';
        else if (status === 'CD') cellColorStyle = 'color: #7c3aed; font-weight: 850;';
        else if (status === 'O') cellColorStyle = 'color: #db2777; font-weight: 854;';
        else if (status === 'OFF') cellColorStyle = 'color: #94a3b8; font-weight: 500;';
        else if (status === '8') cellColorStyle = 'color: #1e293b; font-weight: 850;';
        
        let cellBg = '';
        if (isSunday) cellBg = 'background-color: #fffbeb;';
        else if (det.isHoliday) cellBg = 'background-color: #fef2f2;';
        
        cellsHtml += `<td style="border: 1px solid #94a3b8; padding: 1.5px 0.5px; text-align: center; font-size: 7.5px; width: 17px; min-width: 17px; max-width: 17px; ${cellBg} ${cellColorStyle}">${status === 'OFF' ? '' : status}</td>`;
      }
      
      employeesRowsHtml += `
        <tr style="border-bottom: 1px solid #cbd5e1;">
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 700;">${idx + 1}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; font-size: 8px; font-weight: 800;">${emp.code}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 3px; font-size: 8px; font-weight: 800; white-space: nowrap;">${emp.name}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; font-size: 7.5px; font-weight: 700; color: #475569;">${emp.role}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; font-size: 7.5px; font-weight: 700; color: #475569; text-align: center;">${emp.dept}</td>
          ${cellsHtml}
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 900; background-color: #f8fafc;">${metrics.totalHours.toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800;">${metrics.rawDays.toFixed(1)}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #b45309;">${metrics.pCount > 0 ? metrics.pCount : '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #6d28d9;">${metrics.cdCount > 0 ? metrics.cdCount : '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #b91c1c;">${metrics.lCount > 0 ? metrics.lCount : '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #c2410c;">${metrics.nvCount > 0 ? metrics.nvCount : '-'}</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #64748b; background-color: #f8fafc;">-</td>
          <td style="border: 1px solid #94a3b8; padding: 3.5px 2px; text-align: center; font-size: 8px; font-weight: 800; color: #64748b;">${standardDays}</td>
        </tr>
      `;
    });

    const printContents = `
      <html>
        <head>
          <title>BẢNG CHẤM CÔNG PHÒNG QUẢN LÝ CHẤT LƯỢNG - THÁNG ${selectedMonth}/${selectedYear}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              padding: 5px;
              background-color: white;
              color: #1e293b;
              margin: 0;
            }
            @page {
              size: A4 landscape;
              margin: 0.4cm 0.5cm;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
              border: 1px solid #94a3b8;
              box-sizing: border-box;
            }
            th, td {
              font-family: 'Inter', sans-serif;
            }
            .title-block {
              text-align: center;
              margin-bottom: 20px;
            }
            .title-main {
              font-size: 15px;
              font-weight: 950;
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #1e293b;
            }
            .title-sub {
              font-size: 10px;
              font-weight: 700;
              color: #475569;
              margin-top: 4px;
              text-transform: uppercase;
            }
            .meta-info {
              display: flex;
              justify-content: space-between;
              font-size: 10px;
              font-weight: bold;
              color: #334155;
              margin-bottom: 10px;
              text-transform: uppercase;
            }
            .legend-block {
              display: flex;
              gap: 15px;
              font-size: 8px;
              font-weight: 800;
              color: #475569;
              margin-top: 15px;
              padding: 6px;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 4px;
            }
            .legend-item {
              display: flex;
              align-items: center;
              gap: 4px;
            }
            .legend-badge {
              padding: 1px 4px;
              border-radius: 2px;
              font-size: 8px;
              font-weight: 900;
            }
            .signatures-row {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              text-align: center;
              margin-top: 40px;
              page-break-inside: avoid;
            }
            .signature-col {
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .signature-title {
              font-size: 10px;
              font-weight: 900;
              text-transform: uppercase;
              color: #1e293b;
            }
            .signature-subtitle {
              font-size: 8px;
              font-weight: bold;
              color: #64748b;
              margin-top: 2px;
            }
            .signature-space {
              height: 60px;
            }
            .signature-name {
              font-size: 9.5px;
              font-weight: 900;
              color: #1e293b;
            }
          </style>
        </head>
        <body>
          <div class="title-block">
            <h1 class="title-main">BẢNG CHẤM CÔNG CÔNG NHÂN VIÊN</h1>
            <div class="title-sub">PHÒNG QUẢN LÝ CHẤT LƯỢNG (P.QLCL) • THÁNG ${selectedMonth}/${selectedYear}</div>
          </div>
          
          <div class="meta-info">
            <div>
              Bộ phận: <span style="font-weight: 900; color: #0284c7;">P.QLCL</span> &nbsp;|&nbsp; 
              Khối: <span style="font-weight: 900;">Văn Phòng Công Ty (VPCT)</span>
            </div>
            <div>
              Công chuẩn: <span style="font-weight: 900;">${standardDays} ngày</span> &nbsp;|&nbsp; 
              Thứ Bảy: <span style="font-weight: 900;">${hasSaturdayWork ? 'CÓ LÀM VIỆC' : 'NGHỈ TUẦN'}</span>
            </div>
          </div>

          <table>
            <thead>
              <tr style="background-color: #f1f5f9; border-top: 1px solid #94a3b8; height: 35px;">
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 8px; font-weight: 900; text-align: center; width: 22px; min-width: 22px; line-height: 1.3;">STT</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 8px; font-weight: 900; text-align: left; width: 50px; min-width: 50px; line-height: 1.3;">MÃ NV</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 8px; font-weight: 900; text-align: left; width: 110px; min-width: 110px; line-height: 1.3;">TÊN NHÂN VIÊN</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: left; width: 68px; min-width: 68px; line-height: 1.3;">CHỨC DANH</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 35px; min-width: 35px; line-height: 1.3;">BỘ PHẬN</th>
                <th colspan="${totalDays}" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 8px; font-weight: 900; text-align: center; text-transform: uppercase; line-height: 1.3;">Các ngày trong tháng</th>
                <th colspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 8px; font-weight: 900; text-align: center; line-height: 1.3;">TỔNG CÔNG</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 25px; min-width: 25px; color: #b45309; line-height: 1.3;">PHÉP<br>(P)</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 25px; min-width: 25px; color: #6d28d9; line-height: 1.3;">ỐM/TS<br>(CD)</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 25px; min-width: 25px; color: #b91c1c; line-height: 1.3;">LỄ/TẾT<br>(L)</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 25px; min-width: 25px; color: #c2410c; line-height: 1.3;">NGỪNG<br>(NV)</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 1px; font-size: 7.2px; font-weight: 900; text-align: center; width: 34px; min-width: 34px; color: #166534; background-color: #f0fdf4; line-height: 1.35;">SUẤT ĂN<br>TRA LẠI</th>
                <th rowspan="2" style="border: 1px solid #94a3b8; padding: 6px 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 25px; min-width: 25px; line-height: 1.3;">CÔNG<br>CHUẨN</th>
              </tr>
              <tr style="background-color: #f8fafc; height: 18px;">
                ${daysRowHtml}
                <th style="border: 1px solid #94a3b8; padding: 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 30px; min-width: 30px; background-color: #f1f5f9; line-height: 1.2;">GIỜ</th>
                <th style="border: 1px solid #94a3b8; padding: 4px; font-size: 7.5px; font-weight: 900; text-align: center; width: 26px; min-width: 26px; background-color: #f1f5f9; line-height: 1.2;">NGÀY</th>
              </tr>
              <tr style="background-color: #fffbeb;">
                <th colspan="5" style="border: 1px solid #94a3b8; padding: 2px 4px; font-size: 7.5px; font-weight: 800; text-align: right; color: #b45309;">THỨ TRONG TUẦN:</th>
                ${dowRowHtml}
                <th colspan="8" style="border: 1px solid #94a3b8; padding: 2px; background-color: #fffbeb;"></th>
              </tr>
            </thead>
            <tbody>
              ${employeesRowsHtml}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; font-size: 8px; font-weight: bold; color: #334155; margin-top: 10px; margin-bottom: 2px; padding: 4.5px 12px; background-color: #fffbeb; border: 1px solid #fef3c7; border-radius: 6px; text-transform: uppercase; box-sizing: border-box; width: 100%;">
            <div>Số ngày thứ bảy trong tháng: <span style="font-weight: 950; color: #b45309;">${saturdaysCount}</span></div>
            <div style="border-left: 1px solid #fbd38d; border-right: 1px solid #fbd38d; padding-left: 20px; padding-right: 20px;">Số ngày chủ nhật trong tháng: <span style="font-weight: 950; color: #b45309;">${sundaysCount}</span></div>
            <div>Số ngày lễ trong tháng: <span style="font-weight: 950; color: #b45309;">${holidaysCount}</span></div>
          </div>

          <div class="legend-block">
            <span style="font-weight: bold; border-right: 1px solid #cbd5e1; padding-right: 10px;">KÝ HIỆU CHẤM CÔNG:</span>
            <div class="legend-item"><span class="legend-badge" style="background-color: #f1f5f9; color: #1e293b;">8</span> Công hành chính (8 giờ)</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #fef3c7; color: #b45309;">P</span> Nghỉ phép năm hưởng lương (1 ngày)</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #fef3c7; color: #d97706;">1/2P</span> Nghỉ phép năm nửa ngày (0.5 ngày)</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #fee2e2; color: #dc2626;">L</span> Nghỉ lễ, tết nhà nước quy định</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #f3e8ff; color: #7e22ce;">CD</span> Nghỉ chế độ (Thai sản, ốm đau, bảo hiểm)</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #fce7f3; color: #db2777;">O</span> Con ốm</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #ffedd5; color: #ea580c;">NV</span> Ngừng việc / Việc riêng không lương</div>
            <div class="legend-item"><span class="legend-badge" style="background-color: #f1f5f9; color: #94a3b8;">OFF</span> Ngày nghỉ tuần chính thức (Chủ Nhật)</div>
          </div>

          <div style="margin-top: 15px; margin-bottom: 5px; background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; font-size: 8.5px; text-align: left; page-break-inside: avoid;">
            <div style="font-weight: 900; text-transform: uppercase; margin-bottom: 6px; color: #1e293b; font-size: 9px; letter-spacing: 0.3px;">THÀNH VIÊN BỘ PHẬN ĐÃ ĐỐI SOÁT & KÝ XÁC NHẬN ĐIỆN TỬ:</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              ${activeQLCLEmployees.map(emp => {
                const ack = timesheetAcknowledgements[`${selectedMonth}-${selectedYear}-${emp.id}`];
                let ackText = '';
                let ackColor = '';
                let ackBorderColor = '';
                let ackBg = '';
                if (ack?.confirmed) {
                  const d = new Date(ack.confirmedAt);
                  const dayStr = String(d.getDate()).padStart(2, '0');
                  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                  const yearStr = String(d.getFullYear()).slice(-2);
                  const hoursStr = String(d.getHours()).padStart(2, '0');
                  const minsStr = String(d.getMinutes()).padStart(2, '0');
                  ackText = `✓ Đã ký (${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minsStr})`;
                  ackColor = '#047857';
                  ackBorderColor = '#a7f3d0';
                  ackBg = '#f0fdf4';
                } else {
                  ackText = '✗ Chờ đối soát công';
                  ackColor = '#94a3b8';
                  ackBorderColor = '#cbd5e1';
                  ackBg = '#ffffff';
                }
                return `
                  <div style="border: 1px solid ${ackBorderColor}; background-color: ${ackBg}; padding: 6px; border-radius: 4px;">
                    <div style="font-weight: 800; color: #1e293b; font-size: 9px;">${emp.name}</div>
                    <div style="font-size: 7.5px; color: #64748b; margin-top: 1px; font-weight: 600;">${emp.role}</div>
                    <div style="font-size: 8px; margin-top: 5px; font-weight: 800; color: ${ackColor};">
                      ${ackText}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="signatures-row" style="margin-top: 35px;">
            <div class="signature-col">
              <span class="signature-title">PHÒNG HCNS KIỂM SÁT</span>
              <span class="signature-subtitle">(Ký, ghi rõ họ tên & đóng dấu)</span>
              <div class="signature-space"></div>
              <span class="signature-name">......................................................</span>
            </div>
            <div class="signature-col">
              <span class="signature-title">PHÊ DUYỆT BAN GIÁM ĐỐC</span>
              <span class="signature-subtitle">(Ký duyệt duyệt chi lương)</span>
              <div class="signature-space"></div>
              <span class="signature-name">......................................................</span>
            </div>
            <div class="signature-col">
              <span class="signature-title">ĐẠI DIỆN PHÒNG QUẢN LÝ CHẤT LƯỢNG</span>
              <span class="signature-subtitle">(Người lập bảng chấm công & ký xác minh)</span>
              <div class="signature-space"></div>
              <span class="signature-name">${effectiveUser.name}</span>
            </div>
          </div>

        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      const printContentsWithScript = printContents.replace('</body>', `
        <script>
          setTimeout(() => {
            window.print();
            window.close();
          }, 600);
        </script>
      </body>`);
      printWindow.document.write(printContentsWithScript);
      printWindow.document.close();
    } else {
      window.print();
    }
  };



  // ---- BIRTHDAY STATES ----
  const birthdayUsers = useMemo(() => {
    if (!allUsers) return [];
    const activeNames = activeQLCLEmployees.map(emp => emp.name.toLowerCase().trim());
    return allUsers.filter(u => {
      const nameLower = u.name.toLowerCase().trim();
      if (nameLower === 'quản trị viên' || nameLower === 'mai thị hậu') return false;
      return activeNames.some(actName => actName === nameLower || nameLower.includes(actName) || actName.includes(nameLower));
    });
  }, [allUsers, activeQLCLEmployees]);

  const [birthdayWish, setBirthdayWish] = useState('');
  const [wishTarget, setWishTarget] = useState<any>(null);
  const [wishes, setWishes] = useState<any[]>(() => {
    const initialized = localStorage.getItem('office_birthday_wishes_initialized');
    const saved = localStorage.getItem('office_birthday_wishes');
    
    if (initialized === 'true') {
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
      return [];
    }
    
    // First-time initialization
    const defaultWishes = [
      { id: 1, from: 'Trương Nhật Trường', to: 'Lê Nhật Trường', content: 'Chúc anh tuổi mới luôn dồi dào sức khỏe, thành công rực rỡ và tiếp tục dẫn dắt phòng QLCL gặt hái thêm nhiều cột mốc vĩ đại!', date: '2026-05-25' },
      { id: 2, from: 'Hệ thống Tân Phú', to: 'Lê Nhật Trường', content: 'Chúc mừng sinh nhật sếp! Mong sếp luôn giữ vững nhiệt huyết để đưa chất lượng công tác của Phòng QLCL bay cao bay xa!', date: '2026-05-25' }
    ];
    try {
      localStorage.setItem('office_birthday_wishes_initialized', 'true');
      localStorage.setItem('office_birthday_wishes', JSON.stringify(defaultWishes));
    } catch (e) {
      console.error(e);
    }
    return defaultWishes;
  });

  useEffect(() => {
    localStorage.setItem('office_birthday_wishes_initialized', 'true');
    localStorage.setItem('office_birthday_wishes', JSON.stringify(wishes));
  }, [wishes]);

  const [showWishConfetti, setShowWishConfetti] = useState(false);
  const [revealedUsers, setRevealedUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!wishTarget && birthdayUsers && birthdayUsers.length > 0) {
      // 1. Check if there is someone with birthday today
      let bOption = birthdayUsers.find(u => {
        const details = getBirthdayDetails(u.name);
        return details.isToday;
      });

      // 2. If not, check if there is someone in the current month whose birthday has not passed yet
      if (!bOption) {
        bOption = birthdayUsers.find(u => {
          const details = getBirthdayDetails(u.name);
          return details.isThisMonth && !details.isPassed;
        });
      }

      // 3. If still not found (meaning current month's birthdays have all passed, or no birthdays this month),
      // find the person who has the closest upcoming birthday in the future
      if (!bOption) {
        const nowTime = new Date().getTime();
        const currentYear = new Date().getFullYear();
        const candidates = birthdayUsers.map(user => {
          const details = getBirthdayDetails(user.name);
          let bDate = new Date(currentYear, details.month - 1, details.day, 0, 0, 0, 0);
          if (details.isPassed) {
            bDate = new Date(currentYear + 1, details.month - 1, details.day, 0, 0, 0, 0);
          }
          return {
            user,
            diffTime: bDate.getTime() - nowTime
          };
        });
        candidates.sort((a, b) => a.diffTime - b.diffTime);
        bOption = candidates[0]?.user;
      }

      setWishTarget(bOption || birthdayUsers[0]);
    }
  }, [birthdayUsers, wishTarget]);

  // Time ticker for attendance
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format date helper
  const formatDateString = (d: Date) => {
    return d.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Switch header based on tab
  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'office_calendar':
        return <span translate="no" className="notranslate">LỊCH CÔNG TÁC PHÒNG QLCL</span>;
      case 'attendance':
        return <span translate="no" className="notranslate">CHẤM CÔNG HÀNG NGÀY</span>;
      case 'leave_request':
        return <span translate="no" className="notranslate">ĐƠN XIN NGHỈ PHÉP</span>;
      case 'birthday':
        return <span translate="no" className="notranslate">SINH NHẬT THÀNH VIÊN</span>;
      default:
        return <span translate="no" className="notranslate">KHU VỰC VĂN PHÒNG</span>;
    }
  };

  // ---- FUNCTIONS ----
  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle) return;
    const item = {
      id: Date.now(),
      title: newEventTitle,
      date: newEventDate,
      time: newEventTime,
      location: newEventLocation,
      host: newEventHost,
      status: 'Xác nhận',
      type: newEventType,
      reason: newEventReason || 'Chưa cập nhật lý do',
    };
    setCalendarEvents([item, ...calendarEvents]);
    setNewEventTitle('');
    setNewEventReason('');
    setShowAddEvent(false);
  };

  const handleCreateCheckIn = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      const timeStr = new Date().toLocaleTimeString('vi-VN');
      let typeVal = 'Điện thoại QR';
      let locVal = 'Tòa nhà văn phòng Tân Phú (Vùng An Toàn Định Vị)';
      if (checkInMode === 'Offline') {
        typeVal = 'Vân tay';
        locVal = 'VP Tân Phú (Vùng An Toàn IP/Offline)';
      } else if (checkInMode === 'Công tác') {
        typeVal = 'Di động GPS';
        locVal = 'Địa điểm Công tác (Vùng GPS ngoài cơ quan)';
      }

      // Check check-in/out records for today
      const todayStr = new Date().toLocaleDateString('en-CA');
      const alreadyCheckedIn = attendanceRecords.some(r => r.name.toLowerCase() === effectiveUser.name.toLowerCase() && r.direction === 'VÀO' && (!r.date || r.date === todayStr));
      const alreadyCheckedOut = attendanceRecords.some(r => r.name.toLowerCase() === effectiveUser.name.toLowerCase() && r.direction === 'RA' && (!r.date || r.date === todayStr));

      if (alreadyCheckedIn && alreadyCheckedOut) {
        return;
      }

      const isVao = !alreadyCheckedIn;
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      let calculatedStatus = 'Đúng giờ';
      if (isVao) {
        calculatedStatus = (hours >= 8 && minutes > 0) || hours > 8 ? 'Đi muộn' : 'Đúng giờ';
      } else {
        calculatedStatus = hours < 17 ? 'Về sớm' : 'Đúng giờ';
      }

      const log = {
        id: Date.now(),
        name: effectiveUser.name,
        time: timeStr,
        status: calculatedStatus,
        type: typeVal,
        location: locVal,
        mode: checkInMode,
        direction: isVao ? 'VÀO' : ('RA' as any),
        date: new Date().toLocaleDateString('en-CA')
      };
      setAttendanceRecords([log, ...attendanceRecords]);
      setCheckInLog(log);
    }, 1500);
  };

  const handleAddLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason) return;
    const item = {
      id: Date.now(),
      name: effectiveUser.name,
      type: leaveType,
      days: Number(leaveDays),
      reason: leaveReason,
      startDate: leaveStart,
      endDate: leaveEnd,
      status: 'Đang phê duyệt'
    };
    setLeaveRequests([item, ...leaveRequests]);
    setLeaveReason('');
    
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-emerald-600">ĐĂNG KÝ THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-700 leading-relaxed">
          Đơn xin nghỉ phép của bạn đã được gửi thành công đến trưởng bộ phận phê duyệt theo thiết quân luật văn phòng.
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  // ---- ACTIVE SAVE & SYNCHRONIZATION BINDINGS ----
  const handleSaveCalendarEvents = () => {
    localStorage.setItem('office_calendar_events', JSON.stringify(calendarEvents));
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-indigo-600">LƯU THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
          Đã lưu trữ dữ liệu lịch công tác và đồng bộ các thay đổi lịch phòng QLCL thành công!
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">HOÀN TẤT</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  const handleSaveAndSyncLeaveRequests = () => {
    localStorage.setItem('office_leave_requests', JSON.stringify(leaveRequests));
    // Actively force-trigger recalculation of the timesheet model dynamically
    handleResetAttendance(selectedMonth, selectedYear, hasSaturdayWork);

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-emerald-600">ĐỒNG BỘ CHỦ ĐỘNG THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
          Đã chủ động lưu trữ dữ liệu đơn xin phép và đồng bộ đồng nhất 100% sang bảng chấm công tháng thành công!
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  const handleSaveLeaveAllowances = () => {
    localStorage.setItem('office_leave_allowances', JSON.stringify(leaveAllowances));
    
    // Actively force-trigger recalculation of the timesheet model dynamically
    handleResetAttendance(selectedMonth, selectedYear, hasSaturdayWork);

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-blue-600">LƯU QUỸ PHÉP THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
          Đã lưu trữ dữ liệu quỹ phép năm 2026 của phòng QLCL và đồng bộ đồng nhất sang bảng chấm công thành công!
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  const handleSaveMonthlyAttendance = () => {
    localStorage.setItem('office_manual_edits', JSON.stringify(manualEdits));
    localStorage.setItem('office_custom_employees', JSON.stringify(customEmployees));
    handleResetAttendance(selectedMonth, selectedYear, hasSaturdayWork);

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-indigo-600">LƯU BẢNG CÔNG THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
          Đã lưu trữ dữ liệu bảng chấm công hiện tại và cập nhật chỉ số công chuẩn phòng QLCL thành công!
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  const handleSaveDailyAttendance = () => {
    localStorage.setItem('office_attendance_records', JSON.stringify(attendanceRecords));
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black text-indigo-600">LƯU ĐIỂM DANH THÀNH CÔNG!</span>,
      message: (
        <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
          Đã lưu trữ thành công toàn bộ bản ghi quét thẻ điểm danh hàng ngày phòng QLCL!
        </span>
      ),
      confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
    });
  };

  const handleSendWishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!birthdayWish || !wishTarget) return;
    const item = {
      id: Date.now(),
      from: effectiveUser.name,
      to: wishTarget.name,
      content: birthdayWish,
      date: new Date().toISOString().split('T')[0]
    };
    setWishes([item, ...wishes]);
    setBirthdayWish('');
    setShowWishConfetti(true);
    setTimeout(() => setShowWishConfetti(false), 5000);
  };

  // ---- DYNAMIC BIRTHDAY UTILITIES ----
  const getBirthdayDetails = (name: string) => {
    // 1. Resolve matching user from allUsers to get their formal birthDate
    const targetUser = allUsers.find(u => u.name === name || u.name.toLowerCase().includes(name.toLowerCase()));
    const birthDateStr = targetUser?.birthDate;

    let day = 0;
    let month = 0;
    let hasCustomBirthDate = false;

    if (birthDateStr) {
      const parts = birthDateStr.split('-');
      if (parts.length === 3) {
        day = parseInt(parts[2], 10);
        month = parseInt(parts[1], 10);
        hasCustomBirthDate = true;
      }
    }

    // 2. Fallbacks if no custom birthdate is configured yet
    if (!day || !month) {
      if (name.includes('Lê Nhật Trường')) {
        day = 25; month = 5;
      } else if (name.includes('Bành Nhựt Hùng')) {
        day = 30; month = 5;
      } else if (name.includes('Nguyễn Kiểu Phan Tú')) {
        day = 12; month = 6;
      } else if (name.includes('Võ Thị Mỹ Tân')) {
        day = 4; month = 10;
      } else if (name.includes('Mai Thị Hậu')) {
        day = 18; month = 7;
      } else if (name.includes('Quản trị viên') || name.includes('Admin')) {
        day = 15; month = 5;
      } else {
        const code = name.charCodeAt(0) % 12;
        const fallbackMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        month = fallbackMonths[code];
        day = (name.charCodeAt(name.length - 1) % 28) + 1;
      }
    }

    // 3. Dynamic Zodiac Sign calculation
    const getZodiacSign = (d: number, m: number) => {
      if ((m === 3 && d >= 21) || (m === 4 && d <= 19)) return 'Bạch Dương ♈';
      if ((m === 4 && d >= 20) || (m === 5 && d <= 20)) return 'Kim Ngưu ♉';
      if ((m === 5 && d >= 21) || (m === 6 && d <= 20)) return 'Song Tử ♊';
      if ((m === 6 && d >= 21) || (m === 7 && d <= 22)) return 'Cự Giải ♋';
      if ((m === 7 && d >= 23) || (m === 8 && d <= 22)) return 'Sư Tử ♌';
      if ((m === 8 && d >= 23) || (m === 9 && d <= 22)) return 'Xử Nữ ♍';
      if ((m === 9 && d >= 23) || (m === 10 && d <= 22)) return 'Thiên Bình ♎';
      if ((m === 10 && d >= 23) || (m === 11 && d <= 21)) return 'Bọ Cạp ♏';
      if ((m === 11 && d >= 22) || (m === 12 && d <= 21)) return 'Nhân Mã ♐';
      if ((m === 12 && d >= 22) || (m === 1 && d <= 19)) return 'Ma Kết ♑';
      if ((m === 1 && d >= 20) || (m === 2 && d <= 18)) return 'Bảo Bình ♒';
      return 'Song Ngư ♓';
    };

    // 4. Dynamic Date Context Checks (relative to the current real time)
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();

    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowMonth = tomorrow.getMonth() + 1;
    const tomorrowDay = tomorrow.getDate();

    const isThisMonth = month === currentMonth;
    const isTomorrow = month === tomorrowMonth && day === tomorrowDay;
    const isToday = month === currentMonth && day === currentDay;
    const isPassed = month < currentMonth || (month === currentMonth && day < currentDay);

    return {
      day,
      month,
      dateLabel: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
      zodiac: getZodiacSign(day, month),
      isThisMonth,
      isPassed,
      isTomorrow,
      isToday,
      hasCustomBirthDate
    };
  };

  const handleToggleSyncBirthday = (user: any) => {
    const details = getBirthdayDetails(user.name);
    const eventTitle = `🎂 SINH NHẬT: ${user.name} (${details.dateLabel})`;
    const eventDate = `2026-${String(details.month).padStart(2, '0')}-${String(details.day).padStart(2, '0')}`;
    
    const existing = calendarEvents.find(ev => ev.title === eventTitle || (ev.type === 'birthday' && ev.title.includes(user.name)));
    
    if (existing) {
      const updated = calendarEvents.filter(ev => ev.id !== existing.id);
      setCalendarEvents(updated);
      localStorage.setItem('office_calendar_events', JSON.stringify(updated));
      
      setConfirmModal({
        show: true,
        title: <span translate="no" className="notranslate font-black text-rose-600">HỦY ĐỒNG BỘ THÀNH CÔNG!</span>,
        message: (
          <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-750 leading-relaxed">
            Đã gỡ bỏ sự kiện sinh nhật của {user.name} khỏi Lịch công tác Phòng QLCL!
          </span>
        ),
        confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
      });
    } else {
      const newEvent = {
        id: Date.now(),
        title: eventTitle,
        date: eventDate,
        time: 'Cả ngày',
        location: 'Văn phòng QLCL',
        host: 'Phòng QLCL',
        status: 'Xác nhận',
        type: 'birthday',
        reason: `Mừng tuổi mới thành viên ${user.name} hân hoan hỷ xả! Cả phòng tổ chức chúc mừng vào khung giờ nghỉ trưa.`
      };
      const updated = [newEvent, ...calendarEvents];
      setCalendarEvents(updated);
      localStorage.setItem('office_calendar_events', JSON.stringify(updated));

      setConfirmModal({
        show: true,
        title: <span translate="no" className="notranslate font-black text-pink-600">ĐỒNG BỘ THÀNH CÔNG!</span>,
        message: (
          <span translate="no" className="notranslate uppercase font-black text-xs block text-center py-2 text-slate-755 leading-relaxed">
            Đã đồng bộ ngày sinh nhật ${details.dateLabel} của ${user.name} vào Lịch công tác Phòng QLCL thành công!
          </span>
        ),
        confirmText: <span translate="no" className="notranslate text-white font-black">XÁC NHẬN</span>,
        onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
      });
    }
  };

  return (
    <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 min-h-0 flex flex-col">
      <HolidayBanner />
      <Header title={getHeaderTitle()} onlineUsers={presence} currentUserId={effectiveUser.id} />

      <div className="p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        
        {/* TAB 1: LỊCH CÔNG TÁC */}
        {activeTab === 'office_calendar' && (
          <div className="space-y-8 animate-fade-in">
            {/* THIẾT KẾ HIỆN ĐẠI, SẮC NÉT, TINH TẾ */}
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-4 md:p-6 shadow-md">
              {/* Calendar Body Area */}
              <div className="p-1">
                
                {/* Title & Interactive Subheading controls */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 pb-6 border-b-2 border-slate-200">
                  <div className="flex items-center gap-3.5">
                    <div className="relative w-12 h-12 rounded-xl bg-slate-900 font-black text-white flex items-center justify-center shadow-md">
                      <Calendar size={22} />
                      <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                      </span>
                    </div>
                    <div>
                      <h3 translate="no" className="notranslate text-[10px] font-black tracking-widest text-slate-500 uppercase leading-snug">
                        Hệ thống quản lý lịch trực tuyến QLCL
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span translate="no" className="notranslate text-base font-black text-slate-800 uppercase tracking-tight">
                          LỊCH ĐỂ BÀN ĐIỆN TỬ QLCL
                        </span>
                        <span translate="no" className="notranslate text-[9px] bg-slate-800 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          VĂN PHÒNG ĐIỆN TỬ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Month Navigator with visual enhancement */}
                  <div className="flex items-center justify-between md:justify-end gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 border-2 border-slate-200 rounded-xl shadow-sm">
                      <button
                        type="button"
                        onClick={() => {
                          if (deskCalMonth === 1) {
                            setDeskCalMonth(12);
                            setDeskCalYear(deskCalYear - 1);
                          } else {
                            setDeskCalMonth(deskCalMonth - 1);
                          }
                        }}
                        className="p-2 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 shadow-sm transition-all text-slate-700 hover:text-slate-950 active:scale-95 text-xs font-black"
                        title="Tháng trước"
                      >
                        <ChevronLeft size={15} strokeWidth={2.5} />
                      </button>
                      
                      <div translate="no" className="notranslate px-4 min-w-[150px] text-center flex flex-col justify-center">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">THÁNG / NĂM</span>
                        <span className="text-sm font-black text-slate-900 uppercase mt-1 tracking-wider">
                          {String(deskCalMonth).padStart(2, '0')} / {deskCalYear}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (deskCalMonth === 12) {
                            setDeskCalMonth(1);
                            setDeskCalYear(deskCalYear + 1);
                          } else {
                            setDeskCalMonth(deskCalMonth + 1);
                          }
                        }}
                        className="p-2 bg-white hover:bg-slate-200 rounded-lg border border-slate-300 shadow-sm transition-all text-slate-700 hover:text-slate-950 active:scale-95 text-xs font-black"
                        title="Tháng sau"
                      >
                        <ChevronRight size={15} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Today reset button */}
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setDeskCalMonth(today.getMonth() + 1);
                        setDeskCalYear(today.getFullYear());
                        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                        setSelectedCalendarDateStr(todayStr);
                      }}
                      className="p-3 bg-slate-900 hover:bg-black text-white border border-slate-850 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <RotateCcw size={12} /> HÔM NAY
                    </button>

                    {/* Active Save Calendar Events button */}
                    <button
                      type="button"
                      onClick={handleSaveCalendarEvents}
                      className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[10px] uppercase tracking-wider transition-all shadow-md active:scale-95 flex items-center gap-1.5 cursor-pointer"
                      title="Chủ động lưu trữ toàn bộ dữ liệu lịch công tác phòng QLCL"
                    >
                      <Save size={12} strokeWidth={2.5} /> LƯU LỊCH PHÒNG
                    </button>
                  </div>
                </div>

                {/* Operational Tags Legend */}
                <div className="flex flex-wrap items-center gap-3.5 mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 text-[10px] font-extrabold uppercase tracking-wide">
                  <span className="text-slate-400 select-none">CHÚ GIẢI TÁC VỤ:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-blue-600 shadow-sm" />
                    <span>HỌP NỘI BỘ</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-600 shadow-sm" />
                    <span>ĐÁNH GIÁ CHẤT LƯỢNG (AUDIT)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500 shadow-sm" />
                    <span>THỬ NGHIỆM KIỂM TRA</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded bg-purple-600 shadow-sm" />
                    <span>CHUẨN BỊ HỒ SƠ / ISO</span>
                  </div>
                  <div className="ml-auto text-blue-800 flex items-center gap-1 font-black">
                    <Sparkles size={11} /> BẤM VÀO Ô ĐỂ ĐĂNG KÝ HOẶC CHỌN XEM
                  </div>
                </div>

                {/* Desk Calendar Grid container */}
                <div className="grid grid-cols-7 gap-1.5 md:gap-3">
                  {/* Header Weekday Labels */}
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((dayLabel, index) => (
                    <div
                      key={dayLabel}
                      className={`text-center py-2.5 text-[10.5px] font-black uppercase tracking-widest border-b-2 mb-2 ${
                        index === 6 
                          ? 'text-rose-600 border-rose-200 bg-rose-50' 
                          : index === 5 
                          ? 'text-blue-600 border-blue-200 bg-blue-50' 
                          : 'text-slate-700 border-slate-200 bg-slate-50'
                      } rounded-lg`}
                    >
                      {dayLabel}
                    </div>
                  ))}

                  {/* Days of Calendar Grid mapping */}
                  {(() => {
                    const daysInMonth = new Date(deskCalYear, deskCalMonth, 0).getDate();
                    const firstDayIndex = new Date(deskCalYear, deskCalMonth - 1, 1).getDay();
                    const startOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

                    const cells = [];
                    const prevMonthDaysCount = new Date(deskCalYear, deskCalMonth - 1, 0).getDate();
                    
                    // Prev month padded dates
                    for (let i = startOffset - 1; i >= 0; i--) {
                      const pm = deskCalMonth === 1 ? 12 : deskCalMonth - 1;
                      const py = deskCalMonth === 1 ? deskCalYear - 1 : deskCalYear;
                      const d = prevMonthDaysCount - i;
                      cells.push({
                        day: d,
                        month: pm,
                        year: py,
                        isCurrentMonth: false,
                        dateStr: `${py}-${String(pm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      });
                    }

                    // Current month actual dates
                    for (let d = 1; d <= daysInMonth; d++) {
                      cells.push({
                        day: d,
                        month: deskCalMonth,
                        year: deskCalYear,
                        isCurrentMonth: true,
                        dateStr: `${deskCalYear}-${String(deskCalMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      });
                    }

                    // Next month padded dates to form a clean square layout
                    const totalSlots = 42;
                    const nextSlotsNeeded = totalSlots - cells.length;
                    for (let d = 1; d <= nextSlotsNeeded; d++) {
                      const nm = deskCalMonth === 12 ? 1 : deskCalMonth + 1;
                      const ny = deskCalMonth === 12 ? deskCalYear + 1 : deskCalYear;
                      cells.push({
                        day: d,
                        month: nm,
                        year: ny,
                        isCurrentMonth: false,
                        dateStr: `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      });
                    }

                    return cells.map((cell, idx) => {
                      const dayEvents = calendarEvents.filter(ev => ev.date === cell.dateStr);
                      const today = new Date();
                      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                      const isToday = cell.dateStr === todayStr;
                      const isSelected = cell.dateStr === selectedCalendarDateStr;
                      const dayOfWeek = (idx % 7) + 1; // 1 = T2, ..., 7 = CN

                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            setSelectedCalendarDateStr(cell.dateStr);
                            setNewEventDate(cell.dateStr);
                            setNewEventTitle('');
                            setNewEventReason('');
                            setShowAddEvent(true);
                          }}
                          className={`min-h-[120px] p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer group relative overflow-hidden select-none ${
                            !cell.isCurrentMonth
                              ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60'
                              : isSelected
                              ? 'bg-blue-50 border-2 border-blue-600 shadow-sm'
                              : isToday
                              ? 'bg-amber-50 border-2 border-amber-500 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-800 hover:bg-slate-50'
                          }`}
                        >
                          {/* Cell Header: Badge "Hôm Nay" / Day Number value */}
                          <div className="flex justify-between items-center mb-1.5 z-10 w-full">
                            <div>
                              {isToday && cell.isCurrentMonth && (
                                <span className="text-[7.5px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider shadow-sm flex items-center gap-0.5 border border-amber-700">
                                  H.NAY
                                </span>
                              )}
                            </div>
                            <span
                              className={`text-xs font-black leading-none w-6.5 h-6.5 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${
                                isToday && cell.isCurrentMonth
                                  ? 'text-amber-900 bg-amber-100 font-extrabold'
                                  : isSelected
                                  ? 'text-white bg-blue-600 font-extrabold shadow-sm'
                                  : dayOfWeek === 7
                                  ? 'text-rose-600 font-extrabold'
                                  : dayOfWeek === 6
                                  ? 'text-blue-600 font-bold'
                                  : !cell.isCurrentMonth
                                  ? 'text-slate-400'
                                  : 'text-slate-800'
                              }`}
                            >
                              {cell.day}
                            </span>
                          </div>

                          {/* Task Events container area */}
                          <div className="my-1 flex-1 space-y-1 overflow-hidden z-10 w-full">
                            {dayEvents.slice(0, 3).map((ev) => {
                              const borderLeftClass = 
                                ev.type === 'meeting' ? 'border-l-blue-600 bg-blue-100 text-blue-900 border-blue-200' :
                                ev.type === 'birthday' ? 'border-l-pink-600 bg-pink-100 text-pink-950 border-pink-200' :
                                ev.type === 'audit' ? 'border-l-emerald-600 bg-emerald-100 text-emerald-950 border-emerald-200' :
                                ev.type === 'evaluate' ? 'border-l-amber-600 bg-amber-100 text-amber-950 border-amber-200' :
                                'border-l-purple-600 bg-purple-100 text-purple-900 border-purple-200';
                              
                              return (
                                <div
                                  key={ev.id}
                                  className={`text-[8.5px] leading-relaxed font-black px-1.5 py-0.5 rounded border border-l-4 truncate w-full text-left transition-all ${borderLeftClass}`}
                                  title={`${ev.title}${ev.reason ? ` - Lý do: ${ev.reason}` : ''}`}
                                >
                                  <span className="truncate block">{ev.title}</span>
                                </div>
                              );
                            })}
                            
                            {dayEvents.length > 3 && (
                              <div className="text-[7.5px] font-black text-blue-700 bg-blue-105 rounded border border-blue-400/50 text-center py-0.5">
                                + {dayEvents.length - 3} t.vụ
                              </div>
                            )}
                          </div>

                          {/* Hover Action visual trigger */}
                          <div className="h-4 mt-0.5 border-t border-slate-200 pt-0.5 flex items-center justify-between overflow-hidden z-10 w-full">
                            <span className="text-[7.5px] text-slate-500 font-black uppercase">
                              {dayEvents.length > 0 ? `${dayEvents.length} lịch` : 'Trống'}
                            </span>
                            
                            <span className="text-[7.5px] font-black uppercase text-blue-700 tracking-wider items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex">
                              <Plus size={8} strokeWidth={3} /> Đăng ký
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            {/* Quick-add Popup modal for registering event when clicked on calendar */}
            <AnimatePresence>
              {showAddEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl w-full max-w-lg overflow-hidden text-slate-850"
                  >
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="text-blue-600" size={18} />
                        <span translate="no" className="notranslate text-emerald-700 font-extrabold text-sm uppercase tracking-wider">
                          ĐĂNG KÝ LỊCH CÔNG TÁC MỜI NGÀY {formatDateVN(newEventDate)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowAddEvent(false)}
                        className="text-slate-400 hover:text-slate-750 p-1.5 rounded-lg transition-transform hover:scale-110"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleAddEventSubmit} className="space-y-4 text-left">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Ngày tác vụ</label>
                        <input
                          type="text"
                          readOnly
                          value={formatDateVN(newEventDate)}
                          className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-black text-slate-700 outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Nội dung công tác *</label>
                        <input
                          type="text"
                          placeholder="Nhập nội dung công việc thực hiện..."
                          required
                          value={newEventTitle}
                          onChange={e => setNewEventTitle(e.target.value)}
                          className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Lý do công tác / Mục đích *</label>
                        <textarea
                          placeholder="Nhập lý do, mục đích công tác cụ thể..."
                          required
                          rows={3}
                          value={newEventReason}
                          onChange={e => setNewEventReason(e.target.value)}
                          className="w-full text-xs p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Địa điểm diễn ra</label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Phòng họp Lớn, Nhà máy số 2..."
                            value={newEventLocation}
                            onChange={e => setNewEventLocation(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Khung giờ cụ thể</label>
                          <input
                            type="text"
                            placeholder="08:30 - 11:30"
                            value={newEventTime}
                            onChange={e => setNewEventTime(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-650/10 focus:border-blue-600 bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Người chủ trì / Công tác</label>
                          <select
                            value={newEventHost}
                            onChange={e => setNewEventHost(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none"
                          >
                            {qlclEmployees.map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name} ({emp.role})</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Phân loại tác vụ</label>
                          <select
                            value={newEventType}
                            onChange={e => setNewEventType(e.target.value)}
                            className="w-full text-xs h-9 px-3 border border-slate-200 rounded-lg bg-white outline-none"
                          >
                            <option value="meeting">Họp nội bộ</option>
                            <option value="audit">Đánh giá chất lượng (Audit)</option>
                            <option value="evaluate">Thử nghiệm kiểm tra</option>
                            <option value="document">Chuẩn bị hồ sơ / ISO</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-3.5 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => setShowAddEvent(false)}
                          className="px-4 py-2 text-xs bg-slate-100 hover:bg-slate-200 rounded-xl font-black uppercase tracking-wider text-slate-600 transition-colors"
                        >
                          HỦY BỎ
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider transition-all shadow-md shadow-blue-500/10"
                        >
                          XÁC NHẬN ĐĂNG KÝ
                        </button>
                      </div>
                    </form>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* LOWER PORTION: EXPANDED DETAILED WEEK AGENDA & MONTH CALENDAR LOGS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* CỘT TRÁI: DÒNG THỜI GIAN TUẦN NÀY - planner journal style */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xl shadow-slate-100/35 flex flex-col justify-between">
                <div>
                  {(() => {
                    const week = getWeekRange(selectedCalendarDateStr);
                    const weekEvents = calendarEvents.filter(ev => {
                      const evDate = new Date(ev.date);
                      const monDate = new Date(week.mondayStr);
                      const sunDate = new Date(week.sundayStr);
                      return evDate >= monDate && evDate <= sunDate;
                    });

                    return (
                      <>
                        <div className="flex items-center justify-between mb-6 border-b border-blue-100/50 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100/30">
                              <ClipboardList size={18} />
                            </div>
                            <div>
                              <h4 translate="no" className="notranslate text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                                GIAO DIỆN LẬP KẾ HOẠCH
                              </h4>
                              <p className="text-sm text-slate-800 font-extrabold uppercase mt-1 tracking-tight">
                                TUẦN NÀY: {week.label}
                              </p>
                            </div>
                          </div>
                          
                          <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-100/40 font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                            {weekEvents.length} Tác vụ
                          </span>
                        </div>

                        {/* Event planner cards list */}
                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                          {weekEvents.length === 0 ? (
                            <div className="py-16 text-center text-slate-450 uppercase font-black text-[10.5px] space-y-3">
                              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                                <Info size={28} />
                              </div>
                              <p className="tracking-widest">Không có tác vụ nào đăng ký trong tuần này.</p>
                            </div>
                          ) : (
                            weekEvents.map((ev) => {
                              const dateObj = new Date(ev.date);
                              const dayLabel = dateObj.getDay() === 0 ? 'CN' : `T${dateObj.getDay() + 1}`;
                              
                              const typeColor = 
                                ev.type === 'meeting' ? 'border-l-blue-600 bg-blue-50/15' :
                                ev.type === 'audit' ? 'border-l-emerald-600 bg-emerald-50/15' :
                                ev.type === 'evaluate' ? 'border-l-amber-600 bg-amber-50/15' :
                                'border-l-purple-600 bg-purple-50/15';

                              return (
                                <div 
                                  key={ev.id} 
                                  className={`p-4 border border-slate-200/60 rounded-2xl ${typeColor} border-l-4 hover:border-slate-305 hover:shadow-lg transition-all text-left group`}
                                >
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex gap-3.5 items-start">
                                      {/* Micro Calendar Visual Sheet */}
                                      <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-white to-slate-100 border border-slate-200/80 flex flex-col items-center justify-center shrink-0 shadow-sm">
                                        <span className="text-[8px] font-black tracking-widest text-white uppercase bg-slate-800 w-full text-center py-0.5 rounded-t-lg">{dayLabel}</span>
                                        <span className="text-xs font-black text-slate-800 leading-none mt-1">{formatDateVN(ev.date).split('/')[0]}</span>
                                      </div>
                                      
                                      <div>
                                        <span translate="no" className="notranslate text-xs font-black text-slate-850 uppercase leading-snug block transition-colors group-hover:text-blue-600">
                                          {ev.title}
                                        </span>
                                        
                                        {/* Metadata outline pills */}
                                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm"><Clock size={10} /> {ev.time}</span>
                                          <span className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-sm"><MapPin size={10} /> {ev.location}</span>
                                          <span className="inline-flex items-center gap-1 bg-indigo-50/60 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 shadow-sm">👤 {ev.host}</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 self-start sm:self-center">
                                      <span className={`text-[8.5px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-sm ${
                                        ev.status === 'Đang diễn ra' 
                                          ? 'bg-amber-500 text-white border-amber-400' 
                                          : 'bg-emerald-500 text-white border-emerald-400'
                                      }`}>
                                        {ev.status}
                                      </span>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEvent(ev);
                                        }}
                                        className="p-1 px-1.5 text-[10px] bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-lg font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                        title="Chỉnh sửa công tác"
                                      >
                                        <Sliders size={11} /> Sửa
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirm({
                                            type: 'event',
                                            id: ev.id,
                                            title: `Xóa lịch công tác phát sinh`,
                                            subtitle: `Công tác: "${ev.title}" vào ngày ${formatDateVN(ev.date)} ${ev.time ? `lúc ${ev.time}` : ''}`
                                          });
                                        }}
                                        className="p-1 px-1.5 text-[10px] bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                        title="Xóa công tác"
                                      >
                                        <Trash2 size={11} /> Xóa
                                      </button>
                                    </div>
                                  </div>

                                  {/* Detailed Goal section */}
                                  <div className="mt-2.5 text-[10.5px] bg-white border border-slate-100 p-2.5 rounded-xl text-slate-650 font-semibold leading-relaxed shadow-inner">
                                    <div className="flex items-center gap-1 text-[8px] text-slate-400 font-black uppercase tracking-wider mb-1">
                                      <span>MỤC TIÊU CHI TIẾT</span>
                                      <span className="h-px bg-slate-100 flex-1 ml-1" />
                                    </div>
                                    <p className="italic text-slate-705">"{ev.reason || 'Sổ tay chưa cập nhật'}"</p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* CỘT PHẢI: HOẠCH ĐỊNH CHUNG TOÀN THÁNG - feed style */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xl shadow-slate-100/35 flex flex-col justify-between">
                <div>
                  {(() => {
                    const monthEvents = calendarEvents.filter(ev => {
                      const evDate = new Date(ev.date);
                      return evDate.getMonth() + 1 === deskCalMonth && evDate.getFullYear() === deskCalYear;
                    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    return (
                      <>
                        <div className="flex items-center justify-between mb-6 border-b border-teal-100 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shadow-sm border border-teal-100/30">
                              <ClipboardList size={18} />
                            </div>
                            <div>
                              <h4 translate="no" className="notranslate text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                                HOẠCH ĐỊNH TỔNG THỂ PHÒNG
                              </h4>
                              <p className="text-sm text-slate-800 font-extrabold uppercase mt-1 tracking-tight">
                                THÁNG {String(deskCalMonth).padStart(2, '0')} / {deskCalYear}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-100/40 font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                            {monthEvents.length} Công việc
                          </span>
                        </div>

                        {/* Month feed list */}
                        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                          {monthEvents.length === 0 ? (
                            <div className="py-16 text-center text-slate-450 uppercase font-black text-[10.5px] space-y-3">
                              <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-300 shadow-inner">
                                <Info size={28} />
                              </div>
                              <p className="tracking-widest">Phòng ban chưa ghi nhận lịch công tác tháng này.</p>
                            </div>
                          ) : (
                            monthEvents.map((ev) => {
                              const typeColor = 
                                ev.type === 'meeting' ? 'border-l-blue-600 bg-blue-50/15' :
                                ev.type === 'birthday' ? 'border-l-pink-600 bg-pink-50/15' :
                                ev.type === 'audit' ? 'border-l-emerald-600 bg-emerald-50/15' :
                                ev.type === 'evaluate' ? 'border-l-amber-600 bg-amber-50/15' :
                                'border-l-purple-600 bg-purple-50/15';

                              return (
                                <div 
                                  key={ev.id} 
                                  className={`p-4 border border-slate-200/60 rounded-2xl ${typeColor} border-l-4 hover:shadow-lg transition-all text-left`}
                                >
                                  <div className="flex justify-between items-start gap-3">
                                    <div className="space-y-1.5 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9.5px] font-black text-teal-700 bg-teal-50 border border-teal-100/70 rounded-md px-2 py-0.5 uppercase tracking-wider shadow-sm">
                                          Ngày {formatDateVN(ev.date)}
                                        </span>
                                        <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">
                                          ({ev.type === 'birthday' ? 'Sinh nhật' : ev.type === 'meeting' ? 'Họp Bộ Phận' : ev.type === 'audit' ? 'Audit chất lượng' : ev.type === 'evaluate' ? 'Kiểm nghiệm' : 'ISO/Hồ sơ'})
                                        </span>
                                      </div>
                                      
                                      <span translate="no" className="notranslate text-xs font-black text-slate-850 uppercase leading-snug block">
                                        {ev.title}
                                      </span>
                                      
                                      {/* Lower inline stats */}
                                      <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[9px] text-slate-500 font-extrabold uppercase tracking-wider">
                                        <span className="flex items-center gap-0.5"><Clock size={10} /> {ev.time}</span>
                                        <span className="flex items-center gap-0.5"><MapPin size={10} /> {ev.location}</span>
                                        <span className="text-teal-655 font-black">Người đăng: {ev.host}</span>
                                      </div>
                                    </div>

                                    {/* Action controllers */}
                                    <div className="flex flex-col gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingEvent(ev);
                                        }}
                                        className="p-1 px-1.5 text-[9px] bg-slate-100 hover:bg-teal-50 border border-slate-200 text-slate-500 hover:text-teal-700 rounded-lg font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        title="Chỉnh sửa công tác"
                                      >
                                        <Sliders size={10} /> Sửa
                                      </button>
                                      
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDeleteConfirm({
                                            type: 'event',
                                            id: ev.id,
                                            title: `Xóa lịch công tác phát sinh`,
                                            subtitle: `Công tác: "${ev.title}" vào ngày ${formatDateVN(ev.date)} ${ev.time ? `lúc ${ev.time}` : ''}`
                                          });
                                        }}
                                        className="p-1 px-1.5 text-[9px] bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                                        title="Xóa công tác"
                                      >
                                        <Trash2 size={10} /> Xóa
                                      </button>
                                    </div>
                                  </div>

                                  {/* Compact Goal Row */}
                                  <div className="mt-2.5 text-[10px] bg-white border border-slate-100 p-2.5 rounded-xl text-slate-600 italic shadow-inner">
                                    <span className="font-extrabold text-slate-755 not-italic uppercase tracking-widest text-[8px] mr-1 block mb-0.5 text-slate-400">XÁC LẬP MỤC TIÊU PHÒNG BAN:</span>
                                    "{ev.reason || 'Chưa định nghĩa mục tiêu chi tiết'}"
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>
        )}
                                  {/* TAB 2: CHẤM CÔNG HÀNG NGÀY */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            {/* Interactive Inner Navigation Segmented Controls */}
            <div className="flex items-center justify-center bg-slate-100 p-1 rounded-2xl max-w-sm mx-auto shadow-inner border border-slate-200">
              <button
                type="button"
                onClick={() => setAttendanceSubTab('daily')}
                className={`flex-1 py-1.5 px-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceSubTab === 'daily'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ⚡ Điểm danh ngày
              </button>
              <button
                type="button"
                onClick={() => setAttendanceSubTab('monthly')}
                className={`flex-1 py-1.5 px-3 text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  attendanceSubTab === 'monthly'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                📅 Bảng công tháng
              </button>
            </div>

            {/* CHẾ ĐỘ 1: ĐIỂM DANH HÀNG NGÀY */}
            {attendanceSubTab === 'daily' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 animate-fade-in">
                {/* Chấm công Button bên trái */}
                <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center text-center">
                  <span translate="no" className="notranslate text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    GIỜ HỆ THỐNG HIỆN TẠI
                  </span>
                  <span className="text-3xl font-black text-slate-800 font-mono tracking-tight leading-none mb-2">
                    {currentTime.toLocaleTimeString('vi-VN')}
                  </span>
                  <span translate="no" className="notranslate text-[9.5px] font-black text-slate-500 uppercase tracking-wide mb-4">
                    {formatDateString(currentTime)}
                  </span>

                  {/* 3 Work Modes Picker */}
                  <div className="mb-4 w-full max-w-xs">
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block text-center mb-1.5">
                      Hình thức điểm danh
                    </span>
                    <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-150 shadow-inner">
                      {(['Offline', 'Online', 'Công tác'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          disabled={(userCheckedIn && userCheckedOut) || isScanning}
                          onClick={() => setCheckInMode(mode)}
                          className={`py-1.5 px-0.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                            checkInMode === mode
                              ? 'bg-indigo-600 text-white shadow shadow-indigo-200'
                              : 'text-slate-555 hover:text-slate-855 hover:bg-white'
                          } disabled:opacity-50`}
                        >
                          {mode === 'Offline' && '🌐'}
                          {mode === 'Online' && '⚡'}
                          {mode === 'Công tác' && '🚗'}
                          <span className="ml-0.5">{mode}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fingerprint click simulation */}
                  <button
                    disabled={(userCheckedIn && userCheckedOut) || isScanning}
                    onClick={handleCreateCheckIn}
                    className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 outline-none transition-all shadow-lg active:scale-95 ${
                      (userCheckedIn && userCheckedOut)
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-600 font-bold'
                        : isScanning
                        ? 'bg-blue-50 border-blue-400 text-blue-500 animate-pulse font-bold'
                        : checkInMode === 'Offline'
                        ? 'bg-amber-50/70 border-amber-500/30 hover:border-amber-500 text-amber-600 hover:shadow-amber-500/10 font-bold'
                        : checkInMode === 'Công tác'
                        ? 'bg-purple-50/70 border-purple-500/30 hover:border-purple-500 text-purple-600 hover:shadow-purple-500/10 font-bold'
                        : 'bg-indigo-50/50 border-indigo-600/30 hover:border-indigo-600 text-indigo-600 hover:shadow-indigo-500/10 font-bold'
                    }`}
                  >
                    {/* Visual Radar Waves */}
                    {!(userCheckedIn && userCheckedOut) && (
                      <span className={`absolute inset-0 rounded-full border animate-ping opacity-60 ${
                        checkInMode === 'Offline' ? 'border-amber-500/30' : checkInMode === 'Công tác' ? 'border-purple-500/30' : 'border-indigo-500/30'
                      }`} />
                    )}
                    
                    {(userCheckedIn && userCheckedOut) ? (
                      <CheckCircle2 size={32} className="text-emerald-500 stroke-2" />
                    ) : (
                      <Clock size={32} className={`${isScanning ? 'animate-spin' : ''} stroke-[1.5]`} />
                    )}
                    <span translate="no" className="notranslate text-[8.5px] font-black uppercase mt-2 tracking-widest block">
                      {(userCheckedIn && userCheckedOut) 
                        ? 'ĐÃ CHỐM XONG' 
                        : isScanning 
                        ? 'ĐANG QUÉT...' 
                        : !userCheckedIn 
                        ? 'QUÉT GIỜ VÀO' 
                        : 'QUÉT GIỜ RA'}
                    </span>
                  </button>

                  <div className="mt-4 w-full max-w-xs bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-left space-y-1">
                    <span translate="no" className="notranslate text-[8.5px] font-black text-slate-400 uppercase block">Trạng thái định vị</span>
                    <div className="flex items-center gap-1.5 text-[9.5px] text-slate-700 font-black uppercase leading-tight">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                      <span translate="no" className="notranslate">VÙNG AN TOÀN - IP & GPS HUB ĐÚNG QUY ĐỊNH</span>
                    </div>
                  </div>

                  {checkInLog && (
                    <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-left w-full">
                      <span translate="no" className="notranslate text-[9px] font-black text-emerald-800 uppercase block mb-1">XÁC NHẬN GHI SỔ THÀNH CÔNG:</span>
                      <p className="text-[11px] text-slate-750 font-bold uppercase">Nhân viên: <span className="font-extrabold">{checkInLog.name}</span></p>
                      <p className="text-[11px] text-slate-750 font-bold uppercase mt-0.5">Giờ quét: <span className="font-extrabold text-indigo-600 font-mono text-[11px]">{checkInLog.time}</span> <span className="font-semibold text-[8px] text-slate-500">({checkInLog.direction === 'VÀO' ? 'GIỜ VÀO' : 'GIỜ RA'})</span></p>
                    </div>
                  )}
                </div>

                {/* Danh sách nhân viên ghi nhận có đi làm */}
                <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-3 pb-2 border-b border-slate-100 text-left">
                      <div>
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-widest block">
                          DANH SÁCH NHÂN VIÊN ĐIỂM DANH HÔM NAY
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block tracking-wide mt-0.5">
                          Tự động hiển thị chi tiết khi nhân sự định vị & khớp kiểm tra GPS
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={handleSaveDailyAttendance}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[9px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                          title="Chủ động lưu trữ danh sách điểm danh hàng ngày"
                        >
                          <Save size={10} className="stroke-[2.5]" />
                          LƯU ĐIỂM DANH
                        </button>
                        <span className="shrink-0 text-[9px] font-black text-indigo-700 bg-indigo-50 border border-indigo-120 px-2.5 py-1 rounded-lg uppercase tracking-wider text-right">
                          Sĩ số: {groupedRecords.length} NV ({attendanceRecords.length} lượt)
                        </span>
                      </div>
                    </div>

                    {groupedRecords.length === 0 ? (
                      <div className="py-12 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-6 text-slate-400">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-2">
                          <MapPin size={18} className="text-slate-400 animate-pulse" />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest block">Chưa có ai chấm công hôm nay</span>
                        <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Vui lòng dùng cổng chấm công ở bên trái để điểm danh ghi nhận ngay</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[420px] overflow-y-auto pr-1">
                        {groupedRecords.map((gRec) => {
                          return (
                            <div key={gRec.name} className="p-3 bg-slate-50/70 rounded-xl border border-slate-150/80 hover:border-indigo-200 hover:bg-white hover:shadow transition-all flex flex-col justify-between gap-2.5 text-left">
                              {/* Employee Information Header */}
                              <div className="flex items-center justify-between border-b border-slate-150 pb-1.5">
                                <span className="text-xs font-black text-slate-850 uppercase tracking-wide">{gRec.name}</span>
                                <span translate="no" className="notranslate text-[8.5px] font-black uppercase text-indigo-600 bg-indigo-50 border border-indigo-120 px-2 py-0.5 rounded">
                                  PHÒNG QLCL
                                </span>
                              </div>

                              {/* Dual columns: GIỜ VÀO vs GIỜ RA */}
                              <div className="grid grid-cols-2 gap-2">
                                {/* Check-In Column (VÀO) */}
                                <div className="p-2 bg-slate-50 border border-slate-120/60 rounded-lg flex flex-col justify-between min-h-[90px] space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider font-mono">GIỜ VÀO</span>
                                    {gRec.vao ? (
                                      <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                        gRec.vao.status === 'Đúng giờ' ? 'bg-emerald-555 text-emerald-800' : 'bg-rose-555 text-rose-800 animate-pulse'
                                      }`}>
                                        {gRec.vao.status}
                                      </span>
                                    ) : (
                                      <span className="text-[7.5px] font-extrabold text-slate-455 uppercase border border-dashed border-slate-300 px-1 py-0.2 rounded-full">VẰNG</span>
                                    )}
                                  </div>
                                  {gRec.vao ? (
                                    <div className="space-y-0.5 my-0.5">
                                      <span className="font-extrabold text-slate-755 font-mono text-[11px] block">{gRec.vao.time}</span>
                                      <span className="text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wide block truncate">{gRec.vao.location}</span>
                                      <span className="text-[8px] text-amber-700 font-black uppercase bg-amber-50 border border-amber-100/60 rounded px-1 py-0.2 select-none inline-block">{gRec.vao.mode}</span>
                                    </div>
                                  ) : (
                                    <p className="text-[8.5px] text-slate-400 italic font-bold my-0.5">Chưa quét vào</p>
                                  )}

                                  {/* Vao Actions */}
                                  {gRec.vao ? (
                                    <div className="flex items-center gap-1 border-t border-slate-150/40 pt-1 mt-0.5 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingAttendanceRecord(gRec.vao)}
                                        className="p-0.5 px-1 text-slate-555 hover:text-indigo-600 rounded hover:bg-slate-200 border border-slate-150 transition-all text-[7.5px] font-black uppercase flex items-center gap-0.5 cursor-pointer"
                                        title="Sửa giờ vào"
                                      >
                                        <Sliders size={7} /> SỬA
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteConfirm({
                                            type: 'attendance',
                                            id: gRec.vao.id,
                                            title: `XEM XÉT XÓA GIỜ VÀO CỦA ${gRec.name}`,
                                            subtitle: `Bản ghi quét: ${gRec.vao.time} • Quy cách: ${gRec.vao.mode}`
                                          });
                                        }}
                                        className="p-0.5 px-1 text-slate-555 hover:text-rose-600 rounded hover:bg-slate-200 border border-slate-150 transition-all text-[7.5px] font-black uppercase flex items-center gap-0.5 cursor-pointer"
                                        title="Xóa giờ vào"
                                      >
                                        <Trash2 size={7} /> XÓA
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="h-3" />
                                  )}
                                </div>

                                {/* Check-Out Column (RA) */}
                                <div className="p-2 bg-slate-50 border border-slate-120/60 rounded-lg flex flex-col justify-between min-h-[90px] space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider font-mono">GIỜ RA</span>
                                    {gRec.ra ? (
                                      <span className={`text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded-full ${
                                        gRec.ra.status === 'Đúng giờ' ? 'bg-emerald-555 text-emerald-800' : 'bg-rose-555 text-rose-800 animate-pulse'
                                      }`}>
                                        {gRec.ra.status}
                                      </span>
                                    ) : (
                                      <span className="text-[7.5px] font-extrabold text-slate-455 uppercase border border-dashed border-slate-300 px-1 py-0.2 rounded-full">VẰNG</span>
                                    )}
                                  </div>
                                  {gRec.ra ? (
                                    <div className="space-y-0.5 my-0.5">
                                      <span className="font-extrabold text-slate-755 font-mono text-[11px] block">{gRec.ra.time}</span>
                                      <span className="text-[7.5px] text-slate-500 font-extrabold uppercase tracking-wide block truncate">{gRec.ra.location}</span>
                                      <span className="text-[8px] text-emerald-800 font-black uppercase bg-emerald-50 border border-emerald-100/60 rounded px-1 py-0.2 select-none inline-block">{gRec.ra.mode}</span>
                                    </div>
                                  ) : (
                                    <p className="text-[8.5px] text-slate-400 italic font-bold my-0.5">Chưa quét ra</p>
                                  )}

                                  {/* Ra Actions */}
                                  {gRec.ra ? (
                                    <div className="flex items-center gap-1 border-t border-slate-150/40 pt-1 mt-0.5 justify-end">
                                      <button
                                        type="button"
                                        onClick={() => setEditingAttendanceRecord(gRec.ra)}
                                        className="p-0.5 px-1 text-slate-555 hover:text-indigo-600 rounded hover:bg-slate-200 border border-slate-150 transition-all text-[7.5px] font-black uppercase flex items-center gap-0.5 cursor-pointer"
                                        title="Sửa giờ ra"
                                      >
                                        <Sliders size={7} /> SỬA
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDeleteConfirm({
                                            type: 'attendance',
                                            id: gRec.ra.id,
                                            title: `XEM XÉT XÓA GIỜ RA CỦA ${gRec.name}`,
                                            subtitle: `Bản ghi quét: ${gRec.ra.time} • Quy cách: ${gRec.ra.mode}`
                                          });
                                        }}
                                        className="p-0.5 px-1 text-slate-555 hover:text-rose-600 rounded hover:bg-slate-200 border border-slate-150 transition-all text-[7.5px] font-black uppercase flex items-center gap-0.5 cursor-pointer"
                                        title="Xóa giờ ra"
                                      >
                                        <Trash2 size={7} /> XÓA
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="h-3" />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* CHẾ ĐỘ 2: BẢNG CHẤM CÔNG THÁNG */}
            {attendanceSubTab === 'monthly' && (
              <div className="space-y-4 animate-fade-in">
                <style>{`
                  @keyframes blink-col {
                    0%, 100% { background-color: rgba(239, 68, 68, 0.12); }
                    50% { background-color: rgba(239, 68, 68, 0.02); }
                  }
                  .animate-blink-column {
                    animation: blink-col 2.5s infinite ease-in-out;
                  }
                `}</style>
                {/* Bảng cấu hình & Thống kê thông minh */}
                <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2 border-slate-150 mb-3 text-left">
                    <div className="flex items-center gap-2">
                      <Sliders className="text-indigo-600 animate-pulse" size={16} />
                      <span translate="no" className="notranslate text-[10px] font-black text-slate-800 uppercase tracking-widest">
                        THIẾT LẬP BẢNG CHẤM CÔNG THÁNG
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSaveMonthlyAttendance}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[9.5px] font-black text-white uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                        title="Lưu trữ và ghi nhận toàn bộ chỉnh sửa trên bảng chấm công học phần"
                      >
                        <Save size={10} strokeWidth={2.5} />
                        Lưu bảng công
                      </button>
                      <button
                        type="button"
                        onClick={handleResetToSystemDefaults}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-150 hover:border-rose-250 rounded-xl text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase transition-all shadow-sm active:scale-95 cursor-pointer"
                        title="Phục hồi bảng chấm công về cấu hình mặc định gốc và xóa dữ liệu chỉnh tay"
                      >
                        <RotateCcw size={10} strokeWidth={2.5} />
                        Đặt lại mặc định
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Chọn tháng */}
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Chọn tháng chấm công</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full text-xs h-9 px-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white font-extrabold text-slate-800 uppercase"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>Tháng {m}</option>
                        ))}
                      </select>
                    </div>

                    {/* Chọn năm */}
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Chọn năm</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full text-xs h-9 px-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white font-extrabold text-slate-800 uppercase"
                      >
                        <option value={2025}>Năm 2025</option>
                        <option value={2026}>Năm 2026</option>
                        <option value={2027}>Năm 2027</option>
                      </select>
                    </div>

                    {/* Số công chuẩn */}
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Số công chuẩn tháng</label>
                      <input 
                        type="number"
                        min="20"
                        max="27"
                        value={standardDays}
                        onChange={(e) => setStandardDays(Number(e.target.value))}
                        className="w-full text-xs h-9 px-2.5 border border-slate-200 rounded-xl focus:outline-none bg-white font-extrabold text-slate-800 uppercase"
                      />
                    </div>

                    {/* Có làm thứ bảy */}
                    <div className="space-y-1 text-left flex flex-col justify-between">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Lịch làm thứ bảy</label>
                      <button
                        type="button"
                        onClick={() => setHasSaturdayWork(!hasSaturdayWork)}
                        className="relative w-full h-9 rounded-xl p-1 transition-all duration-300 flex items-center justify-between bg-slate-100 border border-slate-200 cursor-pointer select-none"
                      >
                        {/* Slide Indicator */}
                        <div
                          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg bg-white shadow-md border border-slate-200/30 transition-all duration-300 ${
                            hasSaturdayWork ? 'left-[calc(50%+2px)]' : 'left-[2px]'
                          }`}
                        />
                        
                        {/* Labels */}
                        <span className={`relative z-10 text-[9px] font-black uppercase w-1/2 text-center transition-colors duration-300 ${
                          !hasSaturdayWork ? 'text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-650'
                        }`}>
                          Nghỉ T7
                        </span>
                        <span className={`relative z-10 text-[9px] font-black uppercase w-1/2 text-center transition-colors duration-300 ${
                          hasSaturdayWork ? 'text-indigo-650 font-black' : 'text-slate-400 hover:text-slate-650'
                        }`}>
                          Làm T7
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

            {/* BẢNG CHẤM CÔNG CHUYÊN NGHIỆP TRỰC TIẾP */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm overflow-hidden relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 mb-4 gap-2 text-left">
                <div>
                  <span translate="no" className="notranslate text-sm font-black text-slate-800 uppercase tracking-widest block">
                    BẢNG CHẤM CÔNG ĐIỆN TỬ - THÁNG {selectedMonth}/{selectedYear}
                  </span>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Click vào bất kỳ ô ngày làm việc để gán ký hiệu phép / lễ biệt phái cho nhân sự
                  </div>
                </div>

                {/* Print and Add employee options */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintTimesheet}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-[10px] font-black text-white hover:shadow-md border border-indigo-500 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Printer size={12} strokeWidth={2.5} />
                    In bảng chấm công nộp HRD
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddEmpForm(!showAddEmpForm)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-black text-indigo-600 bg-indigo-50 hover:bg-indigo-100/70 border border-indigo-150 rounded-xl uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Plus size={11} strokeWidth={3} />
                    {showAddEmpForm ? 'Đóng form' : 'Thêm nhân viên'}
                  </button>
                </div>
              </div>

              {showAddEmpForm && (
                <div className="mb-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left max-w-xl animate-fade-in space-y-4">
                  <span className="text-[11px] font-black text-slate-700 uppercase block border-b pb-1">
                    Khai báo thêm nhân viên mới vào bộ phận
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Mã nhân viên</label>
                      <input 
                        type="text" 
                        value={newEmpCode}
                        onChange={e => setNewEmpCode(e.target.value)}
                        placeholder="Ví dụ: D12.00999"
                        className="w-full text-xs h-8 px-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Họ và tên nhân viên</label>
                      <input 
                        type="text" 
                        value={newEmpName}
                        onChange={e => setNewEmpName(e.target.value)}
                        placeholder="Ví dụ: Trần Văn C"
                        className="w-full text-xs h-8 px-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase">Chức danh / Vị trí</label>
                      <input 
                        type="text" 
                        value={newEmpRole}
                        onChange={e => setNewEmpRole(e.target.value)}
                        placeholder="Ví dụ: Kiểm soát viên"
                        className="w-full text-xs h-8 px-2 border border-slate-200 rounded-lg focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (!newEmpName) return;
                        const id = String(activeQLCLEmployees.length + 1);
                        const code = newEmpCode || `D12.${String(Math.floor(Math.random() * 90000 + 10000))}`;
                        const record = { id, code, name: newEmpName, role: newEmpRole, dept: 'PQLCL' };
                        setCustomEmployees([...customEmployees, record]);
                        setNewEmpName('');
                        setNewEmpCode('');
                        setShowAddEmpForm(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-wide rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Khai báo & Nạp danh mục
                    </button>
                  </div>
                </div>
              )}

              {/* HORIZONTAL SCROLLABLE TIMESHEET GRID */}
              <div className="overflow-x-auto border border-slate-200/60 rounded-2xl">
                <table className="w-full border-collapse text-left font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase border-b border-slate-200">
                      <th className="p-2 border-r border-slate-200 text-center w-8">STT</th>
                      <th className="p-2 border-r border-slate-200 min-w-[70px]">Mã NV</th>
                      <th className="p-2 border-r border-slate-200 min-w-[130px]">Tên nhân viên</th>
                      <th className="p-2 border-r border-slate-200 min-w-[90px]">Chức danh</th>
                      <th className="p-2 border-r border-slate-200 text-center w-14">Bộ phận</th>
                      {/* Generates calendar day number columns */}
                      {Array.from({ length: new Date(selectedYear, selectedMonth, 0).getDate() }, (_, i) => i + 1).map(d => {
                        const det = getDayDetails(d, selectedMonth, selectedYear);
                        const isSunday = det.dayOfWeek === 0;
                        const dow = getVietnameseDayLabel(det.dayOfWeek);
                        const isToday = selectedYear === currentTime.getFullYear() && selectedMonth === (currentTime.getMonth() + 1) && d === currentTime.getDate();
                        return (
                          <th 
                            key={d} 
                            style={{ width: '32px', minWidth: '32px' }}
                            className={`p-1 text-center text-[9px] font-black uppercase border-r border-slate-200 relative ${
                              isToday 
                                ? 'bg-red-50 text-red-600 border-x-2 border-red-300 animate-blink-column' 
                                : isSunday 
                                ? 'bg-rose-50 text-rose-600' 
                                : det.isHoliday 
                                ? 'bg-rose-100 text-rose-700' 
                                : ''
                            }`}
                            title={det.isHoliday ? det.holidayName : `Ngày ${d}`}
                          >
                            <div className={isToday ? 'text-red-600 font-extrabold text-[11px]' : isSunday || det.isHoliday ? 'text-rose-600 font-extrabold' : 'text-slate-800'}>{String(d).padStart(2, '0')}</div>
                            <div className={`text-[7.5px] font-black mt-0.5 ${isToday ? 'text-red-500 font-black' : isSunday || det.isHoliday ? 'text-rose-500' : 'text-slate-400'}`}>{dow}</div>
                          </th>
                        );
                      })}
                      
                      {/* STATS HEADERS */}
                      <th className="p-2 border-r border-slate-200 text-center min-w-[45px] bg-slate-50 text-indigo-700">T.Giờ</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[45px] bg-slate-50">T.Công</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[35px] text-indigo-600">Phép</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[35px] text-purple-600">CĐ</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[35px] text-red-600">Lễ</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[35px] text-orange-600">Ngừng</th>
                      <th className="p-2 border-r border-slate-200 text-center min-w-[50px] bg-emerald-50 text-emerald-800" title="Bảo lưu cơm trưa thu hồi">Lại cơm</th>
                      <th className="p-2 text-center min-w-[35px] text-slate-500">Chuẩn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQLCLEmployees.map((emp, idx) => {
                      const metrics = calculateMetrics(emp.id);
                      const empLogs = monthAttendance[emp.id] || {};
                      const totalDaysCount = new Date(selectedYear, selectedMonth, 0).getDate();
                      
                      return (
                        <tr key={emp.id} className="border-b border-slate-100 hover:bg-slate-50/20 text-xs text-slate-800 font-bold transition-colors">
                          <td className="p-2 border-r border-slate-100 text-center text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-2 border-r border-slate-100 font-black">{emp.code}</td>
                          <td className="p-2 border-r border-slate-100 font-black text-slate-900 whitespace-nowrap">{emp.name}</td>
                          <td className="p-2 border-r border-slate-100 text-slate-500 text-[11px] whitespace-nowrap">{emp.role}</td>
                          <td className="p-2 border-r border-slate-100 text-center text-slate-500 uppercase font-mono">{emp.dept}</td>
                          
                          {/* Calendar Cells */}
                          {Array.from({ length: totalDaysCount }, (_, i) => i + 1).map(d => {
                            const det = getDayDetails(d, selectedMonth, selectedYear);
                            const isSunday = det.dayOfWeek === 0;
                            const isToday = selectedYear === currentTime.getFullYear() && selectedMonth === (currentTime.getMonth() + 1) && d === currentTime.getDate();
                            const isFuture = (() => {
                              const cellMidnight = new Date(selectedYear, selectedMonth - 1, d);
                              const todayMidnight = new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
                              return cellMidnight.getTime() > todayMidnight.getTime();
                            })();
                            const status = empLogs[d] !== undefined ? empLogs[d] : '';
                            const isEditing = editingCell?.empId === emp.id && editingCell?.day === d;
                            
                            let cellBg = '';
                            if (isFuture) cellBg = 'bg-slate-50/50 opacity-40 cursor-not-allowed';
                            else if (isToday) cellBg = 'bg-red-50/15 border-x border-red-205 animate-blink-column';
                            else if (isSunday) cellBg = 'bg-amber-50/30';
                            else if (det.isHoliday) cellBg = 'bg-red-50/30';

                            let letterColor = 'text-slate-800 font-medium';
                            if (status === 'P') letterColor = 'text-amber-600 font-medium bg-amber-50 border border-amber-100/50 rounded px-1';
                            else if (status === '1/2P') letterColor = 'text-amber-600 font-medium bg-amber-50 border border-amber-100/50 rounded px-1';
                            else if (status === 'L') letterColor = 'text-red-600 font-medium bg-red-100 border border-red-200 rounded px-1';
                            else if (status === 'CD') letterColor = 'text-purple-600 font-medium bg-purple-50 border border-purple-100 rounded px-1';
                            else if (status === 'O') letterColor = 'text-pink-600 font-medium bg-pink-50 border border-pink-100 rounded px-1';
                            else if (status === 'NV') letterColor = 'text-orange-600 font-medium bg-orange-50 border border-orange-100 rounded px-1';
                            else if (status === 'OFF') letterColor = 'text-slate-350 font-normal';

                            return (
                              <td 
                                key={d} 
                                className={`p-1 border-r border-slate-100 text-center font-medium relative select-none ${isFuture ? 'cursor-not-allowed' : 'hover:bg-indigo-50/20 cursor-pointer'} ${cellBg}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isFuture) return; // Không được tự chấm công ngày chưa tới
                                  if (isEditing) {
                                    setEditingCell(null);
                                  } else {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setEditingCell({
                                      empId: emp.id,
                                      day: d,
                                      coords: {
                                        top: rect.top,
                                        left: rect.left,
                                        width: rect.width,
                                        height: rect.height
                                      }
                                    });
                                  }
                                }}
                              >
                                <span className={letterColor}>{status === 'OFF' ? '' : status}</span>
                                
                                {/* Fixed Popover Dropdown menu - escapes boundary clipping and supports top/bottom autopoly */}
                                {isEditing && (() => {
                                  const isLowerHalf = (editingCell?.coords?.top || 0) > (window.innerHeight * 0.58);
                                  return (
                                    <div 
                                      id="attendance-popover"
                                      className="fixed bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 flex flex-col gap-1 min-w-[145px] text-left text-slate-800"
                                      style={{
                                        top: isLowerHalf ? 'auto' : (editingCell?.coords?.top || 0) + (editingCell?.coords?.height || 0) + 6,
                                        bottom: isLowerHalf ? window.innerHeight - (editingCell?.coords?.top || 0) + 6 : 'auto',
                                        left: (editingCell?.coords?.left || 0) + (editingCell?.coords?.width || 0) / 2,
                                        transform: 'translateX(-50%)',
                                        zIndex: 99999
                                      }}
                                    >
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block border-b pb-0.5 mb-1">
                                        Ký hiệu ngày {d}:
                                      </span>
                                      {[
                                        { val: '8', label: '8: Công (8 giờ)' },
                                        { val: 'P', label: 'P: Nghỉ phép năm' },
                                        { val: '1/2P', label: '1/2P: Nửa phép' },
                                        { val: 'L', label: 'L: Nghỉ Lễ/Tết' },
                                        { val: 'CD', label: 'CD: Nghỉ Chế độ' },
                                        { val: 'O', label: 'O: Con ốm' },
                                        { val: 'NV', label: 'NV: Ngừng việc' },
                                        { val: 'OFF', label: 'OFF: Không làm' },
                                      ].map(opt => (
                                        <button
                                          key={opt.val}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setManualEdits(prev => ({
                                              ...prev,
                                              [`${emp.id}-${selectedYear}-${selectedMonth}-${d}`]: opt.val
                                            }));
                                            setMonthAttendance(prev => ({
                                              ...prev,
                                              [emp.id]: {
                                                ...prev[emp.id],
                                                [d]: opt.val
                                              }
                                            }));
                                            setEditingCell(null);
                                          }}
                                          className="w-full text-left px-2 py-1.5 hover:bg-slate-50 text-[10px] font-extrabold text-slate-700 uppercase rounded-lg transition-colors cursor-pointer"
                                        >
                                          {opt.label}
                                        </button>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const key = `${emp.id}-${selectedYear}-${selectedMonth}-${d}`;
                                          setManualEdits(prev => {
                                            const next = { ...prev };
                                            delete next[key];
                                            return next;
                                          });
                                          setEditingCell(null);
                                        }}
                                        className="w-full text-left px-2 py-1.5 hover:bg-rose-50 text-[10px] font-extrabold text-rose-600 uppercase rounded-lg transition-colors border-t border-slate-100 mt-1 pt-1.5 cursor-pointer"
                                      >
                                        ↻ Khôi phục mặc định
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingCell(null);
                                        }}
                                        className="text-center font-black uppercase text-[8.5px] mt-1 pt-1 border-t border-slate-100 text-slate-400 block w-full cursor-pointer"
                                      >
                                        Đóng cửa sổ
                                      </button>
                                    </div>
                                  );
                                })()}
                              </td>
                            );
                          })}

                          {/* RESULTS SUMMARIES */}
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black bg-slate-50 text-indigo-700">{metrics.totalHours.toFixed(1)}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black bg-slate-50">{metrics.rawDays.toFixed(1)}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black text-indigo-600">{metrics.pCount > 0 ? metrics.pCount : '-'}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black text-purple-600">{metrics.cdCount > 0 ? metrics.cdCount : '-'}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black text-red-600">{metrics.lCount > 0 ? metrics.lCount : '-'}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black text-orange-600">{metrics.nvCount > 0 ? metrics.nvCount : '-'}</td>
                          <td className="p-2 border-r border-slate-100 text-center font-mono font-black text-slate-400 bg-slate-50/20">-</td>
                          <td className="p-2 text-center font-mono font-black text-slate-500">{standardDays}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legends guide explaining cells abbreviation symbols */}
              <div className="mt-5 p-4.5 bg-slate-50 rounded-2xl border border-slate-200/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 text-left">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                    Định nghĩa ký hiệu chấm công quy định:
                  </span>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-600 font-bold">
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-slate-200 text-slate-800 font-black rounded text-[9.5px]">8</span> Công hành chính (8 giờ)</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-amber-150 text-amber-700 font-black rounded text-[9.5px]">P</span> Nghỉ phép năm có lương</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-amber-150 text-amber-700 font-black rounded text-[9.5px]">1/2P</span> Nghỉ phép nửa ngày</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-red-150 text-red-700 font-black rounded text-[9.5px]">L</span> Nghỉ lễ (như 30/4, 1/5, tết)</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-purple-150 text-purple-700 font-black rounded text-[9.5px]">CD</span> Nghỉ chế độ / Thai sản / Ốm</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 font-black rounded text-[9.5px] border border-pink-200">O</span> Con ốm</div>
                    <div className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 bg-orange-150 text-orange-700 font-black rounded text-[9.5px]">NV</span> Ngừng việc / Không lương</div>
                  </div>
                </div>
                
                {/* Save data and signature checkouts */}
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">
                    Hệ thống dữ liệu số:
                  </span>
                  <span className="text-xs text-slate-700 font-black uppercase tracking-wide block mt-0.5">
                    Xác minh bởi Phòng QLCL Tân Phú
                  </span>
                </div>
              </div>

              {/* PHÂN KHU XÁC NHẬN CỦA CÁC THÀNH VIÊN P.QLCL - THEO KHẢO SÁT CHỮ KÝ CHẤM CÔNG */}
              <div className="bg-slate-50 border border-slate-200 p-5 mt-6 rounded-2xl print:border print:bg-white print:rounded-none">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 text-left">
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={13} strokeWidth={2.5} className="text-[#004b87]" />
                      XÁC NHẬN CỦA CÁC THÀNH VIÊN BẢNG CHẤM CÔNG THÁNG {selectedMonth}/{selectedYear}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Bộ phận QLCL đối soát, thống nhất và ký tá điện tử chỉ số ngày công trước khi trưởng phòng phê duyệt chuyển HCNS</p>
                  </div>
                  {effectiveUser && (
                    <div className="flex items-center gap-2 print:hidden no-print">
                      {timesheetAcknowledgements[`${selectedMonth}-${selectedYear}-${activeQLCLEmployees.find(emp => emp.name.toLowerCase() === effectiveUser.name.toLowerCase())?.id}`]?.confirmed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase shadow-sm">
                          <Check size={12} strokeWidth={4} /> Bạn đã xác nhận công tháng {selectedMonth}/{selectedYear}
                        </span>
                      ) : activeQLCLEmployees.some(emp => emp.name.toLowerCase() === effectiveUser.name.toLowerCase()) ? (
                        <button
                          type="button"
                          onClick={() => {
                            const matchedEmp = activeQLCLEmployees.find(emp => emp.name.toLowerCase() === effectiveUser.name.toLowerCase());
                            if (matchedEmp) {
                              setTimesheetAcknowledgements(prev => ({
                                ...prev,
                                [`${selectedMonth}-${selectedYear}-${matchedEmp.id}`]: {
                                  confirmed: true,
                                  confirmedAt: new Date().toISOString()
                                }
                              }));
                            }
                          }}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-wider shadow-md cursor-pointer active:scale-95 transition-all text-center"
                        >
                          Xác nhận bảng công của tôi
                        </button>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {activeQLCLEmployees.map(emp => {
                    const ack = timesheetAcknowledgements[`${selectedMonth}-${selectedYear}-${emp.id}`];
                    return (
                      <div 
                        key={emp.id} 
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                          ack?.confirmed
                            ? 'bg-emerald-50/50 border-emerald-200' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs uppercase shrink-0 ${
                          ack?.confirmed 
                            ? 'bg-emerald-600 text-white shadow-sm' 
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {emp.name.slice(0, 1)}
                        </div>
                        <div className="overflow-hidden min-w-0 flex-1">
                          <p className="text-[11px] font-extrabold text-slate-800 truncate leading-tight">{emp.name}</p>
                          <p className="text-[9px] text-slate-400 font-bold leading-none truncate mt-0.5">{emp.role}</p>
                          <div className="mt-1 flex items-center gap-1">
                            {ack?.confirmed ? (
                              <span className="inline-flex items-center text-[9px] text-emerald-750 font-black gap-0.5 leading-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                                Ký nhận: {(() => {
                                  const d = new Date(ack.confirmedAt);
                                  const dayStr = String(d.getDate()).padStart(2, '0');
                                  const monthStr = String(d.getMonth() + 1).padStart(2, '0');
                                  const yearStr = String(d.getFullYear()).slice(-2);
                                  const hoursStr = String(d.getHours()).padStart(2, '0');
                                  const minsStr = String(d.getMinutes()).padStart(2, '0');
                                  return `${dayStr}/${monthStr}/${yearStr} ${hoursStr}:${minsStr}`;
                                })()}
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[9px] text-slate-400 font-bold gap-0.5 leading-none">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                Chờ đối soát công
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
          </div>
        )}

        {/* TAB 3: ĐƠN XIN NGHỈ PHÉP */}
        {activeTab === 'leave_request' && (
          <div className="space-y-6">
            {/* BẢNG THEO DÕI PHÉP NĂM 2026 */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b pb-4 border-slate-100 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-105 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="text-blue-600" size={18} />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm uppercase">
                      BẢNG THEO DÕI QUỸ PHÉP NĂM 2026 - PHÒNG QLCL
                    </h4>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-0.5">
                      Đồng bộ tự động từ đơn phép được phê duyệt của phòng • Hỗ trợ quản lý điều chỉnh trực tiếp
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap justify-end shrink-0">
                  <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-full uppercase tracking-wider">
                    Hạn dùng phép cũ dồn toa: ĐƯỢC KÉO DÀI ĐẾN 30/06/2026
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveLeaveAllowances}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer animate-none"
                    title="Lưu trữ vĩnh viễn quỹ phép năm đã điều chỉnh để không bị mất khi tải lại trang"
                  >
                    <Save size={12} className="stroke-[2.5]" />
                    Lưu & Đồng bộ quỹ phép
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-500 font-black uppercase text-[10px]">
                      <th className="p-3.5 text-center w-12">STT</th>
                      <th className="p-3.5 text-center w-24">Mã NV</th>
                      <th className="p-3.5">Họ Tên Nhân Viên</th>
                      <th className="p-3.5 w-36">Chức Danh</th>
                      <th className="p-3.5 text-center w-36 text-slate-800">Phép Tiêu Chuẩn 2026</th>
                      <th className="p-3.5 text-center w-36 text-slate-800">Phép Thâm Niên / Thưởng</th>
                      <th className="p-3.5 text-center w-36 text-slate-500">Phép Cũ Chuyển Sang</th>
                      <th className="p-3.5 text-center w-28 bg-blue-50/50 text-blue-700 font-black">Tổng Quỹ 2026</th>
                      <th className="p-3.5 text-center w-24 bg-red-50/30 text-rose-750 font-black">Đã Nghỉ</th>
                      <th className="p-3.5 text-center w-24 bg-emerald-50/30 text-emerald-800 font-black">Còn Lại</th>
                      <th className="p-3.5 text-center w-32">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQLCLEmployees.map((emp, index) => {
                      const allowance = leaveAllowances[emp.id] || { standard: 12, seniority: 0, prevYearCarry: 0 };
                      
                      // Calculate used days dynamically from both Approved Requests AND Attendance Sheet (including months 1-4/2026 and manual edits)
                      const usedDays = calculateTotalAnnualLeaveTaken(emp.id, emp.name, 2026);

                      const totalPool = allowance.standard + allowance.seniority + allowance.prevYearCarry;
                      const remainingDays = Math.max(0, totalPool - usedDays);

                      let statusText = 'Ổn định / Đủ';
                      let statusClass = 'bg-emerald-100 text-emerald-700';
                      if (remainingDays <= 0) {
                        statusText = 'Hết Phép';
                        statusClass = 'bg-rose-100 text-rose-700 font-black animate-pulse';
                      } else if (remainingDays < 4) {
                        statusText = 'Sắp hết phép';
                        statusClass = 'bg-amber-100 text-amber-700';
                      }

                      return (
                        <tr key={emp.id} className="border-b border-slate-105 hover:bg-slate-50/50 transition-all font-semibold">
                          <td className="p-3 text-center font-bold text-slate-400">{index + 1}</td>
                          <td className="p-3 text-center font-mono font-bold text-slate-500">{emp.code}</td>
                          <td className="p-3 font-extrabold text-slate-900">{emp.name}</td>
                          <td className="p-3 text-slate-500 text-[11px] font-bold">{emp.role}</td>
                          
                          {/* Phép Tiêu Chuẩn 2026 Direct Input */}
                          <td className="p-2 text-center text-slate-800">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              step="1"
                              value={allowance.standard}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value));
                                setLeaveAllowances(prev => ({
                                  ...prev,
                                  [emp.id]: { ...allowance, standard: val }
                                }));
                              }}
                              className="w-16 h-8 text-center bg-slate-50/80 font-mono font-black border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </td>

                          {/* Phép Thâm Niên / Thưởng Direct Input */}
                          <td className="p-2 text-center text-slate-800">
                            <input
                              type="number"
                              min="0"
                              max="10"
                              step="0.5"
                              value={allowance.seniority}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value));
                                setLeaveAllowances(prev => ({
                                  ...prev,
                                  [emp.id]: { ...allowance, seniority: val }
                                }));
                              }}
                              className="w-16 h-8 text-center bg-slate-50/80 font-mono font-black border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </td>

                          {/* Phép Cũ Chuyển Sang Direct Input */}
                          <td className="p-2 text-center text-slate-800">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.5"
                              value={allowance.prevYearCarry}
                              onChange={e => {
                                const val = Math.max(0, Number(e.target.value));
                                setLeaveAllowances(prev => ({
                                  ...prev,
                                  [emp.id]: { ...allowance, prevYearCarry: val }
                                }));
                              }}
                              className="w-16 h-8 text-center bg-slate-50/80 font-mono font-black border border-slate-205 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                            />
                          </td>

                          {/* Tổng Quỹ */}
                          <td className="p-3 text-center font-mono font-black bg-blue-50/30 text-blue-700 text-xs.5">
                            {totalPool.toFixed(1)}
                          </td>

                          {/* Đã Nghỉ */}
                          <td className="p-3 text-center font-mono font-black bg-red-50/10 text-rose-700">
                            {usedDays > 0 ? usedDays.toFixed(1) : '-'}
                          </td>

                          {/* Còn Lại */}
                          <td className="p-3 text-center font-mono font-black bg-emerald-50/10 text-emerald-800 text-xs.5">
                            {remainingDays.toFixed(1)}
                          </td>

                          {/* Trạng Thái Badge */}
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${statusClass}`}>
                              {statusText}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MAIN FORMS GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form tạo đơn xin nghỉ */}
              <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <span translate="no" className="notranslate text-sm font-black text-slate-800 uppercase tracking-widest block mb-4 border-b pb-3 border-gray-100">
                  Khai báo đơn xin nghỉ phép mới
                </span>

                <form onSubmit={handleAddLeaveSubmit} className="space-y-4 text-slate-700">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Loại hình nghỉ phép</label>
                    <select
                      value={leaveType}
                      onChange={e => setLeaveType(e.target.value)}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    >
                      <option value="Nghỉ phép năm">Nghỉ phép năm (Trừ quỹ phép)</option>
                      <option value="Nghỉ ốm">Nghỉ ốm đau / Điều trị y tế</option>
                      <option value="Nghỉ việc riêng">Nghỉ việc riêng (Không hưởng lương)</option>
                      <option value="Nghỉ thai sản / Đặc biệt">Nghỉ chế độ thai sản / Đặc biệt</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Từ ngày</label>
                      <input
                        type="date"
                        value={leaveStart}
                        onChange={e => setLeaveStart(e.target.value)}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Đến ngày</label>
                      <input
                        type="date"
                        value={leaveEnd}
                        onChange={e => setLeaveEnd(e.target.value)}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tổng số ngày nghỉ</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={leaveDays}
                      onChange={e => setLeaveDays(Number(e.target.value))}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Lý do xin nghỉ cụ thể</label>
                    <textarea
                      rows={3}
                      placeholder="Vui lòng nhập lý do rõ ràng cụ thể để phê duyệt nhanh chóng..."
                      required
                      value={leaveReason}
                      onChange={e => setLeaveReason(e.target.value)}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600 bg-white font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Send size={14} className="stroke-2" />
                    <span translate="no" className="notranslate">GỬI YÊU CẦU DUYỆT</span>
                  </button>
                </form>

                <div className="mt-6 pt-5 border-t border-slate-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <span translate="no" className="notranslate text-xs font-black text-slate-800 uppercase tracking-wider block">
                      TỔNG HỢP PHÉP TRONG THÁNG
                    </span>
                    {/* Month / Year Selectors */}
                    <div className="flex items-center gap-1.5">
                      <select
                        id="summary-month-select"
                        value={summaryMonth}
                        onChange={e => setSummaryMonth(Number(e.target.value))}
                        className="text-[11px] font-black uppercase text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                          <option key={m} value={m}>Tháng {m}</option>
                        ))}
                      </select>
                      <select
                        id="summary-year-select"
                        value={summaryYear}
                        onChange={e => setSummaryYear(Number(e.target.value))}
                        className="text-[11px] font-black uppercase text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                      >
                        <option value={2026}>2026</option>
                      </select>
                    </div>
                  </div>

                  {/* Summary List */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 text-[9px] font-black uppercase text-slate-400 tracking-wider pb-1 border-b border-dashed border-slate-100">
                      <div>Tên nhân viên</div>
                      <div className="text-right">Tổng ngày nghỉ</div>
                    </div>
                    {activeQLCLEmployees.map(emp => {
                      const takenDays = calculateMonthlyLeaveTaken(emp.id, emp.name, summaryYear, summaryMonth);
                      return (
                        <div key={emp.id} className="grid grid-cols-2 items-center py-1 border-b border-slate-50 text-[11px]">
                          <div translate="no" className="notranslate font-extrabold text-slate-850 truncate max-w-[170px]" title={emp.name}>{emp.name}</div>
                          <div className="text-right font-mono font-black text-slate-900 bg-slate-50/50 rounded px-2 py-0.5 inline-block ml-auto min-w-[32px]">
                            {takenDays > 0 ? (
                              <span className="text-rose-600">{takenDays.toFixed(1)} ngày</span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Danh sách sổ đơn từ bên phải */}
              <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b pb-3 border-gray-100">
                  <span translate="no" className="notranslate text-sm font-black text-slate-800 uppercase tracking-widest block font-sans">
                    Theo dõi tình trạng đơn xin nghỉ phép của phòng
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveAndSyncLeaveRequests}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-md active:scale-95 cursor-pointer animate-none"
                    title="Chủ động lưu trữ và đồng bộ toàn bộ đơn xin phép đã chọn sang bảng chấm công tháng"
                  >
                    <Save size={12} className="stroke-[2.5]" />
                    Lưu & Đồng bộ chủ động
                  </button>
                </div>

                <div className="space-y-6 max-h-[640px] overflow-y-auto pr-2">
                  {sortedMonthKeys.map((monthKey) => {
                    const requestsInMonth = groupedLeaveRequests[monthKey];
                    if (!requestsInMonth || requestsInMonth.length === 0) return null;
                    return (
                      <div key={monthKey} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 pt-1">
                          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100/50">
                            {monthKey}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            ({requestsInMonth.length} đơn)
                          </span>
                        </div>
                        <div className="space-y-3">
                          {requestsInMonth.map((req) => (
                            <div key={req.id} className="p-4 border border-slate-100 rounded-2xl bg-white hover:border-blue-200 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex gap-3.5 items-start">
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                                  <FileText className="text-slate-500" size={18} />
                                </div>
                                <div>
                                  <span translate="no" className="notranslate text-xs font-black text-slate-900 uppercase">
                                    {req.name} • {req.type} ({req.days} ngày)
                                  </span>
                                  <p translate="no" className="notranslate text-[10.5px] text-slate-600 font-medium uppercase tracking-tight mt-1">
                                    Lý do: {req.reason}
                                  </p>
                                  <p className="text-[9.5px] text-slate-400 font-bold uppercase mt-1">
                                    Thời gian nghỉ: từ {formatDateVN(req.startDate)} đến {formatDateVN(req.endDate)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span translate="no" className={`notranslate text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                  req.status === 'Đã duyệt' ? 'bg-emerald-500 text-white' : req.status === 'Từ chối' ? 'bg-slate-400 text-white' : 'bg-orange-400 text-white animate-pulse'
                                }`}>
                                  {req.status}
                                </span>
                                
                                {req.status === 'Đang phê duyệt' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLeaveRequests(prev => prev.map(item => item.id === req.id ? { ...item, status: 'Đã duyệt' } : item));
                                    }}
                                    className="px-2.5 py-1.5 text-[8.5px] font-black text-white bg-emerald-600 hover:bg-emerald-700 hover:shadow shadow-emerald-200 rounded-lg uppercase tracking-wider transition-all active:scale-90 cursor-pointer animate-none"
                                  >
                                    Phê Duyệt
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingLeave(req);
                                  }}
                                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-blue-50 border border-slate-200 text-slate-500 hover:text-blue-600 rounded-lg font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  title="Sửa đơn xin nghỉ"
                                >
                                  <Sliders size={11} /> Sửa
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteConfirm({
                                      type: 'leave',
                                      id: req.id,
                                      title: `Xóa vĩnh viễn đơn nghỉ phép của ${req.name}`,
                                      subtitle: `Đơn nghỉ: ${req.type} từ ngày ${formatDateVN(req.startDate)} đến ${formatDateVN(req.endDate)} (${req.days} ngày phép)`
                                    });
                                  }}
                                  className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded-lg font-black uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  title="Xóa đơn xin nghỉ"
                                >
                                  <Trash2 size={11} /> Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                  {leaveRequests.length === 0 && (
                    <div className="p-8 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                      <p className="text-xs text-slate-400 font-bold uppercase">Chưa có yêu cầu nghỉ phép nào được ghi nhận</p>
                    </div>
                  )}
                </div>

                {setActiveTab && (
                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        // Switch active tab to attendance (Bảng Chấm Công)
                        setActiveTab('attendance');
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-3 bg-[#f1f5f9] hover:bg-slate-200 border border-slate-200/70 rounded-xl transition-all active:scale-95 cursor-pointer"
                      title="Chuyển ngay sang tab Bảng Chấm Công để kiểm tra chỉ số đồng bộ"
                    >
                      <span className="text-[13px] leading-none mb-0.5">📅</span>
                      <span className="text-[#2b4c7e] font-black text-[11px] tracking-wider uppercase leading-none">BẢNG CÔNG THÁNG</span>
                    </button>
                    <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider">
                      Phép tự động đồng bộ sang bảng công tháng lập tức!
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'birthday' && (() => {
          // Grab current time details
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentDay = now.getDate();

          // Calculate users who have a birthday today or tomorrow
          const activeBirthdays = birthdayUsers.map(u => {
            const details = getBirthdayDetails(u.name);
            return { user: u, details };
          }).filter(item => item.details.isToday || item.details.isTomorrow);

          const hasActiveBirthdays = activeBirthdays.length > 0;

          // Calculate the next upcoming birthday dynamically
          const upcomingBirthday = (() => {
            if (!birthdayUsers || birthdayUsers.length === 0) return null;
            const currentYear = now.getFullYear();
            const candidates = birthdayUsers.map(user => {
              const details = getBirthdayDetails(user.name);
              let bDate = new Date(currentYear, details.month - 1, details.day, 0, 0, 0, 0);
              if (details.isPassed) {
                bDate = new Date(currentYear + 1, details.month - 1, details.day, 0, 0, 0, 0);
              }
              return {
                user,
                details,
                date: bDate,
                diffTime: bDate.getTime() - now.getTime()
              };
            });
            candidates.sort((a, b) => a.diffTime - b.diffTime);
            return candidates[0];
          })();

          // Get theme based on active birthday or calendar month
          const activeThemeMonth = hasActiveBirthdays && activeBirthdays[0]
            ? activeBirthdays[0].details.month
            : currentMonth;

          const getMonthlyTheme = (month: number) => {
            switch (month) {
              case 1:
                return {
                  title: "Tháng 1 – Bắt đầu một hành trình mới",
                  bgClass: "from-[#d97706] via-[#f59e0b] to-[#fbbf24]",
                  textClass: "text-[#fffbeb]",
                  caption: "Tháng 1 không chỉ là tháng mở đầu của năm mới, mà còn là thời điểm của những ước mơ được gieo mầm, của tinh thần sẵn sàng bứt phá và chinh phục những mục tiêu phía trước. Nhân dịp sinh nhật các Anh/Chị trong tháng 1, Tân Phú xin gửi lời chúc mừng thân thương nhất. Cảm ơn Anh/Chị vì đã luôn đồng hành, cống hiến và lan tỏa nguồn năng lượng tích cực trong hành trình chung của tập thể. Chúc Anh/Chị tuổi mới tràn đầy sức khỏe, nhiều niềm vui, công việc thuận lợi và luôn giữ được sự hứng khởi để đón nhận những điều mới mẻ của năm 2026.",
                  watermark: "1",
                  accentClass: "bg-white/20 text-[#fef08a] border-white/20",
                  hasButterflies: true,
                };
              case 2:
                return {
                  title: "Tháng 2 – Xuân sang mang lộc, tuổi mới thêm vui",
                  bgClass: "from-[#ef4444] via-[#dc2626] to-[#b91c1c]",
                  textClass: "text-[#fef2f2]",
                  caption: "Sắc xuân đầu tháng 2 hòa cùng không khí Tết lan tỏa khắp các ngõ ngách tại Tân Phú – mở ra những khởi đầu mới, tràn đầy năng lượng. Nhân dịp sinh nhật các Anh/Chị trong tháng 2, Tân Phú xin gửi những lời chúc mừng chân thành và ấm áp. Những đóng góp thầm lặng nhưng bền bỉ của Anh/Chị chính là nguồn năng lượng giúp tập thể Tân Phú luôn gắn kết và phát triển.",
                  watermark: "2",
                  accentClass: "bg-white/20 text-[#fef08a] border-white/20",
                  hasApricotBlossoms: true,
                };
              case 3:
                return {
                  title: "Tháng 3 – Nắng mới rạng ngời, tuổi mới thêm \"wow\"",
                  bgClass: "from-[#db2777] via-[#ec4899] to-[#be185d]",
                  textClass: "text-[#fdf2f8]",
                  caption: "Tháng Ba gõ cửa với những ngày nắng trong veo và không khí đầy tươi mới, mang theo nguồn cảm hứng tích cực lan tỏa khắp đại gia đình Tân Phú. Nhân dịp sinh nhật các Anh/Chị trong tháng 3, Tân Phú trân trọng gửi đến Anh/Chị lời chúc mừng thân tình và tốt đẹp nhất. Kính chúc Anh/Chị bước sang tuổi mới nhiều sức khỏe, nhiều niềm vui và thêm nhiều thành tựu trong công việc cũng như cuộc sống.",
                  watermark: "3",
                  accentClass: "bg-white/20 text-[#fffbeb] border-white/25",
                  hasDaisies: true,
                };
              case 8:
                return {
                  title: "Tháng 8 – Thơ mộng",
                  bgClass: "from-[#0284c7] via-[#0ea5e9] to-[#38bdf8]",
                  textClass: "text-white",
                  caption: "Tháng 8 về, mang theo làn gió se se của miền Bắc và những cơn mưa bất chợt của miền Nam – một chút dịu dàng, một chút tươi mới. Trong không khí ấy, xin gửi lời chúc mừng sinh nhật đến “team Tám” nhà Tân Phú Việt Nam. Chúc Bạn tuổi mới luôn mạnh khỏe, hạnh phúc, giữ mãi nụ cười rạng rỡ như nắng thu và bình yên như những cơn mưa dịu mát.",
                  watermark: "8",
                  accentClass: "bg-white/25 text-[#fffbeb] border-white/35",
                  hasRainbow: true,
                };
              case 9:
                return {
                  title: "Tháng 9 – Tự hào",
                  bgClass: "from-[#b91c1c] via-[#dc2626] to-[#ca8a04]",
                  textClass: "text-white",
                  caption: "Tháng 9 gõ cửa, điểm xuyến cùng sắc đỏ rực rỡ của cờ hoa, sắc thu vàng dịu dàng và những niềm tự hào tràn ngập trong ngày lễ lớn của dân tộc. Hòa chung không khí ấy, Tân Phú Việt Nam hân hoan gửi lời chúc mừng sinh nhật đến “Những ngôi sao tháng 9”. Chúc Bạn tuổi mới luôn tỏa sáng rạng rỡ như nắng thu và giữ mãi tinh thần nhiệt huyết như màu đỏ của lá cờ Việt Nam.",
                  watermark: "9",
                  accentClass: "bg-white/25 text-[#fef08a] border-white/30",
                  hasStars: true,
                };
              case 10:
                return {
                  title: "Tháng 10 – Ngọt ngào",
                  bgClass: "from-[#ea580c] via-[#db2777] to-[#9d174d]",
                  textClass: "text-[#fff5f5]",
                  caption: "Những làn gió thu se lạnh, sắc vàng của hoa cúc rực rỡ và bầu trời xanh dịu nhẹ đang chạm khẽ vào cánh cửa tháng 10. Trong bức tranh đầy thi vị ấy, Tân Phú Việt Nam xin gửi lời chúc mừng sinh nhật đến “Những sắc màu tháng 10”. Chúc Bạn tuổi mới tràn đầy năng lượng tích cực, công việc “ngọt” như kẹo, may mắn “ngập tràn” như bí ngô Halloween và nụ cười luôn rực rỡ hơn cả ánh nến sinh nhật.",
                  watermark: "10",
                  accentClass: "bg-white/20 text-[#fffbeb] border-white/25",
                  hasDaisies: true,
                };
              case 5: // Current Month
              default:
                return {
                  title: `Tháng ${month} – Khởi sắc ngày mới, thắp lửa đam mê`,
                  bgClass: "from-[#be185d] via-[#f43f5e] to-[#ec4899]",
                  textClass: "text-white",
                  caption: `Tháng ${month} mang đến những tia nắng vàng rực rỡ, thắp sáng động lực cống hiến vượt bậc của đại gia đình Tân Phú. Nhân dịp sinh nhật các Anh/Chị trong tháng ${month}, Tân Phú xin gửi lời chúc mừng chân thành và tốt đẹp nhất. Kính chúc Bạn tuổi mới tràn trề nhiệt huyết, dồi dào sức khỏe và gặt hái thêm nhiều bước tiến đột phá, cùng nhau đưa thương hiệu Tân Phú ngày một vươn xa, vững vàng phát triển vượt bậc!`,
                  watermark: `${month}`,
                  accentClass: "bg-white/15 text-yellow-200 border-white/25",
                  hasStars: true,
                };
            }
          };

          const monthlyTheme = getMonthlyTheme(activeThemeMonth);

          const renderDecorations = (theme: typeof monthlyTheme) => {
            return (
              <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                {/* Huge semi-transparent watermark number */}
                <div translate="no" className="notranslate absolute -right-4 -bottom-10 text-[180px] md:text-[245px] font-black tracking-tighter text-white opacity-[0.10] leading-none select-none">
                  {theme.watermark}
                </div>

                {/* Monthly seasonal elements */}
                {theme.hasButterflies && (
                  <>
                    <div className="absolute top-10 right-[15%] w-10 h-10 animate-bounce opacity-40" style={{ animationDuration: '4.5s' }}>
                      <svg viewBox="0 0 100 100" fill="currentColor" className="text-yellow-100 transform -rotate-12">
                        <path d="M50,50 C35,20 15,20 10,40 C5,60 30,70 50,50 C70,70 95,60 90,40 C85,20 65,20 50,50 Z" />
                        <path d="M50,50 C40,30 25,30 20,45 C15,60 35,65 50,50 C65,65 85,60 80,45 C75,30 60,30 50,50 Z" className="text-orange-200" opacity="0.7" />
                        <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                    <div className="absolute bottom-12 left-[8%] w-12 h-12 -rotate-45 animate-pulse opacity-30" style={{ animationDuration: '6s' }}>
                      <svg viewBox="0 0 100 100" fill="currentColor" className="text-amber-100">
                        <path d="M50,50 C35,20 15,20 10,40 C5,60 30,70 50,50 C70,70 95,60 90,40 C85,20 65,20 50,50 Z" />
                        <path d="M50,50 C40,30 25,30 20,45 C15,60 35,65 50,50 C65,65 85,60 80,45 C75,30 60,30 50,50 Z" className="text-orange-300" opacity="0.6" />
                        <line x1="50" y1="50" x2="50" y2="15" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </div>
                  </>
                )}

                {theme.hasApricotBlossoms && (
                  <>
                    <div className="absolute top-8 right-[8%] w-12 h-12 animate-spin opacity-60" style={{ animationDuration: '18s', transformOrigin: 'center' }}>
                      <svg viewBox="0 0 100 100" fill="#fbbf24">
                        <circle cx="50" cy="25" r="18" />
                        <circle cx="74" cy="42" r="18" />
                        <circle cx="65" cy="70" r="18" />
                        <circle cx="35" cy="70" r="18" />
                        <circle cx="26" cy="42" r="18" />
                        <circle cx="50" cy="50" r="12" fill="#d97706" />
                        <circle cx="50" cy="50" r="6" fill="#fef08a" />
                      </svg>
                    </div>
                    <div className="absolute bottom-8 left-[6%] w-10 h-10 animate-pulse opacity-50">
                      <svg viewBox="0 0 100 100" fill="#f59e0b">
                        <circle cx="50" cy="25" r="18" />
                        <circle cx="74" cy="42" r="18" />
                        <circle cx="65" cy="70" r="18" />
                        <circle cx="35" cy="70" r="18" />
                        <circle cx="26" cy="42" r="18" />
                        <circle cx="50" cy="50" r="12" fill="#b45309" />
                        <circle cx="50" cy="50" r="6" fill="#fef08a" />
                      </svg>
                    </div>
                    <div className="absolute top-24 left-[20%] w-7 h-7 rotate-12 opacity-40">
                      <svg viewBox="0 0 100 100" fill="#fef08a">
                        <circle cx="50" cy="25" r="18" />
                        <circle cx="74" cy="42" r="18" />
                        <circle cx="65" cy="70" r="18" />
                        <circle cx="35" cy="70" r="18" />
                        <circle cx="26" cy="42" r="18" />
                        <circle cx="50" cy="50" r="10" fill="#ca8a04" />
                      </svg>
                    </div>
                  </>
                )}

                {theme.hasDaisies && (
                  <>
                    <div className="absolute -top-3 right-[12%] w-16 h-16 opacity-70">
                      <svg viewBox="0 0 120 120" fill="white">
                        <circle cx="60" cy="30" r="10" />
                        <circle cx="81" cy="39" r="10" />
                        <circle cx="90" cy="60" r="10" />
                        <circle cx="81" cy="81" r="10" />
                        <circle cx="60" cy="90" r="10" />
                        <circle cx="39" cy="81" r="10" />
                        <circle cx="30" cy="60" r="10" />
                        <circle cx="39" cy="39" r="10" />
                        <circle cx="60" cy="60" r="15" fill="#f59e0b" />
                      </svg>
                    </div>
                    <div className="absolute top-1/2 -right-4 w-12 h-12 rotate-45 opacity-60">
                      <svg viewBox="0 0 120 120" fill="white">
                        <circle cx="60" cy="30" r="10" />
                        <circle cx="81" cy="39" r="10" />
                        <circle cx="90" cy="60" r="10" />
                        <circle cx="81" cy="81" r="10" />
                        <circle cx="60" cy="90" r="10" />
                        <circle cx="39" cy="81" r="10" />
                        <circle cx="30" cy="60" r="10" />
                        <circle cx="39" cy="39" r="10" />
                        <circle cx="60" cy="60" r="15" fill="#fbbf24" />
                      </svg>
                    </div>
                    <div className="absolute bottom-4 left-[4%] w-10 h-10 opacity-50">
                      <svg viewBox="0 0 120 120" fill="white">
                        <circle cx="60" cy="30" r="10" />
                        <circle cx="81" cy="39" r="10" />
                        <circle cx="90" cy="60" r="10" />
                        <circle cx="81" cy="81" r="10" />
                        <circle cx="60" cy="90" r="10" />
                        <circle cx="39" cy="81" r="10" />
                        <circle cx="30" cy="60" r="10" />
                        <circle cx="39" cy="39" r="10" />
                        <circle cx="60" cy="60" r="15" fill="#f59e0b" />
                      </svg>
                    </div>
                  </>
                )}

                {theme.hasRainbow && (
                  <>
                    <div className="absolute -top-12 -right-12 w-48 h-48 opacity-25">
                      <svg viewBox="0 0 100 100" fill="none" strokeWidth="6" className="w-full h-full">
                        <circle cx="100" cy="0" r="80" stroke="#f43f5e" />
                        <circle cx="100" cy="0" r="72" stroke="#fb923c" strokeWidth="5.5" />
                        <circle cx="100" cy="0" r="64" stroke="#fbcfe8" strokeWidth="5" />
                        <circle cx="100" cy="0" r="56" stroke="#34d399" strokeWidth="4.5" />
                        <circle cx="100" cy="0" r="48" stroke="#38bdf8" strokeWidth="4" />
                      </svg>
                    </div>
                    <div className="absolute bottom-4 right-[10%] w-14 h-8 bg-white/20 rounded-full blur-[1px] opacity-60 animate-pulse" />
                    <div className="absolute top-16 left-[6%] w-16 h-10 bg-white/10 rounded-full blur-[2px] opacity-40" />
                  </>
                )}

                {theme.hasStars && (
                  <>
                    <div className="absolute top-12 right-[18%] w-6 h-6 text-yellow-200 animate-pulse opacity-60">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,1.5L14.6,9L22.5,9.3L16.2,14L18.5,21.5L12,17L5.5,21.5L7.8,14L1.5,9.3L9.4,9L12,1.5Z" />
                      </svg>
                    </div>
                    <div className="absolute bottom-10 left-[15%] w-8 h-8 text-yellow-105 animate-ping opacity-25 duration-[3000ms]">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,1.5L14.6,9L22.5,9.3L16.2,14L18.5,21.5L12,17L5.5,21.5L7.8,14L1.5,9.3L9.4,9L12,1.5Z" />
                      </svg>
                    </div>
                    <div className="absolute bottom-16 right-[8%] w-5 h-5 text-amber-100 animate-pulse opacity-40">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12,1.5L14.6,9L22.5,9.3L16.2,14L18.5,21.5L12,17L5.5,21.5L7.8,14L1.5,9.3L9.4,9L12,1.5Z" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            );
          };

          return (
            <div className="space-y-6">
              
              {hasActiveBirthdays ? (
                /* Giao diện Đón sinh nhật náo nhiệt: Có Sinh Nhật Hôm Nay Hoặc Ngày Mai - SIÊU TỐI ƯU KHÔNG GIAN */
                <div className={`relative overflow-hidden bg-gradient-to-br ${monthlyTheme.bgClass} rounded-2xl p-4 md:p-5 ${monthlyTheme.textClass} shadow-lg border border-white/10 transition-all`}>
                  {renderDecorations(monthlyTheme)}
                  
                  <div className="relative z-10 space-y-4">
                    {/* Header bar styled exactly like Tan Phu templates */}
                    <div className="flex justify-between items-start border-b border-white/20 pb-2 mb-1">
                      <div className="flex flex-col">
                        <span translate="no" className="notranslate font-sans font-black tracking-widest text-[11px] uppercase drop-shadow-sm flex items-center gap-1">
                          <span className="bg-white text-rose-600 px-1 py-0.5 rounded font-black text-[10px] tracking-normal leading-none font-sans">T</span> TANPHU
                        </span>
                        <span translate="no" className="notranslate text-[6px] font-black uppercase text-white/80 tracking-widest leading-none mt-0.5">
                          A Member of Tasco
                        </span>
                      </div>
                      <span translate="no" className="notranslate inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/20 text-[8.5px] font-black uppercase tracking-wider backdrop-blur-md">
                        <Sparkles size={10} className="animate-spin text-amber-200" /> SỰ KIỆN HOẠT NÁO PHÒNG QLCL
                      </span>
                    </div>

                    <div className="space-y-1 text-center md:text-left">
                      <h2 translate="no" className="notranslate text-base md:text-lg font-black uppercase tracking-tight leading-none drop-shadow-sm font-sans flex items-center gap-1.5 justify-center md:justify-start">
                        {monthlyTheme.title} 🎁
                      </h2>
                      <p className="text-[11px] md:text-xs text-white/90 max-w-2xl font-medium leading-relaxed font-sans opacity-95">
                        {monthlyTheme.caption}
                      </p>
                      
                      {/* Game instructions inside a beautiful glass overlay */}
                      <div className="mt-2.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                        <p className="text-[10px] md:text-[11px] text-white/90 font-medium font-sans italic flex items-center gap-1 leading-snug">
                          🎯 <span translate="no" className="notranslate">Chơi lật bài: Đọc kỹ gợi ý, đoán nhân vật phòng QLCL & lật bài để gửi chúc mừng!</span>
                        </p>
                      </div>
                    </div>

                    {/* Mảng Thẻ Game Lật Bài Bí Ẩn */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                      {activeBirthdays.map((b) => {
                        const isRevealed = !!revealedUsers[b.user.id];
                        
                        return (
                          <div
                            key={b.user.id}
                            className={`relative min-h-[105px] md:min-h-[115px] rounded-xl border transition-all duration-500 flex flex-col justify-between p-3.5 overflow-hidden ${
                              isRevealed
                                ? 'bg-white/15 backdrop-blur-md border-white/35 shadow-lg'
                                : 'bg-white/10 hover:bg-white/15 border-dashed border-white/20 shadow-md cursor-pointer hover:scale-[1.01]'
                            }`}
                            onClick={() => {
                              if (!isRevealed) {
                                setRevealedUsers(prev => ({ ...prev, [b.user.id]: true }));
                                setWishTarget(b.user);
                              }
                            }}
                          >
                            {!isRevealed ? (
                              /* FRONT OF CARD WRAPPED IN GORGEOUS MYSTERY COVER */
                              <div className="flex flex-col h-full justify-between gap-2.5">
                                <div className="flex items-start gap-2.5">
                                  <div className="w-8 h-8 rounded-lg bg-amber-400/20 border border-amber-300/35 flex items-center justify-center text-sm shrink-0 animate-pulse">
                                    🎁
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[9px] font-black text-yellow-250 uppercase tracking-wider block font-sans">
                                      GỢI Ý {b.details.isToday ? "• HÔM NAY" : "• NGÀY MAI"}
                                    </span>
                                    <p className="text-[11px] text-white/90 font-medium leading-tight font-sans italic line-clamp-2" title={b.details.isToday ? "Hôm nay chính là sinh nhật hoành tráng phòng QLCL" : "Sắp đón chào nhân vật phòng QLCL"}>
                                      {b.details.isToday ? (
                                        `"Một nhân vật vô cùng quan trọng phòng QLCL chính thức đón sinh nhật hoành tráng hôm nay!"`
                                      ) : (
                                        `"Trái đất chuẩn bị chào mừng sinh nhật một ngôi sao sáng phòng QLCL vào ngày mai!"`
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between border-t border-white/10 pt-2 mt-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[9.5px] font-black text-[#fffbda] uppercase tracking-wider font-sans">
                                      NHÂN VẬT:
                                    </span>
                                    <span className="px-1.5 py-0.5 bg-black/25 rounded text-[9px] font-black text-rose-250 font-mono">
                                      ? ? ?
                                    </span>
                                  </div>
                                  <span className="text-[8.5px] font-black uppercase text-white/80 animate-pulse tracking-wide font-sans bg-pink-700/30 px-2 py-0.5 rounded-md">
                                    Lật bài! 🎰
                                  </span>
                                </div>
                              </div>
                            ) : (
                              /* BACK OF CARD: REVEALED CELEBRATING INFO */
                              <div className="flex flex-col h-full justify-between gap-2.5 transition-all duration-300">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-900 border border-white flex items-center justify-center text-[10px] font-black shrink-0 shadow">
                                      {b.user.name.slice(-2).toUpperCase()}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] font-bold text-yellow-250 uppercase tracking-wider block font-sans">
                                        ✨ ĐÃ KHÁM PHÁ! ✨
                                      </span>
                                      <span translate="no" className="notranslate text-xs font-black text-white uppercase block leading-none font-sans">
                                        {b.user.name}
                                      </span>
                                      <span className="text-[9px] font-black uppercase text-pink-100 tracking-wider block font-sans">
                                        {b.details.dateLabel} ({b.details.zodiac})
                                      </span>
                                    </div>
                                  </div>

                                  <span className="text-[8px] font-black bg-white/20 border border-white/25 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                                    {b.details.isToday ? "🎂 Hôm nay" : "🍰 Ngày mai"}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 pt-2 border-t border-white/10 justify-between mt-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWishTarget(b.user);
                                      const el = document.getElementById('wish-compose-container');
                                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }}
                                    className="px-2 py-1 bg-white text-pink-600 hover:bg-yellow-100 font-black text-[8.5px] uppercase tracking-wider rounded-lg shadow transition-all active:scale-95 cursor-pointer font-sans"
                                  >
                                    ✍️ Chúc mừng ngay!
                                  </button>
                                  
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setRevealedUsers(prev => ({ ...prev, [b.user.id]: false }));
                                    }}
                                    className="px-1.5 py-0.5 bg-black/15 hover:bg-black/30 border border-white/20 text-white/90 font-bold text-[8px] uppercase tracking-wider rounded-md transition-all cursor-pointer font-sans"
                                    title="Úp lại thẻ"
                                  >
                                    🔄 Úp thẻ
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Giao diện thanh bình khi chưa tới ngày sinh nhật - THU GỌN 1 DÒNG SIÊU ĐẸP */
                <div className={`relative overflow-hidden bg-gradient-to-br ${monthlyTheme.bgClass} rounded-2xl p-4 md:p-5 ${monthlyTheme.textClass} shadow-lg border border-white/10 transition-all`}>
                  {renderDecorations(monthlyTheme)}

                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Brand layout + Header bar */}
                    <div className="flex items-center gap-4 border-r border-white/15 pr-4 shrink-0 flex-1 w-full md:w-auto">
                      <div className="flex flex-col shrink-0">
                        <span translate="no" className="notranslate font-sans font-black tracking-widest text-[11px] uppercase drop-shadow-sm flex items-center gap-0.5">
                          <span className="bg-white text-rose-600 px-1 py-0.5 rounded font-black text-[10px] tracking-normal leading-none font-sans">T</span> TANPHU
                        </span>
                        <span translate="no" className="notranslate text-[6px] font-black uppercase text-white/80 tracking-widest leading-none mt-0.5">
                          A Member of Tasco
                        </span>
                      </div>
                      <div className="h-6 w-px bg-white/20 shrink-0 hidden md:block" />
                      <div className="min-w-0 flex-1">
                        <h2 translate="no" className="notranslate text-xs md:text-sm font-black uppercase tracking-tight leading-none text-white font-sans truncate">
                          {monthlyTheme.title}
                        </h2>
                        <span className="text-[9px] text-white/85 font-medium leading-tight font-sans tracking-tight block mt-0.5 truncate">
                          Hôm nay & ngày mai chưa có sinh nhật thành viên nào phòng QLCL.
                        </span>
                      </div>
                    </div>

                    {/* Compact Box upcoming birthday */}
                    <div className="flex items-center gap-2.5 bg-white/15 backdrop-blur-md px-3 py-1 border border-white/20 rounded-xl hover:bg-white/20 transition-all shrink-0">
                      <div className="w-6 h-6 rounded-lg bg-amber-400/20 flex items-center justify-center text-xs text-white shrink-0 animate-bounce">
                        🎁
                      </div>
                      <div>
                        <span className="text-[7.5px] text-white/75 uppercase tracking-wide block font-extrabold font-sans leading-none">SINH NHẬT TIẾP THEO</span>
                        <span translate="no" className="notranslate text-[9px] font-black text-yellow-300 uppercase block leading-none mt-1 font-sans">
                          {upcomingBirthday ? `${upcomingBirthday.user.name} (${upcomingBirthday.details.dateLabel})` : 'Chưa có'} 🎂
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Khung gửi lời chúc */}
                <div id="wish-compose-container" className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <span translate="no" className="notranslate text-sm font-black text-slate-800 uppercase tracking-tight block mb-4 border-b pb-3 border-gray-100 font-sans">
                      Gửi lời chúc mừng trực tuyến
                    </span>

                    {wishTarget ? (
                      <form onSubmit={handleSendWishSubmit} className="space-y-4 text-slate-700">
                        {/* Recipient Dropdown Selection */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase font-sans">CHỌN THÀNH VIÊN NHẬN CHÚC MỪNG</label>
                          <select
                            value={wishTarget?.id || ''}
                            onChange={(e) => {
                              const selected = birthdayUsers.find(u => u.id === e.target.value || String(u.id) === e.target.value);
                              if (selected) setWishTarget(selected);
                            }}
                            className="w-full text-xs p-3 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 bg-white font-sans font-semibold text-slate-850"
                          >
                            {birthdayUsers.map((u) => {
                              const details = getBirthdayDetails(u.name);
                              const badge = details.isToday ? '🎂 Hôm nay!' : details.isTomorrow ? '🍰 Ngày mai!' : details.isThisMonth ? '🎉 Tháng này' : '';
                              return (
                                <option key={u.id} value={u.id}>
                                  {u.name} ({details.dateLabel}) {badge ? ` - ${badge}` : ''}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="p-3 bg-pink-50/50 border border-pink-100/50 rounded-2xl flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-black uppercase text-pink-400 block font-sans">Đang chuẩn bị gửi quà:</span>
                            <span translate="no" className="notranslate text-xs font-black uppercase text-slate-900 block mt-0.5 font-sans">{wishTarget.name}</span>
                          </div>
                          <Gift className="text-pink-500 animate-bounce" size={24} />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase font-sans">Soạn nội dung lời chúc</label>
                          <textarea
                            rows={4}
                            placeholder="Gõ lời chúc thân thương gửi người đồng hành..."
                            required
                            value={birthdayWish}
                            onChange={e => setBirthdayWish(e.target.value)}
                            className="w-full text-xs p-3 border border-slate-205 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500/10 focus:border-pink-500 bg-white font-sans text-slate-800"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-pink-600 hover:bg-pink-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                        >
                          <Sparkles size={14} className="stroke-2 animate-pulse" />
                          <span translate="no" className="notranslate">KÍCH HOẠT LỜI CHÚC</span>
                        </button>
                      </form>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-3xl h-full py-16">
                        <Gift className="text-slate-300 stroke-1 mb-3 animate-pulse" size={40} />
                        <span translate="no" className="notranslate text-[11px] font-black uppercase text-slate-400 leading-relaxed block max-w-[200px] mx-auto font-sans">
                          Vui lòng chọn một thành viên từ danh sách để khởi tạo quá trình chúc mừng sinh nhật
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Danh sách lời chúc bên cạnh */}
                <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4 border-b pb-3 border-gray-100">
                      <span translate="no" className="notranslate text-sm font-black text-slate-800 uppercase tracking-tight font-sans">
                        Bảng tổng hợp lời chúc tuổi mới hân hoan
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem('office_birthday_wishes_initialized', 'true');
                          localStorage.setItem('office_birthday_wishes', JSON.stringify(wishes));
                          alert('Đã lưu và đồng bộ danh sách lời chúc mừng sinh nhật thành công!');
                        }}
                        className="px-3 py-1 bg-pink-50 hover:bg-pink-100 text-pink-700 hover:text-pink-850 font-black text-[9.5px] uppercase tracking-wide rounded-xl border border-pink-100 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs font-sans"
                      >
                        <Save size={11} />
                        <span translate="no" className="notranslate">LƯU LỜI CHÚC</span>
                      </button>
                    </div>
                    <div className="space-y-3.5 max-h-[360px] overflow-y-auto no-scrollbar pr-1">
                      {wishes.map((w) => (
                        <div key={w.id} className="p-3 bg-pink-50/20 border border-pink-100/30 rounded-2xl relative overflow-hidden hover:bg-pink-50/45 transition-all group/wish">
                          <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-pink-400/50" />
                          <div className="flex justify-between items-center text-[9.5px] font-black text-pink-700 uppercase tracking-tight mb-1 font-sans">
                            <span>Từ: {w.from}  👉  Đến: {w.to}</span>
                            <span className="text-slate-400 font-mono">{formatDateVN(w.date)}</span>
                          </div>
                          <p translate="no" className="notranslate text-[11px] text-slate-700 leading-relaxed font-semibold italic uppercase font-sans">
                            "{w.content}"
                          </p>
                          {effectiveUser.role === 'Admin' && (
                            <div className="flex justify-end gap-2 mt-2 pt-1.5 border-t border-pink-100/40 opacity-0 group-hover/wish:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => setEditingWish(w)}
                                className="px-1.5 py-0.5 text-[8.5px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100 rounded transition-all cursor-pointer flex items-center gap-0.5 font-sans"
                              >
                                <Sliders size={10} /> Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDeleteConfirm({
                                    type: 'wish',
                                    id: w.id,
                                    title: 'Xóa lời chúc mừng sinh nhật',
                                    subtitle: `Xóa lời chúc từ "${w.from}" gửi đến "${w.to}"`
                                  });
                                }}
                                className="px-1.5 py-0.5 text-[8.5px] font-bold text-rose-600 hover:text-rose-855 bg-rose-50 hover:bg-rose-100 rounded transition-all cursor-pointer flex items-center gap-0.5 font-sans"
                              >
                                <Trash2 size={10} /> Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                      {wishes.length === 0 && (
                        <div className="text-center py-12 text-slate-450">
                          <p className="text-xs font-black uppercase">Chưa có lời chúc nào được gửi</p>
                          <p className="text-[10px] mt-1">Hãy là người đầu tiên trao gửi yêu thương!</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Visual particles when a birthday wish is successfully simulated */}
        <AnimatePresence>
          {showWishConfetti && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center"
            >
              <div className="absolute inset-0 bg-pink-500/10 backdrop-blur-[1px]" />
              <div className="bg-white border border-pink-200 rounded-3xl p-6 shadow-2xl text-center space-y-4 max-w-sm relative z-11">
                <Sparkles className="text-pink-600 mx-auto animate-spin" size={44} />
                <span translate="no" className="notranslate text-sm font-black uppercase text-pink-700 block">
                  CẢM ƠN TẤM LÒNG VÀNG CUẢ BẠN!
                </span>
                <span translate="no" className="notranslate text-[11px] font-bold uppercase text-slate-600 block leading-relaxed">
                  Lời chúc mừng sinh nhật đã được gửi trực tuyến lên hệ thống bảng vinh danh của Tân Phú! Thổi nến hân hoan! 🎂🎉
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MODALS CHO QUYỀN HẠN SỬA ĐỒNG BỘ CHUYÊN SÂU */}
        <AnimatePresence>
          {editingEvent && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditingEvent(null)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-250 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-left relative z-20 text-slate-700"
              >
                <div className="flex items-center justify-between border-b pb-3 border-slate-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-indigo-600" size={18} />
                    <span translate="no" className="notranslate text-xs font-black text-indigo-600 uppercase tracking-widest block font-sans">
                      CẬP NHẬT LỊCH CÔNG TÁC PHÒNG QLCL
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-md">ID: {editingEvent.id}</span>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setCalendarEvents(prev => prev.map(x => x.id === editingEvent.id ? editingEvent : x));
                  setEditingEvent(null);
                }} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tiêu đề công tác / Sự kiện</label>
                    <input
                      type="text"
                      required
                      value={editingEvent.title}
                      onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Ngày diễn ra</label>
                      <input
                        type="date"
                        required
                        value={editingEvent.date}
                        onChange={e => setEditingEvent({ ...editingEvent, date: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Khung giờ hoạt động</label>
                      <input
                        type="text"
                        required
                        value={editingEvent.time}
                        onChange={e => setEditingEvent({ ...editingEvent, time: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Địa điểm triển khai</label>
                      <input
                        type="text"
                        required
                        value={editingEvent.location}
                        onChange={e => setEditingEvent({ ...editingEvent, location: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Chủ trì cuộc họp</label>
                      <input
                        type="text"
                        required
                        value={editingEvent.host}
                        onChange={e => setEditingEvent({ ...editingEvent, host: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Phân loại sự kiện</label>
                      <select
                        value={editingEvent.type}
                        onChange={e => setEditingEvent({ ...editingEvent, type: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      >
                        <option value="meeting">Họp hành</option>
                        <option value="audit">Đánh giá / Audit</option>
                        <option value="evaluate">Mẫu kiểm nghiệm</option>
                        <option value="document">Hồ sơ ISO / Tài liệu</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Trạng thái triển khai</label>
                      <select
                        value={editingEvent.status}
                        onChange={e => setEditingEvent({ ...editingEvent, status: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      >
                        <option value="Lên kế hoạch">Lên kế hoạch</option>
                        <option value="Xác nhận">Xác nhận</option>
                        <option value="Đang diễn ra">Đang diễn ra</option>
                        <option value="Hoàn thành">Hoàn thành</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nhiệm vụ & Mục tiêu chi tiết</label>
                    <textarea
                      rows={2}
                      required
                      value={editingEvent.reason}
                      onChange={e => setEditingEvent({ ...editingEvent, reason: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                    {effectiveUser.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm({
                            type: 'event',
                            id: editingEvent.id,
                            title: `XÁC NHẬN XÓA LỊCH CÔNG TÁC`,
                            subtitle: `Công tác: "${editingEvent.title}" do "${editingEvent.host}" khơi xướng`
                          });
                          setEditingEvent(null);
                        }}
                        className="mr-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                      >
                        Xóa lịch
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingEvent(null)}
                      className="px-4 py-2 text-slate-500 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {editingLeave && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditingLeave(null)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-250 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-left relative z-20 text-slate-700"
              >
                <div className="flex items-center justify-between border-b pb-3 border-teal-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-teal-600" size={18} />
                    <span translate="no" className="notranslate text-xs font-black text-teal-700 uppercase tracking-widest block font-sans">
                      CHỈNH SỬA ĐƠN XIN NGHỈ PHÉP PHÒNG QLCL
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-md">Mã Đơn: {editingLeave.id}</span>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setLeaveRequests(prev => prev.map(x => x.id === editingLeave.id ? editingLeave : x));
                  setEditingLeave(null);
                }} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Họ tên nhân viên nghỉ</label>
                    <input
                      type="text"
                      required
                      value={editingLeave.name}
                      onChange={e => setEditingLeave({ ...editingLeave, name: e.target.value })}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Phân loại nghỉ phép</label>
                    <select
                      value={editingLeave.type}
                      onChange={e => setEditingLeave({ ...editingLeave, type: e.target.value })}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    >
                      <option value="Nghỉ phép năm">Nghỉ phép năm</option>
                      <option value="Nghỉ ốm">Nghỉ ốm</option>
                      <option value="Nghỉ việc riêng">Nghỉ việc riêng (Không hưởng lương)</option>
                      <option value="Nghỉ thai sản / Đặc biệt">Nghỉ thai sản / Đặc biệt</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Nghỉ từ ngày</label>
                      <input
                        type="date"
                        required
                        value={editingLeave.startDate}
                        onChange={e => setEditingLeave({ ...editingLeave, startDate: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Đến ngày nghỉ</label>
                      <input
                        type="date"
                        required
                        value={editingLeave.endDate}
                        onChange={e => setEditingLeave({ ...editingLeave, endDate: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Tổng số ngày phép khấu trừ</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        value={editingLeave.days}
                        onChange={e => setEditingLeave({ ...editingLeave, days: Number(e.target.value) })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Trạng thái phê duyệt</label>
                      <select
                        value={editingLeave.status}
                        onChange={e => setEditingLeave({ ...editingLeave, status: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      >
                        <option value="Đang phê duyệt">Đang phê duyệt</option>
                        <option value="Đã duyệt">Đã duyệt</option>
                        <option value="Từ chối">Từ chối</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Chi tiết lý do nghỉ phép</label>
                    <textarea
                      rows={2}
                      required
                      value={editingLeave.reason}
                      onChange={e => setEditingLeave({ ...editingLeave, reason: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                    {effectiveUser.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm({
                            type: 'leave',
                            id: editingLeave.id,
                            title: `XÁC NHẬN XÓA ĐƠN NGHỈ PHÉP`,
                            subtitle: `Nhân viên: ${editingLeave.name} • Lý do: ${editingLeave.reason}`
                          });
                          setEditingLeave(null);
                        }}
                        className="mr-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                      >
                        Xóa đơn
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingLeave(null)}
                      className="px-4 py-2 text-slate-550 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {editingAttendanceRecord && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditingAttendanceRecord(null)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-250 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-left relative z-20 text-slate-700"
              >
                <div className="flex items-center justify-between border-b pb-3 border-purple-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-purple-600" size={18} />
                    <span translate="no" className="notranslate text-xs font-black text-purple-700 uppercase tracking-widest block font-sans">
                      CHỈNH SỬA NHẬT KÝ CHẤM CÔNG TRONG NGÀY
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-md">Mã: {editingAttendanceRecord.id}</span>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setAttendanceRecords(prev => prev.map(x => x.id === editingAttendanceRecord.id ? editingAttendanceRecord : x));
                  setEditingAttendanceRecord(null);
                }} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Tên nhân viên quét</label>
                    <input
                      type="text"
                      required
                      value={editingAttendanceRecord.name}
                      onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, name: e.target.value })}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Thời điểm ghi nhận</label>
                      <input
                        type="text"
                        required
                        value={editingAttendanceRecord.time}
                        onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, time: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Tình trạng đi muộn / sớm</label>
                      <select
                        value={editingAttendanceRecord.status}
                        onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, status: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      >
                        <option value="Đúng giờ">Đúng giờ</option>
                        <option value="Đi muộn">Đi muộn</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Hình thức quét liên kết</label>
                      <input
                        type="text"
                        required
                        value={editingAttendanceRecord.type}
                        onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, type: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Khu vực / Tọa độ định vị IP</label>
                      <input
                        type="text"
                        required
                        value={editingAttendanceRecord.location}
                        onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, location: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Hình thức điểm danh (Offline / Online / Công tác)</label>
                    <select
                      value={editingAttendanceRecord.mode || 'Online'}
                      onChange={e => setEditingAttendanceRecord({ ...editingAttendanceRecord, mode: e.target.value as any })}
                      className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold cursor-pointer"
                    >
                      <option value="Online">Online</option>
                      <option value="Offline">Offline</option>
                      <option value="Công tác">Công tác</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                    {effectiveUser.role === 'Admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm({
                            type: 'attendance',
                            id: editingAttendanceRecord.id,
                            title: `XÁC NHẬN XÓA BẢN GHI ĐIỂM DANH`,
                            subtitle: `Nhân viên: ${editingAttendanceRecord.name} • Giờ: ${editingAttendanceRecord.time}`
                          });
                          setEditingAttendanceRecord(null);
                        }}
                        className="mr-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                      >
                        Xóa bản ghi
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditingAttendanceRecord(null)}
                      className="px-4 py-2 text-slate-555 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {editingWish && (
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            >
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setEditingWish(null)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-250 rounded-3xl p-6 shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 text-left relative z-20 text-slate-700 font-sans"
              >
                <div className="flex items-center justify-between border-b pb-3 border-pink-100">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-pink-600" size={18} />
                    <span translate="no" className="notranslate text-xs font-black text-pink-700 uppercase tracking-widest block font-sans">
                      CHỈNH SỬA LỜI CHÚC MỪNG SINH NHẬT
                    </span>
                  </div>
                  <span className="text-[9.5px] text-slate-400 font-mono font-bold uppercase bg-slate-100 px-2 py-0.5 rounded-md">ID: {editingWish.id}</span>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  setWishes(prev => prev.map(x => x.id === editingWish.id ? editingWish : x));
                  setEditingWish(null);
                }} className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Người gửi (Từ)</label>
                      <input
                        type="text"
                        required
                        value={editingWish.from}
                        onChange={e => setEditingWish({ ...editingWish, from: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Người nhận (Đến)</label>
                      <input
                        type="text"
                        required
                        value={editingWish.to}
                        onChange={e => setEditingWish({ ...editingWish, to: e.target.value })}
                        className="w-full text-xs h-10 px-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Nội dung lời chúc mừng</label>
                    <textarea
                      rows={4}
                      required
                      value={editingWish.content}
                      onChange={e => setEditingWish({ ...editingWish, content: e.target.value })}
                      className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:outline-none bg-white font-semibold text-slate-800"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-3.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteConfirm({
                          type: 'wish',
                          id: editingWish.id,
                          title: 'Xóa lời chúc mừng sinh nhật',
                          subtitle: `Xóa lời chúc từ "${editingWish.from}" gửi đến "${editingWish.to}"`
                        });
                        setEditingWish(null);
                      }}
                      className="mr-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer font-sans"
                    >
                      Xóa lời chúc
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setEditingWish(null)}
                      className="px-4 py-2 text-slate-555 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                    >
                      Lưu thay đổi
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {deleteConfirm && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs"
            >
              <div className="absolute inset-0" onClick={() => setDeleteConfirm(null)} />
              <motion.div 
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl max-w-md w-full relative z-20 text-slate-700 text-left space-y-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                    <Trash2 size={24} className="animate-pulse" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      {deleteConfirm.title}
                    </h3>
                    {deleteConfirm.subtitle && (
                      <p className="text-xs text-slate-500 font-bold leading-relaxed transition-all">
                        {deleteConfirm.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50/50 border border-amber-200/55 p-3.5 rounded-2xl">
                  <span className="text-[10px] font-black text-amber-800 uppercase tracking-widest block mb-0.5">⚠️ Lưu ý quan trọng</span>
                  <p className="text-[9.5px] text-amber-700 font-semibold uppercase leading-normal">
                    Hành động này sẽ xóa dữ liệu vĩnh viễn khỏi bộ nhớ cục bộ và không thể khôi phục tự động.
                  </p>
                </div>

                <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-4 py-2.5 text-slate-555 bg-slate-100 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:bg-slate-150 transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const { type, id } = deleteConfirm;
                      if (type === 'attendance') {
                        setAttendanceRecords(prev => prev.filter(x => x.id !== id));
                      } else if (type === 'event') {
                        setCalendarEvents(prev => prev.filter(x => x.id !== id));
                      } else if (type === 'leave') {
                        setLeaveRequests(prev => prev.filter(x => x.id !== id));
                      } else if (type === 'wish') {
                        setWishes(prev => prev.filter(x => x.id !== id));
                      }
                      setDeleteConfirm(null);
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-200 active:scale-95 cursor-pointer"
                  >
                    Xác nhận xóa
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </motion.div>
  );
};
