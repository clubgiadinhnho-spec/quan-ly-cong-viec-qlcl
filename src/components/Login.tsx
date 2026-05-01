import React, { useState } from 'react';
import { User } from '../types';
import { SECURITY_QUESTIONS } from '../constants';
import { LogIn, Phone, User as UserIcon, UserPlus, ArrowLeft, Mail, Shield, Hash, Type, CheckCircle2, HelpCircle, Lock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, loginWithGoogle, loginAnonymously } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

import { Avatar } from './common/Avatar';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export default function Login({ users, onLogin }: LoginProps) {
  const [name, setName] = useState(() => localStorage.getItem('qc_remember_name') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('qc_remember_phone') || '');
  const [securityAnswer, setSecurityAnswer] = useState(() => localStorage.getItem('qc_remember_sec_answer') || '');
  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem('qc_remember_me') === 'true');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInitialLoginAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // Normalize inputs: trim, lowercase name, and remove formatting from phone
    const cleanName = name.trim().toLowerCase().replace(/\s+/g, ' ');
    const cleanPhone = phone.replace(/\D/g, ''); 
    
    const user = users.find(u => {
      const uName = (u.name || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const uEmail = (u.companyEmail || '').trim().toLowerCase();
      const uPhone = (u.phone || '').replace(/\D/g, '');
      
      return (uName === cleanName && uPhone === cleanPhone) ||
             (uEmail === cleanName && uPhone === cleanPhone);
    });

    if (user) {
      if (user.status !== 'ACTIVE') {
        setError('Tài khoản của bạn đã bị vô hiệu hóa.');
        return;
      }
      // User found, now show security question
      setFoundUser(user);
    } else {
      setError('Thông tin đăng nhập không chính xác hoặc bạn không có trong danh sách nhân sự được cấp phép.');
    }
  };

  const handleFinalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) return;

    const normalizedExisting = (foundUser.securityAnswer || '').toLowerCase().trim().replace(/\s+/g, ' ');
    const normalizedInput = securityAnswer.toLowerCase().trim().replace(/\s+/g, ' ');

    if (normalizedExisting === normalizedInput) {
      setLoading(true);
      try {
        // Attempt sign in anonymously to get a UID for Firebase Rules
        const fbUser = await loginAnonymously();
        
        let userToLogin = foundUser;

        if (fbUser) {
          // Instead of setDoc automatically, we just use the local state.
          // This stops automatic data generation/update on login.
          userToLogin = { ...foundUser, id: fbUser.uid, lastActive: Date.now() } as User;
        } else {
          console.warn("Login proceeded WITHOUT Firebase Authentication. Real-time chat may be limited.");
        }
        
        if (rememberMe) {
          localStorage.setItem('qc_remember_me', 'true');
          localStorage.setItem('qc_remember_name', name);
          localStorage.setItem('qc_remember_phone', phone);
          localStorage.setItem('qc_remember_sec_answer', securityAnswer);
        } else {
          localStorage.removeItem('qc_remember_me');
          localStorage.removeItem('qc_remember_name');
          localStorage.removeItem('qc_remember_phone');
          localStorage.removeItem('qc_remember_sec_answer');
        }
        onLogin(userToLogin);
      } catch (err: any) {
        console.error("Auth error during regular login:", err);
        setError('Lỗi xác thực hệ thống: ' + err.message);
      } finally {
        setLoading(false);
      }
    } else {
      setError('Câu trả lời bảo mật không đúng.');
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
          <p className="text-gray-400 mt-1 text-xs font-medium tracking-tight">
            Theo dõi hiệu suất & Báo cáo chất lượng
          </p>
        </div>

        <div className="p-8 space-y-6">
          <AnimatePresence mode="wait">
            <motion.div 
              key={foundUser ? "sec-form" : "login-form"}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="space-y-6"
            >
              {!foundUser ? (
                <form onSubmit={handleInitialLoginAttempt} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <UserIcon size={12} /> Tên nhân viên / Email (5 NS cốt lõi)
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

                  <div className="flex items-center gap-2 px-1">
                    <input 
                      id="remember-me"
                      type="checkbox" 
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="remember-me" className="text-[10px] font-bold text-gray-500 uppercase tracking-widest cursor-pointer select-none">
                      Ghi nhớ đăng nhập
                    </label>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-lg text-center">{error}</div>
                  )}

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-50 uppercase tracking-widest text-xs"
                  >
                    TIẾP TỤC ĐĂNG NHẬP <LogIn size={16} />
                  </button>
                </form>
              ) : (
                <motion.form 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onSubmit={handleFinalLogin} 
                  className="space-y-6"
                >
                  <div className="flex flex-col items-center gap-4 py-2">
                     <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shadow-inner">
                        <Lock size={28} className="animate-pulse" />
                     </div>
                     <div className="text-center">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Xác thực lớp 2</h3>
                        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Lớp bảo vệ bổ sung cho <span translate="no" className="notranslate">{foundUser.name}</span></p>
                     </div>
                  </div>

                  <div className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50/30 rounded-2xl border border-blue-100/50 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                       <HelpCircle size={40} />
                    </div>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <ShieldCheck size={12} /> Câu hỏi bảo mật của bạn
                    </p>
                    <p className="text-sm font-bold text-gray-800 leading-relaxed">
                      {foundUser.securityQuestion || 'Vui lòng trả lời câu hỏi bảo mật để tiếp tục:'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">
                      Câu trả lời
                    </label>
                    <div className="relative">
                      <input
                        type="text" required autoFocus
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white outline-none transition-all text-sm font-bold shadow-inner"
                        placeholder="Nhập câu trả lời của bạn..."
                      />
                    </div>
                  </div>

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-black rounded-xl text-center flex items-center justify-center gap-2"
                    >
                       <span className="w-1 h-1 bg-red-600 rounded-full animate-ping" /> {error}
                    </motion.div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => { setFoundUser(null); setSecurityAnswer(''); setError(''); }}
                      className="px-6 py-3.5 bg-white border border-gray-200 text-gray-500 font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                    >
                      <ArrowLeft size={14} /> Quay lại
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3.5 bg-blue-600 text-white font-bold rounded-xl text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
                    >
                      XÁC NHẬN <LogIn size={14} />
                    </button>
                  </div>
                </motion.form>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
        
        <div className="px-8 pb-6 text-center text-[10px] text-gray-300 font-medium border-t border-gray-100 mt-auto pt-4">
          Hệ thống bảo mật bởi QC TanPhu © 2026
        </div>
      </motion.div>
    </div>
  );
}

