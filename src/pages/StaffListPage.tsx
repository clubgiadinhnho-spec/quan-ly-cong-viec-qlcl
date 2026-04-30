import React, { useState } from 'react';
import { User, UserRoleType, UserPermissions } from '../types';
import { Search, Mail, Phone, MessageCircle, X, Save, Edit2, Trash2, Shield, HelpCircle, Lock, Download, ClipboardList, FileText, Filter, Eye } from 'lucide-react';
import { SECURITY_QUESTIONS } from '../constants';

import { Avatar } from '../components/common/Avatar';
import { PermissionMatrixModal } from '../components/staff/PermissionMatrixModal';

interface StaffListPageProps {
  users: User[];
  onUpdateStaff: (staff: User) => void;
  onDeleteStaff: (id: string) => void;
  currentUser: User;
  onSimulateStaff?: (user: User) => void;
  originalUser?: User | null;
}

export const StaffListPage: React.FC<StaffListPageProps> = ({ users, onUpdateStaff, onDeleteStaff, currentUser, onSimulateStaff, originalUser }) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | UserRoleType | 'PENDING'>('All');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<User | null>(null);
  const [permissionMatrixUser, setPermissionMatrixUser] = useState<User | null>(null);

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
      onUpdateStaff({
        ...permissionMatrixUser,
        delegatedPermissions: permissions
      });
      setPermissionMatrixUser(null);
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

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
// ... Header ...
         <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight uppercase">DANH SÁCH CÁN BỘ CÔNG NHÂN VIÊN</h1>
            <p className="text-sm text-gray-500 mt-1">Quản lý thông tin liên hệ và chức vụ nhân sự</p>
         </div>
         {isManagerOrAdmin && (
           <button 
             onClick={handleExport}
             className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 shrink-0"
           >
             <Download size={16} />
             Xuất báo cáo
           </button>
         )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4">
// ... Filter controls ...
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, mã NV, tên viết tắt..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white transition-all text-sm font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter size={16} className="text-gray-400 shrink-0" />
          <div className="flex gap-1 shrink-0">
            {roles.map(role => (
              <button
                key={role}
                onClick={() => setFilterRole(role)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  filterRole === role 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {role === 'All' ? 'TẤT CẢ' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStaff.map((staff) => {
          const isEditing = editingStaffId === staff.id && editForm;
          const hasDelegatedPermissions = staff.delegatedPermissions && Object.values(staff.delegatedPermissions).some(v => v);
          
          return (
            <div key={staff.id} className={`bg-white rounded-2xl border-2 transition-all overflow-hidden group ${
              isEditing ? 'border-blue-500 shadow-xl' : 'border-gray-100 shadow-sm hover:shadow-md'
            }`}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar src={staff.avatar} name={staff.name} size="xl" className="rounded-2xl" />
                      {!isEditing && (
                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                          staff.lastActive && (Date.now() - staff.lastActive < 120000) ? 'animate-pulse ring-2 ring-blue-400 ring-offset-2' : ''
                        } ${
                          staff.status === 'PENDING' ? 'bg-amber-400' :
                          staff.role === 'Admin' ? 'bg-red-500' : 
                          staff.role === 'Leader' ? 'bg-amber-500' : 'bg-green-500'
                        }`} title={staff.lastActive && (Date.now() - staff.lastActive < 120000) ? 'Đang trực tuyến' : 'Ngoại tuyến'} />
                      )}
                    </div>
                    {isEditing ? (
// ... Edit name fields ...
                      <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Tên & Viết tắt</label>
                          <input 
                            className="text-sm font-bold border-b border-blue-200 outline-none w-full bg-blue-50/20 px-1"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            placeholder="Họ và tên"
                          />
                          <input 
                            className="text-[10px] uppercase font-black text-blue-600 border-b border-blue-100 outline-none w-full bg-blue-50/20 px-1"
                            value={editForm.abbreviation}
                            onChange={(e) => setEditForm({...editForm, abbreviation: e.target.value})}
                            placeholder="Tên viết tắt"
                          />
                        </div>
                        <div className="flex flex-col gap-1 pt-1">
                          <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Link Ảnh đại diện</label>
                          <input 
                            className="text-[10px] border-b border-blue-100 outline-none w-full bg-blue-50/20 px-1 py-1"
                            value={editForm.avatar}
                            onChange={(e) => setEditForm({...editForm, avatar: e.target.value})}
                            placeholder="URL hình ảnh..."
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center gap-2 text-wrap">
                          <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{staff.name}</h3>
                          {staff.status === 'PENDING' && (
                            <span className="text-[8px] font-black bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded tracking-widest uppercase">Chờ duyệt</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${hasDelegatedPermissions ? 'text-amber-600' : 'text-gray-400'}`}>
                            {staff.role} {hasDelegatedPermissions && <span className="text-amber-500 font-black ml-0.5 underline decoration-double decoration-amber-200 underline-offset-2">(QUYỀN TP)</span>}
                          </p>
                          <span className="text-[10px] font-black text-blue-400 px-1.5 py-0.5 bg-blue-50 rounded italic">{staff.abbreviation}</span>
                          {staff.securityQuestion && (
                            <Shield size={10} className="text-blue-400" title="Đã thiết lập bảo mật" />
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-blue-600 mt-1">Mã NV: {staff.code}</p>
                      </div>
                    )}
                  </div>
// ... Action buttons ...
                  {isManagerOrAdmin && (
                    <div className="flex gap-1">
                      {isEditing ? (
                        <>
                          <button onClick={handleSave} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Lưu">
                            <Save size={18} />
                          </button>
                          <button onClick={handleCancel} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Hủy">
                            <X size={18} />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center gap-1">
                          {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && (
                            <button 
                              onClick={() => onSimulateStaff(staff)} 
                              className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1"
                              title="Giả lập nhân viên"
                            >
                              <Eye size={18} />
                              <span className="text-[10px] font-black uppercase hidden lg:inline">Giả lập</span>
                            </button>
                          )}
                          {currentUser.role === 'Admin' && staff.id !== currentUser.id && (
                             <button 
                                onClick={() => setPermissionMatrixUser(staff)}
                                className={`p-2 rounded-lg transition-all ${hasDelegatedPermissions ? 'text-amber-600 bg-amber-50' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`} 
                                title="Phân quyền Ma trận"
                             >
                                <Shield size={18} />
                             </button>
                          )}
                          <button onClick={() => handleEdit(staff)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Chỉnh sửa">
                            <Edit2 size={18} />
                          </button>
                          {currentUser.role === 'Admin' && staff.id !== currentUser.id && (
                            <button 
                              onClick={() => onDeleteStaff(staff.id)}
                              className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" 
                              title="Xóa nhân sự"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
// ... rest of the card ...
                <div className="space-y-3 pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Phone size={14} className="text-gray-400 shrink-0" />
                    {isEditing ? (
                      <input 
                        className="font-medium bg-blue-50/50 rounded px-2 py-0.5 w-full outline-none"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      />
                    ) : (
                      <span className="font-medium">{staff.phone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <MessageCircle size={14} className="text-green-500 shrink-0" />
                    {isEditing ? (
                      <div className="flex items-center gap-1 w-full">
                        <span className="text-[10px] text-gray-400">Zalo:</span>
                        <input 
                          className="font-medium bg-blue-50/50 rounded px-2 py-0.5 w-full outline-none"
                          value={editForm.zalo || ''}
                          onChange={(e) => setEditForm({...editForm, zalo: e.target.value})}
                        />
                      </div>
                    ) : (
                      <span className="font-medium">Zalo: {staff.zalo || staff.phone}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Mail size={14} className="text-gray-400 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black text-gray-300 uppercase leading-none mb-1">Cơ quan</span>
                      {isEditing ? (
                        <input 
                          className="font-medium bg-blue-50/50 rounded px-2 py-0.5 w-full outline-none"
                          value={editForm.companyEmail}
                          onChange={(e) => setEditForm({...editForm, companyEmail: e.target.value})}
                        />
                      ) : (
                        <span className="font-medium truncate">{staff.companyEmail}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-600">
                    <Mail size={14} className="text-gray-400 opacity-50 shrink-0" />
                    <div className="flex flex-col flex-1">
                      <span className="text-[10px] font-black text-gray-300 uppercase leading-none mb-1">Cá nhân</span>
                      {isEditing ? (
                        <input 
                          className="font-medium bg-blue-50/50 rounded px-2 py-0.5 w-full outline-none"
                          value={editForm.personalEmail}
                          onChange={(e) => setEditForm({...editForm, personalEmail: e.target.value})}
                        />
                      ) : (
                        <span className="font-medium truncate">{staff.personalEmail}</span>
                      )}
                    </div>
                  </div>
                  {isEditing && (
                    <>
                      <div className="pt-4 border-t border-blue-50 space-y-3">
                        <div className="flex items-center gap-2">
                           <ClipboardList size={14} className="text-blue-600" />
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Hồ sơ năng lực / CV</span>
                        </div>
                        <div className="space-y-2">
                          <input 
                            className="w-full text-xs font-medium bg-blue-50/20 border border-blue-100 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                            value={editForm.cvUrl || ''}
                            onChange={(e) => setEditForm({...editForm, cvUrl: e.target.value})}
                            placeholder="Link CV (Google Drive, LinkedIn...)"
                          />
                          <textarea 
                            className="w-full text-xs font-medium bg-blue-50/20 border border-blue-100 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 min-h-[100px] resize-none"
                            value={editForm.cvDetails || ''}
                            onChange={(e) => setEditForm({...editForm, cvDetails: e.target.value})}
                            placeholder="Chi tiết kinh nghiệm, chứng chỉ, đào tạo..."
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-blue-50 space-y-3">
                        <div className="flex items-center gap-2">
                           <Shield size={14} className="text-blue-600" />
                           <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">Thiết lập bảo mật</span>
                        </div>
                        <div className="space-y-3">
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1.5 ml-1">
                                 <HelpCircle size={10} /> Câu hỏi bảo mật
                              </label>
                              <select 
                                className="w-full text-xs font-bold bg-blue-50/20 border border-blue-100 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                value={editForm.securityQuestion || SECURITY_QUESTIONS[0]}
                                onChange={(e) => setEditForm({...editForm, securityQuestion: e.target.value})}
                              >
                                {SECURITY_QUESTIONS.map(q => <option key={q} value={q}>{q}</option>)}
                                <option value="custom">-- Câu hỏi khác --</option>
                              </select>
                              {(editForm.securityQuestion === 'custom' || !SECURITY_QUESTIONS.includes(editForm.securityQuestion || '')) && (
                                <input 
                                  className="w-full mt-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-lg px-2 py-2 outline-none focus:bg-white"
                                  value={editForm.securityQuestion || ''}
                                  onChange={(e) => setEditForm({...editForm, securityQuestion: e.target.value})}
                                  placeholder="Nhập câu hỏi tự chọn..."
                                />
                              )}
                           </div>
                           <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase flex items-center gap-1.5 ml-1">
                                 <Lock size={10} /> Câu trả lời bí mật
                              </label>
                              <input 
                                className="w-full text-xs font-bold bg-blue-50/20 border border-blue-100 rounded-lg px-2 py-2 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                                value={editForm.securityAnswer || ''}
                                onChange={(e) => setEditForm({...editForm, securityAnswer: e.target.value})}
                                placeholder="Nhập câu trả lời..."
                              />
                           </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-50 mt-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-gray-300 uppercase">Chức vụ</span>
                          <select 
                            className="text-xs font-bold bg-blue-50/50 rounded px-2 py-1 outline-none"
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value as UserRoleType})}
                          >
                            {['Admin', 'Leader', 'Staff'].map(r => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-black text-gray-300 uppercase">Trạng thái</span>
                          <select 
                            className="text-xs font-bold bg-blue-50/50 rounded px-2 py-1 outline-none"
                            value={editForm.status}
                            onChange={(e) => setEditForm({...editForm, status: e.target.value as any})}
                          >
                            <option value="PENDING">Chờ duyệt</option>
                            <option value="ACTIVE">Hoạt động</option>
                            <option value="INACTIVE">Khóa</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
// ... Footer ...
              {!isEditing && (
                <div className="px-6 py-3 bg-gray-50 flex items-center justify-between">
                  {staff.status === 'PENDING' && isManagerOrAdmin ? (
                    <button 
                      onClick={() => handleApprove(staff)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-md shadow-green-100"
                    >
                      <Save size={12} />
                      Phê duyệt ngay
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          if (staff.cvDetails || staff.cvUrl) {
                            const details = staff.cvDetails || 'Chưa có thông tin chi tiết.';
                            const url = staff.cvUrl ? `\nLink: ${staff.cvUrl}` : '';
                            alert(`HỒ SƠ NĂNG LỰC: ${staff.name}\n\n${details}${url}`);
                          } else {
                            handleEdit(staff);
                          }
                        }}
                        className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-1"
                      >
                        <FileText size={12} />
                        Hồ sơ chi tiết
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <a href={`tel:${staff.phone}`} className="p-2 bg-white rounded-lg border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all">
                      <Phone size={14} />
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
