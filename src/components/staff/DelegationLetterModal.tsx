import React, { useRef } from 'react';
import { User } from '../../types';
import { X, Download, ShieldCheck, Send, Users, Award, Stamp } from 'lucide-react';
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
      canCreateTask: 'Soạn thảo & Nhập liệu công việc',
      canApproveTask: 'Phê duyệt & Chốt báo cáo chuyên mục',
      canDeleteTask: 'Xóa & Hủy bỏ các dự án hệ thống',
      canExportExcel: 'Trích xuất dữ liệu & Báo cáo Excel',
      canImportExcel: 'Nạp dữ liệu hệ thống hàng loạt',
      canManageStaff: 'Quản trị hồ sơ & Phân quyền nhân sự'
    };
    return labels[key] || key;
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
        scale: 2,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl flex flex-col items-center py-4"
      >
        {/* Actions Bar (Top) */}
        <div className="absolute top-0 right-0 p-4 z-50">
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full flex items-center justify-center transition-all border border-gray-100 shadow-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* The Letter Design - More compact (440px width) */}
        <div ref={letterRef} className="bg-white p-1 shadow-[0_20px_40px_rgba(0,0,0,0.1)] rounded-sm border-[6px] border-double border-blue-950/20">
          <div className="bg-white border border-blue-900/10 p-6 w-[440px] min-h-[560px] flex flex-col relative overflow-hidden">
            {/* Background Texture/Watermark */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none select-none flex items-center justify-center">
              <Award size={300} className="text-blue-950" />
            </div>

            {/* Header */}
            <div className="border-b border-blue-900/20 pb-3 mb-4 text-center relative z-10">
              <div className="flex flex-col items-center mb-2">
                <p className="text-[8px] font-black text-blue-900 uppercase tracking-[0.2em] leading-tight mb-0.5">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p className="text-[9px] font-black text-gray-900 border-b border-gray-900 pb-0.5">Độc lập - Tự do - Hạnh phúc</p>
              </div>

              <div className="flex items-center justify-center gap-2 mb-3 mt-4">
                <div className="w-8 h-8 bg-blue-950 text-white rounded flex items-center justify-center shadow-md">
                  <ShieldCheck size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[8px] font-black text-blue-900 uppercase tracking-widest leading-tight">Phòng Quản lý Chất lượng</p>
                  <p className="text-[10px] font-black text-gray-900 uppercase leading-none">Tân Phú Việt Nam</p>
                </div>
              </div>
              
              <h1 className="text-lg font-black text-blue-950 uppercase tracking-widest font-serif mt-2">GIẤY ỦY QUYỀN ĐIỀU HÀNH</h1>
              <p className="text-[7px] text-gray-500 font-bold mt-1 uppercase tracking-[0.2em]">Số: {user.code}/2026/UQ-QC</p>
            </div>

            {/* Body */}
            <div className="flex-1 relative z-10 text-gray-800 px-4 text-left">
              <div className="mb-4 font-serif leading-relaxed">
                <p className="text-[10px] mb-3 text-gray-600 tracking-tight">Hôm nay, ngày {new Date().toLocaleDateString('vi-VN')}, tại Văn phòng QLCL,</p>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Cán bộ ủy quyền:</p>
                    <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{manager.name}</p>
                    <p className="text-[9px] font-bold text-blue-800 uppercase tracking-tight leading-none">CHỨC VỤ: TRƯỞNG PHÒNG QC</p>
                  </div>

                  <div className="py-1 flex justify-start">
                    <p className="text-[7.5px] font-black text-gray-300 uppercase tracking-[0.4em]">--- CHÍNH THỨC ỦY QUYỀN ---</p>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Cho cán bộ:</p>
                    <p translate="no" className="text-lg font-black text-blue-950 uppercase tracking-tight notranslate">{user.name}</p>
                    <p className="text-[9px] font-bold text-blue-800 uppercase tracking-tight leading-none">MÃ NHÂN SỰ: {user.code}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest mb-2 border-b border-gray-100 pb-1 inline-block">Nội dung ủy quyền ({activePermissions.length}/6 quyền):</p>
                  <div className="grid grid-cols-1 gap-1.5 pl-2">
                    {activePermissions.length > 0 ? activePermissions.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] font-extrabold text-gray-800">
                        <div className="w-1 h-1 rounded-full bg-blue-900 shrink-0" />
                        <span>{p}</span>
                      </div>
                    )) : (
                      <p className="text-gray-400 text-[10px]">Chưa có nội dung cấp phép.</p>
                    )}
                  </div>
                </div>

                <p className="text-[8px] text-gray-500 leading-relaxed mt-6 text-left max-w-[360px]">
                  Văn bản có hiệu lực ngay khi phát hành và tự động hết hiệu lực khi có quyết định thay thế hoặc khi cán bộ thôi giữ chức vụ.
                </p>
              </div>

            {/* Stamp Area */}
              <div className="mt-4 flex justify-end pr-6">
                <div className="relative flex flex-col items-center">
                  <p className="text-[9px] font-black text-gray-900 uppercase mb-8">TRƯỞNG PHÒNG PHÊ DUYỆT</p>
                  <p className="text-sm font-black text-blue-950 uppercase">{manager.name}</p>
                  
                  {/* Formal Digital Stamp */}
                  <div className="absolute -right-6 -top-2 w-20 h-20 border-[2px] border-red-600 rounded-full flex items-center justify-center rotate-12 pointer-events-none flex-col scale-90">
                    <div className="absolute inset-1 border border-red-600/40 rounded-full flex flex-col items-center justify-center p-1">
                      <p className="text-[4px] font-black text-red-600 uppercase text-center leading-none mb-1">PHÒNG QUẢN LÝ CHẤT LƯỢNG<br/>TÂN PHÚ VIỆT NAM</p>
                      <Stamp size={16} className="text-red-600 mb-1" />
                      <p className="text-[6px] font-black text-red-600 uppercase text-center leading-none tracking-tighter">ĐÃ XÁC NHẬN SỐ</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Footer */}
            <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between opacity-40 text-[6px] font-black uppercase tracking-[0.2em]">
              <span>Hash: {user.id.substring(0, 12).toUpperCase()}</span>
              <span>Online Authorization Portal</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Below Letter */}
        <div className="w-full max-w-[440px] grid grid-cols-1 md:grid-cols-3 gap-2 mt-4 pb-4">
           <button 
             onClick={() => onSendToUser?.(announcementText)}
             className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all group active:scale-95 text-white"
           >
             <Send size={16} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
             Gửi Cá Nhân
           </button>

           <button 
             onClick={() => onSendToGroup?.(announcementText)}
             className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all group active:scale-95 text-white"
           >
             <Users size={16} className="group-hover:scale-110 transition-transform" />
             Gửi Nhóm Chat
           </button>

           <button 
             onClick={handleDownload}
             className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-300 hover:bg-black transition-all group active:scale-95 text-white"
           >
             <Download size={16} className="animate-bounce" />
             Lưu Ảnh
           </button>
        </div>
        
        <p className="mt-6 text-white/40 text-[10px] font-bold uppercase tracking-widest animate-pulse">
           "Chứng từ có giá trị pháp lý ngay trên hệ thống điều hành"
        </p>
      </motion.div>
    </div>
  );
};

