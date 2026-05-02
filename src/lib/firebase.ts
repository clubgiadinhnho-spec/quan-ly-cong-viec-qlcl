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
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '@/firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

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
