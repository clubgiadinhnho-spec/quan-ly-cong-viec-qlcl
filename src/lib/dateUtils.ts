export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Fallback for strings that Date constructor might fail on but follow YYYY-MM-DD
      const parts = dateString.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
           const d = parts[2].padStart(2, '0');
           const m = parts[1].padStart(2, '0');
           const y = parts[0].slice(-2);
           return `${d}/${m}/${y}`;
        }
        if (parts[2].length === 4) { // DD/MM/YYYY
           const d = parts[0].padStart(2, '0');
           const m = parts[1].padStart(2, '0');
           const y = parts[2].slice(-2);
           return `${d}/${m}/${y}`;
        }
      }
      return dateString;
    }
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    
    return `${d}/${m}/${y}`;
  } catch (e) {
    return dateString;
  }
}

export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    
    return `${d}/${m}/${y} ${hh}:${mm}`;
  } catch (e) {
    return dateString;
  }
}

export function formatFullDateTime(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    
    return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
  } catch (e) {
    return dateString;
  }
}

export function calculateNextDeadline(start: string, type: string): string {
  if (type === 'NONE') return '';
  const date = new Date(start);
  switch (type) {
    case 'DAILY': date.setDate(date.getDate() + 1); break;
    case 'TRI_DAILY': date.setDate(date.getDate() + 3); break;
    case 'WEEKLY': date.setDate(date.getDate() + 7); break;
    case 'BI_WEEKLY': date.setDate(date.getDate() + 14); break;
    case 'TRI_WEEKLY': date.setDate(date.getDate() + 21); break;
    case 'MONTHLY': date.setMonth(date.getMonth() + 1); break;
  }
  return date.toISOString().split('T')[0];
}

export type DeadlineStatus = 'CRITICAL' | 'URGENT' | 'WARNING' | 'NORMAL';

export interface DeadlineInfo {
  status: DeadlineStatus;
  displayText: string;
  className: string;
  isOverdue: boolean;
  isUrgent: boolean;
  animate: boolean;
}

export const getTaskDeadlineStatus = (task: any, referenceDate: Date = new Date()): DeadlineInfo => {
  const dueDateStr = task.extensionDate || task.expectedEndDate;
  const startDateStr = task.issueDate || task.startDate;
  
  if (!dueDateStr) {
    return {
      status: 'NORMAL',
      displayText: 'HẠN: CHƯA XÁC ĐỊNH',
      className: 'text-gray-400',
      isOverdue: false,
      isUrgent: false,
      animate: false
    };
  }

  const dueDate = new Date(dueDateStr);
  const startDate = new Date(startDateStr || dueDateStr);
  
  // Normalize dates to start of day for accurate day-to-day comparison
  const dD = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
  const rD = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();
  const sD = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()).getTime();

  const formattedDate = formatDate(dueDateStr);
  const totalTime = dD - sD;
  const remainingTime = dD - rD;

  // 1. CRITICAL (Overdue): Today > DueDate
  if (rD > dD) {
    return {
      status: 'CRITICAL',
      displayText: `HẠN: ${formattedDate}`,
      className: 'text-red-600 font-bold',
      isOverdue: true,
      isUrgent: false,
      animate: true
    };
  }

  // 2. URGENT (Today): Today === DueDate
  if (rD === dD) {
    return {
      status: 'URGENT',
      displayText: `HẠN: ${formattedDate}`,
      className: 'text-orange-500 font-bold',
      isOverdue: false,
      isUrgent: true,
      animate: false
    };
  }

  // 3. WARNING (Soon): R <= T * 0.2
  // totalTime <= 0 means start date >= due date (invalid but handled)
  const threshold = totalTime > 0 ? (totalTime * 0.2) : 0;
  if (remainingTime <= threshold) {
    return {
      status: 'WARNING',
      displayText: `HẠN: ${formattedDate}`,
      className: 'text-yellow-600 font-bold',
      isOverdue: false,
      isUrgent: false,
      animate: false
    };
  }

  // 4. NORMAL (Safe)
  return {
    status: 'NORMAL',
    displayText: `HẠN: ${formattedDate}`,
    className: 'text-emerald-600 font-bold',
    isOverdue: false,
    isUrgent: false,
    animate: false
  };
};
