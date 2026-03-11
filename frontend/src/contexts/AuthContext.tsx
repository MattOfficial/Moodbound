import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, getUserProfile, type UserProfile } from '../api/client';

interface AuthContextType {
  token: string | null;
  isAuthenticated: boolean;
  profile: UserProfile | null;
  setProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('vibe_token'));
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (token) {
      localStorage.setItem('vibe_token', token);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Fetch profile data globally when authenticated
      getUserProfile()
        .then(data => setProfile(data))
        .catch(err => console.error("Failed to load profile for AuthContext", err));
    } else {
      localStorage.removeItem('vibe_token');
      delete apiClient.defaults.headers.common['Authorization'];
      setProfile(null);
    }
  }, [token]);

  const login = (newToken: string) => setToken(newToken);
  const logout = () => {
      setToken(null);
      setProfile(null);
  };

  const isAuthenticated = !!token;

  return (
    <AuthContext.Provider value={{ token, isAuthenticated, profile, setProfile, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
