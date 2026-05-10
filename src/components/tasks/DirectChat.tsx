import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Minus, ChevronUp, Smile, Image, Paperclip } from 'lucide-react';
import { User, PrivateMessage } from '../../types';
import { formatDateTime } from '../../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../common/ReactionPicker';
import { EmojiPicker } from '../common/EmojiPicker';
import { Avatar } from '../common/Avatar';
import { ChatIcon } from '../common/Icons';
import { auth } from '../../lib/firebase';

import { getUserById, getSafeNameProps } from '../../utils/userUtils';

interface DirectChatProps {
  currentUser: User;
  otherUser: User;
  messages: PrivateMessage[];
  onSendMessage: (content: string, senderId: string, receiverId: string) => void;
  onClose: () => void;
  onReact?: (msgId: string, emoji: string) => void;
  allUsers: User[];
  onJumpToTask?: (taskId: string) => void;
  variant?: 'panel' | 'bubble';
  top?: number;
  isMinimized?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
}

export const DirectChat = ({ 
  currentUser, 
  otherUser, 
  messages, 
  onSendMessage, 
  onClose, 
  onReact, 
  allUsers,
  onJumpToTask,
  variant = 'panel',
  top = 0,
  isMinimized = false,
  onMinimizeChange
}: DirectChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-focus input when panel opens or bubble is shown
  useEffect(() => {
    if (!isMinimized && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isMinimized, otherUser.id]);

  // Adjust top position to stay within viewport and center the bubble on click location
  const bubbleHeight = 380;
  const adjustedTop = variant === 'bubble' 
    ? Math.min(Math.max(20, top - bubbleHeight / 2), window.innerHeight - bubbleHeight - 20) 
    : top;

  // Click outside to minimize logic
  useEffect(() => {
    if (variant !== 'bubble' || isMinimized) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking far enough from the bubble, minimize it
      if (!target.closest('.direct-chat-bubble')) {
        onMinimizeChange?.(true);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100); 

    const autoMinimizeTimer = setTimeout(() => {
      if (!isMinimized) {
        onMinimizeChange?.(true);
      }
    }, 60000); // 1 minute exactly

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearTimeout(timer);
      clearTimeout(autoMinimizeTimer);
    };
  }, [variant, isMinimized, newMessage, messages.length]);

  // Use the Firebase UID as priority for identifying "Me", falling back to currentUser.id
  const myRelevantId = auth.currentUser?.uid || currentUser.id;
  
  // Filter messages for this chat. We check both the strict chatId and 
  // potentially messages sent during the ID transition.
  const myChatId = [myRelevantId, otherUser.id].sort().join('_');
  const chatMessages = messages.filter(m => {
    const isMainChat = m.chatId === myChatId;
    // Also include messages if they match the sender/receiver pair regardless of which ID was used for "me"
    const isMeOther = (m.senderId === myRelevantId || m.senderId === currentUser.id) && m.receiverId === otherUser.id;
    const isOtherMe = m.senderId === otherUser.id && (m.receiverId === myRelevantId || m.receiverId === currentUser.id);
    return isMainChat || isMeOther || isOtherMe;
  });

  // Track the timestamp of when the chat was minimized to handle "new message" color
  const minimizedAt = useRef<number>(0);
  useEffect(() => {
    if (isMinimized) {
      minimizedAt.current = Date.now();
    }
  }, [isMinimized]);

  const hasNewMessagesWhileMinimized = isMinimized && chatMessages.some(m => 
    m.senderId === otherUser.id && new Date(m.timestamp).getTime() > minimizedAt.current
  );

  if (!currentUser?.id || !otherUser?.id) {
    return null;
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage, myRelevantId, otherUser.id);
    setNewMessage('');
  };

  return (
    <>
    <AnimatePresence>
      {!isMinimized && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/5 z-[9998]"
        />
      )}
    </AnimatePresence>
    <AnimatePresence>
      <motion.div
        layout="position"
        initial={variant === 'bubble' ? { opacity: 0, scale: 0.1, x: -80, top: top, left: 240 } : { x: '100%' }}
        animate={{ 
          x: 0,
          y: 0,
          opacity: 1,
          scale: 1,
          height: isMinimized ? '48px' : (variant === 'bubble' ? `${bubbleHeight}px` : '100%'),
          top: isMinimized ? top - 24 : adjustedTop,
          left: isMinimized ? 215 : 260,
          maxHeight: isMinimized ? '48px' : (variant === 'bubble' ? `${bubbleHeight}px` : '100%'),
          zIndex: 10001
        }}
        style={{ transformOrigin: 'left center' }}
        exit={variant === 'bubble' ? { opacity: 0, scale: 0, x: -50 } : { x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={`fixed flex flex-col transition-all direct-chat-bubble ${
          isMinimized 
            ? 'w-14 h-12 border-0 bg-white shadow-xl rounded-full p-1' 
            : (variant === 'bubble' 
                ? 'w-80 rounded-[2.5rem] border-[3px] border-blue-100 shadow-2xl overflow-visible bg-white' 
                : 'h-full w-full max-w-sm border-l border-gray-100 bg-white'
              )
        }`}
      >
        {variant === 'bubble' && !isMinimized && (
          <div 
            className="absolute w-6 h-8 bg-white border-blue-100 border-l-[3px] border-b-[3px] z-[1]" 
            style={{ 
              clipPath: 'polygon(100% 0, 100% 100%, 0 50%)',
              top: `${Math.max(20, Math.min(top - adjustedTop - 12, bubbleHeight - 40))}px`,
              left: '-16px'
            }} 
          />
        )}

      {isMinimized && variant === 'bubble' ? (
        <button 
          onClick={() => onMinimizeChange?.(false)}
          className={`relative w-full h-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 group`}
        >
          <ChatIcon className="w-full h-full drop-shadow-md" />
          {hasNewMessagesWhileMinimized && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full animate-bounce flex items-center justify-center text-[8px] text-white font-black shadow-sm">!</span>
          )}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[8px] py-0.5 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap font-bold pointer-events-none z-10 shadow-lg" {...getSafeNameProps()}>
            {otherUser.name}
          </div>
        </button>
      ) : (
        <>
          {/* Header */}
          <div className={`p-4 ${isMinimized ? 'h-full' : 'border-b border-blue-400/20 bg-blue-500 rounded-t-[2.5rem]'} flex items-center justify-between cursor-pointer shadow-md`} onClick={() => isMinimized && onMinimizeChange?.(false)}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar 
                  src={otherUser.avatar} 
                  name={otherUser.name} 
                  size={isMinimized || variant === 'bubble' ? 'sm' : 'lg'}
                  className="border-2 border-white/20 shadow-sm transition-all"
                />
                {otherUser.lastActive && Date.now() - otherUser.lastActive < 60000 && (
                  <span className={`absolute bottom-0 right-0 ${isMinimized ? 'w-2 h-2' : 'w-2.5 h-2.5'} bg-green-400 border-2 border-blue-500 rounded-full`}></span>
                )}
              </div>
              <div className="min-w-0">
                <h3 {...getSafeNameProps()} className={`${isMinimized || variant === 'bubble' ? 'text-[11px]' : 'text-sm'} font-black text-white uppercase tracking-tighter truncate w-32 notranslate`}>
                   <span translate="no" className="notranslate">{otherUser.name}</span>
                </h3>
                {!isMinimized && variant !== 'bubble' && (
                  <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest flex items-center gap-2">
                    {otherUser.role} <span className="w-1 h-1 bg-white/30 rounded-full"></span> {otherUser.abbreviation}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimizeChange?.(!isMinimized);
                }} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                title={isMinimized ? "Mở rộng" : "Thu gọn"}
              >
                {isMinimized ? <ChevronUp size={16} className="text-white" /> : <Minus size={16} className="text-white" />}
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }} 
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} className="text-white/70" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50"
              >
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <MessageCircle className="text-gray-300" size={20} />
                    </div>
                    <p className="text-[10px] text-gray-400 italic">Bắt đầu trò chuyện với {otherUser.name}</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.senderId === myRelevantId || msg.senderId === currentUser.id;
                    
                    // Regex find #UNDO_ followed by taskId
                    const undoMatch = msg.content.match(/#UNDO_([a-zA-Z0-9_\-]+)/);
                    const taskId = undoMatch ? undoMatch[1] : null;
                    const content = taskId 
                      ? msg.content.replace(`#UNDO_${taskId}`, '').trim()
                      : msg.content;

                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <div className={`p-3 rounded-2xl text-[11px] leading-relaxed shadow-sm w-full relative group/msg ${
                          isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                        }`}>
                          <span translate="no" className="notranslate">{content}</span>
                          {taskId && (
                            <button 
                              onClick={() => {
                                onJumpToTask?.(taskId);
                                // Optional: highlight animation or close chat
                              }}
                              className={`mt-2 block w-full p-2 rounded-lg text-center font-black transition-all border-2 ${
                                isMe 
                                  ? 'bg-white/20 border-white/40 text-white group-hover/msg:bg-white/30' 
                                  : 'bg-blue-50 border-blue-200 text-blue-700 group-hover/msg:bg-blue-100'
                              } animate-pulse shadow-sm`}
                            >
                                <span translate="no" className="notranslate">⚡ XEM CÔNG VIỆC CẦN HOÀN TÁC ⚡</span>
                            </button>
                          )}
                        </div>
                        
                        <ReactionBadge reactions={msg.reactions} users={allUsers} />

                        <div className="mt-1 flex items-center gap-2 px-1">
                          <span className="text-[8px] text-gray-400 font-bold">{formatDateTime(msg.timestamp)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input area - BOTTOM */}
              <div className="p-3 border-t border-gray-100 bg-white rounded-b-[2.5rem]">
                <div className="flex items-center gap-2 mb-2 px-1">
                  <button 
                    ref={emojiTriggerRef}
                    onClick={() => setShowEmojiPicker(true)}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1"
                  >
                    <Smile size={16} />
                    <span translate="no" className="notranslate text-[9px] font-bold uppercase">Emoji</span>
                  </button>

                  <EmojiPicker 
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelect={insertEmoji}
                    anchorRect={emojiTriggerRef.current?.getBoundingClientRect()}
                  />

                  {canAttach && (
                    <div className="flex items-center gap-1 border-l border-gray-100 ml-1 pl-2">
                      <button 
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                        onClick={() => alert("Tính năng gửi hình ảnh đang được đồng bộ...")}
                      >
                        <Image size={15} />
                      </button>
                      <button 
                        className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                        onClick={() => alert("Tính năng đính kèm đang được đồng bộ...")}
                      >
                        <Paperclip size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <textarea
                    ref={inputRef}
                    className={`w-full bg-gray-50 border border-gray-100 rounded-xl py-3 pl-4 pr-12 text-[11px] outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none ${variant === 'bubble' ? 'h-14' : 'h-16'}`}
                    placeholder="Nhập nội dung mới..."
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
                    <Send size={14} />
                  </button>
                </div>
              </div>

            </>
          )}
        </>
      )}
    </motion.div>
    </AnimatePresence>
    </>
  );
};
