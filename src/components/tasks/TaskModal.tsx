import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Plus, Info, Paperclip, X } from 'lucide-react';
import { Task, User, RecurrenceType } from '../../types';
import imageCompression from 'browser-image-compression';

interface TaskModalProps {
  onClose: () => void;
  onSave: (task: any) => void;
  users: User[];
  tasks: Task[];
  task?: Task;
  currentUser: User;
}

export const TaskModal = ({ onClose, onSave, users, tasks, task, currentUser }: TaskModalProps) => {
  const [title, setTitle] = useState(task?.title || '');
  const [objective, setObjective] = useState(task?.objective || '');
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
  const [expectedDate, setExpectedDate] = useState(task?.expectedEndDate || '');
  const [extensionDate, setExtensionDate] = useState(task?.extensionDate || '');
  const [recurrence, setRecurrence] = useState<RecurrenceType>(task?.recurrence || 'NONE');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentData, setAttachmentData] = useState<{ url: string, name: string } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isManualEdit, setIsManualEdit] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const isEdit = !!task;

  // Generate Preview Code for New Tasks
  const nextCode = React.useMemo(() => {
    if (isEdit) return task.code;
    const count = tasks.length;
    return `C${String(count + 1).padStart(4, '0')}`;
  }, [tasks.length, isEdit, task?.code]);

  const calculateDeadline = (start: string, type: RecurrenceType): string => {
    if (type === 'NONE') return '';
    const date = new Date(start);
    switch (type) {
      case 'DAILY': date.setDate(date.getDate() + 1); break;
      case 'TRI_DAILY': date.setDate(date.getDate() + 3); break;
      case 'WEEKLY': date.setDate(date.getDate() + 7); break;
      case 'BI_WEEKLY': date.setDate(date.getDate() + 14); break;
      case 'TRI_WEEKLY': date.setDate(date.getDate() + 21); break;
      case 'MONTHLY': date.setMonth(date.getMonth() + 1); break;
    }
    return date.toISOString().split('T')[0];
  };

  // Sync deadline if cycle or start date changes, unless manually edited
  React.useEffect(() => {
    if (!isEdit && !isManualEdit && recurrence !== 'NONE') {
      const calculated = calculateDeadline(startDate || new Date().toISOString().split('T')[0], recurrence);
      setExpectedDate(calculated);
    }
  }, [recurrence, startDate, isEdit, isManualEdit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white w-full max-w-lg rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            {isEdit ? <Edit2 className="text-blue-600" /> : <Plus className="text-blue-600" />}
            <span translate="no" className="notranslate">{isEdit ? 'CẬP NHẬT CÔNG VIỆC' : 'NHẬP CÔNG VIỆC MỚI'}</span>
          </h2>
          {!isEdit && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-0.5">Mã dự kiến:</span>
              <span translate="no" className="notranslate text-blue-600 font-black font-mono text-lg leading-none bg-blue-50 px-2 py-1 rounded border border-blue-100">{nextCode}</span>
            </div>
          )}
        </div>

        {!isEdit && (
          <div className="mb-6">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors bg-blue-50/50 px-3 py-1.5 rounded-lg border border-blue-100"
            >
              <Info size={14} />
              <span translate="no" className="notranslate">{showGuide ? 'Đóng hướng dẫn' : 'Xem hướng dẫn nhập liệu'}</span>
            </button>
            
            <AnimatePresence>
              {showGuide && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] leading-relaxed text-slate-600 space-y-2">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span translate="no" className="notranslate">
                        <strong>NGÀY BẮT ĐẦU:</strong> Nếu để trống, hệ thống tự lấy ngày hôm nay.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span translate="no" className="notranslate">
                        <strong>CHU KỲ:</strong> Chọn tần suất lặp lại. Hệ thống sẽ tự tính toán <strong>HẠN HOÀN THÀNH</strong>.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span translate="no" className="notranslate">
                        <strong>HẠN HOÀN THÀNH:</strong> Đây là hạn chót của chu kỳ hiện tại. Bạn có thể sửa tay nếu cần xê dịch.
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1 shrink-0" />
                      <span translate="no" className="notranslate">
                        <strong>NỘI DUNG & MỤC TIÊU:</strong> Phải ghi rõ kết quả cần đạt được (Ví dụ: Hoàn thành 100% hồ sơ).
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                <span translate="no" className="notranslate">Người thực hiện</span>
              </label>
              <select 
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="" translate="no" className="notranslate">CHỌN NHÂN SỰ</option>
                {sortedUsers.map((u) => <option key={u.id} value={u.id} className="notranslate">{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 mb-1 uppercase">
                <span translate="no" className="notranslate">Chu kỳ (Lặp lại)</span>
              </label>
              <select 
                className="w-full px-4 py-3 bg-blue-50 border border-blue-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceType)}
              >
                <option value="NONE" translate="no" className="notranslate">KHÔNG LẶP</option>
                <option value="DAILY" translate="no" className="notranslate">HÀNG NGÀY (+1 NGÀY)</option>
                <option value="TRI_DAILY" translate="no" className="notranslate">2-3 NGÀY/LẦN (+3 NGÀY)</option>
                <option value="WEEKLY" translate="no" className="notranslate">HÀNG TUẦN (+7 NGÀY)</option>
                <option value="BI_WEEKLY" translate="no" className="notranslate">HÀNG 2 TUẦN (+14 NGÀY)</option>
                <option value="TRI_WEEKLY" translate="no" className="notranslate">HÀNG 3 TUẦN (+21 NGÀY)</option>
                <option value="MONTHLY" translate="no" className="notranslate">HÀNG THÁNG (+1 THÁNG)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
              <span translate="no" className="notranslate">Hạng mục công việc *</span>
            </label>
            <textarea 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 h-20 resize-none font-bold"
              placeholder="Nhập tên công việc..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
              <span translate="no" className="notranslate">Mục tiêu đạt được *</span>
            </label>
            <input 
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
              placeholder="Mục tiêu cụ thể cho công việc này..."
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                <span translate="no" className="notranslate">NGÀY BẮT ĐẦU</span>
              </label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                <span translate="no" className="notranslate">Hạn hoàn thành</span>
              </label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-blue-600"
                value={expectedDate}
                onChange={(e) => {
                  setExpectedDate(e.target.value);
                  setIsManualEdit(true);
                }}
                min={startDate}
              />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-bold text-emerald-600 mb-1 uppercase">
                <span translate="no" className="notranslate">Gia hạn (nếu có)</span>
              </label>
              <input 
                type="date"
                className="w-full px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-emerald-700 font-bold"
                value={extensionDate}
                onChange={(e) => setExtensionDate(e.target.value)}
                min={expectedDate}
              />
            </div>
          )}
          
          {!isEdit && (
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                <span translate="no" className="notranslate">Đính kèm tài liệu mô tả (PDF/Ảnh)</span>
              </label>
              <div className="relative group">
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
                        if (processedFile.size > 850 * 1024) {
                          processedFile = await imageCompression(file, { ...options, maxSizeMB: 0.5 });
                        }
                      } catch (error) {
                        console.error("Compression failed:", error);
                      }
                    }

                    // Total limit ~800KB for Firestore safety
                    if (processedFile.size > 800 * 1024) {
                      alert(`Tệp "${file.name}" quá lớn (${(processedFile.size / 1024 / 1024).toFixed(2)}MB). Giới hạn tối đa là 800KB để lưu vào hệ thống.`);
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
                <div className="flex flex-col gap-2">
                  <label 
                    htmlFor="task-attachment"
                    className={`flex items-center justify-between w-full px-4 py-3 bg-gray-50 border border-gray-200 border-dashed rounded-lg cursor-pointer group-hover:border-blue-400 group-hover:bg-blue-50/30 transition-all ${isProcessingFile ? 'opacity-50 cursor-wait' : ''}`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Paperclip size={16} className="text-gray-400 shrink-0" />
                      <span className="text-gray-400 text-sm truncate pr-4">
                        {isProcessingFile ? "Đang xử lý..." : (attachment ? attachment.name : "Chọn file PDF hoặc Ảnh...")}
                      </span>
                    </div>
                    {!isProcessingFile && (
                      <span className="text-[10px] font-bold bg-gray-200 text-gray-600 px-2 py-1 rounded group-hover:bg-blue-600 group-hover:text-white uppercase transition-all">
                        {attachment ? "Thay đổi" : "Browse"}
                      </span>
                    )}
                  </label>
                  
                  {attachmentData && !isProcessingFile && (
                    <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100 text-xs text-blue-700">
                      <span className="truncate flex-1 font-bold italic">{attachmentData.name} (Ready)</span>
                      <button 
                        type="button"
                        onClick={() => { setAttachment(null); setAttachmentData(null); }}
                        className="p-1 hover:bg-blue-100 rounded-full text-blue-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 text-gray-600 font-bold hover:bg-gray-100 rounded-lg transition-all uppercase">
            <span translate="no" className="notranslate">HỦY</span>
          </button>
          <button 
            disabled={!title || !assigneeId || isProcessingFile}
            onClick={() => {
              const assignee = users.find(u => u.id === assigneeId);
              // Final validation/defaults
              const finalStartDate = startDate || new Date().toISOString().split('T')[0];
              let finalExpectedDate = expectedDate;
              if (!finalExpectedDate && recurrence !== 'NONE') {
                finalExpectedDate = calculateDeadline(finalStartDate, recurrence);
              }

              onSave({ 
                title, 
                objective, 
                assigneeId, 
                assignedTo: assignee?.name || '',
                startDate: finalStartDate,
                expectedEndDate: finalExpectedDate,
                extensionDate: extensionDate || null,
                recurrence,
                attachment,
                attachmentUrl: attachmentData?.url || "",
                attachmentName: attachmentData?.name || "",
                code: nextCode // Include the pre-generated code
              });
            }}
            className="flex-1 px-4 py-3 bg-[#1A56DB] text-white font-bold rounded-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:shadow-none uppercase"
          >
            <span translate="no" className="notranslate">{isEdit ? 'CẬP NHẬT' : 'KHỞI TẠO'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
