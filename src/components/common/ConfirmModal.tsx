import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ConfirmModalProps {
  show: boolean;
  title: React.ReactNode;
  message: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: React.ReactNode;
  isAlert?: boolean;
}

export const ConfirmModal = ({ show, title, message, onConfirm, onClose, confirmText, isAlert }: ConfirmModalProps) => (
  <AnimatePresence>
    {show && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }} 
          onClick={onClose} 
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }} 
          animate={{ opacity: 1, scale: 1, y: 0 }} 
          exit={{ opacity: 0, scale: 0.9, y: 20 }} 
          className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100"
        >
          <div className="p-8 text-center">
            <div className={`w-16 h-16 ${isAlert ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'} rounded-full flex items-center justify-center mx-auto mb-6`}>
              {isAlert ? <XCircle size={32} /> : <CheckCircle2 size={32} />}
            </div>
            <h3 className="text-lg font-black text-gray-900 mb-3 uppercase tracking-tight">{title}</h3>
            <div className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">{message}</div>
            <div className={`grid ${isAlert ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
              {!isAlert && (
                <button 
                  onClick={onClose} 
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  <span translate="no" className="notranslate">Hủy bỏ</span>
                </button>
              )}
              <button 
                onClick={onConfirm} 
                className={`px-4 py-3 ${isAlert ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg text-center active:scale-95`}
              >
                <span translate="no" className="notranslate">{confirmText || (isAlert ? 'ĐÃ HIỂU' : 'Xác nhận')}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);
