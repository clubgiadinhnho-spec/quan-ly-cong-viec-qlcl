import React from 'react';
import { MessageSquare, Paperclip, X, CheckCircle, XCircle, Sparkles, RotateCcw, Trash2, Bell, RefreshCw, Highlighter, Check, ThumbsUp, CheckCircle2, Tag, Pencil, Eye, History, UserCircle, ChevronDown, Zap, Banknote, Bold, Underline, Palette, Eraser, Edit3 } from 'lucide-react';
import { Task, User, AIChatMessage } from '../../types';
import { GoogleGenAI } from "@google/genai";
import { formatDate, calculateNextDeadline, getTaskDeadlineStatus } from '../../lib/dateUtils';
import { TaskChat } from './TaskChat';
import { TaskAIChat } from './TaskAIChat';
import { AnimatePresence, motion } from 'motion/react';
import { Avatar } from '../common/Avatar';
import { Portal } from '../common/Portal';
import { UpdateModal } from './UpdateModal';
import { CycleHistoryEntry } from '../../types';
import { format, isSameDay, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';
import { RobotAvatar } from '../common/RobotAvatar';
import { ChatIconSVG } from '../common/ChatIconSVG';

import { getUserById, getSafeNameProps, getTaskAssigneeName, isUserTask } from '../../utils/userUtils';
import { generateQCDExplanation } from '../../services/geminiService';

const HIGHLIGHT_COLORS: Record<string, string> = {
  'amber': '!bg-amber-50/50 hover:!bg-amber-100/60 ring-inset ring-1 ring-amber-200/30 text-amber-950',
  'emerald': '!bg-emerald-50/50 hover:!bg-emerald-100/60 ring-inset ring-1 ring-emerald-200/30 text-emerald-950',
  'blue': '!bg-blue-50/50 hover:!bg-blue-100/60 ring-inset ring-1 ring-blue-200/30 text-blue-950',
  'red': '!bg-rose-50/50 hover:!bg-rose-100/60 ring-inset ring-1 ring-rose-200/30 text-rose-950',
  'purple': '!bg-purple-50/50 hover:!bg-purple-100/60 ring-inset ring-1 ring-purple-200/40 text-purple-950',
};

interface TaskRowProps {
  task: Task;
  user: User;
  users: User[];
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onDelete: (id: string) => void;
  onViewHistory: (id: string) => void;
  onOpenChat: (id: string) => void;
  isChatOpen: boolean;
  onSendMessage: (taskId: string, content: string) => void;
  onReact?: (taskId: string, commentId: string, emoji: string) => void;
  onTogglePriority: (id: string) => void;
  onEdit: (task: Task) => void;
  onSetPriority?: (id: string, order: number | null) => void;
  idx: number;
  setConfirmModal: (modal: any) => void;
  isReadOnly?: boolean;
  isUpdateReadOnly?: boolean;
  onRestore?: (id: string) => void;
  onApprove?: (id: string) => void;
  approveTaskCompletion?: (id: string, modifierName?: string, leaderQCD?: any, stopRecurrence?: boolean) => Promise<void>;
  onNavigate?: (tab: string) => void;
  highlightedTaskId?: string | null;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  createNotification?: (senderName: string, taskCode: string, taskId: string, type: any) => Promise<void>;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  sendAiMessage?: any;
  triggerAiNudge?: any;
  resetTaskAIStatus?: any;
  aiMessages?: any[];
  presence?: any[];
}

export const TaskRow: React.FC<TaskRowProps> = ({ 
  task, user, users, onUpdate, onDelete, onViewHistory, onOpenChat, 
  isChatOpen, onSendMessage, onReact, onTogglePriority, onSetPriority, onEdit, idx, setConfirmModal,
  isReadOnly = false, isUpdateReadOnly = false, onRestore, onApprove, approveTaskCompletion, onNavigate, highlightedTaskId, isSelected, onToggleSelect,
  createNotification, markAsRead, lastReadChatTimestamps,
  sendAiMessage, triggerAiNudge, resetTaskAIStatus, aiMessages,
  presence
}) => {
  const chatButtonRef = React.useRef<HTMLButtonElement>(null);

  const assigneeName = getTaskAssigneeName(task, users);
  const assignee = getUserById(assigneeName, users) || getUserById(task.assigneeId, users);

  // Auto-scroll when highlighted
  React.useEffect(() => {
    if (highlightedTaskId === task.id) {
      const element = document.getElementById(`task-${task.id}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [highlightedTaskId, task.id]);

  const isOwner = user?.uniqueKey === task.assigneeId || isUserTask(task, user);
  const isAdmin = user.role?.toUpperCase() === 'ADMIN' || user.uniqueKey === 'LeNhatTruong09xxxxxxxx' || user.name === 'Lê Nhật Trường' || user.id === 'lenhattruong.caphef1@gmail.com';
  const isAuthor = task.authorId === user.id || task.authorId === user.uniqueKey;
  const canApprove = isAdmin || !!user.delegatedPermissions?.canApproveTask;
  const canDelete = isAdmin || !!user.delegatedPermissions?.canDeleteTask;
  const isManager = isAdmin || !!user.delegatedPermissions?.canCreateTask;
  const isEmployee = user.role === 'Staff';
  
  const canSeeAI = isAdmin || user.role === 'Trưởng Phòng';

  const canEditPriority = isAdmin;
  const [showColorPicker, setShowColorPicker] = React.useState(false);
  const [showQCDModal, setShowQCDModal] = React.useState(false);
  const [showUpdateModal, setShowUpdateModal] = React.useState(false);
  const [showAIChat, setShowAIChat] = React.useState(false);
  const [openGuide, setOpenGuide] = React.useState<string | null>(null);

  const lastSeenMsgId = React.useRef<string | null>(null);
  const [sessionStartTime] = React.useState(() => {
    const stored = sessionStorage.getItem('session_start_time');
    if (stored) return parseInt(stored, 10);
    const now = Date.now();
    sessionStorage.setItem('session_start_time', now.toString());
    return now;
  });

  // Auto-open AI Chat if there's a new reminder or task is in reminding state (yellow)
  // New logic: Only open if user is online, 1 minute passed since login, and it's the first reminder auto-open
  React.useEffect(() => {
    if (!isOwner || task.aiReminderResponded !== false) return;

    const checkAutoOpen = () => {
      // 1. Check if user is online
      const isOnline = presence?.some(p => p.uniqueKey === user.uniqueKey || p.id === user.id);
      if (!isOnline) return;

      // 2. Check if 1 minute has passed since login (session start)
      const now = Date.now();
      if (now - sessionStartTime < 60000) return;

      // 3. Check if we already auto-opened one in this session
      const alreadyOpened = sessionStorage.getItem('ai_chat_auto_opened');
      if (!alreadyOpened) {
        setShowAIChat(true);
        sessionStorage.setItem('ai_chat_auto_opened', 'true');
      }
    };

    const now = Date.now();
    const timeToWait = 60000 - (now - sessionStartTime);

    if (timeToWait <= 0) {
      checkAutoOpen();
    } else {
      const timer = setTimeout(checkAutoOpen, timeToWait);
      return () => clearTimeout(timer);
    }
  }, [task.id, task.aiReminderResponded, isOwner, presence, sessionStartTime, user.id, user.uniqueKey]);

  // QCD Local State for Staff
  const [staffQ, setStaffQ] = React.useState(task.staffQCD?.q || 3);
  const [staffC, setStaffC] = React.useState(task.staffQCD?.c || 3);
  const [staffD, setStaffD] = React.useState(task.staffQCD?.d || 3);
  const [staffQExp, setStaffQExp] = React.useState(task.staffQCD?.qExplanation || '');
  const [staffCExp, setStaffCExp] = React.useState(task.staffQCD?.cExplanation || '');
  const [staffDExp, setStaffDExp] = React.useState(task.staffQCD?.dExplanation || '');

  // Leader QCD State
  const [leaderQ, setLeaderQ] = React.useState(task.leaderQCD?.q || 3);
  const [leaderC, setLeaderC] = React.useState(task.leaderQCD?.c || 3);
  const [leaderD, setLeaderD] = React.useState(task.leaderQCD?.d || 3);
  const [leaderQComment, setLeaderQComment] = React.useState('');
  const [leaderCComment, setLeaderCComment] = React.useState('');
  const [leaderDComment, setLeaderDComment] = React.useState('');

  // When chat opens or new comments arrive while open, update last read timestamp
  React.useEffect(() => {
    if (isChatOpen) {
      markAsRead(task.id);
    }
  }, [isChatOpen, task.id, markAsRead, task.comments?.length]);

  const lastReadTime = (lastReadChatTimestamps || {})[task.id] || 0;
  const unreadCount = (task.comments || []).filter(c => {
    const cTime = c.timestamp 
      ? (typeof c.timestamp === 'string' ? new Date(c.timestamp).getTime() : (c.timestamp as any).toDate?.().getTime() || Date.now()) 
      : Date.now();
    return cTime > lastReadTime && c.authorId !== user.id;
  }).length;
  const showBadge = unreadCount > 0 && !isChatOpen;

  const getPriorityRowClass = (priority: number | undefined) => {
    return '';
  };

  const isAiReminding = task.aiReminderResponded === false;
  const priorityRowClass = getPriorityRowClass(task.priorityOrder);
  const highlightClass = task.highlightColor ? HIGHLIGHT_COLORS[task.highlightColor] : (task.isHighlighted ? HIGHLIGHT_COLORS['amber'] : '');
  const finalRowClass = highlightClass || priorityRowClass || 'hover:bg-gray-50/50';

  // Deadline Warning Logic
  const deadlineInfo = getTaskDeadlineStatus(task);

  const isFreshUpdate = task.isNewUpdate && task.lastUpdatedByRole !== user.role && (
    isAdmin || isOwner
  );

  const isRecurringTask = task.recurrence && task.recurrence !== 'NONE' && task.recurrence !== 'KHÔNG LẶP';

  const showRedAlert = () => {
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">LỖI THAO TÁC</span>,
      message: (
        <div className="bg-red-600 p-4 rounded-xl text-center border-4 border-red-400 shadow-[0_0_20px_rgba(220,38,38,0.5)]">
          <p className="text-white font-black text-lg uppercase leading-tight">
            <span translate="no" className="notranslate">ĐÂY LÀ CÔNG VIỆC ĐỊNH KỲ ĐÃ PHÁT SINH KỲ MỚI, KHÔNG THỂ HOÀN TÁC ĐỂ TRÁNH TRÙNG LẶP MÃ SỐ!</span>
          </p>
        </div>
      ),
      confirmText: <span translate="no" className="notranslate">ĐÃ HIỂU</span>,
      onConfirm: () => setConfirmModal((p: any) => ({ ...p, show: false })),
      isAlert: true
    });
  };

  const isTrulyNew = task.isNewInBoard && task.lastUpdatedByRole !== user.role && isOwner;

  const isNewInBoard = task.isNewInBoard && isAdmin;

  // Helper to convert our custom tags to HTML and vice versa if needed
  const toHTML = (content: string) => {
    if (!content) return '';
    
    // Hide content completely if it's from any Robot/AI source
    if (/(?:🤖|\[Robot|Robot Assist|Robot Assistant|Robot Update|Robot:|\bRobot\b)/gi.test(content)) {
      return '';
    }

    let processed = content;

    // Support legacy tags
    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
    processed = processed.replace(/<hl>(.*?)<\/hl>/g, '<mark>$1</mark>');
    return processed;
  };

  const handleUpdateProgress = (taskId: string, htmlContent: string) => {
    onUpdate(taskId, { 
      currentUpdate: htmlContent,
      isNewUpdate: true,
      lastActionAt: new Date().toISOString(),
      lastUpdatedByRole: user.role,
      version: (task.version || 0) + 1
    });
  };

  const handleConfirmTask = (approve: boolean) => {
    if (approve) {
      onUpdate(task.id, { 
        status: 'APPROVED', 
        isNewInBoard: true,
        updatedAt: new Date().toISOString()
      });
    } else {
      onDelete(task.id);
    }
  };

  const [isProcessing, setIsProcessing] = React.useState(false);
  const [stopRecurrence, setStopRecurrence] = React.useState(false);
  const [loadingAI, setLoadingAI] = React.useState<string | null>(null);

  const handleSuggestAI = async (role: 'Staff' | 'Admin', field: 'QUALITY' | 'COST' | 'DELIVERY', score: number, setter: (val: string) => void) => {
    const fieldKey = `${role.toLowerCase()}-${field}`;
    setLoadingAI(fieldKey);
    try {
      const suggestion = await generateQCDExplanation(role, task, field, score);
      setter(suggestion);
    } finally {
      setLoadingAI(null);
    }
  };

  const handleStatusAction = async () => {
    if (isProcessing) return;
    
    // Staff sends completion request
    if (!isAdmin) {
      if (!isOwner) return;
      if (task.waitingApproval) return;
      
      // Open QCD Modal for Staff to fill details
      setShowQCDModal(true);
    } else {
      // Admin approves completion - Show review modal
      setShowQCDModal(true);
    }
  };

  const submitStaffQCD = async () => {
    if (!staffQ || !staffC || !staffD || !staffQExp.trim() || !staffCExp.trim() || !staffDExp.trim()) return;
    setIsProcessing(true);
    try {
      onUpdate(task.id, { 
        waitingApproval: true,
        isNewUpdate: true,
        updatedAt: new Date().toISOString(),
        staffQCD: {
          q: staffQ,
          c: staffC,
          d: staffD,
          explanation: `${staffQExp.trim()} | ${staffCExp.trim()} | ${staffDExp.trim()}`,
          qExplanation: staffQExp.trim(),
          cExplanation: staffCExp.trim(),
          dExplanation: staffDExp.trim()
        }
      });
      setShowQCDModal(false);
      if (onNavigate) onNavigate('pending_approval');
      if (createNotification) {
        await createNotification(user.name, task.code, task.id, 'COMPLETED_REQUEST');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const submitLeaderApproval = async () => {
    setIsProcessing(true);
    try {
      const qC = leaderQComment.trim() || 'Đồng ý';
      const cC = leaderCComment.trim() || 'Đồng ý';
      const dC = leaderDComment.trim() || 'Đồng ý';

      if (approveTaskCompletion) {
        await approveTaskCompletion(task.id, user.name, {
          q: leaderQ,
          c: leaderC,
          d: leaderD,
          explanation: `Q: ${qC} | C: ${cC} | D: ${dC}`,
          qComment: qC,
          cComment: cC,
          dComment: dC
        }, stopRecurrence);
      } else {
        onUpdate(task.id, {
          status: 'COMPLETED',
          leaderQCD: { 
            q: leaderQ, 
            c: leaderC, 
            d: leaderD, 
            explanation: `Q: ${qC} | C: ${cC} | D: ${dC}`,
            qComment: qC,
            cComment: cC,
            dComment: dC
          },
          waitingApproval: false,
          updatedAt: new Date().toISOString()
        });
      }
      setShowQCDModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    onUpdate(task.id, { 
      status: 'APPROVED', 
      isNewInBoard: true,
      updatedAt: new Date().toISOString(),
      lastActionAt: new Date().toISOString()
    });
  };

  return (
    <motion.tr 
      id={`task-${task.id}`}
      initial={false}
      animate={{ 
        backgroundColor: highlightedTaskId === task.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
        boxShadow: highlightedTaskId === task.id ? 'inset 0 0 0 2px rgba(59, 130, 246, 0.5)' : 'inset 0 0 0 0px transparent'
      }}
      transition={{ duration: 0.4 }}
      className={`group transition-all ${finalRowClass} relative ${highlightedTaskId === task.id ? 'z-10' : ''} ${isSelected ? 'bg-blue-50/50' : ''}`}
    >
      <td className="p-1 px-1.5 text-center border border-gray-300 align-middle w-[40px]">
         <input 
           type="checkbox" 
           checked={isSelected}
           onChange={() => onToggleSelect?.(task.id)}
           className="w-3 h-3 rounded-sm border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all"
         />
      </td>
      <td className={`p-1.5 text-center text-[10px] border border-gray-300 align-top relative h-px min-w-[70px] ${task.isHighlighted || task.priorityOrder ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className="flex flex-col items-center pt-0.5 h-full justify-between">
          <div className="flex flex-col items-center gap-1 mb-2">
            <div translate="no" className="notranslate leading-none text-[12px] font-mono font-black text-blue-600 bg-blue-50/50 px-1 py-0.5 rounded-sm border border-blue-100/50">
               <span translate="no" className="notranslate">
                 {task.code}
               </span>
            </div>

            {/* Robot Icon below Code */}
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  const nextShow = !showAIChat;
                  
                  // Ưu tiên hiện UI ngay lập tức
                  setShowAIChat(nextShow);

                  if (nextShow) {
                    // Xử lý logic trạng thái sau khi đã mở UI
                    if (isOwner && task.aiReminderResponded === false) {
                      onUpdate(task.id, { aiReminderResponded: true });
                    }
                    else if (isAdmin && task.aiReminderResponded === true && resetTaskAIStatus) {
                      resetTaskAIStatus(task.id);
                    }
                  }
                }}
                className={`p-1.5 rounded-full transition-all hover:scale-110 active:scale-95 ${
                  task.aiReminderResponded === false
                    ? 'bg-yellow-400 text-black shadow-[0_0_20px_rgba(253,224,71,0.8)] ring-2 ring-yellow-200 animate-pulse'
                    : task.aiReminderResponded === true
                      ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)] ring-1 ring-emerald-200'
                      : showAIChat 
                        ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-100' 
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title={isAdmin ? (task.aiReminderResponded ? "Nhân viên đã phản hồi AI - Nhấn để xem" : "Robot đang nhắc việc nhân viên (Màu Vàng)") : "Nhấn để trò chuyện với Robot Trợ Lý AI"}
              >
                <RobotAvatar size={18} animate={isAiReminding && task.assigneeId === user.uniqueKey} />
              </button>

              <AnimatePresence>
                {showAIChat && (
                  <TaskAIChat 
                    task={task}
                    assigneeName={assigneeName}
                    currentUser={user}
                    messages={aiMessages || []}
                    onSendMessage={sendAiMessage}
                    onClose={() => {
                      setShowAIChat(false);
                    }}
                  />
                )}
              </AnimatePresence>
            </div>

            {/* Category labels removed per user request */}
            {task.recurrence && task.recurrence !== 'NONE' && (
              <div className="flex flex-col items-center gap-1">
                <RefreshCw size={14} className="text-emerald-500 animate-[spin_4s_linear_infinite]" strokeWidth={3} />
                <span translate="no" className="notranslate text-[9px] font-black text-emerald-600 leading-none uppercase bg-emerald-50 px-1 py-0.5 rounded-sm border border-emerald-100">
                  {task.recurrence === 'DAILY' && <span translate="no" className="notranslate">HÀNG NGÀY</span>}
                  {task.recurrence === 'TRI_DAILY' && <span translate="no" className="notranslate">2-3 NGÀY/LẦN</span>}
                  {task.recurrence === 'WEEKLY' && <span translate="no" className="notranslate">HÀNG TUẦN</span>}
                  {task.recurrence === 'BI_WEEKLY' && <span translate="no" className="notranslate">HÀNG 2 TUẦN</span>}
                  {task.recurrence === 'TRI_WEEKLY' && <span translate="no" className="notranslate">HÀNG 3 TUẦN</span>}
                  {task.recurrence === 'MONTHLY' && <span translate="no" className="notranslate">HÀNG THÁNG</span>}
                </span>
              </div>
            )}
          </div>
            {deadlineInfo.status !== 'NORMAL' && task.status !== 'COMPLETED' && (
              <div className="flex flex-col items-center gap-1.5 transition-all mt-auto mb-1">
                <div 
                  className={`p-1 rounded-sm border-2 brightness-110 transition-all ${
                    deadlineInfo.status === 'CRITICAL' 
                      ? 'text-white bg-red-600 border-red-400 shadow-[0_0_8px_rgba(220,38,38,0.6)]' 
                      : deadlineInfo.status === 'URGENT'
                        ? 'text-white bg-orange-500 border-orange-300 shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                        : 'text-black bg-yellow-400 border-yellow-300 shadow-[0_0_8px_rgba(234,179,8,0.6)]'
                  }`}
                  title={deadlineInfo.displayText}
                >
                  <Bell size={24} fill="currentColor" className={deadlineInfo.status === 'CRITICAL' ? 'animate-ring' : 'animate-pulse'} />
                </div>
                <span translate="no" className={`notranslate text-[9px] font-medium uppercase leading-none tracking-tight px-1 py-0.5 rounded-sm whitespace-nowrap ${
                  deadlineInfo.status === 'CRITICAL' 
                    ? 'text-white bg-red-600' 
                    : deadlineInfo.status === 'URGENT'
                      ? 'text-white bg-orange-500'
                      : 'text-black bg-yellow-400'
                }`}>
                  <span translate="no" className="notranslate">{deadlineInfo.status === 'CRITICAL' ? 'QUÁ HẠN' : deadlineInfo.status === 'URGENT' ? 'HẠN HÔM NAY' : 'SẮP HẾT HẠN'}</span>
                </span>
              </div>
            )}
          {isTrulyNew && (
            <div className="bg-amber-100 text-amber-600 p-0.5 rounded-sm animate-bounce" title="Lính mới / Việc mới xác nhận">
              <Sparkles size={8} strokeWidth={3} />
            </div>
          )}
        </div>
      </td>
      <td 
        className={`p-1 border border-gray-300 align-top h-px relative transition-colors ${task.highlightColor || task.isHighlighted ? 'border-l-4 border-amber-500' : isNewInBoard ? 'border-l-4 border-emerald-500 bg-emerald-50/10' : ''}`}
      >
        <div className="flex flex-col h-full gap-1.5 px-0.5 pt-0.5 pb-4">
          {/* 1. Identity Section - Avatar & Name on same row */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Avatar src={assignee?.avatar} name={assigneeName} size="md" className="ring-[0.5px] ring-black border-none" />
              {isAdmin && task.aiReminderResponded && (
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_5px_rgba(16,185,129,0.8)] animate-pulse" title="Đã tương tác với AI" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div {...getSafeNameProps()} className="text-[14px] font-bold text-gray-900 leading-none truncate notranslate" title={assigneeName}>
                <span translate="no" className="notranslate">{assigneeName}</span>
              </div>
              <div className="mt-1.5">
                <span translate="no" className="notranslate text-[11px] font-medium text-gray-400 uppercase tracking-tighter bg-gray-50 px-1 py-0.5 rounded-sm border border-gray-100">
                  {assignee ? <span translate="no" className="notranslate">{assignee.title || assignee.role}</span> : <span translate="no" className="notranslate">NHÂN SỰ</span>}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Timeline Section - Vertical 4 Rows */}
          <div className="flex flex-col gap-2 py-2 border-y border-gray-50 border-dashed">
            {/* Hàng 1: Khởi tạo */}
            <div className="flex items-center gap-2">
              <div className="w-5 flex justify-center text-gray-400">
                <Highlighter size={13} />
              </div>
              <div className="text-[11px] text-gray-500 font-medium tracking-tight whitespace-nowrap">
                <span translate="no" className="notranslate uppercase">KHỞI TẠO: {formatDate(task.issueDate)}</span>
              </div>
            </div>
            
            {/* Hàng 2: Bắt đầu */}
            <div className="flex items-center gap-2">
              <div className="w-5 flex justify-center text-blue-500">
                <Zap size={13} fill="currentColor" />
              </div>
              <div className="text-[11px] text-blue-600 font-medium tracking-tight whitespace-nowrap">
                <span translate="no" className="notranslate">BẮT ĐẦU: {formatDate(task.startDate || task.issueDate)}</span>
              </div>
            </div>
            
            {/* Hàng 3: Hạn */}
            <div className="flex items-center gap-2 leading-none">
              <div className="w-5 flex justify-center text-gray-700">
                <Tag size={13} fill={deadlineInfo.status !== 'NORMAL' ? "currentColor" : "none"} className={deadlineInfo.status === 'CRITICAL' ? 'text-red-600' : deadlineInfo.status === 'URGENT' ? 'text-orange-500' : ''} />
              </div>
              <div className={`text-[11px] ${deadlineInfo.status === 'CRITICAL' ? 'text-red-700 font-black' : deadlineInfo.status === 'URGENT' ? 'text-orange-600 font-black' : deadlineInfo.status === 'WARNING' ? 'text-yellow-700 font-bold' : 'text-gray-900 font-bold'} tracking-tight whitespace-nowrap`}>
                <span translate="no" className="notranslate uppercase">
                  {deadlineInfo.displayText}
                </span>
              </div>
            </div>

            {/* Hàng 4: Gia hạn (Nếu có) */}
            {task.extensionDate && (
              <div className="flex items-center gap-2">
                <div className="w-5 flex justify-center text-orange-500">
                  <RotateCcw size={13} strokeWidth={3} />
                </div>
                <div className="text-[11px] text-orange-600 font-medium tracking-tight whitespace-nowrap">
                  <span translate="no" className="notranslate uppercase font-medium">GIA HẠN: {formatDate(task.extensionDate)}</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Chat Button - Floating at the bottom-right of the cell */}
          <div className="absolute bottom-1.5 right-1.5" onClick={(e) => e.stopPropagation()}>
            <button 
              ref={chatButtonRef}
              onClick={() => onOpenChat(isChatOpen ? '' : task.id)}
              className={`flex items-center gap-1.5 py-0.5 px-2 transition-all rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 group/chat ${
                showBadge && isAdmin ? 'bg-red-50 text-red-700 font-bold' : (task.comments?.length || 0) > 0 ? 'bg-red-50 text-red-800 font-bold' : 'bg-white text-gray-500 hover:text-blue-600'
              }`}
            >
              <div className="flex items-center gap-1.5 relative">
                <div className="relative">
                  <ChatIconSVG size={22} className="opacity-100" />
                  {showBadge && (
                    <span translate="no" className="notranslate absolute -top-2 -right-2 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 bg-red-600 text-white text-[8px] font-black rounded-full border border-white shadow-sm z-10 animate-bounce">
                      <span translate="no" className="notranslate font-black">{unreadCount}</span>
                    </span>
                  )}
                </div>
                <span translate="no" className="notranslate text-[8px] font-black tracking-tight uppercase">
                  <span translate="no" className="notranslate">CHAT</span>
                </span>
              </div>
            </button>

            {isChatOpen && (
              <TaskChat 
                task={task}
                currentUser={user}
                users={users}
                onSendMessage={onSendMessage}
                onReact={onReact}
                onClose={() => onOpenChat('')}
                anchorRef={chatButtonRef}
              />
            )}
          </div>
        </div>
      </td>
      <td className={`p-1.5 border border-gray-300 relative group align-top h-px ${(!isAdmin && !isOwner) ? 'bg-gray-50' : ''}`}>
        {task.attachmentUrl && (
          <a 
            href={task.attachmentUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            title={`Xem đính kèm: ${task.attachmentName}`}
            className="absolute top-1 right-3 p-0.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-all z-10"
          >
            <Paperclip size={10} strokeWidth={3} />
          </a>
        )}

        {isManager && (
          <button 
            onClick={() => onEdit(task)}
            className="absolute top-1 right-1 text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="CHỈNH SỬA NỘI DUNG & GIA HẠN"
          >
            <Pencil size={12} strokeWidth={3} />
          </button>
        )}

        <div className="flex flex-col h-full font-sans">
          <div className="text-[15px] text-blue-800 font-bold leading-tight pr-5 break-words whitespace-normal font-sans text-justify">
            {isTrulyNew && (
              <span 
                translate="no" 
                className="notranslate inline-block bg-red-600 text-white text-[9px] font-black px-1 py-0.5 rounded-sm mr-1 animate-pulse uppercase cursor-pointer align-middle"
                onClick={() => onUpdate(task.id, { isNewInBoard: false })}
              >
                NEW
              </span>
            )}
            {isNewInBoard && (
              <span className="inline-flex items-center mr-1 align-middle">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ring-1 ring-emerald-100" />
              </span>
            )}
            <span translate="no" className="notranslate uppercase">
              [{task.category?.toUpperCase() || 'KHÁC'}] - {task.title}
            </span>
          </div>
          
          <div className="text-[15px] text-gray-900 leading-tight mt-2 break-words whitespace-normal flex-1 font-sans pr-5 text-justify">
            <span translate="no" className="notranslate font-bold">MỤC TIÊU: </span>
            <span translate="no" className="notranslate">{task.objective}</span>
          </div>
          
          <div className="mt-1 flex items-center gap-1">
              {task.status === 'PENDING_APPROVAL' && (
                <span className="text-[8px] font-black text-amber-500 bg-amber-50 px-1 py-0.2 rounded-sm animate-pulse border border-amber-100 uppercase tracking-tighter">
                  <span translate="no" className="notranslate">DUYỆT</span>
                </span>
              )}
          </div>
        </div>
      </td>

      <td 
        className={`p-0 border border-gray-300 align-top h-full ${(!isAdmin && !isOwner) ? 'bg-gray-50/30' : 'bg-white'}`}
      >
        <div className="flex flex-col h-full min-h-[100px] relative">
              {/* Header area for Vn and Toolbar - NO LONGER DIRECT EDIT */}
              <div className="flex items-center justify-between px-2 py-1 border-b border-gray-100/30 bg-gray-50/30 shrink-0">
                <div translate="no" className="notranslate flex items-center gap-1.5">
                  {((task.version || 0) > 0 || task.currentUpdate) && (() => {
                    const lastUpdate = task.lastActionAt ? new Date(task.lastActionAt) : new Date();
                    const now = new Date();
                    
                    // Reset time components for accurate day comparison
                    const d1 = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
                    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    
                    const diffTime = d2.getTime() - d1.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                    
                    let bgClass = "bg-gray-100 text-gray-500 border-gray-200";
                    const tooltipText = "QUY ĐỊNH MÀU SẮC Vn:\n- Xanh lá: Cập nhật hôm nay & hôm qua\n- Xanh dương: Trễ 2-3 ngày\n- Tím: Trễ 4-5 ngày\n- Đỏ: Trễ từ 6 ngày trở lên";

                    if (diffDays <= 1) bgClass = "bg-green-500 text-white border-green-600";
                    else if (diffDays >= 2 && diffDays <= 3) bgClass = "bg-blue-600 text-white border-blue-700";
                    else if (diffDays >= 4 && diffDays <= 5) bgClass = "bg-purple-600 text-white border-purple-700";
                    else if (diffDays >= 6) bgClass = "bg-red-600 text-white border-red-700";

                    return (
                      <span 
                        translate="no" 
                        className={`notranslate text-[9px] font-black px-1 py-0.5 rounded-sm border shadow-sm transition-colors ${bgClass}`}
                        title={tooltipText}
                      >
                        V{task.version || 1}
                      </span>
                    );
                  })()}
                  {canApprove && isFreshUpdate && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdate(task.id, { isNewUpdate: false });
                      }}
                      className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500 text-white rounded-sm animate-pulse border border-amber-400 hover:bg-amber-600 transition-colors shadow-sm"
                    >
                      XEM
                    </button>
                  )}
                </div>

                {(!isReadOnly && !isUpdateReadOnly && (isAdmin || isOwner)) && (
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setShowUpdateModal(true);
                      if (isAdmin && task.isNewUpdate) {
                        onUpdate(task.id, { isNewUpdate: false });
                      }
                    }}
                    className="w-5 h-5 flex items-center justify-center rounded-md bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100 group/edit"
                    title="CẬP NHẬT TIẾN ĐỘ"
                  >
                    <Edit3 size={11} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              <div className="relative flex-1 flex flex-col p-2 pt-1 overflow-hidden">
                <style dangerouslySetInnerHTML={{ __html: `
                  .notranslate.rich-text-content, 
                  .notranslate.rich-text-content *,
                  .notranslate.rich-text-content i,
                  .notranslate.rich-text-content em {
                    font-style: normal !important;
                  }
                ` }} />
                <div 
                  translate="no"
                  className={`notranslate rich-text-content flex-1 w-full text-[14px] font-medium outline-none transition-all leading-relaxed max-h-[160px] text-blue-950 font-sans overflow-y-auto custom-scrollbar ${canApprove && isFreshUpdate ? 'bg-amber-50/40 ring-1 ring-inset ring-amber-200/50' : ''}`}
                  style={{ fontStyle: 'normal' }}
                  dangerouslySetInnerHTML={{ __html: toHTML(task.currentUpdate || '') }}
                  title="NỘI DUNG CẬP NHẬT TIẾN ĐỘ"
                />
              </div>

              {/* Progress Update Modal */}
              <UpdateModal 
                isOpen={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                task={task}
                onSave={handleUpdateProgress}
              />
        </div>
      </td>
      <td className="p-0 text-center border border-gray-300 align-middle">
        <div className="relative group/priority w-full h-full min-h-[32px] flex items-center justify-center p-1">
          <button 
            onClick={canEditPriority && !task.priorityOrder ? () => onTogglePriority(task.id) : undefined}
            disabled={!canEditPriority && !task.priorityOrder}
            className={`w-[32px] h-[32px] flex flex-col items-center justify-center transition-all rounded-md border-2 ${
              task.priorityOrder 
                ? `${
                    task.priorityOrder === 1 ? 'bg-red-50 text-red-700 border-red-200' :
                    task.priorityOrder === 2 ? 'bg-orange-50 text-orange-700 border-orange-200' :
                    task.priorityOrder === 3 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                    task.priorityOrder === 4 ? 'bg-green-50 text-green-700 border-green-200' :
                    task.priorityOrder === 5 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    task.priorityOrder === 6 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  } font-black` 
                : 'text-gray-200 hover:text-red-500 hover:bg-red-50 border-gray-100 border-dashed'
            } ${!canEditPriority ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
          >
            {task.priorityOrder ? (
              <span className="text-[16px] leading-none font-black"><span translate="no" className="notranslate">{task.priorityOrder}</span></span>
            ) : (
              <span className="text-[10px] opacity-20">—</span>
            )}
          </button>
          
          {canEditPriority && task.priorityOrder && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onSetPriority && onSetPriority(task.id, null);
              }}
              className="absolute top-1 right-1 w-3.5 h-3.5 bg-gray-600/80 text-white rounded-full flex items-center justify-center border border-white opacity-0 group-hover/priority:opacity-100 transition-opacity z-10 hover:bg-red-600"
              title="Bỏ ưu tiên"
            >
              <X size={8} strokeWidth={4} />
            </button>
          )}
        </div>
      </td>
      <td className="py-1 px-1 text-center border border-gray-300 align-middle">
          <div className="flex flex-col items-center justify-center gap-1.5 w-full max-w-[44px] mx-auto min-h-full py-0.5">
            {(isAdmin || isOwner || isAuthor) ? (
              <>
                {/* 1. PRIMARY ACTION (CHECKMARK) - NOW ON TOP */}
                {!isReadOnly && (
                  <>
                    {/* TRẠNG THÁI: APPROVED - NÚT XONG */}
                    {task.status === 'APPROVED' && !task.isLocked && (
                      <button 
                        onClick={handleStatusAction}
                        title={isAdmin ? 'XÁC NHẬN HOÀN THÀNH' : 'GỬI HOÀN THÀNH'}
                        className={`w-7 h-7 flex items-center justify-center rounded-md transition-all group/btn border-2 ${
                          isAdmin 
                            ? (task.waitingApproval ? 'bg-blue-600 animate-bounce border-blue-400' : 'bg-green-600 hover:bg-green-700 border-green-400') 
                            : (task.waitingApproval ? 'bg-green-500 cursor-default opacity-50' : 'bg-green-600 hover:bg-green-700 border-green-400')
                        } text-white`}
                      >
                        <CheckCircle2 size={18} strokeWidth={3} className={`${task.waitingApproval ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
                        <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XONG</span></span>
                      </button>
                    )}

                    {/* TRẠNG THÁI: PENDING - NÚT DUYỆT */}
                    {task.status === 'PENDING' && canApprove && (
                      <button 
                        onClick={handleApprove}
                        className="w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 transition-all group/btn border-2 border-green-400"
                        title="DUYỆT"
                      >
                        <CheckCircle2 size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                        <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">DUYỆT</span></span>
                      </button>
                    )}

                    {/* TRẠNG THÁI: AWAITING_CONFIRMATION - NÚT XÁC NHẬN */}
                    {task.status === 'AWAITING_CONFIRMATION' && isManager && (
                      <button 
                        onClick={() => handleConfirmTask(true)}
                        title="XÁC NHẬN"
                        className="w-7 h-7 flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 transition-all group/btn border-2 border-green-400"
                      >
                        <ThumbsUp size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                        <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XÁC NHẬN</span></span>
                      </button>
                    )}
                  </>
                )}

                {/* 2. VIEW DETAILS BUTTON (HISTORY) - NOW SECOND POSITION */}
                <button 
                  onClick={() => onViewHistory(task.id)}
                  title="XEM CHI TIẾT CẬP NHẬT"
                  className="w-7 h-7 flex items-center justify-center bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-all group/btn border border-blue-400"
                >
                  <History size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                  <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XEM CHI TIẾT CẬP NHẬT</span></span>
                </button>

                {/* NÚT HOÀN TÁC CÔNG VIỆC CHO ADMIN TẠI CÔNG ĐOẠN TRƯỚC ĐÓ */}
                {isAdmin && (task.status === 'APPROVED' || task.waitingApproval) && (
                  <button 
                    onClick={() => {
                      if (isRecurringTask) {
                        showRedAlert();
                        return;
                      }
                      setConfirmModal({
                        show: true,
                        title: <span translate="no" className="notranslate">HOÀN TÁC CÔNG VIỆC</span>,
                        message: <span translate="no" className="notranslate">{`Bạn muốn hoàn tác công việc này về ${task.waitingApproval ? 'BẢNG CÔNG VIỆC' : 'MỤC ĐỀ XUẤT MỚI'}?`}</span>,
                        onConfirm: () => {
                          if (task.waitingApproval) {
                            // Trình Duyệt -> Bảng Công Việc (Cảng công việc)
                            onUpdate(task.id, { 
                              status: 'APPROVED', 
                              waitingApproval: false,
                              isNewInBoard: true,
                              updatedAt: new Date().toISOString(),
                              currentUpdate: '[HOÀN TÁC] Quay lại Bảng Công Việc'
                            });
                            if (onNavigate) onNavigate('tasks');
                          } else {
                            // Bảng Công Việc -> Đề xuất mới
                            onUpdate(task.id, { 
                              status: 'PENDING',
                              waitingApproval: false,
                              updatedAt: new Date().toISOString(),
                              currentUpdate: '[HOÀN TÁC] Quay lại mục Đề xuất mới'
                            });
                          }
                          setConfirmModal((p: any) => ({ ...p, show: false }));
                        }
                      });
                    }}
                    title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "HOÀN TÁC"}
                    className={`w-7 h-7 flex items-center justify-center bg-blue-600 text-white border-2 border-blue-400 rounded-md hover:bg-blue-700 transition-all group/btn shadow-sm ${isRecurringTask ? 'opacity-30' : ''}`}
                  >
                    <RotateCcw size={16} strokeWidth={3} className="group-hover:-rotate-45 transition-transform" />
                    <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">HOÀN TÁC</span></span>
                  </button>
                )}

                {/* REST OF THE BUTTONS */}
                {!isReadOnly && (
                  <>
                     {/* THÙNG RÁC: Trạng thái DELETED hoặc có deletedAt */}
                     {(task.status === 'DELETED' || !!task.deletedAt) ? (
                       <div className="flex flex-col gap-1.5 w-full items-center">
                         <button 
                           onClick={() => {
                             if (isRecurringTask) {
                               showRedAlert();
                               return;
                             }
                             if (isAdmin) {
                               onUpdate(task.id, { 
                                 status: 'PENDING', 
                                 deletedAt: null,
                                 updatedAt: new Date().toISOString()
                               });
                             } else if (onRestore) {
                               onRestore(task.id);
                             }
                           }}
                           title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "PHỤC HỒI"}
                           className={`w-7 h-7 flex items-center justify-center bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all group/btn border-2 border-emerald-400 ${isRecurringTask ? 'opacity-30' : ''}`}
                         >
                           <RotateCcw size={16} strokeWidth={3} className="group-hover:rotate-45 transition-transform" />
                                                      <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">PHỤC HỒI</span></span>
                         </button>
                        
                        {isAdmin && (
                          <button 
                            onClick={() => onDelete && onDelete(task.id)}
                            title="XÓA VĨNH VIỄN"
                            className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                          >
                            <Trash2 size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                                         <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XÓA VĨNH VIỄN</span></span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        {/* KHỐI SỬA CHO PENDING (HIỂN THỊ SAU HISTORY) */}
                        {task.status === 'PENDING' && (
                          <div className="flex flex-col gap-1.5 w-full items-center">
                            {(isManager || isOwner || isAuthor) && (
                              <button 
                                onClick={() => onEdit(task)}
                                className="w-7 h-7 flex items-center justify-center bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-all group/btn border-2 border-emerald-400"
                                title="SỬA"
                              >
                                <Pencil size={16} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                                                <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">SỬA</span></span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* KHỐI HIGHLIGHT CHO APPROVED (HIỂN THỊ SAU HISTORY) */}
                        {task.status === 'APPROVED' && (
                          <div className="flex flex-col gap-1.5 w-full items-center">
                            <div className="relative">
                              <button 
                                onClick={() => setShowColorPicker(!showColorPicker)}
                                title="LƯU Ý"
                                className={`w-7 h-7 flex items-center justify-center rounded-md transition-all border-2 group/btn ${
                                  task.highlightColor || task.isHighlighted
                                    ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-100' 
                                    : 'bg-white text-emerald-600 border-emerald-500 hover:bg-emerald-50'
                                }`}
                              >
                                <Tag size={16} strokeWidth={2.5} className="group-hover:rotate-12 transition-transform" />
                                                                <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">LƯU Ý</span></span>
                              </button>
                              
                              <AnimatePresence>
                                {showColorPicker && (
                                  <motion.div 
                                    initial={{ opacity: 0, x: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    exit={{ opacity: 0, x: 10, scale: 0.9 }}
                                    className="absolute right-full mr-2 top-0 bg-white border border-gray-200 rounded-md p-1.5 flex flex-col gap-1.5 z-[100]"
                                  >
                                    {Object.keys(HIGHLIGHT_COLORS).map(color => (
                                      <button
                                        key={color}
                                        onClick={() => {
                                          onUpdate(task.id, { highlightColor: color, isHighlighted: true });
                                          setShowColorPicker(false);
                                        }}
                                        className={`w-6 h-6 rounded-md border border-gray-200 transition-transform hover:scale-125 ${HIGHLIGHT_COLORS[color].split(' ')[0]}`}
                                      />
                                    ))}
                                    <button
                                      onClick={() => {
                                        onUpdate(task.id, { highlightColor: null, isHighlighted: false });
                                        setShowColorPicker(false);
                                      }}
                                      className="w-6 h-6 rounded-md border border-gray-300 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 transition-colors"
                                    >
                                      <X size={12} strokeWidth={3} />
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        )}

                        {/* HIỂN THỊ NÚT XÓA: ADMIN HOẶC STAFF TẠI ĐỀ XUẤT MỚI */}
                        {(isAdmin || (task.status === 'PENDING' && isOwner)) && (
                          <button 
                            onClick={() => onDelete(task.id)}
                            className="w-7 h-7 flex items-center justify-center bg-red-600 text-white rounded-md hover:bg-red-700 transition-all border-2 border-red-400 group/btn"
                            title="XÓA"
                          >
                            <Trash2 size={18} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
                                                        <span className="sr-only notranslate" translate="no"><span translate="no" className="notranslate">XÓA</span></span>
                          </button>
                        )}

                        {/* HOÀN TÁC CÔNG VIỆC TỪ COMPLETED (TRONG TRƯỜNG HỢP ADMIN XEM BẢNG CHÍNH NHƯNG CÓ VIỆC COMPLETED) */}
                        {task.status === 'COMPLETED' && isAdmin && (
                          <button 
                            onClick={() => {
                              if (isRecurringTask) {
                                showRedAlert();
                                return;
                              }
                              setConfirmModal({
                                show: true,
                                title: <span translate="no" className="notranslate">HOÀN TÁC CÔNG VIỆC</span>,
                                message: <span translate="no" className="notranslate">Bạn muốn chuyển công việc này quay lại mục Trình Duyệt (Chờ duyệt)?</span>,
                                onConfirm: () => {
                                  onUpdate(task.id, { 
                                    status: 'APPROVED', 
                                    waitingApproval: true,
                                    actualEndDate: null, 
                                    isLocked: false,
                                    currentUpdate: '[HOÀN TÁC] Quay lại mục Trình Duyệt'
                                  });
                                  setConfirmModal((p: any) => ({ ...p, show: false }));
                                }
                              });
                            }}
                            title={isRecurringTask ? "CẤM HOÀN TÁC VIỆC ĐỊNH KỲ" : "HOÀN TÁC"}
                            className={`w-7 h-7 flex items-center justify-center bg-gray-100 text-gray-600 border-2 border-gray-200 rounded-md hover:bg-gray-200 transition-all group/btn ${isRecurringTask ? 'opacity-30' : ''}`}
                          >
                            <RotateCcw size={16} strokeWidth={3} className="group-hover:rotate-45 transition-transform" />
                            <span className="sr-only notranslate" translate="no">HOÀN TÁC</span>
                          </button>
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center gap-1 opacity-20 grayscale brightness-75">
                <Eye size={18} className="text-gray-400" />
                <span translate="no" className="notranslate text-[7px] font-black uppercase text-gray-400 tracking-tighter">VIEW ONLY</span>
              </div>
            )}
            
            <AnimatePresence>
              {showQCDModal && (
                <Portal>
                  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50" onClick={(e) => e.stopPropagation()}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowQCDModal(false)} />
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[86vh] overflow-y-auto border border-gray-100"
                    >
                      <div className="p-2 border-b border-gray-50 bg-slate-50">
                        <div className="flex justify-between items-center mb-2 px-1">
                          <h3 className="font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <CheckCircle className="text-blue-600" size={20} />
                            <span translate="no" className="notranslate uppercase text-base">
                              {isAdmin ? <span translate="no" className="notranslate">PHÊ DUYỆT HOÀN THÀNH (Q-C-D)</span> : <span translate="no" className="notranslate">TỰ ĐÁNH GIÁ CHẤT LƯỢNG (Q-C-D)</span>}
                            </span>
                          </h3>
                          <button onClick={() => setShowQCDModal(false)} className="p-1 hover:bg-white rounded-full transition-colors">
                            <X size={20} className="text-gray-400" />
                          </button>
                        </div>

                        <div className="bg-white/80 p-2 rounded-lg border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                            <div className="space-y-0.5">
                              <p translate="no" className="notranslate text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                <span translate="no" className="notranslate">CÔNG VIỆC</span>
                              </p>
                              <p translate="no" className="notranslate font-black text-blue-900 text-sm uppercase leading-tight">
                                <span translate="no" className="notranslate">{task.title}</span>
                              </p>
                            </div>
                            <div className="space-y-0.5">
                              <p translate="no" className="notranslate text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                <span translate="no" className="notranslate">NGƯỜI THỰC HIỆN</span>
                              </p>
                              <p translate="no" className="notranslate font-black text-gray-700 text-sm uppercase">
                                <span translate="no" className="notranslate">{assigneeName}</span>
                              </p>
                            </div>
                        </div>
                      </div>

                      <div className="p-3 space-y-3">
                        {/* QUY CHUẨN ĐÁNH GIÁ (COLLAPSIBLE) */}
                        <div className="bg-blue-50/50 rounded-lg border border-blue-100 overflow-hidden">
                          <button 
                            onClick={() => setOpenGuide(openGuide === 'all' ? null : 'all')}
                            className="w-full p-2 flex items-center justify-between hover:bg-blue-100/50 transition-colors"
                          >
                            <h4 className="text-[10px] font-black text-blue-800 flex items-center gap-2 uppercase tracking-widest">
                              <Tag size={14} className="text-blue-600" />
                              <span translate="no" className="notranslate">QUY CHUẨN ĐÁNH GIÁ</span>
                            </h4>
                            <RefreshCw size={12} className={`text-blue-400 transition-transform duration-300 ${openGuide === 'all' ? 'rotate-180' : ''}`} />
                          </button>
                          
                          <AnimatePresence>
                            {openGuide === 'all' && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-3 pb-3 space-y-2"
                              >
                                {[
                                  { lv: 'M5', label: 'XUẤT SẮC', desc: 'Hoàn thành tốt nhiệm vụ; Có ứng dụng AI hoặc Sáng kiến giúp công việc nhanh hơn, nhàn hơn rõ rệt; Được cấp trên khen ngợi.' },
                                  { lv: 'M4', label: 'TỐT', desc: 'Hoàn thành đúng hạn; Kết quả sạch sẽ, ít sai sót; Có ý thức sắp xếp công việc khoa học.' },
                                  { lv: 'M3', label: 'ĐẠT', desc: 'Hoàn thành đầy đủ công việc được giao; Đúng tiến độ; Đạt yêu cầu chất lượng cơ bản (Đây là mức 100% theo yêu cầu của công ty).' },
                                  { lv: 'M2', label: 'CẦN CỐ GẮNG', desc: 'Công việc còn chút sai sót nhỏ phải nhắc nhở; Trễ hạn nhưng không ảnh hưởng nghiêm trọng.' },
                                  { lv: 'M1', label: 'KÉM', desc: 'Không hoàn thành việc; Sai sót gây hậu quả phải xử lý lại; Thiếu trách nhiệm trong tác nghiệp.' }
                                ].map((item, i) => (
                                  <div key={i} className="flex items-start gap-2 p-1.5 rounded-md border border-blue-100 bg-white shadow-sm">
                                    <span translate="no" className="notranslate text-[9px] font-black text-blue-700 min-w-[35px]">
                                      <span translate="no" className="notranslate">{item.lv}</span>
                                    </span>
                                    <p translate="no" className="notranslate text-[10px] font-medium leading-tight text-slate-700">
                                      <span translate="no" className="notranslate font-black text-blue-800">{item.label}: </span>
                                      <span translate="no" className="notranslate">{item.desc}</span>
                                    </p>
                                  </div>
                                ))}
                                <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-100 space-y-1">
                                    <p translate="no" className="notranslate text-[9px] font-black text-amber-800 uppercase tracking-widest">
                                        <span translate="no" className="notranslate">GỢI Ý TÁC CHIẾN</span>
                                    </p>
                                    <p translate="no" className="notranslate text-[10px] text-amber-900 leading-tight">
                                        <span translate="no" className="notranslate font-bold">Q (QUALITY): </span>
                                        <span translate="no" className="notranslate">Chỉ cần làm đúng hướng dẫn kỹ thuật, hồ sơ đầy đủ là được điểm 3. Không sai lỗi chính tả/số liệu là điểm 4-5.</span>
                                    </p>
                                    <p translate="no" className="notranslate text-[10px] text-amber-900 leading-tight">
                                        <span translate="no" className="notranslate font-bold">C (COST): </span>
                                        <span translate="no" className="notranslate">Làm xong đúng thời gian quy định là điểm 3. Có dùng thêm công cụ hỗ trợ cho nhanh hơn là điểm 4-5.</span>
                                    </p>
                                    <p translate="no" className="notranslate text-[10px] text-amber-900 leading-tight">
                                        <span translate="no" className="notranslate font-bold">D (DELIVERY): </span>
                                        <span translate="no" className="notranslate">Đúng hạn là điểm 3. Gửi sớm hoặc xử lý linh hoạt cho anh em khác là điểm 4-5.</span>
                                    </p>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <div className="grid grid-cols-2 gap-4 divide-x divide-gray-100">
                          {/* LEFT: STAFF VIEW */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-0.5 pl-1">
                              <UserCircle size={12} className="text-slate-400" />
                              <span translate="no" className="notranslate font-black text-[9px] uppercase tracking-widest text-slate-500">NHÂN VIÊN TỰ CHẤM</span>
                            </div>
                            
                            <div className="space-y-3">
                              {[
                                { label: 'QUALITY', val: staffQ, set: setStaffQ, exp: staffQExp, setExp: setStaffQExp, icon: <Sparkles size={11} className="text-yellow-500" fill="currentColor" />, bgColor: 'bg-amber-50', borderColor: 'border-amber-200', accent: 'amber' },
                                { label: 'COST', val: staffC, set: setStaffC, exp: staffCExp, setExp: setStaffCExp, icon: <Banknote size={11} className="text-emerald-600" />, bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', accent: 'emerald' },
                                { label: 'DELIVERY', val: staffD, set: setStaffD, exp: staffDExp, setExp: setStaffDExp, icon: <Zap size={11} className="text-blue-600" fill="currentColor" />, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', accent: 'blue' }
                              ].map(item => (
                                <div key={item.label} className={`${item.bgColor} p-2 rounded-lg border ${item.borderColor} space-y-2 shadow-sm`}>
                                  <div className="flex justify-between items-center">
                                    <span translate="no" className="notranslate text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-800">
                                      {item.icon} <span translate="no" className="notranslate">{item.label}</span>
                                    </span>
                                    <div className="flex gap-1 items-center">
                                      {canSeeAI && (
                                        <button
                                          type="button"
                                          onClick={() => handleSuggestAI('Staff', item.label as any, item.val, item.setExp)}
                                          disabled={loadingAI === `staff-${item.label}`}
                                          className="mr-2 flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-200 rounded text-[9px] font-black text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                          {loadingAI === `staff-${item.label}` ? (
                                            <>
                                              <RefreshCw size={10} className="animate-spin" />
                                              <span translate="no" className="notranslate uppercase tracking-tighter">ĐANG PHÂN TÍCH CHAT...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span translate="no" className="notranslate">🪄 GỢI Ý AI</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                      {[1, 2, 3, 4, 5].map(v => (
                                        <button
                                          key={v}
                                          type="button"
                                          disabled={!isOwner}
                                          onClick={() => item.set(v)}
                                          className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black border-2 transition-all ${
                                            item.val === v 
                                              ? `bg-${item.accent}-500 text-white border-${item.accent}-600 shadow-sm scale-105` 
                                              : 'bg-white border-white text-slate-400 hover:bg-white/50'
                                          } ${!isOwner ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <span translate="no" className="notranslate">{v}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <textarea 
                                    translate="no"
                                    readOnly={!isOwner}
                                    value={item.exp}
                                    onChange={(e) => item.setExp(e.target.value)}
                                    className={`w-full p-2 bg-white/60 border border-slate-100 rounded-md text-[10px] h-12 resize-none outline-none focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 leading-tight placeholder:text-slate-300 ${!isOwner ? 'cursor-not-allowed' : ''}`}
                                    placeholder="Bằng chứng hoàn thành..." 
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* RIGHT: LEADER VIEW */}
                          <div className="pl-4 space-y-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <Sparkles size={12} className="text-blue-600" />
                              <span translate="no" className="notranslate font-black text-[9px] uppercase tracking-widest text-blue-600">LÃNH ĐẠO PHÊ DUYỆT</span>
                            </div>

                            <div className="space-y-3">
                              {[
                                { label: 'QUALITY', val: leaderQ, set: setLeaderQ, comment: leaderQComment, setComment: setLeaderQComment, bgColor: 'bg-amber-50', borderColor: 'border-amber-200', activeColor: 'bg-amber-500', textColor: 'text-amber-700', activeBorder: 'border-amber-600', icon: <Sparkles size={11} className="text-yellow-500" fill="currentColor" /> },
                                { label: 'COST', val: leaderC, set: setLeaderC, comment: leaderCComment, setComment: setLeaderCComment, bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', activeColor: 'bg-emerald-500', textColor: 'text-emerald-700', activeBorder: 'border-emerald-600', icon: <Banknote size={11} className="text-emerald-600" /> },
                                { label: 'DELIVERY', val: leaderD, set: setLeaderD, comment: leaderDComment, setComment: setLeaderDComment, bgColor: 'bg-blue-50', borderColor: 'border-blue-200', activeColor: 'bg-blue-600', textColor: 'text-blue-700', activeBorder: 'border-blue-700', icon: <Zap size={11} className="text-blue-600" fill="currentColor" /> }
                              ].map(item => (
                                <div key={item.label} className={`${item.bgColor} p-2 rounded-lg border ${item.borderColor} space-y-2 shadow-sm`}>
                                  <div className="flex justify-between items-center">
                                    <div className="flex flex-col">
                                      <span translate="no" className="notranslate text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 text-slate-800">
                                          {item.icon} <span translate="no" className="notranslate">{item.label}</span>
                                      </span>
                                      <span translate="no" className="notranslate text-[7px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <span translate="no" className="notranslate">PHÊ DUYỆT</span>
                                      </span>
                                    </div>
                                    <div className="flex gap-1 items-center">
                                      {canSeeAI && (
                                        <button
                                          type="button"
                                          onClick={() => handleSuggestAI('Admin', item.label as any, item.val, item.setComment)}
                                          disabled={loadingAI === `admin-${item.label}`}
                                          className="mr-2 flex items-center gap-1.5 px-2 py-1 bg-white border border-blue-200 rounded text-[9px] font-black text-blue-600 hover:bg-blue-50 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                        >
                                          {loadingAI === `admin-${item.label}` ? (
                                            <>
                                              <RefreshCw size={10} className="animate-spin" />
                                              <span translate="no" className="notranslate uppercase tracking-tighter">ĐANG PHÂN TÍCH CHAT...</span>
                                            </>
                                          ) : (
                                            <>
                                              <span translate="no" className="notranslate">🪄 GỢI Ý AI</span>
                                            </>
                                          )}
                                        </button>
                                      )}
                                      {[1, 2, 3, 4, 5].map(v => (
                                        <button
                                          key={v}
                                          type="button"
                                          disabled={!isAdmin}
                                          onClick={() => item.set(v)}
                                          className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-black transition-all ${
                                            item.val === v 
                                              ? `${item.activeColor} text-white shadow-sm border-2 ${item.activeBorder} scale-105` 
                                              : `bg-white border border-slate-100 ${item.textColor} hover:bg-slate-50`
                                          } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                          <span translate="no" className="notranslate">{v}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <textarea
                                    translate="no"
                                    readOnly={!isAdmin}
                                    value={item.comment}
                                    onChange={(e) => item.setComment(e.target.value)}
                                    className={`w-full p-2 bg-white/60 border border-slate-100 rounded-md text-[10px] h-12 resize-none outline-none focus:ring-2 focus:ring-blue-100 font-medium text-slate-700 leading-tight placeholder:text-slate-300 ${!isAdmin ? 'cursor-not-allowed' : ''}`}
                                    placeholder="Nhận xét của lãnh đạo..."
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="p-2 border-t border-gray-100 bg-slate-50 flex flex-col sm:flex-row gap-3">
                        {isAdmin && isRecurringTask && (
                          <div className="flex items-center gap-3 bg-red-50 px-4 py-2 rounded-lg border border-red-100 flex-1">
                            <span translate="no" className="notranslate text-[10px] font-black text-red-700 uppercase leading-tight">DỪNG LẶP LẠI (KẾT THÚC HOÀN TOÀN CÔNG VIỆC NÀY)</span>
                            <button 
                              type="button"
                              onClick={() => setStopRecurrence(!stopRecurrence)}
                              className={`w-12 h-6 rounded-full relative transition-all duration-300 shadow-inner ${stopRecurrence ? 'bg-red-600' : 'bg-gray-300'}`}
                            >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${stopRecurrence ? 'left-7' : 'left-1'}`} />
                            </button>
                          </div>
                        )}
                        <div className="flex gap-3 flex-1">
                          <button 
                            type="button"
                            onClick={() => setShowQCDModal(false)}
                            className="flex-1 h-10 bg-white border-2 border-slate-200 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95 shadow-sm"
                          >
                            <span translate="no" className="notranslate">HỦY BỎ</span>
                          </button>
                          <button 
                            type="button"
                            disabled={isProcessing || (!isAdmin && (!staffQ || !staffC || !staffD || !staffQExp.trim() || !staffCExp.trim() || !staffDExp.trim()))}
                            onClick={isAdmin ? submitLeaderApproval : submitStaffQCD}
                            className={`flex-2 h-10 text-white rounded-lg text-[11px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                              isAdmin && stopRecurrence ? 'bg-red-700 hover:bg-red-800 shadow-red-100' : 'bg-blue-700 hover:bg-blue-800 shadow-blue-100'
                            }`}
                          >
                            {isProcessing ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={16} />
                            )}
                            <span translate="no" className="notranslate uppercase">
                              {isAdmin ? <span translate="no" className="notranslate">XÁC NHẬN PHÊ DUYỆT</span> : <span translate="no" className="notranslate">GỬI HOÀN THÀNH (Q-C-D)</span>}
                            </span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </Portal>
              )}
            </AnimatePresence>
          </div>
        </td>
      </motion.tr>
    );
};
