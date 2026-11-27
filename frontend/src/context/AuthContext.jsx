import { createContext, useContext, useState, useEffect } from "react";
import axiosClient from "../api/axiosClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const { data } = await axiosClient.get("/auth/me");
          setUser(data.data);
        } catch (error) {
          localStorage.removeItem("accessToken");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (identifier, password) => {
    const { data } = await axiosClient.post("/auth/login", { identifier, password });
    localStorage.setItem("accessToken", data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  };

  const registerOwner = async (ownerData) => {
    const { data } = await axiosClient.post("/auth/register-owner", ownerData);
    return data.data; // Note: they will need to login after register based on our flow, or we auto-login
  };

  const logout = async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch (e) {
      console.error("Logout error", e);
    }
    localStorage.removeItem("accessToken");
    setUser(null);
  };

  const updateUser = (updatedData) => {
    setUser((prev) => (prev ? { ...prev, ...updatedData } : updatedData));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, registerOwner, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
