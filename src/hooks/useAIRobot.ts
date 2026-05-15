
import { useEffect, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Task, User, AIChatMessage } from '../types';
import { GoogleGenAI } from "@google/genai";
import { getTaskDeadlineStatus } from '../lib/dateUtils';

interface useAIRobotProps {
  tasks: Task[];
  currentUser: User | null;
  sendAiMessage: (msg: Omit<AIChatMessage, 'id'>) => Promise<void>;
  aiMessages: AIChatMessage[];
  users: User[];
}

export const useAIRobot = ({
  tasks,
  currentUser,
  sendAiMessage,
  aiMessages,
  users
}: useAIRobotProps) => {
  const lastRemindTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  // THIẾT QUÂN LUẬT: Lưu vết ID đã nhắc trong lần quét này để tránh lag Firebase gây nhắc trùng
  const sessionRemindedIds = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    // THIẾT QUÂN LUẬT: Robot chỉ chạy trên máy của Admin để tránh nhắc trùng/đè dữ liệu
    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN' || 
                    currentUser?.uniqueKey === 'LeNhatTruong09xxxxxxxx' || 
                    currentUser?.id === 'lenhattruong.caphef1@gmail.com';
    
    if (!currentUser || !isAdmin || tasks.length === 0) return;

    const checkAndRemind = async () => {
      // THIẾT QUÂN LUẬT: Khóa xử lý để tránh race condition
      if (isProcessingRef.current) return;

      const nowMs = Date.now();
      // Giới hạn tần suất tối thiểu 20s giữa các lần bắt đầu nhắc toàn cục
      if (nowMs - lastRemindTimeRef.current < 20000) return; 

      isProcessingRef.current = true;
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Lấy danh sách ID nhân viên (không nhắc Admin)
        const allAssignees = Array.from(new Set(tasks.map(t => t.assigneeId).filter(id => !!id))) as string[];

        for (const assigneeId of allAssignees) {
        // Nếu bộ nhớ đệm session đã nhắc người này rồi thì bỏ qua (Tránh lag Firebase)
        if (sessionRemindedIds.current.has(assigneeId)) continue;

        // Kiểm tra trong data thực tế xem có việc nào đang Vàng không
        const currentReminding = tasks.find(t => t.assigneeId === assigneeId && t.aiReminderResponded === false);
        if (currentReminding) {
          sessionRemindedIds.current.add(assigneeId);
          continue;
        }

        // Tìm các task hợp lệ để nhắc cho người này (Chưa phản hồi thực sự)
        const candidateTasks = tasks.filter(t => 
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
            aiReminderResponded: false
          });

          const assignee = users.find(u => u.uniqueKey === topTask.assigneeId || u.id === topTask.assigneeId);
          const name = assignee?.name || 'bạn';

          const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
          if (!apiKey) {
            await sendAiMessage({
              taskId: topTask.id,
              userId: topTask.assigneeId || '',
              role: 'assistant',
              content: "Sếp Trường ơi, Robot chưa được nạp khóa API trên Vercel. Sếp kiểm tra lại nhé!",
              timestamp: new Date().toISOString()
            });
            isProcessingRef.current = false;
            return;
          }

          const googleAi = new GoogleGenAI({ apiKey });
          const prompt = `YÊU CẦU THIẾT QUÂN LUẬT: Bạn là AMORI, trợ lý AI cá nhân. Hãy nhắc nhở nhân viên "${name}" về việc "${topTask.title}". 
          QUY TẮC: Tối đa 10 từ. Hỏi tiến độ. Xưng hô "${name} ơi". Không rườm rà.`;

          const result = await googleAi.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt
          });

          const text = result.text?.trim() || `${name} ơi, tiến độ ${topTask.code} sao rồi?`;

          await sendAiMessage({
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
  }, [currentUser, tasks, sendAiMessage, users]);
};
