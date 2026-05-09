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
        className="w-[250px] bg-white rounded-lg shadow-[0_10px_30px_rgba(0,0,0,0.15)] z-[99999] flex flex-col border-[0.5px] border-gray-300 overflow-visible cursor-default"
      >
        {/* Minimalist Comic Tail SVG */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
          <motion.path
            d={tetherPath}
            fill="white"
            stroke="#d1d5db"
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </svg>

        {/* Minimal Header */}
        <div className="p-2 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-lg cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2">
             <span translate="no" className="notranslate text-[10px] font-black text-gray-400 uppercase tracking-tighter">{task.code}</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-50 rounded-full transition-colors text-gray-300 hover:text-red-400"
          >
            <X size={14} />
          </button>
        </div>

        {/* Messages area - Compact */}
        <div 
          ref={scrollRef}
          className="h-[220px] overflow-y-auto p-3 space-y-3 bg-[#fafafa] scroll-smooth"
        >
          {(!task.comments || task.comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10">
              <MessageSquare size={24} />
            </div>
          ) : (
            task.comments.map((comment) => {
              const isMe = comment.authorId === currentUser.id || comment.authorId === currentUser.uniqueKey;
              const author = getUserById(comment.authorId, users);
              const authorName = author?.name || 'User';
              
              return (
                <div key={comment.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`flex items-end gap-1.5 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className="flex-shrink-0">
                        <Avatar src={author?.avatar} name={authorName} size="xs" />
                      </div>
                    )}
                    <div className="group/msg relative">
                      <div className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium leading-tight border ${
                        isMe 
                          ? 'bg-blue-500 text-white border-blue-400 rounded-br-none' 
                          : 'bg-white text-gray-700 border-gray-200 rounded-bl-none shadow-sm'
                      }`}>
                        <span translate="no" className="notranslate">{comment.content}</span>
                      </div>

                      {/* Reaction trigger */}
                      <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex z-10 ${isMe ? '-left-6' : '-right-6'}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowEmojiFor(comment.id); }}
                          className="p-1 bg-white border border-gray-200 rounded-full text-gray-400 hover:bg-gray-50"
                        >
                          <Smile size={10} />
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
                  
                  <div className={`${isMe ? 'mr-0' : 'ml-6'} mt-0.5`}>
                    <ReactionBadge reactions={comment.reactions} users={users} />
                  </div>

                  {!isMe && (
                    <div className="ml-6 mt-0.5">
                      <span {...getSafeNameProps()} className="text-[8px] text-blue-500 font-bold uppercase notranslate italic">@{authorName}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Input area - Ultra Slim */}
        <div className="p-2 border-t border-gray-100 bg-white rounded-b-lg">
          <div className="flex items-center gap-2 mb-1.5 px-1">
            <button 
              ref={emojiTriggerRef}
              onClick={() => setShowEmojiPicker(true)}
              className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
            >
              <Smile size={16} />
              <span translate="no" className="notranslate text-[9px] font-bold uppercase truncate">
                <span translate="no" className="notranslate">Emoji</span>
              </span>
            </button>
            
            {canAttach && (
              <div className="flex items-center gap-1 border-l border-gray-100 ml-1 pl-2">
                <button 
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors"
                  title="Hình ảnh"
                  onClick={() => alert("Tính năng gửi hình ảnh đang được đồng bộ...")}
                >
                  <Image size={15} />
                </button>
                <button 
                  className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors"
                  title="Đính kèm"
                  onClick={() => alert("Tính năng đính kèm tài liệu đang được đồng bộ...")}
                >
                  <Paperclip size={15} />
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

          <div className="relative flex gap-1.5 items-center bg-gray-50 rounded p-1 border border-gray-100">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent py-1 px-1.5 text-[12px] outline-none transition-all resize-none h-[32px] leading-tight text-gray-700 font-medium placeholder:text-gray-300 notranslate"
              placeholder="Nhập nội dung thảo luận mới..."
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
              className="p-1.5 text-blue-500 hover:text-blue-600 disabled:opacity-30 transition-all"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </Portal>
  );
};
