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
           const y = parts[0];
           return `${d}/${m}/${y}`;
        }
        if (parts[2].length === 4) { // DD/MM/YYYY
           const d = parts[0].padStart(2, '0');
           const m = parts[1].padStart(2, '0');
           const y = parts[2];
           return `${d}/${m}/${y}`;
        }
      }
      return dateString;
    }
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    
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
    const y = date.getFullYear();
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
    const y = date.getFullYear();
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
