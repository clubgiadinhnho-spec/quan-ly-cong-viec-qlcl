import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

const EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '🔥', '👏', '✅'];

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
}

export const ReactionBadge: React.FC<ReactionBadgeProps> = ({ reactions, users }) => {
  if (!reactions || reactions.length === 0) return null;

  // Group by emoji
  const grouped = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.keys(grouped).map((emoji) => {
        const count = grouped[emoji];
        return (
          <div 
            key={emoji}
            title={reactions.filter(r => r.emoji === emoji).map(r => users.find(u => u.id === r.userId)?.name).join(', ')}
            className="flex items-center gap-1 bg-gray-100/80 border border-gray-200/50 px-1.5 py-0.5 rounded-full text-[10px] font-bold text-gray-600 shadow-sm"
          >
            <span>{emoji}</span>
            {(count as number) > 1 && <span>{count as number}</span>}
          </div>
        );
      })}
    </div>
  );
};
