import { useCallback, ChangeEvent } from 'react';
import { Task, User } from '../types';
import { exportTasksToExcel, importTasksFromExcel } from '../utils/excelUtils';
import { db } from '../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

interface ExcelHandlersProps {
  currentUser: User | null;
  tasks: Task[];
  allUsers: User[];
  firebaseAddTask: (task: Omit<Task, 'id'>) => Promise<void>;
  setConfirmModal: (modal: any) => void;
  activeTab: string;
}

export const useExcelHandlers = ({
  currentUser,
  tasks,
  allUsers,
  firebaseAddTask,
  setConfirmModal,
  activeTab
}: ExcelHandlersProps) => {

  const handleExportExcel = useCallback((tasksToExport?: Task[], customFileName?: string) => {
    if (currentUser?.role !== "Admin" && !currentUser?.delegatedPermissions?.canExportExcel) return;
    
    // Filter tasks based on current context (tab) if no tasksToExport provided
    let listToExport = tasksToExport || tasks;
    
    exportTasksToExcel(listToExport, allUsers, customFileName);
  }, [currentUser, tasks, allUsers]);

  const handleImportExcel = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    if (currentUser?.role !== "Admin" && !currentUser?.delegatedPermissions?.canImportExcel) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedTasks = await importTasksFromExcel(file);
      if (importedTasks.length === 0) {
        alert("Không tìm thấy dữ liệu trong file Excel.");
        return;
      }

      // Determine current tab status for context-aware import - ADMIN ALWAYS GOES TO MAIN BOARD AS PER REQUEST
      let currentTabStatus: Task['status'] = 'PENDING';
      let isWaitingApproval = false;

      if (currentUser?.role === 'Admin') {
        currentTabStatus = 'APPROVED';
        isWaitingApproval = false;
      } else if (activeTab === 'tasks') {
        currentTabStatus = 'APPROVED';
        isWaitingApproval = false;
      } else if (activeTab === 'pending_approval') {
        currentTabStatus = 'APPROVED';
        isWaitingApproval = true;
      } else if (activeTab === 'pending_confirmation' || activeTab === 'new_proposals') {
        currentTabStatus = 'PENDING';
        isWaitingApproval = false;
      } else if (activeTab === 'completed_tasks') {
        currentTabStatus = 'COMPLETED';
        isWaitingApproval = false;
      } else if (activeTab === 'trash') {
        currentTabStatus = 'DELETED';
        isWaitingApproval = false;
      }

      setConfirmModal({
        show: true,
        title: <span translate="no" className="notranslate">XÁC NHẬN NHẬP DỮ LIỆU</span>,
        message: currentUser?.role === 'Admin' 
          ? `Hệ thống sẽ nạp ${importedTasks.length} quân lính trực tiếp vào BẢNG CÔNG VIỆC CHÍNH. Bạn có chắc chắn không?`
          : `Hệ thống sẽ nạp ${importedTasks.length} quân lính vào TRANG HIỆN TẠI (${activeTab.toUpperCase()}). Bạn có chắc chắn không?`,
        onConfirm: async () => {
          setConfirmModal({ show: false, title: "", message: "", onConfirm: () => {} });

          let successCount = 0;
          let failCount = 0;

          // Vòng lặp v61 lõi - Nạp từng dòng để đảm bảo không ngắt quãng
          for (const tData of importedTasks) {
            try {
              const newTask: any = {
                code: tData.code || tData['MÃ SỐ'] || tData['Mã công việc'] || tData['A'] || "",
                category: tData.category || tData['[PHÂN LOẠI]'] || tData['Phân loại công việc'] || tData['B'] || "",
                assigneeName: tData.personName || tData['NHÂN SỰ'] || tData['Nhân sự thực hiện'] || tData['C'] || "",
                title: tData.title || tData['HẠNG MỤC CÔNG VIỆC'] || tData['Hạng mục công việc'] || tData['D'] || "Không có tiêu đề",
                objective: tData.objective || tData['MỤC TIÊU ĐẠT ĐƯỢC'] || tData['Mục tiêu đạt được'] || tData['E'] || "",
                startDate: tData.startDate || tData['NGÀY BẤT ĐẦU'] || tData['Ngày bắt đầu'] || tData['F'] || "",
                expectedEndDate: tData.deadline || tData['HẠN HOÀN THÀNH'] || tData['Hạn hoàn thành'] || tData['G'] || "",
                recurrence: tData.cycle || tData['CHU KỲ LẶP'] || tData['Chu kỳ lặp'] || tData['K'] || "NONE",
                // Logic gán Status dựa theo trang hiện tại (context)
                status: currentTabStatus,
                waitingApproval: isWaitingApproval,
                updatedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                lastActionAt: new Date().toISOString(),
                currentUpdate: tData.currentUpdate || tData['CẬP NHẬT'] || "",
                isNewInBoard: true,
                priority: "MEDIUM"
              };

              // Mapping recurrence string to enum if needed
              if (newTask.recurrence === 'KHÔNG LẶP') newTask.recurrence = 'NONE';
              if (newTask.recurrence === 'HÀNG NGÀY') newTask.recurrence = 'DAILY';
              if (newTask.recurrence === 'HÀNG TUẦN') newTask.recurrence = 'WEEKLY';
              if (newTask.recurrence === 'HÀNG THÁNG') newTask.recurrence = 'MONTHLY';

              await firebaseAddTask(newTask);
              successCount++;
            } catch (err) {
              console.error("Error importing row:", err);
              failCount++;
            }
          }

          alert(`Đã nạp thành công ${successCount} công việc.${failCount > 0 ? ` Có ${failCount} dòng bị lỗi.` : ""}`);
          console.log('%c BÁO CÁO ANH TRƯỜNG: ĐƯỜNG TRUYỀN ĐÃ THÔNG, MỜI ANH NHẤN NÚT NHẬP ĐỂ KHỞI TẠO QUÂN LÍNH! ', 'background: #222; color: #bada55');
        },
      });

      if (e.target) e.target.value = "";
    } catch (err) {
      console.error("Import error:", err);
      alert("Đã có lỗi xảy ra khi nhập file Excel. Vui lòng kiểm tra định dạng.");
    }
  }, [currentUser, activeTab, firebaseAddTask, setConfirmModal]);

  const handleSuperBackup = useCallback(async () => {
    // Permit both Admins and Delegated Users with Super Backup permissions
    if (currentUser?.role !== "Admin" && !currentUser?.delegatedPermissions?.canAccessSuperBackup) {
      alert("Bạn không có quyền thực hiện chức năng SIÊU BACKUP.");
      return;
    }

    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2); // 2-digit year (yy)
    const dateStr = `${dd}${mm}${yy}`; // ddmmyy exactly
    
    // DeXuat: status === 'PENDING' && !deletedAt
    const deXuat = tasks.filter(t => t.status === 'PENDING' && !t.deletedAt);
    const bangChinh = tasks.filter(t => t.status === 'APPROVED' && !t.waitingApproval && !t.deletedAt);
    const trinhDuyet = tasks.filter(t => t.waitingApproval && !t.deletedAt);
    const hoanThanh = tasks.filter(t => t.status === 'COMPLETED' && !t.deletedAt);
    const thungRac = tasks.filter(t => t.deletedAt);

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // Export 5 Excel files sequentially
      exportTasksToExcel(deXuat, allUsers, `Backup_DeXuat_${dateStr}.xlsx`);
      await sleep(800);
      exportTasksToExcel(bangChinh, allUsers, `Backup_BangChinh_${dateStr}.xlsx`);
      await sleep(800);
      exportTasksToExcel(trinhDuyet, allUsers, `Backup_TrinhDuyet_${dateStr}.xlsx`);
      await sleep(800);
      exportTasksToExcel(hoanThanh, allUsers, `Backup_HoanThanh_${dateStr}.xlsx`);
      await sleep(800);
      exportTasksToExcel(thungRac, allUsers, `Backup_ThungRac_${dateStr}.xlsx`);
      await sleep(800);

      // Fetch live data from Firestore for full JSON backup
      const gTasksSnap = await getDocs(collection(db, 'tasks'));
      const tasksData = gTasksSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const profilesSnap = await getDocs(collection(db, 'user_profiles'));
      const profilesData = profilesSnap.docs.map(d => {
        const data = d.data();
        return {
          ...data,
          docId: d.id,
          uniqueKey: data.uniqueKey || d.id,
          id: data.id || ''
        };
      });

      const categoriesSnap = await getDocs(collection(db, 'task_categories'));
      const categoriesData = categoriesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const backupPayload = {
        tasks: tasksData,
        user_profiles: profilesData,
        task_categories: categoriesData,
        backupAt: new Date().toISOString()
      };

      const jsonFileName = `Backup_FullHeThong_JSON_${dateStr}.json`;
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupPayload, null, 2))}`;
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', jsonFileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      alert("Hệ thống đã kích hoạt lệnh SIÊU BACKUP - 5 file Excel và 1 file JSON Sao lưu hệ thống đã được tải xuống thành công.");
    } catch (err: any) {
      console.error('Backup during Super Backup failed:', err);
      alert(`Đã xảy ra lỗi khi thực hiện SIÊU BACKUP. Chi tiết lỗi: ${err?.message || err}`);
    }
  }, [currentUser, tasks, allUsers]);

  return { handleExportExcel, handleImportExcel, handleSuperBackup };
};
