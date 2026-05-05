import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  updatePassword
} from 'firebase/auth';
import { 
  getFirestore, 
  enableNetwork, 
  doc, 
  getDocFromServer, 
  query, 
  collection, 
  where, 
  getDocs, 
  updateDoc 
} from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
// @ts-ignore
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

// ÉP BUỘC KÍCH HOẠT LẠI KẾT NỐI NGAY LẬP TỨC
enableNetwork(db).then(() => {
  console.log("Firestore network enabled - FORCED");
}).catch(err => {
  console.error("Failed to enable network:", err);
});

// THIẾT QUÂN LUẬT: TÌM HỒ SƠ THEO EMAIL VÀ ĐỒNG BỘ UID
export const findProfileByEmail = async (email: string) => {
  const q = query(
    collection(db, 'user_profiles'), 
    where('personalEmail', '==', email)
  );
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { data: querySnapshot.docs[0].data(), docId: querySnapshot.docs[0].id };
  }
  
  const q2 = query(
    collection(db, 'user_profiles'), 
    where('companyEmail', '==', email)
  );
  const querySnapshot2 = await getDocs(q2);
  if (!querySnapshot2.empty) {
    return { data: querySnapshot2.docs[0].data(), docId: querySnapshot2.docs[0].id };
  }
  
  return null;
};

export const syncProfileUid = async (docId: string, newUid: string) => {
  const profileRef = doc(db, 'user_profiles', docId);
  await updateDoc(profileRef, { id: newUid });
};

export const loginWithEmail = async (email: string, pass: string) => {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
};

export const registerWithEmail = async (email: string, pass: string, name: string) => {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(result.user, { displayName: name });
  return result.user;
};

export const updateAuthPassword = async (newPassword: string) => {
  if (auth.currentUser) {
    await updatePassword(auth.currentUser, newPassword);
  }
};

export const loginWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  return result.user;
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Logout failed:", error);
    throw error;
  }
};
