import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, User as UserIcon, Users as UsersIcon, FileDown, FileUp, Search, Trash2, Printer, ExternalLink, X } from 'lucide-react';
import { User, Task } from '../../types';
import { Header } from '../layout/Header';
import { HolidayBanner } from '../layout/HolidayBanner';
import { StatsSummary } from '../dashboard/StatsSummary';
import { TaskList } from '../tasks/TaskList';
import { downloadSampleExcel } from '../../utils/excelUtils';

import { useAuthContext } from '../../contexts/AuthContext';
import { useTaskContext } from '../../contexts/TaskContext';

interface TasksTabProps {
  // Most props are now handled via context
  selectedTaskIds: string[];
  handleBulkDelete: () => void;
  toggleTaskSelection: (taskId: string) => void;
  setBulkSelection: (ids: string[], select: boolean) => void;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  selectedTaskIds,
  handleBulkDelete,
  toggleTaskSelection,
  setBulkSelection
}) => {
  const { effectiveUser, allUsers } = useAuthContext();
  const {
    presence, setShowTaskModal, adminUnreadCount, onOpenNotifications,
    sortedTasks, search, setSearch, viewScope, setViewScope, counts,
    handleExportExcel, handleImportExcel, updateTask, deleteTask,
    setShowHistoryModal, setShowChatModal, showChatModal, addTaskComment,
    updateTaskCommentReactions, setEditingTask, setConfirmModal,
    approveTaskCompletion, setActiveTab, highlightedTaskId,
    createNotification, markAsRead, lastReadChatTimestamps,
    selectedMonth, onMonthChange, tasks,
    sendAiMessage, triggerAiNudge, resetTaskAIStatus, aiMessages,
    supState, togglePatrol
  } = useTaskContext();

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
      printUrl.searchParams.set('tab', 'tasks');
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

  const myActiveCount = counts.mine;
  const allActiveCount = counts.allActive;

  return (
    <motion.div
      key="tasks"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col"
    >
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
      <div className="print:hidden">
        <HolidayBanner />
      </div>
      <div className="z-40 print:hidden">
        <Header
          title={<span translate="no" className="notranslate">BẢNG CÔNG VIỆC</span>}
          badge={<span translate="no" className="notranslate">{effectiveUser.role}</span>}
          onAction={() => setShowTaskModal(true)}
          actionLabel={<span translate="no" className="notranslate">TẠO MỚI</span>}
          actionIcon={Plus}
          onlineUsers={presence}
          currentUserId={effectiveUser.id}
          adminUnreadCount={adminUnreadCount}
          onOpenNotifications={effectiveUser.role === 'Admin' ? onOpenNotifications : undefined}
        />
      </div>

      <div className="p-4 space-y-4 print:p-0 print:space-y-0">
        <div className="print:hidden">
          <StatsSummary 
            tasks={tasks} 
            selectedMonth={selectedMonth}
            onMonthChange={onMonthChange}
          />
        </div>

        <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-200 shadow-sm transition-all duration-300 print:hidden overflow-hidden">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-shrink-0">
            <button
              onClick={() => setViewScope("mine")}
              className={`px-2 py-1.5 xs:px-4 xs:py-2 rounded-lg text-[9px] xs:text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1 shrink-0 whitespace-nowrap outline-none ${
                viewScope === "mine" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UserIcon size={12} className="shrink-0" />
              <span translate="no" className="notranslate">CÁ NHÂN ({myActiveCount})</span>
            </button>
            <button
              onClick={() => setViewScope("all")}
              className={`px-2 py-1.5 xs:px-4 xs:py-2 rounded-lg text-[9px] xs:text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-1 shrink-0 whitespace-nowrap outline-none ${
                viewScope === "all" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <UsersIcon size={12} className="shrink-0" />
              <span translate="no" className="notranslate">P.QLCL ({allActiveCount})</span>
            </button>
          </div>
          
          {/* SUPERVISOR ROBOT AREA (CON ROBOT CAM CŨ) - KHOANH ĐỎ SLOT */}
          {(() => {
            const canViewSup = effectiveUser.role === 'Admin' || effectiveUser.role === 'Trưởng Phòng' || effectiveUser.delegatedPermissions?.system_viewSup === true;
            if (!canViewSup) return null;
            const canControlSup = effectiveUser.role === 'Admin' || effectiveUser.role === 'Trưởng Phòng' || effectiveUser.delegatedPermissions?.system_viewSup === true;
            return (
              <div className="flex-shrink-0 md:flex-1 flex items-center justify-center px-1 md:px-4 max-w-xs md:max-w-xl">
                <div className="flex items-center gap-1.5 md:gap-2.5 bg-orange-50/55 border border-orange-200/60 rounded-2xl px-2 md:px-3 py-1 md:py-1.5 shadow-sm max-w-full animate-in fade-in zoom-in-95 duration-200">
                  
                  {/* Pulsing/bouncing Orange Robot Icon */}
                  <button
                    onClick={canControlSup ? togglePatrol : undefined}
                    disabled={!canControlSup}
                    className={`flex-shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full transition-all text-white flex items-center justify-center relative ${
                      supState.isActive ? 'bg-orange-100 border-2 border-dashed border-orange-300' : 'bg-orange-500 hover:bg-orange-600 active:scale-95 shadow-md'
                    } ${canControlSup ? 'cursor-pointer' : 'cursor-default'}`}
                    title={canControlSup ? (supState.isActive ? "Bấm để TẠM DỪNG Tuần Tra" : "Bấm để KÍCH HOẠT Tuần Tra") : "Hệ thống giám sát S.U.P"}
                  >
                    {!supState.isActive ? (
                      <motion.div
                        layoutId="sup-robot-avatar"
                        animate={{ y: [0, -4, 0] }}
                        transition={{
                          y: { repeat: Infinity, duration: 2, ease: "easeInOut" },
                          layout: { type: "tween", duration: 3.5, ease: "easeInOut" }
                        }}
                        className="w-full h-full rounded-full bg-orange-500 flex items-center justify-center relative z-[10] shadow-md"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4 md:w-4.5 md:h-4.5 fill-none stroke-current" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="10" rx="2" />
                          <circle cx="12" cy="5" r="2" />
                          <path d="M12 7v4" />
                          <line x1="8" y1="16" x2="8" y2="16" strokeLinecap="round" />
                          <line x1="16" y1="16" x2="16" y2="16" strokeLinecap="round" />
                        </svg>
                      </motion.div>
                    ) : (
                      // Elegant placeholder when patrolling
                      <div className="w-full h-full flex items-center justify-center text-orange-400">
                        <span className="text-[8px] md:text-[9px] font-black animate-pulse">S.U.P</span>
                      </div>
                    )}

                    {supState.isActive && (
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-white animate-ping" />
                    )}
                  </button>

                  {/* Mobile-only Compact Label */}
                  <div className="flex md:hidden flex-col select-none">
                    <span className="text-[10px] font-black text-orange-600 leading-none">SUP</span>
                    {supState.isActive && (
                      <span className="text-[6px] font-black text-green-500 mt-0.5 animate-pulse">LIVE</span>
                    )}
                  </div>

                  {/* Speech Dialogue Bubble - Desktop only */}
                  <div className="hidden md:flex relative flex-col min-w-0">
                    <div className="relative flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 leading-none mb-0.5">
                        <span className="text-[8px] font-black text-white bg-orange-600 px-1 py-0.5 rounded-sm uppercase tracking-wider select-none leading-none">
                          SUPERVISOR ROBOT
                        </span>
                        <span className={`w-1.5 h-1.5 rounded-full ${supState.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                        <span className="text-[7.5px] font-bold text-orange-500 uppercase tracking-widest">
                          {supState.isActive ? 'ĐANG TUẦN TRA' : 'NGHỈ NGƠI'}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-orange-955 font-black leading-snug truncate max-w-[280px]">
                        <span translate="no" className="notranslate">
                          {supState.speech || 'Hệ thống an ninh giám sát S.U.P sẵn sàng!'}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            );
          })()}

          {effectiveUser.role === "Admin" && selectedTaskIds.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95 border-2 border-red-500"
              >
                <Trash2 size={16} strokeWidth={2.5} />
                <span translate="no" className="notranslate">XÓA ({selectedTaskIds.length})</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-row items-center justify-between w-full md:w-auto md:justify-start gap-3 md:gap-4">
            <h3 className="text-[12px] md:text-[14px] font-black text-gray-800 uppercase tracking-widest flex items-center gap-1.5 md:gap-2 whitespace-nowrap flex-shrink-0">
              <div className="w-1.5 h-5 md:h-6 bg-blue-600 rounded-full print:hidden" />
              <span translate="no" className="notranslate uppercase tracking-tighter">DANH SÁCH BẢNG CÔNG VIỆC</span>
            </h3>
            
            {/* Quick search input side-by-side with title on mobile */}
            <div className="flex md:hidden items-center gap-1.5 print:hidden">
              {search && (
                <span translate="no" className="notranslate text-[9px] font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-105/20 min-w-fit">
                  {sortedTasks.length}
                </span>
              )}
              <div className="relative group">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={11} />
                <input
                  type="text"
                  placeholder="Tìm nhanh..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-6 pr-1.5 py-1 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-[10px] w-24 xs:w-28 placeholder:notranslate transition-all group-focus-within:border-blue-400 group-focus-within:shadow-sm shadow-sm"
                />
              </div>
            </div>
            
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={handlePrintClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 rounded-lg text-[10px] font-black tracking-wider shadow-sm hover:shadow active:scale-95 transition-all uppercase flex-shrink-0 print:hidden"
                title="In/Xuất danh sách công việc ra PDF"
              >
                <Printer size={12} strokeWidth={3} />
                <span translate="no" className="notranslate">In PDF</span>
              </button>

              {(effectiveUser.role !== "Staff" || effectiveUser.delegatedPermissions?.canExportExcel || effectiveUser.delegatedPermissions?.canImportExcel) && (
                <div className="flex items-center gap-2 print:hidden overflow-x-auto">
                  <button
                    onClick={downloadSampleExcel}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition-all uppercase whitespace-nowrap"
                    title="Tải file Excel mẫu"
                  >
                    <FileDown size={12} />
                    <span translate="no" className="notranslate">File Mẫu</span>
                  </button>
                  {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canExportExcel) && (
                    <button
                      onClick={() => handleExportExcel(sortedTasks)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[10px] font-bold hover:bg-green-100 transition-all uppercase whitespace-nowrap"
                    >
                      <FileDown size={12} />
                      <span translate="no" className="notranslate">Xuất Excel</span>
                    </button>
                  )}
                  {(effectiveUser.role === "Admin" || effectiveUser.delegatedPermissions?.canImportExcel) && (
                    <label 
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all uppercase cursor-pointer shadow-sm active:scale-95 whitespace-nowrap"
                    >
                      <FileUp size={12} />
                      <span translate="no" className="notranslate">Nhập từ Excel</span>
                      <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImportExcel} />
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 print:hidden ml-auto md:ml-0">
            {search && (
              <span translate="no" className="notranslate text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100 animate-in fade-in slide-in-from-right-1">
                TÌM THẤY: {sortedTasks.length}
              </span>
            )}
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Tìm nhanh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 text-xs w-44 md:w-56 placeholder:notranslate transition-all group-focus-within:border-blue-400 group-focus-within:shadow-sm shadow-sm"
              />
            </div>
          </div>
        </div>

        <TaskList
          tasks={sortedTasks}
          user={effectiveUser}
          users={allUsers}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onViewHistory={(id) => setShowHistoryModal(id)}
          onOpenChat={(id) => setShowChatModal(id)}
          showChatModal={showChatModal}
          onSendMessage={addTaskComment}
          onReact={updateTaskCommentReactions}
          onEdit={setEditingTask}
          setConfirmModal={setConfirmModal}
          approveTaskCompletion={approveTaskCompletion}
          sendAiMessage={sendAiMessage}
          triggerAiNudge={triggerAiNudge}
          resetTaskAIStatus={resetTaskAIStatus}
          aiMessages={aiMessages}
          onNavigate={setActiveTab}
          type="active"
          isReadOnly={false}
          highlightedTaskId={highlightedTaskId}
          selectedIds={selectedTaskIds}
          onToggleSelect={toggleTaskSelection}
          onBulkSelect={setBulkSelection}
          createNotification={createNotification}
          markAsRead={markAsRead}
          lastReadChatTimestamps={lastReadChatTimestamps}
          presence={presence}
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
