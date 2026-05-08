import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Trash2, ArrowRight, Clock } from 'lucide-react';
import { AppNotification } from '../../types';
import { formatDate } from '../../lib/dateUtils';

interface NotificationCenterProps {
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onGoToTask: (taskId: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  isOpen,
  onClose,
  onMarkAsRead,
  onDelete,
  onGoToTask
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[998]"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-[380px] bg-white shadow-2xl z-[999] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-blue-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Bell size={20} />
                </div>
                <h2 className="font-bold text-lg tracking-tight">
                  <span translate="no" className="notranslate">THÔNG BÁO</span>
                </h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="h-40 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Bell size={32} opacity={0.2} />
                  <p className="text-sm italic">Không có thông báo mới</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border-2 transition-all group ${
                      n.isRead 
                        ? 'bg-gray-50 border-gray-100 opacity-75' 
                        : 'bg-white border-blue-100 shadow-lg'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`mt-1 p-2 rounded-lg shrink-0 ${
                        n.type === 'COMPLETED_REQUEST' 
                          ? 'bg-emerald-100 text-emerald-600' 
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {n.type === 'COMPLETED_REQUEST' ? <Check size={16} strokeWidth={3} /> : <Trash2 size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span translate="no" className="notranslate text-[10px] font-black uppercase tracking-tight text-gray-400">
                            {formatDate(n.createdAt)}
                          </span>
                          {!n.isRead && <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />}
                        </div>
                        <p className="text-sm leading-relaxed text-gray-800">
                          <span translate="no" className="notranslate font-bold text-blue-600">{n.senderName}</span>
                          {' đề xuất '}
                          <span translate="no" className={`notranslate font-bold ${
                            n.type === 'COMPLETED_REQUEST' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {n.type === 'COMPLETED_REQUEST' ? 'HOÀN THÀNH' : 'ĐỀ XUẤT XÓA'}
                          </span>
                          {' công việc '}
                          <span translate="no" className="notranslate font-mono font-bold bg-gray-100 px-1 rounded text-gray-600">
                            {n.taskCode}
                          </span>
                        </p>
                        
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              onGoToTask(n.taskId);
                              onMarkAsRead(n.id);
                              onClose();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"
                          >
                            <span translate="no" className="notranslate">ĐI ĐẾN</span>
                            <ArrowRight size={14} />
                          </button>
                          
                          <div className="flex gap-1">
                            {!n.isRead && (
                              <button
                                onClick={() => onMarkAsRead(n.id)}
                                title="Đã xem"
                                className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                              >
                                <Check size={18} />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(n.id)}
                              title="Xóa thông báo"
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-1 text-[9px] text-gray-400 italic">
                      <Clock size={10} />
                      <span>Hết hạn: {formatDate(n.expiresAt)}</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 text-center text-[10px] text-gray-400">
              Thông báo sẽ tự động xóa sau 72 giờ
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
