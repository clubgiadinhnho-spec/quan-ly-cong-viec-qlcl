import { useMemo } from 'react';
import { Task, User } from '../types';
import { isUserTask, normalizeString, getTaskAssigneeName } from '../utils/userUtils';
import { getTaskDeadlineStatus } from '../lib/dateUtils';

interface UseAppLogicProps {
  tasks: Task[];
  effectiveUser: User | null;
  viewScope: 'mine' | 'all';
  search: string;
  activeTab: string;
  allUsers: User[];
  selectedMonth?: string;
}

export const useAppLogic = ({
  tasks,
  effectiveUser,
  viewScope,
  search,
  activeTab,
  allUsers,
  selectedMonth = 'all'
}: UseAppLogicProps) => {
  const matchesSearch = useMemo(() => (t: Task) => {
    if (!search) return true;
    const term = normalizeString(search);
    const assigneeName = getTaskAssigneeName(t, allUsers);
    
    const recurrenceVN = t.recurrence === 'DAILY' ? 'Hàng ngày' 
      : t.recurrence === 'WEEKLY' ? 'Hàng tuần'
      : t.recurrence === 'BI_WEEKLY' ? 'Hàng 2 tuần'
      : t.recurrence === 'TRI_WEEKLY' ? 'Hàng 3 tuần'
      : t.recurrence === 'TRI_DAILY' ? 'Hàng 3 ngày'
      : t.recurrence === 'MONTHLY' ? 'Hàng tháng'
      : 'Không lặp';

    const formatDate = (dateStr: any) => {
      if (!dateStr) return '';
      const s = typeof dateStr === 'string' ? dateStr : (dateStr as any).toISOString?.() || '';
      const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        const [_, y, m, d] = match;
        return `${d}/${m}/${y.substring(2)} ${d}/${m}/${y}`;
      }
      return s;
    };

    const searchableFields = [
      t.code,
      assigneeName,
      t.category,
      t.title,
      t.objective,
      t.currentUpdate,
      formatDate(t.issueDate),
      formatDate(t.startDate),
      formatDate(t.expectedEndDate),
      formatDate(t.dueDate),
      formatDate(t.extensionDate),
      formatDate(t.actualEndDate),
      recurrenceVN,
      typeof t.kpiEfficiency === 'number' ? t.kpiEfficiency.toString() : t.kpiEfficiency
    ];
    
    return searchableFields.some(f => normalizeString(f || '').includes(term));
  }, [search, allUsers]);

  // 1. Badge & Statistics Logic - THIẾT QUÂN LUẬT ĐỒNG NHẤT
  const counts = useMemo(() => {
    
    // Base collections based on status - THIẾT QUÂN LUẬT
    const basePending = tasks.filter(t => t.status === 'PENDING' && !t.deletedAt);
    const baseActive = tasks.filter(t => t.status === 'APPROVED' && !t.waitingApproval && !t.deletedAt);
    const baseApproval = tasks.filter(t => t.waitingApproval === true && !t.deletedAt);
    const baseTrash = tasks.filter(t => (t.deletedAt || t.status === 'DELETED'));

    // HOÀN THÀNH CHUẨN: Master Data Only - THIẾT QUÂN LUẬT
    const getCompletedCount = (filteredByMonth = false) => {
      let combined = tasks.filter(t => (t.status === 'COMPLETED' || t.status === 'Hoàn thành') && !t.waitingApproval && !t.deletedAt);
      
      // Scope filtering
      if (viewScope === 'mine') {
        combined = combined.filter(t => isUserTask(t, effectiveUser));
      }

      // Month filtering
      if (filteredByMonth && selectedMonth && selectedMonth !== 'all') {
        combined = combined.filter(t => {
          const date = t.actualEndDate;
          if (!date) return false;
          const dateStr = typeof date === 'string' ? date : (date as any).toISOString?.() || '';
          
          let m = '', y = '';
          const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
          const vnMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2})/);

          if (isoMatch) {
            y = isoMatch[1].substring(2);
            m = isoMatch[2];
          } else if (vnMatch) {
            y = vnMatch[3];
            m = vnMatch[2];
          }
          
          return `${m}/${y}` === selectedMonth;
        });
      }
      
      return combined.length;
    };

    // Scope filtering for active areas
    const filterByScope = (list: Task[]) => {
      return list.filter(t => viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
    };

    const pendingList = basePending; // Nhân viên được xem tất cả đề xuất mới
    const activeList = filterByScope(baseActive);
    const approvalList = filterByScope(baseApproval);
    const trashList = filterByScope(baseTrash);

    // Đặc biệt: Công việc ưu tiên (Báo động Sidebar theo lệnh Trưởng phòng)
    const priorityList = activeList.filter(t => !!t.priorityOrder);
    const criticalCount = priorityList.length;

    return {
      pending: pendingList.length,
      active: activeList.length,
      activeAlerts: criticalCount,
      attention: criticalCount > 0 || activeList.some(t => t.isNewInBoard),
      allActive: activeList.length,
      mine: activeList.filter(t => isUserTask(t, effectiveUser)).length,
      completedTotal: getCompletedCount(),
      trash: trashList.length,
      pendingApprovalTotal: approvalList.length,
      staffTotal: allUsers.length
    };
  }, [tasks, effectiveUser, viewScope, allUsers, selectedMonth]);

  // 2. Main Sorting & Filtering Logic
  const sortedTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. Kiểm tra tìm kiếm trước (Áp dụng cho mọi tab)
      if (!matchesSearch(t)) return false;

      // 2. Kiểm tra Tab & Scope
      if (activeTab === "trash") {
        const isDeleted = !!t.deletedAt || t.status === 'DELETED';
        return isDeleted && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }
      
      if (t.deletedAt) return false;

      if (activeTab === "pending_confirmation") {
        return t.status === "PENDING"; 
      }
      
      if (activeTab === "pending_approval") {
        return !!t.waitingApproval && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }

      if (activeTab === "completed_tasks") {
        const isCompleted = (t.status === 'COMPLETED' || t.status === 'Hoàn thành' || (t.cycleHistory && t.cycleHistory.length > 0)) && !t.waitingApproval;
        return isCompleted && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }
      
      if (activeTab === "tasks") {
        return t.status === "APPROVED" && !t.waitingApproval && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }

      return viewScope === "mine" ? isUserTask(t, effectiveUser) : true;
    }).sort((a, b) => {
      // Priority Order (Absolute)
      if (a.priorityOrder && !b.priorityOrder) return -1;
      if (b.priorityOrder && !a.priorityOrder) return 1;
      if (a.priorityOrder && b.priorityOrder) return a.priorityOrder - b.priorityOrder;

      // Last Action Time
      const timeA = new Date(a.lastActionAt || a.updatedAt || 0).getTime();
      const timeB = new Date(b.lastActionAt || b.updatedAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;

      // Code
      return b.code.localeCompare(a.code);
    });
  }, [tasks, activeTab, search, viewScope, effectiveUser]);

  return {
    counts,
    sortedTasks
  };
};
