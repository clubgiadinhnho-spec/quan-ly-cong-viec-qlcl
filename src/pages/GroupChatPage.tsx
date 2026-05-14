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
  Edit3,
  ListChecks,
  CheckSquare,
  Search
} from 'lucide-react';
import { User, DiscussionTopic, DiscussionMessage } from '../types';
import { formatDateTime, formatFullDateTime } from '../lib/dateUtils';
import { ReactionPicker, ReactionBadge } from '../components/common/ReactionPicker';
import { Avatar } from '../components/common/Avatar';
import imageCompression from 'browser-image-compression';

import { EmojiPicker } from '../components/common/EmojiPicker';

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
  onDeleteTopicsBulk?: (topicIds: string[]) => Promise<any>;
  onDeleteMessage?: (messageId: string) => void;
  presence?: string[];
  markAsRead?: (id: string) => void;
  lastReadChatTimestamps?: Record<string, number>;
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
  onDeleteTopicsBulk,
  onDeleteMessage,
  presence = [],
  markAsRead,
  lastReadChatTimestamps = {}
}: GroupChatPageProps) => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);

  // Auto-select "TRAO ĐỔI TỰ DO" topic on mount if no topic selected
  useEffect(() => {
    if (!selectedTopicId && topics.length > 0) {
      const freeExchangeTopic = topics.find(t => 
        t.title.toUpperCase().includes('TRAO ĐỔI TỰ DO') && t.status === 'OPEN'
      );
      if (freeExchangeTopic) {
        setSelectedTopicId(freeExchangeTopic.id);
      }
    }
  }, [topics, selectedTopicId]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [showDeleteTopicConfirm, setShowDeleteTopicConfirm] = useState<string | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDesc, setNewTopicDesc] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<any[]>([]);
  const [showEmojiFor, setShowEmojiFor] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED' | 'DELETED'>('OPEN');
  const [editTopic, setEditTopic] = useState<DiscussionTopic | null>(null);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [activeFontSize, setActiveFontSize] = useState('16px');
  const [activeColor, setActiveColor] = useState('#1e293b');
  const [searchQuery, setSearchQuery] = useState('');
  const [hasContent, setHasContent] = useState(false);
  const [showMentionList, setShowMentionList] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [filteredMentionUsers, setFilteredMentionUsers] = useState<User[]>([]);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiTriggerRef = useRef<HTMLButtonElement>(null);
  const isLNT = currentUser.name === 'Lê Nhật Trường' || currentUser.personalEmail === 'lenhattruong.tpp@gmail.com';
  const canAttach = currentUser.role === 'Admin' || currentUser.role === 'Trưởng Phòng' || isLNT;

  const insertEmoji = (emoji: string) => {
    if (!inputRef.current) return;
    
    inputRef.current.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      if (inputRef.current.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const textNode = document.createTextNode(emoji);
        range.insertNode(textNode);
        
        range.setStartAfter(textNode);
        range.setEndAfter(textNode);
        selection.removeAllRanges();
        selection.addRange(range);
        
        setHasContent(true);
        return;
      }
    }
    
    inputRef.current.innerHTML += emoji;
    setHasContent(true);
  };

  // Update lastReadAt when topic is selected
  useEffect(() => {
    if (selectedTopicId && markAsRead) {
      markAsRead(`topic_${selectedTopicId}`);
    }
  }, [selectedTopicId, markAsRead]);

  const inputRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Scroll immediately
    scrollToBottom();

    // Scroll again after a short delay to account for image/content rendering
    const timer = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timer);
  }, [messages, selectedTopicId]);

  // Auto-focus input when topic changes
  useEffect(() => {
    if (selectedTopicId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedTopicId]);

  const handleBulkDelete = async () => {
    if (selectedBulkIds.length === 0) return;

    try {
      setIsDeleting(true);
      if (!onDeleteTopicsBulk) {
        window.alert("Lỗi: Chức năng xóa hàng loạt không khả dụng.");
        return;
      }
      
      await onDeleteTopicsBulk(selectedBulkIds);
      
      // If current selected topic is being deleted, deselect it
      if (selectedTopicId && selectedBulkIds.includes(selectedTopicId)) {
        setSelectedTopicId(null);
      }

      setSelectedBulkIds([]);
      setIsBulkMode(false);
      setShowBulkDeleteConfirm(false);
      
      // Removed window.location.reload() to maintain a smooth SPA experience
    } catch (err) {
      window.alert("Thất bại: " + (err instanceof Error ? err.message : "Lỗi không xác định"));
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleBulkSelection = (id: string) => {
    setSelectedBulkIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const currentTabTopics = topics
      .filter(t => t.status === activeTab)
      .map(t => t.id);
    
    if (selectedBulkIds.length === currentTabTopics.length) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(currentTabTopics);
    }
  };

const handleCreateTopic = () => {
    if (!newTopicTitle.trim()) return;

    const upperTitle = newTopicTitle.trim().toUpperCase();
    const upperDesc = newTopicDesc.trim().toUpperCase();
    
    // Validation: Prevent duplicate titles
    const isDuplicate = topics.some(t => t.title.toUpperCase() === upperTitle && t.status !== 'DELETED');
    if (isDuplicate) {
      window.alert(`LỖI: Tên chủ đề "${upperTitle}" đã tồn tại. Vui lòng đặt tên khác.`);
      return;
    }

    onCreateTopic(upperTitle, upperDesc, '');
    
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
      saveAs(content, `TanPhu_Archive_${(topic.title || '').replace(/\s+/g, '_')}.zip`);
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
    } else {
      // Permanent delete
      onDeleteTopic(topicId);
    }
    
    if (selectedTopicId === topicId) setSelectedTopicId(null);
    setShowDeleteTopicConfirm(null);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const activeTopic = topics.find(t => t.id === selectedTopicId);
  const filteredMessages = messages.filter(m => m.topicId === selectedTopicId);

  // Handle Mention Logic
  useEffect(() => {
    if (showMentionList) {
      const filtered = users
        .filter(u => u.name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 5);
      setFilteredMentionUsers(filtered);
    }
  }, [mentionQuery, showMentionList, users]);

  const handleInput = () => {
    if (!inputRef.current) return;
    const text = inputRef.current.innerText;
    setHasContent(!!text.trim());

    // Simple detection: find the last '@' and text after it
    const lastAtIdx = text.lastIndexOf('@');
    if (lastAtIdx !== -1) {
      const textAfterAt = text.slice(lastAtIdx + 1);
      // Only trigger if @ is at start or follows a space, and no space in between
      const isTagging = lastAtIdx === 0 || text[lastAtIdx - 1] === ' ' || text[lastAtIdx - 1] === '\n';
      
      if (isTagging && !textAfterAt.includes(' ')) {
        setShowMentionList(true);
        setMentionQuery(textAfterAt);
        return;
      }
    }
    setShowMentionList(false);
  };

  const insertMention = (user: User) => {
    if (!inputRef.current) return;
    
    const text = inputRef.current.innerText;
    const lastAtIdx = text.lastIndexOf('@');
    
    if (lastAtIdx !== -1) {
      const beforeAt = text.slice(0, lastAtIdx);
      const mentionHtml = `<span contenteditable="false" class="mention-tag font-bold notranslate" translate="no">@${user.name}</span>&nbsp;`;
      
      // We use innerHTML to insert the styled span
      // A more robust way would be using Selection API, but for this requirement:
      inputRef.current.innerHTML = beforeAt + mentionHtml;
      
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(inputRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      
      inputRef.current.focus();
    }
    
    setShowMentionList(false);
    setHasContent(true);
  };

  const handleSend = () => {
    const htmlContent = inputRef.current?.innerHTML || '';
    if (!htmlContent.trim() && pendingAttachments.length === 0) return;
    if (!selectedTopicId) return;

    onSendMessage(selectedTopicId, htmlContent, pendingAttachments);
    if (inputRef.current) inputRef.current.innerHTML = '';
    setHasContent(false);
    setPendingAttachments([]);
  };

  const execCommand = (command: string, value: string = '') => {
    document.execCommand(command, false, value);
    if (inputRef.current) inputRef.current.focus();
  };

  const compressAndUpload = async (file: File) => {
    setIsUploading(true);
    try {
      let processedFile: File | Blob = file;
      let type: 'image' | 'file' = 'file';

      if (file.type.startsWith('image/')) {
        type = 'image';
        const options = {
          maxSizeMB: 0.8, // Target size under 800KB
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.7 // Start with lower quality for faster/better compression
        };
        try {
          processedFile = await imageCompression(file, options);
          // If still over 0.9MB after first compression, try once more with tighter constraints
          if (processedFile.size > 0.9 * 1024 * 1024) {
            processedFile = await imageCompression(file, { ...options, maxSizeMB: 0.5, maxWidthOrHeight: 1280 });
          }
        } catch (error) {
          console.error("Compression error, trying basic compression:", error);
          // Fallback if needed
        }
      }

      // STRICT SIZE CHECK: Firestore doc limit is 1MB total.
      // Base64 encoding increases size by ~33%, so we limit raw file to ~700KB to be safe
      const MAX_FILE_SIZE = 700 * 1024; // 700KB
      if (processedFile.size > MAX_FILE_SIZE) {
        setIsUploading(false);
        alert(`File "${file.name}" quá lớn (${(processedFile.size / 1024 / 1024).toFixed(2)}MB). Vui lòng chọn file dưới 700KB hoặc giảm kích thước ảnh.`);
        return;
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
    if (e.target) e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          compressAndUpload(file);
          hasImage = true;
        }
      }
    }
    // If it's just text or HTML, it will be handled by contentEditable automatically
    // But we prevent the default if we handled an image to avoid double paste (if image is also as text)
    if (hasImage) {
      // e.preventDefault(); // If we want to skip the text part
    }
  };

  const toggleTopicStatus = (topic: DiscussionTopic) => {
    const newStatus = topic.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    onUpdateTopic(topic.id, { status: newStatus });
  };

  const getTopicUnreadCount = (topicId: string) => {
    if (!lastReadChatTimestamps) return 0;
    const lastRead = lastReadChatTimestamps[`topic_${topicId}`] || 0;
    return messages.filter(m => m.topicId === topicId && m.authorId !== currentUser.id && new Date(m.timestamp).getTime() > lastRead).length;
  };

  const totalUnreadCount = topics
    .filter(t => t.status === 'OPEN')
    .reduce((acc, t) => acc + getTopicUnreadCount(t.id), 0);

  const togglePin = (e: React.MouseEvent, topicId: string, currentStatus: boolean) => {
    e.stopPropagation();
    onUpdateTopic(topicId, { isPinned: !currentStatus });
  };

  const getAuthor = (id: string) => users.find(u => u.id === id || u.uniqueKey === id);

  return (
    <div className="h-screen overflow-hidden flex bg-[#f0f2f5] font-sans">
      {/* Unified App Window Style Container */}
      <div className="flex-1 flex overflow-hidden bg-white shadow-xl">
        
        {/* Sidebar: Topics List */}
        <div className={`flex flex-col bg-slate-50 border-r border-slate-200 overflow-hidden shrink-0 relative transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-80'}`}>
          {/* Sidebar Header */}
          <div className="p-4 bg-white border-b border-slate-100">
            <div className={`flex items-center justify-between mb-4 ${isSidebarCollapsed ? 'flex-col gap-3' : 'flex-row'}`}>
              <div className="flex items-center gap-3">
                <div className={`rounded-xl bg-[#132d6b] flex items-center justify-center shadow-lg shadow-blue-900/20 shrink-0 transition-all ${isSidebarCollapsed ? 'w-12 h-12' : 'w-10 h-10'}`}>
                  <MessageSquare size={isSidebarCollapsed ? 24 : 20} className="text-white" strokeWidth={2.5} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="flex flex-col">
                    <h2 className="text-[16px] font-black text-[#132d6b] uppercase tracking-tight leading-none mb-1">
                      <span translate="no" className="notranslate">ROOM THẢO LUẬN</span>
                      {totalUnreadCount > 0 && (
                        <span translate="no" className="notranslate ml-2 bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                          {totalUnreadCount}
                        </span>
                      )}
                    </h2>
                    <div className="flex items-center gap-1.5 px-0.5">
                      <div className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                        <span translate="no" className="notranslate">{presence.length} TRỰC TUYẾN</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className={`p-1.5 bg-white text-slate-400 hover:text-blue-600 rounded-lg transition-all border border-slate-100 shadow-sm ${isSidebarCollapsed ? 'w-full flex justify-center' : ''}`}
              >
                <ChevronRight size={16} className={`transition-transform duration-300 ${isSidebarCollapsed ? '' : 'rotate-180'}`} />
              </button>
            </div>

            <div className={`flex gap-2 ${isSidebarCollapsed ? 'flex-col items-center' : 'items-center'}`}>
              {currentUser?.role === 'Admin' && (
                <button
                  onClick={() => {
                    setIsBulkMode(!isBulkMode);
                    if (!isBulkMode) setSelectedBulkIds([]);
                  }}
                  className={`flex items-center justify-center transition-all border relative ${
                    isBulkMode 
                      ? 'bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-200' 
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 shadow-sm'
                  } ${isSidebarCollapsed ? 'w-12 h-12 rounded-xl' : 'px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest flex-1'}`}
                  title="Quản lý"
                >
                  {isBulkMode ? <X size={20} strokeWidth={2.5} /> : <div className="flex items-center gap-2 font-black uppercase"><ListChecks size={isSidebarCollapsed ? 20 : 14} strokeWidth={2.5} /> {!isSidebarCollapsed && "QUẢN LÝ"}</div>}
                  {selectedBulkIds.length > 0 && isBulkMode && !isSidebarCollapsed && (
                    <span className="ml-2 bg-white text-amber-600 px-1.5 rounded-md">{selectedBulkIds.length}</span>
                  )}
                </button>
              )}
              <button 
                onClick={() => setShowCreateTopic(true)}
                className={`bg-blue-600 text-white transition-all shadow-lg shadow-blue-200 flex items-center justify-center hover:scale-105 active:scale-95 ${isSidebarCollapsed ? 'w-12 h-12 rounded-xl' : 'px-3 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest flex-1'}`}
                title="Tạo mới"
              >
                {isSidebarCollapsed ? <Plus size={24} strokeWidth={3} /> : <div className="flex items-center gap-2"><Plus size={14} strokeWidth={3} /> TẠO MỚI</div>}
              </button>
            </div>
          </div>

          {isBulkMode && (
            <div className="mx-1 mb-2 px-2 py-1 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-between shadow-sm animate-in zoom-in duration-200">
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={toggleSelectAll}
                  className="flex items-center gap-1 p-0.5 bg-white border border-amber-200 rounded-lg hover:bg-amber-100 transition-all font-black text-[9px] px-1.5"
                  title="Chọn tất cả"
                >
                  <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${selectedBulkIds.length > 0 ? 'bg-amber-500 border-amber-600' : 'bg-white border-slate-300'}`}>
                    {selectedBulkIds.length > 0 && <CheckSquare size={9} className="text-white" />}
                  </div>
                  <span className="text-amber-600 uppercase">Tất cả</span>
                </button>
              </div>
              
              <div className="flex items-center gap-1">
                {selectedBulkIds.length > 0 && (
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(true)}
                    disabled={isDeleting}
                    className="p-1 px-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all flex items-center justify-center gap-1 shadow-sm disabled:opacity-50 relative z-50 pointer-events-auto"
                  >
                    {isDeleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
                    <span className="text-[8px] font-black uppercase">XÓA {selectedBulkIds.length}</span>
                  </button>
                )}
                <button 
                  onClick={() => {
                    setIsBulkMode(false);
                    setSelectedBulkIds([]);
                  }}
                  className="p-1 bg-white text-slate-400 border border-slate-200 rounded-lg hover:text-red-500 transition-all"
                  title="Hủy"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )}

          {/* Sidebar Search Area */}
          {!isSidebarCollapsed && (
            <div className="px-4 py-3 bg-white border-b border-slate-50">
              <div className="relative group">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <input 
                  type="text"
                  placeholder="Tìm kiếm chủ đề..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-[12px] font-medium outline-none focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-50 transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 flex flex-col overflow-hidden px-1 pt-3">
            <div className={`flex gap-1 p-1.5 bg-white border border-slate-100 rounded-2xl mb-4 ${isSidebarCollapsed ? 'flex-col items-center' : 'flex-row items-center'}`}>
              <button 
                onClick={() => setActiveTab('OPEN')}
                className={`flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer group flex-1 min-w-0 ${
                  activeTab === 'OPEN' ? 'bg-blue-50 py-2' : 'hover:bg-slate-50 py-2'
                }`}
                title="Đang mở"
              >
                <MessageSquare 
                  size={isSidebarCollapsed ? 22 : 18} 
                  strokeWidth={2.5}
                  className={`transition-colors ${activeTab === 'OPEN' ? 'text-blue-600' : 'text-slate-400 group-hover:text-blue-500'}`} 
                />
                {!isSidebarCollapsed && (
                  <span translate="no" className={`notranslate text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${
                    activeTab === 'OPEN' ? 'text-blue-700' : 'text-slate-500'
                  }`}>DANH SÁCH</span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('CLOSED')}
                className={`flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer group flex-1 min-w-0 ${
                  activeTab === 'CLOSED' ? 'bg-slate-100 py-2' : 'hover:bg-slate-50 py-2'
                }`}
                title="Đã đóng"
              >
                <Archive 
                  size={isSidebarCollapsed ? 22 : 18} 
                  strokeWidth={2.5}
                  className={`transition-colors ${activeTab === 'CLOSED' ? 'text-slate-700' : 'text-slate-400 group-hover:text-slate-600'}`} 
                />
                {!isSidebarCollapsed && (
                  <span translate="no" className={`notranslate text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${
                    activeTab === 'CLOSED' ? 'text-slate-800' : 'text-slate-500'
                  }`}>LƯU TRỮ</span>
                )}
              </button>

              <button 
                onClick={() => setActiveTab('DELETED')}
                className={`flex flex-col items-center justify-center gap-1 transition-all rounded-xl cursor-pointer group flex-1 min-w-0 ${
                  activeTab === 'DELETED' ? 'bg-rose-50 py-2' : 'hover:bg-slate-50 py-2'
                }`}
                title="Đã xóa"
              >
                <Trash2 
                  size={isSidebarCollapsed ? 22 : 18} 
                  strokeWidth={2.5}
                  className={`transition-colors ${activeTab === 'DELETED' ? 'text-rose-600' : 'text-slate-400 group-hover:text-rose-500'}`} 
                />
                {!isSidebarCollapsed && (
                  <span translate="no" className={`notranslate text-[9px] font-black uppercase tracking-tight whitespace-nowrap ${
                    activeTab === 'DELETED' ? 'text-rose-700' : 'text-slate-500'
                  }`}>THÙNG RÁC</span>
                )}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pl-1 pr-2 pb-8 space-y-1 custom-scrollbar">
            {(() => {
              const sortTopics = (a: DiscussionTopic, b: DiscussionTopic) => {
                // Priority 1: Pinned topics
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;

                // Priority 2: Topics with unread messages
                const aUnread = getTopicUnreadCount(a.id);
                const bUnread = getTopicUnreadCount(b.id);
                if (aUnread > 0 && bUnread === 0) return -1;
                if (aUnread === 0 && bUnread > 0) return 1;

                // Priority 3: Latest message time (or creation time)
                const aLastMsg = messages.filter(m => m.topicId === a.id).sort((x, y) => y.timestamp.localeCompare(x.timestamp))[0];
                const bLastMsg = messages.filter(m => m.topicId === b.id).sort((x, y) => y.timestamp.localeCompare(x.timestamp))[0];
                
                const aTime = aLastMsg ? aLastMsg.timestamp : a.createdAt;
                const bTime = bLastMsg ? bLastMsg.timestamp : b.createdAt;
                
                return bTime.localeCompare(aTime);
              };

              return [...topics]
                .filter(t => {
                  const matchTab = t.status === activeTab;
                  const matchSearch = searchQuery.trim() === '' || 
                    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (t.topicCode && t.topicCode.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()));
                  return matchTab && matchSearch;
                })
                .sort(sortTopics)
                .map((topic) => {
                  const isActive = selectedTopicId === topic.id;
                  const unreadCount = getTopicUnreadCount(topic.id);
                  
                  // Formatting logic: Luôn lấy P + 3 số (Ví dụ: P007)
                  let psttCode = 'P000';
                  const raw = (topic.topicCode || topic.orderCode || '').toString();
                  const digits = raw.replace(/\D/g, ''); // Chỉ lấy số
                  psttCode = 'P' + (digits.length >= 3 ? digits.slice(0, 3) : digits.padStart(3, '0'));
                  
                  return (
                    <div key={topic.id} className="relative group flex items-center gap-2 px-0 py-0.5">
                      {isBulkMode && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBulkSelection(topic.id);
                          }}
                          className={`shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                            selectedBulkIds.includes(topic.id) 
                              ? 'bg-blue-600 border-blue-700 shadow-lg shadow-blue-200' 
                              : 'bg-white border-slate-300 hover:border-blue-400 shadow-sm'
                          }`}
                        >
                          {selectedBulkIds.includes(topic.id) && <CheckSquare size={16} className="text-white" />}
                        </div>
                      )}
                      <div
                        onClick={() => isBulkMode ? toggleBulkSelection(topic.id) : setSelectedTopicId(topic.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedTopicId(topic.id)}
                        className={`w-full flex items-center gap-3 rounded-xl transition-all relative border cursor-pointer ${
                          isSidebarCollapsed ? 'justify-center p-1 font-sans' : 'items-center p-2 pr-10'
                        } ${
                          isActive 
                            ? topic.isPinned 
                              ? 'bg-rose-50/80 border-rose-200 shadow-lg shadow-rose-100 ring-1 ring-rose-200' 
                              : 'bg-blue-50/80 border-blue-200 shadow-lg shadow-blue-100 ring-1 ring-blue-200'
                            : 'bg-white border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-md shadow-sm'
                        }`}
                      >
                        <div className={`shrink-0 rounded-xl flex items-center justify-center font-sans border transition-all ${
                          isSidebarCollapsed ? 'w-10 h-10 text-[10px]' : 'w-9 h-9 text-[9px]'
                        } ${
                          topic.isPinned 
                            ? 'bg-red-600 text-white border-red-700 shadow-lg' 
                            : 'bg-blue-600 text-white border-blue-700 shadow-lg'
                        } ${isActive ? 'ring-2 ring-offset-1 ' + (topic.isPinned ? 'ring-red-400' : 'ring-blue-400') : ''}`}>
                          <span translate="no" className="notranslate font-black uppercase tracking-normal leading-none">{psttCode}</span>
                        </div>
                        
                        {!isSidebarCollapsed && (
                          <div className="text-left flex-1 min-w-0 flex flex-col justify-center relative">
                            <p className={`uppercase text-[12px] leading-tight truncate font-black tracking-tight mb-1 pr-4 ${
                              isActive 
                                ? topic.isPinned ? 'text-rose-700' : 'text-blue-700'
                                : topic.isPinned ? 'text-rose-600' : 'text-blue-600'
                            }`}>
                              {topic.title.toUpperCase()}
                            </p>
                            
                            <div className="flex items-center justify-between gap-2 pointer-events-none">
                               <p className="text-[10px] font-medium text-slate-400 truncate uppercase tracking-tighter max-w-[120px] leading-none">
                                 {topic.description || 'HỆ THỐNG THẢO LUẬN'}
                               </p>
                            </div>

                            {/* Creator & Date - Pushed to far top right corner */}
                            <div className="absolute -top-1 -right-7 flex flex-col items-end shrink-0 opacity-40 group-hover:opacity-100 transition-opacity">
                              <span translate="no" className={`notranslate text-[6.5px] font-black uppercase px-1 rounded-sm mb-0 ${isActive ? 'bg-white/50 text-blue-800' : 'bg-slate-100 text-slate-500'}`}>
                                {getAuthor(topic.createdBy)?.name.split(' ').pop() || 'ADMIN'}
                              </span>
                              <span translate="no" className="notranslate text-[6px] font-black font-sans uppercase tracking-tight leading-none">
                                {formatDateTime(topic.createdAt).split(' ')[0]}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Icons (Pin, Unread Badge & Status) */}
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 z-20">
                        {unreadCount > 0 && (
                          <div className="bg-emerald-600 text-white text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-lg shadow-[0_2px_10px_rgba(16,185,129,0.4)] border-2 border-white">
                            <span translate="no" className="notranslate leading-none">{unreadCount}</span>
                          </div>
                        )}
                        <button 
                          onClick={(e) => togglePin(e, topic.id, !!topic.isPinned)}
                          className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm border ${
                            topic.isPinned 
                              ? 'bg-rose-100 text-rose-600 border-rose-200 opacity-100' 
                              : 'bg-white text-slate-300 border-slate-100 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:border-rose-200'
                          }`}
                          title={topic.isPinned ? "Bỏ ghim" : "Ghim chủ đề"}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill={topic.isPinned ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v8"/><path d="m16.4 13.5-3.8-3.8c-.4-.4-1-.4-1.4 0l-3.8 3.8c-.7.7-.2 1.9.8 1.9h2.3V21c0 .6.4 1 1 1s1-.4 1-1v-5.6h2.1c1 0 1.5-1.2.8-1.9Z"/>
                          </svg>
                        </button>

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
                });
            })()}
            </div>
          </div>
        </div>

        {/* Main Chat Area - Zalo Style Layout */}
        <div className="flex-1 bg-white flex flex-col min-w-0 h-full overflow-hidden relative font-sans">
          {activeTopic ? (
            <>
              {/* 1. Header (Fixed at top) */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-20 sticky top-0 shadow-sm">
                <div className="flex items-center gap-4">
                    {(() => {
                      const isPinned = activeTopic.isPinned;
                      
                      // Formatting logic: Luôn lấy P + 3 số
                      const raw = (activeTopic.topicCode || activeTopic.orderCode || '').toString();
                      const digits = raw.replace(/\D/g, ''); 
                      const psttCode = 'P' + (digits.length >= 3 ? digits.slice(0, 3) : digits.padStart(3, '0'));
                      
                      return (
                        <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-sans leading-none border-2 transition-all ${
                          isPinned 
                            ? 'bg-red-600 text-white border-red-700 shadow-lg ring-4 ring-red-50/50' 
                            : 'bg-blue-600 text-white border-blue-700 shadow-lg ring-4 ring-blue-50/50'
                        }`}>
                          <span translate="no" className="notranslate text-[12px] font-black uppercase tracking-normal leading-none">{psttCode}</span>
                        </div>
                      );
                    })()}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h1 className={`text-[19px] font-black leading-tight uppercase pt-0.5 truncate ${
                          activeTopic.isPinned ? 'text-rose-700' : 'text-slate-900'
                        }`}>{activeTopic.title}</h1>
                      <div className="hidden sm:flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{presence.length} ACTIVE</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest truncate">
                      <span translate="no" className="notranslate">{activeTopic.description || 'Hệ thống thảo luận bảo mật'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                    <button 
                      onClick={() => handleDownloadTopic(activeTopic.id)}
                      disabled={isDownloading}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                      title="Tải về dữ liệu"
                    >
                      {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                    </button>

                    {currentUser.role === 'Admin' && (
                      <>
                        <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                        <button 
                          onClick={() => setEditTopic(activeTopic)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-white hover:shadow-sm rounded-lg transition-all"
                          title="Chỉnh sửa chủ đề"
                        >
                          <Edit3 size={18} strokeWidth={1.5} />
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTopicStatus(activeTopic); }}
                          className={`p-2 rounded-lg transition-all ${activeTopic.status === 'OPEN' ? 'text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-sm' : 'text-emerald-500 bg-white shadow-sm'}`}
                          title={activeTopic.status === 'OPEN' ? "Đóng chủ đề" : "Mở lại chủ đề"}
                        >
                          {activeTopic.status === 'OPEN' ? <Lock size={18} /> : <Unlock size={18} />}
                        </button>

                        <button 
                          onClick={() => setShowDeleteTopicConfirm(activeTopic.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                          title="Xóa chủ đề"
                        >
                          <Trash2 size={18} strokeWidth={1.5} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Messages List (Scrollable area) */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-6 bg-[#f4f7f9] custom-scrollbar"
              >
                {filteredMessages
                  .filter(msg => {
                    const content = msg.content || '';
                    return !/(?:🤖|\[Robot|Robot Assist|Robot Assistant|Robot Update|Robot:|\bRobot\b)/gi.test(content);
                  })
                  .map((msg, idx) => {
                    const author = getAuthor(msg.authorId);
                  
                  // "Thiết quân luật" logic nhận diện: Sử dụng uniqueKey
                  const isMe = msg.authorId === (currentUser?.uniqueKey || '');

                  return (
                    <motion.div 
                      key={msg.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4 px-4`}
                    >
                      <div className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-start gap-3 max-w-[80%]`}>
                        {/* Avatar */}
                        <div className="flex-shrink-0 relative">
                          <Avatar 
                            src={isMe ? currentUser.avatar : author?.avatar} 
                            name={isMe ? currentUser.name : (author?.name || 'User')}
                            size="lg"
                            className={`border-2 ${isMe ? 'border-blue-500' : 'border-slate-200'}`}
                          />
                          {presence.includes(msg.authorId) && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm z-10" />
                          )}
                        </div>

                        {/* Nội dung */}
                        <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          {/* Tên và Thời gian */}
                          <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                            <span translate="no" className="notranslate text-[12px] font-bold text-gray-600">
                              {isMe ? `TÔI (${(currentUser?.role || 'User').toUpperCase()})` : (author?.name || 'Thành viên')}
                            </span>
                            <span translate="no" className="notranslate text-[10px] text-gray-400">
                              {formatFullDateTime(msg.timestamp).split(' ')[1]}
                            </span>
                          </div>

                          {/* Bong bóng tin nhắn */}
                          <div className={`p-3 rounded-2xl shadow-sm relative group ${
                            isMe 
                            ? 'bg-blue-600 text-white rounded-tr-none' 
                            : 'bg-white text-black border border-gray-200 rounded-tl-none'
                          }`}>
                            <div 
                              translate="no" 
                              className="notranslate" 
                              style={{ fontSize: '17px', lineHeight: '1.5' }}
                              dangerouslySetInnerHTML={{ __html: isMe 
                                ? msg.content
                                    .replaceAll('mention-tag', 'text-yellow-200 shadow-sm')
                                    .replaceAll('text-sky-300', 'text-yellow-200 shadow-sm') 
                                : msg.content
                                    .replaceAll('mention-tag', 'text-blue-700 decoration-blue-200 underline-offset-2 font-black')
                                    .replaceAll('text-sky-300', 'text-blue-700 decoration-blue-200 underline-offset-2 font-black') 
                              }}
                            />
                              
                              {/* Attachments List */}
                              {msg.attachments && msg.attachments.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {msg.attachments.map((file, fIdx) => (
                                    <div key={fIdx} className="rounded-xl overflow-hidden border border-white/20 shadow-sm transition-transform hover:scale-[1.01]">
                                      {file.type === 'image' ? (
                                        <img 
                                          src={file.url} 
                                          alt={file.name} 
                                          className="max-w-full h-auto max-h-80 object-cover cursor-zoom-in hover:brightness-95 transition-all" 
                                          onClick={() => window.open(file.url, '_blank')} 
                                        />
                                      ) : (
                                        <div className={`flex items-center gap-3 p-3 ${isMe ? 'bg-white/10' : 'bg-slate-50'}`}>
                                          <FileText size={20} className={isMe ? 'text-white' : 'text-blue-600'} />
                                          <div className="min-w-0">
                                            <p translate="no" className="notranslate text-[12px] font-black truncate uppercase tracking-tight">{file.name}</p>
                                            <p translate="no" className={`notranslate text-[10px] opacity-60 ${isMe ? 'text-white' : 'text-slate-500'}`}>
                                              {(file.size / 1024).toFixed(1)} KB
                                            </p>
                                          </div>
                                          <button 
                                            onClick={() => window.open(file.url, '_blank')}
                                            className={`ml-auto p-1.5 rounded-lg transition-all ${isMe ? 'hover:bg-white/10 text-white' : 'hover:bg-blue-100 text-blue-600'}`}
                                          >
                                            <Download size={14} />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Message Actions (Hovered) */}
                              <div className={`absolute top-0 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-20 ${isMe ? '-left-12' : '-right-12'} flex flex-col gap-1.5`}>
                                <button 
                                  onClick={() => setShowEmojiFor(showEmojiFor === msg.id ? null : msg.id)}
                                  className="w-9 h-9 bg-white shadow-lg border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-amber-500 hover:scale-110 active:scale-95 transition-all"
                                >
                                  <Smile size={18} />
                                </button>
                                
                                {(currentUser.id === msg.authorId || currentUser.role === 'Admin') && (
                                  <button 
                                    onClick={() => onDeleteMessage?.(msg.id)}
                                    className="w-9 h-9 bg-white shadow-lg border border-slate-200 rounded-xl flex items-center justify-center text-slate-300 hover:text-red-500 hover:scale-110 active:scale-95 transition-all"
                                    title="Xóa tin nhắn"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                                
                                <ReactionPicker 
                                  isOpen={showEmojiFor === msg.id}
                                  onSelect={(emoji) => {
                                    onReact(msg.id, emoji);
                                    setShowEmojiFor(null);
                                  }} 
                                  onClose={() => setShowEmojiFor(null)}
                                  position="top"
                                />
                              </div>
                            </div>

                            {/* Reactions Badge Group */}
                            {msg.reactions && msg.reactions.length > 0 && (
                              <div className={`absolute -bottom-3 flex flex-wrap gap-1 shadow-sm ${isMe ? 'right-0' : 'left-0'}`}>
                                <ReactionBadge 
                                  reactions={msg.reactions} 
                                  users={users}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                <div ref={messagesEndRef} />
              </div>

              {/* 3. Input Area (Fixed at bottom) */}
              <div className="p-4 bg-white border-t border-slate-100 relative">
                {/* Formatting Toolbar */}
                <div className="flex items-center gap-1.5 mb-3 px-1 overflow-x-auto no-scrollbar">
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                    <button onClick={() => execCommand('bold')} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-[13px] font-black transition-all" title="In đậm">B</button>
                    <button onClick={() => execCommand('italic')} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-[13px] italic font-serif transition-all" title="Nghiêng">I</button>
                    <button onClick={() => execCommand('underline')} className="w-8 h-8 flex items-center justify-center hover:bg-white hover:shadow-sm rounded-md text-[13px] underline transition-all" title="Gạch chân">U</button>
                  </div>
                  
                  <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                  
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200/50">
                    <select 
                      defaultValue="4"
                      onChange={(e) => execCommand('fontSize', e.target.value)}
                      className="text-[10px] bg-transparent border-0 px-2 py-1 font-black focus:ring-0 cursor-pointer"
                    >
                      <option value="2">XS</option>
                      <option value="3">S</option>
                      <option value="4">M</option>
                      <option value="5">L</option>
                      <option value="6">XL</option>
                    </select>
                  </div>

                  <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200/50">
                    <input 
                      type="color" 
                      onChange={(e) => execCommand('foreColor', e.target.value)}
                      className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer rounded-full overflow-hidden"
                      title="Màu chữ"
                    />
                  </div>
                </div>

                {activeTopic.status === 'CLOSED' ? (
                  <div className="flex items-center justify-center gap-3 py-4 bg-slate-50 text-slate-400 rounded-2xl border border-slate-200 border-dashed">
                     <Lock size={16} />
                     <p className="text-[12px] font-black uppercase tracking-[0.2em] italic">CHỦ ĐỀ ĐÃ ĐÓNG • CHẾ ĐỘ CHỈ XEM</p>
                  </div>
                ) : (
                  <>
                    {pendingAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3 p-2 bg-slate-50 rounded-xl border border-slate-100 shadow-inner">
                         {pendingAttachments.map((f, i) => (
                           <div key={i} className="relative group w-16 h-16 bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm transition-transform hover:scale-105">
                             {f.type === 'image' ? (
                               <img src={f.url} className="w-full h-full object-cover" />
                             ) : (
                               <div className="w-full h-full flex flex-col items-center justify-center p-1.5">
                                  <FileText size={16} className="text-blue-500 mb-1" />
                                  <p className="text-[8px] font-black truncate w-full text-center uppercase leading-none">{f.name}</p>
                               </div>
                             )}
                             <button 
                              onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="absolute top-1 right-1 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md active:scale-90"
                             >
                               <X size={12} strokeWidth={3} />
                             </button>
                           </div>
                         ))}
                      </div>
                    )}

                      <div className="relative flex items-end gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-inner group focus-within:border-blue-300 focus-within:ring-4 ring-blue-50 transition-all duration-300">
                        {/* Mention List Popup */}
                        <AnimatePresence>
                          {showMentionList && filteredMentionUsers.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.15)] border border-slate-100 overflow-hidden z-[999] p-2"
                            >
                              <div className="px-3 py-2 border-b border-slate-50 mb-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gợi ý nhắc tên</p>
                              </div>
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredMentionUsers.map((user) => (
                                  <button
                                    key={user.id}
                                    onClick={() => insertMention(user)}
                                    className="w-full flex items-center gap-3 p-2 hover:bg-blue-50 rounded-xl transition-all group text-left"
                                  >
                                    <Avatar 
                                      src={user.avatar} 
                                      name={user.name} 
                                      size="sm" 
                                      className="border border-slate-200"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[14px] font-bold text-slate-700 truncate mb-0.5">
                                        <span translate="no" className="notranslate uppercase">{user.name}</span>
                                      </p>
                                      <p className="text-[10px] font-black text-slate-400 group-hover:text-blue-500 uppercase tracking-tighter">
                                        <span translate="no" className="notranslate">{(user.role || 'Staff').toUpperCase()}</span>
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="flex items-center gap-1 shrink-0 mb-0.5">
                          <button 
                            ref={emojiTriggerRef}
                            onClick={() => setShowEmojiPicker(true)}
                            className="w-10 h-10 text-slate-400 rounded-xl flex flex-col items-center justify-center hover:bg-white hover:text-blue-600 hover:shadow-md transition-all active:scale-95 gap-0.5"
                            title="Biểu cảm"
                          >
                            <Smile size={20} />
                            <span translate="no" className="notranslate text-[8px] font-black uppercase">Emoji</span>
                          </button>

                          <EmojiPicker 
                            isOpen={showEmojiPicker}
                            onClose={() => setShowEmojiPicker(false)}
                            onSelect={insertEmoji}
                            anchorRect={emojiTriggerRef.current?.getBoundingClientRect()}
                          />

                          {canAttach && (
                            <>
                              <button 
                                onClick={() => imageInputRef.current?.click()}
                                className="w-10 h-10 text-slate-400 rounded-xl flex flex-col items-center justify-center hover:bg-white hover:text-blue-600 hover:shadow-md transition-all active:scale-95 gap-0.5"
                                title="Đính kèm ảnh"
                              >
                                <ImageIcon size={20} />
                                <span translate="no" className="notranslate text-[8px] font-black uppercase">Ảnh</span>
                              </button>
                              <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 text-slate-400 rounded-xl flex flex-col items-center justify-center hover:bg-white hover:text-blue-600 hover:shadow-md transition-all active:scale-95 gap-0.5"
                                title="Đính kèm tệp"
                              >
                                <Paperclip size={20} />
                                <span translate="no" className="notranslate text-[8px] font-black uppercase">Tệp</span>
                              </button>
                            </>
                          )}
                        </div>

                        <div 
                          contentEditable
                          ref={inputRef}
                          className="flex-1 bg-transparent border-0 py-3.5 px-3 text-[16px] outline-none focus:ring-0 transition-all min-h-[48px] max-h-60 overflow-y-auto font-medium text-slate-800 custom-scrollbar empty:before:content-[attr(placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none"
                          placeholder="Nhập nội dung thảo luận mới..."
                          onInput={handleInput}
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
                         disabled={isUploading || (!hasContent && pendingAttachments.length === 0)}
                         className="w-12 h-12 bg-[#132d6b] hover:bg-blue-800 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-20 hover:scale-105 hover:rotate-3 active:scale-90 shadow-xl shadow-blue-900/20 mb-0.5"
                       >
                         <Send size={22} className="ml-0.5" strokeWidth={2.5} />
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
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                   <span translate="no" className="notranslate">Chỉnh sửa chủ đề</span>
                 </h2>
                 <button onClick={() => setEditTopic(null)} className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                      <span translate="no" className="notranslate">Tên chủ đề</span>
                    </label>
                    <input 
                      type="text" 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 uppercase"
                      value={editTopic.title}
                      onChange={(e) => setEditTopic({ ...editTopic, title: e.target.value.toUpperCase() })}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                      <span translate="no" className="notranslate">Mô tả mục tiêu</span>
                    </label>
                    <textarea 
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 min-h-[100px] resize-none uppercase"
                      value={editTopic.description}
                      onChange={(e) => setEditTopic({ ...editTopic, description: e.target.value.toUpperCase() })}
                    />
                 </div>
                 <button 
                  disabled={!editTopic.title.trim()}
                  onClick={() => {
                    const upperTitle = editTopic.title.trim().toUpperCase();
                    const upperDesc = editTopic.description.trim().toUpperCase();
                    
                    // Validation: Prevent duplicate titles (excluding self)
                    const isDuplicate = topics.some(t => 
                      t.id !== editTopic.id && 
                      t.title.toUpperCase() === upperTitle && 
                      t.status !== 'DELETED'
                    );
                    
                    if (isDuplicate) {
                      window.alert(`LỖI: Tên chủ đề "${upperTitle}" đã tồn tại. Vui lòng đặt tên khác.`);
                      return;
                    }

                    onUpdateTopic(editTopic.id, { title: upperTitle, description: upperDesc });
                    setEditTopic(null);
                  }}
                  className="w-full py-4 bg-[#132d6b] text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/10"
                 >
                   <span translate="no" className="notranslate">CẬP NHẬT</span>
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
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                   <span translate="no" className="notranslate">Tạo chủ đề mới</span>
                 </h2>
                 <button onClick={() => setShowCreateTopic(false)} className="w-8 h-8 text-slate-400 hover:text-slate-600 transition-all">
                    <X size={20} />
                 </button>
              </div>

              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                      <span translate="no" className="notranslate">Tên chủ đề</span>
                    </label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Nhập tiêu đề..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 uppercase"
                      value={newTopicTitle}
                      onChange={(e) => setNewTopicTitle(e.target.value.toUpperCase())}
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block px-1">
                      <span translate="no" className="notranslate">Mô tả</span>
                    </label>
                    <textarea 
                      placeholder="Mục tiêu thảo luận..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-blue-100 font-bold text-slate-700 min-h-[80px] resize-none uppercase"
                      value={newTopicDesc}
                      onChange={(e) => setNewTopicDesc(e.target.value.toUpperCase())}
                    />
                 </div>
                 <button 
                  disabled={!newTopicTitle.trim()}
                  onClick={handleCreateTopic}
                  className="w-full py-4 bg-[#132d6b] text-white rounded-xl font-black uppercase tracking-widest transition-all disabled:opacity-20 shadow-lg shadow-blue-900/10"
                 >
                   <span translate="no" className="notranslate">XÁC NHẬN TẠO</span>
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete Confirmation Modal */}
      <AnimatePresence>
        {showBulkDeleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                <span translate="no" className="notranslate">XÓA NHIỀU MỤC?</span>
              </h2>
              <p className="text-[13px] text-slate-500 font-medium mb-8">
                <span translate="no" className="notranslate">
                  Bạn đã chọn {selectedBulkIds.length} chủ đề. Hành động này sẽ xóa vĩnh viễn dữ liệu và không thể khôi phục.
                </span>
              </p>
              
              <div className="space-y-2">
                <button 
                  disabled={isDeleting}
                  onClick={handleBulkDelete}
                  className="w-full py-3.5 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 disabled:opacity-50"
                >
                  {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  <span translate="no" className="notranslate">{isDeleting ? 'ĐANG XÓA...' : `XÁC NHẬN XÓA ${selectedBulkIds.length} MỤC`}</span>
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={() => setShowBulkDeleteConfirm(false)}
                  className="w-full py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                >
                  <span translate="no" className="notranslate">HUỶ BỎ</span>
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
                  <span translate="no" className="notranslate">{isActuallyDeleted ? 'Xóa vĩnh viễn?' : 'Chuyển vào thùng rác?'}</span>
                </h2>
                <p className="text-[13px] text-slate-500 font-medium mb-8">
                  <span translate="no" className="notranslate">
                    {isActuallyDeleted 
                      ? 'Hành động này không thể hoàn tác. Toàn bộ dữ liệu chủ đề sẽ biến mất mãi mãi.' 
                      : 'Chủ đề sẽ được chuyển vào tab ĐÃ XÓA. Bạn có thể khôi phục lại sau nếu cần.'}
                  </span>
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
                      <Download size={14} />
                      <span translate="no" className="notranslate">TẢI VỀ & XÓA TẠM</span>
                    </button>
                  )}
                  <button 
                    onClick={() => handleTopicDelete(showDeleteTopicConfirm)}
                    className="w-full py-3.5 bg-red-500 text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all"
                  >
                    <span translate="no" className="notranslate">{isActuallyDeleted ? 'XÁC NHẬN XÓA VĨNH VIỄN' : 'XÁC NHẬN XÓA TẠM'}</span>
                  </button>
                  <button 
                    onClick={() => setShowDeleteTopicConfirm(null)}
                    className="w-full py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-200 transition-all"
                  >
                    <span translate="no" className="notranslate">HUỶ BỎ</span>
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

