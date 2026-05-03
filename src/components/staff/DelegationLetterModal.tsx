import React, { useRef } from 'react';
import { User } from '../../types';
import { X, Download, ShieldCheck, Send, Users, Award, Stamp, CheckCircle2, Shield } from 'lucide-react';
import { motion } from 'motion/react';
import html2canvas from 'html2canvas';

import { cleanModernColors } from '../../lib/colorUtils';

interface DelegationLetterModalProps {
  user: User;
  manager: User;
  onClose: () => void;
  onSendToUser?: (msg: string) => void;
  onSendToGroup?: (msg: string) => void;
}

export const DelegationLetterModal: React.FC<DelegationLetterModalProps> = ({ 
  user, 
  manager, 
  onClose,
  onSendToUser,
  onSendToGroup
}) => {
  const letterRef = useRef<HTMLDivElement>(null);
  const permissions = user.delegatedPermissions;
  
  const getPermissionLabel = (key: string) => {
    const labels: Record<string, string> = {
      canCreateTask: 'NHẬP CÔNG VIỆC MỚI',
      canApproveTask: 'PHÊ DUYỆT HOÀN THÀNH',
      canDeleteTask: 'XÓA HOẶC HỦY DỰ ÁN',
      canExportExcel: 'XUẤT DỮ LIỆU EXCEL',
      canImportExcel: 'NHẬP DỮ LIỆU MẪU',
      canManageStaff: 'QUẢN LÝ NHÂN SỰ'
    };
    return labels[key] || key.toUpperCase();
  };

  const activePermissions = permissions ? Object.entries(permissions)
    .filter(([_, value]) => value === true)
    .map(([key, _]) => getPermissionLabel(key)) : [];

  const announcementText = `📜 [QUYẾT ĐỊNH ỦY QUYỀN TRỌNG YẾU]\n\n` +
    `Trưởng phòng ${manager.name} chính thức phê chuẩn ủy quyền cho cán bộ: ${user.name.toUpperCase()}.\n\n` +
    `Danh mục quyền hạn được cấp phép (${activePermissions.length}/6):\n` +
    activePermissions.map(p => `• ${p}`).join('\n') +
    `\n\nNội dung có hiệu lực thi hành ngay lập tức trên hệ thống điều hành Phòng QLCL Tân Phú Việt Nam.`;

  const handleDownload = async () => {
    if (letterRef.current) {
      const element = letterRef.current;
      const originalStyle = element.style.cssText;
      
      cleanModernColors(element);

      const canvas = await html2canvas(element, {
        backgroundColor: '#ffffff',
        scale: 3, // Tăng scale để chữ cực kỳ rõ nét
        useCORS: true
      });

      element.style.cssText = originalStyle;

      const link = document.createElement('a');
      link.download = `Giay-Uy-Quyen-${user.name.replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-2xl flex flex-col items-center py-8"
      >
        {/* Actions Bar - Removed from here to place inside shield */}

        {/* The Letter Design - Shield Shape Layout */}
        <div 
          ref={letterRef} 
          className="group relative w-[500px] h-[750px] flex items-center justify-center bg-white"
          style={{ clipPath: 'path("M250 10 L480 80 V350 C480 600 250 740 250 740 C250 740 20 600 20 350 V80 L250 10 Z")' }}
        >
          {/* Close Button - Internal & Hover-only */}
          <button 
            onClick={onClose}
            className="absolute top-20 right-14 z-50 w-10 h-10 bg-white/40 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 backdrop-blur-md border border-white/20 active:scale-95"
          >
            <X size={20} strokeWidth={3} />
          </button>
          {/* Main Shield Background & Border (Explicit RED Border) */}
          <div className="absolute inset-0 bg-red-600 shadow-2xl" style={{ clipPath: 'path("M250 10 L480 80 V350 C480 600 250 740 250 740 C250 740 20 600 20 350 V80 L250 10 Z")' }}>
            {/* Inner Shield (Pale Yellow with Subtle Pattern) */}
            <div 
              className="w-full h-full bg-[#fffbeb] relative flex flex-col items-center pt-28 px-10" 
              style={{ 
                clipPath: 'path("M250 18 L468 86 V342 C468 580 250 715 250 715 C250 715 32 580 32 342 V86 L250 18 Z")',
                backgroundImage: 'radial-gradient(#fcd34d 0.5px, transparent 0.5px)',
                backgroundSize: '20px 20px',
              }}
            >
              
              {/* Header section - Balanced positioning */}
              <div className="text-center mb-6">
                <h1 className="text-2xl font-black text-red-700 uppercase tracking-tight leading-none mb-2">GIẤY ỦY QUYỀN</h1>
                <div className="flex flex-col items-center gap-1">
                   <p className="text-[10px] font-mono font-black text-slate-500 tracking-[0.4em] uppercase">REF: {user.code}-UQ-2026</p>
                   <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">NGÀY LẬP: {new Date().toLocaleDateString('vi-VN')}</p>
                </div>
              </div>

              {/* Delegator Section */}
              <div className="text-center mb-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CÁN BỘ ỦY QUYỀN</p>
                <p className="text-[22px] font-black text-slate-900 uppercase leading-none mb-1">{manager.name}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tight">TRƯỞNG PHÒNG QLCL</p>
              </div>

              {/* Divider */}
              <div className="w-full flex items-center justify-center my-3">
                <div className="h-[1px] flex-1 bg-red-100"></div>
                <div className="mx-4 text-red-600">
                  <Award size={22} strokeWidth={2.5} />
                </div>
                <div className="h-[1px] flex-1 bg-red-100"></div>
              </div>

              {/* Delegated Section */}
              <div className="text-center mb-8">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">CÁN BỘ ĐƯỢC ỦY QUYỀN</p>
                <p className="text-[26px] font-black text-red-800 uppercase leading-none mb-1">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">MÃ NHÂN VIÊN: {user.code}</p>
              </div>

              {/* Permissions Area - Tapered for shield curve */}
              <div className="w-full px-6 flex-1 flex flex-col items-center">
                 <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-4">NỘI DUNG ỦY QUYỀN TRỌNG YẾU:</p>
                 
                 <div className="w-full max-w-[280px] space-y-2">
                    {activePermissions.length > 0 ? activePermissions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2.5 bg-white/40 p-2 rounded-xl border border-red-50/50 shadow-sm">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" strokeWidth={3} />
                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{p}</span>
                      </div>
                    )) : (
                      <div className="text-center pt-4">
                         <span className="text-slate-400 font-bold italic text-[12px]">Chưa xác định quyền hạn.</span>
                      </div>
                    )}
                 </div>
              </div>

              {/* Footer Area - Simplified per request */}
              <div className="w-full pb-16 flex flex-col items-center justify-center relative mt-auto z-10">
                <div className="w-20 h-0.5 bg-red-100 opacity-50 mb-2"></div>
                <div className="text-[8px] text-slate-300 font-mono tracking-widest uppercase">Certified Document</div>
              </div>

              {/* Watermark Logo */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 text-red-500/5 pointer-events-none">
                 <Shield size={100} fill="currentColor" strokeWidth={0} />
              </div>
            </div>
          </div>
        </div>

        {/* Floating Actions */}
        <div className="w-full grid grid-cols-3 gap-3 mt-8">
           <button 
             onClick={() => onSendToUser?.(announcementText)}
             className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-blue-50 text-blue-600 rounded-3xl transition-all shadow-xl shadow-slate-200 border-2 border-transparent hover:border-blue-200 group"
           >
             <Send size={24} className="group-hover:-translate-y-1 transition-transform" />
             <span className="text-[11px] font-black uppercase tracking-tighter">Gửi Cá Nhân</span>
           </button>
           
           <button 
             onClick={() => onSendToGroup?.(announcementText)}
             className="flex flex-col items-center gap-2 p-4 bg-white hover:bg-emerald-50 text-emerald-600 rounded-3xl transition-all shadow-xl shadow-slate-200 border-2 border-transparent hover:border-emerald-200 group"
           >
             <Users size={24} className="group-hover:scale-110 transition-transform" />
             <span className="text-[11px] font-black uppercase tracking-tighter">Gửi Nhóm</span>
           </button>

           <button 
             onClick={handleDownload}
             className="flex flex-col items-center gap-2 p-4 bg-slate-900 hover:bg-black text-white rounded-3xl transition-all shadow-xl shadow-slate-200 group"
           >
             <Download size={24} className="group-hover:translate-y-1 transition-transform" />
             <span className="text-[11px] font-black uppercase tracking-tighter text-white">Tải Ảnh PNG</span>
           </button>
        </div>

        <p className="mt-8 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
           Chứng từ điện tử chính thức
        </p>
      </motion.div>
    </div>
  );
};
