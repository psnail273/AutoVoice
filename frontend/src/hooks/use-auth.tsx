import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { 
  login as apiLogin, 
  signup as apiSignup, 
  logout as apiLogout, 
  getCurrentUser, 
  isAuthenticated,
  type UserResponse 
} from '@/lib/api';

interface LoadingState {
  initial: boolean;
  refreshing: boolean;
  authenticating: boolean;
}

interface AuthContextType {
  user: UserResponse | null;
  isLoading: LoadingState;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth provider component that manages authentication state.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState<LoadingState>({
    initial: true,
    refreshing: false,
    authenticating: false,
  });

  const refreshUser = useCallback(async () => {
    setIsLoading(prev => ({ ...prev, refreshing: true }));
    try {
      const authenticated = await isAuthenticated();
      if (authenticated) {
        const userData = await getCurrentUser();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Error in refreshUser:', error);
      if (import.meta.env.DEV) {
        console.debug('[Auth] Full error details:', error);
      }
      setUser(null);
    } finally {
      setIsLoading(prev => ({ ...prev, refreshing: false }));
    }
  }, []);

  // Check auth status on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(prev => ({ ...prev, initial: true }));
      await refreshUser();
      setIsLoading(prev => ({ ...prev, initial: false }));
    };
    checkAuth();
  }, [refreshUser]);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(prev => ({ ...prev, authenticating: true }));
    try {
      await apiLogin(username, password);
      await refreshUser();
    } finally {
      setIsLoading(prev => ({ ...prev, authenticating: false }));
    }
  }, [refreshUser]);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    setIsLoading(prev => ({ ...prev, authenticating: true }));
    try {
      await apiSignup(username, email, password);
      await refreshUser();
    } finally {
      setIsLoading(prev => ({ ...prev, authenticating: false }));
    }
  }, [refreshUser]);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: user !== null,
    login,
    signup,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={ value }>
      { children }
    </AuthContext.Provider>
  );
}

/**
 * Hook to access auth context.
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
