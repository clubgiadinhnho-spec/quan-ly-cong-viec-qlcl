import React from 'react';
import { motion } from 'motion/react';
import { History, X, Clock, User as UserIcon, Sparkles } from 'lucide-react';
import { Task, User } from '../../types';
import { formatAllDatesInString } from '../../lib/dateUtils';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  getWeek, 
  parseISO,
  isSameDay
} from 'date-fns';
import { vi } from 'date-fns/locale';

interface HistoryModalProps {
  taskId: string;
  tasks: Task[];
  users: User[];
  onClose: () => void;
}

export const HistoryModal = ({ taskId, tasks, users, onClose }: HistoryModalProps) => {
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  // Safe parser for various timestamp formats
  const parseDateSafely = (timestamp: any): Date => {
    if (!timestamp) return new Date();
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp.toDate === 'function') {
      try {
        return timestamp.toDate();
      } catch (e) {}
    }
    if (typeof timestamp === 'string') {
      try {
        const parsed = parseISO(timestamp);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (e) {}
      try {
        const parsed = new Date(timestamp);
        if (!isNaN(parsed.getTime())) return parsed;
      } catch (e) {}
    }
    if (typeof timestamp === 'number') {
      return new Date(timestamp);
    }
    return new Date();
  };

  // Process history to include daily versioning
  const processedHistory = (task.history || [])
    .filter((h: any) => {
      const content = h.content || '';
      return !/(?:🤖|\[JOB\]|\[JOB\s|JOB Assist|JOB Assistant|JOB Update|JOB:)/gi.test(content);
    })
    .sort((a: any, b: any) => {
      const aTime = parseDateSafely(a.timestamp).getTime();
      const bTime = parseDateSafely(b.timestamp).getTime();
      return aTime - bTime;
    }).reduce((acc: any[], h: any) => {
      const hDate = parseDateSafely(h.timestamp);
      let dailyV = undefined;
      
      if (h.content?.startsWith('Cập nhật tiến độ:')) {
        const updatesToday = acc.filter(prev => {
          const prevDate = parseDateSafely(prev.timestamp);
          return isSameDay(prevDate, hDate) && prev.content?.startsWith('Cập nhật tiến độ:');
        });
        dailyV = updatesToday.length + 1;
      }
      
      acc.push({ ...h, dailyVersion: dailyV, type: 'history' });
      return acc;
    }, []);

  // Merge history and comments into a single timeline
  const combinedTimeline = [
    ...processedHistory,
    ...(task.comments || [])
      .filter((c: any) => {
        const content = c.content || '';
        return !/(?:🤖|\[JOB\]|\[JOB\s|JOB Assist|JOB Assistant|JOB Update|JOB:)/gi.test(content);
      })
      .map(c => ({ ...c, type: 'chat', version: undefined }))
  ];

  // Group combined timeline by week
  const groupedHistory = combinedTimeline.reduce((acc: any, h) => {
    const timestamp = h.timestamp;
    if (!timestamp) return acc;

    const date = parseDateSafely(timestamp);
    const weekNumber = getWeek(date, { weekStartsOn: 1 });
    const weekStart = startOfWeek(date, { weekStartsOn: 1, locale: vi });
    const weekEnd = endOfWeek(date, { weekStartsOn: 1, locale: vi });
    
    const weekKey = `week-${weekNumber}-${weekStart.getFullYear()}`;
    
    if (!acc[weekKey]) {
      acc[weekKey] = {
        weekNumber,
        range: `${format(weekStart, 'dd/MM/yy')} - ${format(weekEnd, 'dd/MM/yy')}`,
        items: []
      };
    }
    acc[weekKey].items.push({ ...h, date });
    return acc;
  }, {});

  // Sort weeks and items within weeks
  const sortedWeeks = Object.values(groupedHistory).sort((a: any, b: any) => b.weekNumber - a.weekNumber);
  
  const hasAnyExplicitAiHistory = (task.history || []).some((h: any) => h.aiApplied === true);

  const getEntryColor = (item: any) => {
    if (item.type === 'chat') return 'bg-purple-500';
    const content = item.content || '';
    if (content.includes('Cập nhật tiến độ')) return 'bg-blue-500';
    if (content.includes('Thay đổi trạng thái') || content.includes('HOÀN THÀNH') || content.includes('PHÊ DUYỆT')) return 'bg-emerald-500';
    if (content.includes('Gia hạn') || content.includes('chỉnh sửa') || content.includes('KẾ THỪA')) return 'bg-amber-500';
    if (content.includes('Xóa') || content.includes('Hủy')) return 'bg-red-500';
    return 'bg-gray-400';
  };

  const renderFormattedContent = (content: string) => {
    if (!content) return null;
    
    // Convert old tags to HTML classes for consistent rendering
    let processed = formatAllDatesInString(content);

    processed = processed.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    processed = processed.replace(/__(.*?)__/g, '<u>$1</u>');
    processed = processed.replace(/<hl>(.*?)<\/hl>/g, '<mark>$1</mark>');
    
    return (
      <div 
        className="rich-text-content"
        dangerouslySetInnerHTML={{ __html: processed }} 
      />
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-2xl rounded-sm overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header - Flat */}
        <div className="bg-blue-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500 rounded-sm">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tighter uppercase leading-none">
                <span translate="no" className="notranslate">CHI TIẾT LỊCH SỬ THAO TÁC</span>
              </h3>
              <p className="text-blue-100 text-[10px] font-bold mt-1 uppercase tracking-widest opacity-80">
                <span translate="no" className="notranslate">
                  {task.code} | {task.title}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content - Flat & Grouped */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
          {sortedWeeks.length > 0 ? (
            <div className="space-y-10">
              {sortedWeeks.map((week: any, weekIdx: number) => (
                <div key={weekIdx} className="space-y-4">
                  {/* Week Header */}
                  <div className="flex items-center gap-4">
                    <div className="h-px flex-1 bg-blue-100" />
                    <div className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full">
                      <span translate="no" className="notranslate font-bold text-blue-700 text-[11px] uppercase tracking-widest">
                        [TUẦN {week.weekNumber}] - {week.range}
                      </span>
                    </div>
                    <div className="h-px flex-1 bg-blue-100" />
                  </div>

                  {/* Timeline items for this week */}
                  <div className="relative ml-6 space-y-6">
                    {/* Vertical Line */}
                    <div className="absolute left-[-1.5px] top-2 bottom-2 w-[1px] bg-gray-200" />
                    
                    {week.items.sort((a: any, b: any) => b.date.getTime() - a.date.getTime()).map((item: any, itemIdx: number) => {
                      const author = users.find(u => u.id === item.authorId);
                      const colorClass = getEntryColor(item);
                      
                      // Check if we should fallback to display AI on the latest progress update for legacy tasks
                      const isLatestProgressUpdate = !hasAnyExplicitAiHistory && 
                        item.content?.includes('Cập nhật tiến độ:') &&
                        item.version === Math.max(...(task.history || [])
                          .filter((h: any) => h.content?.includes('Cập nhật tiến độ:'))
                          .map((h: any) => h.version || 0)
                        );
                      
                      const shouldShowAiBlock = item.aiApplied === true || (task.aiApplied && isLatestProgressUpdate);
                      const aiDetails = item.aiAppliedDetails || task.aiAppliedDetails;
                      
                      return (
                        <div key={itemIdx} className="relative pl-8 group">
                          {/* Timeline Dot */}
                          <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ring-4 ring-gray-50/50 z-10 transition-transform group-hover:scale-125 ${colorClass}`} />
                          
                          <div className="bg-white border border-gray-100 p-4 rounded-sm transition-all hover:border-blue-200 hover:bg-blue-50/10">
                            {/* Time & Author */}
                            <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-gray-400">
                                  <Clock size={12} />
                                  <span translate="no" className="notranslate text-[10px] font-bold uppercase tracking-tighter">
                                    <span translate="no" className="notranslate">{format(item.date, 'HH:mm - dd/MM/yy', { locale: vi })} ({format(item.date, 'EEEE', { locale: vi })})</span>
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-gray-100 px-2 py-0.5 rounded-sm">
                                  <UserIcon size={10} className="text-gray-500" />
                                  <span translate="no" className="notranslate text-[9px] font-black text-gray-600 uppercase">
                                    <span translate="no" className="notranslate">{author?.name || 'HỆ THỐNG'}</span>
                                  </span>
                                </div>
                                <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest text-white ${item.type === 'chat' ? 'bg-purple-600' : 'bg-slate-400'}`}>
                                  <span translate="no" className="notranslate">{item.type === 'chat' ? 'CHAT' : 'HỆ THỐNG'}</span>
                                </div>
                              </div>
                              {item.type === 'history' && item.dailyVersion && (
                                <span translate="no" className="notranslate text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-sm border border-blue-100">
                                  <span translate="no" className="notranslate">V{item.dailyVersion}</span>
                                </span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="text-sm text-gray-800 leading-relaxed font-sans whitespace-pre-wrap">
                              <span translate="no" className="notranslate font-medium">
                                {renderFormattedContent(item.content)}
                              </span>
                            </div>

                            {/* AI Application Record Widget */}
                            {shouldShowAiBlock && (
                              <div className="mt-3.5 p-3.5 bg-rose-50/70 border border-rose-100 rounded-sm flex gap-3 transition-colors hover:bg-rose-50">
                                <div className="p-1.5 bg-rose-500 text-white rounded-sm shrink-0 h-fit">
                                  <Sparkles size={14} className="animate-pulse" />
                                </div>
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest leading-none bg-rose-200/50 px-2 py-0.5 rounded-sm">
                                      ỨNG DỤNG AI
                                    </span>
                                    <span className="text-[9px] font-bold text-rose-400 leading-none">
                                      ID: KPI-AIU
                                    </span>
                                  </div>
                                  <p className="text-xs text-rose-950 font-semibold leading-relaxed whitespace-pre-wrap">
                                    {aiDetails || 'Đã ghi nhận ứng dụng AI tối ưu hóa chất lượng, tiến độ công việc trong chu kỳ.'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-30 py-20">
              <History size={48} className="mb-4" />
              <span translate="no" className="notranslate font-black text-xs uppercase tracking-widest">
                <span translate="no" className="notranslate">Chưa có dữ liệu lịch sử</span>
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-gray-100">
          <button 
            onClick={onClose} 
            className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-black rounded-sm transition-all uppercase tracking-widest"
          >
            <span translate="no" className="notranslate">Đóng cửa sổ</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
