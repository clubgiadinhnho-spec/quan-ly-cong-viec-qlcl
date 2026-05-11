import { useMemo } from 'react';
import { Task, User } from '../types';
import { isUserTask } from '../utils/userUtils';
import { getTaskDeadlineStatus } from '../lib/dateUtils';

interface UseAppLogicProps {
  tasks: Task[];
  effectiveUser: User | null;
  viewScope: 'mine' | 'all';
  search: string;
  activeTab: string;
  allUsers: User[];
}

export const useAppLogic = ({
  tasks,
  effectiveUser,
  viewScope,
  search,
  activeTab,
  allUsers
}: UseAppLogicProps) => {
  // 1. Badge & Statistics Logic - THIẾT QUÂN LUẬT ĐỒNG NHẤT
  const counts = useMemo(() => {
    const matchesSearch = (t: Task) => 
      (t.title || "").toLowerCase().includes(search.toLowerCase()) || 
      (t.code || "").toLowerCase().includes(search.toLowerCase());
    
    // Base collections based on status
    const basePending = tasks.filter(t => t.status === 'PENDING' && !t.deletedAt);
    const baseActive = tasks.filter(t => t.status === 'APPROVED' && !t.waitingApproval && !t.deletedAt);
    const baseApproval = tasks.filter(t => t.waitingApproval === true && !t.deletedAt);
    const baseCompleted = tasks.filter(t => t.status === 'COMPLETED' && !t.deletedAt);
    const baseTrash = tasks.filter(t => (t.deletedAt || t.status === 'DELETED') && matchesSearch(t));

    // Scope filtering
    const filterByScope = (list: Task[]) => {
      return list.filter(t => viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
    };

    const activeList = filterByScope(baseActive);
    const pendingList = filterByScope(basePending);
    const approvalList = filterByScope(baseApproval);
    const completedList = filterByScope(baseCompleted);
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
      completedTotal: completedList.length,
      trash: trashList.length,
      pendingApprovalTotal: approvalList.length,
      staffTotal: allUsers.length
    };
  }, [tasks, effectiveUser, viewScope, allUsers, search]);

  // 2. Main Sorting & Filtering Logic
  const sortedTasks = useMemo(() => {
    return tasks.filter(t => {
      if (activeTab === "trash") return !!t.deletedAt && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      if (t.deletedAt) return false;
      
      const matchesSearch = (t.title || "").toLowerCase().includes(search.toLowerCase()) || 
                           (t.code || "").toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (activeTab === "pending_confirmation") {
        return t.status === "PENDING" && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }
      
      if (activeTab === "pending_approval") {
        return !!t.waitingApproval && t.status !== "PENDING" && (viewScope === "mine" ? isUserTask(t, effectiveUser) : true);
      }

      if (activeTab === "completed_tasks") {
        const isCompleted = t.status === "COMPLETED" || t.status === "Hoàn thành" || (t.cycleHistory && t.cycleHistory.length > 0);
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
