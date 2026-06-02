import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User as UserType } from "../types";
import { auth, logout, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDocFromServer, setDoc } from 'firebase/firestore';

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

  const [fbUser, setFbUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (fbUser) {
      const userEmail = (fbUser.email || "").toLowerCase();
      const systemAdmins = [
        "truong.le@tanphuvietnam.vn", 
        "lenhattruong.tpp@gmail.com", 
        "lenhattruong.caphef1@gmail.com",
        "club.nhuatanphu@gmail.com", 
        "tanphuvietnam.tpp@gmail.com", 
        "truongln.tanhongngoc@gmail.com",
        "lenhattruong.ddt@gmail.com"
      ];
      const isSystemAdmin = systemAdmins.includes(userEmail);
      
      let matchingStaff = allUsers.find(s => s.id === fbUser.uid || (s as any).uid === fbUser.uid);
      if (!matchingStaff) {
        matchingStaff = allUsers.find(s => 
          (s.companyEmail || "").toLowerCase() === userEmail || 
          (s.personalEmail || "").toLowerCase() === userEmail ||
          (s.email || "").toLowerCase() === userEmail
        );
      }
      
      if (matchingStaff) {
        const hasMismatchedUid = (matchingStaff as any).uid !== fbUser.uid;
        if (hasMismatchedUid && matchingStaff.uniqueKey) {
          const syncUid = async () => {
            try {
              await setDoc(doc(db, 'user_profiles', matchingStaff.uniqueKey), {
                id: fbUser.uid,
                uid: fbUser.uid,
                email: fbUser.email || "",
                updatedAt: new Date().toISOString()
              }, { merge: true });
              console.log(`[Auto-Sync] Đấu nối thành công UID ${fbUser.uid} cho nhân sự ${matchingStaff.uniqueKey}`);
            } catch (err) {
              console.error("[Auto-Sync] Thất bại khi ghi Firestore user_profiles:", err);
            }
          };
          syncUid();
        }
      }

      let nextUser: UserType | null = null;

      if (isSystemAdmin) {
        const adminProfile = matchingStaff ? { ...matchingStaff, role: "Admin" as any } : {
          id: fbUser.uid,
          name: "System Admin",
          role: "Admin",
          personalEmail: fbUser.email || "",
          status: "ACTIVE",
          uniqueKey: `ADMIN_${fbUser.uid}`
        };
        nextUser = { ...adminProfile, id: fbUser.uid, email: fbUser.email || "" } as UserType;
      } else if (matchingStaff) {
        if (matchingStaff.status === 'ACTIVE' || matchingStaff.role === 'Admin') {
          nextUser = { ...matchingStaff, id: fbUser.uid, email: fbUser.email || "" } as UserType;
        } else {
          handleLogout();
          return;
        }
      }

      const isDifferent = !currentUser && nextUser !== null ||
                          !!currentUser && nextUser === null ||
                          (!!currentUser && !!nextUser && (
                            currentUser.id !== nextUser.id || 
                            currentUser.name !== nextUser.name ||
                            currentUser.role !== nextUser.role ||
                            currentUser.phone !== nextUser.phone ||
                            currentUser.companyEmail !== nextUser.companyEmail ||
                            currentUser.personalEmail !== nextUser.personalEmail ||
                            currentUser.status !== nextUser.status ||
                            currentUser.avatar !== nextUser.avatar ||
                            currentUser.uniqueKey !== nextUser.uniqueKey ||
                            JSON.stringify(currentUser.delegatedPermissions) !== JSON.stringify(nextUser.delegatedPermissions)
                          ));

      if (isDifferent) {
        setCurrentUser(nextUser ? { ...nextUser, lastActive: Date.now() } : null);
      }
    } else {
      if (currentUser !== null) {
        setCurrentUser(null);
      }
    }
  }, [fbUser, allUsers, handleLogout, currentUser]);

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
