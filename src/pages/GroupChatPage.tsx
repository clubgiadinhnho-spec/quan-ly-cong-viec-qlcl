import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { 
  RotateCcw,
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
  Loader2,
  Edit3
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
  onCreateTopic: (title: string, desc: string, orderCode: string) => void;
  onUpdateTopic: (topicId: string, updates: Partial<DiscussionTopic>) => void;
  onDeleteTopic: (topicId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onAddLog?: (type: any, details: string, metadata?: any) => void;
  presence?: string[];
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
  onDeleteMessage,
  onAddLog,
  presence = []
}: GroupChatPageProps) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED' | 'DELETED'>('OPEN');
  const [editTopic, setEditTopic] = useState<DiscussionTopic | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when topic changes
  useEffect(() => {
    if (selectedTopicId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedTopicId]);

  // Consolidated Topic selection logic to avoid redundant updates
  useEffect(() => {
    if (topics.length === 0) return;

    const active = topics.find(t => t.id === selectedTopicId);
    
    // Case 1: No topic selected yet
    if (!selectedTopicId) {
      const freeChat = topics.find(t => t.orderCode === '000' && t.status === 'OPEN');
      if (freeChat) {
        setSelectedTopicId(freeChat.id);
      } else {
        const firstOpen = topics.find(t => t.status === 'OPEN');
        if (firstOpen) setSelectedTopicId(firstOpen.id);
      }
      return;
    }

    // Case 2: Selected topic doesn't match current activeTab status
    if (!active || active.status !== activeTab) {
      if (activeTab === 'OPEN') {
        const freeTopic = topics.find(t => t.orderCode === '000' && t.status === 'OPEN');
        if (freeTopic) setSelectedTopicId(freeTopic.id);
      }
      // If we are in CLOSED or DELETED tab, we usually stay on the selected one if user explicitly clicked it, 
      // but if coming from another tab we might need a default.
      // However, the tab switch itself often triggers a re-eval and the list filters automatically.
    }
  }, [topics, activeTab, selectedTopicId]);

  const handleCreateTopic = () => {
    if (!newTopicTitle.trim()) return;

    onCreateTopic(newTopicTitle.toUpperCase(), newTopicDesc, '');
    
    // Add Log
    onAddLog?.('SYSTEM', `Đã yêu cầu tạo chủ đề thảo luận mới: ${newTopicTitle.toUpperCase()}`, { 
      topicTitle: newTopicTitle.toUpperCase()
    });

    setShowCreateTopic(false);
    setNewTopicTitle('');
    setNewTopicDesc('');
  };

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
      saveAs(content, `TanPhu_Archive_${topic.title.replace(/\s+/g, '_')}.zip`);
    } catch (error) {
      console.error("Download failed:", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTopicDelete = (topicId: string) => {
    const topic = topics.find(t => t.id === topicId);
    if (topic && topic.status !== 'DELETED') {
      // Soft delete
      onUpdateTopic(topicId, { status: 'DELETED' });
      onAddLog?.('SYSTEM', `Đã chuyển chủ đề vào thùng rác: [${topic.orderCode}] ${topic.title}`);
    } else {
      // Permanent delete
      onDeleteTopic(topicId);
      onAddLog?.('SYSTEM', `Đã xóa vĩnh viễn chủ đề: [${topic?.orderCode}] ${topic?.title}`);
    }
    
    if (selectedTopicId === topicId) setSelectedTopicId(null);
    setShowDeleteTopicConfirm(null);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
    
    // Auto-switch to "000" if closing
    if (newStatus === 'CLOSED') {
      const freeChat = topics.find(t => t.orderCode === '000');
      if (freeChat) setSelectedTopicId(freeChat.id);
    }
  };

  const getAuthor = (id: string) => users.find(u => u.id === id);

  return (
    <div className="max-w-full h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500 relative bg-slate-50 rounded-2xl p-2 shadow-sm border border-slate-200 font-sans">
      {/* Header - Compact & Professional */}
      <div className="mb-2 flex items-center justify-between px-4 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#132d6b] flex items-center justify-center shadow-sm">
            <MessageSquare size={20} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xl font-black text-[#132d6b] uppercase tracking-tight">ROOM THẢO LUẬN</span>
          <div className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex -space-x-2">
            {presence.slice(0, 3).map(uid => (
              <div key={uid} className="w-8 h-8 rounded-full border-2 border-white shadow-sm overflow-hidden bg-slate-100">
                <Avatar src={users.find(u => u.id === uid)?.avatar} size="full" />
              </div>
            ))}
          </div>
          <div className="px-3 py-1 bg-slate-100 rounded-lg flex items-center gap-2 border border-slate-200">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
              {presence.length} TRỰC TUYẾN
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-2 min-h-0">
        {/* Sidebar: Topics List - Collapsible logic */}
        <motion.div 
          animate={{ width: isSidebarCollapsed ? 80 : 340 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden shrink-0 relative"
        >
          <div className="p-4 pb-2">
            <div className={`flex items-center justify-between mb-4 ${isSidebarCollapsed ? 'flex-col gap-4' : 'flex-row'}`}>
              <div className="flex items-center gap-2">
                {!isSidebarCollapsed && (
                  <h2 className="text-[18px] font-black text-blue-600 tracking-widest uppercase leading-none">
                    <span translate="no" className="notranslate">CHỦ ĐỀ</span>
                  </h2>
                )}
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className={`p-1.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all border border-slate-100 shadow-sm ${isSidebarCollapsed ? 'mb-1' : ''}`}
                  title={isSidebarCollapsed ? "Mở rộng" : "Thu nhỏ"}
                >
                  <ChevronRight size={16} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {/* Manual creation button */}
                <button 
                  onClick={() => setShowCreateTopic(true)}
                  className={`bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md flex items-center justify-center hover:scale-105 active:scale-95 ${isSidebarCollapsed ? 'w-12 h-12' : 'w-10 h-10'}`}
                  title="Tạo chủ đề"
                >
                  <Plus size={isSidebarCollapsed ? 24 : 20} strokeWidth={3} />
                </button>
              </div>
            </div>

            <div className={`flex gap-1 p-1 bg-slate-100 rounded-lg mb-3 ${isSidebarCollapsed ? 'flex-col' : 'flex-row'}`}>
              <button 
                onClick={() => setActiveTab('OPEN')}
                className={`flex-1 py-1.5 text-[9px] font-black rounded-md transition-all uppercase tracking-wider flex items-center justify-center ${activeTab === 'OPEN' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                title="Đang mở"
              >
                {isSidebarCollapsed ? <Hash size={14} /> : <span translate="no" className="notranslate">ĐANG MỞ</span>}
              </button>
              <button 
                onClick={() => setActiveTab('CLOSED')}
                className={`flex-1 py-1.5 text-[9px] font-black rounded-md transition-all uppercase tracking-wider flex items-center justify-center ${activeTab === 'CLOSED' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400'}`}
                title="Đã đóng"
              >
                {isSidebarCollapsed ? <Archive size={14} /> : <span translate="no" className="notranslate">ĐÃ ĐÓNG</span>}
              </button>
              <button 
                onClick={() => setActiveTab('DELETED')}
                className={`flex-1 py-1.5 text-[9px] font-black rounded-md transition-all uppercase tracking-wider flex items-center justify-center ${activeTab === 'DELETED' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-400'}`}
                title="Đã xóa"
              >
                {isSidebarCollapsed ? <Trash2 size={14} /> : <span translate="no" className="notranslate">ĐÃ XÓA</span>}
              </button>
            </div>
          </div>

            <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1 custom-scrollbar">
            {[...topics]
              .sort((a, b) => {
                const isA000 = a.topicCode?.includes('000');
                const isB000 = b.topicCode?.includes('000');
                if (isA000 && !isB000) return -1;
                if (!isA000 && isB000) return 1;
                
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              })
              .filter(t => t.status === activeTab)
              .map((topic) => {
              const isActive = selectedTopicId === topic.id;
              const isSystemTopic = topic.topicCode?.includes('000');
              
              // Formatting: P.0012026 -> P.001 and 2026
              const rawCode = topic.topicCode || `P${topic.orderCode || '000'}${new Date(topic.createdAt).getFullYear()}`;
              const pPart = rawCode.slice(0, 4); 
              const yPart = rawCode.slice(4);
              
              return (
                <div key={topic.id} className="relative group">
                  <div
                    onClick={() => setSelectedTopicId(topic.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setSelectedTopicId(topic.id)}
                    className={`w-full flex items-start gap-2 rounded-lg transition-all relative p-1.5 border min-h-[42px] h-auto cursor-pointer ${
                      isSystemTopic
                        ? 'bg-red-50 border-red-200'
                        : isActive 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className={`shrink-0 w-11 h-11 rounded flex flex-col items-center justify-center font-sans font-black leading-none border transition-colors ${
                      isSystemTopic
                        ? 'bg-red-600 text-white border-red-700'
                        : isActive 
                          ? 'bg-blue-600 text-white border-blue-700' 
                          : 'bg-slate-50 text-slate-400 group-hover:text-blue-500 transition-colors border-slate-200'
                    }`}>
                      <span translate="no" className="notranslate text-[10px] uppercase">{pPart}</span>
                      <span translate="no" className="notranslate text-[8px] opacity-80 mt-0.5">{yPart}</span>
                    </div>
                    
                    {!isSidebarCollapsed && (
                      <div className="text-left flex-1 min-w-0 flex items-start justify-between gap-1 ml-1 px-1">
                        <p className={`whitespace-normal uppercase text-[11px] leading-snug pt-1 flex-1 ${
                          isSystemTopic
                            ? 'text-red-600 font-black'
                            : isActive 
                              ? 'text-blue-700 font-black' 
                              : 'text-blue-600 font-bold'
                        }`}>
                          {topic.title.toUpperCase()}
                        </p>
                        <div className={`flex items-center gap-1.5 shrink-0 pt-1.5 ${isActive ? 'text-blue-600/80' : 'text-slate-600'}`}>
                          <div className="w-[1px] h-6 bg-slate-200 mt-0.5 shrink-0" />
                          <div className="flex flex-col items-end leading-none">
                            {currentUser.role === 'Admin' && isActive && !isSystemTopic && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditTopic(topic);
                                }}
                                className="absolute -top-1.5 -right-1 p-1 bg-white shadow-sm border border-slate-200 rounded-md text-blue-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-blue-50 z-10"
                              >
                                <Edit3 size={10} />
                              </button>
                            )}
                            <p className="text-[7px] font-bold uppercase truncate max-w-[70px]">
                              {topic.createdBy === 'SYSTEM' ? 'Hệ thống' : (getAuthor(topic.createdBy)?.name.split(' ').pop() || 'Tân Phú')}
                            </p>
                            <p className="text-[6px] font-sans font-medium opacity-60">
                              {formatDateTime(topic.createdAt).split(' ')[0]}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for closed/deleted topics */}
                  <div className="absolute top-1 right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                    {activeTab === 'CLOSED' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTopicStatus(topic);
                        }}
                        className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-200 shadow-sm border border-emerald-200"
                        title="Mở lại chủ đề"
                      >
                        <Unlock size={12} strokeWidth={2.5} />
                      </button>
                    )}
                    {activeTab === 'DELETED' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUpdateTopic(topic.id, { status: 'OPEN' });
                          const logCode = topic.topicCode || `P${topic.orderCode || '000'}${new Date(topic.createdAt).getFullYear()}`;
                          onAddLog?.('SYSTEM', `Đã khôi phục chủ đề: [${logCode}] ${topic.title}`);
                        }}
                        className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-200 shadow-sm border border-emerald-200"
                        title="Khôi phục chủ đề"
                      >
                        <RotateCcw size={12} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  {activeTab === 'OPEN' && topic.status === 'CLOSED' && (
                    <Lock size={10} className="text-slate-300 absolute right-1.5 top-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Main Chat Area - Minimalist Zen */}
        <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative font-sans">
          {activeTopic ? (
            <>
              {/* Chat Header - Integrated */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className={`shrink-0 w-11 h-11 rounded-lg flex flex-col items-center justify-center font-sans font-black leading-none border transition-colors ${
                    activeTopic.topicCode?.includes('000') 
                      ? 'bg-red-600 text-white border-red-700' 
                      : 'bg-slate-50 text-slate-400 border-slate-100'
                  }`}>
                    {(() => {
                      const raw = activeTopic.topicCode || `P${activeTopic.orderCode || '000'}${new Date(activeTopic.createdAt).getFullYear()}`;
                      return (
                        <>
                          <span translate="no" className="notranslate text-[10px] uppercase font-black tracking-tighter">{raw.slice(0, 4)}</span>
                          <span translate="no" className="notranslate text-[9px] opacity-90 mt-0.5">{raw.slice(4)}</span>
                        </>
                      );
                    })()}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-[18px] font-black text-slate-900 leading-tight mb-0.5 uppercase pt-0.5 truncate">{activeTopic.title}</h1>
                    <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider truncate">{activeTopic.description || 'Hệ thống thảo luận bảo mật'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownloadTopic(activeTopic.id)}
                    disabled={isDownloading}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Tải về dữ liệu"
                  >
                    {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  </button>

                  {currentUser.role === 'Admin' && (
                    <>
                      <button 
                        onClick={() => setEditTopic(activeTopic)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Chỉnh sửa chủ đề"
                      >
                        <Edit3 size={18} strokeWidth={1.5} />
                      </button>

                      <button 
                        onClick={() => setShowDeleteTopicConfirm(activeTopic.id)}
                        className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Xóa chủ đề"
                      >
                        <Trash2 size={18} strokeWidth={1.5} />
                      </button>

                      {activeTopic.status === 'OPEN' ? (
                        <button 
                          onClick={() => toggleTopicStatus(activeTopic)}
                          className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all border border-slate-200 shadow-sm"
                          title="Đóng chủ đề"
                        >
                          <X size={18} />
                        </button>
                      ) : (
                        <button 
                          onClick={() => toggleTopicStatus(activeTopic)}
                          className="p-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all border border-emerald-100 shadow-sm"
                          title="Mở lại chủ đề"
                        >
                          <Unlock size={18} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div 
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/10"
              >
                {filteredMessages.map((msg, idx) => {
                  const author = getAuthor(msg.authorId);
                  const isMe = msg.authorId === currentUser.id;
                  const showAvatar = idx === 0 || filteredMessages[idx - 1].authorId !== msg.authorId;

                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[90%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                        <div className="flex-none pb-1">
                          {showAvatar ? (
                            <div className="relative group">
                              <Avatar src={author?.avatar} name={author?.name} size="sm" />
                              {presence.includes(msg.authorId) && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                              )}
                            </div>
                          ) : (
                            <div className="w-10" />
                          )}
                        </div>
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {showAvatar && (
                            <span className={`text-[9px] font-black uppercase mb-1 px-1 tracking-wider ${isMe ? 'text-[#132d6b]' : 'text-slate-500'}`}>
                              {author?.name}
                            </span>
                          )}
                          <div 
                            className={`group relative p-3 px-5 rounded-xl border transition-all ${
                              isMe 
                                ? 'bg-[#132d6b] border-[#132d6b] text-white rounded-br-none shadow-md shadow-blue-900/10' 
                                : msg.content.startsWith('📜') 
                                  ? 'bg-amber-50 border-amber-200 text-amber-900 rounded-bl-none shadow-sm'
                                  : 'bg-white border-slate-200 text-slate-700 rounded-bl-none shadow-sm'
                            }`}
                          >
                            <p className={`text-[13px] leading-snug whitespace-pre-wrap ${msg.content.startsWith('📜') ? 'font-black italic' : 'font-medium'}`}>
                              {msg.content}
                            </p>
                            
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="mt-2 space-y-1.5">
                                {msg.attachments.map((file, fIdx) => (
                                  <div key={fIdx} className="rounded-lg overflow-hidden border border-white/20 shadow-sm">
                                    {file.type === 'image' ? (
                                      <img src={file.url} alt={file.name} className="max-w-full h-auto max-h-60 object-cover cursor-zoom-in" onClick={() => window.open(file.url, '_blank')} />
                                    ) : (
                                      <div className={`flex items-center gap-2 p-2 ${isMe ? 'bg-white/10' : 'bg-slate-50'}`}>
                                        <FileText size={16} className={isMe ? 'text-white' : 'text-blue-600'} />
                                        <div className="min-w-0">
                                          <p className="text-[11px] font-black truncate uppercase">{file.name}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className={`absolute -bottom-5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all ${isMe ? 'right-0' : 'left-0'}`}>
                              <span className="text-[8px] text-slate-400 font-black uppercase">{formatDateTime(msg.timestamp)}</span>
                            </div>

                            {/* Reaction Trigger */}
                            <div className={`absolute top-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-20 ${isMe ? '-left-10' : '-right-10'} flex flex-col gap-1`}>
                              <button 
                                onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                className="w-8 h-8 bg-white shadow-md border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-blue-600 hover:scale-110 active:scale-95"
                              >
                                <Smile size={16} />
                              </button>
                              
                              {currentUser.role === 'Admin' && (
                                <button 
                                  onClick={() => onDeleteMessage?.(msg.id)}
                                  className="w-8 h-8 bg-white shadow-md border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:scale-110 active:scale-95"
                                  title="Xóa tin nhắn"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}

                              {showEmojiFor === msg.id && (
                                <div className="absolute top-7 z-50">
                                  <ReactionPicker onSelect={(emoji) => {
                                    onReact(msg.id, emoji);
                                    setShowEmojiFor(null);
                                  }} />
                                </div>
                              )}
                            </div>

                            {/* Reaction Badges */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`absolute -bottom-3 flex gap-1 ${isMe ? 'right-0' : 'left-0'}`}>
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
              <div className="p-3 bg-white border-t border-slate-100 relative">
                {activeTopic.status === 'CLOSED' ? (
                  <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-400 rounded-lg border border-slate-100 border-dashed">
                     <Lock size={14} />
                     <p className="text-[11px] font-black uppercase tracking-widest italic">CHỦ ĐỀ ĐÃ ĐÓNG • CHỈ XEM</p>
                  </div>
                ) : (
                  <>
                    {pendingAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2 p-1.5 bg-slate-50 rounded-lg">
                         {pendingAttachments.map((f, i) => (
                           <div key={i} className="relative group w-14 h-14 bg-white rounded-lg border border-slate-200 overflow-hidden">
                             {f.type === 'image' ? (
                               <img src={f.url} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center p-1">
                                  <FileText size={14} className="text-blue-500" />
                                  <p className="text-[7px] font-black truncate w-full text-center mt-1 uppercase">{f.name}</p>
                               </div>
                             )}
                             <button 
                              onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center"
                             >
                               <X size={10} />
                             </button>
                           </div>
                         ))}
                      </div>
                    )}

                    <div className="relative flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
                      <div className="flex items-center gap-1 shrink-0">
                        <button 
                          onClick={() => imageInputRef.current?.click()}
                          className="w-11 h-11 text-slate-400 rounded-lg flex items-center justify-center hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all"
                        >
                          <ImageIcon size={22} />
                        </button>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="w-11 h-11 text-slate-400 rounded-lg flex items-center justify-center hover:bg-white hover:text-blue-600 hover:shadow-sm transition-all"
                        >
                          <Paperclip size={22} />
                        </button>
                      </div>

                      <textarea 
                        ref={inputRef}
                        className="flex-1 bg-transparent border-0 py-3 px-2 text-[14px] outline-none focus:ring-0 transition-all resize-none h-11 max-h-32 font-bold text-slate-800 custom-scrollbar placeholder:text-slate-400"
                        placeholder={`Nhập nội dung thảo luận...`}
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
                        className="w-11 h-11 bg-[#132d6b] hover:bg-blue-700 text-white rounded-lg flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105 active:scale-95 shadow-md shadow-blue-900/10"
                      >
                        <div translate="no" className="notranslate flex items-center justify-center">
                          <Send size={20} className="ml-0.5" strokeWidth={2.5} />
                        </div>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-4">
              <Hash size={48} className="opacity-10" />
              <p className="text-[11px] font-black uppercase tracking-widest leading-none">Chọn chủ đề để thảo luận</p>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Inputs */}
      <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
      <input type="file" accept="image/*" multiple ref={imageInputRef} onChange={handleFileUpload} className="hidden" />

      {/* Edit Topic Modal */}
      <AnimatePresence>
        {editTopic && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Chỉnh sửa chủ đề</h2>
                 <button onClick={() => setEditTopic(null)} className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Tên chủ đề</label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700"
                      value={editTopic.title}
                      onChange={(e) => setEditTopic({ ...editTopic, title: e.target.value })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Mô tả mục tiêu</label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 min-h-[100px] resize-none"
                      value={editTopic.description}
                      onChange={(e) => setEditTopic({ ...editTopic, description: e.target.value })}
                    />
                 </div>
                 <button 
                  disabled={!editTopic.title.trim()}
                  onClick={() => {
                    const upperTitle = editTopic.title.toUpperCase();
                    onUpdateTopic(editTopic.id, { title: upperTitle, description: editTopic.description });
                    onAddLog?.('SYSTEM', `Đã cập nhật chủ đề: [${editTopic.orderCode}] ${upperTitle}`);
                    setEditTopic(null);
                  }}
                  className="w-full py-4 bg-[#132d6b] text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/10"
                 >
                   CẬP NHẬT
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Topic Modal */}
      <AnimatePresence>
        {showCreateTopic && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-8"
            >
              <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Tạo chủ đề mới</h2>
                 <button onClick={() => setShowCreateTopic(false)} className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Tên chủ đề</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Nhập tiêu đề..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value)}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">Mô tả (Tùy chọn)</label>
                    <textarea 
                      placeholder="Mục tiêu thảo luận..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 min-h-[80px] resize-none"
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value)}
                    />
                 </div>
                 <button 
                  disabled={!newTopicTitle.trim()}
                  onClick={handleCreateTopic}
                  className="w-full py-4 bg-[#132d6b] text-white rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-20 shadow-lg shadow-blue-900/10"
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
        {showDeleteTopicConfirm && (() => {
          const topicToDelete = topics.find(t => t.id === showDeleteTopicConfirm);
          const isActuallyDeleted = topicToDelete?.status === 'DELETED';
          
          return (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 text-center"
              >
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 ${isActuallyDeleted ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
                  <Trash2 size={32} />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                  {isActuallyDeleted ? 'Xóa vĩnh viễn?' : 'Chuyển vào thùng rác?'}
                </h2>
                <p className="text-[13px] text-slate-500 font-medium mb-8">
                  {isActuallyDeleted 
                    ? 'Hành động này không thể hoàn tác. Toàn bộ dữ liệu chủ đề sẽ biến mất mãi mãi.' 
                    : 'Chủ đề sẽ được chuyển vào tab ĐÃ XÓA. Bạn có thể khôi phục lại sau nếu cần.'}
                </p>
                
                <div className="space-y-2">
                  {!isActuallyDeleted && (
                    <button 
                      onClick={async () => {
                        await handleDownloadTopic(showDeleteTopicConfirm);
                        handleTopicDelete(showDeleteTopicConfirm);
                      }}
                      className="w-full py-3.5 bg-[#132d6b] text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> TẢI VỀ & XÓA TẠM
                    </button>
                  )}
                  <button 
                    onClick={() => handleTopicDelete(showDeleteTopicConfirm)}
                    className="w-full py-3.5 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all"
                  >
                    {isActuallyDeleted ? 'XÁC NHẬN XÓA VĨNH VIỄN' : 'XÁC NHẬN XÓA TẠM'}
                  </button>
                  <button 
                    onClick={() => setShowDeleteTopicConfirm(null)}
                    className="w-full py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                  >
                    HUỶ BỎ
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

