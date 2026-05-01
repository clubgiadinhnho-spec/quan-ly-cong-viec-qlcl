import React, { useState } from 'react';
import { User, Task } from '../types';
import { User as UserIcon, FileText, MessageSquare, Shield, HelpCircle, CheckCircle2, Clock } from 'lucide-react';
import { getPerformanceAdvice } from '../lib/gemini';
import { formatDate } from '../lib/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../components/common/Avatar';
import { getSafeNameProps } from '../utils/userUtils';

interface ProfilePageProps {
  currentUser: User;
  tasks: Task[];
  users: User[];
}

export const ProfilePage = ({ currentUser, tasks, users }: ProfilePageProps) => {
  const [viewedUserId, setViewedUserId] = useState(currentUser.id);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  
  const user = users.find(u => u.id === viewedUserId) || currentUser;
  const hasDelegatedPermissions = (u: User) => u.delegatedPermissions && Object.values(u.delegatedPermissions).some(v => v);

  const myTasks = tasks.filter((t) => t.assigneeId === user.id);
  const completed = myTasks.filter((t) => t.status === 'COMPLETED').length;
  const ongoing = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const efficiency = myTasks.length > 0 ? Math.round((completed / myTasks.length) * 100) : 0;

  const getAdvice = async () => {
    setLoadingAdvice(true);
    const feedback = await getPerformanceAdvice(user, tasks);
    setAdvice(feedback);
    setLoadingAdvice(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="relative group">
          <Avatar src={user.avatar} name={user.name} size="xl" className="w-32 h-32 rounded-3xl border-4 border-gray-100 shadow-xl bg-gray-50 object-cover" />
          {user.lastActive && (Date.now() - user.lastActive < 120000) && (
            <div className="absolute -top-2 -right-2 px-2 py-1 bg-green-500 text-white text-[8px] font-black rounded-lg shadow-lg uppercase tracking-widest border-2 border-white animate-pulse">
              Online
            </div>
          )}
        </div>
        <div className="text-center md:text-left flex-1 space-y-4">
          <div>
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 {...getSafeNameProps()} className="text-3xl font-black text-gray-800 tracking-tight notranslate">
                <span translate="no" className="notranslate">{user.name}</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className={`w-fit mx-auto md:mx-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  user.role === 'Admin' ? 'bg-red-100 text-red-600' : 
                  user.role === 'Leader' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  {user.role} {hasDelegatedPermissions(user) && '(QUYỀN TP)'}
                </span>
                <span className="text-[10px] font-black text-blue-400 px-2 py-1 bg-blue-50 rounded-lg italic border border-blue-100">
                  {user.abbreviation}
                </span>
              </div>
            </div>
            <p className="text-gray-500 font-bold flex items-center justify-center md:justify-start gap-2 mt-1">
              <UserIcon size={16} />
              Mã NV: {user.code}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8 pb-4 border-b border-gray-50">
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">SĐT / Zalo</p>
              <p className="text-xs font-bold text-gray-700">{user.phone}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">Email Công Ty</p>
              <p className="text-xs font-bold text-gray-700">{user.companyEmail}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-black text-gray-400 uppercase">Hiệu suất</p>
              <p className="text-xs font-bold text-gray-700">{efficiency}%</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100">
              <span className="text-[8px] font-black text-green-600 uppercase tracking-widest block">Đã Xong</span>
              <span className="text-xl font-black text-green-700">{completed}</span>
            </div>
            <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
              <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest block">Đang Chờ</span>
              <span className="text-xl font-black text-blue-700">{ongoing}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
                <FileText className="text-blue-600" />
                LỊCH SỬ CÔNG VIỆC CHI TIẾT (10 CÔNG VIỆC GẦN NHẤT)
              </h3>
              <div className="space-y-4">
                {myTasks.length === 0 ? (
                  <p className="text-center text-gray-400 py-10 italic">Chưa có dữ liệu công việc.</p>
                ) : (
                  myTasks.slice(0, 10).map((t) => (
                    <div key={t.id} className="p-4 bg-gray-50 rounded-xl flex items-center justify-between group hover:bg-gray-100 transition-colors">
                      <div>
                        <p className="text-sm font-bold text-gray-800">{t.title}</p>
                        <p className="text-[10px] text-gray-500">Mã: {t.code} | Hạn: {formatDate(t.expectedEndDate)}</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-tighter ${
                        t.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {t.status === 'COMPLETED' ? 'HOÀN THÀNH' : 'ĐANG LÀM'}
                      </span>
                    </div>
                  ))
                )}
              </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-fit">
          <h3 className="text-sm font-black text-gray-800 mb-4 flex items-center gap-2 uppercase tracking-tighter">
            <MessageSquare className="text-blue-600" />
            AI PERFORMANCE ADVISOR
          </h3>
          <p className="text-xs text-gray-500 mb-6 leading-relaxed italic">
            Hệ thống AI sẽ phân tích dữ liệu hiệu suất của bạn để đưa ra các gợi ý tối ưu.
          </p>
          
          {advice ? (
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100 animate-in zoom-in-95 duration-300">
               <div className="prose prose-sm prose-blue text-xs leading-relaxed text-gray-700 whitespace-pre-wrap">
                 {advice}
               </div>
               <button 
                onClick={getAdvice}
                className="mt-6 text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
              >
                LÀM MỚI PHÂN TÍCH
              </button>
            </div>
          ) : (
            <button 
              onClick={getAdvice}
              disabled={loadingAdvice}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loadingAdvice ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ĐANG PHÂN TÍCH...
                </>
              ) : 'NHẬN ĐÁNH GIÁ TỪ AI'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
