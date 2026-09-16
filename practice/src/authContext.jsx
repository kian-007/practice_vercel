import { createContext, useState, useEffect, useContext } from "react";
import { fetchWithAuth } from "./api";

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_URL;

export const AuthProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("user");
  const [loading, setLoading] = useState(true);

  const forceLogout = () => {
    setIsLoggedIn(false);
    setUserEmail("");
    setUserRole("user");
  };

  const getMe = async () => {
    try {
      const res = await fetchWithAuth(`${API_URL}/me`);
      const data = await res.json();

      console.log("/ME RESPONSE:", data);

      if (res.ok && data.loggedIn) {
        setIsLoggedIn(true);
        setUserEmail(data.email);
        setUserRole(data.role);
      } else {
        forceLogout();
      }
    } catch (err) {
      console.error(err);
      forceLogout();
    }
  };

  useEffect(() => {
    getMe().finally(() => {
      setLoading(false);
    });
  }, []);

  const login = async () => {
    await getMe();
    setLoading(false);
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      forceLogout();
    }
  };

  return (
    <AuthContext.Provider
      value={{ isLoggedIn, login, logout, userEmail, userRole, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
