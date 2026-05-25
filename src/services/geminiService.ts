import { Task } from "../types";

// Cache để giảm Quota AI
const qcdCache: Record<string, { result: string, timestamp: number }> = {};
const CACHE_TIMEOUT = 1000 * 60 * 60; // 1 giờ

export const generateQCDExplanation = async (
  role: 'Staff' | 'Admin',
  task: Task,
  field: 'QUALITY' | 'COST' | 'DELIVERY',
  score: number
): Promise<string> => {
  // Key dựa trên ID công việc, vai trò, tiêu chí và điểm số
  const cacheKey = `${task.id}-${role}-${field}-${score}`;
  const now = Date.now();

  if (qcdCache[cacheKey] && (now - qcdCache[cacheKey].timestamp < CACHE_TIMEOUT)) {
    console.log("🚀 [AI Quota] Sử dụng kết quả giải trình từ bộ nhớ đệm.");
    return qcdCache[cacheKey].result;
  }

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
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to generate content');
    }

    const data = await response.json();
    const result = data.text || (role === 'Admin' ? 'Ghi nhận kết quả tốt.' : 'Đã hoàn thành theo mục tiêu đề ra.');
    
    // Lưu cache
    if (result && !result.includes("Sếp Trường ơi")) {
      qcdCache[cacheKey] = { result, timestamp: now };
    }

    return result;
  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return role === 'Admin' ? 'Ghi nhận kết quả tốt.' : 'Đã hoàn thành theo mục tiêu đề ra.';
  }
};
