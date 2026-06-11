import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole =
  | 'admin'
  | 'organizer'
  | 'stage_manager'
  | 'host'
  | 'moderator'
  | 'speaker'
  | 'investor'
  | 'startup'
  | 'exhibitor'
  | 'sponsor'
  | 'attendee'
  | 'free_visitor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  company?: string;
  avatar?: string;
  isApproved: boolean;
  createdAt: Date;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ requiresOTP?: boolean; message?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    company: string,
    phone: string
  ) => Promise<{ requiresOTP?: boolean; message?: string }>;
  verifyOTP: (email: string, otp: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (email: string, otp: string, newPassword: string) => Promise<{ message: string }>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
  hasAccess: (requiredRole?: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();

        if (data.success && data.user) {
          setUser(data.user);
        } else {
          localStorage.removeItem('token');
        }
      } catch (err) {
        console.error('Failed to verify token', err);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (data.requiresOTP) {
        return { requiresOTP: true, message: data.message };
      }
      throw new Error(data.message || 'Login failed');
    }

    if (data.success && data.token && data.user) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
    }
    return {};
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
    company: string,
    phone: string
  ) => {
    const res = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name, role, company, phone }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    return { requiresOTP: data.requiresOTP, message: data.message };
  };

  const verifyOTP = async (email: string, otp: string) => {
    const res = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'OTP verification failed');
    }

    if (data.success && data.token && data.user) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
    }
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }

    return { message: data.message };
  };

  const resetPassword = async (email: string, otp: string, newPassword: string) => {
    const res = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, otp, newPassword }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to reset password');
    }

    return { message: data.message };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const hasAccess = (requiredRoles?: UserRole[]) => {
    if (!user || !user.isApproved) return false;
    if (!requiredRoles || requiredRoles.length === 0) return true;
    return requiredRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        verifyOTP,
        forgotPassword,
        resetPassword,
        logout,
        isAuthenticated: !!user,
        loading,
        hasAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
