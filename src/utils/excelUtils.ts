import * as XLSX from 'xlsx';
import { Task, User } from '../types';

export const exportTasksToExcel = (tasks: Task[], users: User[]) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const data = tasks.map((task, index) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    return {
      'STT': index + 1,
      'Mã CV': task.code,
      'Nhân viên': assignee ? `${assignee.name} (${assignee.code})` : 'N/A',
      'Nội dung': task.title,
      'Mục tiêu': task.objective,
      'Hạn hoàn thành': formatDate(task.expectedEndDate),
      'Ưu tiên': task.priority === 'HIGH' ? 'CAO' : task.priority === 'MEDIUM' ? 'TRUNG BÌNH' : 'THẤP',
      'Trạng thái': task.status === 'COMPLETED' ? 'ĐÃ XONG' : 
                   task.status === 'IN_PROGRESS' ? 'ĐANG LÀM' : 
                   task.status === 'ON_HOLD' ? 'TẠM DỪNG' : 
                   task.status === 'PENDING_APPROVAL' ? 'CHỜ DUYỆT' : 'HỦY',
      'Đính kèm': task.attachmentName || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Tasks');
  
  // Create dynamic filename with date
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `BaoCaoCongViec_${date}.xlsx`);
};

export const importTasksFromExcel = (file: File): Promise<Partial<Task>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const tasks: Partial<Task>[] = json.map(row => {
          // Find priority from string
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          if (row['Ưu tiên']?.toString().toUpperCase() === 'CAO') priority = 'HIGH';
          if (row['Ưu tiên']?.toString().toUpperCase() === 'THẤP') priority = 'LOW';

          return {
            title: row['Nội dung'] || '',
            objective: row['Mục tiêu'] || '',
            priority: priority,
            expectedEndDate: row['Hạn hoàn thành'] || '',
            // Additional fields can be mapped here if needed
          };
        });

        resolve(tasks);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};
