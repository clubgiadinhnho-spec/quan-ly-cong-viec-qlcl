import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Droplet, Clock } from 'lucide-react';
import { HealthReminder as HealthReminderType } from '../../types';

interface HealthReminderProps {
  settings: HealthReminderType;
  onClose: () => void;
}

export const HealthReminder = ({ settings, onClose }: HealthReminderProps) => {
  const [timeLeft, setTimeLeft] = useState(settings.autoCloseSeconds);
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    if (timeLeft <= 0) {
      onClose();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    const clockTimer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    }, 60000);

    return () => {
      clearInterval(timer);
      clearInterval(clockTimer);
    };
  }, [timeLeft, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 50 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 50 }}
      className="fixed bottom-32 right-8 z-[100] w-[380px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
    >
      {/* Header */}
      <div className="bg-blue-600 p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white">
            <Droplet size={18} fill="currentColor" />
          </div>
          <h3 className="text-white font-black text-sm uppercase tracking-tight">Nhắc nhở (1)</h3>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-lg font-black text-gray-900">{currentTime} {new Date().getHours() < 12 ? 'Sáng' : 'Chiều'}</span>
            <div className="flex items-center gap-2">
               <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold border border-blue-100 uppercase tracking-widest">
                  Mặc định • {settings.configName}
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 bg-blue-50/50 p-4 rounded-xl border border-blue-50">
           <Droplet className="text-blue-500 flex-none mt-0.5" size={16} />
           <p className="text-sm text-gray-700 leading-relaxed font-medium">
             {settings.message}
           </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-50 flex justify-center">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Tự động đóng sau {timeLeft}s
            </p>
        </div>
      </div>
    </motion.div>
  );
};
