import React from 'react';
import { X, Bold, Underline, Palette, Eraser, Save, CornerUpLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Portal } from '../common/Portal';
import { Task } from '../../types';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onSave: (taskId: string, content: string, aiApplied?: boolean, aiAppliedDetails?: string, quizResult?: string) => void;
}

const isTttTask = (task: Task) => {
  const code = (task.code || '').toUpperCase();
  const cat = (task.category || '').toUpperCase();
  const title = (task.title || '').toUpperCase();
  return code.includes('TTT') || cat.includes('TTT') || title.includes('[TTT]');
};

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, task, onSave }) => {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [aiApplied, setAiApplied] = React.useState(false);
  const [aiAppliedDetails, setAiAppliedDetails] = React.useState('');
  const [quizResult, setQuizResult] = React.useState('');

  const toHTML = (content: string) => {
    if (!content) return '';
    
    // Hide content completely if it's from any JOB/Robot source
    if (/(?:🤖|\[JOB\]|\[JOB\s|JOB Assist|JOB Assistant|JOB Update|JOB:)/gi.test(content)) {
      return '';
    }

    let processed = content;

    // Support legacy tags
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
    processed = processed.replace(/<hl>(.*?)<\/hl>/g, '<mark>$1</mark>');
    return processed;
  };

  // Hard-binding: Force data into editor when modal opens or task changes
  React.useEffect(() => {
    if (isOpen) {
      setAiApplied(!!task.aiApplied);
      setAiAppliedDetails(task.aiAppliedDetails || '');
      setQuizResult(task.quizResult || '');
      
      // Small delay to ensure Ref is attached and Animation is stable
      const timer = setTimeout(() => {
        if (editorRef.current) {
          // Check both field names as requested
          const data = task.currentUpdate || (task as any).progressUpdate || "";
          
          editorRef.current.innerHTML = toHTML(data);
          editorRef.current.focus();

          // Move cursor to end of text
          try {
            const range = document.createRange();
            const sel = window.getSelection();
            if (sel) {
              range.selectNodeContents(editorRef.current);
              range.collapse(false);
              sel.removeAllRanges();
              sel.addRange(range);
            }
          } catch (err) {
            console.error("Cursor placement error:", err);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, task.id, task.currentUpdate, task.aiApplied, task.aiAppliedDetails, task.quizResult]); 

  const handleApplyFormat = (e: React.MouseEvent, command: string, value?: string) => {
    e.preventDefault();
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleClearFormat = (e: React.MouseEvent) => {
    e.preventDefault();
    if (editorRef.current) {
      editorRef.current.focus();
      
      // 1. Standard remove format (handles Bold, Italic, Underline, ForeColor)
      document.execCommand('removeFormat', false, undefined);
      
      // 2. Comprehensive Background/Highlight color clearing
      // Browsers use hiliteColor or backColor depending on their implementation
      document.execCommand('hiliteColor', false, 'transparent');
      document.execCommand('backColor', false, 'transparent');
      
      // Additional attempts to strip colors if 'transparent' doesn't work
      document.execCommand('hiliteColor', false, 'initial');
      document.execCommand('backColor', false, 'initial');
      
      // Explicitly clear text color to default
      document.execCommand('foreColor', false, 'rgba(30, 41, 59, 1)'); // slate-800
    }
  };

  const handleSave = () => {
    if (editorRef.current) {
      onSave(task.id, editorRef.current.innerHTML, aiApplied, aiApplied ? aiAppliedDetails : '', quizResult);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-[300] flex items-center justify-center md:p-4 p-0 bg-black/60 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white md:w-full md:max-w-2xl md:rounded-2xl shadow-2xl flex flex-col border border-gray-100 overflow-hidden h-full md:h-auto w-full max-w-none rounded-none"
            >
              {/* Header */}
              <div className="p-4 bg-blue-700 flex justify-between items-center shadow-md">
                <h3 className="font-black text-white">
                  <span translate="no" className="notranslate uppercase text-base leading-tight tracking-wide">
                    CẬP NHẬT TIẾN ĐỘ: {task.code} - {task.title}
                  </span>
                </h3>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors group">
                  <X size={20} className="text-white/80 group-hover:text-white" />
                </button>
              </div>

              {/* Toolbar */}
              <div className="flex items-center gap-2 p-2 px-4 border-b border-gray-100 bg-white sticky top-0 z-10 shadow-sm">
                <div translate="no" className="notranslate flex items-center gap-1.5">
                  <button 
                    onMouseDown={(e) => handleApplyFormat(e, 'bold')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-700 border border-transparent hover:border-gray-200"
                    title="In đậm"
                  >
                    <Bold size={18} strokeWidth={3} />
                  </button>
                  <button 
                    onMouseDown={(e) => handleApplyFormat(e, 'underline')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-700 border border-transparent hover:border-gray-200"
                    title="Gạch chân"
                  >
                    <Underline size={18} strokeWidth={3} />
                  </button>
                  <button 
                    onMouseDown={(e) => handleApplyFormat(e, 'hiliteColor', '#fef08a')}
                    className="p-2 hover:bg-amber-50 rounded-lg transition-all text-amber-600 border border-transparent hover:border-amber-200"
                    title="Tô màu vàng"
                  >
                    <Palette size={18} strokeWidth={3} className="fill-amber-200" />
                  </button>
                  <button 
                    onMouseDown={(e) => handleApplyFormat(e, 'hiliteColor', '#fecaca')}
                    className="p-2 hover:bg-red-50 rounded-lg transition-all text-red-600 border border-transparent hover:border-red-200"
                    title="Tô màu đỏ"
                  >
                    <Palette size={18} strokeWidth={3} className="fill-red-200" />
                  </button>
                  <button 
                    onMouseDown={(e) => {
                      e.preventDefault();
                      if (editorRef.current) {
                        editorRef.current.focus();
                        // Multiple commands to ensure cross-browser color removal
                        document.execCommand('hiliteColor', false, 'transparent');
                        document.execCommand('backColor', false, 'transparent');
                        document.execCommand('hiliteColor', false, 'initial');
                        document.execCommand('backColor', false, 'initial');
                        document.execCommand('foreColor', false, 'inherit');
                        // Also try the 'rgba(0,0,0,0)' trick
                        document.execCommand('hiliteColor', false, 'rgba(0,0,0,0)');
                        document.execCommand('backColor', false, 'rgba(0,0,0,0)');
                      }
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-500 border border-transparent hover:border-gray-200"
                    title="Xóa màu tô (Không màu)"
                  >
                    <div className="relative">
                      <Palette size={18} strokeWidth={3} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-full h-0.5 bg-red-500 rotate-45" />
                      </div>
                    </div>
                  </button>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <button 
                    onMouseDown={(e) => handleClearFormat(e)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-all text-gray-400 border border-transparent hover:border-gray-200"
                    title="Xóa định dạng"
                  >
                    <Eraser size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 p-6 overflow-y-auto min-h-[300px] max-h-[60vh] bg-gray-50/20 shadow-inner">
                {isTttTask(task) && (
                  <div className="mb-4 bg-amber-50/60 border border-amber-200/50 p-2.5 px-4 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="p-1 px-2 bg-amber-100/80 text-amber-900 text-[10px] font-black rounded-lg uppercase tracking-wider">3T QUIZ</span>
                      <span className="text-[12px] font-bold text-slate-700">KẾT QUẢ ĐẠT ĐƯỢC:</span>
                    </div>
                    <input
                      type="text"
                      value={quizResult}
                      onChange={(e) => setQuizResult(e.target.value)}
                      placeholder="Ví dụ: 30/30"
                      className="w-32 text-center text-xs font-black uppercase text-slate-800 bg-white border border-slate-300 rounded-lg py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-3xs"
                    />
                  </div>
                )}
                <style dangerouslySetInnerHTML={{ __html: `
                  .notranslate.rich-text-content, 
                  .notranslate.rich-text-content *,
                  .notranslate.rich-text-content i,
                  .notranslate.rich-text-content em {
                    font-style: normal !important;
                  }
                ` }} />
                <div 
                  ref={editorRef}
                  contentEditable
                  translate="no"
                  className="notranslate rich-text-content w-full outline-none text-[15px] text-blue-950 font-medium leading-relaxed font-sans"
                  style={{ minHeight: '120px', textAlign: 'justify', fontStyle: 'normal' }}
                />

                {/* AI Application Area */}
                <div className="mt-6 pt-4 border-t border-gray-200/50 flex flex-col gap-3">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={aiApplied}
                      onChange={(e) => setAiApplied(e.target.checked)}
                      className="mt-1 w-4.5 h-4.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 accent-blue-600"
                    />
                    <div>
                      <span className="text-sm font-black text-rose-600 uppercase tracking-wide">Ứng dụng AI (Gemini, ChatGPT...)</span>
                      <span className="text-xs text-slate-500 block mt-0.5">Tích chọn nếu bạn có ứng dụng một công cụ AI bất kì vào việc hỗ trợ giải quyết công việc này.</span>
                    </div>
                  </label>
                  
                  {aiApplied && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="mt-1"
                    >
                      <textarea
                        rows={3}
                        value={aiAppliedDetails}
                        onChange={(e) => setAiAppliedDetails(e.target.value)}
                        placeholder="Hãy mô tả chi tiết, rõ ràng nội dung ứng dụng AI của bạn tại đây (ví dụ: dùng Prompt để lập dàn ý, tối ưu hóa code, tóm tắt quy trình...)"
                        className="w-full p-3 border border-red-200/60 bg-rose-50/10 rounded-xl text-sm text-slate-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all font-medium placeholder-rose-300/80"
                      />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-100 bg-white flex justify-end items-center gap-3">
                <button 
                  onClick={onClose}
                  className="flex items-center justify-center gap-2 px-5 py-3 md:py-2.5 bg-slate-400 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-500 active:scale-95 transition-all shadow-lg shadow-gray-100 border-2 border-slate-300/50 min-h-[44px]"
                >
                  <CornerUpLeft size={16} strokeWidth={3} />
                  <span translate="no" className="notranslate">HỦY</span>
                </button>
                <button 
                  onClick={handleSave}
                  className="flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-100 border-2 border-blue-500/50 min-h-[44px]"
                >
                  <Save size={16} strokeWidth={3} />
                  <span translate="no" className="notranslate font-black">LƯU CẬP NHẬT</span>
                </button>
              </div>
            </motion.div>
          </div>
        </Portal>
      )}
    </AnimatePresence>

  );
};
