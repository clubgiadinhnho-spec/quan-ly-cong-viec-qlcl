import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, User as UserIcon } from 'lucide-react';
import { Task, User, TaskComment } from '../../types';
import { STAFF_LIST } from '../../constants';
import { formatDateTime } from '../../lib/dateUtils';

interface TaskChatProps {
  task: Task;
  currentUser: User;
  onSendMessage: (taskId: string, content: string) => void;
  onClose: () => void;
}

export const TaskChat = ({ task, currentUser, onSendMessage, onClose }: TaskChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [task.comments]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(task.id, newMessage);
    setNewMessage('');
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-[60] flex flex-col border-l border-gray-100"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <MessageSquare size={18} />
          </div>
          <div>
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter">Trao đổi công việc</h3>
            <p className="text-[10px] text-gray-500 font-bold">{task.code}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <X size={18} className="text-gray-400" />
        </button>
      </div>

      {/* Task Context info */}
      <div className="p-4 bg-blue-50/30 border-b border-blue-50">
        <p className="text-[11px] font-bold text-gray-700 line-clamp-1">{task.title}</p>
        <p className="text-[9px] text-gray-400 mt-1 uppercase italic">Nhân sự: {STAFF_LIST.find(s => s.id === task.assigneeId)?.name}</p>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50"
      >
        {(!task.comments || task.comments.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="text-gray-300" size={24} />
            </div>
            <p className="text-xs text-gray-400 italic">Chưa có cuộc hội thoại nào cho công việc này. Hãy bắt đầu trao đổi!</p>
          </div>
        ) : (
          task.comments.map((comment) => {
            const isMe = comment.authorId === currentUser.id;
            const author = STAFF_LIST.find(s => s.id === comment.authorId);
            
            return (
              <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end text-right' : 'items-start text-left'}`}>
                <div className={`flex items-end gap-2 w-full ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <img 
                      src={author?.avatar} 
                      alt="avatar" 
                      className="rounded-full border border-gray-200 object-cover aspect-square flex-none" 
                      style={{ width: '24px', height: '24px', minWidth: '24px', minHeight: '24px' }}
                    />
                  )}
                  <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm max-w-[85%] break-words ${
                    isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                  }`}>
                    {comment.content}
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2 px-1">
                  <span className="text-[9px] text-gray-400 font-bold">{formatDateTime(comment.timestamp)}</span>
                  {!isMe && <span className="text-[9px] text-gray-400 font-black uppercase">{author?.name}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-100">
        <div className="relative">
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pl-4 pr-12 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-20"
            placeholder="Nhập nội dung trao đổi..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[9px] text-gray-400 mt-2 text-center italic">Nhấn Enter để gửi</p>
      </div>
    </motion.div>
  );
};
