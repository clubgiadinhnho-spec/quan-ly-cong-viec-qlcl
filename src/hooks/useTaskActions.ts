import { useCallback } from 'react';
import { Task, User } from '../types';
import { prepareTaskUpdates } from '../services/taskService';

interface UseTaskActionsProps {
  tasks: Task[];
  currentUser: User | null;
  allUsers: User[];
  firebaseAddTask: (task: Omit<Task, 'id'>) => Promise<void>;
  firebaseUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  firebaseDeleteTask: (id: string) => Promise<void>;
  firebaseAddLog?: (log: any) => Promise<void>;
  firebaseSendPrivateMsg?: (content: string, senderId: string, receiverId: string) => Promise<void>;
}

export const useTaskActions = ({
  tasks,
  currentUser,
  allUsers,
  firebaseAddTask,
  firebaseUpdateTask,
  firebaseDeleteTask,
  firebaseAddLog,
  firebaseSendPrivateMsg
}: UseTaskActionsProps) => {

  const addTask = useCallback(async (taskData: any) => {
    const lastNum = tasks.reduce((max, t) => {
      const num = parseInt((t.code || '').replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    
    let attachmentUrl = "";
    let attachmentName = "";

    if (taskData.attachment instanceof File) {
      attachmentName = taskData.attachment.name;
      attachmentUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(taskData.attachment);
      });
    }

    const isManagement = currentUser?.role === 'Admin' || currentUser?.role === 'Leader' || !!currentUser?.delegatedPermissions?.canCreateTask;

    if (currentUser?.role === 'Staff' && !!currentUser?.delegatedPermissions?.canCreateTask && firebaseAddLog) {
      await firebaseAddLog({
        type: 'DELEGATED_ACTION',
        userId: currentUser.id,
        details: `Nhân viên ${currentUser.name} sử dụng quyền ủy quyền để khởi tạo công việc mới: ${taskData.title}`,
        metadata: { taskId: taskData.id }
      });
    }

    const newTask: Omit<Task, 'id'> = {
      code: `C${String(lastNum + 1).padStart(4, '0')}`,
      issueDate: new Date().toISOString().split('T')[0],
      title: taskData.title || '',
      objective: taskData.objective || '',
      assigneeId: taskData.assigneeId || currentUser?.id || '',
      startDate: taskData.startDate || new Date().toISOString().split('T')[0],
      expectedEndDate: taskData.expectedEndDate || '',
      extensionDate: taskData.extensionDate || null,
      prevProgress: '',
      currentUpdate: '',
      history: [{ 
        version: 1, 
        content: isManagement ? 'Khởi tạo công việc.' : 'Khởi tạo công việc (Chờ xác nhận).', 
        timestamp: new Date().toISOString(), 
        authorId: currentUser?.id || '' 
      }],
      status: isManagement ? 'IN_PROGRESS' : 'AWAITING_CONFIRMATION',
      priority: taskData.priority || 'MEDIUM',
      isHighlighted: false,
      isLocked: false,
      attachmentUrl,
      attachmentName,
      updatedAt: new Date().toISOString(),
      isNewSoldier: false,
      authorId: currentUser?.id || '',
    };
    await firebaseAddTask(newTask);

    if (firebaseAddLog && currentUser) {
      await firebaseAddLog({
        type: 'TASK_CREATE',
        userId: currentUser.id,
        details: `Nhân viên ${currentUser.name} đã khởi tạo công việc mới: [${newTask.code}] ${newTask.title}`,
      });
    }
  }, [tasks, currentUser, firebaseAddTask, firebaseAddLog]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Logic đặc biệt cho yêu cầu hoàn tác
    if (updates.requestUndo === 'PENDING' && currentUser && firebaseSendPrivateMsg) {
      const admins = allUsers.filter(u => u.role === 'Admin');
      const message = `[HỆ THỐNG] Nhân viên ${currentUser.name} yêu cầu HOÀN TÁC công việc: ${task.code} - ${task.title}. Bấm vào đây để xem chi tiết. #UNDO_${id}`;
      
      admins.forEach(admin => {
        if (admin.id !== currentUser.id) {
          firebaseSendPrivateMsg(message, currentUser.id, admin.id);
        }
      });
    }

    const preparedUpdates = prepareTaskUpdates(task, updates, currentUser, allUsers);
    await firebaseUpdateTask(id, preparedUpdates);

    // Logging if there are history changes
    if (firebaseAddLog && currentUser && preparedUpdates.history && preparedUpdates.history.length > task.history.length) {
      const latestEntry = preparedUpdates.history[preparedUpdates.history.length - 1];
      await firebaseAddLog({
        type: 'TASK_UPDATE',
        userId: currentUser.id,
        details: `Nhân viên ${currentUser.name} đã cập nhật công việc [${task.code}]: ${latestEntry.content}`,
        targetId: id
      });
    }
  }, [tasks, currentUser, allUsers, firebaseUpdateTask, firebaseSendPrivateMsg, firebaseAddLog]);

  const addTaskComment = useCallback((taskId: string, content: string) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const newComments = [...(task.comments || [])];
    newComments.push({
      id: Math.random().toString(36).substr(2, 9),
      authorId: currentUser.id,
      content,
      timestamp: new Date().toISOString()
    });
    firebaseUpdateTask(taskId, { comments: newComments });
  }, [tasks, currentUser, firebaseUpdateTask]);

  const updateTaskCommentReactions = useCallback((taskId: string, commentId: string, emoji: string) => {
    if (!currentUser) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task || !task.comments) return;

    const newComments = task.comments.map(c => {
      if (c.id === commentId) {
        const reactions = [...(c.reactions || [])];
        const existingIdx = reactions.findIndex(r => r.userId === currentUser.id && r.emoji === emoji);
        
        if (existingIdx > -1) {
          reactions.splice(existingIdx, 1);
        } else {
          // Zalo style: typically one emoji per user? Or multiple?
          // Let's do: clicking same emoji toggles it. 
          // Optional: clicking different emoji replaces if we want single reaction per user, but let's allow multiple for now as "reactions".
          reactions.push({ userId: currentUser.id, emoji });
        }
        return { ...c, reactions };
      }
      return c;
    });

    firebaseUpdateTask(taskId, { comments: newComments });
  }, [tasks, currentUser, firebaseUpdateTask]);

  return {
    addTask,
    updateTask,
    addTaskComment,
    updateTaskCommentReactions
  };
};
