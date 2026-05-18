import * as XLSX from 'xlsx';
import { Task, User } from '../types';

export const exportTasksToExcel = (tasks: Task[], users: User[], fileName?: string) => {
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
      'MÃ SỐ': task.code || '',
      '[PHÂN LOẠI]': task.category || '',
      'NHÂN SỰ': task.assigneeName || task.assignedTo || (assignee ? assignee.name : 'QUẢN TRỊ VIÊN'),
      'HẠNG MỤC CÔNG VIỆC': task.title || '',
      'MỤC TIÊU ĐẠT ĐƯỢC': task.objective || '',
      'NGÀY BẮT ĐẦU': formatDate(task.startDate || task.issueDate || ''),
      'HẠN HOÀN THÀNH': formatDate(task.expectedEndDate || ''),
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
      'CẬP NHẬT': (task.currentUpdate || '')
        .replace(/<\/?[^>]+(>|$)/g, "") // Strip HTML tags
        .replace(/&nbsp;/g, " ")
        .replace(/&gt;/g, ">")
        .replace(/&lt;/g, "<")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim(),
      'HỆ SỐ KPI %': task.kpiEfficiency ?? ''
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'DANH SÁCH CÔNG VIỆC');
  
  const dateStr = new Date().toLocaleDateString('en-GB').replace(/\//g, '');
  const finalFileName = fileName || `BAO_CAO_QC_${dateStr}.xlsx`;
  XLSX.writeFile(workbook, finalFileName);
};

export const downloadSampleExcel = () => {
  const sampleData = [
    {
      'MÃ SỐ': 'MS001',
      '[PHÂN LOẠI]': 'KNN',
      'NHÂN SỰ': 'Họ tên nhân viên',
      'HẠNG MỤC CÔNG VIỆC': 'Nội dung công việc chính',
      'MỤC TIÊU ĐẠT ĐƯỢC': 'Kết quả cần đạt',
      'NGÀY BẮT ĐẦU': '20/05/26',
      'HẠN HOÀN THÀNH': '25/05/26',
      'CHU KỲ LẶP': 'KHÔNG LẶP'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'MẪU NHẬP LIỆU');
  
  XLSX.writeFile(workbook, 'MAU_NHAP_LIEU_QC.xlsx');
};

export const importTasksFromExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Trả về dạng JSON object để áp dụng logic v61
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
        
        // Bổ sung: Nếu muốn map theo cột A, B, C strictly (theo yêu cầu Anh Trường)
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const headers = rawData[0] || [];
        
        const normalizedData = jsonData.map((row: any, index) => {
          const rawRow = rawData[index + 1] || [];
          return {
            ...row,
            // Map theo cột A, B, C, D, E, F, G, K (index 0, 1, 2, 3, 4, 5, 6, 10)
            A: rawRow[0] || "",
            B: rawRow[1] || "",
            C: rawRow[2] || "",
            D: rawRow[3] || "",
            E: rawRow[4] || "",
            F: rawRow[5] || "",
            G: rawRow[6] || "",
            K: rawRow[10] || ""
          };
        });

        resolve(normalizedData);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};
