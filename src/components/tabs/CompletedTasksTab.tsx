import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, User as UserIcon, Users as UsersIcon, Trash2, FileDown, Search, Printer, ExternalLink, X, Sparkles } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { isUserTask, normalizeString, getTaskAssigneeName, isTaskDeleted } from '../../utils/userUtils';
import { getMonthYear } from '../../lib/dateUtils';

interface CompletedTasksTabProps {
  effectiveUser: User;
  presence: any[];
  setShowTaskModal: (show: boolean) => void;
  adminUnreadCount: number;
  onOpenNotifications: () => void;
  viewScope: 'mine' | 'all';
  setViewScope: (scope: 'mine' | 'all') => void;
  tasks: Task[];
  filteredTasks: Task[];
  handleExportExcel: (tasks: Task[]) => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  handlePermanentBulkDelete: () => void;
  allUsers: User[];
  updateTask: any;
  deleteTask: any;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  approveTaskCompletion?: (id: string, modifierName?: string, leaderQCD?: any, stopRecurrence?: boolean) => Promise<void>;
  highlightedTaskId: string | null;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
  search: string;
  setSearch: (s: string) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  selectedMonth?: string;
  onMonthChange?: (m: string) => void;
}

export const CompletedTasksTab: React.FC<CompletedTasksTabProps> = ({
  effectiveUser, presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
  viewScope, setViewScope, tasks, filteredTasks, handleExportExcel, handleImportExcel, selectedTaskIds,
  handleBulkDelete, handlePermanentBulkDelete, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
  updateTaskCommentReactions, setEditingTask, setConfirmModal, approveTaskCompletion,
  highlightedTaskId, toggleTaskSelection, setBulkSelection,
  search, setSearch, markAsRead, lastReadChatTimestamps,
  selectedMonth, onMonthChange
}) => {
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [modalPrintOrient, setModalPrintOrient] = useState<'portrait' | 'landscape'>('landscape');
  const [modalPrintScale, setModalPrintScale] = useState<number>(100);
  const [aiOnly, setAiOnly] = useState(false);

  const urlParams = React.useMemo(() => {
    return typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  }, []);

  const layoutOrient = React.useMemo(() => {
    return urlParams?.get('layout_orient') || modalPrintOrient;
  }, [urlParams, modalPrintOrient]);

  const printScale = React.useMemo(() => {
    return Number(urlParams?.get('print_scale')) || modalPrintScale;
  }, [urlParams, modalPrintScale]);

  // Auto-detect and run print if the URL has ?print=true
  useEffect(() => {
    if (urlParams?.get('print') === 'true') {
      const timer = setTimeout(() => {
        window.print();
        // Clean up url parameter to avoid continuous printing on page reloads
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('print');
        newUrl.searchParams.delete('layout_orient');
        newUrl.searchParams.delete('print_scale');
        window.history.replaceState({}, '', newUrl.toString());
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [urlParams]);

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handleOpenNewTabToPrint = () => {
    const isIframe = window.self !== window.top;
    if (isIframe) {
      const printUrl = new URL(window.location.origin + window.location.pathname);
      printUrl.searchParams.set('tab', 'completed_tasks');
      printUrl.searchParams.set('print', 'true');
      printUrl.searchParams.set('layout_orient', modalPrintOrient);
      printUrl.searchParams.set('print_scale', modalPrintScale.toString());
      window.open(printUrl.toString(), '_blank');
      setShowPrintModal(false);
    } else {
      setShowPrintModal(false);
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const getTasksToDisplay = () => {
    let combined = tasks.filter(t => (t.status === "COMPLETED" || t.status === "Hoàn thành") && !t.waitingApproval && !isTaskDeleted(t) && !t.isCycleRecord);
    
    if (aiOnly) {
      combined = combined.filter(t => t.aiApplied === true);
    }
    
    // Search Filtering
    if (search) {
      const term = normalizeString(search);
      combined = combined.filter(t => {
        const assigneeName = getTaskAssigneeName(t, allUsers);
        
        const recurrenceVN = t.recurrence === 'DAILY' ? 'Hàng ngày' 
          : t.recurrence === 'WEEKLY' ? 'Hàng tuần'
          : t.recurrence === 'BI_WEEKLY' ? 'Hàng 2 tuần'
          : t.recurrence === 'TRI_WEEKLY' ? 'Hàng 3 tuần'
          : t.recurrence === 'TRI_DAILY' ? 'Hàng 3 ngày'
          : t.recurrence === 'MONTHLY' ? 'Hàng tháng'
          : 'Không lặp';

        const formatDate = (dateStr: any) => {
          if (!dateStr) return '';
          const s = typeof dateStr === 'string' ? dateStr : (dateStr as any).toISOString?.() || '';
          const match = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (match) {
            const [_, y, m, d] = match;
            return `${d}/${m}/${y.substring(2)} ${d}/${m}/${y}`;
          }
          return s;
        };

        const searchableFields = [
          t.code,
          assigneeName,
          t.category,
          t.title,
          t.objective,
          t.currentUpdate,
          formatDate(t.issueDate),
          formatDate(t.startDate),
          formatDate(t.expectedEndDate),
          formatDate(t.dueDate),
          formatDate(t.extensionDate),
          formatDate(t.actualEndDate),
          recurrenceVN,
          //@ts-ignore
          typeof t.kpiEfficiency === 'number' ? t.kpiEfficiency.toString() : t.kpiEfficiency
        ];
        return searchableFields.some(f => normalizeString(f || '').includes(term));
      });
    }

    if (viewScope === 'mine') {
      combined = combined.filter(t => isUserTask(t, effectiveUser));
    }

    // Month Filtering
    if (selectedMonth && selectedMonth !== 'all') {
      combined = combined.filter(t => getMonthYear(t.actualEndDate) === selectedMonth);
    }

    return combined.sort((a, b) => new Date(b.actualEndDate || 0).getTime() - new Date(a.actualEndDate || 0).getTime());
  };

  const tasksToDisplay = getTasksToDisplay();

  return (
    <motion.div key="completed" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-col">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 ${layoutOrient === 'portrait' ? 'portrait' : 'landscape'} !important;
            margin: 0.4cm !important;
          }
          body, html, #root, main, .min-h-screen {
            background: white !important;
            color: black !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #root {
            transform: scale(${printScale / 100}) !important;
            transform-origin: top left !important;
            width: ${100 / (printScale / 100)}% !important;
            height: auto !important;
            overflow: visible !important;
            display: block !important;
          }
          .print\\:hidden, 
          button, 
          header:not(.print-header), 
          .no-print,
          .fixed,
          nav,
          aside {
            display: none !important;
          }
          .grid {
            display: grid !important;
          }
          .recharts-wrapper, svg {
            max-width: 100% !important;
            overflow: visible !important;
          }
          tr,
          .recharts-wrapper,
          .print-avoid-break {
            break-inside: avoid-page !important;
            page-break-inside: avoid !important;
          }
        }
      `}} />
      <HolidayBanner />
      <div className="z-40">
        <Header 
          title={<span translate="no" className="notranslate">CÔNG VIỆC HOÀN THÀNH</span>} 
          onAction={() => setShowTaskModal(true)}
          actionLabel={<span translate="no" className="notranslate">TẠO MỚI</span>}
          actionIcon={Plus}
          onlineUsers={presence} 
          currentUserId={effectiveUser.id}
          adminUnreadCount={adminUnreadCount}
          onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
        />
      </div>
      <div className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
            <button
              onClick={() => setViewScope("mine")}
              className={`px-2 py-1.5 xs:px-4 xs:py-2 rounded-lg text-[9px] xs:text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1 shrink-0 whitespace-nowrap outline-none ${
                viewScope === "mine" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserIcon size={12} className="shrink-0" />
              <span translate="no" className="notranslate">CÁ NHÂN ({tasksToDisplay.filter(t => isUserTask(t, effectiveUser)).length})</span>
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-2 py-1.5 xs:px-4 xs:py-2 rounded-lg text-[9px] xs:text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1 shrink-0 whitespace-nowrap outline-none ${
                viewScope === "all" ? "bg-white text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UsersIcon size={12} className="shrink-0" />
              <span translate="no" className="notranslate">P.QLCL ({tasksToDisplay.length})</span>
            </button>
          </div>
        </div>
        <StatsSummary 
          tasks={tasks} 
          selectedMonth={selectedMonth}
          onMonthChange={onMonthChange}
        />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 mt-6">
          <h3 className="text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <div className="w-1.5 h-6 bg-green-600 rounded-full" />
            <span translate="no" className="notranslate">KẾT QUẢ CÔNG VIỆC HOÀN THÀNH</span>
          </h3>
          <div className="flex items-center gap-3 ml-auto md:ml-0">
            {(search || aiOnly) && (
              <span translate="no" className="notranslate text-[11px] font-black text-purple-700 bg-purple-50 px-2.5 py-1.5 rounded-lg border border-purple-200 shadow-xs animate-in zoom-in-95 duration-200 flex items-center gap-1.5 shrink-0 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-ping" />
                TỔNG KẾT QUẢ: {tasksToDisplay.length}
              </span>
            )}
            <div className="relative group flex items-center">
              <Search className="absolute left-3 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm nhanh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-10 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-green-500 text-xs w-44 md:w-56 placeholder:notranslate transition-all group-focus-within:border-green-400 group-focus-within:shadow-sm shadow-sm"
              />
              <button
                type="button"
                onClick={() => setAiOnly(prev => !prev)}
                className={`absolute right-2 px-1 py-1 rounded transition-all cursor-pointer ${
                  aiOnly
                    ? "text-purple-600 bg-purple-100 hover:bg-purple-200 shadow-xs"
                    : "text-gray-300 hover:text-purple-500 hover:bg-gray-100"
                }`}
                title="Lọc công việc ứng dụng AI"
              >
                <Sparkles size={13} className={aiOnly ? "animate-pulse" : ""} />
              </button>
            </div>

            <button
              onClick={handlePrintClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 rounded-lg text-[10px] font-black tracking-wider shadow-sm hover:shadow active:scale-95 transition-all uppercase flex-shrink-0 print:hidden"
              title="In/Xuất danh sách công việc ra PDF"
            >
              <Printer size={12} strokeWidth={3} />
              <span translate="no" className="notranslate">In PDF</span>
            </button>

            {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
              <div className="hidden md:flex items-center gap-2">
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all uppercase shadow-sm cursor-pointer shadow-blue-200">
                  <FileDown size={12} className="rotate-180" />
                  <span translate="no" className="notranslate">Nhập Excel</span>
                  <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                </label>
                <button
                  onClick={() => handleExportExcel(tasksToDisplay)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-50 transition-all uppercase shadow-sm"
                >
                  <FileDown size={12} />
                  <span translate="no" className="notranslate">Xuất Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>
        {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 px-1 mb-4"
          >
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/80 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-md active:scale-95 border-b-4 border-red-800"
            >
              <Trash2 size={16} strokeWidth={2.5} />
              <span translate="no" className="notranslate">CHUYỂN VÀO THÙNG RÁC ({selectedTaskIds.length})</span>
            </button>
            <button
              onClick={handlePermanentBulkDelete}
              className="flex items-center gap-2 px-4 py-2 bg-red-800 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-900 transition-all shadow-lg active:scale-95 border-b-4 border-black/30"
            >
              <Trash2 size={16} strokeWidth={2.5} />
              <span translate="no" className="notranslate">XÓA CƯỠNG BỨC ({selectedTaskIds.length})</span>
            </button>
          </motion.div>
        )}

        <TaskList
          tasks={tasksToDisplay} 
          user={effectiveUser} users={allUsers}
          onUpdate={updateTask} onDelete={deleteTask} onViewHistory={(id) => setShowHistoryModal(id.split('_cycle_')[0])}
          onOpenChat={(id) => setShowChatModal(id.split('_cycle_')[0])} showChatModal={showChatModal} onSendMessage={addTaskComment}
          onReact={updateTaskCommentReactions} onEdit={setEditingTask} setConfirmModal={setConfirmModal}
          approveTaskCompletion={approveTaskCompletion}
          type="completed" highlightedTaskId={highlightedTaskId}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onBulkSelect={setBulkSelection}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
        />
      </div>

      <AnimatePresence>
        {showPrintModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in duration-200">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 relative overflow-hidden text-left"
            >
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />
              
              <button 
                onClick={() => setShowPrintModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 mb-4 animate-bounce">
                  <Printer size={24} strokeWidth={2.5} />
                </div>

                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">
                  CẤU HÌNH IN FILE PDF
                </h3>
                
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed mb-4 px-1">
                  Chọn khổ giấy và tỷ lệ co giãn để trang in được tối ưu kích thước, các bảng biểu rộng dọc đều hiển thị trọn vẹn:
                </p>

                {/* Print Layout and Orientation Preferences */}
                <div className="w-full text-left space-y-3 mb-5">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">KHỔ GIẤY IN:</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setModalPrintOrient('portrait')}
                        className={`py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${modalPrintOrient === 'portrait' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        Khổ Đứng (Portrait)
                      </button>
                      <button
                        type="button"
                        onClick={() => setModalPrintOrient('landscape')}
                        className={`py-1.5 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all border ${modalPrintOrient === 'landscape' ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      >
                        Khổ Ngang (Landscape)
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">TỶ LỆ CO GIÃN (CHỐNG TRÀN TRANG):</span>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[100, 95, 90, 85, 80, 75, 70, 60].map((scaleVal) => (
                        <button
                          key={scaleVal}
                          type="button"
                          onClick={() => setModalPrintScale(scaleVal)}
                          className={`py-1.5 rounded-xl text-[9px] font-black transition-all border ${modalPrintScale === scaleVal ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                        >
                          {scaleVal}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full space-y-2 mb-5 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-[10px] text-left">
                  <div className="flex gap-2 items-start">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">1</span>
                    <span className="text-slate-600 font-medium">
                      {window.self !== window.top ? (
                        <>Bấm <strong className="text-slate-800">MỞ TRANG IN ↗</strong> bên dưới để mở app ở tab riêng biệt.</>
                      ) : (
                        <>Bấm <strong className="text-slate-800">BẮT ĐẦU IN 🖨️</strong> bên dưới.</>
                      )}
                    </span>
                  </div>
                  <div className="flex gap-2 items-start">
                    <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">2</span>
                    <span className="text-slate-600 font-medium">Giao diện in sẽ tự động áp dụng khổ giấy {modalPrintOrient === 'portrait' ? 'Dọc' : 'Ngang'} và tỷ lệ {modalPrintScale}% vô cùng xuất sắc.</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setShowPrintModal(false)}
                    className="flex-1 h-9 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                  >
                    HỦY
                  </button>
                  <button
                    onClick={handleOpenNewTabToPrint}
                    className="flex-[2] h-9 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-200 hover:shadow active:scale-95 transition-all"
                  >
                    {window.self !== window.top ? (
                      <>
                        <ExternalLink size={12} strokeWidth={2.5} />
                        MỞ TRANG IN ↗
                      </>
                    ) : (
                      <>
                        <span>BẮT ĐẦU IN 🖨️</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
