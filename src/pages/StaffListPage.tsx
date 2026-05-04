import React, { useState } from 'react';
import { User, UserRoleType, UserPermissions } from '../types';
import { Search, Mail, Phone, Lock, Download, ClipboardList, Filter, Eye, Award, Plus, X, Trash2, Edit, EyeOff, QrCode, Upload, Camera, Shield, ShieldCheck, Users, AlertCircle, CheckCircle2, MessageSquare, MessageCircle, PhoneIncoming, UserCircle, Star, ChevronRight } from 'lucide-react';
import { Avatar } from '../components/common/Avatar';
import { PermissionMatrixModal } from '../components/staff/PermissionMatrixModal';
import { DelegationLetterModal } from '../components/staff/DelegationLetterModal';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

interface StaffListPageProps {
  onNavigate?: (tab: string) => void;
  onOpenDirectChat?: (user: User) => void;
  unreadCount?: number;
  users: User[];
  currentUser: User;
  onSimulateStaff?: (user: User) => void;
  originalUser?: User | null;
  onSendToUser?: (msg: string, targetId: string, attachments?: any[]) => void;
  onSendToGroup?: (msg: string, attachments?: any[]) => void;
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
  onNavigate,
  onOpenDirectChat,
  unreadCount = 0,
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
  const [permissionMatrixUser, setPermissionMatrixUser] = useState<User | null>(null);
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

