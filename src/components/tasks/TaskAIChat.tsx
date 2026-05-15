
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User, Loader2, Sparkles } from 'lucide-react';
import { Task, AIChatMessage, User as UserType } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { RobotAvatar } from '../common/RobotAvatar';

interface TaskAIChatProps {
  task: Task;
  assigneeName?: string;
  currentUser: UserType;
  messages: AIChatMessage[];
  onSendMessage: (msg: Omit<AIChatMessage, 'id'>) => Promise<void>;
  onClose: () => void;
}

export const TaskAIChat: React.FC<TaskAIChatProps> = ({
  task,
  assigneeName,
  currentUser,
  messages,
  onSendMessage,
  onClose
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus input when chat opens with a slight delay to ensure animation readiness
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Auto-hide logic: 30 seconds
  const resetHideTimer = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      onClose();
    }, 30000);
  };

  useEffect(() => {
    resetHideTimer();

    const handleGlobalEvents = (e: MouseEvent | KeyboardEvent) => {
      // Close on ESC
      if (e instanceof KeyboardEvent && e.key === 'Escape') {
        onClose();
        return;
      }

      // Close on click outside
      if (e instanceof MouseEvent && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleGlobalEvents);
    window.addEventListener('mousedown', handleGlobalEvents);

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      window.removeEventListener('keydown', handleGlobalEvents);
      window.removeEventListener('mousedown', handleGlobalEvents);
    };
  }, [onClose]);

  // Reset timer on input interaction
  useEffect(() => {
    if (input) resetHideTimer();
  }, [input, loading]);
  
  const taskMessages = messages.filter(m => m.taskId === task.id && m.userId === (currentUser.uniqueKey || currentUser.id))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [taskMessages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setLoading(true);

    try {
      // 1. Save user message to Firebase
      await onSendMessage({
        taskId: task.id,
        userId: currentUser.uniqueKey || currentUser.id,
        role: 'user',
        content: userMsg,
        timestamp: new Date().toISOString()
      });

      // 2. Call Gemini
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("Sếp Trường ơi, Robot chưa được nạp khóa API trên Vercel. Sếp kiểm tra lại nhé!");
      }
      const googleAi = new GoogleGenAI({ apiKey });
      const systemPrompt = `Bạn là INOCHI, Robot trợ lý AI chuyên nghiệp và thân thiện. 
Nhiệm vụ của bạn: Nhắc nhở và hỗ trợ người dùng hoàn thành công việc.
Công việc hiện tại: "${task.title}"
Mục tiêu: "${task.objective}"
Hạn hoàn thành: ${task.expectedEndDate}
Người đang nói chuyện với bạn: ${currentUser.name} (${currentUser.role})
Nhân viên phụ trách chính: ${assigneeName || 'Chưa xác định'}

Yêu cầu:
1. Luôn xưng hô lịch sự, thân thiện, xưng "Inochi" và gọi người dùng là "Sếp" hoặc "Bạn" tùy vai trò.
2. Nếu là nhân viên phụ trách: Tập trung vào việc thúc đẩy tiến độ, gợi ý giải pháp.
3. Nếu là Admin: Hỗ trợ phân tích công việc, gợi ý cách quản lý hoặc kiểm tra.
4. Trả lời ngắn gọn, súc tích bằng tiếng Việt.
5. Đây là cuộc hội thoại riêng tư chỉ giữa bạn và người này, người khác không thấy nội dung này.`;

      const response = await googleAi.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...taskMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          })),
          { role: 'user', parts: [{ text: userMsg }] }
        ]
      });

      const aiText = response.text || "Xin lỗi, tôi gặp chút trục trặc. Bạn cần hỗ trợ gì thêm không?";

      // 3. Save AI message to Firebase
      await onSendMessage({
        taskId: task.id,
        userId: currentUser.uniqueKey || currentUser.id,
        role: 'assistant',
        content: aiText,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error("AI Error:", error);
      await onSendMessage({
        taskId: task.id,
        userId: currentUser.uniqueKey || currentUser.id,
        role: 'assistant',
        content: `Đã xảy ra lỗi khi giao tiếp với AI: ${error instanceof Error ? error.message : 'Lỗi không xác định'}. Vui lòng thử lại sau.`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const [dimensions, setDimensions] = useState({ width: 240, height: 320 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: dimensions.width,
      startHeight: dimensions.height,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !resizeRef.current) return;
      
      const newWidth = Math.max(200, resizeRef.current.startWidth + (e.clientX - resizeRef.current.startX));
      const newHeight = Math.max(150, resizeRef.current.startHeight + (e.clientY - resizeRef.current.startY));
      
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div 
      className="absolute left-[45px] top-[-10px] z-[500] flex flex-col pointer-events-none"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <motion.div 
        ref={containerRef}
        drag
        dragMomentum={false}
        initial={{ opacity: 0, scale: 0.9, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -10 }}
        className="relative bg-white rounded-xl shadow-2xl border border-blue-600 pointer-events-auto overflow-visible flex flex-col"
        style={{ width: dimensions.width, height: dimensions.height, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Comic Tail SVG */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
          <path 
            d="M -10 24 L 0 16 L 0 32 Z" 
            fill="white" 
            stroke="#2563eb" 
            strokeWidth="1.5"
          />
        </svg>

        {/* Header Compact - Drag handle */}
        <div className="bg-blue-600 px-2 py-1 flex items-center justify-between shadow-sm cursor-grab active:cursor-grabbing rounded-t-xl shrink-0">
          <div className="flex items-center gap-1">
            <RobotAvatar size={14} animate />
            <div>
              <h3 className="text-white text-[9.5px] font-black uppercase tracking-wider leading-none">INOCHI</h3>
              <p className="text-blue-100 text-[7.5px] font-bold uppercase tracking-tight mt-0.5 opacity-80">{task.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
            <X size={12} />
          </button>
        </div>

        {/* Chat Area Compact */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-1.5 space-y-1.5 bg-blue-50/5 scrollbar-hide"
          style={{ scrollBehavior: 'smooth' }}
        >
          {taskMessages.length === 0 && (
            <div className="text-center py-2">
              <RobotAvatar size={22} className="mx-auto mb-1 opacity-50" />
              <p className="text-[8.5px] text-gray-400 font-bold uppercase tracking-widest leading-none">Lệnh?</p>
            </div>
          )}
          
          {taskMessages.map((msg) => (
            <div 
              key={msg.id}
              className={`flex w-full ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[90%] p-1.5 rounded-lg text-[13px] leading-tight shadow-sm font-medium ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none text-right' 
                  : 'bg-white text-gray-800 border border-blue-100 rounded-bl-none text-left'
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className={`text-[7.5px] mt-0.5 opacity-40 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white p-1 rounded-lg rounded-bl-none border border-blue-100 shadow-sm flex items-center gap-0.5">
                <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="w-0.5 h-0.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar Compact */}
        <div className="p-1.5 bg-white border-t border-blue-50">
          <div className="relative flex items-center bg-gray-50 rounded-md px-1.5 py-0.5 border border-blue-50/50 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <input 
              ref={inputRef}
              type="text"
              placeholder="Chat..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 bg-transparent border-none outline-none text-[13px] font-medium placeholder:text-gray-400"
            />
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleSend();
              }}
              disabled={!input.trim() || loading}
              className="p-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm active:scale-95 ml-1"
            >
              <Send size={10} />
            </button>
          </div>
        </div>
      </motion.div>
      {/* Resizer Handle */}
      <div 
        onMouseDown={startResizing}
        className="absolute bottom-[-4px] right-[-4px] w-4 h-4 cursor-nwse-resize z-[501] bg-white/20 hover:bg-blue-400/30 rounded-full flex items-center justify-center transition-colors pointer-events-auto"
        title="Kéo để thay đổi kích thước"
      >
        <div className="w-1.5 h-1.5 border-r border-b border-blue-600/50"></div>
      </div>
    </div>
  );
};
