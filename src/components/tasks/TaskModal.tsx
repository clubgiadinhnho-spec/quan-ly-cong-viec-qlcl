import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Plus, Info, Paperclip, X, Calendar } from 'lucide-react';
import { Task, User, RecurrenceType, TaskCategory } from '../../types';
import { calculateNextDeadline } from '../../lib/dateUtils';
import imageCompression from 'browser-image-compression';

interface TaskModalProps {
  onClose: () => void;
  onSave: (task: any) => void;
  users: User[];
  tasks: Task[];
  task?: Task;
  currentUser: User;
  categories: TaskCategory[];
}

export const TaskModal = ({ onClose, onSave, users, tasks, task, currentUser, categories }: TaskModalProps) => {
  const [title, setTitle] = useState(task?.title || '');
  const [objective, setObjective] = useState(task?.objective || '');
  const [category, setCategory] = useState(task?.category || '');
  const sortedUsers = React.useMemo(() => {
    return [...users].sort((a, b) => {
      // Prioritize current user
      if (a.id === currentUser.id || a.uniqueKey === currentUser.uniqueKey) return -1;
      if (b.id === currentUser.id || b.uniqueKey === currentUser.uniqueKey) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [users, currentUser.id, currentUser.uniqueKey]);

  // Handle default assignee ID correctly
  const [assigneeId, setAssigneeId] = useState(() => {
    if (task?.assigneeId) return task.assigneeId;
    
    // Find matching user in the current users list for the logged-in user
    const self = users.find(u => 
      u.id === currentUser.id || 
      u.uniqueKey === currentUser.uniqueKey
    );
    return self?.id || currentUser.id;
  });

  const [startDate, setStartDate] = useState(task?.startDate || new Date().toISOString().split('T')[0]);
  const [issueDate, setIssueDate] = useState(task?.issueDate || new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState(task?.expectedEndDate || '');
  const [extensionDate, setExtensionDate] = useState(task?.extensionDate || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'NONE');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentData, setAttachmentData] = useState<{ url: string, name: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const titleInputRef = React.useRef<HTMLTextAreaElement>(null);
  const isEdit = !!task;

  // Helper for dd/mm/yy format
  const formatToDisplayDate = (isoDate: string) => {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y.slice(2)}`;
  };

  const parseFromDisplayToISO = (displayDate: string) => {
    const parts = displayDate.split('/');
    if (parts.length !== 3) return '';
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    return `${y}-${m}-${d}`;
  };

  // ESC key listener
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const isLNT = currentUser.name === 'Lê Nhật Trường';
  const isAdmin = currentUser.role === 'Admin' || isLNT;
  const isDeptHead = currentUser.role === 'Trưởng Phòng';
  const canAssignOthers = isAdmin || currentUser.role === 'Leader' || isDeptHead;
  const canAttach = isAdmin || isDeptHead;

  // Helper for +7 days logic
  const getSevenDaysLater = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  // Set default expected date to +7 days for new tasks
  React.useEffect(() => {
    if (!isEdit && !expectedDate && startDate) {
      setExpectedDate(getSevenDaysLater(startDate));
    }
  }, [startDate, isEdit, expectedDate]);

  // Function to reset form for next entry
  const resetFormForNext = () => {
    const today = new Date().toISOString().split('T')[0];
    setTitle('');
    setObjective('');
    setCategory('');
    setIssueDate(today);
    setStartDate(today);
    setRecurrence('NONE');
    setExpectedDate('');
    setAttachment(null);
    setAttachmentData(null);
    setIsManualEdit(false);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
    // Focus back to title input after a short delay to ensure DOM is ready
    setTimeout(() => titleInputRef.current?.focus(), 100);
  };

  // Generate Preview Code for New Tasks
  const nextCode = React.useMemo(() => {
    if (isEdit) return task.code;
    const count = tasks.length;
    const base = `C${String(count + 1).padStart(4, '0')}`;
    if (recurrence !== 'NONE') return `${base}-K1`;
    return base;
  }, [tasks.length, isEdit, task?.code, recurrence]);

  // Sync deadline if cycle or start date changes, unless manually edited
  React.useEffect(() => {
    if (!isEdit && !isManualEdit) {
      if (recurrence !== 'NONE') {
        const calculated = calculateNextDeadline(startDate || new Date().toISOString().split('T')[0], recurrence);
        setExpectedDate(calculated);
      } else if (startDate) {
        setExpectedDate(getSevenDaysLater(startDate));
      }
    }
  }, [recurrence, startDate, isEdit, isManualEdit]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-lg rounded-xl border border-gray-200 flex flex-col max-h-[85vh] overflow-hidden"
      >
        <div className="flex justify-between items-center p-3 border-b border-gray-100 bg-gray-50/30">
          <h2 className="text-sm font-black flex items-center gap-2">
            {isEdit ? <Edit2 size={16} className="text-blue-600" /> : <Plus size={16} className="text-blue-600" />}
            <span translate="no" className="notranslate">{isEdit ? 'CẬP NHẬT CÔNG VIỆC' : 'KHỞI TẠO CÔNG VIỆC MỚI'}</span>
          </h2>
          <div className="flex items-center gap-3">
            {!isEdit && (
              <div className="flex flex-col items-end">
                <span translate="no" className="notranslate text-[9px] font-black text-gray-400 uppercase tracking-tighter">Mã dự kiến:</span>
                <span translate="no" className="notranslate text-blue-600 font-black font-mono text-xs leading-none">{nextCode}</span>
              </div>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
              <X size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
          {!isEdit && (
            <div>
              <button 
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50/50 px-2 py-0.5 rounded border border-blue-100"
              >
                <Info size={10} />
                <span translate="no" className="notranslate">HƯỚNG DẪN NHANH</span>
              </button>
              
              <AnimatePresence>
                {showGuide && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] leading-relaxed text-slate-600 space-y-1">
                      <div className="flex gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-1 shrink-0" />
                        <span translate="no" className="notranslate">
                          <strong>NGÀY BẮT ĐẦU:</strong> Mặc định là hôm nay.
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-1 h-1 rounded-full bg-blue-500 mt-1 shrink-0" />
                        <span translate="no" className="notranslate">
                          <strong>CHU KỲ:</strong> Tự động tính <strong>HẠN HOÀN THÀNH</strong>.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {/* Row 1: Assignee (Full width) */}
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">NGƯỜI THỰC HIỆN <span className="text-red-500">*</span></span>
              </label>
              {canAssignOthers ? (
                <select 
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="" translate="no" className="notranslate">CHỌN NHÂN SỰ</option>
                  {sortedUsers.map((u) => (
                    <option key={u.id} value={u.id} translate="no" className="notranslate">
                      {u.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-slate-600 text-xs font-bold flex items-center cursor-not-allowed opacity-80">
                  <span translate="no" className="notranslate">{currentUser.name}</span>
                </div>
              )}
            </div>

            {/* Row 2: Dates (Split) */}
            <div>
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">NGÀY KHỞI TẠO <span className="text-red-500">*</span></span>
              </label>
              <div className="w-full px-2 py-1 bg-slate-100 border border-gray-200 rounded-md text-xs font-bold text-gray-500 cursor-not-allowed">
                <span translate="no" className="notranslate">{formatToDisplayDate(issueDate)}</span>
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">NGÀY BẮT ĐẦU <span className="text-red-500">*</span></span>
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="dd/mm/yy"
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold pr-7"
                  value={formatToDisplayDate(startDate)}
                  onChange={(e) => {
                    const val = e.target.value;
                    // Allow typing dd/mm/yy
                    if (val.length === 8 && val.includes('/')) {
                      const iso = parseFromDisplayToISO(val);
                      if (iso) setStartDate(iso);
                    }
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    const iso = parseFromDisplayToISO(val);
                    if (!iso) {
                      // Reset to today if invalid on leave
                      setStartDate(new Date().toISOString().split('T')[0]);
                    }
                  }}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                  <Calendar size={14} className="text-gray-400 group-focus-within:text-blue-500 pointer-events-none" />
                  <input 
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Row 3: Recurrence & Deadline (Split) */}
            <div>
              <label className="block text-[9px] font-black text-blue-600 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">CHU KỲ LẶP <span className="text-red-500">*</span></span>
              </label>
              <select 
                className="w-full px-2 py-1 bg-blue-50 border border-blue-100 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold text-blue-700"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                <option value="NONE" translate="no" className="notranslate">KHÔNG LẶP</option>
                <option value="DAILY" translate="no" className="notranslate">HÀNG NGÀY</option>
                <option value="TRI_DAILY" translate="no" className="notranslate">2-3 NGÀY/LẦN</option>
                <option value="WEEKLY" translate="no" className="notranslate">HÀNG TUẦN</option>
                <option value="BI_WEEKLY" translate="no" className="notranslate">HÀNG 2 TUẦN</option>
                <option value="TRI_WEEKLY" translate="no" className="notranslate">HÀNG 3 TUẦN</option>
                <option value="MONTHLY" translate="no" className="notranslate">HÀNG THÁNG</option>
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">HẠN HOÀN THÀNH <span className="text-red-500">*</span></span>
              </label>
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="dd/mm/yy"
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold text-blue-600 pr-7"
                  value={formatToDisplayDate(expectedDate)}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.length === 8 && val.includes('/')) {
                      const iso = parseFromDisplayToISO(val);
                      if (iso) {
                        setExpectedDate(iso);
                        setIsManualEdit(true);
                      }
                    }
                  }}
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                  <Calendar size={14} className="text-gray-400 group-focus-within:text-blue-500 pointer-events-none" />
                  <input 
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer w-full"
                    value={expectedDate}
                    onChange={(e) => {
                      setExpectedDate(e.target.value);
                      setIsManualEdit(true);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Classification (Full width) */}
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">PHÂN LOẠI CÔNG VIỆC <span className="text-red-500">*</span></span>
              </label>
              <select 
                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-xs font-bold"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="" translate="no" className="notranslate">CHỌN PHÂN LOẠI</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.code} translate="no" className="notranslate">
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Row 5: Task Content (Full width) */}
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">HẠNG MỤC CÔNG VIỆC <span className="text-red-500">*</span></span>
              </label>
              <textarea 
                ref={titleInputRef}
                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 h-[40px] resize-none font-bold text-xs leading-tight notranslate"
                placeholder="Nhập tên công việc..."
                value={title}
                translate="no"
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Row 6: Objective (Full width) */}
            <div className="col-span-2">
              <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                <span translate="no" className="notranslate">MỤC TIÊU ĐẠT ĐƯỢC <span className="text-red-500">*</span></span>
              </label>
              <textarea 
                className="w-full px-2 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 h-[40px] resize-none font-bold text-xs leading-tight notranslate"
                placeholder="Mục tiêu cụ thể cho công việc này..."
                value={objective}
                translate="no"
                onChange={(e) => setObjective(e.target.value)}
              />
            </div>

            {/* Optional Extension Row */}
            {isEdit && (
              <div className="col-span-2">
                <label className="block text-[9px] font-black text-emerald-600 mb-0.5 uppercase tracking-wider">
                  <span translate="no" className="notranslate">GIA HẠN (NẾU CÓ)</span>
                </label>
                <input 
                  type="date"
                  className="w-full px-2 py-1 bg-emerald-50 border border-emerald-200 rounded-md outline-none focus:ring-1 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-emerald-700 font-bold"
                  value={extensionDate}
                  onChange={(e) => setExtensionDate(e.target.value)}
                  min={expectedDate}
                />
              </div>
            )}
            
            {/* Row 7: Attachment (Gọn) - Security check applied */}
            {!isEdit && canAttach && (
              <div className="col-span-2">
                <label className="block text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-wider">
                  <span translate="no" className="notranslate">ĐÍNH KÈM TÀI LIỆU (PDF/ẢNH)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    id="task-attachment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      setIsProcessingFile(true);
                      let processedFile: File | Blob = file;

                      if (file.type.startsWith('image/')) {
                        try {
                          const options = {
                            maxSizeMB: 0.7,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                          };
                          processedFile = await imageCompression(file, options);
                        } catch (error) {
                          console.error("Compression failed:", error);
                        }
                      }

                      if (processedFile.size > 800 * 1024) {
                        alert(`Tệp quá lớn. Giới hạn là 800KB.`);
                        setIsProcessingFile(false);
                        return;
                      }

                      const reader = new FileReader();
                      reader.onload = () => {
                        setAttachmentData({
                          url: reader.result as string,
                          name: file.name
                        });
                        setAttachment(file);
                        setIsProcessingFile(false);
                      };
                      reader.readAsDataURL(processedFile);
                    }}
                  />
                  <label 
                    htmlFor="task-attachment"
                    className={`flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 border-dashed rounded-md cursor-pointer hover:bg-blue-50 transition-all text-[10px] font-bold text-gray-500 overflow-hidden ${isProcessingFile ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <Paperclip size={12} />
                    <span className="truncate max-w-[200px]">
                      {isProcessingFile ? "Đang xử lý..." : (attachment ? attachment.name : "CHỌN PDF/ẢNH...")}
                    </span>
                  </label>
                  
                  {attachmentData && !isProcessingFile && (
                    <button 
                      type="button"
                      onClick={() => { setAttachment(null); setAttachmentData(null); }}
                      className="p-1 bg-red-50 text-red-500 rounded-md hover:bg-red-100 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50/30 flex items-center gap-3 relative rounded-b-xl">
          <AnimatePresence>
            {showSuccessToast && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none"
              >
                <div className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black flex items-center gap-2">
                  <span translate="no" className="notranslate whitespace-nowrap">ĐÃ LƯU! MỜI NHẬP TIẾP.</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button onClick={onClose} className="flex-1 py-2 text-gray-500 text-xs font-black hover:bg-gray-200 rounded-md transition-all uppercase tracking-wider bg-gray-100">
            <span translate="no" className="notranslate"><span translate="no" className="notranslate">HỦY</span></span>
          </button>
          <button 
            disabled={isProcessingFile || isSaving}
            onClick={async () => {
              if (isSaving) return;
              try {
                // Validation: All fields mandatory
                if (!assigneeId) { alert("Vui lòng chọn NGƯỜI THỰC HIỆN"); return; }
                if (!issueDate) { alert("Thiếu NGÀY KHỞI TẠO"); return; }
                if (!startDate) { alert("Vui lòng chọn NGÀY BẮT ĐẦU"); return; }
                if (!expectedDate) { alert("Vui lòng chọn HẠN HOÀN THÀNH"); return; }
                if (!category) { alert("Vui lòng chọn PHÂN LOẠI CÔNG VIỆC"); return; }
                if (!title.trim()) { alert("Vui lòng nhập HẠNG MỤC CÔNG VIỆC"); return; }
                if (!objective.trim()) { alert("Vui lòng nhập MỤC TIÊU ĐẠT ĐƯỢC"); return; }

                setIsSaving(true);
                const assignee = users.find(u => u.id === assigneeId);
                // Final validation/defaults
                const finalStartDate = startDate;
                const finalIssueDate = issueDate;
                let finalExpectedDate = expectedDate;

                await onSave({ 
                  title: title.trim(), 
                  objective: objective.trim(),
                  category: category || '',
                  assigneeId, 
                  assignedTo: assignee?.name || '',
                  issueDate: finalIssueDate,
                  startDate: finalStartDate,
                  expectedEndDate: finalExpectedDate || null,
                  extensionDate: extensionDate || null,
                  recurrence: recurrence || 'NONE',
                  attachmentUrl: attachmentData?.url || "",
                  attachmentName: attachmentData?.name || "",
                  code: nextCode, 
                  status: isEdit ? task.status : (isAdmin ? 'APPROVED' : 'PENDING'),
                  isNewUpdate: true,
                  authorId: currentUser.uniqueKey || currentUser.id,
                  authorName: currentUser.name,
                  lastUpdatedBy: currentUser.uniqueKey || currentUser.id,
                  lastUpdatedByRole: currentUser.role,
                  systemCreatedAt: new Date().toISOString()
                });

                if (!isEdit) {
                  resetFormForNext();
                } else {
                  onClose();
                }
              } catch (error) {
                console.error("Lỗi khi lưu công việc:", error);
                alert("Có lỗi xảy ra khi lưu công việc. Vui lòng thử lại!");
              } finally {
                setIsSaving(false);
              }
            }}
            className="flex-1 py-2 bg-blue-600 text-white font-black rounded-md hover:bg-blue-700 transition-all disabled:opacity-50 uppercase text-xs tracking-widest"
          >
            <span translate="no" className="notranslate"><span translate="no" className="notranslate">{isSaving ? 'ĐANG LƯU...' : (isEdit ? 'CẬP NHẬT' : 'KHỞI TẠO')}</span></span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
