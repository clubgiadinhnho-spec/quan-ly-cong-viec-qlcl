import React, { useState } from 'react';
import { User, UserRoleType, UserPermissions } from '../types';
import { Search, Mail, Phone, MessageCircle, X, Save, Edit2, Trash2, Shield, HelpCircle, Lock, Download, ClipboardList, FileText, Filter, Eye, Award } from 'lucide-react';
import { SECURITY_QUESTIONS } from '../constants';

import { Avatar } from '../components/common/Avatar';
import { PermissionMatrixModal } from '../components/staff/PermissionMatrixModal';
import { DelegationLetterModal } from '../components/staff/DelegationLetterModal';

interface StaffListPageProps {
  users: User[];
  onUpdateStaff: (staff: User) => void;
  onDeleteStaff: (id: string) => void;
  currentUser: User;
  onSimulateStaff?: (user: User) => void;
  originalUser?: User | null;
  onSendToUser?: (msg: string, targetId: string) => void;
  onSendToGroup?: (msg: string) => void;
}

export const StaffListPage: React.FC<StaffListPageProps> = ({ 
  users, 
  onUpdateStaff, 
  onDeleteStaff, 
  currentUser, 
  onSimulateStaff, 
  originalUser,
  onSendToUser,
  onSendToGroup
}) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | UserRoleType | 'PENDING'>('All');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<User | null>(null);
  const [permissionMatrixUser, setPermissionMatrixUser] = useState<User | null>(null);
  const [delegationLetterUser, setDelegationLetterUser] = useState<User | null>(null);

  const isManagerOrAdmin = currentUser.role === 'Admin';
