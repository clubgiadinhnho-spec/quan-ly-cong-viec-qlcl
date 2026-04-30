import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Send, MessageSquare, User as UserIcon, Smile } from 'lucide-react';
import { User, TaskComment } from '../types';
import { formatDateTime } from '../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../components/common/ReactionPicker';
import { Avatar } from '../components/common/Avatar';

interface GroupChatPageProps {
  currentUser: User;
  users: User[];
  messages: TaskComment[];
  onSendMessage: (content: string) => void;
  onReact?: (msgId: string, emoji: string) => void;
}

export const GroupChatPage = ({ currentUser, users, messages, onSendMessage, onReact }: GroupChatPageProps) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Messages area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <MessageSquare size={48} className="mb-4" />
            <p className="text-sm font-bold uppercase tracking-widest">Phòng chat chung của phòng</p>
            <p className="text-xs italic mt-1">Bắt đầu thảo luận công việc tại đây...</p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.authorId === currentUser.id;
            const author = users.find(s => s.id === msg.authorId);
            
            return (
              <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-start gap-3 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <Avatar src={author?.avatar} name={author?.name} className="sticky top-0" />
                  )}
                  <div className="space-y-1">
                    {!isMe && (
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter ml-1">
                        {author?.name} • <span className="text-[8px]">{author?.role}</span>
                      </p>
                    )}
                    <div className={`p-4 rounded-2xl text-xs leading-relaxed shadow-sm relative group/msg ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                    }`}>
                      {msg.content}

                      {/* Reaction trigger */}
                      <div className={`absolute top-0 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-full p-0.5 shadow-sm ${
                        isMe ? '-left-8' : '-right-8'
                      }`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiFor(msg.id);
                          }}
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
                    
                    <ReactionBadge reactions={msg.reactions} users={users} />

                    <p className={`text-[9px] text-gray-400 font-bold px-1 ${isMe ? 'text-right' : 'text-left'}`}>
                      {formatDateTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input area */}
      <div className="p-6 border-t border-gray-100 bg-white">
        <div className="relative max-w-4xl mx-auto">
          <textarea
            className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-4 pl-6 pr-16 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all resize-none h-24"
            placeholder="Nhập nội dung thảo luận chung cho cả phòng..."
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
            className="absolute right-3 bottom-3 p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 disabled:opacity-50 disabled:shadow-none"
          >
            <Send size={20} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center font-bold uppercase tracking-widest opacity-60">Nhấn Enter để gửi phản hồi</p>
      </div>
    </div>
  );
};
