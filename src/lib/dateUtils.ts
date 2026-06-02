function cleanDateIn(val: any): string {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (val && typeof val === 'object') {
    if (typeof val.toDate === 'function') {
      try {
        return val.toDate().toISOString();
      } catch (e) {}
    }
    if (typeof val.seconds === 'number') {
      try {
        return new Date(val.seconds * 1000).toISOString();
      } catch (e) {}
    }
    const sec = val.seconds ?? val._seconds;
    if (typeof sec === 'number') {
      try {
        return new Date(sec * 1000).toISOString();
      } catch (e) {}
    }
  }
  const str = String(val);
  return str === '[object Object]' ? '' : str;
}

export function formatDate(dateString: string | null | undefined): string {
  const cleaned = cleanDateIn(dateString);
  if (!cleaned) return '—';
  
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) {
      // Fallback for strings that Date constructor might fail on but follow YYYY-MM-DD
      const parts = cleaned.split(/[-/]/);
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
      return cleaned;
    }
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    
    return `${d}/${m}/${y}`;
  } catch (e) {
    return cleaned;
  }
}

export function getMonthYear(date: any): string {
  if (!date) return '';
  const dateStr = typeof date === 'string' ? date : (date as any).toISOString?.() || '';
  
  let m = '', y = '';
  // Try ISO format: 2026-05-...
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})/);
  if (isoMatch) {
    y = isoMatch[1].slice(-2);
    m = isoMatch[2];
  } else {
    // Try VN format: 13/05/26 or 13/05/2026
    const vnMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (vnMatch) {
      y = vnMatch[3].slice(-2);
      m = vnMatch[2].padStart(2, '0');
    }
  }

  return m && y ? `${m}/${y}` : '';
}

export function formatDateTime(dateString: string | null | undefined): string {
  const cleaned = cleanDateIn(dateString);
  if (!cleaned) return '—';
  
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return cleaned;
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    
    return `${d}/${m}/${y} ${hh}:${mm}`;
  } catch (e) {
    return cleaned;
  }
}

export function formatFullDateTime(dateString: string | null | undefined): string {
  const cleaned = cleanDateIn(dateString);
  if (!cleaned) return '—';
  
  try {
    const date = new Date(cleaned);
    if (isNaN(date.getTime())) return cleaned;
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    const hh = date.getHours().toString().padStart(2, '0');
    const mm = date.getMinutes().toString().padStart(2, '0');
    const ss = date.getSeconds().toString().padStart(2, '0');
    
    return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
  } catch (e) {
    return cleaned;
  }
}

export function calculateKnbSlaDeadline(createdAtStr: string, workingHoursNeed = 8): Date {
  let current = new Date(createdAtStr);
  if (isNaN(current.getTime())) {
    current = new Date();
  }
  let remMs = workingHoursNeed * 60 * 60 * 1000;
  let safetyCounter = 0;
  
  while (remMs > 0 && safetyCounter < 1000) {
    safetyCounter++;
    const day = current.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    
    // 1. If Sunday, move to Monday 8:00 AM
    if (day === 0) {
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
      continue;
    }
    
    const year = current.getFullYear();
    const month = current.getMonth();
    const date = current.getDate();
    
    const p1Start = new Date(year, month, date, 8, 0, 0, 0);
    const p1End = new Date(year, month, date, 12, 0, 0, 0);
    const p2Start = new Date(year, month, date, 13, 0, 0, 0);
    const p2End = new Date(year, month, date, 17, 0, 0, 0);
    
    const curTime = current.getTime();
    
    if (curTime < p1Start.getTime()) {
      current.setTime(p1Start.getTime());
    } else if (curTime >= p1Start.getTime() && curTime < p1End.getTime()) {
      const msLeftInP1 = p1End.getTime() - curTime;
      if (remMs <= msLeftInP1) {
        current.setTime(curTime + remMs);
        remMs = 0;
      } else {
        remMs -= msLeftInP1;
        current.setTime(p2Start.getTime());
      }
    } else if (curTime >= p1End.getTime() && curTime < p2Start.getTime()) {
      current.setTime(p2Start.getTime());
    } else if (curTime >= p2Start.getTime() && curTime < p2End.getTime()) {
      const msLeftInP2 = p2End.getTime() - curTime;
      if (remMs <= msLeftInP2) {
        current.setTime(curTime + remMs);
        remMs = 0;
      } else {
        remMs -= msLeftInP2;
        current.setDate(current.getDate() + 1);
        current.setHours(8, 0, 0, 0);
      }
    } else {
      current.setDate(current.getDate() + 1);
      current.setHours(8, 0, 0, 0);
    }
  }
  return current;
}

export function parseSafeDate(input: string | null | undefined): Date {
  if (!input) return new Date();
  
  // Try standard parsing first
  let date = new Date(input);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try parsing custom format e.g. DD/MM/YYYY or DD/MM/YY or YYYY-MM-DD
  try {
    const cleanInput = String(input).trim();
    // Match dd/mm/yyyy or dd/mm/yy
    const matchSlash = cleanInput.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (matchSlash) {
      const d = parseInt(matchSlash[1], 10);
      const m = parseInt(matchSlash[2], 10) - 1; // 0-indexed month
      let y = parseInt(matchSlash[3], 10);
      if (y < 100) {
        y += 2000; // Assume 20xx
      }
      return new Date(y, m, d);
    }
    
    // Match yyyy-mm-dd
    const matchDash = cleanInput.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (matchDash) {
      const y = parseInt(matchDash[1], 10);
      const m = parseInt(matchDash[2], 10) - 1;
      const d = parseInt(matchDash[3], 10);
      return new Date(y, m, d);
    }
  } catch (e) {
    console.error("Error parsing safe date:", e);
  }
  
  return new Date();
}

export function calculateNextDeadline(start: string, type: string): string {
  if (type === 'NONE') return '';
  const date = parseSafeDate(start);
  switch (type) {
    case 'DAILY': date.setDate(date.getDate() + 1); break;
    case 'TRI_DAILY': date.setDate(date.getDate() + 3); break;
    case 'WEEKLY': date.setDate(date.getDate() + 7); break;
    case 'BI_WEEKLY': date.setDate(date.getDate() + 14); break;
    case 'TRI_WEEKLY': date.setDate(date.getDate() + 21); break;
    case 'MONTHLY': date.setMonth(date.getMonth() + 1); break;
  }
  
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
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

export function formatAllDatesInString(text: string | null | undefined): string {
  if (!text) return '';
  
  // Format ISO timestamps like 2026-05-26T23:48:48.000Z or similar to hh:mm dd/MM/yy
  let processed = text.replace(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z?/gi, (match, y, m, d, hh, mm) => {
    return `${hh}:${mm} ${d}/${m}/${y.slice(-2)}`;
  });

  // Format date-time like "2026-05-26 23:48:48" or "2026-05-26 23:48" to hh:mm dd/MM/yy
  processed = processed.replace(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::\d{2})?/gi, (match, y, m, d, hh, mm) => {
    return `${hh}:${mm} ${d}/${m}/${y.slice(-2)}`;
  });

  // Format simple YYYY-MM-DD, e.g. 2026-05-27 and format them to DD/MM/YY
  processed = processed.replace(/(\d{4})-(\d{2})-(\d{2})/g, (match, y, m, d) => {
    return `${d}/${m}/${y.slice(-2)}`;
  });

  return processed;
}

