import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { FIXED_STAFF } from '../constants/staff';

export const useStaff = () => {
  const [firestoreProfiles, setFirestoreProfiles] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'user_profiles'), (snapshot) => {
      const p: Record<string, User> = {};
      snapshot.docs.forEach(doc => {
        p[doc.id.toLowerCase()] = { ...doc.data(), id: doc.id } as User;
      });
      setFirestoreProfiles(p);
      setLoading(false);
    }, (error) => {
      console.error("Staff profiles listener error:", error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const allStaff = useMemo(() => {
    // Start with fixed staff
    const merged = [...FIXED_STAFF].map(fixed => {
      const email = fixed.personalEmail.toLowerCase();
      if (firestoreProfiles[email]) {
        // Merge - prioritizing firestore profiles
        return { 
          ...fixed, 
          ...firestoreProfiles[email],
          // Ensure we don't lose the role if it's not and admin update
          role: firestoreProfiles[email].role || fixed.role 
        };
      }
      return fixed;
    });

    // Add people from firestore who are NOT in fixed staff
    const fixedEmails = new Set(FIXED_STAFF.map(s => s.personalEmail.toLowerCase()));
    
    Object.keys(firestoreProfiles).forEach(email => {
      if (!fixedEmails.has(email)) {
        merged.push(firestoreProfiles[email]);
      }
    });

    return merged;
  }, [firestoreProfiles]);

  const updateProfile = async (email: string, updates: Partial<User>) => {
    try {
      const docRef = doc(db, 'user_profiles', email.toLowerCase());
      // On creation, we ensure id is the email
      if (!firestoreProfiles[email.toLowerCase()]) {
         updates.id = email.toLowerCase();
      }
      await setDoc(docRef, updates, { merge: true });
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
