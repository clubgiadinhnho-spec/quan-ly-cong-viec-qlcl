import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { FIXED_STAFF } from '../constants/staff';

export const useStaff = () => {
  const [firestoreProfiles, setFirestoreProfiles] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to user_profiles collection for real-time updates as requested
    const unsub = onSnapshot(collection(db, 'user_profiles'), (snapshot) => {
      const p: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        // Use email as key (lowercase) or the doc ID if it's already an email
        const data = doc.data();
        const key = (data.personalEmail || doc.id).toLowerCase();
        p[key] = { ...data, id: doc.id } as User;
      });
      setFirestoreProfiles(p);
      setLoading(false);
    }, (error) => {
      // If it's a permission error and we are not yet signed in, it might be transient 
      // but with our new 'allow read: if true' rule, this shouldn't happen.
      if (error.code !== 'permission-denied') {
        console.error("Staff profiles listener error:", error);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const allStaff = useMemo(() => {
    // VIẾT LẠI LOGIC GỘP (MERGE) BẮT BUỘC:
    // Bước 1: Lấy 5 người từ file staff.ts làm khung.
    const baseStaff = [...FIXED_STAFF];

    // Bước 2: So khớp theo Email. Nếu trên Firestore có dữ liệu, GHI ĐÈ Password, Phone, Avatar.
    const firestoreUsers = Object.values(firestoreProfiles) as User[];
    
    // GỘP DỮ LIỆU (MERGE) BẮT BUỘC:
    // Bước 1: Lấy 5 người từ file staff.ts làm khung.
    const merged = FIXED_STAFF.map(fixed => {
      const pEmail = fixed.personalEmail?.toLowerCase();
      const cEmail = fixed.companyEmail?.toLowerCase();
      
      // Bước 2: So khớp theo Email (Cá nhân hoặc Công ty) hoặc ID hoặc Code
      const firestoreUser = firestoreUsers.find(fu => {
        const fuPEmail = fu.personalEmail?.toLowerCase();
        const fuCEmail = fu.companyEmail?.toLowerCase();
        const fuId = fu.id?.toLowerCase();
        const fuCode = fu.code?.toLowerCase();
        
        return (fuPEmail && (fuPEmail === pEmail || fuPEmail === cEmail)) || 
               (fuCEmail && (fuCEmail === pEmail || fuCEmail === cEmail)) ||
               (fuId === pEmail) ||
               (fuId === cEmail) ||
               (fuCode === fixed.code?.toLowerCase());
      });

      if (firestoreUser) {
        // CẤP BẬC ƯU TIÊN: Dữ liệu Firestore GHI ĐÈ dữ liệu mẫu
        // Giữ lại id và code gốc để không làm hỏng UI/Mapping nghiệp vụ
        return { 
          ...fixed, 
          ...firestoreUser,
          id: fixed.id, 
          code: fixed.code,
          // Ưu tiên các trường yêu cầu: Mật khẩu, SĐT, Avatar
          password: firestoreUser.password || fixed.password || '123456',
          phone: firestoreUser.phone || fixed.phone,
          avatar: firestoreUser.avatar || fixed.avatar
        } as User;
      }
      // Mặc định mật khẩu là 123456 nếu chưa có trên Firestore
      return { ...fixed, password: fixed.password || '123456' };
    });

    // Bước 3: Trả về danh sách đã gộp (Cộng thêm người mới nếu có)
    const matchedEmails = new Set();
    merged.forEach(s => {
      if (s.personalEmail) matchedEmails.add(s.personalEmail.toLowerCase());
      if (s.companyEmail) matchedEmails.add(s.companyEmail.toLowerCase());
    });
    
    firestoreUsers.forEach(fUser => {
      const fPEmail = fUser.personalEmail?.toLowerCase();
      const fCEmail = fUser.companyEmail?.toLowerCase();
      if ((fPEmail && matchedEmails.has(fPEmail)) || (fCEmail && matchedEmails.has(fCEmail))) {
        return;
      }
      merged.push({
        ...fUser,
        password: fUser.password || '123456'
      });
    });

    return merged;
  }, [firestoreProfiles]);

  const updateProfile = async (email: string, updates: Partial<User>) => {
    try {
      const docId = email.toLowerCase();
      const docRef = doc(db, 'user_profiles', docId);
      
      // Ensure we store the password in the 'password' field as requested
      await setDoc(docRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  };

  const deleteProfile = async (email: string) => {
    try {
      await deleteDoc(doc(db, 'user_profiles', email.toLowerCase()));
    } catch (error) {
      console.error("Error deleting profile:", error);
      throw error;
    }
  };

  return { allStaff, loading, updateProfile, deleteProfile, firestoreProfiles };
};
