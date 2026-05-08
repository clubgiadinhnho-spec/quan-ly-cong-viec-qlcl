import { useCallback, ChangeEvent } from 'react';
import { Task, User } from '../types';
import { exportTasksToExcel, importTasksFromExcel } from '../utils/excelUtils';

interface ExcelHandlersProps {
  currentUser: User | null;
  tasks: Task[];
  allUsers: User[];
  firebaseAddTask: (task: Omit<Task, 'id'>) => Promise<void>;
  setConfirmModal: (modal: any) => void;
}

export const useExcelHandlers = ({
  currentUser,
  tasks,
  allUsers,
  firebaseAddTask,
  setConfirmModal
}: ExcelHandlersProps) => {

  const handleExportExcel = useCallback(() => {
    if (currentUser?.role !== "Admin" && !currentUser?.delegatedPermissions?.canExportExcel) return;
    exportTasksToExcel(tasks, allUsers);
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

      setConfirmModal({
        show: true,
        title: "XÁC NHẬN NHẬP DỮ LIỆU",
        message: `Bạn có muốn nạp ${importedTasks.length} công việc từ file Excel này không?`,
        onConfirm: async () => {
          setConfirmModal({ show: false, title: "", message: "", onConfirm: () => {} });

          let lastNum = tasks.reduce((max, t) => {
            const num = parseInt((t.code || "").replace(/\D/g, "")) || 0;
            return num > max ? num : max;
          }, 0);

          let successCount = 0;
          let failCount = 0;

          for (const tData of importedTasks) {
            try {
              lastNum++;
              let assigneeId = "";
              let assigneeName = tData.assigneeName || "";

              if (tData.assigneeId || tData.assigneeName) {
                const searchStr = (tData.assigneeId || tData.assigneeName || "").toString().toLowerCase();
                const matchedUser = allUsers.find(u => 
                  (u.companyEmail || "").toLowerCase() === searchStr ||
                  (u.personalEmail || "").toLowerCase() === searchStr ||
                  (u.name || "").toLowerCase() === searchStr ||
                  (u.name || "").toLowerCase().includes(searchStr)
                );
                if (matchedUser) {
                  assigneeId = matchedUser.id;
                  assigneeName = matchedUser.name;
                }
              }

              const newTask: Omit<Task, "id"> = {
                code: `C${String(lastNum).padStart(4, "0")}`,
                issueDate: new Date().toISOString().split("T")[0],
                title: tData.title || "Không có tiêu đề",
                objective: tData.objective || "",
                assigneeId: assigneeId,
                assigneeName: assigneeName,
                startDate: new Date().toISOString().split("T")[0],
                expectedEndDate: tData.expectedEndDate || "",
                prevProgress: tData.prevProgress || "",
                currentUpdate: tData.currentUpdate || "",
                history: [{
                  version: 1,
                  content: "Nhập từ file Excel.",
                  timestamp: new Date().toISOString(),
                  authorId: currentUser?.id || "system",
                }],
                status: "PENDING",
                priority: tData.priority || "MEDIUM",
                isHighlighted: false,
                isLocked: false,
                updatedAt: new Date().toISOString(),
              };
              await firebaseAddTask(newTask);
              successCount++;
            } catch (err) {
              console.error("Error importing row:", err);
              failCount++;
            }
          }
          alert(`Đã nạp thành công ${successCount} công việc.${failCount > 0 ? ` Có ${failCount} dòng bị lỗi.` : ""}`);
        },
      });

      if (e.target) e.target.value = "";
    } catch (err) {
      console.error("Import error:", err);
      alert("Đã có lỗi xảy ra khi nhập file Excel. Vui lòng kiểm tra định dạng.");
    }
  }, [currentUser, tasks, allUsers, firebaseAddTask, setConfirmModal]);

  return { handleExportExcel, handleImportExcel };
};
