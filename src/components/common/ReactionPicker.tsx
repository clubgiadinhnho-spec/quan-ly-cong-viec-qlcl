import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const EMOJIS = ['👍', '❤️', '😄', '🤣', '😮', '😢', '🔥', '👏', '🙏', '🎉', '💪', '🤔', '✅', '🎁', '🎂', '📍'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isOpen: boolean;
  position?: 'top' | 'bottom';
}

export const ReactionPicker: React.FC<ReactionPickerProps> = ({ onSelect, onClose, isOpen, position = 'top' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="relative">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: position === 'top' ? -10 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute z-50 flex items-center gap-1 p-1.5 bg-white border border-gray-200 shadow-xl rounded-full ${
              position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(emoji);
                  onClose();
                }}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
          />
        </div>
      )}
    </AnimatePresence>
  );
};

interface ReactionBadgeProps {
  reactions?: { userId: string; emoji: string }[];
  users: { id: string; name: string }[];
  onReact?: (emoji: string) => void;
  currentUser?: { id: string; uniqueKey?: string };
}

export const ReactionBadge: React.FC<ReactionBadgeProps> = ({ reactions, users, onReact, currentUser }) => {
  if (!reactions || reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.keys(grouped || {}).map((emoji) => {
        const count = grouped[emoji];
        const reactedByMe = currentUser && reactions.some(r => 
          (r.userId === currentUser.id || (currentUser.uniqueKey && r.userId === currentUser.uniqueKey)) && 
          r.emoji === emoji
        );
        
        return (
          <button 
            key={emoji}
            onClick={(e) => {
              e.stopPropagation();
              onReact?.(emoji);
            }}
            title={reactions.filter(r => r.emoji === emoji).map(r => {
              const user = users.find(u => u.id === r.userId || (u as any).uniqueKey === r.userId);
              return user?.name || 'Ẩn danh';
            }).join(', ')}
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm transition-all active:scale-90 ${
              reactedByMe 
                ? 'bg-blue-100 border-blue-200 text-blue-700' 
                : 'bg-gray-100/80 border border-gray-200/50 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span>{emoji}</span>
            {count > 1 && <span>{count}</span>}
          </button>
        );
      })}
    </div>
  );
};
