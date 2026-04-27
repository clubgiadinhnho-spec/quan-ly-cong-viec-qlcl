import { GoogleGenAI } from '@google/genai';
import { Task, User } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getPerformanceAdvice(user: User, tasks: Task[]) {
  if (!process.env.GEMINI_API_KEY) return "Vui lòng cấu hình API Key để nhận lời khuyên từ AI.";

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
