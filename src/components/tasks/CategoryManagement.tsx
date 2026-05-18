import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TaskCategory, Task } from '../../types';
import { Plus, Pencil, Trash2, X, Check, Search, Tag, AlertTriangle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagementProps {
  tasks: Task[];
  setConfirmModal?: (m: any) => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ tasks, setConfirmModal }) => {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [isCreatingNewTarget, setIsCreatingNewTarget] = useState(false);
  const [newTargetCode, setNewTargetCode] = useState('');
  const [newTargetName, setNewTargetName] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Reset merge states
  useEffect(() => {
    if (!isMergeModalOpen) {
      setTargetCategoryId('');
      setIsCreatingNewTarget(false);
      setNewTargetCode('');
      setNewTargetName('');
    }
  }, [isMergeModalOpen]);
  
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: '',
    activityName: '',
    name: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'task_categories'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as TaskCategory[];
      setCategories(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenModal = (cat: TaskCategory | null = null) => {
    if (cat) {
      setEditingCategory(cat);
      setFormData({ code: cat.code, activityName: cat.activityName || '', name: cat.name });
    } else {
      setEditingCategory(null);
      setFormData({ code: '', activityName: '', name: '' });
    }
    setError(null);
    setSuccessMsg(null);
    setIsModalOpen(true);
    
    // Autofocus after small delay to let modal animate
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 300);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    
    try {
      const code = formData.code.toUpperCase().trim();
      if (!code) {
        setError('Vui lòng nhập mã danh mục!');
        return;
      }
      if (categories.some(c => c.code === code && c.id !== editingCategory?.id)) {
        setError('Mã danh mục này đã tồn tại!');
        return;
      }

      if (editingCategory) {
        await updateDoc(doc(db, 'task_categories', editingCategory.id), {
          code: code,
          activityName: formData.activityName.trim(),
          name: formData.name
        });
        setIsModalOpen(false);
      } else {
        await addDoc(collection(db, 'task_categories'), {
          code: code,
          activityName: formData.activityName.trim(),
          name: formData.name
        });
        
        // CHẾ ĐỘ NHẬP LIỆU LIÊN TỤC
        setFormData({ code: '', activityName: '', name: '' });
        setSuccessMsg('ĐÃ LƯU! MỜI NHẬP TIẾP.');
        codeInputRef.current?.focus();
        
        // Tự động ẩn thông báo sau 1.5s
        setTimeout(() => {
          setSuccessMsg(null);
        }, 1500);
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setError('Đã có lỗi xảy ra khi lưu!');
    }
  };

  const handleDelete = async (cat: TaskCategory) => {
    setError(null);
    const isUsed = tasks.some(t => t.category === cat.code);
    if (isUsed) {
      alert(`Không thể xóa danh mục [${cat.code}] vì đang có công việc sử dụng mã này!`);
      return;
    }

    if (setConfirmModal) {
      setConfirmModal({
        show: true,
        title: "XÁC NHẬN XÓA DANH MỤC",
        message: `Bạn có chắc chắn muốn xóa vĩnh viễn danh mục [${cat.code}] - ${cat.name} không?`,
        onConfirm: async () => {
          try {
            await deleteDoc(doc(db, 'task_categories', cat.id));
            setConfirmModal((p: any) => ({ ...p, show: false }));
          } catch (err) {
            console.error('Error deleting category:', err);
            alert("Lỗi khi xóa danh mục.");
          }
        }
      });
    } else if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục [${cat.code}] - ${cat.name}?`)) {
      try {
        await deleteDoc(doc(db, 'task_categories', cat.id));
      } catch (err) {
        console.error('Error deleting category:', err);
      }
    }
  };

  const filteredCategories = categories.filter(c => 
    c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCategories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCategories.map(c => c.id));
    }
  };

  const handleBulkMerge = async () => {
    if (selectedIds.length < 2) {
      alert('Vui lòng chọn ít nhất 2 danh mục để gộp!');
      return;
    }

    if (selectedIds.length > 5) {
      alert('Hệ thống chỉ cho phép gộp tối đa 5 danh mục cùng lúc để đảm bảo an toàn cấu trúc dữ liệu.');
      return;
    }

    let finalTargetCode = '';

    if (isCreatingNewTarget) {
      if (!newTargetCode.trim() || !newTargetName.trim()) {
        alert('Vui lòng nhập đầy đủ Mã và Tên cho danh mục mới!');
        return;
      }
      const code = newTargetCode.trim().toUpperCase();
      // Check if code exists
      if (categories.some(c => c.code === code)) {
        alert('Mã này đã tồn tại! Vui lòng chọn mã khác.');
        return;
      }
      finalTargetCode = code;
    } else {
      if (!targetCategoryId) {
        alert('Vui lòng chọn danh mục đích!');
        return;
      }
      const targetCategory = categories.find(c => c.id === targetCategoryId);
      if (!targetCategory) return;
      finalTargetCode = targetCategory.code;
    }

    const sourceCategories = categories.filter(c => selectedIds.includes(c.id) && c.id !== targetCategoryId);

    const confirmMsg = isCreatingNewTarget 
      ? `🔥 CHIẾN DỊCH TÁI CẤU TRÚC: Bạn có chắc muốn gộp ${selectedIds.length} mã cũ vào MÃ MỚI [${finalTargetCode}]?`
      : `🔥 LỆNH THANH TRỪNG: Bạn có chắc muốn gộp ${sourceCategories.length} mã cũ vào mã [${finalTargetCode}]? Thao tác này sẽ cập nhật TOÀN BỘ công việc liên quan.`;

    const performMerge = async () => {
      setIsMerging(true);
      try {
        const batch = writeBatch(db);
        const tasksRef = collection(db, 'tasks');
        
        // Step 1: Create new category if needed
        if (isCreatingNewTarget) {
          const newCatRef = doc(collection(db, 'task_categories'));
          batch.set(newCatRef, {
            code: finalTargetCode,
            name: newTargetName.trim(),
            createdAt: new Date().toISOString()
          });
        }

        // Step 2: Cập nhật toàn bộ Task (kể cả đã xóa) sang mã mới
        const categoriesToProcess = isCreatingNewTarget 
          ? categories.filter(c => selectedIds.includes(c.id))
          : sourceCategories;

        for (const sourceCat of categoriesToProcess) {
          const q = query(tasksRef, where('category', '==', sourceCat.code));
          const snapshot = await getDocs(q);
          snapshot.docs.forEach(taskDoc => {
            batch.update(taskDoc.ref, { 
              category: finalTargetCode,
              lastActionAt: new Date().toISOString()
            });
          });
        }

        // Step 3: Xóa các danh mục cũ
        categoriesToProcess.forEach(cat => {
          batch.delete(doc(db, 'task_categories', cat.id));
        });

        await batch.commit();
        
        setSelectedIds([]);
        setIsMergeModalOpen(false);
        alert('🔥 CẬP NHẬT ĐỒNG BỘ THÀNH CÔNG! HỆ THỐNG ĐÃ ĐƯỢC TÁI CẤU TRÚC.');
      } catch (err) {
        console.error('Merge error:', err);
        alert('Lỗi khi thực hiện gộp mã!');
      } finally {
        setIsMerging(false);
      }
    };

    if (setConfirmModal) {
      setConfirmModal({
        show: true,
        title: "TÁI CẤU TRÚC DANH MỤC",
        message: confirmMsg,
        onConfirm: async () => {
          await performMerge();
          setConfirmModal((p: any) => ({ ...p, show: false }));
        }
      });
    } else if (window.confirm(confirmMsg)) {
      await performMerge();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-blue-600 p-6 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Tag size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                <span translate="no" className="notranslate">QUẢN LÝ DANH MỤC</span>
              </h1>
              <p className="text-blue-100 text-xs font-medium opacity-80 uppercase tracking-widest">
                <span translate="no" className="notranslate">Thiết lập bộ mã phân loại công việc</span>
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleOpenModal()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50 transition-all active:scale-95 group"
            >
              <Plus size={18} className="transition-transform group-hover:rotate-90" />
              <span translate="no" className="notranslate">THÊM DANH MỤC</span>
            </button>

            {selectedIds.length >= 2 && (
              <button 
                onClick={() => setIsMergeModalOpen(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-xl hover:bg-orange-600 transition-all active:scale-95 animate-bounce"
              >
                <span translate="no" className="notranslate">🔥 GỘP CÁC MÃ ĐÃ CHỌN ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input 
            type="text" 
            placeholder="Tìm kiếm mã hoặc tên phân loại..."
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-medium placeholder:notranslate notranslate"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            translate="no"
          />
        </div>

        {/* Table List */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-blue-600 text-white shadow-md">
                  <th className="px-4 py-4 text-center border-r border-blue-500/30 w-12">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-white/30 bg-white/10 checked:bg-orange-500 transition-all cursor-pointer"
                      checked={selectedIds.length === filteredCategories.length && filteredCategories.length > 0}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="px-4 py-4 text-center text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30">
                    <span translate="no" className="notranslate">STT</span>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30 w-24">
                    <span translate="no" className="notranslate">MÃ</span>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30 w-1/3">
                    <span translate="no" className="notranslate">TÊN HOẠT ĐỘNG</span>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30">
                    <span translate="no" className="notranslate">DIỄN GIẢI</span>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest">
                    <span translate="no" className="notranslate">THAO TÁC</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 border-b border-gray-200">
                <AnimatePresence mode="popLayout">
                  {filteredCategories.map((cat, index) => (
                    <motion.tr
                      key={cat.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-blue-50/50 transition-colors group border-b border-gray-100 ${selectedIds.includes(cat.id) ? 'bg-orange-50' : ''}`}
                    >
                      <td className="px-4 py-4 text-center border-r border-gray-200">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                          checked={selectedIds.includes(cat.id)}
                          onChange={() => toggleSelect(cat.id)}
                        />
                      </td>
                      <td className="px-4 py-4 text-center text-xs font-bold text-gray-400 border-r border-gray-200">
                        <span translate="no" className="notranslate">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <span translate="no" className="notranslate font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <span translate="no" className="notranslate font-black text-slate-800">
                          {cat.activityName || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-200">
                        <span translate="no" className="notranslate font-medium text-gray-600 text-sm">
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-100">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleOpenModal(cat)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-blue-100"
                            title="Sửa"
                          >
                            <Pencil size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(cat)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100"
                            title="Xóa"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {!loading && filteredCategories.length === 0 && (
          <div className="text-center py-20 pb-0 flex flex-col items-center">
            <Tag size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-gray-400 font-medium italic">
              <span translate="no" className="notranslate">Không tìm thấy danh mục nào</span>
            </p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-[1001] overflow-hidden"
            >
              <div className="p-6 bg-blue-600 text-white flex justify-between items-center">
                <h2 className="text-xl font-black tracking-tight">
                  <span translate="no" className="notranslate">{editingCategory ? 'SỬA DANH MỤC' : 'THÊM DANH MỤC MỚI'}</span>
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSave} className="p-8 space-y-6">
                {/* Success Message Banner */}
                <AnimatePresence>
                  {successMsg && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-center gap-2 text-green-700 font-black text-xs"
                    >
                      <Sparkles size={16} />
                      <span translate="no" className="notranslate">{successMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-xs font-bold">
                    <AlertTriangle size={16} />
                    <span translate="no" className="notranslate">{error}</span>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="md:col-span-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                      <span translate="no" className="notranslate">MÃ</span>
                    </label>
                    <input 
                      required
                      ref={codeInputRef}
                      translate="no"
                      type="text" 
                      placeholder="VD: TNG"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-700 uppercase text-lg notranslate placeholder:notranslate"
                      value={formData.code}
                      onChange={(e) => setFormData({...formData, code: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                      <span translate="no" className="notranslate">TÊN HOẠT ĐỘNG</span>
                    </label>
                    <input 
                      required
                      translate="no"
                      type="text" 
                      placeholder="VD: THỰC HIỆN THỬ NGHIỆM"
                      className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-black text-gray-800 uppercase text-lg notranslate placeholder:notranslate"
                      value={formData.activityName}
                      onChange={(e) => setFormData({...formData, activityName: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                    <span translate="no" className="notranslate">DIỄN GIẢI</span>
                  </label>
                  <input 
                    required
                    translate="no"
                    type="text" 
                    placeholder="VD: Hoạt động thử nghiệm sản phẩm mới"
                    className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-gray-700 text-lg notranslate placeholder:notranslate"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <span translate="no" className="notranslate">HỦY</span>
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                  >
                    <Check size={24} />
                    <span translate="no" className="notranslate">LƯU</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Merge Modal */}
      <AnimatePresence>
        {isMergeModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000]"
              onClick={() => !isMerging && setIsMergeModalOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-[40px] shadow-2xl z-[2001] overflow-hidden border-4 border-orange-500"
            >
              <div className="p-8 bg-orange-500 text-white text-center">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Sparkles size={40} />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">
                  <span translate="no" className="notranslate">🔥 GỘP MÃ TÁI CẤU TRÚC</span>
                </h2>
                <div className="px-4 py-2 bg-white/20 rounded-full inline-block text-xs font-black">
                  <span translate="no" className="notranslate">ĐÃ CHỌN {selectedIds.length} DANH MỤC</span>
                </div>
              </div>

              <div className="p-10 space-y-6">
                <div>
                  <label className="block text-[11px] font-black text-gray-400 uppercase tracking-[3px] mb-4 text-center">
                    <span translate="no" className="notranslate">CHỌN MÃ ĐÍCH (MÃ SẼ GIỮ LẠI)</span>
                  </label>
                  
                  <div className="space-y-3">
                    {/* Option: Create New Target */}
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewTarget(true);
                        setTargetCategoryId('');
                      }}
                      className={`w-full p-5 rounded-3xl border-2 transition-all flex items-center gap-4 group ${
                        isCreatingNewTarget 
                        ? 'border-blue-500 bg-blue-50 ring-4 ring-blue-100' 
                        : 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCreatingNewTarget ? 'border-blue-500 bg-blue-500' : 'border-gray-300 bg-white'
                      }`}>
                        {isCreatingNewTarget ? <Check size={18} className="text-white" /> : <Plus size={18} className="text-gray-400" />}
                      </div>
                      <div className="text-left">
                        <span translate="no" className="notranslate font-black text-lg text-gray-800">➕ TẠO MÃ ĐÍCH MỚI (2026)</span>
                      </div>
                    </button>

                    {isCreatingNewTarget && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                        className="p-6 bg-blue-50 rounded-3xl border-2 border-blue-200 space-y-4 shadow-inner"
                      >
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 px-1">
                              <span translate="no" className="notranslate">MÃ MỚI 2026</span>
                            </label>
                            <input 
                              type="text"
                              value={newTargetCode}
                              onChange={(e) => setNewTargetCode(e.target.value)}
                              placeholder="VD: KN2026"
                              className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-black text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none uppercase notranslate placeholder:notranslate"
                              translate="no"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 px-1">
                              <span translate="no" className="notranslate">TÊN PHÂN LOẠI MỚI</span>
                            </label>
                            <input 
                              type="text"
                              value={newTargetName}
                              onChange={(e) => setNewTargetName(e.target.value)}
                              placeholder="VD: Tổng hợp khiếu nại..."
                              className="w-full px-4 py-3 bg-white border border-blue-200 rounded-xl font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none notranslate placeholder:notranslate"
                              translate="no"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}

                    <div className="relative py-2 text-center">
                       <span className="absolute left-0 top-1/2 w-full h-[1px] bg-gray-100 -z-10" />
                       <span translate="no" className="notranslate bg-white px-4 text-[10px] font-black text-gray-300 uppercase tracking-widest">Hoặc chọn mã có sẵn</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto pr-2 scrollbar-thin">
                      {categories.filter(c => selectedIds.includes(c.id)).map(cat => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            setIsCreatingNewTarget(false);
                            setTargetCategoryId(cat.id);
                          }}
                          className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${
                            targetCategoryId === cat.id 
                            ? 'border-orange-500 bg-orange-50 ring-4 ring-orange-100' 
                            : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              targetCategoryId === cat.id ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
                            }`}>
                              {targetCategoryId === cat.id && <Check size={14} className="text-white" />}
                            </div>
                            <span translate="no" className="notranslate font-black text-base text-gray-800">{cat.code}</span>
                          </div>
                          <span translate="no" className="notranslate text-[10px] font-bold text-gray-400 group-hover:text-gray-600">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setIsMergeModalOpen(false)}
                    disabled={isMerging}
                    className="flex-1 py-5 bg-gray-100 text-gray-500 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    <span translate="no" className="notranslate">HỦY BỎ</span>
                  </button>
                  <button
                    onClick={handleBulkMerge}
                    disabled={isMerging || (!targetCategoryId && !isCreatingNewTarget)}
                    className="flex-[2] py-5 bg-black text-white rounded-3xl font-black text-sm uppercase tracking-[2px] shadow-2xl hover:bg-gray-900 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {isMerging ? (
                       <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : <Sparkles size={20} className="text-orange-500" />}
                    <span translate="no" className="notranslate">{isCreatingNewTarget ? 'XÁC NHẬN TẠO & GỘP' : 'XÁC NHẬN GỘP MÃ'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

