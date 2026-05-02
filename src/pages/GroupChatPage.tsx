import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  Send, 
  MessageSquare, 
  Plus, 
  Hash, 
  Lock, 
  Image as ImageIcon, 
  Paperclip, 
  Smile, 
  X,
  FileText,
  Archive,
  Unlock,
  History,
  ChevronRight,
  Trash2,
  Settings,
  Download,
  Loader2
} from 'lucide-react';
import { User, DiscussionTopic, DiscussionMessage } from '../types';
import { formatDateTime } from '../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../components/common/ReactionPicker';
import { Avatar } from '../components/common/Avatar';
import imageCompression from 'browser-image-compression';

interface GroupChatPageProps {
  currentUser: User;
  users: User[];
  topics: DiscussionTopic[];
  messages: DiscussionMessage[];
  onSendMessage: (topicId: string, content: string, attachments?: any[]) => void;
  onReact: (msgId: string, emoji: string) => void;
  onCreateTopic: (title: string, desc: string) => void;
  onUpdateTopic: (topicId: string, updates: Partial<DiscussionTopic>) => void;
  onDeleteTopic: (topicId: string) => void;
  onCleanup?: (days: number) => void;
}

export const GroupChatPage = ({ 
  currentUser, 
  users, 
  topics, 
  messages, 
  onSendMessage, 
  onReact,
  onCreateTopic,
  onUpdateTopic,
  onDeleteTopic,
  onCleanup
}: GroupChatPageProps) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const handleDownloadTopic = async (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (!topic) return;

    setIsDownloading(true);
    try {
      const topicMsgs = messages.filter(m => m.topicId === topicId);
      const zip = new JSZip();
      
      const folder = zip.folder(topic.title);
      if (!folder) throw new Error("Could not create folder");

      // 1. Create Messages Transcript
      let transcript = `CHỦ ĐỀ: ${topic.title}\n`;
      transcript += `Mô tả: ${topic.description || 'N/A'}\n`;
      transcript += `Ngày tạo: ${formatDateTime(topic.createdAt)}\n`;
      transcript += `------------------------------------------\n\n`;

      topicMsgs.forEach(msg => {
        const author = users.find(u => u.id === msg.authorId);
        transcript += `[${formatDateTime(msg.timestamp)}] ${author?.name || 'Unknown'}: ${msg.content}\n`;
        if (msg.attachments && msg.attachments.length > 0) {
          transcript += `Đính kèm: ${msg.attachments.map(a => a.name).join(', ')}\n`;
        }
        transcript += `\n`;
      });

      folder.file("transcript.txt", transcript);

      // 2. Add Attachments
      const attachmentsFolder = folder.folder("attachments");
      if (attachmentsFolder) {
        for (const msg of topicMsgs) {
          if (msg.attachments) {
            for (const att of msg.attachments) {
              try {
                const res = await fetch(att.url);
                const blob = await res.blob();
                attachmentsFolder.file(`${msg.id}_${att.name}`, blob);
              } catch (err) {
                console.error(`Failed to download attachment ${att.name}:`, err);
              }
            }
          }
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Nutifood_Archive_${topic.title.replace(/\s+/g, '_')}.zip`);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTopicDelete = (topicId: string) => {
    onDeleteTopic(topicId);
    if (selectedTopicId === topicId) setSelectedTopicId(null);
    setShowDeleteTopicConfirm(null);
  };
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Default topic if none selected or if first load
  useEffect(() => {
    if (!selectedTopicId && topics.length > 0) {
      const freeChat = topics.find(t => t.title.toLowerCase() === 'tự do' && t.status === 'OPEN');
      if (freeChat) setSelectedTopicId(freeChat.id);
      else {
        const firstOpen = topics.find(t => t.status === 'OPEN');
        if (firstOpen) setSelectedTopicId(firstOpen.id);
      }
    }
  }, [topics, selectedTopicId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedTopicId]);

  const activeTopic = topics.find(t => t.id === selectedTopicId);
  const filteredMessages = messages.filter(m => m.topicId === selectedTopicId);

  const handleSend = () => {
    if (!newMessage.trim() && pendingAttachments.length === 0) return;
    if (!selectedTopicId) return;

    onSendMessage(selectedTopicId, newMessage, pendingAttachments);
    setNewMessage('');
    setPendingAttachments([]);
  };

  const compressAndUpload = async (file: File) => {
    setIsUploading(true);
    try {
      let processedFile: File | Blob = file;
      let type: 'image' | 'file' = 'file';

      if (file.type.startsWith('image/')) {
        type = 'image';
        const options = {
          maxSizeMB: 0.1, // Compress to ~100KB max
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        };
        processedFile = await imageCompression(file, options);
      }

      const reader = new FileReader();
      reader.readAsDataURL(processedFile);
      reader.onload = () => {
        const base64 = reader.result as string;
        setPendingAttachments(prev => [...prev, {
          name: file.name,
          url: base64,
          type,
          size: processedFile.size
        }]);
        setIsUploading(false);
      };
    } catch (err) {
      console.error("Compression failed:", err);
      setIsUploading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(compressAndUpload);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) compressAndUpload(file);
      }
    }
  };

  const toggleTopicStatus = (topic: DiscussionTopic) => {
    const newStatus = topic.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    onUpdateTopic(topic.id, { status: newStatus });
    
    // Auto-switch to "Tự do" if closing
    if (newStatus === 'CLOSED') {
      const freeChat = topics.find(t => t.title.toLowerCase() === 'tự do');
      if (freeChat) setSelectedTopicId(freeChat.id);
    }
  };

  const getAuthor = (id: string) => users.find(u => u.id === id);

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-100px)] flex gap-4 animate-in fade-in duration-500 relative">
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200/20 rounded-full blur-3xl pointer-events-none" />
      
      {/* Sidebar: Topics List */}
      <div className="w-80 flex flex-col bg-white/70 backdrop-blur-xl rounded-[32px] border-4 border-slate-50 shadow-2xl overflow-hidden shrink-0">
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[14px] font-black text-slate-900 tracking-widest uppercase">Chủ đề thảo luận</h2>
            <button 
              onClick={() => setShowCreateTopic(true)}
              className="p-2 bg-blue-600 text-white rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-200"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl mb-4">
            <button 
              onClick={() => setShowArchived(false)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${!showArchived ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ĐANG MỞ
            </button>
            <button 
              onClick={() => setShowArchived(true)}
              className={`flex-1 py-2 text-[10px] font-bold rounded-lg transition-all ${showArchived ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              ĐÃ ĐÓNG
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {topics.filter(t => (showArchived ? t.status === 'CLOSED' : t.status === 'OPEN')).map(topic => {
            const isFreeChat = topic.title.toLowerCase() === 'tự do';
            const isActive = selectedTopicId === topic.id;
            
            return (
              <button
                key={topic.id}
                onClick={() => setSelectedTopicId(topic.id)}
                className={`w-full flex items-center gap-3 rounded-[24px] transition-all relative group ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' 
                    : 'text-slate-600 hover:bg-slate-50'
                } ${isFreeChat ? 'py-2 px-4 h-[60px]' : 'py-4 px-4 min-h-[85px]'}`}
              >
                <div className={`shrink-0 p-2 rounded-xl transition-all ${isActive ? 'bg-white/20' : 'bg-slate-100 text-slate-400'}`}>
                  {topic.status === 'CLOSED' ? <Lock size={16} /> : <Hash size={16} />}
                </div>
                
                <div className="text-left flex-1 min-w-0 flex flex-col justify-between h-full">
                  <p className={`font-black truncate uppercase tracking-tighter ${isFreeChat ? 'text-[11px] mb-1' : 'text-[13px] mb-2'}`}>
                    {topic.title}
                  </p>
                  
                  <div className={`flex items-center gap-2 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                    <div className="w-5 h-5 rounded-full overflow-hidden border border-white/30 shrink-0">
                      <Avatar src={topic.creatorAvatar} name={topic.title} size="xs" />
                    </div>
                    <div className="flex items-baseline gap-2 min-w-0">
                      <p className="text-[8px] font-black uppercase tracking-tighter truncate max-w-[80px]">
                        {topic.createdBy === 'SYSTEM' ? 'Hệ thống' : (getAuthor(topic.createdBy)?.name || 'Nutifood')}
                      </p>
                      <span className="text-[7px] font-mono opacity-50 underline decoration-dotted">
                        {formatDateTime(topic.createdAt).split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          {topics.filter(t => (showArchived ? t.status === 'CLOSED' : t.status === 'OPEN')).length === 0 && (
            <div className="py-12 px-6 text-center">
               <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-4">
                  <History size={24} />
               </div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chưa có chủ đề nào</p>
            </div>
          )}
        </div>

        {currentUser.role === 'Admin' && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <button 
              onClick={() => setShowCleanupConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-red-100 text-red-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-50 hover:border-red-200 transition-all shadow-sm"
            >
              <Trash2 size={14} />
              Dọn dẹp dung lượng
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-[32px] border-4 border-slate-50 shadow-2xl overflow-hidden relative">
        {activeTopic ? (
          <>
            {/* Header */}
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between backdrop-blur-md sticky top-0 z-10 bg-white/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Hash size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-[18px] font-black text-slate-900 leading-none mb-1 uppercase tracking-tight">{activeTopic.title}</h1>
                  <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">{activeTopic.description || 'Thảo luận về các nội dung liên quan...'}</p>
                </div>
              </div>

              {/* User Avatars with Message Counts */}
              <div className="hidden lg:flex items-center gap-4 p-2 bg-white/50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  {users.slice(0, 5).map(u => {
                    const count = filteredMessages.filter(m => m.authorId === u.id).length;
                    return (
                      <div key={u.id} className="relative group">
                        <Avatar src={u.avatar} name={u.name} size="sm" />
                        {count > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[9px] font-black rounded-full border-2 border-white flex items-center justify-center shadow-lg animate-bounce">
                            {count}
                          </div>
                        )}
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap shadow-xl transition-all z-50">
                          {u.name}
                        </div>
                      </div>
                    );
                  })}
                  {users.length > 5 && (
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                      +{users.length - 5}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleDownloadTopic(activeTopic.id)}
                  disabled={isDownloading}
                  className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm"
                  title="Tải về dữ liệu"
                >
                  {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                </button>

                <button 
                  onClick={() => toggleTopicStatus(activeTopic)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${
                    activeTopic.status === 'OPEN' 
                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-700 hover:text-white' 
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  {activeTopic.status === 'OPEN' ? (
                    <><Archive size={14} /> Đóng</>
                  ) : (
                    <><Unlock size={14} /> Mở lại</>
                  )}
                </button>

                {currentUser.role === 'Admin' && (
                  <button 
                    onClick={() => setShowDeleteTopicConfirm(activeTopic.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    title="Xóa vĩnh viễn"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-slate-50/20"
            >
              {filteredMessages.map((msg, idx) => {
                const author = getAuthor(msg.authorId);
                const isMe = msg.authorId === currentUser.id;
                const showAvatar = idx === 0 || filteredMessages[idx - 1].authorId !== msg.authorId;

                return (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-3 max-w-[80%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="flex-none pt-1">
                        {showAvatar ? (
                          <Avatar src={author?.avatar} name={author?.name} size="sm" />
                        ) : (
                          <div className="w-10" />
                        )}
                      </div>
                      <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        {showAvatar && (
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 px-1">{author?.name}</span>
                        )}
                        <div 
                          className={`group relative p-4 rounded-[22px] shadow-sm transform transition-all ${
                            isMe 
                              ? 'bg-blue-600 text-white rounded-tr-none' 
                              : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none'
                          }`}
                        >
                          <p className="text-[13px] leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
                          
                          {/* Attachments */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.attachments.map((file, fIdx) => (
                                <div key={fIdx} className="rounded-xl overflow-hidden border border-white/20 shadow-md">
                                  {file.type === 'image' ? (
                                    <img src={file.url} alt={file.name} className="max-w-full h-auto max-h-64 object-cover cursor-zoom-in" onClick={() => window.open(file.url, '_blank')} />
                                  ) : (
                                    <div className={`flex items-center gap-3 p-3 ${isMe ? 'bg-white/10' : 'bg-slate-50'}`}>
                                      <FileText size={20} className={isMe ? 'text-white' : 'text-blue-600'} />
                                      <div className="min-w-0">
                                        <p className="text-[12px] font-bold truncate">{file.name}</p>
                                        <p className="text-[9px] opacity-70">{(file.size / 1024).toFixed(1)} KB</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className={`absolute -bottom-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ${isMe ? 'right-0' : 'left-0'}`}>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">{formatDateTime(msg.timestamp)}</span>
                          </div>

                          {/* Reaction Trigger */}
                          <div className={`absolute top-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-20 ${isMe ? '-left-8' : '-right-8'}`}>
                            <button 
                              onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                              className="w-7 h-7 bg-white shadow-lg border border-slate-100 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110"
                            >
                              <Smile size={16} />
                            </button>
                            {showEmojiFor === msg.id && (
                              <div className="absolute top-8 z-50">
                                <ReactionPicker onSelect={(emoji) => {
                                  onReact(msg.id, emoji);
                                  setShowEmojiFor(null);
                                }} />
                              </div>
                            )}
                          </div>

                          {/* Reaction Badges */}
                          {msg.reactions && msg.reactions.length > 0 && (
                            <div className={`absolute -bottom-4 flex gap-1 ${isMe ? 'right-0' : 'left-0'}`}>
                              <ReactionBadge 
                                reactions={msg.reactions} 
                                onReact={(emoji) => onReact(msg.id, emoji)}
                                currentUserId={currentUser.id}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Input Area */}
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 backdrop-blur-md relative">
              {activeTopic.status === 'CLOSED' ? (
                <div className="flex items-center justify-center gap-3 py-4 bg-slate-700/5 rounded-[24px] border border-dashed border-slate-200">
                   <Lock size={18} className="text-slate-400" />
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic">Chủ đề này đã được đóng • Chỉ đọc</p>
                </div>
              ) : (
                <>
                  {pendingAttachments.length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-4 animate-in slide-in-from-bottom-2">
                       {pendingAttachments.map((f, i) => (
                         <div key={i} className="relative group w-20 h-20 bg-white rounded-2xl border-2 border-blue-100 shadow-xl overflow-hidden">
                           {f.type === 'image' ? (
                             <img src={f.url} className="w-full h-full object-cover" />
                           ) : (
                             <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                <FileText size={20} className="text-blue-500" />
                                <p className="text-[8px] font-bold truncate w-full text-center mt-1">{f.name}</p>
                             </div>
                           )}
                           <button 
                            onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                            className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all"
                           >
                             <X size={12} />
                           </button>
                         </div>
                       ))}
                    </div>
                  )}

                  <div className="relative flex items-center gap-3 bg-white p-2.5 rounded-[24px] shadow-2xl border border-blue-50 ring-8 ring-slate-100/30">
                    <div className="flex items-center gap-1 pl-2 shrink-0">
                      <button 
                        onClick={() => imageInputRef.current?.click()}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all"
                      >
                        <ImageIcon size={18} />
                      </button>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-10 h-10 bg-slate-50 text-slate-400 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all"
                      >
                        <Paperclip size={18} />
                      </button>
                    </div>

                    <textarea
                      className="flex-1 bg-transparent border-0 py-3 px-2 text-[13px] outline-none focus:ring-0 transition-all resize-none h-12 max-h-32 font-medium text-slate-700 custom-scrollbar"
                      placeholder={`Phản hồi chủ đề...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onPaste={handlePaste}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />

                    <button 
                      onClick={handleSend}
                      disabled={isUploading || (!newMessage.trim() && pendingAttachments.length === 0)}
                      className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-200 disabled:opacity-20 disabled:scale-100"
                    >
                      <Send size={20} className="ml-1" strokeWidth={2.5} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-blue-50 rounded-[40px] flex items-center justify-center text-blue-600 mb-8">
              <MessageSquare size={48} strokeWidth={2.5} />
            </div>
            <h2 className="text-[24px] font-black text-slate-900 uppercase tracking-tight mb-4">Chào mừng thảo luận</h2>
            <p className="text-slate-400 max-w-sm font-medium mb-8">
              Chọn một chủ đề bên trái để bắt đầu thảo luận hoặc tạo mới để trao đổi về công việc.
            </p>
            <button 
              onClick={() => setShowCreateTopic(true)}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
            >
              Tạo chủ đề mới ngay
            </button>
          </div>
        )}
      </div>

      {/* Hidden Inputs */}
      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      <input type="file" accept="image/*" multiple ref={imageInputRef} onChange={handleFileUpload} className="hidden" />

      {/* Create Topic Modal */}
      <AnimatePresence>
        {showCreateTopic && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-white rounded-[40px] shadow-2xl border-4 border-white overflow-hidden p-8"
            >
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-tight">Tạo chủ đề mới</h2>
                 <button onClick={() => setShowCreateTopic(false)} className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-100 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tên chủ đề</label>
                    <input 
                      type="text" 
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 ring-blue-50 font-bold text-slate-700 uppercase"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Mô tả (Tùy chọn)</label>
                    <textarea 
                      className="w-full px-6 py-4 bg-slate-50 border-0 rounded-2xl outline-none focus:ring-4 ring-blue-50 font-bold text-slate-700 min-h-[100px] resize-none"
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                    />
                 </div>
                 <button 
                  disabled={!newTopicTitle.trim()}
                  onClick={() => {
                    onCreateTopic(newTopicTitle, newTopicDesc);
                    setShowCreateTopic(false);
                    setNewTopicTitle('');
                    setNewTopicDesc('');
                  }}
                  className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-2xl shadow-blue-200 transition-all disabled:opacity-20"
                 >
                   XÁC NHẬN TẠO
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Topic Confirmation Modal */}
      <AnimatePresence>
        {showDeleteTopicConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl border-4 border-white p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-tight mb-2">Xóa chủ đề?</h2>
              <p className="text-[13px] text-slate-500 font-medium mb-8">
                Bạn có muốn tải về dữ liệu trước khi xóa vĩnh viễn không? Hành động này không thể hoàn tác.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={async () => {
                    await handleDownloadTopic(showDeleteTopicConfirm);
                    handleTopicDelete(showDeleteTopicConfirm);
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} /> TẢI VỀ & XÓA
                </button>
                <button 
                  onClick={() => handleTopicDelete(showDeleteTopicConfirm)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  XÓA KHÔNG CẦN TẢI
                </button>
                <button 
                  onClick={() => setShowDeleteTopicConfirm(null)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-200 transition-all"
                >
                  HUỶ BỎ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cleanup Confirmation Modal */}
      <AnimatePresence>
        {showCleanupConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl border-4 border-white p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h2 className="text-[20px] font-black text-slate-900 uppercase tracking-tight mb-2">Dọn dẹp dữ liệu</h2>
              <p className="text-[13px] text-slate-500 font-medium mb-8">
                Hành động này sẽ xóa vĩnh viễn các tin nhắn và tệp đính kèm cũ hơn 30 ngày để giải phóng bộ nhớ. Bạn có chắc chắn?
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    onCleanup?.(30);
                    setShowCleanupConfirm(false);
                  }}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black uppercase tracking-widest text-[12px] shadow-xl shadow-red-100 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  XÁC NHẬN XÓA DỮ LIỆU CŨ
                </button>
                <button 
                  onClick={() => setShowCleanupConfirm(false)}
                  className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[12px] hover:bg-slate-200 transition-all font-mono"
                >
                  HỦY BỎ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