  const [selectedQRUser, setSelectedQRUser] = useState<User | null>(null);

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
      {/* Enlarged QR Modal - Redesigned to look like a professional ID card / Edit profile */}
      <AnimatePresence>
        {selectedQRUser && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[48px] overflow-hidden shadow-2xl relative border border-white p-10 flex flex-col items-center"
            >
              <button 
                onClick={() => setSelectedQRUser(null)}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center bg-slate-100 text-slate-400 rounded-full hover:bg-slate-200 transition-all z-10 active:scale-90"
              >
                <X size={28} strokeWidth={3} />
              </button>

              {/* Avatar Section from "EDIT" style */}
              <div className="relative mb-8">
                <div className="w-36 h-36 p-1.5 bg-gradient-to-tr from-blue-100 to-blue-50 rounded-full shadow-2xl border-2 border-blue-50/50 overflow-hidden">
                  <Avatar src={selectedQRUser.avatar} name={selectedQRUser.name} size="full" className="rounded-full object-cover" />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap">
                  <p className="text-[11px] font-black text-blue-700 uppercase tracking-widest bg-white px-5 py-1.5 rounded-full shadow-xl border border-blue-50">
                    ID VERIFIED
                  </p>
                </div>
              </div>

              {/* Info Blocks mimicking the provided screenshot */}
              <div className="w-full space-y-5 mb-10">
                <div className="space-y-1.5 text-center">
                  <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">HỌ VÀ TÊN NHÂN VIÊN</p>
                  <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{selectedQRUser.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-1.5 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">MÃ CHUẨN</p>
                    <div className="bg-slate-50 rounded-2xl py-3 border border-slate-100 flex items-center justify-center">
                      <p className="text-lg font-mono font-black text-blue-800">{selectedQRUser.code}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">VAI TRÒ</p>
                    <div className="bg-slate-50 rounded-2xl py-3 border border-slate-100 flex items-center justify-center px-2 overflow-hidden">
                      <p className="text-[13px] font-black text-slate-700 uppercase leading-none truncate">
                        {selectedQRUser.role === 'Admin' ? <span translate="no" className="notranslate">ADMIN</span> : selectedQRUser.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Central QR Data */}
              <div className="bg-slate-50 p-6 rounded-[50px] border-8 border-white shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                <QRCodeSVG 
                  value={`https://tanphuvietnam.vn/staff/${selectedQRUser.id}`} 
                  size={180} 
                  level="H"
                  className="text-slate-900"
                />
              </div>
              
              <div className="mt-8 flex flex-col items-center gap-2">
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] animate-pulse">
                  SCAN TO AUTHENTICATE
                </p>
                <div className="h-1 w-12 bg-blue-100 rounded-full" />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {permissionMatrixUser && (
        <PermissionMatrixModal 
          user={permissionMatrixUser}
          onClose={() => setPermissionMatrixUser(null)}
          onSave={(perms) => {
            onUpdateStaff?.(permissionMatrixUser.id, { delegatedPermissions: perms });
            setPermissionMatrixUser(null);
          }}
          onShowDelegationLetter={() => {
            setDelegationLetterUser(permissionMatrixUser);
            setPermissionMatrixUser(null);
          }}
        />
      )}

      {delegationLetterUser && (
        <DelegationLetterModal 
          user={delegationLetterUser}
          manager={currentUser}
          onClose={() => setDelegationLetterUser(null)}
          onSendToUser={(msg, attachments) => onSendToUser?.(msg, delegationLetterUser.id, attachments)}
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
                      <option value="Admin"><span translate="no" className="notranslate">Quản trị (Admin)</span></option>
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
              <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none">THÔNG TIN NHÂN VIÊN</h1>
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium max-w-md">Hệ thống quản lý dữ liệu nhân lực Phòng QLCL Tân Phú Việt Nam. Dữ liệu được bảo mật và phân quyền nghiêm ngặt.</p>
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
              {role === 'All' ? 'TẤT CẢ' : (role === 'Admin' ? <span translate="no" className="notranslate">ADMIN</span> : role)}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List - Grid Layout to prevent overlap and maintain "Frozen" design standards */}
      <div 
        id="staff-grid"
        className="grid grid-cols-[repeat(auto-fit,670px)] gap-x-10 gap-y-16 pb-32 w-full max-w-full justify-center px-4"
      >
        {filteredStaff.map((staff) => {
          const isVisible = visiblePasswords[staff.id];
          const isTruong = currentUser.role === 'Admin' || currentUser.personalEmail === 'lenhattruong.tpp@gmail.com';
          const permissionsCount = staff.delegatedPermissions ? Object.values(staff.delegatedPermissions).filter(Boolean).length : 0;
          const starCount = permissionsCount >= 5 ? 3 : (permissionsCount >= 3 ? 2 : (permissionsCount >= 1 ? 1 : 0));

          return (
            <motion.div
              key={staff.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative bg-[#132d6b] rounded-[48px] shadow-[0_40px_100px_rgba(19,45,107,0.4)] transition-all duration-500 pl-4 pr-10 py-6 flex flex-row flex-nowrap gap-8 overflow-hidden border border-white/10 w-[670px] h-[340px] shrink-0 mx-auto hover:shadow-[0_50px_120px_rgba(19,45,107,0.5)] hover:-translate-y-2"
            >
              {/* Left Column: Avatar & ID Section (Frozen: 176px) */}
              <div className="flex flex-col items-center shrink-0 w-[176px] relative z-10">
                {/* Circular Avatar Frame */}
                <div className="relative w-28 h-28 bg-white/5 backdrop-blur-md rounded-full flex items-center justify-center p-1.5 border-2 border-white/10 shadow-2xl mb-4">
                  <div className="w-full h-full rounded-full overflow-hidden border-2 border-white/20 bg-slate-800 shadow-inner">
                    <Avatar 
                      src={staff.avatar} 
                      name={staff.name} 
                      size="full" 
                      className="object-cover" 
                    />
                  </div>
                </div>
                
                {/* ID & Copy Link */}
                <div className="flex flex-col items-center gap-1">
                   <p className="text-xl font-mono font-black text-white tracking-[0.1em] whitespace-nowrap">
                     #{staff.code || '2020.00292'}
                   </p>
                   <button 
                     onClick={() => {
                       navigator.clipboard.writeText(staff.code || '2020.00292');
                     }}
                     className="text-[10px] font-black text-blue-300/60 hover:text-blue-300 uppercase tracking-widest transition-colors cursor-pointer"
                   >
                     SAO CHÉP MÃ
                   </button>
                </div>

                {/* QR Code Container */}
                <div className="mt-auto pt-6">
                  <div 
                    onClick={() => setSelectedQRUser(staff)}
                    className="w-20 h-20 bg-white/5 rounded-[24px] flex items-center justify-center border border-white/10 shadow-2xl cursor-pointer hover:bg-white/10 transition-all group/qr"
                  >
                    <QrCode size={40} className="text-white/20 group-hover/qr:text-white transition-colors" />
                  </div>
                </div>
              </div>

              {/* Center Column: Information & Security (Flexible) */}
              <div className="flex-1 flex flex-col justify-between relative z-10 min-w-0">
                <div className="pt-2">
                  <div className="mb-6 text-left">
                    <h3 translate="no" className="text-2xl font-black text-white tracking-tight uppercase leading-relaxed mb-0">
                      {staff.name}
                    </h3>
                    <div className="flex items-center gap-4">
                      <p className="text-[14px] font-black text-blue-200/40 uppercase tracking-[0.2em] leading-none whitespace-nowrap">
                        {getHardcodedTitle(staff.name) === 'ADMIN' ? <span translate="no" className="notranslate">ADMIN</span> : getHardcodedTitle(staff.name)}
                      </p>
                      {starCount > 0 && (
                        <div className="flex gap-1">
                          {Array.from({ length: starCount }).map((_, i) => (
                            <Star key={i} size={18} fill="#fbbf24" className="text-amber-400" />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-4 text-white">
                      <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-blue-400 shrink-0">
                        <Phone size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-lg font-mono font-black tracking-tight whitespace-nowrap">{staff.phone}</span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-white">
                      <div className="w-9 h-9 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-blue-400 shrink-0">
                        <Mail size={14} strokeWidth={2.5} />
                      </div>
                      <span className="text-sm font-bold lowercase tracking-tight">{staff.companyEmail}</span>
                    </div>

                    {staff.personalEmail && (
                      <div className="flex items-center gap-4 text-white/40">
                        <div className="w-9 h-9 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-blue-400/30 shrink-0">
                          <Mail size={14} strokeWidth={2.5} />
                        </div>
                        <span className="text-sm font-medium lowercase tracking-tight">{staff.personalEmail}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Box */}
                <div className="bg-white rounded-full h-14 w-full max-w-[340px] px-5 flex items-center shadow-2xl">
                  <div className="flex items-center gap-4 w-full">
                    <Lock size={18} className="text-slate-200 shrink-0" strokeWidth={2.5} />
                    <div className="flex-1 flex flex-col items-center justify-center min-w-0">
                      <span className="text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] mb-0.5 whitespace-nowrap">BẢO MẬT HỆ THỐNG</span>
                      <span className="text-lg font-mono font-black text-slate-800 tracking-[0.4em] leading-none">
                        {isVisible ? (staff.password || '123456') : '•••••'}
                      </span>
                    </div>
                    <button 
                      onClick={() => togglePassword(staff.id)}
                      className="text-slate-200 hover:text-blue-600 transition-colors p-1.5 shrink-0"
                    >
                      {isVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Operation Cluster (Frozen: 80px) */}
              <div className="flex flex-col gap-4 justify-center items-center relative z-10 w-[80px] shrink-0">
                <button 
                  onClick={() => setPermissionMatrixUser(staff)}
                  className="w-16 h-16 rounded-full bg-white text-[#132d6b] flex flex-col items-center justify-center hover:bg-slate-50 transition-all shadow-xl group/btn flex-none"
                >
                  <Shield size={24} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">QUYỀN</span>
                </button>

                
                {onSimulateStaff && staff.id !== (originalUser?.id || currentUser.id) && isTruong && (
                  <button 
                    onClick={() => onSimulateStaff(staff)}
                    className="w-16 h-16 rounded-full bg-white/10 text-white hover:bg-white hover:text-[#132d6b] flex flex-col items-center justify-center transition-all shadow-xl border border-white/10 group/btn"
                  >
                    <ShieldCheck size={24} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                    <span className="text-[9px] font-black uppercase tracking-tighter">GIẢ LẬP</span>
                  </button>
                )}

                <button 
                  onClick={() => { setEditingStaff(staff); setFormData({...staff}); }}
                  className="w-16 h-16 rounded-full bg-white/10 text-white hover:bg-white hover:text-[#132d6b] flex flex-col items-center justify-center transition-all shadow-xl border border-white/10 group/btn"
                >
                  <Edit size={24} strokeWidth={2.5} className="group-hover/btn:scale-110 transition-transform mb-0.5" />
                  <span className="text-[9px] font-black uppercase tracking-tighter">SỬA</span>
                </button>

                {isTruong && (
                   <button 
                    onClick={() => onDeleteStaff?.(staff.id)}
                    className="w-16 h-16 bg-red-600 text-white rounded-full hover:bg-red-700 transition-all shadow-2xl flex items-center justify-center xl:mt-auto group/del"
                  >
                    <Trash2 size={24} className="group-hover/del:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
