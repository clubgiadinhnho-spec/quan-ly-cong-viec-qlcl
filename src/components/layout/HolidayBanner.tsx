import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Holiday {
  id: string;
  name: string;
  startMonth: number; // 1-indexed
  startDate: number;
  endMonth: number;
  endDate: number;
  bannerUrl: string;
  theme?: 'red-gold' | 'default';
}

export const HolidayBanner = () => {
  const holidays: Holiday[] = useMemo(() => [
    {
      id: 'reunification',
      name: 'Chào mừng Kỷ niệm Ngày Giải phóng miền Nam (30/4) & Quốc tế Lao động (1/5)',
      startMonth: 4,
      startDate: 25,
      endMonth: 5,
      endDate: 2,
      bannerUrl: '', // Will use custom theme
      theme: 'red-gold'
    },
    {
      id: 'national_day',
      name: 'Chào mừng Ngày Quốc khánh 2/9',
      startMonth: 8,
      startDate: 28,
      endMonth: 9,
      endDate: 3,
      bannerUrl: 'https://images.unsplash.com/photo-1540331547168-8b63109225b7?auto=format&fit=crop&q=80&w=2000' // Vietnam city theme
    },
    {
      id: 'noel',
      name: 'Chúc mừng Giáng sinh & Năm mới',
      startMonth: 12,
      startDate: 20,
      endMonth: 12,
      endDate: 26,
      bannerUrl: 'https://images.unsplash.com/photo-1544257740-9799bf958564?auto=format&fit=crop&q=80&w=2000'
    },
    {
      id: 'new_year',
      name: 'Chúc mừng Năm mới 2027',
      startMonth: 12,
      startDate: 30,
      endMonth: 1,
      endDate: 2,
      bannerUrl: 'https://images.unsplash.com/photo-1467810563316-b5476525c0f9?auto=format&fit=crop&q=80&w=2000'
    },
    {
      id: 'tet_2027',
      name: 'Chúc mừng Năm mới Đinh Mùi 2027',
      startMonth: 2,
      startDate: 1, // Lunar New Year 2027 is Feb 6
      endMonth: 2,
      endDate: 12,
      bannerUrl: 'https://images.unsplash.com/photo-1582213710313-0a7c64f77c8e?auto=format&fit=crop&q=80&w=2000'
    },
  ], []);

  const activeHoliday = useMemo(() => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-indexed
    const day = now.getDate();

    return holidays.find(h => {
      // Handle cross-month holidays (like New Year or Tet)
      if (h.startMonth === h.endMonth) {
        return month === h.startMonth && day >= h.startDate && day <= h.endDate;
      } else {
        // e.g., April 25 to May 2
        const isStartMonth = month === h.startMonth && day >= h.startDate;
        const isEndMonth = month === h.endMonth && day <= h.endDate;
        return isStartMonth || isEndMonth;
      }
    });
  }, [holidays]);

  if (!activeHoliday) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 65, opacity: 1 }}
        className="relative w-full overflow-hidden shadow-sm flex items-center justify-center border-b border-white/10"
      >
        {activeHoliday.theme === 'red-gold' ? (
          <div className="absolute inset-0 bg-red-600 overflow-hidden">
             {/* Base Gradient */}
             <div className="absolute inset-0 bg-linear-to-r from-red-700 via-red-600 to-red-700" />
             
             {/* Waving Effect Layers */}
             <motion.div 
                animate={{ 
                  x: [-1000, 0],
                  opacity: [0.1, 0.2, 0.1] 
                }}
                transition={{ 
                  duration: 8, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_100px,rgba(255,255,255,0.1)_150px,transparent_200px)]"
             />
             
             <motion.div 
                animate={{ 
                  x: [0, -1000],
                  opacity: [0.05, 0.1, 0.05] 
                }}
                transition={{ 
                  duration: 12, 
                  repeat: Infinity, 
                  ease: "linear" 
                }}
                className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_150px,rgba(0,0,0,0.1)_200px,transparent_250px)]"
             />

             {/* Animated subtle Star in background */}
             <motion.div 
                animate={{ 
                   scale: [1, 1.05, 1],
                   rotate: [0, 2, 0, -2, 0],
                   opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-10 top-1/2 -translate-y-1/2 select-none pointer-events-none"
             >
                <svg width="100" height="100" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
             </motion.div>

             <motion.div 
                animate={{ 
                   scale: [1, 1.08, 1],
                   opacity: [0.1, 0.3, 0.1]
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute right-20 top-1/2 -translate-y-1/2 select-none pointer-events-none"
             >
                <svg width="140" height="140" viewBox="0 0 24 24" fill="#fbbf24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
             </motion.div>
          </div>
        ) : (
          <>
            <div className={`absolute inset-0 ${activeHoliday.theme === 'blue-cyan' ? 'bg-linear-to-r from-blue-700 via-indigo-600 to-blue-700' : 'bg-linear-to-r from-emerald-600 via-teal-500 to-emerald-600'} opacity-90`} />
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
              <div className="absolute top-[-50%] left-[-10%] w-[120%] h-[200%] bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse" />
            </div>
          </>
        )}
        
        <div className="relative z-10 text-center px-4 max-w-4xl">
          <motion.p 
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={`font-black text-xs md:text-sm uppercase tracking-[0.1em] leading-tight drop-shadow-md ${activeHoliday.theme === 'red-gold' ? 'text-yellow-300' : 'text-white'}`}
          >
            {activeHoliday.name}
          </motion.p>
          <motion.div 
             initial={{ scaleX: 0 }}
             animate={{ scaleX: 1 }}
             transition={{ delay: 0.4, duration: 0.6 }}
             className={`h-px w-32 mx-auto mt-1.5 ${activeHoliday.theme === 'red-gold' ? 'bg-yellow-400' : 'bg-white/50'}`}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
