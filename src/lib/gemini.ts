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

// Cache để giảm Quota AI
const adviceCache: Record<string, { advice: string, timestamp: number }> = {};
const CACHE_TIMEOUT = 1000 * 60 * 30; // 30 phút

export async function getPerformanceAdvice(user: User, tasks: Task[], viewer: User) {
  if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.VITE_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
    return "Sếp Trường ơi, JOB chưa được nạp khóa API trên Vercel. Sếp kiểm tra lại nhé!";
  }

  const isSelf = viewer.id === user.id;
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' && t.assigneeId === user.id);
  const ongoingTasks = tasks.filter(t => t.status === 'IN_PROGRESS' && t.assigneeId === user.id);
  const lateTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.expectedEndDate && new Date(t.expectedEndDate) < new Date());
  
  // Tạo key cho cache dựa trên ID người dùng và số lượng task (summary)
  const cacheKey = `${user.id}-${viewer.id}-${completedTasks.length}-${ongoingTasks.length}-${lateTasks.length}`;
  const now = Date.now();

  if (adviceCache[cacheKey] && (now - adviceCache[cacheKey].timestamp < CACHE_TIMEOUT)) {
    console.log("🚀 [AI Quota] Sử dụng kết quả cũ từ bộ nhớ đệm.");
    return adviceCache[cacheKey].advice;
  }

  const context = isSelf 
    ? "Bạn đang xem phân tích hiệu suất CỦA CHÍNH MÌNH. Hãy đưa ra lời khuyên tự cải thiện."
    : `Bạn là Quản lý/Sếp đang xem phân tích hiệu suất của NHÂN VIÊN "${user.name}". Hãy đưa ra nhận xét quản trị và hướng dẫn cho nhân viên.`;

  const prompt = `
    VAI TRÒ: 
    ${isSelf 
      ? "Bạn là Chuyên gia tư vấn cá nhân. Đang nói chuyện với chính chủ tài khoản." 
      : `Bạn là Cố vấn quản trị. Đang nói chuyện với Sếp (người đang xem báo cáo của nhân viên "${user.name}").`}
    
    DỮ LIỆU HIỆU SUẤT:
    - Nhân viên: ${user.name} (${user.title || 'Chuyên viên'})
    - Công việc đã hoàn thành: ${completedTasks.length}
    - Công việc đang thực hiện: ${ongoingTasks.length}
    - Số lượng việc trễ hạn: ${lateTasks.length}
    
    YÊU CẦU NGHIÊM NGẶT:
    1. Lời khuyên cực kỳ ngắn gọn (tối đa 3-4 dòng), trọng tâm vào công việc.
    2. TUYỆT ĐỐI KHÔNG dùng "**". Dùng dấu ngoặc kép " " để nhấn mạnh các con số hoặc từ khóa quan trọng.
    3. ${isSelf 
        ? "Xưng hô 'Bạn' - 'Tôi'. Tập trung vào tự quản lý." 
        : `Xưng hô 'Sếp' - 'Nhân sự' (hoặc gọi tên nhân viên "${user.name}"). Phân tích cho Sếp thấy nhân sự này đang làm tốt hay tệ ở điểm nào dựa trên con số thực tế.`}
    4. Phải phân biệt rõ: Nếu là Sếp đang xem, hãy dùng giọng điệu quyết đoán, góp ý quản trị. Nếu là cá nhân tự xem, dùng giọng điệu hỗ trợ, nhắc nhở.
    5. Không mở đầu rườm rà. Vào thẳng vấn đề.
    6. Ngôn ngữ: Tiếng Việt.
  `;

  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    const result = response.text?.replace(/\*\*/g, '"') || "Không thể nhận câu trả lời từ AI lúc này.";
    
    // Lưu vào cache
    if (result && !result.includes("Không thể")) {
      adviceCache[cacheKey] = { advice: result, timestamp: now };
    }

    return result;
  } catch (error) {
    console.error('Gemini Error:', error);
    return "Không thể kết nối với AI lúc này. Hãy thử lại sau.";
  }
}
