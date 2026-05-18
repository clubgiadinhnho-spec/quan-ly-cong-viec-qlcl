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
  const [dimensions, setDimensions] = useState({ width: 230, height: 260 }); // height includes input
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
      const newHeight = Math.max(200, resizeRef.current.startHeight + (e.clientY - resizeRef.current.startY));
      
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

  const bubbleWidth = dimensions.width;
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
          top: anchorPos.top + 45, 
          left: anchorPos.left + anchorPos.width / 2 - bubbleHalf,
          width: dimensions.width,
          height: dimensions.height,
          maxHeight: '80vh'
        }}
        initial={{ opacity: 0, scale: 0.95, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        className="bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.2)] z-[99999] flex flex-col border border-blue-600 overflow-visible cursor-default relative"
      >
        {/* Minimalist Comic Tail SVG */}
        <svg className="absolute inset-0 overflow-visible pointer-events-none z-[-1]">
          <motion.path
            d={tetherPath}
            fill="#2563eb"
            stroke="#2563eb"
            strokeWidth="0.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        </svg>

        {/* Minimal Header */}
        <div className="px-2.5 py-1.5 border-b border-blue-400/20 flex items-center justify-between bg-blue-600 rounded-t-xl cursor-grab active:cursor-grabbing shadow-sm shrink-0">
          <div className="flex items-center gap-1.5">
             <MessageSquare size={12} className="text-blue-100" />
             <span translate="no" className="notranslate text-[10.5px] font-black text-white uppercase tracking-wider">{task.code}</span>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/70 hover:text-white"
          >
            <X size={14} strokeWidth={3} />
          </button>
        </div>

        {/* Messages area - Compact */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2.5 space-y-2.5 bg-blue-50/5 scroll-smooth scrollbar-hide"
        >
          {(!task.comments || task.comments.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center text-blue-200 opacity-60">
              <MessageSquare size={24} strokeWidth={1.5} />
              <p translate="no" className="notranslate text-[9.5px] font-black uppercase tracking-widest mt-1">Trống</p>
            </div>
          ) : (
            task.comments
              .filter(comment => {
                const content = comment.content || '';
                return !/(?:🤖|\[JOB|JOB Assist|JOB Assistant|JOB Update|JOB:|\bJOB\b|\[Robot|Robot Assist|Robot Assistant|Robot Update|Robot:|\bRobot\b)/gi.test(content);
              })
              .map((comment, i) => {
                const isMe = comment.authorId === currentUser.id || comment.authorId === currentUser.uniqueKey;
              const author = getUserById(comment.authorId, users);
              const authorName = author?.name || 'User';
              
              return (
                <motion.div 
                  key={comment.id} 
                  initial={{ opacity: 0, x: isMe ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-end gap-1.5 max-w-[95%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && (
                      <div className="flex-shrink-0 shadow-sm rounded-full overflow-hidden border border-white">
                        <Avatar src={author?.avatar} name={authorName} size="xs" />
                      </div>
                    )}
                    <div className="group/msg relative">
                      <div className={`px-2 py-1.5 rounded-lg text-[13px] font-medium leading-snug shadow-sm border ${
                        isMe 
                          ? 'bg-blue-600 text-white border-blue-500 rounded-br-none text-right' 
                          : 'bg-white text-gray-800 border-gray-100 rounded-bl-none text-left'
                      }`}>
                        <span translate="no" className="notranslate whitespace-pre-wrap">{comment.content}</span>
                      </div>

                      {/* Reaction trigger */}
                      <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-0.5 z-10 ${isMe ? '-left-12' : '-right-12'}`}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onReact?.(task.id, comment.id, '👍'); }}
                          className={`p-1 bg-white border rounded-full shadow-sm transition-all text-[10px] ${
                            comment.reactions?.some(r => r.userId === currentUser.uniqueKey && r.emoji === '👍')
                              ? 'text-blue-600 border-blue-200 bg-blue-50'
                              : 'text-gray-400 border-gray-100 hover:text-blue-500 hover:border-blue-200'
                          }`}
                        >
                          👍
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowEmojiFor(comment.id); }}
                          className="p-1 bg-white border border-gray-100 rounded-full text-gray-400 hover:text-blue-500 hover:border-blue-200 shadow-sm transition-all"
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
                      
                      {/* Reactions Badge Group - Attached to bubble */}
                      {comment.reactions && comment.reactions.length > 0 && (
                        <div className={`absolute -bottom-2.5 flex flex-wrap gap-1 z-30 scale-90 ${isMe ? 'left-2' : 'right-2'}`}>
                          <ReactionBadge 
                            reactions={comment.reactions} 
                            users={users} 
                            onReact={(emoji) => onReact?.(task.id, comment.id, emoji)}
                            currentUser={currentUser}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {!isMe && (
                    <div className="ml-8 mt-0.5">
                      <span {...getSafeNameProps()} className="text-[8.5px] text-blue-600 font-black uppercase notranslate tracking-tighter opacity-60">@{authorName}</span>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>

        {/* Input area - Refined */}
        <div className="p-2 bg-white rounded-b-xl border-t border-gray-100 shadow-inner">
          <div className="flex items-center gap-2 mb-1.5 px-0.5">
            <button 
              ref={emojiTriggerRef}
              onClick={() => setShowEmojiPicker(true)}
              className="px-1.5 py-0.5 bg-gray-50 hover:bg-blue-50 rounded-md text-gray-500 hover:text-blue-600 transition-all flex items-center gap-1 border border-gray-100"
            >
              <Smile size={10} className="text-amber-400" />
              <span translate="no" className="notranslate text-[8.5px] font-black uppercase tracking-wider">
                Emoji
              </span>
            </button>
            
            {canAttach && (
              <div className="flex items-center gap-0.5 border-l border-gray-100 ml-0.5 pl-2">
                <button 
                  className="p-1 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600 transition-all"
                  title="Hình ảnh"
                  onClick={() => alert("Tính năng gửi hình ảnh đang được đồng bộ...")}
                >
                  <Image size={12} />
                </button>
                <button 
                  className="p-1 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600 transition-all"
                  title="Đính kèm"
                  onClick={() => alert("Tính năng đính kèm tài liệu đang được đồng bộ...")}
                >
                  <Paperclip size={12} />
                </button>
              </div>
            )}
          </div>

          <div className="relative flex gap-1.5 items-center bg-gray-50/80 rounded-lg p-1.5 border border-gray-100 focus-within:border-blue-300 focus-within:bg-white transition-all">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent py-0.5 px-1.5 text-[13px] outline-none transition-all resize-none h-[30px] leading-tight text-gray-800 font-medium placeholder:text-gray-400 notranslate"
              placeholder="Nhập..."
              value={newMessage}
              translate="no"
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSend();
                }
              }}
            />
            <button 
              onClick={(e) => { e.stopPropagation(); handleSend(); }}
              disabled={!newMessage.trim()}
              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-all shadow-md shadow-blue-600/20 active:scale-95"
            >
              <Send size={12} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Resizer Handle */}
        <div 
          onMouseDown={startResizing}
          className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[100000] flex items-end justify-end p-0.5 group/resize overflow-hidden rounded-br-xl"
          title="Kéo để thay đổi kích thước"
        >
          <div className="w-2 h-2 border-r-2 border-b-2 border-blue-600/30 group-hover/resize:border-blue-600 transition-colors"></div>
        </div>
      </motion.div>
    </Portal>
  );
};
