import React, { useRef, useState, useEffect } from 'react';
import { User } from '../../types';
import { Award, CheckCircle2, Shield, Scroll, X } from 'lucide-react';
import { motion } from 'motion/react';

interface DelegationLetterModalProps {
  user: User;
  manager: User;
  onClose: () => void;
}

export const DelegationLetterModal: React.FC<DelegationLetterModalProps> = ({ 
  user, 
  manager, 
  onClose
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const permissions = user.delegatedPermissions;
  
  const getPermissionLabel = (key: string) => {
    const labels: Record<string, string> = {
      canCreateTask: 'NHẬP CÔNG VIỆC MỚI',
      canApproveTask: 'PHÊ DUYỆT HOÀN THÀNH',
      canDeleteTask: 'XÓA HOẶC HỦY DỰ ÁN',
      canManageStaff: 'QUẢN LÝ NHÂN SỰ'
    };
    return labels[key] || key.toUpperCase();
  };

  const activePermissions = permissions ? Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key, _]) => getPermissionLabel(key)) : [];

  // Add ESC key listener
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-start p-4 bg-slate-900/80 backdrop-blur-xl overflow-y-auto custom-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl flex flex-col items-center py-6 sm:py-12"
      >
        {/* Imperial Scroll (Thánh Chỉ) Design - Content Reverted to Shield Style */}
        <div className="scale-[0.65] sm:scale-[0.85] lg:scale-100 origin-top transform-gpu">
          <div 
            ref={scrollRef}
            className="relative w-[400px] h-[680px] sm:w-[540px] sm:h-[840px] shrink-0 flex flex-col items-center justify-center p-8 sm:p-12 bg-transparent"
          >
            {/* Wooden Roller - Top */}
            <div className="absolute top-0 left-0 right-0 h-8 sm:h-10 bg-gradient-to-b from-[#422006] via-[#78350f] to-[#422006] rounded-full shadow-lg z-20 flex justify-between px-4 items-center">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#fbbf24] shadow-inner border border-black/20" />
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#fbbf24] shadow-inner border border-black/20" />
            </div>

            {/* Vertical Silk Border (Red) */}
            <div className="absolute top-4 sm:top-5 bottom-4 sm:bottom-5 left-2 right-2 bg-[#b91c1c] shadow-2xl p-3 sm:p-5">
               {/* Main Parchment Surface */}
               <div className="w-full h-full bg-[#fef3c7] relative flex flex-col items-center pt-12 sm:pt-20 px-8 sm:px-10 overflow-hidden shadow-inner border-2 border-[#fbbf24]/30">
                  {/* Traditional Motifs Watermark */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04] pointer-events-none z-0">
                     <Scroll size={350} className="text-red-900" />
                  </div>

                  {/* Corner Motifs */}
                  <div className="absolute top-4 left-4 w-10 sm:w-16 h-10 sm:h-16 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-red-800 opacity-20" />
                  <div className="absolute top-4 right-4 w-10 sm:w-16 h-10 sm:h-16 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-red-800 opacity-20" />
                  <div className="absolute bottom-4 left-4 w-10 sm:w-16 h-10 sm:h-16 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-red-800 opacity-20" />
                  <div className="absolute bottom-4 right-4 w-10 sm:w-16 h-10 sm:h-16 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-red-800 opacity-20" />

                  {/* Title Section */}
                  <div className="text-center mb-8 sm:mb-12 z-10">
                     <h1 className="text-2xl sm:text-4xl font-black text-red-700 tracking-[0.2em] sm:tracking-[0.3em] uppercase mb-2">GIẤY ỦY QUYỀN</h1>
                     <div className="w-24 sm:w-40 h-1 bg-red-800 mx-auto" />
                     <p className="text-[7px] sm:text-[10px] font-mono font-bold text-red-900/60 uppercase mt-2 tracking-widest">REF: {user.code}-UQ-2026</p>
                  </div>

                  {/* Content Body */}
                  <div className="w-full space-y-4 sm:space-y-6 z-10 text-center">
                    <div className="space-y-0.5">
                      <p className="text-[8px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest opacity-60">QUẢN TRỊ NỘI BỘ PHÒNG QLCL</p>
                      <p className="text-xs sm:text-lg font-black text-slate-900 uppercase">QUYẾT ĐỊNH ỦY QUYỀN ĐIỀU HÀNH</p>
                    </div>

                    <div className="text-center py-1 sm:py-2">
                      <p className="text-[8px] sm:text-[9px] font-black text-blue-500 uppercase tracking-widest mb-0.5">CÁN BỘ ỦY QUYỀN</p>
                      <p className="text-lg sm:text-2xl font-black text-slate-900 uppercase leading-none">{manager.name}</p>
                      <p className="text-[7px] sm:text-[10px] font-black text-blue-600 uppercase tracking-tighter">TRƯỞNG PHÒNG QUẢN LÝ CHẤT LƯỢNG</p>
                    </div>

                    <div className="my-1 z-10">
                      <Award size={32} className="text-red-600 sm:scale-110 mx-auto" strokeWidth={2.5} />
                    </div>

                    <div className="text-center mb-3 sm:mb-4 z-10">
                      <p className="text-[8px] sm:text-[9px] font-black text-red-500 uppercase tracking-widest mb-0.5">CÁN BỘ ĐƯỢC ỦY QUYỀN</p>
                      <p className="text-xl sm:text-3xl font-black text-red-700 uppercase leading-none drop-shadow-sm">{user.name}</p>
                      <p className="text-xs sm:text-base font-black text-slate-400 uppercase tracking-widest mt-1">#ID: {user.code}</p>
                    </div>

                    {/* Permissions List Area - Optimized for up to 6 items */}
                    <div className="w-full flex flex-col items-center">
                       <p className="text-[8px] sm:text-[11px] font-black text-slate-800 uppercase tracking-[0.2em] mb-3 sm:mb-4 underline decoration-red-800/15 underline-offset-4">DANH MỤC QUYỀN HẠN TRỌNG YẾU:</p>
                       
                       <div className="w-full max-w-[340px] grid grid-cols-1 gap-1.5 sm:gap-2">
                          {activePermissions.length > 0 ? activePermissions.map((p, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white/40 h-8 sm:h-12 px-3 sm:px-4 rounded-lg border border-red-100/50 shadow-sm transition-all hover:bg-white/60">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center bg-emerald-100 rounded-full shrink-0">
                                <CheckCircle2 size={12} className="text-emerald-700 sm:scale-125" />
                              </div>
                              <span className="text-[9px] sm:text-[13px] font-black text-slate-800 uppercase leading-none">{p}</span>
                            </div>
                          )) : (
                            <div className="h-12 flex items-center justify-center">
                               <p className="text-center text-slate-400 italic text-[10px] sm:text-xs">Chưa có quyền hạn nào được thiết lập.</p>
                            </div>
                          )}
                       </div>
                    </div>

                    <div className="pt-2 sm:pt-4">
                      <p className="text-[7px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1.5 opacity-80 italic">Hiệu lực tức thì - Phụng Thiên Thừa Vận</p>
                      <div className="flex items-center justify-center gap-2">
                         <div className="w-10 h-[1.5px] bg-red-800/20 rounded-full"></div>
                         <span className="text-[7px] sm:text-[9px] font-bold text-red-800/40 uppercase tracking-[0.15em]">Official Digital Certification System 2026</span>
                         <div className="w-10 h-[1.5px] bg-red-800/20 rounded-full"></div>
                      </div>
                    </div>
                  </div>

                  {/* Stamp */}
                  <div className="absolute bottom-10 right-6 sm:bottom-12 sm:right-12 opacity-60 rotate-[-15deg] transition-transform duration-500">
                     <div className="w-16 h-16 sm:w-24 sm:h-24 border-4 border-red-700/40 rounded-lg flex items-center justify-center flex-col p-1 text-red-700/40">
                        <div className="border border-red-700/40 w-full h-full flex flex-col items-center justify-center p-1">
                          <span className="text-[9px] sm:text-[12px] font-black text-center leading-none">PHÒNG QLCL</span>
                          <span className="text-[8px] sm:text-[10px] font-bold text-center leading-none mt-1">ĐÃ XÁC THỰC</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            {/* Wooden Roller - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-8 sm:h-10 bg-gradient-to-t from-[#422006] via-[#78350f] to-[#422006] rounded-full shadow-lg z-20 flex justify-between px-4 items-center">
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#fbbf24] shadow-inner border border-black/20" />
              <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#fbbf24] shadow-inner border border-black/20" />
            </div>
          </div>
        </div>

        {/* Improved Controls UI */}
        <div className="mt-8 flex flex-col items-center gap-4">
           <button 
             onClick={onClose}
             className="px-12 py-4 bg-slate-800 hover:bg-red-600 text-white text-xs font-black uppercase tracking-[0.4em] rounded-full transition-all shadow-xl active:scale-90 flex items-center gap-2 group"
           >
             <X size={16} className="group-hover:rotate-90 transition-transform" />
             Đóng văn bản (ESC)
           </button>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">
              Hệ thống bảo mật Phòng QLCL Tân Phú Việt Nam
           </p>
        </div>
      </motion.div>
    </div>
  );
};
