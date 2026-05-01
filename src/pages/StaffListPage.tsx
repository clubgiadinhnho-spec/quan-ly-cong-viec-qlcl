import React, { useState } from 'react';
import { User, UserRoleType, UserPermissions } from '../types';
import { Search, Mail, Phone, Lock, Download, ClipboardList, Filter, Eye, Award, Plus, X, Trash2, Edit, EyeOff, QrCode, Upload, Camera } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { PermissionMatrixModal } from '../components/staff/PermissionMatrixModal';
import { DelegationLetterModal } from '../components/staff/DelegationLetterModal';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

interface StaffListPageProps {
  users: User[];
  currentUser: User;
  onSimulateStaff?: (user: User) => void;
  originalUser?: User | null;
  onSendToUser?: (msg: string, targetId: string) => void;
  onSendToGroup?: (msg: string) => void;
  onAddStaff?: (user: User) => void;
  onUpdateStaff?: (userId: string, updates: Partial<User>) => void;
  onDeleteStaff?: (userId: string) => void;
}

export const StaffListPage: React.FC<StaffListPageProps> = ({ 
  users, 
  currentUser, 
  onSimulateStaff, 
  originalUser,
  onSendToUser,
  onSendToGroup,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff
}) => {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | UserRoleType>('All');
  const [delegationLetterUser, setDelegationLetterUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const togglePassword = (id: string) => {
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [formData, setFormData] = useState<Partial<User>>({
    name: '',
    role: 'Staff',
    phone: '',
    companyEmail: '',
    personalEmail: '',
    code: '',
    abbreviation: '',
    status: 'ACTIVE'
  });

  const filteredStaff = users.filter(s => {
    if (!s) return false;
    const name = s.name || '';
    const phone = s.phone || '';
    const email = s.companyEmail || '';
    const code = s.code || '';

    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                         phone.includes(search) || 
                         email.toLowerCase().includes(search.toLowerCase()) ||
                         code.toLowerCase().includes(search.toLowerCase());
    
    let matchesRole = true;
    if (filterRole !== 'All') {
      matchesRole = s.role === filterRole;
    }
    
    return matchesSearch && matchesRole;
  });

  const roles: (UserRoleType | 'All')[] = ['All', 'Admin', 'Leader', 'Staff'];

  const handleExport = () => {
    const headers = ['Mã NV', 'Họ Tên', 'Viết tắt', 'Chức vụ', 'SĐT', 'Zalo', 'Email Cơ quan', 'Email Cá nhân', 'Trạng thái'];
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
        u.status
      ].join(','))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Bao_cao_nhan_su_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.csv`;
    link.click();
  };

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.companyEmail) return;

    if (editingStaff) {
      onUpdateStaff?.(editingStaff.id, formData);
      setEditingStaff(null);
    } else {
      const nameNoAccents = removeAccents(formData.name).replace(/\s+/g, '');
      const uniqueKey = `${nameNoAccents}${formData.phone}`;
      
      const newStaff: User = {
        ...(formData as User),
        id: `EXTRA_${Date.now()}`,
        uniqueKey,
        avatar: formData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${nameNoAccents}`
      };
      onAddStaff?.(newStaff);
    }
    setShowAddModal(false);
    setFormData({ name: '', role: 'Staff', phone: '', companyEmail: '', personalEmail: '', code: '', abbreviation: '', status: 'ACTIVE', avatar: '' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {delegationLetterUser && (
        <DelegationLetterModal 
          user={delegationLetterUser}
          manager={currentUser}
          onClose={() => setDelegationLetterUser(null)}
          onSendToUser={(msg) => onSendToUser?.(msg, delegationLetterUser.id)}
          onSendToGroup={onSendToGroup}
        />
      )}

      <AnimatePresence>
        {(showAddModal || editingStaff) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowAddModal(false); setEditingStaff(null); }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                     {editingStaff ? 'CẬP NHẬT NHÂN SỰ' : 'THÊM NHÂN SỰ MỚI'}
                   </h2>
                   <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Dữ liệu sẽ được lưu trữ trên Firestore</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingStaff(null); }} className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-full hover:bg-gray-100 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-4">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-blue-50 shadow-lg bg-slate-50">
                      <Avatar 
                        src={formData.avatar || (formData.name ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${removeAccents(formData.name)}` : '')} 
                        name={formData.name || 'Avatar'} 
                        size="full" 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:bg-blue-700 transition-colors border-2 border-white">
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAvatarUpload(e, !!editingStaff)} />
                      <Camera size={14} />
                    </label>
                  </div>
                  <p className="text-[10px] font-black text-blue-600 uppercase mt-3 tracking-widest">Tải lên ảnh thẻ</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Họ và tên</label>
                    <input 
                      type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                      placeholder="Nhập tên đầy đủ"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Số điện thoại</label>
                    <input 
                      type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                      placeholder="09xxx..."
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Vai trò</label>
                    <select 
                      value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRoleType})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm appearance-none"
                    >
                      <option value="Staff">Nhân viên (Staff)</option>
                      <option value="Leader">Nhóm trưởng (Leader)</option>
                      <option value="Admin">Quản trị (Admin)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Email Công ty</label>
                    <input 
                      type="email" required value={formData.companyEmail} onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                      placeholder="xyz@tanphu.vn"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Mã NV</label>
                    <input 
                      type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                      placeholder="QC-xxx"
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                   <button 
                     type="button" onClick={() => { setShowAddModal(false); setEditingStaff(null); }}
                     className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all font-mono"
                   >
                     Hủy bỏ
                   </button>
                   <button 
                     type="submit"
                     className="flex-3 py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                   >
                     {editingStaff ? 'Lưu thay đổi' : 'Xác nhận tạo mới'}
                   </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ClipboardList size={18} />
            </div>
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]">Hệ thống nhân sự</span>
          </div>
          <h1 className="text-[24px] font-black text-gray-900 tracking-tight uppercase leading-none">NHÂN SỰ ĐĂNG KÝ</h1>
          <p className="text-sm text-gray-500 mt-2 font-medium italic">Danh sách nhân sự đã đăng ký và đồng bộ hệ thống.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col items-end px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tổng nhân lượng</span>
            <span className="text-xl font-black text-gray-900">{users.length}</span>
          </div>

          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-6 py-4 bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-sm active:scale-95"
          >
            <Download size={16} />
            CSV
          </button>

          {currentUser.role === 'Admin' && (
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
            >
              <Plus size={16} />
              Thêm nhân sự mới
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-2 rounded-[24px] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, mã NV..."
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
                {role === 'All' ? 'TẤT CẢ' : role}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {filteredStaff.map((staff) => {
          const isHardcoded = staff.id.startsWith('ADMIN_') || staff.id.startsWith('STAFF_') || staff.id.startsWith('LEADER_');
          const isTruong = currentUser.name === 'Lê Nhật Trường';
          const isVisible = visiblePasswords[staff.id];
          
          return (
            <motion.div 
              key={staff.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group bg-white rounded-[32px] border-2 border-slate-100 shadow-sm hover:shadow-2xl hover:border-blue-400 transition-all relative flex flex-col md:flex-row overflow-hidden min-h-[280px]"
            >
              {/* Left Section: Identity & Actions */}
              <div className="md:w-1/3 bg-slate-50/50 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 relative shrink-0">
                <div className="relative group/avatar">
                  <div className="w-24 h-24 p-1.5 rounded-[28px] bg-white shadow-xl ring-4 ring-white group-hover/avatar:ring-blue-500 transition-all overflow-hidden">
                    <Avatar src={staff.avatar} name={staff.name} size="full" className="rounded-[20px] w-full h-full object-cover" />
                  </div>
                  {!isHardcoded && (
                     <div className="absolute -top-1 -right-1 bg-blue-600 text-white p-1.5 rounded-lg shadow-lg border-2 border-white" title="Nhân sự mở rộng">
                        <Plus size={10} strokeWidth={4} />
                     </div>
                  )}
                  {isTruong && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover/avatar:opacity-100 rounded-[28px] cursor-pointer transition-opacity backdrop-blur-[1px]">
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                             const reader = new FileReader();
                             reader.onloadend = () => onUpdateStaff?.(staff.id, { avatar: reader.result as string });
                             reader.readAsDataURL(file);
                          }
                        }} 
                      />
                      <Camera size={20} />
                    </label>
                  )}
                </div>

                <div className="mt-4 flex flex-col items-center gap-2">
                   <span translate="no" className="notranslate text-[10px] font-black text-slate-500 font-mono italic bg-white border border-slate-100 px-3 py-1 rounded-full shadow-sm">#{staff.code}</span>
                   {isTruong && (
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => { setEditingStaff(staff); setFormData({...staff}); }} className="w-9 h-9 flex items-center justify-center bg-white shadow-sm border border-blue-100 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => onDeleteStaff?.(staff.id)} className="w-9 h-9 flex items-center justify-center bg-white shadow-sm border border-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                   )}
                </div>
              </div>

              {/* Right Section: Details */}
              <div className="flex-1 p-8 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="min-w-0">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase group-hover:text-blue-600 transition-colors">
                        <span translate="no" className="notranslate">{staff.name}</span>
                      </h3>
                      <span className={`inline-block mt-1 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border shadow-sm ${
                        staff.role === 'Admin' ? 'bg-red-50 text-red-600 border-red-100' : 
                        staff.role === 'Leader' ? 'bg-amber-50 text-amber-600 border-amber-100' : 
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {staff.role}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-100 shadow-sm group-hover:scale-110 transition-transform origin-right" title="Mã QR định danh">
                      <QRCodeSVG 
                        value={`NHÂN VIÊN: ${staff.name}\nMÃ NV: ${staff.code}\nSĐT: ${staff.phone}\nEMAIL: ${staff.companyEmail}\nPASS: 123456`}
                        size={48}
                        level="H"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 border border-blue-100/50">
                        <Phone size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Điện thoại</span>
                        <span translate="no" className="notranslate text-sm font-bold text-slate-700">{staff.phone}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200/50">
                        <Lock size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Mật khẩu</span>
                        <div className="flex items-center gap-2">
                          <span translate="no" className="notranslate text-sm font-mono font-black text-slate-600">
                            {isVisible ? '123456' : '••••••'}
                          </span>
                          <button onClick={() => togglePassword(staff.id)} className="text-slate-400 hover:text-blue-600 transition-colors">
                            {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0 border border-indigo-100/50">
                        <Mail size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Công ty</span>
                        <span translate="no" className="notranslate text-[12px] font-bold text-slate-600 break-all leading-tight">{staff.companyEmail}</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 border border-emerald-100/50">
                        <Mail size={14} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Email Cá nhân</span>
                        <span translate="no" className="notranslate text-[12px] font-bold text-slate-600 break-all leading-tight">{staff.personalEmail}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && (
                    <button 
                      onClick={() => onSimulateStaff(staff)} 
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg"
                    >
                      <Eye size={14} />
                      GIẢ LẬP
                    </button>
                  )}
                  {staff.delegatedPermissions && Object.values(staff.delegatedPermissions).some(v => v) && (
                    <button 
                      onClick={() => setDelegationLetterUser(staff)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-200 transition-all"
                    >
                      <Award size={14} />
                      ỦY QUYỀN
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
