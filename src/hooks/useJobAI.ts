import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, User, AIChatMessage } from '../types';
import { getTaskDeadlineStatus } from '../lib/dateUtils';

interface useJobAIProps {
  tasks: Task[];
  currentUser: User | null;
  sendAiMessage: (msg: Omit<AIChatMessage, 'id'>) => Promise<void>;
  aiMessages: AIChatMessage[];
  users: User[];
}

export const useJobAI = ({
  tasks,
  currentUser,
  sendAiMessage,
  aiMessages,
  users
}: useJobAIProps) => {
  const lastRemindTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  // THIẾT QUÂN LUẬT: Lưu vết ID đã nhắc trong lần quét này để tránh lag Firebase gây nhắc trùng
  const sessionRemindedIds = useRef<Set<string>>(new Set());
  
  const tasksRef = useRef(tasks);
  const usersRef = useRef(users);
  const sendAiMessageRef = useRef(sendAiMessage);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  useEffect(() => {
    sendAiMessageRef.current = sendAiMessage;
  }, [sendAiMessage]);

  useEffect(() => {
    // THIẾT QUÂN LUẬT: JOB chỉ chạy trên máy của Admin để tránh nhắc trùng/đè dữ liệu
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || 
                    currentUser?.uniqueKey === 'LeNhatTruong0907767304' || 
                    currentUser?.id === 'lenhattruong.caphef1@gmail.com';
    
    if (!currentUser || !isAdmin) return;

    const checkAndRemind = async () => {
      // THIẾT QUÂN LUẬT: Khóa xử lý để tránh race condition
      if (isProcessingRef.current) return;

      const currentTasks = tasksRef.current;
      if (currentTasks.length === 0) return;

      const nowMs = Date.now();
      // Giới hạn tần suất tối thiểu 20s giữa các lần bắt đầu nhắc toàn cục
      if (nowMs - lastRemindTimeRef.current < 20000) return; 

      isProcessingRef.current = true;
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Lấy danh sách ID nhân viên (không nhắc Admin)
        const allAssignees = Array.from(new Set(currentTasks.map(t => t.assigneeId).filter(id => !!id))) as string[];

        for (const assigneeId of allAssignees) {
          // Nếu bộ nhớ đệm session đã nhắc người này rồi thì bỏ qua (Tránh lag Firebase)
          if (sessionRemindedIds.current.has(assigneeId)) continue;

          // Kiểm tra trong data thực tế xem có việc nào đang Vàng không
          const currentReminding = currentTasks.find(t => t.assigneeId === assigneeId && t.aiReminderResponded === false);
          if (currentReminding) {
            sessionRemindedIds.current.add(assigneeId);
            continue;
          }

          // Tìm các task hợp lệ để nhắc cho người này (Chưa phản hồi thực sự)
          const candidateTasks = currentTasks.filter(t => 
            t.assigneeId === assigneeId && 
            t.status === 'APPROVED' && 
            !t.waitingApproval &&
            (t.aiReminderResponded === undefined || t.aiReminderResponded === null)
          );

          if (candidateTasks.length === 0) continue;

          // Sắp xếp ưu tiên việc quan trọng nhất của người đó
          const topTask = [...candidateTasks].sort((a, b) => {
            if (a.priorityOrder && !b.priorityOrder) return -1;
            if (b.priorityOrder && !a.priorityOrder) return 1;
            const statusA = getTaskDeadlineStatus(a);
            const statusB = getTaskDeadlineStatus(b);
            const weight = { 'CRITICAL': 0, 'URGENT': 1, 'WARNING': 2, 'NORMAL': 3 };
            return weight[statusA.status] - weight[statusB.status];
          })[0];

          lastRemindTimeRef.current = Date.now();

          try {
            // Lưu vào vết session ngay lập tức
            sessionRemindedIds.current.add(assigneeId);

            // Đánh dấu vào DB (Màu vàng)
            const taskRef = doc(db, 'tasks', topTask.id);
            await updateDoc(taskRef, {
              aiReminderLastDate: today,
              aiReminderResponded: false,
              aiReminderCreatedAt: new Date().toISOString()
            });

            const assignee = usersRef.current.find(u => u.uniqueKey === topTask.assigneeId || u.id === topTask.assigneeId);
            const name = assignee?.name || 'bạn';

            // FALLBACK BRAIN: Tự ghép câu nhắc từ dữ liệu thô (TIẾT KIỆM QUOTA)
            const deadlineRaw = topTask.expectedEndDate || topTask.dueDate || 'chưa định';
            let formattedDeadline = deadlineRaw;
            if (deadlineRaw.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [y, m, d] = deadlineRaw.split('-');
              formattedDeadline = `${d}/${m}/${y.substring(2)}`;
            } else if (deadlineRaw.includes('-')) {
              formattedDeadline = deadlineRaw.split('-').reverse().join('/');
            }
            const objective = topTask.objective || topTask.title;
            const text = `${name} ơi, hạn ${formattedDeadline} sắp đến, mục tiêu "${objective}" tiến hành đến đâu rồi?`;

            await sendAiMessageRef.current({
              taskId: topTask.id,
              userId: topTask.assigneeId || '',
              role: 'assistant',
              content: text,
              timestamp: new Date().toISOString()
            });

            // Chu kỳ này chỉ nhắc cho 1 người để hệ thống ổn định
            break;

          } catch (error) {
            console.error("AI Remind error:", error);
          }
        }
      } finally {
        isProcessingRef.current = false;
      }
    };

    const interval = setInterval(checkAndRemind, 3000); // Kiểm tra mỗi 3 giây
    checkAndRemind();

    return () => clearInterval(interval);
  }, [currentUser]);
};
