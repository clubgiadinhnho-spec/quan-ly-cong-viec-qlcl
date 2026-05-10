import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import { MessageSquare, Send, X, Smile, Image, Paperclip } from 'lucide-react';
import { Task, User } from '../../types';
import { formatDateTime } from '../../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../common/ReactionPicker';
import { EmojiPicker } from '../common/EmojiPicker';
import { Avatar } from '../common/Avatar';
import { Portal } from '../common/Portal';

import { getUserById, getSafeNameProps } from '../../utils/userUtils';

interface TaskChatProps {
  task: Task;
  currentUser: User;
  users: User[];
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const TaskChat = ({ task, currentUser, users, onSendMessage, onReact, onClose, anchorRef }: TaskChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  
  const isLNT = currentUser.name === 'Lê Nhật Trường' || currentUser.personalEmail === 'lenhattruong.tpp@gmail.com';
  const canAttach = currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng' || isLNT;

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart;
    const end = inputRef.current.selectionEnd;
    const text = newMessage;
    const before = text.substring(0, start);
    const after = text.substring(end);
    setNewMessage(before + emoji + after);
    
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const newPos = start + emoji.length;
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 10);
  };
  
  // Position state for global anchoring
  const [anchorPos, setAnchorPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // Track dragging position for the dynamic tether
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Update anchor position on mount and scroll
  const updatePosition = () => {
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setAnchorPos({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height
      });
    }
  };

  useLayoutEffect(() => {
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [task.id]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [task.comments]);

  // Click-away logic
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const isAnchorClick = anchorRef.current?.contains(event.target as Node);
      if (chatRef.current && !chatRef.current.contains(event.target as Node) && !isAnchorClick) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(task.id, newMessage);
    setNewMessage('');
  };

  // MINI Dimensions
  const bubbleWidth = 250;
  const bubbleHalf = bubbleWidth / 2;

  // Calculate the "Tail" triangle path - Smaller & Slimmer
  const tetherPath = useTransform([dragX, dragY], ([x, y]) => {
    const dx = x as number;
    const dy = y as number;
    
    // Bubble center is at bubbleHalf relative to its left
    // The button center relative to initial bubble top-left is at (bubbleHalf, -anchorHeight/2 - Offset)
    const targetX = bubbleHalf - dx;
    const targetY = (anchorPos.height / 2) - 45 - dy; // 45 is the initial top offset
    
    const baseWidth = 20;
    const baseX = bubbleHalf;
    const baseY = 0;
    
    return `M ${baseX - baseWidth/2} ${baseY} L ${targetX} ${targetY} L ${baseX + baseWidth/2} ${baseY} Z`;
  });

  return (
    <Portal>
      <motion.div
        key={task.id}
        ref={chatRef}
        drag
        dragMomentum={false}
        style={{ 
          x: dragX, 
          y: dragY,
          position: 'fixed',
          top: anchorPos.top + 45, // Positioned closer to button
          left: anchorPos.left + anchorPos.width / 2 - bubbleHalf,
        }}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="w-[280px] bg-white rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.2)] z-[99999] flex flex-col border border-gray-200 overflow-visible cursor-default"
      >
        {/* Minimalist Comic Tail SVG */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
          <motion.path
            d={tetherPath}
            fill="#3b82f6"
            stroke="#3b82f6"
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </svg>

        {/* Minimal Header */}
        <div className="p-3 border-b border-blue-400/20 flex items-center justify-between bg-blue-500 rounded-t-xl cursor-grab active:cursor-grabbing shadow-sm">
          <div className="flex items-center gap-2">
             <MessageSquare size={14} className="text-blue-100" />
             <span translate="no" className="notranslate text-[11px] font-black text-white uppercase tracking-widest">{task.code}</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white/50 hover:text-white"
          >
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Messages area - Compact */}
        <div 
          ref={scrollRef}
          className="h-[260px] overflow-y-auto p-4 space-y-4 bg-blue-50/30 scroll-smooth"
        >
          {(!task.comments || task.comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-blue-200">
              <MessageSquare size={32} strokeWidth={1} />
              <p translate="no" className="notranslate text-[9px] font-bold uppercase tracking-widest mt-2">Chưa có thảo luận</p>
            </div>
          ) : (
            task.comments.map((comment, i) => {
              const isMe = comment.authorId === currentUser.id || comment.authorId === currentUser.uniqueKey;
              const author = getUserById(comment.authorId, users);
              const authorName = author?.name || 'User';
              
              return (
                <motion.div 
                  key={comment.id} 
                  initial={{ opacity: 0, x: isMe ? 20 : -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-end gap-2 max-w-[92%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className="flex-shrink-0 shadow-sm rounded-full overflow-hidden border border-white">
                        <Avatar src={author?.avatar} name={authorName} size="xs" />
                      </div>
                    )}
                    <div className="group/msg relative">
                      <div className={`px-3 py-2 rounded-2xl text-[12px] font-medium leading-normal shadow-sm border ${
                        isMe 
                          ? 'bg-blue-600 text-white border-blue-500 rounded-br-sm' 
                          : 'bg-white text-gray-800 border-gray-100 rounded-bl-sm shadow-[0_2px_5px_rgba(0,0,0,0.05)]'
                      }`}>
                        <span translate="no" className="notranslate whitespace-pre-wrap">{comment.content}</span>
                      </div>

                      {/* Reaction trigger */}
                      <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex z-10 ${isMe ? '-left-7' : '-right-7'}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowEmojiFor(comment.id); }}
                          className="p-1.5 bg-white border border-gray-200 rounded-full text-gray-400 hover:text-blue-500 hover:border-blue-200 shadow-sm transition-all"
                        >
                          <Smile size={12} />
                        </button>
                      </div>

                      <ReactionPicker 
                        isOpen={showEmojiFor === comment.id}
                        onClose={() => setShowEmojiFor(null)}
                        onSelect={(emoji) => onReact?.(task.id, comment.id, emoji)}
                        position={isMe ? "left" : "right"}
                      />
                    </div>
                  </div>
                  
                  <div className={`${isMe ? 'mr-1' : 'ml-10'} mt-1`}>
                    <ReactionBadge reactions={comment.reactions} users={users} />
                  </div>

                  {!isMe && (
                    <div className="ml-10 mt-0.5">
                      <span {...getSafeNameProps()} className="text-[9px] text-blue-600 font-black uppercase notranslate tracking-tight opacity-70">@{authorName}</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input area - Refined */}
        <div className="p-3 bg-white rounded-b-xl border-t border-gray-100 shadow-[0_-5px_15px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3 mb-2 px-1">
            <button 
              ref={emojiTriggerRef}
              onClick={() => setShowEmojiPicker(true)}
              className="px-2 py-1 bg-gray-50 hover:bg-blue-50 rounded-lg text-gray-500 hover:text-blue-600 transition-all flex items-center gap-1.5 border border-gray-100"
            >
              <Smile size={14} className="text-amber-400" />
              <span translate="no" className="notranslate text-[9px] font-black uppercase tracking-wider">
                Emoji
              </span>
            </button>
            
            {canAttach && (
              <div className="flex items-center gap-1 border-l border-gray-100 ml-1 pl-3">
                <button 
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                  title="Hình ảnh"
                  onClick={() => alert("Tính năng gửi hình ảnh đang được đồng bộ...")}
                >
                  <Image size={16} />
                </button>
                <button 
                  className="p-1.5 hover:bg-blue-50 rounded-lg text-gray-400 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                  title="Đính kèm"
                  onClick={() => alert("Tính năng đính kèm tài liệu đang được đồng bộ...")}
                >
                  <Paperclip size={16} />
                </button>
              </div>
            )}
          </div>

          <EmojiPicker 
            isOpen={showEmojiPicker}
            onClose={() => setShowEmojiPicker(false)}
            onSelect={insertEmoji}
            anchorRect={emojiTriggerRef.current?.getBoundingClientRect()}
          />

          <div className="relative flex gap-2 items-center bg-gray-50/80 rounded-xl p-2 border border-gray-100 focus-within:border-blue-300 focus-within:bg-white transition-all focus-within:shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent py-1.5 px-2 text-[13px] outline-none transition-all resize-none h-[38px] leading-snug text-gray-800 font-medium placeholder:text-gray-400 notranslate"
              placeholder="Nhập thảo luận..."
              value={newMessage}
              translate="no"
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
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Send size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </motion.div>
    </Portal>
  );
};
