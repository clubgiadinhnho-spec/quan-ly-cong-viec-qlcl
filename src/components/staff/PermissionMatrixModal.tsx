import React from 'react';
import { User, UserPermissions } from '../../types';
import { X, Shield, CheckCircle2, Briefcase, Database, Settings, Zap, RotateCcw, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionMatrixModalProps {
  user: User;
  onClose: () => void;
  onSave: (permissions: UserPermissions) => void;
  onShowDelegationLetter?: () => void;
}

// Cố định mapping màu để tránh lỗi dynamic classes của Tailwind
const GROUP_STYLES: Record<string, { activeBg: string; activeText: string; iconBg: string; iconActiveBg: string }> = {
  tasks: { 
    activeBg: 'bg-blue-600', 
    activeText: 'text-white',
    iconBg: 'bg-blue-100 text-blue-600',
    iconActiveBg: 'bg-blue-500 text-white shadow-md'
  },
  data: { 
    activeBg: 'bg-emerald-600', 
    activeText: 'text-white',
    iconBg: 'bg-emerald-100 text-emerald-600',
    iconActiveBg: 'bg-emerald-500 text-white shadow-md'
  },
  system: { 
    activeBg: 'bg-purple-600', 
    activeText: 'text-white',
    iconBg: 'bg-purple-100 text-purple-600',
    iconActiveBg: 'bg-purple-500 text-white shadow-md'
  },
};

const PERMISSION_GROUPS = [
  {
    id: 'tasks',
    label: 'QUẢN LÝ CÔNG VIỆC',
    icon: <Briefcase size={24} strokeWidth={2.5} />,
    items: [
      { key: 'canCreateTask', label: 'NHẬP CÔNG VIỆC MỚI', description: 'Cho phép tạo và giao dự án' },
      { key: 'canApproveTask', label: 'PHÊ DUYỆT HOÀN THÀNH', description: 'Xác nhận báo cáo & chốt số' },
      { key: 'canDeleteTask', label: 'XÓA HOẶC HỦY DỰ ÁN', description: 'Quyền gỡ bỏ đầu việc' },
    ]
  },
  {
    id: 'data',
    label: 'DỮ LIỆU & BÁO CÁO',
    icon: <Database size={24} strokeWidth={2.5} />,
    items: [
      { key: 'canExportExcel', label: 'XUẤT DỮ LIỆU EXCEL', description: 'Tải báo cáo tổng hợp' },
      { key: 'canImportExcel', label: 'NHẬP DỮ LIỆU MẪU', description: 'Cập nhật từ tệp Excel' },
    ]
  },
  {
    id: 'system',
    label: 'QUẢN TRỊ HỆ THỐNG',
    icon: <Settings size={24} strokeWidth={2.5} />,
    items: [
      { key: 'canManageStaff', label: 'QUẢN LÝ NHÂN SỰ', description: 'Chỉnh sửa & phân quyền' },
    ]
  }
];

export const PermissionMatrixModal: React.FC<PermissionMatrixModalProps> = ({ user, onClose, onSave, onShowDelegationLetter }) => {
  const [permissions, setPermissions] = React.useState<UserPermissions>(
    user.delegatedPermissions || {
      canCreateTask: false,
      canApproveTask: false,
      canDeleteTask: false,
      canExportExcel: false,
      canImportExcel: false,
      canManageStaff: false,
    }
  );

  const handleToggle = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const applyPreset = (type: 'full' | 'none') => {
    const newVal = type === 'full';
    setPermissions({
      canCreateTask: newVal,
      canApproveTask: newVal,
      canDeleteTask: newVal,
      canExportExcel: newVal,
      canImportExcel: newVal,
      canManageStaff: newVal,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-5xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header - Balanced & Bold */}
        <div className="px-10 py-8 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
              <Shield size={32} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight uppercase leading-none mb-2">THIẾT LẬP QUYỀN HẠN</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-blue-400">Đang cấu hình:</span>
                <span translate="no" className="text-sm font-black text-white px-3 py-1 bg-white/10 rounded-lg">{user.name}</span>
                <span className="text-xs font-mono font-bold text-white/30 uppercase tracking-widest ml-1">#{user.code}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-14 h-14 flex items-center justify-center hover:bg-white/10 rounded-full transition-all text-white/40 hover:text-white">
            <X size={32} strokeWidth={2} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-slate-50 custom-scrollbar">
          {/* Quick Actions Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="space-y-1">
              <h4 className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cài đặt nhanh</h4>
              <p className="text-lg font-bold text-slate-700">Chọn mẫu quyền phù hợp cho vị trí <span className="text-blue-600">{user.role}</span></p>
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <button 
                onClick={() => applyPreset('full')}
                className="flex-1 sm:flex-none px-8 py-4 bg-blue-600 text-white rounded-[20px] text-[13px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3"
              >
                <Zap size={18} fill="currentColor" strokeWidth={0} /> TOÀN QUYỀN
              </button>
              <button 
                onClick={() => applyPreset('none')}
                className="flex-1 sm:flex-none px-8 py-4 bg-white text-slate-500 border-2 border-slate-200 rounded-[20px] text-[13px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
              >
                <RotateCcw size={18} strokeWidth={2.5} /> KHÔNG QUYỀN
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-12">
            {PERMISSION_GROUPS.map((group) => {
              const styles = GROUP_STYLES[group.id];
              return (
                <div key={group.id} className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="text-slate-900">
                      {group.icon}
                    </div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-[0.1em]">
                      {group.label}
                    </h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {group.items.map((item) => {
                      const isActive = permissions[item.key as keyof UserPermissions];
                      return (
                        <button
                          key={item.key}
                          onClick={() => handleToggle(item.key as keyof UserPermissions)}
                          className={`group relative flex flex-col p-8 rounded-[32px] border-4 transition-all duration-300 text-left ${
                            isActive
                              ? `${styles.activeBg} border-white shadow-2xl`
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-8">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                              isActive 
                                ? `${styles.iconActiveBg}` 
                                : `${styles.iconBg}`
                            }`}>
                              <CheckCircle2 size={28} strokeWidth={3} />
                            </div>
                            
                            {/* Modern Switch Toggle */}
                            <div className={`w-14 h-7 rounded-full px-1 flex items-center transition-colors duration-500 shadow-inner ${isActive ? 'bg-white/30' : 'bg-slate-200'}`}>
                              <motion.div 
                                animate={{ x: isActive ? 28 : 0 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                className={`w-5 h-5 rounded-full shadow-md ${isActive ? 'bg-white' : 'bg-white'}`} 
                              />
                            </div>
                          </div>

                          <div className="space-y-2 mt-auto">
                            <p className={`text-[16px] font-black uppercase tracking-tight leading-tight ${isActive ? 'text-white' : 'text-slate-900'}`}>
                              {item.label}
                            </p>
                            <p className={`text-[12px] font-bold leading-normal transition-colors ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 border-t border-slate-100 bg-white flex flex-col sm:flex-row items-center justify-end gap-4">
          <button 
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-5 text-slate-400 hover:text-slate-600 text-[13px] font-black uppercase tracking-widest transition-all"
          >
            Hủy cấu hình
          </button>

          {onShowDelegationLetter && (
            <button 
              onClick={onShowDelegationLetter}
              className="w-full sm:w-auto px-10 py-5 bg-emerald-100 text-emerald-600 rounded-[24px] text-[13px] font-black uppercase tracking-widest hover:bg-emerald-200 transition-all flex items-center justify-center gap-3 group"
            >
              <Award size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
              <span>GIẤY ỦY QUYỀN</span>
            </button>
          )}

          <button 
            onClick={() => onSave(permissions)}
            className="w-full sm:w-auto px-16 py-5 bg-blue-600 text-white rounded-[24px] text-[13px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 group"
          >
            <span>CHỐT MA TRẬN PHÂN QUYỀN</span>
            <Shield size={20} strokeWidth={2.5} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
