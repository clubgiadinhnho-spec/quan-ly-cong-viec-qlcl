import React, { useState, useRef, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { MessageSquare, Send, X, Smile } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDateTime } from '../../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../common/ReactionPicker';
import { Avatar } from '../common/Avatar';

import { getUserById, getSafeNameProps } from '../../utils/userUtils';

interface TaskChatProps {
  task: Task;
  currentUser: User;
  users: User[];
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onClose: () => void;
}

export const TaskChat = ({ task, currentUser, users, onSendMessage, onReact, onClose }: TaskChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Drag tracking values
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

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

  // Calculate the path for the comic tail
  // It starts from a fixed point on the bubble (e.g., top-left area)
  // and points back to the (0,0) coordinate relative to the initial placement.
  const tailPath = useTransform([dragX, dragY], ([x, y]) => {
    const lx = x as number;
    const ly = y as number;
    
    // The "anchor" is the point where the chat icon is.
    // Relative to the bubble's CURRENT position, the anchor is at (-lx, -ly - 48)
    // because the bubble is initially at top: 48px, left: 0px relative to the task row area.
    const targetX = -lx + 24; // Offset to match the icon center roughly
    const targetY = -ly - 32; // Point slightly above the bubble toward the icon
    
    // Bubble attachment points
    const startX = 30;
    const startY = 0;
    const width = 20;

    return `M ${startX},${startY} L ${targetX},${targetY} L ${startX + width},${startY} Z`;
  });

  return (
    <motion.div
      style={{ x: dragX, y: dragY }}
      initial={{ opacity: 0, scale: 0.9, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 10 }}
      drag
      dragMomentum={false}
      dragElastic={0}
      className="absolute top-12 left-0 w-[320px] bg-white rounded-3xl shadow-2xl z-[500] flex flex-col border-2 border-blue-100 overflow-visible cursor-default"
    >
      {/* Dynamic Comic Tail */}
      <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
        <motion.path
          d={tailPath}
          fill="white"
          stroke="#DBEAFE" 
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between cursor-move active:cursor-grabbing bg-gray-50/50 rounded-t-3xl">
        <div className="flex items-center gap-2">
          <div className="p-1 px-2 bg-blue-600 text-white rounded-full text-[8px] font-black uppercase italic tracking-tighter shadow-sm shadow-blue-100">
            HỘI THOẠI
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase">{task.code}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 mr-2">
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
            <div className="w-1 h-1 bg-gray-300 rounded-full" />
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500 shadow-sm"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Input area - MOVED TO TOP */}
      <div className="p-3 border-b border-gray-100 bg-white">
        <div className="relative flex gap-2 items-end">
          <textarea
            className="flex-1 bg-gray-50 border border-gray-100 rounded-2xl py-2 px-3 text-[11px] outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-12"
            placeholder="Viết tin nhắn mới..."
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
            className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50 disabled:shadow-none mb-1"
          >
            <Send size={14} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="h-[280px] overflow-y-auto p-4 space-y-3 bg-gray-50/30 scroll-smooth rounded-b-3xl"
      >
        {(!task.comments || task.comments.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <MessageSquare className="text-gray-200 mb-2" size={24} />
            <p className="text-[10px] text-gray-400 italic">Chưa có trao đổi...</p>
          </div>
        ) : (
          task.comments.map((comment) => {
            const isMe = comment.authorId === currentUser.id;
            const author = getUserById(comment.authorId, users);
            const authorName = author?.name || 'Thành viên';
            
            return (
              <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-end gap-1.5 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <Avatar src={author?.avatar} name={authorName} size="xs" />
                  )}
                  <div className={`p-2.5 rounded-2xl text-[11px] leading-relaxed shadow-sm relative group/msg ${
                    isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                  }`}>
                    {comment.content}

                    {/* Reaction trigger */}
                    <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-0.5 shadow-sm ${
                      isMe ? '-left-8' : '-right-8'
                    }`}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowEmojiFor(comment.id);
                        }}
                        className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                      >
                        <Smile size={12} />
                      </button>
                    </div>

                    <ReactionPicker 
                      isOpen={showEmojiFor === comment.id}
                      onClose={() => setShowEmojiFor(null)}
                      onSelect={(emoji) => onReact?.(task.id, comment.id, emoji)}
                      position="top"
                    />
                  </div>
                </div>
                
                <div className={`${isMe ? 'mr-0' : 'ml-6'}`}>
                  <ReactionBadge reactions={comment.reactions} users={users} />
                </div>

                <div className="mt-0.5 flex items-center gap-1.5 px-0.5">
                   <span className="text-[8px] text-gray-300 font-bold">{formatDateTime(comment.timestamp)}</span>
                   {!isMe && <span {...getSafeNameProps()} className="text-[8px] text-blue-400 font-black uppercase tracking-tighter notranslate">{authorName}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>

    </motion.div>
  );
};
