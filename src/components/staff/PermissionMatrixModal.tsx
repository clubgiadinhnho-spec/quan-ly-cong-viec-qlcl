import React from 'react';
import { User, UserPermissions } from '../../types';
import { X, Shield, CheckCircle2, AlertCircle, Briefcase, Database, Settings, Zap, History, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionMatrixModalProps {
  user: User;
  onClose: () => void;
  onSave: (permissions: UserPermissions) => void;
}

const PERMISSION_GROUPS = [
  {
    id: 'tasks',
    label: 'Quản lý Công việc',
    icon: <Briefcase size={20} />,
    color: 'blue',
    items: [
      { key: 'canCreateTask', label: 'Soạn thảo / Nhập công việc mới', description: 'Cho phép tạo công việc và gán cho nhân viên khác.' },
      { key: 'canApproveTask', label: 'Phê duyệt hoàn thành / Chốt báo cáo', description: 'Quyền xác nhận công việc (PENDING_APPROVAL -> COMPLETED).' },
      { key: 'canDeleteTask', label: 'Xóa hoặc Hủy công việc', description: 'Cho phép xóa vĩnh viễn hoặc chuyển trạng thái Hủy cho các dự án.' },
    ]
  },
  {
    id: 'data',
    label: 'Dữ liệu & Báo cáo',
    icon: <Database size={20} />,
    color: 'green',
    items: [
      { key: 'canExportExcel', label: 'Xuất báo cáo Excel', description: 'Cho phép tải xuống dữ liệu tổng hợp của toàn bộ phòng.' },
      { key: 'canImportExcel', label: 'Nhập dữ liệu từ Excel', description: 'Cho phép cập nhật hàng loạt danh sách từ tệp mẫu.' },
    ]
  },
  {
    id: 'system',
    label: 'Quản trị Hệ thống',
    icon: <Settings size={20} />,
    color: 'purple',
    items: [
      { key: 'canManageStaff', label: 'Quản lý Nhân sự', description: 'Phê duyệt tài khoản mới và chỉnh sửa thông tin đồng nghiệp.' },
    ]
  }
];

export const PermissionMatrixModal: React.FC<PermissionMatrixModalProps> = ({ user, onClose, onSave }) => {
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

  const applyPreset = (type: 'full' | 'none' | 'data-only') => {
    switch (type) {
      case 'full':
        setPermissions({
          canCreateTask: true,
          canApproveTask: true,
          canDeleteTask: true,
          canExportExcel: true,
          canImportExcel: true,
          canManageStaff: true,
        });
        break;
      case 'none':
        setPermissions({
          canCreateTask: false,
          canApproveTask: false,
          canDeleteTask: false,
          canExportExcel: false,
          canImportExcel: false,
          canManageStaff: false,
        });
        break;
      case 'data-only':
        setPermissions(p => ({
          ...p,
          canExportExcel: true,
          canImportExcel: true,
        }));
        break;
    }
  };

  const hasAnyPermission = Object.values(permissions).some(v => v);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-3xl rounded-[32px] shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Shield size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">MA TRẬN BẢO MẬT & ỦY QUYỀN</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">Thiết lập quyền cho:</span>
                <span translate="no" className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg notranslate">{user.name}</span>
                <span className="text-xs font-mono text-gray-400">#{user.code}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
          {/* Quick Presets */}
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => applyPreset('full')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Zap size={14} /> Toàn quyền (TP)
            </button>
            <button 
              onClick={() => applyPreset('data-only')}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 border border-green-100 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-green-100 transition-all"
            >
              <Database size={14} /> Chỉ Dữ liệu & Báo cáo
            </button>
            <button 
              onClick={() => applyPreset('none')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-gray-200 transition-all"
            >
              <RotateCcw size={14} /> Reset mặc định
            </button>
          </div>



          <div className="grid grid-cols-1 gap-8">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.id} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-2">
                  <div className={`p-2 rounded-xl bg-${group.color}-50 text-${group.color}-600`}>
                    {group.icon}
                  </div>
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest leading-none">
                    {group.label}
                  </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((item) => {
                    const isActive = permissions[item.key as keyof UserPermissions];
                    return (
                      <button
                        key={item.key}
                        onClick={() => handleToggle(item.key as keyof UserPermissions)}
                        className={`flex items-start gap-4 p-4 rounded-[20px] border-2 transition-all text-left ${
                          isActive
                            ? `border-${group.color}-500 bg-${group.color}-50 shadow-lg shadow-${group.color}-500/10`
                            : 'border-gray-50 bg-gray-50/30 hover:border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-1 transition-all ${
                          isActive 
                            ? `bg-${group.color}-600 text-white shadow-md shadow-${group.color}-200` 
                            : 'bg-white border border-gray-200 text-gray-300'
                        }`}>
                          <CheckCircle2 size={18} />
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={`text-[11px] font-black uppercase tracking-tight leading-tight mb-1 ${
                            isActive ? `text-${group.color}-700` : 'text-gray-700'
                          }`}>{item.label}</p>
                          <p className="text-[10px] text-gray-400 font-medium leading-relaxed">{item.description}</p>
                        </div>
                        <div className="pt-1">
                           <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                             isActive ? `bg-${group.color}-500 border-${group.color}-500` : 'bg-white border-gray-300'
                           }`}>
                             {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                           </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
             <div className={`px-4 py-2 rounded-xl border-2 flex items-center gap-3 transition-colors ${
               hasAnyPermission ? 'bg-amber-50 border-amber-200' : 'bg-gray-100 border-gray-200'
             }`}>
                <div className={`w-2 h-2 rounded-full ${hasAnyPermission ? 'bg-amber-500 animate-pulse' : 'bg-gray-400'}`} />
                <span className={`text-[10px] font-black uppercase tracking-wider ${hasAnyPermission ? 'text-amber-700' : 'text-gray-500'}`}>
                   {hasAnyPermission ? 'Đang kích hoạt Gói ủy quyền' : 'Chưa thiết lập ủy quyền'}
                </span>
             </div>
             {hasAnyPermission && (
               <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                 <History size={14} />
                 <span>ID: {user.abbreviation}</span>
               </div>
             )}
          </div>
          
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={onClose}
              className="flex-1 md:flex-none px-8 py-3 bg-white text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-100 border border-gray-200 transition-all font-sans"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={() => onSave(permissions)}
              className="flex-1 md:flex-none px-10 py-3 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 font-sans"
            >
              Cập nhật ma trận
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

