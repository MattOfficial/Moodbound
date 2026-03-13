import { createContext, useContext } from 'react';
import type React from 'react';
import type { UserProfile } from '../api/client';

export interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  login: (token: string) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
