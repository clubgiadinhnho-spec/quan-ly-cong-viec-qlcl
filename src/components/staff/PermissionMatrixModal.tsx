import React from 'react';
import { User, UserPermissions } from '../../types';
import { X, Shield, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PermissionMatrixModalProps {
  user: User;
  onClose: () => void;
  onSave: (permissions: UserPermissions) => void;
}

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

  const permissionItems = [
    { key: 'canCreateTask', label: 'Soạn thảo / Nhập công việc mới', description: 'Cho phép tạo công việc và gán cho nhân viên khác.' },
    { key: 'canApproveTask', label: 'Phê duyệt hoàn thành / Chốt báo cáo', description: 'Quyền xác nhận công việc đã hoàn thành (PENDING_APPROVAL -> COMPLETED).' },
    { key: 'canDeleteTask', label: 'Xóa hoặc Hủy công việc', description: 'Cho phép xóa vĩnh viễn hoặc chuyển trạng thái Hủy cho các dự án.' },
    { key: 'canExportExcel', label: 'Xuất báo cáo Excel', description: 'Cho phép tải xuống dữ liệu tổng hợp của toàn bộ phòng.' },
    { key: 'canImportExcel', label: 'Nhập dữ liệu từ Excel', description: 'Cho phép cập nhật hàng loạt danh sách công việc từ tệp mẫu.' },
    { key: 'canManageStaff', label: 'Quản lý Nhân sự', description: 'Phê duyệt tài khoản mới và chỉnh sửa thông tin đồng nghiệp.' },
  ];

  const handleToggle = (key: keyof UserPermissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const hasAnyPermission = Object.values(permissions).some(v => v);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50/30">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200">
              <Shield size={28} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">MA TRẬN PHÂN QUYỀN</h2>
              <p className="text-sm text-gray-500 font-medium mt-0.5">Ủy thác quyền Quản lý cho: <span className="text-blue-600 font-bold">{user.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm border border-transparent hover:border-gray-100">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-start gap-3">
             <AlertCircle size={20} className="text-amber-500 shrink-0 mt-0.5" />
             <div className="text-xs text-amber-800 leading-relaxed font-medium">
                <strong>Lưu ý:</strong> Việc phân quyền này không thay đổi chức vụ chính của nhân viên. Nhân viên sẽ được hiển thị kèm nhãn <span className="bg-amber-200 px-1 rounded font-bold text-[9px] uppercase tracking-tighter">(QUYỀN TP)</span> khi có ít nhất một quyền Quản lý được kích hoạt.
             </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {permissionItems.map((item) => (
              <button
                key={item.key}
                onClick={() => handleToggle(item.key as keyof UserPermissions)}
                className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group ${
                  permissions[item.key as keyof UserPermissions]
                    ? 'border-blue-500 bg-blue-50/50 shadow-md shadow-blue-50'
                    : 'border-gray-50 bg-gray-50/30 hover:border-gray-100 hover:bg-gray-50'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  permissions[item.key as keyof UserPermissions] 
                    ? 'bg-blue-600 text-white rotate-6' 
                    : 'bg-gray-200 text-gray-400 group-hover:scale-110'
                }`}>
                  <CheckCircle2 size={24} />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-black uppercase tracking-tight ${
                    permissions[item.key as keyof UserPermissions] ? 'text-blue-700' : 'text-gray-700'
                  }`}>{item.label}</p>
                  <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-0.5">{item.description}</p>
                </div>
                <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center transition-all ${
                  permissions[item.key as keyof UserPermissions] ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {permissions[item.key as keyof UserPermissions] && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex flex-col">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Trạng thái hiện tại</span>
             <span className={`text-[11px] font-black uppercase ${hasAnyPermission ? 'text-blue-600' : 'text-gray-400'}`}>
                {hasAnyPermission ? 'Đã kích hoạt ủy quyền (QUYỀN TP)' : 'Chưa có phân quyền bổ sung'}
             </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-3 bg-white text-gray-500 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-100 border border-gray-200 transition-all"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={() => onSave(permissions)}
              className="px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-blue-200"
            >
              Lưu cấu hình
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
