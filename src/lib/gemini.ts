import { GoogleGenAI } from '@google/genai';
import { Task, User } from '../types';

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export async function getPerformanceAdvice(user: User, tasks: Task[]) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    return "Sếp Trường ơi, Robot chưa được nạp khóa API trên Vercel. Sếp kiểm tra lại nhé!";
  }

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.assigneeId === user.id);
  const ongoingTasks = tasks.filter(t => t.status === 'IN_PROGRESS' && t.assigneeId === user.id);
  
  const prompt = `
    Bạn là một chuyên gia tư vấn quản lý năng suất. Hãy phân tích hiệu suất làm việc của nhân viên sau:
    Tên: ${user.name}
    Số lượng công việc đã hoàn thành: ${completedTasks.length}
    Số lượng công việc đang thực hiện: ${ongoingTasks.length}
    
    Dữ liệu công việc: ${JSON.stringify(completedTasks.map(t => ({ title: t.title, duration: t.actualEndDate })))}
    
    Hãy đưa ra 3 lời khuyên ngắn gọn, thực tế giúp nhân viên này cải thiện năng suất hoặc duy trì phong độ. 
    Format: Tiếng Việt, chuyên nghiệp, khích lệ.
  `;

  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Không thể nhận câu trả lời từ AI lúc này.";
  } catch (error) {
    console.error('Gemini Error:', error);
    return "Không thể kết nối với AI lúc này. Hãy thử lại sau.";
  }
}
