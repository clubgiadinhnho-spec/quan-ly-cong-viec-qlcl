import { GoogleGenAI } from "@google/genai";
import { Task, TaskComment } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAi = () => {
  if (!aiInstance) {
    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const generateQCDExplanation = async (
  role: 'Staff' | 'Admin',
  task: Task,
  field: 'QUALITY' | 'COST' | 'DELIVERY',
  score: number
): Promise<string> => {
  const chatContext = task.comments?.map(c => `[${c.authorId}]: ${c.content}`).join('\n') || 'Không có thảo luận trong chat.';
  
  const systemPrompt = role === 'Admin' 
    ? "Bạn là Trưởng phòng Trường (Lãnh đạo). Bạn đang nhận xét kết quả công việc của nhân viên." 
    : "Bạn là nhân viên đang giải trình kết quả công việc của chính mình.";

  const prompt = `${systemPrompt}
Dựa vào các thông tin sau:
- Tên công việc: ${task.title}
- Mục tiêu: ${task.objective}
- Chỉ số đánh giá: ${field}
- Mức điểm người dùng chọn: ${score}/5
- Nội dung thảo luận trong Chat:
${chatContext}

YÊU CẦU:
1. ${role === 'Admin' 
    ? "Viết lời nhận xét ngắn gọn (dưới 30 từ). Nếu chat không có phàn nàn, hãy dùng: 'Ghi nhận kết quả tốt, khớp với trao đổi trong khung chat.'" 
    : "Viết 1 câu giải trình (dưới 30 từ) minh bạch, thuyết phục, tập trung vào đóng góp cá nhân hoặc kết quả đạt được dựa trên trao đổi trong chat."}
2. Kết quả trả về CHỈ bao gồm câu văn, không thêm tiền tố hay hậu tố.
3. Luôn giữ thái độ chuyên nghiệp.`;

  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY && !process.env.GEMINI_API_KEY) {
      return "Sếp Trường ơi, Robot chưa được nạp khóa API trên Vercel. Sếp kiểm tra lại nhé!";
    }

    const ai = getAi();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || (role === 'Admin' ? 'Ghi nhận kết quả tốt.' : 'Đã hoàn thành theo mục tiêu đề ra.');
  } catch (error) {
    console.error("Gemini Error:", error);
    return role === 'Admin' ? 'Ghi nhận kết quả tốt.' : 'Đã hoàn thành theo mục tiêu đề ra.';
  }
};
