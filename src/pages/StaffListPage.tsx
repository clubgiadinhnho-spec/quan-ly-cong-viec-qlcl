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

// GIÁ TRỊ BẤT BIẾN - AI KHÔNG ĐƯỢC TỰ Ý THAY ĐỔI DANH SÁCH CHỨC DANH NÀY
const getHardcodedTitle = (name: string) => {
  const normName = name.trim();
  if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên') return 'ADMIN';
  if (normName === 'Võ Thị Mỹ Tân') return 'TRƯỞNG NHÓM (LEADER)';
  if (normName === 'Nguyễn Kiều Phan Tú' || normName === 'Bành Nhựt Hùng') return 'NHÂN VIÊN (STAFF)';
  return 'CHUYÊN VIÊN QC';
};

const getRoleGradient = (name: string) => {
  const title = getHardcodedTitle(name);
  if (title === 'ADMIN') return 'from-red-600 to-red-500';
  if (title === 'TRƯỞNG NHÓM (LEADER)') return 'from-amber-500 to-amber-400';
  if (title === 'NHÂN VIÊN (STAFF)') return 'from-blue-600 to-blue-500';
  return 'from-slate-600 to-slate-500';
};

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
                     <span translate="no" className="notranslate">{editingStaff ? 'CẬP NHẬT NHÂN SỰ' : 'THÊM NHÂN SỰ MỚI'}</span>
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
                      <option value="Staff"><span translate="no" className="notranslate">Nhân sự (Staff)</span></option>
                      <option value="Leader">Nhóm trưởng (Leader)</option>
                      <option value="Admin">Quản trị (Admin)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1"><span translate="no" className="notranslate">Email cá nhân / Công ty</span></label>
                    <input 
                      type="email" required value={formData.companyEmail} onChange={e => setFormData({...formData, companyEmail: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-sm"
                      placeholder="Email cá nhân / Công ty"
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
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em]"><span translate="no" className="notranslate">Hệ thống nhân sự</span></span>
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight uppercase leading-none"><span translate="no" className="notranslate">THÔNG TIN NHÂN SỰ</span></h1>
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
              <span translate="no" className="notranslate">Thêm nhân sự mới</span>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
        {filteredStaff.map((staff) => {
          const isTruong = currentUser.personalEmail === 'lenhattruong.tpp@gmail.com';
          const isVisible = visiblePasswords[staff.id];
          
          return (
            <motion.div 
              key={staff.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group bg-white rounded-[40px] border-2 border-slate-100 shadow-sm hover:shadow-2xl transition-all relative flex flex-col overflow-hidden w-full"
            >
              {/* Header Strip */}
              <div className={`h-20 w-full relative bg-gradient-to-r ${getRoleGradient(staff.name)}`}>
                {isTruong && (
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button onClick={() => { setEditingStaff(staff); setFormData({...staff}); }} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => onDeleteStaff?.(staff.id)} className="p-2 bg-white/20 hover:bg-white/40 text-white rounded-lg transition-colors backdrop-blur-sm">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Identity Section */}
              <div className="flex flex-col items-center -mt-14 px-6 pb-6 relative z-10">
                <div className="relative">
                  <div className="w-28 h-28 p-1 rounded-full bg-white shadow-xl ring-2 ring-white overflow-hidden relative">
                    <Avatar src={staff.avatar} name={staff.name} size="full" className="rounded-full w-full h-full object-cover" />
                  </div>
                  {isTruong && (
                    <label className="absolute inset-0 bg-black/30 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
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
                      <Camera size={24} />
                    </label>
                  )}
                </div>

                <div className="text-center mt-4 w-full">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight uppercase mb-1">
                    <span translate="no" className="notranslate">{staff.name}</span>
                  </h3>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-widest">
                      <span translate="no" className="notranslate">{getHardcodedTitle(staff.name)}</span>
                    </p>
                    <span translate="no" className="notranslate text-[10px] font-mono font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                      MÃ NV: {staff.code}
                    </span>
                  </div>
                </div>

                {/* Details Section */}
                <div className="w-full mt-6 space-y-3 border-t border-slate-50 pt-5">
                  <div className="flex items-center justify-between text-[10px] font-black uppercase">
                    <span className="text-slate-400 tracking-wider flex items-center gap-2"><Phone size={14} className="text-blue-500" /> <span translate="no" className="notranslate">SỐ ĐIỆN THOẠI / ZALO</span></span>
                    <span translate="no" className="notranslate text-slate-700 font-mono tracking-tighter">{staff.phone}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-slate-400 uppercase tracking-wider flex items-center gap-2"><Mail size={14} className="text-red-500" /> EMAIL CT</span>
                    <span translate="no" className="notranslate text-slate-700 break-all ml-4 text-right truncate max-w-[150px] font-mono tracking-tighter">{staff.companyEmail}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-slate-400 uppercase tracking-wider flex items-center gap-2"><Mail size={14} className="text-emerald-500" /> EMAIL CN</span>
                    <span translate="no" className="notranslate text-slate-700 break-all ml-4 text-right truncate max-w-[150px] font-mono tracking-tighter">{staff.personalEmail}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black">
                    <span className="text-slate-400 uppercase tracking-wider flex items-center gap-2"><Lock size={14} className="text-slate-500" /> <span translate="no" className="notranslate">MẬT KHẨU</span></span>
                    <div className="flex items-center gap-2">
                       <span translate="no" className="notranslate text-slate-700 font-mono">
                        {isVisible ? (staff.password || '123456') : '••••••'}
                       </span>
                       <button onClick={() => togglePassword(staff.id)} className="text-slate-300 hover:text-blue-600 transition-colors">
                        {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                       </button>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="mt-6 flex flex-col items-center">
                  <div className="p-2 bg-white rounded-2xl border-2 border-slate-100 shadow-xl group-hover:scale-105 transition-transform duration-500">
                    <QRCodeSVG 
                      value={`NHÂN VIÊN: ${staff.name}\nMÃ NV: ${staff.code}\nSĐT: ${staff.phone}\nEMAIL: ${staff.companyEmail}\nPASS: ${staff.password || '123456'}`}
                      size={70}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em] mt-2 italic">HỆ THỐNG ĐỊNH DANH QLCL</p>
                </div>

                <div className="mt-5 flex flex-col gap-2 w-full">
                  {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && (
                    <button 
                      onClick={() => onSimulateStaff(staff)} 
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                      <Eye size={14} />
                      GIẢ LẬP TƯ CÁCH
                    </button>
                  )}
                  {staff.delegatedPermissions && Object.values(staff.delegatedPermissions).some(v => v) && (
                    <button 
                      onClick={() => setDelegationLetterUser(staff)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
                    >
                      <Award size={14} />
                      XEM ỦY QUYỀN
                    </button>
                  )}
                </div>
              </div>

              {/* Decoration Elements */}
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-50 rounded-tl-full -z-0 opacity-50" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
