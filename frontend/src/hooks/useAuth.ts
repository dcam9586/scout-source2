import { useCallback } from 'react';
import api from '../store/api';
import useAppStore from '../store/appStore';
import { User, ApiUsage } from '../types';

export function useAuth() {
  const setToken = useAppStore((state) => state.setToken);
  const setUser = useAppStore((state) => state.setUser);
  const logout = useAppStore((state) => state.logout);

  const initializeAuth = useCallback(
    (token: string, user: User) => {
      setToken(token);
      setUser(user);
    },
    [setToken, setUser]
  );

  const getProfile = useCallback(async () => {
    try {
      const response = await api.get<{ user: User }>('/api/user/profile');
      setUser(response.data.user);
      return response.data.user;
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      throw error;
    }
  }, [setUser]);

  const getUsage = useCallback(async () => {
    try {
      const response = await api.get<ApiUsage>('/api/user/usage');
      useAppStore.setState({ usage: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      throw error;
    }
  }, []);

  return {
    initializeAuth,
    getProfile,
    getUsage,
    logout,
  };
}
