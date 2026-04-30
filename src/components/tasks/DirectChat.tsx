import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Send, X, Minus, ChevronUp, Smile } from 'lucide-react';
import { User, PrivateMessage } from '../../types';
import { formatDateTime } from '../../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../common/ReactionPicker';
import { Avatar } from '../common/Avatar';
import { auth } from '../../lib/firebase';

interface DirectChatProps {
  currentUser: User;
  otherUser: User;
  messages: PrivateMessage[];
  onSendMessage: (content: string, senderId: string, receiverId: string) => void;
  onClose: () => void;
  onReact?: (msgId: string, emoji: string) => void;
  allUsers: User[];
}

export const DirectChat = ({ currentUser, otherUser, messages, onSendMessage, onClose, onReact, allUsers }: DirectChatProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!currentUser?.id || !otherUser?.id) {
    return (
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[999] flex items-center justify-center">
        <div className="bg-white p-6 rounded-2xl shadow-xl">
          <p className="text-sm font-bold text-red-500">Lỗi: Không tìm thấy ID người dùng để tạo cuộc trò chuyện.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg text-xs">Đóng</button>
        </div>
      </div>
    );
  }

  // Use the Firebase UID as priority for identifying "Me", falling back to currentUser.id
  const myRelevantId = auth.currentUser?.uid || currentUser.id;
  const chatId = [myRelevantId, otherUser.id].sort().join('_');
  
  // Filter messages for this chat. We check both the strict chatId and 
  // potentially messages sent during the ID transition.
  const chatMessages = messages.filter(m => {
    const isMainChat = m.chatId === chatId;
    // Also include messages if they match the sender/receiver pair regardless of which ID was used for "me"
    const isMeOther = (m.senderId === myRelevantId || m.senderId === currentUser.id) && m.receiverId === otherUser.id;
    const isOtherMe = m.senderId === otherUser.id && (m.receiverId === myRelevantId || m.receiverId === currentUser.id);
    return isMainChat || isMeOther || isOtherMe;
  });

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
    <motion.div
      initial={{ x: '100%' }}
      animate={{ 
        x: 0,
        height: isMinimized ? '48px' : '100%',
        bottom: isMinimized ? '20px' : '0',
        right: isMinimized ? '20px' : '0',
        top: isMinimized ? 'auto' : '0',
        maxHeight: isMinimized ? '48px' : '100%'
      }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className={`fixed ${isMinimized ? 'w-72 rounded-xl border border-gray-200' : 'h-full w-full max-w-sm border-l border-gray-100'} bg-white shadow-2xl z-[9999] flex flex-col`}
    >
      {/* Header */}
      <div className={`p-4 ${isMinimized ? 'h-full' : 'border-b border-gray-100 bg-gray-50'} flex items-center justify-between cursor-pointer`} onClick={() => isMinimized && setIsMinimized(false)}>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar 
              src={otherUser.avatar} 
              name={otherUser.name} 
              size={isMinimized ? 'sm' : 'lg'}
              className="border-2 border-white shadow-sm transition-all"
            />
            {otherUser.lastActive && Date.now() - otherUser.lastActive < 120000 && (
              <span className={`absolute bottom-0 right-0 ${isMinimized ? 'w-2 h-2' : 'w-3 h-3'} bg-green-500 border-2 border-white rounded-full`}></span>
            )}
          </div>
          <div>
            <h3 className={`${isMinimized ? 'text-[11px]' : 'text-sm'} font-black text-gray-800 uppercase tracking-tighter`}>{otherUser.name}</h3>
            {!isMinimized && (
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-2">
                {otherUser.role} <span className="w-1 h-1 bg-gray-300 rounded-full"></span> {otherUser.abbreviation}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(!isMinimized);
            }} 
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title={isMinimized ? "Mở rộng" : "Thu gọn"}
          >
            {isMinimized ? <ChevronUp size={16} className="text-gray-500" /> : <Minus size={16} className="text-gray-500" />}
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={16} className="text-gray-400" />
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
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageCircle className="text-gray-300" size={24} />
            </div>
            <p className="text-xs text-gray-400 italic">Bắt đầu trò chuyện với {otherUser.name}</p>
          </div>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.senderId === myRelevantId || msg.senderId === currentUser.id;
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-sm w-full relative group/msg ${
                  isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                }`}>
                  {msg.content}
                  
                  {/* Reaction trigger */}
                  <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-0.5 shadow-sm ${
                    isMe ? '-left-8' : '-right-8'
                  }`}>
                    <button 
                      onClick={() => setShowEmojiFor(msg.id)}
                      className="p-1 hover:bg-gray-100 rounded-full text-gray-500"
                    >
                      <Smile size={14} />
                    </button>
                  </div>

                  <ReactionPicker 
                    isOpen={showEmojiFor === msg.id}
                    onClose={() => setShowEmojiFor(null)}
                    onSelect={(emoji) => onReact?.(msg.id, emoji)}
                    position="top"
                  />
                </div>
                
                <ReactionBadge reactions={msg.reactions} users={allUsers} />

                <div className="mt-1 flex items-center gap-2 px-1">
                  <span className="text-[9px] text-gray-400 font-bold">{formatDateTime(msg.timestamp)}</span>
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
            placeholder="Nhập nội dung..."
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
        <p className="text-[9px] text-gray-400 mt-2 text-center font-bold uppercase italic tracking-tighter opacity-70">Nhấn Enter để gửi</p>
      </div>
        </>
      )}
    </motion.div>
    </>
  );
};
