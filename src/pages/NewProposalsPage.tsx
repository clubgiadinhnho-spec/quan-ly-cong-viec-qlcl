import React, { useState, useMemo, useEffect } from 'react';
import { Task, User } from '../types';
import { TaskList } from '../components/tasks/TaskList';
import { Search, Sparkles, CheckCircle2, Trash2, FileDown, Printer, ExternalLink, X } from 'lucide-react';
import { normalizeString, getTaskAssigneeName, isTaskDeleted } from '../utils/userUtils';
import { AnimatePresence, motion } from 'motion/react';

interface NewProposalsPageProps {
  tasks: Task[];
  currentUser: User;
  allUsers: User[];
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setShowHistoryModal: (id: string | null) => void;
  setShowChatModal: (id: string | null) => void;
  showChatModal: string | null;
  addTaskComment: any;
  updateTaskCommentReactions: any;
  setEditingTask: (t: Task | null) => void;
  setConfirmModal: (m: any) => void;
  createNotification: any;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onBulkSelect?: (ids: string[], select: boolean) => void;
  approveTasksBulk?: (ids: string[], modifierName: string) => Promise<boolean>;
  onBulkDelete?: () => void;
  onOpenCategoryManagement?: () => void;
  handleExportExcel: (tasks: Task[]) => void;
  handleImportExcel: (e: React.ChangeEvent<HTMLInputElement>) => void;
  search: string;
  setSearch: (s: string) => void;
  markAsRead: (id: string) => void;
  lastReadChatTimestamps: Record<string, number>;
  presence: any[];
}

