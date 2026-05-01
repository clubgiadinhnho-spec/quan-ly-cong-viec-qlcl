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
    <div className="flex flex-col h-[calc(100vh-180px)] bg-white/70 backdrop-blur-xl rounded-[2rem] border-[2px] border-white shadow-[0_15px_35px_rgba(0,0,0,0.08)] overflow-hidden relative">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-rose-100/20 rounded-full blur-3xl -z-10 -mr-24 -mt-24" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-100/20 rounded-full blur-3xl -z-10 -ml-24 -mb-24" />

      {/* Modern Header - Compact */}
      <div className="px-6 py-3 border-b border-gray-100/50 bg-white/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-md border border-rose-400/20">
            <MessageSquare size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-[11px] font-black text-gray-800 uppercase tracking-widest">Phòng Thảo Luận Chung</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-[9px] text-gray-500 font-bold uppercase tracking-tight">{users.length} Thành viên</p>
            </div>
          </div>
        </div>
        <div className="flex -space-x-1.5">
          {users.slice(0, 8).map((u) => (
            <div key={u.id} className="w-7 h-7 rounded-full border-2 border-white overflow-hidden shadow-sm" title={u.name}>
              <Avatar src={u.avatar} name={u.name} size="xs" />
            </div>
          ))}
          {users.length > 8 && (
            <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-500 shadow-sm">
              +{users.length - 8}
            </div>
          )}
        </div>
      </div>

      {/* Modern Input Area - MOVED TO TOP */}
      <div className="p-3 md:p-4 bg-white/60 backdrop-blur-md border-b border-gray-100/30">
        <div className="relative max-w-4xl mx-auto flex items-center gap-3 bg-white/90 p-1.5 pl-4 rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.03)] border border-gray-100">
          <textarea
            className="flex-1 bg-transparent border-0 rounded-full py-2.5 text-xs outline-none focus:ring-0 transition-all resize-none h-10 max-h-24 font-medium"
            placeholder="Nhập nội dung thảo luận mới..."
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              e.target.style.height = '40px';
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
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
            className="w-10 h-10 flex-none flex items-center justify-center bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-full hover:scale-105 active:scale-95 transition-all shadow-md shadow-rose-200 disabled:opacity-30 disabled:grayscale disabled:scale-100"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </div>
      </div>

      {/* Messages area - Compact spacing */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6 bg-transparent scroll-smooth custom-scrollbar"
        style={{
          backgroundImage: `radial-gradient(#e5e7eb 0.5px, transparent 0.5px)`,
          backgroundSize: '24px 24px'
        }}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-rose-400 opacity-60" />
            </div>
            <p className="text-sm font-black text-gray-800 uppercase tracking-widest">Không gian thảo luận</p>
            <p className="text-[10px] text-gray-400 max-w-[200px] mt-1 font-bold uppercase tracking-tighter">Bắt đầu thảo luận công việc tại đây.</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = msg.authorId === currentUser.id;
            const author = users.find(s => s.id === msg.authorId);
            
            return (
              <motion.div 
                key={msg.id} 
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0, type: 'spring', damping: 25 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className={`flex items-start gap-2.5 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isMe && (
                    <motion.div whileHover={{ scale: 1.05 }} className="flex-none pt-1">
                       <Avatar src={author?.avatar} name={author?.name} size="sm" />
                    </motion.div>
                  )}
                  <div className="space-y-1">
                    {!isMe && (
                      <div className="flex items-center gap-2 mb-0.5 ml-1">
                        <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                          <span translate="no" className="notranslate">{author?.name}</span>
                        </p>
                        <span className="text-[7px] px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md font-black uppercase border border-rose-100/50">
                          {author?.role}
                        </span>
                      </div>
                    )}
                    <div className={`px-4 py-3 rounded-[1.5rem] text-[12px] leading-snug shadow-sm relative group/msg transition-all hover:shadow-md ${
                      isMe 
                        ? 'bg-gradient-to-br from-rose-500 to-rose-600 text-white rounded-tr-none' 
                        : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none ring-1 ring-black/[0.02]'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Reaction trigger - Compact */}
                      <div className={`absolute top-1 opacity-0 group-hover/msg:opacity-100 transition-all flex gap-0.5 bg-white border border-gray-100 rounded-full p-0.5 shadow-lg z-10 ${
                        isMe ? '-left-10' : '-right-10'
                      }`}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmojiFor(msg.id);
                          }}
                          className="p-1 hover:bg-rose-50 hover:text-rose-500 rounded-full text-gray-400"
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
                    
                    <div className={`flex items-center gap-1.5 mt-0.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                       <ReactionBadge reactions={msg.reactions} users={users} />
                       <p className={`text-[8px] text-gray-400 font-bold opacity-50 uppercase tracking-widest`}>
                        {formatDateTime(msg.timestamp)}
                       </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

    </div>
  );
};

