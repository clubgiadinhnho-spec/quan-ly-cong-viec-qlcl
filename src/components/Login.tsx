import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, Phone, User as UserIcon, UserPlus, ArrowLeft, Mail, Shield, Hash, Type, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function Login({ users, onLogin }: LoginProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Registration states
  const [regData, setRegData] = useState<Partial<User>>({
    role: 'Nhân Viên',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + Math.random(),
  });

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(
      u => (u.name.toLowerCase() === name.toLowerCase() && u.phone === phone) ||
           (u.companyEmail.toLowerCase() === name.toLowerCase() && u.phone === phone)
    );

    if (user) {
      if (user.status === 'ACTIVE') {
        onLogin(user);
      } else if (user.status === 'PENDING') {
        setError('Tài khoản của bạn đang chờ quản trị viên phê duyệt.');
      } else {
        setError('Tài khoản của bạn đã bị vô hiệu hóa.');
      }
    } else {
      setError('Thông tin đăng nhập không chính xác (Họ tên/Email & Số điện thoại).');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!regData.name || !regData.phone || !regData.companyEmail || !regData.code || !regData.abbreviation) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      setLoading(false);
      return;
    }

    try {
      // Check if user already exists
      const existingUser = users.find(u => 
        u.companyEmail.toLowerCase() === regData.companyEmail?.toLowerCase() || 
        u.phone === regData.phone ||
        u.code === regData.code
      );

      if (existingUser) {
        setError('Nhân viên này đã tồn tại trên hệ thống (Email/SĐT/Mã NV trùng).');
        setLoading(false);
        return;
      }

      const newUser: User = {
        id: `user_${Date.now()}`,
        name: regData.name!,
        phone: regData.phone!,
        zalo: regData.zalo || regData.phone!,
        companyEmail: regData.companyEmail!,
        personalEmail: regData.personalEmail || regData.companyEmail!,
        role: regData.role as any || 'Nhân Viên',
        avatar: regData.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(regData.name!)}&background=random`,
        code: regData.code!,
        abbreviation: regData.abbreviation!,
        personalNote: '',
        status: 'PENDING'
      };

      await setDoc(doc(db, 'users', newUser.id), newUser);
      
      setRegSuccess(true);
      setIsRegistering(false);
      setName(newUser.companyEmail); // Switch to email for easier login
      setPhone(newUser.phone);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError('Có lỗi xảy ra khi xử lý đăng ký: ' + (err.message || 'Lỗi kết nối Firebase.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-2xl border border-gray-200 shadow-xl shadow-gray-200/50 overflow-hidden"
      >
        {regSuccess ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-10 text-center space-y-6"
          >
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
               <CheckCircle2 size={40} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 uppercase">Đăng ký thành công!</h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">
              Thông tin của bạn đã được gửi lên hệ thống.<br/>
              Vui lòng liên hệ <strong>Quản trị viên</strong> để được phê duyệt tài khoản.
            </p>
            <button 
              onClick={() => {
                setRegSuccess(false);
                setIsRegistering(false);
              }}
              className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl uppercase tracking-widest text-xs hover:bg-black transition-all"
            >
              Quay lại Đăng nhập
            </button>
          </motion.div>
        ) : (
          <>
            <div className="p-8 border-b border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg shadow-blue-100 transform -rotate-3">Q</div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
            {isRegistering ? 'Đăng ký nhân sự mới' : 'Hệ Thống Quản Lý QC'}
          </h1>
          <p className="text-gray-400 mt-1 text-xs font-medium tracking-tight">
            {isRegistering ? 'Vui lòng cung cấp thông tin chính xác' : 'Theo dõi hiệu suất & Báo cáo chất lượng'}
          </p>
        </div>

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            {!isRegistering ? (
              <motion.div 
                key="login-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <UserIcon size={12} /> Tên nhân viên / Email
                    </label>
                    <input
                      type="text" required value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                      placeholder="Họ tên hoặc Email..."
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Phone size={12} /> Số điện thoại
                    </label>
                    <input
                      type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                      placeholder="Số điện thoại..."
                    />
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center">{error}</div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-50 uppercase tracking-widest text-xs"
                  >
                    <LogIn size={16} /> ĐĂNG NHẬP
                  </button>
                  
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
                    <div className="relative flex justify-center text-[9px] uppercase font-black tracking-widest text-gray-300"><span className="bg-white px-4">HOẶC</span></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setIsRegistering(true); setError(''); }}
                    className="w-full py-3.5 bg-white border-2 border-gray-100 text-gray-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-all hover:border-gray-200 uppercase tracking-widest text-xs"
                  >
                    <UserPlus size={16} /> Đăng ký nhân sự
                  </button>
                </form>
              </motion.div>
            ) : (
              <motion.div 
                key="register-form"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <UserIcon size={10} /> Họ tên
                      </label>
                      <input
                        type="text" required value={regData.name || ''} 
                        onChange={(e) => setRegData({...regData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="Nguyễn Văn A"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Phone size={10} /> SĐT
                      </label>
                      <input
                        type="tel" required value={regData.phone || ''} 
                        onChange={(e) => setRegData({...regData, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="09xxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Mail size={10} /> Email Công ty
                    </label>
                    <input
                      type="email" required value={regData.companyEmail || ''} 
                      onChange={(e) => setRegData({...regData, companyEmail: e.target.value})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                      placeholder="email@tanphu.vn"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Hash size={10} /> Mã NV
                      </label>
                      <input
                        type="text" required value={regData.code || ''} 
                        onChange={(e) => setRegData({...regData, code: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="QC-001"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Type size={10} /> Tên viết tắt
                      </label>
                      <input
                        type="text" required value={regData.abbreviation || ''} 
                        onChange={(e) => setRegData({...regData, abbreviation: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium"
                        placeholder="NVA"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Shield size={10} /> Chức vụ
                    </label>
                    <select 
                      value={regData.role}
                      onChange={(e) => setRegData({...regData, role: e.target.value as any})}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Nhân Viên">Nhân Viên</option>
                      <option value="Trưởng Nhóm">Trưởng Nhóm</option>
                      <option value="Trưởng Phòng">Trưởng Phòng</option>
                    </select>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center">{error}</div>
                  )}

                  <div className="pt-2 space-y-3">
                    <button
                      type="submit" disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-50 disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                      <UserPlus size={16} /> {loading ? 'ĐANG XỬ LÝ...' : 'HOÀN TẤT ĐĂNG KÝ'}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setIsRegistering(false); setError(''); }}
                      className="w-full flex items-center justify-center gap-2 py-2 text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest shadow-sm"
                    >
                      <ArrowLeft size={12} /> Quay lại đăng nhập
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </>
        )}
        
        <div className="px-8 pb-6 text-center text-[10px] text-gray-300 font-medium border-t border-gray-100 mt-auto pt-4">
          Hệ thống bảo mật bởi QC TanPhu © 2026
        </div>
      </motion.div>
    </div>
  );
}

