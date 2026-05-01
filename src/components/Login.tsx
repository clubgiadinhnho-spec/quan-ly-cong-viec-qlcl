import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, UserPlus, Mail, Lock, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { loginWithEmail, registerWithEmail } from '../lib/firebase';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function Login({ users, onLogin, onAddStaff }: { users: User[], onLogin: (u: User) => void, onAddStaff: (u: User) => Promise<void> }) {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState(() => localStorage.getItem('qc_remember_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Registration specific states
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCompanyEmail, setNewCompanyEmail] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isPasswordMatch = mode === 'REGISTER' ? (password === confirmPassword && password.length >= 6) : true;

  const removeAccents = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
  };

  const validateEmail = (email: string) => {
    const user = users.find(u => 
      (u.companyEmail || '').toLowerCase() === email.toLowerCase() ||
      (u.personalEmail || '').toLowerCase() === email.toLowerCase()
    );
    return user;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const staffMember = validateEmail(email);
    if (!staffMember) {
      setError('Email này không có trong danh sách nhân sự được cấp phép.');
      return;
    }

    setLoading(true);
    try {
      let fbUser;
      
      // Flexible login: auto-register if password is default and user exists in list
      if (password === '123456') {
        try {
          fbUser = await loginWithEmail(email, password);
        } catch (err: any) {
          if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
            // Auto register
            fbUser = await registerWithEmail(email, password, staffMember.name);
          } else {
            throw err;
          }
        }
      } else {
        fbUser = await loginWithEmail(email, password);
      }

      if (fbUser) {
        localStorage.setItem('qc_remember_email', email);
        const userToLogin = { ...staffMember, id: fbUser.uid, lastActive: Date.now() } as User;
        onLogin(userToLogin);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        setError('Email hoặc mật khẩu không chính xác.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Phương thức Đăng nhập bằng Email chưa được bật trong Firebase Console.');
      } else {
        setError('Lỗi đăng nhập: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    try {
      // 1. Generate uniqueKey
      const nameNoAccents = removeAccents(newName).replace(/\s+/g, '');
      const uniqueKey = `${nameNoAccents}${newPhone}`;

      // 2. Check if user already exists (by personalEmail or Phone/uniqueKey)
      // Check in the merged list 'users'
      const existingInList = users.find(u => 
        (u.personalEmail || '').toLowerCase() === email.toLowerCase() ||
        u.uniqueKey === uniqueKey ||
        u.phone === newPhone
      );

      // 3. Register with Firebase Auth
      const fbUser = await registerWithEmail(email, password, newName);
      
      if (fbUser) {
        let userToLogin: User;

        if (existingInList) {
          // If already in list (hardcoded or extra), use their info but update ID to Firebase UID
          userToLogin = { 
            ...existingInList, 
            id: fbUser.uid, 
            personalEmail: email, // update email to what they used for auth
            lastActive: Date.now() 
          };
        } else {
          // New user completely - add to Firestore extra_users via onAddStaff
          userToLogin = {
            id: fbUser.uid,
            name: newName,
            phone: newPhone,
            companyEmail: newCompanyEmail,
            personalEmail: email,
            uniqueKey,
            role: 'Staff',
            status: 'ACTIVE',
            code: `QC-${Math.floor(100+Math.random()*900)}`,
            abbreviation: nameNoAccents.substring(0, 3).toUpperCase(),
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${nameNoAccents}`,
            lastActive: Date.now()
          };
          await onAddStaff(userToLogin);
        }

        localStorage.setItem('qc_remember_email', email);
        onLogin(userToLogin);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('Email này đã được đăng ký tài khoản.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Phương thức Đăng ký bằng Email chưa được bật trong Firebase Console.');
      } else {
        setError('Lỗi đăng ký: ' + err.message);
      }
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
        <div className="p-8 border-b border-gray-50 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl mb-4 shadow-lg shadow-blue-100 transform -rotate-3">Q</div>
          <h1 className="text-lg font-bold tracking-tight text-gray-900 uppercase">
            Hệ Thống Quản Lý QC
          </h1>
          <p className="text-gray-400 mt-1 text-xs font-medium tracking-tight uppercase">
            Phiên bản 2026: Đăng ký & Bảo mật
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex p-1 bg-gray-100 rounded-xl">
            <button 
              onClick={() => { setMode('LOGIN'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'LOGIN' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              Đăng nhập
            </button>
            <button 
              onClick={() => { setMode('REGISTER'); setError(''); }}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${mode === 'REGISTER' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
            >
              Đăng ký mới
            </button>
          </div>

          <form onSubmit={mode === 'LOGIN' ? handleLogin : handleRegister} className="space-y-4">
            {mode === 'REGISTER' && (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Họ và Tên</label>
                  <input
                    type="text" required value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Số điện thoại</label>
                  <input
                    type="tel" required value={newPhone} onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="090..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">Email Công ty (Tùy chọn)</label>
                  <input
                    type="email" value={newCompanyEmail} onChange={(e) => setNewCompanyEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                    placeholder="xyz@tanphu.vn"
                  />
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={12} /> {mode === 'REGISTER' ? 'Email Cá nhân (Mặc định dùng Đăng nhập)' : 'Email'}
              </label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium"
                placeholder="example@gmail.com"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Lock size={12} /> Mật khẩu {mode === 'REGISTER' && '(Ít nhất 6 ký tự)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:ring-1 focus:ring-blue-500 focus:bg-white outline-none transition-all text-sm font-medium pr-10"
                  placeholder="••••••"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {mode === 'REGISTER' && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={12} /> Xác nhận mật khẩu
                </label>
                <input
                  type={showPassword ? "text" : "password"} 
                  required 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl focus:ring-1 outline-none transition-all text-sm font-medium ${
                    confirmPassword && !isPasswordMatch ? 'border-red-300 focus:ring-red-500' : 'border-gray-100 focus:ring-blue-500'
                  }`}
                  placeholder="••••••"
                />
                {confirmPassword && !isPasswordMatch && (
                  <p className="text-[10px] text-red-500 font-bold mt-1 uppercase italic">Mật khẩu xác nhận không khớp!</p>
                )}
              </div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-lg text-center uppercase tracking-tight"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !isPasswordMatch}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest text-xs"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'LOGIN' ? (
                <>ĐĂNG NHẬP <LogIn size={16} /></>
              ) : (
                <>XÁC NHẬN ĐĂNG KÝ <UserPlus size={16} /></>
              )}
            </button>
          </form>
        </div>
        
        <div className="px-8 pb-6 text-center text-[10px] text-gray-300 font-medium border-t border-gray-100 mt-auto pt-4 uppercase tracking-tighter">
          Hệ thống bảo mật bởi QC TanPhu © 2026
        </div>
      </motion.div>
    </div>
  );
}

