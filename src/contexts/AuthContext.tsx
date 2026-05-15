import React, { createContext, useContext, ReactNode } from "react";
import { User as UserType } from "../types";
import { useAuth } from "../hooks/useAuth";
import { useStaff } from "../hooks/useStaff";

interface AuthContextType {
  currentUser: UserType | null;
  setCurrentUser: (u: UserType | null) => void;
  simulatedUser: UserType | null;
  setSimulatedUser: (u: UserType | null) => void;
  effectiveUser: UserType | null;
  authReady: boolean;
  handleLogout: () => Promise<void>;
  isAdmin: boolean;
  allUsers: UserType[];
  staffLoading: boolean;
  updateProfile: any;
  deleteProfile: any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { allStaff: allUsers, loading: staffLoading, updateProfile, deleteProfile } = useStaff();
  const auth = useAuth(allUsers);
  
  const isAdmin = auth.effectiveUser?.role === 'Admin';

  const value = {
    ...auth,
    isAdmin,
    allUsers,
    staffLoading,
    updateProfile,
    deleteProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
}
