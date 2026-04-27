export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  
  try {
    // If it's already in dd-mm-yy format
    if (/^\d{2}-\d{2}-\d{2}$/.test(dateString)) return dateString;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Fallback for strings that Date constructor might fail on but follow YYYY-MM-DD
      const parts = dateString.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) { // YYYY-MM-DD
           const d = parts[2].padStart(2, '0');
           const m = parts[1].padStart(2, '0');
           const y = parts[0].slice(-2);
           return `${d}-${m}-${y}`;
        }
      }
      return dateString;
    }
    
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear().toString().slice(-2);
    
    return `${d}-${m}-${y}`;
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
    
    return `${d}-${m}-${y} ${hh}:${mm}`;
  } catch (e) {
    return dateString;
  }
}
