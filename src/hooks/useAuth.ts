import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User as UserType } from "../types";
import { auth, logout, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer } from 'firebase/firestore';

export function useAuth(allUsers: UserType[]) {
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [simulatedUser, setSimulatedUser] = useState<UserType | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const allUsersRef = useRef(allUsers);

  useEffect(() => {
    allUsersRef.current = allUsers;
  }, [allUsers]);

  // Test Connection
  useEffect(() => {
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. The client is offline.");
        }
      }
    };
    testConnection();
  }, []);

  const handleLogout = useCallback(async () => {
    console.log("🚀 [AuthHook] Logout sequence initiated");
    setSimulatedUser(null);
    setCurrentUser(null);
    try {
      await logout();
      console.log("✅ [AuthHook] Logout successful");
    } catch (error) {
      console.error("❌ [AuthHook] Logout failed:", error);
      setCurrentUser(null);
    }
  }, []);

  const effectiveUser = useMemo(() => {
    const rawUser = simulatedUser || currentUser;
    if (!rawUser) return null;
    
    const latestUser = allUsers.find(u => 
      (u.uniqueKey && u.uniqueKey === rawUser.uniqueKey) || 
      (u.personalEmail && u.personalEmail === rawUser.personalEmail) ||
      (u.companyEmail && u.companyEmail === rawUser.companyEmail) ||
      (u.email && u.email === rawUser.email) ||
      (u.id && u.id === rawUser.id)
    ) || rawUser;
    
    const systemAdmins = [
      "truong.le@tanphuvietnam.vn", 
      "lenhattruong.tpp@gmail.com", 
      "lenhattruong.caphef1@gmail.com",
      "club.nhuatanphu@gmail.com", 
      "tanphuvietnam.tpp@gmail.com", 
      "truongln.tanhongngoc@gmail.com"
    ];
    const userEmail = (latestUser.email || latestUser.companyEmail || latestUser.personalEmail || "").toLowerCase();
    const isSystemAdmin = systemAdmins.includes(userEmail);
    const finalUser = isSystemAdmin ? { ...latestUser, role: "Admin" as any } : latestUser;
    
    return finalUser;
  }, [simulatedUser, currentUser, allUsers]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userEmail = (fbUser.email || "").toLowerCase();
        const systemAdmins = [
          "truong.le@tanphuvietnam.vn", 
          "lenhattruong.tpp@gmail.com", 
          "lenhattruong.caphef1@gmail.com",
          "club.nhuatanphu@gmail.com", 
          "tanphuvietnam.tpp@gmail.com", 
          "truongln.tanhongngoc@gmail.com"
        ];
        const isSystemAdmin = systemAdmins.includes(userEmail);
        
        const currentAllUsers = allUsersRef.current;
        
        let matchingStaff = currentAllUsers.find(s => s.id === fbUser.uid);
        if (!matchingStaff) {
          matchingStaff = currentAllUsers.find(s => 
            (s.companyEmail || "").toLowerCase() === userEmail || 
            (s.personalEmail || "").toLowerCase() === userEmail
          );
        }
        
        if (isSystemAdmin) {
          const adminProfile = matchingStaff ? { ...matchingStaff, role: "Admin" as any } : {
            id: fbUser.uid,
            name: "System Admin",
            role: "Admin",
            personalEmail: fbUser.email || "",
            status: "ACTIVE",
            uniqueKey: `ADMIN_${fbUser.uid}`
          };
          setCurrentUser({ ...adminProfile, id: fbUser.uid, email: fbUser.email || "", lastActive: Date.now() } as UserType);
        } else if (matchingStaff) {
          if (matchingStaff.status === 'ACTIVE' || matchingStaff.role === 'Admin') {
            setCurrentUser({ ...matchingStaff, id: fbUser.uid, email: fbUser.email || "", lastActive: Date.now() } as UserType);
          } else {
            handleLogout();
          }
        } else {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, [handleLogout]);

  return {
    currentUser,
    setCurrentUser,
    simulatedUser,
    setSimulatedUser,
    effectiveUser,
    authReady,
    handleLogout
  };
}
