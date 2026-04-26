import { createContext, useContext, useEffect, useState } from "react";
import { base44 } from "@base44/sdk";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.getUser()
      .then((u) => setUser(u || null))
      .catch((err) => {
        console.error("Auth error:", err);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);