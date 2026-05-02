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
    
    const merged = baseStaff.map(fixed => {
      const pEmail = fixed.personalEmail?.toLowerCase();
      const cEmail = fixed.companyEmail?.toLowerCase();
      
      // Tìm dữ liệu tương ứng trên Firestore - ƯU TIÊN Email Cá nhân làm định danh gốc
      const firestoreUser = firestoreUsers.find(fu => {
        const fuPEmail = fu.personalEmail?.toLowerCase();
        const fuCEmail = fu.companyEmail?.toLowerCase();
        return (fuPEmail && (fuPEmail === pEmail || fuPEmail === cEmail)) || 
               (fuCEmail && (fuCEmail === pEmail || fuCEmail === cEmail)) ||
               (fu.id.toLowerCase() === pEmail) ||
               (fu.id.toLowerCase() === cEmail);
      });

      if (firestoreUser) {
        // CẤP BẬC ƯU TIÊN: Dữ liệu Firestore ghi đè dữ liệu mẫu
        return { 
          ...fixed, 
          ...firestoreUser,
          // Đảm bảo mật khẩu mới từ Firestore luôn được ưu tiên
          password: firestoreUser.password || fixed.password || '123456',
          phone: firestoreUser.phone || fixed.phone,
          avatar: firestoreUser.avatar || fixed.avatar,
          id: fixed.id, 
          name: fixed.name
        } as User;
      }
      return { ...fixed, password: fixed.password || '123456' };
    });

    // Bước 3: Trả về danh sách đã gộp này (Cộng thêm những người mới hoàn toàn trong Firestore)
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
      merged.push(fUser);
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
