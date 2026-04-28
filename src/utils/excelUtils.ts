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

  const data = tasks.map((task) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    return {
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

export const importTasksFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

        const tasks = json.map(row => {
          // Robust key finder helper
          const getValue = (possibleKeys: string[]) => {
            const rowKeys = Object.keys(row);
            const foundKey = rowKeys.find(rk => 
              possibleKeys.some(pk => 
                rk.trim().toLowerCase() === pk.toLowerCase()
              )
            );
            return foundKey ? row[foundKey] : undefined;
          };

          const rawCode = getValue(['Mã CV', 'Ma CV', 'Code', 'Số TT', 'STT']);
          const rawTitle = getValue(['Nội dung', 'Noi dung', 'Title', 'Content', 'Nội dung và mục tiêu', 'Noi dung va muc tieu', 'Nội dung & Mục tiêu']);
          const rawObjective = getValue(['Mục tiêu', 'Muc tieu', 'Objective', 'Goal', 'Nội dung và mục tiêu', 'Noi dung va muc tieu', 'Nội dung & Mục tiêu']);
          const rawPriority = getValue(['Ưu tiên', 'Uu tien', 'Priority', 'Mức độ']);
          const rawDate = getValue(['Hạn hoàn thành', 'Han hoan thanh', 'Deadline', 'Expected End Date', 'Thời hạn', 'Ngày hết hạn']);
          const rawAssignee = getValue(['Nhân viên', 'Nhan vien', 'Assignee', 'Staff', 'Người thực hiện']);

          // Find priority from string
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          const pStr = rawPriority?.toString().toUpperCase();
          if (pStr === 'CAO' || pStr === 'HIGH') priority = 'HIGH';
          if (pStr === 'THẤP' || pStr === 'LOW') priority = 'LOW';

          // Handle date from Excel
          let expectedEndDate = rawDate || '';
          if (expectedEndDate) {
            const dateParts = expectedEndDate.toString().match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
            if (dateParts) {
              let [_, day, month, year] = dateParts;
              if (year.length === 2) year = '20' + year;
              const d = new Date(`${year}-${month}-${day}`);
              if (!isNaN(d.getTime())) {
                expectedEndDate = d.toISOString().split('T')[0];
              }
            } else {
              const d = new Date(expectedEndDate);
              if (!isNaN(d.getTime())) {
                expectedEndDate = d.toISOString().split('T')[0];
              }
            }
          }

          return {
            code: rawCode || '',
            title: rawTitle || '',
            objective: rawObjective || '',
            priority: priority,
            expectedEndDate: expectedEndDate,
            assigneeName: rawAssignee || '',
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
