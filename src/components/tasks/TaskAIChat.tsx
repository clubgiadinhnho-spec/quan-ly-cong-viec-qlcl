
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, X, User, Loader2, Sparkles } from 'lucide-react';
import { Task, AIChatMessage, User as UserType } from '../../types';
import { JobAvatar } from '../common/JobAvatar';
import { SupIconSVG } from '../common/SupIconSVG';
import { JobIconSVG } from '../common/JobIconSVG';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface TaskAIChatProps {
  task: Task;
  assigneeName?: string;
  currentUser: UserType;
  messages: AIChatMessage[];
  onSendMessage: (msg: Omit<AIChatMessage, 'id'>) => Promise<void>;
  onClose: () => void;
}

const getFriendlyMentorName = (name: string | undefined) => {
  if (!name) return "bạn";
  const trimmed = name.trim();
  if (trimmed.includes("Mỹ Tân") || trimmed.endsWith("Tân")) {
    return "Chị @Tân";
  }
  if (trimmed.includes("Nhật Trường") || trimmed.endsWith("Trường")) {
    return "Anh @Trường";
  }
  if (trimmed.includes("Nhựt Hùng") || trimmed.endsWith("Hùng")) {
    return "Anh @Hùng";
  }
  if (trimmed.includes("Phan Tú") || trimmed.endsWith("Tú")) {
    return "Bạn @Tú";
  }
  // Fallback to name's last word
  const parts = trimmed.split(' ');
  const lastName = parts[parts.length - 1];
  return `bạn @${lastName}`;
};

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

  const messagesLength = taskMessages.length;

  const renderMessageContent = (content: string) => {
    if (!content) return null;
    const lines = content.split('\n');
    return (
      <div className="space-y-1 text-left text-[12.5px] leading-tight select-none">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={idx} className="h-0.5" />;

          // Match S.U.P Boss chỉ thị
          if (trimmed.includes('S.U.P Boss chỉ thị') || trimmed.includes('S.U.P chỉ thị')) {
            const cleanText = trimmed.replace(/^[🗣️👥🤖\s*-]+/, '').trim().replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').replace(/\*\*/g, '"');
            return (
              <div key={idx} className="flex items-center gap-1.5 font-extrabold text-orange-600 mt-2 mb-1 bg-orange-100/50 p-1 px-1.5 rounded border border-orange-200/50 w-fit">
                <SupIconSVG size={13} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-wide">{cleanText}</span>
              </div>
            );
          }

          // Match JOB phân tích kỹ thuật
          if (trimmed.includes('JOB phân tích kỹ thuật') || trimmed.includes('JOB phân tích')) {
            const cleanText = trimmed.replace(/^[🤖👥🗣️\s*-]+/, '').trim().replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').replace(/\*\*/g, '"');
            return (
              <div key={idx} className="flex items-center gap-1.5 font-extrabold text-blue-600 mt-2 mb-1 bg-blue-100/50 p-1 px-1.5 rounded border border-blue-200/50 w-fit">
                <JobIconSVG size={13} className="shrink-0" />
                <span className="text-[10px] uppercase tracking-wide">{cleanText}</span>
              </div>
            );
          }

          // Match next action
          if (trimmed.includes('Đầu ra tiếp theo [LÀM NGAY]') || trimmed.includes('Đầu ra tiếp theo')) {
            const cleanText = trimmed.replace(/^[✨🎯👉\s*-]+/, '').trim().replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').replace(/\*\*/g, '"');
            return (
              <div key={idx} className="flex items-center gap-1.5 font-extrabold text-rose-700 mt-2 mb-1 bg-rose-50 px-1.5 py-1 rounded border border-rose-200 w-fit">
                <span className="shrink-0 text-[10.5px]">🎯</span>
                <span className="text-[10.5px] uppercase tracking-tight">{cleanText}</span>
              </div>
            );
          }

          // Render quote correctly
          if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
            return (
              <p key={idx} className="text-gray-700 pl-2.5 border-l-2 border-orange-300 italic my-1 font-medium leading-relaxed text-[12px]">
                {trimmed.replace(/\*\*/g, '"')}
              </p>
            );
          }

          const lineWithQuotes = line.replace(/\*\*/g, '"');
          return (
            <p key={idx} className="text-gray-800 font-medium leading-normal whitespace-pre-wrap">
              {lineWithQuotes}
            </p>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messagesLength, loading]);

  // AUTO-TRIGGER FIRST MESSAGE ON OPEN
  useEffect(() => {
    if (taskMessages.length === 0 && !loading) {
      handleSend(true);
    }
  }, []);

  const handleSend = async (isInitialMode = false) => {
    if ((!input.trim() && !isInitialMode) || loading) return;

    const userMsg = isInitialMode ? "(Yêu cầu hỗ trợ công việc)" : input.trim();
    if (!isInitialMode) setInput('');
    setLoading(true);

    try {
      const friendlyName = getFriendlyMentorName(assigneeName);
      // 1. S.U.P PATROL REPORT CHECK: If this task has been patrolled and has results, present it
      if (isInitialMode && task.lastPatrolResult) {
        const { assistantReply, supervisorClosing, nextAction } = task.lastPatrolResult;
        
        const reportGreeting = `${friendlyName} ơi, Sếp SUP đã rà soát trực tiếp công việc này và vừa check-in đấy nhé!

🗣️ "S.U.P Boss chỉ thị":
"${supervisorClosing || "Không có chỉ thị đặc biệt."}"

🤖 "JOB phân tích kỹ thuật":
"${assistantReply || "Tiến trình bám sát QCD."}"

🎯 "Đầu ra tiếp theo [LÀM NGAY]":
👉 "${nextAction || "Liên tục cập nhật tiến độ."}"

Sếp và Anh Em khẩn trương thực hiện theo đúng chỉ đạo nhé! ${friendlyName} có muốn báo cáo tiến độ hoặc hỏi đáp gì thêm với JOB để gỡ rối không ạ?`;

        await onSendMessage({
          taskId: task.id,
          userId: currentUser.uniqueKey || currentUser.id,
          role: 'assistant',
          content: reportGreeting,
          timestamp: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      // 2. CACHE CHECK: "Nhớ bài - Không hỏi lại"
      const currentTaskContent = `${task.title} | ${task.objective} | ${task.expectedEndDate}`;
      if (isInitialMode && task.last_ai_content === currentTaskContent && task.last_ai_response) {
        await onSendMessage({
          taskId: task.id,
          userId: currentUser.uniqueKey || currentUser.id,
          role: 'assistant',
          content: task.last_ai_response,
          timestamp: new Date().toISOString()
        });
        setLoading(false);
        return;
      }

      // 2. Save user message to Firebase (only if not initial auto-trigger)
      if (!isInitialMode) {
        await onSendMessage({
          taskId: task.id,
          userId: currentUser.uniqueKey || currentUser.id,
          role: 'user',
          content: userMsg,
          timestamp: new Date().toISOString()
        });
      }

      // 3. Call Gemini Proxy
      let aiText = "";
      try {
        const response = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
prompt: `Bạn là JOB, trợ lý AI chuyên nghiệp và thân thiện. 
Nhiệm vụ của bạn: Nhắc nhở và hỗ trợ người dùng hoàn thành công việc.
Công việc hiện tại: "${task.title}"
Mục tiêu: "${task.objective}"
Hạn hoàn thành: ${task.expectedEndDate}
Người đang nói chuyện với bạn: ${currentUser.name} (${currentUser.role})
Nhân viên phụ trách chính: ${assigneeName || 'Chưa xác định'}

Yêu cầu:
1. Luôn xưng hô lịch sự, thân thiện, xưng "JOB" và gọi người dùng là "Sếp" hoặc "Bạn" tùy vai trò.
2. Nếu là nhân viên phụ trách: Tập trung vào việc thúc đẩy tiến độ, gợi ý giải pháp.
3. Nếu là Admin: Hỗ trợ phân tích công việc, gợi ý cách quản lý hoặc kiểm tra.
4. Trả lời cực kỳ ngắn gọn, súc tích (dưới 35 từ), đi thẳng vào vấn đề bằng tiếng Việt, tuyệt đối không dông dài.
5. Đây là cuộc hội thoại riêng tư chỉ giữa bạn và người này, người khác không thấy nội dung này.`,
            messages: taskMessages.map(m => ({
              role: m.role,
              content: m.content
            }))
          }),
        });

        if (!response.ok) {
           const err = await response.json();
           throw new Error(err.error || 'Failed to generate content');
        }

        const data = await response.json();
        aiText = data.text || "Xin lỗi, tôi gặp chút trục trặc. Bạn cần hỗ trợ gì thêm không?";

        // 4. Update Cache in Firestore
        const taskRef = doc(db, 'tasks', task.id);
        await updateDoc(taskRef, {
          last_ai_content: currentTaskContent,
          last_ai_response: aiText
        });

      } catch (geminiError: any) {
        // FALLBACK BRAIN: Xử lý lỗi Quota (429) hoặc lỗi mạng
        if (geminiError?.status === 429 || geminiError?.message?.includes('429')) {
          console.warn("Gemini Quota Exceeded. Using Fallback Brain.");
          const deadline = task.expectedEndDate || task.dueDate || 'chưa định';
          const objective = task.objective || task.title;
          aiText = `${currentUser.name} ơi, hiện JOB đang quá tải (Quota), nhưng JOB nhắc nè: hạn ${deadline} sắp đến, mục tiêu "${objective}" tiến hành đến đâu rồi? Sếp cần tập trung hoàn thành nhé!`;
        } else {
          throw geminiError;
        }
      }

      // 5. Save AI message to Firebase
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

  const [buttonRefState, setButtonRefState] = useState<Element | null>(null);
  const [buttonPos, setButtonPos] = useState<{ x: number; y: number } | null>(null);

  const updatePositions = () => {
    if (!containerRef.current || !buttonRefState) return;
    const rectContainer = containerRef.current.getBoundingClientRect();
    const rectBtn = buttonRefState.getBoundingClientRect();

    const bx = rectBtn.left + rectBtn.width / 2 - rectContainer.left;
    const by = rectBtn.top + rectBtn.height / 2 - rectContainer.top;

    setButtonPos({ x: bx, y: by });
  };

  useEffect(() => {
    if (containerRef.current) {
      const parent = containerRef.current.parentElement?.parentElement;
      if (parent) {
        const btn = parent.querySelector('button');
        if (btn) {
          setButtonRefState(btn);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (!buttonRefState) return;

    updatePositions();
    const timer = setTimeout(updatePositions, 100);

    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, { capture: true });

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, { capture: true });
    };
  }, [buttonRefState]);

  useEffect(() => {
    updatePositions();
  }, [dimensions]);

  // Determine closest edge for anchor
  let side: 'left' | 'right' | 'top' | 'bottom' = 'left';
  let pathD = 'M -7 24 L 0 16 L 0 32 Z'; // fallback static

  if (buttonPos) {
    const { x, y } = buttonPos;
    const w = dimensions.width;
    const h = dimensions.height;
    
    const dLeft = Math.abs(x);
    const dRight = Math.abs(x - w);
    const dTop = Math.abs(y);
    const dBottom = Math.abs(y - h);
    
    const minD = Math.min(dLeft, dRight, dTop, dBottom);
    if (minD === dLeft) side = 'left';
    else if (minD === dRight) side = 'right';
    else if (minD === dTop) side = 'top';
    else side = 'bottom';

    const ax = Math.max(16, Math.min(w - 16, x));
    const ay = Math.max(16, Math.min(h - 16, y));

    if (side === 'left') {
      pathD = `M ${x} ${y} L 0 ${ay - 10} L 0 ${ay + 10} Z`;
    } else if (side === 'right') {
      pathD = `M ${x} ${y} L ${w} ${ay - 10} L ${w} ${ay + 10} Z`;
    } else if (side === 'top') {
      pathD = `M ${x} ${y} L ${ax - 10} 0 L ${ax + 10} 0 Z`;
    } else {
      pathD = `M ${x} ${y} L ${ax - 10} ${h} L ${ax + 10} ${h} Z`;
    }
  }

  return (
    <div 
      className="absolute left-[31px] md:left-[36px] top-[-10px] z-[1500] flex flex-col pointer-events-none"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <motion.div 
        ref={containerRef}
        drag
        dragMomentum={false}
        onDrag={updatePositions}
        initial={{ opacity: 0, scale: 0.9, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.9, x: -10 }}
        className="relative bg-white rounded-xl shadow-2xl border border-blue-600 pointer-events-auto overflow-visible flex flex-col"
        style={{ width: dimensions.width, height: dimensions.height, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimalist Tip SVG */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
          <path 
            d={pathD} 
            fill="white" 
            stroke="#2563eb" 
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>

        {/* Header Compact - Drag handle */}
        <div className="bg-blue-600 px-2 py-1 flex items-center justify-between shadow-sm cursor-grab active:cursor-grabbing rounded-t-xl shrink-0">
          <div className="flex items-center gap-1">
            <JobAvatar size={14} animate className="text-white" />
            <div>
              <h3 className="notranslate text-white text-[9.5px] font-black uppercase tracking-wider leading-none">JOB</h3>
              <p className="notranslate text-blue-100 text-[7.5px] font-bold uppercase tracking-tight mt-0.5 opacity-80">{task.code}</p>
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
          {task.lastPatrolResult && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-2 mb-2 shadow-xs text-[11px] text-amber-950 font-medium select-none">
              <div className="flex items-center gap-1.5 mb-1 bg-amber-500 text-white px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider w-fit">
                🚨 KẾT QUẢ TUẦN TRA S.U.P
              </div>
              <div className="space-y-1.5 text-left leading-relaxed">
                <div className="flex items-start gap-1.5">
                  <SupIconSVG size={14} className="shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-orange-700 font-black">S.U.P chỉ thị:</strong>{' '}
                    <span className="italic">"{task.lastPatrolResult.supervisorClosing}"</span>
                  </p>
                </div>
                <div className="flex items-start gap-1.5">
                  <JobIconSVG size={14} className="shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-blue-700 font-black">JOB phân tích:</strong>{' '}
                    <span>{task.lastPatrolResult.assistantReply}</span>
                  </p>
                </div>
                <p className="mt-1.5 text-rose-700 bg-rose-50 px-1.5 py-1 rounded border border-rose-200 font-extrabold block text-[10px]">
                  📌 [LÀM NGAY] Đầu ra tiếp theo: {task.lastPatrolResult.nextAction}
                </p>
              </div>
            </div>
          )}

          {taskMessages.length === 0 && !task.lastPatrolResult && (
            <div className="text-center py-2">
              <JobAvatar size={22} className="mx-auto mb-1 opacity-50" />
              <p className="text-[8.5px] text-gray-400 font-bold uppercase tracking-widest leading-none">Lệnh?</p>
            </div>
          )}
          
          {taskMessages.map((msg, idx) => (
            <div 
              key={msg.id}
              className={`flex w-full ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
            >
              <div className={`max-w-[90%] p-1.5 rounded-lg text-[13px] leading-tight shadow-sm font-medium ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none text-right' 
                  : 'bg-white text-gray-800 border border-blue-100 rounded-bl-none text-left'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  renderMessageContent(msg.content)
                )}
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
        <div className="p-1.5 bg-white border-t border-blue-50 rounded-b-xl">
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
