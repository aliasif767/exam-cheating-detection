import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { toast } from "sonner";

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "admin" | "invigilator" | "student";
  studentId?: string;
  verificationStatus?: "pending" | "verified" | "rejected";
  isVerified?: boolean;
  profileImage?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  studentId?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE =
  (import.meta.env?.VITE_API_URL as string) || "http://localhost:5000/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on app load
  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        try {
          const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
              Authorization: `Bearer ${savedToken}`,
            },
          });

          if (response.ok) {
            const data = await response.json();
            setUser(data.data.user);
            setToken(savedToken);
          } else {
            localStorage.removeItem("token");
            setToken(null);
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          localStorage.removeItem("token");
          setToken(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user);
        setToken(data.data.token);
        localStorage.setItem("token", data.data.token);
        toast.success("Login successful!");
        return true;
      } else {
        toast.error(data.message || "Login failed");
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Network error. Please try again.");
      return false;
    }
  };

  // In AuthContext.tsx

  const register = async (userData: RegisterData): Promise<boolean> => {
    console.log("hi i call before registration")

    // --- START OF FIX: Clean the payload ---
    const payload: RegisterData = { ...userData };

    // Check if the role is NOT student (Admin or Invigilator)
    if (payload.role !== 'student') {
      // Remove studentId entirely to prevent sending "" or null to the server
      delete payload.studentId;
    } else if (payload.role === 'student' && !payload.studentId) {
      // Client-side validation for students
      toast.error("Student ID is required for student registration.");
      return false;
    }
    // --- END OF FIX ---

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload), // Send the cleaned payload
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.data.user); setToken(data.data.token);
        localStorage.setItem("token", data.data.token);
        toast.success("Registration successful!");
        return true;
      } else {
        toast.error(data.message || "Registration failed");
        return false;
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Network error. Please try again");
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    toast.success("Logged out successfully");
  };

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null));
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
