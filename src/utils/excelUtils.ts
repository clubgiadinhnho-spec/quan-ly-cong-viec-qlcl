import * as XLSX from 'xlsx';
import { Task, User } from '../types';

export const exportTasksToExcel = (tasks: Task[], users: User[]) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    return `${day}/${month}/${year}`;
  };

  const data = tasks.map((task) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    return {
      'Mã CV': task.code,
      'Nhân viên': task.assigneeName || task.assignedTo || (assignee ? assignee.name : 'Quản Trị Viên'),
      'Nội dung công việc': task.title,
      'Mục tiêu đạt được': task.objective,
      'Hạn hoàn thành': formatDate(task.expectedEndDate),
      'Ưu tiên (CAO/TRUNG BINH/THAP)': task.priority === 'HIGH' ? 'CAO' : task.priority === 'LOW' ? 'THẤP' : 'TRUNG BÌNH',
      'Diễn tiến trước đó': task.prevProgress || '',
      'Cập nhật tiến độ': task.currentUpdate || ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DanhSachCongViec');
  
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `BaoCao_QC_${date}.xlsx`);
};

export const downloadSampleExcel = () => {
  const sampleData = [
    {
      'Nội dung công việc': 'Ví dụ: Kiểm tra chất lượng lô hàng nhựa tháng 4',
      'Mục tiêu đạt được': 'Đảm bảo 100% sản phẩm đạt tiêu chuẩn ISO',
      'Hạn hoàn thành': '2026-05-15',
      'Ưu tiên (CAO/TRUNG BINH/THAP)': 'CAO',
      'Nhân viên (Tên hoặc Email)': 'lenhattruong.tpp@gmail.com',
      'Diễn tiến trước đó': 'Đã lấy mẫu sơ bộ',
      'Cập nhật tiến độ': 'Đang tiến hành đo đạc thông số'
    },
    {
      'Nội dung công việc': 'Ví dụ: Đào tạo quy trình mới cho nhân sự cấp dưới',
      'Mục tiêu đạt được': 'Cả đội nắm vững quy trình vận hành máy thổi',
      'Hạn hoàn thành': '2026-05-20',
      'Ưu tiên (CAO/TRUNG BINH/THAP)': 'TRUNG BINH',
      'Nhân viên (Tên hoặc Email)': 'tan.vo@tanphuvietnam.vn',
      'Diễn tiến trước đó': '',
      'Cập nhật tiến độ': 'Đã soạn xong giáo án'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MauNhapLieu');
  
  XLSX.writeFile(workbook, 'Mau_Nhap_Lieu_QC.xlsx');
};

export const importTasksFromExcel = (file: File): Promise<Partial<Task>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // { raw: false } means XLSX will try to format cells based on their format string (like dates)
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

        const tasks: Partial<Task>[] = json.map(row => {
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          const pVal = row['Ưu tiên (CAO/TRUNG BINH/THAP)']?.toString().toUpperCase();
          if (pVal === 'CAO') priority = 'HIGH';
          if (pVal === 'THAP' || pVal === 'THẤP') priority = 'LOW';

          return {
            title: row['Nội dung công việc'] || '',
            objective: row['Mục tiêu đạt được'] || '',
            priority: priority,
            expectedEndDate: row['Hạn hoàn thành'] || '',
            assigneeName: row['Nhân viên'] || row['Nhân viên (Tên hoặc Email)'] || '',
            assigneeId: row['Nhân viên (Tên hoặc Email)'] || '',
            prevProgress: row['Diễn tiến trước đó'] || '',
            currentUpdate: row['Cập nhật tiến độ'] || ''
          };
        });

        resolve(tasks);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
