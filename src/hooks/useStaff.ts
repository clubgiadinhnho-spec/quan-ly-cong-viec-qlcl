import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth'; // Import for local auth listener
import { db, auth } from '../lib/firebase';
import { User } from '../types';
import { FIXED_STAFF, SYSTEM_ADMIN_EMAILS } from '../constants/staff'; // Import admin list
import { generateUniqueKey } from '../utils/stringUtils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  const jsonErr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonErr);
  throw new Error(jsonErr);
}

export const useStaff = () => {
  const [firestoreProfiles, setFirestoreProfiles] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to staff profiles immediately (allow read: if true in rules)
    const unsubSnapshot = onSnapshot(collection(db, 'user_profiles'), (snapshot) => {
      const p: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        p[doc.id] = { 
          ...data, 
          uid: data.id || null, // Preserve firebase uid as uid
          id: doc.id 
        } as unknown as User;
      });
      setFirestoreProfiles(p);
      setLoading(false);
    }, (err) => {
      console.error("❌ [useStaff] Snapshot error:", err);
      setLoading(false);
    });

    // 2. Auth listener for other purposes (optional)
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        // We keep profiles even if logged out so login screen can show them if needed
        return;
      }
    });

    return () => {
      unsubSnapshot();
      unsubAuth();
    };
  }, []);

  const allStaff = useMemo(() => {
    // SOURCE OF TRUTH LOGIC:
    // 1. Dùng FIXED_STAFF làm khung xương (Skeleton)
    const merged = FIXED_STAFF.map(fixed => {
      const firestoreUser = (firestoreProfiles[fixed.uniqueKey] || (Object.values(firestoreProfiles) as User[]).find(u => u.uniqueKey === fixed.uniqueKey)) as User | undefined;

      if (firestoreUser) {
        // CẤP BẬC ƯU TIÊN: Firestore ghi đè 100% các thông tin linh động
        return { 
          ...fixed, 
          ...firestoreUser,
          // Giữ lại các ID định danh thép
          uniqueKey: fixed.uniqueKey,
          id: fixed.id, 
          code: fixed.code,
          // Bắt buộc lấy password, phone từ Firestore hoặc hiện "CHỜ CẬP NHẬT"
          // Ta không dùng fallback '123456' hay dữ liệu trong staff.ts nữa
          password: firestoreUser.password || 'CHỜ CẬP NHẬT',
          phone: firestoreUser.phone || 'CHỜ CẬP NHẬT',
          personalEmail: firestoreUser.personalEmail || 'CHỜ CẬP NHẬT'
        } as User;
      }
      
      // Nếu Firestore không có document cho người này -> Báo "CHỜ CẬP NHẬT"
      return { 
        ...fixed, 
        password: 'CHỜ CẬP NHẬT',
        phone: 'CHỜ CẬP NHẬT',
        personalEmail: 'CHỜ CẬP NHẬT'
      } as User;
    });

    // 2. Thêm những người dùng mới chỉ có trong Firestore
    const fixedKeys = new Set(FIXED_STAFF.map(s => s.uniqueKey));
    (Object.values(firestoreProfiles) as User[]).forEach(fUser => {
      if (fUser.uniqueKey && !fixedKeys.has(fUser.uniqueKey)) {
        merged.push({
          ...fUser,
          // Đảm bảo không bị trống
          password: fUser.password || 'CHỜ CẬP NHẬT',
          phone: fUser.phone || 'CHỜ CẬP NHẬT'
        });
      }
    });

    // 3. Khóa chống trùng lặp tuyệt đối (Deduplication Guard)
    const uniqueMerged: User[] = [];
    const seenIds = new Set<string>();
    const seenUniqueKeys = new Set<string>();

    merged.forEach(user => {
      const uId = user.id || user.uniqueKey;
      const uKey = user.uniqueKey || user.id;
      if (uId && uKey) {
        if (!seenIds.has(uId) && !seenUniqueKeys.has(uKey)) {
          seenIds.add(uId);
          seenUniqueKeys.add(uKey);
          uniqueMerged.push({
            ...user,
            id: uId,
            uniqueKey: uKey
          });
        }
      }
    });

    return uniqueMerged;
  }, [firestoreProfiles]);

  const updateProfile = async (uniqueKey: string, updates: Partial<User>) => {
    try {
      const docRef = doc(db, 'user_profiles', uniqueKey);
      // Đảm bảo uniqueKey luôn tồn tại trong document
      await setDoc(docRef, {
        ...updates,
        uniqueKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log(`✅ [Source of Truth] Đã cập nhật Firestore cho: ${uniqueKey}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `user_profiles/${uniqueKey}`);
    }
  };

  const deleteProfile = async (uniqueKey: string) => {
    try {
      await deleteDoc(doc(db, 'user_profiles', uniqueKey));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `user_profiles/${uniqueKey}`);
    }
  };

  return { allStaff, loading, updateProfile, deleteProfile, firestoreProfiles };
};