export const NewProposalsPage: React.FC<NewProposalsPageProps> = ({
  tasks, currentUser, allUsers, updateTask, deleteTask,
  setShowHistoryModal, setShowChatModal, showChatModal,
  addTaskComment, updateTaskCommentReactions, setEditingTask, setConfirmModal,
  createNotification,
  selectedIds = [],
  onToggleSelect,
  onBulkSelect,
  approveTasksBulk,
  onBulkDelete,
  onOpenCategoryManagement,
  handleExportExcel,
  handleImportExcel,
  search,
  setSearch,
  markAsRead,
  lastReadChatTimestamps,
  presence
}) => {
  const isManager = currentUser.role === 'Admin' || !!currentUser.delegatedPermissions?.canApproveTask;
  const isAdmin = currentUser.role === 'Admin';

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [modalPrintOrient, setModalPrintOrient] = useState<'portrait' | 'landscape'>('landscape');
  const [modalPrintScale, setModalPrintScale] = useState<number>(100);

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
      printUrl.searchParams.set('tab', 'pending_confirmation');
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

  const pendingTasks = useMemo(() => {
    return tasks
      .filter(t => !isTaskDeleted(t) && t.status === 'PENDING' && !t.isCycleRecord)
      .filter(t => {
        if (!search) return true;
        const term = normalizeString(search);
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

        const fields = [
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
          typeof t.kpiEfficiency === 'number' ? t.kpiEfficiency.toString() : t.kpiEfficiency
        ];
        return fields.some(f => normalizeString(f || '').includes(term));
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [tasks, search, isManager, currentUser, allUsers]);

  const handleBulkApprove = () => {
    if (selectedIds.length === 0 || !approveTasksBulk) return;
    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate font-black uppercase">XÁC NHẬN DUYỆT HÀNG LOẠT</span>,
      message: <span translate="no" className="notranslate">{`Bạn đang chọn DUYỆT ${selectedIds.length} mục đề xuất. Bạn có chắc chắn không?`}</span>,
      onConfirm: async () => {
        try {
          await approveTasksBulk(selectedIds, currentUser.name);
          if (onBulkSelect) onBulkSelect(selectedIds, false);
          
          setConfirmModal({
            show: true,
            title: <span translate="no" className="notranslate font-black uppercase">THÀNH CÔNG</span>,
            message: <span translate="no" className="notranslate">Đã phê duyệt {selectedIds.length} đề xuất.</span>,
            onConfirm: async () => {
              setConfirmModal((p: any) => ({ ...p, show: false }));
            }
          });
        } catch (error) {
          alert("Có lỗi xảy ra khi phê duyệt.");
        } finally {
          // Note: We don't close the modal immediately because we show a success modal inside try
        }
      }
    });
  };

  const handleApprove = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setConfirmModal({
      show: true,
      title: <span translate="no" className="notranslate">PHÊ DUYỆT CÔNG VIỆC</span>,
      message: <span translate="no" className="notranslate">{`Bạn chắc chắn muốn DUYỆT công việc ${task.code}? Sau khi duyệt, công việc sẽ xuất hiện tại bảng chính.`}</span>,
      onConfirm: async () => {
        await updateTask(taskId, { 
          status: 'APPROVED' as any,
          isNewSoldier: true,
          history: [
            ...(task.history || []),
            {
              version: (task.history?.length || 0) + 1,
              content: <span translate="no" className="notranslate">{`${currentUser.name} đã duyệt công việc.`}</span> as any,
              timestamp: new Date().toISOString(),
              authorId: currentUser.id
            }
          ]
        });
        setConfirmModal((p: any) => p ? { ...p, show: false } : p);
      }
    });
  };

  return (
    <div className="space-y-6">
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
      <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-inner">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-emerald-900 uppercase tracking-tight leading-none mb-1">
              <span translate="no" className="notranslate">Trạm chờ duyệt đề xuất</span>
            </h2>
            <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">
              {isManager 
                ? <span translate="no" className="notranslate">Vui lòng kiểm duyệt các nội dung công việc mới</span>
                : <span translate="no" className="notranslate">Danh sách đề xuất đang chờ Admin/Leader phê duyệt</span>
              }
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {(isAdmin || currentUser.delegatedPermissions?.newProposals_encode === true) && onOpenCategoryManagement && (
            <button
              onClick={onOpenCategoryManagement}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 border-b-4 border-blue-800"
            >
              <div className="bg-white/20 p-1 rounded-lg">
                <Sparkles size={14} className="text-white" />
              </div>
              <span translate="no" className="notranslate">Mã hóa công việc</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
           <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
             <CheckCircle2 size={14} />
             <span translate="no" className="notranslate">DANH SÁCH {pendingTasks.length} ĐỀ XUẤT</span>
           </h3>
           <div className="flex items-center gap-2">
             {search && (
               <span translate="no" className="notranslate text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 animate-in fade-in slide-in-from-right-1">
                 TÌM THẤY: {pendingTasks.length}
               </span>
             )}
<div className={`relative group mr-2 ${!(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_search !== false) ? "hidden" : ""}`}>
              {!(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_search !== false) ? null : <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />}
              <input
                type="text"
                placeholder={!(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_search !== false) ? "" : "Tìm kiếm mã, nội dung, nhân sự, ngày khởi tạo, ngày bắt đầu, hạn hoàn thành, Gia hạn, chu kỳ lặp lại..."}
                value={!(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_search !== false) ? "" : search}
                onChange={(e) => setSearch(e.target.value)}
                className={`pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-emerald-500 text-xs w-64 placeholder:notranslate transition-all group-focus-within:border-emerald-400 group-focus-within:shadow-sm shadow-sm ${!(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_search !== false) ? "hidden" : ""}`}
              />
            </div>

            <button
              onClick={handlePrintClick}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 rounded-lg text-[10px] font-black tracking-wider shadow-sm hover:shadow active:scale-95 transition-all uppercase flex-shrink-0 print:hidden"
              title="In/Xuất danh sách công việc ra PDF"
            >
              <Printer size={12} strokeWidth={3} />
              <span translate="no" className="notranslate">In PDF</span>
            </button>

             {(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_importExcel === true || currentUser.delegatedPermissions?.newProposals_exportExcel === true) && (
                <div className="hidden md:flex items-center gap-2">
                  {(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_importExcel === true) && (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all uppercase shadow-sm cursor-pointer shadow-blue-200">
                      <FileDown size={12} className="rotate-180" />
                      <span translate="no" className="notranslate">Nhập Excel</span>
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                    </label>
                  )}
                  {(currentUser.role === "Admin" || currentUser.delegatedPermissions?.newProposals_exportExcel === true) && (
                    <button
                      onClick={() => handleExportExcel(pendingTasks)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-50 transition-all uppercase shadow-sm"
                    >
                      <FileDown size={12} />
                      <span translate="no" className="notranslate">Xuất Excel</span>
                    </button>
                  )}
                </div>
              )}
             {isManager && selectedIds.length > 0 && (
               <div className="flex items-center gap-2">
                 <button
                   onClick={handleBulkApprove}
                   className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 border-b-4 border-blue-800"
                 >
                   <CheckCircle2 size={16} strokeWidth={2.5} />
                   <span translate="no" className="notranslate">DUYỆT ĐÃ CHỌN ({selectedIds.length})</span>
                 </button>
                 {onBulkDelete && (
                   <button
                     onClick={onBulkDelete}
                     className="flex items-center gap-2 px-6 py-2.5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95 border-b-4 border-red-800"
                   >
                     <Trash2 size={16} strokeWidth={2.5} />
                     <span translate="no" className="notranslate">XÓA ĐÃ CHỌN</span>
                   </button>
                 )}
               </div>
             )}
           </div>
        </div>
        
        <TaskList
          tasks={pendingTasks}
          user={currentUser}
          users={allUsers}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onViewHistory={setShowHistoryModal}
          onOpenChat={setShowChatModal}
          showChatModal={showChatModal}
          onSendMessage={addTaskComment}
          onReact={updateTaskCommentReactions}
          onEdit={setEditingTask}
          setConfirmModal={setConfirmModal}
          type="active"
          isReadOnly={false}
          isUpdateReadOnly={true}
          onApprove={isManager ? handleApprove : undefined}
          createNotification={createNotification}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
          onBulkSelect={onBulkSelect}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
          presence={presence}
        />
      </div>

      {pendingTasks.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-gray-400 space-y-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <Sparkles size={32} className="opacity-20" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest opacity-50">
            <span translate="no" className="notranslate">KHÔNG CÓ ĐỀ XUẤT NÀO ĐANG CHỜ</span>
          </p>
        </div>
      )}

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
    </div>
  );
};
