import React, { useState, useEffect } from 'react';
import { apiClient, getUserProfile, type UserProfile } from '../api/client';
import { AuthContext } from './auth-context';

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
