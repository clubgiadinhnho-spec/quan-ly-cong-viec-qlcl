import * as XLSX from 'xlsx';
import { Task, User } from '../types';

export const exportTasksToExcel = (tasks: Task[], users: User[]) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2); // dd/mm/yy
    return `${day}/${month}/${year}`;
  };

  const data = tasks.map((task) => {
    const assignee = users.find(u => u.id === task.assigneeId);
    return {
      'MÃ SỐ': task.code,
      '[PHÂN LOẠI]': task.category || '',
      'NHÂN SỰ': task.assigneeName || task.assignedTo || (assignee ? assignee.name : 'QUẢN TRỊ VIÊN'),
      'HẠNG MỤC CÔNG VIỆC': task.title,
      'MỤC TIÊU ĐẠT ĐƯỢC': task.objective,
      'NGÀY BẮT ĐẦU': formatDate(task.startDate || task.issueDate),
      'HẠN HOÀN THÀNH': formatDate(task.expectedEndDate),
      'NGÀY GIA HẠN': formatDate(task.extensionDate || ''),
      'NGÀY XONG': formatDate(task.actualEndDate || ''),
      'CHU KỲ LẶP': (task.recurrence === 'NONE' || !task.recurrence) ? 'KHÔNG LẶP' : 
                    task.recurrence === 'DAILY' ? 'HÀNG NGÀY' :
                    task.recurrence === 'TRI_DAILY' ? '2-3 NGÀY/LẦN' :
                    task.recurrence === 'WEEKLY' ? 'HÀNG TUẦN' :
                    task.recurrence === 'BI_WEEKLY' ? 'HÀNG 2 TUẦN' :
                    task.recurrence === 'TRI_WEEKLY' ? 'HÀNG 3 TUẦN' :
                    task.recurrence === 'MONTHLY' ? 'HÀNG THÁNG' : task.recurrence,
      'ĐIỂM Q': task.leader_Q ?? (task.leaderQCD?.q || ''),
      'ĐIỂM C': task.leader_C ?? (task.leaderQCD?.c || ''),
      'ĐIỂM D': task.leader_D ?? (task.leaderQCD?.d || ''),
      'NHẬN XÉT QUẢN LÝ': task.managerRemarks ?? '',
      'HỆ SỐ KPI %': task.kpiEfficiency ?? ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DANH SÁCH CÔNG VIỆC');
  
  const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '_');
  XLSX.writeFile(workbook, `BAO_CAO_QC_${dateStr}.xlsx`);
};

export const downloadSampleExcel = () => {
  const sampleData = [
    {
      'NHÂN SỰ': 'Họ tên nhân viên',
      'MÃ PHÂN LOẠI': 'KNN',
      'HẠNG MỤC CÔNG VIỆC': 'Nội dung công việc chính',
      'MỤC TIÊU ĐẠT ĐƯỢC': 'Kết quả cần đạt',
      'NGÀY BẮT ĐẦU': '20/05/26',
      'HẠN HOÀN THÀNH': '25/05/26',
      'CHU KỲ LẶP': 'Không lặp'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MẪU NHẬP LIỆU');
  
  XLSX.writeFile(workbook, 'MAU_NHAP_LIEU_QC.xlsx');
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
        const json = XLSX.utils.sheet_to_json(worksheet, { raw: false }) as any[];

        const parseDate = (val: any) => {
          if (!val || val === '') return '';
          if (typeof val === 'string' && val.includes('/')) {
            const parts = val.split('/');
            if (parts.length === 3) {
              const day = parts[0].padStart(2, '0');
              const month = parts[1].padStart(2, '0');
              const yearRaw = parts[2];
              const year = yearRaw.length === 2 ? '20' + yearRaw : yearRaw;
              return `${year}-${month}-${day}`;
            }
          }
          return val;
        };

        const tasks: Partial<Task>[] = json.map((row) => {
          return {
            assigneeName: row['NHÂN SỰ'] || '',
            category: row['MÃ PHÂN LOẠI'] || '',
            title: row['HẠNG MỤC CÔNG VIỆC'] || '',
            objective: row['MỤC TIÊU ĐẠT ĐƯỢC'] || '',
            startDate: parseDate(row['NGÀY BẮT ĐẦU']),
            expectedEndDate: parseDate(row['HẠN HOÀN THÀNH']),
            recurrence: row['CHU KỲ LẶP'] || 'NONE'
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
