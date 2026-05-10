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
  firebaseSendPrivateMsg?: (content: string, senderId: string, receiverId: string) => Promise<void>;
}

export const useTaskActions = ({
  tasks,
  currentUser,
  allUsers,
  firebaseAddTask,
  firebaseUpdateTask,
  firebaseDeleteTask,
  firebaseSendPrivateMsg
}: UseTaskActionsProps) => {

  const addTask = useCallback(async (taskData: any) => {
    const lastNum = tasks.reduce((max, t) => {
      const num = parseInt((t.code || '').replace(/\D/g, '')) || 0;
      return num > max ? num : max;
    }, 0);
    
    let attachmentUrl = taskData.attachmentUrl || "";
    let attachmentName = taskData.attachmentName || "";

    if (!attachmentUrl && taskData.attachment instanceof File) {
      attachmentName = taskData.attachment.name;
      attachmentUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(taskData.attachment);
      });
    }

    const isManagement = currentUser?.role === 'Admin' || !!currentUser?.delegatedPermissions?.canCreateTask;

    const newTask: Omit<Task, 'id'> = {
      code: taskData.code || `C${String(lastNum + 1).padStart(4, '0')}`,
      issueDate: taskData.issueDate || new Date().toISOString().split('T')[0],
      title: taskData.title || '',
      objective: taskData.objective || '',
      category: taskData.category || '',
      assigneeId: taskData.assigneeId || currentUser?.id || '',
      startDate: taskData.startDate || new Date().toISOString().split('T')[0],
      expectedEndDate: taskData.expectedEndDate || '',
      extensionDate: taskData.extensionDate || null,
      prevProgress: '',
      currentUpdate: '',
      history: [{ 
        version: 1, 
        content: taskData.status === 'APPROVED' ? 'Khởi tạo công việc (Đã duyệt).' : 'Khởi tạo công việc (Chờ duyệt).', 
        timestamp: new Date().toISOString(), 
        authorId: taskData.authorId || currentUser?.uniqueKey || currentUser?.id || '' 
      }],
      status: taskData.status || 'PENDING',
      priority: taskData.priority || 'MEDIUM',
      isHighlighted: false,
      isLocked: false,
      recurrence: taskData.recurrence || 'NONE',
      attachmentUrl,
      attachmentName,
      updatedAt: new Date().toISOString(),
      lastUpdatedBy: currentUser?.uniqueKey || currentUser?.id || '',
      lastUpdatedByRole: currentUser?.role || '',
      isNewSoldier: isManagement && taskData.status === 'APPROVED',
      isNewUpdate: !!taskData.isNewUpdate,
      authorId: taskData.authorId || currentUser?.uniqueKey || currentUser?.id || '',
      authorName: taskData.authorName || currentUser?.name || '',
      systemCreatedAt: taskData.systemCreatedAt || new Date().toISOString()
    };
    await firebaseAddTask(newTask);
  }, [tasks, currentUser, firebaseAddTask]);

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
    
    // Safety: Ensure lastUpdatedByRole is set
    if (currentUser && !preparedUpdates.lastUpdatedByRole) {
      preparedUpdates.lastUpdatedByRole = currentUser.role;
    }
    
    await firebaseUpdateTask(id, preparedUpdates);
  }, [tasks, currentUser, allUsers, firebaseUpdateTask, firebaseSendPrivateMsg]);

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
    firebaseUpdateTask(taskId, { 
      comments: newComments,
      lastActionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
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
          reactions.push({ userId: currentUser.id, emoji });
        }
        return { ...c, reactions };
      }
      return c;
    });

    firebaseUpdateTask(taskId, { 
      comments: newComments,
      lastActionAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }, [tasks, currentUser, firebaseUpdateTask]);

  return {
    addTask,
    updateTask,
    addTaskComment,
    updateTaskCommentReactions
  };
};