// ... rest of filtering logic ...
  const filteredStaff = users.filter(s => {
    if (!s) return false;
    const name = s.name || '';
    const phone = s.phone || '';
    const email = s.companyEmail || '';
    const code = s.code || '';
    const abbr = s.abbreviation || '';

    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                         phone.includes(search) || 
                         email.toLowerCase().includes(search.toLowerCase()) ||
                         code.toLowerCase().includes(search.toLowerCase()) ||
                         abbr.toLowerCase().includes(search.toLowerCase());
    
    let matchesRole = true;
    if (filterRole === 'PENDING') {
      matchesRole = s.status === 'PENDING';
    } else if (filterRole !== 'All') {
      matchesRole = s.role === filterRole;
    }
    
    return matchesSearch && matchesRole;
  });

  const roles: (UserRoleType | 'All' | 'PENDING')[] = ['All', 'PENDING', 'Admin', 'Leader', 'Staff'];

  const handleApprove = (staff: User) => {
    onUpdateStaff({ ...staff, status: 'ACTIVE' });
  };

  const handleEdit = (staff: User) => {
    setEditingStaffId(staff.id);
    setEditForm({ ...staff });
  };

  const handleSave = () => {
    if (editForm) {
      onUpdateStaff(editForm);
      setEditingStaffId(null);
      setEditForm(null);
    }
  };

  const handleCancel = () => {
    setEditingStaffId(null);
    setEditForm(null);
  };

  const handleUpdatePermissions = (permissions: UserPermissions) => {
    if (permissionMatrixUser) {
      const updated = {
        ...permissionMatrixUser,
        delegatedPermissions: permissions
      };
      onUpdateStaff(updated);
      setPermissionMatrixUser(null);
      // Auto show delegation card if any permission is granted
      if (permissions && Object.values(permissions).some(v => v)) {
        setDelegationLetterUser(updated);
      }
    }
  };

  const handleExport = () => {
// ... export logic ...
    const headers = ['Mã NV', 'Họ Tên', 'Viết tắt', 'Chức vụ', 'SĐT', 'Zalo', 'Email Cơ quan', 'Email Cá nhân', 'Kinh nghiệm/CV', 'Trạng thái'];
    const csvContent = [
      headers.join(','),
      ...users.map(u => [
        u.code,
        `"${u.name}"`,
        u.abbreviation,
        u.role,
        `'${u.phone}`,
        `'${u.zalo || u.phone}`,
        u.companyEmail,
        u.personalEmail,
        `"${(u.cvDetails || '').replace(/"/g, '""')}"`,
        u.status
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_nhan_su_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {permissionMatrixUser && (
        <PermissionMatrixModal 
          user={permissionMatrixUser} 
          onClose={() => setPermissionMatrixUser(null)} 
          onSave={handleUpdatePermissions} 
        />
      )}

      {delegationLetterUser && (
        <DelegationLetterModal 
          user={delegationLetterUser}
          manager={currentUser}
          onClose={() => setDelegationLetterUser(null)}
          onSendToUser={(msg) => onSendToUser?.(msg, delegationLetterUser.id)}
          onSendToGroup={onSendToGroup}
        />
      )}

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ClipboardList size={18} />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Hệ thống quản lý</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase leading-none">THÔNG TIN NHÂN SỰ</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium">Quản lý thông tin liên hệ và chức vụ nhân sự trong đơn vị</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng nhân sự</span>
            <span className="text-xl font-black text-gray-900">{users.length}</span>
          </div>
          {users.filter(u => u.status === 'PENDING').length > 0 && (
            <div className="flex flex-col items-end px-4 py-2 bg-amber-50 border border-amber-100 rounded-2xl shadow-sm">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Chờ duyệt</span>
              <span className="text-xl font-black text-amber-600">{users.filter(u => u.status === 'PENDING').length}</span>
            </div>
          )}
          {isManagerOrAdmin && (
            <button 
              onClick={handleExport}
              className="flex items-center gap-2 px-6 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
            >
              <Download size={16} />
              Xuất báo cáo
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-2 rounded-[24px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, mã NV, tên viết tắt..."
            className="w-full pl-12 pr-4 py-4 bg-transparent outline-none text-sm font-medium placeholder:text-gray-300"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 bg-gray-50 rounded-[20px] px-3 py-2">
          <Filter size={14} className="text-gray-400 ml-1 shrink-0" />
          <div className="flex gap-1 shrink-0">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filterRole === role 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                }`}
              >
                {role === 'All' ? 'TẤT CẢ' : role === 'PENDING' ? 'CHỜ DUYỆT' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {filteredStaff.map((staff) => {
          const isEditing = editingStaffId === staff.id && editForm;
          
          return (
            <div key={staff.id} className={`group bg-white rounded-[24px] border-2 transition-all relative flex flex-col ${
              isEditing ? 'border-blue-500 shadow-2xl z-10' : 'border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-200 shadow-indigo-100/10'
            }`}>
              <div className="p-6 flex flex-row gap-6 flex-1 min-h-[280px]">
                {/* Left Column: Avatar & Action Buttons */}
                <div className="flex flex-col items-center gap-4 shrink-0">
                  <div className="relative">
                    <div className={`p-1 rounded-[22px] transition-all ${isEditing ? 'ring-4 ring-blue-500/20' : 'group-hover:ring-4 group-hover:ring-gray-100'}`}>
                      <Avatar src={staff.avatar} name={staff.name} size="xl" className="rounded-2xl w-20 h-20 md:w-24 md:h-24" />
                    </div>
                    {!isEditing && (
                      <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-4 border-white ${
                        staff.lastActive && (Date.now() - staff.lastActive < 300000) ? '' : 'grayscale'
                      } ${
                        staff.lastActive && (Date.now() - staff.lastActive < 300000) ? 'animate-pulse' : 'bg-gray-300'
                      } ${
                        staff.lastActive && (Date.now() - staff.lastActive < 300000) ? (
                          staff.status === 'PENDING' ? 'bg-amber-400' :
                          staff.role === 'Admin' ? 'bg-red-500' : 
                          staff.role === 'Leader' ? 'bg-amber-500' : 'bg-green-500'
                        ) : 'bg-gray-300'
                      }`} />
                    )}
                  </div>

                  {/* Move Action Buttons below Avatar */}
                  {isManagerOrAdmin && (
                    <div className="flex flex-col gap-2 w-full">
                      {isEditing ? (
                        <>
                          <button onClick={handleSave} className="w-full h-9 flex items-center justify-center bg-green-500 text-white rounded-xl hover:bg-green-600 transition-all shadow-lg shadow-green-100" title="Lưu">
                            <Save size={16} />
                          </button>
                          <button onClick={handleCancel} className="w-full h-9 flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-all" title="Hủy">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col gap-2 w-full">
                          <button onClick={() => handleEdit(staff)} className="w-full h-9 flex items-center justify-center bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Chỉnh sửa">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setPermissionMatrixUser(staff)}
                            className="w-full h-9 flex items-center justify-center bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all shadow-sm"
                            title="Phân quyền bảo mật"
                          >
                            <Shield size={16} />
                          </button>
                          {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && (
                            <button onClick={() => onSimulateStaff(staff)} className="w-full h-9 flex items-center justify-center bg-amber-50 text-amber-500 rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm" title="Giả lập">
                              <Eye size={16} />
                            </button>
                          )}
                          {currentUser.role === 'Admin' && staff.id !== currentUser.id && (
                            <button onClick={() => onDeleteStaff(staff.id)} className="w-full h-9 flex items-center justify-center bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm" title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Column: Detailed Info */}
                <div className="flex-1 min-w-0 pt-1">
                  {isEditing ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Họ tên nhân sự</label>
                        <input 
                          className="w-full text-base font-black bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={editForm.name}
                          onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Chức vụ</label>
                          <select 
                            className="w-full text-[10px] font-black bg-white border border-gray-100 rounded-xl px-2 py-2 outline-none appearance-none"
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value as UserRoleType})}
                          >
                            <option value="Admin">Admin</option>
                            <option value="Leader">Leader</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                          <input 
                            className="w-full text-[10px] font-black bg-white border border-gray-100 rounded-xl px-2 py-2 outline-none"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Câu hỏi bảo mật</label>
                        <select 
                          className="w-full text-[10px] font-black bg-white border border-gray-100 rounded-xl px-2 py-2 outline-none"
                          value={editForm.securityQuestion}
                          onChange={(e) => setEditForm({...editForm, securityQuestion: e.target.value})}
                        >
                          <option value="">-- Chọn câu hỏi --</option>
                          {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Câu trả lời</label>
                        <input 
                          className="w-full text-[10px] font-black bg-white border border-gray-100 rounded-xl px-2 py-2 outline-none"
                          value={editForm.securityAnswer}
                          onChange={(e) => setEditForm({...editForm, securityAnswer: e.target.value})}
                          placeholder="Nhập câu trả lời..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h3 className="text-xl font-black text-gray-900 tracking-tight leading-tight mb-2 break-words">
                        {staff.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 ml-0.5">Chức danh</span>
                          <span className={`text-[9px] font-black uppercase tracking-[0.1em] px-2 py-1 rounded-lg border shadow-sm ${
                            staff.role === 'Admin' ? 'bg-red-50 text-red-600 border-red-100' : 
                            staff.role === 'Leader' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                            'bg-blue-50 text-blue-600 border-blue-100'
                          }`}>
                            {staff.role}
                          </span>
                        </div>
                        {staff.delegatedPermissions && (() => {
                          const count = Object.values(staff.delegatedPermissions).filter(Boolean).length;
                          if (count === 0) return null;
                          return (
                            <button 
                              onClick={() => setDelegationLetterUser(staff)}
                              className="flex flex-col items-start hover:opacity-80 transition-opacity"
                            >
                              <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest leading-none mb-1 ml-0.5">Phụ trách</span>
                              <span className={`text-[9px] font-black bg-amber-100 text-amber-700 px-2 py-1 rounded-lg border border-amber-200 uppercase tracking-tighter`}>
                                {count === 6 ? 'QUYỀN TP' : `ỦY QUYỀN ${count}/6`}
                              </span>
                            </button>
                          );
                        })()}
                        <div className="flex flex-col">
                           <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1 ml-0.5">Mã NV</span>
                           <span className="text-[10px] font-black text-gray-600 font-mono italic bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg shadow-sm">#{staff.code}</span>
                        </div>
                        {staff.status === 'PENDING' && (
                          <div className="flex flex-col">
                            <span className="text-[7px] font-black text-transparent leading-none mb-1">.</span>
                            <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-1 rounded-lg tracking-widest uppercase shadow-sm">MỚI</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 mt-4">
                    <div className="flex items-center gap-3 group/info">
                      <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 group-hover/info:bg-blue-600 group-hover/info:text-white transition-all">
                        <Phone size={12} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[7.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">Điện thoại</span>
                        <span className="text-sm font-bold text-gray-700 leading-none">{staff.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 group/info">
                      <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center text-green-600 shrink-0 group-hover/info:bg-green-600 group-hover/info:text-white transition-all">
                        <MessageCircle size={12} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[7.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">Zalo / Chat</span>
                        <span className="text-sm font-bold text-gray-700 leading-none">{staff.zalo || staff.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 group/info">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0 group-hover/info:bg-purple-600 group-hover/info:text-white transition-all">
                        <Mail size={12} />
                      </div>
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="text-[7.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">Email công ty</span>
                        <span className="text-[11px] font-semibold text-gray-700 leading-none truncate">{staff.companyEmail}</span>
                      </div>
                    </div>

                    {isManagerOrAdmin && staff.securityQuestion && !isEditing && (
                      <div className="space-y-2 mt-1">
                        <div className="flex items-center gap-3 group/info">
                          <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 group-hover/info:bg-amber-600 group-hover/info:text-white transition-all">
                            <HelpCircle size={12} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[7.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">Câu hỏi bảo mật</span>
                            <span className="text-[9px] font-bold text-gray-700 leading-tight truncate" title={staff.securityQuestion}>{staff.securityQuestion}</span>
                          </div>
                        </div>
                        {staff.securityAnswer && (
                          <div className="flex items-center gap-3 group/info">
                            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center text-red-600 shrink-0 group-hover/info:bg-red-600 group-hover/info:text-white transition-all">
                              <Lock size={12} />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-[7.5px] font-extrabold text-gray-400 uppercase tracking-widest leading-tight">Câu trả lời</span>
                              <span className="text-[9px] font-black text-gray-900 leading-tight truncate bg-gray-50 px-1 inline-block">{staff.securityAnswer}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!isEditing && (
                <div className="px-5 py-4 bg-gray-50/50 flex items-center justify-between border-t border-gray-100 rounded-b-[24px]">
                  <div className="flex items-center gap-2">
                    {staff.delegatedPermissions && Object.values(staff.delegatedPermissions).some(v => v) && (
                      <button 
                        onClick={() => setDelegationLetterUser(staff)}
                        className="h-10 px-4 bg-white border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-2"
                      >
                        <Award size={14} />
                        Giấy ủy quyền
                      </button>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <a 
                      href={`zalo://chat?phone=${staff.phone?.replace(/^0/, '84')}`}
                      className={`w-10 h-10 bg-white rounded-xl border border-green-100 text-green-500 flex items-center justify-center shadow-sm transition-all active:scale-95 group/zalo ${!staff.phone ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-500 hover:text-white'}`}
                      title={staff.phone ? "Mở Zalo PC / App" : "Không có số điện thoại"}
                      onClick={(e) => {
                        if (!staff.phone) {
                          e.preventDefault();
                          return;
                        }
                        // Giao thức zalo:// có thể không hoạt động trên một số trình duyệt nếu không có app
                        // Chúng ta có thể để nó tự xử lý hoặc fallback nếu cần
                      }}
                    >
                      <MessageCircle size={18} className="group-hover/zalo:scale-110 transition-transform" />
                    </a>
                    <a 
                      href={`tel:${staff.phone}`}
                      className="w-10 h-10 bg-white rounded-xl border border-blue-100 text-blue-500 flex items-center justify-center hover:bg-blue-500 hover:text-white shadow-sm transition-all active:scale-95 group/phone"
                      title="Gọi điện"
                    >
                      <Phone size={18} className="group-hover/phone:scale-110 transition-transform" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredStaff.length === 0 && (
        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Không tìm thấy nhân sự phù hợp</p>
        </div>
      )}
    </div>
  );
};
