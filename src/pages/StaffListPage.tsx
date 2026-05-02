import React, { useState } from 'react';
import { User, UserRoleType, UserPermissions } from '../types';
import { Search, Mail, Phone, Lock, Download, ClipboardList, Filter, Eye, Award, Plus, X, Trash2, Edit, EyeOff, QrCode, Upload, Camera, Shield, ShieldCheck, Users, AlertCircle, CheckCircle2, MessageSquare, MessageCircle, PhoneIncoming, UserCircle } from 'lucide-react';
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

const getRoleBgColor = (name: string) => {
  const title = getHardcodedTitle(name);
  const normName = name.trim();
  // Admin & Lê Nhật Trường -> Đỏ
  if (normName === 'Lê Nhật Trường' || normName === 'Quản Trị Viên' || title === 'ADMIN') return 'bg-[#FF3B30]'; 
  // Leader -> Cam
  if (title === 'TRƯỞNG NHÓM (LEADER)') return 'bg-[#FF9500]'; 
  // Staff -> Xanh lá
  return 'bg-[#00C16E]'; 
};

const getRoleBadgeStyle = (name: string) => {
  return 'bg-white/20 text-white border-white/30';
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
              className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className={`h-1.5 w-full ${editingStaff ? 'bg-blue-600' : 'bg-blue-600'}`} />
              
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div>
                   <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                     {editingStaff ? 'CẬP NHẬT NHÂN SỰ' : 'THÊM NHÂN SỰ MỚI'}
                   </h2>
                   <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-widest">Dữ liệu sẽ được đồng bộ trên hệ thống</p>
                </div>
                <button onClick={() => { setShowAddModal(false); setEditingStaff(null); }} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 hover:text-slate-600 transition-all">
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

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-4">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <ClipboardList size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] block leading-none mb-1">Cơ sở dữ liệu</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">QUẢN LÝ NHÂN SỰ</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-md">Quản trị và điều phối đội ngũ QC Tân Phú. Dữ liệu nhân lực được bảo mật và phân quyền nghiêm ngặt.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end px-6 py-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Nhân sự hiện hữu</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 leading-none">{users.length}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Thành viên</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleExport}
              className="group flex items-center gap-2 px-5 py-3.5 bg-white text-slate-600 border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
              Tải CSV
            </button>

            {currentUser.role === 'Admin' && (
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-200 active:scale-95"
              >
                <Plus size={18} />
                Thêm nhân sự
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-3 rounded-[28px] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-focus-within:bg-blue-50 group-focus-within:text-blue-500 transition-colors">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm theo tên, SĐT, mã nhân sự..."
            className="w-full pl-16 pr-4 py-4 bg-transparent outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300 placeholder:font-medium"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50/80 rounded-[22px] px-2 py-1.5 border border-slate-50">
          {roles.map(role => (
            <button
              key={role}
              onClick={() => setFilterRole(role)}
              className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                filterRole === role 
                  ? 'bg-white text-blue-600 shadow-md shadow-blue-50' 
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              {role === 'All' ? 'TẤT CẢ' : role}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 2xl:grid-cols-2 gap-8 pb-32">
        {filteredStaff.map((staff) => {
          const isVisible = visiblePasswords[staff.id];
          const isTruong = currentUser.role === 'Admin' || currentUser.personalEmail === 'lenhattruong.tpp@gmail.com';

          return (
            <motion.div
              key={staff.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`group ${getRoleBgColor(staff.name)} rounded-[32px] shadow-2xl transition-all duration-300 relative flex flex-col p-5 overflow-hidden border-4 border-white/20`}
            >
              {/* Top Section: Name & Category */}
              <div className="mb-4 border-b border-white/10 pb-3">
                <h3 className="text-[22px] font-black text-white tracking-normal uppercase leading-tight mb-1 drop-shadow-sm">
                  <span translate="no" className="notranslate">{staff.name}</span>
                </h3>
                <div className="flex items-center justify-between">
                  <div className="px-2 py-0.5 rounded-lg bg-white/20 border border-white/10">
                    <span className="text-[12px] font-black text-white uppercase tracking-widest">
                      {getHardcodedTitle(staff.name)}
                    </span>
                  </div>
                  <span className="text-[18px] font-mono font-black text-white">
                    MÃ NHÂN VIÊN: #{staff.code}
                  </span>
                </div>
              </div>

              {/* Middle Section: Avatar and Info Boxes aligned */}
              <div className="grid grid-cols-12 gap-5">
                {/* Left Column: Avatar & Action Buttons Stacked */}
                <div className="col-span-3 flex flex-col gap-3">
                  <div className="relative aspect-square rounded-[24px] overflow-hidden border-2 border-white/40 shadow-xl bg-white/10 backdrop-blur-sm">
                    <Avatar src={staff.avatar} name={staff.name} size="full" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    {isTruong && (
                      <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-white">
                        <input 
                          type="file" className="hidden" accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (loadEvent) => onUpdateStaff?.(staff.id, { avatar: loadEvent.target?.result as string });
                              reader.readAsDataURL(file);
                            }
                          }} 
                        />
                        <Camera size={20} />
                      </label>
                    )}
                  </div>
                  
                  {/* Action Buttons Stack below Avatar */}
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setEditingStaff(staff); setFormData({...staff}); }}
                        className="h-10 rounded-xl bg-white text-slate-600 flex items-center justify-center hover:bg-white/90 transition-all shadow-lg active:scale-95 border border-white"
                        title="Chỉnh sửa"
                      >
                        <Edit size={16} />
                      </button>
                      {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && (
                        <button 
                          onClick={() => onSimulateStaff(staff)}
                          className="h-10 bg-white text-slate-900 rounded-xl shadow-xl hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center border border-slate-100"
                          title="Ủy quyền"
                        >
                          <ShieldCheck size={16} />
                        </button>
                      )}
                    </div>
                    {isTruong && (
                      <button 
                        onClick={() => onDeleteStaff?.(staff.id)}
                        className="w-full h-10 rounded-xl bg-white text-red-500 hover:text-red-600 transition-all shadow-lg active:scale-95 flex items-center justify-center border border-red-50"
                        title="Xóa"
                      >
                        <Trash2 size={16} />
                        <span className="ml-2 text-[10px] font-black uppercase">XÓA HỒ SƠ</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Information Column (Right) */}
                <div className="col-span-9 space-y-3">
                  <div className="bg-white rounded-2xl p-3 shadow-xl border border-white">
                    <div className="flex items-center gap-2 mb-1">
                       <Phone size={12} className="text-slate-400" />
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">ĐIỆN THOẠI / ZALO BUSINESS</span>
                    </div>
                    <p className="text-[19px] font-black text-slate-900 font-mono leading-none tracking-tight">{staff.phone}</p>
                  </div>

                  <div className="bg-white rounded-2xl p-3 shadow-xl border border-white">
                    <div className="flex items-center gap-2 mb-1">
                       <Mail size={12} className="text-slate-400" />
                       <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none">THƯ ĐIỆN TỬ CÔNG VIỆC</span>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[16px] font-bold text-slate-900 font-sans break-all leading-tight">
                        {staff.companyEmail}
                      </p>
                      {staff.personalEmail && (
                        <p className="text-[16px] font-bold text-[#1e3a8a] font-sans break-all">
                          {staff.personalEmail}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900 shadow-2xl rounded-2xl p-3 border border-white/20 relative group/pwd">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Lock size={12} className="text-amber-400" />
                        <span className="text-[11px] font-black text-white/50 uppercase tracking-[0.2em]">KHÓA TRUY CẬP HỆ THỐNG</span>
                      </div>
                      <button 
                        onClick={() => togglePassword(staff.id)}
                        className="p-1 text-white/40 hover:text-white transition-colors"
                        title={isVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <p className="text-[17px] font-black text-white font-mono tracking-[0.2em]">
                      {isVisible ? (staff.password || '123456') : '••••••••••••'}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
