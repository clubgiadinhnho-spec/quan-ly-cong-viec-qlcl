import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { TaskCategory, Task } from '../../types';
import { Plus, Pencil, Trash2, X, Check, Search, Tag, AlertTriangle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CategoryManagementProps {
  tasks: Task[];
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ tasks }) => {
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<TaskCategory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const codeInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    code: '',
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
      setFormData({ code: cat.code, name: cat.name });
    } else {
      setEditingCategory(null);
      setFormData({ code: '', name: '' });
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
          name: formData.name
        });
        setIsModalOpen(false);
      } else {
        await addDoc(collection(db, 'task_categories'), {
          code: code,
          name: formData.name
        });
        
        // CHẾ ĐỘ NHẬP LIỆU LIÊN TỤC
        setFormData({ code: '', name: '' });
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

    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục [${cat.code}] - ${cat.name}?`)) {
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
          
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl font-bold text-sm shadow-xl hover:bg-blue-50 transition-all active:scale-95 group"
          >
            <Plus size={18} className="transition-transform group-hover:rotate-90" />
            <span translate="no" className="notranslate">THÊM DANH MỤC</span>
          </button>
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
                  <th className="px-4 py-4 text-left text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30">
                    <span translate="no" className="notranslate">STT</span>
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30">
                    <span translate="no" className="notranslate">MÃ</span>
                  </th>
                  <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest border-r border-blue-500/30">
                    <span translate="no" className="notranslate">TÊN PHÂN LOẠI</span>
                  </th>
                  <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-widest">
                    <span translate="no" className="notranslate">THAO TÁC</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="popLayout">
                  {filteredCategories.map((cat, index) => (
                    <motion.tr
                      key={cat.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-blue-50/50 transition-colors group"
                    >
                      <td className="px-4 py-4 text-center text-xs font-bold text-gray-400 border-r border-gray-50">
                        <span translate="no" className="notranslate">{index + 1}</span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-50">
                        <span translate="no" className="notranslate font-mono font-black text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 uppercase">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 border-r border-gray-50">
                        <span translate="no" className="notranslate font-bold text-gray-700">
                          {cat.name}
                        </span>
                      </td>
                      <td className="px-6 py-4">
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">
                      <span translate="no" className="notranslate">TÊN PHÂN LOẠI</span>
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
    </div>
  );
};

